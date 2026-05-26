/**
 * Web-based Banner Maker server.
 */
import 'dotenv/config';
import http, { IncomingMessage, ServerResponse } from 'http';
import fs from 'fs';
import path from 'path';
import url from 'url';
import crypto from 'crypto';
import { TEMPLATES, recolorSvg, getSvgAspect } from './templates/templates';
import { renderBanner, closeBrowser, rasterizeSvg } from './renderer';
import type { BannerParams } from './types';

const PORT = parseInt(process.env.PORT || '', 10) || 3000;
const PUBLIC_DIR = path.resolve(__dirname, '../public');
const PREVIEWS_DIR = path.resolve(__dirname, '../docs/previews');
const SVG_CACHE_DIR = path.resolve(__dirname, '../assets/logos/cache');
if (!fs.existsSync(SVG_CACHE_DIR)) fs.mkdirSync(SVG_CACHE_DIR, { recursive: true });

const svgStore = new Map<string, string>();

function readBody(req: IncomingMessage, maxBytes: number = 1024 * 1024): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = '';
    let bytes = 0;
    req.on('data', (chunk: Buffer) => {
      bytes += chunk.length;
      if (bytes > maxBytes) { req.destroy(); reject(new Error('Body too large')); return; }
      data += chunk.toString('utf8');
    });
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

async function handleSvgUpload(req: IncomingMessage, res: ServerResponse): Promise<void> {
  try {
    const body = await readBody(req);
    if (!body || !/<svg[\s>]/i.test(body)) {
      res.statusCode = 400;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'Body must contain an <svg> element' }));
      return;
    }
    const id = crypto.createHash('sha1').update(body).digest('hex').slice(0, 12);
    svgStore.set(id, body);
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ id }));
  } catch (err) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: (err as Error).message }));
  }
}

function serveFile(res: ServerResponse, filepath: string, contentType: string): void {
  if (!fs.existsSync(filepath)) {
    res.statusCode = 404;
    res.end('Not Found');
    return;
  }
  res.statusCode = 200;
  res.setHeader('Content-Type', contentType);
  fs.createReadStream(filepath).pipe(res);
}

interface RasterTemplateConfig {
  primary: string;
  secondary: string;
  baseHeight: number;
}

const RASTER_TEMPLATES: Record<string, RasterTemplateConfig> = {
  collaboration: { primary: '#034638', secondary: '#F5FFFD', baseHeight: 80 },
};

async function handleRender(res: ServerResponse, query: url.UrlWithParsedQuery['query']): Promise<void> {
  const templateId = String(query.templateId || '');
  const template = TEMPLATES[templateId];
  if (!template) {
    res.statusCode = 400;
    res.end(`Unknown template: ${templateId}`);
    return;
  }

  const params: BannerParams = {};
  const passthrough: Array<keyof BannerParams> = [
    'title', 'subtitle', 'dateRange', 'variant', 'theme',
    'partnerLogo', 'partnerLogo1', 'partnerLogo2', 'partnerLogo3',
    'cryptoIcon', 'rightImage', 'partnerHeight',
  ];
  for (const key of passthrough) {
    const v = query[key];
    if (typeof v === 'string' && v) {
      (params as Record<string, string>)[key as string] = v;
    }
  }

  // Resolve SVG by id (POST /svg). Supports svgId and svgId1..N slots.
  const singleId = typeof query.svgId === 'string' ? query.svgId : '';
  if (singleId && svgStore.has(singleId)) {
    params.logoSvg = svgStore.get(singleId);
  }
  for (const key of Object.keys(query)) {
    const m = key.match(/^svgId(\d+)$/);
    const v = query[key];
    if (m && typeof v === 'string' && svgStore.has(v)) {
      (params as Record<string, string>)['logoSvg' + m[1]] = svgStore.get(v) as string;
    }
  }

  // Pre-rasterize the partner SVG for templates that need pixel-stable sizing
  if (params.logoSvg && RASTER_TEMPLATES[templateId]) {
    const cfg = RASTER_TEMPLATES[templateId];
    const requestedH = parseInt(params.partnerHeight || '', 10);
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
    try {
      const outputPath = await renderBanner(templateId, params);
      res.statusCode = 200;
      res.setHeader('Content-Type', 'image/png');
      res.setHeader('Content-Disposition', `attachment; filename="banner-${templateId}-${Date.now()}.png"`);
      const stream = fs.createReadStream(outputPath);
      stream.pipe(res);
      stream.on('end', () => {
        try { fs.unlinkSync(outputPath); } catch (_) { /* noop */ }
      });
    } catch (err) {
      res.statusCode = 500;
      res.end(`Render error: ${(err as Error).message}`);
    }
  } else {
    try {
      const html = template.render(params);
      res.statusCode = 200;
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.end(html);
    } catch (err) {
      res.statusCode = 500;
      res.end(`Render error: ${(err as Error).message}`);
    }
  }
}

const server = http.createServer(async (req: IncomingMessage, res: ServerResponse) => {
  const parsed = url.parse(req.url || '/', true);
  const pathname = parsed.pathname || '/';

  try {
    if (pathname === '/' || pathname === '/index.html') {
      return serveFile(res, path.join(PUBLIC_DIR, 'index.html'), 'text/html');
    }

    if (pathname.startsWith('/previews/')) {
      const file = pathname.slice('/previews/'.length);
      if (!/^template-\d+\.png$/.test(file)) {
        res.statusCode = 404;
        return res.end('Not Found');
      }
      return serveFile(res, path.join(PREVIEWS_DIR, file), 'image/png');
    }

    if (pathname === '/render') {
      return await handleRender(res, parsed.query);
    }

    if (pathname === '/svg' && req.method === 'POST') {
      return await handleSvgUpload(req, res);
    }

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
