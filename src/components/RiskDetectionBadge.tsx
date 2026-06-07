import { useState, useEffect, useCallback } from 'react';
import { getRiskScore, getTimeOnlyRisk, type RiskLevel, type RiskResult } from '@/lib/riskEngine';
import { ShieldAlert, ShieldCheck, ShieldX, ChevronUp, X, Lightbulb, MapPin } from 'lucide-react';
import { toast } from 'sonner';

// ==================== RISK DETECTION HOOK ====================
function useRiskDetection() {
    const [riskResult, setRiskResult] = useState<RiskResult | null>(null);
    const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
    const [prevLevel, setPrevLevel] = useState<RiskLevel | null>(null);

    const evaluate = useCallback((lat?: number, lng?: number) => {
        const result = lat !== undefined && lng !== undefined
            ? getRiskScore(lat, lng)
            : getTimeOnlyRisk();
        setRiskResult(result);
        return result;
    }, []);

    // Get location and evaluate
    const fetchAndEvaluate = useCallback(() => {
        if (!navigator.geolocation) {
            evaluate();
            return;
        }
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const lat = pos.coords.latitude;
                const lng = pos.coords.longitude;
                setLocation({ lat, lng });
                evaluate(lat, lng);
            },
            () => {
                // Fallback to time-only
                evaluate();
            },
            { timeout: 8000, maximumAge: 60000 }
        );
    }, [evaluate]);

    useEffect(() => {
        // Initial evaluation
        fetchAndEvaluate();

        // Poll every 60 seconds
        const interval = setInterval(fetchAndEvaluate, 60000);
        return () => clearInterval(interval);
    }, [fetchAndEvaluate]);

    // Auto-warn when risk level escalates
    useEffect(() => {
        if (!riskResult) return;
        const { level } = riskResult;

        if (prevLevel !== null && level !== prevLevel) {
            if (level === 'danger') {
                toast.error('⚠️ Danger Zone Detected!', {
                    description: riskResult.reasons[0] || 'You may be in an unsafe area. Stay alert!',
                    duration: 8000,
                });
            } else if (level === 'caution' && prevLevel === 'safe') {
                toast.warning('⚠️ Caution Area', {
                    description: 'Risk level increased. Stay on well-lit streets.',
                    duration: 5000,
                });
            } else if (level === 'safe' && (prevLevel === 'danger' || prevLevel === 'caution')) {
                toast.success('✅ You are now in a safer area', { duration: 4000 });
            }
        }

        setPrevLevel(level);
    }, [riskResult?.level]);

    return { riskResult, location };
}

// ==================== RISK BADGE CONFIG ====================
const CONFIG: Record<RiskLevel, {
    gradient: string;
    icon: typeof ShieldCheck;
    label: string;
    pulse: boolean;
    ringColor: string;
    panelBg: string;
}> = {
    safe: {
        gradient: 'from-emerald-500 to-green-600',
        icon: ShieldCheck,
        label: 'Safe Zone',
        pulse: false,
        ringColor: 'ring-emerald-400',
        panelBg: 'from-emerald-50 to-green-50 border-emerald-200',
    },
    caution: {
        gradient: 'from-amber-400 to-orange-500',
        icon: ShieldAlert,
        label: 'Caution',
        pulse: true,
        ringColor: 'ring-amber-400',
        panelBg: 'from-amber-50 to-orange-50 border-amber-200',
    },
    danger: {
        gradient: 'from-red-500 to-rose-600',
        icon: ShieldX,
        label: 'Danger!',
        pulse: true,
        ringColor: 'ring-red-400',
        panelBg: 'from-red-50 to-rose-50 border-red-200',
    },
};

// ==================== RISK DETECTION BADGE COMPONENT ====================
export function RiskDetectionBadge() {
    const { riskResult, location } = useRiskDetection();
    const [expanded, setExpanded] = useState(false);

    if (!riskResult) return null;

    const { level, score, reasons, tips } = riskResult;
    const cfg = CONFIG[level];
    const Icon = cfg.icon;

    return (
        <>
            {/* Floating Badge */}
            <div
                className={`fixed bottom-20 left-4 md:bottom-6 z-40 transition-all duration-500 ${expanded ? 'scale-0 opacity-0 pointer-events-none' : 'scale-100 opacity-100'}`}
                onClick={() => setExpanded(true)}
            >
                <div className={`relative cursor-pointer flex items-center gap-2 bg-gradient-to-r ${cfg.gradient} text-white px-3 py-2 rounded-2xl shadow-lg shadow-black/20 ${cfg.ringColor} ring-2 ring-offset-1 hover:scale-105 transition-transform active:scale-95`}>
                    {/* Pulse ring for danger/caution */}
                    {cfg.pulse && (
                        <span className={`absolute inset-0 rounded-2xl bg-gradient-to-r ${cfg.gradient} animate-ping opacity-30`} />
                    )}
                    <Icon className="w-4 h-4 relative z-10" />
                    <div className="relative z-10">
                        <p className="text-xs font-bold leading-none">{cfg.label}</p>
                        <p className="text-[10px] opacity-80">Score: {score}/100</p>
                    </div>
                    <ChevronUp className="w-3 h-3 opacity-70 relative z-10" />
                </div>
            </div>

            {/* Expanded Risk Panel */}
            <div className={`fixed bottom-0 left-0 right-0 z-50 transition-all duration-500 ${expanded ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0 pointer-events-none'}`}>
                <div className={`bg-gradient-to-b ${cfg.panelBg} border-t-2 rounded-t-3xl p-5 max-h-[80vh] overflow-y-auto shadow-2xl`}>
                    {/* Header */}
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${cfg.gradient} flex items-center justify-center shadow-md`}>
                                <Icon className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h3 className="font-display font-bold text-lg text-gray-900">AI Risk Analysis</h3>
                                <p className="text-sm text-gray-500">Real-time safety assessment</p>
                            </div>
                        </div>
                        <button
                            onClick={() => setExpanded(false)}
                            className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
                        >
                            <X className="w-4 h-4 text-gray-600" />
                        </button>
                    </div>

                    {/* Score Meter */}
                    <div className="mb-5">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-sm font-semibold text-gray-700">Risk Score</span>
                            <span className={`text-sm font-bold ${level === 'safe' ? 'text-emerald-600' : level === 'caution' ? 'text-amber-600' : 'text-red-600'}`}>
                                {score}/100 — {cfg.label}
                            </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                            <div
                                className={`h-3 rounded-full bg-gradient-to-r ${cfg.gradient} transition-all duration-700`}
                                style={{ width: `${score}%` }}
                            />
                        </div>
                    </div>

                    {/* Location */}
                    {location && (
                        <div className="flex items-center gap-2 text-xs text-gray-400 mb-4">
                            <MapPin className="w-3 h-3" />
                            <span>{location.lat.toFixed(4)}, {location.lng.toFixed(4)}</span>
                        </div>
                    )}

                    {/* Risk Factors */}
                    {reasons.length > 0 && (
                        <div className="mb-4">
                            <h4 className="text-sm font-bold text-gray-700 mb-2 flex items-center gap-1">
                                <ShieldAlert className="w-4 h-4" /> Risk Factors
                            </h4>
                            <ul className="space-y-1.5">
                                {reasons.map((r, i) => (
                                    <li key={i} className="flex items-start gap-2 text-sm text-gray-600 bg-white/60 rounded-lg px-3 py-2">
                                        <span className={`mt-0.5 w-2 h-2 rounded-full flex-shrink-0 ${level === 'danger' ? 'bg-red-500' : 'bg-amber-500'}`} />
                                        {r}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {/* Safety Tips */}
                    <div>
                        <h4 className="text-sm font-bold text-gray-700 mb-2 flex items-center gap-1">
                            <Lightbulb className="w-4 h-4 text-amber-500" /> Safety Tips
                        </h4>
                        <ul className="space-y-1.5">
                            {tips.map((tip, i) => (
                                <li key={i} className="flex items-start gap-2 text-sm text-gray-600 bg-white/60 rounded-lg px-3 py-2">
                                    <span className="mt-0.5 w-2 h-2 rounded-full bg-green-500 flex-shrink-0" />
                                    {tip}
                                </li>
                            ))}
                        </ul>
                    </div>

                    <p className="text-[10px] text-gray-400 text-center mt-4">
                        Updates every 60 seconds • Based on time & location analysis
                    </p>
                </div>
            </div>

            {/* Backdrop */}
            {expanded && (
                <div
                    className="fixed inset-0 bg-black/30 z-40 backdrop-blur-sm"
                    onClick={() => setExpanded(false)}
                />
            )}
        </>
    );
}
