import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import { useRoute, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import { DataService } from '../services/data';
import { Team, Player } from '../types';

type TeamDetailRouteProp = RouteProp<RootStackParamList, 'TeamDetail'>;

const TeamDetailScreen = () => {
  const route = useRoute<TeamDetailRouteProp>();
  const { teamId } = route.params;
  
  const [team, setTeam] = useState<Team | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadTeam = async () => {
      try {
        const teamData = await DataService.getTeam(teamId);
        setTeam(teamData);
      } catch (error) {
        console.error('Error loading team:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadTeam();
  }, [teamId]);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading team details...</Text>
      </View>
    );
  }

  if (!team) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle" size={48} color="#FF3B30" />
        <Text style={styles.errorText}>Team not found</Text>
      </View>
    );
  }

  const renderPlayer = ({ item }: { item: Player }) => (
    <View style={styles.playerCard}>
      <View style={styles.playerNumber}>
        <Text style={styles.playerNumberText}>{item.number}</Text>
      </View>
      <View style={styles.playerInfo}>
        <Text style={styles.playerName}>{item.name}</Text>
        <Text style={styles.playerPosition}>{item.position}</Text>
      </View>
    </View>
  );

  const getPositionColor = (position: string) => {
    switch (position) {
      case 'GK':
        return '#FF3B30';
      case 'DEF':
        return '#007AFF';
      case 'MID':
        return '#34C759';
      case 'FWD':
        return '#FF9500';
      default:
        return '#666';
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.teamHeader}>
          <View style={[styles.teamColor, { backgroundColor: team.color }]} />
          <Text style={styles.teamName}>{team.name}</Text>
        </View>
        <Text style={styles.teamStats}>{team.players.length} players</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Players</Text>
        
        <FlatList
          data={team.players.sort((a, b) => a.number - b.number)}
          renderItem={renderPlayer}
          keyExtractor={(item) => item.id}
          scrollEnabled={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="people-outline" size={48} color="#ccc" />
              <Text style={styles.emptyText}>No players found</Text>
            </View>
          }
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Team Information</Text>
        
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Ionicons name="football" size={20} color="#666" />
            <Text style={styles.infoLabel}>Team Name:</Text>
            <Text style={styles.infoValue}>{team.name}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Ionicons name="color-palette" size={20} color="#666" />
            <Text style={styles.infoLabel}>Team Color:</Text>
            <View style={styles.colorContainer}>
              <View style={[styles.colorPreview, { backgroundColor: team.color }]} />
              <Text style={styles.infoValue}>{team.color}</Text>
            </View>
          </View>
          
          <View style={styles.infoRow}>
            <Ionicons name="people" size={20} color="#666" />
            <Text style={styles.infoLabel}>Total Players:</Text>
            <Text style={styles.infoValue}>{team.players.length}</Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Position Breakdown</Text>
        
        <View style={styles.positionStats}>
          {['GK', 'DEF', 'MID', 'FWD'].map((position) => {
            const count = team.players.filter(p => p.position === position).length;
            return (
              <View key={position} style={styles.positionStat}>
                <View style={[styles.positionBadge, { backgroundColor: getPositionColor(position) }]}>
                  <Text style={styles.positionText}>{position}</Text>
                </View>
                <Text style={styles.positionCount}>{count}</Text>
              </View>
            );
          })}
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  errorText: {
    marginTop: 16,
    fontSize: 18,
    color: '#FF3B30',
  },
  header: {
    backgroundColor: 'white',
    padding: 20,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  teamHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  teamColor: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginRight: 12,
  },
  teamName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  teamStats: {
    fontSize: 16,
    color: '#666',
  },
  section: {
    margin: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  playerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 16,
    marginBottom: 8,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  playerNumber: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  playerNumberText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  playerInfo: {
    flex: 1,
  },
  playerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  playerPosition: {
    fontSize: 14,
    color: '#666',
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
  infoCard: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
    marginLeft: 12,
    marginRight: 8,
  },
  infoValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  colorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  colorPreview: {
    width: 20,
    height: 20,
    borderRadius: 10,
    marginRight: 8,
  },
  positionStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
  },
  positionStat: {
    alignItems: 'center',
  },
  positionBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  positionText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  positionCount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
});

export default TeamDetailScreen;
