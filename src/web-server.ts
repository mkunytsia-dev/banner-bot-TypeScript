/**
 * Web-based Banner Maker server.
 *
 * Public banner maker UI + "Sign in with Slack" + submit-for-approval flow.
 * On startup also boots the Slack approval Bolt app (Socket Mode) if configured.
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
import { readSession, buildSetCookie, buildClearCookie } from './lib/session';
import * as oauth from './lib/slack-oauth';
import { initApprovalApp, postApprovalRequest, isApprovalConfigured } from './lib/slack-approval';
import { saveRequest, pngPath as pendingPngPath } from './lib/pending-store';

const PORT = parseInt(process.env.PORT || '', 10) || 3000;
const PUBLIC_DIR = path.resolve(__dirname, '../public');
const PREVIEWS_DIR = path.resolve(__dirname, '../docs/previews');
const SVG_CACHE_DIR = path.resolve(__dirname, '../assets/logos/cache');
if (!fs.existsSync(SVG_CACHE_DIR)) fs.mkdirSync(SVG_CACHE_DIR, { recursive: true });

const svgStore = new Map<string, string>();
const oauthStates = new Map<string, number>(); // state → expiry ms

function isSecureContext(): boolean {
  return (oauth.redirectUri()).startsWith('https://');
}

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

/**
 * Build banner params from a key/value input object (query or JSON body):
 * copies passthrough keys, resolves svgId/svgIdN to inline SVG, runs the
 * raster pipeline for templates that need it. Mutates and returns `params`.
 */
async function resolveParams(templateId: string, input: Record<string, any>): Promise<BannerParams> {
  const params: BannerParams = {};
  const passthrough: Array<keyof BannerParams> = [
    'title', 'subtitle', 'dateRange', 'variant', 'theme',
    'partnerLogo', 'partnerLogo1', 'partnerLogo2', 'partnerLogo3',
    'cryptoIcon', 'rightImage', 'partnerHeight',
  ];
  for (const key of passthrough) {
    const v = input[key as string];
    if (typeof v === 'string' && v) (params as Record<string, string>)[key as string] = v;
  }

  const singleId = typeof input.svgId === 'string' ? input.svgId : '';
  if (singleId && svgStore.has(singleId)) params.logoSvg = svgStore.get(singleId);
  for (const key of Object.keys(input)) {
    const m = key.match(/^svgId(\d+)$/);
    const v = input[key];
    if (m && typeof v === 'string' && svgStore.has(v)) {
      (params as Record<string, string>)['logoSvg' + m[1]] = svgStore.get(v) as string;
    }
  }

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
  return params;
}

async function handleRender(res: ServerResponse, query: url.UrlWithParsedQuery['query']): Promise<void> {
  const templateId = String(query.templateId || '');
  const template = TEMPLATES[templateId];
  if (!template) {
    res.statusCode = 400;
    res.end(`Unknown template: ${templateId}`);
    return;
  }
  const params = await resolveParams(templateId, query as Record<string, any>);

  if (query.download === '1') {
    try {
      const outputPath = await renderBanner(templateId, params);
      res.statusCode = 200;
      res.setHeader('Content-Type', 'image/png');
      res.setHeader('Content-Disposition', `attachment; filename="banner-${templateId}-${Date.now()}.png"`);
      const stream = fs.createReadStream(outputPath);
      stream.pipe(res);
      stream.on('end', () => { try { fs.unlinkSync(outputPath); } catch (_) { /* noop */ } });
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

function json(res: ServerResponse, status: number, obj: unknown): void {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(obj));
}

// ── Auth routes ────────────────────────────────────────────────────────────

function handleAuthStart(res: ServerResponse): void {
  if (!oauth.isConfigured()) {
    json(res, 503, { error: 'Slack sign-in not configured' });
    return;
  }
  const state = oauth.newState();
  oauthStates.set(state, Date.now() + 10 * 60 * 1000);
  res.statusCode = 302;
  res.setHeader('Location', oauth.buildAuthorizeUrl(state));
  res.end();
}

async function handleAuthCallback(res: ServerResponse, query: url.UrlWithParsedQuery['query']): Promise<void> {
  const code = typeof query.code === 'string' ? query.code : '';
  const state = typeof query.state === 'string' ? query.state : '';
  const exp = oauthStates.get(state);
  oauthStates.delete(state);
  if (!code || !exp || exp < Date.now()) {
    res.statusCode = 400;
    res.end('Invalid or expired sign-in attempt. Please try again.');
    return;
  }
  try {
    const user = await oauth.exchangeCode(code);
    res.statusCode = 302;
    res.setHeader('Set-Cookie', buildSetCookie(user, isSecureContext()));
    res.setHeader('Location', '/');
    res.end();
  } catch (err) {
    res.statusCode = 500;
    res.end(`Sign-in failed: ${(err as Error).message}`);
  }
}

async function handleSubmit(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const user = readSession(req.headers.cookie);
  if (!user) { json(res, 401, { error: 'Not signed in' }); return; }

  let body: Record<string, any>;
  try {
    body = JSON.parse(await readBody(req));
  } catch (_) {
    json(res, 400, { error: 'Invalid JSON body' });
    return;
  }
  const templateId = String(body.templateId || '');
  if (!TEMPLATES[templateId]) { json(res, 400, { error: `Unknown template: ${templateId}` }); return; }
  if (!isApprovalConfigured()) { json(res, 503, { error: 'Approval flow not configured on the server' }); return; }

  try {
    const params = await resolveParams(templateId, body);
    const outputPath = await renderBanner(templateId, params);
    const pngBuffer = fs.readFileSync(outputPath);
    try { fs.unlinkSync(outputPath); } catch (_) { /* noop */ }

    const record = saveRequest({
      requester: user.name,
      slackUserId: user.slackUserId,
      templateId,
      params,
      pngBuffer,
    });
    await postApprovalRequest(record);
    json(res, 200, { ok: true, id: record.id });
  } catch (err) {
    console.error('submit error:', err);
    json(res, 500, { error: (err as Error).message });
  }
}

const server = http.createServer(async (req: IncomingMessage, res: ServerResponse) => {
  const parsed = url.parse(req.url || '/', true);
  const pathname = parsed.pathname || '/';

  try {
    if (pathname === '/' || pathname === '/index.html') {
      return serveFile(res, path.join(PUBLIC_DIR, 'index.html'), 'text/html');
    }

    // Auth
    if (pathname === '/auth/slack') return handleAuthStart(res);
    if (pathname === '/auth/slack/callback') return await handleAuthCallback(res, parsed.query);
    if (pathname === '/auth/logout') {
      res.statusCode = 302;
      res.setHeader('Set-Cookie', buildClearCookie());
      res.setHeader('Location', '/');
      return res.end();
    }
    if (pathname === '/me') {
      const user = readSession(req.headers.cookie);
      return json(res, 200, {
        user,
        signInEnabled: oauth.isConfigured(),
        approvalEnabled: isApprovalConfigured(),
      });
    }

    // Template previews
    if (pathname.startsWith('/previews/')) {
      const file = pathname.slice('/previews/'.length);
      if (!/^template-\d+\.png$/.test(file)) { res.statusCode = 404; return res.end('Not Found'); }
      return serveFile(res, path.join(PREVIEWS_DIR, file), 'image/png');
    }

    // Pending banner images (for Slack approval image blocks)
    if (pathname.startsWith('/pending/')) {
      const file = pathname.slice('/pending/'.length);
      const m = file.match(/^([a-f0-9]{16})\.png$/i);
      if (!m) { res.statusCode = 404; return res.end('Not Found'); }
      return serveFile(res, pendingPngPath(m[1]), 'image/png');
    }

    if (pathname === '/render') return await handleRender(res, parsed.query);
    if (pathname === '/svg' && req.method === 'POST') return await handleSvgUpload(req, res);
    if (pathname === '/submit' && req.method === 'POST') return await handleSubmit(req, res);

    if (pathname === '/healthz') { res.statusCode = 200; return res.end('ok'); }

    res.statusCode = 404;
    res.end('Not Found');
  } catch (err) {
    console.error('Server error:', err);
    if (!res.headersSent) { res.statusCode = 500; res.end('Server Error'); }
  }
});

server.listen(PORT, () => {
  console.log(`\n  Banner Maker is running at http://localhost:${PORT}\n`);
});

// Boot the Slack approval app alongside the web server (non-fatal if unconfigured).
initApprovalApp().catch(err => {
  console.error('[approval] failed to start:', (err as Error).message);
});

process.on('SIGINT', async () => {
  await closeBrowser();
  process.exit(0);
});
