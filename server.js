// server.js — VOID Local Development Server with API Route & Static Streaming Support
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath, parse as parseUrl } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure Last.fm API Key is populated for local environment
process.env.LASTFM_API_KEY = process.env.LASTFM_API_KEY || '77db9b1ef3618ce60cff5c372123ee61';

const PORT = process.env.PORT || 3000;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.mp3': 'audio/mpeg',
  '.mp4': 'video/mp4',
  '.m4a': 'audio/mp4',
  '.wav': 'audio/wav',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf'
};

// API Handler Cache
let recommendHandler = null;
let ytHandler = null;

async function getApiHandler(apiPath) {
  try {
    if (apiPath === '/api/recommend') {
      if (!recommendHandler) {
        const mod = await import('./api/recommend.js');
        recommendHandler = mod.default;
      }
      return recommendHandler;
    }
    if (apiPath === '/api/yt') {
      if (!ytHandler) {
        const mod = await import('./api/yt.js');
        ytHandler = mod.default;
      }
      return ytHandler;
    }
  } catch (err) {
    console.error(`[VOID API] Error loading ${apiPath}:`, err);
  }
  return null;
}

const server = http.createServer(async (req, res) => {
  const parsed = parseUrl(req.url, true);
  const pathname = parsed.pathname || '/';

  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Range');

  if (req.method === 'OPTIONS') {
    res.statusCode = 200;
    return res.end();
  }

  // 1. Check API routes
  if (pathname.startsWith('/api/')) {
    const handler = await getApiHandler(pathname);
    if (handler) {
      req.query = parsed.query || {};

      // Enrich res with Express/Vercel helpers
      res.status = (code) => {
        res.statusCode = code;
        return res;
      };
      res.json = (data) => {
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.end(JSON.stringify(data));
      };

      try {
        await handler(req, res);
      } catch (handlerErr) {
        console.error(`[VOID API] Execution error on ${pathname}:`, handlerErr);
        if (!res.writableEnded) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'Internal Server Error', message: handlerErr.message }));
        }
      }
      return;
    } else {
      res.statusCode = 404;
      res.setHeader('Content-Type', 'application/json');
      return res.end(JSON.stringify({ error: 'API endpoint not found' }));
    }
  }

  // 2. Static File Serving
  let filePath = path.join(__dirname, pathname === '/' ? 'index.html' : pathname);
  
  // Security check: stay within workspace
  if (!filePath.startsWith(__dirname)) {
    res.statusCode = 403;
    return res.end('Forbidden');
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      // Try appending .html
      const htmlPath = filePath + '.html';
      if (fs.existsSync(htmlPath)) {
        filePath = htmlPath;
      } else {
        res.statusCode = 404;
        res.setHeader('Content-Type', 'text/plain');
        return res.end('404 Not Found');
      }
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    const fileSize = fs.statSync(filePath).size;
    const range = req.headers.range;

    // Support HTTP Range requests (crucial for smooth audio/video scrubbing)
    if (range) {
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunksize = (end - start) + 1;
      const file = fs.createReadStream(filePath, { start, end });

      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize,
        'Content-Type': contentType,
      });
      file.pipe(res);
    } else {
      res.writeHead(200, {
        'Content-Length': fileSize,
        'Content-Type': contentType,
        'Accept-Ranges': 'bytes'
      });
      fs.createReadStream(filePath).pipe(res);
    }
  });
});

server.listen(PORT, () => {
  console.log('====================================================');
  console.log('  VOID // LOCAL HYPERDRIVE ACTIVATED');
  console.log('====================================================');
  console.log(`  > Core Interface:    http://localhost:${PORT}`);
  console.log(`  > VOID_BEATS Deck:   http://localhost:${PORT}/voidbeats.html`);
  console.log(`  > Recommend API:     http://localhost:${PORT}/api/recommend`);
  console.log('====================================================');
});
