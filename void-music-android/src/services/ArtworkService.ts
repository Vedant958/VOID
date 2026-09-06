import { API_CONFIG } from '../constants/api';
import { Track } from '../types';
import { normalizeKey, isMissingArtwork } from '../utils/trackUtils';

const artworkCache = new Map<string, string>();

export class ArtworkService {
  /**
   * Resolves high-definition (600x600) artwork for any track.
   * Checks local artwork, memory cache, live iTunes API, and Saavn image CDN.
   */
  static async getHDArtwork(track: Track): Promise<string | undefined> {
    const key = normalizeKey(track.artist, track.title);
    if (artworkCache.has(key)) {
      const cached = artworkCache.get(key);
      if (cached) return cached;
    }

    if (track.artwork && !isMissingArtwork(track.artwork)) {
      // If it's an iTunes low-res artwork, upgrade to 600x600 HD
      let hdArt = track.artwork;
      if (hdArt.includes('100x100bb') || hdArt.includes('60x60bb')) {
        hdArt = hdArt.replace('100x100bb', '600x600bb').replace('60x60bb', '600x600bb');
      }
      artworkCache.set(key, hdArt);
      return hdArt;
    }

    // 1. Resolve from iTunes search (HD 600x600)
    try {
      const cleanTitle = (track.title || '').replace(/\(.*?\)|\[.*?\]/g, '').trim();
      const cleanArtist = (track.artist || '').replace(/\(.*?\)|\[.*?\]/g, '').trim();
      
      let term = encodeURIComponent(`${cleanTitle} ${cleanArtist}`.trim());
      let res = await fetch(`${API_CONFIG.ITUNES_SEARCH}?term=${term}&entity=song&limit=1`);
      if (res.ok) {
        const data = await res.json();
        const rawArt = data.results?.[0]?.artworkUrl100 || data.results?.[0]?.artworkUrl60;
        if (rawArt) {
          const hdArt = rawArt.replace('100x100bb', '600x600bb').replace('60x60bb', '600x600bb');
          artworkCache.set(key, hdArt);
          return hdArt;
        }
      }

      // 1b. Try title-only on iTunes if artist was not indexed with this specific track
      if (cleanTitle) {
        term = encodeURIComponent(cleanTitle);
        res = await fetch(`${API_CONFIG.ITUNES_SEARCH}?term=${term}&entity=song&limit=1`);
        if (res.ok) {
          const data = await res.json();
          const rawArt = data.results?.[0]?.artworkUrl100 || data.results?.[0]?.artworkUrl60;
          if (rawArt) {
            const hdArt = rawArt.replace('100x100bb', '600x600bb').replace('60x60bb', '600x600bb');
            artworkCache.set(key, hdArt);
            return hdArt;
          }
        }
      }
    } catch {}

    // 2. Fallback: Resolve from Saavn image CDN (500x500)
    try {
      const cleanQuery = encodeURIComponent(`${track.title} ${track.artist}`.replace(/[^\w\s]/gi, ' ').replace(/\s+/g, ' ').trim());
      const res = await fetch(`${API_CONFIG.SAAVN_PRIMARY}?query=${cleanQuery}`);
      if (res.ok) {
        const data = await res.json();
        const cand = data?.data?.results?.[0] || (Array.isArray(data) ? data[0] : null);
        if (cand?.image && Array.isArray(cand.image)) {
          const high = cand.image.find((img: any) => img.quality === '500x500') || cand.image[cand.image.length - 1];
          const imgUrl = high?.link || high?.url;
          if (imgUrl && typeof imgUrl === 'string' && imgUrl.startsWith('http')) {
            artworkCache.set(key, imgUrl);
            return imgUrl;
          }
        }
      }
    } catch {}

    return track.artwork;
  }
}
