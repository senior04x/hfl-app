import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  // ActivityIndicator, // Skeleton loading ishlatamiz
  FlatList,
  Image,
  SafeAreaView,
  TouchableOpacity,
} from 'react-native';
import { useRoute, RouteProp, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import { DataService } from '../services/data';
import { Team, Player, RootStackParamList } from '../types';

type TeamDetailRouteProp = RouteProp<RootStackParamList, 'TeamDetail'>;

const TeamDetailScreen = () => {
  const route = useRoute<TeamDetailRouteProp>();
  const navigation = useNavigation();
  const { teamId } = route.params;
  
  const [team, setTeam] = useState<Team | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadTeam = async () => {
      try {
        console.log('🔍 Loading team with ID:', teamId);
        console.log('🔍 Route params:', route.params);
        
        // teamId ni route.params dan olish
        const actualTeamId = route.params?.teamId || teamId;
        
        if (!actualTeamId) {
          console.error('❌ No team ID provided in route params');
          console.error('❌ Route params:', route.params);
          setIsLoading(false);
          return;
        }

        console.log('🔍 Using team ID:', actualTeamId);

        const teamData = await DataService.getTeam(actualTeamId);
        
        if (teamData) {
          console.log('✅ Team data loaded:', teamData);
          console.log('👥 Team players:', teamData.players?.length || 0);
          setTeam(teamData);
        } else {
          console.log('❌ Team not found in database');
          setTeam(null);
        }
      } catch (error) {
        console.error('❌ Error loading team:', error);
        console.error('❌ Error details:', error.message);
        setTeam(null);
      } finally {
        setIsLoading(false);
      }
    };

    loadTeam();
  }, [teamId, route.params]);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        {/* Skeleton loading ishlatamiz */}
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

  const renderPlayer = ({ item }: { item: Player }) => {
    console.log('Rendering player:', item);
    return (
      <TouchableOpacity 
        style={styles.playerCard}
        onPress={() => {
          navigation.navigate('PlayerStats', {
            playerId: item.id,
            playerName: `${item.firstName} ${item.lastName}`
          });
        }}
      >
        <View style={styles.playerNumber}>
          <Text style={styles.playerNumberText}>{item.number || '?'}</Text>
        </View>
        <View style={styles.playerInfo}>
          <Text style={styles.playerName}>{item.firstName} {item.lastName}</Text>
          <Text style={styles.playerPosition}>{item.position || 'Unknown'}</Text>
          <Text style={styles.playerPhone}>{item.phone}</Text>
        </View>
        <View style={[styles.statusBadge, { 
          backgroundColor: item.status === 'active' ? '#34C759' : 
                          item.status === 'inactive' ? '#8E8E93' : '#FF3B30' 
        }]}>
          <Text style={styles.statusText}>
            {item.status === 'active' ? 'Faol' : 
             item.status === 'inactive' ? 'Nofaol' : 'Suspensiya'}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#8E8E93" />
      </TouchableOpacity>
    );
  };

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
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
      <View style={styles.header}>
        <View style={styles.teamHeader}>
          {team.logo ? (
            <Image
              source={{ uri: team.logo }}
              style={styles.teamLogo}
              resizeMode="contain"
            />
          ) : (
            <View style={[styles.teamColor, { backgroundColor: team.color || '#3B82F6' }]} />
          )}
          <Text style={styles.teamName}>{team.name || 'Unknown Team'}</Text>
        </View>
        <Text style={styles.teamStats}>{team.players?.length || 0} players</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Players ({team.players?.length || 0})</Text>
        
        {team.players && team.players.length > 0 ? (
          <FlatList
            data={team.players.sort((a, b) => (a.number || 0) - (b.number || 0))}
            renderItem={renderPlayer}
            keyExtractor={(item) => item.id || Math.random().toString()}
            scrollEnabled={false}
          />
        ) : (
          <View style={styles.emptyContainer}>
            <Ionicons name="people-outline" size={48} color="#ccc" />
            <Text style={styles.emptyText}>No players found</Text>
          </View>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Team Information</Text>
        
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Ionicons name="football" size={20} color="#666" />
            <Text style={styles.infoLabel}>Team Name:</Text>
            <Text style={styles.infoValue}>{team.name || 'Unknown Team'}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Ionicons name="color-palette" size={20} color="#666" />
            <Text style={styles.infoLabel}>Team Color:</Text>
            <View style={styles.colorContainer}>
              <View style={[styles.colorPreview, { backgroundColor: team.color || '#3B82F6' }]} />
              <Text style={styles.infoValue}>{team.color || '#3B82F6'}</Text>
            </View>
          </View>
          
          <View style={styles.infoRow}>
            <Ionicons name="people" size={20} color="#666" />
            <Text style={styles.infoLabel}>Total Players:</Text>
            <Text style={styles.infoValue}>{team.players?.length || 0}</Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Position Breakdown</Text>
        
        <View style={styles.positionStats}>
          {['GK', 'DEF', 'MID', 'FWD'].map((position) => {
            const count = team.players?.filter(p => p.position === position).length || 0;
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
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
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
  teamLogo: {
    width: 40,
    height: 40,
    marginRight: 12,
    borderRadius: 20,
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
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  statusText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
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
