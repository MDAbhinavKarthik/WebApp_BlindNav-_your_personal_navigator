/**
 * BlindNav+ Enhanced Object Detection Mode
 * Multi-model detection with detailed feedback including:
 * - Object name, position, distance, movement relevance
 * - Structure detection (doors, walls)
 * - Depth analysis for navigation
 */

class ObjectDetectionMode {
    constructor() {
        this.isActive = false;
        this.targetObject = null;
        this.searchTimeout = null;
        this.searchDuration = 20000; // 20 seconds search time
        this.rotationPrompts = [
            'Please turn a little to your left.',
            'Now turn slightly to your right.',
            'Try facing behind you.',
            'Look a bit upwards or downwards.',
            'Slowly rotate to scan the area.'
        ];
        this.currentRotationIndex = 0;
        this.frameProcessingActive = false;
        this.searchStartTime = null;
        this.objectFound = false;
        this.detectedObjects = new Map();
        this.lastAnnouncementTime = 0;
        this.announcementCooldown = 2000;
        
        // Detection mode types
        this.detectionMode = 'general'; // 'general', 'obstacle', 'structure', 'specific'
        
        // Continuous detection settings
        this.continuousMode = false;
        this.priorityClasses = ['person', 'car', 'bicycle', 'motorcycle', 'bus', 'truck', 'dog', 'obstacle'];
        
        // Depth analysis
        this.depthAnalysisEnabled = true;
        
        // Structure detection
        this.structureDetectionEnabled = true;
        
        // Movement tracking
        this.previousDetections = [];
        this.movementThreshold = 20; // pixels
    }
    
    /**
     * Start object detection mode
     */
    async start() {
        if (this.isActive) {
            console.log('[ObjectDetection] Already active');
            return;
        }
        
        this.isActive = true;
        console.log('[ObjectDetection] Mode started');
        
        // Initialize vision service
        if (typeof visionService !== 'undefined' && !visionService.isInitialized) {
            await visionService.initialize();
        }
        
        speechManager.speak(
            'Object Detection Mode activated. ' +
            'I can detect objects, estimate distances, and analyze the scene. ' +
            'Say "find" followed by an object name to search. ' +
            'Say "scan" for continuous detection. ' +
            'Say "what do you see" for a scene description.',
            true
        );
        
        this.updateUI(true);
    }
    
    /**
     * Stop object detection mode
     */
    stop() {
        if (!this.isActive) return;
        
        this.isActive = false;
        this.stopSearch();
        this.continuousMode = false;
        
        speechManager.speak('Exiting Object Detection Mode.');
        
        this.updateUI(false);
        
        console.log('[ObjectDetection] Mode stopped');
    }
    
    /**
     * Main detection function - process frame with full analysis
     */
    async detectObjects(frame) {
        if (typeof visionService === 'undefined') {
            // Fallback to basic detection
            return await detectionManager.detect(frame);
        }
        
        // Use enhanced vision service
        const detections = await visionService.detectObjects(frame, {
            minConfidence: 0.4,
            maxDetections: 30
        });
        
        return detections;
    }
    
    /**
     * Search for a specific object
     * @param {string} objectName - Name of object to find
     */
    async searchForObject(objectName) {
        if (!objectName || objectName.trim() === '') {
            speechManager.speak("I didn't catch the object name. Please say it again.");
            return;
        }
        
        this.detectionMode = 'specific';
        this.targetObject = objectName.toLowerCase().trim();
        this.objectFound = false;
        this.detectedObjects.clear();
        this.currentRotationIndex = 0;
        this.searchStartTime = Date.now();
        
        speechManager.speak(
            `Searching for ${this.targetObject}. Please slowly pan your camera around.`
        );
        
        // Start frame processing
        this.startFrameProcessing();
        
        // Set search timeout
        this.searchTimeout = setTimeout(() => {
            if (!this.objectFound) {
                this.searchCompleted(false);
            }
        }, this.searchDuration);
        
        // Set rotation prompt intervals
        this.startRotationPrompts();
    }
    
    /**
     * Start continuous scanning mode
     */
    startContinuousScan() {
        this.continuousMode = true;
        this.detectionMode = 'general';
        
        speechManager.speak(
            'Starting continuous scan. I will describe objects as they appear. ' +
            'Say "stop scanning" to pause.'
        );
        
        this.startFrameProcessing();
    }
    
    /**
     * Start obstacle detection mode
     */
    startObstacleDetection() {
        this.detectionMode = 'obstacle';
        this.continuousMode = true;
        
        speechManager.speak(
            'Obstacle detection mode. I will alert you to obstacles in your path.'
        );
        
        this.startFrameProcessing();
    }
    
    /**
     * Start structure detection (doors, walls)
     */
    async detectStructures(frame) {
        if (typeof visionService === 'undefined') {
            speechManager.speak('Structure detection requires enhanced vision service.');
            return null;
        }
        
        const detections = await this.detectObjects(frame);
        
        // Detect doors
        const doorResult = await visionService.detectDoor(frame, detections);
        
        // Detect walls
        const wallResult = await visionService.detectWall(frame, detections);
        
        return {
            doors: doorResult,
            walls: wallResult,
            detections
        };
    }
    
    /**
     * Analyze depth for navigation
     * analyze_depth_for_navigation()
     */
    async analyzeDepthForNavigation(frame) {
        const detections = await this.detectObjects(frame);
        
        if (typeof visionService !== 'undefined') {
            visionService.estimateDepths(detections, frame);
        }
        
        // Sort by distance (closest first)
        const sortedByDistance = [...detections].sort((a, b) => 
            (a.depth?.meters || a.distance.meters) - (b.depth?.meters || b.distance.meters)
        );
        
        // Identify obstacles in path
        const obstaclesInPath = sortedByDistance.filter(d => 
            d.position.horizontal === 'center' || 
            d.position.horizontal.includes('slight')
        );
        
        // Generate navigation guidance
        const guidance = this.generateNavigationGuidance(obstaclesInPath, sortedByDistance);
        
        return {
            allObjects: sortedByDistance,
            obstaclesInPath,
            nearestObject: sortedByDistance[0] || null,
            pathClear: obstaclesInPath.length === 0 || 
                (obstaclesInPath[0]?.depth?.meters > 3),
            guidance
        };
    }
    
    /**
     * Generate navigation guidance from depth analysis
     */
    generateNavigationGuidance(obstaclesInPath, allObjects) {
        if (obstaclesInPath.length === 0) {
            return {
                safe: true,
                message: 'Path ahead is clear.',
                action: 'proceed'
            };
        }
        
        const nearest = obstaclesInPath[0];
        const distance = nearest.depth?.meters || nearest.distance.meters;
        
        if (distance < 1.5) {
            return {
                safe: false,
                message: `Warning! ${nearest.class} directly ahead, ${distance.toFixed(1)} meters.`,
                action: 'stop',
                obstacle: nearest
            };
        } else if (distance < 3) {
            // Find clear direction
            const leftClear = !allObjects.some(d => 
                d.position.horizontal.includes('left') && 
                (d.depth?.meters || d.distance.meters) < 2
            );
            const rightClear = !allObjects.some(d => 
                d.position.horizontal.includes('right') && 
                (d.depth?.meters || d.distance.meters) < 2
            );
            
            let avoidDirection = '';
            if (leftClear) avoidDirection = 'Move left to avoid.';
            else if (rightClear) avoidDirection = 'Move right to avoid.';
            else avoidDirection = 'Proceed slowly.';
            
            return {
                safe: false,
                message: `${nearest.class} ahead at ${distance.toFixed(1)} meters. ${avoidDirection}`,
                action: 'caution',
                obstacle: nearest
            };
        }
        
        return {
            safe: true,
            message: `${nearest.class} detected ahead at ${distance.toFixed(1)} meters. Safe to proceed.`,
            action: 'proceed',
            obstacle: nearest
        };
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
            
            // Process every 2nd frame for better performance
            if (frameCount % 2 !== 0) return;
            
            // Run detection
            const detections = await this.detectObjects(frame);
            
            // Draw detections on canvas
            if (frame.ctx && detections.length > 0) {
                frame.ctx.clearRect(0, 0, frame.width, frame.height);
                frame.ctx.drawImage(cameraManager.imgElement, 0, 0);
                this.drawEnhancedDetections(frame.ctx, detections);
            }
            
            // Process based on mode
            switch (this.detectionMode) {
                case 'specific':
                    this.checkForTargetObject(detections);
                    break;
                case 'obstacle':
                    this.processObstacleDetections(detections);
                    break;
                case 'general':
                default:
                    if (this.continuousMode) {
                        this.processContinuousDetections(detections);
                    }
                    break;
            }
            
            // Track detected objects
            detections.forEach(det => {
                this.detectedObjects.set(det.class, det);
            });
            
            // Update results display
            this.updateResultsDisplay(detections);
        });
    }
    
    /**
     * Draw enhanced detections with depth info
     */
    drawEnhancedDetections(ctx, detections) {
        ctx.save();
        
        detections.forEach(det => {
            const { bbox, class: className, confidence, distance, depth, position } = det;
            
            // Choose color based on distance/danger
            let color;
            const distanceMeters = depth?.meters || distance.meters;
            
            if (distanceMeters < 1.5) {
                color = '#e74c3c'; // Red - danger
            } else if (distanceMeters < 3) {
                color = '#f39c12'; // Orange - caution
            } else if (distanceMeters < 5) {
                color = '#3498db'; // Blue - moderate
            } else {
                color = '#27ae60'; // Green - safe
            }
            
            // Draw bounding box
            ctx.strokeStyle = color;
            ctx.lineWidth = 3;
            ctx.strokeRect(bbox.x, bbox.y, bbox.width, bbox.height);
            
            // Draw label background
            const distanceText = depth?.meters 
                ? `${depth.meters.toFixed(1)}m` 
                : distance.label;
            const label = `${className} (${distanceText})`;
            ctx.font = 'bold 14px Inter, sans-serif';
            const textWidth = ctx.measureText(label).width;
            
            ctx.fillStyle = color;
            ctx.fillRect(bbox.x, bbox.y - 28, textWidth + 12, 25);
            
            // Draw label text
            ctx.fillStyle = '#ffffff';
            ctx.fillText(label, bbox.x + 6, bbox.y - 10);
            
            // Draw position indicator
            const posLabel = position.horizontal;
            ctx.font = '12px Inter, sans-serif';
            ctx.fillStyle = 'rgba(0,0,0,0.7)';
            ctx.fillRect(bbox.x, bbox.y + bbox.height, 60, 18);
            ctx.fillStyle = '#fff';
            ctx.fillText(posLabel, bbox.x + 4, bbox.y + bbox.height + 14);
            
            // Draw movement indicator if approaching
            if (det.movement?.approaching) {
                ctx.fillStyle = '#e74c3c';
                ctx.beginPath();
                ctx.moveTo(bbox.x + bbox.width/2, bbox.y - 35);
                ctx.lineTo(bbox.x + bbox.width/2 - 8, bbox.y - 45);
                ctx.lineTo(bbox.x + bbox.width/2 + 8, bbox.y - 45);
                ctx.fill();
            }
        });
        
        ctx.restore();
    }
    
    /**
     * Check if target object is found
     * Uses enhanced matching with aliases for natural language
     */
    checkForTargetObject(detections) {
        // Get object aliases from detection manager if available
        const aliases = detectionManager?.objectAliases || {};
        
        // Normalize target - check if it's an alias
        let searchTarget = this.targetObject.toLowerCase().trim();
        if (aliases[searchTarget]) {
            searchTarget = aliases[searchTarget];
        }
        
        // Find matching objects with flexible matching
        const matches = detections.filter(det => {
            const detClass = det.class.toLowerCase();
            
            // Direct match
            if (detClass === searchTarget) return true;
            
            // Partial match
            if (detClass.includes(searchTarget) || searchTarget.includes(detClass)) return true;
            
            // Check if detection class is an alias of search target
            for (const [alias, cocoClass] of Object.entries(aliases)) {
                if (cocoClass === detClass && 
                    (alias.includes(searchTarget) || searchTarget.includes(alias))) {
                    return true;
                }
            }
            
            // Fuzzy match for typos (first 3 chars)
            if (searchTarget.length >= 3 && detClass.length >= 3) {
                if (searchTarget.substring(0, 3) === detClass.substring(0, 3)) return true;
            }
            
            return false;
        });
        
        if (matches.length > 0) {
            // Sort by size (closest/largest first)
            matches.sort((a, b) => b.size.areaRatio - a.size.areaRatio);
            const found = matches[0];
            
            this.objectFound = true;
            this.stopSearch();
            
            // Generate detailed announcement
            const distanceText = found.depth?.meters 
                ? `${found.depth.meters.toFixed(1)} meters away` 
                : found.distance.label;
            
            let message = `Found ${found.class}! `;
            message += `It's ${distanceText}, ${found.position.description}. `;
            message += `Confidence: ${Math.round(found.confidence * 100)}%.`;
            
            if (found.movement?.approaching) {
                message += ' It appears to be approaching.';
            } else if (found.movement?.receding) {
                message += ' It appears to be moving away.';
            }
            
            speechManager.speak(message, true);
            
            // Highlight found object
            this.highlightFoundObject(found);
            
            // Update UI
            this.updateFoundDisplay(found);
        }
    }
    
    /**
     * Process obstacle detections
     */
    processObstacleDetections(detections) {
        const now = Date.now();
        if (now - this.lastAnnouncementTime < this.announcementCooldown) return;
        
        // Filter for obstacles in path
        const obstacles = detections.filter(d => 
            (d.position.horizontal === 'center' || d.position.horizontal.includes('slight')) &&
            (d.depth?.meters < 3 || d.distance.estimate === 'close' || d.distance.estimate === 'very-close')
        );
        
        if (obstacles.length > 0) {
            // Find most dangerous obstacle
            const mostDangerous = obstacles.reduce((a, b) => 
                (a.depth?.meters || 10) < (b.depth?.meters || 10) ? a : b
            );
            
            const distance = mostDangerous.depth?.meters || mostDangerous.distance.meters;
            
            if (distance < 2) {
                speechManager.speak(
                    `Warning! ${mostDangerous.class} ${mostDangerous.position.horizontal}, ` +
                    `${distance.toFixed(1)} meters!`,
                    true
                );
                this.lastAnnouncementTime = now;
            }
        }
    }
    
    /**
     * Process continuous detections
     */
    processContinuousDetections(detections) {
        const now = Date.now();
        if (now - this.lastAnnouncementTime < this.announcementCooldown * 2) return;
        
        // Find new or significant objects
        const significant = detections.filter(d => 
            d.movementRelevance > 0.6 ||
            this.priorityClasses.includes(d.class.toLowerCase())
        );
        
        if (significant.length > 0) {
            // Sort by relevance
            significant.sort((a, b) => b.movementRelevance - a.movementRelevance);
            
            const topObject = significant[0];
            const distanceText = topObject.depth?.meters 
                ? `${topObject.depth.meters.toFixed(1)} meters` 
                : topObject.distance.label;
            
            let message = `${topObject.class} detected ${topObject.position.horizontal}, ${distanceText}`;
            
            if (topObject.movement?.approaching) {
                message += ', approaching';
            }
            
            speechManager.speak(message);
            this.lastAnnouncementTime = now;
        }
    }
    
    /**
     * Describe current scene
     */
    async describeScene() {
        speechManager.speak('Analyzing the scene...');
        
        // Get current frame
        const frame = cameraManager.getCurrentFrame();
        if (!frame) {
            speechManager.speak('Cannot access camera. Please ensure camera is connected.');
            return;
        }
        
        if (typeof visionService !== 'undefined') {
            // Use comprehensive scene analysis
            const analysis = await visionService.analyzeScene(frame);
            
            let description = '';
            
            // Object count
            if (analysis.objects.length > 0) {
                const objectTypes = [...new Set(analysis.objects.map(d => d.class))];
                description += `I can see ${analysis.objects.length} objects including ${objectTypes.slice(0, 5).join(', ')}. `;
                
                // Describe closest objects
                const closest = [...analysis.objects]
                    .sort((a, b) => (a.depth?.meters || 10) - (b.depth?.meters || 10))
                    .slice(0, 3);
                
                closest.forEach(obj => {
                    const dist = obj.depth?.meters 
                        ? `${obj.depth.meters.toFixed(1)} meters` 
                        : obj.distance.label;
                    description += `${obj.class} ${obj.position.horizontal} at ${dist}. `;
                });
            } else {
                description += 'No objects detected in view. ';
            }
            
            // Traffic info
            if (analysis.traffic.detected) {
                description += analysis.traffic.guidance + ' ';
            }
            
            // Road conditions
            if (analysis.road.vehicles.count > 0) {
                description += analysis.road.guidance + ' ';
            }
            
            // Weather/environment (if outdoors)
            if (!analysis.weather.isIndoor && analysis.weather.sky.visible) {
                description += `Sky appears ${analysis.weather.weather.condition}. `;
            }
            
            // Structures
            if (analysis.structures.doors.detected) {
                description += analysis.structures.doors.guidance + ' ';
            }
            
            speechManager.speak(description || 'Scene analysis complete.');
            
        } else {
            // Fallback to basic detection
            const detections = await detectionManager.detect(frame);
            const description = detectionManager.generateDescription(detections);
            speechManager.speak(description);
        }
    }
    
    /**
     * Start rotation prompts
     */
    startRotationPrompts() {
        const promptInterval = this.searchDuration / (this.rotationPrompts.length + 1);
        
        const promptNext = () => {
            if (!this.isActive || this.objectFound || 
                this.currentRotationIndex >= this.rotationPrompts.length) {
                return;
            }
            
            speechManager.speak(this.rotationPrompts[this.currentRotationIndex]);
            this.currentRotationIndex++;
            
            setTimeout(promptNext, promptInterval);
        };
        
        setTimeout(promptNext, promptInterval);
    }
    
    /**
     * Handle search completion
     */
    searchCompleted(found) {
        if (this.objectFound) return;
        
        this.stopSearch();
        
        if (!found) {
            let message = `Sorry, I couldn't find ${this.targetObject} in your surroundings. `;
            
            if (this.detectedObjects.size > 0) {
                const detected = Array.from(this.detectedObjects.keys()).slice(0, 5);
                message += `However, I did notice: ${detected.join(', ')}. `;
            }
            
            message += 'Would you like me to search again? Say "search again" or try a different object.';
            
            speechManager.speak(message);
        }
    }
    
    /**
     * Stop active search
     */
    stopSearch() {
        this.frameProcessingActive = false;
        cameraManager.stopFrameProcessing();
        
        if (this.searchTimeout) {
            clearTimeout(this.searchTimeout);
            this.searchTimeout = null;
        }
        
        this.detectionMode = 'general';
    }
    
    /**
     * Highlight found object on canvas
     */
    highlightFoundObject(found) {
        const canvas = document.getElementById('detection-canvas');
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        const { bbox } = found;
        
        ctx.save();
        
        // Pulsing border effect
        ctx.strokeStyle = '#00ff00';
        ctx.lineWidth = 5;
        ctx.setLineDash([10, 5]);
        ctx.strokeRect(bbox.x - 5, bbox.y - 5, bbox.width + 10, bbox.height + 10);
        
        // Add "FOUND" label
        ctx.fillStyle = '#00ff00';
        ctx.font = 'bold 28px Inter, sans-serif';
        ctx.fillText('✓ FOUND', bbox.x, bbox.y - 15);
        
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
                <div class="object-detection-display">
                    <div class="detection-header">
                        <span class="detection-icon">🔍</span>
                        <span class="detection-title">Object Detection</span>
                    </div>
                    
                    <div class="detection-modes">
                        <button class="detection-mode-btn" onclick="objectDetectionMode.startContinuousScan()">
                            📡 Continuous Scan
                        </button>
                        <button class="detection-mode-btn" onclick="objectDetectionMode.startObstacleDetection()">
                            ⚠️ Obstacle Mode
                        </button>
                        <button class="detection-mode-btn" onclick="objectDetectionMode.describeScene()">
                            👁️ Describe Scene
                        </button>
                    </div>
                    
                    <div class="search-status">
                        <span class="search-text" id="search-status-text">
                            Ready - Say "find [object]" to search
                        </span>
                    </div>
                    
                    <div class="search-progress" id="search-progress" style="display: none;">
                        <div class="progress-bar-container">
                            <div class="progress-fill" id="search-progress-fill"></div>
                        </div>
                        <span id="search-progress-text">Searching...</span>
                    </div>
                    
                    <div class="detection-results" id="detection-results">
                        <h4>Detected Objects:</h4>
                        <div id="objects-list" class="objects-list"></div>
                    </div>
                    
                    <div class="found-result" id="found-result"></div>
                    
                    <div class="detection-stats" id="detection-stats">
                        <span>FPS: <span id="det-fps">--</span></span>
                        <span>Objects: <span id="det-count">0</span></span>
                    </div>
                </div>
            `;
        } else {
            modeContent.innerHTML = '';
        }
    }
    
    /**
     * Update results display during detection
     */
    updateResultsDisplay(detections) {
        const statusText = document.getElementById('search-status-text');
        const progressEl = document.getElementById('search-progress');
        const progressFill = document.getElementById('search-progress-fill');
        const objectsList = document.getElementById('objects-list');
        const fpsEl = document.getElementById('det-fps');
        const countEl = document.getElementById('det-count');
        
        // Update status
        if (statusText) {
            if (this.targetObject) {
                statusText.textContent = `Searching for: ${this.targetObject}`;
            } else if (this.continuousMode) {
                statusText.textContent = `Scanning... (${detections.length} objects)`;
            }
        }
        
        // Update progress bar for specific search
        if (progressEl && this.searchStartTime && this.detectionMode === 'specific') {
            progressEl.style.display = 'block';
            const elapsed = Date.now() - this.searchStartTime;
            const progress = Math.min((elapsed / this.searchDuration) * 100, 100);
            
            if (progressFill) {
                progressFill.style.width = `${progress}%`;
            }
        }
        
        // Update objects list
        if (objectsList && detections.length > 0) {
            const items = detections.slice(0, 10).map(d => {
                const distText = d.depth?.meters 
                    ? `${d.depth.meters.toFixed(1)}m` 
                    : d.distance.label;
                const dangerClass = (d.depth?.meters || 10) < 2 ? 'danger' : 
                    (d.depth?.meters || 10) < 4 ? 'caution' : 'safe';
                
                return `
                    <div class="detected-object ${dangerClass}">
                        <span class="obj-name">${d.class}</span>
                        <span class="obj-pos">${d.position.horizontal}</span>
                        <span class="obj-dist">${distText}</span>
                        ${d.movement?.approaching ? '<span class="approaching">→</span>' : ''}
                    </div>
                `;
            }).join('');
            
            objectsList.innerHTML = items;
        }
        
        // Update stats
        if (countEl) countEl.textContent = detections.length;
        if (fpsEl && typeof visionService !== 'undefined') {
            const stats = visionService.getPerformanceStats();
            fpsEl.textContent = Math.round(stats.fps) || '--';
        }
    }
    
    /**
     * Update display when object is found
     */
    updateFoundDisplay(found) {
        const foundResult = document.getElementById('found-result');
        const searchProgress = document.getElementById('search-progress');
        const statusText = document.getElementById('search-status-text');
        
        if (searchProgress) searchProgress.style.display = 'none';
        if (statusText) statusText.textContent = `Found: ${found.class}!`;
        
        const distText = found.depth?.meters 
            ? `${found.depth.meters.toFixed(1)} meters` 
            : found.distance.label;
        
        if (foundResult) {
            foundResult.innerHTML = `
                <div class="found-success">
                    <span class="found-icon">✅</span>
                    <h3>Found: ${found.class}</h3>
                    <p><strong>Location:</strong> ${found.position.description}</p>
                    <p><strong>Distance:</strong> ${distText}</p>
                    <p><strong>Confidence:</strong> ${Math.round(found.confidence * 100)}%</p>
                    ${found.movement?.approaching ? 
                        '<p class="movement-alert">⚠️ Approaching!</p>' : ''}
                </div>
            `;
        }
    }
    
    /**
     * Handle voice command
     */
    handleCommand(command) {
        const cmd = command.toLowerCase();
        
        // Exit commands
        if (cmd.includes('stop') && cmd.includes('detect') || 
            cmd.includes('exit') || cmd.includes('cancel')) {
            this.stop();
            return true;
        }
        
        // Stop scanning
        if (cmd.includes('stop') && (cmd.includes('scan') || cmd.includes('continuous'))) {
            this.continuousMode = false;
            this.stopSearch();
            speechManager.speak('Scanning stopped.');
            return true;
        }
        
        // Find/search commands
        const findKeywords = ['find', 'detect', 'locate', 'search for', 'look for', 'where is', 'show me'];
        for (const keyword of findKeywords) {
            if (cmd.includes(keyword)) {
                let objectName = cmd.split(keyword)[1]?.trim()
                    .replace(/^(a |an |the |my )/, '');
                if (objectName) {
                    this.searchForObject(objectName);
                    return true;
                }
            }
        }
        
        // Continuous scan
        if (cmd.includes('scan') || cmd.includes('continuous')) {
            this.startContinuousScan();
            return true;
        }
        
        // Obstacle detection
        if (cmd.includes('obstacle') || cmd.includes('hazard')) {
            this.startObstacleDetection();
            return true;
        }
        
        // Scene description
        if (cmd.includes('what do you see') || cmd.includes('describe') || 
            cmd.includes('scene') || cmd.includes('surroundings')) {
            this.describeScene();
            return true;
        }
        
        // Search again
        if (cmd.includes('search again') || cmd.includes('try again')) {
            if (this.targetObject) {
                this.searchForObject(this.targetObject);
            } else {
                speechManager.speak('Please tell me what object to search for.');
            }
            return true;
        }
        
        // List detected objects
        if (cmd.includes('what') && cmd.includes('found') || cmd.includes('list') || cmd.includes('results')) {
            if (this.detectedObjects.size > 0) {
                const objects = Array.from(this.detectedObjects.keys()).join(', ');
                speechManager.speak(`Objects I can see: ${objects}`);
            } else {
                speechManager.speak('No objects detected yet.');
            }
            return true;
        }
        
        // Structure detection
        if (cmd.includes('door')) {
            this.detectAndAnnounceDoor();
            return true;
        }
        
        if (cmd.includes('wall')) {
            this.detectAndAnnounceWall();
            return true;
        }
        
        // Depth analysis
        if (cmd.includes('depth') || cmd.includes('how far') || cmd.includes('distance')) {
            this.announceDepthAnalysis();
            return true;
        }
        
        return false;
    }
    
    /**
     * Detect and announce door
     */
    async detectAndAnnounceDoor() {
        speechManager.speak('Looking for doors...');
        
        const frame = cameraManager.getCurrentFrame();
        if (!frame) {
            speechManager.speak('Cannot access camera.');
            return;
        }
        
        if (typeof visionService !== 'undefined') {
            const result = await visionService.detectDoor(frame);
            speechManager.speak(result.guidance);
        } else {
            speechManager.speak('Door detection requires enhanced vision service.');
        }
    }
    
    /**
     * Detect and announce wall
     */
    async detectAndAnnounceWall() {
        speechManager.speak('Analyzing for walls...');
        
        const frame = cameraManager.getCurrentFrame();
        if (!frame) {
            speechManager.speak('Cannot access camera.');
            return;
        }
        
        if (typeof visionService !== 'undefined') {
            const result = await visionService.detectWall(frame);
            speechManager.speak(result.guidance);
        } else {
            speechManager.speak('Wall detection requires enhanced vision service.');
        }
    }
    
    /**
     * Announce depth analysis
     */
    async announceDepthAnalysis() {
        speechManager.speak('Analyzing distances...');
        
        const frame = cameraManager.getCurrentFrame();
        if (!frame) {
            speechManager.speak('Cannot access camera.');
            return;
        }
        
        const analysis = await this.analyzeDepthForNavigation(frame);
        
        if (analysis.allObjects.length === 0) {
            speechManager.speak('No objects detected for depth analysis.');
            return;
        }
        
        let message = '';
        
        // Nearest object
        if (analysis.nearestObject) {
            const dist = analysis.nearestObject.depth?.meters || analysis.nearestObject.distance.meters;
            message += `Nearest: ${analysis.nearestObject.class} at ${dist.toFixed(1)} meters ${analysis.nearestObject.position.horizontal}. `;
        }
        
        // Path status
        message += analysis.guidance.message;
        
        speechManager.speak(message);
    }
}

// Export singleton instance
const objectDetectionMode = new ObjectDetectionMode();
