import TrackPlayer, { Event } from 'react-native-track-player';
import {
  advanceToNextTrack,
  retreatToPreviousTrack,
  setupPlaybackEndedListener,
} from '../hooks/usePlayback';

export async function PlaybackService() {
  setupPlaybackEndedListener();

  TrackPlayer.addEventListener(Event.RemotePlay, () => {
    TrackPlayer.play();
  });

  TrackPlayer.addEventListener(Event.RemotePause, () => {
    TrackPlayer.pause();
  });

  TrackPlayer.addEventListener(Event.RemoteNext, () => {
    advanceToNextTrack('remote_next');
  });

  TrackPlayer.addEventListener(Event.RemotePrevious, () => {
    retreatToPreviousTrack('remote_prev');
  });

  TrackPlayer.addEventListener(Event.RemoteSeek, (event) => {
    TrackPlayer.seekTo(event.position);
  });

  TrackPlayer.addEventListener(Event.RemoteDuck, async (event) => {
    if (event.paused) {
      TrackPlayer.pause();
    } else if (event.permanent) {
      TrackPlayer.stop();
    } else {
      TrackPlayer.play();
    }
  });
}
