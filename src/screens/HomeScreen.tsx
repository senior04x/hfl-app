import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  SafeAreaView,
  Animated,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';

import { useAppStore } from '../store/useAppStore';
import { RootStackParamList, Match } from '../types';
import MatchCard from '../components/MatchCard';
import LoadingScreen from '../components/LoadingScreen';
import ErrorBoundary from '../components/ErrorBoundary';
import { useTheme } from '../store/useThemeStore';

type HomeScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Main'>;

const HomeScreen = () => {
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const { matches, loadMatches, isLoading } = useAppStore();
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const { colors } = useTheme();
  
  // Animation values
  const headerOpacity = useRef(new Animated.Value(0)).current;
  const headerTranslateY = useRef(new Animated.Value(-30)).current;
  const liveMatchesOpacity = useRef(new Animated.Value(0)).current;
  const liveMatchesTranslateY = useRef(new Animated.Value(30)).current;
  const upcomingMatchesOpacity = useRef(new Animated.Value(0)).current;
  const upcomingMatchesTranslateY = useRef(new Animated.Value(30)).current;
  const buttonOpacity = useRef(new Animated.Value(0)).current;
  const buttonScale = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    // Simple initialization without complex async operations
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
    
    // Start animations
    Animated.sequence([
      // Header animation
      Animated.parallel([
        Animated.timing(headerOpacity, {
          toValue: 1,
          duration: 600,
          useNativeDriver: false,
        }),
        Animated.timing(headerTranslateY, {
          toValue: 0,
          duration: 600,
          useNativeDriver: false,
        }),
      ]),
      // Live matches animation
      Animated.parallel([
        Animated.timing(liveMatchesOpacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: false,
        }),
        Animated.timing(liveMatchesTranslateY, {
          toValue: 0,
          duration: 500,
          useNativeDriver: false,
        }),
      ]),
      // Upcoming matches animation
      Animated.parallel([
        Animated.timing(upcomingMatchesOpacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: false,
        }),
        Animated.timing(upcomingMatchesTranslateY, {
          toValue: 0,
          duration: 500,
          useNativeDriver: false,
        }),
      ]),
      // Button animation
      Animated.parallel([
        Animated.timing(buttonOpacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: false,
        }),
        Animated.timing(buttonScale, {
          toValue: 1,
          duration: 400,
          useNativeDriver: false,
        }),
      ]),
    ]).start();
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
    return <LoadingScreen />;
  }

  return (
    <ErrorBoundary>
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <Animated.View 
        style={[
          styles.header,
          {
            opacity: headerOpacity,
            transform: [{ translateY: headerTranslateY }],
          }
        ]}
      >
        <Text style={[styles.title, { color: colors.text }]}>Welcome to HFL</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Havas Football League</Text>
      </Animated.View>

      {liveMatches.length > 0 && (
        <Animated.View 
          style={[
            styles.section,
            {
              opacity: liveMatchesOpacity,
              transform: [{ translateY: liveMatchesTranslateY }],
            }
          ]}
        >
          <View style={styles.sectionHeader}>
            <Ionicons name="radio" size={20} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Live Matches</Text>
          </View>
          <FlatList
            data={liveMatches}
            renderItem={renderMatch}
            keyExtractor={(item) => item.id}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.verticalList}
          />
        </Animated.View>
      )}

      <Animated.View 
        style={[
          styles.section,
          {
            opacity: upcomingMatchesOpacity,
            transform: [{ translateY: upcomingMatchesTranslateY }],
          }
        ]}
      >
        <View style={styles.sectionHeader}>
          <Ionicons name="time" size={20} color={colors.primary} />
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Upcoming Matches</Text>
        </View>
        <FlatList
          data={upcomingMatches}
          renderItem={renderMatch}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl refreshing={isLoading} onRefresh={onRefresh} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="football-outline" size={48} color={colors.textTertiary} />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No upcoming matches</Text>
            </View>
          }
        />
      </Animated.View>

      <Animated.View
        style={{
          opacity: buttonOpacity,
          transform: [{ scale: buttonScale }],
        }}
      >
        <TouchableOpacity
          style={[styles.quickAction, { backgroundColor: colors.surface }]}
          onPress={() => {
            // Navigate to Matches tab
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
      </Animated.View>
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
  horizontalList: {
    paddingHorizontal: 20,
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

export default HomeScreen;
