/**
 * ADC Threat Desktop Window
 *
 * Main desktop window with app info and quick actions
 */

'use strict';

class DesktopController {
    constructor() {
        this.isGameRunning = false;
        this.isConnected = false;

        this.init();
    }

    async init() {
        console.log('[Desktop] Initializing...');

        // Setup event listeners
        this.setupEventListeners();

        // Setup message listener
        this.setupMessageListener();

        // Load patch info
        this.loadPatchInfo();

        // Request status from background
        this.requestStatus();

        console.log('[Desktop] Initialized');
    }

    setupEventListeners() {
        // Window controls
        document.getElementById('btn-minimize').addEventListener('click', () => {
            overwolf.windows.minimize('desktop');
        });

        document.getElementById('btn-close').addEventListener('click', () => {
            overwolf.windows.close('desktop');
        });

        document.getElementById('btn-settings').addEventListener('click', () => {
            this.openSettings();
        });

        // Quick actions
        document.getElementById('btn-show-overlay').addEventListener('click', () => {
            this.showOverlay();
        });

        document.getElementById('btn-open-settings').addEventListener('click', () => {
            this.openSettings();
        });
    }

    setupMessageListener() {
        overwolf.windows.onMessageReceived.addListener((message) => {
            if (message.id === 'desktop') {
                this.handleMessage(message.content);
            }
        });
    }

    handleMessage(message) {
        switch (message.type) {
            case 'GAME_STATUS':
                this.updateGameStatus(message.payload);
                break;
            case 'CONNECTION_STATUS':
                this.updateConnectionStatus(message.payload.connected);
                break;
            case 'GAME_PHASE_CHANGE':
                this.updateGamePhase(message.payload.phase);
                break;
        }
    }

    updateGameStatus(payload) {
        this.isGameRunning = payload.isRunning;

        const card = document.getElementById('game-status-card');
        const text = document.getElementById('game-status-text');

        if (payload.isRunning) {
            card.classList.add('active');
            text.textContent = payload.phase || 'League of Legends is running';
        } else {
            card.classList.remove('active');
            text.textContent = 'Waiting for League of Legends...';
        }
    }

    updateConnectionStatus(connected) {
        this.isConnected = connected;

        const statusEl = document.getElementById('connection-status');
        const textEl = statusEl.querySelector('.status-text');

        statusEl.classList.toggle('connected', connected);
        textEl.textContent = connected ? 'Connected' : 'Disconnected';
    }

    updateGamePhase(phase) {
        const text = document.getElementById('game-status-text');

        switch (phase) {
            case 'ChampSelect':
                text.textContent = 'In Champion Select';
                break;
            case 'InProgress':
                text.textContent = 'In Game';
                break;
            case 'Lobby':
                text.textContent = 'In Lobby';
                break;
            default:
                text.textContent = this.isGameRunning
                    ? 'League of Legends is running'
                    : 'Waiting for League of Legends...';
        }
    }

    async loadPatchInfo() {
        try {
            const res = await fetch('https://ddragon.leagueoflegends.com/api/versions.json');
            const versions = await res.json();
            const patch = versions[0];

            // Convert to display format (15.x -> 25.x for 2025)
            const parts = patch.split('.');
            let majorVersion = parseInt(parts[0]);
            if (majorVersion >= 15) {
                majorVersion += 10;
            }

            document.getElementById('patch-version').textContent =
                `Patch ${majorVersion}.${parts[1]}`;
        } catch (error) {
            document.getElementById('patch-version').textContent = 'Patch info unavailable';
        }
    }

    requestStatus() {
        overwolf.windows.sendMessage('background', 'desktop', {
            type: 'GET_STATUS'
        }, () => {});
    }

    showOverlay() {
        overwolf.windows.sendMessage('background', 'desktop', {
            type: 'SHOW_OVERLAY'
        }, () => {});
    }

    openSettings() {
        overwolf.windows.sendMessage('background', 'desktop', {
            type: 'OPEN_SETTINGS'
        }, () => {});
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.desktopController = new DesktopController();
});
