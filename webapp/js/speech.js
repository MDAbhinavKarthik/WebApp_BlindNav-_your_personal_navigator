/**
 * BlindNav+ Speech Module
 * Handles text-to-speech and speech recognition for audio-based interaction
 */

class SpeechManager {
    constructor() {
        this.synthesis = window.speechSynthesis;
        this.recognition = null;
        this.isListening = false;
        this.isSpeaking = false;
        this.stopRequested = false; // Flag to prevent auto-restart when intentionally stopped
        this.speechQueue = [];
        this.currentUtterance = null;
        this.lastSpoken = ''; // Track last spoken text for repeat
        
        // Settings
        this.settings = {
            rate: 1.0,
            pitch: 1.0,
            volume: 1.0,
            language: 'en-US',
            voice: null
        };
        
        // Callbacks
        this.onSpeechResult = null;
        this.onSpeechError = null;
        this.onSpeechStart = null;
        this.onSpeechEnd = null;
        
        this.init();
    }
    
    async init() {
        // Initialize speech recognition
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            this.recognition = new SpeechRecognition();
            this.recognition.continuous = true; // Continuous listening
            this.recognition.interimResults = true;
            this.recognition.lang = this.settings.language;
            this.recognition.maxAlternatives = 1;
            
            this.recognition.onstart = () => {
                this.isListening = true;
                console.log('[Speech] Recognition started - Always listening');
                if (this.onSpeechStart) this.onSpeechStart();
            };
            
            this.recognition.onresult = (event) => {
                const results = event.results;
                const lastResult = results[results.length - 1];
                
                if (lastResult.isFinal) {
                    const transcript = lastResult[0].transcript.trim().toLowerCase();
                    console.log('[Speech] Recognized:', transcript);
                    if (this.onSpeechResult) this.onSpeechResult(transcript);
                }
            };
            
            this.recognition.onerror = (event) => {
                console.error('[Speech] Recognition error:', event.error);
                this.isListening = false;
                if (this.onSpeechError) this.onSpeechError(event.error);
            };
            
            this.recognition.onend = () => {
                this.isListening = false;
                console.log('[Speech] Recognition ended');
                if (this.onSpeechEnd) this.onSpeechEnd();
                
                // Update UI to show not listening
                const micStatus = document.getElementById('mic-status');
                if (micStatus) micStatus.classList.remove('active');
                
                const listeningBanner = document.getElementById('listening-banner');
                if (listeningBanner) listeningBanner.classList.add('hidden');
                
                // Auto-restart for continuous listening, but ONLY if system is running
                // Check window.blindNavApp.isSystemRunning to respect stop button
                const systemRunning = window.blindNavApp && window.blindNavApp.isSystemRunning;
                
                if (systemRunning && !this.isSpeaking && !this.stopRequested) {
                    console.log('[Speech] Auto-restarting recognition for continuous listening...');
                    setTimeout(() => {
                        this.startListening();
                    }, 300);
                } else {
                    console.log('[Speech] Not auto-restarting - system stopped or speaking');
                }
            };
        } else {
            console.warn('[Speech] Speech recognition not supported');
        }
        
        // Wait for voices to load
        await this.loadVoices();
    }
    
    async loadVoices() {
        return new Promise((resolve) => {
            const loadVoicesHandler = () => {
                const voices = this.synthesis.getVoices();
                if (voices.length > 0) {
                    // Try to find a good English voice
                    const preferredVoices = voices.filter(v => 
                        v.lang.startsWith('en') && v.localService
                    );
                    
                    if (preferredVoices.length > 0) {
                        this.settings.voice = preferredVoices[0];
                    } else {
                        // Fallback to any English voice
                        const englishVoice = voices.find(v => v.lang.startsWith('en'));
                        this.settings.voice = englishVoice || voices[0];
                    }
                    
                    console.log('[Speech] Voice selected:', this.settings.voice?.name);
                    resolve(voices);
                }
            };
            
            // Chrome loads voices asynchronously
            if (this.synthesis.getVoices().length > 0) {
                loadVoicesHandler();
            } else {
                this.synthesis.onvoiceschanged = loadVoicesHandler;
                // Timeout fallback
                setTimeout(() => {
                    if (!this.settings.voice) {
                        loadVoicesHandler();
                        resolve([]);
                    }
                }, 1000);
            }
        });
    }
    
    /**
     * Speak text using text-to-speech
     * @param {string} text - Text to speak
     * @param {boolean} interrupt - Whether to interrupt current speech
     * @param {number} priority - Priority level (higher = more important)
     */
    speak(text, interrupt = false, priority = 1) {
        if (!text || text.trim() === '') return;
        
        console.log('[Speech] speak() called with:', text.substring(0, 50) + '...');
        
        // Store for repeat functionality
        this.lastSpoken = text;
        
        // Update UI feedback
        const feedbackEl = document.getElementById('audio-feedback');
        const lastSpokenEl = document.getElementById('last-spoken');
        if (feedbackEl && lastSpokenEl) {
            lastSpokenEl.textContent = text;
            feedbackEl.classList.add('visible');
            setTimeout(() => feedbackEl.classList.remove('visible'), 3000);
        }
        
        if (interrupt) {
            this.stopSpeaking();
            this.speechQueue = [];
        }
        
        // Add to queue with priority
        this.speechQueue.push({ text, priority });
        this.speechQueue.sort((a, b) => b.priority - a.priority);
        
        this.processQueue();
    }
    
    processQueue() {
        if (this.isSpeaking || this.speechQueue.length === 0) return;
        
        const synth = window.speechSynthesis;
        
        // Cancel any stuck speech
        synth.cancel();
        
        const item = this.speechQueue.shift();
        this.isSpeaking = true;
        
        console.log('[Speech] Processing queue, speaking:', item.text.substring(0, 30) + '...');
        
        const utterance = new SpeechSynthesisUtterance(item.text);
        utterance.rate = this.settings.rate || 1.0;
        utterance.pitch = this.settings.pitch || 1.0;
        utterance.volume = this.settings.volume || 1.0;
        utterance.lang = this.settings.language || 'en-US';
        
        // Get voices and select one
        const voices = synth.getVoices();
        if (voices.length > 0) {
            const voice = voices.find(v => v.lang.startsWith('en-US')) ||
                         voices.find(v => v.lang.startsWith('en')) ||
                         voices[0];
            if (voice) {
                utterance.voice = voice;
            }
        }
        
        utterance.onstart = () => {
            console.log('[Speech] ✓ Speech STARTED');
        };
        
        utterance.onend = () => {
            console.log('[Speech] ✓ Speech ENDED');
            this.isSpeaking = false;
            this.currentUtterance = null;
            // Process next item in queue
            setTimeout(() => this.processQueue(), 200);
        };
        
        utterance.onerror = (event) => {
            console.error('[Speech] ✗ Speech ERROR:', event.error);
            this.isSpeaking = false;
            this.currentUtterance = null;
            // Try next item
            setTimeout(() => this.processQueue(), 200);
        };
        
        this.currentUtterance = utterance;
        
        // Critical: Resume before speaking (Chrome bug workaround)
        synth.resume();
        
        // Speak
        synth.speak(utterance);
        
        console.log('[Speech] Utterance sent to synthesis, pending:', synth.pending, 'speaking:', synth.speaking);
        
        // Fallback timeout - if speech doesn't complete in reasonable time
        const wordCount = item.text.split(' ').length;
        const timeout = Math.max(10000, wordCount * 400);
        setTimeout(() => {
            if (this.isSpeaking && this.currentUtterance === utterance) {
                console.log('[Speech] Timeout - forcing completion');
                this.isSpeaking = false;
                this.currentUtterance = null;
                this.processQueue();
            }
        }, timeout);
    }
    
    /**
     * Stop current speech
     */
    stopSpeaking() {
        this.synthesis.cancel();
        this.isSpeaking = false;
        this.currentUtterance = null;
    }
    
    /**
     * Speak a message and automatically activate microphone for response
     * Use this when asking the user a question
     * @param {string} text - The question/prompt to speak
     * @param {Function} onResponse - Optional callback when user responds
     * @param {number} listenTimeout - How long to wait for response (ms)
     * @returns {Promise<string|null>} - User's response or null
     */
    async speakAndListen(text, onResponse = null, listenTimeout = 10000) {
        console.log('[Speech] Speak and listen:', text);
        
        // Store the question
        this.lastSpoken = text;
        this.pendingQuestion = text;
        
        return new Promise((resolve) => {
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.rate = this.settings.rate || 1.0;
            utterance.pitch = this.settings.pitch || 1.0;
            utterance.volume = this.settings.volume || 1.0;
            utterance.lang = this.settings.language || 'en-US';
            
            // Get voices
            const voices = this.synthesis.getVoices();
            if (voices.length > 0) {
                const voice = voices.find(v => v.lang.startsWith('en-US')) ||
                             voices.find(v => v.lang.startsWith('en')) ||
                             voices[0];
                if (voice) utterance.voice = voice;
            }
            
            this.isSpeaking = true;
            
            // When speech ends, automatically start listening
            utterance.onend = () => {
                console.log('[Speech] Question finished, auto-activating microphone...');
                this.isSpeaking = false;
                
                // Brief pause then listen
                setTimeout(async () => {
                    // Play listening tone
                    this.playListeningTone();
                    
                    // Show listening UI
                    this.updateListeningUI(true, 'Listening for your answer...');
                    
                    // Listen for response
                    const response = await this.listenForResponse(listenTimeout);
                    
                    if (onResponse) onResponse(response);
                    resolve(response);
                }, 400);
            };
            
            utterance.onerror = (e) => {
                console.error('[Speech] Error speaking question:', e);
                this.isSpeaking = false;
                resolve(null);
            };
            
            // Cancel any current speech and speak the question
            this.synthesis.cancel();
            this.synthesis.resume();
            this.synthesis.speak(utterance);
        });
    }
    
    /**
     * Check if the text is a question that expects an answer
     * @param {string} text - Text to check
     * @returns {boolean} - True if it's a question
     */
    isQuestion(text) {
        if (!text) return false;
        const lower = text.toLowerCase();
        
        // Check for question words/patterns
        const questionIndicators = [
            'what', 'where', 'when', 'who', 'why', 'how', 'which', 'would you like',
            'do you want', 'can i', 'should i', 'shall i', 'may i', 'could you',
            'would you', 'is it', 'are you', 'have you', 'will you', 'ready?',
            'correct?', 'right?', 'okay?', 'yes or no', 'true or false'
        ];
        
        // Check for question mark
        if (text.trim().endsWith('?')) return true;
        
        // Check for question patterns
        return questionIndicators.some(q => lower.includes(q));
    }
    
    /**
     * Start listening for speech
     */
    startListening() {
        if (!this.recognition) {
            console.error('[Speech] Recognition not available');
            this.speak('Speech recognition is not supported on this device');
            return false;
        }
        
        if (this.isListening) {
            console.log('[Speech] Already listening');
            return true;
        }
        
        // Reset stop flag when intentionally starting
        this.stopRequested = false;
        
        // Stop speaking before listening to avoid conflicts
        if (this.isSpeaking) {
            console.log('[Speech] Waiting for speech to finish before listening');
            // Will auto-start via onend handler
            return true;
        }
        
        try {
            this.recognition.lang = this.settings.language;
            this.recognition.start();
            console.log('[Speech] Recognition started successfully');
            
            // Update UI to show listening state
            const micStatus = document.getElementById('mic-status');
            if (micStatus) micStatus.classList.add('active');
            
            const listeningBanner = document.getElementById('listening-banner');
            if (listeningBanner) listeningBanner.classList.remove('hidden');
            
            return true;
        } catch (error) {
            console.error('[Speech] Failed to start recognition:', error);
            // Try to restart after a brief delay
            if (error.name === 'InvalidStateError') {
                console.log('[Speech] Recognition in invalid state, resetting...');
                setTimeout(() => this.startListening(), 500);
            }
            return false;
        }
    }
    
    /**
     * Stop listening for speech
     */
    stopListening() {
        this.stopRequested = true; // Prevent auto-restart
        
        if (this.recognition && this.isListening) {
            try {
                this.recognition.stop();
            } catch (e) {
                console.log('[Speech] Error stopping recognition:', e);
            }
        }
        this.isListening = false;
        
        // Update UI
        const micStatus = document.getElementById('mic-status');
        if (micStatus) micStatus.classList.remove('active');
        
        const listeningBanner = document.getElementById('listening-banner');
        if (listeningBanner) listeningBanner.classList.add('hidden');
    }
    
    /**
     * Update settings
     * @param {Object} newSettings - New settings to apply
     */
    updateSettings(newSettings) {
        Object.assign(this.settings, newSettings);
        
        if (newSettings.language && this.recognition) {
            this.recognition.lang = newSettings.language;
        }
        
        console.log('[Speech] Settings updated:', this.settings);
    }
    
    /**
     * Check if speech synthesis is supported
     */
    isSynthesisSupported() {
        return 'speechSynthesis' in window;
    }
    
    /**
     * Check if speech recognition is supported
     */
    isRecognitionSupported() {
        return 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
    }

    /**
     * Speak a prompt and then automatically start listening for response
     * This creates an interactive conversational flow
     * @param {string} promptText - The question/prompt to speak
     * @param {Function} onResponse - Callback when user responds
     * @param {number} listenTimeout - How long to wait for response (ms)
     */
    async promptAndListen(promptText, onResponse, listenTimeout = 8000) {
        return new Promise((resolve) => {
            console.log('[Speech] Prompt and listen:', promptText);
            
            // Speak the prompt first
            const utterance = new SpeechSynthesisUtterance(promptText);
            utterance.rate = this.settings.rate || 1.0;
            utterance.pitch = this.settings.pitch || 1.0;
            utterance.volume = this.settings.volume || 1.0;
            
            // Store for repeat
            this.lastSpoken = promptText;
            
            // When speech ends, start listening
            utterance.onend = () => {
                console.log('[Speech] Prompt finished, now listening for response...');
                
                // Brief pause before listening
                setTimeout(() => {
                    // Start listening
                    this.listenForResponse(listenTimeout)
                        .then(response => {
                            if (onResponse) onResponse(response);
                            resolve(response);
                        })
                        .catch(() => {
                            if (onResponse) onResponse(null);
                            resolve(null);
                        });
                }, 300);
            };
            
            utterance.onerror = () => {
                // Even if speech fails, try to listen
                this.listenForResponse(listenTimeout)
                    .then(response => {
                        if (onResponse) onResponse(response);
                        resolve(response);
                    });
            };
            
            // Cancel any current speech and speak prompt
            this.synthesis.cancel();
            this.synthesis.speak(utterance);
        });
    }

    /**
     * Listen for a single response with timeout
     * @param {number} timeout - Max time to wait in ms
     * @returns {Promise<string|null>} - User's response or null
     */
    listenForResponse(timeout = 8000) {
        return new Promise((resolve) => {
            if (!this.recognition) {
                console.error('[Speech] Recognition not available');
                resolve(null);
                return;
            }
            
            let responded = false;
            let timeoutId = null;
            
            // Create a one-time listener
            const handleResult = (event) => {
                const results = event.results;
                const lastResult = results[results.length - 1];
                
                if (lastResult.isFinal && !responded) {
                    responded = true;
                    const transcript = lastResult[0].transcript.trim().toLowerCase();
                    console.log('[Speech] Response received:', transcript);
                    
                    // Clean up
                    if (timeoutId) clearTimeout(timeoutId);
                    this.recognition.removeEventListener('result', handleResult);
                    
                    // Update UI
                    this.updateListeningUI(false);
                    
                    // Play confirmation tone
                    this.playResponseTone();
                    
                    resolve(transcript);
                }
            };
            
            // Set up timeout
            timeoutId = setTimeout(() => {
                if (!responded) {
                    console.log('[Speech] Listen timeout - no response');
                    responded = true;
                    this.recognition.removeEventListener('result', handleResult);
                    this.updateListeningUI(false);
                    resolve(null);
                }
            }, timeout);
            
            // Start listening
            this.recognition.addEventListener('result', handleResult);
            
            // Update UI to show we're listening
            this.updateListeningUI(true, 'Listening for your response...');
            
            // Play listening tone
            this.playListeningTone();
            
            // Start recognition if not already running
            if (!this.isListening) {
                try {
                    this.recognition.start();
                } catch (e) {
                    console.log('[Speech] Recognition already running');
                }
            }
        });
    }

    /**
     * Update UI to show listening state
     * @param {boolean} isListening - Whether we're listening
     * @param {string} message - Optional status message
     */
    updateListeningUI(isListening, message = 'Listening...') {
        const micStatus = document.getElementById('mic-status');
        const listeningBanner = document.getElementById('listening-banner');
        const voiceBtn = document.getElementById('voice-btn');
        
        if (isListening) {
            if (micStatus) micStatus.classList.add('active');
            if (listeningBanner) {
                listeningBanner.classList.remove('hidden');
                const statusText = listeningBanner.querySelector('.status-text');
                if (statusText) statusText.textContent = message;
            }
            if (voiceBtn) {
                voiceBtn.classList.add('listening');
                const statusEl = voiceBtn.querySelector('.voice-status');
                if (statusEl) statusEl.textContent = message;
            }
        } else {
            if (micStatus) micStatus.classList.remove('active');
            if (listeningBanner) listeningBanner.classList.add('hidden');
            if (voiceBtn) {
                voiceBtn.classList.remove('listening');
                const statusEl = voiceBtn.querySelector('.voice-status');
                if (statusEl) statusEl.textContent = 'Tap to speak';
            }
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
            
            oscillator.frequency.value = 880; // High pitch - "ready to listen"
            oscillator.type = 'sine';
            
            gainNode.gain.setValueAtTime(0.15, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.12);
            
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.12);
        } catch (e) {
            console.log('[Speech] Could not play listening tone');
        }
    }

    /**
     * Play a brief tone to confirm response received
     */
    playResponseTone() {
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.frequency.value = 660; // Lower pitch - "got it"
            oscillator.type = 'sine';
            
            gainNode.gain.setValueAtTime(0.15, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
            
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.1);
        } catch (e) {
            console.log('[Speech] Could not play response tone');
        }
    }
}

// Export singleton instance
const speechManager = new SpeechManager();
