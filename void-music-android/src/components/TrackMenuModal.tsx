import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Track } from '../types';
import { useTheme } from '../store/useThemeStore';
import { usePlayback } from '../hooks/usePlayback';
import { useLibraryStore } from '../store/useLibraryStore';

interface TrackMenuModalProps {
  visible: boolean;
  track: Track | null;
  onClose: () => void;
  onOpenAddToPlaylist: (track: Track) => void;
}

export const TrackMenuModal: React.FC<TrackMenuModalProps> = ({
  visible,
  track,
  onClose,
  onOpenAddToPlaylist,
}) => {
  const { theme } = useTheme();
  const { playTrack, playNext, addToQueue } = usePlayback();
  const { isLiked, toggleLike } = useLibraryStore();

  if (!track) return null;

  const liked = isLiked(track.id);

  const handlePlayNow = () => {
    onClose();
    playTrack(track);
  };

  const handlePlayNext = () => {
    onClose();
    playNext(track);
  };

  const handleAddToQueue = () => {
    onClose();
    addToQueue(track);
  };

  const handleToggleLike = () => {
    toggleLike(track);
  };

  const handleAddToPlaylist = () => {
    onClose();
    onOpenAddToPlaylist(track);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <TouchableOpacity
          style={[
            styles.sheet,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
            },
          ]}
          activeOpacity={1}
          onPress={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
            <View style={styles.headerTextContainer}>
              <Text style={[styles.subtitle, { color: theme.colors.accent, fontFamily: theme.typography.mono }]}>
                SIGNAL OPTIONS
              </Text>
              <Text numberOfLines={1} style={[styles.title, { color: theme.colors.text }]}>
                {track.title}
              </Text>
              <Text numberOfLines={1} style={[styles.artist, { color: theme.colors.textMuted }]}>
                {track.artist}
              </Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Ionicons name="close" size={22} color={theme.colors.textDim} />
            </TouchableOpacity>
          </View>

          {/* Menu Options */}
          <View style={styles.menuItems}>
            <TouchableOpacity style={styles.menuRow} onPress={handlePlayNow}>
              <Ionicons name="play-circle-outline" size={22} color={theme.colors.accent} />
              <Text style={[styles.menuText, { color: theme.colors.text, fontFamily: theme.typography.mono }]}>
                PLAY NOW
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuRow} onPress={handlePlayNext}>
              <Ionicons name="arrow-forward-circle-outline" size={22} color={theme.colors.text} />
              <Text style={[styles.menuText, { color: theme.colors.text, fontFamily: theme.typography.mono }]}>
                PLAY NEXT
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuRow} onPress={handleAddToQueue}>
              <Ionicons name="add-circle-outline" size={22} color={theme.colors.text} />
              <Text style={[styles.menuText, { color: theme.colors.text, fontFamily: theme.typography.mono }]}>
                ADD TO QUEUE
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuRow} onPress={handleAddToPlaylist}>
              <Ionicons name="bookmark-outline" size={22} color={theme.colors.text} />
              <Text style={[styles.menuText, { color: theme.colors.text, fontFamily: theme.typography.mono }]}>
                ADD TO PLAYLIST
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuRow} onPress={handleToggleLike}>
              <Ionicons
                name={liked ? 'heart' : 'heart-outline'}
                size={22}
                color={liked ? theme.colors.accent : theme.colors.textDim}
              />
              <Text
                style={[
                  styles.menuText,
                  { color: liked ? theme.colors.accent : theme.colors.text, fontFamily: theme.typography.mono },
                ]}
              >
                {liked ? 'REMOVE FROM FAVORITES' : 'ADD TO FAVORITES'}
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 8,
    borderBottomWidth: 1,
    marginBottom: 8,
  },
  headerTextContainer: {
    flex: 1,
    marginRight: 12,
  },
  subtitle: {
    fontSize: 9,
    letterSpacing: 1.5,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    marginTop: 2,
  },
  artist: {
    fontSize: 11,
  },
  menuItems: {
    paddingTop: 4,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  menuText: {
    fontSize: 11,
    fontWeight: '700',
    marginLeft: 14,
    letterSpacing: 1.5,
  },
});
