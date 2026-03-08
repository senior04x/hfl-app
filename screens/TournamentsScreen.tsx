import React, { useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../constants/Colors';
import { useTournamentStore } from '../store/useTournamentStore';
import { apiService } from '../services/apiService';
import { Tournament } from '../types';
import { useNavigation } from '@react-navigation/native';

export default function TournamentsScreen() {
    const { tournaments: groups, setTournaments: setGroups, isLoading, setLoading } = useTournamentStore();
    const navigation = useNavigation<any>();

    const fetchTournaments = async () => {
        try {
            setLoading(true);
            const response = await apiService.getTournaments();
            if (response.data.success && response.data.data) {
                setGroups(response.data.data);
            }
        } catch (error) {
            console.error('Error fetching tournaments:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTournaments();
    }, []);

    const renderLeagueItem = ({ item: league }: { item: any }) => (
        <View style={styles.leagueSection}>
            <View style={styles.leagueHeader}>
                <Ionicons name="trophy-outline" size={24} color={Colors.primary} />
                <Text style={styles.leagueName}>{league.name}</Text>
            </View>

            {league.tournaments && league.tournaments.map((tournament: any) => (
                <TouchableOpacity
                    key={tournament._id}
                    style={styles.tournamentCard}
                    onPress={() => navigation.navigate('Standings', {
                        tournamentId: tournament._id,
                        tournamentName: tournament.name
                    })}
                >
                    <View style={styles.tournamentIcon}>
                        <Ionicons
                            name="football"
                            size={20}
                            color={tournament.status === 'ongoing' ? Colors.primary : Colors.textMuted}
                        />
                    </View>
                    <View style={styles.tournamentInfo}>
                        <Text style={styles.tournamentName}>{tournament.name}</Text>
                        <Text style={styles.tournamentSeason}>{tournament.season}</Text>
                    </View>
                    <View style={[
                        styles.statusBadge,
                        { backgroundColor: tournament.status === 'ongoing' ? 'rgba(0, 255, 102, 0.1)' : Colors.surfaceLight }
                    ]}>
                        <Text style={[
                            styles.statusText,
                            { color: tournament.status === 'ongoing' ? Colors.primary : Colors.textMuted }
                        ]}>
                            {tournament.status.toUpperCase()}
                        </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={Colors.border} />
                </TouchableOpacity>
            ))}
        </View>
    );

    return (
        <View style={styles.container}>
            {isLoading && groups.length === 0 ? (
                <View style={styles.loading}>
                    <ActivityIndicator size="large" color={Colors.primary} />
                </View>
            ) : (
                <FlatList
                    data={groups}
                    keyExtractor={(item) => item._id}
                    renderItem={renderLeagueItem}
                    contentContainerStyle={styles.list}
                    refreshing={isLoading}
                    onRefresh={fetchTournaments}
                    ListEmptyComponent={
                        <View style={styles.empty}>
                            <Ionicons name="alert-circle-outline" size={48} color={Colors.textMuted} />
                            <Text style={styles.emptyText}>Hozircha faol ligalar mavjud emas</Text>
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
    list: {
        padding: 20,
    },
    leagueSection: {
        marginBottom: 25,
    },
    leagueHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
        paddingLeft: 5,
    },
    leagueName: {
        color: Colors.text,
        fontSize: 20,
        fontWeight: '900',
        marginLeft: 10,
        letterSpacing: 0.5,
    },
    tournamentCard: {
        backgroundColor: Colors.surface,
        borderRadius: 16,
        padding: 15,
        marginBottom: 10,
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: Colors.border,
    },
    tournamentIcon: {
        width: 40,
        height: 40,
        backgroundColor: Colors.surfaceLight,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    tournamentInfo: {
        flex: 1,
    },
    tournamentName: {
        color: Colors.text,
        fontSize: 16,
        fontWeight: 'bold',
    },
    tournamentSeason: {
        color: Colors.textMuted,
        fontSize: 12,
        marginTop: 2,
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 4,
        marginRight: 10,
    },
    statusText: {
        fontSize: 9,
        fontWeight: 'bold',
    },
    loading: {
        flex: 1,
        justifyContent: 'center',
    },
    empty: {
        alignItems: 'center',
        marginTop: 60,
    },
    emptyText: {
        color: Colors.textMuted,
        marginTop: 10,
        fontSize: 16,
    }
});
