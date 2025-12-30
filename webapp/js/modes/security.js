/**
 * BlindNav+ Enhanced Security Mode
 * Advanced surveillance and anomaly monitoring for user safety
 * Features: Motion detection, crowd analysis, danger object detection,
 * pattern recognition, and threat assessment
 */

class SecurityMode {
    constructor() {
        this.isActive = false;
        this.frameProcessingActive = false;
        this.lastAlertTime = 0;
        this.alertCooldown = 3000;
        this.sessionStartTime = null;
        
        // Security monitoring state
        this.state = {
            peopleCount: 0,
            lastPeopleCount: 0,
            suspiciousActivity: false,
            movementDetected: false,
            threatLevel: 'low', // low, moderate, elevated, high, critical
            alerts: [],
            anomalies: []
        };
        
        // Motion detection state
        this.motionDetection = {
            enabled: true,
            previousFrame: null,
            motionThreshold: 30,
            motionPixelThreshold: 5, // Percentage of pixels that must change
            lastMotionTime: null,
            consecutiveMotionFrames: 0
        };
        
        // Person tracking
        this.personTracking = {
            trackedPeople: [], // Array of {id, lastSeen, positions, suspicious}
            maxTrackingHistory: 30,
            lingerThreshold: 10000, // 10 seconds in same area = suspicious
            approachSpeedThreshold: 0.2 // Rapid approach detection
        };
        
        // Anomaly detection patterns
        this.anomalyPatterns = {
            lingering: { description: 'Person lingering in area', severity: 'moderate' },
            rapidApproach: { description: 'Person approaching rapidly', severity: 'elevated' },
            surrounding: { description: 'Multiple people surrounding', severity: 'high' },
            following: { description: 'Possible following behavior', severity: 'elevated' },
            dangerousObject: { description: 'Potentially dangerous object detected', severity: 'high' },
            crowdForming: { description: 'Crowd forming nearby', severity: 'moderate' },
            unusualMovement: { description: 'Unusual movement pattern', severity: 'moderate' }
        };
        
        // Thresholds for alerts
        this.thresholds = {
            maxPeopleNearby: 5,
            tooClosePerson: 0.5, // height ratio
            veryClosePerson: 0.7,
            rapidApproach: true,
            crowdSize: 8,
            dangerousObjects: ['knife', 'scissors', 'baseball bat', 'gun', 'weapon']
        };
        
        // Alert sounds
        this.alertSounds = {
            low: { frequency: 440, duration: 0.2, repeat: 1 },
            moderate: { frequency: 550, duration: 0.2, repeat: 2 },
            elevated: { frequency: 660, duration: 0.15, repeat: 3 },
            high: { frequency: 880, duration: 0.1, repeat: 4 },
            critical: { frequency: 1000, duration: 0.1, repeat: 5 }
        };
        
        this.audioContext = null;
        
        // Continuous monitoring interval
        this.monitoringInterval = null;
    }

    /**
     * Start security mode
     */
    async start() {
        if (this.isActive) {
            speechManager.speak('Security mode is already active.', true);
            return;
        }

        this.isActive = true;
        this.sessionStartTime = Date.now();
        this.state.alerts = [];
        this.state.anomalies = [];
        this.state.threatLevel = 'low';

        console.log('[Security] Mode started');

        const welcome = `Security Mode activated. I am now monitoring your surroundings for your safety.
            
            What I will do:
            Monitor for people approaching you.
            Alert you if someone gets too close.
            Track the number of people around you.
            Detect unusual movement patterns.
            Watch for potentially dangerous objects.
            Analyze crowd behavior.
            
            Voice commands available:
            Say "how many people" to know the count.
            Say "is anyone close" to check proximity.
            Say "threat level" for current security assessment.
            Say "describe surroundings" for a security overview.
            Say "all clear" or "status" for a status report.
            Say "scan area" to perform a detailed security scan.
            Say "stop" or "exit" to end security mode.
            
            I will keep you informed of any concerns. Stay alert.`;

        speechManager.speak(welcome, true);
        
        this.updateUI(true);

        // Start monitoring after welcome
        setTimeout(() => {
            if (this.isActive) {
                this.startSecurityMonitoring();
            }
        }, 10000);
    }

    /**
     * Stop security mode
     */
    stop() {
        if (!this.isActive) return;

        this.isActive = false;
        this.frameProcessingActive = false;
        
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
            this.monitoringInterval = null;
        }
        
        cameraManager.stopFrameProcessing();

        const duration = Math.round((Date.now() - this.sessionStartTime) / 1000);
        const minutes = Math.floor(duration / 60);
        const alertCount = this.state.alerts.length;
        const anomalyCount = this.state.anomalies.length;

        speechManager.speak(
            `Security mode ended. Monitored for ${minutes > 0 ? minutes + ' minutes' : duration + ' seconds'}. ` +
            `${alertCount} alerts and ${anomalyCount} anomalies were detected during this session. Stay safe!`,
            true
        );

        // Reset state
        this.state = {
            peopleCount: 0,
            lastPeopleCount: 0,
            suspiciousActivity: false,
            movementDetected: false,
            threatLevel: 'low',
            alerts: [],
            anomalies: []
        };
        this.personTracking.trackedPeople = [];

        this.updateUI(false);
        console.log('[Security] Mode stopped');
    }

    /**
     * Start security monitoring
     */
    startSecurityMonitoring() {
        this.frameProcessingActive = true;

        speechManager.speak('Security monitoring is now active. I\'m watching your surroundings.', false);

        cameraManager.startFrameProcessing(async (frame) => {
            if (!this.isActive || !this.frameProcessingActive) return;

            // Get object detections
            const detections = await detectionManager.detect(frame);

            // Perform motion detection
            if (this.motionDetection.enabled) {
                this.detectMotion(frame);
            }

            // Analyze detections for security threats
            this.analyzeSecurityThreats(detections);

            // Update person tracking
            this.updatePersonTracking(detections);

            // Detect anomalies
            this.detectAnomalies(detections);

            // Draw security overlay
            if (frame.ctx) {
                this.drawSecurityOverlay(frame.ctx, detections, frame.width, frame.height);
            }
        });

        // Start periodic threat assessment
        this.monitoringInterval = setInterval(() => {
            this.performThreatAssessment();
        }, 10000);
    }

    /**
     * Detect motion between frames
     */
    detectMotion(frame) {
        try {
            const canvas = document.createElement('canvas');
            canvas.width = frame.width;
            canvas.height = frame.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(cameraManager.imgElement, 0, 0);
            
            const currentImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            
            if (this.motionDetection.previousFrame) {
                const prevData = this.motionDetection.previousFrame.data;
                const currData = currentImageData.data;
                
                let changedPixels = 0;
                const totalPixels = canvas.width * canvas.height;
                
                // Compare pixels (sample every 4th pixel for performance)
                for (let i = 0; i < currData.length; i += 16) {
                    const rDiff = Math.abs(currData[i] - prevData[i]);
                    const gDiff = Math.abs(currData[i + 1] - prevData[i + 1]);
                    const bDiff = Math.abs(currData[i + 2] - prevData[i + 2]);
                    
                    const avgDiff = (rDiff + gDiff + bDiff) / 3;
                    
                    if (avgDiff > this.motionDetection.motionThreshold) {
                        changedPixels++;
                    }
                }
                
                const changePercent = (changedPixels / (totalPixels / 4)) * 100;
                
                if (changePercent > this.motionDetection.motionPixelThreshold) {
                    this.state.movementDetected = true;
                    this.motionDetection.lastMotionTime = Date.now();
                    this.motionDetection.consecutiveMotionFrames++;
                } else {
                    this.motionDetection.consecutiveMotionFrames = 0;
                    this.state.movementDetected = false;
                }
            }
            
            this.motionDetection.previousFrame = currentImageData;
        } catch (error) {
            console.error('[Security] Motion detection error:', error);
        }
    }

    /**
     * Analyze detections for security threats
     */
    analyzeSecurityThreats(detections) {
        const now = Date.now();
        
        // Count people
        const people = detections.filter(d => d.class.toLowerCase() === 'person');
        this.state.lastPeopleCount = this.state.peopleCount;
        this.state.peopleCount = people.length;
        
        // Check for security concerns
        const concerns = [];
        
        // 1. Someone very close
        const veryClosePeople = people.filter(p => p.heightRatio > this.thresholds.veryClosePerson);
        if (veryClosePeople.length > 0) {
            concerns.push({
                type: 'very_close',
                level: 'high',
                message: `ALERT! Someone is VERY close to you, on your ${veryClosePeople[0].position}!`,
                severity: 'high'
            });
        }
        
        // 2. Someone close
        const closePeople = people.filter(p => 
            p.heightRatio > this.thresholds.tooClosePerson && 
            p.heightRatio <= this.thresholds.veryClosePerson
        );
        if (closePeople.length > 0 && veryClosePeople.length === 0) {
            concerns.push({
                type: 'proximity',
                level: 'elevated',
                message: `Someone is close to you, ${closePeople[0].position}.`,
                severity: 'elevated'
            });
        }
        
        // 3. Sudden increase in people
        if (this.state.peopleCount > this.state.lastPeopleCount + 2) {
            concerns.push({
                type: 'crowd',
                level: 'moderate',
                message: `Multiple people approaching quickly. ${this.state.peopleCount} people detected.`,
                severity: 'moderate'
            });
        }
        
        // 4. Large crowd
        if (this.state.peopleCount >= this.thresholds.crowdSize) {
            concerns.push({
                type: 'large_crowd',
                level: 'moderate',
                message: `Crowded area. ${this.state.peopleCount} people around you.`,
                severity: 'moderate'
            });
        }
        
        // 5. Surrounding pattern
        const leftPeople = people.filter(p => p.position === 'left');
        const rightPeople = people.filter(p => p.position === 'right');
        const centerPeople = people.filter(p => p.position === 'center');
        
        if (leftPeople.length > 0 && rightPeople.length > 0 && centerPeople.length > 0) {
            concerns.push({
                type: 'surrounded',
                level: 'high',
                message: 'CAUTION! People on all sides - left, right, and front.',
                severity: 'high'
            });
        } else if (leftPeople.length > 0 && rightPeople.length > 0 && people.length >= 3) {
            concerns.push({
                type: 'flanked',
                level: 'elevated',
                message: 'Caution. People on both your left and right sides.',
                severity: 'elevated'
            });
        }
        
        // 6. Detect potentially dangerous objects
        const dangerousItems = detections.filter(d => 
            this.thresholds.dangerousObjects.includes(d.class.toLowerCase())
        );
        if (dangerousItems.length > 0) {
            concerns.push({
                type: 'dangerous_object',
                level: 'critical',
                message: `WARNING! ${dangerousItems[0].class} detected nearby!`,
                severity: 'critical'
            });
        }
        
        // Update threat level
        this.updateThreatLevel(concerns);
        
        // Announce concerns with cooldown
        if (concerns.length > 0 && now - this.lastAlertTime >= this.alertCooldown) {
            // Prioritize by severity
            const severityOrder = ['critical', 'high', 'elevated', 'moderate', 'low'];
            concerns.sort((a, b) => 
                severityOrder.indexOf(a.severity) - severityOrder.indexOf(b.severity)
            );
            
            const topConcern = concerns[0];
            
            this.playAlertSound(topConcern.severity);
            speechManager.speak(topConcern.message, true, 2);
            
            this.state.alerts.push({ 
                time: now, 
                ...topConcern 
            });
            this.lastAlertTime = now;
            
            // Haptic feedback
            if (['high', 'critical'].includes(topConcern.severity) && Utils && Utils.hapticFeedback) {
                Utils.hapticFeedback('error');
            }
        }
    }

    /**
     * Update person tracking
     */
    updatePersonTracking(detections) {
        const now = Date.now();
        const people = detections.filter(d => d.class.toLowerCase() === 'person');
        
        // Simple tracking based on position proximity
        people.forEach((person, index) => {
            const trackId = `person_${person.position}_${index}`;
            
            let tracked = this.personTracking.trackedPeople.find(t => 
                t.position === person.position && 
                Math.abs(t.lastHeightRatio - person.heightRatio) < 0.1
            );
            
            if (tracked) {
                // Update existing tracking
                tracked.lastSeen = now;
                tracked.positions.push({
                    position: person.position,
                    heightRatio: person.heightRatio,
                    timestamp: now
                });
                tracked.lastHeightRatio = person.heightRatio;
                
                // Trim history
                while (tracked.positions.length > this.personTracking.maxTrackingHistory) {
                    tracked.positions.shift();
                }
                
                // Check for suspicious behavior
                this.checkSuspiciousBehavior(tracked);
            } else {
                // Add new tracked person
                this.personTracking.trackedPeople.push({
                    id: trackId,
                    position: person.position,
                    lastSeen: now,
                    firstSeen: now,
                    lastHeightRatio: person.heightRatio,
                    positions: [{
                        position: person.position,
                        heightRatio: person.heightRatio,
                        timestamp: now
                    }],
                    suspicious: false
                });
            }
        });
        
        // Remove stale tracked people
        this.personTracking.trackedPeople = this.personTracking.trackedPeople.filter(
            t => (now - t.lastSeen) < 5000
        );
    }

    /**
     * Check for suspicious behavior in tracked person
     */
    checkSuspiciousBehavior(tracked) {
        const now = Date.now();
        
        // Check for lingering
        const lingerTime = now - tracked.firstSeen;
        if (lingerTime > this.personTracking.lingerThreshold && !tracked.lingerAlerted) {
            tracked.suspicious = true;
            tracked.lingerAlerted = true;
            
            this.recordAnomaly('lingering', {
                position: tracked.position,
                duration: lingerTime
            });
        }
        
        // Check for rapid approach
        if (tracked.positions.length >= 2) {
            const recent = tracked.positions.slice(-5);
            if (recent.length >= 2) {
                const oldest = recent[0];
                const newest = recent[recent.length - 1];
                
                const approachSpeed = (newest.heightRatio - oldest.heightRatio) / 
                    ((newest.timestamp - oldest.timestamp) / 1000);
                
                if (approachSpeed > this.personTracking.approachSpeedThreshold) {
                    this.recordAnomaly('rapidApproach', {
                        position: tracked.position,
                        speed: approachSpeed
                    });
                }
            }
        }
    }

    /**
     * Detect anomalies
     */
    detectAnomalies(detections) {
        // Check for unusual combinations of objects
        const objects = detections.map(d => d.class.toLowerCase());
        
        // More anomaly patterns can be added here
    }

    /**
     * Record an anomaly
     */
    recordAnomaly(type, data) {
        const anomaly = {
            type,
            pattern: this.anomalyPatterns[type],
            data,
            timestamp: Date.now()
        };
        
        this.state.anomalies.push(anomaly);
        
        // Alert if high severity
        if (this.anomalyPatterns[type]?.severity === 'high') {
            const now = Date.now();
            if (now - this.lastAlertTime >= this.alertCooldown) {
                speechManager.speak(
                    `Security anomaly: ${this.anomalyPatterns[type].description}`,
                    true
                );
                this.lastAlertTime = now;
            }
        }
    }

    /**
     * Update threat level based on concerns
     */
    updateThreatLevel(concerns) {
        if (concerns.some(c => c.severity === 'critical')) {
            this.state.threatLevel = 'critical';
        } else if (concerns.some(c => c.severity === 'high')) {
            this.state.threatLevel = 'high';
        } else if (concerns.some(c => c.severity === 'elevated')) {
            this.state.threatLevel = 'elevated';
        } else if (concerns.some(c => c.severity === 'moderate')) {
            this.state.threatLevel = 'moderate';
        } else {
            this.state.threatLevel = 'low';
        }
    }

    /**
     * Perform periodic threat assessment
     */
    performThreatAssessment() {
        if (!this.isActive) return;
        
        const recentAlerts = this.state.alerts.filter(
            a => (Date.now() - a.time) < 60000
        );
        
        const recentAnomalies = this.state.anomalies.filter(
            a => (Date.now() - a.timestamp) < 60000
        );
        
        // Log assessment
        console.log('[Security] Threat Assessment:', {
            threatLevel: this.state.threatLevel,
            peopleCount: this.state.peopleCount,
            recentAlerts: recentAlerts.length,
            recentAnomalies: recentAnomalies.length
        });
        
        // Update UI
        this.updateThreatDisplay();
    }

    /**
     * Update threat display in UI
     */
    updateThreatDisplay() {
        const threatEl = document.getElementById('security-threat-level');
        if (threatEl) {
            threatEl.textContent = this.state.threatLevel.toUpperCase();
            threatEl.className = `threat-level threat-${this.state.threatLevel}`;
        }
        
        const countEl = document.getElementById('security-people-count');
        if (countEl) {
            countEl.textContent = this.state.peopleCount;
        }
    }

    /**
     * Draw security overlay on canvas
     */
    drawSecurityOverlay(ctx, detections, width, height) {
        ctx.save();
        
        // Clear and redraw video
        ctx.clearRect(0, 0, width, height);
        ctx.drawImage(cameraManager.imgElement, 0, 0);
        
        detections.forEach(det => {
            if (det.class.toLowerCase() === 'person') {
                const { bbox, distance, position } = det;
                
                // Color based on distance/threat
                let color = '#00b894'; // safe - green
                if (distance === 'close') color = '#fdcb6e'; // caution - yellow
                if (distance === 'very close') color = '#d63031'; // danger - red
                
                // Draw bounding box
                ctx.strokeStyle = color;
                ctx.lineWidth = 3;
                ctx.strokeRect(bbox.x, bbox.y, bbox.width, bbox.height);
                
                // Draw corner brackets for emphasis
                const bracketSize = 15;
                ctx.beginPath();
                // Top-left
                ctx.moveTo(bbox.x, bbox.y + bracketSize);
                ctx.lineTo(bbox.x, bbox.y);
                ctx.lineTo(bbox.x + bracketSize, bbox.y);
                // Top-right
                ctx.moveTo(bbox.x + bbox.width - bracketSize, bbox.y);
                ctx.lineTo(bbox.x + bbox.width, bbox.y);
                ctx.lineTo(bbox.x + bbox.width, bbox.y + bracketSize);
                // Bottom-right
                ctx.moveTo(bbox.x + bbox.width, bbox.y + bbox.height - bracketSize);
                ctx.lineTo(bbox.x + bbox.width, bbox.y + bbox.height);
                ctx.lineTo(bbox.x + bbox.width - bracketSize, bbox.y + bbox.height);
                // Bottom-left
                ctx.moveTo(bbox.x + bracketSize, bbox.y + bbox.height);
                ctx.lineTo(bbox.x, bbox.y + bbox.height);
                ctx.lineTo(bbox.x, bbox.y + bbox.height - bracketSize);
                ctx.stroke();
                
                // Draw distance label
                ctx.fillStyle = color;
                ctx.fillRect(bbox.x, bbox.y - 25, 90, 22);
                ctx.fillStyle = '#fff';
                ctx.font = 'bold 12px Inter, sans-serif';
                ctx.fillText(`${distance}`, bbox.x + 5, bbox.y - 8);
            }
            
            // Highlight dangerous objects
            if (this.thresholds.dangerousObjects.includes(det.class.toLowerCase())) {
                const { bbox } = det;
                ctx.strokeStyle = '#ff0000';
                ctx.lineWidth = 4;
                ctx.setLineDash([5, 5]);
                ctx.strokeRect(bbox.x - 5, bbox.y - 5, bbox.width + 10, bbox.height + 10);
                ctx.setLineDash([]);
                
                ctx.fillStyle = '#ff0000';
                ctx.fillRect(bbox.x, bbox.y - 30, 120, 25);
                ctx.fillStyle = '#fff';
                ctx.font = 'bold 14px Inter, sans-serif';
                ctx.fillText(`⚠️ ${det.class}`, bbox.x + 5, bbox.y - 12);
            }
        });
        
        // Draw status overlay
        const people = detections.filter(d => d.class.toLowerCase() === 'person');
        
        // Background for status
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(10, 10, 180, 70);
        
        // Threat level indicator
        const threatColors = {
            low: '#00b894',
            moderate: '#fdcb6e',
            elevated: '#e17055',
            high: '#d63031',
            critical: '#ff0000'
        };
        
        ctx.fillStyle = threatColors[this.state.threatLevel] || '#00b894';
        ctx.fillRect(15, 15, 10, 60);
        
        // Status text
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 14px Inter, sans-serif';
        ctx.fillText(`People: ${people.length}`, 35, 35);
        ctx.font = '12px Inter, sans-serif';
        ctx.fillText(`Threat: ${this.state.threatLevel.toUpperCase()}`, 35, 55);
        ctx.fillText(`Alerts: ${this.state.alerts.length}`, 35, 72);
        
        ctx.restore();
    }

    /**
     * Handle voice command
     */
    handleVoiceCommand(command) {
        const cmd = command.toLowerCase();
        
        if (cmd.includes('how many people') || cmd.includes('people count') || cmd.includes('count people')) {
            const count = this.state.peopleCount;
            speechManager.speak(
                count === 0 ? 'No people detected nearby.' :
                count === 1 ? 'One person detected nearby.' :
                `${count} people detected around you.`,
                true
            );
            return true;
        }
        
        if (cmd.includes('anyone close') || cmd.includes('is someone near') || cmd.includes('close to me')) {
            const people = detectionManager.lastDetections?.filter(d => 
                d.class.toLowerCase() === 'person' && 
                (d.distance === 'very close' || d.distance === 'close')
            ) || [];
            
            if (people.length === 0) {
                speechManager.speak('No one is very close to you. Your immediate area appears clear.', true);
            } else {
                const veryClose = people.filter(p => p.distance === 'very close');
                if (veryClose.length > 0) {
                    speechManager.speak(
                        `Yes! ${veryClose.length} ${veryClose.length === 1 ? 'person is' : 'people are'} VERY close to you!`,
                        true
                    );
                } else {
                    const positions = people.map(p => p.position).join(' and ');
                    speechManager.speak(`Someone is close to your ${positions}.`, true);
                }
            }
            return true;
        }
        
        if (cmd.includes('threat level') || cmd.includes('danger level')) {
            this.announceThreatLevel();
            return true;
        }
        
        if (cmd.includes('describe') || cmd.includes('surroundings') || cmd.includes('overview')) {
            this.describeSecuritySituation();
            return true;
        }
        
        if (cmd.includes('all clear') || cmd.includes('status') || cmd.includes('report')) {
            this.reportStatus();
            return true;
        }
        
        if (cmd.includes('scan area') || cmd.includes('full scan') || cmd.includes('security scan')) {
            this.performSecurityScan();
            return true;
        }
        
        if (cmd.includes('stop') || cmd.includes('exit') || cmd.includes('quit')) {
            this.stop();
            return true;
        }
        
        return false;
    }

    /**
     * Announce threat level
     */
    announceThreatLevel() {
        const descriptions = {
            low: 'Threat level is LOW. Your surroundings appear safe.',
            moderate: 'Threat level is MODERATE. Some activity detected. Stay aware.',
            elevated: 'Threat level is ELEVATED. There is notable activity around you.',
            high: 'Threat level is HIGH. Someone is close or there is concerning activity.',
            critical: 'Threat level is CRITICAL! Potential danger detected. Be very careful.'
        };
        
        speechManager.speak(descriptions[this.state.threatLevel] || descriptions.low, true);
    }

    /**
     * Describe security situation
     */
    describeSecuritySituation() {
        const detections = detectionManager.lastDetections || [];
        const people = detections.filter(d => d.class.toLowerCase() === 'person');
        
        let description = '';
        
        if (people.length === 0) {
            description = 'Your surroundings appear clear. No people detected nearby. ';
        } else {
            const positions = { left: 0, center: 0, right: 0 };
            const distances = { 'very close': 0, close: 0, medium: 0, far: 0 };
            
            people.forEach(p => {
                positions[p.position]++;
                distances[p.distance]++;
            });
            
            const parts = [];
            if (positions.left > 0) parts.push(`${positions.left} on your left`);
            if (positions.center > 0) parts.push(`${positions.center} in front`);
            if (positions.right > 0) parts.push(`${positions.right} on your right`);
            
            description = `${people.length} ${people.length === 1 ? 'person' : 'people'} detected: ${parts.join(', ')}. `;
            
            if (distances['very close'] > 0) {
                description += `${distances['very close']} very close. `;
            }
            if (distances.close > 0) {
                description += `${distances.close} at close distance. `;
            }
        }
        
        // Add threat assessment
        description += `Current threat level: ${this.state.threatLevel}. `;
        
        // Add anomaly info
        const recentAnomalies = this.state.anomalies.filter(
            a => (Date.now() - a.timestamp) < 60000
        );
        if (recentAnomalies.length > 0) {
            description += `${recentAnomalies.length} unusual patterns detected in the last minute.`;
        }
        
        speechManager.speak(description, true);
    }

    /**
     * Report status
     */
    reportStatus() {
        const alertCount = this.state.alerts.length;
        const anomalyCount = this.state.anomalies.length;
        const peopleCount = this.state.peopleCount;
        const duration = Math.round((Date.now() - this.sessionStartTime) / 1000 / 60);
        
        const status = `Security status report: ` +
            `Threat level ${this.state.threatLevel}. ` +
            `${peopleCount} ${peopleCount === 1 ? 'person' : 'people'} currently nearby. ` +
            `${alertCount} alerts and ${anomalyCount} anomalies in this ${duration} minute session. ` +
            (this.state.threatLevel === 'low' ? 'All clear.' : 'Stay vigilant.');
        
        speechManager.speak(status, true);
    }

    /**
     * Perform detailed security scan
     */
    performSecurityScan() {
        speechManager.speak(
            'Performing detailed security scan. Hold steady and let me analyze the area.',
            true
        );
        
        // Increase sensitivity temporarily
        const originalCooldown = this.alertCooldown;
        this.alertCooldown = 1000;
        
        setTimeout(() => {
            this.alertCooldown = originalCooldown;
            this.describeSecuritySituation();
        }, 5000);
    }

    /**
     * Play alert sound
     */
    playAlertSound(severity) {
        try {
            if (!this.audioContext) {
                this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            }
            
            const sound = this.alertSounds[severity] || this.alertSounds.moderate;
            const now = this.audioContext.currentTime;
            
            for (let i = 0; i < sound.repeat; i++) {
                const oscillator = this.audioContext.createOscillator();
                const gainNode = this.audioContext.createGain();
                
                oscillator.connect(gainNode);
                gainNode.connect(this.audioContext.destination);
                
                oscillator.frequency.value = sound.frequency;
                oscillator.type = 'sine';
                
                gainNode.gain.setValueAtTime(0.4, now + i * (sound.duration + 0.1));
                gainNode.gain.exponentialRampToValueAtTime(0.01, now + i * (sound.duration + 0.1) + sound.duration);
                
                oscillator.start(now + i * (sound.duration + 0.1));
                oscillator.stop(now + i * (sound.duration + 0.1) + sound.duration);
            }
        } catch (error) {
            console.error('[Security] Alert sound error:', error);
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
            if (modeDisplay) modeDisplay.textContent = '🛡️ Security Mode';
            if (modeInfo) {
                modeInfo.innerHTML = `
                    <p><strong>Security Mode Active</strong></p>
                    <p>Threat: <span id="security-threat-level" class="threat-level threat-${this.state.threatLevel}">${this.state.threatLevel.toUpperCase()}</span></p>
                    <p>People: <span id="security-people-count">0</span></p>
                `;
            }
            if (modeContent) {
                modeContent.innerHTML = `
                    <div class="security-display">
                        <div class="security-status">
                            <span class="security-icon">🛡️</span>
                            <span class="security-threat threat-${this.state.threatLevel}">
                                ${this.state.threatLevel.toUpperCase()}
                            </span>
                        </div>
                        
                        <div class="security-stats">
                            <div class="stat">
                                <span class="stat-label">People</span>
                                <span class="stat-value" id="sec-people">${this.state.peopleCount}</span>
                            </div>
                            <div class="stat">
                                <span class="stat-label">Alerts</span>
                                <span class="stat-value" id="sec-alerts">${this.state.alerts.length}</span>
                            </div>
                            <div class="stat">
                                <span class="stat-label">Anomalies</span>
                                <span class="stat-value" id="sec-anomalies">${this.state.anomalies.length}</span>
                            </div>
                        </div>
                        
                        <div class="security-actions">
                            <button id="scan-area-btn" class="btn btn-secondary">🔍 Scan Area</button>
                            <button id="status-report-btn" class="btn btn-primary">📊 Status Report</button>
                        </div>
                        
                        <div class="security-info">
                            <h4>Voice Commands:</h4>
                            <ul>
                                <li>"How many people" - People count</li>
                                <li>"Threat level" - Current assessment</li>
                                <li>"Describe surroundings" - Full overview</li>
                                <li>"Scan area" - Detailed scan</li>
                            </ul>
                        </div>
                    </div>
                `;
                
                document.getElementById('scan-area-btn')?.addEventListener('click', () => {
                    this.performSecurityScan();
                });
                document.getElementById('status-report-btn')?.addEventListener('click', () => {
                    this.reportStatus();
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
const securityMode = new SecurityMode();
