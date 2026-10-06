import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';

export interface ThemeColors {
  background: string;
  backgroundSecondary: string;
  surface: string;
  surfaceSubtle: string;
  surfaceHighlight: string;
  cardBorder: string;
  cardBorderActive: string;

  // Brand Accents
  primary: string; // Electric Royal Blue
  primaryDark: string;
  primaryLight: string;
  primaryMuted: string;

  secondary: string; // Teal
  secondaryLight: string;
  secondaryMuted: string;

  accent: string; // Purple
  accentLight: string;
  accentMuted: string;

  warning: string; // Amber
  warningMuted: string;

  danger: string; // Red
  dangerMuted: string;

  success: string;
  successMuted: string;

  // Text
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  textInverse: string;

  // Quick Action Icon Palettes
  fuelBg: string;
  fuelIcon: string;
  serviceBg: string;
  serviceIcon: string;
  expenseBg: string;
  expenseIcon: string;
  receiptBg: string;
  receiptIcon: string;

  // Gradients
  heroGradientStart: string;
  heroGradientEnd: string;
  bannerGradientStart: string;
  bannerGradientEnd: string;
}

export const lightColors: ThemeColors = {
  background: '#F1F5F9', // Cool blue-grey
  backgroundSecondary: '#E2E8F0',
  surface: '#FFFFFF', // Clean pure white
  surfaceSubtle: '#F8FAFC',
  surfaceHighlight: '#EEF2F6',
  cardBorder: '#E2E8F0',
  cardBorderActive: '#2563EB',

  primary: '#2563EB', // Electric Blue
  primaryDark: '#1D4ED8',
  primaryLight: '#3B82F6',
  primaryMuted: '#EBF2FF',

  secondary: '#0D9488', // Teal
  secondaryLight: '#14B8A6',
  secondaryMuted: '#CCFBF1',

  accent: '#7C3AED', // Purple
  accentLight: '#8B5CF6',
  accentMuted: '#F3E8FF',

  warning: '#D97706', // Amber
  warningMuted: '#FEF3C7',

  danger: '#EF4444',
  dangerMuted: '#FEE2E2',

  success: '#10B981',
  successMuted: '#D1FAE5',

  textPrimary: '#0F172A',
  textSecondary: '#475569',
  textMuted: '#8A99AD',
  textInverse: '#FFFFFF',

  fuelBg: '#E6F7ED',
  fuelIcon: '#10B981',
  serviceBg: '#EBF2FF',
  serviceIcon: '#2563EB',
  expenseBg: '#FEF3E6',
  expenseIcon: '#F59E0B',
  receiptBg: '#F3E8FF',
  receiptIcon: '#8B5CF6',

  heroGradientStart: '#1E3A8A',
  heroGradientEnd: '#0D9488',
  bannerGradientStart: '#1D4ED8',
  bannerGradientEnd: '#0284C7',
};

export const darkColors: ThemeColors = {
  background: '#0B111E', // Deep Midnight Navy
  backgroundSecondary: '#0F172A',
  surface: '#1A2333',
  surfaceSubtle: '#141C2B',
  surfaceHighlight: '#222F45',
  cardBorder: 'rgba(255, 255, 255, 0.08)',
  cardBorderActive: '#3B82F6',

  primary: '#3B82F6',
  primaryDark: '#2563EB',
  primaryLight: '#60A5FA',
  primaryMuted: 'rgba(37, 99, 235, 0.22)',

  secondary: '#14B8A6',
  secondaryLight: '#2DD4BF',
  secondaryMuted: 'rgba(20, 184, 166, 0.22)',

  accent: '#A78BFA',
  accentLight: '#C4B5FD',
  accentMuted: 'rgba(167, 139, 250, 0.22)',

  warning: '#FBBF24',
  warningMuted: 'rgba(245, 158, 11, 0.22)',

  danger: '#F87171',
  dangerMuted: 'rgba(239, 68, 68, 0.22)',

  success: '#34D399',
  successMuted: 'rgba(16, 185, 129, 0.22)',

  textPrimary: '#F8FAFC',
  textSecondary: '#94A3B8',
  textMuted: '#64748B',
  textInverse: '#0B111E',

  fuelBg: 'rgba(16, 185, 129, 0.18)',
  fuelIcon: '#34D399',
  serviceBg: 'rgba(37, 99, 235, 0.22)',
  serviceIcon: '#60A5FA',
  expenseBg: 'rgba(245, 158, 11, 0.22)',
  expenseIcon: '#FBBF24',
  receiptBg: 'rgba(139, 92, 246, 0.22)',
  receiptIcon: '#C4B5FD',

  heroGradientStart: '#0F172A',
  heroGradientEnd: '#134E4A',
  bannerGradientStart: '#1E3A8A',
  bannerGradientEnd: '#0369A1',
};

export interface AppTheme {
  isDark: boolean;
  colors: ThemeColors;
  spacing: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
  };
  radius: {
    sm: number;
    md: number;
    lg: number;
    xl: number;
    full: number;
  };
}

const spacingTokens = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};

const radiusTokens = {
  sm: 8,
  md: 14,
  lg: 20,
  xl: 28,
  full: 9999,
};

// Static default theme for backwards compatibility
export const theme: AppTheme = {
  isDark: false,
  colors: lightColors,
  spacing: spacingTokens,
  radius: radiusTokens,
};

interface ThemeContextType {
  isDark: boolean;
  theme: AppTheme;
  toggleTheme: () => void;
  setMode: (mode: 'light' | 'dark') => void;
}

const ThemeContext = createContext<ThemeContextType>({
  isDark: false,
  theme,
  toggleTheme: () => {},
  setMode: () => {},
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const systemScheme = useColorScheme();
  const [isDark, setIsDark] = useState<boolean>(false);

  const toggleTheme = () => setIsDark((prev) => !prev);
  const setMode = (mode: 'light' | 'dark') => setIsDark(mode === 'dark');

  const currentTheme: AppTheme = {
    isDark,
    colors: isDark ? darkColors : lightColors,
    spacing: spacingTokens,
    radius: radiusTokens,
  };

  return React.createElement(
    ThemeContext.Provider,
    { value: { isDark, theme: currentTheme, toggleTheme, setMode } },
    children
  );
};

export function useTheme(): ThemeContextType {
  return useContext(ThemeContext);
}
