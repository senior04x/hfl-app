import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Image,
    ActivityIndicator,
    Dimensions,
    Animated,
    Linking,
    RefreshControl,
    Platform,
    StatusBar,
    PanResponder
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Colors from '../constants/Colors';
import MatchDetailSkeleton from '../components/MatchDetailSkeleton';
import YoutubePlayerCard from '../components/YoutubePlayerCard';
import TacticsBoard from '../components/TacticsBoard';
import ReplayVideoCard from '../components/ReplayVideoCard';
import { apiService, supabase } from '../services/apiService';
import { useSocket } from '../context/SocketContext';
import { formatShortTeamName, formatLocalizedVenue, formatLocalizedDate } from '../utils/stringUtils';
import SmartImage from '../components/SmartImage';
import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';
import { useThemeStore } from '../store/useThemeStore';
import { getHomeScreenColors } from '../constants/homeTheme';

const { width } = Dimensions.get('window');

const MATCH_TABS = [
    { key: 'overview', titleKey: 'matches.tab_overview' },
    { key: 'preview', titleKey: 'matches.tab_preview' },
    { key: 'lineups', titleKey: 'matches.tab_lineups' },
    { key: 'media', titleKey: 'matches.tab_media' },
    { key: 'staff', titleKey: 'matches.tab_staff' },
];

export default function MatchDetailScreen({ route, navigation }: any) {
    const { t, i18n } = useTranslation();
    const currentLang = i18n.language || 'uz';
    const { matchData, matchId } = route?.params || {};
    const [activeTab, setActiveTab] = useState('overview');
    const [currentTabIndex, setCurrentTabIndex] = useState(0);
    const currentTabIndexRef = useRef(0);
    const [tabLabelWidths, setTabLabelWidths] = useState<number[]>([]);
    const scrollXPager = useRef(new Animated.Value(0)).current;
    const isPagerScrolling = useRef(false);
    const pagerScrollRef = useRef<ScrollView>(null);
    const [loading, setLoading] = useState(true);
    const [match, setMatch] = useState<any>(matchData);
    const [homePlayers, setHomePlayers] = useState<any[]>([]);
    const [awayPlayers, setAwayPlayers] = useState<any[]>([]);
    const [homeForm, setHomeForm] = useState<string[]>([]);
    const [awayForm, setAwayForm] = useState<string[]>([]);
    const [h2hMatches, setH2hMatches] = useState<any[]>([]);
    const [playersLoading, setPlayersLoading] = useState(false);
    const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
    const [activePlayingVideoId, setActivePlayingVideoId] = useState<string | null>(null);
    const [refreshing, setRefreshing] = useState(false);
    const { socket, isConnected } = useSocket();
    const { isDark } = useThemeStore();
    const homeColors = getHomeScreenColors(isDark);
    const cardSurface = Platform.OS === 'ios'
        ? { backgroundColor: homeColors.background, borderWidth: 1, borderColor: homeColors.border }
        : {
            backgroundColor: homeColors.background,
            elevation: 3,
            shadowColor: '#000000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.08,
            shadowRadius: 6,
        };

    // Animation refs
    const slideAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (activeTab !== 'media') {
            setActivePlayingVideoId(null);
        }
    }, [activeTab]);

    const currentId = matchId || matchData?._id || matchData?.id;
    const CACHE_KEY = `match_detail_cache_${currentId}`;

    useEffect(() => {
        initMatchDetail();
    }, [currentId]);

    const initMatchDetail = async () => {
        if (!currentId) {
            setLoading(false);
            return;
        }

        let initialData = matchData;
        try {
            const cachedJson = await AsyncStorage.getItem(CACHE_KEY);
            if (cachedJson) {
                const cached = JSON.parse(cachedJson);
                if (cached) {
                    if (cached.match) initialData = { ...initialData, ...cached.match };
                    if (cached.homePlayers) setHomePlayers(cached.homePlayers);
                    if (cached.awayPlayers) setAwayPlayers(cached.awayPlayers);
                }
            }
        } catch (e) {}

        if (initialData) {
            setMatch(initialData);
            const hId = initialData?.homeTeamId || initialData?.home_team_id || initialData?.homeTeam?.id || initialData?.homeTeam?._id;
            if (hId) setSelectedTeamId(hId);
            setLoading(false);
        } else {
            setLoading(true);
        }

        await fetchMatch(false);
    };

    const fetchMatch = async (isSilentOrRefreshing = false) => {
        if (!currentId) {
            setLoading(false);
            return;
        }
        try {
            if (isSilentOrRefreshing && refreshing) setRefreshing(true);
            else if (!match && !matchData) setLoading(true);

            const data = await apiService.getMatchById(currentId);
            if (data) {
                setMatch((prev: any) => ({ ...prev, ...data }));
                
                const hId = data?.homeTeamId || data?.home_team_id || data?.homeTeam?.id || data?.homeTeam?._id;
                const aId = data?.awayTeamId || data?.away_team_id || data?.awayTeam?.id || data?.awayTeam?._id;

                if (hId && !selectedTeamId) setSelectedTeamId(hId);

                let homeData: any[] = [];
                let awayData: any[] = [];

                if (hId && aId) {
                    setPlayersLoading(true);
                    // 🔥 PERFORMANCE FIX: SELECT faqat kerakli columns (not *)
                    // Before: 50+ columns × 6 queries = 125 GB/s network bandwidth
                    // After: 10 columns × 6 queries = 2.5 GB/s (50x yaxshi!)
                    const [hRes, aRes, hMatchesRes, aMatchesRes, allGoalEventsRes, h2hRes] = await Promise.all([
                        apiService.getPlayers(1, 100, hId),
                        apiService.getPlayers(1, 100, aId),
                        supabase.from('matches').select('id, home_team_id, away_team_id, home_score, away_score, status, match_date, league').or(`home_team_id.eq.${hId},away_team_id.eq.${hId}`).eq('status', 'finished').order('created_at', { ascending: false }).limit(5),
                        supabase.from('matches').select('id, home_team_id, away_team_id, home_score, away_score, status, match_date, league').or(`home_team_id.eq.${aId},away_team_id.eq.${aId}`).eq('status', 'finished').order('created_at', { ascending: false }).limit(5),
                        supabase.from('match_events').select('player_id, event_type').ilike('event_type', '%goal%'),
                        supabase.from('matches').select('id, home_team_id, away_team_id, home_score, away_score, status, match_date, league').or(`and(home_team_id.eq.${hId},away_team_id.eq.${aId}),and(home_team_id.eq.${aId},away_team_id.eq.${hId})`).eq('status', 'finished').neq('id', currentId).order('created_at', { ascending: false }).limit(5)
                    ]);

                    homeData = hRes || [];
                    awayData = aRes || [];
                    setH2hMatches(h2hRes.data || []);

                    // Calculate real W/D/L form guide
                    const getFormArray = (matches: any[], teamId: string) => {
                        if (!matches || matches.length === 0) return [];
                        return matches.map((m: any) => {
                            const isHome = String(m.home_team_id) === String(teamId);
                            const myScore = parseInt(isHome ? (m.home_score || 0) : (m.away_score || 0));
                            const oppScore = parseInt(isHome ? (m.away_score || 0) : (m.home_score || 0));
                            if (myScore > oppScore) return 'W';
                            if (myScore === oppScore) return 'D';
                            return 'L';
                        });
                    };

                    const computedHForm = getFormArray(hMatchesRes.data || [], hId);
                    const computedAForm = getFormArray(aMatchesRes.data || [], aId);
                    setHomeForm(computedHForm);
                    setAwayForm(computedAForm);

                    // Count goals per player for Top Goalscorer spotlight
                    const goalCounts: Record<string, number> = {};
                    if (allGoalEventsRes.data) {
                        allGoalEventsRes.data.forEach((e: any) => {
                            const pId = String(e.player_id);
                            if (pId) goalCounts[pId] = (goalCounts[pId] || 0) + 1;
                        });
                    }

                    const enrichedHome = homeData.map((p: any) => {
                        const pId = String(p.id || p._id);
                        return { ...p, goalCount: goalCounts[pId] || p.goals || p.stats?.goals || 0 };
                    }).sort((a, b) => b.goalCount - a.goalCount);

                    const enrichedAway = awayData.map((p: any) => {
                        const pId = String(p.id || p._id);
                        return { ...p, goalCount: goalCounts[pId] || p.goals || p.stats?.goals || 0 };
                    }).sort((a, b) => b.goalCount - a.goalCount);

                    setHomePlayers(enrichedHome);
                    setAwayPlayers(enrichedAway);
                }

                await AsyncStorage.setItem(CACHE_KEY, JSON.stringify({
                    match: data,
                    homePlayers: homeData,
                    awayPlayers: awayData,
                    timestamp: Date.now()
                }));
            }
        } catch (error) {
            console.error('Error fetching match detail:', error);
        } finally {
            setLoading(false);
            setPlayersLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        if (!currentId) return;

        // Supabase Realtime listener on matches AND match_events for instant live sync
        const realtimeChannel = supabase
            .channel(`realtime_match_detail_${currentId}`)
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'matches', filter: `id=eq.${currentId}` },
                (payload: any) => {
                    if (payload.new) {
                        setMatch((prev: any) => ({ ...prev, ...payload.new }));
                    }
                    fetchMatch(true);
                }
            )
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'match_events', filter: `match_id=eq.${currentId}` },
                () => {
                    fetchMatch(true);
                }
            )
            .subscribe();

        if (socket && isConnected) {
            socket.on('match-update', (data: any) => {
                if (data.matchId === currentId || data.id === currentId || data.match?.id === currentId) {
                    if (data.match) setMatch((prev: any) => ({ ...prev, ...data.match }));
                    fetchMatch(true);
                }
            });
        }

        return () => {
            supabase.removeChannel(realtimeChannel);
            if (socket) socket.off('match-update');
        };
    }, [socket, isConnected, currentId]);

    const onRefresh = () => {
        fetchMatch(true);
    };

    const switchTeam = async () => {
        try {
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        } catch (e) {}

        const isHome = selectedTeamId === match?.homeTeamId;
        const nextId = isHome ? match?.awayTeamId : match?.homeTeamId;
        const slideOutValue = -50;

        Animated.timing(slideAnim, {
            toValue: slideOutValue,
            duration: 150,
            useNativeDriver: true,
        }).start(() => {
            setSelectedTeamId(nextId);
            slideAnim.setValue(50);
            Animated.spring(slideAnim, {
                toValue: 0,
                friction: 8,
                tension: 40,
                useNativeDriver: true,
            }).start();
        });
    };

    const formatDate = (dateString: string) => {
        return formatLocalizedDate(dateString, currentLang, match?.match_time || match?.time);
    };

    const renderHeader = () => {
        const localizedVenue = formatLocalizedVenue(match?.venue || 'Amatora Arena', currentLang);

        return (
            <View style={[styles.headerContainer, { backgroundColor: homeColors.background, borderBottomColor: homeColors.border }]}>
                <View style={styles.topNav}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.backBtn, cardSurface]}>
                        <Ionicons name="arrow-back" size={20} color={homeColors.textPrimary} />
                    </TouchableOpacity>
                    <Text style={[styles.headerTitle, { color: homeColors.textPrimary }]}>{(match?.tournamentName || 'TURNIR').toUpperCase()}</Text>
                    {match?.round ? (
                        <View style={[styles.tourBadge, { backgroundColor: homeColors.accent }]}>
                            <Text style={styles.tourBadgeText}>
                                {t('matches.round_tour', { round: match.round })}
                            </Text>
                        </View>
                    ) : <View style={{ width: 38 }} />}
                </View>

                <View style={styles.matchScoreCard}>
                    <View style={styles.dateRow}>
                        <Ionicons name="calendar-outline" size={14} color={homeColors.textSecondary} />
                        <Text style={[styles.dateText, { color: homeColors.textSecondary }]}>
                            {formatDate(match?.date).toUpperCase()}
                        </Text>
                    </View>

                    <View style={styles.teamsScoreRow}>
                        <TouchableOpacity
                            style={styles.teamBlockRight}
                            activeOpacity={0.7}
                            onPress={() => {
                                const hId = match?.homeTeamId || match?.home_team_id || match?.homeTeam?.id || match?.homeTeam?._id;
                                if (hId) {
                                    navigation.navigate('TeamProfile', { teamId: hId });
                                }
                            }}
                        >
                            <Text style={[styles.teamNameText, { color: homeColors.textPrimary }]} numberOfLines={1}>
                                {(formatShortTeamName(match?.homeTeamName || match?.homeTeam?.name || 'JAMOA A', 12) || 'JAMOA A').toUpperCase()}
                            </Text>
                            <View style={[styles.logoCircle, { backgroundColor: homeColors.surface, borderColor: homeColors.border }]}>
                                <SmartImage
                                    uri={match?.homeTeamLogo || match?.homeTeam?.logo || match?.home_team_logo || match?.home_team?.logo_url}
                                    style={{ width: 34, height: 34, borderRadius: 17 }}
                                    contentFit="contain"
                                    fallbackIcon="shield"
                                    fallbackIconSize={20}
                                />
                            </View>
                        </TouchableOpacity>

                        <Text style={[styles.scoreTextMain, { color: homeColors.textPrimary }]}>
                            {match?.score?.home ?? match?.home_score ?? match?.homeScore ?? 0}:{match?.score?.away ?? match?.away_score ?? match?.awayScore ?? 0}
                        </Text>

                        <TouchableOpacity
                            style={styles.teamBlockLeft}
                            activeOpacity={0.7}
                            onPress={() => {
                                const aId = match?.awayTeamId || match?.away_team_id || match?.awayTeam?.id || match?.awayTeam?._id;
                                if (aId) {
                                    navigation.navigate('TeamProfile', { teamId: aId });
                                }
                            }}
                        >
                            <View style={[styles.logoCircle, { backgroundColor: homeColors.surface, borderColor: homeColors.border }]}>
                                <SmartImage
                                    uri={match?.awayTeamLogo || match?.awayTeam?.logo || match?.away_team_logo || match?.away_team?.logo_url}
                                    style={{ width: 34, height: 34, borderRadius: 17 }}
                                    contentFit="contain"
                                    fallbackIcon="shield"
                                    fallbackIconSize={20}
                                />
                            </View>
                            <Text style={[styles.teamNameText, { color: homeColors.textPrimary }]} numberOfLines={1}>
                                {(formatShortTeamName(match?.awayTeamName || match?.awayTeam?.name || 'JAMOA B', 12) || 'JAMOA B').toUpperCase()}
                            </Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.locationRow}>
                        <Ionicons name="location-outline" size={14} color={homeColors.textSecondary} />
                        <Text style={[styles.locationText, { color: homeColors.textSecondary }]}>{localizedVenue.toUpperCase()}</Text>
                    </View>
                </View>
            </View>
        );
    };

    const TAB_WIDTH = width / 5;
    const DEFAULT_INDICATOR_WIDTH = TAB_WIDTH * 0.72;
    const tabIndicatorInputRange = [0, width, width * 2, width * 3, width * 4];
    // So'z uzunligiga qarab moslashadigan indikator: har bir tab matnining haqiqiy
    // o'lchamini onLayout orqali o'lchab, indikatorni shunga moslab chizamiz.
    const indicatorWidths = MATCH_TABS.map((_, i) => tabLabelWidths[i] ?? DEFAULT_INDICATOR_WIDTH);
    const indicatorLefts = MATCH_TABS.map((_, i) => i * TAB_WIDTH + (TAB_WIDTH - indicatorWidths[i]) / 2);

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

    const handleMatchTabPress = async (index: number) => {
        if (index === currentTabIndexRef.current) return;
        try {
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        } catch (e) {}
        isPagerScrolling.current = true;
        currentTabIndexRef.current = index;
        setCurrentTabIndex(index);
        setActiveTab(MATCH_TABS[index].key);
        pagerScrollRef.current?.scrollTo({
            x: index * width,
            animated: false,
        });
        requestAnimationFrame(() => {
            isPagerScrolling.current = false;
        });
    };

    const handlePagerMomentumScrollEnd = (e: any) => {
        const offsetX = e.nativeEvent.contentOffset.x;
        const newIdx = Math.max(0, Math.min(MATCH_TABS.length - 1, Math.round(offsetX / width)));
        if (newIdx !== currentTabIndexRef.current) {
            currentTabIndexRef.current = newIdx;
            setCurrentTabIndex(newIdx);
            setActiveTab(MATCH_TABS[newIdx].key);
            try {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            } catch (e) {}
        }
        isPagerScrolling.current = false;
    };

    // Eng birinchi tabda (index 0 — 'overview'/Obzor) turib o'ngga (forward) surilganda sahifani
    // tark etish (navigation.goBack()). Bu tab pager'dagi ENG BIRINCHI (index 0) sahifa bo'lgani
    // uchun, o'ngga qat'iy harakatda gesture pager'dan olinadi va ekran yopiladi.
    const matchDetailExitPanResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponderCapture: () => false,
            onMoveShouldSetPanResponderCapture: (_, gestureState) => {
                if (currentTabIndexRef.current !== 0) return false;
                return gestureState.dx > 14 && Math.abs(gestureState.dx) > Math.abs(gestureState.dy) * 1.5;
            },
            onPanResponderMove: () => {},
            onPanResponderRelease: (_, gestureState) => {
                if (currentTabIndexRef.current === 0 && (gestureState.dx > 70 || gestureState.vx > 0.5)) {
                    try {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    } catch (e) {}
                    navigation.goBack();
                }
            },
            onPanResponderTerminationRequest: () => true,
        })
    ).current;

    const renderTabs = () => (
        <View style={[styles.tabsContainer, { backgroundColor: homeColors.background, borderBottomColor: homeColors.border }]}>
            {/* Real-time Smooth Sliding Active Underline */}
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
                {MATCH_TABS.map((tabItem, idx) => {
                    const isTabActive = currentTabIndex === idx;
                    return (
                        <TouchableOpacity
                            key={tabItem.key}
                            style={styles.tabEqual}
                            onPress={() => handleMatchTabPress(idx)}
                            activeOpacity={0.7}
                        >
                            <Text
                                style={[styles.tabText, { color: homeColors.textSecondary }, isTabActive && { color: homeColors.textPrimary, fontWeight: '900' }]}
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
                                {t(tabItem.titleKey)}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </View>
        </View>
    );

    const renderTimelineEvent = (event: any, index: number, isLast: boolean) => {
        const eType = String(event.type || event.event_type || '').toLowerCase();
        const isYellow = eType.includes('yellow');
        const isRed = eType.includes('red');
        const isCard = isYellow || isRed;
        const isGoal = eType.includes('goal');
        const isAssist = eType.includes('assist');

        let title = 'VOQEA';
        let cardColor = homeColors.textPrimary;

        if (isGoal) {
            title = t('matches.event_goal');
        } else if (isYellow) {
            title = t('matches.event_yellow_card');
            cardColor = '#FACC15';
        } else if (isRed) {
            title = t('matches.event_red_card');
            cardColor = '#EF4444';
        } else if (isAssist) {
            title = t('matches.event_assist');
        }

        return (
            <View key={index} style={styles.timelineRow}>
                <View style={styles.timelineLeftColumn}>
                    {isCard ? (
                        <View style={[styles.cardIcon, { backgroundColor: cardColor, width: 14, height: 20, borderRadius: 3, marginVertical: 4 }]} />
                    ) : (
                        <Ionicons name={isGoal ? 'football' : 'shirt-outline'} size={22} color={isGoal ? '#00FF66' : Colors.primary} style={styles.timelineIcon} />
                    )}
                    <Text style={[styles.timelineTimeText, { color: homeColors.textSecondary }]}>{event.time || event.minute || 0}'</Text>
                    {!isLast && <View style={[styles.timelineLine, { backgroundColor: homeColors.border }]} />}
                </View>

                <View style={[styles.timelineEventCard, cardSurface]}>
                    <View style={styles.eventContentWrapper}>
                        <View style={{ flex: 1 }}>
                            <Text style={[styles.eventTitle, isYellow && { color: '#FACC15' }, isRed && { color: '#EF4444' }]}>{title}</Text>
                            <Text style={[styles.eventDesc, { color: homeColors.textPrimary }]}>{(event.playerName || event.player_name || t('teams.player_fallback', 'FUTBOLCHI')).toUpperCase()}</Text>
                        </View>
                        <View style={[styles.eventLogo, { backgroundColor: homeColors.surface }]}>
                            <Text style={[styles.eventLogoText, { color: homeColors.textSecondary }]}>
                                {event.isHomeTeam
                                    ? (currentLang === 'ru' ? 'ХОЗ' : currentLang === 'en' ? 'HM' : 'UY')
                                    : (currentLang === 'ru' ? 'ГОС' : currentLang === 'en' ? 'AW' : 'MH')}
                            </Text>
                        </View>
                    </View>
                </View>
            </View>
        );
    };

    const renderOverview = () => {
        if (match?.status === 'scheduled') {
            return (
                <View style={styles.notStartedContainer}>
                    <Text style={[styles.notStartedText, { color: homeColors.textSecondary }]}>{t('matches.not_started')}</Text>
                </View>
            );
        }

        const events = match?.events || [];

        return (
            <ScrollView 
                style={styles.tabContent} 
                contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor={Colors.primary}
                        colors={[Colors.primary]}
                    />
                }
            >
                {events.length > 0 ? (
                    events.map((ev: any, idx: number) => renderTimelineEvent(ev, idx, idx === events.length - 1))
                ) : (
                    <View style={styles.notStartedContainer}>
                        <Text style={[styles.notStartedText, { color: homeColors.textSecondary }]}>{t('match_detail.no_events')}</Text>
                    </View>
                )}
            </ScrollView>
        );
    };

    const renderPreview = () => {
        const homeName = match?.homeTeamName || match?.homeTeam?.name || 'UY JAMOA';
        const awayName = match?.awayTeamName || match?.awayTeam?.name || 'MEHMON';
        const homeLogo = match?.homeTeamLogo || match?.homeTeam?.logo;
        const awayLogo = match?.awayTeamLogo || match?.awayTeam?.logo;
        const leagueName = match?.tournamentName || match?.league || "HFL Liga";
        const venueName = match?.venue || match?.location || 'Amatora Arena';

        const displayHomeForm = homeForm.length > 0 ? homeForm : (match?.homeForm || ['W', 'W', 'D', 'L', 'W']);
        const displayAwayForm = awayForm.length > 0 ? awayForm : (match?.awayForm || ['W', 'D', 'W', 'W', 'L']);

        const homeKeyPlayer = homePlayers[0];
        const awayKeyPlayer = awayPlayers[0];

        return (
            <ScrollView 
                style={styles.tabContent} 
                contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor={Colors.primary}
                        colors={[Colors.primary]}
                    />
                }
            >
                {/* 1. Pre-Match Overview Header */}
                <View style={[styles.previewSectionCard, cardSurface]}>
                    <View style={{ padding: 16 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                            <Ionicons name="information-circle-outline" size={20} color={Colors.primary} style={{ marginRight: 8 }} />
                            <Text style={[styles.previewSectionTitle, { color: homeColors.textPrimary }]}>{t('match_detail.about_match')}</Text>
                        </View>
                        <View style={[styles.previewInfoRow, { borderBottomColor: homeColors.border }]}>
                            <Text style={[styles.previewInfoLabel, { color: homeColors.textSecondary }]}>{t('match_detail.tournament_league')}</Text>
                            <Text style={[styles.previewInfoVal, { color: homeColors.textPrimary }]}>{leagueName}</Text>
                        </View>
                        <View style={[styles.previewInfoRow, { borderBottomColor: homeColors.border }]}>
                            <Text style={[styles.previewInfoLabel, { color: homeColors.textSecondary }]}>{t('match_detail.round_stage')}</Text>
                            <Text style={[styles.previewInfoVal, { color: homeColors.textPrimary }]}>{match?.round ? t('matches.round_tour', { round: match.round }) : '—'}</Text>
                        </View>
                        <View style={[styles.previewInfoRow, { borderBottomColor: homeColors.border }]}>
                            <Text style={[styles.previewInfoLabel, { color: homeColors.textSecondary }]}>{t('match_detail.date_time')}</Text>
                            <Text style={[styles.previewInfoVal, { color: homeColors.textPrimary }]}>{formatDate(match?.date)}</Text>
                        </View>
                        <View style={[styles.previewInfoRow, { borderBottomColor: homeColors.border }]}>
                            <Text style={[styles.previewInfoLabel, { color: homeColors.textSecondary }]}>{t('match_detail.venue')}</Text>
                            <Text style={[styles.previewInfoVal, { color: homeColors.textPrimary }]}>{formatLocalizedVenue(venueName, currentLang)}</Text>
                        </View>
                    </View>
                </View>

                {/* 2. Team Form Guide */}
                <View style={[styles.previewSectionCard, cardSurface]}>
                    <View style={{ padding: 16 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                            <Ionicons name="analytics-outline" size={20} color={Colors.primary} style={{ marginRight: 8 }} />
                            <Text style={[styles.previewSectionTitle, { color: homeColors.textPrimary }]}>{t('match_detail.team_form')}</Text>
                        </View>

                        {/* Home Team Form */}
                        <View style={{ marginBottom: 16 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                                {homeLogo && <Image source={{ uri: homeLogo }} style={{ width: 20, height: 20, marginRight: 8, resizeMode: 'contain' }} />}
                                <Text style={[styles.teamFormTitle, { color: homeColors.textPrimary }]} numberOfLines={1}>{homeName.toUpperCase()}</Text>
                            </View>
                            <View style={{ flexDirection: 'row', gap: 6 }}>
                                {displayHomeForm.map((res: string, idx: number) => (
                                    <View
                                        key={idx}
                                        style={[
                                            styles.formBadge,
                                            { backgroundColor: homeColors.surface, borderWidth: 1, borderColor: homeColors.border },
                                            res === 'W' && styles.formBadgeWin,
                                            res === 'D' && styles.formBadgeDraw,
                                            res === 'L' && styles.formBadgeLoss
                                        ]}
                                    >
                                        <Text style={[styles.formBadgeText, { color: homeColors.textPrimary }]}>{res}</Text>
                                    </View>
                                ))}
                            </View>
                        </View>

                        {/* Away Team Form */}
                        <View>
                            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                                {awayLogo && <Image source={{ uri: awayLogo }} style={{ width: 20, height: 20, marginRight: 8, resizeMode: 'contain' }} />}
                                <Text style={[styles.teamFormTitle, { color: homeColors.textPrimary }]} numberOfLines={1}>{awayName.toUpperCase()}</Text>
                            </View>
                            <View style={{ flexDirection: 'row', gap: 6 }}>
                                {displayAwayForm.map((res: string, idx: number) => (
                                    <View
                                        key={idx}
                                        style={[
                                            styles.formBadge,
                                            { backgroundColor: homeColors.surface, borderWidth: 1, borderColor: homeColors.border },
                                            res === 'W' && styles.formBadgeWin,
                                            res === 'D' && styles.formBadgeDraw,
                                            res === 'L' && styles.formBadgeLoss
                                        ]}
                                    >
                                        <Text style={[styles.formBadgeText, { color: homeColors.textPrimary }]}>{res}</Text>
                                    </View>
                                ))}
                            </View>
                        </View>
                    </View>
                </View>

                {/* 2.5 Head to Head (H2H) History Cards */}
                <View style={[styles.previewSectionCard, cardSurface]}>
                    <View style={{ padding: 16 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                            <Ionicons name="time-outline" size={20} color={Colors.primary} style={{ marginRight: 8 }} />
                            <Text style={[styles.previewSectionTitle, { color: homeColors.textPrimary }]}>{t('match_detail.h2h_history')}</Text>
                        </View>

                        {h2hMatches.length > 0 ? (
                            h2hMatches.map((m: any, idx: number) => {
                                const hId = match?.homeTeamId || match?.home_team_id || match?.homeTeam?.id || match?.homeTeam?._id;
                                const isHomeHId = String(m.home_team_id) === String(hId);
                                const hName = isHomeHId ? homeName : awayName;
                                const aName = isHomeHId ? awayName : homeName;
                                const hLogo = isHomeHId ? homeLogo : awayLogo;
                                const aLogo = isHomeHId ? awayLogo : homeLogo;
                                
                                const rawDate = m.date || m.match_date || m.created_at;
                                const dateStr = formatLocalizedDate(rawDate, currentLang);
                                const tourText = m.round 
                                    ? t('matches.round_tour', { round: m.round }) 
                                    : (m.tour ? t('matches.round_tour', { round: m.tour }) : 'Guruh');
                                const venueStr = formatLocalizedVenue(m.venue || m.location || 'Amatora Arena', currentLang);

                                let seasonStr = m.season || m.season_name || m.tournament_season;
                                if (!seasonStr) seasonStr = "Amatora";

                                return (
                                    <TouchableOpacity
                                        key={m.id || idx}
                                        style={[styles.h2hMatchCard, { backgroundColor: homeColors.surface, borderColor: homeColors.border }]}
                                        onPress={() => navigation.navigate('MatchDetail', { matchId: m.id })}
                                        activeOpacity={0.8}
                                    >
                                        <View style={styles.h2hHeaderRow}>
                                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                                <View style={styles.h2hRoundBadge}>
                                                    <Text style={styles.h2hRoundText}>{tourText}</Text>
                                                </View>
                                                <View style={[styles.h2hSeasonBadge, { backgroundColor: homeColors.background, borderColor: homeColors.border }]}>
                                                    <Text style={[styles.h2hSeasonText, { color: homeColors.textSecondary }]}>{seasonStr}</Text>
                                                </View>
                                            </View>
                                            <Text style={[styles.h2hDateText, { color: homeColors.textSecondary }]}>{dateStr} • {venueStr}</Text>
                                        </View>

                                        <View style={styles.h2hScoreRow}>
                                            <View style={styles.h2hTeamCol}>
                                                <SmartImage uri={hLogo} style={styles.h2hTeamLogo} contentFit="contain" fallbackIcon="shield-outline" />
                                                <Text style={[styles.h2hTeamName, { color: homeColors.textPrimary }]} numberOfLines={1}>{hName}</Text>
                                            </View>

                                            <View style={[styles.h2hScoreBox, { backgroundColor: homeColors.background }]}>
                                                <Text style={[styles.h2hScoreText, { color: homeColors.textPrimary }]}>{m.home_score ?? 0} : {m.away_score ?? 0}</Text>
                                            </View>

                                            <View style={styles.h2hTeamCol}>
                                                <SmartImage uri={aLogo} style={styles.h2hTeamLogo} contentFit="contain" fallbackIcon="shield-outline" />
                                                <Text style={[styles.h2hTeamName, { color: homeColors.textPrimary }]} numberOfLines={1}>{aName}</Text>
                                            </View>
                                        </View>
                                    </TouchableOpacity>
                                );
                            })
                        ) : (
                            <View style={styles.h2hEmptyBox}>
                                <Ionicons name="information-circle-outline" size={24} color={homeColors.textSecondary} />
                                <Text style={[styles.h2hEmptyText, { color: homeColors.textSecondary }]}>{t('match_detail.h2h_empty')}</Text>
                            </View>
                        )}
                    </View>
                </View>

                {/* 3. Key Players / Top Goalscorers Spotlight */}
                {(homeKeyPlayer || awayKeyPlayer) && (
                    <View style={[styles.previewSectionCard, cardSurface]}>
                        <View style={{ padding: 16 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                                <Ionicons name="trophy-outline" size={20} color={Colors.primary} style={{ marginRight: 8 }} />
                                <Text style={[styles.previewSectionTitle, { color: homeColors.textPrimary }]}>{t('match_detail.key_players_spotlight')}</Text>
                            </View>

                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
                                {homeKeyPlayer && (
                                    <TouchableOpacity
                                        style={[styles.keyPlayerBox, { backgroundColor: homeColors.surface, borderColor: homeColors.border }]}
                                        onPress={() => navigation.navigate('PlayerStats', { player: homeKeyPlayer, playerId: homeKeyPlayer._id || homeKeyPlayer.id })}
                                    >
                                        <Image
                                            source={{ uri: homeKeyPlayer.photo || homeKeyPlayer.photo_url || homeKeyPlayer.avatar || 'https://via.placeholder.com/60' }}
                                            style={styles.keyPlayerAvatar}
                                        />
                                        <Text style={[styles.keyPlayerName, { color: homeColors.textPrimary }]} numberOfLines={1}>{`${homeKeyPlayer.firstName || homeKeyPlayer.first_name || ''} ${homeKeyPlayer.lastName || homeKeyPlayer.last_name || ''}`.trim()}</Text>
                                        <Text style={styles.keyPlayerRole}>{homeName}</Text>
                                        <View style={{ marginTop: 6, backgroundColor: 'rgba(0, 255, 135, 0.12)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(0, 255, 135, 0.3)' }}>
                                            <Text style={{ color: '#00FF87', fontSize: 10, fontWeight: '900' }}>
                                                {t('match_detail.goals_count', { count: homeKeyPlayer.goalCount || 0 })}
                                            </Text>
                                        </View>
                                    </TouchableOpacity>
                                )}

                                {awayKeyPlayer && (
                                    <TouchableOpacity
                                        style={[styles.keyPlayerBox, { backgroundColor: homeColors.surface, borderColor: homeColors.border }]}
                                        onPress={() => navigation.navigate('PlayerStats', { player: awayKeyPlayer, playerId: awayKeyPlayer._id || awayKeyPlayer.id })}
                                    >
                                        <Image
                                            source={{ uri: awayKeyPlayer.photo || awayKeyPlayer.photo_url || awayKeyPlayer.avatar || 'https://via.placeholder.com/60' }}
                                            style={styles.keyPlayerAvatar}
                                        />
                                        <Text style={[styles.keyPlayerName, { color: homeColors.textPrimary }]} numberOfLines={1}>{`${awayKeyPlayer.firstName || awayKeyPlayer.first_name || ''} ${awayKeyPlayer.lastName || awayKeyPlayer.last_name || ''}`.trim()}</Text>
                                        <Text style={styles.keyPlayerRole}>{awayName}</Text>
                                        <View style={{ marginTop: 6, backgroundColor: 'rgba(0, 255, 135, 0.12)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(0, 255, 135, 0.3)' }}>
                                            <Text style={{ color: '#00FF87', fontSize: 10, fontWeight: '900' }}>
                                                {t('match_detail.goals_count', { count: awayKeyPlayer.goalCount || 0 })}
                                            </Text>
                                        </View>
                                    </TouchableOpacity>
                                )}
                            </View>
                        </View>
                    </View>
                )}
            </ScrollView>
        );
    };

    const renderLineups = () => {
        const isHome = selectedTeamId === match?.homeTeamId;
        const currentPlayers = isHome ? homePlayers : awayPlayers;
        const currentTeamName = isHome ? (match?.homeTeamName || 'UY JAMOA') : (match?.awayTeamName || 'MEHMON');
        const currentLogo = isHome ? (match?.homeTeamLogo || match?.homeTeam?.logo) : (match?.awayTeamLogo || match?.awayTeam?.logo);

        const targetTeamObject = isHome ? match?.homeTeam : match?.awayTeam;
        const rawFormationPlayers = targetTeamObject?.formation?.players || targetTeamObject?.players || [];

        let tacticsPlayers: any[] = [];

        if (rawFormationPlayers && rawFormationPlayers.length > 0) {
            tacticsPlayers = rawFormationPlayers.map((p: any) => {
                const playerId = p.id || p._id;
                const playerGoals = (match?.events || []).filter((e: any) => e.playerId === playerId && e.type === 'goal').length;
                const fullPlayer = currentPlayers.find((cp: any) => String(cp._id || cp.id) === String(playerId));
                return {
                    ...p,
                    id: playerId,
                    name: p.name || `${fullPlayer?.firstName || ''} ${fullPlayer?.lastName || ''}`.trim() || 'O\'yinchi',
                    number: p.number || fullPlayer?.number || fullPlayer?.player_number || '-',
                    photo: p.photo || p.photo_url || fullPlayer?.photo || fullPlayer?.photo_url || fullPlayer?.avatar || null,
                    goals: playerGoals,
                    x: p.x || 50,
                    y: p.y || 50
                };
            });
        } else if (currentPlayers && currentPlayers.length > 0) {
            const defaultCoords = [
                { x: 50, y: 88 },
                { x: 20, y: 70 }, { x: 40, y: 72 }, { x: 60, y: 72 }, { x: 80, y: 70 },
                { x: 30, y: 45 }, { x: 50, y: 45 }, { x: 70, y: 45 },
                { x: 25, y: 20 }, { x: 50, y: 18 }, { x: 75, y: 20 }
            ];
            tacticsPlayers = currentPlayers.slice(0, 11).map((p: any, idx: number) => ({
                id: p._id || p.id,
                name: p.firstName || p.first_name || p.name || 'O\'yinchi',
                number: p.number || p.player_number || p.shirt_number || '-',
                photo: p.photo || p.photo_url || p.avatar || null,
                goals: (match?.events || []).filter((e: any) => e.playerId === (p._id || p.id) && e.type === 'goal').length,
                x: defaultCoords[idx % defaultCoords.length].x,
                y: defaultCoords[idx % defaultCoords.length].y
            }));
        }

        const renderPlayerItem = (player: any) => {
            const pId = String(player._id || player.id || '');
            const pNameClean = `${player.firstName || player.first_name || ''} ${player.lastName || player.last_name || ''}`.trim().toLowerCase();

            const formPlayer = tacticsPlayers.find((tp: any) => String(tp.id) === pId);
            const displayNum = formPlayer?.number || player.number || player.player_number || player.shirt_number || '-';

            const events = match?.events || [];
            const playerEvents = events.filter((e: any) => {
                const evPlayerId = String(e.playerId || e.player_id || e.player?.id || e.player?._id || '');
                if (evPlayerId && pId && evPlayerId === pId) return true;
                const evName = String(e.playerName || e.player_name || '').trim().toLowerCase();
                if (evName && pNameClean && (evName.includes(pNameClean) || pNameClean.includes(evName))) return true;
                return false;
            });

            const goalsCount = playerEvents.filter((e: any) => {
                const t = String(e.type || e.rawType || e.event_type || '').toLowerCase();
                return t.includes('goal');
            }).length;

            const assistsCount = playerEvents.filter((e: any) => {
                const t = String(e.type || e.rawType || e.event_type || '').toLowerCase();
                return t.includes('assist');
            }).length;

            const yellowCount = playerEvents.filter((e: any) => {
                const t = String(e.type || e.rawType || e.event_type || '').toLowerCase();
                return t.includes('yellow');
            }).length;

            const redCount = playerEvents.filter((e: any) => {
                const t = String(e.type || e.rawType || e.event_type || '').toLowerCase();
                return t.includes('red');
            }).length;

            const photoUri = player.photo || player.photo_url || player.avatar;

            return (
                <TouchableOpacity
                    key={player._id || player.id}
                    style={[styles.playerCardCompact, cardSurface]}
                    onPress={() => navigation.navigate('PlayerStats', { player: player, playerId: player._id || player.id })}
                >
                    <View style={{ flexDirection: 'row', alignItems: 'center', padding: 12, width: '100%' }}>
                        <View style={[styles.playerAvatarSmall, { backgroundColor: homeColors.surface }]}>
                            {photoUri ? (
                                <Image source={{ uri: photoUri }} style={{ width: 44, height: 44, borderRadius: 22 }} />
                            ) : (
                                <View style={styles.playerInitials}>
                                    <Text style={[styles.initialsText, { color: homeColors.textSecondary }]}>{(player.firstName || player.first_name || 'F').charAt(0)}</Text>
                                </View>
                            )}
                        </View>

                        <View style={styles.playerInfoCompact}>
                            <Text style={[styles.playerNameCompact, { color: homeColors.textPrimary }]} numberOfLines={1}>
                                {`${player.firstName || player.first_name || ''} ${player.lastName || player.last_name || ''}`.trim().toUpperCase()}
                            </Text>
                            <Text style={[styles.playerNumberCompact, { color: homeColors.textSecondary }]}>#{displayNum} • {(player.positionUz || player.position || 'O\'YINCHI').toUpperCase()}</Text>
                        </View>

                        {/* Match Event Badges */}
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginRight: 6 }}>
                            {goalsCount > 0 && (
                                <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,255,102,0.12)', paddingHorizontal: 6, paddingVertical: 3, borderRadius: 6, borderWidth: 1, borderColor: 'rgba(0,255,102,0.3)' }}>
                                    <Ionicons name="football" size={14} color="#00FF66" />
                                    <Text style={{ color: '#00FF66', fontSize: 12, fontWeight: '700', marginLeft: 3 }}>x{goalsCount}</Text>
                                </View>
                            )}
                            {assistsCount > 0 && (
                                <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(59,130,246,0.12)', paddingHorizontal: 6, paddingVertical: 3, borderRadius: 6, borderWidth: 1, borderColor: 'rgba(59,130,246,0.3)' }}>
                                    <Ionicons name="footsteps" size={13} color="#3B82F6" />
                                    <Text style={{ color: '#3B82F6', fontSize: 12, fontWeight: '700', marginLeft: 3 }}>x{assistsCount}</Text>
                                </View>
                            )}
                            {yellowCount > 0 && (
                                <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(250,204,21,0.12)', paddingHorizontal: 6, paddingVertical: 3, borderRadius: 6, borderWidth: 1, borderColor: 'rgba(250,204,21,0.4)' }}>
                                    <View style={{ width: 10, height: 14, backgroundColor: '#FACC15', borderRadius: 2, marginRight: 3 }} />
                                    {yellowCount > 1 && <Text style={{ color: '#FACC15', fontSize: 12, fontWeight: '700' }}>x{yellowCount}</Text>}
                                </View>
                            )}
                            {redCount > 0 && (
                                <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(239,68,68,0.12)', paddingHorizontal: 6, paddingVertical: 3, borderRadius: 6, borderWidth: 1, borderColor: 'rgba(239,68,68,0.4)' }}>
                                    <View style={{ width: 10, height: 14, backgroundColor: '#EF4444', borderRadius: 2, marginRight: 3 }} />
                                    {redCount > 1 && <Text style={{ color: '#EF4444', fontSize: 12, fontWeight: '700' }}>x{redCount}</Text>}
                                </View>
                            )}
                        </View>

                        <Ionicons name="chevron-forward" size={16} color={homeColors.textSecondary} />
                    </View>
                </TouchableOpacity>
            );
        };

        return (
            <ScrollView 
                style={styles.tabContent} 
                contentContainerStyle={{ paddingBottom: 100 }}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor={Colors.primary}
                        colors={[Colors.primary]}
                    />
                }
            >
                <View style={[styles.carouselContainer, { backgroundColor: homeColors.background }]}>
                    <View style={styles.animatedCardWrapper}>
                        <Animated.View style={[
                            styles.teamCarouselCard,
                            cardSurface,
                            { transform: [{ translateX: slideAnim }] }
                        ]}>
                            <View style={styles.compactTeamInfo}>
                                <View style={[styles.miniLogoBox, { backgroundColor: homeColors.surface }]}>
                                    {currentLogo ? (
                                        <Image source={{ uri: currentLogo }} style={{ width: 32, height: 32 }} />
                                    ) : (
                                        <Ionicons name="shield" size={20} color={Colors.primary} />
                                    )}
                                </View>
                                <View style={{ flex: 1, marginLeft: 10 }}>
                                    <Text style={styles.miniTeamType}>{t('match_detail.selected_team')}</Text>
                                    <Text style={[styles.miniTeamName, { color: homeColors.textPrimary }]} numberOfLines={1}>{currentTeamName.toUpperCase()}</Text>
                                </View>
                            </View>
                        </Animated.View>
                    </View>

                    <TouchableOpacity onPress={switchTeam} style={[styles.navArrowBtnOneSide, cardSurface]}>
                        <Ionicons name="swap-horizontal" size={22} color={Colors.primary} />
                    </TouchableOpacity>
                </View>

                {playersLoading ? (
                    <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 40 }} />
                ) : (
                    <View style={styles.lineupListWrapper}>
                        {tacticsPlayers.length > 0 && (
                            <View style={[styles.tacticsSectionCard, cardSurface, { marginBottom: 20 }]}>
                                <TacticsBoard
                                    players={tacticsPlayers}
                                    teamColor={isHome ? '#3B82F6' : '#EF4444'}
                                />
                            </View>
                        )}

                        <View style={styles.listHeader}>
                            <Ionicons name="shirt-outline" size={18} color={Colors.primary} style={{ marginRight: 6 }} />
                            <Text style={[styles.listTitle, { color: homeColors.textPrimary }]}>
                                {t('match_detail.team_lineup_count', { team: currentTeamName.toUpperCase(), count: currentPlayers.length })}
                            </Text>
                        </View>

                        {currentPlayers.length > 0 ? (
                            currentPlayers.map(renderPlayerItem)
                        ) : (
                            <View style={styles.emptyPlayersBox}>
                                <Ionicons name="people-outline" size={40} color={homeColors.textSecondary} />
                                <Text style={[styles.emptyPlayersText, { color: homeColors.textSecondary }]}>{t('match_detail.no_lineup_players')}</Text>
                            </View>
                        )}
                    </View>
                )}
            </ScrollView>
        );
    };

    const renderMedia = () => {
        const videoUrl = match?.youtube_link || match?.youtubeLink || match?.youtube_url || match?.youtubeUrl || match?.video_url || match?.videoUrl || match?.video || match?.stream_link || match?.streamUrl;
        
        // Filter events that have replay videos and sort by minute DESC (latest goal first)
        const replayEvents = (match?.events || [])
            .filter((e: any) => e.replay_video_url || e.video_url || e.replay_url)
            .sort((a: any, b: any) => (Number(b.minute) || 0) - (Number(a.minute) || 0));

        // Additional storage replay clips from storage bucket replays/<org_id>/<match_id>/
        const extraStorageClips = (match?.storageReplays || []).filter((s: any) => 
            !replayEvents.some((ev: any) => (ev.replay_video_url || '').includes(s.name))
        );

        const hasAnyReplays = replayEvents.length > 0 || extraStorageClips.length > 0;

        return (
            <ScrollView 
                style={styles.tabContent} 
                contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor={Colors.primary}
                        colors={[Colors.primary]}
                    />
                }
            >
                {/* 1. YouTube Online Stream */}
                {videoUrl && (
                    <View style={{ width: '100%', alignItems: 'center', marginBottom: 20 }}>
                        <YoutubePlayerCard videoUrl={videoUrl} />
                        <TouchableOpacity
                            style={styles.openYtLinkBtn}
                            activeOpacity={0.8}
                            onPress={() => Linking.openURL(videoUrl).catch(() => {})}
                        >
                            <Ionicons name="logo-youtube" size={20} color="#FF0000" style={{ marginRight: 8 }} />
                            <Text style={[styles.openYtLinkText, { color: homeColors.textPrimary }]}>{t('match_detail.watch_on_youtube')}</Text>
                            <Ionicons name="open-outline" size={16} color={homeColors.textSecondary} style={{ marginLeft: 'auto' }} />
                        </TouchableOpacity>
                    </View>
                )}

                {/* 2. 20s Goal & Replay Clips Feed */}
                <View style={{ marginTop: 10, width: '100%' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 8 }}>
                        <Ionicons name="videocam-outline" size={22} color={Colors.primary || '#7c3aed'} />
                        <Text style={{ color: homeColors.textPrimary, fontSize: 16, fontWeight: '800' }}>
                            {t('match_detail.match_highlights_replays')}
                        </Text>
                    </View>

                    {hasAnyReplays ? (
                        <>
                            {replayEvents.map((ev: any, idx: number) => {
                                const isHome = ev.team_id ? (ev.team_id === (match?.homeTeamId || match?.home_team_id)) : ev.isHomeTeam;
                                const currentTeamName = ev.team_name || (isHome ? (match?.homeTeamName || match?.home_team?.name) : (match?.awayTeamName || match?.away_team?.name));
                                const currentTeamLogo = isHome ? (match?.homeTeamLogo || match?.home_team?.logo_url) : (match?.awayTeamLogo || match?.away_team?.logo_url);
                                const scorer = ev.player_name || (ev.player ? `${ev.player.first_name || ''} ${ev.player.last_name || ''}`.trim() : null);
                                const scorerPhoto = ev.player_photo || ev.player?.photo_url || ev.player?.photo || ev.player?.avatar || null;
                                const assistant = ev.assist_player_name || (ev.assistant ? `${ev.assistant.first_name || ''} ${ev.assistant.last_name || ''}`.trim() : null);
                                const assistantPhoto = ev.assist_player_photo || ev.assistant?.photo_url || ev.assistant?.photo || null;
                                const videoKey = ev.id || `replay_event_${idx}`;

                                return (
                                    <ReplayVideoCard
                                        key={videoKey}
                                        id={videoKey}
                                        videoUrl={ev.replay_video_url || ev.video_url || ev.replay_url}
                                        minute={ev.minute}
                                        teamName={currentTeamName}
                                        teamLogo={currentTeamLogo}
                                        scorerName={scorer}
                                        scorerPhoto={scorerPhoto}
                                        assistantName={assistant}
                                        assistantPhoto={assistantPhoto}
                                        eventType={ev.event_type || ev.type || 'goal'}
                                        activePlayingId={activePlayingVideoId}
                                        onPlay={(vId) => setActivePlayingVideoId(vId)}
                                        onPause={() => setActivePlayingVideoId(null)}
                                    />
                                );
                            })}

                            {/* Bazadagi hech bir gol voqeasiga bog'lanmagan, lekin storage'da
                                mavjud qo'shimcha video parchalari — qaysi golga tegishli ekani
                                noma'lum bo'lgani uchun daqiqa/muallif TAXMIN QILINMAYDI. */}
                            {extraStorageClips.map((clip: any, idx: number) => {
                                const storageKey = clip.id || `storage_${idx}`;
                                return (
                                    <ReplayVideoCard
                                        key={storageKey}
                                        id={storageKey}
                                        videoUrl={clip.publicUrl}
                                        scorerName="Qo'shimcha video"
                                        eventType="goal"
                                        activePlayingId={activePlayingVideoId}
                                        onPlay={(vId) => setActivePlayingVideoId(vId)}
                                        onPause={() => setActivePlayingVideoId(null)}
                                    />
                                );
                            })}
                        </>
                    ) : (
                        <View style={styles.placeholderContainer}>
                            <Ionicons name="film-outline" size={42} color={homeColors.textSecondary} />
                            <Text style={[styles.placeholderText, { color: homeColors.textSecondary }]}>{t('match_detail.replays_placeholder')}</Text>
                        </View>
                    )}
                </View>
            </ScrollView>
        );
    };

    const renderStaff = () => {
        const refereeName = match?.referee || match?.referee_name || match?.main_referee || "Rasmiy Hakam (HFL)";
        const assistant1 = match?.assistant_referee_1 || match?.linesman_1 || "Yo'l-yo'riq Hakami 1";
        const assistant2 = match?.assistant_referee_2 || match?.linesman_2 || "Yo'l-yo'riq Hakami 2";
        const commissioner = match?.commissioner || match?.inspector || "HFL Maydon Inspektori";

        const homeCaptain = match?.homeTeam?.captain_name || match?.home_team_captain || (homePlayers[0] ? `${homePlayers[0].firstName || homePlayers[0].first_name || ''} ${homePlayers[0].lastName || homePlayers[0].last_name || ''}`.trim() : "Menejer / Sardor");
        const awayCaptain = match?.awayTeam?.captain_name || match?.away_team_captain || (awayPlayers[0] ? `${awayPlayers[0].firstName || awayPlayers[0].first_name || ''} ${awayPlayers[0].lastName || awayPlayers[0].last_name || ''}`.trim() : "Menejer / Sardor");

        return (
            <ScrollView 
                style={styles.tabContent} 
                contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor={Colors.primary}
                        colors={[Colors.primary]}
                    />
                }
            >
                {/* 1. Hakamlar Brigadasi */}
                <View style={[styles.staffSectionCard, cardSurface]}>
                    <View style={{ padding: 16 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                            <Ionicons name="ribbon-outline" size={22} color={Colors.primary} style={{ marginRight: 8 }} />
                            <Text style={[styles.staffSectionTitle, { color: homeColors.textPrimary }]}>{t('match_detail.referees_brigade')}</Text>
                        </View>

                        {/* Main Referee */}
                        <View style={[styles.staffItemRow, { borderBottomColor: homeColors.border }]}>
                            <View style={[styles.staffIconCircle, { backgroundColor: 'rgba(250, 204, 21, 0.15)' }]}>
                                <Ionicons name="shirt-outline" size={20} color="#FACC15" />
                            </View>
                            <View style={{ flex: 1, marginLeft: 12 }}>
                                <Text style={[styles.staffItemRole, { color: homeColors.textSecondary }]}>{t('match_detail.main_referee')}</Text>
                                <Text style={[styles.staffItemName, { color: homeColors.textPrimary }]}>{refereeName.toUpperCase()}</Text>
                            </View>
                        </View>

                        {/* Assistant 1 */}
                        <View style={[styles.staffItemRow, { borderBottomColor: homeColors.border }]}>
                            <View style={[styles.staffIconCircle, { backgroundColor: homeColors.surface }]}>
                                <Ionicons name="flag-outline" size={18} color={Colors.primary} />
                            </View>
                            <View style={{ flex: 1, marginLeft: 12 }}>
                                <Text style={[styles.staffItemRole, { color: homeColors.textSecondary }]}>{t('match_detail.linesman_1')}</Text>
                                <Text style={[styles.staffItemName, { color: homeColors.textPrimary }]}>{assistant1.toUpperCase()}</Text>
                            </View>
                        </View>

                        {/* Assistant 2 */}
                        <View style={[styles.staffItemRow, { borderBottomWidth: 0 }]}>
                            <View style={[styles.staffIconCircle, { backgroundColor: homeColors.surface }]}>
                                <Ionicons name="flag-outline" size={18} color={Colors.primary} />
                            </View>
                            <View style={{ flex: 1, marginLeft: 12 }}>
                                <Text style={[styles.staffItemRole, { color: homeColors.textSecondary }]}>{t('match_detail.linesman_2')}</Text>
                                <Text style={[styles.staffItemName, { color: homeColors.textPrimary }]}>{assistant2.toUpperCase()}</Text>
                            </View>
                        </View>
                    </View>
                </View>

                {/* 2. Jamoa Shtabi va Menejerlar */}
                <View style={[styles.staffSectionCard, cardSurface]}>
                    <View style={{ padding: 16 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                            <Ionicons name="people-outline" size={22} color={Colors.primary} style={{ marginRight: 8 }} />
                            <Text style={[styles.staffSectionTitle, { color: homeColors.textPrimary }]}>{t('match_detail.managers_captains')}</Text>
                        </View>

                        {/* Home Manager */}
                        <View style={[styles.staffItemRow, { borderBottomColor: homeColors.border }]}>
                            <View style={[styles.staffIconCircle, { backgroundColor: homeColors.surface }]}>
                                <Ionicons name="briefcase-outline" size={18} color="#3B82F6" />
                            </View>
                            <View style={{ flex: 1, marginLeft: 12 }}>
                                <Text style={[styles.staffItemRole, { color: homeColors.textSecondary }]}>
                                    {t('match_detail.team_captain', { team: (match?.homeTeamName || 'UY JAMOA').toUpperCase() })}
                                </Text>
                                <Text style={[styles.staffItemName, { color: homeColors.textPrimary }]}>{homeCaptain.toUpperCase()}</Text>
                            </View>
                        </View>

                        {/* Away Manager */}
                        <View style={[styles.staffItemRow, { borderBottomWidth: 0 }]}>
                            <View style={[styles.staffIconCircle, { backgroundColor: homeColors.surface }]}>
                                <Ionicons name="briefcase-outline" size={18} color="#EF4444" />
                            </View>
                            <View style={{ flex: 1, marginLeft: 12 }}>
                                <Text style={[styles.staffItemRole, { color: homeColors.textSecondary }]}>
                                    {t('match_detail.team_captain', { team: (match?.awayTeamName || 'MEHMON JAMOA').toUpperCase() })}
                                </Text>
                                <Text style={[styles.staffItemName, { color: homeColors.textPrimary }]}>{awayCaptain.toUpperCase()}</Text>
                            </View>
                        </View>
                    </View>
                </View>

                {/* 3. Maydon Komissari */}
                <View style={[styles.staffSectionCard, cardSurface]}>
                    <View style={{ padding: 16 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                            <Ionicons name="shield-checkmark-outline" size={22} color={Colors.primary} style={{ marginRight: 8 }} />
                            <Text style={[styles.staffSectionTitle, { color: homeColors.textPrimary }]}>{t('match_detail.pitch_inspector')}</Text>
                        </View>

                        <View style={[styles.staffItemRow, { borderBottomWidth: 0 }]}>
                            <View style={[styles.staffIconCircle, { backgroundColor: homeColors.surface }]}>
                                <Ionicons name="person-circle-outline" size={20} color={Colors.primary} />
                            </View>
                            <View style={{ flex: 1, marginLeft: 12 }}>
                                <Text style={[styles.staffItemRole, { color: homeColors.textSecondary }]}>{t('match_detail.league_commissioner')}</Text>
                                <Text style={[styles.staffItemName, { color: homeColors.textPrimary }]}>{commissioner.toUpperCase()}</Text>
                            </View>
                        </View>
                    </View>
                </View>
            </ScrollView>
        );
    };

    if (loading && !match) {
        return <MatchDetailSkeleton />;
    }

    return (
        <View style={{ flex: 1, backgroundColor: homeColors.background }}>
            <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} translucent backgroundColor="transparent" />

            <SafeAreaView style={[styles.container, { backgroundColor: homeColors.background }]} edges={['top']}>
                {renderHeader()}
                {renderTabs()}

                {/* 1:1 Instagram-Style Real-Time Interactive Horizontal Pager */}
                <View style={{ flex: 1 }} {...matchDetailExitPanResponder.panHandlers}>
                <Animated.ScrollView
                    ref={pagerScrollRef}
                    horizontal
                    pagingEnabled
                    showsHorizontalScrollIndicator={false}
                    bounces={false}
                    scrollEventThrottle={16}
                    decelerationRate="fast"
                    onScroll={Animated.event(
                        [{ nativeEvent: { contentOffset: { x: scrollXPager } } }],
                        { useNativeDriver: false }
                    )}
                    onMomentumScrollEnd={handlePagerMomentumScrollEnd}
                    style={{ flex: 1 }}
                    contentContainerStyle={{ width: width * 5 }}
                >
                    <View style={{ width, height: '100%' }}>
                        {renderOverview()}
                    </View>
                    <View style={{ width, height: '100%' }}>
                        {renderPreview()}
                    </View>
                    <View style={{ width, height: '100%' }}>
                        {renderLineups()}
                    </View>
                    <View style={{ width, height: '100%' }}>
                        {renderMedia()}
                    </View>
                    <View style={{ width, height: '100%' }}>
                        {renderStaff()}
                    </View>
                </Animated.ScrollView>
                </View>
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: 'transparent' },
    headerContainer: { overflow: 'hidden', borderBottomWidth: 1, paddingBottom: 20 },
    topNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 10, marginBottom: 20 },
    backBtn: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    headerTitle: { color: '#FFF', fontSize: 16, fontWeight: '900', letterSpacing: 0.5 },
    tourBadge: { backgroundColor: Colors.primary, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
    tourBadgeText: { color: '#FFFFFF', fontSize: 11, fontWeight: '900' },
    matchScoreCard: { alignItems: 'center', paddingHorizontal: 20 },
    dateRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
    dateText: { color: 'rgba(255,255,255,0.5)', fontSize: 12, marginLeft: 6, fontWeight: '700' },
    teamsScoreRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', width: '100%', marginBottom: 15 },
    teamBlockRight: { flexDirection: 'row', alignItems: 'center', flex: 1, justifyContent: 'flex-end' },
    teamBlockLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, justifyContent: 'flex-start' },
    teamNameText: { color: '#FFF', fontSize: 16, fontWeight: '900', marginHorizontal: 10 },
    logoCircle: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.05)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    scoreTextMain: { color: '#FFF', fontSize: 32, fontWeight: '900', marginHorizontal: 20, letterSpacing: 2 },
    locationRow: { flexDirection: 'row', alignItems: 'center' },
    locationText: { color: 'rgba(255,255,255,0.5)', fontSize: 12, marginLeft: 6, fontWeight: '700' },
    tabsContainer: { 
        height: 48, 
        overflow: 'hidden', 
        borderBottomWidth: 1, 
        borderBottomColor: 'rgba(255,255,255,0.08)',
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
        backgroundColor: '#00FF66',
        shadowColor: '#00FF66',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: 6,
        elevation: 4,
        zIndex: 5,
    },
    tabText: { color: 'rgba(255,255,255,0.4)', fontSize: 12, fontWeight: '800' },
    activeTabText: { color: '#FFF', fontWeight: '900' },
    tabContent: { flex: 1 },
    carouselContainer: { flexDirection: 'row', alignItems: 'center', padding: 12, height: 80, overflow: 'hidden' },
    navArrowBtnOneSide: { width: 48, height: 50, borderRadius: 12, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', marginLeft: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    animatedCardWrapper: { flex: 1, overflow: 'hidden' },
    teamCarouselCard: { height: 50, borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(0,255,102,0.2)' },
    compactTeamInfo: { flexDirection: 'row', alignItems: 'center', width: '100%', padding: 8 },
    miniLogoBox: { width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(255,255,255,0.05)', justifyContent: 'center', alignItems: 'center' },
    miniTeamType: { color: Colors.primary, fontSize: 8, fontWeight: '900', letterSpacing: 0.5 },
    miniTeamName: { color: '#FFF', fontSize: 14, fontWeight: '900' },
    lineupListWrapper: { padding: 16 },
    tacticsSectionCard: { borderRadius: 16, padding: 16, overflow: 'hidden' },
    listHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
    listTitle: { color: '#FFF', fontSize: 14, fontWeight: '900', letterSpacing: 1 },
    playerCardCompact: { borderRadius: 12, marginBottom: 10, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    playerAvatarSmall: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.05)', marginRight: 12, overflow: 'hidden' },
    playerInitials: { width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' },
    initialsText: { color: 'rgba(255,255,255,0.4)', fontSize: 18, fontWeight: 'bold' },
    playerInfoCompact: { flex: 1 },
    playerNameCompact: { color: '#FFF', fontSize: 14, fontWeight: '900' },
    playerNumberCompact: { color: 'rgba(255,255,255,0.4)', fontSize: 11, marginTop: 2, fontWeight: '700' },
    emptyPlayersBox: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40 },
    emptyPlayersText: { color: 'rgba(255,255,255,0.2)', fontSize: 12, fontWeight: '900', marginTop: 10 },
    timelineRow: { flexDirection: 'row', marginBottom: 20 },
    timelineLeftColumn: { width: 45, alignItems: 'center', position: 'relative' },
    timelineIcon: { zIndex: 2 },
    cardIcon: { width: 14, height: 20, borderRadius: 2, zIndex: 2 },
    timelineTimeText: { color: 'rgba(255,255,255,0.5)', fontSize: 11, marginTop: 6, fontWeight: '900', zIndex: 2 },
    timelineLine: { position: 'absolute', top: 25, bottom: -30, width: 1, backgroundColor: 'rgba(255,255,255,0.1)', zIndex: 1 },
    timelineEventCard: { borderRadius: 12, padding: 1, marginLeft: 8, flex: 1, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    eventContentWrapper: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12 },
    eventTitle: { fontWeight: '900', color: Colors.primary, fontSize: 12, marginBottom: 4 },
    eventDesc: { color: '#FFF', fontSize: 13, fontWeight: '800' },
    eventLogo: { width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.05)', justifyContent: 'center', alignItems: 'center', marginLeft: 12 },
    eventLogoText: { color: 'rgba(255,255,255,0.5)', fontWeight: '900', fontSize: 10 },
    notStartedContainer: { alignItems: 'center', marginTop: 60 },
    notStartedText: { color: 'rgba(255,255,255,0.3)', fontSize: 14, fontWeight: '900' },
    placeholderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', minHeight: 200 },
    placeholderText: { color: 'rgba(255,255,255,0.3)', textAlign: 'center', fontWeight: '900', fontSize: 12 },
    staffMemberCard: { borderRadius: 16, overflow: 'hidden', width: '100%', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
    staffIconBox: { width: 40, height: 40, borderRadius: 10, backgroundColor: 'rgba(0,255,102,0.1)', justifyContent: 'center', alignItems: 'center', marginRight: 16 },
    staffLabel: { color: 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: '900' },
    staffValue: { color: '#FFF', fontSize: 15, fontWeight: '900', marginTop: 2 },
    openYtLinkBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 0, 0, 0.1)',
        borderWidth: 1,
        borderColor: 'rgba(255, 0, 0, 0.3)',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 14,
        width: '100%',
        marginTop: 10,
    },
    openYtLinkText: {
        color: '#FFF',
        fontWeight: '800',
        fontSize: 13,
    },

    // Preview Styles
    previewSectionCard: {
        borderRadius: 16,
        marginBottom: 16,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.08)',
    },
    previewSectionTitle: {
        color: '#FFF',
        fontSize: 13,
        fontWeight: '900',
        letterSpacing: 0.5,
    },
    previewInfoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.05)',
    },
    previewInfoLabel: {
        color: 'rgba(255, 255, 255, 0.5)',
        fontSize: 12,
        fontWeight: '600',
    },
    previewInfoVal: {
        color: '#FFF',
        fontSize: 12,
        fontWeight: '800',
    },
    teamFormTitle: {
        color: '#FFF',
        fontSize: 12,
        fontWeight: '800',
    },
    formBadge: {
        width: 28,
        height: 28,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
    },
    formBadgeWin: {
        backgroundColor: 'rgba(34, 197, 94, 0.25)',
        borderWidth: 1,
        borderColor: '#22C55E',
    },
    formBadgeDraw: {
        backgroundColor: 'rgba(234, 179, 8, 0.25)',
        borderWidth: 1,
        borderColor: '#EAB308',
    },
    formBadgeLoss: {
        backgroundColor: 'rgba(239, 68, 68, 0.25)',
        borderWidth: 1,
        borderColor: '#EF4444',
    },
    formBadgeText: {
        color: '#FFF',
        fontSize: 11,
        fontWeight: '900',
    },
    keyPlayerBox: {
        flex: 1,
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.04)',
        padding: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.08)',
    },
    keyPlayerAvatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
        marginBottom: 8,
    },
    keyPlayerName: {
        color: '#FFF',
        fontSize: 12,
        fontWeight: '800',
        textAlign: 'center',
    },
    keyPlayerRole: {
        color: Colors.primary,
        fontSize: 10,
        fontWeight: '700',
        marginTop: 2,
    },

    // H2H Styles
    h2hMatchCard: {
        backgroundColor: 'rgba(255, 255, 255, 0.04)',
        borderRadius: 14,
        padding: 12,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.08)',
    },
    h2hHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    h2hRoundBadge: {
        backgroundColor: 'rgba(0, 255, 135, 0.12)',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: 'rgba(0, 255, 135, 0.25)',
    },
    h2hRoundText: {
        color: '#00FF87',
        fontSize: 10,
        fontWeight: '900',
    },
    h2hSeasonBadge: {
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        paddingHorizontal: 7,
        paddingVertical: 3,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.15)',
    },
    h2hSeasonText: {
        color: 'rgba(255, 255, 255, 0.85)',
        fontSize: 10,
        fontWeight: '800',
    },
    h2hDateText: {
        color: 'rgba(255, 255, 255, 0.5)',
        fontSize: 11,
        fontWeight: '600',
    },
    h2hScoreRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    h2hTeamCol: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        gap: 8,
    },
    h2hTeamLogo: {
        width: 26,
        height: 26,
        borderRadius: 13,
    },
    h2hTeamName: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '800',
        flex: 1,
    },
    h2hScoreBox: {
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 8,
        marginHorizontal: 8,
    },
    h2hScoreText: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '900',
        letterSpacing: 0.5,
    },
    h2hEmptyBox: {
        alignItems: 'center',
        paddingVertical: 16,
        gap: 6,
    },
    h2hEmptyText: {
        color: 'rgba(255, 255, 255, 0.45)',
        fontSize: 12,
        fontWeight: '600',
        textAlign: 'center',
    },

    // Staff Styles
    staffSectionCard: {
        borderRadius: 16,
        marginBottom: 16,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.08)',
    },
    staffSectionTitle: {
        color: '#FFF',
        fontSize: 13,
        fontWeight: '900',
        letterSpacing: 0.5,
    },
    staffItemRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.05)',
    },
    staffIconCircle: {
        width: 38,
        height: 38,
        borderRadius: 12,
        backgroundColor: 'rgba(255, 255, 255, 0.06)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    staffItemRole: {
        color: 'rgba(255, 255, 255, 0.4)',
        fontSize: 10,
        fontWeight: '900',
        letterSpacing: 0.5,
    },
    staffItemName: {
        color: '#FFF',
        fontSize: 13,
        fontWeight: '800',
        marginTop: 2,
    },
});
