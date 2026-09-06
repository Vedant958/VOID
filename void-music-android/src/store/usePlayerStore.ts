import { create } from 'zustand';
import { PlaybackMode, PlaybackSourceType, Track } from '../types';

interface PlayerState {
  currentTrack: Track | null;
  isPlaying: boolean;
  isBuffering: boolean;
  playbackMode: PlaybackMode;
  position: number;
  duration: number;
  error: string | null;
  playbackSourceType: PlaybackSourceType;
  isPreview: boolean;

  setCurrentTrack: (track: Track | null) => void;
  setIsPlaying: (isPlaying: boolean) => void;
  setIsBuffering: (isBuffering: boolean) => void;
  setPlaybackMode: (mode: PlaybackMode) => void;
  setProgress: (position: number, duration: number) => void;
  setError: (error: string | null) => void;
  setIsPreview: (isPreview: boolean) => void;
  reset: () => void;
}

export const usePlayerStore = create<PlayerState>((set) => ({
  currentTrack: null,
  isPlaying: false,
  isBuffering: false,
  playbackMode: 'normal',
  position: 0,
  duration: 0,
  error: null,
  playbackSourceType: 'direct',
  isPreview: false,

  setCurrentTrack: (currentTrack) =>
    set({
      currentTrack,
      error: null,
      playbackSourceType: 'direct',
      isPreview: Boolean(currentTrack?.isPreview),
    }),
  setIsPlaying: (isPlaying) => set({ isPlaying }),
  setIsBuffering: (isBuffering) => set({ isBuffering }),
  setPlaybackMode: (playbackMode) => set({ playbackMode }),
  setProgress: (position, duration) => set({ position, duration }),
  setError: (error) => set({ error }),
  setIsPreview: (isPreview) => set({ isPreview }),
  reset: () =>
    set({
      currentTrack: null,
      isPlaying: false,
      isBuffering: false,
      position: 0,
      duration: 0,
      error: null,
      playbackSourceType: 'direct',
      isPreview: false,
    }),
}));
