import { TransmissionService, getLocalDateKey } from '../src/services/TransmissionService';
import { storage } from '../src/utils/storage';
import { CURATED_TRACKS } from '../src/constants/curatedTracks';
import { useLibraryStore } from '../src/store/useLibraryStore';

async function verifyManualRefresh() {
  console.log('--- STARTING MANUAL REFRESH VERIFICATION ---');
  const dateKey = getLocalDateKey();

  // Reset storage
  storage.delete('void_daily_transmission_v1');
  useLibraryStore.setState({ likedTracks: [CURATED_TRACKS[0]], history: [] });

  // 1. Initial daily transmission
  const initial = await TransmissionService.getDailyTransmission(false);
  console.log('Initial Transmission Tracks (Count: ' + initial.tracks.length + '):');
  initial.tracks.slice(0, 4).forEach((t, i) => console.log(`  ${i + 1}. ${t.title} - ${t.artist}`));

  // 2. First Manual Refresh
  console.log('\nTesting First Manual Refresh (forceRefresh: true)...');
  const refresh1 = await TransmissionService.getDailyTransmission(true);
  console.log('Refreshed Transmission 1 (Count: ' + refresh1.tracks.length + '):');
  refresh1.tracks.slice(0, 4).forEach((t, i) => console.log(`  ${i + 1}. ${t.title} - ${t.artist}`));

  // 3. Check Persistence after refresh
  console.log('\nChecking Persistence of Refreshed Collection...');
  const cachedAfterRefresh1 = TransmissionService.getCachedTransmission(dateKey);
  if (!cachedAfterRefresh1) {
    throw new Error('Refreshed transmission was not persisted to storage!');
  }
  if (cachedAfterRefresh1.tracks[0].title !== refresh1.tracks[0].title) {
    throw new Error('Persisted transmission does not match refreshed result!');
  }
  console.log('✓ Successfully verified: Cache matches Refreshed Transmission 1.');

  // 4. Second Manual Refresh
  console.log('\nTesting Second Manual Refresh (forceRefresh: true)...');
  const refresh2 = await TransmissionService.getDailyTransmission(true);
  console.log('Refreshed Transmission 2 (Count: ' + refresh2.tracks.length + '):');
  refresh2.tracks.slice(0, 4).forEach((t, i) => console.log(`  ${i + 1}. ${t.title} - ${t.artist}`));

  // 5. Subsequent tab switch simulation (forceRefresh: false)
  console.log('\nSimulating tab switch back to Discover (forceRefresh: false)...');
  const tabRevisit = await TransmissionService.getDailyTransmission(false);
  if (tabRevisit.tracks[0].title !== refresh2.tracks[0].title) {
    throw new Error('Tab revisit reverted refreshed collection!');
  }
  console.log('✓ Successfully verified: Tab revisit preserves Refreshed Transmission 2 without reshuffle.');

  console.log('\n>>> ALL MANUAL REFRESH & PERSISTENCE TESTS PASSED! <<<');
}

verifyManualRefresh().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
