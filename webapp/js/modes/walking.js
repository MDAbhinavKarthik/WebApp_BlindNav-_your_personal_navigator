/**
 * BlindNav+ Walking Mode - Enhanced
 * Continuous real-time guidance while walking with advanced obstacle detection
 * Features: Depth estimation, directional guidance, environment analysis
 */

class WalkingMode {
    constructor() {
        this.isActive = false;
        this.isPaused = false;
        this.frameProcessingActive = false;
        this.lastGuidanceTime = 0;
        this.guidanceInterval = 1500;
        this.stepCount = 0;
        this.sessionStartTime = null;
        
        // Walking state
        this.state = {
            currentPath: 'clear',
            lastObstacles: [],
            consecutiveClearFrames: 0,
            dangerLevel: 'safe',
            currentDirection: 'forward',
            environmentType: 'unknown',
            cameraOrientation: 'portrait',
            lastEnvironmentAnalysis: null
        };
        
        // Depth estimation configuration
        this.depthConfig = {
            enabled: true,
            zones: {
                danger: 1.5,    // meters - immediate stop
                warning: 3.0,   // meters - caution
                safe: 5.0       // meters - awareness only
            },
            objectSizeReference: {
                'person': { height: 1.7, width: 0.5 },
                'car': { height: 1.5, width: 1.8 },
                'bicycle': { height: 1.0, width: 0.6 },
                'motorcycle': { height: 1.1, width: 0.8 },
                'dog': { height: 0.5, width: 0.6 },
                'cat': { height: 0.3, width: 0.4 },
                'chair': { height: 0.8, width: 0.5 },
                'table': { height: 0.75, width: 1.0 },
                'bus': { height: 3.0, width: 2.5 },
                'truck': { height: 2.5, width: 2.0 },
                'bench': { height: 0.5, width: 1.5 },
                'fire hydrant': { height: 0.5, width: 0.3 },
                'traffic light': { height: 0.5, width: 0.3 },
                'stop sign': { height: 0.75, width: 0.75 }
            }
        };
        
        // Environment analysis settings
        this.environmentAnalysis = {
            enabled: true,
            lastAnalysisTime: 0,
            analysisInterval: 10000, // Analyze every 10 seconds
            currentEnvironment: null
        };
        
        // Directional guidance
        this.directionalGuidance = {
            zones: ['far-left', 'left', 'center-left', 'center', 'center-right', 'right', 'far-right'],
            lastSafeDirection: 'forward',
            consecutiveSameDirection: 0
        };
        
        // Detailed guidance settings
        this.settings = {
            detailedMode: true,
            hapticFeedback: true,
            continuousGuidance: true,
            dangerAlertRepeat: 500,
            speakDistanceInMeters: true,
            environmentAwareness: true
        };
    }
    
    /**
     * Start walking mode
     */
    async start() {
        if (this.isActive) {
            speechManager.speak('Walking mode is already active.', true);
            return;
        }
        
        this.isActive = true;
        this.isPaused = false;
        this.sessionStartTime = Date.now();
        this.stepCount = 0;
        
        console.log('[Walking] Mode started');
        
        // Check camera orientation
        this.checkCameraOrientation();
        
        // Welcome message
        const welcome = `Walking Mode activated. I will be your eyes and guide you step by step.
            
            How I'll help you:
            I announce obstacles with their distance in meters and direction.
            Stop means immediate danger. Caution means be careful.
            Clear means the path is safe.
            
            Voice commands:
            "what's ahead" - describe obstacles
            "pause" - pause guidance
            "resume" - continue
            "slower" or "faster" - adjust update speed
            "describe environment" - analyze surroundings
            "check orientation" - verify camera position
            "stop" or "exit" - end walking mode
            
            Starting guidance now. Walk carefully.`;
        
        speechManager.speak(welcome, true);
        
        // Update UI
        this.updateUI(true);
        
        // Start frame processing after welcome
        setTimeout(() => {
            if (this.isActive) {
                this.startFrameProcessing();
                // Initial environment analysis
                if (this.settings.environmentAwareness) {
                    this.analyzeEnvironment();
                }
            }
        }, 8000);
    }
    
    /**
     * Stop walking mode
     */
    stop() {
        if (!this.isActive) return;
        
        this.isActive = false;
        this.isPaused = false;
        this.frameProcessingActive = false;
        
        cameraManager.stopFrameProcessing();
        
        // Calculate session stats
        const duration = Math.round((Date.now() - this.sessionStartTime) / 1000);
        const minutes = Math.floor(duration / 60);
        const seconds = duration % 60;
        
        speechManager.speak(
            `Walking mode ended. You walked for ${minutes > 0 ? minutes + ' minutes and ' : ''}${seconds} seconds. ` +
            `Detected ${this.state.lastObstacles.length} obstacles during the session. Stay safe!`,
            true
        );
        
        // Reset state
        this.resetState();
        this.updateUI(false);
        console.log('[Walking] Mode stopped');
    }
    
    /**
     * Reset state to initial values
     */
    resetState() {
        this.state = {
            currentPath: 'clear',
            lastObstacles: [],
            consecutiveClearFrames: 0,
            dangerLevel: 'safe',
            currentDirection: 'forward',
            environmentType: 'unknown',
            cameraOrientation: 'portrait',
            lastEnvironmentAnalysis: null
        };
    }
    
    /**
     * Pause walking guidance
     */
    pause() {
        if (!this.isActive || this.isPaused) return;
        
        this.isPaused = true;
        cameraManager.stopFrameProcessing();
        speechManager.speak('Walking guidance paused. Say resume when ready.', true);
        
        if (Utils && Utils.hapticFeedback) {
            Utils.hapticFeedback('medium');
        }
    }
    
    /**
     * Resume walking guidance
     */
    resume() {
        if (!this.isActive || !this.isPaused) return;
        
        this.isPaused = false;
        speechManager.speak('Resuming walking guidance. Walk carefully.', true);
        
        setTimeout(() => {
            if (this.isActive && !this.isPaused) {
                this.startFrameProcessing();
            }
        }, 1500);
    }
    
    /**
     * Start frame processing - ENHANCED with Safety Analyzer
     */
    startFrameProcessing() {
        this.frameProcessingActive = true;
        
        // Initialize safety analyzer
        if (typeof navigationSafetyAnalyzer !== 'undefined') {
            navigationSafetyAnalyzer.initialize();
            console.log('[Walking] Safety analyzer integrated');
        }
        
        cameraManager.startFrameProcessing(async (frame) => {
            if (!this.isActive || this.isPaused || !this.frameProcessingActive) return;
            
            const detections = await detectionManager.detect(frame);
            
            // Draw detections
            if (frame.ctx) {
                frame.ctx.clearRect(0, 0, frame.width, frame.height);
                const sourceEl = cameraManager.sourceType === 'local' ? 
                    cameraManager.localVideoElement : cameraManager.imgElement;
                frame.ctx.drawImage(sourceEl, 0, 0);
                if (detections.length > 0) {
                    detectionManager.drawDetections(frame.ctx, detections);
                }
            }
            
            // Enhanced detection with depth estimation
            const enhancedDetections = this.enhanceDetectionsWithDepth(detections, frame);
            
            // *** NEW: Run comprehensive safety analysis ***
            let safetyAnalysis = null;
            if (typeof navigationSafetyAnalyzer !== 'undefined') {
                safetyAnalysis = await navigationSafetyAnalyzer.analyzeFrame(frame, enhancedDetections);
                
                // Process safety analysis results
                this.processSafetyAnalysis(safetyAnalysis, enhancedDetections);
            }
            
            // Process for walking guidance (existing logic)
            this.processWalkingGuidance(enhancedDetections, frame, safetyAnalysis);
            
            // Periodic environment analysis
            this.periodicEnvironmentCheck(enhancedDetections, frame);
        });
    }
    
    /**
     * Process safety analysis results from NavigationSafetyAnalyzer
     * Handles: steps, walls, holes, pathway analysis
     */
    processSafetyAnalysis(analysis, detections) {
        if (!analysis) return;
        
        const now = Date.now();
        
        // PRIORITY 1: Immediate dangers (holes, drop-offs)
        if (analysis.safety.level === 'danger') {
            if (now - this.lastGuidanceTime >= 300) {  // Quick repeat for danger
                speechManager.speak(analysis.voiceGuidance.immediate, true);
                this.lastGuidanceTime = now;
                
                if (Utils && Utils.hapticFeedback) {
                    Utils.hapticFeedback('error');
                }
            }
            return;
        }
        
        // PRIORITY 2: Steps detection
        if (analysis.steps.detected && analysis.steps.distance !== 'far') {
            if (!this.lastStepWarningTime || now - this.lastStepWarningTime > 3000) {
                speechManager.speak(analysis.steps.warning, true);
                this.lastStepWarningTime = now;
                
                if (Utils && Utils.hapticFeedback) {
                    Utils.hapticFeedback('warning');
                }
            }
        }
        
        // PRIORITY 3: Wall ahead
        if (analysis.walls.wallAhead && analysis.walls.wallAhead.confidence > 0.5) {
            if (!this.lastWallWarningTime || now - this.lastWallWarningTime > 4000) {
                speechManager.speak('Wall or large obstacle ahead. Change direction.', true);
                this.lastWallWarningTime = now;
            }
        }
        
        // PRIORITY 4: Hazards (holes, dark areas)
        if (analysis.hazards.detected && analysis.hazards.mostUrgent) {
            const hazard = analysis.hazards.mostUrgent;
            if (hazard.distance === 'close' || hazard.distance === 'immediate') {
                if (!this.lastHazardWarningTime || now - this.lastHazardWarningTime > 2000) {
                    speechManager.speak(hazard.warning, true);
                    this.lastHazardWarningTime = now;
                }
            }
        }
        
        // PRIORITY 5: Pathway guidance
        if (!analysis.pathway.clearPathExists) {
            if (!this.lastPathwayWarningTime || now - this.lastPathwayWarningTime > 5000) {
                speechManager.speak(analysis.pathway.pathDescription, false);
                this.lastPathwayWarningTime = now;
            }
        } else if (analysis.pathway.centerBlocked && analysis.pathway.recommendedPath !== 'center') {
            // Suggest alternative path
            if (!this.lastPathwayWarningTime || now - this.lastPathwayWarningTime > 5000) {
                speechManager.speak(analysis.pathway.pathDescription, false);
                this.lastPathwayWarningTime = now;
            }
        }
        
        // Store analysis for later use
        this.lastSafetyAnalysis = analysis;
    }
    
    /**
     * Enhance detections with depth estimation
     */
    enhanceDetectionsWithDepth(detections, frame) {
        return detections.map(det => {
            // Calculate multiple depth cues
            const depthEstimate = this.estimateDepth(det, frame);
            const directionInfo = this.calculateDirection(det, frame);
            
            return {
                ...det,
                ...depthEstimate,
                ...directionInfo
            };
        });
    }
    
    /**
     * Estimate depth/distance using multiple visual cues
     */
    estimateDepth(detection, frame) {
        const bbox = detection.bbox;
        const heightRatio = bbox.height / frame.height;
        const widthRatio = bbox.width / frame.width;
        const yBottom = (bbox.y + bbox.height) / frame.height; // Bottom of object
        const areaRatio = (bbox.height * bbox.width) / (frame.height * frame.width);
        
        let estimatedDistance;
        let confidence = 'medium';
        
        // Use reference object sizes if available
        const refSize = this.depthConfig.objectSizeReference[detection.class.toLowerCase()];
        
        if (refSize) {
            // Camera focal length approximation (adjust based on device)
            const focalLength = Math.min(frame.width, frame.height) * 0.8;
            const realHeightCm = refSize.height * 100;
            
            // Distance = (Real Height × Focal Length) / Pixel Height
            estimatedDistance = (realHeightCm * focalLength) / (bbox.height * 100);
            
            // Adjust for perspective (objects lower in frame are closer)
            const perspectiveAdjustment = 1 + (1 - yBottom) * 0.3;
            estimatedDistance *= perspectiveAdjustment;
            
            // Clamp to reasonable range
            estimatedDistance = Math.max(0.5, Math.min(estimatedDistance, 15));
            
            confidence = areaRatio > 0.1 ? 'high' : (areaRatio > 0.05 ? 'medium' : 'low');
        } else {
            // Generic estimation based on size
            if (heightRatio > 0.7) {
                estimatedDistance = 0.5;
                confidence = 'high';
            } else if (heightRatio > 0.5) {
                estimatedDistance = 1.0;
                confidence = 'high';
            } else if (heightRatio > 0.35) {
                estimatedDistance = 2.0;
            } else if (heightRatio > 0.2) {
                estimatedDistance = 3.5;
            } else if (heightRatio > 0.12) {
                estimatedDistance = 5.0;
            } else {
                estimatedDistance = 8.0;
                confidence = 'low';
            }
        }
        
        // Round to one decimal
        estimatedDistance = Math.round(estimatedDistance * 10) / 10;
        
        // Categorize danger level
        let dangerLevel;
        if (estimatedDistance <= this.depthConfig.zones.danger) {
            dangerLevel = 'danger';
        } else if (estimatedDistance <= this.depthConfig.zones.warning) {
            dangerLevel = 'warning';
        } else {
            dangerLevel = 'safe';
        }
        
        return {
            estimatedDistance,
            distanceMeters: estimatedDistance,
            dangerLevel,
            depthConfidence: confidence,
            distanceCategory: this.getDistanceCategory(estimatedDistance)
        };
    }
    
    /**
     * Get verbal distance category
     */
    getDistanceCategory(meters) {
        if (meters <= 1) return 'immediate';
        if (meters <= 2) return 'very close';
        if (meters <= 3) return 'close';
        if (meters <= 5) return 'nearby';
        return 'far';
    }
    
    /**
     * Calculate precise direction of object
     */
    calculateDirection(detection, frame) {
        const centerX = detection.center.x;
        const frameWidth = frame.width;
        
        // Divide frame into 7 zones for precise guidance
        const zoneWidth = frameWidth / 7;
        const zoneIndex = Math.min(6, Math.floor(centerX / zoneWidth));
        
        const zones = this.directionalGuidance.zones;
        const preciseDirection = zones[zoneIndex];
        
        // Simple direction (left/center/right)
        let simpleDirection;
        if (zoneIndex <= 1) {
            simpleDirection = 'left';
        } else if (zoneIndex >= 5) {
            simpleDirection = 'right';
        } else {
            simpleDirection = 'center';
        }
        
        // Calculate angle from center
        const offset = (centerX - frameWidth / 2) / (frameWidth / 2);
        const angle = Math.round(offset * 45); // -45 to +45 degrees
        
        return {
            preciseDirection,
            simpleDirection,
            angleFromCenter: angle,
            position: simpleDirection // Keep compatibility
        };
    }
    
    /**
     * Process detections for walking guidance - ENHANCED with safety analysis
     */
    processWalkingGuidance(detections, frame, safetyAnalysis = null) {
        const now = Date.now();
        
        // Store for later reference
        this.state.lastObstacles = detections;
        
        // If safety analysis already handled immediate dangers, skip redundant checks
        if (safetyAnalysis && safetyAnalysis.safety.level === 'danger') {
            return;  // Already handled in processSafetyAnalysis
        }
        
        // Assess danger from object detections
        const dangerInfo = this.assessDangerLevel(detections);
        
        // Combine with safety analysis if available
        if (safetyAnalysis) {
            // Enhance danger info with scene analysis
            if (safetyAnalysis.steps.detected && safetyAnalysis.steps.distance === 'close') {
                dangerInfo.hasSteps = true;
                dangerInfo.stepsInfo = safetyAnalysis.steps;
            }
            if (safetyAnalysis.pathway.centerBlocked) {
                dangerInfo.pathwayBlocked = true;
                dangerInfo.suggestedPath = safetyAnalysis.pathway.recommendedPath;
            }
        }
        
        // Immediate danger - alert immediately
        if (dangerInfo.level === 'danger') {
            if (now - this.lastGuidanceTime >= this.settings.dangerAlertRepeat) {
                this.announceImmediateDanger(dangerInfo);
                this.lastGuidanceTime = now;
                
                if (Utils && Utils.hapticFeedback) {
                    Utils.hapticFeedback('error');
                }
            }
            return;
        }
        
        // Regular guidance timing
        if (now - this.lastGuidanceTime < this.guidanceInterval) {
            return;
        }
        
        this.lastGuidanceTime = now;
        
        if (dangerInfo.level === 'caution') {
            this.announceCaution(dangerInfo);
            if (Utils && Utils.hapticFeedback) {
                Utils.hapticFeedback('warning');
            }
        } else {
            // Path is clear
            this.state.consecutiveClearFrames++;
            
            if (this.state.consecutiveClearFrames >= 3) {
                // Generate guidance with scene context
                let guidance = this.generateClearPathGuidance();
                
                // Add scene context if available
                if (safetyAnalysis) {
                    const scene = safetyAnalysis.scene;
                    if (scene.foreground?.classification?.type === 'ground') {
                        const groundType = scene.foreground.classification.subtype;
                        if (groundType && groundType !== 'unknown') {
                            guidance += ` Walking on ${groundType}.`;
                        }
                    }
                }
                
                speechManager.speak(guidance, false, 0.5);
                this.state.consecutiveClearFrames = 0;
            }
        }
        
        // Update UI
        this.updateDetectionDisplay(detections, dangerInfo);
    }
    
    /**
     * Assess danger level from detections
     */
    assessDangerLevel(detections) {
        const obstacleClasses = [
            'person', 'car', 'bicycle', 'motorcycle', 'dog', 'cat',
            'chair', 'table', 'bench', 'fire hydrant', 'stop sign', 
            'parking meter', 'bus', 'truck', 'horse', 'skateboard',
            'potted plant', 'suitcase', 'backpack'
        ];
        
        const obstacles = detections.filter(d => 
            obstacleClasses.includes(d.class.toLowerCase())
        );
        
        if (obstacles.length === 0) {
            return { level: 'safe', obstacles: [] };
        }
        
        // Check for immediate danger
        const dangerZone = obstacles.filter(o => 
            o.estimatedDistance <= this.depthConfig.zones.danger &&
            (o.simpleDirection === 'center' || o.preciseDirection.includes('center'))
        );
        
        if (dangerZone.length > 0) {
            return {
                level: 'danger',
                obstacles: dangerZone,
                message: this.buildDangerMessage(dangerZone),
                safeDirection: this.findSafeDirection(obstacles)
            };
        }
        
        // Check for caution zone
        const cautionZone = obstacles.filter(o => 
            o.estimatedDistance <= this.depthConfig.zones.warning
        );
        
        if (cautionZone.length > 0) {
            return {
                level: 'caution',
                obstacles: cautionZone,
                message: this.buildCautionMessage(cautionZone),
                safeDirection: this.findSafeDirection(obstacles)
            };
        }
        
        // General awareness
        return {
            level: 'awareness',
            obstacles: obstacles,
            message: this.buildAwarenessMessage(obstacles),
            safeDirection: 'forward'
        };
    }
    
    /**
     * Find the safest direction to move
     */
    findSafeDirection(obstacles) {
        const zones = {
            'far-left': { clear: true, minDistance: Infinity },
            'left': { clear: true, minDistance: Infinity },
            'center-left': { clear: true, minDistance: Infinity },
            'center': { clear: true, minDistance: Infinity },
            'center-right': { clear: true, minDistance: Infinity },
            'right': { clear: true, minDistance: Infinity },
            'far-right': { clear: true, minDistance: Infinity }
        };
        
        // Map obstacles to zones
        obstacles.forEach(o => {
            const zone = o.preciseDirection;
            if (zones[zone]) {
                if (o.estimatedDistance <= this.depthConfig.zones.warning) {
                    zones[zone].clear = false;
                }
                zones[zone].minDistance = Math.min(zones[zone].minDistance, o.estimatedDistance);
            }
        });
        
        // Find clearest direction, preferring center
        const preferenceOrder = ['center', 'center-left', 'center-right', 'left', 'right', 'far-left', 'far-right'];
        
        for (const zone of preferenceOrder) {
            if (zones[zone].clear) {
                if (zone.includes('left')) return 'left';
                if (zone.includes('right')) return 'right';
                return 'forward';
            }
        }
        
        // If nothing is clear, suggest the direction with most space
        let maxDistance = 0;
        let bestDirection = 'stop';
        
        for (const [zone, info] of Object.entries(zones)) {
            if (info.minDistance > maxDistance) {
                maxDistance = info.minDistance;
                if (zone.includes('left')) bestDirection = 'left';
                else if (zone.includes('right')) bestDirection = 'right';
                else bestDirection = 'forward';
            }
        }
        
        return maxDistance < 1 ? 'stop' : bestDirection;
    }
    
    /**
     * Build danger message
     */
    buildDangerMessage(obstacles) {
        const closest = obstacles.sort((a, b) => a.estimatedDistance - b.estimatedDistance)[0];
        const dist = closest.estimatedDistance;
        
        let message = `Stop! ${closest.class} ${dist < 1 ? 'directly ahead' : `${dist} meters ahead`}!`;
        
        return message;
    }
    
    /**
     * Build caution message
     */
    buildCautionMessage(obstacles) {
        const sorted = obstacles.sort((a, b) => a.estimatedDistance - b.estimatedDistance);
        const descriptions = sorted.slice(0, 2).map(o => {
            const direction = o.simpleDirection === 'center' ? 'ahead' : `on your ${o.simpleDirection}`;
            return `${o.class} ${o.estimatedDistance} meters ${direction}`;
        });
        
        return `Caution. ${descriptions.join('. ')}.`;
    }
    
    /**
     * Build awareness message
     */
    buildAwarenessMessage(obstacles) {
        const grouped = {};
        obstacles.slice(0, 3).forEach(o => {
            const dir = o.simpleDirection === 'center' ? 'ahead' : o.simpleDirection;
            if (!grouped[dir]) grouped[dir] = [];
            grouped[dir].push(o.class);
        });
        
        const parts = Object.entries(grouped).map(([dir, items]) => 
            `${items.join(' and ')} ${dir}`
        );
        
        return parts.join('. ') + '. Path is passable.';
    }
    
    /**
     * Generate clear path guidance
     */
    generateClearPathGuidance() {
        const variations = [
            'Path is clear. Continue walking.',
            'All clear ahead.',
            'Clear path. Keep going.',
            'No obstacles detected. Continue forward.'
        ];
        
        return variations[Math.floor(Math.random() * variations.length)];
    }
    
    /**
     * Announce immediate danger
     */
    announceImmediateDanger(dangerInfo) {
        let message = dangerInfo.message;
        
        if (dangerInfo.safeDirection && dangerInfo.safeDirection !== 'stop') {
            message += ` Move ${dangerInfo.safeDirection}!`;
        } else if (dangerInfo.safeDirection === 'stop') {
            message += ' Wait for path to clear!';
        }
        
        speechManager.speak(message, true, 2);
        this.state.dangerLevel = 'danger';
        this.state.consecutiveClearFrames = 0;
    }
    
    /**
     * Announce caution
     */
    announceCaution(dangerInfo) {
        let message = dangerInfo.message;
        
        if (dangerInfo.safeDirection && dangerInfo.safeDirection !== 'forward') {
            message += ` Consider moving ${dangerInfo.safeDirection}.`;
        }
        
        speechManager.speak(message, false, 1);
        this.state.dangerLevel = 'caution';
        this.state.consecutiveClearFrames = 0;
    }
    
    /**
     * Periodic environment analysis
     */
    periodicEnvironmentCheck(detections, frame) {
        const now = Date.now();
        
        if (!this.settings.environmentAwareness) return;
        if (now - this.environmentAnalysis.lastAnalysisTime < this.environmentAnalysis.analysisInterval) return;
        
        this.environmentAnalysis.lastAnalysisTime = now;
        this.analyzeEnvironment(detections);
    }
    
    /**
     * Analyze environment type
     */
    async analyzeEnvironment(detections = []) {
        const analysis = {
            timestamp: Date.now(),
            type: 'unknown',
            characteristics: [],
            safety: 'normal'
        };
        
        // Analyze based on detected objects
        const objectTypes = detections.map(d => d.class.toLowerCase());
        
        // Indoor indicators
        const indoorObjects = ['chair', 'couch', 'bed', 'dining table', 'tv', 'laptop', 'potted plant'];
        const indoorCount = objectTypes.filter(t => indoorObjects.includes(t)).length;
        
        // Outdoor indicators
        const outdoorObjects = ['car', 'truck', 'bus', 'bicycle', 'motorcycle', 'traffic light', 'stop sign', 'fire hydrant'];
        const outdoorCount = objectTypes.filter(t => outdoorObjects.includes(t)).length;
        
        // Street indicators
        const streetObjects = ['car', 'bus', 'truck', 'traffic light', 'stop sign'];
        const streetCount = objectTypes.filter(t => streetObjects.includes(t)).length;
        
        // Determine environment type
        if (streetCount >= 2) {
            analysis.type = 'street';
            analysis.characteristics.push('vehicles present');
            analysis.safety = 'caution';
        } else if (outdoorCount > indoorCount) {
            analysis.type = 'outdoor';
            analysis.characteristics.push('outdoor environment');
        } else if (indoorCount > 0) {
            analysis.type = 'indoor';
            analysis.characteristics.push('indoor environment');
        }
        
        // Check GPS accuracy if available
        if (navigationService && navigationService.currentLocation) {
            const accuracy = navigationService.currentLocation.accuracy;
            if (accuracy > 50) {
                analysis.characteristics.push('GPS signal weak - likely indoors');
                analysis.type = 'indoor';
            }
        }
        
        this.state.lastEnvironmentAnalysis = analysis;
        this.state.environmentType = analysis.type;
        
        // Announce if environment changed
        if (this.environmentAnalysis.currentEnvironment !== analysis.type && analysis.type !== 'unknown') {
            if (analysis.type === 'street') {
                speechManager.speak('Attention: Street environment detected. Watch for vehicles.', true);
            } else if (analysis.type === 'indoor') {
                speechManager.speak('You appear to be indoors.', false, 0.5);
            }
            this.environmentAnalysis.currentEnvironment = analysis.type;
        }
        
        return analysis;
    }
    
    /**
     * Check camera orientation
     */
    checkCameraOrientation() {
        const isLandscape = window.innerWidth > window.innerHeight;
        const deviceOrientation = screen.orientation?.type || 'unknown';
        
        this.state.cameraOrientation = isLandscape ? 'landscape' : 'portrait';
        
        // Portrait mode is recommended for walking
        if (isLandscape) {
            speechManager.speak('Tip: Rotate your phone to portrait mode for better obstacle detection while walking.', true);
        }
        
        return {
            orientation: this.state.cameraOrientation,
            recommendation: isLandscape ? 'Use portrait mode' : 'Good orientation'
        };
    }
    
    /**
     * Describe current scene (360° awareness)
     */
    async describeScene() {
        const detections = this.state.lastObstacles;
        
        if (!detections || detections.length === 0) {
            speechManager.speak('The area around you appears clear. No obstacles detected.', true);
            return;
        }
        
        // Group by direction
        const byDirection = { left: [], center: [], right: [] };
        
        detections.forEach(d => {
            const dir = d.simpleDirection;
            if (byDirection[dir]) {
                byDirection[dir].push(d);
            }
        });
        
        let description = [];
        
        // Describe each direction
        for (const [dir, items] of Object.entries(byDirection)) {
            if (items.length === 0) continue;
            
            const sorted = items.sort((a, b) => a.estimatedDistance - b.estimatedDistance);
            const dirName = dir === 'center' ? 'Ahead' : `To your ${dir}`;
            
            const itemDescriptions = sorted.slice(0, 2).map(i => 
                `${i.class} at ${i.estimatedDistance} meters`
            );
            
            description.push(`${dirName}: ${itemDescriptions.join(', ')}`);
        }
        
        // Add environment info
        if (this.state.lastEnvironmentAnalysis) {
            description.push(`Environment: ${this.state.lastEnvironmentAnalysis.type}`);
        }
        
        speechManager.speak(description.join('. ') + '.', true);
    }
    
    /**
     * Handle voice command
     */
    handleVoiceCommand(command) {
        const cmd = command.toLowerCase();
        
        if (cmd.includes('pause')) {
            this.pause();
            return true;
        }
        
        if (cmd.includes('resume') || cmd.includes('continue')) {
            this.resume();
            return true;
        }
        
        if (cmd.includes('what') && cmd.includes('ahead')) {
            this.describeAhead();
            return true;
        }
        
        if (cmd.includes('describe') || cmd.includes('scene') || cmd.includes('around')) {
            this.describeScene();
            return true;
        }
        
        if (cmd.includes('environment') || cmd.includes('where am i')) {
            this.announceEnvironment();
            return true;
        }
        
        if (cmd.includes('orientation') || cmd.includes('camera')) {
            this.checkCameraOrientation();
            return true;
        }
        
        if (cmd.includes('slow down') || cmd.includes('slower')) {
            this.guidanceInterval = Math.min(3000, this.guidanceInterval + 500);
            speechManager.speak('Slowing down guidance updates.', true);
            return true;
        }
        
        if (cmd.includes('speed up') || cmd.includes('faster')) {
            this.guidanceInterval = Math.max(500, this.guidanceInterval - 500);
            speechManager.speak('Speeding up guidance updates.', true);
            return true;
        }
        
        if (cmd.includes('stop') || cmd.includes('exit') || cmd.includes('quit')) {
            this.stop();
            return true;
        }
        
        return false;
    }
    
    /**
     * Describe what's ahead
     */
    describeAhead() {
        const detections = this.state.lastObstacles;
        
        if (!detections || detections.length === 0) {
            speechManager.speak('The path ahead appears clear.', true);
            return;
        }
        
        const sorted = detections.sort((a, b) => a.estimatedDistance - b.estimatedDistance);
        const descriptions = sorted.slice(0, 3).map(d => {
            const dir = d.simpleDirection === 'center' ? 'ahead' : `on your ${d.simpleDirection}`;
            return `${d.class} ${d.estimatedDistance} meters ${dir}`;
        });
        
        speechManager.speak(`Ahead of you: ${descriptions.join(', ')}.`, true);
    }
    
    /**
     * Announce current environment
     */
    announceEnvironment() {
        const env = this.state.lastEnvironmentAnalysis;
        
        if (env) {
            let announcement = `You appear to be in a ${env.type} environment.`;
            if (env.characteristics.length > 0) {
                announcement += ` ${env.characteristics.join('. ')}.`;
            }
            if (env.safety === 'caution') {
                announcement += ' Please be extra careful.';
            }
            speechManager.speak(announcement, true);
        } else {
            speechManager.speak('Environment analysis not yet available. Please wait a moment.', true);
        }
    }
    
    /**
     * Update UI
     */
    updateUI(active) {
        const modeContent = document.getElementById('mode-content');
        if (!modeContent) return;
        
        if (active) {
            modeContent.innerHTML = `
                <div class="walking-display">
                    <div class="walking-status">
                        <span class="walking-icon">🚶</span>
                        <span class="walking-text">Walking Mode Active</span>
                    </div>
                    <div class="environment-info" id="environment-info">
                        Environment: Analyzing...
                    </div>
                    <div class="danger-indicator" id="danger-indicator">
                        <span class="indicator safe">✓ Safe</span>
                    </div>
                    <div class="direction-guide" id="direction-guide">
                        <div class="direction-zones">
                            <span class="zone left" id="zone-left">←</span>
                            <span class="zone center" id="zone-center">↑</span>
                            <span class="zone right" id="zone-right">→</span>
                        </div>
                    </div>
                    <div class="walking-stats">
                        <span id="walk-time">Time: 0:00</span>
                        <span id="walk-obstacles">Detected: 0</span>
                    </div>
                    <div class="current-guidance" id="current-guidance">
                        <p>Starting obstacle detection...</p>
                    </div>
                    <div class="quick-actions">
                        <button class="quick-btn" data-action="describe">👁️ Describe</button>
                        <button class="quick-btn" data-action="pause">⏸️ Pause</button>
                        <button class="quick-btn" data-action="environment">🌍 Environment</button>
                    </div>
                </div>
            `;
            
            // Attach listeners
            this.attachQuickActionListeners();
            this.startTimeUpdate();
            
        } else {
            modeContent.innerHTML = '';
        }
    }
    
    /**
     * Attach quick action listeners
     */
    attachQuickActionListeners() {
        document.querySelectorAll('.walking-display .quick-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const action = btn.dataset.action;
                switch(action) {
                    case 'describe':
                        this.describeScene();
                        break;
                    case 'pause':
                        if (this.isPaused) {
                            this.resume();
                            btn.textContent = '⏸️ Pause';
                        } else {
                            this.pause();
                            btn.textContent = '▶️ Resume';
                        }
                        break;
                    case 'environment':
                        this.announceEnvironment();
                        break;
                }
            });
        });
    }
    
    /**
     * Update detection display
     */
    updateDetectionDisplay(detections, dangerInfo) {
        // Update danger indicator
        const indicator = document.getElementById('danger-indicator');
        if (indicator) {
            let html = '';
            switch(dangerInfo.level) {
                case 'danger':
                    html = '<span class="indicator danger">⚠️ DANGER</span>';
                    break;
                case 'caution':
                    html = '<span class="indicator caution">⚡ Caution</span>';
                    break;
                default:
                    html = '<span class="indicator safe">✓ Clear</span>';
            }
            indicator.innerHTML = html;
        }
        
        // Update direction zones
        const zones = { left: [], center: [], right: [] };
        detections.forEach(d => {
            if (zones[d.simpleDirection]) {
                zones[d.simpleDirection].push(d);
            }
        });
        
        ['left', 'center', 'right'].forEach(dir => {
            const el = document.getElementById(`zone-${dir}`);
            if (el) {
                const hasObstacle = zones[dir].some(o => o.estimatedDistance < 3);
                el.className = `zone ${dir} ${hasObstacle ? 'blocked' : 'clear'}`;
            }
        });
        
        // Update guidance text
        const guidanceEl = document.getElementById('current-guidance');
        if (guidanceEl && dangerInfo.message) {
            guidanceEl.innerHTML = `<p>${dangerInfo.message}</p>`;
        }
        
        // Update environment
        const envEl = document.getElementById('environment-info');
        if (envEl && this.state.lastEnvironmentAnalysis) {
            envEl.textContent = `Environment: ${this.state.lastEnvironmentAnalysis.type || 'unknown'}`;
        }
        
        // Update obstacle count
        const obsEl = document.getElementById('walk-obstacles');
        if (obsEl) {
            obsEl.textContent = `Detected: ${detections.length}`;
        }
    }
    
    /**
     * Start time update
     */
    startTimeUpdate() {
        const updateTime = () => {
            if (!this.isActive) return;
            
            const elapsed = Math.floor((Date.now() - this.sessionStartTime) / 1000);
            const minutes = Math.floor(elapsed / 60);
            const seconds = elapsed % 60;
            
            const timeEl = document.getElementById('walk-time');
            if (timeEl) {
                timeEl.textContent = `Time: ${minutes}:${seconds.toString().padStart(2, '0')}`;
            }
            
            requestAnimationFrame(updateTime);
        };
        
        updateTime();
    }
}

// Create global instance
const walkingMode = new WalkingMode();
