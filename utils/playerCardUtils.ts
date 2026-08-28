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

export type CardRarity = 'unrated' | 'silver' | 'gold' | 'holographic' | 'icon' | 'amatora_elite';

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

    const attrs = calculateFifaAttributes(player);
    if (attrs.ovr >= 91) return 'amatora_elite';
    if (attrs.ovr >= 87) return 'icon';
    if (attrs.ovr >= 82) return 'holographic';
    if (attrs.ovr >= 70) return 'gold';
    return 'silver';
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
    amatora_elite: {
        id: 'amatora_elite',
        name: 'Amatora Elite Neon',
        cardBg: ['#042017', '#0A3B2A', '#061D15', '#020C08'],
        accentGlow: '#00DF82',
        borderGradient: ['#00DF82', '#00F0FF', '#00A862', '#10B981'],
        textPrimary: '#FFFFFF',
        textGold: '#00DF82',
        foilOverlay: 'rgba(0, 223, 130, 0.25)',
        badgeBg: 'rgba(0, 223, 130, 0.25)',
        shadowColor: '#00DF82',
        ratingColor: '#00DF82',
    },
    holographic: {
        id: 'holographic',
        name: 'Holographic TOTW',
        cardBg: ['#1e1035', '#2c1654', '#1a0e33', '#0a0514'],
        accentGlow: '#8B5CF6',
        borderGradient: ['#C084FC', '#38BDF8', '#F472B6', '#FBBF24'],
        textPrimary: '#FFFFFF',
        textGold: '#F3E8FF',
        foilOverlay: 'rgba(192, 132, 252, 0.2)',
        badgeBg: 'rgba(139, 92, 246, 0.3)',
        shadowColor: '#C084FC',
        ratingColor: '#F472B6',
    },
    gold: {
        id: 'gold',
        name: 'EA FC Gold Rare',
        cardBg: ['#2b220d', '#4a3b12', '#2f240b', '#1a1406'],
        accentGlow: '#F59E0B',
        borderGradient: ['#FDE047', '#CA8A04', '#FEF08A', '#A16207'],
        textPrimary: '#FEF08A',
        textGold: '#FBBF24',
        foilOverlay: 'rgba(251, 191, 36, 0.15)',
        badgeBg: 'rgba(234, 179, 8, 0.25)',
        shadowColor: '#F59E0B',
        ratingColor: '#FDE047',
    },
    icon: {
        id: 'icon',
        name: 'Amatora Icon',
        cardBg: ['#1a1f2c', '#2c3345', '#161922', '#0c0e14'],
        accentGlow: '#E2E8F0',
        borderGradient: ['#FFFFFF', '#94A3B8', '#F8FAFC', '#64748B'],
        textPrimary: '#FFFFFF',
        textGold: '#E2E8F0',
        foilOverlay: 'rgba(248, 250, 252, 0.2)',
        badgeBg: 'rgba(255, 255, 255, 0.2)',
        shadowColor: '#38BDF8',
        ratingColor: '#FFFFFF',
    },
    silver: {
        id: 'silver',
        name: 'Silver Rare',
        cardBg: ['#1e293b', '#334155', '#1e293b', '#0f172a'],
        accentGlow: '#94A3B8',
        borderGradient: ['#CBD5E1', '#64748B', '#E2E8F0', '#475569'],
        textPrimary: '#F1F5F9',
        textGold: '#CBD5E1',
        foilOverlay: 'rgba(203, 213, 225, 0.15)',
        badgeBg: 'rgba(148, 163, 184, 0.25)',
        shadowColor: '#64748B',
        ratingColor: '#F1F5F9',
    },
    unrated: {
        id: 'unrated',
        name: 'Unrated Base',
        cardBg: ['#0f172a', '#1e293b', '#0f172a', '#020617'],
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
