import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQueueStore } from '../store/useQueueStore';
import { usePlayback } from '../hooks/usePlayback';
import { TrackRow } from './TrackRow';
import { useTheme } from '../store/useThemeStore';

export const QueueList: React.FC = () => {
  const { queue, currentIndex, reorderQueue, playNext } = useQueueStore();
  const { playTrack, isPlaying, removeTrackFromQueue, clearPlaybackQueue } = usePlayback();
  const { theme } = useTheme();

  const handleClearQueue = () => {
    Alert.alert(
      'PURGE QUEUE',
      'Are you sure you want to clear all tracks from the current transmission queue?',
      [
        { text: 'CANCEL', style: 'cancel' },
        {
          text: 'CLEAR ALL',
          style: 'destructive',
          onPress: () => {
            clearPlaybackQueue();
          },
        },
      ]
    );
  };

  const handleMoveUp = (index: number) => {
    if (index > 0) {
      reorderQueue(index, index - 1);
    }
  };

  const handleMoveDown = (index: number) => {
    if (index < queue.length - 1) {
      reorderQueue(index, index + 1);
    }
  };

  const handlePlayNext = (index: number) => {
    if (index <= currentIndex + 1) return;
    reorderQueue(index, currentIndex + 1);
  };

  if (queue.length === 0) {
    return (
      <View style={[styles.emptyContainer, { backgroundColor: theme.colors.background }]}>
        <Ionicons name="musical-notes-outline" size={54} color={theme.colors.textDim} />
        <Text style={[styles.emptyTitle, { color: theme.colors.textMuted, fontFamily: theme.typography.mono }]}>
          TRANSMISSION QUEUE EMPTY
        </Text>
        <Text style={[styles.emptySubtitle, { color: theme.colors.textDim }]}>
          Select signals from Discover or Search to construct your session queue
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Queue Header */}
      <View
        style={[
          styles.header,
          {
            backgroundColor: theme.colors.surface,
            borderBottomColor: theme.colors.border,
          },
        ]}
      >
        <View>
          <Text style={[styles.headerSubtitle, { color: theme.colors.textDim, fontFamily: theme.typography.mono }]}>
            SESSION MONITOR // ACTIVE
          </Text>
          <Text style={[styles.headerTitle, { color: theme.colors.accent, fontFamily: theme.typography.mono }]}>
            QUEUE MANAGER ({queue.length} {queue.length === 1 ? 'SIGNAL' : 'SIGNALS'})
          </Text>
        </View>
        <TouchableOpacity
          onPress={handleClearQueue}
          style={[styles.clearButton, { borderColor: theme.colors.border }]}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="trash-outline" size={14} color={theme.colors.danger} />
          <Text style={[styles.clearText, { color: theme.colors.danger, fontFamily: theme.typography.mono }]}>
            CLEAR
          </Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={queue}
        keyExtractor={(item, index) => item.queueItemId || `${item.id}-${index}`}
        contentContainerStyle={styles.listContent}
        renderItem={({ item, index }) => {
          const isActive = index === currentIndex;

          return (
            <View
              style={[
                styles.rowContainer,
                { borderBottomColor: theme.colors.border },
                isActive && {
                  backgroundColor: theme.colors.surfaceSubtle,
                  borderLeftWidth: 3,
                  borderLeftColor: theme.colors.accent,
                },
              ]}
            >
              {/* Main Track Row */}
              <View style={styles.trackWrapper}>
                <TrackRow
                  track={item}
                  isActive={isActive}
                  isPlaying={isActive && isPlaying}
                  showIndex={index + 1}
                  onPress={() => playTrack(item, queue, index)}
                />
              </View>

              {/* Queue Action Controls */}
              <View style={styles.controlsCol}>
                {/* Reorder Buttons */}
                <View style={styles.reorderRow}>
                  <TouchableOpacity
                    style={[styles.miniBtn, index === 0 && styles.btnDisabled]}
                    onPress={() => handleMoveUp(index)}
                    disabled={index === 0}
                    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                  >
                    <Ionicons
                      name="chevron-up"
                      size={14}
                      color={index === 0 ? theme.colors.surfaceSubtle : theme.colors.textDim}
                    />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.miniBtn, index === queue.length - 1 && styles.btnDisabled]}
                    onPress={() => handleMoveDown(index)}
                    disabled={index === queue.length - 1}
                    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                  >
                    <Ionicons
                      name="chevron-down"
                      size={14}
                      color={
                        index === queue.length - 1
                          ? theme.colors.surfaceSubtle
                          : theme.colors.textDim
                      }
                    />
                  </TouchableOpacity>
                </View>

                {/* Quick Play Next Shortcut (if after currentIndex + 1) */}
                {index > currentIndex + 1 && (
                  <TouchableOpacity
                    style={styles.playNextBtn}
                    onPress={() => handlePlayNext(index)}
                    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                  >
                    <Ionicons name="arrow-up-circle-outline" size={16} color={theme.colors.accent} />
                  </TouchableOpacity>
                )}

                {/* Remove Track Button */}
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => removeTrackFromQueue(index)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name="close" size={16} color={theme.colors.textDim} />
                </TouchableOpacity>
              </View>
            </View>
          );
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerSubtitle: {
    fontSize: 9,
    letterSpacing: 1.5,
  },
  headerTitle: {
    fontSize: 12,
    letterSpacing: 1.5,
    marginTop: 2,
    fontWeight: '700',
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
    borderWidth: 1,
  },
  clearText: {
    fontSize: 10,
    letterSpacing: 1,
  },
  listContent: {
    paddingVertical: 4,
  },
  rowContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    paddingRight: 8,
  },
  trackWrapper: {
    flex: 1,
  },
  controlsCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  reorderRow: {
    flexDirection: 'column',
    alignItems: 'center',
  },
  miniBtn: {
    padding: 3,
  },
  btnDisabled: {
    opacity: 0.3,
  },
  playNextBtn: {
    padding: 6,
  },
  deleteButton: {
    padding: 6,
    marginLeft: 2,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  emptyTitle: {
    fontSize: 14,
    marginTop: 16,
    letterSpacing: 2,
    fontWeight: '700',
  },
  emptySubtitle: {
    fontSize: 11,
    marginTop: 6,
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 280,
  },
});
