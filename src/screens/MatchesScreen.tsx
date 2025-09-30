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

  const renderMatch = ({ item }: { item: Match }) => (
    <MatchCard 
      match={item} 
      onPress={() => navigation.navigate('MatchDetail', { matchId: item.id })}
    />
  );

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
        <FlatList
          data={filteredMatches}
          renderItem={renderMatch}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="football-outline" size={48} color={colors.textTertiary} />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                {filter === 'all' 
                  ? 'O\'yinlar topilmadi' 
                  : `${filter} o\'yinlar topilmadi`
                }
              </Text>
            </View>
          }
        />
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
});

export default MatchesScreen;
