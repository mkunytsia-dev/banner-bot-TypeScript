# Banner Bot

Automated banner generation system for the marketing team. Generates PNG banners (1600×900) from predefined templates via a Slack bot.

## Templates

| Type | Name | Description |
|------|------|-------------|
| **A** | Brand Article | Split layout: title left, partner logo right |
| **B** | Centered Title | Large centered title with optional logo above |
| **C** | Dark Article | Dark background with centered title |
| **D** | Partnership | Everstake × Partner logos side by side |
| **E** | Week in Blockchains | Weekly digest banner with crypto icons |
| **F** | Guide / Tutorial | Split layout with right illustration |

### Template previews

**Type A — Brand Article** (light/dark)
![Type A](docs/preview-type-a.png)

**Type B — Centered Title**
![Type B](docs/preview-type-b.png)

**Type C — Dark Article**
![Type C](docs/preview-type-c.png)

**Type E — Week in Blockchains**
![Type E](docs/preview-type-e.png)

**Type F — Guide / Tutorial**
![Type F](docs/preview-type-f.png)

## Tech stack

- **Node.js** + **Puppeteer** — renders HTML/CSS templates to PNG
- **Slack Bolt** — Slack bot framework (Socket Mode)
- **Zalando Sans** — custom font (included in `assets/fonts/`)

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Create Slack App

1. Go to https://api.slack.com/apps → **Create New App** → **From Scratch**
2. Enable **Socket Mode** → create App-Level Token with `connections:write` scope
3. Create **Slash Command**: `/banner` — "Generate a marketing banner"
4. Add **Bot Token Scopes** under OAuth & Permissions:
   - `commands`
   - `chat:write`
   - `files:write`
   - `files:read`
5. Enable **Interactivity**
6. **Install to Workspace**

### 3. Configure environment

```bash
cp .env.example .env
```

Fill in your tokens:

```
SLACK_BOT_TOKEN=xoxb-...
SLACK_SIGNING_SECRET=...
SLACK_APP_TOKEN=xapp-...
```

### 4. Add partner logos

Place PNG/SVG files in `assets/logos/`. They will automatically appear in the Slack dropdown:

```
assets/logos/monad.png
assets/logos/solana.png
assets/logos/aptos.png
assets/logos/ethereum.png
...
```

### 5. Run

```bash
npm start
```

## Usage

In Slack, type `/banner` → a modal opens where you:

1. **Choose a template** (A–F)
2. **Enter title** and optional subtitle
3. **Select partner logo** from the dropdown
4. **Pick theme** (light / dark)
5. Hit **Generate** → bot posts the PNG in the channel

## Local preview

Generate all template previews without Slack:

```bash
npm run preview
```

Output goes to `output/`.

## Project structure

```
banner-bot/
├── src/
│   ├── app.js                  # Slack bot entry point
│   ├── renderer.js             # Puppeteer HTML→PNG renderer
│   ├── preview.js              # Local preview generator
│   ├── templates/
│   │   ├── templates.js        # All 6 template types (HTML generators)
│   │   └── base.css            # Shared styles reference
│   └── slack/
│       └── interactions.js     # Slack command & modal handlers
├── assets/
│   ├── fonts/                  # Zalando Sans (.ttf)
│   └── logos/                  # Partner logos + everstake branding
├── output/                     # Generated banners (gitignored)
├── .env.example
├── package.json
└── README.md
```

## Adding a new template

1. Add a new render function in `src/templates/templates.js` following the existing pattern
2. Register it in the `TEMPLATES` object
3. Run `npm run preview` to verify
