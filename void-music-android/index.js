// VOID Music Android — App Entry Point
import TrackPlayer from 'react-native-track-player';
import { PlaybackService } from './src/services/PlaybackService';
import 'expo-router/entry';

// Register background playback service before root mounts
TrackPlayer.registerPlaybackService(() => PlaybackService);
