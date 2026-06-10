import { useEffect, useRef, useState, useCallback } from 'react';
import {
  Shield, Phone, Heart, FileText, Users, BookOpen,
  Menu, X, ChevronRight, ArrowRight, Play,
  MessageCircle, Instagram, Facebook, Send, Mic, Twitter, Linkedin,
  AlertTriangle, Scale, MapPin, User, Clock,
  Megaphone, PhoneCall, Star, Home, Siren, Wifi, MicOff,
  ShieldCheck, Lock, Handshake, Activity,
  Plus, Trash2, Settings, Share2, Search, Building,
  LogOut, Filter, Download, Flag, Upload, CheckCircle, Video
} from 'lucide-react';
import { ThemeProvider } from 'next-themes';

import { toast, Toaster } from 'sonner';
import { type User as UserType, UserDb } from '@/lib/userDb';
import { SOSDb, type SOSAlert } from '@/lib/sosDb';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

import { useLocalStorage } from '@/hooks/use-local-storage';

import { SettingsProvider, useSettings } from '@/contexts/SettingsContext';
import { SettingsSheet } from '@/components/SettingsSheet';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ContactsManager } from '@/components/ContactsManager';
import { RightsSection } from '@/components/RightsSection';
import { AISafetyDashboard, RiskPill } from '@/components/AISafetyDashboard';





// Vibration patterns
const vibrate = (pattern: number | number[] = 200) => {
  if (navigator.vibrate) {
    navigator.vibrate(pattern);
  }
};

const vibrateSOS = () => {
  vibrate([500, 200, 500, 200, 500]);
};

const vibrateSuccess = () => {
  vibrate([100, 50, 100]);
};

// Settings Context removed (moved to @/contexts/SettingsContext.tsx)

// Settings Sheet removed (moved to @/components/SettingsSheet.tsx)

// ==================== AUDIO MANAGER ====================
class AudioManager {
  private static instance: AudioManager;
  private audioContext: AudioContext | null = null;

  private constructor() {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        this.audioContext = new AudioContextClass();
      } else {
        console.warn('AudioContext not supported');
      }
    } catch (e) {
      console.error('Failed to initialize AudioContext', e);
    }
  }

  static getInstance(): AudioManager {
    if (!AudioManager.instance) {
      AudioManager.instance = new AudioManager();
    }
    return AudioManager.instance;
  }

  playBuzzer(duration: number = 3000) {
    if (!this.audioContext) return;

    // Resume context if suspended (crucial for mobile)
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }

    const oscillator = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();

    oscillator.type = 'sawtooth';
    oscillator.frequency.setValueAtTime(800, this.audioContext.currentTime);

    gain.gain.setValueAtTime(0.5, this.audioContext.currentTime);

    oscillator.connect(gain);
    gain.connect(this.audioContext.destination);

    oscillator.start();

    let count = 0;
    const pulse = setInterval(() => {
      if (count >= duration / 200) {
        clearInterval(pulse);
        return;
      }
      oscillator.frequency.setValueAtTime(800, this.audioContext!.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(400, this.audioContext!.currentTime + 0.1);
      count++;
    }, 200);

    setTimeout(() => {
      gain.gain.exponentialRampToValueAtTime(0.01, this.audioContext!.currentTime + 0.5);
      oscillator.stop(this.audioContext!.currentTime + 0.5);
    }, duration);
  }

  playBeep(frequency: number = 1000, duration: number = 200) {
    if (!this.audioContext) return;

    // Resume context if suspended
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }

    const oscillator = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);

    gain.gain.setValueAtTime(0.3, this.audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration / 1000);

    oscillator.connect(gain);
    gain.connect(this.audioContext.destination);

    oscillator.start();
    oscillator.stop(this.audioContext.currentTime + duration / 1000);
  }

  playSuccess() {
    this.playBeep(800, 150);
    setTimeout(() => this.playBeep(1200, 200), 150);
  }

  playAlert() {
    this.playBeep(600, 300);
    setTimeout(() => this.playBeep(600, 300), 400);
    setTimeout(() => this.playBeep(600, 300), 800);
  }

  // Ringtone oscillator
  private ringtoneInterval: any = null;

  playRingtone() {
    if (!this.audioContext) return;
    if (this.audioContext.state === 'suspended') this.audioContext.resume();

    this.stopRingtone(); // Stop existing

    const playPulse = () => {
      const osc = this.audioContext!.createOscillator();
      const gain = this.audioContext!.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(400, this.audioContext!.currentTime);
      osc.frequency.linearRampToValueAtTime(800, this.audioContext!.currentTime + 0.1); // Chirp effect

      gain.gain.setValueAtTime(0, this.audioContext!.currentTime);
      gain.gain.linearRampToValueAtTime(0.3, this.audioContext!.currentTime + 0.1);
      gain.gain.linearRampToValueAtTime(0, this.audioContext!.currentTime + 1.5);

      osc.connect(gain);
      gain.connect(this.audioContext!.destination);

      osc.start();
      osc.stop(this.audioContext!.currentTime + 1.5);
    };

    playPulse();
    this.ringtoneInterval = setInterval(playPulse, 2000); // Repeat every 2s
  }

  stopRingtone() {
    if (this.ringtoneInterval) {
      clearInterval(this.ringtoneInterval);
      this.ringtoneInterval = null;
    }
  }
}

// ==================== VOICE RECOGNITION HOOK ====================
function useVoiceRecognition() {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-IN';

      recognitionRef.current.onresult = (event: any) => {
        const current = event.resultIndex;
        const transcript = event.results[current][0].transcript.toLowerCase();
        setTranscript(transcript);
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
      };
    }


    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  const startListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.start();
      setIsListening(true);
    }
  }, []);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  }, []);

  return { isListening, transcript, startListening, stopListening };
}

// ==================== PWA INSTALL HOOK ====================
function usePWAInstall() {
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setInstallPrompt(null);
      toast.success('Suraksha installed successfully!');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const install = async () => {
    if (!installPrompt) return;

    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;

    if (outcome === 'accepted') {
      setInstallPrompt(null);
    }
  };

  return { installPrompt, isInstalled, install };
}

// ==================== GEOLOCATION HOOK ====================
function useGeolocation() {
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const getLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser');
      return;
    }

    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        });
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }, []);

  return { location, error, loading, getLocation };
}



// Contacts Manager removed (moved to @/components/ContactsManager.tsx)
// ==================== FAKE CALL SCREEN ====================
function FakeCallScreen({ isActive, onClose }: { isActive: boolean; onClose: () => void }) {
  const [status, setStatus] = useState<'incoming' | 'ongoing'>('incoming');
  const [timer, setTimer] = useState(0);
  const audioManager = AudioManager.getInstance();
  const { t } = useSettings();

  useEffect(() => {
    let interval: any;
    if (isActive) {
      setStatus('incoming');
      setTimer(0);
      audioManager.playRingtone();
    } else {
      audioManager.stopRingtone();
    }
    return () => {
      audioManager.stopRingtone();
      clearInterval(interval);
    };
  }, [isActive]);

  useEffect(() => {
    let interval: any;
    if (status === 'ongoing') {
      interval = setInterval(() => {
        setTimer(t => t + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [status]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const answerCall = () => {
    audioManager.stopRingtone();
    setStatus('ongoing');
  };

  if (!isActive) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black/90 flex flex-col items-center pt-20 pb-10 text-white animate-in slide-in-from-bottom duration-300">
      <div className="flex-1 flex flex-col items-center gap-4">
        <div className="w-24 h-24 bg-gray-700 rounded-full flex items-center justify-center text-4xl mb-4">
          <User className="w-12 h-12 text-white" />
        </div>
        <h2 className="text-3xl font-display font-bold">{t('fake_call.caller')}</h2>
        <p className="text-xl text-gray-400">
          {status === 'incoming' ? t('fake_call.incoming') : formatTime(timer)}
        </p>
      </div>

      <div className="w-full max-w-sm px-8 grid grid-cols-2 gap-8">
        {status === 'incoming' && (
          <button
            onClick={onClose}
            className="flex flex-col items-center gap-2"
          >
            <div className="w-16 h-16 rounded-full bg-red-500 flex items-center justify-center animate-bounce">
              <Phone className="w-8 h-8 rotate-[135deg]" />
            </div>
            <span>{t('fake_call.decline')}</span>
          </button>
        )}

        {status === 'incoming' && (
          <button
            onClick={answerCall}
            className="flex flex-col items-center gap-2"
          >
            <div className="w-16 h-16 rounded-full bg-green-500 flex items-center justify-center animate-bounce delay-100">
              <Phone className="w-8 h-8" />
            </div>
            <span>{t('fake_call.answer')}</span>
          </button>
        )}

        {status === 'ongoing' && (
          <div className="col-span-2 flex justify-center">
            <button
              onClick={onClose}
              className="w-20 h-20 rounded-full bg-red-500 flex items-center justify-center"
            >
              <Phone className="w-10 h-10 rotate-[135deg]" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ==================== SAFETY TOOLS SECTION ====================
function SafetyToolsSection() {
  const [fakeCallActive, setFakeCallActive] = useState(false);
  const { t } = useSettings();

  // Helplines (India Specific)
  const helplines = [
    { name: t('tools.helpline.police'), number: '100', icon: Shield },
    { name: t('tools.helpline.women'), number: '1091', icon: Heart },
    { name: t('tools.helpline.abuse'), number: '181', icon: Home },
    { name: t('tools.helpline.ambulance'), number: '102', icon: Activity },
  ];

  const triggerFakeCall = () => {
    toast.info('Fake Call Initiated', { description: 'Incoming call in 3 seconds...' });
    setTimeout(() => setFakeCallActive(true), 3000);
  };

  const openSafeRoute = () => {
    window.open('https://www.google.com/maps/search/police+station+near+me', '_blank');
  };

  return (
    <section className="py-12 bg-indigo-50">
      <div className="container px-4 mx-auto">
        <h2 className="text-2xl md:text-3xl font-bold text-center mb-8 font-display text-suraksha-black dark:text-white">
          {t('tools.title')}
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Fake Call Card */}
          <div
            onClick={triggerFakeCall}
            className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border dark:border-gray-700 hover:shadow-md transition-all cursor-pointer group"
          >
            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center mb-4 group-hover:bg-purple-500 transition-colors">
              <PhoneCall className="w-6 h-6 text-purple-600 dark:text-purple-300 group-hover:text-white" />
            </div>
            <h3 className="font-bold text-lg mb-2 text-suraksha-black dark:text-white">{t('tools.fakeCall')}</h3>
            <p className="text-sm text-gray-900 dark:text-gray-300">{t('tools.fake_call.desc')}</p>
          </div>

          {/* Safe Route Card */}
          <div
            onClick={openSafeRoute}
            className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border dark:border-gray-700 hover:shadow-md transition-all cursor-pointer group"
          >
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mb-4 group-hover:bg-green-500 transition-colors">
              <MapPin className="w-6 h-6 text-green-600 dark:text-green-300 group-hover:text-white" />
            </div>
            <h3 className="font-bold text-lg mb-2 text-suraksha-black dark:text-white">{t('tools.safeRoute')}</h3>
            <p className="text-sm text-gray-900 dark:text-gray-300">{t('tools.safe_route.desc')}</p>
          </div>

          {/* Directory Card */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border dark:border-gray-700">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
              <h3 className="font-bold text-lg text-suraksha-black dark:text-white">{t('tools.helplines')}</h3>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {helplines.map(h => (
                <a
                  key={h.number}
                  href={`tel:${h.number}`}
                  className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors border dark:border-gray-600 text-sm text-black dark:text-white"
                >
                  <h.icon className="w-3 h-3 text-primary" />
                  <span className="font-medium">{h.name}</span>
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Component is rendered here to be managed by this section's state, 
          but usually it should be at App level. 
          For now, we'll portal it or just fix the position (fixed inset-0 handles it). 
      */}
      <FakeCallScreen isActive={fakeCallActive} onClose={() => setFakeCallActive(false)} />
    </section>
  );
}

// ==================== SOS BUTTON WITH VOICE & VIBRATION ====================
function SOSButtonWithVoice() {
  const [showDialog, setShowDialog] = useState(false);
  const [showContacts, setShowContacts] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const { transcript, startListening, stopListening } = useVoiceRecognition();
  const audioManager = AudioManager.getInstance();

  // Geolocation & Contacts
  const { location, getLocation, loading: locLoading, error: locError } = useGeolocation();
  const { contacts, silentMode } = useSettings();

  useEffect(() => {
    if (voiceEnabled && transcript) {
      const lowerTranscript = transcript.toLowerCase();
      if (lowerTranscript.includes('help') || lowerTranscript.includes('bachao') || lowerTranscript.includes('bachaao')) {
        handleSOS();
        toast.error('Voice SOS Triggered!', {
          description: `Detected: "${transcript}"`,
          duration: 5000
        });
      }
    }
  }, [transcript, voiceEnabled]);

  // Auto-fetch location when dialog opens
  useEffect(() => {
    if (showDialog) {
      getLocation();
    }
  }, [showDialog, getLocation]);

  const handleSOS = () => {
    if (!silentMode) {
      audioManager.playBuzzer(3000);
    }
    vibrateSOS();
    setShowDialog(true);
  };

  const sendEmergencyAlert = async () => {
    if (!silentMode) {
      audioManager.playAlert();
    }
    vibrateSuccess();

    const mapLink = location
      ? `https://www.google.com/maps?q=${location.lat},${location.lng}`
      : 'Location unavailable';

    // Log the SOS alert
    const currentUser = UserDb.getCurrentSession();
    SOSDb.create({
      userId: currentUser ? currentUser.id : null,
      userName: currentUser ? currentUser.name : 'Anonymous',
      latitude: location?.lat || null,
      longitude: location?.lng || null
    });

    const message = `🚨 SOS! I need help! My location: ${mapLink}`;

    // 1. Try Native Share (Mobile)
    if (navigator.share) {
      try {
        await navigator.share({
          title: '🚨 EMERGENCY SOS',
          text: message,
          url: location ? mapLink : undefined
        });
        toast.success('Alert Shared Successfully');
      } catch (err) {
        console.log('Share cancelled or failed', err);
      }
    }
    // 2. Fallback to SMS for first contact
    else if (contacts.length > 0) {
      window.open(`sms:${contacts[0].phone}?body=${encodeURIComponent(message)}`, '_blank');
      toast.success(`Message draft opened for ${contacts[0].name}`);
    } else {
      toast.error('No contacts configured!', { description: 'Please add trusted contacts.' });
    }

    setShowDialog(false);
  };

  const toggleVoice = () => {
    if (!voiceEnabled) {
      startListening();
      toast.info('Voice SOS Active', {
        description: 'Say "help" or "bachao" to trigger SOS'
      });
    } else {
      stopListening();
    }
    setVoiceEnabled(!voiceEnabled);
  };

  return (
    <>
      <div className="flex items-center gap-2">
        <button
          onClick={toggleVoice}
          className={`p-2 rounded-full transition-all ${voiceEnabled
            ? 'bg-green-500 text-white animate-pulse'
            : 'bg-white/20 text-white hover:bg-white/30'
            }`}
          title={voiceEnabled ? 'Voice SOS Active' : 'Enable Voice SOS'}
        >
          {voiceEnabled ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
        </button>

        <button
          data-sos-trigger="true"
          onClick={handleSOS}
          className="bg-red-600 hover:bg-red-700 text-white font-display font-bold px-4 md:px-6 py-2 md:py-3 rounded-full flex items-center gap-2 transition-all hover:scale-105 text-sm md:text-base border-2 border-red-400 shadow-[0_0_20px_rgba(239,68,68,0.6)]"
        >
          <Siren className="w-4 h-4 md:w-5 md:h-5" />
          <span className="hidden sm:inline">SOS</span>
        </button>
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-md mx-4 border-red-500 border-4 bg-white">
          <DialogHeader>
            <DialogTitle className="text-red-600 flex items-center gap-2 text-xl md:text-2xl font-black">
              <Siren className="w-8 h-8 md:w-10 md:h-10 animate-bounce" />
              EMERGENCY SOS
            </DialogTitle>
            <DialogDescription className="text-base md:text-lg font-medium text-gray-700">
              Sending alert with live location...
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Location Status */}
            <div className={`p-3 rounded-lg flex items-center gap-3 ${location ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-yellow-50 text-yellow-700 border border-yellow-200'
              }`}>
              <MapPin className={`w-5 h-5 ${locLoading ? 'animate-bounce' : ''}`} />
              <div className="text-sm">
                {locLoading ? 'Fetching GPS location...' :
                  location ? `Location Acquired: ${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}` :
                    locError ? `GPS Error: ${locError}` : 'Waiting for GPS...'}
              </div>
            </div>

            {/* Contacts Preview / Manager */}
            {showContacts ? (
              <ContactsManager />
            ) : (
              <div className="bg-red-50 p-4 rounded-xl border-2 border-red-100">
                <div className="flex justify-between items-center mb-2">
                  <p className="text-sm text-red-700 font-bold flex items-center gap-2">
                    <Send className="w-4 h-4" /> Sending to:
                  </p>
                  <Button variant="ghost" size="sm" onClick={() => setShowContacts(true)} className="h-6 text-xs text-red-600 hover:bg-red-100">
                    <Settings className="w-3 h-3 mr-1" /> Manage
                  </Button>
                </div>
                {contacts.length > 0 ? (
                  <ul className="text-sm text-red-600 space-y-1 max-h-24 overflow-y-auto">
                    {contacts.map(c => (
                      <li key={c.id} className="flex items-center gap-2">
                        <PhoneCall className="w-3 h-3" /> {c.name} ({c.phone})
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-red-500 italic">No contacts added!</p>
                )}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 pt-2">
              <Button
                variant="outline"
                className="w-full border-gray-300 hover:bg-gray-100"
                onClick={() => {
                  setShowDialog(false);
                  toast.info('Emergency cancelled');
                }}
              >
                Cancel
              </Button>
              <Button
                className="w-full bg-red-600 hover:bg-red-700 text-white font-bold shadow-lg shadow-red-200"
                onClick={sendEmergencyAlert}
              >
                <Share2 className="w-4 h-4 mr-2" />
                SEND ALERT
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ==================== BOTTOM NAVIGATION (MOBILE) ====================
function BottomNav() {
  const { t } = useSettings();
  const [activeTab, setActiveTab] = useState('home');

  const tabs = [
    { id: 'home', icon: Home, label: t('nav.home'), href: '#' },
    { id: 'services', icon: Heart, label: t('nav.help'), href: '#services' },
    { id: 'sos', icon: Siren, label: 'SOS', href: null, isSOS: true },
    { id: 'stories', icon: MessageCircle, label: t('nav.stories'), href: '#stories' },
    { id: 'more', icon: Menu, label: t('nav.more'), href: '#mission' },
  ];

  const handleClick = (tab: any) => {
    if (tab.isSOS) {
      document.querySelector('[data-sos-trigger]')?.dispatchEvent(new Event('click'));
      return;
    }
    setActiveTab(tab.id);
    if (tab.href) {
      const element = document.querySelector(tab.href);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-2 py-2 md:hidden z-50 safe-area-bottom">
      <div className="flex justify-around items-center">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => handleClick(tab)}
            className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${tab.isSOS
              ? 'bg-red-500 text-white -mt-6 w-14 h-14 justify-center shadow-lg'
              : activeTab === tab.id
                ? 'text-primary bg-primary/10'
                : 'text-gray-500 hover:text-primary'
              }`}
          >
            <tab.icon className={`w-5 h-5 ${tab.isSOS ? 'w-7 h-7' : ''}`} />
            <span className={`text-xs ${tab.isSOS ? 'hidden' : ''}`}>{tab.label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}

// ==================== INSTALL PROMPT ====================
function InstallPrompt() {
  const { installPrompt, isInstalled, install } = usePWAInstall();
  const [showPrompt, setShowPrompt] = useState(true);

  if (isInstalled || !installPrompt || !showPrompt) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 md:bottom-4 md:left-auto md:right-4 md:w-80 bg-white rounded-2xl shadow-2xl p-4 z-50 animate-slide-up">
      <div className="flex items-start gap-3">
        <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center flex-shrink-0">
          <Shield className="w-7 h-7 text-white" />
        </div>
        <div className="flex-1">
          <h3 className="font-display font-bold text-suraksha-black">Install Suraksha</h3>
          <p className="text-sm text-suraksha-gray mt-1">Add to home screen for quick access to safety features</p>
          <div className="flex gap-2 mt-3">
            <Button
              size="sm"
              className="flex-1 bg-primary hover:bg-primary-dark"
              onClick={install}
            >
              Install
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowPrompt(false)}
            >
              Later
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ==================== NAVIGATION ====================
function Navigation({ onViewChange }: { onViewChange?: (view: any) => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { t } = useSettings();
  const currentUser = UserDb.getCurrentSession();

  const handleLogout = () => {
    UserDb.logout();
    window.location.reload();
  };

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 100);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { name: t('nav.who_we_are'), href: '#mission' },
    { name: t('nav.policy'), href: '#stats' },
    { name: t('nav.impacts'), href: '#stories' },
    { name: t('nav.take_action'), href: '#services' },
    { name: t('nav.services'), href: '#services' },
  ];

  const scrollToSection = (href: string) => {
    const element = document.querySelector(href);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
    setIsOpen(false);
  };

  return (
    <>
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${scrolled ? 'bg-white/95 backdrop-blur-md shadow-lg' : 'bg-transparent'
        }`}>
        <div className="w-full px-4 md:px-6 lg:px-12">
          <div className="flex items-center justify-between h-14 md:h-16 lg:h-20">
            <a
              href="#"
              className="flex items-center gap-2 group"
              onClick={(e) => {
                e.preventDefault();
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            >
              <div className="relative flex items-center justify-center w-10 h-10 md:w-12 md:h-12 bg-primary rounded-xl transition-all duration-300 transform group-hover:scale-105 border border-white/20">
                <div className="absolute inset-0 bg-primary rounded-xl opacity-20"></div>
                <Shield className="relative w-6 h-6 md:w-7 md:h-7 text-white" />
              </div>
              <span className={`font-display font-bold text-lg md:text-xl transition-colors ${scrolled ? 'text-suraksha-black' : 'text-white'
                }`}>
                <span className="text-primary">S</span>uraksha
              </span>
            </a>

            <div className="flex items-center gap-2 md:gap-4">
              <div className="hidden lg:flex items-center gap-8 mr-4">
                {navLinks.map((link) => (
                  <button
                    key={link.name}
                    onClick={() => scrollToSection(link.href)}
                    className={`nav-link text-sm font-medium transition-all hover:scale-105 ${scrolled ? 'text-suraksha-black hover:text-primary' : 'text-white/90 hover:text-white'
                      }`}
                  >
                    {link.name}
                  </button>
                ))}
              </div>





              {currentUser ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLogout}
                  className={`hidden lg:flex items-center gap-2 ${scrolled ? 'text-suraksha-black' : 'text-white'}`}
                >
                  <LogOut className="w-4 h-4" />
                  <span className="hidden xl:inline">{currentUser.name}</span>
                </Button>
              ) : (
                <Button
                  variant="default"
                  size="sm"
                  className="hidden lg:flex bg-primary hover:bg-primary-dark text-white"
                  onClick={() => onViewChange && onViewChange('login')}
                >
                  <User className="w-4 h-4 mr-2" /> Login
                </Button>
              )}

              <button
                onClick={() => setIsOpen(!isOpen)}
                className={`lg:hidden p-2 rounded-lg transition-colors ${scrolled ? 'text-suraksha-black hover:bg-gray-100' : 'text-white hover:bg-white/10'
                  }`}
              >
                {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>

              <SettingsSheet />
            </div>
          </div>
        </div>
      </nav>

      {isOpen && (
        <div className="fixed inset-0 z-40 bg-white mobile-menu-open lg:hidden pt-20">
          <div className="flex flex-col items-center justify-center h-full gap-6 px-6">
            {navLinks.map((link) => (
              <button
                key={link.name}
                onClick={() => scrollToSection(link.href)}
                className="text-2xl font-display font-semibold text-suraksha-black hover:text-primary transition-colors py-3 w-full text-center border-b border-gray-100"
              >
                {link.name}
              </button>
            ))}

          </div>
        </div>
      )}
    </>
  );
}

// ==================== HERO SECTION ====================
function HeroSection() {
  const heroRef = useRef<HTMLDivElement>(null);
  const { t } = useSettings();

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo('.hero-bg',
        { scale: 1.1, opacity: 0 },
        { scale: 1, opacity: 1, duration: 1.5, ease: 'power2.out' }
      );

      gsap.fromTo('.hero-title',
        { y: 50, opacity: 0 },
        { y: 0, opacity: 1, duration: 1, delay: 0.3, ease: 'power2.out' }
      );

      gsap.fromTo('.hero-subtitle',
        { y: 30, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.8, delay: 0.6, ease: 'power2.out' }
      );

      gsap.fromTo('.hero-cta',
        { y: 30, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.8, delay: 0.9, ease: 'power2.out' }
      );

      gsap.to('.float-element', {
        y: -20,
        duration: 2,
        repeat: -1,
        yoyo: true,
        ease: 'power1.inOut',
        stagger: 0.3
      });
    }, heroRef);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={heroRef} className="relative min-h-screen w-full overflow-hidden">
      <div className="hero-bg absolute inset-0">
        <img
          src="https://images.unsplash.com/photo-1573164713988-8665fc963095?auto=format&fit=crop&q=80"
          alt="Women empowerment background"
          className="absolute inset-0 w-full h-full object-cover opacity-60"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/20 to-black/80" />
      </div>

      <div className="float-element absolute top-20 left-4 md:left-10 w-16 md:w-20 h-16 md:h-20 bg-primary/20 rounded-full blur-xl" />
      <div className="float-element absolute top-32 md:top-40 right-4 md:right-20 w-24 md:w-32 h-24 md:h-32 bg-purple-500/20 rounded-full blur-xl" />
      <div className="float-element absolute bottom-32 md:bottom-40 left-1/4 w-16 md:w-24 h-16 md:h-24 bg-pink-500/20 rounded-full blur-xl" />

      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-4 md:px-6 text-center pt-20 pb-24 md:pb-0">
        <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm px-3 md:px-4 py-2 rounded-full mb-4 md:mb-6">
          <ShieldCheck className="w-4 h-4 md:w-5 md:h-5 text-primary" />
          <span className="text-white/90 text-xs md:text-sm">{t('hero.trusted_by')}</span>
        </div>

        <h1 className="hero-title font-display font-black text-4xl sm:text-5xl md:text-7xl lg:text-8xl text-white mb-4 md:mb-6 tracking-tight">
          {t('hero.title_1')}<br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-purple-400">
            {t('hero.title_2')}
          </span>
        </h1>

        <p className="hero-subtitle text-base md:text-xl lg:text-2xl text-white/90 max-w-3xl mb-6 md:mb-10 leading-relaxed px-4">
          {t('hero.subtitle')}
        </p>

        <div className="hero-cta flex flex-col sm:flex-row gap-3 md:gap-4 w-full sm:w-auto px-4 sm:px-0">
          <Button
            onClick={() => document.querySelector('#mission')?.scrollIntoView({ behavior: 'smooth' })}
            className="bg-primary hover:bg-primary-dark text-white px-6 md:px-10 py-5 md:py-7 text-base md:text-lg rounded-2xl font-semibold shadow-lg hover:shadow-primary/50 transition-all hover:scale-105 w-full sm:w-auto"
          >
            {t('hero.explore')}
            <ChevronRight className="w-4 h-4 md:w-5 md:h-5 ml-2" />
          </Button>
          <Button
            onClick={() => document.querySelector('#services')?.scrollIntoView({ behavior: 'smooth' })}
            className="bg-white/10 backdrop-blur-sm border-2 border-white/30 text-white hover:bg-white/20 px-6 md:px-10 py-5 md:py-7 text-base md:text-lg rounded-2xl font-semibold transition-all hover:scale-105 w-full sm:w-auto"
          >
            <PhoneCall className="w-4 h-4 md:w-5 md:h-5 mr-2" />
            {t('hero.get_help')}
          </Button>
        </div>

        <div className="hero-cta mt-8 md:mt-16 grid grid-cols-3 gap-4 md:gap-8 max-w-md md:max-w-2xl px-4">
          {[
            { value: '24/7', label: t('hero.stat.support') },
            { value: '50K+', label: t('hero.stat.helped') },
            { value: '100+', label: t('hero.stat.cities') },
          ].map((stat, i) => (
            <div key={i} className="text-center">
              <div className="text-xl md:text-3xl font-display font-bold text-white">{stat.value}</div>
              <div className="text-white/60 text-xs md:text-sm">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="absolute bottom-24 md:bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2">
        <span className="text-white/60 text-xs md:text-sm">{t('hero.scroll')}</span>
        <div className="w-5 md:w-6 h-8 md:h-10 border-2 border-white/30 rounded-full flex justify-center pt-1.5 md:pt-2">
          <div className="w-1 md:w-1.5 h-2 md:h-3 bg-white/60 rounded-full animate-bounce" />
        </div>
      </div>
    </section>
  );
}

// ==================== MISSION SECTION ====================
function MissionSection() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const { t } = useSettings();

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo('.mission-heading',
        { x: -80, opacity: 0 },
        {
          x: 0, opacity: 1, duration: 1,
          scrollTrigger: { trigger: sectionRef.current, start: 'top 80%', toggleActions: 'play none none reverse' }
        }
      );

      gsap.fromTo('.mission-card',
        { x: 80, opacity: 0 },
        {
          x: 0, opacity: 1, duration: 0.8, stagger: 0.15,
          scrollTrigger: { trigger: sectionRef.current, start: 'top 70%', toggleActions: 'play none none reverse' }
        }
      );
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  const features = [
    {
      icon: Phone,
      title: t('mission.crisis_support.title'),
      desc: t('mission.crisis_support.desc'),
      action: () => {
        vibrateSuccess();
        toast.info('Crisis Hotline', {
          description: 'Connecting you to our 24/7 helpline: 1800-XXX-XXXX'
        });
      }
    },
    {
      icon: Scale,
      title: t('mission.legal_advocacy.title'),
      desc: t('mission.legal_advocacy.desc'),
      action: () => {
        vibrateSuccess();
        toast.info('Legal Support', {
          description: 'Our legal team will contact you within 2 hours.'
        });
      }
    },
    {
      icon: Users,
      title: t('mission.community_action.title'),
      desc: t('mission.community_action.desc'),
      action: () => {
        vibrateSuccess();
        document.querySelector('#services')?.scrollIntoView({ behavior: 'smooth' });
      }
    },
  ];

  return (
    <section id="mission" ref={sectionRef} className="py-16 md:py-24 lg:py-32 bg-white">
      <div className="w-full px-4 md:px-6 lg:px-12">
        <div className="grid lg:grid-cols-2 gap-8 md:gap-12 lg:gap-20 items-start">
          <div className="mission-heading">
            <div className="inline-flex items-center gap-2 bg-primary/10 px-4 py-2 rounded-full mb-4 md:mb-6">
              <Heart className="w-4 h-4 text-primary" />
              <span className="text-primary text-sm font-semibold">{t('mission.our_mission')}</span>
            </div>

            <h2 className="font-display font-bold text-3xl md:text-4xl lg:text-6xl text-suraksha-black mb-4 md:mb-6">
              {t('mission.title')} <span className="text-primary">{t('mission.help')}</span>
            </h2>
            <p className="text-base md:text-lg text-suraksha-gray mb-4 md:mb-6 leading-relaxed">
              {t('mission.description_1')}
            </p>
            <p className="text-suraksha-gray leading-relaxed mb-6 md:mb-8 text-sm md:text-base">
              {t('mission.description_2')}
            </p>

            <div className="flex flex-wrap gap-3 md:gap-4">
              <Button
                onClick={() => {
                  vibrateSuccess();
                  document.querySelector('#stats')?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="bg-primary hover:bg-primary-dark text-white"
              >
                {t('mission.learn_more')}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  vibrateSuccess();
                  toast.info('Download Brochure', { description: 'Brochure download starting...' });
                }}
              >
                <FileText className="w-4 h-4 mr-2" />
                {t('mission.download')}
              </Button>
            </div>
          </div>

          <div className="space-y-4 md:space-y-6">
            {features.map((feature, index) => (
              <div
                key={index}
                onClick={feature.action}
                className="mission-card bg-white border-2 border-suraksha-black/10 rounded-2xl md:rounded-3xl p-4 md:p-6 shadow-card card-hover flex items-start gap-3 md:gap-4 cursor-pointer group active:scale-95 transition-transform"
              >
                <div className="bg-primary/10 p-2 md:p-4 rounded-xl group-hover:bg-primary group-hover:text-white transition-colors">
                  <feature.icon className="w-5 h-5 md:w-6 md:h-6 text-primary group-hover:text-white transition-colors" />
                </div>
                <div className="flex-1">
                  <h3 className="font-display font-bold text-base md:text-lg text-suraksha-black mb-1 group-hover:text-primary transition-colors">
                    {feature.title}
                  </h3>
                  <p className="text-suraksha-gray text-xs md:text-sm">{feature.desc}</p>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-primary group-hover:translate-x-1 transition-all" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ==================== TESTIMONIAL SECTION ====================
function TestimonialSection() {
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo('.testimonial-bg',
        { scale: 1.1, opacity: 0.5 },
        {
          scale: 1, opacity: 1, duration: 1.5,
          scrollTrigger: { trigger: sectionRef.current, start: 'top 80%', toggleActions: 'play none none reverse' }
        }
      );

      gsap.fromTo('.testimonial-quote',
        { y: 60, opacity: 0 },
        {
          y: 0, opacity: 1, duration: 1,
          scrollTrigger: { trigger: sectionRef.current, start: 'top 60%', toggleActions: 'play none none reverse' }
        }
      );
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={sectionRef} className="relative py-20 md:py-32 lg:py-48 overflow-hidden">
      <div className="testimonial-bg absolute inset-0">
        <img
          src={`${import.meta.env.BASE_URL}testimonial_street.jpg`}
          alt="Testimonial"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/60 to-black/80" />
      </div>

      <div className="relative z-10 w-full px-4 md:px-6 lg:px-12 text-center">
        <blockquote className="testimonial-quote max-w-4xl mx-auto">
          <div className="mb-4 md:mb-8">
            <Star className="w-8 h-8 md:w-12 md:h-12 text-primary mx-auto fill-primary" />
          </div>
          <p className="font-display font-bold text-xl sm:text-2xl md:text-4xl lg:text-6xl text-white leading-tight mb-4 md:mb-8">
            "I turned around and spoke up. That moment changed everything."
          </p>
          <footer className="flex items-center justify-center gap-3 md:gap-4">
            <div className="w-10 h-10 md:w-12 md:h-12 bg-primary rounded-full flex items-center justify-center">
              <User className="w-5 h-5 md:w-6 md:h-6 text-white" />
            </div>
            <div className="text-left">
              <cite className="not-italic font-semibold text-white text-sm md:text-lg">Vaishali</cite>
              <p className="text-white/60 text-xs md:text-sm">Student Advocate</p>
            </div>
          </footer>
        </blockquote>

        <Button
          className="mt-6 md:mt-12 bg-white/10 backdrop-blur-sm border border-white/30 text-white hover:bg-white/20"
          onClick={() => {
            vibrateSuccess();
            toast.info('Share Your Story', { description: 'Story submission form opening...' });
          }}
        >
          <Megaphone className="w-4 h-4 mr-2" />
          Share Your Story
        </Button>
      </div>
    </section>
  );
}

// ==================== STATS SECTION ====================
function StatsSection() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const { t } = useSettings();
  const [counts, setCounts] = useState([0, 0, 0, 0]);
  const [hasAnimated, setHasAnimated] = useState(false);

  const stats = [
    { value: 33, prefix: t('stats.stat_1.prefix'), suffix: '', label: t('stats.stat_1.label') },
    { value: 80, prefix: '', suffix: t('stats.stat_2.suffix'), label: t('stats.stat_2.label') },
    { value: 15, prefix: t('stats.stat_3.prefix'), suffix: t('stats.stat_3.suffix'), label: t('stats.stat_3.label') },
    { value: 9, prefix: t('stats.stat_4.prefix'), suffix: t('stats.stat_4.suffix'), label: t('stats.stat_4.label') },
  ];

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !hasAnimated) {
            setHasAnimated(true);
            stats.forEach((stat, index) => {
              const duration = 2500;
              const steps = 60;
              const increment = stat.value / steps;
              let current = 0;
              const timer = setInterval(() => {
                current += increment;
                if (current >= stat.value) {
                  current = stat.value;
                  clearInterval(timer);
                }
                setCounts(prev => {
                  const newCounts = [...prev];
                  newCounts[index] = Math.floor(current);
                  return newCounts;
                });
              }, duration / steps);
            });
          }
        });
      },
      { threshold: 0.3 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, [hasAnimated]);

  return (
    <section id="stats" ref={sectionRef} className="py-16 md:py-24 bg-muted">
      <div className="w-full px-4 md:px-6 lg:px-12">
        <div className="text-center mb-8 md:mb-16">
          <div className="inline-flex items-center gap-2 bg-primary/10 px-4 py-2 rounded-full mb-4 md:mb-6">
            <AlertTriangle className="w-4 h-4 text-primary" />
            <span className="text-primary text-sm font-semibold">{t('stats.reality')}</span>
          </div>
          <h2 className="font-display font-bold text-3xl md:text-4xl lg:text-6xl text-suraksha-black">
            {t('stats.title')} <span className="text-primary">{t('stats.title_highlight')}</span>
          </h2>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-8 lg:gap-12">
          {stats.map((stat, index) => (
            <div key={index} className="text-center group">
              <div className="relative inline-block">
                <div className="font-display font-black text-3xl md:text-5xl lg:text-7xl text-primary mb-2 md:mb-3 transition-transform group-hover:scale-110">
                  {stat.prefix}{counts[index]}{stat.suffix}
                </div>
              </div>
              <p className="text-suraksha-gray text-xs md:text-sm lg:text-base max-w-[200px] mx-auto">
                {stat.label}
              </p>
            </div>
          ))}
        </div>

        <div className="text-center mt-8 md:mt-12 space-y-3 md:space-y-4">
          <p className="text-suraksha-gray/60 text-xs md:text-sm">
            {t('stats.sources')}
          </p>
          <Button
            variant="outline"
            onClick={() => {
              vibrateSuccess();
              toast.info('Full Report', { description: 'Detailed statistics report downloading...' });
            }}
          >
            <FileText className="w-4 h-4 mr-2" />
            {t('stats.view_report')}
          </Button>
        </div>
      </div>
    </section>
  );
}

// ==================== EFFORTS SECTION ====================
function EffortsSection() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const { t } = useSettings();

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo('.efforts-text',
        { x: -80, opacity: 0 },
        {
          x: 0, opacity: 1, duration: 1,
          scrollTrigger: { trigger: sectionRef.current, start: 'top 75%', toggleActions: 'play none none reverse' }
        }
      );

      gsap.fromTo('.efforts-image',
        { x: 80, opacity: 0, scale: 0.95 },
        {
          x: 0, opacity: 1, scale: 1, duration: 1,
          scrollTrigger: { trigger: sectionRef.current, start: 'top 70%', toggleActions: 'play none none reverse' }
        }
      );
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  const challenges = [
    { text: t('efforts.challenge_1'), icon: Wifi },
    { text: t('efforts.challenge_2'), icon: Shield },
    { text: t('efforts.challenge_3'), icon: MessageCircle },
  ];

  return (
    <section ref={sectionRef} className="py-16 md:py-24 lg:py-32 bg-white">
      <div className="w-full px-4 md:px-6 lg:px-12">
        <div className="grid lg:grid-cols-2 gap-8 md:gap-12 lg:gap-20 items-center">
          <div className="efforts-text">
            <div className="inline-flex items-center gap-2 bg-orange-100 px-4 py-2 rounded-full mb-4 md:mb-6">
              <AlertTriangle className="w-4 h-4 text-orange-600" />
              <span className="text-orange-600 text-sm font-semibold">{t('efforts.challenges_badge')}</span>
            </div>

            <h2 className="font-display font-bold text-3xl md:text-4xl lg:text-6xl text-suraksha-black mb-4 md:mb-6">
              {t('efforts.title')} <span className="text-primary">{t('efforts.title_highlight')}</span>
            </h2>
            <p className="text-lg md:text-xl text-suraksha-gray mb-6 md:mb-8">
              {t('efforts.subtitle')}
            </p>

            <ul className="space-y-3 md:space-y-4 mb-6 md:mb-8">
              {challenges.map((challenge, index) => (
                <li
                  key={index}
                  className="flex items-start gap-3 p-3 md:p-4 bg-gray-50 rounded-xl hover:bg-primary/5 transition-colors cursor-pointer group active:scale-95"
                  onClick={() => {
                    vibrateSuccess();
                    toast.info(challenge.text);
                  }}
                >
                  <div className="bg-primary/10 p-2 rounded-lg group-hover:bg-primary group-hover:text-white transition-colors">
                    <challenge.icon className="w-4 h-4 md:w-5 md:h-5 text-primary group-hover:text-white transition-colors" />
                  </div>
                  <span className="text-suraksha-black text-sm md:text-base pt-1">{challenge.text}</span>
                </li>
              ))}
            </ul>

            <Button
              className="bg-primary hover:bg-primary-dark text-white"
              onClick={() => {
                vibrateSuccess();
                toast.info('Our Initiatives');
              }}
            >
              {t('efforts.initiatives')}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>

          <div className="efforts-image relative">
            <div className="rounded-2xl md:rounded-3xl overflow-hidden shadow-2xl">
              <img
                src={`${import.meta.env.BASE_URL}efforts_challenges.jpg`}
                alt="Efforts and Challenges"
                className="w-full h-[300px] md:h-[400px] lg:h-[500px] object-cover hover:scale-105 transition-transform duration-700"
              />
            </div>
            <div className="absolute -bottom-4 md:-bottom-6 -left-2 md:-left-6 bg-white p-4 md:p-6 rounded-xl md:rounded-2xl shadow-xl">
              <div className="flex items-center gap-3 md:gap-4">
                <div className="bg-primary/10 p-2 md:p-3 rounded-lg md:rounded-xl">
                  <Clock className="w-5 h-5 md:w-6 md:h-6 text-primary" />
                </div>
                <div>
                  <div className="font-display font-bold text-xl md:text-2xl text-suraksha-black">{t('efforts.years')}</div>
                  <div className="text-suraksha-gray text-xs md:text-sm">{t('efforts.years_desc')}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ==================== STORIES SECTION ====================
function StoriesSection() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [showStoryDialog, setShowStoryDialog] = useState(false);
  const { t } = useSettings();

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo('.story-card',
        { y: 80, opacity: 0 },
        {
          y: 0, opacity: 1, stagger: 0.2, duration: 0.8,
          scrollTrigger: { trigger: sectionRef.current, start: 'top 75%', toggleActions: 'play none none reverse' }
        }
      );
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  const stories = [
    {
      label: t('stories.story_1.label'),
      quote: t('stories.story_1.quote'),
      attribution: t('stories.story_1.attr'),
      image: `${import.meta.env.BASE_URL}story_harassment.jpg`
    },
    {
      label: t('stories.story_2.label'),
      quote: t('stories.story_2.quote'),
      attribution: t('stories.story_2.attr'),
      image: `${import.meta.env.BASE_URL}story_institutional.jpg`
    }
  ];

  return (
    <section id="stories" ref={sectionRef} className="py-16 md:py-24 bg-muted">
      <div className="w-full px-4 md:px-6 lg:px-12">
        <h2 className="font-display font-bold text-2xl md:text-3xl lg:text-5xl text-center text-suraksha-black mb-8 md:mb-16">
          {t('stories.title')} <span className="text-primary">{t('stories.title_highlight')}</span>
        </h2>

        <div className="grid md:grid-cols-2 gap-4 md:gap-8 max-w-5xl mx-auto">
          {stories.map((story, index) => (
            <div
              key={index}
              className="story-card relative rounded-2xl md:rounded-3xl overflow-hidden shadow-card group cursor-pointer active:scale-95 transition-transform"
              onClick={() => {
                vibrateSuccess();
                setShowStoryDialog(true);
              }}
            >
              <div className="aspect-[4/3]">
                <img
                  src={story.image}
                  alt={story.label}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
              </div>

              <div className="absolute top-3 md:top-4 left-3 md:left-4">
                <span className="bg-primary text-white text-xs font-semibold px-2 md:px-3 py-1 rounded-full">
                  {story.label}
                </span>
              </div>

              <div className="absolute bottom-0 left-0 right-0 p-4 md:p-6">
                <p className="text-white font-display font-bold text-sm md:text-lg mb-1 md:mb-2">
                  {story.quote}
                </p>
                <p className="text-white/70 text-xs md:text-sm">{story.attribution}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center mt-8 md:mt-12">
          <Button
            variant="outline"
            className="border-2 border-primary text-primary hover:bg-primary hover:text-white"
            onClick={() => {
              vibrateSuccess();
              setShowStoryDialog(true);
            }}
          >
            {t('stories.read_more')}
            <ChevronRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>

      <Dialog open={showStoryDialog} onOpenChange={setShowStoryDialog}>
        <DialogContent className="sm:max-w-lg mx-4">
          <DialogHeader>
            <DialogTitle>Share Your Story</DialogTitle>
            <DialogDescription>
              Your voice matters. Share your experience to help others.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="story-name">Name (optional)</Label>
              <Input id="story-name" placeholder="Your name" />
            </div>
            <div>
              <Label htmlFor="story-email">Email</Label>
              <Input id="story-email" type="email" placeholder="your@email.com" />
            </div>
            <div>
              <Label htmlFor="story-content">Your Story</Label>
              <Textarea id="story-content" placeholder="Share your experience..." rows={4} />
            </div>
            <Button
              className="w-full bg-primary hover:bg-primary-dark"
              onClick={() => {
                vibrateSuccess();
                toast.success('Thank you for sharing!');
                setShowStoryDialog(false);
              }}
            >
              Submit Story
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}

// ==================== SERVICES SECTION ====================
function ServicesSection() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const { t } = useSettings();

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo('.service-card',
        { y: 50, opacity: 0, scale: 0.98 },
        {
          y: 0, opacity: 1, scale: 1, stagger: 0.1,
          scrollTrigger: { trigger: sectionRef.current, start: 'top 75%', toggleActions: 'play none none reverse' }
        }
      );
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  const services = [
    {
      icon: Phone,
      title: t('services.crisis.title'),
      desc: t('services.crisis.desc'),
      action: () => {
        vibrateSuccess();
        toast.info('Crisis Hotline: 1800-XXX-XXXX');
      }
    },
    {
      icon: FileText,
      title: t('services.legal.title'),
      desc: t('services.legal.desc'),
      action: () => {
        vibrateSuccess();
        toast.info('Legal team will contact you');
      }
    },
    {
      icon: Heart,
      title: t('services.counselling.title'),
      desc: t('services.counselling.desc'),
      action: () => {
        vibrateSuccess();
        toast.info('Counseling services info');
      }
    },
    {
      icon: BookOpen,
      title: t('services.workshops.title'),
      desc: t('services.workshops.desc'),
      action: () => {
        vibrateSuccess();
        toast.info('Workshop schedule coming soon');
      }
    },
  ];

  return (
    <section id="services" ref={sectionRef} className="py-16 md:py-24 bg-white dark:bg-gray-900 transition-colors duration-300">
      <div className="w-full px-4 md:px-6 lg:px-12">
        <h2 className="font-display font-bold text-2xl md:text-3xl lg:text-5xl text-center text-suraksha-black dark:text-white mb-8 md:mb-16">
          {t('services.title')} <span className="text-primary dark:text-primary-light">{t('services.title_highlight')}</span>
        </h2>

        <div className="grid sm:grid-cols-2 gap-4 md:gap-6 max-w-4xl mx-auto">
          {services.map((service, index) => (
            <div
              key={index}
              className="service-card bg-white dark:bg-gray-800 border-2 border-suraksha-black/10 dark:border-white/10 rounded-2xl md:rounded-3xl p-6 md:p-8 shadow-card card-hover cursor-pointer active:scale-95 transition-transform"
              onClick={service.action}
            >
              <div className="bg-primary/10 dark:bg-primary/20 w-12 h-12 md:w-14 md:h-14 rounded-2xl flex items-center justify-center mb-4 md:mb-6">
                <service.icon className="w-6 h-6 md:w-7 md:h-7 text-primary dark:text-primary-light" />
              </div>
              <h3 className="font-display font-bold text-lg md:text-xl text-suraksha-black dark:text-white mb-2 md:mb-3">
                {service.title}
              </h3>
              <p className="text-suraksha-gray dark:text-gray-300 text-sm md:text-base">{service.desc}</p>
            </div>
          ))}
        </div>

        <div className="text-center mt-8 md:mt-12">
          <Button
            className="bg-primary hover:bg-primary-dark text-white"
            onClick={() => {
              vibrateSuccess();
              toast.info('All services page coming soon');
            }}
          >
            {t('services.view_all')}
            <ChevronRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>
    </section>
  );
}

// ==================== SELF DEFENSE SECTION ====================
function SelfDefenseSection() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [playing, setPlaying] = useState<number | null>(null);
  const { t } = useSettings();

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo('.defense-card',
        { y: 60, opacity: 0, scale: 0.96 },
        {
          y: 0, opacity: 1, scale: 1, stagger: 0.15,
          scrollTrigger: { trigger: sectionRef.current, start: 'top 75%', toggleActions: 'play none none reverse' }
        }
      );
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  const techniques = [
    { title: t('defense.tech_1.title'), desc: t('defense.tech_1.desc'), videoId: 'KVpxP3ZZtAc' },
    { title: t('defense.tech_2.title'), desc: t('defense.tech_2.desc'), videoId: 'T7aNSRoDCmg' },
    { title: t('defense.tech_3.title'), desc: t('defense.tech_3.desc'), videoId: 'M4_8PoRQP8w' },
  ];

  return (
    <section ref={sectionRef} className="py-16 md:py-24 bg-suraksha-black">
      <div className="w-full px-4 md:px-6 lg:px-12">
        <h2 className="font-display font-bold text-2xl md:text-3xl lg:text-5xl text-center text-white mb-8 md:mb-16">
          {t('defense.title')} <span className="text-primary">{t('defense.title_highlight')}</span>
        </h2>

        <div className="grid md:grid-cols-3 gap-4 md:gap-6 max-w-5xl mx-auto">
          {techniques.map((tech, index) => (
            <div key={index} className="defense-card relative rounded-2xl md:rounded-3xl overflow-hidden border border-white/10">
              <div className="aspect-video bg-suraksha-black/50 relative">
                {playing === index ? (
                  <iframe
                    src={`https://www.youtube.com/embed/${tech.videoId}?autoplay=1`}
                    title={tech.title}
                    className="w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                ) : (
                  <>
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-suraksha-black/80" />
                    <img
                      src={`https://img.youtube.com/vi/${tech.videoId}/mqdefault.jpg`}
                      alt={tech.title}
                      className="w-full h-full object-cover opacity-50"
                    />
                    <button
                      onClick={() => {
                        vibrateSuccess();
                        setPlaying(index);
                      }}
                      className="play-button absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-14 h-14 md:w-16 md:h-16 bg-primary hover:bg-primary-dark rounded-full flex items-center justify-center transition-all hover:scale-110"
                    >
                      <Play className="w-6 h-6 md:w-8 md:h-8 text-white ml-1" />
                    </button>
                  </>
                )}
              </div>
              <div className="p-4 md:p-6">
                <h3 className="font-display font-bold text-base md:text-lg text-white mb-1">{tech.title}</h3>
                <p className="text-white/60 text-xs md:text-sm">{tech.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <p className="text-center text-white/40 text-xs md:text-sm mt-6 md:mt-8">
          {t('defense.practice_warning')}
        </p>
      </div>
    </section>
  );
}

// ==================== SURVIVOR SUPPORT SECTION ====================
function SurvivorSupportSection() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [showSupportDialog, setShowSupportDialog] = useState(false);
  const { t } = useSettings();

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo('.support-card',
        { y: 50, opacity: 0 },
        {
          y: 0, opacity: 1, stagger: 0.15,
          scrollTrigger: { trigger: sectionRef.current, start: 'top 75%', toggleActions: 'play none none reverse' }
        }
      );
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  const supports = [
    { icon: MessageCircle, title: t('support.card_1.title'), desc: t('support.card_1.desc') },
    { icon: Heart, title: t('support.card_2.title'), desc: t('support.card_2.desc') },
    { icon: Users, title: t('support.card_3.title'), desc: t('support.card_3.desc') },
  ];

  return (
    <section ref={sectionRef} className="py-16 md:py-24 bg-white dark:bg-gray-900 transition-colors duration-300">
      <div className="w-full px-4 md:px-6 lg:px-12">
        <h2 className="font-display font-bold text-2xl md:text-3xl lg:text-5xl text-center text-suraksha-black dark:text-white mb-8 md:mb-16">
          {t('support.title')} <span className="text-primary dark:text-primary-light">{t('support.title_highlight')}</span>
        </h2>

        <div className="grid md:grid-cols-3 gap-4 md:gap-6 max-w-4xl mx-auto">
          {supports.map((support, index) => (
            <div
              key={index}
              className="support-card bg-muted dark:bg-gray-800 rounded-2xl md:rounded-3xl p-6 md:p-8 text-center card-hover border border-transparent dark:border-gray-700"
            >
              <div className="bg-primary/10 dark:bg-primary/20 w-12 h-12 md:w-16 md:h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 md:mb-6">
                <support.icon className="w-6 h-6 md:w-8 md:h-8 text-primary dark:text-primary-light" />
              </div>
              <h3 className="font-display font-bold text-base md:text-lg text-suraksha-black dark:text-white mb-2 md:mb-3">
                {support.title}
              </h3>
              <p className="text-suraksha-gray dark:text-gray-300 text-sm md:text-base">{support.desc}</p>
            </div>
          ))}
        </div>

        <div className="text-center mt-8 md:mt-12">
          <Button
            className="bg-primary hover:bg-primary-dark text-white"
            onClick={() => {
              vibrateSuccess();
              setShowSupportDialog(true);
            }}
          >
            {t('support.get_support')}
            <ChevronRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>

      <Dialog open={showSupportDialog} onOpenChange={setShowSupportDialog}>
        <DialogContent className="sm:max-w-md mx-4 bg-white dark:bg-gray-900 dark:border-gray-800">
          <DialogHeader>
            <DialogTitle className="dark:text-white">Get Support</DialogTitle>
            <DialogDescription className="dark:text-gray-400">
              We're here to help. Our team will reach out within 24 hours.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="support-name" className="dark:text-gray-300">Name</Label>
              <Input id="support-name" placeholder="Your name" className="dark:bg-gray-800 dark:border-gray-700 dark:text-white" />
            </div>
            <div>
              <Label htmlFor="support-phone" className="dark:text-gray-300">Phone</Label>
              <Input id="support-phone" placeholder="+91 98765 43210" className="dark:bg-gray-800 dark:border-gray-700 dark:text-white" />
            </div>
            <div>
              <Label htmlFor="support-message" className="dark:text-gray-300">How can we help?</Label>
              <Textarea id="support-message" placeholder="Describe..." rows={3} className="dark:bg-gray-800 dark:border-gray-700 dark:text-white" />
            </div>
            <Button
              className="w-full bg-primary hover:bg-primary-dark text-white"
              onClick={() => {
                vibrateSuccess();
                toast.success('Request submitted!');
                setShowSupportDialog(false);
              }}
            >
              Submit Request
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}

// ==================== EDUCATION SECTION ====================
function EducationSection() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const { t } = useSettings();

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo('.education-text',
        { x: -60, opacity: 0 },
        {
          x: 0, opacity: 1,
          scrollTrigger: { trigger: sectionRef.current, start: 'top 75%', toggleActions: 'play none none reverse' }
        }
      );

      gsap.fromTo('.education-image',
        { x: 60, opacity: 0, scale: 0.98 },
        {
          x: 0, opacity: 1, scale: 1,
          scrollTrigger: { trigger: sectionRef.current, start: 'top 70%', toggleActions: 'play none none reverse' }
        }
      );
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  const items = [
    t('education.item_1'),
    t('education.item_2'),
    t('education.item_3'),
  ];

  return (
    <section ref={sectionRef} className="py-16 md:py-24 bg-muted dark:bg-gray-800 transition-colors duration-300">
      <div className="w-full px-4 md:px-6 lg:px-12">
        <div className="grid lg:grid-cols-2 gap-8 md:gap-12 lg:gap-20 items-center">
          <div className="education-text">
            <h2 className="font-display font-bold text-2xl md:text-3xl lg:text-5xl text-suraksha-black dark:text-white mb-6 md:mb-8">
              {t('education.title')} <span className="text-primary dark:text-primary-light">{t('education.title_highlight')}</span>
            </h2>

            <ul className="space-y-4 md:space-y-6">
              {items.map((item, index) => (
                <li key={index} className="flex items-start gap-3 md:gap-4">
                  <div className="bg-primary text-white w-7 h-7 md:w-8 md:h-8 rounded-full flex items-center justify-center flex-shrink-0 font-display font-bold text-sm md:text-base">
                    {index + 1}
                  </div>
                  <span className="text-suraksha-black dark:text-gray-200 text-sm md:text-base pt-1">{item}</span>
                </li>
              ))}
            </ul>

            <Button
              className="mt-6 md:mt-8 bg-primary hover:bg-primary-dark text-white"
              onClick={() => {
                vibrateSuccess();
                toast.info('Workshops coming soon');
              }}
            >
              {t('education.explore')}
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          </div>

          <div className="education-image">
            <div className="rounded-2xl md:rounded-3xl overflow-hidden shadow-card border border-transparent dark:border-gray-700">
              <img
                src={`${import.meta.env.BASE_URL}education_empowerment.jpg`}
                alt="Education"
                className="w-full h-[300px] md:h-[400px] lg:h-[500px] object-cover"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ==================== CULTURE SECTION ====================
function CultureSection() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [showJoinDialog, setShowJoinDialog] = useState(false);
  const { t } = useSettings();

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo('.culture-text',
        { x: -60, opacity: 0 },
        {
          x: 0, opacity: 1,
          scrollTrigger: { trigger: sectionRef.current, start: 'top 75%', toggleActions: 'play none none reverse' }
        }
      );

      gsap.fromTo('.culture-image',
        { x: 60, opacity: 0, scale: 0.98 },
        {
          x: 0, opacity: 1, scale: 1,
          scrollTrigger: { trigger: sectionRef.current, start: 'top 70%', toggleActions: 'play none none reverse' }
        }
      );
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  const items = [
    t('culture.item_1'),
    t('culture.item_2'),
    t('culture.item_3'),
  ];

  return (
    <section ref={sectionRef} className="py-16 md:py-24 bg-white dark:bg-gray-900 transition-colors duration-300">
      <div className="w-full px-4 md:px-6 lg:px-12">
        <div className="grid lg:grid-cols-2 gap-8 md:gap-12 lg:gap-20 items-center">
          <div className="culture-text">
            <h2 className="font-display font-bold text-2xl md:text-3xl lg:text-5xl text-suraksha-black dark:text-white mb-6 md:mb-8">
              {t('culture.title')} <span className="text-primary dark:text-primary-light">{t('culture.title_highlight')}</span>
            </h2>

            <ul className="space-y-3 md:space-y-4 mb-6 md:mb-8">
              {items.map((item, index) => (
                <li key={index} className="flex items-start gap-3">
                  <ArrowRight className="w-4 h-4 md:w-5 md:h-5 text-primary dark:text-primary-light mt-0.5 flex-shrink-0" />
                  <span className="text-suraksha-black dark:text-gray-300 text-sm md:text-base">{item}</span>
                </li>
              ))}
            </ul>

            <Button
              className="bg-primary hover:bg-primary-dark text-white"
              onClick={() => {
                vibrateSuccess();
                setShowJoinDialog(true);
              }}
            >
              {t('culture.join')}
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          </div>

          <div className="culture-image">
            <div className="rounded-2xl md:rounded-3xl overflow-hidden shadow-card border border-transparent dark:border-gray-700">
              <img
                src={`${import.meta.env.BASE_URL}culture_respect.jpg`}
                alt="Culture"
                className="w-full h-[300px] md:h-[400px] lg:h-[500px] object-cover"
              />
            </div>
          </div>
        </div>
      </div>

      <Dialog open={showJoinDialog} onOpenChange={setShowJoinDialog}>
        <DialogContent className="sm:max-w-md mx-4 bg-white dark:bg-gray-900 dark:border-gray-800">
          <DialogHeader>
            <DialogTitle className="dark:text-white">Join the Movement</DialogTitle>
            <DialogDescription className="dark:text-gray-400">
              Be part of the change.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="join-name" className="dark:text-gray-300">Full Name</Label>
              <Input id="join-name" placeholder="Your name" className="dark:bg-gray-800 dark:border-gray-700 dark:text-white" />
            </div>
            <div>
              <Label htmlFor="join-email" className="dark:text-gray-300">Email</Label>
              <Input id="join-email" type="email" placeholder="your@email.com" className="dark:bg-gray-800 dark:border-gray-700 dark:text-white" />
            </div>
            <div>
              <Label htmlFor="join-interest" className="dark:text-gray-300">I'm interested in</Label>
              <select
                id="join-interest"
                className="w-full mt-1 px-3 py-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-black dark:text-white rounded-lg"
              >
                <option>Volunteering</option>
                <option>Partnering</option>
                <option>Donating</option>
              </select>
            </div>
            <Button
              className="w-full bg-primary hover:bg-primary-dark text-white"
              onClick={() => {
                vibrateSuccess();
                toast.success('Welcome to the movement!');
                setShowJoinDialog(false);
              }}
            >
              Sign Up
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}

// ==================== LEGAL RIGHTS SECTION ====================


// ==================== COMMUNITY SECTION ====================
function CommunitySection() {
  const [activeTab, setActiveTab] = useState<'forum' | 'report'>('forum');
  const [posts, setPosts] = useLocalStorage<any[]>('suraksha-forum-posts', [
    { id: 1, author: 'Ananya', content: 'The new street lights on MG Road have made a huge difference! feel much safer walking home.', likes: 12, time: '2 hours ago' },
    { id: 2, author: 'Priya', content: 'Does anyone know if the self-defense workshop this weekend has open slots?', likes: 5, time: '5 hours ago' }
  ]);
  const [newPost, setNewPost] = useState('');
  const { t } = useSettings();

  const handlePost = () => {
    if (!newPost.trim()) return;
    const post = {
      id: Date.now(),
      author: 'You',
      content: newPost,
      likes: 0,
      time: 'Just now'
    };
    setPosts([post, ...posts]);
    setNewPost('');
    toast.success('Post shared with community');
  };

  const handleReport = (e: any) => {
    e.preventDefault();
    toast.success('Report Submitted Anonymously', {
      description: 'Reference ID: #ANON-' + Math.floor(Math.random() * 10000),
      duration: 5000
    });
    (e.target as HTMLFormElement).reset();
  };

  return (
    <section className="py-16 md:py-24 bg-indigo-50/50 dark:bg-gray-900 transition-colors duration-300">
      <div className="container px-4 mx-auto max-w-4xl">
        <div className="text-center mb-10">
          <h2 className="text-2xl md:text-3xl font-bold font-display text-suraksha-black dark:text-white mb-4">
            {t('community.title')}
          </h2>
          <div className="flex justify-center gap-4 bg-white dark:bg-gray-800 p-1 rounded-full inline-flex shadow-sm border dark:border-gray-700">
            <button
              onClick={() => setActiveTab('forum')}
              className={`px-6 py-2 rounded-full text-sm font-semibold transition-all ${activeTab === 'forum' ? 'bg-primary text-white shadow-md' : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
            >
              <Users className="w-4 h-4 inline mr-2" />
              {t('community.tab.forum')}
            </button>
            <button
              onClick={() => setActiveTab('report')}
              className={`px-6 py-2 rounded-full text-sm font-semibold transition-all ${activeTab === 'report' ? 'bg-red-500 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
            >
              <Shield className="w-4 h-4 inline mr-2" />
              {t('community.tab.report')}
            </button>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden min-h-[400px]">
          {activeTab === 'forum' ? (
            <div className="p-6">
              <div className="flex gap-4 mb-8">
                <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/40 rounded-full flex items-center justify-center flex-shrink-0">
                  <User className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div className="flex-1">
                  <Textarea
                    value={newPost}
                    onChange={(e) => setNewPost(e.target.value)}
                    placeholder={t('community.forum.placeholder')}
                    className="mb-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                  <div className="flex justify-end">
                    <Button onClick={handlePost} size="sm" className="bg-primary hover:bg-primary-dark text-white">{t('community.forum.post')}</Button>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                {posts.map((post: any) => (
                  <div key={post.id} className="pb-6 border-b last:border-0 border-gray-100 dark:border-gray-700">
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-bold text-gray-800 dark:text-white">{post.author}</span>
                      <span className="text-xs text-gray-400 dark:text-gray-500">{post.time}</span>
                    </div>
                    <p className="text-gray-600 dark:text-gray-300 text-sm mb-3">{post.content}</p>
                    <button className="text-gray-400 hover:text-red-500 text-xs flex items-center gap-1 transition-colors">
                      <Heart className="w-3 h-3" /> {post.likes} Likes
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="p-6 md:p-10">
              <div className="mb-6 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-900/40 p-4 rounded-lg flex items-start gap-3">
                <Lock className="w-5 h-5 text-yellow-600 dark:text-yellow-500 mt-0.5" />
                <div>
                  <h4 className="font-bold text-yellow-800 text-sm">{t('community.report.anonymous_badge')}</h4>
                  <p className="text-xs text-yellow-700 mt-1">
                    {t('community.report.anonymous_desc')}
                  </p>
                </div>
              </div>

              <form onSubmit={handleReport} className="space-y-4">
                <div>
                  <Label htmlFor="incident_type" className="dark:text-gray-300">{t('community.report.incident_type')}</Label>
                  <select id="incident_type" name="incident_type" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-gray-800 dark:border-gray-700 dark:text-white">
                    <option>Harassment / Stalking</option>
                    <option>Domestic Violence</option>
                    <option>Unsafe Area / Poor Lighting</option>
                    <option>Cyber Bullying</option>
                    <option>Other</option>
                  </select>
                </div>
                <div>
                  <Label htmlFor="incident_date" className="dark:text-gray-300">{t('community.report.date_time')}</Label>
                  <div className="grid grid-cols-2 gap-4">
                    <Input id="incident_date" name="incident_date" type="date" required className="dark:bg-gray-800 dark:border-gray-700 dark:text-white" />
                    <Input id="incident_time" name="incident_time" type="time" required className="dark:bg-gray-800 dark:border-gray-700 dark:text-white" />
                  </div>
                </div>
                <div>
                  <Label htmlFor="incident_desc" className="dark:text-gray-300">{t('community.report.description')}</Label>
                  <Textarea id="incident_desc" name="incident_desc" placeholder="Please describe what happened (omit names if preferred)..." rows={4} required className="dark:bg-gray-800 dark:border-gray-700 dark:text-white" />
                </div>
                <div className="pt-2">
                  <Button type="submit" className="w-full bg-red-600 hover:bg-red-700 text-white">
                    {t('community.report.submit')}
                  </Button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

// ==================== SAFETY STATUS BUTTON ====================
function SafetyStatusButton({ className }: { className?: string }) {
  const [status, setStatus] = useState<'offline' | 'connecting' | 'active'>('offline');

  const handleConnect = () => {
    if (status === 'active') return;

    vibrateSuccess();
    if (status === 'offline') {
      setStatus('connecting');
      toast.info("Connecting to Guardian Network...", {
        description: "Locating nearest verified guardians...",
        duration: 2000
      });

      // Simulate connection delay
      setTimeout(() => {
        setStatus('active');
        vibrate([100, 50, 100, 50, 100]); // Success vibration
        toast.success("Safety Network ACTIVE", {
          description: "5 Guardians found nearby. You are being monitored.",
          duration: 4000
        });
      }, 2500);
    }
  };

  return (
    <div
      onClick={handleConnect}
      className={`
        ${className} 
        cursor-pointer group select-none transition-all duration-300
        ${status === 'offline' ? 'hover:scale-105' : ''}
        ${status === 'connecting' ? 'scale-95 opacity-80' : ''}
        ${status === 'active' ? 'hover:scale-105' : ''}
      `}
    >
      <div className={`
        relative overflow-hidden
        flex items-center gap-3 px-5 py-3 rounded-full 
        border backdrop-blur-md shadow-lg transition-all duration-500
        ${status === 'offline' ? 'bg-black/60 border-red-500/50 text-red-100 shadow-red-900/20' : ''}
        ${status === 'connecting' ? 'bg-yellow-900/60 border-yellow-500/50 text-yellow-100 shadow-yellow-900/20' : ''}
        ${status === 'active' ? 'bg-emerald-900/80 border-emerald-500/50 text-emerald-100 shadow-emerald-900/30' : ''}
      `}>
        {/* Status Indicator Dot */}
        <div className="relative">
          <div className={`
            w-3 h-3 rounded-full transition-colors duration-300 shadow-inner
            ${status === 'offline' ? 'bg-red-500' : ''}
            ${status === 'connecting' ? 'bg-yellow-500' : ''}
            ${status === 'active' ? 'bg-emerald-500' : ''}
          `} />
          <div className={`
            absolute inset-0 rounded-full animate-ping opacity-75
            ${status === 'offline' ? 'bg-red-500 duration-[2s]' : ''}
            ${status === 'connecting' ? 'bg-yellow-500 duration-[1s]' : ''}
            ${status === 'active' ? 'bg-emerald-500 duration-[3s]' : ''}
          `} />
        </div>

        {/* Text Content */}
        <div className="flex flex-col">
          <span className="font-bold text-xs md:text-sm tracking-wide uppercase">
            {status === 'offline' && "Safety Offline"}
            {status === 'connecting' && "Connecting..."}
            {status === 'active' && "Safety Active"}
          </span>
          <span className="text-[10px] md:text-xs opacity-80 font-medium">
            {status === 'offline' && "Tap to Connect"}
            {status === 'connecting' && "Locating..."}
            {status === 'active' && "Guardians Nearby"}
          </span>
        </div>

        {/* Lock/Shield Icon */}
        <div className={`
          ml-1 transition-all duration-500
          ${status === 'active' ? 'text-emerald-400' : 'opacity-50'}
        `}>
          {status === 'active' ? <ShieldCheck className="w-5 h-5" /> : <Lock className="w-4 h-4" />}
        </div>

        {/* Background Glow Effect */}
        <div className={`
          absolute inset-0 -z-10 blur-xl opacity-20 transition-colors duration-500
          ${status === 'offline' ? 'bg-red-600' : ''}
          ${status === 'connecting' ? 'bg-yellow-600' : ''}
          ${status === 'active' ? 'bg-emerald-600' : ''}
        `} />
      </div>
    </div>
  );
}

// ==================== GUARDIAN NETWORK SECTION ====================
function GuardianNetworkSection() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const { t } = useSettings();

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo('.guardian-card',
        { y: 50, opacity: 0 },
        {
          y: 0, opacity: 1, stagger: 0.15,
          scrollTrigger: { trigger: sectionRef.current, start: 'top 75%', toggleActions: 'play none none reverse' }
        }
      );
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  const features = [
    { icon: MapPin, title: t('guardian.feature_1.title'), desc: t('guardian.feature_1.desc') },
    { icon: Users, title: t('guardian.feature_2.title'), desc: t('guardian.feature_2.desc') },
    { icon: Phone, title: t('guardian.feature_3.title'), desc: t('guardian.feature_3.desc') },
  ];

  return (
    <section ref={sectionRef} className="py-16 md:py-24 bg-suraksha-black text-white">
      <div className="w-full px-4 md:px-6 lg:px-12">
        <div className="text-center mb-10 md:mb-16">
          <div className="inline-flex items-center gap-2 bg-primary/20 px-4 py-2 rounded-full mb-4">
            <Shield className="w-4 h-4 text-primary" />
            <span className="text-primary text-sm font-semibold">{t('guardian.badge')}</span>
          </div>
          <h2 className="font-display font-bold text-2xl md:text-3xl lg:text-5xl mb-4 md:mb-6">
            {t('guardian.title')} <span className="text-primary">{t('guardian.title_highlight')}</span>
          </h2>
          <p className="text-white/70 max-w-2xl mx-auto text-sm md:text-base">
            {t('guardian.subtitle')}
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto mb-12">
          {features.map((feature, index) => (
            <div key={index} className="guardian-card bg-white/5 border border-white/10 p-6 md:p-8 rounded-2xl md:rounded-3xl hover:bg-white/10 transition-colors">
              <feature.icon className="w-8 h-8 md:w-10 md:h-10 text-primary mb-4 md:mb-6" />
              <h3 className="font-display font-bold text-lg md:text-xl mb-2 md:mb-3">{feature.title}</h3>
              <p className="text-white/60 text-sm md:text-base">{feature.desc}</p>
            </div>
          ))}
        </div>

        <div className="text-center">
          <Button className="bg-primary hover:bg-primary-dark text-white px-8 py-6 rounded-xl text-lg font-semibold">
            {t('guardian.join')}
          </Button>
        </div>
      </div>
    </section>
  );
}



function FooterSection({ onViewChange }: { onViewChange: (view: 'user' | 'admin' | 'admin-login') => void }) {
  const { t } = useSettings();
  return (
    <footer className="bg-white dark:bg-gray-950 pt-16 md:pt-24 pb-8 md:pb-12 border-t border-suraksha-black/5 dark:border-white/5 transition-colors duration-300">
      <div className="w-full px-4 md:px-6 lg:px-12">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 md:gap-12 mb-12 md:mb-16">
          <div>
            <div className="flex items-center gap-2 mb-6 md:mb-8">
              <div className="w-8 h-8 md:w-10 md:h-10 bg-primary rounded-lg flex items-center justify-center">
                <Shield className="w-5 h-5 md:w-6 md:h-6 text-white" />
              </div>
              <span className="font-display font-bold text-xl md:text-2xl text-suraksha-black dark:text-white">Suraksha</span>
            </div>
            <p className="text-suraksha-gray dark:text-gray-400 text-sm md:text-base mb-6 md:mb-8">
              {t('footer.description')}
            </p>
            <div className="flex gap-4">
              {[Twitter, Instagram, Linkedin, Facebook].map((Icon, i) => (
                <div key={i} className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-suraksha-black/5 dark:bg-white/10 flex items-center justify-center text-suraksha-black dark:text-white hover:bg-primary hover:text-white dark:hover:bg-primary transition-colors cursor-pointer">
                  <Icon className="w-4 h-4 md:w-5 md:h-5" />
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="font-bold text-suraksha-black dark:text-white mb-4 md:mb-6">{t('footer.company')}</h3>
            <ul className="space-y-3 md:space-y-4 text-suraksha-gray dark:text-gray-400 text-sm md:text-base">
              <li className="hover:text-primary dark:hover:text-primary-light cursor-pointer">{t('footer.about')}</li>
              <li className="hover:text-primary dark:hover:text-primary-light cursor-pointer">{t('footer.careers')}</li>
              <li className="hover:text-primary dark:hover:text-primary-light cursor-pointer">{t('footer.blog')}</li>
              <li className="hover:text-primary dark:hover:text-primary-light cursor-pointer">{t('footer.press')}</li>
            </ul>
          </div>

          <div>
            <h3 className="font-bold text-suraksha-black dark:text-white mb-4 md:mb-6">{t('footer.resources')}</h3>
            <ul className="space-y-3 md:space-y-4 text-suraksha-gray dark:text-gray-400 text-sm md:text-base">
              <li className="hover:text-primary dark:hover:text-primary-light cursor-pointer">{t('footer.safety_tips')}</li>
              <li className="hover:text-primary dark:hover:text-primary-light cursor-pointer">{t('footer.support')}</li>
              <li className="hover:text-primary dark:hover:text-primary-light cursor-pointer">{t('footer.community')}</li>
              <li className="hover:text-primary dark:hover:text-primary-light cursor-pointer" onClick={() => onViewChange('admin-login')}>{t('footer.admin')}</li>
            </ul>
          </div>


        </div>

        <div className="pt-8 border-t border-suraksha-black/5 dark:border-white/5 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-suraksha-gray/60 dark:text-gray-500 text-xs md:text-sm">
            {t('footer.copyright')}
          </p>
          <div className="flex gap-6 md:gap-8 text-suraksha-gray/60 dark:text-gray-500 text-xs md:text-sm">
            <span className="hover:text-primary dark:hover:text-primary-light cursor-pointer">{t('footer.privacy')}</span>
            <span className="hover:text-primary dark:hover:text-primary-light cursor-pointer">{t('footer.terms')}</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

// ==================== JOB & SKILL RESOURCES SECTION ====================
function JobResourcesSection() {
  const { t } = useSettings();
  const resources = [
    {
      title: t('jobs.courses'),
      icon: BookOpen,
      desc: 'Access free courses on digital literacy, coding, and business management.',
      link: 'https://www.skillindia.gov.in/',
      color: 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300',
      buttonText: 'Start Learning'
    },
    {
      title: t('jobs.portals'),
      icon: Search,
      desc: 'Find jobs tailored for women in various sectors including tech and healthcare.',
      link: 'https://www.ncs.gov.in/',
      color: 'bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-300',
      buttonText: 'Find Jobs'
    },
    {
      title: t('jobs.schemes'),
      icon: Building,
      desc: 'Learn about government initiatives and financial aid for women entrepreneurs.',
      link: 'https://wcd.nic.in/schemes-listing',
      color: 'bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-300',
      buttonText: 'View Schemes'
    }
  ];

  return (
    <section className="py-16 md:py-24 bg-gray-50 dark:bg-gray-900">
      <div className="container px-4 mx-auto">
        <div className="text-center mb-12">
          <h2 className="font-display font-bold text-2xl md:text-3xl lg:text-5xl text-suraksha-black dark:text-white mb-4">
            {t('jobs.title')} <span className="text-primary">{t('jobs.resources')}</span>
          </h2>
          <p className="text-suraksha-gray dark:text-gray-300 text-base md:text-lg max-w-2xl mx-auto">
            {t('jobs.subtitle')}
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {resources.map((res, index) => (
            <div key={index} className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-sm hover:shadow-md transition-all border border-gray-100 dark:border-gray-700 group">
              <div className={`w-14 h-14 ${res.color} rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
                <res.icon className="w-7 h-7" />
              </div>
              <h3 className="font-bold text-xl text-gray-900 dark:text-white mb-3">{res.title}</h3>
              <p className="text-gray-600 dark:text-gray-300 mb-6 leading-relaxed">{res.desc}</p>
              <Button
                className="w-full bg-white dark:bg-gray-700 border-2 border-primary text-primary hover:bg-primary hover:text-white transition-colors dark:text-white dark:hover:bg-primary"
                onClick={() => window.open(res.link, '_blank')}
              >
                {res.buttonText}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}



// ==================== MAIN APP ====================
function App() {
  // Register service worker
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then((registration) => {
          console.log('SW registered:', registration);
        })
        .catch((error) => {
          console.log('SW registration failed:', error);
        });
    }
  }, []);

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <SettingsProvider>
        <AppContent />
      </SettingsProvider>
    </ThemeProvider>
  );
}

// ==================== APP CONTENT WITH ROUTING ====================
function AppContent() {
  const [view, setView] = useState<'user' | 'admin' | 'login' | 'signup' | 'admin-login'>('user');

  return (
    <div className="relative min-h-screen bg-background text-foreground transition-colors duration-300 overflow-x-hidden">
      {view === 'user' && (
        <>
          <Navigation onViewChange={setView} />
          <main>
            <HeroSection />
            <AISafetyDashboard />
            <SafetyToolsSection />
            <RightsSection />
            <MissionSection />
            <GuardianNetworkSection />
            <TestimonialSection />
            <StatsSection />
            <EffortsSection />
            <StoriesSection />
            <CommunitySection />
            <ServicesSection />
            <SelfDefenseSection />
            <SurvivorSupportSection />
            <EducationSection />
            <JobResourcesSection />
            <CultureSection />
            <VideoUploadSection />
            <FooterSection onViewChange={setView} />
          </main>
          <BottomNav />
          <InstallPrompt />
          {/* AI Risk Pill — scrolls to dashboard */}
          <div className="fixed bottom-20 left-4 z-40 md:bottom-6">
            <RiskPill />
          </div>
          {/* Safety Status Bar */}
          <div className="fixed bottom-16 left-1/2 -translate-x-1/2 z-40 md:bottom-4">
            <SafetyStatusButton />
          </div>
          <div className="fixed bottom-24 right-4 z-50 md:bottom-10 md:right-10 flex flex-col items-end gap-3">
            <SOSButtonWithVoice />
          </div>
        </>
      )}

      {view === 'login' && (
        <LoginPage onViewChange={(v) => setView(v === 'admin' ? 'admin' : v === 'signup' ? 'signup' : 'user')} />
      )}

      {view === 'signup' && (
        <SignupPage onViewChange={(v) => setView(v)} />
      )}

      {view === 'admin-login' && (
        <LoginPage onViewChange={(v) => setView(v === 'admin' ? 'admin' : v === 'signup' ? 'signup' : 'user')} />
      )}

      {view === 'admin' && (
        <AdminPanel onLogout={() => setView('user')} />
      )}

      <Toaster />
    </div>
  );
}

// ==================== AUTH PAGES ====================
function LoginPage({ onViewChange }: { onViewChange: (view: 'user' | 'admin' | 'signup') => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { t } = useSettings();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (email === 'admin@suraksha.org' && password === 'admin123') {
      onViewChange('admin');
      toast.success('Admin access granted');
    } else {
      toast.error('Invalid credentials');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-muted">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 mb-4">
            <Lock className="w-6 h-6 text-primary" />
          </div>
          <h2 className="text-2xl font-bold text-suraksha-black">{t('auth.login.title')}</h2>
          <p className="text-suraksha-gray mt-2">{t('auth.login.subtitle')}</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <Label>{t('auth.login.email')}</Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@suraksha.org"
              required
            />
          </div>
          <div>
            <Label>{t('auth.login.password')}</Label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>
          <Button type="submit" className="w-full bg-primary hover:bg-primary-dark">
            {t('auth.login.submit')}
          </Button>
        </form>

        <p className="text-center mt-6 text-sm text-suraksha-gray">
          {t('auth.login.no_account')} {' '}
          <button onClick={() => onViewChange('signup')} className="text-primary hover:underline font-semibold">
            {t('auth.login.signup_link')}
          </button>
        </p>
      </div>
    </div>
  );
}

function SignupPage({ onViewChange }: { onViewChange: (view: 'user' | 'admin' | 'admin-login') => void }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { t } = useSettings();

  const handleSignup = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success('Account created successfully!');
    onViewChange('user');
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-muted">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 mb-4">
            <User className="w-6 h-6 text-primary" />
          </div>
          <h2 className="text-2xl font-bold text-suraksha-black">{t('auth.signup.title')}</h2>
          <p className="text-suraksha-gray mt-2">{t('auth.signup.subtitle')}</p>
        </div>

        <form onSubmit={handleSignup} className="space-y-4">
          <div>
            <Label>{t('auth.signup.fullname')}</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Jane Doe"
              required
            />
          </div>
          <div>
            <Label>{t('auth.signup.email')}</Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="jane@example.com"
              required
            />
          </div>
          <div>
            <Label>{t('auth.signup.password')}</Label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>
          <Button type="submit" className="w-full bg-primary hover:bg-primary-dark">
            {t('auth.signup.submit')}
          </Button>
        </form>

        <p className="text-center mt-6 text-sm text-suraksha-gray">
          {t('auth.signup.has_account')} {' '}
          <button onClick={() => onViewChange('admin-login')} className="text-primary hover:underline font-semibold">
            {t('auth.signup.login_link')}
          </button>
        </p>
      </div>
    </div>
  );
}

function AdminPanel({ onLogout }: { onLogout: () => void }) {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'incidents' | 'resources' | 'users' | 'sos_logs' | 'video_reports'>('dashboard');

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex flex-col md:flex-row">
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex-shrink-0">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-xl text-primary">
            <ShieldCheck className="w-6 h-6" />
            <span>Admin</span>
          </div>
          <Button variant="ghost" size="icon" className="md:hidden">
            <Menu className="w-5 h-5" />
          </Button>
        </div>

        <nav className="p-4 space-y-2">
          <Button
            variant={activeTab === 'dashboard' ? 'secondary' : 'ghost'}
            className="w-full justify-start"
            onClick={() => setActiveTab('dashboard')}
          >
            <Activity className="w-4 h-4 mr-2" /> Dashboard
          </Button>
          <Button
            variant={activeTab === 'incidents' ? 'secondary' : 'ghost'}
            className="w-full justify-start"
            onClick={() => setActiveTab('incidents')}
          >
            <AlertTriangle className="w-4 h-4 mr-2" /> Incidents
          </Button>
          <Button
            variant={activeTab === 'resources' ? 'secondary' : 'ghost'}
            className="w-full justify-start"
            onClick={() => setActiveTab('resources')}
          >
            <BookOpen className="w-4 h-4 mr-2" /> Resources
          </Button>
          <Button
            variant={activeTab === 'users' ? 'secondary' : 'ghost'}
            className="w-full justify-start"
            onClick={() => setActiveTab('users')}
          >
            <Users className="w-4 h-4 mr-2" /> Users
          </Button>
          <Button
            variant={activeTab === 'sos_logs' ? 'secondary' : 'ghost'}
            className="w-full justify-start"
            onClick={() => setActiveTab('sos_logs')}
          >
            <Siren className="w-4 h-4 mr-2" /> SOS Logs
          </Button>
          <Button
            variant={activeTab === 'video_reports' ? 'secondary' : 'ghost'}
            className="w-full justify-start text-left"
            onClick={() => setActiveTab('video_reports')}
          >
            <Video className="w-4 h-4 mr-2" /> Video Reports
          </Button>
        </nav>

        <div className="p-4 mt-auto border-t border-gray-200 dark:border-gray-700">
          <Button variant="outline" className="w-full text-red-500 hover:text-red-600 hover:bg-red-50" onClick={onLogout}>
            Logout
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto">
        {activeTab === 'dashboard' && <AdminDashboard />}
        {activeTab === 'incidents' && <AdminIncidents />}
        {activeTab === 'resources' && <AdminResources />}
        {activeTab === 'users' && <AdminUsers />}
        {activeTab === 'sos_logs' && <AdminSOSLogs />}
        {activeTab === 'video_reports' && <AdminVideoReports />}
      </main>
    </div>
  );
}

function AdminDashboard() {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Dashboard Overview</h2>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm text-gray-500">Total Reports</p>
              <h3 className="text-2xl font-bold mt-1">1,248</h3>
            </div>
            <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
              <FileText className="w-5 h-5" />
            </div>
          </div>
          <p className="text-xs text-green-500 mt-2 flex items-center">
            <ArrowRight className="w-3 h-3 rotate-45 mr-1" /> +12% from last month
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm text-gray-500">Active Alerts</p>
              <h3 className="text-2xl font-bold mt-1">42</h3>
            </div>
            <div className="p-2 bg-red-100 text-red-600 rounded-lg">
              <Siren className="w-5 h-5" />
            </div>
          </div>
          <p className="text-xs text-red-500 mt-2">Critical attention needed</p>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm text-gray-500">Volunteers</p>
              <h3 className="text-2xl font-bold mt-1">856</h3>
            </div>
            <div className="p-2 bg-green-100 text-green-600 rounded-lg">
              <Handshake className="w-5 h-5" />
            </div>
          </div>
          <p className="text-xs text-green-500 mt-2 flex items-center">
            <ArrowRight className="w-3 h-3 rotate-45 mr-1" /> +24 this week
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm text-gray-500">Safe Zones</p>
              <h3 className="text-2xl font-bold mt-1">128</h3>
            </div>
            <div className="p-2 bg-purple-100 text-purple-600 rounded-lg">
              <MapPin className="w-5 h-5" />
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2">Across 12 districts</p>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
        <h3 className="font-bold text-lg mb-4">Recent Activity</h3>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-4 p-3 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors border-b last:border-0 border-gray-100 dark:border-gray-700">
              <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center">
                <User className="w-5 h-5 text-gray-500 dark:text-gray-300" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">New report submitted by Anonymous</p>
                <p className="text-xs text-gray-500">2 minutes ago • Harassment • Connaught Place</p>
              </div>
              <Button size="sm" variant="outline">View</Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function AdminIncidents() {
  const [incidents, setIncidents] = useState([
    { id: 1, type: 'Harassment', location: 'MG Road', time: '10:30 AM', status: 'Pending', flagged: false },
    { id: 2, type: 'Stalking', location: 'Sector 15', time: 'Yesterday', status: 'Verified', flagged: false },
    { id: 3, type: 'Dark Area', location: 'Park Street', time: '2 days ago', status: 'Resolved', flagged: false },
    { id: 4, type: 'Fake Report', location: 'Unknown', time: '1 hour ago', status: 'Pending', flagged: true },
  ]);

  const toggleFlag = (id: number) => {
    setIncidents(incidents.map(inc =>
      inc.id === id ? { ...inc, flagged: !inc.flagged } : inc
    ));
    toast.success('Report status updated');
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Incident Reports</h2>
        <div className="flex gap-2">
          <Button variant="outline"><Filter className="w-4 h-4 mr-2" /> Filter</Button>
          <Button variant="outline"><Download className="w-4 h-4 mr-2" /> Export</Button>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-50 dark:bg-gray-700/50 text-gray-500 font-medium">
            <tr>
              <th className="px-6 py-4">Type</th>
              <th className="px-6 py-4">Location</th>
              <th className="px-6 py-4">Time</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {incidents.map((incident) => (
              <tr key={incident.id} className={incident.flagged ? 'bg-red-50 dark:bg-red-900/10' : ''}>
                <td className="px-6 py-4 font-medium">
                  {incident.type}
                  {incident.flagged && <span className="ml-2 text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">Flagged</span>}
                </td>
                <td className="px-6 py-4">{incident.location}</td>
                <td className="px-6 py-4 text-gray-500">{incident.time}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${incident.status === 'Verified' ? 'bg-green-100 text-green-700' :
                    incident.status === 'Resolved' ? 'bg-blue-100 text-blue-700' :
                      'bg-yellow-100 text-yellow-700'
                    }`}>
                    {incident.status}
                  </span>
                </td>
                <td className="px-6 py-4 flex gap-2">
                  <Button size="sm" variant="ghost">View</Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className={incident.flagged ? 'text-green-600' : 'text-red-600'}
                    onClick={() => toggleFlag(incident.id)}
                  >
                    <Flag className="w-4 h-4" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AdminResources() {
  const [resources, setResources] = useState([
    { id: 1, name: 'Women Helpline', contact: '1091', category: 'Emergency' },
    { id: 2, name: 'Domestic Abuse', contact: '181', category: 'Support' },
    { id: 3, name: 'Legal Aid Cell', contact: '011-23385321', category: 'Legal' },
  ]);

  const [newResource, setNewResource] = useState({ name: '', contact: '', category: '' });

  const addResource = () => {
    if (newResource.name && newResource.contact) {
      setResources([...resources, { id: Date.now(), ...newResource }]);
      setNewResource({ name: '', contact: '', category: '' });
      toast.success('Resource added successfully');
    }
  };

  const removeResource = (id: number) => {
    setResources(resources.filter(r => r.id !== id));
    toast.success('Resource removed');
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Manage Resources</h2>

      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
        <h3 className="font-bold mb-4">Add New Resource</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Input
            placeholder="Name (e.g. Local Police)"
            value={newResource.name}
            onChange={e => setNewResource({ ...newResource, name: e.target.value })}
          />
          <Input
            placeholder="Contact (e.g. 100)"
            value={newResource.contact}
            onChange={e => setNewResource({ ...newResource, contact: e.target.value })}
          />
          <Input
            placeholder="Category"
            value={newResource.category}
            onChange={e => setNewResource({ ...newResource, category: e.target.value })}
          />
          <Button onClick={addResource} className="bg-primary text-white">
            <Plus className="w-4 h-4 mr-2" /> Add
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {resources.map(resource => (
          <div key={resource.id} className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 flex justify-between items-center">
            <div>
              <h4 className="font-bold">{resource.name}</h4>
              <p className="text-primary font-mono">{resource.contact}</p>
              <span className="text-xs text-gray-500 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full">{resource.category}</span>
            </div>
            <Button size="icon" variant="ghost" className="text-red-500 hover:bg-red-50" onClick={() => removeResource(resource.id)}>
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}

function AdminUsers() {
  const [users, setUsers] = useState<UserType[]>([]);

  useEffect(() => {
    setUsers(UserDb.getAll());
  }, []);

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this user?')) {
      UserDb.delete(id);
      setUsers(UserDb.getAll());
      toast.success('User deleted');
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">User Management</h2>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-50 dark:bg-gray-700/50 text-gray-500 font-medium">
            <tr>
              <th className="px-6 py-4">Name</th>
              <th className="px-6 py-4">Email</th>
              <th className="px-6 py-4">Role</th>
              <th className="px-6 py-4">Joined</th>
              <th className="px-6 py-4">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {users.map((user) => (
              <tr key={user.id}>
                <td className="px-6 py-4 font-medium flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                    {user.name.charAt(0)}
                  </div>
                  {user.name}
                </td>
                <td className="px-6 py-4">{user.email}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${user.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-700'
                    }`}>
                    {user.role}
                  </span>
                </td>
                <td className="px-6 py-4 text-gray-500">
                  {new Date(user.createdAt).toLocaleDateString()}
                </td>
                <td className="px-6 py-4">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-red-500 hover:bg-red-50"
                    onClick={() => handleDelete(user.id)}
                    disabled={user.role === 'admin' && user.id.startsWith('admin')} // Prevent deleting main admin
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AdminSOSLogs() {
  const [alerts, setAlerts] = useState<SOSAlert[]>([]);

  useEffect(() => {
    // Poll for new alerts every 5 seconds
    const fetchAlerts = () => {
      setAlerts(SOSDb.getAll());
    };

    fetchAlerts();
    const interval = setInterval(fetchAlerts, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleResolve = (id: string) => {
    SOSDb.resolve(id);
    setAlerts(SOSDb.getAll()); // Refresh immediately
    toast.success('SOS Alert marked as resolved');
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold flex items-center gap-2">
        <Siren className="text-red-600" /> SOS Emergency Logs
      </h2>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-50 dark:bg-gray-700/50 text-gray-500 font-medium">
            <tr>
              <th className="px-6 py-4">Time</th>
              <th className="px-6 py-4">User</th>
              <th className="px-6 py-4">Location</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {alerts.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                  No SOS alerts recorded yet.
                </td>
              </tr>
            ) : (
              alerts.map((alert) => (
                <tr key={alert.id} className={alert.status === 'active' ? 'bg-red-50 dark:bg-red-900/20' : ''}>
                  <td className="px-6 py-4 text-gray-500">
                    {new Date(alert.timestamp).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 font-medium">
                    {alert.userName}
                    {alert.userId && <span className="ml-2 text-xs text-gray-400">({alert.userId})</span>}
                  </td>
                  <td className="px-6 py-4 font-mono text-xs">
                    {alert.latitude ? `${alert.latitude.toFixed(4)}, ${alert.longitude?.toFixed(4)}` : 'Unknown'}
                    {alert.latitude && (
                      <a
                        href={`https://www.google.com/maps?q=${alert.latitude},${alert.longitude}`}
                        target="_blank"
                        rel="noreferrer"
                        className="ml-2 text-primary hover:underline"
                      >
                        Map
                      </a>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${alert.status === 'active' ? 'bg-red-100 text-red-700 animate-pulse' : 'bg-green-100 text-green-700'
                      }`}>
                      {alert.status.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {alert.status === 'active' && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-green-600 border-green-200 hover:bg-green-50"
                        onClick={() => handleResolve(alert.id)}
                      >
                        Resolve
                      </Button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

import { VideoDb, type VideoReport } from '@/lib/videoDb';

// ... existing imports ...

// ==================== VIDEO REPORTING SECTION ====================
function VideoUploadSection() {
  const { t } = useSettings();
  const [file, setFile] = useState<File | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [description, setDescription] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      toast.success(t('video.file_selected') + ' ' + e.target.files[0].name);
    }
  };

  const handleRecord = () => {
    if (isRecording) {
      setIsRecording(false);
      toast.success('Recording stopped. Video saved.');
      // Simulate a recorded file
      setFile(new File(["dummy content"], "recorded-video.mp4", { type: "video/mp4" }));
    } else {
      setIsRecording(true);
      toast.info(t('video.recording'));
    }
    vibrateSuccess();
  };

  const handleSubmit = () => {
    if (!file && !description) {
      toast.error('Please upload a video or provide a description.');
      return;
    }

    // Simulate upload
    toast.promise(
      new Promise((resolve) => setTimeout(resolve, 2000)),
      {
        loading: 'Uploading video report...',
        success: () => {
          VideoDb.add({
            description: description || 'No description provided',
            fileName: file?.name || 'recorded-video.mp4',
            location: '28.6139° N, 77.2090° E (Simulated)',
            videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4' // Mock URL
          });
          setFile(null);
          setDescription('');
          if (fileInputRef.current) fileInputRef.current.value = '';
          return t('video.success');
        },
        error: 'Upload failed',
      }
    );
  };

  return (
    <section className="py-24 md:py-32 relative overflow-hidden bg-black text-white">
      {/* Animated Mesh Gradient Background */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-red-900/40 via-gray-900 to-black z-0 pointer-events-none" />
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 z-0 pointer-events-none mix-blend-overlay" />

      {/* Moving Spotlight Effect */}
      <div className="absolute top-[-20%] left-[20%] w-[600px] h-[600px] bg-red-600/20 rounded-full blur-[120px] animate-pulse pointer-events-none" />

      <div className="container px-4 mx-auto max-w-6xl relative z-10">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold uppercase tracking-[0.2em] mb-6 shadow-[0_0_20px_rgba(239,68,68,0.2)]">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
            Live Reporting System
          </div>

          <h2 className="font-display font-bold text-4xl md:text-6xl lg:text-7xl mb-6 bg-clip-text text-transparent bg-gradient-to-r from-white via-red-200 to-gray-400 tracking-tight">
            {t('video.title')}
          </h2>

          <p className="text-xl text-gray-400 max-w-3xl mx-auto leading-relaxed font-light">
            {t('video.subtitle')}
          </p>
        </div>

        <div className="grid lg:grid-cols-12 gap-8 items-start">
          {/* Main Action Area */}
          <div className="lg:col-span-12 bg-gray-900/60 backdrop-blur-2xl p-8 md:p-12 rounded-[2.5rem] shadow-2xl border border-white/10 relative overflow-hidden group">
            {/* Neon Glow Border */}
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-red-500/50 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-red-500/20 to-transparent" />

            <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
              <input
                type="file"
                accept="video/*"
                className="hidden"
                ref={fileInputRef}
                onChange={handleFileChange}
              />

              {/* Drop Zone */}
              <div
                className="relative border-2 border-dashed border-gray-700 rounded-3xl p-8 flex flex-col items-center justify-center gap-4 cursor-pointer transition-all duration-300 hover:border-red-500/50 hover:bg-red-500/5 group/upload h-[300px]"
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="w-20 h-20 bg-gray-800 rounded-full flex items-center justify-center group-hover/upload:scale-110 transition-transform duration-500 shadow-lg group-hover/upload:shadow-red-500/20">
                  <Upload className="w-10 h-10 text-gray-400 group-hover/upload:text-white transition-colors" />
                </div>
                <div className="text-center">
                  <p className="font-bold text-xl text-white mb-2">
                    {file ? file.name : t('video.upload_btn')}
                  </p>
                  <p className="text-sm text-gray-500">Drag & drop or click to browse</p>
                  {!file && <p className="text-xs text-gray-600 mt-4 uppercase tracking-widest">Secure Upload</p>}
                </div>
              </div>

              {/* Recording Interface */}
              <div className="flex flex-col gap-6 h-[300px]">
                <div className="flex-1 bg-gray-950/50 rounded-3xl border border-gray-800 flex flex-col items-center justify-center relative overflow-hidden">
                  {/* Camera Lens Effect */}
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-gray-800/20 via-transparent to-transparent opacity-50" />

                  <button
                    className={`relative w-24 h-24 rounded-full border-4 flex items-center justify-center transition-all duration-300 z-10 ${isRecording ? 'border-red-500 scale-110 bg-red-950/30' : 'border-white/20 hover:border-red-400 hover:scale-105 bg-white/5'}`}
                    onClick={handleRecord}
                  >
                    <div className={`rounded-full transition-all duration-300 ${isRecording ? 'w-10 h-10 bg-red-500 rounded-md animate-pulse' : 'w-16 h-16 bg-white rounded-full'}`} />
                  </button>

                  <p className={`mt-6 font-medium tracking-wide transition-colors ${isRecording ? 'text-red-500 animate-pulse' : 'text-gray-400'}`}>
                    {isRecording ? t('video.recording').toUpperCase() : t('video.record_btn').toUpperCase()}
                  </p>
                </div>
              </div>
            </div>

            {/* Description & Submit */}
            <div className="mt-10 relative">
              <div className="relative group/input">
                <Textarea
                  placeholder={t('video.desc_placeholder')}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-gray-950/50 border-gray-800 text-white placeholder:text-gray-600 rounded-2xl p-6 min-h-[120px] text-lg focus:border-red-500/50 focus:ring-1 focus:ring-red-500/50 transition-all resize-none"
                />
                <div className="absolute top-4 right-4 p-2 bg-gray-900 rounded-lg border border-gray-800">
                  <Video className="w-5 h-5 text-gray-500" />
                </div>
              </div>

              <div className="mt-6 flex justify-end">
                <Button
                  size="lg"
                  className="px-10 py-8 bg-white hover:bg-gray-100 text-black text-lg font-bold rounded-2xl shadow-[0_0_40px_-10px_rgba(255,255,255,0.3)] hover:shadow-[0_0_60px_-10px_rgba(255,255,255,0.5)] transition-all hover:-translate-y-1 active:scale-95 group/btn"
                  onClick={handleSubmit}
                >
                  <span className="mr-2">{t('video.submit_btn')}</span>
                  <div className="bg-black text-white rounded-full p-2 group-hover/btn:rotate-45 transition-transform duration-300">
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-12 flex justify-center gap-8 text-sm text-gray-500 font-medium tracking-wide uppercase">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-green-500" />
            End-to-End Encrypted
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-blue-500" />
            Verified Authorities
          </div>
        </div>
      </div>
    </section>
  );
}

function AdminVideoReports() {
  const [reports, setReports] = useState<VideoReport[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<VideoReport | null>(null);

  useEffect(() => {
    setReports(VideoDb.getAll());
    const interval = setInterval(() => setReports(VideoDb.getAll()), 5000);
    return () => clearInterval(interval);
  }, []);

  const handleAction = (id: string) => {
    VideoDb.updateStatus(id, 'action_taken');
    setReports(VideoDb.getAll());
    toast.success('Status updated: Action Taken');
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold flex items-center gap-2">
        <Video className="text-red-600" /> Video Incident Reports
      </h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          {reports.length === 0 ? (
            <div className="text-center p-8 text-gray-500 bg-white rounded-xl">No video reports yet.</div>
          ) : (
            reports.map(report => (
              <div
                key={report.id}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${selectedVideo?.id === report.id ? 'border-primary ring-1 ring-primary' : 'border-gray-200 bg-white hover:border-primary/50'}`}
                onClick={() => setSelectedVideo(report)}
              >
                <div className="flex justify-between items-start mb-2">
                  <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${report.status === 'pending' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                    {report.status}
                  </span>
                  <span className="text-xs text-gray-500">{new Date(report.timestamp).toLocaleString()}</span>
                </div>
                <h4 className="font-bold text-sm mb-1">{report.fileName}</h4>
                <p className="text-xs text-gray-600 line-clamp-2">{report.description}</p>
                {report.location && (
                  <div className="mt-2 flex items-center gap-1 text-xs text-blue-600">
                    <MapPin className="w-3 h-3" /> {report.location}
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-100 h-fit sticky top-6">
          {selectedVideo ? (
            <div className="space-y-4">
              <h3 className="font-bold text-lg">Reviewing: {selectedVideo.fileName}</h3>
              <div className="aspect-video bg-black rounded-lg overflow-hidden relative">
                <video src={selectedVideo.videoUrl} controls className="w-full h-full" />
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm font-semibold text-gray-700">Description:</p>
                <p className="text-sm text-gray-600 mt-1">{selectedVideo.description}</p>
              </div>
              <div className="flex gap-3">
                <Button
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                  onClick={() => handleAction(selectedVideo.id)}
                  disabled={selectedVideo.status === 'action_taken'}
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  {selectedVideo.status === 'action_taken' ? 'Action Taken' : 'Mark Action Taken'}
                </Button>
                <Button variant="outline" className="flex-1" onClick={() => {
                  if (selectedVideo.location) {
                    window.open(`https://www.google.com/maps?q=${selectedVideo.location}`, '_blank');
                  }
                }}>
                  <MapPin className="w-4 h-4 mr-2" /> View Location
                </Button>
              </div>
            </div>
          ) : (
            <div className="h-64 flex flex-col items-center justify-center text-gray-400">
              <Video className="w-12 h-12 mb-2 opacity-20" />
              <p>Select a video report to review</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ... existing code ...

export default App;
