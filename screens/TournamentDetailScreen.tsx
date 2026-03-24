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
import { Video, ResizeMode } from 'expo-av';
import { BlurView } from 'expo-blur';
import VideoBackground from '../components/VideoBackground';

import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../constants/Colors';
import { useTeamStore } from '../store/useTeamStore';
import { apiService } from '../services/apiService';
import { Team } from '../types';
import TournamentDetailSkeleton from '../components/TournamentDetailSkeleton';
import TableSkeleton from '../components/TableSkeleton';
import PlayerListSkeleton from '../components/PlayerListSkeleton';
import MatchesListSkeleton from '../components/MatchesListSkeleton';
import GenericListSkeleton from '../components/GenericListSkeleton';
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

    // 1. Initial Load: Fetch only the basic tournament details
    useEffect(() => {
        const init = async () => {
            setIsLoading(true);
            try {
                // Fetch basic info + small batch of matches for Overview
                const [t, lMatches] = await Promise.all([
                    apiService.getTournamentById(tournamentId),
                    apiService.getMatches({ tournamentId, limit: 3, status: 'finished' })
                ]);
                
                setTournamentData(t);
                setLatestMatches(lMatches || []);
                if (t?.standings) {
                    setStandings(t.standings);
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

    // 2. Lazy Loading: Fetch tab data only when needed
    useEffect(() => {
        const fetchTabData = async () => {
            if (!currentTournamentId) return;

            if (activeTab === 'standings' && standings.length === 0) {
                setIsLoadingStandings(true);
                try {
                    const teamsData = await apiService.getTeams(1, 100, currentTournamentId);
                    setTeams(teamsData || []);
                    // Some backends return standings inside tournament, some need team fetch
                    // If standings were empty from tournament fetch, we use team list
                } finally {
                    setIsLoadingStandings(false);
                }
            } else if (activeTab === 'players' && topPlayers.length === 0) {
                setIsLoadingPlayers(true);
                try {
                    const playersData = await apiService.getPlayers(1, 10, undefined, currentTournamentId);
                    setTopPlayers(playersData || []);
                } finally {
                    setIsLoadingPlayers(false);
                }
            } else if (activeTab === 'matches' && matches.length === 0) {
                setIsLoadingMatches(true);
                try {
                    const matchesData = await apiService.getMatches({ tournamentId: currentTournamentId });
                    setMatches(matchesData || []);
                } finally {
                    setIsLoadingMatches(false);
                }
            }
        };
        fetchTabData();
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
            const valA = a[statFilter] || a.stats?.[statFilter] || 0;
            const valB = b[statFilter] || b.stats?.[statFilter] || 0;
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
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {['overview', 'standings', 'players', 'matches'].map((tab) => (
                    <TouchableOpacity
                        key={tab}
                        style={[styles.tab, activeTab === tab && styles.activeTab]}
                        onPress={() => setActiveTab(tab)}
                    >
                        <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
                            {tab === 'overview' ? 'OBZOR' :
                                tab === 'standings' ? 'JADVAL' :
                                    tab === 'players' ? 'O\'YINCHILAR' : 'O\'YINLAR'}
                        </Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>
        </View>
    );

    const renderOverview = () => (
        <ScrollView style={styles.tabContent} contentContainerStyle={{ paddingBottom: 100 }}>
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
                    <Text style={styles.infoValue}>{teams?.length || 0}</Text>
                </View>

                <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>O'yinlar count</Text>
                    <View style={styles.dashedLine} />
                    <Text style={styles.infoValue}>
                        {matches.filter(m => m.status === 'finished').length} / {matches.length}
                    </Text>
                </View>
            </View>

            {/* Organizers Card */}
            <View style={styles.sectionCard}>
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>TASHKILOTCHILAR</Text>
                </View>

                <View style={styles.organizerRow}>
                    <View style={styles.organizerLogo}>
                        <Ionicons name="business" size={24} color={Colors.primary} />
                    </View>
                    <View style={styles.organizerInfo}>
                        <Text style={styles.organizerName}>{(tournamentData?.organizer || 'AMATORA ADMIN').toUpperCase()}</Text>
                        <Text style={styles.organizerRole}>MAS'UL TASHKILOTCHI</Text>
                    </View>
                    {tournamentData?.organizerPhone && (
                        <TouchableOpacity 
                            style={styles.phoneBtn} 
                            onPress={() => Linking.openURL(`tel:${tournamentData.organizerPhone}`)}
                        >
                            <Ionicons name="call" size={20} color={Colors.primary} />
                        </TouchableOpacity>
                    )}
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

            <View style={styles.tableHeaderRow}>
                <Text style={[styles.tableHeaderText, styles.colPos]}>#</Text>
                <Text style={[styles.tableHeaderText, styles.colTeamHeader]}>JAMOA</Text>
                <Text style={[styles.tableHeaderText, styles.colStat]}>O'</Text>
                <Text style={[styles.tableHeaderText, styles.colStatWide]}>G'-D-M</Text>
                <Text style={[styles.tableHeaderText, styles.colStatWide]}>G-P</Text>
                <Text style={[styles.tableHeaderText, styles.colStatPts, { textAlign: 'right', paddingRight: 10 }]}>O</Text>
            </View>

            {isLoadingStandings ? (
                <TableSkeleton count={10} />
            ) : (
                <ScrollView>
                {filteredStandings.length === 0 ? (
                    <View style={styles.empty}>
                        <Text style={styles.emptyText}>MA'LUMOT TOPILMADI</Text>
                    </View>
                ) : (
                    filteredStandings.map((team, index) => {
                        const s = team.stats || {};
                        const wins = team.wins || s.wins || team.won || s.won || 0;
                        const draws = team.draws || s.draws || team.drawn || s.drawn || 0;
                        const losses = team.losses || s.losses || team.lost || s.lost || 0;
                        const gf = team.goalsFor || s.goalsFor || 0;
                        const ga = team.goalsAgainst || s.goalsAgainst || 0;
                        const gd = gf - ga;
                        const points = team.points || s.points || 0;
                        const played = team.played || s.played || 0;
                        
                        return (
                            <TouchableOpacity 
                                key={team.teamId || index} 
                                style={[styles.tableRow, index % 2 === 0 && { backgroundColor: 'rgba(255,255,255,0.02)' }]}
                                onPress={() => navigation.navigate('TeamProfile', { team: team, teamId: team.teamId })}
                            >
                                <Text style={[styles.posText, index < 3 && { color: Colors.primary }]}>{index + 1}</Text>
                                <View style={styles.colTeam}>
                                    <View style={styles.logoWrapperContainer}>
                                        {team.logo ? (
                                            <Image source={{ uri: team.logo }} style={styles.miniLogoStandings} />
                                        ) : (
                                            <Ionicons name="shield-outline" size={18} color="#6A7185" />
                                        )}
                                    </View>
                                    <Text style={styles.teamNameText} numberOfLines={1}>{team.name?.toUpperCase()}</Text>
                                </View>
                                <Text style={[styles.statCellText, styles.colStat]}>{played}</Text>
                                <Text style={[styles.statCellText, styles.colStatWide, { fontSize: 11 }]}>
                                    {wins}-{draws}-{losses}
                                </Text>
                                <View style={[styles.colStatWide, { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }]}>
                                    <Text style={[styles.statCellText, { color: '#fff' }]}>{gf}-{ga}</Text>
                                    <View style={{ height: 16, justifyContent: 'flex-start' }}>
                                        <Text style={{ 
                                            fontSize: 8, 
                                            color: gd >= 0 ? Colors.primary : '#ff4d4d',
                                            fontWeight: '900',
                                            marginLeft: 2,
                                            marginTop: -4
                                        }}>
                                            {gd >= 0 ? `+${gd}` : gd}
                                        </Text>
                                    </View>
                                </View>
                                <Text style={[styles.statCellText, styles.colStatPts, styles.ptsText, { textAlign: 'right', paddingRight: 10 }]}>
                                    {points}
                                </Text>
                            </TouchableOpacity>
                        );
                    })
                )}
            </ScrollView>
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
            outputRange: [0, 250] // Adjust based on content
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

                {/* Custom Stat Selector */}
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
                    <PlayerListSkeleton count={8} />
                ) : (
                    <ScrollView>
                    {filteredPlayers.length === 0 ? (
                        <View style={styles.empty}>
                            <Text style={styles.emptyText}>MA'LUMOT TOPILMADI</Text>
                        </View>
                    ) : (
                        filteredPlayers.map((player, index) => {
                            const statValue = player[statFilter] || player.stats?.[statFilter] || 0;
                            return (
                                <TouchableOpacity 
                                    key={player._id} 
                                    style={styles.playerRow}
                                    onPress={() => navigation.navigate('PlayerStats', { playerId: player._id, player: player })}
                                >
                                    <BlurView intensity={10} tint="dark" style={StyleSheet.absoluteFill} />
                                    <View style={{ flexDirection: 'row', alignItems: 'center', width: '100%', paddingHorizontal: 16, paddingVertical: 12 }}>
                                        <Text style={styles.playerIndex}>{index + 1}</Text>
                                        <View style={styles.playerHexImage}>
                                            {player.photo ? (
                                                <Image source={{ uri: player.photo }} style={{ width: 40, height: 40, borderRadius: 20 }} />
                                            ) : (
                                                <Ionicons name="person-circle" size={40} color={Colors.textMuted} />
                                            )}
                                        </View>
                                        <View style={styles.playerInfo}>
                                            <Text style={styles.playerStatName}>{(player.firstName + ' ' + player.lastName).toUpperCase()}</Text>
                                            <Text style={styles.playerTeamText}>{player.teamName?.toUpperCase()}</Text>
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
                    placeholder="Qidirish..."
                    placeholderTextColor={Colors.textMuted}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                />
            </View>

            {isLoadingMatches ? (
                <MatchesListSkeleton count={6} />
            ) : (
                <ScrollView>
                {filteredMatches.length === 0 ? (
                    <View style={styles.empty}>
                        <Text style={styles.emptyText}>Hozircha o'yinlar belgilanmagan</Text>
                    </View>
                ) : (
                    filteredMatches.map((match) => (
                        <TouchableOpacity
                            key={match._id}
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
                                    <Text style={styles.teamShortFull}>{getTeamAbbreviation(match.homeTeam?.name || 'HME')}</Text>
                                    <View style={styles.logoCircleSmall}>
                                        {match.homeTeam?.logo ? (
                                            <Image source={{ uri: match.homeTeam.logo }} style={{ width: 34, height: 34, borderRadius: 17 }} />
                                        ) : (
                                            <Ionicons name="shield" size={24} color={Colors.primary} />
                                        )}
                                    </View>
                                    <Text style={styles.scoreTextFull}>{match.score?.home ?? 0} : {match.score?.away ?? 0}</Text>
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
                                    <Text style={styles.stadiumTextFull}>{match.location || 'HFL Arena'}</Text>
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
        <View style={{ flex: 1, backgroundColor: '#000' }}>
            {/* Cinematic Video Background */}
            <VideoBackground
                source={require('../assets/images/welcomeScreenVideo1.mp4')}
                overlayOpacity={0.85}
                style={StyleSheet.absoluteFill}
            />

            <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
                {renderHeader()}
                {renderTabs()}

                {isLoading ? (
                    <TournamentDetailSkeleton />
                ) : (
                    <>
                        {activeTab === 'overview' && renderOverview()}
                        {activeTab === 'standings' && renderStandings()}
                        {activeTab === 'players' && renderPlayers()}
                        {activeTab === 'matches' && renderMatches()}
                    </>
                )}
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: 'transparent' },
    header: { overflow: 'hidden' }, 
    backButton: { marginRight: 16 },
    headerTitle: { flex: 1, color: '#FFF', fontSize: 18, fontWeight: 'bold' },
    seasonBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.primary, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 4 }, 
    seasonText: { color: '#000', fontWeight: 'bold', marginRight: 4, fontSize: 12 },

    seasonDropdown: {
        position: 'absolute',
        top: 60,
        right: 16,
        width: 200,
        borderRadius: 12,
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        zIndex: 1000,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    seasonItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.05)',
    },
    activeSeasonItem: {
        backgroundColor: 'rgba(0, 255, 102, 0.1)',
    },
    seasonItemText: {
        color: '#6A7185',
        fontSize: 13,
        fontWeight: 'bold',
    },
    activeSeasonItemText: {
        color: '#FFF',
    },

    tabsContainer: { borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)', backgroundColor: 'transparent', overflow: 'hidden' },
    tab: { paddingVertical: 14, paddingHorizontal: 20, borderBottomWidth: 2, borderBottomColor: 'transparent' },
    activeTab: { borderBottomColor: Colors.primary },
    tabText: { color: '#6A7185', fontSize: 14, fontWeight: '600' },
    activeTabText: { color: '#FFF' },

    tabContent: { flex: 1, backgroundColor: 'transparent' },
    tabLoading: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
    loadingText: { color: '#6A7185', fontSize: 12, fontWeight: 'bold', marginTop: 10, letterSpacing: 1 },

    // Overview Styles
    sectionCard: { 
        marginTop: 15, 
        marginHorizontal: 16, 
        backgroundColor: 'rgba(255,255,255,0.03)', 
        borderRadius: 16, 
        borderWidth: 1, 
        borderColor: 'rgba(255,255,255,0.05)',
        overflow: 'hidden'
    },
    sectionHeader: { 
        backgroundColor: 'rgba(255,255,255,0.05)', 
        paddingVertical: 12, 
        paddingHorizontal: 16, 
        borderBottomWidth: 1, 
        borderBottomColor: 'rgba(255,255,255,0.05)' 
    },
    sectionTitle: { color: '#FFF', fontSize: 14, fontWeight: 'bold', letterSpacing: 1 },
    infoRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14 },
    infoLabel: { color: '#FFF', fontSize: 14, fontWeight: '500' },
    dashedLine: { flex: 1, height: 1, borderStyle: 'dashed', borderWidth: 1, borderColor: '#1A2138', marginHorizontal: 10, opacity: 0.5 },
    infoValue: { color: '#FFF', fontSize: 14, fontWeight: 'bold' },
    statusRow: { flexDirection: 'row', alignItems: 'center' },
    statusDot: { width: 8, height: 8, borderRadius: 4, marginLeft: 8 },

    organizerRow: { flexDirection: 'row', alignItems: 'center', padding: 16 },
    organizerLogo: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#1A2138', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    organizerInfo: { flex: 1 },
    organizerName: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
    organizerRole: { color: '#6A7185', fontSize: 13, marginTop: 4 },
    phoneBtn: { padding: 8 },

    // Search Bar
    searchContainer: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)', backgroundColor: 'transparent' },
    searchIcon: { marginRight: 10 },
    searchInput: { flex: 1, color: '#FFF', fontSize: 16 },

    // Stats Selector Styles
    statsSelectorContainer: {
        marginHorizontal: 16,
        marginVertical: 10,
        backgroundColor: 'rgba(255,255,255,0.03)',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
        zIndex: 10,
    },
    activeStatBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    activeStatLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    activeStatLabel: {
        color: '#FFF',
        fontSize: 14,
        fontWeight: 'bold',
        marginLeft: 10,
        letterSpacing: 0.5,
    },
    statDropdown: {
        borderTopWidth: 1,
        borderTopColor: '#1A2138',
    },
    statOption: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(26, 33, 56, 0.5)',
    },
    statOptionActive: {
        backgroundColor: 'rgba(0, 255, 102, 0.05)',
    },
    statOptLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    statOptLabel: {
        color: '#6A7185',
        fontSize: 13,
        fontWeight: 'bold',
        marginLeft: 10,
    },
    statOptLabelActive: {
        color: Colors.primary,
    },
    playerStatBadge: {
        backgroundColor: '#1A2138',
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 4,
        minWidth: 36,
        alignItems: 'center',
    },

    // Standings Table
    tableHeaderRow: { 
        flexDirection: 'row', 
        paddingHorizontal: 16, 
        paddingVertical: 12, 
        borderBottomWidth: 1, 
        borderBottomColor: '#1A2138',
        backgroundColor: 'rgba(26, 33, 56, 0.3)'
    },
    tableHeaderText: { color: '#6A7185', fontSize: 10, fontWeight: '900', textAlign: 'center', letterSpacing: 1 },
    colPos: { width: 30, textAlign: 'center' },
    colTeamHeader: { flex: 1, textAlign: 'left', marginLeft: 10 },
    colTeam: { flex: 1, flexDirection: 'row', alignItems: 'center', marginLeft: 10 },
    colStat: { width: 30, alignItems: 'center' },
    colStatWide: { width: 65, alignItems: 'center' },
    colStatForm: { flex: 2, alignItems: 'center' },
    colStatGd: { flex: 2, alignItems: 'center' },
    colStatPts: { width: 35, alignItems: 'flex-end' },
    tableRow: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        paddingHorizontal: 16, 
        paddingVertical: 12, 
        borderBottomWidth: 1, 
        borderBottomColor: 'rgba(26, 33, 56, 0.5)' 
    },
    posText: { color: '#FFF', fontSize: 13, fontWeight: 'bold', width: 30, textAlign: 'center' },
    logoWrapperContainer: { 
        width: 28, 
        height: 28, 
        justifyContent: 'center', 
        alignItems: 'center',
        marginRight: 10,
        backgroundColor: 'rgba(255,255,255,0.03)',
        borderRadius: 6,
        padding: 2
    },
    miniLogoStandings: { width: 24, height: 24, resizeMode: 'contain' },
    teamNameText: { color: '#FFF', fontSize: 12, fontWeight: '900', letterSpacing: 0.5 },
    statCellText: { color: Colors.textMuted, fontSize: 13, fontWeight: '600', textAlign: 'center' },
    ptsText: { fontWeight: '900', color: Colors.primary },

    // Players List
    playerRow: {
        marginHorizontal: 16,
        marginBottom: 8,
        borderRadius: 12,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.03)',
    },
    playerIndex: { color: '#FFF', fontSize: 14, width: 24 },
    playerHexImage: { marginRight: 12 },
    playerInfo: { flex: 1 },
    playerStatName: { color: '#FFF', fontSize: 15, fontWeight: 'bold', marginBottom: 4 },
    playerTeamRow: { flexDirection: 'row', alignItems: 'center' },
    playerTeamText: { color: '#6A7185', fontSize: 12 },
    playerGoals: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },

    // Matches List
    matchCardFull: {
        marginHorizontal: 16,
        marginBottom: 12,
        borderRadius: 16,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
        backgroundColor: 'rgba(255,255,255,0.03)',
    },
    matchMetaRowFull: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
    matchMetaText: { color: '#6A7185', fontSize: 12 },
    matchTeamsRowFull: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
    teamShortFull: { color: '#FFF', fontSize: 18, fontWeight: 'bold', width: 60, textAlign: 'center' },
    mockLogo: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#1A2138', marginHorizontal: 12 },
    scoreTextFull: { color: '#FFF', fontSize: 24, fontWeight: '900', marginHorizontal: 10, letterSpacing: 2 },
    stadiumRowFull: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
    stadiumTextFull: { color: '#6A7185', fontSize: 12, marginLeft: 6 },

    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    empty: {
        alignItems: 'center',
        marginTop: 60,
        paddingHorizontal: 20,
    },
    emptyText: {
        color: Colors.textMuted,
        marginTop: 12,
        fontSize: 16,
        textAlign: 'center',
    },
    logoCircleSmall: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#1A2138',
        justifyContent: 'center',
        alignItems: 'center',
        marginHorizontal: 10,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    lastPointsContainer: {
        width: 32,
        alignItems: 'center',
        justifyContent: 'center',
    },
    lastPointsText: {
        fontSize: 11,
        fontWeight: 'bold',
        paddingHorizontal: 4,
        paddingVertical: 2,
        borderRadius: 4,
        textAlign: 'center',
        minWidth: 26,
    },
    lastPointsPositive: {
        color: '#00FF66',
        backgroundColor: 'rgba(0, 255, 102, 0.1)',
    },
    lastPointsNegative: {
        color: '#FF3B30',
        backgroundColor: 'rgba(255, 59, 48, 0.1)',
    },
    lastPointsNeutral: {
        color: '#6A7185',
        backgroundColor: 'rgba(106, 113, 133, 0.1)',
    },
});
