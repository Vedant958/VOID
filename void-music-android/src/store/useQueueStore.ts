import { create } from 'zustand';
import { Track } from '../types';
import { storage } from '../utils/storage';

const QUEUE_STORAGE_KEY = 'void_music_saved_queue';
const INDEX_STORAGE_KEY = 'void_music_saved_index';

interface QueueState {
  queue: Track[];
  currentIndex: number;
  
  setQueue: (tracks: Track[], startIndex?: number) => void;
  addToQueue: (track: Track) => void;
  addTracksToQueue: (tracks: Track[]) => void;
  removeFromQueue: (index: number) => void;
  reorderQueue: (fromIndex: number, toIndex: number) => void;
  setCurrentIndex: (index: number) => void;
  clearQueue: () => void;
  getCurrentTrack: () => Track | null;
  getNextTrack: () => Track | null;
  getPreviousTrack: () => Track | null;
}

const initialSavedQueue = storage.getJSON<Track[]>(QUEUE_STORAGE_KEY, []);
const initialSavedIndex = storage.getJSON<number>(INDEX_STORAGE_KEY, 0);

export const useQueueStore = create<QueueState>((set, get) => ({
  queue: initialSavedQueue,
  currentIndex: initialSavedIndex,

  setQueue: (tracks: Track[], startIndex = 0) => {
    const validIndex = tracks.length > 0 ? Math.max(0, Math.min(startIndex, tracks.length - 1)) : 0;
    storage.setJSON(QUEUE_STORAGE_KEY, tracks);
    storage.setJSON(INDEX_STORAGE_KEY, validIndex);
    set({ queue: tracks, currentIndex: validIndex });
  },

  addToQueue: (track: Track) => {
    const { queue } = get();
    const updated = [...queue, track];
    storage.setJSON(QUEUE_STORAGE_KEY, updated);
    set({ queue: updated });
  },

  addTracksToQueue: (tracks: Track[]) => {
    const { queue } = get();
    const updated = [...queue, ...tracks];
    storage.setJSON(QUEUE_STORAGE_KEY, updated);
    set({ queue: updated });
  },

  removeFromQueue: (index: number) => {
    const { queue, currentIndex } = get();
    const updated = queue.filter((_, i) => i !== index);
    let newIndex = currentIndex;
    if (index < currentIndex) {
      newIndex = Math.max(0, currentIndex - 1);
    } else if (index === currentIndex && newIndex >= updated.length) {
      newIndex = Math.max(0, updated.length - 1);
    }
    storage.setJSON(QUEUE_STORAGE_KEY, updated);
    storage.setJSON(INDEX_STORAGE_KEY, newIndex);
    set({ queue: updated, currentIndex: newIndex });
  },

  reorderQueue: (fromIndex: number, toIndex: number) => {
    const { queue, currentIndex } = get();
    const updated = [...queue];
    const [moved] = updated.splice(fromIndex, 1);
    updated.splice(toIndex, 0, moved);

    let newIndex = currentIndex;
    if (currentIndex === fromIndex) {
      newIndex = toIndex;
    } else if (fromIndex < currentIndex && toIndex >= currentIndex) {
      newIndex = currentIndex - 1;
    } else if (fromIndex > currentIndex && toIndex <= currentIndex) {
      newIndex = currentIndex + 1;
    }

    storage.setJSON(QUEUE_STORAGE_KEY, updated);
    storage.setJSON(INDEX_STORAGE_KEY, newIndex);
    set({ queue: updated, currentIndex: newIndex });
  },

  setCurrentIndex: (index: number) => {
    storage.setJSON(INDEX_STORAGE_KEY, index);
    set({ currentIndex: index });
  },

  clearQueue: () => {
    storage.setJSON(QUEUE_STORAGE_KEY, []);
    storage.setJSON(INDEX_STORAGE_KEY, 0);
    set({ queue: [], currentIndex: 0 });
  },

  getCurrentTrack: () => {
    const { queue, currentIndex } = get();
    return queue[currentIndex] || null;
  },

  getNextTrack: () => {
    const { queue, currentIndex } = get();
    if (currentIndex + 1 < queue.length) {
      return queue[currentIndex + 1];
    }
    return null;
  },

  getPreviousTrack: () => {
    const { queue, currentIndex } = get();
    if (currentIndex - 1 >= 0) {
      return queue[currentIndex - 1];
    }
    return null;
  },
}));
