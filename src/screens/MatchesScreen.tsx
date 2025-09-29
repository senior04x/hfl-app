import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';

import { useAppStore } from '../store/useAppStore';
import { RootStackParamList, Match } from '../types';
import MatchCard from '../components/MatchCard';

type MatchesScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Main'>;

const MatchesScreen = () => {
  const navigation = useNavigation<MatchesScreenNavigationProp>();
  const { matches, loadMatches, isLoading } = useAppStore();
  const [filter, setFilter] = useState<'all' | 'live' | 'upcoming' | 'finished'>('all');

  useEffect(() => {
    loadMatches();
  }, []);

  const onRefresh = () => {
    loadMatches();
  };

  const filteredMatches = matches.filter(match => {
    const now = new Date();
    switch (filter) {
      case 'live':
        return match.status === 'live';
      case 'upcoming':
        return match.status === 'scheduled' && new Date(match.scheduledAt) > now;
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
      style={[styles.filterButton, isActive && styles.filterButtonActive]}
      onPress={() => setFilter(value)}
    >
      <Text style={[styles.filterText, isActive && styles.filterTextActive]}>
        {title}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Matches</Text>
      </View>

      <View style={styles.filters}>
        <FilterButton title="All" value="all" isActive={filter === 'all'} />
        <FilterButton title="Live" value="live" isActive={filter === 'live'} />
        <FilterButton title="Upcoming" value="upcoming" isActive={filter === 'upcoming'} />
        <FilterButton title="Finished" value="finished" isActive={filter === 'finished'} />
      </View>

      <FlatList
        data={filteredMatches}
        renderItem={renderMatch}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={onRefresh} />
        }
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="football-outline" size={48} color="#ccc" />
            <Text style={styles.emptyText}>
              {filter === 'all' 
                ? 'No matches found' 
                : `No ${filter} matches found`
              }
            </Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: 'white',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  filters: {
    flexDirection: 'row',
    backgroundColor: 'white',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    backgroundColor: '#f0f0f0',
  },
  filterButtonActive: {
    backgroundColor: '#007AFF',
  },
  filterText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  filterTextActive: {
    color: 'white',
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
    color: '#666',
    marginTop: 12,
  },
});

export default MatchesScreen;
