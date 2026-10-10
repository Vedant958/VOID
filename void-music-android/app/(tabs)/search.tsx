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
import { useTheme } from '../../src/store/useThemeStore';
import { TrackMenuModal } from '../../src/components/TrackMenuModal';
import { AddToPlaylistModal } from '../../src/components/AddToPlaylistModal';

const SUGGESTED_QUERIES = ['Synthwave', 'Cyberpunk 2077', 'Lo-Fi Chill', 'Carpenter Brut', 'Darksynth'];

export default function SearchScreen() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Track[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [menuTrack, setMenuTrack] = useState<Track | null>(null);
  const [addToPlaylistTrack, setAddToPlaylistTrack] = useState<Track | null>(null);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  const { theme } = useTheme();
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
    <View style={styles.outerContainer}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.header}>
        <Text style={[styles.terminalPrompt, { color: theme.colors.accent, fontFamily: theme.typography.mono }]}>
          VOID // SIGNAL INTERCEPT
        </Text>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>GLOBAL QUERY</Text>
      </View>

      {/* Search Input Box */}
      <View
        style={[
          styles.searchBarWrapper,
          {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.border,
          },
        ]}
      >
        <Ionicons name="search" size={18} color={theme.colors.textMuted} style={styles.searchIcon} />
        <TextInput
          style={[styles.input, { color: theme.colors.text, fontFamily: theme.typography.mono }]}
          placeholder="SEARCH TRACK, ARTIST, TRANSMISSION..."
          placeholderTextColor={theme.colors.textDim}
          value={query}
          onChangeText={setQuery}
          autoCapitalize="none"
          autoCorrect={false}
          clearButtonMode="while-editing"
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => setQuery('')} style={styles.clearBtn}>
            <Ionicons name="close-circle" size={18} color={theme.colors.textDim} />
          </TouchableOpacity>
        )}
      </View>

      {/* Suggested Query Chips */}
      {query.length === 0 && (
        <View style={styles.suggestionsContainer}>
          <Text style={[styles.suggestedTitle, { color: theme.colors.textDim, fontFamily: theme.typography.mono }]}>
            RECOMMENDED FREQUENCIES
          </Text>
          <View style={styles.chipsRow}>
            {SUGGESTED_QUERIES.map((term) => (
              <TouchableOpacity
                key={term}
                style={[
                  styles.queryChip,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.border,
                  },
                ]}
                onPress={() => setQuery(term)}
              >
                <Ionicons name="flash-outline" size={12} color={theme.colors.accent} />
                <Text
                  style={[
                    styles.chipText,
                    { color: theme.colors.textMuted, fontFamily: theme.typography.mono },
                  ]}
                >
                  {term}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Search State / Results */}
      {isSearching ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={theme.colors.accent} />
          <Text style={[styles.loadingText, { color: theme.colors.accent, fontFamily: theme.typography.mono }]}>
            SCANNING WAVELENGTHS...
          </Text>
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
                onOptionsPress={() => setMenuTrack(item)}
              />
            );
          }}
          ListEmptyComponent={
            query.trim().length > 0 ? (
              <View style={styles.centerContainer}>
                <Ionicons name="radio-outline" size={48} color={theme.colors.textDim} />
                <Text style={[styles.emptyTitle, { color: theme.colors.textMuted, fontFamily: theme.typography.mono }]}>
                  NO SIGNAL DETECTED
                </Text>
                <Text style={[styles.emptySubtitle, { color: theme.colors.textDim }]}>
                  Try searching by artist or full track name
                </Text>
              </View>
            ) : null
          }
        />
      )}

      <TrackMenuModal
        visible={menuTrack !== null}
        track={menuTrack}
        onClose={() => setMenuTrack(null)}
        onOpenAddToPlaylist={(t) => setAddToPlaylistTrack(t)}
      />

      <AddToPlaylistModal
        visible={addToPlaylistTrack !== null}
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
  header: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  terminalPrompt: {
    fontSize: 10,
    letterSpacing: 2,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
  },
  searchBarWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    marginHorizontal: 16,
    marginVertical: 8,
    paddingHorizontal: 12,
    height: 48,
  },
  searchIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 12,
  },
  clearBtn: {
    padding: 4,
  },
  suggestionsContainer: {
    paddingHorizontal: 16,
    marginTop: 12,
  },
  suggestedTitle: {
    fontSize: 10,
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  queryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 9999,
  },
  chipText: {
    fontSize: 11,
    marginLeft: 6,
  },
  listContent: {
    paddingHorizontal: 8,
    paddingVertical: 8,
    paddingBottom: 140,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  loadingText: {
    fontSize: 11,
    marginTop: 12,
    letterSpacing: 1.5,
  },
  emptyTitle: {
    fontSize: 13,
    marginTop: 12,
    letterSpacing: 1.5,
  },
  emptySubtitle: {
    fontSize: 11,
    marginTop: 4,
  },
});
