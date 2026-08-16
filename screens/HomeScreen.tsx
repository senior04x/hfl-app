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
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width * 0.88;
const CARD_SPACING = 12;
const SIDE_PADDING = (width - CARD_WIDTH) / 2;

export default function HomeScreen({ navigation }: any) {
    const { t } = useTranslation();
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

    // Importance Rank helper for sorting: Markaziy (1) -> Ortacha (2) -> Oddiy (3)
    const getImportanceRank = (imp?: string) => {
        if (imp === 'markaziy') return 1;
        if (imp === 'ortacha') return 2;
        return 3;
    };

    const upcomingMatches = matches
        .filter(m => m.status === 'scheduled' && (m.importance === 'markaziy' || m.importance === 'ortacha'))
        .sort((a, b) => {
            const rankDiff = getImportanceRank(a.importance) - getImportanceRank(b.importance);
            if (rankDiff !== 0) return rankDiff;
            return new Date(b.createdAt || b.date || 0).getTime() - new Date(a.createdAt || a.date || 0).getTime();
        })
        .slice(0, 5);

    const displayUpcomingMatches = upcomingMatches;

    const finishedMatches = matches
        .filter(m => m.status === 'finished')
        .sort((a, b) => {
            const rankDiff = getImportanceRank(a.importance) - getImportanceRank(b.importance);
            if (rankDiff !== 0) return rankDiff;
            return new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime();
        })
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

        const roundTagText = match.round ? `${match.round}-TUR` : (match.tour ? `${match.tour}-TUR` : '');

        return (
            <TouchableOpacity
                key={match._id || Math.random().toString()}
                style={[
                    isVertical ? styles.vMatchCard : styles.hMatchCard,
                    isLive && styles.hMatchCardLive
                ]}
                onPress={() => navigation.navigate('MatchDetail', { matchId: match._id })}
                activeOpacity={0.85}
            >
                <BlurView intensity={25} tint="dark" style={StyleSheet.absoluteFill} />
                
                <View style={{ padding: 18 }}>
                    <View style={[styles.hMatchHeader, isVertical && styles.vMatchHeader]}>
                        <Text style={styles.hMatchLeague} numberOfLines={1}>{match.tournamentName || "O'rtoqlik uchrashuvi"}</Text>
                        
                        {isLive ? (
                            <View style={styles.liveBadgeContainer}>
                                <View style={styles.liveDot} />
                                <Text style={styles.liveBadgeText}>LIVE</Text>
                            </View>
                        ) : roundTagText ? (
                            <View style={styles.roundBadgeTag}>
                                <Text style={styles.roundBadgeText}>{roundTagText}</Text>
                            </View>
                        ) : null}
                    </View>

                    <View style={styles.hMatchTeamsRow}>
                        <View style={styles.hTeamColumn}>
                            <View style={styles.hLogoCircle}>
                                {match.homeTeamLogo || match.homeTeam?.logo ? (
                                    <SmartImage
                                        uri={match.homeTeamLogo || match.homeTeam?.logo}
                                        style={styles.hTeamLogo}
                                        contentFit="contain"
                                        fallbackIcon="shield-outline"
                                    />
                                ) : (
                                    <Text style={styles.hLogoText}>{(match.homeTeamName || match.homeTeam?.name)?.charAt(0) || 'U'}</Text>
                                )}
                            </View>
                            <Text style={styles.hTeamName} numberOfLines={1}>{formatShortTeamName(match.homeTeamName || match.homeTeam?.name || 'Uy jamoasi', 12)}</Text>
                        </View>

                        <View style={styles.hScoreColumn}>
                            {isLive || match.status === 'finished' ? (
                                <Text style={styles.hScoreText}>{match.score?.home || 0} - {match.score?.away || 0}</Text>
                            ) : (
                                <View style={styles.vsContainer}>
                                    <Text style={styles.hTimeVsText}>{formattedTime}</Text>
                                    <Text style={styles.vsSubText}>{t('matches.starts')}</Text>
                                </View>
                            )}
                        </View>

                        <View style={styles.hTeamColumn}>
                            <View style={styles.hLogoCircle}>
                                {match.awayTeamLogo || match.awayTeam?.logo ? (
                                    <SmartImage
                                        uri={match.awayTeamLogo || match.awayTeam?.logo}
                                        style={styles.hTeamLogo}
                                        contentFit="contain"
                                        fallbackIcon="shield-outline"
                                    />
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
        <AnimatedBackground overlayOpacity={0.7} backgroundImage={backgroundImage}>
            <SafeAreaView style={styles.container} edges={['top']}>
                <ScrollView
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
                    }
                >
                    {loading ? (
                        <HomeSkeleton />
                    ) : (
                        <>
                            {(() => {
                                const avatarUri = userProfile?.photo || userProfile?.photo_url || userProfile?.avatar || userProfile?.logo || userProfile?.logo_url || user?.photo || user?.photo_url || user?.avatar || user?.logo || user?.logo_url;
                                const rawName = userProfile?.firstName || user?.firstName || userProfile?.name || userProfile?.team_name || user?.name || user?.team_name || 'AMATORA';
                                const displayName = rawName.replace(/\(sardor\)/gi, '').replace(/\(menejer\)/gi, '').trim().split(' ')[0] || 'AMATORA';

                                const getGreetingText = () => {
                                    const hour = new Date().getHours();
                                    if (hour >= 5 && hour < 12) return t('home.good_morning');
                                    if (hour >= 12 && hour < 18) return t('home.good_day');
                                    return t('home.good_evening');
                                };

                                return (
                                    <View style={styles.header}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                                            <TouchableOpacity 
                                                style={styles.profileButton}
                                                onPress={() => navigation.navigate('Profil')}
                                                activeOpacity={0.8}
                                            >
                                                {avatarUri ? (
                                                    <SmartImage 
                                                        uri={avatarUri}
                                                        style={styles.squircleAvatar}
                                                        fallbackIcon="person"
                                                    />
                                                ) : (
                                                    <View style={styles.squircleAvatarFallback}>
                                                        <Ionicons name="person" size={22} color="#FFFFFF" />
                                                    </View>
                                                )}
                                            </TouchableOpacity>
                                            <View>
                                                <Text style={styles.welcomeText}>{getGreetingText()}</Text>
                                                <Text style={styles.brandText}>{displayName.toUpperCase()}</Text>
                                            </View>
                                        </View>

                                        <TouchableOpacity 
                                            style={styles.profileButton}
                                            onPress={() => navigation.navigate('Notifications')}
                                            activeOpacity={0.75}
                                        >
                                            <View style={styles.bellButton}>
                                                <Ionicons name="notifications-outline" size={22} color="#FFFFFF" />
                                                <View style={styles.unreadBadgeDot} />
                                            </View>
                                        </TouchableOpacity>
                                    </View>
                                );
                            })()}

                            <View style={styles.sliderContainer}>
                                <ApiSlider initialItems={sliderItems} externalLoading={loading} />
                            </View>

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

                            <View style={styles.sectionContainer}>
                                <View style={styles.sectionHeader}>
                                    <Text style={styles.sectionTitle}>{t('home.featured_matches')}</Text>
                                    <TouchableOpacity onPress={() => navigation.navigate('Taqvim')}>
                                        <Text style={styles.viewAllText}>{t('home.view_calendar')}</Text>
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
                                        <Text style={styles.emptyText}>{t('home.no_upcoming_matches')}</Text>
                                    </View>
                                )}
                            </View>

                            <View style={styles.sectionContainer}>
                                <View style={styles.sectionHeader}>
                                    <Text style={styles.sectionTitle}>{t('home.recent_results')}</Text>
                                    <TouchableOpacity onPress={() => navigation.navigate('Turnirlar')}>
                                        <Text style={styles.viewAllText}>{t('home.view_all_results')}</Text>
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
                                                    <View style={styles.finishedHeaderRow}>
                                                        <View style={styles.finishedLeagueBadge}>
                                                            <Ionicons name="trophy-outline" size={12} color={Colors.primary} style={{ marginRight: 4 }} />
                                                            <Text style={styles.finishedLeagueText} numberOfLines={1}>{leagueName.toUpperCase()}</Text>
                                                        </View>
                                                        <View style={styles.finishedRoundBadge}>
                                                            <Text style={styles.finishedRoundText}>{roundText}</Text>
                                                        </View>
                                                    </View>

                                                    <View style={styles.finishedScoreRow}>
                                                        <View style={styles.finishedTeamCol}>
                                                            <View style={styles.finishedLogoCircle}>
                                                                {homeLogo ? (
                                                                    <SmartImage uri={homeLogo} style={styles.finishedTeamLogo} contentFit="contain" fallbackIcon="shield-outline" />
                                                                ) : (
                                                                    <Text style={styles.finishedLogoFallback}>{homeName.charAt(0)}</Text>
                                                                )}
                                                            </View>
                                                            <Text style={styles.finishedTeamName} numberOfLines={1}>{homeName}</Text>
                                                        </View>

                                                        <View style={styles.finishedScoreBox}>
                                                            <Text style={styles.finishedScoreText}>
                                                                {match.score?.home ?? match.home_score ?? 0} : {match.score?.away ?? match.away_score ?? 0}
                                                            </Text>
                                                            <View style={styles.finishedBadgeTag}>
                                                                <Text style={styles.finishedBadgeTagText}>{t('matches.finished')}</Text>
                                                            </View>
                                                        </View>

                                                        <View style={styles.finishedTeamCol}>
                                                            <View style={styles.finishedLogoCircle}>
                                                                {awayLogo ? (
                                                                    <SmartImage uri={awayLogo} style={styles.finishedTeamLogo} contentFit="contain" fallbackIcon="shield-outline" />
                                                                ) : (
                                                                    <Text style={styles.finishedLogoFallback}>{awayName.charAt(0)}</Text>
                                                                )}
                                                            </View>
                                                            <Text style={styles.finishedTeamName} numberOfLines={1}>{awayName}</Text>
                                                        </View>
                                                    </View>

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
                                        <Ionicons name="trophy-outline" size={32} color={Colors.textMuted} />
                                        <Text style={styles.emptyText}>{t('home.no_finished_matches')}</Text>
                                    </View>
                                )}
                            </View>
                        </>
                    )}
                </ScrollView>
            </SafeAreaView>
        </AnimatedBackground>
    );
}

const styles = StyleSheet.create({
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
        color: 'rgba(255, 255, 255, 0.65)',
        fontSize: 12,
        fontWeight: '700',
        marginBottom: 2,
        letterSpacing: 0.5,
    },
    brandText: {
        color: Colors.text,
        fontSize: 20,
        fontWeight: '900',
        letterSpacing: 0.8,
    },
    profileButton: {
        padding: 0,
    },
    bellButton: {
        width: 44,
        height: 44,
        borderRadius: 14,
        backgroundColor: 'rgba(255, 255, 255, 0.12)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 0,
        position: 'relative',
    },
    unreadBadgeDot: {
        position: 'absolute',
        top: 9,
        right: 10,
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#FF3B30',
        borderWidth: 1.5,
        borderColor: '#121212',
    },
    squircleAvatar: {
        width: 46,
        height: 46,
        borderRadius: 14,
        borderWidth: 0,
    },
    squircleAvatarFallback: {
        width: 46,
        height: 46,
        borderRadius: 14,
        backgroundColor: 'rgba(255, 255, 255, 0.12)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 0,
    },
    sliderContainer: {
        marginBottom: 20,
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
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: 'transparent',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
        borderWidth: 0,
        overflow: 'hidden',
    },
    hTeamLogo: {
        width: 52,
        height: 52,
        borderRadius: 26,
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
    roundBadgeTag: {
        backgroundColor: 'rgba(0, 255, 135, 0.12)',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: 'rgba(0, 255, 135, 0.3)',
    },
    roundBadgeText: {
        color: Colors.primary,
        fontSize: 10,
        fontWeight: '900',
        letterSpacing: 0.5,
    },
    hMatchCard: {
        width: CARD_WIDTH,
        borderRadius: 20,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.12)',
        backgroundColor: 'rgba(15, 23, 42, 0.45)',
    },
    vMatchCard: {
        width: width - 40,
        borderRadius: 20,
        overflow: 'hidden',
        marginBottom: 14,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.12)',
        backgroundColor: 'rgba(15, 23, 42, 0.45)',
    },

    hMatchCardWrapper: {
        width: CARD_WIDTH,
    },
    vMatchCardWrapper: {
        width: width - 40,
    },
    hMatchCardInner: {
        width: '100%',
        borderRadius: 20.2,
        overflow: 'hidden',
        backgroundColor: 'rgba(15, 23, 42, 0.75)',
    },
    vMatchCardInner: {
        width: '100%',
        borderRadius: 20.2,
        overflow: 'hidden',
        backgroundColor: 'rgba(15, 23, 42, 0.75)',
    },
    finishedCardMargin: {
        marginHorizontal: 20,
        marginBottom: 12,
    },
    finishedMatchCardInner: {
        width: '100%',
        borderRadius: 20.2,
        overflow: 'hidden',
        backgroundColor: 'rgba(15, 23, 42, 0.75)',
    },
    glassmorphicCardBorder: {
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.18)',
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
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: 'transparent',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 4,
        borderWidth: 0,
        overflow: 'hidden',
    },
    finishedTeamLogo: {
        width: 44,
        height: 44,
        borderRadius: 22,
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
