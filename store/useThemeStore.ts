import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Appearance } from 'react-native';

export type ThemeMode = 'system' | 'dark' | 'light';

export interface ThemeColors {
    background: string;
    surface: string;
    surfaceLight: string;
    card: string;
    text: string;
    textMuted: string;
    textSubtle: string;
    border: string;
    primary: string;
    primaryDark: string;
    secondary: string;
    danger: string;
    success: string;
    warning: string;
}

export const darkThemeColors: ThemeColors = {
    background: '#0B132B',       // ✅ Qop-qora emas, to'q ko'k!
    surface: '#131F37',          // To'q ko'k karta foni
    surfaceLight: '#1C2A4A',     // Yengil to'q ko'k
    card: '#131F37',
    text: '#FFFFFF',
    textMuted: '#94A3B8',
    textSubtle: '#64748B',
    border: 'rgba(255, 255, 255, 0.1)',
    primary: '#00DF82',
    primaryDark: '#00A862',
    secondary: '#3B82F6',
    danger: '#EF4444',
    success: '#10B981',
    warning: '#F59E0B',
};

export const lightThemeColors: ThemeColors = {
    background: '#F1F5F9',       // ✅ Kunduzgi yorug' fon
    surface: '#FFFFFF',          // Oq karta foni
    surfaceLight: '#E2E8F0',     // Yengil kulrang
    card: '#FFFFFF',
    text: '#0F172A',             // Qora/to'q matn
    textMuted: '#475569',
    textSubtle: '#64748B',
    border: 'rgba(0, 0, 0, 0.08)',
    primary: '#00DF82',
    primaryDark: '#00A862',
    secondary: '#3B82F6',
    danger: '#EF4444',
    success: '#10B981',
    warning: '#F59E0B',
};

interface ThemeState {
    theme: ThemeMode;
    colors: ThemeColors;
    isDark: boolean;
    setTheme: (theme: ThemeMode) => Promise<void>;
    toggleTheme: () => Promise<void>;
    loadTheme: () => Promise<void>;
}

const THEME_STORAGE_KEY = '@amatora_app_theme_mode';

const resolveIsDark = (mode: ThemeMode): boolean => {
    if (mode === 'dark') return true;
    if (mode === 'light') return false;
    const systemScheme = Appearance.getColorScheme();
    return systemScheme !== 'light';
};

export const useThemeStore = create<ThemeState>((set, get) => ({
    theme: 'dark',
    colors: darkThemeColors,
    isDark: true,

    setTheme: async (newTheme: ThemeMode) => {
        const isDark = resolveIsDark(newTheme);
        const colors = isDark ? darkThemeColors : lightThemeColors;
        set({ theme: newTheme, colors, isDark });
        try {
            await AsyncStorage.setItem(THEME_STORAGE_KEY, newTheme);
        } catch (e) {
            console.error('Error saving theme to AsyncStorage:', e);
        }
    },

    toggleTheme: async () => {
        const currentTheme = get().theme;
        let nextTheme: ThemeMode;
        if (currentTheme === 'dark') nextTheme = 'light';
        else if (currentTheme === 'light') nextTheme = 'system';
        else nextTheme = 'dark';
        await get().setTheme(nextTheme);
    },

    loadTheme: async () => {
        try {
            const savedTheme = (await AsyncStorage.getItem(THEME_STORAGE_KEY)) as ThemeMode | null;
            const activeTheme: ThemeMode = savedTheme || 'dark';
            const isDark = resolveIsDark(activeTheme);
            const colors = isDark ? darkThemeColors : lightThemeColors;
            set({ theme: activeTheme, colors, isDark });
        } catch (e) {
            console.error('Error loading theme from AsyncStorage:', e);
        }
    },
}));

// Listen to system appearance changes if theme is 'system'
Appearance.addChangeListener(({ colorScheme }) => {
    const { theme } = useThemeStore.getState();
    if (theme === 'system') {
        const isDark = colorScheme !== 'light';
        useThemeStore.setState({
            isDark,
            colors: isDark ? darkThemeColors : lightThemeColors,
        });
    }
});
