/**
 * Player Card & FIFA Stats Utilities for Amatora App
 * Computes realistic EA FC / FIFA style stats, card rarities, PlayStyles, and visual schemes.
 */
import { normalizePosition } from './localizationUtils';

export interface FifaAttributes {
    pac: number; // Pace / Tezlik
    sho: number; // Shooting / Zarba
    pas: number; // Passing / Pas
    dri: number; // Dribbling / Dribling
    def: number; // Defending / Himoya
    phy: number; // Physicality / Jismoniy
    ovr: number; // Overall Rating
    hasScoutedVideo?: boolean;
}

export type CardRarity = 'unrated' | 'bronze' | 'silver' | 'gold' | 'amatora_elite' | 'holographic' | 'icon';

export interface PlayStyle {
    id: string;
    name: string;
    icon: string;
    description: string;
}

const clamp = (val: number, min = 0, max = 99) => Math.round(Math.min(Math.max(val, min), max));

/**
 * Calculates 6 core FIFA/EA FC attributes based on player position, real stats, and rating.
 * If player has 0 matches played, returns 0 for all attributes.
 */
export function calculateFifaAttributes(player: any): FifaAttributes {
    if (!player) {
        return { pac: 0, sho: 0, pas: 0, dri: 0, def: 0, phy: 0, ovr: 0 };
    }

    // If pre-evaluated AI scout stats exist, use them directly
    if (player.aiStats && typeof player.aiStats.ovr === 'number') {
        return {
            pac: player.aiStats.pac ?? 0,
            sho: player.aiStats.sho ?? 0,
            pas: player.aiStats.pas ?? 0,
            dri: player.aiStats.dri ?? 0,
            def: player.aiStats.def ?? 0,
            phy: player.aiStats.phy ?? 0,
            ovr: player.aiStats.ovr ?? 0,
            hasScoutedVideo: player.aiStats.hasVideoScouted ?? false,
        };
    }

    const stats = player.stats || {};
    const matches = Number(stats.matchesPlayed ?? player.matchesPlayed ?? player.careerMatches ?? 0);
    const goals = Number(stats.goals ?? player.goals ?? player.careerGoals ?? 0);
    const assists = Number(stats.assists ?? player.assists ?? player.careerAssists ?? 0);
    const height = Number(player.height || 178);
    const weight = Number(player.weight || 72);
    const age = Number(player.age || 23);

    // RULE: If player has 0 matches -> all attributes = 0
    if (matches === 0) {
        return { pac: 0, sho: 0, pas: 0, dri: 0, def: 0, phy: 0, ovr: 0 };
    }

    const rawPos = player.position || player.positionUz || '';
    const canonPos = normalizePosition(rawPos);

    const goalsPerMatch = matches > 0 ? goals / matches : 0;
    const assistsPerMatch = matches > 0 ? assists / matches : 0;

    const isFwd = ['st', 'cf', 'lw', 'rw', 'fwd'].includes(canonPos);
    const isMid = ['cm', 'cam', 'cdm', 'lm', 'rm', 'mid'].includes(canonPos);
    const isDef = ['cb', 'lb', 'rb', 'lwb', 'rwb', 'def'].includes(canonPos);
    const isGK = canonPos === 'gk';

    const ageModifier = age > 31 ? Math.min((age - 31) * 1.5, 8) : 0;
    const weightBonus = weight > 78 ? 4 : (weight < 65 ? -3 : 0);
    const heightBonus = height > 185 ? 5 : 0;

    let pac = 75;
    let sho = 65;
    let pas = 68;
    let dri = 70;
    let def = 55;
    let phy = 68;
    let ovr = 74;

    if (isFwd) {
        const isWinger = canonPos === 'lw' || canonPos === 'rw';
        pac = clamp(82 + (isWinger ? 6 : 0) + Math.min(goals * 2, 6) - ageModifier, 55, 95);
        sho = clamp(74 + Math.min(goals * 3, 14) + Math.round(goalsPerMatch * 10), 55, 96);
        pas = clamp(66 + Math.min(assists * 3, 12) + Math.round(assistsPerMatch * 8), 50, 92);
        dri = clamp(76 + (isWinger ? 6 : 2) + Math.min(goals, 6), 55, 94);
        def = clamp(38 + Math.min(matches, 6), 30, 65);
        phy = clamp(70 + weightBonus + (height > 182 ? 4 : 0), 50, 93);
        ovr = clamp(Math.round((sho * 0.35) + (pac * 0.25) + (dri * 0.20) + (pas * 0.10) + (phy * 0.10)), 60, 96);
    } else if (isMid) {
        const isAttacking = canonPos === 'cam' || canonPos === 'lm' || canonPos === 'rm';
        const isDefensive = canonPos === 'cdm';
        pac = clamp(76 + (isAttacking ? 4 : 0) - ageModifier, 50, 91);
        sho = clamp(68 + (isAttacking ? 6 : 0) + Math.min(goals * 3, 10), 45, 90);
        pas = clamp(78 + Math.min(assists * 4, 14) + Math.round(assistsPerMatch * 10), 60, 95);
        dri = clamp(76 + (isAttacking ? 6 : 2) + Math.min(assists, 6), 55, 93);
        def = clamp(isDefensive ? 80 + Math.min(matches, 8) : 58 + Math.min(matches, 4), 40, 92);
        phy = clamp(72 + weightBonus + (isDefensive ? 6 : 0), 50, 93);
        ovr = clamp(Math.round((pas * 0.30) + (dri * 0.25) + (sho * 0.15) + (def * 0.15) + (phy * 0.15)), 60, 96);
    } else if (isDef) {
        const isFullBack = canonPos === 'lb' || canonPos === 'rb' || canonPos === 'lwb' || canonPos === 'rwb';
        pac = clamp(isFullBack ? 80 - ageModifier : 72 - ageModifier, 50, 92);
        sho = clamp(45 + (goals > 0 ? Math.min(goals * 6, 16) : 0), 30, 80);
        pas = clamp(66 + Math.min(assists * 3, 10), 45, 88);
        dri = clamp(66 + (isFullBack ? 6 : 0), 45, 86);
        def = clamp(80 + Math.min(matches * 2, 12), 60, 96);
        phy = clamp(80 + heightBonus + weightBonus, 60, 95);
        ovr = clamp(Math.round((def * 0.40) + (phy * 0.30) + (pac * 0.15) + (pas * 0.15)), 60, 96);
    } else if (isGK) {
        pac = clamp(82 + Math.min(matches, 6), 60, 94);
        sho = clamp(80 + Math.min(matches, 6), 60, 92);
        pas = clamp(74 + Math.min(assists * 5, 10), 55, 90);
        dri = clamp(86 + Math.min(matches, 6), 65, 95);
        def = clamp(50, 40, 70);
        phy = clamp(82 + heightBonus, 60, 95);
        ovr = clamp(Math.round((dri * 0.35) + (pac * 0.25) + (sho * 0.20) + (phy * 0.20)), 60, 95);
    } else {
        pac = clamp(76 + Math.min(goals, 4) - ageModifier, 55, 90);
        sho = clamp(66 + Math.min(goals * 3, 12), 45, 90);
        pas = clamp(70 + Math.min(assists * 3, 12), 45, 90);
        dri = clamp(72 + Math.min(goals + assists, 6), 50, 90);
        def = clamp(58 + Math.min(matches, 6), 40, 85);
        phy = clamp(72 + weightBonus, 50, 90);
        ovr = clamp(Math.round((pac + sho + pas + dri + def + phy) / 6), 60, 94);
    }

    return { pac, sho, pas, dri, def, phy, ovr };
}

/**
 * Determines card rarity style based on player level & achievements.
 */
export function getCardRarity(player: any): CardRarity {
    if (!player) return 'unrated';
    const matches = Number(player?.stats?.matchesPlayed ?? player?.matchesPlayed ?? player?.careerMatches ?? 0);
    if (matches === 0) return 'unrated';

    const rawRating = player?.rating !== undefined && player?.rating !== null && Number(player?.rating) !== 0
        ? Number(player.rating)
        : (player?.stats?.rating ? Number(player.stats.rating) : 0);

    const attrs = calculateFifaAttributes(player);

    let effRating = 0;
    if (rawRating > 0) {
        effRating = rawRating <= 10 ? rawRating * 10 : rawRating;
    } else if (attrs.ovr > 0) {
        effRating = attrs.ovr;
    }

    // High-end EA FC tier hierarchy based on rating score:
    // 9.4+ (94+) -> Supreme TOTY Icon (Black Onyx & 24K Pure Auric Gold)
    if (effRating >= 94) return 'icon';
    // 8.7 - 9.3 (87-93) -> Champions TOTS Hologram (Sapphire, Violet & Cyan)
    if (effRating >= 87) return 'holographic';
    // 8.0 - 8.6 (80-86) -> Amatora Emerald Elite (Cyber Neon Emerald)
    if (effRating >= 80) return 'amatora_elite';
    // 7.0 - 7.9 (70-79) -> EA FC Imperial Gold Rare (Championship Gold)
    if (effRating >= 70) return 'gold';
    // 6.0 - 6.9 (60-69) -> Sterling Platinum Silver
    if (effRating >= 60) return 'silver';
    // < 6.0 (<60) -> Metallic Copper Bronze
    return 'bronze';
}

/**
 * Returns EA FC PlayStyles for the player based on position, stats and current language.
 */
export function getPlayStyles(player: any, lang: string = 'uz'): PlayStyle[] {
    const attrs = calculateFifaAttributes(player);
    const pool: PlayStyle[] = [];

    const isUz = lang === 'uz';
    const isRu = lang === 'ru';

    if (attrs.sho >= 80) {
        pool.push({
            id: 'finesse',
            name: isUz ? 'Aniq Zarba+' : isRu ? 'Крученый+' : 'Finesse Shot+',
            icon: 'flash',
            description: isUz ? 'Yuqori aniqlikdagi burchak zarbalari' : isRu ? 'Удары с подкруткой' : 'Curled shots with accuracy'
        });
    }
    if (attrs.pac >= 82) {
        pool.push({
            id: 'rapid',
            name: isUz ? 'Tezkor Poyga' : isRu ? 'Спринтер' : 'Rapid Pace',
            icon: 'speedometer-outline',
            description: isUz ? 'To\'p bilan chaqqon tezlashuv' : isRu ? 'Высокая скорость' : 'High sprint speed'
        });
    }
    if (attrs.pas >= 78) {
        pool.push({
            id: 'incisive_pass',
            name: isUz ? 'Tikuvchi Pas' : isRu ? 'Точный Пас' : 'Incisive Pass',
            icon: 'git-commit-outline',
            description: isUz ? 'Himoyani yorib o\'tuvchi paslar' : isRu ? 'Разрезающие передачи' : 'Line-breaking passes'
        });
    }
    if (attrs.def >= 78) {
        pool.push({
            id: 'intercept',
            name: isUz ? 'To\'p Olish+' : isRu ? 'Перехват+' : 'Intercept+',
            icon: 'shield-checkmark-outline',
            description: isUz ? 'To\'pni his qilish va egallash' : isRu ? 'Умение отбора' : 'Interceptions & ball-winning'
        });
    }
    if (attrs.phy >= 80) {
        pool.push({
            id: 'aerial',
            name: isUz ? 'Ikkinchi Qavat' : isRu ? 'Второй этаж' : 'Aerial Master',
            icon: 'airplane-outline',
            description: isUz ? 'Bosh bilan va jismoniy kurashlar' : isRu ? 'Борьба на втором этаже' : 'Aerial duels dominance'
        });
    }

    if (pool.length === 0) {
        pool.push({
            id: 'relentless',
            name: isUz ? 'Tugamas Kuch' : isRu ? 'Выносливый' : 'Relentless',
            icon: 'battery-charging-outline',
            description: isUz ? 'O\'yin davomida yuqori faollik' : isRu ? 'Высокая выносливость' : 'High stamina'
        });
    }

    return pool.slice(0, 2);
}

/**
 * Returns localized 3-letter stat label (PAC/SHO/PAS/DRI/DEF/PHY).
 */
export function getLocalizedStatLabel(key: 'pac' | 'sho' | 'pas' | 'dri' | 'def' | 'phy', lang: string = 'uz'): string {
    const isUz = lang === 'uz';
    const isRu = lang === 'ru';

    switch (key) {
        case 'pac': return isUz ? 'TEZ' : isRu ? 'СКО' : 'PAC';
        case 'sho': return isUz ? 'ZAR' : isRu ? 'УДР' : 'SHO';
        case 'pas': return isUz ? 'PAS' : isRu ? 'ПАС' : 'PAS';
        case 'dri': return isUz ? 'DRI' : isRu ? 'ДРБ' : 'DRI';
        case 'def': return isUz ? 'HIM' : isRu ? 'ЗАЩ' : 'DEF';
        case 'phy': return isUz ? 'JIS' : isRu ? 'ФИЗ' : 'PHY';
        default: return (key as string).toUpperCase();
    }
}

/**
 * Returns localized full position for Player Card (DARVOZABON / НАПАДАЮЩИЙ / GOALKEEPER etc.).
 */
export function getCardPosition(rawPos: string | undefined | null, lang: string = 'uz'): string {
    const key = normalizePosition(rawPos);
    const isUz = lang === 'uz';
    const isRu = lang === 'ru';

    switch (key) {
        case 'gk': return isUz ? 'DARVOZABON' : isRu ? 'ВРАТАРЬ' : 'GOALKEEPER';
        case 'st':
        case 'cf':
        case 'fwd': return isUz ? 'HUJUMCHI' : isRu ? 'НАПАДАЮЩИЙ' : 'FORWARD';
        case 'lw': return isUz ? 'CHAP QANOT' : isRu ? 'ЛЕВЫЙ ВИНГЕР' : 'LEFT WING';
        case 'rw': return isUz ? 'O\'NG QANOT' : isRu ? 'ПРАВЫЙ ВИНГЕР' : 'RIGHT WING';
        case 'cam':
        case 'cm':
        case 'cdm':
        case 'lm':
        case 'rm':
        case 'mid': return isUz ? 'YARIM HIMOYACHI' : isRu ? 'ПОЛУЗАЩИТНИК' : 'MIDFIELDER';
        case 'cb':
        case 'lb':
        case 'rb':
        case 'lwb':
        case 'rwb':
        case 'def': return isUz ? 'HIMOYACHI' : isRu ? 'ЗАЩИТНИК' : 'DEFENDER';
        default: {
            if (!rawPos) return isUz ? 'O\'YINCHI' : isRu ? 'ИГРОК' : 'PLAYER';
            return String(rawPos).trim().toUpperCase();
        }
    }
}

/**
 * Card theme presets
 */
export const CARD_THEMES: Record<CardRarity, any> = {
    icon: {
        id: 'icon',
        name: 'Supreme TOTY Icon',
        cardBg: ['#07070B', '#141026', '#0B0916', '#020205'],
        accentGlow: '#FDE047',
        borderGradient: ['#FFFFFF', '#FDE047', '#EAB308', '#67E8F9', '#FEF08A', '#F59E0B'],
        textPrimary: '#FFFFFF',
        textGold: '#FDE047',
        foilOverlay: 'rgba(253, 224, 71, 0.28)',
        badgeBg: 'rgba(253, 224, 71, 0.25)',
        shadowColor: '#FDE047',
        ratingColor: '#FFFFFF',
    },
    holographic: {
        id: 'holographic',
        name: 'Champions TOTS Hologram',
        cardBg: ['#0B112C', '#1E1B4B', '#172554', '#060919'],
        accentGlow: '#38BDF8',
        borderGradient: ['#38BDF8', '#818CF8', '#C084FC', '#F472B6', '#38BDF8'],
        textPrimary: '#FFFFFF',
        textGold: '#7DD3FC',
        foilOverlay: 'rgba(56, 189, 248, 0.25)',
        badgeBg: 'rgba(56, 189, 248, 0.25)',
        shadowColor: '#38BDF8',
        ratingColor: '#38BDF8',
    },
    amatora_elite: {
        id: 'amatora_elite',
        name: 'Amatora Emerald Elite',
        cardBg: ['#021B13', '#063826', '#032318', '#010E0A'],
        accentGlow: '#00DF82',
        borderGradient: ['#00DF82', '#10B981', '#6EE7B7', '#047857', '#A7F3D0'],
        textPrimary: '#FFFFFF',
        textGold: '#00DF82',
        foilOverlay: 'rgba(0, 223, 130, 0.25)',
        badgeBg: 'rgba(0, 223, 130, 0.25)',
        shadowColor: '#00DF82',
        ratingColor: '#00DF82',
    },
    gold: {
        id: 'gold',
        name: 'EA FC Gold Rare',
        cardBg: ['#211805', '#45320C', '#281E07', '#120D03'],
        accentGlow: '#F59E0B',
        borderGradient: ['#FDE047', '#EAB308', '#CA8A04', '#FEF08A', '#A16207'],
        textPrimary: '#FEF08A',
        textGold: '#FBBF24',
        foilOverlay: 'rgba(251, 191, 36, 0.18)',
        badgeBg: 'rgba(234, 179, 8, 0.25)',
        shadowColor: '#F59E0B',
        ratingColor: '#FDE047',
    },
    silver: {
        id: 'silver',
        name: 'Silver Platinum Rare',
        cardBg: ['#111827', '#1F2937', '#162032', '#0B0F19'],
        accentGlow: '#94A3B8',
        borderGradient: ['#F8FAFC', '#94A3B8', '#E2E8F0', '#475569', '#CBD5E1'],
        textPrimary: '#F8FAFC',
        textGold: '#E2E8F0',
        foilOverlay: 'rgba(226, 232, 240, 0.16)',
        badgeBg: 'rgba(148, 163, 184, 0.25)',
        shadowColor: '#94A3B8',
        ratingColor: '#FFFFFF',
    },
    bronze: {
        id: 'bronze',
        name: 'Metallic Bronze',
        cardBg: ['#1C120B', '#331E12', '#21140D', '#0F0906'],
        accentGlow: '#D97706',
        borderGradient: ['#F59E0B', '#B45309', '#D97706', '#78350F', '#FCD34D'],
        textPrimary: '#FDE68A',
        textGold: '#FBBF24',
        foilOverlay: 'rgba(217, 119, 6, 0.15)',
        badgeBg: 'rgba(180, 83, 9, 0.25)',
        shadowColor: '#B45309',
        ratingColor: '#FDE68A',
    },
    unrated: {
        id: 'unrated',
        name: 'Unrated Base',
        cardBg: ['#0B0F19', '#162032', '#0F172A', '#030712'],
        accentGlow: 'rgba(255, 255, 255, 0.2)',
        borderGradient: ['rgba(255, 255, 255, 0.3)', 'rgba(255, 255, 255, 0.1)', 'rgba(255, 255, 255, 0.2)', 'rgba(255, 255, 255, 0.05)'],
        textPrimary: '#94A3B8',
        textGold: '#64748B',
        foilOverlay: 'rgba(255, 255, 255, 0.05)',
        badgeBg: 'rgba(255, 255, 255, 0.08)',
        shadowColor: 'rgba(0, 0, 0, 0.6)',
        ratingColor: '#94A3B8',
    },
};
