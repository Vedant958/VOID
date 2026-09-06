import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../../src/constants/theme';
import { CategoryChip } from '../../src/components/CategoryChip';
import { TrackRow } from '../../src/components/TrackRow';
import { Track } from '../../src/types';
import { usePlayback } from '../../src/hooks/usePlayback';
import { useQueueStore } from '../../src/store/useQueueStore';
import { normalizeTrack } from '../../src/utils/trackUtils';
import { ArtworkService } from '../../src/services/ArtworkService';

const CATEGORIES = ['ALL', 'CYBERPUNK', 'SYNTHWAVE', 'LO-FI', 'AMBIENT', 'INDUSTRIAL'];

const RAW_CURATED_TRACKS = [
  {
    id: 'curated-1',
    title: 'Resonance',
    artist: 'HOME',
    album: 'Odyssey',
    artwork: 'https://is1-ssl.mzstatic.com/image/thumb/Music211/v4/4f/13/65/4f1365b0-e97c-c469-c438-2f7d8f204355/872133025584_cover.jpg/600x600bb.jpg',
    duration: 212,
  },
  {
    id: 'curated-2',
    title: 'Turbo Killer',
    artist: 'Carpenter Brut',
    album: 'Trilogy',
    artwork: 'https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/f3/67/b9/f367b929-406d-ef08-6b62-a4322c62c8da/00602557606782.rgb.jpg/600x600bb.jpg',
    duration: 208,
  },
  {
    id: 'curated-3',
    title: 'Nightcall',
    artist: 'Kavinsky',
    album: 'OutRun',
    artwork: 'https://is1-ssl.mzstatic.com/image/thumb/Music125/v4/c1/2d/fe/c12dfe8f-cdf6-e179-d69a-8ec35f760266/00602537248681.rgb.jpg/600x600bb.jpg',
    duration: 259,
  },
  {
    id: 'curated-4',
    title: 'Tech Noir',
    artist: 'GUNSHIP',
    album: 'GUNSHIP',
    artwork: 'https://is1-ssl.mzstatic.com/image/thumb/Music125/v4/14/82/82/14828219-fd3d-531f-2f05-8a40083fb07f/889326256694_Cover.jpg/600x600bb.jpg',
    duration: 297,
  },
  {
    id: 'curated-5',
    title: 'Venger',
    artist: 'Perturbator',
    album: 'The Uncanny Valley',
    artwork: 'https://is1-ssl.mzstatic.com/image/thumb/Music124/v4/b2/d1/5b/b2d15bd9-6ade-7b4d-6426-2fa0e194a71a/764072823713_cover.jpg/600x600bb.jpg',
    duration: 308,
  },
];

export const CURATED_TRACKS: Track[] = RAW_CURATED_TRACKS.map((t) => normalizeTrack(t, 'saavn'));

export default function DiscoverScreen() {
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [tracks, setTracks] = useState<Track[]>(CURATED_TRACKS);
  const { playTrack, currentTrack, isPlaying } = usePlayback();
  const { addToQueue } = useQueueStore();

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

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Terminal Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.terminalPrompt}>VOID // AUDIO TERMINAL</Text>
            <Text style={styles.headerTitle}>DISCOVERY MATRIX</Text>
          </View>
          <View style={styles.systemStatus}>
            <View style={styles.statusDot} />
            <Text style={styles.statusText}>SYS OK</Text>
          </View>
        </View>

        {/* Featured Broadcast Hero Banner */}
        <TouchableOpacity
          style={styles.heroBanner}
          activeOpacity={0.85}
          onPress={() => playTrack(tracks[0])}
        >
          <View style={styles.heroBadge}>
            <Ionicons name="radio" size={14} color={THEME.colors.accent} />
            <Text style={styles.heroBadgeText}>FEATURED SIGNAL</Text>
          </View>
          <Text style={styles.heroTitle}>NEURAL SYNTH FREQUENCIES</Text>
          <Text style={styles.heroSubtitle}>High-fidelity cyberpunk & synthwave transmissions</Text>
          <View style={styles.playHeroBtn}>
            <Ionicons name="play" size={18} color="#050508" />
            <Text style={styles.playHeroText}>TRANSMIT NOW</Text>
          </View>
        </TouchableOpacity>

        {/* Category Filter Chips */}
        <View style={styles.categorySection}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryScroll}>
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

        {/* Curated Feed */}
        <View style={styles.feedSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>PRIORITY FEEDS</Text>
            <Text style={styles.sectionMeta}>{tracks.length} SIGNALS</Text>
          </View>

          {tracks.map((item, idx) => {
            const isActive = currentTrack?.title === item.title;
            return (
              <TrackRow
                key={item.id}
                track={item}
                showIndex={idx + 1}
                isActive={isActive}
                isPlaying={isActive && isPlaying}
                onPress={() => playTrack(item)}
                onAddToQueue={() => addToQueue(item)}
              />
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: THEME.colors.background,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: THEME.spacing.lg,
    paddingTop: THEME.spacing.md,
    paddingBottom: THEME.spacing.sm,
  },
  terminalPrompt: {
    fontFamily: THEME.typography.mono,
    fontSize: 10,
    color: THEME.colors.accent,
    letterSpacing: 2,
  },
  headerTitle: {
    fontSize: THEME.typography.sizes.xl,
    fontWeight: '800',
    color: THEME.colors.text,
    letterSpacing: 0.5,
  },
  systemStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: THEME.borderRadius.sm,
    backgroundColor: THEME.colors.surface,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: THEME.colors.accent,
    marginRight: 6,
  },
  statusText: {
    fontFamily: THEME.typography.mono,
    fontSize: 10,
    color: THEME.colors.accent,
  },
  heroBanner: {
    marginHorizontal: THEME.spacing.lg,
    marginTop: THEME.spacing.md,
    padding: THEME.spacing.lg,
    backgroundColor: THEME.colors.surface,
    borderRadius: THEME.borderRadius.lg,
    borderWidth: 1,
    borderColor: THEME.colors.borderGlow,
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: THEME.spacing.sm,
  },
  heroBadgeText: {
    fontFamily: THEME.typography.mono,
    fontSize: 10,
    color: THEME.colors.accent,
    marginLeft: 6,
    letterSpacing: 1.5,
  },
  heroTitle: {
    fontSize: THEME.typography.sizes.lg,
    fontWeight: '700',
    color: THEME.colors.text,
    marginBottom: 4,
  },
  heroSubtitle: {
    fontSize: THEME.typography.sizes.xs,
    color: THEME.colors.textMuted,
    marginBottom: THEME.spacing.md,
  },
  playHeroBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: THEME.colors.accent,
    paddingHorizontal: THEME.spacing.md,
    paddingVertical: THEME.spacing.sm - 2,
    borderRadius: THEME.borderRadius.sm,
  },
  playHeroText: {
    fontFamily: THEME.typography.mono,
    fontSize: 11,
    fontWeight: '700',
    color: '#050508',
    marginLeft: 6,
    letterSpacing: 1,
  },
  categorySection: {
    marginTop: THEME.spacing.lg,
  },
  categoryScroll: {
    paddingHorizontal: THEME.spacing.lg,
  },
  feedSection: {
    marginTop: THEME.spacing.lg,
    paddingHorizontal: THEME.spacing.sm,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: THEME.spacing.md,
    marginBottom: THEME.spacing.xs,
  },
  sectionTitle: {
    fontFamily: THEME.typography.mono,
    fontSize: THEME.typography.sizes.xs,
    color: THEME.colors.textMuted,
    letterSpacing: 1.5,
  },
  sectionMeta: {
    fontFamily: THEME.typography.mono,
    fontSize: 10,
    color: THEME.colors.textDim,
  },
});
