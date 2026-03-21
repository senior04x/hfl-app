import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ImageBackground,
    Dimensions,
    ActivityIndicator,
    Alert,
    SafeAreaView,
    ScrollView,
    FlatList,
} from 'react-native';
import { apiService } from '../services/apiService';
import { Ionicons } from '@expo/vector-icons';
import { 
    PanGestureHandler, 
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
import Colors from '../constants/Colors';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const FIELD_WIDTH = SCREEN_WIDTH - 40;
const FIELD_HEIGHT = FIELD_WIDTH * 1.3;

interface PlayerPosition {
    id: string;
    name: string;
    number?: string | number;
    x: number;
    y: number;
}

const FormationBoard = ({ route, navigation }: any) => {
    const { teamId, isReadOnly = false } = route.params || {};
    const [loading, setLoading] = useState(true);
    const [playersOnPitch, setPlayersOnPitch] = useState<PlayerPosition[]>([]);
    const [availablePlayers, setAvailablePlayers] = useState<any[]>([]);
    const [saving, setSaving] = useState(false);
    const { socket } = useSocket();

    useEffect(() => {
        fetchData();
        
        if (socket) {
            socket.on('formation-updated', (data: any) => {
                if (data.teamId === teamId) {
                    setPlayersOnPitch(data.formation.players);
                }
            });
            return () => {
                socket.off('formation-updated');
            };
        }
    }, [teamId, socket]);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [team, teamPlayers] = await Promise.all([
                apiService.getTeamById(teamId),
                apiService.getPlayersByTeam(teamId)
            ]);

            setAvailablePlayers(teamPlayers || []);

            if (team?.formation?.players) {
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
            const response = await apiService.updateFormation(teamId, { players: playersOnPitch });
            if (response.success) {
                Alert.alert('Muvaffaqiyat', 'Sostav muvaffaqiyatli saqlandi');
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
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={Colors.primary} />
            </View>
        );
    }

    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <SafeAreaView style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()}>
                        <Ionicons name="arrow-back" size={24} color="#FFF" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>{isReadOnly ? "Jamoa Sostavi" : "Sostav Tahrirlash"}</Text>
                    {!isReadOnly ? (
                        <TouchableOpacity onPress={handleSave} disabled={saving}>
                            {saving ? (
                                <ActivityIndicator size="small" color={Colors.primary} />
                            ) : (
                                <Text style={styles.saveText}>SAQLASH</Text>
                            )}
                        </TouchableOpacity>
                    ) : (
                        <View style={{ width: 40 }} /> // Spacer
                    )}
                </View>

                <ScrollView contentContainerStyle={styles.scrollContent}>
                    <View style={styles.fieldWrapper}>
                        <View style={styles.field}>
                            {/* Stripes */}
                            {Array.from({ length: 10 }).map((_, i) => (
                                <View key={i} style={[styles.stripe, { top: `${i * 10}%`, backgroundColor: i % 2 === 0 ? '#2d5a27' : '#33632d' }]} />
                            ))}
                            
                            {/* Markings */}
                            <View style={styles.centerCircle} />
                            <View style={styles.centerLine} />
                            <View style={styles.penaltyAreaTop} />
                            <View style={styles.penaltyAreaBottom} />

                            {playersOnPitch.map((player) => (
                                <DraggablePlayer
                                    key={player.id}
                                    player={player}
                                    onPositionChange={updatePlayerPosition}
                                    onRemove={() => removePlayerFromPitch(player.id)}
                                    isReadOnly={isReadOnly}
                                />
                            ))}
                        </View>
                    </View>

                    {!isReadOnly && (
                        <View style={styles.subsSection}>
                            <View style={styles.subsHeader}>
                                <Ionicons name="people" size={18} color={Colors.primary} />
                                <Text style={styles.subsTitle}>ZAXIRA O'YINCHILARI</Text>
                                <Text style={styles.subsCount}>{playersOnPitch.length} / 11</Text>
                            </View>
                            
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.subsList}>
                                {availablePlayers.map(player => {
                                    const id = (player._id || player.id).toString();
                                    const isOnPitch = !!playersOnPitch.find(p => p.id === id);
                                    return (
                                        <TouchableOpacity 
                                            key={id} 
                                            style={[styles.subCard, isOnPitch && styles.subCardActive]}
                                            onPress={() => addPlayerToPitch(player)}
                                            disabled={isOnPitch}
                                        >
                                            <View style={[styles.subIcon, { backgroundColor: isOnPitch ? '#333' : Colors.primary }]}>
                                                <Text style={styles.subNumber}>{player.number || '00'}</Text>
                                            </View>
                                            <Text style={styles.subName} numberOfLines={1}>{player.firstName}</Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </ScrollView>
                        </View>
                    )}
                </ScrollView>
            </SafeAreaView>
        </GestureHandlerRootView>
    );
};

const DraggablePlayer = ({ player, onPositionChange, onRemove, isReadOnly }: any) => {
    // Shared values use absolute field coordinates for movement
    const translateX = useSharedValue((player.x / 100) * FIELD_WIDTH);
    const translateY = useSharedValue((player.y / 100) * FIELD_HEIGHT);
    const context = useSharedValue({ x: 0, y: 0 });

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
                    <View style={styles.playerIcon}>
                        <Text style={styles.playerNumberText}>{player.number || player.name.charAt(0)}</Text>
                    </View>
                    <View style={styles.nameTag}>
                        <Text style={styles.playerNameTag} numberOfLines={1}>{player.name}</Text>
                    </View>
                </TouchableOpacity>
            </Animated.View>
        </GestureDetector>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0A0A0A',
    },
    loadingContainer: {
        flex: 1,
        backgroundColor: '#0A0A0A',
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 20,
    },
    headerTitle: {
        color: '#FFF',
        fontSize: 18,
        fontWeight: '900',
        textTransform: 'uppercase',
        fontStyle: 'italic',
    },
    saveText: {
        color: Colors.primary,
        fontWeight: '900',
        fontSize: 14,
    },
    scrollContent: {
        paddingBottom: 40,
    },
    fieldWrapper: {
        alignItems: 'center',
        paddingVertical: 10,
    },
    field: {
        width: FIELD_WIDTH,
        height: FIELD_HEIGHT,
        backgroundColor: '#2D5A27',
        borderRadius: 15,
        borderWidth: 3,
        borderColor: 'rgba(255,255,255,0.4)',
        position: 'relative',
        overflow: 'hidden',
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.5,
        shadowRadius: 20,
    },
    stripe: {
        position: 'absolute',
        width: '100%',
        height: '10%',
    },
    centerCircle: {
        position: 'absolute',
        top: '50%',
        left: '50%',
        width: 100,
        height: 100,
        borderRadius: 50,
        borderWidth: 2,
        borderColor: 'rgba(255,255,255,0.3)',
        marginTop: -50,
        marginLeft: -50,
    },
    centerLine: {
        position: 'absolute',
        top: '50%',
        width: '100%',
        height: 2,
        backgroundColor: 'rgba(255,255,255,0.3)',
    },
    penaltyAreaTop: {
        position: 'absolute',
        top: 0,
        left: '20%',
        width: '60%',
        height: '18%',
        borderWidth: 2,
        borderColor: 'rgba(255,255,255,0.3)',
        borderTopWidth: 0,
    },
    penaltyAreaBottom: {
        position: 'absolute',
        bottom: 0,
        left: '20%',
        width: '60%',
        height: '18%',
        borderWidth: 2,
        borderColor: 'rgba(255,255,255,0.3)',
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
        backgroundColor: Colors.primary,
        borderWidth: 2,
        borderColor: '#FFF',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.5,
        shadowRadius: 5,
        elevation: 8,
    },
    playerNumberText: {
        color: '#000',
        fontWeight: '900',
        fontSize: 14,
    },
    nameTag: {
        backgroundColor: 'rgba(0,0,0,0.8)',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 10,
        marginTop: 4,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    playerNameTag: {
        color: '#FFF',
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
        color: 'rgba(255,255,255,0.5)',
        fontSize: 10,
        fontWeight: '900',
        letterSpacing: 2,
    },
    subsCount: {
        color: Colors.primary,
        fontSize: 10,
        fontWeight: '900',
        marginLeft: 'auto',
    },
    subsList: {
        flexDirection: 'row',
    },
    subCard: {
        width: 80,
        height: 100,
        backgroundColor: '#1A1A1A',
        borderRadius: 20,
        marginRight: 12,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    subCardActive: {
        opacity: 0.3,
    },
    subIcon: {
        width: 40,
        height: 40,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 8,
    },
    subNumber: {
        color: '#000',
        fontWeight: '900',
        fontSize: 14,
    },
    subName: {
        color: '#FFF',
        fontSize: 10,
        fontWeight: '900',
        textTransform: 'uppercase',
    },
});

export default FormationBoard;
