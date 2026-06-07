// ==================== AI RISK DETECTION ENGINE ====================
// Analyzes location + time to compute a real-time safety risk score.

export type RiskLevel = 'safe' | 'caution' | 'danger';

export interface RiskResult {
    level: RiskLevel;
    score: number; // 0–100
    reasons: string[];
    tips: string[];
}

// Simulated hotspot zones: { lat, lng, radius (km), tag, riskWeight }
const HOTSPOT_ZONES = [
    { lat: 28.6139, lng: 77.2090, radius: 0.8, tag: 'Isolated area at night', weight: 30 },
    { lat: 28.6328, lng: 77.2197, radius: 0.5, tag: 'Low-light zone reported', weight: 25 },
    { lat: 28.5355, lng: 77.3910, radius: 1.0, tag: 'Previously reported incidents', weight: 35 },
    { lat: 19.0760, lng: 72.8777, radius: 0.6, tag: 'High crowd & dark area', weight: 20 },
    { lat: 12.9716, lng: 77.5946, radius: 0.7, tag: 'Late night risk zone', weight: 28 },
    { lat: 22.5726, lng: 88.3639, radius: 0.9, tag: 'Reported unsafe at night', weight: 32 },
    { lat: 17.3850, lng: 78.4867, radius: 0.6, tag: 'Isolated road zone', weight: 22 },
    { lat: 13.0827, lng: 80.2707, radius: 0.8, tag: 'Minimal lighting area', weight: 27 },
];

// Haversine distance between two lat/lng points in km
function getDistanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

// Time-based risk contribution
function getTimeRisk(hour: number): { score: number; reason: string | null } {
    if (hour >= 22 || hour < 5) {
        return { score: 40, reason: 'Late night hours (10 PM – 5 AM) — highest risk period' };
    } else if (hour >= 20 || hour < 7) {
        return { score: 20, reason: 'Evening/early morning hours — elevated risk' };
    } else if (hour >= 18) {
        return { score: 10, reason: 'Dusk hours — slightly elevated risk' };
    }
    return { score: 0, reason: null };
}

// Location-based risk contribution
function getLocationRisk(lat: number, lng: number): { score: number; reasons: string[] } {
    let totalScore = 0;
    const reasons: string[] = [];

    for (const zone of HOTSPOT_ZONES) {
        const dist = getDistanceKm(lat, lng, zone.lat, zone.lng);
        if (dist <= zone.radius) {
            // Closer = higher risk
            const proximityFactor = 1 - dist / zone.radius;
            totalScore += zone.weight * proximityFactor;
            reasons.push(zone.tag);
        }
    }

    return { score: Math.min(totalScore, 60), reasons };
}

// Main risk scoring function
export function getRiskScore(lat: number, lng: number, hour?: number): RiskResult {
    const currentHour = hour ?? new Date().getHours();

    const timeRisk = getTimeRisk(currentHour);
    const locationRisk = getLocationRisk(lat, lng);

    const totalScore = Math.min(Math.round(timeRisk.score + locationRisk.score), 100);

    const reasons: string[] = [];
    if (timeRisk.reason) reasons.push(timeRisk.reason);
    reasons.push(...locationRisk.reasons);

    let level: RiskLevel;
    if (totalScore >= 50) {
        level = 'danger';
    } else if (totalScore >= 20) {
        level = 'caution';
    } else {
        level = 'safe';
    }

    const tips: string[] = [];
    if (level === 'danger') {
        tips.push('Share your live location with a trusted contact');
        tips.push('Avoid isolated routes — use well-lit streets');
        tips.push('Keep emergency contact on speed dial');
        tips.push('Use the SOS button if you feel unsafe');
    } else if (level === 'caution') {
        tips.push('Stay on busy, well-lit streets');
        tips.push('Keep your phone fully charged');
        tips.push('Let someone know your route');
    } else {
        tips.push('Stay aware of your surroundings');
        tips.push('Trust your instincts — move to a safe area if needed');
    }

    return { level, score: totalScore, reasons, tips };
}

// Generic risk result when location is unavailable
export function getTimeOnlyRisk(): RiskResult {
    const hour = new Date().getHours();
    const timeRisk = getTimeRisk(hour);

    let level: RiskLevel = 'safe';
    if (timeRisk.score >= 40) level = 'danger';
    else if (timeRisk.score >= 20) level = 'caution';

    return {
        level,
        score: timeRisk.score,
        reasons: timeRisk.reason ? [timeRisk.reason] : ['No location data available'],
        tips: ['Enable location access for accurate risk detection'],
    };
}

// ==================== SAFETY SCORE / AREA RATING ====================

export type LetterGrade = 'A+' | 'A' | 'B' | 'C' | 'D' | 'F';

export interface AreaRating {
    safetyScore: number;   // 0–100 (higher = safer)
    grade: LetterGrade;
    stars: number;         // 1–5
    label: string;         // e.g. "Very Safe", "Moderate Risk"
    color: string;         // tailwind text color class
    bgColor: string;       // tailwind bg color class
    areaName: string;
}

export interface NearbyArea {
    name: string;
    lat: number;
    lng: number;
    rating: AreaRating;
}

// Named areas for display (major Indian cities/zones)
const NAMED_AREAS = [
    { name: 'Connaught Place, Delhi', lat: 28.6315, lng: 77.2167 },
    { name: 'Lajpat Nagar, Delhi', lat: 28.5672, lng: 77.2431 },
    { name: 'Dwarka, Delhi', lat: 28.5921, lng: 77.0460 },
    { name: 'Rohini, Delhi', lat: 28.7323, lng: 77.1198 },
    { name: 'Saket, Delhi', lat: 28.5244, lng: 77.2067 },
    { name: 'Andheri, Mumbai', lat: 19.1136, lng: 72.8697 },
    { name: 'Bandra, Mumbai', lat: 19.0596, lng: 72.8295 },
    { name: 'Powai, Mumbai', lat: 19.1197, lng: 72.9050 },
    { name: 'Koregaon Park, Pune', lat: 18.5362, lng: 73.8939 },
    { name: 'Indiranagar, Bengaluru', lat: 12.9784, lng: 77.6408 },
    { name: 'Whitefield, Bengaluru', lat: 12.9698, lng: 77.7500 },
    { name: 'Koramangala, Bengaluru', lat: 12.9352, lng: 77.6245 },
    { name: 'Salt Lake, Kolkata', lat: 22.5831, lng: 88.4111 },
    { name: 'Park Street, Kolkata', lat: 22.5531, lng: 88.3533 },
    { name: 'Banjara Hills, Hyderabad', lat: 17.4266, lng: 78.4448 },
    { name: 'Gachibowli, Hyderabad', lat: 17.4401, lng: 78.3489 },
    { name: 'Anna Nagar, Chennai', lat: 13.0846, lng: 80.2101 },
    { name: 'T. Nagar, Chennai', lat: 13.0358, lng: 80.2336 },
];

// Convert risk score (0–100 = most risky) to safety score (0–100 = most safe)
function riskToSafety(riskScore: number): number {
    return Math.max(0, 100 - riskScore);
}

function getGrade(safetyScore: number): LetterGrade {
    if (safetyScore >= 90) return 'A+';
    if (safetyScore >= 75) return 'A';
    if (safetyScore >= 60) return 'B';
    if (safetyScore >= 45) return 'C';
    if (safetyScore >= 30) return 'D';
    return 'F';
}

function getStars(safetyScore: number): number {
    return Math.max(1, Math.round(safetyScore / 20));
}

function getLabel(grade: LetterGrade): string {
    const labels: Record<LetterGrade, string> = {
        'A+': 'Very Safe',
        'A': 'Safe',
        'B': 'Mostly Safe',
        'C': 'Moderate Risk',
        'D': 'Elevated Risk',
        'F': 'High Risk',
    };
    return labels[grade];
}

function getGradeColors(grade: LetterGrade): { color: string; bgColor: string } {
    const map: Record<LetterGrade, { color: string; bgColor: string }> = {
        'A+': { color: 'text-emerald-600', bgColor: 'bg-emerald-500' },
        'A': { color: 'text-green-600', bgColor: 'bg-green-500' },
        'B': { color: 'text-lime-600', bgColor: 'bg-lime-500' },
        'C': { color: 'text-amber-600', bgColor: 'bg-amber-500' },
        'D': { color: 'text-orange-600', bgColor: 'bg-orange-500' },
        'F': { color: 'text-red-600', bgColor: 'bg-red-500' },
    };
    return map[grade];
}

function buildAreaRating(lat: number, lng: number, areaName: string): AreaRating {
    const risk = getRiskScore(lat, lng);
    const safetyScore = riskToSafety(risk.score);
    const grade = getGrade(safetyScore);
    const stars = getStars(safetyScore);
    const label = getLabel(grade);
    const { color, bgColor } = getGradeColors(grade);
    return { safetyScore, grade, stars, label, color, bgColor, areaName };
}

// Get rating for user's current location
export function getAreaRating(lat: number, lng: number): AreaRating {
    // Find nearest named area for display name
    let nearestName = 'Current Location';
    let nearestDist = Infinity;
    for (const area of NAMED_AREAS) {
        const d = getDistanceKm(lat, lng, area.lat, area.lng);
        if (d < nearestDist) {
            nearestDist = d;
            nearestName = nearestDist < 3 ? area.name : 'Current Location';
        }
    }
    return buildAreaRating(lat, lng, nearestName);
}

// Get ratings for nearby named areas (closest 5)
export function getNearbyAreaRatings(lat: number, lng: number): NearbyArea[] {
    return NAMED_AREAS
        .map(area => ({
            ...area,
            dist: getDistanceKm(lat, lng, area.lat, area.lng),
        }))
        .sort((a, b) => a.dist - b.dist)
        .slice(0, 5)
        .map(area => ({
            name: area.name,
            lat: area.lat,
            lng: area.lng,
            rating: buildAreaRating(area.lat, area.lng, area.name),
        }));
}

// Fallback: time-only area rating (when no location)
export function getTimeOnlyAreaRating(): AreaRating {
    const timeResult = getTimeOnlyRisk();
    const safetyScore = riskToSafety(timeResult.score);
    const grade = getGrade(safetyScore);
    return {
        safetyScore,
        grade,
        stars: getStars(safetyScore),
        label: getLabel(grade),
        ...getGradeColors(grade),
        areaName: 'Your Area',
    };
}
