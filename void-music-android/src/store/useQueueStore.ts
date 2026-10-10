import { create } from 'zustand';
import { Track } from '../types';
import { storage } from '../utils/storage';

const QUEUE_STORAGE_KEY = 'void_music_saved_queue';
const INDEX_STORAGE_KEY = 'void_music_saved_index';

let lastAddedTrackId = '';
let lastAddedTimestamp = 0;

export const assignQueueId = (track: Track): Track => ({
  ...track,
  queueItemId:
    track.queueItemId ||
    `${track.id || 'track'}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
});

interface QueueState {
  queue: Track[];
  currentIndex: number;

  setQueue: (tracks: Track[], startIndex?: number) => void;
  addToQueue: (track: Track) => boolean;
  addTracksToQueue: (tracks: Track[]) => void;
  playNext: (track: Track) => boolean;
  removeFromQueue: (index: number) => { removedTrack: Track | null; wasCurrent: boolean };
  reorderQueue: (fromIndex: number, toIndex: number) => void;
  setCurrentIndex: (index: number) => void;
  clearQueue: () => void;
  getCurrentTrack: () => Track | null;
  getNextTrack: () => Track | null;
  getPreviousTrack: () => Track | null;
}

const initialSavedQueue = storage
  .getJSON<Track[]>(QUEUE_STORAGE_KEY, [])
  .map(assignQueueId);
const initialSavedIndex = storage.getJSON<number>(INDEX_STORAGE_KEY, 0);

export const useQueueStore = create<QueueState>((set, get) => ({
  queue: initialSavedQueue,
  currentIndex: initialSavedIndex,

  setQueue: (tracks: Track[], startIndex = 0) => {
    const withIds = tracks.map(assignQueueId);
    const validIndex =
      withIds.length > 0 ? Math.max(0, Math.min(startIndex, withIds.length - 1)) : 0;
    storage.setJSON(QUEUE_STORAGE_KEY, withIds);
    storage.setJSON(INDEX_STORAGE_KEY, validIndex);
    set({ queue: withIds, currentIndex: validIndex });
  },

  addToQueue: (track: Track): boolean => {
    const now = Date.now();
    if (track.id === lastAddedTrackId && now - lastAddedTimestamp < 800) {
      console.log(`[QueueStore] Debounced rapid duplicate tap for track: "${track.title}"`);
      return false;
    }
    lastAddedTrackId = track.id;
    lastAddedTimestamp = now;

    const { queue } = get();
    const itemWithId = assignQueueId(track);
    const updated = [...queue, itemWithId];
    storage.setJSON(QUEUE_STORAGE_KEY, updated);
    set({ queue: updated });
    return true;
  },

  addTracksToQueue: (tracks: Track[]) => {
    const { queue } = get();
    const withIds = tracks.map(assignQueueId);
    const updated = [...queue, ...withIds];
    storage.setJSON(QUEUE_STORAGE_KEY, updated);
    set({ queue: updated });
  },

  playNext: (track: Track): boolean => {
    const { queue, currentIndex } = get();
    const itemWithId = assignQueueId(track);

    if (queue.length === 0) {
      storage.setJSON(QUEUE_STORAGE_KEY, [itemWithId]);
      storage.setJSON(INDEX_STORAGE_KEY, 0);
      set({ queue: [itemWithId], currentIndex: 0 });
      return true;
    }

    const updated = [...queue];
    const insertIndex = Math.min(currentIndex + 1, queue.length);
    updated.splice(insertIndex, 0, itemWithId);

    storage.setJSON(QUEUE_STORAGE_KEY, updated);
    set({ queue: updated });
    return true;
  },

  removeFromQueue: (index: number) => {
    const { queue, currentIndex } = get();
    if (index < 0 || index >= queue.length) {
      return { removedTrack: null, wasCurrent: false };
    }

    const removedTrack = queue[index];
    const wasCurrent = index === currentIndex;
    const updated = queue.filter((_, i) => i !== index);

    let newIndex = currentIndex;
    if (index < currentIndex) {
      newIndex = Math.max(0, currentIndex - 1);
    } else if (index === currentIndex) {
      newIndex = Math.max(0, Math.min(currentIndex, updated.length - 1));
    }

    storage.setJSON(QUEUE_STORAGE_KEY, updated);
    storage.setJSON(INDEX_STORAGE_KEY, newIndex);
    set({ queue: updated, currentIndex: newIndex });

    return { removedTrack, wasCurrent };
  },

  reorderQueue: (fromIndex: number, toIndex: number) => {
    const { queue, currentIndex } = get();
    if (
      fromIndex < 0 ||
      fromIndex >= queue.length ||
      toIndex < 0 ||
      toIndex >= queue.length ||
      fromIndex === toIndex
    ) {
      return;
    }

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
