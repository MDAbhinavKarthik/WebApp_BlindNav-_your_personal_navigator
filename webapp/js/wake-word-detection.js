/**
 * BlindNav+ Wake-Word Detection Service
 * Continuous low-power listening for wake phrases
 * Enables hands-free activation while ignoring background speech
 */

class WakeWordDetectionService {
    constructor() {
        // Wake word state
        this.isActive = false;
        this.isAwake = false;
        this.lastWakeTime = 0;
        this.awakeTimeout = null;
        
        // Recognition instances
        this.wakeWordRecognition = null;
        this.commandRecognition = null;
        this.currentRecognition = null;
        
        // Audio context for confirmation tone
        this.audioContext = null;
        
        // Wake phrases (case-insensitive matching)
        this.wakePhrases = [
            'hey blindnav',
            'hey blind nav',
            'blindnav',
            'blind nav',
            'blindnav help',
            'blind nav help',
            'hey navigator',
            'ok blindnav',
            'okay blindnav',
            'hello blindnav'
        ];
        
        // Configuration
        this.config = {
            awakeTimeout: 15000,          // Stay awake for 15 seconds after wake word
            confirmationToneFrequency: 800,// Hz
            confirmationToneDuration: 150, // ms
            minWakeWordInterval: 2000,     // Minimum time between wake word triggers
            wakeWordConfidence: 0.6,       // Minimum confidence for wake word detection
            lowPowerMode: true,            // Use low-power continuous listening
            debugMode: false
        };
        
        // Callbacks
        this.onWakeWordDetected = null;
        this.onCommandReceived = null;
        this.onSleepMode = null;
        this.onListeningStateChange = null;
        this.onError = null;
        
        // Statistics
        this.stats = {
            wakeWordDetections: 0,
            commandsReceived: 0,
            falseWakes: 0,
            errors: 0
        };
        
        console.log('[WakeWord] Service initialized');
    }
    
    /**
     * Initialize the wake word detection system
     */
    async init() {
        try {
            // Initialize audio context for confirmation tones
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            
            // Check for speech recognition support
            if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
                throw new Error('Speech recognition not supported');
            }
            
            // Create wake word recognition (always listening)
            this.createWakeWordRecognition();
            
            // Create command recognition (active after wake word)
            this.createCommandRecognition();
            
            console.log('[WakeWord] Initialization complete');
            return true;
            
        } catch (error) {
            console.error('[WakeWord] Initialization error:', error);
            if (this.onError) this.onError('wake-word-init', error.message);
            return false;
        }
    }
    
    /**
     * Create wake word recognition instance (low-power continuous listening)
     */
    createWakeWordRecognition() {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        this.wakeWordRecognition = new SpeechRecognition();
        
        // Configure for continuous, low-power listening
        this.wakeWordRecognition.continuous = true;
        this.wakeWordRecognition.interimResults = true;
        this.wakeWordRecognition.maxAlternatives = 3;
        this.wakeWordRecognition.lang = 'en-US';
        
        this.wakeWordRecognition.onstart = () => {
            console.log('[WakeWord] Wake word listening started');
            this.notifyListeningStateChange('wake-word-listening');
        };
        
        this.wakeWordRecognition.onresult = (event) => {
            this.processWakeWordResult(event);
        };
        
        this.wakeWordRecognition.onerror = (event) => {
            this.handleRecognitionError('wake-word', event.error);
        };
        
        this.wakeWordRecognition.onend = () => {
            console.log('[WakeWord] Wake word listening ended');
            // Auto-restart if still active and not in awake mode
            if (this.isActive && !this.isAwake) {
                setTimeout(() => this.restartWakeWordListening(), 300);
            }
        };
    }
    
    /**
     * Create command recognition instance (active listening after wake)
     */
    createCommandRecognition() {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        this.commandRecognition = new SpeechRecognition();
        
        // Configure for active command listening
        this.commandRecognition.continuous = true;
        this.commandRecognition.interimResults = true;
        this.commandRecognition.maxAlternatives = 1;
        this.commandRecognition.lang = 'en-US';
        
        this.commandRecognition.onstart = () => {
            console.log('[WakeWord] Command listening started');
            this.notifyListeningStateChange('command-listening');
        };
        
        this.commandRecognition.onresult = (event) => {
            this.processCommandResult(event);
        };
        
        this.commandRecognition.onerror = (event) => {
            this.handleRecognitionError('command', event.error);
        };
        
        this.commandRecognition.onend = () => {
            console.log('[WakeWord] Command listening ended');
            // Return to wake word listening if still awake
            if (this.isActive && this.isAwake) {
                // Continue listening for commands while awake
                setTimeout(() => {
                    if (this.isActive && this.isAwake) {
                        this.startCommandListening();
                    }
                }, 100);
            } else if (this.isActive) {
                // Return to wake word listening
                this.startWakeWordListening();
            }
        };
    }
    
    /**
     * Start the wake word detection service
     */
    start() {
        if (this.isActive) {
            console.log('[WakeWord] Already active');
            return;
        }
        
        this.isActive = true;
        this.isAwake = false;
        
        console.log('[WakeWord] Service started - listening for wake word');
        this.startWakeWordListening();
    }
    
    /**
     * Stop the wake word detection service
     */
    stop() {
        this.isActive = false;
        this.isAwake = false;
        
        if (this.awakeTimeout) {
            clearTimeout(this.awakeTimeout);
            this.awakeTimeout = null;
        }
        
        this.stopAllRecognition();
        console.log('[WakeWord] Service stopped');
    }
    
    /**
     * Start wake word listening mode
     */
    startWakeWordListening() {
        if (!this.isActive) return;
        
        this.stopAllRecognition();
        
        try {
            this.wakeWordRecognition.start();
            this.currentRecognition = 'wake-word';
        } catch (error) {
            console.error('[WakeWord] Failed to start wake word listening:', error);
            // Retry after delay
            setTimeout(() => this.restartWakeWordListening(), 1000);
        }
    }
    
    /**
     * Start command listening mode (after wake word detected)
     */
    startCommandListening() {
        if (!this.isActive || !this.isAwake) return;
        
        this.stopAllRecognition();
        
        try {
            this.commandRecognition.start();
            this.currentRecognition = 'command';
        } catch (error) {
            console.error('[WakeWord] Failed to start command listening:', error);
        }
    }
    
    /**
     * Restart wake word listening
     */
    restartWakeWordListening() {
        if (this.isActive && !this.isAwake) {
            this.startWakeWordListening();
        }
    }
    
    /**
     * Stop all recognition instances
     */
    stopAllRecognition() {
        try {
            this.wakeWordRecognition?.stop();
        } catch (e) { /* ignore */ }
        
        try {
            this.commandRecognition?.stop();
        } catch (e) { /* ignore */ }
        
        this.currentRecognition = null;
    }
    
    /**
     * Process wake word recognition results
     */
    processWakeWordResult(event) {
        const results = event.results;
        
        for (let i = event.resultIndex; i < results.length; i++) {
            const result = results[i];
            const transcript = result[0].transcript.toLowerCase().trim();
            const confidence = result[0].confidence;
            
            if (this.config.debugMode) {
                console.log(`[WakeWord] Heard: "${transcript}" (${(confidence * 100).toFixed(1)}%)`);
            }
            
            // Check for wake phrases
            if (this.containsWakePhrase(transcript)) {
                // Check minimum interval to prevent rapid triggering
                const now = Date.now();
                if (now - this.lastWakeTime < this.config.minWakeWordInterval) {
                    continue;
                }
                
                this.lastWakeTime = now;
                this.triggerWakeWord(transcript);
                return;
            }
        }
    }
    
    /**
     * Process command recognition results
     */
    processCommandResult(event) {
        const results = event.results;
        const lastResult = results[results.length - 1];
        
        if (lastResult.isFinal) {
            const transcript = lastResult[0].transcript.trim();
            
            console.log('[WakeWord] Command received:', transcript);
            this.stats.commandsReceived++;
            
            // Reset awake timeout
            this.resetAwakeTimeout();
            
            // Check if it's another wake word (extend awake time)
            if (this.containsWakePhrase(transcript.toLowerCase())) {
                // Just extend awake time, don't process as command
                return;
            }
            
            // Deliver command to callback
            if (this.onCommandReceived) {
                this.onCommandReceived(transcript);
            }
        }
    }
    
    /**
     * Check if transcript contains a wake phrase
     */
    containsWakePhrase(transcript) {
        const normalizedTranscript = transcript.toLowerCase()
            .replace(/[.,!?]/g, '')
            .trim();
        
        for (const phrase of this.wakePhrases) {
            // Check for exact match or phrase at start/end of transcript
            if (normalizedTranscript === phrase ||
                normalizedTranscript.startsWith(phrase) ||
                normalizedTranscript.endsWith(phrase) ||
                normalizedTranscript.includes(phrase)) {
                return true;
            }
        }
        
        return false;
    }
    
    /**
     * Trigger wake word detection
     */
    async triggerWakeWord(transcript) {
        console.log('[WakeWord] Wake word detected:', transcript);
        this.stats.wakeWordDetections++;
        
        // Stop wake word listening
        this.stopAllRecognition();
        
        // Enter awake mode
        this.isAwake = true;
        
        // Play confirmation tone
        await this.playConfirmationTone();
        
        // Notify callback
        if (this.onWakeWordDetected) {
            this.onWakeWordDetected(transcript);
        }
        
        // Set timeout to return to sleep
        this.resetAwakeTimeout();
        
        // Start command listening
        setTimeout(() => {
            if (this.isActive && this.isAwake) {
                this.startCommandListening();
            }
        }, 500);
    }
    
    /**
     * Reset the awake timeout
     */
    resetAwakeTimeout() {
        if (this.awakeTimeout) {
            clearTimeout(this.awakeTimeout);
        }
        
        this.awakeTimeout = setTimeout(() => {
            this.enterSleepMode();
        }, this.config.awakeTimeout);
    }
    
    /**
     * Enter sleep mode (return to wake word listening)
     */
    enterSleepMode() {
        if (!this.isAwake) return;
        
        console.log('[WakeWord] Entering sleep mode');
        this.isAwake = false;
        
        if (this.awakeTimeout) {
            clearTimeout(this.awakeTimeout);
            this.awakeTimeout = null;
        }
        
        // Notify callback
        if (this.onSleepMode) {
            this.onSleepMode();
        }
        
        // Return to wake word listening
        if (this.isActive) {
            this.startWakeWordListening();
        }
    }
    
    /**
     * Force wake (for UI activation)
     */
    forceWake() {
        if (!this.isActive) return;
        
        this.stopAllRecognition();
        this.isAwake = true;
        
        this.playConfirmationTone();
        this.resetAwakeTimeout();
        
        setTimeout(() => {
            if (this.isActive && this.isAwake) {
                this.startCommandListening();
            }
        }, 300);
        
        if (this.onWakeWordDetected) {
            this.onWakeWordDetected('manual-wake');
        }
    }
    
    /**
     * Extend awake time (for ongoing conversation)
     */
    extendAwakeTime(additionalMs = 10000) {
        if (this.isAwake) {
            clearTimeout(this.awakeTimeout);
            this.awakeTimeout = setTimeout(() => {
                this.enterSleepMode();
            }, this.config.awakeTimeout + additionalMs);
        }
    }
    
    /**
     * Keep awake indefinitely (for active mode)
     */
    keepAwake() {
        if (this.awakeTimeout) {
            clearTimeout(this.awakeTimeout);
            this.awakeTimeout = null;
        }
        this.isAwake = true;
    }
    
    /**
     * Play confirmation tone
     */
    async playConfirmationTone() {
        if (!this.audioContext) return;
        
        try {
            // Resume audio context if suspended
            if (this.audioContext.state === 'suspended') {
                await this.audioContext.resume();
            }
            
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            // Confirmation tone: rising pitch
            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(
                this.config.confirmationToneFrequency,
                this.audioContext.currentTime
            );
            oscillator.frequency.linearRampToValueAtTime(
                this.config.confirmationToneFrequency * 1.5,
                this.audioContext.currentTime + this.config.confirmationToneDuration / 1000
            );
            
            gainNode.gain.setValueAtTime(0.3, this.audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(
                0.01,
                this.audioContext.currentTime + this.config.confirmationToneDuration / 1000
            );
            
            oscillator.start(this.audioContext.currentTime);
            oscillator.stop(this.audioContext.currentTime + this.config.confirmationToneDuration / 1000);
            
        } catch (error) {
            console.error('[WakeWord] Failed to play confirmation tone:', error);
        }
    }
    
    /**
     * Play sleep tone (when entering sleep mode)
     */
    async playSleepTone() {
        if (!this.audioContext) return;
        
        try {
            if (this.audioContext.state === 'suspended') {
                await this.audioContext.resume();
            }
            
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            // Sleep tone: falling pitch
            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(600, this.audioContext.currentTime);
            oscillator.frequency.linearRampToValueAtTime(400, this.audioContext.currentTime + 0.2);
            
            gainNode.gain.setValueAtTime(0.2, this.audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.2);
            
            oscillator.start(this.audioContext.currentTime);
            oscillator.stop(this.audioContext.currentTime + 0.2);
            
        } catch (error) {
            console.error('[WakeWord] Failed to play sleep tone:', error);
        }
    }
    
    /**
     * Handle recognition errors
     */
    handleRecognitionError(type, error) {
        console.error(`[WakeWord] ${type} recognition error:`, error);
        this.stats.errors++;
        
        // Handle specific errors
        switch (error) {
            case 'not-allowed':
            case 'service-not-allowed':
                if (this.onError) {
                    this.onError('permission-denied', 'Microphone permission denied');
                }
                this.stop();
                break;
                
            case 'no-speech':
                // Normal, just restart
                if (this.isActive) {
                    if (this.isAwake) {
                        this.startCommandListening();
                    } else {
                        this.restartWakeWordListening();
                    }
                }
                break;
                
            case 'audio-capture':
                if (this.onError) {
                    this.onError('microphone-error', 'Microphone not available');
                }
                break;
                
            case 'network':
                if (this.onError) {
                    this.onError('network-error', 'Network connection required');
                }
                // Retry after delay
                setTimeout(() => {
                    if (this.isActive) {
                        this.startWakeWordListening();
                    }
                }, 2000);
                break;
                
            default:
                // Restart on other errors
                setTimeout(() => {
                    if (this.isActive) {
                        if (this.isAwake) {
                            this.startCommandListening();
                        } else {
                            this.startWakeWordListening();
                        }
                    }
                }, 1000);
        }
    }
    
    /**
     * Notify listening state change
     */
    notifyListeningStateChange(state) {
        if (this.onListeningStateChange) {
            this.onListeningStateChange(state, this.isAwake);
        }
    }
    
    /**
     * Add custom wake phrase
     */
    addWakePhrase(phrase) {
        const normalized = phrase.toLowerCase().trim();
        if (!this.wakePhrases.includes(normalized)) {
            this.wakePhrases.push(normalized);
            console.log('[WakeWord] Added wake phrase:', normalized);
        }
    }
    
    /**
     * Remove wake phrase
     */
    removeWakePhrase(phrase) {
        const normalized = phrase.toLowerCase().trim();
        const index = this.wakePhrases.indexOf(normalized);
        if (index > -1) {
            this.wakePhrases.splice(index, 1);
            console.log('[WakeWord] Removed wake phrase:', normalized);
        }
    }
    
    /**
     * Get current state
     */
    getState() {
        return {
            isActive: this.isActive,
            isAwake: this.isAwake,
            currentRecognition: this.currentRecognition,
            stats: { ...this.stats }
        };
    }
    
    /**
     * Update configuration
     */
    updateConfig(newConfig) {
        Object.assign(this.config, newConfig);
        console.log('[WakeWord] Config updated:', this.config);
    }
}

// Export singleton instance
const wakeWordService = new WakeWordDetectionService();
