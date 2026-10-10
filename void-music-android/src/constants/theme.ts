import { Platform } from 'react-native';

export type ThemeId = 'original' | 'light' | 'luminous';

export interface ThemeColors {
  background: string;
  surface: string;
  surfaceSubtle: string;
  card: string;
  cardElevated: string;
  border: string;
  borderSubtle: string;
  borderGlow: string;
  
  // VOID Brand Cyberpunk Palette
  accent: string;
  accentDim: string;
  accentBright: string;
  cyan: string;
  cyanDim: string;
  
  text: string;
  textMuted: string;
  textDim: string;
  
  danger: string;
  warning: string;

  isDark: boolean;
  statusBar: 'light' | 'dark';
}

export interface ThemeTypography {
  mono: string;
  sizes: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
    xxl: number;
  };
}

export interface ThemeSpacing {
  xs: number;
  sm: number;
  md: number;
  lg: number;
  xl: number;
  xxl: number;
}

export interface ThemeBorderRadius {
  sm: number;
  md: number;
  lg: number;
  xl: number;
  full: number;
}

export interface AppTheme {
  id: ThemeId;
  name: string;
  description: string;
  colors: ThemeColors;
  typography: ThemeTypography;
  spacing: ThemeSpacing;
  borderRadius: ThemeBorderRadius;
}

const SHARED_TYPOGRAPHY: ThemeTypography = {
  mono: Platform.select({
    ios: 'Menlo',
    android: 'monospace',
    default: 'monospace',
  }),
  sizes: {
    xs: 11,
    sm: 13,
    md: 15,
    lg: 18,
    xl: 22,
    xxl: 28,
  },
};

const SHARED_SPACING: ThemeSpacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};

const SHARED_BORDER_RADIUS: ThemeBorderRadius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 20,
  full: 9999,
};

export const VOID_ORIGINAL_THEME: AppTheme = {
  id: 'original',
  name: 'VOID Original',
  description: 'Cyber-terminal obsidian void with electric emerald optics and OLED optimization.',
  colors: {
    background: '#050508',
    surface: '#0d0f14',
    surfaceSubtle: '#141824',
    card: '#0f131a',
    cardElevated: 'rgba(18, 22, 34, 0.85)',
    border: '#1f293d',
    borderSubtle: 'rgba(255, 255, 255, 0.06)',
    borderGlow: 'rgba(16, 185, 129, 0.4)',
    accent: '#10b981',
    accentDim: 'rgba(16, 185, 129, 0.15)',
    accentBright: '#34d399',
    cyan: '#06b6d4',
    cyanDim: 'rgba(6, 182, 212, 0.15)',
    text: '#f3f4f6',
    textMuted: '#8b949e',
    textDim: '#4b5563',
    danger: '#ef4444',
    warning: '#f59e0b',
    isDark: true,
    statusBar: 'light',
  },
  typography: SHARED_TYPOGRAPHY,
  spacing: SHARED_SPACING,
  borderRadius: SHARED_BORDER_RADIUS,
};

export const VOID_LIGHT_THEME: AppTheme = {
  id: 'light',
  name: 'VOID Light',
  description: 'Clinical laboratory audio workstation with daylight clarity and dark charcoal telemetry.',
  colors: {
    background: '#F8FAFC',
    surface: '#FFFFFF',
    surfaceSubtle: '#F1F5F9',
    card: '#FFFFFF',
    cardElevated: '#FFFFFF',
    border: '#E2E8F0',
    borderSubtle: '#EDF2F7',
    borderGlow: 'rgba(0, 108, 73, 0.25)',
    accent: '#006C49',
    accentDim: 'rgba(0, 108, 73, 0.10)',
    accentBright: '#10B981',
    cyan: '#00687A',
    cyanDim: 'rgba(0, 104, 122, 0.10)',
    text: '#0F172A',
    textMuted: '#64748B',
    textDim: '#94A3B8',
    danger: '#BA1A1A',
    warning: '#D97706',
    isDark: false,
    statusBar: 'dark',
  },
  typography: SHARED_TYPOGRAPHY,
  spacing: SHARED_SPACING,
  borderRadius: SHARED_BORDER_RADIUS,
};

export const VOID_LUMINOUS_THEME: AppTheme = {
  id: 'luminous',
  name: 'VOID Luminous',
  description: 'Ultra-premium frosted glassmorphism with dynamic ambient mesh auras and neon emerald accents.',
  colors: {
    background: '#EEF2F7',
    surface: 'rgba(255, 255, 255, 0.52)',
    surfaceSubtle: 'rgba(255, 255, 255, 0.40)',
    card: 'rgba(255, 255, 255, 0.52)',
    cardElevated: 'rgba(255, 255, 255, 0.80)',
    border: 'rgba(255, 255, 255, 0.75)',
    borderSubtle: 'rgba(255, 255, 255, 0.55)',
    borderGlow: 'rgba(0, 229, 117, 0.45)',
    accent: '#00E575',
    accentDim: 'rgba(0, 229, 117, 0.18)',
    accentBright: '#00E575',
    cyan: '#06B6D4',
    cyanDim: 'rgba(6, 182, 212, 0.14)',
    text: '#0F172A',
    textMuted: '#475569',
    textDim: '#64748B',
    danger: '#DC2626',
    warning: '#D97706',
    isDark: false,
    statusBar: 'dark',
  },
  typography: SHARED_TYPOGRAPHY,
  spacing: SHARED_SPACING,
  borderRadius: SHARED_BORDER_RADIUS,
};

export const THEME_REGISTRY: Record<ThemeId, AppTheme> = {
  original: VOID_ORIGINAL_THEME,
  light: VOID_LIGHT_THEME,
  luminous: VOID_LUMINOUS_THEME,
};

// Default export maintained for existing static callers
export const THEME = VOID_ORIGINAL_THEME;
