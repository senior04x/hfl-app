import React, { useState, useEffect, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Dimensions,
    ActivityIndicator,
    Alert,
    ScrollView,
    Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiService, supabase } from '../services/apiService';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import SmartImage from '../components/SmartImage';
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

export const getPlayerRatingScore = (player: any): string => {
    const raw = player?.rating ?? player?.stats?.rating ?? player?.avg_rating ?? player?.stats?.avg_rating ?? player?.match_rating ?? player?.score;
    if (raw !== undefined && raw !== null && raw !== '') {
        const num = Number(raw);
        if (!isNaN(num) && num > 0) {
            if (num <= 10) return num.toFixed(1);
            return (num / 10).toFixed(1);
        }
    }
    const ovr = calculateFifaAttributes(player).ovr || 72;
    return (ovr / 10).toFixed(1);
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

    const [loading, setLoading] = useState(true);
    const [playersOnPitch, setPlayersOnPitch] = useState<PitchPlayer[]>([]);
    const [availablePlayers, setAvailablePlayers] = useState<any[]>([]);
    const [saving, setSaving] = useState(false);
    const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);

    // Format & Preset State
    const [selectedFormat, setSelectedFormat] = useState<MatchFormat>('8v8');
    const [selectedPresetId, setSelectedPresetId] = useState<string>('8v8_2-3-2');
    const { socket } = useSocket();

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
                    if (cached.players && Array.isArray(cached.players)) {
                        setPlayersOnPitch(cached.players);
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
            if (!playersOnPitch || playersOnPitch.length === 0) {
                setLoading(true);
            }

            let teamPlayers: any[] = [];
            let team: any = null;

            if (targetTeamId) {
                const [tRes, pRes] = await Promise.all([
                    apiService.getTeamById(targetTeamId),
                    apiService.getPlayersByTeam(targetTeamId)
                ]);
                team = tRes;
                teamPlayers = pRes || [];
            }

            const activeTeamPlayers = (teamPlayers || []).filter((p: any) => {
                const st = String(p.status || '').toLowerCase().trim();
                const isArchived = p.is_archived === true || st === 'archived' || st === 'arxivlangan';
                return !isArchived && st === 'approved';
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
                    const ratingScore = matchedRoster ? getPlayerRatingScore(matchedRoster) : (fp.rating || '7.5');
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
            <View style={[styles.loadingContainer, { backgroundColor: homeColors.background }]}>
                <ActivityIndicator size="large" color={homeColors.textPrimary} />
            </View>
        );
    }

    return (
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
                            {availablePlayers.map(player => {
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
                                            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 3 }}>
                                                <View style={[styles.positionBadgeTag, { backgroundColor: posStyle.bg }]}>
                                                    <Text style={[styles.positionBadgeTagText, { color: posStyle.text }]}>
                                                        {getLocalizedPosition(player.position, t).toUpperCase()}
                                                    </Text>
                                                </View>
                                            </View>
                                        </View>

                                        {/* REAL DECIMAL RATING (e.g. 7.5, 8.5) */}
                                        <View style={[styles.ratingBadgePill, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]}>
                                            <Ionicons name="star" size={12} color="#F59E0B" style={{ marginRight: 3 }} />
                                            <Text style={[styles.ratingBadgePillText, { color: homeColors.textPrimary }]}>{ratingScore}</Text>
                                        </View>

                                        {/* ACTION STATUS BUTTON */}
                                        <View style={{ marginLeft: 8 }}>
                                            {isOnPitch ? (
                                                <View style={styles.badgeMainPill}>
                                                    <Text style={styles.badgeMainPillText}>MAYDONDA</Text>
                                                </View>
                                            ) : selectedPlayerId ? (
                                                <View style={[styles.badgeSwapPill, { backgroundColor: homeColors.textPrimary }]}>
                                                    <Ionicons name="swap-horizontal" size={13} color={isDark ? '#000000' : '#FFFFFF'} />
                                                    <Text style={[styles.badgeSwapPillText, { color: isDark ? '#000000' : '#FFFFFF' }]}>ALMASH</Text>
                                                </View>
                                            ) : (
                                                <View style={[styles.badgeAddPill, { borderColor: homeColors.border }]}>
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

                        {/* NUMBER BADGE (BOTTOM RIGHT) */}
                        {!!player.number && (
                            <View style={[styles.rectNumberBadge, { backgroundColor: 'rgba(0,0,0,0.8)' }]}>
                                <Text style={styles.rectNumberBadgeText}>{player.number}</Text>
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
    positionBadgeTag: {
        paddingHorizontal: 6,
        paddingVertical: 1.5,
        borderRadius: 4,
    },
    positionBadgeTagText: {
        fontSize: 9,
        fontWeight: '900',
        letterSpacing: 0.3,
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
    badgeMainPill: {
        backgroundColor: 'rgba(255,255,255,0.06)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    badgeMainPillText: {
        color: '#94A3B8',
        fontSize: 9,
        fontWeight: '800',
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
    badgeAddPill: {
        width: 26,
        height: 26,
        borderRadius: 13,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
});
