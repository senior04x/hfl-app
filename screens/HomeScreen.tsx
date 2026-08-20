import React, { useEffect, useState, useRef, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, ActivityIndicator, Dimensions, RefreshControl } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../constants/Colors';
import ApiSlider from '../components/ApiSlider';
import { apiService } from '../services/apiService';
import { storyService } from '../services/storyService';
import { useSocket } from '../context/SocketContext';
import HomeSkeleton from '../components/HomeSkeleton';
import Skeleton from '../components/Skeleton';
import { useAuthStore } from '../store/useAuthStore';
import { useOrganizationStore } from '../store/useOrganizationStore';
import SmartImage from '../components/SmartImage';
import { BlurView } from 'expo-blur';
import AnimatedBackground from '../components/AnimatedBackground';
import backgroundImage from '../assets/images/backroud-image.png';
import { formatShortTeamName, formatLocalizedVenue, formatLocalizedDate } from '../utils/stringUtils';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import MatchStoriesTray, { StoryGroup } from '../components/MatchStoriesTray';
import StoryViewerModal from '../components/StoryViewerModal';
import { supabase } from '../services/supabase';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width * 0.88;
const CARD_SPACING = 12;
const SIDE_PADDING = (width - CARD_WIDTH) / 2;

const CACHE_KEY_PREFIX = '@amatora_home_cache_v4_org_';
const CACHE_TTL = 5 * 60 * 1000; // 5 minut

export default function HomeScreen({ navigation }: any) {
    const { t, i18n } = useTranslation();
    const currentLang = i18n.language || 'uz';
    const [matches, setMatches] = useState<any[]>([]);
    const [sliderItems, setSliderItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const { socket, isConnected } = useSocket();
    const { user, isGuest } = useAuthStore();
    const selectedOrgId = useOrganizationStore(s => s.selectedOrganizationId);
    const [userProfile, setUserProfile] = useState<any>(null);

    // Determine current org ID from user profile or store
    const currentOrgId = user?.organizationId || user?.organization_id || (user?.organization as any)?.id || selectedOrgId || 1;
    const CACHE_KEY = `${CACHE_KEY_PREFIX}${currentOrgId}`;

    // Stories state with persistent viewed tracking (@amatora_viewed_stories)
    const [storyModalVisible, setStoryModalVisible] = useState(false);
    const [selectedStoryIndex, setSelectedStoryIndex] = useState(0);
    const [storyGroups, setStoryGroups] = useState<StoryGroup[]>([]);
    const viewedStoryIdsRef = useRef<string[]>([]);
    const hasCachedDataRef = useRef(false);

    // 1-second live ticker for real-time match clock (MM:SS)
    const [, setLiveTick] = useState(0);
    useEffect(() => {
        const timer = setInterval(() => setLiveTick(t => t + 1), 1000);
        return () => clearInterval(timer);
    }, []);

    /**
     * Cache-First Loader: Reads previously saved home screen data instantly.
     * Returns true if cache is fresh (< 5 mins old) and valid.
     */
    const loadCachedData = async (): Promise<boolean> => {
        try {
            const cachedRaw = await AsyncStorage.getItem(CACHE_KEY);
            if (cachedRaw) {
                const cached = JSON.parse(cachedRaw);
                if (cached) {
                    if (Array.isArray(cached.matches) && cached.matches.length > 0) {
                        setMatches(cached.matches);
                    }
                    if (Array.isArray(cached.sliderItems) && cached.sliderItems.length > 0) {
                        setSliderItems(cached.sliderItems);
                    }
                    if (Array.isArray(cached.storyGroups) && cached.storyGroups.length > 0) {
                        setStoryGroups(cached.storyGroups);
                    }
                    if (cached.userProfile) {
                        setUserProfile(cached.userProfile);
                    }
                    hasCachedDataRef.current = true;
                    setLoading(false);

                    const age = Date.now() - (cached.timestamp || 0);
                    return age < CACHE_TTL;
                }
            }
        } catch (e) {
            console.error('Error reading home cache:', e);
        }
        return false;
    };

    useEffect(() => {
        const init = async () => {
            const isFresh = await loadCachedData();
            if (!isFresh) {
                // If cache is missing or stale, fetch in background without skeleton flicker if cache was present
                loadData(false, hasCachedDataRef.current);
            }
        };
        init();
    }, [user?.id]);

    useEffect(() => {
        // 1. Supabase Postgres Changes Realtime Listener (Instant score, status, goals sync)
        const realtimeChannel = supabase
            .channel('home_realtime_matches_sync')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'matches' },
                (payload: any) => {
                    if (payload.new && payload.new.id) {
                        setMatches(prev => prev.map(m => {
                            if (String(m.id || m._id) === String(payload.new.id)) {
                                const homeScore = payload.new.home_score !== undefined ? payload.new.home_score : (m.home_score ?? 0);
                                const awayScore = payload.new.away_score !== undefined ? payload.new.away_score : (m.away_score ?? 0);
                                return {
                                    ...m,
                                    ...payload.new,
                                    score: { home: homeScore, away: awayScore },
                                    home_score: homeScore,
                                    away_score: awayScore,
                                    status: payload.new.status || m.status,
                                };
                            }
                            return m;
                        }));
                    }
                    loadData(false, true);
                }
            )
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'match_events' },
                () => {
                    loadData(false, true);
                }
            )
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'sponsors' },
                (payload: any) => {
                    const record = payload.new || payload.record;
                    if (record?.name && record.name.startsWith('MATCH_TIMER_') && record.logo_url) {
                        try {
                            const parsed = JSON.parse(record.logo_url);
                            const mId = record.name.replace('MATCH_TIMER_', '');
                            setMatches(prev => prev.map(m => {
                                if (String(m.id || m._id) === String(mId)) {
                                    const homeScore = parsed.home_score !== undefined ? parsed.home_score : (m.home_score ?? 0);
                                    const awayScore = parsed.away_score !== undefined ? parsed.away_score : (m.away_score ?? 0);
                                    return {
                                        ...m,
                                        ...parsed,
                                        score: { home: homeScore, away: awayScore },
                                        home_score: homeScore,
                                        away_score: awayScore,
                                        status: parsed.status || m.status,
                                    };
                                }
                                return m;
                            }));
                        } catch (e) {}
                    }
                }
            )
            .subscribe();

        // 2. Fast Broadcast Channel for Instant 0ms Timer Sync
        const broadcastChannel = supabase
            .channel('obs_fast_timer_global')
            .on('broadcast', { event: 'timer_update' }, (msg: any) => {
                if (msg.payload && msg.payload.match_id) {
                    const p = msg.payload;
                    setMatches(prev => prev.map(m => {
                        if (String(m.id || m._id) === String(p.match_id)) {
                            return { ...m, ...p };
                        }
                        return m;
                    }));
                }
            })
            .subscribe();

        // 3. Socket fallback listener
        if (socket && isConnected) {
            socket.on('match-update', (updatedMatch: any) => {
                setMatches(prev => {
                    const updated = prev.map(m => (m._id === updatedMatch.matchId || m.id === updatedMatch.matchId) ? { ...m, ...updatedMatch.match } : m);
                    const stories = storyService.buildStoriesFromRealData(updated, sliderItems, viewedStoryIdsRef.current);
                    setStoryGroups(stories);
                    return updated;
                });
            });
        }

        return () => {
            supabase.removeChannel(realtimeChannel);
            supabase.removeChannel(broadcastChannel);
            if (socket) socket.off('match-update');
        };
    }, [socket, isConnected, sliderItems]);

    const fetchUserProfileData = async () => {
        if (!user?.id) return null;
        try {
            if (user.role === 'player') {
                return await apiService.getPlayerById(user.id);
            } else if (user.role === 'manager') {
                const teamId = user.teamId || user.team_id || user.id || user._id;
                return await apiService.getTeamById(teamId);
            }
        } catch (e) {
            console.error('Error fetching profile in HomeScreen:', e);
        }
        return null;
    };

    const loadData = async (isRefreshing = false, isSilent = false) => {
        try {
            if (isRefreshing) {
                setRefreshing(true);
            } else if (!isSilent && !hasCachedDataRef.current) {
                setLoading(true);
            }
            
            // Parallelize matches, slider items, user profile, and viewed stories fetching
            const [matchesData, sliderData, profileData, viewedIds] = await Promise.all([
                apiService.getMatches().catch(err => { console.error('Matches fetch err:', err); return []; }),
                apiService.getSliderItems().catch(err => { console.error('Slider fetch err:', err); return []; }),
                fetchUserProfileData().catch(err => { console.error('Profile fetch err:', err); return null; }),
                storyService.getViewedStoryIds().catch(() => [] as string[])
            ]);

            viewedStoryIdsRef.current = viewedIds || [];

            const fetchedMatches = (matchesData && Array.isArray(matchesData)) ? matchesData : [];
            setMatches(fetchedMatches);

            let validSlider: any[] = [];
            if (sliderData && Array.isArray(sliderData)) {
                validSlider = sliderData.filter((item: any) => item.isActive !== false);
                setSliderItems(validSlider);
                validSlider.forEach((item: any) => {
                    if (item.bgImage) Image.prefetch(item.bgImage).catch(() => {});
                    if (item.topPlayer?.photoUrl) Image.prefetch(item.topPlayer.photoUrl).catch(() => {});
                    if (item.topPlayer?.teamLogo) Image.prefetch(item.topPlayer.teamLogo).catch(() => {});
                });
            }

            // Build 100% real stories strictly from Supabase database
            const realStories = storyService.buildStoriesFromRealData(
                fetchedMatches,
                validSlider,
                viewedStoryIdsRef.current
            );
            setStoryGroups(realStories);

            if (profileData) {
                setUserProfile(profileData);
            } else if (!user?.id) {
                setUserProfile(null);
            }

            hasCachedDataRef.current = true;

            // Save fresh snapshot to AsyncStorage cache
            await AsyncStorage.setItem(CACHE_KEY, JSON.stringify({
                matches: fetchedMatches,
                sliderItems: validSlider,
                storyGroups: realStories,
                userProfile: profileData || null,
                timestamp: Date.now()
            }));
        } catch (error) {
            console.error('Error loading home data:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = () => {
        loadData(true, false);
    };

    const handleSelectStoryGroup = async (group: StoryGroup, index: number) => {
        setSelectedStoryIndex(index);
        setStoryModalVisible(true);
        await handleStoryGroupViewed(group.id);
    };

    const handleStoryGroupViewed = async (groupId: string) => {
        if (!groupId) return;
        // Immediately update UI state to marked as viewed (subtle grey ring)
        setStoryGroups(prev =>
            prev.map(s => (s.id === groupId ? { ...s, isViewed: true } : s))
        );

        // Persist to AsyncStorage (@amatora_viewed_stories)
        if (!viewedStoryIdsRef.current.includes(groupId)) {
            viewedStoryIdsRef.current.push(groupId);
            await storyService.markStoryAsViewed(groupId);
        }
    };

    const handleNavigateMatchFromStory = (matchId: string) => {
        navigation.navigate('MatchDetail', { matchId });
    };

    // Robust match status helpers
    const isMatchLive = (st?: string) => {
        const s = String(st || '').toLowerCase().trim();
        return s === 'live' || s === 'first_half' || s === 'second_half' || s === 'half_time' || s === 'halftime' || s === 'ongoing' || s === 'in_progress' || s === '1st_half' || s === '2nd_half' || s === '1-taym' || s === '2-taym' || s === 'tanaffus';
    };

    const isMatchFinished = (st?: string) => {
        const s = String(st || '').toLowerCase().trim();
        return s === 'finished' || s === 'completed' || s === 'ended' || s === 'tugadi';
    };

    const isMatchUpcoming = (st?: string) => {
        const s = String(st || '').toLowerCase().trim();
        return s === 'scheduled' || s === 'upcoming' || s === 'pending' || s === 'rejalashtirilgan' || (!isMatchLive(s) && !isMatchFinished(s));
    };

    // Derived State for different sections
    const liveMatches = matches
        .filter(m => isMatchLive(m.status))
        .sort((a, b) => new Date(a.date || a.createdAt || 0).getTime() - new Date(b.date || b.createdAt || 0).getTime());

    // Importance Rank helper for sorting: Markaziy (1) -> Ortacha (2) -> Oddiy (3)
    const getImportanceRank = (imp?: string) => {
        if (imp === 'markaziy') return 1;
        if (imp === 'ortacha') return 2;
        return 3;
    };

    // Filter upcoming matches: strictly markaziy & ortacha (max 4)
    const allUpcoming = matches.filter(m => isMatchUpcoming(m.status));
    const featuredUpcoming = allUpcoming.filter(m => m.importance === 'markaziy' || m.importance === 'ortacha');
    const displayUpcomingMatches = (featuredUpcoming.length > 0 ? featuredUpcoming : allUpcoming)
        .sort((a, b) => {
            const rankDiff = getImportanceRank(a.importance) - getImportanceRank(b.importance);
            if (rankDiff !== 0) return rankDiff;
            return new Date(a.date || a.createdAt || 0).getTime() - new Date(b.date || b.createdAt || 0).getTime();
        })
        .slice(0, 4);

    // Filter finished matches: grouped by League (only markaziy & ortacha, max 3 per league)
    const groupedFinishedMatches = useMemo(() => {
        const allFinished = matches.filter(m => isMatchFinished(m.status));
        const featuredFinished = allFinished.filter(m => m.importance === 'markaziy' || m.importance === 'ortacha');
        const sourceMatches = featuredFinished.length > 0 ? featuredFinished : allFinished;

        const groupsMap: Record<string, { leagueId: string; leagueName: string; matches: any[] }> = {};

        sourceMatches.forEach(m => {
            const leagueId = String(m.tournament_id || m.tournamentId || m.league_id || m.leagueId || m.league || 'amatora_default');
            const leagueName = m.tournamentName || m.league || "Amatora Liga";

            if (!groupsMap[leagueId]) {
                groupsMap[leagueId] = {
                    leagueId,
                    leagueName,
                    matches: []
                };
            }
            groupsMap[leagueId].matches.push(m);
        });

        return Object.values(groupsMap).map(group => ({
            ...group,
            matches: group.matches
                .sort((a, b) => {
                    const rankDiff = getImportanceRank(a.importance) - getImportanceRank(b.importance);
                    if (rankDiff !== 0) return rankDiff;
                    return new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime();
                })
                .slice(0, 3)
        }));
    }, [matches]);

    const handleViewAllResults = async () => {
        try {
            // Find active tournament from current matches
            const targetMatch = matches.find(m => m.tournament_id || m.tournamentId || m.league_id || m.leagueId || m.tournamentName || m.league);
            const targetTournamentId = targetMatch?.tournament_id || targetMatch?.tournamentId || targetMatch?.league_id || targetMatch?.leagueId || targetMatch?.league;
            const targetTournamentName = targetMatch?.tournamentName || targetMatch?.league || "Amatora Liga";

            if (targetTournamentId) {
                navigation.navigate('TournamentDetail', {
                    tournamentId: targetTournamentId,
                    tournamentName: targetTournamentName,
                    initialTab: 'matches',
                    tab: 'matches'
                });
                return;
            }

            const tournaments = await apiService.getTournaments().catch(() => []);
            if (tournaments && tournaments.length > 0) {
                const firstT = tournaments[0];
                navigation.navigate('TournamentDetail', {
                    tournamentId: firstT._id || firstT.id,
                    tournamentName: firstT.name,
                    initialTab: 'matches',
                    tab: 'matches'
                });
                return;
            }
        } catch (e) {}

        navigation.navigate('MainTabs', { screen: 'Turnirlar' });
    };

    // Reusable Match Card Component with Importance Border & Badge
    const renderMatchCard = (match: any, isLive: boolean = false, isVertical: boolean = false) => {
        const matchIsLive = isLive || isMatchLive(match.status);
        const matchIsFinished = isMatchFinished(match.status);
        const rawDate = match.date || match.match_date;
        const matchDate = new Date(rawDate);
        const isValidDate = !isNaN(matchDate.getTime());

        // Live Timing, Seconds (MM:SS), Period, and Half-Time Detection
        let isHalfTime = false;
        let liveBadgeLabel = 'LIVE';
        let liveTimerTime = '';
        let livePeriodLabel = '';

        if (matchIsLive) {
            const st = String(match.status || '').toLowerCase().trim();
            isHalfTime = st.includes('half_time') || st.includes('halftime') || st.includes('tanaffus') || st === 'break';
            
            const halfDurMins = Number(match.half_duration) || 25;
            const matchDurMins = Number(match.match_duration) || (halfDurMins * 2);
            const halfDurSecs = halfDurMins * 60;
            let timerSec = Number(match.timer_seconds);
            if (isNaN(timerSec)) timerSec = halfDurSecs;

            let elapsed = 0;
            if (match.timer_started_at && match.is_timer_running) {
                const diffSec = Math.max(0, Math.floor((Date.now() - new Date(match.timer_started_at).getTime()) / 1000));
                if (timerSec > halfDurSecs / 2) {
                    const curRemaining = Math.max(0, timerSec - diffSec);
                    elapsed = Math.max(0, halfDurSecs - curRemaining);
                } else {
                    elapsed = timerSec + diffSec;
                }
            } else {
                if (timerSec > 0 && timerSec < halfDurSecs) {
                    elapsed = halfDurSecs - timerSec;
                } else if (timerSec === 0) {
                    elapsed = 0;
                }
            }

            if (isHalfTime) {
                liveBadgeLabel = 'TANAFFUS';
                liveTimerTime = 'TANAFFUS';
                livePeriodLabel = '';
            } else if (st.includes('first') || st.includes('1-taym') || st.includes('1st')) {
                liveBadgeLabel = 'LIVE';
                livePeriodLabel = '1-TAYM';
                const mm = Math.floor(elapsed / 60).toString().padStart(2, '0');
                const ss = (elapsed % 60).toString().padStart(2, '0');
                liveTimerTime = `${mm}:${ss}`;
            } else if (st.includes('second') || st.includes('2-taym') || st.includes('2nd')) {
                liveBadgeLabel = 'LIVE';
                livePeriodLabel = '2-TAYM';
                const totalElapsed = halfDurSecs + elapsed;
                const mm = Math.floor(totalElapsed / 60).toString().padStart(2, '0');
                const ss = (totalElapsed % 60).toString().padStart(2, '0');
                liveTimerTime = `${mm}:${ss}`;
            } else {
                liveBadgeLabel = 'LIVE';
                livePeriodLabel = '1-TAYM';
                const mm = Math.floor(elapsed / 60).toString().padStart(2, '0');
                const ss = (elapsed % 60).toString().padStart(2, '0');
                liveTimerTime = `${mm}:${ss}`;
            }
        }

        const months = [
            'Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun', 
            'Iyul', 'Avgust', 'Sentabr', 'Oktabr', 'Noyabr', 'Dekabr'
        ];
        const day = isValidDate ? matchDate.getDate() : '';
        const month = isValidDate ? months[matchDate.getMonth()] : '';
        const year = isValidDate ? matchDate.getFullYear() : '';
        
        let formattedTime = String(match.match_time || match.time || '').trim();
        if (formattedTime && formattedTime.includes(':')) {
            const timeParts = formattedTime.split(':');
            if (timeParts.length >= 2) {
                formattedTime = `${timeParts[0].padStart(2, '0')}:${timeParts[1].padStart(2, '0')}`;
            }
        }
        if (!formattedTime && isValidDate) {
            const hrs = String(matchDate.getHours()).padStart(2, '0');
            const mins = String(matchDate.getMinutes()).padStart(2, '0');
            if (hrs !== '00' || mins !== '00') {
                formattedTime = `${hrs}:${mins}`;
            }
        }
        if (!formattedTime) formattedTime = '18:00';

        const formattedFullDate = isValidDate 
            ? formatLocalizedDate(rawDate, currentLang, formattedTime) 
            : (match.date_str || t('matches.not_started', "Bo'lajak o'yin"));

        const localizedVenue = formatLocalizedVenue(match.venue || "Amatora Arena", currentLang);

        const roundTagText = match.round 
            ? t('matches.round_tour', { round: match.round }) 
            : (match.tour ? t('matches.round_tour', { round: match.tour }) : '');

        return (
            <TouchableOpacity
                key={match._id || Math.random().toString()}
                style={[
                    isVertical ? styles.vMatchCard : styles.hMatchCard,
                    matchIsLive && (isHalfTime ? styles.hMatchCardHalftime : styles.hMatchCardLive)
                ]}
                onPress={() => navigation.navigate('MatchDetail', { matchId: match._id })}
                activeOpacity={0.85}
            >
                <BlurView intensity={25} tint="dark" style={StyleSheet.absoluteFill} />
                
                <View style={{ padding: 18 }}>
                    <View style={[styles.hMatchHeader, isVertical && styles.vMatchHeader]}>
                        <Text style={styles.hMatchLeague} numberOfLines={1}>{match.tournamentName || "O'rtoqlik uchrashuvi"}</Text>
                        
                        {Boolean(matchIsLive) ? (
                            <View style={[styles.liveBadgeContainer, isHalfTime && styles.halftimeBadgeContainer]}>
                                <View style={[styles.liveDot, isHalfTime && styles.halftimeDot]} />
                                <Text style={[styles.liveBadgeText, isHalfTime && styles.halftimeBadgeText]}>{liveBadgeLabel}</Text>
                            </View>
                        ) : Boolean(roundTagText) ? (
                            <View style={styles.roundBadgeTag}>
                                <Text style={styles.roundBadgeText}>{roundTagText}</Text>
                            </View>
                        ) : null}
                    </View>

                    <View style={styles.hMatchTeamsRow}>
                        <View style={styles.hTeamColumn}>
                            <View style={styles.hLogoCircle}>
                                {match.homeTeamLogo || match.homeTeam?.logo ? (
                                    <SmartImage
                                        uri={match.homeTeamLogo || match.homeTeam?.logo}
                                        style={styles.hTeamLogo}
                                        contentFit="contain"
                                        fallbackIcon="shield-outline"
                                    />
                                ) : (
                                    <Text style={styles.hLogoText}>{(match.homeTeamName || match.homeTeam?.name)?.charAt(0) || 'U'}</Text>
                                )}
                            </View>
                            <Text style={styles.hTeamName} numberOfLines={1}>{formatShortTeamName(match.homeTeamName || match.homeTeam?.name || 'Uy jamoasi', 12)}</Text>
                        </View>

                        <View style={styles.hScoreColumn}>
                            {Boolean(matchIsLive || matchIsFinished) ? (
                                <View style={styles.scoreAndTimerCenterBox}>
                                    <Text style={styles.hScoreText}>{match.score?.home ?? (match.home_score ?? 0)} - {match.score?.away ?? (match.away_score ?? 0)}</Text>
                                    {Boolean(matchIsLive) ? (
                                        <View style={styles.cleanLiveTimerContainer}>
                                            <Text style={[
                                                styles.cleanTimerText,
                                                isHalfTime && styles.cleanHalftimeText
                                            ]}>
                                                {liveTimerTime}
                                            </Text>
                                            {!isHalfTime && Boolean(livePeriodLabel) ? (
                                                <Text style={styles.cleanPeriodSubText}>
                                                    {livePeriodLabel}
                                                </Text>
                                            ) : null}
                                        </View>
                                    ) : null}
                                </View>
                            ) : (
                                <View style={styles.vsContainer}>
                                    <Text style={styles.hTimeVsText}>{formattedTime}</Text>
                                    <Text style={styles.vsSubText}>{t('matches.starts')}</Text>
                                </View>
                            )}
                        </View>

                        <View style={styles.hTeamColumn}>
                            <View style={styles.hLogoCircle}>
                                {match.awayTeamLogo || match.awayTeam?.logo ? (
                                    <SmartImage
                                        uri={match.awayTeamLogo || match.awayTeam?.logo}
                                        style={styles.hTeamLogo}
                                        contentFit="contain"
                                        fallbackIcon="shield-outline"
                                    />
                                ) : (
                                    <Text style={styles.hLogoText}>{(match.awayTeamName || match.awayTeam?.name)?.charAt(0) || 'M'}</Text>
                                )}
                            </View>
                            <Text style={styles.hTeamName} numberOfLines={1}>{formatShortTeamName(match.awayTeamName || match.awayTeam?.name || 'Mehmon', 12)}</Text>
                        </View>
                    </View>

                    <View style={styles.hMatchFooter}>
                        <Text style={styles.hMatchDate}>{`${formattedFullDate} • ${localizedVenue}`}</Text>
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <AnimatedBackground overlayOpacity={0.7} backgroundImage={backgroundImage}>
            <SafeAreaView style={styles.container} edges={['top']}>
                <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ paddingBottom: 130 }}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
                    }
                >
                    {loading ? (
                        <HomeSkeleton />
                    ) : (
                        <>
                            {(() => {
                                const avatarUri = userProfile?.photo || userProfile?.photo_url || userProfile?.avatar || userProfile?.logo || userProfile?.logo_url || user?.photo || user?.photo_url || user?.avatar || user?.logo || user?.logo_url;
                                const rawName = userProfile?.firstName || user?.firstName || userProfile?.name || userProfile?.team_name || user?.name || user?.team_name || 'AMATORA';
                                const displayName = rawName.replace(/\(sardor\)/gi, '').replace(/\(menejer\)/gi, '').trim().split(' ')[0] || 'AMATORA';

                                const getGreetingText = () => {
                                    const hour = new Date().getHours();
                                    if (hour >= 5 && hour < 12) return t('home.good_morning');
                                    if (hour >= 12 && hour < 18) return t('home.good_day');
                                    return t('home.good_evening');
                                };

                                return (
                                    <View style={styles.header}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                                            <TouchableOpacity 
                                                style={styles.profileButton}
                                                onPress={() => navigation.navigate('MainTabs', { screen: 'Profil' })}
                                                activeOpacity={0.8}
                                            >
                                                {avatarUri ? (
                                                    <SmartImage 
                                                        uri={avatarUri}
                                                        style={styles.squircleAvatar}
                                                        fallbackIcon="person"
                                                    />
                                                ) : (
                                                    <View style={styles.squircleAvatarFallback}>
                                                        <Ionicons name="person" size={22} color="#FFFFFF" />
                                                    </View>
                                                )}
                                            </TouchableOpacity>
                                            <View>
                                                <Text style={styles.welcomeText}>
                                                    {isGuest ? 'AMATORA' : getGreetingText().toUpperCase()}
                                                </Text>
                                                <Text style={styles.brandText}>
                                                    {isGuest ? getGreetingText().toUpperCase() : displayName.toUpperCase()}
                                                </Text>
                                            </View>
                                        </View>

                                        <TouchableOpacity 
                                            style={styles.profileButton}
                                            onPress={() => navigation.navigate('Notifications')}
                                            activeOpacity={0.75}
                                        >
                                            <View style={styles.bellButton}>
                                                <Ionicons name="notifications-outline" size={22} color="#FFFFFF" />
                                                <View style={styles.unreadBadgeDot} />
                                            </View>
                                        </TouchableOpacity>
                                    </View>
                                );
                            })()}

                            {/* Stories & Highlight Reels Bar (Vaqtinchalik commentga olingan)
                            {storyGroups && storyGroups.length > 0 && (
                                <MatchStoriesTray
                                    stories={storyGroups}
                                    onSelectStoryGroup={handleSelectStoryGroup}
                                />
                            )} */}

                            <View style={styles.sliderContainer}>
                                <ApiSlider initialItems={sliderItems} externalLoading={loading} />
                            </View>

                            {/* Primary Dynamic Matches Section with Priority: 1. Live -> 2. Upcoming -> 3. Finished */}
                            {loading ? (
                                <View style={styles.sectionContainer}>
                                    <View style={styles.sectionHeader}>
                                        <Text style={styles.sectionTitle}>{t('matches.title', 'O\'yinlar')}</Text>
                                    </View>
                                    <View style={{ paddingHorizontal: 20 }}>
                                        <Skeleton width="100%" height={180} borderRadius={20} />
                                    </View>
                                </View>
                            ) : liveMatches.length > 0 ? (
                                /* 1. PRIORITY: LIVE MATCHES */
                                <>
                                    <View style={styles.sectionContainer}>
                                        <View style={styles.sectionHeader}>
                                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                                <View style={styles.liveIndicatorDot} />
                                                <Text style={[styles.sectionTitle, { color: '#FF3B30' }]}>
                                                    {t('matches.live', 'JONLI O\'YINLAR').toUpperCase()}
                                                </Text>
                                            </View>
                                            <TouchableOpacity onPress={() => navigation.navigate('MainTabs', { screen: 'Taqvim' })}>
                                                <Text style={styles.viewAllText}>{t('home.view_calendar', 'Taqvim')}</Text>
                                            </TouchableOpacity>
                                        </View>

                                        <View style={styles.verticalMatchList}>
                                            {liveMatches.map(m => renderMatchCard(m, true, true))}
                                        </View>
                                    </View>

                                    {/* Secondary Upcoming if available */}
                                    {displayUpcomingMatches.length > 0 && (
                                        <View style={styles.sectionContainer}>
                                            <View style={styles.sectionHeader}>
                                                <Text style={styles.sectionTitle}>{t('home.featured_matches', 'Markaziy o\'yinlar')}</Text>
                                                <TouchableOpacity onPress={() => navigation.navigate('MainTabs', { screen: 'Taqvim' })}>
                                                    <Text style={styles.viewAllText}>{t('home.view_calendar', 'Taqvim')}</Text>
                                                </TouchableOpacity>
                                            </View>
                                            <View style={styles.verticalMatchList}>
                                                {displayUpcomingMatches.map(m => renderMatchCard(m, false, true))}
                                            </View>
                                        </View>
                                    )}

                                    {/* Secondary Finished Results if available */}
                                    {groupedFinishedMatches.length > 0 && (
                                        groupedFinishedMatches.map((group: any, groupIdx: number) => (
                                            <View key={group.leagueId || groupIdx} style={styles.sectionContainer}>
                                                <View style={styles.sectionHeader}>
                                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1, marginRight: 8 }}>
                                                        <Ionicons name="trophy" size={16} color={Colors.primary} />
                                                        <Text style={[styles.sectionTitle, { fontSize: 16 }]} numberOfLines={1}>
                                                            {t('home.league_results_title', { league: group.leagueName.toUpperCase() })}
                                                        </Text>
                                                    </View>
                                                    <TouchableOpacity 
                                                        onPress={() => {
                                                            navigation.navigate('TournamentDetail', {
                                                                tournamentId: group.leagueId !== 'amatora_default' ? group.leagueId : undefined,
                                                                tournamentName: group.leagueName,
                                                                initialTab: 'matches',
                                                                tab: 'matches'
                                                            });
                                                        }}
                                                        activeOpacity={0.75}
                                                    >
                                                        <Text style={styles.viewAllText}>
                                                            {t('home.view_league_results', { league: group.leagueName.toUpperCase() })}
                                                        </Text>
                                                    </TouchableOpacity>
                                                </View>
                                                <View style={styles.verticalMatchList}>
                                                    {group.matches.map((m: any) => renderMatchCard(m, false, true))}
                                                </View>
                                            </View>
                                        ))
                                    )}
                                </>
                            ) : displayUpcomingMatches.length > 0 ? (
                                /* 2. PRIORITY: UPCOMING / FEATURED MATCHES (No Live Matches) */
                                <>
                                    <View style={styles.sectionContainer}>
                                        <View style={styles.sectionHeader}>
                                            <Text style={styles.sectionTitle}>{t('home.featured_matches', 'Markaziy o\'yinlar')}</Text>
                                            <TouchableOpacity onPress={() => navigation.navigate('MainTabs', { screen: 'Taqvim' })}>
                                                <Text style={styles.viewAllText}>{t('home.view_calendar', 'Taqvim')}</Text>
                                            </TouchableOpacity>
                                        </View>

                                        <View style={styles.verticalMatchList}>
                                            {displayUpcomingMatches.map(m => renderMatchCard(m, false, true))}
                                        </View>
                                    </View>

                                    {/* Finished Results Below Upcoming */}
                                    {groupedFinishedMatches.length > 0 && (
                                        groupedFinishedMatches.map((group: any, groupIdx: number) => (
                                            <View key={group.leagueId || groupIdx} style={styles.sectionContainer}>
                                                <View style={styles.sectionHeader}>
                                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1, marginRight: 8 }}>
                                                        <Ionicons name="trophy" size={16} color={Colors.primary} />
                                                        <Text style={[styles.sectionTitle, { fontSize: 16 }]} numberOfLines={1}>
                                                            {t('home.league_results_title', { league: group.leagueName.toUpperCase() })}
                                                        </Text>
                                                    </View>
                                                    <TouchableOpacity 
                                                        onPress={() => {
                                                            navigation.navigate('TournamentDetail', {
                                                                tournamentId: group.leagueId !== 'amatora_default' ? group.leagueId : undefined,
                                                                tournamentName: group.leagueName,
                                                                initialTab: 'matches',
                                                                tab: 'matches'
                                                            });
                                                        }}
                                                        activeOpacity={0.75}
                                                    >
                                                        <Text style={styles.viewAllText}>
                                                            {t('home.view_league_results', { league: group.leagueName.toUpperCase() })}
                                                        </Text>
                                                    </TouchableOpacity>
                                                </View>

                                                <View style={styles.verticalMatchList}>
                                                    {group.matches.map((m: any) => renderMatchCard(m, false, true))}
                                                </View>
                                            </View>
                                        ))
                                    )}
                                </>
                            ) : groupedFinishedMatches.length > 0 ? (
                                /* 3. PRIORITY: RECENT RESULTS (No Live, No Upcoming) */
                                groupedFinishedMatches.map((group: any, groupIdx: number) => (
                                    <View key={group.leagueId || groupIdx} style={styles.sectionContainer}>
                                        <View style={styles.sectionHeader}>
                                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1, marginRight: 8 }}>
                                                <Ionicons name="trophy" size={16} color={Colors.primary} />
                                                <Text style={[styles.sectionTitle, { fontSize: 16 }]} numberOfLines={1}>
                                                    {t('home.league_results_title', { league: group.leagueName.toUpperCase() })}
                                                </Text>
                                            </View>
                                            <TouchableOpacity 
                                                onPress={() => {
                                                    navigation.navigate('TournamentDetail', {
                                                        tournamentId: group.leagueId !== 'amatora_default' ? group.leagueId : undefined,
                                                        tournamentName: group.leagueName,
                                                        initialTab: 'matches',
                                                        tab: 'matches'
                                                    });
                                                }}
                                                activeOpacity={0.75}
                                            >
                                                <Text style={styles.viewAllText}>
                                                    {t('home.view_league_results', { league: group.leagueName.toUpperCase() })}
                                                </Text>
                                            </TouchableOpacity>
                                        </View>

                                        <View style={styles.verticalMatchList}>
                                            {group.matches.map((m: any) => renderMatchCard(m, false, true))}
                                        </View>
                                    </View>
                                ))
                            ) : (
                                /* 4. NO MATCHES AT ALL */
                                <View style={styles.sectionContainer}>
                                    <View style={styles.emptyCard}>
                                        <Ionicons name="football-outline" size={36} color={Colors.textMuted} />
                                        <Text style={styles.emptyText}>{t('home.no_matches', 'Hozircha o\'yinlar mavjud emas')}</Text>
                                    </View>
                                </View>
                            )}
                        </>
                    )}
                </ScrollView>

                {/* Fullscreen Story Viewer Modal (Vaqtinchalik commentga olingan)
                <StoryViewerModal
                    visible={storyModalVisible}
                    storyGroups={storyGroups}
                    initialGroupIndex={selectedStoryIndex}
                    onClose={() => setStoryModalVisible(false)}
                    onNavigateMatch={handleNavigateMatchFromStory}
                    onStoryGroupViewed={handleStoryGroupViewed}
                /> */}
            </SafeAreaView>
        </AnimatedBackground>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'transparent',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 10,
        marginBottom: 10,
        marginTop: 5,
    },
    welcomeText: {
        color: 'rgba(255, 255, 255, 0.5)',
        fontSize: 10,
        fontWeight: '900',
        marginBottom: 1,
        letterSpacing: 2,
    },
    brandText: {
        color: '#FFFFFF',
        fontSize: 20,
        fontWeight: '900',
        letterSpacing: 0.5,
    },
    profileButton: {
        padding: 0,
    },
    bellButton: {
        width: 38,
        height: 38,
        borderRadius: 12,
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.12)',
        position: 'relative',
    },
    unreadBadgeDot: {
        position: 'absolute',
        top: 9,
        right: 10,
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#FF3B30',
        borderWidth: 1.5,
        borderColor: '#121212',
    },
    liveIndicatorDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: '#FF3B30',
        shadowColor: '#FF3B30',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: 6,
        elevation: 6,
    },
    squircleAvatar: {
        width: 46,
        height: 46,
        borderRadius: 14,
        borderWidth: 0,
    },
    squircleAvatarFallback: {
        width: 46,
        height: 46,
        borderRadius: 14,
        backgroundColor: 'rgba(255, 255, 255, 0.12)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 0,
    },
    sliderContainer: {
        marginBottom: 20,
    },
    vMatchHeader: {
        borderBottomColor: 'rgba(255,255,255,0.05)',
    },
    verticalMatchList: {
        paddingHorizontal: 20,
    },
    carouselScrollContent: {
        paddingHorizontal: SIDE_PADDING,
        paddingBottom: 10,
    },
    hMatchCardLive: {
        borderColor: 'rgba(239, 68, 68, 0.45)',
        backgroundColor: 'rgba(239, 68, 68, 0.12)',
    },
    hMatchHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 15,
        paddingBottom: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#1A2138',
    },
    hMatchLeague: {
        color: '#8A94A6',
        fontSize: 14,
        fontWeight: 'bold',
        flex: 1,
        textTransform: 'uppercase',
    },
    hMatchTeamsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 15,
    },
    hTeamColumn: {
        flex: 1,
        alignItems: 'center',
    },
    hLogoCircle: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: 'transparent',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
        borderWidth: 0,
        overflow: 'hidden',
    },
    hTeamLogo: {
        width: 52,
        height: 52,
        borderRadius: 26,
    },
    hLogoText: {
        color: '#FFF',
        fontSize: 18,
        fontWeight: 'bold',
    },
    hTeamName: {
        color: '#FFF',
        fontSize: 14,
        fontWeight: 'bold',
        textAlign: 'center',
        marginTop: 4,
    },
    hScoreColumn: {
        width: 80,
        alignItems: 'center',
        justifyContent: 'center',
    },
    hScoreText: {
        color: '#FFF',
        fontSize: 28,
        fontWeight: '900',
    },
    hMatchFooter: {
        alignItems: 'center',
    },
    hMatchDate: {
        color: '#8A94A6',
        fontSize: 11,
        fontWeight: '500',
    },
    liveBadgeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(239, 68, 68, 0.2)',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
    },
    halftimeBadgeContainer: {
        backgroundColor: 'rgba(250, 204, 21, 0.2)',
        borderColor: 'rgba(250, 204, 21, 0.4)',
        borderWidth: 1,
    },
    liveDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: Colors.danger,
        marginRight: 5,
    },
    halftimeDot: {
        backgroundColor: '#FACC15',
    },
    liveBadgeText: {
        color: Colors.danger,
        fontSize: 10,
        fontWeight: 'bold',
        letterSpacing: 0.5,
    },
    halftimeBadgeText: {
        color: '#FACC15',
    },
    markaziyBadgeTag: {
        backgroundColor: 'rgba(255, 230, 0, 0.2)',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: 'rgba(255, 230, 0, 0.6)',
    },
    markaziyBadgeText: {
        color: '#FFE600',
        fontSize: 10,
        fontWeight: '900',
        letterSpacing: 0.5,
    },
    ortachaBadgeTag: {
        backgroundColor: 'rgba(14, 165, 233, 0.2)',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: 'rgba(14, 165, 233, 0.6)',
    },
    ortachaBadgeText: {
        color: '#0EA5E9',
        fontSize: 10,
        fontWeight: '900',
        letterSpacing: 0.5,
    },
    roundBadgeTag: {
        backgroundColor: 'rgba(0, 255, 135, 0.12)',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: 'rgba(0, 255, 135, 0.3)',
    },
    roundBadgeText: {
        color: Colors.primary,
        fontSize: 10,
        fontWeight: '900',
        letterSpacing: 0.5,
    },
    hMatchCard: {
        width: CARD_WIDTH,
        borderRadius: 20,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.12)',
        backgroundColor: 'rgba(15, 23, 42, 0.45)',
    },
    vMatchCard: {
        width: width - 40,
        borderRadius: 20,
        overflow: 'hidden',
        marginBottom: 14,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.12)',
        backgroundColor: 'rgba(15, 23, 42, 0.45)',
    },

    hMatchCardWrapper: {
        width: CARD_WIDTH,
    },
    vMatchCardWrapper: {
        width: width - 40,
    },
    hMatchCardInner: {
        width: '100%',
        borderRadius: 20.2,
        overflow: 'hidden',
        backgroundColor: 'rgba(15, 23, 42, 0.75)',
    },
    vMatchCardInner: {
        width: '100%',
        borderRadius: 20.2,
        overflow: 'hidden',
        backgroundColor: 'rgba(15, 23, 42, 0.75)',
    },
    finishedCardMargin: {
        marginHorizontal: 20,
        marginBottom: 12,
    },
    finishedMatchCardInner: {
        width: '100%',
        borderRadius: 20.2,
        overflow: 'hidden',
        backgroundColor: 'rgba(15, 23, 42, 0.75)',
    },
    glassmorphicCardBorder: {
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.18)',
    },

    // Generics Sections
    sectionContainer: {
        marginBottom: 25,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        marginBottom: 15,
    },
    sectionTitle: {
        color: '#FFF',
        fontSize: 18,
        fontWeight: 'bold',
    },
    viewAllText: {
        color: Colors.primary,
        fontSize: 14,
        fontWeight: 'bold',
    },

    // Recent Matches Row (List Style)
    recentMatchItem: {
        marginHorizontal: 20,
        borderRadius: 12,
        marginBottom: 10,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderLeftWidth: 3,
        borderLeftColor: 'rgba(255,255,255,0.1)',
        overflow: 'hidden',
    },
    recentTeams: {
        color: '#FFF',
        fontSize: 14,
        fontWeight: '600',
    },
    recentScore: {
        color: Colors.primary,
        fontWeight: '900',
    },
    recentDate: {
        color: '#8A94A6',
        fontSize: 12,
        minWidth: 50,
        textAlign: 'right',
    },
    vsContainer: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    hTimeVsText: {
        color: Colors.primary,
        fontSize: 28,
        fontWeight: '900',
        fontStyle: 'italic',
        letterSpacing: -1,
    },
    vsSubText: {
        color: 'rgba(255, 255, 255, 0.3)',
        fontSize: 8,
        fontWeight: 'bold',
        marginTop: -4,
        letterSpacing: 1,
    },
    scoreAndTimerCenterBox: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    cleanLiveTimerContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 2,
    },
    cleanTimerText: {
        color: '#FF3B30',
        fontSize: 13,
        fontWeight: '900',
        letterSpacing: 0.8,
        textAlign: 'center',
    },
    cleanHalftimeText: {
        color: '#FACC15',
        fontSize: 12,
        fontWeight: '900',
        letterSpacing: 0.8,
    },
    cleanPeriodSubText: {
        color: 'rgba(255, 255, 255, 0.75)',
        fontSize: 9,
        fontWeight: '800',
        letterSpacing: 0.5,
        marginTop: 1,
        textAlign: 'center',
    },
    liveMinuteTag: {
        backgroundColor: 'rgba(255, 59, 48, 0.18)',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 6,
        marginTop: 4,
        borderWidth: 1,
        borderColor: 'rgba(255, 59, 48, 0.4)',
    },
    liveMinuteTagText: {
        color: '#FF3B30',
        fontSize: 10,
        fontWeight: '900',
        letterSpacing: 0.5,
    },
    halftimeMinuteTag: {
        backgroundColor: 'rgba(250, 204, 21, 0.2)',
        borderColor: 'rgba(250, 204, 21, 0.6)',
    },
    halftimeMinuteTagText: {
        color: '#FACC15',
    },
    hMatchCardLive: {
        borderColor: 'rgba(255, 59, 48, 0.5)',
        backgroundColor: 'rgba(255, 59, 48, 0.08)',
    },
    hMatchCardHalftime: {
        borderColor: 'rgba(250, 204, 21, 0.65)',
        backgroundColor: 'rgba(250, 204, 21, 0.1)',
    },

    emptyCard: {
        backgroundColor: '#051024',
        marginHorizontal: 20,
        borderRadius: 16,
        padding: 30,
        alignItems: 'center',
        justifyContent: 'center',
        borderStyle: 'dashed',
        borderWidth: 1,
        borderColor: '#1A2138',
    },
    emptyText: {
        color: '#8A94A6',
        fontSize: 14,
        marginTop: 10,
    },

    // Finished Match Rich Cards
    finishedMatchCard: {
        marginHorizontal: 20,
        marginBottom: 12,
        borderRadius: 20,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.15)',
        backgroundColor: 'rgba(15, 23, 42, 0.45)',
    },
    finishedCardInner: {
        padding: 14,
    },
    finishedHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    finishedLeagueBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 255, 135, 0.12)',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 8,
    },
    finishedLeagueText: {
        fontSize: 10,
        fontWeight: '800',
        color: Colors.primary,
        letterSpacing: 0.5,
    },
    finishedRoundBadge: {
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 8,
    },
    finishedRoundText: {
        fontSize: 10,
        fontWeight: '700',
        color: '#FFFFFF',
        letterSpacing: 0.5,
    },
    finishedScoreRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginVertical: 4,
    },
    finishedTeamCol: {
        alignItems: 'center',
        flex: 1,
    },
    finishedLogoCircle: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: 'transparent',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 4,
        borderWidth: 0,
        overflow: 'hidden',
    },
    finishedTeamLogo: {
        width: 44,
        height: 44,
        borderRadius: 22,
    },
    finishedLogoFallback: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '900',
    },
    finishedTeamName: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '700',
        textAlign: 'center',
    },
    finishedScoreBox: {
        alignItems: 'center',
        paddingHorizontal: 12,
    },
    finishedScoreText: {
        color: '#FFFFFF',
        fontSize: 22,
        fontWeight: '900',
        letterSpacing: 1,
    },
    finishedBadgeTag: {
        backgroundColor: 'rgba(239, 68, 68, 0.2)',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 6,
        marginTop: 2,
    },
    finishedBadgeTagText: {
        color: '#EF4444',
        fontSize: 9,
        fontWeight: '800',
        letterSpacing: 0.5,
    },
    finishedFooterRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 10,
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255, 255, 255, 0.06)',
    },
    finishedFooterItem: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    finishedFooterText: {
        color: 'rgba(255, 255, 255, 0.6)',
        fontSize: 11,
        fontWeight: '600',
    },
    finishedDotSeparator: {
        color: 'rgba(255, 255, 255, 0.3)',
        marginHorizontal: 8,
    },
});
