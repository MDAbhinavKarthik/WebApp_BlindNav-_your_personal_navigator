/**
 * BlindNav+ Navigation Mode - Enhanced
 * Real-time GPS navigation with turn-by-turn voice guidance
 * Supports outdoor, indoor, and smart camera navigation
 */

class NavigationMode {
    constructor() {
        this.isActive = false;
        this.destination = null;
        this.lastGuidance = '';
        this.lastGuidanceTime = 0;
        this.guidanceInterval = 2000;
        this.frameProcessingActive = false;
        
        // Navigation mode types
        this.navigationType = 'smart'; // 'outdoor', 'indoor', 'smart'
        
        // Navigation state
        this.state = {
            currentDirection: 'forward',
            obstaclesDetected: [],
            pathHistory: [],
            startTime: null,
            currentRoute: null,
            currentStep: 0,
            environment: 'unknown'
        };
        
        // Guidance settings
        this.settings = {
            speakObstacles: true,
            speakClearPath: true,
            detailedGuidance: true,
            clearPathInterval: 5000,
            turnAnnouncementDistance: 20,
            arrivalThreshold: 10
        };
        
        this.lastClearPathTime = 0;
        this.lastDistanceAnnouncement = 0;
        this.distanceAnnouncementInterval = 30000;
        
        // Depth estimation from visual cues
        this.depthEstimation = {
            enabled: true,
            lastEstimates: [],
            calibrationFactor: 1.0
        };
    }
    
    /**
     * Start navigation mode
     * @param {string} destinationQuery - Destination name or address
     * @param {string} type - Navigation type: 'outdoor', 'indoor', 'smart'
     */
    async start(destinationQuery = null, type = 'smart') {
        if (this.isActive) {
            speechManager.speak('Navigation is already active.', true);
            return;
        }
        
        this.isActive = true;
        this.navigationType = type;
        this.state.startTime = Date.now();
        
        console.log('[Navigation] Mode started, type:', type);
        
        // Announce start based on type
        let announcement = '';
        
        switch(type) {
            case 'outdoor':
                announcement = 'Outdoor Navigation Mode activated. ';
                break;
            case 'indoor':
                announcement = 'Indoor Navigation Mode activated. I will guide you using camera detection. ';
                break;
            case 'smart':
            default:
                announcement = 'Smart Navigation Mode activated. I will automatically detect if you are indoors or outdoors. ';
                break;
        }
        
        // Update UI first
        this.updateUI(true);
        
        // If destination provided, start GPS navigation
        if (destinationQuery) {
            announcement += `Searching for ${destinationQuery}. Please wait.`;
            speechManager.speak(announcement, true);
            
            await this.setDestination(destinationQuery);
        } else {
            announcement += 'Say "navigate to" followed by your destination, or say "explore" for real-time obstacle guidance. ';
            announcement += 'Voice commands: "where am I", "find bus stop", "describe surroundings", "stop navigation".';
            speechManager.speak(announcement, true);
            
            // Start obstacle detection immediately
            setTimeout(() => {
                if (this.isActive) {
                    this.startEnvironmentDetection();
                }
            }, 3000);
        }
    }
    
    /**
     * Set navigation destination
     * @param {string} query - Destination search query
     */
    async setDestination(query) {
        try {
            speechManager.speak('Searching for your destination...', true);
            
            // Search for the place
            const results = await navigationService.searchPlace(query);
            
            if (!results || results.length === 0) {
                speechManager.speak(`I could not find ${query}. Please try a different destination.`, true);
                return;
            }
            
            const dest = results[0];
            this.destination = {
                name: query,
                latitude: dest.latitude,
                longitude: dest.longitude
            };
            
            // Calculate route
            speechManager.speak(`Found ${dest.name.split(',')[0]}. Calculating walking route...`, true);
            
            await this.startTurnByTurnNavigation();
            
        } catch (error) {
            console.error('[Navigation] Destination error:', error);
            speechManager.speak('I had trouble finding that destination. Please try again or check your internet connection.', true);
        }
    }
    
    /**
     * Start GPS turn-by-turn navigation
     */
    async startTurnByTurnNavigation() {
        if (!this.destination) {
            speechManager.speak('No destination set. Say "navigate to" followed by your destination.', true);
            return;
        }
        
        try {
            // Get current location
            speechManager.speak('Getting your current location...', true);
            const currentLoc = await navigationService.getCurrentLocation();
            
            // Calculate route
            const route = await navigationService.calculateRoute(currentLoc, this.destination);
            
            if (!route || route.steps.length === 0) {
                speechManager.speak('Could not calculate a route. Please try a different destination.', true);
                return;
            }
            
            this.state.currentRoute = route;
            this.state.currentStep = 0;
            
            // Announce route overview
            const distanceText = navigationService.formatDistance(route.distance);
            const durationMins = Math.round(route.duration / 60);
            
            speechManager.speak(
                `Route found! Total distance: ${distanceText}. ` +
                `Estimated walking time: ${durationMins} minutes. ` +
                `Starting navigation now. ${route.steps[0].instruction}`,
                true
            );
            
            // Start real-time navigation with combined GPS + camera
            navigationService.onNavigationStep = (stepInfo) => this.handleNavigationStep(stepInfo);
            navigationService.onRouteUpdate = (update) => this.handleRouteUpdate(update);
            
            await navigationService.startRealtimeNavigation(this.destination, (stepInfo) => {
                this.handleNavigationStep(stepInfo);
            });
            
            // Also start camera-based obstacle detection
            this.startFrameProcessing();
            
            this.updateRouteDisplay();
            
        } catch (error) {
            console.error('[Navigation] Route error:', error);
            speechManager.speak(error.message || 'Could not start navigation. Please ensure GPS is enabled.', true);
        }
    }
    
    /**
     * Handle navigation step updates from GPS
     */
    handleNavigationStep(stepInfo) {
        if (!this.isActive) return;
        
        switch(stepInfo.type) {
            case 'start':
                break;
                
            case 'step':
                speechManager.speak(stepInfo.step.instruction, true);
                this.state.currentStep++;
                this.updateRouteDisplay();
                
                if (Utils && Utils.hapticFeedback) {
                    Utils.hapticFeedback('medium');
                }
                break;
                
            case 'arrived':
                speechManager.speak('You have arrived at your destination! Navigation complete.', true);
                if (Utils && Utils.hapticFeedback) {
                    Utils.hapticFeedback('success');
                }
                this.destination = null;
                this.state.currentRoute = null;
                break;
                
            case 'cancelled':
                speechManager.speak('Navigation cancelled.', true);
                break;
        }
    }
    
    /**
     * Handle route updates (distance updates, etc.)
     */
    handleRouteUpdate(update) {
        if (!this.isActive) return;
        
        const now = Date.now();
        
        if (now - this.lastDistanceAnnouncement > this.distanceAnnouncementInterval) {
            const distText = navigationService.formatDistance(update.distanceToDestination);
            speechManager.speak(`${distText} remaining to your destination.`, false, 0.5);
            this.lastDistanceAnnouncement = now;
        }
        
        this.updateRouteDisplay(update);
    }
    
    /**
     * Start environment detection (indoor/outdoor)
     */
    async startEnvironmentDetection() {
        if (this.navigationType === 'smart') {
            try {
                const envInfo = await navigationService.detectEnvironment();
                this.state.environment = envInfo.environment;
                
                if (envInfo.environment === 'indoor') {
                    speechManager.speak('It appears you are indoors. I will rely on camera guidance.', true);
                } else if (envInfo.environment === 'outdoor') {
                    speechManager.speak('You appear to be outdoors. GPS navigation is available.', true);
                }
            } catch (e) {
                console.log('[Navigation] Environment detection failed:', e);
            }
        }
        
        this.startFrameProcessing();
    }
    
    /**
     * Stop navigation mode
     */
    stop() {
        if (!this.isActive) return;
        
        this.isActive = false;
        this.frameProcessingActive = false;
        
        cameraManager.stopFrameProcessing();
        navigationService.stopNavigation('cancelled');
        navigationService.stopLocationTracking();
        
        const duration = Math.round((Date.now() - this.state.startTime) / 1000);
        const minutes = Math.floor(duration / 60);
        const seconds = duration % 60;
        
        speechManager.speak(
            `Navigation stopped. Session lasted ${minutes > 0 ? minutes + ' minutes and ' : ''}${seconds} seconds. Stay safe!`
        );
        
        this.state = {
            currentDirection: 'forward',
            obstaclesDetected: [],
            pathHistory: [],
            startTime: null,
            currentRoute: null,
            currentStep: 0,
            environment: 'unknown'
        };
        
        this.destination = null;
        this.updateUI(false);
        
        console.log('[Navigation] Mode stopped');
    }
    
    /**
     * Start frame processing for obstacle detection - ENHANCED with Safety Analyzer
     */
    startFrameProcessing() {
        this.frameProcessingActive = true;
        
        // Initialize safety analyzer
        if (typeof navigationSafetyAnalyzer !== 'undefined') {
            navigationSafetyAnalyzer.initialize();
            console.log('[Navigation] Safety analyzer integrated');
        }
        
        cameraManager.startFrameProcessing(async (frame) => {
            if (!this.isActive || !this.frameProcessingActive) return;
            
            const detections = await detectionManager.detect(frame);
            
            if (frame.ctx && detections.length > 0) {
                frame.ctx.clearRect(0, 0, frame.width, frame.height);
                const sourceEl = cameraManager.sourceType === 'local' ? 
                    cameraManager.localVideoElement : cameraManager.imgElement;
                frame.ctx.drawImage(sourceEl, 0, 0);
                detectionManager.drawDetections(frame.ctx, detections);
            }
            
            const enhancedDetections = this.estimateDepths(detections, frame);
            
            // *** NEW: Run comprehensive safety analysis ***
            let safetyAnalysis = null;
            if (typeof navigationSafetyAnalyzer !== 'undefined') {
                safetyAnalysis = await navigationSafetyAnalyzer.analyzeFrame(frame, enhancedDetections);
                
                // Process safety-specific guidance
                this.processSafetyGuidance(safetyAnalysis);
            }
            
            // Process regular navigation guidance
            this.processNavigationGuidance(enhancedDetections, safetyAnalysis);
        });
    }
    
    /**
     * Process safety analysis for navigation
     * Handles: steps, walls, holes, clear pathways, ground type
     */
    processSafetyGuidance(analysis) {
        if (!analysis) return;
        
        const now = Date.now();
        
        // CRITICAL: Steps detection (climbing up / stepping down)
        if (analysis.steps.detected) {
            if (!this.lastStepWarning || now - this.lastStepWarning > 3000) {
                if (analysis.steps.distance === 'immediate' || analysis.steps.distance === 'close') {
                    speechManager.speak(analysis.steps.warning, true);
                    this.lastStepWarning = now;
                    
                    if (Utils && Utils.hapticFeedback) {
                        Utils.hapticFeedback('warning');
                    }
                }
            }
        }
        
        // CRITICAL: Hazards (holes, drop-offs, dark areas)
        if (analysis.hazards.detected && analysis.hazards.mostUrgent) {
            const hazard = analysis.hazards.mostUrgent;
            if (!this.lastHazardWarning || now - this.lastHazardWarning > 2500) {
                if (hazard.distance === 'immediate') {
                    speechManager.speak('Stop! ' + hazard.warning, true);
                    this.lastHazardWarning = now;
                    if (Utils && Utils.hapticFeedback) {
                        Utils.hapticFeedback('error');
                    }
                } else if (hazard.distance === 'close') {
                    speechManager.speak(hazard.warning, true);
                    this.lastHazardWarning = now;
                }
            }
        }
        
        // Wall detection
        if (analysis.walls.wallAhead && analysis.walls.wallAhead.confidence > 0.6) {
            if (!this.lastWallWarning || now - this.lastWallWarning > 4000) {
                speechManager.speak('Wall or obstacle ahead. Consider changing direction.', true);
                this.lastWallWarning = now;
            }
        }
        
        // Pathway analysis - guide user to clear path
        if (analysis.pathway.centerBlocked && analysis.pathway.clearPathExists) {
            if (!this.lastPathwayGuidance || now - this.lastPathwayGuidance > 5000) {
                speechManager.speak(analysis.pathway.pathDescription, false);
                this.lastPathwayGuidance = now;
            }
        } else if (!analysis.pathway.clearPathExists) {
            if (!this.lastPathwayGuidance || now - this.lastPathwayGuidance > 3000) {
                speechManager.speak('Path appears blocked. Stop and reassess.', true);
                this.lastPathwayGuidance = now;
            }
        }
        
        // Scene context (indoor/outdoor, ground type)
        if (analysis.scene && !this.lastSceneAnnouncement || now - this.lastSceneAnnouncement > 15000) {
            const skyRegion = analysis.scene.sky;
            const groundRegion = analysis.scene.foreground;
            
            // Detect if outdoor (sky visible)
            if (skyRegion?.classification?.type === 'sky' && this.state.environment !== 'outdoor') {
                this.state.environment = 'outdoor';
                speechManager.speak('Outdoor environment detected.', false, 0.3);
                this.lastSceneAnnouncement = now;
            }
            // Detect ground type
            else if (groundRegion?.classification?.subtype && groundRegion.classification.subtype !== 'unknown') {
                const groundType = groundRegion.classification.subtype;
                if (this.lastGroundType !== groundType) {
                    this.lastGroundType = groundType;
                    // Announce significant ground changes
                    if (['grass', 'asphalt', 'concrete', 'tiles'].includes(groundType)) {
                        speechManager.speak(`Now on ${groundType}.`, false, 0.3);
                    }
                }
            }
        }
    }
    
    /**
     * Estimate depth/distance for detected objects using visual cues
     */
    estimateDepths(detections, frame) {
        return detections.map(det => {
            const heightRatio = det.bbox.height / frame.height;
            const widthRatio = det.bbox.width / frame.width;
            const areaRatio = (det.bbox.height * det.bbox.width) / (frame.height * frame.width);
            const yPosition = (det.bbox.y + det.bbox.height) / frame.height;
            
            let estimatedMeters;
            
            const objectSizes = {
                'person': { avgHeight: 1.7 },
                'car': { avgHeight: 1.5 },
                'bicycle': { avgHeight: 1.0 },
                'dog': { avgHeight: 0.5 },
                'chair': { avgHeight: 0.8 },
                'bus': { avgHeight: 3.0 },
                'truck': { avgHeight: 2.5 }
            };
            
            const objInfo = objectSizes[det.class.toLowerCase()];
            if (objInfo) {
                const focalLength = 500;
                const realHeight = objInfo.avgHeight * 100;
                estimatedMeters = (realHeight * focalLength) / (det.bbox.height * 100);
                estimatedMeters = Math.max(0.5, Math.min(estimatedMeters, 20));
            } else {
                if (heightRatio > 0.6) estimatedMeters = 1;
                else if (heightRatio > 0.4) estimatedMeters = 2;
                else if (heightRatio > 0.25) estimatedMeters = 4;
                else if (heightRatio > 0.15) estimatedMeters = 6;
                else estimatedMeters = 10;
            }
            
            estimatedMeters *= (1 + (1 - yPosition) * 0.5);
            
            return {
                ...det,
                estimatedDistance: Math.round(estimatedMeters * 10) / 10,
                distanceCategory: this.categorizeDistance(estimatedMeters),
                depthConfidence: areaRatio > 0.1 ? 'high' : (areaRatio > 0.03 ? 'medium' : 'low')
            };
        });
    }
    
    /**
     * Categorize distance into verbal descriptions
     */
    categorizeDistance(meters) {
        if (meters <= 1) return 'very close';
        if (meters <= 2) return 'close';
        if (meters <= 4) return 'nearby';
        if (meters <= 7) return 'moderate distance';
        return 'far';
    }
    
    /**
     * Process detections and provide navigation guidance - ENHANCED
     */
    processNavigationGuidance(detections, safetyAnalysis = null) {
        const now = Date.now();
        
        // If safety analysis already spoke urgent warnings, reduce frequency
        if (safetyAnalysis && safetyAnalysis.safety.level === 'danger') {
            this.guidanceInterval = 2000;  // Slow down to avoid overlap
        }
        
        if (now - this.lastGuidanceTime < this.guidanceInterval) {
            return;
        }
        
        const obstacleInfo = this.analyzeObstacles(detections);
        let guidance = '';
        
        // Enhance obstacle info with safety analysis data
        if (safetyAnalysis) {
            obstacleInfo.hasSteps = safetyAnalysis.steps.detected;
            obstacleInfo.stepsInfo = safetyAnalysis.steps;
            obstacleInfo.pathwayBlocked = !safetyAnalysis.pathway.clearPathExists;
            obstacleInfo.suggestedPath = safetyAnalysis.pathway.recommendedPath;
            obstacleInfo.hasHazards = safetyAnalysis.hazards.detected;
        }
        
        if (obstacleInfo.hasImmediateDanger) {
            guidance = this.generateDangerGuidance(obstacleInfo);
            this.guidanceInterval = 1000;
            
            if (Utils && Utils.hapticFeedback) {
                Utils.hapticFeedback('error');
            }
            
        } else if (obstacleInfo.hasCaution) {
            guidance = this.generateCautionGuidance(obstacleInfo);
            this.guidanceInterval = 1500;
            
            if (Utils && Utils.hapticFeedback) {
                Utils.hapticFeedback('warning');
            }
            
        } else if (obstacleInfo.hasObstacles) {
            guidance = this.generateInfoGuidance(obstacleInfo);
            this.guidanceInterval = 2500;
            
        } else {
            if (now - this.lastClearPathTime > this.settings.clearPathInterval) {
                guidance = 'Path is clear. Continue forward.';
                
                // Add ground type info if available
                if (safetyAnalysis && safetyAnalysis.scene?.foreground?.classification?.subtype) {
                    const groundType = safetyAnalysis.scene.foreground.classification.subtype;
                    if (groundType !== 'unknown') {
                        guidance = `Path is clear on ${groundType}. Continue forward.`;
                    }
                }
                
                this.lastClearPathTime = now;
                this.guidanceInterval = 3000;
            }
        }
        
        if (guidance && guidance !== this.lastGuidance) {
            speechManager.speak(guidance);
            this.lastGuidance = guidance;
            this.lastGuidanceTime = now;
            
            this.updateDetectionDisplay(detections, guidance);
        }
    }
    
    /**
     * Analyze obstacles for danger levels
     */
    analyzeObstacles(detections) {
        const obstacleClasses = [
            'person', 'car', 'bicycle', 'motorcycle', 'bus', 'truck', 
            'dog', 'cat', 'chair', 'table', 'bench', 'fire hydrant', 
            'stop sign', 'parking meter', 'suitcase', 'skateboard'
        ];
        
        const obstacles = detections.filter(d => 
            obstacleClasses.includes(d.class.toLowerCase())
        );
        
        if (obstacles.length === 0) {
            return { hasObstacles: false, hasCaution: false, hasImmediateDanger: false };
        }
        
        const immediate = obstacles.filter(o => o.estimatedDistance <= 1.5 && o.position === 'center');
        const caution = obstacles.filter(o => o.estimatedDistance <= 3 && !immediate.includes(o));
        const awareness = obstacles.filter(o => !immediate.includes(o) && !caution.includes(o));
        
        const leftObstacles = obstacles.filter(o => o.position === 'left');
        const rightObstacles = obstacles.filter(o => o.position === 'right');
        
        const leftClear = leftObstacles.length === 0 || leftObstacles.every(o => o.estimatedDistance > 3);
        const rightClear = rightObstacles.length === 0 || rightObstacles.every(o => o.estimatedDistance > 3);
        
        let safestDirection = 'stop';
        if (leftClear && rightClear) {
            safestDirection = leftObstacles.length <= rightObstacles.length ? 'left' : 'right';
        } else if (leftClear) {
            safestDirection = 'left';
        } else if (rightClear) {
            safestDirection = 'right';
        }
        
        return {
            hasObstacles: obstacles.length > 0,
            hasCaution: caution.length > 0,
            hasImmediateDanger: immediate.length > 0,
            immediate,
            caution,
            awareness,
            allObstacles: obstacles,
            safestDirection,
            closestObstacle: obstacles.sort((a, b) => a.estimatedDistance - b.estimatedDistance)[0]
        };
    }
    
    /**
     * Generate danger guidance
     */
    generateDangerGuidance(info) {
        const closest = info.closestObstacle;
        const dist = closest.estimatedDistance;
        
        let msg = `Stop! ${closest.class} ${dist < 1 ? 'directly in front' : `${dist} meters ahead`}!`;
        
        if (info.safestDirection !== 'stop') {
            msg += ` Move ${info.safestDirection} to avoid.`;
        } else {
            msg += ' Wait for path to clear.';
        }
        
        return msg;
    }
    
    /**
     * Generate caution guidance
     */
    generateCautionGuidance(info) {
        const obstacles = info.caution.slice(0, 2);
        const descriptions = obstacles.map(o => 
            `${o.class} ${o.estimatedDistance} meters ${o.position === 'center' ? 'ahead' : `on your ${o.position}`}`
        );
        
        let msg = `Caution. ${descriptions.join(', ')}.`;
        
        if (info.safestDirection !== 'stop') {
            msg += ` Consider moving ${info.safestDirection}.`;
        }
        
        return msg;
    }
    
    /**
     * Generate informational guidance
     */
    generateInfoGuidance(info) {
        const obstacles = info.awareness.slice(0, 3);
        const descriptions = obstacles.map(o => 
            `${o.class} ${o.position === 'center' ? 'ahead' : o.position}`
        );
        
        return `Detected: ${descriptions.join(', ')}. Path ahead is passable.`;
    }
    
    /**
     * Handle voice commands
     */
    handleCommand(command) {
        const cmd = command.toLowerCase();
        
        if (cmd.includes('stop') || cmd.includes('exit') || cmd.includes('cancel navigation')) {
            this.stop();
            return true;
        }
        
        if (cmd.includes('navigate to') || cmd.includes('take me to') || cmd.includes('go to')) {
            const destination = cmd.replace(/navigate to|take me to|go to/gi, '').trim();
            if (destination) {
                this.setDestination(destination);
            } else {
                speechManager.speak('Please say "navigate to" followed by your destination.', true);
            }
            return true;
        }
        
        if (cmd.includes('where am i') || cmd.includes('my location') || cmd.includes('current location')) {
            this.announceCurrentLocation();
            return true;
        }
        
        if (cmd.includes('bus stop') || cmd.includes('find bus')) {
            this.announceNearbyBusStops();
            return true;
        }
        
        if (cmd.includes('surroundings') || cmd.includes('around me') || cmd.includes('describe area')) {
            this.describeSurroundings();
            return true;
        }
        
        if (cmd.includes('repeat') || cmd.includes('again')) {
            if (this.lastGuidance) {
                speechManager.speak(this.lastGuidance, true);
            } else {
                speechManager.speak('No recent guidance to repeat.', true);
            }
            return true;
        }
        
        if (cmd.includes('status') || cmd.includes('how far')) {
            this.announceStatus();
            return true;
        }
        
        if (cmd.includes('outdoor mode')) {
            this.navigationType = 'outdoor';
            speechManager.speak('Switched to outdoor navigation mode.', true);
            return true;
        }
        
        if (cmd.includes('indoor mode')) {
            this.navigationType = 'indoor';
            speechManager.speak('Switched to indoor navigation mode. Relying on camera guidance.', true);
            return true;
        }
        
        if (cmd.includes('smart mode') || cmd.includes('auto mode')) {
            this.navigationType = 'smart';
            speechManager.speak('Switched to smart navigation mode with automatic detection.', true);
            return true;
        }
        
        if (cmd.includes('explore') || cmd.includes('free walk')) {
            this.destination = null;
            this.state.currentRoute = null;
            speechManager.speak('Exploration mode. I will guide you around obstacles as you walk.', true);
            this.startFrameProcessing();
            return true;
        }
        
        return false;
    }
    
    /**
     * Announce current location
     */
    async announceCurrentLocation() {
        try {
            speechManager.speak('Getting your location...', true);
            
            const location = await navigationService.getCurrentLocation();
            const address = await navigationService.getDetailedAddressFromCoords(
                location.latitude, 
                location.longitude
            );
            
            if (address) {
                const parts = [];
                if (address.street) parts.push(address.street);
                if (address.houseNumber) parts.push(`number ${address.houseNumber}`);
                if (address.neighborhood) parts.push(address.neighborhood);
                if (address.city) parts.push(address.city);
                
                const locationText = parts.length > 0 ? 
                    `You are near ${parts.join(', ')}` : 
                    `Your coordinates are: latitude ${location.latitude.toFixed(4)}, longitude ${location.longitude.toFixed(4)}`;
                
                speechManager.speak(locationText, true);
            } else {
                speechManager.speak(`Your coordinates are: latitude ${location.latitude.toFixed(4)}, longitude ${location.longitude.toFixed(4)}`, true);
            }
            
        } catch (error) {
            speechManager.speak('Could not determine your location. Please ensure GPS is enabled.', true);
        }
    }
    
    /**
     * Announce nearby bus stops
     */
    async announceNearbyBusStops() {
        try {
            speechManager.speak('Searching for nearby bus stops...', true);
            
            const busStops = await navigationService.findNearbyBusStops(500);
            
            if (busStops.length === 0) {
                speechManager.speak('No bus stops found within 500 meters.', true);
                return;
            }
            
            const announcements = busStops.slice(0, 3).map((stop, i) => {
                return `${stop.name} is ${stop.distance} meters to your ${stop.direction}` +
                    (stop.routes !== 'Unknown routes' ? `. Routes: ${stop.routes}` : '');
            });
            
            speechManager.speak(`Found ${busStops.length} bus stops. ${announcements.join('. ')}.`, true);
            
        } catch (error) {
            speechManager.speak('Could not search for bus stops. Please check your connection.', true);
        }
    }
    
    /**
     * Describe surroundings with 360° awareness
     */
    async describeSurroundings() {
        try {
            speechManager.speak('Analyzing your surroundings. Please wait...', true);
            
            const description = await navigationService.speakSurroundings();
            speechManager.speak(description, true);
            
        } catch (error) {
            speechManager.speak('Could not analyze surroundings. Please ensure GPS and camera are working.', true);
        }
    }
    
    /**
     * Announce navigation status
     */
    announceStatus() {
        if (!this.state.currentRoute) {
            const elapsed = Math.floor((Date.now() - this.state.startTime) / 1000);
            const minutes = Math.floor(elapsed / 60);
            
            speechManager.speak(
                `Navigation active for ${minutes} minutes. ` +
                `${this.state.obstaclesDetected.length} obstacles detected. ` +
                `No destination set. Say "navigate to" followed by a location.`,
                true
            );
            return;
        }
        
        const route = this.state.currentRoute;
        const stepsRemaining = route.steps.length - this.state.currentStep;
        
        if (navigationService.currentLocation && this.destination) {
            const distanceRemaining = navigationService.haversine(
                navigationService.currentLocation.latitude,
                navigationService.currentLocation.longitude,
                this.destination.latitude,
                this.destination.longitude
            );
            
            const distText = navigationService.formatDistance(distanceRemaining);
            speechManager.speak(
                `${distText} remaining to ${this.destination.name}. ` +
                `${stepsRemaining} turns to go.`,
                true
            );
        } else {
            speechManager.speak(`${stepsRemaining} navigation steps remaining.`, true);
        }
    }
    
    /**
     * Update UI elements
     */
    updateUI(active) {
        const modeContent = document.getElementById('mode-content');
        if (!modeContent) return;
        
        if (active) {
            modeContent.innerHTML = `
                <div class="navigation-display">
                    <div class="nav-status ${this.navigationType}-mode">
                        <span class="nav-icon">🧭</span>
                        <span class="nav-text">${this.getNavigationTypeLabel()} Active</span>
                    </div>
                    <div class="nav-location" id="nav-location">
                        <span class="location-icon">📍</span>
                        <span id="current-address">Locating...</span>
                    </div>
                    ${this.destination ? `<p class="destination"><strong>Destination:</strong> ${this.destination.name}</p>` : ''}
                    <div class="nav-stats">
                        <span id="nav-time">Time: 0:00</span>
                        <span id="nav-distance">Distance: --</span>
                        <span id="nav-obstacles">Obstacles: 0</span>
                    </div>
                    <div class="route-steps" id="route-steps">
                        <p class="hint">Say "navigate to [place]" to start turn-by-turn navigation</p>
                    </div>
                    <div class="current-guidance" id="current-guidance">
                        <p>Starting obstacle detection...</p>
                    </div>
                    <div class="nav-quick-actions">
                        <button class="quick-btn" data-action="location">📍 Where am I</button>
                        <button class="quick-btn" data-action="bus">🚌 Find Bus Stop</button>
                        <button class="quick-btn" data-action="surroundings">👁️ Describe Area</button>
                    </div>
                </div>
            `;
            
            this.attachQuickActionListeners();
            this.startTimeUpdate();
            this.updateLocationDisplay();
            
        } else {
            modeContent.innerHTML = '';
        }
    }
    
    /**
     * Get navigation type label
     */
    getNavigationTypeLabel() {
        switch(this.navigationType) {
            case 'outdoor': return '🌍 Outdoor Navigation';
            case 'indoor': return '🏢 Indoor Navigation';
            case 'smart': return '🧠 Smart Navigation';
            default: return '🧭 Navigation';
        }
    }
    
    /**
     * Attach quick action button listeners
     */
    attachQuickActionListeners() {
        document.querySelectorAll('.nav-quick-actions .quick-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const action = btn.dataset.action;
                switch(action) {
                    case 'location':
                        this.announceCurrentLocation();
                        break;
                    case 'bus':
                        this.announceNearbyBusStops();
                        break;
                    case 'surroundings':
                        this.describeSurroundings();
                        break;
                }
            });
        });
    }
    
    /**
     * Update location display
     */
    async updateLocationDisplay() {
        try {
            const location = await navigationService.getCurrentLocation();
            const address = await navigationService.getDetailedAddressFromCoords(
                location.latitude, 
                location.longitude
            );
            
            const addressEl = document.getElementById('current-address');
            if (addressEl && address) {
                addressEl.textContent = address.street || address.neighborhood || 'Location found';
            }
        } catch (e) {
            const addressEl = document.getElementById('current-address');
            if (addressEl) {
                addressEl.textContent = 'Location unavailable';
            }
        }
    }
    
    /**
     * Update route display
     */
    updateRouteDisplay(update = null) {
        const stepsEl = document.getElementById('route-steps');
        if (!stepsEl || !this.state.currentRoute) return;
        
        const route = this.state.currentRoute;
        const currentStep = route.steps[this.state.currentStep];
        
        let html = '<div class="route-info">';
        html += `<p><strong>Current:</strong> ${currentStep?.instruction || 'Follow the path'}</p>`;
        
        const nextStep = route.steps[this.state.currentStep + 1];
        if (nextStep) {
            html += `<p class="next-step"><strong>Next:</strong> ${nextStep.instruction}</p>`;
        }
        
        if (update) {
            html += `<p class="distance-info">${navigationService.formatDistance(update.distanceToDestination)} remaining</p>`;
        }
        
        html += '</div>';
        stepsEl.innerHTML = html;
        
        const distEl = document.getElementById('nav-distance');
        if (distEl && update) {
            distEl.textContent = `Remaining: ${navigationService.formatDistance(update.distanceToDestination)}`;
        }
    }
    
    /**
     * Start updating time display
     */
    startTimeUpdate() {
        const updateTime = () => {
            if (!this.isActive) return;
            
            const elapsed = Math.floor((Date.now() - this.state.startTime) / 1000);
            const minutes = Math.floor(elapsed / 60);
            const seconds = elapsed % 60;
            
            const timeEl = document.getElementById('nav-time');
            if (timeEl) {
                timeEl.textContent = `Time: ${minutes}:${seconds.toString().padStart(2, '0')}`;
            }
            
            const obstacleEl = document.getElementById('nav-obstacles');
            if (obstacleEl) {
                obstacleEl.textContent = `Obstacles: ${this.state.obstaclesDetected.length}`;
            }
            
            requestAnimationFrame(updateTime);
        };
        
        updateTime();
    }
    
    /**
     * Update detection display
     */
    updateDetectionDisplay(detections, guidance) {
        const guidanceEl = document.getElementById('current-guidance');
        if (guidanceEl) {
            guidanceEl.innerHTML = `<p>${guidance}</p>`;
        }
        
        const resultsEl = document.getElementById('detection-results');
        if (resultsEl && detections.length > 0) {
            const items = detections.slice(0, 5).map(d => 
                `• ${d.class}: ${d.estimatedDistance || d.distance}m (${d.position})`
            ).join('<br>');
            resultsEl.innerHTML = `<strong>Detected:</strong><br>${items}`;
        }
        
        const now = Date.now();
        detections.forEach(d => {
            if (d.estimatedDistance && d.estimatedDistance < 3) {
                this.state.obstaclesDetected.push({ time: now, obstacle: d });
            }
        });
        
        this.state.obstaclesDetected = this.state.obstaclesDetected.filter(
            o => now - o.time < 300000
        );
    }
}

// Export singleton instance
const navigationMode = new NavigationMode();
