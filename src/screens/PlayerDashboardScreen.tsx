import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useTheme } from '../store/useThemeStore';

interface PlayerDashboardScreenProps {
  navigation: any;
  route: {
    params: {
      playerId: string;
    };
  };
}

interface PlayerData {
  id: string;
  firstName: string;
  lastName: string;
  teamName: string;
  teamId: string;
  phone: string;
  email?: string;
  position?: string;
  number?: number;
  goals: number;
  assists: number;
  redCards: number;
  yellowCards: number;
  matchesPlayed: number;
  status: 'active' | 'pending' | 'suspended';
  createdAt: Date;
  updatedAt: Date;
}

const PlayerDashboardScreen: React.FC<PlayerDashboardScreenProps> = ({ navigation, route }) => {
  const { colors } = useTheme();
  const { playerId } = route.params;
  
  const [playerData, setPlayerData] = useState<PlayerData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPlayerData();
  }, []);

  const loadPlayerData = async () => {
    try {
      setLoading(true);
      
      console.log('Loading player data for ID:', playerId);
      
      // Fetch player data from Firebase
      const response = await fetch(`http://192.168.1.38:3000/api/players/${playerId}`);
      
      if (!response.ok) {
        throw new Error('Player not found');
      }
      
      const data = await response.json();
      console.log('Player data loaded:', data);
      
      setPlayerData(data);
    } catch (error) {
      console.error('Error loading player data:', error);
      Alert.alert('Xatolik', 'O\'yinchi ma\'lumotlarini yuklashda xatolik yuz berdi');
    } finally {
      setLoading(false);
    }
  };

  const handleTransferRequest = () => {
    if (!playerData) return;
    
    console.log('Transfer request data:', {
      playerId: playerData.id,
      currentTeamId: playerData.teamId,
      currentTeamName: playerData.teamName,
    });
    
    navigation.navigate('TransferRequest', {
      playerId: playerData.id || '',
      currentTeamId: playerData.teamId || '',
      currentTeamName: playerData.teamName || '',
    });
  };

  const handleLogout = () => {
    Alert.alert(
      'Chiqish',
      'Hisobingizdan chiqishni xohlaysizmi?',
      [
        { text: 'Bekor qilish', style: 'cancel' },
        { 
          text: 'Chiqish', 
          onPress: () => navigation.navigate('Main')
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.text }]}>Ma'lumotlar yuklanmoqda...</Text>
      </View>
    );
  }

  if (!playerData) {
    return (
      <View style={[styles.container, styles.centerContent, { backgroundColor: colors.background }]}>
        <Text style={[styles.errorText, { color: colors.text }]}>Ma'lumotlar topilmadi</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>O'yinchi Panel</Text>
        <Text style={[styles.welcomeText, { color: colors.textSecondary }]}>
          Xush kelibsiz, {playerData.firstName} {playerData.lastName}!
        </Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Shaxsiy Ma'lumotlar</Text>
          
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Ism:</Text>
            <Text style={[styles.infoValue, { color: colors.text }]}>
              {playerData.firstName} {playerData.lastName}
            </Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Jamoa:</Text>
            <Text style={[styles.infoValue, { color: colors.text }]}>{playerData.teamName}</Text>
          </View>

          {playerData.position && (
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Pozitsiya:</Text>
              <Text style={[styles.infoValue, { color: colors.text }]}>{playerData.position}</Text>
            </View>
          )}

          {playerData.number && (
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Forma raqami:</Text>
              <Text style={[styles.infoValue, { color: colors.text }]}>#{playerData.number}</Text>
            </View>
          )}

          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Telefon:</Text>
            <Text style={[styles.infoValue, { color: colors.text }]}>{playerData.phone}</Text>
          </View>

          {playerData.email && (
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Email:</Text>
              <Text style={[styles.infoValue, { color: colors.text }]}>{playerData.email}</Text>
            </View>
          )}
          
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Ro'yxatdan o'tgan:</Text>
            <Text style={[styles.infoValue, { color: colors.text }]}>
              {playerData.createdAt ? new Date(playerData.createdAt).toLocaleDateString('uz-UZ') : 'Noma\'lum'}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Joriy jamoa:</Text>
            <Text style={[styles.infoValue, { color: colors.primary }]}>
              {playerData.teamName}
            </Text>
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Statistika</Text>
          
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: '#FF6B35' }]}>{playerData.goals}</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Gollar</Text>
            </View>
            
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: '#4ECDC4' }]}>{playerData.assists}</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Assistlar</Text>
            </View>
            
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: '#A28BFF' }]}>{playerData.matchesPlayed}</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>O'ynagan o'yinlar</Text>
            </View>
            
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: '#FFA500' }]}>{playerData.yellowCards}</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Sariq kartochka</Text>
            </View>
            
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: '#FF3B30' }]}>{playerData.redCards}</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Qizil kartochka</Text>
            </View>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.transferButton, { backgroundColor: colors.primary }]}
          onPress={handleTransferRequest}
        >
          <Text style={styles.transferButtonText}>Transfer so'rovi</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.homeButton, { backgroundColor: colors.primary }]}
          onPress={() => navigation.navigate('Main')}
        >
          <Text style={styles.homeButtonText}>Bosh Sahifa</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.logoutButton, { borderColor: colors.border }]}
          onPress={handleLogout}
        >
          <Text style={[styles.logoutButtonText, { color: colors.text }]}>Chiqish</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    padding: 20,
    paddingTop: 60,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  welcomeText: {
    fontSize: 16,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  card: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  infoLabel: {
    fontSize: 14,
    flex: 1,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '500',
    flex: 2,
    textAlign: 'right',
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
  },
  statItem: {
    alignItems: 'center',
    width: '30%',
    marginBottom: 20,
    minWidth: 80,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    textAlign: 'center',
  },
  transferButton: {
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  transferButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  homeButton: {
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  homeButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  logoutButton: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  logoutButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  errorText: {
    fontSize: 16,
  },
});

export default PlayerDashboardScreen;
