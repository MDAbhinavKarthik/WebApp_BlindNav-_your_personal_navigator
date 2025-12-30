/**
 * BlindNav+ Voice-UI Hybrid Controller
 * Manages seamless switching between voice and UI modes
 * Coordinates wake-word detection, conversation flow, and UI fallback
 */

class VoiceUIHybridController {
    constructor() {
        // Current interaction mode
        this.currentMode = 'voice';  // 'voice', 'ui', 'hybrid'
        this.previousMode = null;
        
        // Component references
        this.wakeWordService = null;
        this.conversationFlow = null;
        this.uiFallback = null;
        this.speechManager = null;
        
        // State tracking
        this.state = {
            isInitialized: false,
            wakeWordActive: false,
            voiceListening: false,
            uiFallbackActive: false,
            currentAppMode: null,
            lastInteraction: Date.now(),
            interactionSource: null  // 'voice', 'ui', 'wake-word'
        };
        
        // Configuration
        this.config = {
            announceModeSwitches: true,
            preferVoice: true,
            autoRetryVoice: true,
            voiceTimeoutMs: 30000,
            hybridModeEnabled: true
        };
        
        // Callbacks
        this.onModeSwitch = null;
        this.onVoiceCommand = null;
        this.onUIAction = null;
        this.onError = null;
        
        console.log('[HybridController] Initialized');
    }
    
    /**
     * Initialize the hybrid controller with all components
     */
    async init() {
        console.log('[HybridController] Starting initialization...');
        
        try {
            // Get references to services
            if (typeof wakeWordService !== 'undefined') {
                this.wakeWordService = wakeWordService;
            }
            if (typeof conversationFlowManager !== 'undefined') {
                this.conversationFlow = conversationFlowManager;
            }
            if (typeof uiFallbackSystem !== 'undefined') {
                this.uiFallback = uiFallbackSystem;
            }
            if (typeof speechManager !== 'undefined') {
                this.speechManager = speechManager;
            }
            
            // Initialize wake word service
            if (this.wakeWordService) {
                await this.wakeWordService.init();
                this.setupWakeWordCallbacks();
            }
            
            // Initialize UI fallback system
            if (this.uiFallback) {
                this.uiFallback.init();
                this.setupUIFallbackCallbacks();
            }
            
            // Setup conversation flow callbacks
            if (this.conversationFlow) {
                this.setupConversationFlowCallbacks();
            }
            
            // Setup speech manager integration
            if (this.speechManager) {
                this.setupSpeechManagerIntegration();
            }
            
            this.state.isInitialized = true;
            console.log('[HybridController] Initialization complete');
            
            return true;
            
        } catch (error) {
            console.error('[HybridController] Initialization failed:', error);
            if (this.onError) {
                this.onError('init_failed', error.message);
            }
            return false;
        }
    }
    
    /**
     * Start the hybrid controller
     */
    start() {
        if (!this.state.isInitialized) {
            console.error('[HybridController] Not initialized');
            return false;
        }
        
        console.log('[HybridController] Starting in voice mode');
        
        // Start with voice mode (wake word listening)
        this.switchToVoiceMode();
        
        return true;
    }
    
    /**
     * Stop the hybrid controller
     */
    stop() {
        this.wakeWordService?.stop();
        this.uiFallback?.deactivate('controller_stopped');
        this.conversationFlow?.cancelCurrentFlow(false);
        
        console.log('[HybridController] Stopped');
    }
    
    /**
     * Setup wake word service callbacks
     */
    setupWakeWordCallbacks() {
        this.wakeWordService.onWakeWordDetected = (transcript) => {
            console.log('[HybridController] Wake word detected');
            this.handleWakeWord(transcript);
        };
        
        this.wakeWordService.onCommandReceived = (transcript) => {
            console.log('[HybridController] Command received:', transcript);
            this.handleVoiceCommand(transcript);
        };
        
        this.wakeWordService.onSleepMode = () => {
            console.log('[HybridController] Entering sleep mode');
            this.handleSleepMode();
        };
        
        this.wakeWordService.onError = (errorType, message) => {
            console.error('[HybridController] Wake word error:', errorType, message);
            this.handleVoiceError(errorType, message);
        };
        
        this.wakeWordService.onListeningStateChange = (state, isAwake) => {
            this.state.wakeWordActive = state === 'wake-word-listening' || state === 'command-listening';
            this.state.voiceListening = state === 'command-listening';
        };
    }
    
    /**
     * Setup UI fallback callbacks
     */
    setupUIFallbackCallbacks() {
        this.uiFallback.onFallbackActivate = (reason) => {
            console.log('[HybridController] UI fallback activated:', reason);
            this.handleUIFallbackActivation(reason);
        };
        
        this.uiFallback.onFallbackDeactivate = (reason) => {
            console.log('[HybridController] UI fallback deactivated:', reason);
            this.handleUIFallbackDeactivation(reason);
        };
        
        this.uiFallback.onUIAction = (action, data) => {
            console.log('[HybridController] UI action:', action, data);
            this.handleUIAction(action, data);
        };
        
        this.uiFallback.onRequestHumanHelp = () => {
            console.log('[HybridController] Human help requested');
            this.handleHumanHelpRequest();
        };
    }
    
    /**
     * Setup conversation flow callbacks
     */
    setupConversationFlowCallbacks() {
        this.conversationFlow.onFlowComplete = (flowId, state) => {
            console.log('[HybridController] Flow completed:', flowId);
            this.handleFlowComplete(flowId, state);
        };
        
        this.conversationFlow.onSuggestUIFallback = (reason, currentFlow) => {
            console.log('[HybridController] Flow suggests UI fallback:', reason);
            this.activateUIFallback(reason);
        };
        
        this.conversationFlow.onSpeak = (text, style) => {
            this.speak(text, style);
        };
    }
    
    /**
     * Setup speech manager integration
     */
    setupSpeechManagerIntegration() {
        // Store original callback
        const originalOnSpeechResult = this.speechManager.onSpeechResult;
        
        // Intercept speech results when wake word is not active
        this.speechManager.onSpeechResult = (transcript) => {
            // If wake word service is handling, let it process
            if (this.wakeWordService?.isAwake) {
                // Wake word service handles this
                return;
            }
            
            // Otherwise, process through conversation flow
            if (this.conversationFlow?.currentFlow) {
                this.conversationFlow.processResponse(transcript);
            } else if (originalOnSpeechResult) {
                originalOnSpeechResult(transcript);
            }
        };
        
        // Track speech errors
        const originalOnSpeechError = this.speechManager.onSpeechError;
        this.speechManager.onSpeechError = (error) => {
            this.handleSpeechError(error);
            if (originalOnSpeechError) {
                originalOnSpeechError(error);
            }
        };
    }
    
    /**
     * Handle wake word detection
     */
    handleWakeWord(transcript) {
        this.state.interactionSource = 'wake-word';
        this.state.lastInteraction = Date.now();
        
        // Acknowledge wake word
        this.speak("Yes, I'm listening.");
        
        // If in UI fallback mode, announce switching
        if (this.currentMode === 'ui') {
            this.switchToVoiceMode(true);
        }
        
        // Keep wake word service awake for extended time during conversation
        this.wakeWordService?.extendAwakeTime(10000);
    }
    
    /**
     * Handle voice command from wake word service
     */
    handleVoiceCommand(transcript) {
        this.state.interactionSource = 'voice';
        this.state.lastInteraction = Date.now();
        
        // Report success to UI fallback (voice is working)
        this.uiFallback?.reportSuccess();
        
        // Check if conversation flow is active
        if (this.conversationFlow?.currentFlow) {
            this.conversationFlow.processResponse(transcript);
        } else {
            // Try to start a new flow based on intent
            const flowStarted = this.conversationFlow?.inferIntent(transcript);
            
            if (!flowStarted) {
                // Pass to main app handler
                if (this.onVoiceCommand) {
                    this.onVoiceCommand(transcript);
                } else if (typeof blindNavApp !== 'undefined') {
                    blindNavApp.handleVoiceCommand(transcript);
                }
            }
        }
        
        // Keep awake for follow-up
        this.wakeWordService?.extendAwakeTime(10000);
    }
    
    /**
     * Handle sleep mode (wake word not detected for timeout)
     */
    handleSleepMode() {
        // If conversation was active, announce sleep
        if (this.state.voiceListening) {
            // Don't announce every sleep to avoid annoying user
        }
    }
    
    /**
     * Handle voice-related errors
     */
    handleVoiceError(errorType, message) {
        switch (errorType) {
            case 'permission-denied':
                this.uiFallback?.reportFailure('microphone');
                this.activateUIFallback('microphone_failure');
                break;
                
            case 'microphone-error':
                this.uiFallback?.reportFailure('microphone');
                break;
                
            case 'network-error':
                this.uiFallback?.reportFailure('network');
                break;
                
            default:
                this.uiFallback?.reportFailure('recognition');
        }
    }
    
    /**
     * Handle speech recognition errors
     */
    handleSpeechError(error) {
        switch (error) {
            case 'not-allowed':
            case 'service-not-allowed':
                this.uiFallback?.reportFailure('microphone');
                break;
                
            case 'network':
                this.uiFallback?.reportFailure('network');
                break;
                
            case 'audio-capture':
                this.uiFallback?.reportFailure('microphone');
                break;
                
            case 'no-speech':
                // Normal, don't report
                break;
                
            default:
                this.uiFallback?.reportFailure('recognition');
        }
    }
    
    /**
     * Handle UI fallback activation
     */
    handleUIFallbackActivation(reason) {
        this.previousMode = this.currentMode;
        this.currentMode = 'ui';
        this.state.uiFallbackActive = true;
        
        // Announce mode switch if configured
        if (this.config.announceModeSwitches) {
            this.speak("Switching to screen controls. Voice will resume when available.");
        }
        
        // Notify mode switch
        if (this.onModeSwitch) {
            this.onModeSwitch('voice', 'ui', reason);
        }
    }
    
    /**
     * Handle UI fallback deactivation
     */
    handleUIFallbackDeactivation(reason) {
        this.state.uiFallbackActive = false;
        
        if (this.config.preferVoice) {
            this.switchToVoiceMode(true);
        } else {
            this.currentMode = 'hybrid';
        }
    }
    
    /**
     * Handle UI action from fallback system
     */
    handleUIAction(action, data = {}) {
        this.state.interactionSource = 'ui';
        this.state.lastInteraction = Date.now();
        
        switch (action) {
            case 'emergency':
            case 'navigation':
            case 'reading':
            case 'describe':
                this.activateAppMode(action === 'describe' ? 'scene-describe' : action);
                break;
                
            case 'navigate':
                if (data.destination) {
                    this.startNavigationTo(data.destination);
                }
                break;
                
            case 'mode_control':
                this.handleModeControl(data.mode, data.control);
                break;
                
            default:
                if (this.onUIAction) {
                    this.onUIAction(action, data);
                }
        }
    }
    
    /**
     * Handle human help request
     */
    handleHumanHelpRequest() {
        this.speak(
            "Please ask someone nearby to help you operate the app. " +
            "Never give up. Someone will help you."
        );
    }
    
    /**
     * Handle flow completion
     */
    handleFlowComplete(flowId, state) {
        console.log('[HybridController] Conversation flow completed:', flowId);
        
        // Announce completion
        switch (flowId) {
            case 'navigation':
                // Navigation started, keep voice awake
                this.wakeWordService?.keepAwake();
                break;
                
            case 'reading':
                // Reading complete
                this.speak("Reading complete. Say hey BlindNav for more commands.");
                break;
                
            default:
                break;
        }
    }
    
    /**
     * Switch to voice mode
     */
    switchToVoiceMode(announce = false) {
        this.previousMode = this.currentMode;
        this.currentMode = 'voice';
        
        // Start wake word detection
        this.wakeWordService?.start();
        
        // Deactivate UI fallback if active
        if (this.state.uiFallbackActive) {
            this.uiFallback?.deactivate('voice_preferred');
        }
        
        if (announce && this.config.announceModeSwitches) {
            this.speak("Voice controls active. Say 'Hey BlindNav' to give commands.");
        }
        
        if (this.onModeSwitch) {
            this.onModeSwitch(this.previousMode, 'voice');
        }
    }
    
    /**
     * Switch to UI mode
     */
    switchToUIMode(announce = true) {
        this.previousMode = this.currentMode;
        this.currentMode = 'ui';
        
        // Stop wake word detection
        this.wakeWordService?.stop();
        
        // Activate UI fallback
        this.uiFallback?.activate('user_requested');
        
        if (announce && this.config.announceModeSwitches) {
            this.speak("Switching to screen controls. Tap buttons to navigate.");
        }
        
        if (this.onModeSwitch) {
            this.onModeSwitch(this.previousMode, 'ui');
        }
    }
    
    /**
     * Switch to hybrid mode (both voice and UI available)
     */
    switchToHybridMode(announce = true) {
        this.previousMode = this.currentMode;
        this.currentMode = 'hybrid';
        
        // Start wake word detection
        this.wakeWordService?.start();
        
        // Keep UI available but not in fallback state
        
        if (announce && this.config.announceModeSwitches) {
            this.speak("Hybrid mode active. Use voice or screen controls.");
        }
        
        if (this.onModeSwitch) {
            this.onModeSwitch(this.previousMode, 'hybrid');
        }
    }
    
    /**
     * Activate UI fallback
     */
    activateUIFallback(reason) {
        this.uiFallback?.activate(reason);
    }
    
    /**
     * Activate an app mode
     */
    activateAppMode(modeName) {
        this.state.currentAppMode = modeName;
        
        if (typeof blindNavApp !== 'undefined') {
            blindNavApp.activateMode(modeName);
        }
        
        // Setup mode-specific UI controls if needed
        if (this.state.uiFallbackActive) {
            const controls = this.uiFallback?.getModeControls(modeName);
            if (controls && controls.length > 0) {
                this.uiFallback.showModeControls(modeName, controls);
            }
        }
        
        // Keep voice awake during mode
        this.wakeWordService?.keepAwake();
    }
    
    /**
     * Start navigation to destination
     */
    startNavigationTo(destination) {
        // Use conversation flow for natural interaction
        this.conversationFlow?.startFlow('navigation', {
            destination: destination,
            skipDestinationPrompt: true
        });
    }
    
    /**
     * Handle mode control from UI
     */
    handleModeControl(mode, control) {
        // Route to appropriate mode handler
        switch (mode) {
            case 'navigation':
                this.handleNavigationControl(control);
                break;
            case 'reading':
                this.handleReadingControl(control);
                break;
            case 'walking':
                this.handleWalkingControl(control);
                break;
            case 'emergency':
                this.handleEmergencyControl(control);
                break;
            case 'bus-detection':
                this.handleBusControl(control);
                break;
        }
    }
    
    /**
     * Handle navigation mode controls
     */
    handleNavigationControl(control) {
        if (typeof navigationMode !== 'undefined') {
            switch (control) {
                case 'next_step':
                    navigationMode.announceNextStep?.();
                    break;
                case 'repeat':
                    navigationMode.repeatLastInstruction?.();
                    break;
                case 'where_am_i':
                    navigationMode.announceCurrentLocation?.();
                    break;
            }
        }
    }
    
    /**
     * Handle reading mode controls
     */
    handleReadingControl(control) {
        if (typeof readingMode !== 'undefined') {
            switch (control) {
                case 'read_again':
                    readingMode.repeatLastReading?.();
                    break;
                case 'spell':
                    readingMode.spellLastWord?.();
                    break;
                case 'capture':
                    readingMode.captureAndRead?.();
                    break;
            }
        }
    }
    
    /**
     * Handle walking mode controls
     */
    handleWalkingControl(control) {
        if (typeof walkingMode !== 'undefined') {
            switch (control) {
                case 'whats_ahead':
                    walkingMode.announceAhead?.();
                    break;
                case 'pause':
                    walkingMode.pause?.();
                    break;
                case 'resume':
                    walkingMode.resume?.();
                    break;
            }
        }
    }
    
    /**
     * Handle emergency mode controls
     */
    handleEmergencyControl(control) {
        if (typeof emergencyMode !== 'undefined') {
            switch (control) {
                case 'call_911':
                    emergencyMode.callEmergencyServices?.();
                    break;
                case 'send_location':
                    emergencyMode.shareLocation?.();
                    break;
                case 'alert_contacts':
                    emergencyMode.alertEmergencyContacts?.();
                    break;
            }
        }
    }
    
    /**
     * Handle bus detection controls
     */
    handleBusControl(control) {
        if (typeof busDetectionMode !== 'undefined') {
            switch (control) {
                case 'check_now':
                    busDetectionMode.checkForBus?.();
                    break;
                case 'change_bus':
                    busDetectionMode.promptBusNumber?.();
                    break;
            }
        }
    }
    
    /**
     * Speak with appropriate handling
     */
    speak(text, style = 'normal') {
        if (this.speechManager) {
            let rate = this.speechManager.settings.rate;
            
            if (style === 'slow_calm') {
                rate = 0.85;
            } else if (style === 'urgent') {
                rate = 1.2;
            }
            
            const originalRate = this.speechManager.settings.rate;
            this.speechManager.settings.rate = rate;
            this.speechManager.speak(text, true);
            this.speechManager.settings.rate = originalRate;
            
        } else if ('speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance(text);
            speechSynthesis.speak(utterance);
        }
        
        // Also show visually if in UI mode
        if (this.currentMode === 'ui' || this.state.uiFallbackActive) {
            this.uiFallback?.showVisualFeedback(text);
        }
    }
    
    /**
     * Process incoming voice command (external call)
     */
    processVoiceCommand(transcript) {
        // Force wake if not awake
        if (!this.wakeWordService?.isAwake) {
            this.wakeWordService?.forceWake();
        }
        
        this.handleVoiceCommand(transcript);
    }
    
    /**
     * Get current state
     */
    getState() {
        return {
            currentMode: this.currentMode,
            previousMode: this.previousMode,
            isInitialized: this.state.isInitialized,
            wakeWordActive: this.state.wakeWordActive,
            voiceListening: this.state.voiceListening,
            uiFallbackActive: this.state.uiFallbackActive,
            currentAppMode: this.state.currentAppMode,
            lastInteraction: this.state.lastInteraction,
            interactionSource: this.state.interactionSource
        };
    }
    
    /**
     * Update configuration
     */
    updateConfig(newConfig) {
        Object.assign(this.config, newConfig);
        console.log('[HybridController] Config updated:', this.config);
    }
    
    /**
     * Check if voice is currently available
     */
    isVoiceAvailable() {
        return this.wakeWordService?.isActive && !this.state.uiFallbackActive;
    }
    
    /**
     * Check if UI is currently active
     */
    isUIActive() {
        return this.currentMode === 'ui' || this.state.uiFallbackActive;
    }
}

// Export singleton instance
const voiceUIHybridController = new VoiceUIHybridController();
