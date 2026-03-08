import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator,
  Dimensions,
  SafeAreaView,
} from 'react-native';
import SafeScrollView from '../components/SafeScrollView';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../store/useThemeStore';
import { usePlayerStore } from '../store/usePlayerStore';
import { useTeamStore } from '../store/useTeamStore';
import { useLanguage } from '../store/useLanguageStore';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface SettingsScreenProps {
  navigation: any;
}

interface SettingItemProps {
  icon: string;
  title: string;
  subtitle?: string;
  onPress?: () => void;
  rightComponent?: React.ReactNode;
  colors: any;
}

const SettingItem: React.FC<SettingItemProps> = ({
  icon,
  title,
  subtitle,
  onPress,
  rightComponent,
  colors,
}) => (
  <TouchableOpacity
    style={[styles.settingItem, { backgroundColor: colors.card }]}
    onPress={onPress}
    disabled={!onPress}
  >
    <View style={styles.settingLeft}>
      <View style={[styles.iconContainer, { backgroundColor: colors.primary + '20' }]}>
        <Ionicons name={icon as any} size={24} color={colors.primary} />
      </View>
      <View style={styles.settingText}>
        <Text style={[styles.settingTitle, { color: colors.text }]}>{title}</Text>
        {subtitle && (
          <Text style={[styles.settingSubtitle, { color: colors.textSecondary }]}>
            {subtitle}
          </Text>
        )}
      </View>
    </View>
    {rightComponent || (
      onPress && <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
    )}
  </TouchableOpacity>
);

interface SettingsData {
  language: 'uz' | 'en' | 'ru';
}

const SettingsScreen: React.FC<SettingsScreenProps> = ({ navigation }) => {
  const { colors, isDarkMode, toggleTheme } = useTheme();
  const { player, logout } = usePlayerStore();
  const { team, logout: logoutTeam } = useTeamStore();
  const { getText, setLanguage } = useLanguage();
  
  const [settings, setSettings] = useState<SettingsData>({
    language: 'uz',
  });

  const [loading, setLoading] = useState(false);
  const [showLanguageOptions, setShowLanguageOptions] = useState(false);

  // Load settings on component mount
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const savedSettings = await AsyncStorage.getItem('hfl_settings');
      if (savedSettings) {
        const parsedSettings = JSON.parse(savedSettings);
        setSettings(parsedSettings);
        // Global language store ni ham yangilash
        setLanguage(parsedSettings.language);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const saveSettings = async (newSettings: SettingsData) => {
    try {
      setLoading(true);
      await AsyncStorage.setItem('hfl_settings', JSON.stringify(newSettings));
      setSettings(newSettings);
      Alert.alert('Muvaffaqiyat', 'Sozlamalar saqlandi');
    } catch (error) {
      Alert.alert('Xatolik', 'Sozlamalarni saqlashda xatolik yuz berdi');
    } finally {
      setLoading(false);
    }
  };


  const handleLanguageSelect = (language: 'uz' | 'en' | 'ru') => {
    const newSettings = {
      ...settings,
      language
    };
    saveSettings(newSettings);
    setShowLanguageOptions(false);
    
    // Global language store ni ham yangilash
    setLanguage(language);
  };

  const handleThemeToggle = () => {
    toggleTheme();
  };

  const handleLogout = () => {
    Alert.alert(
      getText('logout'),
      getText('logoutConfirm'),
      [
        { text: getText('cancel'), style: 'cancel' },
        { 
          text: getText('logout'), 
          style: 'destructive', 
          onPress: () => {
            if (player) {
              logout();
            }
            if (team) {
              logoutTeam();
            }
          }
        },
      ]
    );
  };

  const getLanguageName = (code: string) => {
    const languages = {
      uz: getText('uzbek'),
      en: getText('english'),
      ru: getText('russian')
    };
    return languages[code] || getText('uzbek');
  };


  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <SafeScrollView style={styles.scrollView}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <TouchableOpacity 
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <Ionicons name="arrow-back" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: colors.text }]}>{getText('settings')}</Text>
            <View style={styles.headerSpacer} />
          </View>
          <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
            {getText('settingsSubtitle')}
          </Text>
        </View>

        {/* User Info */}
        {player && (
          <View style={[styles.userSection, { backgroundColor: colors.card }]}>
            <View style={styles.userInfo}>
              <View style={[styles.userAvatar, { backgroundColor: colors.primary }]}>
                <Ionicons name="person" size={24} color="white" />
              </View>
              <View style={styles.userDetails}>
                <Text style={[styles.userName, { color: colors.text }]}>
                  {player.firstName} {player.lastName}
                </Text>
                       <Text style={[styles.userRole, { color: colors.textSecondary }]}>
                         {getText('player')} • {player.teamName}
                       </Text>
              </View>
            </View>
          </View>
        )}

        {/* Team Info */}
        {team && (
          <View style={[styles.userSection, { backgroundColor: colors.card }]}>
            <View style={styles.userInfo}>
              <View style={[styles.userAvatar, { backgroundColor: colors.primary }]}>
                <Ionicons name="people" size={24} color="white" />
              </View>
              <View style={styles.userDetails}>
                <Text style={[styles.userName, { color: colors.text }]}>
                  {team.name}
                </Text>
                       <Text style={[styles.userRole, { color: colors.textSecondary }]}>
                         Murabbiy • {team.captainPhone}
                       </Text>
              </View>
            </View>
          </View>
        )}

        {/* Login Section */}
        {!player && !team && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Kirish</Text>
            
            <SettingItem
              icon="log-in-outline"
              title="Tizimga kirish"
              subtitle="O'yinchi, murabbiy yoki liga admini sifatida kiring"
              onPress={() => navigation.navigate('PlayerLogin')}
              colors={colors}
            />
          </View>
        )}

               {/* Appearance Settings */}
               <View style={styles.section}>
                 <Text style={[styles.sectionTitle, { color: colors.text }]}>{getText('appearance')}</Text>
                 
                 <SettingItem
                   icon="moon-outline"
                   title={getText('darkMode')}
                   subtitle={getText('darkModeSubtitle')}
                   colors={colors}
                   rightComponent={
                     <Switch
                       value={isDarkMode}
                       onValueChange={handleThemeToggle}
                       trackColor={{ false: colors.border, true: colors.primary }}
                       thumbColor={isDarkMode ? colors.primary : colors.textSecondary}
                     />
                   }
                 />

                 <View style={styles.languageContainer}>
                   <TouchableOpacity
                     style={styles.languageTextOnly}
                     onPress={() => setShowLanguageOptions(!showLanguageOptions)}
                   >
                     <Text style={[styles.languageTextOnlyText, { color: colors.text }]}>
                       {getLanguageName(settings.language)}
                     </Text>
                   </TouchableOpacity>
                   
                   {showLanguageOptions && (
                     <View style={styles.languageOptionsContainer}>
                       {['uz', 'en', 'ru'].filter(lang => lang !== settings.language).map((lang, index) => (
                         <View key={lang} style={styles.singleLanguageContainer}>
                           <TouchableOpacity
                             style={styles.languageTextButton}
                             onPress={() => handleLanguageSelect(lang as 'uz' | 'en' | 'ru')}
                           >
                             <Text style={[styles.languageText, { color: colors.text }]}>
                               {getLanguageName(lang)}
                             </Text>
                           </TouchableOpacity>
                         </View>
                       ))}
                     </View>
                   )}
                 </View>
               </View>

        {/* Logout */}
        {(player || team) && (
          <View style={styles.section}>
            <SettingItem
              icon="log-out-outline"
              title={getText('logout')}
              subtitle={getText('logoutSubtitle')}
              onPress={handleLogout}
              colors={colors}
            />
          </View>
        )}

        {/* Bottom Spacing */}
        <View style={styles.bottomSpacing} />
      </SafeScrollView>



      {/* Loading Overlay */}
      {loading && (
        <View style={styles.loadingOverlay}>
          <View style={[styles.loadingContainer, { backgroundColor: colors.card }]}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.text }]}>{getText('loading')}</Text>
          </View>
        </View>
      )}
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
    paddingBottom: 10,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  backButton: {
    padding: 8,
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 40, // Same width as back button to center the title
  },
  headerSubtitle: {
    fontSize: 16,
  },
  userSection: {
    margin: 20,
    marginBottom: 10,
    borderRadius: 12,
    padding: 16,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 2,
  },
  userRole: {
    fontSize: 14,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    marginHorizontal: 20,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    marginHorizontal: 20,
    marginBottom: 8,
    borderRadius: 12,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  settingText: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 2,
  },
  settingSubtitle: {
    fontSize: 14,
  },
  bottomSpacing: {
    height: 20,
  },
  // Language container and button styles
  languageContainer: {
    marginHorizontal: 20,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  languageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    flex: 1,
    marginRight: 8,
  },
  languageButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  // Language text only styles (no background)
  languageTextOnly: {
    paddingVertical: 16,
    paddingHorizontal: 0,
  },
  languageTextOnlyText: {
    fontSize: 16,
    fontWeight: '500',
  },
  // All languages container
  allLanguagesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  singleLanguageContainer: {
    // Individual language container
  },
  // Language options styles
  languageOptionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginLeft: 8,
  },
  languageTextContainer: {
    // Container for individual language text
  },
  languageTextButton: {
    paddingVertical: 2,
    paddingHorizontal: 4,
  },
  languageText: {
    fontSize: 14,
    fontWeight: '500',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 16,
    padding: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  modalOptionText: {
    fontSize: 16,
    flex: 1,
  },
  modalButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  modalButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  // Loading styles
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
  },
});

export default SettingsScreen;
