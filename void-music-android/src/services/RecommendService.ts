import { API_CONFIG } from '../constants/api';
import { Track } from '../types';
import { normalizeTrack, deduplicateTracks, isMissingArtwork } from '../utils/trackUtils';
import { ArtworkService } from './ArtworkService';

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

  private static normalizeKey(title?: string, artist?: string): string {
    const t = this.cleanQuery(title).toLowerCase().replace(/[^a-z0-9]/g, '');
    const a = (artist || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    return `${t}___${a}`;
  }

  private static cleanTitleKey(title?: string): string {
    return this.cleanQuery(title).toLowerCase().replace(/[^a-z0-9]/g, '');
  }

  /**
   * Multi-tier recommendation engine ported from the website's proven logic.
   * Resolves genuine song radio recommendations from Last.fm with Saavn fallback,
   * preserving artist diversity and preventing creator catalogue flooding.
   */
  static async getSimilarTracks(track: Track): Promise<Track[]> {
    if (!track.title) return [];

    const cleanTitle = this.cleanQuery(track.title);
    const seedTitleKey = this.cleanTitleKey(track.title);
    const artistCandidates = this.getArtistCandidates(track.artist || '');
    const seedKey = this.normalizeKey(cleanTitle, track.artist);
    let rawCandidates: Track[] = [];
    const artistCounts = new Map<string, number>();

    const addCandidate = (cand: Track): boolean => {
      if (!cand || !cand.title) return false;
      const candTitleKey = this.cleanTitleKey(cand.title);
      // Exclude seed track or any variation of seed title
      if (candTitleKey === seedTitleKey) return false;
      const candKey = this.normalizeKey(cand.title, cand.artist);
      if (candKey === seedKey) return false;
      if (rawCandidates.some((c) => this.normalizeKey(c.title, c.artist) === candKey)) return false;

      // Enforce artist diversity: max 2 tracks per artist in candidate pool
      const artistNorm = (cand.artist || 'unknown').toLowerCase().trim();
      const count = artistCounts.get(artistNorm) || 0;
      if (count >= 2) return false;

      artistCounts.set(artistNorm, count + 1);
      rawCandidates.push(cand);
      return true;
    };

    // ── TIER 1: Last.fm track.getsimilar with given artist candidates ──
    if (cleanTitle && artistCandidates.length > 0) {
      for (const artist of artistCandidates) {
        try {
          const url = `${API_CONFIG.LASTFM_API_URL}?method=track.getsimilar&artist=${encodeURIComponent(
            artist
          )}&track=${encodeURIComponent(cleanTitle)}&api_key=${
            API_CONFIG.LASTFM_PUBLIC_KEY
          }&format=json&limit=15`;

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
                  )
                );
              }
            }
          }
        } catch (err: any) {
          console.log(`[RecommendService] Tier 1 track.getsimilar (${artist}) skipped:`, err?.message || err);
        }

        if (rawCandidates.length >= 8) break;
      }
    }

    // ── TIER 1B: If track.getsimilar returned < 5, find canonical artist via Last.fm track.search ──
    // Resolves covers, note-block versions, adaptations (e.g. Rush E by Sheet Music Boss instead of channel cover)
    if (rawCandidates.length < 5 && cleanTitle) {
      try {
        const searchUrl = `${API_CONFIG.LASTFM_API_URL}?method=track.search&track=${encodeURIComponent(
          cleanTitle
        )}&api_key=${API_CONFIG.LASTFM_PUBLIC_KEY}&format=json&limit=5`;
        const sRes = await fetch(searchUrl);
        if (sRes.ok) {
          const sJson = await sRes.json();
          const matches = sJson?.results?.trackmatches?.track || [];
          for (const m of matches) {
            const mArtist = m.artist;
            if (!mArtist || artistCandidates.some((a) => a.toLowerCase() === mArtist.toLowerCase())) continue;
            try {
              const simUrl = `${API_CONFIG.LASTFM_API_URL}?method=track.getsimilar&artist=${encodeURIComponent(
                mArtist
              )}&track=${encodeURIComponent(cleanTitle)}&api_key=${
                API_CONFIG.LASTFM_PUBLIC_KEY
              }&format=json&limit=15`;
              const simRes = await fetch(simUrl);
              if (simRes.ok) {
                const simJson = await simRes.json();
                const simList = simJson?.similartracks?.track;
                if (Array.isArray(simList) && simList.length > 0) {
                  for (const item of simList) {
                    if (!item?.name) continue;
                    const images = item.image || [];
                    const largeImage = images.find(
                      (img: any) => img.size === 'extralarge' || img.size === 'large'
                    );

                    addCandidate(
                      normalizeTrack(
                        {
                          id: `rec-sim-canon-${rawCandidates.length}-${Date.now()}`,
                          title: item.name,
                          artist: item.artist?.name || 'Unknown Artist',
                          artwork: largeImage ? largeImage['#text'] : undefined,
                          duration: item.duration ? parseInt(item.duration, 10) : undefined,
                          source: 'lastfm',
                        },
                        'lastfm'
                      )
                    );
                  }
                }
              }
            } catch {}
            if (rawCandidates.length >= 8) break;
          }
        }
      } catch (err: any) {
        console.log('[RecommendService] Tier 1B canonical search skipped:', err?.message || err);
      }
    }

    // ── TIER 2: Last.fm artist.gettoptracks & artist.getsimilar ─────────────
    if (rawCandidates.length < 8 && artistCandidates.length > 0) {
      for (const artist of artistCandidates) {
        try {
          // Top tracks for artist (capped at 2 by addCandidate)
          const topUrl = `${API_CONFIG.LASTFM_API_URL}?method=artist.gettoptracks&artist=${encodeURIComponent(
            artist
          )}&api_key=${API_CONFIG.LASTFM_PUBLIC_KEY}&format=json&limit=5`;

          const res = await fetch(topUrl);
          if (res.ok) {
            const json = await res.json();
            const list = json?.toptracks?.track;
            if (Array.isArray(list) && list.length > 0) {
              for (const item of list) {
                if (!item?.name) continue;
                const images = item.image || [];
                const largeImage = images.find(
                  (img: any) => img.size === 'extralarge' || img.size === 'large'
                );

                addCandidate(
                  normalizeTrack(
                    {
                      id: `rec-top-${rawCandidates.length}-${Date.now()}`,
                      title: item.name,
                      artist,
                      artwork: largeImage ? largeImage['#text'] : undefined,
                      duration: item.duration ? parseInt(item.duration, 10) : undefined,
                      source: 'lastfm',
                    },
                    'lastfm'
                  )
                );
              }
            }
          }

          // Similar artists to expand diversity while preserving musical genre/style
          const simArtUrl = `${API_CONFIG.LASTFM_API_URL}?method=artist.getsimilar&artist=${encodeURIComponent(
            artist
          )}&api_key=${API_CONFIG.LASTFM_PUBLIC_KEY}&format=json&limit=5`;
          const simArtRes = await fetch(simArtUrl);
          if (simArtRes.ok) {
            const simArtJson = await simArtRes.json();
            const simArtists = (simArtJson?.similarartists?.artist || []).slice(0, 4);
            for (const sa of simArtists) {
              if (!sa?.name) continue;
              const saTopUrl = `${API_CONFIG.LASTFM_API_URL}?method=artist.gettoptracks&artist=${encodeURIComponent(
                sa.name
              )}&api_key=${API_CONFIG.LASTFM_PUBLIC_KEY}&format=json&limit=3`;
              const saTopRes = await fetch(saTopUrl);
              if (saTopRes.ok) {
                const saTopJson = await saTopRes.json();
                for (const item of saTopJson?.toptracks?.track || []) {
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
                    )
                  );
                }
              }
              if (rawCandidates.length >= 10) break;
            }
          }
        } catch (err: any) {
          console.log(`[RecommendService] Tier 2 artist exploration (${artist}) skipped:`, err?.message || err);
        }

        if (rawCandidates.length >= 8) break;
      }
    }

    // ── TIER 3: Saavn search for related tracks by cleanTitle (matching website script.js) ──
    if (rawCandidates.length < 5 && cleanTitle) {
      try {
        const saavnUrl = `${API_CONFIG.SAAVN_PRIMARY}?query=${encodeURIComponent(cleanTitle)}`;
        const res = await fetch(saavnUrl);
        if (res.ok) {
          const json = await res.json();
          const list = json?.data?.results;
          if (Array.isArray(list)) {
            for (const item of list) {
              if (!item?.name) continue;
              const images = item.image || [];
              const highImage = images.find((img: any) => img.quality === '500x500') || images[images.length - 1];

              addCandidate(
                normalizeTrack(
                  {
                    id: `rec-saavn-${rawCandidates.length}-${Date.now()}`,
                    title: item.name,
                    artist: item.primaryArtists || item.artists?.primary?.[0]?.name || 'Unknown Artist',
                    artwork: highImage?.link || highImage?.url,
                    duration: item.duration ? parseInt(item.duration, 10) : undefined,
                    source: 'saavn',
                  },
                  'saavn'
                )
              );
            }
          }
        }
      } catch (err: any) {
        console.log('[RecommendService] Tier 3 Saavn search skipped:', err?.message || err);
      }
    }

    const uniqueCandidates = deduplicateTracks(rawCandidates);

    // ── HD ARTWORK ENRICHMENT ────────────────────────────────────────────────
    // Ensure every recommendation has valid artwork before entering the Queue/Player
    const enrichedWithArtwork = await Promise.all(
      uniqueCandidates.map(async (t) => {
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

    console.log(`[RecommendService] Total enriched recommendations resolved: ${enrichedWithArtwork.length}`);
    return enrichedWithArtwork;
  }
}
