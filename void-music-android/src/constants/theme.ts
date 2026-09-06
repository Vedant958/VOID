import { Platform } from 'react-native';

export const THEME = {
  colors: {
    background: '#050508',
    surface: '#0d0f14',
    surfaceSubtle: '#141824',
    card: '#0f131a',
    border: '#1f293d',
    borderGlow: 'rgba(16, 185, 129, 0.4)',
    
    // VOID Brand Cyberpunk Palette
    accent: '#10b981', // Emerald terminal green
    accentDim: 'rgba(16, 185, 129, 0.15)',
    accentBright: '#34d399',
    cyan: '#06b6d4',
    cyanDim: 'rgba(6, 182, 212, 0.15)',
    
    text: '#f3f4f6',
    textMuted: '#8b949e',
    textDim: '#4b5563',
    
    danger: '#ef4444',
    warning: '#f59e0b',
  },
  typography: {
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
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    xxl: 32,
  },
  borderRadius: {
    sm: 4,
    md: 8,
    lg: 12,
    xl: 20,
    full: 9999,
  },
};
