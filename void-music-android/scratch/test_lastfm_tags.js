const API_KEY = '77db9b1ef3618ce60cff5c372123ee61';
const BASE_URL = 'https://ws.audioscrobbler.com/2.0/';

async function testTrackSimilar(artist, track) {
  const url = `${BASE_URL}?method=track.getsimilar&artist=${encodeURIComponent(artist)}&track=${encodeURIComponent(track)}&api_key=${API_KEY}&format=json&limit=10`;
  const res = await fetch(url);
  const json = await res.json();
  console.log(`\n=== track.getsimilar: "${track}" by "${artist}" ===`);
  const tracks = json?.similartracks?.track || [];
  console.log(`Found: ${tracks.length} tracks`);
  tracks.slice(0, 5).forEach((t, i) => {
    console.log(`  ${i+1}. "${t.name}" by "${t.artist?.name}" (match: ${t.match})`);
  });
}

async function testTrackTags(artist, track) {
  const url = `${BASE_URL}?method=track.gettoptags&artist=${encodeURIComponent(artist)}&track=${encodeURIComponent(track)}&api_key=${API_KEY}&format=json`;
  const res = await fetch(url);
  const json = await res.json();
  const tags = (json?.toptags?.tag || []).slice(0, 5).map(t => `${t.name} (${t.count})`);
  console.log(`Tags for "${track}" by "${artist}": ${tags.join(', ')}`);
}

(async () => {
  await testTrackSimilar('VØJ', 'Memory Reboot');
  await testTrackTags('VØJ', 'Memory Reboot');
  await testTrackSimilar('HOME', 'Resonance');
  await testTrackTags('HOME', 'Resonance');
  await testTrackSimilar('Carpenter Brut', 'Turbo Killer');
  await testTrackTags('Carpenter Brut', 'Turbo Killer');
})();
