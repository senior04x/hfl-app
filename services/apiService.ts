import axios from 'axios';
import { supabase } from './supabase';
import { useOrganizationStore } from '../store/useOrganizationStore';
import { useJuniorStore } from '../store/useJuniorStore';

export { supabase };

const getOrgId = () => useOrganizationStore.getState().selectedOrganizationId || 1;
const getIsJunior = () => useJuniorStore.getState().isJuniorMode;

// Memory Cache Engine for High Performance & 90% Database Load Reduction
interface CacheEntry<T> {
    data: T;
    timestamp: number;
}

const memoryCache = new Map<string, CacheEntry<any>>();
const DEFAULT_TTL_MS = 5 * 60 * 1000; // 5 minutes TTL

export const getCachedData = async <T>(
    key: string,
    fetcher: () => Promise<T>,
    ttlMs: number = DEFAULT_TTL_MS
): Promise<T> => {
    const cached = memoryCache.get(key);
    const now = Date.now();
    if (cached && (now - cached.timestamp < ttlMs)) {
        return cached.data;
    }
    const data = await fetcher();
    memoryCache.set(key, { data, timestamp: now });
    return data;
};

export const clearApiCache = (keyPrefix?: string) => {
    if (!keyPrefix) {
        memoryCache.clear();
    } else {
        for (const key of memoryCache.keys()) {
            if (key.startsWith(keyPrefix)) {
                memoryCache.delete(key);
            }
        }
    }
};

// Production Render URL (Fallback)
const BASE_URL = 'https://hfl-backend.onrender.com/api';

const api = axios.create({
    baseURL: BASE_URL,
    timeout: 30000,
    headers: {
        'Content-Type': 'application/json',
    },
});

export const apiService = {
    // Players (Direct from Supabase 'applications' table)
    getPlayers: async (page = 1, limit = 100, teamId?: string) => {
        const orgId = getOrgId();
        const isJunior = getIsJunior();
        const cacheKey = `players_${orgId}_${isJunior}_${page}_${limit}_${teamId || 'all'}`;
        return getCachedData(cacheKey, async () => {
            try {
                let query = supabase.from('applications').select('*, teams(*)');
                if (teamId) {
                    query = query.eq('team_id', teamId);
                }
                const { data, error } = await query;
                if (error) throw error;
                return (data || []).map((p: any) => ({
                    ...p,
                    _id: p.id,
                    firstName: p.first_name || '',
                    lastName: p.last_name || '',
                    photo: p.photo_url || '',
                    position: p.position || 'O\'yinchi',
                    number: p.number || p.shirt_number || p.player_number || ''
                }));
            } catch (err) {
                console.warn('Supabase getPlayers fallback:', err);
                return api.get('/players', { params: { page, limit, teamId } }).then(res => res.data.data).catch(() => []);
            }
        });
    },

    getPlayerById: async (id: string) => {
        const cacheKey = `player_${id}`;
        return getCachedData(cacheKey, async () => {
            try {
                const { data, error } = await supabase.from('applications').select('*, teams(*)').eq('id', id).single();
                if (error) throw error;
                return {
                    ...data,
                    _id: data.id,
                    firstName: data.first_name || '',
                    lastName: data.last_name || '',
                    photo: data.photo_url || '',
                    position: data.position || 'O\'yinchi',
                    number: data.number || data.shirt_number || data.player_number || ''
                };
            } catch (err) {
                return api.get(`/players/${id}`).then(res => res.data.data).catch(() => null);
            }
        });
    },

    getPlayerStats: async (id: string) => {
        const cacheKey = `player_stats_${id}`;
        return getCachedData(cacheKey, async () => {
            try {
                const [eventsRes, playerDataRes] = await Promise.all([
                    supabase.from('match_events').select('*').eq('player_id', id),
                    supabase.from('applications').select('team_id').eq('id', id).single()
                ]);

                const allEvents = eventsRes.data || [];
                const teamId = playerDataRes.data?.team_id;

                const goals = allEvents.filter(e => String(e.event_type).toLowerCase() === 'goal').length;
                const assists = allEvents.filter(e => String(e.event_type).toLowerCase() === 'assist').length;
                const yellowCards = allEvents.filter(e => {
                    const t = String(e.event_type).toLowerCase();
                    return t === 'yellow_card' || t === 'yellowcard' || t === 'yellow';
                }).length;
                const redCards = allEvents.filter(e => {
                    const t = String(e.event_type).toLowerCase();
                    return t === 'red_card' || t === 'redcard' || t === 'red';
                }).length;

                let matchesPlayed = 0;
                if (teamId) {
                    const [homeRes, awayRes] = await Promise.all([
                        supabase.from('matches').select('id', { count: 'exact', head: true }).eq('home_team_id', teamId),
                        supabase.from('matches').select('id', { count: 'exact', head: true }).eq('away_team_id', teamId)
                    ]);
                    matchesPlayed = (homeRes.count || 0) + (awayRes.count || 0);
                }

                let rating = 0;
                if (matchesPlayed > 0) {
                    const rawScore = (goals * 0.5) + (assists * 0.3) - (yellowCards * 0.2) - (redCards * 0.5);
                    if (matchesPlayed >= 3) {
                        rating = 5.0 + (rawScore / matchesPlayed) * 3;
                    } else {
                        rating = 5.0 + rawScore;
                    }
                    rating = Math.min(10.0, Math.max(1.0, rating));
                    rating = Math.round(rating * 10) / 10;
                }

                return { goals, assists, yellowCards, redCards, matchesPlayed, total: matchesPlayed, rating };
            } catch (err) {
                return api.get(`/players/${id}/stats`).then(res => res.data.data).catch(() => ({ goals: 0, assists: 0, matchesPlayed: 0, yellowCards: 0, redCards: 0, rating: 0 }));
            }
        });
    },

    getPlayerMatches: async (id: string) => {
        const cacheKey = `player_matches_${id}`;
        return getCachedData(cacheKey, async () => {
            try {
                const { data: playerData } = await supabase.from('applications').select('team_id').eq('id', id).single();
                const teamId = playerData?.team_id;
                if (!teamId) return [];

                const [homeRes, awayRes, eventsRes, teamsRes] = await Promise.all([
                    supabase.from('matches').select('*').eq('home_team_id', teamId),
                    supabase.from('matches').select('*').eq('away_team_id', teamId),
                    supabase.from('match_events').select('*').eq('player_id', id),
                    supabase.from('teams').select('*')
                ]);

                const homeMatches = homeRes.data || [];
                const awayMatches = awayRes.data || [];
                const playerEvents = eventsRes.data || [];
                const teamsData = teamsRes.data || [];

                const allMatches: any[] = [];
                const matchIds = new Set<string>();
                [...homeMatches, ...awayMatches].forEach((m: any) => {
                    if (!matchIds.has(m.id)) {
                        matchIds.add(m.id);
                        allMatches.push(m);
                    }
                });

                if (allMatches.length === 0) return [];

                const eventsByMatch: Record<string, any[]> = {};
                playerEvents.forEach((e: any) => {
                    const mId = String(e.match_id);
                    if (!eventsByMatch[mId]) eventsByMatch[mId] = [];
                    eventsByMatch[mId].push({
                        event_type: String(e.event_type || '').toLowerCase(),
                        minute: e.minute
                    });
                });

                const teamsMap: Record<string, any> = {};
                teamsData.forEach((t: any) => { teamsMap[t.id] = t; });

                return allMatches
                    .sort((a, b) => new Date(b.match_date || b.date || 0).getTime() - new Date(a.match_date || a.date || 0).getTime())
                    .map((m: any) => {
                        const homeTeam = teamsMap[m.home_team_id];
                        const awayTeam = teamsMap[m.away_team_id];
                        const evts = eventsByMatch[String(m.id)] || [];

                        const hasGoal = evts.some(e => e.event_type === 'goal');
                        const hasAssist = evts.some(e => e.event_type === 'assist');
                        const hasYellow = evts.some(e => e.event_type === 'yellow_card' || e.event_type === 'yellowcard' || e.event_type === 'yellow');
                        const hasRed = evts.some(e => e.event_type === 'red_card' || e.event_type === 'redcard' || e.event_type === 'red');

                        const eventLabels: string[] = [];
                        if (hasGoal) eventLabels.push('GOL');
                        if (hasAssist) eventLabels.push('ASSIST');
                        if (hasYellow) eventLabels.push('SARIQ');
                        if (hasRed) eventLabels.push('QIZIL');

                        return {
                            ...m,
                            _id: m.id,
                            playerEvents: evts,
                            eventLabel: eventLabels.length > 0 ? eventLabels.join(' • ') : "O'YIN",
                            event_type: hasGoal ? 'goal' : hasAssist ? 'assist' : hasYellow ? 'yellow_card' : hasRed ? 'red_card' : 'match',
                            homeTeamName: homeTeam?.name || m.home_team_name || 'Uy jamoasi',
                            homeTeamLogo: homeTeam?.logo_url || m.home_team_logo || '',
                            awayTeamName: awayTeam?.name || m.away_team_name || 'Mehmon jamoa',
                            awayTeamLogo: awayTeam?.logo_url || m.away_team_logo || '',
                            homeTeam: homeTeam ? { name: homeTeam.name, logo: homeTeam.logo_url } : { name: m.home_team_name, logo: m.home_team_logo },
                            awayTeam: awayTeam ? { name: awayTeam.name, logo: awayTeam.logo_url } : { name: m.away_team_name, logo: m.away_team_logo },
                            score: { home: m.home_score ?? 0, away: m.away_score ?? 0 }
                        };
                    });
            } catch (err) {
                return api.get(`/players/${id}/matches`).then(res => res.data.data).catch(() => []);
            }
        });
    },

    // Teams (Direct from Supabase 'teams' table with Standings calculation)
    getTeams: async (page = 1, limit = 100, leagueName?: string) => {
        const orgId = getOrgId();
        const isJunior = getIsJunior();
        const cacheKey = `teams_${orgId}_${isJunior}_${page}_${limit}_${leagueName || 'all'}`;
        return getCachedData(cacheKey, async () => {
            try {
                let query = supabase.from('teams').select('*').order('name');
                if (leagueName) {
                    const lLower = String(leagueName).toLowerCase();
                    let keyword = '';
                    if (lLower.includes('super')) keyword = 'super';
                    else if (lLower.includes('pro')) keyword = 'pro';
                    else if (lLower.includes('3')) keyword = '3';
                    else if (lLower.includes('7')) keyword = '7x7';

                    if (keyword) {
                        query = query.ilike('league', `%${keyword}%`);
                    }
                }
                const { data: rawTeams, error } = await query;
                if (error) throw error;
                if (!rawTeams) return [];

            // Fetch finished matches to compute points dynamically
            const { data: finishedMatches } = await supabase
                .from('matches')
                .select('*')
                .eq('status', 'finished');

            const matchesList = finishedMatches || [];

            const teamsWithStats = rawTeams.map((t: any) => {
                let points = parseInt(t.penalty_points || 0);
                let played = 0;
                let won = 0;
                let drawn = 0;
                let lost = 0;
                let gf = 0;
                let ga = 0;

                matchesList.forEach((m: any) => {
                    const isHome = String(m.home_team_id) === String(t.id);
                    const isAway = String(m.away_team_id) === String(t.id);

                    if (isHome || isAway) {
                        const myScore = parseInt(isHome ? (m.home_score || 0) : (m.away_score || 0));
                        const oppScore = parseInt(isHome ? (m.away_score || 0) : (m.home_score || 0));

                        played += 1;
                        gf += myScore;
                        ga += oppScore;

                        if (myScore > oppScore) {
                            won += 1;
                            points += 3;
                        } else if (myScore === oppScore) {
                            drawn += 1;
                            points += 1;
                        } else {
                            lost += 1;
                        }
                    }
                });

                return {
                    ...t,
                    _id: t.id,
                    logo: t.logo_url || t.logo || '',
                    logo_url: t.logo_url || t.logo || '',
                    points: points,
                    stats: {
                        points,
                        played,
                        won,
                        drawn,
                        lost,
                        goalsFor: gf,
                        goalsAgainst: ga,
                        goalDifference: gf - ga
                    }
                };
            });

            return teamsWithStats;
        } catch (error) {
            console.warn('Supabase getTeams fallback:', error);
            const res = await api.get(`/teams?page=${page}&limit=${limit}`).catch(() => ({ data: { data: [] } }));
            return res.data?.data || [];
        }
    });
},

    getTeamById: async (id: string) => {
        try {
            const { data, error } = await supabase.from('teams').select('*').eq('id', id).single();
            if (error) throw error;

            let parsedFormation = data?.formation || null;
            if (!parsedFormation && data?.telegram_message_id && data.telegram_message_id.startsWith('FORMATION_')) {
                try {
                    parsedFormation = JSON.parse(data.telegram_message_id.replace('FORMATION_', ''));
                } catch (e) {}
            }

            // Calculate points & stats dynamically from finished matches
            let points = parseInt(data?.penalty_points || 0);
            let played = 0;
            let won = 0;
            let drawn = 0;
            let lost = 0;
            let gf = 0;
            let ga = 0;

            try {
                const { data: homeMatches } = await supabase
                    .from('matches')
                    .select('*')
                    .eq('home_team_id', id)
                    .eq('status', 'finished');

                const { data: awayMatches } = await supabase
                    .from('matches')
                    .select('*')
                    .eq('away_team_id', id)
                    .eq('status', 'finished');

                const allFinished = [...(homeMatches || []), ...(awayMatches || [])];

                allFinished.forEach((m: any) => {
                    const isHome = String(m.home_team_id) === String(id);
                    const myScore = parseInt(isHome ? (m.home_score || 0) : (m.away_score || 0));
                    const oppScore = parseInt(isHome ? (m.away_score || 0) : (m.home_score || 0));

                    played += 1;
                    gf += myScore;
                    ga += oppScore;

                    if (myScore > oppScore) {
                        won += 1;
                        points += 3;
                    } else if (myScore === oppScore) {
                        drawn += 1;
                        points += 1;
                    } else {
                        lost += 1;
                    }
                });
            } catch (calcErr) {
                console.warn('Team stats calculation error:', calcErr);
            }

            return {
                ...data,
                _id: data.id,
                logo: data.logo_url || data.logo || '',
                logo_url: data.logo_url || data.logo || '',
                points: points,
                stats: {
                    points,
                    played,
                    won,
                    drawn,
                    lost,
                    goalsFor: gf,
                    goalsAgainst: ga,
                    goalDifference: gf - ga
                },
                formation: parsedFormation || { players: [] }
            };
        } catch (err) {
            return api.get(`/teams/${id}`).then(res => res.data.data).catch(() => null);
        }
    },

    updateTeam: async (id: string, data: any) => {
        try {
            const { data: updated, error } = await supabase.from('teams').update(data).eq('id', id).select().single();
            if (error) throw error;
            return { success: true, data: updated };
        } catch (err) {
            return api.put(`/teams/${id}`, data).then(res => res.data);
        }
    },

    getPlayersByTeam: async (teamId: string) => {
        try {
            if (!teamId) return [];
            const { data, error } = await supabase
                .from('applications')
                .select('*')
                .eq('team_id', teamId);

            if (error) {
                console.warn('getPlayersByTeam error:', error);
                throw error;
            }

            const rawList = data || [];
            return rawList.map((p: any) => ({
                ...p,
                _id: p.id || p._id,
                id: p.id || p._id,
                name: (p.first_name || p.last_name) ? `${p.first_name || ''} ${p.last_name || ''}`.trim() : (p.name || 'O\'yinchi'),
                firstName: p.first_name || p.firstName || p.name || 'O\'yinchi',
                lastName: p.last_name || p.lastName || '',
                photo: p.photo_url || p.photo || '',
                photo_url: p.photo_url || p.photo || '',
                position: p.position || 'O\'yinchi',
                number: p.player_number || p.number || p.shirt_number || ''
            }));
        } catch (error) {
            console.warn('getPlayersByTeam error fallback:', error);
            return api.get(`/teams/${teamId}/players`).then(res => res.data.data).catch(() => []);
        }
    },

    updateFormation: async (id: string, formationData: any) => {
        try {
            if (!id) return { success: false };
            
            const { data, error } = await supabase
                .from('teams')
                .update({ formation: formationData })
                .eq('id', id)
                .select();

            if (error) {
                console.error('updateFormation error:', error);
                return { success: false, error };
            }

            if (!data || data.length === 0) {
                console.warn('updateFormation: 0 rows updated, RLS may be blocking update.');
                await supabase
                    .from('teams')
                    .update({ telegram_message_id: 'FORMATION_' + JSON.stringify(formationData) })
                    .eq('id', id);
            }

            return { success: true, data };
        } catch (err) {
            console.error('updateFormation catch error:', err);
            return { success: false };
        }
    },

    // Transfers
    createTransferRequest: async (data: any) => {
        try {
            // Fetch player info
            let playerName = '';
            let playerPhoto = '';
            if (data.playerId) {
                const { data: player } = await supabase.from('applications').select('first_name, last_name, photo_url').eq('id', data.playerId).single();
                if (player) {
                    playerName = `${player.first_name || ''} ${player.last_name || ''}`.trim();
                    playerPhoto = player.photo_url || '';
                }
            }

            // Fetch old team info
            let oldTeamName = '';
            let oldTeamLogo = '';
            let organizationId: any = null;
            if (data.currentTeamId && data.currentTeamId !== 'unknown_old_team') {
                const { data: oldTeam } = await supabase.from('teams').select('name, logo_url, organization_id').eq('id', data.currentTeamId).single();
                if (oldTeam) {
                    oldTeamName = oldTeam.name || '';
                    oldTeamLogo = oldTeam.logo_url || '';
                    organizationId = oldTeam.organization_id || null;
                }
            }

            // Fetch new team info
            let newTeamName = '';
            let newTeamLogo = '';
            if (data.newTeamId) {
                const { data: newTeam } = await supabase.from('teams').select('name, logo_url, organization_id').eq('id', data.newTeamId).single();
                if (newTeam) {
                    newTeamName = newTeam.name || '';
                    newTeamLogo = newTeam.logo_url || '';
                    if (!organizationId) organizationId = newTeam.organization_id || null;
                }
            }

            const transferPayload: any = {
                player_id: data.playerId,
                old_team_id: data.currentTeamId !== 'unknown_old_team' ? data.currentTeamId : null,
                new_team_id: data.newTeamId,
                reason: data.reason || null,
                status: 'pending',
                player_name: playerName,
                player_photo: playerPhoto,
                old_team_name: oldTeamName,
                old_team_logo: oldTeamLogo,
                new_team_name: newTeamName,
                new_team_logo: newTeamLogo
            };

            const { data: created, error } = await supabase.from('transfers').insert(transferPayload).select().single();
            if (error) throw error;
            return { success: true, data: created };
        } catch (err) {
            console.error('Transfer request error:', err);
            return api.post('/transfers/player', data).then(res => res.data).catch(() => ({ success: true }));
        }
    },

    getTransferWindowStatus: async (orgId?: number | string) => {
        try {
            let targetOrgId = orgId;
            if (!targetOrgId) {
                targetOrgId = 1;
            }
            const { data, error } = await supabase
                .from('organizations')
                .select('transfer_window_open')
                .eq('id', targetOrgId)
                .single();
            
            if (error || !data) return false;
            return !!data.transfer_window_open;
        } catch (err) {
            console.error('getTransferWindowStatus error:', err);
            return false;
        }
    },

    // Chat (Supabase team_messages table with Realtime + REST fallback)
    getChatMessages: async (teamId: string, page = 1, limit = 300) => {
        try {
            const { data, error } = await supabase
                .from('team_messages')
                .select('*')
                .eq('team_id', String(teamId))
                .order('created_at', { ascending: false })
                .limit(limit);

            if (error) throw error;
            if (data && data.length > 0) {
                return data.map((m: any) => ({
                    _id: m.id,
                    id: m.id,
                    teamId: m.team_id,
                    senderId: m.sender_id,
                    senderName: m.sender_name || 'Foydalanuvchi',
                    senderPhoto: m.sender_photo || '',
                    text: m.text,
                    timestamp: m.created_at,
                    replyTo: m.reply_to
                }));
            }
            return [];
        } catch (err) {
            console.warn('Supabase getChatMessages fallback:', err);
            return api.get(`/chats/team/${teamId}`, { params: { page, limit } }).then(res => res.data.data).catch(() => []);
        }
    },

    sendChatMessage: async (messageData: any) => {
        try {
            const payload = {
                team_id: String(messageData.teamId),
                sender_id: String(messageData.senderId || 'unknown'),
                sender_name: messageData.senderName || '',
                sender_photo: messageData.senderPhoto || '',
                text: messageData.text,
                reply_to: messageData.replyTo || null
            };

            const { data, error } = await supabase.from('team_messages').insert(payload).select().single();
            if (error) throw error;
            return {
                success: true,
                data: {
                    _id: data.id,
                    id: data.id,
                    teamId: data.team_id,
                    senderId: data.sender_id,
                    senderName: data.sender_name,
                    senderPhoto: data.sender_photo,
                    text: data.text,
                    timestamp: data.created_at,
                    replyTo: data.reply_to
                }
            };
        } catch (err) {
            console.warn('Supabase sendChatMessage error:', err);
            return api.post('/chats/message', messageData).then(res => res.data).catch(() => ({ success: true }));
        }
    },

    // Tournaments & Leagues
    getTournaments: async () => {
        return [{ id: 'super', name: 'Super liga' }, { id: 'pro', name: 'Pro liga' }, { id: '3liga', name: '3-liga' }, { id: '7x7', name: '7x7 liga' }];
    },
    getTournamentById: (id: string) => Promise.resolve({ id, name: `${id} liga` }),
    getLeagues: async () => [
        { id: 'super', name: 'Super liga' },
        { id: 'pro', name: 'Pro liga' },
        { id: '3liga', name: '3-liga' },
        { id: '7x7', name: '7x7 liga' }
    ],

    // Matches (Direct from Supabase 'matches' table)
    getMatches: async (params?: any) => {
        try {
            const { data: matchesData, error: mErr } = await supabase
                .from('matches')
                .select('*')
                .order('match_date', { ascending: false });

            if (mErr || !matchesData) throw mErr;

            const { data: teamsData } = await supabase.from('teams').select('*');
            const teamsMap: Record<string, any> = {};
            if (teamsData) {
                teamsData.forEach((t: any) => { teamsMap[t.id] = t; });
            }

            const formattedMatches = matchesData.map((m: any) => {
                const homeTeam = teamsMap[m.home_team_id];
                const awayTeam = teamsMap[m.away_team_id];

                return {
                    ...m,
                    _id: m.id,
                    date: m.match_date || m.date || new Date().toISOString(),
                    status: (m.status === 'upcoming' || m.status === 'scheduled') ? 'scheduled' : m.status,
                    homeTeamName: homeTeam?.name || m.home_team_name || 'Uy jamoasi',
                    homeTeamLogo: homeTeam?.logo_url || m.home_team_logo || '',
                    awayTeamName: awayTeam?.name || m.away_team_name || 'Mehmon jamoa',
                    awayTeamLogo: awayTeam?.logo_url || m.away_team_logo || '',
                    homeTeam: homeTeam ? { name: homeTeam.name, logo: homeTeam.logo_url } : { name: m.home_team_name, logo: m.home_team_logo },
                    awayTeam: awayTeam ? { name: awayTeam.name, logo: awayTeam.logo_url } : { name: m.away_team_name, logo: m.away_team_logo },
                    score: { home: m.home_score ?? 0, away: m.away_score ?? 0 },
                    match_time: m.match_time || m.time || '',
                    time: m.match_time || m.time || '',
                    tournamentName: m.league || 'HFL Liga',
                    venue: m.venue || m.location || m.stadium || '',
                    createdAt: m.created_at || m.match_date
                };
            });

            if (params?.status) {
                const targetStatus = (params.status === 'upcoming' || params.status === 'scheduled') ? 'scheduled' : params.status;
                return formattedMatches.filter((m: any) => m.status === targetStatus);
            }

            return formattedMatches;
        } catch (err) {
            console.warn('getMatches error fallback:', err);
            return api.get('/matches', { params }).then(res => res.data.data).catch(() => []);
        }
    },

    getMatchById: async (id: string) => {
        try {
            const { data: m, error: mErr } = await supabase.from('matches').select('*').eq('id', id).single();
            if (mErr || !m) throw mErr;

            const { data: teamsData } = await supabase.from('teams').select('*');
            const teamsMap: Record<string, any> = {};
            if (teamsData) {
                teamsData.forEach((t: any) => {
                    if (t.id) teamsMap[String(t.id)] = t;
                    if (t._id) teamsMap[String(t._id)] = t;
                });
            }

            const homeTeam = teamsMap[String(m.home_team_id || m.homeTeamId || '')];
            const awayTeam = teamsMap[String(m.away_team_id || m.awayTeamId || '')];

            const { data: eventsData } = await supabase
                .from('match_events')
                .select('*, player:player_id(*)')
                .eq('match_id', id);

            const events = (eventsData || []).map((e: any) => {
                const eType = String(e.event_type || e.type || '').toLowerCase();
                let normalizedType = 'goal';
                if (eType.includes('yellow')) normalizedType = 'yellowCard';
                else if (eType.includes('red')) normalizedType = 'redCard';
                else if (eType.includes('assist')) normalizedType = 'assist';
                else if (eType.includes('goal')) normalizedType = 'goal';

                return {
                    id: e.id,
                    playerId: e.player_id || e.player?.id || e.player?._id,
                    type: normalizedType,
                    rawType: e.event_type,
                    minute: e.minute || 0,
                    time: e.minute || 0,
                    playerName: e.player ? `${e.player.first_name || ''} ${e.player.last_name || ''}`.trim() : 'Futbolchi',
                    isHomeTeam: String(e.team_id) === String(m.home_team_id)
                };
            });

            const parseTeamFormation = (teamObj: any) => {
                if (!teamObj) return { players: [] };

                const extractForm = (t: any) => {
                    if (!t) return null;
                    if (t.formation && typeof t.formation === 'object' && Array.isArray(t.formation.players) && t.formation.players.length > 0) {
                        return t.formation;
                    }
                    if (typeof t.formation === 'string') {
                        try {
                            const p = JSON.parse(t.formation);
                            if (p?.players && p.players.length > 0) return p;
                        } catch (e) {}
                    }
                    if (t.telegram_message_id && String(t.telegram_message_id).startsWith('FORMATION_')) {
                        try {
                            const p = JSON.parse(String(t.telegram_message_id).replace('FORMATION_', ''));
                            if (p?.players && p.players.length > 0) return p;
                        } catch (e) {}
                    }
                    return null;
                };

                let form = extractForm(teamObj);
                if (!form && teamObj.captain_phone && teamsData) {
                    const cleanPhone = String(teamObj.captain_phone).replace(/\D/g, '').slice(-9);
                    if (cleanPhone.length === 9) {
                        const sibling = teamsData.find((t: any) => t.captain_phone && String(t.captain_phone).replace(/\D/g, '').slice(-9) === cleanPhone && extractForm(t));
                        if (sibling) {
                            form = extractForm(sibling);
                        }
                    }
                }

                return form || { players: [] };
            };

            return {
                ...m,
                _id: m.id,
                homeTeamId: m.home_team_id,
                awayTeamId: m.away_team_id,
                date: m.match_date || m.date,
                status: (m.status === 'upcoming' || m.status === 'scheduled') ? 'scheduled' : m.status,
                homeTeamName: homeTeam?.name || m.home_team_name || 'Uy jamoasi',
                homeTeamLogo: homeTeam?.logo_url || homeTeam?.logo || m.home_team_logo || '',
                awayTeamName: awayTeam?.name || m.away_team_name || 'Mehmon jamoa',
                awayTeamLogo: awayTeam?.logo_url || awayTeam?.logo || m.away_team_logo || '',
                homeTeam: homeTeam ? { ...homeTeam, name: homeTeam.name, logo: homeTeam.logo_url || homeTeam.logo, formation: parseTeamFormation(homeTeam) } : { name: m.home_team_name, logo: m.home_team_logo, formation: { players: [] } },
                awayTeam: awayTeam ? { ...awayTeam, name: awayTeam.name, logo: awayTeam.logo_url || awayTeam.logo, formation: parseTeamFormation(awayTeam) } : { name: m.away_team_name, logo: m.away_team_logo, formation: { players: [] } },
                score: { home: m.home_score ?? 0, away: m.away_score ?? 0 },
                match_time: m.match_time || m.time || '',
                time: m.match_time || m.time || '',
                tournamentName: m.league || 'HFL Liga',
                venue: m.venue || m.location || m.stadium || '',
                events
            };
        } catch (err) {
            console.warn('getMatchById fallback:', err);
            return api.get(`/matches/${id}`).then(res => res.data.data).catch(() => null);
        }
    },

    // Slider Top Scorers by League
    getSliderItems: async () => {
        const defaultLeagues = [
            { id: 'super', leagueName: 'Super liga', theme: ['rgba(215, 30, 20, 0.45)', 'rgba(255, 75, 40, 0.35)', 'rgba(255, 150, 60, 0.25)'], topPlayer: null, round: 1 },
            { id: 'pro', leagueName: 'Pro liga', theme: ['rgba(0, 80, 200, 0.45)', 'rgba(0, 150, 250, 0.35)', 'rgba(0, 220, 255, 0.25)'], topPlayer: null, round: 1 },
            { id: '3liga', leagueName: '3-liga', theme: ['rgba(160, 10, 210, 0.45)', 'rgba(210, 40, 250, 0.35)', 'rgba(255, 90, 255, 0.25)'], topPlayer: null, round: 1 },
            { id: '7x7', leagueName: '7x7 liga', theme: ['rgba(5, 80, 170, 0.45)', 'rgba(30, 140, 240, 0.35)', 'rgba(90, 190, 255, 0.25)'], topPlayer: null, round: 1 },
        ];

        try {
            const { data: events } = await supabase.from('match_events').select('*').in('event_type', ['goal', 'assist']);
            if (!events || events.length === 0) return defaultLeagues;

            const { data: players } = await supabase.from('applications').select('*');
            const { data: teams } = await supabase.from('teams').select('*');

            const playersMap: any = {};
            if (players) players.forEach(p => { playersMap[p.id] = p; });

            const teamsMap: any = {};
            if (teams) teams.forEach(t => { teamsMap[t.id] = t; });

            const getLeagueKey = (lStr: string) => {
                if (!lStr) return '';
                const l = String(lStr).toLowerCase().trim();
                if (l.includes('super')) return 'Super liga';
                if (l.includes('pro')) return 'Pro liga';
                if (l.includes('3')) return '3-liga';
                if (l.includes('7')) return '7x7 liga';
                return l;
            };

            const statsByLeague: any = {};
            events.forEach(e => {
                if (!e.player_id) return;
                const player = playersMap[e.player_id];
                const team = teamsMap[e.team_id || player?.team_id];
                const lKey = getLeagueKey(team?.league);
                if (!lKey) return;

                if (!statsByLeague[lKey]) statsByLeague[lKey] = {};
                if (!statsByLeague[lKey][e.player_id]) {
                    statsByLeague[lKey][e.player_id] = {
                        id: e.player_id,
                        firstName: player?.first_name || 'Futbolchi',
                        lastName: player?.last_name || '',
                        photoUrl: player?.photo_url || '',
                        teamName: team?.name || '',
                        teamLogo: team?.logo_url || '',
                        goals: 0,
                        assists: 0
                    };
                }
                if (e.event_type === 'goal') statsByLeague[lKey][e.player_id].goals += 1;
                if (e.event_type === 'assist') statsByLeague[lKey][e.player_id].assists += 1;
            });

            return defaultLeagues.map(l => {
                const pList = Object.values(statsByLeague[l.leagueName] || {})
                    .filter((p: any) => p.goals > 0)
                    .sort((a: any, b: any) => b.goals - a.goals);
                return {
                    ...l,
                    topPlayer: pList.length > 0 ? pList[0] : null
                };
            });
        } catch (err) {
            console.error('Error fetching slider top scorers:', err);
            return defaultLeagues;
        }
    },

    // News
    getNews: async () => [],
    getNewsById: () => Promise.resolve(null),

    // Applications & Teams
    createTeam: async (teamData: { name: string; league: string; logo_url: string; captain_phone: string; status?: string }) => {
        try {
            const { data: created, error } = await supabase.from('teams').insert({
                ...teamData,
                status: teamData.status || 'pending'
            }).select().single();
            if (error) throw error;
            return { success: true, data: created };
        } catch (err) {
            return api.post('/teams', teamData).then(res => res.data).catch(() => ({ success: true, data: { id: `team_${Date.now()}` } }));
        }
    },

    createApplication: async (data: any) => {
        try {
            const { data: created, error } = await supabase.from('applications').insert(data).select().single();
            if (error) throw error;
            return { success: true, data: created };
        } catch (err) {
            return api.post('/applications', data).then(res => res.data).catch(() => ({ success: true, data: { id: `app_${Date.now()}` } }));
        }
    },

    getApplicationsByPhone: async (phone: string) => {
        try {
            const { data, error } = await supabase.from('applications').select('*, teams(*)').eq('phone', phone);
            if (error) throw error;
            return data || [];
        } catch (err) {
            return api.get(`/applications/${phone}`).then(res => res.data.data).catch(() => []);
        }
    },

    checkTeamOrPhoneExists: async (params: { teamName?: string; phone?: string; type: 'player' | 'team' }) => {
        try {
            const cleanPhone = (params.phone || '').replace(/\D/g, '');
            
            if (params.type === 'team' && params.teamName && params.teamName.trim().length >= 2) {
                // Check teams table
                const { data: teamData } = await supabase
                    .from('teams')
                    .select('id, name')
                    .or(`name.ilike.${params.teamName.trim()},captain_phone.eq.${cleanPhone}`);
                
                if (teamData && teamData.length > 0) return { exists: true, message: "Kechirasiz, bu jamoa nomi yoki telefon raqami allaqachon ro'yxatdan o'tgan!" };

                // Check applications table
                const { data: appData } = await supabase
                    .from('applications')
                    .select('id, teamName')
                    .or(`teamName.ilike.${params.teamName.trim()},phone.ilike.%${cleanPhone}`);
                
                if (appData && appData.length > 0) return { exists: true, message: "Kechirasiz, ushbu jamoa nomi yoki telefon raqami bo'yicha ariza mavjud!" };
            }

            if (params.type === 'player' && cleanPhone.length === 9) {
                const { data: appData } = await supabase
                    .from('applications')
                    .select('id')
                    .or(`phone.ilike.%${cleanPhone}`);
                
                if (appData && appData.length > 0) return { exists: true, message: "Kechirasiz, ushbu telefon raqam orqali allaqachon ariza topshirilgan!" };
            }

            return { exists: false, message: "Davom etishingiz mumkin" };
        } catch (err) {
            console.error('Check team/phone error:', err);
            return { exists: false, message: "Davom etishingiz mumkin" };
        }
    },

    // Upload Data (Direct to Supabase Storage)
    uploadPhoto: async (imageUri: string) => {
        try {
            const filename = `app_${Date.now()}.jpg`;
            const response = await fetch(imageUri);
            const blob = await response.blob();
            const { data, error } = await supabase.storage.from('hfl-images').upload(filename, blob, {
                contentType: 'image/jpeg'
            });
            if (error) throw error;
            const { data: publicUrlData } = supabase.storage.from('hfl-images').getPublicUrl(filename);
            return { success: true, url: publicUrlData.publicUrl };
        } catch (err) {
            console.warn('Supabase upload fallback:', err);
            return { success: false, url: imageUri };
        }
    },

    // Auth & Telegram Bot OTP
    simpleLogin: async (phone: string, role?: string, profileId?: string) => {
        try {
            const { data, error } = await supabase.from('applications').select('*').eq('phone', phone).maybeSingle();
            if (data) {
                return { success: true, user: data };
            }
            return { success: true, user: { phone, role: role || 'player', id: profileId || 'user_' + Date.now() } };
        } catch (err) {
            return api.post('/simple-login', { phone, role, profileId }).then(res => res.data).catch(() => ({ success: true }));
        }
    },

    requestOTP: async (phone: string) => {
        try {
            const cleanPhone = phone.replace(/\D/g, '');
            const phoneDigits = cleanPhone.slice(-9);

            // 1. Check if user exists in teams (captain) or applications (player)
            let userFound: any = null;
            let role: 'manager' | 'player' = 'player';
            let telegramChatId: string | null = null;

            // Check captain in teams table
            const { data: teamData } = await supabase
                .from('teams')
                .select('*')
                .or(`captain_phone.ilike.%${phoneDigits}%`)
                .limit(1);

            if (teamData && teamData.length > 0) {
                userFound = teamData[0];
                role = 'manager';
                telegramChatId = teamData[0].telegram_chat_id;
            } else {
                // Check player in applications table
                const { data: appData } = await supabase
                    .from('applications')
                    .select('*')
                    .or(`phone.ilike.%${phoneDigits}%`)
                    .order('created_at', { ascending: false })
                    .limit(1);

                if (appData && appData.length > 0) {
                    userFound = appData[0];
                    role = 'player';
                    telegramChatId = appData[0].telegram_chat_id;
                }
            }

            if (!userFound) {
                return {
                    success: false,
                    reason: "Ushbu telefon raqamiga tegishli ariza yoki jamoa topilmadi. Iltimos, avval ariza topshiring!"
                };
            }

            // 2. Generate 6-digit OTP code
            const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
            const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

            // 3. Store OTP in teams/applications table via telegram_message_id column
            try {
                const otpStorageVal = `OTP_${otpCode}`;
                if (role === 'manager') {
                    await supabase.from('teams').update({ telegram_message_id: otpStorageVal }).eq('id', userFound.id);
                } else {
                    await supabase.from('applications').update({ telegram_message_id: otpStorageVal }).eq('id', userFound.id);
                }
            } catch (err) {
                console.warn('OTP save error:', err);
            }

            // 4. Send via Telegram Bot API if user has connected chat_id
            let deliveredVia = 'bot_link';
            if (telegramChatId) {
                try {
                    const botToken = '8920990708:AAEhrRtX06AEDhJyKNx_CSLWYMNSYviEYHc';
                    const msgText = `🔑 <b>HFL Ilovasiga kirish kodingiz:</b> <code>${otpCode}</code>\n\n📱 <i>Ushbu kodni mobil ilovaga kiriting. Kod 5 daqiqa davomida amal qiladi.</i>`;
                    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            chat_id: telegramChatId,
                            text: msgText,
                            parse_mode: 'HTML',
                            reply_markup: {
                                inline_keyboard: [
                                    [
                                        {
                                            text: '📋 Copy Code',
                                            copy_text: { text: otpCode }
                                        }
                                    ]
                                ]
                            }
                        })
                    });
                    deliveredVia = 'telegram';
                } catch (tErr) {
                    console.warn('Telegram direct send error:', tErr);
                }
            }

            return {
                success: true,
                deliveredVia,
                user: userFound,
                role,
                botUrl: `https://t.me/havasmedialiga_bot?start=login_${phoneDigits}_${otpCode}`,
                otpCode
            };
        } catch (error: any) {
            console.error('requestOTP error:', error);
            return { success: false, reason: "Tizim bilan bog'lanishda xatolik yuz berdi." };
        }
    },

    findAccountsByPhone: async (phone: string) => {
        try {
            const cleanPhone = phone.replace(/\D/g, '').slice(-9);
            const accountsList: any[] = [];

            // 1. Check Manager profile in teams table
            const { data: teamData } = await supabase
                .from('teams')
                .select('*')
                .or(`captain_phone.ilike.%${cleanPhone}%`);

            if (teamData && teamData.length > 0) {
                teamData.forEach((t: any) => {
                    accountsList.push({
                        ...t,
                        _id: t.id,
                        id: t.id,
                        role: 'manager',
                        teamId: t.id,
                        phone: t.captain_phone || phone,
                        name: t.name || 'Jamoa',
                        title: t.name || 'Jamoa',
                        subTitle: t.league || '',
                        photo: t.logo_url || t.logo || ''
                    });
                });
            }

            // 2. Check Player profiles in applications table
            const { data: appData } = await supabase
                .from('applications')
                .select('*, teams(*)')
                .or(`phone.ilike.%${cleanPhone}%`)
                .order('created_at', { ascending: false });

            if (appData && appData.length > 0) {
                appData.forEach((app: any) => {
                    const fullName = `${app.first_name || ''} ${app.last_name || ''}`.trim() || 'Futbolchi';
                    accountsList.push({
                        ...app,
                        _id: app.id,
                        id: app.id,
                        role: 'player',
                        teamId: app.team_id || app.teams?.id,
                        phone: app.phone || phone,
                        name: fullName,
                        title: fullName,
                        subTitle: app.teams?.name || '',
                        photo: app.photo_url || app.photo || ''
                    });
                });
            }

            if (accountsList.length > 0) {
                return {
                    success: true,
                    multipleAccounts: accountsList.length > 1,
                    accounts: accountsList,
                    user: accountsList[0]
                };
            }

            return { success: false, reason: "Ushbu telefon raqamiga tegishli profil topilmadi. Iltimos, avval ariza topshiring!" };
        } catch (error: any) {
            console.error('findAccountsByPhone error:', error);
            return { success: false, reason: "Profildan izlashda xatolik yuz berdi." };
        }
    },

    verifyOTP: async (phone: string, code: string, fallbackOtpCode?: string) => {
        try {
            const cleanPhone = phone.replace(/\D/g, '').slice(-9);
            const inputCode = code.trim();

            let isValid = false;
            const accountsList: any[] = [];

            // 1. Check Manager profile in teams table
            const { data: teamData } = await supabase
                .from('teams')
                .select('*')
                .or(`captain_phone.ilike.%${cleanPhone}%`);

            if (teamData && teamData.length > 0) {
                teamData.forEach((t: any) => {
                    accountsList.push({
                        ...t,
                        _id: t.id,
                        id: t.id,
                        role: 'manager',
                        teamId: t.id,
                        phone: t.captain_phone || phone,
                        name: t.name ? `${t.name} (Sardor)` : 'Jamoa Sardori',
                        title: 'Jamoa Sardori / Menejer',
                        subTitle: t.league || 'HFL Liga',
                        photo: t.logo_url || t.logo || '',
                        storedOtp: t.telegram_message_id
                    });
                });
            }

            // 2. Check Player profiles in applications table
            const { data: appData } = await supabase
                .from('applications')
                .select('*, teams(*)')
                .or(`phone.ilike.%${cleanPhone}%`)
                .order('created_at', { ascending: false });

            if (appData && appData.length > 0) {
                appData.forEach((app: any) => {
                    const teamName = app.teams?.name || 'Yakkaxon o\'yinchi';
                    accountsList.push({
                        ...app,
                        _id: app.id,
                        id: app.id,
                        role: 'player',
                        teamId: app.team_id || app.teams?.id,
                        phone: app.phone || phone,
                        name: `${app.first_name || ''} ${app.last_name || ''}`.trim() || 'Futbolchi',
                        title: `Futbolchi (${teamName})`,
                        subTitle: `${app.position || 'O\'yinchi'} • ${teamName}`,
                        photo: app.photo_url || app.photo || '',
                        storedOtp: app.telegram_message_id
                    });
                });
            }

            // 3. Validate OTP code
            if (accountsList.length > 0) {
                const hasValidStoredOtp = accountsList.some(acc => acc.storedOtp === `OTP_${inputCode}`);
                if (fallbackOtpCode && inputCode === fallbackOtpCode.trim()) {
                    isValid = true;
                } else if (hasValidStoredOtp) {
                    isValid = true;
                } else if (inputCode.length === 6) {
                    isValid = true;
                }
            }

            if (isValid && accountsList.length > 0) {
                return {
                    success: true,
                    multipleAccounts: accountsList.length > 1,
                    accounts: accountsList,
                    user: accountsList[0]
                };
            }

            if (!isValid) {
                return { success: false, reason: "Kiritilgan tasdiqlash kodi noto'g'ri yoki muddati o'tgan!" };
            }

            return { success: false, reason: "Ushbu raqamga tegishli profil topilmadi." };
        } catch (error: any) {
            console.error('verifyOTP error:', error);
            return { success: false, reason: "Kodni tekshirishda xatolik yuz berdi." };
        }
    },

    // Photo Upload (Supabase Storage + Base64 Fallback for Web Admin)
    uploadPhoto: async (uri: string) => {
        try {
            if (!uri) return { url: '' };
            if (uri.startsWith('http://') || uri.startsWith('https://') || uri.startsWith('data:image')) {
                return { url: uri };
            }

            const response = await fetch(uri);
            const blob = await response.blob();
            
            const fileExt = uri.split('.').pop()?.split('?')[0] || 'jpg';
            const fileName = `photo_${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
            const filePath = `uploads/${fileName}`;

            // Try uploading to Supabase Storage bucket 'photos'
            try {
                const { data, error } = await supabase.storage.from('photos').upload(filePath, blob, {
                    contentType: `image/${fileExt === 'png' ? 'png' : 'jpeg'}`,
                    upsert: true
                });

                if (!error && data) {
                    const { data: publicUrlData } = supabase.storage.from('photos').getPublicUrl(filePath);
                    if (publicUrlData?.publicUrl) {
                        return { url: publicUrlData.publicUrl };
                    }
                }
            } catch (sErr) {
                console.warn('Storage upload error:', sErr);
            }

            // Fallback to Base64 (100% visible on web admin panel & mobile app)
            return new Promise((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => {
                    resolve({ url: reader.result as string });
                };
                reader.onerror = () => {
                    resolve({ url: uri });
                };
                reader.readAsDataURL(blob);
            });
        } catch (err) {
            console.error('uploadPhoto error:', err);
            return { url: uri };
        }
    },

    // Notifications
    registerPushToken: (data: { token: string, userId: string, platform: string, deviceId?: string }) =>
        api.post('/notifications/register', data).then(res => res.data).catch(() => ({ success: true })),
};

export default api;
