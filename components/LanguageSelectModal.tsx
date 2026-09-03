import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Pressable,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';
import { useThemeStore } from '../store/useThemeStore';
import { getHomeScreenColors } from '../constants/homeTheme';
import { useLanguageStore, SUPPORTED_LANGUAGES } from '../store/useLanguageStore';
import { AppLanguage } from '../i18n';

const BRAND_ORANGE = '#FF6B00';

interface LanguageSelectModalProps {
  visible: boolean;
  onClose: () => void;
}

export const LanguageSelectModal: React.FC<LanguageSelectModalProps> = ({
  visible,
  onClose,
}) => {
  const { t, i18n } = useTranslation();
  const { setLanguage } = useLanguageStore();
  const { isDark } = useThemeStore();
  const homeColors = getHomeScreenColors(isDark);

  const handleSelectLanguage = async (langCode: AppLanguage) => {
    try {
      Haptics.selectionAsync().catch(() => {});
    } catch (e) {}
    await setLanguage(langCode);
    onClose();
  };

  const getLanguageSub = (code: string) => {
    switch (code) {
      case 'uz':
        return "O'zbek tili (Lotin)";
      case 'ru':
        return 'Русский язык';
      case 'en':
        return 'English language';
      default:
        return '';
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable
          style={[
            styles.container,
            {
              backgroundColor: isDark ? '#141414' : '#FFFFFF',
              borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)',
            },
          ]}
          onPress={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.05)' }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="globe-outline" size={18} color={BRAND_ORANGE} style={{ marginRight: 8 }} />
              <Text style={[styles.title, { color: homeColors.textPrimary }]}>
                {t('settings.select_language', 'Ilova tilini tanlang')}
              </Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              style={[
                styles.closeButton,
                {
                  backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.04)',
                },
              ]}
            >
              <Ionicons name="close" size={18} color={homeColors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Language List */}
          <View style={styles.languageList}>
            {SUPPORTED_LANGUAGES.map((lang) => {
              const isSelected = i18n.language === lang.code;

              return (
                <TouchableOpacity
                  key={lang.code}
                  style={[
                    styles.languageItem,
                    {
                      backgroundColor: isSelected
                        ? (isDark ? 'rgba(255, 107, 0, 0.12)' : 'rgba(255, 107, 0, 0.08)')
                        : (isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.02)'),
                      borderColor: isSelected
                        ? BRAND_ORANGE
                        : (isDark ? 'rgba(255, 255, 255, 0.07)' : 'rgba(0, 0, 0, 0.06)'),
                    },
                  ]}
                  onPress={() => handleSelectLanguage(lang.code)}
                  activeOpacity={0.7}
                >
                  <View style={styles.flagLabelContainer}>
                    <Text style={styles.flag}>{lang.flag}</Text>
                    <View style={{ marginLeft: 12 }}>
                      <Text
                        style={[
                          styles.languageLabel,
                          {
                            color: isSelected ? BRAND_ORANGE : homeColors.textPrimary,
                            fontWeight: isSelected ? '800' : '600',
                          },
                        ]}
                      >
                        {lang.label}
                      </Text>
                      <Text
                        style={[
                          styles.languageSub,
                          {
                            color: homeColors.textSecondary,
                          },
                        ]}
                      >
                        {getLanguageSub(lang.code)}
                      </Text>
                    </View>
                  </View>

                  <View
                    style={[
                      styles.radioCircle,
                      {
                        borderColor: isSelected
                          ? BRAND_ORANGE
                          : (isDark ? 'rgba(255, 255, 255, 0.25)' : 'rgba(0, 0, 0, 0.2)'),
                        backgroundColor: isSelected
                          ? BRAND_ORANGE
                          : 'transparent',
                      },
                    ]}
                  >
                    {isSelected && (
                      <Ionicons name="checkmark-sharp" size={14} color="#FFFFFF" />
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 24,
    borderWidth: 1,
    padding: 20,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.35,
        shadowRadius: 24,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 16,
    borderBottomWidth: 1,
    marginBottom: 14,
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  languageList: {
    gap: 10,
  },
  languageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 16,
    paddingVertical: 13,
    paddingHorizontal: 16,
    borderWidth: 1,
  },
  flagLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  flag: {
    fontSize: 24,
  },
  languageLabel: {
    fontSize: 15,
  },
  languageSub: {
    fontSize: 12,
    marginTop: 2,
  },
  radioCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default LanguageSelectModal;
