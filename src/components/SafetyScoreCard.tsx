import { useState, useEffect, useCallback } from 'react';
import {
    getAreaRating, getNearbyAreaRatings, getTimeOnlyAreaRating,
    type AreaRating, type NearbyArea
} from '@/lib/riskEngine';
import { Star, MapPin, RefreshCw, ShieldCheck, Info } from 'lucide-react';

// ==================== SAFETY SCORE HOOK ====================
function useSafetyScore() {
    const [rating, setRating] = useState<AreaRating | null>(null);
    const [nearby, setNearby] = useState<NearbyArea[]>([]);
    const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
    const [loading, setLoading] = useState(true);

    const evaluate = useCallback(() => {
        setLoading(true);
        if (!navigator.geolocation) {
            setRating(getTimeOnlyAreaRating());
            setNearby([]);
            setLoading(false);
            setLastUpdated(new Date());
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const lat = pos.coords.latitude;
                const lng = pos.coords.longitude;
                setLocation({ lat, lng });
                setRating(getAreaRating(lat, lng));
                setNearby(getNearbyAreaRatings(lat, lng));
                setLoading(false);
                setLastUpdated(new Date());
            },
            () => {
                setRating(getTimeOnlyAreaRating());
                setNearby([]);
                setLoading(false);
                setLastUpdated(new Date());
            },
            { timeout: 8000, maximumAge: 60000 }
        );
    }, []);

    useEffect(() => {
        evaluate();
        const interval = setInterval(evaluate, 60000);
        return () => clearInterval(interval);
    }, [evaluate]);

    return { rating, nearby, location, lastUpdated, loading, refresh: evaluate };
}

// ==================== SCORE GAUGE (SVG Arc) ====================
function ScoreGauge({ score, color }: { score: number; color: string }) {
    const radius = 60;
    const strokeWidth = 10;
    const cx = 80;
    const cy = 80;
    const circumference = Math.PI * radius; // half-circle
    const offset = circumference * (1 - score / 100);

    // Map color class string to actual stroke color
    const strokeMap: Record<string, string> = {
        'bg-emerald-500': '#10b981',
        'bg-green-500': '#22c55e',
        'bg-lime-500': '#84cc16',
        'bg-amber-500': '#f59e0b',
        'bg-orange-500': '#f97316',
        'bg-red-500': '#ef4444',
    };
    const stroke = strokeMap[color] ?? '#6366f1';

    return (
        <svg width="160" height="95" viewBox="0 0 160 95" className="overflow-visible">
            {/* Track */}
            <path
                d={`M ${cx - radius} ${cy} A ${radius} ${radius} 0 0 1 ${cx + radius} ${cy}`}
                fill="none"
                stroke="#e5e7eb"
                strokeWidth={strokeWidth}
                strokeLinecap="round"
            />
            {/* Progress Arc */}
            <path
                d={`M ${cx - radius} ${cy} A ${radius} ${radius} 0 0 1 ${cx + radius} ${cy}`}
                fill="none"
                stroke={stroke}
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={offset}
                style={{ transition: 'stroke-dashoffset 1s ease-in-out, stroke 0.5s ease' }}
            />
            {/* Labels */}
            <text x={cx - radius - 4} y={cy + 18} fontSize="10" fill="#9ca3af" textAnchor="middle">0</text>
            <text x={cx + radius + 4} y={cy + 18} fontSize="10" fill="#9ca3af" textAnchor="middle">100</text>
        </svg>
    );
}

// ==================== STAR DISPLAY ====================
function StarRow({ stars, color }: { stars: number; color: string }) {
    const textColor = color.replace('bg-', 'text-');
    return (
        <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((i) => (
                <Star key={i} className={`w-4 h-4 ${i <= stars ? textColor : 'text-gray-200'}`} fill={i <= stars ? 'currentColor' : 'none'} />
            ))}
        </div>
    );
}

// ==================== NEARBY AREA CARD ====================
function NearbyCard({ area }: { area: NearbyArea }) {
    const { rating } = area;
    return (
        <div className="flex items-center justify-between bg-white/70 backdrop-blur-sm rounded-xl px-3 py-2.5 border border-gray-100 hover:border-gray-300 transition-all hover:shadow-sm">
            <div className="flex items-center gap-2 min-w-0">
                <MapPin className="w-3 h-3 text-gray-400 flex-shrink-0" />
                <span className="text-xs text-gray-700 truncate font-medium">{rating.areaName}</span>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                <StarRow stars={rating.stars} color={rating.bgColor} />
                <span className={`text-xs font-bold px-1.5 py-0.5 rounded-md text-white ${rating.bgColor}`}>
                    {rating.grade}
                </span>
            </div>
        </div>
    );
}

// ==================== MAIN SAFETY SCORE CARD ====================
export function SafetyScoreCard() {
    const { rating, nearby, lastUpdated, loading, refresh } = useSafetyScore();
    const [showInfo, setShowInfo] = useState(false);

    if (loading) {
        return (
            <section className="py-12 px-4 bg-gradient-to-br from-slate-50 to-indigo-50">
                <div className="max-w-2xl mx-auto">
                    <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 animate-pulse">
                        <div className="h-6 bg-gray-200 rounded w-1/2 mx-auto mb-6" />
                        <div className="h-24 bg-gray-100 rounded-2xl mb-4" />
                        <div className="h-4 bg-gray-100 rounded w-1/3 mx-auto" />
                    </div>
                </div>
            </section>
        );
    }

    if (!rating) return null;

    return (
        <section id="safety-score" className="py-12 md:py-20 px-4 bg-gradient-to-br from-slate-50 via-white to-indigo-50/40">
            <div className="max-w-2xl mx-auto">
                {/* Section Header */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-3 py-1 rounded-full text-xs font-semibold mb-3">
                        <ShieldCheck className="w-3 h-3" /> AI Safety Score
                    </div>
                    <h2 className="text-2xl md:text-3xl font-bold text-gray-900">Area Safety Rating</h2>
                    <p className="text-gray-500 text-sm mt-1">Real-time safety score based on location & time</p>
                </div>

                {/* Main Score Card */}
                <div className="bg-white rounded-3xl shadow-lg border border-gray-100 overflow-hidden mb-4">
                    {/* Top color band */}
                    <div className={`h-2 w-full ${rating.bgColor} transition-colors duration-700`} />

                    <div className="p-6 md:p-8">
                        {/* Area Name + Refresh */}
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <MapPin className="w-4 h-4 text-primary" />
                                <span className="text-sm font-semibold text-gray-700">{rating.areaName}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                {lastUpdated && (
                                    <span className="text-[10px] text-gray-400">
                                        {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                )}
                                <button
                                    onClick={refresh}
                                    className="w-7 h-7 rounded-full bg-gray-50 hover:bg-gray-100 flex items-center justify-center transition-colors"
                                >
                                    <RefreshCw className="w-3.5 h-3.5 text-gray-500" />
                                </button>
                                <button
                                    onClick={() => setShowInfo(!showInfo)}
                                    className="w-7 h-7 rounded-full bg-gray-50 hover:bg-gray-100 flex items-center justify-center transition-colors"
                                >
                                    <Info className="w-3.5 h-3.5 text-gray-500" />
                                </button>
                            </div>
                        </div>

                        {/* Gauge + Score */}
                        <div className="flex flex-col items-center mb-4">
                            <div className="relative">
                                <ScoreGauge score={rating.safetyScore} color={rating.bgColor} />
                                {/* Score number in center */}
                                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 -translate-y-1 text-center">
                                    <p className={`text-4xl font-black leading-none ${rating.color} transition-colors duration-700`}>
                                        {rating.safetyScore}
                                    </p>
                                    <p className="text-[10px] text-gray-400 mt-0.5">out of 100</p>
                                </div>
                            </div>

                            {/* Grade Badge */}
                            <div className="flex items-center gap-3 mt-3">
                                <div className={`w-14 h-14 rounded-2xl ${rating.bgColor} flex items-center justify-center shadow-lg shadow-black/10 transition-colors duration-700`}>
                                    <span className="text-2xl font-black text-white">{rating.grade}</span>
                                </div>
                                <div>
                                    <p className={`text-xl font-bold ${rating.color}`}>{rating.label}</p>
                                    <StarRow stars={rating.stars} color={rating.bgColor} />
                                </div>
                            </div>
                        </div>

                        {/* Info tooltip */}
                        {showInfo && (
                            <div className="mb-4 bg-indigo-50 border border-indigo-100 rounded-xl p-3 text-xs text-indigo-700">
                                Safety Score is calculated using time of day and known risk zone data for your area. Higher score = safer area.
                                Updates every 60 seconds automatically.
                            </div>
                        )}

                        {/* Score Bar */}
                        <div className="mb-2">
                            <div className="flex justify-between text-[10px] text-gray-400 mb-1">
                                <span>High Risk</span>
                                <span>Very Safe</span>
                            </div>
                            <div className="h-3 bg-gradient-to-r from-red-400 via-amber-400 via-lime-400 to-emerald-500 rounded-full relative overflow-hidden">
                                <div
                                    className="absolute top-0 bottom-0 right-0 bg-gray-100/60 rounded-r-full transition-all duration-700"
                                    style={{ width: `${100 - rating.safetyScore}%` }}
                                />
                                <div
                                    className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-md border-2 border-gray-300 transition-all duration-700"
                                    style={{ left: `calc(${rating.safetyScore}% - 8px)` }}
                                />
                            </div>
                        </div>

                        {/* Grade Scale Legend */}
                        <div className="flex justify-between text-[9px] text-gray-400 mt-1">
                            {(['F', 'D', 'C', 'B', 'A', 'A+'] as const).map(g => (
                                <span key={g} className={`px-1 py-0.5 rounded ${rating.grade === g ? `${rating.bgColor} text-white font-bold` : ''}`}>{g}</span>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Nearby Areas */}
                {nearby.length > 0 && (
                    <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-5">
                        <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-primary" /> Nearby Area Ratings
                        </h3>
                        <div className="space-y-2">
                            {nearby.map((area) => (
                                <NearbyCard key={area.name} area={area} />
                            ))}
                        </div>
                    </div>
                )}

                <p className="text-center text-[10px] text-gray-400 mt-3">
                    Scores are computed using time, location & historical incident data · Not a substitute for personal vigilance
                </p>
            </div>
        </section>
    );
}
