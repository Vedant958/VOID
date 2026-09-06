import { Track } from '../types';

export function normalizeKey(artist?: string, title?: string): string {
  const a = (artist || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const t = (title || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  return `${a}___${t}`;
}

export function deduplicateTracks(tracks: Track[]): Track[] {
  const seen = new Set<string>();
  const result: Track[] = [];
  
  for (const track of tracks) {
    const key = normalizeKey(track.artist, track.title);
    if (!key || key === '___') continue;
    if (!seen.has(key)) {
      seen.add(key);
      result.push(track);
    }
  }
  
  return result;
}

export function isMissingArtwork(url?: string): boolean {
  if (!url) return true;
  if (
    url.includes('placeholder') ||
    url.includes('default') ||
    url.includes('album-art.png') ||
    url.includes('2a96cbd8b46e442fc41c2b86b821562f') ||
    url.trim() === ''
  ) {
    return true;
  }
  return false;
}

/**
 * Universal Track Normalizer
 * Enforces a single consistent Track shape across Discover, Search, Queue, and Playback.
 *
 * Rules:
 * - Full-track audio streams are resolved on demand via StreamResolver.
 * - 30-second previews (from iTunes) are stored in `previewUrl`, NEVER in `streamUrl`.
 * - Artwork is upgraded to 600x600 HD whenever possible.
 */
export function normalizeTrack(raw: any, defaultSource?: Track['source']): Track {
  if (!raw || typeof raw !== 'object') {
    return {
      id: `track-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      title: 'Unknown Title',
      artist: 'Unknown Artist',
    };
  }

  const id = String(
    raw.id ||
    (raw.trackId ? `itunes-${raw.trackId}` : '') ||
    raw.videoId ||
    `track-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`
  );

  const title = String(raw.title || raw.trackName || raw.name || 'Unknown Title').trim();
  const artist = String(raw.artist || raw.artistName || raw.primaryArtists || 'Unknown Artist').trim();

  // Normalize duration to integer seconds
  let duration: number | undefined;
  if (typeof raw.duration === 'number') {
    duration = Math.round(raw.duration);
  } else if (typeof raw.durationSec === 'number') {
    duration = Math.round(raw.durationSec);
  } else if (typeof raw.trackTimeMillis === 'number') {
    duration = Math.round(raw.trackTimeMillis / 1000);
  } else if (typeof raw.duration === 'string') {
    if (raw.duration.includes(':')) {
      const parts = raw.duration.split(':').map((p: string) => parseInt(p, 10));
      if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
        duration = parts[0] * 60 + parts[1];
      }
    } else {
      const sec = parseInt(raw.duration, 10);
      if (!isNaN(sec)) duration = sec;
    }
  }

  // Artwork normalization (upgrade 100x100 to 600x600 HD, discard placeholders)
  let artwork: string | undefined;
  const rawArt = raw.artwork || raw.artworkUrl100 || raw.artworkUrl60 || raw.cover || raw.thumbnail || raw.image;
  if (typeof rawArt === 'string' && !isMissingArtwork(rawArt)) {
    artwork = rawArt.replace('100x100bb', '600x600bb').replace('60x60bb', '600x600bb');
  }

  // Preserve 30s preview URL separately; NEVER expose as streamUrl
  const previewUrl = raw.previewUrl || raw.preview || undefined;

  // streamUrl should ONLY be pre-populated if it is an explicit full stream (e.g. from local src)
  // NEVER allow an iTunes preview URL to masquerade as streamUrl
  let streamUrl: string | undefined;
  if (raw.streamUrl && typeof raw.streamUrl === 'string' && raw.streamUrl.startsWith('http')) {
    const isPreview = raw.streamUrl.includes('audio-ssl.itunes.apple.com') || raw.streamUrl.includes('mzstatic.com');
    if (!isPreview) {
      streamUrl = raw.streamUrl;
    }
  } else if (raw.src && typeof raw.src === 'string' && raw.src.startsWith('http')) {
    streamUrl = raw.src;
  }

  const album = raw.album || raw.collectionName || undefined;
  const query = raw.query || undefined;
  const source = raw.source || defaultSource || (raw.trackId ? 'itunes' : 'saavn');
  const isPreview = raw.isPreview !== undefined ? Boolean(raw.isPreview) : undefined;

  return {
    id,
    title,
    artist,
    album,
    artwork,
    duration,
    streamUrl,
    previewUrl,
    isPreview,
    query,
    source,
  };
}

/**
 * Checks if a track already exists inside the active queue.
 * Matches by unique id or case-insensitive (title + artist).
 */
export function findTrackInQueue(track: Track, currentQueue: Track[]): number {
  if (!track || !currentQueue || currentQueue.length === 0) return -1;
  return currentQueue.findIndex((candidate) => {
    if (!candidate) return false;
    if (track.id && candidate.id && String(track.id) === String(candidate.id)) return true;
    return (
      (candidate.title || '').trim().toLowerCase() === (track.title || '').trim().toLowerCase() &&
      (candidate.artist || '').trim().toLowerCase() === (track.artist || '').trim().toLowerCase()
    );
  });
}

/**
 * Clean string helper for robust track and title comparison.
 */
function cleanTrackStr(s?: string): string {
  return (s || '')
    .replace(/\(.*?\)|\[.*?\]/g, '')
    .replace(/[^a-z0-9]/gi, '')
    .toLowerCase()
    .trim();
}

/**
 * Deduplicates incoming recommendations against the existing queue and the batch itself.
 * - Prevents recommending the currently playing seed track (including parenthetical variations).
 * - Enforces artist diversity (max 2 tracks per artist in queue/batch).
 * - Avoids duplicate tracks.
 */
export function deduplicateAgainstQueue(freshTracks: Track[], existingQueue: Track[]): Track[] {
  if (!freshTracks || !Array.isArray(freshTracks)) return [];

  const cleanTitleKey = (t: Track) => cleanTrackStr(t.title);
  const normKey = (t: Track) => `${cleanTrackStr(t.title)}___${cleanTrackStr(t.artist)}`;

  // Existing seed titles to prevent re-recommending the playing song under a variant name
  const existingSeedTitles = new Set(existingQueue.map(cleanTitleKey));
  const existingKeys = new Set(existingQueue.map(normKey));
  const seenInBatch = new Set<string>();
  const artistCounts = new Map<string, number>();

  // Count existing artists in queue to protect diversity
  for (const t of existingQueue) {
    const a = cleanTrackStr(t.artist);
    if (a) artistCounts.set(a, (artistCounts.get(a) || 0) + 1);
  }

  return freshTracks.filter((t) => {
    if (!t || !t.title) return false;
    const titleKey = cleanTitleKey(t);
    const key = normKey(t);
    const artistKey = cleanTrackStr(t.artist);

    // Reject if base title matches a seed track in the existing queue
    if (existingSeedTitles.has(titleKey)) return false;

    // Reject exact duplicate track
    if (existingKeys.has(key) || seenInBatch.has(key)) return false;

    // Enforce artist diversity: max 2 tracks per artist
    if (artistKey) {
      const currentCount = artistCounts.get(artistKey) || 0;
      if (currentCount >= 2) return false;
      artistCounts.set(artistKey, currentCount + 1);
    }

    seenInBatch.add(key);
    return true;
  });
}


