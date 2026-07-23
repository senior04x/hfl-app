import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, ActivityIndicator, Dimensions, RefreshControl } from 'react-native';
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
import { BlurView } from 'expo-blur';
import AnimatedBackground from '../components/AnimatedBackground';
import backgroundImage from '../assets/images/backroud-image.png';
import { formatShortTeamName } from '../utils/stringUtils';


const { width } = Dimensions.get('window');
const CARD_WIDTH = width * 0.88;
const CARD_SPACING = 12;
const SIDE_PADDING = (width - CARD_WIDTH) / 2;


export default function HomeScreen({ navigation }: any) {
    const [matches, setMatches] = useState<any[]>([]);
    const [sliderItems, setSliderItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const { socket, isConnected } = useSocket();
    const { user } = useAuthStore();
    const [userProfile, setUserProfile] = useState<any>(null);

    useEffect(() => {
        loadData();
    }, []);

    useEffect(() => {
        if (user?.id) {
            loadUserProfile();
        } else {
            setUserProfile(null);
        }
    }, [user?.id]);

    const loadUserProfile = async () => {
        try {
            if (user.role === 'player') {
                const player = await apiService.getPlayerById(user.id);
                if (player) setUserProfile(player);
            } else if (user.role === 'manager') {
                const teamId = user.teamId || user.team_id || user.id || user._id;
                const team = await apiService.getTeamById(teamId);
                if (team) setUserProfile(team);
            }
        } catch (e) {
            console.error('Error loading profile in HomeScreen:', e);
        }
    };

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

    const loadData = async (isRefreshing = false) => {
        try {
            if (isRefreshing) setRefreshing(true);
            else setLoading(true);
            
            // Parallelize matches and slider items fetching
            const [matchesData, sliderData] = await Promise.all([
                apiService.getMatches().catch(err => { console.error('Matches fetch err:', err); return []; }),
                apiService.getSliderItems().catch(err => { console.error('Slider fetch err:', err); return []; })
            ]);

            if (matchesData && Array.isArray(matchesData)) {
                // We'll sort specifically for each section in the derived state
                setMatches(matchesData);
            }

            if (sliderData && Array.isArray(sliderData)) {
                setSliderItems(sliderData.filter((item: any) => item.isActive));
            }
        } catch (error) {
            console.error('Error loading home data:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = () => {
        loadData(true);
    };

    // Derived State for different sections
    const liveMatches = matches
        .filter(m => m.status === 'live')
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const upcomingMatches = matches
        .filter(m => m.status === 'scheduled')
        // Sort by createdAt DESC (last added first) as requested by the user
        .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
        .slice(0, 5); // recommendations

    const finishedMatches = matches
        .filter(m => m.status === 'finished')
        // Sort by date DESC (most recent results first)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 5);

    // Reusable Match Card Component
    const renderMatchCard = (match: any, isLive: boolean = false, isVertical: boolean = false) => {
        const rawDate = match.date || match.match_date;
        const matchDate = new Date(rawDate);
        const isValidDate = !isNaN(matchDate.getTime());

        const months = [
            'Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun', 
            'Iyul', 'Avgust', 'Sentabr', 'Oktabr', 'Noyabr', 'Dekabr'
        ];
        const day = isValidDate ? matchDate.getDate() : '';
        const month = isValidDate ? months[matchDate.getMonth()] : '';
        const year = isValidDate ? matchDate.getFullYear() : '';
        
        let formattedTime = String(match.match_time || match.time || '').trim();
        if (formattedTime && formattedTime.includes(':')) {
            const timeParts = formattedTime.split(':');
            if (timeParts.length >= 2) {
                formattedTime = `${timeParts[0].padStart(2, '0')}:${timeParts[1].padStart(2, '0')}`;
            }
        }
        if (!formattedTime && isValidDate) {
            const hrs = String(matchDate.getHours()).padStart(2, '0');
            const mins = String(matchDate.getMinutes()).padStart(2, '0');
            if (hrs !== '00' || mins !== '00') {
                formattedTime = `${hrs}:${mins}`;
            }
        }
        if (!formattedTime) formattedTime = '18:00';

        const formattedFullDate = isValidDate ? `${day}-${month}, ${year}` : (match.date_str || "Bo'lajak o'yin");

        return (
            <TouchableOpacity
                key={match._id || Math.random().toString()}
                style={[
                    isVertical ? styles.vMatchCard : styles.hMatchCard, 
                    isLive && styles.hMatchCardLive
                ]}
                onPress={() => navigation.navigate('MatchDetail', { matchId: match._id })}
            >
                {/* Glass Effect Background */}
                <BlurView intensity={25} tint="dark" style={StyleSheet.absoluteFill} />
                
                <View style={{ padding: 20 }}>
                    <View style={[styles.hMatchHeader, isVertical && styles.vMatchHeader]}>
                        <Text style={styles.hMatchLeague} numberOfLines={1}>{match.tournamentName || "O'rtoqlik uchrashuvi"}</Text>
                        {isLive && (
                            <View style={styles.liveBadgeContainer}>
                                <View style={styles.liveDot} />
                                <Text style={styles.liveBadgeText}>LIVE</Text>
                            </View>
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
                            <Text style={styles.hTeamName} numberOfLines={1}>{formatShortTeamName(match.homeTeamName || match.homeTeam?.name || 'Uy jamoasi', 12)}</Text>
                        </View>

                        {/* Score or VS */}
                        <View style={styles.hScoreColumn}>
                            {isLive || match.status === 'finished' ? (
                                <Text style={styles.hScoreText}>{match.score?.home || 0} - {match.score?.away || 0}</Text>
                            ) : (
                                <View style={styles.vsContainer}>
                                    <Text style={styles.hTimeVsText}>{formattedTime}</Text>
                                    <Text style={styles.vsSubText}>BOSHLANISHI</Text>
                                </View>
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
                            <Text style={styles.hTeamName} numberOfLines={1}>{formatShortTeamName(match.awayTeamName || match.awayTeam?.name || 'Mehmon', 12)}</Text>
                        </View>
                    </View>

                    <View style={styles.hMatchFooter}>
                        <Text style={styles.hMatchDate}>{formattedFullDate} • {match.venue || "Amatora Arena"}</Text>
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <AnimatedBackground overlayOpacity={0.6} backgroundImage={backgroundImage}>
            <SafeAreaView style={styles.safeArea} edges={['top']}>
                {loading && matches.length === 0 ? (
                    <HomeSkeleton />
                ) : (
                    <ScrollView 
                        style={styles.container} 
                        showsVerticalScrollIndicator={false}
                        refreshControl={
                            <RefreshControl
                                refreshing={refreshing}
                                onRefresh={onRefresh}
                                tintColor={Colors.primary}
                                colors={[Colors.primary]}
                            />
                        }
                    >
                        {/* Header Section */}
                        {(() => {
                            const avatarUri = userProfile?.photoUrl || userProfile?.photo_url || userProfile?.photo || userProfile?.logoUrl || userProfile?.logo_url || userProfile?.logo || userProfile?.avatar || user?.photoUrl || user?.photo_url || user?.photo || user?.logoUrl || user?.logo_url || user?.logo || user?.avatar;
                            const displayName = userProfile?.teamName || userProfile?.name || (userProfile?.firstName ? `${userProfile.firstName} ${userProfile.lastName || ''}`.trim() : null) || user?.teamName || user?.name || user?.firstName || user?.team_name || 'AMATORA';

                            const hour = new Date().getHours();
                            let greeting = 'Xayrli kun!';
                            if (hour >= 5 && hour < 12) greeting = 'Xayrli tong!';
                            else if (hour >= 12 && hour < 18) greeting = 'Xayrli kun!';
                            else if (hour >= 18 && hour < 23) greeting = 'Xayrli kech!';
                            else greeting = 'Xayrli tun!';

                            return (
                                <View style={styles.header}>
                                    <TouchableOpacity 
                                        onPress={() => {
                                            if (!user) return navigation.navigate('Welcome');
                                            if (user.role === 'manager') {
                                                const teamId = userProfile?.id || user.teamId || user.team_id || user.id;
                                                navigation.navigate('TeamProfile', { teamId });
                                            } else {
                                                navigation.navigate('MyStats', { playerId: user.id });
                                            }
                                        }}
                                        activeOpacity={0.8}
                                    >
                                        {avatarUri ? (
                                            <View style={{ width: 46, height: 46, marginRight: 14, borderRadius: 5, overflow: 'hidden', backgroundColor: 'rgba(255, 255, 255, 0.08)' }}>
                                                <SmartImage 
                                                    uri={avatarUri} 
                                                    style={{ width: '100%', height: '100%' }}
                                                    fallbackIcon={user?.role === 'manager' ? 'shield' : 'person'}
                                                    contentFit="cover"
                                                />
                                            </View>
                                        ) : (
                                            <View style={{ width: 46, height: 46, marginRight: 14, borderRadius: 5, backgroundColor: 'rgba(255, 255, 255, 0.08)', justifyContent: 'center', alignItems: 'center' }}>
                                                <Ionicons name={user?.role === 'manager' ? 'shield' : 'person'} size={24} color="#FFFFFF" />
                                            </View>
                                        )}
                                    </TouchableOpacity>

                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.welcomeText}>{greeting}</Text>
                                        <Text style={styles.brandText} numberOfLines={1}>{user ? displayName.toUpperCase() : 'AMATORA SPORTS'}</Text>
                                    </View>
                                </View>
                            );
                        })()}

                        {/* Slider / Stories Area */}
                        <View style={styles.sliderContainer}>
                            <ApiSlider initialItems={sliderItems} externalLoading={loading} />
                        </View>

                        {/* LIVE Matches Section - Snapping Slider */}
                        {liveMatches.length > 0 && (
                            <View style={styles.sectionContainer}>
                                <ScrollView 
                                    horizontal 
                                    showsHorizontalScrollIndicator={false} 
                                    contentContainerStyle={styles.carouselScrollContent}
                                    snapToInterval={CARD_WIDTH + CARD_SPACING}
                                    decelerationRate="fast"
                                    scrollEventThrottle={16}
                                >
                                    {liveMatches.map((m, index) => (
                                        <View 
                                            key={m._id || index} 
                                            style={{ marginRight: index === liveMatches.length - 1 ? 0 : CARD_SPACING }}
                                        >
                                            {renderMatchCard(m, true, false)}
                                        </View>
                                    ))}
                                </ScrollView>
                            </View>
                        )}

                        {/* Recommended Upcoming Matches - Vertical List */}
                        <View style={styles.sectionContainer}>
                            {loading ? (
                                <View style={{ paddingHorizontal: 20 }}>
                                    <Skeleton width="100%" height={180} borderRadius={20} />
                                </View>
                            ) : upcomingMatches.length > 0 ? (
                                <View style={styles.verticalMatchList}>
                                    {upcomingMatches.map(m => renderMatchCard(m, false, true))}
                                </View>
                            ) : (
                                <View style={styles.emptyCard}>
                                    <Ionicons name="calendar-outline" size={32} color={Colors.textMuted} />
                                    <Text style={styles.emptyText}>Rejalashtirilgan o'yinlar qolmadi</Text>
                                </View>
                            )}
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
                                        <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
                                        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, paddingHorizontal: 16, paddingVertical: 14 }}>
                                            <View style={{ flex: 1 }}>
                                                <Text style={styles.recentTeams} numberOfLines={1}>
                                                    {match.homeTeam?.name} <Text style={styles.recentScore}>{match.score?.home} - {match.score?.away}</Text> {match.awayTeam?.name}
                                                </Text>
                                            </View>
                                            <Text style={styles.recentDate}>
                                                {new Date(match.date).toLocaleDateString('uz-UZ', { day: '2-digit', month: 'short' })}
                                            </Text>
                                            <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} style={{ marginLeft: 8 }} />
                                        </View>
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
                )}
            </SafeAreaView>
        </AnimatedBackground>
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
        width: CARD_WIDTH,
        borderRadius: 20,
        overflow: 'hidden', // Required for BlurView
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.4,
        shadowRadius: 8,
        elevation: 8,
    },
    vMatchCard: {
        width: width - 40,
        borderRadius: 20,
        overflow: 'hidden', // Required for BlurView
        marginBottom: 15,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    vMatchHeader: {
        borderBottomColor: 'rgba(255,255,255,0.05)',
    },
    verticalMatchList: {
        paddingHorizontal: 20,
    },
    carouselScrollContent: {
        paddingHorizontal: SIDE_PADDING,
        paddingBottom: 10,
    },
    hMatchCardLive: {
        borderColor: 'rgba(239, 68, 68, 0.45)',
        backgroundColor: 'rgba(239, 68, 68, 0.12)',
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
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },
    hTeamLogo: {
        width: 54,
        height: 54,
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
        fontSize: 11,
        fontWeight: '500',
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



    // Recent Matches Row (List Style)
    recentMatchItem: {
        marginHorizontal: 20,
        borderRadius: 12,
        marginBottom: 10,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderLeftWidth: 3,
        borderLeftColor: 'rgba(255,255,255,0.1)',
        overflow: 'hidden',
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
    vsContainer: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    hTimeVsText: {
        color: Colors.primary,
        fontSize: 28,
        fontWeight: '900',
        fontStyle: 'italic',
        letterSpacing: -1,
    },
    vsSubText: {
        color: 'rgba(255, 255, 255, 0.3)',
        fontSize: 8,
        fontWeight: 'bold',
        marginTop: -4,
        letterSpacing: 1,
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
