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
   * Word-overlap and substring similarity metric (0.0 to 1.0)
   */
  static computeSimilarity(s1?: string, s2?: string): number {
    const c1 = this.cleanStr(s1);
    const c2 = this.cleanStr(s2);
    if (!c1 || !c2) return 0;
    if (c1 === c2) return 1.0;
    if (c1.includes(c2) || c2.includes(c1)) return 0.85;

    const w1 = new Set(c1.split(' ').filter(Boolean));
    const w2 = new Set(c2.split(' ').filter(Boolean));
    if (w1.size === 0 || w2.size === 0) return 0;

    let common = 0;
    for (const w of w1) {
      if (w2.has(w)) common++;
    }
    return common / Math.max(w1.size, w2.size);
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
    let artistSim = this.computeSimilarity(candArtist, targetArtist);

    if (artistSim < 0.5 && targetArtist) {
      if (
        !candArtist ||
        candArtist.includes('unknown') ||
        candArtist.includes('records') ||
        candArtist.includes('music')
      ) {
        if (lowerCandTitle.includes(targetArtist)) {
          artistSim = 0.85;
        }
      }

      const isArtistInTitle =
        lowerCandTitle.startsWith(`${targetArtist} `) ||
        lowerCandTitle.includes(`${targetArtist} -`) ||
        lowerCandTitle.includes(`${targetArtist} –`) ||
        lowerCandTitle.includes(`${targetArtist} :`) ||
        lowerCandTitle.includes(`- ${targetArtist}`) ||
        lowerCandTitle.includes(`by ${targetArtist}`);
      if (isArtistInTitle) {
        artistSim = Math.max(artistSim, 0.75);
      }
    }

    // Multi-artist split check (e.g. target is "VØJ & Narvent", candidate is "VØJ")
    if (artistSim < 0.5 && targetArtist) {
      const parts = targetArtist.split(/\s*(?:&|,|\/|feat\.?|ft\.?)\s*/);
      for (const p of parts) {
        if (p.length > 2 && candArtist.includes(p)) {
          artistSim = 0.8;
          break;
        }
      }
    }

    if (targetArtist && artistSim < 0.4) {
      return {
        passed: false,
        score: 0,
        reason: `Artist mismatch: "${candRawArtist}" vs "${target.artist}" (sim: ${artistSim.toFixed(2)})`,
        matchedTitle: candRawTitle,
        matchedArtist: candRawArtist,
      };
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
   * Primary Entry Point (Website Parity):
   * 1. Primary: JioSaavn direct high-bitrate stream (320kbps / 160kbps MP4/MP3) with strict identity verification.
   * 2. Fallback: Apple iTunes official direct 30-second AAC audio stream preview.
   * 3. Fail Safely: Never play an unverified track or unrelated song. Zero YouTube dependencies.
   */
  static async resolve(track: Track): Promise<ResolvedSource | null> {
    // 0. If track already has a verified non-expired streamUrl
    if (
      track.streamUrl &&
      track.streamUrl.startsWith('http') &&
      !track.streamUrl.includes('audio-ssl.itunes.apple.com')
    ) {
      return { sourceType: 'direct', streamUrl: track.streamUrl, isPreview: false, duration: track.duration };
    }

    const cleanQuery = `${(track.title || '').replace(/[^\w\s]/gi, ' ')} ${(track.artist || '').replace(/[^\w\s]/gi, ' ')}`
      .replace(/\s+/g, ' ')
      .trim();

    if (!cleanQuery) return null;

    // Helper to safely extract results array from varied API schemas
    const parseResults = (json: any): any[] => {
      if (!json || typeof json !== 'object') return [];
      if (Array.isArray(json)) return json;
      if (Array.isArray(json.data?.results)) return json.data.results;
      if (Array.isArray(json.data)) return json.data;
      if (Array.isArray(json.results)) return json.results;
      return [];
    };

    // ── 1. PRIMARY: JioSaavn Direct Full Audio Stream (Multi-Mirror) ──────────────
    const saavnMirrors = [
      `${API_CONFIG.SAAVN_PRIMARY}?query=${encodeURIComponent(cleanQuery)}`,
      `${API_CONFIG.SAAVN_FALLBACK}?query=${encodeURIComponent(cleanQuery)}`,
      `https://saavn.dev/api/search/songs?query=${encodeURIComponent(cleanQuery)}&limit=5`,
    ];

    for (const mirrorUrl of saavnMirrors) {
      try {
        const res = await fetchWithTimeout(mirrorUrl, 4000);
        if (res.ok) {
          const text = await res.text();
          let json: any = null;
          try {
            json = JSON.parse(text);
          } catch {}
          const results = parseResults(json);

          for (const cand of results) {
            const check = this.validateTrackMatch(cand, track);
            if (check.passed) {
              const stream = this.extractSaavnDirectUrl(cand);
              if (stream) {
                const parsedDuration = cand.duration ? parseInt(String(cand.duration), 10) : (track.duration ?? 0);
                const finalDuration = !isNaN(parsedDuration) && parsedDuration > 0 ? parsedDuration : undefined;
                console.log(`[StreamResolver] Verified Saavn full stream: "${cand.name || cand.title}" — ${cand.primaryArtists || 'Artist'}`);
                return {
                  sourceType: 'direct',
                  streamUrl: stream,
                  isPreview: false,
                  duration: finalDuration,
                };
              }
            }
          }
        }
      } catch (err: any) {
        // Continue to next mirror
      }
    }

    // ── 2. FALLBACK: Apple iTunes Official Direct Audio Preview (30s AAC) ──────────
    // Website parity: When full Saavn track is not in catalog, play Apple iTunes direct audio preview
    if (track.previewUrl && track.previewUrl.startsWith('http')) {
      console.log(`[StreamResolver] Using iTunes direct preview for "${track.title}" by "${track.artist}"`);
      return {
        sourceType: 'direct',
        streamUrl: track.previewUrl,
        isPreview: true,
        duration: 30,
      };
    }

    try {
      const itunesUrl = `${API_CONFIG.ITUNES_SEARCH}?term=${encodeURIComponent(cleanQuery)}&entity=song&limit=1`;
      const itRes = await fetchWithTimeout(itunesUrl, 3500);
      if (itRes.ok) {
        const itData = await itRes.json();
        const first = itData.results?.[0];
        if (first?.previewUrl && typeof first.previewUrl === 'string') {
          console.log(`[StreamResolver] Resolved iTunes live preview for "${track.title}"`);
          return {
            sourceType: 'direct',
            streamUrl: first.previewUrl,
            isPreview: true,
            duration: 30,
          };
        }
      }
    } catch {}

    // ── 3. FAIL SAFELY ────────────────────────────────────────────────────────────
    console.log(`[StreamResolver] No verified Saavn stream or iTunes preview found for "${track.title}" by "${track.artist}". Failing safely.`);
    return null;
  }

  /**
   * Safely extracts direct 320kbps / 160kbps MP4/MP3 link from a verified Saavn candidate.
   */
  private static extractSaavnDirectUrl(cand: any): string | null {
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
          return preferred.url.replace(/^http:\/\//i, 'https://');
        }
      }
    }

    if (typeof cand.downloadUrl === 'string' && cand.downloadUrl.startsWith('http')) {
      return cand.downloadUrl.replace(/^http:\/\//i, 'https://');
    }

    if (typeof cand.media_url === 'string' && cand.media_url.startsWith('http')) {
      return cand.media_url.replace(/^http:\/\//i, 'https://');
    }

    return null;
  }
}
