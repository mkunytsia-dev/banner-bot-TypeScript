/**
 * Public static asset server (Slack image blocks need an HTTPS URL).
 */
import path from 'path';
import fs from 'fs';
import http, { IncomingMessage, ServerResponse } from 'http';
import { getLogoPreviewPath } from './logo-previews';

const PREVIEWS_DIR = path.resolve(__dirname, '../../docs/previews');
const LOGOS_DIR = path.resolve(__dirname, '../../assets/logos');

export function publicBaseUrl(): string | null {
  if (process.env.PUBLIC_BASE_URL) {
    return process.env.PUBLIC_BASE_URL.replace(/\/$/, '');
  }
  if (process.env.RAILWAY_PUBLIC_DOMAIN) {
    return `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`;
  }
  return null;
}

export function templatePreviewUrl(num: number | string): string | null {
  const base = publicBaseUrl();
  if (!base) return null;
  return `${base}/previews/template-${num}.png`;
}

export function logoPreviewUrl(logoFilename: string): string | null {
  const base = publicBaseUrl();
  if (!base) return null;
  const stem = logoFilename.replace(/\.[^.]+$/, '');
  return `${base}/logos/${encodeURIComponent(stem)}.png`;
}

function send404(res: ServerResponse): void {
  res.statusCode = 404;
  res.end('Not Found');
}

function streamFile(res: ServerResponse, filepath: string, contentType: string = 'image/png'): void {
  res.statusCode = 200;
  res.setHeader('Content-Type', contentType);
  res.setHeader('Cache-Control', 'public, max-age=86400');
  fs.createReadStream(filepath).pipe(res);
}

async function handleRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const url = (req.url || '/').split('?')[0];

  if (url === '/healthz' || url === '/') {
    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/plain');
    res.end('ok');
    return;
  }

  if (url.startsWith('/previews/')) {
    const file = url.slice('/previews/'.length);
    if (!/^template-\d+\.png$/.test(file)) return send404(res);
    const filepath = path.join(PREVIEWS_DIR, file);
    if (!fs.existsSync(filepath)) return send404(res);
    return streamFile(res, filepath);
  }

  if (url.startsWith('/logos/')) {
    const file = decodeURIComponent(url.slice('/logos/'.length));
    if (!/^[A-Za-z0-9._-]+\.png$/.test(file)) return send404(res);
    const stem = file.replace(/\.png$/, '');
    let sourceFile: string | undefined;
    try {
      const entries = fs.readdirSync(LOGOS_DIR);
      sourceFile = entries.find(f => f.replace(/\.[^.]+$/, '') === stem);
    } catch (_) {
      return send404(res);
    }
    if (!sourceFile) return send404(res);
    try {
      const previewPath = await getLogoPreviewPath(sourceFile);
      return streamFile(res, previewPath);
    } catch (err) {
      console.error('[static-server] logo preview failed:', (err as Error).message);
      return send404(res);
    }
  }

  send404(res);
}

export function startStaticServer(): http.Server {
  const port = parseInt(process.env.PORT || '', 10) || 3000;
  const server = http.createServer((req, res) => {
    handleRequest(req, res).catch(err => {
      console.error('[static-server] handler error:', err);
      if (!res.headersSent) {
        res.statusCode = 500;
        res.end('Server Error');
      }
    });
  });
  server.listen(port, () => {
    const base = publicBaseUrl();
    console.log(`[static-server] listening on :${port}`);
    if (base) {
      console.log(`[static-server] public base URL: ${base}`);
    } else {
      console.warn('[static-server] PUBLIC_BASE_URL is not set — Slack image blocks will not render.');
    }
  });
  return server;
}
