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
import { useTeamStore } from '../store/useTeamStore';
import { apiService } from '../services/apiService';
import { Team } from '../types';

export default function TeamsScreen() {
    const { teams, setTeams, isLoading, setLoading } = useTeamStore();

    const fetchTeams = async () => {
        try {
            setLoading(true);
            const response = await apiService.getTeams(1, 100);
            setTeams(response.data);
        } catch (error) {
            console.error('Error fetching teams:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTeams();
    }, []);

    const renderTeamItem = ({ item }: { item: Team }) => (
        <TouchableOpacity style={styles.teamCard}>
            <View style={styles.logoContainer}>
                {item.logo ? (
                    <Image source={{ uri: item.logo }} style={styles.logo} />
                ) : (
                    <View style={styles.logoPlaceholder}>
                        <Text style={styles.logoInitial}>{item.name.charAt(0)}</Text>
                    </View>
                )}
            </View>
            <View style={styles.infoContainer}>
                <Text style={styles.teamName}>{item.name}</Text>
                <Text style={styles.teamStats}>
                    {item.stats?.played || 0} O'yin • {item.stats?.points || 0} Ochko
                </Text>
            </View>
            <View style={styles.arrowContainer}>
                <Text style={styles.arrow}>›</Text>
            </View>
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            {isLoading && teams.length === 0 ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={Colors.primary} />
                    <Text style={styles.loadingText}>Jamoalar yuklanmoqda...</Text>
                </View>
            ) : (
                <FlatList
                    data={teams}
                    keyExtractor={(item) => item._id}
                    renderItem={renderTeamItem}
                    contentContainerStyle={styles.listContent}
                    refreshing={isLoading}
                    onRefresh={fetchTeams}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Text style={styles.emptyText}>Hozircha jamoalar mavjud emas</Text>
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
    teamCard: {
        backgroundColor: Colors.surface,
        borderRadius: 12,
        padding: 12,
        marginBottom: 12,
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: Colors.border,
    },
    logoContainer: {
        marginRight: 16,
    },
    logo: {
        width: 50,
        height: 50,
        borderRadius: 25,
    },
    logoPlaceholder: {
        width: 50,
        height: 50,
        backgroundColor: Colors.surfaceLight,
        borderRadius: 25,
        justifyContent: 'center',
        alignItems: 'center',
    },
    logoInitial: {
        color: Colors.primary,
        fontSize: 20,
        fontWeight: 'bold',
    },
    infoContainer: {
        flex: 1,
    },
    teamName: {
        color: Colors.text,
        fontSize: 16,
        fontWeight: 'bold',
    },
    teamStats: {
        color: Colors.textMuted,
        fontSize: 13,
        marginTop: 4,
    },
    arrowContainer: {
        paddingLeft: 8,
    },
    arrow: {
        color: Colors.textMuted,
        fontSize: 24,
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
