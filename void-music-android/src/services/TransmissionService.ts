import { Track } from '../types';
import { storage } from '../utils/storage';
import { useLibraryStore } from '../store/useLibraryStore';
import { RecommendService } from './RecommendService';
import { CURATED_TRACKS } from '../constants/curatedTracks';
import { deduplicateTracks, normalizeTrack } from '../utils/trackUtils';

const TRANSMISSION_STORAGE_KEY = 'void_daily_transmission_v1';
const REFRESH_COUNT_KEY = 'void_transmission_refresh_count_v1';

export interface DailyTransmission {
  dateKey: string; // YYYY-MM-DD local calendar date
  displayDate: string; // e.g. "OCT 10"
  tracks: Track[];
  isPersonalized: boolean;
  label: string;
  subtitle: string;
}

/**
 * Returns the local calendar date key: YYYY-MM-DD
 */
export function getLocalDateKey(d: Date = new Date()): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Formats date for display: e.g. "OCT 10"
 */
export function getDisplayDate(d: Date = new Date()): string {
  try {
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase();
  } catch {
    const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    return `${months[d.getMonth()]} ${d.getDate()}`;
  }
}

/**
 * Deterministic integer hash from dateKey for daily rotation seed
 */
export function getDailySeed(dateKey: string): number {
  let hash = 0;
  for (let i = 0; i < dateKey.length; i++) {
    hash = (hash << 5) - hash + dateKey.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export class TransmissionService {
  /**
   * Retrieves the cached transmission for today if valid.
   */
  static getCachedTransmission(currentDateKey: string = getLocalDateKey()): DailyTransmission | null {
    const cached = storage.getJSON<DailyTransmission | null>(TRANSMISSION_STORAGE_KEY, null);
    if (cached && cached.dateKey === currentDateKey && Array.isArray(cached.tracks) && cached.tracks.length >= 4) {
      return cached;
    }
    return null;
  }

  /**
   * Generates or retrieves the Transmission of the Day.
   * Guarantees daily stability (returns cached version on same day).
   * forceRefresh=true skips the cache and uses a varied seed so results differ each manual tap.
   * Fallbacks gracefully if offline or recommendation API is unreachable.
   */
  static async getDailyTransmission(forceRefresh: boolean = false): Promise<DailyTransmission> {
    const now = new Date();
    const dateKey = getLocalDateKey(now);
    const displayDate = getDisplayDate(now);
    const baseSeed = getDailySeed(dateKey);

    // 1. Check existing cached transmission for today
    if (!forceRefresh) {
      const cached = this.getCachedTransmission(dateKey);
      if (cached) {
        return cached;
      }
    }

    // For manual refresh: increment per-day counter and derive varied seed so rotation differs
    let dailySeed = baseSeed;
    if (forceRefresh) {
      const countKey = `${REFRESH_COUNT_KEY}_${dateKey}`;
      const prevCount = storage.getJSON<number>(countKey, 0);
      const refreshCount = prevCount + 1;
      storage.setJSON(countKey, refreshCount);
      // XOR with a prime-offset of the count to vary the rotation each time
      dailySeed = (baseSeed ^ (refreshCount * 2654435761)) >>> 0;
    }

    const libraryState = useLibraryStore.getState();
    const likedTracks = libraryState.likedTracks || [];
    const historyTracks = (libraryState.history || []).map((h) => h.track).filter(Boolean);

    // 2. Evaluate personalization signals
    const hasLikes = likedTracks.length > 0;
    const hasHistory = historyTracks.length > 0;
    const isPersonalized = hasLikes || hasHistory;

    let resultTracks: Track[] = [];

    if (isPersonalized) {
      // User has personalization signals
      const userSeeds: Track[] = [...likedTracks, ...historyTracks];
      const catalogueRotated = this.rotateCatalogue(CURATED_TRACKS, dailySeed);
      // Combine user signals with rotated catalogue if user pool is small to guarantee refresh variety
      const seedPool: Track[] = userSeeds.length < 4 ? [...userSeeds, ...catalogueRotated] : userSeeds;
      const primarySeed = seedPool[dailySeed % seedPool.length];
      const secondarySeed = seedPool[(dailySeed + 5) % seedPool.length];

      try {
        // Fetch recommendations for seeds with a 5s safety timeout
        const recPromises: Promise<Track[]>[] = [];
        if (primarySeed) {
          recPromises.push(
            Promise.race([
              RecommendService.getSimilarTracks(primarySeed),
              new Promise<Track[]>((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000)),
            ]).catch(() => [])
          );
        }
        if (secondarySeed && secondarySeed.id !== primarySeed?.id) {
          recPromises.push(
            Promise.race([
              RecommendService.getSimilarTracks(secondarySeed),
              new Promise<Track[]>((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000)),
            ]).catch(() => [])
          );
        }

        const [recs1 = [], recs2 = []] = await Promise.all(recPromises);
        
        // Assemble candidate pool
        const candidates: Track[] = [
          ...(primarySeed ? [primarySeed] : []),
          ...(secondarySeed && secondarySeed.id !== primarySeed?.id ? [secondarySeed] : []),
          ...recs1,
          ...recs2,
        ];

        // Backfill from catalogue if candidates are under 8
        if (candidates.length < 8) {
          const catalogueRotated = this.rotateCatalogue(CURATED_TRACKS, dailySeed);
          candidates.push(...catalogueRotated);
        }

        resultTracks = this.curateDiverseCollection(candidates, 8, 12);
      } catch (err) {
        console.warn('[TransmissionService] Recommendation fetch failed, falling back to seed mix:', err);
        // On network failure during manual refresh: preserve current cache to avoid empty state
        if (forceRefresh) {
          const preserved = this.getCachedTransmission(dateKey);
          if (preserved) return preserved;
        }
        const fallbackPool = [...seedPool, ...CURATED_TRACKS];
        resultTracks = this.curateDiverseCollection(fallbackPool, 8, 12);
      }
    }

    // 3. Fallback for new users / empty personalization
    if (!resultTracks || resultTracks.length < 6) {
      // Rotate catalogue deterministically by daily seed
      const rotated = this.rotateCatalogue(CURATED_TRACKS, dailySeed);

      // Attempt to enrich with recommendations for the day's featured catalogue seed
      const featuredSeed = rotated[0];
      try {
        const enriched = await Promise.race([
          RecommendService.getSimilarTracks(featuredSeed),
          new Promise<Track[]>((_, reject) => setTimeout(() => reject(new Error('Timeout')), 4000)),
        ]).catch(() => []);

        const combined = [...rotated, ...enriched];
        resultTracks = this.curateDiverseCollection(combined, 8, 12);
      } catch {
        resultTracks = this.curateDiverseCollection(rotated, 8, 12);
      }
    }

    // Ensure we have at least catalogue tracks if everything else fails
    if (resultTracks.length === 0) {
      if (forceRefresh) {
        const preserved = this.getCachedTransmission(dateKey);
        if (preserved && preserved.tracks.length > 0) return preserved;
      }
      resultTracks = CURATED_TRACKS.slice(0, 8);
    }

    const transmission: DailyTransmission = {
      dateKey,
      displayDate,
      tracks: resultTracks,
      isPersonalized,
      label: isPersonalized ? 'TRANSMISSION OF THE DAY' : 'CURATED TRANSMISSION',
      subtitle: isPersonalized ? 'Tuned to your frequency.' : 'Initial frequency broadcast.',
    };

    // 4. Persist to storage
    storage.setJSON(TRANSMISSION_STORAGE_KEY, transmission);
    return transmission;
  }

  /**
   * Rotates catalogue tracks deterministically based on daily seed
   */
  private static rotateCatalogue(tracks: Track[], seed: number): Track[] {
    if (!tracks || tracks.length === 0) return [];
    const shift = seed % tracks.length;
    return [...tracks.slice(shift), ...tracks.slice(0, shift)];
  }

  /**
   * Curates a diverse track collection:
   * - Deduplicates identical tracks (by title + artist)
   * - Restricts max 2 tracks per artist for variety
   * - Targets between minCount and maxCount
   */
  private static curateDiverseCollection(rawTracks: Track[], minCount = 8, maxCount = 12): Track[] {
    const normalized = rawTracks.map((t) => normalizeTrack(t));
    const unique = deduplicateTracks(normalized);

    const artistCounts = new Map<string, number>();
    const diverse: Track[] = [];

    for (const t of unique) {
      if (!t.title || !t.artist) continue;
      const artistNorm = t.artist.toLowerCase().trim();
      const count = artistCounts.get(artistNorm) || 0;
      if (count >= 2) continue; // enforce artist variety

      artistCounts.set(artistNorm, count + 1);
      diverse.push(t);

      if (diverse.length >= maxCount) break;
    }

    // If variety restriction yielded fewer than minCount, fill remaining from unique pool
    if (diverse.length < minCount) {
      for (const t of unique) {
        if (!diverse.some((d) => d.id === t.id)) {
          diverse.push(t);
        }
        if (diverse.length >= minCount) break;
      }
    }

    return diverse.slice(0, maxCount);
  }
}
