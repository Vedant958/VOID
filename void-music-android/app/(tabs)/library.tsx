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
import { useTheme } from '../../src/store/useThemeStore';
import { AppearanceModal } from '../../src/components/AppearanceModal';
import { PlaylistDetailModal } from '../../src/components/PlaylistDetailModal';
import { TrackMenuModal } from '../../src/components/TrackMenuModal';
import { AddToPlaylistModal } from '../../src/components/AddToPlaylistModal';
import { Track } from '../../src/types';

type VaultTab = 'LIKES' | 'PLAYLISTS' | 'HISTORY';

export default function LibraryScreen() {
  const [activeTab, setActiveTab] = useState<VaultTab>('LIKES');
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string | null>(null);
  const [menuTrack, setMenuTrack] = useState<Track | null>(null);
  const [addToPlaylistTrack, setAddToPlaylistTrack] = useState<Track | null>(null);
  const [isAppearanceOpen, setIsAppearanceOpen] = useState(false);

  const { theme, isDark } = useTheme();
  const { likedTracks, playlists, history, clearHistory, createPlaylist, deletePlaylist } =
    useLibraryStore();
  const { playTrack, currentTrack, isPlaying } = usePlayback();

  const handleCreatePlaylist = () => {
    Alert.prompt
      ? Alert.prompt(
          'NEW PLAYLIST',
          'Enter a name for your custom audio vault playlist:',
          [
            { text: 'CANCEL', style: 'cancel' },
            {
              text: 'CREATE',
              onPress: (text) => {
                const name = (text || '').trim() || `Vault Mix #${playlists.length + 1}`;
                createPlaylist(name);
              },
            },
          ],
          'plain-text',
          `Vault Mix #${playlists.length + 1}`
        )
      : (() => {
          const name = `Vault Mix #${playlists.length + 1}`;
          createPlaylist(name);
        })();
  };

  const handleDeletePlaylist = (id: string, name: string) => {
    Alert.alert(
      'DELETE PLAYLIST',
      `Are you sure you want to delete "${name}"?`,
      [
        { text: 'CANCEL', style: 'cancel' },
        {
          text: 'DELETE',
          style: 'destructive',
          onPress: () => deletePlaylist(id),
        },
      ]
    );
  };

  return (
    <View style={styles.outerContainer}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.header}>
        <View>
          <Text style={[styles.terminalPrompt, { color: theme.colors.accent, fontFamily: theme.typography.mono }]}>
            VOID // SECURE STORAGE
          </Text>
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>AUDIO VAULT</Text>
        </View>

        {/* Theme Settings Header Trigger */}
        <TouchableOpacity
          style={[
            styles.appearanceBtn,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
            },
          ]}
          onPress={() => setIsAppearanceOpen(true)}
          activeOpacity={0.8}
        >
          <Ionicons name="color-palette-outline" size={16} color={theme.colors.accent} />
          <Text style={[styles.appearanceBtnText, { color: theme.colors.accent, fontFamily: theme.typography.mono }]}>
            THEME
          </Text>
        </TouchableOpacity>
      </View>

      {/* Vault Sub-Tabs */}
      <View style={[styles.tabSelector, { borderBottomColor: theme.colors.border }]}>
        {(['LIKES', 'PLAYLISTS', 'HISTORY'] as VaultTab[]).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[
              styles.tabButton,
              activeTab === tab && { borderBottomColor: theme.colors.accent },
            ]}
            onPress={() => setActiveTab(tab)}
          >
            <Text
              style={[
                styles.tabText,
                {
                  color: activeTab === tab ? theme.colors.accentBright : theme.colors.textMuted,
                  fontFamily: theme.typography.mono,
                },
                activeTab === tab && styles.activeTabText,
              ]}
            >
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
                onOptionsPress={() => setMenuTrack(item)}
              />
            );
          }}
          ListEmptyComponent={
            <View style={styles.centerContainer}>
              <Ionicons name="heart-dislike-outline" size={48} color={theme.colors.textDim} />
              <Text style={[styles.emptyTitle, { color: theme.colors.textMuted, fontFamily: theme.typography.mono }]}>
                NO LIKED FREQUENCIES
              </Text>
              <Text style={[styles.emptySubtitle, { color: theme.colors.textDim }]}>
                Tap the heart icon on any track to save it here
              </Text>
            </View>
          }
        />
      )}

      {activeTab === 'PLAYLISTS' && (
        <View style={styles.playlistsContainer}>
          <TouchableOpacity
            style={[styles.createBtn, { backgroundColor: theme.colors.accent }]}
            onPress={handleCreatePlaylist}
          >
            <Ionicons name="add" size={20} color={isDark ? '#050508' : '#FFFFFF'} />
            <Text
              style={[
                styles.createBtnText,
                { color: isDark ? '#050508' : '#FFFFFF', fontFamily: theme.typography.mono },
              ]}
            >
              INITIALIZE NEW PLAYLIST
            </Text>
          </TouchableOpacity>

          <FlatList
            data={playlists}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => (
              <PlaylistCard
                playlist={item}
                onPress={() => setSelectedPlaylistId(item.id)}
                onDelete={() => handleDeletePlaylist(item.id, item.name)}
              />
            )}
            ListEmptyComponent={
              <View style={styles.centerContainer}>
                <Ionicons name="folder-outline" size={48} color={theme.colors.textDim} />
                <Text style={[styles.emptyTitle, { color: theme.colors.textMuted, fontFamily: theme.typography.mono }]}>
                  NO CUSTOM PLAYLISTS
                </Text>
                <Text style={[styles.emptySubtitle, { color: theme.colors.textDim }]}>
                  Create a playlist to curate custom audio sets
                </Text>
              </View>
            }
          />
        </View>
      )}

      {activeTab === 'HISTORY' && (
        <View style={styles.historyContainer}>
          {history.length > 0 && (
            <View style={styles.historyHeader}>
              <Text style={[styles.historyCount, { color: theme.colors.textDim, fontFamily: theme.typography.mono }]}>
                {history.length} TRANSMISSIONS LOGGED
              </Text>
              <TouchableOpacity onPress={clearHistory}>
                <Text style={[styles.clearText, { color: theme.colors.danger, fontFamily: theme.typography.mono }]}>
                  PURGE LOGS
                </Text>
              </TouchableOpacity>
            </View>
          )}

          <FlatList
            data={history}
            keyExtractor={(item) => `${item.track.id}-${item.playedAt}`}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => {
              const isActive = currentTrack?.id === item.track.id;
              return (
                <TrackRow
                  track={item.track}
                  isActive={isActive}
                  isPlaying={isActive && isPlaying}
                  onPress={() => playTrack(item.track)}
                  onOptionsPress={() => setMenuTrack(item.track)}
                />
              );
            }}
            ListEmptyComponent={
              <View style={styles.centerContainer}>
                <Ionicons name="time-outline" size={48} color={theme.colors.textDim} />
                <Text style={[styles.emptyTitle, { color: theme.colors.textMuted, fontFamily: theme.typography.mono }]}>
                  NO LISTENING LOGS
                </Text>
                <Text style={[styles.emptySubtitle, { color: theme.colors.textDim }]}>
                  Playtracks will automatically register in this audit feed
                </Text>
              </View>
            }
          />
        </View>
      )}

      <PlaylistDetailModal
        visible={selectedPlaylistId !== null}
        playlistId={selectedPlaylistId}
        onClose={() => setSelectedPlaylistId(null)}
        onTrackMenuPress={(t) => setMenuTrack(t)}
      />

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

      <AppearanceModal
        visible={isAppearanceOpen}
        onClose={() => setIsAppearanceOpen(false)}
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  appearanceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 4,
    borderWidth: 1,
    gap: 6,
  },
  appearanceBtnText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
  },
  tabSelector: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    paddingHorizontal: 16,
    marginTop: 4,
  },
  tabButton: {
    paddingVertical: 8,
    marginRight: 24,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabText: {
    fontSize: 11,
    letterSpacing: 1.5,
  },
  activeTabText: {
    fontWeight: '700',
  },
  playlistsContainer: {
    flex: 1,
  },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 16,
    marginVertical: 12,
    paddingVertical: 12,
    borderRadius: 8,
  },
  createBtnText: {
    fontSize: 11,
    fontWeight: '700',
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
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  historyCount: {
    fontSize: 10,
  },
  clearText: {
    fontSize: 10,
    letterSpacing: 1,
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
    marginTop: 60,
  },
  emptyTitle: {
    fontSize: 13,
    marginTop: 12,
    letterSpacing: 1.5,
  },
  emptySubtitle: {
    fontSize: 11,
    marginTop: 4,
    textAlign: 'center',
  },
});
