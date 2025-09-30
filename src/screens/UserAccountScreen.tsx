import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../store/useThemeStore';
import { usePlayerStore } from '../store/usePlayerStore';

interface MenuItemProps {
  icon: string;
  title: string;
  subtitle: string;
  onPress: () => void;
}

const MenuItem: React.FC<MenuItemProps> = ({ icon, title, subtitle, onPress }) => (
  <TouchableOpacity style={styles.menuItem} onPress={onPress}>
    <View style={styles.menuItemLeft}>
      <Ionicons name={icon as any} size={24} color="#007AFF" />
      <View style={styles.menuItemText}>
        <Text style={styles.menuItemTitle}>{title}</Text>
        <Text style={styles.menuItemSubtitle}>{subtitle}</Text>
      </View>
    </View>
    <Ionicons name="chevron-forward" size={20} color="#ccc" />
  </TouchableOpacity>
);

const UserAccountScreen = ({ navigation }: any) => {
  const { colors } = useTheme();
  const { player, isLoggedIn, logout } = usePlayerStore();

  const handleTransferRequest = () => {
    if (isLoggedIn && player) {
      // Navigate to transfer request screen
      navigation.navigate('TransferRequest', {
        playerId: player.id,
        currentTeamId: player.teamId,
        currentTeamName: player.teamName,
      });
    } else {
      Alert.alert(
        'Xatolik',
        'Transfer ariza berish uchun avval o\'yinchi sifatida kirish kerak',
        [
          {
            text: 'Kirish',
            onPress: () => navigation.navigate('PlayerLogin'),
          },
          {
            text: 'Bekor qilish',
            style: 'cancel',
          },
        ]
      );
    }
  };

  const handleLeagueApplication = () => {
    Alert.alert(
      'Ariza Turi',
      'Qanday ariza berishni xohlaysiz?',
      [
        {
          text: 'O\'yinchi sifatida',
          onPress: () => navigation.navigate('TeamSelection'),
        },
        {
          text: 'Jamoa sifatida',
          onPress: () => navigation.navigate('TeamApplication'),
        },
        {
          text: 'Bekor qilish',
          style: 'cancel',
        },
      ]
    );
  };

  const handlePlayerLogin = () => {
    if (isLoggedIn) {
      // Navigate to player dashboard
      navigation.navigate('PlayerDashboard', { 
        playerId: player?.id,
        player: player 
      });
    } else {
      // Navigate to login screen
      navigation.navigate('PlayerLogin');
    }
  };

  const handlePlayerLogout = async () => {
    Alert.alert(
      'Chiqish',
      'Hisobingizdan chiqishni xohlaysizmi?',
      [
        { text: 'Bekor qilish', style: 'cancel' },
        { 
          text: 'Chiqish', 
          onPress: async () => {
            try {
              await logout();
              Alert.alert('Muvaffaqiyat', 'Hisobingizdan chiqdingiz');
            } catch (error) {
              Alert.alert('Xatolik', 'Chiqishda xatolik yuz berdi');
            }
          }
        },
      ]
    );
  };

  const handleSettings = () => {
    Alert.alert('Sozlamalar', 'Sozlamalar sahifasi hozircha mavjud emas');
  };

  const handleAbout = () => {
    Alert.alert('Dastur haqida', 'HFL Mobile App v1.0.0');
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView style={styles.scrollView}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Hisob</Text>
        {isLoggedIn && player ? (
          <View style={styles.playerInfo}>
            <Text style={[styles.playerName, { color: colors.text }]}>
              {player.firstName} {player.lastName}
            </Text>
            <Text style={[styles.playerTeam, { color: colors.primary }]}>
              {player.teamName}
            </Text>
            {player.position && (
              <Text style={[styles.playerPosition, { color: colors.textSecondary }]}>
                {player.position}
              </Text>
            )}
          </View>
        ) : (
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Hisobingizni boshqaring
          </Text>
        )}
      </View>

      <View style={styles.menuSection}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          {isLoggedIn ? 'Transfer arizasi' : 'Liga arizasi'}
        </Text>
        {isLoggedIn ? (
          <MenuItem
            icon="swap-horizontal-outline"
            title="Transfer ariza berish"
            subtitle="Boshqa jamoaga o'tish uchun ariza"
            onPress={handleTransferRequest}
          />
        ) : (
          <MenuItem
            icon="add-circle-outline"
            title="Ligaga ariza berish"
            subtitle="Yangi o'yinchi sifatida ro'yxatdan o'ting"
            onPress={handleLeagueApplication}
          />
        )}
        <MenuItem
          icon={isLoggedIn ? "person" : "person-outline"}
          title={isLoggedIn ? "O'yinchi paneli" : "O'yinchi kirish"}
          subtitle={isLoggedIn ? "Statistikalar va ma'lumotlar" : "Mavjud o'yinchi hisobiga kiring"}
          onPress={handlePlayerLogin}
        />
        {isLoggedIn && (
          <MenuItem
            icon="log-out-outline"
            title="Chiqish"
            subtitle="Hisobingizdan chiqing"
            onPress={handlePlayerLogout}
          />
        )}
      </View>

      <View style={styles.menuSection}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Sozlamalar
        </Text>
        <MenuItem
          icon="settings-outline"
          title="Sozlamalar"
          subtitle="Ilova sozlamalari"
          onPress={handleSettings}
        />
        <MenuItem
          icon="information-circle-outline"
          title="Dastur haqida"
          subtitle="Ilova versiyasi va ma'lumotlar"
          onPress={handleAbout}
        />
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
    paddingTop: 40,
    backgroundColor: '#007AFF',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 4,
  },
  playerInfo: {
    marginTop: 8,
  },
  playerName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  playerTeam: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 2,
  },
  playerPosition: {
    fontSize: 14,
    marginTop: 2,
  },
  menuSection: {
    marginTop: 20,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    color: '#333',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'white',
    padding: 16,
    marginBottom: 8,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  menuItemText: {
    marginLeft: 12,
    flex: 1,
  },
  menuItemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  menuItemSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
});

export default UserAccountScreen;