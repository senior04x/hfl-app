import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  SafeAreaView,
} from 'react-native';
import { useTheme } from '../store/useThemeStore';
import { useLanguage } from '../store/useLanguageStore';
import { Trainer, Team, Player } from '../types';
import { mongodbService } from '../services/mongodbService';

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
      
      // Load team data
      const teamResult = await mongodbService.getTeamById(trainer.teamId);
      if (teamResult.success && teamResult.data) {
        setTeam(teamResult.data);
      }
      
      // Load team players
      const playersResult = await mongodbService.getPlayersByTeam(trainer.teamId);
      if (playersResult.success && playersResult.data) {
        setPlayers(playersResult.data);
      }
      
    } catch (error) {
      console.error('Error loading team data:', error);
      Alert.alert('Xatolik', 'Jamoaning ma\'lumotlarini yuklashda xatolik');
    } finally {
      setLoading(false);
    }
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
    navigation.navigate('TeamTactics', { 
      teamId: trainer.teamId,
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
      <ScrollView style={styles.scrollView}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>
            Murabbiy Dashboard
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {trainer.name} - {trainer.teamName}
          </Text>
        </View>

        <View style={styles.statsContainer}>
          <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
            <Text style={[styles.statNumber, { color: colors.primary }]}>
              {players.length}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
              O'yinchilar
            </Text>
          </View>
          
          <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
            <Text style={[styles.statNumber, { color: colors.primary }]}>
              {players.filter(p => p.isCaptain).length}
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
            <Text style={styles.actionIcon}>👥</Text>
            <Text style={styles.actionTitle}>Jamoani Boshqarish</Text>
            <Text style={[styles.actionDescription, { color: colors.textSecondary }]}>
              O'yinchilarni ko'rish va boshqarish
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.secondary }]}
            onPress={handleSelectCaptain}
          >
            <Text style={styles.actionIcon}>👑</Text>
            <Text style={styles.actionTitle}>Kapitan Tanlash</Text>
            <Text style={[styles.actionDescription, { color: colors.textSecondary }]}>
              Jamoaning kapitanini belgilash
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.accent }]}
            onPress={handleTactics}
          >
            <Text style={styles.actionIcon}>⚽</Text>
            <Text style={styles.actionTitle}>Taktika</Text>
            <Text style={[styles.actionDescription, { color: colors.textSecondary }]}>
              Jamoaning taktikasini sozlash
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.playersContainer}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Jamoaning O'yinchilari
          </Text>
          {players.map((player) => (
            <View key={player.id} style={[styles.playerCard, { backgroundColor: colors.surface }]}>
              <View style={styles.playerInfo}>
                <Text style={[styles.playerName, { color: colors.text }]}>
                  {player.firstName} {player.lastName}
                  {player.isCaptain && <Text style={[styles.captainBadge, { color: colors.primary }]}> 👑</Text>}
                </Text>
                <Text style={[styles.playerPosition, { color: colors.textSecondary }]}>
                  {player.position} • #{player.number}
                </Text>
              </View>
              <View style={styles.playerStats}>
                <Text style={[styles.statText, { color: colors.textSecondary }]}>
                  {player.goals} gol
                </Text>
                <Text style={[styles.statText, { color: colors.textSecondary }]}>
                  {player.assists} assist
                </Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
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
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
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
  actionIcon: {
    fontSize: 30,
    marginRight: 15,
  },
  actionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
  },
  actionDescription: {
    fontSize: 14,
    flex: 1,
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
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
  },
  playerInfo: {
    flex: 1,
  },
  playerName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  captainBadge: {
    fontSize: 16,
  },
  playerPosition: {
    fontSize: 14,
  },
  playerStats: {
    alignItems: 'flex-end',
  },
  statText: {
    fontSize: 12,
    marginBottom: 2,
  },
});

export default TrainerDashboard;
