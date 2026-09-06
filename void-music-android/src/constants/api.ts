export const API_CONFIG = {
  BACKEND_BASE_URL: 'https://void-signal.vercel.app',
  
  // Vercel serverless proxy endpoints
  RECOMMEND_ENDPOINT: 'https://void-signal.vercel.app/api/recommend',
  YT_ENDPOINT: 'https://void-signal.vercel.app/api/yt',
  
  // Direct primary / secondary stream resolution mirrors
  SAAVN_PRIMARY: 'https://saavn-api-one.vercel.app/search/songs',
  SAAVN_FALLBACK: 'https://saavn-api.vercel.app/search/songs',
  SAAVN_DEV: 'https://saavn.dev/api/search/songs',
  
  // Artwork and metadata
  ITUNES_SEARCH: 'https://itunes.apple.com/search',
  
  // Client fallback for Last.fm if proxy returns empty
  LASTFM_API_URL: 'https://ws.audioscrobbler.com/2.0/',
  LASTFM_PUBLIC_KEY: '77db9b1ef3618ce60cff5c372123ee61',
};
