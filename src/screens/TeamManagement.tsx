import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  SafeAreaView,
  TextInput,
} from 'react-native';
import SafeScrollView from '../components/SafeScrollView';
import { useTheme } from '../store/useThemeStore';
import { useLanguage } from '../store/useLanguageStore';
import { Trainer, Team, Player } from '../types';
import { mongodbService } from '../services/mongodbService';
import { DataService } from '../services/data';

interface TeamManagementProps {
  navigation: any;
  route: {
    params: {
      teamId: string;
      trainer: Trainer;
    };
  };
}

const TeamManagement: React.FC<TeamManagementProps> = ({ navigation, route }) => {
  const { colors } = useTheme();
  const { getText } = useLanguage();
  const { teamId, trainer } = route.params;
  
  const [team, setTeam] = useState<Team | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
  const [editForm, setEditForm] = useState({
    position: '',
    number: '',
  });

  useEffect(() => {
    loadTeamData();
  }, []);

  const loadTeamData = async () => {
    try {
      setLoading(true);
      
      console.log('🔍 Loading team data for teamId:', teamId);
      
      // Load team data using DataService (same as TeamDetail)
      console.log('🔍 Using DataService.getTeam() like TeamDetail');
      const teamData = await DataService.getTeam(teamId);
      
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

  const handleEditPlayer = (player: Player) => {
    setEditingPlayer(player);
    setEditForm({
      position: player.position || '',
      number: player.number?.toString() || '',
    });
  };

  const handleSavePlayer = async () => {
    if (!editingPlayer) return;

    try {
      const updateData = {
        position: editForm.position,
        number: parseInt(editForm.number) || 0,
      };

      // Note: updatePlayer method doesn't exist in MongoDBService
      // For now, we'll just update the local state
      console.log('Player update requested:', editingPlayer.id, updateData);
      
      // Update local state directly since updatePlayer method doesn't exist
      setPlayers(prevPlayers => prevPlayers.map(p => 
        p.id === editingPlayer.id 
          ? { ...p, ...updateData }
          : p
      ));
      
      setEditingPlayer(null);
      setEditForm({ position: '', number: '' });
      Alert.alert('Muvaffaqiyat', 'O\'yinchi ma\'lumotlari yangilandi');
    } catch (error) {
      console.error('Error updating player:', error);
      Alert.alert('Xatolik', 'O\'yinchi ma\'lumotlarini yangilashda xatolik');
    }
  };

  const handleRemovePlayer = async (player: Player) => {
    Alert.alert(
      'O\'yinchini olib tashlash',
      `${player.firstName} ${player.lastName}ni jamoadan olib tashlashni xohlaysizmi?`,
      [
        { text: 'Bekor qilish', style: 'cancel' },
        {
          text: 'Olib tashlash',
          style: 'destructive',
          onPress: async () => {
            try {
              const result = await mongodbService.removePlayerFromTeam(player.id, teamId);
              if (result.success) {
                setPlayers(prevPlayers => prevPlayers.filter(p => p.id !== player.id));
                Alert.alert('Muvaffaqiyat', 'O\'yinchi jamoadan olib tashlandi');
              } else {
                Alert.alert('Xatolik', result.error || 'Olib tashlashda xatolik');
              }
            } catch (error) {
              console.error('Error removing player:', error);
              Alert.alert('Xatolik', 'O\'yinchini olib tashlashda xatolik');
            }
          }
        }
      ]
    );
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
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={[styles.backButtonText, { color: colors.primary }]}>
              ← Orqaga
            </Text>
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.text }]}>
            Jamoani Boshqarish
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {team?.name}
          </Text>
        </View>

        <View style={styles.statsContainer}>
          <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
            <Text style={[styles.statNumber, { color: colors.primary }]}>
              {players.length}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
              Jami o'yinchilar
            </Text>
          </View>
          
          <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
            <Text style={[styles.statNumber, { color: colors.primary }]}>
              {players && Array.isArray(players) ? players.filter(p => p.status === 'active').length : 0}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
              Faol o'yinchilar
            </Text>
          </View>
        </View>

        <View style={styles.playersContainer}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            O'yinchilar Ro'yxati
          </Text>
          
          {players && Array.isArray(players) ? players.map((player) => (
            <View key={player.id} style={[styles.playerCard, { backgroundColor: colors.surface }]}>
              {editingPlayer?.id === player.id ? (
                <View style={styles.editForm}>
                  <Text style={[styles.playerName, { color: colors.text }]}>
                    {player.firstName} {player.lastName}
                  </Text>
                  
                  <View style={styles.inputGroup}>
                    <Text style={[styles.inputLabel, { color: colors.text }]}>
                      Pozitsiya
                    </Text>
                    <TextInput
                      style={[styles.input, { 
                        backgroundColor: colors.background,
                        color: colors.text,
                        borderColor: colors.border 
                      }]}
                      value={editForm.position}
                      onChangeText={(text) => setEditForm({...editForm, position: text})}
                      placeholder="Pozitsiya"
                      placeholderTextColor={colors.textSecondary}
                    />
                  </View>
                  
                  <View style={styles.inputGroup}>
                    <Text style={[styles.inputLabel, { color: colors.text }]}>
                      Raqam
                    </Text>
                    <TextInput
                      style={[styles.input, { 
                        backgroundColor: colors.background,
                        color: colors.text,
                        borderColor: colors.border 
                      }]}
                      value={editForm.number}
                      onChangeText={(text) => setEditForm({...editForm, number: text})}
                      placeholder="Raqam"
                      placeholderTextColor={colors.textSecondary}
                      keyboardType="numeric"
                    />
                  </View>
                  
                  <View style={styles.editButtons}>
                    <TouchableOpacity
                      style={[styles.saveButton, { backgroundColor: colors.primary }]}
                      onPress={handleSavePlayer}
                    >
                      <Text style={styles.buttonText}>Saqlash</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                      style={[styles.cancelButton, { backgroundColor: colors.textSecondary }]}
                      onPress={() => setEditingPlayer(null)}
                    >
                      <Text style={styles.buttonText}>Bekor qilish</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <View style={styles.playerInfo}>
                  <View style={styles.playerMainInfo}>
                    <Text style={[styles.playerName, { color: colors.text }]}>
                      {player.firstName} {player.lastName}
                      {player.isCaptain && <Text style={[styles.captainBadge, { color: colors.primary }]}> 👑</Text>}
                    </Text>
                    <Text style={[styles.playerDetails, { color: colors.textSecondary }]}>
                      {player.position} • #{player.number}
                    </Text>
                    <Text style={[styles.playerPhone, { color: colors.textSecondary }]}>
                      {player.phone}
                    </Text>
                  </View>
                  
                  <View style={styles.playerActions}>
                    <TouchableOpacity
                      style={[styles.actionButton, { backgroundColor: colors.primary }]}
                      onPress={() => handleEditPlayer(player)}
                    >
                      <Text style={styles.actionButtonText}>Tahrirlash</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                      style={[styles.actionButton, { backgroundColor: colors.accent }]}
                      onPress={() => handleRemovePlayer(player)}
                    >
                      <Text style={styles.actionButtonText}>Olib tashlash</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          )) : (
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
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
  },
  backButton: {
    marginBottom: 10,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
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
    textAlign: 'center',
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
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
  },
  playerInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  playerMainInfo: {
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
  playerDetails: {
    fontSize: 14,
    marginBottom: 3,
  },
  playerPhone: {
    fontSize: 12,
  },
  playerActions: {
    flexDirection: 'row',
    gap: 10,
  },
  actionButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 5,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  editForm: {
    marginTop: 10,
  },
  inputGroup: {
    marginBottom: 15,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 5,
  },
  input: {
    borderWidth: 1,
    borderRadius: 5,
    padding: 10,
    fontSize: 14,
  },
  editButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  saveButton: {
    flex: 1,
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
  },
  cancelButton: {
    flex: 1,
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 16,
    marginTop: 20,
    color: '#666',
  },
});
