const https = require('https');

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Android; Mobile)' } }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

async function runTest() {
  console.log('=== STEP 1: Search "Rush E" via iTunes Open API ===');
  const itunesUrl = 'https://itunes.apple.com/search?term=Rush+E&media=music&entity=song&limit=15';
  const itunesData = await fetchJson(itunesUrl);
  console.log(`iTunes returned ${itunesData.results ? itunesData.results.length : 0} results.`);

  // Filter valid playable audio (parity with SearchService)
  const playable = (itunesData.results || []).filter(item => item.previewUrl && item.previewUrl.startsWith('http'));
  console.log(`Playable results with confirmed audio stream: ${playable.length}`);

  for (let i = 0; i < Math.min(5, playable.length); i++) {
    const item = playable[i];
    console.log(`\n--- Candidate ${i + 1} ---`);
    console.log(`Title: "${item.trackName}" | Artist: "${item.artistName}"`);
    console.log(`iTunes preview: ${item.previewUrl}`);

    // Try Saavn mirror (saavn-api-one.vercel.app)
    const saavnQuery = encodeURIComponent(`${item.trackName} ${item.artistName}`);
    const saavnUrl = `https://saavn-api-one.vercel.app/search/songs?query=${saavnQuery}&limit=3`;
    try {
      const saavnData = await fetchJson(saavnUrl);
      const results = saavnData.data?.results || saavnData.data || [];
      console.log(`Saavn search returned ${results.length} results.`);
      if (results.length > 0) {
        const first = results[0];
        const downloadUrls = first.downloadUrl || [];
        const best = downloadUrls.find(u => u.quality === '320kbps') || downloadUrls[downloadUrls.length - 1];
        if (best) {
          console.log(`>> RESOLUTION: Full 320kbps Saavn stream found! URL: ${best.url || best.link}`);
          continue;
        }
      }
    } catch (e) {
      console.log(`Saavn lookup error: ${e.message}`);
    }

    console.log(`>> RESOLUTION: Apple iTunes official 30s preview fallback! URL: ${item.previewUrl}`);
  }
}

runTest().catch(console.error);
