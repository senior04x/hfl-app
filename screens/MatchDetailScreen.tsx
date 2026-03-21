import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Image,
    ActivityIndicator,
    Dimensions,
    Animated,
    Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../constants/Colors';
import MatchDetailSkeleton from '../components/MatchDetailSkeleton';
import YoutubePlayerCard from '../components/YoutubePlayerCard';
import TacticsBoard from '../components/TacticsBoard';
import { apiService } from '../services/apiService';

const { width } = Dimensions.get('window');

export default function MatchDetailScreen({ route, navigation }: any) {
    const { matchData, matchId } = route?.params || {};
    const [activeTab, setActiveTab] = useState('lineups');
    const [loading, setLoading] = useState(true);
    const [match, setMatch] = useState<any>(matchData);
    const [homePlayers, setHomePlayers] = useState<any[]>([]);
    const [awayPlayers, setAwayPlayers] = useState<any[]>([]);
    const [playersLoading, setPlayersLoading] = useState(false);
    const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
    
    // Animation refs
    const slideAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const fetchMatch = async () => {
            const id = matchId || matchData?._id;
            if (!id) {
                setLoading(false);
                return;
            }
            try {
                setLoading(true);
                const data = await apiService.getMatchById(id);
                console.log('🏟️ Match Data Fetched:', JSON.stringify({
                    id: data?._id,
                    homeTeam: data?.homeTeamName,
                    homeFormation: !!data?.homeTeam?.formation,
                    awayTeam: data?.awayTeamName,
                    awayFormation: !!data?.awayTeam?.formation
                }, null, 2));
                setMatch(data);
                
                // Set default selected team to home team
                if (data.homeTeamId) setSelectedTeamId(data.homeTeamId);

                // Fetch players for both teams
                if (data.homeTeamId && data.awayTeamId) {
                    setPlayersLoading(true);
                    const [homeData, awayData] = await Promise.all([
                        apiService.getPlayers(1, 100, data.homeTeamId),
                        apiService.getPlayers(1, 100, data.awayTeamId)
                    ]);
                    setHomePlayers(homeData || []);
                    setAwayPlayers(awayData || []);
                }
            } catch (error) {
                console.error('Error fetching match detail:', error);
            } finally {
                setLoading(false);
                setPlayersLoading(false);
            }
        };
        fetchMatch();
    }, [matchId, matchData?._id]);

    const switchTeam = () => {
        const isHome = selectedTeamId === match?.homeTeamId;
        const nextId = isHome ? match?.awayTeamId : match?.homeTeamId;
        
        // Direction of slide (always slide to one side for toggle feel)
        const slideOutValue = -50;

        // Slide out
        Animated.timing(slideAnim, {
            toValue: slideOutValue,
            duration: 150,
            useNativeDriver: true,
        }).start(() => {
            setSelectedTeamId(nextId);
            // Pre-position for slide in from opposite side
            slideAnim.setValue(50);
            // Slide in
            Animated.spring(slideAnim, {
                toValue: 0,
                friction: 8,
                tension: 40,
                useNativeDriver: true,
            }).start();
        });
    };

    const formatDate = (dateString: string) => {
        if (!dateString) return 'Vaqt belgilanmagan';
        const date = new Date(dateString);
        const months = [
            'Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun', 
            'Iyul', 'Avgust', 'Sentabr', 'Oktabr', 'Noyabr', 'Dekabr'
        ];
        const day = date.getDate();
        const month = months[date.getMonth()];
        const year = date.getFullYear();
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        
        return `${day}-${month}, ${year} • ${hours}:${minutes}`;
    };

    const renderHeader = () => {
        return (
            <View style={styles.headerContainer}>
                <View style={styles.topNav}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                        <Ionicons name="chevron-back" size={28} color={Colors.primary} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>{match?.tournamentName || 'Turnir'}</Text>
                    {match?.round ? (
                        <View style={styles.tourBadge}>
                            <Text style={styles.tourBadgeText}>{match.round.toString().includes('TUR') ? match.round : `${match.round}-TUR`}</Text>
                        </View>
                    ) : <View style={{ width: 28 }} />}
                </View>

                <View style={styles.matchScoreCard}>
                    <View style={styles.dateRow}>
                        <Ionicons name="calendar-outline" size={14} color="#8A94A6" />
                        <Text style={styles.dateText}>
                            {formatDate(match?.date)}
                        </Text>
                    </View>

                    <View style={styles.teamsScoreRow}>
                        <View style={styles.teamBlockRight}>
                            <Text style={styles.teamNameText} numberOfLines={1}>
                                {match?.homeTeamName || match?.homeTeam?.name || 'JAMOA A'}
                            </Text>
                            <View style={styles.logoCircle}>
                                {match?.homeTeamLogo || match?.homeTeam?.logo ? (
                                    <Image source={{ uri: match.homeTeamLogo || match.homeTeam?.logo }} style={{ width: 24, height: 24 }} />
                                ) : (
                                    <Ionicons name="shield" size={20} color={Colors.primary} />
                                )}
                            </View>
                        </View>

                        <Text style={styles.scoreTextMain}>
                            {match?.score?.home ?? match?.homeScore ?? 0} : {match?.score?.away ?? match?.awayScore ?? 0}
                        </Text>

                        <View style={styles.teamBlockLeft}>
                            <View style={styles.logoCircle}>
                                {match?.awayTeamLogo || match?.awayTeam?.logo ? (
                                    <Image source={{ uri: match.awayTeamLogo || match.awayTeam?.logo }} style={{ width: 24, height: 24 }} />
                                ) : (
                                    <Ionicons name="shield" size={20} color={Colors.primary} />
                                )}
                            </View>
                            <Text style={styles.teamNameText} numberOfLines={1}>
                                {match?.awayTeamName || match?.awayTeam?.name || 'JAMOA B'}
                            </Text>
                        </View>
                    </View>

                    <View style={styles.locationRow}>
                        <Ionicons name="location-outline" size={14} color="#8A94A6" />
                        <Text style={styles.locationText}>{match?.venue || 'Maydon belgilanmagan'}</Text>
                    </View>
                </View>
            </View>
        );
    };

    const renderTabs = () => (
        <View style={styles.tabsContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {['lineups', 'overview', 'preview', 'media', 'staff'].map((tab) => (
                    <TouchableOpacity
                        key={tab}
                        style={[styles.tab, activeTab === tab && styles.activeTab]}
                        onPress={() => setActiveTab(tab)}
                    >
                        <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
                            {tab === 'lineups' ? "Tarkib" :
                                tab === 'overview' ? 'Obzor' :
                                    tab === 'preview' ? 'Prevyu' :
                                        tab === 'media' ? 'Media' : 'Xodimlar'}
                        </Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>
        </View>
    );

    const renderTimelineEvent = (event: any, index: number, isLast: boolean) => {
        let iconName: any = 'football';
        let iconColor = '#FFF';
        let title = 'Voqea';

        if (event.type === 'goal') {
            iconName = 'football';
            title = 'Gol!';
        } else if (event.type === 'yellowCard') {
            iconName = 'square';
            iconColor = '#FACC15';
            title = 'Sariq kartochka';
        } else if (event.type === 'redCard') {
            iconName = 'square';
            iconColor = '#EF4444';
            title = 'Qizil kartochka';
        } else if (event.type === 'assist') {
            iconName = 'footsteps';
            title = 'Assist';
        }

        return (
            <View key={index} style={styles.timelineRow}>
                <View style={styles.timelineLeftColumn}>
                    <View style={event.type.includes('Card') ? [styles.cardIcon, { backgroundColor: iconColor }] : null}>
                        {!event.type.includes('Card') && <Ionicons name={iconName} size={22} color={iconColor} style={styles.timelineIcon} />}
                    </View>
                    <Text style={styles.timelineTimeText}>{event.time}'</Text>
                    {!isLast && <View style={styles.timelineLine} />}
                </View>

                <View style={styles.timelineEventCard}>
                    <View style={styles.eventContentWrapper}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.eventTitle}>{title}</Text>
                            <Text style={styles.eventDesc}>{event.playerName}</Text>
                        </View>
                        <View style={styles.eventLogo}>
                            <Text style={styles.eventLogoText}>{event.isHomeTeam ? 'UY' : 'MH'}</Text>
                        </View>
                    </View>
                </View>
            </View>
        );
    };

    const renderOverview = () => {
        if (match?.status === 'scheduled') {
            return (
                <View style={styles.notStartedContainer}>
                    <Text style={styles.notStartedText}>O'yin hali boshlanmagan</Text>
                </View>
            );
        }

        const events = match?.events || [];

        return (
            <ScrollView style={styles.tabContent} contentContainerStyle={{ padding: 16 }}>
                {events.length > 0 ? (
                    events.map((ev: any, idx: number) => renderTimelineEvent(ev, idx, idx === events.length - 1))
                ) : (
                    <View style={styles.notStartedContainer}>
                        <Text style={styles.notStartedText}>Hozircha voqealar yo'q</Text>
                    </View>
                )}
            </ScrollView>
        );
    };

    const renderPreview = () => (
        <ScrollView style={styles.tabContent}>
            <View style={styles.placeholderContainer}>
                <Ionicons name="stats-chart-outline" size={48} color="#2A344A" />
                <Text style={styles.placeholderText}>Prevyu ma'lumotlari tez orada...</Text>
            </View>
        </ScrollView>
    );

    const renderLineups = () => {
        const isHome = selectedTeamId === match?.homeTeamId;
        const currentPlayers = isHome ? homePlayers : awayPlayers;
        const currentTeamName = isHome ? (match?.homeTeamName || 'UY JAMOA') : (match?.awayTeamName || 'MEHMON');
        const currentLogo = isHome ? (match?.homeTeamLogo || match?.homeTeam?.logo) : (match?.awayTeamLogo || match?.awayTeam?.logo);

        const renderPlayerItem = (player: any) => (
            <TouchableOpacity 
                key={player._id || player.id} 
                style={styles.playerCardCompact}
                onPress={() => navigation.navigate('PlayerStats', { player: player, playerId: player._id })}
            >
                <View style={styles.playerAvatarSmall}>
                    {player.photo ? (
                        <Image source={{ uri: player.photo }} style={{ width: 44, height: 44, borderRadius: 22 }} />
                    ) : (
                        <View style={styles.playerInitials}>
                            <Text style={styles.initialsText}>{player.firstName?.charAt(0)}</Text>
                        </View>
                    )}
                </View>
                <View style={styles.playerInfoCompact}>
                    <Text style={styles.playerNameCompact} numberOfLines={1}>
                        {player.firstName} {player.lastName}
                    </Text>
                    <Text style={styles.playerNumberCompact}>#{player.number} • {player.positionUz || player.position}</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color="#4A5568" />
            </TouchableOpacity>
        );

        return (
            <ScrollView style={styles.tabContent} contentContainerStyle={{ paddingBottom: 40 }}>
                {/* Refined One-Side Arrow Selector */}
                <View style={styles.carouselContainer}>
                    <View style={styles.animatedCardWrapper}>
                        <Animated.View style={[
                            styles.teamCarouselCard,
                            { transform: [{ translateX: slideAnim }] }
                        ]}>
                            <View style={styles.compactTeamInfo}>
                                <View style={styles.miniLogoBox}>
                                    {currentLogo ? (
                                        <Image source={{ uri: currentLogo }} style={{ width: 32, height: 32 }} />
                                    ) : (
                                        <Ionicons name="shield" size={20} color={Colors.primary} />
                                    )}
                                </View>
                                <View style={{ flex: 1, marginLeft: 10 }}>
                                    <Text style={styles.miniTeamType}>TANLANGAN JAMOA</Text>
                                    <Text style={styles.miniTeamName} numberOfLines={1}>{currentTeamName}</Text>
                                </View>
                            </View>
                        </Animated.View>
                    </View>

                    <TouchableOpacity onPress={switchTeam} style={styles.navArrowBtnOneSide}>
                        <Ionicons name="chevron-forward" size={24} color={Colors.primary} />
                    </TouchableOpacity>
                </View>

                {playersLoading ? (
                    <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 40 }} />
                ) : (
                    <View style={styles.lineupListWrapper}>
                        {/* Tactics Board Section */}
                        {((isHome ? match?.homeTeam?.formation : match?.awayTeam?.formation) || 
                          (isHome ? match?.homeTeam?.players : match?.awayTeam?.players)) ? (
                            <TacticsBoard 
                                players={((isHome ? (match?.homeTeam?.formation?.players || match?.homeTeam?.players) : 
                                                   (match?.awayTeam?.formation?.players || match?.awayTeam?.players)) || []).map((p: any) => {
                                    // Count goals for this player in this match from match.events
                                    const playerId = p.id || p._id;
                                    const playerGoals = match.events?.filter((e: any) => e.playerId === playerId && e.type === 'goal').length || 0;
                                    // Find more info from currentPlayers if needed
                                    const fullPlayer = currentPlayers.find((cp: any) => (cp._id || cp.id) === playerId);
                                    return {
                                        ...p,
                                        id: playerId,
                                        name: p.name || `${fullPlayer?.firstName || ''} ${fullPlayer?.lastName || ''}`.trim() || 'O\'yinchi',
                                        number: fullPlayer?.number || p.number,
                                        goals: playerGoals,
                                        x: p.x || 50,
                                        y: p.y || 50
                                    };
                                })}
                                teamColor={isHome ? '#3B82F6' : '#EF4444'} // Default colors
                            />
                        ) : null}

                        <View style={styles.listHeader}>
                            <Text style={styles.listTitle}>{currentTeamName} tarkibi</Text>
                            <View style={styles.countBadge}>
                                <Text style={styles.countText}>{currentPlayers.length} ta</Text>
                            </View>
                        </View>

                        {currentPlayers.length > 0 ? (
                            currentPlayers.map(renderPlayerItem)
                        ) : (
                            <View style={styles.emptyPlayersBox}>
                                <Ionicons name="people-outline" size={40} color="#1A2138" />
                                <Text style={styles.emptyPlayersText}>O'yinchilar ro'yxati mavjud emas</Text>
                            </View>
                        )}
                    </View>
                )}
            </ScrollView>
        );
    };

    const renderMedia = () => {
        const videoUrl = match?.youtubeLink || match?.videoUrl;

        return (
            <ScrollView style={styles.tabContent} contentContainerStyle={{ padding: 16 }}>
                {videoUrl ? (
                    <YoutubePlayerCard videoUrl={videoUrl} />
                ) : (
                    <View style={styles.placeholderContainer}>
                        <Ionicons name="images-outline" size={48} color="#2A344A" />
                        <Text style={styles.placeholderText}>Media ma'lumotlari mavjud emas</Text>
                    </View>
                )}
            </ScrollView>
        );
    };

    const renderStaff = () => (
        <ScrollView style={styles.tabContent} contentContainerStyle={{ padding: 16 }}>
            <View style={styles.placeholderContainer}>
                {match?.referee ? (
                    <View style={styles.staffMemberCard}>
                        <View style={styles.staffIconBox}>
                            <Ionicons name="person" size={24} color={Colors.primary} />
                        </View>
                        <View>
                            <Text style={styles.staffLabel}>Bosh hakam</Text>
                            <Text style={styles.staffValue}>{match.referee}</Text>
                        </View>
                    </View>
                ) : (
                    <Text style={styles.placeholderText}>Rasmiy vakillar ro'yxati belgilanmagan</Text>
                )}
            </View>
        </ScrollView>
    );

    if (loading && !match) {
        return <MatchDetailSkeleton />;
    }

    return (
        <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
            {renderHeader()}
            {renderTabs()}

            {activeTab === 'overview' ? renderOverview() :
                activeTab === 'preview' ? renderPreview() :
                    activeTab === 'lineups' ? renderLineups() :
                        activeTab === 'media' ? renderMedia() :
                            activeTab === 'staff' ? renderStaff() : null}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#020610' },
    headerContainer: {
        backgroundColor: '#051024',
        borderBottomWidth: 1,
        borderBottomColor: '#1A2138',
        paddingBottom: 20
    },
    topNav: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingTop: 10,
        marginBottom: 20,
    },
    backBtn: { padding: 4 },
    headerTitle: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
    tourBadge: {
        backgroundColor: Colors.primary,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 6,
    },
    tourBadgeText: {
        color: '#000',
        fontSize: 12,
        fontWeight: '900',
    },

    matchScoreCard: {
        alignItems: 'center',
        paddingHorizontal: 20,
    },
    dateRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
    dateText: { color: '#8A94A6', fontSize: 13, marginLeft: 6 },

    teamsScoreRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        marginBottom: 15,
    },
    teamBlockRight: { flexDirection: 'row', alignItems: 'center', flex: 1, justifyContent: 'flex-end' },
    teamBlockLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, justifyContent: 'flex-start' },
    teamNameText: { color: '#FFF', fontSize: 18, fontWeight: '900', marginHorizontal: 10 },
    logoCircle: {
        width: 36, height: 36, borderRadius: 18, backgroundColor: '#1A2138',
        justifyContent: 'center', alignItems: 'center'
    },
    scoreTextMain: { color: '#FFF', fontSize: 32, fontWeight: '900', marginHorizontal: 20, letterSpacing: 2 },

    locationRow: { flexDirection: 'row', alignItems: 'center' },
    locationText: { color: '#8A94A6', fontSize: 13, marginLeft: 6 },

    tabsContainer: { borderBottomWidth: 1, borderBottomColor: '#1A2138', backgroundColor: '#020610' },
    tab: { paddingVertical: 14, paddingHorizontal: 20, borderBottomWidth: 2, borderBottomColor: 'transparent' },
    activeTab: { borderBottomColor: Colors.primary },
    tabText: { color: '#6A7185', fontSize: 14, fontWeight: '600' },
    activeTabText: { color: '#FFF' },

    tabContent: { flex: 1, backgroundColor: '#020610' },

    // Carousel Selector
    carouselContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        backgroundColor: '#051024',
        borderBottomWidth: 1,
        borderBottomColor: '#1A2138',
    },
    navArrowBtnOneSide: {
        padding: 10,
        backgroundColor: '#0A152E',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#1A2138',
        marginLeft: 12,
    },
    animatedCardWrapper: {
        flex: 1,
        overflow: 'hidden',
    },
    teamCarouselCard: {
        backgroundColor: '#081021',
        borderRadius: 14,
        padding: 12,
        borderWidth: 1,
        borderColor: Colors.primary + '30',
        flexDirection: 'row',
        alignItems: 'center',
    },
    compactTeamInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        width: '100%',
    },
    miniLogoBox: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#1A2138',
        justifyContent: 'center',
        alignItems: 'center',
    },
    miniTeamType: {
        color: Colors.primary,
        fontSize: 9,
        fontWeight: 'bold',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    miniTeamName: {
        color: '#FFF',
        fontSize: 15,
        fontWeight: 'bold',
        marginTop: 1,
    },

    // Lineup List
    lineupListWrapper: {
        padding: 16,
    },
    listHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    listTitle: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: 'bold',
    },
    countBadge: {
        backgroundColor: '#0A152E',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
    },
    countText: {
        color: Colors.primary,
        fontSize: 12,
        fontWeight: 'bold',
    },
    playerCardCompact: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#081021',
        padding: 12,
        borderRadius: 12,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: '#1A2138',
    },
    playerAvatarSmall: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#1A2138',
        marginRight: 12,
        overflow: 'hidden',
    },
    playerInitials: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    initialsText: {
        color: '#8A94A6',
        fontSize: 18,
        fontWeight: 'bold',
    },
    playerInfoCompact: {
        flex: 1,
    },
    playerNameCompact: {
        color: '#FFF',
        fontSize: 15,
        fontWeight: 'bold',
    },
    playerNumberCompact: {
        color: '#8A94A6',
        fontSize: 13,
        marginTop: 2,
    },
    emptyPlayersBox: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 40,
    },
    emptyPlayersText: {
        color: '#4A5568',
        fontSize: 14,
        marginTop: 10,
    },

    // Timeline etc (kept from previous implementation)
    timelineRow: { flexDirection: 'row', marginBottom: 16 },
    timelineLeftColumn: { width: 40, alignItems: 'center', position: 'relative' },
    timelineIcon: { backgroundColor: '#020610', zIndex: 2 },
    cardIcon: { width: 14, height: 20, borderRadius: 2, zIndex: 2 },
    timelineTimeText: { color: '#8A94A6', fontSize: 12, marginTop: 4, fontWeight: 'bold', backgroundColor: '#020610', zIndex: 2 },
    timelineLine: { position: 'absolute', top: 25, bottom: -30, width: 2, backgroundColor: '#1A2138', zIndex: 1 },
    timelineEventCard: { backgroundColor: '#081021', borderRadius: 8, padding: 12, marginLeft: 8, flex: 1, borderWidth: 1, borderColor: '#1A2138' },
    eventContentWrapper: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    eventTitle: { fontWeight: 'bold', color: '#FFF', fontSize: 14, marginBottom: 4 },
    eventDesc: { color: '#8A94A6', fontSize: 12 },
    eventLogo: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#1A2138', justifyContent: 'center', alignItems: 'center', marginLeft: 12 },
    eventLogoText: { color: '#FFF', fontWeight: 'bold', fontSize: 12 },
    notStartedContainer: { alignItems: 'center', marginTop: 40 },
    notStartedText: { color: '#8A94A6', fontSize: 15 },
    placeholderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', minHeight: 200 },
    placeholderText: { color: '#6A7185', textAlign: 'center' },
    staffMemberCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#081021', padding: 16, borderRadius: 12, width: '100%', borderWidth: 1, borderColor: '#1A2138' },
    staffIconBox: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#1A2138', justifyContent: 'center', alignItems: 'center', marginRight: 16 },
    staffLabel: { color: '#8A94A6', fontSize: 12, fontWeight: '600' },
    staffValue: { color: '#FFF', fontSize: 16, fontWeight: 'bold', marginTop: 2 }
});
