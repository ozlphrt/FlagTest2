import { UN193_ISO2 } from './un193';

// -----------------------------------------------------------------------------
// Difficulty Tiers (Content Pools)
// -----------------------------------------------------------------------------
const TIER_1_TOURIST = [
    'us', 'gb', 'ca', 'au', 'nz', 'ie', // Anglosphere
    'fr', 'de', 'it', 'es', 'pt', 'nl', 'be', 'ch', 'at', 'se', 'no', 'dk', 'fi', // W. Europe
    'jp', 'cn', 'kr', 'in', // Major Asia
    'br', 'ar', 'mx', // Major LatAm
    'za', 'eg', 'ng', 'ke', // Major Africa
    'ru', 'tr', 'gr', 'il', 'sa', 'ae' // Others
];

const TIER_2_COMMON = [
    ...TIER_1_TOURIST,
    'pl', 'cz', 'hu', 'ro', 'ua', // E. Europe
    'th', 'vn', 'id', 'my', 'sg', 'ph', // SE Asia
    'cl', 'co', 'pe', 've', // S. America
    'ma', 'dz', 'gh', 'ci', 'sn', // Africa
    'pk', 'bd', 'lk', 'np', // S. Asia
    'ir', 'iq', 'jo', 'lb', // Middle East
    'jm', 'cu', 'do' // Caribbean
];

const TIER_3_TRICKY = [
    // Tricolors and confusing pairs
    'td', 'ro', // Chad / Romania
    'id', 'mc', 'pl', // Indonesia / Monaco / Poland (upside down)
    'ml', 'gn', // Mali / Guinea
    'ie', 'ci', // Ireland / Ivory Coast
    'nl', 'lu', // Netherlands / Luxembourg
    'si', 'sk', 'ru', // Slovenia / Slovakia / Russia
    'co', 'ec', 've', // Colombia / Ecuador / Venezuela
    'nz', 'au', // NZ / Aus
    'no', 'is', // Norway / Iceland
    'jo', 'ps', 'kw', 'ae' // Pan-Arab colors
];

// -----------------------------------------------------------------------------
// Level Configuration
// -----------------------------------------------------------------------------
export type GameMode = 'Standard' | 'Visual' | 'Capital' | 'Shape';
export type TimerMode = 'None' | 'CountUp' | 'Blitz';

export interface LevelConfig {
    id: number;
    title: string;
    subtitle: string;
    tier: string[]; // The pool of ISO codes to use
    mode: GameMode;
    timer: TimerMode;
    blitzTimeSeconds?: number;
    correctBonusSeconds?: number;
    wrongPenaltySeconds?: number;
    visualHint?: string; // Description for the modal
}

export const LEVELS: LevelConfig[] = [
    // --- PHASE 1: VISUAL RECOGNITION (Lvl 1-3) ---
    {
        id: 1,
        title: "The Academy",
        subtitle: "Level 1: Tourist Class",
        tier: TIER_1_TOURIST,
        mode: 'Visual',
        timer: 'None',
        visualHint: "Relaxed pace. Recognizable flags only."
    },
    {
        id: 2,
        title: "Expanding Horizons",
        subtitle: "Level 2: Common Flags",
        tier: TIER_2_COMMON,
        mode: 'Visual',
        timer: 'CountUp',
        visualHint: "More countries added. Timer starts."
    },
    {
        id: 3,
        title: "Tricky Pairs",
        subtitle: "Level 3: Confusing Flags",
        tier: TIER_3_TRICKY,
        mode: 'Visual',
        timer: 'CountUp',
        visualHint: "Warning: Similar flags ahead!"
    },

    // --- PHASE 2: SPEED RUN (Lvl 4-6) ---
    {
        id: 4,
        title: "Blitz Beginner",
        subtitle: "Level 4: Time Pressure",
        tier: TIER_2_COMMON,
        mode: 'Visual',
        timer: 'Blitz',
        blitzTimeSeconds: 180, // 3:00
        correctBonusSeconds: 5,
        wrongPenaltySeconds: 5,
        visualHint: "3 Minutes. +5s Correct / -5s Wrong."
    },
    {
        id: 5,
        title: "Tricolor Trouble",
        subtitle: "Level 5: Confusing Blitz",
        tier: TIER_3_TRICKY,
        mode: 'Visual',
        timer: 'Blitz',
        blitzTimeSeconds: 210, // 3:30
        correctBonusSeconds: 4,
        wrongPenaltySeconds: 8,
        visualHint: "Tricky flags under pressure."
    },
    {
        id: 6,
        title: "Speed Demon",
        subtitle: "Level 6: Fast Pace",
        tier: TIER_2_COMMON,
        mode: 'Visual',
        timer: 'Blitz',
        blitzTimeSeconds: 150, // 2:30
        correctBonusSeconds: 3,
        wrongPenaltySeconds: 10,
        visualHint: "2:30 Minutes. Go fast."
    },

    // --- PHASE 3: CAPITAL CITIES (Lvl 7-9) ---
    {
        id: 7,
        title: "Capital City",
        subtitle: "Level 7: Tourist Capitals",
        tier: TIER_1_TOURIST,
        mode: 'Capital',
        timer: 'CountUp',
        visualHint: "Match Capital City to Continent."
    },
    {
        id: 8,
        title: "Capital Blitz",
        subtitle: "Level 8: Common Capitals",
        tier: TIER_2_COMMON,
        mode: 'Capital',
        timer: 'Blitz',
        blitzTimeSeconds: 240, // 4:00
        correctBonusSeconds: 3,
        wrongPenaltySeconds: 15,
        visualHint: "4 Minutes. Capital Cities."
    },
    {
        id: 9,
        title: "Hardcore Geography",
        subtitle: "Level 9: Tricky Capitals",
        tier: TIER_3_TRICKY,
        mode: 'Capital',
        timer: 'Blitz',
        blitzTimeSeconds: 240, // 4:00
        correctBonusSeconds: 3,
        wrongPenaltySeconds: 18,
        visualHint: "Match capitals of confusing flags."
    },

    // --- PHASE 4: GRANDMASTER (Lvl 10-12) ---
    {
        id: 10,
        title: "Shape Shifter",
        subtitle: "Level 10: Country Shapes",
        tier: TIER_1_TOURIST,
        mode: 'Shape', // Fallback to Visual if no assets
        timer: 'CountUp',
        visualHint: "Identify countries by SHAPE."
    },
    {
        id: 11,
        title: "Full Roster",
        subtitle: "Level 11: UN 193 (Zen)",
        tier: UN193_ISO2,
        mode: 'Visual',
        timer: 'None',
        visualHint: "Every single country. No timer pressure."
    },
    {
        id: 12,
        title: "Ultimate Geography",
        subtitle: "Level 12: UN 193 Blitz",
        tier: UN193_ISO2,
        mode: 'Capital',
        timer: 'Blitz',
        blitzTimeSeconds: 180, // 3:00
        correctBonusSeconds: 2,
        wrongPenaltySeconds: 20,
        visualHint: "The Final Test. All 193 Capitals."
    }
];
