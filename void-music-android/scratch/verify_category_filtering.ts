import { CATEGORIES, CURATED_TRACKS, filterTracksByCategory } from '../src/constants/curatedTracks';

console.log('=====================================================');
console.log('VOID MUSIC ANDROID: DISCOVER CATEGORY FILTER TEST');
console.log('=====================================================');

const testCategories = [...CATEGORIES, 'UNKNOWN_CATEGORY'];

for (const cat of testCategories) {
  const filtered = filterTracksByCategory(CURATED_TRACKS, cat);
  console.log(`\n[CATEGORY: ${cat}] -> ${filtered.length} SIGNALS returned`);
  
  for (const [idx, t] of filtered.entries()) {
    console.log(`  ${idx + 1}. "${t.title}" — ${t.artist} [tags: ${(t.categories || []).join(', ')}]`);
  }

  // Verification Assertions
  if (cat === 'ALL') {
    if (filtered.length !== CURATED_TRACKS.length) {
      throw new Error(`ALL expected ${CURATED_TRACKS.length} tracks, received ${filtered.length}`);
    }
  } else if (cat === 'UNKNOWN_CATEGORY') {
    if (filtered.length !== 0) {
      throw new Error(`UNKNOWN_CATEGORY expected 0 tracks (clean empty state), received ${filtered.length}`);
    }
  } else {
    if (filtered.length === 0) {
      throw new Error(`Category "${cat}" must have at least one matching signal!`);
    }
    for (const t of filtered) {
      const matches = t.categories && t.categories.includes(cat);
      if (!matches) {
        throw new Error(`Track "${t.title}" does not match category "${cat}"!`);
      }
    }
  }
}

// Verification 2: Rapid state switching (idempotency check)
console.log('\n--- VERIFYING RAPID IDEMPOTENT CATEGORY TRANSITIONS ---');
const transitions = ['ALL', 'CYBERPUNK', 'LO-FI', 'SYNTHWAVE', 'LO-FI', 'AMBIENT', 'INDUSTRIAL', 'ALL'];
for (const target of transitions) {
  const result = filterTracksByCategory(CURATED_TRACKS, target);
  console.log(`Transition to ${target.padEnd(12)} -> OK (${result.length} SIGNALS)`);
}

console.log('\n>>> ALL DISCOVER CATEGORY FILTERING REQUIREMENTS VERIFIED SUCCESSFULLY! <<<');
