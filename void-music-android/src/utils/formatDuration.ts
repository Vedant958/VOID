export function formatDuration(seconds?: number): string {
  if (!seconds || isNaN(seconds) || seconds < 0) return '0:00';
  
  const totalSeconds = Math.floor(seconds);
  const hrs = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;
  
  const formattedSecs = secs < 10 ? `0${secs}` : `${secs}`;
  
  if (hrs > 0) {
    const formattedMins = mins < 10 ? `0${mins}` : `${mins}`;
    return `${hrs}:${formattedMins}:${formattedSecs}`;
  }
  
  return `${mins}:${formattedSecs}`;
}
