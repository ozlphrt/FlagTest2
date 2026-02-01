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
    // --- PHASE 1: THE ACADEMY ---
    {
        id: 1,
        title: "The Academy",
        subtitle: "Level 1: Tourist Class",
        tier: TIER_1_TOURIST,
        mode: 'Standard',
        timer: 'None',
        visualHint: "Relaxed pace. recognizable flags only."
    },
    {
        id: 2,
        title: "Visual Training",
        subtitle: "Level 2: No Text Hints",
        tier: TIER_1_TOURIST,
        mode: 'Visual',
        timer: 'None',
        visualHint: "Flags only. No country names."
    },
    {
        id: 3,
        title: "Expanding Horizons",
        subtitle: "Level 3: Common Flags",
        tier: TIER_2_COMMON,
        mode: 'Standard',
        timer: 'CountUp',
        visualHint: "More countries added. Timer starts."
    },
    {
        id: 4,
        title: "Silent Traveler",
        subtitle: "Level 4: Common & Visual",
        tier: TIER_2_COMMON,
        mode: 'Visual',
        timer: 'CountUp',
        visualHint: "Standard pool, no text hints."
    },

    // --- PHASE 2: THE SPEED RUN ---
    {
        id: 5,
        title: "Blitz Beginner",
        subtitle: "Level 5: Time Pressure",
        tier: TIER_2_COMMON,
        mode: 'Standard',
        timer: 'Blitz',
        blitzTimeSeconds: 180, // 3:00
        correctBonusSeconds: 5,
        wrongPenaltySeconds: 5,
        visualHint: "3 Minutes. +5s for correct, -5s for wrong."
    },
    {
        id: 6,
        title: "Tricolor Trouble",
        subtitle: "Level 6: Confusing Flags",
        tier: TIER_3_TRICKY,
        mode: 'Standard',
        timer: 'Blitz',
        blitzTimeSeconds: 210, // 3:30
        correctBonusSeconds: 4,
        wrongPenaltySeconds: 8,
        visualHint: "Warning: Similar flags ahead!"
    },
    {
        id: 7,
        title: "Blind Blitz",
        subtitle: "Level 7: Tricky & Visual",
        tier: TIER_3_TRICKY,
        mode: 'Visual',
        timer: 'Blitz',
        blitzTimeSeconds: 180, // 3:00
        correctBonusSeconds: 4,
        wrongPenaltySeconds: 10,
        visualHint: "Hard flags. No text. Good luck."
    },
    {
        id: 8,
        title: "Speed Demon",
        subtitle: "Level 8: Fast Pace",
        tier: TIER_2_COMMON,
        mode: 'Visual',
        timer: 'Blitz',
        blitzTimeSeconds: 150, // 2:30
        correctBonusSeconds: 3,
        wrongPenaltySeconds: 12,
        visualHint: "2:30 Minutes. Go fast."
    },

    // --- PHASE 3: THE GEOGRAPHER ---
    {
        id: 9,
        title: "Capital City",
        subtitle: "Level 9: Tourist Capitals",
        tier: TIER_1_TOURIST,
        mode: 'Capital',
        timer: 'CountUp',
        visualHint: "Match the CAPITAL CITY to the continent."
    },
    {
        id: 10,
        title: "Capital Blitz",
        subtitle: "Level 10: Common Capitals",
        tier: TIER_2_COMMON,
        mode: 'Capital',
        timer: 'Blitz',
        blitzTimeSeconds: 240, // 4:00
        correctBonusSeconds: 3,
        wrongPenaltySeconds: 15,
        visualHint: "4 Minutes. Capital Cities."
    },
    {
        id: 11,
        title: "Hardcore Geography",
        subtitle: "Level 11: Tricky Capitals",
        tier: TIER_3_TRICKY,
        mode: 'Capital',
        timer: 'Blitz',
        blitzTimeSeconds: 240,
        correctBonusSeconds: 3,
        wrongPenaltySeconds: 18,
        visualHint: "Match capitals of confusing flags."
    },
    {
        id: 12,
        title: "Full Roster",
        subtitle: "Level 12: UN 193",
        tier: UN193_ISO2,
        mode: 'Standard',
        timer: 'None',
        visualHint: "Every single country. Take your time."
    },

    // --- PHASE 4: THE GRANDMASTER ---
    {
        id: 13,
        title: "Shape Shifter",
        subtitle: "Level 13: Shapes (Beta)",
        tier: TIER_1_TOURIST,
        mode: 'Shape', // Fallback to Visual if no assets
        timer: 'CountUp',
        visualHint: "Identify countries by SHAPE."
    },
    {
        id: 14,
        title: "Shape Blitz",
        subtitle: "Level 14: Shapes Fast",
        tier: TIER_2_COMMON,
        mode: 'Shape',
        timer: 'Blitz',
        blitzTimeSeconds: 300,
        correctBonusSeconds: 2,
        wrongPenaltySeconds: 20,
        visualHint: "5 Minutes. Shapes."
    },
    {
        id: 15,
        title: "Master Visual",
        subtitle: "Level 15: All Visual Blitz",
        tier: UN193_ISO2,
        mode: 'Visual',
        timer: 'Blitz',
        blitzTimeSeconds: 180,
        correctBonusSeconds: 2,
        wrongPenaltySeconds: 20,
        visualHint: "193 Countries. No Text. 3 Minutes."
    },
    {
        id: 16,
        title: "Ultimate Geography",
        subtitle: "Level 16: All Capitals Blitz",
        tier: UN193_ISO2,
        mode: 'Capital',
        timer: 'Blitz',
        blitzTimeSeconds: 180,
        correctBonusSeconds: 2,
        wrongPenaltySeconds: 20,
        visualHint: "The final test."
    }
];
