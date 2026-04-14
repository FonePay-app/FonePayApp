/**
 * Servidor local para probar las funciones antes de deploy en Vercel.
 * NO usar en producción — solo para desarrollo local.
 *
 * Uso:
 *   node server.js
 *
 * Endpoints disponibles:
 *   POST http://localhost:3000/api/fonepay/init
 *   GET  http://localhost:3000/api/fonepay/return
 *   GET  http://localhost:3000/api/oauth/callback
 *   GET  http://localhost:3000/success.html
 *   GET  http://localhost:3000/failed.html
 */

require('dotenv').config({ path: '.env.local' });

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

// Importar handlers
const fonepayInit = require('./api/fonepay/init');
const fonepayReturn = require('./api/fonepay/return');
const oauthCallback = require('./api/oauth/callback');

// Helper para parsear body JSON
function parseBody(req) {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try { resolve(JSON.parse(body)); }
      catch { resolve({}); }
    });
  });
}

// Mock del objeto res de Vercel
function mockRes(res) {
  const mock = {
    _status: 200,
    _headers: {},
    status(code) { this._status = code; return this; },
    json(data) {
      res.writeHead(this._status, { 'Content-Type': 'application/json', ...this._headers });
      res.end(JSON.stringify(data));
    },
    redirect(code, location) {
      res.writeHead(typeof code === 'number' ? code : 302, {
        Location: typeof code === 'string' ? code : location
      });
      res.end();
    },
    setHeader(k, v) { this._headers[k] = v; return this; },
    send(data) {
      res.writeHead(this._status, { 'Content-Type': 'text/html', ...this._headers });
      res.end(data);
    }
  };
  return mock;
}

const server = http.createServer(async (req, res) => {
  const parsed = url.parse(req.url, true);
  const pathname = parsed.pathname;

  console.log(`[${req.method}] ${pathname}`);

  // Mock req con query params y body
  const mockReq = {
    method: req.method,
    headers: req.headers,
    query: parsed.query,
    body: req.method === 'POST' ? await parseBody(req) : {},
    url: req.url,
  };

  const mockResponse = mockRes(res);

  // Routing
  if (pathname === '/api/fonepay/init') {
    return fonepayInit(mockReq, mockResponse);
  }

  if (pathname === '/api/fonepay/return') {
    return fonepayReturn(mockReq, mockResponse);
  }

  if (pathname === '/api/oauth/callback') {
    return oauthCallback(mockReq, mockResponse);
  }

  // Servir archivos estáticos (success.html, failed.html)
  if (pathname.endsWith('.html')) {
    const filePath = path.join(__dirname, 'public', path.basename(pathname));
    if (fs.existsSync(filePath)) {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      return res.end(fs.readFileSync(filePath));
    }
  }

  // 404
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not found', path: pathname }));
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`\n✓ Servidor corriendo en http://localhost:${PORT}`);
  console.log(`\nEndpoints disponibles:`);
  console.log(`  POST http://localhost:${PORT}/api/fonepay/init`);
  console.log(`  GET  http://localhost:${PORT}/api/fonepay/return`);
  console.log(`  GET  http://localhost:${PORT}/api/oauth/callback`);
  console.log(`\nFonePay mode: ${process.env.FONEPAY_MODE || 'test'}`);
  console.log(`FonePay PID:  ${process.env.FONEPAY_PID}`);
  console.log(`GHL Client:   ${process.env.GHL_CLIENT_ID}\n`);
});
