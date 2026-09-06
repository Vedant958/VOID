import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Playlist } from '../types';
import { THEME } from '../constants/theme';

interface PlaylistCardProps {
  playlist: Playlist;
  onPress: () => void;
  onDelete?: () => void;
}

export const PlaylistCard: React.FC<PlaylistCardProps> = ({
  playlist,
  onPress,
  onDelete,
}) => {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.iconContainer}>
        <Ionicons name="list" size={24} color={THEME.colors.accent} />
      </View>
      <View style={styles.info}>
        <Text numberOfLines={1} style={styles.name}>
          {playlist.name}
        </Text>
        <Text style={styles.count}>
          {playlist.tracks.length} {playlist.tracks.length === 1 ? 'track' : 'tracks'}
        </Text>
      </View>
      {onDelete && (
        <TouchableOpacity
          onPress={onDelete}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={styles.deleteBtn}
        >
          <Ionicons name="trash-outline" size={18} color={THEME.colors.textDim} />
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.surface,
    padding: THEME.spacing.md,
    borderRadius: THEME.borderRadius.md,
    marginBottom: THEME.spacing.sm,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: THEME.borderRadius.sm,
    backgroundColor: THEME.colors.surfaceSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    flex: 1,
    marginLeft: THEME.spacing.md,
  },
  name: {
    fontSize: THEME.typography.sizes.sm + 1,
    fontWeight: '600',
    color: THEME.colors.text,
  },
  count: {
    fontFamily: THEME.typography.mono,
    fontSize: THEME.typography.sizes.xs,
    color: THEME.colors.textMuted,
    marginTop: 2,
  },
  deleteBtn: {
    padding: 6,
  },
});
