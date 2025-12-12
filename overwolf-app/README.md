# ADC Threat Analyzer - Overwolf App

Real-time threat analysis overlay for League of Legends ADC players. Automatically detects champion picks during champion select and displays CC types, cooldowns, and strategic tips.

## Features

- **Automatic Champion Detection**: Uses League Client API (LCU) to detect picks in real-time
- **Non-Invasive Overlay**: Customizable position, size, and transparency
- **Threat Analysis**: Shows CC types, cleansability, and cooldowns
- **Strategic Tips**: Matchup-specific advice from Challenger players
- **Hotkey Support**: Fully customizable keyboard shortcuts
- **Auto-Show**: Automatically displays during champion select

## Installation (For Users)

1. Download Overwolf from [overwolf.com](https://www.overwolf.com/)
2. Search for "ADC Threat Analyzer" in the Overwolf App Store
3. Click Install
4. Launch League of Legends and enter champion select

## Default Hotkeys

| Hotkey | Action |
|--------|--------|
| `Ctrl+Shift+T` | Toggle overlay visibility |
| `Ctrl+Shift+L` | Lock/unlock overlay position |
| `Ctrl+Shift+↑` | Increase transparency |
| `Ctrl+Shift+↓` | Decrease transparency |

## Project Structure

```
overwolf-app/
├── manifest.json              # Overwolf app configuration
├── src/
│   ├── background/            # Background controller (game detection)
│   │   ├── background.html
│   │   └── background.js
│   ├── windows/
│   │   ├── overlay/           # In-game overlay
│   │   ├── desktop/           # Desktop main window
│   │   └── settings/          # Settings window
│   ├── services/
│   │   ├── lcu-api.js         # League Client API integration
│   │   └── storage-service.js # User preferences storage
│   ├── core/
│   │   ├── threat-analyzer.js # Threat analysis logic
│   │   ├── champion-data.js   # Champion data loader
│   │   └── champions-summary.json
│   └── utils/
│       └── security.js        # Security utilities
├── css/                       # Stylesheets
└── icons/                     # App icons
```

## Development Setup

### Prerequisites

- Node.js 18+
- Overwolf Client (Developer Mode enabled)
- League of Legends (for testing)

### Enable Overwolf Developer Mode

1. Open Overwolf Settings
2. Go to "About" → Click Overwolf logo 5 times
3. Enable "Developer mode" in the new "Development" tab

### Load the App

1. Clone this repository
2. Open Overwolf
3. Go to Settings → Development → Load unpacked extension
4. Select the `overwolf-app` folder
5. The app will appear in your Overwolf dock

### Testing

1. Launch League of Legends
2. Enter Practice Tool or a normal game queue
3. The overlay should automatically appear during champion select
4. Use `Ctrl+Shift+T` to manually toggle the overlay

## Publishing to Overwolf

### Step 1: Prepare Your App

1. Update version in `manifest.json`
2. Test all features thoroughly
3. Create app icons (see Icon Requirements below)
4. Take screenshots for the app store listing

### Step 2: Create Icons

Create the following icons in the `icons/` folder:

| File | Size | Purpose |
|------|------|---------|
| `icon.png` | 256x256 | App icon |
| `icon_gray.png` | 256x256 | Grayscale app icon |
| `launcher_icon.ico` | 256x256 | Windows launcher icon |
| `tile.jpg` | 258x198 | App store tile |
| `store_icon.png` | 55x55 | App store small icon |

### Step 3: Package the App

```bash
# Create a ZIP file of the overwolf-app folder
cd overwolf-app
zip -r adc-threat-analyzer.zip . -x "*.git*" -x "node_modules/*"
```

### Step 4: Submit to Overwolf

1. Go to [Overwolf Developer Portal](https://console.overwolf.com/)
2. Sign in or create a developer account
3. Click "Create New App"
4. Fill in app details:
   - **Name**: ADC Threat Analyzer
   - **Category**: Utility
   - **Game**: League of Legends
   - **Description**: Real-time threat analysis for ADC players
5. Upload your `.zip` package
6. Add screenshots and marketing materials
7. Submit for review

### Step 5: Review Process

Overwolf reviews submissions for:
- Security compliance
- Performance standards
- UI/UX guidelines
- Content policy adherence

Review typically takes 3-7 business days.

## Security Features

This app implements security best practices:

- **Content Security Policy (CSP)**: Restricts script sources
- **Input Sanitization**: All LCU API data is sanitized
- **URL Validation**: Only trusted domains are allowed
- **XSS Prevention**: HTML escaping for all user-facing content
- **Prototype Pollution Prevention**: Object key validation
- **Rate Limiting**: Prevents DoS scenarios

## API Integration

### League Client Update (LCU) API

The app connects to the local LCU API to get real-time champion select data:

```javascript
// Endpoints used:
GET /lol-gameflow/v1/gameflow-phase
GET /lol-champ-select/v1/session
```

### Data Dragon API

Champion data and images are fetched from Riot's CDN:

```javascript
// Endpoints used:
https://ddragon.leagueoflegends.com/api/versions.json
https://ddragon.leagueoflegends.com/cdn/{version}/data/en_US/champion.json
https://ddragon.leagueoflegends.com/cdn/{version}/img/champion/{id}.png
```

## Troubleshooting

### Overlay Not Showing

1. Check if League of Legends is running
2. Press `Ctrl+Shift+T` to manually toggle
3. Verify Overwolf has overlay permissions for League

### Champions Not Detected

1. Ensure you're in champion select (not lobby)
2. Check the connection status in the overlay
3. Restart Overwolf and League of Legends

### Hotkeys Not Working

1. Open Overwolf Settings → Hotkeys
2. Check for conflicts with other apps
3. Re-assign hotkeys in ADC Threat settings

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - See LICENSE file for details.

## Credits

- Champion data from [Riot Games Data Dragon](https://developer.riotgames.com/docs/lol#data-dragon)
- CC classifications based on [League Wiki](https://wiki.leagueoflegends.com/)
- Built with [Overwolf SDK](https://overwolf.github.io/docs/start/getting-started)

## Legal

ADC Threat Analyzer isn't endorsed by Riot Games and doesn't reflect the views or opinions of Riot Games or anyone officially involved in producing or managing League of Legends. League of Legends and Riot Games are trademarks or registered trademarks of Riot Games, Inc.
