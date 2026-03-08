import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    Image,
    ActivityIndicator,
    SafeAreaView
} from 'react-native';
import Colors from '../constants/Colors';
import { apiService } from '../services/apiService';
import { useSocket } from '../context/SocketContext';

const StandingsScreen = ({ route }: any) => {
    const { tournamentId, tournamentName } = route.params || {};
    const [standings, setStandings] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const { socket, isConnected } = useSocket();

    useEffect(() => {
        loadStandings();
    }, [tournamentId]);

    useEffect(() => {
        if (socket && isConnected) {
            socket.on('standings-update', (data: any) => {
                if (data.tournamentId === tournamentId) {
                    console.log('📊 Standings Update Received:', data.standings);
                    setStandings(data.standings);
                }
            });

            return () => {
                socket.off('standings-update');
            };
        }
    }, [socket, isConnected, tournamentId]);

    const loadStandings = async () => {
        try {
            setLoading(true);
            // We'll use a generic teams endpoint filtered by tournament if specific standings endpoint is not yet ready
            const response = await apiService.getTeams(1, 50, tournamentId);
            if (response.data) {
                // Sort by points, then GD, then GF
                const sorted = response.data.sort((a: any, b: any) => {
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
        } catch (error) {
            console.error('Error loading standings:', error);
        } finally {
            setLoading(false);
        }
    };

    const renderHeader = () => (
        <View style={styles.tableHeader}>
            <Text style={[styles.headerText, { width: 30 }]}>#</Text>
            <Text style={[styles.headerText, { flex: 1 }]}>JAMOA</Text>
            <Text style={[styles.headerText, { width: 30 }]}>O'</Text>
            <Text style={[styles.headerText, { width: 30 }]}>G/N</Text>
            <Text style={[styles.headerText, { width: 40, fontWeight: '900' }]}>OCH</Text>
        </View>
    );

    const renderTeam = ({ item, index }: any) => {
        const stats = item.stats || {};
        const gd = (stats.goalsFor || 0) - (stats.goalsAgainst || 0);

        return (
            <View style={[styles.row, index % 2 === 0 ? styles.evenRow : styles.oddRow]}>
                <Text style={[styles.cell, { width: 30, color: index < 3 ? Colors.primary : Colors.text }]}>{index + 1}</Text>
                <View style={[styles.teamCell, { flex: 1 }]}>
                    {item.logo ? <Image source={{ uri: item.logo }} style={styles.miniLogo} /> : <View style={[styles.miniPlaceholder, { backgroundColor: item.color || Colors.primary }]} />}
                    <Text style={styles.teamName} numberOfLines={1}>{item.name}</Text>
                </View>
                <Text style={[styles.cell, { width: 30 }]}>{stats.played || 0}</Text>
                <Text style={[styles.cell, { width: 30, fontSize: 10 }]}>{gd > 0 ? `+${gd}` : gd}</Text>
                <Text style={[styles.cell, { width: 40, fontWeight: 'bold', color: Colors.primary }]}>{stats.points || 0}</Text>
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.screenHeader}>
                <Text style={styles.title}>{tournamentName || 'Turnir Jadvali'}</Text>
            </View>

            {loading ? (
                <ActivityIndicator color={Colors.primary} style={{ marginTop: 40 }} />
            ) : (
                <FlatList
                    data={standings}
                    ListHeaderComponent={renderHeader}
                    renderItem={renderTeam}
                    keyExtractor={(item) => item._id || item.id}
                    contentContainerStyle={styles.list}
                />
            )}
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    screenHeader: {
        padding: 20,
        backgroundColor: Colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
    },
    title: {
        color: Colors.text,
        fontSize: 20,
        fontWeight: 'bold',
    },
    list: {
        padding: 10,
    },
    tableHeader: {
        flexDirection: 'row',
        paddingVertical: 12,
        paddingHorizontal: 10,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
        backgroundColor: Colors.surface,
        borderRadius: 8,
        marginBottom: 5,
    },
    headerText: {
        color: Colors.textMuted,
        fontSize: 10,
        fontWeight: 'bold',
        textAlign: 'center',
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 15,
        paddingHorizontal: 10,
        borderRadius: 8,
        marginVertical: 2,
    },
    evenRow: {
        backgroundColor: Colors.surface,
    },
    oddRow: {
        backgroundColor: 'transparent',
    },
    cell: {
        color: Colors.text,
        fontSize: 14,
        textAlign: 'center',
    },
    teamCell: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingLeft: 10,
    },
    miniLogo: {
        width: 24,
        height: 24,
        borderRadius: 12,
        marginRight: 10,
    },
    miniPlaceholder: {
        width: 24,
        height: 24,
        borderRadius: 12,
        marginRight: 10,
    },
    teamName: {
        color: Colors.text,
        fontSize: 14,
        fontWeight: '600',
    }
});

export default StandingsScreen;
