import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    ActivityIndicator,
    Animated,
    Dimensions,
    Platform,
    StatusBar,
    PanResponder,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../constants/Colors';
import { apiService } from '../services/apiService';
import SmartImage from '../components/SmartImage';
import CustomRefreshControl from '../components/CustomRefreshControl';
import { useTranslation } from 'react-i18next';
import AppNavbar from '../components/AppNavbar';
import { formatLocalizedVenue } from '../utils/localizationUtils';
import { useThemeStore } from '../store/useThemeStore';
import { getHomeScreenColors } from '../constants/homeTheme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function CalendarMatchesScreen({ route, navigation }: any) {
    const { t, i18n } = useTranslation();
    const { isDark } = useThemeStore();
    const homeColors = getHomeScreenColors(isDark);
    const currentLang = i18n.language || 'uz';
    const { 
        tournamentId,
        tournamentName = t('tournaments.title', 'Turnir'), 
        date = t('common.date', 'Sana'),
        timestamp,
        rawDate,
        matches: initialMatches = [] 
    } = route?.params || {};
    
    const [matches, setMatches] = useState<any[]>(initialMatches);
    const [loading, setLoading] = useState(initialMatches.length === 0);
    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    // 1:1 Real-time interactive swipe-to-back animation
    const swipeBackAnim = useRef(new Animated.Value(0)).current;

    const swipeBackPanResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponderCapture: () => false,
            onMoveShouldSetPanResponderCapture: (_, gestureState) => {
                return gestureState.dx > 12 && Math.abs(gestureState.dx) > Math.abs(gestureState.dy) * 1.3;
            },
            onPanResponderMove: (_, gestureState) => {
                if (gestureState.dx > 0) {
                    swipeBackAnim.setValue(gestureState.dx);
                } else {
                    swipeBackAnim.setValue(0);
                }
            },
            onPanResponderRelease: (_, gestureState) => {
                const shouldExit = gestureState.dx > SCREEN_WIDTH * 0.35 || (gestureState.dx > 60 && gestureState.vx > 0.6);
                if (shouldExit) {
                    Animated.timing(swipeBackAnim, {
                        toValue: SCREEN_WIDTH,
                        duration: 180,
                        useNativeDriver: true,
                    }).start(() => {
                        navigation.goBack();
                    });
                } else {
                    Animated.spring(swipeBackAnim, {
                        toValue: 0,
                        friction: 8,
                        tension: 45,
                        useNativeDriver: true,
                    }).start();
                }
            },
            onPanResponderTerminate: () => {
                Animated.spring(swipeBackAnim, {
                    toValue: 0,
                    friction: 8,
                    tension: 45,
                    useNativeDriver: true,
                }).start();
            },
            onPanResponderTerminationRequest: () => true,
        })
    ).current;

    const backdropOpacity = swipeBackAnim.interpolate({
        inputRange: [0, SCREEN_WIDTH * 0.8, SCREEN_WIDTH],
        outputRange: [isDark ? 0.6 : 0.25, 0.05, 0],
        extrapolate: 'clamp',
    });

    const formattedSubtitleDate = useMemo(() => {
        let dateObj: Date | null = null;
        if (timestamp) {
            dateObj = new Date(timestamp);
        } else if (rawDate) {
            dateObj = new Date(rawDate);
        } else if (initialMatches && initialMatches.length > 0) {
            const firstM = initialMatches[0];
            const mRaw = firstM.date || firstM.scheduledAt || firstM.match_date;
            if (mRaw) dateObj = new Date(mRaw);
        }

        if (!dateObj || isNaN(dateObj.getTime())) {
            if (typeof date === 'string') {
                const parsed = new Date(date);
                if (!isNaN(parsed.getTime())) dateObj = parsed;
            }
        }

        if (dateObj && !isNaN(dateObj.getTime())) {
            if (currentLang === 'uz') {
                const day = dateObj.getDate();
                const monthsUz = [
                    'Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun',
                    'Iyul', 'Avgust', 'Sentyabr', 'Oktyabr', 'Noyabr', 'Dekabr'
                ];
                const weekdaysUz = [
                    'Yakshanba', 'Dushanba', 'Seshanba', 'Chorshanba',
                    'Payshanba', 'Juma', 'Shanba'
                ];
                const monthName = monthsUz[dateObj.getMonth()];
                const weekdayName = weekdaysUz[dateObj.getDay()];
                return `${day}-${monthName}, ${weekdayName}`.toUpperCase();
            } else if (currentLang === 'ru') {
                const day = dateObj.getDate();
                const monthsRu = [
                    'Января', 'Февраля', 'Марта', 'Апреля', 'Мая', 'Июня',
                    'Июля', 'Августа', 'Сентября', 'Октября', 'Ноября', 'Декабря'
                ];
                const weekdaysRu = [
                    'Воскресенье', 'Понедельник', 'Вторник', 'Среда',
                    'Четверг', 'Пятница', 'Суббота'
                ];
                const monthName = monthsRu[dateObj.getMonth()];
                const weekdayName = weekdaysRu[dateObj.getDay()];
                return `${day} ${monthName}, ${weekdayName}`.toUpperCase();
            } else {
                return dateObj.toLocaleDateString('en-US', {
                    month: 'long',
                    day: 'numeric',
                    weekday: 'long'
                }).toUpperCase();
            }
        }

        return String(date).toUpperCase();
    }, [timestamp, rawDate, initialMatches, date, currentLang]);

    useEffect(() => {
        if (initialMatches.length === 0 && tournamentId) {
            fetchMatches();
        }
    }, []);

    const fetchMatches = async () => {
        try {
            setLoading(true);
            const data = await apiService.getMatches({ tournamentId });
            if (data && Array.isArray(data)) {
                setMatches(data);
            }
        } catch (error) {
            console.error('Error fetching tournament matches:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        fetchMatches();
    };

    const filteredMatches = useMemo(() => {
        return matches.filter((match: any) => {
            const hName = match.homeTeam?.name || match.homeTeamName || match.home_team?.name || '';
            const aName = match.awayTeam?.name || match.awayTeamName || match.away_team?.name || '';
            const vName = match.venue || match.location || '';
            const q = searchQuery.toLowerCase();
            return hName.toLowerCase().includes(q) ||
                   aName.toLowerCase().includes(q) ||
                   vName.toLowerCase().includes(q);
        });
    }, [matches, searchQuery]);

    // Tour / Round parsing and grouping matching TournamentDetailScreen
    const getMatchTourKey = (m: any): string => {
        if (!m) return '1-TUR';
        const raw = m.round_tag || m.round_name || m.round_number || m.round || m.tour || m.tourNumber || m.tour_number;
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

    const getShortFieldDisplay = (match: any): string => {
        if (!match) return '1-M';
        
        const rawField = match.field_number || match.fieldNumber || match.pitch_number || match.pitchNumber || match.field || match.pitch || match.maydon;
        if (rawField) {
            const numMatch = String(rawField).match(/\d+/);
            if (numMatch) return `${numMatch[0]}-M`;
            if (typeof rawField === 'string' && rawField.trim().length <= 6) return rawField.trim().toUpperCase();
        }

        const venueStr = match.venue || match.location || match.stadium_name || match.stadium || '';
        if (venueStr) {
            const numMatch = String(venueStr).match(/\d+/);
            if (numMatch) return `${numMatch[0]}-M`;
            
            const vLower = venueStr.toLowerCase();
            if (vLower.includes('zal') || vLower.includes('indoor')) return 'ZAL';
            if (vLower.includes('markaziy') || vLower.includes('central')) return '1-M';
        }

        return '1-M';
    };

    const getMatchFieldNum = (m: any): number => {
        if (!m) return 999;
        const raw = m.field_number || m.fieldNumber || m.pitch_number || m.pitchNumber || m.field || m.pitch || m.maydon;
        if (raw !== undefined && raw !== null) {
            const match = String(raw).match(/\d+/);
            if (match) return parseInt(match[0], 10);
        }
        const venue = m.venue || m.location || m.stadium_name || m.stadium || '';
        if (venue) {
            const match = String(venue).match(/\d+/);
            if (match) return parseInt(match[0], 10);
        }
        return 999;
    };

    const getMatchTimeInMinutes = (m: any): number => {
        if (!m) return 0;
        const rawTime = m.match_time || m.time || m.matchTime || m.scheduled_time || m.start_time;
        if (rawTime && String(rawTime).includes(':')) {
            const parts = String(rawTime).split(':');
            const h = parseInt(parts[0], 10) || 0;
            const min = parseInt(parts[1], 10) || 0;
            return h * 60 + min;
        }
        const rawDate = m.date || m.scheduledAt || m.match_date;
        if (rawDate) {
            const d = new Date(rawDate);
            if (!isNaN(d.getTime())) {
                return d.getHours() * 60 + d.getMinutes();
            }
        }
        return 18 * 60;
    };

    const compareMatchesByTimeAndField = (a: any, b: any): number => {
        const timeA = getMatchTimeInMinutes(a);
        const timeB = getMatchTimeInMinutes(b);

        if (timeA !== timeB) {
            return timeA - timeB;
        }

        const fieldA = getMatchFieldNum(a);
        const fieldB = getMatchFieldNum(b);
        if (fieldA !== fieldB) {
            return fieldA - fieldB;
        }

        const dateA = new Date(a.date || a.scheduledAt || a.match_date || a.createdAt || 0).getTime();
        const dateB = new Date(b.date || b.scheduledAt || b.match_date || b.createdAt || 0).getTime();
        return dateA - dateB;
    };

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
            matches: group.matches.sort(compareMatchesByTimeAndField)
        })).sort((a, b) => {
            if (a.tourNum > 0 && b.tourNum > 0) return a.tourNum - b.tourNum;
            if (a.tourNum > 0) return -1;
            if (b.tourNum > 0) return 1;
            return 0;
        });
    }, [filteredMatches, formatTourTitle]);

    return (
        <View style={{ flex: 1, backgroundColor: 'transparent' }}>
            <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} translucent backgroundColor="transparent" />

            {/* Fading Backdrop Overlay */}
            <Animated.View
                pointerEvents="none"
                style={[
                    StyleSheet.absoluteFillObject,
                    {
                        backgroundColor: '#000000',
                        opacity: backdropOpacity,
                    },
                ]}
            />

            <Animated.View
                style={{
                    flex: 1,
                    backgroundColor: homeColors.background,
                    transform: [{ translateX: swipeBackAnim }],
                    shadowColor: '#000000',
                    shadowOffset: { width: -4, height: 0 },
                    shadowOpacity: isDark ? 0.5 : 0.2,
                    shadowRadius: 10,
                    elevation: 10,
                }}
            >
                <SafeAreaView style={{ flex: 1 }} edges={['top']}>
                    {/* Universal App Navbar */}
                    <AppNavbar
                        title={`${tournamentName}`}
                        subtitle={formattedSubtitleDate}
                        onBackPress={() => navigation.goBack()}
                        showSearch={true}
                        searchQuery={searchQuery}
                        onSearchChange={setSearchQuery}
                        searchPlaceholder={t('common.search', 'Qidiruv...')}
                    />

                    {/* Matches List */}
                    {loading && !refreshing ? (
                        <View style={[styles.emptyContainer, { flex: 1, justifyContent: 'center' }]}>
                            <ActivityIndicator size="large" color={homeColors.accent} />
                            <Text style={[styles.emptyText, { marginTop: 12, color: homeColors.textSecondary }]}>{t('common.loading')}</Text>
                        </View>
                    ) : (
                        <View style={{ flex: 1 }} {...swipeBackPanResponder.panHandlers}>
                            <ScrollView
                                contentContainerStyle={styles.listContent}
                                showsVerticalScrollIndicator={false}
                                refreshControl={
                                    <CustomRefreshControl
                                        refreshing={refreshing}
                                        onRefresh={onRefresh}
                                    />
                                }
                            >
                                {groupedMatchesByTour.length === 0 ? (
                                    <View style={styles.emptyContainer}>
                                        <Ionicons name="football-outline" size={48} color={homeColors.textSecondary} style={{ marginBottom: 12, opacity: 0.5 }} />
                                        <Text style={[styles.emptyText, { color: homeColors.textSecondary }]}>{t('common.no_data')}</Text>
                                    </View>
                                ) : (
                                    groupedMatchesByTour.map((group: any) => (
                                        <View
                                            key={group.tourKey}
                                            style={[
                                                styles.tourCard,
                                                {
                                                    backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#FFFFFF',
                                                    borderColor: isDark ? 'rgba(255,255,255,0.08)' : homeColors.border,
                                                }
                                            ]}
                                        >
                                            {/* Tour Card Header (1:1 TournamentDetailScreen style) */}
                                            <View
                                                style={[
                                                    styles.tourCardHeader,
                                                    {
                                                        backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#F8F9FA',
                                                        borderBottomColor: isDark ? 'rgba(255,255,255,0.06)' : homeColors.border,
                                                    }
                                                ]}
                                            >
                                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                                    <View
                                                        style={[
                                                            styles.tourPill,
                                                            { backgroundColor: homeColors.accent }
                                                        ]}
                                                    />
                                                    <Text style={[styles.tourTitleText, { color: homeColors.textPrimary }]}>
                                                        {group.tourTitle}
                                                    </Text>
                                                </View>

                                                <View
                                                    style={[
                                                        styles.tourBadge,
                                                        { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#ECECEE' }
                                                    ]}
                                                >
                                                    <Text style={[styles.tourBadgeText, { color: homeColors.textSecondary }]}>
                                                        {t('matches.matches_count', { count: group.matches.length }).toUpperCase()}
                                                    </Text>
                                                </View>
                                            </View>

                                            {/* Tour Matches List inside this Tour Card */}
                                            <View>
                                                {group.matches.map((match: any, matchIdx: number) => {
                                                    const st = String(match.status || '').toLowerCase().trim();
                                                    const isLive = ['live', 'first_half', 'second_half', 'half_time', 'halftime', 'ongoing', 'in_progress', '1st_half', '2nd_half', '1-taym', '2-taym', 'tanaffus'].includes(st);
                                                    const isFinished = ['finished', 'completed', 'ended', 'tugadi'].includes(st);

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
                                                    const fieldDisplay = getShortFieldDisplay(match);

                                                    const homeName = match.homeTeam?.name || match.homeTeamName || match.home_team?.name || 'UY';
                                                    const awayName = match.awayTeam?.name || match.awayTeamName || match.away_team?.name || 'MEHMON';
                                                    const homeLogo = match.homeTeam?.logo || match.homeTeamLogo || match.home_team?.logo_url;
                                                    const awayLogo = match.awayTeam?.logo || match.awayTeamLogo || match.away_team?.logo_url;

                                                    return (
                                                        <TouchableOpacity
                                                            key={match._id || match.id || matchIdx}
                                                            style={[
                                                                styles.matchRow,
                                                                {
                                                                    backgroundColor: isLive ? (isDark ? 'rgba(255, 59, 48, 0.08)' : 'rgba(255, 59, 48, 0.05)') : 'transparent',
                                                                    borderTopWidth: matchIdx > 0 ? 1 : 0,
                                                                    borderTopColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)',
                                                                }
                                                            ]}
                                                            onPress={() => navigation.navigate('MatchDetail', { matchData: match, matchId: match._id || match.id })}
                                                            activeOpacity={0.7}
                                                        >
                                                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                                                {/* Home Team (Right-aligned) */}
                                                                <View style={styles.teamColumnHome}>
                                                                    <Text
                                                                        style={[styles.teamNameText, { color: homeColors.textPrimary }]}
                                                                        numberOfLines={1}
                                                                    >
                                                                        {homeName}
                                                                    </Text>
                                                                    <View
                                                                        style={[
                                                                            styles.logoCircle,
                                                                            { backgroundColor: isDark ? '#222222' : '#F2F2F4' }
                                                                        ]}
                                                                    >
                                                                        <SmartImage
                                                                            uri={homeLogo}
                                                                            style={{ width: 22, height: 22 }}
                                                                            contentFit="contain"
                                                                            fallbackIcon="shield-outline"
                                                                        />
                                                                    </View>
                                                                </View>

                                                                {/* Center: Score / Time / LIVE */}
                                                                <View style={styles.centerScoreColumn}>
                                                                    {isLive ? (
                                                                        <View style={{ alignItems: 'center' }}>
                                                                            <Text style={styles.liveScoreText}>
                                                                                {match.score?.home ?? match.home_score ?? 0} : {match.score?.away ?? match.away_score ?? 0}
                                                                            </Text>
                                                                            <View style={styles.liveBadgeRow}>
                                                                                <View style={styles.liveBadgeDot} />
                                                                                <Text style={styles.liveBadgeLabel}>LIVE</Text>
                                                                            </View>
                                                                        </View>
                                                                    ) : isFinished ? (
                                                                        <View style={{ alignItems: 'center' }}>
                                                                            <Text style={[styles.finishedScoreText, { color: homeColors.textPrimary }]}>
                                                                                {match.score?.home ?? match.home_score ?? 0} : {match.score?.away ?? match.away_score ?? 0}
                                                                            </Text>
                                                                            {fieldDisplay ? (
                                                                                <Text style={[styles.dateSubText, { color: homeColors.textSecondary }]}>
                                                                                    {fieldDisplay}
                                                                                </Text>
                                                                            ) : null}
                                                                        </View>
                                                                    ) : (
                                                                        <View style={{ alignItems: 'center' }}>
                                                                            <Text style={[styles.scheduledTimeText, { color: homeColors.textPrimary }]}>
                                                                                {timeStr || '18:00'}
                                                                            </Text>
                                                                            {fieldDisplay ? (
                                                                                <Text style={[styles.dateSubText, { color: homeColors.textSecondary }]}>
                                                                                    {fieldDisplay}
                                                                                </Text>
                                                                            ) : null}
                                                                        </View>
                                                                    )}
                                                                </View>

                                                                {/* Away Team (Left-aligned) */}
                                                                <View style={styles.teamColumnAway}>
                                                                    <View
                                                                        style={[
                                                                            styles.logoCircle,
                                                                            { backgroundColor: isDark ? '#222222' : '#F2F2F4' }
                                                                        ]}
                                                                    >
                                                                        <SmartImage
                                                                            uri={awayLogo}
                                                                            style={{ width: 22, height: 22 }}
                                                                            contentFit="contain"
                                                                            fallbackIcon="shield-outline"
                                                                        />
                                                                    </View>
                                                                    <Text
                                                                        style={[styles.teamNameText, { color: homeColors.textPrimary, textAlign: 'left' }]}
                                                                        numberOfLines={1}
                                                                    >
                                                                        {awayName}
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
                        </View>
                    )}
                </SafeAreaView>
            </Animated.View>
        </View>
    );
}

const styles = StyleSheet.create({
    listContent: {
        paddingBottom: 40,
        paddingTop: 10,
        paddingHorizontal: 16,
    },
    tourCard: {
        marginBottom: 14,
        borderRadius: 16,
        overflow: 'hidden',
        borderWidth: 1,
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 6,
        elevation: 2,
    },
    tourCardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
    },
    tourPill: {
        width: 4,
        height: 14,
        borderRadius: 2,
    },
    tourTitleText: {
        fontSize: 13,
        fontWeight: '800',
        letterSpacing: 0.5,
    },
    tourBadge: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 8,
    },
    tourBadgeText: {
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 0.3,
    },
    matchRow: {
        paddingHorizontal: 14,
        paddingVertical: 12,
    },
    teamColumnHome: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-end',
        gap: 6,
        paddingRight: 6,
    },
    teamColumnAway: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-start',
        gap: 6,
        paddingLeft: 6,
    },
    teamNameText: {
        fontSize: 11.5,
        fontWeight: '700',
        letterSpacing: 0.1,
        textAlign: 'right',
        flexShrink: 1,
    },
    logoCircle: {
        width: 24,
        height: 24,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
    },
    centerScoreColumn: {
        width: 72,
        alignItems: 'center',
        justifyContent: 'center',
    },
    liveScoreText: {
        fontSize: 15,
        fontWeight: '900',
        color: '#FF3B30',
        letterSpacing: 0.5,
    },
    liveBadgeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
        marginTop: 1,
    },
    liveBadgeDot: {
        width: 4,
        height: 4,
        borderRadius: 2,
        backgroundColor: '#FF3B30',
    },
    liveBadgeLabel: {
        fontSize: 8,
        fontWeight: '800',
        color: '#FF3B30',
        letterSpacing: 0.3,
    },
    finishedScoreText: {
        fontSize: 15,
        fontWeight: '800',
        letterSpacing: 0.5,
    },
    scheduledTimeText: {
        fontSize: 14.5,
        fontWeight: '700',
        letterSpacing: -0.3,
    },
    dateSubText: {
        fontSize: 8.5,
        marginTop: 1,
        fontWeight: '600',
    },
    emptyContainer: {
        padding: 50,
        alignItems: 'center',
    },
    emptyText: {
        fontSize: 14,
        fontWeight: '600',
    },
});


