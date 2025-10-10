import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Image,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';

import { useTheme } from '../store/useThemeStore';
import { useLanguage } from '../store/useLanguageStore';
import { RootStackParamList } from '../types';
import { mongodbService } from '../services/mongodbService';

type TournamentScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Tournament'>;

interface League {
  _id: string;
  name: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  location?: string;
  maxTeams?: number;
  currentTeams?: number;
  logo?: string;
  status: 'active' | 'inactive' | 'completed';
  createdAt: string;
  updatedAt: string;
}

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const TournamentScreen = () => {
  const navigation = useNavigation<TournamentScreenNavigationProp>();
  const { colors } = useTheme();
  const { getText } = useLanguage();
  const [leagues, setLeagues] = useState<League[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchLeagues();
  }, []);

  const fetchLeagues = async () => {
    try {
      setLoading(true);
      console.log('Fetching leagues from backend...');
      
      const result = await mongodbService.getLeagues();
      
      if (result.success && result.data) {
        console.log('Leagues fetched successfully:', result.data);
        // Filter only active leagues
        const activeLeagues = result.data.filter((league: League) => league.status === 'active');
        setLeagues(activeLeagues);
      } else {
        console.error('Failed to fetch leagues:', result.error);
      }
    } catch (error) {
      console.error('Error fetching leagues:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchLeagues();
    setRefreshing(false);
  };

  const renderLeague = ({ item }: { item: League }) => (
    <TouchableOpacity
      style={[styles.leagueCard, { backgroundColor: colors.surface }]}
      onPress={() => {
        // Navigate to league details or matches
        console.log('League pressed:', item.name);
      }}
    >
      <View style={styles.logoContainer}>
        {item.logo ? (
          <Image
            source={{ uri: item.logo }}
            style={styles.leagueLogo}
            resizeMode="cover"
          />
        ) : (
          <View style={[styles.defaultLogo, { backgroundColor: colors.primary }]}>
            <Text style={[styles.defaultLogoText, { color: colors.surface }]}>
              {item.name.charAt(0).toUpperCase()}
            </Text>
          </View>
        )}
      </View>
      
      <View style={styles.leagueInfo}>
        <Text style={[styles.leagueName, { color: colors.text }]}>
          {item.name}
        </Text>
        
        {item.description && (
          <Text style={[styles.leagueDescription, { color: colors.textSecondary }]}>
            {item.description}
          </Text>
        )}
        
        <View style={styles.leagueStats}>
          <View style={styles.statItem}>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
              Jamoalar
            </Text>
            <Text style={[styles.statValue, { color: colors.text }]}>
              {item.maxTeams || 0}
            </Text>
          </View>
          
          {item.location && (
            <View style={styles.statItem}>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                Joylashuv
              </Text>
              <Text style={[styles.statValue, { color: colors.text }]}>
                {item.location}
              </Text>
            </View>
          )}
          
          {item.startDate && (
            <View style={styles.statItem}>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                Boshlanish
              </Text>
              <Text style={[styles.statValue, { color: colors.text }]}>
                {new Date(item.startDate).toLocaleDateString('uz-UZ')}
              </Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <Text style={[styles.loadingText, { color: colors.text }]}>
            Ligalar yuklanmoqda...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>
          {getText('tournament') || 'Turnir'}
        </Text>
      </View>

      <FlatList
        data={leagues}
        renderItem={renderLeague}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              Hozircha faol ligalar yo'q
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
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  listContainer: {
    padding: 16,
  },
  leagueCard: {
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  logoContainer: {
    width: '100%',
    height: screenWidth * 0.8, // 1:1 aspect ratio with some padding
    justifyContent: 'center',
    alignItems: 'center',
  },
  leagueLogo: {
    width: '100%',
    height: '100%',
  },
  defaultLogo: {
    width: screenWidth * 0.6,
    height: screenWidth * 0.6,
    borderRadius: screenWidth * 0.3,
    justifyContent: 'center',
    alignItems: 'center',
  },
  defaultLogoText: {
    fontSize: 48,
    fontWeight: 'bold',
  },
  leagueInfo: {
    padding: 20,
  },
  leagueName: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  leagueDescription: {
    fontSize: 16,
    lineHeight: 22,
    marginBottom: 16,
  },
  leagueStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  statItem: {
    flex: 1,
    minWidth: '45%',
  },
  statLabel: {
    fontSize: 14,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 18,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
  },
});

export default TournamentScreen;
