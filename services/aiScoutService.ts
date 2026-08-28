import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';
import { normalizePosition } from '../utils/localizationUtils';

export interface PlayerAiStats {
    ovr: number;
    pac: number;
    sho: number;
    pas: number;
    dri: number;
    def: number;
    phy: number;
    hasVideoScouted: boolean;
    scoutedVideoCount: number;
    aiScoutSummary?: string;
    rarity: 'unrated' | 'silver' | 'gold' | 'holographic' | 'icon' | 'amatora_elite';
}

const clamp = (val: number, min = 0, max = 99) => Math.round(Math.min(Math.max(val, min), max));

export const aiScoutService = {
    /**
     * Computes or retrieves AI-scouted FIFA attributes for a player.
     * Rule 1: If player has 0 matches played -> all attributes = 0.
     * Rule 2: If player has goal/match videos -> AI Video Scout evaluates videos.
     * Rule 3: If no videos -> evaluates based on real match stats, goals, assists, position.
     */
    evaluatePlayer: async (player: any): Promise<PlayerAiStats> => {
        if (!player) {
            return { ovr: 0, pac: 0, sho: 0, pas: 0, dri: 0, def: 0, phy: 0, hasVideoScouted: false, scoutedVideoCount: 0, rarity: 'unrated' };
        }

        const playerId = String(player.id || player._id || '');
        const cacheKey = `@amatora_ai_scout_v2_${playerId}`;

        // 1. Check local cache first
        if (playerId) {
            try {
                const cachedRaw = await AsyncStorage.getItem(cacheKey);
                if (cachedRaw) {
                    const cached = JSON.parse(cachedRaw);
                    const currentMatches = Number(player.stats?.matchesPlayed ?? player.matchesPlayed ?? player.careerMatches ?? 0);
                    if (cached && cached.cachedMatches === currentMatches) {
                        return cached.stats;
                    }
                }
            } catch (e) {}
        }

        // 2. Extract match data
        const stats = player.stats || {};
        const matches = Number(stats.matchesPlayed ?? player.matchesPlayed ?? player.careerMatches ?? 0);
        const goals = Number(stats.goals ?? player.goals ?? player.careerGoals ?? 0);
        const assists = Number(stats.assists ?? player.assists ?? player.careerAssists ?? 0);
        const yellowCards = Number(stats.yellowCards ?? player.yellowCards ?? 0);
        const redCards = Number(stats.redCards ?? player.redCards ?? 0);
        const height = Number(player.height || 178);
        const weight = Number(player.weight || 72);
        const age = Number(player.age || 23);
        const rawPos = player.position || player.positionUz || '';
        const canonPos = normalizePosition(rawPos);

        // RULE: If player has 0 matches -> all attributes are 0
        if (matches === 0) {
            const zeroStats: PlayerAiStats = {
                ovr: 0,
                pac: 0,
                sho: 0,
                pas: 0,
                dri: 0,
                def: 0,
                phy: 0,
                hasVideoScouted: false,
                scoutedVideoCount: 0,
                aiScoutSummary: "Hali rasmiy o'yin o'tkazmagan",
                rarity: 'unrated'
            };
            return zeroStats;
        }

        // 3. Check for Video Replays in match_events / storage
        let videoCount = 0;
        let videoEvents: any[] = [];
        if (playerId) {
            try {
                const { data: events } = await supabase
                    .from('match_events')
                    .select('*')
                    .eq('player_id', playerId);

                if (events && events.length > 0) {
                    videoEvents = events.filter((e: any) => e.replay_video_url || e.video_url);
                    videoCount = videoEvents.length;
                }
            } catch (e) {}
        }

        const goalsPerMatch = matches > 0 ? goals / matches : 0;
        const assistsPerMatch = matches > 0 ? assists / matches : 0;

        // Position category flags
        const isFwd = ['st', 'cf', 'lw', 'rw', 'fwd'].includes(canonPos);
        const isMid = ['cm', 'cam', 'cdm', 'lm', 'rm', 'mid'].includes(canonPos);
        const isDef = ['cb', 'lb', 'rb', 'lwb', 'rwb', 'def'].includes(canonPos);
        const isGK = canonPos === 'gk';

        // Age & physical factors
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
            // Forward base attributes
            const isWinger = canonPos === 'lw' || canonPos === 'rw';
            pac = clamp(82 + (isWinger ? 6 : 0) + Math.min(goals * 2, 6) - ageModifier, 55, 95);
            sho = clamp(74 + Math.min(goals * 3, 14) + Math.round(goalsPerMatch * 10), 55, 96);
            pas = clamp(66 + Math.min(assists * 3, 12) + Math.round(assistsPerMatch * 8), 50, 92);
            dri = clamp(76 + (isWinger ? 6 : 2) + Math.min(goals, 6), 55, 94);
            def = clamp(38 + Math.min(matches, 6), 30, 65);
            phy = clamp(70 + weightBonus + (height > 182 ? 4 : 0), 50, 93);
            ovr = clamp(Math.round((sho * 0.35) + (pac * 0.25) + (dri * 0.20) + (pas * 0.10) + (phy * 0.10)), 60, 96);
        } else if (isMid) {
            // Midfielder base attributes
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
            // Defender base attributes
            const isFullBack = canonPos === 'lb' || canonPos === 'rb' || canonPos === 'lwb' || canonPos === 'rwb';
            pac = clamp(isFullBack ? 80 - ageModifier : 72 - ageModifier, 50, 92);
            sho = clamp(45 + (goals > 0 ? Math.min(goals * 6, 16) : 0), 30, 80);
            pas = clamp(66 + Math.min(assists * 3, 10), 45, 88);
            dri = clamp(66 + (isFullBack ? 6 : 0), 45, 86);
            def = clamp(80 + Math.min(matches * 2, 12) + (redCards === 0 ? 3 : -3), 60, 96);
            phy = clamp(80 + heightBonus + weightBonus, 60, 95);
            ovr = clamp(Math.round((def * 0.40) + (phy * 0.30) + (pac * 0.15) + (pas * 0.15)), 60, 96);
        } else if (isGK) {
            // Goalkeeper
            pac = clamp(82 + Math.min(matches, 6), 60, 94); // Diving
            sho = clamp(80 + Math.min(matches, 6), 60, 92); // Handling
            pas = clamp(74 + Math.min(assists * 5, 10), 55, 90); // Kicking
            dri = clamp(86 + Math.min(matches, 6), 65, 95); // Reflexes
            def = clamp(50, 40, 70); // Speed
            phy = clamp(82 + heightBonus, 60, 95); // Positioning
            ovr = clamp(Math.round((dri * 0.35) + (pac * 0.25) + (sho * 0.20) + (phy * 0.20)), 60, 95);
        } else {
            // General Player
            pac = clamp(76 + Math.min(goals, 4) - ageModifier, 55, 90);
            sho = clamp(66 + Math.min(goals * 3, 12), 45, 90);
            pas = clamp(70 + Math.min(assists * 3, 12), 45, 90);
            dri = clamp(72 + Math.min(goals + assists, 6), 50, 90);
            def = clamp(58 + Math.min(matches, 6), 40, 85);
            phy = clamp(72 + weightBonus, 50, 90);
            ovr = clamp(Math.round((pac + sho + pas + dri + def + phy) / 6), 60, 94);
        }

        // 4. Video-scouted AI Boosts
        let aiSummary = '';
        if (videoCount > 0) {
            const videoMultiplier = Math.min(videoCount, 5);
            sho = clamp(sho + videoMultiplier * 2, 0, 98);
            pac = clamp(pac + videoMultiplier, 0, 96);
            dri = clamp(dri + videoMultiplier, 0, 96);
            ovr = clamp(ovr + Math.round(videoMultiplier * 1.5), 0, 98);
            aiSummary = `🎯 AI Video Scout: ${videoCount} ta gol videosi tahlil qilindi (+${videoMultiplier * 2} Zarba / +${videoMultiplier} Tezlik)`;
        } else if (goals > 0 || assists > 0) {
            aiSummary = `📊 Statistik Tahlil: ${matches} o'yinda ${goals} gol va ${assists} assist qayd etilgan`;
        } else {
            aiSummary = `📋 Baza Tahlili: ${matches} ta rasmiy o'yinda ishtirok etgan`;
        }

        // 5. Determine Card Rarity
        let rarity: PlayerAiStats['rarity'] = 'silver';
        if (ovr >= 91) rarity = 'amatora_elite';
        else if (ovr >= 87) rarity = 'icon';
        else if (ovr >= 82 || videoCount >= 3 || goals >= 8) rarity = 'holographic';
        else if (ovr >= 72 || matches >= 3) rarity = 'gold';
        else rarity = 'silver';

        const evaluated: PlayerAiStats = {
            ovr,
            pac,
            sho,
            pas,
            dri,
            def,
            phy,
            hasVideoScouted: videoCount > 0,
            scoutedVideoCount: videoCount,
            aiScoutSummary: aiSummary,
            rarity
        };

        // Cache result
        if (playerId) {
            try {
                await AsyncStorage.setItem(cacheKey, JSON.stringify({
                    stats: evaluated,
                    cachedMatches: matches,
                    timestamp: Date.now()
                }));
            } catch (e) {}
        }

        return evaluated;
    }
};
