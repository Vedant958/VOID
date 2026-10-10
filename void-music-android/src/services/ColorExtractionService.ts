// @ts-ignore
import jpeg from 'jpeg-js';
import { storage } from '../utils/storage';
import { ArtworkAura } from '../store/useThemeStore';

const COLOR_CACHE_PREFIX = 'void_art_aura_v3_';
const memoryAuraCache = new Map<string, ArtworkAura>();

export const DEFAULT_AURA: ArtworkAura = {
  dominant: '#00E575',
  secondary: '#06B6D4',
  tertiary: '#10B981',
  dominantRgb: [0, 229, 117],
  secondaryRgb: [6, 182, 212],
  ambientGlow: 'rgba(0, 229, 117, 0.22)',
};

/**
 * Converts RGB components to HSL color space.
 * [h (0-360), s (0-1), l (0-1)]
 */
function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }
  return [h * 360, s, l];
}

/**
 * Converts HSL components to RGB color space.
 * [r (0-255), g (0-255), b (0-255)]
 */
function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  h = ((h % 360) + 360) % 360;
  h /= 360;
  let r: number;
  let g: number;
  let b: number;

  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }
  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

/**
 * Tunes extracted RGB color to be atmospheric, contrast-safe, and vividly recognizable.
 */
function tuneColor(r: number, g: number, b: number): [number, number, number] {
  const [h, s, l] = rgbToHsl(r, g, b);
  const targetS = Math.min(0.85, Math.max(0.40, s * 1.25));
  const targetL = Math.min(0.58, Math.max(0.38, l));
  return hslToRgb(h, targetS, targetL);
}

function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export class ColorExtractionService {
  /**
   * Derives authentic dominant and secondary ArtworkAura sampled directly from current album artwork.
   * Completely pure-JS, cached in-memory and persistent MMKV.
   */
  static async extractAura(
    artworkUrl?: string,
    trackIdentifier?: string
  ): Promise<ArtworkAura> {
    if (!artworkUrl && !trackIdentifier) {
      return DEFAULT_AURA;
    }

    const cacheKey = (artworkUrl || trackIdentifier) as string;

    // 1. In-memory cache hit
    if (memoryAuraCache.has(cacheKey)) {
      return memoryAuraCache.get(cacheKey)!;
    }

    // 2. Persistent MMKV cache hit
    const stored = storage.getJSON<ArtworkAura | null>(
      `${COLOR_CACHE_PREFIX}${cacheKey}`,
      null
    );
    if (stored && stored.dominant && stored.dominantRgb && stored.dominantRgb.length === 3) {
      memoryAuraCache.set(cacheKey, stored);
      return stored;
    }

    // 3. Extract aura directly from artwork image bytes
    try {
      let aura: ArtworkAura | null = null;

      if (artworkUrl && (artworkUrl.startsWith('http://') || artworkUrl.startsWith('https://'))) {
        aura = await this.sampleArtworkColors(artworkUrl);
      }

      if (!aura) {
        aura = DEFAULT_AURA;
      }

      memoryAuraCache.set(cacheKey, aura);
      storage.setJSON(`${COLOR_CACHE_PREFIX}${cacheKey}`, aura);
      return aura;
    } catch {
      return DEFAULT_AURA;
    }
  }

  /**
   * Fast pure-JS sampling from decoded JPEG image data with vibrancy-weighted hue clustering
   */
  private static async sampleArtworkColors(url: string): Promise<ArtworkAura | null> {
    try {
      let sampleUrl = url;
      // Download lightweight thumbnail for instant sub-100ms decoding
      if (sampleUrl.includes('600x600bb')) {
        sampleUrl = sampleUrl.replace('600x600bb', '60x60bb');
      } else if (sampleUrl.includes('500x500')) {
        sampleUrl = sampleUrl.replace('500x500', '60x60');
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);

      const response = await fetch(sampleUrl, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (!response.ok) return null;

      const buffer = await response.arrayBuffer();
      if (!buffer || buffer.byteLength < 64) return null;

      const decoded = jpeg.decode(new Uint8Array(buffer), { useTArray: true });
      if (!decoded || !decoded.data || decoded.data.length < 16) return null;

      const pixels = decoded.data;

      // 12 Hue clustering bins (30 degrees each)
      const bins = Array.from({ length: 12 }, () => ({
        r: 0,
        g: 0,
        b: 0,
        count: 0,
        weight: 0,
      }));

      let totalR = 0;
      let totalG = 0;
      let totalB = 0;
      let totalCount = 0;

      // Sample pixels
      for (let i = 0; i < pixels.length; i += 4) {
        const r = pixels[i];
        const g = pixels[i + 1];
        const b = pixels[i + 2];
        const a = pixels[i + 3];
        if (a < 128) continue;

        totalR += r;
        totalG += g;
        totalB += b;
        totalCount++;

        const [h, s, l] = rgbToHsl(r, g, b);

        // Filter out extreme blacks, whites, and completely neutral grays for vibrant hue extraction
        if (s < 0.12 || l < 0.10 || l > 0.90) continue;

        const binIdx = Math.min(11, Math.floor(h / 30));
        // Vibrancy weighting: favors saturated mid-tone pixels
        const vibrancy = s * (1 - Math.abs(l - 0.5) * 0.8);
        const weight = Math.max(0.1, vibrancy);

        bins[binIdx].r += r * weight;
        bins[binIdx].g += g * weight;
        bins[binIdx].b += b * weight;
        bins[binIdx].count++;
        bins[binIdx].weight += weight;
      }

      const sortedBins = bins
        .filter((b) => b.count > 0)
        .sort((a, b) => b.weight - a.weight);

      let rawDom: [number, number, number];
      let rawSec: [number, number, number];

      if (sortedBins.length > 0) {
        const top = sortedBins[0];
        rawDom = [
          Math.round(top.r / top.weight),
          Math.round(top.g / top.weight),
          Math.round(top.b / top.weight),
        ];
      } else {
        // Monochrome or low-saturation album artwork fallback (genuine image average)
        rawDom = [
          Math.round(totalR / Math.max(1, totalCount)),
          Math.round(totalG / Math.max(1, totalCount)),
          Math.round(totalB / Math.max(1, totalCount)),
        ];
      }

      if (sortedBins.length > 1) {
        const sec = sortedBins[1];
        rawSec = [
          Math.round(sec.r / sec.weight),
          Math.round(sec.g / sec.weight),
          Math.round(sec.b / sec.weight),
        ];
      } else {
        // Harmonic rotation from dominant
        const [h, s, l] = rgbToHsl(...rawDom);
        rawSec = hslToRgb((h + 40) % 360, s, l);
      }

      const dominantRgb = tuneColor(...rawDom);
      const secondaryRgb = tuneColor(...rawSec);
      const dominant = rgbToHex(...dominantRgb);
      const secondary = rgbToHex(...secondaryRgb);

      const tertRgb: [number, number, number] = [
        Math.round((dominantRgb[0] + secondaryRgb[0]) / 2),
        Math.round((dominantRgb[1] + secondaryRgb[1]) / 2),
        Math.round((dominantRgb[2] + secondaryRgb[2]) / 2),
      ];
      const tertiary = rgbToHex(...tertRgb);

      return {
        dominant,
        secondary,
        tertiary,
        dominantRgb,
        secondaryRgb,
        ambientGlow: `rgba(${dominantRgb[0]}, ${dominantRgb[1]}, ${dominantRgb[2]}, 0.25)`,
      };
    } catch (e) {
      console.warn('[ColorExtractionService] sampleArtworkColors error:', e);
      return null;
    }
  }
}
