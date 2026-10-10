import { TransmissionService, getLocalDateKey, getDailySeed } from '../src/services/TransmissionService';
import { useLibraryStore } from '../src/store/useLibraryStore';
import { CURATED_TRACKS } from '../src/constants/curatedTracks';
import { storage } from '../src/utils/storage';

async function runTests() {
  console.log('========================================================');
  console.log('TESTING TRANSMISSION OF THE DAY: CORE ARCHITECTURE');
  console.log('========================================================');

  // Test 1: Fallback generation for new user (no likes or history)
  console.log('\n[Test 1] New User (Cold Start / No Likes or History)');
  useLibraryStore.setState({ likedTracks: [], history: [] });
  storage.delete('void_daily_transmission_v1');

  const coldStartTransmission = await TransmissionService.getDailyTransmission();
  console.log(`Generated Transmission: "${coldStartTransmission.label}" — ${coldStartTransmission.subtitle}`);
  console.log(`Date Key: ${coldStartTransmission.dateKey} (${coldStartTransmission.displayDate})`);
  console.log(`Is Personalized: ${coldStartTransmission.isPersonalized}`);
  console.log(`Total Tracks: ${coldStartTransmission.tracks.length}`);

  if (coldStartTransmission.isPersonalized !== false) {
    throw new Error('Expected cold start to NOT be personalized');
  }
  if (coldStartTransmission.tracks.length < 8 || coldStartTransmission.tracks.length > 12) {
    throw new Error(`Expected between 8 and 12 tracks, got ${coldStartTransmission.tracks.length}`);
  }
  for (const [idx, t] of coldStartTransmission.tracks.entries()) {
    console.log(`  ${idx + 1}. "${t.title}" — ${t.artist}`);
  }

  // Test 2: Persistence & Same-day stability
  console.log('\n[Test 2] Same-Day Persistence (Stability Check)');
  const cached = TransmissionService.getCachedTransmission(coldStartTransmission.dateKey);
  if (!cached) {
    throw new Error('Expected cached transmission to exist in storage');
  }
  if (cached.tracks.length !== coldStartTransmission.tracks.length) {
    throw new Error('Cached track length mismatch');
  }
  if (cached.tracks[0].title !== coldStartTransmission.tracks[0].title) {
    throw new Error('Cached track order altered');
  }
  console.log('Verified: Cached transmission successfully restored from storage without regeneration.');

  // Test 3: Personalized generation when user has favorites
  console.log('\n[Test 3] User with Favorites (Personalization Check)');
  storage.delete('void_daily_transmission_v1');
  const favoriteTrack = CURATED_TRACKS[0]; // Resonance by HOME
  useLibraryStore.setState({
    likedTracks: [favoriteTrack],
    history: [{ track: CURATED_TRACKS[1], playedAt: Date.now() }],
  });

  const personalizedTransmission = await TransmissionService.getDailyTransmission(true);
  console.log(`Generated Transmission: "${personalizedTransmission.label}" — ${personalizedTransmission.subtitle}`);
  console.log(`Is Personalized: ${personalizedTransmission.isPersonalized}`);
  console.log(`Total Tracks: ${personalizedTransmission.tracks.length}`);

  if (personalizedTransmission.isPersonalized !== true) {
    throw new Error('Expected transmission with likes/history to be personalized');
  }
  if (personalizedTransmission.tracks.length < 8) {
    throw new Error(`Expected at least 8 tracks, got ${personalizedTransmission.tracks.length}`);
  }
  for (const [idx, t] of personalizedTransmission.tracks.entries()) {
    console.log(`  ${idx + 1}. "${t.title}" — ${t.artist}`);
  }

  // Test 4: Daily Rotation (Next calendar day)
  console.log('\n[Test 4] Daily Rotation Simulation');
  const todayKey = getLocalDateKey();
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowKey = getLocalDateKey(tomorrow);

  console.log(`Today's Key: ${todayKey} (seed: ${getDailySeed(todayKey)})`);
  console.log(`Tomorrow's Key: ${tomorrowKey} (seed: ${getDailySeed(tomorrowKey)})`);

  if (getDailySeed(todayKey) === getDailySeed(tomorrowKey)) {
    throw new Error('Seeds for different days must not be identical');
  }
  console.log('Verified: Next day produces distinct rotation seed.');

  console.log('\n>>> ALL TRANSMISSION OF THE DAY VERIFICATION TESTS PASSED! <<<');
}

runTests().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
