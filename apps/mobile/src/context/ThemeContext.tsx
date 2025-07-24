import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { lightTheme, darkTheme, Theme } from '../theme/colors';
import { createLogger } from '@coachmeld/shared-utils';

const logger = createLogger('ThemeContext');

interface ThemeContextType {
  theme: Theme;
  isDark: boolean;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isDark, setIsDark] = useState(true); // Default to dark mode

  useEffect(() => {
    loadThemePreference();
  }, []);

  const loadThemePreference = async () => {
    try {
      if (Platform.OS === 'web') {
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme !== null) {
          setIsDark(savedTheme === 'dark');
        } else {
          // No saved preference, keep dark mode as default
          setIsDark(true);
        }
      } else {
        const savedTheme = await AsyncStorage.getItem('theme');
        if (savedTheme !== null) {
          setIsDark(savedTheme === 'dark');
        } else {
          // No saved preference, keep dark mode as default
          setIsDark(true);
        }
      }
    } catch (error) {
      logger.error('Error loading theme preference', error);
    }
  };

  const toggleTheme = async () => {
    try {
      const newTheme = !isDark;
      setIsDark(newTheme);
      if (Platform.OS === 'web') {
        localStorage.setItem('theme', newTheme ? 'dark' : 'light');
      } else {
        await AsyncStorage.setItem('theme', newTheme ? 'dark' : 'light');
      }
    } catch (error) {
      logger.error('Error saving theme preference', error);
    }
  };

  const theme = isDark ? darkTheme : lightTheme;

  return (
    <ThemeContext.Provider value={{ theme, isDark, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};