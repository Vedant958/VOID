import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../src/store/useThemeStore';
import { CategoryChip } from '../../src/components/CategoryChip';
import { TrackRow } from '../../src/components/TrackRow';
import { Track } from '../../src/types';
import { usePlayback } from '../../src/hooks/usePlayback';
import { useQueueStore } from '../../src/store/useQueueStore';
import { ArtworkService } from '../../src/services/ArtworkService';
import { TrackMenuModal } from '../../src/components/TrackMenuModal';
import { AddToPlaylistModal } from '../../src/components/AddToPlaylistModal';
import { TransmissionOfTheDay } from '../../src/components/TransmissionOfTheDay';
import {
  TransmissionService,
  DailyTransmission,
} from '../../src/services/TransmissionService';
import { RecommendService } from '../../src/services/RecommendService';
import {
  CATEGORIES,
  CURATED_TRACKS,
  filterTracksByCategory,
} from '../../src/constants/curatedTracks';

export { CURATED_TRACKS };

export default function DiscoverScreen() {
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [tracks, setTracks] = useState<Track[]>(CURATED_TRACKS);
  const [dailyTransmission, setDailyTransmission] = useState<DailyTransmission | null>(() =>
    TransmissionService.getCachedTransmission()
  );
  const [menuTrack, setMenuTrack] = useState<Track | null>(null);
  const [addToPlaylistTrack, setAddToPlaylistTrack] = useState<Track | null>(null);

  // Priority Feeds refresh state and mutex lock
  const [isRefreshingFeeds, setIsRefreshingFeeds] = useState(false);
  const feedRefreshLockRef = useRef(false);
  const feedRefreshCounterRef = useRef(0);

  // Smooth rotation animation for the Priority Feeds refresh icon
  const spinAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (isRefreshingFeeds) {
      const loop = Animated.loop(
        Animated.timing(spinAnim, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        })
      );
      loop.start();
      return () => loop.stop();
    } else {
      spinAnim.setValue(0);
    }
  }, [isRefreshingFeeds, spinAnim]);

  const spinFeed = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const { theme } = useTheme();
  const { playTrack, currentTrack, isPlaying } = usePlayback();
  const { addToQueue } = useQueueStore();

  const handleRefreshFeeds = async () => {
    if (feedRefreshLockRef.current) return;
    feedRefreshLockRef.current = true;
    setIsRefreshingFeeds(true);
    try {
      feedRefreshCounterRef.current += 1;
      const freshTracks = await RecommendService.getPriorityFeeds(feedRefreshCounterRef.current);
      if (freshTracks && freshTracks.length > 0) {
        setTracks(freshTracks);
      }
    } catch (err) {
      console.warn('[Discover] Priority Feeds refresh error:', err);
      // Gracefully preserve existing tracks on failure without clearing
    } finally {
      setIsRefreshingFeeds(false);
      feedRefreshLockRef.current = false;
    }
  };


  useEffect(() => {
    // Hydrate any missing artwork on mount
    let isMounted = true;
    Promise.all(
      CURATED_TRACKS.map(async (t) => {
        if (!t.artwork) {
          const art = await ArtworkService.getHDArtwork(t);
          return art ? { ...t, artwork: art } : t;
        }
        return t;
      })
    ).then((hydrated) => {
      if (isMounted) setTracks(hydrated);
    });

    // Hydrate Transmission of the Day
    TransmissionService.getDailyTransmission().then((dt) => {
      if (isMounted) setDailyTransmission(dt);
    });

    return () => {
      isMounted = false;
    };
  }, []);

  const filteredTracks = useMemo(() => {
    return filterTracksByCategory(tracks, selectedCategory);
  }, [tracks, selectedCategory]);

  return (
    <View style={styles.outerContainer}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Terminal Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleBox}>
              <Text style={[styles.terminalPrompt, { color: theme.colors.accent, fontFamily: theme.typography.mono }]}>
                VOID // AUDIO TERMINAL
              </Text>
              <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
                VOID Music
              </Text>
          </View>

          {/* Telemetry Status: Clean SYS // OK indicator (Theme badge removed per spec) */}
          <View
            style={[
              styles.systemStatus,
              {
                backgroundColor: theme.colors.surfaceSubtle,
                borderColor: theme.colors.border,
              },
            ]}
          >
            <View style={[styles.statusDot, { backgroundColor: theme.colors.accent }]} />
            <Text
              style={[
                styles.statusText,
                { color: theme.colors.textMuted, fontFamily: theme.typography.mono },
              ]}
            >
              SYS // OK
            </Text>
          </View>
        </View>

        {/* Transmission of the Day */}
        {dailyTransmission && (
          <TransmissionOfTheDay
            transmission={dailyTransmission}
            currentTrackTitle={currentTrack?.title}
            isPlaying={isPlaying}
            onPlayTrack={(track, allTracks, index) => {
              playTrack(track, allTracks, index);
            }}
            onPlayAll={(allTracks) => {
              if (allTracks.length > 0) {
                playTrack(allTracks[0], allTracks, 0);
              }
            }}
          />
        )}

        {/* Category Filter Chips */}
        <View style={styles.categorySection}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryScroll}
          >
            {CATEGORIES.map((cat) => (
              <CategoryChip
                key={cat}
                label={cat}
                isSelected={selectedCategory === cat}
                onPress={() => setSelectedCategory(cat)}
              />
            ))}
          </ScrollView>
        </View>

        {/* Priority Feeds Track List */}
        <View style={styles.feedSection}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <Text style={[styles.sectionTitle, { color: theme.colors.textMuted, fontFamily: theme.typography.mono }]}>
                PRIORITY FEEDS
              </Text>
              <TouchableOpacity
                style={styles.feedRefreshBtn}
                activeOpacity={0.7}
                onPress={handleRefreshFeeds}
                disabled={isRefreshingFeeds}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityLabel="Refresh Priority Feeds"
              >
                <Animated.View style={{ transform: [{ rotate: spinFeed }] }}>
                  <Ionicons
                    name="reload-outline"
                    size={13}
                    color={isRefreshingFeeds ? theme.colors.accent : theme.colors.textDim}
                  />
                </Animated.View>
              </TouchableOpacity>
            </View>
            <Text style={[styles.sectionMeta, { color: theme.colors.textDim, fontFamily: theme.typography.mono }]}>
              {filteredTracks.length} SIGNALS
            </Text>
          </View>

          {filteredTracks.length > 0 ? (
            filteredTracks.map((track, idx) => {
              const isActive = currentTrack?.id === track.id;
              return (
                <TrackRow
                  key={`${track.id}-${idx}`}
                  track={track}
                  showIndex={idx + 1}
                  isActive={isActive}
                  isPlaying={isActive && isPlaying}
                  onPress={() => playTrack(track, filteredTracks, idx)}
                  onOptionsPress={() => setMenuTrack(track)}
                />
              );
            })
          ) : (
            <View style={[styles.emptyContainer, { borderColor: theme.colors.border, backgroundColor: theme.colors.surfaceSubtle }]}>
              <Ionicons name="radio-outline" size={28} color={theme.colors.textDim} />
              <Text style={[styles.emptyTitle, { color: theme.colors.textMuted, fontFamily: theme.typography.mono }]}>
                NO SIGNALS DETECTED
              </Text>
              <Text style={[styles.emptySubtitle, { color: theme.colors.textDim }]}>
                No tracks mapped under frequency category "{selectedCategory}"
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Track Action Menu Modal */}
      <TrackMenuModal
        visible={Boolean(menuTrack)}
        track={menuTrack}
        onClose={() => setMenuTrack(null)}
        onOpenAddToPlaylist={(t: Track) => setAddToPlaylistTrack(t)}
      />

      {/* Add To Playlist Modal */}
      <AddToPlaylistModal
        visible={Boolean(addToPlaylistTrack)}
        track={addToPlaylistTrack}
        onClose={() => setAddToPlaylistTrack(null)}
      />
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 140,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  headerTitleBox: {
    flex: 1,
    marginRight: 12,
  },
  terminalPrompt: {
    fontSize: 10,
    letterSpacing: 2,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginTop: 2,
  },
  systemStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 4,
    borderWidth: 1,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  categorySection: {
    marginTop: 16,
  },
  categoryScroll: {
    paddingHorizontal: 16,
  },
  feedSection: {
    marginTop: 16,
    paddingHorizontal: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    marginBottom: 4,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  feedRefreshBtn: {
    marginLeft: 8,
    width: 22,
    height: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 11,
    letterSpacing: 1.5,
  },
  sectionMeta: {
    fontSize: 10,
  },
  emptyContainer: {
    paddingVertical: 24,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    borderWidth: 1,
    marginHorizontal: 8,
    marginTop: 8,
  },
  emptyTitle: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: 8,
    letterSpacing: 1.5,
  },
  emptySubtitle: {
    fontSize: 10,
    textAlign: 'center',
    marginTop: 4,
    letterSpacing: 0.5,
  },
});
