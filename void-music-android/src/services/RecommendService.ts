import { API_CONFIG } from '../constants/api';
import { Track } from '../types';
import { normalizeTrack, deduplicateTracks, isMissingArtwork, normalizeKey } from '../utils/trackUtils';
import { ArtworkService } from './ArtworkService';
import { useLibraryStore } from '../store/useLibraryStore';
import { CURATED_TRACKS } from '../constants/curatedTracks';

interface CandidateTrack {
  track: Track;
  rawMatch: number;
  sourceType: 'track_similar' | 'artist_similar' | 'catalogue_genre' | 'discovery';
  matchedGenre?: string;
}

export class RecommendService {
  private static cleanQuery(str?: string): string {
    return (str || '')
      .replace(/\(.*?\)|\[.*?\]/g, '')
      .replace(/[^\p{L}\p{N}\s&,]/gu, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private static getArtistCandidates(artistStr: string): string[] {
    const cleaned = this.cleanQuery(artistStr);
    const candidates: string[] = [];
    if (cleaned) candidates.push(cleaned);

    // Split on delimiters: &, feat., ft., vs., x, comma, /
    const parts = (artistStr || '')
      .split(/\s+(?:&|feat\.?|ft\.?|vs\.?|x|X|\/)\s+|,\s*/i)
      .map((p) => this.cleanQuery(p))
      .filter((p) => p.length > 0);

    for (const part of parts) {
      if (!candidates.includes(part)) {
        candidates.push(part);
      }
    }
    return candidates;
  }

  private static isLowQualityVariation(title: string, seedTitle: string): boolean {
    const lower = title.toLowerCase();
    const seedLower = seedTitle.toLowerCase();
    const badPatterns = [
      /sped up/i,
      /slowed \+ reverb/i,
      /slowed and reverb/i,
      /super slowed/i,
      /nightcore/i,
      /8d audio/i,
      /bass boosted/i,
      /tiktok version/i,
    ];

    for (const pattern of badPatterns) {
      if (pattern.test(lower) && !pattern.test(seedLower)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Smart Similar-Song Queue Generation Engine
   *
   * Ranks candidate tracks using multi-signal similarity scoring:
   * 1. Direct track-level acoustic & collaborative similarity (Last.fm match)
   * 2. Related artist acoustic proximity (Last.fm artist.getsimilar)
   * 3. Shared genre/mood/category alignment
   * 4. User personalization (favorites bonus)
   * 5. Fatigue avoidance (penalizing tracks played in the last 10 session items)
   * 6. Artist diversity enforcement (max 2 tracks per artist)
   */
  static async getSimilarTracks(seedTrack: Track): Promise<Track[]> {
    if (!seedTrack.title) return [];

    const cleanTitle = this.cleanQuery(seedTrack.title);
    const artistCandidates = this.getArtistCandidates(seedTrack.artist || '');
    const seedKey = normalizeKey(seedTrack.artist, cleanTitle);

    // Read user library signals for personalization and fatigue avoidance
    const libraryState = useLibraryStore.getState();
    const likedTracks = libraryState.likedTracks || [];
    const likedKeys = new Set(likedTracks.map((t) => normalizeKey(t.artist, t.title)));
    const likedArtists = new Set(likedTracks.map((t) => (t.artist || '').toLowerCase().trim()));

    const historyItems = (libraryState.history || []).slice(0, 10);
    const recentHistoryKeys = new Set(historyItems.map((h) => normalizeKey(h.track.artist, h.track.title)));

    const rawCandidates: CandidateTrack[] = [];
    const seenCandidateKeys = new Set<string>();

    const addCandidate = (
      cand: Track,
      rawMatch: number,
      sourceType: CandidateTrack['sourceType'],
      matchedGenre?: string
    ) => {
      if (!cand || !cand.title || !cand.artist) return;
      const key = normalizeKey(cand.artist, cand.title);
      if (key === seedKey || seenCandidateKeys.has(key)) return;
      if (this.isLowQualityVariation(cand.title, seedTrack.title)) return;

      seenCandidateKeys.add(key);
      rawCandidates.push({
        track: cand,
        rawMatch,
        sourceType,
        matchedGenre,
      });
    };

    // ── TIER 1: Last.fm track.getsimilar (Exact song similarity) ──
    if (cleanTitle && artistCandidates.length > 0) {
      for (const artist of artistCandidates) {
        try {
          const url = `${API_CONFIG.LASTFM_API_URL}?method=track.getsimilar&artist=${encodeURIComponent(
            artist
          )}&track=${encodeURIComponent(cleanTitle)}&api_key=${
            API_CONFIG.LASTFM_PUBLIC_KEY
          }&format=json&limit=20`;

          const res = await fetch(url);
          if (res.ok) {
            const json = await res.json();
            const list = json?.similartracks?.track;
            if (Array.isArray(list) && list.length > 0) {
              for (const item of list) {
                if (!item?.name) continue;
                const images = item.image || [];
                const largeImage = images.find(
                  (img: any) => img.size === 'extralarge' || img.size === 'large'
                );
                const matchVal = parseFloat(item.match) || 0;

                addCandidate(
                  normalizeTrack(
                    {
                      id: `rec-sim-${rawCandidates.length}-${Date.now()}`,
                      title: item.name,
                      artist: item.artist?.name || 'Unknown Artist',
                      artwork: largeImage ? largeImage['#text'] : undefined,
                      duration: item.duration ? parseInt(item.duration, 10) : undefined,
                      source: 'lastfm',
                    },
                    'lastfm'
                  ),
                  matchVal,
                  'track_similar'
                );
              }
            }
          }
        } catch (err: any) {
          console.log(`[RecommendService] Tier 1 track.getsimilar (${artist}) error:`, err?.message || err);
        }

        if (rawCandidates.length >= 12) break;
      }
    }

    // ── TIER 2: Last.fm artist.getsimilar -> Top Tracks (Related Artist Similarity) ──
    if (rawCandidates.length < 15 && artistCandidates.length > 0) {
      for (const artist of artistCandidates) {
        try {
          const simArtUrl = `${API_CONFIG.LASTFM_API_URL}?method=artist.getsimilar&artist=${encodeURIComponent(
            artist
          )}&api_key=${API_CONFIG.LASTFM_PUBLIC_KEY}&format=json&limit=6`;

          const simArtRes = await fetch(simArtUrl);
          if (simArtRes.ok) {
            const simArtJson = await simArtRes.json();
            const simArtists = (simArtJson?.similarartists?.artist || []).slice(0, 4);

            for (const sa of simArtists) {
              if (!sa?.name) continue;
              const saMatch = parseFloat(sa.match) || 0.5;

              const topUrl = `${API_CONFIG.LASTFM_API_URL}?method=artist.gettoptracks&artist=${encodeURIComponent(
                sa.name
              )}&api_key=${API_CONFIG.LASTFM_PUBLIC_KEY}&format=json&limit=3`;

              const topRes = await fetch(topUrl);
              if (topRes.ok) {
                const topJson = await topRes.json();
                for (const item of topJson?.toptracks?.track || []) {
                  if (!item?.name) continue;
                  const images = item.image || [];
                  const largeImage = images.find(
                    (img: any) => img.size === 'extralarge' || img.size === 'large'
                  );

                  addCandidate(
                    normalizeTrack(
                      {
                        id: `rec-simart-${rawCandidates.length}-${Date.now()}`,
                        title: item.name,
                        artist: sa.name,
                        artwork: largeImage ? largeImage['#text'] : undefined,
                        duration: item.duration ? parseInt(item.duration, 10) : undefined,
                        source: 'lastfm',
                      },
                      'lastfm'
                    ),
                    saMatch * 0.75, // Scale artist match to acoustic proximity
                    'artist_similar'
                  );
                }
              }
              if (rawCandidates.length >= 18) break;
            }
          }
        } catch (err: any) {
          console.log(`[RecommendService] Tier 2 artist.getsimilar (${artist}) error:`, err?.message || err);
        }
        if (rawCandidates.length >= 18) break;
      }
    }

    // ── TIER 3: Local Curated Catalogue Backfill (Genre / Mood Matched) ──
    const seedCategories = [
      ...(seedTrack.categories || []),
      ...(seedTrack.category ? [seedTrack.category] : []),
      ...(seedTrack.genre ? [seedTrack.genre] : []),
    ].map((c) => c.toUpperCase().trim());

    if (seedCategories.length > 0) {
      for (const catTrack of CURATED_TRACKS) {
        const catList = [
          ...(catTrack.categories || []),
          ...(catTrack.category ? [catTrack.category] : []),
          ...(catTrack.genre ? [catTrack.genre] : []),
        ].map((c) => c.toUpperCase().trim());

        const shared = seedCategories.find((sc) => catList.includes(sc));
        if (shared) {
          addCandidate(catTrack, 0.55, 'catalogue_genre', shared);
        }
      }
    }

    // Fallback if everything else is dry
    if (rawCandidates.length < 5) {
      for (const fallbackTrack of CURATED_TRACKS) {
        addCandidate(fallbackTrack, 0.35, 'discovery');
      }
    }

    // ── TRANSPARENT SIMILARITY RANKING & SCORING ────────────────────────────
    const scoredCandidates = rawCandidates.map((c) => {
      const { track: candidate, rawMatch, sourceType, matchedGenre } = c;
      const candKey = normalizeKey(candidate.artist, candidate.title);
      const candArtistLower = (candidate.artist || '').toLowerCase().trim();

      // 1. Base Score (up to 55 points from collaborative/acoustic match)
      let score = rawMatch * 55;

      // 2. Source Type Alignment
      let reason = 'Similar sound';
      if (sourceType === 'track_similar') {
        if (rawMatch >= 0.7) {
          score += 20;
          reason = 'Similar sound';
        } else if (rawMatch >= 0.35) {
          score += 10;
          reason = 'Similar sound';
        }
      } else if (sourceType === 'artist_similar') {
        score += 15;
        reason = 'Related artist';
      } else if (sourceType === 'catalogue_genre' && matchedGenre) {
        score += 20;
        reason = `Shared genre: ${matchedGenre}`;
      } else {
        reason = 'Curated discovery';
      }

      // 3. Personalization Signal (Favorites Bonus)
      if (likedKeys.has(candKey)) {
        score += 18;
        reason = 'Based on your favorites';
      } else if (likedArtists.has(candArtistLower)) {
        score += 8;
      }

      // 4. Listening Fatigue Penalty (Recently played tracks)
      if (recentHistoryKeys.has(candKey)) {
        score -= 25; // Favor fresh recommendations over already played tracks
      }

      const finalScore = Math.min(100, Math.max(5, Math.round(score)));

      return {
        ...candidate,
        similarityScore: finalScore,
        recommendationReason: reason,
      };
    });

    // Sort strictly descending by similarity score
    scoredCandidates.sort((a, b) => (b.similarityScore || 0) - (a.similarityScore || 0));

    // ── ARTIST DIVERSITY ENFORCEMENT ────────────────────────────────────────
    // Enforce max 2 tracks per artist in the generated queue
    const artistCounts = new Map<string, number>();
    const diverseQueue: Track[] = [];

    for (const t of scoredCandidates) {
      const aNorm = (t.artist || 'unknown').toLowerCase().trim();
      const count = artistCounts.get(aNorm) || 0;
      if (count >= 2) continue;

      artistCounts.set(aNorm, count + 1);
      diverseQueue.push(t);

      if (diverseQueue.length >= 14) break;
    }

    const uniqueFinal = deduplicateTracks(diverseQueue);

    // ── HD ARTWORK ENRICHMENT ────────────────────────────────────────────────
    const enrichedWithArtwork = await Promise.all(
      uniqueFinal.map(async (t) => {
        if (t.artwork && !isMissingArtwork(t.artwork)) {
          return t;
        }
        try {
          const hdArt = await ArtworkService.getHDArtwork(t);
          return hdArt ? { ...t, artwork: hdArt } : t;
        } catch {
          return t;
        }
      })
    );

    console.log(
      `[RecommendService] Generated ${enrichedWithArtwork.length} smart similar tracks for "${seedTrack.title}" by "${seedTrack.artist}"`
    );
    return enrichedWithArtwork;
  }

  /**
   * Generates or refreshes the Priority Feeds signal collection.
   * Leverages user library favorites, listening history, rotated curated catalogue anchors,
   * and Last.fm smart acoustic recommendations.
   * Guarantees diverse category coverage across CYBERPUNK, SYNTHWAVE, LO-FI, AMBIENT, and INDUSTRIAL.
   */
  static async getPriorityFeeds(refreshSeed: number = 0): Promise<Track[]> {
    try {
      const libraryState = useLibraryStore.getState();
      const likedTracks = libraryState.likedTracks || [];
      const historyTracks = (libraryState.history || []).map((h) => h.track).filter(Boolean);

      // 1. Shift / rotate curated catalogue by refreshSeed so anchors differ on each tap
      const shift = ((refreshSeed + 1) * 3) % CURATED_TRACKS.length;
      const rotatedCurated = [...CURATED_TRACKS.slice(shift), ...CURATED_TRACKS.slice(0, shift)];

      // 2. Select diverse seed tracks across different musical vibes
      const candidateSeeds: Track[] = [];
      if (likedTracks.length > 0) {
        candidateSeeds.push(likedTracks[refreshSeed % likedTracks.length]);
      }
      if (historyTracks.length > 0 && candidateSeeds.length < 2) {
        const hSeed = historyTracks[(refreshSeed + 1) % historyTracks.length];
        if (!candidateSeeds.some((s) => s.id === hSeed.id)) {
          candidateSeeds.push(hSeed);
        }
      }
      // Always include diverse curated anchors to ensure broad acoustic coverage
      for (const c of rotatedCurated) {
        if (!candidateSeeds.some((s) => s.id === c.id)) {
          candidateSeeds.push(c);
          if (candidateSeeds.length >= 3) break;
        }
      }

      // 3. Fetch smart recommendations for candidate seeds with a 4s safety timeout
      const recPromises = candidateSeeds.map((seed) =>
        Promise.race([
          this.getSimilarTracks(seed),
          new Promise<Track[]>((_, reject) => setTimeout(() => reject(new Error('Timeout')), 4000)),
        ])
          .then((recs) => {
            // Propagate categories from the seed track so category filtering works seamlessly
            return recs.map((t) => ({
              ...t,
              categories: (t.categories && t.categories.length > 0) ? t.categories : (seed.categories || ['SYNTHWAVE', 'CYBERPUNK']),
            }));
          })
          .catch(() => [] as Track[])
      );

      const recResults = await Promise.all(recPromises);
      const flattenedRecs = recResults.flat();

      // 4. Combine recommendations with rotated curated catalogue
      const combined = [...flattenedRecs, ...rotatedCurated];
      const normalized = combined.map((t) => normalizeTrack(t));
      const unique = deduplicateTracks(normalized);

      // 5. Enforce artist variety (max 2 per artist)
      const artistCounts = new Map<string, number>();
      const diverse: Track[] = [];

      for (const t of unique) {
        if (!t.title || !t.artist) continue;
        const aNorm = t.artist.toLowerCase().trim();
        const count = artistCounts.get(aNorm) || 0;
        if (count >= 2) continue;
        artistCounts.set(aNorm, count + 1);
        diverse.push(t);
        if (diverse.length >= 18) break;
      }

      // 6. Enrich missing artwork
      const hydrated = await Promise.all(
        diverse.map(async (t) => {
          if (!t.artwork) {
            const art = await ArtworkService.getHDArtwork(t);
            return art ? { ...t, artwork: art } : t;
          }
          return t;
        })
      );

      return hydrated.length >= 4 ? hydrated : rotatedCurated;
    } catch (err) {
      console.warn('[RecommendService] getPriorityFeeds error:', err);
      return CURATED_TRACKS;
    }
  }
}
