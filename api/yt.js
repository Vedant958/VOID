// api/yt.js
export default async function handler(req, res) {
    // Allow CORS from everywhere
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const { search, id } = req.query;

    // 1. Search Pipeline: Query YouTube Music / Invidious instances from backend
    if (search) {
        const searchEngines = [
            `https://pipedapi.kavin.rocks/search?q=${encodeURIComponent(search)}&filter=music_songs`,
            `https://api.invidious.io/api/v1/search?q=${encodeURIComponent(search)}&type=video`,
            `https://yt.artemislena.eu/api/v1/search?q=${encodeURIComponent(search)}&type=video`
        ];

        for (const endpoint of searchEngines) {
            try {
                const response = await fetch(endpoint, {
                    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
                });
                if (!response.ok) continue;
                const data = await response.json();
                const items = data.items || data;

                const cleanTracks = items.slice(0, 12).map(item => ({
                    id: item.url ? item.url.replace('/watch?v=', '') : item.videoId,
                    title: item.title,
                    artist: item.uploaderName || item.author || "Unknown Artist",
                    duration: item.duration || (item.lengthSeconds ? `${Math.floor(item.lengthSeconds / 60)}:${item.lengthSeconds % 60 < 10 ? '0' : ''}${item.lengthSeconds % 60}` : "03:30"),
                    cover: item.thumbnail || (item.videoThumbnails && item.videoThumbnails[0] ? item.videoThumbnails[0].url : 'assets/images/album-art.png')
                })).filter(t => t.id);

                if (cleanTracks.length > 0) {
                    return res.status(200).json({ success: true, tracks: cleanTracks });
                }
            } catch (err) {
                // continue to next mirror
            }
        }
        return res.status(502).json({ success: false, message: 'All backend relays busy' });
    }

    // 2. Stream Pipeline: Extract Direct Audio Stream Link by Video ID
    if (id) {
        const streamRelays = [
            `https://pipedapi.kavin.rocks/streams/${id}`,
            `https://api.invidious.io/api/v1/videos/${id}`
        ];

        for (const relay of streamRelays) {
            try {
                const response = await fetch(relay);
                if (!response.ok) continue;
                const data = await response.json();

                // Check audioStreams (Piped)
                if (data.audioStreams && data.audioStreams.length > 0) {
                    // Sort by highest bitrate
                    const bestAudio = data.audioStreams.sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0))[0];
                    return res.status(200).json({ success: true, streamUrl: bestAudio.url });
                }

                // Check formatStreams / adaptiveFormats (Invidious)
                if (data.adaptiveFormats) {
                    const audioOnly = data.adaptiveFormats.filter(f => f.type && f.type.startsWith('audio/'));
                    if (audioOnly.length > 0) {
                        return res.status(200).json({ success: true, streamUrl: audioOnly[0].url });
                    }
                }
            } catch (e) {
                // try next
            }
        }

        // Ultimate Fallback: Direct Invidious audio redirect stream
        return res.status(200).json({
            success: true,
            streamUrl: `https://yt.artemislena.eu/latest_version?id=${id}&itag=140`
        });
    }

    return res.status(400).json({ error: 'Missing search query or video ID' });
}