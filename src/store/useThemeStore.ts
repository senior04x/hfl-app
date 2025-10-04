import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { lightColors, darkColors, Colors } from '../theme/colors';

export type Theme = 'light' | 'dark';

interface ThemeState {
  theme: Theme;
  isDarkMode: boolean;
  isTransitioning: boolean;
  colors: Colors;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
  setTransitioning: (isTransitioning: boolean) => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: 'light',
      isDarkMode: false,
      isTransitioning: false,
      colors: lightColors,
      toggleTheme: () => set((state) => {
        const newTheme = state.theme === 'light' ? 'dark' : 'light';
        return {
          theme: newTheme,
          isDarkMode: newTheme === 'dark',
          colors: newTheme === 'light' ? lightColors : darkColors,
          isTransitioning: true
        };
      }),
      setTheme: (theme) => set({ 
        theme, 
        isDarkMode: theme === 'dark',
        colors: theme === 'light' ? lightColors : darkColors 
      }),
      setTransitioning: (isTransitioning) => set({ isTransitioning }),
    }),
    {
      name: 'theme-storage',
    }
  )
);

export const useTheme = () => {
  const { colors, theme, isDarkMode, isTransitioning } = useThemeStore();
  return { colors, theme, isDarkMode, isTransitioning };
};
