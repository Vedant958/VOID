const { deduplicateAgainstQueue } = require('../src/utils/trackUtils');

const seed = { id: 'seed-1', title: 'Rush E (Minecraft Note Blocks)', artist: 'grande1899' };
const incoming = [
  { id: '1', title: 'Rush E', artist: 'grande1899' },
  { id: '2', title: 'Rush E (2024)', artist: 'Sheet Music Boss' },
  { id: '3', title: 'Doom Crossing: Eternal Horizons', artist: 'The Chalkeaters' },
  { id: '4', title: 'Count to Three', artist: 'The Chalkeaters' },
  { id: '5', title: 'A Third Chalkeaters Track', artist: 'The Chalkeaters' },
  { id: '6', title: 'Astronomia', artist: 'grande1899' },
  { id: '7', title: 'Among Us Drip', artist: 'grande1899' },
  { id: '8', title: 'Gravity Falls Theme Piano', artist: 'grande1899' },
];

const res = deduplicateAgainstQueue(incoming, [seed]);
console.log('Resulting recommendations count:', res.length);
res.forEach((r, i) => {
  console.log(`${i + 1}. "${r.title}" by "${r.artist}"`);
});
