import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../store/useThemeStore';

interface ArtworkDisplayProps {
  artworkUrl?: string;
  isBuffering?: boolean;
}

const { width } = Dimensions.get('window');
const ARTWORK_SIZE = Math.min(width - 64, 340);

export const ArtworkDisplay: React.FC<ArtworkDisplayProps> = ({ artworkUrl }) => {
  const { theme, themeId, artworkAura } = useTheme();

  const getBezelStyle = () => {
    if (themeId === 'luminous') {
      return {
        backgroundColor: 'rgba(255, 255, 255, 0.75)',
        borderColor: 'rgba(255, 255, 255, 0.95)',
        borderWidth: 1.5,
        shadowColor: artworkAura.dominant,
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.30,
        shadowRadius: 26,
        elevation: 8,
      };
    } else if (themeId === 'light') {
      return {
        backgroundColor: '#FFFFFF',
        borderColor: theme.colors.border,
        borderWidth: 1,
        shadowColor: 'rgba(15, 23, 42, 0.16)',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.20,
        shadowRadius: 16,
        elevation: 4,
      };
    } else {
      // Original
      return {
        backgroundColor: '#0F131A',
        borderColor: theme.colors.borderGlow,
        borderWidth: 1,
        shadowColor: artworkAura.dominant,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.40,
        shadowRadius: 22,
        elevation: 8,
      };
    }
  };

  return (
    <View style={styles.container}>
      {/* Precision Liquid Glass Artwork Frame (No circular disc) */}
      <View style={[styles.glowBorder, getBezelStyle()]}>
        <View style={[styles.imageContainer, { backgroundColor: theme.colors.card }]}>
          {artworkUrl ? (
            <Image
              source={{ uri: artworkUrl }}
              style={styles.image}
              contentFit="cover"
              transition={300}
            />
          ) : (
            <View style={[styles.placeholder, { backgroundColor: theme.colors.surface }]}>
              <Ionicons name="musical-notes" size={64} color={theme.colors.textMuted} />
            </View>
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 16,
  },
  glowBorder: {
    padding: 3,
    borderRadius: 16,
  },
  imageContainer: {
    width: ARTWORK_SIZE,
    height: ARTWORK_SIZE,
    borderRadius: 13,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
