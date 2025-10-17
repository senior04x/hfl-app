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
import { Trainer, Player } from '../types';
import { mongodbService } from '../services/mongodbService';

interface CaptainSelectionProps {
  navigation: any;
  route: {
    params: {
      teamId: string;
      players: Player[];
      trainer: Trainer;
    };
  };
}

const CaptainSelection: React.FC<CaptainSelectionProps> = ({ navigation, route }) => {
  const { colors } = useTheme();
  const { getText } = useLanguage();
  const { teamId, players: initialPlayers, trainer } = route.params;
  
  const [players, setPlayers] = useState<Player[]>(initialPlayers);
  const [selectedCaptain, setSelectedCaptain] = useState<Player | null>(
    initialPlayers.find(p => p.isCaptain) || null
  );
  const [loading, setLoading] = useState(false);

  const handleSelectCaptain = async (player: Player) => {
    if (selectedCaptain?.id === player.id) {
      Alert.alert('Diqqat', 'Bu o\'yinchi allaqachon kapitan');
      return;
    }

    Alert.alert(
      'Kapitan tanlash',
      `${player.firstName} ${player.lastName}ni jamoaning kapitan qilishni xohlaysizmi?`,
      [
        { text: 'Bekor qilish', style: 'cancel' },
        {
          text: 'Tasdiqlash',
          onPress: async () => {
            try {
              setLoading(true);
              
              // Remove captain status from current captain
              if (selectedCaptain) {
                await mongodbService.updatePlayer(selectedCaptain.id, { isCaptain: false });
              }
              
              // Set new captain
              const result = await mongodbService.updatePlayer(player.id, { isCaptain: true });
              
              if (result.success) {
                // Update team captain
                await mongodbService.updateTeam(teamId, { captainId: player.id });
                
                // Update local state
                setPlayers(players.map(p => ({
                  ...p,
                  isCaptain: p.id === player.id
                })));
                
                setSelectedCaptain(player);
                Alert.alert('Muvaffaqiyat', `${player.firstName} ${player.lastName} jamoaning kapitan qilindi!`);
              } else {
                Alert.alert('Xatolik', result.error || 'Kapitan tanlashda xatolik');
              }
            } catch (error) {
              console.error('Error selecting captain:', error);
              Alert.alert('Xatolik', 'Kapitan tanlashda xatolik yuz berdi');
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const getPositionColor = (position: string) => {
    switch (position?.toLowerCase()) {
      case 'goalkeeper':
      case 'darvoza':
        return '#FF6B6B';
      case 'defender':
      case 'himoyachi':
        return '#4ECDC4';
      case 'midfielder':
      case 'yarim himoyachi':
        return '#45B7D1';
      case 'forward':
      case 'hujumchi':
        return '#96CEB4';
      default:
        return colors.primary;
    }
  };

  const getPositionName = (position: string) => {
    switch (position?.toLowerCase()) {
      case 'goalkeeper':
        return 'Darvoza';
      case 'defender':
        return 'Himoyachi';
      case 'midfielder':
        return 'Yarim himoyachi';
      case 'forward':
        return 'Hujumchi';
      default:
        return position || 'Pozitsiya yo\'q';
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView style={styles.scrollView}>
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
            Kapitan Tanlash
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {trainer.teamName}
          </Text>
        </View>

        {selectedCaptain && (
          <View style={[styles.currentCaptainCard, { backgroundColor: colors.surface }]}>
            <Text style={[styles.currentCaptainTitle, { color: colors.text }]}>
              Joriy Kapitan
            </Text>
            <View style={styles.currentCaptainInfo}>
              <Text style={[styles.captainName, { color: colors.primary }]}>
                👑 {selectedCaptain.firstName} {selectedCaptain.lastName}
              </Text>
              <Text style={[styles.captainDetails, { color: colors.textSecondary }]}>
                {getPositionName(selectedCaptain.position)} • #{selectedCaptain.number}
              </Text>
            </View>
          </View>
        )}

        <View style={styles.playersContainer}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            O'yinchilar Ro'yxati
          </Text>
          
          {players.map((player) => (
            <TouchableOpacity
              key={player.id}
              style={[
                styles.playerCard, 
                { 
                  backgroundColor: colors.surface,
                  borderColor: player.isCaptain ? colors.primary : 'transparent',
                  borderWidth: player.isCaptain ? 2 : 0,
                }
              ]}
              onPress={() => handleSelectCaptain(player)}
              disabled={loading}
            >
              <View style={styles.playerMainInfo}>
                <View style={styles.playerHeader}>
                  <Text style={[styles.playerName, { color: colors.text }]}>
                    {player.firstName} {player.lastName}
                    {player.isCaptain && <Text style={[styles.captainBadge, { color: colors.primary }]}> 👑</Text>}
                  </Text>
                  <View style={[
                    styles.positionBadge, 
                    { backgroundColor: getPositionColor(player.position) }
                  ]}>
                    <Text style={styles.positionText}>
                      {getPositionName(player.position)}
                    </Text>
                  </View>
                </View>
                
                <View style={styles.playerDetails}>
                  <Text style={[styles.playerNumber, { color: colors.textSecondary }]}>
                    #{player.number}
                  </Text>
                  <Text style={[styles.playerPhone, { color: colors.textSecondary }]}>
                    {player.phone}
                  </Text>
                </View>
                
                <View style={styles.playerStats}>
                  <View style={styles.statItem}>
                    <Text style={[styles.statValue, { color: colors.primary }]}>
                      {player.goals}
                    </Text>
                    <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                      Gol
                    </Text>
                  </View>
                  
                  <View style={styles.statItem}>
                    <Text style={[styles.statValue, { color: colors.primary }]}>
                      {player.assists}
                    </Text>
                    <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                      Assist
                    </Text>
                  </View>
                  
                  <View style={styles.statItem}>
                    <Text style={[styles.statValue, { color: colors.primary }]}>
                      {player.matchesPlayed}
                    </Text>
                    <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                      O'yin
                    </Text>
                  </View>
                </View>
              </View>
              
              {!player.isCaptain && (
                <View style={styles.selectButton}>
                  <Text style={[styles.selectButtonText, { color: colors.primary }]}>
                    Kapitan qilish
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.infoContainer}>
          <Text style={[styles.infoText, { color: colors.textSecondary }]}>
            💡 Kapitan tanlash uchun o'yinchi ustiga bosing. Kapitan jamoaning lideri bo'ladi va o'yinlarda maxsus huquqlarga ega bo'ladi.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  currentCaptainCard: {
    margin: 20,
    padding: 20,
    borderRadius: 10,
  },
  currentCaptainTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  currentCaptainInfo: {
    alignItems: 'center',
  },
  captainName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  captainDetails: {
    fontSize: 14,
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  playerMainInfo: {
    flex: 1,
  },
  playerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  playerName: {
    fontSize: 16,
    fontWeight: 'bold',
    flex: 1,
  },
  captainBadge: {
    fontSize: 16,
  },
  positionBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  positionText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  playerDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  playerNumber: {
    fontSize: 14,
    fontWeight: '600',
  },
  playerPhone: {
    fontSize: 12,
  },
  playerStats: {
    flexDirection: 'row',
    gap: 20,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 12,
  },
  selectButton: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  selectButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  infoContainer: {
    margin: 20,
    padding: 15,
    borderRadius: 10,
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
  },
  infoText: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
});

export default CaptainSelection;
