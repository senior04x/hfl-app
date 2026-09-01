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
    ScrollView,
    Animated,
    Platform,
    RefreshControl
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import Colors from '../constants/Colors';
import { useAuthStore } from '../store/useAuthStore';
import { useOrganizationStore } from '../store/useOrganizationStore';
import { apiService, supabase } from '../services/apiService';
import Skeleton from '../components/Skeleton';
import TournamentsSkeleton from '../components/TournamentsSkeleton';
import OrganizationSelectModal from '../components/OrganizationSelectModal';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslation } from 'react-i18next';
import AppNavbar from '../components/AppNavbar';
import { useThemeStore } from '../store/useThemeStore';
import { getHomeScreenColors } from '../constants/homeTheme';
import { useNavBarScroll } from '../context/NavBarScrollContext';

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

// Stable Minimalist Header Component
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
    leaguePlayersCount,
    navigation,
    homeColors,
    isDark
}: any) => {
    const { t, i18n } = useTranslation();
    const currentLang = i18n.language || 'uz';

    const accordionHeight = animationValue.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 420],
    });

    const accordionOpacity = animationValue.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 1],
    });

    const orgLogo = activeOrg?.logo_url || activeOrg?.logo || activeOrg?.photo_url;
    const currentLeagueLogoSource = getLeagueLogoSource(selectedLeague);

    const cardSurfaceStyle = {
        backgroundColor: isDark ? homeColors.background : '#FFFFFF',
        borderWidth: 1,
        borderColor: homeColors.border,
        elevation: isDark ? 0 : 2,
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: isDark ? 0 : 0.05,
        shadowRadius: 6,
    };

    return (
        <View style={styles.headerContent}>
            {/* 1. Minimalist Segmented Tabs Row */}
            <View style={[
                styles.tabsRow,
                {
                    backgroundColor: isDark ? homeColors.background : '#F2F2F4',
                    borderColor: homeColors.border
                }
            ]}>
                <TouchableOpacity
                    style={[
                        styles.tab,
                        activeTab === 'league' && [
                            styles.activeTab,
                            {
                                backgroundColor: isDark ? homeColors.surface : '#FFFFFF',
                                shadowColor: '#000000',
                                shadowOffset: { width: 0, height: 1 },
                                shadowOpacity: isDark ? 0.3 : 0.08,
                                shadowRadius: 3,
                                elevation: isDark ? 0 : 2,
                            }
                        ]
                    ]}
                    onPress={() => setActiveTab('league')}
                    activeOpacity={0.8}
                >
                    <Text style={[
                        styles.tabText,
                        { color: activeTab === 'league' ? homeColors.textPrimary : homeColors.textSecondary },
                        activeTab === 'league' && styles.activeTabText
                    ]}>
                        {isGuest ? t('tournaments.all_leagues', 'TASHKILOT LIGALARI') : t('tournaments.league_tournaments', 'LIGA TURNIRLARI')}
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[
                        styles.tab,
                        activeTab === 'favorites' && [
                            styles.activeTab,
                            {
                                backgroundColor: isDark ? homeColors.surface : '#FFFFFF',
                                shadowColor: '#000000',
                                shadowOffset: { width: 0, height: 1 },
                                shadowOpacity: isDark ? 0.3 : 0.08,
                                shadowRadius: 3,
                                elevation: isDark ? 0 : 2,
                            }
                        ]
                    ]}
                    onPress={() => setActiveTab('favorites')}
                    activeOpacity={0.8}
                >
                    <Ionicons
                        name="star"
                        size={14}
                        color={activeTab === 'favorites' ? homeColors.accent : homeColors.textSecondary}
                        style={{ marginRight: 6 }}
                    />
                    <Text style={[
                        styles.tabText,
                        { color: activeTab === 'favorites' ? homeColors.textPrimary : homeColors.textSecondary },
                        activeTab === 'favorites' && styles.activeTabText
                    ]}>
                        {t('tournaments.favorites', 'SEVIMLILAR')}
                    </Text>
                </TouchableOpacity>
            </View>

            {/* 2. Central League / Org Selector Card (Minimalist with High-Contrast Logo Container) */}
            <TouchableOpacity 
                style={[styles.leagueCardCentered, cardSurfaceStyle]} 
                onPress={toggleLeagueSelector}
                activeOpacity={0.85}
            >
                <View style={styles.leagueCardCenteredContent}>
                    <View style={[styles.largeLogoWrapper, { backgroundColor: 'transparent', borderWidth: 0 }]}>
                        {isGuest ? (
                            isLeaguesLoading || !activeOrg ? (
                                <Skeleton width={180} height={80} borderRadius={10} />
                            ) : orgLogo && typeof orgLogo === 'string' && (orgLogo.startsWith('http') || orgLogo.length > 8) ? (
                                <Image
                                    source={{ uri: orgLogo }}
                                    style={styles.headerLeagueLogoLarge}
                                    resizeMode="contain"
                                />
                            ) : (
                                <View style={styles.fallbackLogoBox}>
                                    <Ionicons name="business" size={50} color={homeColors.accent} />
                                    <Text style={[styles.fallbackOrgTitle, { color: '#FFFFFF' }]}>
                                        {(activeOrg?.slug || activeOrg?.name || 'HFL').toUpperCase()}
                                    </Text>
                                </View>
                            )
                        ) : (
                            isLeaguesLoading || !selectedLeague ? (
                                <Skeleton width={180} height={80} borderRadius={10} />
                            ) : currentLeagueLogoSource ? (
                                <Image
                                    source={currentLeagueLogoSource}
                                    style={styles.headerLeagueLogoLarge}
                                    resizeMode="contain"
                                />
                            ) : (
                                <Ionicons name="shield" size={60} color={homeColors.accent} />
                            )
                        )}
                    </View>

                    {/* League / Organization Label & Switcher Cue */}
                    <View style={styles.selectorFooterRow}>
                        <Text style={[styles.selectedLeagueHeading, { color: homeColors.textPrimary }]} numberOfLines={1}>
                            {isGuest 
                                ? (activeOrg?.name || 'TASHKILOT').toUpperCase()
                                : (selectedLeague?.name || 'LIGA').toUpperCase()}
                        </Text>
                        <Ionicons
                            name={isLeagueSelectorOpen ? "chevron-up" : "chevron-down"}
                            size={16}
                            color={homeColors.textSecondary}
                            style={{ marginLeft: 6 }}
                        />
                    </View>
                </View>
            </TouchableOpacity>

            {/* 3. Minimalist Accordion Dropdown */}
            <Animated.View style={[
                styles.leagueAccordion,
                {
                    maxHeight: accordionHeight,
                    opacity: accordionOpacity,
                    backgroundColor: isDark ? homeColors.background : '#FFFFFF',
                    borderColor: homeColors.border,
                    marginBottom: animationValue.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, 14]
                    }),
                }
            ]}>
                <View style={styles.accordionContent}>
                    {isGuest ? (
                        (organizations || []).map((org: any) => {
                            const isSelected = (activeOrg?.id === org.id);
                            const itemOrgLogo = org.logo_url || org.logo || org.photo_url;
                            return (
                                <TouchableOpacity
                                    key={org.id}
                                    style={[
                                        styles.accordionItem,
                                        { borderBottomColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' },
                                        isSelected && { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.03)' }
                                    ]}
                                    onPress={() => handleOrgSelect(org)}
                                    activeOpacity={0.65}
                                >
                                    <View style={[styles.accordionLogoContainer, { backgroundColor: 'transparent', borderWidth: 0 }]}>
                                        {itemOrgLogo && typeof itemOrgLogo === 'string' && (itemOrgLogo.startsWith('http') || itemOrgLogo.length > 8) ? (
                                            <Image source={{ uri: itemOrgLogo }} style={styles.accordionLogo} resizeMode="contain" />
                                        ) : (
                                            <Ionicons name="business" size={16} color={homeColors.accent} />
                                        )}
                                    </View>
                                    <Text style={[
                                        styles.accordionItemName,
                                        { color: isSelected ? homeColors.textPrimary : homeColors.textSecondary },
                                        isSelected && { fontWeight: '800' }
                                    ]} numberOfLines={1}>
                                        {(org.name || 'TASHKILOT').toUpperCase()}
                                    </Text>
                                    {isSelected && (
                                        <Ionicons name="checkmark-circle" size={18} color={homeColors.accent} style={{ marginLeft: 8 }} />
                                    )}
                                </TouchableOpacity>
                            );
                        })
                    ) : (
                        isLeaguesLoading ? (
                            <View style={{ padding: 16 }}>
                                <Skeleton width="100%" height={38} borderRadius={8} style={{ marginBottom: 10 }} />
                                <Skeleton width="100%" height={38} borderRadius={8} style={{ marginBottom: 10 }} />
                                <Skeleton width="100%" height={38} borderRadius={8} />
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
                                            { borderBottomColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' },
                                            isSelected && { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.03)' }
                                        ]}
                                        onPress={() => handleLeagueSelect(league)}
                                        activeOpacity={0.65}
                                    >
                                        <View style={[styles.accordionLogoContainer, { backgroundColor: 'transparent', borderWidth: 0 }]}>
                                            {itemLogo ? (
                                                <Image source={itemLogo} style={styles.accordionLogo} resizeMode="contain" />
                                            ) : (
                                                <Ionicons name="football" size={16} color={homeColors.accent} />
                                            )}
                                        </View>
                                        <Text style={[
                                            styles.accordionItemName,
                                            { color: isSelected ? homeColors.textPrimary : homeColors.textSecondary },
                                            isSelected && { fontWeight: '800' }
                                        ]} numberOfLines={1}>
                                            {league.name?.toUpperCase()}
                                        </Text>
                                        {isSelected && (
                                            <Ionicons name="checkmark-circle" size={18} color={homeColors.accent} style={{ marginLeft: 8 }} />
                                        )}
                                    </TouchableOpacity>
                                );
                            })
                        )
                    )}
                </View>
            </Animated.View>

            {/* 4. About League Button (Auth Mode only) */}
            {!isGuest && selectedLeague ? (
                <TouchableOpacity
                    style={[
                        styles.aboutLeagueButton,
                        {
                            backgroundColor: isDark ? homeColors.background : '#F6F6F8',
                            borderColor: homeColors.border
                        }
                    ]}
                    onPress={() => navigation.navigate('TournamentDetail', {
                        tournamentId: selectedLeague?.id,
                        tournamentName: selectedLeague?.name,
                        tournament: selectedLeague
                    })}
                    activeOpacity={0.8}
                >
                    <View style={styles.aboutLeagueButtonInner}>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <Ionicons name="information-circle-outline" size={17} color={homeColors.textSecondary} style={{ marginRight: 8 }} />
                            <Text style={[styles.aboutLeagueButtonText, { color: homeColors.textPrimary }]}>
                                {t('tournaments.about_league', currentLang === 'ru' ? 'О ЛИГЕ' : (currentLang === 'en' ? 'ABOUT LEAGUE' : 'LIGA HAQIDA')).toUpperCase()}
                            </Text>
                        </View>
                        <Ionicons name="chevron-forward" size={16} color={homeColors.textSecondary} />
                    </View>
                </TouchableOpacity>
            ) : null}

            {/* 5. Minimalist 3-Column Stats Row */}
            <View style={[styles.statsRow, cardSurfaceStyle]}>
                <View style={styles.statItem}>
                    <Text style={[styles.statLabel, { color: homeColors.textSecondary }]}>
                        {isGuest ? t('tournaments.leagues', 'Ligalar') : t('teams.title', 'Jamoalar')}
                    </Text>
                    {isGuest ? (
                        isLeaguesLoading ? (
                            <Skeleton width={30} height={16} borderRadius={4} />
                        ) : (
                            <Text style={[styles.statValue, { color: homeColors.textPrimary }]}>
                                {leagues?.length || 0}
                            </Text>
                        )
                    ) : (
                        teamsLoading ? (
                            <Skeleton width={30} height={16} borderRadius={4} />
                        ) : (
                            <Text style={[styles.statValue, { color: homeColors.textPrimary }]}>
                                {teams?.length || 0}
                            </Text>
                        )
                    )}
                </View>

                <View style={[styles.statDivider, { backgroundColor: homeColors.border }]} />

                <View style={styles.statItem}>
                    <Text style={[styles.statLabel, { color: homeColors.textSecondary }]}>
                        {isGuest ? t('teams.title', 'Jamoalar') : t('players.title', "O'yinchilar")}
                    </Text>
                    {isGuest ? (
                        isLeaguesLoading ? (
                            <Skeleton width={40} height={16} borderRadius={4} />
                        ) : (
                            <Text style={[styles.statValue, { color: homeColors.textPrimary }]}>
                                {totalTeamsCount || teams?.length || 0}
                            </Text>
                        )
                    ) : (
                        teamsLoading ? (
                            <Skeleton width={40} height={16} borderRadius={4} />
                        ) : (
                            <Text style={[styles.statValue, { color: homeColors.textPrimary }]}>
                                {leaguePlayersCount ?? 0}
                            </Text>
                        )
                    )}
                </View>

                <View style={[styles.statDivider, { backgroundColor: homeColors.border }]} />

                <View style={styles.statItem}>
                    <Text style={[styles.statLabel, { color: homeColors.textSecondary }]}>{t('common.region', 'Region')}</Text>
                    {isLeaguesLoading ? (
                        <Skeleton width={28} height={16} borderRadius={4} />
                    ) : (
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 20 }}>
                            <Image
                                source={{ uri: 'https://flagcdn.com/w80/uz.png' }}
                                style={styles.regionFlag}
                                resizeMode="cover"
                            />
                        </View>
                    )}
                </View>
            </View>

            {/* 6. Clean Section Header Badge */}
            <View style={styles.listHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Ionicons 
                        name={isGuest ? "trophy-outline" : "shield-checkmark-outline"} 
                        size={15} 
                        color={homeColors.textSecondary} 
                    />
                    <Text style={[styles.listHeaderText, { color: homeColors.textPrimary }]}>
                        {isGuest 
                            ? `${(activeOrg?.name || 'TASHKILOT').toUpperCase()} ${t('tournaments.title', 'LIGALARI').toUpperCase()} (${leagues?.length || 0})`
                            : `${(selectedLeague?.name || 'LIGA').toUpperCase()} ${t('teams.title', 'JAMOALARI').toUpperCase()} (${teams?.length || 0})`}
                    </Text>
                </View>
            </View>
        </View>
    );
};

export default function TournamentsScreen({ navigation }: any) {
    const { t } = useTranslation();
    const { isGuest } = useAuthStore();
    const { isDark } = useThemeStore();
    const homeColors = getHomeScreenColors(isDark);
    const { handleScroll: handleNavBarScroll } = useNavBarScroll();

    const { organizations, selectedOrganizationId, setSelectedOrganizationId } = useOrganizationStore();
    const activeOrg = (organizations || []).find((o: any) => o.id === selectedOrganizationId) || organizations?.[0];

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
    const [leaguePlayersCount, setLeaguePlayersCount] = useState<number>(0);
    const hasCachedLeaguesRef = useRef(false);

    const animationValue = useRef(new Animated.Value(0)).current;

    const toggleLeagueSelector = useCallback(() => {
        setIsLeagueSelectorOpen(prev => !prev);
    }, []);

    useEffect(() => {
        Animated.timing(animationValue, {
            toValue: isLeagueSelectorOpen ? 1 : 0,
            duration: 250,
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
                    if (parsed.leaguePlayersCount) {
                        setLeaguePlayersCount(parsed.leaguePlayersCount);
                    }
                    hasCachedLeaguesRef.current = true;
                    setIsLeaguesLoading(false);

                    if (Date.now() - parsed.timestamp < TOURNAMENTS_CACHE_TTL) {
                        return true;
                    }
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

                const orgTeams = (allTeamsData || []).filter((t: any) => {
                    const tOrg = Number(t.organization_id);
                    if (tOrg && tOrg === targetOrgId) return true;
                    if (t.league && orgLeagueNorms.has(normalizeStr(t.league))) return true;
                    return false;
                });
                const orgTeamsTotal = orgTeams.length > 0 ? orgTeams.length : (allTeamsData?.length || 0);
                setTotalTeamsCount(orgTeamsTotal);

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
                    
                    await AsyncStorage.setItem(`@amatora_tournaments_cache_${targetOrgId}`, JSON.stringify({
                        leagues: enrichedLeagues,
                        selectedLeague: firstLeague,
                        teams: fetchedTeams || [],
                        totalTeamsCount: orgTeamsTotal,
                        leaguePlayersCount: leaguePlayersCount,
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

            const teamIds = (sortedTeams || []).map((t: any) => t.id || t._id).filter(Boolean);
            if (teamIds.length > 0) {
                try {
                    const { count: pCount } = await supabase
                        .from('applications')
                        .select('id', { count: 'exact', head: true })
                        .in('team_id', teamIds)
                        .eq('status', 'approved')
                        .neq('is_archived', true);
                    setLeaguePlayersCount(pCount || 0);
                } catch (e) {
                    setLeaguePlayersCount(0);
                }
            } else {
                setLeaguePlayersCount(0);
            }

            return sortedTeams;
        } catch (error) {
            console.error('Error fetching league teams:', error);
            setTeams([]);
            setLeaguePlayersCount(0);
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

    const filteredTeams = (teams || []).filter(t =>
        t.name?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const filteredLeagues = (leagues || []).filter(l =>
        l.name?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const cardSurfaceStyle = {
        backgroundColor: isDark ? homeColors.background : '#FFFFFF',
        borderWidth: 1,
        borderColor: homeColors.border,
        elevation: isDark ? 0 : 2,
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: isDark ? 0 : 0.05,
        shadowRadius: 6,
    };

    const renderLeagueItemForGuest = ({ item: league, index }: { item: any, index: number }) => {
        if (league._isSkeleton) {
            return (
                <View style={[styles.teamItem, cardSurfaceStyle, { borderBottomWidth: 0 }]} key={`skeleton-${index}`}>
                    <Skeleton circle width={42} height={42} style={{ marginRight: 12 }} />
                    <View style={{ flex: 1 }}>
                        <Skeleton width={width * 0.45} height={16} borderRadius={4} style={{ marginBottom: 6 }} />
                        <Skeleton width={width * 0.25} height={12} borderRadius={4} />
                    </View>
                </View>
            );
        }

        const leagueLogo = getLeagueLogoSource(league);
        const isActive = (league.is_active === true || league.is_active === 'true' || league.is_active !== false);

        return (
            <TouchableOpacity
                key={league.id || league._id}
                style={[styles.teamItem, cardSurfaceStyle]}
                onPress={() => navigation.navigate('TournamentDetail', { 
                    tournament: league, 
                    tournamentId: league.id || league._id 
                })}
                activeOpacity={0.8}
            >
                <View style={styles.teamItemContent}>
                    {/* Rank Number */}
                    <View style={styles.rankCol}>
                        <Text style={[styles.rankNumber, { color: homeColors.textSecondary }]}>
                            {index + 1}
                        </Text>
                    </View>

                    {/* Logo Circle */}
                    <View style={[styles.teamLogoCircle, { backgroundColor: isDark ? homeColors.background : '#14161D', borderColor: homeColors.border }]}>
                        {leagueLogo ? (
                            <Image source={leagueLogo} style={styles.teamLogoImage} resizeMode="contain" />
                        ) : (
                            <Ionicons name="trophy-outline" size={20} color="#FFFFFF" />
                        )}
                    </View>

                    {/* Info */}
                    <View style={styles.teamMainInfo}>
                        <Text style={[styles.teamItemName, { color: homeColors.textPrimary }]} numberOfLines={1}>
                            {(league.name || 'LIGA').toUpperCase()}
                        </Text>
                        <View style={styles.teamBadgeRow}>
                            <View style={[
                                styles.statusPill,
                                {
                                    backgroundColor: isActive 
                                        ? (isDark ? 'rgba(0, 255, 135, 0.12)' : 'rgba(0, 200, 100, 0.12)')
                                        : (isDark ? 'rgba(255, 75, 75, 0.12)' : 'rgba(230, 50, 50, 0.12)'),
                                }
                            ]}>
                                <Text style={[
                                    styles.statusPillText,
                                    { color: isActive ? '#00C864' : '#E63232' }
                                ]}>
                                    {isActive ? t('common.active', 'FAOL').toUpperCase() : t('common.inactive', 'NOFAOL').toUpperCase()}
                                </Text>
                            </View>
                        </View>
                    </View>

                    <Ionicons name="chevron-forward" size={16} color={homeColors.textSecondary} />
                </View>
            </TouchableOpacity>
        );
    };

    const renderTeamItem = ({ item: team, index }: { item: any, index: number }) => {
        if (team._isSkeleton) {
            return (
                <View style={[styles.teamItem, cardSurfaceStyle, { borderBottomWidth: 0 }]} key={`skeleton-${index}`}>
                    <Skeleton circle width={42} height={42} style={{ marginRight: 12 }} />
                    <View style={{ flex: 1 }}>
                        <Skeleton width={width * 0.45} height={16} borderRadius={4} style={{ marginBottom: 6 }} />
                        <Skeleton width={width * 0.25} height={12} borderRadius={4} />
                    </View>
                </View>
            );
        }

        const points = team.points ?? team.stats?.points ?? team.pts ?? 0;

        return (
            <TouchableOpacity
                key={team.id || team._id}
                style={[styles.teamItem, cardSurfaceStyle]}
                onPress={() => navigation.navigate('TeamProfile', { teamId: team.id || team._id, team })}
                activeOpacity={0.8}
            >
                <View style={styles.teamItemContent}>
                    {/* Rank Indicator */}
                    <View style={styles.rankCol}>
                        {index === 0 ? (
                            <FontAwesome5 name="medal" size={15} color="#FFB800" />
                        ) : index === 1 ? (
                            <FontAwesome5 name="medal" size={15} color="#A0A0A0" />
                        ) : index === 2 ? (
                            <FontAwesome5 name="medal" size={15} color="#CD7F32" />
                        ) : (
                            <Text style={[styles.rankNumber, { color: homeColors.textSecondary }]}>
                                {index + 1}
                            </Text>
                        )}
                    </View>

                    {/* Logo Circle */}
                    <View style={[styles.teamLogoCircle, { backgroundColor: isDark ? homeColors.background : '#F2F2F4', borderColor: homeColors.border }]}>
                        {team.logo_url || team.logo ? (
                            <Image source={{ uri: team.logo_url || team.logo }} style={styles.teamLogoImage} />
                        ) : (
                            <Ionicons name="shield-outline" size={20} color={homeColors.textSecondary} />
                        )}
                    </View>

                    {/* Team Info */}
                    <View style={styles.teamMainInfo}>
                        <Text style={[styles.teamItemName, { color: homeColors.textPrimary }]} numberOfLines={1}>
                            {(team.name || 'JAMOA').toUpperCase()}
                        </Text>
                        <View style={styles.teamBadgeRow}>
                            <View style={[styles.leagueTagBadge, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#EAEAEA' }]}>
                                <Text style={[styles.leagueTagText, { color: homeColors.textSecondary }]}>
                                    {(team.league || selectedLeague?.name || 'HFL LIGA').toUpperCase()}
                                </Text>
                            </View>
                            <Text style={[styles.pointsText, { color: homeColors.textPrimary }]}>
                                {points} <Text style={{ fontSize: 9, color: homeColors.textSecondary }}>{t('teams.points', 'OCHKO').toUpperCase()}</Text>
                            </Text>
                        </View>
                    </View>

                    <Ionicons name="chevron-forward" size={16} color={homeColors.textSecondary} />
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
        <View style={[styles.mainWrapper, { backgroundColor: homeColors.background }]}>
            <SafeAreaView style={styles.safeArea} edges={['top']}>
                {/* Universal Navbar */}
                <AppNavbar
                    title={t('tournaments.title', 'TURNIRLAR')}
                    subtitle="AMATORA"
                    showSearch={true}
                    searchQuery={searchQuery}
                    onSearchChange={setSearchQuery}
                    searchPlaceholder={t('common.search', 'Qidiruv...')}
                />

                {isLeaguesLoading && leagues.length === 0 ? (
                    <TournamentsSkeleton />
                ) : (
                    <FlatList
                        data={isGuest 
                            ? (isLeaguesLoading ? Array(4).fill({ _isSkeleton: true }) : filteredLeagues)
                            : (teamsLoading ? Array(5).fill({ _isSkeleton: true }) : filteredTeams)}
                        keyExtractor={(item, index) => item?.id || item?._id || `item-${index}`}
                        renderItem={isGuest ? renderLeagueItemForGuest : renderTeamItem}
                        onScroll={(e) => handleNavBarScroll('tournaments', e)}
                        scrollEventThrottle={16}
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
                                leaguePlayersCount={leaguePlayersCount}
                                navigation={navigation}
                                homeColors={homeColors}
                                isDark={isDark}
                            />
                        }
                        ListEmptyComponent={
                            isGuest ? (
                                !isLeaguesLoading ? (
                                    <View style={styles.emptyStateBox}>
                                        <Ionicons name="trophy-outline" size={44} color={homeColors.textSecondary} />
                                        <Text style={[styles.emptyStateText, { color: homeColors.textSecondary }]}>
                                            {t('tournaments.no_tournaments', "Ligalar mavjud emas")}
                                        </Text>
                                    </View>
                                ) : null
                            ) : (
                                !teamsLoading ? (
                                    <View style={styles.emptyStateBox}>
                                        <Ionicons name="shield-outline" size={44} color={homeColors.textSecondary} />
                                        <Text style={[styles.emptyStateText, { color: homeColors.textSecondary }]}>
                                            {t('teams.no_teams', "Jamoalar mavjud emas")}
                                        </Text>
                                    </View>
                                ) : null
                            )
                        }
                        contentContainerStyle={[styles.list, { paddingBottom: 130 }]}
                        refreshControl={
                            <RefreshControl
                                refreshing={isGuest ? (isLeaguesLoading && leagues.length > 0) : (teamsLoading && teams.length > 0)}
                                onRefresh={() => isGuest ? fetchLeagues(selectedOrganizationId, true) : fetchLeagueTeams(selectedLeague?.name || selectedLeague?.id || '')}
                                tintColor={homeColors.accent}
                                colors={[homeColors.accent]}
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
        </View>
    );
}

const styles = StyleSheet.create({
    mainWrapper: {
        flex: 1,
    },
    safeArea: {
        flex: 1,
    },
    headerContent: {
        paddingTop: 8,
    },
    tabsRow: {
        flexDirection: 'row',
        marginHorizontal: 16,
        marginBottom: 14,
        borderRadius: 12,
        padding: 3,
        borderWidth: 1,
    },
    tab: {
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 9,
        borderRadius: 9,
        backgroundColor: 'transparent',
    },
    activeTab: {
        borderRadius: 9,
    },
    tabText: {
        fontSize: 12,
        fontWeight: '600',
        letterSpacing: 0.2,
    },
    activeTabText: {
        fontWeight: '800',
    },
    leagueCardCentered: {
        marginHorizontal: 16,
        marginBottom: 12,
        borderRadius: 16,
        overflow: 'hidden',
    },
    leagueCardCenteredContent: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 14,
        paddingBottom: 10,
        paddingHorizontal: 16,
    },
    largeLogoWrapper: {
        width: '100%',
        height: 94,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 12,
        borderWidth: 0,
        paddingVertical: 6,
    },
    headerLeagueLogoLarge: {
        width: '75%',
        height: 85,
    },
    fallbackLogoBox: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    fallbackOrgTitle: {
        fontSize: 18,
        fontWeight: '900',
        marginTop: 6,
    },
    selectorFooterRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 8,
    },
    selectedLeagueHeading: {
        fontSize: 15,
        fontWeight: '800',
        letterSpacing: 0.4,
    },
    leagueAccordion: {
        marginHorizontal: 16,
        borderRadius: 14,
        borderWidth: 1,
        overflow: 'hidden',
    },
    accordionContent: {
        paddingVertical: 4,
    },
    accordionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderBottomWidth: 1,
    },
    accordionLogoContainer: {
        width: 32,
        height: 32,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
        overflow: 'hidden',
    },
    accordionLogo: {
        width: 22,
        height: 22,
    },
    accordionItemName: {
        fontSize: 13,
        fontWeight: '600',
        flex: 1,
    },
    aboutLeagueButton: {
        marginHorizontal: 16,
        marginBottom: 12,
        borderRadius: 12,
        borderWidth: 1,
        overflow: 'hidden',
    },
    aboutLeagueButtonInner: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 14,
        paddingVertical: 10,
    },
    aboutLeagueButtonText: {
        fontSize: 12,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
    statsRow: {
        marginHorizontal: 16,
        marginBottom: 16,
        borderRadius: 14,
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 8,
    },
    statItem: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    statDivider: {
        width: 1,
        height: 24,
    },
    statLabel: {
        fontSize: 10,
        marginBottom: 3,
        fontWeight: '600',
        textTransform: 'uppercase',
    },
    statValue: {
        fontSize: 16,
        fontWeight: '800',
    },
    regionFlag: {
        width: 24,
        height: 16,
        borderRadius: 2,
    },
    listHeader: {
        paddingHorizontal: 16,
        marginBottom: 10,
    },
    listHeaderText: {
        fontSize: 12,
        fontWeight: '800',
        letterSpacing: 0.3,
    },
    teamItem: {
        marginHorizontal: 16,
        marginBottom: 8,
        borderRadius: 14,
        overflow: 'hidden',
    },
    teamItemContent: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 10,
    },
    rankCol: {
        width: 24,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 6,
    },
    rankNumber: {
        fontWeight: '700',
        fontSize: 13,
    },
    teamLogoCircle: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
        borderWidth: 1,
        overflow: 'hidden',
    },
    teamLogoImage: {
        width: 32,
        height: 32,
        borderRadius: 16,
    },
    teamMainInfo: {
        flex: 1,
    },
    teamItemName: {
        fontSize: 13,
        fontWeight: '700',
        marginBottom: 3,
    },
    teamBadgeRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    leagueTagBadge: {
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
        marginRight: 8,
    },
    leagueTagText: {
        fontSize: 9,
        fontWeight: '600',
    },
    pointsText: {
        fontSize: 12,
        fontWeight: '800',
    },
    statusPill: {
        paddingHorizontal: 7,
        paddingVertical: 2,
        borderRadius: 4,
    },
    statusPillText: {
        fontSize: 9,
        fontWeight: '800',
        letterSpacing: 0.3,
    },
    emptyStateBox: {
        padding: 36,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyStateText: {
        fontSize: 13,
        marginTop: 10,
        fontWeight: '600',
    },
    list: {
        paddingBottom: 120,
    },
});

