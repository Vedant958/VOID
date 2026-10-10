const API_KEY = '77db9b1ef3618ce60cff5c372123ee61';
const BASE_URL = 'https://ws.audioscrobbler.com/2.0/';

async function testSmartRecommendations(seedTitle, seedArtist, seedCategories = []) {
  console.log(`\n======================================================`);
  console.log(`TEST SEED: "${seedTitle}" by "${seedArtist}" [tags: ${seedCategories.join(', ')}]`);
  console.log(`======================================================`);

  const cleanTitle = seedTitle.replace(/\(.*?\)|\[.*?\]/g, '').trim();
  const artistParts = seedArtist.split(/\s+(?:&|feat\.?|ft\.?|vs\.?|x|\/)\s+|,\s*/i).filter(Boolean);

  let rawCandidates = [];
  const artistCounts = new Map();

  // 1. Fetch similar tracks
  for (const artist of artistParts) {
    try {
      const url = `${BASE_URL}?method=track.getsimilar&artist=${encodeURIComponent(artist)}&track=${encodeURIComponent(cleanTitle)}&api_key=${API_KEY}&format=json&limit=15`;
      const res = await fetch(url);
      const json = await res.json();
      const list = json?.similartracks?.track || [];
      for (const item of list) {
        if (!item?.name) continue;
        const match = parseFloat(item.match) || 0;
        rawCandidates.push({
          title: item.name,
          artist: item.artist?.name || 'Unknown Artist',
          matchScore: match,
          sourceType: 'track_similar',
        });
      }
    } catch (e) {
      console.log('Similar fetch error:', e.message);
    }
  }

  // 2. Fetch similar artists
  for (const artist of artistParts) {
    try {
      const url = `${BASE_URL}?method=artist.getsimilar&artist=${encodeURIComponent(artist)}&api_key=${API_KEY}&format=json&limit=5`;
      const res = await fetch(url);
      const json = await res.json();
      const simArtists = (json?.similarartists?.artist || []).slice(0, 3);
      for (const sa of simArtists) {
        const saMatch = parseFloat(sa.match) || 0;
        // get top tracks for similar artist
        const topUrl = `${BASE_URL}?method=artist.gettoptracks&artist=${encodeURIComponent(sa.name)}&api_key=${API_KEY}&format=json&limit=3`;
        const topRes = await fetch(topUrl);
        const topJson = await topRes.json();
        for (const item of topJson?.toptracks?.track || []) {
          if (!item?.name) continue;
          rawCandidates.push({
            title: item.name,
            artist: sa.name,
            matchScore: saMatch * 0.7,
            sourceType: 'artist_similar',
          });
        }
      }
    } catch (e) {
      console.log('Similar artist fetch error:', e.message);
    }
  }

  // Deduplicate candidates
  const seen = new Set();
  const unique = [];
  for (const c of rawCandidates) {
    const key = `${c.title.toLowerCase().trim()}___${c.artist.toLowerCase().trim()}`;
    if (key === `${seedTitle.toLowerCase().trim()}___${seedArtist.toLowerCase().trim()}`) continue;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(c);
  }

  // Score & Rank
  const scored = unique.map((c) => {
    let score = c.matchScore * 60; // base score up to 60
    let reason = 'Similar sound';

    if (c.sourceType === 'artist_similar') {
      score += 15;
      reason = 'Related artist';
    } else if (c.matchScore > 0.5) {
      score += 20;
      reason = 'Similar sound';
    }

    return {
      ...c,
      similarityScore: Math.round(score),
      recommendationReason: reason,
    };
  });

  scored.sort((a, b) => b.similarityScore - a.similarityScore);

  // Apply artist diversity: max 2 per artist
  const finalQueue = [];
  for (const item of scored) {
    const aNorm = item.artist.toLowerCase();
    const count = artistCounts.get(aNorm) || 0;
    if (count >= 2) continue;
    artistCounts.set(aNorm, count + 1);
    finalQueue.push(item);
    if (finalQueue.length >= 10) break;
  }

  console.log(`Ranked Similar Tracks (${finalQueue.length}):`);
  finalQueue.forEach((t, i) => {
    console.log(`  ${i+1}. "${t.title}" — ${t.artist} [score: ${t.similarityScore}] // ${t.recommendationReason}`);
  });
}

(async () => {
  await testSmartRecommendations('Memory Reboot', 'VØJ & Narvent', ['CYBERPUNK', 'SYNTHWAVE']);
  await testSmartRecommendations('Resonance', 'HOME', ['SYNTHWAVE', 'AMBIENT']);
  await testSmartRecommendations('Turbo Killer', 'Carpenter Brut', ['CYBERPUNK', 'INDUSTRIAL']);
})();
