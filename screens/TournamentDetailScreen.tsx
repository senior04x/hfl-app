import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
    Image,
    ScrollView,
    TextInput,
    Linking,
    Animated
} from 'react-native';
import { BlurView } from 'expo-blur';
import AnimatedBackground from '../components/AnimatedBackground';
import backgroundImage from '../assets/images/backroud-image.png';

import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import Colors from '../constants/Colors';
import { useTeamStore } from '../store/useTeamStore';
import { apiService } from '../services/apiService';
import { supabase } from '../services/supabase';
import { Team } from '../types';
import TournamentDetailSkeleton from '../components/TournamentDetailSkeleton';
import TableSkeleton from '../components/TableSkeleton';
import PlayerListSkeleton from '../components/PlayerListSkeleton';
import MatchesListSkeleton from '../components/MatchesListSkeleton';
import GenericListSkeleton from '../components/GenericListSkeleton';
import SmartImage from '../components/SmartImage';
import { getTeamAbbreviation } from '../utils/stringUtils';

export default function TournamentDetailScreen({ route, navigation }: any) {
    const { tournamentId, tournamentName, tournament } = route?.params || {};
    const currentTournamentId = route?.params?.tournamentId || tournamentId; // Ensure we always have it
    const [activeTab, setActiveTab] = useState('overview'); // overview, standings, players, matches
    
    const { teams, setTeams, isLoading: isTeamsLoading, setLoading: setTeamsLoading } = useTeamStore();
    const [isLoading, setIsLoading] = useState(true);
    const [isLoadingStandings, setIsLoadingStandings] = useState(false);
    const [isLoadingPlayers, setIsLoadingPlayers] = useState(false);
    const [isLoadingMatches, setIsLoadingMatches] = useState(false);
    
    const [tournamentData, setTournamentData] = useState<any>(tournament);
    const [organizerInfo, setOrganizerInfo] = useState<any>({
        name: 'HFL SPORT TASHKILOTI',
        logo: '',
        phone: ''
    });
    const [totalPlayersCount, setTotalPlayersCount] = useState<number>(0);
    const [standings, setStandings] = useState<any[]>([]);
    const [topPlayers, setTopPlayers] = useState<any[]>([]);
    const [matches, setMatches] = useState<any[]>([]);
    const [latestMatches, setLatestMatches] = useState<any[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [availableTournaments, setAvailableTournaments] = useState<any[]>([]);
    const [isSeasonSelectorOpen, setIsSeasonSelectorOpen] = useState(false);
    const seasonAnimationValue = useRef(new Animated.Value(0)).current;

    const toggleSeasonSelector = useCallback(() => {
        setIsSeasonSelectorOpen(prev => !prev);
    }, []);

    useEffect(() => {
        Animated.timing(seasonAnimationValue, {
            toValue: isSeasonSelectorOpen ? 1 : 0,
            duration: 300,
            useNativeDriver: false,
        }).start();
    }, [isSeasonSelectorOpen]);

    const [statFilter, setStatFilter] = useState('goals'); // goals, assists, yellowCards, redCards, matchesPlayed
    const [isStatSelectorOpen, setIsStatSelectorOpen] = useState(false);
    const statAnimationValue = useRef(new Animated.Value(0)).current;

    const toggleStatSelector = useCallback(() => {
        setIsStatSelectorOpen(prev => !prev);
    }, []);

    useEffect(() => {
        Animated.timing(statAnimationValue, {
            toValue: isStatSelectorOpen ? 1 : 0,
            duration: 300,
            useNativeDriver: false,
        }).start();
    }, [isStatSelectorOpen]);

    const handleStatSelect = useCallback((stat: string) => {
        setStatFilter(stat);
        setIsStatSelectorOpen(false);
    }, []);

    // 1. Initial Load: Fetch tournament info, standings teams, organizer & matches
    useEffect(() => {
        const init = async () => {
            setIsLoading(true);
            try {
                const [t, teamsData] = await Promise.all([
                    apiService.getTournamentById(currentTournamentId),
                    apiService.getTeams(1, 100, currentTournamentId)
                ]);

                setTournamentData(t);

                const resolvedTeams = teamsData && teamsData.length > 0 ? teamsData : (t?.teams || []);
                setTeams(resolvedTeams);

                // Populate standings sorted by points -> goal difference -> goals for
                const sortedStandings = [...resolvedTeams].sort((a: any, b: any) => {
                    const ptsA = a.points ?? a.stats?.points ?? 0;
                    const ptsB = b.points ?? b.stats?.points ?? 0;
                    if (ptsB !== ptsA) return ptsB - ptsA;

                    const gfA = a.goalsFor ?? a.stats?.goalsFor ?? 0;
                    const gaA = a.goalsAgainst ?? a.stats?.goalsAgainst ?? 0;
                    const gfB = b.goalsFor ?? b.stats?.goalsFor ?? 0;
                    const gaB = b.goalsAgainst ?? b.stats?.goalsAgainst ?? 0;
                    const gdA = a.goalDifference ?? a.stats?.goalDifference ?? (gfA - gaA);
                    const gdB = b.goalDifference ?? b.stats?.goalDifference ?? (gfB - gaB);
                    if (gdB !== gdA) return gdB - gdA;

                    return gfB - gfA;
                });
                setStandings(sortedStandings);

                // Fetch real organizer details from Supabase 'organizations' table using organization_id
                let orgName = t?.organizer || t?.organizationName || '';
                let orgLogo = t?.organizerLogo || t?.organizationLogo || '';
                let orgPhone = t?.organizerPhone || t?.phone || '';

                let targetOrgId = t?.organization_id || t?.organizationId || (resolvedTeams.length > 0 ? (resolvedTeams[0].organization_id || resolvedTeams[0].organizationId) : null);

                if (targetOrgId) {
                    const { data: orgData } = await supabase.from('organizations').select('*').eq('id', targetOrgId).single();
                    if (orgData) {
                        orgName = orgData.name || orgData.title || orgData.organization_name || orgName;
                        orgLogo = orgData.logo_url || orgData.logo || orgData.photo_url || orgLogo;
                        orgPhone = orgData.phone || orgData.contact_phone || orgPhone;
                    }
                }

                if (!orgName || orgName === 'HFL SPORT TASHKILOTI' || orgName === 'AMATORA ADMIN') {
                    const { data: firstOrg } = await supabase.from('organizations').select('*').limit(1).single();
                    if (firstOrg) {
                        orgName = firstOrg.name || firstOrg.title || firstOrg.organization_name || 'AMATORA TASHKILOTI';
                        orgLogo = firstOrg.logo_url || firstOrg.logo || firstOrg.photo_url || orgLogo;
                        orgPhone = firstOrg.phone || firstOrg.contact_phone || orgPhone;
                    } else {
                        orgName = 'AMATORA TASHKILOTI';
                    }
                }
                setOrganizerInfo({ name: orgName, logo: orgLogo, phone: orgPhone });

                // Calculate total player count & matches count for this tournament
                const teamIds = resolvedTeams.map((tm: any) => tm.teamId || tm.id || tm._id).filter(Boolean);
                if (teamIds.length > 0) {
                    const [{ count: pCount }, allMatchesData] = await Promise.all([
                        supabase.from('applications').select('id', { count: 'exact', head: true }).in('team_id', teamIds),
                        apiService.getMatches({ tournamentId: currentTournamentId })
                    ]);

                    setTotalPlayersCount(pCount || 0);

                    const teamIdsSet = new Set(teamIds.map(String));
                    const filteredLeagueMatches = (allMatchesData || []).filter((m: any) => {
                        if (m.tournament_id && String(m.tournament_id) === String(currentTournamentId)) return true;
                        if (m.league_id && String(m.league_id) === String(currentTournamentId)) return true;
                        const homeId = String(m.home_team_id || m.homeTeam?.id || m.homeTeamId);
                        const awayId = String(m.away_team_id || m.awayTeam?.id || m.awayTeamId);
                        return teamIdsSet.has(homeId) || teamIdsSet.has(awayId);
                    });

                    setMatches(filteredLeagueMatches);

                    // Set 2 latest matches specifically belonging to THIS tournament league!
                    const finishedLeagueMatches = filteredLeagueMatches.filter((m: any) => m.status === 'finished' || m.status === 'completed');
                    setLatestMatches(finishedLeagueMatches.length > 0 ? finishedLeagueMatches.slice(0, 2) : filteredLeagueMatches.slice(0, 2));
                } else {
                    setTotalPlayersCount(0);
                    setMatches([]);
                    setLatestMatches([]);
                }

                if (t?.leagueId) {
                    const allTournaments = await apiService.getTournaments(1, 100, t.leagueId);
                    setAvailableTournaments(allTournaments || []);
                }
            } catch (error) {
                console.error('Error fetching tournament details:', error);
            } finally {
                setIsLoading(false);
            }
        };
        init();
    }, [currentTournamentId]);

    // 2. Fetch Players specifically for this tournament's teams
    const fetchTournamentPlayers = async () => {
        setIsLoadingPlayers(true);
        try {
            const teamIds = (teams && teams.length > 0 ? teams : standings).map((t: any) => t.teamId || t.id || t._id).filter(Boolean);
            if (teamIds.length > 0) {
                const { data: rawPlayers } = await supabase
                    .from('applications')
                    .select('*')
                    .in('team_id', teamIds);

                const playersList = rawPlayers || [];
                const playerIds = playersList.map((p: any) => p.id);

                let eventsMap: Record<string, any> = {};
                if (playerIds.length > 0) {
                    const { data: eventsData } = await supabase
                        .from('match_events')
                        .select('*')
                        .in('player_id', playerIds);

                    (eventsData || []).forEach((e: any) => {
                        const pid = String(e.player_id);
                        if (!eventsMap[pid]) {
                            eventsMap[pid] = { goals: 0, assists: 0, yellowCards: 0, redCards: 0, matchesPlayed: 0 };
                        }
                        const type = String(e.event_type || '').toLowerCase();
                        if (type === 'goal') eventsMap[pid].goals += 1;
                        else if (type === 'assist') eventsMap[pid].assists += 1;
                        else if (type.includes('yellow')) eventsMap[pid].yellowCards += 1;
                        else if (type.includes('red')) eventsMap[pid].redCards += 1;
                    });
                }

                const teamsMap: Record<string, string> = {};
                (teams || standings || []).forEach((t: any) => {
                    const tid = String(t.teamId || t.id || t._id);
                    teamsMap[tid] = t.name || t.teamName || 'Jamoa';
                });

                const processedPlayers = playersList.map((p: any) => {
                    const pid = String(p.id);
                    const st = eventsMap[pid] || { goals: 0, assists: 0, yellowCards: 0, redCards: 0, matchesPlayed: 0 };
                    return {
                        ...p,
                        _id: p.id,
                        id: p.id,
                        firstName: p.first_name || p.firstName || p.name || 'O\'yinchi',
                        lastName: p.last_name || p.lastName || '',
                        photo: p.photo_url || p.photo || '',
                        teamName: teamsMap[String(p.team_id)] || 'Jamoa',
                        goals: st.goals,
                        assists: st.assists,
                        yellowCards: st.yellowCards,
                        redCards: st.redCards,
                        matchesPlayed: st.matchesPlayed || (st.goals + st.assists > 0 ? 1 : 0),
                        stats: st
                    };
                });

                setTopPlayers(processedPlayers);
            } else {
                setTopPlayers([]);
            }
        } catch (err) {
            console.error('Error fetching league players:', err);
        } finally {
            setIsLoadingPlayers(false);
        }
    };

    // 3. Fetch Matches specifically for this tournament
    const fetchTournamentMatches = async () => {
        setIsLoadingMatches(true);
        try {
            const teamIdsSet = new Set((teams && teams.length > 0 ? teams : standings).map((t: any) => String(t.teamId || t.id || t._id)));
            const matchesData = await apiService.getMatches({ tournamentId: currentTournamentId });

            const filteredLeagueMatches = (matchesData || []).filter((m: any) => {
                if (m.tournament_id && String(m.tournament_id) === String(currentTournamentId)) return true;
                if (m.league_id && String(m.league_id) === String(currentTournamentId)) return true;
                const homeId = String(m.home_team_id || m.homeTeam?.id || m.homeTeamId);
                const awayId = String(m.away_team_id || m.awayTeam?.id || m.awayTeamId);
                return teamIdsSet.has(homeId) || teamIdsSet.has(awayId);
            });

            setMatches(filteredLeagueMatches);
        } catch (err) {
            console.error('Error fetching league matches:', err);
        } finally {
            setIsLoadingMatches(false);
        }
    };

    // Lazy Loading Tab Handler
    useEffect(() => {
        if (!currentTournamentId) return;

        if (activeTab === 'players') {
            fetchTournamentPlayers();
        } else if (activeTab === 'matches') {
            fetchTournamentMatches();
        }
    }, [activeTab, currentTournamentId]);

    const formatDate = (dateString?: string) => {
        if (!dateString) return 'Belgilanmagan';
        try {
            return new Date(dateString).toLocaleDateString('uz-UZ', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            });
        } catch (e) {
            return dateString;
        }
    };

    const getFilteredData = () => {
        const query = searchQuery.toLowerCase().trim();
        
        let sortedPlayers = [...topPlayers].sort((a, b) => {
            const valA = a[statFilter] ?? a.stats?.[statFilter] ?? 0;
            const valB = b[statFilter] ?? b.stats?.[statFilter] ?? 0;
            return valB - valA;
        });

        if (!query) {
            return { standings, topPlayers: sortedPlayers, matches };
        }

        return {
            standings: standings.filter(s => s.name?.toLowerCase().includes(query)),
            topPlayers: sortedPlayers.filter(p => 
                `${p.firstName} ${p.lastName}`.toLowerCase().includes(query) || 
                p.teamName?.toLowerCase().includes(query)
            ),
            matches: matches.filter(m => 
                m.homeTeam?.name?.toLowerCase().includes(query) || 
                m.awayTeam?.name?.toLowerCase().includes(query) ||
                m.venue?.toLowerCase().includes(query)
            )
        };
    };

    const { standings: filteredStandings, topPlayers: filteredPlayers, matches: filteredMatches } = getFilteredData();

    const renderHeader = () => {
        const dropdownHeight = seasonAnimationValue.interpolate({
            inputRange: [0, 1],
            outputRange: [0, Math.min(availableTournaments.length * 50, 200)]
        });

        const dropdownOpacity = seasonAnimationValue.interpolate({
            inputRange: [0, 0.5, 1],
            outputRange: [0, 0, 1]
        });

        return (
            <View style={{ zIndex: 1000 }}>
                <View style={styles.header}>
                    <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
                    <View style={{ flexDirection: 'row', alignItems: 'center', width: '100%', paddingHorizontal: 16, paddingVertical: 12 }}>
                        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                            <Ionicons name="arrow-back" size={24} color="#FFF" />
                        </TouchableOpacity>
                        <Text style={styles.headerTitle} numberOfLines={1}>
                            {tournamentData?.name?.toUpperCase() || tournamentName?.toUpperCase() || 'TURNIR'}
                        </Text>
                        <TouchableOpacity 
                            style={styles.seasonBadge} 
                            onPress={toggleSeasonSelector}
                            activeOpacity={0.7}
                        >
                            <Text style={styles.seasonText}>{(tournamentData?.season || 'MAVSUM').toUpperCase()}</Text>
                            {availableTournaments.length > 1 && (
                                <Ionicons name={isSeasonSelectorOpen ? "chevron-up" : "chevron-down"} size={14} color="#000" />
                            )}
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Season Dropdown with Glass Effect */}
                {availableTournaments.length > 1 && (
                    <Animated.View style={[styles.seasonDropdown, { maxHeight: dropdownHeight, opacity: dropdownOpacity }]}>
                        <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />
                        <ScrollView nestedScrollEnabled>
                             {availableTournaments.map((t) => (
                                <TouchableOpacity 
                                    key={t._id} 
                                    style={[styles.seasonItem, t._id === currentTournamentId && styles.activeSeasonItem]}
                                    onPress={() => {
                                        if (t._id !== currentTournamentId) {
                                            setIsSeasonSelectorOpen(false);
                                            navigation.replace('TournamentDetail', { 
                                                tournamentId: t._id, 
                                                tournamentName: t.name, 
                                                tournament: t 
                                            });
                                        }
                                    }}
                                >
                                    <View style={{ flex: 1 }}>
                                      <Text style={[styles.seasonItemText, t._id === currentTournamentId && styles.activeSeasonItemText]}>
                                          {t.season?.toUpperCase() || t.name?.toUpperCase() || 'NOMA\'LUM MAVSUM'}
                                      </Text>
                                      {t.season && (
                                        <Text style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', fontWeight: 'bold' }}>
                                          {t.name?.toUpperCase()}
                                        </Text>
                                      )}
                                    </View>
                                    {t._id === currentTournamentId && (
                                        <Ionicons name="checkmark-sharp" size={16} color={Colors.primary} />
                                    )}
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </Animated.View>
                )}
            </View>
        );
    };

    const renderTabs = () => (
        <View style={styles.tabsContainer}>
            <BlurView intensity={10} tint="dark" style={StyleSheet.absoluteFill} />
            <View style={styles.fixedTabsRow}>
                {['overview', 'standings', 'players', 'matches'].map((tab) => (
                    <TouchableOpacity
                        key={tab}
                        style={[styles.tab, activeTab === tab && styles.activeTab]}
                        onPress={() => setActiveTab(tab)}
                        activeOpacity={0.8}
                    >
                        <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]} numberOfLines={1}>
                            {tab === 'overview' ? 'OBZOR' :
                                tab === 'standings' ? 'JADVAL' :
                                    tab === 'players' ? 'O\'YINCHILAR' : 'O\'YINLAR'}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>
        </View>
    );

    const renderOverview = () => (
        <ScrollView style={styles.tabContent} contentContainerStyle={{ paddingBottom: 110 }}>
            {/* Information Card */}
            <View style={styles.sectionCard}>
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>MA'LUMOTLAR</Text>
                </View>

                <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Boshlanish sanasi</Text>
                    <View style={styles.dashedLine} />
                    <Text style={styles.infoValue}>{formatDate(tournamentData?.startDate)}</Text>
                </View>

                <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Tugash sanasi</Text>
                    <View style={styles.dashedLine} />
                    <Text style={styles.infoValue}>{formatDate(tournamentData?.endDate)}</Text>
                </View>

                <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Holati</Text>
                    <View style={styles.dashedLine} />
                    <View style={styles.statusRow}>
                        <Text style={styles.infoValue}>
                            {tournamentData?.status === 'ongoing' ? 'Ketyapti' : 
                             tournamentData?.status === 'finished' ? 'Yakunlangan' : 'Rejalashtirilgan'}
                        </Text>
                        <View style={[styles.statusDot, { backgroundColor: tournamentData?.status === 'ongoing' ? '#00FF66' : '#6A7185' }]} />
                    </View>
                </View>

                <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Jamoalar</Text>
                    <View style={styles.dashedLine} />
                    <Text style={styles.infoValue}>{teams?.length || standings?.length || 0}</Text>
                </View>

                <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>O'yinchilar count</Text>
                    <View style={styles.dashedLine} />
                    <Text style={styles.infoValue}>{totalPlayersCount || (topPlayers.length > 0 ? topPlayers.length : 0)} ta</Text>
                </View>

                <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>O'yinlar count</Text>
                    <View style={styles.dashedLine} />
                    <Text style={styles.infoValue}>
                        {matches.filter(m => m.status === 'finished').length} / {matches.length || 0}
                    </Text>
                </View>
            </View>

            {/* Real Organizers Card */}
            <View style={styles.sectionCard}>
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>TASHKILOTCHILAR</Text>
                </View>

                <View style={styles.organizerRow}>
                    <View style={styles.organizerLogoBox}>
                        {organizerInfo.logo ? (
                            <SmartImage uri={organizerInfo.logo} style={{ width: 50, height: 44 }} contentFit="contain" fallbackIcon="business" />
                        ) : (
                            <Ionicons name="business" size={26} color={Colors.primary} />
                        )}
                    </View>
                    <View style={styles.organizerInfoTextCol}>
                        <Text style={styles.organizerName}>{(organizerInfo.name || 'HFL SPORT TASHKILOTI').toUpperCase()}</Text>
                        <Text style={styles.organizerRole}>MAS'UL RASMIY TASHKILOTCHI</Text>
                    </View>
                    {organizerInfo.phone ? (
                        <TouchableOpacity 
                            style={styles.phoneBtn} 
                            onPress={() => Linking.openURL(`tel:${organizerInfo.phone}`)}
                        >
                            <Ionicons name="call" size={20} color={Colors.primary} />
                        </TouchableOpacity>
                    ) : null}
                </View>
            </View>

            {/* Latest Matches Card */}
            {latestMatches.length > 0 && (
                <View style={styles.sectionCard}>
                    <View style={{ paddingTop: 12 }}>
                        {latestMatches.slice(0, 2).map((match) => (
                            <TouchableOpacity
                                key={match._id}
                                style={styles.matchCardFull}
                                onPress={() => navigation.navigate('MatchDetail', { matchData: match })}
                            >
                                <BlurView intensity={15} tint="dark" style={StyleSheet.absoluteFill} />
                                <View style={{ padding: 16 }}>
                                    <View style={styles.matchMetaRowFull}>
                                        <Text style={styles.matchMetaText}>{(match.tourNumber || 'O\'YIN').toUpperCase()}</Text>
                                        <Text style={styles.matchMetaText}>{match.date || match.scheduledAt}</Text>
                                    </View>

                                    <View style={styles.matchTeamsRowFull}>
                                        <Text style={styles.teamShortFull}>{getTeamAbbreviation(match.homeTeam?.name || 'HME')}</Text>
                                        <View style={styles.logoCircleSmall}>
                                            {match.homeTeam?.logo ? (
                                                <Image source={{ uri: match.homeTeam.logo }} style={{ width: 34, height: 34, borderRadius: 17 }} />
                                            ) : (
                                                <Ionicons name="shield" size={24} color={Colors.primary} />
                                            )}
                                        </View>
                                        <Text style={styles.scoreTextFull}>
                                            {match.status === 'scheduled' ? '- : -' : `${match.score?.home ?? 0} : ${match.score?.away ?? 0}`}
                                        </Text>
                                        <View style={styles.logoCircleSmall}>
                                            {match.awayTeam?.logo ? (
                                                <Image source={{ uri: match.awayTeam.logo }} style={{ width: 34, height: 34, borderRadius: 17 }} />
                                            ) : (
                                                <Ionicons name="shield" size={24} color={Colors.primary} />
                                            )}
                                        </View>
                                        <Text style={styles.teamShortFull}>{getTeamAbbreviation(match.awayTeam?.name || 'AWY')}</Text>
                                    </View>

                                    <View style={styles.stadiumRowFull}>
                                        <Ionicons name="location-outline" size={12} color={Colors.textMuted} />
                                        <Text style={styles.stadiumTextFull}>{match.location || 'Amatora Arena'}</Text>
                                    </View>
                                </View>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>
            )}
        </ScrollView>
    );

    {/* Standings Table matching the exact screenshot design! */}
    const renderStandings = () => (
        <View style={styles.tabContent}>
            <View style={styles.searchContainer}>
                <Ionicons name="search" size={20} color={Colors.textMuted} style={styles.searchIcon} />
                <TextInput
                    style={styles.searchInput}
                    placeholder="QIDIRISH..."
                    placeholderTextColor={Colors.textMuted}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                />
            </View>

            {isLoadingStandings ? (
                <TableSkeleton />
            ) : (
                <View style={styles.screenshotCardWrapper}>
                    <BlurView intensity={25} tint="dark" style={StyleSheet.absoluteFill} />
                    
                    {/* Header Columns matching exact screenshot */}
                    <View style={styles.screenshotTableHeader}>
                        <Text style={styles.screenshotHeaderPos}>#</Text>
                        <Text style={styles.screenshotHeaderTeam}>JAMOA</Text>
                        <Text style={styles.screenshotHeaderPlayed}>O'</Text>
                        <Text style={styles.screenshotHeaderGd}>T/N</Text>
                        <Text style={styles.screenshotHeaderPoints}>O</Text>
                    </View>

                    <ScrollView contentContainerStyle={{ paddingBottom: 110 }} showsVerticalScrollIndicator={false}>
                        {filteredStandings.length === 0 ? (
                            <View style={styles.empty}>
                                <Text style={styles.emptyText}>MA'LUMOT TOPILMADI</Text>
                            </View>
                        ) : (
                            filteredStandings.map((team, index) => {
                                const s = team.stats || {};
                                const gf = team.goalsFor ?? s.goalsFor ?? team.gf ?? 0;
                                const ga = team.goalsAgainst ?? s.goalsAgainst ?? team.ga ?? 0;
                                const gd = team.goalDifference ?? s.goalDifference ?? team.gd ?? (gf - ga);
                                const points = team.points ?? s.points ?? team.pts ?? 0;
                                const played = team.played ?? s.played ?? team.matchesPlayed ?? s.matchesPlayed ?? 0;

                                return (
                                    <TouchableOpacity 
                                        key={team.teamId || team.id || team._id || index} 
                                        style={styles.screenshotRow}
                                        onPress={() => navigation.navigate('TeamProfile', { team: team, teamId: team.teamId || team.id || team._id })}
                                        activeOpacity={0.7}
                                    >
                                        {index === 0 ? (
                                            <View style={{ width: 32, alignItems: 'center', justifyContent: 'center' }}>
                                                <FontAwesome5 name="medal" size={18} color="#FFD700" />
                                            </View>
                                        ) : index === 1 ? (
                                            <View style={{ width: 32, alignItems: 'center', justifyContent: 'center' }}>
                                                <FontAwesome5 name="medal" size={18} color="#C0C0C0" />
                                            </View>
                                        ) : index === 2 ? (
                                            <View style={{ width: 32, alignItems: 'center', justifyContent: 'center' }}>
                                                <FontAwesome5 name="medal" size={18} color="#CD7F32" />
                                            </View>
                                        ) : (
                                            <Text style={styles.screenshotPos}>{index + 1}</Text>
                                        )}
                                        
                                        <View style={styles.screenshotTeamCol}>
                                            <View style={styles.screenshotLogoCircle}>
                                                {team.logo || team.logo_url ? (
                                                    <Image source={{ uri: team.logo || team.logo_url }} style={styles.screenshotLogoImg} />
                                                ) : (
                                                    <Ionicons name="shield-outline" size={16} color="rgba(255,255,255,0.4)" />
                                                )}
                                            </View>
                                            <Text style={styles.screenshotTeamName} numberOfLines={1}>{(team.name || 'JAMOA').toUpperCase()}</Text>
                                        </View>
                                        
                                        <Text style={styles.screenshotStatPlayed}>{played}</Text>
                                        <Text style={styles.screenshotStatGd}>{gd}</Text>
                                        <Text style={styles.screenshotStatPoints}>{points}</Text>
                                    </TouchableOpacity>
                                );
                            })
                        )}
                    </ScrollView>
                </View>
            )}
        </View>
    );

    const renderPlayers = () => {
        const statOptions = [
            { id: 'goals', label: 'GOLLAR', icon: 'football' },
            { id: 'assists', label: 'ASISTLAR', icon: 'people' },
            { id: 'yellowCards', label: 'SARIQ KARTALAR', icon: 'square', color: '#FFD700' },
            { id: 'redCards', label: 'QIZIL KARTALAR', icon: 'square', color: '#FF0000' },
            { id: 'matchesPlayed', label: 'O\'YINLAR', icon: 'calendar' },
        ];

        const activeOption = statOptions.find(opt => opt.id === statFilter) || statOptions[0];

        const dropdownHeight = statAnimationValue.interpolate({
            inputRange: [0, 1],
            outputRange: [0, 250]
        });

        const dropdownOpacity = statAnimationValue.interpolate({
            inputRange: [0, 0.5, 1],
            outputRange: [0, 0, 1]
        });

        return (
            <View style={styles.tabContent}>
                <View style={styles.searchContainer}>
                    <Ionicons name="search" size={20} color={Colors.textMuted} style={styles.searchIcon} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="QIDIRISH..."
                        placeholderTextColor={Colors.textMuted}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                </View>

                {/* Stat Filter Selector Dropdown */}
                <View style={styles.statsSelectorContainer}>
                    <TouchableOpacity 
                        style={styles.activeStatBtn} 
                        onPress={toggleStatSelector}
                        activeOpacity={0.8}
                    >
                        <View style={styles.activeStatLeft}>
                            <Ionicons name={activeOption.icon as any} size={18} color={activeOption.color || Colors.primary} />
                            <Text style={styles.activeStatLabel}>{activeOption.label}</Text>
                        </View>
                        <Ionicons 
                            name={isStatSelectorOpen ? "chevron-up" : "chevron-down"} 
                            size={20} 
                            color={Colors.textMuted} 
                        />
                    </TouchableOpacity>

                    <Animated.View style={[styles.statDropdown, { maxHeight: dropdownHeight, opacity: dropdownOpacity, overflow: 'hidden' }]}>
                        {statOptions.map((opt) => (
                            <TouchableOpacity
                                key={opt.id}
                                style={[styles.statOption, statFilter === opt.id && styles.statOptionActive]}
                                onPress={() => handleStatSelect(opt.id)}
                            >
                                <View style={styles.statOptLeft}>
                                    <Ionicons 
                                        name={opt.icon as any} 
                                        size={18} 
                                        color={statFilter === opt.id ? Colors.primary : (opt.color || Colors.textMuted)} 
                                    />
                                    <Text style={[styles.statOptLabel, statFilter === opt.id && styles.statOptLabelActive]}>
                                        {opt.label}
                                    </Text>
                                </View>
                                {statFilter === opt.id && (
                                    <Ionicons name="checkmark-circle" size={18} color={Colors.primary} />
                                )}
                            </TouchableOpacity>
                        ))}
                    </Animated.View>
                </View>

                {isLoadingPlayers ? (
                    <PlayerListSkeleton />
                ) : (
                    <ScrollView contentContainerStyle={{ paddingBottom: 110 }} showsVerticalScrollIndicator={false}>
                        {filteredPlayers.length === 0 ? (
                            <View style={styles.empty}>
                                <Text style={styles.emptyText}>MA'LUMOT TOPILMADI</Text>
                            </View>
                        ) : (
                            filteredPlayers.map((player, index) => {
                                const statValue = player[statFilter] ?? player.stats?.[statFilter] ?? 0;
                                return (
                                    <TouchableOpacity 
                                        key={player._id || player.id || index} 
                                        style={styles.playerRow}
                                        onPress={() => navigation.navigate('PlayerStats', { playerId: player._id || player.id, player: player })}
                                    >
                                        <BlurView intensity={10} tint="dark" style={StyleSheet.absoluteFill} />
                                        <View style={{ flexDirection: 'row', alignItems: 'center', width: '100%', paddingHorizontal: 16, paddingVertical: 12 }}>
                                            {(!['yellowCards', 'redCards'].includes(statFilter) && index === 0) ? (
                                                <View style={{ width: 26, alignItems: 'center', justifyContent: 'center' }}>
                                                    <FontAwesome5 name="medal" size={20} color="#FFD700" />
                                                </View>
                                            ) : (!['yellowCards', 'redCards'].includes(statFilter) && index === 1) ? (
                                                <View style={{ width: 26, alignItems: 'center', justifyContent: 'center' }}>
                                                    <FontAwesome5 name="medal" size={20} color="#C0C0C0" />
                                                </View>
                                            ) : (!['yellowCards', 'redCards'].includes(statFilter) && index === 2) ? (
                                                <View style={{ width: 26, alignItems: 'center', justifyContent: 'center' }}>
                                                    <FontAwesome5 name="medal" size={20} color="#CD7F32" />
                                                </View>
                                            ) : (
                                                <Text style={styles.playerIndex}>{index + 1}</Text>
                                            )}
                                            <View style={styles.playerHexImage}>
                                                {player.photo ? (
                                                    <Image source={{ uri: player.photo }} style={{ width: 40, height: 40, borderRadius: 20 }} />
                                                ) : (
                                                    <Ionicons name="person-circle" size={40} color={Colors.textMuted} />
                                                )}
                                            </View>
                                            <View style={styles.playerInfo}>
                                                <Text style={styles.playerStatName}>{(`${player.firstName || ''} ${player.lastName || ''}`).trim().toUpperCase()}</Text>
                                                <Text style={styles.playerTeamText}>{player.teamName?.toUpperCase() || 'AMATORA'}</Text>
                                            </View>
                                            <View style={styles.playerStatBadge}>
                                                <Text style={styles.playerGoals}>{statValue}</Text>
                                            </View>
                                        </View>
                                    </TouchableOpacity>
                                );
                            })
                        )}
                    </ScrollView>
                )}
            </View>
        );
    };

    const renderMatches = () => (
        <View style={styles.tabContent}>
            <View style={styles.searchContainer}>
                <Ionicons name="search" size={20} color={Colors.textMuted} style={styles.searchIcon} />
                <TextInput
                    style={styles.searchInput}
                    placeholder="QIDIRISH..."
                    placeholderTextColor={Colors.textMuted}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                />
            </View>

            {isLoadingMatches ? (
                <MatchesListSkeleton count={6} />
            ) : (
                <ScrollView contentContainerStyle={{ paddingBottom: 110 }} showsVerticalScrollIndicator={false}>
                    {filteredMatches.length === 0 ? (
                        <View style={styles.empty}>
                            <Text style={styles.emptyText}>Hozircha o'yinlar belgilanmagan</Text>
                        </View>
                    ) : (
                        filteredMatches.map((match) => (
                            <TouchableOpacity
                                key={match._id || match.id}
                                style={styles.matchCardFull}
                                onPress={() => navigation.navigate('MatchDetail', { matchData: match })}
                            >
                                <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
                                <View style={{ padding: 16 }}>
                                    <View style={styles.matchMetaRowFull}>
                                        <Text style={styles.matchMetaText}>{(match.tourNumber || 'O\'YIN').toUpperCase()}</Text>
                                        <Text style={styles.matchMetaText}>{match.date || match.scheduledAt}</Text>
                                    </View>

                                    <View style={styles.matchTeamsRowFull}>
                                        <Text style={styles.teamShortFull}>{getTeamAbbreviation(match.homeTeam?.name || match.homeTeamName || 'HME')}</Text>
                                        <View style={styles.logoCircleSmall}>
                                            {match.homeTeam?.logo || match.homeTeamLogo ? (
                                                <Image source={{ uri: match.homeTeam?.logo || match.homeTeamLogo }} style={{ width: 34, height: 34, borderRadius: 17 }} />
                                            ) : (
                                                <Ionicons name="shield" size={24} color={Colors.primary} />
                                            )}
                                        </View>
                                        <Text style={styles.scoreTextFull}>{match.score?.home ?? 0} : {match.score?.away ?? 0}</Text>
                                        <View style={styles.logoCircleSmall}>
                                            {match.awayTeam?.logo || match.awayTeamLogo ? (
                                                <Image source={{ uri: match.awayTeam?.logo || match.awayTeamLogo }} style={{ width: 34, height: 34, borderRadius: 17 }} />
                                            ) : (
                                                <Ionicons name="shield" size={24} color={Colors.primary} />
                                            )}
                                        </View>
                                        <Text style={styles.teamShortFull}>{getTeamAbbreviation(match.awayTeam?.name || match.awayTeamName || 'AWY')}</Text>
                                    </View>

                                    <View style={styles.stadiumRowFull}>
                                        <Ionicons name="location-outline" size={12} color={Colors.textMuted} />
                                        <Text style={styles.stadiumTextFull}>{match.location || match.venue || 'Amatora Arena'}</Text>
                                    </View>
                                </View>
                            </TouchableOpacity>
                        ))
                    )}
                </ScrollView>
            )}
        </View>
    );

    return (
        <AnimatedBackground overlayOpacity={0.85} backgroundImage={backgroundImage}>
            <SafeAreaView style={styles.container} edges={['top']}>
                {renderHeader()}
                {renderTabs()}

                {isLoading ? (
                    <TournamentDetailSkeleton />
                ) : (
                    activeTab === 'overview' ? renderOverview() :
                    activeTab === 'standings' ? renderStandings() :
                    activeTab === 'players' ? renderPlayers() :
                    renderMatches()
                )}
            </SafeAreaView>
        </AnimatedBackground>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: 'transparent' },
    header: { overflow: 'hidden' },
    backButton: { marginRight: 12 },
    headerTitle: { flex: 1, color: '#FFF', fontSize: 18, fontWeight: '900', fontStyle: 'italic' },
    seasonBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.primary, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, gap: 4 },
    seasonText: { color: '#000', fontSize: 11, fontWeight: '900' },
    seasonDropdown: { marginHorizontal: 16, marginTop: 4, borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    seasonItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
    activeSeasonItem: { backgroundColor: 'rgba(0,255,102,0.1)' },
    seasonItemText: { color: '#FFF', fontSize: 13, fontWeight: '700' },
    activeSeasonItemText: { color: Colors.primary, fontWeight: '900' },
    tabsContainer: { paddingVertical: 8, marginVertical: 10, overflow: 'hidden', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)', paddingHorizontal: 12 },
    fixedTabsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6 },
    tab: { flex: 1, paddingVertical: 9, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center' },
    activeTab: { backgroundColor: Colors.primary, borderColor: Colors.primary },
    tabText: { color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: '900', letterSpacing: 0.3 },
    activeTabText: { color: '#000' },
    tabContent: { flex: 1 },
    sectionCard: { marginHorizontal: 16, marginBottom: 15, padding: 18, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', overflow: 'hidden' },
    sectionHeader: { marginBottom: 14 },
    sectionTitle: { color: Colors.primary, fontSize: 12, fontWeight: '900', letterSpacing: 1 },
    infoRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 8 },
    infoLabel: { color: 'rgba(255,255,255,0.6)', fontSize: 13, fontWeight: '700' },
    dashedLine: { flex: 1, height: 1, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', borderStyle: 'dashed', marginHorizontal: 10 },
    infoValue: { color: '#FFF', fontSize: 13, fontWeight: '900' },
    statusRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    statusDot: { width: 8, height: 8, borderRadius: 4 },
    organizerRow: { flexDirection: 'row', alignItems: 'center' },
    organizerLogoBox: { width: 50, height: 44, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    organizerInfoTextCol: { flex: 1 },
    organizerName: { color: '#FFF', fontSize: 14, fontWeight: '900' },
    organizerRole: { color: Colors.primary, fontSize: 10, fontWeight: '800', marginTop: 2 },
    phoneBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(0,255,102,0.1)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(0,255,102,0.2)' },
    searchContainer: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginBottom: 12, paddingHorizontal: 14, height: 44, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
    searchIcon: { marginRight: 10 },
    searchInput: { flex: 1, color: '#FFF', fontSize: 13, fontWeight: '700' },
    
    // Screenshot Standings Card Design
    screenshotCardWrapper: {
        marginHorizontal: 16,
        borderRadius: 24,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
        backgroundColor: 'rgba(15, 20, 32, 0.65)',
        flex: 1,
    },
    screenshotTableHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.08)',
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
    },
    screenshotHeaderPos: {
        width: 32,
        color: '#8A94A6',
        fontSize: 13,
        fontWeight: '900',
        textAlign: 'center',
    },
    screenshotHeaderTeam: {
        flex: 1,
        color: '#8A94A6',
        fontSize: 13,
        fontWeight: '900',
        paddingLeft: 8,
    },
    screenshotHeaderPlayed: {
        width: 40,
        color: '#8A94A6',
        fontSize: 13,
        fontWeight: '900',
        textAlign: 'center',
    },
    screenshotHeaderGd: {
        width: 50,
        color: '#8A94A6',
        fontSize: 13,
        fontWeight: '900',
        textAlign: 'center',
    },
    screenshotHeaderPoints: {
        width: 40,
        color: '#8A94A6',
        fontSize: 13,
        fontWeight: '900',
        textAlign: 'right',
        paddingRight: 6,
    },
    screenshotRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 13,
        borderBottomWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.04)',
    },
    screenshotPos: {
        width: 32,
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '900',
        textAlign: 'center',
    },
    screenshotTeamCol: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        paddingLeft: 8,
    },
    screenshotLogoCircle: {
        width: 30,
        height: 30,
        borderRadius: 15,
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 10,
        overflow: 'hidden',
    },
    screenshotLogoImg: {
        width: 30,
        height: 30,
        borderRadius: 15,
    },
    screenshotTeamName: {
        color: '#FFFFFF',
        fontSize: 13,
        fontWeight: '900',
        letterSpacing: 0.3,
        flex: 1,
    },
    screenshotStatPlayed: {
        width: 40,
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '900',
        textAlign: 'center',
    },
    screenshotStatGd: {
        width: 50,
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '900',
        textAlign: 'center',
    },
    screenshotStatPoints: {
        width: 40,
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '900',
        textAlign: 'right',
        paddingRight: 6,
    },

    // Stat Dropdown & Players List
    statsSelectorContainer: { marginHorizontal: 16, marginBottom: 12, zIndex: 100 },
    activeStatBtn: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, height: 44, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
    activeStatLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    activeStatLabel: { color: '#FFF', fontSize: 13, fontWeight: '900' },
    statDropdown: { borderRadius: 14, backgroundColor: 'rgba(15,20,32,0.95)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', marginTop: 4 },
    statOption: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.04)' },
    statOptionActive: { backgroundColor: 'rgba(0,255,102,0.1)' },
    statOptLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    statOptLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: '700' },
    statOptLabelActive: { color: Colors.primary, fontWeight: '900' },
    playerRow: { marginHorizontal: 16, marginBottom: 8, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', backgroundColor: 'rgba(255,255,255,0.02)' },
    playerIndex: { color: '#FFF', fontSize: 14, fontWeight: '900', width: 24 },
    playerHexImage: { marginRight: 12 },
    playerInfo: { flex: 1 },
    playerStatName: { color: '#FFF', fontSize: 14, fontWeight: '900' },
    playerTeamText: { color: Colors.primary, fontSize: 10, fontWeight: '800', marginTop: 2 },
    playerStatBadge: { backgroundColor: 'rgba(0,255,102,0.15)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(0,255,102,0.3)' },
    playerGoals: { color: '#00FF66', fontSize: 14, fontWeight: '900' },

    // Matches List
    matchCardFull: { marginHorizontal: 16, marginBottom: 12, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', backgroundColor: 'rgba(255,255,255,0.03)' },
    matchMetaRowFull: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
    matchMetaText: { color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: '700' },
    matchTeamsRowFull: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
    teamShortFull: { color: '#FFF', fontSize: 16, fontWeight: '900', width: 60, textAlign: 'center' },
    scoreTextFull: { color: Colors.primary, fontSize: 22, fontWeight: '900', marginHorizontal: 10 },
    stadiumRowFull: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
    stadiumTextFull: { color: 'rgba(255,255,255,0.5)', fontSize: 11, marginLeft: 6 },
    logoCircleSmall: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.05)', justifyContent: 'center', alignItems: 'center', marginHorizontal: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
    empty: { alignItems: 'center', marginTop: 60, paddingHorizontal: 20 },
    emptyText: { color: Colors.textMuted, fontSize: 14, fontWeight: '700', textAlign: 'center' },
});
