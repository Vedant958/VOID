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

async function testMainstream(songName) {
  const saavnQuery = encodeURIComponent(songName);
  const saavnUrl = `https://saavn-api-one.vercel.app/search/songs?query=${saavnQuery}&limit=3`;
  const saavnData = await fetchJson(saavnUrl);
  const results = saavnData.data?.results || saavnData.data || [];
  console.log(`Song: "${songName}" -> found ${results.length} Saavn results.`);
  if (results.length > 0) {
    const first = results[0];
    const dl = first.downloadUrl || [];
    const best = dl.find(u => u.quality === '320kbps') || dl[dl.length - 1];
    console.log(`Title: ${first.name || first.title} | Duration: ${first.duration}s | Quality: ${best?.quality} | Stream: ${best?.url || best?.link}`);
  }
}

async function run() {
  await testMainstream('Blinding Lights The Weeknd');
  await testMainstream('Abracadabra Lady Gaga');
  await testMainstream('Shape of You Ed Sheeran');
}

run().catch(console.error);
