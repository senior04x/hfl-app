import React, { useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    ActivityIndicator,
    Dimensions,
    Linking
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../constants/Colors';
import { useTournamentStore } from '../store/useTournamentStore';
import { apiService } from '../services/apiService';
import { useNavigation } from '@react-navigation/native';
import SmartImage from '../components/SmartImage';
import LeaguesSkeleton from '../components/LeaguesSkeleton';
import VideoBackground from '../components/VideoBackground';
import { useTranslation } from 'react-i18next';

export default function LeaguesScreen() {
    const { t } = useTranslation();
    const { tournaments: groups, setTournaments: setGroups, isLoading, setLoading } = useTournamentStore();
    const navigation = useNavigation<any>();

    const fetchLeaguesAndTournaments = async () => {
        try {
            setLoading(true);
            const data = await apiService.getLeagues();
            if (data && Array.isArray(data)) {
                // Defensive check: if teamCount/playerCount is missing or 0, we try to fetch all teams to count them
                // This is a temporary fallback until backend is redeployed and data is synced
                const hasMissingCounts = data.some(l => !l.teamCount || !l.playerCount);

                if (hasMissingCounts) {
                    try {
                        const allTeams = await apiService.getTeams(1, 1000);
                        const enrichedData = data.map(league => {
                            if (league.teamCount === undefined || league.playerCount === undefined) {
                                const leagueTeams = allTeams.filter((t: any) =>
                                    (t.leagueId === league._id || t.leagueId === league.id)
                                );
                                return {
                                    ...league,
                                    teamCount: league.teamCount ?? leagueTeams.length,
                                    playerCount: league.playerCount ?? leagueTeams.reduce((acc: number, t: any) => acc + (t.playersCount || 0), 0)
                                };
                            }
                            return league;
                        });
                        setGroups(enrichedData);
                    } catch (teamError) {
                        console.error('Error fetching teams for fallback count:', teamError);
                        setGroups(data);
                    }
                } else {
                    setGroups(data);
                }
            }
        } catch (error) {
            console.error('Error fetching leagues:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLeaguesAndTournaments();
    }, []);

    const renderLeagueItem = ({ item: league }: { item: any }) => (
        <TouchableOpacity
            style={styles.leagueCardWrapper}
            activeOpacity={0.9}
            onPress={() => navigation.navigate('LeagueTournaments', {
                leagueId: league._id,
                leagueName: league.name,
                league: league
            })}
        >
            <View style={styles.cardImageContainer}>
                <SmartImage
                    uri={league.logo || league.imageUrl || 'https://images.unsplash.com/photo-1574629810360-7efbb6b6973f?auto=format&fit=crop&q=80&w=1000'}
                    style={styles.leagueImageBg}
                    contentFit="cover"
                    fallbackIcon="trophy-outline"
                    fallbackIconSize={48}
                />
                <View style={[styles.topBadgeRow, { position: 'absolute', top: 12, left: 12 }]}>
                    <View style={styles.badge}>
                        <Ionicons name="trophy" size={14} color="#000" />
                        <Text style={styles.badgeText}>AMATORA LIGA</Text>
                    </View>
                </View>
            </View>

            <View style={styles.leagueCardInfoArea}>
                <View style={styles.infoTopRow}>
                    <View>
                        <Text style={styles.leagueTitleText}>{league.name}</Text>
                        <View style={styles.locationContainer}>
                            <Ionicons name="location-outline" size={14} color={Colors.textMuted} />
                            <Text style={styles.locationText}>O'zbekiston</Text>
                        </View>
                    </View>
                </View>
                <View style={styles.socialRow}>
                    {league.instagram && (
                        <TouchableOpacity
                            style={styles.socialIconBtn}
                            onPress={() => Linking.openURL(league.instagram)}
                        >
                            <Ionicons name="logo-instagram" size={18} color="#E1306C" />
                        </TouchableOpacity>
                    )}
                    {league.facebook && (
                        <TouchableOpacity
                            style={styles.socialIconBtn}
                            onPress={() => Linking.openURL(league.facebook)}
                        >
                            <Ionicons name="logo-facebook" size={18} color="#1877F2" />
                        </TouchableOpacity>
                    )}
                    {league.youtube && (
                        <TouchableOpacity
                            style={styles.socialIconBtn}
                            onPress={() => Linking.openURL(league.youtube)}
                        >
                            <Ionicons name="logo-youtube" size={18} color="#FF0000" />
                        </TouchableOpacity>
                    )}
                    {!league.instagram && !league.facebook && !league.youtube && (
                        <View style={styles.socialIconBtn}>
                            <Ionicons name="logo-instagram" size={18} color={Colors.textMuted} />
                        </View>
                    )}
                </View>

                <View style={styles.statsContainer}>
                    <View style={styles.statBubble}>
                        <Text style={styles.statBubbleVal}>{league.tournaments?.length || 0}</Text>
                        <Text style={styles.statBubbleLabel}>{t('tournaments.title')}</Text>
                    </View>
                    <View style={styles.statBubble}>
                        <Text style={styles.statBubbleVal}>{league.teamCount || 0}</Text>
                        <Text style={styles.statBubbleLabel}>{t('teams.title')}</Text>
                    </View>
                </View>
            </View>
        </TouchableOpacity>
    );

    return (
        <View style={styles.safeArea}>
            <VideoBackground
                source={require('../assets/images/welcomeScreenVideo1.mp4')}
                overlayOpacity={0.85}
            >
            <SafeAreaView style={{ flex: 1 }} edges={['top']}>
            {/* Main Screen Header */}
            <View style={styles.mainHeader}>
                <View style={styles.headerTitleRow}>
                    <Text style={styles.mainHeaderTitle}>Amatora Ligalar</Text>
                    <TouchableOpacity style={styles.searchBtn}>
                        <Ionicons name="search" size={20} color="#000" />
                    </TouchableOpacity>
                </View>
            </View>

            <View style={styles.container}>
                {isLoading && groups.length === 0 ? (
                    <LeaguesSkeleton />
                ) : (
                    <FlatList
                        data={groups}
                        keyExtractor={(item) => item._id}
                        renderItem={renderLeagueItem}
                        contentContainerStyle={styles.list}
                        refreshing={isLoading}
                        onRefresh={fetchLeaguesAndTournaments}
                        ListEmptyComponent={
                            <View style={styles.empty}>
                                <Ionicons name="alert-circle-outline" size={48} color={Colors.textMuted} />
                                <Text style={styles.emptyText}>Hozircha faol ligalar mavjud emas</Text>
                            </View>
                        }
                    />
                )}
            </View>
            </SafeAreaView>
            </VideoBackground>
        </View>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: 'transparent',
    },
    container: {
        flex: 1,
        backgroundColor: 'transparent',
    },
    mainHeader: {
        backgroundColor: 'transparent',
        paddingTop: 15,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
        paddingBottom: 10,
    },
    headerTitleRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
    },
    mainHeaderTitle: {
        color: Colors.text,
        fontSize: 24,
        fontWeight: '900',
    },
    searchBtn: {
        backgroundColor: Colors.primary,
        padding: 8,
        borderRadius: 8,
    },
    list: {
        paddingBottom: 40,
        paddingHorizontal: 16,
    },
    leagueCardWrapper: {
        width: '100%',
        backgroundColor: Colors.surface,
        marginBottom: 24,
        borderRadius: 20,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.05)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.5,
        shadowRadius: 10,
        elevation: 10,
    },
    cardImageContainer: {
        width: '100%',
        aspectRatio: 1,
    },
    leagueImageBg: {
        flex: 1,
        justifyContent: 'flex-start',
        padding: 16,
    },
    topBadgeRow: {
        flexDirection: 'row',
        justifyContent: 'flex-start',
    },
    badge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.primary,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    badgeText: {
        color: '#000',
        fontWeight: 'bold',
        fontSize: 10,
        marginLeft: 4,
    },
    leagueCardInfoArea: {
        padding: 18,
    },
    infoTopRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    leagueTitleText: {
        color: '#FFF',
        fontSize: 22,
        fontWeight: '900',
        marginBottom: 2,
    },
    locationContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    locationText: {
        color: Colors.textMuted,
        fontSize: 13,
        marginLeft: 4,
    },
    socialRow: {
        flexDirection: 'row',
        gap: 8,
        marginVertical: 12, // Spacing above and below icons
    },
    socialIconBtn: {
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        padding: 8,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.05)',
    },
    statsContainer: {
        flexDirection: 'row',
        justifyContent: 'flex-start',
    },
    statBubble: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 10,
        marginRight: 10,
    },
    statBubbleVal: {
        color: Colors.primary,
        fontSize: 14,
        fontWeight: 'bold',
        marginRight: 4,
    },
    statBubbleLabel: {
        color: Colors.textMuted,
        fontSize: 12,
    },
    loading: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 50,
    },
    empty: {
        alignItems: 'center',
        marginTop: 60,
    },
    emptyText: {
        color: Colors.textMuted,
        marginTop: 12,
        fontSize: 16,
    }
});
