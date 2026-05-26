import puppeteer, { Browser } from 'puppeteer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { TEMPLATES } from './templates/templates';
import type { BannerParams } from './types';

const OUTPUT_DIR = path.resolve(__dirname, '../output');
const RASTER_CACHE_DIR = path.resolve(__dirname, '../assets/logos/cache');
if (!fs.existsSync(RASTER_CACHE_DIR)) fs.mkdirSync(RASTER_CACHE_DIR, { recursive: true });

/**
 * Render an SVG string to a PNG at the given pixel dimensions.
 * Returns the cache-relative path (e.g. "cache/raster-abc123.png"),
 * keyed by sha1(svg, width, height).
 */
export async function rasterizeSvg(svgString: string, width: number, height: number): Promise<string> {
  const hash = crypto.createHash('sha1')
    .update(svgString + ':' + width + 'x' + height).digest('hex').slice(0, 16);
  const filename = `raster-${hash}.png`;
  const filepath = path.join(RASTER_CACHE_DIR, filename);
  const relPath = `cache/${filename}`;
  if (fs.existsSync(filepath)) return relPath;

  const b = await getBrowser();
  const page = await b.newPage();
  await page.setViewport({ width, height, deviceScaleFactor: 2 });
  const html = `<!DOCTYPE html><html><head><style>
    html,body{margin:0;padding:0;background:transparent;}
    svg{width:${width}px !important;height:${height}px !important;display:block;}
  </style></head><body>${svgString}</body></html>`;
  await page.setContent(html, { waitUntil: 'networkidle0' });
  const buf = await page.screenshot({
    type: 'png',
    omitBackground: true,
    clip: { x: 0, y: 0, width, height },
  });
  await page.close();
  fs.writeFileSync(filepath, buf);
  return relPath;
}

let browser: Browser | null = null;

export async function getBrowser(): Promise<Browser> {
  if (!browser) {
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
      ],
    });
  }
  return browser;
}

export async function renderBanner(templateId: string, params: BannerParams): Promise<string> {
  const template = TEMPLATES[templateId];
  if (!template) {
    throw new Error(`Unknown template: ${templateId}`);
  }

  const html = template.render(params);
  const b = await getBrowser();
  const page = await b.newPage();

  await page.setViewport({ width: 1600, height: 900, deviceScaleFactor: 1 });
  await page.setContent(html, { waitUntil: 'networkidle0' });

  // Wait for the inline auto-fit script (injected by templates.ts) to finish
  await page.waitForFunction(
    () => (window as unknown as { __autoFitDone?: boolean }).__autoFitDone === true,
    { timeout: 5000 }
  );

  const filename = `banner-${templateId}-${Date.now()}.png`;
  const outputPath = path.join(OUTPUT_DIR, filename);

  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  await page.screenshot({
    path: outputPath as `${string}.png`,
    type: 'png',
    clip: { x: 0, y: 0, width: 1600, height: 900 },
  });

  await page.close();
  return outputPath;
}

export async function closeBrowser(): Promise<void> {
  if (browser) {
    await browser.close();
    browser = null;
  }
}
