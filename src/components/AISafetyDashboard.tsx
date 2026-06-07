import { useState, useEffect, useCallback } from 'react';
import {
    getRiskScore, getTimeOnlyRisk,
    getAreaRating, getNearbyAreaRatings, getTimeOnlyAreaRating,
    type RiskResult, type AreaRating, type NearbyArea
} from '@/lib/riskEngine';
import {
    ShieldCheck, ShieldAlert, ShieldX,
    MapPin, RefreshCw, Star, Lightbulb,
    Clock, AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';

// ==================== COMBINED DATA HOOK ====================
function useAISafety() {
    const [risk, setRisk] = useState<RiskResult | null>(null);
    const [rating, setRating] = useState<AreaRating | null>(null);
    const [nearby, setNearby] = useState<NearbyArea[]>([]);
    const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
    const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
    const [loading, setLoading] = useState(true);
    const [prevLevel, setPrevLevel] = useState<string | null>(null);

    const evaluate = useCallback(() => {
        setLoading(true);
        if (!navigator.geolocation) {
            setRisk(getTimeOnlyRisk());
            setRating(getTimeOnlyAreaRating());
            setNearby([]);
            setLoading(false);
            setUpdatedAt(new Date());
            return;
        }
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const { latitude: lat, longitude: lng } = pos.coords;
                setLocation({ lat, lng });
                setRisk(getRiskScore(lat, lng));
                setRating(getAreaRating(lat, lng));
                setNearby(getNearbyAreaRatings(lat, lng));
                setLoading(false);
                setUpdatedAt(new Date());
            },
            () => {
                setRisk(getTimeOnlyRisk());
                setRating(getTimeOnlyAreaRating());
                setNearby([]);
                setLoading(false);
                setUpdatedAt(new Date());
            },
            { timeout: 8000, maximumAge: 60000 }
        );
    }, []);

    useEffect(() => { evaluate(); const t = setInterval(evaluate, 60000); return () => clearInterval(t); }, [evaluate]);

    // Auto-warn on escalation
    useEffect(() => {
        if (!risk) return;
        const { level } = risk;
        if (prevLevel && level !== prevLevel) {
            if (level === 'danger') toast.error('⚠️ Danger Zone Detected!', { description: risk.reasons[0], duration: 8000 });
            else if (level === 'caution' && prevLevel === 'safe') toast.warning('⚠️ Caution Area — stay on well-lit streets', { duration: 5000 });
            else if (level === 'safe') toast.success('✅ You are now in a safer area', { duration: 4000 });
        }
        setPrevLevel(level);
    }, [risk?.level]);

    return { risk, rating, nearby, location, updatedAt, loading, refresh: evaluate };
}

// ==================== SVG ARC GAUGE ====================
function ScoreGauge({ score, strokeColor }: { score: number; strokeColor: string }) {
    const r = 54, cx = 72, cy = 72;
    const circ = Math.PI * r;
    const offset = circ * (1 - score / 100);
    return (
        <svg width="144" height="84" viewBox="0 0 144 84" className="overflow-visible">
            <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`} fill="none" stroke="#e5e7eb" strokeWidth="10" strokeLinecap="round" />
            <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`} fill="none" stroke={strokeColor} strokeWidth="10" strokeLinecap="round"
                strokeDasharray={circ} strokeDashoffset={offset} style={{ transition: 'stroke-dashoffset 1.2s ease, stroke 0.6s ease' }} />
        </svg>
    );
}

// ==================== STAR ROW ====================
function StarRow({ stars, hex }: { stars: number; hex: string }) {
    return (
        <div className="flex gap-0.5">
            {[1, 2, 3, 4, 5].map(i => (
                <Star key={i} className="w-3.5 h-3.5" fill={i <= stars ? hex : 'none'} stroke={i <= stars ? hex : '#d1d5db'} />
            ))}
        </div>
    );
}

// Tailwind bg → hex (needed for SVG stroke)
const BG_TO_HEX: Record<string, string> = {
    'bg-emerald-500': '#10b981', 'bg-green-500': '#22c55e',
    'bg-lime-500': '#84cc16', 'bg-amber-500': '#f59e0b',
    'bg-orange-500': '#f97316', 'bg-red-500': '#ef4444',
};
const RISK_HEX: Record<string, string> = {
    safe: '#10b981', caution: '#f59e0b', danger: '#ef4444',
};
const RISK_CONFIG = {
    safe: { Icon: ShieldCheck, label: 'Safe Zone', gradient: 'from-emerald-500 to-green-600', ring: 'ring-emerald-400/40', banner: 'from-emerald-500/10 to-green-400/5' },
    caution: { Icon: ShieldAlert, label: 'Caution', gradient: 'from-amber-400 to-orange-500', ring: 'ring-amber-400/40', banner: 'from-amber-400/10 to-orange-300/5' },
    danger: { Icon: ShieldX, label: 'Danger Zone', gradient: 'from-red-500 to-rose-600', ring: 'ring-red-400/40', banner: 'from-red-500/10 to-rose-400/5' },
};

// ==================== NEARBY AREA MINI CARD ====================
function NearbyCard({ area }: { area: NearbyArea }) {
    const hex = BG_TO_HEX[area.rating.bgColor] ?? '#6366f1';
    return (
        <div className="flex items-center justify-between bg-white rounded-xl px-3 py-2 border border-gray-100 hover:border-gray-200 hover:shadow-sm transition-all">
            <div className="flex items-center gap-1.5 min-w-0">
                <MapPin className="w-3 h-3 text-gray-400 flex-shrink-0" />
                <span className="text-xs text-gray-600 truncate">{area.rating.areaName}</span>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                <StarRow stars={area.rating.stars} hex={hex} />
                <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded-md text-white ${area.rating.bgColor}`}>{area.rating.grade}</span>
                <span className="text-[10px] text-gray-400 w-6 text-right">{area.rating.safetyScore}</span>
            </div>
        </div>
    );
}

// ==================== FLOATING PILL (scroll-to anchor) ====================
export function RiskPill() {
    const { risk, rating } = useAISafety();
    if (!risk || !rating) return null;
    const cfg = RISK_CONFIG[risk.level];
    const Icon = cfg.Icon;
    return (
        <button
            onClick={() => document.getElementById('ai-safety-section')?.scrollIntoView({ behavior: 'smooth', block: 'center' })}
            className={`flex items-center gap-2 bg-gradient-to-r ${cfg.gradient} text-white px-3 py-2 rounded-2xl shadow-lg ring-2 ${cfg.ring} hover:scale-105 active:scale-95 transition-transform relative`}
        >
            {risk.level !== 'safe' && <span className={`absolute inset-0 rounded-2xl bg-gradient-to-r ${cfg.gradient} animate-ping opacity-25`} />}
            <Icon className="w-4 h-4 relative z-10" />
            <div className="relative z-10 text-left">
                <p className="text-xs font-bold leading-none">{cfg.label}</p>
                <p className="text-[10px] opacity-80">Score {rating.safetyScore}/100</p>
            </div>
        </button>
    );
}

// ==================== MAIN UNIFIED DASHBOARD ====================
export function AISafetyDashboard() {
    const { risk, rating, nearby, location, updatedAt, loading, refresh } = useAISafety();
    const [tab, setTab] = useState<'overview' | 'factors' | 'nearby'>('overview');

    if (loading) {
        return (
            <section className="py-12 px-4">
                <div className="max-w-3xl mx-auto animate-pulse space-y-3">
                    <div className="h-8 bg-gray-100 rounded-xl w-1/3 mx-auto" />
                    <div className="h-64 bg-gray-100 rounded-3xl" />
                </div>
            </section>
        );
    }

    if (!risk || !rating) return null;

    const cfg = RISK_CONFIG[risk.level];
    const Icon = cfg.Icon;
    const scoreHex = BG_TO_HEX[rating.bgColor] ?? '#6366f1';
    const riskHex = RISK_HEX[risk.level];

    return (
        <section id="ai-safety-section" className={`py-10 md:py-16 px-4 bg-gradient-to-br ${cfg.banner} transition-all duration-700`}>
            <div className="max-w-3xl mx-auto">

                {/* Section heading */}
                <div className="text-center mb-7">
                    <div className={`inline-flex items-center gap-2 bg-gradient-to-r ${cfg.gradient} text-white px-3 py-1 rounded-full text-xs font-semibold mb-3 shadow-md`}>
                        <Icon className="w-3.5 h-3.5" /> AI Safety Intelligence
                    </div>
                    <h2 className="text-2xl md:text-3xl font-black text-gray-900">Area Safety Dashboard</h2>
                    <p className="text-gray-500 text-sm mt-1">Real-time risk analysis · Updated every 60 seconds</p>
                </div>

                {/* Main unified card */}
                <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden mb-4">
                    {/* Top gradient strip */}
                    <div className={`h-1.5 bg-gradient-to-r ${cfg.gradient} transition-all duration-700`} />

                    {/* Header bar */}
                    <div className="flex items-center justify-between px-5 pt-4 pb-2">
                        <div className="flex items-center gap-2">
                            <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${cfg.gradient} flex items-center justify-center shadow`}>
                                <Icon className="w-4 h-4 text-white" />
                            </div>
                            <div>
                                <p className="text-sm font-bold text-gray-800">{rating.areaName}</p>
                                {location && <p className="text-[10px] text-gray-400 flex items-center gap-1"><MapPin className="w-2.5 h-2.5" />{location.lat.toFixed(4)}, {location.lng.toFixed(4)}</p>}
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            {updatedAt && <p className="text-[10px] text-gray-400 flex items-center gap-1"><Clock className="w-3 h-3" />{updatedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>}
                            <button onClick={refresh} className="w-7 h-7 rounded-full bg-gray-50 hover:bg-gray-100 flex items-center justify-center transition-colors">
                                <RefreshCw className="w-3.5 h-3.5 text-gray-500" />
                            </button>
                        </div>
                    </div>

                    {/* ── TWIN STATS ROW ── */}
                    <div className="grid grid-cols-2 gap-3 px-5 py-4">
                        {/* Safety Score */}
                        <div className="bg-gray-50 rounded-2xl p-4 flex flex-col items-center">
                            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Safety Score</p>
                            <div className="relative">
                                <ScoreGauge score={rating.safetyScore} strokeColor={scoreHex} />
                                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 -translate-y-1 text-center pointer-events-none">
                                    <p className="text-3xl font-black leading-none" style={{ color: scoreHex }}>{rating.safetyScore}</p>
                                    <p className="text-[9px] text-gray-400">/ 100</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 mt-2">
                                <span className={`text-lg font-black px-2 py-0.5 rounded-lg text-white ${rating.bgColor}`}>{rating.grade}</span>
                                <div>
                                    <p className="text-xs font-bold" style={{ color: scoreHex }}>{rating.label}</p>
                                    <StarRow stars={rating.stars} hex={scoreHex} />
                                </div>
                            </div>
                        </div>

                        {/* Risk Score */}
                        <div className="bg-gray-50 rounded-2xl p-4 flex flex-col items-center">
                            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Risk Score</p>
                            <div className="relative">
                                <ScoreGauge score={risk.score} strokeColor={riskHex} />
                                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 -translate-y-1 text-center pointer-events-none">
                                    <p className="text-3xl font-black leading-none" style={{ color: riskHex }}>{risk.score}</p>
                                    <p className="text-[9px] text-gray-400">/ 100</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 mt-2">
                                <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${cfg.gradient} flex items-center justify-center`}>
                                    <Icon className="w-4 h-4 text-white" />
                                </div>
                                <div>
                                    <p className="text-xs font-bold" style={{ color: riskHex }}>{cfg.label}</p>
                                    <p className="text-[10px] text-gray-400 capitalize">{risk.level} risk level</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Gradient score slider */}
                    <div className="px-5 pb-3">
                        <div className="flex justify-between text-[9px] text-gray-400 mb-1">
                            <span>High Risk (0)</span><span>Very Safe (100)</span>
                        </div>
                        <div className="h-3 rounded-full bg-gradient-to-r from-red-400 via-amber-400 via-lime-400 to-emerald-500 relative overflow-hidden">
                            <div className="absolute top-0 bottom-0 right-0 bg-white/50 rounded-r-full transition-all duration-700" style={{ width: `${100 - rating.safetyScore}%` }} />
                            <div className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow border-2 border-gray-300 transition-all duration-700" style={{ left: `calc(${rating.safetyScore}% - 8px)` }} />
                        </div>
                        <div className="flex justify-between text-[9px] text-gray-400 mt-1 px-0.5">
                            {(['F', 'D', 'C', 'B', 'A', 'A+'] as const).map(g => (
                                <span key={g} className={`px-1 rounded ${rating.grade === g ? `${rating.bgColor} text-white font-bold` : ''}`}>{g}</span>
                            ))}
                        </div>
                    </div>

                    {/* ── TABS ── */}
                    <div className="flex border-t border-gray-100">
                        {([['overview', 'Overview'], ['factors', 'Risk Factors'], ['nearby', 'Nearby Areas']] as const).map(([id, label]) => (
                            <button
                                key={id}
                                onClick={() => setTab(id)}
                                className={`flex-1 py-2.5 text-xs font-semibold transition-colors ${tab === id ? 'border-b-2 text-primary border-primary' : 'text-gray-400 hover:text-gray-600'}`}
                            >
                                {label} {id === 'factors' && risk.reasons.length > 0 && <span className="ml-1 bg-red-100 text-red-600 text-[9px] px-1 rounded-full">{risk.reasons.length}</span>}
                                {id === 'nearby' && nearby.length > 0 && <span className="ml-1 bg-indigo-100 text-indigo-600 text-[9px] px-1 rounded-full">{nearby.length}</span>}
                            </button>
                        ))}
                    </div>

                    {/* Tab content */}
                    <div className="px-5 py-4 min-h-[140px]">
                        {/* Overview */}
                        {tab === 'overview' && (
                            <div className="space-y-2">
                                <div className="flex items-start gap-3 bg-gray-50 rounded-xl p-3">
                                    <Lightbulb className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                                    <div>
                                        <p className="text-xs font-bold text-gray-700 mb-1">Safety Tips</p>
                                        <ul className="space-y-1">
                                            {risk.tips.map((tip, i) => (
                                                <li key={i} className="flex items-start gap-2 text-xs text-gray-600">
                                                    <span className="mt-1 w-1.5 h-1.5 rounded-full bg-green-500 flex-shrink-0" />
                                                    {tip}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Risk Factors */}
                        {tab === 'factors' && (
                            <div className="space-y-2">
                                {risk.reasons.length === 0 ? (
                                    <div className="flex items-center gap-2 text-sm text-gray-400 py-4 justify-center">
                                        <ShieldCheck className="w-5 h-5 text-emerald-400" /> No active risk factors detected
                                    </div>
                                ) : (
                                    risk.reasons.map((r, i) => (
                                        <div key={i} className="flex items-start gap-2 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
                                            <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                                            <span className="text-xs text-red-700">{r}</span>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}

                        {/* Nearby Areas */}
                        {tab === 'nearby' && (
                            <div className="space-y-2">
                                {nearby.length === 0 ? (
                                    <div className="text-xs text-gray-400 text-center py-4">Enable location access to see nearby area ratings</div>
                                ) : (
                                    nearby.map(area => <NearbyCard key={area.name} area={area} />)
                                )}
                            </div>
                        )}
                    </div>

                    <div className="px-5 pb-4 text-[10px] text-gray-400 text-center">
                        Scores computed using time, location & incident data · Not a substitute for personal vigilance
                    </div>
                </div>
            </div>
        </section>
    );
}
