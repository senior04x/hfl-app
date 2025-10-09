import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  // ActivityIndicator, // Skeleton loading ishlatamiz
  ScrollView,
  Image,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { onSnapshot, collection, query, orderBy, where, getDocs } from 'firebase/firestore';

import { useTheme } from '../store/useThemeStore';
import { useLanguage } from '../store/useLanguageStore';
import { TeamStanding, Team, Match, PlayerStats } from '../types';
import { db } from '../lib/firebase';
import MatchSkeletonCard from '../components/MatchSkeletonCard';

interface League {
  id: string;
  name: string;
  displayName: string;
  startDate: string;
  endDate: string;
  currentRound: number;
  totalRounds: number;
  standings: TeamStanding[];
  recentMatches: Match[];
  topPlayers: PlayerStats[];
  subLeagues?: League[];
  parentLeague?: string;
  level: number; // 0: Main league, 1: Sub league
}

const StandingsScreen = () => {
  const { colors } = useTheme();
  const { getText } = useLanguage();
  const [leagues, setLeagues] = useState<League[]>([]);
  const [selectedLeague, setSelectedLeague] = useState<League | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'standings' | 'players' | 'matches'>('overview');
  const [playersFilter, setPlayersFilter] = useState<'goals' | 'assists' | 'played' | 'yellowCards' | 'redCards'>('goals');
  const [showFilterOptions, setShowFilterOptions] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchBar, setShowSearchBar] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [selectedTeams, setSelectedTeams] = useState<string[]>([]);
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([]);
  const [selectedSeason, setSelectedSeason] = useState('2024/25');
  const [showSeasonPicker, setShowSeasonPicker] = useState(false);

  useEffect(() => {
    fetchLeagues();
  }, []);

  // Mock data function moved outside
  const getMockDataForLeague = (leagueName: string) => {
    // HFL 3-liga teams
    if (leagueName.includes('3-liga')) {
      return {
        teams: [
          { name: 'TTH', color: '#132257', shortName: 'TTH' },
          { name: 'BOL', color: '#A020F0', shortName: 'BOL' },
          { name: 'SVL', color: '#FF0000', shortName: 'SVL' },
          { name: 'MNC', color: '#6CABDD', shortName: 'MNC' },
        ],
        players: [
          { name: 'MAMARAJABOV LATIF', team: 'TTH', goals: 7, assists: 2 },
          { name: 'AKHMADJONOV ASADBEK', team: 'BOL', goals: 4, assists: 1 },
          { name: 'RUZMATOV ASROR', team: 'SVL', goals: 3, assists: 3 },
          { name: 'SHAAHMEDOV SANJAR', team: 'MNC', goals: 3, assists: 2 },
        ],
        matches: [
          { home: 'TTH', away: 'BOL', homeScore: 2, awayScore: 1, date: new Date('2024-07-13T21:20:00'), venue: 'Qo\'yliq, Поле 1', stage: 'final' },
          { home: 'SVL', away: 'MNC', homeScore: 1, awayScore: 3, date: new Date('2024-07-06T20:10:00'), venue: 'Qo\'yliq, Поле 1', stage: 'semifinal' },
        ]
      };
    }
    
    // HFL Pro Liga teams
    if (leagueName.includes('Pro Liga')) {
      return {
        teams: [
          { name: 'PMA', color: '#FFD700', shortName: 'PMA' },
          { name: 'AGR', color: '#00FF00', shortName: 'AGR' },
          { name: 'LPL', color: '#C8102E', shortName: 'LPL' },
          { name: 'BJU', color: '#000000', shortName: 'BJU' },
        ],
        players: [
          { name: 'VALIYEV OBID', team: 'PMA', goals: 8, assists: 2 },
          { name: 'BERDIMURODOV SHUNQORBEK', team: 'AGR', goals: 6, assists: 0 },
          { name: 'BAXTIYOROV BURXON', team: 'LPL', goals: 5, assists: 0 },
          { name: 'QOLDOSHEV SHAXRIDDIN', team: 'BJU', goals: 4, assists: 3 },
        ],
        matches: [
          { home: 'PMA', away: 'AGR', homeScore: 3, awayScore: 1, date: new Date('2024-07-12T21:20:00'), venue: 'Lokomotiv, Поле 1', stage: 'final' },
          { home: 'LPL', away: 'BJU', homeScore: 2, awayScore: 0, date: new Date('2024-07-05T20:10:00'), venue: 'Qo\'yliq, Поле 2', stage: 'semifinal' },
        ]
      };
    }
    
    // HFL Super Liga teams
    if (leagueName.includes('Super Liga')) {
      return {
        teams: [
          { name: 'BRI', color: '#0057B8', shortName: 'BRI' },
          { name: 'INT', color: '#0068A8', shortName: 'INT' },
          { name: 'CHS', color: '#034694', shortName: 'CHS' },
          { name: 'ATU', color: '#A71930', shortName: 'ATU' },
        ],
        players: [
          { name: 'DANISHOV SOHIB', team: 'BRI', goals: 9, assists: 2 },
          { name: 'XOJIMAMATOV AZIZ', team: 'INT', goals: 7, assists: 2 },
          { name: 'SALIMOV SARDOR', team: 'CHS', goals: 6, assists: 1 },
          { name: 'MUXTOROV JAHONGIR', team: 'ATU', goals: 5, assists: 1 },
        ],
        matches: [
          { home: 'BRI', away: 'INT', homeScore: 1, awayScore: 4, date: new Date('2024-07-11T21:20:00'), venue: 'Qo\'yliq, Поле 1', stage: 'final' },
          { home: 'CHS', away: 'ATU', homeScore: 2, awayScore: 1, date: new Date('2024-07-04T20:10:00'), venue: 'Lokomotiv, Поле 1', stage: 'semifinal' },
        ]
      };
    }
    
    // Poytaxt Premier teams
    if (leagueName.includes('Premier')) {
      return {
        teams: [
          { name: 'RMA', color: '#FFFFFF', shortName: 'RMA' },
          { name: 'BAR', color: '#A50044', shortName: 'BAR' },
          { name: 'ATM', color: '#CE1126', shortName: 'ATM' },
          { name: 'VAL', color: '#FF6600', shortName: 'VAL' },
        ],
        players: [
          { name: 'Рахимов Улугбек', team: 'RMA', goals: 10 },
          { name: 'Камолов Джасур', team: 'BAR', goals: 8 },
          { name: 'Юлдашев Азиз', team: 'ATM', goals: 6 },
          { name: 'Хакимов Шерзод', team: 'VAL', goals: 5 },
        ],
        matches: [
          { home: 'RMA', away: 'BAR', homeScore: 2, awayScore: 1, date: new Date('2024-07-10T21:20:00'), venue: 'Poytaxt Arena', stage: 'final' },
          { home: 'ATM', away: 'VAL', homeScore: 1, awayScore: 0, date: new Date('2024-07-03T20:10:00'), venue: 'Poytaxt Stadium', stage: 'semifinal' },
        ]
      };
    }
    
    // Poytaxt Championship teams
    if (leagueName.includes('Championship')) {
      return {
        teams: [
          { name: 'SEV', color: '#FF0000', shortName: 'SEV' },
          { name: 'VIL', color: '#FFD700', shortName: 'VIL' },
          { name: 'RSO', color: '#0033A0', shortName: 'RSO' },
          { name: 'ATH', color: '#EE2523', shortName: 'ATH' },
        ],
        players: [
          { name: 'Махмудов Ислом', team: 'SEV', goals: 7 },
          { name: 'Абдурахимов Фаррух', team: 'VIL', goals: 6 },
          { name: 'Турсунов Азизбек', team: 'RSO', goals: 5 },
          { name: 'Кодиров Жахонгир', team: 'ATH', goals: 4 },
        ],
        matches: [
          { home: 'SEV', away: 'VIL', homeScore: 3, awayScore: 2, date: new Date('2024-07-09T21:20:00'), venue: 'Poytaxt Arena', stage: 'final' },
          { home: 'RSO', away: 'ATH', homeScore: 1, awayScore: 1, date: new Date('2024-07-02T20:10:00'), venue: 'Poytaxt Stadium', stage: 'semifinal' },
        ]
      };
    }
    
    // Alijahon Elite teams
    if (leagueName.includes('Elite')) {
      return {
        teams: [
          { name: 'BAY', color: '#DC052D', shortName: 'BAY' },
          { name: 'BVB', color: '#FDE100', shortName: 'BVB' },
          { name: 'RBL', color: '#DD0532', shortName: 'RBL' },
          { name: 'B04', color: '#E32221', shortName: 'B04' },
        ],
        players: [
          { name: 'Муминов Азизбек', team: 'BAY', goals: 11 },
          { name: 'Ахмедов Шохрух', team: 'BVB', goals: 9 },
          { name: 'Юсупов Джасур', team: 'RBL', goals: 7 },
          { name: 'Каримов Улугбек', team: 'B04', goals: 6 },
        ],
        matches: [
          { home: 'BAY', away: 'BVB', homeScore: 4, awayScore: 1, date: new Date('2024-07-08T21:20:00'), venue: 'Alijahon Arena', stage: 'final' },
          { home: 'RBL', away: 'B04', homeScore: 2, awayScore: 0, date: new Date('2024-07-01T20:10:00'), venue: 'Alijahon Stadium', stage: 'semifinal' },
        ]
      };
    }
    
    // Alijahon Masters teams
    if (leagueName.includes('Masters')) {
      return {
        teams: [
          { name: 'PSG', color: '#004170', shortName: 'PSG' },
          { name: 'OM', color: '#00A8CC', shortName: 'OM' },
          { name: 'ASM', color: '#E31837', shortName: 'ASM' },
          { name: 'OL', color: '#FFD700', shortName: 'OL' },
        ],
        players: [
          { name: 'Тоштемиров Азиз', team: 'PSG', goals: 12 },
          { name: 'Абдуллаев Шохрух', team: 'OM', goals: 8 },
          { name: 'Хакимов Джасур', team: 'ASM', goals: 7 },
          { name: 'Юлдашев Улугбек', team: 'OL', goals: 6 },
        ],
        matches: [
          { home: 'PSG', away: 'OM', homeScore: 3, awayScore: 0, date: new Date('2024-07-07T21:20:00'), venue: 'Alijahon Arena', stage: 'final' },
          { home: 'ASM', away: 'OL', homeScore: 1, awayScore: 2, date: new Date('2024-06-30T20:10:00'), venue: 'Alijahon Stadium', stage: 'semifinal' },
        ]
      };
    }
    
    // Default fallback
    return {
      teams: [
        { name: 'Default Team 1', color: '#3B82F6', shortName: 'DT1' },
        { name: 'Default Team 2', color: '#EF4444', shortName: 'DT2' },
        { name: 'Default Team 3', color: '#10B981', shortName: 'DT3' },
        { name: 'Default Team 4', color: '#F59E0B', shortName: 'DT4' },
      ],
      players: [
        { name: 'Default Player 1', team: 'Default Team 1', goals: 5 },
        { name: 'Default Player 2', team: 'Default Team 2', goals: 4 },
        { name: 'Default Player 3', team: 'Default Team 3', goals: 3 },
        { name: 'Default Player 4', team: 'Default Team 4', goals: 2 },
      ],
      matches: [
        { home: 'Default Team 1', away: 'Default Team 2', homeScore: 2, awayScore: 1, date: new Date('2024-07-06T21:20:00'), venue: 'Default Venue', stage: 'final' },
      ]
    };
  };

  const fetchLeagues = async () => {
    try {
      setLoading(true);
      console.log('Fetching leagues from Firebase...');
      
      // Liga ma'lumotlarini olish - Hierarchical structure
      const leaguesData: League[] = [
        {
          id: 'havas-liga',
          name: 'Havas Liga',
          displayName: 'Havas Liga',
          startDate: '2024-09-01',
          endDate: '2024-12-31',
          currentRound: 3,
          totalRounds: 18,
          level: 0,
          standings: [],
          recentMatches: [],
          topPlayers: [],
          subLeagues: [
        {
          id: 'hfl-3-liga',
          name: 'HFL 3-liga',
              displayName: 'HFL 3-liga',
          startDate: '2024-09-01',
          endDate: '2024-12-31',
              currentRound: 3,
              totalRounds: 18,
              level: 1,
              parentLeague: 'havas-liga',
          standings: [],
          recentMatches: [],
          topPlayers: [],
        },
        {
          id: 'hfl-pro-liga',
          name: 'HFL Pro Liga',
              displayName: 'HFL Pro Liga',
          startDate: '2024-09-01',
          endDate: '2024-12-31',
              currentRound: 3,
              totalRounds: 18,
              level: 1,
              parentLeague: 'havas-liga',
          standings: [],
          recentMatches: [],
          topPlayers: [],
        },
        {
          id: 'hfl-super-liga',
          name: 'HFL Super Liga',
              displayName: 'HFL Super Liga',
          startDate: '2024-09-01',
          endDate: '2024-12-31',
              currentRound: 3,
              totalRounds: 18,
              level: 1,
              parentLeague: 'havas-liga',
          standings: [],
          recentMatches: [],
          topPlayers: [],
            },
          ],
        },
        {
          id: 'poytaxt-liga',
          name: 'Poytaxt Liga',
          displayName: 'Poytaxt Liga',
          startDate: '2024-09-01',
          endDate: '2024-12-31',
          currentRound: 2,
          totalRounds: 16,
          level: 0,
          standings: [],
          recentMatches: [],
          topPlayers: [],
          subLeagues: [
            {
              id: 'poytaxt-premier',
              name: 'Poytaxt Premier',
              displayName: 'Poytaxt Premier',
              startDate: '2024-09-01',
              endDate: '2024-12-31',
              currentRound: 2,
              totalRounds: 16,
              level: 1,
              parentLeague: 'poytaxt-liga',
          standings: [],
          recentMatches: [],
          topPlayers: [],
            },
            {
              id: 'poytaxt-championship',
              name: 'Poytaxt Championship',
              displayName: 'Poytaxt Championship',
              startDate: '2024-09-01',
              endDate: '2024-12-31',
              currentRound: 2,
              totalRounds: 16,
              level: 1,
              parentLeague: 'poytaxt-liga',
              standings: [],
              recentMatches: [],
              topPlayers: [],
            },
          ],
        },
        {
          id: 'alijahon-liga',
          name: 'Alijahon Liga',
          displayName: 'Alijahon Liga',
          startDate: '2024-09-01',
          endDate: '2024-12-31',
          currentRound: 4,
          totalRounds: 20,
          level: 0,
          standings: [],
          recentMatches: [],
          topPlayers: [],
          subLeagues: [
            {
              id: 'alijahon-elite',
              name: 'Alijahon Elite',
              displayName: 'Alijahon Elite',
              startDate: '2024-09-01',
              endDate: '2024-12-31',
              currentRound: 4,
              totalRounds: 20,
              level: 1,
              parentLeague: 'alijahon-liga',
              standings: [],
              recentMatches: [],
              topPlayers: [],
            },
            {
              id: 'alijahon-masters',
              name: 'Alijahon Masters',
              displayName: 'Alijahon Masters',
              startDate: '2024-09-01',
              endDate: '2024-12-31',
              currentRound: 4,
              totalRounds: 20,
              level: 1,
              parentLeague: 'alijahon-liga',
              standings: [],
              recentMatches: [],
              topPlayers: [],
            },
          ],
        },
      ];


      // Har bir liga uchun mock data qo'shish
      for (const league of leaguesData) {
        const mockData = getMockDataForLeague(league.name);
        
        // Mock standings data
        const standingsData: TeamStanding[] = mockData.teams.map((team, index) => ({
          teamId: `team-${league.id}-${index}`,
              team: {
            id: `team-${league.id}-${index}`,
            name: team.name,
            logo: '',
            color: team.color,
            description: `${team.name} professional football team`,
                players: [],
                createdAt: new Date(),
                updatedAt: new Date(),
              },
          matchesPlayed: Math.floor(Math.random() * 10) + 5,
          wins: Math.floor(Math.random() * 8) + 1,
          draws: Math.floor(Math.random() * 3),
          losses: Math.floor(Math.random() * 5),
          goalsFor: Math.floor(Math.random() * 20) + 5,
          goalsAgainst: Math.floor(Math.random() * 15) + 2,
          goalDifference: 0,
          points: 0,
        }));

        // Calculate points and goal difference
        standingsData.forEach(standing => {
          standing.points = standing.wins * 3 + standing.draws;
          standing.goalDifference = standing.goalsFor - standing.goalsAgainst;
        });

        // Sort by points, then by goal difference
        standingsData.sort((a, b) => {
          if (b.points !== a.points) return b.points - a.points;
          return b.goalDifference - a.goalDifference;
        });

        // Mock recent matches
        const recentMatches: Match[] = mockData.matches.map((match, index) => ({
          id: `match-${league.id}-${index}`,
          homeTeamId: `team-${league.id}-${index}`,
          awayTeamId: `team-${league.id}-${index + 1}`,
          homeTeamName: match.home,
          awayTeamName: match.away,
          homeScore: match.homeScore,
          awayScore: match.awayScore,
          matchDate: match.date,
          venue: match.venue,
          status: 'finished',
          youtubeLink: '',
          leagueType: league.name,
          createdAt: new Date(),
          updatedAt: new Date(),
        }));

        // Mock top players
        const topPlayers: PlayerStats[] = mockData.players.map((player, index) => ({
          id: `player-${league.id}-${index}`,
          playerId: `player-${league.id}-${index}`,
          playerName: player.name,
          playerPhoto: '',
          teamId: `team-${league.id}-${index}`,
          teamName: player.team,
          teamLogo: '',
          leagueType: league.name,
          matchesPlayed: Math.floor(Math.random() * 10) + 5,
          goals: player.goals,
          assists: Math.floor(Math.random() * 5),
          yellowCards: Math.floor(Math.random() * 3),
          redCards: Math.floor(Math.random() * 2),
          minutesPlayed: Math.floor(Math.random() * 800) + 200,
          createdAt: new Date(),
          updatedAt: new Date(),
        }));

          league.standings = standingsData;
        league.recentMatches = recentMatches;
        league.topPlayers = topPlayers;
          
          console.log(`League ${league.name}:`, {
            standings: standingsData.length,
            matches: recentMatches.length,
          players: topPlayers.length,
          teams: mockData.teams.map(t => t.name)
          });
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
    <View style={[styles.leagueItem, { backgroundColor: colors.surface }]}>
      {/* Main League Header - Non-clickable, just for display */}
      <View style={styles.leagueHeader}>
        <View style={styles.leagueInfo}>
        <Text style={[styles.leagueName, { color: colors.text }]}>
            {item.displayName}
        </Text>
          <View style={styles.roundInfo}>
            <Text style={[styles.roundText, { color: colors.primary }]}>
              {item.currentRound}-tur / {item.totalRounds}
            </Text>
      </View>
        </View>
      </View>
      
      <Text style={[styles.leagueDate, { color: colors.textSecondary }]}>
        {formatDate(item.startDate)} - {formatDate(item.endDate)}
      </Text>
      
      <View style={styles.leagueStats}>
        <Text style={[styles.leagueStat, { color: colors.textSecondary }]}>
          {item.standings.length} {getText('team').toLowerCase()}
        </Text>
        <Text style={[styles.leagueStat, { color: colors.textSecondary }]}>
          {item.recentMatches.length} {getText('games').toLowerCase()}
        </Text>
      </View>

      {/* Sub-leagues - Direct access */}
      {item.subLeagues && item.subLeagues.length > 0 && (
        <View style={styles.subLeaguesContainer}>
          {item.subLeagues.map((subLeague) => (
            <TouchableOpacity
              key={subLeague.id}
              style={[styles.subLeagueItem, { backgroundColor: colors.background }]}
              onPress={() => setSelectedLeague(subLeague)}
            >
              <View style={styles.subLeagueInfo}>
                <Text style={[styles.subLeagueName, { color: colors.text }]}>
                  {subLeague.displayName}
                </Text>
                <Text style={[styles.subLeagueRound, { color: colors.textSecondary }]}>
                  {subLeague.currentRound}-tur
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
    </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
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
          <View style={styles.leagueTitleContainer}>
          <Text style={[styles.leagueDetailTitle, { color: colors.text }]}>
              {selectedLeague.displayName}
          </Text>
          </View>
          <TouchableOpacity 
            style={[styles.seasonButton, { backgroundColor: colors.primary }]}
            onPress={() => setShowSeasonPicker(!showSeasonPicker)}
          >
            <Text style={[styles.seasonText, { color: 'white' }]}>{selectedSeason}</Text>
            <Ionicons name={showSeasonPicker ? "chevron-up" : "chevron-down"} size={16} color="white" />
          </TouchableOpacity>
        </View>

        {/* Season Picker */}
        {showSeasonPicker && (
          <View style={[styles.seasonPicker, { backgroundColor: colors.surface }]}>
            <TouchableOpacity 
              style={[styles.seasonOption, { backgroundColor: selectedSeason === '2023/24' ? colors.primary + '20' : 'transparent' }]}
              onPress={() => {
                setSelectedSeason('2023/24');
                setShowSeasonPicker(false);
              }}
            >
              <Text style={[styles.seasonOptionText, { color: selectedSeason === '2023/24' ? colors.primary : colors.text }]}>
                2023/24
              </Text>
              {selectedSeason === '2023/24' && <Ionicons name="checkmark" size={16} color={colors.primary} />}
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.seasonOption, { backgroundColor: selectedSeason === '2024/25' ? colors.primary + '20' : 'transparent' }]}
              onPress={() => {
                setSelectedSeason('2024/25');
                setShowSeasonPicker(false);
              }}
            >
              <Text style={[styles.seasonOptionText, { color: selectedSeason === '2024/25' ? colors.primary : colors.text }]}>
                2024/25
              </Text>
              {selectedSeason === '2024/25' && <Ionicons name="checkmark" size={16} color={colors.primary} />}
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.seasonOption, { backgroundColor: selectedSeason === '2025/26' ? colors.primary + '20' : 'transparent' }]}
              onPress={() => {
                setSelectedSeason('2025/26');
                setShowSeasonPicker(false);
              }}
            >
              <Text style={[styles.seasonOptionText, { color: selectedSeason === '2025/26' ? colors.primary : colors.text }]}>
                2025/26
              </Text>
              {selectedSeason === '2025/26' && <Ionicons name="checkmark" size={16} color={colors.primary} />}
            </TouchableOpacity>
          </View>
        )}

        {/* Navigation Tabs */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={[styles.tabContainer, { backgroundColor: colors.header }]}
          contentContainerStyle={styles.tabContentContainer}
        >
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'overview' && styles.activeTab, { borderBottomColor: colors.primary }]}
            onPress={() => setActiveTab('overview')}
          >
            <Text style={[styles.tabText, activeTab === 'overview' && styles.activeTabText, { color: activeTab === 'overview' ? colors.primary : colors.textSecondary }]}>
              {getText('overview')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'standings' && styles.activeTab, { borderBottomColor: colors.primary }]}
            onPress={() => setActiveTab('standings')}
          >
            <Text style={[styles.tabText, activeTab === 'standings' && styles.activeTabText, { color: activeTab === 'standings' ? colors.primary : colors.textSecondary }]}>
              {getText('standings')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'players' && styles.activeTab, { borderBottomColor: colors.primary }]}
            onPress={() => setActiveTab('players')}
          >
            <Text style={[styles.tabText, activeTab === 'players' && styles.activeTabText, { color: activeTab === 'players' ? colors.primary : colors.textSecondary }]}>
              {getText('topPlayers')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'matches' && styles.activeTab, { borderBottomColor: colors.primary }]}
            onPress={() => setActiveTab('matches')}
          >
            <Text style={[styles.tabText, activeTab === 'matches' && styles.activeTabText, { color: activeTab === 'matches' ? colors.primary : colors.textSecondary }]}>
              {getText('matches')}
            </Text>
          </TouchableOpacity>
        </ScrollView>

              {/* Search and Filter Bar */}
              <View style={[styles.searchContainer, { backgroundColor: colors.background }]}>
                {showSearchBar ? (
                  <View style={[styles.searchInputContainer, { backgroundColor: colors.surface }]}>
                    <Ionicons name="search" size={20} color={colors.textSecondary} />
                    <TextInput
                      style={[styles.searchInput, { color: colors.text }]}
                      placeholder={getText('search')}
                      placeholderTextColor={colors.textSecondary}
                      value={searchQuery}
                      onChangeText={setSearchQuery}
                      autoFocus={true}
                    />
                    <TouchableOpacity onPress={() => {
                      setSearchQuery('');
                      setShowSearchBar(false);
                    }}>
                      <Ionicons name="close" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity 
                    style={[styles.searchBar, { backgroundColor: colors.surface }]}
                    onPress={() => setShowSearchBar(true)}
                  >
                    <Ionicons name="search" size={20} color={colors.textSecondary} />
                    <Text style={[styles.searchPlaceholder, { color: colors.textSecondary }]}>
                      {getText('search')}
                    </Text>
                  </TouchableOpacity>
                )}
        </View>

        {/* Content based on active tab */}
        {activeTab === 'overview' && (
          <ScrollView style={styles.contentContainer}>
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
                {getText('overview')}
          </Text>
              <View style={[styles.overviewCard, { backgroundColor: colors.surface }]}>
                <View style={styles.overviewRow}>
                  <Text style={[styles.overviewLabel, { color: colors.textSecondary }]}>
                    {getText('startDate')}:
              </Text>
                  <Text style={[styles.overviewValue, { color: colors.text }]}>
                    {new Date(selectedLeague.startDate).toLocaleDateString('uz-UZ')}
              </Text>
            </View>
                <View style={styles.overviewRow}>
                  <Text style={[styles.overviewLabel, { color: colors.textSecondary }]}>
                    {getText('finishDate')}:
                  </Text>
                  <Text style={[styles.overviewValue, { color: colors.text }]}>
                    {new Date(selectedLeague.endDate).toLocaleDateString('uz-UZ')}
                  </Text>
                </View>
                <View style={styles.overviewRow}>
                  <Text style={[styles.overviewLabel, { color: colors.textSecondary }]}>
                    {getText('state')}:
                  </Text>
                  <View style={styles.stateContainer}>
                    <View style={[styles.statusDot, { backgroundColor: '#4CAF50' }]} />
                    <Text style={[styles.overviewValue, { color: colors.text }]}>
                      {getText('inProgress')}
                    </Text>
                  </View>
                </View>
                <View style={styles.overviewRow}>
                  <Text style={[styles.overviewLabel, { color: colors.textSecondary }]}>
                    {getText('teams')}:
                  </Text>
                  <Text style={[styles.overviewValue, { color: colors.text }]}>
                    {selectedLeague.standings.length || getMockDataForLeague(selectedLeague.name).teams.length}
                  </Text>
                </View>
                <View style={styles.overviewRow}>
                  <Text style={[styles.overviewLabel, { color: colors.textSecondary }]}>
                    {getText('games')}:
                  </Text>
                  <Text style={[styles.overviewValue, { color: colors.text }]}>
                    {selectedLeague.recentMatches.length || getMockDataForLeague(selectedLeague.name).matches.length} / {selectedLeague.totalRounds * 2}
                  </Text>
                </View>
              </View>
        </View>

            {/* Contacts Section */}
        <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                {getText('contacts')}
              </Text>
              <View style={[styles.contactCard, { backgroundColor: colors.surface }]}>
                <View style={styles.contactInfo}>
                  <View style={[styles.contactLogo, { backgroundColor: colors.primary }]}>
                    <Text style={styles.contactLogoText}>HFL</Text>
            </View>
                  <View style={styles.contactDetails}>
                    <Text style={[styles.contactName, { color: colors.text }]}>
                      {getText('leagueAdmin')}
                    </Text>
                    <Text style={[styles.contactTitle, { color: colors.textSecondary }]}>
                      {getText('leagueAdmin')}
                    </Text>
          </View>
                </View>
                <TouchableOpacity style={[styles.contactButton, { backgroundColor: colors.primary }]}>
                  <Ionicons name="call" size={20} color="white" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Last Games Section */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                {getText('lastGames')}
              </Text>
              {(selectedLeague.recentMatches.length > 0 ? selectedLeague.recentMatches : getMockDataForLeague(selectedLeague.name).matches).slice(0, 3).map((match, index) => {
                // Handle both Match objects and mock match objects
                const matchData = 'matchDate' in match ? match : {
                  homeTeamName: match.home,
                  awayTeamName: match.away,
                  homeScore: match.homeScore,
                  awayScore: match.awayScore,
                  matchDate: match.date,
                  venue: match.venue
                };
                
                return (
                  <View key={index} style={[styles.matchCard, { backgroundColor: colors.surface }]}>
                    <View style={styles.matchHeader}>
                      <Text style={[styles.matchStage, { color: colors.textSecondary }]}>
                        {getText('final')}
                      </Text>
                      <Text style={[styles.matchDateTime, { color: colors.textSecondary }]}>
                        {matchData.matchDate.toLocaleDateString('uz-UZ')} {matchData.matchDate.toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>
                    <View style={styles.matchTeams}>
                      <View style={styles.teamInfo}>
                        <View style={[styles.teamLogo, { backgroundColor: colors.primary }]}>
                          <Text style={styles.teamLogoText}>{getMockDataForLeague(selectedLeague.name).teams.find(t => t.name === matchData.homeTeamName)?.shortName || matchData.homeTeamName.substring(0, 3).toUpperCase()}</Text>
                    </View>
                        <Text style={[styles.teamName, { color: colors.text }]}>
                          {matchData.homeTeamName}
                        </Text>
                      </View>
                      <View style={styles.matchScore}>
                        <Text style={[styles.scoreText, { color: colors.text }]}>
                          {matchData.homeScore} : {matchData.awayScore}
                        </Text>
                      </View>
                      <View style={styles.teamInfo}>
                        <Text style={[styles.teamName, { color: colors.text }]}>
                          {matchData.awayTeamName}
                        </Text>
                        <View style={[styles.teamLogo, { backgroundColor: colors.primary }]}>
                          <Text style={styles.teamLogoText}>{getMockDataForLeague(selectedLeague.name).teams.find(t => t.name === matchData.awayTeamName)?.shortName || matchData.awayTeamName.substring(0, 3).toUpperCase()}</Text>
                        </View>
                      </View>
                    </View>
                    <View style={styles.matchVenue}>
                      <Ionicons name="location-outline" size={16} color={colors.textSecondary} />
                      <Text style={[styles.venueText, { color: colors.textSecondary }]}>
                        {matchData.venue}
                      </Text>
                    </View>
                  </View>
                );
              })}
        </View>
          </ScrollView>
        )}

        {activeTab === 'matches' && (
          <ScrollView style={styles.contentContainer}>
            {/* Matches List */}
        <View style={styles.section}>
                      {(selectedLeague.recentMatches.length > 0 ? selectedLeague.recentMatches : getMockDataForLeague(selectedLeague.name).matches)
                      .filter(match => {
                        const matchData = 'matchDate' in match ? match : {
                          homeTeamName: match.home,
                          awayTeamName: match.away,
                          homeScore: match.homeScore,
                          awayScore: match.awayScore,
                          matchDate: match.date,
                          venue: match.venue
                        };
                        
                        // Only search filter, no team filter
                        return !searchQuery.trim() || 
                          matchData.homeTeamName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          matchData.awayTeamName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (matchData.venue && matchData.venue.toLowerCase().includes(searchQuery.toLowerCase()));
                      })
                      .map((match, index) => {
                // Handle both Match objects and mock match objects
                const matchData = 'matchDate' in match ? match : {
                  homeTeamName: match.home,
                  awayTeamName: match.away,
                  homeScore: match.homeScore,
                  awayScore: match.awayScore,
                  matchDate: match.date,
                  venue: match.venue
                };
                
                const isSelected = selectedTeams.includes(matchData.homeTeamName) || selectedTeams.includes(matchData.awayTeamName);
                
                return (
                <View key={index} style={[
                  styles.matchCard, 
                  { 
                    backgroundColor: isSelected ? colors.primary + '20' : colors.surface,
                    borderLeftWidth: isSelected ? 4 : 0,
                    borderLeftColor: isSelected ? colors.primary : 'transparent'
                  }
                ]}>
                  <View style={styles.matchHeader}>
                    <Text style={[styles.matchStage, { color: colors.textSecondary }]}>
                      {getText('final')}
                    </Text>
                    <Text style={[styles.matchDateTime, { color: colors.textSecondary }]}>
                      {matchData.matchDate.toLocaleDateString('uz-UZ')} {matchData.matchDate.toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                </View>
                  <View style={styles.matchTeams}>
                    <View style={styles.teamInfo}>
                      <View style={[styles.teamLogo, { backgroundColor: colors.primary }]}>
                        <Text style={styles.teamLogoText}>{getMockDataForLeague(selectedLeague.name).teams.find(t => t.name === matchData.homeTeamName)?.shortName || matchData.homeTeamName.substring(0, 3).toUpperCase()}</Text>
                      </View>
                      <Text style={[styles.teamName, { color: colors.text }]}>
                        {matchData.homeTeamName}
                  </Text>
                    </View>
                    <View style={styles.matchScore}>
                      <Text style={[styles.scoreText, { color: colors.text }]}>
                        {matchData.homeScore} : {matchData.awayScore}
                  </Text>
                </View>
                    <View style={styles.teamInfo}>
                      <Text style={[styles.teamName, { color: colors.text }]}>
                        {matchData.awayTeamName}
                      </Text>
                      <View style={[styles.teamLogo, { backgroundColor: colors.primary }]}>
                        <Text style={styles.teamLogoText}>{getMockDataForLeague(selectedLeague.name).teams.find(t => t.name === matchData.awayTeamName)?.shortName || matchData.awayTeamName.substring(0, 3).toUpperCase()}</Text>
              </View>
                    </View>
                  </View>
                  <View style={styles.matchVenue}>
                    <Ionicons name="location-outline" size={16} color={colors.textSecondary} />
                    <Text style={[styles.venueText, { color: colors.textSecondary }]}>
                      {matchData.venue}
                </Text>
              </View>
            </View>
                );
              })}
        </View>
          </ScrollView>
        )}

        {activeTab === 'players' && (
          <ScrollView style={styles.contentContainer}>
            {/* Goals Filter */}
            <View style={[styles.goalsFilter, { backgroundColor: colors.background }]}>
              <TouchableOpacity 
                style={[styles.goalsFilterButton, { backgroundColor: colors.surface }]}
                onPress={() => setShowFilterOptions(!showFilterOptions)}
              >
                <Ionicons 
                  name={
                    playersFilter === 'goals' ? 'football' :
                    playersFilter === 'assists' ? 'footsteps' :
                    playersFilter === 'played' ? 'trophy' :
                    playersFilter === 'yellowCards' ? 'warning' :
                    'close-circle'
                  } 
                  size={20} 
                  color={colors.primary} 
                />
                <Text style={[styles.goalsFilterText, { color: colors.text }]}>
                  {playersFilter === 'goals' ? getText('goals') :
                   playersFilter === 'assists' ? getText('assists') :
                   playersFilter === 'played' ? getText('played') :
                   playersFilter === 'yellowCards' ? getText('yellowCards') :
                   getText('redCards')}
                </Text>
                <Ionicons 
                  name={showFilterOptions ? "chevron-up" : "chevron-down"} 
                  size={16} 
                  color={colors.textSecondary} 
                />
              </TouchableOpacity>
            </View>

            {/* Filter Options */}
            {showFilterOptions && (
              <View style={[styles.filterOptions, { backgroundColor: colors.background }]}>
                <TouchableOpacity 
                  style={[styles.filterOption, { backgroundColor: colors.surface }]}
                  onPress={() => {
                    setPlayersFilter('goals');
                    setShowFilterOptions(false);
                  }}
                >
                  <Ionicons name="football" size={20} color={colors.primary} />
                  <Text style={[styles.filterOptionText, { color: colors.text }]}>{getText('goals')}</Text>
                  <View style={[styles.radioButton, { borderColor: colors.primary }]}>
                    {playersFilter === 'goals' && <View style={[styles.radioButtonInner, { backgroundColor: colors.primary }]} />}
                  </View>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.filterOption, { backgroundColor: colors.surface }]}
                  onPress={() => {
                    setPlayersFilter('assists');
                    setShowFilterOptions(false);
                  }}
                >
                  <Ionicons name="footsteps" size={20} color={colors.primary} />
                  <Text style={[styles.filterOptionText, { color: colors.text }]}>{getText('assists')}</Text>
                  <View style={[styles.radioButton, { borderColor: colors.primary }]}>
                    {playersFilter === 'assists' && <View style={[styles.radioButtonInner, { backgroundColor: colors.primary }]} />}
                  </View>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.filterOption, { backgroundColor: colors.surface }]}
                  onPress={() => {
                    setPlayersFilter('played');
                    setShowFilterOptions(false);
                  }}
                >
                  <Ionicons name="trophy" size={20} color={colors.primary} />
                  <Text style={[styles.filterOptionText, { color: colors.text }]}>{getText('played')}</Text>
                  <View style={[styles.radioButton, { borderColor: colors.primary }]}>
                    {playersFilter === 'played' && <View style={[styles.radioButtonInner, { backgroundColor: colors.primary }]} />}
                  </View>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.filterOption, { backgroundColor: colors.surface }]}
                  onPress={() => {
                    setPlayersFilter('yellowCards');
                    setShowFilterOptions(false);
                  }}
                >
                  <Ionicons name="warning" size={20} color="#FFD700" />
                  <Text style={[styles.filterOptionText, { color: colors.text }]}>{getText('yellowCards')}</Text>
                  <View style={[styles.radioButton, { borderColor: colors.primary }]}>
                    {playersFilter === 'yellowCards' && <View style={[styles.radioButtonInner, { backgroundColor: colors.primary }]} />}
                  </View>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.filterOption, { backgroundColor: colors.surface }]}
                  onPress={() => {
                    setPlayersFilter('redCards');
                    setShowFilterOptions(false);
                  }}
                >
                  <Ionicons name="close-circle" size={20} color="#FF0000" />
                  <Text style={[styles.filterOptionText, { color: colors.text }]}>{getText('redCards')}</Text>
                  <View style={[styles.radioButton, { borderColor: colors.primary }]}>
                    {playersFilter === 'redCards' && <View style={[styles.radioButtonInner, { backgroundColor: colors.primary }]} />}
                  </View>
                </TouchableOpacity>
                    </View>
                  )}

            {/* Players Table Header */}
            <View style={[styles.playersTableHeader, { backgroundColor: colors.surface }]}>
              <View style={styles.playerRankHeader}>
                <Text style={[styles.headerText, { color: colors.text }]}>#</Text>
                </View>
              <View style={styles.playerNameHeader}>
                <Text style={[styles.headerText, { color: colors.text }]}>F.I.O</Text>
              </View>
              <View style={styles.playerStatsHeader}>
                <Text style={[styles.headerText, { color: colors.text }]}>
                  {playersFilter === 'goals' ? 'GOLAS' :
                   playersFilter === 'assists' ? 'ASSISTS' :
                   playersFilter === 'played' ? 'O\'YNASH' :
                   playersFilter === 'yellowCards' ? 'SARIQ' :
                   'QIZIL'}
              </Text>
            </View>
          </View>

            {/* Players List */}
        <View style={styles.section}>
              {(selectedLeague.topPlayers.length > 0 ? selectedLeague.topPlayers : getMockDataForLeague(selectedLeague.name).players.map((player, index) => ({
                id: `player-${selectedLeague.id}-${index}`,
                playerId: `player-${selectedLeague.id}-${index}`,
                playerName: player.name,
                playerPhoto: '',
                teamId: `team-${selectedLeague.id}-${index}`,
                teamName: player.team,
                teamLogo: '',
                leagueType: selectedLeague.name,
                matchesPlayed: Math.floor(Math.random() * 10) + 5,
                goals: player.goals,
                assists: (player as any).assists || Math.floor(Math.random() * 5),
                yellowCards: Math.floor(Math.random() * 3),
                redCards: Math.floor(Math.random() * 2),
                minutesPlayed: Math.floor(Math.random() * 800) + 200,
                createdAt: new Date(),
                updatedAt: new Date(),
              })))
              .filter(player => {
                // Only search filter, no team filter
                return !searchQuery.trim() || 
                  player.playerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  player.teamName.toLowerCase().includes(searchQuery.toLowerCase());
              })
              .sort((a, b) => {
                switch (playersFilter) {
                  case 'goals':
                    return b.goals - a.goals;
                  case 'assists':
                    return b.assists - a.assists;
                  case 'played':
                    return b.matchesPlayed - a.matchesPlayed;
                  case 'yellowCards':
                    return b.yellowCards - a.yellowCards;
                  case 'redCards':
                    return b.redCards - a.redCards;
                  default:
                    return 0;
                }
              })
              .map((player, index) => {
                const isSelected = selectedPlayers.includes(player.playerName);
                return (
                <View key={index} style={[
                  styles.playerTableRow, 
                  { 
                    backgroundColor: isSelected ? colors.primary + '20' : colors.surface,
                    borderLeftWidth: isSelected ? 4 : 0,
                    borderLeftColor: isSelected ? colors.primary : 'transparent'
                  }
                ]}>
                  <View style={styles.playerRankCell}>
                <Text style={[styles.playerPosition, { color: colors.text }]}>
                  {index + 1}
          </Text>
              </View>
                  <View style={styles.playerNameCell}>
                    <View style={styles.playerNameContainer}>
                      <View style={[styles.teamLogo, { backgroundColor: getMockDataForLeague(selectedLeague.name).teams.find(t => t.name === player.teamName)?.color || colors.primary }]}>
                        <Text style={styles.teamLogoText}>
                          {getMockDataForLeague(selectedLeague.name).teams.find(t => t.name === player.teamName)?.shortName || player.teamName.substring(0, 3).toUpperCase()}
                        </Text>
                    </View>
                  <Text style={[styles.playerName, { color: colors.text }]}>
                    {player.playerName}
                  </Text>
                </View>
              </View>
                  <View style={styles.playerStatsCell}>
                    <Text style={[styles.playerStats, { color: colors.primary }]}>
                      {playersFilter === 'goals' ? player.goals :
                       playersFilter === 'assists' ? player.assists :
                       playersFilter === 'played' ? player.matchesPlayed :
                       playersFilter === 'yellowCards' ? player.yellowCards :
                       player.redCards}
                </Text>
              </View>
            </View>
                );
              })}
        </View>
          </ScrollView>
        )}

        {activeTab === 'standings' && (
          <ScrollView style={styles.contentContainer}>
            {/* Standings Table */}
        <View style={styles.section}>
              <View style={[styles.tableHeader, { backgroundColor: colors.surface }]}>
                <View style={styles.positionHeader}>
                  <Text style={[styles.headerText, { color: colors.text }]}>#</Text>
                </View>
                <View style={styles.teamHeader}>
                  <Text style={[styles.headerText, { color: colors.text }]}>Team</Text>
                </View>
                <View style={styles.statsHeader}>
                  <Text style={[styles.headerText, { color: colors.text }]}>G</Text>
                </View>
                <View style={styles.statsHeader}>
                  <Text style={[styles.headerText, { color: colors.text }]}>W-D-L</Text>
                </View>
                <View style={styles.statsHeader}>
                  <Text style={[styles.headerText, { color: colors.text }]}>GD</Text>
                </View>
                <View style={styles.statsHeader}>
                  <Text style={[styles.headerText, { color: colors.text }]}>P</Text>
                </View>
              </View>

                      {(selectedLeague.standings.length > 0 ? selectedLeague.standings : getMockDataForLeague(selectedLeague.name).teams.map((team, index) => ({
                        teamId: `team-${selectedLeague.id}-${index}`,
                        team: {
                          id: `team-${selectedLeague.id}-${index}`,
                          name: team.name,
                          logo: '',
                          color: team.color,
                          description: `${team.name} professional football team`,
                          players: [],
                          createdAt: new Date(),
                          updatedAt: new Date(),
                        },
                        matchesPlayed: Math.floor(Math.random() * 10) + 5,
                        wins: Math.floor(Math.random() * 8) + 1,
                        draws: Math.floor(Math.random() * 3),
                        losses: Math.floor(Math.random() * 5),
                        goalsFor: Math.floor(Math.random() * 20) + 5,
                        goalsAgainst: Math.floor(Math.random() * 15) + 2,
                        goalDifference: 0,
                        points: 0,
                      })).map(standing => {
                        standing.points = standing.wins * 3 + standing.draws;
                        standing.goalDifference = standing.goalsFor - standing.goalsAgainst;
                        return standing;
                      }).sort((a, b) => {
                        if (b.points !== a.points) return b.points - a.points;
                        return b.goalDifference - a.goalDifference;
                      }))
                      .filter(standing => {
                        // Only search filter, no team filter
                        return !searchQuery.trim() || 
                          standing.team.name.toLowerCase().includes(searchQuery.toLowerCase());
                      })
                      .map((standing, index) => {
                        const isSelected = selectedTeams.includes(standing.team.name);
                        return (
                <View key={index} style={[
                  styles.standingRow, 
                  { 
                    backgroundColor: isSelected ? colors.primary + '20' : colors.surface,
                    borderLeftWidth: isSelected ? 4 : 0,
                    borderLeftColor: isSelected ? colors.primary : 'transparent'
                  }
                ]}>
                  <View style={styles.positionContainer}>
              <Text style={[styles.position, { color: colors.text }]}>
                {index + 1}
              </Text>
                  </View>
                  <View style={styles.teamContainer}>
                    <View style={[styles.teamLogo, { backgroundColor: standing.team.color || colors.primary }]}>
                      <Text style={styles.teamLogoText}>
{getMockDataForLeague(selectedLeague.name).teams.find(t => t.name === standing.team.name)?.shortName || standing.team.name.substring(0, 3).toUpperCase()}
                      </Text>
                    </View>
              <Text style={[styles.teamName, { color: colors.text }]}>
                {standing.team.name}
              </Text>
                  </View>
                  <View style={styles.statsContainer}>
                    <Text style={[styles.stat, { color: colors.text }]}>
                      {standing.matchesPlayed || 0}
                    </Text>
                  </View>
                  <View style={styles.statsContainer}>
                    <Text style={[styles.stat, { color: colors.text }]}>
                      {standing.wins || 0}-{standing.draws || 0}-{standing.losses || 0}
                    </Text>
                  </View>
                  <View style={styles.statsContainer}>
                    <Text style={[styles.stat, { color: colors.text }]}>
                      {standing.goalDifference || 0}
                    </Text>
                  </View>
                  <View style={styles.statsContainer}>
              <Text style={[styles.points, { color: colors.primary }]}>
                      {standing.points || 0}
              </Text>
            </View>
            </View>
                );
              })}
        </View>
          </ScrollView>
        )}

        {/* Filter Modal */}
        {showFilterModal && (
          <View style={styles.modalOverlay}>
            <View style={[styles.modalBackground, { backgroundColor: 'rgba(0,0,0,0.5)' }]} />
            <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
              <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
                <TouchableOpacity onPress={() => setShowFilterModal(false)}>
                  <Ionicons name="close" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.modalTitle, { color: colors.text }]}>
                  {activeTab === 'players' ? getText('selectPlayers') : 
                   activeTab === 'standings' ? getText('selectTeams') :
                   getText('selectTeams')}
                </Text>
                <View style={{ width: 24 }} />
              </View>

              <View style={styles.modalBody}>
                {activeTab === 'players' && (
                  <>
                    <Text style={[styles.filterSectionTitle, { color: colors.text }]}>{getText('playerName')}</Text>
                    {getMockDataForLeague(selectedLeague?.name || '').players.map((player, index) => (
                      <TouchableOpacity
                        key={index}
                        style={[styles.filterItem, { backgroundColor: colors.background }]}
                        onPress={() => {
                          const isSelected = selectedPlayers.includes(player.name);
                          if (isSelected) {
                            setSelectedPlayers(selectedPlayers.filter(p => p !== player.name));
                          } else {
                            setSelectedPlayers([...selectedPlayers, player.name]);
                          }
                        }}
                      >
                        <View style={[styles.teamLogo, { backgroundColor: getMockDataForLeague(selectedLeague?.name || '').teams.find(t => t.name === player.team)?.color || colors.primary }]}>
                          <Text style={styles.teamLogoText}>
                            {getMockDataForLeague(selectedLeague?.name || '').teams.find(t => t.name === player.team)?.shortName || player.team.substring(0, 3).toUpperCase()}
                          </Text>
                        </View>
                        <Text style={[styles.filterItemText, { color: colors.text }]}>{player.name}</Text>
                        <View style={[styles.checkbox, { borderColor: colors.primary }]}>
                          {selectedPlayers.includes(player.name) && (
                            <Ionicons name="checkmark" size={16} color={colors.primary} />
                          )}
                        </View>
                      </TouchableOpacity>
                    ))}
                  </>
                )}

                {activeTab === 'standings' && (
                  <>
                    <Text style={[styles.filterSectionTitle, { color: colors.text }]}>{getText('team')}</Text>
                    {getMockDataForLeague(selectedLeague?.name || '').teams.map((team, index) => (
                      <TouchableOpacity
                        key={index}
                        style={[styles.filterItem, { backgroundColor: colors.background }]}
                        onPress={() => {
                          const isSelected = selectedTeams.includes(team.name);
                          if (isSelected) {
                            setSelectedTeams(selectedTeams.filter(t => t !== team.name));
                          } else {
                            setSelectedTeams([...selectedTeams, team.name]);
                          }
                        }}
                      >
                        <View style={[styles.teamLogo, { backgroundColor: team.color }]}>
                          <Text style={styles.teamLogoText}>{team.shortName}</Text>
        </View>
                        <Text style={[styles.filterItemText, { color: colors.text }]}>{team.name}</Text>
                        <View style={[styles.checkbox, { borderColor: colors.primary }]}>
                          {selectedTeams.includes(team.name) && (
                            <Ionicons name="checkmark" size={16} color={colors.primary} />
                          )}
                        </View>
                      </TouchableOpacity>
                    ))}
                  </>
                )}

                {activeTab === 'matches' && (
                  <>
                    <Text style={[styles.filterSectionTitle, { color: colors.text }]}>Jamoalar</Text>
                    {getMockDataForLeague(selectedLeague?.name || '').teams.map((team, index) => (
                      <TouchableOpacity
                        key={index}
                        style={[styles.filterItem, { backgroundColor: colors.background }]}
                        onPress={() => {
                          const isSelected = selectedTeams.includes(team.name);
                          if (isSelected) {
                            setSelectedTeams(selectedTeams.filter(t => t !== team.name));
                          } else {
                            setSelectedTeams([...selectedTeams, team.name]);
                          }
                        }}
                      >
                        <View style={[styles.teamLogo, { backgroundColor: team.color }]}>
                          <Text style={styles.teamLogoText}>{team.shortName}</Text>
                        </View>
                        <Text style={[styles.filterItemText, { color: colors.text }]}>{team.name}</Text>
                        <View style={[styles.checkbox, { borderColor: colors.primary }]}>
                          {selectedTeams.includes(team.name) && (
                            <Ionicons name="checkmark" size={16} color={colors.primary} />
                          )}
                        </View>
                      </TouchableOpacity>
                    ))}
                  </>
                )}
              </View>

              <View style={[styles.modalFooter, { borderTopColor: colors.border }]}>
                <TouchableOpacity
                  style={[styles.modalIconButton, { backgroundColor: colors.background }]}
                  onPress={() => {
                    if (activeTab === 'players') {
                      setSelectedPlayers([]);
                    } else {
                      setSelectedTeams([]);
                    }
                  }}
                >
                  <Ionicons name="close-circle-outline" size={24} color={colors.text} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalIconButton, { backgroundColor: colors.primary }]}
                  onPress={() => setShowFilterModal(false)}
                >
                  <Ionicons name="checkmark-circle" size={24} color="white" />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
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
        <View style={[styles.titleHeader, { backgroundColor: colors.header, borderBottomColor: colors.border }]}>
          <Text style={[styles.title, { color: colors.text }]}>{getText('tournament')}</Text>
        </View>
        
        <View style={styles.list}>
          {Array.from({ length: 4 }).map((_, index) => (
            <View key={index} style={[styles.leagueItem, { backgroundColor: colors.surface }]}>
              <View style={styles.leagueHeader}>
                <View style={[styles.skeletonText, { backgroundColor: colors.border, width: 150, height: 20 }]} />
                <View style={[styles.skeletonText, { backgroundColor: colors.border, width: 20, height: 20 }]} />
              </View>
              <View style={[styles.skeletonText, { backgroundColor: colors.border, width: 200, height: 16, marginBottom: 8 }]} />
              <View style={styles.leagueStats}>
                <View style={[styles.skeletonText, { backgroundColor: colors.border, width: 80, height: 14 }]} />
                <View style={[styles.skeletonText, { backgroundColor: colors.border, width: 80, height: 14 }]} />
              </View>
            </View>
          ))}
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
        <Text style={[styles.title, { color: colors.text }]}>{getText('tournament')}</Text>
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
    fontSize: 12,
    fontWeight: 'bold',
  },
  topThreePosition: {
    color: '#FFD700',
  },
  teamContainer: {
    flex: 2,
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
    width: 50,
    alignItems: 'center',
  },
  stat: {
    textAlign: 'center',
    fontSize: 12,
  },
  points: {
    fontWeight: 'bold',
  },
  headerText: {
    fontSize: 10,
    fontWeight: 'bold',
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
  leagueInfo: {
    flex: 1,
  },
  leagueName: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  roundInfo: {
    marginTop: 4,
  },
  roundText: {
    fontSize: 14,
    fontWeight: '600',
  },
  subLeaguesContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  subLeagueItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    marginBottom: 6,
    borderRadius: 8,
  },
  subLeagueInfo: {
    flex: 1,
  },
  subLeagueName: {
    fontSize: 16,
    fontWeight: '500',
  },
  subLeagueRound: {
    fontSize: 12,
    marginTop: 2,
  },
  leagueTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  currentRoundText: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 4,
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
    fontSize: 11,
    fontWeight: '500',
  },
  playerTeam: {
    fontSize: 12,
    marginTop: 2,
  },
  playerStatsContainer: {
    alignItems: 'center',
  },
  playerGoals: {
    fontSize: 12,
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
  seasonPicker: {
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 8,
    paddingVertical: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  seasonOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 6,
    marginHorizontal: 8,
    marginVertical: 2,
  },
  seasonOptionText: {
    fontSize: 14,
    fontWeight: '500',
  },
  tabContainer: {
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  tabContentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tab: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
    minWidth: 80,
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
  skeletonText: {
    borderRadius: 4,
    marginBottom: 4,
  },
  overviewCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  overviewText: {
    fontSize: 16,
    marginBottom: 8,
    fontWeight: '500',
  },
  contentContainer: {
    flex: 1,
  },
  searchContainer: {
    flexDirection: 'row',
    padding: 16,
    alignItems: 'center',
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginRight: 12,
  },
  searchPlaceholder: {
    marginLeft: 8,
    fontSize: 16,
  },
  goalsFilter: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  goalsFilterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  goalsFilterText: {
    marginLeft: 8,
    marginRight: 4,
    fontSize: 16,
    fontWeight: '500',
  },
  filterOptions: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    maxHeight: 300,
  },
  filterOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    marginBottom: 6,
  },
  filterOptionText: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '500',
  },
  overviewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  overviewLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  overviewValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  stateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  contactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
  },
  contactInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  contactLogo: {
    width: 40,
    height: 40,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  contactLogoText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  contactDetails: {
    flex: 1,
  },
  contactName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  contactTitle: {
    fontSize: 14,
  },
  contactButton: {
    padding: 12,
    borderRadius: 8,
  },
  matchCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  matchHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  matchStage: {
    fontSize: 14,
    fontWeight: '500',
  },
  matchDateTime: {
    fontSize: 14,
  },
  matchTeams: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  teamInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  teamLogo: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 8,
  },
  teamLogoText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  matchScore: {
    alignItems: 'center',
    minWidth: 60,
  },
  scoreText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  matchVenue: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  venueText: {
    marginLeft: 4,
    fontSize: 14,
  },
  tableHeader: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 8,
  },
  positionHeader: {
    width: 30,
    alignItems: 'center',
  },
  teamHeader: {
    flex: 2,
    marginLeft: 8,
  },
  statsHeader: {
    width: 50,
    alignItems: 'center',
  },
  playerTeamInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  // Players table styles
  playersTableHeader: {
    flexDirection: 'row',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 6,
    alignItems: 'center',
  },
  playerRankHeader: {
    width: 30,
    alignItems: 'center',
  },
  playerNameHeader: {
    flex: 3,
    marginLeft: 8,
  },
  playerGoalsHeader: {
    width: 60,
    alignItems: 'center',
  },
  playerAssistsHeader: {
    width: 60,
    alignItems: 'center',
  },
  playerTableRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 3,
    alignItems: 'center',
  },
  playerRankCell: {
    width: 30,
    alignItems: 'center',
  },
  playerNameCell: {
    flex: 3,
    marginLeft: 8,
  },
  playerNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  playerGoalsCell: {
    width: 60,
    alignItems: 'center',
  },
  playerAssistsCell: {
    width: 60,
    alignItems: 'center',
  },
  playerAssists: {
    fontSize: 12,
    fontWeight: '500',
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioButtonInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  playerStatsHeader: {
    width: 60,
    alignItems: 'center',
  },
  playerStatsCell: {
    width: 60,
    alignItems: 'center',
  },
  playerStats: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  // Search input styles
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    flex: 1,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    paddingVertical: 4,
  },
  // Modal styles
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
    paddingTop: 50,
    paddingBottom: 150,
    backgroundColor: 'transparent',
  },
  modalBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  modalContent: {
    width: '90%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    marginBottom: 100,
    marginHorizontal: 16,
    maxHeight: '70%',
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
  },
  modalBody: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
    borderTopWidth: 1,
    gap: 16,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  modalIconButton: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  filterItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 8,
    minHeight: 60,
  },
  filterItemText: {
    flex: 1,
    marginLeft: 16,
    fontSize: 16,
    fontWeight: '500',
  },
  checkbox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default StandingsScreen;
