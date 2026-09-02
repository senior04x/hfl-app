/**
 * PES 2013 / Pro Evolution Soccer Tactical Formation Presets
 * Contains standard XY pitch percentage coordinates (0-100), position roles, and color schemes.
 */

export type MatchFormat = '5v5' | '6v6' | '7v7' | '8v8' | '11v11';

export type PositionCategory = 'GK' | 'DEF' | 'MID' | 'ATT';

export interface FormationSlot {
    role: string; // e.g. 'GK', 'CB', 'LB', 'RB', 'CDM', 'CM', 'CAM', 'LM', 'RM', 'LW', 'RW', 'ST'
    category: PositionCategory;
    x: number; // 0 to 100 percentage
    y: number; // 0 to 100 percentage (y=90 is GK near own goal, y=15 is striker near opponent goal)
}

export interface FormationPreset {
    id: string;
    name: string;
    format: MatchFormat;
    slots: FormationSlot[];
    description?: string;
}

// PES 2013 Authentic Position Color Palette
export const PES_POSITION_THEMES: Record<PositionCategory, { bg: string; text: string; border: string; label: string }> = {
    GK: {
        bg: '#F59E0B', // Amber / Gold
        text: '#000000',
        border: '#D97706',
        label: 'GK',
    },
    DEF: {
        bg: '#2563EB', // Blue
        text: '#FFFFFF',
        border: '#1D4ED8',
        label: 'DEF',
    },
    MID: {
        bg: '#10B981', // Green
        text: '#FFFFFF',
        border: '#047857',
        label: 'MID',
    },
    ATT: {
        bg: '#EF4444', // Red
        text: '#FFFFFF',
        border: '#B91C1C',
        label: 'ATT',
    },
};

export function getPositionCategory(position?: string): PositionCategory {
    const pos = String(position || '').toUpperCase().trim();
    if (pos === 'GK' || pos.includes('DARVOZA') || pos.includes('GOAL') || pos.includes('ВРАТАР')) {
        return 'GK';
    }
    if (['CB', 'LB', 'RB', 'LWB', 'RWB', 'SW', 'DF', 'DEF'].some(p => pos === p || pos.includes('HIMOYA') || pos.includes('ЗАЩИТ'))) {
        return 'DEF';
    }
    if (['CDM', 'CM', 'CAM', 'LM', 'RM', 'MF', 'MID'].some(p => pos === p || pos.includes('YARIM') || pos.includes('ПОЛУЗАЩ'))) {
        return 'MID';
    }
    return 'ATT'; // Default to Attack / Forward
}

export function getPesPositionStyle(position?: string) {
    const cat = getPositionCategory(position);
    return PES_POSITION_THEMES[cat];
}

// ALL FORMATION PRESETS BY FORMAT
export const FORMATION_PRESETS: Record<MatchFormat, FormationPreset[]> = {
    // 8 vs 8 — Standard Amatora League Format (8 Players on Pitch: 1 GK + 7 Outfield)
    '8v8': [
        {
            id: '8v8_2-3-2',
            name: '2-3-2',
            format: '8v8',
            slots: [
                { role: 'GK', category: 'GK', x: 50, y: 88 },
                { role: 'CB', category: 'DEF', x: 30, y: 68 },
                { role: 'CB', category: 'DEF', x: 70, y: 68 },
                { role: 'LM', category: 'MID', x: 18, y: 44 },
                { role: 'CM', category: 'MID', x: 50, y: 48 },
                { role: 'RM', category: 'MID', x: 82, y: 44 },
                { role: 'ST', category: 'ATT', x: 34, y: 20 },
                { role: 'ST', category: 'ATT', x: 66, y: 20 },
            ],
            description: 'Balanslashgan hujumkor taktik sxema',
        },
        {
            id: '8v8_3-2-2',
            name: '3-2-2',
            format: '8v8',
            slots: [
                { role: 'GK', category: 'GK', x: 50, y: 88 },
                { role: 'CB', category: 'DEF', x: 22, y: 68 },
                { role: 'CB', category: 'DEF', x: 50, y: 72 },
                { role: 'CB', category: 'DEF', x: 78, y: 68 },
                { role: 'CM', category: 'MID', x: 34, y: 46 },
                { role: 'CM', category: 'MID', x: 66, y: 46 },
                { role: 'ST', category: 'ATT', x: 34, y: 20 },
                { role: 'ST', category: 'ATT', x: 66, y: 20 },
            ],
            description: 'Mustahkam mudofaa va 2 ta markaziy hujumchi',
        },
        {
            id: '8v8_2-4-1',
            name: '2-4-1',
            format: '8v8',
            slots: [
                { role: 'GK', category: 'GK', x: 50, y: 88 },
                { role: 'CB', category: 'DEF', x: 32, y: 70 },
                { role: 'CB', category: 'DEF', x: 68, y: 70 },
                { role: 'LM', category: 'MID', x: 16, y: 46 },
                { role: 'CM', category: 'MID', x: 38, y: 50 },
                { role: 'CM', category: 'MID', x: 62, y: 50 },
                { role: 'RM', category: 'MID', x: 84, y: 46 },
                { role: 'ST', category: 'ATT', x: 50, y: 20 },
            ],
            description: 'Maydon markazida to\'liq nazorat',
        },
        {
            id: '8v8_3-3-1',
            name: '3-3-1',
            format: '8v8',
            slots: [
                { role: 'GK', category: 'GK', x: 50, y: 88 },
                { role: 'CB', category: 'DEF', x: 22, y: 70 },
                { role: 'CB', category: 'DEF', x: 50, y: 74 },
                { role: 'CB', category: 'DEF', x: 78, y: 70 },
                { role: 'LM', category: 'MID', x: 20, y: 44 },
                { role: 'CM', category: 'MID', x: 50, y: 46 },
                { role: 'RM', category: 'MID', x: 80, y: 44 },
                { role: 'ST', category: 'ATT', x: 50, y: 20 },
            ],
            description: 'Qanotlar orqali tezkor qarshi hujum',
        },
        {
            id: '8v8_1-4-2',
            name: '1-4-2',
            format: '8v8',
            slots: [
                { role: 'GK', category: 'GK', x: 50, y: 88 },
                { role: 'CB', category: 'DEF', x: 50, y: 72 },
                { role: 'LM', category: 'MID', x: 16, y: 46 },
                { role: 'CM', category: 'MID', x: 38, y: 50 },
                { role: 'CM', category: 'MID', x: 62, y: 50 },
                { role: 'RM', category: 'MID', x: 84, y: 46 },
                { role: 'ST', category: 'ATT', x: 35, y: 20 },
                { role: 'ST', category: 'ATT', x: 65, y: 20 },
            ],
            description: 'Super hujumkor presser taktika',
        },
    ],

    // 7 vs 7 (1 GK + 6 Outfield)
    '7v7': [
        {
            id: '7v7_2-3-1',
            name: '2-3-1',
            format: '7v7',
            slots: [
                { role: 'GK', category: 'GK', x: 50, y: 88 },
                { role: 'CB', category: 'DEF', x: 30, y: 68 },
                { role: 'CB', category: 'DEF', x: 70, y: 68 },
                { role: 'LM', category: 'MID', x: 18, y: 44 },
                { role: 'CM', category: 'MID', x: 50, y: 46 },
                { role: 'RM', category: 'MID', x: 82, y: 44 },
                { role: 'ST', category: 'ATT', x: 50, y: 20 },
            ],
            description: '7v7 uchun klassik standart',
        },
        {
            id: '7v7_3-2-1',
            name: '3-2-1',
            format: '7v7',
            slots: [
                { role: 'GK', category: 'GK', x: 50, y: 88 },
                { role: 'CB', category: 'DEF', x: 22, y: 70 },
                { role: 'CB', category: 'DEF', x: 50, y: 74 },
                { role: 'CB', category: 'DEF', x: 78, y: 70 },
                { role: 'CM', category: 'MID', x: 34, y: 46 },
                { role: 'CM', category: 'MID', x: 66, y: 46 },
                { role: 'ST', category: 'ATT', x: 50, y: 20 },
            ],
            description: 'Mudofaa asosiy qurol',
        },
        {
            id: '7v7_2-2-2',
            name: '2-2-2',
            format: '7v7',
            slots: [
                { role: 'GK', category: 'GK', x: 50, y: 88 },
                { role: 'CB', category: 'DEF', x: 30, y: 70 },
                { role: 'CB', category: 'DEF', x: 70, y: 70 },
                { role: 'CM', category: 'MID', x: 32, y: 46 },
                { role: 'CM', category: 'MID', x: 68, y: 46 },
                { role: 'ST', category: 'ATT', x: 34, y: 20 },
                { role: 'ST', category: 'ATT', x: 66, y: 20 },
            ],
            description: 'Blits hujumlar taktikasi',
        },
    ],

    // 6 vs 6 (1 GK + 5 Outfield)
    '6v6': [
        {
            id: '6v6_2-2-1',
            name: '2-2-1',
            format: '6v6',
            slots: [
                { role: 'GK', category: 'GK', x: 50, y: 88 },
                { role: 'CB', category: 'DEF', x: 30, y: 68 },
                { role: 'CB', category: 'DEF', x: 70, y: 68 },
                { role: 'CM', category: 'MID', x: 32, y: 46 },
                { role: 'CM', category: 'MID', x: 68, y: 46 },
                { role: 'ST', category: 'ATT', x: 50, y: 20 },
            ],
        },
        {
            id: '6v6_1-3-1',
            name: '1-3-1',
            format: '6v6',
            slots: [
                { role: 'GK', category: 'GK', x: 50, y: 88 },
                { role: 'CB', category: 'DEF', x: 50, y: 70 },
                { role: 'LM', category: 'MID', x: 20, y: 46 },
                { role: 'CM', category: 'MID', x: 50, y: 46 },
                { role: 'RM', category: 'MID', x: 80, y: 46 },
                { role: 'ST', category: 'ATT', x: 50, y: 20 },
            ],
        },
    ],

    // 5 vs 5 / Futsal (1 GK + 4 Outfield)
    '5v5': [
        {
            id: '5v5_1-2-1',
            name: '1-2-1',
            format: '5v5',
            slots: [
                { role: 'GK', category: 'GK', x: 50, y: 88 },
                { role: 'CB', category: 'DEF', x: 50, y: 68 },
                { role: 'LM', category: 'MID', x: 22, y: 46 },
                { role: 'RM', category: 'MID', x: 78, y: 46 },
                { role: 'ST', category: 'ATT', x: 50, y: 22 },
            ],
            description: 'Futzal Romba (Diamond)',
        },
        {
            id: '5v5_2-2',
            name: '2-2',
            format: '5v5',
            slots: [
                { role: 'GK', category: 'GK', x: 50, y: 88 },
                { role: 'CB', category: 'DEF', x: 32, y: 66 },
                { role: 'CB', category: 'DEF', x: 68, y: 66 },
                { role: 'ST', category: 'ATT', x: 32, y: 24 },
                { role: 'ST', category: 'ATT', x: 68, y: 24 },
            ],
            description: 'Kvadrat (Box)',
        },
    ],

    // 11 vs 11 (1 GK + 10 Outfield)
    '11v11': [
        {
            id: '11v11_4-3-3',
            name: '4-3-3',
            format: '11v11',
            slots: [
                { role: 'GK', category: 'GK', x: 50, y: 90 },
                { role: 'LB', category: 'DEF', x: 15, y: 72 },
                { role: 'CB', category: 'DEF', x: 38, y: 74 },
                { role: 'CB', category: 'DEF', x: 62, y: 74 },
                { role: 'RB', category: 'DEF', x: 85, y: 72 },
                { role: 'CDM', category: 'MID', x: 50, y: 56 },
                { role: 'CM', category: 'MID', x: 32, y: 44 },
                { role: 'CM', category: 'MID', x: 68, y: 44 },
                { role: 'LW', category: 'ATT', x: 18, y: 24 },
                { role: 'ST', category: 'ATT', x: 50, y: 18 },
                { role: 'RW', category: 'ATT', x: 82, y: 24 },
            ],
            description: 'Hujumkor qanotlar va dominant yarim himoya',
        },
        {
            id: '11v11_4-4-2',
            name: '4-4-2',
            format: '11v11',
            slots: [
                { role: 'GK', category: 'GK', x: 50, y: 90 },
                { role: 'LB', category: 'DEF', x: 15, y: 72 },
                { role: 'CB', category: 'DEF', x: 38, y: 74 },
                { role: 'CB', category: 'DEF', x: 62, y: 74 },
                { role: 'RB', category: 'DEF', x: 85, y: 72 },
                { role: 'LM', category: 'MID', x: 16, y: 46 },
                { role: 'CM', category: 'MID', x: 38, y: 50 },
                { role: 'CM', category: 'MID', x: 62, y: 50 },
                { role: 'RM', category: 'MID', x: 84, y: 46 },
                { role: 'ST', category: 'ATT', x: 35, y: 20 },
                { role: 'ST', category: 'ATT', x: 65, y: 20 },
            ],
            description: 'Klassik ingliz formati',
        },
        {
            id: '11v11_4-2-3-1',
            name: '4-2-3-1',
            format: '11v11',
            slots: [
                { role: 'GK', category: 'GK', x: 50, y: 90 },
                { role: 'LB', category: 'DEF', x: 15, y: 72 },
                { role: 'CB', category: 'DEF', x: 38, y: 74 },
                { role: 'CB', category: 'DEF', x: 62, y: 74 },
                { role: 'RB', category: 'DEF', x: 85, y: 72 },
                { role: 'CDM', category: 'MID', x: 36, y: 58 },
                { role: 'CDM', category: 'MID', x: 64, y: 58 },
                { role: 'CAM', category: 'MID', x: 50, y: 38 },
                { role: 'LM', category: 'MID', x: 18, y: 36 },
                { role: 'RM', category: 'MID', x: 82, y: 36 },
                { role: 'ST', category: 'ATT', x: 50, y: 18 },
            ],
            description: 'Zamonaviy pleymeyker va tayanchlar',
        },
        {
            id: '11v11_3-5-2',
            name: '3-5-2',
            format: '11v11',
            slots: [
                { role: 'GK', category: 'GK', x: 50, y: 90 },
                { role: 'CB', category: 'DEF', x: 25, y: 74 },
                { role: 'CB', category: 'DEF', x: 50, y: 76 },
                { role: 'CB', category: 'DEF', x: 75, y: 74 },
                { role: 'LWB', category: 'MID', x: 14, y: 48 },
                { role: 'CM', category: 'MID', x: 35, y: 52 },
                { role: 'CDM', category: 'MID', x: 50, y: 60 },
                { role: 'CM', category: 'MID', x: 65, y: 52 },
                { role: 'RWB', category: 'MID', x: 86, y: 48 },
                { role: 'ST', category: 'ATT', x: 35, y: 20 },
                { role: 'ST', category: 'ATT', x: 65, y: 20 },
            ],
            description: 'Italiya uslubidagi universal nazorat',
        },
    ],
};
