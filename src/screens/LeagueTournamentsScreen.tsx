import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  RefreshControl,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../store/useThemeStore';
import { useLanguage } from '../store/useLanguageStore';

interface Tournament {
  _id: string;
  name: string;
  description?: string;
  maxTeams?: number;
  status: 'active' | 'inactive' | 'completed';
  leagueId: string;
  createdAt: string;
  updatedAt: string;
}

type RootStackParamList = {
  LeagueTournaments: {
    leagueId: string;
    leagueName: string;
    tournaments: Tournament[];
  };
};

type LeagueTournamentsRouteProp = RouteProp<RootStackParamList, 'LeagueTournaments'>;

const LeagueTournamentsScreen = () => {
  const navigation = useNavigation();
  const route = useRoute<LeagueTournamentsRouteProp>();
  const { colors } = useTheme();
  const { getText } = useLanguage();
  
  const { leagueId, leagueName, tournaments } = route.params;
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    // Refresh logic here
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  };

  const renderTournamentItem = ({ item }: { item: Tournament }) => (
    <TouchableOpacity
      style={[styles.tournamentCard, { backgroundColor: colors.surface }]}
      onPress={() => {
        // Navigate to tournament details
        navigation.navigate('TournamentDetail', { 
          tournamentId: item._id, 
          tournamentName: item.name,
          leagueName: leagueName
        });
        console.log('Tournament pressed:', item.name);
      }}
    >
      <View style={styles.tournamentHeader}>
        <View style={[styles.tournamentIcon, { backgroundColor: colors.primary }]}>
          <Ionicons name="trophy" size={24} color="white" />
        </View>
        <View style={styles.tournamentInfo}>
          <Text style={[styles.tournamentName, { color: colors.text }]}>
            {item.name}
          </Text>
          <Text style={[styles.tournamentTeams, { color: colors.textSecondary }]}>
            {item.maxTeams || 0} jamoa
          </Text>
        </View>
        <View style={styles.tournamentStatus}>
          <View style={[
            styles.statusBadge,
            {
              backgroundColor: item.status === 'active' ? '#4CAF50' :
                               item.status === 'completed' ? '#2196F3' : '#9E9E9E'
            }
          ]}>
            <Text style={styles.statusText}>
              {item.status === 'active' ? 'Faol' :
               item.status === 'completed' ? 'Tugallangan' : 'Nofaol'}
            </Text>
          </View>
        </View>
      </View>

    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerTitle}>
          <Text style={[styles.headerText, { color: colors.text }]}>
            {leagueName}
          </Text>
          <Text style={[styles.headerSubtext, { color: colors.textSecondary }]}>
            Turnirlar
          </Text>
        </View>
        <View style={{ width: 24 }} />
      </View>

      {/* Tournaments List */}
      <FlatList
        data={tournaments}
        renderItem={renderTournamentItem}
        keyExtractor={(item) => item._id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={[styles.list, { paddingBottom: 70 }]}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="trophy-outline" size={48} color={colors.textSecondary} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              Turnirlar mavjud emas
            </Text>
            <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>
              Bu ligada hozircha turnirlar yo'q
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    flex: 1,
    alignItems: 'center',
  },
  headerText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  headerSubtext: {
    fontSize: 14,
    marginTop: 2,
  },
  list: {
    padding: 16,
  },
  tournamentCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  tournamentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  tournamentIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  tournamentInfo: {
    flex: 1,
  },
  tournamentName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  tournamentTeams: {
    fontSize: 14,
    marginTop: 2,
  },
  tournamentStatus: {
    alignItems: 'flex-end',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'white',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default LeagueTournamentsScreen;