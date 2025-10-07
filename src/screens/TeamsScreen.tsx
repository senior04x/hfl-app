import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  TouchableOpacity, 
  StyleSheet, 
  Alert, 
  Image,
  TextInput,
  ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Team } from '../types';
import { DataService } from '../services/data';
import { handleError } from '../utils/errorHandling';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../store/useThemeStore';
import { useLanguage } from '../store/useLanguageStore';

export default function TeamsScreen() {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const { getText } = useLanguage();
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTeams();
  }, []);

  const loadTeams = async () => {
    try {
      setLoading(true);
      console.log('Loading teams...');
      
      const teams = await DataService.getTeams();
      
      if (teams && teams.length > 0) {
        console.log('Teams loaded successfully:', teams.length);
        setTeams(teams);
      } else {
        console.log('No teams returned from DataService');
        // Fallback: Mock data for testing
        const mockTeams = [
          {
            id: 'mock-1',
            name: 'Real Madrid',
            logo: 'https://example.com/real-madrid.png',
            league: 'La Liga',
            founded: 1902,
            city: 'Madrid',
            country: 'Spain',
            color: '#FFD700',
            players: [],
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          {
            id: 'mock-2',
            name: 'Barcelona',
            logo: 'https://example.com/barcelona.png',
            league: 'La Liga',
            founded: 1899,
            city: 'Barcelona',
            country: 'Spain',
            color: '#004D98',
            players: [],
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          {
            id: 'mock-3',
            name: 'Manchester United',
            logo: 'https://example.com/manchester-united.png',
            league: 'Premier League',
            founded: 1878,
            city: 'Manchester',
            country: 'England',
            color: '#DA020E',
            players: [],
            createdAt: new Date(),
            updatedAt: new Date(),
          }
        ];
        
        console.log('Mock teams loaded:', mockTeams.length);
        setTeams(mockTeams);
      }
      
    } catch (error) {
      console.error('Load teams error:', error);
      handleError(error, { screen: 'TeamsScreen', action: 'loadTeams' });
    } finally {
      setLoading(false);
    }
  };

  const handleShowDetails = (team: Team) => {
    console.log('🔍 Team details clicked:', team);
    console.log('🔍 Team ID:', team.id);
    console.log('🔍 Team _id:', team._id);
    console.log('🔍 Team name:', team.name);
    
    // Use _id if id is not available
    const teamId = team.id || team._id;
    
    if (!teamId) {
      console.error('❌ Team ID is missing!');
      Alert.alert(getText('error'), getText('teamIdNotFound'));
      return;
    }
    
    // Navigate to team detail screen
    navigation.navigate('TeamDetail', { teamId: teamId });
    console.log('✅ Navigating to team detail page with ID:', teamId);
  };

  const renderTeam = ({ item }: { item: Team }) => (
    <TouchableOpacity 
      style={[styles.teamCard, { backgroundColor: colors.surface }]}
      onPress={() => handleShowDetails(item)}
    >
      <View style={styles.teamHeader}>
        <View style={styles.teamInfo}>
          {item.logo ? (
            <Image source={{ uri: item.logo }} style={styles.teamLogo} />
          ) : (
            <View style={[styles.teamLogoPlaceholder, { backgroundColor: item.color || '#3B82F6' }]}>
              <Text style={styles.teamInitial}>{item.name?.charAt(0) || '?'}</Text>
            </View>
          )}
          <View style={styles.teamDetails}>
            <Text style={[styles.teamName, { color: colors.text }]}>{item.name}</Text>
          </View>
        </View>
        <View style={styles.teamActions}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.primary }]}
            onPress={() => handleShowDetails(item)}
          >
            <Ionicons name="eye" size={16} color="white" />
          </TouchableOpacity>
        </View>
      </View>
      <View style={styles.teamFooter}>
        <View style={styles.colorIndicator}>
          <View
            style={[styles.colorDot, { backgroundColor: item.color || '#3B82F6' }]}
          />
          <Text style={[styles.colorText, { color: colors.textSecondary }]}>{getText('teamColor')}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, styles.centerContent, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.text }]}>{getText('teamsLoading')}</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.text }]}>{getText('teams')}</Text>
      </View>
      
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {teams && teams.length > 0 ? (
          <View style={styles.teamsList}>
            {teams.map((team, index) => (
              <View key={team.id || team._id || index}>
                {renderTeam({ item: team })}
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="people-outline" size={64} color={colors.textSecondary} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              {getText('noTeamsAvailable')}
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingTop: 16,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  scrollView: {
    flex: 1,
  },
  teamsList: {
    padding: 16,
  },
  teamCard: {
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
  teamHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  teamInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  teamLogo: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
  },
  teamLogoPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  teamInitial: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  teamDetails: {
    flex: 1,
  },
  teamName: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  teamPlayers: {
    fontSize: 14,
  },
  teamActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  teamFooter: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  colorIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  colorDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: 8,
  },
  colorText: {
    fontSize: 12,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 64,
  },
  emptyText: {
    fontSize: 16,
    marginTop: 16,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
});