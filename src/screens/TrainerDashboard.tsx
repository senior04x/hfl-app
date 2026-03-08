import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  SafeAreaView,
} from 'react-native';
import SafeScrollView from '../components/SafeScrollView';
import { useTheme } from '../store/useThemeStore';
import { useLanguage } from '../store/useLanguageStore';
import { useTeamStore } from '../store/useTeamStore';
import { Trainer, Team, Player } from '../types';
import { mongodbService } from '../services/mongodbService';
import { DataService } from '../services/data';

interface TrainerDashboardProps {
  navigation: any;
  route: {
    params: {
      trainerId: string;
      trainer: Trainer;
    };
  };
}

const TrainerDashboard: React.FC<TrainerDashboardProps> = ({ navigation, route }) => {
  const { colors } = useTheme();
  const { getText } = useLanguage();
  const { logout } = useTeamStore();
  const { trainer } = route.params;
  
  const [team, setTeam] = useState<Team | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTeamData();
  }, []);

  const loadTeamData = async () => {
    try {
      setLoading(true);
      
      console.log('🔍 Loading team data for trainer:', trainer);
      console.log('🔍 Team ID:', trainer.teamId);
      console.log('🔍 Trainer object keys:', Object.keys(trainer));
      
      if (!trainer.teamId) {
        console.error('❌ No teamId in trainer object');
        console.log('🔍 Trainer object:', trainer);
        Alert.alert('Xatolik', 'Team ID topilmadi');
        return;
      }
      
      // Load team data using DataService (same as TeamDetail)
      console.log('🔍 Using DataService.getTeam() like TeamDetail');
      const teamData = await DataService.getTeam(trainer.teamId);
      
      if (teamData) {
        console.log('✅ Team data loaded:', teamData);
        console.log('👥 Team players:', teamData.players?.length || 0);
        setTeam(teamData);
        
        // Set players from team data (same as TeamDetail)
        if (teamData.players && Array.isArray(teamData.players)) {
          console.log('✅ Setting players from team data:', teamData.players);
          setPlayers(teamData.players);
        } else {
          console.log('⚠️ No players in team data');
          setPlayers([]);
        }
      } else {
        console.log('❌ Team not found');
        Alert.alert('Xatolik', 'Jamoa topilmadi');
      }
      
    } catch (error) {
      console.error('Error loading team data:', error);
      Alert.alert('Xatolik', 'Jamoaning ma\'lumotlarini yuklashda xatolik');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Chiqish',
      'Jamoaning tizimidan chiqishni xohlaysizmi?',
      [
        {
          text: 'Bekor qilish',
          style: 'cancel',
        },
        {
          text: 'Chiqish',
          style: 'destructive',
          onPress: () => {
            logout();
            navigation.reset({
              index: 0,
              routes: [{ name: 'Main' }],
            });
          },
        },
      ]
    );
  };

  const handleManageTeam = () => {
    navigation.navigate('TeamManagement', { 
      teamId: trainer.teamId,
      trainer: trainer 
    });
  };

  const handleSelectCaptain = () => {
    navigation.navigate('CaptainSelection', { 
      teamId: trainer.teamId,
      players: players,
      trainer: trainer 
    });
  };

  const handleTactics = () => {
    console.log('🔍 handleTactics called');
    console.log('🔍 team:', team);
    console.log('🔍 trainer:', trainer);
    console.log('🔍 team?.id:', team?.id);
    console.log('🔍 trainer.teamId:', trainer.teamId);
    
    const teamId = team?.id || trainer.teamId;
    console.log('🔍 Final teamId:', teamId);
    
    navigation.navigate('TeamFormation', { 
      teamId: teamId,
      team: team,
      trainer: trainer 
    });
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <Text style={[styles.loadingText, { color: colors.text }]}>
            Yuklanmoqda...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <SafeScrollView style={styles.scrollView}>
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <Text style={[styles.title, { color: colors.text }]}>
              Murabbiy Dashboard
            </Text>
            <View style={styles.headerButtons}>
              <TouchableOpacity
                style={[styles.headerButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
                onPress={() => navigation.navigate('Main')}
              >
                <Text style={[styles.headerButtonText, { color: colors.text }]}>
                  Bosh sahifa
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.headerButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
                onPress={handleLogout}
              >
                <Text style={[styles.headerButtonText, { color: colors.text }]}>
                  Chiqish
                </Text>
              </TouchableOpacity>
            </View>
          </View>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {trainer.teamName}
          </Text>
          <Text style={[styles.trainerInfo, { color: colors.textTertiary }]}>
            Murabbiy: {team?.captainName || trainer.name || 'Noma\'lum'}
          </Text>
        </View>

        <View style={styles.statsContainer}>
          <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
            <Text style={[styles.statNumber, { color: colors.primary }]}>
              {players && Array.isArray(players) ? players.length : 0}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
              O'yinchilar
            </Text>
          </View>
          
          <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
            <Text style={[styles.statNumber, { color: colors.primary }]}>
              {players && Array.isArray(players) ? players.filter(p => p.isCaptain).length : 0}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
              Kapitan
            </Text>
          </View>
        </View>

        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.primary }]}
            onPress={handleManageTeam}
          >
            <View style={styles.actionContent}>
              <View style={styles.actionIcon}>
                <Text style={styles.actionIconText}>👥</Text>
              </View>
              <View style={styles.actionText}>
                <Text style={styles.actionTitle}>Jamoani Boshqarish</Text>
                <Text style={[styles.actionDescription, { color: colors.textSecondary }]}>
                  O'yinchilarni ko'rish va boshqarish
                </Text>
              </View>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: '#8B5CF6' }]}
            onPress={handleSelectCaptain}
          >
            <View style={styles.actionContent}>
              <View style={styles.actionIcon}>
                <Text style={styles.actionIconText}>👑</Text>
              </View>
              <View style={styles.actionText}>
                <Text style={styles.actionTitle}>Kapitan Tanlash</Text>
                <Text style={[styles.actionDescription, { color: colors.textSecondary }]}>
                  Jamoaning kapitanini belgilash
                </Text>
              </View>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: '#10B981' }]}
            onPress={handleTactics}
          >
            <View style={styles.actionContent}>
              <View style={styles.actionIcon}>
                <Text style={styles.actionIconText}>⚽</Text>
              </View>
              <View style={styles.actionText}>
                <Text style={styles.actionTitle}>Taktika</Text>
                <Text style={[styles.actionDescription, { color: colors.textSecondary }]}>
                  Jamoaning taktikasini sozlash
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.playersContainer}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Jamoaning O'yinchilari ({players ? players.length : 0})
          </Text>
          {console.log('🔍 Rendering players:', players)}
          {console.log('🔍 Players type:', typeof players)}
          {console.log('🔍 Players isArray:', Array.isArray(players))}
          {players && Array.isArray(players) ? players
            .sort((a, b) => (a.number || 0) - (b.number || 0))
            .map((player) => (
            <TouchableOpacity 
              key={player.id} 
              style={[styles.playerCard, { backgroundColor: colors.surface }]}
              onPress={() => {
                const playerId = player.id || player._id;
                navigation.navigate('PlayerStats', {
                  playerId: playerId,
                  playerName: `${player.firstName} ${player.lastName}`
                });
              }}
            >
              <View style={[styles.playerNumber, { backgroundColor: colors.primary }]}>
                <Text style={[styles.playerNumberText, { color: 'white' }]}>
                  {player.number || '?'}
                </Text>
              </View>
              <View style={styles.playerInfo}>
                <Text style={[styles.playerName, { color: colors.text }]}>
                  {player.firstName} {player.lastName}
                  {player.isCaptain && <Text style={[styles.captainBadge, { color: colors.primary }]}> 👑</Text>}
                </Text>
                <Text style={[styles.playerPosition, { color: colors.textSecondary }]}>
                  {player.position || 'Noma\'lum'}
                </Text>
                <Text style={[styles.playerPhone, { color: colors.textTertiary }]}>
                  {player.phone}
                </Text>
              </View>
              <View style={[styles.statusBadge, { 
                backgroundColor: player.status === 'active' ? colors.success : 
                                player.status === 'inactive' ? colors.textTertiary : colors.error 
              }]}>
                <Text style={[styles.statusText, { color: 'white' }]}>
                  {player.status === 'active' ? 'Faol' : 
                   player.status === 'inactive' ? 'Nofaol' : 'Noma\'lum'}
                </Text>
              </View>
            </TouchableOpacity>
          )) : (
            <Text style={[styles.noPlayersText, { color: colors.textSecondary }]}>
              Hozircha o'yinchilar yo'q
            </Text>
          )}
        </View>
      </SafeScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 18,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    padding: 20,
    paddingTop: 10,
    marginBottom: 20,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    flex: 1,
  },
  subtitle: {
    fontSize: 16,
    opacity: 0.7,
  },
  trainerInfo: {
    fontSize: 14,
    opacity: 0.6,
    marginTop: 4,
  },
  headerButtons: {
    flexDirection: 'column',
    gap: 8,
  },
  headerButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  headerButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 20,
    gap: 15,
  },
  statCard: {
    flex: 1,
    padding: 20,
    borderRadius: 10,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  statLabel: {
    fontSize: 14,
  },
  actionsContainer: {
    paddingHorizontal: 20,
    marginBottom: 30,
    gap: 15,
  },
  actionButton: {
    padding: 20,
    borderRadius: 15,
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  actionIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  actionIconText: {
    fontSize: 24,
  },
  actionText: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
  },
  actionDescription: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  playersContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  playerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
  },
  playerNumber: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  playerNumberText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  playerInfo: {
    flex: 1,
  },
  playerName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  captainBadge: {
    fontSize: 16,
  },
  playerPosition: {
    fontSize: 14,
    marginBottom: 2,
  },
  playerPhone: {
    fontSize: 12,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 10,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
  },
  noPlayersText: {
    textAlign: 'center',
    fontSize: 16,
    marginTop: 20,
    fontStyle: 'italic',
  },
});

export default TrainerDashboard;
