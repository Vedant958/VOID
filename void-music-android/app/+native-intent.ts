/**
 * Native Intent Redirect Handler for Expo Router
 *
 * Intercepts incoming system deep links before they are parsed into routes.
 * Specifically redirects react-native-track-player notification click intents
 * (trackplayer://notification.click and its parsed variants) to the existing
 * '/player' screen, while preserving all unrelated deep links untouched.
 */

function isTrackPlayerNotification(url: string): boolean {
  if (!url) return false;
  // Normalize by trimming and stripping trailing slash
  const clean = url.trim().replace(/\/+$/, '');

  return (
    clean === 'trackplayer://notification.click' ||
    clean === 'notification.click' ||
    clean === '/notification.click' ||
    clean === 'voidmusic://notification.click' ||
    clean === 'voidmusic:///notification.click' ||
    clean.startsWith('trackplayer://')
  );
}

export function redirectSystemPath({
  path,
  initial,
}: {
  path: string;
  initial: boolean;
}): string {
  try {
    if (isTrackPlayerNotification(path)) {
      return '/player';
    }
  } catch {
    // Return path untouched if any inspection error occurs
  }
  return path;
}

export default {
  redirectSystemPath,
};
