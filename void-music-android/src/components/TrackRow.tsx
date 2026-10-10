import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { Track } from '../types';
import { useTheme } from '../store/useThemeStore';
import { formatDuration } from '../utils/formatDuration';
import { useLibraryStore } from '../store/useLibraryStore';

interface TrackRowProps {
  track: Track;
  isPlaying?: boolean;
  isActive?: boolean;
  onPress: () => void;
  onAddToQueue?: () => void;
  onOptionsPress?: () => void;
  showIndex?: number;
}

export const TrackRow: React.FC<TrackRowProps> = ({
  track,
  isPlaying,
  isActive,
  onPress,
  onAddToQueue,
  onOptionsPress,
  showIndex,
}) => {
  const { isLiked, toggleLike } = useLibraryStore();
  const { theme, themeId, isDark } = useTheme();
  const liked = isLiked(track.id);

  const getActiveRowStyle = () => {
    if (!isActive) return null;
    if (themeId === 'luminous') {
      return styles.activeLuminousRow;
    }
    return {
      backgroundColor: theme.colors.surfaceSubtle,
      borderLeftWidth: 3,
      borderLeftColor: theme.colors.accent,
    };
  };

  return (
    <TouchableOpacity
      style={[
        styles.container,
        getActiveRowStyle(),
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {showIndex !== undefined && (
        <Text
          style={[
            styles.indexText,
            { color: isActive ? theme.colors.accent : theme.colors.textDim, fontFamily: theme.typography.mono },
          ]}
        >
          {showIndex < 10 ? `0${showIndex}` : showIndex}
        </Text>
      )}

      <View style={styles.imageWrapper}>
        {track.artwork ? (
          <Image
            source={{ uri: track.artwork }}
            style={styles.artwork}
            contentFit="cover"
            transition={200}
          />
        ) : (
          <View style={[styles.artwork, { backgroundColor: theme.colors.surface, alignItems: 'center', justifyContent: 'center' }]}>
            <Ionicons name="musical-note" size={20} color={theme.colors.textMuted} />
          </View>
        )}
        {isActive && (
          <View
            style={[
              styles.activeOverlay,
              { backgroundColor: isDark ? 'rgba(5, 5, 8, 0.65)' : 'rgba(255, 255, 255, 0.65)' },
            ]}
          >
            <Ionicons
              name={isPlaying ? 'volume-high' : 'pause'}
              size={16}
              color={theme.colors.accent}
            />
          </View>
        )}
      </View>

      <View style={styles.infoWrapper}>
        <Text
          numberOfLines={1}
          style={[
            styles.title,
            { color: isActive ? theme.colors.accentBright : theme.colors.text },
          ]}
        >
          {track.title}
        </Text>
        <View style={styles.artistRow}>
          <Text
            numberOfLines={1}
            style={[
              styles.artist,
              { color: theme.colors.textMuted, fontFamily: theme.typography.mono },
            ]}
          >
            {track.artist}
          </Text>
          {track.recommendationReason ? (
            <Text
              numberOfLines={1}
              style={[
                styles.reasonBadge,
                { color: theme.colors.accent, fontFamily: theme.typography.mono },
              ]}
            >
              {' // ' + track.recommendationReason.toUpperCase()}
            </Text>
          ) : null}
        </View>
      </View>

      {track.duration ? (
        <Text
          style={[
            styles.duration,
            { color: theme.colors.textDim, fontFamily: theme.typography.mono },
          ]}
        >
          {formatDuration(track.duration)}
        </Text>
      ) : null}

      {onAddToQueue && (
        <TouchableOpacity
          style={styles.actionButton}
          onPress={(e) => {
            e.stopPropagation();
            onAddToQueue();
          }}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons
            name="add-circle-outline"
            size={20}
            color={theme.colors.textMuted}
          />
        </TouchableOpacity>
      )}

      <TouchableOpacity
        style={styles.likeButton}
        onPress={(e) => {
          e.stopPropagation();
          toggleLike(track);
        }}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Ionicons
          name={liked ? 'heart' : 'heart-outline'}
          size={18}
          color={liked ? theme.colors.accent : theme.colors.textDim}
        />
      </TouchableOpacity>

      {onOptionsPress && (
        <TouchableOpacity
          style={styles.moreButton}
          onPress={(e) => {
            e.stopPropagation();
            onOptionsPress();
          }}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons
            name="ellipsis-vertical"
            size={18}
            color={theme.colors.textMuted}
          />
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginVertical: 2,
  },
  indexText: {
    fontSize: 11,
    width: 24,
    marginRight: 4,
  },
  imageWrapper: {
    width: 46,
    height: 46,
    borderRadius: 4,
    overflow: 'hidden',
    position: 'relative',
  },
  artwork: {
    width: '100%',
    height: '100%',
  },
  activeOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoWrapper: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  artistRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  artist: {
    fontSize: 11,
    flexShrink: 1,
  },
  reasonBadge: {
    fontSize: 9,
    letterSpacing: 0.5,
    flexShrink: 1,
  },
  duration: {
    fontSize: 11,
    marginHorizontal: 8,
  },
  actionButton: {
    padding: 6,
    marginRight: 4,
  },
  likeButton: {
    padding: 6,
  },
  moreButton: {
    padding: 6,
    marginLeft: 2,
  },
  activeLuminousRow: {
    backgroundColor: 'rgba(255, 255, 255, 0.82)',
    borderWidth: 1,
    borderColor: 'rgba(0, 229, 117, 0.45)',
    borderLeftWidth: 4,
    borderLeftColor: '#00E575',
    shadowColor: '#00E575',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 20,
    elevation: 4,
    borderRadius: 14,
    marginHorizontal: 4,
  },
});
