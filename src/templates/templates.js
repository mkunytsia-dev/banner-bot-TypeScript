const path = require('path');
const fs = require('fs');

const ASSETS_DIR = path.resolve(__dirname, '../../assets');
const FONTS_DIR = path.join(ASSETS_DIR, 'fonts');
const LOGOS_DIR = path.join(ASSETS_DIR, 'logos');

function fontToBase64(filename) {
  const filepath = path.join(FONTS_DIR, filename);
  const buffer = fs.readFileSync(filepath);
  return buffer.toString('base64');
}

function imageToBase64(filepath) {
  if (!fs.existsSync(filepath)) return '';
  const buffer = fs.readFileSync(filepath);
  const ext = path.extname(filepath).slice(1).toLowerCase();
  const mime = ext === 'svg' ? 'image/svg+xml' : `image/${ext}`;
  return `data:${mime};base64,${buffer.toString('base64')}`;
}

function getEverstakeLogo(theme) {
  const filename = theme === 'dark' ? 'everstake-light.png' : 'everstake-dark.png';
  return imageToBase64(path.join(LOGOS_DIR, filename));
}

function getPartnerLogo(logoFilename) {
  if (!logoFilename) return '';
  const filepath = path.join(LOGOS_DIR, logoFilename);
  return imageToBase64(filepath);
}

// Base64 encode fonts for inline use
const fonts = {
  extraLight: fontToBase64('ZalandoSans-ExtraLight.ttf'),
  light: fontToBase64('ZalandoSans-Light.ttf'),
  regular: fontToBase64('ZalandoSans-Regular.ttf'),
  medium: fontToBase64('ZalandoSans-Medium.ttf'),
};

function baseStyles() {
  return `
    @font-face {
      font-family: 'Zalando Sans';
      src: url('data:font/truetype;base64,${fonts.extraLight}') format('truetype');
      font-weight: 200;
    }
    @font-face {
      font-family: 'Zalando Sans';
      src: url('data:font/truetype;base64,${fonts.light}') format('truetype');
      font-weight: 300;
    }
    @font-face {
      font-family: 'Zalando Sans';
      src: url('data:font/truetype;base64,${fonts.regular}') format('truetype');
      font-weight: 400;
    }
    @font-face {
      font-family: 'Zalando Sans';
      src: url('data:font/truetype;base64,${fonts.medium}') format('truetype');
      font-weight: 500;
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      width: 1600px;
      height: 900px;
      overflow: hidden;
      font-family: 'Zalando Sans', sans-serif;
    }
    .banner {
      position: relative;
      width: 1600px;
      height: 900px;
      overflow: hidden;
    }
  `;
}

function gridOverlay(theme = 'light') {
  const color = theme === 'dark' ? 'rgba(222,232,230,0.12)' : '#dee8e6';
  // 5 vertical lines + 2 horizontal lines matching Figma grid
  return `
    <div style="position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:1;">
      <div style="position:absolute;left:40px;top:0;width:2px;height:100%;background:${color};"></div>
      <div style="position:absolute;left:400px;top:0;width:2px;height:100%;background:${color};"></div>
      <div style="position:absolute;left:800px;top:0;width:2px;height:100%;background:${color};"></div>
      <div style="position:absolute;left:1200px;top:0;width:2px;height:100%;background:${color};"></div>
      <div style="position:absolute;left:1558px;top:0;width:2px;height:100%;background:${color};"></div>
      <div style="position:absolute;left:0;top:40px;width:100%;height:2px;background:${color};"></div>
      <div style="position:absolute;left:0;top:858px;width:100%;height:2px;background:${color};"></div>
    </div>
  `;
}

function gradientBlobs(positions) {
  return positions.map(({ x, y, size, color }) => `
    <div style="
      position:absolute;
      left:${x}px;top:${y}px;
      width:${size}px;height:${size}px;
      border-radius:50%;
      filter:blur(200px);
      z-index:0;
      background:${color};
    "></div>
  `).join('');
}

// ============================================
// TYPE A: Split layout - left text, right partner logo
// Examples: DES-283 (Monad), DES-286 (Solana), DES-284 (Aptos), DES-301 (Neo)
// ============================================
function typeA({ title, subtitle, partnerLogo, theme = 'light' }) {
  const bgColor = theme === 'dark' ? 'linear-gradient(180deg, #034638 75%, #012d24 100%)' : '#f5fffd';
  const textColor = theme === 'dark' ? '#f5fffd' : '#034638';
  const dividerColor = theme === 'dark' ? 'rgba(222,232,230,0.12)' : '#dee8e6';
  const everstakeLogo = getEverstakeLogo(theme);
  const partnerLogoSrc = getPartnerLogo(partnerLogo);

  const blobs = theme === 'light' ? gradientBlobs([
    { x: -120, y: -120, size: 640, color: 'radial-gradient(circle, rgba(64,193,172,0.45), rgba(130,230,180,0.7))' },
  ]) : '';

  return `<!DOCTYPE html><html><head><style>
    ${baseStyles()}
  </style></head><body>
    <div class="banner" style="background:${bgColor};color:${textColor};">
      ${blobs}
      ${gridOverlay(theme)}

      <!-- Everstake logo top-left -->
      <img src="${everstakeLogo}" style="position:absolute;top:52px;left:80px;height:32px;z-index:10;" />

      <!-- Vertical divider -->
      <div style="position:absolute;left:800px;top:0;width:2px;height:100%;background:${dividerColor};z-index:2;"></div>

      <!-- Left side: text -->
      <div style="position:absolute;left:80px;bottom:80px;z-index:5;max-width:680px;">
        ${subtitle ? `<div style="font-weight:500;font-size:20px;letter-spacing:0.1em;text-transform:uppercase;margin-bottom:20px;">${subtitle}</div>` : ''}
        <div style="font-weight:200;font-size:96px;line-height:1.04;">${title}</div>
      </div>

      <!-- Right side: partner logo centered -->
      ${partnerLogoSrc ? `
        <div style="position:absolute;left:800px;top:0;width:800px;height:900px;display:flex;align-items:center;justify-content:center;z-index:5;">
          <img src="${partnerLogoSrc}" style="max-width:500px;max-height:300px;width:auto;height:auto;" />
        </div>
      ` : ''}
    </div>
  </body></html>`;
}

// ============================================
// TYPE B: Centered title, light background with gradient accents
// Examples: DES-285, DES-312 (Ethereum)
// ============================================
function typeB({ title, subtitle, partnerLogo, theme = 'light' }) {
  const bgColor = theme === 'dark' ? 'linear-gradient(180deg, #034638 75%, #012d24 100%)' : '#f5fffd';
  const textColor = theme === 'dark' ? '#f5fffd' : '#034638';
  const everstakeLogo = getEverstakeLogo(theme);
  const partnerLogoSrc = getPartnerLogo(partnerLogo);

  const blobs = theme === 'light' ? gradientBlobs([
    { x: -100, y: -100, size: 500, color: 'radial-gradient(circle, rgba(64,193,172,0.4), rgba(130,230,180,0.6))' },
    { x: 1100, y: 500, size: 500, color: 'radial-gradient(circle, rgba(64,193,172,0.3), rgba(130,230,180,0.4))' },
  ]) : gradientBlobs([
    { x: -100, y: -100, size: 500, color: 'radial-gradient(circle, rgba(64,193,172,0.2), rgba(80,200,170,0.3))' },
  ]);

  return `<!DOCTYPE html><html><head><style>
    ${baseStyles()}
  </style></head><body>
    <div class="banner" style="background:${bgColor};color:${textColor};">
      ${blobs}
      ${gridOverlay(theme)}

      <div style="position:absolute;top:0;left:0;width:100%;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;z-index:5;padding:80px;">
        ${partnerLogoSrc ? `<img src="${partnerLogoSrc}" style="max-width:300px;max-height:120px;margin-bottom:40px;" />` : ''}
        ${subtitle ? `<div style="font-weight:500;font-size:20px;letter-spacing:0.1em;text-transform:uppercase;margin-bottom:24px;text-align:center;">${subtitle}</div>` : ''}
        <div style="font-weight:200;font-size:96px;line-height:1.04;text-align:center;max-width:1200px;">${title}</div>
      </div>
    </div>
  </body></html>`;
}

// ============================================
// TYPE C: Dark background, centered title
// Examples: DES-336, DES-337, DES-317, DES-318
// ============================================
function typeC({ title, subtitle, theme = 'dark' }) {
  const bgColor = 'linear-gradient(180deg, #034638 75%, #012d24 100%)';
  const textColor = '#f5fffd';
  const everstakeLogo = getEverstakeLogo('dark');

  const blobs = gradientBlobs([
    { x: -150, y: -150, size: 600, color: 'radial-gradient(circle, rgba(64,193,172,0.15), rgba(80,200,170,0.2))' },
    { x: 1000, y: 400, size: 500, color: 'radial-gradient(circle, rgba(64,193,172,0.1), rgba(80,200,170,0.15))' },
  ]);

  return `<!DOCTYPE html><html><head><style>
    ${baseStyles()}
  </style></head><body>
    <div class="banner" style="background:${bgColor};color:${textColor};">
      ${blobs}
      ${gridOverlay('dark')}

      <img src="${everstakeLogo}" style="position:absolute;top:52px;left:80px;height:32px;z-index:10;" />

      <div style="position:absolute;top:0;left:0;width:100%;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;z-index:5;padding:80px;">
        ${subtitle ? `<div style="font-weight:500;font-size:20px;letter-spacing:0.1em;text-transform:uppercase;margin-bottom:24px;text-align:center;">${subtitle}</div>` : ''}
        <div style="font-weight:200;font-size:111px;line-height:1.04;text-align:center;max-width:1200px;">${title}</div>
      </div>
    </div>
  </body></html>`;
}

// ============================================
// TYPE D: Partnership - two logos with "x" between
// Examples: DES-298 (everstake x Pye)
// ============================================
function typeD({ partnerLogo, theme = 'light' }) {
  const bgColor = theme === 'dark' ? 'linear-gradient(180deg, #034638 75%, #012d24 100%)' : '#f5fffd';
  const textColor = theme === 'dark' ? '#f5fffd' : '#034638';
  const everstakeLogo = getEverstakeLogo(theme);
  const partnerLogoSrc = getPartnerLogo(partnerLogo);

  const blobs = theme === 'light' ? gradientBlobs([
    { x: -100, y: -100, size: 500, color: 'radial-gradient(circle, rgba(64,193,172,0.4), rgba(130,230,180,0.6))' },
    { x: -100, y: 500, size: 400, color: 'radial-gradient(circle, rgba(255,180,80,0.4), rgba(255,200,100,0.5))' },
    { x: 1100, y: -100, size: 400, color: 'radial-gradient(circle, rgba(64,193,172,0.2), rgba(130,230,180,0.3))' },
  ]) : gradientBlobs([
    { x: -100, y: 200, size: 500, color: 'radial-gradient(circle, rgba(64,193,172,0.15), rgba(80,200,170,0.2))' },
  ]);

  // Use a larger everstake logo for partnership banners
  const everstakeLogoLarge = imageToBase64(path.join(LOGOS_DIR, theme === 'dark' ? 'everstake-light.png' : 'everstake-dark.png'));

  return `<!DOCTYPE html><html><head><style>
    ${baseStyles()}
  </style></head><body>
    <div class="banner" style="background:${bgColor};color:${textColor};">
      ${blobs}
      ${gridOverlay(theme)}

      <div style="position:absolute;top:0;left:0;width:100%;height:100%;display:flex;align-items:center;justify-content:center;gap:60px;z-index:5;">
        <img src="${everstakeLogoLarge}" style="height:80px;width:auto;" />
        <span style="font-weight:300;font-size:48px;opacity:0.6;">x</span>
        ${partnerLogoSrc ? `<img src="${partnerLogoSrc}" style="max-height:80px;max-width:300px;width:auto;" />` : ''}
      </div>
    </div>
  </body></html>`;
}

// ============================================
// TYPE E: Week in Blockchains
// ============================================
function typeE({ dateRange, cryptoIcons = [], theme = 'light' }) {
  const bgColor = theme === 'dark' ? 'linear-gradient(180deg, #034638 75%, #012d24 100%)' : '#f5fffd';
  const textColor = theme === 'dark' ? '#f5fffd' : '#034638';
  const everstakeLogo = getEverstakeLogo(theme);
  const dividerColor = theme === 'dark' ? 'rgba(222,232,230,0.12)' : '#dee8e6';

  const blobs = theme === 'light' ? gradientBlobs([
    { x: -120, y: -120, size: 640, color: 'radial-gradient(circle, rgba(64,193,172,0.45), rgba(130,230,180,0.7))' },
  ]) : '';

  // Build crypto icons grid (4 cols x 4 rows)
  const iconsHtml = cryptoIcons.map(icon => {
    const src = getPartnerLogo(icon);
    return src ? `<div style="width:100px;height:100px;border-radius:50%;border:2px solid ${dividerColor};display:flex;align-items:center;justify-content:center;background:${theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)'};">
      <img src="${src}" style="max-width:60px;max-height:60px;" />
    </div>` : '';
  }).join('');

  return `<!DOCTYPE html><html><head><style>
    ${baseStyles()}
  </style></head><body>
    <div class="banner" style="background:${bgColor};color:${textColor};">
      ${blobs}
      ${gridOverlay(theme)}

      <div style="position:absolute;left:800px;top:0;width:2px;height:100%;background:${dividerColor};z-index:2;"></div>

      <img src="${everstakeLogo}" style="position:absolute;top:52px;left:80px;height:32px;z-index:10;" />

      <!-- Left: date + title -->
      <div style="position:absolute;left:80px;bottom:80px;z-index:5;max-width:680px;">
        <div style="font-weight:500;font-size:26px;margin-bottom:20px;">${dateRange || ''}</div>
        <div style="font-weight:200;font-size:128px;line-height:1.04;">Week in<br>Blockchains</div>
      </div>

      <!-- Right: crypto icons grid -->
      ${cryptoIcons.length > 0 ? `
        <div style="position:absolute;left:840px;top:80px;width:700px;display:grid;grid-template-columns:repeat(4,100px);gap:24px;z-index:5;justify-content:center;align-content:center;height:740px;">
          ${iconsHtml}
        </div>
      ` : ''}
    </div>
  </body></html>`;
}

// ============================================
// TYPE F: Split layout with right illustration/image
// Examples: DES-294a (Trezor + Cardano visual)
// ============================================
function typeF({ title, subtitle, partnerLogo, rightImage, theme = 'light' }) {
  const bgColor = theme === 'dark' ? 'linear-gradient(180deg, #034638 75%, #012d24 100%)' : '#f5fffd';
  const textColor = theme === 'dark' ? '#f5fffd' : '#034638';
  const everstakeLogo = getEverstakeLogo(theme);
  const partnerLogoSrc = getPartnerLogo(partnerLogo);
  const rightImageSrc = rightImage ? getPartnerLogo(rightImage) : '';
  const dividerColor = theme === 'dark' ? 'rgba(222,232,230,0.12)' : '#dee8e6';

  const blobs = theme === 'light' ? gradientBlobs([
    { x: -120, y: -120, size: 640, color: 'radial-gradient(circle, rgba(64,193,172,0.45), rgba(130,230,180,0.7))' },
  ]) : '';

  return `<!DOCTYPE html><html><head><style>
    ${baseStyles()}
  </style></head><body>
    <div class="banner" style="background:${bgColor};color:${textColor};">
      ${blobs}
      ${gridOverlay(theme)}

      <div style="position:absolute;left:800px;top:0;width:2px;height:100%;background:${dividerColor};z-index:2;"></div>

      <!-- Top left: everstake + partner logos -->
      <div style="position:absolute;top:52px;left:80px;display:flex;align-items:center;gap:20px;z-index:10;">
        <img src="${everstakeLogo}" style="height:32px;" />
        ${partnerLogoSrc ? `
          <span style="font-size:20px;opacity:0.4;">x</span>
          <img src="${partnerLogoSrc}" style="height:32px;width:auto;" />
        ` : ''}
      </div>

      <!-- Left side: text -->
      <div style="position:absolute;left:80px;bottom:80px;z-index:5;max-width:680px;">
        ${subtitle ? `<div style="font-weight:500;font-size:20px;letter-spacing:0.1em;text-transform:uppercase;margin-bottom:20px;">${subtitle}</div>` : ''}
        <div style="font-weight:200;font-size:96px;line-height:1.04;">${title}</div>
      </div>

      <!-- Right side: illustration -->
      ${rightImageSrc ? `
        <div style="position:absolute;left:802px;top:0;width:798px;height:900px;z-index:3;overflow:hidden;">
          <img src="${rightImageSrc}" style="width:100%;height:100%;object-fit:cover;" />
        </div>
      ` : `
        <div style="position:absolute;left:802px;top:0;width:798px;height:900px;z-index:3;background:${theme === 'dark' ? 'rgba(64,193,172,0.08)' : 'rgba(64,193,172,0.06)'};"></div>
      `}
    </div>
  </body></html>`;
}

// Template registry
const TEMPLATES = {
  'type-a': {
    name: 'Brand Article',
    description: 'Split layout: title left, partner logo right',
    render: typeA,
    fields: ['title', 'subtitle', 'partnerLogo', 'theme'],
  },
  'type-b': {
    name: 'Centered Title',
    description: 'Large centered title with optional logo above',
    render: typeB,
    fields: ['title', 'subtitle', 'partnerLogo', 'theme'],
  },
  'type-c': {
    name: 'Dark Article',
    description: 'Dark background with centered title',
    render: typeC,
    fields: ['title', 'subtitle'],
  },
  'type-d': {
    name: 'Partnership',
    description: 'Everstake x Partner logos',
    render: typeD,
    fields: ['partnerLogo', 'theme'],
  },
  'type-e': {
    name: 'Week in Blockchains',
    description: 'Weekly digest banner with crypto icons',
    render: typeE,
    fields: ['dateRange', 'cryptoIcons', 'theme'],
  },
  'type-f': {
    name: 'Guide / Tutorial',
    description: 'Split layout with right illustration',
    render: typeF,
    fields: ['title', 'subtitle', 'partnerLogo', 'rightImage', 'theme'],
  },
};

// List available partner logos
function listLogos() {
  const files = fs.readdirSync(LOGOS_DIR);
  return files.filter(f => !f.startsWith('everstake-') && /\.(png|jpg|jpeg|svg|webp)$/i.test(f));
}

module.exports = { TEMPLATES, listLogos, getPartnerLogo, getEverstakeLogo, imageToBase64 };
