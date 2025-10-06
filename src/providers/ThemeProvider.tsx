import React from 'react';
import { useTheme } from '../store/useThemeStore';

interface ThemeProviderProps {
  children: React.ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const { colors, isDarkMode } = useTheme();

  return (
    <>
      {children}
    </>
  );
};
