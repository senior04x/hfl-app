import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';

import { useAppStore } from '../store/useAppStore';
import { RootStackParamList, SliderItem } from '../types';
import CardSlider from '../components/CardSlider';
import ApiSlider from '../components/ApiSlider';
import TopPlayersSection from '../components/TopPlayersSection';
import QuickStatsCard from '../components/QuickStatsCard';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { useTheme } from '../store/useThemeStore';
import { useLanguage } from '../store/useLanguageStore';

type HomeScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Main'>;

const SimpleHomeScreen = () => {
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const { loadMatches } = useAppStore();
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { colors } = useTheme();
  const { getText } = useLanguage();

  // Sample data for card slider - only images
  const sliderCards = [
    {
      id: '1',
      imageUrl: 'https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?w=400&h=200&fit=crop',
      onPress: () => {
        const tabNavigator = navigation.getParent();
        if (tabNavigator) {
          tabNavigator.navigate('Standings');
        }
      },
    },
    {
      id: '2',
      imageUrl: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=400&h=200&fit=crop',
      onPress: () => {
        const tabNavigator = navigation.getParent();
        if (tabNavigator) {
          tabNavigator.navigate('Matches');
        }
      },
    },
    {
      id: '3',
      imageUrl: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=400&h=200&fit=crop',
      onPress: () => {
        const tabNavigator = navigation.getParent();
        if (tabNavigator) {
          tabNavigator.navigate('Teams');
        }
      },
    },
  ];

  // Sample top players data
  const topPlayers = [
    {
      id: '1',
      name: 'Ahmad Karimov',
      team: 'FC Tashkent',
      position: 'Forward',
      goals: 15,
      assists: 8,
      rating: 9.2,
    },
    {
      id: '2',
      name: 'Sardor Rashidov',
      team: 'FC Bunyodkor',
      position: 'Midfielder',
      goals: 12,
      assists: 12,
      rating: 8.9,
    },
    {
      id: '3',
      name: 'Eldor Shomurodov',
      team: 'FC Nasaf',
      position: 'Forward',
      goals: 14,
      assists: 6,
      rating: 8.7,
    },
    {
      id: '4',
      name: 'Jaloliddin Masharipov',
      team: 'FC Pakhtakor',
      position: 'Winger',
      goals: 10,
      assists: 15,
      rating: 8.5,
    },
    {
      id: '5',
      name: 'Otabek Shukurov',
      team: 'FC AGMK',
      position: 'Midfielder',
      goals: 8,
      assists: 10,
      rating: 8.3,
    },
  ];


  // Quick stats data
  const quickStats = [
    {
      id: '1',
      title: getText('totalMatches'),
      value: '156',
      icon: 'football',
      color: '#3B82F6',
      onPress: () => {
        const tabNavigator = navigation.getParent();
        if (tabNavigator) {
          tabNavigator.navigate('Matches');
        }
      },
    },
    {
      id: '2',
      title: getText('activeTeams'),
      value: '24',
      icon: 'people',
      color: '#10B981',
      onPress: () => {
        const tabNavigator = navigation.getParent();
        if (tabNavigator) {
          tabNavigator.navigate('Teams');
        }
      },
    },
    {
      id: '3',
      title: getText('liveMatches'),
      value: '3',
      icon: 'radio',
      color: '#EF4444',
      onPress: () => {
        const tabNavigator = navigation.getParent();
        if (tabNavigator) {
          tabNavigator.navigate('Matches');
        }
      },
    },
    {
      id: '4',
      title: getText('topScorer'),
      value: '15',
      icon: 'trophy',
      color: '#F59E0B',
      onPress: () => {
        // Navigate to player stats or standings
      },
    },
  ];

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

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await loadMatches();
      console.log('Data refreshed successfully');
    } catch (error) {
      console.error('Error refreshing data:', error);
    } finally {
      setRefreshing(false);
    }
  };


  if (isInitialLoad) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.text }]}>{getText('welcomeToHFL')}</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{getText('havasFootballLeague')}</Text>
          </View>
          
          {/* Card Slider Skeleton */}
          <View style={styles.sliderSkeleton}>
            <View style={[styles.skeletonCard, { backgroundColor: colors.surface }]} />
          </View>
          
          {/* Quick Stats Skeleton */}
          <View style={styles.statsSkeleton}>
            {Array.from({ length: 4 }).map((_, index) => (
              <View key={index} style={[styles.skeletonStat, { backgroundColor: colors.surface }]} />
            ))}
          </View>
          
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <ErrorBoundary>
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <ScrollView 
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.text }]}>{getText('welcomeToHFL')}</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{getText('havasFootballLeague')}</Text>
          </View>

          {/* API Slider */}
          <ApiSlider 
            autoPlay={true}
            autoPlayInterval={4000}
            onItemPress={(item: SliderItem) => {
              console.log('Slider item pressed:', item.title);
              // Handle internal navigation
              if (item.link && item.linkType === 'internal') {
                switch (item.link) {
                  case 'Home':
                    // Already on home screen
                    break;
                  case 'Matches':
                    const tabNavigator = navigation.getParent();
                    if (tabNavigator) {
                      tabNavigator.navigate('Matches');
                    }
                    break;
                  case 'Teams':
                    const tabNavigator2 = navigation.getParent();
                    if (tabNavigator2) {
                      tabNavigator2.navigate('Teams');
                    }
                    break;
                  case 'Standings':
                    const tabNavigator3 = navigation.getParent();
                    if (tabNavigator3) {
                      tabNavigator3.navigate('Standings');
                    }
                    break;
                  case 'Account':
                    const tabNavigator4 = navigation.getParent();
                    if (tabNavigator4) {
                      tabNavigator4.navigate('Account');
                    }
                    break;
                  default:
                    console.log('Unknown internal page:', item.link);
                }
              }
            }}
          />

          {/* Quick Stats */}
          <QuickStatsCard stats={quickStats} />

          {/* Top Players Section */}
          <TopPlayersSection 
            players={topPlayers}
            onPlayerPress={(player) => {
              console.log('Player pressed:', player.name);
              // Navigate to player details
            }}
            onViewAllPress={() => {
              const tabNavigator = navigation.getParent();
              if (tabNavigator) {
                tabNavigator.navigate('Standings');
              }
            }}
          />


          {/* Quick Action Button */}
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
            <Text style={[styles.quickActionText, { color: colors.text }]}>{getText('viewAllMatches')}</Text>
            <Ionicons name="chevron-forward" size={20} color={colors.primary} />
          </TouchableOpacity>
        </ScrollView>
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
  // Skeleton loading styles
  sliderSkeleton: {
    paddingHorizontal: 40, // Adjusted for 80% width with better peek effect
    marginVertical: 10,
  },
  skeletonCard: {
    height: 130, // Increased height for better visibility
    borderRadius: 16,
    opacity: 0.3,
  },
  statsSkeleton: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    justifyContent: 'space-between',
    marginVertical: 10,
  },
  skeletonStat: {
    width: '48%',
    height: 120,
    borderRadius: 12,
    marginBottom: 15,
    opacity: 0.3,
  },
});

export default SimpleHomeScreen;
