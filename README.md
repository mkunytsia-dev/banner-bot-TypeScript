# Banner Bot

Automated banner generation system for the Everstake marketing team. Generates PNG banners (1600x900) from predefined templates via code or Slack bot.

## Templates

### Template 1 — Text in Center (Dark, green + yellow)
Centered title between grid lines. Dark background with green and yellow gradient blobs.

![Template 1](docs/previews/template-1.png)

---

### Template 2 — Text in Center (Light, green + orange)
Centered title between grid lines. Light background with green and orange gradient blobs.

![Template 2](docs/previews/template-2.png)

---

### Template 3 — Text in Center (Dark, green + teal)
Centered title between grid lines. Dark background with green and teal gradient blobs.

![Template 3](docs/previews/template-3.png)

---

### Template 4 — Text in Center (Dark, yellow bottom)
Centered title between grid lines. Dark background with yellow gradient blob at bottom.

![Template 4](docs/previews/template-4.png)

---

### Template 5 — Week in Blockchains
Weekly digest banner. Date text + "Week in Blockchains" left, crypto icons right.

![Template 5](docs/previews/template-5.png)

---

### Template 6 — APR
Crypto APR banner. Subtitle (coin + rate) + "Annual Percentage Rate" left, logomark right on gradient panel.

![Template 6](docs/previews/template-6.png)

---

### Template 7 — Collaboration
Everstake x Partner — two logos centered side by side. Both logos 86px height, color `#034638`.

![Template 7](docs/previews/template-7.png)

---

### Template 8 — About Blockchain v1
Split layout: everstake logo top-left, subtitle + title bottom-left, partner logo on right gradient panel with hex pattern. All CSS.

![Template 8](docs/previews/template-8.png)

---

### Template 9 — About Blockchain v2
Mirror of Template 8: partner logo on left gradient panel with hex pattern, everstake logo + text right.

![Template 9](docs/previews/template-9.png)

---

### Template 10 — Dark Left Panel
Dark left panel with everstake logo (white) + title (white), partner logo on light right side.

![Template 10](docs/previews/template-10.png)

---

### Template 11 — Dark Right Panel
Text left on light bg, dark right panel with partner logo (auto-inverted to white).

![Template 11](docs/previews/template-11.png)

---

### Template 12 — Centered Logo + Title
Logo centered top, title centered bottom, grid lines, orange blob top-left + green blob bottom-right.

![Template 12](docs/previews/template-12.png)

---

### Template 13 — Dark Full
Full dark background, everstake logo (white) top-left, title (white) bottom-left, partner icon (white) on right gradient panel.

![Template 13](docs/previews/template-13.png)

---

### Template 14 — Collaboration 3 Companies (Light)
Title + subtitle left, 3 partner logos stacked right on gradient panel with divider lines.

![Template 14](docs/previews/template-14.png)

---

### Template 15 — Collaboration 3 Companies (Dark)
Dark version of Template 14. White text, logos auto-inverted to white.

![Template 15](docs/previews/template-15.png)

---

### Template 16 — Guide / Tutorial
Everstake x partner logos top-left, subtitle + title bottom-left, crypto icon on right gradient panel.

![Template 16](docs/previews/template-16.png)

---

### Template 17 — Dark Partner Left
Dark bg, partner full logo on left gradient panel (white), everstake logo + subtitle + title right (white).

![Template 17](docs/previews/template-17.png)

---

### Template 18 — Dark Text Left + Icon Right
Dark bg with gradient blobs, everstake logo + title + subtitle left (white), partner icon on right gradient panel (white).

![Template 18](docs/previews/template-18.png)

---

### Template 19 — Dark Guide
Dark bg, crypto icon on left gradient panel (white), everstake x partner logos top-right, title bottom-right (white).

![Template 19](docs/previews/template-19.png)

---

### Template 20 — Collaboration 2 Companies
Title left, 2 partner logos stacked right on gradient panel with middle divider.

![Template 20](docs/previews/template-20.png)

---

### Template 21 — Wide Dark + 2 Logos
Wide dark left panel with subtitle + title, 2 logos stacked right on light bg with middle divider.

![Template 21](docs/previews/template-21.png)

---

## Tech stack

- **Node.js** + **Puppeteer** — renders HTML/CSS templates to PNG 1600x900
- **Slack Bolt** — Slack bot framework (Socket Mode)
- **Zalando Sans** — custom font (included in `assets/fonts/`)
- **Figma API** — for extracting logos and design tokens

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

### 3. Add partner logos

Place PNG/SVG files in `assets/logos/`.

### 4. Generate previews

```bash
node src/generate-previews.js
```

### 5. Run (with Slack)

```bash
npm start
```

## Project structure

```
banner-bot/
├── src/
│   ├── app.js                  # Slack bot entry point
│   ├── renderer.js             # Puppeteer HTML->PNG renderer
│   ├── generate-previews.js    # Generate all template previews
│   ├── presentation.js         # Presentation slide generator
│   ├── templates/
│   │   └── templates.js        # All 21 templates
│   └── slack/
│       └── interactions.js     # Slack command & modal handlers
├── assets/
│   ├── fonts/                  # Zalando Sans (.ttf)
│   └── logos/                  # Partner logos, backgrounds, patterns
├── docs/
│   └── previews/               # Template preview images (1-21)
├── output/                     # Generated banners (gitignored)
├── .env.example
├── package.json
└── README.md
```

## Design system

| Token | Value |
|-------|-------|
| Light background | `#f5fffd` |
| Dark background | `linear-gradient(to top right, #034638 75%, #012d24 100%)` |
| Text on light | `#034638` |
| Text on dark | `#f5fffd` |
| Accent | `#40c1ac` |
| Muted text | `#7b9690` |
| Grid lines (light) | `#dee8e6` |
| Grid lines (dark) | `#55857b` |
| Font | Zalando Sans (200, 300, 400, 500) |
| Partner logo color | `#034638` |
| Gradient blob | `rgba(64,193,172,0.40)` to `rgba(130,230,180,1.0)` |
| Right panel gradient | `rgba(64,193,172,0.20)` to `rgba(123,150,144,0.50)` |
