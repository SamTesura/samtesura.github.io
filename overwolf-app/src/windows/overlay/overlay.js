/**
 * ADC Threat Overlay Window
 *
 * Non-invasive overlay that displays threat analysis during champion select
 * Features:
 * - Automatic champion detection from LCU API
 * - Draggable/resizable (can be locked)
 * - Adjustable transparency
 * - Compact mode for minimal screen space
 *
 * Security: All displayed data is sanitized
 */

'use strict';

class OverlayController {
    constructor() {
        // State
        this.settings = null;
        this.championData = null;
        this.championsSummary = null;
        this.currentSession = null;
        this.selectedADC = null;
        this.enemies = [];
        this.allies = [];
        this.isLocked = false;
        this.isDragging = false;
        this.isResizing = false;
        this.dragOffset = { x: 0, y: 0 };

        // DOM Elements
        this.container = document.getElementById('overlay-container');
        this.dragHandle = document.getElementById('drag-handle');
        this.resizeHandle = document.getElementById('resize-handle');
        this.gamePhaseEl = document.getElementById('game-phase');
        this.connectionStatusEl = document.getElementById('connection-status');
        this.selectedAdcEl = document.getElementById('selected-adc');
        this.enemyChampionsEl = document.getElementById('enemy-champions');
        this.allyChampionsEl = document.getElementById('ally-champions');
        this.threatAnalysisEl = document.getElementById('threat-analysis');
        this.enemyCountEl = document.getElementById('enemy-count');
        this.allyCountEl = document.getElementById('ally-count');

        this.init();
    }

    async init() {
        console.log('[Overlay] Initializing...');

        // Load settings
        await this.loadSettings();

        // Load champion data
        await this.loadChampionData();

        // Apply settings
        this.applySettings();

        // Setup event listeners
        this.setupEventListeners();

        // Setup message listener from background
        this.setupMessageListener();

        // Request initial data from background
        this.requestLCUData();

        console.log('[Overlay] Initialized');
    }

    async loadSettings() {
        this.settings = await StorageService.getSettings();
    }

    async loadChampionData() {
        try {
            // Fetch current patch
            const patchRes = await fetch('https://ddragon.leagueoflegends.com/api/versions.json');
            const versions = await patchRes.json();
            const patch = versions[0];

            // Check cache first
            const cached = await StorageService.getCachedChampionData(patch);
            if (cached) {
                this.championData = cached.champions;
                this.championsSummary = cached.summary;
                console.log('[Overlay] Loaded champion data from cache');
                return;
            }

            // Fetch champion data
            const champRes = await fetch(
                `https://ddragon.leagueoflegends.com/cdn/${patch}/data/en_US/champion.json`
            );
            const champData = await champRes.json();
            this.championData = champData.data;

            // Load champions summary (bundled with app)
            try {
                const summaryRes = await fetch('../../core/champions-summary.json');
                this.championsSummary = await summaryRes.json();
            } catch (e) {
                console.warn('[Overlay] Could not load champions summary');
                this.championsSummary = {};
            }

            // Cache the data
            await StorageService.cacheChampionData({
                champions: this.championData,
                summary: this.championsSummary,
                patch
            }, patch);

            console.log('[Overlay] Loaded champion data from API');
        } catch (error) {
            console.error('[Overlay] Failed to load champion data:', error);
        }
    }

    applySettings() {
        // Apply opacity
        this.container.style.opacity = this.settings.overlayOpacity / 100;

        // Apply lock state
        this.isLocked = this.settings.overlayLocked;
        this.container.classList.toggle('locked', this.isLocked);
        document.getElementById('btn-lock').classList.toggle('active', this.isLocked);

        // Apply compact mode
        this.container.classList.toggle('compact', this.settings.compactMode);

        // Apply theme
        if (this.settings.overlayTheme === 'transparent') {
            this.container.classList.add('transparent-mode');
        }
    }

    setupEventListeners() {
        // Drag functionality
        this.dragHandle.addEventListener('mousedown', (e) => this.startDrag(e));
        document.addEventListener('mousemove', (e) => this.onDrag(e));
        document.addEventListener('mouseup', () => this.stopDrag());

        // Resize functionality
        this.resizeHandle.addEventListener('mousedown', (e) => this.startResize(e));

        // Control buttons
        document.getElementById('btn-lock').addEventListener('click', () => this.toggleLock());
        document.getElementById('btn-settings').addEventListener('click', () => this.openSettings());
        document.getElementById('btn-minimize').addEventListener('click', () => this.minimize());
        document.getElementById('btn-toggle-details').addEventListener('click', () => this.toggleDetails());

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => this.handleKeydown(e));
    }

    setupMessageListener() {
        overwolf.windows.onMessageReceived.addListener((message) => {
            if (message.id === 'overlay') {
                this.handleMessage(message.content);
            }
        });
    }

    handleMessage(message) {
        console.log('[Overlay] Received message:', message.type);

        switch (message.type) {
            case 'CHAMPION_SELECT_UPDATE':
                this.handleChampionSelectUpdate(message.payload);
                break;
            case 'GAME_PHASE_CHANGE':
                this.handleGamePhaseChange(message.payload.phase);
                break;
            case 'SETTINGS_UPDATE':
                this.handleSettingsUpdate(message.payload);
                break;
            case 'CONNECTION_STATUS':
                this.updateConnectionStatus(message.payload.connected);
                break;
        }
    }

    handleChampionSelectUpdate(data) {
        if (!data) {
            this.clearSession();
            return;
        }

        this.currentSession = data;

        // Process teams
        this.processTeams(data);

        // Update UI
        this.updateUI();
    }

    processTeams(data) {
        // Reset
        this.enemies = [];
        this.allies = [];
        this.selectedADC = null;

        // Find local player's position
        const localPlayer = data.myTeam.find(p => p.cellId === data.localPlayerCellId);
        const localPosition = localPlayer?.assignedPosition?.toLowerCase() || '';

        // If local player is ADC (BOTTOM), auto-select them
        if (localPosition === 'bottom' || localPosition === 'adc') {
            if (localPlayer.championId > 0) {
                this.selectedADC = this.getChampionById(localPlayer.championId);
            }
        }

        // Process allies (excluding self)
        data.myTeam.forEach(player => {
            if (player.cellId !== data.localPlayerCellId && player.championId > 0) {
                const champion = this.getChampionById(player.championId);
                if (champion) {
                    this.allies.push({
                        ...champion,
                        position: player.assignedPosition
                    });
                }
            }
        });

        // Process enemies
        data.theirTeam.forEach(player => {
            if (player.championId > 0) {
                const champion = this.getChampionById(player.championId);
                if (champion) {
                    this.enemies.push(champion);
                }
            }
        });
    }

    getChampionById(championId) {
        if (!this.championData) return null;

        // Find champion by key (ID)
        for (const key in this.championData) {
            if (parseInt(this.championData[key].key) === championId) {
                return this.championData[key];
            }
        }
        return null;
    }

    updateUI() {
        this.updateSelectedADC();
        this.updateEnemyChampions();
        this.updateAllyChampions();
        this.updateThreatAnalysis();
    }

    updateSelectedADC() {
        if (this.selectedADC) {
            const imgUrl = this.getChampionImageUrl(this.selectedADC.id);
            this.selectedAdcEl.innerHTML = `
                <img class="champion-portrait" src="${SecurityUtils.escapeHtml(imgUrl)}" alt="">
                <span class="champion-name">${SecurityUtils.escapeHtml(this.selectedADC.name)}</span>
            `;
        } else {
            this.selectedAdcEl.innerHTML = '<span class="placeholder">Detecting ADC...</span>';
        }
    }

    updateEnemyChampions() {
        this.enemyCountEl.textContent = `${this.enemies.length}/5`;

        if (this.enemies.length === 0) {
            this.enemyChampionsEl.innerHTML = '<div class="empty-state">Waiting for picks...</div>';
            return;
        }

        this.enemyChampionsEl.innerHTML = this.enemies.map(champ =>
            this.createChampionCard(champ, 'enemy')
        ).join('');
    }

    updateAllyChampions() {
        this.allyCountEl.textContent = `${this.allies.length}/4`;

        if (this.allies.length === 0) {
            this.allyChampionsEl.innerHTML = '<div class="empty-state">Waiting for picks...</div>';
            return;
        }

        this.allyChampionsEl.innerHTML = this.allies.map(champ =>
            this.createChampionCard(champ, 'ally')
        ).join('');
    }

    createChampionCard(champion, team) {
        const imgUrl = this.getChampionImageUrl(champion.id);
        const threats = this.getChampionThreats(champion);
        const position = champion.position ? SecurityUtils.escapeHtml(champion.position) : '';

        const threatTags = threats.map(t => `
            <span class="threat-tag ${t.color}">
                ${SecurityUtils.escapeHtml(t.label)}
                ${t.cleansable !== undefined ? `<span class="cleansable">${t.cleansable ? '✓' : '✗'}</span>` : ''}
            </span>
        `).join('');

        return `
            <div class="champion-card ${team}">
                <img class="portrait" src="${SecurityUtils.escapeHtml(imgUrl)}" alt="">
                <div class="info">
                    <div class="name">${SecurityUtils.escapeHtml(champion.name)}</div>
                    ${position ? `<div class="position">${position}</div>` : ''}
                    ${team === 'enemy' && threats.length > 0 ? `<div class="threats">${threatTags}</div>` : ''}
                </div>
            </div>
        `;
    }

    getChampionImageUrl(championId) {
        // Get patch from champion data
        const patch = this.championData?.[championId]?.version || '14.1.1';
        return `https://ddragon.leagueoflegends.com/cdn/${patch}/img/champion/${championId}.png`;
    }

    getChampionThreats(champion) {
        // Use ThreatAnalyzer if available
        if (typeof ThreatAnalyzer !== 'undefined') {
            return ThreatAnalyzer.analyzeChampion(champion, this.championsSummary);
        }

        // Fallback: return champion tags as threats
        const tagMap = {
            'Fighter': { label: 'Fighter', color: 'medium' },
            'Tank': { label: 'Tank', color: 'medium' },
            'Mage': { label: 'Mage', color: 'high' },
            'Assassin': { label: 'Assassin', color: 'hard' },
            'Marksman': { label: 'Marksman', color: 'medium' },
            'Support': { label: 'Support', color: 'low' }
        };

        return (champion.tags || [])
            .map(tag => tagMap[tag])
            .filter(Boolean);
    }

    updateThreatAnalysis() {
        if (this.enemies.length === 0 && !this.selectedADC) {
            this.threatAnalysisEl.innerHTML = '<div class="empty-state">Select champions to see analysis</div>';
            return;
        }

        // Generate analysis cards
        const analysisCards = this.enemies.map(champ =>
            this.createAnalysisCard(champ)
        ).join('');

        this.threatAnalysisEl.innerHTML = analysisCards || '<div class="empty-state">No enemy champions detected</div>';
    }

    createAnalysisCard(champion) {
        const imgUrl = this.getChampionImageUrl(champion.id);
        const summary = this.championsSummary?.champions?.find(c => c.name === champion.name);

        // Get abilities with CC
        const abilities = this.getChampionAbilities(champion, summary);
        const tip = this.getChampionTip(champion);

        return `
            <div class="analysis-card">
                <div class="header">
                    <img class="portrait-small" src="${SecurityUtils.escapeHtml(imgUrl)}" alt="">
                    <span class="champion-name">${SecurityUtils.escapeHtml(champion.name)}</span>
                </div>
                <div class="abilities">
                    ${abilities.map(a => `
                        <span class="ability-badge ${a.hasCC ? 'has-cc' : ''}">
                            <span class="key">${a.key}</span>
                            ${a.cooldown ? `<span class="cooldown">${a.cooldown}s</span>` : ''}
                            ${a.threat ? `<span class="threat-tag ${a.threat.color}">${SecurityUtils.escapeHtml(a.threat.label)}</span>` : ''}
                        </span>
                    `).join('')}
                </div>
                ${tip ? `<div class="tip">${SecurityUtils.escapeHtml(tip)}</div>` : ''}
            </div>
        `;
    }

    getChampionAbilities(champion, summary) {
        const keys = ['Q', 'W', 'E', 'R'];
        const abilities = [];

        if (summary?.abilities) {
            summary.abilities.forEach((ability, i) => {
                const threats = ability.threat || [];
                const hasCCThreat = threats.some(t =>
                    ['STUN', 'ROOT', 'KNOCKUP', 'KNOCKBACK', 'SUPPRESSION', 'CHARM', 'FEAR', 'TAUNT'].includes(t)
                );

                abilities.push({
                    key: keys[i],
                    cooldown: ability.cooldowns?.[0],
                    hasCC: hasCCThreat,
                    threat: hasCCThreat ? this.threatFromTag(threats[0]) : null
                });
            });
        } else {
            // Fallback - just show ability keys
            keys.forEach(key => {
                abilities.push({ key, hasCC: false });
            });
        }

        return abilities;
    }

    threatFromTag(tag) {
        const threatMap = {
            'KNOCKUP': { label: 'Knockup', color: 'hard' },
            'KNOCKBACK': { label: 'Knockback', color: 'hard' },
            'STUN': { label: 'Stun', color: 'hard' },
            'ROOT': { label: 'Root', color: 'hard' },
            'SUPPRESSION': { label: 'Suppress', color: 'hard' },
            'CHARM': { label: 'Charm', color: 'hard' },
            'FEAR': { label: 'Fear', color: 'hard' },
            'TAUNT': { label: 'Taunt', color: 'hard' },
            'SILENCE': { label: 'Silence', color: 'soft' },
            'SLOW': { label: 'Slow', color: 'low' },
            'GAP_CLOSE': { label: 'Mobility', color: 'high' },
            'STEALTH': { label: 'Stealth', color: 'high' },
            'BURST': { label: 'Burst', color: 'high' }
        };

        return threatMap[tag] || null;
    }

    getChampionTip(champion) {
        // Check if we have ADC templates loaded
        if (typeof ADC_TEMPLATES !== 'undefined' && this.selectedADC) {
            const adcTips = ADC_TEMPLATES[this.selectedADC.name];
            if (adcTips?.tips?.[champion.name]) {
                return adcTips.tips[champion.name];
            }
        }

        // Generic tip based on champion class
        const tags = champion.tags || [];
        if (tags.includes('Assassin')) {
            return 'High burst threat. Position safely and track cooldowns.';
        }
        if (tags.includes('Fighter')) {
            return 'Can dive and sustain. Avoid extended trades.';
        }
        if (tags.includes('Tank')) {
            return 'Watch for engage. Position behind your frontline.';
        }
        if (tags.includes('Mage')) {
            return 'Respect ability range. Dodge skill shots.';
        }

        return null;
    }

    handleGamePhaseChange(phase) {
        const phaseText = phase || 'Waiting...';
        this.gamePhaseEl.textContent = SecurityUtils.escapeHtml(phaseText);
        this.gamePhaseEl.classList.toggle('active', phase === 'ChampSelect' || phase === 'InProgress');

        if (phase === 'None' || phase === 'Lobby') {
            this.clearSession();
        }
    }

    handleSettingsUpdate(updates) {
        Object.assign(this.settings, updates);
        this.applySettings();
    }

    updateConnectionStatus(connected) {
        this.connectionStatusEl.textContent = connected ? 'Connected' : 'Disconnected';
        this.connectionStatusEl.classList.toggle('connected', connected);
    }

    clearSession() {
        this.currentSession = null;
        this.enemies = [];
        this.allies = [];
        this.selectedADC = null;
        this.updateUI();
    }

    requestLCUData() {
        overwolf.windows.sendMessage('background', 'overlay', {
            type: 'GET_LCU_DATA'
        }, () => {});
    }

    // Drag functionality
    startDrag(e) {
        if (this.isLocked) return;

        this.isDragging = true;
        this.dragOffset = {
            x: e.clientX,
            y: e.clientY
        };
    }

    onDrag(e) {
        if (!this.isDragging) return;

        const deltaX = e.clientX - this.dragOffset.x;
        const deltaY = e.clientY - this.dragOffset.y;

        overwolf.windows.getCurrentWindow((result) => {
            if (result.success) {
                const newLeft = result.window.left + deltaX;
                const newTop = result.window.top + deltaY;

                overwolf.windows.changePosition('overlay', newLeft, newTop);

                // Save position
                overwolf.windows.sendMessage('background', 'overlay', {
                    type: 'SAVE_OVERLAY_POSITION',
                    payload: { left: newLeft, top: newTop }
                }, () => {});
            }
        });

        this.dragOffset = { x: e.clientX, y: e.clientY };
    }

    stopDrag() {
        this.isDragging = false;
        this.isResizing = false;
    }

    // Resize functionality
    startResize(e) {
        if (this.isLocked) return;

        this.isResizing = true;
        this.dragOffset = { x: e.clientX, y: e.clientY };

        document.addEventListener('mousemove', this.onResize.bind(this));
        document.addEventListener('mouseup', this.stopResize.bind(this));
        e.preventDefault();
    }

    onResize(e) {
        if (!this.isResizing) return;

        overwolf.windows.getCurrentWindow((result) => {
            if (result.success) {
                const deltaX = e.clientX - this.dragOffset.x;
                const deltaY = e.clientY - this.dragOffset.y;

                const newWidth = Math.max(300, result.window.width + deltaX);
                const newHeight = Math.max(200, result.window.height + deltaY);

                overwolf.windows.changeSize('overlay', newWidth, newHeight);

                // Save size
                overwolf.windows.sendMessage('background', 'overlay', {
                    type: 'SAVE_OVERLAY_SIZE',
                    payload: { width: newWidth, height: newHeight }
                }, () => {});
            }
        });

        this.dragOffset = { x: e.clientX, y: e.clientY };
    }

    stopResize() {
        this.isResizing = false;
        document.removeEventListener('mousemove', this.onResize);
        document.removeEventListener('mouseup', this.stopResize);
    }

    // Control actions
    toggleLock() {
        this.isLocked = !this.isLocked;
        this.container.classList.toggle('locked', this.isLocked);
        document.getElementById('btn-lock').classList.toggle('active', this.isLocked);

        // Notify background to save setting
        overwolf.windows.sendMessage('background', 'overlay', {
            type: 'TOGGLE_LOCK',
            payload: { locked: this.isLocked }
        }, () => {});
    }

    openSettings() {
        overwolf.windows.sendMessage('background', 'overlay', {
            type: 'OPEN_SETTINGS'
        }, () => {});
    }

    minimize() {
        overwolf.windows.hide('overlay');
    }

    toggleDetails() {
        this.settings.compactMode = !this.settings.compactMode;
        this.container.classList.toggle('compact', this.settings.compactMode);
    }

    handleKeydown(e) {
        // Escape to minimize
        if (e.key === 'Escape') {
            this.minimize();
        }
    }
}

// Initialize overlay when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.overlayController = new OverlayController();
});
