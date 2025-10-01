import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  SafeAreaView,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { onSnapshot, collection, query, orderBy } from 'firebase/firestore';

import { useTheme } from '../store/useThemeStore';
import { RootStackParamList, Match } from '../types';
import { db } from '../services/firebase';
import MatchCard from '../components/MatchCard';

type MatchesScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Main'>;

const MatchesScreen = () => {
  const navigation = useNavigation<MatchesScreenNavigationProp>();
  const { colors } = useTheme();
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'live' | 'upcoming' | 'finished'>('all');
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedLeague, setSelectedLeague] = useState<string | null>(null);

  useEffect(() => {
    fetchMatches();
  }, []);

  const fetchMatches = async () => {
    try {
      setLoading(true);
      console.log('Fetching matches from Firebase...');
      
      const q = query(collection(db, 'matches'), orderBy('matchDate', 'desc'));
      
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const matchesData: Match[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          matchesData.push({
            id: doc.id,
            homeTeamId: data.homeTeamId || '',
            homeTeamName: data.homeTeamName || '',
            awayTeamId: data.awayTeamId || '',
            awayTeamName: data.awayTeamName || '',
            homeScore: data.homeScore || 0,
            awayScore: data.awayScore || 0,
            matchDate: data.matchDate?.toDate ? data.matchDate.toDate() : new Date(data.matchDate),
            status: data.status || 'scheduled',
            venue: data.venue || '',
            referee: data.referee || '',
            youtubeLink: data.youtubeLink || '',
            leagueType: data.leagueType || '',
            createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt),
            updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : new Date(data.updatedAt),
          });
        });
        
        console.log('Matches fetched:', matchesData);
        setMatches(matchesData);
        setLoading(false);
      });

      return unsubscribe;
    } catch (error) {
      console.error('Error fetching matches:', error);
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchMatches();
    setRefreshing(false);
  };

  const filteredMatches = matches.filter(match => {
    const now = new Date();
    switch (filter) {
      case 'live':
        return match.status === 'live';
      case 'upcoming':
        return match.status === 'scheduled' && new Date(match.matchDate) > now;
      case 'finished':
        return match.status === 'finished';
      default:
        return true;
    }
  });

  // Group matches by date
  const groupedMatches = filteredMatches.reduce((groups, match) => {
    const dateKey = new Date(match.matchDate).toDateString();
    if (!groups[dateKey]) {
      groups[dateKey] = [];
    }
    groups[dateKey].push(match);
    return groups;
  }, {} as Record<string, Match[]>);

  const sortedDates = Object.keys(groupedMatches).sort((a, b) => 
    new Date(a).getTime() - new Date(b).getTime()
  );

  const formatDateHeader = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('uz-UZ', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      weekday: 'long',
    }).format(date);
  };

  const renderMatch = ({ item }: { item: Match }) => (
    <MatchCard 
      match={item} 
      onPress={() => navigation.navigate('MatchDetail', { matchId: item.id })}
    />
  );

  const renderDateGroup = (dateString: string) => {
    const matches = groupedMatches[dateString];
    
    // Group matches by league type
    const leagueGroups = matches.reduce((groups, match) => {
      // Determine league type based on match data or create mock data
      const leagueType = getLeagueType(match);
      if (!groups[leagueType]) {
        groups[leagueType] = [];
      }
      groups[leagueType].push(match);
      return groups;
    }, {} as Record<string, Match[]>);

    return (
      <View key={dateString} style={styles.dateGroup}>
        <View style={[styles.dateHeader, { backgroundColor: colors.primary }]}>
          <Text style={styles.dateHeaderText}>
            {formatDateHeader(dateString)}
          </Text>
        </View>
        {Object.entries(leagueGroups).map(([leagueType, leagueMatches]) => (
          <TouchableOpacity
            key={leagueType}
            style={[styles.leagueItem, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={() => {
              setSelectedDate(dateString);
              setSelectedLeague(leagueType);
            }}
          >
            <Text style={[styles.leagueName, { color: colors.text }]}>{leagueType}</Text>
            <View style={styles.leagueInfo}>
              <Text style={[styles.matchCount, { color: colors.primary }]}>
                {leagueMatches.length} o'yin
              </Text>
              <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
            </View>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const getLeagueType = (match: Match): string => {
    // Use leagueType from match data if available, otherwise fallback to mock
    if (match.leagueType) {
      return match.leagueType;
    }
    
    // Fallback to mock league assignment
    const leagues = ['HFL 3-liga', 'HFL Pro Liga', 'HFL Super Liga', 'HFL Chempions Liga'];
    const hash = match.id.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);
    return leagues[Math.abs(hash) % leagues.length];
  };

  const FilterButton = ({ 
    title, 
    value, 
    isActive 
  }: { 
    title: string; 
    value: 'all' | 'live' | 'upcoming' | 'finished'; 
    isActive: boolean; 
  }) => (
    <TouchableOpacity
      style={[
        styles.filterButton, 
        { backgroundColor: isActive ? colors.primary : colors.surface },
        isActive && styles.filterButtonActive
      ]}
      onPress={() => setFilter(value)}
    >
      <Text style={[
        styles.filterText, 
        { color: isActive ? 'white' : colors.textSecondary },
        isActive && styles.filterTextActive
      ]}>
        {title}
      </Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.header }]}>
        <Text style={[styles.title, { color: colors.text }]}>Matches</Text>
      </View>

      <View style={[styles.filters, { backgroundColor: colors.header, borderBottomColor: colors.border }]}>
        <FilterButton title="All" value="all" isActive={filter === 'all'} />
        <FilterButton title="Live" value="live" isActive={filter === 'live'} />
        <FilterButton title="Upcoming" value="upcoming" isActive={filter === 'upcoming'} />
        <FilterButton title="Finished" value="finished" isActive={filter === 'finished'} />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            Ma'lumotlar yuklanmoqda...
          </Text>
        </View>
      ) : (
        <ScrollView
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          contentContainerStyle={styles.list}
        >
          {selectedDate && selectedLeague ? (
            <View style={styles.matchesView}>
              <View style={[styles.backHeader, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <TouchableOpacity
                  style={styles.backButton}
                  onPress={() => {
                    setSelectedDate(null);
                    setSelectedLeague(null);
                  }}
                >
                  <Ionicons name="arrow-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.backTitle, { color: colors.text }]}>
                  {selectedLeague} - {formatDateHeader(selectedDate)}
                </Text>
              </View>
              
              {groupedMatches[selectedDate]
                ?.filter(match => getLeagueType(match) === selectedLeague)
                .map((match) => (
                  <MatchCard 
                    key={match.id}
                    match={match} 
                    onPress={() => navigation.navigate('MatchDetail', { matchId: match.id })}
                  />
                ))}
            </View>
          ) : (
            <>
              {sortedDates.length > 0 ? (
                sortedDates.map(renderDateGroup)
              ) : (
                <View style={styles.emptyContainer}>
                  <Ionicons name="football-outline" size={48} color={colors.textTertiary} />
                  <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                    {filter === 'all' 
                      ? 'O\'yinlar topilmadi' 
                      : `${filter} o\'yinlar topilmadi`
                    }
                  </Text>
                </View>
              )}
            </>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  filters: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  filterButtonActive: {
    // backgroundColor handled dynamically
  },
  filterText: {
    fontSize: 14,
    fontWeight: '500',
  },
  filterTextActive: {
    // color handled dynamically
  },
  list: {
    padding: 20,
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    marginTop: 12,
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
  dateGroup: {
    marginBottom: 20,
  },
  dateHeader: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  dateHeaderText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  leagueItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  leagueName: {
    fontSize: 16,
    fontWeight: '500',
    flex: 1,
  },
  leagueInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  matchCount: {
    fontSize: 14,
    fontWeight: '500',
    marginRight: 8,
  },
  matchesView: {
    flex: 1,
  },
  backHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
    borderRadius: 8,
    borderWidth: 1,
  },
  backButton: {
    marginRight: 12,
  },
  backTitle: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
});

export default MatchesScreen;
