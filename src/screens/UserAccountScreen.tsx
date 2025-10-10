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
import { useLanguage } from '../store/useLanguageStore';
import CustomModal from '../components/CustomModal';
import ApplicationTypeModal from '../components/ApplicationTypeModal';
import UpdateService from '../services/updateService';

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
  const { getText } = useLanguage();
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

  const handleConfirmTeamApplication = () => {
    setShowTeamModal(false);
    console.log('Navigating to TeamApplication');
    navigation.navigate('TeamApplication');
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
      Alert.alert(getText('success'), getText('logoutSuccess'));
    } catch (error) {
      Alert.alert(getText('error'), getText('logoutError'));
    }
  };

  const handleSettings = () => {
    navigation.navigate('Settings');
  };

  const handleAbout = () => {
    Alert.alert(getText('about'), getText('appVersion'));
  };

  const handleCheckForUpdates = async () => {
    try {
      const success = await UpdateService.manualUpdateCheck();
      if (!success) {
        Alert.alert(
          'Xatolik',
          'Yangilanishni tekshirishda xatolik yuz berdi. Internet aloqasini tekshiring.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Update check error:', error);
      Alert.alert(
        'Xatolik',
        'Yangilanishni tekshirishda xatolik yuz berdi.',
        [{ text: 'OK' }]
      );
    }
  };

  const handleUpdateInfo = async () => {
    try {
      const updateInfo = await UpdateService.getUpdateInfo();
      const currentVersion = UpdateService.getCurrentVersion();
      const isUpdatesEnabled = UpdateService.isUpdatesEnabled();
      
      let message = `Joriy versiya: ${currentVersion}\n`;
      message += `OTA yangilanishlar: ${isUpdatesEnabled ? 'Yoqilgan' : 'O\'chirilgan'}\n\n`;
      
      if (updateInfo.hasUpdate) {
        message += `Yangi versiya mavjud: ${updateInfo.version}\n\n`;
        if (updateInfo.releaseNotes) {
          message += `Yangiliklar:\n${updateInfo.releaseNotes}`;
        }
      } else {
        message += 'Ilova eng so\'nggi versiyada.';
      }
      
      Alert.alert('Yangilanish ma\'lumoti', message, [
        { text: 'OK' }
      ]);
    } catch (error) {
      console.error('Update info error:', error);
      Alert.alert('Xatolik', 'Ma\'lumotni olishda xatolik yuz berdi.');
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView style={styles.scrollView}>
      <View style={[styles.header, { backgroundColor: colors.primary }]}>
        <Text style={[styles.title, { color: 'white' }]}>{getText('account')}</Text>
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
            {getText('manageAccount')}
          </Text>
        )}
      </View>

      <View style={styles.menuSection}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          {isLoggedIn ? getText('transferRequest') : getText('apply')}
        </Text>
        {isLoggedIn ? (
          <MenuItem
            icon="swap-horizontal-outline"
            title={getText('submitTransferRequest')}
            subtitle={getText('transferRequestSubtitle')}
            onPress={handleTransferRequest}
            colors={colors}
          />
        ) : (
        <MenuItem
          icon="add-circle-outline"
          title={getText('apply')}
          subtitle={getText('applySubtitle')}
          onPress={handleLeagueApplication}
          colors={colors}
        />
        )}
        <MenuItem
          icon={isLoggedIn ? "person" : "person-outline"}
          title={isLoggedIn ? getText('playerPanel') : getText('playerLogin')}
          subtitle={isLoggedIn ? getText('playerPanelSubtitle') : getText('playerLoginSubtitle')}
          onPress={handlePlayerLogin}
          colors={colors}
        />
        {isLoggedIn && (
          <MenuItem
            icon="log-out-outline"
            title={getText('logout')}
            subtitle={getText('logoutSubtitle')}
            onPress={handlePlayerLogout}
            colors={colors}
          />
        )}
      </View>

      <View style={styles.menuSection}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          {getText('settings')}
        </Text>
        <MenuItem
          icon="settings-outline"
          title={getText('settings')}
          subtitle={getText('appSettings')}
          onPress={handleSettings}
          colors={colors}
        />
        <MenuItem
          icon="information-circle-outline"
          title={getText('about')}
          subtitle={getText('aboutSubtitle')}
          onPress={handleAbout}
          colors={colors}
        />
        <MenuItem
          icon="refresh-outline"
          title="Yangilanishni tekshirish"
          subtitle="Yangi versiyalarni qidirish"
          onPress={handleCheckForUpdates}
          colors={colors}
        />
        <MenuItem
          icon="information-outline"
          title="Yangilanish ma'lumoti"
          subtitle="Joriy versiya va yangilanishlar haqida"
          onPress={handleUpdateInfo}
          colors={colors}
        />
      </View>
      </ScrollView>

      {/* Logout Modal */}
      <CustomModal
        visible={showLogoutModal}
        title={getText('logout')}
        message={getText('logoutConfirm')}
        onClose={() => setShowLogoutModal(false)}
        onConfirm={handleConfirmLogout}
        confirmText={getText('logout')}
        cancelText={getText('cancel')}
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
        title={getText('playerApplication')}
        message={getText('playerApplicationMessage')}
        onClose={() => setShowPlayerModal(false)}
        onConfirm={handleConfirmPlayerApplication}
        confirmText={getText('yesContinue')}
        cancelText={getText('cancel')}
        type="info"
      />

      {/* Team Application Modal */}
      <CustomModal
        visible={showTeamModal}
        title={getText('teamApplication')}
        message={getText('teamApplicationMessage')}
        onClose={() => setShowTeamModal(false)}
        onConfirm={handleConfirmTeamApplication}
        confirmText={getText('yesContinue')}
        cancelText={getText('cancel')}
        type="info"
      />

      {/* League Application Modal */}
      <CustomModal
        visible={showLeagueModal}
        title={getText('leagueApplication')}
        message={getText('leagueApplicationMessage')}
        onClose={() => setShowLeagueModal(false)}
        onConfirm={handleLeagueTypeApplication}
        confirmText={getText('yesContinue')}
        cancelText={getText('cancel')}
        type="info"
      />

      
      {/* Transfer Request Modal */}
      <CustomModal
        visible={false}
        title={getText('transferRequest')}
        message={getText('transferRequestMessage')}
        onClose={() => {}}
        onConfirm={handlePlayerTransferRequest}
        confirmText={getText('playerTransfer')}
        cancelText={getText('teamTransfer')}
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