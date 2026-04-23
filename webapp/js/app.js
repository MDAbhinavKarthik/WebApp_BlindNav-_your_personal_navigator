/**
 * BlindNav+ Main Application
 * Coordinates all modules and handles the main app flow
 * Now with wake-word detection, conversation flows, and UI fallback
 * Updated to follow Python backend boot sequence
 */

class BlindNavApp {
    constructor() {
        this.currentMode = null;
        this.isInitialized = false;
        this.isCameraConnected = false;
        this.continuousListening = true; // Always listening mode - voice commands work automatically
        this.isSystemRunning = false; // System starts only when user clicks start
        this.bootComplete = false; // Track if full boot sequence completed
        
        // User personalization (from boot sequence)
        this.userName = 'friend';
        this.userLanguage = 'en';
        
        // Voice-first, UI-supported hybrid mode
        this.voiceUIMode = 'voice'; // 'voice', 'ui', 'hybrid'
        this.wakeWordEnabled = false; // Disabled by default for direct interaction
        this.conversationFlowEnabled = true;
        this.microphonePermissionGranted = false;
        
        // All 11 Available modes
        this.modes = {
            'assistant': assistantMode,
            'navigation': navigationMode,
            'object-detection': objectDetectionMode,
            'walking': walkingMode,
            'emergency': emergencyMode,
            'security': securityMode,
            'medical': medicalMode,
            'fire': fireMode,
            'police': policeMode,
            'reading': readingMode,
            'bus-detection': busDetectionMode,
            'scene-describe': sceneDescribeMode,
            'traffic-analysis': trafficAnalysisMode,
            'environment-analysis': environmentAnalysisMode
        };
        
        // Mode keywords for voice activation - expanded with natural, simple, real-world phrases
        this.modeKeywords = {
            'assistant': [
                'assistant', 'assistant mode', 'be my assistant', 'talk to me',
                'general help', 'questions', 'chat', 'hey', 'hello', 'hi',
                'i have a question', 'can you help', 'help me with something',
                'i need help', 'talk', 'speak to me', 'are you there',
                'you there', 'listen', 'hey buddy', 'friend', 'yo'
            ],
            'navigation': [
                'navigation', 'navigation mode', 'help me navigate', 'guide me to my destination',
                'navigate', 'directions', 'take me to', 'where is', 'how to go',
                'i want to go', 'going to', 'need to reach', 'find the way',
                'show me the way', 'which way', 'how do i get', 'get me to',
                'bring me to', 'lead me', 'where do i go', 'path to',
                'route to', 'i need directions', 'guide me there', 'take me there',
                'want to go to', 'going somewhere', 'need to go', 'help me reach',
                'getting to', 'way to', 'road to', 'how far', 'distance to'
            ],
            'object-detection': [
                'object detection', 'detect objects', 'what\'s around me', 'find objects',
                'what do you see', 'identify objects', 'what is this', 'find my', 'locate',
                'what\'s here', 'what\'s there', 'what\'s in front', 'look for',
                'search for', 'where is my', 'where are my', 'find the', 'spot',
                'can you see', 'do you see', 'is there a', 'are there any',
                'looking for', 'search', 'hunt for', 'what things', 'stuff around',
                'things near me', 'objects near', 'nearby objects', 'check for',
                'scan for', 'detect', 'identify', 'recognize', 'what\'s that',
                'tell me what', 'show me what', 'find', 'where did i put',
                'lost my', 'can\'t find', 'help me find', 'looking for my'
            ],
            'walking': [
                'walking', 'walking mode', 'guide me as i walk', 'walk with me',
                'help me walk', 'walking guidance', 'step by step', 'guide me',
                'i\'m walking', 'walking now', 'start walking', 'going for a walk',
                'walk mode', 'pedestrian mode', 'footpath', 'sidewalk',
                'walking around', 'stroll', 'moving around', 'on foot',
                'help me move', 'guide my steps', 'watch my path', 'clear path',
                'obstacle check', 'path clear', 'way ahead', 'what\'s ahead',
                'in front of me', 'walk safely', 'safe to walk', 'guide my walk'
            ],
            'emergency': [
                'emergency', 'sos', 'call 911', 'urgent help', 'emergency help',
                'help', 'please help', 'need help now', 'urgent', 'critical',
                'life threatening', 'dying', 'save me', 'rescue', 'mayday',
                'alert', 'panic', 'scared', 'terrified', 'trouble',
                'big trouble', 'serious', 'bad situation', 'crisis'
            ],
            'security': [
                'security', 'guard mode', 'monitor surroundings', 'security mode',
                'watch around me', 'safety mode', 'protect me', 'keep watch',
                'surveillance', 'monitor', 'watch out', 'be alert', 'stay alert',
                'check surroundings', 'scan area', 'is it safe', 'am i safe',
                'feel unsafe', 'not safe', 'danger around', 'threats',
                'suspicious', 'something wrong', 'watch my back', 'guard'
            ],
            'medical': [
                'medical', 'health mode', 'i need medical help', 'medical emergency',
                'health emergency', 'doctor', 'i\'m hurt', 'i\'m sick', 'ambulance',
                'hospital', 'injury', 'injured', 'bleeding', 'pain', 'hurting',
                'not feeling well', 'feeling sick', 'unwell', 'ill', 'fever',
                'faint', 'fainting', 'dizzy', 'can\'t breathe', 'chest pain',
                'heart', 'stroke', 'seizure', 'allergic', 'medicine', 'pills',
                'first aid', 'health issue', 'health problem', 'call doctor',
                'need a doctor', 'get help', 'medical attention'
            ],
            'fire': [
                'fire', 'fire detection', 'i smell smoke', 'there\'s a fire',
                'fire emergency', 'smoke', 'burning', 'call fire department',
                'flames', 'something burning', 'smoke smell', 'hot', 'heat',
                'fire alarm', 'evacuate', 'get out', 'building on fire',
                'house fire', 'kitchen fire', 'fire brigade', 'firemen',
                'firefighters', 'burning smell', 'gas leak', 'gas smell'
            ],
            'police': [
                'police', 'call police', 'call the cops', 'police mode',
                'i\'m in danger', 'someone is following me', 'crime', 'robbery',
                'thief', 'robber', 'burglar', 'stealing', 'stolen', 'mugged',
                'attacked', 'assault', 'violence', 'fight', 'threatening',
                'harassing', 'stalker', 'stalking', 'intruder', 'break in',
                'breaking in', 'cops', 'officer', 'law enforcement', 'help police',
                'someone broke in', 'being followed', 'chasing me', 'after me'
            ],
            'reading': [
                'reading', 'read this', 'ocr mode', 'reading mode',
                'read text', 'what does this say', 'read for me', 'text reading',
                'read it', 'read out', 'read aloud', 'what\'s written',
                'what does it say', 'read the sign', 'read the label',
                'read the menu', 'read the paper', 'read document', 'read letter',
                'read message', 'read instructions', 'read directions',
                'read the box', 'read package', 'read bottle', 'read medicine',
                'read price', 'read name', 'spell it', 'what word', 'words here',
                'text here', 'can you read', 'help me read', 'reading help'
            ],
            'bus-detection': [
                'bus', 'bus detection', 'which bus', 'public transport',
                'find my bus', 'bus number', 'waiting for bus', 'bus mode',
                'bus stop', 'bus coming', 'is this my bus', 'what bus',
                'bus route', 'catch bus', 'take bus', 'get on bus',
                'right bus', 'correct bus', 'bus arrival', 'next bus',
                'any bus', 'which number', 'bus here', 'bus arriving',
                'transport', 'public bus', 'city bus', 'local bus'
            ],
            'scene-describe': [
                'describe', 'scene', 'surroundings', 'look around',
                'describe scene', 'describe surroundings', 'what\'s around',
                'tell me about', 'explain what', 'what can you see',
                'describe this place', 'where am i', 'what place is this',
                'describe location', 'describe area', 'describe room',
                'what\'s happening', 'what\'s going on', 'situation',
                'explain surroundings', 'paint a picture', 'visual description',
                'describe everything', 'full description', 'detailed description',
                'what do you notice', 'observations', 'tell me everything'
            ],
            'traffic-analysis': [
                'traffic', 'traffic analysis', 'crossing', 'cross the road',
                'is it safe to cross', 'traffic light', 'signal', 'pedestrian',
                'road safety', 'can i cross', 'cross street', 'cross now',
                'safe to cross', 'when to cross', 'crossing help', 'zebra crossing',
                'crosswalk', 'road crossing', 'cars coming', 'vehicles',
                'traffic coming', 'busy road', 'street crossing', 'intersection',
                'junction', 'red light', 'green light', 'walk signal',
                'don\'t walk', 'stop light', 'traffic signal', 'cross safely'
            ],
            'environment-analysis': [
                'weather', 'environment', 'clouds', 'rain', 'is it going to rain',
                'weather check', 'sky', 'sunny', 'cloudy', 'outdoor conditions',
                'environment analysis', 'lighting', 'bright', 'dark', 'dim',
                'daytime', 'nighttime', 'morning', 'evening', 'afternoon',
                'hot outside', 'cold outside', 'temperature', 'humid',
                'windy', 'wind', 'storm', 'stormy', 'clear sky', 'overcast',
                'sunshine', 'shade', 'shadow', 'light level', 'visibility',
                'fog', 'foggy', 'mist', 'misty', 'hazy', 'weather like'
            ]
        };
        
        // Quick emergency phrases (bypass mode for immediate action) - expanded
        this.emergencyPhrases = [
            'help me', 'call 911', 'emergency', 'fire', 'police',
            'i\'m hurt', 'attack', 'danger', 'help', 'save me', 'dying',
            'can\'t breathe', 'heart attack', 'stroke', 'bleeding',
            'unconscious', 'fallen', 'i fell', 'accident', 'crash',
            'someone help', 'anybody help', 'please help', 'urgent',
            'need help', 'get help', 'call for help', 'sos', 'mayday'
        ];
        
        // Motion detection for auto walking mode
        this.motionDetection = {
            enabled: true,
            lastMotionTime: 0,
            motionThreshold: 2.0, // m/s²
            autoWalkingDelay: 3000 // 3 seconds of motion before auto-start
        };
    }
    
    /**
     * Initialize the application
     * Now follows Python backend boot sequence
     */
    async init() {
        console.log('[App] Initializing BlindNav+...');
        
        try {
            // Initialize camera manager first
            if (typeof cameraManager !== 'undefined') {
                cameraManager.init();
            }
            
            // Setup event listeners
            this.setupEventListeners();
            
            // Setup speech callbacks
            this.setupSpeechCallbacks();
            
            // Setup motion detection for auto-walking
            this.setupMotionDetection();
            
            // Load saved settings
            this.loadSettings();
            
            // Hide loading screen and show app
            document.getElementById('loading-screen').classList.add('hidden');
            document.getElementById('app').classList.remove('hidden');
            
            this.isInitialized = true;
            
            // Setup system start/stop button
            this.setupSystemStartButton();
            
            console.log('[App] Initialization complete. Click Start to begin boot sequence.');
            
        } catch (error) {
            console.error('[App] Initialization error:', error);
            this.updateLoadingProgress(0, `Error: ${error.message}`);
            speechManager.speak('There was an error starting the application. Please refresh the page.');
        }
    }
    
    /**
     * Wait for speech synthesis to be ready
     */
    async waitForSpeech() {
        return new Promise(resolve => {
            if (speechManager.isSynthesisSupported()) {
                setTimeout(resolve, 1000);
            } else {
                console.warn('[App] Speech synthesis not supported');
                resolve();
            }
        });
    }
    
    /**
     * Initialize Voice-UI Hybrid System
     */
    async initVoiceUIHybrid() {
        console.log('[App] Initializing voice-UI hybrid system...');
        
        try {
            // Initialize hybrid controller if available
            if (typeof voiceUIHybridController !== 'undefined') {
                await voiceUIHybridController.init();
                
                // Setup callbacks
                voiceUIHybridController.onModeSwitch = (from, to, reason) => {
                    console.log(`[App] Voice-UI mode switch: ${from} -> ${to} (${reason})`);
                    this.voiceUIMode = to;
                };
                
                voiceUIHybridController.onVoiceCommand = (transcript) => {
                    this.handleVoiceCommand(transcript);
                };
                
                voiceUIHybridController.onUIAction = (action, data) => {
                    this.handleUIAction(action, data);
                };
                
                console.log('[App] Voice-UI hybrid system ready');
            }
            
            // Initialize wake word service separately if hybrid controller not available
            if (typeof wakeWordService !== 'undefined' && typeof voiceUIHybridController === 'undefined') {
                await wakeWordService.init();
                this.setupWakeWordCallbacks();
            }
            
            // Initialize conversation flow manager
            if (typeof conversationFlowManager !== 'undefined') {
                conversationFlowManager.onSpeak = (text, style) => {
                    this.speakWithStyle(text, style);
                };
                
                conversationFlowManager.onFlowComplete = (flowId, state) => {
                    this.handleConversationFlowComplete(flowId, state);
                };
                
                conversationFlowManager.onSuggestUIFallback = (reason) => {
                    this.activateUIFallback(reason);
                };
            }
            
            // Initialize UI fallback system
            if (typeof uiFallbackSystem !== 'undefined') {
                uiFallbackSystem.init();
                
                uiFallbackSystem.onFallbackActivate = (reason) => {
                    console.log('[App] UI fallback activated:', reason);
                };
                
                uiFallbackSystem.onUIAction = (action, data) => {
                    this.handleUIAction(action, data);
                };
            }
            
        } catch (error) {
            console.error('[App] Voice-UI hybrid initialization error:', error);
        }
    }
    
    /**
     * Setup wake word callbacks (when not using hybrid controller)
     */
    setupWakeWordCallbacks() {
        if (typeof wakeWordService === 'undefined') return;
        
        wakeWordService.onWakeWordDetected = (transcript) => {
            console.log('[App] Wake word detected');
            speechManager.speak("Yes, I'm listening.");
        };
        
        wakeWordService.onCommandReceived = (transcript) => {
            this.handleVoiceCommand(transcript);
        };
        
        wakeWordService.onError = (errorType, message) => {
            console.error('[App] Wake word error:', errorType, message);
            if (typeof uiFallbackSystem !== 'undefined') {
                uiFallbackSystem.reportFailure(errorType === 'permission-denied' ? 'microphone' : 'recognition');
            }
        };
    }
    
    /**
     * Unlock audio playback (required by browsers on user gesture)
     * Must be called from a user interaction event (click, touch, etc.)
     */
    async unlockAudio() {
        console.log('[App] Unlocking audio...');
        
        // 1. Unlock Web Audio API
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            if (audioContext.state === 'suspended') {
                await audioContext.resume();
            }
            // Create a silent oscillator to fully unlock
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            gainNode.gain.value = 0; // Silent
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            oscillator.start();
            oscillator.stop(audioContext.currentTime + 0.001);
            console.log('[App] AudioContext unlocked');
        } catch (e) {
            console.warn('[App] AudioContext unlock failed:', e);
        }
        
        // 2. Unlock Speech Synthesis (the critical one!)
        try {
            const synth = window.speechSynthesis;
            
            // Cancel any pending speech
            synth.cancel();
            
            // Force load voices
            let voices = synth.getVoices();
            console.log('[App] Initial voices:', voices.length);
            
            // Wait for voices if not loaded
            if (voices.length === 0) {
                await new Promise((resolve) => {
                    const checkVoices = () => {
                        voices = synth.getVoices();
                        if (voices.length > 0) {
                            resolve();
                        } else {
                            setTimeout(checkVoices, 50);
                        }
                    };
                    synth.onvoiceschanged = () => {
                        voices = synth.getVoices();
                        if (voices.length > 0) resolve();
                    };
                    checkVoices();
                    // Timeout after 2 seconds
                    setTimeout(resolve, 2000);
                });
                console.log('[App] Voices after wait:', voices.length);
            }
            
            // Speak a silent/short utterance to unlock
            const unlockUtterance = new SpeechSynthesisUtterance(' ');
            unlockUtterance.volume = 0.01; // Nearly silent
            unlockUtterance.rate = 10; // Fast
            
            await new Promise((resolve) => {
                unlockUtterance.onend = resolve;
                unlockUtterance.onerror = resolve;
                synth.speak(unlockUtterance);
                setTimeout(resolve, 500); // Fallback
            });
            
            console.log('[App] Speech synthesis unlocked');
        } catch (e) {
            console.warn('[App] Speech synthesis unlock failed:', e);
        }
        
        // Small delay to ensure everything is ready
        await new Promise(r => setTimeout(r, 100));
        console.log('[App] Audio unlock complete');
    }
    
    /**
     * Setup motion detection for auto-walking mode
     */
    setupMotionDetection() {
        if (!this.motionDetection.enabled) return;
        
        if ('DeviceMotionEvent' in window) {
            window.addEventListener('devicemotion', (event) => {
                this.handleDeviceMotion(event);
            });
            console.log('[App] Motion detection enabled');
        }
    }
    
    /**
     * Request microphone permission explicitly
     */
    async requestMicrophonePermission() {
        try {
            console.log('[App] Requesting microphone permission...');
            
            // Request microphone access
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            
            // Stop the stream immediately (we just needed permission)
            stream.getTracks().forEach(track => track.stop());
            
            this.microphonePermissionGranted = true;
            console.log('[App] Microphone permission granted');
            
            return true;
        } catch (error) {
            console.error('[App] Microphone permission denied:', error);
            this.microphonePermissionGranted = false;
            
            // Inform user about the issue
            speechManager.speak(
                'Microphone access was denied. Please allow microphone access in your browser settings to use voice commands. ' +
                'You can still use the screen buttons to interact with the app.',
                true
            );
            
            // Show UI fallback
            if (typeof uiFallbackSystem !== 'undefined') {
                uiFallbackSystem.reportFailure('microphone');
            }
            
            return false;
        }
    }
    
    /**
     * Setup the main system Start/Stop button
     */
    setupSystemStartButton() {
        const startBtn = document.getElementById('system-start-btn');
        if (!startBtn) {
            console.warn('[App] System start button not found');
            return;
        }
        
        startBtn.addEventListener('click', () => {
            if (this.isSystemRunning) {
                this.stopSystem();
            } else {
                this.startSystem();
            }
        });
        
        console.log('[App] System start button initialized');
    }
    
    /**
     * Start the BlindNav+ system - runs full boot sequence like Python backend
     */
    async startSystem() {
        if (this.isSystemRunning) return;
        
        console.log('[App] Starting BlindNav+ system with boot sequence...');
        
        // CRITICAL: Unlock audio on user gesture (required by browsers)
        await this.unlockAudio();
        
        const startBtn = document.getElementById('system-start-btn');
        if (startBtn) {
            // Show starting state
            startBtn.classList.add('starting');
            startBtn.classList.remove('running');
            startBtn.querySelector('.start-icon').textContent = '⏳';
            startBtn.querySelector('.start-text').textContent = 'Booting...';
            startBtn.querySelector('.start-subtext').textContent = 'Please wait...';
        }
        
        this.isSystemRunning = true;
        
        // Setup boot callbacks
        if (typeof systemBoot !== 'undefined') {
            systemBoot.onBootProgress = (percent, message) => {
                console.log(`[App] Boot progress: ${percent}% - ${message}`);
                if (startBtn) {
                    startBtn.querySelector('.start-subtext').textContent = message;
                }
            };
            
            systemBoot.onBootComplete = (data) => {
                console.log('[App] Boot complete:', data);
                this.userName = data.userName;
                this.userLanguage = data.userLanguage;
                this.bootComplete = true;
                
                // Mark microphone as granted (boot already requested it)
                if (data.systemStatus && data.systemStatus.microphone) {
                    this.microphonePermissionGranted = data.systemStatus.microphone.available;
                } else {
                    this.microphonePermissionGranted = true; // Assume granted if boot completed
                }
                
                // Save preferences
                localStorage.setItem('blindnav_user_name', this.userName);
                
                // Update button to running state
                if (startBtn) {
                    startBtn.classList.remove('starting');
                    startBtn.classList.add('running');
                    startBtn.querySelector('.start-icon').textContent = '⏹️';
                    startBtn.querySelector('.start-text').textContent = 'Stop BlindNav+';
                    startBtn.querySelector('.start-subtext').textContent = 'Tap to stop voice assistance';
                }
                
                // Start continuous listening
                console.log('[App] Starting continuous listening...');
                this.startContinuousListening();
                
                // Start interaction loop
                this.startInteractionLoop();
                
                console.log('[App] BlindNav+ system is now running');
            };
            
            systemBoot.onBootError = (error) => {
                console.error('[App] Boot error:', error);
                this.isSystemRunning = false;
                
                if (startBtn) {
                    startBtn.classList.remove('starting', 'running');
                    startBtn.querySelector('.start-icon').textContent = '▶️';
                    startBtn.querySelector('.start-text').textContent = 'Start BlindNav+';
                    startBtn.querySelector('.start-subtext').textContent = 'Boot failed. Tap to retry.';
                }
            };
            
            // Check if returning user for quick boot
            const savedName = localStorage.getItem('blindnav_user_name');
            if (savedName && savedName !== 'friend') {
                systemBoot.userName = savedName;
                // Ask if they want quick boot
                // For now, always do full boot on first use after changes
                await systemBoot.startBoot();
            } else {
                // Full boot for new users
                await systemBoot.startBoot();
            }
        } else {
            // Fallback if systemBoot not available
            console.log('[App] System boot module not found, using fallback...');
            this.fallbackStartSystem(startBtn);
        }
    }
    
    /**
     * Fallback start system (if boot module not available)
     */
    async fallbackStartSystem(startBtn) {
        await this.requestMicrophonePermission();
        this.speakWelcome();
        
        setTimeout(() => {
            this.startContinuousListening();
            
            if (startBtn) {
                startBtn.classList.remove('starting');
                startBtn.classList.add('running');
                startBtn.querySelector('.start-icon').textContent = '⏹️';
                startBtn.querySelector('.start-text').textContent = 'Stop BlindNav+';
                startBtn.querySelector('.start-subtext').textContent = 'Tap to stop voice assistance';
            }
            
            this.startInteractionLoop();
        }, 5000);
    }
    
    /**
     * Stop the BlindNav+ system - deactivates voice and all features
     */
    stopSystem() {
        if (!this.isSystemRunning) return;
        
        console.log('[App] Stopping BlindNav+ system...');
        
        // First set flags to prevent auto-restart of speech recognition
        this.isSystemRunning = false;
        this.bootComplete = false;
        
        // Play shutdown beep
        if (typeof systemBoot !== 'undefined') {
            systemBoot.playBeep(800, 300);
        }
        
        // Stop any current mode
        if (this.currentMode) {
            this.exitCurrentMode();
        }
        
        // Stop speech recognition (won't auto-restart since isSystemRunning is false)
        speechManager.stopListening();
        
        // Stop wake word service
        if (typeof wakeWordService !== 'undefined') {
            wakeWordService.stop();
        }
        
        // Stop any ongoing speech
        speechManager.stopSpeaking();
        
        // Stop interaction loop
        this.stopInteractionLoop();
        
        // Say goodbye with user name
        const goodbyeName = this.userName || 'friend';
        speechManager.speak(`Thank you for using the system, ${goodbyeName}. Always here to guide you again anytime. Goodbye!`);
        
        // Update button to stopped state
        const startBtn = document.getElementById('system-start-btn');
        if (startBtn) {
            startBtn.classList.remove('running', 'starting');
            startBtn.querySelector('.start-icon').textContent = '▶️';
            startBtn.querySelector('.start-text').textContent = 'Start BlindNav+';
            startBtn.querySelector('.start-subtext').textContent = 'Tap to begin voice assistance';
        }
        
        // Hide listening banner
        const listeningBanner = document.getElementById('listening-banner');
        if (listeningBanner) {
            listeningBanner.classList.add('hidden');
        }
        
        // Update voice button UI
        const voiceBtn = document.getElementById('voice-btn');
        if (voiceBtn) {
            voiceBtn.classList.remove('listening');
            const statusEl = voiceBtn.querySelector('.voice-status');
            if (statusEl) statusEl.textContent = 'System stopped';
        }
        
        document.getElementById('mic-status')?.classList.remove('active');
        
        console.log('[App] BlindNav+ system stopped');
    }
    
    /**
     * Start the interaction loop - keeps system responsive and proactive
     */
    startInteractionLoop() {
        console.log('[App] Starting interaction loop');
        
        // Track last interaction time
        this.lastInteractionTime = Date.now();
        this.interactionLoopActive = true;
        
        // Check periodically if user needs assistance
        this.interactionLoopInterval = setInterval(() => {
            if (!this.isSystemRunning || !this.interactionLoopActive) {
                this.stopInteractionLoop();
                return;
            }
            
            const timeSinceInteraction = Date.now() - this.lastInteractionTime;
            
            // If no interaction for 60 seconds and no active mode, offer help
            if (timeSinceInteraction > 60000 && !this.currentMode && !speechManager.isSpeaking) {
                this.offerProactiveHelp();
                this.lastInteractionTime = Date.now(); // Reset to avoid repeated prompts
            }
            
            // Ensure listening is still active
            this.ensureContinuousListening();
            
        }, 30000); // Check every 30 seconds
    }
    
    /**
     * Stop the interaction loop
     */
    stopInteractionLoop() {
        console.log('[App] Stopping interaction loop');
        this.interactionLoopActive = false;
        if (this.interactionLoopInterval) {
            clearInterval(this.interactionLoopInterval);
            this.interactionLoopInterval = null;
        }
    }
    
    /**
     * Offer proactive help when user has been idle
     */
    offerProactiveHelp() {
        if (!this.isSystemRunning || this.currentMode || speechManager.isSpeaking) return;
        
        const helpMessages = [
            "I'm still here to help. You can say navigate, read, detect objects, or help for more options.",
            "Need assistance? Say what you'd like to do, or say help for a list of features.",
            "I'm ready when you are. Say Hey BlindNav followed by your request.",
            "Still here and listening. Would you like to navigate somewhere, or detect what's around you?"
        ];
        
        const message = helpMessages[Math.floor(Math.random() * helpMessages.length)];
        speechManager.speak(message, true);
    }
    
    /**
     * Record user interaction (call this when user interacts)
     */
    recordInteraction() {
        this.lastInteractionTime = Date.now();
    }
    
    /**
     * Provide immediate acknowledgment to user input (assistant-like behavior)
     */
    acknowledgeInput() {
        // Play a subtle acknowledgment sound or brief verbal cue
        // This makes the system feel responsive like a real assistant
        if (typeof wakeWordService !== 'undefined' && wakeWordService.audioContext) {
            try {
                const ctx = wakeWordService.audioContext;
                const oscillator = ctx.createOscillator();
                const gainNode = ctx.createGain();
                
                oscillator.connect(gainNode);
                gainNode.connect(ctx.destination);
                
                oscillator.frequency.value = 600;
                oscillator.type = 'sine';
                gainNode.gain.value = 0.1;
                
                oscillator.start();
                gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
                oscillator.stop(ctx.currentTime + 0.1);
            } catch (e) {
                // Silent fail for audio
            }
        }
    }
    
    /**
     * Speak with appropriate assistant-style phrasing
     * @param {string} message - The message to speak
     * @param {string} style - Style: 'confirmation', 'information', 'question', 'error'
     */
    speakAssistant(message, style = 'information') {
        const prefixes = {
            confirmation: ['Sure!', 'Okay!', 'Got it!', 'Alright!', 'Done!'],
            information: ['', 'Here\'s what I found:', 'Let me tell you:'],
            question: ['', 'I\'d like to know:', 'Please tell me:'],
            error: ['Sorry,', 'I\'m having trouble with that.', 'Hmm,'],
            thinking: ['Let me check...', 'One moment...', 'Looking into that...']
        };
        
        const prefix = prefixes[style] ? 
            prefixes[style][Math.floor(Math.random() * prefixes[style].length)] : '';
        
        const fullMessage = prefix ? `${prefix} ${message}` : message;
        speechManager.speak(fullMessage, true);
    }
    
    /**
     * Ask a question and automatically activate microphone for response
     * Use this whenever the system needs voice input from the user
     * @param {string} question - The question to ask
     * @param {Function} onResponse - Callback with user's response
     * @param {number} timeout - How long to wait for response (ms)
     * @returns {Promise<string|null>} - User's response or null
     */
    async askQuestion(question, onResponse = null, timeout = 10000) {
        console.log('[App] Asking question:', question);
        
        // Use the speech manager's speakAndListen for automatic mic activation
        const response = await speechManager.speakAndListen(question, (resp) => {
            if (resp && onResponse) {
                onResponse(resp);
            }
        }, timeout);
        
        // If no response, provide guidance
        if (!response) {
            speechManager.speak("I didn't hear a response. Just speak anytime, I'm always listening.", true);
            this.ensureContinuousListening();
        }
        
        return response;
    }
    
    /**
     * Smart speak - automatically detects if message is a question and activates mic
     * @param {string} message - Message to speak
     * @param {Function} onResponse - Optional callback if it's a question
     * @param {boolean} forceQuestion - Force treat as question
     */
    async smartSpeak(message, onResponse = null, forceQuestion = false) {
        // Check if this is a question that expects an answer
        const isQuestion = forceQuestion || speechManager.isQuestion(message);
        
        if (isQuestion) {
            // Use ask question flow with auto mic activation
            return await this.askQuestion(message, onResponse);
        } else {
            // Regular speech
            speechManager.speak(message, true);
            return null;
        }
    }

    /**
     * Handle device motion for auto-walking mode
     */
    handleDeviceMotion(event) {
        // Only process motion when system is running
        if (!this.isSystemRunning || !this.motionDetection.enabled || this.currentMode) return;
        
        const acceleration = event.accelerationIncludingGravity;
        if (!acceleration) return;
        
        // Calculate total acceleration
        const totalAccel = Math.sqrt(
            Math.pow(acceleration.x || 0, 2) +
            Math.pow(acceleration.y || 0, 2) +
            Math.pow(acceleration.z || 0, 2)
        ) - 9.81; // Subtract gravity
        
        if (Math.abs(totalAccel) > this.motionDetection.motionThreshold) {
            const now = Date.now();
            
            if (this.motionDetection.lastMotionTime === 0) {
                this.motionDetection.lastMotionTime = now;
            } else if (now - this.motionDetection.lastMotionTime > this.motionDetection.autoWalkingDelay) {
                // Sustained motion detected - offer walking mode
                if (this.isCameraConnected && !this.currentMode) {
                    this.offerAutoWalkingMode();
                    this.motionDetection.lastMotionTime = 0;
                }
            }
        } else {
            this.motionDetection.lastMotionTime = 0;
        }
    }
    
    /**
     * Offer auto walking mode when motion detected - auto activates mic for response
     */
    async offerAutoWalkingMode() {
        // Don't spam the user
        if (this._lastWalkingOffer && Date.now() - this._lastWalkingOffer < 60000) return;
        this._lastWalkingOffer = Date.now();
        
        // Use askQuestion for auto mic activation
        const response = await this.askQuestion(
            "I detect you're moving. Would you like me to activate walking guidance? Say yes or no."
        );
        
        if (response) {
            const answer = response.toLowerCase();
            if (answer.includes('yes') || answer.includes('yeah') || answer.includes('sure') || 
                answer.includes('okay') || answer.includes('ok') || answer.includes('please')) {
                this.activateMode('walking');
            } else if (answer.includes('no') || answer.includes('nope') || answer.includes('cancel')) {
                speechManager.speak("Okay, I'll stay ready. Just say walking mode if you change your mind.");
            }
        }
    }
    
    /**
     * Handle UI action from fallback system
     */
    handleUIAction(action, data = {}) {
        console.log('[App] UI action:', action, data);
        
        switch (action) {
            case 'emergency':
                this.activateMode('emergency');
                break;
            case 'navigation':
                this.activateMode('navigation');
                break;
            case 'reading':
                this.activateMode('reading');
                break;
            case 'describe':
                this.activateMode('scene-describe');
                break;
            case 'navigate':
                if (data.destination) {
                    this.startNavigationTo(data.destination);
                }
                break;
            case 'mode_control':
                this.handleModeControl(data.mode, data.control);
                break;
        }
    }
    
    /**
     * Handle mode control from UI
     */
    handleModeControl(mode, control) {
        const modeInstance = this.modes[mode];
        if (!modeInstance) return;
        
        // Try to call the control method
        if (typeof modeInstance[control] === 'function') {
            modeInstance[control]();
        }
    }
    
    /**
     * Start navigation to a specific destination
     */
    startNavigationTo(destination) {
        this.activateMode('navigation');
        
        // Pass destination to navigation mode
        if (typeof navigationMode !== 'undefined' && navigationMode.setDestination) {
            navigationMode.setDestination(destination);
        }
    }
    
    /**
     * Handle conversation flow completion
     */
    handleConversationFlowComplete(flowId, state) {
        console.log('[App] Conversation flow completed:', flowId, state);
        
        switch (flowId) {
            case 'navigation':
                if (state.destination) {
                    this.startNavigationTo(state.destination);
                }
                break;
            case 'reading':
                this.activateMode('reading');
                break;
            case 'bus_detection':
                this.activateMode('bus-detection');
                if (state.busNumber && typeof busDetectionMode !== 'undefined') {
                    busDetectionMode.setBusNumber?.(state.busNumber);
                }
                break;
        }
    }
    
    /**
     * Activate UI fallback
     */
    activateUIFallback(reason) {
        if (typeof uiFallbackSystem !== 'undefined') {
            uiFallbackSystem.activate(reason);
        }
    }
    
    /**
     * Speak with style adjustment
     */
    speakWithStyle(text, style = 'normal') {
        let rate = speechManager.settings.rate;
        
        switch (style) {
            case 'slow_calm':
                rate = 0.85;
                break;
            case 'urgent':
                rate = 1.2;
                break;
        }
        
        const originalRate = speechManager.settings.rate;
        speechManager.settings.rate = rate;
        speechManager.speak(text, true);
        speechManager.settings.rate = originalRate;
    }
    
    /**
     * Speak simple welcome message
     */
    speakWelcome() {
        const welcome = `Welcome to BlindNav Plus! Tap the Start Navigation button or say "Hey BlindNav" to begin.`;
        
        speechManager.speak(welcome, true);
    }
    
    /**
     * Start continuous listening - voice commands work automatically
     */
    startContinuousListening() {
        console.log('[App] Starting continuous listening mode - voice commands always active');
        
        // Start speech recognition
        if (speechManager && speechManager.recognition) {
            try {
                speechManager.startListening();
                console.log('[App] Speech recognition started');
            } catch (e) {
                console.error('[App] Failed to start speech recognition:', e);
            }
        }
        
        // Update UI to show listening state
        const voiceBtn = document.getElementById('voice-btn');
        if (voiceBtn) {
            voiceBtn.classList.add('listening');
            const statusEl = voiceBtn.querySelector('.voice-status');
            if (statusEl) statusEl.textContent = 'Always listening';
        }
        
        // Show listening banner
        const listeningBanner = document.getElementById('listening-banner');
        if (listeningBanner) listeningBanner.classList.remove('hidden');
        
        // Update mic status
        document.getElementById('mic-status')?.classList.add('active');
    }
    
    /**
     * Activate microphone for voice input (push-to-talk)
     */
    async activateMicrophone() {
        console.log('[App] Activating microphone for voice input');
        
        // Request permission if not granted
        if (!this.microphonePermissionGranted) {
            const granted = await this.requestMicrophonePermission();
            if (!granted) {
                speechManager.speak('Microphone access denied. Please allow microphone in browser settings.');
                return;
            }
        }
        
        // Start listening
        const started = speechManager.startListening();
        
        if (started) {
            console.log('[App] Microphone activated - listening');
            
            // Update UI
            const voiceBtn = document.getElementById('voice-btn');
            if (voiceBtn) {
                voiceBtn.classList.add('listening');
                const statusEl = voiceBtn.querySelector('.voice-status');
                if (statusEl) statusEl.textContent = 'Listening... Speak now!';
            }
            
            // Show listening banner
            const listeningBanner = document.getElementById('listening-banner');
            if (listeningBanner) listeningBanner.classList.remove('hidden');
            
            // Update mic status
            document.getElementById('mic-status')?.classList.add('active');
            
            // Play a brief tone to indicate listening started
            this.playListeningTone();
        } else {
            speechManager.speak('Could not start microphone. Please try again.');
        }
    }

    /**
     * Activate microphone for interactive user input with feedback
     * This is called when user clicks the microphone button
     */
    async activateMicrophoneForInput() {
        console.log('[App] Activating microphone for user input');
        
        // Request permission if not granted
        if (!this.microphonePermissionGranted) {
            const granted = await this.requestMicrophonePermission();
            if (!granted) {
                speechManager.speak('Microphone access denied. Please allow microphone in your browser settings to use voice commands.');
                return;
            }
        }
        
        // Play acknowledgment tone
        this.playListeningTone();
        
        // Update UI to show we're listening
        speechManager.updateListeningUI(true, 'Listening... Speak now!');
        
        // Give immediate feedback
        const currentMode = this.currentMode || 'assistant';
        let prompt = "I'm listening. Go ahead.";
        
        // Context-aware prompt based on current mode
        if (currentMode === 'navigation') {
            prompt = "I'm listening. Tell me where to go or ask about your surroundings.";
        } else if (currentMode === 'object-detection') {
            prompt = "I'm listening. What would you like me to find?";
        } else if (currentMode === 'scene-describe') {
            prompt = "I'm listening. Say 'describe' for a full view, or ask about something specific.";
        } else if (currentMode === 'reading') {
            prompt = "I'm listening. Say 'read' to scan text, or ask for help.";
        } else if (currentMode === 'bus-detection') {
            prompt = "I'm listening. Tell me your bus number or ask about buses.";
        } else {
            prompt = "I'm listening. Say a mode name like navigation, reading, or describe. Or ask me anything.";
        }
        
        // Speak prompt and then listen for response
        const response = await speechManager.promptAndListen(prompt, null, 8000);
        
        if (response) {
            console.log('[App] User said:', response);
            // Process the voice command
            this.handleVoiceCommand(response);
        } else {
            speechManager.speak("I didn't catch that. Tap the microphone again or just speak - I'm always listening.");
            // Ensure continuous listening is restarted
            this.ensureContinuousListening();
        }
    }
    
    /**
     * Play a brief tone to indicate listening started
     */
    playListeningTone() {
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.frequency.value = 880; // Higher pitch for "listening" tone
            oscillator.type = 'sine';
            
            gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15);
            
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.15);
        } catch (e) {
            // Ignore audio errors
        }
    }
    
    /**
     * Update loading progress
     * @param {number} percent - Progress percentage
     * @param {string} status - Status message
     */
    updateLoadingProgress(percent, status) {
        const progressBar = document.getElementById('progress-bar');
        const statusEl = document.getElementById('loading-status');
        
        if (progressBar) progressBar.style.width = `${percent}%`;
        if (statusEl) statusEl.textContent = status;
    }
    
    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Connect button (ESP32)
        document.getElementById('connect-btn')?.addEventListener('click', () => {
            this.connectCamera();
        });
        
        // Local camera button
        document.getElementById('local-camera-btn')?.addEventListener('click', async () => {
            console.log('[App] Local camera button clicked');
            await this.connectLocalCamera();
        });
        
        // Enter key in IP input
        document.getElementById('esp32-ip')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.connectCamera();
            }
        });
        
        // Mode buttons
        document.querySelectorAll('.mode-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const mode = btn.dataset.mode;
                this.activateMode(mode);
            });
        });
        
        // Stop mode button
        document.getElementById('stop-mode-btn')?.addEventListener('click', () => {
            this.stopCurrentMode();
        });
        
        // Voice button - activates microphone and provides interactive feedback
        document.getElementById('voice-btn')?.addEventListener('click', async () => {
            if (this.isSystemRunning) {
                // Activate microphone for user input
                await this.activateMicrophoneForInput();
            } else {
                speechManager.speak('Please start BlindNav+ first by tapping the Start button.');
            }
        });
        
        // Also handle mic-btn if it exists (alternative mic button)
        document.getElementById('mic-btn')?.addEventListener('click', async () => {
            if (this.isSystemRunning) {
                await this.activateMicrophoneForInput();
            } else {
                speechManager.speak('Please start the system first.');
            }
        });
        
        // Settings toggle
        document.getElementById('settings-toggle')?.addEventListener('click', () => {
            this.toggleSettings();
        });
        
        // Close settings
        document.getElementById('close-settings')?.addEventListener('click', () => {
            this.toggleSettings(false);
        });
        
        // Settings inputs
        this.setupSettingsListeners();
        
        // Camera callbacks
        cameraManager.onConnect = () => {
            this.handleCameraConnect();
        };
        
        cameraManager.onDisconnect = () => {
            this.handleCameraDisconnect();
        };
        
        cameraManager.onError = (msg) => {
            this.handleCameraError(msg);
        };
    }
    
    /**
     * Setup speech callbacks
     */
    setupSpeechCallbacks() {
        speechManager.onSpeechResult = (transcript) => {
            this.handleVoiceCommand(transcript);
        };
        
        speechManager.onSpeechStart = () => {
            console.log('[App] Speech recognition started');
            
            const voiceBtn = document.getElementById('voice-btn');
            if (voiceBtn) voiceBtn.classList.add('listening');
            
            const statusEl = voiceBtn?.querySelector('.voice-status');
            if (statusEl) statusEl.textContent = 'Listening...';
            
            document.getElementById('mic-status')?.classList.add('active');
            
            // Show listening banner
            const listeningBanner = document.getElementById('listening-banner');
            if (listeningBanner) {
                listeningBanner.classList.remove('hidden');
            }
        };
        
        speechManager.onSpeechEnd = () => {
            console.log('[App] Speech recognition ended');
            
            // In continuous mode, keep the UI showing active state since it will auto-restart
            if (this.isSystemRunning && this.continuousListening) {
                const voiceBtn = document.getElementById('voice-btn');
                if (voiceBtn) voiceBtn.classList.add('listening');
                
                const statusEl = voiceBtn?.querySelector('.voice-status');
                if (statusEl) statusEl.textContent = 'Always listening';
                
                document.getElementById('mic-status')?.classList.add('active');
                
                // Keep listening banner visible
                const listeningBanner = document.getElementById('listening-banner');
                if (listeningBanner) {
                    listeningBanner.classList.remove('hidden');
                }
            } else {
                const voiceBtn = document.getElementById('voice-btn');
                if (voiceBtn) voiceBtn.classList.remove('listening');
                
                const statusEl = voiceBtn?.querySelector('.voice-status');
                if (statusEl) statusEl.textContent = 'Ready';
                
                document.getElementById('mic-status')?.classList.remove('active');
                
                // Hide listening banner
                const listeningBanner = document.getElementById('listening-banner');
                if (listeningBanner) {
                    listeningBanner.classList.add('hidden');
                }
            }
        };
        
        speechManager.onSpeechError = (error) => {
            console.error('[App] Speech error:', error);
            
            // Hide listening banner on error
            const listeningBanner = document.getElementById('listening-banner');
            if (listeningBanner) {
                listeningBanner.classList.add('hidden');
            }
            
            // Report to UI fallback system
            if (typeof uiFallbackSystem !== 'undefined') {
                switch (error) {
                    case 'not-allowed':
                    case 'service-not-allowed':
                    case 'audio-capture':
                        uiFallbackSystem.reportFailure('microphone');
                        speechManager.speak('Microphone access was denied. Please allow microphone in your browser settings.');
                        break;
                    case 'network':
                        uiFallbackSystem.reportFailure('network');
                        break;
                    case 'no-speech':
                        // Normal, don't report - just restart
                        break;
                    default:
                        uiFallbackSystem.reportFailure('recognition');
                }
            }
            
            // In push-to-talk mode, just reset UI on error
            this.ensureContinuousListening();
        };
    }
    
    /**
     * Setup settings listeners
     */
    setupSettingsListeners() {
        // Speech rate
        document.getElementById('speech-rate')?.addEventListener('input', (e) => {
            speechManager.updateSettings({ rate: parseFloat(e.target.value) });
        });
        
        // Volume
        document.getElementById('speech-volume')?.addEventListener('input', (e) => {
            speechManager.updateSettings({ volume: parseFloat(e.target.value) });
        });
        
        // Detection sensitivity
        document.getElementById('detection-sensitivity')?.addEventListener('input', (e) => {
            detectionManager.updateSettings({ minScore: parseFloat(e.target.value) });
        });
        
        // Language
        document.getElementById('language-select')?.addEventListener('change', (e) => {
            speechManager.updateSettings({ language: e.target.value });
        });
    }
    
    /**
     * Connect to ESP32 camera
     */
    async connectCamera() {
        const ipInput = document.getElementById('esp32-ip');
        const feedback = document.getElementById('connection-feedback');
        const connectBtn = document.getElementById('connect-btn');
        
        const ip = ipInput?.value?.trim();
        
        if (!ip) {
            speechManager.speak('No IP address entered. Trying to connect to device camera instead.');
            // Fall back to local camera
            await this.connectLocalCamera();
            return;
        }
        
        // Update UI
        if (connectBtn) {
            connectBtn.textContent = 'Connecting...';
            connectBtn.disabled = true;
        }
        if (feedback) {
            feedback.textContent = 'Connecting to ESP32 camera (attempt 1 of 3)...';
            feedback.className = 'feedback';
            feedback.classList.remove('hidden');
        }
        
        speechManager.speak(`Connecting to ESP32 camera at ${ip}. Will try 3 times before switching to device camera.`, true);
        
        // Update feedback during connection attempts
        let attemptCount = 1;
        const feedbackInterval = setInterval(() => {
            attemptCount++;
            if (attemptCount <= 3 && feedback) {
                feedback.textContent = `Connecting to ESP32 camera (attempt ${attemptCount} of 3)...`;
            }
        }, 2500);
        
        // Attempt connection (will automatically fall back to local camera after 3 attempts)
        const success = await cameraManager.connect(ip);
        
        clearInterval(feedbackInterval);
        
        if (success) {
            // Camera connected (either ESP32 or local)
            setTimeout(() => {
                if (cameraManager.isConnected) {
                    this.handleCameraConnect();
                } else {
                    this.handleCameraError('Connection timed out');
                }
                if (connectBtn) {
                    connectBtn.textContent = 'Connect ESP32';
                    connectBtn.disabled = false;
                }
            }, 1000);
        } else {
            if (connectBtn) {
                connectBtn.textContent = 'Connect ESP32';
                connectBtn.disabled = false;
            }
        }
    }
    
    /**
     * Connect directly to local device camera
     */
    async connectLocalCamera() {
        console.log('[App] connectLocalCamera called');
        
        const feedback = document.getElementById('connection-feedback');
        const localBtn = document.getElementById('local-camera-btn');
        
        if (localBtn) {
            localBtn.textContent = 'Connecting...';
            localBtn.disabled = true;
        }
        if (feedback) {
            feedback.textContent = 'Accessing device camera...';
            feedback.className = 'feedback';
            feedback.classList.remove('hidden');
        }
        
        speechManager.speak('Connecting to your device camera. Please allow camera access if prompted.');
        
        try {
            // Ensure camera manager is initialized
            if (typeof cameraManager === 'undefined') {
                console.error('[App] Camera manager not available');
                speechManager.speak('Camera system not available.');
                return;
            }
            
            const success = await cameraManager.connectLocal();
            console.log('[App] Camera connect result:', success);
            
            if (localBtn) {
                localBtn.textContent = '📷 Use Device Camera';
                localBtn.disabled = false;
            }
            
            if (success) {
                this.handleCameraConnect();
            } else {
                if (feedback) {
                    feedback.textContent = 'Failed to connect camera. Please allow camera access.';
                    feedback.className = 'feedback error';
                }
                speechManager.speak('Could not connect to camera. Please check permissions.');
            }
        } catch (error) {
            console.error('[App] Camera connection error:', error);
            if (localBtn) {
                localBtn.textContent = '📷 Use Device Camera';
                localBtn.disabled = false;
            }
            if (feedback) {
                feedback.textContent = 'Camera error: ' + error.message;
                feedback.className = 'feedback error';
            }
            speechManager.speak('Camera error. Please try again.');
        }
    }
    
    /**
     * Handle successful camera connection
     */
    handleCameraConnect() {
        this.isCameraConnected = true;
        
        const feedback = document.getElementById('connection-feedback');
        const status = cameraManager.getStatus();
        const sourceText = status.sourceType === 'local' ? 'Device camera' : 'ESP32 camera';
        
        if (feedback) {
            feedback.textContent = `${sourceText} connected successfully!`;
            feedback.className = 'feedback success';
        }
        
        document.getElementById('camera-status')?.classList.add('active');
        document.getElementById('connection-status')?.classList.add('active');
        
        const cameraTypeAnnouncement = status.sourceType === 'local' 
            ? 'Your device camera is now active.' 
            : 'ESP32 camera connected.';
        
        speechManager.speak(
            `${cameraTypeAnnouncement} ` +
            'You can now use all features. ' +
            'Here are some things you can say: ' +
            '"Navigation" for walking guidance. ' +
            '"Find my phone" to locate objects. ' +
            '"Bus detection" to find your bus. ' +
            '"Reading" to read text. ' +
            '"Security" to monitor surroundings. ' +
            '"Describe" to understand what\'s around you. ' +
            'What would you like to do?'
        );
    }
    
    /**
     * Handle camera disconnection
     */
    handleCameraDisconnect() {
        this.isCameraConnected = false;
        
        document.getElementById('camera-status')?.classList.remove('active');
        document.getElementById('connection-status')?.classList.remove('active');
        
        speechManager.speak('Camera disconnected. Some features may not work. Please reconnect the camera.');
        
        // Stop current mode if it requires camera
        if (this.currentMode) {
            const cameraModes = ['navigation', 'walking', 'object-detection', 'bus-detection', 'scene-describe', 'security', 'reading'];
            if (cameraModes.includes(this.currentMode)) {
                this.stopCurrentMode();
            }
        }
    }
    
    /**
     * Handle camera error
     * @param {string} message - Error message
     */
    handleCameraError(message) {
        const feedback = document.getElementById('connection-feedback');
        feedback.textContent = message;
        feedback.className = 'feedback error';
        feedback.classList.remove('hidden');
        
        speechManager.speak(`Camera connection error: ${message}. Please check the IP address and try again.`);
    }
    
    /**
     * Activate a mode
     * @param {string} modeName - Mode to activate
     */
    async activateMode(modeName) {
        // Check camera for modes that need it
        const cameraModes = ['navigation', 'walking', 'object-detection', 'bus-detection', 'scene-describe', 'security', 'reading'];
        if (cameraModes.includes(modeName) && !this.isCameraConnected) {
            speechManager.speak(
                'Camera is not connected. Please connect the ESP32 camera first. ' +
                'Enter the IP address and tap Connect, or say connect camera for help.'
            );
            return;
        }
        
        // Stop current mode
        if (this.currentMode) {
            await this.stopCurrentMode(false);
        }
        
        // Get mode instance
        const mode = this.modes[modeName];
        if (!mode) {
            speechManager.speak(`Unknown mode: ${modeName}. Say help to hear available modes.`);
            return;
        }
        
        this.currentMode = modeName;
        
        // Update UI
        this.updateModeUI(modeName);
        
        // Provide quick acknowledgment before mode starts
        const modeAcknowledgments = {
            'assistant': 'Starting assistant mode...',
            'navigation': 'Starting navigation...',
            'object-detection': 'Starting object detection...',
            'walking': 'Starting walking guidance...',
            'bus-detection': 'Starting bus detection...',
            'reading': 'Starting reading mode...',
            'scene-describe': 'Analyzing your surroundings...',
            'emergency': 'Emergency mode activated!',
            'security': 'Starting security monitoring...',
            'medical': 'Medical assistance mode...',
            'fire': 'Fire emergency mode...',
            'police': 'Police emergency mode...',
            'traffic-analysis': 'Analyzing traffic...',
            'environment-analysis': 'Checking environment...'
        };
        
        const ack = modeAcknowledgments[modeName];
        if (ack && !modeName.includes('emergency')) {
            // Brief acknowledgment (emergency modes handle their own urgent response)
            speechManager.speak(ack, true);
        }
        
        // Start mode (mode's start() will provide detailed instructions)
        console.log(`[App] Activating mode: ${modeName}`);
        
        // Small delay to let acknowledgment play
        setTimeout(async () => {
            await mode.start();
        }, modeName.includes('emergency') ? 0 : 800);
    }
    
    /**
     * Stop current mode
     * @param {boolean} announce - Whether to announce stopping
     */
    async stopCurrentMode(announce = true) {
        if (!this.currentMode) return;
        
        const modeName = this.currentMode;
        const mode = this.modes[this.currentMode];
        if (mode && typeof mode.stop === 'function') {
            mode.stop();
        }
        
        this.currentMode = null;
        
        // Update UI
        document.getElementById('mode-section')?.classList.remove('hidden');
        document.getElementById('active-mode-section')?.classList.add('hidden');
        document.querySelector('.video-container')?.classList.remove('active');
        
        // Remove active state from mode buttons
        document.querySelectorAll('.mode-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        // Clear detection results
        const resultsEl = document.getElementById('detection-results');
        if (resultsEl) resultsEl.innerHTML = '';
        
        if (announce && this.isSystemRunning) {
            // Provide helpful next action prompt based on what they were doing
            this.promptNextAction(modeName);
        }
    }
    
    /**
     * Prompt user for next action after completing a mode - auto activates mic
     * @param {string} previousMode - The mode that was just stopped
     */
    async promptNextAction(previousMode) {
        const prompts = {
            'navigation': 'Navigation ended. Would you like to detect objects around you, or read something?',
            'object-detection': 'Object detection stopped. Would you like me to navigate somewhere, or describe the scene?',
            'reading': 'Reading mode ended. Would you like to detect objects, or navigate somewhere?',
            'walking': 'Walking guidance stopped. Would you like to detect objects around you, or describe the scene?',
            'bus-detection': 'Bus detection ended. Would you like to start navigation, or detect other objects?',
            'scene-describe': 'Scene description complete. Would you like to navigate somewhere, or detect specific objects?',
            'emergency': 'Emergency mode ended. Are you safe now? Would you like navigation help?',
            'assistant': 'Assistant mode ended. What would you like to do next?',
            'default': 'Mode stopped. What would you like to do next?'
        };
        
        const prompt = prompts[previousMode] || prompts['default'];
        
        // Use smartSpeak to auto-activate mic since these are questions
        await this.smartSpeak(prompt, async (response) => {
            if (response) {
                // Process the response as a voice command
                await this.handleVoiceCommand(response);
            }
        }, true);
    }
    
    /**
     * Ensure continuous listening is active
     */
    ensureContinuousListening() {
        // In continuous listening mode, make sure recognition is running
        if (!this.isSystemRunning) return;
        
        // Restart speech recognition if not already listening
        if (speechManager && !speechManager.isListening) {
            console.log('[App] Restarting speech recognition for continuous listening');
            speechManager.startListening();
        }
        
        const voiceBtn = document.getElementById('voice-btn');
        if (voiceBtn) {
            voiceBtn.classList.add('listening');
            const statusEl = voiceBtn.querySelector('.voice-status');
            if (statusEl) statusEl.textContent = 'Always listening';
        }
        
        // Show listening banner
        const listeningBanner = document.getElementById('listening-banner');
        if (listeningBanner) listeningBanner.classList.remove('hidden');
        
        document.getElementById('mic-status')?.classList.add('active');
    }
    
    /**
     * Update UI for active mode
     * @param {string} modeName - Active mode name
     */
    updateModeUI(modeName) {
        // Hide mode selection, show active mode section
        document.getElementById('mode-section')?.classList.add('hidden');
        document.getElementById('active-mode-section')?.classList.remove('hidden');
        
        // Update mode title
        const titles = {
            'assistant': '🤖 Assistant Mode',
            'navigation': '🧭 Navigation Mode',
            'object-detection': '🔍 Object Detection Mode',
            'walking': '🚶 Walking Mode',
            'emergency': '🚨 Emergency Mode',
            'security': '🛡️ Security Mode',
            'medical': '🏥 Medical Mode',
            'fire': '🔥 Fire Mode',
            'police': '👮 Police Mode',
            'reading': '📖 Reading Mode',
            'bus-detection': '🚌 Bus Detection Mode',
            'scene-describe': '👁️ Scene Description Mode'
        };
        
        const titleEl = document.getElementById('active-mode-title');
        if (titleEl) titleEl.textContent = titles[modeName] || modeName;
        
        // Mark mode button as active
        document.querySelectorAll('.mode-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.mode === modeName);
        });
        
        // Show video container for visual modes
        const visualModes = ['navigation', 'walking', 'object-detection', 'bus-detection', 'scene-describe', 'security', 'reading'];
        if (visualModes.includes(modeName) && this.isCameraConnected) {
            document.querySelector('.video-container')?.classList.add('active');
        }
    }
    
    /**
     * Toggle voice listening
     */
    toggleVoiceListening() {
        if (speechManager.isListening) {
            speechManager.stopListening();
        } else {
            speechManager.startListening();
        }
    }
    
    /**
     * Handle voice command - comprehensive handler
     * @param {string} command - Voice command transcript
     */
    handleVoiceCommand(command) {
        if (!command || command.trim() === '') return;
        
        console.log('[App] Voice command:', command);
        const cmd = command.toLowerCase().trim();
        
        // Record this interaction
        this.recordInteraction();
        
        // Provide immediate acknowledgment for better UX (like a real assistant)
        this.acknowledgeInput();
        
        // Report success to UI fallback (voice is working)
        if (typeof uiFallbackSystem !== 'undefined') {
            uiFallbackSystem.reportSuccess();
        }
        
        // Check for yes/no responses to auto-walking offer
        if (this._lastWalkingOffer && Date.now() - this._lastWalkingOffer < 10000) {
            if (cmd.includes('yes') || cmd.includes('yeah') || cmd.includes('sure') || cmd.includes('okay')) {
                this._lastWalkingOffer = 0;
                this.activateMode('walking');
                return;
            } else if (cmd.includes('no') || cmd.includes('nope') || cmd.includes('cancel')) {
                this._lastWalkingOffer = 0;
                speechManager.speak('Okay, walking mode cancelled.');
                return;
            }
        }
        
        // Check if conversation flow is active and should handle this
        if (typeof conversationFlowManager !== 'undefined' && conversationFlowManager.currentFlow) {
            const handled = conversationFlowManager.processResponse(command);
            if (handled) return;
        }
        
        // Check for emergency phrases first (highest priority)
        if (!this.currentMode) {
            for (const phrase of this.emergencyPhrases) {
                if (cmd.includes(phrase)) {
                    // Route to appropriate emergency mode
                    if (cmd.includes('fire') || cmd.includes('smoke')) {
                        this.activateMode('fire');
                        return;
                    }
                    if (cmd.includes('police') || cmd.includes('crime') || cmd.includes('attack')) {
                        this.activateMode('police');
                        return;
                    }
                    if (cmd.includes('medical') || cmd.includes('hurt') || cmd.includes('sick')) {
                        this.activateMode('medical');
                        return;
                    }
                    // Default emergency
                    this.activateMode('emergency');
                    return;
                }
            }
        }
        
        // Check for conversational navigation patterns
        if (typeof conversationFlowManager !== 'undefined' && !this.currentMode) {
            // Navigation conversation
            if (cmd.includes('take me to') || cmd.includes('navigate to') || 
                cmd.includes('how do i get to') || cmd.includes('directions to')) {
                // Extract destination and start conversation flow
                const destMatch = cmd.match(/(?:take me to|navigate to|how do i get to|directions to)\s+(?:the\s+)?(.+)/);
                if (destMatch && destMatch[1]) {
                    conversationFlowManager.startFlow('navigation', {
                        destination: destMatch[1].trim(),
                        initialTranscript: command
                    });
                    return;
                }
            }
            
            // Reading conversation
            if (cmd.includes('read this') || cmd.includes('what does this say') || cmd.includes('read for me')) {
                conversationFlowManager.startFlow('reading');
                return;
            }
            
            // Bus detection conversation
            if (cmd.includes('waiting for bus') || cmd.includes('which bus') || cmd.includes('find my bus')) {
                conversationFlowManager.startFlow('bus_detection', { initialTranscript: command });
                return;
            }
        }
        
        // If a mode is active, let it handle the command first
        if (this.currentMode) {
            const mode = this.modes[this.currentMode];
            if (mode) {
                // Check for handleVoiceCommand (new modes) or handleCommand (existing modes)
                if (typeof mode.handleVoiceCommand === 'function') {
                    const handled = mode.handleVoiceCommand(command);
                    if (handled) return;
                } else if (typeof mode.handleCommand === 'function') {
                    const handled = mode.handleCommand(command);
                    if (handled) return;
                }
            }
        }
        
        // Check for mode switching keywords
        for (const [modeName, keywords] of Object.entries(this.modeKeywords)) {
            if (keywords.some(kw => cmd.includes(kw))) {
                if (this.currentMode !== modeName) {
                    this.activateMode(modeName);
                    return;
                } else {
                    speechManager.speak(`You are already in ${modeName} mode. Say stop to exit.`);
                    return;
                }
            }
        }
        
        // Global commands
        
        // Complete shutdown (like Python's exit/terminate/goodbye)
        if (cmd.includes('terminate') || cmd.includes('goodbye') || cmd.includes('end session') || 
            cmd.includes('turn off') || cmd.includes("i'm done") || cmd.includes('stop everything') ||
            cmd.includes('shutdown') || cmd.includes('shut down') || cmd.includes('stop system') ||
            cmd.includes('close blindnav') || cmd.includes('bye') || cmd.includes('bye bye') ||
            cmd.includes('see you') || cmd.includes('later') || cmd.includes('that\'s all') ||
            cmd.includes('thats all') || cmd.includes('all done') || cmd.includes('finished') ||
            cmd.includes('done for now') || cmd.includes('close app') || cmd.includes('exit app') ||
            cmd.includes('close the app') || cmd.includes('turn it off') || cmd.includes('switch off') ||
            cmd.includes('power off') || cmd.includes('sleep now') || cmd.includes('go to sleep')) {
            this.stopSystem();
            return;
        }
        
        // Cancel all current operations without shutting down
        if (cmd.includes('cancel all') || cmd.includes('cancel everything') || cmd.includes('stop all') ||
            cmd.includes('abort') || cmd.includes('clear all') || cmd.includes('reset all')) {
            speechManager.cancelSpeech(); // Stop any speech in progress
            if (this.currentMode) {
                this.stopCurrentMode(false); // Stop mode without announcement
            }
            speechManager.speak('All operations cancelled. I\\'m ready. What would you like to do?');
            return;
        }
        
        // Pause the system temporarily (keeps running but pauses active work)
        if (cmd.includes('pause') || cmd.includes('wait') || cmd.includes('hold on') || 
            cmd.includes('one moment') || cmd.includes('one second') || cmd.includes('just a second') ||
            cmd.includes('hang on') || cmd.includes('pause please')) {
            if (this.currentMode) {
                speechManager.speak(`Paused. Say continue or resume to keep going in ${this.currentMode} mode.`);
                // Don't stop the mode, just pause announcements
                this._pausedMode = this.currentMode;
            } else {
                speechManager.speak('Okay, I\\'ll wait. Say continue when you\\'re ready.');
            }
            this._isPaused = true;
            return;
        }
        
        // Resume/continue after pause
        if ((cmd.includes('continue') || cmd.includes('resume') || cmd.includes('go ahead') || 
             cmd.includes('keep going') || cmd.includes('carry on') || cmd.includes('proceed')) && 
            this._isPaused) {
            this._isPaused = false;
            speechManager.speak('Resuming. ' + (this._pausedMode ? `Continuing ${this._pausedMode} mode.` : 'What would you like to do?'));
            return;
        }
        
        // Stop/Exit current mode - expanded with natural phrases
        if (cmd.includes('stop') || cmd.includes('exit') || cmd.includes('cancel') || cmd.includes('quit') ||
            cmd.includes('exit mode') || cmd.includes('stop mode') || cmd.includes('go back') ||
            cmd.includes('enough') || cmd.includes('that\'s enough') || cmd.includes('thats enough') ||
            cmd.includes('never mind') || cmd.includes('nevermind') || cmd.includes('forget it') ||
            cmd.includes('leave') || cmd.includes('close this') || cmd.includes('end this') ||
            cmd.includes('back') || cmd.includes('return') || cmd.includes('done with this') ||
            cmd.includes('no more') || cmd.includes('stop it') || cmd.includes('stop this')) {
            if (this.currentMode) {
                this.stopCurrentMode();
            } else {
                speechManager.speak('No active mode to stop. Say a mode name to start, or say goodbye to shut down.');
            }
            return;
        }
        
        // Repeat available modes (like Python's select_mode) - expanded
        if (cmd.includes('repeat available') || cmd.includes('repeat modes') || cmd.includes('list modes') ||
            cmd.includes('what modes') || cmd.includes('available modes') || cmd.includes('tell me the modes') ||
            cmd.includes('say the modes') || cmd.includes('what can i do') || cmd.includes('options') ||
            cmd.includes('features') || cmd.includes('what features') || cmd.includes('show options') ||
            cmd.includes('list options') || cmd.includes('all modes') || cmd.includes('all features') ||
            cmd.includes('what\'s available') || cmd.includes('whats available') || cmd.includes('choices')) {
            this.speakAvailableModes();
            return;
        }
        
        // Connect camera by voice - expanded with natural phrases
        if (cmd.includes('connect camera') || cmd.includes('connect to camera') || cmd.includes('connect esp32') ||
            cmd.includes('turn on camera') || cmd.includes('turn on the camera') || cmd.includes('start camera') ||
            cmd.includes('activate camera') || cmd.includes('open camera') || cmd.includes('enable camera') ||
            cmd.includes('camera on') || cmd.includes('switch on camera') || cmd.includes('camera please') ||
            cmd.includes('need camera') || cmd.includes('use camera') || cmd.includes('get camera ready') ||
            cmd.includes('camera ready') || cmd.includes('setup camera') || cmd.includes('set up camera')) {
            const ipInput = document.getElementById('esp32-ip');
            const ip = ipInput?.value?.trim();
            if (ip) {
                speechManager.speak(`Connecting to ESP32 camera at ${ip}.`);
                this.connectCamera();
            } else {
                // Try local camera first
                speechManager.speak('Turning on camera. Using your device camera.');
                this.connectLocalCamera();
            }
            return;
        }
        
        // Use local/device camera by voice - expanded
        if (cmd.includes('use device camera') || cmd.includes('use local camera') || cmd.includes('use phone camera') || 
            cmd.includes('use webcam') || cmd.includes('local camera') || cmd.includes('device camera') ||
            cmd.includes('my camera') || cmd.includes('phone\'s camera') || cmd.includes('phones camera') ||
            cmd.includes('this phone') || cmd.includes('mobile camera') || cmd.includes('front camera') ||
            cmd.includes('back camera') || cmd.includes('selfie camera') || cmd.includes('main camera')) {
            speechManager.speak('Connecting to your device camera.');
            this.connectLocalCamera();
            return;
        }
        
        // Main menu - expanded
        if (cmd.includes('menu') || cmd.includes('main menu') || cmd.includes('home') ||
            cmd.includes('start over') || cmd.includes('beginning') || cmd.includes('main screen') ||
            cmd.includes('home screen') || cmd.includes('start fresh') || cmd.includes('reset')) {
            if (this.currentMode) {
                this.stopCurrentMode();
            }
            speechManager.speak(
                'Main menu. Available modes: Assistant, Navigation, Walking, Object Detection, ' +
                'Bus Detection, Reading, Security, Medical, Fire, Police, Emergency, and Scene Description. ' +
                'Say any mode name to start.'
            );
            return;
        }
        
        // Status - expanded
        if (cmd.includes('status') || cmd.includes('what mode') || cmd.includes('current mode') ||
            cmd.includes('which mode') || cmd.includes('am i in') || cmd.includes('what\'s running') ||
            cmd.includes('whats running') || cmd.includes('what is on') || cmd.includes('system status')) {
            const cameraStatus = this.isCameraConnected ? 'connected' : 'not connected';
            if (this.currentMode) {
                speechManager.speak(`You are in ${this.currentMode} mode. Camera is ${cameraStatus}.`);
            } else {
                speechManager.speak(`No mode active. Camera is ${cameraStatus}. Say a mode name to start.`);
            }
            return;
        }
        
        // Camera status
        if ((cmd.includes('camera') && (cmd.includes('status') || cmd.includes('connected'))) || cmd.includes('is camera')) {
            if (this.isCameraConnected) {
                const status = cameraManager.getStatus();
                const sourceText = status.sourceType === 'local' ? 'Device camera' : 'ESP32 camera';
                speechManager.speak(`${sourceText} is connected and working.`);
            } else {
                speechManager.speak('Camera is not connected. Say "use device camera" or enter the ESP32 IP address and tap Connect.');
            }
            return;
        }
        
        // Time - expanded with natural phrases
        if (cmd.includes('time') || cmd.includes('what time') || cmd.includes('current time') ||
            cmd.includes('tell me the time') || cmd.includes('what\'s the time') || cmd.includes('whats the time') ||
            cmd.includes('time now') || cmd.includes('time is it') || cmd.includes('clock') ||
            cmd.includes('hour') || cmd.includes('what hour')) {
            const now = new Date();
            speechManager.speak(`The time is ${now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}.`);
            return;
        }
        
        // Date - expanded
        if (cmd.includes('date') || cmd.includes('what day') || cmd.includes('today') ||
            cmd.includes('what\'s today') || cmd.includes('whats today') || cmd.includes('today\'s date') ||
            cmd.includes('todays date') || cmd.includes('current date') || cmd.includes('day is it') ||
            cmd.includes('which day') || cmd.includes('tell me the date') || cmd.includes('day today')) {
            const now = new Date();
            speechManager.speak(`Today is ${now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}.`);
            return;
        }
        
        // Settings - expanded
        if (cmd.includes('settings') || cmd.includes('preferences') || cmd.includes('configuration') ||
            cmd.includes('change settings') || cmd.includes('adjust settings') || cmd.includes('open settings') ||
            cmd.includes('configure') || cmd.includes('customize')) {
            this.toggleSettings(true);
            speechManager.speak('Settings panel opened.');
            return;
        }
        
        // Help - comprehensive and expanded
        if (cmd.includes('help') || cmd.includes('what can you do') || cmd.includes('instructions') ||
            cmd.includes('how does this work') || cmd.includes('how do i use') || cmd.includes('guide me') ||
            cmd.includes('tutorial') || cmd.includes('teach me') || cmd.includes('explain') ||
            cmd.includes('i don\'t know') || cmd.includes('i dont know') || cmd.includes('confused') ||
            cmd.includes('lost') || cmd.includes('stuck') || cmd.includes('what do i do') ||
            cmd.includes('what should i') || cmd.includes('how to') || cmd.includes('tell me how')) {
            this.speakHelp();
            return;
        }
        
        // Repeat - expanded
        if (cmd.includes('repeat') || cmd.includes('say again') || cmd.includes('what did you say') ||
            cmd.includes('pardon') || cmd.includes('sorry') || cmd.includes('didn\'t hear') ||
            cmd.includes('didnt hear') || cmd.includes('couldn\'t hear') || cmd.includes('couldnt hear') ||
            cmd.includes('say that again') || cmd.includes('one more time') || cmd.includes('again please') ||
            cmd.includes('come again') || cmd.includes('repeat that') || cmd.includes('what was that') ||
            cmd.includes('huh') || cmd.includes('excuse me')) {
            if (speechManager.lastSpoken) {
                speechManager.speak(speechManager.lastSpoken);
            } else {
                speechManager.speak('There is nothing to repeat.');
            }
            return;
        }
        
        // Speech adjustments - expanded
        if (cmd.includes('speak slower') || cmd.includes('slow down') || cmd.includes('slower please') ||
            cmd.includes('too fast') || cmd.includes('talking too fast') || cmd.includes('speaking too fast') ||
            cmd.includes('can\'t understand') || cmd.includes('cant understand') || cmd.includes('slower') ||
            cmd.includes('more slowly') || cmd.includes('not so fast')) {
            speechManager.settings.rate = Math.max(0.5, speechManager.settings.rate - 0.2);
            speechManager.speak('I will speak slower now.');
            return;
        }
        
        if (cmd.includes('speak faster') || cmd.includes('speed up') || cmd.includes('faster please') ||
            cmd.includes('too slow') || cmd.includes('talking too slow') || cmd.includes('speaking too slow') ||
            cmd.includes('faster') || cmd.includes('quicker') || cmd.includes('hurry up') ||
            cmd.includes('more quickly') || cmd.includes('quickly please')) {
            speechManager.settings.rate = Math.min(2, speechManager.settings.rate + 0.2);
            speechManager.speak('I will speak faster now.');
            return;
        }
        
        // Volume adjustments - new
        if (cmd.includes('louder') || cmd.includes('speak louder') || cmd.includes('volume up') ||
            cmd.includes('can\'t hear') || cmd.includes('cant hear') || cmd.includes('too quiet') ||
            cmd.includes('speak up') || cmd.includes('increase volume') || cmd.includes('turn up')) {
            speechManager.settings.volume = Math.min(1, speechManager.settings.volume + 0.2);
            speechManager.speak('I will speak louder now.');
            return;
        }
        
        if (cmd.includes('quieter') || cmd.includes('speak quieter') || cmd.includes('volume down') ||
            cmd.includes('too loud') || cmd.includes('softer') || cmd.includes('lower voice') ||
            cmd.includes('decrease volume') || cmd.includes('turn down') || cmd.includes('not so loud')) {
            speechManager.settings.volume = Math.max(0.2, speechManager.settings.volume - 0.2);
            speechManager.speak('I will speak quieter now.');
            return;
        }
        
        // Battery - expanded
        if (cmd.includes('battery') || cmd.includes('battery level') || cmd.includes('how much battery') ||
            cmd.includes('charge') || cmd.includes('charging') || cmd.includes('power level') ||
            cmd.includes('battery left') || cmd.includes('battery remaining') || cmd.includes('phone battery') ||
            cmd.includes('is it charging') || cmd.includes('need to charge') || cmd.includes('low battery')) {
            if (navigator.getBattery) {
                navigator.getBattery().then(battery => {
                    const level = Math.round(battery.level * 100);
                    let message = `Battery is at ${level} percent`;
                    if (battery.charging) {
                        message += ' and charging';
                    } else if (level < 20) {
                        message += '. Warning: battery is low, please charge soon';
                    }
                    speechManager.speak(message + '.');
                });
            } else {
                speechManager.speak('Battery information is not available.');
            }
            return;
        }
        
        // Indoor Navigation Commands (available from any mode) - expanded with natural phrases
        if (cmd.includes('find exit') || cmd.includes('where is exit') || cmd.includes('guide me to exit') ||
            cmd.includes('nearest exit') || cmd.includes('emergency exit') || cmd.includes('way out') ||
            cmd.includes('get out') || cmd.includes('leave') || cmd.includes('exit door') ||
            cmd.includes('how do i get out') || cmd.includes('where\\'s the exit') || cmd.includes('wheres the exit') ||
            cmd.includes('show me exit') || cmd.includes('find the exit') || cmd.includes('need to leave')) {
            const isEmergency = cmd.includes('emergency') || cmd.includes('urgent') || cmd.includes('quick');
            if (typeof indoorNavigationHelpers !== 'undefined') {
                indoorNavigationHelpers.guideToExit(isEmergency);
            } else {
                speechManager.speak('Indoor navigation is not available.', true);
            }
            return;
        }
        
        if (cmd.includes('find stairs') || cmd.includes('where are stairs') || cmd.includes('guide me to stairs') ||
            cmd.includes('nearest stairs') || cmd.includes('staircase') || cmd.includes('steps') ||
            cmd.includes('go up') || cmd.includes('go down') || cmd.includes('upstairs') || cmd.includes('downstairs') ||
            cmd.includes('next floor') || cmd.includes('another floor') || cmd.includes('upper floor') ||
            cmd.includes('lower floor') || cmd.includes('floor above') || cmd.includes('floor below') ||
            cmd.includes('find steps') || cmd.includes('where are steps')) {
            let direction = 'any';
            if (cmd.includes('up') || cmd.includes('upstairs') || cmd.includes('upper') || cmd.includes('above')) direction = 'up';
            if (cmd.includes('down') || cmd.includes('downstairs') || cmd.includes('lower') || cmd.includes('below')) direction = 'down';
            
            if (typeof indoorNavigationHelpers !== 'undefined') {
                indoorNavigationHelpers.guideToStairs(direction);
            } else {
                speechManager.speak('Indoor navigation is not available.', true);
            }
            return;
        }
        
        if (cmd.includes('find door') || cmd.includes('where is door') || cmd.includes('guide me to door') ||
            cmd.includes('nearest door') || cmd.includes('the door') || cmd.includes('a door') ||
            cmd.includes('entrance') || cmd.includes('find entrance') || cmd.includes('way in') ||
            cmd.includes('door please') || cmd.includes('open door') || cmd.includes('door nearby')) {
            if (typeof indoorNavigationHelpers !== 'undefined') {
                indoorNavigationHelpers.guideToDoor();
            } else {
                speechManager.speak('Indoor navigation is not available.', true);
            }
            return;
        }
        
        if (cmd.includes('find handle') || cmd.includes('door handle') || cmd.includes('where is handle') ||
            cmd.includes('find the handle') || cmd.includes('grab handle') || cmd.includes('doorknob') ||
            cmd.includes('door knob') || cmd.includes('where\\'s the handle') || cmd.includes('wheres the handle') ||
            cmd.includes('handle location') || cmd.includes('knob')) {
            if (typeof indoorNavigationHelpers !== 'undefined') {
                indoorNavigationHelpers.guideToDoorHandle();
            } else {
                speechManager.speak('Indoor navigation is not available.', true);
            }
            return;
        }
        
        if (cmd.includes('find seat') || cmd.includes('find chair') || cmd.includes('where can i sit') ||
            cmd.includes('find seating') || cmd.includes('nearest seat') || cmd.includes('find bench') ||
            cmd.includes('sit down') || cmd.includes('want to sit') || cmd.includes('need to sit') ||
            cmd.includes('tired') || cmd.includes('rest') || cmd.includes('place to sit') ||
            cmd.includes('somewhere to sit') || cmd.includes('seat please') || cmd.includes('chair please') ||
            cmd.includes('any seat') || cmd.includes('any chair') || cmd.includes('empty seat')) {
            if (typeof indoorNavigationHelpers !== 'undefined') {
                indoorNavigationHelpers.guideToSeating();
            } else {
                speechManager.speak('Indoor navigation is not available.', true);
            }
            return;
        }
        
        if (cmd.includes('help me climb') || cmd.includes('climb stairs') || cmd.includes('stair climbing') ||
            cmd.includes('guide stair') || cmd.includes('going up stairs') || cmd.includes('going down stairs') ||
            cmd.includes('take the stairs') || cmd.includes('use the stairs') || cmd.includes('climb steps') ||
            cmd.includes('walk up stairs') || cmd.includes('walk down stairs')) {
            let direction = cmd.includes('down') ? 'down' : 'up';
            if (typeof indoorNavigationHelpers !== 'undefined') {
                indoorNavigationHelpers.guideStairClimbing(direction);
            } else {
                speechManager.speak('Indoor navigation is not available.', true);
            }
            return;
        }
        
        // Confirmation words for stair climbing
        if ((cmd.includes('ready') || cmd.includes('okay') || cmd.includes('ok') || cmd.includes('yes') || 
             cmd.includes('go') || cmd.includes('next') || cmd.includes('continue')) && 
            typeof indoorNavigationHelpers !== 'undefined' && indoorNavigationHelpers.stairClimbingActive) {
            indoorNavigationHelpers.handleStairReady();
            return;
        }
        
        if (cmd.includes('stop guidance') || cmd.includes('stop navigation') || cmd.includes('stop guiding') ||
            cmd.includes('stop helping') || cmd.includes('i\\'m fine') || cmd.includes('im fine') ||
            cmd.includes('got it') || cmd.includes('that\\'s enough') || cmd.includes('thats enough')) {
            if (typeof indoorNavigationHelpers !== 'undefined') {
                indoorNavigationHelpers.stopGuidance();
            }
            return;
        }
        
        // Bathroom/Toilet/Restroom - common need
        if (cmd.includes('bathroom') || cmd.includes('toilet') || cmd.includes('restroom') ||
            cmd.includes('washroom') || cmd.includes('loo') || cmd.includes('wc') ||
            cmd.includes('lavatory') || cmd.includes('need to pee') || cmd.includes('nature calls') ||
            cmd.includes('find bathroom') || cmd.includes('where is bathroom') || cmd.includes('nearest bathroom')) {
            speechManager.speak('Looking for the nearest restroom. Let me check the surroundings.');
            if (this.isCameraConnected) {
                this.activateMode('scene-describe');
            } else {
                speechManager.speak('Please connect the camera first so I can help you find the restroom.');
            }
            return;
        }
        
        // Elevator/Lift
        if (cmd.includes('elevator') || cmd.includes('lift') || cmd.includes('find elevator') ||
            cmd.includes('where is elevator') || cmd.includes('where\\'s the lift') || cmd.includes('wheres the lift') ||
            cmd.includes('need elevator') || cmd.includes('take elevator')) {
            speechManager.speak('Looking for an elevator nearby. Let me scan the area.');
            if (this.isCameraConnected) {
                this.activateMode('scene-describe');
            } else {
                speechManager.speak('Please connect the camera first so I can help you find the elevator.');
            }
            return;
        }
        
        // Common acknowledgments and responses
        if (cmd.includes('thank') || cmd.includes('thanks') || cmd.includes('thank you') ||
            cmd.includes('great') || cmd.includes('awesome') || cmd.includes('perfect') ||
            cmd.includes('good job') || cmd.includes('well done') || cmd.includes('nice')) {
            const responses = [
                'You\\'re welcome! Happy to help.',
                'Glad I could help!',
                'Anytime! Let me know if you need anything else.',
                'You\\'re welcome! What else can I do for you?',
                'Happy to assist! Just say what you need.'
            ];
            speechManager.speak(responses[Math.floor(Math.random() * responses.length)]);
            return;
        }
        
        // ===== WEBAPP VOICE CONTROLS =====
        
        // Scroll controls
        if (cmd.includes('scroll down') || cmd.includes('page down') || cmd.includes('go down') ||
            cmd.includes('move down') || cmd.includes('down please')) {
            window.scrollBy({ top: 400, behavior: 'smooth' });
            speechManager.speak('Scrolling down.');
            return;
        }
        
        if (cmd.includes('scroll up') || cmd.includes('page up') || cmd.includes('go up') ||
            cmd.includes('move up') || cmd.includes('up please')) {
            window.scrollBy({ top: -400, behavior: 'smooth' });
            speechManager.speak('Scrolling up.');
            return;
        }
        
        if (cmd.includes('scroll to top') || cmd.includes('go to top') || cmd.includes('top of page') ||
            cmd.includes('beginning') || cmd.includes('start of page')) {
            window.scrollTo({ top: 0, behavior: 'smooth' });
            speechManager.speak('Going to top of page.');
            return;
        }
        
        if (cmd.includes('scroll to bottom') || cmd.includes('go to bottom') || cmd.includes('bottom of page') ||
            cmd.includes('end of page')) {
            window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
            speechManager.speak('Going to bottom of page.');
            return;
        }
        
        // Click/tap controls for mode buttons
        if (cmd.includes('click') || cmd.includes('tap') || cmd.includes('press') || cmd.includes('select')) {
            // Extract what to click
            if (cmd.includes('start') || cmd.includes('begin')) {
                const startBtn = document.getElementById('system-start-btn');
                if (startBtn) {
                    startBtn.click();
                    speechManager.speak('Starting the system.');
                }
                return;
            }
            if (cmd.includes('connect') || cmd.includes('camera')) {
                const connectBtn = document.getElementById('connect-btn') || document.getElementById('local-camera-btn');
                if (connectBtn) {
                    connectBtn.click();
                    speechManager.speak('Connecting camera.');
                }
                return;
            }
        }
        
        // Refresh/reload page
        if (cmd.includes('refresh') || cmd.includes('reload') || cmd.includes('refresh page') ||
            cmd.includes('reload page')) {
            speechManager.speak('Refreshing the page.');
            setTimeout(() => location.reload(), 1000);
            return;
        }
        
        // Go back
        if (cmd.includes('go back') || cmd.includes('back button') || cmd.includes('previous page')) {
            if (window.history.length > 1) {
                speechManager.speak('Going back.');
                setTimeout(() => window.history.back(), 500);
            } else {
                speechManager.speak('Cannot go back. This is the first page.');
            }
            return;
        }
        
        // Focus controls for accessibility
        if (cmd.includes('focus') || cmd.includes('move to')) {
            if (cmd.includes('camera') || cmd.includes('video')) {
                const video = document.getElementById('esp32-stream');
                if (video) {
                    video.focus();
                    speechManager.speak('Focused on camera view.');
                }
                return;
            }
            if (cmd.includes('mode') || cmd.includes('buttons')) {
                const modeSection = document.querySelector('.mode-buttons');
                if (modeSection) {
                    const firstBtn = modeSection.querySelector('button');
                    if (firstBtn) firstBtn.focus();
                    speechManager.speak('Focused on mode buttons. Use voice to select a mode.');
                }
                return;
            }
        }
        
        // Mute/unmute system
        if (cmd.includes('mute') || cmd.includes('be quiet') || cmd.includes('silence') ||
            cmd.includes('shut up') || cmd.includes('hush')) {
            speechManager.settings.volume = 0;
            // Brief feedback before muting
            const synth = window.speechSynthesis;
            const utterance = new SpeechSynthesisUtterance('Muting. Say unmute to hear me again.');
            utterance.volume = 0.5;
            synth.speak(utterance);
            return;
        }
        
        if (cmd.includes('unmute') || cmd.includes('speak again') || cmd.includes('volume on') ||
            cmd.includes('turn on sound') || cmd.includes('i can\\'t hear') || cmd.includes('i cant hear')) {
            speechManager.settings.volume = 1.0;
            speechManager.speak('I can speak again. What would you like to do?');
            return;
        }
        
        // Fullscreen mode
        if (cmd.includes('fullscreen') || cmd.includes('full screen') || cmd.includes('maximize')) {
            if (document.fullscreenElement) {
                document.exitFullscreen();
                speechManager.speak('Exiting fullscreen.');
            } else {
                document.documentElement.requestFullscreen().then(() => {
                    speechManager.speak('Entering fullscreen mode.');
                }).catch(() => {
                    speechManager.speak('Could not enter fullscreen.');
                });
            }
            return;
        }
        
        // ===== VOICE VOLUME CONTROLS =====
        if (cmd.includes('volume up') || cmd.includes('louder') || cmd.includes('speak louder') ||
            cmd.includes('increase volume') || cmd.includes('turn up')) {
            speechManager.settings.volume = Math.min(1.0, speechManager.settings.volume + 0.2);
            speechManager.speak(`Volume increased to ${Math.round(speechManager.settings.volume * 100)} percent.`);
            return;
        }
        
        if (cmd.includes('volume down') || cmd.includes('softer') || cmd.includes('speak softer') ||
            cmd.includes('decrease volume') || cmd.includes('turn down') || cmd.includes('quieter')) {
            speechManager.settings.volume = Math.max(0.1, speechManager.settings.volume - 0.2);
            speechManager.speak(`Volume decreased to ${Math.round(speechManager.settings.volume * 100)} percent.`);
            return;
        }
        
        // ===== SPEECH SPEED CONTROLS =====
        if (cmd.includes('speak faster') || cmd.includes('speed up') || cmd.includes('faster please') ||
            cmd.includes('increase speed') || cmd.includes('talk faster')) {
            speechManager.settings.rate = Math.min(1.5, speechManager.settings.rate + 0.15);
            speechManager.speak(`Speaking faster now. Rate is ${Math.round(speechManager.settings.rate * 100)} percent.`);
            return;
        }
        
        if (cmd.includes('speak slower') || cmd.includes('slow down') || cmd.includes('slower please') ||
            cmd.includes('decrease speed') || cmd.includes('talk slower')) {
            speechManager.settings.rate = Math.max(0.5, speechManager.settings.rate - 0.15);
            speechManager.speak(`Speaking slower now. Rate is ${Math.round(speechManager.settings.rate * 100)} percent.`);
            return;
        }
        
        if (cmd.includes('normal speed') || cmd.includes('reset speed') || cmd.includes('default speed')) {
            speechManager.settings.rate = 1.0;
            speechManager.speak('Speech speed reset to normal.');
            return;
        }
        
        // ===== REPEAT LAST MESSAGE =====
        if (cmd.includes('repeat') || cmd.includes('say again') || cmd.includes('what did you say') ||
            cmd.includes('repeat that') || cmd.includes('come again') || cmd.includes('pardon')) {
            if (speechManager.lastSpoken) {
                speechManager.speak(speechManager.lastSpoken, true);
            } else {
                speechManager.speak("I haven't said anything yet.");
            }
            return;
        }
        
        // ===== SETTINGS PANEL =====
        if (cmd.includes('open settings') || cmd.includes('show settings') || cmd.includes('settings menu')) {
            this.toggleSettings(true);
            speechManager.speak('Settings panel opened. You can adjust voice settings and other options.');
            return;
        }
        
        if (cmd.includes('close settings') || cmd.includes('hide settings')) {
            this.toggleSettings(false);
            speechManager.speak('Settings panel closed.');
            return;
        }
        
        // ===== QUICK STATUS CHECK =====
        if (cmd.includes('system status') || cmd.includes('what\\'s your status') || 
            cmd.includes('how are you') || cmd.includes('are you working') || cmd.includes('status check')) {
            let status = 'System status: ';
            status += this.isSystemRunning ? 'System is running. ' : 'System is stopped. ';
            status += this.isCameraConnected ? 'Camera connected. ' : 'Camera not connected. ';
            status += this.currentMode ? `Active mode: ${this.currentMode}. ` : 'No mode active. ';
            status += `Volume at ${Math.round(speechManager.settings.volume * 100)} percent. `;
            status += 'All systems operational.';
            speechManager.speak(status);
            return;
        }
        
        // ===== CAMERA CONTROLS =====
        if (cmd.includes('connect camera') || cmd.includes('turn on camera') || cmd.includes('use device camera') ||
            cmd.includes('start camera') || cmd.includes('enable camera') || cmd.includes('open camera')) {
            const connectBtn = document.getElementById('local-camera-btn') || document.getElementById('connect-btn');
            if (connectBtn) {
                connectBtn.click();
                speechManager.speak('Connecting to device camera.');
            } else {
                speechManager.speak('Camera connect button not found. Please tap the camera button on screen.');
            }
            return;
        }
        
        if (cmd.includes('disconnect camera') || cmd.includes('turn off camera') || cmd.includes('close camera') ||
            cmd.includes('stop camera') || cmd.includes('disable camera')) {
            if (typeof cameraManager !== 'undefined' && cameraManager.stop) {
                cameraManager.stop();
                speechManager.speak('Camera disconnected.');
            } else {
                speechManager.speak('Camera not connected.');
            }
            return;
        }
        
        // ===== SWITCH BETWEEN MODES QUICKLY =====
        if (cmd.includes('switch to') || cmd.includes('change to') || cmd.includes('go to')) {
            if (cmd.includes('navigation') || cmd.includes('navigate')) {
                this.activateMode('navigation');
                return;
            }
            if (cmd.includes('walking') || cmd.includes('walk')) {
                this.activateMode('walking');
                return;
            }
            if (cmd.includes('reading') || cmd.includes('read')) {
                this.activateMode('reading');
                return;
            }
            if (cmd.includes('object') || cmd.includes('detect')) {
                this.activateMode('object-detection');
                return;
            }
            if (cmd.includes('bus')) {
                this.activateMode('bus-detection');
                return;
            }
            if (cmd.includes('assistant') || cmd.includes('chat')) {
                this.activateMode('assistant');
                return;
            }
            if (cmd.includes('scene') || cmd.includes('describe')) {
                this.activateMode('scene-describe');
                return;
            }
            if (cmd.includes('emergency') || cmd.includes('help')) {
                this.activateMode('emergency');
                return;
            }
            // If no specific mode mentioned
            speechManager.speak('Which mode would you like? Navigation, walking, reading, object detection, bus, assistant, or emergency?');
            return;
        }
        
        // Read current page/screen
        if (cmd.includes('read page') || cmd.includes('read screen') || cmd.includes('what\\'s on screen') ||
            cmd.includes('whats on screen') || cmd.includes('describe page') || cmd.includes('describe screen')) {
            let pageDescription = 'You are on the BlindNav+ navigation assistant. ';
            if (this.isSystemRunning) {
                pageDescription += `The system is running. `;
                if (this.currentMode) {
                    pageDescription += `You are currently in ${this.currentMode} mode. `;
                } else {
                    pageDescription += 'No mode is active. Say a mode name to start. ';
                }
            } else {
                pageDescription += 'The system is not started. Say start or tap the Start button to begin. ';
            }
            if (this.isCameraConnected) {
                pageDescription += 'Camera is connected and ready. ';
            } else {
                pageDescription += 'Camera is not connected. Say use device camera to connect. ';
            }
            speechManager.speak(pageDescription);
            return;
        }
        
        // Yes/No responses when not in specific context
        if ((cmd === 'yes' || cmd === 'no' || cmd === 'yeah' || cmd === 'nope' || cmd === 'yep' || cmd === 'nah') && !this.currentMode) {
            speechManager.speak('I\\'m ready for your command. What would you like to do?');
            return;
        }
        
        // If nothing matched - provide helpful guidance
        // This handles both when no mode is active AND when mode didn't recognize the command
        this.handleUnrecognizedCommand(command, this.currentMode);
    }
    
    /**
     * Handle unrecognized voice commands with helpful responses - auto activates mic
     * @param {string} command - The command that wasn't recognized
     * @param {string|null} currentMode - The currently active mode (if any)
     */
    async handleUnrecognizedCommand(command, currentMode = null) {
        // Check if it might be a partial command or common misheard word
        const cmd = command.toLowerCase();
        
        // Common misheard words and suggestions
        const suggestions = {
            'navigate': ['nav', 'navi', 'navig', 'navigation'],
            'reading': ['read', 'reed', 'red', 'reid'],
            'walking': ['walk', 'wok', 'waking'],
            'object': ['objects', 'obj', 'obstruct'],
            'detect': ['detection', 'detecting', 'detective'],
            'emergency': ['emerge', 'urgent', 'emerg'],
            'help': ['halp', 'hep', 'health'],
            'stop': ['stap', 'sop', 'top'],
            'bus': ['buzz', 'boss', 'buss'],
            'describe': ['describ', 'dscribe', 'scribe']
        };
        
        // Check for partial matches (only when not in a mode)
        if (!currentMode) {
            for (const [mode, variants] of Object.entries(suggestions)) {
                if (variants.some(v => cmd.includes(v))) {
                    // Ask clarifying question with auto mic activation
                    await this.askQuestion(`Did you mean ${mode}? Say yes to start ${mode}.`, async (response) => {
                        if (response && (response.toLowerCase().includes('yes') || response.toLowerCase().includes('yeah'))) {
                            // Activate the mode
                            if (mode === 'navigate') this.activateMode('navigation');
                            else if (mode === 'reading') this.activateMode('reading');
                            else if (mode === 'walking') this.activateMode('walking');
                            else if (mode === 'object' || mode === 'detect') this.activateMode('object-detection');
                            else if (mode === 'emergency') this.activateMode('emergency');
                            else if (mode === 'bus') this.activateMode('bus-detection');
                            else if (mode === 'describe') this.activateMode('scene-describe');
                            else if (mode === 'help') this.speakHelp();
                            else if (mode === 'stop') this.stopCurrentMode(true);
                        }
                    });
                    return;
                }
            }
        }
        
        // Mode-specific help when user is inside a mode - use smartSpeak for auto mic
        if (currentMode) {
            const modeHelp = {
                'navigation': 'In navigation mode, you can say: "take me to" a place, "where am I", "next step", "repeat directions", or "stop" to exit.',
                'walking': 'In walking mode, I guide you as you walk. Say "what\'s ahead", "scan left", "scan right", "how far", or "stop" to exit.',
                'object-detection': 'In object detection, say "what\'s around me", "find" something specific, "describe", or "stop" to exit.',
                'reading': 'In reading mode, say "read this", "read again", "spell it", "next paragraph", or "stop" to exit.',
                'bus-detection': 'In bus detection, say a bus number to watch for it, "bus to" a destination like Banashankari, "nearest stop", "timings", or "stop" to exit.',
                'scene-describe': 'In scene description, I describe what\'s around you. Say "describe again", "what\'s on my left", "what\'s ahead", or "stop" to exit.',
                'assistant': 'In assistant mode, just ask me anything naturally. Say "help", ask about time, weather, or "stop" to exit.',
                'emergency': 'In emergency mode, say "call for help", "I need assistance", describe your emergency, or "stop" if you\'re okay.',
                'traffic-analysis': 'In traffic mode, say "is it safe to cross", "check traffic", "when can I cross", or "stop" to exit.'
            };
            
            const help = modeHelp[currentMode] || `You're in ${currentMode} mode. Say "stop" to exit, or "help" for more options.`;
            // Use smartSpeak to auto-activate mic for follow-up
            await this.smartSpeak(`I heard "${command}" but I'm not sure what you meant. ${help} What would you like to do?`, async (response) => {
                if (response) {
                    await this.handleVoiceCommand(response);
                }
            }, true);
            return;
        }
        
        // Provide varied, helpful responses when no mode is active - use smartSpeak
        const responses = [
            `I heard "${command}". What would you like me to do?`,
            `I'm not sure about "${command}". What can I help you with?`,
            `Sorry, I didn't catch that. What do you need?`,
            `I couldn't understand "${command}". How can I help you?`,
            `Hmm, I'm not sure what to do with "${command}". What would you like?`
        ];
        
        const response = responses[Math.floor(Math.random() * responses.length)];
        // Auto-activate mic for response
        await this.smartSpeak(response, async (userResponse) => {
            if (userResponse) {
                await this.handleVoiceCommand(userResponse);
            }
        }, true);
        
        // Ensure we keep listening
        this.ensureContinuousListening();
    }
    
    /**
     * Speak available modes overview (like Python's speak_available_modes_overview)
     */
    speakAvailableModes() {
        speechManager.speak("Here are the available modes:");
        
        setTimeout(() => {
            speechManager.speak("Assistant mode lets you talk to me naturally, ask questions, and get everyday help.");
        }, 2000);
        
        setTimeout(() => {
            speechManager.speak("Navigation mode guides you step by step to your destination using real-time camera vision.");
        }, 5000);
        
        setTimeout(() => {
            speechManager.speak("Object detection mode describes your surroundings and identifies objects through the camera.");
        }, 8000);
        
        setTimeout(() => {
            speechManager.speak("Walking mode helps you move safely by detecting obstacles and giving directional cues.");
        }, 11000);
        
        setTimeout(() => {
            speechManager.speak("Emergency mode listens for distress and connects you to emergency assistance if needed.");
        }, 14000);
        
        setTimeout(() => {
            speechManager.speak("Reading mode reads aloud any printed text visible to the camera.");
        }, 17000);
        
        setTimeout(() => {
            speechManager.speak("Bus detection mode helps you identify which bus is coming.");
        }, 20000);
        
        setTimeout(() => {
            speechManager.speak(`You can choose from: assistant mode, navigation mode, object detection mode, walking mode, emergency mode, reading mode, or bus detection mode. Which mode would you like, ${this.userName}?`);
        }, 23000);
    }
    
    /**
     * Speak comprehensive help - then auto-activate mic for user's choice
     */
    async speakHelp() {
        const helpMessage = `
            I can help you with many things! Here's what I can do:
            
            For moving around: Say "navigation" or "walking mode" for guidance with obstacle detection.
            
            To know what's around you: Say "detect objects" or "what's around me".
            
            For reading: Say "read this" to read text and signs.
            
            For buses: Say "bus detection" or "which bus is coming".
            
            To describe your surroundings: Say "describe scene".
            
            For traffic: Say "is it safe to cross".
            
            For emergencies: Say "help", "emergency", "medical", "fire", or "police".
            
            For indoor help: Say "find exit", "find stairs", "find door", or "find seat".
            
            You can also ask me the time, date, or weather.
            
            To stop anything, just say "stop".
        `;
        
        speechManager.speak(helpMessage, true);
        
        // Wait for help to finish then ask what they want to do with auto mic
        await this.delay(8000); // Wait for help message
        await this.askQuestion("What would you like to do?", async (response) => {
            if (response) {
                await this.handleVoiceCommand(response);
            }
        });
    }
    
    /**
     * Utility delay function
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    /**
     * Toggle settings panel
     * @param {boolean} show - Force show/hide
     */
    toggleSettings(show = null) {
        const panel = document.getElementById('settings-panel');
        if (!panel) return;
        
        const isVisible = panel.classList.contains('visible');
        const shouldShow = show !== null ? show : !isVisible;
        
        panel.classList.toggle('visible', shouldShow);
    }
    
    /**
     * Load saved settings
     */
    loadSettings() {
        try {
            const saved = localStorage.getItem('blindnav_settings');
            if (saved) {
                const settings = JSON.parse(saved);
                
                // Apply speech settings
                if (settings.speech) {
                    speechManager.updateSettings(settings.speech);
                    
                    // Update UI inputs
                    if (settings.speech.rate) {
                        const rateInput = document.getElementById('speech-rate');
                        if (rateInput) rateInput.value = settings.speech.rate;
                    }
                    if (settings.speech.volume) {
                        const volInput = document.getElementById('speech-volume');
                        if (volInput) volInput.value = settings.speech.volume;
                    }
                    if (settings.speech.language) {
                        const langSelect = document.getElementById('language-select');
                        if (langSelect) langSelect.value = settings.speech.language;
                    }
                }
                
                // Apply detection settings
                if (settings.detection) {
                    detectionManager.updateSettings(settings.detection);
                    
                    if (settings.detection.minScore) {
                        const sensInput = document.getElementById('detection-sensitivity');
                        if (sensInput) sensInput.value = settings.detection.minScore;
                    }
                }
                
                // Load last ESP32 IP
                if (settings.lastIP) {
                    const ipInput = document.getElementById('esp32-ip');
                    if (ipInput) ipInput.value = settings.lastIP;
                }
                
                console.log('[App] Settings loaded');
            }
        } catch (e) {
            console.error('[App] Could not load settings:', e);
        }
    }
    
    /**
     * Save current settings
     */
    saveSettings() {
        try {
            const settings = {
                speech: speechManager.settings,
                detection: detectionManager.settings,
                lastIP: document.getElementById('esp32-ip')?.value || ''
            };
            
            localStorage.setItem('blindnav_settings', JSON.stringify(settings));
            console.log('[App] Settings saved');
        } catch (e) {
            console.error('[App] Could not save settings:', e);
        }
    }
}

// Create and expose app instance
const blindNavApp = new BlindNavApp();
window.blindNavApp = blindNavApp;

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    blindNavApp.init();
});

// Save settings before page unload
window.addEventListener('beforeunload', () => {
    blindNavApp.saveSettings();
});
