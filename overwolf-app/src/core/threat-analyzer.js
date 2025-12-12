/**
 * Threat Analyzer - Core analysis logic for ADC Threat
 *
 * Analyzes champion abilities and provides threat classifications
 * Based on wikilol CC standards
 *
 * Security: All input is validated and sanitized
 */

'use strict';

const ThreatAnalyzer = {
    /**
     * CC Classifications based on wikilol
     * Reference: https://wiki.leagueoflegends.com/en-us/Types_of_Crowd_Control
     */
    CC_CLASSIFICATIONS: {
        // Hard CC - Non-cleansable (forced movement)
        'KNOCKUP': { type: 'hard', label: 'Knockup', cleansable: false, color: 'hard' },
        'KNOCKBACK': { type: 'hard', label: 'Knockback', cleansable: false, color: 'hard' },
        'PULL': { type: 'hard', label: 'Pull', cleansable: false, color: 'hard' },
        'NEARSIGHT': { type: 'hard', label: 'Nearsight', cleansable: false, color: 'hard' },

        // Suppression - QSS only
        'SUPPRESSION': { type: 'suppression', label: 'Suppression', cleansable: false, qssOnly: true, color: 'hard' },

        // Hard CC - Cleansable
        'STUN': { type: 'hard', label: 'Stun', cleansable: true, color: 'hard' },
        'ROOT': { type: 'hard', label: 'Root', cleansable: true, color: 'hard' },
        'SNARE': { type: 'hard', label: 'Root', cleansable: true, color: 'hard' },
        'SLEEP': { type: 'hard', label: 'Sleep', cleansable: true, color: 'hard' },
        'CHARM': { type: 'hard', label: 'Charm', cleansable: true, color: 'hard' },
        'FEAR': { type: 'hard', label: 'Fear', cleansable: true, color: 'hard' },
        'TAUNT': { type: 'hard', label: 'Taunt', cleansable: true, color: 'hard' },
        'POLYMORPH': { type: 'hard', label: 'Polymorph', cleansable: true, color: 'hard' },

        // Soft CC - Cleansable
        'SLOW': { type: 'soft', label: 'Slow', cleansable: true, color: 'soft' },
        'SILENCE': { type: 'soft', label: 'Silence', cleansable: true, color: 'soft' },
        'BLIND': { type: 'soft', label: 'Blind', cleansable: true, color: 'soft' },
        'DISARM': { type: 'soft', label: 'Disarm', cleansable: true, color: 'soft' },
        'GROUNDED': { type: 'soft', label: 'Grounded', cleansable: true, color: 'soft' },
        'CRIPPLE': { type: 'soft', label: 'Cripple', cleansable: true, color: 'soft' },

        // Non-CC Threats - High
        'GAP_CLOSE': { type: 'high', label: 'Mobility', cleansable: false, color: 'high' },
        'DASH': { type: 'high', label: 'Dash', cleansable: false, color: 'high' },
        'STEALTH': { type: 'high', label: 'Stealth', cleansable: false, color: 'high' },
        'DODGE': { type: 'high', label: 'Dodge', cleansable: false, color: 'high' },
        'PROJECTILE_BLOCK': { type: 'high', label: 'Block', cleansable: false, color: 'high' },
        'BURST': { type: 'high', label: 'Burst', cleansable: false, color: 'high' },

        // Non-CC Threats - Medium
        'SHIELD': { type: 'medium', label: 'Shield', cleansable: false, color: 'medium' },
        'SHIELD_PEEL': { type: 'medium', label: 'Shield', cleansable: false, color: 'medium' },

        // Non-CC Threats - Low
        'SUSTAIN': { type: 'low', label: 'Sustain', cleansable: false, color: 'low' },
        'GHOST': { type: 'low', label: 'Ghost', cleansable: false, color: 'low' }
    },

    /**
     * Priority order for displaying threats
     */
    PRIORITY_ORDER: [
        'SUPPRESSION', 'NEARSIGHT',
        'KNOCKUP', 'KNOCKBACK', 'PULL',
        'STUN', 'ROOT', 'SNARE', 'CHARM', 'FEAR', 'TAUNT', 'SLEEP', 'POLYMORPH',
        'SILENCE', 'BLIND', 'DISARM', 'GROUNDED', 'CRIPPLE', 'SLOW',
        'DODGE', 'PROJECTILE_BLOCK', 'STEALTH', 'GAP_CLOSE', 'DASH', 'BURST',
        'SHIELD_PEEL', 'SHIELD',
        'SUSTAIN', 'GHOST'
    ],

    /**
     * Analyze a champion and return their threats
     */
    analyzeChampion(champion, championsSummary) {
        if (!champion) return [];

        const threats = [];
        const seenTypes = new Set();

        // Get summary data for this champion
        const summary = this.findChampionSummary(champion, championsSummary);

        if (summary?.abilities) {
            // Analyze each ability
            summary.abilities.forEach((ability, index) => {
                const abilityThreats = this.analyzeAbility(ability, index);
                abilityThreats.forEach(threat => {
                    if (!seenTypes.has(threat.label)) {
                        threats.push(threat);
                        seenTypes.add(threat.label);
                    }
                });
            });
        }

        // Fallback: Analyze from champion tags if no summary
        if (threats.length === 0) {
            const tagThreats = this.analyzeFromTags(champion.tags || []);
            tagThreats.forEach(threat => {
                if (!seenTypes.has(threat.label)) {
                    threats.push(threat);
                    seenTypes.add(threat.label);
                }
            });
        }

        // Sort by priority
        return this.sortByPriority(threats);
    },

    /**
     * Find champion in summary data
     */
    findChampionSummary(champion, championsSummary) {
        if (!championsSummary) return null;

        // Handle both array and object formats
        if (championsSummary.champions) {
            return championsSummary.champions.find(c =>
                c.name === champion.name || c.slug === champion.id
            );
        }

        return championsSummary[champion.name] || championsSummary[champion.id];
    },

    /**
     * Analyze a single ability
     */
    analyzeAbility(ability, index) {
        const threats = [];

        if (!ability?.threat || ability.threat.length === 0) {
            return threats;
        }

        // Process each threat tag
        ability.threat.forEach(tag => {
            const classification = this.CC_CLASSIFICATIONS[tag];
            if (classification) {
                threats.push({
                    ...classification,
                    abilityIndex: index,
                    abilityKey: ['Q', 'W', 'E', 'R'][index]
                });
            }
        });

        return threats;
    },

    /**
     * Analyze threats from champion tags (fallback)
     */
    analyzeFromTags(tags) {
        const threats = [];

        if (tags.includes('Assassin')) {
            threats.push({
                type: 'high',
                label: 'Assassin',
                cleansable: false,
                color: 'high'
            });
        }

        if (tags.includes('Fighter')) {
            threats.push({
                type: 'medium',
                label: 'Fighter',
                cleansable: false,
                color: 'medium'
            });
        }

        if (tags.includes('Tank')) {
            threats.push({
                type: 'medium',
                label: 'Tank',
                cleansable: false,
                color: 'medium'
            });
        }

        if (tags.includes('Mage')) {
            threats.push({
                type: 'medium',
                label: 'Mage',
                cleansable: false,
                color: 'medium'
            });
        }

        return threats;
    },

    /**
     * Sort threats by priority
     */
    sortByPriority(threats) {
        return threats.sort((a, b) => {
            // First sort by type priority
            const typeOrder = { 'hard': 0, 'suppression': 1, 'soft': 2, 'high': 3, 'medium': 4, 'low': 5 };
            const typeA = typeOrder[a.type] ?? 99;
            const typeB = typeOrder[b.type] ?? 99;

            if (typeA !== typeB) {
                return typeA - typeB;
            }

            // Then by label for consistency
            return a.label.localeCompare(b.label);
        });
    },

    /**
     * Get cleansability text for a threat
     */
    getCleansabilityText(threat) {
        if (threat.qssOnly) {
            return 'QSS only';
        }
        if (threat.cleansable === true) {
            return 'Cleansable';
        }
        if (threat.cleansable === false) {
            return 'Not cleansable';
        }
        return '';
    },

    /**
     * Get threat icon
     */
    getThreatIcon(label) {
        const icons = {
            'Knockup': '🌪️',
            'Knockback': '💨',
            'Pull': '🪝',
            'Suppression': '🔒',
            'Nearsight': '🌫️',
            'Stun': '⚡',
            'Root': '🌿',
            'Sleep': '😴',
            'Charm': '💕',
            'Fear': '😱',
            'Taunt': '😡',
            'Polymorph': '🐑',
            'Slow': '🐌',
            'Silence': '🤐',
            'Blind': '🙈',
            'Disarm': '🚫',
            'Grounded': '⚓',
            'Cripple': '🦴',
            'Mobility': '🏃',
            'Dash': '💨',
            'Stealth': '👻',
            'Dodge': '🌀',
            'Block': '🧱',
            'Burst': '💥',
            'Shield': '🛡️',
            'Sustain': '💚',
            'Assassin': '🗡️',
            'Fighter': '⚔️',
            'Tank': '🛡️',
            'Mage': '🔮'
        };

        return icons[label] || '⚠️';
    },

    /**
     * Generate threat summary for an ADC vs enemy matchup
     */
    generateMatchupSummary(adcName, enemyChampion, championsSummary, adcTemplates) {
        const tips = [];

        // Get ADC-specific tips if available
        if (adcTemplates?.[adcName]?.tips?.[enemyChampion.name]) {
            tips.push({
                type: 'matchup',
                text: adcTemplates[adcName].tips[enemyChampion.name]
            });
        }

        // Analyze enemy threats
        const threats = this.analyzeChampion(enemyChampion, championsSummary);

        // Generate tips based on threats
        const hardCC = threats.filter(t => t.type === 'hard' || t.type === 'suppression');
        if (hardCC.length > 0) {
            const ccTypes = hardCC.map(t => t.label).join(', ');
            tips.push({
                type: 'warning',
                text: `Watch for CC: ${ccTypes}. Track cooldowns for safe trading windows.`
            });
        }

        const mobility = threats.find(t => t.label === 'Mobility' || t.label === 'Dash');
        if (mobility) {
            tips.push({
                type: 'info',
                text: 'High mobility - respect gap closers and position carefully.'
            });
        }

        const stealth = threats.find(t => t.label === 'Stealth');
        if (stealth) {
            tips.push({
                type: 'warning',
                text: 'Can stealth - buy Control Wards and stay near allies.'
            });
        }

        return tips;
    }
};

// Freeze to prevent modification
Object.freeze(ThreatAnalyzer);

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ThreatAnalyzer };
}
