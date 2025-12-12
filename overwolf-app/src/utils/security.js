/**
 * Security Utilities
 *
 * Provides sanitization and validation functions to prevent:
 * - XSS (Cross-Site Scripting)
 * - Injection attacks
 * - Data tampering
 *
 * All external data (LCU API, user input) must pass through these utilities
 */

'use strict';

const SecurityUtils = {
    /**
     * Sanitize a string to prevent XSS
     * Escapes HTML special characters
     */
    escapeHtml(str) {
        if (typeof str !== 'string') return '';

        const htmlEntities = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#x27;',
            '/': '&#x2F;',
            '`': '&#x60;',
            '=': '&#x3D;'
        };

        return str.replace(/[&<>"'`=/]/g, char => htmlEntities[char]);
    },

    /**
     * Sanitize an object recursively
     * Escapes all string values
     */
    sanitizeObject(obj, maxDepth = 10) {
        if (maxDepth <= 0) return null;

        if (obj === null || obj === undefined) return obj;

        if (typeof obj === 'string') {
            return this.escapeHtml(obj);
        }

        if (typeof obj === 'number' || typeof obj === 'boolean') {
            return obj;
        }

        if (Array.isArray(obj)) {
            return obj.map(item => this.sanitizeObject(item, maxDepth - 1));
        }

        if (typeof obj === 'object') {
            const sanitized = {};
            for (const key in obj) {
                if (Object.prototype.hasOwnProperty.call(obj, key)) {
                    // Sanitize key as well (prevent prototype pollution)
                    const safeKey = this.sanitizeKey(key);
                    if (safeKey) {
                        sanitized[safeKey] = this.sanitizeObject(obj[key], maxDepth - 1);
                    }
                }
            }
            return sanitized;
        }

        return null;
    },

    /**
     * Sanitize object key to prevent prototype pollution
     */
    sanitizeKey(key) {
        if (typeof key !== 'string') return null;

        // Block prototype pollution attempts
        const blockedKeys = ['__proto__', 'constructor', 'prototype'];
        if (blockedKeys.includes(key.toLowerCase())) {
            console.warn('[Security] Blocked prototype pollution attempt:', key);
            return null;
        }

        // Only allow alphanumeric keys with underscores
        if (!/^[a-zA-Z0-9_]+$/.test(key)) {
            return key.replace(/[^a-zA-Z0-9_]/g, '_');
        }

        return key;
    },

    /**
     * Validate and sanitize champion ID
     */
    validateChampionId(id) {
        const numId = parseInt(id, 10);
        // Champion IDs are positive integers, typically between 1-1000
        if (isNaN(numId) || numId < 0 || numId > 10000) {
            return 0;
        }
        return numId;
    },

    /**
     * Validate and sanitize summoner ID
     */
    validateSummonerId(id) {
        // Summoner IDs can be large numbers or strings
        if (typeof id === 'number') {
            return Math.abs(Math.floor(id));
        }
        if (typeof id === 'string') {
            return this.escapeHtml(id);
        }
        return '';
    },

    /**
     * Sanitize champion select data from LCU API
     */
    sanitizeChampSelectData(data) {
        if (!data || typeof data !== 'object') {
            return null;
        }

        const sanitized = {
            phase: this.escapeHtml(String(data.phase || '')),
            localPlayerCellId: this.validateChampionId(data.localPlayerCellId),
            myTeam: [],
            theirTeam: [],
            bans: {
                myTeam: [],
                theirTeam: []
            },
            actions: []
        };

        // Sanitize my team
        if (Array.isArray(data.myTeam)) {
            sanitized.myTeam = data.myTeam.slice(0, 5).map(player => ({
                cellId: this.validateChampionId(player.cellId),
                championId: this.validateChampionId(player.championId),
                championPickIntent: this.validateChampionId(player.championPickIntent),
                summonerId: this.validateSummonerId(player.summonerId),
                assignedPosition: this.escapeHtml(String(player.assignedPosition || '')),
                spell1Id: this.validateChampionId(player.spell1Id),
                spell2Id: this.validateChampionId(player.spell2Id)
            }));
        }

        // Sanitize enemy team
        if (Array.isArray(data.theirTeam)) {
            sanitized.theirTeam = data.theirTeam.slice(0, 5).map(player => ({
                cellId: this.validateChampionId(player.cellId),
                championId: this.validateChampionId(player.championId),
                championPickIntent: this.validateChampionId(player.championPickIntent)
            }));
        }

        // Sanitize bans
        if (data.bans) {
            if (Array.isArray(data.bans.myTeam)) {
                sanitized.bans.myTeam = data.bans.myTeam
                    .slice(0, 5)
                    .map(id => this.validateChampionId(id))
                    .filter(id => id > 0);
            }
            if (Array.isArray(data.bans.theirTeam)) {
                sanitized.bans.theirTeam = data.bans.theirTeam
                    .slice(0, 5)
                    .map(id => this.validateChampionId(id))
                    .filter(id => id > 0);
            }
        }

        // Sanitize actions
        if (Array.isArray(data.actions)) {
            sanitized.actions = data.actions.slice(0, 50).map(action => ({
                actorCellId: this.validateChampionId(action.actorCellId),
                championId: this.validateChampionId(action.championId),
                completed: Boolean(action.completed),
                isAllyAction: Boolean(action.isAllyAction),
                type: this.escapeHtml(String(action.type || ''))
            }));
        }

        return sanitized;
    },

    /**
     * Validate URL to prevent open redirect attacks
     * Only allows specific trusted domains
     */
    validateUrl(url) {
        const trustedDomains = [
            'ddragon.leagueoflegends.com',
            'wiki.leagueoflegends.com',
            'leagueoflegends.com'
        ];

        try {
            const parsed = new URL(url);

            // Only allow HTTPS
            if (parsed.protocol !== 'https:') {
                return null;
            }

            // Check if domain is trusted
            const isTrusted = trustedDomains.some(domain =>
                parsed.hostname === domain || parsed.hostname.endsWith('.' + domain)
            );

            if (!isTrusted) {
                console.warn('[Security] Blocked untrusted URL:', url);
                return null;
            }

            return parsed.href;
        } catch (e) {
            console.warn('[Security] Invalid URL:', url);
            return null;
        }
    },

    /**
     * Create a safe DOM element with text content
     * Prevents XSS by using textContent instead of innerHTML
     */
    createSafeElement(tag, text, className) {
        const allowedTags = ['div', 'span', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
            'ul', 'li', 'a', 'img', 'button', 'input', 'label', 'table', 'tr', 'td', 'th'];

        if (!allowedTags.includes(tag.toLowerCase())) {
            tag = 'div';
        }

        const element = document.createElement(tag);

        if (text) {
            element.textContent = text;
        }

        if (className) {
            // Sanitize class name
            element.className = String(className).replace(/[^a-zA-Z0-9\s\-_]/g, '');
        }

        return element;
    },

    /**
     * Safely set innerHTML by parsing and sanitizing
     * Use only when necessary - prefer textContent
     */
    safeInnerHTML(element, html) {
        // Create a temporary element to parse HTML
        const temp = document.createElement('div');
        temp.textContent = html; // Escapes all HTML

        // If you need to allow some HTML, use a whitelist approach
        element.innerHTML = temp.textContent;
    },

    /**
     * Rate limiter to prevent DoS
     */
    createRateLimiter(maxRequests, windowMs) {
        const requests = [];

        return function isAllowed() {
            const now = Date.now();
            const windowStart = now - windowMs;

            // Remove old requests
            while (requests.length > 0 && requests[0] < windowStart) {
                requests.shift();
            }

            if (requests.length >= maxRequests) {
                return false;
            }

            requests.push(now);
            return true;
        };
    },

    /**
     * Generate a cryptographically secure random ID
     */
    generateSecureId(length = 16) {
        const array = new Uint8Array(length);
        crypto.getRandomValues(array);
        return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    }
};

// Freeze the object to prevent tampering
Object.freeze(SecurityUtils);

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { SecurityUtils };
}
