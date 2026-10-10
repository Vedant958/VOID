import { RecommendService } from '../src/services/RecommendService';
import { useLibraryStore } from '../src/store/useLibraryStore';
import { CURATED_TRACKS } from '../src/constants/curatedTracks';
import { Track } from '../src/types';

async function runQueueVerification() {
  console.log('===============================================================');
  console.log('TESTING SMART SIMILAR-SONG QUEUE GENERATION & RANKING');
  console.log('===============================================================');

  // Clear library state for baseline test
  useLibraryStore.setState({ likedTracks: [], history: [] });

  // ── TEST 1: Seed "Memory Reboot" (Atmospheric Cyberpunk / Phonk) ──────────
  console.log('\n--- [TEST 1] SEED: "Memory Reboot" by "VØJ & Narvent" ---');
  const seed1: Track = {
    id: 'seed-1',
    title: 'Memory Reboot',
    artist: 'VØJ & Narvent',
    categories: ['CYBERPUNK', 'SYNTHWAVE'],
  };

  const queue1 = await RecommendService.getSimilarTracks(seed1);
  console.log(`Generated queue for Seed 1: ${queue1.length} tracks`);

  if (queue1.length < 5) {
    throw new Error('Seed 1 returned insufficient recommendations');
  }

  // Check top similarity
  console.log('Top Recommendations:');
  queue1.slice(0, 6).forEach((t, i) => {
    console.log(`  ${i + 1}. "${t.title}" — ${t.artist} [score: ${t.similarityScore}] // ${t.recommendationReason}`);
  });

  // Verify descending similarity order
  for (let i = 0; i < queue1.length - 1; i++) {
    if ((queue1[i].similarityScore || 0) < (queue1[i + 1].similarityScore || 0)) {
      throw new Error(`Queue ordering violation: item ${i} has lower score than item ${i + 1}`);
    }
  }

  // Verify artist diversity (max 2 per artist)
  const artistCounts1 = new Map<string, number>();
  for (const t of queue1) {
    const a = t.artist.toLowerCase();
    artistCounts1.set(a, (artistCounts1.get(a) || 0) + 1);
    if ((artistCounts1.get(a) || 0) > 2) {
      throw new Error(`Artist diversity violation: "${t.artist}" appears more than 2 times!`);
    }
  }

  // ── TEST 2: Seed "Resonance" (Chillwave / Ambient Synthwave) ──────────────
  console.log('\n--- [TEST 2] SEED: "Resonance" by "HOME" ---');
  const seed2: Track = {
    id: 'seed-2',
    title: 'Resonance',
    artist: 'HOME',
    categories: ['SYNTHWAVE', 'AMBIENT'],
  };

  const queue2 = await RecommendService.getSimilarTracks(seed2);
  console.log(`Generated queue for Seed 2: ${queue2.length} tracks`);

  console.log('Top Recommendations:');
  queue2.slice(0, 6).forEach((t, i) => {
    console.log(`  ${i + 1}. "${t.title}" — ${t.artist} [score: ${t.similarityScore}] // ${t.recommendationReason}`);
  });

  // Ensure recommendations change meaningfully across genres
  const top1Title = queue1[0].title.toLowerCase();
  const top2Title = queue2[0].title.toLowerCase();
  if (top1Title === top2Title) {
    throw new Error('Recommendations did not adapt to different seed track');
  }

  // ── TEST 3: Seed "Turbo Killer" (Aggressive Darksynth / Industrial) ────────
  console.log('\n--- [TEST 3] SEED: "Turbo Killer" by "Carpenter Brut" ---');
  const seed3: Track = {
    id: 'seed-3',
    title: 'Turbo Killer',
    artist: 'Carpenter Brut',
    categories: ['CYBERPUNK', 'INDUSTRIAL'],
  };

  const queue3 = await RecommendService.getSimilarTracks(seed3);
  console.log(`Generated queue for Seed 3: ${queue3.length} tracks`);

  console.log('Top Recommendations:');
  queue3.slice(0, 6).forEach((t, i) => {
    console.log(`  ${i + 1}. "${t.title}" — ${t.artist} [score: ${t.similarityScore}] // ${t.recommendationReason}`);
  });

  // ── TEST 4: Personalization Signal (Favorites Boost) ─────────────────────
  console.log('\n--- [TEST 4] PERSONALIZATION (Favorites Boost) ---');
  // Add a candidate to favorites
  const favCandidate = queue2[queue2.length - 1]; // e.g., lower ranked candidate in queue 2
  useLibraryStore.setState({ likedTracks: [favCandidate] });

  const queue2Personalized = await RecommendService.getSimilarTracks(seed2);
  const reEvaluatedFav = queue2Personalized.find(
    (t) => t.title.toLowerCase() === favCandidate.title.toLowerCase() && t.artist.toLowerCase() === favCandidate.artist.toLowerCase()
  );

  console.log(`Candidate "${favCandidate.title}" with favorite boost:`);
  if (reEvaluatedFav) {
    console.log(`  New Score: ${reEvaluatedFav.similarityScore} // Reason: ${reEvaluatedFav.recommendationReason}`);
    if (reEvaluatedFav.recommendationReason !== 'Based on your favorites') {
      throw new Error('Expected favorite candidate to be labeled "Based on your favorites"');
    }
  }

  // ── TEST 5: Listening Fatigue Penalty (Recently Played) ──────────────────
  console.log('\n--- [TEST 5] LISTENING FATIGUE PENALTY (Recently Played) ---');
  const topTrack = queue3[0];
  useLibraryStore.setState({
    likedTracks: [],
    history: [{ track: topTrack, playedAt: Date.now() }],
  });

  const queue3WithHistory = await RecommendService.getSimilarTracks(seed3);
  const penalizedTrack = queue3WithHistory.find(
    (t) => t.title.toLowerCase() === topTrack.title.toLowerCase() && t.artist.toLowerCase() === topTrack.artist.toLowerCase()
  );

  if (penalizedTrack && topTrack.similarityScore) {
    console.log(`Track "${topTrack.title}" original score: ${topTrack.similarityScore}, after recency penalty: ${penalizedTrack.similarityScore}`);
    if ((penalizedTrack.similarityScore || 0) >= (topTrack.similarityScore || 0)) {
      throw new Error('Expected recently played track to receive a fatigue penalty');
    }
  }

  // ── TEST 6: Graceful Catalogue Fallback ──────────────────────────────────
  console.log('\n--- [TEST 6] GRACEFUL CATALOGUE FALLBACK ---');
  const unknownSeed: Track = {
    id: 'unknown-seed',
    title: 'X79_NONEXISTENT_SIGNAL_9999',
    artist: 'UNKNOWN_ORBITAL_STATION',
    categories: ['CYBERPUNK'],
  };

  const queueFallback = await RecommendService.getSimilarTracks(unknownSeed);
  console.log(`Fallback queue tracks: ${queueFallback.length}`);
  if (queueFallback.length < 4) {
    throw new Error('Expected catalogue fallback to supply at least 4 tracks');
  }
  queueFallback.slice(0, 4).forEach((t, i) => {
    console.log(`  ${i + 1}. "${t.title}" — ${t.artist} [score: ${t.similarityScore}] // ${t.recommendationReason}`);
  });

  console.log('\n>>> ALL SMART QUEUE VERIFICATION CHECKS PASSED SUCCESSFULLY! <<<');
}

runQueueVerification().catch((err) => {
  console.error('Test error:', err);
  process.exit(1);
});
