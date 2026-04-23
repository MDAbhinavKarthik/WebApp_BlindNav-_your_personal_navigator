/**
 * BlindNav+ System Boot Flow
 * Mirrors the Python backend boot sequence for consistent user experience
 * Complete voice-based workflow
 */

class SystemBoot {
    constructor() {
        // Boot state
        this.bootStage = 'idle';
        this.modelsLoaded = {
            detection: false,
            speech: false,
            camera: false
        };
        
        // User personalization
        this.userName = 'friend';
        this.userLanguage = 'en';
        this.languageNames = {
            'en': 'English',
            'hi': 'Hindi',
            'kn': 'Kannada'
        };
        
        // System status
        this.systemStatus = {
            camera: null,
            microphone: null,
            internet: null,
            battery: null
        };
        
        // Boot callbacks
        this.onBootProgress = null;
        this.onBootComplete = null;
        this.onBootError = null;
        
        // Startup beep frequencies
        this.audioContext = null;
    }
    
    /**
     * Play startup beep sound
     */
    async playBeep(frequency = 800, duration = 300) {
        try {
            if (!this.audioContext) {
                this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            }
            
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            oscillator.frequency.value = frequency;
            oscillator.type = 'sine';
            
            gainNode.gain.setValueAtTime(0.3, this.audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration / 1000);
            
            oscillator.start(this.audioContext.currentTime);
            oscillator.stop(this.audioContext.currentTime + duration / 1000);
            
            await this.delay(duration + 100);
        } catch (error) {
            console.log('[Boot] Could not play beep:', error.message);
        }
    }
    
    /**
     * Pre-load speech synthesis voices
     */
    async loadVoices() {
        return new Promise((resolve) => {
            console.log('[Boot] Loading speech synthesis voices...');
            
            if (!('speechSynthesis' in window)) {
                console.log('[Boot] Speech synthesis not available');
                resolve();
                return;
            }
            
            let voices = window.speechSynthesis.getVoices();
            if (voices.length > 0) {
                console.log('[Boot] Voices already loaded:', voices.length);
                resolve();
                return;
            }
            
            // Wait for voices to load
            let attempts = 0;
            const maxAttempts = 20;
            
            const checkVoices = () => {
                voices = window.speechSynthesis.getVoices();
                attempts++;
                
                if (voices.length > 0) {
                    console.log('[Boot] Voices loaded:', voices.length);
                    resolve();
                } else if (attempts >= maxAttempts) {
                    console.log('[Boot] Voice loading timeout, proceeding anyway');
                    resolve();
                } else {
                    setTimeout(checkVoices, 100);
                }
            };
            
            window.speechSynthesis.onvoiceschanged = () => {
                voices = window.speechSynthesis.getVoices();
                if (voices.length > 0) {
                    console.log('[Boot] Voices loaded via event:', voices.length);
                    resolve();
                }
            };
            
            checkVoices();
        });
    }
    
    /**
     * Main boot sequence - mirrors Python system_boot()
     */
    async startBoot() {
        console.log('[Boot] Starting system boot sequence...');
        this.bootStage = 'starting';
        this.updateProgress(0, 'Starting system boot sequence...');
        
        try {
            // Step 0: Pre-load speech voices
            await this.loadVoices();
            
            // Step 1: Play startup beep
            await this.playBeep(800, 300);
            
            // Step 2: Initial announcement
            this.bootStage = 'initializing';
            this.updateProgress(5, 'Initializing system...');
            await this.speakAndWait("Initializing system. Please wait while I check everything.");
            
            // Step 3: Load models in background
            this.bootStage = 'loading_models';
            this.updateProgress(10, 'Loading AI models...');
            this.loadModelsParallel();
            
            // Step 4: System status checks
            this.bootStage = 'checking_status';
            this.updateProgress(20, 'Checking system status...');
            await this.checkSystemStatus();
            
            // Step 5: System ready
            this.bootStage = 'ready';
            this.updateProgress(50, 'System ready!');
            await this.speakAndWait("System ready. Welcome to BlindNav Plus, your personal navigation assistant.");
            
            // Step 6: Language selection
            this.updateProgress(55, 'Language selection...');
            await this.selectLanguage();
            
            // Step 7: Get user's name
            this.updateProgress(65, 'Getting user info...');
            await this.getUserName();
            
            // Step 8: Greet and explain
            this.updateProgress(75, 'Explaining features...');
            await this.greetAndExplain();
            
            // Step 9: Complete boot
            this.updateProgress(100, 'Boot complete!');
            this.bootStage = 'complete';
            
            await this.playBeep(800, 300);
            
            this.saveUserPreferences();
            
            if (this.onBootComplete) {
                this.onBootComplete({
                    userName: this.userName,
                    userLanguage: this.userLanguage,
                    systemStatus: this.systemStatus
                });
            }
            
            // Enter mode selection
            await this.enterModeSelection();
            
        } catch (error) {
            console.error('[Boot] Boot error:', error);
            this.bootStage = 'error';
            if (this.onBootError) this.onBootError(error);
            await this.speakAndWait("There was an error during startup. Please refresh and try again.");
        }
    }
    
    /**
     * Load AI models in background
     */
    loadModelsParallel() {
        console.log('[Boot] Loading models in background...');
        
        if (typeof detectionManager !== 'undefined') {
            detectionManager.loadModel()
                .then(() => { this.modelsLoaded.detection = true; console.log('[Boot] Detection model loaded.'); })
                .catch(err => console.error('[Boot] Detection model error:', err));
        }
        
        if (typeof cameraManager !== 'undefined') {
            cameraManager.init();
            this.modelsLoaded.camera = true;
        }
        
        this.modelsLoaded.speech = true;
    }
    
    /**
     * Check system status
     */
    async checkSystemStatus() {
        console.log('[Boot] Checking system status...');
        
        let messages = [];
        
        // Battery
        try {
            if ('getBattery' in navigator) {
                const battery = await navigator.getBattery();
                const level = Math.round(battery.level * 100);
                this.systemStatus.battery = { level: battery.level, charging: battery.charging };
                
                if (level < 20) {
                    messages.push(`Warning: Battery is low at ${level} percent.`);
                } else {
                    messages.push(`Battery is at ${level} percent${battery.charging ? ' and charging' : ''}.`);
                }
            }
        } catch (e) {}
        
        // Internet
        this.systemStatus.internet = { online: navigator.onLine };
        messages.push(navigator.onLine ? "Internet connection active." : "Warning: No internet connection.");
        
        // Microphone
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            stream.getTracks().forEach(track => track.stop());
            this.systemStatus.microphone = { available: true };
            messages.push("Microphone ready.");
        } catch (error) {
            this.systemStatus.microphone = { available: false };
            messages.push("Warning: Microphone access denied. Please allow microphone.");
        }
        
        // Camera
        try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            const hasCamera = devices.some(d => d.kind === 'videoinput');
            this.systemStatus.camera = { available: hasCamera };
            messages.push(hasCamera ? "Camera available." : "Warning: No camera detected.");
        } catch (e) {
            this.systemStatus.camera = { available: false };
        }
        
        // Speak status
        await this.speakAndWait(messages.join(' '));
        this.updateProgress(40, 'System status checked');
    }
    
    /**
     * Language selection
     */
    async selectLanguage() {
        await this.speakAndWait("Please tell me your preferred language. Say English, Kannada, or Hindi.");
        
        const response = await this.listenForSpeech(6000);
        
        if (response) {
            const lower = response.toLowerCase();
            if (lower.includes('hindi')) {
                this.userLanguage = 'hi';
                await this.speakAndWait("Language set to Hindi.");
            } else if (lower.includes('kannada')) {
                this.userLanguage = 'kn';
                await this.speakAndWait("Language set to Kannada.");
            } else {
                this.userLanguage = 'en';
                await this.speakAndWait("Language set to English.");
            }
        } else {
            this.userLanguage = 'en';
            await this.speakAndWait("I'll use English as default.");
        }
    }
    
    /**
     * Get user's name
     */
    async getUserName() {
        await this.speakAndWait("Hello! May I know your name?");
        
        const response = await this.listenForSpeech(6000);
        
        if (response && response.trim()) {
            let name = response.trim();
            const prefixes = ['my name is', 'i am', "i'm", 'call me', 'this is', 'name is'];
            for (const p of prefixes) {
                if (name.toLowerCase().startsWith(p)) {
                    name = name.substring(p.length).trim();
                    break;
                }
            }
            this.userName = name ? name.charAt(0).toUpperCase() + name.slice(1).toLowerCase() : 'friend';
        } else {
            this.userName = 'friend';
        }
        
        await this.speakAndWait(`Nice to meet you, ${this.userName}! I'm BlindNav Plus, your personal navigation assistant.`);
    }
    
    /**
     * Greet and explain system
     */
    async greetAndExplain() {
        await this.speakAndWait("I'm here to help you navigate safely and assist in your daily activities.");
        
        await this.speakAndWait(`${this.userName}, let me explain how to use me. I have several modes:`);
        
        await this.speakAndWait("First, Navigation Mode. Say 'Navigation mode' to get step-by-step directions with obstacle avoidance.");
        
        await this.speakAndWait("Second, Object Detection. Say 'Detect objects' or 'What's around me' to identify things in your surroundings.");
        
        await this.speakAndWait("Third, Reading Mode. Say 'Read text' to read any printed text through your camera.");
        
        await this.speakAndWait("Fourth, Walking Mode. Say 'Walking mode' for real-time obstacle detection while you walk.");
        
        await this.speakAndWait("Fifth, Assistant Mode. Say 'Assistant' to ask questions about time, weather, or get everyday help.");
        
        await this.speakAndWait("For emergencies, just say 'Help' or 'Emergency' and I'll respond immediately.");
        
        await this.speakAndWait(`Some tips, ${this.userName}: Keep your camera facing forward. I am always listening, so just speak your command naturally.`);
        
        await this.speakAndWait(`You're all set, ${this.userName}! Just tell me what you want to do.`);
    }
    
    /**
     * Enter mode selection
     */
    async enterModeSelection() {
        await this.speakAndWait("I'm listening. Choose from: Navigation, Object detection, Walking, Reading, Assistant, or say Help for more options.");
        
        // Continuous listening mode - voice recognition is always active
        // No need to tap any button - just speak naturally
    }
    
    /**
     * Speak and wait for completion
     */
    speakAndWait(text) {
        return new Promise((resolve) => {
            console.log('[Boot] Speaking:', text);
            
            if (!('speechSynthesis' in window)) {
                console.log('[Boot] Speech synthesis not supported');
                resolve();
                return;
            }
            
            const synthesis = window.speechSynthesis;
            
            // Wait for any current speech to finish
            const waitAndSpeak = () => {
                if (synthesis.speaking) {
                    setTimeout(waitAndSpeak, 100);
                    return;
                }
                
                // Create utterance
                const utterance = new SpeechSynthesisUtterance(text);
                utterance.rate = 0.95;
                utterance.pitch = 1.0;
                utterance.volume = 1.0;
                utterance.lang = 'en-US';
                
                // Get voices
                const voices = synthesis.getVoices();
                console.log('[Boot] Available voices:', voices.length);
                
                // Select voice
                if (voices.length > 0) {
                    const voice = voices.find(v => v.lang.startsWith('en-US')) ||
                                 voices.find(v => v.lang.startsWith('en')) ||
                                 voices[0];
                    if (voice) {
                        utterance.voice = voice;
                        console.log('[Boot] Using voice:', voice.name);
                    }
                }
                
                let resolved = false;
                
                utterance.onstart = () => {
                    console.log('[Boot] ✓ Speech started');
                };
                
                utterance.onend = () => {
                    if (!resolved) {
                        resolved = true;
                        console.log('[Boot] ✓ Speech ended');
                        setTimeout(resolve, 400);
                    }
                };
                
                utterance.onerror = (e) => {
                    console.error('[Boot] ✗ Speech error:', e.error);
                    if (!resolved) {
                        resolved = true;
                        // Try alternative method on error
                        if (e.error === 'not-allowed' || e.error === 'audio-busy') {
                            console.log('[Boot] Retrying with fresh synthesis...');
                            synthesis.cancel();
                            setTimeout(() => {
                                synthesis.speak(new SpeechSynthesisUtterance(text));
                            }, 200);
                        }
                        setTimeout(resolve, 500);
                    }
                };
                
                // Chrome/Edge workaround: resume if paused
                if (synthesis.paused) {
                    synthesis.resume();
                }
                
                // Speak the utterance
                synthesis.speak(utterance);
                console.log('[Boot] Utterance queued');
                
                // Fallback timeout (estimate 150ms per word)
                const words = text.split(' ').length;
                const timeout = Math.max(8000, words * 400);
                setTimeout(() => {
                    if (!resolved) {
                        resolved = true;
                        console.log('[Boot] Speech timeout after', timeout, 'ms');
                        resolve();
                    }
                }, timeout);
            };
            
            waitAndSpeak();
        });
    }
    
    /**
     * Listen for speech
     */
    listenForSpeech(timeout = 5000) {
        return new Promise((resolve) => {
            if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
                resolve(null);
                return;
            }
            
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            const recognition = new SpeechRecognition();
            
            recognition.continuous = false;
            recognition.interimResults = false;
            recognition.lang = 'en-US';
            
            let resolved = false;
            
            recognition.onresult = (event) => {
                if (!resolved) {
                    resolved = true;
                    const transcript = event.results[0][0].transcript;
                    console.log('[Boot] Heard:', transcript);
                    resolve(transcript);
                }
            };
            
            recognition.onerror = (e) => {
                if (!resolved) { resolved = true; resolve(null); }
            };
            
            recognition.onend = () => {
                if (!resolved) { resolved = true; resolve(null); }
            };
            
            try {
                recognition.start();
                console.log('[Boot] Listening...');
            } catch (e) {
                resolve(null);
            }
            
            setTimeout(() => {
                if (!resolved) {
                    resolved = true;
                    try { recognition.stop(); } catch (e) {}
                    resolve(null);
                }
            }, timeout);
        });
    }
    
    /**
     * Update progress
     */
    updateProgress(percent, message) {
        console.log(`[Boot] ${percent}% - ${message}`);
        
        const fill = document.querySelector('.progress-fill');
        const text = document.querySelector('.progress-text');
        
        if (fill) fill.style.width = `${percent}%`;
        if (text) text.textContent = message;
        
        if (this.onBootProgress) this.onBootProgress(percent, message);
    }
    
    /**
     * Save preferences
     */
    saveUserPreferences() {
        try {
            localStorage.setItem('blindnav_user_name', this.userName);
            localStorage.setItem('blindnav_user_language', this.userLanguage);
        } catch (e) {}
    }
    
    /**
     * Load preferences
     */
    loadUserPreferences() {
        try {
            const name = localStorage.getItem('blindnav_user_name');
            const lang = localStorage.getItem('blindnav_user_language');
            if (name) this.userName = name;
            if (lang) this.userLanguage = lang;
        } catch (e) {}
    }
    
    /**
     * Check returning user
     */
    isReturningUser() {
        try {
            return localStorage.getItem('blindnav_user_name') !== null;
        } catch (e) { return false; }
    }
    
    /**
     * Quick boot for returning users
     */
    async quickBoot() {
        console.log('[Boot] Quick boot...');
        
        this.loadUserPreferences();
        await this.playBeep(800, 300);
        
        await this.speakAndWait(`Welcome back, ${this.userName}! BlindNav Plus is ready.`);
        
        this.loadModelsParallel();
        
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            stream.getTracks().forEach(track => track.stop());
            this.systemStatus.microphone = { available: true };
        } catch (e) {
            this.systemStatus.microphone = { available: false };
            await this.speakAndWait("Please allow microphone access.");
        }
        
        this.bootStage = 'complete';
        
        if (this.onBootComplete) {
            this.onBootComplete({
                userName: this.userName,
                userLanguage: this.userLanguage,
                systemStatus: this.systemStatus,
                quickBoot: true
            });
        }
        
        await this.speakAndWait("What would you like to do? Say navigation, detect objects, reading, walking, or help.");
        
        if (typeof speechManager !== 'undefined') {
            speechManager.startListening();
        }
    }
    
    /**
     * Delay utility
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Create global instance
const systemBoot = new SystemBoot();
