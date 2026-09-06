import { useCallback, useEffect, useRef } from 'react';
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

export function usePlayback() {
  const playbackState = usePlaybackState();
  const {
    currentTrack,
    isPlaying,
    isBuffering,
    playbackMode,
    setCurrentTrack,
    setIsPlaying,
    setIsBuffering,
    setPlaybackMode,
    setError,
    setIsPreview,
  } = usePlayerStore();

  const {
    queue,
    currentIndex,
    setQueue,
    setCurrentIndex,
    getNextTrack,
    getPreviousTrack,
    addTracksToQueue,
  } = useQueueStore();

  const { addToHistory } = useLibraryStore();
  const isAdvancingRef = useRef(false);

  /**
   * Internal audio player dispatcher:
   * Pure native TrackPlayer playback (JioSaavn 320kbps full stream OR Apple iTunes 30s preview fallback).
   * 100% direct audio. Zero WebViews / YouTube.
   */
  const playTrackAudio = useCallback(
    async (track: Track) => {
      try {
        try {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        } catch {}

        setIsBuffering(true);
        setError(null);
        setCurrentTrack(track);

        // Concurrent resolution of direct audio stream & HD artwork
        const [resolution, hdArt] = await Promise.all([
          StreamResolver.resolve(track),
          ArtworkService.getHDArtwork(track),
        ]);

        if (!resolution || !resolution.streamUrl) {
          setError('Unable to resolve playable audio stream for this track.');
          setIsBuffering(false);
          setIsPlaying(false);
          return;
        }

        console.log('[usePlayback] Direct audio stream resolved:', {
          title: track.title,
          isPreview: resolution.isPreview,
          duration: resolution.duration,
          streamUrl: resolution.streamUrl.substring(0, 60) + '...',
        });

        const enrichedTrack: Track = {
          ...track,
          artwork: hdArt || track.artwork,
          playbackSourceType: 'direct',
          streamUrl: resolution.streamUrl,
          isPreview: Boolean(resolution.isPreview),
          duration: resolution.duration || track.duration,
        };

        setCurrentTrack(enrichedTrack);
        setIsPreview(Boolean(resolution.isPreview));

        await playTrackOnPlayer(enrichedTrack, resolution.streamUrl);
        setIsPlaying(true);
        setIsBuffering(false);
        addToHistory(enrichedTrack);
      } catch (err: any) {
        console.error('[usePlayback] playTrackAudio error:', err);
        setError(err?.message || 'Playback error');
        setIsBuffering(false);
        setIsPlaying(false);
      }
    },
    [addToHistory, setCurrentTrack, setError, setIsBuffering, setIsPlaying, setIsPreview]
  );

  /**
   * Appends recommendations to the END of the queue without replacing existing tracks.
   */
  const extendQueueWithRecommendations = useCallback(
    async (seedTrack: Track, playNextOnAppend = false) => {
      try {
        console.log(`[usePlayback] Fetching recommendations to extend queue from "${seedTrack.title}"`);
        const fresh = await RecommendService.getSimilarTracks(seedTrack);
        const currentQ = useQueueStore.getState().queue;
        const currentIdx = useQueueStore.getState().currentIndex;
        const uniqueNew = deduplicateAgainstQueue(fresh, currentQ);

        if (uniqueNew.length > 0) {
          addTracksToQueue(uniqueNew);
          console.log(`[usePlayback] Appended ${uniqueNew.length} recommendations to the END of queue.`);

          if (playNextOnAppend) {
            const nextIdx = currentIdx + 1;
            const updatedQ = useQueueStore.getState().queue;
            if (nextIdx < updatedQ.length) {
              setCurrentIndex(nextIdx);
              await playTrackAudio(updatedQ[nextIdx]);
            }
          }
        }
      } catch (err) {
        console.log('[usePlayback] Extend queue skipped:', err);
      }
    },
    [addTracksToQueue, playTrackAudio, setCurrentIndex]
  );

  /**
   * Primary Playback Dispatcher:
   * 1. If explicitQueue is passed (e.g. user selected a playlist from Library), plays that queue.
   * 2. If track is already inside active queue, skips to that index WITHOUT regenerating the queue.
   * 3. If track is new (e.g. clicked in Search or Discover), creates a new Radio Session:
   *    [seedTrack] + [Last.fm recommendations]
   *    (Search results are NEVER used as the queue).
   */
  const playTrack = useCallback(
    async (track: Track, explicitQueue?: Track[], startIndex?: number) => {
      const normalizedTrack = normalizeTrack(track);

      // Case 1: Explicit playlist queue (e.g., custom playlist from Library)
      if (explicitQueue && explicitQueue.length > 0) {
        const normalizedQueue = explicitQueue.map((t) => normalizeTrack(t));
        const index = startIndex !== undefined ? startIndex : normalizedQueue.findIndex((t) => t.id === normalizedTrack.id);
        const safeIdx = Math.max(0, index >= 0 ? index : 0);
        setQueue(normalizedQueue, safeIdx);
        await playTrackAudio(normalizedQueue[safeIdx]);
        return;
      }

      // Case 2: Check if track is already in the active queue
      const currentQueue = useQueueStore.getState().queue;
      const existingIndex = findTrackInQueue(normalizedTrack, currentQueue);

      if (existingIndex >= 0) {
        console.log(`[usePlayback] Track already in queue at index ${existingIndex}. Playing without regenerating.`);
        setCurrentIndex(existingIndex);
        await playTrackAudio(currentQueue[existingIndex]);
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
      await playTrackAudio(normalizedTrack);

      // Pre-fetch Last.fm recommendations in background
      RecommendService.getSimilarTracks(normalizedTrack).then((recommendations) => {
        if (mySessionToken !== _radioSessionToken) {
          console.log(`[usePlayback] Dropping superseded recommendations (session #${mySessionToken} != #${_radioSessionToken})`);
          return;
        }

        const uniqueRecs = deduplicateAgainstQueue(recommendations, [normalizedTrack]);
        if (uniqueRecs.length > 0) {
          setQueue([normalizedTrack, ...uniqueRecs], 0);
          console.log(
            `[usePlayback] Radio session active: [${normalizedTrack.title}] + ${uniqueRecs.length} Last.fm recommendations.`
          );
        } else {
          console.log(`[usePlayback] No similar tracks found for "${normalizedTrack.title}". Queue remains single track.`);
        }
      });
    },
    [playTrackAudio, setCurrentIndex, setQueue]
  );

  const togglePlayPause = useCallback(async () => {
    try {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch {}

      const state = await TrackPlayer.getState();
      if (state === State.Playing) {
        await TrackPlayer.pause();
        setIsPlaying(false);
      } else {
        await TrackPlayer.play();
        setIsPlaying(true);
      }
    } catch (e) {
      console.warn('togglePlayPause error:', e);
    }
  }, [setIsPlaying]);

  const skipNext = useCallback(async () => {
    if (isAdvancingRef.current) return;
    isAdvancingRef.current = true;

    try {
      const currentQ = useQueueStore.getState().queue;
      const currentIdx = useQueueStore.getState().currentIndex;

      if (currentIdx + 1 < currentQ.length) {
        const nextIndex = currentIdx + 1;
        setCurrentIndex(nextIndex);
        const nextTrack = currentQ[nextIndex];
        await playTrackAudio(nextTrack);

        // Pre-extend queue if approaching the end
        if (nextIndex >= currentQ.length - 2) {
          extendQueueWithRecommendations(nextTrack, false);
        }
      } else if (currentQ.length > 0) {
        // Reached the end: extend queue by fetching recommendations from last track and APPENDING
        const lastTrack = currentQ[currentQ.length - 1];
        await extendQueueWithRecommendations(lastTrack, true);
      }
    } finally {
      isAdvancingRef.current = false;
    }
  }, [extendQueueWithRecommendations, playTrackAudio, setCurrentIndex]);

  const skipPrev = useCallback(async () => {
    const currentQ = useQueueStore.getState().queue;
    const currentIdx = useQueueStore.getState().currentIndex;

    if (currentIdx - 1 >= 0) {
      const prevIndex = currentIdx - 1;
      setCurrentIndex(prevIndex);
      await playTrackAudio(currentQ[prevIndex]);
    } else if (currentQ.length > 0) {
      await TrackPlayer.seekTo(0);
    }
  }, [playTrackAudio, setCurrentIndex]);

  const seekTo = useCallback(async (seconds: number) => {
    try {
      await TrackPlayer.seekTo(seconds);
      const curDuration = usePlayerStore.getState().duration;
      usePlayerStore.getState().setProgress(seconds, curDuration);
    } catch (e) {
      console.warn('seekTo error:', e);
    }
  }, []);

  // Automatic Queue Advance on Native TrackPlayer Track Finish
  useEffect(() => {
    const sub = TrackPlayer.addEventListener(Event.PlaybackQueueEnded, () => {
      console.log('[usePlayback] PlaybackQueueEnded event fired. Advancing to next track in queue...');
      skipNext();
    });

    return () => {
      sub.remove();
    };
  }, [skipNext]);

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
  };
}
