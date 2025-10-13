import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  // ActivityIndicator, // Skeleton loading ishlatamiz
  FlatList,
  Image,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { useRoute, RouteProp, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import { DataService } from '../services/data';
import { Team, Player, RootStackParamList } from '../types';
import { useTheme } from '../store/useThemeStore';
import { useLanguage } from '../store/useLanguageStore';
import TeamFormationScreen from './TeamFormationScreen';

type TeamDetailRouteProp = RouteProp<RootStackParamList, 'TeamDetail'>;

const TeamDetailScreen = () => {
  const route = useRoute<TeamDetailRouteProp>();
  const navigation = useNavigation();
  const { colors } = useTheme();
  const { getText } = useLanguage();
  const { teamId } = route.params;
  
  const [team, setTeam] = useState<Team | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showFormation, setShowFormation] = useState(false);

  useEffect(() => {
    const loadTeam = async () => {
      try {
        console.log('🔍 Loading team with ID:', teamId);
        console.log('🔍 Route params:', route.params);
        
        // teamId ni route.params dan olish
        const actualTeamId = route.params?.teamId || teamId;
        
        console.log('🔍 Route params teamId:', route.params?.teamId);
        console.log('🔍 Component teamId:', teamId);
        console.log('🔍 Actual teamId:', actualTeamId);
        
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
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
          {/* Skeleton loading ishlatamiz */}
          <Text style={[styles.loadingText, { color: colors.text }]}>Loading team details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!team) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.errorContainer, { backgroundColor: colors.background }]}>
          <Ionicons name="alert-circle" size={48} color={colors.error} />
          <Text style={[styles.errorText, { color: colors.text }]}>Team not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const renderPlayer = ({ item }: { item: Player }) => {
    console.log('Rendering player:', item);
    return (
      <TouchableOpacity 
        style={[styles.playerCard, { backgroundColor: colors.surface }]}
        onPress={() => {
          console.log('Player clicked:', item);
          console.log('Player ID:', item.id);
          console.log('Player _id:', item._id);
          const playerId = item.id || item._id;
          console.log('Using player ID:', playerId);
          navigation.navigate('PlayerStats', {
            playerId: playerId,
            playerName: `${item.firstName} ${item.lastName}`
          });
        }}
      >
        <View style={[styles.playerNumber, { backgroundColor: colors.primary }]}>
          <Text style={[styles.playerNumberText, { color: 'white' }]}>{item.number || '?'}</Text>
        </View>
        <View style={styles.playerInfo}>
          <Text style={[styles.playerName, { color: colors.text }]}>{item.firstName} {item.lastName}</Text>
          <Text style={[styles.playerPosition, { color: colors.textSecondary }]}>{item.position || getText('unknown')}</Text>
          <Text style={[styles.playerPhone, { color: colors.textTertiary }]}>{item.phone}</Text>
        </View>
        <View style={[styles.statusBadge, { 
          backgroundColor: item.status === 'active' ? colors.success : 
                          item.status === 'inactive' ? colors.textTertiary : colors.error 
        }]}>
          <Text style={[styles.statusText, { color: 'white' }]}>
            {item.status === 'active' ? getText('active') : 
             item.status === 'inactive' ? getText('inactive') : getText('suspended')}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
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

  const handleShowFormation = () => {
    setShowFormation(true);
  };

  const handleCloseFormation = () => {
    setShowFormation(false);
  };

  // Show formation screen if requested
  if (showFormation) {
    return (
      <TeamFormationScreen 
        team={team}
        onClose={handleCloseFormation}
      />
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView style={[styles.scrollView, { backgroundColor: colors.background }]} showsVerticalScrollIndicator={false} bounces={false}>
      <View style={[styles.header, { backgroundColor: colors.header }]}>
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
          <Text style={[styles.teamName, { color: colors.text }]}>{team.name || getText('unknownTeam')}</Text>
        </View>
        <Text style={[styles.teamStats, { color: colors.textSecondary }]}>{team.players?.length || 0} {getText('players')}</Text>
      </View>

      <View style={[styles.section, { backgroundColor: colors.background }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>{getText('players')} ({team.players?.length || 0})</Text>
        
        {team.players && team.players.length > 0 ? (
          <FlatList
            data={team.players.sort((a, b) => (a.number || 0) - (b.number || 0))}
            renderItem={renderPlayer}
            keyExtractor={(item) => item.id || Math.random().toString()}
            scrollEnabled={false}
          />
        ) : (
          <View style={[styles.emptyContainer, { backgroundColor: colors.background }]}>
            <Ionicons name="people-outline" size={48} color={colors.textTertiary} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>{getText('noPlayersFound')}</Text>
          </View>
        )}
      </View>

      <View style={[styles.section, { backgroundColor: colors.background }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>{getText('teamInformation')}</Text>
        
        <View style={[styles.infoCard, { backgroundColor: colors.surface }]}>
          <View style={styles.infoRow}>
            <Ionicons name="football" size={20} color={colors.textSecondary} />
            <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>{getText('teamName')}:</Text>
            <Text style={[styles.infoValue, { color: colors.text }]}>{team.name || getText('unknownTeam')}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Ionicons name="color-palette" size={20} color={colors.textSecondary} />
            <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>{getText('teamColor')}:</Text>
            <View style={styles.colorContainer}>
              <View style={[styles.colorPreview, { backgroundColor: team.color || '#3B82F6' }]} />
              <Text style={[styles.infoValue, { color: colors.text }]}>{team.color || '#3B82F6'}</Text>
            </View>
          </View>
          
          <View style={styles.infoRow}>
            <Ionicons name="people" size={20} color={colors.textSecondary} />
            <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>{getText('totalPlayers')}:</Text>
            <Text style={[styles.infoValue, { color: colors.text }]}>{team.players?.length || 0}</Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{getText('positionBreakdown')}</Text>
        
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

      {/* Formation Button Section */}
      <View style={[styles.formationSection, { backgroundColor: colors.surface }]}>
        <TouchableOpacity 
          style={[styles.formationButton, { backgroundColor: colors.primary }]}
          onPress={handleShowFormation}
        >
          <Ionicons name="football" size={24} color="white" />
          <Text style={styles.formationButtonText}>Tarkibni Ko'rish</Text>
          <Ionicons name="chevron-forward" size={20} color="white" />
        </TouchableOpacity>
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
  formationSection: {
    margin: 16,
    borderRadius: 12,
    overflow: 'hidden',
  },
  formationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 12,
  },
  formationButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
});

export default TeamDetailScreen;
