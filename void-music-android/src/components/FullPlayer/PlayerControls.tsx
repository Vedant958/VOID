import React from 'react';
import { View, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PlaybackMode } from '../../types';
import { THEME } from '../../constants/theme';

interface PlayerControlsProps {
  isPlaying: boolean;
  isBuffering: boolean;
  playbackMode: PlaybackMode;
  onPlayPause: () => void;
  onNext: () => void;
  onPrev: () => void;
  onToggleMode: () => void;
}

export const PlayerControls: React.FC<PlayerControlsProps> = ({
  isPlaying,
  isBuffering,
  playbackMode,
  onPlayPause,
  onNext,
  onPrev,
  onToggleMode,
}) => {
  const getModeIcon = () => {
    switch (playbackMode) {
      case 'repeat-one':
        return 'repeat';
      case 'repeat-all':
        return 'repeat';
      case 'shuffle':
        return 'shuffle';
      default:
        return 'repeat-outline';
    }
  };

  const isModeActive = playbackMode !== 'normal';

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.auxButton}
        onPress={onToggleMode}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Ionicons
          name={getModeIcon()}
          size={22}
          color={isModeActive ? THEME.colors.accent : THEME.colors.textDim}
        />
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.skipButton}
        onPress={onPrev}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
      >
        <Ionicons name="play-skip-back" size={28} color={THEME.colors.text} />
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.playButton}
        onPress={onPlayPause}
        activeOpacity={0.8}
      >
        {isBuffering ? (
          <ActivityIndicator size="small" color="#050508" />
        ) : (
          <Ionicons
            name={isPlaying ? 'pause' : 'play'}
            size={32}
            color="#050508"
            style={!isPlaying ? { marginLeft: 3 } : undefined}
          />
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.skipButton}
        onPress={onNext}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
      >
        <Ionicons name="play-skip-forward" size={28} color={THEME.colors.text} />
      </TouchableOpacity>

      <View style={styles.auxButton} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: THEME.spacing.xl,
    marginVertical: THEME.spacing.md,
  },
  playButton: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: THEME.colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: THEME.colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 8,
  },
  skipButton: {
    padding: 12,
  },
  auxButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
