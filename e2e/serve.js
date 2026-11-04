/**
 * Minimal static server for the exported web build (dist-e2e) used by the
 * Playwright tests. Unknown paths fall back to index.html so expo-router
 * deep links like /lesson/variables-01 work after a reload.
 *
 * Usage: node e2e/serve.js [dir] [port]
 */
const fs = require('fs');
const http = require('http');
const path = require('path');

const root = path.resolve(process.argv[2] ?? 'dist-e2e');
const port = Number(process.argv[3] ?? process.env.E2E_PORT ?? 4173);

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.ico': 'image/x-icon',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
};

if (!fs.existsSync(path.join(root, 'index.html'))) {
  console.error(`${root}/index.html not found. Run "npm run build:e2e" first.`);
  process.exit(1);
}

function send(res, file) {
  res.writeHead(200, {
    'Content-Type': TYPES[path.extname(file).toLowerCase()] ?? 'application/octet-stream',
    'Cache-Control': 'no-store',
  });
  fs.createReadStream(file).pipe(res);
}

http
  .createServer((req, res) => {
    let pathname;
    try {
      pathname = decodeURIComponent(new URL(req.url ?? '/', 'http://localhost').pathname);
    } catch {
      res.writeHead(400).end();
      return;
    }
    const file = path.join(root, pathname);
    if (!file.startsWith(root + path.sep) && file !== root) {
      res.writeHead(403).end();
      return;
    }
    fs.stat(file, (err, stat) => {
      if (!err && stat.isFile()) return send(res, file);
      // Missing files with an extension are real 404s; everything else is a route.
      if (path.extname(pathname)) {
        res.writeHead(404).end();
        return;
      }
      send(res, path.join(root, 'index.html'));
    });
  })
  .listen(port, () => {
    console.log(`Serving ${root} at http://localhost:${port}`);
  });
