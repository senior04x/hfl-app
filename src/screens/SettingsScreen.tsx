import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../store/useThemeStore';
import { usePlayerStore } from '../store/usePlayerStore';

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

const SettingsScreen = () => {
  const { colors, isDarkMode, toggleTheme } = useTheme();
  const { player, logout } = usePlayerStore();
  const [notifications, setNotifications] = useState(true);
  const [autoUpdate, setAutoUpdate] = useState(true);
  const [language, setLanguage] = useState('uz');

  const handleLanguageChange = () => {
    Alert.alert(
      'Til tanlash',
      'Qaysi tilni tanlamoqchisiz?',
      [
        { text: 'O\'zbek', onPress: () => setLanguage('uz') },
        { text: 'English', onPress: () => setLanguage('en') },
        { text: 'Русский', onPress: () => setLanguage('ru') },
        { text: 'Bekor qilish', style: 'cancel' },
      ]
    );
  };

  const handleLogout = () => {
    Alert.alert(
      'Chiqish',
      'Hisobingizdan chiqishni xohlaysizmi?',
      [
        { text: 'Bekor qilish', style: 'cancel' },
        { text: 'Chiqish', style: 'destructive', onPress: logout },
      ]
    );
  };

  const handleClearCache = () => {
    Alert.alert(
      'Cache tozalash',
      'Barcha cache ma\'lumotlarini o\'chirishni xohlaysizmi?',
      [
        { text: 'Bekor qilish', style: 'cancel' },
        { text: 'Tozalash', style: 'destructive', onPress: () => {
          // Clear cache logic
          Alert.alert('Muvaffaqiyat', 'Cache tozalandi');
        }},
      ]
    );
  };

  const getLanguageName = (code: string) => {
    const languages = {
      uz: 'O\'zbek',
      en: 'English',
      ru: 'Русский'
    };
    return languages[code] || 'O\'zbek';
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView style={styles.scrollView}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Sozlamalar</Text>
          <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
            Ilova sozlamalarini boshqaring
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
                  O'yinchi
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Appearance Settings */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Ko'rinish</Text>
          
          <SettingItem
            icon="moon-outline"
            title="Qorong'u rejim"
            subtitle="Yorug' yoki qorong'u mavzu"
            colors={colors}
            rightComponent={
              <Switch
                value={isDarkMode}
                onValueChange={toggleTheme}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor={isDarkMode ? colors.primary : colors.textSecondary}
              />
            }
          />

          <SettingItem
            icon="language-outline"
            title="Til"
            subtitle={getLanguageName(language)}
            onPress={handleLanguageChange}
            colors={colors}
          />
        </View>

        {/* Notification Settings */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Bildirishnomalar</Text>
          
          <SettingItem
            icon="notifications-outline"
            title="Push bildirishnomalar"
            subtitle="O'yin va yangiliklar haqida xabarlar"
            colors={colors}
            rightComponent={
              <Switch
                value={notifications}
                onValueChange={setNotifications}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor={notifications ? colors.primary : colors.textSecondary}
              />
            }
          />

          <SettingItem
            icon="refresh-outline"
            title="Avtomatik yangilanish"
            subtitle="Ma'lumotlarni avtomatik yangilash"
            colors={colors}
            rightComponent={
              <Switch
                value={autoUpdate}
                onValueChange={setAutoUpdate}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor={autoUpdate ? colors.primary : colors.textSecondary}
              />
            }
          />
        </View>

        {/* Data Settings */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Ma'lumotlar</Text>
          
          <SettingItem
            icon="trash-outline"
            title="Cache tozalash"
            subtitle="Saqlangan ma'lumotlarni tozalash"
            onPress={handleClearCache}
            colors={colors}
          />

          <SettingItem
            icon="download-outline"
            title="Ma'lumotlarni yuklab olish"
            subtitle="Shaxsiy ma'lumotlarni eksport qilish"
            colors={colors}
          />
        </View>

        {/* About */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Dastur haqida</Text>
          
          <SettingItem
            icon="information-circle-outline"
            title="Versiya"
            subtitle="1.0.0"
            colors={colors}
          />

          <SettingItem
            icon="help-circle-outline"
            title="Yordam"
            subtitle="Savollar va javoblar"
            colors={colors}
          />

          <SettingItem
            icon="shield-checkmark-outline"
            title="Maxfiylik siyosati"
            subtitle="Shaxsiy ma'lumotlar himoyasi"
            colors={colors}
          />
        </View>

        {/* Logout */}
        {player && (
          <View style={styles.section}>
            <SettingItem
              icon="log-out-outline"
              title="Chiqish"
              subtitle="Hisobingizdan chiqing"
              onPress={handleLogout}
              colors={colors}
            />
          </View>
        )}

        {/* Bottom Spacing */}
        <View style={styles.bottomSpacing} />
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
    paddingBottom: 10,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 4,
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
});

export default SettingsScreen;
