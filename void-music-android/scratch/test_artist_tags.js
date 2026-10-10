const API_KEY = '77db9b1ef3618ce60cff5c372123ee61';
const BASE_URL = 'https://ws.audioscrobbler.com/2.0/';

async function testArtistTags(artist) {
  const url = `${BASE_URL}?method=artist.gettoptags&artist=${encodeURIComponent(artist)}&api_key=${API_KEY}&format=json`;
  const res = await fetch(url);
  const json = await res.json();
  const tags = (json?.toptags?.tag || []).slice(0, 5).map(t => `${t.name} (${t.count})`);
  console.log(`Artist Tags for "${artist}": ${tags.join(', ')}`);
}

(async () => {
  await testArtistTags('Carpenter Brut');
  await testArtistTags('Perturbator');
  await testArtistTags('HOME');
  await testArtistTags('VØJ');
})();
