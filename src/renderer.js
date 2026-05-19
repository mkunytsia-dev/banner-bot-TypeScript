const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { TEMPLATES } = require('./templates/templates');

const OUTPUT_DIR = path.resolve(__dirname, '../output');
const RASTER_CACHE_DIR = path.resolve(__dirname, '../assets/logos/cache');
if (!fs.existsSync(RASTER_CACHE_DIR)) fs.mkdirSync(RASTER_CACHE_DIR, { recursive: true });

// Render an SVG string to a PNG at the given pixel dimensions, returns cache-relative path
// like "cache/raster-<hash>.png". Cached by hash of (svg, width, height).
async function rasterizeSvg(svgString, width, height) {
  const hash = crypto.createHash('sha1')
    .update(svgString + ':' + width + 'x' + height).digest('hex').slice(0, 16);
  const filename = `raster-${hash}.png`;
  const filepath = path.join(RASTER_CACHE_DIR, filename);
  const relPath = `cache/${filename}`;
  if (fs.existsSync(filepath)) return relPath;

  const b = await getBrowser();
  const page = await b.newPage();
  // 2x DPR keeps anti-aliasing crisp when the PNG is scaled
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

let browser = null;

async function getBrowser() {
  if (!browser) {
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage', // small /dev/shm on Railway containers
        '--disable-gpu',
      ],
    });
  }
  return browser;
}

async function renderBanner(templateId, params) {
  const template = TEMPLATES[templateId];
  if (!template) {
    throw new Error(`Unknown template: ${templateId}`);
  }

  const html = template.render(params);
  const b = await getBrowser();
  const page = await b.newPage();

  await page.setViewport({ width: 1600, height: 900, deviceScaleFactor: 1 });
  await page.setContent(html, { waitUntil: 'networkidle0' });

  // Wait for the inline auto-fit script (injected by templates.js) to finish
  await page.waitForFunction(() => window.__autoFitDone === true, { timeout: 5000 });

  const filename = `banner-${templateId}-${Date.now()}.png`;
  const outputPath = path.join(OUTPUT_DIR, filename);

  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  await page.screenshot({
    path: outputPath,
    type: 'png',
    clip: { x: 0, y: 0, width: 1600, height: 900 },
  });

  await page.close();
  return outputPath;
}

async function closeBrowser() {
  if (browser) {
    await browser.close();
    browser = null;
  }
}

module.exports = { renderBanner, closeBrowser, getBrowser, rasterizeSvg };
