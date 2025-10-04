import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Language = 'uz' | 'en' | 'ru';

interface LanguageState {
  language: Language;
  setLanguage: (language: Language) => void;
  getText: (key: string) => string;
}

const translations = {
  uz: {
    // Navigation
    home: 'Bosh sahifa',
    matches: 'O\'yinlar',
    teams: 'Jamoalar',
    standings: 'Reyting',
    account: 'Hisob',
    settings: 'Sozlamalar',
    
    // Settings
    appearance: 'Ko\'rinish',
    darkMode: 'Qorong\'u rejim',
    language: 'Til',
    notifications: 'Bildirishnomalar',
    pushNotifications: 'Push bildirishnomalar',
    autoUpdate: 'Avtomatik yangilanish',
    data: 'Ma\'lumotlar',
    clearCache: 'Cache tozalash',
    downloadData: 'Ma\'lumotlarni yuklab olish',
    about: 'Dastur haqida',
    version: 'Versiya',
    help: 'Yordam',
    privacy: 'Maxfiylik siyosati',
    logout: 'Chiqish',
    
    // Common
    cancel: 'Bekor qilish',
    confirm: 'Tasdiqlash',
    save: 'Saqlash',
    loading: 'Yuklanmoqda...',
    error: 'Xatolik',
    success: 'Muvaffaqiyat',
    
    // Theme
    lightTheme: 'Yorug\' mavzu',
    darkTheme: 'Qorong\'u mavzu',
    
    // Language names
    uzbek: 'O\'zbek',
    english: 'English',
    russian: 'Русский',
  },
  en: {
    // Navigation
    home: 'Home',
    matches: 'Matches',
    teams: 'Teams',
    standings: 'Standings',
    account: 'Account',
    settings: 'Settings',
    
    // Settings
    appearance: 'Appearance',
    darkMode: 'Dark Mode',
    language: 'Language',
    notifications: 'Notifications',
    pushNotifications: 'Push Notifications',
    autoUpdate: 'Auto Update',
    data: 'Data',
    clearCache: 'Clear Cache',
    downloadData: 'Download Data',
    about: 'About',
    version: 'Version',
    help: 'Help',
    privacy: 'Privacy Policy',
    logout: 'Logout',
    
    // Common
    cancel: 'Cancel',
    confirm: 'Confirm',
    save: 'Save',
    loading: 'Loading...',
    error: 'Error',
    success: 'Success',
    
    // Theme
    lightTheme: 'Light Theme',
    darkTheme: 'Dark Theme',
    
    // Language names
    uzbek: 'O\'zbek',
    english: 'English',
    russian: 'Русский',
  },
  ru: {
    // Navigation
    home: 'Главная',
    matches: 'Матчи',
    teams: 'Команды',
    standings: 'Рейтинг',
    account: 'Аккаунт',
    settings: 'Настройки',
    
    // Settings
    appearance: 'Внешний вид',
    darkMode: 'Темная тема',
    language: 'Язык',
    notifications: 'Уведомления',
    pushNotifications: 'Push уведомления',
    autoUpdate: 'Автообновление',
    data: 'Данные',
    clearCache: 'Очистить кэш',
    downloadData: 'Скачать данные',
    about: 'О программе',
    version: 'Версия',
    help: 'Помощь',
    privacy: 'Политика конфиденциальности',
    logout: 'Выйти',
    
    // Common
    cancel: 'Отмена',
    confirm: 'Подтвердить',
    save: 'Сохранить',
    loading: 'Загрузка...',
    error: 'Ошибка',
    success: 'Успешно',
    
    // Theme
    lightTheme: 'Светлая тема',
    darkTheme: 'Темная тема',
    
    // Language names
    uzbek: 'O\'zbek',
    english: 'English',
    russian: 'Русский',
  },
};

export const useLanguageStore = create<LanguageState>()(
  persist(
    (set, get) => ({
      language: 'uz',
      setLanguage: (language) => set({ language }),
      getText: (key: string) => {
        const currentLanguage = get().language;
        return translations[currentLanguage][key] || key;
      },
    }),
    {
      name: 'language-storage',
    }
  )
);

export const useLanguage = () => {
  const { language, setLanguage, getText } = useLanguageStore();
  return { language, setLanguage, getText };
};
