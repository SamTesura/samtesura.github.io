/**
 * ADC Threat Settings Window
 *
 * Handles user preferences and configuration
 */

'use strict';

class SettingsController {
    constructor() {
        this.settings = null;
        this.hasChanges = false;

        this.init();
    }

    async init() {
        console.log('[Settings] Initializing...');

        // Load current settings
        await this.loadSettings();

        // Populate UI with current values
        this.populateUI();

        // Setup event listeners
        this.setupEventListeners();

        // Setup hotkey change listeners
        this.setupHotkeyListeners();

        console.log('[Settings] Initialized');
    }

    async loadSettings() {
        this.settings = await StorageService.getSettings();
    }

    populateUI() {
        // Opacity
        const opacitySlider = document.getElementById('opacity-slider');
        const opacityValue = document.getElementById('opacity-value');
        opacitySlider.value = this.settings.overlayOpacity;
        opacityValue.textContent = `${this.settings.overlayOpacity}%`;

        // Theme
        document.getElementById('theme-select').value = this.settings.overlayTheme;

        // Toggles
        document.getElementById('compact-mode').checked = this.settings.compactMode;
        document.getElementById('auto-show').checked = this.settings.autoShowOverlay;
        document.getElementById('show-in-game').checked = this.settings.showInGame;
        document.getElementById('open-on-start').checked = this.settings.openOnStart;
        document.getElementById('show-cooldowns').checked = this.settings.showCooldowns;
        document.getElementById('show-threats').checked = this.settings.showThreatTags;
        document.getElementById('show-tips').checked = this.settings.showTips;
        document.getElementById('show-allies').checked = this.settings.showAllyInfo;

        // Load current hotkeys
        this.loadHotkeys();
    }

    loadHotkeys() {
        overwolf.settings.hotkeys.get((result) => {
            if (result.success && result.games) {
                // Find League of Legends hotkeys (game ID 5426)
                const gameHotkeys = result.games['5426'] || result.globals || [];

                gameHotkeys.forEach(hotkey => {
                    const btn = document.querySelector(`[data-hotkey="${hotkey.name}"]`);
                    if (btn) {
                        const valueEl = btn.querySelector('.hotkey-value');
                        if (valueEl) {
                            valueEl.textContent = hotkey.binding || 'Not set';
                        }
                    }
                });
            }
        });
    }

    setupEventListeners() {
        // Close button
        document.getElementById('btn-close').addEventListener('click', () => {
            this.close();
        });

        // Save button
        document.getElementById('btn-save').addEventListener('click', () => {
            this.saveSettings();
        });

        // Reset button
        document.getElementById('btn-reset').addEventListener('click', () => {
            this.resetSettings();
        });

        // Clear cache button
        document.getElementById('btn-clear-cache').addEventListener('click', () => {
            this.clearCache();
        });

        // Opacity slider
        const opacitySlider = document.getElementById('opacity-slider');
        opacitySlider.addEventListener('input', (e) => {
            const value = e.target.value;
            document.getElementById('opacity-value').textContent = `${value}%`;
            this.settings.overlayOpacity = parseInt(value, 10);
            this.hasChanges = true;
        });

        // Theme select
        document.getElementById('theme-select').addEventListener('change', (e) => {
            this.settings.overlayTheme = e.target.value;
            this.hasChanges = true;
        });

        // Toggle switches
        this.setupToggle('compact-mode', 'compactMode');
        this.setupToggle('auto-show', 'autoShowOverlay');
        this.setupToggle('show-in-game', 'showInGame');
        this.setupToggle('open-on-start', 'openOnStart');
        this.setupToggle('show-cooldowns', 'showCooldowns');
        this.setupToggle('show-threats', 'showThreatTags');
        this.setupToggle('show-tips', 'showTips');
        this.setupToggle('show-allies', 'showAllyInfo');

        // Keyboard shortcut to close
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.close();
            }
        });
    }

    setupToggle(elementId, settingKey) {
        document.getElementById(elementId).addEventListener('change', (e) => {
            this.settings[settingKey] = e.target.checked;
            this.hasChanges = true;
        });
    }

    setupHotkeyListeners() {
        // Hotkey buttons
        const hotkeyBtns = document.querySelectorAll('.hotkey-btn');

        hotkeyBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const hotkeyName = btn.dataset.hotkey;
                this.startHotkeyRecording(btn, hotkeyName);
            });
        });
    }

    startHotkeyRecording(btn, hotkeyName) {
        // Visual feedback
        btn.classList.add('recording');
        btn.querySelector('.hotkey-edit').textContent = 'Press new hotkey...';

        // Listen for hotkey assignment via Overwolf
        overwolf.settings.hotkeys.assign(
            hotkeyName,
            (result) => {
                btn.classList.remove('recording');

                if (result.success) {
                    btn.querySelector('.hotkey-value').textContent = result.hotkey;
                    btn.querySelector('.hotkey-edit').textContent = 'Click to change';
                    this.showToast('Hotkey updated successfully');
                } else {
                    btn.querySelector('.hotkey-edit').textContent = 'Failed - Click to retry';
                    this.showToast('Failed to update hotkey', true);
                }
            }
        );

        // Timeout after 10 seconds
        setTimeout(() => {
            if (btn.classList.contains('recording')) {
                btn.classList.remove('recording');
                btn.querySelector('.hotkey-edit').textContent = 'Click to change';
            }
        }, 10000);
    }

    async saveSettings() {
        try {
            await StorageService.setSettings(this.settings);
            this.hasChanges = false;

            // Notify background to apply changes
            overwolf.windows.sendMessage('background', 'settings', {
                type: 'SETTINGS_SAVED',
                payload: this.settings
            }, () => {});

            this.showToast('Settings saved successfully');
        } catch (error) {
            console.error('[Settings] Failed to save:', error);
            this.showToast('Failed to save settings', true);
        }
    }

    async resetSettings() {
        if (!confirm('Are you sure you want to reset all settings to defaults?')) {
            return;
        }

        try {
            await StorageService.resetSettings();
            await this.loadSettings();
            this.populateUI();
            this.hasChanges = false;
            this.showToast('Settings reset to defaults');

            // Notify background
            overwolf.windows.sendMessage('background', 'settings', {
                type: 'SETTINGS_RESET'
            }, () => {});
        } catch (error) {
            console.error('[Settings] Failed to reset:', error);
            this.showToast('Failed to reset settings', true);
        }
    }

    async clearCache() {
        try {
            await new Promise((resolve) => {
                overwolf.settings.extension.set(
                    'adc_threat_champion_cache',
                    null,
                    resolve
                );
            });
            this.showToast('Cache cleared successfully');
        } catch (error) {
            console.error('[Settings] Failed to clear cache:', error);
            this.showToast('Failed to clear cache', true);
        }
    }

    showToast(message, isError = false) {
        // Remove existing toast
        const existing = document.querySelector('.toast');
        if (existing) existing.remove();

        // Create new toast
        const toast = document.createElement('div');
        toast.className = `toast${isError ? ' error' : ''}`;
        toast.textContent = message;
        document.body.appendChild(toast);

        // Auto-remove after 3 seconds
        setTimeout(() => {
            toast.remove();
        }, 3000);
    }

    close() {
        if (this.hasChanges) {
            if (confirm('You have unsaved changes. Save before closing?')) {
                this.saveSettings().then(() => {
                    overwolf.windows.close('settings');
                });
                return;
            }
        }
        overwolf.windows.close('settings');
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.settingsController = new SettingsController();
});
