import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, Image, TextInput } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../store/useThemeStore';
import { mongodbService } from '../services/mongodbService';

interface Tournament {
  _id: string;
  name: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  location?: string;
  maxTeams?: number;
  status: 'active' | 'inactive' | 'completed';
  leagueId: string;
  logo?: string;
  createdAt: string;
  updatedAt: string;
}

interface Match {
  _id: string;
  homeTeamName: string;
  awayTeamName: string;
  homeScore: number;
  awayScore: number;
  matchDate: string;
  venue?: string;
  status: 'finished' | 'upcoming';
  round: string;
}

const TournamentDetailScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { colors } = useTheme();
  const { tournamentId, tournamentName, leagueName } = route.params as { 
    tournamentId: string; 
    tournamentName: string;
    leagueName: string;
  };

  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'standings' | 'players' | 'matches'>('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRound, setSelectedRound] = useState<string>('all');
  const [showRoundFilter, setShowRoundFilter] = useState(false);
  const [selectedPlayerFilter, setSelectedPlayerFilter] = useState<string>('goals');
  const [showPlayerFilter, setShowPlayerFilter] = useState(false);

  useEffect(() => {
    navigation.setOptions({ 
      title: tournamentName,
      headerStyle: {
        backgroundColor: colors.header,
      },
      headerTintColor: colors.text,
    });
    fetchTournamentDetails();
  }, [tournamentId, tournamentName]);

  // WebSocket event handlers
  useEffect(() => {
    // Connect to WebSocket
    websocketService.connect();
    
    // Join tournament room
    websocketService.joinTournament(tournamentId);
    
    // Set up event listeners
    const handleStandingsUpdate = (data: any) => {
      console.log('📊 Tournament standings updated via WebSocket:', data);
      if (data.tournamentId === tournamentId) {
        // Refresh tournament details to get updated standings
        fetchTournamentDetails();
      }
    };
    
    const handleTopScorersUpdate = (data: any) => {
      console.log('🥅 Tournament top scorers updated via WebSocket:', data);
      if (data.tournamentId === tournamentId) {
        // Refresh tournament details to get updated top scorers
        fetchTournamentDetails();
      }
    };
    
    const handleTopAssistsUpdate = (data: any) => {
      console.log('🎯 Tournament top assists updated via WebSocket:', data);
      if (data.tournamentId === tournamentId) {
        // Refresh tournament details to get updated top assists
        fetchTournamentDetails();
      }
    };
    
    const handleMatchFinished = (data: any) => {
      console.log('⚽ Tournament match finished via WebSocket:', data);
      if (data.tournamentId === tournamentId) {
        // Refresh tournament details to get updated matches
        fetchTournamentDetails();
      }
    };
    
    // Register event listeners
    websocketService.on('standings-updated', handleStandingsUpdate);
    websocketService.on('top-scorers-updated', handleTopScorersUpdate);
    websocketService.on('top-assists-updated', handleTopAssistsUpdate);
    websocketService.on('match-finished', handleMatchFinished);
    
    // Cleanup on unmount
    return () => {
      websocketService.off('standings-updated', handleStandingsUpdate);
      websocketService.off('top-scorers-updated', handleTopScorersUpdate);
      websocketService.off('top-assists-updated', handleTopAssistsUpdate);
      websocketService.off('match-finished', handleMatchFinished);
      
      // Leave tournament room
      websocketService.leaveTournament(tournamentId);
    };
  }, [tournamentId]);

  const fetchTournamentDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('Fetching tournament details for:', tournamentId);
      
      const result = await mongodbService.getTournamentById(tournamentId);
      if (result.success && result.data) {
        console.log('Tournament details fetched successfully:', result.data);
        setTournament(result.data);
      } else {
        console.error('Failed to fetch tournament details:', result.error);
        setError(result.error || 'Turnir ma\'lumotlarini yuklashda xatolik yuz berdi.');
      }
    } catch (err: any) {
      console.error('Error fetching tournament details:', err);
      setError('Turnir ma\'lumotlarini yuklashda kutilmagan xatolik yuz berdi.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
          Turnir ma'lumotlari yuklanmoqda...
        </Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <Ionicons name="alert-circle-outline" size={48} color={colors.error} />
        <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
        <TouchableOpacity 
          onPress={fetchTournamentDetails} 
          style={[styles.retryButton, { backgroundColor: colors.primary }]}
        >
          <Text style={styles.retryButtonText}>Qayta urinish</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!tournament) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <Ionicons name="sad-outline" size={48} color={colors.textSecondary} />
        <Text style={[styles.errorText, { color: colors.textSecondary }]}>
          Turnir topilmadi.
        </Text>
      </View>
    );
  }

  const getStatusText = (status: 'active' | 'inactive' | 'completed') => {
    switch (status) {
      case 'active': return 'Jarayonda';
      case 'inactive': return 'Nofaol';
      case 'completed': return 'Tugallangan';
      default: return 'Noma\'lum';
    }
  };

  const getStatusColor = (status: 'active' | 'inactive' | 'completed') => {
    switch (status) {
      case 'active': return '#4CAF50';
      case 'inactive': return '#9E9E9E';
      case 'completed': return '#2196F3';
      default: return '#9E9E9E';
    }
  };

  // Mock data for recent matches
  // Mock data function from StandingsScreen
  const getMockDataForTournament = (tournamentName: string) => {
    // HFL 3-liga teams
    if (tournamentName.includes('3-liga') || tournamentName.includes('3 Liga')) {
      return {
        teams: [
          { name: 'TTH', color: '#132257', shortName: 'TTH', points: 9, played: 3, won: 3, drawn: 0, lost: 0, goalsFor: 8, goalsAgainst: 2 },
          { name: 'BOL', color: '#A020F0', shortName: 'BOL', points: 6, played: 3, won: 2, drawn: 0, lost: 1, goalsFor: 5, goalsAgainst: 3 },
          { name: 'SVL', color: '#FF0000', shortName: 'SVL', points: 3, played: 3, won: 1, drawn: 0, lost: 2, goalsFor: 4, goalsAgainst: 6 },
          { name: 'MNC', color: '#6CABDD', shortName: 'MNC', points: 0, played: 3, won: 0, drawn: 0, lost: 3, goalsFor: 2, goalsAgainst: 8 },
        ],
        players: [
          { name: 'MAMARAJABOV LATIF', team: 'TTH', goals: 7, assists: 2, played: 3 },
          { name: 'AKHMADJONOV ASADBEK', team: 'BOL', goals: 4, assists: 1, played: 3 },
          { name: 'RUZMATOV ASROR', team: 'SVL', goals: 3, assists: 3, played: 3 },
          { name: 'SHAAHMEDOV SANJAR', team: 'MNC', goals: 3, assists: 2, played: 3 },
          { name: 'VALIYEV OBID', team: 'TTH', goals: 3, assists: 2, played: 3 },
          { name: 'BERDIMURODOV SHUNQORBEK', team: 'BOL', goals: 3, assists: 0, played: 3 },
          { name: 'BAXTIYOROV BURXON', team: 'SVL', goals: 3, assists: 0, played: 3 },
          { name: 'QOLDOSHEV SHAXRIDDIN', team: 'MNC', goals: 2, assists: 3, played: 3 },
          { name: 'DANISHOV SOHIB', team: 'TTH', goals: 2, assists: 2, played: 3 },
          { name: 'XOJIMAMATOV AZIZ', team: 'BOL', goals: 2, assists: 2, played: 3 },
          { name: 'SALIMOV SARDOR', team: 'SVL', goals: 2, assists: 1, played: 3 },
          { name: 'MUXTOROV JAHONGIR', team: 'MNC', goals: 2, assists: 1, played: 3 },
          { name: 'BOYMATOV SUNNATILLA', team: 'TTH', goals: 2, assists: 1, played: 3 },
          { name: 'ABZALOV HUSNIDDIN', team: 'BOL', goals: 2, assists: 0, played: 3 },
          { name: 'SHUKUROV JAKHONGIR', team: 'SVL', goals: 2, assists: 0, played: 3 },
        ],
        matches: [
          { home: 'TTH', away: 'BOL', homeScore: 2, awayScore: 1, date: new Date('2024-07-13T21:20:00'), venue: 'Qo\'yliq, Поле 1', stage: 'final' },
          { home: 'SVL', away: 'MNC', homeScore: 1, awayScore: 3, date: new Date('2024-07-06T20:10:00'), venue: 'Qo\'yliq, Поле 1', stage: 'semifinal' },
          { home: 'TTH', away: 'SVL', homeScore: 3, awayScore: 1, date: new Date('2024-07-01T19:00:00'), venue: 'Qo\'yliq, Поле 1', stage: 'group' },
        ]
      };
    }
    
    // HFL Pro Liga teams
    if (tournamentName.includes('Pro Liga') || tournamentName.includes('Pro')) {
      return {
        teams: [
          { name: 'FC CARAVAN', color: '#1E3A8A', shortName: 'CAR', points: 9, played: 3, won: 3, drawn: 0, lost: 0, goalsFor: 13, goalsAgainst: 3 },
          { name: 'FC SHEROV', color: '#7C2D12', shortName: 'SHE', points: 9, played: 3, won: 3, drawn: 0, lost: 0, goalsFor: 11, goalsAgainst: 3 },
          { name: 'SERGELI 2', color: '#F59E0B', shortName: 'SER', points: 7, played: 3, won: 2, drawn: 1, lost: 0, goalsFor: 8, goalsAgainst: 3 },
          { name: 'BO\'ZSUV', color: '#DC2626', shortName: 'BOZ', points: 6, played: 3, won: 2, drawn: 0, lost: 1, goalsFor: 11, goalsAgainst: 3 },
          { name: 'NAZARBEK', color: '#000000', shortName: 'NAZ', points: 6, played: 3, won: 2, drawn: 0, lost: 1, goalsFor: 11, goalsAgainst: 3 },
          { name: 'OQIBAT', color: '#F59E0B', shortName: 'OQI', points: 6, played: 3, won: 2, drawn: 0, lost: 1, goalsFor: 4, goalsAgainst: 3 },
          { name: 'FC LIFE TIME', color: '#1E40AF', shortName: 'LIF', points: 5, played: 3, won: 1, drawn: 2, lost: 0, goalsFor: 12, goalsAgainst: 3 },
          { name: 'QURUVCHI', color: '#F59E0B', shortName: 'QUR', points: 5, played: 3, won: 1, drawn: 2, lost: 0, goalsFor: 3, goalsAgainst: 3 },
          { name: 'PORTO', color: '#1E40AF', shortName: 'POR', points: 4, played: 3, won: 1, drawn: 1, lost: 1, goalsFor: 3, goalsAgainst: 3 },
          { name: 'ATHLETIC TASHKENT', color: '#DC2626', shortName: 'ATH', points: 3, played: 3, won: 1, drawn: 0, lost: 2, goalsFor: 8, goalsAgainst: 3 },
          { name: 'MANCHESTER UNITED', color: '#DC2626', shortName: 'MAN', points: 3, played: 3, won: 1, drawn: 0, lost: 2, goalsFor: 2, goalsAgainst: 6 },
          { name: 'EAGLES', color: '#F59E0B', shortName: 'EAG', points: 3, played: 3, won: 1, drawn: 0, lost: 2, goalsFor: 2, goalsAgainst: 6 },
          { name: 'FC 92', color: '#F59E0B', shortName: '92', points: 3, played: 3, won: 1, drawn: 0, lost: 2, goalsFor: 1, goalsAgainst: 6 },
          { name: 'FC BRIGHTON', color: '#1E40AF', shortName: 'BRI', points: 0, played: 3, won: 0, drawn: 0, lost: 3, goalsFor: 0, goalsAgainst: 7 },
        ],
        players: [
          { name: 'VALIYEV OBID', team: 'FC CARAVAN', goals: 8, assists: 2, played: 3 },
          { name: 'BERDIMURODOV SHUNQORBEK', team: 'FC SHEROV', goals: 6, assists: 0, played: 3 },
          { name: 'BAXTIYOROV BURXON', team: 'SERGELI 2', goals: 5, assists: 0, played: 3 },
          { name: 'QOLDOSHEV SHAXRIDDIN', team: 'BO\'ZSUV', goals: 4, assists: 3, played: 3 },
          { name: 'DANISHOV SOHIB', team: 'NAZARBEK', goals: 4, assists: 2, played: 3 },
          { name: 'XOJIMAMATOV AZIZ', team: 'OQIBAT', goals: 3, assists: 2, played: 3 },
          { name: 'SALIMOV SARDOR', team: 'FC LIFE TIME', goals: 3, assists: 1, played: 3 },
          { name: 'MUXTOROV JAHONGIR', team: 'QURUVCHI', goals: 3, assists: 1, played: 3 },
          { name: 'BOYMATOV SUNNATILLA', team: 'PORTO', goals: 2, assists: 2, played: 3 },
          { name: 'ABZALOV HUSNIDDIN', team: 'ATHLETIC TASHKENT', goals: 2, assists: 1, played: 3 },
          { name: 'SHUKUROV JAKHONGIR', team: 'MANCHESTER UNITED', goals: 2, assists: 1, played: 3 },
          { name: 'MAMARAJABOV LATIF', team: 'EAGLES', goals: 2, assists: 0, played: 3 },
          { name: 'AKHMADJONOV ASADBEK', team: 'FC 92', goals: 2, assists: 0, played: 3 },
          { name: 'RUZMATOV ASROR', team: 'FC BRIGHTON', goals: 1, assists: 1, played: 3 },
          { name: 'SHAAHMEDOV SANJAR', team: 'FC CARAVAN', goals: 1, assists: 0, played: 3 },
        ],
        matches: [
          { home: 'PMA', away: 'AGR', homeScore: 3, awayScore: 1, date: new Date('2024-07-12T21:20:00'), venue: 'Lokomotiv, Поле 1', stage: 'final' },
          { home: 'LPL', away: 'BJU', homeScore: 2, awayScore: 0, date: new Date('2024-07-05T20:10:00'), venue: 'Qo\'yliq, Поле 2', stage: 'semifinal' },
          { home: 'PMA', away: 'LPL', homeScore: 4, awayScore: 1, date: new Date('2024-06-30T19:00:00'), venue: 'Lokomotiv, Поле 1', stage: 'group' },
        ]
      };
    }
    
    // Default fallback
    return {
      teams: [
        { name: 'Default Team 1', color: '#3B82F6', shortName: 'DT1', points: 6, played: 2, won: 2, drawn: 0, lost: 0, goalsFor: 4, goalsAgainst: 1 },
        { name: 'Default Team 2', color: '#EF4444', shortName: 'DT2', points: 3, played: 2, won: 1, drawn: 0, lost: 1, goalsFor: 3, goalsAgainst: 3 },
        { name: 'Default Team 3', color: '#10B981', shortName: 'DT3', points: 3, played: 2, won: 1, drawn: 0, lost: 1, goalsFor: 2, goalsAgainst: 2 },
        { name: 'Default Team 4', color: '#F59E0B', shortName: 'DT4', points: 0, played: 2, won: 0, drawn: 0, lost: 2, goalsFor: 1, goalsAgainst: 4 },
      ],
      players: [
        { name: 'Default Player 1', team: 'Default Team 1', goals: 5, assists: 1, played: 2 },
        { name: 'Default Player 2', team: 'Default Team 2', goals: 4, assists: 0, played: 2 },
        { name: 'Default Player 3', team: 'Default Team 3', goals: 3, assists: 2, played: 2 },
        { name: 'Default Player 4', team: 'Default Team 4', goals: 2, assists: 1, played: 2 },
      ],
      matches: [
        { home: 'Default Team 1', away: 'Default Team 2', homeScore: 2, awayScore: 1, date: new Date('2024-07-06T21:20:00'), venue: 'Default Venue', stage: 'final' },
        { home: 'Default Team 3', away: 'Default Team 4', homeScore: 1, awayScore: 0, date: new Date('2024-07-05T19:00:00'), venue: 'Default Venue', stage: 'semifinal' },
      ]
    };
  };

  const mockData = getMockDataForTournament(tournamentName);
  const recentMatches: Match[] = mockData.matches.map((match, index) => ({
    _id: `m${index + 1}`,
    homeTeamName: match.home,
    awayTeamName: match.away,
    homeScore: match.homeScore,
    awayScore: match.awayScore,
    matchDate: match.date.toISOString(),
    venue: match.venue,
    status: 'finished' as const,
    round: match.stage
  }));

  // Helper functions for player table
  const getTeamColor = (teamName: string) => {
    const team = mockData.teams.find(t => t.name === teamName);
    return team ? team.color : '#3B82F6';
  };

  const getTeamShortName = (teamName: string) => {
    const team = mockData.teams.find(t => t.name === teamName);
    return team ? team.shortName : teamName.substring(0, 3).toUpperCase();
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <ScrollView 
            style={styles.tabContent} 
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 0 }}
          >
            {/* Umumiy ko'rinish */}
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Umumiy ko'rinish</Text>
            <View style={[styles.card, { backgroundColor: colors.surface }]}>
              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Boshlanish sanasi:</Text>
                <Text style={[styles.infoValue, { color: colors.text }]}>
                  {tournament?.startDate ? new Date(tournament.startDate).toLocaleDateString('uz-UZ') : '01/01/2023'}
                </Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Tugash sanasi:</Text>
                <Text style={[styles.infoValue, { color: colors.text }]}>N/A</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Holat:</Text>
                <View style={styles.statusContainer}>
                  <View style={[styles.statusDot, { backgroundColor: '#4CAF50' }]} />
                  <Text style={[styles.infoValue, { color: '#4CAF50' }]}>Jarayonda</Text>
                </View>
              </View>
              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Jamoalar:</Text>
                <Text style={[styles.infoValue, { color: colors.text }]}>4</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>O'yinlar:</Text>
                <Text style={[styles.infoValue, { color: colors.text }]}>1/0</Text>
              </View>
            </View>

            {/* Kontaktlar */}
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Kontaktlar</Text>
            <View style={[styles.card, styles.contactCard, { backgroundColor: colors.surface }]}>
              <View style={styles.contactInfo}>
                <View style={[styles.contactLogoContainer, { backgroundColor: colors.primary }]}>
                  <Text style={styles.contactLogoText}>HFL</Text>
                </View>
                <View style={styles.contactDetails}>
                  <Text style={[styles.contactName, { color: colors.text }]}>Liga admini</Text>
                  <Text style={[styles.contactRole, { color: colors.textSecondary }]}>Liga admini</Text>
                </View>
              </View>
              <TouchableOpacity style={[styles.callButton, { backgroundColor: colors.primary }]}>
                <Ionicons name="call" size={20} color="white" />
              </TouchableOpacity>
            </View>

            {/* Oxirgi o'yinlar */}
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Oxirgi o'yinlar</Text>
            <View style={[styles.card, styles.matchCard, { backgroundColor: colors.surface, marginBottom: 0 }]}>
              <View style={styles.matchHeader}>
                <Text style={[styles.matchRound, { color: colors.textSecondary }]}>final</Text>
                <Text style={[styles.matchDateTime, { color: colors.textSecondary }]}>06/07/2024 21:20</Text>
              </View>
              <View style={styles.matchTeams}>
                <View style={styles.teamScore}>
                  <View style={[styles.teamLogoPlaceholder, { backgroundColor: colors.primary }]}>
                    <Text style={styles.teamLogoTextSmall}>DT1</Text>
                  </View>
                  <Text style={[styles.teamName, { color: colors.text }]}>Default Team 1</Text>
                </View>
                <Text style={[styles.matchScore, { color: colors.text }]}>2:1</Text>
                <View style={styles.teamScore}>
                  <Text style={[styles.teamName, { color: colors.text }]}>Default Team 2</Text>
                  <View style={[styles.teamLogoPlaceholder, { backgroundColor: colors.primary }]}>
                    <Text style={styles.teamLogoTextSmall}>DT2</Text>
                  </View>
                </View>
              </View>
            </View>
          </ScrollView>
        );

      case 'standings':
        return (
          <ScrollView 
            style={styles.tabContent} 
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 0 }}
          >
            {/* Filter Section */}
            <View style={[styles.filterSection, { backgroundColor: colors.surface }]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Reyting</Text>
              <TouchableOpacity 
                style={[styles.filterButton, { backgroundColor: colors.primary }]}
                onPress={() => setShowRoundFilter(!showRoundFilter)}
              >
                <Text style={styles.filterButtonText}>
                  {selectedRound === 'all' ? 'Barcha turlar' : `${selectedRound}-tur`}
                </Text>
                <Ionicons name={showRoundFilter ? "chevron-up" : "chevron-down"} size={16} color="white" />
              </TouchableOpacity>
            </View>

            {/* Round Filter Options */}
            {showRoundFilter && (
              <View style={[styles.filterOptions, { backgroundColor: colors.surface }]}>
                <TouchableOpacity 
                  style={[styles.filterOption, selectedRound === 'all' && styles.selectedFilterOption]}
                  onPress={() => {
                    setSelectedRound('all');
                    setShowRoundFilter(false);
                  }}
                >
                  <Text style={[styles.filterOptionText, selectedRound === 'all' && styles.selectedFilterOptionText]}>
                    Barcha turlar
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.filterOption, selectedRound === '1' && styles.selectedFilterOption]}
                  onPress={() => {
                    setSelectedRound('1');
                    setShowRoundFilter(false);
                  }}
                >
                  <Text style={[styles.filterOptionText, selectedRound === '1' && styles.selectedFilterOptionText]}>
                    1-tur
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.filterOption, selectedRound === '2' && styles.selectedFilterOption]}
                  onPress={() => {
                    setSelectedRound('2');
                    setShowRoundFilter(false);
                  }}
                >
                  <Text style={[styles.filterOptionText, selectedRound === '2' && styles.selectedFilterOptionText]}>
                    2-tur
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.filterOption, selectedRound === '3' && styles.selectedFilterOption]}
                  onPress={() => {
                    setSelectedRound('3');
                    setShowRoundFilter(false);
                  }}
                >
                  <Text style={[styles.filterOptionText, selectedRound === '3' && styles.selectedFilterOptionText]}>
                    3-tur
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            <View style={[styles.card, { backgroundColor: colors.surface, marginBottom: 0 }]}>
              {/* Table Header */}
              <View style={[styles.tableHeader, { borderBottomColor: colors.border, backgroundColor: colors.surface }]}>
                <Text style={[styles.rankHeader, { color: colors.text }]}>#</Text>
                <Text style={[styles.teamHeader, { color: colors.text }]}>JAMOA</Text>
                <Text style={[styles.numberHeader, { color: colors.text }]}>O'</Text>
                <Text style={[styles.numberHeader, { color: colors.text }]}>T/N</Text>
                <Text style={[styles.numberHeader, { color: colors.text }]}>O</Text>
              </View>
              
              {/* Table Rows */}
              {mockData.teams.map((team, index) => (
                <View key={team.name} style={[styles.tableRow, { borderBottomColor: colors.border }]}>
                  <Text style={[styles.rankCell, { color: colors.text }]}>{index + 1}</Text>
                  <View style={styles.teamCell}>
                    <View style={[styles.teamLogo, { backgroundColor: team.color }]}>
                      <Text style={styles.teamLogoText}>{team.shortName}</Text>
                    </View>
                    <Text style={[styles.teamNameTable, { color: colors.text }]}>{team.name}</Text>
                  </View>
                  <Text style={[styles.numberCell, { color: colors.text }]}>{team.played}</Text>
                  <Text style={[styles.numberCell, { color: colors.text }]}>{team.goalsFor - team.goalsAgainst}</Text>
                  <Text style={[styles.numberCell, { color: colors.text }]}>{team.points}</Text>
                </View>
              ))}
            </View>
          </ScrollView>
        );

      case 'players':
        return (
          <ScrollView 
            style={styles.tabContent} 
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 0 }}
          >
            {/* Filter Section */}
            <View style={[styles.filterSection, { backgroundColor: colors.surface }]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>To'purarlar</Text>
              <TouchableOpacity 
                style={[styles.filterButton, { backgroundColor: colors.primary }]}
                onPress={() => setShowPlayerFilter(!showPlayerFilter)}
              >
                <Text style={styles.filterButtonText}>
                  {selectedPlayerFilter === 'goals' ? 'Gollar' : 
                   selectedPlayerFilter === 'assists' ? 'Assistlar' :
                   selectedPlayerFilter === 'games' ? 'O\'yinlar' :
                   selectedPlayerFilter === 'yellow' ? 'Sariq kartochkalar' :
                   selectedPlayerFilter === 'red' ? 'Qizil kartochkalar' : 'Gollar'}
                </Text>
                <Ionicons 
                  name={showPlayerFilter ? "chevron-up" : "chevron-down"} 
                  size={18} 
                  color="white" 
                  style={{ marginLeft: 4 }}
                />
              </TouchableOpacity>
            </View>

            {/* Player Filter Options */}
            {showPlayerFilter && (
              <View style={[styles.playerFilterOptions, { backgroundColor: colors.header }]}>
                <TouchableOpacity 
                  style={[styles.playerFilterOption, selectedPlayerFilter === 'games' && styles.selectedPlayerFilterOption]}
                  onPress={() => {
                    setSelectedPlayerFilter('games');
                    setShowPlayerFilter(false);
                  }}
                >
                  <Ionicons name="trophy" size={20} color={colors.text} style={styles.filterIcon} />
                  <Text style={[styles.playerFilterOptionText, selectedPlayerFilter === 'games' && styles.selectedPlayerFilterOptionText]}>
                    O'yinlar
                  </Text>
                  <View style={[styles.radioButton, selectedPlayerFilter === 'games' && styles.selectedRadioButton]}>
                    {selectedPlayerFilter === 'games' && <View style={styles.radioButtonInner} />}
                  </View>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.playerFilterOption, selectedPlayerFilter === 'goals' && styles.selectedPlayerFilterOption]}
                  onPress={() => {
                    setSelectedPlayerFilter('goals');
                    setShowPlayerFilter(false);
                  }}
                >
                  <Ionicons name="football" size={20} color={colors.text} style={styles.filterIcon} />
                  <Text style={[styles.playerFilterOptionText, selectedPlayerFilter === 'goals' && styles.selectedPlayerFilterOptionText]}>
                    Gollar
                  </Text>
                  <View style={[styles.radioButton, selectedPlayerFilter === 'goals' && styles.selectedRadioButton]}>
                    {selectedPlayerFilter === 'goals' && <View style={styles.radioButtonInner} />}
                  </View>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.playerFilterOption, selectedPlayerFilter === 'assists' && styles.selectedPlayerFilterOption]}
                  onPress={() => {
                    setSelectedPlayerFilter('assists');
                    setShowPlayerFilter(false);
                  }}
                >
                  <Ionicons name="footsteps" size={20} color={colors.text} style={styles.filterIcon} />
                  <Text style={[styles.playerFilterOptionText, selectedPlayerFilter === 'assists' && styles.selectedPlayerFilterOptionText]}>
                    Assistlar
                  </Text>
                  <View style={[styles.radioButton, selectedPlayerFilter === 'assists' && styles.selectedRadioButton]}>
                    {selectedPlayerFilter === 'assists' && <View style={styles.radioButtonInner} />}
                  </View>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.playerFilterOption, selectedPlayerFilter === 'yellow' && styles.selectedPlayerFilterOption]}
                  onPress={() => {
                    setSelectedPlayerFilter('yellow');
                    setShowPlayerFilter(false);
                  }}
                >
                  <View style={[styles.yellowCardIcon, { backgroundColor: '#FFD700' }]} />
                  <Text style={[styles.playerFilterOptionText, selectedPlayerFilter === 'yellow' && styles.selectedPlayerFilterOptionText]}>
                    Sariq kartochkalar
                  </Text>
                  <View style={[styles.radioButton, selectedPlayerFilter === 'yellow' && styles.selectedRadioButton]}>
                    {selectedPlayerFilter === 'yellow' && <View style={styles.radioButtonInner} />}
                  </View>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.playerFilterOption, selectedPlayerFilter === 'red' && styles.selectedPlayerFilterOption]}
                  onPress={() => {
                    setSelectedPlayerFilter('red');
                    setShowPlayerFilter(false);
                  }}
                >
                  <View style={[styles.redCardIcon, { backgroundColor: '#FF0000' }]} />
                  <Text style={[styles.playerFilterOptionText, selectedPlayerFilter === 'red' && styles.selectedPlayerFilterOptionText]}>
                    Qizil kartochkalar
                  </Text>
                  <View style={[styles.radioButton, selectedPlayerFilter === 'red' && styles.selectedRadioButton]}>
                    {selectedPlayerFilter === 'red' && <View style={styles.radioButtonInner} />}
                  </View>
                </TouchableOpacity>
              </View>
            )}

            <View style={[styles.card, { backgroundColor: colors.surface, marginBottom: 0 }]}>
              {/* Players Header */}
              <View style={[styles.playersHeader, { borderBottomColor: colors.border, backgroundColor: colors.surface }]}>
                <Text style={[styles.playerRankHeader, { color: colors.text }]}>#</Text>
                <Text style={[styles.playerNameHeader, { color: colors.text }]}>F.I.O</Text>
                <Text style={[styles.playerGoalsHeader, { color: colors.text }]}>GOLAS</Text>
                <Text style={[styles.playerAssistsHeader, { color: colors.text }]}>ASSISTS</Text>
              </View>
              
              {/* Players Rows */}
              {mockData.players.map((player, index) => (
                <View key={player.name} style={[styles.playerRow, { borderBottomColor: colors.border }]}>
                  <Text style={[styles.playerRankCell, { color: colors.text }]}>{index + 1}</Text>
                  <View style={styles.playerNameCell}>
                    <View style={[styles.playerTeamLogo, { backgroundColor: getTeamColor(player.team) }]}>
                      <Text style={styles.playerTeamLogoText}>{getTeamShortName(player.team)}</Text>
                    </View>
                    <Text style={[styles.playerName, { color: colors.text }]}>{player.name}</Text>
                  </View>
                  <Text style={[styles.playerGoalsCell, { color: colors.primary, fontWeight: 'bold' }]}>{player.goals}</Text>
                  <Text style={[styles.playerAssistsCell, { color: colors.text }]}>{player.assists}</Text>
                </View>
              ))}
            </View>
          </ScrollView>
        );

      case 'matches':
        return (
          <ScrollView 
            style={styles.tabContent} 
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 0 }}
          >
            <Text style={[styles.sectionTitle, { color: colors.text }]}>O'yinlar</Text>
            {recentMatches.map((match, index) => (
              <View key={match._id} style={[styles.card, styles.matchCard, { backgroundColor: colors.surface, marginBottom: index === recentMatches.length - 1 ? 0 : 8 }]}>
                <View style={styles.matchHeader}>
                  <Text style={[styles.matchRound, { color: colors.textSecondary }]}>{match.round}</Text>
                  <Text style={[styles.matchDateTime, { color: colors.textSecondary }]}>
                    {new Date(match.matchDate).toLocaleDateString('uz-UZ')} {new Date(match.matchDate).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>
                <View style={styles.matchTeams}>
                  <View style={styles.teamScore}>
                    <View style={[styles.teamLogoPlaceholder, { backgroundColor: colors.primary }]}>
                      <Text style={styles.teamLogoTextSmall}>{match.homeTeamName.substring(0, 3).toUpperCase()}</Text>
                    </View>
                    <Text style={[styles.teamName, { color: colors.text }]}>{match.homeTeamName}</Text>
                  </View>
                  <Text style={[styles.matchScore, { color: colors.text }]}>{match.homeScore}:{match.awayScore}</Text>
                  <View style={styles.teamScore}>
                    <Text style={[styles.teamName, { color: colors.text }]}>{match.awayTeamName}</Text>
                    <View style={[styles.teamLogoPlaceholder, { backgroundColor: colors.primary }]}>
                      <Text style={styles.teamLogoTextSmall}>{match.awayTeamName.substring(0, 3).toUpperCase()}</Text>
                    </View>
                  </View>
                </View>
                {match.venue && (
                  <Text style={[styles.matchVenueText, { color: colors.textSecondary }]}>{match.venue}</Text>
                )}
              </View>
            ))}
          </ScrollView>
        );

      default:
        return null;
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background, flex: 1 }]}>
      {/* Search Bar */}
      <View style={[styles.searchContainer, { backgroundColor: colors.surface }]}>
        <Ionicons name="search" size={20} color={colors.textSecondary} style={styles.searchIcon} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder="Qidirish"
          placeholderTextColor={colors.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Tab Navigation */}
      <View style={[styles.tabContainer, { backgroundColor: colors.header }]}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabContentContainer}
        >
          <TouchableOpacity
            style={[styles.tab, activeTab === 'overview' && styles.activeTab]}
            onPress={() => setActiveTab('overview')}
          >
            <Text style={[styles.tabText, activeTab === 'overview' && styles.activeTabText, { color: activeTab === 'overview' ? colors.primary : colors.textSecondary }]}>
              Umumiy ko'rinish
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'standings' && styles.activeTab]}
            onPress={() => setActiveTab('standings')}
          >
            <Text style={[styles.tabText, activeTab === 'standings' && styles.activeTabText, { color: activeTab === 'standings' ? colors.primary : colors.textSecondary }]}>
              Reyting
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'players' && styles.activeTab]}
            onPress={() => setActiveTab('players')}
          >
            <Text style={[styles.tabText, activeTab === 'players' && styles.activeTabText, { color: activeTab === 'players' ? colors.primary : colors.textSecondary }]}>
              To'purarlar
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'matches' && styles.activeTab]}
            onPress={() => setActiveTab('matches')}
          >
            <Text style={[styles.tabText, activeTab === 'matches' && styles.activeTabText, { color: activeTab === 'matches' ? colors.primary : colors.textSecondary }]}>
              O'yinlar
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Tab Content */}
      <View style={{ flex: 1 }}>
        {renderTabContent()}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  tabContainer: {
    marginTop: 0,
    marginBottom: 0,
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
  contentContainer: {
    padding: 16,
    paddingBottom: 10, // Further reduced padding
  },
  tabContent: {
    padding: 0,
    paddingTop: 0,
    paddingBottom: 0,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    marginTop: 16,
    paddingTop: 0,
    paddingHorizontal: 16,
  },
  card: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    marginHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  statusContainer: {
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
  },
  contactInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  contactLogoContainer: {
    width: 40,
    height: 40,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    overflow: 'hidden',
  },
  contactLogo: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  contactLogoText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  contactDetails: {
    flex: 1,
  },
  contactName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  contactRole: {
    fontSize: 12,
  },
  callButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  matchCard: {
    paddingVertical: 12,
  },
  matchHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    paddingBottom: 8,
  },
  matchRound: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  matchDateTime: {
    fontSize: 12,
  },
  matchTeams: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  teamScore: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    justifyContent: 'flex-start',
  },
  teamName: {
    fontSize: 14,
    fontWeight: '600',
    marginHorizontal: 8,
    flex: 1,
  },
  matchScore: {
    fontSize: 18,
    fontWeight: 'bold',
    marginHorizontal: 10,
  },
  teamLogoPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  teamLogoTextSmall: {
    fontSize: 10,
    fontWeight: 'bold',
    color: 'white',
  },
  matchVenue: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  venueText: {
    marginLeft: 4,
    fontSize: 12,
  },
  emptyText: {
    marginTop: 10,
    fontSize: 14,
  },
  // Table styles (matching StandingsScreen)
  tableHeader: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
  },
  tableHeaderText: {
    fontSize: 11,
    fontWeight: 'bold',
    textAlign: 'center',
    flex: 1,
    minWidth: 30,
  },
  rankHeader: {
    fontSize: 11,
    fontWeight: 'bold',
    textAlign: 'center',
    width: 30,
  },
  teamHeader: {
    fontSize: 11,
    fontWeight: 'bold',
    textAlign: 'left',
    flex: 1,
    marginLeft: 8,
  },
  numberHeader: {
    fontSize: 11,
    fontWeight: 'bold',
    textAlign: 'center',
    width: 40,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderBottomWidth: 0.5,
    alignItems: 'center',
  },
  tableCell: {
    fontSize: 11,
    textAlign: 'center',
    flex: 1,
    minWidth: 30,
  },
  rankCell: {
    fontSize: 11,
    textAlign: 'center',
    width: 30,
  },
  numberCell: {
    fontSize: 11,
    textAlign: 'center',
    width: 40,
  },
  teamCell: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginLeft: 8,
  },
  teamLogo: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  teamLogoText: {
    color: 'white',
    fontSize: 8,
    fontWeight: 'bold',
  },
  teamNameTable: {
    fontSize: 11,
    fontWeight: '500',
    flex: 1,
  },
  // Players styles (matching StandingsScreen)
  playersHeader: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
  },
  playersHeaderText: {
    fontSize: 11,
    fontWeight: 'bold',
    textAlign: 'center',
    flex: 1,
  },
  playerRankHeader: {
    fontSize: 11,
    fontWeight: 'bold',
    textAlign: 'center',
    width: 30,
  },
  playerNameHeader: {
    fontSize: 11,
    fontWeight: 'bold',
    textAlign: 'left',
    flex: 1,
    marginLeft: 8,
  },
  playerGoalsHeader: {
    fontSize: 11,
    fontWeight: 'bold',
    textAlign: 'center',
    width: 70,
  },
  playerAssistsHeader: {
    fontSize: 11,
    fontWeight: 'bold',
    textAlign: 'center',
    width: 70,
  },
  playerRow: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderBottomWidth: 0.5,
    alignItems: 'center',
  },
  playerCell: {
    fontSize: 11,
    textAlign: 'center',
    flex: 1,
  },
  playerRankCell: {
    fontSize: 11,
    textAlign: 'center',
    width: 30,
  },
  playerNameCell: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginLeft: 8,
  },
  playerTeamLogo: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  playerTeamLogoText: {
    color: 'white',
    fontSize: 8,
    fontWeight: 'bold',
  },
  playerName: {
    fontSize: 11,
    fontWeight: '500',
    flex: 1,
    textAlign: 'left',
  },
  playerGoalsCell: {
    fontSize: 11,
    textAlign: 'center',
    width: 70,
  },
  playerAssistsCell: {
    fontSize: 11,
    textAlign: 'center',
    width: 70,
  },
  // Match styles (matching StandingsScreen)
  matchVenueText: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 8,
    fontStyle: 'italic',
  },
  // Filter styles
  filterSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 8,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 100,
  },
  filterButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  filterOptions: {
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
  filterOption: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 6,
    marginHorizontal: 8,
    marginVertical: 2,
  },
  selectedFilterOption: {
    backgroundColor: '#007AFF',
  },
  filterOptionText: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  selectedFilterOptionText: {
    color: 'white',
  },
  // Player filter styles
  playerFilterOptions: {
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 12,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  playerFilterOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    marginHorizontal: 8,
    marginVertical: 2,
  },
  selectedPlayerFilterOption: {
    backgroundColor: 'rgba(0, 122, 255, 0.2)',
  },
  filterIcon: {
    marginRight: 12,
  },
  playerFilterOptionText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: 'white',
  },
  selectedPlayerFilterOptionText: {
    color: '#007AFF',
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedRadioButton: {
    borderColor: '#007AFF',
  },
  radioButtonInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#007AFF',
  },
  yellowCardIcon: {
    width: 20,
    height: 20,
    borderRadius: 4,
    marginRight: 12,
  },
  redCardIcon: {
    width: 20,
    height: 20,
    borderRadius: 4,
    marginRight: 12,
  },
});

export default TournamentDetailScreen;
