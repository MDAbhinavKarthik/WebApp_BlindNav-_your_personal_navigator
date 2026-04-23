/**
 * BlindNav+ Distress Detection Service
 * Advanced audio monitoring for emergency detection
 * - Scream detection using audio analysis
 * - Distress voice keyword recognition
 * - Audio level monitoring for sudden sounds
 * - Continuous background listening for emergencies
 */

class DistressDetectionService {
    constructor() {
        // Audio context and nodes
        this.audioContext = null;
        this.analyser = null;
        this.microphone = null;
        this.mediaStream = null;

        // Detection state
        this.isListening = false;
        this.isEnabled = true;
        this.lastDetection = null;
        this.detectionCooldown = 5000; // 5 seconds between alerts

        // Audio analysis data
        this.audioData = {
            frequencyData: null,
            timeData: null,
            averageVolume: 0,
            peakVolume: 0,
            dominantFrequency: 0
        };

        // Detection thresholds
        this.thresholds = {
            // Volume thresholds (0-255 scale)
            normalVolume: 50,
            loudVolume: 120,
            screamVolume: 150,
            
            // Frequency thresholds for scream detection (Hz)
            screamFrequencyMin: 1000,
            screamFrequencyMax: 4000,
            
            // Duration thresholds (ms)
            sustainedLoudDuration: 500,
            screamMinDuration: 300,
            
            // Peak detection
            suddenLoudnessRatio: 3.0 // Current volume must be 3x baseline
        };

        // Distress keywords to detect in speech
        this.distressKeywords = {
            critical: [
                'help', 'help me', 'someone help',
                'emergency', 'call 911', 'call police',
                'fire', 'there\'s a fire',
                'attack', 'being attacked',
                'can\'t breathe', 'cannot breathe',
                'heart', 'chest pain',
                'dying', 'i\'m dying'
            ],
            urgent: [
                'hurt', 'injured', 'bleeding',
                'fell', 'fallen', 'fall down',
                'scared', 'afraid', 'danger',
                'unsafe', 'someone following',
                'lost', 'don\'t know where',
                'need help', 'please help',
                'accident', 'crash'
            ],
            medical: [
                'dizzy', 'faint', 'passing out',
                'allergic', 'reaction', 'epipen',
                'diabetes', 'insulin', 'sugar low',
                'seizure', 'shaking',
                'medicine', 'medication'
            ]
        };

        // Detection history for pattern analysis
        this.detectionHistory = [];
        this.maxHistoryLength = 100;

        // Baseline audio levels
        this.baseline = {
            volume: 30,
            samples: [],
            maxSamples: 50,
            calibrated: false
        };

        // Event listeners
        this.listeners = new Map();

        // Analysis interval
        this.analysisInterval = null;
        this.analysisRate = 100; // ms between analyses

        // Speech recognition for keyword detection
        this.speechRecognition = null;
        this.continuousListening = false;
    }

    /**
     * Initialize the distress detection service
     */
    async initialize() {
        console.log('[DistressDetection] Initializing...');

        try {
            // Setup audio context for sound analysis
            await this.setupAudioContext();

            // Setup speech recognition for keyword detection
            this.setupSpeechRecognition();

            console.log('[DistressDetection] Initialized successfully');
            return true;
        } catch (error) {
            console.error('[DistressDetection] Initialization error:', error);
            return false;
        }
    }

    /**
     * Setup audio context and analyser
     */
    async setupAudioContext() {
        try {
            // Create audio context
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();

            // Create analyser node
            this.analyser = this.audioContext.createAnalyser();
            this.analyser.fftSize = 2048;
            this.analyser.smoothingTimeConstant = 0.8;

            // Initialize data arrays
            this.audioData.frequencyData = new Uint8Array(this.analyser.frequencyBinCount);
            this.audioData.timeData = new Uint8Array(this.analyser.frequencyBinCount);

            return true;
        } catch (error) {
            console.error('[DistressDetection] Audio context setup error:', error);
            return false;
        }
    }

    /**
     * Setup speech recognition for keyword detection
     */
    setupSpeechRecognition() {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        
        if (!SpeechRecognition) {
            console.warn('[DistressDetection] Speech recognition not supported');
            return;
        }

        this.speechRecognition = new SpeechRecognition();
        this.speechRecognition.continuous = true;
        this.speechRecognition.interimResults = true;
        this.speechRecognition.lang = 'en-US';

        this.speechRecognition.onresult = (event) => {
            this.handleSpeechResult(event);
        };

        this.speechRecognition.onerror = (event) => {
            console.error('[DistressDetection] Speech recognition error:', event.error);
            
            // Restart if it stopped unexpectedly
            if (this.continuousListening && event.error !== 'aborted') {
                setTimeout(() => {
                    this.startKeywordListening();
                }, 1000);
            }
        };

        this.speechRecognition.onend = () => {
            // Restart if continuous listening is enabled
            if (this.continuousListening) {
                setTimeout(() => {
                    this.startKeywordListening();
                }, 500);
            }
        };
    }

    /**
     * Start listening for distress signals
     */
    async startListening() {
        if (this.isListening) {
            console.log('[DistressDetection] Already listening');
            return true;
        }

        try {
            // Request microphone access
            this.mediaStream = await navigator.mediaDevices.getUserMedia({ 
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: false // Keep original levels for detection
                }
            });

            // Connect microphone to analyser
            this.microphone = this.audioContext.createMediaStreamSource(this.mediaStream);
            this.microphone.connect(this.analyser);

            // Resume audio context if suspended
            if (this.audioContext.state === 'suspended') {
                await this.audioContext.resume();
            }

            // Start audio analysis loop
            this.startAudioAnalysis();

            // Calibrate baseline after short delay
            setTimeout(() => {
                this.calibrateBaseline();
            }, 2000);

            this.isListening = true;
            console.log('[DistressDetection] Started listening');

            return true;
        } catch (error) {
            console.error('[DistressDetection] Start listening error:', error);
            return false;
        }
    }

    /**
     * Stop listening
     */
    stopListening() {
        this.isListening = false;

        // Stop audio analysis
        if (this.analysisInterval) {
            clearInterval(this.analysisInterval);
            this.analysisInterval = null;
        }

        // Stop microphone
        if (this.mediaStream) {
            this.mediaStream.getTracks().forEach(track => track.stop());
            this.mediaStream = null;
        }

        // Disconnect microphone node
        if (this.microphone) {
            this.microphone.disconnect();
            this.microphone = null;
        }

        console.log('[DistressDetection] Stopped listening');
    }

    /**
     * Start keyword listening via speech recognition
     */
    startKeywordListening() {
        if (!this.speechRecognition) {
            console.warn('[DistressDetection] Speech recognition not available');
            return false;
        }

        try {
            this.continuousListening = true;
            this.speechRecognition.start();
            console.log('[DistressDetection] Keyword listening started');
            return true;
        } catch (error) {
            // May already be running
            if (error.message.includes('already started')) {
                return true;
            }
            console.error('[DistressDetection] Keyword listening error:', error);
            return false;
        }
    }

    /**
     * Stop keyword listening
     */
    stopKeywordListening() {
        this.continuousListening = false;
        if (this.speechRecognition) {
            try {
                this.speechRecognition.stop();
            } catch (e) {
                // Ignore if already stopped
            }
        }
        console.log('[DistressDetection] Keyword listening stopped');
    }

    /**
     * Start audio analysis loop
     */
    startAudioAnalysis() {
        this.analysisInterval = setInterval(() => {
            if (!this.isListening || !this.isEnabled) return;

            this.analyzeAudio();
        }, this.analysisRate);
    }

    /**
     * Analyze current audio
     */
    analyzeAudio() {
        if (!this.analyser) return;

        // Get frequency and time domain data
        this.analyser.getByteFrequencyData(this.audioData.frequencyData);
        this.analyser.getByteTimeDomainData(this.audioData.timeData);

        // Calculate metrics
        const volume = this.calculateVolume();
        const dominantFreq = this.calculateDominantFrequency();

        this.audioData.averageVolume = volume;
        this.audioData.dominantFrequency = dominantFreq;

        // Update peak
        if (volume > this.audioData.peakVolume) {
            this.audioData.peakVolume = volume;
        }

        // Add to baseline samples if calibrating
        if (!this.baseline.calibrated && this.baseline.samples.length < this.baseline.maxSamples) {
            this.baseline.samples.push(volume);
        }

        // Check for distress conditions
        this.checkDistressConditions(volume, dominantFreq);
    }

    /**
     * Calculate average volume from frequency data
     */
    calculateVolume() {
        if (!this.audioData.frequencyData) return 0;

        let sum = 0;
        for (let i = 0; i < this.audioData.frequencyData.length; i++) {
            sum += this.audioData.frequencyData[i];
        }
        return sum / this.audioData.frequencyData.length;
    }

    /**
     * Calculate dominant frequency
     */
    calculateDominantFrequency() {
        if (!this.audioData.frequencyData || !this.analyser) return 0;

        let maxValue = 0;
        let maxIndex = 0;

        for (let i = 0; i < this.audioData.frequencyData.length; i++) {
            if (this.audioData.frequencyData[i] > maxValue) {
                maxValue = this.audioData.frequencyData[i];
                maxIndex = i;
            }
        }

        // Convert bin index to frequency
        const nyquist = this.audioContext.sampleRate / 2;
        const binWidth = nyquist / this.analyser.frequencyBinCount;
        return maxIndex * binWidth;
    }

    /**
     * Calibrate baseline audio levels
     */
    calibrateBaseline() {
        if (this.baseline.samples.length > 10) {
            // Calculate average baseline
            const sum = this.baseline.samples.reduce((a, b) => a + b, 0);
            this.baseline.volume = sum / this.baseline.samples.length;
            this.baseline.calibrated = true;
            console.log('[DistressDetection] Baseline calibrated:', this.baseline.volume);
        }
    }

    /**
     * Check for distress conditions based on audio
     */
    checkDistressConditions(volume, dominantFreq) {
        const now = Date.now();

        // Skip if in cooldown
        if (this.lastDetection && (now - this.lastDetection) < this.detectionCooldown) {
            return;
        }

        // Check for scream (high volume + high frequency)
        const isScream = this.detectScream(volume, dominantFreq);
        if (isScream) {
            this.triggerDistressAlert('scream', {
                volume,
                frequency: dominantFreq,
                confidence: this.calculateScreamConfidence(volume, dominantFreq)
            });
            return;
        }

        // Check for sudden loud sound
        const isSuddenLoud = this.detectSuddenLoudSound(volume);
        if (isSuddenLoud) {
            this.triggerDistressAlert('sudden_loud', {
                volume,
                baseline: this.baseline.volume,
                ratio: volume / this.baseline.volume
            });
            return;
        }
    }

    /**
     * Detect scream based on audio characteristics
     * Screams typically have:
     * - High volume (>150 on 0-255 scale)
     * - Dominant frequency between 1000-4000 Hz
     * - Sustained duration
     */
    detectScream(volume, dominantFreq) {
        // Volume must exceed scream threshold
        if (volume < this.thresholds.screamVolume) {
            return false;
        }

        // Frequency must be in scream range
        if (dominantFreq < this.thresholds.screamFrequencyMin || 
            dominantFreq > this.thresholds.screamFrequencyMax) {
            return false;
        }

        // Check for sustained high volume (look at recent history)
        const recentDetections = this.detectionHistory.filter(
            d => (Date.now() - d.timestamp) < this.thresholds.screamMinDuration
        );

        // Need multiple consecutive high-volume detections
        const sustainedLoud = recentDetections.filter(
            d => d.volume > this.thresholds.loudVolume
        ).length >= 2;

        return sustainedLoud;
    }

    /**
     * Calculate confidence score for scream detection
     */
    calculateScreamConfidence(volume, dominantFreq) {
        let confidence = 0;

        // Volume contribution (0-40 points)
        const volumeScore = Math.min(40, ((volume - this.thresholds.loudVolume) / 
            (this.thresholds.screamVolume - this.thresholds.loudVolume)) * 40);
        confidence += volumeScore;

        // Frequency contribution (0-40 points)
        const idealFreq = 2500; // Middle of scream range
        const freqDiff = Math.abs(dominantFreq - idealFreq);
        const freqScore = Math.max(0, 40 - (freqDiff / 50));
        confidence += freqScore;

        // Duration/consistency contribution (0-20 points)
        const recentScreamLike = this.detectionHistory.filter(d => 
            d.type === 'scream_candidate' && 
            (Date.now() - d.timestamp) < 1000
        ).length;
        confidence += Math.min(20, recentScreamLike * 5);

        return Math.min(100, Math.round(confidence));
    }

    /**
     * Detect sudden loud sound (potential crash, fall, etc.)
     */
    detectSuddenLoudSound(volume) {
        if (!this.baseline.calibrated) return false;

        // Volume must significantly exceed baseline
        const ratio = volume / Math.max(this.baseline.volume, 1);
        return ratio >= this.thresholds.suddenLoudnessRatio && 
               volume > this.thresholds.loudVolume;
    }

    /**
     * Handle speech recognition results for keyword detection
     */
    handleSpeechResult(event) {
        const results = event.results;
        
        for (let i = event.resultIndex; i < results.length; i++) {
            const transcript = results[i][0].transcript.toLowerCase().trim();
            
            // Check for distress keywords
            const detection = this.checkDistressKeywords(transcript);
            
            if (detection) {
                this.triggerDistressAlert('keyword', {
                    transcript,
                    category: detection.category,
                    keyword: detection.keyword,
                    confidence: results[i][0].confidence
                });
            }
        }
    }

    /**
     * Check transcript for distress keywords
     */
    checkDistressKeywords(transcript) {
        // Check critical keywords first
        for (const keyword of this.distressKeywords.critical) {
            if (transcript.includes(keyword)) {
                return { category: 'critical', keyword };
            }
        }

        // Check urgent keywords
        for (const keyword of this.distressKeywords.urgent) {
            if (transcript.includes(keyword)) {
                return { category: 'urgent', keyword };
            }
        }

        // Check medical keywords
        for (const keyword of this.distressKeywords.medical) {
            if (transcript.includes(keyword)) {
                return { category: 'medical', keyword };
            }
        }

        return null;
    }

    /**
     * Trigger distress alert
     */
    triggerDistressAlert(type, data) {
        const now = Date.now();
        
        // Update last detection time
        this.lastDetection = now;

        // Create alert object
        const alert = {
            type,
            data,
            timestamp: now,
            id: `distress_${now}`
        };

        // Add to history
        this.addToHistory(alert);

        // Emit event
        this.emit('distress', alert);

        console.log('[DistressDetection] ALERT:', type, data);

        // Handle based on type
        switch (type) {
            case 'scream':
                this.handleScreamDetected(data);
                break;
            case 'sudden_loud':
                this.handleSuddenLoudSound(data);
                break;
            case 'keyword':
                this.handleDistressKeyword(data);
                break;
        }
    }

    /**
     * Handle scream detection
     */
    handleScreamDetected(data) {
        console.log('[DistressDetection] SCREAM DETECTED!', data);
        
        // Emit high-priority alert
        this.emit('scream', {
            confidence: data.confidence,
            volume: data.volume,
            frequency: data.frequency,
            timestamp: Date.now()
        });

        // Trigger emergency response
        this.triggerEmergencyResponse('scream');
    }

    /**
     * Handle sudden loud sound
     */
    handleSuddenLoudSound(data) {
        console.log('[DistressDetection] SUDDEN LOUD SOUND!', data);
        
        this.emit('loud_sound', {
            volume: data.volume,
            baseline: data.baseline,
            ratio: data.ratio,
            timestamp: Date.now()
        });

        // Could indicate fall or crash - verify with user
        this.verifyUserSafety();
    }

    /**
     * Handle distress keyword detection
     */
    handleDistressKeyword(data) {
        console.log('[DistressDetection] DISTRESS KEYWORD:', data.keyword);

        this.emit('keyword_detected', {
            category: data.category,
            keyword: data.keyword,
            transcript: data.transcript,
            confidence: data.confidence,
            timestamp: Date.now()
        });

        // Handle based on category
        switch (data.category) {
            case 'critical':
                this.triggerEmergencyResponse('keyword_critical');
                break;
            case 'urgent':
                this.triggerEmergencyResponse('keyword_urgent');
                break;
            case 'medical':
                this.triggerMedicalResponse(data.keyword);
                break;
        }
    }

    /**
     * Trigger emergency response
     */
    triggerEmergencyResponse(reason) {
        console.log('[DistressDetection] Triggering emergency response:', reason);

        // Emit emergency event for app to handle
        this.emit('emergency', {
            reason,
            timestamp: Date.now(),
            autoTriggered: true
        });

        // If emergency mode exists, activate it
        if (typeof emergencyMode !== 'undefined' && emergencyMode.triggerEmergency) {
            emergencyMode.triggerEmergency('auto_detected');
        }
    }

    /**
     * Trigger medical response
     */
    triggerMedicalResponse(keyword) {
        console.log('[DistressDetection] Triggering medical response:', keyword);

        this.emit('medical_alert', {
            keyword,
            timestamp: Date.now()
        });

        // If medical mode exists, activate it
        if (typeof medicalMode !== 'undefined') {
            // Could auto-start medical mode or provide guidance
        }
    }

    /**
     * Verify user safety after loud sound
     */
    verifyUserSafety() {
        // Give user a moment, then check if they're okay
        setTimeout(() => {
            this.emit('safety_check', {
                reason: 'loud_sound_detected',
                timestamp: Date.now()
            });

            // Speak check message
            if (typeof speechManager !== 'undefined') {
                speechManager.speak(
                    'I detected a loud sound. Are you okay? Say "I\'m okay" if you\'re safe, ' +
                    'or "help" if you need assistance.',
                    true,
                    2
                );
            }
        }, 1000);
    }

    /**
     * Add detection to history
     */
    addToHistory(detection) {
        this.detectionHistory.push({
            ...detection,
            volume: this.audioData.averageVolume
        });

        // Trim history if too long
        while (this.detectionHistory.length > this.maxHistoryLength) {
            this.detectionHistory.shift();
        }
    }

    /**
     * Get detection statistics
     */
    getStatistics() {
        const now = Date.now();
        const lastHour = this.detectionHistory.filter(
            d => (now - d.timestamp) < 3600000
        );

        return {
            totalDetections: this.detectionHistory.length,
            lastHourDetections: lastHour.length,
            screamDetections: lastHour.filter(d => d.type === 'scream').length,
            keywordDetections: lastHour.filter(d => d.type === 'keyword').length,
            loudSoundDetections: lastHour.filter(d => d.type === 'sudden_loud').length,
            lastDetection: this.lastDetection,
            isListening: this.isListening,
            baselineVolume: this.baseline.volume,
            currentVolume: this.audioData.averageVolume
        };
    }

    /**
     * Update detection thresholds
     */
    updateThresholds(newThresholds) {
        this.thresholds = { ...this.thresholds, ...newThresholds };
        console.log('[DistressDetection] Thresholds updated:', this.thresholds);
    }

    /**
     * Add custom distress keyword
     */
    addDistressKeyword(category, keyword) {
        if (this.distressKeywords[category]) {
            if (!this.distressKeywords[category].includes(keyword.toLowerCase())) {
                this.distressKeywords[category].push(keyword.toLowerCase());
                console.log(`[DistressDetection] Added keyword "${keyword}" to ${category}`);
            }
        }
    }

    /**
     * Enable/disable detection
     */
    setEnabled(enabled) {
        this.isEnabled = enabled;
        console.log('[DistressDetection] Detection enabled:', enabled);
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
                    console.error('[DistressDetection] Event callback error:', error);
                }
            });
        }
    }

    /**
     * Clean up resources
     */
    destroy() {
        this.stopListening();
        this.stopKeywordListening();

        if (this.audioContext) {
            this.audioContext.close();
            this.audioContext = null;
        }

        this.listeners.clear();
        console.log('[DistressDetection] Destroyed');
    }

    /**
     * Get real-time audio visualization data
     */
    getVisualizationData() {
        return {
            frequencyData: Array.from(this.audioData.frequencyData || []),
            timeData: Array.from(this.audioData.timeData || []),
            volume: this.audioData.averageVolume,
            peak: this.audioData.peakVolume,
            dominantFrequency: this.audioData.dominantFrequency,
            baseline: this.baseline.volume
        };
    }

    /**
     * Perform manual scream test
     */
    performScreamTest() {
        console.log('[DistressDetection] Running scream detection test...');
        
        // Temporarily lower thresholds for testing
        const originalThreshold = this.thresholds.screamVolume;
        this.thresholds.screamVolume = 80; // Lower for testing

        setTimeout(() => {
            // Restore original threshold
            this.thresholds.screamVolume = originalThreshold;
            console.log('[DistressDetection] Scream test complete');
        }, 10000);

        return true;
    }
}

// Create and export global instance
const distressDetection = new DistressDetectionService();
