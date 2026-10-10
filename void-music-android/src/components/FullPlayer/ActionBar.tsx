import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Track } from '../../types';
import { useTheme } from '../../store/useThemeStore';

interface ActionBarProps {
  track: Track;
  onAddToPlaylist: () => void;
}

export const ActionBar: React.FC<ActionBarProps> = ({
  track,
  onAddToPlaylist,
}) => {
  const { theme, themeId } = useTheme();

  return (
    <View style={[styles.container, { borderTopColor: theme.colors.border }]}>
      <TouchableOpacity
        style={[
          styles.playlistBtn,
          {
            backgroundColor: theme.colors.surfaceSubtle,
            borderColor: theme.colors.border,
          },
          themeId === 'luminous' && styles.glassPlaylistBtn,
        ]}
        onPress={onAddToPlaylist}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        activeOpacity={0.7}
      >
        <Ionicons name="bookmark-outline" size={16} color={theme.colors.accent} />
        <Text
          style={[
            styles.btnText,
            { color: theme.colors.textMuted, fontFamily: theme.typography.mono },
          ]}
        >
          SAVE TO PLAYLIST
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 8,
    borderTopWidth: 1,
  },
  playlistBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 9999,
  },
  glassPlaylistBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.60)',
    borderColor: 'rgba(255, 255, 255, 0.88)',
    shadowColor: 'rgba(15, 23, 42, 0.08)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 2,
  },
  btnText: {
    fontSize: 10,
    fontWeight: '700',
    marginLeft: 6,
    letterSpacing: 1.5,
  },
});
