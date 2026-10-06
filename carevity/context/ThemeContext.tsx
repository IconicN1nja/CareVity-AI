import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const LightTheme = {
  background: '#F8FAFC',
  card: '#FFFFFF',
  text: '#0F172A',
  textSecondary: '#64748B',
  border: '#E2E8F0',
  primary: '#0D9488',
  primaryGradient: ['#0D9488', '#0F766E'] as const,
  inputBackground: '#F8FAFC',
  shadow: '#94A3B8',
  statusBadge: {
    excellent: ['#059669', '#10B981'] as const,
    good: ['#0284C7', '#38BDF8'] as const,
    average: ['#D97706', '#F59E0B'] as const,
  },
  red: '#EF4444',
  redBackground: '#FEE2E2',
  redBorder: '#FCA5A5',
};

export const DarkTheme = {
  background: '#0F172A',
  card: '#1E293B',
  text: '#F8FAFC',
  textSecondary: '#94A3B8',
  border: '#334155',
  primary: '#0D9488',
  primaryGradient: ['#0D9488', '#0F766E'] as const,
  inputBackground: '#0F172A',
  shadow: '#000000',
  statusBadge: {
    excellent: ['#059669', '#10B981'] as const,
    good: ['#0284C7', '#38BDF8'] as const,
    average: ['#D97706', '#F59E0B'] as const,
  },
  red: '#EF4444',
  redBackground: '#7F1D1D',
  redBorder: '#991B1B',
};

export type ThemeColors = typeof LightTheme;

interface ThemeContextType {
  isDarkMode: boolean;
  toggleTheme: () => void;
  colors: ThemeColors;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const loadTheme = async () => {
      try {
        const savedTheme = await AsyncStorage.getItem('isDarkMode');
        if (savedTheme !== null) {
          setIsDarkMode(savedTheme === 'true');
        }
      } catch (e) {
        console.warn('Error loading theme preference', e);
      } finally {
        setIsLoaded(true);
      }
    };
    loadTheme();
  }, []);

  const toggleTheme = async () => {
    try {
      const newMode = !isDarkMode;
      setIsDarkMode(newMode);
      await AsyncStorage.setItem('isDarkMode', String(newMode));
    } catch (e) {
      console.warn('Error saving theme preference', e);
    }
  };

  if (!isLoaded) return null;

  return (
    <ThemeContext.Provider value={{
      isDarkMode,
      toggleTheme,
      colors: isDarkMode ? DarkTheme : LightTheme
    }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
