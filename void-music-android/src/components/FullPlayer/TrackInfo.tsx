import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Track } from '../../types';
import { THEME } from '../../constants/theme';

interface TrackInfoProps {
  track: Track;
}

export const TrackInfo: React.FC<TrackInfoProps> = ({ track }) => {
  const isPreview = Boolean(track.isPreview);

  return (
    <View style={styles.container}>
      <View style={styles.badgeRow}>
        <View style={[styles.badge, isPreview && styles.previewBadge]}>
          <Text style={[styles.badgeText, isPreview && styles.previewText]}>
            {isPreview ? 'SOURCE // 30S PREVIEW' : 'AUDIO // 320KBPS'}
          </Text>
        </View>
        <View style={[styles.badge, styles.statusBadge, isPreview && styles.previewStatusBadge]}>
          <View style={[styles.liveDot, isPreview && styles.previewDot]} />
          <Text style={[styles.badgeText, styles.statusText, isPreview && styles.previewStatusText]}>
            {isPreview ? 'PREVIEW STREAM' : 'VOID STREAM'}
          </Text>
        </View>
      </View>

      <Text numberOfLines={1} style={styles.title}>
        {track.title}
      </Text>
      <Text numberOfLines={1} style={styles.artist}>
        {track.artist}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: THEME.spacing.sm,
    paddingHorizontal: THEME.spacing.lg,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: THEME.spacing.sm,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: THEME.borderRadius.sm,
    backgroundColor: THEME.colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    marginRight: THEME.spacing.sm,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderColor: THEME.colors.accentDim,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: THEME.colors.accent,
    marginRight: 6,
  },
  badgeText: {
    fontFamily: THEME.typography.mono,
    fontSize: 10,
    color: THEME.colors.textMuted,
    letterSpacing: 1,
  },
  statusText: {
    color: THEME.colors.accentBright,
  },
  previewBadge: {
    borderColor: 'rgba(245, 158, 11, 0.4)',
    backgroundColor: 'rgba(245, 158, 11, 0.08)',
  },
  previewText: {
    color: THEME.colors.warning,
  },
  previewStatusBadge: {
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  previewDot: {
    backgroundColor: THEME.colors.warning,
  },
  previewStatusText: {
    color: THEME.colors.warning,
  },
  title: {
    fontSize: THEME.typography.sizes.xl,
    fontWeight: '700',
    color: THEME.colors.text,
    marginBottom: 4,
  },
  artist: {
    fontFamily: THEME.typography.mono,
    fontSize: THEME.typography.sizes.sm,
    color: THEME.colors.textMuted,
    letterSpacing: 0.5,
  },
});
