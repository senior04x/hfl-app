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
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import Colors from '../constants/Colors';
import { useTournamentStore } from '../store/useTournamentStore';
import { useAuthStore } from '../store/useAuthStore';
import { useOrganizationStore } from '../store/useOrganizationStore';
import { apiService, supabase } from '../services/apiService';
import GenericListSkeleton from '../components/GenericListSkeleton';
import Skeleton from '../components/Skeleton';
import TournamentsSkeleton from '../components/TournamentsSkeleton';
import OrganizationSelectModal from '../components/OrganizationSelectModal';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { RefreshControl } from 'react-native';
import { BlurView } from 'expo-blur';
import AnimatedBackground from '../components/AnimatedBackground';
import backgroundImage from '../assets/images/backroud-image.png';
import { useTranslation } from 'react-i18next';


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
    isGuest,
    activeTab,
    setActiveTab,
    isLeagueSelectorOpen,
    toggleLeagueSelector,
    isLeaguesLoading,
    selectedLeague,
    activeOrg,
    organizations,
    handleOrgSelect,
    animationValue,
    leagues,
    handleLeagueSelect,
    teams,
    totalTeamsCount,
    teamsLoading,
    navigation
}: any) => {
    const { t } = useTranslation();
    const accordionHeight = animationValue.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 500],
    });

    const accordionOpacity = animationValue.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 1],
    });

    // Current Large Logo: For guest it is the Organization logo, for auth it is League logo
    const orgLogo = activeOrg?.logo_url || activeOrg?.logo || activeOrg?.photo_url;
    const currentLeagueLogoSource = getLeagueLogoSource(selectedLeague);

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
                            {isGuest ? t('tournaments.all_leagues', 'TASHKILOT LIGALARI') : t('tournaments.league_tournaments')}
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
                            {t('tournaments.favorites')}
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* Central Info Card with Glass Effect — Only Large Logo Without Background */}
            <TouchableOpacity 
                style={styles.leagueCardCentered} 
                onPress={toggleLeagueSelector}
                activeOpacity={0.8}
            >
                <BlurView intensity={25} tint="dark" style={StyleSheet.absoluteFill} />
                <View style={styles.leagueCardCenteredContent}>
                    {/* Large Logo without background */}
                    <View style={styles.largeLogoWrapper}>
                        {isGuest ? (
                            isLeaguesLoading || !activeOrg ? (
                                <Skeleton width="92%" height={210} borderRadius={16} />
                            ) : orgLogo && typeof orgLogo === 'string' && (orgLogo.startsWith('http') || orgLogo.length > 8) ? (
                                <Image
                                    source={{ uri: orgLogo }}
                                    style={styles.headerLeagueLogoLarge}
                                    resizeMode="contain"
                                />
                            ) : (
                                <View style={{ alignItems: 'center', justifyContent: 'center' }}>
                                    <Ionicons name="business" size={120} color={Colors.primary} />
                                    <Text style={{ color: '#00FF9D', fontSize: 22, fontWeight: '900', marginTop: 8 }}>
                                        {(activeOrg?.slug || activeOrg?.name || 'HFL').toUpperCase()}
                                    </Text>
                                </View>
                            )
                        ) : (
                            isLeaguesLoading || !selectedLeague ? (
                                <Skeleton width="92%" height={210} borderRadius={16} />
                            ) : currentLeagueLogoSource ? (
                                <Image
                                    source={currentLeagueLogoSource}
                                    style={styles.headerLeagueLogoLarge}
                                    resizeMode="contain"
                                />
                            ) : (
                                <Ionicons name="shield" size={140} color={Colors.primary} />
                            )
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


            {/* Accordion Expansion: Organization List (for guest) OR League List (for auth) */}
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
                    {isGuest ? (
                        /* GUEST MODE: Organization Selector in Accordion */
                        (organizations || []).map((org: any) => {
                            const isSelected = (activeOrg?.id === org.id);
                            const itemOrgLogo = org.logo_url || org.logo || org.photo_url;
                            return (
                                <TouchableOpacity
                                    key={org.id}
                                    style={[
                                        styles.accordionItem,
                                        isSelected && styles.activeAccordionItem
                                    ]}
                                    onPress={() => handleOrgSelect(org)}
                                    activeOpacity={0.6}
                                >
                                    <View style={styles.accordionLogoContainer}>
                                        {itemOrgLogo && typeof itemOrgLogo === 'string' && (itemOrgLogo.startsWith('http') || itemOrgLogo.length > 8) ? (
                                            <Image source={{ uri: itemOrgLogo }} style={styles.accordionLogo} resizeMode="contain" />
                                        ) : (
                                            <Ionicons name="business" size={18} color={Colors.primary} />
                                        )}
                                    </View>
                                    <Text style={[styles.accordionItemName, isSelected && { color: Colors.primary, fontWeight: '900' }]} numberOfLines={1}>
                                        {(org.name || 'TASHKILOT').toUpperCase()}
                                    </Text>
                                    {isSelected && (
                                        <Ionicons name="checkmark-circle" size={20} color={Colors.primary} style={{ marginLeft: 8 }} />
                                    )}
                                </TouchableOpacity>
                            );
                        })
                    ) : (
                        /* AUTH MODE: League Selector in Accordion */
                        isLeaguesLoading ? (
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
                        )
                    )}
                </View>
            </Animated.View>

            {/* Stats Row with Glass Effect */}
            <View style={styles.statsRow}>
                <BlurView intensity={15} tint="dark" style={StyleSheet.absoluteFill} />
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', width: '100%', paddingHorizontal: 20, paddingVertical: 15 }}>
                    <View style={styles.statItem}>
                        <Text style={styles.statLabel}>{t('tournaments.title', 'Ligalar')}</Text>
                        {isLeaguesLoading ? (
                            <Skeleton width={30} height={16} borderRadius={4} />
                        ) : (
                            <Text style={styles.statValue}>
                                {leagues?.length || 0}
                            </Text>
                        )}
                    </View>
                    <View style={styles.statItem}>
                        <Text style={styles.statLabel}>{t('teams.title', 'Jamoalar')}</Text>
                        {isLeaguesLoading ? (
                            <Skeleton width={50} height={16} borderRadius={4} />
                        ) : (
                            <Text style={styles.statValue}>
                                {totalTeamsCount || teams?.length || 0}
                            </Text>
                        )}
                    </View>
                    <View style={styles.statItem}>
                        <Text style={styles.statLabel}>{t('common.region', 'Region')}</Text>
                        {isLeaguesLoading ? (
                            <Skeleton width={32} height={18} borderRadius={4} />
                        ) : (
                            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 4 }}>
                                <Image
                                    source={{
                                        uri: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/84/Flag_of_Uzbekistan.svg/1200px-Flag_of_Uzbekistan.svg.png'
                                    }}
                                    style={{ width: 28, height: 18, borderRadius: 3 }}
                                    resizeMode="cover"
                                />
                            </View>
                        )}
                    </View>
                </View>
            </View>

            {/* List Header Badge */}
            <View style={styles.listHeader}>
                <View style={styles.listHeaderBadge}>
                    <BlurView intensity={10} tint="light" style={StyleSheet.absoluteFill} />
                    <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6 }}>
                        <Ionicons 
                            name={isGuest ? "trophy-outline" : "shield-checkmark-outline"} 
                            size={16} 
                            color="#00FF66" 
                            style={{ marginRight: 6 }} 
                        />
                        <Text style={styles.listHeaderText}>
                            {isGuest 
                                ? `${(activeOrg?.name || 'TASHKILOT').toUpperCase()} ${t('tournaments.title', 'LIGALARI').toUpperCase()} (${leagues?.length || 0})`
                                : `${(selectedLeague?.name || 'LIGA').toUpperCase()} ${t('teams.title', 'JAMOALARI').toUpperCase()} (${teams?.length || 0})`}
                        </Text>
                    </View>
                </View>
            </View>
        </View>
    );
};

export default function TournamentsScreen({ navigation }: any) {
    const { t } = useTranslation();
    const { isGuest } = useAuthStore();
    const { organizations, selectedOrganizationId, setSelectedOrganizationId } = useOrganizationStore();
    const activeOrg = (organizations || []).find((o: any) => o.id === selectedOrganizationId) || organizations?.[0];

    const [isLoading, setIsLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('league'); // 'league' or 'favorites'
    const [searchQuery, setSearchQuery] = useState('');
    const [leagues, setLeagues] = useState<any[]>([]);
    const [selectedLeague, setSelectedLeague] = useState<any | null>(null);
    const [isLeagueSelectorOpen, setIsLeagueSelectorOpen] = useState(false);
    const [showOrgSelectModal, setShowOrgSelectModal] = useState(false);
    const [isLeaguesLoading, setIsLeaguesLoading] = useState(true);
    const [teams, setTeams] = useState<any[]>([]);
    const [totalTeamsCount, setTotalTeamsCount] = useState<number>(0);
    const [teamsLoading, setTeamsLoading] = useState(false);
    const hasCachedLeaguesRef = useRef(false);

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

    const TOURNAMENTS_CACHE_TTL = 5 * 60 * 1000; // 5 minut

    const loadCachedLeagues = async (targetOrgId: number): Promise<boolean> => {
        try {
            const cacheKey = `@amatora_tournaments_cache_${targetOrgId}`;
            const raw = await AsyncStorage.getItem(cacheKey);
            if (raw) {
                const parsed = JSON.parse(raw);
                if (parsed && Array.isArray(parsed.leagues) && parsed.leagues.length > 0) {
                    setLeagues(parsed.leagues);
                    if (parsed.selectedLeague) {
                        setSelectedLeague(parsed.selectedLeague);
                    }
                    if (Array.isArray(parsed.teams) && parsed.teams.length > 0) {
                        setTeams(parsed.teams);
                    }
                    if (parsed.totalTeamsCount) {
                        setTotalTeamsCount(parsed.totalTeamsCount);
                    }
                    hasCachedLeaguesRef.current = true;
                    setIsLeaguesLoading(false);

                    const age = Date.now() - (parsed.timestamp || 0);
                    return age < TOURNAMENTS_CACHE_TTL;
                }
            }
        } catch (e) {
            console.error('Error loading tournaments cache:', e);
        }
        return false;
    };

    const normalizeStr = (str: any) => String(str || '').toLowerCase().replace(/[^a-z0-9]/g, '');

    const fetchLeagues = async (orgIdParam?: number, isSilent = false) => {
        const targetOrgId = orgIdParam || selectedOrganizationId || 1;
        try {
            if (!isSilent && !hasCachedLeaguesRef.current) {
                setIsLeaguesLoading(true);
            }
            
            const [data, allTeamsData, matchesRes] = await Promise.all([
                apiService.getLeaguesByOrgId(targetOrgId),
                apiService.getTeams(1, 500),
                supabase.from('matches').select('id, league, round, tour, status, organization_id, league_id')
            ]);

            const matchesList = matchesRes?.data || [];

            if (data && Array.isArray(data)) {
                const orgLeagueNorms = new Set(data.map((l: any) => normalizeStr(l.name)));

                // Calculate total unique teams for this organization
                const orgTeams = (allTeamsData || []).filter((t: any) => {
                    const tOrg = Number(t.organization_id);
                    if (tOrg && tOrg === targetOrgId) return true;
                    if (t.league && orgLeagueNorms.has(normalizeStr(t.league))) return true;
                    return false;
                });
                const orgTeamsTotal = orgTeams.length > 0 ? orgTeams.length : (allTeamsData?.length || 0);
                setTotalTeamsCount(orgTeamsTotal);

                // Enrich each league with latest round and active/inactive status
                const enrichedLeagues = data.map((l: any) => {
                    const lNorm = normalizeStr(l.name);
                    const leagueMatches = matchesList.filter((m: any) => {
                        const mNorm = normalizeStr(m.league || m.tournament_name || '');
                        const isIdMatch = m.league_id && Number(m.league_id) === Number(l.id);
                        const isOrgMatch = (!m.organization_id || Number(m.organization_id) === targetOrgId);
                        return isOrgMatch && (isIdMatch || (mNorm && lNorm && (mNorm === lNorm || mNorm.includes(lNorm) || lNorm.includes(mNorm))));
                    });

                    let maxRound = 0;
                    let hasPlayedOrScheduled = false;

                    leagueMatches.forEach((m: any) => {
                        const r = Number(m.round || m.tour || 0);
                        if (r > maxRound) maxRound = r;
                        const st = String(m.status || '').toLowerCase();
                        if (st === 'finished' || st === 'completed' || st === 'live' || st === 'first_half' || st === 'second_half' || st === 'halftime' || st === 'scheduled' || st === 'ongoing' || st === 'active') {
                            hasPlayedOrScheduled = true;
                        }
                    });

                    const fallbackRound = Number(l.current_round || l.round || 0);
                    const latestRound = maxRound > 0 ? maxRound : fallbackRound;
                    const hasPlayed = hasPlayedOrScheduled || latestRound > 0 || leagueMatches.length > 0;

                    // Direct database is_active column check
                    const isLeagueActive = (l.is_active !== undefined && l.is_active !== null) 
                        ? (l.is_active === true || l.is_active === 'true') 
                        : hasPlayed;

                    return {
                        ...l,
                        is_active: isLeagueActive,
                        latestRound: latestRound > 0 ? latestRound : 1,
                        hasPlayedMatches: isLeagueActive && hasPlayed,
                        matchesCount: leagueMatches.length
                    };
                });

                setLeagues(enrichedLeagues);

                if (enrichedLeagues.length > 0) {
                    const firstLeague = enrichedLeagues[0];
                    setSelectedLeague(firstLeague);
                    const fetchedTeams = await fetchLeagueTeams(firstLeague.name || firstLeague.id || '');
                    
                    // Save snapshot to cache
                    await AsyncStorage.setItem(`@amatora_tournaments_cache_${targetOrgId}`, JSON.stringify({
                        leagues: enrichedLeagues,
                        selectedLeague: firstLeague,
                        teams: fetchedTeams || [],
                        totalTeamsCount: orgTeamsTotal,
                        timestamp: Date.now()
                    }));
                } else {
                    setSelectedLeague(null);
                    setTeams([]);
                }
            }
        } catch (error) {
            console.error('Error fetching leagues:', error);
        } finally {
            setIsLeaguesLoading(false);
        }
    };

    useEffect(() => {
        const init = async () => {
            const targetOrgId = selectedOrganizationId || 1;
            const isFresh = await loadCachedLeagues(targetOrgId);
            if (!isFresh) {
                fetchLeagues(targetOrgId, hasCachedLeaguesRef.current);
            }
        };
        init();
    }, [selectedOrganizationId]);

    const sortTeamsByStandingsRank = (arr: any[]) => {
        return [...arr].sort((a: any, b: any) => {
            const statsA = a.stats || {};
            const statsB = b.stats || {};
            const ptsA = a.points ?? statsA.points ?? a.pts ?? 0;
            const ptsB = b.points ?? statsB.points ?? b.pts ?? 0;
            if (ptsB !== ptsA) return ptsB - ptsA;

            const gfA = a.goalsFor ?? statsA.goalsFor ?? a.gf ?? 0;
            const gaA = a.goalsAgainst ?? statsA.goalsAgainst ?? a.ga ?? 0;
            const gfB = b.goalsFor ?? statsB.goalsFor ?? b.gf ?? 0;
            const gaB = b.goalsAgainst ?? statsB.goalsAgainst ?? b.ga ?? 0;
            const gdA = a.goalDifference ?? statsA.goalDifference ?? a.gd ?? (gfA - gaA);
            const gdB = b.goalDifference ?? statsB.goalDifference ?? b.gd ?? (gfB - gaB);
            if (gdB !== gdA) return gdB - gdA;

            if (gfB !== gfA) return gfB - gfA;

            const winsA = a.won ?? a.wins ?? statsA.won ?? statsA.wins ?? 0;
            const winsB = b.won ?? b.wins ?? statsB.won ?? statsB.wins ?? 0;
            return winsB - winsA;
        });
    };

    const fetchLeagueTeams = async (leagueName: string) => {
        try {
            setTeamsLoading(true);
            const teamData = await apiService.getTeams(1, 100, leagueName);
            const sortedTeams = sortTeamsByStandingsRank(teamData || []);
            setTeams(sortedTeams);
            return sortedTeams;
        } catch (error) {
            console.error('Error fetching league teams:', error);
            setTeams([]);
            return [];
        } finally {
            setTeamsLoading(false);
        }
    };

    useEffect(() => {
        if (selectedLeague && (leagues?.length || 0) > 0 && !isLeaguesLoading && !hasCachedLeaguesRef.current) {
            fetchLeagueTeams(selectedLeague.name || selectedLeague.id || '');
        }
    }, [selectedLeague?.id, selectedLeague?.name]);

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

    const filteredLeagues = (leagues || []).filter(l =>
        l.name?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const renderLeagueItemForGuest = ({ item: league, index }: { item: any, index: number }) => {
        if (league._isSkeleton) {
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

        const leagueLogo = getLeagueLogoSource(league);
        const roundNumber = Number(league.latestRound || league.current_round || league.round || 0);
        const isActive = (league.is_active === true || league.is_active === 'true' || league.is_active !== false);

        return (
            <TouchableOpacity
                key={league.id || league._id}
                style={styles.teamItem}
                onPress={() => navigation.navigate('TournamentDetail', { 
                    tournament: league, 
                    tournamentId: league.id || league._id 
                })}
                activeOpacity={0.7}
            >
                <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
                <View style={styles.teamItemContent}>
                    {/* PLAIN NUMBER 1, 2, 3 (NO MEDALS) */}
                    <View style={{ width: 26, alignItems: 'center', justifyContent: 'center', marginRight: 8 }}>
                        <Text style={{ color: 'rgba(255,255,255,0.7)', fontWeight: '900', fontSize: 14 }}>
                            {index + 1}
                        </Text>
                    </View>

                    <View style={styles.teamLogoCircle}>
                        {leagueLogo ? (
                            <Image source={leagueLogo} style={styles.teamLogoImage} resizeMode="contain" />
                        ) : (
                            <Ionicons name="trophy" size={24} color={Colors.primary} />
                        )}
                    </View>
                    <View style={styles.teamMainInfo}>
                        <Text style={styles.teamItemName} numberOfLines={1}>
                            {(league.name || 'LIGA').toUpperCase()}
                        </Text>
                        <View style={styles.teamBadgeRow}>
                            {isActive ? (
                                <View style={styles.leagueTagBadge}>
                                    <Text style={styles.leagueTagText}>
                                        {roundNumber > 0 
                                            ? `${roundNumber}-${t('matches.tour', 'TUR')} • ${t('common.active', 'FAOL').toUpperCase()}`
                                            : t('common.active', 'FAOL').toUpperCase()}
                                    </Text>
                                </View>
                            ) : (
                                <View style={[styles.leagueTagBadge, { backgroundColor: 'rgba(255, 75, 75, 0.15)', borderColor: 'rgba(255, 75, 75, 0.3)' }]}>
                                    <Text style={[styles.leagueTagText, { color: '#FF5555' }]}>
                                        {t('common.inactive', 'NOFAOL').toUpperCase()}
                                    </Text>
                                </View>
                            )}
                            <Text style={{ color: '#00FF66', fontSize: 11, fontWeight: '900', marginLeft: 8 }}>
                                {league.location || "O'zbekiston"}
                            </Text>
                        </View>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.4)" />
                </View>
            </TouchableOpacity>
        );
    };

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

        const points = team.points ?? team.stats?.points ?? team.pts ?? 0;

        return (
            <TouchableOpacity
                key={team.id || team._id}
                style={styles.teamItem}
                onPress={() => navigation.navigate('TeamProfile', { teamId: team.id || team._id, team })}
                activeOpacity={0.7}
            >
                <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
                <View style={styles.teamItemContent}>
                    {/* RANK POSITION BADGE / MEDAL */}
                    <View style={{ width: 26, alignItems: 'center', justifyContent: 'center', marginRight: 8 }}>
                        {index === 0 ? (
                            <FontAwesome5 name="medal" size={16} color="#FFD700" />
                        ) : index === 1 ? (
                            <FontAwesome5 name="medal" size={16} color="#C0C0C0" />
                        ) : index === 2 ? (
                            <FontAwesome5 name="medal" size={16} color="#CD7F32" />
                        ) : (
                            <Text style={{ color: 'rgba(255,255,255,0.6)', fontWeight: '900', fontSize: 13 }}>
                                {index + 1}
                            </Text>
                        )}
                    </View>

                    <View style={styles.teamLogoCircle}>
                        {team.logo_url || team.logo ? (
                            <Image source={{ uri: team.logo_url || team.logo }} style={styles.teamLogoImage} />
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
                            {team.status === 'partially_approved' || team.status === 'pending' ? (
                                <View style={[styles.leagueTagBadge, { backgroundColor: 'rgba(255, 180, 0, 0.15)', borderColor: 'rgba(255, 180, 0, 0.4)', marginLeft: 6 }]}>
                                    <Text style={[styles.leagueTagText, { color: '#FFB800' }]}>
                                        {team.status === 'partially_approved' ? 'QISMAN TASDIQLANGAN' : t('common.pending', 'KUTILMOQDA').toUpperCase()}
                                    </Text>
                                </View>
                            ) : null}
                            <Text style={{ color: '#00FF66', fontSize: 11, fontWeight: '900', marginLeft: 8 }}>
                                {points} {t('teams.points', 'OCHKO').toUpperCase()}
                            </Text>
                        </View>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.4)" />
                </View>
            </TouchableOpacity>
        );
    };

    const handleOrgSelect = useCallback((org: any) => {
        setIsLeagueSelectorOpen(false);
        setSelectedOrganizationId(org.id);
        fetchLeagues(org.id);
    }, []);

    return (
        <AnimatedBackground overlayOpacity={0.7} backgroundImage={backgroundImage}>

            <SafeAreaView style={styles.safeArea} edges={['top']}>
                {/* Custom Navbar */}
                <View style={styles.navbar}>
                    <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', paddingHorizontal: 16, paddingVertical: 12 }}>
                        <View style={styles.navbarLeft}>
                            <Text style={styles.navLogoText}>AMATORA</Text>
                            <Text style={styles.navTitle}>{t('tournaments.title')}</Text>
                        </View>
                        <View style={styles.navSearchContainer}>
                            <TextInput
                                style={styles.navSearchInput}
                                placeholder={t('common.search')}
                                placeholderTextColor="rgba(255,255,255,0.5)"
                                value={searchQuery}
                                onChangeText={setSearchQuery}
                            />
                            <Ionicons name="search" size={20} color="#FFF" />
                        </View>
                    </View>
                </View>


                {isLeaguesLoading && leagues.length === 0 ? (
                    <TournamentsSkeleton />
                ) : (
                    <FlatList
                        data={isGuest 
                            ? (isLeaguesLoading ? Array(4).fill({ _isSkeleton: true }) : filteredLeagues)
                            : (teamsLoading ? Array(5).fill({ _isSkeleton: true }) : filteredTeams)}
                        keyExtractor={(item, index) => item?.id || item?._id || `item-${index}`}
                        renderItem={isGuest ? renderLeagueItemForGuest : renderTeamItem}
                        ListHeaderComponent={
                            <TournamentsHeader
                                isGuest={isGuest}
                                activeTab={activeTab}
                                setActiveTab={setActiveTab}
                                isLeagueSelectorOpen={isLeagueSelectorOpen}
                                toggleLeagueSelector={toggleLeagueSelector}
                                isLeaguesLoading={isLeaguesLoading}
                                selectedLeague={selectedLeague}
                                activeOrg={activeOrg}
                                organizations={organizations}
                                handleOrgSelect={handleOrgSelect}
                                animationValue={animationValue}
                                leagues={leagues}
                                handleLeagueSelect={handleLeagueSelect}
                                teams={teams}
                                totalTeamsCount={totalTeamsCount}
                                teamsLoading={teamsLoading}
                                navigation={navigation}
                            />
                        }
                        ListEmptyComponent={
                            isGuest ? (
                                !isLeaguesLoading ? (
                                    <View style={styles.emptyStateBox}>
                                        <Ionicons name="trophy-outline" size={48} color="rgba(255,255,255,0.2)" />
                                        <Text style={styles.emptyStateText}>{t('tournaments.no_tournaments', "Ligalar mavjud emas")}</Text>
                                    </View>
                                ) : null
                            ) : (
                                !teamsLoading ? (
                                    <View style={styles.emptyStateBox}>
                                        <Ionicons name="shield-outline" size={48} color="rgba(255,255,255,0.2)" />
                                        <Text style={styles.emptyStateText}>{t('teams.no_teams', "Jamoalar mavjud emas")}</Text>
                                    </View>
                                ) : null
                            )
                        }
                        contentContainerStyle={[styles.list, { paddingBottom: 130 }]}
                        refreshControl={
                            <RefreshControl
                                refreshing={isGuest ? (isLeaguesLoading && leagues.length > 0) : (teamsLoading && teams.length > 0)}
                                onRefresh={() => isGuest ? fetchLeagues(selectedOrganizationId, true) : fetchLeagueTeams(selectedLeague?.name || selectedLeague?.id || '')}
                                tintColor={Colors.primary}
                                colors={[Colors.primary]}
                            />
                        }
                    />
                )}
            </SafeAreaView>

            {/* Organization Selection Modal for Guest Mode */}
            <OrganizationSelectModal
                visible={showOrgSelectModal}
                onClose={() => setShowOrgSelectModal(false)}
                onSelect={(org) => {
                    setSelectedOrganizationId(org.id);
                    fetchLeagues(org.id);
                }}
            />
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
        width: '100%',
        backgroundColor: 'rgba(0, 255, 135, 0.08)',
        height: 48,
        borderWidth: 1,
        borderColor: 'rgba(0, 255, 135, 0.3)',
        borderRadius: 12,
        overflow: 'hidden',
        alignItems: 'center',
        justifyContent: 'center',
    },
    hallOfFameBtnText: {
        color: Colors.primary,
        fontWeight: '900',
        fontSize: 14,
        letterSpacing: 1.5,
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
    // Guest Mode Styles
    guestOrgCard: {
        marginHorizontal: 16,
        borderRadius: 20,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(0, 255, 102, 0.25)',
        backgroundColor: 'rgba(20, 25, 35, 0.65)',
        marginBottom: 18,
    },
    guestOrgContent: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
    },
    guestOrgLogoWrapper: {
        width: 58,
        height: 58,
        borderRadius: 16,
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.15)',
        overflow: 'hidden',
    },
    guestOrgLogoImage: {
        width: 44,
        height: 44,
    },
    guestOrgFallbackBox: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    guestOrgFallbackText: {
        color: '#00FF9D',
        fontSize: 10,
        fontWeight: '900',
        marginTop: 1,
    },
    guestOrgSwitchBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 223, 130, 0.15)',
        paddingHorizontal: 8,
        paddingVertical: 6,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: 'rgba(0, 223, 130, 0.35)',
        gap: 2,
    },
    guestOrgBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 223, 130, 0.15)',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
        alignSelf: 'flex-start',
        marginBottom: 6,
        borderWidth: 1,
        borderColor: 'rgba(0, 223, 130, 0.3)',
        gap: 4,
    },
    guestOrgBadgeText: {
        color: '#00FF9D',
        fontSize: 10,
        fontWeight: '900',
        letterSpacing: 0.5,
    },
    guestOrgName: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '900',
        letterSpacing: 0.3,
        marginBottom: 2,
    },
    guestOrgSubtitle: {
        color: 'rgba(255, 255, 255, 0.55)',
        fontSize: 12,
        fontWeight: '600',
    },
    guestLeagueCard: {
        marginHorizontal: 16,
        borderRadius: 16,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.08)',
        backgroundColor: 'rgba(255, 255, 255, 0.04)',
        marginBottom: 12,
    },
    guestLeagueCardContent: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 14,
    },
    guestLeagueLogoWrapper: {
        width: 56,
        height: 56,
        borderRadius: 16,
        backgroundColor: 'rgba(255, 255, 255, 0.06)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.12)',
    },
    guestLeagueLogoImage: {
        width: 42,
        height: 42,
    },
    guestLeagueName: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '900',
        letterSpacing: 0.4,
        marginBottom: 6,
    },
    guestLeagueMetaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    guestLeagueRegionText: {
        color: 'rgba(255, 255, 255, 0.5)',
        fontSize: 11,
        fontWeight: '700',
    },
    guestLeagueActionBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(0, 223, 130, 0.12)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(0, 223, 130, 0.3)',
        marginLeft: 8,
    },
});
