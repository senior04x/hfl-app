import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, RefreshControl } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../store/useThemeStore';
import { mongodbService } from '../services/mongodbService';

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

const LeagueTournamentsScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { colors } = useTheme();
  const { leagueId, leagueName } = route.params as { leagueId: string; leagueName: string };

  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    navigation.setOptions({ 
      title: `${leagueName} Turnirlari`,
      headerStyle: {
        backgroundColor: colors.header,
      },
      headerTintColor: colors.text,
    });
    fetchTournaments();
  }, [leagueId, leagueName]);

  const fetchTournaments = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('Fetching tournaments for league:', leagueId);
      
      const result = await mongodbService.getTournamentsByLeague(leagueId);
      if (result.success && result.data) {
        console.log('Tournaments fetched successfully:', result.data);
        setTournaments(result.data);
      } else {
        console.error('Failed to fetch tournaments:', result.error);
        setError(result.error || 'Turnirlarni yuklashda xatolik yuz berdi.');
      }
    } catch (err: any) {
      console.error('Error fetching tournaments:', err);
      setError('Turnirlarni yuklashda kutilmagan xatolik yuz berdi.');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchTournaments();
    setRefreshing(false);
  };

  const getStatusColor = (status: 'active' | 'inactive' | 'completed') => {
    switch (status) {
      case 'active': return '#4CAF50';
      case 'inactive': return '#9E9E9E';
      case 'completed': return '#2196F3';
      default: return '#9E9E9E';
    }
  };

  const getStatusText = (status: 'active' | 'inactive' | 'completed') => {
    switch (status) {
      case 'active': return 'Faol';
      case 'inactive': return 'Nofaol';
      case 'completed': return 'Tugallangan';
      default: return 'Noma\'lum';
    }
  };

  const renderTournamentItem = ({ item }: { item: Tournament }) => (
    <TouchableOpacity
      style={[styles.tournamentCard, { backgroundColor: colors.surface }]}
      onPress={() => {
        console.log('Tournament pressed:', item.name);
        navigation.navigate('TournamentDetail', { 
          tournamentId: item._id, 
          tournamentName: item.name,
          leagueName: leagueName 
        });
      }}
    >
      <View style={styles.tournamentHeader}>
        <View style={[styles.tournamentIcon, { backgroundColor: colors.primary }]}>
          <Ionicons name="trophy" size={24} color="white" />
        </View>
        <View style={styles.tournamentInfo}>
          <Text style={[styles.tournamentName, { color: colors.text }]}>{item.name}</Text>
          {item.description && (
            <Text style={[styles.tournamentDescription, { color: colors.textSecondary }]}>
              {item.description}
            </Text>
          )}
        </View>
        <View style={styles.tournamentStatus}>
          <View style={[
            styles.statusBadge, 
            { backgroundColor: getStatusColor(item.status) }
          ]}>
            <Text style={styles.statusText}>
              {getStatusText(item.status)}
            </Text>
          </View>
        </View>
      </View>
      
      <View style={styles.tournamentDetails}>
        <View style={styles.detailItem}>
          <Ionicons name="people" size={16} color={colors.textSecondary} />
          <Text style={[styles.detailText, { color: colors.textSecondary }]}>
            {item.maxTeams || 0} jamoa
          </Text>
        </View>
        <View style={styles.detailItem}>
          <Ionicons name="calendar" size={16} color={colors.textSecondary} />
          <Text style={[styles.detailText, { color: colors.textSecondary }]}>
            {new Date(item.createdAt).toLocaleDateString('uz-UZ')}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
          Turnirlar yuklanmoqda...
        </Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <Ionicons name="alert-circle-outline" size={48} color={colors.error} />
        <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
        <TouchableOpacity 
          onPress={fetchTournaments} 
          style={[styles.retryButton, { backgroundColor: colors.primary }]}
        >
          <Text style={styles.retryButtonText}>Qayta urinish</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (tournaments.length === 0) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <Ionicons name="trophy-outline" size={48} color={colors.textSecondary} />
        <Text style={[styles.emptyTitle, { color: colors.text }]}>
          Turnirlar yo'q
        </Text>
        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
          Hozircha bu ligada turnirlar mavjud emas
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={tournaments}
        keyExtractor={(item) => item._id}
        renderItem={renderTournamentItem}
        contentContainerStyle={styles.listContentContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
  listContentContainer: {
    padding: 16,
    paddingBottom: 100, // Bottom padding to prevent last card sticking to nav bar
  },
  tournamentCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  tournamentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  tournamentIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  tournamentInfo: {
    flex: 1,
  },
  tournamentName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  tournamentDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  tournamentStatus: {
    alignItems: 'flex-end',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'white',
  },
  tournamentDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailText: {
    fontSize: 14,
    marginLeft: 6,
  },
});

export default LeagueTournamentsScreen;
