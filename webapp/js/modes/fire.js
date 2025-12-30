/**
 * BlindNav+ Enhanced Fire Mode
 * Fire emergency handling with visual fire/smoke detection,
 * evacuation guidance, and escape route assistance
 */

class FireMode {
    constructor() {
        this.isActive = false;
        this.alertLevel = 'normal'; // normal, warning, emergency, critical
        this.sessionStartTime = null;
        this.frameProcessingActive = false;
        
        // Fire detection state
        this.fireDetection = {
            active: false,
            lastDetection: null,
            smokeDetected: false,
            fireDetected: false,
            confidence: 0,
            detectionHistory: []
        };
        
        // Evacuation state
        this.evacuation = {
            inProgress: false,
            startTime: null,
            currentStep: 0,
            exitReached: false,
            trappedReported: false
        };
        
        // Building/environment info
        this.environment = {
            floorLevel: null, // User's floor level if known
            nearestExit: null,
            buildingType: 'unknown' // home, office, public, etc.
        };
        
        // Fire detection thresholds (for color-based detection)
        this.detectionThresholds = {
            // Fire colors (orange/red/yellow)
            fireHueMin: 0,
            fireHueMax: 40,
            fireSatMin: 50,
            fireValMin: 50,
            
            // Smoke colors (gray)
            smokeHueMin: 0,
            smokeHueMax: 360,
            smokeSatMax: 30,
            smokeValMin: 30,
            smokeValMax: 200,
            
            // Minimum pixel percentage to trigger
            minFirePixelPercent: 5,
            minSmokePixelPercent: 10
        };
        
        // Evacuation instructions database
        this.evacuationSteps = {
            initial: [
                'Stay calm. Panic can be dangerous.',
                'Feel the door before opening. If it\'s hot, don\'t open it.',
                'If the door is cool, open slowly and be ready to close it if smoke rushes in.',
                'Get down low. Crawl on your hands and knees. Smoke rises, so cleaner air is near the floor.',
                'Move towards the nearest exit. If you know the building, head to the closest stairs or door.',
                'Never use elevators during a fire.',
                'Once outside, move at least 50 feet from the building.',
                'Call 911 when you\'re safely outside.'
            ],
            trapped: [
                'Close the door to the room you\'re in.',
                'Seal gaps under the door with wet towels, clothes, or anything available.',
                'Call 911 immediately. Tell them you\'re trapped and your location.',
                'Go to a window. If you can\'t get out, wave something bright or use a flashlight.',
                'Stay low near the floor where air is cleaner.',
                'Cover your mouth and nose with a wet cloth.',
                'Keep calling out or banging on walls so firefighters can find you.',
                'Wait for rescue. Help is coming.'
            ],
            stairs: [
                'Hold the handrail firmly.',
                'Stay to the right to allow others to pass.',
                'Take one step at a time. Count steps if it helps.',
                'If smoke is heavy in the stairwell, go back and find another route.',
                'Don\'t stop on landings. Keep moving down.',
                'If you fall, try to move to the side so others can pass.'
            ]
        };

        // Alert sounds
        this.alertSounds = {
            warning: { frequency: 800, duration: 0.3, repeat: 3 },
            emergency: { frequency: 1000, duration: 0.2, repeat: 5 },
            critical: { frequency: 1200, duration: 0.15, repeat: 8 }
        };

        this.audioContext = null;
    }

    /**
     * Start fire mode
     */
    async start() {
        if (this.isActive) {
            speechManager.speak('Fire mode is already active.', true);
            return;
        }

        this.isActive = true;
        this.sessionStartTime = Date.now();
        this.alertLevel = 'warning';

        console.log('[Fire] Mode started');

        // Play warning alert
        this.playAlertSound('warning');

        const welcome = `FIRE MODE ACTIVATED. This is a serious situation. Stay calm and listen carefully.
            
            IMPORTANT: If you are in immediate danger, evacuate now. Say "help me escape" for step-by-step guidance.
            
            Available commands:
            Say "help me escape" for evacuation guidance.
            Say "call fire department" or "call 911" to call emergency services.
            Say "I smell smoke" if you detect smoke.
            Say "I see fire" if you see flames.
            Say "I'm trapped" if you cannot escape.
            Say "find exit" for help finding an exit.
            Say "scan for fire" to use the camera to look for fire or smoke.
            Say "I'm outside" when you've evacuated safely.
            Say "my location" to hear your GPS coordinates for emergency services.
            
            Your safety is the priority. What is your situation?`;

        speechManager.speak(welcome, true, 3);
        
        this.updateUI(true);

        // Haptic alert
        if (Utils && Utils.hapticFeedback) {
            Utils.hapticFeedback('error');
        }
    }

    /**
     * Stop fire mode
     */
    stop() {
        if (!this.isActive) return;

        // Warn if in emergency
        if (this.alertLevel === 'emergency' || this.alertLevel === 'critical') {
            speechManager.speak(
                'Warning: Fire emergency is active. Are you safe? ' +
                'Say "I\'m safe" to confirm, or "help me escape" if you need guidance.',
                true
            );
            return;
        }

        this.isActive = false;
        this.alertLevel = 'normal';
        this.frameProcessingActive = false;
        
        cameraManager.stopFrameProcessing();

        const duration = Math.round((Date.now() - this.sessionStartTime) / 1000 / 60);

        speechManager.speak(
            `Fire mode ended. Session lasted ${duration > 0 ? duration + ' minutes' : 'less than a minute'}. ` +
            `If you encounter fire or smoke again, say "fire" or "there's a fire" immediately.`,
            true
        );

        this.updateUI(false);
        console.log('[Fire] Mode stopped');
    }

    /**
     * Force stop fire mode
     */
    forceStop() {
        this.isActive = false;
        this.alertLevel = 'normal';
        this.frameProcessingActive = false;
        cameraManager.stopFrameProcessing();
        speechManager.speak('Fire mode ended.', true);
        this.updateUI(false);
    }

    /**
     * Handle voice command
     */
    handleVoiceCommand(command) {
        const cmd = command.toLowerCase();

        // Emergency calls - highest priority
        if (cmd.includes('call 911') || cmd.includes('call fire') || 
            cmd.includes('call emergency') || cmd.includes('dial 911')) {
            this.callFireDepartment();
            return true;
        }

        // Escape guidance
        if (cmd.includes('help me escape') || cmd.includes('escape') || 
            cmd.includes('get out') || cmd.includes('evacuat')) {
            this.provideEscapeGuidance();
            return true;
        }

        // Find exit
        if (cmd.includes('find exit') || cmd.includes('where') && cmd.includes('exit') ||
            cmd.includes('nearest exit')) {
            this.helpFindExit();
            return true;
        }

        // Smoke detected
        if (cmd.includes('smell smoke') || cmd.includes('smoke') || cmd.includes('smells like')) {
            this.handleSmokeDetected();
            return true;
        }

        // Fire seen
        if (cmd.includes('see fire') || cmd.includes('fire') && !cmd.includes('fire mode') ||
            cmd.includes('flames') || cmd.includes('burning')) {
            this.handleFireSeen();
            return true;
        }

        // Trapped
        if (cmd.includes('trapped') || cmd.includes('can\'t get out') || 
            cmd.includes('cannot escape') || cmd.includes('stuck')) {
            this.handleTrapped();
            return true;
        }

        // User is outside/safe
        if (cmd.includes('i\'m outside') || cmd.includes('i am outside') || 
            cmd.includes('i\'m safe') || cmd.includes('made it out')) {
            this.confirmEvacuation();
            return true;
        }

        // Scan for fire
        if (cmd.includes('scan') || cmd.includes('look for fire') || 
            cmd.includes('detect fire') || cmd.includes('check for fire')) {
            this.startFireDetection();
            return true;
        }

        // Location query
        if (cmd.includes('my location') || cmd.includes('where am i')) {
            this.announceLocation();
            return true;
        }

        // Stairs help
        if (cmd.includes('stairs') || cmd.includes('stairway') || cmd.includes('stairwell')) {
            this.provideStairGuidance();
            return true;
        }

        // Door check
        if (cmd.includes('door') || cmd.includes('check door') || cmd.includes('feel door')) {
            this.provideDoorCheckGuidance();
            return true;
        }

        // Safe/force exit
        if (cmd.includes('force stop') || cmd.includes('force exit')) {
            this.forceStop();
            return true;
        }

        // Normal exit
        if ((cmd.includes('stop') || cmd.includes('exit') || cmd.includes('quit')) && 
            this.alertLevel === 'normal') {
            this.stop();
            return true;
        }

        // Default - emphasize safety
        speechManager.speak(
            'In a fire emergency, your safety comes first. ' +
            'Say "help me escape" for evacuation guidance, or "call 911" to call emergency services. ' +
            'If you\'re trapped, say "I\'m trapped" for specific instructions.',
            true
        );
        return true;
    }

    /**
     * Call fire department
     */
    callFireDepartment() {
        this.alertLevel = 'emergency';

        speechManager.speak(
            'Calling 911 fire emergency. When connected, say: ' +
            '"There is a fire" and give your location. ' +
            'Describe the situation: smoke, flames, anyone trapped. ' +
            'Stay on the line. Opening phone dialer now.',
            true, 2
        );

        // Get location
        this.getLocationForEmergency();

        setTimeout(() => {
            window.location.href = 'tel:911';
        }, 3000);

        // Haptic alert
        if (Utils && Utils.hapticFeedback) {
            Utils.hapticFeedback('error');
        }
    }

    /**
     * Get location for emergency
     */
    async getLocationForEmergency() {
        try {
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition((position) => {
                    const { latitude, longitude } = position.coords;
                    speechManager.speak(
                        `Your location: Latitude ${latitude.toFixed(4)}, Longitude ${longitude.toFixed(4)}. ` +
                        `Tell this to the emergency operator.`,
                        false
                    );
                }, (error) => {
                    speechManager.speak('Could not get GPS location. Describe your address to the operator.', false);
                });
            }
        } catch (error) {
            console.error('[Fire] Location error:', error);
        }
    }

    /**
     * Announce location
     */
    announceLocation() {
        navigator.geolocation.getCurrentPosition((position) => {
            const { latitude, longitude } = position.coords;
            speechManager.speak(
                `Your GPS coordinates are: Latitude ${latitude.toFixed(6)}, Longitude ${longitude.toFixed(6)}. ` +
                `Share these with emergency services.`,
                true
            );
        }, () => {
            speechManager.speak('Could not determine your location. Try to describe your address.', true);
        });
    }

    /**
     * Provide escape guidance
     */
    provideEscapeGuidance() {
        this.alertLevel = 'emergency';
        this.evacuation.inProgress = true;
        this.evacuation.startTime = Date.now();
        this.evacuation.currentStep = 0;

        const guidance = `EVACUATION GUIDANCE. Follow these steps carefully:

            ${this.evacuationSteps.initial.map((step, i) => `Step ${i + 1}: ${step}`).join('\n\n')}
            
            I will guide you through each step. Say "next" to move to the next step.
            Say "repeat" to hear the current step again.
            Say "I'm trapped" if you cannot continue.
            
            Starting now: ${this.evacuationSteps.initial[0]}`;

        speechManager.speak(guidance, true, 3);

        // Follow up prompts
        this.startEvacuationFollowUp();
    }

    /**
     * Start evacuation follow-up
     */
    startEvacuationFollowUp() {
        // Periodic check-ins during evacuation
        setTimeout(() => {
            if (this.isActive && this.evacuation.inProgress && !this.evacuation.exitReached) {
                speechManager.speak(
                    'Are you making progress? Say "next" for the next step, ' +
                    '"I\'m outside" if you\'ve evacuated, or "I\'m trapped" if you need help.',
                    true
                );
            }
        }, 30000);
    }

    /**
     * Provide stair guidance
     */
    provideStairGuidance() {
        const guidance = `For using stairs during a fire emergency:

            ${this.evacuationSteps.stairs.map((step, i) => `Step ${i + 1}: ${step}`).join('\n\n')}
            
            If the stairwell is filled with smoke, do NOT enter. Find another route.
            
            Are you at the stairs now? Say "yes" to continue guidance.`;

        speechManager.speak(guidance, true, 2);
    }

    /**
     * Provide door check guidance
     */
    provideDoorCheckGuidance() {
        speechManager.speak(
            'Before opening any door during a fire: ' +
            'Step 1: Touch the door with the back of your hand, not your palm. ' +
            'Step 2: If the door feels hot, do NOT open it. There may be fire on the other side. ' +
            'Step 3: If it\'s cool, open it slowly and carefully. ' +
            'Step 4: Be ready to close it immediately if smoke rushes in. ' +
            'Step 5: Stay low as you exit. ' +
            'Is the door hot or cool?',
            true, 2
        );
    }

    /**
     * Handle smoke detected
     */
    handleSmokeDetected() {
        this.alertLevel = 'warning';
        this.fireDetection.smokeDetected = true;

        this.playAlertSound('warning');

        speechManager.speak(
            'Smoke detected! This is serious. Take action now: ' +
            'Alert others nearby. Shout "Fire!" ' +
            'Do NOT investigate the source. Begin evacuating immediately. ' +
            'Get low - smoke rises, cleaner air is near the floor. ' +
            'Cover your mouth and nose with a cloth if possible. ' +
            'Say "help me escape" for step-by-step guidance, or "call 911" for emergency services.',
            true, 2
        );

        if (Utils && Utils.hapticFeedback) {
            Utils.hapticFeedback('warning');
        }
    }

    /**
     * Handle fire seen
     */
    handleFireSeen() {
        this.alertLevel = 'critical';
        this.fireDetection.fireDetected = true;

        this.playAlertSound('critical');

        speechManager.speak(
            'FIRE CONFIRMED! Leave the area immediately! ' +
            'Do NOT try to fight the fire unless it\'s very small and you have an extinguisher. ' +
            'Alert everyone nearby. Shout "Fire!" ' +
            'Evacuate now. Stay low and move quickly. ' +
            'Say "help me escape" for guidance, or "call 911" for emergency services.',
            true, 3
        );

        if (Utils && Utils.hapticFeedback) {
            Utils.hapticFeedback('error');
        }
    }

    /**
     * Handle trapped situation
     */
    handleTrapped() {
        this.alertLevel = 'critical';
        this.evacuation.trappedReported = true;

        this.playAlertSound('critical');

        const guidance = `If you're trapped, follow these steps immediately:

            ${this.evacuationSteps.trapped.map((step, i) => `Step ${i + 1}: ${step}`).join('\n\n')}
            
            Most importantly: Call 911 NOW. Say "call 911" and I will help you.
            Tell them your exact location - floor number, room description.
            Help IS coming. Stay as calm as possible.`;

        speechManager.speak(guidance, true, 3);

        if (Utils && Utils.hapticFeedback) {
            Utils.hapticFeedback('error');
        }
    }

    /**
     * Confirm evacuation
     */
    confirmEvacuation() {
        this.alertLevel = 'normal';
        this.evacuation.exitReached = true;
        this.evacuation.inProgress = false;

        // Success sound
        if (Utils && Utils.audio) {
            Utils.audio.playSuccess();
        }

        speechManager.speak(
            'I\'m so relieved you\'re outside safely! ' +
            'Move further away from the building - at least 50 feet. ' +
            'Do NOT go back inside for any reason. ' +
            'If you haven\'t already, call 911 to report the fire. ' +
            'Wait for firefighters to arrive. ' +
            'If you know of anyone still inside, tell the firefighters immediately. ' +
            'You did great. Stay safe.',
            true
        );
    }

    /**
     * Help find exit
     */
    helpFindExit() {
        speechManager.speak(
            'To find an exit in an unfamiliar space: ' +
            'Step 1: If you know the building, head to the nearest exit you remember. ' +
            'Step 2: Stay along walls - walls lead to doors. ' +
            'Step 3: Feel for door frames as you move. ' +
            'Step 4: Emergency exits are usually at the ends of hallways. ' +
            'Step 5: Listen for sounds from outside or emergency alarms - they can guide you. ' +
            'Step 6: If you find a door, check if it\'s hot before opening. ' +
            'Keep one hand on the wall and keep moving. ' +
            'If you have a cane, use it to detect obstacles.',
            true, 2
        );
    }

    /**
     * Start visual fire detection
     */
    startFireDetection() {
        speechManager.speak(
            'Starting visual scan for fire and smoke. Point your camera around the room slowly.',
            true
        );

        this.fireDetection.active = true;
        this.frameProcessingActive = true;

        cameraManager.startFrameProcessing(async (frame) => {
            if (!this.isActive || !this.frameProcessingActive) return;

            // Analyze frame for fire/smoke colors
            const detection = this.analyzeFrameForFire(frame);

            if (detection.fireDetected || detection.smokeDetected) {
                this.handleVisualDetection(detection);
            }

            // Draw overlay
            if (frame.ctx) {
                this.drawFireDetectionOverlay(frame.ctx, frame.width, frame.height, detection);
            }
        });

        // Stop after scan period
        setTimeout(() => {
            if (this.frameProcessingActive) {
                this.frameProcessingActive = false;
                this.fireDetection.active = false;
                cameraManager.stopFrameProcessing();
                
                if (!this.fireDetection.fireDetected && !this.fireDetection.smokeDetected) {
                    speechManager.speak(
                        'Visual scan complete. No fire or smoke visually detected. ' +
                        'However, trust your senses: if you smell smoke or feel heat, evacuate immediately.',
                        true
                    );
                }
            }
        }, 15000);
    }

    /**
     * Analyze frame for fire/smoke colors
     */
    analyzeFrameForFire(frame) {
        const detection = {
            fireDetected: false,
            smokeDetected: false,
            fireConfidence: 0,
            smokeConfidence: 0,
            hotspots: []
        };

        try {
            // Get image data
            const canvas = document.createElement('canvas');
            canvas.width = frame.width;
            canvas.height = frame.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(cameraManager.imgElement, 0, 0);
            
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data;
            
            let firePixels = 0;
            let smokePixels = 0;
            const totalPixels = canvas.width * canvas.height;

            // Sample pixels (every 4th pixel for performance)
            for (let i = 0; i < data.length; i += 16) {
                const r = data[i];
                const g = data[i + 1];
                const b = data[i + 2];

                // Convert to HSV
                const hsv = this.rgbToHsv(r, g, b);

                // Check for fire colors (orange/red/yellow with high brightness)
                if (this.isFireColor(hsv, r, g, b)) {
                    firePixels++;
                }

                // Check for smoke colors (gray, medium brightness)
                if (this.isSmokeColor(hsv, r, g, b)) {
                    smokePixels++;
                }
            }

            // Calculate percentages
            const firePercent = (firePixels / (totalPixels / 4)) * 100;
            const smokePercent = (smokePixels / (totalPixels / 4)) * 100;

            detection.fireConfidence = Math.min(100, firePercent * 2);
            detection.smokeConfidence = Math.min(100, smokePercent * 2);

            if (firePercent >= this.detectionThresholds.minFirePixelPercent) {
                detection.fireDetected = true;
            }

            if (smokePercent >= this.detectionThresholds.minSmokePixelPercent) {
                detection.smokeDetected = true;
            }

        } catch (error) {
            console.error('[Fire] Detection analysis error:', error);
        }

        return detection;
    }

    /**
     * Check if color is fire-like
     */
    isFireColor(hsv, r, g, b) {
        // Fire is typically red/orange/yellow with high saturation and value
        // R > G > B and high brightness
        const isWarm = r > 150 && r > g && g > b;
        const isBright = (r + g + b) / 3 > 100;
        const hasFireHue = hsv.h >= this.detectionThresholds.fireHueMin && 
                          hsv.h <= this.detectionThresholds.fireHueMax;
        const hasSaturation = hsv.s >= this.detectionThresholds.fireSatMin;
        
        return isWarm && isBright && hasFireHue && hasSaturation;
    }

    /**
     * Check if color is smoke-like
     */
    isSmokeColor(hsv, r, g, b) {
        // Smoke is grayish - low saturation, medium value
        const isGray = Math.abs(r - g) < 30 && Math.abs(g - b) < 30 && Math.abs(r - b) < 30;
        const isMediumBrightness = hsv.v >= this.detectionThresholds.smokeValMin && 
                                   hsv.v <= this.detectionThresholds.smokeValMax;
        const lowSaturation = hsv.s <= this.detectionThresholds.smokeSatMax;
        
        return isGray && isMediumBrightness && lowSaturation;
    }

    /**
     * RGB to HSV conversion
     */
    rgbToHsv(r, g, b) {
        r /= 255;
        g /= 255;
        b /= 255;

        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        const d = max - min;

        let h = 0;
        const s = max === 0 ? 0 : d / max;
        const v = max;

        if (d !== 0) {
            switch (max) {
                case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
                case g: h = ((b - r) / d + 2) / 6; break;
                case b: h = ((r - g) / d + 4) / 6; break;
            }
        }

        return {
            h: h * 360,
            s: s * 100,
            v: v * 100
        };
    }

    /**
     * Handle visual detection
     */
    handleVisualDetection(detection) {
        const now = Date.now();
        
        // Debounce - don't alert more than once per 5 seconds
        if (this.fireDetection.lastDetection && 
            (now - this.fireDetection.lastDetection) < 5000) {
            return;
        }

        this.fireDetection.lastDetection = now;
        this.fireDetection.detectionHistory.push({
            timestamp: now,
            ...detection
        });

        if (detection.fireDetected && detection.fireConfidence > 50) {
            this.alertLevel = 'critical';
            this.fireDetection.fireDetected = true;
            
            this.playAlertSound('critical');
            
            speechManager.speak(
                `WARNING! Visual fire detected with ${Math.round(detection.fireConfidence)}% confidence! ` +
                'Evacuate immediately! Say "help me escape" for guidance.',
                true, 3
            );
        } else if (detection.smokeDetected && detection.smokeConfidence > 50) {
            this.alertLevel = 'warning';
            this.fireDetection.smokeDetected = true;
            
            this.playAlertSound('warning');
            
            speechManager.speak(
                `Possible smoke detected with ${Math.round(detection.smokeConfidence)}% confidence. ` +
                'Investigate carefully or evacuate to be safe.',
                true, 2
            );
        }
    }

    /**
     * Draw fire detection overlay
     */
    drawFireDetectionOverlay(ctx, width, height, detection) {
        // Clear and redraw video
        ctx.clearRect(0, 0, width, height);
        ctx.drawImage(cameraManager.imgElement, 0, 0);

        // Draw detection status
        ctx.fillStyle = detection.fireDetected ? 'rgba(255, 0, 0, 0.3)' : 
                        detection.smokeDetected ? 'rgba(128, 128, 128, 0.3)' : 
                        'rgba(0, 255, 0, 0.1)';
        ctx.fillRect(0, 0, width, height);

        // Status text
        ctx.fillStyle = 'white';
        ctx.strokeStyle = 'black';
        ctx.font = 'bold 16px Arial';
        ctx.lineWidth = 3;

        let statusText = 'Scanning...';
        if (detection.fireDetected) {
            statusText = `🔥 FIRE DETECTED (${Math.round(detection.fireConfidence)}%)`;
            ctx.fillStyle = 'red';
        } else if (detection.smokeDetected) {
            statusText = `💨 SMOKE DETECTED (${Math.round(detection.smokeConfidence)}%)`;
            ctx.fillStyle = 'yellow';
        }

        ctx.strokeText(statusText, 10, 30);
        ctx.fillText(statusText, 10, 30);
    }

    /**
     * Play alert sound
     */
    playAlertSound(type) {
        try {
            if (!this.audioContext) {
                this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            }

            const sound = this.alertSounds[type] || this.alertSounds.warning;
            const now = this.audioContext.currentTime;

            for (let i = 0; i < sound.repeat; i++) {
                const oscillator = this.audioContext.createOscillator();
                const gainNode = this.audioContext.createGain();

                oscillator.connect(gainNode);
                gainNode.connect(this.audioContext.destination);

                oscillator.frequency.value = sound.frequency;
                oscillator.type = 'sine';

                gainNode.gain.setValueAtTime(0.5, now + i * (sound.duration + 0.1));
                gainNode.gain.exponentialRampToValueAtTime(0.01, now + i * (sound.duration + 0.1) + sound.duration);

                oscillator.start(now + i * (sound.duration + 0.1));
                oscillator.stop(now + i * (sound.duration + 0.1) + sound.duration);
            }
        } catch (error) {
            console.error('[Fire] Alert sound error:', error);
        }
    }

    /**
     * Update UI
     */
    updateUI(active) {
        const modeDisplay = document.getElementById('current-mode');
        const modeInfo = document.getElementById('mode-info');
        const modeContent = document.getElementById('mode-content');

        if (active) {
            if (modeDisplay) modeDisplay.textContent = '🔥 Fire Mode';
            if (modeInfo) {
                const levelClass = this.alertLevel === 'critical' ? 'danger' : 
                                   this.alertLevel === 'emergency' ? 'warning' : '';
                modeInfo.innerHTML = `
                    <p><strong>⚠️ Fire Emergency Mode</strong></p>
                    <p class="${levelClass}">Alert Level: ${this.alertLevel.toUpperCase()}</p>
                    <p>Say "help me escape" for guidance</p>
                `;
            }
            if (modeContent) {
                modeContent.innerHTML = `
                    <div class="fire-display">
                        <div class="fire-status ${this.alertLevel}">
                            <span class="fire-icon">🔥</span>
                            <span class="fire-level">${this.alertLevel.toUpperCase()}</span>
                        </div>
                        
                        <div class="fire-actions">
                            <button id="call-fire-btn" class="btn btn-danger">📞 Call 911</button>
                            <button id="escape-guide-btn" class="btn btn-warning">🏃 Help Me Escape</button>
                            <button id="scan-fire-btn" class="btn btn-secondary">📷 Scan for Fire</button>
                        </div>
                        
                        <div class="fire-detection-status">
                            <p>🔍 Fire: ${this.fireDetection.fireDetected ? '⚠️ DETECTED' : 'Not detected'}</p>
                            <p>💨 Smoke: ${this.fireDetection.smokeDetected ? '⚠️ DETECTED' : 'Not detected'}</p>
                        </div>
                        
                        <div class="fire-info">
                            <h4>Quick Commands:</h4>
                            <ul>
                                <li>"Help me escape" - Evacuation guide</li>
                                <li>"I'm trapped" - If you can't escape</li>
                                <li>"I'm outside" - When evacuated</li>
                                <li>"Call 911" - Emergency services</li>
                            </ul>
                        </div>
                    </div>
                `;

                // Button handlers
                document.getElementById('call-fire-btn')?.addEventListener('click', () => {
                    this.callFireDepartment();
                });
                document.getElementById('escape-guide-btn')?.addEventListener('click', () => {
                    this.provideEscapeGuidance();
                });
                document.getElementById('scan-fire-btn')?.addEventListener('click', () => {
                    this.startFireDetection();
                });
            }
        } else {
            if (modeDisplay) modeDisplay.textContent = 'No Mode Active';
            if (modeInfo) modeInfo.innerHTML = '';
            if (modeContent) modeContent.innerHTML = '';
        }
    }
}

// Create global instance
const fireMode = new FireMode();
