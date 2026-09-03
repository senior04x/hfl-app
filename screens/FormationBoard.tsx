import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Dimensions,
    ActivityIndicator,
    Alert,
    ScrollView,
    RefreshControl,
    Platform,
    PanResponder,
    StatusBar,
    Animated as RNAnimated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiService, supabase } from '../services/apiService';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import SmartImage from '../components/SmartImage';
import Skeleton from '../components/Skeleton';
import {
    GestureHandlerRootView,
    GestureDetector,
    Gesture
} from 'react-native-gesture-handler';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    runOnJS,
    withSpring,
} from 'react-native-reanimated';
import { useSocket } from '../context/SocketContext';
import { useAuthStore } from '../store/useAuthStore';
import { useThemeStore } from '../store/useThemeStore';
import { getHomeScreenColors } from '../constants/homeTheme';
import { useTranslation } from 'react-i18next';
import {
    MatchFormat,
    FORMATION_PRESETS,
    FormationPreset,
    getPositionCategory,
    PES_POSITION_THEMES,
} from '../utils/formationPresets';
import { calculateFifaAttributes } from '../utils/playerCardUtils';
import { getLocalizedPosition } from '../utils/localizationUtils';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const FIELD_WIDTH = SCREEN_WIDTH - 32;
const FIELD_HEIGHT = FIELD_WIDTH * 1.34;

export const computePlayerStatsAndRating = (player: any, allEvents: any[] = [], teamMatchesCount: number = 0) => {
    if (!player) return { goals: 0, assists: 0, yellowCards: 0, redCards: 0, rating: '7.0' };

    const pId = String(player.id || player._id);
    const pEvents = allEvents.filter((e: any) => String(e.player_id) === pId);

    const goals = pEvents.filter((e: any) => String(e.event_type || '').toLowerCase() === 'goal').length;
    const assists = pEvents.filter((e: any) => String(e.event_type || '').toLowerCase() === 'assist').length;
    const yellowCards = pEvents.filter((e: any) => {
        const t = String(e.event_type || '').toLowerCase();
        return t === 'yellow_card' || t === 'yellowcard' || t === 'yellow';
    }).length;
    const redCards = pEvents.filter((e: any) => {
        const t = String(e.event_type || '').toLowerCase();
        return t === 'red_card' || t === 'redcard' || t === 'red';
    }).length;

    // Direct database rating check (from PlayerStatsScreen logic)
    if (player.rating !== undefined && player.rating !== null && Number(player.rating) > 0) {
        const n = Number(player.rating);
        return {
            goals,
            assists,
            yellowCards,
            redCards,
            rating: (n <= 10 ? n : n / 10).toFixed(1)
        };
    }

    // Match events score calculation (from apiService.getPlayerStats / PlayerStatsScreen)
    let calculatedRating = 0;
    if (teamMatchesCount > 0) {
        const rawScore = (goals * 0.5) + (assists * 0.3) - (yellowCards * 0.2) - (redCards * 0.5);
        if (teamMatchesCount >= 3) {
            calculatedRating = 5.0 + (rawScore / teamMatchesCount) * 3;
        } else {
            calculatedRating = 5.0 + rawScore;
        }
        calculatedRating = Math.min(10.0, Math.max(1.0, calculatedRating));
        calculatedRating = Math.round(calculatedRating * 10) / 10;
    }

    if (calculatedRating > 0) {
        return {
            goals,
            assists,
            yellowCards,
            redCards,
            rating: calculatedRating.toFixed(1)
        };
    }

    // Fallback: FIFA OVR scaled to 10
    const ovr = calculateFifaAttributes(player).ovr || 72;
    return {
        goals,
        assists,
        yellowCards,
        redCards,
        rating: (ovr / 10).toFixed(1)
    };
};

export const getPlayerRatingScore = (player: any): string => {
    return computePlayerStatsAndRating(player).rating;
};

export interface PitchPlayer {
    id: string;
    name: string;
    firstName?: string;
    lastName?: string;
    number?: string | number;
    photo?: string | null;
    position?: string;
    role?: string;
    rating?: string | number;
    ovr?: number;
    x: number; // 0 to 100 percentage
    y: number; // 0 to 100 percentage
}

// Global in-memory cache to guarantee 0ms instant render without skeleton flash
const globalFormationMemoryCache: Record<string, any> = {};

export default function FormationBoard({ route, navigation }: any) {
    const { t } = useTranslation();
    const { teamId, isReadOnly: initialReadOnly = false } = route.params || {};
    const { user } = useAuthStore();
    const isReadOnly = route.params?.isReadOnly || user?.role === 'player';
    const { isDark } = useThemeStore();
    const homeColors = getHomeScreenColors(isDark);
    const lineColor = isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.22)';
    const grassStripeColor = isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)';

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

    const targetTeamId = teamId || user?.team_id || user?.teamId;
    const initialMem = targetTeamId ? globalFormationMemoryCache[targetTeamId] : null;

    const [loading, setLoading] = useState(!initialMem?.players?.length);
    const [playersOnPitch, setPlayersOnPitch] = useState<PitchPlayer[]>(initialMem?.players || []);
    const [availablePlayers, setAvailablePlayers] = useState<any[]>(initialMem?.availablePlayers || []);
    const [saving, setSaving] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);

    // Format & Preset State
    const [selectedFormat, setSelectedFormat] = useState<MatchFormat>(initialMem?.format || '8v8');
    const [selectedPresetId, setSelectedPresetId] = useState<string>(initialMem?.presetId || '8v8_2-3-2');
    const { socket } = useSocket();

    // Real-time Interactive Swipe-to-Back (Right Swipe)
    const swipeBackAnim = useRef(new RNAnimated.Value(0)).current;

    const swipeBackPanResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponderCapture: () => false,
            onMoveShouldSetPanResponderCapture: (evt, gestureState) => {
                const isHorizontal = gestureState.dx > 12 && Math.abs(gestureState.dx) > Math.abs(gestureState.dy) * 1.3;
                const isFromLeft = evt.nativeEvent.pageX < 75 || isHorizontal;
                return isHorizontal && isFromLeft;
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
                    RNAnimated.timing(swipeBackAnim, {
                        toValue: SCREEN_WIDTH,
                        duration: 180,
                        useNativeDriver: true,
                    }).start(() => {
                        navigation.goBack();
                    });
                } else {
                    RNAnimated.spring(swipeBackAnim, {
                        toValue: 0,
                        friction: 8,
                        tension: 45,
                        useNativeDriver: true,
                    }).start();
                }
            },
            onPanResponderTerminate: () => {
                RNAnimated.spring(swipeBackAnim, {
                    toValue: 0,
                    friction: 8,
                    tension: 45,
                    useNativeDriver: true,
                }).start();
            },
            onPanResponderTerminationRequest: () => true,
        })
    ).current;


    const currentPresets = useMemo(() => {
        return FORMATION_PRESETS[selectedFormat] || FORMATION_PRESETS['8v8'];
    }, [selectedFormat]);

    const activePreset = useMemo(() => {
        return currentPresets.find(p => p.id === selectedPresetId) || currentPresets[0];
    }, [currentPresets, selectedPresetId]);

    // Average Team Rating on pitch (10-scale)
    const averagePitchRating = useMemo(() => {
        if (playersOnPitch.length === 0) return '0.0';
        const total = playersOnPitch.reduce((sum, p) => sum + parseFloat(String(p.rating || 7.0)), 0);
        return (total / playersOnPitch.length).toFixed(1);
    }, [playersOnPitch]);

    const maxPitchPlayers = useMemo(() => {
        switch (selectedFormat) {
            case '5v5': return 5;
            case '6v6': return 6;
            case '7v7': return 7;
            case '8v8': return 8;
            case '11v11': return 11;
            default: return 8;
        }
    }, [selectedFormat]);

    // Sorted Players List: Primary by Rating Descending, Secondary by Position (GK -> DEF -> MID -> ATT)
    const sortedAvailablePlayers = useMemo(() => {
        const positionOrderMap: Record<string, number> = {
            GK: 1,
            DEF: 2,
            MID: 3,
            ATT: 4,
        };

        return [...availablePlayers].sort((a, b) => {
            // 1. Rating comparison (Highest rating first)
            const ratingA = parseFloat(String(a.rating || a.stats?.rating || getPlayerRatingScore(a) || '0'));
            const ratingB = parseFloat(String(b.rating || b.stats?.rating || getPlayerRatingScore(b) || '0'));

            if (Math.abs(ratingB - ratingA) > 0.01) {
                return ratingB - ratingA;
            }

            // 2. Position comparison (GK -> DEF -> MID -> ATT)
            const catA = getPositionCategory(a.position || a.role);
            const catB = getPositionCategory(b.position || b.role);
            const orderA = positionOrderMap[catA] || 5;
            const orderB = positionOrderMap[catB] || 5;

            if (orderA !== orderB) {
                return orderA - orderB;
            }

            // 3. Name comparison (alphabetical)
            const nameA = (a.firstName || a.name || '').toLowerCase();
            const nameB = (b.firstName || b.name || '').toLowerCase();
            return nameA.localeCompare(nameB);
        });
    }, [availablePlayers]);

    const onRefresh = async () => {
        setRefreshing(true);
        try {
            await fetchData(true);
        } catch (e) {
            console.log('Refresh error:', e);
        } finally {
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchData();

        if (socket && (teamId || user?.teamId)) {
            const activeTeamId = teamId || user?.teamId;
            socket.on('formation-updated', (data: any) => {
                if (data.teamId === activeTeamId && data.formation?.players) {
                    setPlayersOnPitch(data.formation.players);
                }
            });
            return () => {
                socket.off('formation-updated');
            };
        }
    }, [teamId, user, socket]);

    const getFormationCacheKey = (tId: string) => `@amatora_formation_cache_${tId}`;

    const fetchData = async () => {
        let targetTeamId = teamId || user?.team_id || user?.teamId;

        if (!targetTeamId && user) {
            const phoneVal = user.phone || user.captain_phone;
            if (phoneVal) {
                const cleanPhone = String(phoneVal).replace(/\D/g, '').slice(-9);
                const { data: teamRow } = await supabase
                    .from('teams')
                    .select('id')
                    .ilike('captain_phone', `%${cleanPhone}%`)
                    .limit(1);

                if (teamRow && teamRow.length > 0) {
                    targetTeamId = teamRow[0].id;
                } else {
                    const { data: appRow } = await supabase
                        .from('applications')
                        .select('team_id')
                        .ilike('phone', `%${cleanPhone}%`)
                        .limit(1);
                    if (appRow && appRow.length > 0) {
                        targetTeamId = appRow[0].team_id;
                    }
                }
            }
        }

        // 1. TEZKOR KESHNI O'QISH (Instant Cache Load)
        if (targetTeamId) {
            try {
                const cachedStr = await AsyncStorage.getItem(getFormationCacheKey(targetTeamId));
                if (cachedStr) {
                    const cached = JSON.parse(cachedStr);
                    globalFormationMemoryCache[targetTeamId] = {
                        ...globalFormationMemoryCache[targetTeamId],
                        ...cached,
                    };
                    if (cached.players && Array.isArray(cached.players) && cached.players.length > 0) {
                        setPlayersOnPitch(cached.players);
                        setLoading(false);
                    }
                    if (cached.availablePlayers && Array.isArray(cached.availablePlayers)) {
                        setAvailablePlayers(cached.availablePlayers);
                    }
                    if (cached.format) {
                        setSelectedFormat(cached.format);
                    }
                    if (cached.presetId) {
                        setSelectedPresetId(cached.presetId);
                    }
                    setLoading(false);
                }
            } catch (e) {
                console.log('Formation cache read error:', e);
            }
        }

        try {
            if ((!playersOnPitch || playersOnPitch.length === 0) && !globalFormationMemoryCache[targetTeamId]?.players?.length) {
                setLoading(true);
            }

            let teamPlayers: any[] = [];
            let team: any = null;
            let allMatchEvents: any[] = [];
            let teamMatchesCount = 0;

            if (targetTeamId) {
                const [tRes, pRes, homeRes, awayRes] = await Promise.all([
                    apiService.getTeamById(targetTeamId),
                    apiService.getPlayersByTeam(targetTeamId),
                    supabase.from('matches').select('id', { count: 'exact', head: true }).eq('home_team_id', targetTeamId),
                    supabase.from('matches').select('id', { count: 'exact', head: true }).eq('away_team_id', targetTeamId)
                ]);
                team = tRes;
                teamPlayers = pRes || [];
                teamMatchesCount = (homeRes.count || 0) + (awayRes.count || 0);

                const playerIds = (teamPlayers || []).map((p: any) => p.id || p._id);
                if (playerIds.length > 0) {
                    const { data: eventsData } = await supabase
                        .from('match_events')
                        .select('*')
                        .in('player_id', playerIds);
                    allMatchEvents = eventsData || [];
                }
            }

            const activeTeamPlayers = (teamPlayers || []).filter((p: any) => {
                const st = String(p.status || '').toLowerCase().trim();
                const isArchived = p.is_archived === true || st === 'archived' || st === 'arxivlangan';
                return !isArchived && st === 'approved';
            }).map((p: any) => {
                const statsObj = computePlayerStatsAndRating(p, allMatchEvents, teamMatchesCount);
                return {
                    ...p,
                    stats: statsObj,
                    rating: statsObj.rating,
                };
            });

            setAvailablePlayers(activeTeamPlayers);

            let detectedFormat: MatchFormat = '8v8';
            let detectedPresetId = '8v8_2-3-2';

            if (activeTeamPlayers.length <= 6 && activeTeamPlayers.length > 0) {
                detectedFormat = '6v6';
                detectedPresetId = '6v6_2-2-1';
            } else if (activeTeamPlayers.length === 7) {
                detectedFormat = '7v7';
                detectedPresetId = '7v7_2-3-1';
            } else if (activeTeamPlayers.length >= 12) {
                detectedFormat = '11v11';
                detectedPresetId = '11v11_4-3-3';
            } else {
                detectedFormat = '8v8';
                detectedPresetId = '8v8_2-3-2';
            }

            if (team?.formation?.format) {
                detectedFormat = team.formation.format;
            }

            setSelectedFormat(detectedFormat);
            setSelectedPresetId(detectedPresetId);

            let finalEnrichedFormation: PitchPlayer[] = [];

            if (team?.formation?.players && Array.isArray(team.formation.players) && team.formation.players.length > 0) {
                finalEnrichedFormation = team.formation.players.map((fp: any) => {
                    const matchedRoster = activeTeamPlayers.find((p: any) => String(p.id || p._id) === String(fp.id));
                    const ratingScore = matchedRoster?.rating || fp.rating || computePlayerStatsAndRating(matchedRoster || fp, allMatchEvents, teamMatchesCount).rating;
                    return {
                        ...fp,
                        photo: matchedRoster?.photo || matchedRoster?.photo_url || matchedRoster?.avatar || fp.photo || null,
                        number: matchedRoster?.number || matchedRoster?.player_number || fp.number || '',
                        rating: ratingScore,
                        position: matchedRoster?.position || fp.position,
                        role: fp.role || getPositionCategory(matchedRoster?.position || fp.position),
                    };
                });
                setPlayersOnPitch(finalEnrichedFormation);
            }
            // 2. KESHNI YANGILASH (Save fetched data to cache)
            if (targetTeamId) {
                globalFormationMemoryCache[targetTeamId] = {
                    players: finalEnrichedFormation.length > 0 ? finalEnrichedFormation : playersOnPitch,
                    availablePlayers: activeTeamPlayers,
                    format: detectedFormat,
                    presetId: detectedPresetId,
                };
                AsyncStorage.setItem(getFormationCacheKey(targetTeamId), JSON.stringify({
                    players: finalEnrichedFormation.length > 0 ? finalEnrichedFormation : playersOnPitch,
                    availablePlayers: activeTeamPlayers,
                    format: detectedFormat,
                    presetId: detectedPresetId,
                })).catch(() => {});
            }
        } catch (error) {
            console.error('Error fetching formation data:', error);
        } finally {
            setLoading(false);
        }
    };

    // Switch Preset Scheme
    const handleSelectPreset = (preset: FormationPreset) => {
        try {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        } catch (e) {}

        setSelectedPresetId(preset.id);

        if (playersOnPitch.length > 0) {
            const remapped = playersOnPitch.map((player, idx) => {
                const slot = preset.slots[idx] || preset.slots[preset.slots.length - 1];
                return {
                    ...player,
                    role: slot?.role || player.role,
                    x: slot ? slot.x : player.x,
                    y: slot ? slot.y : player.y,
                };
            });
            setPlayersOnPitch(remapped);
        }
    };

    // Switch Format (e.g. 5v5 -> 8v8)
    const handleSelectFormat = (fmt: MatchFormat) => {
        try {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        } catch (e) {}

        setSelectedFormat(fmt);
        const presets = FORMATION_PRESETS[fmt] || [];
        if (presets.length > 0) {
            setSelectedPresetId(presets[0].id);
        }
    };

    const handleSave = async () => {
        try {
            setSaving(true);
            let targetId = teamId || user?.team_id || user?.teamId;

            if (!targetId && user) {
                const phoneVal = user.phone || user.captain_phone;
                if (phoneVal) {
                    const cleanPhone = String(phoneVal).replace(/\D/g, '').slice(-9);
                    const { data: teamRow } = await supabase
                        .from('teams')
                        .select('id')
                        .ilike('captain_phone', `%${cleanPhone}%`)
                        .limit(1);
                    if (teamRow && teamRow.length > 0) {
                        targetId = teamRow[0].id;
                    }
                }
            }

            if (!targetId) {
                Alert.alert(t('common.error', 'Xato'), 'Jamoa aniqlanmadi.');
                return;
            }

            const response = await apiService.updateFormation(targetId, {
                players: playersOnPitch,
                format: selectedFormat,
                preset: activePreset.name,
            });

            if (response.success) {
                // Also sync team formation cache for MyTeamScreen instant load
                AsyncStorage.getItem(`@amatora_team_cache_${targetId}`).then((cStr) => {
                    const existing = cStr ? JSON.parse(cStr) : {};
                    const existingTeam = existing.team || {};
                    AsyncStorage.setItem(`@amatora_team_cache_${targetId}`, JSON.stringify({
                        ...existing,
                        team: {
                            ...existingTeam,
                            formation: {
                                players: playersOnPitch,
                                format: selectedFormat,
                                preset: activePreset.name,
                            }
                        }
                    })).catch(() => {});
                }).catch(() => {});

                globalFormationMemoryCache[targetId] = {
                    players: playersOnPitch,
                    availablePlayers,
                    format: selectedFormat,
                    presetId: selectedPresetId,
                    preset: activePreset.name,
                };
                AsyncStorage.setItem(getFormationCacheKey(targetId), JSON.stringify({
                    players: playersOnPitch,
                    availablePlayers,
                    format: selectedFormat,
                    presetId: selectedPresetId,
                    preset: activePreset.name,
                })).catch(() => {});

                if (socket) {
                    socket.emit('update-formation', {
                        teamId: targetId,
                        formation: {
                            players: playersOnPitch,
                            format: selectedFormat,
                            preset: activePreset.name,
                        },
                    });
                }

                try {
                    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                } catch (e) {}

                navigation.goBack();
            } else {
                Alert.alert(t('common.error', 'Xato'), response.error || 'Tarkibni saqlashda xatolik yuz berdi.');
            }
        } catch (error) {
            console.error('Error saving formation:', error);
            Alert.alert(t('common.error', 'Xato'), "Server bilan bog'lanishda xatolik");
        } finally {
            setSaving(false);
        }
    };

    const updatePlayerPosition = (id: string, x: number, y: number) => {
        const xPercent = (x / FIELD_WIDTH) * 100;
        const yPercent = (y / FIELD_HEIGHT) * 100;

        setPlayersOnPitch(prev => prev.map(p =>
            p.id === id ? { ...p, x: xPercent, y: yPercent } : p
        ));
    };

    const handlePlayerPress = (player: PitchPlayer) => {
        if (isReadOnly) return;
        try {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        } catch (e) {}

        if (selectedPlayerId === player.id) {
            setSelectedPlayerId(null);
        } else {
            setSelectedPlayerId(player.id);
        }
    };

    // Swap or Add Bench Player
    const handleBenchPlayerPress = (benchPlayer: any) => {
        if (isReadOnly) return;
        try {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        } catch (e) {}

        const bId = String(benchPlayer._id || benchPlayer.id);
        const isOnPitch = playersOnPitch.some(p => p.id === bId);
        if (isOnPitch) return;

        const rating = getPlayerRatingScore(benchPlayer);
        const cat = getPositionCategory(benchPlayer.position);
        const name = (benchPlayer.firstName || benchPlayer.name || 'O\'yinchi').trim();
        const photo = benchPlayer.photo || benchPlayer.photo_url || benchPlayer.avatar || null;
        const number = benchPlayer.number || benchPlayer.player_number || benchPlayer.shirt_number || '-';

        if (selectedPlayerId) {
            // SWAP selected pitch player with this bench player
            setPlayersOnPitch(prev => prev.map(p => {
                if (p.id === selectedPlayerId) {
                    return {
                        ...p,
                        id: bId,
                        name,
                        firstName: name,
                        lastName: benchPlayer.lastName || benchPlayer.last_name || '',
                        number,
                        photo,
                        position: benchPlayer.position,
                        role: p.role || cat,
                        rating,
                    };
                }
                return p;
            }));
            setSelectedPlayerId(null);
        } else {
            // ADD to pitch if under max
            if (playersOnPitch.length >= maxPitchPlayers) {
                Alert.alert(
                    'Maydon to\'la',
                    `Maydonda maksimal ${maxPitchPlayers} ta o'yinchi bo'lishi mumkin. O'yinchi almashtirish uchun maydondagi o'yinchini tanlang.`
                );
                return;
            }

            const nextSlotIndex = playersOnPitch.length;
            const slot = activePreset.slots[nextSlotIndex] || { role: cat, x: 50, y: 50 };

            const newPitchPlayer: PitchPlayer = {
                id: bId,
                name,
                firstName: name,
                lastName: benchPlayer.lastName || benchPlayer.last_name || '',
                number,
                photo,
                position: benchPlayer.position,
                role: slot.role,
                rating,
                x: slot.x,
                y: slot.y,
            };

            setPlayersOnPitch([...playersOnPitch, newPitchPlayer]);
        }
    };

    const removePlayerFromPitch = (id: string) => {
        try {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        } catch (e) {}
        setPlayersOnPitch(playersOnPitch.filter(p => p.id !== id));
        if (selectedPlayerId === id) setSelectedPlayerId(null);
    };

    if (loading) {
        return (
            <GestureHandlerRootView style={{ flex: 1 }}>
                <SafeAreaView style={[styles.container, { backgroundColor: homeColors.background }]} edges={['top']}>
                    {/* HEADER SKELETON — real header bilan bir xil o'lcham */}
                    <View style={styles.header}>
                        <Skeleton width={38} height={38} borderRadius={12} />
                        <View style={{ alignItems: 'center' }}>
                            <Skeleton width={130} height={14} borderRadius={4} style={{ marginBottom: 5 }} />
                            <Skeleton width={80} height={11} borderRadius={4} />
                        </View>
                        {!isReadOnly ? (
                            <Skeleton width={76} height={34} borderRadius={10} />
                        ) : (
                            <View style={{ width: 40 }} />
                        )}
                    </View>

                    <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                            tintColor={homeColors.textPrimary}
                            colors={[homeColors.accent || '#F59E0B']}
                        />
                    }
                >
                        {/* FORMAT CONTROLS SKELETON */}
                        {!isReadOnly && (
                            <View style={styles.controlBarContainer}>
                                <View style={[styles.formatScroll, { flexDirection: 'row' }]}>
                                    {[0, 1, 2, 3, 4].map((i) => (
                                        <Skeleton key={i} width={52} height={28} borderRadius={8} />
                                    ))}
                                </View>
                            </View>
                        )}

                        {/* FORMATION PRESETS SKELETON */}
                        {!isReadOnly && (
                            <View style={styles.presetsTrayContainer}>
                                <View style={[styles.presetsScroll, { flexDirection: 'row' }]}>
                                    {[0, 1, 2].map((i) => (
                                        <Skeleton key={i} width={90} height={30} borderRadius={10} />
                                    ))}
                                </View>
                            </View>
                        )}

                        {/* TACTICAL PITCH SKELETON — haqiqiy maydon bilan AYNAN bir xil o'lcham */}
                        <View style={styles.fieldWrapper}>
                            <Skeleton width={FIELD_WIDTH} height={FIELD_HEIGHT} borderRadius={16} />
                        </View>

                        {/* SQUAD STATUS BAR SKELETON */}
                        <View style={[styles.squadStatusBar, cardSurface]}>
                            <View style={styles.statusItem}>
                                <Skeleton width={55} height={9} borderRadius={3} style={{ marginBottom: 4 }} />
                                <Skeleton width={30} height={13} borderRadius={4} />
                            </View>
                            <View style={[styles.statusDivider, { backgroundColor: homeColors.border }]} />
                            <View style={styles.statusItem}>
                                <Skeleton width={65} height={9} borderRadius={3} style={{ marginBottom: 4 }} />
                                <Skeleton width={30} height={13} borderRadius={4} />
                            </View>
                            <View style={[styles.statusDivider, { backgroundColor: homeColors.border }]} />
                            <View style={styles.statusItem}>
                                <Skeleton width={45} height={9} borderRadius={3} style={{ marginBottom: 4 }} />
                                <Skeleton width={40} height={13} borderRadius={4} />
                            </View>
                        </View>

                        {/* BENCH / SUBSTITUTES SKELETON */}
                        <View style={styles.subsSection}>
                            <View style={styles.subsHeader}>
                                <Skeleton width={90} height={13} borderRadius={4} />
                                <Skeleton width={34} height={18} borderRadius={8} />
                            </View>

                            <View style={styles.subsListVertical}>
                                {[0, 1, 2, 3, 4, 5].map((i) => (
                                    <View key={i} style={[styles.subRowCard, cardSurface]}>
                                        <View style={styles.subRowPhotoContainer}>
                                            <Skeleton width={40} height={40} circle />
                                        </View>
                                        <View style={styles.subRowInfo}>
                                            <Skeleton width="65%" height={13} borderRadius={4} style={{ marginBottom: 5 }} />
                                            <Skeleton width="35%" height={10} borderRadius={3} />
                                        </View>
                                        <Skeleton width={44} height={22} borderRadius={8} style={{ marginRight: 4 }} />
                                        <Skeleton width={26} height={26} borderRadius={13} />
                                    </View>
                                ))}
                            </View>
                        </View>
                    </ScrollView>
                </SafeAreaView>
            </GestureHandlerRootView>
        );
    }

    return (
        <View style={{ flex: 1, backgroundColor: 'transparent' }}>
            <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} translucent backgroundColor="transparent" />

            <RNAnimated.View
                style={{
                    flex: 1,
                    backgroundColor: homeColors.background,
                    transform: [{ translateX: swipeBackAnim }],
                    shadowColor: '#000000',
                    shadowOffset: { width: -4, height: 0 },
                    shadowOpacity: isDark ? 0.4 : 0.15,
                    shadowRadius: 10,
                    elevation: 10,
                }}
                {...swipeBackPanResponder.panHandlers}
            >
                <GestureHandlerRootView style={{ flex: 1 }}>
                    <SafeAreaView style={[styles.container, { backgroundColor: homeColors.background }]} edges={['top']}>
                {/* HEADER */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.iconBtn, cardSurface]}>
                        <Ionicons name="arrow-back" size={20} color={homeColors.textPrimary} />
                    </TouchableOpacity>

                    <View style={{ alignItems: 'center' }}>
                        <Text style={[styles.headerTitle, { color: homeColors.textPrimary }]}>
                            {isReadOnly ? t('teams.squad') : t('teams.edit_formation')}
                        </Text>
                        <Text style={[styles.headerSub, { color: homeColors.textSecondary }]}>
                            {activePreset.name} • {selectedFormat}
                        </Text>
                    </View>

                    {!isReadOnly ? (
                        <TouchableOpacity
                            onPress={handleSave}
                            disabled={saving}
                            style={[styles.saveBtn, { backgroundColor: homeColors.textPrimary }]}
                        >
                            {saving ? (
                                <ActivityIndicator size="small" color={isDark ? '#000000' : '#FFFFFF'} />
                            ) : (
                                <Text style={[styles.saveBtnText, { color: isDark ? '#000000' : '#FFFFFF' }]}>
                                    {t('common.save', 'Saqlash')}
                                </Text>
                            )}
                        </TouchableOpacity>
                    ) : (
                        <View style={{ width: 40 }} />
                    )}
                </View>

                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                    {/* FORMAT CONTROLS BAR (AVTO-TARKIB BUTTON REMOVED) */}
                    {!isReadOnly && (
                        <View style={styles.controlBarContainer}>
                            <ScrollView
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                contentContainerStyle={styles.formatScroll}
                            >
                                {(['5v5', '6v6', '7v7', '8v8', '11v11'] as MatchFormat[]).map((fmt) => {
                                    const isSelected = selectedFormat === fmt;
                                    return (
                                        <TouchableOpacity
                                            key={fmt}
                                            style={[
                                                styles.formatPill,
                                                cardSurface,
                                                isSelected && {
                                                    borderColor: homeColors.textPrimary,
                                                    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)'
                                                }
                                            ]}
                                            onPress={() => handleSelectFormat(fmt)}
                                        >
                                            <Text style={[styles.formatPillText, { color: isSelected ? homeColors.textPrimary : homeColors.textSecondary }]}>
                                                {fmt}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </ScrollView>
                        </View>
                    )}

                    {/* FORMATION PRESETS HORIZONTAL TRAY */}
                    {!isReadOnly && (
                        <View style={styles.presetsTrayContainer}>
                            <ScrollView
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                contentContainerStyle={styles.presetsScroll}
                            >
                                {currentPresets.map((preset) => {
                                    const isSelected = selectedPresetId === preset.id;
                                    return (
                                        <TouchableOpacity
                                            key={preset.id}
                                            style={[
                                                styles.presetChip,
                                                cardSurface,
                                                isSelected && {
                                                    borderColor: homeColors.textPrimary,
                                                    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)',
                                                }
                                            ]}
                                            onPress={() => handleSelectPreset(preset)}
                                            activeOpacity={0.7}
                                        >
                                            <MaterialCommunityIcons
                                                name="soccer-field"
                                                size={16}
                                                color={isSelected ? homeColors.textPrimary : homeColors.textSecondary}
                                                style={{ marginRight: 5 }}
                                            />
                                            <Text style={[styles.presetChipText, { color: isSelected ? homeColors.textPrimary : homeColors.textSecondary }]}>
                                                {preset.name}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </ScrollView>
                        </View>
                    )}

                    {/* TACTICAL PITCH */}
                    <View style={styles.fieldWrapper}>
                        <View style={[styles.field, { backgroundColor: isDark ? '#0D151E' : '#E8EEF5', borderColor: lineColor }]}>
                            {/* GRASS STRIPES */}
                            {[0, 1, 2, 3, 4, 5].map((i) => (
                                <View
                                    key={i}
                                    style={[
                                        styles.grassStripe,
                                        { top: `${i * 16.66}%`, backgroundColor: i % 2 === 0 ? grassStripeColor : 'transparent' }
                                    ]}
                                />
                            ))}

                            {/* PITCH MARKINGS */}
                            <View style={[styles.outerBorder, { borderColor: lineColor }]} />
                            <View style={[styles.penaltyAreaTop, { borderColor: lineColor }]} />
                            <View style={[styles.goalAreaTop, { borderColor: lineColor }]} />
                            <View style={[styles.centerLine, { backgroundColor: lineColor }]} />
                            <View style={[styles.centerCircle, { borderColor: lineColor }]} />
                            <View style={[styles.penaltyAreaBottom, { borderColor: lineColor }]} />
                            <View style={[styles.goalAreaBottom, { borderColor: lineColor }]} />

                            {/* DRAGGABLE TACTICAL PLAYERS */}
                            {playersOnPitch.map((player) => (
                                <PesDraggablePlayer
                                    key={player.id}
                                    player={player}
                                    isSelected={selectedPlayerId === player.id}
                                    onPositionChange={updatePlayerPosition}
                                    onPress={() => handlePlayerPress(player)}
                                    onRemove={() => removePlayerFromPitch(player.id)}
                                    isReadOnly={isReadOnly}
                                    homeColors={homeColors}
                                    t={t}
                                />
                            ))}
                        </View>
                    </View>

                    {/* SQUAD INFO BAR */}
                    <View style={[styles.squadStatusBar, cardSurface]}>
                        <View style={styles.statusItem}>
                            <Text style={[styles.statusLabel, { color: homeColors.textSecondary }]}>O'YINCHILAR</Text>
                            <Text style={[styles.statusValue, { color: homeColors.textPrimary }]}>
                                {playersOnPitch.length} / {maxPitchPlayers}
                            </Text>
                        </View>

                        <View style={[styles.statusDivider, { backgroundColor: homeColors.border }]} />

                        <View style={styles.statusItem}>
                            <Text style={[styles.statusLabel, { color: homeColors.textSecondary }]}>O'RTACHA BALL</Text>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                <Ionicons name="star" size={13} color="#F59E0B" />
                                <Text style={[styles.statusValue, { color: '#F59E0B' }]}>{averagePitchRating}</Text>
                            </View>
                        </View>

                        <View style={[styles.statusDivider, { backgroundColor: homeColors.border }]} />

                        <View style={styles.statusItem}>
                            <Text style={[styles.statusLabel, { color: homeColors.textSecondary }]}>SXEMA</Text>
                            <Text style={[styles.statusValue, { color: homeColors.textPrimary }]}>{activePreset.name}</Text>
                        </View>
                    </View>

                    {selectedPlayerId && (
                        <View style={[styles.swapHintBanner, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)', borderColor: homeColors.border }]}>
                            <Ionicons name="swap-horizontal" size={16} color={homeColors.textPrimary} />
                            <Text style={[styles.swapHintText, { color: homeColors.textPrimary }]}>
                                {t('teams.swap_hint', "Almashtirish uchun pastdan zaxira o'yinchisini bosing")}
                            </Text>
                        </View>
                    )}

                    {/* BENCH / SUBSTITUTES SECTION */}
                    <View style={styles.subsSection}>
                        <View style={styles.subsHeader}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                <Ionicons name="people-outline" size={18} color={homeColors.textSecondary} />
                                <Text style={[styles.subsTitle, { color: homeColors.textPrimary }]}>{t('teams.substitutes')}</Text>
                            </View>
                            <Text style={[styles.subsCountBadge, { backgroundColor: homeColors.surface, color: homeColors.textPrimary }]}>
                                {availablePlayers.filter(p => {
                                    const id = String(p._id || p.id);
                                    return !playersOnPitch.some(pitchP => pitchP.id === id);
                                }).length} {t('teams.bench_count', { count: '' }).trim()}
                            </Text>
                        </View>

                        <View style={styles.subsListVertical}>
                            {sortedAvailablePlayers.map(player => {
                                const id = String(player._id || player.id);
                                const isOnPitch = playersOnPitch.some(p => p.id === id);
                                const firstName = player.firstName || player.first_name || player.name || 'O\'yinchi';
                                const lastName = player.lastName || player.last_name || '';
                                const number = player.number || player.player_number || player.shirt_number || '-';
                                const photo = player.photo_url || player.photo || player.photoUrl || player.avatar;
                                const ratingScore = getPlayerRatingScore(player);
                                const cat = getPositionCategory(player.position);
                                const posStyle = PES_POSITION_THEMES[cat];

                                return (
                                    <TouchableOpacity
                                        key={id}
                                        style={[
                                            styles.subRowCard,
                                            cardSurface,
                                            isOnPitch && { opacity: 0.5 },
                                            selectedPlayerId && !isOnPitch && { borderColor: homeColors.textPrimary, borderWidth: 1.5 }
                                        ]}
                                        onPress={() => handleBenchPlayerPress(player)}
                                        disabled={isReadOnly || isOnPitch}
                                        activeOpacity={0.7}
                                    >
                                        {/* PHOTO & NUMBER */}
                                        <View style={styles.subRowPhotoContainer}>
                                            <SmartImage
                                                uri={photo}
                                                style={styles.subRowPhoto}
                                                borderRadius={20}
                                                fallbackIcon="person"
                                                fallbackIconSize={20}
                                            />
                                            <View style={[styles.subNumberBadge, { backgroundColor: homeColors.background, borderColor: homeColors.border }]}>
                                                <Text style={[styles.subNumberText, { color: homeColors.textPrimary }]}>{number}</Text>
                                            </View>
                                        </View>

                                        {/* NAME & POSITION TAG (COLORED BY POSITION) */}
                                        <View style={styles.subRowInfo}>
                                            <Text style={[styles.subRowFirstName, { color: homeColors.textPrimary }]} numberOfLines={1}>
                                                {firstName} {lastName}
                                            </Text>
                                            <Text style={[styles.positionBadgeTagText, { color: posStyle.bg }]} numberOfLines={1}>
                                                {getLocalizedPosition(player.position, t).toUpperCase()}
                                            </Text>
                                        </View>

                                        {/* REAL DECIMAL RATING (e.g. 7.5, 8.5) */}
                                        <View style={[styles.ratingBadgePill, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]}>
                                            <Ionicons name="star" size={12} color="#F59E0B" style={{ marginRight: 3 }} />
                                            <Text style={[styles.ratingBadgePillText, { color: homeColors.textPrimary }]}>{ratingScore}</Text>
                                        </View>

                                        {/* ACTION STATUS BUTTON */}
                                        <View style={{ marginLeft: 8 }}>
                                            {isOnPitch ? (
                                                <View style={[styles.badgeActionCircle, { borderColor: homeColors.border, backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }]}>
                                                    <Ionicons name="checkmark" size={14} color={homeColors.textPrimary} />
                                                </View>
                                            ) : selectedPlayerId ? (
                                                <View style={[styles.badgeSwapPill, { backgroundColor: homeColors.textPrimary }]}>
                                                    <Ionicons name="swap-horizontal" size={13} color={isDark ? '#000000' : '#FFFFFF'} />
                                                    <Text style={[styles.badgeSwapPillText, { color: isDark ? '#000000' : '#FFFFFF' }]}>ALMASH</Text>
                                                </View>
                                            ) : (
                                                <View style={[styles.badgeActionCircle, { borderColor: homeColors.border }]}>
                                                    <Ionicons name="add" size={14} color={homeColors.textPrimary} />
                                                </View>
                                            )}
                                        </View>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    </View>
                </ScrollView>
                    </SafeAreaView>
                </GestureHandlerRootView>
            </RNAnimated.View>
        </View>
    );
}

// 🎮 CLEAN RECTANGULAR PLAYER MARKER ON THE BOARD
const PesDraggablePlayer = ({
    player,
    isSelected,
    onPositionChange,
    onPress,
    onRemove,
    isReadOnly,
    homeColors,
}: any) => {
    const cat = getPositionCategory(player.position || player.role);
    const posStyle = PES_POSITION_THEMES[cat];

    const translateX = useSharedValue((player.x / 100) * FIELD_WIDTH);
    const translateY = useSharedValue((player.y / 100) * FIELD_HEIGHT);
    const context = useSharedValue({ x: 0, y: 0 });

    useEffect(() => {
        translateX.value = withSpring((player.x / 100) * FIELD_WIDTH, { damping: 15 });
        translateY.value = withSpring((player.y / 100) * FIELD_HEIGHT, { damping: 15 });
    }, [player.x, player.y]);

    const panGesture = Gesture.Pan()
        .enabled(!isReadOnly)
        .onStart(() => {
            context.value = { x: translateX.value, y: translateY.value };
        })
        .onUpdate((event) => {
            let nextX = context.value.x + event.translationX;
            let nextY = context.value.y + event.translationY;

            translateX.value = Math.max(20, Math.min(FIELD_WIDTH - 20, nextX));
            translateY.value = Math.max(20, Math.min(FIELD_HEIGHT - 20, nextY));
        })
        .onEnd(() => {
            runOnJS(onPositionChange)(player.id, translateX.value, translateY.value);
        });

    const animatedStyle = useAnimatedStyle(() => {
        return {
            transform: [
                { translateX: translateX.value - 26 },
                { translateY: translateY.value - 30 },
            ],
        };
    });

    return (
        <GestureDetector gesture={panGesture}>
            <Animated.View style={[styles.pesPlayerMarker, animatedStyle]}>
                <TouchableOpacity
                    onPress={onPress}
                    onLongPress={!isReadOnly ? onRemove : undefined}
                    activeOpacity={0.85}
                    disabled={isReadOnly}
                    style={styles.playerTouchable}
                >
                    {/* RECTANGULAR PHOTO BOX (TO'RTBURCHAK) */}
                    <View
                        style={[
                            styles.rectPhotoBox,
                            { borderColor: isSelected ? homeColors.textPrimary : homeColors.border, backgroundColor: homeColors.surface },
                            isSelected && { borderWidth: 2, transform: [{ scale: 1.08 }] }
                        ]}
                    >
                        <SmartImage
                            uri={player.photo}
                            style={styles.rectPhoto}
                            borderRadius={6}
                            fallbackIcon="person"
                            fallbackIconSize={22}
                        />

                        {/* NUMBER BADGE (BOTTOM RIGHT) WITH POSITION COLOR */}
                        {!!player.number && (
                            <View style={[styles.rectNumberBadge, { backgroundColor: posStyle.bg }]}>
                                <Text style={[styles.rectNumberBadgeText, { color: posStyle.text }]}>{player.number}</Text>
                            </View>
                        )}
                    </View>

                    {/* PLAYER NAME TAG (NO EXTRA POSITION OR CLUTTER) */}
                    <View style={[styles.rectNameTag, { backgroundColor: homeColors.background, borderColor: homeColors.border }]}>
                        <Text style={[styles.rectNameText, { color: homeColors.textPrimary }]} numberOfLines={1}>
                            {(player.firstName || player.name || '').toUpperCase()}
                        </Text>
                    </View>
                </TouchableOpacity>
            </Animated.View>
        </GestureDetector>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingTop: 8,
        paddingBottom: 10,
    },
    iconBtn: {
        width: 38,
        height: 38,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        fontSize: 14,
        fontWeight: '900',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    headerSub: {
        fontSize: 11,
        fontWeight: '700',
        marginTop: 1,
    },
    saveBtn: {
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 10,
    },
    saveBtnText: {
        fontWeight: '900',
        fontSize: 12,
        letterSpacing: 0.3,
    },
    scrollContent: {
        paddingBottom: 40,
    },
    controlBarContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        marginBottom: 8,
    },
    formatScroll: {
        flexDirection: 'row',
        gap: 6,
    },
    formatPill: {
        paddingHorizontal: 14,
        paddingVertical: 6,
        borderRadius: 8,
        borderWidth: 1,
    },
    formatPillText: {
        fontSize: 12,
        fontWeight: '800',
    },
    presetsTrayContainer: {
        marginBottom: 10,
    },
    presetsScroll: {
        paddingHorizontal: 16,
        gap: 8,
    },
    presetChip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 7,
        borderRadius: 10,
    },
    presetChipText: {
        fontSize: 12,
        fontWeight: '800',
    },
    fieldWrapper: {
        paddingHorizontal: 16,
        alignItems: 'center',
    },
    field: {
        width: FIELD_WIDTH,
        height: FIELD_HEIGHT,
        borderRadius: 16,
        borderWidth: 2,
        overflow: 'hidden',
        position: 'relative',
    },
    grassStripe: {
        position: 'absolute',
        width: '100%',
        height: '16.66%',
    },
    outerBorder: {
        ...StyleSheet.absoluteFillObject,
        borderWidth: 1.5,
        margin: 5,
        borderRadius: 12,
    },
    centerLine: {
        position: 'absolute',
        top: '50%',
        width: '100%',
        height: 1.5,
    },
    centerCircle: {
        position: 'absolute',
        top: '50%',
        left: '50%',
        width: 80,
        height: 80,
        borderRadius: 40,
        borderWidth: 1.5,
        marginTop: -40,
        marginLeft: -40,
    },
    penaltyAreaTop: {
        position: 'absolute',
        top: 5,
        width: '56%',
        height: '18%',
        left: '22%',
        borderWidth: 1.5,
        borderTopWidth: 0,
    },
    goalAreaTop: {
        position: 'absolute',
        top: 5,
        width: '28%',
        height: '6%',
        left: '36%',
        borderWidth: 1.5,
        borderTopWidth: 0,
    },
    penaltyAreaBottom: {
        position: 'absolute',
        bottom: 5,
        width: '56%',
        height: '18%',
        left: '22%',
        borderWidth: 1.5,
        borderBottomWidth: 0,
    },
    goalAreaBottom: {
        position: 'absolute',
        bottom: 5,
        width: '28%',
        height: '6%',
        left: '36%',
        borderWidth: 1.5,
        borderBottomWidth: 0,
    },
    pesPlayerMarker: {
        position: 'absolute',
        width: 54,
        alignItems: 'center',
    },
    playerTouchable: {
        alignItems: 'center',
    },
    rectPhotoBox: {
        width: 44,
        height: 48,
        borderRadius: 8,
        borderWidth: 1.5,
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden',
    },
    rectPhoto: {
        width: 40,
        height: 44,
        borderRadius: 6,
    },
    rectNumberBadge: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        paddingHorizontal: 3.5,
        paddingVertical: 1,
        borderTopLeftRadius: 4,
    },
    rectNumberBadgeText: {
        color: '#FFFFFF',
        fontSize: 8.5,
        fontWeight: '900',
    },
    rectNameTag: {
        marginTop: 3,
        paddingHorizontal: 4,
        paddingVertical: 1.5,
        borderRadius: 4,
        borderWidth: 1,
        alignItems: 'center',
        maxWidth: 54,
    },
    rectNameText: {
        fontSize: 8,
        fontWeight: '900',
        letterSpacing: 0.1,
    },
    squadStatusBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginHorizontal: 16,
        marginTop: 12,
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 14,
    },
    statusItem: {
        alignItems: 'center',
        flex: 1,
    },
    statusLabel: {
        fontSize: 9,
        fontWeight: '800',
        letterSpacing: 0.4,
        marginBottom: 2,
    },
    statusValue: {
        fontSize: 13,
        fontWeight: '900',
    },
    statusDivider: {
        width: 1,
        height: 24,
    },
    swapHintBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: 16,
        marginTop: 10,
        paddingHorizontal: 14,
        paddingVertical: 9,
        borderRadius: 10,
        borderWidth: 1,
        gap: 8,
    },
    swapHintText: {
        fontSize: 11,
        fontWeight: '700',
        flex: 1,
    },
    subsSection: {
        marginTop: 16,
        paddingHorizontal: 16,
    },
    subsHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 10,
    },
    subsTitle: {
        fontSize: 13,
        fontWeight: '900',
        letterSpacing: 0.4,
    },
    subsCountBadge: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 8,
        fontSize: 11,
        fontWeight: '800',
    },
    subsListVertical: {
        gap: 8,
    },
    subRowCard: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderRadius: 12,
    },
    subRowPhotoContainer: {
        position: 'relative',
        marginRight: 10,
    },
    subRowPhoto: {
        width: 40,
        height: 40,
        borderRadius: 20,
    },
    subNumberBadge: {
        position: 'absolute',
        bottom: -2,
        right: -2,
        paddingHorizontal: 3,
        borderRadius: 4,
        borderWidth: 1,
    },
    subNumberText: {
        fontSize: 8,
        fontWeight: '900',
    },
    subRowInfo: {
        flex: 1,
    },
    subRowFirstName: {
        fontSize: 13,
        fontWeight: '800',
    },
    positionBadgeTagText: {
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 0.3,
        marginTop: 2,
    },
    ratingBadgePill: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        marginRight: 4,
    },
    ratingBadgePillText: {
        fontSize: 12,
        fontWeight: '900',
    },
    badgeActionCircle: {
        width: 26,
        height: 26,
        borderRadius: 13,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    badgeSwapPill: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
        gap: 3,
    },
    badgeSwapPillText: {
        fontSize: 10,
        fontWeight: '900',
    },
});
