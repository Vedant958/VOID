import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  FlatList,
  Alert,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Playlist, Track } from '../types';
import { TrackRow } from './TrackRow';
import { usePlayback, showNonBlockingToast } from '../hooks/usePlayback';
import { useLibraryStore } from '../store/useLibraryStore';
import { useQueueStore } from '../store/useQueueStore';
import { useTheme } from '../store/useThemeStore';
import { AppTheme } from '../constants/theme';

interface PlaylistDetailModalProps {
  visible: boolean;
  playlistId: string | null;
  onClose: () => void;
  onTrackMenuPress?: (track: Track) => void;
}

export const PlaylistDetailModal: React.FC<PlaylistDetailModalProps> = ({
  visible,
  playlistId,
  onClose,
  onTrackMenuPress,
}) => {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const { playlists, renamePlaylist, deletePlaylist, removeTrackFromPlaylist } =
    useLibraryStore();
  const { playTrack, currentTrack, isPlaying } = usePlayback();
  const { addTracksToQueue } = useQueueStore();

  const [isRenaming, setIsRenaming] = useState(false);
  const [newName, setNewName] = useState('');

  const playlist = playlists.find((p) => p.id === playlistId);

  if (!playlist) return null;

  const handlePlayAll = () => {
    if (playlist.tracks.length === 0) {
      showNonBlockingToast('Playlist has no tracks to play');
      return;
    }
    playTrack(playlist.tracks[0], playlist.tracks, 0);
    showNonBlockingToast(`Playing "${playlist.name}"`);
    onClose();
  };

  const handleAddAllToQueue = () => {
    if (playlist.tracks.length === 0) {
      showNonBlockingToast('Playlist is empty');
      return;
    }
    addTracksToQueue(playlist.tracks);
    showNonBlockingToast(`Added ${playlist.tracks.length} tracks to queue`);
  };

  const handleStartRename = () => {
    setNewName(playlist.name);
    setIsRenaming(true);
  };

  const handleConfirmRename = () => {
    const trimmed = newName.trim();
    if (!trimmed) {
      Alert.alert('Invalid Name', 'Playlist name cannot be empty.');
      return;
    }
    renamePlaylist(playlist.id, trimmed);
    setIsRenaming(false);
    showNonBlockingToast(`Renamed to "${trimmed}"`);
  };

  const handleDelete = () => {
    Alert.alert(
      'DELETE PLAYLIST',
      `Are you sure you want to permanently delete "${playlist.name}"?`,
      [
        { text: 'CANCEL', style: 'cancel' },
        {
          text: 'DELETE',
          style: 'destructive',
          onPress: () => {
            deletePlaylist(playlist.id);
            showNonBlockingToast(`Deleted "${playlist.name}"`);
            onClose();
          },
        },
      ]
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={onClose}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            style={styles.backBtn}
          >
            <Ionicons name="chevron-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>

          <View style={styles.headerTitleBox}>
            <Text style={styles.headerSubtitle}>CUSTOM TRANSMISSION SET</Text>
            {isRenaming ? (
              <View style={styles.renameBox}>
                <TextInput
                  style={styles.renameInput}
                  value={newName}
                  onChangeText={setNewName}
                  autoFocus
                  maxLength={40}
                  placeholder="PLAYLIST NAME"
                  placeholderTextColor={theme.colors.textDim}
                />
                <TouchableOpacity
                  style={styles.saveRenameBtn}
                  onPress={handleConfirmRename}
                >
                  <Ionicons name="checkmark" size={18} color={theme.colors.background} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.cancelRenameBtn}
                  onPress={() => setIsRenaming(false)}
                >
                  <Ionicons name="close" size={18} color={theme.colors.textDim} />
                </TouchableOpacity>
              </View>
            ) : (
              <Text numberOfLines={1} style={styles.headerTitle}>
                {playlist.name}
              </Text>
            )}
          </View>

          <View style={styles.headerActions}>
            <TouchableOpacity
              onPress={handleStartRename}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              style={styles.actionIcon}
            >
              <Ionicons name="pencil-outline" size={18} color={theme.colors.textMuted} />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleDelete}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              style={styles.actionIcon}
            >
              <Ionicons name="trash-outline" size={18} color={theme.colors.danger} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Action Controls Row */}
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.primaryActionBtn, playlist.tracks.length === 0 && styles.btnDisabled]}
            onPress={handlePlayAll}
            disabled={playlist.tracks.length === 0}
          >
            <Ionicons name="play" size={16} color={theme.colors.background} />
            <Text style={styles.primaryActionText}>PLAY ALL</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.secondaryActionBtn, playlist.tracks.length === 0 && styles.btnDisabled]}
            onPress={handleAddAllToQueue}
            disabled={playlist.tracks.length === 0}
          >
            <Ionicons name="add" size={16} color={theme.colors.accent} />
            <Text style={styles.secondaryActionText}>ADD TO QUEUE</Text>
          </TouchableOpacity>
        </View>

        {/* Tracks List */}
        <FlatList
          data={playlist.tracks}
          keyExtractor={(item, index) => `${item.id}-${index}`}
          contentContainerStyle={styles.listContent}
          renderItem={({ item, index }) => {
            const isActive = currentTrack?.id === item.id;
            return (
              <View style={styles.trackRowWrapper}>
                <View style={styles.trackCol}>
                  <TrackRow
                    track={item}
                    showIndex={index + 1}
                    isActive={isActive}
                    isPlaying={isActive && isPlaying}
                    onPress={() => {
                      playTrack(item, playlist.tracks, index);
                      onClose();
                    }}
                    onOptionsPress={
                      onTrackMenuPress ? () => onTrackMenuPress(item) : undefined
                    }
                  />
                </View>

                {/* Remove from playlist button */}
                <TouchableOpacity
                  style={styles.removeTrackBtn}
                  onPress={() => removeTrackFromPlaylist(playlist.id, item.id)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name="close" size={16} color={theme.colors.textDim} />
                </TouchableOpacity>
              </View>
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="musical-notes-outline" size={48} color={theme.colors.textDim} />
              <Text style={styles.emptyTitle}>NO SIGNALS IN PLAYLIST</Text>
              <Text style={styles.emptySubtitle}>
                Add tracks from Discover, Search, or Player menus to curate this vault mix
              </Text>
            </View>
          }
        />
      </SafeAreaView>
    </Modal>
  );
};

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
    },
    backBtn: {
      padding: 6,
    },
    headerTitleBox: {
      flex: 1,
      marginHorizontal: theme.spacing.sm,
    },
    headerSubtitle: {
      fontFamily: theme.typography.mono,
      fontSize: 9,
      color: theme.colors.accent,
      letterSpacing: 1.5,
    },
    headerTitle: {
      fontSize: theme.typography.sizes.md,
      fontWeight: '800',
      color: theme.colors.text,
      letterSpacing: 0.5,
      marginTop: 2,
    },
    renameBox: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 2,
      gap: 6,
    },
    renameInput: {
      flex: 1,
      backgroundColor: theme.colors.background,
      borderWidth: 1,
      borderColor: theme.colors.accent,
      borderRadius: theme.borderRadius.sm,
      color: theme.colors.text,
      fontFamily: theme.typography.mono,
      fontSize: 12,
      paddingHorizontal: 8,
      paddingVertical: 4,
    },
    saveRenameBtn: {
      backgroundColor: theme.colors.accent,
      padding: 6,
      borderRadius: theme.borderRadius.sm,
    },
    cancelRenameBtn: {
      padding: 6,
    },
    headerActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    actionIcon: {
      padding: 6,
    },
    actionRow: {
      flexDirection: 'row',
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.md,
      gap: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    primaryActionBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.accent,
      paddingVertical: 10,
      borderRadius: theme.borderRadius.sm,
      gap: 6,
    },
    primaryActionText: {
      fontFamily: theme.typography.mono,
      fontSize: 11,
      fontWeight: '800',
      color: theme.colors.background,
      letterSpacing: 1,
    },
    secondaryActionBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.surfaceSubtle,
      borderWidth: 1,
      borderColor: theme.colors.border,
      paddingVertical: 10,
      borderRadius: theme.borderRadius.sm,
      gap: 6,
    },
    secondaryActionText: {
      fontFamily: theme.typography.mono,
      fontSize: 11,
      fontWeight: '700',
      color: theme.colors.accent,
      letterSpacing: 1,
    },
    btnDisabled: {
      opacity: 0.4,
    },
    listContent: {
      paddingVertical: theme.spacing.xs,
    },
    trackRowWrapper: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingRight: theme.spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    trackCol: {
      flex: 1,
    },
    removeTrackBtn: {
      padding: 8,
    },
    emptyContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      padding: theme.spacing.xl,
      marginTop: 40,
    },
    emptyTitle: {
      fontFamily: theme.typography.mono,
      fontSize: theme.typography.sizes.sm,
      color: theme.colors.textMuted,
      marginTop: theme.spacing.md,
      letterSpacing: 2,
      fontWeight: '700',
    },
    emptySubtitle: {
      fontSize: theme.typography.sizes.xs,
      color: theme.colors.textDim,
      marginTop: 6,
      textAlign: 'center',
      lineHeight: 18,
      maxWidth: 280,
    },
  });
