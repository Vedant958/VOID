import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { Track } from '../types';
import { useTheme } from '../store/useThemeStore';
import { DailyTransmission } from '../services/TransmissionService';

interface TransmissionOfTheDayProps {
  transmission: DailyTransmission;
  onPlayTrack: (track: Track, allTracks: Track[], index: number) => void;
  onPlayAll: (allTracks: Track[]) => void;
  currentTrackTitle?: string;
  isPlaying?: boolean;
}

export const TransmissionOfTheDay: React.FC<TransmissionOfTheDayProps> = ({
  transmission,
  onPlayTrack,
  onPlayAll,
  currentTrackTitle,
  isPlaying = false,
}) => {
  const { theme, themeId, isDark } = useTheme();
  const { tracks, label, subtitle, displayDate, isPersonalized } = transmission;

  if (!tracks || tracks.length === 0) {
    return null;
  }

  return (
    <View
      style={[
        styles.cardContainer,
        {
          backgroundColor:
            themeId === 'luminous'
              ? 'rgba(255, 255, 255, 0.58)'
              : theme.colors.surface,
          borderColor:
            themeId === 'luminous'
              ? 'rgba(255, 255, 255, 0.85)'
              : theme.colors.borderGlow,
        },
        themeId === 'luminous' && styles.liquidGlassCard,
      ]}
    >
      {themeId === 'luminous' && (
        <BlurView
          intensity={28}
          tint="light"
          style={StyleSheet.absoluteFillObject}
        />
      )}
      {/* Header Row */}
      <View style={styles.headerRow}>
        <View style={styles.titleArea}>
          <View style={styles.metaRow}>
            <View style={[styles.activeDot, { backgroundColor: theme.colors.accent }]} />
            <Text
              style={[
                styles.metaBadge,
                { color: theme.colors.accent, fontFamily: theme.typography.mono },
              ]}
            >
              {isPersonalized ? 'NEURAL SYNC' : 'BROADCAST'} // {displayDate}
            </Text>
          </View>
          <Text
            style={[
              styles.heading,
              { color: theme.colors.text, fontFamily: theme.typography.mono },
            ]}
            numberOfLines={1}
          >
            {label}
          </Text>
          <Text
            style={[styles.subheading, { color: theme.colors.textMuted }]}
            numberOfLines={1}
          >
            {subtitle}
          </Text>
        </View>

        {/* Play All Action */}
        <TouchableOpacity
          style={[styles.playAllBtn, { backgroundColor: theme.colors.accent }]}
          activeOpacity={0.8}
          onPress={() => onPlayAll(tracks)}
        >
          <Ionicons name="play" size={13} color={isDark ? '#050508' : '#FFFFFF'} />
          <Text
            style={[
              styles.playAllText,
              { color: isDark ? '#050508' : '#FFFFFF', fontFamily: theme.typography.mono },
            ]}
          >
            PLAY ALL
          </Text>
        </TouchableOpacity>
      </View>

      {/* Horizontal Compact Track Carousel */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.carouselContent}
      >
        {tracks.map((track, idx) => {
          const isActive = currentTrackTitle === track.title;
          return (
            <TouchableOpacity
              key={`${track.id}-${idx}`}
              style={styles.trackCard}
              activeOpacity={0.75}
              onPress={() => onPlayTrack(track, tracks, idx)}
            >
              {/* Artwork */}
              <View
                style={[
                  styles.artworkWrap,
                  {
                    backgroundColor: theme.colors.surfaceSubtle,
                    borderColor: isActive ? theme.colors.accent : theme.colors.border,
                    borderWidth: isActive ? 1.5 : 1,
                  },
                ]}
              >
                {track.artwork ? (
                  <Image source={{ uri: track.artwork }} style={styles.artwork} />
                ) : (
                  <View style={styles.artworkPlaceholder}>
                    <Ionicons name="musical-notes" size={20} color={theme.colors.textDim} />
                  </View>
                )}

                {/* Active Indicator Overlay */}
                {isActive && (
                  <View
                    style={[
                      styles.activeOverlay,
                      { backgroundColor: isDark ? 'rgba(5, 5, 8, 0.45)' : 'rgba(255, 255, 255, 0.45)' },
                    ]}
                  >
                    <Ionicons
                      name={isPlaying ? 'volume-high' : 'play'}
                      size={14}
                      color={theme.colors.accentBright}
                    />
                  </View>
                )}

                {/* Track Index Badge */}
                <View
                  style={[
                    styles.indexBadge,
                    { backgroundColor: isDark ? 'rgba(5, 5, 8, 0.75)' : 'rgba(255, 255, 255, 0.85)' },
                  ]}
                >
                  <Text
                    style={[
                      styles.indexBadgeText,
                      { color: theme.colors.accent, fontFamily: theme.typography.mono },
                    ]}
                  >
                    {String(idx + 1).padStart(2, '0')}
                  </Text>
                </View>
              </View>

              {/* Title & Artist */}
              <Text
                numberOfLines={1}
                style={[
                  styles.trackTitle,
                  { color: isActive ? theme.colors.accentBright : theme.colors.text },
                ]}
              >
                {track.title}
              </Text>
              <Text
                numberOfLines={1}
                style={[styles.trackArtist, { color: theme.colors.textMuted }]}
              >
                {track.artist}
              </Text>
            </TouchableOpacity>
          );
        })}

        {/* End Indicator */}
        <View
          style={[
            styles.endCard,
            { borderColor: theme.colors.border },
          ]}
        >
          <Ionicons name="radio-outline" size={18} color={theme.colors.textDim} />
          <Text
            style={[
              styles.endCardText,
              { color: theme.colors.textDim, fontFamily: theme.typography.mono },
            ]}
          >
            {tracks.length} SIGNALS
          </Text>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    marginHorizontal: 16,
    marginTop: 12,
    paddingTop: 12,
    paddingBottom: 10,
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    marginBottom: 10,
  },
  titleArea: {
    flex: 1,
    marginRight: 10,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  metaBadge: {
    fontSize: 9,
    letterSpacing: 1.2,
  },
  heading: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  subheading: {
    fontSize: 10,
    marginTop: 1,
  },
  playAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 4,
  },
  playAllText: {
    fontSize: 10,
    fontWeight: '800',
    marginLeft: 4,
    letterSpacing: 1,
  },
  carouselContent: {
    paddingHorizontal: 12,
    alignItems: 'flex-start',
  },
  trackCard: {
    width: 78,
    marginRight: 10,
  },
  artworkWrap: {
    width: 78,
    height: 78,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 5,
    position: 'relative',
  },
  artwork: {
    width: '100%',
    height: '100%',
  },
  artworkPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  activeOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  indexBadge: {
    position: 'absolute',
    bottom: 3,
    left: 3,
    paddingHorizontal: 3,
    paddingVertical: 1,
    borderRadius: 2,
  },
  indexBadgeText: {
    fontSize: 8,
    fontWeight: '700',
  },
  trackTitle: {
    fontSize: 10,
    fontWeight: '700',
    marginBottom: 1,
  },
  trackArtist: {
    fontSize: 9,
  },
  endCard: {
    width: 60,
    height: 78,
    borderRadius: 4,
    borderWidth: 1,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    marginRight: 4,
  },
  endCardText: {
    fontSize: 8,
    textAlign: 'center',
    marginTop: 4,
    letterSpacing: 0.5,
  },
  liquidGlassCard: {
    borderRadius: 20,
    shadowColor: 'rgba(15, 23, 42, 0.08)',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.18,
    shadowRadius: 36,
    elevation: 6,
  },
});
