# ADC Threat Analyzer

> **Live Site: [https://adcthreat.gamer.gd](https://adcthreat.gamer.gd)**

A League of Legends threat analysis tool built for Challenger-level ADC players. Analyze matchups, track cooldowns, classify crowd control, and get strategic tips sourced from high-elo gameplay across EUW, KR, and CN servers.

**Author:** [Samuel Mendieta](https://samuelmendieta.com/)

---

## Features

- **ADC Matchup Analysis** — Select from 26 Marksman and 11 Mage ADCs with meta tier rankings (S+, S, A, B)
- **Threat Table** — View 5 enemies and 4 allies with champion icons, abilities, cooldowns, and threat tags at a glance
- **Crowd Control Classification** — Abilities categorized as Hard CC (airborne, knock, pull, nearsight), Soft CC (stun, root, slow, charm, fear), or Suppression (QSS only)
- **Challenger-Level Tips** — Matchup-specific advice for 25+ ADC champions and synergy guides for 18+ support champions covering wave management, tempo, and key timers
- **Auto-Updating Data** — Champion data stays current via automated GitHub Actions that pull from Riot's DDragon API every patch cycle
- **PWA Support** — Installable as a progressive web app on mobile and desktop

## Tech Stack

| Layer         | Technology                                     |
|---------------|-------------------------------------------------|
| Frontend      | HTML5, CSS3 (custom properties), Vanilla JS     |
| Data Source   | Riot Games DDragon API                           |
| Automation    | GitHub Actions (Node.js scripts)                 |
| Hosting       | GitHub Pages                                     |
| HTTP Client   | Axios                                            |

## Project Structure

```
├── index.html                 # Entry point with SEO & structured data
├── app.js                     # Core application logic
├── adc-list.js                # Meta ADC champion list & support types
├── adc-templates.js           # Champion-specific matchup tips
├── support-tips.js            # Support synergy guides
├── champions-summary.json     # Champion ability data (auto-updated)
├── styles.css                 # LoL-themed design system
├── scripts/
│   └── update-champion-data.js   # DDragon data sync script
├── .github/workflows/
│   └── update-champion-data.yml  # Automated patch update workflow
├── icons/                     # App icons (16–512px)
└── og/                        # Open Graph images
```

## How It Works

1. **Select your ADC** — Search and lock in your champion
2. **Add enemies & allies** — Build the game lobby
3. **Analyze threats** — The tool displays cooldowns, CC types, threat tags, and curated tips for every matchup
4. **Stay current** — Champion data auto-updates via GitHub Actions pulling from Riot's DDragon API on each patch

### Auto-Update System

A GitHub Actions workflow runs weekly (Wednesdays at 08:00 AM ET) to:
- Fetch the latest patch version from Riot's API
- Update champion cooldowns and ability names
- Preserve manually curated threat tags and notes
- Detect new champions and flag them for review

See [`AUTO_UPDATE.md`](AUTO_UPDATE.md) for full details on the automation pipeline.

## Getting Started

### Prerequisites

- Node.js 20+
- npm

### Setup

```bash
git clone https://github.com/SamTesura/samtesura.github.io.git
cd samtesura.github.io
npm install
```

### Scripts

```bash
# Check for patch updates and sync champion data
npm run update-data

# Force update champion data (ignores patch version check)
npm run test-update
```

### Local Development

Open `index.html` in a browser or use any static file server:

```bash
npx serve .
```

## Design

The UI uses a League of Legends-inspired dark theme with a structured design system:

- **Color palette** — Dark backgrounds (#01050d) with gold accents (#c89b3c)
- **Typography** — Inter font family with 7 size scales
- **Layout** — 8-point spacing grid, responsive from mobile to 1800px+
- **Touch-friendly** — 36px minimum target sizes

## License

MIT

---

Built by [Samuel Mendieta](https://samuelmendieta.com/)
