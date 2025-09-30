import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../store/useThemeStore';
import { Player } from '../types';
import { DataService } from '../services/data';

interface PlayerStatsScreenProps {
  navigation: any;
  route: {
    params: {
      playerId: string;
      playerName?: string;
    };
  };
}

export default function PlayerStatsScreen({ navigation, route }: PlayerStatsScreenProps) {
  const { colors } = useTheme();
  const { playerId, playerName } = route.params;
  const [player, setPlayer] = useState<Player | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPlayerData();
  }, [playerId]);

  const loadPlayerData = async () => {
    try {
      setLoading(true);
      console.log('Loading player data for ID:', playerId);
      
      // Get player directly from Firebase
      const playerData = await DataService.getPlayer(playerId);
      
      if (playerData) {
        console.log('Player found:', playerData);
        setPlayer(playerData);
      } else {
        console.log('Player not found');
        Alert.alert('Xatolik', 'O\'yinchi ma\'lumotlari topilmadi');
        navigation.goBack();
      }
    } catch (error) {
      console.error('Error loading player data:', error);
      Alert.alert('Xatolik', 'O\'yinchi ma\'lumotlarini yuklashda xatolik yuz berdi');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const getPositionName = (position: string) => {
    const positions: { [key: string]: string } = {
      'GK': 'Darvozabon',
      'CB': 'Markaziy himoyachi',
      'LB': 'Chap qanot himoyachisi',
      'RB': 'O\'ng qanot himoyachisi',
      'CDM': 'Defensiv yarim himoyachi',
      'CM': 'Markaziy yarim himoyachi',
      'CAM': 'Hujumkor yarim himoyachi',
      'LM': 'Chap qanot yarim himoyachisi',
      'RM': 'O\'ng qanot yarim himoyachisi',
      'LW': 'Chap qanot hujumchisi',
      'RW': 'O\'ng qanot hujumchisi',
      'ST': 'Markaziy hujumchi',
      'CF': 'Soxta hujumchi',
    };
    return positions[position] || position;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return '#34C759';
      case 'inactive':
        return '#8E8E93';
      case 'suspended':
        return '#FF3B30';
      default:
        return '#8E8E93';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active':
        return 'Faol';
      case 'inactive':
        return 'Nofaol';
      case 'suspended':
        return 'Suspensiya';
      default:
        return 'Noma\'lum';
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.text }]}>
            O'yinchi ma'lumotlari yuklanmoqda...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!player) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.errorContainer}>
          <Ionicons name="person-outline" size={64} color={colors.textSecondary} />
          <Text style={[styles.errorText, { color: colors.text }]}>
            O'yinchi ma'lumotlari topilmadi
          </Text>
          <TouchableOpacity
            style={[styles.backButton, { backgroundColor: colors.primary }]}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>Orqaga qaytish</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            O'yinchi Statistikasi
          </Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Player Profile Card */}
        <View style={[styles.profileCard, { backgroundColor: colors.surface }]}>
          <View style={styles.profileHeader}>
            {player.photo ? (
              <Image source={{ uri: player.photo }} style={styles.playerPhoto} />
            ) : (
              <View style={[styles.playerPhotoPlaceholder, { backgroundColor: colors.border }]}>
                <Ionicons name="person" size={40} color={colors.textSecondary} />
              </View>
            )}
            
            <View style={styles.playerInfo}>
              <Text style={[styles.playerName, { color: colors.text }]}>
                {player.firstName || 'Noma\'lum'} {player.lastName || 'Noma\'lum'}
              </Text>
              <Text style={[styles.playerTeam, { color: colors.textSecondary }]}>
                {player.teamName || 'Jamoa nomi yo\'q'}
              </Text>
              {player.position && (
                <Text style={[styles.playerPosition, { color: colors.textSecondary }]}>
                  {getPositionName(player.position)}
                </Text>
              )}
              {player.number && (
                <Text style={[styles.playerNumber, { color: colors.primary }]}>
                  #{player.number}
                </Text>
              )}
            </View>
          </View>

          <View style={styles.statusContainer}>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(player.status) }]}>
              <Text style={styles.statusText}>
                {getStatusText(player.status)}
              </Text>
            </View>
          </View>
        </View>

        {/* Statistics Cards */}
        <View style={styles.statsContainer}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Statistikalar
          </Text>

          {/* Goals and Assists */}
          <View style={styles.statsRow}>
            <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
              <Ionicons name="football" size={24} color="#FF6B35" />
              <Text style={[styles.statValue, { color: colors.text }]}>
                {player.goals || 0}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                Gollar
              </Text>
            </View>

            <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
              <Ionicons name="hand-left" size={24} color="#4ECDC4" />
              <Text style={[styles.statValue, { color: colors.text }]}>
                {player.assists || 0}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                Assistlar
              </Text>
            </View>
          </View>

          {/* Cards */}
          <View style={styles.statsRow}>
            <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
              <Ionicons name="card" size={24} color="#FFD93D" />
              <Text style={[styles.statValue, { color: colors.text }]}>
                {player.yellowCards || 0}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                Sariq kartochka
              </Text>
            </View>

            <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
              <Ionicons name="card" size={24} color="#FF3B30" />
              <Text style={[styles.statValue, { color: colors.text }]}>
                {player.redCards || 0}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                Qizil kartochka
              </Text>
            </View>
          </View>

          {/* Matches */}
          <View style={styles.statsRow}>
            <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
              <Ionicons name="trophy" size={24} color="#8B5CF6" />
              <Text style={[styles.statValue, { color: colors.text }]}>
                {player.matchesPlayed || 0}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                O'ynagan o'yinlar
              </Text>
            </View>

            <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
              <Ionicons name="time" size={24} color="#10B981" />
              <Text style={[styles.statValue, { color: colors.text }]}>
                {player.matchesPlayed ? (player.matchesPlayed * 90) : 0}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                O'ynagan daqiqalar
              </Text>
            </View>
          </View>
        </View>

        {/* Contact Information */}
        <View style={styles.contactContainer}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Aloqa Ma'lumotlari
          </Text>
          
          <View style={[styles.contactCard, { backgroundColor: colors.surface }]}>
            <View style={styles.contactItem}>
              <Ionicons name="call" size={20} color={colors.primary} />
              <Text style={[styles.contactText, { color: colors.text }]}>
                {player.phone || 'Telefon raqami yo\'q'}
              </Text>
            </View>
            
            {player.email && (
              <View style={styles.contactItem}>
                <Ionicons name="mail" size={20} color={colors.primary} />
                <Text style={[styles.contactText, { color: colors.text }]}>
                  {player.email}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Player Info */}
        <View style={styles.infoContainer}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Qo'shimcha Ma'lumotlar
          </Text>
          
          <View style={[styles.infoCard, { backgroundColor: colors.surface }]}>
            <View style={styles.infoItem}>
              <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>
                Ro'yxatdan o'tgan sana:
              </Text>
              <Text style={[styles.infoValue, { color: colors.text }]}>
                {new Date(player.createdAt).toLocaleDateString('uz-UZ')}
              </Text>
            </View>
            
            <View style={styles.infoItem}>
              <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>
                Oxirgi yangilanish:
              </Text>
              <Text style={[styles.infoValue, { color: colors.text }]}>
                {new Date(player.updatedAt).toLocaleDateString('uz-UZ')}
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    marginTop: 16,
    marginBottom: 24,
    textAlign: 'center',
  },
  backButton: {
    padding: 12,
    borderRadius: 8,
  },
  backButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    paddingTop: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  profileCard: {
    margin: 16,
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  playerPhoto: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginRight: 16,
  },
  playerPhotoPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginRight: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playerInfo: {
    flex: 1,
  },
  playerName: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  playerTeam: {
    fontSize: 16,
    marginBottom: 2,
  },
  playerPosition: {
    fontSize: 14,
    marginBottom: 2,
  },
  playerNumber: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  statusContainer: {
    alignItems: 'flex-start',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  statsContainer: {
    margin: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  statCard: {
    flex: 1,
    marginHorizontal: 4,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 8,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    textAlign: 'center',
  },
  contactContainer: {
    margin: 16,
  },
  contactCard: {
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  contactText: {
    marginLeft: 12,
    fontSize: 16,
  },
  infoContainer: {
    margin: 16,
    marginBottom: 32,
  },
  infoCard: {
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  infoItem: {
    marginBottom: 12,
  },
  infoLabel: {
    fontSize: 14,
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '500',
  },
});
