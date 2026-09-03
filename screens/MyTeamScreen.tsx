import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    RefreshControl,
    TouchableOpacity,
    Pressable,
    Image,
    Animated,
    StatusBar,
    Linking,
    Dimensions,
    ActivityIndicator,
    Alert,
    Platform,
    Modal,
    TextInput,
    PanResponder
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { Video, ResizeMode } from 'expo-av';
import Colors from '../constants/Colors';
import { apiService } from '../services/apiService';
import SmartImage from '../components/SmartImage';
import TeamProfileSkeleton from '../components/TeamProfileSkeleton';
import TacticsBoard from '../components/TacticsBoard';
import { getCachedVideoUri } from '../utils/videoCache';
import { getDeduplicatedGoalReplays } from '../utils/replayUtils';
import { useTranslation } from 'react-i18next';
import { Player } from '../types';
import Translations from '../constants/Translations';
import { useAuthStore } from '../store/useAuthStore';
import { useThemeStore } from '../store/useThemeStore';
import { getHomeScreenColors } from '../constants/homeTheme';
import { useSocket } from '../context/SocketContext';
import { getLocalizedPosition } from '../utils/localizationUtils';

const { width } = Dimensions.get('window');

export default function MyTeamScreen({ route, navigation }: any) {
    const { t } = useTranslation();
    const { user, unreadCount, isChatMuted } = useAuthStore();
    const { socket } = useSocket();
    const { isDark } = useThemeStore();
    const homeColors = getHomeScreenColors(isDark);

    const cardSurface = {
        backgroundColor: homeColors.background,
        borderWidth: 1,
        borderColor: homeColors.border,
    };

    const { teamId, team: initialTeam } = route?.params || {};
    const userTeamId = user?.teamId || user?.team_id || (user?.role === 'manager' ? (user?.id || user?._id) : null);
    const activeTeamId = teamId || route?.params?.id || route?.params?.teamId || initialTeam?.id || initialTeam?._id || userTeamId;

    const [team, setTeam] = useState<any | null>(initialTeam || route?.params?.team || null);
    const [players, setPlayers] = useState<Player[]>([]);
    const [matches, setMatches] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(!initialTeam && !route?.params?.team);
    const [isPlayersLoading, setIsPlayersLoading] = useState(true);
    const [isMatchesLoading, setIsMatchesLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const [selectedPlayerForPhone, setSelectedPlayerForPhone] = useState<any | null>(null);
    const [phoneInputText, setPhoneInputText] = useState('');
    const [savingPhone, setSavingPhone] = useState(false);

    const isOwnerOrMember = user && activeTeamId && userTeamId && (String(userTeamId) === String(activeTeamId));
    const isSystemAdmin = user && (user.role === 'admin' || user.role === 'trainer');
    const canEdit = isSystemAdmin || (isOwnerOrMember && (user?.role === 'manager' || user?.role === 'coach' || user?.role === 'team_admin'));
    const canChat = isSystemAdmin || isOwnerOrMember;
    const currentUserPhone = user?.phone || user?.phoneNumber || user?.phone_number || user?.tel;

    // Team Story Replay (upload/tanlash) — ENDI bu yerdan olib tashlandi,
    // Account ekrani va Home ekranidagi story tray orqali qo'shiladi.

    // Match Detail sahifasidagi kabi HAQIQIY bog'langan pager: 3ta panel
    // (tarkib/taktika/o'yinlar) bir-biriga yopishgan holda gorizontal
    // ScrollView'da yon-yonma joylashadi — swipe'ni yarim ushlab tursa
    // ikkala tab bir vaqtda yarim ko'rinadi (single-panel translateX emas).
    const tabs: ('squad' | 'tactics' | 'matches')[] = ['squad', 'tactics', 'matches'];
    const TAB_LABELS: Record<string, string> = {
        squad: t('teams.squad', 'TARKIB').toUpperCase(),
        tactics: t('teams.tactics', 'TAKTIKA').toUpperCase(),
        matches: t('teams.matches', "O'YINLAR").toUpperCase()
    };
    const [currentTabIndex, setCurrentTabIndex] = useState(0);
    const currentTabIndexRef = useRef(0);
    const scrollXPager = useRef(new Animated.Value(0)).current;
    const isPagerScrolling = useRef(false);
    const pagerScrollRef = useRef<ScrollView>(null);
    const [tabLabelWidths, setTabLabelWidths] = useState<number[]>([]);

    const TAB_BAR_WIDTH = width - 32;
    const TAB_WIDTH = TAB_BAR_WIDTH / tabs.length;
    const DEFAULT_INDICATOR_WIDTH = TAB_WIDTH * 0.72;
    const tabIndicatorInputRange = tabs.map((_, i) => i * width);
    // So'z uzunligiga qarab moslashadigan indikator (Match Detail'dagi bilan bir xil mantiq)
    const indicatorWidths = tabs.map((_, i) => tabLabelWidths[i] ?? DEFAULT_INDICATOR_WIDTH);
    const indicatorLefts = tabs.map((_, i) => i * TAB_WIDTH + (TAB_WIDTH - indicatorWidths[i]) / 2);
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

    const swipeBackAnim = useRef(new Animated.Value(0)).current;

    // 1-tabda (tarkib) turib o'ngga surilganda real-vaqtda interaktiv orqaga qaytish:
    const swipeBackPanResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponderCapture: () => false,
            onMoveShouldSetPanResponderCapture: (_, gestureState) => {
                if (currentTabIndexRef.current !== 0) return false;
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
                const shouldExit = gestureState.dx > width * 0.35 || (gestureState.dx > 60 && gestureState.vx > 0.6);
                if (shouldExit) {
                    Animated.timing(swipeBackAnim, {
                        toValue: width,
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
        inputRange: [0, width * 0.8, width],
        outputRange: [isDark ? 0.6 : 0.25, 0.05, 0],
        extrapolate: 'clamp',
    });

    const getTeamCacheKey = (tId: string) => `@amatora_team_cache_${tId}`;

    const onRefresh = async () => {
        setRefreshing(true);
        try {
            await fetchData(true);
        } catch (e) {
            console.log('MyTeam refresh error:', e);
        } finally {
            setRefreshing(false);
        }
    };

    const fetchData = async (forceRefresh = false) => {
        const currentId = activeTeamId;
        if (!currentId) {
            setIsLoading(false);
            setIsPlayersLoading(false);
            setIsMatchesLoading(false);
            return;
        }

        // 0. INSTANT CACHE LOAD: Keshdan jamoa ma'lumotlarini darhol o'qish (0ms)
        try {
            const cachedStr = await AsyncStorage.getItem(getTeamCacheKey(currentId));
            if (cachedStr) {
                const cached = JSON.parse(cachedStr);
                if (cached.team) {
                    setTeam(cached.team);
                    setIsLoading(false);
                }
                if (cached.players && Array.isArray(cached.players) && cached.players.length > 0) {
                    setPlayers(cached.players);
                    setIsPlayersLoading(false);
                }
                if (cached.matches && Array.isArray(cached.matches)) {
                    setMatches(cached.matches);
                    setIsMatchesLoading(false);
                }
            }
        } catch (e) {
            console.log('Team cache read error:', e);
        }

        // 1-BOSQICH (HERO QISMI): Jamoa ma'lumotlarini birinchi tezkor yuklash
        if (!team && !forceRefresh) setIsLoading(true);
        apiService.getTeamById(currentId)
            .then((teamData) => {
                if (teamData) {
                    setTeam(teamData);
                    setIsLoading(false);
                    // Keshga saqlash
                    AsyncStorage.getItem(getTeamCacheKey(currentId)).then((cStr) => {
                        const existing = cStr ? JSON.parse(cStr) : {};
                        AsyncStorage.setItem(getTeamCacheKey(currentId), JSON.stringify({ ...existing, team: teamData })).catch(() => {});
                    }).catch(() => {});
                }
            })
            .catch((err) => {
                console.log('MyTeamScreen team fetch error:', err);
                setIsLoading(false);
            });

        // 2-BOSQICH (TABLAR): Tarkib va o'yinlar ma'lumotlarini fonda parallel yuklash
        if (players.length === 0 || forceRefresh) setIsPlayersLoading(true);
        if (matches.length === 0 || forceRefresh) setIsMatchesLoading(true);

        apiService.getPlayersByTeam(currentId)
            .then((playersData) => {
                const activeTeamPlayers = (playersData || []).filter((p: any) => {
                    const st = String(p.status || '').toLowerCase().trim();
                    const isArchived = p.is_archived === true || st === 'archived' || st === 'arxivlangan';
                    return !isArchived && st === 'approved';
                });
                setPlayers(activeTeamPlayers);
                // Keshga saqlash
                AsyncStorage.getItem(getTeamCacheKey(currentId)).then((cStr) => {
                    const existing = cStr ? JSON.parse(cStr) : {};
                    AsyncStorage.setItem(getTeamCacheKey(currentId), JSON.stringify({ ...existing, players: activeTeamPlayers })).catch(() => {});
                }).catch(() => {});
            })
            .catch(() => {})
            .finally(() => {
                setIsPlayersLoading(false);
            });

        apiService.getMatches({ teamId: currentId })
            .then((matchesData) => {
                const sliced = matchesData?.slice(0, 8) || [];
                setMatches(sliced);
                // Keshga saqlash
                AsyncStorage.getItem(getTeamCacheKey(currentId)).then((cStr) => {
                    const existing = cStr ? JSON.parse(cStr) : {};
                    AsyncStorage.setItem(getTeamCacheKey(currentId), JSON.stringify({ ...existing, matches: sliced })).catch(() => {});
                }).catch(() => {});
            })
            .catch(() => {})
            .finally(() => {
                setIsMatchesLoading(false);
            });
    };

    useEffect(() => {
        fetchData();
        if (socket && activeTeamId) {
            socket.emit('join-team', activeTeamId);
            socket.on('formation-updated', (data: any) => {
                if (data.teamId === activeTeamId) {
                    setTeam((prev: any) => prev ? { ...prev, formation: data.formation } : null);
                }
            });
            return () => {
                socket.off('formation-updated');
            };
        }
    }, [activeTeamId, socket]);

    const handleTabPress = async (index: number) => {
        if (index === currentTabIndexRef.current) return;
        try {
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        } catch (e) {}
        isPagerScrolling.current = true;
        currentTabIndexRef.current = index;
        setCurrentTabIndex(index);
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
        const newIdx = Math.max(0, Math.min(tabs.length - 1, Math.round(offsetX / width)));
        if (newIdx !== currentTabIndexRef.current) {
            currentTabIndexRef.current = newIdx;
            setCurrentTabIndex(newIdx);
        }
        isPagerScrolling.current = false;
    };

    if (isLoading) {
        return (
            <View style={{ flex: 1, backgroundColor: homeColors.background }}>
                <TeamProfileSkeleton />
            </View>
        );
    }

    if (!activeTeamId || !team) {
        return (
            <SafeAreaView style={[styles.emptyContainer, { backgroundColor: homeColors.background }]}>
                <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
                <View style={styles.emptyContent}>
                    <Ionicons name="shield-outline" size={64} color={homeColors.textSecondary} />
                    <Text style={[styles.emptyTitle, { color: homeColors.textPrimary }]}>{t('teams.team_not_found')}</Text>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.loginBtn, { backgroundColor: homeColors.accent }]}>
                        <Text style={styles.loginBtnText}>{t('common.back', 'Orqaga')}</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    // Faqat bazada real qiymati bor rahbariyat qatorlari ko'rsatiladi (bo'sh joy qoldirilmaydi)
    const leadershipRows = [
        { icon: 'ribbon-outline', label: t('teams.captain', 'Sardor'), name: team?.captain_name, phone: team?.captain_phone },
        { icon: 'clipboard-outline', label: t('teams.coach', 'Murabbiy'), name: team?.coach_name, phone: team?.coach_phone },
        { icon: 'briefcase-outline', label: t('teams.president', 'Rahbar'), name: team?.president_name, phone: team?.president_phone },
    ].filter((row) => !!row.name);

    const hasStats = team?.stats && team.stats.played > 0;

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
                <SafeAreaView style={[styles.container, { backgroundColor: homeColors.background }]} edges={['top']}>
                    {/* STICKY HEADER: TOP ACTIONS + LOGO + LEADERSHIP + STATS + TABS */}
            <View style={[styles.headerStickySection, { backgroundColor: homeColors.background, borderBottomColor: homeColors.border }]}>
                {/* TOP ROW: BACK BUTTON & ACTIONS */}
                <View style={styles.topRow}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.iconBtn, cardSurface]}>
                        <Ionicons name="arrow-back" size={20} color={homeColors.textPrimary} />
                    </TouchableOpacity>

                    <View style={{ flexDirection: 'row', gap: 8 }}>
                        {canChat && (
                            <TouchableOpacity
                                style={[styles.iconBtn, cardSurface]}
                                onPress={() => navigation.navigate('TeamChat', { teamId: activeTeamId })}
                            >
                                <Ionicons name="chatbubble-outline" size={18} color={homeColors.textPrimary} />
                                {unreadCount > 0 && (
                                    <View style={styles.unreadBadge}>
                                        <Text style={styles.unreadBadgeText}>{unreadCount}</Text>
                                    </View>
                                )}
                            </TouchableOpacity>
                        )}

                        {canEdit && (
                            <TouchableOpacity
                                style={[styles.iconBtn, cardSurface]}
                                onPress={() => navigation.navigate('FormationBoard', { teamId: activeTeamId })}
                            >
                                <Ionicons name="grid-outline" size={18} color={homeColors.textPrimary} />
                            </TouchableOpacity>
                        )}
                    </View>
                </View>

                {/* TEAM IDENTITY — logo chapda, ma'lumotlar o'ng tomonida */}
                <View style={styles.identityRowSticky}>
                    <View style={{ position: 'relative' }}>
                        <View style={[styles.logoBoxSm, cardSurface]}>
                            <SmartImage
                                uri={team?.logo_url || team?.logo}
                                style={{ width: '100%', height: '100%', borderRadius: 16 }}
                                contentFit="contain"
                                fallbackIcon="shield-outline"
                            />
                        </View>
                    </View>

                    <View style={{ flex: 1, paddingTop: 2 }}>
                        <Text style={[styles.teamNameSm, { color: homeColors.textPrimary }]} numberOfLines={1}>
                            {(team?.name || t('teams.team_fallback', 'JAMOA')).toUpperCase()}
                        </Text>
                        {!!team?.league && (
                            <Text style={[styles.teamLeague, { color: homeColors.textSecondary }]} numberOfLines={1}>
                                {team.league}
                            </Text>
                        )}

                        {leadershipRows.length > 0 && (
                            <View style={{ marginTop: 4, gap: 3 }}>
                                {leadershipRows.map((row) => (
                                    <View key={row.label} style={styles.leadershipRowSm}>
                                        <Ionicons name={row.icon as any} size={12} color={homeColors.textSecondary} />
                                        <Text style={[styles.leadershipNameSm, { color: homeColors.textPrimary }]} numberOfLines={1}>
                                            {row.name}
                                        </Text>
                                        {canEdit && !!row.phone && (
                                            <TouchableOpacity onPress={() => Linking.openURL(`tel:${row.phone}`)} hitSlop={8}>
                                                <Ionicons name="call-outline" size={12} color={homeColors.accent} />
                                            </TouchableOpacity>
                                        )}
                                    </View>
                                ))}
                            </View>
                        )}
                    </View>
                </View>

                {/* INFO CARD — jamoa statistikasi */}
                <View style={[styles.infoCard, cardSurface, { marginBottom: 8 }]}>
                    <View style={styles.infoTopRow}>
                        <View style={styles.infoStat}>
                            <Ionicons name="people-outline" size={15} color={homeColors.textSecondary} />
                            <Text style={[styles.infoStatText, { color: homeColors.textPrimary }]}>{players.length}</Text>
                        </View>
                        {hasStats && (
                            <>
                                <View style={[styles.infoDivider, { backgroundColor: homeColors.border }]} />
                                <View style={styles.infoStat}>
                                    <Text style={[styles.infoStatValue, { color: homeColors.textPrimary }]}>{team.stats.played}</Text>
                                    <Text style={[styles.infoStatLabel, { color: homeColors.textSecondary }]}>{t('teams.games_short', "O'YIN")}</Text>
                                </View>
                                <View style={styles.infoStat}>
                                    <Text style={[styles.infoStatValue, { color: homeColors.textPrimary }]}>{team.stats.won}</Text>
                                    <Text style={[styles.infoStatLabel, { color: homeColors.textSecondary }]}>{t('teams.won_short', "G'.")}</Text>
                                </View>
                                <View style={styles.infoStat}>
                                    <Text style={[styles.infoStatValue, { color: homeColors.textPrimary }]}>{team.stats.drawn}</Text>
                                    <Text style={[styles.infoStatLabel, { color: homeColors.textSecondary }]}>{t('teams.drawn_short', "D.")}</Text>
                                </View>
                                <View style={styles.infoStat}>
                                    <Text style={[styles.infoStatValue, { color: homeColors.textPrimary }]}>{team.stats.lost}</Text>
                                    <Text style={[styles.infoStatLabel, { color: homeColors.textSecondary }]}>{t('teams.lost_short', "M.")}</Text>
                                </View>
                                <View style={styles.infoStat}>
                                    <Text style={[styles.infoStatValue, { color: homeColors.accent }]}>{team.stats.points}</Text>
                                    <Text style={[styles.infoStatLabel, { color: homeColors.textSecondary }]}>{t('teams.pts_short', 'OCHKO')}</Text>
                                </View>
                            </>
                        )}
                    </View>
                </View>

                {/* TAB SWITCHER */}
                <View style={styles.tabsContainer}>
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
                        {tabs.map((tabKey, idx) => {
                            const isActive = currentTabIndex === idx;
                            return (
                                <TouchableOpacity
                                    key={tabKey}
                                    style={styles.tabEqual}
                                    onPress={() => handleTabPress(idx)}
                                    activeOpacity={0.7}
                                >
                                    <Text
                                        style={[styles.tabText, { color: homeColors.textSecondary }, isActive && { color: homeColors.textPrimary, fontWeight: '900' }]}
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
                                        {TAB_LABELS[tabKey]}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </View>
            </View>

            {/* PAGER WITH 3 ATTACHED PANELS */}
            <View style={{ flex: 1 }} {...swipeBackPanResponder.panHandlers}>
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
                contentContainerStyle={{ width: width * tabs.length }}
            >
                {/* TAB 0: TARKIB */}
                <View style={{ width, flex: 1 }}>
                    <ScrollView
                            showsVerticalScrollIndicator={false}
                            contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 10, paddingBottom: 60 }}
                            refreshControl={
                                <RefreshControl
                                    refreshing={refreshing}
                                    onRefresh={onRefresh}
                                    tintColor={homeColors.textPrimary}
                                    colors={[homeColors.accent || '#F59E0B']}
                                />
                            }
                        >
                        {isPlayersLoading ? (
                            <View style={styles.squadGrid}>
                                {[1, 2, 3, 4, 5, 6].map((key) => (
                                    <View key={key} style={[styles.playerCard, cardSurface, { opacity: 0.5 }]}>
                                        <View style={styles.playerPhotoContainer}>
                                            <View style={[styles.playerPhoto, { backgroundColor: homeColors.surface }]} />
                                        </View>
                                        <View style={styles.playerInfo}>
                                            <View style={{ width: '80%', height: 12, backgroundColor: homeColors.surface, borderRadius: 4, marginBottom: 4 }} />
                                            <View style={{ width: '50%', height: 10, backgroundColor: homeColors.surface, borderRadius: 4 }} />
                                        </View>
                                    </View>
                                ))}
                            </View>
                        ) : players.length > 0 ? (
                            <View style={styles.squadGrid}>
                                {players.map((player: any, idx: number) => {
                                    const pPhone = player.phone || player.phoneNumber || player.phone_number || player.tel;
                                    return (
                                        <View
                                            key={player._id || player.id || idx}
                                            style={[styles.playerCard, cardSurface]}
                                        >
                                            <TouchableOpacity
                                                activeOpacity={0.8}
                                                onPress={() => navigation.navigate('PlayerStats', { playerId: player._id || player.id, player })}
                                            >
                                                <View style={styles.playerPhotoContainer}>
                                                    <SmartImage uri={player.photo || player.photo_url || player.avatar} style={styles.playerPhoto} contentFit="cover" fallbackIcon="person" />
                                                    <View style={[styles.playerNumberBadge, { backgroundColor: homeColors.accent }]}>
                                                        <Text style={styles.playerNumberText}>#{player.number || player.player_number || player.shirt_number || '—'}</Text>
                                                    </View>
                                                </View>
                                                <View style={styles.playerInfo}>
                                                    <Text style={[styles.playerCardName, { color: homeColors.textPrimary }]} numberOfLines={1}>
                                                        {(player.firstName || player.name || player.first_name || t('teams.player_fallback')).toUpperCase()}
                                                    </Text>
                                                    <Text style={[styles.playerCardLastName, { color: homeColors.textPrimary }]} numberOfLines={1}>
                                                        {(player.lastName || player.last_name || '').toUpperCase()}
                                                    </Text>
                                                    <Text style={[styles.playerCardPosition, { color: homeColors.textSecondary }]}>{getLocalizedPosition(player.position, t).toUpperCase()}</Text>
                                                </View>
                                            </TouchableOpacity>
                                            {/* PHONE — FAQAT SHU JAMOA MENEJERIGA */}
                                            {canEdit && (
                                                <View style={{ marginTop: 8 }}>
                                                    {pPhone ? (
                                                        <TouchableOpacity
                                                            style={[styles.phoneBadgeContainer, { borderColor: homeColors.border }]}
                                                            activeOpacity={0.6}
                                                            onPress={() => Linking.openURL(`tel:${pPhone}`)}
                                                        >
                                                            <Ionicons name="call" size={12} color={homeColors.accent} style={{ marginRight: 5 }} />
                                                            <Text style={[styles.phoneBadgeText, { color: homeColors.textPrimary }]} numberOfLines={1}>{pPhone}</Text>
                                                        </TouchableOpacity>
                                                    ) : (
                                                        <TouchableOpacity
                                                            style={styles.addPhoneBtn}
                                                            activeOpacity={0.6}
                                                            onPress={() => {
                                                                setSelectedPlayerForPhone(player);
                                                                setPhoneInputText('');
                                                            }}
                                                        >
                                                            <Ionicons name="call-outline" size={10} color={homeColors.accent} style={{ marginRight: 3 }} />
                                                            <Text style={[styles.addPhoneBtnText, { color: homeColors.accent }]}>{t('teams.add_phone_short', '+ TEL')}</Text>
                                                        </TouchableOpacity>
                                                    )}
                                                </View>
                                            )}
                                        </View>
                                    );
                                })}
                            </View>
                        ) : (
                            <View style={[styles.emptyState, cardSurface]}>
                                <Ionicons name="people-outline" size={22} color={homeColors.textSecondary} />
                                <Text style={[styles.emptyStateText, { color: homeColors.textSecondary }]}>{t('teams.no_players')}</Text>
                            </View>
                        )}
                    </ScrollView>
                </View>

                {/* TAB 1: TAKTIKA */}
                <View style={{ width, flex: 1 }}>
                    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 10, paddingBottom: 60 }}>
                        {(team?.formation?.players && team.formation.players.length > 0) ? (
                            <TacticsBoard
                                formation={team?.formation}
                                players={team.formation.players.map((fp: any) => {
                                    const rosterMatch = players.find((p: any) => String(p.id) === String(fp.id));
                                    return {
                                        ...fp,
                                        photo: rosterMatch?.photo || (rosterMatch as any)?.photo_url || fp.photo || null,
                                    };
                                }) as any}
                                onPlayerPress={(player: any) => navigation.navigate('PlayerStats', { playerId: player.id || player._id, player })}
                            />
                        ) : (
                            <View style={[styles.emptyState, cardSurface, { marginTop: 10 }]}>
                                <Ionicons name="grid-outline" size={22} color={homeColors.textSecondary} />
                                <Text style={[styles.emptyStateText, { color: homeColors.textSecondary }]}>
                                    {t('teams.no_formation', 'Tarkib hali belgilanmagan')}
                                </Text>
                                {canEdit && (
                                    <TouchableOpacity
                                        style={[styles.emptyStateBtn, { backgroundColor: homeColors.accent }]}
                                        onPress={() => navigation.navigate('FormationBoard', { teamId: activeTeamId })}
                                    >
                                        <Text style={styles.emptyStateBtnText}>{t('teams.create_formation', 'Tarkibni tuzish')}</Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                        )}
                    </ScrollView>
                </View>

                {/* TAB 2: O'YINLAR */}
                <View style={{ width, flex: 1 }}>
                    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 10, paddingBottom: 60, gap: 12 }}>
                        {isMatchesLoading ? (
                            [1, 2, 3].map((key) => (
                                <View
                                    key={key}
                                    style={[
                                        styles.hMatchCard,
                                        {
                                            backgroundColor: homeColors.background,
                                            borderWidth: 1,
                                            borderColor: homeColors.border,
                                            opacity: 0.5,
                                        },
                                    ]}
                                >
                                    <View style={{ paddingHorizontal: 16, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                                        <View style={{ width: '35%', height: 14, backgroundColor: homeColors.surface, borderRadius: 4 }} />
                                        <View style={{ width: 40, height: 16, backgroundColor: homeColors.surface, borderRadius: 6 }} />
                                        <View style={{ width: '35%', height: 14, backgroundColor: homeColors.surface, borderRadius: 4 }} />
                                    </View>
                                </View>
                            ))
                        ) : matches.length > 0 ? (
                            matches.map((match: any) => {
                                const st = String(match.status || '').toLowerCase().trim();
                                const matchIsLive = ['live', 'first_half', 'second_half', 'half_time', 'halftime', 'ongoing', 'in_progress', '1st_half', '2nd_half', '1-taym', '2-taym', 'tanaffus'].includes(st);
                                const matchIsFinished = ['finished', 'completed', 'ended', 'tugadi'].includes(st);
                                const rawDate = match.date || match.match_date;
                                const matchDate = new Date(rawDate);
                                const isValidDate = !isNaN(matchDate.getTime());
                                const months = ['Yan', 'Fev', 'Mar', 'Apr', 'May', 'Iyun', 'Iyul', 'Avg', 'Sen', 'Okt', 'Noy', 'Dek'];
                                const day = isValidDate ? matchDate.getDate() : '';
                                const month = isValidDate ? months[matchDate.getMonth()] : '';
                                let formattedTime = String(match.match_time || match.time || '').trim();
                                if (formattedTime.includes(':')) {
                                    const timeParts = formattedTime.split(':');
                                    formattedTime = `${timeParts[0].padStart(2, '0')}:${(timeParts[1] || '00').padStart(2, '0')}`;
                                }
                                if (!formattedTime && isValidDate) {
                                    const hrs = String(matchDate.getHours()).padStart(2, '0');
                                    const mins = String(matchDate.getMinutes()).padStart(2, '0');
                                    if (hrs !== '00' || mins !== '00') formattedTime = `${hrs}:${mins}`;
                                }
                                if (!formattedTime) formattedTime = '18:00';

                                return (
                                    <TouchableOpacity
                                        key={match.id || match._id}
                                        style={[
                                            styles.hMatchCard,
                                            {
                                                backgroundColor: homeColors.background,
                                                borderWidth: 1,
                                                borderColor: matchIsLive ? homeColors.accent : homeColors.border,
                                            },
                                        ]}
                                        onPress={() => navigation.navigate('MatchDetail', { matchId: match.id || match._id })}
                                        activeOpacity={0.85}
                                    >
                                        <View style={{ paddingHorizontal: 16, paddingVertical: 12 }}>
                                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                                {/* CHAP: Uy jamoasi */}
                                                <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 4, paddingRight: 8 }}>
                                                    <Text style={{ fontSize: 11, fontWeight: '700', color: homeColors.textPrimary, letterSpacing: 0.1 }} numberOfLines={1}>
                                                        {match.homeTeamName || match.homeTeam?.name || t('matches.home_short', 'UY')}
                                                    </Text>
                                                    <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
                                                        <SmartImage
                                                            uri={match.homeTeamLogo || match.homeTeam?.logo}
                                                            style={{ width: 18, height: 18 }}
                                                            contentFit="contain"
                                                            fallbackIcon="shield-outline"
                                                        />
                                                    </View>
                                                </View>

                                                {/* O'RTA: Hisob yoki vaqt */}
                                                <View style={{ width: 70, alignItems: 'center' }}>
                                                    {(matchIsLive || matchIsFinished) ? (
                                                        <View style={{ alignItems: 'center' }}>
                                                            <Text style={{ fontSize: 22, fontWeight: '900', color: homeColors.textPrimary, letterSpacing: -0.5 }}>
                                                                {match.score?.home ?? match.home_score ?? 0} - {match.score?.away ?? match.away_score ?? 0}
                                                            </Text>
                                                            {matchIsLive && (
                                                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 2 }}>
                                                                    <View style={{ width: 5, height: 5, borderRadius: 2.5, backgroundColor: homeColors.accent }} />
                                                                    <Text style={{ fontSize: 8, fontWeight: '700', color: homeColors.accent, letterSpacing: 0.3 }}>LIVE</Text>
                                                                </View>
                                                            )}
                                                            {!!(match.round || match.tour) && (
                                                                <Text style={{ fontSize: 8, color: homeColors.textSecondary, marginTop: 2 }}>
                                                                    {match.round || match.tour}-{t('teams.tour_short', 'tur')}
                                                                </Text>
                                                            )}
                                                        </View>
                                                    ) : (
                                                        <View style={{ alignItems: 'center' }}>
                                                            <Text style={{ fontSize: 16, fontWeight: '700', color: homeColors.textPrimary, letterSpacing: -0.3 }}>
                                                                {formattedTime}
                                                            </Text>
                                                            <Text style={{ fontSize: 8, color: homeColors.textSecondary, marginTop: 1 }}>
                                                                {day} {month}
                                                            </Text>
                                                            {!!(match.round || match.tour) && (
                                                                <Text style={{ fontSize: 8, color: homeColors.textSecondary, marginTop: 1 }}>
                                                                    {match.round || match.tour}-{t('teams.tour_short', 'tur')}
                                                                </Text>
                                                            )}
                                                        </View>
                                                    )}
                                                </View>

                                                {/* O'NG: Mehmon jamoa */}
                                                <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start', gap: 4, paddingLeft: 8 }}>
                                                    <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
                                                        <SmartImage
                                                            uri={match.awayTeamLogo || match.awayTeam?.logo}
                                                            style={{ width: 18, height: 18 }}
                                                            contentFit="contain"
                                                            fallbackIcon="shield-outline"
                                                        />
                                                    </View>
                                                    <Text style={{ fontSize: 11, fontWeight: '700', color: homeColors.textPrimary, letterSpacing: 0.1 }} numberOfLines={1}>
                                                        {match.awayTeamName || match.awayTeam?.name || t('matches.away_short', 'MEH')}
                                                    </Text>
                                                </View>
                                            </View>
                                        </View>
                                    </TouchableOpacity>
                                );
                            })
                        ) : (
                            <View style={[styles.emptyState, cardSurface]}>
                                <Ionicons name="football-outline" size={22} color={homeColors.textSecondary} />
                                <Text style={[styles.emptyStateText, { color: homeColors.textSecondary }]}>{t('teams.no_matches', "O'yinlar tarixi mavjud emas")}</Text>
                            </View>
                        )}
                    </ScrollView>
                </View>
            </Animated.ScrollView>
            </View>

            {/* ADD PHONE MODAL */}
            <Modal
                visible={!!selectedPlayerForPhone}
                transparent
                animationType="fade"
                onRequestClose={() => setSelectedPlayerForPhone(null)}
            >
                <View style={styles.phoneModalOverlay}>
                    <View style={[styles.phoneModalCard, { backgroundColor: homeColors.background }]}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                            <Ionicons name="call" size={20} color={homeColors.accent} style={{ marginRight: 8 }} />
                            <Text style={[styles.phoneModalTitle, { color: homeColors.textPrimary }]}>{t('teams.add_phone_title', "TEL RAQAM QO'SHISH")}</Text>
                        </View>

                        <Text style={[styles.phoneModalSub, { color: homeColors.textSecondary }]}>
                            {t('teams.add_phone_sub', { name: selectedPlayerForPhone?.firstName || selectedPlayerForPhone?.first_name || selectedPlayerForPhone?.name || t('teams.player_fallback', "O'yinchi") })}
                        </Text>

                        <View style={[styles.phoneInputRow, { backgroundColor: homeColors.surface, borderColor: homeColors.border }]}>
                            <Text style={[styles.phonePrefixText, { color: homeColors.accent }]}>+998</Text>
                            <TextInput
                                style={[styles.phoneInput, { color: homeColors.textPrimary }]}
                                value={phoneInputText}
                                onChangeText={setPhoneInputText}
                                keyboardType="phone-pad"
                                maxLength={9}
                                placeholder="901234567"
                                placeholderTextColor={homeColors.textSecondary}
                                autoFocus
                            />
                        </View>

                        <View style={{ flexDirection: 'row', gap: 10, marginTop: 18, width: '100%' }}>
                            <TouchableOpacity
                                style={styles.cancelPhoneBtn}
                                onPress={() => setSelectedPlayerForPhone(null)}
                            >
                                <Ionicons name="close" size={18} color="#FF3B30" />
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.savePhoneBtn, { backgroundColor: homeColors.accent }]}
                                disabled={savingPhone}
                                onPress={async () => {
                                    if (!canEdit) {
                                        Alert.alert(t('common.error', 'Xato'), "Faqat o'z jamoangiz menejeri o'yinchilar telefon raqamini tahrirlay oladi!");
                                        setSelectedPlayerForPhone(null);
                                        return;
                                    }
                                    if (phoneInputText.length < 9) {
                                        Alert.alert(t('common.error', 'Xato'), t('teams.phone_length_error', 'Iltimos, 9 xonali telefon raqamini kiriting.'));
                                        return;
                                    }
                                    try {
                                        setSavingPhone(true);
                                        const fullPhone = `+998${phoneInputText.replace(/\D/g, '')}`;
                                        const pId = selectedPlayerForPhone.id || selectedPlayerForPhone._id;
                                        const res = await apiService.updatePlayerPhone(pId, fullPhone);
                                        if (res.success) {
                                            setPlayers((prev: any[]) => prev.map((p: any) => (p.id === pId || p._id === pId) ? { ...p, phone: fullPhone } : p));
                                            setSelectedPlayerForPhone(null);
                                            setPhoneInputText('');
                                            Alert.alert(t('common.success', 'Muvaffaqiyatli'), t('teams.phone_saved_success', 'Telefon raqami saqlandi!'));
                                        } else {
                                            Alert.alert(t('common.error', 'Xato'), res.error || 'Saqlashda xatolik');
                                        }
                                    } catch (err: any) {
                                        Alert.alert(t('common.error', 'Xato'), "Server bilan bog'lanishda xatolik");
                                    } finally {
                                        setSavingPhone(false);
                                    }
                                }}
                            >
                                {savingPhone ? (
                                    <ActivityIndicator size="small" color="#FFFFFF" />
                                ) : (
                                    <Ionicons name="checkmark" size={18} color="#FFFFFF" />
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

                </SafeAreaView>
            </Animated.View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    headerStickySection: {
        paddingHorizontal: 16,
        paddingTop: 8,
        paddingBottom: 0,
        borderBottomWidth: 1,
    },
    topRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    iconBtn: {
        width: 38,
        height: 38,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    unreadBadge: {
        position: 'absolute',
        top: -4,
        right: -4,
        backgroundColor: '#FF3B30',
        borderRadius: 9,
        minWidth: 18,
        height: 18,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 4,
    },
    unreadBadgeText: {
        color: '#FFFFFF',
        fontSize: 10,
        fontWeight: '900',
    },
    identityRowSticky: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
        gap: 12,
    },
    logoBoxSm: {
        width: 56,
        height: 56,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 4,
    },
    teamNameSm: {
        fontSize: 16,
        fontWeight: '900',
        letterSpacing: 0.3,
    },
    teamLeague: {
        fontSize: 11,
        fontWeight: '600',
        marginTop: 1,
    },
    leadershipRowSm: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    leadershipNameSm: {
        fontSize: 11,
        fontWeight: '600',
        flex: 1,
    },
    infoCard: {
        borderRadius: 14,
        paddingHorizontal: 14,
        paddingVertical: 8,
    },
    infoTopRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-around',
    },
    infoStat: {
        alignItems: 'center',
    },
    infoStatValue: {
        fontSize: 14,
        fontWeight: '900',
    },
    infoStatText: {
        fontSize: 13,
        fontWeight: '800',
        marginTop: 2,
    },
    infoStatLabel: {
        fontSize: 9,
        fontWeight: '700',
        letterSpacing: 0.4,
        marginTop: 1,
    },
    infoDivider: {
        width: 1,
        height: 20,
    },
    tabsContainer: {
        position: 'relative',
        marginTop: 4,
    },
    tabsRowContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        height: 40,
    },
    tabEqual: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        height: 40,
    },
    tabText: {
        fontSize: 12,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
    tabActiveLine: {
        position: 'absolute',
        bottom: 0,
        height: 2.5,
        borderRadius: 2,
    },
    squadGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        paddingTop: 4,
    },
    playerCard: {
        width: (width - 44) / 2,
        borderRadius: 16,
        padding: 10,
    },
    playerPhotoContainer: {
        width: '100%',
        aspectRatio: 1,
        borderRadius: 12,
        overflow: 'hidden',
        position: 'relative',
    },
    playerPhoto: {
        width: '100%',
        height: '100%',
    },
    playerNumberBadge: {
        position: 'absolute',
        top: 6,
        left: 6,
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 6,
    },
    playerNumberText: {
        color: '#FFFFFF',
        fontSize: 10,
        fontWeight: '900',
    },
    playerInfo: {
        marginTop: 8,
    },
    playerCardName: {
        fontSize: 12.5,
        fontWeight: '800',
        letterSpacing: 0.2,
    },
    playerCardLastName: {
        fontSize: 11,
        fontWeight: '700',
        opacity: 0.8,
    },
    playerCardPosition: {
        fontSize: 10,
        fontWeight: '600',
        marginTop: 2,
    },
    phoneBadgeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        borderWidth: 1,
    },
    phoneBadgeText: {
        fontSize: 10.5,
        fontWeight: '600',
    },
    addPhoneBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: 'rgba(0, 223, 130, 0.3)',
    },
    addPhoneBtnText: {
        fontSize: 9.5,
        fontWeight: '800',
    },
    emptyState: {
        borderRadius: 18,
        padding: 32,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    emptyStateText: {
        fontSize: 13,
        fontWeight: '600',
        textAlign: 'center',
    },
    emptyStateBtn: {
        marginTop: 10,
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 10,
    },
    emptyStateBtnText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '800',
    },
    hMatchCard: {
        borderRadius: 16,
        overflow: 'hidden',
    },
    phoneModalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    phoneModalCard: {
        width: '100%',
        maxWidth: 320,
        borderRadius: 20,
        padding: 20,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    phoneModalTitle: {
        fontSize: 14,
        fontWeight: '900',
        letterSpacing: 0.3,
    },
    phoneModalSub: {
        fontSize: 12,
        marginBottom: 14,
    },
    phoneInputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 12,
        borderWidth: 1,
        paddingHorizontal: 12,
        height: 44,
    },
    phonePrefixText: {
        fontSize: 14,
        fontWeight: '800',
        marginRight: 6,
    },
    phoneInput: {
        flex: 1,
        fontSize: 14,
        fontWeight: '700',
    },
    cancelPhoneBtn: {
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: 'rgba(255, 59, 48, 0.12)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    savePhoneBtn: {
        flex: 1,
        height: 44,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
    },
    emptyContent: {
        alignItems: 'center',
        gap: 12,
    },
    emptyTitle: {
        fontSize: 16,
        fontWeight: '900',
        letterSpacing: 0.5,
    },
    loginBtn: {
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 12,
        marginTop: 8,
    },
    loginBtnText: {
        color: '#FFFFFF',
        fontSize: 13,
        fontWeight: '800',
    },
});
