/**
 * BlindNav+ UI Fallback System
 * Provides visual interface backup when voice interaction fails
 * Ensures users are never left without guidance
 */

class UIFallbackSystem {
    constructor() {
        // State tracking
        this.isActive = false;
        this.fallbackReason = null;
        this.voiceAvailable = true;
        this.lastVoiceSuccess = Date.now();
        
        // Failure tracking
        this.failures = {
            microphone: 0,
            recognition: 0,
            misunderstanding: 0,
            noiseDetected: 0,
            networkErrors: 0
        };
        
        // Thresholds for activating fallback
        this.thresholds = {
            microphoneFailures: 2,
            recognitionFailures: 3,
            misunderstandings: 3,
            noiseTimeout: 30000,      // 30 seconds of noise = suggest fallback
            silenceTimeout: 60000,    // 60 seconds of no voice = check status
            voiceRetryInterval: 5000  // Retry voice every 5 seconds
        };
        
        // UI State
        this.uiElements = {};
        this.currentUIMode = null;
        
        // Voice retry timer
        this.voiceRetryTimer = null;
        
        // Callbacks
        this.onFallbackActivate = null;
        this.onFallbackDeactivate = null;
        this.onUIAction = null;
        this.onRequestHumanHelp = null;
        
        console.log('[UIFallback] System initialized');
    }
    
    /**
     * Initialize the UI fallback system
     */
    init() {
        this.createFallbackUI();
        this.setupEventListeners();
        console.log('[UIFallback] UI elements created');
    }
    
    /**
     * Create the fallback UI elements
     */
    createFallbackUI() {
        // Create fallback container
        const container = document.createElement('div');
        container.id = 'ui-fallback-container';
        container.className = 'ui-fallback-container hidden';
        container.setAttribute('aria-live', 'polite');
        container.setAttribute('role', 'dialog');
        container.setAttribute('aria-label', 'Voice fallback controls');
        
        container.innerHTML = `
            <div class="fallback-header">
                <div class="fallback-status">
                    <span class="status-icon">🎤</span>
                    <span class="status-text">Voice controls temporarily unavailable</span>
                </div>
                <button class="retry-voice-btn" aria-label="Retry voice controls">
                    🔄 Try Voice Again
                </button>
            </div>
            
            <div class="fallback-message">
                <p id="fallback-reason-text">Having trouble hearing you. Use these controls or ask someone nearby for help.</p>
            </div>
            
            <div class="fallback-quick-actions">
                <h3>Quick Actions</h3>
                <div class="quick-action-grid">
                    <button class="quick-action-btn emergency" data-action="emergency" aria-label="Emergency help">
                        <span class="action-icon">🚨</span>
                        <span class="action-label">Emergency</span>
                    </button>
                    <button class="quick-action-btn navigation" data-action="navigation" aria-label="Start navigation">
                        <span class="action-icon">🧭</span>
                        <span class="action-label">Navigate</span>
                    </button>
                    <button class="quick-action-btn reading" data-action="reading" aria-label="Read text">
                        <span class="action-icon">📖</span>
                        <span class="action-label">Read Text</span>
                    </button>
                    <button class="quick-action-btn describe" data-action="describe" aria-label="Describe surroundings">
                        <span class="action-icon">👁️</span>
                        <span class="action-label">Describe</span>
                    </button>
                </div>
            </div>
            
            <div class="fallback-mode-controls hidden" id="fallback-mode-panel">
                <h3 id="fallback-mode-title">Mode Controls</h3>
                <div class="mode-control-content" id="fallback-mode-content">
                    <!-- Dynamic content based on active mode -->
                </div>
            </div>
            
            <div class="fallback-destinations hidden" id="fallback-destinations-panel">
                <h3>Common Destinations</h3>
                <div class="destination-list">
                    <button class="destination-btn" data-destination="bus stop">🚌 Nearest Bus Stop</button>
                    <button class="destination-btn" data-destination="hospital">🏥 Hospital</button>
                    <button class="destination-btn" data-destination="pharmacy">💊 Pharmacy</button>
                    <button class="destination-btn" data-destination="grocery store">🛒 Grocery Store</button>
                    <button class="destination-btn" data-destination="restaurant">🍽️ Restaurant</button>
                    <button class="destination-btn" data-destination="home">🏠 Home</button>
                </div>
                <div class="custom-destination">
                    <label for="custom-dest-input">Or type destination:</label>
                    <input type="text" id="custom-dest-input" placeholder="Enter destination" aria-label="Type destination">
                    <button class="go-btn" id="custom-dest-go">Go</button>
                </div>
            </div>
            
            <div class="fallback-help-request">
                <button class="request-help-btn" aria-label="Request human assistance">
                    <span class="help-icon">👥</span>
                    <span>Ask Someone Nearby for Help</span>
                </button>
            </div>
            
            <div class="fallback-footer">
                <button class="minimize-fallback-btn" aria-label="Minimize fallback panel">
                    Minimize
                </button>
            </div>
        `;
        
        document.body.appendChild(container);
        this.uiElements.container = container;
        
        // Create minimized indicator
        const minimized = document.createElement('div');
        minimized.id = 'fallback-minimized';
        minimized.className = 'fallback-minimized hidden';
        minimized.innerHTML = `
            <button class="expand-fallback-btn" aria-label="Expand voice fallback controls">
                🎤 <span>Voice unavailable - Tap for controls</span>
            </button>
        `;
        document.body.appendChild(minimized);
        this.uiElements.minimized = minimized;
        
        // Store references to important elements
        this.uiElements.statusText = container.querySelector('.status-text');
        this.uiElements.reasonText = container.querySelector('#fallback-reason-text');
        this.uiElements.modePanel = container.querySelector('#fallback-mode-panel');
        this.uiElements.modeContent = container.querySelector('#fallback-mode-content');
        this.uiElements.modeTitle = container.querySelector('#fallback-mode-title');
        this.uiElements.destinationsPanel = container.querySelector('#fallback-destinations-panel');
    }
    
    /**
     * Setup event listeners for fallback UI
     */
    setupEventListeners() {
        const container = this.uiElements.container;
        
        // Retry voice button
        container.querySelector('.retry-voice-btn')?.addEventListener('click', () => {
            this.retryVoice();
        });
        
        // Quick action buttons
        container.querySelectorAll('.quick-action-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const action = btn.dataset.action;
                this.handleQuickAction(action);
            });
        });
        
        // Destination buttons
        container.querySelectorAll('.destination-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const destination = btn.dataset.destination;
                this.handleDestinationSelect(destination);
            });
        });
        
        // Custom destination
        container.querySelector('#custom-dest-go')?.addEventListener('click', () => {
            const input = container.querySelector('#custom-dest-input');
            if (input?.value) {
                this.handleDestinationSelect(input.value);
                input.value = '';
            }
        });
        
        container.querySelector('#custom-dest-input')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                const input = e.target;
                if (input.value) {
                    this.handleDestinationSelect(input.value);
                    input.value = '';
                }
            }
        });
        
        // Request help button
        container.querySelector('.request-help-btn')?.addEventListener('click', () => {
            this.requestHumanHelp();
        });
        
        // Minimize button
        container.querySelector('.minimize-fallback-btn')?.addEventListener('click', () => {
            this.minimizeFallback();
        });
        
        // Expand button (minimized state)
        this.uiElements.minimized?.querySelector('.expand-fallback-btn')?.addEventListener('click', () => {
            this.expandFallback();
        });
    }
    
    /**
     * Report a failure that may trigger fallback
     */
    reportFailure(failureType, details = {}) {
        console.log(`[UIFallback] Failure reported: ${failureType}`, details);
        
        switch (failureType) {
            case 'microphone':
                this.failures.microphone++;
                if (this.failures.microphone >= this.thresholds.microphoneFailures) {
                    this.activate('microphone_failure');
                }
                break;
                
            case 'recognition':
                this.failures.recognition++;
                if (this.failures.recognition >= this.thresholds.recognitionFailures) {
                    this.activate('speech_recognition_failure');
                }
                break;
                
            case 'misunderstanding':
                this.failures.misunderstanding++;
                if (this.failures.misunderstanding >= this.thresholds.misunderstandings) {
                    this.activate('repeated_misunderstanding');
                }
                break;
                
            case 'noise':
                this.failures.noiseDetected++;
                this.handleNoisyEnvironment();
                break;
                
            case 'network':
                this.failures.networkErrors++;
                this.activate('network_error');
                break;
        }
    }
    
    /**
     * Report a successful voice interaction
     */
    reportSuccess() {
        this.lastVoiceSuccess = Date.now();
        this.resetFailures();
        
        // If fallback is active, voice is working again
        if (this.isActive) {
            this.deactivate('voice_restored');
        }
    }
    
    /**
     * Reset failure counters
     */
    resetFailures() {
        this.failures.microphone = 0;
        this.failures.recognition = 0;
        this.failures.misunderstanding = 0;
        this.failures.noiseDetected = 0;
    }
    
    /**
     * Handle noisy environment
     */
    handleNoisyEnvironment() {
        // First, try to alert verbally
        this.speak("I'm detecting a lot of background noise. Moving to a quieter area would help me hear you better.");
        
        // After threshold, suggest UI
        if (this.failures.noiseDetected >= 3) {
            this.activate('noisy_environment');
        }
    }
    
    /**
     * Activate the fallback UI
     */
    activate(reason) {
        if (this.isActive && this.fallbackReason === reason) return;
        
        console.log(`[UIFallback] Activating fallback: ${reason}`);
        
        this.isActive = true;
        this.fallbackReason = reason;
        this.voiceAvailable = false;
        
        // Update UI based on reason
        this.updateFallbackReason(reason);
        
        // Show the fallback UI
        this.uiElements.container?.classList.remove('hidden');
        this.uiElements.minimized?.classList.add('hidden');
        
        // Announce to user
        const announcement = this.getActivationAnnouncement(reason);
        this.speak(announcement);
        
        // Start periodic voice retry
        this.startVoiceRetry();
        
        // Callback
        if (this.onFallbackActivate) {
            this.onFallbackActivate(reason);
        }
    }
    
    /**
     * Deactivate the fallback UI
     */
    deactivate(reason = 'manual') {
        if (!this.isActive) return;
        
        console.log(`[UIFallback] Deactivating fallback: ${reason}`);
        
        this.isActive = false;
        this.fallbackReason = null;
        this.voiceAvailable = true;
        
        // Hide the fallback UI
        this.uiElements.container?.classList.add('hidden');
        this.uiElements.minimized?.classList.add('hidden');
        
        // Stop voice retry
        this.stopVoiceRetry();
        
        // Reset failure counts
        this.resetFailures();
        
        // Announce restoration
        if (reason === 'voice_restored') {
            this.speak("Voice controls are working again. I'm listening.");
        }
        
        // Callback
        if (this.onFallbackDeactivate) {
            this.onFallbackDeactivate(reason);
        }
    }
    
    /**
     * Update the fallback reason display
     */
    updateFallbackReason(reason) {
        const messages = {
            'microphone_failure': "I can't access your microphone. Please check permissions or use these screen controls.",
            'speech_recognition_failure': "Speech recognition isn't working right now. Use the buttons below.",
            'repeated_misunderstanding': "I'm having trouble understanding you. Please use the screen controls or ask someone nearby for help.",
            'noisy_environment': "It's too noisy for me to hear clearly. Find a quieter spot or use these controls.",
            'network_error': "I need an internet connection for voice. Please check your connection or use offline controls."
        };
        
        if (this.uiElements.reasonText) {
            this.uiElements.reasonText.textContent = messages[reason] || "Voice controls are unavailable. Please use the screen.";
        }
    }
    
    /**
     * Get activation announcement for screen reader and TTS
     */
    getActivationAnnouncement(reason) {
        const announcements = {
            'microphone_failure': "I'm having trouble accessing your microphone. Please take help from someone nearby or use the screen controls.",
            'speech_recognition_failure': "I'm having trouble hearing you. Screen controls are now available.",
            'repeated_misunderstanding': "I'm having trouble understanding you. Please take help from someone nearby or use the screen controls.",
            'noisy_environment': "It's very noisy here. Moving to a quieter area would help. For now, you can use the screen controls.",
            'network_error': "I need an internet connection for voice. Please use the screen controls."
        };
        
        return announcements[reason] || "Voice controls are temporarily unavailable. Screen controls are ready.";
    }
    
    /**
     * Handle quick action button press
     */
    handleQuickAction(action) {
        console.log(`[UIFallback] Quick action: ${action}`);
        
        // Haptic feedback if available
        if (navigator.vibrate) {
            navigator.vibrate(50);
        }
        
        switch (action) {
            case 'emergency':
                this.speak("Starting emergency mode.");
                this.activateMode('emergency');
                break;
                
            case 'navigation':
                this.speak("Opening navigation. Select a destination below.");
                this.showDestinationsPanel();
                break;
                
            case 'reading':
                this.speak("Starting reading mode. Point camera at text.");
                this.activateMode('reading');
                break;
                
            case 'describe':
                this.speak("Describing your surroundings.");
                this.activateMode('scene-describe');
                break;
        }
        
        if (this.onUIAction) {
            this.onUIAction(action);
        }
    }
    
    /**
     * Handle destination selection
     */
    handleDestinationSelect(destination) {
        console.log(`[UIFallback] Destination selected: ${destination}`);
        
        // Haptic feedback
        if (navigator.vibrate) {
            navigator.vibrate(50);
        }
        
        this.speak(`Starting navigation to ${destination}.`);
        
        // Hide destinations panel
        this.uiElements.destinationsPanel?.classList.add('hidden');
        
        // Start navigation with destination
        this.activateMode('navigation', { destination });
        
        if (this.onUIAction) {
            this.onUIAction('navigate', { destination });
        }
    }
    
    /**
     * Show destinations panel
     */
    showDestinationsPanel() {
        this.uiElements.destinationsPanel?.classList.remove('hidden');
    }
    
    /**
     * Show mode-specific controls
     */
    showModeControls(mode, controls) {
        if (!this.uiElements.modePanel || !this.uiElements.modeContent) return;
        
        this.currentUIMode = mode;
        
        // Update title
        const titles = {
            'navigation': 'Navigation Controls',
            'reading': 'Reading Controls',
            'walking': 'Walking Controls',
            'emergency': 'Emergency Controls',
            'bus-detection': 'Bus Detection Controls'
        };
        
        if (this.uiElements.modeTitle) {
            this.uiElements.modeTitle.textContent = titles[mode] || 'Mode Controls';
        }
        
        // Generate control buttons
        let html = '<div class="mode-control-buttons">';
        
        for (const control of controls) {
            html += `
                <button class="mode-control-btn" data-control="${control.action}" aria-label="${control.label}">
                    <span class="control-icon">${control.icon || '▶'}</span>
                    <span class="control-label">${control.label}</span>
                </button>
            `;
        }
        
        // Always add stop button
        html += `
            <button class="mode-control-btn stop" data-control="stop" aria-label="Stop current mode">
                <span class="control-icon">⏹</span>
                <span class="control-label">Stop</span>
            </button>
        `;
        
        html += '</div>';
        
        this.uiElements.modeContent.innerHTML = html;
        
        // Add event listeners
        this.uiElements.modeContent.querySelectorAll('.mode-control-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const control = btn.dataset.control;
                this.handleModeControl(mode, control);
            });
        });
        
        this.uiElements.modePanel.classList.remove('hidden');
    }
    
    /**
     * Hide mode controls
     */
    hideModeControls() {
        this.uiElements.modePanel?.classList.add('hidden');
        this.currentUIMode = null;
    }
    
    /**
     * Handle mode control button press
     */
    handleModeControl(mode, control) {
        console.log(`[UIFallback] Mode control: ${mode} - ${control}`);
        
        if (navigator.vibrate) {
            navigator.vibrate(50);
        }
        
        if (control === 'stop') {
            this.speak("Stopping mode.");
            this.stopCurrentMode();
            this.hideModeControls();
            return;
        }
        
        if (this.onUIAction) {
            this.onUIAction('mode_control', { mode, control });
        }
    }
    
    /**
     * Activate a mode via UI
     */
    activateMode(modeName, options = {}) {
        // Integrate with main app
        if (typeof blindNavApp !== 'undefined') {
            blindNavApp.activateMode(modeName);
        }
        
        // Set up mode-specific controls
        const modeControls = this.getModeControls(modeName);
        if (modeControls.length > 0) {
            this.showModeControls(modeName, modeControls);
        }
    }
    
    /**
     * Stop current mode via UI
     */
    stopCurrentMode() {
        if (typeof blindNavApp !== 'undefined') {
            blindNavApp.stopCurrentMode();
        }
    }
    
    /**
     * Get mode-specific controls
     */
    getModeControls(modeName) {
        const controls = {
            'navigation': [
                { action: 'next_step', label: 'Next Step', icon: '➡️' },
                { action: 'repeat', label: 'Repeat', icon: '🔁' },
                { action: 'where_am_i', label: 'Where Am I?', icon: '📍' }
            ],
            'reading': [
                { action: 'read_again', label: 'Read Again', icon: '📖' },
                { action: 'spell', label: 'Spell It', icon: '🔤' },
                { action: 'capture', label: 'New Capture', icon: '📷' }
            ],
            'walking': [
                { action: 'whats_ahead', label: "What's Ahead?", icon: '👀' },
                { action: 'pause', label: 'Pause', icon: '⏸' },
                { action: 'resume', label: 'Resume', icon: '▶️' }
            ],
            'emergency': [
                { action: 'call_911', label: 'Call 911', icon: '📞' },
                { action: 'send_location', label: 'Send Location', icon: '📍' },
                { action: 'alert_contacts', label: 'Alert Contacts', icon: '👥' }
            ],
            'bus-detection': [
                { action: 'check_now', label: 'Check Now', icon: '👀' },
                { action: 'change_bus', label: 'Change Bus', icon: '🔄' }
            ]
        };
        
        return controls[modeName] || [];
    }
    
    /**
     * Request human assistance
     */
    requestHumanHelp() {
        console.log('[UIFallback] Human help requested');
        
        if (navigator.vibrate) {
            navigator.vibrate([100, 50, 100]);
        }
        
        const message = "Please ask someone nearby to help you operate the app. " +
            "They can use the screen controls to assist you. " +
            "Show them this screen if needed.";
        
        this.speak(message);
        
        // Show helper instructions
        this.showHelperInstructions();
        
        if (this.onRequestHumanHelp) {
            this.onRequestHumanHelp();
        }
    }
    
    /**
     * Show instructions for human helper
     */
    showHelperInstructions() {
        const existingModal = document.getElementById('helper-instructions-modal');
        if (existingModal) {
            existingModal.remove();
        }
        
        const modal = document.createElement('div');
        modal.id = 'helper-instructions-modal';
        modal.className = 'helper-instructions-modal';
        modal.innerHTML = `
            <div class="helper-modal-content">
                <h2>👥 Helper Instructions</h2>
                <p>This person needs assistance with the BlindNav+ app.</p>
                
                <div class="helper-steps">
                    <h3>How to Help:</h3>
                    <ol>
                        <li>Ask them where they want to go or what they need</li>
                        <li>Use the large buttons on the screen to select an option</li>
                        <li>The app will provide audio guidance</li>
                        <li>Stay with them until they're comfortable</li>
                    </ol>
                </div>
                
                <div class="helper-quick-help">
                    <h3>Quick Help:</h3>
                    <button class="helper-btn" data-helper="navigation">🧭 Help Navigate</button>
                    <button class="helper-btn" data-helper="reading">📖 Help Read</button>
                    <button class="helper-btn" data-helper="describe">👁️ Describe Area</button>
                </div>
                
                <button class="close-helper-modal" aria-label="Close helper instructions">
                    ✕ Close
                </button>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Event listeners
        modal.querySelector('.close-helper-modal')?.addEventListener('click', () => {
            modal.remove();
        });
        
        modal.querySelectorAll('.helper-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const action = btn.dataset.helper;
                modal.remove();
                this.handleQuickAction(action);
            });
        });
    }
    
    /**
     * Minimize the fallback panel
     */
    minimizeFallback() {
        this.uiElements.container?.classList.add('hidden');
        this.uiElements.minimized?.classList.remove('hidden');
        this.speak("Controls minimized. Tap the bar at the bottom to expand.");
    }
    
    /**
     * Expand the fallback panel
     */
    expandFallback() {
        this.uiElements.minimized?.classList.add('hidden');
        this.uiElements.container?.classList.remove('hidden');
    }
    
    /**
     * Retry voice controls
     */
    retryVoice() {
        console.log('[UIFallback] Retrying voice');
        this.speak("Testing voice controls. Please say something.");
        
        // Reset failure counters
        this.resetFailures();
        
        // Test microphone access
        this.testVoice();
    }
    
    /**
     * Test voice availability
     */
    async testVoice() {
        try {
            // Test microphone
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            stream.getTracks().forEach(track => track.stop());
            
            // Test speech recognition
            if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
                // Voice is available
                this.voiceAvailable = true;
                this.speak("Voice is working. Say 'Hey BlindNav' to use voice commands.");
                
                // Don't deactivate immediately, let user test
                setTimeout(() => {
                    if (this.voiceAvailable && this.failures.misunderstanding === 0) {
                        this.deactivate('voice_restored');
                    }
                }, 5000);
            }
        } catch (error) {
            console.error('[UIFallback] Voice test failed:', error);
            this.speak("Voice is still not available. Please continue using screen controls.");
        }
    }
    
    /**
     * Start periodic voice retry
     */
    startVoiceRetry() {
        this.stopVoiceRetry();
        
        this.voiceRetryTimer = setInterval(() => {
            if (!this.isActive) {
                this.stopVoiceRetry();
                return;
            }
            
            // Silent test
            this.silentVoiceTest();
        }, this.thresholds.voiceRetryInterval);
    }
    
    /**
     * Stop voice retry timer
     */
    stopVoiceRetry() {
        if (this.voiceRetryTimer) {
            clearInterval(this.voiceRetryTimer);
            this.voiceRetryTimer = null;
        }
    }
    
    /**
     * Silent voice test (no announcement)
     */
    async silentVoiceTest() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            stream.getTracks().forEach(track => track.stop());
            
            if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
                // Voice is available, update status but don't auto-deactivate
                this.voiceAvailable = true;
                if (this.uiElements.statusText) {
                    this.uiElements.statusText.textContent = 'Voice may be available - tap "Try Voice Again" to test';
                }
            }
        } catch (error) {
            // Still not available
            this.voiceAvailable = false;
        }
    }
    
    /**
     * Speak with fallback to visual
     */
    speak(text) {
        // Try speech synthesis
        if (typeof speechManager !== 'undefined') {
            speechManager.speak(text, true);
        } else if ('speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance(text);
            speechSynthesis.speak(utterance);
        }
        
        // Also show visually if fallback is active
        if (this.isActive) {
            this.showVisualFeedback(text);
        }
    }
    
    /**
     * Show visual feedback
     */
    showVisualFeedback(text) {
        const existing = document.getElementById('visual-feedback-toast');
        if (existing) {
            existing.remove();
        }
        
        const toast = document.createElement('div');
        toast.id = 'visual-feedback-toast';
        toast.className = 'visual-feedback-toast';
        toast.textContent = text;
        toast.setAttribute('role', 'status');
        toast.setAttribute('aria-live', 'polite');
        
        document.body.appendChild(toast);
        
        // Animate in
        setTimeout(() => toast.classList.add('visible'), 10);
        
        // Remove after delay
        setTimeout(() => {
            toast.classList.remove('visible');
            setTimeout(() => toast.remove(), 300);
        }, 5000);
    }
    
    /**
     * Get current state
     */
    getState() {
        return {
            isActive: this.isActive,
            fallbackReason: this.fallbackReason,
            voiceAvailable: this.voiceAvailable,
            failures: { ...this.failures },
            currentUIMode: this.currentUIMode
        };
    }
}

// Export singleton instance
const uiFallbackSystem = new UIFallbackSystem();
