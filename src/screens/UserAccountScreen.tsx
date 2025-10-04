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
import CustomModal from '../components/CustomModal';
import ApplicationTypeModal from '../components/ApplicationTypeModal';

interface MenuItemProps {
  icon: string;
  title: string;
  subtitle: string;
  onPress: () => void;
}

const MenuItem: React.FC<MenuItemProps & { colors: any }> = ({ icon, title, subtitle, onPress, colors }) => (
  <TouchableOpacity style={[styles.menuItem, { backgroundColor: colors.surface }]} onPress={onPress}>
    <View style={styles.menuItemLeft}>
      <Ionicons name={icon as any} size={24} color={colors.primary} />
      <View style={styles.menuItemText}>
        <Text style={[styles.menuItemTitle, { color: colors.text }]}>{title}</Text>
        <Text style={[styles.menuItemSubtitle, { color: colors.textSecondary }]}>{subtitle}</Text>
      </View>
    </View>
    <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
  </TouchableOpacity>
);

const UserAccountScreen = ({ navigation }: any) => {
  const { colors } = useTheme();
  const { player, isLoggedIn, logout } = usePlayerStore();
  const [showLogoutModal, setShowLogoutModal] = React.useState(false);
  const [showLeagueModal, setShowLeagueModal] = React.useState(false);
  const [showPlayerModal, setShowPlayerModal] = React.useState(false);
  const [showTeamModal, setShowTeamModal] = React.useState(false);
  const [showLeagueTypeModal, setShowLeagueTypeModal] = React.useState(false);

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
    console.log('League application button pressed');
    setShowLeagueTypeModal(true);
  };

  const handlePlayerApplication = () => {
    setShowLeagueTypeModal(false);
    setShowPlayerModal(true);
  };

  const handleTeamApplication = () => {
    setShowLeagueTypeModal(false);
    setShowTeamModal(true);
  };

  const handleLeagueTypeApplication = () => {
    setShowLeagueTypeModal(false);
    console.log('Navigating to LeagueApplication');
    navigation.navigate('LeagueApplication');
  };
  
  const handlePlayerTransferRequest = () => {
    navigation.navigate('PlayerTransferRequest');
  };
  
  const handleTeamTransferRequest = () => {
    navigation.navigate('TeamTransferRequest');
  };

  const handleConfirmPlayerApplication = () => {
    setShowPlayerModal(false);
    console.log('Navigating to TeamSelection');
    navigation.navigate('TeamSelection');
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

  const handlePlayerLogout = () => {
    setShowLogoutModal(true);
  };

  const handleConfirmLogout = async () => {
    setShowLogoutModal(false);
    try {
      await logout();
      Alert.alert('Muvaffaqiyat', 'Hisobingizdan chiqdingiz');
    } catch (error) {
      Alert.alert('Xatolik', 'Chiqishda xatolik yuz berdi');
    }
  };

  const handleSettings = () => {
    navigation.navigate('Settings');
  };

  const handleAbout = () => {
    Alert.alert('Dastur haqida', 'HFL Mobile App v1.0.0');
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView style={styles.scrollView}>
      <View style={[styles.header, { backgroundColor: colors.primary }]}>
        <Text style={[styles.title, { color: 'white' }]}>Hisob</Text>
        {isLoggedIn && player ? (
          <View style={styles.playerInfo}>
            <Text style={[styles.playerName, { color: 'white' }]}>
              {player.firstName} {player.lastName}
            </Text>
            <Text style={[styles.playerTeam, { color: 'rgba(255, 255, 255, 0.9)' }]}>
              {player.teamName}
            </Text>
            {player.position && (
              <Text style={[styles.playerPosition, { color: 'rgba(255, 255, 255, 0.7)' }]}>
                {player.position}
              </Text>
            )}
          </View>
        ) : (
          <Text style={[styles.subtitle, { color: 'rgba(255, 255, 255, 0.8)' }]}>
            Hisobingizni boshqaring
          </Text>
        )}
      </View>

      <View style={styles.menuSection}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          {isLoggedIn ? 'Transfer arizasi' : 'Ariza berish'}
        </Text>
        {isLoggedIn ? (
          <MenuItem
            icon="swap-horizontal-outline"
            title="Transfer ariza berish"
            subtitle="Boshqa jamoaga o'tish uchun ariza"
            onPress={handleTransferRequest}
            colors={colors}
          />
        ) : (
        <MenuItem
          icon="add-circle-outline"
          title="Ariza berish"
          subtitle="O'yinchi, jamoa yoki liga sifatida ro'yxatdan o'ting"
          onPress={handleLeagueApplication}
          colors={colors}
        />
        )}
        <MenuItem
          icon={isLoggedIn ? "person" : "person-outline"}
          title={isLoggedIn ? "O'yinchi paneli" : "O'yinchi kirish"}
          subtitle={isLoggedIn ? "Statistikalar va ma'lumotlar" : "Mavjud o'yinchi hisobiga kiring"}
          onPress={handlePlayerLogin}
          colors={colors}
        />
        {isLoggedIn && (
          <MenuItem
            icon="log-out-outline"
            title="Chiqish"
            subtitle="Hisobingizdan chiqing"
            onPress={handlePlayerLogout}
            colors={colors}
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
          colors={colors}
        />
        <MenuItem
          icon="information-circle-outline"
          title="Dastur haqida"
          subtitle="Ilova versiyasi va ma'lumotlar"
          onPress={handleAbout}
          colors={colors}
        />
      </View>
      </ScrollView>

      {/* Logout Modal */}
      <CustomModal
        visible={showLogoutModal}
        title="Chiqish"
        message="Hisobingizdan chiqishni xohlaysizmi?"
        onClose={() => setShowLogoutModal(false)}
        onConfirm={handleConfirmLogout}
        confirmText="Chiqish"
        cancelText="Bekor qilish"
        type="warning"
      />

      {/* Application Type Modal - 3 ta ariza */}
      <ApplicationTypeModal
        visible={showLeagueTypeModal}
        onClose={() => setShowLeagueTypeModal(false)}
        onPlayerApplication={handlePlayerApplication}
        onTeamApplication={handleTeamApplication}
        onLeagueApplication={handleLeagueTypeApplication}
      />

      {/* Player Application Modal */}
      <CustomModal
        visible={showPlayerModal}
        title="O'yinchi Ariza"
        message="O'yinchi sifatida ariza berishni xohlaysizmi?"
        onClose={() => setShowPlayerModal(false)}
        onConfirm={handleConfirmPlayerApplication}
        confirmText="Ha, davom etish"
        cancelText="Bekor qilish"
        type="info"
      />

      {/* Team Application Modal */}
      <CustomModal
        visible={showTeamModal}
        title="Jamoa Ariza"
        message="Jamoa sifatida ariza berishni xohlaysizmi?"
        onClose={() => setShowTeamModal(false)}
        onConfirm={handleTeamApplication}
        confirmText="Ha, davom etish"
        cancelText="Bekor qilish"
        type="info"
      />

      {/* League Application Modal */}
      <CustomModal
        visible={showLeagueModal}
        title="Liga Ariza"
        message="Liga sifatida ariza berishni xohlaysizmi?"
        onClose={() => setShowLeagueModal(false)}
        onConfirm={handleLeagueTypeApplication}
        confirmText="Ha, davom etish"
        cancelText="Bekor qilish"
        type="info"
      />

      
      {/* Transfer Request Modal */}
      <CustomModal
        visible={false}
        title="Transfer Ariza"
        message="Qanday transfer ariza berishni xohlaysiz?"
        onClose={() => {}}
        onConfirm={handlePlayerTransferRequest}
        confirmText="O'yinchi transfer"
        cancelText="Jamoa transfer"
        type="info"
      />

      {/* Player Application Confirmation Modal */}
      <CustomModal
        visible={showPlayerModal}
        title="O'yinchi Ariza"
        message="O'yinchi sifatida ariza berishni xohlaysizmi?"
        onClose={() => setShowPlayerModal(false)}
        onConfirm={handleConfirmPlayerApplication}
        confirmText="Ha, davom etish"
        cancelText="Bekor qilish"
        type="info"
      />
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
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 16,
    marginTop: 4,
  },
  playerInfo: {
    marginTop: 8,
  },
  playerName: {
    fontSize: 20,
    fontWeight: 'bold',
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
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  },
  menuItemSubtitle: {
    fontSize: 14,
    marginTop: 2,
  },
});

export default UserAccountScreen;