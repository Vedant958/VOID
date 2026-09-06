import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLibraryStore } from '../../src/store/useLibraryStore';
import { usePlayback } from '../../src/hooks/usePlayback';
import { TrackRow } from '../../src/components/TrackRow';
import { PlaylistCard } from '../../src/components/PlaylistCard';
import { THEME } from '../../src/constants/theme';

type VaultTab = 'LIKES' | 'PLAYLISTS' | 'HISTORY';

export default function LibraryScreen() {
  const [activeTab, setActiveTab] = useState<VaultTab>('LIKES');
  const { likedTracks, playlists, history, clearHistory, createPlaylist, deletePlaylist } =
    useLibraryStore();
  const { playTrack, currentTrack, isPlaying } = usePlayback();

  const handleCreatePlaylist = () => {
    const name = `Vault Mix #${playlists.length + 1}`;
    createPlaylist(name);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.terminalPrompt}>VOID // SECURE STORAGE</Text>
        <Text style={styles.headerTitle}>AUDIO VAULT</Text>
      </View>

      {/* Vault Sub-Tabs */}
      <View style={styles.tabSelector}>
        {(['LIKES', 'PLAYLISTS', 'HISTORY'] as VaultTab[]).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tabButton, activeTab === tab && styles.activeTabButton]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
              {tab}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Tab Content */}
      {activeTab === 'LIKES' && (
        <FlatList
          data={likedTracks}
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
                onPress={() => playTrack(item, likedTracks, index)}
              />
            );
          }}
          ListEmptyComponent={
            <View style={styles.centerContainer}>
              <Ionicons name="heart-dislike-outline" size={48} color={THEME.colors.textDim} />
              <Text style={styles.emptyTitle}>NO LIKED FREQUENCIES</Text>
              <Text style={styles.emptySubtitle}>Tap the heart icon on any track to save it here</Text>
            </View>
          }
        />
      )}

      {activeTab === 'PLAYLISTS' && (
        <View style={styles.playlistsContainer}>
          <TouchableOpacity style={styles.createBtn} onPress={handleCreatePlaylist}>
            <Ionicons name="add" size={20} color="#050508" />
            <Text style={styles.createBtnText}>INITIALIZE NEW PLAYLIST</Text>
          </TouchableOpacity>

          <FlatList
            data={playlists}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => (
              <PlaylistCard
                playlist={item}
                onPress={() => {
                  if (item.tracks.length > 0) {
                    playTrack(item.tracks[0], item.tracks, 0);
                  }
                }}
                onDelete={() => deletePlaylist(item.id)}
              />
            )}
            ListEmptyComponent={
              <View style={styles.centerContainer}>
                <Ionicons name="folder-outline" size={48} color={THEME.colors.textDim} />
                <Text style={styles.emptyTitle}>NO CUSTOM PLAYLISTS</Text>
                <Text style={styles.emptySubtitle}>Create a playlist to curate custom audio sets</Text>
              </View>
            }
          />
        </View>
      )}

      {activeTab === 'HISTORY' && (
        <View style={styles.historyContainer}>
          {history.length > 0 && (
            <View style={styles.historyHeader}>
              <Text style={styles.historyCount}>{history.length} TRANSMISSIONS LOGGED</Text>
              <TouchableOpacity onPress={clearHistory}>
                <Text style={styles.clearText}>PURGE LOGS</Text>
              </TouchableOpacity>
            </View>
          )}

          <FlatList
            data={history}
            keyExtractor={(item, idx) => `${item.track.id}-${idx}`}
            contentContainerStyle={styles.listContent}
            renderItem={({ item, index }) => {
              const isActive = currentTrack?.id === item.track.id;
              const historyTracks = history.map((h) => h.track);
              return (
                <TrackRow
                  track={item.track}
                  showIndex={index + 1}
                  isActive={isActive}
                  isPlaying={isActive && isPlaying}
                  onPress={() => playTrack(item.track, historyTracks, index)}
                />
              );
            }}
            ListEmptyComponent={
              <View style={styles.centerContainer}>
                <Ionicons name="time-outline" size={48} color={THEME.colors.textDim} />
                <Text style={styles.emptyTitle}>LOG BUFFER EMPTY</Text>
                <Text style={styles.emptySubtitle}>Your recent audio transmissions will appear here</Text>
              </View>
            }
          />
        </View>
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
  tabSelector: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.border,
    paddingHorizontal: THEME.spacing.lg,
    marginTop: THEME.spacing.xs,
  },
  tabButton: {
    paddingVertical: THEME.spacing.sm,
    marginRight: THEME.spacing.xl,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTabButton: {
    borderBottomColor: THEME.colors.accent,
  },
  tabText: {
    fontFamily: THEME.typography.mono,
    fontSize: THEME.typography.sizes.xs,
    color: THEME.colors.textMuted,
    letterSpacing: 1.5,
  },
  activeTabText: {
    color: THEME.colors.accentBright,
    fontWeight: '700',
  },
  playlistsContainer: {
    flex: 1,
  },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: THEME.colors.accent,
    marginHorizontal: THEME.spacing.lg,
    marginVertical: THEME.spacing.md,
    paddingVertical: 12,
    borderRadius: THEME.borderRadius.md,
  },
  createBtnText: {
    fontFamily: THEME.typography.mono,
    fontSize: 11,
    fontWeight: '700',
    color: '#050508',
    marginLeft: 6,
    letterSpacing: 1,
  },
  historyContainer: {
    flex: 1,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: THEME.spacing.lg,
    paddingVertical: THEME.spacing.sm,
  },
  historyCount: {
    fontFamily: THEME.typography.mono,
    fontSize: 10,
    color: THEME.colors.textDim,
  },
  clearText: {
    fontFamily: THEME.typography.mono,
    fontSize: 10,
    color: THEME.colors.danger,
    letterSpacing: 1,
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
    marginTop: 60,
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
    textAlign: 'center',
  },
});
