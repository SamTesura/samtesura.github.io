/**
 * Champion Data Loader
 *
 * Handles loading champion data from Riot's DDragon API
 * and local champions-summary.json for threat tags
 */

'use strict';

const ChampionDataLoader = {
    CONFIG: {
        PATCH_API: 'https://ddragon.leagueoflegends.com/api/versions.json',
        CHAMPION_API: 'https://ddragon.leagueoflegends.com/cdn/{version}/data/en_US/champion.json',
        CHAMPION_DETAIL_API: 'https://ddragon.leagueoflegends.com/cdn/{version}/data/en_US/champion/{championId}.json',
        CHAMPION_IMG: 'https://ddragon.leagueoflegends.com/cdn/{version}/img/champion/{championId}.png'
    },

    // Cached data
    patch: null,
    champions: null,
    championsSummary: null,

    /**
     * Initialize and load all champion data
     */
    async init() {
        try {
            this.patch = await this.fetchPatch();
            this.champions = await this.fetchChampions(this.patch);
            this.championsSummary = await this.fetchChampionsSummary();
            return true;
        } catch (error) {
            console.error('[ChampionData] Failed to initialize:', error);
            return false;
        }
    },

    /**
     * Fetch current patch version
     */
    async fetchPatch() {
        const res = await fetch(this.CONFIG.PATCH_API);
        if (!res.ok) throw new Error('Failed to fetch patch');
        const versions = await res.json();
        return versions[0];
    },

    /**
     * Fetch all champions
     */
    async fetchChampions(patch) {
        const url = this.CONFIG.CHAMPION_API.replace('{version}', patch);
        const res = await fetch(url);
        if (!res.ok) throw new Error('Failed to fetch champions');
        const data = await res.json();
        return data.data;
    },

    /**
     * Fetch champions summary with threat data
     */
    async fetchChampionsSummary() {
        try {
            const res = await fetch('./champions-summary.json');
            if (!res.ok) throw new Error('Failed to fetch summary');
            return await res.json();
        } catch (error) {
            console.warn('[ChampionData] Could not load champions-summary.json:', error);
            return { champions: [] };
        }
    },

    /**
     * Fetch detailed data for a specific champion
     */
    async fetchChampionDetail(championId) {
        const url = this.CONFIG.CHAMPION_DETAIL_API
            .replace('{version}', this.patch)
            .replace('{championId}', championId);
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Failed to fetch ${championId}`);
        const data = await res.json();
        return data.data[championId];
    },

    /**
     * Get champion by ID (numeric)
     */
    getChampionById(championId) {
        if (!this.champions) return null;

        for (const key in this.champions) {
            if (parseInt(this.champions[key].key) === championId) {
                return this.champions[key];
            }
        }
        return null;
    },

    /**
     * Get champion by name
     */
    getChampionByName(name) {
        if (!this.champions) return null;

        const normalized = this.normalizeForSearch(name);
        for (const key in this.champions) {
            if (this.normalizeForSearch(this.champions[key].name) === normalized) {
                return this.champions[key];
            }
        }
        return null;
    },

    /**
     * Normalize text for searching
     */
    normalizeForSearch(text) {
        return text.toLowerCase().replace(/['\s\-\.]/g, '');
    },

    /**
     * Get champion image URL
     */
    getChampionImageUrl(championId) {
        return this.CONFIG.CHAMPION_IMG
            .replace('{version}', this.patch)
            .replace('{championId}', championId);
    },

    /**
     * Get champions summary data for a champion
     */
    getChampionSummary(championName) {
        if (!this.championsSummary?.champions) return null;

        return this.championsSummary.champions.find(c =>
            c.name === championName || c.slug === championName
        );
    },

    /**
     * Search champions by partial name
     */
    searchChampions(query, limit = 5) {
        if (!this.champions || !query) return [];

        const normalized = this.normalizeForSearch(query);

        return Object.values(this.champions)
            .filter(c => this.normalizeForSearch(c.name).includes(normalized))
            .sort((a, b) => {
                const aStarts = this.normalizeForSearch(a.name).startsWith(normalized);
                const bStarts = this.normalizeForSearch(b.name).startsWith(normalized);
                if (aStarts && !bStarts) return -1;
                if (!aStarts && bStarts) return 1;
                return a.name.localeCompare(b.name);
            })
            .slice(0, limit);
    },

    /**
     * Get display patch (accounts for Riot's year-based versioning)
     */
    getDisplayPatch() {
        if (!this.patch) return '';

        const parts = this.patch.split('.');
        let majorVersion = parseInt(parts[0]);
        const minorVersion = parts[1];

        // Riot switched to year-based numbering in 2025
        // API returns 15.x but patch notes use 25.x
        if (majorVersion >= 15) {
            majorVersion += 10;
        }

        return `${majorVersion}.${minorVersion}`;
    }
};

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ChampionDataLoader };
}
