import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../../constants/theme';

interface ArtworkDisplayProps {
  artworkUrl?: string;
  isBuffering?: boolean;
}

const { width } = Dimensions.get('window');
const ARTWORK_SIZE = Math.min(width - 64, 340);

export const ArtworkDisplay: React.FC<ArtworkDisplayProps> = ({ artworkUrl }) => {
  return (
    <View style={styles.container}>
      <View style={styles.glowBorder}>
        <View style={styles.imageContainer}>
          {artworkUrl ? (
            <Image
              source={{ uri: artworkUrl }}
              style={styles.image}
              contentFit="cover"
              transition={300}
            />
          ) : (
            <View style={styles.placeholder}>
              <Ionicons name="musical-notes" size={64} color={THEME.colors.textMuted} />
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
    marginVertical: THEME.spacing.lg,
  },
  glowBorder: {
    padding: 3,
    borderRadius: THEME.borderRadius.lg,
    backgroundColor: THEME.colors.borderGlow,
    shadowColor: THEME.colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 10,
  },
  imageContainer: {
    width: ARTWORK_SIZE,
    height: ARTWORK_SIZE,
    borderRadius: THEME.borderRadius.lg - 2,
    overflow: 'hidden',
    backgroundColor: THEME.colors.card,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: THEME.colors.surface,
  },
});
