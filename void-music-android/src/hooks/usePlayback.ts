import { useCallback, useEffect } from 'react';
import { ToastAndroid, Platform } from 'react-native';
import TrackPlayer, { Event, State, usePlaybackState } from 'react-native-track-player';
import * as Haptics from 'expo-haptics';
import { Track } from '../types';
import { usePlayerStore } from '../store/usePlayerStore';
import { useQueueStore } from '../store/useQueueStore';
import { useLibraryStore } from '../store/useLibraryStore';
import { StreamResolver } from '../services/StreamResolver';
import { ArtworkService } from '../services/ArtworkService';
import { playTrackOnPlayer } from '../services/TrackPlayerService';
import { RecommendService } from '../services/RecommendService';
import { normalizeTrack, findTrackInQueue, deduplicateAgainstQueue } from '../utils/trackUtils';

export { findTrackInQueue, deduplicateAgainstQueue };

let _radioSessionToken = 0;
let isTransitioning = false;
let isQueueEndedListenerRegistered = false;
let lastEndedTrackId: string | null = null;
let lastEndedTimestamp = 0;
let lastPlaybackStartTime = 0;

let lastToastMessage = '';
let lastToastTimestamp = 0;

/**
 * Displays a brief, non-blocking toast message (debounced to avoid spamming).
 */
export function showNonBlockingToast(message: string) {
  const now = Date.now();
  if (message === lastToastMessage && now - lastToastTimestamp < 2200) {
    return;
  }
  lastToastMessage = message;
  lastToastTimestamp = now;

  if (Platform.OS === 'android') {
    try {
      ToastAndroid.show(message, ToastAndroid.SHORT);
    } catch {}
  }
  console.log(`[Toast] ${message}`);
}

/**
 * Attempts to resolve and play a track via JioSaavn full-track stream.
 * If genuinely unavailable, displays "Song not available yet" and auto-advances.
 * If temporary network error, halts gracefully without skipping through the queue.
 * Guarded against infinite skip loops when all queue tracks are unavailable.
 */
export async function playTrackWithAutoAdvance(
  track: Track,
  targetIndex: number,
  visitedTrackIds: Set<string> = new Set()
): Promise<boolean> {
  const currentQ = useQueueStore.getState().queue;
  const playerStore = usePlayerStore.getState();
  const libraryStore = useLibraryStore.getState();
  const queueStore = useQueueStore.getState();

  // Loop guard: Stop if track was already visited in this chain or all tracks checked
  if (visitedTrackIds.has(track.id) || visitedTrackIds.size >= currentQ.length) {
    console.log('[playTrackWithAutoAdvance] Loop guard triggered: all candidate tracks in queue attempted.');
    playerStore.setIsBuffering(false);
    playerStore.setIsPlaying(false);
    showNonBlockingToast('No playable tracks available in queue');
    return false;
  }

  visitedTrackIds.add(track.id);

  try {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  } catch {}

  playerStore.setIsBuffering(true);
  playerStore.setError(null);
  playerStore.setCurrentTrack(track);

  // 1. Resolve JioSaavn full-track stream
  const [resolution, hdArt] = await Promise.all([
    StreamResolver.resolve(track),
    ArtworkService.getHDArtwork(track),
  ]);

  // ── Case A: Success -> Play verified full track ──
  if (resolution.status === 'success') {
    console.log('[playTrackWithAutoAdvance] Direct JioSaavn stream resolved:', {
      title: track.title,
      duration: resolution.source.duration,
      streamUrl: resolution.source.streamUrl.substring(0, 60) + '...',
    });

    const enrichedTrack: Track = {
      ...track,
      artwork: hdArt || track.artwork,
      playbackSourceType: 'direct',
      streamUrl: resolution.source.streamUrl,
      isPreview: false,
      duration: resolution.source.duration || track.duration,
      bitrate: resolution.source.bitrate,
    };

    playerStore.setCurrentTrack(enrichedTrack);
    playerStore.setIsPreview(false);

    await playTrackOnPlayer(enrichedTrack, resolution.source.streamUrl);
    lastPlaybackStartTime = Date.now();
    playerStore.setIsPlaying(true);
    playerStore.setIsBuffering(false);
    libraryStore.addToHistory(enrichedTrack);
    return true;
  }

  // ── Case B: Network Error -> Halt gracefully without skipping ──
  if (resolution.status === 'network_error') {
    console.warn(`[playTrackWithAutoAdvance] Network error resolving "${track.title}": ${resolution.error}`);
    playerStore.setIsBuffering(false);
    playerStore.setIsPlaying(false);
    playerStore.setError('Network error: Unable to connect to music servers');
    showNonBlockingToast('Network error: Check your connection');
    return false;
  }

  // ── Case C: Genuine Unavailability -> "Song not available yet" & Auto-Advance ──
  console.log(`[playTrackWithAutoAdvance] Song not available yet on JioSaavn: "${track.title}" (${resolution.reason})`);
  showNonBlockingToast('Song not available yet');

  const latestQ = queueStore.queue;
  const mode = playerStore.playbackMode;

  // Advance to next queue track (keeping the unavailable track in queue for later)
  if (targetIndex + 1 < latestQ.length) {
    const nextIdx = targetIndex + 1;
    const nextTrack = latestQ[nextIdx];
    queueStore.setCurrentIndex(nextIdx);
    console.log(
      `[playTrackWithAutoAdvance] Advancing past unavailable track to: "${nextTrack.title}" (pos ${nextIdx + 1}/${latestQ.length})`
    );
    return await playTrackWithAutoAdvance(nextTrack, nextIdx, visitedTrackIds);
  } else if (latestQ.length > 0) {
    // End of queue reached
    if (mode === 'repeat-all') {
      const nextIdx = 0;
      const nextTrack = latestQ[0];
      if (visitedTrackIds.has(nextTrack.id) || visitedTrackIds.size >= latestQ.length) {
        playerStore.setIsBuffering(false);
        playerStore.setIsPlaying(false);
        showNonBlockingToast('No playable tracks available in queue');
        return false;
      }
      queueStore.setCurrentIndex(0);
      console.log(`[playTrackWithAutoAdvance] Repeat-all: wrapping to pos 1 ("${nextTrack.title}")`);
      return await playTrackWithAutoAdvance(nextTrack, 0, visitedTrackIds);
    } else {
      // Try extending queue with recommendations
      console.log('[playTrackWithAutoAdvance] Reached end of queue. Attempting recommendations extension...');
      try {
        const fresh = await RecommendService.getSimilarTracks(track);
        const uniqueNew = deduplicateAgainstQueue(fresh, latestQ);
        if (uniqueNew.length > 0) {
          queueStore.addTracksToQueue(uniqueNew);
          const updatedQ = useQueueStore.getState().queue;
          const nextIdx = targetIndex + 1;
          if (nextIdx < updatedQ.length) {
            queueStore.setCurrentIndex(nextIdx);
            return await playTrackWithAutoAdvance(updatedQ[nextIdx], nextIdx, visitedTrackIds);
          }
        }
      } catch (err) {
        console.log('[playTrackWithAutoAdvance] Recommendations extension failed:', err);
      }

      playerStore.setIsBuffering(false);
      playerStore.setIsPlaying(false);
      showNonBlockingToast('No playable tracks available in queue');
      return false;
    }
  }

  playerStore.setIsBuffering(false);
  playerStore.setIsPlaying(false);
  return false;
}

/**
 * Legacy entry point: delegates to playTrackWithAutoAdvance.
 */
export async function playTrackAudio(track: Track): Promise<boolean> {
  const currentIdx = useQueueStore.getState().currentIndex;
  return await playTrackWithAutoAdvance(track, currentIdx, new Set());
}

/**
 * Appends recommendations to the END of the queue without replacing existing tracks.
 */
export async function extendQueueWithRecommendations(seedTrack: Track, playNextOnAppend = false) {
  try {
    console.log(`[extendQueueWithRecommendations] Fetching recommendations to extend queue from "${seedTrack.title}"`);
    const fresh = await RecommendService.getSimilarTracks(seedTrack);
    const queueStore = useQueueStore.getState();
    const currentQ = queueStore.queue;
    const currentIdx = queueStore.currentIndex;
    const uniqueNew = deduplicateAgainstQueue(fresh, currentQ);

    if (uniqueNew.length > 0) {
      queueStore.addTracksToQueue(uniqueNew);
      console.log(`[extendQueueWithRecommendations] Appended ${uniqueNew.length} recommendations to the END of queue.`);

      if (playNextOnAppend) {
        const nextIdx = currentIdx + 1;
        const updatedQ = useQueueStore.getState().queue;
        if (nextIdx < updatedQ.length) {
          queueStore.setCurrentIndex(nextIdx);
          await playTrackWithAutoAdvance(updatedQ[nextIdx], nextIdx, new Set());
        }
      }
    }
  } catch (err) {
    console.log('[extendQueueWithRecommendations] Extend queue skipped:', err);
  }
}

/**
 * Centrally manages queue advancement with concurrency guard, repeat-mode support,
 * and automatic progression past unavailable tracks.
 */
export async function advanceToNextTrack(reason: 'natural_end' | 'user_skip' | 'remote_next') {
  if (isTransitioning) {
    console.log(`[PlaybackTransition] Skipped advance request (${reason}): another transition is currently in progress.`);
    return;
  }

  const currentQ = useQueueStore.getState().queue;
  const currentIdx = useQueueStore.getState().currentIndex;
  const mode = usePlayerStore.getState().playbackMode;
  const currentTrack = currentQ[currentIdx];

  // Debounce trailing / duplicate EOF events
  if (reason === 'natural_end') {
    if (currentTrack && currentTrack.id === lastEndedTrackId && Date.now() - lastEndedTimestamp < 2000) {
      console.log(`[PlaybackTransition] Debounced duplicate track-end event for "${currentTrack.title}".`);
      return;
    }
    if (Date.now() - lastPlaybackStartTime < 2000) {
      console.log(`[PlaybackTransition] Debounced spurious EOF event received immediately after track start (${Date.now() - lastPlaybackStartTime}ms).`);
      return;
    }
  }

  isTransitioning = true;
  if (reason === 'natural_end' && currentTrack) {
    lastEndedTrackId = currentTrack.id;
    lastEndedTimestamp = Date.now();
  }

  try {
    // 1. Repeat One: replay the same track on natural finish (if available)
    if (reason === 'natural_end' && mode === 'repeat-one') {
      console.log(`[PlaybackTransition] Repeating current track: "${currentTrack?.title}" (pos ${currentIdx + 1}/${currentQ.length}). Reason: ${reason}`);
      if (currentTrack) {
        await playTrackWithAutoAdvance(currentTrack, currentIdx, new Set());
      }
      return;
    }

    // 2. Linear next track in queue
    if (currentIdx + 1 < currentQ.length) {
      const nextIndex = currentIdx + 1;
      const nextTrack = currentQ[nextIndex];
      console.log(
        `[PlaybackTransition] Advancing to next track: "${nextTrack?.title}" (pos ${nextIndex + 1}/${currentQ.length}). Previous: "${currentTrack?.title}" (pos ${currentIdx + 1}). Reason: ${reason}`
      );
      useQueueStore.getState().setCurrentIndex(nextIndex);
      const success = await playTrackWithAutoAdvance(nextTrack, nextIndex, new Set());

      if (success && nextIndex >= currentQ.length - 2) {
        extendQueueWithRecommendations(nextTrack, false);
      }
    } else if (currentQ.length > 0) {
      // 3. End of queue reached
      if (mode === 'repeat-all') {
        console.log(`[PlaybackTransition] Reached end of queue with repeat-all. Looping to start (pos 1). Reason: ${reason}`);
        useQueueStore.getState().setCurrentIndex(0);
        await playTrackWithAutoAdvance(currentQ[0], 0, new Set());
      } else {
        console.log(`[PlaybackTransition] Reached end of queue. Extending with recommendations. Reason: ${reason}`);
        const lastTrack = currentQ[currentQ.length - 1];
        await extendQueueWithRecommendations(lastTrack, true);
      }
    }
  } finally {
    isTransitioning = false;
  }
}

/**
 * Centrally manages queue retreat with concurrency guard.
 */
export async function retreatToPreviousTrack(reason: 'user_prev' | 'remote_prev') {
  if (isTransitioning) {
    console.log(`[PlaybackTransition] Skipped retreat request (${reason}): another transition is currently in progress.`);
    return;
  }
  isTransitioning = true;

  try {
    const currentQ = useQueueStore.getState().queue;
    const currentIdx = useQueueStore.getState().currentIndex;

    if (currentIdx - 1 >= 0) {
      const prevIndex = currentIdx - 1;
      const prevTrack = currentQ[prevIndex];
      console.log(`[PlaybackTransition] Retreating to previous track: "${prevTrack?.title}" (pos ${prevIndex + 1}/${currentQ.length}). Reason: ${reason}`);
      useQueueStore.getState().setCurrentIndex(prevIndex);
      await playTrackWithAutoAdvance(prevTrack, prevIndex, new Set());
    } else if (currentQ.length > 0) {
      console.log(`[PlaybackTransition] At first track of queue. Seeking to start. Reason: ${reason}`);
      await TrackPlayer.seekTo(0);
    }
  } finally {
    isTransitioning = false;
  }
}

/**
 * Global singleton listener registration for natural track completion.
 */
export function setupPlaybackEndedListener() {
  if (isQueueEndedListenerRegistered) return;
  isQueueEndedListenerRegistered = true;
  TrackPlayer.addEventListener(Event.PlaybackQueueEnded, () => {
    console.log('[usePlayback] PlaybackQueueEnded event fired. Transitioning to next track...');
    advanceToNextTrack('natural_end');
  });
}

export function usePlayback() {
  const playbackState = usePlaybackState();
  const {
    currentTrack,
    playbackMode,
    setPlaybackMode,
  } = usePlayerStore();

  const {
    setQueue,
    setCurrentIndex,
  } = useQueueStore();

  useEffect(() => {
    setupPlaybackEndedListener();
  }, []);

  const playTrack = useCallback(
    async (track: Track, explicitQueue?: Track[], startIndex?: number) => {
      isTransitioning = false;
      const normalizedTrack = normalizeTrack(track);

      // Case 1: Explicit playlist queue (e.g., custom playlist from Library)
      if (explicitQueue && explicitQueue.length > 0) {
        const normalizedQueue = explicitQueue.map((t) => normalizeTrack(t));
        const index = startIndex !== undefined ? startIndex : normalizedQueue.findIndex((t) => t.id === normalizedTrack.id);
        const safeIdx = Math.max(0, index >= 0 ? index : 0);
        setQueue(normalizedQueue, safeIdx);
        await playTrackWithAutoAdvance(normalizedQueue[safeIdx], safeIdx, new Set());
        return;
      }

      // Case 2: Check if track is already in the active queue
      const currentQueue = useQueueStore.getState().queue;
      const existingIndex = findTrackInQueue(normalizedTrack, currentQueue);

      if (existingIndex >= 0) {
        console.log(`[usePlayback] Track already in queue at index ${existingIndex}. Playing without regenerating.`);
        setCurrentIndex(existingIndex);
        await playTrackWithAutoAdvance(currentQueue[existingIndex], existingIndex, new Set());
        return;
      }

      // Case 3: Genuinely new track selection -> Start Radio Session
      const mySessionToken = ++_radioSessionToken;
      console.log(
        `[usePlayback] Starting new Radio Session for "${normalizedTrack.title}" by "${normalizedTrack.artist}" (session #${mySessionToken})`
      );

      // Immediately set seed track as current, initialize queue to [seedTrack], start playback
      setQueue([normalizedTrack], 0);
      setCurrentIndex(0);

      // Pre-fetch Last.fm recommendations in background
      RecommendService.getSimilarTracks(normalizedTrack).then((recommendations) => {
        if (mySessionToken !== _radioSessionToken) {
          console.log(`[usePlayback] Dropping superseded recommendations (session #${mySessionToken} != #${_radioSessionToken})`);
          return;
        }

        const uniqueRecs = deduplicateAgainstQueue(recommendations, [normalizedTrack]);
        if (uniqueRecs.length > 0) {
          const activeIdx = useQueueStore.getState().currentIndex;
          setQueue([normalizedTrack, ...uniqueRecs], activeIdx);
          console.log(
            `[usePlayback] Radio session active: [${normalizedTrack.title}] + ${uniqueRecs.length} Last.fm recommendations.`
          );
        } else {
          console.log(`[usePlayback] No similar tracks found for "${normalizedTrack.title}". Queue remains single track.`);
        }
      });

      await playTrackWithAutoAdvance(normalizedTrack, 0, new Set());
    },
    [setCurrentIndex, setQueue]
  );

  const togglePlayPause = useCallback(async () => {
    try {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch {}

      const state = await TrackPlayer.getState();
      if (state === State.Playing) {
        await TrackPlayer.pause();
        usePlayerStore.getState().setIsPlaying(false);
      } else {
        await TrackPlayer.play();
        usePlayerStore.getState().setIsPlaying(true);
      }
    } catch (e) {
      console.warn('togglePlayPause error:', e);
    }
  }, []);

  const skipNext = useCallback(async () => {
    await advanceToNextTrack('user_skip');
  }, []);

  const skipPrev = useCallback(async () => {
    await retreatToPreviousTrack('user_prev');
  }, []);

  const seekTo = useCallback(async (seconds: number) => {
    try {
      await TrackPlayer.seekTo(seconds);
      const curDuration = usePlayerStore.getState().duration;
      usePlayerStore.getState().setProgress(seconds, curDuration);
    } catch (e) {
      console.warn('seekTo error:', e);
    }
  }, []);

  const addToQueue = useCallback((track: Track) => {
    const added = useQueueStore.getState().addToQueue(track);
    if (added) {
      showNonBlockingToast(`Added to queue: ${track.title}`);
    }
    return added;
  }, []);

  const playNext = useCallback((track: Track) => {
    const success = useQueueStore.getState().playNext(track);
    if (success) {
      showNonBlockingToast(`Playing next: ${track.title}`);
    }
    return success;
  }, []);

  const removeTrackFromQueue = useCallback(async (index: number) => {
    const queueStore = useQueueStore.getState();
    const { wasCurrent, removedTrack } = queueStore.removeFromQueue(index);
    if (!removedTrack) return;

    if (wasCurrent) {
      const updatedQ = queueStore.queue;
      const currentIdx = queueStore.currentIndex;
      if (updatedQ.length === 0) {
        try {
          await TrackPlayer.reset();
        } catch {}
        usePlayerStore.getState().setIsPlaying(false);
        usePlayerStore.getState().setCurrentTrack(null);
      } else {
        const nextTrack = updatedQ[currentIdx];
        await playTrackWithAutoAdvance(nextTrack, currentIdx, new Set());
      }
    }
  }, []);

  const clearPlaybackQueue = useCallback(async () => {
    useQueueStore.getState().clearQueue();
    try {
      await TrackPlayer.reset();
    } catch {}
    usePlayerStore.getState().setIsPlaying(false);
    usePlayerStore.getState().setCurrentTrack(null);
    showNonBlockingToast('Queue cleared');
  }, []);

  const storeIsPlaying = usePlayerStore((s) => s.isPlaying);
  const storeIsBuffering = usePlayerStore((s) => s.isBuffering);

  const effectiveIsPlaying = playbackState.state === State.Playing || storeIsPlaying;
  const effectiveIsBuffering =
    playbackState.state === State.Buffering ||
    playbackState.state === State.Loading ||
    storeIsBuffering;

  return {
    currentTrack,
    isPlaying: effectiveIsPlaying,
    isBuffering: effectiveIsBuffering,
    playbackMode,
    playTrack,
    togglePlayPause,
    skipNext,
    skipPrev,
    seekTo,
    setPlaybackMode,
    addToQueue,
    playNext,
    removeTrackFromQueue,
    clearPlaybackQueue,
  };
}
