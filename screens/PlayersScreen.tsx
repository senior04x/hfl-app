import React, { useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    ActivityIndicator,
    Image
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../constants/Colors';
import { usePlayerStore } from '../store/usePlayerStore';
import { apiService } from '../services/apiService';
import { Player } from '../types';
import PlayerListSkeleton from '../components/PlayerListSkeleton';

import { Video, ResizeMode } from 'expo-av';
import VideoBackground from '../components/VideoBackground';

import { getOptimizedImageUrl } from '../utils/imageOptimizer';

export default function PlayersScreen({ route, navigation }: any) {
    const { teamId, tournamentId, tournamentName } = route?.params || {};
    const { players, setPlayers, isLoading, setLoading } = usePlayerStore();

    const fetchPlayers = async () => {
        try {
            setLoading(true);
            let data;
            if (teamId) {
                data = await apiService.getPlayersByTeam(teamId);
            } else {
                data = await apiService.getPlayers(1, 100, undefined, tournamentId);
            }
            setPlayers(data || []);
        } catch (error) {
            console.error('Error fetching players:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPlayers();
    }, []);

    const renderPlayerItem = ({ item }: { item: Player }) => {
        const avatarUri = item.avatar || (item as any).photo;
        const optimizedAvatar = getOptimizedImageUrl(avatarUri, { width: 150, quality: 80 });

        return (
            <TouchableOpacity
                style={styles.playerCard}
                onPress={() => navigation.navigate('PlayerStats', { playerId: item._id, player: item })}
            >
                <View style={styles.avatarContainer}>
                    {avatarUri ? (
                        <Image source={{ uri: optimizedAvatar }} style={styles.avatar} />
                    ) : (
                        <View style={styles.avatarPlaceholder}>
                            <Text style={styles.avatarInitial}>{String(item.firstName || 'O').charAt(0).toUpperCase()}</Text>
                        </View>
                    )}
                </View>
                <View style={styles.infoContainer}>
                    <Text style={styles.playerName}>{item.firstName || 'O\'yinchi'} {item.lastName || ''}</Text>
                    <Text style={styles.playerPosition}>
                        {item.position || "Noma'lum position"} • #{item.number || '--'}
                    </Text>
                </View>
                <View style={styles.statsContainer}>
                    <Text style={styles.goals}>{item.stats?.goals || 0} G</Text>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <View style={styles.container}>
            <VideoBackground
                source={require('../assets/images/welcomeScreenVideo1.mp4')}
                overlayOpacity={0.8}
                style={StyleSheet.absoluteFill}
            />
            
            <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={Colors.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{tournamentName ? `${tournamentName} Top Scorerlar` : "O'yinchilar"}</Text>
                <View style={styles.placeholder} />
            </View>

            {isLoading && players.length === 0 ? (
                <PlayerListSkeleton />
            ) : (
                <FlatList
                    data={players}
                    keyExtractor={(item) => item._id}
                    renderItem={renderPlayerItem}
                    contentContainerStyle={styles.listContent}
                    refreshing={isLoading}
                    onRefresh={fetchPlayers}
                    initialNumToRender={12}
                    maxToRenderPerBatch={15}
                    windowSize={5}
                    removeClippedSubviews={true}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Text style={styles.emptyText}>Hozircha o'yinchilar mavjud emas</Text>
                        </View>
                    }
                />
            )}
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
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
    },
    backButton: {
        padding: 4,
    },
    headerTitle: {
        color: Colors.text,
        fontSize: 18,
        fontWeight: 'bold',
    },
    placeholder: {
        width: 32,
    },
    listContent: {
        padding: 16,
    },
    playerCard: {
        backgroundColor: Colors.surface,
        borderRadius: 12,
        padding: 12,
        marginBottom: 12,
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: Colors.border,
    },
    avatarContainer: {
        marginRight: 16,
    },
    avatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
    },
    avatarPlaceholder: {
        width: 44,
        height: 44,
        backgroundColor: Colors.surfaceLight,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarInitial: {
        color: Colors.text,
        fontSize: 18,
        fontWeight: 'bold',
    },
    infoContainer: {
        flex: 1,
    },
    playerName: {
        color: Colors.text,
        fontSize: 15,
        fontWeight: 'bold',
    },
    playerPosition: {
        color: Colors.textMuted,
        fontSize: 12,
        marginTop: 2,
    },
    statsContainer: {
        backgroundColor: Colors.surfaceLight,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    goals: {
        color: Colors.primary,
        fontSize: 12,
        fontWeight: 'bold',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        color: Colors.textMuted,
        marginTop: 12,
    },
    emptyContainer: {
        alignItems: 'center',
        marginTop: 40,
    },
    emptyText: {
        color: Colors.textMuted,
    },
});
