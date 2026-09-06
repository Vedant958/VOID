import TrackPlayer, {
  AppKilledPlaybackBehavior,
  Capability,
} from 'react-native-track-player';
import { Track } from '../types';

let isSetup = false;

export async function setupTrackPlayer(): Promise<boolean> {
  if (isSetup) return true;

  try {
    await TrackPlayer.setupPlayer({
      maxCacheSize: 1024 * 50, // 50MB
    });

    await TrackPlayer.updateOptions({
      android: {
        appKilledPlaybackBehavior: AppKilledPlaybackBehavior.StopPlaybackAndRemoveNotification,
      },
      capabilities: [
        Capability.Play,
        Capability.Pause,
        Capability.SkipToNext,
        Capability.SkipToPrevious,
        Capability.SeekTo,
      ],
      compactCapabilities: [
        Capability.Play,
        Capability.Pause,
        Capability.SkipToNext,
      ],
      notificationCapabilities: [
        Capability.Play,
        Capability.Pause,
        Capability.SkipToNext,
        Capability.SkipToPrevious,
        Capability.SeekTo,
      ],
    });

    isSetup = true;
    return true;
  } catch (error) {
    // If player is already initialized, setupPlayer throws an error
    console.log('TrackPlayer setup status:', error);
    isSetup = true;
    return true;
  }
}

export async function playTrackOnPlayer(track: Track, streamUrl: string) {
  await setupTrackPlayer();
  await TrackPlayer.reset();
  await TrackPlayer.add({
    id: track.id,
    url: streamUrl,
    title: track.title,
    artist: track.artist,
    artwork: track.artwork,
    duration: track.duration,
  });
  await TrackPlayer.play();
}
