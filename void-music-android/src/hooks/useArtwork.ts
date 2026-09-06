import { useState, useEffect } from 'react';
import { Track } from '../types';
import { ArtworkService } from '../services/ArtworkService';

export function useArtwork(track: Track | null) {
  const [artworkUrl, setArtworkUrl] = useState<string | undefined>(track?.artwork);

  useEffect(() => {
    let isMounted = true;
    if (!track) {
      setArtworkUrl(undefined);
      return;
    }

    setArtworkUrl(track.artwork);

    ArtworkService.getHDArtwork(track).then((hdUrl) => {
      if (isMounted && hdUrl) {
        setArtworkUrl(hdUrl);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [track?.id, track?.title, track?.artist, track?.artwork]);

  return artworkUrl;
}
