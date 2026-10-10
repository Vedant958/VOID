import { API_CONFIG } from '../constants/api';
import { Track, ResolvedSource } from '../types';

/**
 * Safe fetch wrapper for React Native Hermes engine.
 */
async function fetchWithTimeout(url: string, timeoutMs = 4500): Promise<Response> {
  let timer: any;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`Timeout after ${timeoutMs}ms`)), timeoutMs);
  });

  let controller: AbortController | null = null;
  try {
    if (typeof AbortController !== 'undefined') {
      controller = new AbortController();
    }
  } catch {}

  const fetchPromise = fetch(url, {
    headers: { Accept: 'application/json', 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
    ...(controller ? { signal: controller.signal } : {}),
  });

  try {
    return await Promise.race([fetchPromise, timeoutPromise]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export interface TrackMatchResult {
  passed: boolean;
  score: number;
  reason?: string;
  matchedTitle: string;
  matchedArtist: string;
}

export type StreamResolutionResult =
  | { status: 'success'; source: ResolvedSource }
  | { status: 'unavailable'; reason: string }
  | { status: 'network_error'; error: string };

export class StreamResolver {
  private static cleanStr(s?: string): string {
    return (s || '')
      .toLowerCase()
      .replace(/\(.*?\)|\[.*?\]/g, '')
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Word-overlap and token similarity metric (0.0 to 1.0)
   */
  static computeSimilarity(s1?: string, s2?: string): number {
    const c1 = this.cleanStr(s1);
    const c2 = this.cleanStr(s2);
    if (!c1 || !c2) return 0;
    if (c1 === c2) return 1.0;

    const w1 = c1.split(' ').filter(Boolean);
    const w2 = c2.split(' ').filter(Boolean);
    if (w1.length === 0 || w2.length === 0) return 0;

    const set1 = new Set(w1);
    const set2 = new Set(w2);

    let common = 0;
    for (const w of set1) {
      if (set2.has(w)) common++;
    }

    // Jaccard similarity across unique token sets
    const jaccard = common / (set1.size + set2.size - common);

    // If one is an exact prefix or suffix with >= 80% character coverage
    if (
      (c1.startsWith(c2) || c2.startsWith(c1)) &&
      Math.min(c1.length, c2.length) / Math.max(c1.length, c2.length) >= 0.8
    ) {
      return Math.max(jaccard, 0.85);
    }

    return jaccard;
  }

  /**
   * Validates and scores candidate tracks from Saavn to ensure
   * strict track identity preservation and prevent playing unrelated songs.
   */
  static validateTrackMatch(candidate: any, target: Track): TrackMatchResult {
    const targetTitle = this.cleanStr(target.title);
    const targetArtist = this.cleanStr(target.artist);

    const candRawTitle = String(candidate.title || candidate.name || '');
    const candTitle = this.cleanStr(candRawTitle);
    const candRawArtist = String(
      candidate.artist || candidate.primaryArtists || candidate.singers || ''
    );
    const candArtist = this.cleanStr(candRawArtist);
    const lowerCandTitle = candRawTitle.toLowerCase();

    // 1. Title Similarity Check
    const titleSim = this.computeSimilarity(candTitle, targetTitle);
    if (titleSim < 0.55) {
      return {
        passed: false,
        score: 0,
        reason: `Title mismatch: "${candTitle}" vs "${targetTitle}" (sim: ${titleSim.toFixed(2)})`,
        matchedTitle: candRawTitle,
        matchedArtist: candRawArtist,
      };
    }

    // 2. Artist Similarity Check
    // Split candidate artists by common artist separators (comma, &, feat, ft, slash)
    const candArtistEntities = candRawArtist
      .split(/[,&/|]|\sfeat\.?\s|\sft\.?\s/i)
      .map((a) => this.cleanStr(a))
      .filter(Boolean);

    let artistSim = this.computeSimilarity(candArtist, targetArtist);
    for (const entity of candArtistEntities) {
      const sim = this.computeSimilarity(entity, targetArtist);
      if (sim > artistSim) artistSim = sim;
    }

    // Multi-artist split check on target (e.g. target is "VØJ & Narvent", candidate has "VØJ")
    if (artistSim < 0.5 && targetArtist) {
      const parts = targetArtist.split(/\s*(?:&|,|\/|feat\.?|ft\.?)\s*/);
      for (const p of parts) {
        if (p.length > 2) {
          const cleanP = this.cleanStr(p);
          for (const entity of candArtistEntities) {
            const pSim = this.computeSimilarity(entity, cleanP);
            if (pSim >= 0.75) {
              artistSim = Math.max(artistSim, 0.8);
              break;
            }
          }
        }
      }
    }

    // Check if target artist appears as featured or explicit creator in candidate title
    if (artistSim < 0.5 && targetArtist) {
      const isArtistInTitle =
        lowerCandTitle.includes(`feat. ${targetArtist}`) ||
        lowerCandTitle.includes(`ft. ${targetArtist}`) ||
        lowerCandTitle.includes(`by ${targetArtist}`) ||
        lowerCandTitle.startsWith(`${targetArtist} -`);
      if (isArtistInTitle) {
        artistSim = Math.max(artistSim, 0.75);
      }
    }

    if (targetArtist && artistSim < 0.45) {
      return {
        passed: false,
        score: 0,
        reason: `Artist mismatch: "${candRawArtist}" vs "${target.artist}" (sim: ${artistSim.toFixed(2)})`,
        matchedTitle: candRawTitle,
        matchedArtist: candRawArtist,
      };
    }

    // 3. Duration Consistency Check
    if (typeof target.duration === 'number' && target.duration > 30) {
      const candDurRaw = candidate.duration;
      const candDuration = candDurRaw ? parseInt(String(candDurRaw), 10) : 0;
      if (!isNaN(candDuration) && candDuration > 0) {
        // Disqualify short clips/previews (< 45s when target is a full track >= 90s)
        if (candDuration < 45 && target.duration >= 90) {
          return {
            passed: false,
            score: 0,
            reason: `Disqualified: candidate is a short clip/preview (${candDuration}s vs target ${target.duration}s)`,
            matchedTitle: candRawTitle,
            matchedArtist: candRawArtist,
          };
        }

        const diff = Math.abs(candDuration - target.duration);
        const ratioDiff = diff / target.duration;

        // Tolerance: max 18% difference AND max 20 seconds, or absolute difference > 35s
        if ((ratioDiff > 0.18 && diff > 20) || diff > 35) {
          return {
            passed: false,
            score: 0,
            reason: `Duration mismatch: candidate is ${candDuration}s vs target ${target.duration}s (diff: ${diff}s, ${(ratioDiff * 100).toFixed(0)}%)`,
            matchedTitle: candRawTitle,
            matchedArtist: candRawArtist,
          };
        }
      }
    }

    // Penalty checks (Disqualify covers, remixes unless target requested it)
    const isTargetCover = targetTitle.includes('cover');
    const isTargetRemix = targetTitle.includes('remix');

    if (
      !isTargetCover &&
      (lowerCandTitle.includes('cover') || lowerCandTitle.includes('tribute') || lowerCandTitle.includes('parody'))
    ) {
      return {
        passed: false,
        score: 0,
        reason: 'Disqualified: candidate is a cover/tribute/parody',
        matchedTitle: candRawTitle,
        matchedArtist: candRawArtist,
      };
    }

    if (
      !isTargetRemix &&
      (lowerCandTitle.includes('remix') || lowerCandTitle.includes('flip') || lowerCandTitle.includes('bootleg'))
    ) {
      return {
        passed: false,
        score: 0,
        reason: 'Disqualified: candidate is an unrequested remix',
        matchedTitle: candRawTitle,
        matchedArtist: candRawArtist,
      };
    }

    const finalScore = titleSim * 0.55 + (targetArtist ? artistSim * 0.45 : 0.45);
    return {
      passed: true,
      score: finalScore,
      matchedTitle: candRawTitle,
      matchedArtist: candRawArtist,
    };
  }

  /**
   * Primary Entry Point:
   * 1. JioSaavn direct high-bitrate full-track stream (320kbps / 160kbps MP4/MP3) with strict identity verification.
   * 2. Zero iTunes 30s preview fallbacks.
   * 3. Distinguishes genuine unavailability from temporary network errors.
   */
  static async resolve(track: Track): Promise<StreamResolutionResult> {
    // 0. If track already has a verified non-expired full direct streamUrl
    if (
      track.streamUrl &&
      track.streamUrl.startsWith('http') &&
      !track.streamUrl.includes('audio-ssl.itunes.apple.com') &&
      !track.isPreview
    ) {
      return {
        status: 'success',
        source: {
          sourceType: 'direct',
          streamUrl: track.streamUrl,
          isPreview: false,
          duration: track.duration,
          bitrate: track.bitrate || 'direct',
        },
      };
    }

    const cleanQuery = `${(track.title || '').replace(/[^\w\s]/gi, ' ')} ${(track.artist || '').replace(/[^\w\s]/gi, ' ')}`
      .replace(/\s+/g, ' ')
      .trim();

    if (!cleanQuery) {
      return { status: 'unavailable', reason: 'Invalid or missing title/artist metadata' };
    }

    // Helper to safely extract results array from varied API schemas
    const parseResults = (json: any): any[] => {
      if (!json || typeof json !== 'object') return [];
      if (Array.isArray(json)) return json;
      if (Array.isArray(json.data?.results)) return json.data.results;
      if (Array.isArray(json.data)) return json.data;
      if (Array.isArray(json.results)) return json.results;
      return [];
    };

    // ── 1. JioSaavn Direct Full Audio Stream (Multi-Mirror with Retries) ──────────
    const saavnMirrors = [
      `${API_CONFIG.SAAVN_PRIMARY}?query=${encodeURIComponent(cleanQuery)}`,
      `${API_CONFIG.SAAVN_FALLBACK}?query=${encodeURIComponent(cleanQuery)}`,
      `https://saavn.dev/api/search/songs?query=${encodeURIComponent(cleanQuery)}&limit=5`,
    ];

    let respondedMirrorsCount = 0;
    let networkErrorCount = 0;

    for (const mirrorUrl of saavnMirrors) {
      try {
        const res = await fetchWithTimeout(mirrorUrl, 4000);
        if (res.ok) {
          respondedMirrorsCount++;
          const text = await res.text();
          let json: any = null;
          try {
            json = JSON.parse(text);
          } catch {}
          const results = parseResults(json);

          for (const cand of results) {
            const check = this.validateTrackMatch(cand, track);
            if (check.passed) {
              const streamData = this.extractSaavnDirectUrl(cand);
              if (streamData) {
                const parsedDuration = cand.duration ? parseInt(String(cand.duration), 10) : (track.duration ?? 0);
                const finalDuration = !isNaN(parsedDuration) && parsedDuration > 0 ? parsedDuration : undefined;
                console.log(
                  `[StreamResolver] Verified Saavn full stream: "${cand.name || cand.title}" — ${cand.primaryArtists || 'Artist'} (${streamData.bitrate})`
                );
                return {
                  status: 'success',
                  source: {
                    sourceType: 'direct',
                    streamUrl: streamData.streamUrl,
                    isPreview: false,
                    duration: finalDuration,
                    bitrate: streamData.bitrate,
                  },
                };
              }
            }
          }
        }
      } catch (err: any) {
        networkErrorCount++;
      }
    }

    // Distinguish genuine catalog unavailability from temporary network connection failure
    if (respondedMirrorsCount > 0) {
      console.log(`[StreamResolver] Song not available in JioSaavn catalog: "${track.title}" by "${track.artist}".`);
      return { status: 'unavailable', reason: 'No matching full-track stream found in JioSaavn' };
    }

    if (networkErrorCount === saavnMirrors.length) {
      console.warn(`[StreamResolver] Network error querying mirrors for "${track.title}".`);
      return { status: 'network_error', error: 'Failed to contact JioSaavn mirrors due to network error' };
    }

    return { status: 'unavailable', reason: 'Song not available on streaming mirrors' };
  }

  /**
   * Safely extracts direct 320kbps / 160kbps MP4/MP3 link and verified bitrate from a verified Saavn candidate.
   */
  private static extractSaavnDirectUrl(cand: any): { streamUrl: string; bitrate: string } | null {
    if (!cand || typeof cand !== 'object') return null;

    if (Array.isArray(cand.downloadUrl) && cand.downloadUrl.length > 0) {
      const validUrls: { quality: string; url: string }[] = [];
      for (const d of cand.downloadUrl) {
        if (typeof d === 'string' && d.startsWith('http')) {
          validUrls.push({ quality: 'unknown', url: d });
        } else if (d && typeof d === 'object') {
          const u = (d as any).link || (d as any).url;
          if (typeof u === 'string' && u.startsWith('http')) {
            validUrls.push({ quality: String((d as any).quality || '').toLowerCase(), url: u });
          }
        }
      }

      if (validUrls.length > 0) {
        const preferred =
          validUrls.find((x) => x.quality.includes('320')) ||
          validUrls.find((x) => x.quality.includes('160')) ||
          validUrls.find((x) => x.quality.includes('96')) ||
          validUrls[validUrls.length - 1];
        if (preferred && preferred.url) {
          const bitrate =
            preferred.quality && preferred.quality !== 'unknown'
              ? preferred.quality
              : '320kbps';
          return {
            streamUrl: preferred.url.replace(/^http:\/\//i, 'https://'),
            bitrate,
          };
        }
      }
    }

    if (typeof cand.downloadUrl === 'string' && cand.downloadUrl.startsWith('http')) {
      return {
        streamUrl: cand.downloadUrl.replace(/^http:\/\//i, 'https://'),
        bitrate: 'direct',
      };
    }

    if (typeof cand.media_url === 'string' && cand.media_url.startsWith('http')) {
      return {
        streamUrl: cand.media_url.replace(/^http:\/\//i, 'https://'),
        bitrate: 'direct',
      };
    }

    return null;
  }
}
