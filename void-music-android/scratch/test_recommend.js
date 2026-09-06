const API_CONFIG = {
  LASTFM_API_URL: 'https://ws.audioscrobbler.com/2.0/',
  LASTFM_PUBLIC_KEY: '77db9b1ef3618ce60cff5c372123ee61',
  SAAVN_PRIMARY: 'https://saavn-api-one.vercel.app/search/songs',
};

function cleanQuery(str) {
  return (str || '')
    .replace(/\(.*?\)|\[.*?\]/g, '')
    .replace(/[^\p{L}\p{N}\s&,]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function cleanTitleKey(title) {
  return cleanQuery(title).toLowerCase().replace(/[^a-z0-9]/g, '');
}

function normalizeKey(title, artist) {
  const t = cleanTitleKey(title);
  const a = (artist || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  return `${t}___${a}`;
}

async function getSimilarTracksTest(track) {
  console.log(`--- Testing getSimilarTracks for: "${track.title}" by "${track.artist}" ---`);
  const cleanTitle = cleanQuery(track.title);
  const seedTitleKey = cleanTitleKey(track.title);
  const candidates = [];
  const artistCounts = new Map();

  function addCandidate(cand) {
    if (!cand || !cand.title) return false;
    const candTitleKey = cleanTitleKey(cand.title);
    // 1. Never recommend the seed track or another version with the same base title
    if (candTitleKey === seedTitleKey) {
      return false;
    }
    const candKey = normalizeKey(cand.title, cand.artist);
    if (candidates.some(c => normalizeKey(c.title, c.artist) === candKey)) {
      return false;
    }
    // 2. Strict artist diversity cap: at most 2 tracks per artist/creator
    const artistNorm = (cand.artist || 'unknown').toLowerCase().trim();
    const count = artistCounts.get(artistNorm) || 0;
    if (count >= 2) {
      return false;
    }
    artistCounts.set(artistNorm, count + 1);
    candidates.push(cand);
    return true;
  }

  // ── STEP 1: Direct Last.fm track.getsimilar with given artist ──
  try {
    const url = `${API_CONFIG.LASTFM_API_URL}?method=track.getsimilar&artist=${encodeURIComponent(
      track.artist
    )}&track=${encodeURIComponent(cleanTitle)}&api_key=${API_CONFIG.LASTFM_PUBLIC_KEY}&format=json&limit=15`;
    const res = await fetch(url);
    if (res.ok) {
      const json = await res.json();
      const list = json?.similartracks?.track;
      if (Array.isArray(list)) {
        for (const item of list) {
          addCandidate({
            title: item.name,
            artist: item.artist?.name || 'Unknown Artist',
            source: 'lastfm-similar',
          });
        }
      }
    }
  } catch (e) {
    console.log('Step 1 err:', e.message);
  }

  // ── STEP 1B: If track.getsimilar returned < 5, find canonical artist via Last.fm track.search ──
  if (candidates.length < 5) {
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
          if (!mArtist || mArtist.toLowerCase() === (track.artist || '').toLowerCase()) continue;
          const simUrl = `${API_CONFIG.LASTFM_API_URL}?method=track.getsimilar&artist=${encodeURIComponent(
            mArtist
          )}&track=${encodeURIComponent(cleanTitle)}&api_key=${API_CONFIG.LASTFM_PUBLIC_KEY}&format=json&limit=15`;
          const simRes = await fetch(simUrl);
          if (simRes.ok) {
            const simJson = await simRes.json();
            const simList = simJson?.similartracks?.track;
            if (Array.isArray(simList)) {
              for (const item of simList) {
                addCandidate({
                  title: item.name,
                  artist: item.artist?.name || 'Unknown Artist',
                  source: `lastfm-canonical-similar (${mArtist})`,
                });
              }
            }
          }
          if (candidates.length >= 10) break;
        }
      }
    } catch (e) {
      console.log('Step 1B err:', e.message);
    }
  }

  // ── STEP 2: Last.fm similar artists & seed artist top tracks ──
  if (candidates.length < 10 && track.artist) {
    try {
      // Allow up to 2 top tracks from seed artist (diversity cap enforces max 2)
      const topUrl = `${API_CONFIG.LASTFM_API_URL}?method=artist.gettoptracks&artist=${encodeURIComponent(
        track.artist
      )}&api_key=${API_CONFIG.LASTFM_PUBLIC_KEY}&format=json&limit=5`;
      const topRes = await fetch(topUrl);
      if (topRes.ok) {
        const topJson = await topRes.json();
        for (const item of topJson?.toptracks?.track || []) {
          addCandidate({
            title: item.name,
            artist: track.artist,
            source: 'lastfm-artist-top',
          });
        }
      }

      // Query similar artists (artist.getsimilar) to maintain genre/style while ensuring diversity
      const simArtUrl = `${API_CONFIG.LASTFM_API_URL}?method=artist.getsimilar&artist=${encodeURIComponent(
        track.artist
      )}&api_key=${API_CONFIG.LASTFM_PUBLIC_KEY}&format=json&limit=5`;
      const simArtRes = await fetch(simArtUrl);
      if (simArtRes.ok) {
        const simArtJson = await simArtRes.json();
        const simArtists = (simArtJson?.similarartists?.artist || []).slice(0, 4);
        for (const sa of simArtists) {
          const saTopUrl = `${API_CONFIG.LASTFM_API_URL}?method=artist.gettoptracks&artist=${encodeURIComponent(
            sa.name
          )}&api_key=${API_CONFIG.LASTFM_PUBLIC_KEY}&format=json&limit=3`;
          const saTopRes = await fetch(saTopUrl);
          if (saTopRes.ok) {
            const saTopJson = await saTopRes.json();
            for (const item of saTopJson?.toptracks?.track || []) {
              addCandidate({
                title: item.name,
                artist: sa.name,
                source: `lastfm-similar-artist (${sa.name})`,
              });
            }
          }
        }
      }
    } catch (e) {
      console.log('Step 2 err:', e.message);
    }
  }

  console.log(`\nTOTAL GENERATED RECOMMENDATIONS: ${candidates.length}`);
  candidates.slice(0, 15).forEach((c, idx) => {
    console.log(`${idx + 1}. "${c.title}" by "${c.artist}" [${c.source}]`);
  });
}

async function run() {
  await getSimilarTracksTest({
    id: 'test-1',
    title: 'Rush E (Minecraft Note Blocks)',
    artist: 'grande1899',
  });

  await getSimilarTracksTest({
    id: 'test-2',
    title: 'Blinding Lights',
    artist: 'The Weeknd',
  });

  await getSimilarTracksTest({
    id: 'test-3',
    title: 'Faded',
    artist: 'Alan Walker',
  });
}
run();
