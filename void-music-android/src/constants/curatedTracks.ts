import { Track } from '../types';
import { normalizeTrack } from '../utils/trackUtils';

export const CATEGORIES = ['ALL', 'CYBERPUNK', 'SYNTHWAVE', 'LO-FI', 'AMBIENT', 'INDUSTRIAL'];

export const RAW_CURATED_TRACKS = [
  {
    id: 'curated-1',
    title: 'Resonance',
    artist: 'HOME',
    album: 'Odyssey',
    artwork: 'https://is1-ssl.mzstatic.com/image/thumb/Music211/v4/4f/13/65/4f1365b0-e97c-c469-c438-2f7d8f204355/872133025584_cover.jpg/600x600bb.jpg',
    duration: 212,
    categories: ['SYNTHWAVE', 'AMBIENT'],
  },
  {
    id: 'curated-2',
    title: 'Turbo Killer',
    artist: 'Carpenter Brut',
    album: 'Trilogy',
    artwork: 'https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/f3/67/b9/f367b929-406d-ef08-6b62-a4322c62c8da/00602557606782.rgb.jpg/600x600bb.jpg',
    duration: 208,
    categories: ['CYBERPUNK', 'INDUSTRIAL', 'SYNTHWAVE'],
  },
  {
    id: 'curated-3',
    title: 'Nightcall',
    artist: 'Kavinsky',
    album: 'OutRun',
    artwork: 'https://is1-ssl.mzstatic.com/image/thumb/Music125/v4/c1/2d/fe/c12dfe8f-cdf6-e179-d69a-8ec35f760266/00602537248681.rgb.jpg/600x600bb.jpg',
    duration: 259,
    categories: ['SYNTHWAVE', 'CYBERPUNK'],
  },
  {
    id: 'curated-4',
    title: 'Tech Noir',
    artist: 'GUNSHIP',
    album: 'GUNSHIP',
    artwork: 'https://is1-ssl.mzstatic.com/image/thumb/Music125/v4/14/82/82/14828219-fd3d-531f-2f05-8a40083fb07f/889326256694_Cover.jpg/600x600bb.jpg',
    duration: 297,
    categories: ['SYNTHWAVE', 'CYBERPUNK'],
  },
  {
    id: 'curated-5',
    title: 'Venger',
    artist: 'Perturbator',
    album: 'The Uncanny Valley',
    artwork: 'https://is1-ssl.mzstatic.com/image/thumb/Music124/v4/b2/d1/5b/b2d15bd9-6ade-7b4d-6426-2fa0e194a71a/764072823713_cover.jpg/600x600bb.jpg',
    duration: 308,
    categories: ['CYBERPUNK', 'INDUSTRIAL', 'SYNTHWAVE'],
  },
  {
    id: 'curated-6',
    title: 'CYBER_DRIFT_808',
    artist: 'NEO_TOKYO_ARCHIVE',
    album: 'VOID LO-FI ARCHIVE',
    duration: 225,
    categories: ['LO-FI', 'CYBERPUNK'],
  },
  {
    id: 'curated-7',
    title: 'After Dark',
    artist: 'Mr.Kitty',
    album: 'Time',
    duration: 259,
    categories: ['SYNTHWAVE', 'CYBERPUNK'],
  },
  {
    id: 'curated-8',
    title: 'Memory Reboot',
    artist: 'VØJ & Narvent',
    album: 'Memory Reboot',
    duration: 103,
    categories: ['SYNTHWAVE', 'CYBERPUNK'],
  },
  {
    id: 'curated-9',
    title: 'Metamorphosis',
    artist: 'INTERWORLD',
    album: 'Metamorphosis',
    duration: 142,
    categories: ['SYNTHWAVE', 'INDUSTRIAL'],
  },
];

export const CURATED_TRACKS: Track[] = RAW_CURATED_TRACKS.map((t) => normalizeTrack(t, 'saavn'));

/**
 * Filter tracks by selected Discover screen category
 */
export function filterTracksByCategory(tracks: Track[], category: string): Track[] {
  if (category === 'ALL') {
    return tracks;
  }
  const target = category.trim().toUpperCase();
  return tracks.filter((t) => {
    if (Array.isArray(t.categories) && t.categories.some((c) => c.trim().toUpperCase() === target)) {
      return true;
    }
    if (t.category && t.category.trim().toUpperCase() === target) {
      return true;
    }
    if (t.genre && t.genre.trim().toUpperCase() === target) {
      return true;
    }
    return false;
  });
}
