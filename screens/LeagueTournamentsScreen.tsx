import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    ActivityIndicator,
    ImageBackground,
    Linking
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../constants/Colors';
import { apiService } from '../services/apiService';
import GenericListSkeleton from '../components/GenericListSkeleton';
import SmartImage from '../components/SmartImage';

export default function LeagueTournamentsScreen({ route, navigation }: any) {
    const { leagueId, leagueName, league } = route?.params || {};
    const [tournaments, setTournaments] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchTournaments = async () => {
        try {
            setIsLoading(true);
            const data = await apiService.getTournaments();
            if (data && Array.isArray(data)) {
                if (leagueId) {
                    const filtered = data.filter((t: any) => t.leagueId === leagueId);
                    setTournaments(filtered);
                } else {
                    setTournaments(data);
                }
            }
        } catch (error) {
            console.error('Error fetching tournaments:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchTournaments();
    }, [leagueId]);

    const renderTournamentItem = ({ item: tournament }: { item: any }) => (
        <TouchableOpacity
            key={tournament._id}
            style={styles.tournamentItem}
            onPress={() => navigation.navigate('Teams', {
                tournamentId: tournament._id,
                tournamentName: tournament.name
            })}
        >
            <View style={styles.tournamentItemInfo}>
                <Text style={styles.tournamentItemName}>{tournament.name || 'Noma\'lum turnir'}</Text>
                <View style={styles.tournamentStatusRow}>
                    <View style={[
                        styles.statusDot,
                        { backgroundColor: tournament.status === 'ongoing' ? Colors.primary : Colors.textMuted }
                    ]} />
                    <Text style={styles.tournamentItemSeason}>{tournament.season || 'Mavsum aniq emas'}</Text>
                </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={Colors.surfaceLight} />
        </TouchableOpacity>
    );

    const renderHeader = () => (
        <View style={styles.leagueHeaderSection}>
            <View style={styles.leagueInfoRow}>
                <View style={styles.miniLogoBox}>
                    {league?.logo ? (
                        <SmartImage
                            uri={league.logo}
                            style={styles.miniLogoImage}
                            contentFit="contain"
                            fallbackIcon="trophy-outline"
                        />
                    ) : (
                        <View style={styles.miniLogoPlaceholder}>
                            <Text style={styles.miniLogoText}>Amatora</Text>
                        </View>
                    )}
                </View>
                <View style={styles.leagueTextContainer}>
                    <Text style={styles.leagueNameHeading}>{leagueName}</Text>
                    <View style={styles.locationSmallRow}>
                        <Ionicons name="flag" size={12} color={Colors.textMuted} />
                        <Text style={styles.locationSmallText}>{league?.location || 'O\'zbekiston'}</Text>
                    </View>
                </View>
                <View style={styles.socialMicroRow}>
                    {league?.instagram && (
                        <TouchableOpacity
                            style={styles.socialBtnMicro}
                            onPress={() => Linking.openURL(league.instagram)}
                        >
                            <Ionicons name="logo-instagram" size={18} color="#E1306C" />
                        </TouchableOpacity>
                    )}
                    {league?.facebook && (
                        <TouchableOpacity
                            style={styles.socialBtnMicro}
                            onPress={() => Linking.openURL(league.facebook)}
                        >
                            <Ionicons name="logo-facebook" size={18} color="#1877F2" />
                        </TouchableOpacity>
                    )}
                    {league?.youtube && (
                        <TouchableOpacity
                            style={styles.socialBtnMicro}
                            onPress={() => Linking.openURL(league.youtube)}
                        >
                            <Ionicons name="logo-youtube" size={18} color="#FF0000" />
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            <View style={styles.statsRow}>
                <View style={styles.statItem}>
                    <Text style={styles.statVal}>{tournaments.length}</Text>
                    <Text style={styles.statLab}>Turnir</Text>
                </View>
                <View style={styles.statItem}>
                    <Text style={styles.statVal}>
                        {league?.teamCount !== undefined ? league.teamCount : (league?.tournaments?.reduce((acc: number, t: any) => acc + (t.teams?.length || 0), 0) || 0)}
                    </Text>
                    <Text style={styles.statLab}>Jamoa</Text>
                </View>
                <View style={styles.statItem}>
                    <Text style={styles.statVal}>
                        {league?.playerCount ? league.playerCount : (tournaments.reduce((acc: number, t: any) => acc + (t.teams?.length || 0), 0) || 0)}
                    </Text>
                    <Text style={styles.statLab}>O'yinchi</Text>
                </View>
            </View>

            <View style={styles.sectionDivider} />
            <Text style={styles.tournamentsTitle}>Mavjud Turnirlar</Text>
        </View>
    );

    return (
        <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                    <Ionicons name="chevron-back" size={28} color={Colors.primary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{leagueName || 'Turnirlar'}</Text>
            </View>

            <View style={styles.container}>
                {isLoading && tournaments.length === 0 ? (
                    <GenericListSkeleton count={6} itemHeight={80} />
                ) : (
                    <FlatList
                        data={tournaments}
                        keyExtractor={(item) => item._id}
                        renderItem={renderTournamentItem}
                        ListHeaderComponent={renderHeader}
                        contentContainerStyle={styles.list}
                        refreshing={isLoading}
                        onRefresh={fetchTournaments}
                        ListEmptyComponent={
                            <View style={styles.empty}>
                                <Ionicons name="trophy-outline" size={48} color={Colors.textMuted} />
                                <Text style={styles.emptyText}>Ushbu ligada hozircha turnirlar yo'q</Text>
                            </View>
                        }
                    />
                )}
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 15,
        backgroundColor: Colors.background,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
    },
    backButton: {
        marginRight: 16,
    },
    headerTitle: {
        flex: 1,
        color: Colors.text,
        fontSize: 20,
        fontWeight: 'bold',
    },
    list: {
        paddingBottom: 40,
    },
    leagueHeaderSection: {
        backgroundColor: Colors.surface,
        padding: 20,
        marginBottom: 10,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.05)',
    },
    leagueInfoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
    },
    miniLogoBox: {
        width: 60,
        height: 60,
        backgroundColor: '#FFF',
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15,
    },
    miniLogoText: {
        color: '#000',
        fontSize: 18,
        fontWeight: '900',
        fontStyle: 'italic',
    },
    miniLogoPlaceholder: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#FFF',
        borderRadius: 12,
    },
    miniLogoImage: {
        width: '100%',
        height: '100%',
        borderRadius: 12,
    },
    leagueTextContainer: {
        flex: 1,
    },
    leagueNameHeading: {
        color: '#FFF',
        fontSize: 22,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    locationSmallRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    locationSmallText: {
        color: Colors.textMuted,
        fontSize: 12,
        marginLeft: 4,
    },
    socialMicroRow: {
        flexDirection: 'row',
        gap: 8,
    },
    socialBtnMicro: {
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        padding: 8,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.05)',
    },
    statsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingTop: 15,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.05)',
    },
    statItem: {
        alignItems: 'center',
        flex: 1,
    },
    statVal: {
        color: Colors.primary,
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    statLab: {
        color: Colors.textMuted,
        fontSize: 11,
        textTransform: 'uppercase',
    },
    sectionDivider: {
        height: 1,
        backgroundColor: 'rgba(255,255,255,0.05)',
        marginVertical: 20,
    },
    tournamentsTitle: {
        color: Colors.primary,
        fontSize: 14,
        fontWeight: 'bold',
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    tournamentItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
        backgroundColor: Colors.surface,
        marginHorizontal: 10,
        marginTop: 10,
        borderRadius: 8,
    },
    tournamentItemInfo: {
        flex: 1,
    },
    tournamentItemName: {
        color: Colors.text,
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 6,
    },
    tournamentStatusRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    statusDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginRight: 8,
    },
    tournamentItemSeason: {
        color: Colors.textMuted,
        fontSize: 13,
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
