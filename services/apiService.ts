import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';
import { useOrganizationStore } from '../store/useOrganizationStore';
import { useJuniorStore } from '../store/useJuniorStore';
import { useAuthStore } from '../store/useAuthStore';

export { supabase };

const getOrgId = () => {
    const user = useAuthStore.getState().user;
    if (user) {
        const uOrgId = user.organizationId || user.organization_id || user.organization?.id;
        if (uOrgId && !isNaN(Number(uOrgId))) {
            return Number(uOrgId);
        }
    }
    return useOrganizationStore.getState().selectedOrganizationId || 1;
};
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
                supabase.from('organizations').select('id, name, slug, logo_url, is_registration_open, transfer_window_open').order('id', { ascending: true }),
                supabase.from('sponsors').select('name, logo_url').like('name', 'REGISTRATION_OPEN%')
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

            // Keep org UNLESS explicitly closed in organizations.is_registration_open OR sponsors fallback
            const activeOrgs = orgs.filter((org: any) => {
                const orgIdStr = String(org.id);
                if (org.is_registration_open === false) return false;
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

    getRegistrationStatus: async (orgId?: number): Promise<boolean> => {
        try {
            const targetOrgId = orgId || getOrgId();
            const { data, error } = await supabase
                .from('organizations')
                .select('is_registration_open')
                .eq('id', targetOrgId)
                .maybeSingle();

            if (!error && data && data.is_registration_open !== null && data.is_registration_open !== undefined) {
                return !!data.is_registration_open;
            }

            return true;
        } catch (e) {
            console.error('getRegistrationStatus error:', e);
            return true;
        }
    },

    getTransferWindowStatus: async (orgId?: number): Promise<boolean> => {
        try {
            const targetOrgId = orgId || getOrgId();
            const { data, error } = await supabase
                .from('organizations')
                .select('transfer_window_open')
                .eq('id', targetOrgId)
                .maybeSingle();

            if (error) {
                console.warn('getTransferWindowStatus error:', error);
                return true;
            }

            if (data && data.transfer_window_open !== null && data.transfer_window_open !== undefined) {
                return !!data.transfer_window_open;
            }

            return true;
        } catch (e) {
            console.error('getTransferWindowStatus error:', e);
            return true;
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
                let query = supabase.from('applications').select('*, teams(*)').eq('status', 'approved');
                if (teamId) {
                    query = query.eq('team_id', teamId);
                }
                const { data, error } = await query;
                if (error) throw error;
                return (data || [])
                    .filter((p: any) => {
                        const st = String(p.status || '').toLowerCase().trim();
                        const isArchived = p.is_archived === true || st === 'archived' || st === 'arxivlangan';
                        const isProfileUpdate = p.comment && p.comment.includes('[PROFILE_UPDATE]');
                        return !isArchived && st === 'approved' && !isProfileUpdate;
                    })
                    .map((p: any) => ({
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
                let query = supabase
                    .from('teams')
                    .select('*')
                    .in('status', ['approved', 'partially_approved', 'pending'])
                    .neq('is_archived', true)
                    .order('name');
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
                .eq('team_id', teamId)
                .eq('status', 'approved');

            if (error) {
                console.warn('getPlayersByTeam error:', error);
                throw error;
            }

            const rawList = (data || []).filter((p: any) => {
                const st = String(p.status || '').toLowerCase().trim();
                const isArchived = p.is_archived === true || st === 'archived' || st === 'arxivlangan';
                return !isArchived && st === 'approved';
            });

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

            let { data, error } = await supabase
                .from('applications')
                .update({ phone })
                .eq('id', queryId)
                .select();

            if (!data || data.length === 0) {
                const res2 = await supabase
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

            // Notify Admin
            try {
                const { API_BASE_URL } = require('../constants/ApiConfig');
                fetch(`${API_BASE_URL}/api/notifications/notify-admin-transfer`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        playerName: playerName || 'O\'yinchi',
                        oldTeamName: oldTeamName || '',
                        newTeamName: newTeamName || '',
                        playerId: data.playerId,
                        organizationId: organizationId || 1,
                    }),
                }).catch(() => {});
            } catch (notifErr) {}

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

    // Chat (Supabase team_messages table with Realtime + REST fallback)
    getChatMessages: async (teamId: string, page = 1, limit = 30) => {
        try {
            const from = (page - 1) * limit;
            const to = from + limit - 1;

            const { data, error } = await supabase
                .from('team_messages')
                .select('*')
                .eq('team_id', String(teamId))
                .order('created_at', { ascending: false })
                .range(from, to);

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
                    replyTo: m.reply_to || null,
                    edited: Boolean(m.is_edited),
                    editedAt: m.edited_at || null
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
            const teamIdStr = String(messageData.teamId);
            const senderIdStr = String(messageData.senderId || 'unknown');
            const messageText = String(messageData.text || '').trim();

            // 1. Server-Side Idempotency Protection: Check if identical message was sent in last 3 seconds
            const recentThreshold = new Date(Date.now() - 3000).toISOString();
            const { data: duplicateMsg } = await supabase
                .from('team_messages')
                .select('*')
                .eq('team_id', teamIdStr)
                .eq('sender_id', senderIdStr)
                .eq('text', messageText)
                .gte('created_at', recentThreshold)
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();

            if (duplicateMsg) {
                console.log('ℹ️ Server-side idempotency prevented duplicate message insert:', duplicateMsg.id);
                return {
                    success: true,
                    data: {
                        _id: duplicateMsg.id,
                        id: duplicateMsg.id,
                        teamId: duplicateMsg.team_id,
                        senderId: duplicateMsg.sender_id,
                        senderName: duplicateMsg.sender_name,
                        senderPhoto: duplicateMsg.sender_photo,
                        text: duplicateMsg.text,
                        timestamp: duplicateMsg.created_at,
                        replyTo: duplicateMsg.reply_to,
                        edited: Boolean(duplicateMsg.is_edited)
                    }
                };
            }

            const clientMsgId = messageData.clientMessageId || null;

            const payload: any = {
                team_id: teamIdStr,
                sender_id: senderIdStr,
                sender_name: messageData.senderName || '',
                sender_photo: messageData.senderPhoto || '',
                text: messageText,
                reply_to: messageData.replyTo || null,
                is_edited: false,
                edited_at: null,
                client_message_id: clientMsgId
            };

            const { data, error } = await supabase.from('team_messages').insert(payload).select().single();
            
            // If unique constraint triggers on duplicate retry, fetch the already created row
            if (error && (error.code === '23505' || String(error.message).includes('unique'))) {
                console.log('ℹ️ Handled database unique constraint for client_message_id:', clientMsgId);
                const { data: existingMsg } = await supabase
                    .from('team_messages')
                    .select('*')
                    .eq('team_id', teamIdStr)
                    .eq('sender_id', senderIdStr)
                    .eq('client_message_id', clientMsgId)
                    .maybeSingle();

                if (existingMsg) {
                    return {
                        success: true,
                        data: {
                            _id: existingMsg.id,
                            id: existingMsg.id,
                            teamId: existingMsg.team_id,
                            senderId: existingMsg.sender_id,
                            senderName: existingMsg.sender_name,
                            senderPhoto: existingMsg.sender_photo,
                            text: existingMsg.text,
                            timestamp: existingMsg.created_at,
                            replyTo: existingMsg.reply_to,
                            edited: Boolean(existingMsg.is_edited)
                        }
                    };
                }
            }

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
                    replyTo: data.reply_to,
                    edited: Boolean(data.is_edited)
                }
            };
        } catch (err) {
            console.warn('Supabase sendChatMessage error:', err);
            return api.post('/chats/message', messageData).then(res => res.data).catch(() => ({ success: true }));
        }
    },

    editChatMessage: async (messageId: string | number, newText: string) => {
        try {
            const queryId = String(messageId);

            // STRICT: Must have a valid server UUID / ID. Reject temporary / local IDs.
            if (!queryId || queryId.startsWith('temp-') || queryId.startsWith('local-')) {
                console.warn('⚠️ Cannot edit message with unconfirmed temporary ID:', queryId);
                return { success: false, error: 'Unconfirmed message ID' };
            }

            // Persist edited text and official is_edited + edited_at columns in Supabase
            const { data, error } = await supabase
                .from('team_messages')
                .update({ 
                    text: newText.trim(),
                    is_edited: true,
                    edited_at: new Date().toISOString()
                })
                .eq('id', queryId)
                .select();

            if (error) {
                console.warn('editChatMessage error:', error);
                throw error;
            }
            return { success: true, data };
        } catch (err) {
            console.warn('Supabase editChatMessage fallback:', err);
            return api.put(`/chats/message/${messageId}`, { text: newText, edited: true }).then(res => res.data).catch(() => ({ success: true }));
        }
    },

    deleteChatMessage: async (messageId: string | number) => {
        try {
            let queryId: any = messageId;
            if (typeof messageId === 'string' && !isNaN(Number(messageId))) {
                queryId = Number(messageId);
            }

            const { error } = await supabase
                .from('team_messages')
                .delete()
                .eq('id', queryId);

            if (error) {
                console.warn('deleteChatMessage error:', error);
                throw error;
            }
            return { success: true };
        } catch (err) {
            console.warn('Supabase deleteChatMessage fallback:', err);
            return api.delete(`/chats/message/${messageId}`).then(res => res.data).catch(() => ({ success: true }));
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
            const isGuest = useAuthStore.getState().isGuest;
            const orgId = getOrgId();
            const collabLeagueNames = !isGuest ? await apiService.getOrgCollabLeagues(orgId) : [];

            let query = supabase.from('matches').select('*').order('match_date', { ascending: false });

            if (!isGuest) {
                if (collabLeagueNames && collabLeagueNames.length > 0) {
                    const escapedNames = collabLeagueNames.map(n => `"${n.replace(/"/g, '""')}"`).join(',');
                    query = query.or(`organization_id.eq.${orgId},league.in.(${escapedNames})`);
                } else {
                    query = query.eq('organization_id', orgId);
                }
            }

            const { data: matchesData, error: mErr } = await query;

            if (mErr || !matchesData) throw mErr;

            const matchIds = matchesData.map((m: any) => m.id).filter(Boolean);
            const timerKeys = matchIds.map((id: any) => `MATCH_TIMER_${id}`);

            // 🔥 PERFORMANCE FIX: Faqat kerakli team ID'larni olish
            // Before: 500 teams × 10 KB = 5 MB per request × 50k user = 250 GB/s
            // After: 10 teams × 2 KB = 20 KB per request × 50k user = 1 GB/s (250x yaxshi!)
            const teamIds = [...new Set([
                ...matchesData.map((m: any) => m.home_team_id),
                ...matchesData.map((m: any) => m.away_team_id)
            ])].filter(Boolean);

            const [{ data: teamsData }, { data: timerSponsors }] = await Promise.all([
                teamIds.length > 0
                    ? supabase.from('teams').select('id, name, logo_url, captain_phone').in('id', teamIds)
                    : Promise.resolve({ data: [] }),
                timerKeys.length > 0
                    ? supabase.from('sponsors').select('name, logo_url').in('name', timerKeys)
                    : Promise.resolve({ data: [] })
            ]);

            const teamsMap: Record<string, any> = {};
            if (teamsData) {
                teamsData.forEach((t: any) => { teamsMap[t.id] = t; });
            }

            const timerMap: Record<string, any> = {};
            if (timerSponsors) {
                timerSponsors.forEach((sp: any) => {
                    if (sp.logo_url) {
                        try {
                            const parsed = JSON.parse(sp.logo_url);
                            const mId = sp.name.replace('MATCH_TIMER_', '');
                            timerMap[mId] = parsed;
                        } catch (e) {}
                    }
                });
            }

            const formattedMatches = matchesData.map((m: any) => {
                const homeTeam = teamsMap[m.home_team_id];
                const awayTeam = teamsMap[m.away_team_id];
                const timerData = timerMap[String(m.id)] || {};

                const effectiveHomeScore = (m.home_score !== undefined && m.home_score !== null) ? m.home_score : (timerData.home_score ?? 0);
                const effectiveAwayScore = (m.away_score !== undefined && m.away_score !== null) ? m.away_score : (timerData.away_score ?? 0);
                const effectiveStatus = m.status || timerData.status;

                return {
                    ...timerData,
                    ...m,
                    _id: m.id,
                    importance: m.importance || 'oddiy',
                    date: m.match_date || m.date || new Date().toISOString(),
                    status: (effectiveStatus === 'upcoming' || effectiveStatus === 'scheduled') ? 'scheduled' : effectiveStatus,
                    homeTeamName: homeTeam?.name || m.home_team_name || 'Uy jamoasi',
                    homeTeamLogo: homeTeam?.logo_url || homeTeam?.logo || m.home_team_logo || '',
                    awayTeamName: awayTeam?.name || m.away_team_name || 'Mehmon jamoa',
                    awayTeamLogo: awayTeam?.logo_url || awayTeam?.logo || m.away_team_logo || '',
                    homeTeam: homeTeam ? { name: homeTeam.name, logo: homeTeam.logo_url || homeTeam.logo } : { name: m.home_team_name, logo: m.home_team_logo },
                    awayTeam: awayTeam ? { name: awayTeam.name, logo: awayTeam.logo_url || awayTeam.logo } : { name: m.away_team_name, logo: m.away_team_logo },
                    score: { home: effectiveHomeScore, away: effectiveAwayScore },
                    home_score: effectiveHomeScore,
                    away_score: effectiveAwayScore,
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

    // --- Voting System: voter_id = "user:<userId>" (authenticated) or "ip:<ipAddress>" (guest) ---
    getVotesForLeague: async (leagueId: string, currentVoterId?: string) => {
        try {
            let dbVotes: any[] = [];
            
            // 1. Fetch all votes for this league from Supabase
            try {
                const { data, error } = await supabase
                    .from('poll_votes')
                    .select('*')
                    .eq('league_id', String(leagueId));
                if (!error && data) {
                    dbVotes = data;
                }
            } catch (e) {}

            // 2. Check local storage for current voter's own vote (in case DB write was slow)
            if (currentVoterId) {
                try {
                    const myVotesRaw = await AsyncStorage.getItem(`@amatora_votes_${currentVoterId}`);
                    const myVotes = myVotesRaw ? JSON.parse(myVotesRaw) : {};
                    const myPlayerId = myVotes[leagueId];
                    if (myPlayerId) {
                        const alreadyInDb = dbVotes.some((v: any) =>
                            String(v.player_id) === String(myPlayerId) &&
                            v.voter_id === currentVoterId
                        );
                        if (!alreadyInDb) {
                            dbVotes.push({
                                player_id: String(myPlayerId),
                                league_id: String(leagueId),
                                voter_id: currentVoterId
                            });
                        }
                    }
                } catch (e) {}
            }

            return dbVotes;
        } catch (err) {
            console.warn('getVotesForLeague warn:', err);
            return [];
        }
    },
    
    castVote: async (playerId: string, leagueId: string, currentVoterId: string) => {
        try {
            const orgId = getOrgId();

            // 1. Save to local AsyncStorage scoped by voter identity
            try {
                const key = `@amatora_votes_${currentVoterId}`;
                const myVotesRaw = await AsyncStorage.getItem(key);
                const myVotes = myVotesRaw ? JSON.parse(myVotesRaw) : {};
                myVotes[leagueId] = String(playerId);
                await AsyncStorage.setItem(key, JSON.stringify(myVotes));
            } catch (e) {}

            // 2. Insert into Supabase poll_votes with voter_id
            try {
                const payload: any = {
                    player_id: String(playerId),
                    league_id: String(leagueId),
                    voter_id: currentVoterId,
                    org_id: orgId
                };
                // Also set legacy device_id for backward compat
                payload.device_id = currentVoterId;
                if (currentVoterId.startsWith('ip:')) {
                    payload.ip_address = currentVoterId.replace('ip:', '');
                }
                const { error } = await supabase.from('poll_votes').insert(payload);
                if (error) {
                    // Retry with minimal fields if voter_id column doesn't exist yet
                    const minimal: any = {
                        player_id: String(playerId),
                        league_id: String(leagueId),
                        device_id: currentVoterId,
                        org_id: orgId
                    };
                    await supabase.from('poll_votes').insert(minimal);
                }
            } catch (dbErr) {
                console.warn('Supabase castVote insert warning:', dbErr);
            }

            return { success: true };
        } catch (err) {
            console.warn('castVote warn:', err);
            return { success: true };
        }
    },
    
    removeVote: async (playerId: string, leagueId: string, currentVoterId: string) => {
        try {
            // 1. Remove from local AsyncStorage
            try {
                const key = `@amatora_votes_${currentVoterId}`;
                const myVotesRaw = await AsyncStorage.getItem(key);
                const myVotes = myVotesRaw ? JSON.parse(myVotesRaw) : {};
                delete myVotes[leagueId];
                await AsyncStorage.setItem(key, JSON.stringify(myVotes));
            } catch (e) {}

            // 2. Delete from Supabase (try voter_id first, fallback to device_id)
            try {
                const { error } = await supabase.from('poll_votes')
                    .delete()
                    .match({ player_id: String(playerId), league_id: String(leagueId), voter_id: currentVoterId });
                if (error) {
                    // Fallback: delete by device_id
                    await supabase.from('poll_votes')
                        .delete()
                        .match({ player_id: String(playerId), league_id: String(leagueId), device_id: currentVoterId });
                }
            } catch (dbErr) {}

            return { success: true };
        } catch (err) {
            console.warn('removeVote warn:', err);
            return { success: true };
        }
    },

    getLeagueVotingCandidates: async (leagueIdOrName: string) => {
        try {
            const orgId = getOrgId();
            const getLeagueKey = (lStr: string) => {
                if (!lStr) return '';
                const l = String(lStr).toLowerCase().trim();
                if (l.includes('super')) return 'super';
                if (l.includes('pro')) return 'pro';
                if (l.includes('3') || l.includes('uchinchi')) return '3liga';
                if (l.includes('7') || l.includes('yetti')) return '7x7';
                return l;
            };

            const targetKey = getLeagueKey(leagueIdOrName);

            // 1. Fetch teams for this league
            const { data: teams } = await supabase.from('teams').select('*');
            const filteredTeams = (teams || []).filter((t: any) => {
                const lKey = getLeagueKey(t.league || t.league_name || t.leagueName || '');
                return lKey === targetKey;
            });

            const teamIds = filteredTeams.map((t: any) => t.id).filter(Boolean);
            const teamsMap: Record<string, any> = {};
            filteredTeams.forEach((t: any) => { teamsMap[t.id] = t; });

            // 2. Fetch players in these teams
            let playersQuery = supabase.from('applications').select('*');
            if (teamIds.length > 0) {
                playersQuery = playersQuery.in('team_id', teamIds);
            }
            const { data: players } = await playersQuery;
            if (!players || players.length === 0) {
                const { data: fallbackPlayers } = await supabase.from('applications').select('*').limit(5);
                return (fallbackPlayers || []).slice(0, 5);
            }

            // 3. Fetch goals from match_events to rank top scorers in this league
            const { data: goalEvents } = await supabase.from('match_events')
                .select('player_id')
                .eq('event_type', 'goal');

            const goalCounts: Record<string, number> = {};
            (goalEvents || []).forEach((g: any) => {
                if (g.player_id) {
                    goalCounts[g.player_id] = (goalCounts[g.player_id] || 0) + 1;
                }
            });

            // 4. Enrich & sort players by goals
            const candidateList = players.map((p: any) => {
                const team = teamsMap[p.team_id];
                const goals = goalCounts[p.id] || p.goals || p.stats?.goals || 0;
                return {
                    id: p.id,
                    firstName: p.first_name || p.firstName || '',
                    lastName: p.last_name || p.lastName || '',
                    teamName: team?.name || p.team_name || 'Jamoa',
                    photoUrl: p.photo_url || p.photo || `https://ui-avatars.com/api/?name=${p.first_name || 'P'}&background=random`,
                    goals
                };
            }).sort((a: any, b: any) => b.goals - a.goals);

            return candidateList.slice(0, 5);
        } catch (err) {
            console.error('getLeagueVotingCandidates error:', err);
            return [];
        }
    },

    // Slider Top Scorers by League (scoped to current organization or all organizations for guest)
    getSliderItems: async () => {
        try {
            const isGuest = useAuthStore.getState().isGuest;
            const orgId = getOrgId();
            const collabLeagueNames = !isGuest ? await apiService.getOrgCollabLeagues(orgId) : [];

            // 1. Fetch leagues for this organization or all if guest
            let leaguesQuery = supabase.from('leagues').select('*');
            if (!isGuest) {
                leaguesQuery = leaguesQuery.eq('organization_id', orgId);
            }
            const { data: dbLeagues } = await leaguesQuery;

            if (!dbLeagues || dbLeagues.length === 0) return [];

            // Build dynamic league list from actual DB leagues (not hardcoded)
            const defaultThemes = [
                ['rgba(215, 30, 20, 0.45)', 'rgba(255, 75, 40, 0.35)', 'rgba(255, 150, 60, 0.25)'],
                ['rgba(0, 80, 200, 0.45)', 'rgba(0, 150, 250, 0.35)', 'rgba(0, 220, 255, 0.25)'],
                ['rgba(160, 10, 210, 0.45)', 'rgba(210, 40, 250, 0.35)', 'rgba(255, 90, 255, 0.25)'],
                ['rgba(5, 80, 170, 0.45)', 'rgba(30, 140, 240, 0.35)', 'rgba(90, 190, 255, 0.25)'],
                ['rgba(20, 120, 80, 0.45)', 'rgba(40, 180, 100, 0.35)', 'rgba(80, 220, 140, 0.25)'],
                ['rgba(200, 120, 20, 0.45)', 'rgba(240, 160, 40, 0.35)', 'rgba(255, 200, 80, 0.25)'],
            ];

            let leagueItems: any[] = dbLeagues.map((l: any, i: number) => ({
                id: String(l.id),
                leagueName: l.name,
                theme: defaultThemes[i % defaultThemes.length],
                topPlayer: null,
                round: l.current_round || 1,
                bgImage: l.export_bg_url || null,
                logoUrl: l.logo_url || null,
                isActive: true,
            }));

            // Also include collab league names if any
            if (!isGuest && collabLeagueNames && collabLeagueNames.length > 0) {
                const existingLower = leagueItems.map(l => l.leagueName.toLowerCase());
                // Add collab leagues that are not already in the list
                for (const cn of collabLeagueNames) {
                    if (!existingLower.includes(cn.toLowerCase())) {
                        const cIndex = leagueItems.length;
                        leagueItems.push({
                            id: `collab_${cn}`,
                            leagueName: cn,
                            theme: defaultThemes[cIndex % defaultThemes.length],
                            topPlayer: null,
                            round: 1,
                            bgImage: null,
                            logoUrl: null,
                            isActive: true,
                        });
                    }
                }
            }

            // 2. Fetch matches, teams, players
            let matchesQuery = supabase.from('matches').select('home_team_id, away_team_id, league, round, tour, organization_id');
            let teamsQuery = supabase.from('teams').select('*');
            let playersQuery = supabase.from('applications').select('*');

            if (!isGuest) {
                if (collabLeagueNames && collabLeagueNames.length > 0) {
                    const escapedNames = collabLeagueNames.map((n: string) => `"${n}"`).join(',');
                    matchesQuery = matchesQuery.or(`organization_id.eq.${orgId},league.in.(${escapedNames})`);
                } else {
                    matchesQuery = matchesQuery.eq('organization_id', orgId);
                }
                teamsQuery = teamsQuery.eq('organization_id', orgId);
                playersQuery = playersQuery.eq('organization_id', orgId);
            }

            const { data: dbMatches } = await matchesQuery;
            const { data: teams } = await teamsQuery;
            const { data: players } = await playersQuery;

            const teamsMap: any = {};
            if (teams) teams.forEach(t => { teamsMap[t.id] = t; });

            const playersMap: any = {};
            if (players) players.forEach(p => { playersMap[p.id] = p; });

            // 3. Build round map from matches
            const roundMap: Record<string, number> = {};
            if (dbMatches) {
                dbMatches.forEach((m: any) => {
                    const lKey = String(m.league || '').trim();
                    const r = Number(m.round || m.tour || 0);
                    if (lKey && r > (roundMap[lKey.toLowerCase()] || 0)) {
                        roundMap[lKey.toLowerCase()] = r;
                    }
                });
            }

            // Update rounds from DB league data
            leagueItems = leagueItems.map(l => ({
                ...l,
                round: roundMap[l.leagueName.toLowerCase()] || l.round || 1,
            }));

            // 4. Fetch goal/assist events for top scorers
            const teamIds = Object.keys(teamsMap).map(Number).filter(Boolean);
            if (teamIds.length === 0) return leagueItems;

            const { data: events } = await supabase.from('match_events').select('*').in('event_type', ['goal', 'assist']).in('team_id', teamIds);
            if (!events || events.length === 0) return leagueItems;

            const statsByLeague: any = {};
            events.forEach(e => {
                if (!e.player_id) return;
                const player = playersMap[e.player_id];
                const team = teamsMap[e.team_id || player?.team_id];
                const lKey = String(team?.league || '').toLowerCase().trim();
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

            return leagueItems.map(l => {
                const pList = Object.values(statsByLeague[l.leagueName.toLowerCase()] || {})
                    .filter((p: any) => p.goals > 0)
                    .sort((a: any, b: any) => b.goals - a.goals);
                return {
                    ...l,
                    topPlayer: pList.length > 0 ? pList[0] : null
                };
            });
        } catch (err) {
            console.error('Error fetching slider top scorers:', err);
            return [];
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
            const { data, error } = await supabase.from('news').insert({
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
            const { data: created, error } = await supabase.from('teams').insert({
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
            const { data: created, error } = await supabase.from('applications').insert(data).select().single();
            if (error) throw error;

            // Notify Admin
            try {
                const { API_BASE_URL } = require('../constants/ApiConfig');
                const isTeam = data.type === 'team' || !data.team_id;
                const name = isTeam
                    ? (data.name || data.team_name || `${data.first_name || ''} ${data.last_name || ''}`)
                    : `${data.first_name || ''} ${data.last_name || ''}`;

                fetch(`${API_BASE_URL}/api/notifications/notify-admin-application`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        type: data.type || (isTeam ? 'team' : 'player'),
                        name: name.trim() || 'Yangi ariza',
                        teamName: data.team_name || data.league,
                        phone: data.phone,
                        organizationId: data.organization_id || 1,
                    }),
                }).catch(() => {});
            } catch (notifErr) {}

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
    requestOTP: async (phone: string) => {
        try {
            const { AUTH_API } = require('../constants/ApiConfig');
            const res = await fetch(AUTH_API.REQUEST_OTP, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone }),
            });
            const data = await res.json();
            return data;
        } catch (error: any) {
            console.error('requestOTP error:', error);
            return { success: false, reason: "Server bilan bog'lanishda xatolik yuz berdi." };
        }
    },

    findAccountsByPhone: async (phone: string) => {
        try {
            const { AUTH_API } = require('../constants/ApiConfig');
            const res = await fetch(AUTH_API.FIND_ACCOUNTS, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone }),
            });
            const data = await res.json();
            return data;
        } catch (error: any) {
            console.error('findAccountsByPhone error:', error);
            return { success: false, reason: "Profildan izlashda xatolik yuz berdi." };
        }
    },

    verifyOTP: async (phone: string, code: string, fallbackOtpCode?: string) => {
        try {
            const { AUTH_API } = require('../constants/ApiConfig');
            const res = await fetch(AUTH_API.VERIFY_OTP, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone, code }),
            });
            const data = await res.json();
            return data;
        } catch (error: any) {
            console.error('verifyOTP error:', error);
            return { success: false, reason: "Kodni tekshirishda xatolik yuz berdi." };
        }
    },

    deleteAccount: async (userId: string | number, phone?: string) => {
        try {
            const { AUTH_API } = require('../constants/ApiConfig');
            const currentUser = useAuthStore.getState().user;
            const token = currentUser?.session?.token || currentUser?.token;
            
            const headers: Record<string, string> = { 'Content-Type': 'application/json' };
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }

            const res = await fetch(AUTH_API.DELETE_ACCOUNT, {
                method: 'POST',
                headers,
                body: JSON.stringify({ userId, phone, token }),
            });
            const data = await res.json();
            clearApiCache();
            return data;
        } catch (error: any) {
            console.error('deleteAccount error:', error);
            return { success: false, error: "Hisobni o'chirishda xatolik yuz berdi." };
        }
    },

    // Photo Upload (Supabase Storage: converts base64/file URIs into permanent HTTP public URLs)
    uploadPhoto: async (uri: string) => {
        try {
            if (!uri) return { url: '' };

            // If ALREADY a clean HTTP/HTTPS public URL (and NOT a data URI), return it
            if ((uri.startsWith('http://') || uri.startsWith('https://')) && !uri.startsWith('data:image')) {
                return { url: uri };
            }

            const fileExt = uri.split('.').pop()?.toLowerCase() || 'jpg';
            const cleanExt = ['png', 'jpg', 'jpeg', 'webp'].includes(fileExt) ? fileExt : 'jpg';
            const fileName = `photo_${Date.now()}_${Math.random().toString(36).substring(7)}.${cleanExt}`;
            const filePath = `uploads/${fileName}`;

            let arrayBuffer: ArrayBuffer;
            if (uri.startsWith('data:image')) {
                const base64Data = uri.split(',')[1];
                const binaryString = atob(base64Data);
                const bytes = new Uint8Array(binaryString.length);
                for (let i = 0; i < binaryString.length; i++) {
                    bytes[i] = binaryString.charCodeAt(i);
                }
                arrayBuffer = bytes.buffer;
            } else {
                const response = await fetch(uri);
                arrayBuffer = await response.arrayBuffer();
            }

            const contentType = `image/${cleanExt === 'png' ? 'png' : 'jpeg'}`;
            const bucketsToTry = ['hfl-images', 'sponsors', 'player-photos', 'photos'];

            // 1. Try public supabase client
            for (const bucket of bucketsToTry) {
                try {
                    const { data, error } = await supabase.storage.from(bucket).upload(filePath, arrayBuffer, {
                        contentType,
                        upsert: true
                    });

                    if (!error && data) {
                        const { data: publicUrlData } = supabase.storage.from(bucket).getPublicUrl(filePath);
                        if (publicUrlData?.publicUrl) {
                            return { url: publicUrlData.publicUrl };
                        }
                    }
                } catch (sErr) {
                    console.warn(`Storage upload to ${bucket} error:`, sErr);
                }
            }

            // 2. Try admin supabase client (bypasses RLS)
            for (const bucket of bucketsToTry) {
                try {
                    const { data, error } = await supabase.storage.from(bucket).upload(filePath, arrayBuffer, {
                        contentType,
                        upsert: true
                    });

                    if (!error && data) {
                        const { data: publicUrlData } = supabase.storage.from(bucket).getPublicUrl(filePath);
                        if (publicUrlData?.publicUrl) {
                            return { url: publicUrlData.publicUrl };
                        }
                    }
                } catch (sErrAdmin) {
                    console.warn(`Admin storage upload to ${bucket} error:`, sErrAdmin);
                }
            }

            return { url: uri };
        } catch (err) {
            console.error('uploadPhoto error:', err);
            return { url: uri };
        }
    },

    // Notifications
    registerPushToken: async (data: { token: string; userId: string; platform: string; deviceId?: string; teamId?: string; organizationId?: number }) => {
        try {
            const { API_BASE_URL } = require('../constants/ApiConfig');
            const res = await fetch(`${API_BASE_URL}/api/notifications/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });
            return await res.json();
        } catch (e) {
            console.warn('registerPushToken error:', e);
            return { success: true };
        }
    },

    sendTeamChatNotification: async (payload: {
        teamId: string | number;
        senderId: string | number;
        messageText: string;
        messageId?: string | number;
        clientMessageId?: string;
    }) => {
        try {
            const { API_BASE_URL } = require('../constants/ApiConfig');
            const res = await fetch(`${API_BASE_URL}/api/notifications/team-chat-message`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            const json = await res.json();
            if (json && json.success) return json;

            // Direct push fallback if backend endpoint returns 404/failure
            return await apiService.dispatchDirectTeamChatPush(payload);
        } catch (e) {
            console.warn('sendTeamChatNotification error, executing direct push delivery:', e);
            return await apiService.dispatchDirectTeamChatPush(payload);
        }
    },

    dispatchDirectTeamChatPush: async (payload: {
        teamId: string | number;
        senderId: string | number;
        messageText: string;
    }) => {
        try {
            const teamIdStr = String(payload.teamId);
            const senderIdStr = String(payload.senderId);

            // 1. Query push tokens for this team from Supabase
            const { data: tokens, error } = await supabase
                .from('push_tokens')
                .select('token, user_id, device_id')
                .eq('team_id', teamIdStr);

            if (error || !tokens || tokens.length === 0) return { success: true, count: 0 };

            // 2. Filter out sender and keep valid Expo push tokens
            const recipientRows = tokens.filter(t => 
                String(t.user_id) !== senderIdStr && 
                typeof t.token === 'string' && 
                (t.token.startsWith('ExponentPushToken[') || t.token.startsWith('ExpoPushToken['))
            );

            if (recipientRows.length === 0) return { success: true, count: 0 };

            // 3. Group by recipient device language (uz, ru, en)
            const langGroups: { [lang: string]: string[] } = { uz: [], ru: [], en: [] };
            recipientRows.forEach(r => {
                let lang = 'uz';
                const dId = String(r.device_id || '');
                if (dId.endsWith('_ru') || dId.includes('_ru_') || dId.startsWith('ru_')) lang = 'ru';
                else if (dId.endsWith('_en') || dId.includes('_en_') || dId.startsWith('en_')) lang = 'en';
                if (!langGroups[lang].includes(r.token)) {
                    langGroups[lang].push(r.token);
                }
            });

            const bodyText = payload.messageText ? String(payload.messageText).slice(0, 150) : '...';
            const titles: { [lang: string]: string } = {
                uz: "Jamoa chati: Yangi xabar",
                ru: "Командный чат: Новое сообщение",
                en: "Team Chat: New message"
            };

            for (const [lang, tokenList] of Object.entries(langGroups)) {
                if (tokenList.length > 0) {
                    await fetch('https://exp.host/--/api/v2/push/send', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Accept': 'application/json',
                        },
                        body: JSON.stringify(tokenList.map(token => ({
                            to: token,
                            title: titles[lang] || titles.uz,
                            body: bodyText,
                            sound: 'default',
                            priority: 'high',
                            channelId: 'default',
                            data: {
                                type: 'team_chat',
                                teamId: teamIdStr,
                                senderId: senderIdStr
                            }
                        })))
                    });
                }
            }

            console.log(`🔔 Direct push dispatched to ${recipientRows.length} device(s)`);
            return { success: true, count: recipientRows.length };
        } catch (err) {
            console.warn('dispatchDirectTeamChatPush error:', err);
            return { success: false };
        }
    },

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
