import React, { useState, useEffect } from 'react';
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
import { apiService, supabase } from '../services/apiService';
import { Ionicons } from '@expo/vector-icons';
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
} from 'react-native-reanimated';
import { useSocket } from '../context/SocketContext';
import { useAuthStore } from '../store/useAuthStore';
import { useThemeStore } from '../store/useThemeStore';
import { getHomeScreenColors } from '../constants/homeTheme';
import { useTranslation } from 'react-i18next';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
// MyTeam sahifasidagi TacticsBoard bilan AYNAN bir xil o'lcham — ikkala ekranda
// bir xil % koordinata bir xil piksel joyga tushishi uchun.
const FIELD_WIDTH = SCREEN_WIDTH - 40;
const FIELD_HEIGHT = FIELD_WIDTH * 1.3;

interface PlayerPosition {
    id: string;
    name: string;
    number?: string | number;
    x: number;
    y: number;
}

function FormationBoard({ route, navigation }: any) {
    const { t } = useTranslation();
    const { teamId, isReadOnly: initialReadOnly = false } = route.params || {};
    const { user } = useAuthStore();
    const isReadOnly = route.params?.isReadOnly || user?.role === 'player';
    const { isDark } = useThemeStore();
    const homeColors = getHomeScreenColors(isDark);
    const lineColor = isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.25)';

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
    const [playersOnPitch, setPlayersOnPitch] = useState<PlayerPosition[]>([]);
    const [availablePlayers, setAvailablePlayers] = useState<any[]>([]);
    const [saving, setSaving] = useState(false);
    const { socket } = useSocket();

    useEffect(() => {
        fetchData();

        if (socket && (teamId || user?.teamId)) {
            const activeTeamId = teamId || user?.teamId;
            socket.on('formation-updated', (data: any) => {
                if (data.teamId === activeTeamId) {
                    setPlayersOnPitch(data.formation.players);
                }
            });
            return () => {
                socket.off('formation-updated');
            };
        }
    }, [teamId, user, socket]);

    const fetchData = async () => {
        try {
            setLoading(true);
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

            setAvailablePlayers(teamPlayers || []);

            if (team?.formation?.players && Array.isArray(team.formation.players)) {
                setPlayersOnPitch(team.formation.players);
            }
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
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
                Alert.alert('Xatolik', 'Jamoa aniqlanmadi.');
                return;
            }

            const response = await apiService.updateFormation(targetId, { players: playersOnPitch });
            if (response.success) {
                if (socket) {
                    socket.emit('update-formation', { teamId: targetId, formation: { players: playersOnPitch } });
                }
                Alert.alert('🎉 Muvaffaqiyat!', 'Sostav bazaga muvaffaqiyatli saqlandi va o\'yin obzorida ko\'rinadi!');
            } else {
                Alert.alert('Xatolik', 'Sostavni saqlashda xatolik yuz berdi.');
            }
        } catch (error) {
            console.error('Error saving formation:', error);
            Alert.alert('Xatolik', 'Sostavni saqlab bo\'lmadi');
        } finally {
            setSaving(false);
        }
    };

    const updatePlayerPosition = (id: string, x: number, y: number) => {
        // Convert back to percentages (0-100) for storage
        const xPercent = (x / FIELD_WIDTH) * 100;
        const yPercent = (y / FIELD_HEIGHT) * 100;

        setPlayersOnPitch(prev => prev.map(p =>
            p.id === id ? { ...p, x: xPercent, y: yPercent } : p
        ));
    };

    const addPlayerToPitch = (player: any) => {
        const id = (player._id || player.id).toString();
        if (playersOnPitch.find(p => p.id === id)) {
            Alert.alert('Xatolik', 'Bu o\'yinchi allaqachon maydonda');
            return;
        }

        const newPlayer: PlayerPosition = {
            id,
            name: player.firstName || player.name || 'O\'yinchi',
            number: player.number,
            x: 50, // Center
            y: 80  // Bottom
        };

        setPlayersOnPitch([...playersOnPitch, newPlayer]);
    };

    const removePlayerFromPitch = (id: string) => {
        setPlayersOnPitch(playersOnPitch.filter(p => p.id !== id));
    };

    if (loading) {
        return (
            <View style={[styles.loadingContainer, { backgroundColor: homeColors.background }]}>
                <ActivityIndicator size="large" color={homeColors.accent} />
            </View>
        );
    }

    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <SafeAreaView style={[styles.container, { backgroundColor: homeColors.background }]} edges={['top']}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.iconBtn, cardSurface]}>
                        <Ionicons name="arrow-back" size={20} color={homeColors.textPrimary} />
                    </TouchableOpacity>
                    <Text style={[styles.headerTitle, { color: homeColors.textPrimary }]}>{isReadOnly ? t('teams.squad') : t('teams.edit_formation')}</Text>
                    {!isReadOnly ? (
                        <TouchableOpacity onPress={handleSave} disabled={saving}>
                            {saving ? (
                                <ActivityIndicator size="small" color={homeColors.accent} />
                            ) : (
                                <Text style={[styles.saveText, { color: homeColors.accent }]}>{t('common.save').toUpperCase()}</Text>
                            )}
                        </TouchableOpacity>
                    ) : (
                        <View style={{ width: 40 }} />
                    )}
                </View>

                <ScrollView contentContainerStyle={styles.scrollContent}>
                    {/* ASOSIY TARKIB HEADER */}
                    <View style={styles.sectionHeaderRow}>
                        <Ionicons name="football-outline" size={18} color={homeColors.textSecondary} />
                        <Text style={[styles.sectionHeaderTitle, { color: homeColors.textPrimary }]}>{t('teams.starting_lineup')}</Text>
                        <Text style={[styles.sectionHeaderCount, { color: homeColors.accent }]}>{playersOnPitch.length} / 11</Text>
                    </View>

                    <View style={styles.fieldWrapper}>
                        <View style={[styles.field, { backgroundColor: homeColors.surface, borderColor: lineColor }]}>
                            <View style={[styles.outerBorder, { borderColor: lineColor }]} />
                            <View style={[styles.centerCircle, { borderColor: lineColor }]} />
                            <View style={[styles.centerLine, { backgroundColor: lineColor }]} />
                            <View style={[styles.penaltyAreaTop, { borderColor: lineColor }]} />
                            <View style={[styles.penaltyAreaBottom, { borderColor: lineColor }]} />
                            <View style={[styles.goalAreaTop, { borderColor: lineColor }]} />
                            <View style={[styles.goalAreaBottom, { borderColor: lineColor }]} />

                            {playersOnPitch.map((player) => (
                                <DraggablePlayer
                                    key={player.id}
                                    player={player}
                                    onPositionChange={updatePlayerPosition}
                                    onRemove={() => removePlayerFromPitch(player.id)}
                                    isReadOnly={isReadOnly}
                                    homeColors={homeColors}
                                />
                            ))}
                        </View>
                    </View>

                    {/* ZAXIRA O'YINCHILARI SECTION (Always visible so players & managers can see bench) */}
                    <View style={styles.subsSection}>
                        <View style={styles.subsHeader}>
                            <Ionicons name="people-outline" size={18} color={homeColors.textSecondary} />
                            <Text style={[styles.subsTitle, { color: homeColors.textSecondary }]}>{t('teams.substitutes')}</Text>
                            <Text style={[styles.subsCount, { color: homeColors.accent }]}>
                                {availablePlayers.filter(p => {
                                    const id = (p._id || p.id).toString();
                                    return !playersOnPitch.some(pitchP => pitchP.id === id);
                                }).length}
                            </Text>
                        </View>

                        <View style={styles.subsListVertical}>
                            {availablePlayers.map(player => {
                                const id = (player._id || player.id).toString();
                                const isOnPitch = !!playersOnPitch.find(p => p.id === id);
                                const firstName = player.firstName || player.first_name || player.name || 'O\'yinchi';
                                const lastName = player.lastName || player.last_name || '';
                                const number = player.number || player.player_number || player.shirt_number || '-';
                                const photo = player.photo_url || player.photo || player.photoUrl;

                                return (
                                    <TouchableOpacity
                                        key={id}
                                        style={[styles.subRow, cardSurface, isOnPitch && { opacity: 0.55 }]}
                                        onPress={() => addPlayerToPitch(player)}
                                        disabled={isReadOnly || isOnPitch}
                                        activeOpacity={0.7}
                                    >
                                        <View style={styles.subRowPhotoContainer}>
                                            <SmartImage
                                                uri={photo}
                                                style={styles.subRowPhoto}
                                                borderRadius={22}
                                                fallbackIcon="person"
                                                fallbackIconSize={20}
                                            />
                                        </View>

                                        <View style={styles.subRowInfo}>
                                            <Text style={[styles.subRowFirstName, { color: homeColors.textPrimary }]}>{firstName}</Text>
                                            {lastName ? (
                                                <Text style={[styles.subRowLastName, { color: homeColors.textSecondary }]}>{lastName}</Text>
                                            ) : null}
                                        </View>

                                        <View style={styles.subRowNumberContainer}>
                                            <View style={[styles.subRowNumberCircle, { backgroundColor: isOnPitch ? homeColors.border : homeColors.accent }]}>
                                                <Text style={[styles.subRowNumberText, { color: isOnPitch ? homeColors.textSecondary : homeColors.background }]}>{number}</Text>
                                            </View>
                                        </View>

                                        <View style={styles.subRowBadgeContainer}>
                                            <Text style={[styles.subStatusBadge, isOnPitch ? styles.badgeMain : styles.badgeSub]}>
                                                {isOnPitch ? 'ASOSIY' : 'ZAXIRA'}
                                            </Text>
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
};

const DraggablePlayer = ({ player, onPositionChange, onRemove, isReadOnly, homeColors }: any) => {
    // Shared values use absolute field coordinates for movement
    const translateX = useSharedValue((player.x / 100) * FIELD_WIDTH);
    const translateY = useSharedValue((player.y / 100) * FIELD_HEIGHT);
    const context = useSharedValue({ x: 0, y: 0 });

    useEffect(() => {
        translateX.value = (player.x / 100) * FIELD_WIDTH;
        translateY.value = (player.y / 100) * FIELD_HEIGHT;
    }, [player.x, player.y]);

    const panGesture = Gesture.Pan()
        .enabled(!isReadOnly)
        .onStart(() => {
            context.value = { x: translateX.value, y: translateY.value };
        })
        .onUpdate((event) => {
            let nextX = context.value.x + event.translationX;
            let nextY = context.value.y + event.translationY;

            // Constrain
            translateX.value = Math.max(0, Math.min(FIELD_WIDTH, nextX));
            translateY.value = Math.max(0, Math.min(FIELD_HEIGHT, nextY));
        })
        .onEnd(() => {
            runOnJS(onPositionChange)(player.id, translateX.value, translateY.value);
        });

    const animatedStyle = useAnimatedStyle(() => {
        return {
            transform: [
                { translateX: translateX.value - 25 }, // Center icon (width=50)
                { translateY: translateY.value - 25 }, // Center icon (height=50)
            ],
        };
    });

    return (
        <GestureDetector gesture={panGesture}>
            <Animated.View style={[styles.playerMarker, animatedStyle]}>
                <TouchableOpacity onLongPress={!isReadOnly ? onRemove : undefined} activeOpacity={0.8} disabled={isReadOnly}>
                    <View style={[styles.playerIcon, { backgroundColor: homeColors.accent, borderColor: homeColors.background }]}>
                        <Text style={[styles.playerNumberText, { color: homeColors.background }]}>{player.number || player.name.charAt(0)}</Text>
                    </View>
                    <View style={[styles.nameTag, { backgroundColor: homeColors.background, borderColor: homeColors.border }]}>
                        <Text style={[styles.playerNameTag, { color: homeColors.textPrimary }]} numberOfLines={1}>{player.name}</Text>
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
        paddingHorizontal: 20,
        paddingTop: 8,
        paddingBottom: 12,
    },
    iconBtn: {
        width: 40,
        height: 40,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        fontSize: 16,
        fontWeight: '900',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    saveText: {
        fontWeight: '900',
        fontSize: 14,
    },
    scrollContent: {
        paddingBottom: 40,
    },
    sectionHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        marginVertical: 10,
        gap: 8,
    },
    sectionHeaderTitle: {
        fontSize: 12,
        fontWeight: '900',
        letterSpacing: 2,
    },
    sectionHeaderCount: {
        fontSize: 11,
        fontWeight: '900',
        marginLeft: 'auto',
    },
    fieldWrapper: {
        alignItems: 'center',
        paddingVertical: 5,
    },
    field: {
        width: FIELD_WIDTH,
        height: FIELD_HEIGHT,
        borderRadius: 15,
        borderWidth: 2,
        position: 'relative',
        overflow: 'hidden',
    },
    outerBorder: {
        ...StyleSheet.absoluteFillObject,
        borderWidth: 1.5,
        margin: 4,
    },
    centerCircle: {
        position: 'absolute',
        top: '50%',
        left: '50%',
        width: 90,
        height: 90,
        borderRadius: 45,
        borderWidth: 1.5,
        marginTop: -45,
        marginLeft: -45,
    },
    centerLine: {
        position: 'absolute',
        top: '50%',
        width: '100%',
        height: 1.5,
    },
    penaltyAreaTop: {
        position: 'absolute',
        top: 0,
        left: '20%',
        width: '60%',
        height: '18%',
        borderWidth: 1.5,
        borderTopWidth: 0,
    },
    penaltyAreaBottom: {
        position: 'absolute',
        bottom: 0,
        left: '20%',
        width: '60%',
        height: '18%',
        borderWidth: 1.5,
        borderBottomWidth: 0,
    },
    goalAreaTop: {
        position: 'absolute',
        top: 0,
        left: '35%',
        width: '30%',
        height: '6%',
        borderWidth: 1.5,
        borderTopWidth: 0,
    },
    goalAreaBottom: {
        position: 'absolute',
        bottom: 0,
        left: '35%',
        width: '30%',
        height: '6%',
        borderWidth: 1.5,
        borderBottomWidth: 0,
    },
    playerMarker: {
        position: 'absolute',
        alignItems: 'center',
        width: 50,
        zIndex: 50,
    },
    playerIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        borderWidth: 2,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 5,
        elevation: 8,
    },
    playerNumberText: {
        fontWeight: '900',
        fontSize: 14,
    },
    nameTag: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 10,
        marginTop: 4,
        borderWidth: 1,
    },
    playerNameTag: {
        fontSize: 9,
        fontWeight: 'bold',
        textAlign: 'center',
    },
    subsSection: {
        marginTop: 20,
        paddingHorizontal: 20,
    },
    subsHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 15,
        gap: 10,
    },
    subsTitle: {
        fontSize: 10,
        fontWeight: '900',
        letterSpacing: 2,
    },
    subsCount: {
        fontSize: 10,
        fontWeight: '900',
        marginLeft: 'auto',
    },
    subsListVertical: {
        flexDirection: 'column',
    },
    subRow: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 14,
        padding: 10,
        marginBottom: 8,
    },
    subRowPhotoContainer: {
        width: 44,
        height: 44,
    },
    subRowPhoto: {
        width: 44,
        height: 44,
    },
    subRowInfo: {
        flex: 1,
        marginLeft: 12,
        justifyContent: 'center',
    },
    subRowFirstName: {
        fontSize: 14,
        fontWeight: 'bold',
        textTransform: 'uppercase',
    },
    subRowLastName: {
        fontSize: 12,
        fontWeight: '300',
        marginTop: 1,
    },
    subRowNumberContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    subRowNumberCircle: {
        width: 32,
        height: 32,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    subRowNumberText: {
        fontWeight: '900',
        fontSize: 13,
    },
    subRowBadgeContainer: {
        justifyContent: 'center',
        alignItems: 'flex-end',
    },
    subStatusBadge: {
        fontSize: 9,
        fontWeight: '900',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
        overflow: 'hidden',
        letterSpacing: 0.5,
    },
    badgeMain: {
        backgroundColor: 'rgba(0, 200, 90, 0.15)',
        color: '#00A855',
    },
    badgeSub: {
        backgroundColor: 'rgba(128, 128, 128, 0.15)',
        color: '#888',
    },
});

export default FormationBoard;
