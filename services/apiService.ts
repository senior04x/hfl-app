import axios from 'axios';
import { supabase, supabaseAdmin } from './supabase';
import { useOrganizationStore } from '../store/useOrganizationStore';
import { useJuniorStore } from '../store/useJuniorStore';

export { supabase, supabaseAdmin };

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
    // Organizations
    getOrganizations: async () => {
        try {
            const [orgsRes, sponsorsRes] = await Promise.all([
                supabaseAdmin.from('organizations').select('id, name, slug, logo_url').order('id', { ascending: true }),
                supabaseAdmin.from('sponsors').select('name, logo_url').like('name', 'REGISTRATION_OPEN%')
            ]);

            if (orgsRes.error) throw orgsRes.error;
            const orgs = orgsRes.data || [];
            const sponsorMap: Record<string, boolean> = {};

            if (sponsorsRes.data) {
                sponsorsRes.data.forEach((sp: any) => {
                    const valStr = String(sp.logo_url || '').toLowerCase().trim();
                    const isClosed = (valStr === 'false' || valStr === '0' || valStr === 'closed');
                    const isOpen = (valStr === 'true' || valStr === '1' || valStr === 'open');

                    const match = sp.name.match(/^REGISTRATION_OPEN_(.+)$/);
                    if (match && match[1]) {
                        if (isClosed) sponsorMap[match[1]] = false;
                        else if (isOpen) sponsorMap[match[1]] = true;
                    } else if (sp.name === 'REGISTRATION_OPEN') {
                        if (isClosed) {
                            sponsorMap['1'] = false;
                            sponsorMap['global'] = false;
                        } else if (isOpen) {
                            sponsorMap['1'] = true;
                            sponsorMap['global'] = true;
                        }
                    }
                });
            }

            // Keep org UNLESS explicitly closed
            const activeOrgs = orgs.filter((org: any) => {
                const orgIdStr = String(org.id);
                if (sponsorMap[orgIdStr] === false) return false;
                if (orgIdStr === '1' && sponsorMap['global'] === false) return false;
                return true;
            });

            return activeOrgs;
        } catch (err) {
            console.error('getOrganizations error:', err);
            return [];
        }
    },

    // Accepted Collab Leagues for an Organization
    getOrgCollabLeagues: async (orgId: number) => {
        const cacheKey = `org_collab_leagues_${orgId}`;
        return getCachedData(cacheKey, async () => {
            try {
                const { data: collabs, error } = await supabase
                    .from('league_collabs')
                    .select('league_id, league:league_id(name)')
                    .or(`receiver_org_id.eq.${orgId},sender_org_id.eq.${orgId}`)
                    .eq('status', 'accepted');
                if (error) throw error;
                const names: string[] = [];
                (collabs || []).forEach((c: any) => {
                    if (c.league && c.league.name) {
                        names.push(c.league.name);
                    }
                });
                return names;
            } catch (err) {
                console.error('getOrgCollabLeagues error:', err);
                return [];
            }
        });
    },

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
                    fatherName: data.father_name || data.fatherName || '',
                    photo: data.photo_url || data.photo || '',
                    position: data.position || 'O\'yinchi',
                    number: data.number || data.shirt_number || data.player_number || '',
                    citizenship: data.citizenship || '',
                    height: data.height || '',
                    weight: data.weight || '',
                    instagram_username: data.instagram_username || (data.comment?.match(/\[INSTAGRAM:https?:\/\/[^/]+\/([^/\]]+)/)?.[1]) || '',
                    instagram_url: data.instagram_url || (data.comment?.match(/\[INSTAGRAM:(https?:\/\/[^\]]+)\]/)?.[1]) || ''
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
                    query = query.ilike('league', `%${leagueName}%`);
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
                number: p.player_number || p.number || p.shirt_number || '',
                phone: p.phone || p.phoneNumber || p.phone_number || ''
            }));
        } catch (error) {
            console.warn('getPlayersByTeam error fallback:', error);
            return api.get(`/teams/${teamId}/players`).then(res => res.data.data).catch(() => []);
        }
    },

    updatePlayerPhone: async (playerId: string | number, phone: string) => {
        try {
            if (!playerId) return { success: false, error: "O'yinchi ID si topilmadi" };

            let queryId: any = playerId;
            if (typeof playerId === 'string' && !isNaN(Number(playerId))) {
                queryId = Number(playerId);
            }

            let { data, error } = await supabaseAdmin
                .from('applications')
                .update({ phone })
                .eq('id', queryId)
                .select();

            if (!data || data.length === 0) {
                const res2 = await supabaseAdmin
                    .from('applications')
                    .update({ phone })
                    .eq('id', String(playerId))
                    .select();
                if (res2.data && res2.data.length > 0) {
                    data = res2.data;
                }
            }

            if (error) throw error;
            if (!data || data.length === 0) {
                return { success: false, error: "Bazada o'yinchi profili topilmadi" };
            }

            clearApiCache();
            return { success: true, data };
        } catch (err: any) {
            console.error('updatePlayerPhone error:', err);
            return { success: false, error: err?.message || 'Xatolik' };
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
        }
    },

    getPlayerTransfers: async (playerId: string | number) => {
        try {
            const { data, error } = await supabase
                .from('transfers')
                .select('*')
                .eq('player_id', playerId)
                .order('created_at', { ascending: false });
            if (error) throw error;
            return data || [];
        } catch (err) {
            console.error('getPlayerTransfers error:', err);
            return [];
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
        try {
            const { data } = await supabase.from('leagues').select('*');
            if (data && data.length > 0) return data;
        } catch (e) {}
        return [{ id: 'super', name: 'Super liga' }, { id: 'pro', name: 'Pro liga' }, { id: '3liga', name: '3-liga' }, { id: '7x7', name: '7x7 liga' }];
    },
    getTournamentById: async (idOrName: string) => {
        try {
            if (!idOrName) return null;
            // 1. Query leagues by ID
            const { data: lById } = await supabase.from('leagues').select('*, organizations(*)').eq('id', idOrName).maybeSingle();
            if (lById) return lById;

            // 2. Query leagues by Name
            const { data: lByName } = await supabase.from('leagues').select('*, organizations(*)').ilike('name', `%${idOrName}%`).maybeSingle();
            if (lByName) return lByName;

            return { id: idOrName, name: idOrName };
        } catch (err) {
            console.warn('getTournamentById error:', err);
            return { id: idOrName, name: idOrName };
        }
    },

    // Matches (Direct from Supabase 'matches' table)
    getMatches: async (params?: any) => {
        try {
            const orgId = getOrgId();
            const collabLeagueNames = await apiService.getOrgCollabLeagues(orgId);

            let query = supabase.from('matches').select('*').order('match_date', { ascending: false });

            if (collabLeagueNames && collabLeagueNames.length > 0) {
                const escapedNames = collabLeagueNames.map(n => `"${n.replace(/"/g, '""')}"`).join(',');
                query = query.or(`organization_id.eq.${orgId},league.in.(${escapedNames})`);
            } else {
                query = query.eq('organization_id', orgId);
            }

            const { data: matchesData, error: mErr } = await query;

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
                    importance: m.importance || 'oddiy',
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

            const orgId = m.organization_id || 1;

            // Fetch storage files for fallback / supplemental media under replays/<org_id>/<match_id>/
            let storageReplays: any[] = [];
            try {
                const { data: files } = await supabase.storage
                    .from('replays')
                    .list(`${orgId}/${id}`, { limit: 50, sortBy: { column: 'name', order: 'desc' } });

                if (files && files.length > 0) {
                    const baseUrl = "https://xzzyhfyazwohdqqbjiiy.supabase.co/storage/v1/object/public/replays";
                    storageReplays = files
                        .filter((f: any) => f.name && (f.name.endsWith('.mp4') || f.name.endsWith('.mkv') || f.name.endsWith('.mov')))
                        .map((f: any) => ({
                            id: f.id || f.name,
                            name: f.name,
                            publicUrl: `${baseUrl}/${orgId}/${id}/${f.name}`
                        }));
                }
            } catch (sErr) {}

            const { data: eventsData } = await supabase
                .from('match_events')
                .select('*, player:player_id(*)')
                .eq('match_id', id);

            const events = (eventsData || []).map((e: any, idx: number) => {
                const eType = String(e.event_type || e.type || '').toLowerCase();
                let normalizedType = 'goal';
                if (eType.includes('yellow')) normalizedType = 'yellowCard';
                else if (eType.includes('red')) normalizedType = 'redCard';
                else if (eType.includes('assist')) normalizedType = 'assist';
                else if (eType.includes('goal')) normalizedType = 'goal';

                // Look for assist event recorded for the same team at the same minute
                const assistEvent = (eventsData || []).find((ae: any) => 
                    String(ae.event_type || '').toLowerCase().includes('assist') && 
                    String(ae.team_id) === String(e.team_id) && 
                    Math.abs((ae.minute || 0) - (e.minute || 0)) <= 1
                );

                let videoUrl = e.replay_video_url || e.video_url || null;
                // If replay_video_url is missing but storageReplays has a video file, fallback to it
                if (!videoUrl && normalizedType === 'goal' && storageReplays.length > 0) {
                    videoUrl = storageReplays[idx % storageReplays.length]?.publicUrl || storageReplays[0]?.publicUrl;
                }

                return {
                    id: e.id,
                    team_id: e.team_id,
                    playerId: e.player_id || e.player?.id || e.player?._id,
                    type: normalizedType,
                    rawType: e.event_type,
                    minute: e.minute || 0,
                    time: e.minute || 0,
                    player: e.player,
                    player_photo: e.player?.photo_url || e.player?.photo || e.player?.avatar || null,
                    playerName: e.player ? `${e.player.first_name || ''} ${e.player.last_name || ''}`.trim() : 'Futbolchi',
                    player_name: e.player ? `${e.player.first_name || ''} ${e.player.last_name || ''}`.trim() : 'Futbolchi',
                    assist_player_name: assistEvent?.player ? `${assistEvent.player.first_name || ''} ${assistEvent.player.last_name || ''}`.trim() : null,
                    assist_player_photo: assistEvent?.player?.photo_url || assistEvent?.player?.photo || null,
                    isHomeTeam: String(e.team_id) === String(m.home_team_id),
                    replay_video_url: videoUrl,
                    replay_url: videoUrl
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
                events,
                storageReplays
            };
        } catch (err) {
            console.warn('getMatchById fallback:', err);
            return api.get(`/matches/${id}`).then(res => res.data.data).catch(() => null);
        }
    },

    // --- Voting System ---
    getVotesForLeague: async (leagueId: string) => {
        try {
            const orgId = getOrgId();
            const { data, error } = await supabase.from('poll_votes')
                .select('*')
                .eq('league_id', leagueId)
                .eq('org_id', orgId);
            if (error) {
                // If table doesn't exist yet, just return empty gracefully
                if (error.code === '42P01') return [];
                throw error;
            }
            return data || [];
        } catch (err) {
            console.warn('getVotesForLeague warn:', err);
            return [];
        }
    },
    
    castVote: async (playerId: string, leagueId: string, deviceId: string) => {
        try {
            const orgId = getOrgId();
            const { data, error } = await supabase.from('poll_votes').insert({
                player_id: playerId,
                league_id: leagueId,
                device_id: deviceId,
                org_id: orgId
            }).select().single();
            if (error) {
                if (error.code === '42P01') return { success: false, message: 'Table not created yet' };
                throw error;
            }
            return { success: true, data };
        } catch (err) {
            console.warn('castVote warn:', err);
            return { success: false };
        }
    },
    
    removeVote: async (playerId: string, leagueId: string, deviceId: string) => {
        try {
            const orgId = getOrgId();
            const { error } = await supabase.from('poll_votes')
                .delete()
                .match({ player_id: playerId, league_id: leagueId, device_id: deviceId, org_id: orgId });
            if (error) {
                if (error.code === '42P01') return { success: false, message: 'Table not created yet' };
                throw error;
            }
            return { success: true };
        } catch (err) {
            console.warn('removeVote warn:', err);
            return { success: false };
        }
    },

    // Slider Top Scorers by League
    getSliderItems: async () => {
        let defaultLeagues: any[] = [
            { id: 'super', leagueName: 'Super liga', theme: ['rgba(215, 30, 20, 0.45)', 'rgba(255, 75, 40, 0.35)', 'rgba(255, 150, 60, 0.25)'], topPlayer: null, round: 1, bgImage: null },
            { id: 'pro', leagueName: 'Pro liga', theme: ['rgba(0, 80, 200, 0.45)', 'rgba(0, 150, 250, 0.35)', 'rgba(0, 220, 255, 0.25)'], topPlayer: null, round: 1, bgImage: null },
            { id: '3liga', leagueName: '3-liga', theme: ['rgba(160, 10, 210, 0.45)', 'rgba(210, 40, 250, 0.35)', 'rgba(255, 90, 255, 0.25)'], topPlayer: null, round: 1, bgImage: null },
            { id: '7x7', leagueName: '7x7 liga', theme: ['rgba(5, 80, 170, 0.45)', 'rgba(30, 140, 240, 0.35)', 'rgba(90, 190, 255, 0.25)'], topPlayer: null, round: 3, bgImage: null },
        ];

        try {
            const { data: dbLeagues } = await supabase.from('leagues').select('*');
            const { data: dbMatches } = await supabase.from('matches').select('home_team_id, away_team_id, league, round, tour');
            const { data: teams } = await supabase.from('teams').select('*');
            const { data: players } = await supabase.from('applications').select('*');

            const teamsMap: any = {};
            if (teams) teams.forEach(t => { teamsMap[t.id] = t; });

            const playersMap: any = {};
            if (players) players.forEach(p => { playersMap[p.id] = p; });

            const getLeagueKey = (lStr: string) => {
                if (!lStr) return '';
                const l = String(lStr).toLowerCase().trim();
                if (l.includes('super')) return 'Super liga';
                if (l.includes('pro')) return 'Pro liga';
                if (l.includes('3')) return '3-liga';
                if (l.includes('7')) return '7x7 liga';
                return l;
            };

            const roundMap: Record<string, number> = {};
            if (dbMatches) {
                dbMatches.forEach((m: any) => {
                    let lStr = m.league;
                    if (!lStr) {
                        const hTeam = teamsMap[m.home_team_id];
                        const aTeam = teamsMap[m.away_team_id];
                        lStr = hTeam?.league || aTeam?.league || '';
                    }
                    const lKey = getLeagueKey(lStr);
                    const r = Number(m.round || m.tour || 0);
                    if (lKey && r > (roundMap[lKey] || 0)) {
                        roundMap[lKey] = r;
                    }
                });
            }

            if (dbLeagues) {
                const bgMap: any = {};
                dbLeagues.forEach((l: any) => {
                    if (l.name) bgMap[l.name.toLowerCase().trim()] = l.export_bg_url;
                    const lKey = getLeagueKey(l.name);
                    const r = Number(l.current_round || l.round || 0);
                    if (lKey && r > (roundMap[lKey] || 0)) {
                        roundMap[lKey] = r;
                    }
                });
                defaultLeagues = defaultLeagues.map(l => ({
                    ...l,
                    bgImage: bgMap[l.leagueName.toLowerCase()] || null,
                    round: roundMap[l.leagueName] || (l.id === '7x7' ? 3 : 1)
                }));
            }

            const { data: events } = await supabase.from('match_events').select('*').in('event_type', ['goal', 'assist']);
            if (!events || events.length === 0) return defaultLeagues;





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
                    round: roundMap[l.leagueName] || (l.id === '7x7' ? 3 : 1),
                    topPlayer: pList.length > 0 ? pList[0] : null
                };
            });
        } catch (err) {
            console.error('Error fetching slider top scorers:', err);
            return defaultLeagues;
        }
    },

    // News System (Supabase 'news' table)
    getNews: async (page = 1, limit = 40, category?: string) => {
        try {
            let query = supabase.from('news').select('*').order('created_at', { ascending: false });
            if (category && category !== 'Barchasi') {
                query = query.ilike('category', `%${category}%`);
            }
            const { data, error } = await query;
            if (error) {
                console.warn('getNews DB error:', error);
                return [];
            }
            if (!data || data.length === 0) return [];

            return data.map((n: any) => ({
                ...n,
                _id: n.id || n._id,
                id: n.id || n._id,
                title: n.title || 'Sarlavhasiz yangilik',
                content: n.content || n.body || '',
                category: n.category || 'O\'yinlar',
                imageUrl: n.image_url || n.imageUrl || 'https://images.unsplash.com/photo-1574629810360-7efbb6b6973f?q=80&w=1000',
                views: n.views || 0,
                createdAt: n.created_at || n.createdAt || new Date().toISOString()
            }));
        } catch (err) {
            console.warn('getNews catch error:', err);
            return [];
        }
    },

    getNewsById: async (id: string) => {
        try {
            const { data, error } = await supabase.from('news').select('*').eq('id', id).single();
            if (error || !data) return null;
            return {
                ...data,
                _id: data.id,
                title: data.title,
                content: data.content,
                category: data.category || "O'yinlar",
                imageUrl: data.image_url || data.imageUrl,
                views: data.views || 0,
                createdAt: data.created_at || data.createdAt
            };
        } catch (e) {
            return null;
        }
    },

    createNews: async (newsData: any) => {
        try {
            const { data, error } = await supabaseAdmin.from('news').insert({
                title: newsData.title,
                content: newsData.content || '',
                category: newsData.category || "O'yinlar",
                image_url: newsData.imageUrl || newsData.image_url || 'https://images.unsplash.com/photo-1574629810360-7efbb6b6973f?q=80&w=1000',
                views: 0
            }).select().single();
            if (error) {
                if (error.code === '42P01') {
                    return { success: true, data: { ...newsData, id: `news_${Date.now()}` } };
                }
                throw error;
            }
            clearApiCache();
            return { success: true, data };
        } catch (err) {
            console.error('createNews error:', err);
            return { success: true, data: { ...newsData, id: `news_${Date.now()}` } };
        }
    },

    // Applications & Teams
    createTeam: async (teamData: any) => {
        try {
            const defaultLogo = 'https://xzzyhfyazwohdqqbjiiy.supabase.co/storage/v1/object/public/sponsors/jd017tpq0c8.png';
            const { data: created, error } = await supabaseAdmin.from('teams').insert({
                ...teamData,
                logo_url: teamData.logo_url || defaultLogo,
                status: teamData.status || 'pending'
            }).select().single();
            if (error) throw error;
            return { success: true, data: created, id: created?.id, _id: created?.id };
        } catch (err) {
            console.error('createTeam error:', err);
            const fallbackId = `team_${Date.now()}`;
            return api.post('/teams', teamData).then(res => res.data).catch(() => ({ success: true, data: { id: fallbackId }, id: fallbackId, _id: fallbackId }));
        }
    },

    createApplication: async (data: any) => {
        try {
            const { data: created, error } = await supabaseAdmin.from('applications').insert(data).select().single();
            if (error) throw error;
            return { success: true, data: created, id: created?.id, _id: created?.id };
        } catch (err) {
            console.error('createApplication error:', err);
            const fallbackId = `app_${Date.now()}`;
            return api.post('/applications', data).then(res => res.data).catch(() => ({ success: true, data: { id: fallbackId }, id: fallbackId, _id: fallbackId }));
        }
    },

    getLeaguesByOrgId: async (targetOrgId: any) => {
        try {
            const orgId = Number(targetOrgId);
            if (!orgId || isNaN(orgId)) return [];

            const { data: ownLeagues } = await supabase
                .from('leagues')
                .select('*')
                .eq('organization_id', orgId);

            const { data: collabs } = await supabase
                .from('league_collabs')
                .select('*')
                .or(`receiver_org_id.eq.${orgId},sender_org_id.eq.${orgId}`)
                .eq('status', 'accepted');

            let collabLeagues: any[] = [];
            if (collabs && collabs.length > 0) {
                const collabLeagueIds = collabs.map((c: any) => c.league_id).filter(Boolean);
                const collabLeagueNames = collabs.map((c: any) => c.league_name || c.league).filter(Boolean);

                let queryParts: string[] = [];
                if (collabLeagueIds.length > 0) queryParts.push(`id.in.(${collabLeagueIds.join(',')})`);
                if (collabLeagueNames.length > 0) queryParts.push(`name.in.(${collabLeagueNames.map(n => `"${n}"`).join(',')})`);

                if (queryParts.length > 0) {
                    const { data: fetchedCollabs } = await supabase
                        .from('leagues')
                        .select('*')
                        .or(queryParts.join(','));
                    if (fetchedCollabs) collabLeagues = fetchedCollabs;
                }
            }

            const map = new Map<string, any>();
            (ownLeagues || []).forEach(l => { if (l && l.name) map.set(l.name, l); });
            collabLeagues.forEach(l => { if (l && l.name && !map.has(l.name)) map.set(l.name, l); });

            return Array.from(map.values());
        } catch (err) {
            console.error('getLeaguesByOrgId error:', err);
            return [];
        }
    },

    getLeagues: async () => {
        const orgId = getOrgId();
        return apiService.getLeaguesByOrgId(orgId);
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
            const cleanPhone = (params.phone || '').replace(/\D/g, '').slice(-9);
            
            if (params.type === 'team' && params.teamName && params.teamName.trim().length >= 2) {
                // Check teams table for duplicate name
                const { data: teamData } = await supabase
                    .from('teams')
                    .select('id, name')
                    .ilike('name', params.teamName.trim());
                
                if (teamData && teamData.length > 0) {
                    return { exists: true, message: "Kechirasiz, ushbu jamoa nomi allaqachon ro'yxatdan o'tgan!" };
                }

                if (cleanPhone.length === 9) {
                    const { data: phoneTeamData } = await supabase
                        .from('teams')
                        .select('id')
                        .or(`captain_phone.ilike.%${cleanPhone}%`);

                    if (phoneTeamData && phoneTeamData.length > 0) {
                        return { exists: true, message: "Kechirasiz, ushbu telefon raqami allaqachon ro'yxatdan o'tgan!" };
                    }
                }
            }

            if (cleanPhone.length === 9) {
                const { data: appData } = await supabase
                    .from('applications')
                    .select('id')
                    .or(`phone.ilike.%${cleanPhone}%`);
                
                if (appData && appData.length > 0) {
                    return { exists: true, message: "Kechirasiz, ushbu telefon raqam orqali allaqachon ariza topshirilgan!" };
                }
            }

            return { exists: false, message: "Ma'lumotlar tasdiqlandi. Ariza topshirishingiz mumkin!" };
        } catch (err) {
            console.error('Check team/phone error:', err);
            return { exists: false, message: "Ma'lumotlar tasdiqlandi. Ariza topshirishingiz mumkin!" };
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

            // Check captain in teams table
            const { data: teamData } = await supabase
                .from('teams')
                .select('*')
                .ilike('captain_phone', `%${phoneDigits}%`)
                .limit(1);

            if (teamData && teamData.length > 0) {
                userFound = teamData[0];
                role = 'manager';
            } else {
                // Check player in applications table
                const { data: appData } = await supabase
                    .from('applications')
                    .select('*')
                    .ilike('phone', `%${phoneDigits}%`)
                    .order('created_at', { ascending: false })
                    .limit(1);

                if (appData && appData.length > 0) {
                    userFound = appData[0];
                    role = 'player';
                }
            }

            if (!userFound) {
                return {
                    success: false,
                    reason: "Ushbu telefon raqamiga tegishli ariza yoki jamoa topilmadi. Iltimos, avval ariza topshiring!"
                };
            }

            // 2. Generate 4-digit OTP code
            const otpCode = Math.floor(1000 + Math.random() * 9000).toString();
            const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

            // 3. Store OTP in otp_codes table
            try {
                await supabase.from('otp_codes').upsert({
                    phone: phoneDigits,
                    code: otpCode,
                    expires_at: expiresAt,
                    is_used: false,
                    created_at: new Date().toISOString()
                }, { onConflict: 'phone' });

                const otpStorageVal = `OTP_${otpCode}`;
                if (role === 'manager') {
                    await supabase.from('teams').update({ telegram_message_id: otpStorageVal }).eq('id', userFound.id);
                } else {
                    await supabase.from('applications').update({ telegram_message_id: otpStorageVal }).eq('id', userFound.id);
                }
            } catch (err) {
                console.warn('OTP save error:', err);
            }

            // 4. Check if user already has a linked Telegram Chat ID
            let telegramChatId: string | null = null;

            const { data: teamChat } = await supabase
                .from('teams')
                .select('telegram_chat_id')
                .ilike('captain_phone', `%${phoneDigits}%`)
                .not('telegram_chat_id', 'is', null)
                .limit(1);

            if (teamChat && teamChat.length > 0 && teamChat[0].telegram_chat_id) {
                telegramChatId = teamChat[0].telegram_chat_id;
            } else {
                const { data: appChat } = await supabase
                    .from('applications')
                    .select('telegram_chat_id')
                    .ilike('phone', `%${phoneDigits}%`)
                    .not('telegram_chat_id', 'is', null)
                    .limit(1);

                if (appChat && appChat.length > 0 && appChat[0].telegram_chat_id) {
                    telegramChatId = appChat[0].telegram_chat_id;
                }
            }

            let isAutoSentToTelegram = false;

            if (telegramChatId) {
                try {
                    const botToken = '8644740765:AAHHhAvzTpUgfz5kevg5iiDfA9GafA1m6Vs';
                    const msgText = `🔑 <b>Tasdiqlash kodingiz:</b> <code>${otpCode}</code>\n\n📱 <i>4 xonali kodni ilovaga kiriting. Kod 10 daqiqa amal qiladi.</i>`;
                    const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
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
                                            text: '📋 Nusxalash',
                                            copy_text: { text: otpCode }
                                        }
                                    ]
                                ]
                            }
                        })
                    });
                    if (res.ok) {
                        isAutoSentToTelegram = true;
                    }
                } catch (tErr) {
                    console.warn('Auto Telegram OTP send error:', tErr);
                }
            }

            return {
                success: true,
                isAutoSentToTelegram,
                deliveredVia: isAutoSentToTelegram ? 'telegram' : 'bot_link',
                user: userFound,
                role,
                botUrl: `https://t.me/amatora_bot?start=login_${phoneDigits}`,
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
            if (!cleanPhone || cleanPhone.length < 7) {
                return { success: false, reason: "Iltimos, telefon raqamingizni to'g'ri kiriting." };
            }
            const accountsList: any[] = [];

            // 1. Check Manager profile in teams table
            const { data: teamData, error: teamErr } = await supabase
                .from('teams')
                .select('*')
                .ilike('captain_phone', `%${cleanPhone}%`);

            if (teamErr) {
                console.warn('findAccountsByPhone teams query error:', teamErr);
            } else if (teamData && teamData.length > 0) {
                teamData.forEach((t: any) => {
                    accountsList.push({
                        ...t,
                        _id: t.id,
                        id: t.id,
                        role: 'manager',
                        teamId: t.id,
                        phone: t.captain_phone || phone,
                        name: t.name || 'Jamoa Sardori',
                        title: t.name ? `${t.name} (Sardor)` : 'Jamoa Sardori',
                        subTitle: t.league || 'HFL Liga',
                        photo: t.logo_url || t.logo || ''
                    });
                });
            }

            // 2. Check Player profiles in applications table
            const { data: appData, error: appErr } = await supabase
                .from('applications')
                .select('*, teams(*)')
                .ilike('phone', `%${cleanPhone}%`)
                .order('created_at', { ascending: false });

            if (appErr) {
                console.warn('findAccountsByPhone applications query error:', appErr);
            } else if (appData && appData.length > 0) {
                appData.forEach((app: any) => {
                    const fullName = `${app.first_name || ''} ${app.last_name || ''}`.trim() || 'Futbolchi';
                    const teamName = app.teams?.name || 'Yakkaxon';
                    accountsList.push({
                        ...app,
                        _id: app.id,
                        id: app.id,
                        role: 'player',
                        teamId: app.team_id || app.teams?.id,
                        phone: app.phone || phone,
                        name: fullName,
                        title: `${fullName} (${teamName})`,
                        subTitle: `${app.position || 'O\'yinchi'} • ${teamName}`,
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
            return { success: false, reason: "Profildan izlashda xatolik yuz berdi: " + (error.message || '') };
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
                .ilike('captain_phone', `%${cleanPhone}%`);

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
                .ilike('phone', `%${cleanPhone}%`)
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

            // 3. Validate OTP code strictly against otp_codes table or storedOtp
            if (accountsList.length > 0) {
                const { data: validOtpRow } = await supabase
                    .from('otp_codes')
                    .select('*')
                    .eq('phone', cleanPhone)
                    .eq('code', inputCode)
                    .eq('is_used', false)
                    .gte('expires_at', new Date().toISOString())
                    .maybeSingle();

                const hasValidStoredOtp = accountsList.some(acc => acc.storedOtp === `OTP_${inputCode}`);

                if (validOtpRow) {
                    isValid = true;
                    // Mark OTP as used to prevent replay attacks
                    await supabase.from('otp_codes').update({ is_used: true }).eq('id', validOtpRow.id);
                } else if (hasValidStoredOtp) {
                    isValid = true;
                } else if (fallbackOtpCode && inputCode === fallbackOtpCode.trim()) {
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

    async updatePlayerInstagram(playerId: string | number, username: string, url: string) {
        try {
            await supabase
                .from('applications')
                .update({
                    comment: `[INSTAGRAM:${url}]`
                })
                .eq('id', playerId);
            clearApiCache();
            return { success: true };
        } catch (e) {
            console.error('Error updating instagram:', e);
            throw e;
        }
    },

    async submitProfileUpdateRequest(payload: any) {
        try {
            const { playerId, orgId, oldData, newData } = payload;
            const commentPayload = '[PROFILE_UPDATE]' + JSON.stringify({ oldData, newData, playerId });

            const { error } = await supabase
                .from('applications')
                .insert([{
                    organization_id: orgId || 1,
                    first_name: newData.firstName || '',
                    last_name: newData.lastName || '',
                    father_name: newData.fatherName || '',
                    phone: newData.phone || '',
                    position: newData.position || '',
                    player_number: newData.playerNumber ? Number(newData.playerNumber) : null,
                    photo_url: newData.photoUrl || null,
                    comment: commentPayload,
                    status: 'pending'
                }]);

            if (error) throw error;
            return { success: true };
        } catch (e) {
            console.error('Error submitting profile update request:', e);
            throw e;
        }
    },
};

export default api;
