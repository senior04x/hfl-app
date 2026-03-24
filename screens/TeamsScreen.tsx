import React, { useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    ActivityIndicator,
    Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../constants/Colors';
import { useTeamStore } from '../store/useTeamStore';
import { apiService } from '../services/apiService';
import { Team } from '../types';
import SmartImage from '../components/SmartImage';
import TeamsSkeleton from '../components/TeamsSkeleton';
import { Video, ResizeMode } from 'expo-av';
import VideoBackground from '../components/VideoBackground';

export default function TeamsScreen({ route, navigation }: any) {
    const { tournamentId } = route?.params || {};
    const { teams, setTeams, isLoading, setLoading } = useTeamStore();

    const fetchTeams = async () => {
        try {
            setLoading(true);
            const data = await apiService.getTeams(1, 100, tournamentId);
            setTeams(data || []);
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
        <TouchableOpacity
            style={styles.teamCard}
            onPress={() => navigation.navigate('TeamProfile', { teamId: item._id, tournamentId: tournamentId })}
        >
            <View style={styles.logoContainer}>
                <SmartImage
                    uri={item.logo}
                    style={styles.logo}
                    contentFit="cover"
                    fallbackIcon="shield-outline"
                    fallbackIconSize={24}
                    borderRadius={25}
                />
            </View>
            <View style={styles.infoContainer}>
                <Text style={styles.teamName}>{item.name || 'Noma\'lum jamoa'}</Text>
                <Text style={styles.teamStats}>
                    {item.stats?.played || 0} O'yin • {item.stats?.points || 0} Ochko
                </Text>
                {(item.instagram || item.facebook || item.youtube) && (
                    <View style={styles.socialRow}>
                        {item.instagram && (
                            <TouchableOpacity
                                style={styles.socialIcon}
                                onPress={() => Linking.openURL(item.instagram!)}
                            >
                                <Ionicons name="logo-instagram" size={14} color="#E1306C" />
                            </TouchableOpacity>
                        )}
                        {item.facebook && (
                            <TouchableOpacity
                                style={styles.socialIcon}
                                onPress={() => Linking.openURL(item.facebook!)}
                            >
                                <Ionicons name="logo-facebook" size={14} color="#1877F2" />
                            </TouchableOpacity>
                        )}
                        {item.youtube && (
                            <TouchableOpacity
                                style={styles.socialIcon}
                                onPress={() => Linking.openURL(item.youtube!)}
                            >
                                <Ionicons name="logo-youtube" size={14} color="#FF0000" />
                            </TouchableOpacity>
                        )}
                    </View>
                )}
            </View>
            <View style={styles.arrowContainer}>
                <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
            </View>
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            <VideoBackground
                source={require('../assets/images/welcomeScreenVideo1.mp4')}
                overlayOpacity={0.85}
                style={StyleSheet.absoluteFill}
            />
            <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={Colors.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{route?.params?.tournamentName || 'Jamoalar'}</Text>
                <View style={styles.placeholder} />
            </View>

            {isLoading && teams.length === 0 ? (
                <TeamsSkeleton />
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
        width: 32, // to balance the header center alignment
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
    socialRow: {
        flexDirection: 'row',
        marginTop: 6,
        gap: 8,
    },
    socialIcon: {
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        padding: 4,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.05)',
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
