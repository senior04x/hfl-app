import React, { useEffect, useState, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    Image,
    ActivityIndicator,
    SafeAreaView,
    ScrollView,
    TouchableOpacity,
    RefreshControl
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../constants/Colors';
import { apiService } from '../services/apiService';
import TableSkeleton from '../components/TableSkeleton';
import { useSocket } from '../context/SocketContext';
import { Video, ResizeMode } from 'expo-av';
import VideoBackground from '../components/VideoBackground';

const StandingsScreen = ({ route, navigation }: any) => {
    const { tournamentId: initialTournamentId, tournamentName: initialTournamentName } = route.params || {};
    
    const [standings, setStandings] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [tournaments, setTournaments] = useState<any[]>([]);
    const [currentTournament, setCurrentTournament] = useState<any>(null);
    const { socket, isConnected } = useSocket();

    const loadData = useCallback(async (tId?: string) => {
        try {
            setLoading(true);
            
            // 1. Fetch available tournaments if not already loaded or if we need to find one
            let availableTournaments = tournaments;
            if (availableTournaments.length === 0) {
                const data = await apiService.getTournaments();
                availableTournaments = data || [];
                setTournaments(availableTournaments);
            }

            // 2. Identify target tournament ID
            const targetId = tId || initialTournamentId || (availableTournaments.length > 0 ? availableTournaments[0]._id : null);
            
            if (!targetId) {
                setLoading(false);
                return;
            }

            // 3. Fetch Tournament and Standings
            const tournament = await apiService.getTournamentById(targetId);
            if (tournament) {
                setCurrentTournament(tournament);
                if (tournament.standings && tournament.standings.length > 0) {
                    setStandings(tournament.standings);
                } else {
                    // Fallback to fetching teams directly and sorting if standings field is missing
                    const teamsData = await apiService.getTeams(1, 100, targetId);
                    const sorted = (teamsData || []).sort((a: any, b: any) => {
                        const statsA = a.stats || {};
                        const statsB = b.stats || {};
                        if ((statsB.points || 0) !== (statsA.points || 0)) return (statsB.points || 0) - (statsA.points || 0);
                        const gdA = (statsA.goalsFor || 0) - (statsA.goalsAgainst || 0);
                        const gdB = (statsB.goalsFor || 0) - (statsB.goalsAgainst || 0);
                        if (gdB !== gdA) return gdB - gdA;
                        return (statsB.goalsFor || 0) - (statsA.goalsFor || 0);
                    });
                    setStandings(sorted);
                }
            }
        } catch (error) {
            console.error('Error loading data:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [initialTournamentId, tournaments]);

    useEffect(() => {
        loadData();
    }, [initialTournamentId]);

    useEffect(() => {
        if (socket && isConnected && currentTournament?._id) {
            socket.on('standings-update', (data: any) => {
                if (data.tournamentId === currentTournament._id) {
                    setStandings(data.standings);
                }
            });

            return () => {
                socket.off('standings-update');
            };
        }
    }, [socket, isConnected, currentTournament?._id]);

    const onRefresh = () => {
        setRefreshing(true);
        loadData(currentTournament?._id);
    };

    const renderHeader = () => (
        <View style={styles.tableHeader}>
            <Text style={[styles.headerText, { width: 30 }]}>#</Text>
            <Text style={[styles.headerText, { flex: 1, textAlign: 'left', paddingLeft: 10 }]}>JAMOA</Text>
            <Text style={[styles.headerText, { width: 30 }]}>O'</Text>
            <Text style={[styles.headerText, { width: 50 }]}>T/N</Text>
            <Text style={[styles.headerText, { width: 35, fontWeight: '900' }]}>O</Text>
        </View>
    );

    const renderTeam = ({ item, index }: any) => {
        const stats = item.stats || {};
        const goalsFor = stats.goalsFor || 0;
        const goalsAgainst = stats.goalsAgainst || 0;
        
        // Compact display: team names in lowercase as requested for long names
        const displayName = (item.name || '').toLowerCase();

        return (
            <TouchableOpacity
                style={[styles.row, index % 2 === 0 ? styles.evenRow : styles.oddRow]}
                onPress={() => navigation.navigate('TeamProfile', { teamId: item.teamId || item._id || item.id })}
            >
                <Text style={[styles.posCell, index < 3 && styles.topPos]}>{index + 1}</Text>
                
                <View style={[styles.teamCell, { flex: 1 }]}>
                    <View style={styles.logoWrapper}>
                        {item.logo ? (
                            <Image source={{ uri: item.logo }} style={styles.miniLogo} />
                        ) : (
                            <View style={[styles.miniPlaceholder, { backgroundColor: item.color || Colors.surfaceLight }]} />
                        )}
                    </View>
                    <Text style={styles.teamName} numberOfLines={1}>{displayName}</Text>
                </View>

                <Text style={styles.statCell}>{stats.played || 0}</Text>
                <View style={{ width: 50, alignItems: 'center' }}>
                    <Text style={{ fontSize: 10, color: Colors.text, fontWeight: 'bold' }}>
                        {goalsFor}-{goalsAgainst}
                    </Text>
                    <Text style={{ fontSize: 8, color: (goalsFor - goalsAgainst) >= 0 ? Colors.primary : '#ff4444', fontWeight: '900' }}>
                        {(goalsFor - goalsAgainst) > 0 ? `+${goalsFor - goalsAgainst}` : (goalsFor - goalsAgainst)}
                    </Text>
                </View>
                <View style={[styles.statCell, styles.ptsCell]}>
                    <Text style={styles.ptsText}>{item.points || stats.points || 0}</Text>
                    {item.lastPoints !== 0 && (
                        <Text style={[styles.lastPtsText, { color: item.lastPoints > 0 ? Colors.primary : '#ff4444' }]}>
                            ({item.lastPoints > 0 ? `+${item.lastPoints}` : item.lastPoints})
                        </Text>
                    )}
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <View style={styles.container}>
            <VideoBackground
                source={require('../assets/images/welcomeScreenVideo1.mp4')}
                overlayOpacity={0.85}
                style={StyleSheet.absoluteFill}
            />
            
            <SafeAreaView style={{ flex: 1 }}>
                <View style={styles.screenHeader}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Ionicons name="chevron-back" size={24} color={Colors.primary} />
                </TouchableOpacity>
                <Text style={styles.title} numberOfLines={1}>
                    {currentTournament?.name || initialTournamentName || 'Turnir Jadvali'}
                </Text>
            </View>

            {/* Tournament Selector (Horizontal) */}
            <View style={styles.selectorContainer}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.selectorScroll}>
                    {tournaments.map((t) => (
                        <TouchableOpacity
                            key={t._id}
                            style={[styles.filterChip, currentTournament?._id === t._id && styles.activeChip]}
                            onPress={() => loadData(t._id)}
                        >
                            <Text style={[styles.filterText, currentTournament?._id === t._id && styles.activeFilterText]}>
                                {t.name}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

            {loading && !refreshing ? (
                <View style={{ padding: 15 }}>
                    <TableSkeleton />
                </View>
            ) : (
                <FlatList
                    data={standings}
                    ListHeaderComponent={renderHeader}
                    renderItem={renderTeam}
                    keyExtractor={(item, idx) => (item.teamId || item._id || item.id || idx).toString()}
                    contentContainerStyle={styles.list}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
                    }
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Ionicons name="stats-chart-outline" size={48} color={Colors.surfaceLight} />
                            <Text style={styles.emptyText}>Ma'lumotlar mavjud emas</Text>
                        </View>
                    }
                />
            )}
            </SafeAreaView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'transparent',
    },
    screenHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 15,
        backgroundColor: Colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
    },
    backBtn: {
        marginRight: 15,
    },
    title: {
        flex: 1,
        color: Colors.text,
        fontSize: 18,
        fontWeight: 'bold',
    },
    selectorContainer: {
        backgroundColor: Colors.surface,
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
    },
    selectorScroll: {
        paddingHorizontal: 15,
    },
    filterChip: {
        backgroundColor: 'rgba(255,255,255,0.05)',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        marginHorizontal: 5,
    },
    activeChip: {
        backgroundColor: Colors.primary,
    },
    filterText: {
        color: Colors.textMuted,
        fontSize: 13,
        fontWeight: '600',
    },
    activeFilterText: {
        color: '#000',
    },
    list: {
        padding: 8,
    },
    tableHeader: {
        flexDirection: 'row',
        paddingVertical: 12,
        paddingHorizontal: 12,
        backgroundColor: 'rgba(255,255,255,0.02)',
        borderRadius: 10,
        marginBottom: 8,
    },
    headerText: {
        color: Colors.textMuted,
        fontSize: 10,
        fontWeight: 'bold',
        textAlign: 'center',
        textTransform: 'uppercase',
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10, // Tighter vertical padding
        paddingHorizontal: 12,
        borderRadius: 12,
        marginBottom: 4,
    },
    evenRow: {
        backgroundColor: 'rgba(255,255,255,0.03)',
    },
    oddRow: {
        backgroundColor: 'transparent',
    },
    posCell: {
        width: 30,
        color: Colors.textMuted,
        fontSize: 14,
        fontWeight: 'bold',
        textAlign: 'center',
    },
    topPos: {
        color: Colors.primary,
    },
    teamCell: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingLeft: 8,
    },
    logoWrapper: {
        width: 24, // Smaller logos as requested
        height: 24,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
    },
    miniLogo: {
        width: 22,
        height: 22,
        resizeMode: 'contain',
    },
    miniPlaceholder: {
        width: 18,
        height: 18,
        borderRadius: 9,
        opacity: 0.5,
    },
    teamName: {
        color: Colors.text,
        fontSize: 13, // Slightly smaller font
        fontWeight: '600',
    },
    statCell: {
        width: 30,
        color: Colors.text,
        fontSize: 13,
        textAlign: 'center',
    },
    ptsCell: {
        width: 35,
        justifyContent: 'center',
        alignItems: 'center',
    },
    ptsText: {
        fontWeight: '900',
        color: Colors.primary,
        fontSize: 14,
    },
    lastPtsText: {
        fontSize: 7,
        fontWeight: 'bold',
        marginTop: -1,
    },
    emptyContainer: {
        marginTop: 100,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyText: {
        color: Colors.textMuted,
        marginTop: 15,
        fontSize: 14,
    }
});

export default StandingsScreen;
