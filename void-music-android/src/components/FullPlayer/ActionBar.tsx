import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Track } from '../../types';
import { THEME } from '../../constants/theme';
import { useLibraryStore } from '../../store/useLibraryStore';

interface ActionBarProps {
  track: Track;
  isQueueOpen: boolean;
  onToggleQueue: () => void;
  onAddToPlaylist?: () => void;
}

export const ActionBar: React.FC<ActionBarProps> = ({
  track,
  isQueueOpen,
  onToggleQueue,
  onAddToPlaylist,
}) => {
  const { isLiked, toggleLike } = useLibraryStore();
  const liked = isLiked(track.id);

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.actionBtn}
        onPress={() => toggleLike(track)}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
      >
        <Ionicons
          name={liked ? 'heart' : 'heart-outline'}
          size={24}
          color={liked ? THEME.colors.accent : THEME.colors.textMuted}
        />
      </TouchableOpacity>

      {onAddToPlaylist && (
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={onAddToPlaylist}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Ionicons name="add-circle-outline" size={24} color={THEME.colors.textMuted} />
        </TouchableOpacity>
      )}

      <TouchableOpacity
        style={[styles.actionBtn, isQueueOpen && styles.activeBtn]}
        onPress={onToggleQueue}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
      >
        <Ionicons
          name="list-outline"
          size={24}
          color={isQueueOpen ? THEME.colors.accent : THEME.colors.textMuted}
        />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: THEME.spacing.xl,
    paddingVertical: THEME.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.border,
  },
  actionBtn: {
    padding: 8,
    borderRadius: THEME.borderRadius.full,
  },
  activeBtn: {
    backgroundColor: THEME.colors.accentDim,
  },
});
