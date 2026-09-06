import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { usePlayback } from '../hooks/usePlayback';
import { useProgress } from '../hooks/useProgress';
import { THEME } from '../constants/theme';

export const MiniPlayer: React.FC = () => {
  const router = useRouter();
  const { currentTrack, isPlaying, isBuffering, togglePlayPause, skipNext } = usePlayback();
  const { position, duration } = useProgress();

  if (!currentTrack) {
    return null;
  }

  const progressPercent = duration > 0 ? Math.min(100, Math.max(0, (position / duration) * 100)) : 0;

  return (
    <TouchableOpacity
      style={styles.container}
      activeOpacity={0.9}
      onPress={() => router.push('/player')}
    >
      {/* Top progress indicator line */}
      <View style={styles.progressBarBackground}>
        <View style={[styles.progressBarFill, { width: `${progressPercent}%` }]} />
      </View>

      <View style={styles.content}>
        <Image
          source={{ uri: currentTrack.artwork }}
          style={styles.artwork}
          contentFit="cover"
          transition={200}
        />

        <View style={styles.info}>
          <Text numberOfLines={1} style={styles.title}>
            {currentTrack.title}
          </Text>
          <Text numberOfLines={1} style={styles.artist}>
            {currentTrack.artist}
          </Text>
        </View>

        <View style={styles.controls}>
          <TouchableOpacity
            style={styles.controlButton}
            onPress={togglePlayPause}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            {isBuffering ? (
              <ActivityIndicator size="small" color={THEME.colors.accent} />
            ) : (
              <Ionicons
                name={isPlaying ? 'pause' : 'play'}
                size={22}
                color={THEME.colors.accent}
              />
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.controlButton}
            onPress={skipNext}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Ionicons name="play-skip-forward" size={20} color={THEME.colors.text} />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: THEME.colors.surface,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.border,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.border,
  },
  progressBarBackground: {
    height: 2,
    backgroundColor: THEME.colors.surfaceSubtle,
    width: '100%',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: THEME.colors.accent,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: THEME.spacing.md,
    paddingVertical: THEME.spacing.sm,
  },
  artwork: {
    width: 44,
    height: 44,
    borderRadius: THEME.borderRadius.sm,
    backgroundColor: THEME.colors.surfaceSubtle,
  },
  info: {
    flex: 1,
    marginLeft: THEME.spacing.md,
    justifyContent: 'center',
  },
  title: {
    color: THEME.colors.text,
    fontSize: THEME.typography.sizes.sm,
    fontWeight: '600',
    marginBottom: 2,
  },
  artist: {
    fontFamily: THEME.typography.mono,
    fontSize: THEME.typography.sizes.xs,
    color: THEME.colors.textMuted,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: THEME.spacing.sm,
  },
  controlButton: {
    padding: 8,
    marginLeft: THEME.spacing.xs,
  },
});
