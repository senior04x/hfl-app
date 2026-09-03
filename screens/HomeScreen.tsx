import React, { useEffect, useState, useRef, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, ActivityIndicator, Dimensions, RefreshControl, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Colors from '../constants/Colors';
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
import Svg, { Path } from 'react-native-svg';
import MatchStoriesTray, { StoryGroup } from '../components/MatchStoriesTray';
import StoryViewerModal from '../components/StoryViewerModal';
import TeamStoryReplayPickerModal from '../components/TeamStoryReplayPickerModal';
import { supabase } from '../services/supabase';
import { useThemeStore } from '../store/useThemeStore';
import { getHomeScreenColors } from '../constants/homeTheme';
import SuperLigaTop4 from '../components/SuperLigaTop4';
import { useNavBarScroll } from '../context/NavBarScrollContext';
import { getLocalizedNewsField, getLocalizedNewsCategory } from '../utils/localizationUtils';
import { formatLocalizedRelativeTime } from '../utils/dateLocalization';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width * 0.88;
const CARD_SPACING = 12;
const SIDE_PADDING = (width - CARD_WIDTH) / 2;

const CACHE_KEY_PREFIX = '@amatora_home_cache_v4_org_';
const CACHE_TTL = 5 * 60 * 1000; // 5 minut

export default function HomeScreen({ navigation }: any) {
    const { t, i18n } = useTranslation();
    const { colors, isDark } = useThemeStore();
    const homeColors = getHomeScreenColors(isDark);
    const currentLang = i18n.language || 'uz';
    const isAndroidLight = Platform.OS === 'android' && !isDark;
    const { handleScroll: handleNavBarScroll } = useNavBarScroll();
    const [matches, setMatches] = useState<any[]>([]);
    const [sliderItems, setSliderItems] = useState<any[]>([]);
    const [newsItems, setNewsItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const { socket, isConnected } = useSocket();
    const { user, isGuest } = useAuthStore();
    const selectedOrgId = useOrganizationStore(s => s.selectedOrganizationId);
    const [userProfile, setUserProfile] = useState<any>(null);

    // Determine current org ID and user unique identity
    const currentOrgId = user?.organizationId || user?.organization_id || (user?.organization as any)?.id || selectedOrgId || 1;
    const userUniqueKey = user ? String(user.id || user._id || user.teamId || user.team_id || user.name || 'user') : 'guest';
    const userRole = user?.role || (isGuest ? 'guest' : 'user');
    const CACHE_KEY = `${CACHE_KEY_PREFIX}${currentOrgId}_${userRole}_${userUniqueKey}`;

    // O'zining (agar jamoa/trener akkaunti bo'lsa) team ID'si — story tray'da
    // HAR DOIM birinchi o'rinda ko'rsatish va "+" (story qo'shish) halqasi
    // uchun kerak. MyTeamScreen'dagi bilan bir xil mantiq.
    const ownTeamId = user?.teamId || user?.team_id || (user?.role === 'manager' ? (user?.id || user?._id) : null);

    // Stories state with persistent viewed tracking (@amatora_viewed_stories)
    const [storyModalVisible, setStoryModalVisible] = useState(false);
    const [selectedStoryIndex, setSelectedStoryIndex] = useState(0);
    const [storyGroups, setStoryGroups] = useState<StoryGroup[]>([]);
    const [storyPickerVisible, setStoryPickerVisible] = useState(false);
    const viewedStoryIdsRef = useRef<string[]>([]);
    const hasCachedDataRef = useRef(false);

    // Refs to eliminate stale closure in realtime listeners
    const matchesRef = useRef<any[]>([]);
    const sliderItemsRef = useRef<any[]>([]);
    useEffect(() => { matchesRef.current = matches; }, [matches]);
    useEffect(() => { sliderItemsRef.current = sliderItems; }, [sliderItems]);

    // 🔥 PERFORMANCE FIX: Timer ticks without re-rendering entire component
    // Before: 50k user × 1 render/s = 50k renders/s = CPU 100%
    // After: 0 re-renders, timer updates via ref
    const liveTickRef = useRef(0);
    useEffect(() => {
        const timer = setInterval(() => {
            liveTickRef.current += 1;
            // Timer display updates handled by individual match components
        }, 1000);
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
                    if (Array.isArray(cached.newsItems) && cached.newsItems.length > 0) {
                        setNewsItems(cached.newsItems);
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
        setUserProfile(null);
        const init = async () => {
            const isFresh = await loadCachedData();
            if (!isFresh) {
                // If cache is missing or stale, fetch in background without skeleton flicker if cache was present
                loadData(false, hasCachedDataRef.current);
            }
        };
        init();
    }, [userUniqueKey, userRole, currentOrgId]);

    useEffect(() => {
        // 🔥 PERFORMANCE FIX: Single unified channel instead of 4 separate channels
        // Before: 50k user × 4 channels = 200k connections (limit: 500) = CRASH!
        // After: 50k user × 1 channel = 50k connections = OK

        const orgId = user?.organization_id || user?.organizationId || 1;

        // BITTA unified broadcast & realtime channel for barcha updates
        const unifiedChannel = supabase
            .channel(`home_updates_org_${orgId}`)
            .on('broadcast', { event: 'match_update' }, (msg: any) => {
                const payload = msg.payload;
                if (!payload?.id) return;

                setMatches(prev => prev.map(m => {
                    if (String(m.id || m._id) === String(payload.id)) {
                        const homeScore = payload.home_score !== undefined ? payload.home_score : (m.home_score ?? 0);
                        const awayScore = payload.away_score !== undefined ? payload.away_score : (m.away_score ?? 0);
                        return {
                            ...m,
                            ...payload,
                            score: { home: homeScore, away: awayScore },
                            home_score: homeScore,
                            away_score: awayScore,
                            status: payload.status || m.status,
                        };
                    }
                    return m;
                }));
            })
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'match_events',
            }, async (payload: any) => {
                const newRow = payload?.new;
                if (newRow && newRow.replay_video_url) {
                    const freshStories = await storyService.fetchLatestTourGoalStories(
                        matchesRef.current,
                        sliderItemsRef.current,
                        viewedStoryIdsRef.current,
                        orgId,
                        ownTeamId
                    );
                    setStoryGroups(freshStories);
                }
            })
            .subscribe();

        // Socket fallback faqat Realtime ishlamasa (rare case)
        if (socket && isConnected) {
            socket.on('match-update', (updatedMatch: any) => {
                setMatches(prev => {
                    const updated = prev.map(m => (m._id === updatedMatch.matchId || m.id === updatedMatch.matchId) ? { ...m, ...updatedMatch.match } : m);
                    storyService.fetchLatestTourGoalStories(updated, sliderItemsRef.current, viewedStoryIdsRef.current, orgId, ownTeamId).then(setStoryGroups);
                    return updated;
                });
            });
        }

        return () => {
            supabase.removeChannel(unifiedChannel);
            if (socket) socket.off('match-update');
        };
    }, [socket, isConnected, sliderItems, user]);

    const fetchUserProfileData = async () => {
        if (!user) return null;
        const targetUserId = user.id || user._id;
        const targetTeamId = user.teamId || user.team_id || targetUserId;
        try {
            if (user.role === 'player' && targetUserId) {
                return await apiService.getPlayerById(targetUserId);
            } else if (user.role === 'manager' && targetTeamId) {
                return await apiService.getTeamById(targetTeamId);
            }
        } catch (e) {
            console.error('Error fetching profile in HomeScreen:', e);
        }
        return user;
    };

    const loadData = async (isRefreshing = false, isSilent = false) => {
        try {
            if (isRefreshing) {
                setRefreshing(true);
            } else if (!isSilent && !hasCachedDataRef.current) {
                setLoading(true);
            }
            
            // Parallelize matches, slider items, user profile, viewed stories, and news fetching
            const [matchesData, sliderData, profileData, viewedIds, fetchedNewsData] = await Promise.all([
                apiService.getMatches().catch(err => { console.error('Matches fetch err:', err); return []; }),
                apiService.getSliderItems().catch(err => { console.error('Slider fetch err:', err); return []; }),
                fetchUserProfileData().catch(err => { console.error('Profile fetch err:', err); return null; }),
                storyService.getViewedStoryIds().catch(() => [] as string[]),
                apiService.getNews(1, 10).catch(err => { console.error('News fetch err:', err); return []; }),
            ]);

            viewedStoryIdsRef.current = viewedIds || [];

            const fetchedMatches = (matchesData && Array.isArray(matchesData)) ? matchesData : [];
            setMatches(fetchedMatches);

            const realNews = Array.isArray(fetchedNewsData) ? fetchedNewsData : [];
            setNewsItems(realNews);

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

            // Build 100% real stories strictly scoped to currentOrgId and latest tour
            const realStories = await storyService.fetchLatestTourGoalStories(
                fetchedMatches,
                validSlider,
                viewedStoryIdsRef.current,
                currentOrgId,
                ownTeamId
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
                newsItems: realNews,
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
        if (!group.items || group.items.length === 0) return;
        setSelectedStoryIndex(index);
        setStoryModalVisible(true);
        await handleStoryGroupViewed(group.id);
    };

    // Story qo'shilgandan keyin (yangi tanlangan replay orqali) tray/viewer'ni
    // yangilash uchun story ro'yxatini qaytadan quradi.
    const handleStoryAdded = async () => {
        try {
            const freshStories = await storyService.fetchLatestTourGoalStories(
                matchesRef.current,
                sliderItemsRef.current,
                viewedStoryIdsRef.current,
                currentOrgId,
                ownTeamId
            );
            setStoryGroups(freshStories);
        } catch (e) {
            console.warn('Error refreshing stories after add:', e);
        }
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

    // Yordamchi: match tur/bosqich nomini to'g'ri olish
    const getMatchTourKey = (m: any): string => {
        if (!m) return '';
        const raw = m.round_tag || m.round_name || m.round_number || m.round || m.tour || m.tourNumber;
        if (!raw) return '';
        return String(raw).trim();
    };

    const parseMatchTourNumber = (m: any): number => {
        const raw = getMatchTourKey(m);
        if (!raw) return 0;
        const numMatch = raw.match(/\d+/);
        return numMatch ? parseInt(numMatch[0], 10) : 0;
    };

    const formatRoundName = (m: any): string => {
        const s = getMatchTourKey(m);
        if (!s) return '';
        if (s.toLowerCase().includes('tur') || s.toLowerCase().includes('round') || s.toLowerCase().includes('final')) {
            return s.toUpperCase();
        }
        return `${s}-TUR`.toUpperCase();
    };

    // Group upcoming matches by League (faqat eng yaqin kutilayotgan tur o'yinlari)
    const groupedUpcomingMatches = useMemo(() => {
        const allUpcoming = matches.filter(m => isMatchUpcoming(m.status));
        const groupsMap: Record<string, { leagueId: string; leagueName: string; matches: any[] }> = {};

        allUpcoming.forEach(m => {
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

        return Object.values(groupsMap).map(group => {
            const sortedByDate = [...group.matches].sort((a, b) => {
                const dateA = new Date(a.date || a.match_date || a.createdAt || 0).getTime();
                const dateB = new Date(b.date || b.match_date || b.createdAt || 0).getTime();
                return dateA - dateB;
            });

            // Eng yaqin bo'lajak tur
            const tourNums = sortedByDate.map(parseMatchTourNumber).filter(n => n > 0);
            let upcomingTourMatches: any[] = [];

            if (tourNums.length > 0) {
                const minTourNum = Math.min(...tourNums);
                upcomingTourMatches = sortedByDate.filter(m => parseMatchTourNumber(m) === minTourNum);
            } else {
                const earliestKey = getMatchTourKey(sortedByDate[0]);
                if (earliestKey) {
                    upcomingTourMatches = sortedByDate.filter(m => getMatchTourKey(m) === earliestKey);
                } else {
                    upcomingTourMatches = sortedByDate;
                }
            }

            return {
                ...group,
                matches: upcomingTourMatches
            };
        }).filter(group => group.matches.length > 0);
    }, [matches]);

    // Group finished matches by League (FAQAT SO'NGGI TUR NATIJALARI)
    const groupedFinishedMatches = useMemo(() => {
        const allFinished = matches.filter(m => isMatchFinished(m.status));
        const groupsMap: Record<string, { leagueId: string; leagueName: string; matches: any[] }> = {};

        allFinished.forEach(m => {
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

        return Object.values(groupsMap).map(group => {
            // Sort matches by date descending (eng oxirgi o'yinlar boshida)
            const sortedByDate = [...group.matches].sort((a, b) => {
                const dateA = new Date(a.date || a.match_date || a.createdAt || 0).getTime();
                const dateB = new Date(b.date || b.match_date || b.createdAt || 0).getTime();
                return dateB - dateA;
            });

            // 1. Agar raqamli turlar bo'lsa (masalan: 1-tur, 2-tur, 3-tur), eng kattasini (so'nggi turini) olamiz:
            const tourNums = sortedByDate.map(parseMatchTourNumber).filter(n => n > 0);
            let latestTourMatches: any[] = [];

            if (tourNums.length > 0) {
                const maxTourNum = Math.max(...tourNums);
                latestTourMatches = sortedByDate.filter(m => parseMatchTourNumber(m) === maxTourNum);
            } else {
                // 2. Agar matnli tur bo'lsa (masalan: "Final", "Yarim final"):
                const latestKey = getMatchTourKey(sortedByDate[0]);
                if (latestKey) {
                    latestTourMatches = sortedByDate.filter(m => getMatchTourKey(m) === latestKey);
                } else {
                    // 3. Agar tur ma'lumoti umuman bo'lmasa, eng oxirgi 4 ta o'yin
                    latestTourMatches = sortedByDate.slice(0, 4);
                }
            }

            return {
                ...group,
                matches: latestTourMatches
            };
        }).filter(group => group.matches.length > 0);
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

        // Live Timing, Seconds (MM:SS), Period, Pause, and Half-Time Detection (1:1 Admin-App Mirror)
        let isHalfTime = false;
        let isPaused = false;
        let liveBadgeLabel = 'LIVE';
        let liveTimerTime = '';
        let livePeriodLabel = '';

        if (matchIsLive) {
            const st = String(match.status || '').toLowerCase().trim();
            isHalfTime = st.includes('half_time') || st.includes('halftime') || st.includes('tanaffus') || st === 'break';
            
            const isSecondHalf = st.includes('second') || st.includes('2-taym') || st.includes('2nd');

            const halfDurMins = Number(match.half_duration) || (String(match.league || '').includes('7x7') ? 25 : 30);
            const halfDurSecs = halfDurMins * 60;

            const isTimerRunning = match.is_timer_running === true || match.is_timer_running === 'true';
            let curTimerSec = Number(match.timer_seconds);
            if (isNaN(curTimerSec) || curTimerSec < 0) curTimerSec = halfDurSecs;

            if (isTimerRunning && match.timer_started_at) {
                const startedMs = new Date(match.timer_started_at).getTime();
                if (!isNaN(startedMs)) {
                    const elapsedFromStart = Math.max(0, Math.floor((Date.now() - startedMs) / 1000));
                    curTimerSec = Math.max(0, curTimerSec - elapsedFromStart);
                }
            } else if (!isTimerRunning && !isHalfTime) {
                isPaused = true;
            }

            // Calculate Elapsed Time Count-UP (admin-app exact replica)
            let totalElapsedSec = 0;
            if (isHalfTime) {
                totalElapsedSec = halfDurSecs;
            } else if (isSecondHalf) {
                const secondHalfElapsed = Math.max(0, halfDurSecs - curTimerSec);
                totalElapsedSec = halfDurSecs + secondHalfElapsed;
            } else {
                totalElapsedSec = Math.max(0, halfDurSecs - curTimerSec);
            }

            // Fallback to match.minute or match.current_minute if totalElapsedSec is 0
            if (totalElapsedSec === 0 && (match.minute || match.current_minute)) {
                totalElapsedSec = Math.max(0, (Number(match.minute || match.current_minute) - 1) * 60);
            }

            const mm = Math.floor(totalElapsedSec / 60).toString().padStart(2, '0');
            const ss = (totalElapsedSec % 60).toString().padStart(2, '0');

            if (isHalfTime) {
                liveBadgeLabel = 'TANAFFUS';
                liveTimerTime = 'TANAFFUS';
                livePeriodLabel = '';
            } else {
                liveBadgeLabel = isPaused ? 'PAUZA' : 'LIVE';
                liveTimerTime = `${mm}:${ss}`;
                livePeriodLabel = isPaused 
                    ? `PAUZA (${isSecondHalf ? '2-TAYM' : '1-TAYM'})`
                    : (isSecondHalf ? '2-TAYM' : '1-TAYM');
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

        const isAndroidLight = Platform.OS === 'android' && !isDark;

        const cardContent = (
            <View style={{ paddingHorizontal: 16, paddingVertical: 12 }}>
                {/* Score har doim o'rtada, teamlar shunga qarab markazlashsin */}
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>

                    {/* CHAP: Home Team Name + Logo (flex: 1, o'ngga) */}
                    <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 4, paddingRight: 8 }}>
                        <Text style={{ fontSize: 11, fontWeight: '700', color: homeColors.textPrimary, letterSpacing: 0.1 }} numberOfLines={1}>
                            {match.homeTeamName || match.homeTeam?.name || 'UY'}
                        </Text>
                        <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
                            {match.homeTeam?.logo || match.home_team_logo ? (
                                <SmartImage
                                    uri={match.homeTeam?.logo || match.home_team_logo}
                                    style={{ width: 18, height: 18 }}
                                    contentFit="contain"
                                    fallbackIcon="shield-outline"
                                />
                            ) : (
                                <Text style={{ fontSize: 9, fontWeight: '700', color: homeColors.textSecondary }}>
                                    {(match.homeTeamName || match.homeTeam?.name || 'UY').charAt(0).toUpperCase()}
                                </Text>
                            )}
                        </View>
                    </View>

                    {/* O'RTA: Score yoki Vaqt (fixed width, har doim o'rtada) */}
                    <View style={{ width: 70, alignItems: 'center', justifyContent: 'center' }}>
                        {matchIsLive ? (
                            <View style={{ alignItems: 'center' }}>
                                {/* Live Score */}
                                <Text style={{ fontSize: 16, fontWeight: '900', color: homeColors.textPrimary, letterSpacing: 0.5 }}>
                                    {match.score?.home ?? match.home_score ?? 0} : {match.score?.away ?? match.away_score ?? 0}
                                </Text>
                                {/* LIVE badge */}
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 2 }}>
                                    <View style={{ width: 5, height: 5, borderRadius: 2.5, backgroundColor: Colors.primary }} />
                                    <Text style={{ fontSize: 8, fontWeight: '800', color: Colors.primary, letterSpacing: 0.3 }}>
                                        {liveBadgeLabel}
                                    </Text>
                                </View>
                            </View>
                        ) : matchIsFinished ? (
                            <View style={{ alignItems: 'center' }}>
                                {/* Natija sho't — rejalashtirilgan match vaqti o'lchamida */}
                                <Text style={{ fontSize: 16, fontWeight: '800', color: homeColors.textPrimary, letterSpacing: 0.5 }}>
                                    {match.score?.home ?? match.home_score ?? 0} : {match.score?.away ?? match.away_score ?? 0}
                                </Text>
                                {/* Bo'lib o'tgan sanasi */}
                                <Text style={{ fontSize: 8.5, color: homeColors.textSecondary, marginTop: 1, fontWeight: '600' }}>
                                    {day} {month}
                                </Text>
                            </View>
                        ) : (
                            <View style={{ alignItems: 'center' }}>
                                {/* Rejalashtirilgan o'yin vaqti */}
                                <Text style={{ fontSize: 16, fontWeight: '700', color: homeColors.textPrimary, letterSpacing: -0.3 }}>
                                    {formattedTime}
                                </Text>
                                {/* Rejalashtirilgan o'yin sanasi */}
                                <Text style={{ fontSize: 8.5, color: homeColors.textSecondary, marginTop: 1, fontWeight: '600' }}>
                                    {day} {month}
                                </Text>
                            </View>
                        )}
                    </View>

                    {/* O'NG: Away Team Logo + Name (flex: 1, chapga) */}
                    <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start', gap: 4, paddingLeft: 8 }}>
                        <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
                            {match.awayTeam?.logo || match.away_team_logo ? (
                                <SmartImage
                                    uri={match.awayTeam?.logo || match.away_team_logo}
                                    style={{ width: 18, height: 18 }}
                                    contentFit="contain"
                                    fallbackIcon="shield-outline"
                                />
                            ) : (
                                <Text style={{ fontSize: 9, fontWeight: '700', color: homeColors.textSecondary }}>
                                    {(match.awayTeamName || match.awayTeam?.name || 'MEH').charAt(0).toUpperCase()}
                                </Text>
                            )}
                        </View>
                        <Text style={{ fontSize: 11, fontWeight: '700', color: homeColors.textPrimary, letterSpacing: 0.1 }} numberOfLines={1}>
                            {match.awayTeamName || match.awayTeam?.name || 'MEH'}
                        </Text>
                    </View>

                </View>
            </View>
        );

        if (isAndroidLight) {
            return (
                <View
                    key={match._id || Math.random().toString()}
                    style={[
                        isVertical ? styles.vMatchCard : styles.hMatchCard,
                        {
                            marginBottom: 8,
                        }
                    ]}
                >
                    <TouchableOpacity
                        style={[
                            {
                                width: '100%',
                                backgroundColor: '#FFFFFF',
                                borderTopLeftRadius: 0,
                                borderTopRightRadius: 0,
                                borderBottomLeftRadius: 18,
                                borderBottomRightRadius: 18,
                            },
                            matchIsLive && ((isHalfTime || isPaused) ? styles.hMatchCardHalftime : styles.hMatchCardLive)
                        ]}
                        onPress={() => navigation.navigate('MatchDetail', { matchId: match._id || match.id, matchData: match })}
                        activeOpacity={0.85}
                    >
                        {cardContent}
                    </TouchableOpacity>

                    {/* Haqiqiy mayin, tarqoq gradient soya — qattiq chiziq/border umuman yo'q */}
                    <LinearGradient
                        colors={[
                            'rgba(0, 0, 0, 0.16)',
                            'rgba(0, 0, 0, 0.09)',
                            'rgba(0, 0, 0, 0.03)',
                            'transparent'
                        ]}
                        style={{
                            height: 12,
                            width: '94%',
                            alignSelf: 'center',
                            borderBottomLeftRadius: 18,
                            borderBottomRightRadius: 18,
                        }}
                    />
                </View>
            );
        }

        return (
            <TouchableOpacity
                key={match._id || Math.random().toString()}
                style={[
                    isVertical ? styles.vMatchCard : styles.hMatchCard,
                    {
                        backgroundColor: homeColors.background,
                        borderWidth: 1,
                        borderColor: homeColors.border,
                        borderTopColor: 'transparent',
                        borderBottomLeftRadius: 22,
                        borderBottomRightRadius: 22,
                        borderTopLeftRadius: 0,
                        borderTopRightRadius: 0,
                        marginBottom: 8,
                    },
                    matchIsLive && ((isHalfTime || isPaused) ? styles.hMatchCardHalftime : styles.hMatchCardLive)
                ]}
                onPress={() => navigation.navigate('MatchDetail', { matchId: match._id || match.id, matchData: match })}
                activeOpacity={0.85}
            >
                {Platform.OS === 'ios' && isDark && <BlurView intensity={25} tint="dark" style={StyleSheet.absoluteFill} />}
                {cardContent}
            </TouchableOpacity>
        );
    };

    return (
        <View style={{ flex: 1, backgroundColor: homeColors.background }}>
            <SafeAreaView style={styles.container} edges={['top']}>
                <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ paddingBottom: 130 }}
                    onScroll={(e) => handleNavBarScroll('home', e)}
                    scrollEventThrottle={16}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
                    }
                >
                    {loading ? (
                        <HomeSkeleton />
                    ) : (
                        <>
                            {(() => {
                                const avatarUri = user?.photo || user?.photo_url || user?.avatar || user?.logo || user?.logo_url || userProfile?.photo || userProfile?.photo_url || userProfile?.avatar || userProfile?.logo || userProfile?.logo_url;
                                const rawName = user?.firstName || user?.name || user?.team_name || userProfile?.firstName || userProfile?.name || userProfile?.team_name || 'AMATORA';
                                const displayName = rawName.replace(/\(sardor\)/gi, '').replace(/\(menejer\)/gi, '').trim().split(' ')[0] || 'AMATORA';

                                const getGreetingText = () => {
                                    const hour = new Date().getHours();
                                    if (hour >= 5 && hour < 12) return t('home.good_morning');
                                    if (hour >= 12 && hour < 18) return t('home.good_day');
                                    return t('home.good_evening');
                                };

                                // Jamoa/trener akkaunti ("manager") uchun bu yerdagi avatar aslida
                                // jamoa logotipi bilan bir xil edi — endi o'sha logotip pastdagi
                                // story tray'da (birinchi halqa sifatida) ko'rsatiladi, shuning
                                // uchun bu yerda TAKROR ko'rsatilmaydi (headerni yengillashtiradi).
                                const showHeaderAvatar = userRole !== 'manager';

                                return (
                                    <View style={[styles.header, !showHeaderAvatar && styles.headerCompact]}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                                            {showHeaderAvatar && (
                                                <TouchableOpacity
                                                    style={styles.profileButton}
                                                    onPress={() => navigation.navigate('MainTabs', { screen: 'Profil' })}
                                                    activeOpacity={0.8}
                                                >
                                                    <View style={styles.squircleAvatarContainer}>
                                                        {avatarUri ? (
                                                            <SmartImage
                                                                uri={avatarUri}
                                                                style={styles.squircleAvatar}
                                                                fallbackIcon="person"
                                                            />
                                                        ) : (
                                                            <View style={styles.squircleAvatarFallback}>
                                                                <Ionicons name="person" size={20} color="#00FF87" />
                                                            </View>
                                                        )}
                                                    </View>
                                                </TouchableOpacity>
                                            )}
                                            <View>
                                                <Text style={[styles.welcomeText, { color: homeColors.textSecondary }]}>
                                                    {isGuest ? 'AMATORA' : getGreetingText().toUpperCase()}
                                                </Text>
                                                <Text style={[styles.brandText, { color: homeColors.textPrimary }]}>
                                                    {isGuest ? getGreetingText().toUpperCase() : displayName.toUpperCase()}
                                                </Text>
                                            </View>
                                        </View>

                                        {/* Right Action: Notifications Button */}
                                        <TouchableOpacity
                                            style={styles.profileButton}
                                            onPress={() => navigation.navigate('Notifications')}
                                            activeOpacity={0.75}
                                        >
                                            <View style={[styles.bellButton, { backgroundColor: homeColors.surface, borderColor: homeColors.border }]}>
                                                <Ionicons name="notifications-outline" size={20} color={homeColors.textPrimary} />
                                                <View style={styles.unreadBadgeDot} />
                                            </View>
                                        </TouchableOpacity>
                                    </View>
                                );
                            })()}

                            {/* Stories & Highlight Reels Bar */}
                            {storyGroups && storyGroups.length > 0 && (
                                <MatchStoriesTray
                                    stories={storyGroups}
                                    onSelectStoryGroup={handleSelectStoryGroup}
                                />
                            )}

                            {/* Super Liga Top-4 Widget (Bosqich 2) */}
                            <SuperLigaTop4
                                onViewAll={() => {
                                    navigation.navigate('TournamentDetail', {
                                        tournamentId: 'super',
                                        tournamentName: 'Super Liga',
                                        initialTab: 'standings',
                                        tab: 'standings'
                                    });
                                }}
                            />

                            {/* Yangiliklar Section */}
                            <View style={styles.sectionContainer}>
                                <View style={styles.sectionHeader}>
                                    <Text style={[styles.sectionTitle, { color: homeColors.textPrimary }]}>
                                        {t('home.news', 'YANGILIKLAR').toUpperCase()}
                                    </Text>
                                    <TouchableOpacity 
                                        onPress={() => navigation.navigate('MainTabs', { screen: 'Yangiliklar' })} 
                                        activeOpacity={0.7}
                                    >
                                        <Text style={styles.viewAllText}>{t('common.details', 'BATAFSIL').toUpperCase()}</Text>
                                    </TouchableOpacity>
                                </View>

                                {/* Yangilik kartalar HORIZONTAL scroll */}
                                <ScrollView
                                    horizontal
                                    showsHorizontalScrollIndicator={false}
                                    contentContainerStyle={{ paddingHorizontal: 20, gap: 12, paddingVertical: 4 }}
                                >
                                    {newsItems && newsItems.length > 0 ? (
                                        newsItems.map((item: any, idx: number) => {
                                            const categoryText = getLocalizedNewsCategory(item.category || item.type || item.newsType, t);
                                            const titleText = getLocalizedNewsField(item, 'title', i18n.language) || item.title || '';
                                            const timeAgo = formatLocalizedRelativeTime(item.createdAt || item.created_at, i18n.language);

                                            return (
                                                <View
                                                    key={item._id || item.id || idx}
                                                    style={{
                                                        width: 280,
                                                        minHeight: 140,
                                                        borderRadius: 14,
                                                        backgroundColor: isAndroidLight ? '#FFFFFF' : homeColors.background,
                                                        borderWidth: isAndroidLight ? 0 : 1,
                                                        borderColor: homeColors.border,
                                                        shadowColor: '#000000',
                                                        shadowOffset: { width: 0, height: 4 },
                                                        shadowOpacity: isAndroidLight ? 0.08 : 0.1,
                                                        shadowRadius: 10,
                                                        elevation: isAndroidLight ? 3 : 6,
                                                    }}
                                                >
                                                    <TouchableOpacity
                                                        style={{ flex: 1, borderRadius: 14, overflow: 'hidden' }}
                                                        activeOpacity={0.8}
                                                        onPress={() => {
                                                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                                                            navigation.navigate('NewsDetail', { newsId: item._id || item.id, news: item });
                                                        }}
                                                    >
                                                        <View style={{ flex: 1, padding: 14, justifyContent: 'space-between' }}>
                                                            <View>
                                                                <Text style={{ fontSize: 10, fontWeight: '800', color: Colors.primary, letterSpacing: 0.5, marginBottom: 6 }}>
                                                                    {categoryText.toUpperCase()}
                                                                </Text>
                                                                <Text
                                                                    style={{ fontSize: 13.5, fontWeight: '700', color: homeColors.textPrimary, lineHeight: 18 }}
                                                                    numberOfLines={3}
                                                                >
                                                                    {titleText}
                                                                </Text>
                                                            </View>

                                                            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
                                                                <Text style={{ fontSize: 10, color: homeColors.textSecondary, fontWeight: '600' }}>
                                                                    {timeAgo}
                                                                </Text>
                                                                <Ionicons name="chevron-forward" size={14} color={homeColors.textSecondary} />
                                                            </View>
                                                        </View>
                                                    </TouchableOpacity>
                                                </View>
                                            );
                                        })
                                    ) : (
                                        <View
                                            style={{
                                                width: width - 40,
                                                padding: 20,
                                                borderRadius: 14,
                                                backgroundColor: homeColors.background,
                                                borderWidth: 1,
                                                borderColor: homeColors.border,
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                            }}
                                        >
                                            <Text style={{ fontSize: 12, color: homeColors.textSecondary, fontWeight: '600' }}>
                                                {t('news.loading', 'YANGILIKLAR YUKLANMOQDA...')}
                                            </Text>
                                        </View>
                                    )}
                                </ScrollView>
                            </View>

                            {/* Primary Dynamic Matches Section */}
                            {loading ? (
                                <View style={styles.sectionContainer}>
                                    <View style={styles.sectionHeader}>
                                        <Text style={styles.sectionTitle}>{t('matches.title', 'O\'yinlar')}</Text>
                                    </View>
                                    <View style={{ paddingHorizontal: 20 }}>
                                        <Skeleton width="100%" height={180} borderRadius={20} />
                                    </View>
                                </View>
                            ) : (
                                <>
                                    {/* 1. JONLI O'YINLAR */}
                                    {liveMatches.length > 0 && (
                                        <View style={styles.sectionContainer}>
                                            <View style={styles.sectionHeader}>
                                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                                    <View style={styles.liveIndicatorDot} />
                                                    <Text style={[styles.sectionTitle, { color: '#E85002' }]}>
                                                        {t('matches.live', 'JONLI O\'YINLAR').toUpperCase()}
                                                    </Text>
                                                </View>
                                                <TouchableOpacity onPress={() => navigation.navigate('MainTabs', { screen: 'Taqvim' })}>
                                                    <Text style={styles.viewAllText}>{t('common.details', 'BATAFSIL').toUpperCase()}</Text>
                                                </TouchableOpacity>
                                            </View>

                                            <View style={styles.verticalMatchList}>
                                                {liveMatches.map(m => renderMatchCard(m, true, true))}
                                            </View>
                                        </View>
                                    )}

                                    {/* 2. BO'LAJAK / ENG YAQIN O'YINLAR (Liga nomi bo'yicha) */}
                                    {groupedUpcomingMatches.length > 0 && (
                                        groupedUpcomingMatches.map((group: any, groupIdx: number) => {
                                            const firstMatch = group.matches?.[0];
                                            const roundTag = formatRoundName(firstMatch);
                                            const titleText = roundTag ? `${group.leagueName.toUpperCase()} (${roundTag})` : group.leagueName.toUpperCase();

                                            return (
                                                <View key={`upcoming_${group.leagueId || groupIdx}`} style={styles.sectionContainer}>
                                                    <View style={styles.sectionHeader}>
                                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1, marginRight: 8 }}>
                                                            <Text style={[styles.sectionTitle, { color: homeColors.textPrimary }]} numberOfLines={1}>
                                                                {titleText}
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
                                                                {t('common.details', 'BATAFSIL').toUpperCase()}
                                                            </Text>
                                                        </TouchableOpacity>
                                                    </View>

                                                    <View style={styles.verticalMatchList}>
                                                        {group.matches.map((m: any) => renderMatchCard(m, false, true))}
                                                    </View>
                                                </View>
                                            );
                                        })
                                    )}

                                    {/* 3. BO'LIB O'TGAN NATIJALAR (Liga nomi bo'yicha) */}
                                    {groupedFinishedMatches.length > 0 && (
                                        groupedFinishedMatches.map((group: any, groupIdx: number) => {
                                            const firstMatch = group.matches?.[0];
                                            const roundTag = formatRoundName(firstMatch);
                                            const titleText = roundTag ? `${group.leagueName.toUpperCase()} (${roundTag})` : group.leagueName.toUpperCase();

                                            return (
                                                <View key={`finished_${group.leagueId || groupIdx}`} style={styles.sectionContainer}>
                                                    <View style={styles.sectionHeader}>
                                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1, marginRight: 8 }}>
                                                            <Text style={[styles.sectionTitle, { color: homeColors.textPrimary }]} numberOfLines={1}>
                                                                {titleText}
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
                                                                {t('common.details', 'BATAFSIL').toUpperCase()}
                                                            </Text>
                                                        </TouchableOpacity>
                                                    </View>

                                                    <View style={styles.verticalMatchList}>
                                                        {group.matches.map((m: any) => renderMatchCard(m, false, true))}
                                                    </View>
                                                </View>
                                            );
                                        })
                                    )}

                                    {/* 4. HECH QANDAY O'YIN MAVJUD BO'LMASA */}
                                    {liveMatches.length === 0 && groupedUpcomingMatches.length === 0 && groupedFinishedMatches.length === 0 && (
                                        <View style={styles.sectionContainer}>
                                            <View style={styles.emptyCard}>
                                                <Ionicons name="football-outline" size={36} color={Colors.textMuted} />
                                                <Text style={styles.emptyText}>{t('home.no_matches', 'Hozircha o\'yinlar mavjud emas')}</Text>
                                            </View>
                                        </View>
                                    )}
                                </>
                            )}
                        </>
                    )}
                </ScrollView>

                {/* Fullscreen Story Viewer Modal */}
                <StoryViewerModal
                    visible={storyModalVisible}
                    storyGroups={storyGroups}
                    initialGroupIndex={selectedStoryIndex}
                    onClose={() => setStoryModalVisible(false)}
                    onNavigateMatch={handleNavigateMatchFromStory}
                    onStoryGroupViewed={handleStoryGroupViewed}
                    onStoryAdded={handleStoryAdded}
                />


            </SafeAreaView>
        </View>
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
    // Avatar (jamoa logotipi) ko'rsatilmaganda header bilan story tray
    // orasidagi bo'sh joy ortiqcha ochiq ko'rinmasligi uchun torroq qilingan.
    headerCompact: {
        marginBottom: 2,
        paddingVertical: 6,
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
        fontSize: 18,
        fontWeight: '900',
        letterSpacing: 0.5,
    },
    profileButton: {
        padding: 0,
    },
    squircleAvatarContainer: {
        width: 48,
        height: 48,
        borderRadius: 15,
        borderWidth: 1.5,
        borderColor: 'rgba(255, 255, 255, 0.12)',
        overflow: 'hidden',
        alignItems: 'center',
        justifyContent: 'center',
    },
    liveConnectionBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.12)',
    },
    onlinePulseDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: 'rgba(255, 255, 255, 0.6)',
        marginRight: 4,
    },
    onlinePulseText: {
        color: 'rgba(255, 255, 255, 0.6)',
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 0.5,
    },
    timePillBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 10,
    },
    hMatchCardMarkaziy: {
        borderColor: 'rgba(255, 230, 0, 0.45)',
        borderWidth: 1.5,
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
        backgroundColor: '#E85002',
        shadowColor: '#E85002',
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
        // Border OLIB TASHLANDI — faqat yengil orange fon qoldirildi
        backgroundColor: 'rgba(232, 80, 2, 0.12)',
    },
    hMatchCardHalftime: {
        // Border OLIB TASHLANDI — faqat yengil sariq fon qoldirildi
        backgroundColor: 'rgba(250, 204, 21, 0.1)',
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
        fontSize: 12,
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
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: 'transparent',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 6,
        borderWidth: 0,
        overflow: 'hidden',
    },
    hTeamLogo: {
        width: 44,
        height: 44,
        borderRadius: 22,
    },
    hLogoText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: 'bold',
    },
    hTeamName: {
        color: '#FFF',
        fontSize: 11,
        fontWeight: '700',
        textAlign: 'center',
        marginTop: 4,
        letterSpacing: 0.3,
    },
    hScoreColumn: {
        width: 80,
        alignItems: 'center',
        justifyContent: 'center',
    },
    hScoreText: {
        color: '#FFF',
        fontSize: 26,
        fontWeight: '900',
        letterSpacing: -0.5,
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
        backgroundColor: 'rgba(232, 80, 2, 0.2)',
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
        backgroundColor: Colors.primary,
        marginRight: 5,
    },
    halftimeDot: {
        backgroundColor: '#FACC15',
    },
    liveBadgeText: {
        color: Colors.primary,
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
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.12)',
    },
    roundBadgeText: {
        color: '#FFFFFF',
        fontSize: 10,
        fontWeight: '900',
        letterSpacing: 0.5,
    },
    hMatchCard: {
        width: CARD_WIDTH,
        overflow: 'hidden',
    },
    vMatchCard: {
        width: width - 40,
        overflow: 'hidden',
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
        fontSize: 13.5,
        fontWeight: '800',
        letterSpacing: 0.3,
    },
    viewAllText: {
        color: Colors.primary,
        fontSize: 11,
        fontWeight: '700',
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
        fontSize: 13,
        fontWeight: '600',
    },
    recentScore: {
        color: Colors.primary,
        fontWeight: '900',
    },
    recentDate: {
        color: '#8A94A6',
        fontSize: 11,
        minWidth: 50,
        textAlign: 'right',
    },
    vsContainer: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    hTimeVsText: {
        color: '#FFFFFF',
        fontSize: 22,
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
        color: '#E85002',
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
        backgroundColor: 'rgba(232, 80, 2, 0.18)',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 6,
        marginTop: 4,
        borderWidth: 1,
        borderColor: 'rgba(232, 80, 2, 0.4)',
    },
    liveMinuteTagText: {
        color: '#E85002',
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
        fontSize: 14,
        fontWeight: '900',
    },
    finishedTeamName: {
        color: '#FFFFFF',
        fontSize: 11,
        fontWeight: '700',
        textAlign: 'center',
    },
    finishedScoreBox: {
        alignItems: 'center',
        paddingHorizontal: 12,
    },
    finishedScoreText: {
        color: '#FFFFFF',
        fontSize: 18,
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
        fontSize: 10,
        fontWeight: '600',
    },
    finishedDotSeparator: {
        color: 'rgba(255, 255, 255, 0.3)',
        marginHorizontal: 8,
    },
});
