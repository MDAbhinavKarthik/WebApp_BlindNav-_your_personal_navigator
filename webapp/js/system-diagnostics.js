/**
 * BlindNav+ System Diagnostics Service
 * Comprehensive system monitoring for reliability and safety
 * - Boot checks, Battery monitoring, Camera status, Internet connectivity
 * - Parallel diagnostics, Continuous background monitoring
 */

class SystemDiagnostics {
    constructor() {
        // System status
        this.status = {
            battery: {
                level: null,
                charging: false,
                chargingTime: null,
                dischargingTime: null,
                supported: false,
                lastUpdate: null,
                critical: false,
                low: false
            },
            camera: {
                available: false,
                active: false,
                permission: 'unknown', // unknown, granted, denied, prompt
                error: null,
                lastCheck: null
            },
            internet: {
                online: navigator.onLine,
                type: null, // wifi, cellular, ethernet, unknown
                downlink: null, // Mbps
                rtt: null, // Round trip time in ms
                effectiveType: null, // slow-2g, 2g, 3g, 4g
                lastCheck: null
            },
            speech: {
                recognition: false,
                synthesis: false,
                lastCheck: null
            },
            geolocation: {
                available: false,
                permission: 'unknown',
                lastCheck: null
            },
            storage: {
                available: false,
                quota: null,
                usage: null,
                lastCheck: null
            },
            system: {
                bootComplete: false,
                bootTime: null,
                lastDiagnostic: null,
                errors: [],
                warnings: []
            }
        };

        // Monitoring intervals
        this.intervals = {
            battery: null,
            internet: null,
            camera: null,
            diagnostic: null
        };

        // Thresholds
        this.thresholds = {
            batteryCritical: 10,    // Below 10% = critical
            batteryLow: 20,         // Below 20% = low warning
            batteryWarning: 30,     // Below 30% = warning
            internetSlowRTT: 500,   // RTT > 500ms = slow
            internetPoorDownlink: 1 // < 1 Mbps = poor
        };

        // Event listeners
        this.listeners = new Map();

        // Monitoring state
        this.isMonitoring = false;
        this.bootCheckComplete = false;
    }

    /**
     * Initialize system diagnostics
     * Runs comprehensive boot checks
     */
    async initialize() {
        console.log('[SystemDiagnostics] Initializing...');
        this.status.system.bootTime = Date.now();
        
        try {
            // Run parallel boot checks
            const bootResults = await this.runBootChecks();
            
            this.status.system.bootComplete = true;
            this.bootCheckComplete = true;
            
            // Start continuous monitoring
            this.startContinuousMonitoring();
            
            // Setup event listeners
            this.setupEventListeners();
            
            console.log('[SystemDiagnostics] Boot complete:', bootResults);
            return bootResults;
        } catch (error) {
            console.error('[SystemDiagnostics] Boot error:', error);
            this.status.system.errors.push({
                type: 'boot',
                message: error.message,
                timestamp: Date.now()
            });
            throw error;
        }
    }

    /**
     * Run all boot checks in parallel
     */
    async runBootChecks() {
        console.log('[SystemDiagnostics] Running parallel boot checks...');
        
        const checks = await Promise.allSettled([
            this.checkBattery(),
            this.checkCamera(),
            this.checkInternet(),
            this.checkSpeech(),
            this.checkGeolocation(),
            this.checkStorage()
        ]);

        const results = {
            battery: checks[0].status === 'fulfilled' ? checks[0].value : { error: checks[0].reason },
            camera: checks[1].status === 'fulfilled' ? checks[1].value : { error: checks[1].reason },
            internet: checks[2].status === 'fulfilled' ? checks[2].value : { error: checks[2].reason },
            speech: checks[3].status === 'fulfilled' ? checks[3].value : { error: checks[3].reason },
            geolocation: checks[4].status === 'fulfilled' ? checks[4].value : { error: checks[4].reason },
            storage: checks[5].status === 'fulfilled' ? checks[5].value : { error: checks[5].reason }
        };

        // Compile warnings and errors
        this.compileBootReport(results);

        return results;
    }

    /**
     * Check battery status
     */
    async checkBattery() {
        this.status.battery.lastUpdate = Date.now();

        try {
            if ('getBattery' in navigator) {
                const battery = await navigator.getBattery();
                
                this.status.battery.supported = true;
                this.status.battery.level = Math.round(battery.level * 100);
                this.status.battery.charging = battery.charging;
                this.status.battery.chargingTime = battery.chargingTime;
                this.status.battery.dischargingTime = battery.dischargingTime;
                
                // Check thresholds
                this.status.battery.critical = this.status.battery.level <= this.thresholds.batteryCritical;
                this.status.battery.low = this.status.battery.level <= this.thresholds.batteryLow;

                return {
                    supported: true,
                    level: this.status.battery.level,
                    charging: this.status.battery.charging,
                    critical: this.status.battery.critical,
                    low: this.status.battery.low
                };
            } else {
                this.status.battery.supported = false;
                return { supported: false, message: 'Battery API not supported' };
            }
        } catch (error) {
            console.error('[SystemDiagnostics] Battery check error:', error);
            return { supported: false, error: error.message };
        }
    }

    /**
     * Check camera availability and permission
     */
    async checkCamera() {
        this.status.camera.lastCheck = Date.now();

        try {
            // Check if MediaDevices API is available
            if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
                this.status.camera.available = false;
                return { available: false, message: 'MediaDevices API not supported' };
            }

            // Check for camera devices
            const devices = await navigator.mediaDevices.enumerateDevices();
            const cameras = devices.filter(d => d.kind === 'videoinput');
            
            this.status.camera.available = cameras.length > 0;

            // Check permission status
            if ('permissions' in navigator) {
                try {
                    const permissionStatus = await navigator.permissions.query({ name: 'camera' });
                    this.status.camera.permission = permissionStatus.state;
                } catch (e) {
                    // Permissions API might not support camera
                    this.status.camera.permission = 'unknown';
                }
            }

            return {
                available: this.status.camera.available,
                count: cameras.length,
                permission: this.status.camera.permission
            };
        } catch (error) {
            console.error('[SystemDiagnostics] Camera check error:', error);
            this.status.camera.error = error.message;
            return { available: false, error: error.message };
        }
    }

    /**
     * Check internet connectivity
     */
    async checkInternet() {
        this.status.internet.lastCheck = Date.now();
        this.status.internet.online = navigator.onLine;

        try {
            // Network Information API
            if ('connection' in navigator) {
                const conn = navigator.connection;
                this.status.internet.type = conn.type || 'unknown';
                this.status.internet.downlink = conn.downlink;
                this.status.internet.rtt = conn.rtt;
                this.status.internet.effectiveType = conn.effectiveType;
            }

            // Perform actual connectivity test
            let actuallyOnline = false;
            if (navigator.onLine) {
                try {
                    // Try to fetch a small resource with cache-busting
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), 5000);
                    
                    const response = await fetch('https://www.google.com/generate_204', {
                        method: 'HEAD',
                        mode: 'no-cors',
                        cache: 'no-store',
                        signal: controller.signal
                    });
                    
                    clearTimeout(timeoutId);
                    actuallyOnline = true;
                } catch (e) {
                    // May fail due to CORS but if navigator.onLine is true, we assume online
                    actuallyOnline = navigator.onLine;
                }
            }

            return {
                online: this.status.internet.online,
                actuallyOnline,
                type: this.status.internet.type,
                downlink: this.status.internet.downlink,
                effectiveType: this.status.internet.effectiveType,
                rtt: this.status.internet.rtt
            };
        } catch (error) {
            console.error('[SystemDiagnostics] Internet check error:', error);
            return { online: navigator.onLine, error: error.message };
        }
    }

    /**
     * Check speech capabilities
     */
    async checkSpeech() {
        this.status.speech.lastCheck = Date.now();

        // Check speech recognition
        this.status.speech.recognition = 'SpeechRecognition' in window || 
                                          'webkitSpeechRecognition' in window;

        // Check speech synthesis
        this.status.speech.synthesis = 'speechSynthesis' in window;

        return {
            recognition: this.status.speech.recognition,
            synthesis: this.status.speech.synthesis
        };
    }

    /**
     * Check geolocation availability
     */
    async checkGeolocation() {
        this.status.geolocation.lastCheck = Date.now();

        try {
            if (!('geolocation' in navigator)) {
                this.status.geolocation.available = false;
                return { available: false, message: 'Geolocation not supported' };
            }

            this.status.geolocation.available = true;

            // Check permission
            if ('permissions' in navigator) {
                try {
                    const permissionStatus = await navigator.permissions.query({ name: 'geolocation' });
                    this.status.geolocation.permission = permissionStatus.state;
                } catch (e) {
                    this.status.geolocation.permission = 'unknown';
                }
            }

            return {
                available: true,
                permission: this.status.geolocation.permission
            };
        } catch (error) {
            console.error('[SystemDiagnostics] Geolocation check error:', error);
            return { available: false, error: error.message };
        }
    }

    /**
     * Check storage availability
     */
    async checkStorage() {
        this.status.storage.lastCheck = Date.now();

        try {
            if ('storage' in navigator && 'estimate' in navigator.storage) {
                const estimate = await navigator.storage.estimate();
                this.status.storage.available = true;
                this.status.storage.quota = estimate.quota;
                this.status.storage.usage = estimate.usage;

                return {
                    available: true,
                    quota: this.formatBytes(estimate.quota),
                    usage: this.formatBytes(estimate.usage),
                    percentUsed: Math.round((estimate.usage / estimate.quota) * 100)
                };
            }

            // Fallback to localStorage check
            try {
                localStorage.setItem('test', 'test');
                localStorage.removeItem('test');
                this.status.storage.available = true;
                return { available: true, type: 'localStorage' };
            } catch (e) {
                this.status.storage.available = false;
                return { available: false, message: 'Storage not available' };
            }
        } catch (error) {
            console.error('[SystemDiagnostics] Storage check error:', error);
            return { available: false, error: error.message };
        }
    }

    /**
     * Compile boot report with warnings and errors
     */
    compileBootReport(results) {
        // Clear previous
        this.status.system.warnings = [];
        this.status.system.errors = [];

        // Check battery
        if (results.battery.critical) {
            this.status.system.errors.push({
                type: 'battery',
                message: `Critical battery level: ${results.battery.level}%`,
                timestamp: Date.now()
            });
        } else if (results.battery.low) {
            this.status.system.warnings.push({
                type: 'battery',
                message: `Low battery level: ${results.battery.level}%`,
                timestamp: Date.now()
            });
        }

        // Check camera
        if (!results.camera.available) {
            this.status.system.warnings.push({
                type: 'camera',
                message: 'Camera not available',
                timestamp: Date.now()
            });
        } else if (results.camera.permission === 'denied') {
            this.status.system.errors.push({
                type: 'camera',
                message: 'Camera permission denied',
                timestamp: Date.now()
            });
        }

        // Check internet
        if (!results.internet.online) {
            this.status.system.warnings.push({
                type: 'internet',
                message: 'No internet connection',
                timestamp: Date.now()
            });
        } else if (results.internet.effectiveType === 'slow-2g' || results.internet.effectiveType === '2g') {
            this.status.system.warnings.push({
                type: 'internet',
                message: 'Very slow internet connection',
                timestamp: Date.now()
            });
        }

        // Check speech
        if (!results.speech.recognition) {
            this.status.system.warnings.push({
                type: 'speech',
                message: 'Speech recognition not supported',
                timestamp: Date.now()
            });
        }
        if (!results.speech.synthesis) {
            this.status.system.warnings.push({
                type: 'speech',
                message: 'Speech synthesis not supported',
                timestamp: Date.now()
            });
        }

        // Check geolocation
        if (!results.geolocation.available) {
            this.status.system.warnings.push({
                type: 'geolocation',
                message: 'Geolocation not available',
                timestamp: Date.now()
            });
        } else if (results.geolocation.permission === 'denied') {
            this.status.system.warnings.push({
                type: 'geolocation',
                message: 'Geolocation permission denied',
                timestamp: Date.now()
            });
        }
    }

    /**
     * Setup event listeners for real-time monitoring
     */
    setupEventListeners() {
        // Online/Offline events
        window.addEventListener('online', () => {
            this.status.internet.online = true;
            this.emit('internet', { online: true });
            console.log('[SystemDiagnostics] Internet connected');
        });

        window.addEventListener('offline', () => {
            this.status.internet.online = false;
            this.emit('internet', { online: false });
            this.emit('warning', { type: 'internet', message: 'Internet disconnected' });
            console.log('[SystemDiagnostics] Internet disconnected');
        });

        // Network change events
        if ('connection' in navigator) {
            navigator.connection.addEventListener('change', () => {
                this.checkInternet();
                this.emit('internet', this.status.internet);
            });
        }

        // Battery events
        this.setupBatteryListeners();

        // Visibility change (app background/foreground)
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') {
                // Run quick diagnostic when app returns to foreground
                this.runQuickDiagnostic();
            }
        });
    }

    /**
     * Setup battery-specific listeners
     */
    async setupBatteryListeners() {
        if (!('getBattery' in navigator)) return;

        try {
            const battery = await navigator.getBattery();

            battery.addEventListener('levelchange', () => {
                const level = Math.round(battery.level * 100);
                const wasCritical = this.status.battery.critical;
                const wasLow = this.status.battery.low;

                this.status.battery.level = level;
                this.status.battery.critical = level <= this.thresholds.batteryCritical;
                this.status.battery.low = level <= this.thresholds.batteryLow;
                this.status.battery.lastUpdate = Date.now();

                // Emit events for threshold crossings
                if (this.status.battery.critical && !wasCritical) {
                    this.emit('critical', { 
                        type: 'battery', 
                        message: `CRITICAL: Battery at ${level}%`,
                        level 
                    });
                } else if (this.status.battery.low && !wasLow) {
                    this.emit('warning', { 
                        type: 'battery', 
                        message: `Low battery: ${level}%`,
                        level 
                    });
                }

                this.emit('battery', { level, charging: battery.charging });
            });

            battery.addEventListener('chargingchange', () => {
                this.status.battery.charging = battery.charging;
                this.status.battery.lastUpdate = Date.now();
                this.emit('battery', { 
                    level: this.status.battery.level, 
                    charging: battery.charging 
                });
                console.log('[SystemDiagnostics] Charging:', battery.charging);
            });
        } catch (error) {
            console.error('[SystemDiagnostics] Battery listener setup error:', error);
        }
    }

    /**
     * Start continuous background monitoring
     */
    startContinuousMonitoring() {
        if (this.isMonitoring) return;
        this.isMonitoring = true;

        // Battery monitoring - every 60 seconds
        this.intervals.battery = setInterval(() => {
            this.checkBattery().then(status => {
                if (status.critical || status.low) {
                    this.emit('battery', status);
                }
            });
        }, 60000);

        // Internet monitoring - every 30 seconds
        this.intervals.internet = setInterval(() => {
            this.checkInternet().then(status => {
                if (!status.online) {
                    this.emit('warning', { type: 'internet', message: 'Internet connection lost' });
                }
            });
        }, 30000);

        // Full diagnostic - every 5 minutes
        this.intervals.diagnostic = setInterval(() => {
            this.runQuickDiagnostic();
        }, 300000);

        console.log('[SystemDiagnostics] Continuous monitoring started');
    }

    /**
     * Stop continuous monitoring
     */
    stopContinuousMonitoring() {
        this.isMonitoring = false;

        Object.keys(this.intervals).forEach(key => {
            if (this.intervals[key]) {
                clearInterval(this.intervals[key]);
                this.intervals[key] = null;
            }
        });

        console.log('[SystemDiagnostics] Continuous monitoring stopped');
    }

    /**
     * Run quick diagnostic check
     */
    async runQuickDiagnostic() {
        console.log('[SystemDiagnostics] Running quick diagnostic...');
        
        const results = await Promise.allSettled([
            this.checkBattery(),
            this.checkInternet()
        ]);

        this.status.system.lastDiagnostic = Date.now();

        const battery = results[0].status === 'fulfilled' ? results[0].value : null;
        const internet = results[1].status === 'fulfilled' ? results[1].value : null;

        // Emit critical issues
        if (battery?.critical) {
            this.emit('critical', { 
                type: 'battery', 
                message: `CRITICAL: Battery at ${battery.level}%` 
            });
        }
        if (!internet?.online) {
            this.emit('warning', { 
                type: 'internet', 
                message: 'No internet connection' 
            });
        }

        return { battery, internet };
    }

    /**
     * Get full system status
     */
    getFullStatus() {
        return {
            ...this.status,
            uptime: Date.now() - this.status.system.bootTime,
            isMonitoring: this.isMonitoring
        };
    }

    /**
     * Get status summary for voice output
     */
    getStatusSummary() {
        const parts = [];

        // Battery
        if (this.status.battery.supported) {
            const batteryMsg = this.status.battery.charging 
                ? `Battery at ${this.status.battery.level}%, charging`
                : `Battery at ${this.status.battery.level}%`;
            
            if (this.status.battery.critical) {
                parts.push(`CRITICAL: ${batteryMsg}. Charge immediately!`);
            } else if (this.status.battery.low) {
                parts.push(`Warning: ${batteryMsg}. Consider charging soon.`);
            } else {
                parts.push(batteryMsg);
            }
        }

        // Internet
        if (this.status.internet.online) {
            const speedInfo = this.status.internet.effectiveType 
                ? ` (${this.status.internet.effectiveType})` 
                : '';
            parts.push(`Internet connected${speedInfo}`);
        } else {
            parts.push('Warning: No internet connection');
        }

        // Camera
        if (this.status.camera.available) {
            if (this.status.camera.permission === 'granted') {
                parts.push('Camera ready');
            } else if (this.status.camera.permission === 'denied') {
                parts.push('Camera permission denied');
            } else {
                parts.push('Camera available');
            }
        } else {
            parts.push('Camera not available');
        }

        // Speech
        if (this.status.speech.recognition && this.status.speech.synthesis) {
            parts.push('Voice features ready');
        } else {
            if (!this.status.speech.recognition) {
                parts.push('Voice recognition not available');
            }
            if (!this.status.speech.synthesis) {
                parts.push('Voice output not available');
            }
        }

        return parts.join('. ') + '.';
    }

    /**
     * Get critical alerts
     */
    getCriticalAlerts() {
        const alerts = [];

        if (this.status.battery.critical) {
            alerts.push({
                type: 'battery',
                severity: 'critical',
                message: `Battery critically low at ${this.status.battery.level}%`
            });
        }

        if (!this.status.internet.online) {
            alerts.push({
                type: 'internet',
                severity: 'warning',
                message: 'No internet connection'
            });
        }

        if (this.status.camera.permission === 'denied') {
            alerts.push({
                type: 'camera',
                severity: 'warning',
                message: 'Camera access denied'
            });
        }

        return alerts;
    }

    /**
     * Check if system is ready for emergency use
     */
    isEmergencyReady() {
        const ready = {
            overall: true,
            issues: []
        };

        // Battery check
        if (this.status.battery.supported && this.status.battery.level < 5) {
            ready.overall = false;
            ready.issues.push('Battery critically low');
        }

        // Internet for emergency services
        if (!this.status.internet.online) {
            ready.issues.push('No internet - online services unavailable');
        }

        // Geolocation for emergency location
        if (!this.status.geolocation.available || 
            this.status.geolocation.permission === 'denied') {
            ready.issues.push('Location unavailable - emergency services cannot pinpoint you');
        }

        // Voice for communication
        if (!this.status.speech.synthesis) {
            ready.issues.push('Voice output unavailable');
        }

        return ready;
    }

    /**
     * Event emitter functionality
     */
    on(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        this.listeners.get(event).push(callback);
    }

    off(event, callback) {
        if (this.listeners.has(event)) {
            const callbacks = this.listeners.get(event);
            const index = callbacks.indexOf(callback);
            if (index > -1) {
                callbacks.splice(index, 1);
            }
        }
    }

    emit(event, data) {
        if (this.listeners.has(event)) {
            this.listeners.get(event).forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error('[SystemDiagnostics] Event callback error:', error);
                }
            });
        }
    }

    /**
     * Format bytes to human readable
     */
    formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    /**
     * Announce system status via speech
     */
    announceStatus() {
        if (typeof speechManager !== 'undefined') {
            speechManager.speak(this.getStatusSummary(), true);
        }
    }

    /**
     * Check camera stream health
     */
    async checkCameraHealth() {
        if (typeof cameraManager === 'undefined') {
            return { healthy: false, message: 'Camera manager not available' };
        }

        try {
            // Check if camera is active
            const isStreaming = cameraManager.stream && 
                               cameraManager.stream.active &&
                               cameraManager.stream.getVideoTracks().length > 0;

            if (!isStreaming) {
                return { healthy: false, message: 'Camera stream not active' };
            }

            // Check video track state
            const videoTrack = cameraManager.stream.getVideoTracks()[0];
            if (videoTrack.readyState !== 'live') {
                return { 
                    healthy: false, 
                    message: `Camera track in ${videoTrack.readyState} state` 
                };
            }

            this.status.camera.active = true;
            return { healthy: true, message: 'Camera stream healthy' };
        } catch (error) {
            return { healthy: false, error: error.message };
        }
    }

    /**
     * Get estimated remaining battery time
     */
    async getRemainingBatteryTime() {
        if (!this.status.battery.supported) {
            return null;
        }

        try {
            const battery = await navigator.getBattery();
            
            if (battery.charging) {
                const chargingTime = battery.chargingTime;
                if (chargingTime === Infinity) {
                    return { charging: true, time: 'Unknown' };
                }
                const minutes = Math.round(chargingTime / 60);
                return { 
                    charging: true, 
                    time: minutes > 60 
                        ? `${Math.floor(minutes / 60)} hours ${minutes % 60} minutes`
                        : `${minutes} minutes`
                };
            } else {
                const dischargingTime = battery.dischargingTime;
                if (dischargingTime === Infinity) {
                    return { charging: false, time: 'Unknown' };
                }
                const minutes = Math.round(dischargingTime / 60);
                return { 
                    charging: false, 
                    time: minutes > 60 
                        ? `${Math.floor(minutes / 60)} hours ${minutes % 60} minutes`
                        : `${minutes} minutes`
                };
            }
        } catch (error) {
            return null;
        }
    }
}

// Create and export global instance
const systemDiagnostics = new SystemDiagnostics();

// Auto-initialize on DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        systemDiagnostics.initialize().catch(console.error);
    });
} else {
    systemDiagnostics.initialize().catch(console.error);
}
