import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Playlist } from '../types';
import { useTheme } from '../store/useThemeStore';

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
  const { theme } = useTheme();

  return (
    <TouchableOpacity
      style={[
        styles.card,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.border,
        },
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.iconContainer, { backgroundColor: theme.colors.surfaceSubtle }]}>
        <Ionicons name="list" size={24} color={theme.colors.accent} />
      </View>
      <View style={styles.info}>
        <Text numberOfLines={1} style={[styles.name, { color: theme.colors.text }]}>
          {playlist.name}
        </Text>
        <Text
          style={[
            styles.count,
            { color: theme.colors.textMuted, fontFamily: theme.typography.mono },
          ]}
        >
          {playlist.tracks.length} {playlist.tracks.length === 1 ? 'track' : 'tracks'}
        </Text>
      </View>
      {onDelete && (
        <TouchableOpacity
          onPress={onDelete}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={styles.deleteBtn}
        >
          <Ionicons name="trash-outline" size={18} color={theme.colors.textDim} />
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    flex: 1,
    marginLeft: 12,
  },
  name: {
    fontSize: 14,
    fontWeight: '600',
  },
  count: {
    fontSize: 11,
    marginTop: 2,
  },
  deleteBtn: {
    padding: 6,
  },
});
