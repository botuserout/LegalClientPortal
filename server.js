/**
 * Legal Sthal Local Development & Proxy Server
 * Serves static assets and proxies API requests to Google Apps Script.
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const PORT = process.env.PORT || 3000;
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxJ-MYnHlZAPQ8HjKzIjEl-YsxzXh8LtdN-V5fUEA8nT0EmXtun2BK4czmrTlVdShatzw/exec';

// Disable TLS reject unauthorized for local proxy to handle self-signed / enterprise proxies
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const serverCache = new Map();
const staticCache = new Map();

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.md': 'text/markdown; charset=utf-8'
};

const server = http.createServer(async (req, res) => {
  // Enable CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = parsedUrl.pathname;

  // 1. Health check route
  if (pathname === '/api/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', time: new Date().toISOString() }));
    return;
  }

  // In-memory cache for server proxy
  // 2. Google Apps Script Proxy Route
  if (pathname === '/api/backend') {
    if (req.method === 'POST') {
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', async () => {
        try {
          let parsedBody = {};
          try { parsedBody = JSON.parse(body); } catch (e) {}
          const action = parsedBody.action || '';
          const isMutation = !action.startsWith('get') && !action.startsWith('adminGet') && action !== 'healthCheck';

          if (isMutation) {
            serverCache.clear();
          } else if (serverCache.has(body)) {
            const cached = serverCache.get(body);
            if (Date.now() - cached.time < 60000) {
              console.log(`[API Proxy Cache HIT] Instant response for action: ${action}`);
              res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
              res.end(cached.data);
              return;
            }
          }

          console.log(`[API Proxy] Forwarding POST request (${action || 'unknown'}) to Apps Script...`);
          const controller = new AbortController();
          const timeoutMs = (action === 'login' || action === 'getMe') ? 4000 : 25000;
          const timeout = setTimeout(() => controller.abort(), timeoutMs);

          const backendRes = await fetch(APPS_SCRIPT_URL, {
            method: 'POST',
            headers: {
              'Content-Type': 'text/plain;charset=utf-8'
            },
            body: body,
            signal: controller.signal
          });
          clearTimeout(timeout);

          const data = await backendRes.text();
          console.log(`[API Proxy] Apps Script response status: ${backendRes.status}`);

          let isValidJson = false;
          try {
            JSON.parse(data);
            isValidJson = true;
          } catch (e) {
            isValidJson = false;
          }

          if (!isValidJson || backendRes.status === 401 || backendRes.status === 403) {
            console.warn(`[API Proxy] Upstream returned ${backendRes.status} non-JSON or permission page.`);
            res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({
              success: false,
              isOffline: true,
              error: {
                code: 'GATEWAY_ERROR',
                message: 'Google Apps Script backend returned non-JSON or access denied (HTTP ' + backendRes.status + '). Ensure the Apps Script Web App is deployed with "Who has access: Anyone".'
              }
            }));
            return;
          }

          if (backendRes.ok && !isMutation) {
            serverCache.set(body, { data: data, time: Date.now() });
          }

          res.writeHead(backendRes.status, {
            'Content-Type': 'application/json; charset=utf-8'
          });
          res.end(data);
        } catch (err) {
          console.error('[API Proxy Error]', err.message);
          res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({
            success: false,
            isOffline: true,
            error: {
              code: 'GATEWAY_ERROR',
              message: 'Failed to communicate with Google Apps Script backend: ' + err.message
            }
          }));
        }
      });
      return;
    } else if (req.method === 'GET') {
      // Forward GET query params to Apps Script
      try {
        const targetUrl = `${APPS_SCRIPT_URL}${parsedUrl.search}`;
        console.log(`[API Proxy] Forwarding GET request to Apps Script...`);
        const backendRes = await fetch(targetUrl);
        const data = await backendRes.text();

        let isValidJson = false;
        try {
          JSON.parse(data);
          isValidJson = true;
        } catch (e) {
          isValidJson = false;
        }

        if (!isValidJson || backendRes.status === 401 || backendRes.status === 403) {
          res.writeHead(502, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({
            success: false,
            error: {
              code: 'GATEWAY_ERROR',
              message: 'Google Apps Script backend returned non-JSON or access denied (HTTP ' + backendRes.status + ').'
            }
          }));
          return;
        }

        res.writeHead(backendRes.status, {
          'Content-Type': 'application/json; charset=utf-8'
        });
        res.end(data);
      } catch (err) {
        console.error('[API Proxy GET Error]', err.message);
        res.writeHead(502, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({
          success: false,
          error: {
            code: 'GATEWAY_ERROR',
            message: 'Failed to communicate with Google Apps Script: ' + err.message
          }
        }));
      }
      return;
    }
  }

  // 3. Static Files Serving
  let filePath = path.join(__dirname, pathname === '/' ? 'index.html' : pathname);
  
  // Security check: prevent directory traversal
  if (!filePath.startsWith(__dirname)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 Not Found: ' + pathname);
      return;
    }

    if (stats.isDirectory()) {
      filePath = path.join(filePath, 'index.html');
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    const isHtml = ext === '.html';
    const acceptEncoding = req.headers['accept-encoding'] || '';
    const supportsGzip = acceptEncoding.includes('gzip') && (
      contentType.includes('text') ||
      contentType.includes('javascript') ||
      contentType.includes('json') ||
      contentType.includes('svg')
    );

    const cacheKey = filePath;
    const cachedItem = staticCache.get(cacheKey);

    const sendResponse = (rawBuf, gzBuf, etag) => {
      // 304 Not Modified
      if (req.headers['if-none-match'] === etag) {
        res.writeHead(304);
        res.end();
        return;
      }

      const headers = {
        'Content-Type': contentType,
        'ETag': etag,
        'Cache-Control': isHtml ? 'no-cache' : 'public, max-age=86400, stale-while-revalidate=3600'
      };

      if (supportsGzip && gzBuf) {
        headers['Content-Encoding'] = 'gzip';
        headers['Vary'] = 'Accept-Encoding';
        res.writeHead(200, headers);
        res.end(gzBuf);
      } else {
        res.writeHead(200, headers);
        res.end(rawBuf);
      }
    };

    if (cachedItem && cachedItem.mtimeMs === stats.mtimeMs) {
      sendResponse(cachedItem.raw, cachedItem.gz, cachedItem.etag);
      return;
    }

    fs.readFile(filePath, (readErr, content) => {
      if (readErr) {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('500 Internal Server Error');
        return;
      }

      const etag = `"${stats.size}-${stats.mtimeMs}"`;
      let gz = null;
      try {
        if (supportsGzip) {
          gz = zlib.gzipSync(content, { level: 6 });
        }
      } catch (gzErr) {}

      staticCache.set(cacheKey, {
        raw: content,
        gz: gz,
        etag: etag,
        mtimeMs: stats.mtimeMs
      });

      sendResponse(content, gz, etag);
    });
  });
});

server.listen(PORT, () => {
  console.log(`Legal Sthal Portal server running at http://localhost:${PORT}`);
  console.log(`Backend proxy active at http://localhost:${PORT}/api/backend -> Google Apps Script`);
});
