import React from 'react';
import { View, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PlaybackMode } from '../../types';
import { useTheme } from '../../store/useThemeStore';

interface PlayerControlsProps {
  isPlaying: boolean;
  isBuffering: boolean;
  playbackMode: PlaybackMode;
  isLiked?: boolean;
  onPlayPause: () => void;
  onNext: () => void;
  onPrev: () => void;
  onToggleMode: () => void;
  onToggleLike?: () => void;
}

export const PlayerControls: React.FC<PlayerControlsProps> = ({
  isPlaying,
  isBuffering,
  playbackMode,
  isLiked = false,
  onPlayPause,
  onNext,
  onPrev,
  onToggleMode,
  onToggleLike,
}) => {
  const { theme, themeId, isDark } = useTheme();

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

  const getAuxGlassStyle = () => {
    if (themeId === 'luminous') {
      return {
        backgroundColor: 'rgba(255, 255, 255, 0.50)',
        borderColor: 'rgba(255, 255, 255, 0.75)',
        borderWidth: 1,
        borderRadius: 20,
      };
    }
    return null;
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.auxButton, getAuxGlassStyle()]}
        onPress={onToggleMode}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Ionicons
          name={getModeIcon()}
          size={20}
          color={isModeActive ? theme.colors.accent : theme.colors.textDim}
        />
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.skipButton}
        onPress={onPrev}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
      >
        <Ionicons name="play-skip-back" size={28} color={theme.colors.text} />
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.playButton,
          {
            backgroundColor: theme.colors.accent,
            shadowColor: theme.colors.accent,
          },
          themeId === 'luminous' && styles.luminousPlayButton,
        ]}
        onPress={onPlayPause}
        activeOpacity={0.8}
      >
        {isBuffering ? (
          <ActivityIndicator size="small" color={isDark ? '#050508' : '#FFFFFF'} />
        ) : (
          <Ionicons
            name={isPlaying ? 'pause' : 'play'}
            size={32}
            color={isDark ? '#050508' : '#FFFFFF'}
            style={!isPlaying ? { marginLeft: 3 } : undefined}
          />
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.skipButton}
        onPress={onNext}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
      >
        <Ionicons name="play-skip-forward" size={28} color={theme.colors.text} />
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.auxButton, getAuxGlassStyle()]}
        onPress={onToggleLike}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Ionicons
          name={isLiked ? 'heart' : 'heart-outline'}
          size={22}
          color={isLiked ? theme.colors.accent : theme.colors.textDim}
        />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    marginVertical: 16,
  },
  playButton: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
  },
  luminousPlayButton: {
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.85)',
  },
  skipButton: {
    padding: 12,
  },
  auxButton: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
