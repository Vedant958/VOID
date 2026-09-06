import { useEffect } from 'react';
import { useProgress as useRNTPProgress } from 'react-native-track-player';
import { usePlayerStore } from '../store/usePlayerStore';

export function useProgress(updateInterval = 500) {
  const { position, duration, buffered } = useRNTPProgress(updateInterval);
  const setProgress = usePlayerStore((s) => s.setProgress);

  useEffect(() => {
    if (duration > 0 || position > 0) {
      setProgress(position, duration);
    }
  }, [position, duration, setProgress]);

  return {
    position,
    duration,
    buffered,
  };
}
