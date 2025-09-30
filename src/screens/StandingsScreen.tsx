import React, { useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { useAppStore } from '../store/useAppStore';
import { useThemeStore } from '../store/useThemeStore';
import { lightColors, darkColors } from '../theme/colors';
import { typography, borderRadius, shadows } from '../theme/typography';
import { TeamStanding } from '../types';
import Card from '../components/Card';
import Button from '../components/Button';

const StandingsScreen = () => {
  const { standings, loadStandings, isLoading } = useAppStore();
  const { theme } = useThemeStore();
  const colors = theme === 'dark' ? darkColors : lightColors;

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
        <Text style={styles.teamName} numberOfLines={1} ellipsizeMode="tail">{item.team.name}</Text>
      </View>
      
      <View style={styles.statsContainer}>
        <Text style={styles.stat}>{item.matchesPlayed || 0}</Text>
        <Text style={styles.stat}>{item.wins || 0}</Text>
        <Text style={styles.stat}>{item.draws || 0}</Text>
        <Text style={styles.stat}>{item.losses || 0}</Text>
        <Text style={styles.stat}>{item.goalsFor || 0}</Text>
        <Text style={styles.stat}>{item.goalsAgainst || 0}</Text>
        <Text style={styles.stat}>{item.goalDifference || 0}</Text>
        <Text style={[styles.stat, styles.points]}>{item.points || 0}</Text>
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
    <SafeAreaView style={styles.container}>
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
    </SafeAreaView>
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
    color: '#333',
    flex: 1,
    numberOfLines: 1,
    ellipsizeMode: 'tail',
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
    width: 25,
    textAlign: 'center',
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
