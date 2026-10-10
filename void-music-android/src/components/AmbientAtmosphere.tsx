import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  Easing,
  cancelAnimation,
} from 'react-native-reanimated';
import { useTheme, ArtworkAura } from '../store/useThemeStore';

interface AmbientAtmosphereProps {
  /** Custom opacity intensity multiplier (0.0 to 1.5) */
  intensityMultiplier?: number;
}

interface AuraFieldProps {
  aura: ArtworkAura;
  alpha1: number;
  alpha2: number;
}

/**
 * Three broad, seamlessly blended full-fill linear gradients.
 * No border-radius on any field — eliminates the visible elliptical blob artefact
 * that occurred when oversized absolutely-positioned views with large border-radii clipped.
 */
const AuraFieldLayer: React.FC<AuraFieldProps> = ({ aura, alpha1, alpha2 }) => {
  const [domR, domG, domB] = aura.dominantRgb || [0, 229, 117];
  const [secR, secG, secB] = aura.secondaryRgb || [6, 182, 212];

  return (
    <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
      {/* Dominant wash: top-left corner fading to transparent at bottom-right */}
      <LinearGradient
        colors={[
          `rgba(${domR}, ${domG}, ${domB}, ${alpha1.toFixed(3)})`,
          `rgba(${domR}, ${domG}, ${domB}, ${(alpha1 * 0.35).toFixed(3)})`,
          'transparent',
        ]}
        locations={[0.0, 0.45, 1.0]}
        start={{ x: 0.0, y: 0.0 }}
        end={{ x: 1.0, y: 1.0 }}
        style={StyleSheet.absoluteFillObject}
      />

      {/* Secondary wash: bottom-right corner fading to transparent at top-left */}
      <LinearGradient
        colors={[
          'transparent',
          `rgba(${secR}, ${secG}, ${secB}, ${(alpha2 * 0.40).toFixed(3)})`,
          `rgba(${secR}, ${secG}, ${secB}, ${alpha2.toFixed(3)})`,
        ]}
        locations={[0.0, 0.55, 1.0]}
        start={{ x: 0.0, y: 0.0 }}
        end={{ x: 1.0, y: 1.0 }}
        style={StyleSheet.absoluteFillObject}
      />

      {/* Diagonal mid-tone bridge — ties both washes together across the full canvas */}
      <LinearGradient
        colors={[
          `rgba(${domR}, ${domG}, ${domB}, ${(alpha1 * 0.18).toFixed(3)})`,
          'transparent',
          `rgba(${secR}, ${secG}, ${secB}, ${(alpha2 * 0.22).toFixed(3)})`,
        ]}
        locations={[0.0, 0.50, 1.0]}
        start={{ x: 0.15, y: 0.0 }}
        end={{ x: 0.85, y: 1.0 }}
        style={StyleSheet.absoluteFillObject}
      />
    </View>
  );
};

export const AmbientAtmosphere: React.FC<AmbientAtmosphereProps> = ({
  intensityMultiplier = 1.0,
}) => {
  const { theme, themeId, adaptiveLightingEnabled, artworkAura } = useTheme();

  // Crossfade state management between old and new palettes
  const [currentAura, setCurrentAura] = useState<ArtworkAura>(artworkAura);
  const [previousAura, setPreviousAura] = useState<ArtworkAura | null>(null);
  const crossfadeProgress = useSharedValue(1);

  // Gentle breathing scale — subtle life with no translate (translate would show clip edges)
  const breatheScale = useSharedValue(1.0);

  // Master opacity for enabling/disabling adaptive lighting
  const masterOpacity = useSharedValue(adaptiveLightingEnabled ? 1 : 0);

  // Track palette changes to trigger smooth 900ms crossfade
  const prevAuraKeyRef = useRef(`${artworkAura.dominant}-${artworkAura.secondary}`);

  useEffect(() => {
    const newKey = `${artworkAura.dominant}-${artworkAura.secondary}`;
    if (newKey !== prevAuraKeyRef.current) {
      setPreviousAura(currentAura);
      setCurrentAura(artworkAura);
      prevAuraKeyRef.current = newKey;

      crossfadeProgress.value = 0;
      crossfadeProgress.value = withTiming(1, {
        duration: 1200,
        easing: Easing.inOut(Easing.cubic),
      });
    }
  }, [artworkAura.dominant, artworkAura.secondary]);

  // Handle adaptive lighting toggle smooth transition
  useEffect(() => {
    masterOpacity.value = withTiming(adaptiveLightingEnabled ? 1 : 0, {
      duration: 700,
      easing: Easing.out(Easing.quad),
    });
  }, [adaptiveLightingEnabled, masterOpacity]);

  // Slow gentle breathe loop — scale only, no translate (translate panning would reveal clip edges)
  useEffect(() => {
    if (!adaptiveLightingEnabled) {
      cancelAnimation(breatheScale);
      breatheScale.value = 1.0;
      return;
    }
    breatheScale.value = withRepeat(
      withTiming(1.06, { duration: 20000, easing: Easing.inOut(Easing.sin) }),
      -1,
      true
    );
    return () => {
      cancelAnimation(breatheScale);
    };
  }, [adaptiveLightingEnabled, breatheScale]);

  const currentStyle = useAnimatedStyle(() => ({
    opacity: crossfadeProgress.value * masterOpacity.value,
    transform: [{ scale: breatheScale.value }],
  }));

  const previousStyle = useAnimatedStyle(() => ({
    opacity: (1 - crossfadeProgress.value) * masterOpacity.value,
  }));

  // Theme-specific calibrated opacity levels
  let baseAlpha1 = 0.22;
  let baseAlpha2 = 0.20;

  if (themeId === 'light') {
    baseAlpha1 = 0.14;
    baseAlpha2 = 0.12;
  } else if (themeId === 'luminous') {
    baseAlpha1 = 0.22;
    baseAlpha2 = 0.24;
  }

  const effectiveAlpha1 = baseAlpha1 * intensityMultiplier;
  const effectiveAlpha2 = baseAlpha2 * intensityMultiplier;

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      pointerEvents="none"
    >
      {/* Previous Aura Field Layer during crossfade */}
      {previousAura && (
        <Animated.View style={[StyleSheet.absoluteFillObject, previousStyle]} pointerEvents="none">
          <AuraFieldLayer
            aura={previousAura}
            alpha1={effectiveAlpha1}
            alpha2={effectiveAlpha2}
          />
        </Animated.View>
      )}

      {/* Current Active Aura Field Layer */}
      <Animated.View style={[StyleSheet.absoluteFillObject, currentStyle]} pointerEvents="none">
        <AuraFieldLayer
          aura={currentAura}
          alpha1={effectiveAlpha1}
          alpha2={effectiveAlpha2}
        />
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
});

