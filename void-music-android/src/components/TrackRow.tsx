import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { Track } from '../types';
import { THEME } from '../constants/theme';
import { formatDuration } from '../utils/formatDuration';
import { useLibraryStore } from '../store/useLibraryStore';

interface TrackRowProps {
  track: Track;
  isPlaying?: boolean;
  isActive?: boolean;
  onPress: () => void;
  onAddToQueue?: () => void;
  showIndex?: number;
}

export const TrackRow: React.FC<TrackRowProps> = ({
  track,
  isPlaying,
  isActive,
  onPress,
  onAddToQueue,
  showIndex,
}) => {
  const { isLiked, toggleLike } = useLibraryStore();
  const liked = isLiked(track.id);

  return (
    <TouchableOpacity
      style={[styles.container, isActive && styles.activeContainer]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {showIndex !== undefined && (
        <Text style={[styles.indexText, isActive && styles.activeText]}>
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
          <View style={[styles.artwork, styles.artworkPlaceholder]}>
            <Ionicons name="musical-note" size={20} color={THEME.colors.textMuted} />
          </View>
        )}
        {isActive && (
          <View style={styles.activeOverlay}>
            <Ionicons
              name={isPlaying ? 'volume-high' : 'pause'}
              size={16}
              color={THEME.colors.accent}
            />
          </View>
        )}
      </View>

      <View style={styles.infoWrapper}>
        <Text
          numberOfLines={1}
          style={[styles.title, isActive && styles.activeTitle]}
        >
          {track.title}
        </Text>
        <Text numberOfLines={1} style={styles.artist}>
          {track.artist}
        </Text>
      </View>

      {track.duration ? (
        <Text style={styles.duration}>{formatDuration(track.duration)}</Text>
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
            color={THEME.colors.textMuted}
          />
        </TouchableOpacity>
      )}

      <TouchableOpacity
        style={styles.likeButton}
        onPress={() => toggleLike(track)}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Ionicons
          name={liked ? 'heart' : 'heart-outline'}
          size={18}
          color={liked ? THEME.colors.accent : THEME.colors.textDim}
        />
      </TouchableOpacity>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: THEME.spacing.sm + 2,
    paddingHorizontal: THEME.spacing.md,
    borderRadius: THEME.borderRadius.md,
    marginVertical: 2,
  },
  activeContainer: {
    backgroundColor: THEME.colors.surfaceSubtle,
    borderLeftWidth: 3,
    borderLeftColor: THEME.colors.accent,
  },
  indexText: {
    fontFamily: THEME.typography.mono,
    fontSize: THEME.typography.sizes.xs,
    color: THEME.colors.textDim,
    width: 24,
    marginRight: THEME.spacing.xs,
  },
  activeText: {
    color: THEME.colors.accent,
  },
  imageWrapper: {
    width: 46,
    height: 46,
    borderRadius: THEME.borderRadius.sm,
    overflow: 'hidden',
    position: 'relative',
  },
  artwork: {
    width: '100%',
    height: '100%',
  },
  artworkPlaceholder: {
    backgroundColor: THEME.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(5, 5, 8, 0.65)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoWrapper: {
    flex: 1,
    marginLeft: THEME.spacing.md,
    justifyContent: 'center',
  },
  title: {
    color: THEME.colors.text,
    fontSize: THEME.typography.sizes.sm + 1,
    fontWeight: '600',
    marginBottom: 2,
  },
  activeTitle: {
    color: THEME.colors.accentBright,
  },
  artist: {
    color: THEME.colors.textMuted,
    fontSize: THEME.typography.sizes.xs,
    fontFamily: THEME.typography.mono,
  },
  duration: {
    color: THEME.colors.textDim,
    fontSize: THEME.typography.sizes.xs,
    fontFamily: THEME.typography.mono,
    marginHorizontal: THEME.spacing.sm,
  },
  actionButton: {
    padding: 6,
    marginRight: 4,
  },
  likeButton: {
    padding: 6,
  },
});
