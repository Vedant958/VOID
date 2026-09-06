const http = require('http');
const fs = require('fs');
const path = require('path');

const apkPath = path.resolve(__dirname, '../void-music-debug.apk');
const PORT = 8082;

const server = http.createServer((req, res) => {
  if (req.url === '/void-music-debug.apk' || req.url === '/download') {
    if (!fs.existsSync(apkPath)) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      return res.end('APK file not found.');
    }
    const stat = fs.statSync(apkPath);
    res.writeHead(200, {
      'Content-Type': 'application/vnd.android.package-archive',
      'Content-Length': stat.size,
      'Content-Disposition': 'attachment; filename="void-music-debug.apk"',
    });
    fs.createReadStream(apkPath).pipe(res);
    return;
  }

  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(`
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>Download VOID Music Updated APK</title>
        <style>
          body { font-family: -apple-system, sans-serif; background: #0a0e17; color: #fff; text-align: center; padding: 40px 20px; }
          .card { background: #131b2e; border: 1px solid #1e293b; border-radius: 16px; padding: 24px; max-width: 400px; margin: 0 auto; }
          h1 { color: #00e5a3; font-size: 20px; margin-bottom: 8px; }
          p { color: #94a3b8; font-size: 14px; line-height: 1.5; }
          a.btn { display: inline-block; background: #00e5a3; color: #000; font-weight: bold; padding: 14px 28px; border-radius: 30px; text-decoration: none; margin-top: 20px; font-size: 16px; }
          .badge { font-size: 12px; color: #64748b; margin-top: 16px; }
        </style>
      </head>
      <body>
        <div class="card">
          <h1>VOID Music Development APK</h1>
          <p>This APK contains the compiled <strong>RNCWebView</strong> native module for embedded YouTube fallback.</p>
          <a class="btn" href="/void-music-debug.apk">Download Updated APK (181 MB)</a>
          <p class="badge">Built: ${new Date().toLocaleTimeString()}</p>
        </div>
      </body>
    </html>
  `);
});

server.listen(PORT, '0.0.0.0', () => {
  console.log('APK Download server running on http://192.168.1.129:' + PORT);
});
