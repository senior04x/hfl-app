import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';

import uz from './locales/uz.json';
import ru from './locales/ru.json';
import en from './locales/en.json';

export const LANGUAGE_KEY = '@amatora_language';

export type AppLanguage = 'uz' | 'ru' | 'en';

export const SUPPORTED_LANGUAGES: { code: AppLanguage; label: string; flag: string }[] = [
  { code: 'uz', label: "O'zbekcha", flag: '🇺🇿' },
  { code: 'ru', label: 'Русский', flag: '🇷🇺' },
  { code: 'en', label: 'English', flag: '🇬🇧' },
];

export const resources = {
  uz: { translation: uz },
  ru: { translation: ru },
  en: { translation: en },
} as const;

export const isValidLanguage = (lang: any): lang is AppLanguage => {
  return typeof lang === 'string' && (lang === 'uz' || lang === 'ru' || lang === 'en');
};

export const initI18n = async (): Promise<string> => {
  let initialLanguage: AppLanguage = 'uz';

  try {
    const savedLanguage = await AsyncStorage.getItem(LANGUAGE_KEY);

    if (savedLanguage && isValidLanguage(savedLanguage)) {
      initialLanguage = savedLanguage;
    } else {
      const locales = Localization.getLocales();
      const deviceLang = locales?.[0]?.languageCode;
      if (deviceLang === 'ru') {
        initialLanguage = 'ru';
      } else if (deviceLang === 'en') {
        initialLanguage = 'en';
      } else {
        initialLanguage = 'uz';
      }
    }
  } catch (error) {
    console.warn('⚠️ i18n: Failed to load saved language, defaulting to uz:', error);
    initialLanguage = 'uz';
  }

  if (!i18n.isInitialized) {
    await i18n.use(initReactI18next).init({
      compatibilityJSON: 'v4',
      resources,
      lng: initialLanguage,
      fallbackLng: 'uz',
      interpolation: {
        escapeValue: false,
      },
      react: {
        useSuspense: false,
      },
    });
  } else {
    await i18n.changeLanguage(initialLanguage);
  }

  return initialLanguage;
};

export const changeAppLanguage = async (lang: any): Promise<void> => {
  try {
    const targetLang: AppLanguage = isValidLanguage(lang) ? lang : 'uz';
    await AsyncStorage.setItem(LANGUAGE_KEY, targetLang);
    await i18n.changeLanguage(targetLang);
  } catch (error) {
    console.error('⚠️ Failed to change language:', error);
  }
};

export default i18n;
