/**
 * Storage Service - User Preferences and Settings
 *
 * Handles persistent storage of:
 * - Overlay settings (position, size, opacity, lock state)
 * - Hotkey configurations
 * - User preferences
 *
 * Security: All stored data is validated before use
 */

'use strict';

const STORAGE_KEYS = {
    SETTINGS: 'adc_threat_settings',
    CHAMPION_CACHE: 'adc_threat_champion_cache',
    SUMMONER_INFO: 'adc_threat_summoner_info'
};

const DEFAULT_SETTINGS = {
    // Overlay appearance
    overlayOpacity: 85, // 0-100
    overlayPosition: { left: 50, top: 100 },
    overlaySize: { width: 420, height: 600 },
    overlayLocked: false,
    overlayTheme: 'dark', // 'dark' | 'light' | 'transparent'

    // Behavior
    autoShowOverlay: true, // Auto-show when entering champion select
    showInGame: true, // Keep overlay visible in-game
    openOnStart: false, // Open desktop window on app start
    minimizeToTray: true,

    // Display options
    showCooldowns: true,
    showThreatTags: true,
    showTips: true,
    showAllyInfo: true,
    compactMode: false,

    // Hotkeys (stored separately by Overwolf, but we track custom ones here)
    customHotkeys: {
        toggleOverlay: 'Ctrl+Shift+T',
        lockPosition: 'Ctrl+Shift+L',
        increaseTransparency: 'Ctrl+Shift+Up',
        decreaseTransparency: 'Ctrl+Shift+Down'
    },

    // ADC preference (remembered selection)
    preferredADC: null,

    // Version tracking
    settingsVersion: 1
};

class StorageService {
    static initialized = false;

    /**
     * Initialize storage with defaults
     */
    static async init() {
        if (this.initialized) return;

        const existingSettings = await this.getSettings();

        // Migrate settings if version mismatch
        if (!existingSettings || existingSettings.settingsVersion !== DEFAULT_SETTINGS.settingsVersion) {
            const mergedSettings = this.migrateSettings(existingSettings, DEFAULT_SETTINGS);
            await this.setSettings(mergedSettings);
        }

        this.initialized = true;
        console.log('[Storage] Initialized');
    }

    /**
     * Migrate old settings to new version
     */
    static migrateSettings(oldSettings, newDefaults) {
        if (!oldSettings) return { ...newDefaults };

        // Deep merge, preferring old values where they exist
        const merged = { ...newDefaults };

        for (const key in oldSettings) {
            if (key === 'settingsVersion') continue;

            if (typeof oldSettings[key] === 'object' && oldSettings[key] !== null &&
                typeof newDefaults[key] === 'object' && newDefaults[key] !== null) {
                merged[key] = { ...newDefaults[key], ...oldSettings[key] };
            } else if (this.isValidSettingValue(key, oldSettings[key])) {
                merged[key] = oldSettings[key];
            }
        }

        merged.settingsVersion = newDefaults.settingsVersion;
        return merged;
    }

    /**
     * Validate a setting value
     */
    static isValidSettingValue(key, value) {
        switch (key) {
            case 'overlayOpacity':
                return typeof value === 'number' && value >= 0 && value <= 100;
            case 'overlayPosition':
                return typeof value === 'object' &&
                    typeof value.left === 'number' &&
                    typeof value.top === 'number';
            case 'overlaySize':
                return typeof value === 'object' &&
                    typeof value.width === 'number' && value.width >= 200 &&
                    typeof value.height === 'number' && value.height >= 150;
            case 'overlayTheme':
                return ['dark', 'light', 'transparent'].includes(value);
            case 'overlayLocked':
            case 'autoShowOverlay':
            case 'showInGame':
            case 'openOnStart':
            case 'minimizeToTray':
            case 'showCooldowns':
            case 'showThreatTags':
            case 'showTips':
            case 'showAllyInfo':
            case 'compactMode':
                return typeof value === 'boolean';
            case 'preferredADC':
                return value === null || typeof value === 'string';
            default:
                return true;
        }
    }

    /**
     * Get all settings
     */
    static async getSettings() {
        return new Promise((resolve) => {
            overwolf.settings.extension.get(STORAGE_KEYS.SETTINGS, (result) => {
                if (result.success && result.value) {
                    try {
                        const settings = typeof result.value === 'string'
                            ? JSON.parse(result.value)
                            : result.value;
                        resolve(this.sanitizeSettings(settings));
                    } catch (e) {
                        console.error('[Storage] Failed to parse settings:', e);
                        resolve({ ...DEFAULT_SETTINGS });
                    }
                } else {
                    resolve({ ...DEFAULT_SETTINGS });
                }
            });
        });
    }

    /**
     * Save all settings
     */
    static async setSettings(settings) {
        const sanitized = this.sanitizeSettings(settings);

        return new Promise((resolve) => {
            overwolf.settings.extension.set(
                STORAGE_KEYS.SETTINGS,
                JSON.stringify(sanitized),
                (result) => {
                    if (!result.success) {
                        console.error('[Storage] Failed to save settings:', result.error);
                    }
                    resolve(result.success);
                }
            );
        });
    }

    /**
     * Sanitize settings object to prevent XSS and injection
     */
    static sanitizeSettings(settings) {
        if (!settings || typeof settings !== 'object') {
            return { ...DEFAULT_SETTINGS };
        }

        const sanitized = { ...DEFAULT_SETTINGS };

        // Validate and copy each setting
        for (const key in DEFAULT_SETTINGS) {
            if (key in settings && this.isValidSettingValue(key, settings[key])) {
                if (typeof settings[key] === 'object' && settings[key] !== null) {
                    sanitized[key] = { ...settings[key] };
                } else {
                    sanitized[key] = settings[key];
                }
            }
        }

        return sanitized;
    }

    /**
     * Get a single setting
     */
    static async getSetting(key) {
        const settings = await this.getSettings();
        return settings[key];
    }

    /**
     * Set a single setting
     */
    static async setSetting(key, value) {
        if (!this.isValidSettingValue(key, value)) {
            console.error(`[Storage] Invalid value for setting ${key}:`, value);
            return false;
        }

        const settings = await this.getSettings();
        settings[key] = value;
        return await this.setSettings(settings);
    }

    /**
     * Cache champion data
     */
    static async cacheChampionData(data, patch) {
        const cacheData = {
            patch,
            timestamp: Date.now(),
            data: data
        };

        return new Promise((resolve) => {
            overwolf.settings.extension.set(
                STORAGE_KEYS.CHAMPION_CACHE,
                JSON.stringify(cacheData),
                (result) => {
                    resolve(result.success);
                }
            );
        });
    }

    /**
     * Get cached champion data
     */
    static async getCachedChampionData(currentPatch) {
        return new Promise((resolve) => {
            overwolf.settings.extension.get(STORAGE_KEYS.CHAMPION_CACHE, (result) => {
                if (result.success && result.value) {
                    try {
                        const cache = JSON.parse(result.value);
                        // Validate cache is for current patch and not too old (24 hours)
                        const isValid = cache.patch === currentPatch &&
                            (Date.now() - cache.timestamp) < 24 * 60 * 60 * 1000;

                        if (isValid) {
                            resolve(cache.data);
                            return;
                        }
                    } catch (e) {
                        console.error('[Storage] Failed to parse champion cache:', e);
                    }
                }
                resolve(null);
            });
        });
    }

    /**
     * Clear all stored data
     */
    static async clearAll() {
        const keys = Object.values(STORAGE_KEYS);

        for (const key of keys) {
            await new Promise((resolve) => {
                overwolf.settings.extension.set(key, null, resolve);
            });
        }

        console.log('[Storage] All data cleared');
    }

    /**
     * Reset settings to defaults
     */
    static async resetSettings() {
        await this.setSettings({ ...DEFAULT_SETTINGS });
        console.log('[Storage] Settings reset to defaults');
    }
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { StorageService, DEFAULT_SETTINGS, STORAGE_KEYS };
}
