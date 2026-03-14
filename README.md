# ADC Threat Analyzer

<div align="center">

### 🎮 **[LIVE APPLICATION →](https://adcthreat.gamer.gd)** 🎮

**A Challenger-level League of Legends threat analysis tool powered by the Riot Games API**

[![Live Site](https://img.shields.io/badge/🌐_Live_Site-adcthreat.gamer.gd-c89b3c?style=for-the-badge)](https://adcthreat.gamer.gd)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge)](LICENSE)
[![Riot API](https://img.shields.io/badge/Powered_by-Riot_API-eb0029?style=for-the-badge&logo=riotgames)](https://developer.riotgames.com/)

**Developed by [Samuel Mendieta](https://samuelmendieta.com/)**

[Features](#-key-features) • [Live Demo](https://adcthreat.gamer.gd) • [Tech Stack](#-tech-stack) • [Architecture](#-architecture) • [Auto-Updates](#-auto-update-system)

</div>

---

## 🚀 Overview

**ADC Threat Analyzer** is a production web application that helps League of Legends ADC players analyze matchups in real-time. Built with vanilla JavaScript and integrated with the **Riot Games DDragon API**, the tool provides Challenger-level insights including ability cooldowns, crowd control classifications, and strategic tips sourced from high-elo gameplay across EUW, KR, and CN servers.

**🔗 Live Application:** **[https://adcthreat.gamer.gd](https://adcthreat.gamer.gd)**

---

## ✨ Key Features

### 🎯 Intelligent Matchup Analysis
- **26 Marksman ADCs** and **11 Mage ADCs** with meta tier rankings (S+, S, A, B)
- Real-time threat assessment for 5 enemies and 4 allies
- Champion ability cooldowns automatically synced with latest patch via **Riot Games API**

### 🛡️ Advanced Crowd Control Classification
- **Hard CC** (airborne, knockup, knockback, pull, nearsight) — Cannot be cleansed
- **Soft CC** (stun, root, slow, charm, fear, taunt) — Cleansable with Summoner Spell
- **Suppression** (Malzahar R, Warwick R, etc.) — QSS only
- **Vision Control** (stealth, camouflage, invisibility) — Detection mechanics

### 📊 Challenger-Level Strategic Tips
- Matchup-specific advice for **25+ ADC champions**
- Support synergy guides for **18+ support champions**
- Wave management, tempo control, and key ability timers
- Sourced from high-elo gameplay analysis (EUW, KR, CN Challenger)

### 🤖 Automated Data Pipeline
- **GitHub Actions** workflow that runs weekly to check for new League patches
- Automatically updates champion cooldowns, ability names, and patch notes links
- Detects new champion releases and flags them for manual threat tag review
- Zero-downtime updates — see [AUTO_UPDATE.md](AUTO_UPDATE.md) for technical details

### 📱 Progressive Web App (PWA)
- Installable on mobile and desktop devices
- Offline-capable with service worker caching
- Optimized for in-game quick reference (alt-tab friendly)

---

## 🛠️ Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | HTML5, CSS3, Vanilla JavaScript | Zero-dependency UI with custom design system |
| **Data Source** | [Riot Games DDragon API](https://developer.riotgames.com/docs/lol) | Champion data, ability cooldowns, patch versions |
| **Automation** | GitHub Actions + Node.js | Automated patch detection and data synchronization |
| **Hosting** | GitHub Pages | Static site hosting with custom domain |
| **HTTP Client** | Axios (Node.js scripts) | API requests in automation pipeline |

### Why Vanilla JavaScript?
- **Performance**: No framework overhead — <100KB total page weight
- **Simplicity**: Easy to maintain and extend without build tooling
- **Learning**: Demonstrates mastery of core web technologies
- **Speed**: Instant load times and smooth 60fps interactions

---

## 🏗️ Architecture

### Project Structure

```
├── index.html                      # Entry point with SEO & structured data
├── app.js                          # Core application logic & state management
├── adc-list.js                     # Meta ADC champion list & tier rankings
├── adc-templates.js                # 25+ champion-specific matchup templates
├── support-tips.js                 # 18+ support synergy guides
├── champions-summary.json          # Champion ability data (auto-updated via API)
├── styles.css                      # League-themed design system
├── scripts/
│   └── update-champion-data.js     # DDragon API sync script
├── .github/workflows/
│   └── update-champion-data.yml    # Automated weekly patch updates
├── icons/                          # PWA app icons (16-512px)
└── og/                             # Open Graph social media images
```

### Key Technical Decisions

1. **Vanilla JS over frameworks**: No build step, instant load times, easier debugging
2. **Client-side rendering**: All logic runs in browser, no backend needed
3. **Static JSON data**: Fast lookups, easy to version control and review
4. **GitHub Actions for automation**: Free CI/CD, integrated with repo, easy debugging

---

## 🔄 Auto-Update System

The application includes a sophisticated automated pipeline that keeps champion data synchronized with League of Legends patches:

### How It Works

1. **Scheduled Checks**: GitHub Actions runs weekly (Wednesdays 08:00 ET)
2. **Patch Detection**: Queries Riot's DDragon API for latest version
3. **Data Sync**: Updates cooldowns and ability names for all champions
4. **Preservation**: Keeps manually-curated threat tags and strategic tips intact
5. **New Champions**: Auto-detects new releases and flags for manual review
6. **Commit & Deploy**: Automatically commits changes and triggers GitHub Pages rebuild

### What Gets Updated Automatically
✅ Champion ability cooldowns (Q, W, E, R)
✅ Ability names (if changed by Riot)
✅ Patch version number and patch notes links
✅ New champion detection

### What Requires Manual Curation
❌ Threat tags (KNOCKUP, STUN, GAP_CLOSE, etc.)
❌ Challenger-level strategic tips
❌ CC classifications (hard/soft/suppression)

**📖 Full Documentation:** [AUTO_UPDATE.md](AUTO_UPDATE.md)

---

## 🎨 Design Philosophy

The UI follows a **League of Legends-inspired dark theme** with a structured design system:

- **Color Palette**: Dark backgrounds (#01050d) with Hextech gold accents (#c89b3c)
- **Typography**: Inter font family with 7-weight scale for hierarchy
- **Spacing**: 8-point grid system for consistent rhythm
- **Responsive**: Mobile-first design scaling from 320px to 1800px+ displays
- **Accessibility**: WCAG AA contrast ratios, 36px minimum touch targets
- **Performance**: CSS custom properties, hardware-accelerated transforms

---

## 💻 Getting Started

### Prerequisites

- Node.js 20+ (for running update scripts)
- npm

### Installation

```bash
# Clone the repository
git clone https://github.com/SamTesura/samtesura.github.io.git
cd samtesura.github.io

# Install dependencies (for automation scripts only)
npm install
```

### Development

Since this is a static site with no build process, simply open `index.html` in a browser:

```bash
# Option 1: Direct file open
open index.html

# Option 2: Use a static server (recommended for PWA testing)
npx serve .
```

### Available Scripts

```bash
# Check for new League patches and update champion data
npm run update-data

# Force update champion data (ignores patch version check)
npm run test-update
```

### Testing the Auto-Update System

```bash
# Dry run - checks current patch without making changes
npm run update-data

# Force update - useful for testing the pipeline
FORCE_UPDATE=true npm run update-data
```

---

## 🚀 Deployment

The site is automatically deployed via **GitHub Pages** on every push to `main`:

1. Push changes to `main` branch
2. GitHub Pages builds and deploys automatically
3. Site is live at [https://adcthreat.gamer.gd](https://adcthreat.gamer.gd) within 1-2 minutes

Custom domain configuration is handled via `CNAME` file (managed by GitHub Pages settings).

---

## 📊 Technical Highlights

### Performance Optimizations
- **Zero dependencies** in production (vanilla JS only)
- **Lazy loading** for champion icons and images
- **Debounced search** for autocomplete inputs
- **CSS containment** for efficient repaints
- **Service worker caching** for offline functionality

### Data Management
- **Incremental updates**: Only changed champions are updated during patch sync
- **Data validation**: JSON schema validation in update scripts
- **Conflict resolution**: Manual threat tags always take precedence over API data
- **Version control**: All data changes tracked in git for easy rollback

### API Integration
- **Rate limiting**: 100ms delay per 10 champions to respect Riot's API guidelines
- **Error handling**: Graceful degradation if DDragon API is unavailable
- **Caching**: Utilizes DDragon's CDN for champion icons and sprites
- **Versioned endpoints**: Always fetches data for the correct patch version

---

## 🤝 Contributing

This is a personal portfolio project, but feedback and suggestions are welcome!

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📝 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- **Riot Games** for the DDragon API and League of Legends game data
- **League of Legends Wiki** for comprehensive CC mechanics documentation
- **Challenger players** from EUW, KR, and CN for inspiring the strategic tips

---

## 📬 Contact

**Samuel Mendieta**
🌐 Website: [samuelmendieta.com](https://samuelmendieta.com/)
💼 GitHub: [@SamTesura](https://github.com/SamTesura)
🐦 Twitter: [@BritMendieta](https://twitter.com/BritMendieta)

---

<div align="center">

### **[🎮 Try the Live Application →](https://adcthreat.gamer.gd)**

**Built with ❤️ by [Samuel Mendieta](https://samuelmendieta.com/)**

*Powered by Riot Games API • Hosted on GitHub Pages • Auto-updated via GitHub Actions*

</div>
