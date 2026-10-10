import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
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
import { useTheme } from '../../store/useThemeStore';
import { ColorExtractionService } from '../../services/ColorExtractionService';
import { AddToPlaylistModal } from '../AddToPlaylistModal';
import { useLibraryStore } from '../../store/useLibraryStore';
import { AmbientAtmosphere } from '../AmbientAtmosphere';

interface PlayerModalProps {
  onDismiss: () => void;
}

export const PlayerModal: React.FC<PlayerModalProps> = ({ onDismiss }) => {
  const [isQueueOpen, setIsQueueOpen] = useState(false);
  const [isAddToPlaylistOpen, setIsAddToPlaylistOpen] = useState(false);
  const { isLiked, toggleLike } = useLibraryStore();
  const { theme, themeId, isDark, adaptiveLightingEnabled, artworkAura, setArtworkAura } = useTheme();

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

  useEffect(() => {
    if (currentTrack && adaptiveLightingEnabled) {
      ColorExtractionService.extractAura(
        currentTrack.artwork,
        currentTrack.id || currentTrack.title
      ).then((aura) => {
        setArtworkAura(aura);
      });
    }
  }, [currentTrack?.id, currentTrack?.artwork, adaptiveLightingEnabled]);

  if (!currentTrack) {
    return null;
  }

  const liked = isLiked(currentTrack.id);

  const handleToggleMode = () => {
    if (playbackMode === 'normal') setPlaybackMode('repeat-all');
    else if (playbackMode === 'repeat-all') setPlaybackMode('repeat-one');
    else setPlaybackMode('normal');
  };

  const getHeaderGlassStyle = () => {
    if (themeId === 'luminous') {
      return {
        backgroundColor: 'rgba(255, 255, 255, 0.45)',
        borderBottomColor: 'rgba(255, 255, 255, 0.65)',
        borderBottomWidth: 1,
      };
    }
    return {
      backgroundColor: 'transparent',
      borderBottomColor: theme.colors.border,
      borderBottomWidth: 1,
    };
  };

  return (
    <View style={[styles.outerContainer, { backgroundColor: theme.colors.background }]}>
      {/* Full-Screen Organic Ambient Atmosphere */}
      <AmbientAtmosphere intensityMultiplier={1.1} />

      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        {/* Header Bar */}
        <View style={[styles.header, getHeaderGlassStyle()]}>
          <TouchableOpacity
            onPress={onDismiss}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            style={styles.headerBtn}
          >
            <Ionicons name="chevron-down" size={26} color={theme.colors.text} />
          </TouchableOpacity>

          <View style={styles.headerTitleContainer}>
            <Text
              style={[
                styles.headerSubtitle,
                { color: theme.colors.accent, fontFamily: theme.typography.mono },
              ]}
            >
              PLAYING TRANSMISSION
            </Text>
            <Text numberOfLines={1} style={[styles.headerTitle, { color: theme.colors.textMuted }]}>
              {currentTrack.title}
            </Text>
          </View>

          <TouchableOpacity
            onPress={() => setIsQueueOpen(!isQueueOpen)}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            style={[
              styles.headerBtn,
              themeId === 'luminous' && styles.glassQueueBtn,
            ]}
          >
            <Ionicons
              name={isQueueOpen ? 'disc-outline' : 'list'}
              size={22}
              color={isQueueOpen ? theme.colors.accent : theme.colors.text}
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
              isLiked={liked}
              onPlayPause={togglePlayPause}
              onNext={skipNext}
              onPrev={skipPrev}
              onToggleMode={handleToggleMode}
              onToggleLike={() => toggleLike(currentTrack)}
            />

            <ActionBar
              track={currentTrack}
              onAddToPlaylist={() => setIsAddToPlaylistOpen(true)}
            />
          </View>
        )}

        <AddToPlaylistModal
          visible={isAddToPlaylistOpen}
          track={currentTrack}
          onClose={() => setIsAddToPlaylistOpen(false)}
        />
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  outerContainer: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  headerBtn: {
    padding: 8,
    borderRadius: 8,
  },
  glassQueueBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.45)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.70)',
  },
  headerTitleContainer: {
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 8,
  },
  headerSubtitle: {
    fontSize: 10,
    letterSpacing: 1.5,
  },
  headerTitle: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2,
  },
  playerBody: {
    flex: 1,
    justifyContent: 'space-between',
    paddingBottom: 12,
  },
  queueContainer: {
    flex: 1,
  },
});
