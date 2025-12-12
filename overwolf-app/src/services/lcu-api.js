/**
 * LCU API Service - League Client Update API Integration
 *
 * Connects to the local League Client API to detect:
 * - Champion select sessions
 * - Picks and bans
 * - Team compositions
 * - Game phases
 *
 * Security: Uses secure WebSocket with certificate validation bypass for localhost only
 */

'use strict';

class LCUService {
    constructor() {
        this.credentials = null;
        this.isConnected = false;
        this.ws = null;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 10;
        this.reconnectDelay = 2000;
        this.pollingInterval = null;

        // Callbacks
        this.onChampionSelectUpdate = null;
        this.onGamePhaseChange = null;
        this.onConnectionChange = null;

        // State
        this.currentSession = null;
        this.currentPhase = null;
    }

    /**
     * Connect to the LCU API
     */
    async connect() {
        console.log('[LCU] Attempting to connect to League Client...');

        try {
            // Get LCU credentials from lockfile
            this.credentials = await this.getLCUCredentials();

            if (!this.credentials) {
                console.log('[LCU] Could not find League Client credentials, will retry...');
                this.scheduleReconnect();
                return;
            }

            // Connect via WebSocket for real-time updates
            await this.connectWebSocket();

            // Start polling as backup
            this.startPolling();

            this.isConnected = true;
            this.reconnectAttempts = 0;

            if (this.onConnectionChange) {
                this.onConnectionChange(true);
            }

            console.log('[LCU] Connected to League Client');
        } catch (error) {
            console.error('[LCU] Connection failed:', error);
            this.scheduleReconnect();
        }
    }

    /**
     * Get LCU credentials from the lockfile
     * Uses Overwolf's plugin or process detection
     */
    async getLCUCredentials() {
        return new Promise((resolve) => {
            // Try to get credentials via Overwolf's game info
            overwolf.games.launchers.getRunningLaunchersInfo((result) => {
                if (result && result.launchers) {
                    const lolLauncher = result.launchers.find(l => l.classId === 10902);
                    if (lolLauncher) {
                        // Parse command line for port and auth token
                        const commandLine = lolLauncher.commandLine || '';
                        const portMatch = commandLine.match(/--app-port=(\d+)/);
                        const authMatch = commandLine.match(/--remoting-auth-token=([^\s"]+)/);

                        if (portMatch && authMatch) {
                            resolve({
                                port: parseInt(portMatch[1], 10),
                                authToken: authMatch[1],
                                protocol: 'https'
                            });
                            return;
                        }
                    }
                }

                // Fallback: Try common default port with detection
                this.detectLCUViaProcess().then(resolve);
            });
        });
    }

    /**
     * Detect LCU via process scanning (fallback method)
     */
    async detectLCUViaProcess() {
        // This would require additional platform-specific code
        // For now, return null and let polling handle it
        return null;
    }

    /**
     * Connect to LCU WebSocket for real-time events
     */
    async connectWebSocket() {
        if (!this.credentials) return;

        const { port, authToken, protocol } = this.credentials;
        const wsProtocol = protocol === 'https' ? 'wss' : 'ws';

        return new Promise((resolve, reject) => {
            try {
                // Create WebSocket with basic auth
                const auth = btoa(`riot:${authToken}`);
                const wsUrl = `${wsProtocol}://127.0.0.1:${port}/`;

                // Note: In Overwolf, we use their WebSocket wrapper
                // For standard WebSocket, certificate issues need handling
                this.ws = new WebSocket(wsUrl);

                this.ws.onopen = () => {
                    console.log('[LCU] WebSocket connected');

                    // Subscribe to events
                    this.ws.send(JSON.stringify([5, 'OnJsonApiEvent']));

                    resolve();
                };

                this.ws.onmessage = (event) => {
                    this.handleWebSocketMessage(event.data);
                };

                this.ws.onerror = (error) => {
                    console.error('[LCU] WebSocket error:', error);
                    // Don't reject - we have polling as backup
                };

                this.ws.onclose = () => {
                    console.log('[LCU] WebSocket closed');
                    if (this.isConnected) {
                        this.scheduleReconnect();
                    }
                };

                // Timeout if connection doesn't establish
                setTimeout(() => {
                    if (this.ws.readyState !== WebSocket.OPEN) {
                        console.log('[LCU] WebSocket connection timeout, using polling');
                        resolve(); // Don't reject, polling is the backup
                    }
                }, 5000);

            } catch (error) {
                console.error('[LCU] Failed to create WebSocket:', error);
                resolve(); // Don't reject, polling is the backup
            }
        });
    }

    /**
     * Handle WebSocket messages
     */
    handleWebSocketMessage(data) {
        try {
            const message = JSON.parse(data);

            // LCU WebSocket messages are arrays: [opcode, event, data]
            if (Array.isArray(message) && message.length >= 3) {
                const [, event, payload] = message;

                if (payload && payload.uri) {
                    this.handleLCUEvent(payload.uri, payload.data);
                }
            }
        } catch (error) {
            console.error('[LCU] Failed to parse WebSocket message:', error);
        }
    }

    /**
     * Handle LCU API events
     */
    handleLCUEvent(uri, data) {
        // Champion select session updates
        if (uri.includes('/lol-champ-select/v1/session')) {
            this.handleChampSelectSession(data);
        }

        // Game flow phase changes
        if (uri.includes('/lol-gameflow/v1/gameflow-phase')) {
            this.handleGameFlowPhase(data);
        }

        // Lobby updates
        if (uri.includes('/lol-lobby/v2/lobby')) {
            this.handleLobbyUpdate(data);
        }
    }

    /**
     * Handle champion select session data
     */
    handleChampSelectSession(data) {
        if (!data) {
            this.currentSession = null;
            return;
        }

        const session = this.parseChampSelectSession(data);
        this.currentSession = session;

        if (this.onChampionSelectUpdate) {
            this.onChampionSelectUpdate(session);
        }
    }

    /**
     * Parse champion select session into usable format
     */
    parseChampSelectSession(data) {
        const session = {
            phase: data.timer?.phase || 'unknown',
            localPlayerCellId: data.localPlayerCellId,
            myTeam: [],
            theirTeam: [],
            bans: {
                myTeam: [],
                theirTeam: []
            },
            actions: []
        };

        // Parse my team
        if (data.myTeam && Array.isArray(data.myTeam)) {
            session.myTeam = data.myTeam.map(player => ({
                cellId: player.cellId,
                championId: player.championId || 0,
                championPickIntent: player.championPickIntent || 0,
                summonerId: player.summonerId,
                assignedPosition: player.assignedPosition || '',
                spell1Id: player.spell1Id,
                spell2Id: player.spell2Id
            }));
        }

        // Parse enemy team (if visible)
        if (data.theirTeam && Array.isArray(data.theirTeam)) {
            session.theirTeam = data.theirTeam.map(player => ({
                cellId: player.cellId,
                championId: player.championId || 0,
                championPickIntent: player.championPickIntent || 0
            }));
        }

        // Parse bans
        if (data.bans && data.bans.myTeamBans) {
            session.bans.myTeam = data.bans.myTeamBans.filter(id => id > 0);
        }
        if (data.bans && data.bans.theirTeamBans) {
            session.bans.theirTeam = data.bans.theirTeamBans.filter(id => id > 0);
        }

        // Parse actions (picks/bans in progress)
        if (data.actions && Array.isArray(data.actions)) {
            session.actions = data.actions.flat().map(action => ({
                actorCellId: action.actorCellId,
                championId: action.championId,
                completed: action.completed,
                isAllyAction: action.isAllyAction,
                type: action.type
            }));
        }

        return session;
    }

    /**
     * Handle game flow phase change
     */
    handleGameFlowPhase(phase) {
        if (phase !== this.currentPhase) {
            this.currentPhase = phase;

            if (this.onGamePhaseChange) {
                this.onGamePhaseChange(phase);
            }
        }
    }

    /**
     * Handle lobby updates
     */
    handleLobbyUpdate(data) {
        // Can be used for queue detection, etc.
        console.log('[LCU] Lobby update:', data?.gameConfig?.queueId);
    }

    /**
     * Start polling as backup for WebSocket
     */
    startPolling() {
        if (this.pollingInterval) {
            clearInterval(this.pollingInterval);
        }

        this.pollingInterval = setInterval(async () => {
            if (!this.credentials) return;

            try {
                // Poll game flow phase
                const phase = await this.makeRequest('/lol-gameflow/v1/gameflow-phase');
                if (phase) {
                    this.handleGameFlowPhase(phase);
                }

                // Poll champion select if in that phase
                if (this.currentPhase === 'ChampSelect') {
                    const session = await this.makeRequest('/lol-champ-select/v1/session');
                    if (session) {
                        this.handleChampSelectSession(session);
                    }
                }
            } catch (error) {
                // Silently fail polling - WebSocket may be handling it
            }
        }, 1000); // Poll every second
    }

    /**
     * Make HTTP request to LCU API
     */
    async makeRequest(endpoint, method = 'GET', body = null) {
        if (!this.credentials) return null;

        const { port, authToken, protocol } = this.credentials;
        const url = `${protocol}://127.0.0.1:${port}${endpoint}`;

        try {
            const response = await fetch(url, {
                method,
                headers: {
                    'Authorization': `Basic ${btoa(`riot:${authToken}`)}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: body ? JSON.stringify(body) : null
            });

            if (response.ok) {
                const text = await response.text();
                return text ? JSON.parse(text) : null;
            }
        } catch (error) {
            // Request failed - LCU may not be available
        }

        return null;
    }

    /**
     * Get current champion select session
     */
    async getCurrentChampSelectSession() {
        if (this.currentSession) {
            return this.currentSession;
        }

        return await this.makeRequest('/lol-champ-select/v1/session');
    }

    /**
     * Schedule reconnection attempt
     */
    scheduleReconnect() {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.log('[LCU] Max reconnection attempts reached');
            return;
        }

        this.reconnectAttempts++;
        const delay = this.reconnectDelay * this.reconnectAttempts;

        console.log(`[LCU] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);

        setTimeout(() => {
            this.connect();
        }, delay);
    }

    /**
     * Disconnect from LCU API
     */
    disconnect() {
        console.log('[LCU] Disconnecting from League Client');

        this.isConnected = false;
        this.credentials = null;
        this.currentSession = null;
        this.currentPhase = null;

        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }

        if (this.pollingInterval) {
            clearInterval(this.pollingInterval);
            this.pollingInterval = null;
        }

        if (this.onConnectionChange) {
            this.onConnectionChange(false);
        }
    }
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { LCUService };
}
