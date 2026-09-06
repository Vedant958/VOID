export type PlaybackSourceType = 'direct';

export type PlaybackSource = { type: 'direct'; url: string };

export interface ResolvedSource {
  sourceType: PlaybackSourceType;
  streamUrl: string;
  isPreview?: boolean;
  duration?: number;
}

export interface Track {
  id: string;
  title: string;
  artist: string;
  artwork?: string;
  streamUrl?: string;
  duration?: number; // seconds
  source?: 'saavn' | 'itunes' | 'local' | 'lastfm' | 'yt';
  playbackSourceType?: PlaybackSourceType;
  isPreview?: boolean;
  album?: string;
  query?: string;
  previewUrl?: string;
  isLocal?: boolean;
}

export type PlaybackMode = 'normal' | 'repeat-all' | 'repeat-one' | 'shuffle';

export interface Playlist {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  tracks: Track[];
}

export interface HistoryItem {
  track: Track;
  playedAt: number;
}

export interface RecommendationResponse {
  success: boolean;
  tracks: Array<{
    title: string;
    artist: string;
    artwork?: string;
    url?: string;
    match?: number;
  }>;
}

export interface SearchResult {
  tracks: Track[];
  source: 'itunes' | 'yt' | 'saavn';
}
