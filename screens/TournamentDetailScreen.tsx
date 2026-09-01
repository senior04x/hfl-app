import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
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
    Dimensions,
    Platform
} from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
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
import { useThemeStore } from '../store/useThemeStore';
import { getHomeScreenColors } from '../constants/homeTheme';

export default function TournamentDetailScreen({ route, navigation }: any) {
    const { t } = useTranslation();
    const { isDark } = useThemeStore();
    const homeColors = getHomeScreenColors(isDark);

    const { tournamentId, tournamentName, tournament } = route?.params || {};
    const currentTournamentId = route?.params?.tournamentId || tournamentId || tournament?.id || tournament?._id || route?.params?.id || route?.params?.leagueId || tournamentName || route?.params?.name;
    const TABS = ['overview', 'standings', 'players', 'matches'] as const;

    const requestedTab = route?.params?.initialTab || route?.params?.tab;
    const initialActiveTab = (requestedTab === 'oyinlar' || requestedTab === 'matches') 
        ? 'matches' 
        : (requestedTab === 'standings' || requestedTab === 'jadval' ? 'standings' : (requestedTab === 'players' || requestedTab === 'oyinchilar' ? 'players' : 'overview'));
    const [activeTab, setActiveTab] = useState<string>(initialActiveTab);
    const activeTabRef = useRef(initialActiveTab);
    const isExitingRef = useRef(false);
    const [tabLabelWidths, setTabLabelWidths] = useState<number[]>([]);

    useEffect(() => {
        activeTabRef.current = activeTab;
    }, [activeTab]);

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
    const [organizersList, setOrganizersList] = useState<any[]>([]);
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
                if (parsed.organizersList) setOrganizersList(parsed.organizersList);
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
            const leagueSearchKey = navTournament?.name || tournamentName || currentTournamentId;

            const [t, teamsData] = await Promise.all([
                apiService.getTournamentById(leagueSearchKey || currentTournamentId).catch(() => null),
                apiService.getTeams(1, 100, leagueSearchKey).catch(() => [])
            ]);

            const mergedTournament = { ...(navTournament || {}), ...(t || {}) };
            if (navTournament?.name) {
                mergedTournament.name = navTournament.name;
            }

            // 1. Resolve exact league from Supabase leagues table directly
            let resolvedLeagueRecord: any = null;
            let resolvedLeagueId: number | null = null;

            const potentialNumericId = currentTournamentId || navTournament?.id || navTournament?._id || t?.id || t?._id;
            if (potentialNumericId && !isNaN(Number(potentialNumericId))) {
                const { data: lg } = await supabase.from('leagues').select('*').eq('id', Number(potentialNumericId)).maybeSingle();
                if (lg) {
                    resolvedLeagueRecord = lg;
                    resolvedLeagueId = lg.id;
                }
            }

            if (!resolvedLeagueRecord && (navTournament?.name || tournamentName || mergedTournament?.name || leagueSearchKey)) {
                const searchName = String(navTournament?.name || tournamentName || mergedTournament?.name || leagueSearchKey).trim();
                const { data: lgList } = await supabase.from('leagues').select('*').ilike('name', `%${searchName}%`).limit(1);
                if (lgList && lgList.length > 0) {
                    resolvedLeagueRecord = lgList[0];
                    resolvedLeagueId = lgList[0].id;
                }
            }

            if (resolvedLeagueRecord) {
                mergedTournament.id = resolvedLeagueRecord.id;
                mergedTournament.organization_id = resolvedLeagueRecord.organization_id;
                if (!mergedTournament.name) mergedTournament.name = resolvedLeagueRecord.name;
                if (!mergedTournament.season) mergedTournament.season = resolvedLeagueRecord.season;
            }

            const targetLeagueId = resolvedLeagueId || (mergedTournament?.id && !isNaN(Number(mergedTournament.id)) ? Number(mergedTournament.id) : null);

            let startDateVal = mergedTournament?.start_date || mergedTournament?.startDate || navTournament?.start_date || navTournament?.startDate;
            let endDateVal = mergedTournament?.end_date || mergedTournament?.endDate || navTournament?.end_date || navTournament?.endDate;

            const tId = targetLeagueId || mergedTournament?.id || mergedTournament?._id || currentTournamentId;
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

            const parseBrandColors = (rawColors: any) => {
                if (!rawColors) return { primary: null, secondary: null };
                try {
                    let colors = rawColors;
                    if (typeof colors === 'string') {
                        const trimmed = colors.trim();
                        if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
                            colors = JSON.parse(trimmed);
                        } else if (trimmed.startsWith('#') || trimmed.startsWith('rgb')) {
                            return { primary: trimmed, secondary: trimmed };
                        }
                    }
                    if (Array.isArray(colors) && colors.length > 0) {
                        const valid = colors.filter((c: any) => typeof c === 'string' && c.trim().length > 0);
                        if (valid.length > 0) {
                            return {
                                primary: valid[0],
                                secondary: valid[1] || valid[0]
                            };
                        }
                    }
                    if (typeof colors === 'object' && colors !== null) {
                        const values = Object.values(colors).filter((v: any) => typeof v === 'string' && v.trim().length > 0) as string[];
                        if (values.length > 0) {
                            return {
                                primary: values[0],
                                secondary: values[1] || values[0]
                            };
                        }
                    }
                } catch (e) {
                    console.error('Error parsing brand_colors:', e);
                }
                return { primary: null, secondary: null };
            };

            let targetOrgId = resolvedLeagueRecord?.organization_id || mergedTournament?.organization_id || mergedTournament?.organizationId || navTournament?.organization_id || navTournament?.organizationId;
            if (!targetOrgId && resolvedTeams.length > 0) {
                targetOrgId = resolvedTeams[0].organization_id || resolvedTeams[0].organizationId;
            }
            if (!targetOrgId && targetLeagueId) {
                const { data: lgData } = await supabase.from('leagues').select('organization_id').eq('id', Number(targetLeagueId)).maybeSingle();
                if (lgData?.organization_id) {
                    targetOrgId = lgData.organization_id;
                }
            }

            let orgName = '';
            let orgLogo = '';
            let orgPhone = '';
            let orgPrimaryColor: string | null = null;
            let orgSecondaryColor: string | null = null;

            if (targetOrgId) {
                const { data: orgData } = await supabase.from('organizations').select('*').eq('id', targetOrgId).maybeSingle();
                if (orgData) {
                    orgName = orgData.name || orgData.title || orgData.organization_name || orgName;
                    orgLogo = orgData.logo_url || orgData.logo || orgData.photo_url || orgLogo;
                    orgPhone = orgData.phone || orgData.contact_phone || orgPhone;
                    
                    const parsedColors = parseBrandColors(orgData.brand_colors || orgData.brand_color || orgData.colors);
                    orgPrimaryColor = parsedColors.primary || orgData.primary_color || null;
                    orgSecondaryColor = parsedColors.secondary || orgData.secondary_color || orgPrimaryColor;
                }
            }

            if (!orgName) {
                orgName = mergedTournament?.organizations?.name || mergedTournament?.organizer || mergedTournament?.organizationName || 'Amatora';
                orgLogo = mergedTournament?.organizations?.logo_url || mergedTournament?.organizerLogo || mergedTournament?.organizationLogo || '';
                orgPhone = mergedTournament?.organizations?.phone || mergedTournament?.organizerPhone || mergedTournament?.phone || '';
            }

            const computedOrgInfo = {
                name: orgName,
                logo: orgLogo,
                phone: orgPhone,
                primaryColor: orgPrimaryColor,
                secondaryColor: orgSecondaryColor
            };

            // Fetch co-host organizations from league_collabs table
            let coOrganizers: any[] = [];
            if (targetLeagueId) {
                try {
                    const { data: collabs } = await supabase
                        .from('league_collabs')
                        .select('*')
                        .eq('league_id', Number(targetLeagueId))
                        .eq('status', 'accepted');

                    if (collabs && collabs.length > 0) {
                        const coHostOrgIds: any[] = [];
                        collabs.forEach((c: any) => {
                            const sId = c.sender_org_id;
                            const rId = c.receiver_org_id;
                            if (targetOrgId) {
                                if (String(sId) === String(targetOrgId) && rId && String(rId) !== String(targetOrgId)) {
                                    coHostOrgIds.push(rId);
                                } else if (String(rId) === String(targetOrgId) && sId && String(sId) !== String(targetOrgId)) {
                                    coHostOrgIds.push(sId);
                                } else {
                                    if (rId && String(rId) !== String(targetOrgId)) coHostOrgIds.push(rId);
                                    if (sId && String(sId) !== String(targetOrgId)) coHostOrgIds.push(sId);
                                }
                            } else {
                                if (rId) coHostOrgIds.push(rId);
                                if (sId) coHostOrgIds.push(sId);
                            }
                        });

                        const uniqueCoHostIds = Array.from(new Set(coHostOrgIds));

                        if (uniqueCoHostIds.length > 0) {
                            const { data: coOrgsData } = await supabase
                                .from('organizations')
                                .select('*')
                                .in('id', uniqueCoHostIds);

                            if (coOrgsData && coOrgsData.length > 0) {
                                coOrganizers = coOrgsData.map((co: any) => {
                                    const parsedColors = parseBrandColors(co.brand_colors || co.brand_color || co.colors);
                                    return {
                                        id: co.id,
                                        name: co.name || co.title || co.organization_name || 'Hamkor Tashkilot',
                                        logo: co.logo_url || co.logo || co.photo_url || '',
                                        phone: co.phone || co.contact_phone || '',
                                        primaryColor: parsedColors.primary || co.primary_color || null,
                                        secondaryColor: parsedColors.secondary || co.secondary_color || parsedColors.primary || null,
                                        roleType: 'cohost'
                                    };
                                });
                            }
                        }
                    }
                } catch (err) {
                    console.error('Error fetching league_collabs:', err);
                }
            }

            const allOrganizers = [
                {
                    ...computedOrgInfo,
                    id: targetOrgId || 'main',
                    roleType: 'main'
                },
                ...coOrganizers
            ];
            setOrganizersList(allOrganizers);
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
                organizersList: allOrganizers,
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
            // Fetch fresh data in background so brand colors & cohosts update immediately
            fetchTournamentData(isCacheFresh ? true : false);
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

    const getMatchTourKey = (m: any): string => {
        if (!m) return '1-TUR';
        const raw = m.round_tag || m.round_name || m.round_number || m.round || m.tour || m.tourNumber;
        if (!raw) return '1-TUR';
        return String(raw).trim();
    };

    const parseMatchTourNumber = (m: any): number => {
        const raw = getMatchTourKey(m);
        if (!raw) return 0;
        const numMatch = raw.match(/\d+/);
        return numMatch ? parseInt(numMatch[0], 10) : 0;
    };

    const formatTourTitle = useCallback((rawTour: string): string => {
        const s = String(rawTour || '').trim();
        if (!s) return t('matches.round_tour', { round: 1 });
        const numMatch = s.match(/\d+/);
        if (numMatch) {
            return t('matches.round_tour', { round: numMatch[0] });
        }
        const lower = s.toLowerCase();
        if (lower.includes('final') && !lower.includes('yarim') && !lower.includes('semi') && !lower.includes('1/')) {
            return t('matches.final', 'FINAL').toUpperCase();
        }
        if (lower.includes('yarim') || lower.includes('semi') || lower.includes('1/2')) {
            return t('matches.semi_final', 'YARIM FINAL').toUpperCase();
        }
        if (lower.includes('chorak') || lower.includes('quarter') || lower.includes('1/4')) {
            return t('matches.quarter_final', 'CHORAK FINAL').toUpperCase();
        }
        if (lower.includes('1/8') || lower.includes('nimchorak')) {
            return t('matches.round_of_16', '1/8 FINAL').toUpperCase();
        }
        return s.toUpperCase();
    }, [t]);

    const groupedMatchesByTour = useMemo(() => {
        const groupsMap: Record<string, { tourKey: string; tourTitle: string; tourNum: number; matches: any[] }> = {};

        filteredMatches.forEach(m => {
            const rawKey = getMatchTourKey(m);
            const tourNum = parseMatchTourNumber(m);
            const tourTitle = formatTourTitle(rawKey);

            if (!groupsMap[rawKey]) {
                groupsMap[rawKey] = {
                    tourKey: rawKey,
                    tourTitle,
                    tourNum,
                    matches: []
                };
            }
            groupsMap[rawKey].matches.push(m);
        });

        return Object.values(groupsMap).map(group => ({
            ...group,
            matches: group.matches.sort((a, b) => {
                const dateA = new Date(a.date || a.match_date || a.createdAt || 0).getTime();
                const dateB = new Date(b.date || b.match_date || b.createdAt || 0).getTime();
                return dateA - dateB;
            })
        })).sort((a, b) => {
            // Eng oxirgi (eng katta raqamli) tur eng boshida chiqsin
            if (a.tourNum > 0 && b.tourNum > 0) return b.tourNum - a.tourNum;
            if (a.tourNum > 0) return -1;
            if (b.tourNum > 0) return 1;
            const maxDateA = Math.max(...a.matches.map((m: any) => new Date(m.date || m.match_date || m.createdAt || 0).getTime()));
            const maxDateB = Math.max(...b.matches.map((m: any) => new Date(m.date || m.match_date || m.createdAt || 0).getTime()));
            return maxDateB - maxDateA;
        });
    }, [filteredMatches, formatTourTitle]);

    const getDisplaySeason = () => {
        if (tournamentData?.season && tournamentData.season.trim()) return tournamentData.season.trim();
        if (tournament?.season && tournament.season.trim()) return tournament.season.trim();
        const nameStr = tournamentData?.name || tournamentName || tournament?.name || '';
        const match = nameStr.match(/\b(20\d{2}[\/-]20\d{2}|20\d{2})\b/);
        if (match) return match[0];
        return '2026/2027';
    };

    const cardSurfaceStyle = {
        backgroundColor: isDark ? homeColors.background : '#FFFFFF',
        borderWidth: 1,
        borderColor: homeColors.border,
        elevation: isDark ? 0 : 2,
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: isDark ? 0 : 0.05,
        shadowRadius: 6,
    };

    const renderHeader = () => {
        return (
            <View style={[styles.header, { backgroundColor: homeColors.background }]}>
                <View style={styles.headerRow}>
                    <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                        <Ionicons name="arrow-back" size={22} color={homeColors.textPrimary} />
                    </TouchableOpacity>
                    <Text style={[styles.headerTitle, { color: homeColors.textPrimary }]} numberOfLines={1}>
                        {tournamentData?.name?.toUpperCase() || tournamentName?.toUpperCase() || 'TURNIR'}
                    </Text>
                    <View style={[styles.seasonBadge, { backgroundColor: isDark ? homeColors.background : '#ECECEE', borderColor: homeColors.border }]}>
                        <Text style={[styles.seasonText, { color: homeColors.textPrimary }]}>{getDisplaySeason()}</Text>
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
            requestAnimationFrame(() => { isTabPressRef.current = false; });
        }
    };

    const handlePagerScroll = (e: any) => {
        const offsetX = e.nativeEvent?.contentOffset?.x;
        if (activeTabRef.current === 'overview' && typeof offsetX === 'number' && offsetX < -25 && !isExitingRef.current) {
            isExitingRef.current = true;
            navigation.goBack();
        }
    };

    const onPagerMomentumEnd = (e: any) => {
        if (isTabPressRef.current) return;
        const idx = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
        if (idx >= 0 && idx < TABS.length) {
            setActiveTab(TABS[idx]);
        }
    };

    const TAB_BAR_WIDTH = SCREEN_WIDTH - 32;
    const TAB_WIDTH = TAB_BAR_WIDTH / TABS.length;
    const DEFAULT_INDICATOR_WIDTH = TAB_WIDTH * 0.72;
    const tabIndicatorInputRange = TABS.map((_, i) => i * SCREEN_WIDTH);
    const indicatorWidths = TABS.map((_, i) => tabLabelWidths[i] ?? DEFAULT_INDICATOR_WIDTH);
    const indicatorLefts = TABS.map((_, i) => i * TAB_WIDTH + (TAB_WIDTH - indicatorWidths[i]) / 2);

    const indicatorTranslateX = scrollXPager.interpolate({
        inputRange: tabIndicatorInputRange,
        outputRange: indicatorLefts,
        extrapolate: 'clamp',
    });
    const indicatorWidthAnim = scrollXPager.interpolate({
        inputRange: tabIndicatorInputRange,
        outputRange: indicatorWidths,
        extrapolate: 'clamp',
    });

    const getTabLabel = (tab: string) => {
        switch (tab) {
            case 'overview': return t('tournaments.overview', 'Umumiy');
            case 'standings': return t('tournaments.standings', 'Jadval');
            case 'players': return t('tournaments.players', "O'yinchilar");
            case 'matches': return t('tournaments.matches', "O'yinlar");
            default: return tab;
        }
    };

    const renderTabs = () => (
        <View style={[styles.tabsContainer, { backgroundColor: homeColors.background, borderBottomColor: homeColors.border }]}>
            <Animated.View
                style={[
                    styles.tabActiveLine,
                    {
                        width: indicatorWidthAnim,
                        backgroundColor: homeColors.accent,
                        shadowColor: homeColors.accent,
                        transform: [{ translateX: indicatorTranslateX }],
                    },
                ]}
            />
            <View style={styles.tabsRowContainer}>
                {TABS.map((tabKey, idx) => {
                    const isActive = activeTab === tabKey;
                    return (
                        <TouchableOpacity
                            key={tabKey}
                            style={styles.tabEqual}
                            onPress={() => handleTabPress(tabKey)}
                            activeOpacity={0.7}
                        >
                            <Text
                                style={[
                                    styles.tabText,
                                    { color: homeColors.textSecondary },
                                    isActive && { color: homeColors.textPrimary, fontWeight: '900' },
                                ]}
                                onLayout={(e) => {
                                    const w = e.nativeEvent.layout.width + 8;
                                    setTabLabelWidths(prev => {
                                        if (prev[idx] === w) return prev;
                                        const next = [...prev];
                                        next[idx] = w;
                                        return next;
                                    });
                                }}
                            >
                                {getTabLabel(tabKey).toUpperCase()}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </View>
        </View>
    );

    const renderOverview = () => {
        const startDateVal = tournamentData?.start_date || tournamentData?.startDate;
        const endDateVal = tournamentData?.end_date || tournamentData?.endDate;

        return (
            <ScrollView style={styles.tabContent} contentContainerStyle={{ paddingBottom: 110 }}>
                {/* Information Card */}
                <View style={[styles.sectionCard, cardSurfaceStyle]}>
                    <View style={styles.sectionHeader}>
                        <Text style={[styles.sectionTitle, { color: homeColors.textPrimary }]}>
                            {t('tournaments.general_info', 'UMUMIY MA\'LUMOT').toUpperCase()}
                        </Text>
                    </View>

                    <View style={styles.infoRow}>
                        <Text style={[styles.infoLabel, { color: homeColors.textSecondary }]}>{t('tournaments.start_date', 'Boshlanish')}</Text>
                        <View style={[styles.dashedLine, { borderColor: homeColors.border }]} />
                        <Text style={[styles.infoValue, { color: homeColors.textPrimary }]}>{formatDate(startDateVal)}</Text>
                    </View>

                    <View style={styles.infoRow}>
                        <Text style={[styles.infoLabel, { color: homeColors.textSecondary }]}>{t('tournaments.end_date', 'Tugash')}</Text>
                        <View style={[styles.dashedLine, { borderColor: homeColors.border }]} />
                        <Text style={[styles.infoValue, { color: homeColors.textPrimary }]}>{formatDate(endDateVal)}</Text>
                    </View>

                    <View style={styles.infoRow}>
                        <Text style={[styles.infoLabel, { color: homeColors.textSecondary }]}>{t('common.status', 'Holati')}</Text>
                        <View style={[styles.dashedLine, { borderColor: homeColors.border }]} />
                        <View style={styles.statusRow}>
                            <Text style={[styles.infoValue, { color: homeColors.textPrimary }]}>
                                {tournamentData?.status === 'ongoing' ? t('tournaments.ongoing', 'Davom etmoqda') : 
                                 tournamentData?.status === 'finished' ? t('tournaments.finished_status', 'Yakunlangan') : t('tournaments.planned_status', 'Rejalashtirilgan')}
                            </Text>
                            <View style={[styles.statusDot, { backgroundColor: tournamentData?.status === 'ongoing' ? '#00C864' : homeColors.textSecondary }]} />
                        </View>
                    </View>

                    <View style={styles.infoRow}>
                        <Text style={[styles.infoLabel, { color: homeColors.textSecondary }]}>{t('tournaments.teams_tab', 'Jamoalar')}</Text>
                        <View style={[styles.dashedLine, { borderColor: homeColors.border }]} />
                        <Text style={[styles.infoValue, { color: homeColors.textPrimary }]}>{teams?.length || standings?.length || 0}</Text>
                    </View>

                    <View style={styles.infoRow}>
                        <Text style={[styles.infoLabel, { color: homeColors.textSecondary }]}>{t('tournaments.total_players', "O'yinchilar")}</Text>
                        <View style={[styles.dashedLine, { borderColor: homeColors.border }]} />
                        <Text style={[styles.infoValue, { color: homeColors.textPrimary }]}>{totalPlayersCount || (topPlayers.length > 0 ? topPlayers.length : 0)}</Text>
                    </View>

                    <View style={styles.infoRow}>
                        <Text style={[styles.infoLabel, { color: homeColors.textSecondary }]}>{t('tournaments.match_duration', 'O\'yin davomiyligi')}</Text>
                        <View style={[styles.dashedLine, { borderColor: homeColors.border }]} />
                        <Text style={[styles.infoValue, { color: homeColors.textPrimary }]}>
                            {tournamentData?.match_duration || tournamentData?.duration || "50 (25x25)"}
                        </Text>
                    </View>
                </View>

                    {/* Organizers Card */}
                    <View style={[styles.sectionCard, cardSurfaceStyle]}>
                        <View style={styles.sectionHeader}>
                            <Text style={[styles.sectionTitle, { color: homeColors.textPrimary }]}>
                                {t('tournaments.organizers', 'TASHKILOTCHILAR').toUpperCase()}
                            </Text>
                        </View>

                        {(organizersList && organizersList.length > 0 ? organizersList : [{ ...organizerInfo, roleType: 'main' }]).map((orgItem: any, orgIdx: number) => {
                            const isCohost = orgItem?.roleType === 'cohost';

                            const orgGradientColors: [string, string, ...string[]] = (orgItem?.primaryColor && orgItem?.secondaryColor)
                                ? [orgItem.primaryColor, orgItem.secondaryColor]
                                : orgItem?.primaryColor
                                    ? [orgItem.primaryColor, orgItem.primaryColor]
                                    : (isDark ? ['#242D3D', '#121620'] : ['#242D3D', '#121620']);

                            return (
                                <View
                                    key={orgItem.id || `org_${orgIdx}`}
                                    style={[
                                        styles.organizerRow,
                                        orgIdx > 0 && { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: homeColors.border }
                                    ]}
                                >
                                    <LinearGradient
                                        colors={orgGradientColors}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 1 }}
                                        style={[styles.organizerLogoBox, { borderColor: homeColors.border }]}
                                    >
                                        {orgItem.logo ? (
                                            <SmartImage uri={orgItem.logo} style={{ width: 36, height: 36, borderRadius: 8 }} contentFit="contain" fallbackIcon="business" />
                                        ) : (
                                            <Ionicons name="business-outline" size={22} color="#FFFFFF" />
                                        )}
                                    </LinearGradient>
                                    <View style={styles.organizerInfoTextCol}>
                                        <Text style={[styles.organizerName, { color: homeColors.textPrimary }]} numberOfLines={1}>
                                            {(orgItem.name || 'Amatora').toUpperCase()}
                                        </Text>
                                        <Text style={[styles.organizerRole, { color: isCohost ? homeColors.accent : homeColors.textSecondary }]}>
                                            {isCohost 
                                                ? t('tournaments.co_organizer', 'HAMKOR TASHKILOTCHI').toUpperCase() 
                                                : t('tournaments.official_organizer', 'RASMIY TASHKILOTCHI').toUpperCase()
                                            }
                                        </Text>
                                    </View>
                                    {orgItem.phone ? (
                                        <TouchableOpacity 
                                            style={[styles.phoneBtn, { backgroundColor: isDark ? homeColors.background : '#F0F0F2', borderColor: homeColors.border }]} 
                                            onPress={() => Linking.openURL(`tel:${orgItem.phone}`)}
                                        >
                                            <Ionicons name="call-outline" size={18} color={homeColors.accent} />
                                        </TouchableOpacity>
                                    ) : null}
                                </View>
                            );
                        })}
                    </View>

                {/* Latest Matches Card */}
                {latestMatches.length > 0 && (
                    <View style={[styles.sectionCard, cardSurfaceStyle]}>
                        <View style={styles.sectionHeader}>
                            <Text style={[styles.sectionTitle, { color: homeColors.textPrimary }]}>
                                {t('tournaments.latest_matches', "SO'NGGI O'YINLAR").toUpperCase()}
                            </Text>
                        </View>
                        <View style={{ paddingTop: 4 }}>
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
                                        style={[styles.matchCardInner, { borderColor: homeColors.border }]}
                                        onPress={() => setActiveTab('matches')}
                                        activeOpacity={0.85}
                                    >
                                        <View style={{ padding: 12 }}>
                                            <View style={styles.matchMetaRowFull}>
                                                <Text style={[styles.matchMetaText, { color: homeColors.textSecondary }]}>
                                                    {formatTourTitle(match.tourNumber || (match.round ? `${match.round}-TUR` : ''))}
                                                </Text>
                                                <Text style={[styles.matchMetaText, { color: homeColors.textSecondary }]}>
                                                    {match.date || match.scheduledAt || match.date_str}
                                                </Text>
                                            </View>

                                            <View style={styles.matchTeamsRowFull}>
                                                <Text style={[styles.teamShortFull, { color: homeColors.textPrimary }]}>
                                                    {getTeamAbbreviation(match.homeTeam?.name || match.homeTeamName || 'HME')}
                                                </Text>
                                                <View style={[styles.logoCircleSmall, { backgroundColor: isDark ? homeColors.background : '#F2F2F4', borderColor: homeColors.border }]}>
                                                    {match.homeTeam?.logo || match.homeTeamLogo ? (
                                                        <Image source={{ uri: match.homeTeam?.logo || match.homeTeamLogo }} style={{ width: 28, height: 28, borderRadius: 14 }} />
                                                    ) : (
                                                        <Ionicons name="shield-outline" size={18} color={homeColors.textSecondary} />
                                                    )}
                                                </View>

                                                {isLive ? (
                                                    <View style={{ alignItems: 'center', marginHorizontal: 8 }}>
                                                        <Text style={[styles.scoreTextFull, { color: '#FF3B30' }]}>
                                                            {match.score?.home ?? match.home_score ?? 0} : {match.score?.away ?? match.away_score ?? 0}
                                                        </Text>
                                                        <View style={styles.liveTagBadge}>
                                                            <View style={styles.liveRedDot} />
                                                            <Text style={styles.liveTagText}>LIVE</Text>
                                                        </View>
                                                    </View>
                                                ) : isScheduled ? (
                                                    <View style={{ alignItems: 'center', marginHorizontal: 10 }}>
                                                        <Text style={[styles.scoreTextFullVs, { color: homeColors.textPrimary }]}>VS</Text>
                                                        {timeStr ? <Text style={[styles.vsTimeText, { color: homeColors.textSecondary }]}>{timeStr}</Text> : null}
                                                    </View>
                                                ) : (
                                                    <Text style={[styles.scoreTextFull, { color: homeColors.textPrimary }]}>
                                                        {match.score?.home ?? match.home_score ?? 0} : {match.score?.away ?? match.away_score ?? 0}
                                                    </Text>
                                                )}

                                                <View style={[styles.logoCircleSmall, { backgroundColor: isDark ? homeColors.background : '#F2F2F4', borderColor: homeColors.border }]}>
                                                    {match.awayTeam?.logo || match.awayTeamLogo ? (
                                                        <Image source={{ uri: match.awayTeam?.logo || match.awayTeamLogo }} style={{ width: 28, height: 28, borderRadius: 14 }} />
                                                    ) : (
                                                        <Ionicons name="shield-outline" size={18} color={homeColors.textSecondary} />
                                                    )}
                                                </View>
                                                <Text style={[styles.teamShortFull, { color: homeColors.textPrimary }]}>
                                                    {getTeamAbbreviation(match.awayTeam?.name || match.awayTeamName || 'AWY')}
                                                </Text>
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

    const renderStandings = () => (
        <View style={styles.tabContent}>
            <View style={[styles.searchContainer, { backgroundColor: isDark ? homeColors.background : '#F2F2F4', borderColor: homeColors.border }]}>
                <Ionicons name="search" size={18} color={homeColors.textSecondary} style={styles.searchIcon} />
                <TextInput
                    style={[styles.searchInput, { color: homeColors.textPrimary }]}
                    placeholder={t('tournaments.search_placeholder', 'Qidirish...')}
                    placeholderTextColor={homeColors.textSecondary}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                />
            </View>

            {isLoadingStandings ? (
                <TableSkeleton />
            ) : (
                <View style={[styles.screenshotCardWrapper, cardSurfaceStyle]}>
                    {/* Header Columns */}
                    <View style={[styles.screenshotTableHeader, { backgroundColor: isDark ? homeColors.background : '#F0F0F2', borderBottomColor: homeColors.border }]}>
                        <Text style={[styles.screenshotHeaderPos, { color: homeColors.textSecondary }]}>{t('tournaments.table_rank', '#')}</Text>
                        <Text style={[styles.screenshotHeaderTeam, { color: homeColors.textSecondary }]}>{t('tournaments.table_team', 'JAMOA')}</Text>
                        <Text style={[styles.screenshotHeaderPlayed, { color: homeColors.textSecondary }]}>{t('tournaments.table_played', 'O\'')}</Text>
                        <Text style={[styles.screenshotHeaderGd, { color: homeColors.textSecondary }]}>{t('tournaments.table_gd', 'T/N')}</Text>
                        <Text style={[styles.screenshotHeaderPoints, { color: homeColors.textSecondary }]}>{t('tournaments.table_points', 'O')}</Text>
                    </View>

                    <ScrollView contentContainerStyle={{ paddingBottom: 110 }} showsVerticalScrollIndicator={false}>
                        {filteredStandings.length === 0 ? (
                            <View style={styles.empty}>
                                <Text style={[styles.emptyText, { color: homeColors.textSecondary }]}>{t('tournaments.no_data', 'Ma\'lumot topilmadi')}</Text>
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
                                        style={[styles.screenshotRow, { borderBottomColor: homeColors.border }]}
                                        onPress={() => navigation.navigate('TeamProfile', { team: team, teamId: team.teamId || team.id || team._id })}
                                        activeOpacity={0.7}
                                    >
                                        {index === 0 ? (
                                            <View style={{ width: 28, alignItems: 'center', justifyContent: 'center' }}>
                                                <FontAwesome5 name="medal" size={15} color="#FFB800" />
                                            </View>
                                        ) : index === 1 ? (
                                            <View style={{ width: 28, alignItems: 'center', justifyContent: 'center' }}>
                                                <FontAwesome5 name="medal" size={15} color="#A0A0A0" />
                                            </View>
                                        ) : index === 2 ? (
                                            <View style={{ width: 28, alignItems: 'center', justifyContent: 'center' }}>
                                                <FontAwesome5 name="medal" size={15} color="#CD7F32" />
                                            </View>
                                        ) : (
                                            <Text style={[styles.screenshotPos, { color: homeColors.textSecondary }]}>{index + 1}</Text>
                                        )}
                                        
                                        <View style={styles.screenshotTeamCol}>
                                            <View style={[styles.screenshotLogoCircle, { backgroundColor: isDark ? homeColors.background : '#F2F2F4', borderColor: homeColors.border }]}>
                                                {team.logo || team.logo_url ? (
                                                    <Image source={{ uri: team.logo || team.logo_url }} style={styles.screenshotLogoImg} />
                                                ) : (
                                                    <Ionicons name="shield-outline" size={14} color={homeColors.textSecondary} />
                                                )}
                                            </View>
                                            <Text style={[styles.screenshotTeamName, { color: homeColors.textPrimary }]} numberOfLines={1}>{(team.name || 'JAMOA').toUpperCase()}</Text>
                                        </View>
                                        
                                        <Text style={[styles.screenshotStatPlayed, { color: homeColors.textPrimary }]}>{played}</Text>
                                        <Text style={[styles.screenshotStatGd, { color: homeColors.textSecondary }]}>{gd}</Text>
                                        <Text style={[styles.screenshotStatPoints, { color: homeColors.textPrimary }]}>{points}</Text>
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
            { id: 'goals', label: t('tournaments.stat_goals', 'GOLLAR'), icon: 'football-outline' },
            { id: 'assists', label: t('tournaments.stat_assists', 'ASSISTLAR'), icon: 'people-outline' },
            { id: 'yellowCards', label: t('tournaments.stat_yellow_cards', 'SARIQ KARTALAR'), icon: 'square-outline', color: '#FFB800' },
            { id: 'redCards', label: t('tournaments.stat_red_cards', 'QIZIL KARTALAR'), icon: 'square-outline', color: '#FF3B30' },
            { id: 'matchesPlayed', label: t('tournaments.stat_matches_played', 'O\'YINLAR'), icon: 'calendar-outline' },
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
                <View style={[styles.searchContainer, { backgroundColor: isDark ? homeColors.background : '#F2F2F4', borderColor: homeColors.border }]}>
                    <Ionicons name="search" size={18} color={homeColors.textSecondary} style={styles.searchIcon} />
                    <TextInput
                        style={[styles.searchInput, { color: homeColors.textPrimary }]}
                        placeholder={t('tournaments.search_placeholder', 'Qidirish...')}
                        placeholderTextColor={homeColors.textSecondary}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                </View>

                {/* Stat Filter Selector Dropdown */}
                <View style={styles.statsSelectorContainer}>
                    <TouchableOpacity 
                        style={[styles.activeStatBtn, { backgroundColor: isDark ? homeColors.background : '#F2F2F4', borderColor: homeColors.border }]} 
                        onPress={toggleStatSelector}
                        activeOpacity={0.8}
                    >
                        <View style={styles.activeStatLeft}>
                            <Ionicons name={activeOption.icon as any} size={16} color={activeOption.color || homeColors.accent} />
                            <Text style={[styles.activeStatLabel, { color: homeColors.textPrimary }]}>{activeOption.label}</Text>
                        </View>
                        <Ionicons 
                            name={isStatSelectorOpen ? "chevron-up" : "chevron-down"} 
                            size={18} 
                            color={homeColors.textSecondary} 
                        />
                    </TouchableOpacity>

                    <Animated.View style={[styles.statDropdown, { maxHeight: dropdownHeight, opacity: dropdownOpacity, overflow: 'hidden', backgroundColor: isDark ? homeColors.background : '#FFFFFF', borderColor: homeColors.border }]}>
                        {statOptions.map((opt) => (
                            <TouchableOpacity
                                key={opt.id}
                                style={[styles.statOption, { borderBottomColor: homeColors.border }, statFilter === opt.id && { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#F2F2F4' }]}
                                onPress={() => handleStatSelect(opt.id)}
                            >
                                <View style={styles.statOptLeft}>
                                    <Ionicons 
                                        name={opt.icon as any} 
                                        size={16} 
                                        color={statFilter === opt.id ? homeColors.accent : (opt.color || homeColors.textSecondary)} 
                                    />
                                    <Text style={[styles.statOptLabel, { color: statFilter === opt.id ? homeColors.textPrimary : homeColors.textSecondary }, statFilter === opt.id && { fontWeight: '800' }]}>
                                        {opt.label}
                                    </Text>
                                </View>
                                {statFilter === opt.id && (
                                    <Ionicons name="checkmark" size={16} color={homeColors.accent} />
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
                                <Text style={[styles.emptyText, { color: homeColors.textSecondary }]}>{t('tournaments.no_data', 'Ma\'lumot topilmadi')}</Text>
                            </View>
                        ) : (
                            filteredPlayers.map((player, index) => {
                                const statValue = player[statFilter] ?? player.stats?.[statFilter] ?? 0;
                                return (
                                    <TouchableOpacity 
                                        key={player._id || player.id || index} 
                                        style={[styles.playerRow, cardSurfaceStyle]}
                                        onPress={() => navigation.navigate('PlayerStats', { playerId: player._id || player.id, player: player })}
                                    >
                                        <View style={{ flexDirection: 'row', alignItems: 'center', width: '100%', paddingHorizontal: 12, paddingVertical: 10 }}>
                                            {(!['yellowCards', 'redCards'].includes(statFilter) && index === 0) ? (
                                                <View style={{ width: 24, alignItems: 'center', justifyContent: 'center', marginRight: 4 }}>
                                                    <FontAwesome5 name="medal" size={16} color="#FFB800" />
                                                </View>
                                            ) : (!['yellowCards', 'redCards'].includes(statFilter) && index === 1) ? (
                                                <View style={{ width: 24, alignItems: 'center', justifyContent: 'center', marginRight: 4 }}>
                                                    <FontAwesome5 name="medal" size={16} color="#A0A0A0" />
                                                </View>
                                            ) : (!['yellowCards', 'redCards'].includes(statFilter) && index === 2) ? (
                                                <View style={{ width: 24, alignItems: 'center', justifyContent: 'center', marginRight: 4 }}>
                                                    <FontAwesome5 name="medal" size={16} color="#CD7F32" />
                                                </View>
                                            ) : (
                                                <Text style={[styles.playerIndex, { color: homeColors.textSecondary }]}>{index + 1}</Text>
                                            )}
                                            <View style={styles.playerHexImage}>
                                                {player.photo ? (
                                                    <Image source={{ uri: player.photo }} style={{ width: 36, height: 36, borderRadius: 18 }} />
                                                ) : (
                                                    <Ionicons name="person-circle-outline" size={36} color={homeColors.textSecondary} />
                                                )}
                                            </View>
                                            <View style={styles.playerInfo}>
                                                <Text style={[styles.playerStatName, { color: homeColors.textPrimary }]}>{(`${player.firstName || ''} ${player.lastName || ''}`).trim().toUpperCase()}</Text>
                                                <Text style={[styles.playerTeamText, { color: homeColors.textSecondary }]}>{player.teamName?.toUpperCase() || 'AMATORA'}</Text>
                                            </View>
                                            <View style={[styles.playerStatBadge, { backgroundColor: isDark ? 'rgba(0, 255, 135, 0.12)' : 'rgba(0, 200, 100, 0.12)' }]}>
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
            <View style={[styles.searchContainer, { backgroundColor: isDark ? homeColors.background : '#F2F2F4', borderColor: homeColors.border }]}>
                <Ionicons name="search" size={18} color={homeColors.textSecondary} style={styles.searchIcon} />
                <TextInput
                    style={[styles.searchInput, { color: homeColors.textPrimary }]}
                    placeholder={t('tournaments.search_placeholder', 'Qidirish...')}
                    placeholderTextColor={homeColors.textSecondary}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                />
            </View>

            {isLoadingMatches ? (
                <MatchesListSkeleton count={6} />
            ) : (
                <ScrollView contentContainerStyle={{ paddingBottom: 110, paddingHorizontal: 16 }} showsVerticalScrollIndicator={false}>
                    {groupedMatchesByTour.length === 0 ? (
                        <View style={styles.empty}>
                            <Text style={[styles.emptyText, { color: homeColors.textSecondary }]}>{t('tournaments.no_data', 'Ma\'lumot topilmadi')}</Text>
                        </View>
                    ) : (
                        groupedMatchesByTour.map((group: any) => (
                            <View
                                key={group.tourKey}
                                style={{
                                    marginBottom: 14,
                                    borderRadius: 16,
                                    overflow: 'hidden',
                                    backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#FFFFFF',
                                    shadowColor: '#000000',
                                    shadowOffset: { width: 0, height: 2 },
                                    shadowOpacity: isDark ? 0 : 0.05,
                                    shadowRadius: 6,
                                    elevation: isDark ? 0 : 2,
                                }}
                            >
                                {/* Tour Card Header */}
                                <View
                                    style={{
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        paddingHorizontal: 16,
                                        paddingVertical: 12,
                                        backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#F8F9FA',
                                    }}
                                >
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                        <View
                                            style={{
                                                width: 4,
                                                height: 14,
                                                borderRadius: 2,
                                                backgroundColor: Colors.primary,
                                            }}
                                        />
                                        <Text style={{ fontSize: 13, fontWeight: '800', color: homeColors.textPrimary, letterSpacing: 0.5 }}>
                                            {group.tourTitle}
                                        </Text>
                                    </View>

                                    <View
                                        style={{
                                            paddingHorizontal: 8,
                                            paddingVertical: 3,
                                            borderRadius: 8,
                                            backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#ECECEE',
                                        }}
                                    >
                                        <Text style={{ fontSize: 10, fontWeight: '700', color: homeColors.textSecondary }}>
                                            {t('matches.matches_count', { count: group.matches.length }).toUpperCase()}
                                        </Text>
                                    </View>
                                </View>

                                {/* Tour Matches List inside this Tour Card */}
                                <View>
                                    {group.matches.map((match: any, matchIdx: number) => {
                                        const isLive = match.status === 'live';
                                        const isFinished = match.status === 'finished' || match.status === 'completed' || match.status === 'ended' || match.status === 'tugadi';
                                        const isScheduled = !isLive && !isFinished;

                                        let timeStr = String(match.match_time || match.time || '').trim();
                                        if (timeStr && timeStr.includes(':')) {
                                            const parts = timeStr.split(':');
                                            timeStr = `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}`;
                                        }

                                        const rawDate = match.date || match.match_date;
                                        const matchDate = new Date(rawDate);
                                        const isValidDate = !isNaN(matchDate.getTime());
                                        const months = [
                                            'Yan', 'Fev', 'Mar', 'Apr', 'May', 'Iyun', 
                                            'Iyul', 'Avg', 'Sen', 'Okt', 'Noy', 'Dek'
                                        ];
                                        const day = isValidDate ? matchDate.getDate() : '';
                                        const month = isValidDate ? months[matchDate.getMonth()] : '';
                                        const dateDisplay = isValidDate ? `${day} ${month}` : (match.date_str || '');

                                        return (
                                            <TouchableOpacity
                                                key={match._id || match.id || matchIdx}
                                                style={{
                                                    paddingHorizontal: 14,
                                                    paddingVertical: 12,
                                                    backgroundColor: isLive ? (isDark ? 'rgba(255, 59, 48, 0.08)' : 'rgba(255, 59, 48, 0.05)') : 'transparent',
                                                }}
                                                onPress={() => navigation.navigate('MatchDetail', { matchData: match, matchId: match._id || match.id })}
                                                activeOpacity={0.7}
                                            >
                                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                                    {/* Home Team (Right-aligned) */}
                                                    <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 6, paddingRight: 6 }}>
                                                        <Text
                                                            style={{
                                                                fontSize: 11.5,
                                                                fontWeight: '700',
                                                                color: homeColors.textPrimary,
                                                                letterSpacing: 0.1,
                                                                textAlign: 'right',
                                                            }}
                                                            numberOfLines={1}
                                                        >
                                                            {match.homeTeam?.name || match.homeTeamName || 'UY'}
                                                        </Text>
                                                        <View
                                                            style={{
                                                                width: 24,
                                                                height: 24,
                                                                borderRadius: 12,
                                                                backgroundColor: isDark ? '#222222' : '#F2F2F4',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                overflow: 'hidden',
                                                            }}
                                                        >
                                                            {match.homeTeam?.logo || match.homeTeamLogo ? (
                                                                <Image
                                                                    source={{ uri: match.homeTeam?.logo || match.homeTeamLogo }}
                                                                    style={{ width: 22, height: 22, borderRadius: 11 }}
                                                                />
                                                            ) : (
                                                                <Ionicons name="shield-outline" size={13} color={homeColors.textSecondary} />
                                                            )}
                                                        </View>
                                                    </View>

                                                    {/* Center: Score / Time / LIVE */}
                                                    <View style={{ width: 72, alignItems: 'center', justifyContent: 'center' }}>
                                                        {isLive ? (
                                                            <View style={{ alignItems: 'center' }}>
                                                                <Text style={{ fontSize: 15, fontWeight: '900', color: '#FF3B30', letterSpacing: 0.5 }}>
                                                                    {match.score?.home ?? match.home_score ?? 0} : {match.score?.away ?? match.away_score ?? 0}
                                                                </Text>
                                                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 1 }}>
                                                                    <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: '#FF3B30' }} />
                                                                    <Text style={{ fontSize: 8, fontWeight: '800', color: '#FF3B30', letterSpacing: 0.3 }}>LIVE</Text>
                                                                </View>
                                                            </View>
                                                        ) : isFinished ? (
                                                            <View style={{ alignItems: 'center' }}>
                                                                <Text style={{ fontSize: 15, fontWeight: '800', color: homeColors.textPrimary, letterSpacing: 0.5 }}>
                                                                    {match.score?.home ?? match.home_score ?? 0} : {match.score?.away ?? match.away_score ?? 0}
                                                                </Text>
                                                                {dateDisplay ? (
                                                                    <Text style={{ fontSize: 8.5, color: homeColors.textSecondary, marginTop: 1, fontWeight: '600' }}>
                                                                        {dateDisplay}
                                                                    </Text>
                                                                ) : null}
                                                            </View>
                                                        ) : (
                                                            <View style={{ alignItems: 'center' }}>
                                                                <Text style={{ fontSize: 14.5, fontWeight: '700', color: homeColors.textPrimary, letterSpacing: -0.3 }}>
                                                                    {timeStr || '18:00'}
                                                                </Text>
                                                                {dateDisplay ? (
                                                                    <Text style={{ fontSize: 8.5, color: homeColors.textSecondary, marginTop: 1, fontWeight: '600' }}>
                                                                        {dateDisplay}
                                                                    </Text>
                                                                ) : null}
                                                            </View>
                                                        )}
                                                    </View>

                                                    {/* Away Team (Left-aligned) */}
                                                    <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start', gap: 6, paddingLeft: 6 }}>
                                                        <View
                                                            style={{
                                                                width: 24,
                                                                height: 24,
                                                                borderRadius: 12,
                                                                backgroundColor: isDark ? '#222222' : '#F2F2F4',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                overflow: 'hidden',
                                                            }}
                                                        >
                                                            {match.awayTeam?.logo || match.awayTeamLogo ? (
                                                                <Image
                                                                    source={{ uri: match.awayTeam?.logo || match.awayTeamLogo }}
                                                                    style={{ width: 22, height: 22, borderRadius: 11 }}
                                                                />
                                                            ) : (
                                                                <Ionicons name="shield-outline" size={13} color={homeColors.textSecondary} />
                                                            )}
                                                        </View>
                                                        <Text
                                                            style={{
                                                                fontSize: 11.5,
                                                                fontWeight: '700',
                                                                color: homeColors.textPrimary,
                                                                letterSpacing: 0.1,
                                                                textAlign: 'left',
                                                            }}
                                                            numberOfLines={1}
                                                        >
                                                            {match.awayTeam?.name || match.awayTeamName || 'MEH'}
                                                        </Text>
                                                    </View>
                                                </View>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>
                            </View>
                        ))
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
        <View style={[styles.container, { backgroundColor: homeColors.background }]}>
            <SafeAreaView style={styles.safeArea} edges={['top']}>
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
                        bounces={true}
                        alwaysBounceHorizontal={true}
                        overScrollMode="always"
                        onScroll={Animated.event(
                            [{ nativeEvent: { contentOffset: { x: scrollXPager } } }],
                            { useNativeDriver: false, listener: handlePagerScroll }
                        )}
                        scrollEventThrottle={16}
                        onMomentumScrollEnd={onPagerMomentumEnd}
                        onScrollEndDrag={(e) => {
                            const offsetX = e.nativeEvent?.contentOffset?.x;
                            if (activeTabRef.current === 'overview' && typeof offsetX === 'number' && offsetX < -20 && !isExitingRef.current) {
                                isExitingRef.current = true;
                                navigation.goBack();
                            }
                        }}
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
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    safeArea: { flex: 1 },
    header: { borderBottomWidth: 0 },
    headerRow: { flexDirection: 'row', alignItems: 'center', width: '100%', paddingHorizontal: 16, paddingVertical: 12 },
    backButton: { marginRight: 12 },
    headerTitle: { flex: 1, fontSize: 16, fontWeight: '800' },
    seasonBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1 },
    seasonText: { fontSize: 11, fontWeight: '700' },
    tabsContainer: {
        height: 44,
        marginHorizontal: 16,
        overflow: 'hidden',
        borderBottomWidth: 1,
        position: 'relative',
        justifyContent: 'center',
    },
    tabsRowContainer: {
        flexDirection: 'row',
        width: '100%',
        height: '100%',
        alignItems: 'center',
    },
    tabEqual: {
        flex: 1,
        height: '100%',
        alignItems: 'center',
        justifyContent: 'center',
    },
    tabActiveLine: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        height: 3,
        borderRadius: 1.5,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: 4,
        elevation: 3,
    },
    tabText: {
        fontSize: 12,
        fontWeight: '700',
        letterSpacing: 0.2,
    },
    tabContent: { flex: 1 },
    sectionCard: { marginHorizontal: 16, marginBottom: 12, padding: 14, borderRadius: 14, overflow: 'hidden' },
    sectionHeader: { marginBottom: 10 },
    sectionTitle: { fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
    infoRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 6 },
    infoLabel: { fontSize: 12, fontWeight: '600' },
    dashedLine: { flex: 1, height: 1, borderWidth: 1, borderStyle: 'dashed', marginHorizontal: 8 },
    infoValue: { fontSize: 12, fontWeight: '800' },
    statusRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    statusDot: { width: 7, height: 7, borderRadius: 3.5 },
    organizerRow: { flexDirection: 'row', alignItems: 'center' },
    organizerLogoBox: { width: 48, height: 48, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 12, borderWidth: 1, overflow: 'hidden' },
    organizerInfoTextCol: { flex: 1 },
    organizerName: { fontSize: 13, fontWeight: '800' },
    organizerRole: { fontSize: 10, fontWeight: '600', marginTop: 2 },
    phoneBtn: { width: 34, height: 34, borderRadius: 17, justifyContent: 'center', alignItems: 'center', borderWidth: 1 },
    matchCardInner: { borderRadius: 12, borderWidth: 1, marginBottom: 8 },
    searchContainer: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginBottom: 10, paddingHorizontal: 12, height: 40, borderRadius: 10, borderWidth: 1 },
    searchIcon: { marginRight: 8 },
    searchInput: { flex: 1, fontSize: 13, fontWeight: '600' },
    
    screenshotCardWrapper: {
        marginHorizontal: 16,
        borderRadius: 14,
        overflow: 'hidden',
        flex: 1,
    },
    screenshotTableHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderBottomWidth: 1,
    },
    screenshotHeaderPos: {
        width: 28,
        fontSize: 11,
        fontWeight: '800',
        textAlign: 'center',
    },
    screenshotHeaderTeam: {
        flex: 1,
        fontSize: 11,
        fontWeight: '800',
        paddingLeft: 6,
    },
    screenshotHeaderPlayed: {
        width: 34,
        fontSize: 11,
        fontWeight: '800',
        textAlign: 'center',
    },
    screenshotHeaderGd: {
        width: 42,
        fontSize: 11,
        fontWeight: '800',
        textAlign: 'center',
    },
    screenshotHeaderPoints: {
        width: 34,
        fontSize: 11,
        fontWeight: '800',
        textAlign: 'right',
        paddingRight: 4,
    },
    screenshotRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderBottomWidth: 1,
    },
    screenshotPos: {
        width: 28,
        fontSize: 12,
        fontWeight: '700',
        textAlign: 'center',
    },
    screenshotTeamCol: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        paddingLeft: 6,
    },
    screenshotLogoCircle: {
        width: 26,
        height: 26,
        borderRadius: 13,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 8,
        borderWidth: 1,
        overflow: 'hidden',
    },
    screenshotLogoImg: {
        width: 26,
        height: 26,
        borderRadius: 13,
    },
    screenshotTeamName: {
        fontSize: 12,
        fontWeight: '700',
        flex: 1,
    },
    screenshotStatPlayed: {
        width: 34,
        fontSize: 12,
        fontWeight: '700',
        textAlign: 'center',
    },
    screenshotStatGd: {
        width: 42,
        fontSize: 12,
        fontWeight: '600',
        textAlign: 'center',
    },
    screenshotStatPoints: {
        width: 34,
        fontSize: 13,
        fontWeight: '800',
        textAlign: 'right',
        paddingRight: 4,
    },

    statsSelectorContainer: { marginHorizontal: 16, marginBottom: 10, zIndex: 100 },
    activeStatBtn: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 14, height: 40, borderRadius: 10, borderWidth: 1 },
    activeStatLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    activeStatLabel: { fontSize: 12, fontWeight: '700' },
    statDropdown: { borderRadius: 10, borderWidth: 1, marginTop: 4 },
    statOption: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1 },
    statOptLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    statOptLabel: { fontSize: 12, fontWeight: '600' },
    playerRow: { marginHorizontal: 16, marginBottom: 8, borderRadius: 12, overflow: 'hidden' },
    playerIndex: { fontSize: 12, fontWeight: '700', width: 24, textAlign: 'center' },
    playerHexImage: { marginRight: 10 },
    playerInfo: { flex: 1 },
    playerStatName: { fontSize: 12, fontWeight: '700' },
    playerTeamText: { fontSize: 10, fontWeight: '600', marginTop: 1 },
    playerStatBadge: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 6 },
    playerGoals: { color: '#00C864', fontSize: 13, fontWeight: '800' },

    matchCardFull: { marginHorizontal: 16, marginBottom: 10, borderRadius: 14, overflow: 'hidden' },
    liveMatchCardFull: {
        borderColor: '#FF3B30',
        borderWidth: 1.5,
    },
    liveTagBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 59, 48, 0.15)',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
        marginTop: 2,
    },
    liveRedDot: {
        width: 5,
        height: 5,
        borderRadius: 2.5,
        backgroundColor: '#FF3B30',
        marginRight: 4,
    },
    liveTagText: {
        color: '#FF3B30',
        fontSize: 9,
        fontWeight: '900',
    },
    scoreTextFullVs: {
        fontSize: 16,
        fontWeight: '800',
    },
    vsTimeText: {
        fontSize: 10,
        fontWeight: '600',
        marginTop: 2,
    },
    matchMetaRowFull: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
    matchMetaText: { fontSize: 10, fontWeight: '600' },
    matchTeamsRowFull: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
    teamShortFull: { fontSize: 14, fontWeight: '800', width: 55, textAlign: 'center' },
    scoreTextFull: { fontSize: 18, fontWeight: '800', marginHorizontal: 8 },
    stadiumRowFull: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
    stadiumTextFull: { fontSize: 10, marginLeft: 4, fontWeight: '500' },
    logoCircleSmall: { width: 34, height: 34, borderRadius: 17, justifyContent: 'center', alignItems: 'center', marginHorizontal: 6, borderWidth: 1 },
    empty: { alignItems: 'center', marginTop: 40, paddingHorizontal: 20 },
    emptyText: { fontSize: 13, fontWeight: '600', textAlign: 'center' },
});

