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
import Colors from '../constants/Colors';
import { usePlayerStore } from '../store/usePlayerStore';
import { apiService } from '../services/apiService';
import { Player } from '../types';

export default function PlayersScreen() {
    const { players, setPlayers, isLoading, setLoading } = usePlayerStore();

    const fetchPlayers = async () => {
        try {
            setLoading(true);
            const response = await apiService.getPlayers(1, 100);
            setPlayers(response.data);
        } catch (error) {
            console.error('Error fetching players:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPlayers();
    }, []);

    const renderPlayerItem = ({ item }: { item: Player }) => (
        <TouchableOpacity style={styles.playerCard}>
            <View style={styles.avatarContainer}>
                {item.avatar ? (
                    <Image source={{ uri: item.avatar }} style={styles.avatar} />
                ) : (
                    <View style={styles.avatarPlaceholder}>
                        <Text style={styles.avatarInitial}>{item.firstName.charAt(0)}</Text>
                    </View>
                )}
            </View>
            <View style={styles.infoContainer}>
                <Text style={styles.playerName}>{item.firstName} {item.lastName}</Text>
                <Text style={styles.playerPosition}>
                    {item.position || "Noma'lum position"} • #{item.number || '--'}
                </Text>
            </View>
            <View style={styles.statsContainer}>
                <Text style={styles.goals}>{item.stats?.goals || 0} G</Text>
            </View>
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            {isLoading && players.length === 0 ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={Colors.primary} />
                    <Text style={styles.loadingText}>O'yinchilar yuklanmoqda...</Text>
                </View>
            ) : (
                <FlatList
                    data={players}
                    keyExtractor={(item) => item._id}
                    renderItem={renderPlayerItem}
                    contentContainerStyle={styles.listContent}
                    refreshing={isLoading}
                    onRefresh={fetchPlayers}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Text style={styles.emptyText}>Hozircha o'yinchilar mavjud emas</Text>
                        </View>
                    }
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
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
