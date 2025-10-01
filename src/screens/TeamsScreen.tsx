import React, { useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Image,
  SafeAreaView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';

import { useAppStore } from '../store/useAppStore';
import { RootStackParamList, Team } from '../types';
import { useTheme } from '../store/useThemeStore';

type TeamsScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Main'>;

const TeamsScreen = () => {
  const navigation = useNavigation<TeamsScreenNavigationProp>();
  const { teams, loadTeams, isLoading, setupRealTimeListeners } = useAppStore();
  const { colors } = useTheme();

  useEffect(() => {
    console.log('TeamsScreen: Loading teams...');
    loadTeams();
    
    // Setup real-time listeners
    const cleanup = setupRealTimeListeners();
    
    return () => {
      console.log('TeamsScreen: Cleaning up listeners...');
      cleanup();
    };
  }, []);

  useEffect(() => {
    console.log('TeamsScreen: Teams updated:', teams.length, 'teams');
    console.log('TeamsScreen: Teams data:', teams);
  }, [teams]);

  const onRefresh = () => {
    loadTeams();
  };

  const renderTeam = ({ item }: { item: Team }) => (
    <TouchableOpacity
      style={[styles.teamCard, { backgroundColor: colors.surface }]}
      onPress={() => navigation.navigate('TeamDetail', { teamId: item.id })}
    >
      <View style={styles.teamHeader}>
        {item.logo ? (
          <Image
            source={{ uri: item.logo }}
            style={styles.teamLogo}
            resizeMode="contain"
          />
        ) : (
          <View style={[styles.teamColor, { backgroundColor: item.color || '#3B82F6' }]} />
        )}
        <Text style={[styles.teamName, { color: colors.text }]}>{item.name || 'Unknown Team'}</Text>
        <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
      </View>
      
      <View style={styles.teamStats}>
        <View style={styles.stat}>
          <Text style={[styles.statValue, { color: colors.text }]}>{item.players?.length || 0}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Players</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.header }]}>
        <Text style={[styles.title, { color: colors.text }]}>Teams</Text>
      </View>

      <FlatList
        data={teams || []}
        renderItem={renderTeam}
        keyExtractor={(item) => item.id || Math.random().toString()}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={onRefresh} />
        }
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="people-outline" size={48} color={colors.textTertiary} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No teams found</Text>
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
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  list: {
    padding: 20,
  },
  teamCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  teamHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  teamColor: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: 12,
  },
  teamLogo: {
    width: 24,
    height: 24,
    marginRight: 12,
    borderRadius: 12,
  },
  teamName: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
  },
  teamStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  stat: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 12,
    marginTop: 4,
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    marginTop: 12,
  },
});

export default TeamsScreen;
