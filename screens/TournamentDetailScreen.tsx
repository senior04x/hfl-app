import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
    Image,
    ScrollView,
    FlatList,
    TextInput,
    Linking,
    Animated,
    Dimensions
} from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
import { BlurView } from 'expo-blur';
import AnimatedBackground from '../components/AnimatedBackground';
import backgroundImage from '../assets/images/backroud-image.png';

import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import Colors from '../constants/Colors';
import { useTeamStore } from '../store/useTeamStore';
import { apiService } from '../services/apiService';
import { supabase } from '../services/supabase';
import { Team } from '../types';
import TournamentDetailSkeleton from '../components/TournamentDetailSkeleton';
import TableSkeleton from '../components/TableSkeleton';
import PlayerListSkeleton from '../components/PlayerListSkeleton';
import MatchesListSkeleton from '../components/MatchesListSkeleton';
import GenericListSkeleton from '../components/GenericListSkeleton';
import SmartImage from '../components/SmartImage';
import { getTeamAbbreviation } from '../utils/stringUtils';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSocket } from '../context/SocketContext';
import { useTranslation } from 'react-i18next';

export default function TournamentDetailScreen({ route, navigation }: any) {
    const { t } = useTranslation();
    const { tournamentId, tournamentName, tournament } = route?.params || {};
    const currentTournamentId = route?.params?.tournamentId || tournamentId; // Ensure we always have it
    const TABS = ['overview', 'standings', 'players', 'matches'] as const;

    const requestedTab = route?.params?.initialTab || route?.params?.tab;
    const initialActiveTab = (requestedTab === 'oyinlar' || requestedTab === 'matches') 
        ? 'matches' 
        : (requestedTab === 'standings' || requestedTab === 'jadval' ? 'standings' : (requestedTab === 'players' || requestedTab === 'oyinchilar' ? 'players' : 'overview'));
    const [activeTab, setActiveTab] = useState<string>(initialActiveTab);

    // Swipe pager refs
    const pagerRef = useRef<FlatList>(null);
    const scrollXPager = useRef(new Animated.Value(0)).current;
    const isTabPressRef = useRef(false);

    // Sync if route params change or initialTab is passed
    useEffect(() => {
        const reqTab = route?.params?.initialTab || route?.params?.tab;
        if (reqTab) {
            const target = (reqTab === 'oyinlar' || reqTab === 'matches') 
                ? 'matches' 
                : (reqTab === 'standings' || reqTab === 'jadval' ? 'standings' : (reqTab === 'players' || reqTab === 'oyinchilar' ? 'players' : 'overview'));
            const idx = TABS.indexOf(target as any);
            if (idx >= 0) {
                setTimeout(() => {
                    handleTabPress(target);
                }, 80);
            }
        }
    }, [route?.params?.initialTab, route?.params?.tab]);
    
    const { teams, setTeams, isLoading: isTeamsLoading, setLoading: setTeamsLoading } = useTeamStore();
    const [isLoading, setIsLoading] = useState(true);
    const [isLoadingStandings, setIsLoadingStandings] = useState(false);
    const [isLoadingPlayers, setIsLoadingPlayers] = useState(false);
    const [isLoadingMatches, setIsLoadingMatches] = useState(false);
    
    // Flags to prevent redundant re-fetching when switching tabs
    const playersLoadedRef = useRef(false);
    const matchesLoadedRef = useRef(false);
    
    const [tournamentData, setTournamentData] = useState<any>(tournament);
    const [organizerInfo, setOrganizerInfo] = useState<any>({
        name: 'HFL SPORT TASHKILOTI',
        logo: '',
        phone: ''
    });
    const [totalPlayersCount, setTotalPlayersCount] = useState<number>(0);
    const [standings, setStandings] = useState<any[]>([]);
    const [topPlayers, setTopPlayers] = useState<any[]>([]);
    const [matches, setMatches] = useState<any[]>([]);
    const [latestMatches, setLatestMatches] = useState<any[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [availableTournaments, setAvailableTournaments] = useState<any[]>([]);
    const [isSeasonSelectorOpen, setIsSeasonSelectorOpen] = useState(false);
    const seasonAnimationValue = useRef(new Animated.Value(0)).current;

    const toggleSeasonSelector = useCallback(() => {
        setIsSeasonSelectorOpen(prev => !prev);
    }, []);

    useEffect(() => {
        Animated.timing(seasonAnimationValue, {
            toValue: isSeasonSelectorOpen ? 1 : 0,
            duration: 300,
            useNativeDriver: false,
        }).start();
    }, [isSeasonSelectorOpen]);

    const [statFilter, setStatFilter] = useState('goals'); // goals, assists, yellowCards, redCards, matchesPlayed
    const [isStatSelectorOpen, setIsStatSelectorOpen] = useState(false);
    const statAnimationValue = useRef(new Animated.Value(0)).current;

    const toggleStatSelector = useCallback(() => {
        setIsStatSelectorOpen(prev => !prev);
    }, []);

    useEffect(() => {
        Animated.timing(statAnimationValue, {
            toValue: isStatSelectorOpen ? 1 : 0,
            duration: 300,
            useNativeDriver: false,
        }).start();
    }, [isStatSelectorOpen]);

    const handleStatSelect = useCallback((stat: string) => {
        setStatFilter(stat);
        setIsStatSelectorOpen(false);
    }, []);

    const { socket, isConnected } = useSocket();
    const CACHE_KEY = `tournament_detail_v2_${currentTournamentId}`;
    const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
    const PLAYERS_CACHE_KEY = `tournament_players_v2_${currentTournamentId}`;
    const MATCHES_CACHE_KEY = `tournament_matches_v2_${currentTournamentId}`;

    /**
     * Load cached data and return whether cache is fresh (< 5 min old).
     * If fresh, no need to re-fetch from network.
     */
    const loadCachedData = async (): Promise<boolean> => {
        try {
            const cached = await AsyncStorage.getItem(CACHE_KEY);
            if (cached) {
                const parsed = JSON.parse(cached);
                if (parsed.tournamentData) setTournamentData(parsed.tournamentData);
                if (parsed.standings) {
                    setStandings(parsed.standings);
                    setTeams(parsed.standings);
                }
                if (parsed.organizerInfo) setOrganizerInfo(parsed.organizerInfo);
                if (parsed.totalPlayersCount !== undefined) setTotalPlayersCount(parsed.totalPlayersCount);
                if (parsed.matches) setMatches(parsed.matches);
                if (parsed.latestMatches) setLatestMatches(parsed.latestMatches);
                if (parsed.availableTournaments) setAvailableTournaments(parsed.availableTournaments);
                setIsLoading(false);

                // Check if cache is still fresh
                const age = Date.now() - (parsed.timestamp || 0);
                return age < CACHE_TTL;
            }
        } catch (e) {
            console.error('Error loading cached tournament details:', e);
        }
        return false;
    };

    const fetchTournamentData = async (isSilent = false) => {
        if (!isSilent && !tournamentData) setIsLoading(true);
        try {
            const navTournament = route?.params?.tournament || tournament;
            const leagueSearchKey = navTournament?.name || currentTournamentId;

            const [t, teamsData] = await Promise.all([
                apiService.getTournamentById(leagueSearchKey || currentTournamentId),
                apiService.getTeams(1, 100, leagueSearchKey)
            ]);

            const mergedTournament = { ...navTournament, ...t };
            if (navTournament?.name) {
                mergedTournament.name = navTournament.name;
            }

            let startDateVal = mergedTournament?.start_date || mergedTournament?.startDate || navTournament?.start_date || navTournament?.startDate;
            let endDateVal = mergedTournament?.end_date || mergedTournament?.endDate || navTournament?.end_date || navTournament?.endDate;

            const tId = mergedTournament?.id || mergedTournament?._id || currentTournamentId;
            if (tId && (!startDateVal || !endDateVal)) {
                try {
                    const { data: dateSponsors } = await supabase.from('sponsors').select('name, logo_url').in('name', [
                        `LEAGUE_START_DATE_${tId}`,
                        `LEAGUE_END_DATE_${tId}`
                    ]);
                    if (dateSponsors) {
                        dateSponsors.forEach((s: any) => {
                            if (s.name === `LEAGUE_START_DATE_${tId}` && !startDateVal) startDateVal = s.logo_url;
                            if (s.name === `LEAGUE_END_DATE_${tId}` && !endDateVal) endDateVal = s.logo_url;
                        });
                    }
                } catch (e) {}
            }

            if (startDateVal) mergedTournament.startDate = startDateVal;
            if (endDateVal) mergedTournament.endDate = endDateVal;

            setTournamentData(mergedTournament);

            const resolvedTeams = teamsData && teamsData.length > 0 ? teamsData : (mergedTournament?.teams || []);

            const sortedStandings = [...resolvedTeams].sort((a: any, b: any) => {
                const ptsA = a.points ?? a.stats?.points ?? a.pts ?? 0;
                const ptsB = b.points ?? b.stats?.points ?? b.pts ?? 0;
                if (ptsB !== ptsA) return ptsB - ptsA;

                const gfA = a.goalsFor ?? a.stats?.goalsFor ?? a.gf ?? 0;
                const gaA = a.goalsAgainst ?? a.stats?.goalsAgainst ?? a.ga ?? 0;
                const gfB = b.goalsFor ?? b.stats?.goalsFor ?? b.gf ?? 0;
                const gaB = b.goalsAgainst ?? b.stats?.goalsAgainst ?? b.ga ?? 0;
                const gdA = a.goalDifference ?? a.stats?.goalDifference ?? a.gd ?? (gfA - gaA);
                const gdB = b.goalDifference ?? b.stats?.goalDifference ?? b.gd ?? (gfB - gaB);
                if (gdB !== gdA) return gdB - gdA;

                if (gfB !== gfA) return gfB - gfA;

                const winsA = a.won ?? a.wins ?? a.stats?.won ?? a.stats?.wins ?? 0;
                const winsB = b.won ?? b.wins ?? b.stats?.won ?? b.stats?.wins ?? 0;
                return winsB - winsA;
            });

            setTeams(sortedStandings);
            setStandings(sortedStandings);

            let orgName = mergedTournament?.organizations?.name || mergedTournament?.organizer || mergedTournament?.organizationName || '';
            let orgLogo = mergedTournament?.organizations?.logo_url || mergedTournament?.organizerLogo || mergedTournament?.organizationLogo || '';
            let orgPhone = mergedTournament?.organizations?.phone || mergedTournament?.organizerPhone || mergedTournament?.phone || '';

            let targetOrgId = mergedTournament?.organization_id || mergedTournament?.organizationId || navTournament?.organization_id || (resolvedTeams.length > 0 ? (resolvedTeams[0].organization_id || resolvedTeams[0].organizationId) : null);

            if (targetOrgId) {
                const { data: orgData } = await supabase.from('organizations').select('*').eq('id', targetOrgId).maybeSingle();
                if (orgData) {
                    orgName = orgData.name || orgData.title || orgData.organization_name || orgName;
                    orgLogo = orgData.logo_url || orgData.logo || orgData.photo_url || orgLogo;
                    orgPhone = orgData.phone || orgData.contact_phone || orgPhone;
                }
            }

            if (!orgName) {
                orgName = 'Havas Futbol Ligasi';
            }
            const computedOrgInfo = { name: orgName, logo: orgLogo, phone: orgPhone };
            setOrganizerInfo(computedOrgInfo);

            const teamIds = resolvedTeams.map((tm: any) => tm.teamId || tm.id || tm._id).filter(Boolean);
            let finalCount = 0;
            let finalMatches: any[] = [];
            let finalLatestMatches: any[] = [];

            if (teamIds.length > 0) {
                const [{ data: pData }, allMatchesData] = await Promise.all([
                    supabase.from('applications').select('id, is_archived, status').eq('status', 'approved').in('team_id', teamIds),
                    apiService.getMatches({ tournamentId: currentTournamentId })
                ]);

                const activePlayers = (pData || []).filter((p: any) => {
                    const st = String(p.status || '').toLowerCase().trim();
                    const isArchived = p.is_archived === true || st === 'archived' || st === 'arxivlangan';
                    return !isArchived && st === 'approved';
                });

                finalCount = activePlayers.length;
                setTotalPlayersCount(finalCount);

                const teamIdsSet = new Set(teamIds.map(String));
                finalMatches = (allMatchesData || []).filter((m: any) => {
                    if (m.tournament_id && String(m.tournament_id) === String(currentTournamentId)) return true;
                    if (m.league_id && String(m.league_id) === String(currentTournamentId)) return true;
                    const homeId = String(m.home_team_id || m.homeTeam?.id || m.homeTeamId);
                    const awayId = String(m.away_team_id || m.awayTeam?.id || m.awayTeamId);
                    return teamIdsSet.has(homeId) || teamIdsSet.has(awayId);
                });

                setMatches(finalMatches);

                const finishedLeagueMatches = finalMatches.filter((m: any) => m.status === 'finished' || m.status === 'completed');
                finalLatestMatches = finishedLeagueMatches.length > 0 ? finishedLeagueMatches.slice(0, 2) : finalMatches.slice(0, 2);
                setLatestMatches(finalLatestMatches);
            } else {
                setTotalPlayersCount(0);
                setMatches([]);
                setLatestMatches([]);
            }

            let seasonQuery = supabase
                .from('leagues')
                .select('*')
                .order('created_at', { ascending: false });

            if (targetOrgId) {
                seasonQuery = seasonQuery.eq('organization_id', targetOrgId);
            }

            const { data: matchedSeasonsLeagues } = await seasonQuery;
            let finalTournaments: any[] = [];

            if (matchedSeasonsLeagues && matchedSeasonsLeagues.length > 0) {
                finalTournaments = matchedSeasonsLeagues.map((l: any) => ({
                    ...l,
                    _id: l.id,
                    id: l.id,
                    season: l.season || '2026/2027',
                    displayName: l.name
                }));
                setAvailableTournaments(finalTournaments);
            } else {
                finalTournaments = mergedTournament ? [{
                    ...mergedTournament,
                    _id: mergedTournament.id,
                    season: mergedTournament.season || '2026/2027',
                    displayName: `${mergedTournament.name || 'Liga'} (${mergedTournament.season || '2026/2027'})`
                }] : [];
                setAvailableTournaments(finalTournaments);
            }

            // Save to persistent AsyncStorage cache
            await AsyncStorage.setItem(CACHE_KEY, JSON.stringify({
                tournamentData: mergedTournament,
                standings: sortedStandings,
                organizerInfo: computedOrgInfo,
                totalPlayersCount: finalCount,
                matches: finalMatches,
                latestMatches: finalLatestMatches,
                availableTournaments: finalTournaments,
                timestamp: Date.now()
            }));
        } catch (error) {
            console.error('Error fetching tournament details:', error);
        } finally {
            setIsLoading(false);
        }
    };

    // Initial Load + Caching + Supabase Realtime Listener
    useEffect(() => {
        if (!currentTournamentId) return;

        // Reset tab-loaded flags for new tournament
        playersLoadedRef.current = false;
        matchesLoadedRef.current = false;

        const init = async () => {
            const isCacheFresh = await loadCachedData();
            // Only fetch from network if cache is stale or missing
            if (!isCacheFresh) {
                fetchTournamentData(false);
            }
        };
        init();

        // Supabase Realtime multi-table subscription for instant score/team updates
        const realtimeChannel = supabase
            .channel(`tournament_detail_realtime_${currentTournamentId}`)
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'matches' },
                () => {
                    fetchTournamentData(true);
                }
            )
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'teams' },
                () => {
                    fetchTournamentData(true);
                }
            )
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'leagues' },
                () => {
                    fetchTournamentData(true);
                }
            )
            .subscribe();

        if (socket && isConnected) {
            socket.on('match-update', () => {
                fetchTournamentData(true);
            });
        }

        return () => {
            supabase.removeChannel(realtimeChannel);
            if (socket) socket.off('match-update');
        };
    }, [currentTournamentId, socket, isConnected]);

    // 2. Fetch Players specifically for this tournament's teams
    // 2. Fetch Players specifically for this tournament's teams and calculate exact stats
    const fetchTournamentPlayers = async (force = false) => {
        if (!force && playersLoadedRef.current && topPlayers.length > 0) return;
        setIsLoadingPlayers(true);
        try {
            const teamIds = (teams && teams.length > 0 ? teams : standings).map((t: any) => t.teamId || t.id || t._id).filter(Boolean);
            if (teamIds.length > 0) {
                const teamIdsSet = new Set(teamIds.map(String));

                const [{ data: rawPlayers }, { data: matchesData }] = await Promise.all([
                    supabase.from('applications').select('*').eq('status', 'approved').in('team_id', teamIds),
                    supabase.from('matches').select('*').or(`status.eq.finished,status.eq.completed`)
                ]);

                const playersList = (rawPlayers || []).filter((p: any) => {
                    const st = String(p.status || '').toLowerCase().trim();
                    const isArchived = p.is_archived === true || st === 'archived' || st === 'arxivlangan';
                    return !isArchived && st === 'approved';
                });
                const playerIds = playersList.map((p: any) => p.id);

                let eventsMap: Record<string, any> = {};
                const playerMatchesMap: Record<string, Set<string>> = {};

                playerIds.forEach((pid: any) => {
                    const pidStr = String(pid);
                    eventsMap[pidStr] = { goals: 0, assists: 0, yellowCards: 0, redCards: 0, matchesPlayed: 0 };
                    playerMatchesMap[pidStr] = new Set();
                });

                // 1. Process match events (goals, assists, cards)
                if (playerIds.length > 0) {
                    const { data: eventsData } = await supabase
                        .from('match_events')
                        .select('*')
                        .in('player_id', playerIds);

                    (eventsData || []).forEach((e: any) => {
                        const pid = String(e.player_id);
                        if (!eventsMap[pid]) {
                            eventsMap[pid] = { goals: 0, assists: 0, yellowCards: 0, redCards: 0, matchesPlayed: 0 };
                        }
                        if (!playerMatchesMap[pid]) {
                            playerMatchesMap[pid] = new Set();
                        }
                        if (e.match_id) {
                            playerMatchesMap[pid].add(String(e.match_id));
                        }

                        const type = String(e.event_type || '').toLowerCase();
                        if (type === 'goal') eventsMap[pid].goals += 1;
                        else if (type === 'assist') eventsMap[pid].assists += 1;
                        else if (type.includes('yellow')) eventsMap[pid].yellowCards += 1;
                        else if (type.includes('red')) eventsMap[pid].redCards += 1;
                    });
                }

                // 2. Process finished matches lineups (formation) for accurate matchesPlayed count
                (matchesData || []).forEach((m: any) => {
                    const homeId = String(m.home_team_id || m.homeTeamId || '');
                    const awayId = String(m.away_team_id || m.awayTeamId || '');

                    // Only process matches that involve our tournament's teams
                    if (teamIdsSet.has(homeId) || teamIdsSet.has(awayId)) {
                        const matchIdStr = String(m.id);

                        const parseLineup = (formStr: any) => {
                            if (!formStr) return [];
                            try {
                                const parsed = typeof formStr === 'string' ? JSON.parse(formStr) : formStr;
                                const pArr = parsed?.players || parsed?.startingLineup || parsed?.subs || [];
                                return pArr.map((p: any) => String(p.id || p._id || p.playerId)).filter(Boolean);
                            } catch (e) {
                                return [];
                            }
                        };

                        const pIds = [
                            ...parseLineup(m.formation),
                            ...parseLineup(m.home_formation),
                            ...parseLineup(m.away_formation)
                        ];

                        pIds.forEach((pid: string) => {
                            if (playerMatchesMap[pid]) {
                                playerMatchesMap[pid].add(matchIdStr);
                            }
                        });
                    }
                });

                // Calculate final matchesPlayed count per player
                Object.keys(playerMatchesMap).forEach((pid: string) => {
                    if (eventsMap[pid]) {
                        eventsMap[pid].matchesPlayed = playerMatchesMap[pid].size;
                    }
                });

                const teamsMap: Record<string, string> = {};
                (teams || standings || []).forEach((t: any) => {
                    const tid = String(t.teamId || t.id || t._id);
                    teamsMap[tid] = t.name || t.teamName || 'Jamoa';
                });

                const processedPlayers = playersList.map((p: any) => {
                    const pid = String(p.id);
                    const st = eventsMap[pid] || { goals: 0, assists: 0, yellowCards: 0, redCards: 0, matchesPlayed: 0 };
                    return {
                        ...p,
                        _id: p.id,
                        id: p.id,
                        firstName: p.first_name || p.firstName || p.name || 'O\'yinchi',
                        lastName: p.last_name || p.lastName || '',
                        photo: p.photo_url || p.photo || '',
                        teamName: teamsMap[String(p.team_id)] || 'Jamoa',
                        goals: st.goals,
                        assists: st.assists,
                        yellowCards: st.yellowCards,
                        redCards: st.redCards,
                        matchesPlayed: st.matchesPlayed,
                        stats: st
                    };
                });

                setTopPlayers(processedPlayers);
                playersLoadedRef.current = true;
                // Cache players
                try {
                    await AsyncStorage.setItem(PLAYERS_CACHE_KEY, JSON.stringify({
                        players: processedPlayers,
                        timestamp: Date.now()
                    }));
                } catch (e) {}
            } else {
                setTopPlayers([]);
            }
        } catch (err) {
            console.error('Error fetching league players:', err);
        } finally {
            setIsLoadingPlayers(false);
        }
    };

    // 3. Fetch Matches specifically for this tournament
    const fetchTournamentMatches = async (force = false) => {
        if (!force && matchesLoadedRef.current && matches.length > 0) return;
        setIsLoadingMatches(true);
        try {
            const teamIdsSet = new Set((teams && teams.length > 0 ? teams : standings).map((t: any) => String(t.teamId || t.id || t._id)));
            const matchesData = await apiService.getMatches({ tournamentId: currentTournamentId });

            const filteredLeagueMatches = (matchesData || []).filter((m: any) => {
                if (m.tournament_id && String(m.tournament_id) === String(currentTournamentId)) return true;
                if (m.league_id && String(m.league_id) === String(currentTournamentId)) return true;
                const homeId = String(m.home_team_id || m.homeTeam?.id || m.homeTeamId);
                const awayId = String(m.away_team_id || m.awayTeam?.id || m.awayTeamId);
                return teamIdsSet.has(homeId) || teamIdsSet.has(awayId);
            });

            setMatches(filteredLeagueMatches);
            matchesLoadedRef.current = true;
            // Cache matches
            try {
                await AsyncStorage.setItem(MATCHES_CACHE_KEY, JSON.stringify({
                    matches: filteredLeagueMatches,
                    timestamp: Date.now()
                }));
            } catch (e) {}
        } catch (err) {
            console.error('Error fetching league matches:', err);
        } finally {
            setIsLoadingMatches(false);
        }
    };

    // Lazy Loading Tab Handler — only fetch if not already loaded
    useEffect(() => {
        if (!currentTournamentId) return;

        if (activeTab === 'players') {
            // Try loading cached players first
            if (!playersLoadedRef.current) {
                (async () => {
                    try {
                        const raw = await AsyncStorage.getItem(PLAYERS_CACHE_KEY);
                        if (raw) {
                            const parsed = JSON.parse(raw);
                            const age = Date.now() - (parsed.timestamp || 0);
                            if (parsed.players && parsed.players.length > 0 && age < CACHE_TTL) {
                                setTopPlayers(parsed.players);
                                playersLoadedRef.current = true;
                                return;
                            }
                        }
                    } catch (e) {}
                    fetchTournamentPlayers();
                })();
            }
        } else if (activeTab === 'matches') {
            if (!matchesLoadedRef.current) {
                (async () => {
                    try {
                        const raw = await AsyncStorage.getItem(MATCHES_CACHE_KEY);
                        if (raw) {
                            const parsed = JSON.parse(raw);
                            const age = Date.now() - (parsed.timestamp || 0);
                            if (parsed.matches && parsed.matches.length > 0 && age < CACHE_TTL) {
                                setMatches(parsed.matches);
                                matchesLoadedRef.current = true;
                                return;
                            }
                        }
                    } catch (e) {}
                    fetchTournamentMatches();
                })();
            }
        }
    }, [activeTab, currentTournamentId]);

    const formatDate = (dateString?: string) => {
        if (!dateString) return 'Belgilanmagan';
        try {
            return new Date(dateString).toLocaleDateString('uz-UZ', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            });
        } catch (e) {
            return dateString;
        }
    };

    const getFilteredData = () => {
        const query = searchQuery.toLowerCase().trim();
        
        let sortedPlayers = [...topPlayers].sort((a, b) => {
            const valA = a[statFilter] ?? a.stats?.[statFilter] ?? 0;
            const valB = b[statFilter] ?? b.stats?.[statFilter] ?? 0;
            return valB - valA;
        });

        if (!query) {
            return { standings, topPlayers: sortedPlayers, matches };
        }

        return {
            standings: standings.filter(s => s.name?.toLowerCase().includes(query)),
            topPlayers: sortedPlayers.filter(p => 
                `${p.firstName} ${p.lastName}`.toLowerCase().includes(query) || 
                p.teamName?.toLowerCase().includes(query)
            ),
            matches: matches.filter(m => 
                m.homeTeam?.name?.toLowerCase().includes(query) || 
                m.awayTeam?.name?.toLowerCase().includes(query) ||
                m.venue?.toLowerCase().includes(query)
            )
        };
    };

    const { standings: filteredStandings, topPlayers: filteredPlayers, matches: filteredMatches } = getFilteredData();

    const getDisplaySeason = () => {
        if (tournamentData?.season && tournamentData.season.trim()) return tournamentData.season.trim();
        if (tournament?.season && tournament.season.trim()) return tournament.season.trim();
        const nameStr = tournamentData?.name || tournamentName || tournament?.name || '';
        const match = nameStr.match(/\b(20\d{2}[\/-]20\d{2}|20\d{2})\b/);
        if (match) return match[0];
        return '2026/2027';
    };

    const renderHeader = () => {
        const dropdownHeight = seasonAnimationValue.interpolate({
            inputRange: [0, 1],
            outputRange: [0, Math.min(Math.max(availableTournaments.length, 1) * 56, 220)]
        });

        const dropdownOpacity = seasonAnimationValue.interpolate({
            inputRange: [0, 0.5, 1],
            outputRange: [0, 0, 1]
        });

        return (
            <View style={{ zIndex: 1000 }}>
                <View style={styles.header}>
                    <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
                    <View style={{ flexDirection: 'row', alignItems: 'center', width: '100%', paddingHorizontal: 16, paddingVertical: 12 }}>
                        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                            <Ionicons name="arrow-back" size={24} color="#FFF" />
                        </TouchableOpacity>
                        <Text style={styles.headerTitle} numberOfLines={1}>
                            {tournamentData?.name?.toUpperCase() || tournamentName?.toUpperCase() || 'TURNIR'}
                        </Text>
                        <View style={styles.seasonBadge}>
                            <Text style={styles.seasonText}>{getDisplaySeason()}</Text>
                        </View>
                    </View>
                </View>
            </View>
        );
    };

    const handleTabPress = (tab: string) => {
        const idx = TABS.indexOf(tab as any);
        if (idx >= 0) {
            isTabPressRef.current = true;
            setActiveTab(tab);
            pagerRef.current?.scrollToOffset({ offset: idx * SCREEN_WIDTH, animated: false });
            // Reset immediately since no animation delay
            requestAnimationFrame(() => { isTabPressRef.current = false; });
        }
    };

    const onPagerScroll = Animated.event(
        [{ nativeEvent: { contentOffset: { x: scrollXPager } } }],
        { useNativeDriver: false }
    );

    const onPagerMomentumEnd = (e: any) => {
        if (isTabPressRef.current) return;
        const idx = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
        if (idx >= 0 && idx < TABS.length) {
            setActiveTab(TABS[idx]);
        }
    };

    const TAB_COUNT = TABS.length;
    const TAB_MARGIN = 6;
    const TABS_PADDING = 12;
    const TOTAL_GAP = TAB_MARGIN * (TAB_COUNT - 1);
    const TAB_WIDTH_CALC = (SCREEN_WIDTH - TABS_PADDING * 2 - TOTAL_GAP) / TAB_COUNT;

    const indicatorTranslateX = scrollXPager.interpolate({
        inputRange: TABS.map((_, i) => i * SCREEN_WIDTH),
        outputRange: TABS.map((_, i) => i * (TAB_WIDTH_CALC + TAB_MARGIN)),
        extrapolate: 'clamp',
    });

    const getTabLabel = (tab: string) => {
        switch (tab) {
            case 'overview': return t('tournaments.overview');
            case 'standings': return t('tournaments.standings');
            case 'players': return t('tournaments.players');
            case 'matches': return t('tournaments.matches');
            default: return tab;
        }
    };

    const renderTabs = () => (
        <View style={styles.tabsContainer}>
            <BlurView intensity={10} tint="dark" style={StyleSheet.absoluteFill} />
            <View style={styles.fixedTabsRow}>
                {/* Animated green background indicator */}
                <Animated.View
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: TAB_WIDTH_CALC,
                        height: '100%',
                        borderRadius: 14,
                        backgroundColor: Colors.primary,
                        transform: [{ translateX: indicatorTranslateX }],
                    }}
                />
                {TABS.map((tab) => (
                    <TouchableOpacity
                        key={tab}
                        style={[styles.tab, { backgroundColor: 'transparent', borderColor: 'transparent' }]}
                        onPress={() => handleTabPress(tab)}
                        activeOpacity={0.8}
                    >
                        <Animated.Text
                            style={[
                                styles.tabText,
                                activeTab === tab && styles.activeTabText
                            ]}
                            numberOfLines={1}
                        >
                            {getTabLabel(tab)}
                        </Animated.Text>
                    </TouchableOpacity>
                ))}
            </View>
        </View>
    );

    const renderOverview = () => {
        const startDateVal = tournamentData?.start_date || tournamentData?.startDate;
        const endDateVal = tournamentData?.end_date || tournamentData?.endDate;

        return (
            <ScrollView style={styles.tabContent} contentContainerStyle={{ paddingBottom: 110 }}>
                {/* Information Card */}
                <View style={styles.sectionCard}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>{t('tournaments.overview')}</Text>
                    </View>

                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>{t('tournaments.start_date')}</Text>
                        <View style={styles.dashedLine} />
                        <Text style={styles.infoValue}>{formatDate(startDateVal)}</Text>
                    </View>

                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>{t('tournaments.end_date')}</Text>
                        <View style={styles.dashedLine} />
                        <Text style={styles.infoValue}>{formatDate(endDateVal)}</Text>
                    </View>

                <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>{t('common.status')}</Text>
                    <View style={styles.dashedLine} />
                    <View style={styles.statusRow}>
                        <Text style={styles.infoValue}>
                            {tournamentData?.status === 'ongoing' ? t('tournaments.ongoing') : 
                             tournamentData?.status === 'finished' ? t('tournaments.finished_status') : t('tournaments.planned_status')}
                        </Text>
                        <View style={[styles.statusDot, { backgroundColor: tournamentData?.status === 'ongoing' ? '#00FF66' : '#6A7185' }]} />
                    </View>
                </View>

                <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>{t('tournaments.teams_tab')}</Text>
                    <View style={styles.dashedLine} />
                    <Text style={styles.infoValue}>{teams?.length || standings?.length || 0}</Text>
                </View>

                <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>{t('tournaments.total_players')}</Text>
                    <View style={styles.dashedLine} />
                    <Text style={styles.infoValue}>{totalPlayersCount || (topPlayers.length > 0 ? topPlayers.length : 0)}</Text>
                </View>

                <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>{t('tournaments.match_duration')}</Text>
                    <View style={styles.dashedLine} />
                    <Text style={styles.infoValue}>
                        {tournamentData?.match_duration || tournamentData?.duration || "50 (25x25)"}
                    </Text>
                </View>
            </View>

            {/* Real Organizers Card */}
            <View style={styles.sectionCard}>
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>TASHKILOTCHILAR</Text>
                </View>

                <View style={styles.organizerRow}>
                    <View style={styles.organizerLogoBox}>
                        {organizerInfo.logo ? (
                            <SmartImage uri={organizerInfo.logo} style={{ width: 50, height: 44 }} contentFit="contain" fallbackIcon="business" />
                        ) : (
                            <Ionicons name="business" size={26} color={Colors.primary} />
                        )}
                    </View>
                    <View style={styles.organizerInfoTextCol}>
                        <Text style={styles.organizerName}>{(organizerInfo.name || 'HFL SPORT TASHKILOTI').toUpperCase()}</Text>
                        <Text style={styles.organizerRole}>MAS'UL RASMIY TASHKILOTCHI</Text>
                    </View>
                    {organizerInfo.phone ? (
                        <TouchableOpacity 
                            style={styles.phoneBtn} 
                            onPress={() => Linking.openURL(`tel:${organizerInfo.phone}`)}
                        >
                            <Ionicons name="call" size={20} color={Colors.primary} />
                        </TouchableOpacity>
                    ) : null}
                </View>
            </View>

            {/* Latest Matches Card */}
            {latestMatches.length > 0 && (
                <View style={styles.sectionCard}>
                    <View style={{ paddingTop: 12 }}>
                        {latestMatches.slice(0, 2).map((match) => {
                            const isLive = match.status === 'live';
                            const isScheduled = match.status === 'scheduled';

                            let timeStr = String(match.match_time || match.time || '').trim();
                            if (timeStr && timeStr.includes(':')) {
                                const parts = timeStr.split(':');
                                timeStr = `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}`;
                            }

                            return (
                                <TouchableOpacity
                                    key={match._id || match.id}
                                    style={[styles.matchCardFull, isLive && styles.liveMatchCardFull]}
                                    onPress={() => setActiveTab('matches')}
                                    activeOpacity={0.85}
                                >
                                    <BlurView intensity={15} tint="dark" style={StyleSheet.absoluteFill} />
                                    <View style={{ padding: 16 }}>
                                        <View style={styles.matchMetaRowFull}>
                                            <Text style={styles.matchMetaText}>{(match.tourNumber || (match.round ? `${match.round}-TUR` : 'O\'YIN')).toUpperCase()}</Text>
                                            <Text style={styles.matchMetaText}>{match.date || match.scheduledAt || match.date_str}</Text>
                                        </View>

                                        <View style={styles.matchTeamsRowFull}>
                                            <Text style={styles.teamShortFull}>{getTeamAbbreviation(match.homeTeam?.name || match.homeTeamName || 'HME')}</Text>
                                            <View style={styles.logoCircleSmall}>
                                                {match.homeTeam?.logo || match.homeTeamLogo ? (
                                                    <Image source={{ uri: match.homeTeam?.logo || match.homeTeamLogo }} style={{ width: 34, height: 34, borderRadius: 17 }} />
                                                ) : (
                                                    <Ionicons name="shield" size={24} color={Colors.primary} />
                                                )}
                                            </View>

                                            {isLive ? (
                                                <View style={{ alignItems: 'center', marginHorizontal: 8 }}>
                                                    <Text style={[styles.scoreTextFull, { color: '#FF3B30' }]}>
                                                        {match.score?.home ?? match.home_score ?? 0} : {match.score?.away ?? match.away_score ?? 0}
                                                    </Text>
                                                    <View style={styles.liveTagBadge}>
                                                        <View style={styles.liveRedDot} />
                                                        <Text style={styles.liveTagText}>JONLI (LIVE)</Text>
                                                    </View>
                                                </View>
                                            ) : isScheduled ? (
                                                <View style={{ alignItems: 'center', marginHorizontal: 12 }}>
                                                    <Text style={styles.scoreTextFullVs}>VS</Text>
                                                    {timeStr ? <Text style={styles.vsTimeText}>{timeStr}</Text> : null}
                                                </View>
                                            ) : (
                                                <Text style={styles.scoreTextFull}>
                                                    {match.score?.home ?? match.home_score ?? 0} : {match.score?.away ?? match.away_score ?? 0}
                                                </Text>
                                            )}

                                            <View style={styles.logoCircleSmall}>
                                                {match.awayTeam?.logo || match.awayTeamLogo ? (
                                                    <Image source={{ uri: match.awayTeam?.logo || match.awayTeamLogo }} style={{ width: 34, height: 34, borderRadius: 17 }} />
                                                ) : (
                                                    <Ionicons name="shield" size={24} color={Colors.primary} />
                                                )}
                                            </View>
                                            <Text style={styles.teamShortFull}>{getTeamAbbreviation(match.awayTeam?.name || match.awayTeamName || 'AWY')}</Text>
                                        </View>

                                        <View style={styles.stadiumRowFull}>
                                            <Ionicons name="location-outline" size={12} color={Colors.textMuted} />
                                            <Text style={styles.stadiumTextFull}>{match.location || match.venue || 'Amatora Arena'}</Text>
                                        </View>
                                    </View>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </View>
            )}
        </ScrollView>
    );
};

    {/* Standings Table matching the exact screenshot design! */}
    const renderStandings = () => (
        <View style={styles.tabContent}>
            <View style={styles.searchContainer}>
                <Ionicons name="search" size={20} color={Colors.textMuted} style={styles.searchIcon} />
                <TextInput
                    style={styles.searchInput}
                    placeholder={t('tournaments.search_placeholder', 'QIDIRISH...')}
                    placeholderTextColor={Colors.textMuted}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                />
            </View>

            {isLoadingStandings ? (
                <TableSkeleton />
            ) : (
                <View style={styles.screenshotCardWrapper}>
                    <BlurView intensity={25} tint="dark" style={StyleSheet.absoluteFill} />
                    
                    {/* Header Columns matching exact screenshot */}
                    <View style={styles.screenshotTableHeader}>
                        <Text style={styles.screenshotHeaderPos}>{t('tournaments.table_rank', '#')}</Text>
                        <Text style={styles.screenshotHeaderTeam}>{t('tournaments.table_team', 'JAMOA')}</Text>
                        <Text style={styles.screenshotHeaderPlayed}>{t('tournaments.table_played', 'O\'')}</Text>
                        <Text style={styles.screenshotHeaderGd}>{t('tournaments.table_gd', 'T/N')}</Text>
                        <Text style={styles.screenshotHeaderPoints}>{t('tournaments.table_points', 'O')}</Text>
                    </View>

                    <ScrollView contentContainerStyle={{ paddingBottom: 110 }} showsVerticalScrollIndicator={false}>
                        {filteredStandings.length === 0 ? (
                            <View style={styles.empty}>
                                <Text style={styles.emptyText}>{t('tournaments.no_data', 'MA\'LUMOT TOPILMADI')}</Text>
                            </View>
                        ) : (
                            filteredStandings.map((team, index) => {
                                const s = team.stats || {};
                                const gf = team.goalsFor ?? s.goalsFor ?? team.gf ?? 0;
                                const ga = team.goalsAgainst ?? s.goalsAgainst ?? team.ga ?? 0;
                                const gd = team.goalDifference ?? s.goalDifference ?? team.gd ?? (gf - ga);
                                const points = team.points ?? s.points ?? team.pts ?? 0;
                                const played = team.played ?? s.played ?? team.matchesPlayed ?? s.matchesPlayed ?? 0;

                                return (
                                    <TouchableOpacity 
                                        key={team.teamId || team.id || team._id || index} 
                                        style={styles.screenshotRow}
                                        onPress={() => navigation.navigate('TeamProfile', { team: team, teamId: team.teamId || team.id || team._id })}
                                        activeOpacity={0.7}
                                    >
                                        {index === 0 ? (
                                            <View style={{ width: 32, alignItems: 'center', justifyContent: 'center' }}>
                                                <FontAwesome5 name="medal" size={18} color="#FFD700" />
                                            </View>
                                        ) : index === 1 ? (
                                            <View style={{ width: 32, alignItems: 'center', justifyContent: 'center' }}>
                                                <FontAwesome5 name="medal" size={18} color="#C0C0C0" />
                                            </View>
                                        ) : index === 2 ? (
                                            <View style={{ width: 32, alignItems: 'center', justifyContent: 'center' }}>
                                                <FontAwesome5 name="medal" size={18} color="#CD7F32" />
                                            </View>
                                        ) : (
                                            <Text style={styles.screenshotPos}>{index + 1}</Text>
                                        )}
                                        
                                        <View style={styles.screenshotTeamCol}>
                                            <View style={styles.screenshotLogoCircle}>
                                                {team.logo || team.logo_url ? (
                                                    <Image source={{ uri: team.logo || team.logo_url }} style={styles.screenshotLogoImg} />
                                                ) : (
                                                    <Ionicons name="shield-outline" size={16} color="rgba(255,255,255,0.4)" />
                                                )}
                                            </View>
                                            <Text style={styles.screenshotTeamName} numberOfLines={1}>{(team.name || 'JAMOA').toUpperCase()}</Text>
                                        </View>
                                        
                                        <Text style={styles.screenshotStatPlayed}>{played}</Text>
                                        <Text style={styles.screenshotStatGd}>{gd}</Text>
                                        <Text style={styles.screenshotStatPoints}>{points}</Text>
                                    </TouchableOpacity>
                                );
                            })
                        )}
                    </ScrollView>
                </View>
            )}
        </View>
    );

    const renderPlayers = () => {
        const statOptions = [
            { id: 'goals', label: t('tournaments.stat_goals', 'GOLLAR'), icon: 'football' },
            { id: 'assists', label: t('tournaments.stat_assists', 'ASSISTLAR'), icon: 'people' },
            { id: 'yellowCards', label: t('tournaments.stat_yellow_cards', 'SARIQ KARTALAR'), icon: 'square', color: '#FFD700' },
            { id: 'redCards', label: t('tournaments.stat_red_cards', 'QIZIL KARTALAR'), icon: 'square', color: '#FF0000' },
            { id: 'matchesPlayed', label: t('tournaments.stat_matches_played', 'O\'YINLAR'), icon: 'calendar' },
        ];

        const activeOption = statOptions.find(opt => opt.id === statFilter) || statOptions[0];

        const dropdownHeight = statAnimationValue.interpolate({
            inputRange: [0, 1],
            outputRange: [0, 250]
        });

        const dropdownOpacity = statAnimationValue.interpolate({
            inputRange: [0, 0.5, 1],
            outputRange: [0, 0, 1]
        });

        return (
            <View style={styles.tabContent}>
                <View style={styles.searchContainer}>
                    <Ionicons name="search" size={20} color={Colors.textMuted} style={styles.searchIcon} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder={t('tournaments.search_placeholder', 'QIDIRISH...')}
                        placeholderTextColor={Colors.textMuted}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                </View>

                {/* Stat Filter Selector Dropdown */}
                <View style={styles.statsSelectorContainer}>
                    <TouchableOpacity 
                        style={styles.activeStatBtn} 
                        onPress={toggleStatSelector}
                        activeOpacity={0.8}
                    >
                        <View style={styles.activeStatLeft}>
                            <Ionicons name={activeOption.icon as any} size={18} color={activeOption.color || Colors.primary} />
                            <Text style={styles.activeStatLabel}>{activeOption.label}</Text>
                        </View>
                        <Ionicons 
                            name={isStatSelectorOpen ? "chevron-up" : "chevron-down"} 
                            size={20} 
                            color={Colors.textMuted} 
                        />
                    </TouchableOpacity>

                    <Animated.View style={[styles.statDropdown, { maxHeight: dropdownHeight, opacity: dropdownOpacity, overflow: 'hidden' }]}>
                        {statOptions.map((opt) => (
                            <TouchableOpacity
                                key={opt.id}
                                style={[styles.statOption, statFilter === opt.id && styles.statOptionActive]}
                                onPress={() => handleStatSelect(opt.id)}
                            >
                                <View style={styles.statOptLeft}>
                                    <Ionicons 
                                        name={opt.icon as any} 
                                        size={18} 
                                        color={statFilter === opt.id ? Colors.primary : (opt.color || Colors.textMuted)} 
                                    />
                                    <Text style={[styles.statOptLabel, statFilter === opt.id && styles.statOptLabelActive]}>
                                        {opt.label}
                                    </Text>
                                </View>
                                {statFilter === opt.id && (
                                    <Ionicons name="checkmark-circle" size={18} color={Colors.primary} />
                                )}
                            </TouchableOpacity>
                        ))}
                    </Animated.View>
                </View>

                {isLoadingPlayers ? (
                    <PlayerListSkeleton />
                ) : (
                    <ScrollView contentContainerStyle={{ paddingBottom: 110 }} showsVerticalScrollIndicator={false}>
                        {filteredPlayers.length === 0 ? (
                            <View style={styles.empty}>
                                <Text style={styles.emptyText}>{t('tournaments.no_data', 'MA\'LUMOT TOPILMADI')}</Text>
                            </View>
                        ) : (
                            filteredPlayers.map((player, index) => {
                                const statValue = player[statFilter] ?? player.stats?.[statFilter] ?? 0;
                                return (
                                    <TouchableOpacity 
                                        key={player._id || player.id || index} 
                                        style={styles.playerRow}
                                        onPress={() => navigation.navigate('PlayerStats', { playerId: player._id || player.id, player: player })}
                                    >
                                        <BlurView intensity={10} tint="dark" style={StyleSheet.absoluteFill} />
                                        <View style={{ flexDirection: 'row', alignItems: 'center', width: '100%', paddingHorizontal: 16, paddingVertical: 12 }}>
                                            {(!['yellowCards', 'redCards'].includes(statFilter) && index === 0) ? (
                                                <View style={{ width: 26, alignItems: 'center', justifyContent: 'center' }}>
                                                    <FontAwesome5 name="medal" size={20} color="#FFD700" />
                                                </View>
                                            ) : (!['yellowCards', 'redCards'].includes(statFilter) && index === 1) ? (
                                                <View style={{ width: 26, alignItems: 'center', justifyContent: 'center' }}>
                                                    <FontAwesome5 name="medal" size={20} color="#C0C0C0" />
                                                </View>
                                            ) : (!['yellowCards', 'redCards'].includes(statFilter) && index === 2) ? (
                                                <View style={{ width: 26, alignItems: 'center', justifyContent: 'center' }}>
                                                    <FontAwesome5 name="medal" size={20} color="#CD7F32" />
                                                </View>
                                            ) : (
                                                <Text style={styles.playerIndex}>{index + 1}</Text>
                                            )}
                                            <View style={styles.playerHexImage}>
                                                {player.photo ? (
                                                    <Image source={{ uri: player.photo }} style={{ width: 40, height: 40, borderRadius: 20 }} />
                                                ) : (
                                                    <Ionicons name="person-circle" size={40} color={Colors.textMuted} />
                                                )}
                                            </View>
                                            <View style={styles.playerInfo}>
                                                <Text style={styles.playerStatName}>{(`${player.firstName || ''} ${player.lastName || ''}`).trim().toUpperCase()}</Text>
                                                <Text style={styles.playerTeamText}>{player.teamName?.toUpperCase() || 'AMATORA'}</Text>
                                            </View>
                                            <View style={styles.playerStatBadge}>
                                                <Text style={styles.playerGoals}>{statValue}</Text>
                                            </View>
                                        </View>
                                    </TouchableOpacity>
                                );
                            })
                        )}
                    </ScrollView>
                )}
            </View>
        );
    };

    const renderMatches = () => (
        <View style={styles.tabContent}>
            <View style={styles.searchContainer}>
                <Ionicons name="search" size={20} color={Colors.textMuted} style={styles.searchIcon} />
                <TextInput
                    style={styles.searchInput}
                    placeholder={t('tournaments.search_placeholder', 'QIDIRISH...')}
                    placeholderTextColor={Colors.textMuted}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                />
            </View>

            {isLoadingMatches ? (
                <MatchesListSkeleton count={6} />
            ) : (
                <ScrollView contentContainerStyle={{ paddingBottom: 110 }} showsVerticalScrollIndicator={false}>
                    {filteredMatches.length === 0 ? (
                        <View style={styles.empty}>
                            <Text style={styles.emptyText}>{t('tournaments.no_data', 'MA\'LUMOT TOPILMADI')}</Text>
                        </View>
                    ) : (
                        filteredMatches.map((match) => {
                            const isLive = match.status === 'live';
                            const isScheduled = match.status === 'scheduled';

                            let timeStr = String(match.match_time || match.time || '').trim();
                            if (timeStr && timeStr.includes(':')) {
                                const parts = timeStr.split(':');
                                timeStr = `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}`;
                            }

                            return (
                                <TouchableOpacity
                                    key={match._id || match.id}
                                    style={[styles.matchCardFull, isLive && styles.liveMatchCardFull]}
                                    onPress={() => navigation.navigate('MatchDetail', { matchData: match, matchId: match._id || match.id })}
                                    activeOpacity={0.85}
                                >
                                    <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
                                    <View style={{ padding: 16 }}>
                                        <View style={styles.matchMetaRowFull}>
                                            <Text style={styles.matchMetaText}>{(match.tourNumber || (match.round ? `${match.round}-TUR` : 'O\'YIN')).toUpperCase()}</Text>
                                            <Text style={styles.matchMetaText}>{match.date || match.scheduledAt || match.date_str}</Text>
                                        </View>

                                        <View style={styles.matchTeamsRowFull}>
                                            <Text style={styles.teamShortFull}>{getTeamAbbreviation(match.homeTeam?.name || match.homeTeamName || 'HME')}</Text>
                                            <View style={styles.logoCircleSmall}>
                                                {match.homeTeam?.logo || match.homeTeamLogo ? (
                                                    <Image source={{ uri: match.homeTeam?.logo || match.homeTeamLogo }} style={{ width: 34, height: 34, borderRadius: 17 }} />
                                                ) : (
                                                    <Ionicons name="shield" size={24} color={Colors.primary} />
                                                )}
                                            </View>

                                            {isLive ? (
                                                <View style={{ alignItems: 'center', marginHorizontal: 8 }}>
                                                    <Text style={[styles.scoreTextFull, { color: '#FF3B30' }]}>
                                                        {match.score?.home ?? match.home_score ?? 0} : {match.score?.away ?? match.away_score ?? 0}
                                                    </Text>
                                                    <View style={styles.liveTagBadge}>
                                                        <View style={styles.liveRedDot} />
                                                        <Text style={styles.liveTagText}>JONLI (LIVE)</Text>
                                                    </View>
                                                </View>
                                            ) : isScheduled ? (
                                                <View style={{ alignItems: 'center', marginHorizontal: 12 }}>
                                                    <Text style={styles.scoreTextFullVs}>VS</Text>
                                                    {timeStr ? <Text style={styles.vsTimeText}>{timeStr}</Text> : null}
                                                </View>
                                            ) : (
                                                <Text style={styles.scoreTextFull}>
                                                    {match.score?.home ?? match.home_score ?? 0} : {match.score?.away ?? match.away_score ?? 0}
                                                </Text>
                                            )}

                                            <View style={styles.logoCircleSmall}>
                                                {match.awayTeam?.logo || match.awayTeamLogo ? (
                                                    <Image source={{ uri: match.awayTeam?.logo || match.awayTeamLogo }} style={{ width: 34, height: 34, borderRadius: 17 }} />
                                                ) : (
                                                    <Ionicons name="shield" size={24} color={Colors.primary} />
                                                )}
                                            </View>
                                            <Text style={styles.teamShortFull}>{getTeamAbbreviation(match.awayTeam?.name || match.awayTeamName || 'AWY')}</Text>
                                        </View>

                                        <View style={styles.stadiumRowFull}>
                                            <Ionicons name="location-outline" size={12} color={Colors.textMuted} />
                                            <Text style={styles.stadiumTextFull}>{match.location || match.venue || 'Amatora Arena'}</Text>
                                        </View>
                                    </View>
                                </TouchableOpacity>
                            );
                        })
                    )}
                </ScrollView>
            )}
        </View>
    );

    const pagerPages = [
        { key: 'overview', render: renderOverview },
        { key: 'standings', render: renderStandings },
        { key: 'players', render: renderPlayers },
        { key: 'matches', render: renderMatches },
    ];

    return (
        <AnimatedBackground overlayOpacity={0.85} backgroundImage={backgroundImage}>
            <SafeAreaView style={styles.container} edges={['top']}>
                {renderHeader()}
                {renderTabs()}

                {isLoading ? (
                    <TournamentDetailSkeleton />
                ) : (
                    <FlatList
                        ref={pagerRef}
                        data={pagerPages}
                        keyExtractor={(item) => item.key}
                        horizontal
                        pagingEnabled
                        showsHorizontalScrollIndicator={false}
                        bounces={false}
                        onScroll={onPagerScroll}
                        scrollEventThrottle={16}
                        onMomentumScrollEnd={onPagerMomentumEnd}
                        getItemLayout={(_, index) => ({
                            length: SCREEN_WIDTH,
                            offset: SCREEN_WIDTH * index,
                            index,
                        })}
                        renderItem={({ item }) => (
                            <View style={{ width: SCREEN_WIDTH, flex: 1 }}>
                                {item.render()}
                            </View>
                        )}
                    />
                )}
            </SafeAreaView>
        </AnimatedBackground>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: 'transparent' },
    header: { overflow: 'hidden' },
    backButton: { marginRight: 12 },
    headerTitle: { flex: 1, color: '#FFF', fontSize: 18, fontWeight: '900', fontStyle: 'italic' },
    seasonBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.primary, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, gap: 4 },
    seasonText: { color: '#000', fontSize: 11, fontWeight: '900' },
    seasonDropdown: { marginHorizontal: 16, marginTop: 4, borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    seasonItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
    activeSeasonItem: { backgroundColor: 'rgba(0,255,102,0.1)' },
    seasonItemText: { color: '#FFF', fontSize: 13, fontWeight: '700' },
    activeSeasonItemText: { color: Colors.primary, fontWeight: '900' },
    tabsContainer: { paddingVertical: 8, marginVertical: 10, overflow: 'hidden', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)', paddingHorizontal: 12 },
    fixedTabsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6 },
    tab: { flex: 1, paddingVertical: 9, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center' },
    activeTab: { backgroundColor: Colors.primary, borderColor: Colors.primary },
    tabText: { color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: '900', letterSpacing: 0.3 },
    activeTabText: { color: '#000' },
    tabContent: { flex: 1 },
    sectionCard: { marginHorizontal: 16, marginBottom: 15, padding: 18, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', overflow: 'hidden' },
    sectionHeader: { marginBottom: 14 },
    sectionTitle: { color: Colors.primary, fontSize: 12, fontWeight: '900', letterSpacing: 1 },
    infoRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 8 },
    infoLabel: { color: 'rgba(255,255,255,0.6)', fontSize: 13, fontWeight: '700' },
    dashedLine: { flex: 1, height: 1, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', borderStyle: 'dashed', marginHorizontal: 10 },
    infoValue: { color: '#FFF', fontSize: 13, fontWeight: '900' },
    statusRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    statusDot: { width: 8, height: 8, borderRadius: 4 },
    organizerRow: { flexDirection: 'row', alignItems: 'center' },
    organizerLogoBox: { width: 50, height: 44, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    organizerInfoTextCol: { flex: 1 },
    organizerName: { color: '#FFF', fontSize: 14, fontWeight: '900' },
    organizerRole: { color: Colors.primary, fontSize: 10, fontWeight: '800', marginTop: 2 },
    phoneBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(0,255,102,0.1)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(0,255,102,0.2)' },
    searchContainer: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginBottom: 12, paddingHorizontal: 14, height: 44, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
    searchIcon: { marginRight: 10 },
    searchInput: { flex: 1, color: '#FFF', fontSize: 13, fontWeight: '700' },
    
    // Screenshot Standings Card Design
    screenshotCardWrapper: {
        marginHorizontal: 16,
        borderRadius: 24,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
        backgroundColor: 'rgba(15, 20, 32, 0.65)',
        flex: 1,
    },
    screenshotTableHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.08)',
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
    },
    screenshotHeaderPos: {
        width: 32,
        color: '#8A94A6',
        fontSize: 13,
        fontWeight: '900',
        textAlign: 'center',
    },
    screenshotHeaderTeam: {
        flex: 1,
        color: '#8A94A6',
        fontSize: 13,
        fontWeight: '900',
        paddingLeft: 8,
    },
    screenshotHeaderPlayed: {
        width: 40,
        color: '#8A94A6',
        fontSize: 13,
        fontWeight: '900',
        textAlign: 'center',
    },
    screenshotHeaderGd: {
        width: 50,
        color: '#8A94A6',
        fontSize: 13,
        fontWeight: '900',
        textAlign: 'center',
    },
    screenshotHeaderPoints: {
        width: 40,
        color: '#8A94A6',
        fontSize: 13,
        fontWeight: '900',
        textAlign: 'right',
        paddingRight: 6,
    },
    screenshotRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 13,
        borderBottomWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.04)',
    },
    screenshotPos: {
        width: 32,
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '900',
        textAlign: 'center',
    },
    screenshotTeamCol: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        paddingLeft: 8,
    },
    screenshotLogoCircle: {
        width: 30,
        height: 30,
        borderRadius: 15,
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 10,
        overflow: 'hidden',
    },
    screenshotLogoImg: {
        width: 30,
        height: 30,
        borderRadius: 15,
    },
    screenshotTeamName: {
        color: '#FFFFFF',
        fontSize: 13,
        fontWeight: '900',
        letterSpacing: 0.3,
        flex: 1,
    },
    screenshotStatPlayed: {
        width: 40,
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '900',
        textAlign: 'center',
    },
    screenshotStatGd: {
        width: 50,
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '900',
        textAlign: 'center',
    },
    screenshotStatPoints: {
        width: 40,
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '900',
        textAlign: 'right',
        paddingRight: 6,
    },

    // Stat Dropdown & Players List
    statsSelectorContainer: { marginHorizontal: 16, marginBottom: 12, zIndex: 100 },
    activeStatBtn: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, height: 44, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
    activeStatLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    activeStatLabel: { color: '#FFF', fontSize: 13, fontWeight: '900' },
    statDropdown: { borderRadius: 14, backgroundColor: 'rgba(15,20,32,0.95)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', marginTop: 4 },
    statOption: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.04)' },
    statOptionActive: { backgroundColor: 'rgba(0,255,102,0.1)' },
    statOptLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    statOptLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: '700' },
    statOptLabelActive: { color: Colors.primary, fontWeight: '900' },
    playerRow: { marginHorizontal: 16, marginBottom: 8, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', backgroundColor: 'rgba(255,255,255,0.02)' },
    playerIndex: { color: '#FFF', fontSize: 14, fontWeight: '900', width: 24 },
    playerHexImage: { marginRight: 12 },
    playerInfo: { flex: 1 },
    playerStatName: { color: '#FFF', fontSize: 14, fontWeight: '900' },
    playerTeamText: { color: Colors.primary, fontSize: 10, fontWeight: '800', marginTop: 2 },
    playerStatBadge: { backgroundColor: 'rgba(0,255,102,0.15)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(0,255,102,0.3)' },
    playerGoals: { color: '#00FF66', fontSize: 14, fontWeight: '900' },

    // Matches List
    matchCardFull: { marginHorizontal: 16, marginBottom: 12, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', backgroundColor: 'rgba(255,255,255,0.03)' },
    liveMatchCardFull: {
        borderColor: '#FF3B30',
        borderWidth: 1.5,
        backgroundColor: 'rgba(255, 59, 48, 0.12)',
    },
    liveTagBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 59, 48, 0.25)',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 6,
        marginTop: 4,
        borderWidth: 1,
        borderColor: 'rgba(255, 59, 48, 0.5)',
    },
    liveRedDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#FF3B30',
        marginRight: 4,
    },
    liveTagText: {
        color: '#FF3B30',
        fontSize: 9,
        fontWeight: '900',
        letterSpacing: 0.5,
    },
    scoreTextFullVs: {
        color: Colors.primary,
        fontSize: 20,
        fontWeight: '900',
        fontStyle: 'italic',
    },
    vsTimeText: {
        color: 'rgba(255, 255, 255, 0.5)',
        fontSize: 10,
        fontWeight: '700',
        marginTop: 2,
    },
    matchMetaRowFull: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
    matchMetaText: { color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: '700' },
    matchTeamsRowFull: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
    teamShortFull: { color: '#FFF', fontSize: 16, fontWeight: '900', width: 60, textAlign: 'center' },
    scoreTextFull: { color: Colors.primary, fontSize: 22, fontWeight: '900', marginHorizontal: 10 },
    stadiumRowFull: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
    stadiumTextFull: { color: 'rgba(255,255,255,0.5)', fontSize: 11, marginLeft: 6 },
    logoCircleSmall: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.05)', justifyContent: 'center', alignItems: 'center', marginHorizontal: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
    empty: { alignItems: 'center', marginTop: 60, paddingHorizontal: 20 },
    emptyText: { color: Colors.textMuted, fontSize: 14, fontWeight: '700', textAlign: 'center' },
});
