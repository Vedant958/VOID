// api/recommend.js
// Serverless handler: Last.fm track.getsimilar → sanitized track objects
// Returns: { success, tracks: [{ title, artist, duration, cover, query, previewUrl }] }
export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const { artist, track } = req.query;
    const apiKey = process.env.LASTFM_API_KEY;

    if (!apiKey) {
        return res.status(500).json({ success: false, error: 'Server configuration error: Missing LASTFM_API_KEY' });
    }

    if (!artist || !track) {
        return res.status(400).json({ success: false, error: 'Missing required params: artist, track' });
    }

    // Strip parenthetical variants like "(Remix)", "(Live)", "[Piano Solo]" that confuse Last.fm
    const cleanTitle  = track.replace(/\(.*?\)|\[.*?\]/g, '').trim();
    const cleanArtist = artist.replace(/\(.*?\)|\[.*?\]/g, '').trim();

    try {
        const lfmUrl = `https://ws.audioscrobbler.com/2.0/?method=track.getsimilar&artist=${encodeURIComponent(cleanArtist)}&track=${encodeURIComponent(cleanTitle)}&api_key=${apiKey}&format=json&limit=10`;

        const lfmRes  = await fetch(lfmUrl);
        if (!lfmRes.ok) throw new Error(`Last.fm HTTP ${lfmRes.status}`);
        const lfmData = await lfmRes.json();

        const rawList = lfmData.similartracks?.track || [];

        if (rawList.length === 0) {
            return res.status(200).json({ success: true, tracks: [] });
        }

        // Enrich with iTunes HD cover art + real duration in parallel
        const enriched = await Promise.allSettled(
            rawList.map(async (item) => {
                const title    = item.name         || 'Unknown Track';
                const artName  = item.artist?.name || 'Unknown Artist';
                const dur      = item.duration     ? formatDuration(item.duration) : '03:30';
                const query    = `${title} ${artName}`;

                let cover      = null;
                let duration   = dur;
                let previewUrl = '';

                try {
                    const itUrl = `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&entity=song&limit=1`;
                    const itRes = await fetch(itUrl);
                    if (itRes.ok) {
                        const itData = await itRes.json();
                        const hit    = itData.results?.[0];
                        if (hit) {
                            if (hit.artworkUrl100) {
                                cover = hit.artworkUrl100.replace('100x100bb', '600x600bb');
                            }
                            if (hit.trackTimeMillis) {
                                duration = formatDuration(Math.round(hit.trackTimeMillis / 1000));
                            }
                            previewUrl = hit.previewUrl || '';
                        }
                    }
                } catch (_) { /* iTunes enrichment is optional */ }

                return { title, artist: artName, duration, cover, query, previewUrl };
            })
        );

        const tracks = enriched
            .filter(r => r.status === 'fulfilled')
            .map(r => r.value);

        return res.status(200).json({ success: true, tracks });
    } catch (error) {
        console.error('[recommend] Error:', error.message);
        return res.status(500).json({ success: false, message: 'Failed to fetch recommendations', error: error.message });
    }
}

function formatDuration(sec) {
    const total = parseInt(sec, 10) || 0;
    const m = Math.floor(total / 60);
    const s = total % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
}