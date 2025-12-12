/**
 * ADC Threat Analyzer - Background Controller
 * Handles game detection, window management, and LCU API connection
 *
 * Security: All external data is sanitized before use
 */

'use strict';

const GAME_ID = 5426; // League of Legends

class BackgroundController {
    constructor() {
        this.overlayWindow = null;
        this.desktopWindow = null;
        this.settingsWindow = null;
        this.lcuService = null;
        this.isGameRunning = false;
        this.isInChampSelect = false;
        this.currentGamePhase = null;

        this.init();
    }

    async init() {
        console.log('[ADC Threat] Initializing background controller...');

        // Initialize storage with defaults
        await StorageService.init();

        // Initialize LCU service
        this.lcuService = new LCUService();
        this.lcuService.onChampionSelectUpdate = this.handleChampionSelectUpdate.bind(this);
        this.lcuService.onGamePhaseChange = this.handleGamePhaseChange.bind(this);

        // Register hotkeys
        this.registerHotkeys();

        // Listen for game events
        this.setupGameEventListeners();

        // Check if game is already running
        this.checkGameRunning();

        // Open desktop window on start (if configured)
        const settings = await StorageService.getSettings();
        if (settings.openOnStart) {
            this.openDesktopWindow();
        }

        console.log('[ADC Threat] Background controller initialized');
    }

    registerHotkeys() {
        overwolf.settings.hotkeys.onPressed.addListener((event) => {
            this.handleHotkey(event);
        });

        overwolf.settings.hotkeys.onChanged.addListener((event) => {
            console.log('[ADC Threat] Hotkey changed:', event);
        });
    }

    async handleHotkey(event) {
        const settings = await StorageService.getSettings();

        switch (event.name) {
            case 'toggle_overlay':
                this.toggleOverlay();
                break;
            case 'lock_position':
                await this.toggleOverlayLock();
                break;
            case 'increase_transparency':
                await this.adjustTransparency(5);
                break;
            case 'decrease_transparency':
                await this.adjustTransparency(-5);
                break;
        }
    }

    async toggleOverlay() {
        if (this.overlayWindow) {
            const windowState = await this.getWindowState('overlay');
            if (windowState === 'normal' || windowState === 'maximized') {
                overwolf.windows.hide('overlay');
            } else {
                overwolf.windows.restore('overlay');
            }
        } else {
            this.openOverlayWindow();
        }
    }

    async toggleOverlayLock() {
        const settings = await StorageService.getSettings();
        settings.overlayLocked = !settings.overlayLocked;
        await StorageService.setSettings(settings);

        // Notify overlay window
        this.sendToOverlay({
            type: 'SETTINGS_UPDATE',
            payload: { overlayLocked: settings.overlayLocked }
        });
    }

    async adjustTransparency(delta) {
        const settings = await StorageService.getSettings();
        settings.overlayOpacity = Math.min(100, Math.max(20, settings.overlayOpacity + delta));
        await StorageService.setSettings(settings);

        // Notify overlay window
        this.sendToOverlay({
            type: 'SETTINGS_UPDATE',
            payload: { overlayOpacity: settings.overlayOpacity }
        });
    }

    setupGameEventListeners() {
        // Game launch/exit events
        overwolf.games.onGameLaunched.addListener((event) => {
            if (event && event.gameInfo && event.gameInfo.id === GAME_ID) {
                this.onGameLaunched();
            }
        });

        overwolf.games.onGameInfoUpdated.addListener((event) => {
            if (event && event.gameInfo && event.gameInfo.id === GAME_ID) {
                if (event.runningChanged) {
                    if (event.gameInfo.isRunning) {
                        this.onGameLaunched();
                    } else {
                        this.onGameClosed();
                    }
                }
            }
        });
    }

    async checkGameRunning() {
        return new Promise((resolve) => {
            overwolf.games.getRunningGameInfo((result) => {
                if (result && result.id === GAME_ID) {
                    this.onGameLaunched();
                }
                resolve();
            });
        });
    }

    async onGameLaunched() {
        console.log('[ADC Threat] League of Legends detected');
        this.isGameRunning = true;

        // Connect to LCU API
        await this.lcuService.connect();

        // Open overlay based on settings
        const settings = await StorageService.getSettings();
        if (settings.autoShowOverlay) {
            this.openOverlayWindow();
        }
    }

    onGameClosed() {
        console.log('[ADC Threat] League of Legends closed');
        this.isGameRunning = false;
        this.isInChampSelect = false;

        // Disconnect from LCU
        this.lcuService.disconnect();

        // Hide overlay
        if (this.overlayWindow) {
            overwolf.windows.hide('overlay');
        }
    }

    handleGamePhaseChange(phase) {
        console.log('[ADC Threat] Game phase changed:', phase);
        this.currentGamePhase = phase;

        // Notify overlay
        this.sendToOverlay({
            type: 'GAME_PHASE_CHANGE',
            payload: { phase }
        });

        // Auto-show overlay during champion select
        if (phase === 'ChampSelect') {
            this.isInChampSelect = true;
            this.openOverlayWindow();
        } else if (phase === 'InProgress') {
            // Game started - keep overlay if user wants
        } else if (phase === 'None' || phase === 'Lobby') {
            this.isInChampSelect = false;
        }
    }

    handleChampionSelectUpdate(data) {
        console.log('[ADC Threat] Champion select update:', data);

        // Send sanitized data to overlay
        this.sendToOverlay({
            type: 'CHAMPION_SELECT_UPDATE',
            payload: SecurityUtils.sanitizeChampSelectData(data)
        });
    }

    sendToOverlay(message) {
        if (this.overlayWindow) {
            overwolf.windows.sendMessage('overlay', 'background', message, (result) => {
                if (!result.success) {
                    console.error('[ADC Threat] Failed to send message to overlay:', result.error);
                }
            });
        }
    }

    sendToDesktop(message) {
        if (this.desktopWindow) {
            overwolf.windows.sendMessage('desktop', 'background', message, (result) => {
                if (!result.success) {
                    console.error('[ADC Threat] Failed to send message to desktop:', result.error);
                }
            });
        }
    }

    async openOverlayWindow() {
        return new Promise((resolve) => {
            overwolf.windows.obtainDeclaredWindow('overlay', async (result) => {
                if (result.success) {
                    this.overlayWindow = result.window;

                    // Apply saved position
                    const settings = await StorageService.getSettings();
                    if (settings.overlayPosition) {
                        overwolf.windows.changePosition('overlay',
                            settings.overlayPosition.left,
                            settings.overlayPosition.top
                        );
                    }

                    // Apply saved size
                    if (settings.overlaySize) {
                        overwolf.windows.changeSize('overlay',
                            settings.overlaySize.width,
                            settings.overlaySize.height
                        );
                    }

                    overwolf.windows.restore('overlay', resolve);
                } else {
                    console.error('[ADC Threat] Failed to obtain overlay window:', result.error);
                    resolve();
                }
            });
        });
    }

    async openDesktopWindow() {
        return new Promise((resolve) => {
            overwolf.windows.obtainDeclaredWindow('desktop', (result) => {
                if (result.success) {
                    this.desktopWindow = result.window;
                    overwolf.windows.restore('desktop', resolve);
                } else {
                    console.error('[ADC Threat] Failed to obtain desktop window:', result.error);
                    resolve();
                }
            });
        });
    }

    async openSettingsWindow() {
        return new Promise((resolve) => {
            overwolf.windows.obtainDeclaredWindow('settings', (result) => {
                if (result.success) {
                    this.settingsWindow = result.window;
                    overwolf.windows.restore('settings', resolve);
                } else {
                    console.error('[ADC Threat] Failed to obtain settings window:', result.error);
                    resolve();
                }
            });
        });
    }

    getWindowState(windowName) {
        return new Promise((resolve) => {
            overwolf.windows.getWindowState(windowName, (result) => {
                resolve(result.success ? result.window_state : null);
            });
        });
    }
}

// Handle messages from other windows
overwolf.windows.onMessageReceived.addListener((message) => {
    if (message.id === 'background') {
        handleWindowMessage(message.content);
    }
});

async function handleWindowMessage(message) {
    switch (message.type) {
        case 'OPEN_SETTINGS':
            backgroundController.openSettingsWindow();
            break;
        case 'OPEN_DESKTOP':
            backgroundController.openDesktopWindow();
            break;
        case 'SAVE_OVERLAY_POSITION':
            const settings = await StorageService.getSettings();
            settings.overlayPosition = message.payload;
            await StorageService.setSettings(settings);
            break;
        case 'SAVE_OVERLAY_SIZE':
            const sizeSettings = await StorageService.getSettings();
            sizeSettings.overlaySize = message.payload;
            await StorageService.setSettings(sizeSettings);
            break;
        case 'GET_LCU_DATA':
            // Request current LCU data
            if (backgroundController.lcuService.isConnected) {
                const data = await backgroundController.lcuService.getCurrentChampSelectSession();
                backgroundController.sendToOverlay({
                    type: 'CHAMPION_SELECT_UPDATE',
                    payload: SecurityUtils.sanitizeChampSelectData(data)
                });
            }
            break;
    }
}

// Initialize background controller
const backgroundController = new BackgroundController();
