import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../constants/Colors';
import ApiSlider from '../components/ApiSlider';
import { apiService } from '../services/apiService';
import { useSocket } from '../context/SocketContext';

export default function HomeScreen() {
    const [matches, setMatches] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const { socket, isConnected } = useSocket();

    useEffect(() => {
        loadMatches();
    }, []);

    useEffect(() => {
        if (socket && isConnected) {
            socket.on('match-update', (updatedMatch: any) => {
                console.log('🏟️ Home Match Update:', updatedMatch);
                setMatches(prev => prev.map(m => m._id === updatedMatch.matchId ? { ...m, ...updatedMatch.match } : m));
            });

            return () => {
                socket.off('match-update');
            };
        }
    }, [socket, isConnected]);

    const loadMatches = async () => {
        try {
            setLoading(true);
            const response = await apiService.getMatches();
            if (response.data) {
                // Filter for upcoming or live matches
                const sortedMatches = response.data.sort((a: any, b: any) =>
                    new Date(a.date).getTime() - new Date(b.date).getTime()
                );
                setMatches(sortedMatches);
            }
        } catch (error) {
            console.error('Error loading matches:', error);
        } finally {
            setLoading(false);
        }
    };

    const nextMatch = matches.find(m => m.status === 'scheduled' || m.status === 'live');

    return (
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
            {/* Header Section */}
            <View style={styles.header}>
                <View>
                    <Text style={styles.welcomeText}>Xush kelibsiz!</Text>
                    <Text style={styles.brandText}>HFL SPORTS</Text>
                </View>
                <TouchableOpacity style={styles.profileButton}>
                    <Ionicons name="person-circle-outline" size={32} color={Colors.primary} />
                </TouchableOpacity>
            </View>

            <ApiSlider />

            {/* Featured Match Card (Next Match) */}
            {nextMatch ? (
                <View style={[styles.featuredCard, nextMatch.status === 'live' && styles.liveCard]}>
                    <Text style={[styles.cardLabel, nextMatch.status === 'live' && styles.liveLabel]}>
                        {nextMatch.status === 'live' ? '• LIVE O\'YIN' : 'NAVBATDAGI O\'YIN'}
                    </Text>
                    <View style={styles.matchRow}>
                        <View style={styles.teamInfo}>
                            <View style={[styles.logoPlaceholder, { backgroundColor: nextMatch.homeTeam?.color || Colors.surfaceLight }]}>
                                {nextMatch.homeTeam?.logo && <Image source={{ uri: nextMatch.homeTeam.logo }} style={styles.teamLogo} />}
                            </View>
                            <Text style={styles.teamName}>{nextMatch.homeTeam?.name || 'Jamoa A'}</Text>
                        </View>

                        <View style={styles.vsContainer}>
                            {nextMatch.status === 'live' ? (
                                <Text style={styles.scoreText}>{nextMatch.score?.home || 0} - {nextMatch.score?.away || 0}</Text>
                            ) : (
                                <Text style={styles.vsText}>VS</Text>
                            )}
                            <Text style={styles.timeText}>
                                {new Date(nextMatch.date).toLocaleDateString('uz-UZ', { day: 'numeric', month: 'short' })} {nextMatch.time}
                            </Text>
                        </View>

                        <View style={styles.teamInfo}>
                            <View style={[styles.logoPlaceholder, { backgroundColor: nextMatch.awayTeam?.color || Colors.surfaceLight }]}>
                                {nextMatch.awayTeam?.logo && <Image source={{ uri: nextMatch.awayTeam.logo }} style={styles.teamLogo} />}
                            </View>
                            <Text style={styles.teamName}>{nextMatch.awayTeam?.name || 'Jamoa B'}</Text>
                        </View>
                    </View>
                </View>
            ) : null}

            {/* Quick Stats Section */}
            <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>So'nggi Natijalar</Text>
                <TouchableOpacity>
                    <Text style={styles.viewAllText}>Barchasini ko'rish</Text>
                </TouchableOpacity>
            </View>

            {/* Finished Matches List */}
            {loading ? (
                <ActivityIndicator color={Colors.primary} style={{ marginTop: 20 }} />
            ) : matches.filter(m => m.status === 'finished').length > 0 ? (
                matches.filter(m => m.status === 'finished').slice(0, 3).map((match, idx) => (
                    <View key={match._id || idx} style={styles.recentMatchItem}>
                        <Text style={styles.recentTeams}>
                            {match.homeTeam?.name} {match.score?.home} - {match.score?.away} {match.awayTeam?.name}
                        </Text>
                        <Text style={styles.recentDate}>
                            {new Date(match.date).toLocaleDateString()}
                        </Text>
                    </View>
                ))
            ) : (
                <View style={styles.emptyCard}>
                    <Ionicons name="football-outline" size={48} color={Colors.textMuted} />
                    <Text style={styles.emptyText}>Hozircha o'yinlar yo'q</Text>
                </View>
            )}

            <View style={{ height: 40 }} />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
        padding: 20,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
        marginTop: 10,
    },
    welcomeText: {
        color: Colors.textMuted,
        fontSize: 14,
    },
    brandText: {
        color: Colors.text,
        fontSize: 22,
        fontWeight: '900',
        letterSpacing: 1,
    },
    profileButton: {
        padding: 4,
    },
    featuredCard: {
        backgroundColor: Colors.surface,
        borderRadius: 20,
        padding: 20,
        borderWidth: 1,
        borderColor: Colors.border,
        marginBottom: 24,
    },
    liveCard: {
        borderColor: Colors.danger,
        backgroundColor: '#1a1010',
    },
    cardLabel: {
        color: Colors.primary,
        fontSize: 12,
        fontWeight: 'bold',
        marginBottom: 20,
        textAlign: 'center',
    },
    liveLabel: {
        color: Colors.danger,
    },
    matchRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
    },
    teamInfo: {
        alignItems: 'center',
        width: 80,
    },
    logoPlaceholder: {
        width: 60,
        height: 60,
        backgroundColor: Colors.surfaceLight,
        borderRadius: 30,
        marginBottom: 10,
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
    },
    teamLogo: {
        width: '100%',
        height: '100%',
        resizeMode: 'contain',
    },
    teamName: {
        color: Colors.text,
        fontSize: 12,
        fontWeight: 'bold',
        textAlign: 'center',
    },
    vsContainer: {
        alignItems: 'center',
    },
    vsText: {
        color: Colors.text,
        fontSize: 24,
        fontWeight: '900',
        fontStyle: 'italic',
    },
    scoreText: {
        color: Colors.text,
        fontSize: 28,
        fontWeight: '900',
    },
    timeText: {
        color: Colors.textMuted,
        fontSize: 10,
        marginTop: 4,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    sectionTitle: {
        color: Colors.text,
        fontSize: 18,
        fontWeight: 'bold',
    },
    viewAllText: {
        color: Colors.primary,
        fontSize: 14,
    },
    recentMatchItem: {
        backgroundColor: Colors.surface,
        borderRadius: 12,
        padding: 16,
        marginBottom: 10,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    recentTeams: {
        color: Colors.text,
        fontSize: 14,
        fontWeight: '600',
    },
    recentDate: {
        color: Colors.textMuted,
        fontSize: 12,
    },
    emptyCard: {
        backgroundColor: Colors.surface,
        borderRadius: 16,
        padding: 40,
        alignItems: 'center',
        justifyContent: 'center',
        borderStyle: 'dashed',
        borderWidth: 1,
        borderColor: Colors.border,
    },
    emptyText: {
        color: Colors.textMuted,
        marginTop: 12,
        fontSize: 14,
    }
});
