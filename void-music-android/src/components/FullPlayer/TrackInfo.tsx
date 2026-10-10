import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Track } from '../../types';
import { useTheme } from '../../store/useThemeStore';

interface TrackInfoProps {
  track: Track;
}

export const TrackInfo: React.FC<TrackInfoProps> = ({ track }) => {
  const { theme } = useTheme();
  const isPreview = Boolean(track.isPreview);

  const bitrateLabel = React.useMemo(() => {
    if (isPreview) return 'SOURCE // 30S PREVIEW';
    if (track.bitrate && track.bitrate !== 'unknown' && track.bitrate !== 'direct') {
      const clean = track.bitrate.toUpperCase().replace(/\s+/g, '');
      return `AUDIO // ${clean}`;
    }
    return 'AUDIO // STREAM';
  }, [isPreview, track.bitrate]);

  return (
    <View style={styles.container}>
      <View style={styles.badgeRow}>
        <View
          style={[
            styles.badge,
            {
              backgroundColor: theme.colors.surfaceSubtle,
              borderColor: theme.colors.border,
            },
            isPreview && styles.previewBadge,
          ]}
        >
          <Text
            style={[
              styles.badgeText,
              { color: theme.colors.textMuted, fontFamily: theme.typography.mono },
              isPreview && { color: theme.colors.warning },
            ]}
          >
            {bitrateLabel}
          </Text>
        </View>
        <View
          style={[
            styles.badge,
            styles.statusBadge,
            {
              backgroundColor: theme.colors.surfaceSubtle,
              borderColor: theme.colors.accentDim,
            },
            isPreview && styles.previewStatusBadge,
          ]}
        >
          <View
            style={[
              styles.liveDot,
              { backgroundColor: isPreview ? theme.colors.warning : theme.colors.accent },
            ]}
          />
          <Text
            style={[
              styles.badgeText,
              {
                color: isPreview ? theme.colors.warning : theme.colors.accentBright,
                fontFamily: theme.typography.mono,
              },
            ]}
          >
            {isPreview ? 'PREVIEW STREAM' : 'VOID STREAM'}
          </Text>
        </View>
      </View>

      <Text numberOfLines={1} style={[styles.title, { color: theme.colors.text }]}>
        {track.title}
      </Text>
      <Text
        numberOfLines={1}
        style={[
          styles.artist,
          { color: theme.colors.textMuted, fontFamily: theme.typography.mono },
        ]}
      >
        {track.artist}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
    paddingHorizontal: 24,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    borderWidth: 1,
    marginRight: 8,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  badgeText: {
    fontSize: 10,
    letterSpacing: 1,
  },
  previewBadge: {
    borderColor: 'rgba(245, 158, 11, 0.4)',
    backgroundColor: 'rgba(245, 158, 11, 0.08)',
  },
  previewStatusBadge: {
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 4,
  },
  artist: {
    fontSize: 13,
    letterSpacing: 0.5,
  },
});
