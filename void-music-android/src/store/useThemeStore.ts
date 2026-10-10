import { create } from 'zustand';
import {
  AppTheme,
  ThemeId,
  THEME_REGISTRY,
  VOID_ORIGINAL_THEME,
} from '../constants/theme';
import { storage } from '../utils/storage';

const THEME_STORAGE_KEY = 'void_music_theme';
const ADAPTIVE_LIGHTING_STORAGE_KEY = 'void_music_adaptive_lighting';

export interface ArtworkAura {
  dominant: string;
  secondary: string;
  tertiary: string;
  dominantRgb: [number, number, number];
  secondaryRgb: [number, number, number];
  ambientGlow: string;
}

const DEFAULT_AURA: ArtworkAura = {
  dominant: '#00E575',
  secondary: '#06B6D4',
  tertiary: '#10B981',
  dominantRgb: [0, 229, 117],
  secondaryRgb: [6, 182, 212],
  ambientGlow: 'rgba(0, 229, 117, 0.22)',
};

interface ThemeState {
  themeId: ThemeId;
  theme: AppTheme;
  adaptiveLightingEnabled: boolean;
  artworkAura: ArtworkAura;

  setTheme: (themeId: ThemeId) => void;
  setAdaptiveLightingEnabled: (enabled: boolean) => void;
  setArtworkAura: (aura: ArtworkAura) => void;
}

const getInitialThemeId = (): ThemeId => {
  const saved = storage.getString(THEME_STORAGE_KEY) as ThemeId | undefined;
  if (saved && (saved === 'original' || saved === 'light' || saved === 'luminous')) {
    return saved;
  }
  return 'original';
};

const getInitialAdaptiveLighting = (): boolean => {
  const saved = storage.getString(ADAPTIVE_LIGHTING_STORAGE_KEY);
  if (saved !== undefined) {
    return saved === 'true';
  }
  return true;
};

export const useThemeStore = create<ThemeState>((set) => {
  const initialThemeId = getInitialThemeId();
  const initialAdaptive = getInitialAdaptiveLighting();

  return {
    themeId: initialThemeId,
    theme: THEME_REGISTRY[initialThemeId] || VOID_ORIGINAL_THEME,
    adaptiveLightingEnabled: initialAdaptive,
    artworkAura: DEFAULT_AURA,

    setTheme: (newThemeId: ThemeId) => {
      const selected = THEME_REGISTRY[newThemeId] || VOID_ORIGINAL_THEME;
      storage.set(THEME_STORAGE_KEY, newThemeId);
      set({
        themeId: newThemeId,
        theme: selected,
      });
    },

    setAdaptiveLightingEnabled: (enabled: boolean) => {
      storage.set(ADAPTIVE_LIGHTING_STORAGE_KEY, enabled ? 'true' : 'false');
      set({ adaptiveLightingEnabled: enabled });
    },

    setArtworkAura: (aura: ArtworkAura) => {
      set({ artworkAura: aura });
    },
  };
});

/**
 * Convenient react hook for consuming the active theme and its dynamic properties
 */
export function useTheme() {
  const {
    theme,
    themeId,
    setTheme,
    adaptiveLightingEnabled,
    setAdaptiveLightingEnabled,
    artworkAura,
    setArtworkAura,
  } = useThemeStore();

  return {
    theme,
    themeId,
    isDark: theme.colors.isDark,
    setTheme,
    adaptiveLightingEnabled,
    setAdaptiveLightingEnabled,
    artworkAura,
    setArtworkAura,
  };
}
