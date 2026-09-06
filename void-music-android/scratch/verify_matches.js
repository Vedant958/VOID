const fetch = globalThis.fetch;

function cleanStr(s) {
  return (s || '')
    .toLowerCase()
    .replace(/\(.*?\)|\[.*?\]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function computeSimilarity(s1, s2) {
  const c1 = cleanStr(s1);
  const c2 = cleanStr(s2);
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

function validateTrackMatch(candidate, target) {
  const targetTitle = cleanStr(target.title);
  const targetArtist = cleanStr(target.artist);

  const candRawTitle = String(candidate.title || candidate.name || '');
  const candTitle = cleanStr(candRawTitle);
  const candRawArtist = String(
    candidate.artist || candidate.primaryArtists || candidate.singers || ''
  );
  const candArtist = cleanStr(candRawArtist);
  const lowerCandTitle = candRawTitle.toLowerCase();

  const titleSim = computeSimilarity(candTitle, targetTitle);
  if (titleSim < 0.55) {
    return { passed: false, reason: `Title mismatch: "${candTitle}" vs "${targetTitle}" (sim: ${titleSim.toFixed(2)})` };
  }

  let artistSim = computeSimilarity(candArtist, targetArtist);
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
    return { passed: false, reason: `Artist mismatch: "${candRawArtist}" vs "${target.artist}" (sim: ${artistSim.toFixed(2)})` };
  }

  return { passed: true, score: titleSim * 0.55 + artistSim * 0.45, candRawTitle, candRawArtist };
}

(async () => {
  const testTracks = [
    { title: 'Rush E (2024)', artist: 'Sheet Music Boss' },
    { title: 'Rush E', artist: 'Toms Mucenieks' },
    { title: 'Resonance', artist: 'HOME' },
    { title: 'Nightcall', artist: 'Kavinsky' },
  ];

  for (const t of testTracks) {
    const cleanTitle = (t.title || '').replace(/\(.*?\)|\[.*?\]/g, '').replace(/[^\w\s]/gi, ' ').replace(/\s+/g, ' ').trim();
    const cleanArtist = (t.artist || '').replace(/\(.*?\)|\[.*?\]/g, '').replace(/[^\w\s]/gi, ' ').replace(/\s+/g, ' ').trim();
    const q = (cleanTitle + ' ' + cleanArtist).trim();

    console.log('\n========================================');
    console.log(`Testing: "${t.title}" by "${t.artist}" | Clean Query: "${q}"`);

    const res = await fetch(`https://saavn-api-one.vercel.app/search/songs?query=${encodeURIComponent(q)}&limit=5`);
    const data = await res.json();
    const candidates = data.data?.results || [];
    console.log(`Candidates returned by Saavn: ${candidates.length}`);

    let matched = null;
    for (const c of candidates) {
      const v = validateTrackMatch(c, t);
      console.log(`  -> Cand: "${c.name || c.title}" by "${c.primaryArtists || c.artist}" | Validation: ${v.passed ? `PASSED (score: ${v.score.toFixed(2)})` : `REJECTED: ${v.reason}`}`);
      if (v.passed && !matched) {
        matched = { cand: c, v };
      }
    }

    if (matched) {
      console.log(`>> SELECTED FULL TRACK: "${matched.cand.name || matched.cand.title}" | artist: "${matched.cand.primaryArtists}"`);
    } else {
      console.log('>> FALLBACK TO iTUNES 30s PREVIEW (No legitimate Saavn full track matched - wrong song prevented)');
    }
  }
})();
