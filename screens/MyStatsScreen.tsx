import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    ActivityIndicator,
    TouchableOpacity,
    Image,
    SafeAreaView,
} from 'react-native';
import { apiService } from '../services/apiService';
import { Ionicons } from '@expo/vector-icons';

interface PlayerStats {
    matches: number;
    goals: number;
    assists: number;
    yellowCards: number;
    redCards: number;
    cleanSheets: number;
    rating: number;
}

interface PlayerData {
    firstName: string;
    lastName: string;
    number: string;
    position: string;
    stats: PlayerStats;
}

const MyStatsScreen = ({ route, navigation }: any) => {
    const { playerId } = route.params || {};
    const [loading, setLoading] = useState(true);
    const [playerData, setPlayerData] = useState<PlayerData | null>(null);

    useEffect(() => {
        if (playerId) {
            fetchStats();
        }
    }, [playerId]);

    const fetchStats = async () => {
        try {
            setLoading(true);
            const response = await apiService.getPlayerStats(playerId);
            if (response.data.success) {
                setPlayerData(response.data.data);
            }
        } catch (error) {
            console.error('Error fetching player stats:', error);
        } finally {
            setLoading(true);
            // Mocking for now if no real data
            setPlayerData({
                firstName: 'O\'yinchi',
                lastName: 'Nomi',
                number: '10',
                position: 'Hujumchi',
                stats: {
                    matches: 12,
                    goals: 8,
                    assists: 5,
                    yellowCards: 2,
                    redCards: 0,
                    cleanSheets: 0,
                    rating: 8.5
                }
            });
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#00FF66" />
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Ionicons name="arrow-back" size={24} color="#FFF" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Mening Statistika</Text>
                <View style={{ width: 24 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={styles.profileCard}>
                    <View style={styles.avatarPlaceholder}>
                        <Ionicons name="person" size={60} color="#666" />
                    </View>
                    <Text style={styles.playerName}>{playerData?.firstName} {playerData?.lastName}</Text>
                    <View style={styles.roleContainer}>
                        <Text style={styles.roleText}>{playerData?.position}</Text>
                        <View style={styles.dot} />
                        <Text style={styles.roleText}>#{playerData?.number}</Text>
                    </View>
                </View>

                <View style={styles.statsGrid}>
                    <StatBox label="O'yinlar" value={playerData?.stats.matches} icon="football" color="#00FF66" />
                    <StatBox label="Gollar" value={playerData?.stats.goals} icon="star" color="#FFD700" />
                    <StatBox label="Assistlar" value={playerData?.stats.assists} icon="flash" color="#00BFFF" />
                    <StatBox label="Reyting" value={playerData?.stats.rating} icon="trending-up" color="#FF1493" />
                </View>

                <View style={styles.cardsContainer}>
                    <View style={styles.cardInfo}>
                        <View style={[styles.cardTag, { backgroundColor: '#FFD700' }]} />
                        <Text style={styles.cardLabel}>Sariq kartochka</Text>
                        <Text style={styles.cardValue}>{playerData?.stats.yellowCards}</Text>
                    </View>
                    <View style={styles.cardInfo}>
                        <View style={[styles.cardTag, { backgroundColor: '#FF0000' }]} />
                        <Text style={styles.cardLabel}>Qizil kartochka</Text>
                        <Text style={styles.cardValue}>{playerData?.stats.redCards}</Text>
                    </View>
                </View>

                <TouchableOpacity
                    style={styles.transferButton}
                    onPress={() => navigation.navigate('TransferRequest', { playerId })}
                >
                    <Ionicons name="swap-horizontal" size={20} color="#000" />
                    <Text style={styles.transferButtonText}>Transfer So'rovi Yuborish</Text>
                </TouchableOpacity>
            </ScrollView>
        </SafeAreaView>
    );
};

const StatBox = ({ label, value, icon, color }: any) => (
    <View style={styles.statBox}>
        <Ionicons name={icon} size={24} color={color} />
        <Text style={styles.statValue}>{value}</Text>
        <Text style={styles.statLabel}>{label}</Text>
    </View>
);

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
        justifyContent: 'between',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#1A1A1A',
    },
    headerTitle: {
        color: '#FFF',
        fontSize: 18,
        fontWeight: 'bold',
        textTransform: 'uppercase',
    },
    scrollContent: {
        padding: 20,
    },
    profileCard: {
        alignItems: 'center',
        marginBottom: 30,
        backgroundColor: '#111',
        padding: 30,
        borderRadius: 20,
        borderWidth: 1,
        borderBottomColor: '#333',
    },
    avatarPlaceholder: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: '#222',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 15,
        borderWidth: 2,
        borderColor: '#00FF66',
    },
    playerName: {
        color: '#FFF',
        fontSize: 24,
        fontWeight: '900',
        textTransform: 'uppercase',
        marginBottom: 5,
    },
    roleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    roleText: {
        color: '#666',
        fontSize: 14,
        fontWeight: 'bold',
        textTransform: 'uppercase',
    },
    dot: {
        width: 4,
        height: 4,
        borderRadius: 2,
        backgroundColor: '#00FF66',
        marginHorizontal: 10,
    },
    statsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        marginBottom: 20,
    },
    statBox: {
        width: '48%',
        backgroundColor: '#111',
        padding: 20,
        borderRadius: 15,
        alignItems: 'center',
        marginBottom: 15,
        borderWidth: 1,
        borderColor: '#333',
    },
    statValue: {
        color: '#FFF',
        fontSize: 22,
        fontWeight: 'bold',
        marginVertical: 5,
    },
    statLabel: {
        color: '#666',
        fontSize: 12,
        textTransform: 'uppercase',
        fontWeight: 'bold',
    },
    cardsContainer: {
        backgroundColor: '#111',
        padding: 20,
        borderRadius: 15,
        marginBottom: 30,
        borderWidth: 1,
        borderColor: '#333',
    },
    cardInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginVertical: 10,
    },
    cardTag: {
        width: 15,
        height: 20,
        borderRadius: 3,
        marginRight: 10,
    },
    cardLabel: {
        color: '#FFF',
        flex: 1,
        fontSize: 14,
        fontWeight: '600',
    },
    cardValue: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: 'bold',
    },
    transferButton: {
        backgroundColor: '#00FF66',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 18,
        borderRadius: 15,
        shadowColor: '#00FF66',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
    },
    transferButtonText: {
        color: '#000',
        fontWeight: '900',
        fontSize: 14,
        textTransform: 'uppercase',
        marginLeft: 10,
    },
});

export default MyStatsScreen;
