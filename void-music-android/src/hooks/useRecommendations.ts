import { useState, useEffect } from 'react';
import { Track } from '../types';
import { RecommendService } from '../services/RecommendService';

export function useRecommendations(track: Track | null) {
  const [recommendations, setRecommendations] = useState<Track[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;
    if (!track || !track.title || !track.artist) {
      setRecommendations([]);
      return;
    }

    setIsLoading(true);
    RecommendService.getSimilarTracks(track)
      .then((tracks) => {
        if (isMounted) {
          setRecommendations(tracks);
          setIsLoading(false);
        }
      })
      .catch(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [track?.id, track?.title, track?.artist]);

  return { recommendations, isLoading };
}
