import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { SearchService } from '../../src/services/SearchService';
import { Track } from '../../src/types';
import { TrackRow } from '../../src/components/TrackRow';
import { usePlayback } from '../../src/hooks/usePlayback';
import { useQueueStore } from '../../src/store/useQueueStore';
import { THEME } from '../../src/constants/theme';

const SUGGESTED_QUERIES = ['Synthwave', 'Cyberpunk 2077', 'Lo-Fi Chill', 'Carpenter Brut', 'Darksynth'];

export default function SearchScreen() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Track[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  const { playTrack, currentTrack, isPlaying } = usePlayback();
  const { addToQueue } = useQueueStore();

  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);

    if (!query.trim()) {
      setResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    debounceTimer.current = setTimeout(async () => {
      try {
        const res = await SearchService.search(query.trim());
        setResults(res);
      } catch (e) {
        console.warn('Search query error:', e);
      } finally {
        setIsSearching(false);
      }
    }, 400);

    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [query]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.terminalPrompt}>VOID // SIGNAL INTERCEPT</Text>
        <Text style={styles.headerTitle}>GLOBAL QUERY</Text>
      </View>

      {/* Search Input Box */}
      <View style={styles.searchBarWrapper}>
        <Ionicons name="search" size={18} color={THEME.colors.textMuted} style={styles.searchIcon} />
        <TextInput
          style={styles.input}
          placeholder="SEARCH TRACK, ARTIST, TRANSMISSION..."
          placeholderTextColor={THEME.colors.textDim}
          value={query}
          onChangeText={setQuery}
          autoCapitalize="none"
          autoCorrect={false}
          clearButtonMode="while-editing"
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => setQuery('')} style={styles.clearBtn}>
            <Ionicons name="close-circle" size={18} color={THEME.colors.textDim} />
          </TouchableOpacity>
        )}
      </View>

      {/* Suggested Query Chips */}
      {query.length === 0 && (
        <View style={styles.suggestionsContainer}>
          <Text style={styles.suggestedTitle}>RECOMMENDED FREQUENCIES</Text>
          <View style={styles.chipsRow}>
            {SUGGESTED_QUERIES.map((term) => (
              <TouchableOpacity
                key={term}
                style={styles.queryChip}
                onPress={() => setQuery(term)}
              >
                <Ionicons name="flash-outline" size={12} color={THEME.colors.accent} />
                <Text style={styles.chipText}>{term}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Search State / Results */}
      {isSearching ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={THEME.colors.accent} />
          <Text style={styles.loadingText}>SCANNING WAVELENGTHS...</Text>
        </View>
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item, index }) => {
            const isActive = currentTrack?.id === item.id;
            return (
              <TrackRow
                track={item}
                showIndex={index + 1}
                isActive={isActive}
                isPlaying={isActive && isPlaying}
                onPress={() => playTrack(item)}
                onAddToQueue={() => addToQueue(item)}
              />
            );
          }}
          ListEmptyComponent={
            query.trim().length > 0 ? (
              <View style={styles.centerContainer}>
                <Ionicons name="radio-outline" size={48} color={THEME.colors.textDim} />
                <Text style={styles.emptyTitle}>NO SIGNAL DETECTED</Text>
                <Text style={styles.emptySubtitle}>Try searching by artist or full track name</Text>
              </View>
            ) : null
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: THEME.colors.background,
  },
  header: {
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
  },
  searchBarWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.surface,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderRadius: THEME.borderRadius.md,
    marginHorizontal: THEME.spacing.lg,
    marginVertical: THEME.spacing.sm,
    paddingHorizontal: THEME.spacing.md,
    height: 48,
  },
  searchIcon: {
    marginRight: THEME.spacing.sm,
  },
  input: {
    flex: 1,
    color: THEME.colors.text,
    fontFamily: THEME.typography.mono,
    fontSize: THEME.typography.sizes.xs + 1,
  },
  clearBtn: {
    padding: 4,
  },
  suggestionsContainer: {
    paddingHorizontal: THEME.spacing.lg,
    marginTop: THEME.spacing.md,
  },
  suggestedTitle: {
    fontFamily: THEME.typography.mono,
    fontSize: 10,
    color: THEME.colors.textDim,
    letterSpacing: 1.5,
    marginBottom: THEME.spacing.sm,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  queryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.surface,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: THEME.borderRadius.full,
  },
  chipText: {
    fontFamily: THEME.typography.mono,
    fontSize: 11,
    color: THEME.colors.textMuted,
    marginLeft: 6,
  },
  listContent: {
    paddingHorizontal: THEME.spacing.sm,
    paddingVertical: THEME.spacing.sm,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: THEME.spacing.xl,
  },
  loadingText: {
    fontFamily: THEME.typography.mono,
    fontSize: THEME.typography.sizes.xs,
    color: THEME.colors.accent,
    marginTop: THEME.spacing.md,
    letterSpacing: 1.5,
  },
  emptyTitle: {
    fontFamily: THEME.typography.mono,
    fontSize: THEME.typography.sizes.sm,
    color: THEME.colors.textMuted,
    marginTop: THEME.spacing.md,
    letterSpacing: 1.5,
  },
  emptySubtitle: {
    fontSize: THEME.typography.sizes.xs,
    color: THEME.colors.textDim,
    marginTop: 4,
  },
});
