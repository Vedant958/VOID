import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQueueStore } from '../store/useQueueStore';
import { usePlayback } from '../hooks/usePlayback';
import { TrackRow } from './TrackRow';
import { THEME } from '../constants/theme';

export const QueueList: React.FC = () => {
  const { queue, currentIndex, removeFromQueue, clearQueue } = useQueueStore();
  const { playTrack, isPlaying } = usePlayback();

  if (queue.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="musical-notes-outline" size={48} color={THEME.colors.textDim} />
        <Text style={styles.emptyTitle}>QUEUE IS EMPTY</Text>
        <Text style={styles.emptySubtitle}>Play tracks to build your listening session</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>UP NEXT ({queue.length})</Text>
        <TouchableOpacity onPress={clearQueue} style={styles.clearButton}>
          <Text style={styles.clearText}>CLEAR</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={queue}
        keyExtractor={(item, index) => `${item.id}-${index}`}
        contentContainerStyle={styles.listContent}
        renderItem={({ item, index }) => {
          const isActive = index === currentIndex;
          return (
            <View style={styles.rowWrapper}>
              <View style={styles.trackWrapper}>
                <TrackRow
                  track={item}
                  isActive={isActive}
                  isPlaying={isActive && isPlaying}
                  showIndex={index + 1}
                  onPress={() => playTrack(item, queue, index)}
                />
              </View>
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => removeFromQueue(index)}
              >
                <Ionicons name="close" size={16} color={THEME.colors.textDim} />
              </TouchableOpacity>
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
    backgroundColor: THEME.colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: THEME.spacing.md,
    paddingVertical: THEME.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.border,
  },
  headerTitle: {
    fontFamily: THEME.typography.mono,
    fontSize: THEME.typography.sizes.xs,
    color: THEME.colors.accent,
    letterSpacing: 1.5,
  },
  clearButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  clearText: {
    fontFamily: THEME.typography.mono,
    fontSize: THEME.typography.sizes.xs,
    color: THEME.colors.textMuted,
  },
  listContent: {
    paddingVertical: THEME.spacing.sm,
  },
  rowWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: THEME.spacing.sm,
  },
  trackWrapper: {
    flex: 1,
  },
  deleteButton: {
    padding: 8,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: THEME.spacing.xl,
  },
  emptyTitle: {
    fontFamily: THEME.typography.mono,
    fontSize: THEME.typography.sizes.sm,
    color: THEME.colors.textMuted,
    marginTop: THEME.spacing.md,
    letterSpacing: 2,
  },
  emptySubtitle: {
    fontSize: THEME.typography.sizes.xs,
    color: THEME.colors.textDim,
    marginTop: 4,
  },
});
