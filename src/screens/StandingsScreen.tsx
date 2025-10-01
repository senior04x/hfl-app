import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  ScrollView,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { onSnapshot, collection, query, orderBy, where, getDocs } from 'firebase/firestore';

import { useTheme } from '../store/useThemeStore';
import { TeamStanding, Team, Match, PlayerStats } from '../types';
import { db } from '../services/firebase';

interface League {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  standings: TeamStanding[];
  recentMatches: Match[];
  topPlayers: PlayerStats[];
}

const StandingsScreen = () => {
  const { colors } = useTheme();
  const [leagues, setLeagues] = useState<League[]>([]);
  const [selectedLeague, setSelectedLeague] = useState<League | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchLeagues();
  }, []);

  const fetchLeagues = async () => {
    try {
      setLoading(true);
      console.log('Fetching leagues from Firebase...');
      
      // Liga ma'lumotlarini olish
      const leaguesData: League[] = [
        {
          id: 'hfl-3-liga',
          name: 'HFL 3-liga',
          startDate: '2024-09-01',
          endDate: '2024-12-31',
          standings: [],
          recentMatches: [],
          topPlayers: [],
        },
        {
          id: 'hfl-pro-liga',
          name: 'HFL Pro Liga',
          startDate: '2024-09-01',
          endDate: '2024-12-31',
          standings: [],
          recentMatches: [],
          topPlayers: [],
        },
        {
          id: 'hfl-super-liga',
          name: 'HFL Super Liga',
          startDate: '2024-09-01',
          endDate: '2024-12-31',
          standings: [],
          recentMatches: [],
          topPlayers: [],
        },
        {
          id: 'hfl-chemions-liga',
          name: 'HFL Chempions Liga',
          startDate: '2024-09-01',
          endDate: '2024-12-31',
          standings: [],
          recentMatches: [],
          topPlayers: [],
        },
      ];

      // Har bir liga uchun standings va matches ma'lumotlarini olish
      for (const league of leaguesData) {
        try {
          // Standings ma'lumotlarini olish
          const standingsQuery = query(
            collection(db, 'standings'),
            where('leagueType', '==', league.name),
            orderBy('points', 'desc')
          );
          
          const standingsSnapshot = await getDocs(standingsQuery);
          const standingsData: TeamStanding[] = [];
          standingsSnapshot.forEach((doc) => {
            const data = doc.data();
            standingsData.push({
              teamId: data.teamId || '',
              team: {
                id: data.team?.id || '',
                name: data.team?.name || '',
                logo: data.team?.logo || '',
                color: data.team?.color || '#3B82F6',
                description: data.team?.description || '',
                players: [],
                createdAt: new Date(),
                updatedAt: new Date(),
              },
              matchesPlayed: data.matchesPlayed || 0,
              wins: data.wins || 0,
              draws: data.draws || 0,
              losses: data.losses || 0,
              goalsFor: data.goalsFor || 0,
              goalsAgainst: data.goalsAgainst || 0,
              goalDifference: data.goalDifference || 0,
              points: data.points || 0,
            });
          });

          // Recent matches ma'lumotlarini olish
          const matchesQuery = query(
            collection(db, 'matches'),
            where('leagueType', '==', league.name),
            where('status', '==', 'finished'),
            orderBy('matchDate', 'desc')
          );
          
          const matchesSnapshot = await getDocs(matchesQuery);
          const recentMatches: Match[] = [];
          matchesSnapshot.forEach((doc) => {
            const data = doc.data();
            recentMatches.push({
              id: doc.id,
              homeTeamId: data.homeTeamId || '',
              awayTeamId: data.awayTeamId || '',
              homeTeamName: data.homeTeamName || '',
              awayTeamName: data.awayTeamName || '',
              homeScore: data.homeScore || 0,
              awayScore: data.awayScore || 0,
              matchDate: data.matchDate?.toDate() || new Date(),
              venue: data.venue || '',
              status: data.status || 'scheduled',
              youtubeLink: data.youtubeLink || '',
              leagueType: data.leagueType || '',
            });
          });

          // Top players ma'lumotlarini olish
          const playersQuery = query(
            collection(db, 'playerStats'),
            where('leagueType', '==', league.name),
            orderBy('goals', 'desc')
          );
          
          const playersSnapshot = await getDocs(playersQuery);
          const topPlayers: PlayerStats[] = [];
          playersSnapshot.forEach((doc) => {
            const data = doc.data();
            topPlayers.push({
              id: doc.id,
              playerId: data.playerId || '',
              playerName: data.playerName || '',
              playerPhoto: data.playerPhoto || '',
              teamId: data.teamId || '',
              teamName: data.teamName || '',
              teamLogo: data.teamLogo || '',
              leagueType: data.leagueType || '',
              matchesPlayed: data.matchesPlayed || 0,
              goals: data.goals || 0,
              assists: data.assists || 0,
              yellowCards: data.yellowCards || 0,
              redCards: data.redCards || 0,
              minutesPlayed: data.minutesPlayed || 0,
              createdAt: data.createdAt?.toDate() || new Date(),
              updatedAt: data.updatedAt?.toDate() || new Date(),
            });
          });

          league.standings = standingsData;
          league.recentMatches = recentMatches.slice(0, 5); // Oxirgi 5 ta o'yin
          league.topPlayers = topPlayers.slice(0, 10); // Top 10 o'yinchilar
          
          console.log(`League ${league.name}:`, {
            standings: standingsData.length,
            matches: recentMatches.length,
            players: topPlayers.length
          });
        } catch (error) {
          console.error(`Error fetching data for ${league.name}:`, error);
        }
      }
      
      console.log('Leagues fetched:', leaguesData);
      setLeagues(leaguesData);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching leagues:', error);
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchLeagues();
    setRefreshing(false);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('uz-UZ', { 
      month: 'long', 
      year: 'numeric' 
    });
  };

  const renderLeagueItem = ({ item }: { item: League }) => (
    <TouchableOpacity
      style={[styles.leagueItem, { backgroundColor: colors.surface }]}
      onPress={() => setSelectedLeague(item)}
    >
      <View style={styles.leagueHeader}>
        <Text style={[styles.leagueName, { color: colors.text }]}>
          {item.name}
        </Text>
        <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
      </View>
      <Text style={[styles.leagueDate, { color: colors.textSecondary }]}>
        {formatDate(item.startDate)} - {formatDate(item.endDate)}
      </Text>
      <View style={styles.leagueStats}>
        <Text style={[styles.leagueStat, { color: colors.textSecondary }]}>
          {item.standings.length} jamoa
        </Text>
        <Text style={[styles.leagueStat, { color: colors.textSecondary }]}>
          {item.recentMatches.length} o'yin
        </Text>
      </View>
    </TouchableOpacity>
  );

  const renderLeagueDetail = () => {
    if (!selectedLeague) return null;

    return (
      <View style={styles.leagueDetail}>
        <View style={[styles.leagueDetailHeader, { backgroundColor: colors.header }]}>
          <TouchableOpacity
            onPress={() => setSelectedLeague(null)}
            style={styles.backButton}
          >
            <Ionicons name="chevron-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.leagueDetailTitle, { color: colors.text }]}>
            {selectedLeague.name}
          </Text>
          <View style={[styles.seasonButton, { backgroundColor: colors.primary }]}>
            <Text style={[styles.seasonText, { color: 'white' }]}>2024/25</Text>
            <Ionicons name="chevron-down" size={16} color="white" />
          </View>
        </View>

        {/* Navigation Tabs */}
        <View style={[styles.tabContainer, { backgroundColor: colors.header }]}>
          <TouchableOpacity style={[styles.tab, { borderBottomColor: colors.primary }]}>
            <Text style={[styles.tabText, { color: colors.textSecondary }]}>Overview</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.tab, { borderBottomColor: colors.primary }]}>
            <Text style={[styles.tabText, { color: colors.textSecondary }]}>Standings</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.tab, styles.activeTab, { borderBottomColor: colors.primary }]}>
            <Text style={[styles.tabText, styles.activeTabText, { color: colors.text }]}>Players</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.tab, { borderBottomColor: colors.primary }]}>
            <Text style={[styles.tabText, { color: colors.textSecondary }]}>Games</Text>
          </TouchableOpacity>
        </View>

        {/* Recent Matches */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Oxirgi O'yinlar
          </Text>
          {selectedLeague.recentMatches.map((match, index) => (
            <View key={index} style={[styles.matchItem, { backgroundColor: colors.surface }]}>
              <Text style={[styles.matchText, { color: colors.text }]}>
                {match.homeTeamName} {match.homeScore} - {match.awayScore} {match.awayTeamName}
              </Text>
              <Text style={[styles.matchDate, { color: colors.textSecondary }]}>
                {match.matchDate.toLocaleDateString('uz-UZ')}
              </Text>
            </View>
          ))}
        </View>

        {/* Top Players */}
        <View style={styles.section}>
          <View style={styles.playersHeader}>
            <View style={styles.playersTitleContainer}>
              <Ionicons name="football" size={20} color={colors.primary} />
              <Text style={[styles.playersTitle, { color: colors.text }]}>
                Goals
              </Text>
              <Ionicons name="chevron-down" size={16} color={colors.textSecondary} />
            </View>
          </View>
          {selectedLeague.topPlayers.map((player, index) => (
            <View key={index} style={[styles.playerItem, { backgroundColor: colors.surface }]}>
              <View style={styles.playerRank}>
                <Text style={[styles.playerPosition, { color: colors.text }]}>
                  {index + 1}
                </Text>
              </View>
              <View style={styles.playerInfo}>
                <View style={styles.playerPhoto}>
                  {player.playerPhoto ? (
                    <Image 
                      source={{ uri: player.playerPhoto }} 
                      style={styles.playerImage}
                    />
                  ) : (
                    <View style={[styles.playerImagePlaceholder, { backgroundColor: colors.primary }]}>
                      <Ionicons name="person" size={20} color="white" />
                    </View>
                  )}
                </View>
                <View style={styles.playerDetails}>
                  <Text style={[styles.playerName, { color: colors.text }]}>
                    {player.playerName}
                  </Text>
                  <Text style={[styles.playerTeam, { color: colors.textSecondary }]}>
                    {player.teamName}
                  </Text>
                </View>
              </View>
              <View style={styles.playerStats}>
                <Text style={[styles.playerGoals, { color: colors.primary }]}>
                  {player.goals}
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* Standings */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Turnir Jadvali
          </Text>
          {selectedLeague.standings.map((standing, index) => (
            <View key={index} style={[styles.standingItem, { backgroundColor: colors.surface }]}>
              <Text style={[styles.position, { color: colors.text }]}>
                {index + 1}
              </Text>
              <Text style={[styles.teamName, { color: colors.text }]}>
                {standing.team.name}
              </Text>
              <Text style={[styles.points, { color: colors.primary }]}>
                {standing.points}
              </Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

  const renderStanding = ({ item, index }: { item: TeamStanding; index: number }) => (
    <View style={[styles.standingRow, { backgroundColor: colors.surface }]}>
      <View style={styles.positionContainer}>
        <Text style={[
          styles.position,
          { color: colors.text },
          index < 3 && styles.topThreePosition
        ]}>
          {index + 1}
        </Text>
      </View>
      
      <View style={styles.teamContainer}>
        <View style={[styles.teamColor, { backgroundColor: item.team.color }]} />
        <Text style={[styles.teamName, { color: colors.text }]} numberOfLines={1} ellipsizeMode="tail">
          {item.team.name}
        </Text>
      </View>
      
      <View style={styles.statsContainer}>
        <Text style={[styles.stat, { color: colors.text }]}>{item.matchesPlayed || 0}</Text>
        <Text style={[styles.stat, { color: colors.text }]}>{item.wins || 0}</Text>
        <Text style={[styles.stat, { color: colors.text }]}>{item.draws || 0}</Text>
        <Text style={[styles.stat, { color: colors.text }]}>{item.losses || 0}</Text>
        <Text style={[styles.stat, { color: colors.text }]}>{item.goalsFor || 0}</Text>
        <Text style={[styles.stat, { color: colors.text }]}>{item.goalsAgainst || 0}</Text>
        <Text style={[styles.stat, { color: colors.text }]}>{item.goalDifference || 0}</Text>
        <Text style={[styles.stat, styles.points, { color: colors.primary }]}>{item.points || 0}</Text>
      </View>
    </View>
  );

  const renderHeader = () => (
    <View style={[styles.headerRow, { backgroundColor: colors.primary }]}>
      <View style={styles.positionContainer}>
        <Text style={[styles.headerText, { color: 'white' }]}>#</Text>
      </View>
      
      <View style={styles.teamContainer}>
        <Text style={[styles.headerText, { color: 'white' }]}>Jamoa</Text>
      </View>
      
      <View style={styles.statsContainer}>
        <Text style={[styles.headerText, { color: 'white' }]}>O</Text>
        <Text style={[styles.headerText, { color: 'white' }]}>G</Text>
        <Text style={[styles.headerText, { color: 'white' }]}>D</Text>
        <Text style={[styles.headerText, { color: 'white' }]}>M</Text>
        <Text style={[styles.headerText, { color: 'white' }]}>UG</Text>
        <Text style={[styles.headerText, { color: 'white' }]}>QG</Text>
        <Text style={[styles.headerText, { color: 'white' }]}>F</Text>
        <Text style={[styles.headerText, styles.points, { color: 'white' }]}>U</Text>
      </View>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            Ma'lumotlar yuklanmoqda...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (selectedLeague) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <ScrollView
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {renderLeagueDetail()}
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.titleHeader, { backgroundColor: colors.header, borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.text }]}>Tournament</Text>
      </View>

      <FlatList
        data={leagues}
        renderItem={renderLeagueItem}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="trophy-outline" size={48} color={colors.textTertiary} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              Ligalar mavjud emas
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  titleHeader: {
    padding: 20,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  legend: {
    padding: 12,
    borderBottomWidth: 1,
  },
  legendText: {
    fontSize: 12,
    textAlign: 'center',
  },
  list: {
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    fontSize: 16,
    marginTop: 12,
  },
  headerRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 8,
  },
  standingRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 4,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  positionContainer: {
    width: 30,
    alignItems: 'center',
  },
  position: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  topThreePosition: {
    color: '#FFD700',
  },
  teamContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
    marginRight: 8,
    maxWidth: 120,
  },
  teamColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  teamName: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 240,
    justifyContent: 'space-between',
  },
  stat: {
    width: 25,
    textAlign: 'center',
    fontSize: 12,
  },
  points: {
    fontWeight: 'bold',
  },
  headerText: {
    fontSize: 12,
    fontWeight: 'bold',
    width: 25,
    textAlign: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    marginTop: 12,
  },
  leagueItem: {
    padding: 16,
    marginBottom: 8,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  leagueHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  leagueName: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  leagueDate: {
    fontSize: 14,
    marginBottom: 8,
  },
  leagueStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  leagueStat: {
    fontSize: 12,
  },
  leagueDetail: {
    flex: 1,
  },
  leagueDetailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 16,
    marginLeft: 8,
  },
  leagueDetailTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  matchItem: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  matchText: {
    fontSize: 16,
    fontWeight: '500',
  },
  matchDate: {
    fontSize: 12,
    marginTop: 4,
  },
  standingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 4,
  },
  position: {
    fontSize: 16,
    fontWeight: 'bold',
    width: 30,
    textAlign: 'center',
  },
  teamName: {
    fontSize: 16,
    flex: 1,
    marginLeft: 12,
  },
  points: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  playerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 4,
  },
  playerRank: {
    width: 30,
    alignItems: 'center',
  },
  playerPosition: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  playerInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 12,
  },
  playerPhoto: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  playerImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  playerImagePlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playerDetails: {
    flex: 1,
  },
  playerName: {
    fontSize: 16,
    fontWeight: '500',
  },
  playerTeam: {
    fontSize: 12,
    marginTop: 2,
  },
  playerStats: {
    alignItems: 'center',
  },
  playerGoals: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  playerStatsLabel: {
    fontSize: 10,
  },
  seasonButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  seasonText: {
    fontSize: 14,
    fontWeight: '500',
    marginRight: 4,
  },
  tabContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#007AFF',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  activeTabText: {
    color: '#FFFFFF',
  },
  playersHeader: {
    marginBottom: 16,
  },
  playersTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playersTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginHorizontal: 8,
  },
});

export default StandingsScreen;
