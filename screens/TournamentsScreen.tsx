import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    ActivityIndicator,
    Image,
    Dimensions,
    ImageBackground,
    TextInput,
    ScrollView,
    Animated,
    Platform,
    UIManager,
    Linking
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../constants/Colors';
import { useTournamentStore } from '../store/useTournamentStore';
import { apiService } from '../services/apiService';
import GenericListSkeleton from '../components/GenericListSkeleton';
import Skeleton from '../components/Skeleton';
import TournamentsSkeleton from '../components/TournamentsSkeleton';
import { RefreshControl } from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import { BlurView } from 'expo-blur';
import VideoBackground from '../components/VideoBackground';


const { width } = Dimensions.get('window');

// Stable Header Component to prevent unwanted re-renders during selection
const TournamentsHeader = ({
    activeTab,
    setActiveTab,
    isLeagueSelectorOpen,
    toggleLeagueSelector,
    isLeaguesLoading,
    selectedLeague,
    handleSocialPress,
    animationValue,
    leagues,
    handleLeagueSelect,
    tournaments
}: any) => {
    const accordionHeight = animationValue.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 500], // Increased to ensure no overflow issues
    });

    const accordionOpacity = animationValue.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 1],
    });

    return (
        <View style={styles.headerContent}>
            {/* Tabs Row with Glass Effect */}
            <View style={styles.tabsRow}>
                <BlurView intensity={15} tint="dark" style={StyleSheet.absoluteFill} />
                <View style={{ flexDirection: 'row', width: '100%', padding: 4 }}>
                    <TouchableOpacity
                        style={[styles.tab, activeTab === 'league' && styles.activeTab]}
                        onPress={() => setActiveTab('league')}
                    >
                        <Text style={[styles.tabText, activeTab === 'league' && styles.activeTabText]}>
                            Liga turnirlari
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.tab, activeTab === 'favorites' && styles.activeTab]}
                        onPress={() => setActiveTab('favorites')}
                    >
                        <Ionicons
                            name="star"
                            size={16}
                            color={activeTab === 'favorites' ? Colors.primary : Colors.textMuted}
                            style={{ marginRight: 8 }}
                        />
                        <Text style={[styles.tabText, activeTab === 'favorites' && styles.activeTabText]}>
                            Saralanganlar
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* League Info Card with Glass Effect */}
            <TouchableOpacity 
                style={styles.leagueCard} 
                onPress={toggleLeagueSelector}
            >
                <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />
                <View style={{ flexDirection: 'row', padding: 16 }}>
                    <View style={styles.logoBox}>
                        {isLeaguesLoading || !selectedLeague ? (
                            <Skeleton circle width={80} height={80} />
                        ) : selectedLeague?.logo ? (
                            <Image
                                source={{ uri: selectedLeague.logo }}
                                style={styles.headerLeagueLogo}
                                resizeMode="contain"
                            />
                        ) : (
                            <View style={styles.logoCircleSmall}>
                                <Ionicons name="shield" size={40} color={Colors.primary} />
                            </View>
                        )}
                    </View>
                    <View style={{ flex: 1, paddingLeft: 12, justifyContent: 'center', zIndex: 100 }}>
                        {/* Status/Location Row */}
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                            <Image
                                source={{
                                    uri: selectedLeague?.location?.toLowerCase().includes('rossiya') || selectedLeague?.location?.toLowerCase().includes('russia')
                                        ? 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f3/Flag_of_Russia.svg/1200px-Flag_of_Russia.svg.png'
                                        : 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/84/Flag_of_Uzbekistan.svg/1200px-Flag_of_Uzbekistan.svg.png'
                                }}
                                style={[styles.flagIcon, { shadowColor: '#000', shadowOpacity: 0.5, shadowRadius: 2 }]}
                            />
                            <Text style={{ color: '#00FF66', fontSize: 13, fontWeight: '700', marginLeft: 4 }}>
                                {(selectedLeague?.location || 'O\'zbekiston').toUpperCase()}
                            </Text>
                        </View>

                        {/* League Title Area */}
                        <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' }}>
                            <Text 
                                style={{ 
                                    color: '#FFFFFF', 
                                    fontSize: 19, 
                                    fontWeight: '900', 
                                    textShadowColor: 'black', 
                                    textShadowRadius: 3,
                                    marginRight: 6
                                }}
                            >
                                {(selectedLeague?.name || 'HFL SUPER LIGA').toUpperCase()}
                            </Text>
                            <Ionicons
                                name={isLeagueSelectorOpen ? "chevron-up" : "chevron-down"}
                                size={20}
                                color={Colors.primary}
                                style={{ opacity: 1, zIndex: 110 }}
                            />
                        </View>
                    </View>
                </View>
            </TouchableOpacity>


            {/* Accordion Expansion: League List with Animated.View */}
            <Animated.View style={[
                styles.leagueAccordion,
                {
                    maxHeight: accordionHeight,
                    opacity: accordionOpacity,
                    overflow: 'hidden',
                    marginBottom: animationValue.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, 20]
                    }),
                    zIndex: 10,
                }
            ]}>
                <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />
                <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.accordionContent}
                    nestedScrollEnabled
                    keyboardShouldPersistTaps="handled"
                >
                    {isLeaguesLoading ? (
                        <View style={{ padding: 16 }}>
                            <Skeleton width="100%" height={40} borderRadius={6} style={{ marginBottom: 12 }} />
                            <Skeleton width="100%" height={40} borderRadius={6} style={{ marginBottom: 12 }} />
                            <Skeleton width="100%" height={40} borderRadius={6} />
                        </View>
                    ) : (
                        leagues.map((league: any) => (
                            <TouchableOpacity
                                key={league._id}
                                style={[
                                    styles.accordionItem,
                                    selectedLeague?._id === league._id && styles.activeAccordionItem
                                ]}
                                onPress={() => handleLeagueSelect(league)}
                            >
                                <View style={styles.accordionLogoContainer}>
                                    {league.logo ? (
                                        <Image source={{ uri: league.logo }} style={styles.accordionLogo} />
                                    ) : (
                                        <Ionicons name="football" size={18} color={Colors.primary} />
                                    )}
                                </View>
                                <Text style={styles.accordionItemName} numberOfLines={1}>
                                    {league.name?.toUpperCase()}
                                </Text>
                            </TouchableOpacity>
                        ))
                    )}
                </ScrollView>
            </Animated.View>

            {/* Stats Row with Glass Effect */}
            <View style={styles.statsRow}>
                <BlurView intensity={15} tint="dark" style={StyleSheet.absoluteFill} />
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', width: '100%', paddingHorizontal: 20, paddingVertical: 15 }}>
                    <View style={styles.statItem}>
                        <Text style={styles.statLabel}>Turnirlar</Text>
                        {isLeaguesLoading || !selectedLeague ? (
                            <Skeleton width={30} height={16} borderRadius={4} />
                        ) : (
                            <Text style={styles.statValue}>{tournaments.length}</Text>
                        )}
                    </View>
                    <View style={styles.statItem}>
                        <Text style={styles.statLabel}>Holati</Text>
                        {isLeaguesLoading || !selectedLeague ? (
                            <Skeleton width={50} height={16} borderRadius={4} />
                        ) : (
                            <Text style={styles.statValue}>
                                {tournaments.filter((t: any) => t.status === 'ongoing' || t.status === 'active').length} faol
                            </Text>
                        )}
                    </View>
                    <View style={styles.statItem}>
                        <Text style={styles.statLabel}>Region</Text>
                        {isLeaguesLoading || !selectedLeague ? (
                            <Skeleton width={70} height={16} borderRadius={4} />
                        ) : (
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <Image
                                    source={{
                                        uri: selectedLeague?.location?.toLowerCase().includes('rossiya') || selectedLeague?.location?.toLowerCase().includes('russia')
                                            ? 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f3/Flag_of_Russia.svg/1200px-Flag_of_Russia.svg.png'
                                            : 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/84/Flag_of_Uzbekistan.svg/1200px-Flag_of_Uzbekistan.svg.png'
                                    }}
                                    style={[styles.flagIcon, { width: 14, height: 10, marginRight: 4 }]}
                                />
                                <Text style={styles.statValue}>{selectedLeague?.location?.split(' ')[0] || 'O\'zbekiston'}</Text>
                            </View>
                        )}
                    </View>
                </View>
            </View>

            {/* Action Buttons with Glass Effect */}
            <View style={styles.actionsRow}>
                <TouchableOpacity style={styles.participateBtn}>
                    <BlurView intensity={20} tint="light" style={StyleSheet.absoluteFill} />
                    <Text style={styles.participateBtnText}>QATNASHISH</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.hallOfFameBtn}>
                    <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                        <Text style={styles.hallOfFameBtnText}>SHUHRAT ZALI</Text>
                        <Ionicons name="arrow-forward" size={16} color={Colors.primary} />
                    </View>
                </TouchableOpacity>
            </View>

            {/* Tournament List Header with Glass Effect */}
            <View style={styles.listHeader}>
                <View style={styles.listHeaderBadge}>
                    <BlurView intensity={10} tint="light" style={StyleSheet.absoluteFill} />
                    <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6 }}>
                        <Image
                            source={{
                                uri: selectedLeague?.location?.toLowerCase().includes('rossiya') || selectedLeague?.location?.toLowerCase().includes('russia')
                                    ? 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f3/Flag_of_Russia.svg/1200px-Flag_of_Russia.svg.png'
                                    : 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/84/Flag_of_Uzbekistan.svg/1200px-Flag_of_Uzbekistan.svg.png'
                            }}
                            style={styles.miniFlag}
                        />
                        <Text style={styles.listHeaderText}>TURNIRLAR RO'YXATI</Text>
                    </View>
                </View>
            </View>
        </View>
    );
};

export default function TournamentsScreen({ navigation }: any) {
    const [tournaments, setTournaments] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('league'); // 'league' or 'favorites'
    const [searchQuery, setSearchQuery] = useState('');
    const [leagues, setLeagues] = useState<any[]>([]);
    const [selectedLeague, setSelectedLeague] = useState<any | null>(null);
    const [isLeagueSelectorOpen, setIsLeagueSelectorOpen] = useState(false);
    const [isLeaguesLoading, setIsLeaguesLoading] = useState(true);

    const animationValue = useRef(new Animated.Value(0)).current;

    const toggleLeagueSelector = useCallback(() => {
        setIsLeagueSelectorOpen(prev => !prev);
    }, []);

    useEffect(() => {
        Animated.timing(animationValue, {
            toValue: isLeagueSelectorOpen ? 1 : 0,
            duration: 300,
            useNativeDriver: false,
        }).start();
    }, [isLeagueSelectorOpen]);

    const fetchLeagues = async () => {
        try {
            setIsLeaguesLoading(true);
            const data = await apiService.getLeagues();
            if (data && Array.isArray(data)) {
                setLeagues(data);
                if (data.length > 0 && !selectedLeague) {
                    const firstLeague = data[0];
                    setSelectedLeague(firstLeague);
                    // Await tournaments to keep the skeleton active until both are done
                    await fetchTournaments(firstLeague._id);
                }
            }
        } catch (error) {
            console.error('Error fetching leagues:', error);
        } finally {
            setIsLeaguesLoading(false);
        }
    };

    const fetchTournaments = async (leagueId?: string) => {
        try {
            setIsLoading(true);
            // Fetch tournaments filtered by leagueId directly from API if provided
            const data = await apiService.getTournaments(1, 100, leagueId);
            if (data && Array.isArray(data)) {
                setTournaments(data);
            } else {
                setTournaments([]);
            }
        } catch (error) {
            console.error('Error fetching tournaments:', error);
            setTournaments([]);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchLeagues();
    }, []);

    useEffect(() => {
        // Only fetch via useEffect if it's NOT the first load (which is already handled in fetchLeagues)
        if (selectedLeague?._id && leagues.length > 0 && !isLeaguesLoading) {
            fetchTournaments(selectedLeague._id);
        }
    }, [selectedLeague?._id]);

    const handleLeagueSelect = useCallback((league: any) => {
        setIsLeagueSelectorOpen(false);
        // Only trigger data fetch/clear if the selection actually changed
        if (selectedLeague?._id !== league._id) {
            setTournaments([]); // Clear for unified skeleton
            setSelectedLeague(league);
        }
    }, [selectedLeague?._id]);


    const handleSocialPress = useCallback((url?: string) => {
        if (url) {
            Linking.openURL(url).catch(err => console.error("Couldn't load page", err));
        }
    }, []);

    const filteredTournaments = tournaments.filter(t =>
        t.name?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const renderTournamentItem = ({ item: tournament, index }: { item: any, index: number }) => {
        if (tournament._isSkeleton) {
            return (
                <View style={[styles.tournamentItem, { borderBottomWidth: 0 }]} key={`skeleton-${index}`}>
                    <View style={styles.tournamentMainInfo}>
                        <Skeleton width={width * 0.6} height={18} borderRadius={4} style={{ marginBottom: 8 }} />
                        <View style={styles.statusRow}>
                            <Skeleton circle width={6} height={6} style={{ marginRight: 8 }} />
                            <Skeleton width={width * 0.4} height={14} borderRadius={4} />
                        </View>
                    </View>
                    <Skeleton circle width={20} height={20} />
                </View>
            );
        }

        return (
            <TouchableOpacity
                key={tournament._id}
                style={styles.tournamentItem}
                onPress={() => navigation.navigate('TournamentDetail', {
                    tournamentId: tournament._id,
                    tournamentName: tournament.name,
                    tournament: tournament
                })}
            >
                <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
                <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, paddingVertical: 16, paddingHorizontal: 20 }}>
                    <View style={styles.tournamentMainInfo}>
                        <Text style={styles.tournamentName}>{tournament.name?.toUpperCase() || 'CHAMPION LEAGUE'}</Text>
                        <View style={styles.statusRow}>
                            <View style={[styles.statusDot, { backgroundColor: tournament.status === 'ongoing' ? Colors.primary : Colors.textMuted }]} />
                            <Text style={styles.seasonText}>{tournament.season || 'ноябрь - июнь 2026'}</Text>
                        </View>
                    </View>
                    <Ionicons name="star-outline" size={20} color={Colors.primary} />
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <View style={styles.mainWrapper}>
            {/* Cinematic Video Background */}
            <VideoBackground
                source={require('../assets/images/welcomeScreenVideo1.mp4')}
                overlayOpacity={0.7}
                style={StyleSheet.absoluteFill}
            />

            <SafeAreaView style={styles.safeArea} edges={['top']}>
                {/* Custom Navbar */}
                <View style={styles.navbar}>
                    <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', paddingHorizontal: 16, paddingVertical: 12 }}>
                        <View style={styles.navbarLeft}>
                            <Text style={styles.navLogoText}>AMATORA</Text>
                            <Text style={styles.navTitle}>Turnirlar</Text>
                        </View>
                        <View style={styles.navSearchContainer}>
                            <TextInput
                                style={styles.navSearchInput}
                                placeholder="Qidirish..."
                                placeholderTextColor="rgba(255,255,255,0.5)"
                                value={searchQuery}
                                onChangeText={setSearchQuery}
                            />
                            <Ionicons name="search" size={20} color="#FFF" />
                        </View>
                    </View>
                </View>


                {isLeaguesLoading || (isLoading && tournaments.length === 0) ? (
                    <TournamentsSkeleton />
                ) : (
                    <FlatList
                        data={isLoading ? Array(6).fill({ _isSkeleton: true }) : filteredTournaments}
                        keyExtractor={(item, index) => item?._id || `skeleton-${index}`}
                        renderItem={renderTournamentItem}
                        ListHeaderComponent={
                            <TournamentsHeader
                                activeTab={activeTab}
                                setActiveTab={setActiveTab}
                                isLeagueSelectorOpen={isLeagueSelectorOpen}
                                toggleLeagueSelector={toggleLeagueSelector}
                                isLeaguesLoading={isLeaguesLoading}
                                selectedLeague={selectedLeague}
                                handleSocialPress={handleSocialPress}
                                animationValue={animationValue}
                                leagues={leagues}
                                handleLeagueSelect={handleLeagueSelect}
                                tournaments={tournaments}
                            />
                        }
                        contentContainerStyle={styles.list}
                        refreshControl={
                            <RefreshControl
                                refreshing={isLoading && tournaments.length > 0}
                                onRefresh={() => fetchTournaments(selectedLeague?._id)}
                                tintColor={Colors.primary}
                                colors={[Colors.primary]}
                            />
                        }
                    />
                )}
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    mainWrapper: {
        flex: 1,
        backgroundColor: '#000',
    },
    safeArea: {
        flex: 1,
    },
    navbar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: 'transparent',
    },
    navbarLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    navLogoText: {
        color: '#FFF',
        fontSize: 24,
        fontWeight: '900',
        marginRight: 12,
        fontStyle: 'italic',
    },
    navTitle: {
        color: '#FFF',
        fontSize: 20,
        fontWeight: 'bold',
    },
    navSearchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.05)',
        paddingHorizontal: 12,
        borderRadius: 8,
        flex: 1,
        marginLeft: 20,
        height: 40,
    },
    navSearchInput: {
        flex: 1,
        color: '#FFF',
        fontSize: 14,
        marginRight: 8,
    },
    headerContent: {
        paddingTop: 10,
    },
    tabsRow: {
        flexDirection: 'row',
        marginHorizontal: 16,
        marginBottom: 20,
        borderRadius: 12,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    tab: {
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 10,
        borderRadius: 8,
        backgroundColor: 'transparent',
    },
    activeTab: {
        backgroundColor: 'rgba(0, 255, 102, 0.15)',
    },
    tabText: {
        color: Colors.textMuted,
        fontSize: 14,
        fontWeight: '600',
    },
    activeTabText: {
        color: '#FFF',
    },
    leagueCard: {
        flexDirection: 'row',
        marginHorizontal: 16,
        marginBottom: 25,
        borderRadius: 20,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.15)',
    },
    logoBox: {
        width: 80,
        height: 80,
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
    },
    logoText: {
        color: '#000',
        fontSize: 28,
        fontWeight: '900',
        fontStyle: 'italic',
    },
    leagueDetails: {
        flex: 1,
        justifyContent: 'center',
        paddingRight: 8,
    },
    locationRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    flagIcon: {
        width: 16,
        height: 12,
        marginRight: 6,
    },
    locationText: {
        color: '#FFF',
        fontSize: 14,
        fontWeight: '700',
        textShadowColor: 'rgba(0,0,0,0.8)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 2,
    },
    leagueNameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
    },
    leagueNameTitle: {
        color: '#FFF',
        fontSize: 20,
        fontWeight: '900',
        marginRight: 6,
        textShadowColor: 'rgba(0, 0, 0, 0.8)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 3,
    },
    socialRow: {
        flexDirection: 'row',
    },
    socialIcon: {
        marginRight: 16,
    },
    statsRow: {
        marginHorizontal: 16,
        marginBottom: 25,
        borderRadius: 16,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    statItem: {
        alignItems: 'center',
    },
    statLabel: {
        color: 'rgba(255,255,255,0.5)',
        fontSize: 12,
        marginBottom: 6,
        fontWeight: '700',
    },
    statValue: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '900',
    },
    actionsRow: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        marginBottom: 25,
    },
    participateBtn: {
        flex: 1,
        backgroundColor: Colors.primary,
        height: 44,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 10,
        overflow: 'hidden',
        shadowColor: Colors.primary,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.6,
        shadowRadius: 10,
        elevation: 5,
    },
    participateBtnText: {
        color: '#000',
        fontWeight: '900',
        fontSize: 13,
        letterSpacing: 1.5,
    },
    hallOfFameBtn: {
        flex: 1,
        backgroundColor: 'rgba(255,255,255,0.05)',
        height: 44,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        borderRadius: 12,
        overflow: 'hidden',
        alignItems: 'center',
        justifyContent: 'center',
    },
    hallOfFameBtnText: {
        color: '#FFF',
        fontWeight: '900',
        fontSize: 13,
        marginRight: 8,
        letterSpacing: 1,
    },
    adBanner: {
        height: 80,
        marginHorizontal: 16,
        marginBottom: 25,
    },
    adBg: {
        flex: 1,
    },
    adOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    adText: {
        color: '#FFF',
        fontSize: 20,
        fontWeight: '900',
    },
    adSubText: {
        color: '#FFF',
        fontSize: 12,
        fontWeight: '600',
        letterSpacing: 2,
    },
    listHeader: {
        paddingHorizontal: 16,
        marginBottom: 10,
    },
    listHeaderBadge: {
        overflow: 'hidden',
        backgroundColor: 'rgba(0, 255, 102, 0.15)',
        alignSelf: 'flex-start',
        borderTopRightRadius: 12,
        borderBottomRightRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(0, 255, 102, 0.2)',
    },
    miniFlag: {
        width: 14,
        height: 10,
        marginRight: 8,
    },
    listHeaderText: {
        color: '#FFF',
        fontSize: 13,
        fontWeight: 'bold',
    },
    tournamentItem: {
        marginHorizontal: 16,
        marginBottom: 12,
        borderRadius: 16,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    tournamentMainInfo: {
        flex: 1,
    },
    tournamentName: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 4,
    },
    statusRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    statusDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        marginRight: 8,
    },
    seasonText: {
        color: Colors.textMuted,
        fontSize: 13,
    },
    list: {
        paddingBottom: 40,
    },
    loading: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerLeagueLogo: {
        width: 60,
        height: 60,
    },
    leagueAccordion: {
        backgroundColor: 'transparent',
        borderTopWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
        overflow: 'hidden',
    },
    accordionContent: {
        paddingVertical: 8,
    },
    accordionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.03)',
    },
    activeAccordionItem: {
        backgroundColor: 'rgba(0, 255, 102, 0.05)',
    },
    accordionLogoContainer: {
        width: 44,
        height: 44,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    accordionLogo: {
        width: 32,
        height: 32,
        resizeMode: 'contain',
    },
    accordionItemName: {
        color: '#FFF',
        fontSize: 15,
        fontWeight: '600',
        flex: 1,
    },
    logoCircleSmall: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: 'rgba(255,255,255,0.05)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
});
