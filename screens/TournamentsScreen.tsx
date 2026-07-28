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
import { BlurView } from 'expo-blur';
import AnimatedBackground from '../components/AnimatedBackground';
import backgroundImage from '../assets/images/backroud-image.png';


const { width } = Dimensions.get('window');

const LEAGUE_LOGOS: Record<string, any> = {
    'super': require('../assets/images/super-liga.png'),
    'pro': require('../assets/images/pro-liga.png'),
    '3liga': require('../assets/images/3-liga.png'),
    '7x7': require('../assets/images/7x7-liga.png'),
};

const getLeagueLogoSource = (league: any) => {
    if (!league) return null;
    const logoUrl = league.logo_url || league.logo;
    if (logoUrl && typeof logoUrl === 'string' && logoUrl.length > 5) {
        return { uri: logoUrl };
    }
    const lName = String(league.name || league.id || league.label || '').toLowerCase();
    if (lName.includes('super')) return LEAGUE_LOGOS['super'];
    if (lName.includes('pro')) return LEAGUE_LOGOS['pro'];
    if (lName.includes('3')) return LEAGUE_LOGOS['3liga'];
    if (lName.includes('7')) return LEAGUE_LOGOS['7x7'];
    return LEAGUE_LOGOS[league.id || league.logoKey] || null;
};

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
    tournaments,
    teams,
    teamsLoading,
    navigation
}: any) => {
    const accordionHeight = animationValue.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 500], // Increased to ensure no overflow issues
    });

    const accordionOpacity = animationValue.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 1],
    });

    const currentLogoSource = getLeagueLogoSource(selectedLeague);

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

            {/* League Info Card with Glass Effect — Only Large Logo Without Background */}
            <TouchableOpacity 
                style={styles.leagueCardCentered} 
                onPress={toggleLeagueSelector}
                activeOpacity={0.8}
            >
                <BlurView intensity={25} tint="dark" style={StyleSheet.absoluteFill} />
                <View style={styles.leagueCardCenteredContent}>
                    {/* Large Logo without background */}
                    <View style={styles.largeLogoWrapper}>
                        {isLeaguesLoading || !selectedLeague ? (
                            <Skeleton width="92%" height={210} borderRadius={16} />
                        ) : currentLogoSource ? (
                            <Image
                                source={currentLogoSource}
                                style={styles.headerLeagueLogoLarge}
                                resizeMode="contain"
                            />
                        ) : (
                            <Ionicons name="shield" size={140} color={Colors.primary} />
                        )}
                    </View>

                    {/* Green Arrow at Bottom */}
                    <Ionicons
                        name={isLeagueSelectorOpen ? "chevron-up" : "chevron-down"}
                        size={20}
                        color="#00FF66"
                        style={{ marginTop: -4, marginBottom: 4 }}
                    />
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
                <View style={styles.accordionContent}>
                    {isLeaguesLoading ? (
                        <View style={{ padding: 16 }}>
                            <Skeleton width="100%" height={40} borderRadius={6} style={{ marginBottom: 12 }} />
                            <Skeleton width="100%" height={40} borderRadius={6} style={{ marginBottom: 12 }} />
                            <Skeleton width="100%" height={40} borderRadius={6} />
                        </View>
                    ) : (
                        leagues.map((league: any) => {
                            const isSelected = (selectedLeague?.id === league.id || selectedLeague?._id === league._id);
                            const itemLogo = getLeagueLogoSource(league);
                            return (
                                <TouchableOpacity
                                    key={league.id || league._id}
                                    style={[
                                        styles.accordionItem,
                                        isSelected && styles.activeAccordionItem
                                    ]}
                                    onPress={() => handleLeagueSelect(league)}
                                    activeOpacity={0.6}
                                >
                                    <View style={styles.accordionLogoContainer}>
                                        {itemLogo ? (
                                            <Image source={itemLogo} style={styles.accordionLogo} resizeMode="contain" />
                                        ) : (
                                            <Ionicons name="football" size={18} color={Colors.primary} />
                                        )}
                                    </View>
                                    <Text style={[styles.accordionItemName, isSelected && { color: Colors.primary, fontWeight: '900' }]} numberOfLines={1}>
                                        {league.name?.toUpperCase()}
                                    </Text>
                                    {isSelected && (
                                        <Ionicons name="checkmark-circle" size={20} color={Colors.primary} style={{ marginLeft: 8 }} />
                                    )}
                                </TouchableOpacity>
                            );
                        })
                    )}
                </View>
            </Animated.View>

            {/* Stats Row with Glass Effect */}
            <View style={styles.statsRow}>
                <BlurView intensity={15} tint="dark" style={StyleSheet.absoluteFill} />
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', width: '100%', paddingHorizontal: 20, paddingVertical: 15 }}>
                    <View style={styles.statItem}>
                        <Text style={styles.statLabel}>Jamoalar</Text>
                        {isLeaguesLoading || !selectedLeague ? (
                            <Skeleton width={30} height={16} borderRadius={4} />
                        ) : (
                            <Text style={styles.statValue}>{teams?.length || 0}</Text>
                        )}
                    </View>
                    <View style={styles.statItem}>
                        <Text style={styles.statLabel}>Holati</Text>
                        {isLeaguesLoading || !selectedLeague ? (
                            <Skeleton width={50} height={16} borderRadius={4} />
                        ) : (
                            <Text style={styles.statValue}>
                                {teams?.length || 0} faol
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
                <TouchableOpacity 
                    style={styles.participateBtn}
                    onPress={() => navigation.navigate('JoinApplication')}
                    activeOpacity={0.8}
                >
                    <BlurView intensity={20} tint="light" style={StyleSheet.absoluteFill} />
                    <Text style={styles.participateBtnText}>QATNASHISH</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                    style={styles.hallOfFameBtn}
                    onPress={() => {
                        if (selectedLeague) {
                            navigation.navigate('TournamentDetail', { 
                                tournament: selectedLeague,
                                tournamentId: selectedLeague.id || selectedLeague._id 
                            });
                        }
                    }}
                    activeOpacity={0.8}
                >
                    <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                        <Text style={styles.hallOfFameBtnText}>TURNIR HAQIDA</Text>
                        <Ionicons name="arrow-forward" size={16} color={Colors.primary} />
                    </View>
                </TouchableOpacity>
            </View>

            {/* Teams List Header */}
            <View style={styles.listHeader}>
                <View style={styles.listHeaderBadge}>
                    <BlurView intensity={10} tint="light" style={StyleSheet.absoluteFill} />
                    <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6 }}>
                        <Ionicons name="shield-checkmark-outline" size={16} color="#00FF66" style={{ marginRight: 6 }} />
                        <Text style={styles.listHeaderText}>
                            {(selectedLeague?.name || 'LIGA').toUpperCase()} JAMOALARI ({teams?.length || 0})
                        </Text>
                    </View>
                </View>
            </View>
        </View>
    );
};

export default function TournamentsScreen({ navigation }: any) {
    const [isLoading, setIsLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('league'); // 'league' or 'favorites'
    const [searchQuery, setSearchQuery] = useState('');
    const [leagues, setLeagues] = useState<any[]>([]);
    const [selectedLeague, setSelectedLeague] = useState<any | null>(null);
    const [isLeagueSelectorOpen, setIsLeagueSelectorOpen] = useState(false);
    const [isLeaguesLoading, setIsLeaguesLoading] = useState(true);
    const [teams, setTeams] = useState<any[]>([]);
    const [teamsLoading, setTeamsLoading] = useState(false);

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

    const fetchLeagueTeams = async (leagueName: string) => {
        try {
            setTeamsLoading(true);
            const teamData = await apiService.getTeams(1, 100, leagueName);
            setTeams(teamData || []);
        } catch (error) {
            console.error('Error fetching league teams:', error);
            setTeams([]);
        } finally {
            setTeamsLoading(false);
        }
    };

    const fetchLeagues = async () => {
        try {
            setIsLeaguesLoading(true);
            const data = await apiService.getLeagues();
            if (data && Array.isArray(data)) {
                setLeagues(data);
                if (data.length > 0 && !selectedLeague) {
                    const firstLeague = data[0];
                    setSelectedLeague(firstLeague);
                    await fetchLeagueTeams(firstLeague.name || firstLeague.id || '');
                }
            }
        } catch (error) {
            console.error('Error fetching leagues:', error);
        } finally {
            setIsLeaguesLoading(false);
        }
    };

    useEffect(() => {
        fetchLeagues();
    }, []);

    useEffect(() => {
        if (selectedLeague && (leagues?.length || 0) > 0 && !isLeaguesLoading) {
            fetchLeagueTeams(selectedLeague.name || selectedLeague.id || '');
        }
    }, [selectedLeague?._id, selectedLeague?.name]);

    const handleLeagueSelect = useCallback((league: any) => {
        setIsLeagueSelectorOpen(false);
        setSelectedLeague(league);
        fetchLeagueTeams(league.name || league.id || '');
    }, []);

    const handleSocialPress = useCallback((url?: string) => {
        if (url) {
            Linking.openURL(url).catch(err => console.error("Couldn't load page", err));
        }
    }, []);

    const filteredTeams = (teams || []).filter(t =>
        t.name?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const renderTeamItem = ({ item: team, index }: { item: any, index: number }) => {
        if (team._isSkeleton) {
            return (
                <View style={[styles.teamItem, { borderBottomWidth: 0 }]} key={`skeleton-${index}`}>
                    <Skeleton circle width={48} height={48} style={{ marginRight: 14 }} />
                    <View style={{ flex: 1 }}>
                        <Skeleton width={width * 0.5} height={18} borderRadius={4} style={{ marginBottom: 6 }} />
                        <Skeleton width={width * 0.3} height={12} borderRadius={4} />
                    </View>
                </View>
            );
        }

        return (
            <TouchableOpacity
                key={team.id || team._id}
                style={styles.teamItem}
                onPress={() => navigation.navigate('TeamProfile', { teamId: team.id || team._id, team })}
                activeOpacity={0.7}
            >
                <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
                <View style={styles.teamItemContent}>
                    <View style={styles.teamLogoCircle}>
                        {team.logo_url ? (
                            <Image source={{ uri: team.logo_url }} style={styles.teamLogoImage} />
                        ) : (
                            <Ionicons name="shield" size={24} color={Colors.primary} />
                        )}
                    </View>
                    <View style={styles.teamMainInfo}>
                        <Text style={styles.teamItemName} numberOfLines={1}>
                            {(team.name || 'JAMOA').toUpperCase()}
                        </Text>
                        <View style={styles.teamBadgeRow}>
                            <View style={styles.leagueTagBadge}>
                                <Text style={styles.leagueTagText}>
                                    {(team.league || selectedLeague?.name || 'HFL LIGA').toUpperCase()}
                                </Text>
                            </View>
                        </View>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.4)" />
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <AnimatedBackground overlayOpacity={0.7} backgroundImage={backgroundImage}>

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
                                placeholder="Jamoalarni qidirish..."
                                placeholderTextColor="rgba(255,255,255,0.5)"
                                value={searchQuery}
                                onChangeText={setSearchQuery}
                            />
                            <Ionicons name="search" size={20} color="#FFF" />
                        </View>
                    </View>
                </View>


                {isLeaguesLoading ? (
                    <TournamentsSkeleton />
                ) : (
                    <FlatList
                        data={teamsLoading ? Array(5).fill({ _isSkeleton: true }) : filteredTeams}
                        keyExtractor={(item, index) => item?.id || item?._id || `skeleton-${index}`}
                        renderItem={renderTeamItem}
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
                                teams={teams}
                                teamsLoading={teamsLoading}
                                navigation={navigation}
                            />
                        }
                        ListEmptyComponent={
                            !teamsLoading ? (
                                <View style={styles.emptyStateBox}>
                                    <Ionicons name="shield-outline" size={48} color="rgba(255,255,255,0.2)" />
                                    <Text style={styles.emptyStateText}>Ushbu ligada hozircha jamoalar kiritilmagan</Text>
                                </View>
                            ) : null
                        }
                        contentContainerStyle={styles.list}
                        refreshControl={
                            <RefreshControl
                                refreshing={teamsLoading && teams.length > 0}
                                onRefresh={() => fetchLeagueTeams(selectedLeague?.name || selectedLeague?.id || '')}
                                tintColor={Colors.primary}
                                colors={[Colors.primary]}
                            />
                        }
                    />
                )}
            </SafeAreaView>
        </AnimatedBackground>
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
        padding: 4,
    },
    headerLeagueLogo: {
        width: 72,
        height: 72,
    },
    accordionLogo: {
        width: 26,
        height: 26,
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
        paddingBottom: 110,
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
    leagueCardCentered: {
        marginHorizontal: 16,
        marginBottom: 16,
        borderRadius: 24,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    leagueCardCenteredContent: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 4,
        paddingBottom: 2,
        paddingHorizontal: 12,
    },
    largeLogoWrapper: {
        width: '100%',
        height: 110,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 0,
    },
    headerLeagueLogoLarge: {
        width: '80%',
        height: 110,
    },
    leagueTitleCenteredRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 6,
    },
    leagueTitleCenteredText: {
        color: '#FFFFFF',
        fontSize: 22,
        fontWeight: '900',
        letterSpacing: 0.5,
        textShadowColor: 'rgba(0,0,0,0.8)',
        textShadowRadius: 6,
    },
    locationBadgeCentered: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 255, 102, 0.1)',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: 'rgba(0, 255, 102, 0.25)',
    },
    locationBadgeText: {
        color: '#00FF66',
        fontSize: 12,
        fontWeight: '700',
        marginLeft: 6,
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
    teamsSectionContainer: {
        marginBottom: 25,
    },
    teamBadgeCard: {
        width: 110,
        height: 100,
        marginRight: 10,
        borderRadius: 16,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.12)',
    },
    teamCardInner: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 10,
    },
    teamLogoCircleSmall: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(255,255,255,0.08)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 6,
    },
    teamLogoSmall: {
        width: 34,
        height: 34,
        borderRadius: 17,
    },
    teamBadgeName: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '700',
        textAlign: 'center',
    },
    noTeamsText: {
        color: 'rgba(255,255,255,0.5)',
        fontSize: 13,
    },
    teamItem: {
        marginHorizontal: 16,
        marginBottom: 10,
        borderRadius: 16,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
    },
    teamItemContent: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 14,
    },
    teamLogoCircle: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: 'rgba(255,255,255,0.06)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 14,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    teamLogoImage: {
        width: 38,
        height: 38,
        borderRadius: 19,
    },
    teamMainInfo: {
        flex: 1,
    },
    teamItemName: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '800',
        marginBottom: 4,
    },
    teamBadgeRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    leagueTagBadge: {
        backgroundColor: 'rgba(0, 255, 102, 0.15)',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: 'rgba(0, 255, 102, 0.3)',
    },
    leagueTagText: {
        color: '#00FF66',
        fontSize: 11,
        fontWeight: '700',
    },
    emptyStateBox: {
        padding: 40,
        alignItems: 'center',
    },
    emptyStateText: {
        color: 'rgba(255,255,255,0.5)',
        fontSize: 14,
        marginTop: 12,
        fontWeight: '600',
    },
});
