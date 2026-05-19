/**
 * Web-based Banner Maker server.
 *
 * Serves:
 *   GET /                  → public/index.html (banner maker UI)
 *   GET /previews/*.png    → docs/previews/ (template thumbnails)
 *   GET /render?...        → renders banner HTML (for iframe preview)
 *   GET /render?...&download=1 → renders banner and returns PNG
 */
require('dotenv').config();
const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');
const { TEMPLATES, recolorSvg, getSvgAspect } = require('./templates/templates');
const { renderBanner, closeBrowser, rasterizeSvg } = require('./renderer');

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.resolve(__dirname, '../public');
const PREVIEWS_DIR = path.resolve(__dirname, '../docs/previews');
const SVG_CACHE_DIR = path.resolve(__dirname, '../assets/logos/cache');
if (!fs.existsSync(SVG_CACHE_DIR)) fs.mkdirSync(SVG_CACHE_DIR, { recursive: true });
const svgStore = new Map(); // id → svg string, in-memory keyed cache

function readBody(req, maxBytes = 1024 * 1024) {
  return new Promise((resolve, reject) => {
    let data = '';
    let bytes = 0;
    req.on('data', chunk => {
      bytes += chunk.length;
      if (bytes > maxBytes) { req.destroy(); reject(new Error('Body too large')); return; }
      data += chunk;
    });
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

async function handleSvgUpload(req, res) {
  try {
    const body = await readBody(req);
    if (!body || !/<svg[\s>]/i.test(body)) {
      res.statusCode = 400;
      res.setHeader('Content-Type', 'application/json');
      return res.end(JSON.stringify({ error: 'Body must contain an <svg> element' }));
    }
    const id = require('crypto').createHash('sha1').update(body).digest('hex').slice(0, 12);
    svgStore.set(id, body);
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ id }));
  } catch (err) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: err.message }));
  }
}

function serveFile(res, filepath, contentType) {
  if (!fs.existsSync(filepath)) {
    res.statusCode = 404;
    res.end('Not Found');
    return;
  }
  res.statusCode = 200;
  res.setHeader('Content-Type', contentType);
  fs.createReadStream(filepath).pipe(res);
}

async function handleRender(res, query) {
  const templateId = query.templateId;
  const template = TEMPLATES[templateId];
  if (!template) {
    res.statusCode = 400;
    res.end(`Unknown template: ${templateId}`);
    return;
  }

  // Build params from query
  const params = {};
  const passthrough = ['title', 'subtitle', 'dateRange', 'variant', 'theme',
    'partnerLogo', 'partnerLogo1', 'partnerLogo2', 'partnerLogo3',
    'cryptoIcon', 'rightImage', 'partnerHeight'];
  for (const key of passthrough) {
    if (query[key]) params[key] = query[key];
  }
  // Resolve SVG by id (stored via POST /svg). Supports single (svgId) and numbered slots (svgId1, svgId2, …).
  if (query.svgId && svgStore.has(query.svgId)) {
    params.logoSvg = svgStore.get(query.svgId);
  }
  for (const key of Object.keys(query)) {
    const m = key.match(/^svgId(\d+)$/);
    if (m && svgStore.has(query[key])) {
      params['logoSvg' + m[1]] = svgStore.get(query[key]);
    }
  }

  // For templates that benefit from rasterized partner logos (eliminates SVG sizing quirks),
  // recolor the SVG with template-specific colors, rasterize to PNG, and pass the cached
  // path as `partnerLogoRaster` so the template can `<img>` it.
  const RASTER_TEMPLATES = {
    collaboration: { primary: '#034638', secondary: '#F5FFFD', baseHeight: 80 },
  };
  if (params.logoSvg && RASTER_TEMPLATES[templateId]) {
    const cfg = RASTER_TEMPLATES[templateId];
    const requestedH = parseInt(params.partnerHeight, 10);
    const targetH = Number.isFinite(requestedH) ? Math.max(40, Math.min(300, requestedH)) : cfg.baseHeight;
    const aspect = getSvgAspect(params.logoSvg);
    const targetW = Math.max(1, Math.round(targetH * aspect));
    const recolored = recolorSvg(params.logoSvg, cfg.primary, cfg.secondary);
    try {
      params.partnerLogoRaster = await rasterizeSvg(recolored, targetW, targetH);
      params.partnerLogoRasterW = targetW;
      params.partnerLogoRasterH = targetH;
      delete params.logoSvg;
    } catch (err) {
      console.error('Raster failed:', err);
    }
  }

  if (query.download === '1') {
    // Render PNG and return as download
    try {
      const outputPath = await renderBanner(templateId, params);
      res.statusCode = 200;
      res.setHeader('Content-Type', 'image/png');
      res.setHeader('Content-Disposition', `attachment; filename="banner-${templateId}-${Date.now()}.png"`);
      const stream = fs.createReadStream(outputPath);
      stream.pipe(res);
      stream.on('end', () => {
        try { fs.unlinkSync(outputPath); } catch (_) {}
      });
    } catch (err) {
      res.statusCode = 500;
      res.end(`Render error: ${err.message}`);
    }
  } else {
    // Return HTML for iframe preview
    try {
      const html = template.render(params);
      res.statusCode = 200;
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.end(html);
    } catch (err) {
      res.statusCode = 500;
      res.end(`Render error: ${err.message}`);
    }
  }
}

const server = http.createServer(async (req, res) => {
  const parsed = url.parse(req.url, true);
  const pathname = parsed.pathname;

  try {
    // Static: index.html
    if (pathname === '/' || pathname === '/index.html') {
      return serveFile(res, path.join(PUBLIC_DIR, 'index.html'), 'text/html');
    }

    // Template previews
    if (pathname.startsWith('/previews/')) {
      const file = pathname.slice('/previews/'.length);
      if (!/^template-\d+\.png$/.test(file)) {
        res.statusCode = 404;
        return res.end('Not Found');
      }
      return serveFile(res, path.join(PREVIEWS_DIR, file), 'image/png');
    }

    // Render
    if (pathname === '/render') {
      return await handleRender(res, parsed.query);
    }

    // SVG upload (POST) — returns { id } to use as svgId in /render
    if (pathname === '/svg' && req.method === 'POST') {
      return await handleSvgUpload(req, res);
    }

    // Health
    if (pathname === '/healthz') {
      res.statusCode = 200;
      return res.end('ok');
    }

    res.statusCode = 404;
    res.end('Not Found');
  } catch (err) {
    console.error('Server error:', err);
    if (!res.headersSent) {
      res.statusCode = 500;
      res.end('Server Error');
    }
  }
});

server.listen(PORT, () => {
  console.log(`\n  Banner Maker is running at http://localhost:${PORT}\n`);
});

process.on('SIGINT', async () => {
  await closeBrowser();
  process.exit(0);
});
