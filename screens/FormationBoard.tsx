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
} from 'react-native';
import { apiService } from '../services/apiService';
import { Ionicons } from '@expo/vector-icons';
import { PanGestureHandler, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
    useAnimatedGestureHandler,
    useAnimatedStyle,
    useSharedValue,
    withSpring,
} from 'react-native-reanimated';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const FIELD_WIDTH = SCREEN_WIDTH - 40;
const FIELD_HEIGHT = FIELD_WIDTH * 1.4;

interface PlayerPosition {
    id: string;
    name: string;
    x: number;
    y: number;
}

const FormationBoard = ({ route, navigation }: any) => {
    const { teamId } = route.params || {};
    const [loading, setLoading] = useState(true);
    const [players, setPlayers] = useState<PlayerPosition[]>([]);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetchTeamData();
    }, [teamId]);

    const fetchTeamData = async () => {
        try {
            setLoading(true);
            const response = await apiService.getTeamById(teamId);
            if (response.data) {
                const team = response.data;
                if (team.formation && team.formation.players) {
                    setPlayers(team.formation.players);
                } else if (team.players) {
                    // Default formation if none exists
                    const defaultFormation = team.players.slice(0, 11).map((p: any, index: number) => ({
                        id: p._id || p.id,
                        name: p.firstName || p.name || 'O\'yinchi',
                        x: 50 + (index % 3) * 100,
                        y: 100 + Math.floor(index / 3) * 100,
                    }));
                    setPlayers(defaultFormation);
                }
            }
        } catch (error) {
            console.error('Error fetching team:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        try {
            setSaving(true);
            const response = await apiService.updateFormation(teamId, { players });
            if (response.data.success) {
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
        setPlayers(prev => prev.map(p => p.id === id ? { ...p, x, y } : p));
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#00FF66" />
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
                    <Text style={styles.headerTitle}>Sostav Tahrirlash</Text>
                    <TouchableOpacity onPress={handleSave} disabled={saving}>
                        {saving ? (
                            <ActivityIndicator size="small" color="#00FF66" />
                        ) : (
                            <Text style={styles.saveText}>SAQLASH</Text>
                        )}
                    </TouchableOpacity>
                </View>

                <View style={styles.fieldContainer}>
                    <View style={styles.field}>
                        {/* Football Field Lines (simplified) */}
                        <View style={styles.centerCircle} />
                        <View style={styles.centerLine} />
                        <View style={styles.penaltyAreaTop} />
                        <View style={styles.penaltyAreaBottom} />

                        {players.map((player) => (
                            <DraggablePlayer
                                key={player.id}
                                player={player}
                                onPositionChange={updatePlayerPosition}
                            />
                        ))}
                    </View>
                </View>

                <View style={styles.footer}>
                    <Ionicons name="information-circle-outline" size={16} color="#666" />
                    <Text style={styles.footerText}>O'yinchilarni maydon bo'ylab harakatlantiring va pozitsiyani saqlang.</Text>
                </View>
            </SafeAreaView>
        </GestureHandlerRootView>
    );
};

const DraggablePlayer = ({ player, onPositionChange }: { player: PlayerPosition, onPositionChange: (id: string, x: number, y: number) => void }) => {
    const translateX = useSharedValue(player.x);
    const translateY = useSharedValue(player.y);

    const gestureHandler = useAnimatedGestureHandler({
        onStart: (_, ctx: any) => {
            ctx.startX = translateX.value;
            ctx.startY = translateY.value;
        },
        onActive: (event, ctx) => {
            translateX.value = ctx.startX + event.translationX;
            translateY.value = ctx.startY + event.translationY;
        },
        onEnd: () => {
            // Keep within bounds logic could be added here
            onPositionChange(player.id, translateX.value, translateY.value);
        },
    });

    const animatedStyle = useAnimatedStyle(() => {
        return {
            transform: [
                { translateX: translateX.value },
                { translateY: translateY.value },
            ],
        };
    });

    return (
        <PanGestureHandler onGestureEvent={gestureHandler}>
            <Animated.View style={[styles.playerMarker, animatedStyle]}>
                <View style={styles.playerIcon}>
                    <Text style={styles.playerInitial}>{player.name.charAt(0)}</Text>
                </View>
                <Text style={styles.playerNameTag} numberOfLines={1}>{player.name}</Text>
            </Animated.View>
        </PanGestureHandler>
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
        fontWeight: 'bold',
        textTransform: 'uppercase',
    },
    saveText: {
        color: '#00FF66',
        fontWeight: '900',
    },
    fieldContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
    },
    field: {
        width: FIELD_WIDTH,
        height: FIELD_HEIGHT,
        backgroundColor: '#1B4D1B',
        borderRadius: 5,
        borderWidth: 2,
        borderColor: '#FFF',
        position: 'relative',
        overflow: 'hidden',
    },
    centerCircle: {
        position: 'absolute',
        top: '50%',
        left: '50%',
        width: 100,
        height: 100,
        borderRadius: 50,
        borderWidth: 2,
        borderColor: 'rgba(255,255,255,0.5)',
        marginTop: -50,
        marginLeft: -50,
    },
    centerLine: {
        position: 'absolute',
        top: '50%',
        width: '100%',
        height: 2,
        backgroundColor: 'rgba(255,255,255,0.5)',
    },
    penaltyAreaTop: {
        position: 'absolute',
        top: 0,
        left: '25%',
        width: '50%',
        height: 60,
        borderWidth: 2,
        borderColor: 'rgba(255,255,255,0.5)',
        borderTopWidth: 0,
    },
    penaltyAreaBottom: {
        position: 'absolute',
        bottom: 0,
        left: '25%',
        width: '50%',
        height: 60,
        borderWidth: 2,
        borderColor: 'rgba(255,255,255,0.5)',
        borderBottomWidth: 0,
    },
    playerMarker: {
        position: 'absolute',
        alignItems: 'center',
        justifyContent: 'center',
        width: 60,
        zIndex: 10,
    },
    playerIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#00FF66',
        borderWidth: 2,
        borderColor: '#FFF',
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.5,
        shadowRadius: 3,
    },
    playerInitial: {
        color: '#000',
        fontWeight: 'bold',
        fontSize: 18,
    },
    playerNameTag: {
        color: '#FFF',
        fontSize: 10,
        fontWeight: 'bold',
        marginTop: 5,
        backgroundColor: 'rgba(0,0,0,0.7)',
        paddingHorizontal: 5,
        borderRadius: 3,
        textAlign: 'center',
    },
    footer: {
        padding: 20,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    footerText: {
        color: '#666',
        fontSize: 12,
        marginLeft: 8,
        fontStyle: 'italic',
    },
});

export default FormationBoard;
