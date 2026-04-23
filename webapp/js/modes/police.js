/**
 * BlindNav+ Police Mode
 * Emergency assistance for police/safety situations
 */

class PoliceMode {
    constructor() {
        this.isActive = false;
        this.urgencyLevel = 'normal'; // normal, urgent, critical
        this.sessionStartTime = null;
        this.isRecording = false;
        
        // Emergency types
        this.emergencyTypes = {
            crime: ['robbery', 'assault', 'theft', 'attack', 'violence'],
            suspicious: ['following', 'stalking', 'threatening', 'suspicious person'],
            accident: ['accident', 'crash', 'collision'],
            domestic: ['domestic', 'abuse', 'violence at home']
        };
    }
    
    /**
     * Start police mode
     */
    async start() {
        if (this.isActive) {
            speechManager.speak('Police mode is already active.', true);
            return;
        }
        
        this.isActive = true;
        this.sessionStartTime = Date.now();
        
        console.log('[Police] Mode started');
        
        // Alert tone
        if (Utils && Utils.audio) {
            Utils.audio.playAlert();
        }
        
        const welcome = `Police Mode activated. I'm here to help you in a safety situation.
            
            If you're in immediate danger, say "call police" or "call 911" right now.
            
            Otherwise, tell me what's happening. You can say:
            "Someone is following me"
            "I witnessed a crime"
            "I've been robbed"
            "There's been an accident"
            "I feel unsafe"
            "I need help"
            
            Other commands:
            Say "call police" to dial 911.
            Say "record" to try recording with your camera.
            Say "my location" to hear your GPS coordinates.
            Say "stay with me" for continuous support.
            Say "stop" or "exit" to end this mode.
            
            Your safety matters. What is your situation?`;
        
        speechManager.speak(welcome, true, 2);
        
        this.updateUI(true);
        
        // Haptic alert
        if (Utils && Utils.hapticFeedback) {
            Utils.hapticFeedback('warning');
        }
    }
    
    /**
     * Stop police mode
     */
    stop() {
        if (!this.isActive) return;
        
        this.isActive = false;
        this.urgencyLevel = 'normal';
        this.isRecording = false;
        
        cameraManager.stopFrameProcessing();
        
        speechManager.speak(
            'Police mode ended. If you feel unsafe again, say "police" or "call the cops" anytime. Stay safe.',
            true
        );
        
        this.updateUI(false);
        console.log('[Police] Mode stopped');
    }
    
    /**
     * Handle voice command
     * @param {string} command - Voice command
     * @returns {boolean} - Whether command was handled
     */
    handleVoiceCommand(command) {
        const cmd = command.toLowerCase();
        
        // Emergency calls
        if (cmd.includes('call police') || cmd.includes('call 911') || cmd.includes('call cops') || cmd.includes('dial 911')) {
            this.callPolice();
            return true;
        }
        
        // Being followed
        if (cmd.includes('following') || cmd.includes('stalking') || cmd.includes('someone behind')) {
            this.handleBeingFollowed();
            return true;
        }
        
        // Crime witnessed
        if (cmd.includes('witnessed') || cmd.includes('saw a crime') || cmd.includes('crime happening')) {
            this.handleWitnessedCrime();
            return true;
        }
        
        // Robbery
        if (cmd.includes('robbed') || cmd.includes('robbery') || cmd.includes('stole') || cmd.includes('theft')) {
            this.handleRobbery();
            return true;
        }
        
        // Assault/Attack
        if (cmd.includes('attack') || cmd.includes('assault') || cmd.includes('hit me') || cmd.includes('hurt me')) {
            this.handleAssault();
            return true;
        }
        
        // Accident
        if (cmd.includes('accident') || cmd.includes('crash') || cmd.includes('collision')) {
            this.handleAccident();
            return true;
        }
        
        // Feel unsafe
        if (cmd.includes('unsafe') || cmd.includes('scared') || cmd.includes('afraid') || cmd.includes('danger')) {
            this.handleFeelingUnsafe();
            return true;
        }
        
        // Recording
        if (cmd.includes('record') || cmd.includes('save video') || cmd.includes('capture')) {
            this.startRecording();
            return true;
        }
        
        // Location
        if (cmd.includes('my location') || cmd.includes('where am i') || cmd.includes('gps')) {
            this.announceLocation();
            return true;
        }
        
        // Stay with me
        if (cmd.includes('stay with me') || cmd.includes('keep talking') || cmd.includes('don\'t leave')) {
            this.stayWithUser();
            return true;
        }
        
        // Suspicious activity
        if (cmd.includes('suspicious') || cmd.includes('weird') || cmd.includes('strange')) {
            this.handleSuspiciousActivity();
            return true;
        }
        
        if (cmd.includes('stop') || cmd.includes('exit') || cmd.includes('quit')) {
            this.stop();
            return true;
        }
        
        // Default response
        speechManager.speak(
            'I\'m here to help. Tell me more about what\'s happening, or say "call police" if you need emergency services.',
            true
        );
        return true;
    }
    
    /**
     * Call police
     */
    callPolice() {
        this.urgencyLevel = 'critical';
        
        speechManager.speak(
            'Calling 911 for police emergency. ' +
            'When connected, speak clearly and state your emergency. ' +
            'Give your location if you can. ' +
            'Stay on the line. ' +
            'Opening phone dialer now.',
            true,
            2
        );
        
        // Get location first
        this.announceLocation();
        
        // Open dialer
        setTimeout(() => {
            window.location.href = 'tel:911';
        }, 3000);
        
        if (Utils && Utils.hapticFeedback) {
            Utils.hapticFeedback('error');
        }
    }
    
    /**
     * Handle being followed
     */
    handleBeingFollowed() {
        this.urgencyLevel = 'urgent';
        
        speechManager.speak(
            'If someone is following you, here\'s what to do: ' +
            
            'First, stay calm but stay alert. Don\'t let them know you\'re aware. ' +
            
            'Change your path. Turn a corner or cross the street. If they follow, they\'re targeting you. ' +
            
            'Head towards people. Go to a store, restaurant, or any public place. ' +
            
            'Call for help. Say "call police" and I\'ll dial 911. ' +
            
            'If you can, take a photo or remember their description: height, clothing, features. ' +
            
            'Do not go home if you think they\'re following. Go to a police station or fire station. ' +
            
            'Trust your instincts. If you feel threatened, say "call police" immediately. ' +
            
            'I\'m here with you. Say "stay with me" and I\'ll keep talking to you.',
            true,
            2
        );
        
        if (Utils && Utils.hapticFeedback) {
            Utils.hapticFeedback('warning');
        }
    }
    
    /**
     * Handle witnessed crime
     */
    handleWitnessedCrime() {
        speechManager.speak(
            'If you\'ve witnessed a crime: ' +
            
            'First, ensure your own safety. Don\'t intervene directly if it\'s dangerous. ' +
            
            'Remember as many details as you can: ' +
            'What happened, how many people involved, descriptions, direction they went. ' +
            
            'Call police to report it. Say "call police" and I\'ll help. ' +
            
            'Stay at a safe distance but don\'t leave the area if police might need you. ' +
            
            'Your information could be crucial. Would you like me to call police now?',
            true
        );
    }
    
    /**
     * Handle robbery
     */
    handleRobbery() {
        this.urgencyLevel = 'critical';
        
        speechManager.speak(
            'I\'m sorry this happened to you. Here\'s what to do: ' +
            
            'If the robber is still there: Don\'t resist. Your safety is more important than possessions. ' +
            
            'If they\'ve left: You\'re doing the right thing by getting help. ' +
            
            'Call police immediately. Say "call police" now. ' +
            
            'Try to remember: What did they look like? What were they wearing? Which way did they go? ' +
            
            'Don\'t touch anything they may have touched. This could be evidence. ' +
            
            'If you\'re injured, tell the police when they arrive. ' +
            
            'Say "call police" and I\'ll connect you to emergency services.',
            true,
            2
        );
        
        if (Utils && Utils.hapticFeedback) {
            Utils.hapticFeedback('error');
        }
    }
    
    /**
     * Handle assault
     */
    handleAssault() {
        this.urgencyLevel = 'critical';
        
        speechManager.speak(
            'If you\'ve been attacked or assaulted: ' +
            
            'First, get to safety. Move away from the attacker if possible. ' +
            
            'Call for help immediately. Say "call police" now. ' +
            
            'If you\'re injured, don\'t move too much. Help is coming. ' +
            
            'You can also call "medical mode" if you need medical guidance. ' +
            
            'This is not your fault. Getting help is the right thing to do. ' +
            
            'Tell me if you\'re safe right now, or say "call police" for emergency services.',
            true,
            2
        );
        
        if (Utils && Utils.hapticFeedback) {
            Utils.hapticFeedback('error');
        }
    }
    
    /**
     * Handle accident
     */
    handleAccident() {
        this.urgencyLevel = 'urgent';
        
        speechManager.speak(
            'For an accident: ' +
            
            'First, check if you\'re injured. If yes, don\'t move. Say "call police" for emergency services. ' +
            
            'If you\'re okay, check if others need help. ' +
            
            'Call 911. They\'ll send police and ambulance if needed. ' +
            
            'If it\'s a car accident: turn on hazard lights if you can, move to safety away from traffic. ' +
            
            'Exchange information with others involved if possible. ' +
            
            'Take photos if you can for documentation. ' +
            
            'Would you like me to call emergency services? Say "call police" or "call ambulance".',
            true
        );
    }
    
    /**
     * Handle feeling unsafe
     */
    handleFeelingUnsafe() {
        speechManager.speak(
            'I understand you feel unsafe. Trust your instincts. ' +
            
            'Here are some things you can do: ' +
            
            'Move to a more crowded, well-lit area. ' +
            
            'Call someone you trust. Stay on the phone with them. ' +
            
            'If you feel in danger, don\'t hesitate to call police. Say "call police". ' +
            
            'I can stay with you. Say "stay with me" and I\'ll keep talking. ' +
            
            'Use your camera. I can help monitor your surroundings. Say "security mode" for monitoring. ' +
            
            'Your feelings are valid. What would help you feel safer right now?',
            true
        );
    }
    
    /**
     * Start recording (attempt)
     */
    startRecording() {
        speechManager.speak(
            'I\'ll try to help you document this situation. ' +
            'Your camera is active. I\'m monitoring what\'s visible. ' +
            'Note: Actual video recording requires additional permissions. ' +
            'For evidence, try to remember details: faces, clothing, voices, time. ' +
            'If you have another way to record, do so discreetly. ' +
            'Say "describe what you see" and I\'ll tell you what the camera shows.',
            true
        );
        
        this.isRecording = true;
    }
    
    /**
     * Announce location
     */
    async announceLocation() {
        try {
            if (Utils && Utils.getCurrentLocation) {
                const location = await Utils.getCurrentLocation();
                speechManager.speak(
                    `Your current location is: ` +
                    `Latitude ${location.latitude.toFixed(6)}, ` +
                    `Longitude ${location.longitude.toFixed(6)}. ` +
                    `You can give these coordinates to emergency services.`,
                    true
                );
            } else {
                speechManager.speak('Location services not available. Try to describe your location by landmarks.', true);
            }
        } catch (error) {
            console.error('[Police] Location error:', error);
            speechManager.speak('Could not get your location. Describe where you are using street names or landmarks.', true);
        }
    }
    
    /**
     * Stay with user - continuous support
     */
    stayWithUser() {
        speechManager.speak(
            'I\'m here with you. You\'re not alone. ' +
            'Keep walking towards safety, towards other people. ' +
            'I\'m monitoring through your camera. ' +
            'Talk to me anytime. Tell me what you see or how you\'re feeling. ' +
            'If anything changes, let me know. ' +
            'You\'re doing great. Stay calm and keep moving to safety.',
            true
        );
        
        // Continue checking in
        setTimeout(() => {
            if (this.isActive) {
                speechManager.speak('I\'m still here. Are you feeling safer? Tell me if you need anything.', false);
            }
        }, 30000);
    }
    
    /**
     * Handle suspicious activity
     */
    handleSuspiciousActivity() {
        speechManager.speak(
            'You\'ve noticed something suspicious. Trust your instincts. ' +
            
            'If you feel safe enough, can you describe what seems suspicious? ' +
            
            'Is it a person? A vehicle? An object? ' +
            
            'If you feel this is urgent or threatens your safety, say "call police" now. ' +
            
            'Otherwise, I recommend moving to a safer location. ' +
            
            'Would you like to switch to security mode for monitoring? Say "security mode".',
            true
        );
    }
    
    /**
     * Update UI
     */
    updateUI(active) {
        const modeDisplay = document.getElementById('current-mode');
        const modeInfo = document.getElementById('mode-info');
        
        if (active) {
            if (modeDisplay) modeDisplay.textContent = '👮 Police Mode';
            if (modeInfo) {
                modeInfo.innerHTML = `
                    <p><strong>Police/Safety Mode Active</strong></p>
                    <p>Say "call police" for 911</p>
                    <p>Say what's happening for guidance</p>
                `;
            }
        } else {
            if (modeDisplay) modeDisplay.textContent = 'No Mode Active';
            if (modeInfo) modeInfo.innerHTML = '';
        }
    }
}

// Create global instance
const policeMode = new PoliceMode();
