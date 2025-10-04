import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';

import { useAppStore } from '../store/useAppStore';
import { RootStackParamList, Match } from '../types';
import MatchCard from '../components/MatchCard';
import MatchSkeletonCard from '../components/MatchSkeletonCard';
import ErrorBoundary from '../components/ErrorBoundary';
import { useTheme } from '../store/useThemeStore';

type HomeScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Main'>;

const SimpleHomeScreen = () => {
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const { matches, loadMatches, isLoading } = useAppStore();
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const { colors } = useTheme();

  useEffect(() => {
    const initializeData = async () => {
      try {
        await loadMatches();
      } catch (error) {
        console.error('Error loading matches:', error);
      } finally {
        setIsInitialLoad(false);
      }
    };
    
    initializeData();
  }, []);

  const onRefresh = () => {
    loadMatches();
  };

  const upcomingMatches = matches.filter(match => 
    match.status === 'scheduled' && 
    new Date(match.matchDate) > new Date()
  ).slice(0, 5);

  const liveMatches = matches.filter(match => match.status === 'live');

  const renderMatch = ({ item }: { item: Match }) => (
    <MatchCard 
      match={item} 
      onPress={() => navigation.navigate('MatchDetail', { matchId: item.id })}
    />
  );

  if (isInitialLoad) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>Welcome to HFL</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Havas Football League</Text>
        </View>
        
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="time" size={20} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Upcoming Matches</Text>
          </View>
          {Array.from({ length: 3 }).map((_, index) => (
            <MatchSkeletonCard key={index} />
          ))}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <ErrorBoundary>
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>Welcome to HFL</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Havas Football League</Text>
        </View>

        {liveMatches.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="radio" size={20} color={colors.primary} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Live Matches</Text>
            </View>
            <FlatList
              data={liveMatches}
              renderItem={renderMatch}
              keyExtractor={(item, index) => item.id || `live-${index}`}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.verticalList}
            />
          </View>
        )}

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="time" size={20} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Upcoming Matches</Text>
          </View>
          <FlatList
            data={upcomingMatches}
            renderItem={renderMatch}
            keyExtractor={(item, index) => item.id || `upcoming-${index}`}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="football-outline" size={48} color={colors.textTertiary} />
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No upcoming matches</Text>
              </View>
            }
          />
        </View>

        <TouchableOpacity
          style={[styles.quickAction, { backgroundColor: colors.surface }]}
          onPress={() => {
            const tabNavigator = navigation.getParent();
            if (tabNavigator) {
              tabNavigator.navigate('Matches');
            }
          }}
        >
          <Ionicons name="list" size={24} color={colors.primary} />
          <Text style={[styles.quickActionText, { color: colors.text }]}>View All Matches</Text>
          <Ionicons name="chevron-forward" size={20} color={colors.primary} />
        </TouchableOpacity>
      </SafeAreaView>
    </ErrorBoundary>
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
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
  },
  section: {
    marginTop: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 8,
  },
  verticalList: {
    paddingHorizontal: 0,
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    marginTop: 12,
  },
  quickAction: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 20,
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
  },
  quickActionText: {
    flex: 1,
    fontSize: 16,
    marginLeft: 12,
  },
});

export default SimpleHomeScreen;
