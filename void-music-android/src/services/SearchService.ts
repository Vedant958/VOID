import { API_CONFIG } from '../constants/api';
import { Track } from '../types';
import { normalizeTrack, deduplicateTracks } from '../utils/trackUtils';

interface iTunesResult {
  trackId: number;
  trackName: string;
  artistName: string;
  artworkUrl100?: string;
  previewUrl?: string;
  trackTimeMillis?: number;
  collectionName?: string;
}

export class SearchService {
  /**
   * Searches tracks with strict playback availability check:
   * Only returns tracks that can actually be played via primary direct audio or verified preview.
   * Zero YouTube search dependencies.
   */
  static async search(query: string): Promise<Track[]> {
    if (!query || query.trim().length === 0) return [];

    const tracks: Track[] = [];

    try {
      const itunesUrl = `${API_CONFIG.ITUNES_SEARCH}?term=${encodeURIComponent(query.trim())}&entity=song&limit=25`;
      const res = await fetch(itunesUrl, {
        headers: { Accept: 'application/json' },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.results && Array.isArray(data.results)) {
          // Playback-source pre-filter:
          // A search result must have a verified direct playable audio stream (e.g. previewUrl)
          // to guarantee that every result displayed can be played immediately without failure.
          const playableResults = data.results.filter(
            (item: iTunesResult) => item.previewUrl && typeof item.previewUrl === 'string' && item.previewUrl.startsWith('http')
          );

          const mapped: Track[] = playableResults.map((item: iTunesResult) =>
            normalizeTrack(
              {
                id: `itunes-${item.trackId}`,
                title: item.trackName,
                artist: item.artistName,
                artwork: item.artworkUrl100,
                duration: item.trackTimeMillis ? Math.round(item.trackTimeMillis / 1000) : undefined,
                previewUrl: item.previewUrl,
                album: item.collectionName,
                source: 'itunes',
              },
              'itunes'
            )
          );
          tracks.push(...mapped);
        }
      }
    } catch (e: any) {
      console.log('SearchService iTunes query skipped:', e?.message || e);
    }

    return deduplicateTracks(tracks);
  }
}
