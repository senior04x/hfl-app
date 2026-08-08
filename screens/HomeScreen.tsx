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
    }, [user?.id]);

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

    const fetchUserProfileData = async () => {
        if (!user?.id) return null;
        try {
            if (user.role === 'player') {
                return await apiService.getPlayerById(user.id);
            } else if (user.role === 'manager') {
                const teamId = user.teamId || user.team_id || user.id || user._id;
                return await apiService.getTeamById(teamId);
            }
        } catch (e) {
            console.error('Error fetching profile in HomeScreen:', e);
        }
        return null;
    };

    const loadData = async (isRefreshing = false) => {
        try {
            if (isRefreshing) setRefreshing(true);
            else setLoading(true);
            
            // Parallelize matches, slider items, and user profile fetching
            const [matchesData, sliderData, profileData] = await Promise.all([
                apiService.getMatches().catch(err => { console.error('Matches fetch err:', err); return []; }),
                apiService.getSliderItems().catch(err => { console.error('Slider fetch err:', err); return []; }),
                fetchUserProfileData().catch(err => { console.error('Profile fetch err:', err); return null; })
            ]);

            if (matchesData && Array.isArray(matchesData)) {
                setMatches(matchesData);
            }

            if (sliderData && Array.isArray(sliderData)) {
                const validItems = sliderData.filter((item: any) => item.isActive !== false);
                setSliderItems(validItems);
                validItems.forEach((item: any) => {
                    if (item.bgImage) Image.prefetch(item.bgImage).catch(() => {});
                    if (item.topPlayer?.photoUrl) Image.prefetch(item.topPlayer.photoUrl).catch(() => {});
                    if (item.topPlayer?.teamLogo) Image.prefetch(item.topPlayer.teamLogo).catch(() => {});
                });
            }

            if (profileData) {
                setUserProfile(profileData);
            } else if (!user?.id) {
                setUserProfile(null);
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
        .filter(m => m.status === 'scheduled' && (m.importance === 'markaziy' || m.importance === 'ortacha'))
        .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
        .slice(0, 5);

    // Strictly display ONLY markaziy or ortacha matches on Home Screen. Oddiy matches show in Calendar only.
    const displayUpcomingMatches = upcomingMatches;

    const finishedMatches = matches
        .filter(m => m.status === 'finished')
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 5);

    // Reusable Match Card Component with Importance Border & Badge
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

        // Importance Styling
        const importance = match.importance || 'oddiy';
        let borderStyle: any = { borderColor: 'rgba(255, 255, 255, 0.15)', borderWidth: 1 };
        if (importance === 'markaziy') {
            borderStyle = { 
                borderColor: '#FFE600', 
                borderWidth: 2, 
                shadowColor: '#FFE600',
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 0.9,
                shadowRadius: 12,
                elevation: 10,
                backgroundColor: 'rgba(255, 230, 0, 0.08)'
            };
        } else if (importance === 'ortacha') {
            borderStyle = { 
                borderColor: '#0EA5E9', 
                borderWidth: 1.8, 
                shadowColor: '#0EA5E9',
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 0.7,
                shadowRadius: 8,
                elevation: 6,
                backgroundColor: 'rgba(14, 165, 233, 0.06)'
            };
        }

        return (
            <TouchableOpacity
                key={match._id || Math.random().toString()}
                style={[
                    isVertical ? styles.vMatchCard : styles.hMatchCard, 
                    borderStyle,
                    isLive && styles.hMatchCardLive
                ]}
                onPress={() => navigation.navigate('MatchDetail', { matchId: match._id })}
            >
                <BlurView intensity={25} tint="dark" style={StyleSheet.absoluteFill} />
                
                <View style={{ padding: 18 }}>
                    <View style={[styles.hMatchHeader, isVertical && styles.vMatchHeader]}>
                        <Text style={styles.hMatchLeague} numberOfLines={1}>{match.tournamentName || "O'rtoqlik uchrashuvi"}</Text>
                        
                        {/* Priority Badge */}
                        {importance === 'markaziy' ? (
                            <View style={styles.markaziyBadgeTag}>
                                <Text style={styles.markaziyBadgeText}>⭐ MARKAZIY</Text>
                            </View>
                        ) : importance === 'ortacha' ? (
                            <View style={styles.ortachaBadgeTag}>
                                <Text style={styles.ortachaBadgeText}>⚡ SHIDDATLI</Text>
                            </View>
                        ) : isLive ? (
                            <View style={styles.liveBadgeContainer}>
                                <View style={styles.liveDot} />
                                <Text style={styles.liveBadgeText}>LIVE</Text>
                            </View>
                        ) : null}
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
                        contentContainerStyle={{ paddingBottom: 110 }}
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
                            
                            let displayName = 'AMATORA SPORTS';
                            if (user) {
                                if (user.role === 'player') {
                                    const pName = userProfile ? `${userProfile.first_name || ''} ${userProfile.last_name || ''}`.trim() : (user.name || user.firstName);
                                    if (pName) displayName = pName;
                                } else if (user.role === 'manager') {
                                    const tName = userProfile?.name || user.teamName || user.name;
                                    if (tName) displayName = tName;
                                } else if (user.name) {
                                    displayName = user.name;
                                }
                            }

                            return (
                                <View style={styles.header}>
                                    <View>
                                        <Text style={styles.welcomeText}>XUSH KELIBSIZ 👋</Text>
                                        <Text style={styles.brandText}>{displayName.toUpperCase()}</Text>
                                    </View>
                                    <TouchableOpacity 
                                        style={styles.profileButton}
                                        onPress={() => navigation.navigate('AccountTab')}
                                    >
                                        {avatarUri ? (
                                            <SmartImage 
                                                uri={avatarUri}
                                                style={{ width: 44, height: 44, borderRadius: 22, borderWidth: 2, borderColor: Colors.primary }}
                                                fallbackIcon="person"
                                            />
                                        ) : (
                                            <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: Colors.primary }}>
                                                <Ionicons name="person" size={22} color={Colors.primary} />
                                            </View>
                                        )}
                                    </TouchableOpacity>
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

                        {/* Recommended Upcoming Matches Header with "BATAFSIL TAQVIM ->" Button */}
                        <View style={styles.sectionContainer}>
                            <View style={styles.sectionHeader}>
                                <Text style={styles.sectionTitle}>Markaziy O'yinlar</Text>
                                <TouchableOpacity onPress={() => navigation.navigate('CalendarTab')}>
                                    <Text style={styles.viewAllText}>BATAFSIL TAQVIM →</Text>
                                </TouchableOpacity>
                            </View>

                            {loading ? (
                                <View style={{ paddingHorizontal: 20 }}>
                                    <Skeleton width="100%" height={180} borderRadius={20} />
                                </View>
                            ) : displayUpcomingMatches.length > 0 ? (
                                <View style={styles.verticalMatchList}>
                                    {displayUpcomingMatches.map(m => renderMatchCard(m, false, true))}
                                </View>
                            ) : (
                                <View style={styles.emptyCard}>
                                    <Ionicons name="calendar-outline" size={32} color={Colors.textMuted} />
                                    <Text style={styles.emptyText}>Rejalashtirilgan o'yinlar qolmadi</Text>
                                </View>
                            )}
                        </View>

                        {/* Recent Results Header with "BARCHA NATIJALAR ->" Button */}
                        <View style={styles.sectionContainer}>
                            <View style={styles.sectionHeader}>
                                <Text style={styles.sectionTitle}>So'nggi Natijalar</Text>
                                <TouchableOpacity onPress={() => navigation.navigate('TournamentsTab')}>
                                    <Text style={styles.viewAllText}>BARCHA NATIJALAR →</Text>
                                </TouchableOpacity>
                            </View>

                            {loading ? (
                                <View style={{ paddingHorizontal: 20 }}>
                                    <Skeleton width="100%" height={120} borderRadius={20} style={{ marginBottom: 10 }} />
                                    <Skeleton width="100%" height={120} borderRadius={20} />
                                </View>
                            ) : finishedMatches.length > 0 ? (
                                finishedMatches.map((match, idx) => {
                                    const rawDate = match.date || match.match_date;
                                    const matchDate = new Date(rawDate);
                                    const isValidDate = !isNaN(matchDate.getTime());

                                    const months = ['Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun', 'Iyul', 'Avgust', 'Sentabr', 'Oktabr', 'Noyabr', 'Dekabr'];
                                    const day = isValidDate ? matchDate.getDate() : '';
                                    const month = isValidDate ? months[matchDate.getMonth()] : '';
                                    const formattedDate = isValidDate ? `${day}-${month}` : (match.date_str || "Tugagan o'yin");

                                    const homeLogo = match.homeTeamLogo || match.homeTeam?.logo || match.home_team_logo;
                                    const awayLogo = match.awayTeamLogo || match.awayTeam?.logo || match.away_team_logo;
                                    const homeName = formatShortTeamName(match.homeTeamName || match.homeTeam?.name || 'Mezbon', 12);
                                    const awayName = formatShortTeamName(match.awayTeamName || match.awayTeam?.name || 'Mehmon', 12);
                                    const venue = match.venue || match.stadium_name || match.stadium || "Amatora Arena";
                                    const leagueName = match.tournamentName || match.league_name || match.league || "SUPER LIGA";
                                    const roundText = match.round ? `${match.round}-TUR` : (match.tour ? `${match.tour}-TUR` : "TUGAGAN O'YIN");

                                    return (
                                        <TouchableOpacity
                                            key={match._id || match.id || idx}
                                            style={styles.finishedMatchCard}
                                            onPress={() => navigation.navigate('MatchDetail', { matchId: match._id || match.id })}
                                            activeOpacity={0.85}
                                        >
                                            <BlurView intensity={25} tint="dark" style={StyleSheet.absoluteFill} />
                                            <View style={styles.finishedCardInner}>
                                                {/* Header Row: League Name + Round Badge */}
                                                <View style={styles.finishedHeaderRow}>
                                                    <View style={styles.finishedLeagueBadge}>
                                                        <Ionicons name="trophy-outline" size={12} color={Colors.primary} style={{ marginRight: 4 }} />
                                                        <Text style={styles.finishedLeagueText} numberOfLines={1}>{leagueName.toUpperCase()}</Text>
                                                    </View>
                                                    <View style={styles.finishedRoundBadge}>
                                                        <Text style={styles.finishedRoundText}>{roundText}</Text>
                                                    </View>
                                                </View>

                                                {/* Center Row: Team Logos & Final Score */}
                                                <View style={styles.finishedScoreRow}>
                                                    {/* Home Team */}
                                                    <View style={styles.finishedTeamCol}>
                                                        <View style={styles.finishedLogoCircle}>
                                                            {homeLogo ? (
                                                                <Image source={{ uri: homeLogo }} style={styles.finishedTeamLogo} resizeMode="contain" />
                                                            ) : (
                                                                <Text style={styles.finishedLogoFallback}>{homeName.charAt(0)}</Text>
                                                            )}
                                                        </View>
                                                        <Text style={styles.finishedTeamName} numberOfLines={1}>{homeName}</Text>
                                                    </View>

                                                    {/* Final Score Box */}
                                                    <View style={styles.finishedScoreBox}>
                                                        <Text style={styles.finishedScoreText}>
                                                            {match.score?.home ?? match.home_score ?? 0} : {match.score?.away ?? match.away_score ?? 0}
                                                        </Text>
                                                        <View style={styles.finishedBadgeTag}>
                                                            <Text style={styles.finishedBadgeTagText}>TUGADI</Text>
                                                        </View>
                                                    </View>

                                                    {/* Away Team */}
                                                    <View style={styles.finishedTeamCol}>
                                                        <View style={styles.finishedLogoCircle}>
                                                            {awayLogo ? (
                                                                <Image source={{ uri: awayLogo }} style={styles.finishedTeamLogo} resizeMode="contain" />
                                                            ) : (
                                                                <Text style={styles.finishedLogoFallback}>{awayName.charAt(0)}</Text>
                                                            )}
                                                        </View>
                                                        <Text style={styles.finishedTeamName} numberOfLines={1}>{awayName}</Text>
                                                    </View>
                                                </View>

                                                {/* Footer Row: Date Finished + Venue/Stadium */}
                                                <View style={styles.finishedFooterRow}>
                                                    <View style={styles.finishedFooterItem}>
                                                        <Ionicons name="time-outline" size={12} color="rgba(255,255,255,0.5)" style={{ marginRight: 4 }} />
                                                        <Text style={styles.finishedFooterText}>{formattedDate}</Text>
                                                    </View>
                                                    <Text style={styles.finishedDotSeparator}>•</Text>
                                                    <View style={styles.finishedFooterItem}>
                                                        <Ionicons name="location-outline" size={12} color="rgba(255,255,255,0.5)" style={{ marginRight: 4 }} />
                                                        <Text style={styles.finishedFooterText} numberOfLines={1}>{venue}</Text>
                                                    </View>
                                                </View>
                                            </View>
                                        </TouchableOpacity>
                                    );
                                })
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
    markaziyBadgeTag: {
        backgroundColor: 'rgba(255, 230, 0, 0.2)',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: 'rgba(255, 230, 0, 0.6)',
    },
    markaziyBadgeText: {
        color: '#FFE600',
        fontSize: 10,
        fontWeight: '900',
        letterSpacing: 0.5,
    },
    ortachaBadgeTag: {
        backgroundColor: 'rgba(14, 165, 233, 0.2)',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: 'rgba(14, 165, 233, 0.6)',
    },
    ortachaBadgeText: {
        color: '#0EA5E9',
        fontSize: 10,
        fontWeight: '900',
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
        fontSize: 14,
        marginTop: 10,
    },

    // Finished Match Rich Cards
    finishedMatchCard: {
        marginHorizontal: 20,
        marginBottom: 12,
        borderRadius: 20,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.15)',
        backgroundColor: 'rgba(15, 23, 42, 0.45)',
    },
    finishedCardInner: {
        padding: 14,
    },
    finishedHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    finishedLeagueBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 255, 135, 0.12)',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 8,
    },
    finishedLeagueText: {
        fontSize: 10,
        fontWeight: '800',
        color: Colors.primary,
        letterSpacing: 0.5,
    },
    finishedRoundBadge: {
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 8,
    },
    finishedRoundText: {
        fontSize: 10,
        fontWeight: '700',
        color: '#FFFFFF',
        letterSpacing: 0.5,
    },
    finishedScoreRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginVertical: 4,
    },
    finishedTeamCol: {
        alignItems: 'center',
        flex: 1,
    },
    finishedLogoCircle: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 4,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.15)',
    },
    finishedTeamLogo: {
        width: 32,
        height: 32,
    },
    finishedLogoFallback: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '900',
    },
    finishedTeamName: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '700',
        textAlign: 'center',
    },
    finishedScoreBox: {
        alignItems: 'center',
        paddingHorizontal: 12,
    },
    finishedScoreText: {
        color: '#FFFFFF',
        fontSize: 22,
        fontWeight: '900',
        letterSpacing: 1,
    },
    finishedBadgeTag: {
        backgroundColor: 'rgba(239, 68, 68, 0.2)',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 6,
        marginTop: 2,
    },
    finishedBadgeTagText: {
        color: '#EF4444',
        fontSize: 9,
        fontWeight: '800',
        letterSpacing: 0.5,
    },
    finishedFooterRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 10,
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255, 255, 255, 0.06)',
    },
    finishedFooterItem: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    finishedFooterText: {
        color: 'rgba(255, 255, 255, 0.6)',
        fontSize: 11,
        fontWeight: '600',
    },
    finishedDotSeparator: {
        color: 'rgba(255, 255, 255, 0.3)',
        marginHorizontal: 8,
    },
});
