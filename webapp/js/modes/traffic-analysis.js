/**
 * BlindNav+ Traffic & Road Safety Analysis Mode
 * Analyzes traffic signals, road conditions, and provides crossing guidance
 */

class TrafficAnalysisMode {
    constructor() {
        this.isActive = false;
        this.frameProcessingActive = false;
        this.lastAnnouncementTime = 0;
        this.announcementCooldown = 2000;
        
        // Traffic light tracking
        this.currentTrafficLight = null;
        this.trafficLightHistory = [];
        this.lastLightColor = null;
        this.lightChangeTime = null;
        
        // Road crossing state
        this.crossingMode = false;
        this.crossingStartTime = null;
        this.crossingGuidanceInterval = null;
        
        // Vehicle tracking
        this.trackedVehicles = new Map();
        this.vehicleApproachAlerts = true;
        
        // Pedestrian crossing assistance
        this.crosswalkDetected = false;
        this.pedestrianSignalColor = null;
        
        // Safety thresholds
        this.safetyThresholds = {
            vehicleDangerDistance: 5,    // meters
            vehicleWarningDistance: 15,   // meters
            minCrossingGap: 8,           // seconds estimated
            trafficLightChangeBuffer: 3   // seconds before light change warning
        };
        
        // Sound alerts
        this.soundAlertsEnabled = true;
        
        // Analysis results
        this.lastAnalysis = null;
    }
    
    /**
     * Start traffic analysis mode
     */
    async start() {
        if (this.isActive) {
            console.log('[Traffic] Already active');
            return;
        }
        
        this.isActive = true;
        console.log('[Traffic] Mode started');
        
        // Initialize vision service if available
        if (typeof visionService !== 'undefined' && !visionService.isInitialized) {
            await visionService.initialize();
        }
        
        speechManager.speak(
            'Traffic Analysis Mode activated. ' +
            'I will monitor traffic signals, vehicles, and help you cross safely. ' +
            'Say "ready to cross" when you want to cross the road. ' +
            'Say "traffic status" for current conditions.',
            true
        );
        
        this.updateUI(true);
        this.startFrameProcessing();
    }
    
    /**
     * Stop traffic analysis mode
     */
    stop() {
        if (!this.isActive) return;
        
        this.isActive = false;
        this.stopFrameProcessing();
        this.stopCrossingMode();
        
        speechManager.speak('Exiting Traffic Analysis Mode.');
        
        this.updateUI(false);
        
        console.log('[Traffic] Mode stopped');
    }
    
    /**
     * Start frame processing
     */
    startFrameProcessing() {
        this.frameProcessingActive = true;
        let frameCount = 0;
        
        cameraManager.startFrameProcessing(async (frame) => {
            if (!this.isActive || !this.frameProcessingActive) return;
            
            frameCount++;
            
            // Process every 2nd frame
            if (frameCount % 2 !== 0) return;
            
            // Run comprehensive analysis
            const analysis = await this.analyzeTrafficScene(frame);
            this.lastAnalysis = analysis;
            
            // Draw visualizations
            if (frame.ctx) {
                this.drawTrafficVisualization(frame.ctx, analysis, frame);
            }
            
            // Process alerts
            this.processTrafficAlerts(analysis);
            
            // Update UI
            this.updateResultsDisplay(analysis);
        });
    }
    
    /**
     * Stop frame processing
     */
    stopFrameProcessing() {
        this.frameProcessingActive = false;
        cameraManager.stopFrameProcessing();
    }
    
    /**
     * Analyze complete traffic scene
     */
    async analyzeTrafficScene(frame) {
        let detections = [];
        
        if (typeof visionService !== 'undefined') {
            detections = await visionService.detectObjects(frame);
        } else {
            detections = await detectionManager.detect(frame);
        }
        
        // Analyze traffic signals
        const trafficSignals = await this.analyzeTrafficSignals(frame, detections);
        
        // Analyze road conditions
        const roadConditions = this.analyzeRoadConditions(frame, detections);
        
        // Analyze vehicles
        const vehicleAnalysis = this.analyzeVehicles(detections);
        
        // Analyze pedestrians
        const pedestrianAnalysis = this.analyzePedestrians(detections);
        
        // Calculate crossing safety
        const crossingSafety = this.calculateCrossingSafety(
            trafficSignals, 
            vehicleAnalysis, 
            roadConditions
        );
        
        return {
            timestamp: Date.now(),
            detections,
            trafficSignals,
            roadConditions,
            vehicles: vehicleAnalysis,
            pedestrians: pedestrianAnalysis,
            crossingSafety,
            overallStatus: this.determineOverallStatus(crossingSafety, vehicleAnalysis)
        };
    }
    
    /**
     * Analyze traffic signals in frame
     * analyze_traffic_signals()
     */
    async analyzeTrafficSignals(frame, detections) {
        // Use vision service if available
        if (typeof visionService !== 'undefined') {
            const result = await visionService.analyzeTrafficSignals(frame, detections);
            
            if (result.detected && result.signals.length > 0) {
                const signal = result.signals[0];
                
                // Track light changes
                if (this.lastLightColor !== signal.lightColor) {
                    this.lightChangeTime = Date.now();
                    this.lastLightColor = signal.lightColor;
                    
                    // Record in history
                    this.trafficLightHistory.push({
                        color: signal.lightColor,
                        time: this.lightChangeTime
                    });
                    
                    // Keep last 20 changes
                    if (this.trafficLightHistory.length > 20) {
                        this.trafficLightHistory.shift();
                    }
                }
                
                // Estimate time in current state
                const timeInState = this.lightChangeTime ? 
                    Math.round((Date.now() - this.lightChangeTime) / 1000) : 0;
                
                // Predict next change based on history
                const prediction = this.predictLightChange();
                
                return {
                    detected: true,
                    color: signal.lightColor,
                    confidence: signal.colorConfidence,
                    position: signal.position,
                    action: signal.action,
                    timeInState,
                    prediction,
                    pedestrianSignal: this.detectPedestrianSignal(frame, signal)
                };
            }
        }
        
        // Fallback: check for traffic lights in detections
        const trafficLights = detections.filter(d => 
            d.class.toLowerCase() === 'traffic light'
        );
        
        if (trafficLights.length > 0) {
            const light = trafficLights[0];
            const color = await this.analyzeTrafficLightColor(frame, light);
            
            return {
                detected: true,
                color: color.color,
                confidence: color.confidence,
                position: light.position,
                action: this.getTrafficAction(color.color),
                timeInState: 0,
                prediction: null,
                pedestrianSignal: null
            };
        }
        
        return {
            detected: false,
            color: null,
            action: 'No traffic signal detected',
            prediction: null
        };
    }
    
    /**
     * Analyze traffic light color
     */
    async analyzeTrafficLightColor(frame, light) {
        const ctx = frame.ctx;
        const { bbox } = light;
        
        try {
            const imageData = ctx.getImageData(
                Math.max(0, bbox.x),
                Math.max(0, bbox.y),
                Math.min(bbox.width, frame.width - bbox.x),
                Math.min(bbox.height, frame.height - bbox.y)
            );
            
            const data = imageData.data;
            let redScore = 0, yellowScore = 0, greenScore = 0;
            let brightPixels = 0;
            
            for (let i = 0; i < data.length; i += 4) {
                const r = data[i];
                const g = data[i + 1];
                const b = data[i + 2];
                const brightness = (r + g + b) / 3;
                
                if (brightness > 100) {
                    brightPixels++;
                    
                    if (r > 150 && r > g * 1.5 && r > b * 1.5) {
                        redScore++;
                    } else if (r > 150 && g > 120 && b < 100) {
                        yellowScore++;
                    } else if (g > 100 && g > r * 1.2 && g > b * 1.1) {
                        greenScore++;
                    }
                }
            }
            
            const total = redScore + yellowScore + greenScore;
            
            if (total < brightPixels * 0.1) {
                return { color: 'unknown', confidence: 0.3 };
            }
            
            if (redScore > yellowScore && redScore > greenScore) {
                return { color: 'red', confidence: redScore / total };
            } else if (yellowScore > redScore && yellowScore > greenScore) {
                return { color: 'yellow', confidence: yellowScore / total };
            } else {
                return { color: 'green', confidence: greenScore / total };
            }
            
        } catch (error) {
            return { color: 'unknown', confidence: 0 };
        }
    }
    
    /**
     * Get traffic action based on color
     */
    getTrafficAction(color) {
        switch (color) {
            case 'red':
                return 'STOP - Do not cross the road';
            case 'yellow':
                return 'CAUTION - Light changing soon';
            case 'green':
                return 'GO - Safe to cross if clear';
            default:
                return 'UNKNOWN - Proceed with extreme caution';
        }
    }
    
    /**
     * Predict next light change
     */
    predictLightChange() {
        if (this.trafficLightHistory.length < 2) return null;
        
        // Calculate average duration for each color
        const durations = { red: [], yellow: [], green: [] };
        
        for (let i = 1; i < this.trafficLightHistory.length; i++) {
            const prev = this.trafficLightHistory[i - 1];
            const curr = this.trafficLightHistory[i];
            const duration = (curr.time - prev.time) / 1000;
            
            if (durations[prev.color] && duration > 0 && duration < 120) {
                durations[prev.color].push(duration);
            }
        }
        
        // Get current light and estimate remaining time
        const currentColor = this.lastLightColor;
        const timeInState = this.lightChangeTime ? 
            (Date.now() - this.lightChangeTime) / 1000 : 0;
        
        if (durations[currentColor] && durations[currentColor].length > 0) {
            const avgDuration = durations[currentColor].reduce((a, b) => a + b, 0) / 
                durations[currentColor].length;
            const remaining = Math.max(0, avgDuration - timeInState);
            
            return {
                estimatedRemaining: Math.round(remaining),
                confidence: durations[currentColor].length > 2 ? 'medium' : 'low'
            };
        }
        
        return null;
    }
    
    /**
     * Detect pedestrian crossing signal
     */
    detectPedestrianSignal(frame, trafficSignal) {
        // Simplified - would need specialized detection
        // Often pedestrian signal is near traffic light
        return {
            detected: false,
            color: null,
            walkSign: false
        };
    }
    
    /**
     * Analyze road conditions
     * analyze_road_conditions()
     */
    analyzeRoadConditions(frame, detections) {
        // Analyze lower portion of frame (road area)
        const ctx = frame.ctx;
        const roadY = Math.floor(frame.height * 0.6);
        const roadHeight = frame.height - roadY;
        
        let imageData;
        try {
            imageData = ctx.getImageData(0, roadY, frame.width, roadHeight);
        } catch (e) {
            return {
                surface: 'unknown',
                condition: 'unknown',
                hazards: [],
                crosswalk: false
            };
        }
        
        const data = imageData.data;
        
        // Analyze surface brightness and uniformity
        let totalBrightness = 0;
        let brightSpots = 0;
        let darkSpots = 0;
        let sampleCount = 0;
        
        for (let i = 0; i < data.length; i += 16) {
            const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3;
            totalBrightness += brightness;
            
            if (brightness > 200) brightSpots++;
            if (brightness < 50) darkSpots++;
            
            sampleCount++;
        }
        
        const avgBrightness = totalBrightness / sampleCount;
        const brightRatio = brightSpots / sampleCount;
        const darkRatio = darkSpots / sampleCount;
        
        // Determine surface type
        let surface;
        if (avgBrightness < 60) {
            surface = 'dark asphalt';
        } else if (avgBrightness < 120) {
            surface = 'standard road';
        } else if (avgBrightness > 180) {
            surface = 'light surface';
        } else {
            surface = 'mixed surface';
        }
        
        // Determine condition
        let condition = 'dry';
        if (brightRatio > 0.2) {
            condition = 'possibly wet (reflections detected)';
        }
        
        // Check for road hazards in detections
        const hazards = [];
        const hazardClasses = ['pothole', 'debris', 'construction', 'hole'];
        
        detections.forEach(d => {
            if (hazardClasses.some(h => d.class.toLowerCase().includes(h))) {
                hazards.push({
                    type: d.class,
                    position: d.position,
                    distance: d.depth?.meters || d.distance?.meters
                });
            }
        });
        
        // Check for obstacles on road
        const roadObstacles = detections.filter(d => 
            d.position?.vertical === 'lower' &&
            ['bicycle', 'motorcycle', 'cone', 'barrier'].includes(d.class.toLowerCase())
        );
        
        roadObstacles.forEach(obs => {
            hazards.push({
                type: obs.class,
                position: obs.position,
                distance: obs.depth?.meters || obs.distance?.meters
            });
        });
        
        // Detect crosswalk patterns (simplified)
        const crosswalk = this.detectCrosswalkPattern(imageData, frame.width, roadHeight);
        
        return {
            surface,
            condition,
            brightness: avgBrightness,
            hazards,
            crosswalk,
            safetyLevel: hazards.length === 0 ? 'safe' : 
                hazards.some(h => h.distance < 3) ? 'danger' : 'caution'
        };
    }
    
    /**
     * Detect crosswalk pattern in road
     */
    detectCrosswalkPattern(imageData, width, height) {
        // Simplified crosswalk detection
        // Look for alternating light/dark horizontal stripes
        const data = imageData.data;
        let stripeCount = 0;
        let lastWasLight = false;
        
        // Sample horizontal line in middle of road region
        const y = Math.floor(height / 2);
        
        for (let x = 0; x < width; x += 10) {
            const idx = (y * width + x) * 4;
            const brightness = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
            const isLight = brightness > 150;
            
            if (isLight !== lastWasLight) {
                stripeCount++;
                lastWasLight = isLight;
            }
        }
        
        // Crosswalks typically have multiple stripes
        const detected = stripeCount >= 6;
        
        return {
            detected,
            confidence: detected ? (stripeCount > 10 ? 'high' : 'medium') : 'low',
            stripes: stripeCount
        };
    }
    
    /**
     * Analyze vehicles in scene
     */
    analyzeVehicles(detections) {
        const vehicleClasses = ['car', 'truck', 'bus', 'motorcycle', 'bicycle'];
        const vehicles = detections.filter(d => 
            vehicleClasses.includes(d.class.toLowerCase())
        );
        
        // Track vehicles over time
        vehicles.forEach(v => {
            const key = `${v.class}_${Math.round(v.center?.x / 50)}`;
            const prev = this.trackedVehicles.get(key);
            
            if (prev) {
                v.tracked = true;
                v.approachRate = (v.size?.areaRatio || 0) - prev.size;
                v.isApproaching = v.approachRate > 0.01;
                v.speed = this.estimateVehicleSpeed(v, prev);
            } else {
                v.tracked = false;
                v.approachRate = 0;
                v.isApproaching = v.movement?.approaching || false;
            }
            
            this.trackedVehicles.set(key, {
                size: v.size?.areaRatio || 0,
                time: Date.now(),
                position: v.center
            });
        });
        
        // Cleanup old tracked vehicles
        const now = Date.now();
        for (const [key, data] of this.trackedVehicles) {
            if (now - data.time > 5000) {
                this.trackedVehicles.delete(key);
            }
        }
        
        // Categorize by position and danger
        const approaching = vehicles.filter(v => v.isApproaching);
        const inPath = vehicles.filter(v => 
            v.position?.horizontal === 'center' || 
            v.position?.horizontal?.includes('slight')
        );
        
        // Find nearest vehicle
        const nearest = vehicles.length > 0 ?
            vehicles.reduce((a, b) => 
                (a.depth?.meters || 100) < (b.depth?.meters || 100) ? a : b
            ) : null;
        
        // Calculate danger level
        let dangerLevel = 'safe';
        if (nearest) {
            const distance = nearest.depth?.meters || nearest.distance?.meters || 100;
            if (distance < this.safetyThresholds.vehicleDangerDistance) {
                dangerLevel = 'danger';
            } else if (distance < this.safetyThresholds.vehicleWarningDistance) {
                dangerLevel = 'warning';
            }
        }
        
        return {
            total: vehicles.length,
            vehicles,
            approaching,
            inPath,
            nearest,
            dangerLevel,
            estimatedGap: this.estimateCrossingGap(vehicles)
        };
    }
    
    /**
     * Estimate vehicle speed
     */
    estimateVehicleSpeed(current, previous) {
        const timeDiff = (Date.now() - previous.time) / 1000;
        if (timeDiff < 0.1) return 'unknown';
        
        const sizeChange = (current.size?.areaRatio || 0) - previous.size;
        
        // Rough speed estimate based on size change
        if (sizeChange > 0.05) return 'fast';
        if (sizeChange > 0.02) return 'moderate';
        if (sizeChange > 0) return 'slow';
        if (sizeChange < -0.02) return 'moving away';
        
        return 'stationary';
    }
    
    /**
     * Estimate safe crossing gap
     */
    estimateCrossingGap(vehicles) {
        if (vehicles.length === 0) {
            return {
                available: true,
                seconds: null,
                recommendation: 'No vehicles detected - verify before crossing'
            };
        }
        
        // Find approaching vehicles in path
        const approaching = vehicles.filter(v => 
            v.isApproaching && 
            (v.position?.horizontal === 'center' || v.position?.horizontal?.includes('slight'))
        );
        
        if (approaching.length === 0) {
            return {
                available: true,
                seconds: 10,
                recommendation: 'Vehicles present but not approaching - may be safe'
            };
        }
        
        // Estimate time to arrival for nearest approaching vehicle
        const nearest = approaching.reduce((a, b) => 
            (a.depth?.meters || 100) < (b.depth?.meters || 100) ? a : b
        );
        
        const distance = nearest.depth?.meters || 20;
        const estimatedSpeed = 30; // km/h assumed
        const timeToArrival = (distance / 1000) / estimatedSpeed * 3600;
        
        return {
            available: timeToArrival >= this.safetyThresholds.minCrossingGap,
            seconds: Math.round(timeToArrival),
            recommendation: timeToArrival >= this.safetyThresholds.minCrossingGap ?
                `Gap available - about ${Math.round(timeToArrival)} seconds` :
                `Wait - vehicle arriving in about ${Math.round(timeToArrival)} seconds`
        };
    }
    
    /**
     * Analyze pedestrians in scene
     */
    analyzePedestrians(detections) {
        const pedestrians = detections.filter(d => d.class.toLowerCase() === 'person');
        
        return {
            count: pedestrians.length,
            pedestrians,
            nearCrossing: pedestrians.filter(p => 
                p.position?.vertical === 'lower' || p.position?.vertical === 'middle'
            ).length,
            othersCrossing: pedestrians.some(p => 
                p.position?.horizontal === 'center' && 
                p.position?.vertical === 'middle'
            )
        };
    }
    
    /**
     * Calculate overall crossing safety
     */
    calculateCrossingSafety(trafficSignals, vehicleAnalysis, roadConditions) {
        let safetyScore = 100;
        const factors = [];
        
        // Traffic signal factor
        if (trafficSignals.detected) {
            if (trafficSignals.color === 'red') {
                safetyScore -= 50;
                factors.push({ factor: 'Traffic light is RED', impact: -50 });
            } else if (trafficSignals.color === 'yellow') {
                safetyScore -= 30;
                factors.push({ factor: 'Traffic light is YELLOW', impact: -30 });
            } else if (trafficSignals.color === 'green') {
                factors.push({ factor: 'Traffic light is GREEN', impact: 0 });
            }
        } else {
            safetyScore -= 20;
            factors.push({ factor: 'No traffic light detected', impact: -20 });
        }
        
        // Vehicle factor
        if (vehicleAnalysis.dangerLevel === 'danger') {
            safetyScore -= 40;
            factors.push({ factor: 'Vehicles very close', impact: -40 });
        } else if (vehicleAnalysis.dangerLevel === 'warning') {
            safetyScore -= 20;
            factors.push({ factor: 'Vehicles approaching', impact: -20 });
        }
        
        // Road condition factor
        if (roadConditions.hazards.length > 0) {
            safetyScore -= 15;
            factors.push({ factor: 'Road hazards present', impact: -15 });
        }
        
        if (roadConditions.condition.includes('wet')) {
            safetyScore -= 10;
            factors.push({ factor: 'Road may be wet', impact: -10 });
        }
        
        // Crosswalk factor
        if (roadConditions.crosswalk?.detected) {
            safetyScore += 10;
            factors.push({ factor: 'Crosswalk detected', impact: +10 });
        }
        
        safetyScore = Math.max(0, Math.min(100, safetyScore));
        
        // Determine recommendation
        let recommendation;
        if (safetyScore >= 70) {
            recommendation = 'Safe to cross - proceed with caution';
        } else if (safetyScore >= 40) {
            recommendation = 'Caution - verify conditions before crossing';
        } else {
            recommendation = 'DO NOT CROSS - Wait for safer conditions';
        }
        
        return {
            score: safetyScore,
            level: safetyScore >= 70 ? 'safe' : safetyScore >= 40 ? 'caution' : 'danger',
            factors,
            recommendation
        };
    }
    
    /**
     * Determine overall status
     */
    determineOverallStatus(crossingSafety, vehicleAnalysis) {
        if (crossingSafety.level === 'danger' || vehicleAnalysis.dangerLevel === 'danger') {
            return 'danger';
        }
        if (crossingSafety.level === 'caution' || vehicleAnalysis.dangerLevel === 'warning') {
            return 'caution';
        }
        return 'safe';
    }
    
    /**
     * Process traffic alerts
     */
    processTrafficAlerts(analysis) {
        const now = Date.now();
        if (now - this.lastAnnouncementTime < this.announcementCooldown) return;
        
        // Priority: Danger alerts
        if (analysis.vehicles.dangerLevel === 'danger') {
            const nearest = analysis.vehicles.nearest;
            const distance = nearest?.depth?.meters || nearest?.distance?.meters;
            
            speechManager.speak(
                `Warning! ${nearest.class} very close, ${Math.round(distance)} meters!`,
                true
            );
            this.lastAnnouncementTime = now;
            return;
        }
        
        // Traffic light changes
        if (analysis.trafficSignals.detected && 
            analysis.trafficSignals.color !== this.currentTrafficLight) {
            
            this.currentTrafficLight = analysis.trafficSignals.color;
            speechManager.speak(
                `Traffic light changed to ${analysis.trafficSignals.color}. ${analysis.trafficSignals.action}`,
                analysis.trafficSignals.color === 'green'
            );
            this.lastAnnouncementTime = now;
            return;
        }
        
        // Light about to change (if predicted)
        if (analysis.trafficSignals.prediction && 
            analysis.trafficSignals.prediction.estimatedRemaining <= 
            this.safetyThresholds.trafficLightChangeBuffer) {
            
            speechManager.speak(
                `Traffic light may change in ${analysis.trafficSignals.prediction.estimatedRemaining} seconds.`
            );
            this.lastAnnouncementTime = now;
            return;
        }
        
        // Crossing mode alerts
        if (this.crossingMode) {
            this.provideCrossingGuidance(analysis);
        }
    }
    
    /**
     * Start crossing assistance mode
     */
    startCrossingMode() {
        this.crossingMode = true;
        this.crossingStartTime = Date.now();
        
        if (!this.lastAnalysis) {
            speechManager.speak(
                'Analyzing crossing conditions. Please wait.',
                true
            );
            return;
        }
        
        const safety = this.lastAnalysis.crossingSafety;
        
        if (safety.level === 'danger') {
            speechManager.speak(
                `NOT SAFE TO CROSS. ${safety.recommendation}`,
                true
            );
            this.crossingMode = false;
            return;
        }
        
        let message = 'Ready to assist crossing. ';
        
        if (this.lastAnalysis.trafficSignals.detected) {
            message += `Traffic light is ${this.lastAnalysis.trafficSignals.color}. `;
        }
        
        if (this.lastAnalysis.vehicles.total > 0) {
            message += `${this.lastAnalysis.vehicles.total} vehicle${this.lastAnalysis.vehicles.total > 1 ? 's' : ''} detected. `;
        }
        
        if (safety.level === 'safe') {
            message += 'Conditions appear safe. I will guide you across.';
        } else {
            message += 'Proceed with extra caution.';
        }
        
        speechManager.speak(message, true);
        
        // Start continuous crossing guidance
        this.crossingGuidanceInterval = setInterval(() => {
            if (this.lastAnalysis) {
                this.provideCrossingGuidance(this.lastAnalysis);
            }
        }, 1500);
    }
    
    /**
     * Stop crossing mode
     */
    stopCrossingMode() {
        this.crossingMode = false;
        this.crossingStartTime = null;
        
        if (this.crossingGuidanceInterval) {
            clearInterval(this.crossingGuidanceInterval);
            this.crossingGuidanceInterval = null;
        }
    }
    
    /**
     * Provide crossing guidance
     */
    provideCrossingGuidance(analysis) {
        // Check for immediate danger
        if (analysis.vehicles.dangerLevel === 'danger') {
            speechManager.speak('STOP! Vehicle approaching!', true);
            return;
        }
        
        // Check traffic light
        if (analysis.trafficSignals.detected && analysis.trafficSignals.color === 'red') {
            speechManager.speak('Light turned red. Stop if still crossing.', true);
            return;
        }
        
        // Normal guidance
        if (analysis.vehicles.approaching.length > 0) {
            speechManager.speak(
                `${analysis.vehicles.approaching.length} vehicle approaching. Continue with awareness.`
            );
        }
    }
    
    /**
     * Get current traffic status
     */
    getTrafficStatus() {
        if (!this.lastAnalysis) {
            speechManager.speak('Analyzing traffic conditions. Please wait.');
            return;
        }
        
        const a = this.lastAnalysis;
        let message = 'Traffic status: ';
        
        // Traffic light
        if (a.trafficSignals.detected) {
            message += `Light is ${a.trafficSignals.color}. `;
            if (a.trafficSignals.prediction) {
                message += `May change in about ${a.trafficSignals.prediction.estimatedRemaining} seconds. `;
            }
        } else {
            message += 'No traffic light visible. ';
        }
        
        // Vehicles
        if (a.vehicles.total > 0) {
            message += `${a.vehicles.total} vehicle${a.vehicles.total > 1 ? 's' : ''} detected. `;
            if (a.vehicles.nearest) {
                const dist = a.vehicles.nearest.depth?.meters || a.vehicles.nearest.distance?.meters;
                message += `Nearest ${a.vehicles.nearest.class} at ${Math.round(dist)} meters. `;
            }
        } else {
            message += 'No vehicles detected. ';
        }
        
        // Road conditions
        message += `Road: ${a.roadConditions.surface}, ${a.roadConditions.condition}. `;
        
        // Overall safety
        message += a.crossingSafety.recommendation;
        
        speechManager.speak(message);
    }
    
    /**
     * Draw traffic visualization
     */
    drawTrafficVisualization(ctx, analysis, frame) {
        ctx.clearRect(0, 0, frame.width, frame.height);
        ctx.drawImage(cameraManager.imgElement, 0, 0);
        
        ctx.save();
        
        // Draw vehicle detections
        analysis.detections.forEach(det => {
            const isVehicle = ['car', 'truck', 'bus', 'motorcycle', 'bicycle'].includes(
                det.class.toLowerCase()
            );
            const isTrafficLight = det.class.toLowerCase() === 'traffic light';
            
            if (!isVehicle && !isTrafficLight) return;
            
            const { bbox } = det;
            
            // Color based on danger
            let color;
            if (isTrafficLight) {
                color = analysis.trafficSignals.color === 'red' ? '#e74c3c' :
                    analysis.trafficSignals.color === 'yellow' ? '#f39c12' :
                    analysis.trafficSignals.color === 'green' ? '#27ae60' : '#95a5a6';
            } else {
                const distance = det.depth?.meters || det.distance?.meters || 100;
                color = distance < 5 ? '#e74c3c' :
                    distance < 15 ? '#f39c12' : '#27ae60';
            }
            
            // Draw box
            ctx.strokeStyle = color;
            ctx.lineWidth = 3;
            ctx.strokeRect(bbox.x, bbox.y, bbox.width, bbox.height);
            
            // Draw label
            const distance = det.depth?.meters || det.distance?.meters;
            const label = isTrafficLight ? 
                `${analysis.trafficSignals.color?.toUpperCase() || 'LIGHT'}` :
                `${det.class} ${distance ? Math.round(distance) + 'm' : ''}`;
            
            ctx.font = 'bold 14px Inter';
            const textWidth = ctx.measureText(label).width;
            
            ctx.fillStyle = color;
            ctx.fillRect(bbox.x, bbox.y - 25, textWidth + 10, 22);
            
            ctx.fillStyle = '#fff';
            ctx.fillText(label, bbox.x + 5, bbox.y - 8);
            
            // Draw approach arrow if approaching
            if (det.isApproaching) {
                ctx.fillStyle = '#e74c3c';
                ctx.beginPath();
                ctx.moveTo(bbox.x + bbox.width/2, bbox.y - 30);
                ctx.lineTo(bbox.x + bbox.width/2 - 10, bbox.y - 45);
                ctx.lineTo(bbox.x + bbox.width/2 + 10, bbox.y - 45);
                ctx.fill();
            }
        });
        
        // Draw crosswalk indicator
        if (analysis.roadConditions.crosswalk?.detected) {
            ctx.strokeStyle = '#3498db';
            ctx.lineWidth = 2;
            ctx.setLineDash([10, 5]);
            ctx.strokeRect(10, frame.height * 0.7, frame.width - 20, frame.height * 0.2);
            ctx.setLineDash([]);
            
            ctx.fillStyle = '#3498db';
            ctx.font = '12px Inter';
            ctx.fillText('CROSSWALK', 15, frame.height * 0.7 + 15);
        }
        
        // Draw safety indicator
        const safetyColor = analysis.overallStatus === 'safe' ? '#27ae60' :
            analysis.overallStatus === 'caution' ? '#f39c12' : '#e74c3c';
        
        ctx.fillStyle = safetyColor;
        ctx.beginPath();
        ctx.arc(frame.width - 25, 25, 15, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 12px Inter';
        ctx.textAlign = 'center';
        ctx.fillText(
            analysis.overallStatus === 'safe' ? '✓' :
            analysis.overallStatus === 'caution' ? '!' : '✗',
            frame.width - 25, 30
        );
        
        ctx.restore();
    }
    
    /**
     * Update UI
     */
    updateUI(active) {
        const modeContent = document.getElementById('mode-content');
        if (!modeContent) return;
        
        if (active) {
            modeContent.innerHTML = `
                <div class="traffic-analysis-display">
                    <div class="traffic-header">
                        <span class="traffic-icon">🚦</span>
                        <span class="traffic-title">Traffic Analysis</span>
                    </div>
                    
                    <div class="traffic-signal-display" id="traffic-signal">
                        <div class="signal-light unknown" id="signal-light">
                            <div class="light red"></div>
                            <div class="light yellow"></div>
                            <div class="light green"></div>
                        </div>
                        <span class="signal-status" id="signal-status">Scanning...</span>
                    </div>
                    
                    <div class="crossing-safety" id="crossing-safety">
                        <div class="safety-meter">
                            <div class="safety-fill" id="safety-fill"></div>
                        </div>
                        <span class="safety-label" id="safety-label">Analyzing...</span>
                    </div>
                    
                    <div class="traffic-actions">
                        <button class="traffic-btn primary" onclick="trafficAnalysisMode.startCrossingMode()">
                            🚶 Ready to Cross
                        </button>
                        <button class="traffic-btn" onclick="trafficAnalysisMode.getTrafficStatus()">
                            📊 Traffic Status
                        </button>
                    </div>
                    
                    <div class="vehicle-info" id="vehicle-info">
                        <h4>Vehicles:</h4>
                        <div id="vehicle-list" class="vehicle-list"></div>
                    </div>
                    
                    <div class="road-conditions" id="road-conditions">
                        <h4>Road:</h4>
                        <span id="road-status">Analyzing...</span>
                    </div>
                </div>
            `;
        } else {
            modeContent.innerHTML = '';
        }
    }
    
    /**
     * Update results display
     */
    updateResultsDisplay(analysis) {
        // Update traffic signal display
        const signalLight = document.getElementById('signal-light');
        const signalStatus = document.getElementById('signal-status');
        
        if (signalLight && analysis.trafficSignals.detected) {
            signalLight.className = `signal-light ${analysis.trafficSignals.color || 'unknown'}`;
            
            if (signalStatus) {
                let statusText = analysis.trafficSignals.color?.toUpperCase() || 'Unknown';
                if (analysis.trafficSignals.prediction) {
                    statusText += ` (${analysis.trafficSignals.prediction.estimatedRemaining}s)`;
                }
                signalStatus.textContent = statusText;
            }
        }
        
        // Update safety meter
        const safetyFill = document.getElementById('safety-fill');
        const safetyLabel = document.getElementById('safety-label');
        
        if (safetyFill) {
            const score = analysis.crossingSafety.score;
            safetyFill.style.width = `${score}%`;
            safetyFill.className = `safety-fill ${analysis.crossingSafety.level}`;
        }
        
        if (safetyLabel) {
            safetyLabel.textContent = analysis.crossingSafety.recommendation;
        }
        
        // Update vehicle list
        const vehicleList = document.getElementById('vehicle-list');
        if (vehicleList) {
            if (analysis.vehicles.total > 0) {
                vehicleList.innerHTML = analysis.vehicles.vehicles.slice(0, 5).map(v => {
                    const dist = v.depth?.meters || v.distance?.meters;
                    const dangerClass = dist < 5 ? 'danger' : dist < 15 ? 'warning' : 'safe';
                    
                    return `
                        <div class="vehicle-item ${dangerClass}">
                            <span class="v-type">${v.class}</span>
                            <span class="v-pos">${v.position?.horizontal || ''}</span>
                            <span class="v-dist">${dist ? Math.round(dist) + 'm' : ''}</span>
                            ${v.isApproaching ? '<span class="approaching">→</span>' : ''}
                        </div>
                    `;
                }).join('');
            } else {
                vehicleList.innerHTML = '<div class="no-vehicles">No vehicles detected</div>';
            }
        }
        
        // Update road conditions
        const roadStatus = document.getElementById('road-status');
        if (roadStatus) {
            let roadText = `${analysis.roadConditions.surface}, ${analysis.roadConditions.condition}`;
            if (analysis.roadConditions.crosswalk?.detected) {
                roadText += ' | Crosswalk detected';
            }
            if (analysis.roadConditions.hazards.length > 0) {
                roadText += ` | ${analysis.roadConditions.hazards.length} hazard(s)`;
            }
            roadStatus.textContent = roadText;
        }
    }
    
    /**
     * Handle voice command
     */
    handleCommand(command) {
        const cmd = command.toLowerCase();
        
        // Exit
        if (cmd.includes('stop') || cmd.includes('exit')) {
            this.stop();
            return true;
        }
        
        // Start crossing
        if (cmd.includes('ready to cross') || cmd.includes('want to cross') || 
            cmd.includes('cross now') || cmd.includes('help me cross')) {
            this.startCrossingMode();
            return true;
        }
        
        // Stop crossing
        if (cmd.includes('done crossing') || cmd.includes('crossed') || 
            cmd.includes('stop crossing')) {
            this.stopCrossingMode();
            speechManager.speak('Crossing assistance ended.');
            return true;
        }
        
        // Traffic status
        if (cmd.includes('status') || cmd.includes('traffic') || 
            cmd.includes('safe to cross') || cmd.includes('is it safe')) {
            this.getTrafficStatus();
            return true;
        }
        
        // Traffic light
        if (cmd.includes('light') || cmd.includes('signal')) {
            if (this.lastAnalysis?.trafficSignals.detected) {
                const signal = this.lastAnalysis.trafficSignals;
                speechManager.speak(
                    `Traffic light is ${signal.color}. ${signal.action}`
                );
            } else {
                speechManager.speak('No traffic light detected.');
            }
            return true;
        }
        
        // Vehicles
        if (cmd.includes('vehicle') || cmd.includes('car')) {
            if (this.lastAnalysis?.vehicles.total > 0) {
                const v = this.lastAnalysis.vehicles;
                speechManager.speak(
                    `${v.total} vehicle${v.total > 1 ? 's' : ''} detected. ` +
                    `${v.approaching.length} approaching. ` +
                    `${v.estimatedGap.recommendation}`
                );
            } else {
                speechManager.speak('No vehicles detected.');
            }
            return true;
        }
        
        return false;
    }
}

// Export singleton instance
const trafficAnalysisMode = new TrafficAnalysisMode();
