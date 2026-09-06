import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Image,
  Dimensions,
} from 'react-native';
import { THEME } from '../constants/theme';

interface BootAnimationProps {
  onFinish: () => void;
}

const { height } = Dimensions.get('window');

export const BootAnimation: React.FC<BootAnimationProps> = ({ onFinish }) => {
  // Animated values
  const containerOpacity = useRef(new Animated.Value(1)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.86)).current;
  const glitchX = useRef(new Animated.Value(0)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const scanlineOpacity = useRef(new Animated.Value(0)).current;
  const scanlineY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // STEP 1: Plain black (0 - 300ms)

    // STEP 2: Subtle digital/glitch & scanline begins (300ms)
    const tScanline = setTimeout(() => {
      Animated.timing(scanlineOpacity, {
        toValue: 0.08,
        duration: 250,
        useNativeDriver: true,
      }).start();

      Animated.loop(
        Animated.timing(scanlineY, {
          toValue: height,
          duration: 1500,
          useNativeDriver: true,
        })
      ).start();
    }, 300);

    // Subtle horizontal glitch flicker
    const tGlitch = setTimeout(() => {
      Animated.sequence([
        Animated.timing(glitchX, { toValue: -3, duration: 40, useNativeDriver: true }),
        Animated.timing(glitchX, { toValue: 2, duration: 40, useNativeDriver: true }),
        Animated.timing(logoOpacity, { toValue: 0.35, duration: 60, useNativeDriver: true }),
        Animated.timing(glitchX, { toValue: -1, duration: 40, useNativeDriver: true }),
        Animated.timing(logoOpacity, { toValue: 0.15, duration: 50, useNativeDriver: true }),
        Animated.timing(glitchX, { toValue: 0, duration: 40, useNativeDriver: true }),
      ]).start();
    }, 380);

    // STEP 3: Controlled logo assembly & progressive reveal (750ms - 1300ms)
    const tAssemble = setTimeout(() => {
      Animated.parallel([
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.spring(logoScale, {
          toValue: 1,
          friction: 7,
          tension: 40,
          useNativeDriver: true,
        }),
        Animated.sequence([
          Animated.timing(glitchX, { toValue: 2, duration: 35, useNativeDriver: true }),
          Animated.timing(glitchX, { toValue: -1, duration: 35, useNativeDriver: true }),
          Animated.timing(glitchX, { toValue: 0, duration: 35, useNativeDriver: true }),
        ]),
      ]).start();
    }, 750);

    // STEP 4: Lock into place + VOID MUSIC text reveal (1300ms)
    const tTitle = setTimeout(() => {
      Animated.timing(titleOpacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }).start();
    }, 1300);

    // STEP 5: Hold completed logo briefly (1700ms - 2200ms)

    // STEP 6: Smoothly transition/fade into the existing app (2200ms - 2600ms)
    const tExit = setTimeout(() => {
      Animated.timing(containerOpacity, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }).start(() => {
        onFinish();
      });
    }, 2200);

    return () => {
      clearTimeout(tScanline);
      clearTimeout(tGlitch);
      clearTimeout(tAssemble);
      clearTimeout(tTitle);
      clearTimeout(tExit);
    };
  }, []);

  return (
    <Animated.View style={[styles.container, { opacity: containerOpacity }]}>
      {/* Subtle scanline effect */}
      <Animated.View
        style={[
          styles.scanline,
          {
            opacity: scanlineOpacity,
            transform: [{ translateY: scanlineY }],
          },
        ]}
      />

      {/* Center assembly container */}
      <Animated.View
        style={[
          styles.centerWrap,
          {
            transform: [
              { translateX: glitchX },
              { scale: logoScale },
            ],
          },
        ]}
      >
        <Animated.View style={[styles.logoCard, { opacity: logoOpacity }]}>
          <Image
            source={require('../../assets/icon.png')}
            style={styles.logoImage}
            resizeMode="contain"
          />
        </Animated.View>

        {/* Minimal VOID MUSIC title */}
        <Animated.Text style={[styles.titleText, { opacity: titleOpacity }]}>
          VOID MUSIC
        </Animated.Text>
      </Animated.View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000000',
    zIndex: 999999,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanline: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 80,
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
  },
  centerWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoCard: {
    width: 100,
    height: 100,
    borderRadius: 22,
    backgroundColor: '#06080d',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    shadowColor: THEME.colors.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 8,
  },
  logoImage: {
    width: 92,
    height: 92,
  },
  titleText: {
    fontFamily: THEME.typography.mono,
    fontSize: 16,
    fontWeight: '700',
    color: THEME.colors.text,
    letterSpacing: 4,
    marginTop: 22,
    textAlign: 'center',
  },
});
