import React, { useEffect, useState, useRef } from 'react';
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

const { width } = Dimensions.get('window');

export default function TournamentsScreen({ navigation }: any) {
    const { tournaments, setTournaments, isLoading, setLoading } = useTournamentStore();
    const [activeTab, setActiveTab] = useState('league'); // 'league' or 'favorites'
    const [searchQuery, setSearchQuery] = useState('');
    const [leagues, setLeagues] = useState<any[]>([]);
    const [selectedLeague, setSelectedLeague] = useState<any | null>(null);
    const [isLeagueSelectorOpen, setIsLeagueSelectorOpen] = useState(false);
    const [isLeaguesLoading, setIsLeaguesLoading] = useState(false);

    const animationValue = useRef(new Animated.Value(0)).current;

    const toggleLeagueSelector = () => {
        const toValue = isLeagueSelectorOpen ? 0 : 1;
        
        Animated.timing(animationValue, {
            toValue,
            duration: 500,
            useNativeDriver: false, // Height/maxHeight doesn't support native driver
        }).start();

        setIsLeagueSelectorOpen(!isLeagueSelectorOpen);
    };

    const fetchLeagues = async () => {
        try {
            setIsLeaguesLoading(true);
            const data = await apiService.getLeagues();
            if (data && Array.isArray(data)) {
                setLeagues(data);
                if (data.length > 0 && !selectedLeague) {
                    setSelectedLeague(data[0]);
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
            setLoading(true);
            const data = await apiService.getTournaments();
            if (data && Array.isArray(data)) {
                // Filter tournaments by league if one is selected
                const filtered = leagueId 
                    ? data.filter((t: any) => t.leagueId === leagueId || t.league === leagueId)
                    : data;
                setTournaments(filtered);
            }
        } catch (error) {
            console.error('Error fetching tournaments:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLeagues();
    }, []);

    useEffect(() => {
        fetchTournaments(selectedLeague?._id);
    }, [selectedLeague]);

    const handleLeagueSelect = (league: any) => {
        Animated.timing(animationValue, {
            toValue: 0,
            duration: 400,
            useNativeDriver: false,
        }).start();
        setSelectedLeague(league);
        setIsLeagueSelectorOpen(false);
    };

    const handleSocialPress = (url?: string) => {
        if (url) {
            Linking.openURL(url).catch(err => console.error("Couldn't load page", err));
        }
    };

    const filteredTournaments = tournaments.filter(t => 
        t.name?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const accordionHeight = animationValue.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 300], // Adjust based on your list size or use measure
    });

    const accordionOpacity = animationValue.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 1],
    });

    const renderHeader = () => (
        <View style={styles.headerContent}>
            {/* ... Tabs Row kept same ... */}
            <View style={styles.tabsRow}>
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
                        color={activeTab === 'favorites' ? '#FFF' : Colors.textMuted}
                        style={{ marginRight: 8 }}
                    />
                    <Text style={[styles.tabText, activeTab === 'favorites' && styles.activeTabText]}>
                        Saralanganlar
                    </Text>
                </TouchableOpacity>
            </View>

            {/* League Info Card */}
            <TouchableOpacity style={styles.leagueCard} onPress={toggleLeagueSelector}>
                <View style={styles.logoBox}>
                    {selectedLeague?.logo ? (
                        <Image 
                            source={{ uri: selectedLeague.logo }} 
                            style={styles.headerLeagueLogo}
                            resizeMode="contain"
                        />
                    ) : (
                        <Text style={styles.logoText}>AMATORA</Text>
                    )}
                </View>
                <View style={styles.leagueDetails}>
                    <View style={styles.locationRow}>
                        <Image
                            source={{ uri: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/84/Flag_of_Uzbekistan.svg/1200px-Flag_of_Uzbekistan.svg.png' }}
                            style={styles.flagIcon}
                        />
                        <Text style={styles.locationText}>{selectedLeague?.location || 'Toshkent'}</Text>
                    </View>
                    <View style={styles.leagueNameRow}>
                        <Text style={styles.leagueNameTitle} numberOfLines={1}>
                            {(selectedLeague?.name || 'AMATORA TASHKENT 8X8').toUpperCase()}
                        </Text>
                        <Ionicons 
                            name={isLeagueSelectorOpen ? "chevron-up" : "chevron-down"} 
                            size={20} 
                            color={Colors.primary} 
                        />
                    </View>
                    <View style={styles.socialRow}>
                        {selectedLeague?.instagram && (
                            <TouchableOpacity 
                                style={styles.socialIcon} 
                                onPress={() => handleSocialPress(selectedLeague.instagram)}
                            >
                                <Ionicons name="logo-instagram" size={20} color={Colors.primary} />
                            </TouchableOpacity>
                        )}
                        {selectedLeague?.telegram && (
                            <TouchableOpacity 
                                style={styles.socialIcon} 
                                onPress={() => handleSocialPress(selectedLeague.telegram)}
                            >
                                <Ionicons name="paper-plane" size={20} color={Colors.primary} />
                            </TouchableOpacity>
                        )}
                        {selectedLeague?.facebook && (
                            <TouchableOpacity 
                                style={styles.socialIcon} 
                                onPress={() => handleSocialPress(selectedLeague.facebook)}
                            >
                                <Ionicons name="logo-facebook" size={20} color={Colors.primary} />
                            </TouchableOpacity>
                        )}
                        {selectedLeague?.youtube && (
                            <TouchableOpacity 
                                style={styles.socialIcon} 
                                onPress={() => handleSocialPress(selectedLeague.youtube)}
                            >
                                <Ionicons name="logo-youtube" size={20} color={Colors.primary} />
                            </TouchableOpacity>
                        )}
                        {selectedLeague?.tiktok && (
                            <TouchableOpacity 
                                style={styles.socialIcon} 
                                onPress={() => handleSocialPress(selectedLeague.tiktok)}
                            >
                                <Ionicons name="logo-tiktok" size={20} color={Colors.primary} />
                            </TouchableOpacity>
                        )}
                        {selectedLeague?.website && (
                            <TouchableOpacity 
                                style={styles.socialIcon} 
                                onPress={() => handleSocialPress(selectedLeague.website)}
                            >
                                <Ionicons name="globe-outline" size={20} color={Colors.primary} />
                            </TouchableOpacity>
                        )}
                        {!selectedLeague?.instagram && !selectedLeague?.telegram && !selectedLeague?.facebook && !selectedLeague?.youtube && !selectedLeague?.tiktok && !selectedLeague?.website && (
                            <Text style={{ color: Colors.textMuted, fontSize: 12 }}>Ijtimoiy tarmoqlar yo'q</Text>
                        )}
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
                    })
                }
            ]}>
                <ScrollView 
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.accordionContent}
                >
                    {isLeaguesLoading ? (
                        <View style={{ padding: 16 }}>
                            <Skeleton width="100%" height={40} borderRadius={6} style={{ marginBottom: 12 }} />
                            <Skeleton width="100%" height={40} borderRadius={6} style={{ marginBottom: 12 }} />
                            <Skeleton width="100%" height={40} borderRadius={6} />
                        </View>
                    ) : (
                        leagues.map((league) => (
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

            {/* Stats Row - Dynamic Counts */}
            <View style={styles.statsRow}>
                <View style={styles.statItem}>
                    <Text style={styles.statLabel}>Turnirlar</Text>
                    <Text style={styles.statValue}>{tournaments.length}</Text>
                </View>
                <View style={styles.statItem}>
                    <Text style={styles.statLabel}>Holati</Text>
                    <Text style={styles.statValue}>
                        {tournaments.filter(t => t.status === 'ongoing').length} faol
                    </Text>
                </View>
                <View style={styles.statItem}>
                    <Text style={styles.statLabel}>Region</Text>
                    <Text style={styles.statValue}>1</Text>
                </View>
                <View style={styles.statItem}>
                    <Text style={styles.statLabel}>Tashkilot</Text>
                    <Text style={styles.statValue}>{selectedLeague?.organization?.toUpperCase() || 'AMATORA'}</Text>
                </View>
            </View>

            {/* Action Buttons */}
            <View style={styles.actionsRow}>
                <TouchableOpacity style={styles.participateBtn}>
                    <Text style={styles.participateBtnText}>Qatnashish</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.hallOfFameBtn}>
                    <Text style={styles.hallOfFameBtnText}>Shuhrat zali</Text>
                    <Ionicons name="arrow-forward" size={16} color={Colors.primary} />
                </TouchableOpacity>
            </View>

            {/* Tournament List Header */}
            <View style={styles.listHeader}>
                <View style={styles.listHeaderBadge}>
                    <Image
                        source={{ uri: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/84/Flag_of_Uzbekistan.svg/1200px-Flag_of_Uzbekistan.svg.png' }}
                        style={styles.miniFlag}
                    />
                    <Text style={styles.listHeaderText}>Turnirlar ro'yxati</Text>
                </View>
            </View>
        </View>
    );

    const renderTournamentItem = ({ item: tournament }: { item: any }) => (
        <TouchableOpacity
            key={tournament._id}
            style={styles.tournamentItem}
            onPress={() => navigation.navigate('TournamentDetail', {
                tournamentId: tournament._id,
                tournamentName: tournament.name,
                tournament: tournament
            })}
        >
            <View style={styles.tournamentMainInfo}>
                <Text style={styles.tournamentName}>{tournament.name?.toUpperCase() || 'CHAMPION LEAGUE'}</Text>
                <View style={styles.statusRow}>
                    <View style={[styles.statusDot, { backgroundColor: tournament.status === 'ongoing' ? Colors.primary : Colors.textMuted }]} />
                    <Text style={styles.seasonText}>{tournament.season || 'ноябрь - июнь 2026'}</Text>
                </View>
            </View>
            <Ionicons name="star-outline" size={20} color={Colors.surfaceLight} />
        </TouchableOpacity>
    );

    return (
        <View style={styles.mainWrapper}>
            <SafeAreaView style={styles.safeArea} edges={['top']}>
                {/* Custom Navbar */}
                <View style={styles.navbar}>
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

                {isLoading && tournaments.length === 0 ? (
                    <View style={{ flex: 1 }}>
                        <View style={{ padding: 20 }}>
                            <Skeleton width={width - 40} height={100} borderRadius={10} style={{ marginBottom: 20 }} />
                            <Skeleton width={width - 40} height={60} borderRadius={10} />
                        </View>
                        <GenericListSkeleton itemHeight={60} count={6} />
                    </View>
                ) : (
                    <FlatList
                        data={filteredTournaments}
                        keyExtractor={(item) => item._id}
                        renderItem={renderTournamentItem}
                        ListHeaderComponent={renderHeader}
                        contentContainerStyle={styles.list}
                        refreshing={isLoading}
                        onRefresh={fetchTournaments}
                    />
                )}
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    mainWrapper: {
        flex: 1,
        backgroundColor: '#050a18', // Deep dark blue background
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
        backgroundColor: '#050a18',
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
        paddingHorizontal: 16,
        marginBottom: 20,
    },
    tab: {
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 10,
        borderRadius: 4,
        backgroundColor: 'rgba(255,255,255,0.05)',
        marginRight: 8,
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
        paddingHorizontal: 16,
        marginBottom: 25,
    },
    logoBox: {
        width: 100,
        height: 100,
        backgroundColor: 'transparent',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 20,
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
        color: Colors.textMuted,
        fontSize: 14,
    },
    leagueNameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
    },
    leagueNameTitle: {
        color: '#FFF',
        fontSize: 18,
        fontWeight: 'bold',
        marginRight: 6,
    },
    socialRow: {
        flexDirection: 'row',
    },
    socialIcon: {
        marginRight: 16,
    },
    statsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        marginBottom: 25,
    },
    statItem: {
        alignItems: 'center',
    },
    statLabel: {
        color: Colors.textMuted,
        fontSize: 12,
        marginBottom: 6,
    },
    statValue: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: 'bold',
    },
    actionsRow: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        marginBottom: 20,
    },
    participateBtn: {
        flex: 1,
        backgroundColor: Colors.primary,
        paddingVertical: 12,
        borderRadius: 4,
        alignItems: 'center',
        marginRight: 12,
    },
    participateBtnText: {
        color: '#FFF',
        fontWeight: 'bold',
        fontSize: 14,
    },
    hallOfFameBtn: {
        flex: 1,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        paddingVertical: 12,
        borderRadius: 4,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
    },
    hallOfFameBtnText: {
        color: '#FFF',
        fontWeight: '600',
        fontSize: 14,
        marginRight: 8,
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
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 85, 255, 0.2)',
        alignSelf: 'flex-start',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderTopRightRadius: 10,
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
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 16,
        paddingHorizontal: 20,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.03)',
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
        width: 80,
        height: 80,
    },
    leagueAccordion: {
        backgroundColor: 'rgba(255,255,255,0.03)',
        borderTopWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
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
});
