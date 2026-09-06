import { create } from 'zustand';
import { HistoryItem, Playlist, Track } from '../types';
import { storage } from '../utils/storage';

const LIKES_KEY = 'void_music_likes';
const HISTORY_KEY = 'void_music_history';
const PLAYLISTS_KEY = 'void_music_playlists';

interface LibraryState {
  likedTracks: Track[];
  history: HistoryItem[];
  playlists: Playlist[];

  toggleLike: (track: Track) => boolean;
  isLiked: (trackId: string) => boolean;
  addToHistory: (track: Track) => void;
  clearHistory: () => void;
  createPlaylist: (name: string) => Playlist;
  deletePlaylist: (id: string) => void;
  addTrackToPlaylist: (playlistId: string, track: Track) => void;
  removeTrackFromPlaylist: (playlistId: string, trackId: string) => void;
}

const initialLikes = storage.getJSON<Track[]>(LIKES_KEY, []);
const initialHistory = storage.getJSON<HistoryItem[]>(HISTORY_KEY, []);
const initialPlaylists = storage.getJSON<Playlist[]>(PLAYLISTS_KEY, []);

export const useLibraryStore = create<LibraryState>((set, get) => ({
  likedTracks: initialLikes,
  history: initialHistory,
  playlists: initialPlaylists,

  toggleLike: (track: Track): boolean => {
    const { likedTracks } = get();
    const exists = likedTracks.some((t) => t.id === track.id || (t.title === track.title && t.artist === track.artist));
    let updated: Track[];
    let currentlyLiked = false;

    if (exists) {
      updated = likedTracks.filter((t) => t.id !== track.id && !(t.title === track.title && t.artist === track.artist));
      currentlyLiked = false;
    } else {
      updated = [track, ...likedTracks];
      currentlyLiked = true;
    }

    storage.setJSON(LIKES_KEY, updated);
    set({ likedTracks: updated });
    return currentlyLiked;
  },

  isLiked: (trackId: string): boolean => {
    const { likedTracks } = get();
    return likedTracks.some((t) => t.id === trackId);
  },

  addToHistory: (track: Track) => {
    const { history } = get();
    // Keep max 100 history items, deduplicate recent
    const filtered = history.filter((h) => h.track.id !== track.id);
    const updated: HistoryItem[] = [{ track, playedAt: Date.now() }, ...filtered].slice(0, 100);

    storage.setJSON(HISTORY_KEY, updated);
    set({ history: updated });
  },

  clearHistory: () => {
    storage.setJSON(HISTORY_KEY, []);
    set({ history: [] });
  },

  createPlaylist: (name: string): Playlist => {
    const { playlists } = get();
    const newPlaylist: Playlist = {
      id: `pl-${Date.now()}`,
      name,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      tracks: [],
    };
    const updated = [newPlaylist, ...playlists];
    storage.setJSON(PLAYLISTS_KEY, updated);
    set({ playlists: updated });
    return newPlaylist;
  },

  deletePlaylist: (id: string) => {
    const { playlists } = get();
    const updated = playlists.filter((p) => p.id !== id);
    storage.setJSON(PLAYLISTS_KEY, updated);
    set({ playlists: updated });
  },

  addTrackToPlaylist: (playlistId: string, track: Track) => {
    const { playlists } = get();
    const updated = playlists.map((p) => {
      if (p.id === playlistId) {
        // avoid duplicates in same playlist
        if (p.tracks.some((t) => t.id === track.id)) return p;
        return {
          ...p,
          updatedAt: Date.now(),
          tracks: [...p.tracks, track],
        };
      }
      return p;
    });
    storage.setJSON(PLAYLISTS_KEY, updated);
    set({ playlists: updated });
  },

  removeTrackFromPlaylist: (playlistId: string, trackId: string) => {
    const { playlists } = get();
    const updated = playlists.map((p) => {
      if (p.id === playlistId) {
        return {
          ...p,
          updatedAt: Date.now(),
          tracks: p.tracks.filter((t) => t.id !== trackId),
        };
      }
      return p;
    });
    storage.setJSON(PLAYLISTS_KEY, updated);
    set({ playlists: updated });
  },
}));
