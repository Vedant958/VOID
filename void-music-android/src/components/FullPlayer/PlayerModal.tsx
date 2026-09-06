import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { usePlayback } from '../../hooks/usePlayback';
import { useProgress } from '../../hooks/useProgress';
import { ArtworkDisplay } from './ArtworkDisplay';
import { TrackInfo } from './TrackInfo';
import { ProgressBar } from './ProgressBar';
import { PlayerControls } from './PlayerControls';
import { ActionBar } from './ActionBar';
import { QueueList } from '../QueueList';
import { THEME } from '../../constants/theme';

interface PlayerModalProps {
  onDismiss: () => void;
}

export const PlayerModal: React.FC<PlayerModalProps> = ({ onDismiss }) => {
  const [isQueueOpen, setIsQueueOpen] = useState(false);
  const {
    currentTrack,
    isPlaying,
    isBuffering,
    playbackMode,
    togglePlayPause,
    skipNext,
    skipPrev,
    seekTo,
    setPlaybackMode,
  } = usePlayback();

  const { position, duration } = useProgress();

  if (!currentTrack) {
    return null;
  }

  const handleToggleMode = () => {
    if (playbackMode === 'normal') setPlaybackMode('repeat-all');
    else if (playbackMode === 'repeat-all') setPlaybackMode('repeat-one');
    else setPlaybackMode('normal');
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={onDismiss}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          style={styles.headerBtn}
        >
          <Ionicons name="chevron-down" size={26} color={THEME.colors.text} />
        </TouchableOpacity>

        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerSubtitle}>PLAYING TRANSMISSION</Text>
          <Text numberOfLines={1} style={styles.headerTitle}>
            {currentTrack.title}
          </Text>
        </View>

        <TouchableOpacity
          onPress={() => setIsQueueOpen(!isQueueOpen)}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          style={styles.headerBtn}
        >
          <Ionicons
            name={isQueueOpen ? 'disc-outline' : 'list'}
            size={22}
            color={isQueueOpen ? THEME.colors.accent : THEME.colors.text}
          />
        </TouchableOpacity>
      </View>

      {isQueueOpen ? (
        <View style={styles.queueContainer}>
          <QueueList />
        </View>
      ) : (
        <View style={styles.playerBody}>
          <ArtworkDisplay
            artworkUrl={currentTrack.artwork}
            isBuffering={isBuffering}
          />

          <TrackInfo track={currentTrack} />

          <ProgressBar
            position={position}
            duration={duration}
            onSeek={seekTo}
          />

          <PlayerControls
            isPlaying={isPlaying}
            isBuffering={isBuffering}
            playbackMode={playbackMode}
            onPlayPause={togglePlayPause}
            onNext={skipNext}
            onPrev={skipPrev}
            onToggleMode={handleToggleMode}
          />

          <ActionBar
            track={currentTrack}
            isQueueOpen={isQueueOpen}
            onToggleQueue={() => setIsQueueOpen(!isQueueOpen)}
          />
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: THEME.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: THEME.spacing.md,
    paddingVertical: THEME.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.border,
  },
  headerBtn: {
    padding: 8,
  },
  headerTitleContainer: {
    alignItems: 'center',
    flex: 1,
    marginHorizontal: THEME.spacing.sm,
  },
  headerSubtitle: {
    fontFamily: THEME.typography.mono,
    fontSize: 10,
    color: THEME.colors.accent,
    letterSpacing: 1.5,
  },
  headerTitle: {
    fontSize: THEME.typography.sizes.xs,
    color: THEME.colors.textMuted,
    fontWeight: '500',
    marginTop: 2,
  },
  playerBody: {
    flex: 1,
    justifyContent: 'space-between',
    paddingBottom: THEME.spacing.md,
  },
  queueContainer: {
    flex: 1,
  },
});
