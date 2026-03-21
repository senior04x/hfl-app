import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, ActivityIndicator, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../constants/Colors';
import ApiSlider from '../components/ApiSlider';
import { apiService } from '../services/apiService';
import { useSocket } from '../context/SocketContext';
import HomeSkeleton from '../components/HomeSkeleton';
import Skeleton from '../components/Skeleton';
import { useAuthStore } from '../store/useAuthStore';
import SmartImage from '../components/SmartImage';

const { width } = Dimensions.get('window');

export default function HomeScreen({ navigation }: any) {
    const [matches, setMatches] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const { socket, isConnected } = useSocket();
    const { user } = useAuthStore();

    useEffect(() => {
        loadMatches();
    }, []);

    useEffect(() => {
        if (socket && isConnected) {
            socket.on('match-update', (updatedMatch: any) => {
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
            const data = await apiService.getMatches();
            if (data && Array.isArray(data)) {
                // Sort by date ascending to show upcoming first
                const sortedMatches = data.sort((a: any, b: any) =>
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

    // Derived State for different sections
    const liveMatches = matches.filter(m => m.status === 'live');
    const upcomingMatches = matches.filter(m => m.status === 'scheduled').slice(0, 5); // recommendations
    const finishedMatches = matches.filter(m => m.status === 'finished').slice(0, 5);

    // Reusable Match Card Component (Horizontal)
    const renderHorizontalMatchCard = (match: any, isLive: boolean = false) => {
        const matchDate = new Date(match.date);
        const months = [
            'Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun', 
            'Iyul', 'Avgust', 'Sentabr', 'Oktabr', 'Noyabr', 'Dekabr'
        ];
        const day = matchDate.getDate();
        const month = months[matchDate.getMonth()];
        const year = matchDate.getFullYear();
        const hours = matchDate.getHours().toString().padStart(2, '0');
        const minutes = matchDate.getMinutes().toString().padStart(2, '0');
        const formattedFullDate = `${day}-${month}, ${year}`;
        const formattedTime = `${hours}:${minutes}`;

        return (
            <TouchableOpacity
                key={match._id || Math.random().toString()}
                style={[styles.hMatchCard, isLive && styles.hMatchCardLive]}
                onPress={() => navigation.navigate('MatchDetail', { matchId: match._id })}
            >
                <View style={styles.hMatchHeader}>
                    <Text style={styles.hMatchLeague} numberOfLines={1}>{match.tournamentName || "O'rtoqlik uchrashuvi"}</Text>
                    {isLive ? (
                        <View style={styles.liveBadgeContainer}>
                            <View style={styles.liveDot} />
                            <Text style={styles.liveBadgeText}>LIVE</Text>
                        </View>
                    ) : (
                        <Text style={styles.hMatchTime}>{match.time || formattedTime}</Text>
                    )}
                </View>

                <View style={styles.hMatchTeamsRow}>
                    {/* Home Team */}
                    <View style={styles.hTeamColumn}>
                        <View style={styles.hLogoCircle}>
                            {match.homeTeamLogo || match.homeTeam?.logo ? (
                                <Image source={{ uri: match.homeTeamLogo || match.homeTeam?.logo }} style={styles.hTeamLogo} />
                            ) : (
                                <Text style={styles.hLogoText}>{(match.homeTeamName || match.homeTeam?.name)?.charAt(0) || 'U'}</Text>
                            )}
                        </View>
                        <Text style={styles.hTeamName} numberOfLines={1}>{match.homeTeamName || match.homeTeam?.name || 'Uy jamoasi'}</Text>
                    </View>

                    {/* Score or VS */}
                    <View style={styles.hScoreColumn}>
                        {isLive || match.status === 'finished' ? (
                            <Text style={styles.hScoreText}>{match.score?.home || 0} - {match.score?.away || 0}</Text>
                        ) : (
                            <Text style={styles.hVsText}>VS</Text>
                        )}
                    </View>

                    {/* Away Team */}
                    <View style={styles.hTeamColumn}>
                        <View style={styles.hLogoCircle}>
                            {match.awayTeamLogo || match.awayTeam?.logo ? (
                                <Image source={{ uri: match.awayTeamLogo || match.awayTeam?.logo }} style={styles.hTeamLogo} />
                            ) : (
                                <Text style={styles.hLogoText}>{(match.awayTeamName || match.awayTeam?.name)?.charAt(0) || 'M'}</Text>
                            )}
                        </View>
                        <Text style={styles.hTeamName} numberOfLines={1}>{match.awayTeamName || match.awayTeam?.name || 'Mehmon'}</Text>
                    </View>
                </View>

                <View style={styles.hMatchFooter}>
                    <Text style={styles.hMatchDate}>{formattedFullDate}</Text>
                </View>
            </TouchableOpacity>
        );
    };

    if (loading && matches.length === 0) {
        return (
            <SafeAreaView style={styles.safeArea} edges={['top']}>
                <HomeSkeleton />
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.safeArea} edges={['top']}>
            <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
                {/* Header Section */}
                <View style={styles.header}>
                    <TouchableOpacity 
                        onPress={() => {
                            if (!user) return navigation.navigate('Welcome');
                            if (user.role === 'manager') {
                                navigation.navigate('TeamProfile', { teamId: user.id });
                            } else {
                                navigation.navigate('MyStats', { playerId: user.id });
                            }
                        }}
                    >
                        {user && (user.photo || user.logo || user.avatar) ? (
                            <SmartImage 
                                uri={user.photo || user.logo || user.avatar} 
                                style={{ width: 44, height: 44, borderRadius: 22, marginRight: 15 }}
                                fallbackIcon={user.role === 'manager' ? 'people' : 'person'}
                                contentFit="cover"
                            />
                        ) : (
                            <Ionicons name="person-circle-outline" size={44} color={Colors.primary} style={{ marginRight: 15 }} />
                        )}
                    </TouchableOpacity>

                    <View style={{ flex: 1 }}>
                        <Text style={styles.welcomeText}>Xush kelibsiz!</Text>
                        <Text style={styles.brandText} numberOfLines={1}>{user ? (user.name || user.firstName)?.toUpperCase() : 'AMATORA SPORTS'}</Text>
                    </View>
                </View>



                {/* Slider / Stories Area */}
                <View style={styles.sliderContainer}>
                    <ApiSlider />
                </View>

                {/* LIVE Matches Section */}
                {liveMatches.length > 0 && (
                    <View style={styles.sectionContainer}>
                        <View style={styles.sectionHeader}>
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <View style={[styles.liveDot, { marginRight: 6 }]} />
                                <Text style={styles.sectionTitle}>Jonli O'yinlar</Text>
                            </View>
                        </View>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalScrollContent}>
                            {liveMatches.map(m => renderHorizontalMatchCard(m, true))}
                        </ScrollView>
                    </View>
                )}

                {/* Recommended Upcoming Matches */}
                <View style={styles.sectionContainer}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Tavsiya etiladi</Text>
                        <TouchableOpacity onPress={() => navigation.navigate('Calendar')}>
                            <Text style={styles.viewAllText}>Barchasi</Text>
                        </TouchableOpacity>
                    </View>

                    {loading ? (
                        <View style={{ marginLeft: 20 }}>
                            <Skeleton width={width - 50} height={180} borderRadius={20} />
                        </View>
                    ) : upcomingMatches.length > 0 ? (
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalScrollContent}>
                            {upcomingMatches.map(m => renderHorizontalMatchCard(m, false))}
                        </ScrollView>
                    ) : (
                        <View style={styles.emptyCard}>
                            <Ionicons name="calendar-outline" size={32} color={Colors.textMuted} />
                            <Text style={styles.emptyText}>Rejalashtirilgan o'yinlar qolmadi</Text>
                        </View>
                    )}
                </View>

                {/* Top Teams/Highlights Mini Section */}
                <View style={styles.miniBannerContainer}>
                    <View style={styles.miniBannerContent}>
                        <View>
                            <Text style={styles.miniBannerTitle}>Oliy Liga 2026</Text>
                            <Text style={styles.miniBannerSubTitle}>Eng kuchli jamoalar reytingi</Text>
                        </View>
                        <TouchableOpacity style={styles.miniBannerBtn} onPress={() => navigation.navigate('Standings')}>
                            <Text style={styles.miniBannerBtnText}>Jadvalni ko'rish</Text>
                        </TouchableOpacity>
                    </View>
                    {/* Decorative Pattern overlay could go here */}
                </View>

                {/* Recent Results */}
                <View style={styles.sectionContainer}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>So'nggi Natijalar</Text>
                    </View>

                    {loading ? (
                        <View style={{ paddingHorizontal: 20 }}>
                            <Skeleton width="100%" height={60} borderRadius={12} style={{ marginBottom: 10 }} />
                            <Skeleton width="100%" height={60} borderRadius={12} />
                        </View>
                    ) : finishedMatches.length > 0 ? (
                        finishedMatches.map((match, idx) => (
                            <TouchableOpacity
                                key={match._id || idx}
                                style={styles.recentMatchItem}
                                onPress={() => navigation.navigate('MatchDetail', { matchId: match._id })}
                            >
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.recentTeams} numberOfLines={1}>
                                        {match.homeTeam?.name} <Text style={styles.recentScore}>{match.score?.home} - {match.score?.away}</Text> {match.awayTeam?.name}
                                    </Text>
                                </View>
                                <Text style={styles.recentDate}>
                                    {new Date(match.date).toLocaleDateString('uz-UZ', { day: '2-digit', month: 'short' })}
                                </Text>
                                <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} style={{ marginLeft: 8 }} />
                            </TouchableOpacity>
                        ))
                    ) : (
                        <View style={styles.emptyCard}>
                            <Ionicons name="football-outline" size={32} color={Colors.textMuted} />
                            <Text style={styles.emptyText}>Hozircha o'yinlar yo'q</Text>
                        </View>
                    )}
                </View>

                <View style={{ height: 60 }} />
            </ScrollView>
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
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        marginBottom: 15,
        marginTop: 15,
    },
    welcomeText: {
        color: Colors.textMuted,
        fontSize: 13,
        marginBottom: 2,
    },
    brandText: {
        color: Colors.text,
        fontSize: 22,
        fontWeight: '900',
        letterSpacing: 1,
        fontStyle: 'italic',
    },
    profileButton: {
        padding: 4,
    },
    myTeamBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: 'rgba(0, 255, 102, 0.08)',
        marginHorizontal: 20,
        marginBottom: 20,
        padding: 15,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(0, 255, 102, 0.2)',
    },
    myTeamInfo: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    myTeamIconBg: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(0, 255, 102, 0.15)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    myTeamTitle: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: 'bold',
    },
    myTeamSubtitle: {
        color: 'rgba(255, 255, 255, 0.5)',
        fontSize: 11,
        marginTop: 2,
    },
    sliderContainer: {
        marginBottom: 20,
    },

    // Horizontal Match Card Styles (Live & Recommended)
    recentTimeText: {
        color: Colors.textMuted,
        fontSize: 10,
        fontWeight: 'bold',
        marginLeft: 4,
    },
    horizontalScrollContent: {
        paddingHorizontal: 20,
        paddingBottom: 10,
    },
    hMatchCard: {
        width: width - 40, // Full width minus horizontal padding
        backgroundColor: '#0a1020',
        borderRadius: 20,
        padding: 20,
        marginRight: 15,
        borderWidth: 1,
        borderColor: '#1A2138',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.4,
        shadowRadius: 8,
        elevation: 8,
    },
    hMatchCardLive: {
        borderColor: Colors.danger,
        backgroundColor: '#1a0d10',
    },
    hMatchHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 15,
        paddingBottom: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#1A2138',
    },
    hMatchLeague: {
        color: '#8A94A6',
        fontSize: 14,
        fontWeight: 'bold',
        flex: 1,
        textTransform: 'uppercase',
    },
    hMatchTime: {
        color: Colors.primary,
        fontSize: 12,
        fontWeight: 'bold',
    },
    hMatchTeamsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 15,
    },
    hTeamColumn: {
        flex: 1,
        alignItems: 'center',
    },
    hLogoCircle: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: '#1A2138',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 10,
    },
    hTeamLogo: {
        width: 40,
        height: 40,
        resizeMode: 'contain',
    },
    hLogoText: {
        color: '#FFF',
        fontSize: 18,
        fontWeight: 'bold',
    },
    hTeamName: {
        color: '#FFF',
        fontSize: 14,
        fontWeight: 'bold',
        textAlign: 'center',
        marginTop: 4,
    },
    hScoreColumn: {
        width: 80,
        alignItems: 'center',
        justifyContent: 'center',
    },
    hScoreText: {
        color: '#FFF',
        fontSize: 28,
        fontWeight: '900',
    },
    hVsText: {
        color: '#8A94A6',
        fontSize: 18,
        fontWeight: 'bold',
        fontStyle: 'italic',
    },
    hMatchFooter: {
        alignItems: 'center',
    },
    hMatchDate: {
        color: '#8A94A6',
        fontSize: 12,
    },

    liveBadgeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(239, 68, 68, 0.2)',
        paddingHorizontal: 6,
        paddingVertical: 3,
        borderRadius: 4,
    },
    liveDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: Colors.danger,
        marginRight: 4,
    },
    liveBadgeText: {
        color: Colors.danger,
        fontSize: 10,
        fontWeight: 'bold',
        letterSpacing: 0.5,
    },

    // Generics Sections
    sectionContainer: {
        marginBottom: 25,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        marginBottom: 15,
    },
    sectionTitle: {
        color: '#FFF',
        fontSize: 18,
        fontWeight: 'bold',
    },
    viewAllText: {
        color: Colors.primary,
        fontSize: 14,
        fontWeight: 'bold',
    },

    // Mini Banner
    miniBannerContainer: {
        marginHorizontal: 20,
        marginBottom: 25,
        backgroundColor: '#051024',
        borderRadius: 16,
        padding: 20,
        borderWidth: 1,
        borderColor: '#1A2138',
        borderLeftWidth: 4,
        borderLeftColor: Colors.primary,
    },
    miniBannerContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    miniBannerTitle: {
        color: '#FFF',
        fontSize: 18,
        fontWeight: '900',
        marginBottom: 4,
        fontStyle: 'italic',
    },
    miniBannerSubTitle: {
        color: '#8A94A6',
        fontSize: 12,
    },
    miniBannerBtn: {
        backgroundColor: Colors.primary,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
    },
    miniBannerBtnText: {
        color: '#000',
        fontSize: 12,
        fontWeight: 'bold',
    },

    // Recent Matches Row (List Style)
    recentMatchItem: {
        backgroundColor: '#051024',
        marginHorizontal: 20,
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
        marginBottom: 10,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderLeftWidth: 3,
        borderLeftColor: '#1A2138',
    },
    recentTeams: {
        color: '#FFF',
        fontSize: 14,
        fontWeight: '600',
    },
    recentScore: {
        color: Colors.primary,
        fontWeight: '900',
    },
    recentDate: {
        color: '#8A94A6',
        fontSize: 12,
        minWidth: 50,
        textAlign: 'right',
    },

    emptyCard: {
        backgroundColor: '#051024',
        marginHorizontal: 20,
        borderRadius: 16,
        padding: 30,
        alignItems: 'center',
        justifyContent: 'center',
        borderStyle: 'dashed',
        borderWidth: 1,
        borderColor: '#1A2138',
    },
    emptyText: {
        color: '#8A94A6',
        marginTop: 10,
        fontSize: 13,
    }
});
