/**
 * BlindNav+ Enhanced Emergency Mode
 * Comprehensive emergency handling with auto-alerts, distress detection,
 * response loops, and priority-based emergency management
 */

class EmergencyMode {
    constructor() {
        this.isActive = false;
        this.emergencyActivated = false;
        this.emergencyType = null; // 'manual', 'auto_detected', 'distress', 'fall'
        this.emergencyLevel = 'standby'; // standby, warning, active, critical
        
        // Location tracking
        this.currentLocation = null;
        this.locationWatchId = null;
        this.locationHistory = [];
        
        // Audio context for alerts
        this.audioContext = null;
        this.alertActive = false;
        
        // Emergency contacts
        this.emergencyContacts = [];
        this.loadContacts();
        
        // Settings - NO helpline calls, only contact alerts
        this.settings = {
            autoCall: false, // DISABLED - no 911/112 calls
            sendLocation: true,
            loudAlert: true,
            autoDetectDistress: true,
            fallDetection: true,
            repeatAlerts: true,
            alertInterval: 30000, // 30 seconds between repeated alerts
            emergencyCountdown: 10000, // 10 second countdown before auto-action
            sendSMS: true,
            sendWhatsApp: true,
            continuousLocationShare: true
        };
        
        // Live location sharing state
        this.liveLocationSharing = {
            active: false,
            interval: null,
            updateFrequency: 10000, // Update every 10 seconds
            shareLink: null
        };
        
        // Response loop state
        this.responseLoop = {
            active: false,
            interval: null,
            checkCount: 0,
            maxChecks: 10,
            waitingForResponse: false
        };
        
        // Auto-alert state
        this.autoAlert = {
            enabled: true,
            countdownActive: false,
            countdownTimer: null,
            countdownRemaining: 0
        };
        
        // Distress detection integration
        this.distressListenerSetup = false;
        
        // Emergency session tracking
        this.session = {
            startTime: null,
            events: [],
            locationUpdates: 0,
            alertsSent: 0
        };

        // Emergency numbers by country (default USA)
        this.emergencyNumbers = {
            police: '911',
            medical: '911',
            fire: '911',
            international: '112'
        };
    }

    /**
     * Start emergency mode
     */
    async start() {
        if (this.isActive) {
            speechManager.speak('Emergency mode is already active.', true);
            return;
        }

        this.isActive = true;
        this.session.startTime = Date.now();
        this.session.events = [];
        
        console.log('[Emergency] Mode started');
        this.logEvent('mode_started');

        // Get current location immediately
        this.getCurrentLocation();
        
        // Start continuous location tracking
        this.startLocationTracking();

        // Setup distress detection listeners
        this.setupDistressDetection();

        // Run system diagnostics check
        await this.runEmergencySystemCheck();

        const welcome = `Emergency Mode activated. I am here to help you stay safe.
            
            If you need immediate help, say "help me" or "emergency" to trigger an alert.
            
            Available commands:
            Say "help me" or "emergency" to send SOS alert to your emergency contacts.
            Say "my location" to hear your GPS coordinates.
            Say "add contact" followed by name and number to add an emergency contact.
            Say "list contacts" to hear your emergency contacts.
            Say "share location" to send your live location to contacts.
            Say "cancel" if you triggered by mistake.
            Say "stop" or "exit" to end emergency mode.
            
            When triggered, I will send your live location and SOS message to all your emergency contacts.
            
            Your safety is my priority.`;

        speechManager.speak(welcome, true, 2);
        
        this.updateUI(true);
        
        // Haptic feedback
        if (Utils && Utils.hapticFeedback) {
            Utils.hapticFeedback('warning');
        }
    }

    /**
     * Stop emergency mode
     */
    stop() {
        if (!this.isActive) return;

        // Don't allow stopping during active emergency without confirmation
        if (this.emergencyActivated) {
            speechManager.speak(
                'Warning: An emergency is currently active. ' +
                'Say "cancel emergency" first, or "force stop" to exit anyway.',
                true
            );
            return;
        }

        this.isActive = false;
        this.stopResponseLoop();
        this.stopAlert();
        this.stopLocationTracking();
        this.cancelAutoAlertCountdown();
        
        // Clean up distress detection
        this.removeDistressDetectionListeners();

        const duration = Math.round((Date.now() - this.session.startTime) / 1000 / 60);
        
        speechManager.speak(
            `Emergency mode ended. Session lasted ${duration > 0 ? duration + ' minutes' : 'less than a minute'}. ` +
            `If you need help again, say "emergency" anytime. Stay safe.`,
            true
        );

        this.updateUI(false);
        this.logEvent('mode_stopped');
        
        console.log('[Emergency] Mode stopped');
    }

    /**
     * Force stop (bypasses active emergency check)
     */
    forceStop() {
        this.emergencyActivated = false;
        this.isActive = false;
        this.stopResponseLoop();
        this.stopAlert();
        this.stopLocationTracking();
        this.cancelAutoAlertCountdown();
        this.removeDistressDetectionListeners();
        
        speechManager.speak('Emergency mode force stopped.', true);
        this.updateUI(false);
        
        console.log('[Emergency] Mode force stopped');
    }

    /**
     * Setup distress detection integration
     */
    setupDistressDetection() {
        if (this.distressListenerSetup) return;
        if (typeof distressDetection === 'undefined') {
            console.warn('[Emergency] Distress detection service not available');
            return;
        }

        // Listen for scream detection
        this.onScream = (data) => {
            if (!this.isActive || !this.settings.autoDetectDistress) return;
            console.log('[Emergency] Scream detected:', data);
            this.handleAutoDistressDetection('scream', data);
        };
        distressDetection.on('scream', this.onScream);

        // Listen for loud sounds (potential fall)
        this.onLoudSound = (data) => {
            if (!this.isActive || !this.settings.fallDetection) return;
            console.log('[Emergency] Loud sound detected:', data);
            this.handleAutoDistressDetection('fall_possible', data);
        };
        distressDetection.on('loud_sound', this.onLoudSound);

        // Listen for distress keywords
        this.onKeyword = (data) => {
            if (!this.isActive || !this.settings.autoDetectDistress) return;
            console.log('[Emergency] Distress keyword:', data);
            this.handleAutoDistressDetection('keyword', data);
        };
        distressDetection.on('keyword_detected', this.onKeyword);

        // Listen for safety check responses
        this.onSafetyCheck = (data) => {
            if (!this.isActive) return;
            this.initiateResponseLoop('loud_sound');
        };
        distressDetection.on('safety_check', this.onSafetyCheck);

        // Start listening
        if (this.settings.autoDetectDistress) {
            distressDetection.startListening();
            distressDetection.startKeywordListening();
        }

        this.distressListenerSetup = true;
        console.log('[Emergency] Distress detection setup complete');
    }

    /**
     * Remove distress detection listeners
     */
    removeDistressDetectionListeners() {
        if (typeof distressDetection === 'undefined') return;
        
        if (this.onScream) distressDetection.off('scream', this.onScream);
        if (this.onLoudSound) distressDetection.off('loud_sound', this.onLoudSound);
        if (this.onKeyword) distressDetection.off('keyword_detected', this.onKeyword);
        if (this.onSafetyCheck) distressDetection.off('safety_check', this.onSafetyCheck);
        
        this.distressListenerSetup = false;
    }

    /**
     * Handle auto-detected distress
     */
    handleAutoDistressDetection(type, data) {
        this.logEvent('distress_detected', { type, data });

        switch (type) {
            case 'scream':
                // High priority - likely real emergency
                speechManager.speak(
                    'I detected what sounded like a scream! Are you okay? ' +
                    'Say "I\'m okay" if you\'re safe, or say "help" for emergency assistance. ' +
                    'If I don\'t hear from you in 10 seconds, I will start emergency procedures.',
                    true, 2
                );
                this.startAutoAlertCountdown('scream_detected');
                break;

            case 'fall_possible':
                // Medium priority - verify first
                speechManager.speak(
                    'I detected a loud sound. Did you fall? Are you okay? ' +
                    'Say "I\'m okay" if you\'re fine, or "help" if you need assistance.',
                    true
                );
                this.initiateResponseLoop('fall_check');
                break;

            case 'keyword':
                if (data.category === 'critical') {
                    // Critical keyword detected - high priority
                    speechManager.speak(
                        `I heard you say "${data.keyword}". Do you need emergency help? ` +
                        'Say "yes" to call for help, or "no" if it was a mistake.',
                        true, 2
                    );
                    this.startAutoAlertCountdown('critical_keyword');
                }
                break;
        }
    }

    /**
     * Start auto-alert countdown
     */
    startAutoAlertCountdown(reason) {
        if (this.autoAlert.countdownActive) return;

        this.autoAlert.countdownActive = true;
        this.autoAlert.countdownRemaining = this.settings.emergencyCountdown / 1000;
        
        this.logEvent('auto_alert_countdown_started', { reason });

        // Countdown timer
        this.autoAlert.countdownTimer = setInterval(() => {
            this.autoAlert.countdownRemaining--;

            if (this.autoAlert.countdownRemaining === 5) {
                speechManager.speak('5 seconds to emergency alert.', true);
            } else if (this.autoAlert.countdownRemaining === 3) {
                speechManager.speak('3', false);
            } else if (this.autoAlert.countdownRemaining === 2) {
                speechManager.speak('2', false);
            } else if (this.autoAlert.countdownRemaining === 1) {
                speechManager.speak('1', false);
            } else if (this.autoAlert.countdownRemaining <= 0) {
                this.cancelAutoAlertCountdown();
                this.triggerEmergency('auto_countdown_complete');
            }
        }, 1000);
    }

    /**
     * Cancel auto-alert countdown
     */
    cancelAutoAlertCountdown() {
        if (this.autoAlert.countdownTimer) {
            clearInterval(this.autoAlert.countdownTimer);
            this.autoAlert.countdownTimer = null;
        }
        this.autoAlert.countdownActive = false;
        this.autoAlert.countdownRemaining = 0;
    }

    /**
     * Trigger emergency alert
     */
    async triggerEmergency(type = 'manual') {
        if (this.emergencyActivated) {
            speechManager.speak('Emergency already active. Help is being summoned.', true);
            return;
        }

        this.emergencyActivated = true;
        this.emergencyType = type;
        this.emergencyLevel = 'active';
        
        this.logEvent('emergency_triggered', { type });
        console.log('[Emergency] EMERGENCY TRIGGERED:', type);

        // Cancel any countdown
        this.cancelAutoAlertCountdown();

        // Get fresh location
        await this.getCurrentLocation();

        // Play loud alert sound
        if (this.settings.loudAlert) {
            this.playAlertSound();
        }

        // Urgent announcement
        const urgentMessage = this.emergencyContacts.length > 0
            ? `EMERGENCY ALERT ACTIVATED! ` +
              `Sending SOS alert with your live location to ${this.emergencyContacts.length} emergency contact${this.emergencyContacts.length > 1 ? 's' : ''}. ` +
              `Your location is being shared continuously. ` +
              `If this is a mistake, say "cancel" or "I'm okay" immediately.`
            : `EMERGENCY ALERT ACTIVATED! ` +
              `WARNING: You have no emergency contacts set up! ` +
              `Please add contacts by saying "add contact" followed by name and phone number. ` +
              `Say "cancel" to stop this alert.`;

        speechManager.speak(urgentMessage, true, 3);

        // Haptic feedback
        if (Utils && Utils.hapticFeedback) {
            Utils.hapticFeedback('error');
        }

        // Send alerts to all contacts
        await this.sendSOSToAllContacts();
        
        // Start live location sharing
        this.startLiveLocationSharing();

        // Show emergency info
        this.showEmergencyInfo();

        // Start response loop
        this.startResponseLoop();
    }

    /**
     * Start response loop - periodically check on user
     */
    startResponseLoop() {
        if (this.responseLoop.active) return;

        this.responseLoop.active = true;
        this.responseLoop.checkCount = 0;
        
        this.logEvent('response_loop_started');

        this.responseLoop.interval = setInterval(() => {
            if (!this.emergencyActivated || !this.responseLoop.active) {
                this.stopResponseLoop();
                return;
            }

            this.responseLoop.checkCount++;
            this.session.alertsSent++;

            if (this.responseLoop.checkCount >= this.responseLoop.maxChecks) {
                // Max checks reached - escalate
                speechManager.speak(
                    'You have not responded. Escalating emergency. ' +
                    'Emergency services will be contacted.',
                    true, 2
                );
                this.escalateEmergency();
                this.stopResponseLoop();
                return;
            }

            // Periodic check-in
            const checkMessage = this.responseLoop.checkCount <= 3
                ? 'Are you okay? Say "I\'m okay" to cancel the emergency, or "help" for more assistance.'
                : 'Emergency still active. Say "cancel" if you\'re safe. Help is standing by.';

            speechManager.speak(checkMessage, true);

            // Re-play alert sound
            if (this.settings.repeatAlerts && this.settings.loudAlert) {
                this.playAlertSound();
            }

        }, this.settings.alertInterval);
    }

    /**
     * Stop response loop
     */
    stopResponseLoop() {
        if (this.responseLoop.interval) {
            clearInterval(this.responseLoop.interval);
            this.responseLoop.interval = null;
        }
        this.responseLoop.active = false;
        this.responseLoop.checkCount = 0;
        this.logEvent('response_loop_stopped');
    }

    /**
     * Initiate response loop for verification
     */
    initiateResponseLoop(reason) {
        this.responseLoop.waitingForResponse = true;
        this.logEvent('response_loop_initiated', { reason });

        // Wait for response, then act
        setTimeout(() => {
            if (this.responseLoop.waitingForResponse && this.isActive) {
                speechManager.speak(
                    'I didn\'t hear a response. If you need help, say "help" or "emergency". ' +
                    'Otherwise, say "I\'m okay" to let me know you\'re safe.',
                    true
                );
            }
        }, 15000);
    }

    /**
     * Escalate emergency
     */
    escalateEmergency() {
        this.emergencyLevel = 'critical';
        this.logEvent('emergency_escalated');

        speechManager.speak(
            'EMERGENCY ESCALATED. Re-sending SOS to all contacts with updated location.',
            true, 3
        );

        // Re-send SOS to all contacts
        this.sendSOSToAllContacts();
    }

    /**
     * Cancel emergency
     */
    cancelEmergency() {
        if (!this.emergencyActivated) {
            speechManager.speak('No active emergency to cancel.');
            return;
        }

        this.emergencyActivated = false;
        this.emergencyLevel = 'standby';
        this.emergencyType = null;
        
        this.stopAlert();
        this.stopResponseLoop();
        this.cancelAutoAlertCountdown();
        this.stopLiveLocationSharing();
        
        this.logEvent('emergency_cancelled');

        speechManager.speak(
            'Emergency cancelled. I\'m glad you\'re okay. ' +
            'The SOS alert has been deactivated and live location sharing stopped. ' +
            'If you need help again, say "help" or "emergency".',
            true
        );

        this.updateUI(true);
    }

    /**
     * User confirmed they are okay
     */
    userConfirmedOkay() {
        this.responseLoop.waitingForResponse = false;
        
        // Cancel countdown if running
        if (this.autoAlert.countdownActive) {
            this.cancelAutoAlertCountdown();
            speechManager.speak('Okay, I\'m glad you\'re safe. Alert cancelled.', true);
            this.logEvent('alert_cancelled_user_okay');
            return;
        }

        // Cancel emergency if active
        if (this.emergencyActivated) {
            this.cancelEmergency();
        } else {
            speechManager.speak('I\'m glad you\'re okay. Let me know if you need anything.', true);
        }
    }

    /**
     * Get current location
     */
    async getCurrentLocation() {
        return new Promise((resolve) => {
            if (!navigator.geolocation) {
                speechManager.speak('Location services not available.', false);
                resolve(null);
                return;
            }

            navigator.geolocation.getCurrentPosition(
                (position) => {
                    this.currentLocation = {
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude,
                        accuracy: position.coords.accuracy,
                        timestamp: Date.now()
                    };
                    
                    this.locationHistory.push(this.currentLocation);
                    this.session.locationUpdates++;
                    
                    console.log('[Emergency] Location updated:', this.currentLocation);
                    resolve(this.currentLocation);
                },
                (error) => {
                    console.error('[Emergency] Location error:', error);
                    speechManager.speak('Could not get your location. Please share your location manually.', false);
                    resolve(null);
                },
                {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 0
                }
            );
        });
    }

    /**
     * Start continuous location tracking
     */
    startLocationTracking() {
        if (!navigator.geolocation || this.locationWatchId) return;

        this.locationWatchId = navigator.geolocation.watchPosition(
            (position) => {
                this.currentLocation = {
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                    accuracy: position.coords.accuracy,
                    timestamp: Date.now()
                };
                this.locationHistory.push(this.currentLocation);
                this.session.locationUpdates++;
            },
            (error) => {
                console.error('[Emergency] Location watch error:', error);
            },
            {
                enableHighAccuracy: true,
                timeout: 30000,
                maximumAge: 10000
            }
        );
    }

    /**
     * Stop location tracking
     */
    stopLocationTracking() {
        if (this.locationWatchId) {
            navigator.geolocation.clearWatch(this.locationWatchId);
            this.locationWatchId = null;
        }
    }

    /**
     * Call emergency services
     */
    callEmergencyServices(service = 'police') {
        const number = this.emergencyNumbers[service] || this.emergencyNumbers.police;
        
        this.logEvent('emergency_call_initiated', { service, number });
        
        speechManager.speak(
            `Initiating call to ${number}. ` +
            `When connected, clearly state your emergency and location. ` +
            `Your location is: ${this.getLocationString()}`,
            true, 2
        );

        // Open phone dialer
        setTimeout(() => {
            window.location.href = `tel:${number}`;
        }, 3000);
    }

    /**
     * Get location as string
     */
    getLocationString() {
        if (!this.currentLocation) {
            return 'Location unavailable';
        }
        return `Latitude ${this.currentLocation.latitude.toFixed(6)}, ` +
               `Longitude ${this.currentLocation.longitude.toFixed(6)}`;
    }

    /**
     * Play alert sound
     */
    playAlertSound() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.alertActive = true;
            
            const playTone = (frequency, duration, startTime) => {
                const oscillator = this.audioContext.createOscillator();
                const gainNode = this.audioContext.createGain();
                
                oscillator.connect(gainNode);
                gainNode.connect(this.audioContext.destination);
                
                oscillator.frequency.value = frequency;
                oscillator.type = 'sine';
                
                gainNode.gain.setValueAtTime(0.6, startTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
                
                oscillator.start(startTime);
                oscillator.stop(startTime + duration);
            };

            // Emergency alert pattern: alternating high-low tones
            const now = this.audioContext.currentTime;
            for (let i = 0; i < 6; i++) {
                playTone(i % 2 === 0 ? 880 : 660, 0.4, now + i * 0.5);
            }

        } catch (error) {
            console.error('[Emergency] Audio error:', error);
        }
    }

    /**
     * Stop alert sound
     */
    stopAlert() {
        this.alertActive = false;
        if (this.audioContext) {
            try {
                this.audioContext.close();
            } catch (e) {
                // Ignore
            }
            this.audioContext = null;
        }
    }

    /**
     * Show emergency information in UI
     */
    showEmergencyInfo() {
        const resultEl = document.getElementById('emergency-result');
        if (!resultEl) return;

        const locationText = this.currentLocation
            ? `Lat: ${this.currentLocation.latitude.toFixed(6)}, Long: ${this.currentLocation.longitude.toFixed(6)}`
            : 'Location unavailable';
        
        const mapLink = this.currentLocation
            ? `https://maps.google.com/?q=${this.currentLocation.latitude},${this.currentLocation.longitude}`
            : '';

        const contactsHtml = this.emergencyContacts.length > 0
            ? this.emergencyContacts.map(c => 
                `<div class="contact-alert-status">
                    <span>✅ ${c.name}</span>
                    <span class="contact-phone">${c.phone}</span>
                </div>`
            ).join('')
            : '<p class="warning">⚠️ No emergency contacts! Add contacts to receive alerts.</p>';

        resultEl.innerHTML = `
            <div class="emergency-alert-active critical">
                <h3>🚨 SOS ALERT ACTIVE 🚨</h3>
                <p class="emergency-type">Type: ${this.emergencyType || 'Manual'}</p>
                
                <div class="location-info">
                    <h4>📍 Your Live Location:</h4>
                    <p class="location-coords">${locationText}</p>
                    ${mapLink ? `<a href="${mapLink}" target="_blank" class="btn btn-primary btn-sm">Open in Maps</a>` : ''}
                    <p class="location-sharing-status">
                        ${this.liveLocationSharing.active ? '🔴 Live location sharing active' : ''}
                    </p>
                </div>
                
                <div class="contacts-alerted">
                    <h4>📱 Contacts Alerted:</h4>
                    ${contactsHtml}
                </div>
                
                <div class="emergency-actions">
                    <button id="resend-sos-btn" class="btn btn-danger">
                        🔄 Resend SOS to Contacts
                    </button>
                    <button id="share-location-btn" class="btn btn-primary">
                        📍 Share Location Again
                    </button>
                    <button id="cancel-emergency-btn" class="btn btn-warning">
                        ❌ Cancel Emergency (I'm Okay)
                    </button>
                </div>
                
                <p class="emergency-status-text">
                    Response check ${this.responseLoop.checkCount + 1}/${this.responseLoop.maxChecks} • 
                    Say "I'm okay" to cancel
                </p>
            </div>
        `;

        // Attach button handlers
        document.getElementById('cancel-emergency-btn')?.addEventListener('click', () => {
            this.cancelEmergency();
        });
        
        document.getElementById('resend-sos-btn')?.addEventListener('click', () => {
            this.sendSOSToAllContacts();
        });
        
        document.getElementById('share-location-btn')?.addEventListener('click', () => {
            this.shareLocationToContacts();
        });
    }

    /**
     * Notify emergency contacts
     */
    notifyContacts() {
        if (this.emergencyContacts.length === 0) {
            console.log('[Emergency] No contacts to notify');
            return;
        }

        this.logEvent('contacts_notified', { count: this.emergencyContacts.length });

        // In a real app, this would send SMS/notifications
        speechManager.speak(
            `Notifying ${this.emergencyContacts.length} emergency contact${this.emergencyContacts.length > 1 ? 's' : ''}.`,
            false
        );

        // Create shareable emergency message
        const message = this.createEmergencyMessage();
        console.log('[Emergency] Emergency message:', message);

        // Could integrate with SMS API, email, or push notifications
    }
    
    /**
     * Send SOS alert to all emergency contacts
     */
    async sendSOSToAllContacts() {
        if (this.emergencyContacts.length === 0) {
            speechManager.speak(
                'No emergency contacts found! Please add contacts first. ' +
                'Say "add contact" followed by the name and phone number.',
                true
            );
            return;
        }
        
        this.logEvent('sos_sent_to_contacts', { count: this.emergencyContacts.length });
        
        const message = this.createEmergencyMessage();
        const locationLink = this.getGoogleMapsLink();
        
        let sentCount = 0;
        
        for (const contact of this.emergencyContacts) {
            try {
                // Try SMS first
                if (this.settings.sendSMS && contact.phone) {
                    this.sendSMS(contact.phone, message);
                    sentCount++;
                }
                
                // Also try WhatsApp
                if (this.settings.sendWhatsApp && contact.phone) {
                    this.sendWhatsApp(contact.phone, message);
                }
            } catch (error) {
                console.error(`[Emergency] Failed to send to ${contact.name}:`, error);
            }
        }
        
        speechManager.speak(
            `SOS alert sent to ${sentCount} contact${sentCount > 1 ? 's' : ''}. ` +
            `They can see your live location. Help is on the way!`,
            true
        );
    }
    
    /**
     * Send SMS to a phone number
     */
    sendSMS(phoneNumber, message) {
        // Clean phone number
        const cleanNumber = phoneNumber.replace(/[^0-9+]/g, '');
        
        // URL encode the message
        const encodedMessage = encodeURIComponent(message);
        
        // Open SMS app with pre-filled message
        const smsUrl = `sms:${cleanNumber}?body=${encodedMessage}`;
        
        console.log('[Emergency] Opening SMS:', smsUrl);
        
        // Create a temporary link and click it
        const link = document.createElement('a');
        link.href = smsUrl;
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        this.logEvent('sms_sent', { to: cleanNumber });
    }
    
    /**
     * Send WhatsApp message
     */
    sendWhatsApp(phoneNumber, message) {
        // Clean phone number (remove spaces, dashes)
        let cleanNumber = phoneNumber.replace(/[^0-9+]/g, '');
        
        // Remove leading + if present for WhatsApp API
        if (cleanNumber.startsWith('+')) {
            cleanNumber = cleanNumber.substring(1);
        }
        
        // URL encode the message
        const encodedMessage = encodeURIComponent(message);
        
        // WhatsApp URL
        const waUrl = `https://wa.me/${cleanNumber}?text=${encodedMessage}`;
        
        console.log('[Emergency] Opening WhatsApp:', waUrl);
        
        // Open WhatsApp
        window.open(waUrl, '_blank');
        
        this.logEvent('whatsapp_sent', { to: cleanNumber });
    }
    
    /**
     * Start live location sharing
     */
    startLiveLocationSharing() {
        if (this.liveLocationSharing.active) return;
        
        this.liveLocationSharing.active = true;
        this.logEvent('live_location_sharing_started');
        
        // Update location periodically and notify contacts
        this.liveLocationSharing.interval = setInterval(async () => {
            if (!this.emergencyActivated || !this.liveLocationSharing.active) {
                this.stopLiveLocationSharing();
                return;
            }
            
            // Get fresh location
            await this.getCurrentLocation();
            
            // Log location update
            if (this.currentLocation) {
                console.log('[Emergency] Live location update:', this.currentLocation);
            }
            
        }, this.liveLocationSharing.updateFrequency);
        
        console.log('[Emergency] Live location sharing started');
    }
    
    /**
     * Stop live location sharing
     */
    stopLiveLocationSharing() {
        if (this.liveLocationSharing.interval) {
            clearInterval(this.liveLocationSharing.interval);
            this.liveLocationSharing.interval = null;
        }
        this.liveLocationSharing.active = false;
        this.logEvent('live_location_sharing_stopped');
        console.log('[Emergency] Live location sharing stopped');
    }
    
    /**
     * Get Google Maps link for current location
     */
    getGoogleMapsLink() {
        if (!this.currentLocation) {
            return 'Location unavailable';
        }
        return `https://maps.google.com/?q=${this.currentLocation.latitude},${this.currentLocation.longitude}`;
    }
    
    /**
     * Share live location manually
     */
    async shareLocationToContacts() {
        await this.getCurrentLocation();
        
        if (!this.currentLocation) {
            speechManager.speak('Could not get your location. Please try again.', true);
            return;
        }
        
        const message = `📍 Live Location from BlindNav+\n\n` +
            `Time: ${new Date().toLocaleString()}\n` +
            `Location: ${this.getGoogleMapsLink()}\n\n` +
            `Coordinates: ${this.getLocationString()}`;
        
        if (this.emergencyContacts.length === 0) {
            // If no contacts, open share dialog
            if (navigator.share) {
                try {
                    await navigator.share({
                        title: 'My Location - BlindNav+',
                        text: message,
                        url: this.getGoogleMapsLink()
                    });
                    speechManager.speak('Location shared successfully.', true);
                } catch (e) {
                    console.log('[Emergency] Share cancelled or failed:', e);
                }
            } else {
                speechManager.speak(
                    `Your location is: ${this.getLocationString()}. ` +
                    `Add emergency contacts to share your location directly.`,
                    true
                );
            }
        } else {
            // Send to all contacts
            for (const contact of this.emergencyContacts) {
                if (contact.phone) {
                    this.sendSMS(contact.phone, message);
                }
            }
            speechManager.speak(
                `Your live location has been sent to ${this.emergencyContacts.length} contact${this.emergencyContacts.length > 1 ? 's' : ''}.`,
                true
            );
        }
    }

    /**
     * Create emergency message
     */
    createEmergencyMessage() {
        const location = this.currentLocation
            ? `https://maps.google.com/?q=${this.currentLocation.latitude},${this.currentLocation.longitude}`
            : 'Location unavailable';

        return `🚨 EMERGENCY ALERT from BlindNav+ 🚨\n\n` +
               `User may need help!\n` +
               `Time: ${new Date().toLocaleString()}\n` +
               `Location: ${location}\n\n` +
               `Please check on them or call emergency services.`;
    }

    /**
     * Run emergency system check
     */
    async runEmergencySystemCheck() {
        if (typeof systemDiagnostics === 'undefined') return;

        const ready = systemDiagnostics.isEmergencyReady();
        
        if (!ready.overall || ready.issues.length > 0) {
            const issuesList = ready.issues.join('. ');
            speechManager.speak(
                `System check: ${issuesList}. ` +
                `Emergency mode may have limited functionality.`,
                false
            );
        }
    }

    /**
     * Announce system status
     */
    announceSystemStatus() {
        if (typeof systemDiagnostics !== 'undefined') {
            speechManager.speak(systemDiagnostics.getStatusSummary(), true);
        } else {
            speechManager.speak('System diagnostics not available.', true);
        }
    }

    /**
     * Add emergency contact
     */
    addContact(contact) {
        this.emergencyContacts.push(contact);
        this.saveContacts();
        speechManager.speak(`Added ${contact.name} as emergency contact.`, true);
        this.logEvent('contact_added', { name: contact.name });
    }

    /**
     * Load contacts from storage
     */
    loadContacts() {
        try {
            const saved = localStorage.getItem('blindnav_emergency_contacts');
            if (saved) {
                this.emergencyContacts = JSON.parse(saved);
            }
        } catch (e) {
            console.error('[Emergency] Could not load contacts:', e);
        }
    }

    /**
     * Save contacts to storage
     */
    saveContacts() {
        try {
            localStorage.setItem('blindnav_emergency_contacts', 
                JSON.stringify(this.emergencyContacts)
            );
        } catch (e) {
            console.error('[Emergency] Could not save contacts:', e);
        }
    }

    /**
     * Log event for session tracking
     */
    logEvent(type, data = {}) {
        this.session.events.push({
            type,
            data,
            timestamp: Date.now()
        });
    }

    /**
     * Update UI
     */
    updateUI(active) {
        const modeContent = document.getElementById('mode-content');
        if (!modeContent) return;

        if (active) {
            modeContent.innerHTML = `
                <div class="emergency-display">
                    <div class="emergency-status ${this.emergencyActivated ? 'activated' : 'standby'}">
                        <span class="emergency-icon">🚨</span>
                        <span class="emergency-text">
                            ${this.emergencyActivated ? 'SOS ALERT ACTIVE' : 'Emergency Mode Ready'}
                        </span>
                        <span class="emergency-level">${this.emergencyLevel.toUpperCase()}</span>
                    </div>
                    
                    <div class="emergency-actions">
                        <button id="trigger-emergency-btn" class="btn btn-danger emergency-btn">
                            🆘 SEND SOS TO CONTACTS
                        </button>
                        <button id="share-location-btn" class="btn btn-primary">
                            📍 Share My Location
                        </button>
                    </div>
                    
                    <div class="emergency-result" id="emergency-result">
                        <p><strong>Voice Commands:</strong></p>
                        <p>• "Help me" / "Emergency" - Send SOS to contacts</p>
                        <p>• "Share location" - Share your live location</p>
                        <p>• "My location" - Hear your GPS coordinates</p>
                        <p>• "Add contact [name] [number]" - Add emergency contact</p>
                        <p>• "List contacts" - Hear your emergency contacts</p>
                    </div>
                    
                    <div class="emergency-features">
                        <h4>🛡️ Active Protection:</h4>
                        <p>✓ Live location sharing to contacts</p>
                        <p>✓ SMS/WhatsApp SOS alerts</p>
                        <p>✓ Distress voice detection</p>
                        <p>✓ Continuous location tracking</p>
                    </div>
                    
                    <div class="contacts-list">
                        <h4>📋 Emergency Contacts (${this.emergencyContacts.length})</h4>
                        ${this.emergencyContacts.length > 0 
                            ? this.emergencyContacts.map((c, i) => `
                                <div class="contact-item">
                                    <span>• ${c.name}: ${c.phone}</span>
                                    <button class="btn-remove-contact" data-index="${i}">🗑️</button>
                                </div>
                            `).join('') 
                            : '<p class="warning">⚠️ No contacts added. Say "add contact" followed by name and phone number.</p>'
                        }
                        <button id="add-contact-btn" class="btn btn-secondary btn-sm">
                            ➕ Add Contact
                        </button>
                    </div>
                </div>
            `;

            // Attach button handlers
            document.getElementById('trigger-emergency-btn')?.addEventListener('click', () => {
                this.triggerEmergency('manual');
            });
            
            document.getElementById('share-location-btn')?.addEventListener('click', () => {
                this.shareLocationToContacts();
            });
            
            document.getElementById('add-contact-btn')?.addEventListener('click', () => {
                this.promptAddContact();
            });
            
            // Remove contact buttons
            document.querySelectorAll('.btn-remove-contact').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const index = parseInt(e.target.dataset.index);
                    this.removeContact(index);
                });
            });
        } else {
            modeContent.innerHTML = '';
        }
    }
    
    /**
     * Prompt to add a new contact
     */
    promptAddContact() {
        speechManager.speak(
            'To add a contact, say "add contact" followed by the name and phone number. ' +
            'For example: "add contact Mom 9876543210".',
            true
        );
    }
    
    /**
     * Remove a contact by index
     */
    removeContact(index) {
        if (index >= 0 && index < this.emergencyContacts.length) {
            const removed = this.emergencyContacts.splice(index, 1)[0];
            this.saveContacts();
            speechManager.speak(`Removed ${removed.name} from emergency contacts.`, true);
            this.updateUI(true);
            this.logEvent('contact_removed', { name: removed.name });
        }
    }
    
    /**
     * List all contacts
     */
    listContacts() {
        if (this.emergencyContacts.length === 0) {
            speechManager.speak(
                'You have no emergency contacts. Add contacts by saying "add contact" followed by name and phone number.',
                true
            );
        } else {
            const contactList = this.emergencyContacts
                .map((c, i) => `${i + 1}. ${c.name}, ${c.phone}`)
                .join('. ');
            speechManager.speak(
                `You have ${this.emergencyContacts.length} emergency contact${this.emergencyContacts.length > 1 ? 's' : ''}. ${contactList}`,
                true
            );
        }
    }

    /**
     * Handle voice command
     */
    handleCommand(command) {
        const cmd = command.toLowerCase();

        // User says they're okay
        if (cmd.includes('i\'m okay') || cmd.includes('i am okay') || 
            cmd.includes('im okay') || cmd.includes('i\'m fine') || 
            cmd.includes('i am fine') || cmd.includes('i\'m safe')) {
            this.userConfirmedOkay();
            return true;
        }

        // Emergency triggers
        if (cmd.includes('help me') || cmd.includes('help') && cmd.includes('emergency') ||
            cmd === 'help' || cmd.includes('sos') || cmd.includes('danger')) {
            this.triggerEmergency('voice_command');
            return true;
        }

        // Cancel commands
        if ((cmd.includes('cancel') || cmd.includes('false alarm')) && 
            (this.emergencyActivated || this.autoAlert.countdownActive)) {
            if (this.autoAlert.countdownActive) {
                this.cancelAutoAlertCountdown();
                speechManager.speak('Alert cancelled. I\'m glad you\'re okay.', true);
            } else {
                this.cancelEmergency();
            }
            return true;
        }

        // Share location
        if (cmd.includes('share location') || cmd.includes('send location') ||
            cmd.includes('share my location') || cmd.includes('send my location')) {
            this.shareLocationToContacts();
            return true;
        }

        // Resend SOS
        if (cmd.includes('resend') || cmd.includes('send again') || 
            cmd.includes('send sos again')) {
            this.sendSOSToAllContacts();
            return true;
        }

        // List contacts
        if (cmd.includes('list contacts') || cmd.includes('my contacts') ||
            cmd.includes('show contacts') || cmd.includes('who are my contacts')) {
            this.listContacts();
            return true;
        }

        // Location query
        if (cmd.includes('my location') || cmd.includes('where am i') || 
            (cmd.includes('location') && !cmd.includes('share'))) {
            if (this.currentLocation) {
                speechManager.speak(
                    `Your location is: ${this.getLocationString()}`,
                    true
                );
            } else {
                this.getCurrentLocation().then(loc => {
                    if (loc) {
                        speechManager.speak(`Your location is: ${this.getLocationString()}`, true);
                    }
                });
            }
            return true;
        }

        // System status
        if (cmd.includes('system status') || cmd.includes('check system') ||
            cmd.includes('battery') && cmd.includes('status')) {
            this.announceSystemStatus();
            return true;
        }

        // Add contact - parse name and number from command
        if (cmd.includes('add contact')) {
            // Try to parse "add contact [name] [number]"
            const match = cmd.match(/add contact\s+([a-zA-Z]+)\s+(\d{10,15})/);
            if (match) {
                const name = match[1].charAt(0).toUpperCase() + match[1].slice(1);
                const phone = match[2];
                this.addContact({ name, phone });
                this.updateUI(true);
            } else {
                speechManager.speak(
                    'To add a contact, say "add contact" followed by the name and 10-digit phone number. ' +
                    'For example: "add contact Mom 9876543210".',
                    true
                );
            }
            return true;
        }

        // Force stop
        if (cmd.includes('force stop') || cmd.includes('force exit')) {
            this.forceStop();
            return true;
        }

        // Exit commands
        if ((cmd.includes('exit') || cmd.includes('stop') || cmd.includes('quit')) && 
            !this.emergencyActivated) {
            this.stop();
            return true;
        }

        return false;
    }
}

// Export singleton instance
const emergencyMode = new EmergencyMode();
