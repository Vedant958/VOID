import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  FlatList,
  TextInput,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Track } from '../types';
import { useLibraryStore } from '../store/useLibraryStore';
import { useTheme } from '../store/useThemeStore';
import { AppTheme } from '../constants/theme';
import { showNonBlockingToast } from '../hooks/usePlayback';

interface AddToPlaylistModalProps {
  visible: boolean;
  track: Track | null;
  onClose: () => void;
}

export const AddToPlaylistModal: React.FC<AddToPlaylistModalProps> = ({
  visible,
  track,
  onClose,
}) => {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const { playlists, addTrackToPlaylist, createPlaylist } = useLibraryStore();
  const [isCreating, setIsCreating] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');

  if (!track) return null;

  const handleSelectPlaylist = (playlistId: string, playlistName: string) => {
    addTrackToPlaylist(playlistId, track);
    showNonBlockingToast(`Added to "${playlistName}"`);
    onClose();
  };

  const handleCreateAndAdd = () => {
    const trimmed = newPlaylistName.trim();
    if (!trimmed) {
      Alert.alert('Invalid Name', 'Please enter a name for the playlist.');
      return;
    }
    const created = createPlaylist(trimmed);
    addTrackToPlaylist(created.id, track);
    showNonBlockingToast(`Created "${created.name}" & added track`);
    setNewPlaylistName('');
    setIsCreating(false);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.headerSubtitle}>AUDIO VAULT // ROUTING</Text>
              <Text style={styles.headerTitle}>ADD TO PLAYLIST</Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Ionicons name="close" size={22} color={theme.colors.textDim} />
            </TouchableOpacity>
          </View>

          {/* Track Snapshot */}
          <View style={styles.trackSnapshot}>
            <Ionicons name="musical-note" size={16} color={theme.colors.accent} />
            <Text numberOfLines={1} style={styles.trackSnapshotText}>
              {track.title} <Text style={styles.artistDim}>— {track.artist}</Text>
            </Text>
          </View>

          {/* Create new playlist row */}
          {isCreating ? (
            <View style={styles.createBox}>
              <TextInput
                style={styles.input}
                placeholder="ENTER PLAYLIST NAME..."
                placeholderTextColor={theme.colors.textDim}
                value={newPlaylistName}
                onChangeText={setNewPlaylistName}
                autoFocus
                maxLength={40}
              />
              <View style={styles.createActionRow}>
                <TouchableOpacity
                  style={[styles.btn, styles.cancelBtn]}
                  onPress={() => {
                    setIsCreating(false);
                    setNewPlaylistName('');
                  }}
                >
                  <Text style={styles.btnTextCancel}>CANCEL</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.btn, styles.confirmBtn]}
                  onPress={handleCreateAndAdd}
                >
                  <Text style={styles.btnTextConfirm}>CREATE & ADD</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.newPlaylistBtn}
              onPress={() => setIsCreating(true)}
            >
              <Ionicons name="add-circle-outline" size={20} color={theme.colors.accent} />
              <Text style={styles.newPlaylistText}>CREATE NEW PLAYLIST</Text>
            </TouchableOpacity>
          )}

          {/* Existing Playlists List */}
          <FlatList
            data={playlists}
            keyExtractor={(item) => item.id}
            style={styles.list}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => {
              const alreadyIn = item.tracks.some((t) => t.id === track.id);
              return (
                <TouchableOpacity
                  style={[styles.playlistRow, alreadyIn && styles.playlistRowDisabled]}
                  onPress={() => !alreadyIn && handleSelectPlaylist(item.id, item.name)}
                  disabled={alreadyIn}
                >
                  <View style={styles.playlistIconBox}>
                    <Ionicons
                      name="list"
                      size={18}
                      color={alreadyIn ? theme.colors.textDim : theme.colors.accent}
                    />
                  </View>
                  <View style={styles.playlistInfo}>
                    <Text
                      numberOfLines={1}
                      style={[styles.playlistName, alreadyIn && styles.textDimmed]}
                    >
                      {item.name}
                    </Text>
                    <Text style={styles.playlistCount}>
                      {item.tracks.length} {item.tracks.length === 1 ? 'track' : 'tracks'}
                    </Text>
                  </View>
                  {alreadyIn ? (
                    <View style={styles.alreadyInBadge}>
                      <Ionicons name="checkmark" size={14} color={theme.colors.accent} />
                      <Text style={styles.alreadyInText}>ADDED</Text>
                    </View>
                  ) : (
                    <Ionicons name="chevron-forward" size={18} color={theme.colors.textDim} />
                  )}
                </TouchableOpacity>
              );
            }}
            ListEmptyComponent={
              !isCreating ? (
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>No playlists created yet.</Text>
                </View>
              ) : null
            }
          />
        </View>
      </View>
    </Modal>
  );
};

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.75)',
      justifyContent: 'flex-end',
    },
    modalContent: {
      backgroundColor: theme.colors.surface,
      borderTopLeftRadius: theme.borderRadius.lg,
      borderTopRightRadius: theme.borderRadius.lg,
      borderTopWidth: 1,
      borderLeftWidth: 1,
      borderRightWidth: 1,
      borderColor: theme.colors.border,
      paddingHorizontal: theme.spacing.lg,
      paddingTop: theme.spacing.md,
      paddingBottom: theme.spacing.xl,
      maxHeight: '75%',
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: theme.spacing.sm,
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
      letterSpacing: 1,
      marginTop: 2,
    },
    trackSnapshot: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.surfaceSubtle,
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: theme.borderRadius.sm,
      marginBottom: theme.spacing.md,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    trackSnapshotText: {
      color: theme.colors.text,
      fontSize: theme.typography.sizes.xs + 1,
      fontWeight: '600',
      marginLeft: 8,
      flex: 1,
    },
    artistDim: {
      color: theme.colors.textMuted,
      fontWeight: '400',
    },
    newPlaylistBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.surfaceSubtle,
      borderWidth: 1,
      borderColor: theme.colors.accent,
      paddingVertical: 10,
      paddingHorizontal: 14,
      borderRadius: theme.borderRadius.sm,
      marginBottom: theme.spacing.md,
    },
    newPlaylistText: {
      fontFamily: theme.typography.mono,
      fontSize: 11,
      fontWeight: '700',
      color: theme.colors.accent,
      marginLeft: 8,
      letterSpacing: 1,
    },
    createBox: {
      backgroundColor: theme.colors.surfaceSubtle,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.sm,
      padding: 10,
      marginBottom: theme.spacing.md,
    },
    input: {
      backgroundColor: theme.colors.background,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.sm,
      color: theme.colors.text,
      fontFamily: theme.typography.mono,
      fontSize: 11,
      paddingHorizontal: 10,
      paddingVertical: 8,
      marginBottom: 8,
    },
    createActionRow: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      gap: 8,
    },
    btn: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: theme.borderRadius.sm,
    },
    cancelBtn: {
      backgroundColor: 'transparent',
    },
    confirmBtn: {
      backgroundColor: theme.colors.accent,
    },
    btnTextCancel: {
      fontFamily: theme.typography.mono,
      fontSize: 10,
      color: theme.colors.textDim,
    },
    btnTextConfirm: {
      fontFamily: theme.typography.mono,
      fontSize: 10,
      fontWeight: '700',
      color: theme.colors.background,
    },
    list: {
      maxHeight: 280,
    },
    listContent: {
      paddingBottom: 8,
    },
    playlistRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 10,
      paddingHorizontal: 10,
      borderRadius: theme.borderRadius.sm,
      marginBottom: 4,
      backgroundColor: theme.colors.surfaceSubtle,
    },
    playlistRowDisabled: {
      opacity: 0.6,
    },
    playlistIconBox: {
      width: 32,
      height: 32,
      borderRadius: theme.borderRadius.sm,
      backgroundColor: theme.colors.background,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 10,
    },
    playlistInfo: {
      flex: 1,
    },
    playlistName: {
      color: theme.colors.text,
      fontSize: theme.typography.sizes.sm,
      fontWeight: '600',
    },
    textDimmed: {
      color: theme.colors.textMuted,
    },
    playlistCount: {
      fontFamily: theme.typography.mono,
      fontSize: 10,
      color: theme.colors.textDim,
      marginTop: 2,
    },
    alreadyInBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    alreadyInText: {
      fontFamily: theme.typography.mono,
      fontSize: 9,
      color: theme.colors.accent,
      letterSpacing: 1,
    },
    emptyContainer: {
      alignItems: 'center',
      paddingVertical: 20,
    },
    emptyText: {
      fontFamily: theme.typography.mono,
      fontSize: 11,
      color: theme.colors.textDim,
    },
  });
