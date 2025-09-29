import React, { useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useAppStore } from '../store/useAppStore';
import { TeamStanding } from '../types';

const StandingsScreen = () => {
  const { standings, loadStandings, isLoading } = useAppStore();

  useEffect(() => {
    loadStandings();
  }, []);

  const onRefresh = () => {
    loadStandings();
  };

  const renderStanding = ({ item, index }: { item: TeamStanding; index: number }) => (
    <View style={styles.standingRow}>
      <View style={styles.positionContainer}>
        <Text style={[
          styles.position,
          index < 3 && styles.topThreePosition
        ]}>
          {index + 1}
        </Text>
      </View>
      
      <View style={styles.teamContainer}>
        <View style={[styles.teamColor, { backgroundColor: item.team.color }]} />
        <Text style={styles.teamName}>{item.team.name}</Text>
      </View>
      
      <View style={styles.statsContainer}>
        <Text style={styles.stat}>{item.matchesPlayed}</Text>
        <Text style={styles.stat}>{item.wins}</Text>
        <Text style={styles.stat}>{item.draws}</Text>
        <Text style={styles.stat}>{item.losses}</Text>
        <Text style={styles.stat}>{item.goalsFor}</Text>
        <Text style={styles.stat}>{item.goalsAgainst}</Text>
        <Text style={styles.stat}>{item.goalDifference}</Text>
        <Text style={[styles.stat, styles.points]}>{item.points}</Text>
      </View>
    </View>
  );

  const renderHeader = () => (
    <View style={styles.headerRow}>
      <View style={styles.positionContainer}>
        <Text style={styles.headerText}>#</Text>
      </View>
      
      <View style={styles.teamContainer}>
        <Text style={styles.headerText}>Team</Text>
      </View>
      
      <View style={styles.statsContainer}>
        <Text style={styles.headerText}>MP</Text>
        <Text style={styles.headerText}>W</Text>
        <Text style={styles.headerText}>D</Text>
        <Text style={styles.headerText}>L</Text>
        <Text style={styles.headerText}>GF</Text>
        <Text style={styles.headerText}>GA</Text>
        <Text style={styles.headerText}>GD</Text>
        <Text style={[styles.headerText, styles.points]}>Pts</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.titleHeader}>
        <Text style={styles.title}>Standings</Text>
      </View>

      <View style={styles.legend}>
        <Text style={styles.legendText}>
          MP: Matches Played | W: Wins | D: Draws | L: Losses | GF: Goals For | GA: Goals Against | GD: Goal Difference | Pts: Points
        </Text>
      </View>

      <FlatList
        data={standings}
        renderItem={renderStanding}
        keyExtractor={(item) => item.teamId}
        ListHeaderComponent={renderHeader}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={onRefresh} />
        }
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="trophy-outline" size={48} color="#ccc" />
            <Text style={styles.emptyText}>No standings available</Text>
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
  titleHeader: {
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
  legend: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  legendText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  list: {
    padding: 20,
  },
  headerRow: {
    flexDirection: 'row',
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 8,
  },
  standingRow: {
    flexDirection: 'row',
    backgroundColor: 'white',
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
    color: '#333',
  },
  topThreePosition: {
    color: '#FFD700',
  },
  teamContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
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
    color: '#333',
    flex: 1,
  },
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stat: {
    width: 30,
    textAlign: 'center',
    fontSize: 12,
    color: '#333',
  },
  points: {
    fontWeight: 'bold',
    color: '#007AFF',
  },
  headerText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: 'white',
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

export default StandingsScreen;
