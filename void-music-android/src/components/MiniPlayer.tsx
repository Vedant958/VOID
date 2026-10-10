import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { usePlayback } from '../hooks/usePlayback';
import { useProgress } from '../hooks/useProgress';
import { useTheme } from '../store/useThemeStore';

export const MiniPlayer: React.FC = () => {
  const router = useRouter();
  const { currentTrack, isPlaying, isBuffering, togglePlayPause, skipNext } = usePlayback();
  const { position, duration } = useProgress();
  const { theme, themeId } = useTheme();

  if (!currentTrack) {
    return null;
  }

  const progressPercent = duration > 0 ? Math.min(100, Math.max(0, (position / duration) * 100)) : 0;

  return (
    <TouchableOpacity
      style={[
        styles.container,
        {
          backgroundColor: 'transparent',
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor:
            themeId === 'luminous'
              ? 'rgba(255, 255, 255, 0.40)'
              : theme.colors.border,
        },
      ]}
      activeOpacity={0.9}
      onPress={() => router.push('/player')}
    >
      {/* Top progress indicator line */}
      <View style={[styles.progressBarBackground, { backgroundColor: theme.colors.surfaceSubtle }]}>
        <View style={[styles.progressBarFill, { width: `${progressPercent}%`, backgroundColor: theme.colors.accent }]} />
      </View>

      <View style={styles.content}>
        <Image
          source={{ uri: currentTrack.artwork }}
          style={[
            styles.artwork,
            {
              backgroundColor: theme.colors.surfaceSubtle,
              borderColor:
                themeId === 'luminous'
                  ? 'rgba(255, 255, 255, 0.85)'
                  : theme.colors.border,
              borderWidth: themeId === 'luminous' ? 1 : 0,
            },
          ]}
          contentFit="cover"
          transition={200}
        />

        <View style={styles.info}>
          <Text numberOfLines={1} style={[styles.title, { color: theme.colors.text }]}>
            {currentTrack.title}
          </Text>
          <Text
            numberOfLines={1}
            style={[
              styles.artist,
              { color: theme.colors.textMuted, fontFamily: theme.typography.mono },
            ]}
          >
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
              <ActivityIndicator size="small" color={theme.colors.accent} />
            ) : (
              <Ionicons
                name={isPlaying ? 'pause' : 'play'}
                size={22}
                color={theme.colors.accent}
              />
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.controlButton}
            onPress={skipNext}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Ionicons name="play-skip-forward" size={20} color={theme.colors.text} />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  progressBarBackground: {
    height: 2,
    width: '100%',
  },
  progressBarFill: {
    height: '100%',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  artwork: {
    width: 44,
    height: 44,
    borderRadius: 6,
  },
  info: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  title: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 2,
  },
  artist: {
    fontSize: 11,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
  },
  controlButton: {
    padding: 8,
    marginLeft: 4,
  },
});
