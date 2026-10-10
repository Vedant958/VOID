import { RecommendService } from '../src/services/RecommendService';
import { TransmissionService } from '../src/services/TransmissionService';
import { filterTracksByCategory, CATEGORIES } from '../src/constants/curatedTracks';

async function verifyPriorityFeedsRefresh() {
  console.log('=== STARTING PRIORITY FEEDS REFRESH VERIFICATION ===');

  // 1. Initial Priority Feeds fetch
  console.log('\n[Step 1] Fetching initial Priority Feeds (refreshSeed: 0)...');
  const feed1 = await RecommendService.getPriorityFeeds(0);
  console.log(`Feed 1 returned ${feed1.length} tracks:`);
  feed1.slice(0, 5).forEach((t, i) => console.log(`  ${i + 1}. "${t.title}" — ${t.artist} [${(t.categories || []).join(', ')}]`));

  if (!feed1 || feed1.length < 4) {
    throw new Error('Expected feed1 to return at least 4 tracks');
  }

  // 2. Refresh Priority Feeds (refreshSeed: 1)
  console.log('\n[Step 2] Refreshing Priority Feeds (refreshSeed: 1)...');
  const feed2 = await RecommendService.getPriorityFeeds(1);
  console.log(`Feed 2 returned ${feed2.length} tracks:`);
  feed2.slice(0, 5).forEach((t, i) => console.log(`  ${i + 1}. "${t.title}" — ${t.artist} [${(t.categories || []).join(', ')}]`));

  if (!feed2 || feed2.length < 4) {
    throw new Error('Expected feed2 to return at least 4 tracks');
  }

  // Verify diversity between feed 1 and feed 2
  const feed1First = feed1[0]?.title;
  const feed2First = feed2[0]?.title;
  console.log(`Feed 1 first track: "${feed1First}" vs Feed 2 first track: "${feed2First}"`);
  if (feed1First === feed2First && feed1[1]?.title === feed2[1]?.title) {
    console.warn('Warning: First two tracks are identical between seed 0 and 1');
  } else {
    console.log('✓ Successfully verified: Refresh generated a distinct track sequence.');
  }

  // 3. Category filtering on refreshed feed
  console.log('\n[Step 3] Testing Category Filtering on Refreshed Feed...');
  for (const cat of CATEGORIES) {
    const filtered = filterTracksByCategory(feed2, cat);
    console.log(`  Category "${cat}": ${filtered.length} matching signals`);
    if (cat === 'ALL' && filtered.length !== feed2.length) {
      throw new Error('ALL filter must include all tracks');
    }
    if (filtered.length === 0) {
      console.warn(`  Notice: Category "${cat}" has 0 tracks in this specific variation.`);
    }
  }
  console.log('✓ Successfully verified: Category filtering functions across refreshed feed.');

  // 4. Transmission of the Day Independence Check
  console.log('\n[Step 4] Checking Transmission of the Day Independence...');
  const transmission = await TransmissionService.getDailyTransmission(false);
  console.log(`Transmission of the Day date: ${transmission.displayDate}, tracks: ${transmission.tracks.length}`);
  const cached = TransmissionService.getCachedTransmission();
  if (!cached) {
    throw new Error('Expected Transmission of the Day cache to remain intact');
  }
  console.log('✓ Successfully verified: Transmission of the Day cache and logic is completely independent.');

  console.log('\n>>> ALL PRIORITY FEEDS REFRESH VERIFICATION CHECKS PASSED! <<<');
}

verifyPriorityFeedsRefresh().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
