/**
 * BlindNav+ Indoor Navigation Helpers
 * Advanced indoor spatial guidance with step-by-step directions
 * Features: Door/exit/stairs detection, distance estimation, directional cues
 */

class IndoorNavigationHelpers {
    constructor() {
        // Detection state
        this.isActive = false;
        this.currentTarget = null;
        this.lastDetections = [];
        this.guidanceInterval = null;
        
        // Navigation targets with detection criteria
        this.targets = {
            exit: {
                name: 'exit',
                keywords: ['exit', 'exit sign', 'emergency exit'],
                detectMethod: 'detectExit',
                icon: '🚪',
                priority: 1
            },
            stairs: {
                name: 'stairs',
                keywords: ['stairs', 'staircase', 'steps'],
                detectMethod: 'detectStairs',
                icon: '🪜',
                priority: 2
            },
            door: {
                name: 'door',
                keywords: ['door'],
                detectMethod: 'detectDoor',
                icon: '🚪',
                priority: 3
            },
            doorHandle: {
                name: 'door handle',
                keywords: ['handle', 'door handle', 'knob'],
                detectMethod: 'detectDoorHandle',
                icon: '🔘',
                priority: 4
            },
            seating: {
                name: 'seating',
                keywords: ['chair', 'bench', 'seat', 'couch', 'sofa'],
                detectMethod: 'detectSeating',
                icon: '💺',
                priority: 5
            },
            elevator: {
                name: 'elevator',
                keywords: ['elevator', 'lift'],
                detectMethod: 'detectElevator',
                icon: '🛗',
                priority: 2
            }
        };
        
        // Spatial guidance state
        this.stairClimbingActive = false;
        this.stairDirection = 'up'; // up or down
        this.stairStepCount = 0;
        this.lastStairPosition = null;
        
        // Distance estimation (real-world sizes in meters)
        this.objectSizes = {
            door: { width: 0.9, height: 2.1 },
            doorHandle: { width: 0.15, height: 0.1 },
            exitSign: { width: 0.4, height: 0.2 },
            chair: { width: 0.5, height: 0.9 },
            bench: { width: 1.5, height: 0.5 },
            couch: { width: 2.0, height: 0.9 },
            stairStep: { width: 1.0, height: 0.18 },
            elevator: { width: 1.2, height: 2.2 }
        };
        
        // Direction mapping
        this.directions = {
            farLeft: { angle: -60, name: 'far left', clock: '10 o\'clock' },
            left: { angle: -30, name: 'to your left', clock: '11 o\'clock' },
            slightLeft: { angle: -15, name: 'slightly left', clock: '11 o\'clock' },
            center: { angle: 0, name: 'straight ahead', clock: '12 o\'clock' },
            slightRight: { angle: 15, name: 'slightly right', clock: '1 o\'clock' },
            right: { angle: 30, name: 'to your right', clock: '1 o\'clock' },
            farRight: { angle: 60, name: 'far right', clock: '2 o\'clock' }
        };
        
        console.log('[IndoorNav] Initialized');
    }
    
    // ===== MAIN GUIDANCE FUNCTIONS =====
    
    /**
     * Guide to exit (emergency or regular)
     * @param {boolean} emergency - Whether this is an emergency
     */
    async guideToExit(emergency = false) {
        this.currentTarget = this.targets.exit;
        
        const prefix = emergency ? 'Emergency exit guidance activated.' : 'Exit guidance activated.';
        speechManager.speak(
            `${prefix} I will help you find the nearest exit. Please slowly pan your camera around the room.`,
            true
        );
        
        await this.startGuidance('exit', {
            emergency: emergency,
            announceInterval: emergency ? 1500 : 2500,
            prioritizeExitSigns: true
        });
    }
    
    /**
     * Guide to stairs
     * @param {string} direction - 'up' or 'down'
     */
    async guideToStairs(direction = 'any') {
        this.currentTarget = this.targets.stairs;
        this.stairDirection = direction;
        
        let message = 'Stair guidance activated. ';
        if (direction === 'up') {
            message += 'Looking for stairs going up.';
        } else if (direction === 'down') {
            message += 'Looking for stairs going down.';
        } else {
            message += 'Looking for any stairs.';
        }
        message += ' Please pan your camera slowly.';
        
        speechManager.speak(message, true);
        
        await this.startGuidance('stairs', {
            direction: direction,
            announceInterval: 2000
        });
    }
    
    /**
     * Guide to door
     */
    async guideToDoor() {
        this.currentTarget = this.targets.door;
        
        speechManager.speak(
            'Door guidance activated. I will help you locate and approach a door. ' +
            'Please pan your camera around the room.',
            true
        );
        
        await this.startGuidance('door', {
            includeHandle: true,
            announceInterval: 2000
        });
    }
    
    /**
     * Guide to door handle (precise guidance)
     */
    async guideToDoorHandle() {
        this.currentTarget = this.targets.doorHandle;
        
        speechManager.speak(
            'Door handle guidance activated. Point your camera at the door. ' +
            'I will guide your hand to the handle.',
            true
        );
        
        await this.startGuidance('doorHandle', {
            precisionMode: true,
            announceInterval: 1000
        });
    }
    
    /**
     * Guide to seating
     */
    async guideToSeating() {
        this.currentTarget = this.targets.seating;
        
        speechManager.speak(
            'Seating guidance activated. Looking for chairs, benches, or other seating. ' +
            'Please pan your camera around.',
            true
        );
        
        await this.startGuidance('seating', {
            announceInterval: 2500,
            checkOccupied: true
        });
    }
    
    /**
     * Guide stair climbing (step-by-step)
     * @param {string} direction - 'up' or 'down'
     */
    async guideStairClimbing(direction = 'up') {
        this.stairClimbingActive = true;
        this.stairDirection = direction;
        this.stairStepCount = 0;
        
        const action = direction === 'up' ? 'climbing' : 'descending';
        
        speechManager.speak(
            `Stair ${action} assistance activated. ` +
            `I will guide you step by step. ` +
            `Point your camera down at the stairs. ` +
            `Say "ready" before each step, and I will tell you when to step. ` +
            `Say "stop" when you reach the end.`,
            true
        );
        
        this.startStairClimbingGuidance(direction);
    }
    
    /**
     * Stop current guidance
     */
    stopGuidance() {
        this.isActive = false;
        this.currentTarget = null;
        this.stairClimbingActive = false;
        
        if (this.guidanceInterval) {
            clearInterval(this.guidanceInterval);
            this.guidanceInterval = null;
        }
        
        cameraManager.stopFrameProcessing();
        speechManager.speak('Guidance stopped.', true);
    }
    
    // ===== DETECTION METHODS =====
    
    /**
     * Detect exit signs and emergency exits
     * @param {Array} detections - Object detections
     * @param {HTMLCanvasElement} canvas - Camera frame
     * @returns {Array} - Exit detections
     */
    detectExit(detections, canvas) {
        const exits = [];
        
        // Look for doors that might be exits
        const doors = detections.filter(d => 
            d.class === 'door' || 
            d.class.includes('exit') ||
            d.class === 'person' && d.bbox.y < canvas.height * 0.3 // Exit signs often above
        );
        
        // Also check for exit sign colors (green/red backgrounds)
        const exitSignRegions = this.detectExitSignsByColor(canvas);
        
        // Combine results
        for (const door of doors) {
            const exitInfo = this.analyzeAsExit(door, canvas);
            if (exitInfo.isLikelyExit) {
                exits.push({
                    ...door,
                    type: 'exit',
                    confidence: exitInfo.confidence,
                    distance: this.estimateDistance(door.bbox, 'door', canvas),
                    direction: this.getDirection(door.bbox, canvas)
                });
            }
        }
        
        for (const region of exitSignRegions) {
            exits.push({
                type: 'exit_sign',
                bbox: region,
                confidence: 0.7,
                distance: this.estimateDistance(region, 'exitSign', canvas),
                direction: this.getDirection(region, canvas)
            });
        }
        
        return exits.sort((a, b) => a.distance - b.distance);
    }
    
    /**
     * Detect exit signs by color analysis
     */
    detectExitSignsByColor(canvas) {
        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;
        
        // Sample top third of image where exit signs usually are
        const topRegion = ctx.getImageData(0, 0, width, Math.floor(height * 0.4));
        const data = topRegion.data;
        
        const regions = [];
        const blockSize = 20;
        
        for (let y = 0; y < topRegion.height; y += blockSize) {
            for (let x = 0; x < width; x += blockSize) {
                let greenCount = 0;
                let redCount = 0;
                let totalPixels = 0;
                
                for (let by = 0; by < blockSize && y + by < topRegion.height; by++) {
                    for (let bx = 0; bx < blockSize && x + bx < width; bx++) {
                        const idx = ((y + by) * width + (x + bx)) * 4;
                        const r = data[idx];
                        const g = data[idx + 1];
                        const b = data[idx + 2];
                        
                        // Check for exit sign green (bright green)
                        if (g > 100 && g > r * 1.3 && g > b * 1.3) {
                            greenCount++;
                        }
                        // Check for exit sign red (emergency)
                        if (r > 150 && r > g * 1.5 && r > b * 1.5) {
                            redCount++;
                        }
                        totalPixels++;
                    }
                }
                
                const greenRatio = greenCount / totalPixels;
                const redRatio = redCount / totalPixels;
                
                if (greenRatio > 0.3 || redRatio > 0.3) {
                    regions.push({
                        x: x,
                        y: y,
                        width: blockSize,
                        height: blockSize,
                        isEmergency: redRatio > greenRatio
                    });
                }
            }
        }
        
        // Merge nearby regions
        return this.mergeRegions(regions);
    }
    
    /**
     * Analyze if a door detection is likely an exit
     */
    analyzeAsExit(detection, canvas) {
        // Check if there's text above that might say "EXIT"
        // Check door position (exits often at edges of rooms)
        // Check for exit sign colors nearby
        
        const x = detection.bbox.x + detection.bbox.width / 2;
        const isAtEdge = x < canvas.width * 0.2 || x > canvas.width * 0.8;
        
        return {
            isLikelyExit: isAtEdge || detection.class.includes('exit'),
            confidence: isAtEdge ? 0.6 : 0.4
        };
    }
    
    /**
     * Detect stairs
     * @param {Array} detections - Object detections
     * @param {HTMLCanvasElement} canvas - Camera frame
     * @returns {Array} - Stair detections
     */
    detectStairs(detections, canvas) {
        const stairs = [];
        
        // Look for stair-like patterns using edge detection
        const stairPatterns = this.detectStairPatterns(canvas);
        
        for (const pattern of stairPatterns) {
            const direction = this.determineStairDirection(pattern, canvas);
            stairs.push({
                type: 'stairs',
                bbox: pattern.bbox,
                confidence: pattern.confidence,
                distance: this.estimateDistance(pattern.bbox, 'stairStep', canvas),
                direction: this.getDirection(pattern.bbox, canvas),
                stairDirection: direction, // 'up' or 'down'
                stepCount: pattern.stepCount
            });
        }
        
        return stairs;
    }
    
    /**
     * Detect stair patterns using horizontal edge analysis
     */
    detectStairPatterns(canvas) {
        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;
        
        // Scale down for performance
        const scale = 0.25;
        const sw = Math.floor(width * scale);
        const sh = Math.floor(height * scale);
        
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = sw;
        tempCanvas.height = sh;
        const tempCtx = tempCanvas.getContext('2d');
        tempCtx.drawImage(canvas, 0, 0, sw, sh);
        
        const imageData = tempCtx.getImageData(0, 0, sw, sh);
        const data = imageData.data;
        
        // Convert to grayscale
        const gray = new Float32Array(sw * sh);
        for (let i = 0; i < gray.length; i++) {
            const idx = i * 4;
            gray[i] = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
        }
        
        // Detect horizontal edges (stair steps create horizontal lines)
        const horizontalEdges = [];
        
        for (let y = 1; y < sh - 1; y++) {
            let edgeStrength = 0;
            let edgeStart = -1;
            let edgeEnd = -1;
            
            for (let x = 1; x < sw - 1; x++) {
                const idx = y * sw + x;
                const dy = Math.abs(gray[idx + sw] - gray[idx - sw]);
                
                if (dy > 30) {
                    if (edgeStart < 0) edgeStart = x;
                    edgeEnd = x;
                    edgeStrength += dy;
                }
            }
            
            // Check if this is a significant horizontal edge
            const edgeLength = edgeEnd - edgeStart;
            if (edgeLength > sw * 0.3 && edgeStrength > 500) {
                horizontalEdges.push({
                    y: y,
                    xStart: edgeStart,
                    xEnd: edgeEnd,
                    strength: edgeStrength,
                    length: edgeLength
                });
            }
        }
        
        // Group evenly-spaced horizontal edges (stair pattern)
        const patterns = [];
        
        if (horizontalEdges.length >= 3) {
            // Check for evenly spaced edges
            for (let i = 0; i < horizontalEdges.length - 2; i++) {
                const e1 = horizontalEdges[i];
                const e2 = horizontalEdges[i + 1];
                const spacing1 = e2.y - e1.y;
                
                let stepCount = 2;
                let lastY = e2.y;
                
                for (let j = i + 2; j < horizontalEdges.length; j++) {
                    const e3 = horizontalEdges[j];
                    const spacing = e3.y - lastY;
                    
                    // Allow 20% variance in spacing
                    if (Math.abs(spacing - spacing1) < spacing1 * 0.2) {
                        stepCount++;
                        lastY = e3.y;
                    } else {
                        break;
                    }
                }
                
                if (stepCount >= 3) {
                    patterns.push({
                        bbox: {
                            x: Math.floor(e1.xStart / scale),
                            y: Math.floor(e1.y / scale),
                            width: Math.floor((e1.xEnd - e1.xStart) / scale),
                            height: Math.floor((lastY - e1.y) / scale)
                        },
                        confidence: Math.min(0.9, 0.5 + stepCount * 0.1),
                        stepCount: stepCount,
                        spacing: spacing1 / scale
                    });
                }
            }
        }
        
        return patterns;
    }
    
    /**
     * Determine if stairs go up or down
     */
    determineStairDirection(pattern, canvas) {
        // If stairs are in lower portion and getting larger toward bottom, going down
        // If stairs are in lower portion and getting smaller toward bottom, going up
        
        const centerY = pattern.bbox.y + pattern.bbox.height / 2;
        const isInLowerHalf = centerY > canvas.height * 0.5;
        
        // Simple heuristic: stairs in front/below us typically go up
        // Stairs seen from above go down
        return isInLowerHalf ? 'up' : 'down';
    }
    
    /**
     * Detect doors
     * @param {Array} detections - Object detections
     * @param {HTMLCanvasElement} canvas - Camera frame
     * @returns {Array} - Door detections
     */
    detectDoor(detections, canvas) {
        const doors = [];
        
        // Use VisionDetectionService if available
        if (typeof visionDetectionService !== 'undefined') {
            const visionDoors = visionDetectionService.detectDoor(canvas);
            doors.push(...visionDoors);
        }
        
        // Also detect using rectangle patterns
        const rectanglePatterns = this.detectDoorPatterns(canvas);
        
        for (const pattern of rectanglePatterns) {
            doors.push({
                type: 'door',
                bbox: pattern.bbox,
                confidence: pattern.confidence,
                distance: this.estimateDistance(pattern.bbox, 'door', canvas),
                direction: this.getDirection(pattern.bbox, canvas),
                hasFrame: pattern.hasFrame,
                isOpen: pattern.isOpen
            });
        }
        
        // Remove duplicates
        return this.removeDuplicates(doors);
    }
    
    /**
     * Detect door patterns using edge detection
     */
    detectDoorPatterns(canvas) {
        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;
        
        // Scale down
        const scale = 0.3;
        const sw = Math.floor(width * scale);
        const sh = Math.floor(height * scale);
        
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = sw;
        tempCanvas.height = sh;
        const tempCtx = tempCanvas.getContext('2d');
        tempCtx.drawImage(canvas, 0, 0, sw, sh);
        
        const imageData = tempCtx.getImageData(0, 0, sw, sh);
        
        // Find vertical edges (door frames)
        const patterns = [];
        
        // Simple approach: look for tall rectangles with aspect ratio ~2:1
        const aspectRatioMin = 1.5;
        const aspectRatioMax = 3.0;
        
        // Use contour-like detection simplified
        const edges = this.detectEdges(imageData);
        const rectangles = this.findRectangles(edges, sw, sh);
        
        for (const rect of rectangles) {
            const aspectRatio = rect.height / rect.width;
            
            if (aspectRatio >= aspectRatioMin && aspectRatio <= aspectRatioMax) {
                // Check if this looks like a door
                const minWidth = sw * 0.1;
                const minHeight = sh * 0.3;
                
                if (rect.width >= minWidth && rect.height >= minHeight) {
                    patterns.push({
                        bbox: {
                            x: Math.floor(rect.x / scale),
                            y: Math.floor(rect.y / scale),
                            width: Math.floor(rect.width / scale),
                            height: Math.floor(rect.height / scale)
                        },
                        confidence: 0.6,
                        hasFrame: true,
                        isOpen: false // Would need more analysis
                    });
                }
            }
        }
        
        return patterns;
    }
    
    /**
     * Detect edges in image
     */
    detectEdges(imageData) {
        const width = imageData.width;
        const height = imageData.height;
        const data = imageData.data;
        const edges = new Uint8Array(width * height);
        
        for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
                const idx = (y * width + x) * 4;
                const idxL = (y * width + x - 1) * 4;
                const idxR = (y * width + x + 1) * 4;
                const idxU = ((y - 1) * width + x) * 4;
                const idxD = ((y + 1) * width + x) * 4;
                
                const gx = Math.abs(data[idxR] - data[idxL]);
                const gy = Math.abs(data[idxD] - data[idxU]);
                
                edges[y * width + x] = (gx + gy) > 50 ? 255 : 0;
            }
        }
        
        return edges;
    }
    
    /**
     * Find rectangles in edge image
     */
    findRectangles(edges, width, height) {
        const rectangles = [];
        
        // Simple approach: find bounding boxes of connected edge regions
        const visited = new Uint8Array(width * height);
        
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                if (edges[y * width + x] === 255 && !visited[y * width + x]) {
                    const rect = this.floodFillBounds(edges, visited, x, y, width, height);
                    if (rect.area > 100) {
                        rectangles.push(rect);
                    }
                }
            }
        }
        
        return rectangles;
    }
    
    /**
     * Flood fill to get bounding box
     */
    floodFillBounds(edges, visited, startX, startY, width, height) {
        const stack = [[startX, startY]];
        let minX = startX, maxX = startX;
        let minY = startY, maxY = startY;
        let area = 0;
        
        while (stack.length > 0 && stack.length < 10000) {
            const [x, y] = stack.pop();
            
            if (x < 0 || x >= width || y < 0 || y >= height) continue;
            if (visited[y * width + x] || edges[y * width + x] === 0) continue;
            
            visited[y * width + x] = 1;
            area++;
            
            minX = Math.min(minX, x);
            maxX = Math.max(maxX, x);
            minY = Math.min(minY, y);
            maxY = Math.max(maxY, y);
            
            stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
        }
        
        return {
            x: minX,
            y: minY,
            width: maxX - minX,
            height: maxY - minY,
            area: area
        };
    }
    
    /**
     * Detect door handle
     * @param {Array} detections - Object detections
     * @param {HTMLCanvasElement} canvas - Camera frame
     * @returns {Array} - Door handle detections
     */
    detectDoorHandle(detections, canvas) {
        const handles = [];
        
        // First detect doors
        const doors = this.detectDoor(detections, canvas);
        
        for (const door of doors) {
            // Handle typically at 0.9-1.1m height and 0.1m from edge
            const handleRegion = this.findHandleRegion(door.bbox, canvas);
            
            if (handleRegion) {
                handles.push({
                    type: 'doorHandle',
                    bbox: handleRegion,
                    confidence: 0.7,
                    distance: this.estimateDistance(handleRegion, 'doorHandle', canvas),
                    direction: this.getDirection(handleRegion, canvas),
                    parentDoor: door
                });
            }
        }
        
        return handles;
    }
    
    /**
     * Find handle region within door
     */
    findHandleRegion(doorBbox, canvas) {
        // Handle is typically:
        // - At about 40-50% down from top of door
        // - Near one edge (left or right)
        
        const handleHeight = doorBbox.height * 0.1;
        const handleWidth = doorBbox.width * 0.15;
        
        // Assume handle on right side (most common)
        return {
            x: doorBbox.x + doorBbox.width * 0.8,
            y: doorBbox.y + doorBbox.height * 0.45,
            width: handleWidth,
            height: handleHeight
        };
    }
    
    /**
     * Detect seating
     * @param {Array} detections - Object detections
     * @param {HTMLCanvasElement} canvas - Camera frame
     * @returns {Array} - Seating detections
     */
    detectSeating(detections, canvas) {
        const seating = [];
        
        // Filter for seating-related classes
        const seatingClasses = ['chair', 'couch', 'bench', 'sofa', 'seat'];
        
        for (const detection of detections) {
            const classLower = detection.class.toLowerCase();
            
            for (const sc of seatingClasses) {
                if (classLower.includes(sc)) {
                    seating.push({
                        type: 'seating',
                        subtype: sc,
                        bbox: detection.bbox,
                        confidence: detection.score,
                        distance: this.estimateDistance(detection.bbox, sc, canvas),
                        direction: this.getDirection(detection.bbox, canvas),
                        isOccupied: this.checkIfOccupied(detection, detections)
                    });
                    break;
                }
            }
        }
        
        return seating.sort((a, b) => a.distance - b.distance);
    }
    
    /**
     * Check if seating is occupied
     */
    checkIfOccupied(seatDetection, allDetections) {
        // Check if a person detection overlaps with the seat
        const persons = allDetections.filter(d => d.class === 'person');
        
        for (const person of persons) {
            if (this.bboxOverlap(seatDetection.bbox, person.bbox) > 0.3) {
                return true;
            }
        }
        
        return false;
    }
    
    /**
     * Calculate bounding box overlap ratio
     */
    bboxOverlap(bbox1, bbox2) {
        const x1 = Math.max(bbox1.x, bbox2.x);
        const y1 = Math.max(bbox1.y, bbox2.y);
        const x2 = Math.min(bbox1.x + bbox1.width, bbox2.x + bbox2.width);
        const y2 = Math.min(bbox1.y + bbox1.height, bbox2.y + bbox2.height);
        
        if (x2 <= x1 || y2 <= y1) return 0;
        
        const intersection = (x2 - x1) * (y2 - y1);
        const area1 = bbox1.width * bbox1.height;
        
        return intersection / area1;
    }
    
    // ===== SPATIAL GUIDANCE =====
    
    /**
     * Start guidance to target
     */
    async startGuidance(targetType, options = {}) {
        this.isActive = true;
        const target = this.targets[targetType];
        
        cameraManager.startFrameProcessing(async (frame) => {
            if (!this.isActive) return;
            
            try {
                // Get object detections
                let detections = [];
                if (typeof detectionManager !== 'undefined' && detectionManager.lastDetections) {
                    detections = detectionManager.lastDetections;
                }
                
                // Detect target
                const detected = await this.detectTarget(targetType, detections, frame.canvas);
                this.lastDetections = detected;
                
                // Provide guidance
                this.announceGuidance(detected, target, options);
                
            } catch (error) {
                console.error('[IndoorNav] Guidance error:', error);
            }
        });
        
        // Set up periodic announcements
        const interval = options.announceInterval || 2500;
        this.guidanceInterval = setInterval(() => {
            if (this.isActive && this.lastDetections.length > 0) {
                this.announceGuidance(this.lastDetections, target, options);
            }
        }, interval);
    }
    
    /**
     * Detect target type
     */
    async detectTarget(targetType, detections, canvas) {
        switch (targetType) {
            case 'exit':
                return this.detectExit(detections, canvas);
            case 'stairs':
                return this.detectStairs(detections, canvas);
            case 'door':
                return this.detectDoor(detections, canvas);
            case 'doorHandle':
                return this.detectDoorHandle(detections, canvas);
            case 'seating':
                return this.detectSeating(detections, canvas);
            default:
                return [];
        }
    }
    
    /**
     * Announce guidance based on detections
     */
    announceGuidance(detections, target, options) {
        if (detections.length === 0) {
            speechManager.speak(
                `No ${target.name} detected. Please continue scanning slowly.`,
                true
            );
            return;
        }
        
        // Get closest detection
        const closest = detections[0];
        const direction = closest.direction;
        const distance = closest.distance;
        
        let message = `${target.icon} ${target.name} detected `;
        message += `${direction.name}, `;
        message += `approximately ${this.formatDistance(distance)}. `;
        
        // Add specific guidance
        if (distance < 1) {
            message += this.getCloseRangeGuidance(closest, target);
        } else if (distance < 3) {
            message += this.getMidRangeGuidance(closest, target);
        } else {
            message += `Continue moving ${direction.name}.`;
        }
        
        // Add additional info
        if (target.name === 'seating' && closest.isOccupied) {
            message += ' This seat appears to be occupied.';
        }
        
        if (target.name === 'stairs' && closest.stairDirection) {
            message += ` Stairs going ${closest.stairDirection}.`;
        }
        
        speechManager.speak(message, true);
    }
    
    /**
     * Get close range guidance (< 1m)
     */
    getCloseRangeGuidance(detection, target) {
        const directionName = detection.direction.name;
        
        switch (target.name) {
            case 'door':
                return `You are very close to the door. Reach ${directionName} to find it.`;
            case 'door handle':
                return `Handle is within reach. Extend your hand ${directionName}.`;
            case 'seating':
                return `Seat is right beside you. Carefully sit down.`;
            case 'stairs':
                return `Stairs are right in front. Use handrail if available.`;
            case 'exit':
                return `Exit is right here. Proceed carefully.`;
            default:
                return `Target is within reach.`;
        }
    }
    
    /**
     * Get mid range guidance (1-3m)
     */
    getMidRangeGuidance(detection, target) {
        const steps = Math.round(detection.distance / 0.75); // Approx step length
        return `Take about ${steps} steps ${detection.direction.name}.`;
    }
    
    /**
     * Start stair climbing guidance
     */
    startStairClimbingGuidance(direction) {
        const action = direction === 'up' ? 'step up' : 'step down';
        
        cameraManager.startFrameProcessing(async (frame) => {
            if (!this.stairClimbingActive) return;
            
            // Analyze stair position in frame
            const stairAnalysis = this.analyzeStairPosition(frame.canvas);
            
            if (stairAnalysis.stepVisible) {
                // Update UI with step position
                this.updateStairGuidanceUI(stairAnalysis);
            }
        });
    }
    
    /**
     * Analyze stair step position for precise guidance
     */
    analyzeStairPosition(canvas) {
        const stairs = this.detectStairPatterns(canvas);
        
        if (stairs.length === 0) {
            return { stepVisible: false };
        }
        
        const stair = stairs[0];
        const centerX = stair.bbox.x + stair.bbox.width / 2;
        const canvasCenter = canvas.width / 2;
        
        return {
            stepVisible: true,
            isAligned: Math.abs(centerX - canvasCenter) < canvas.width * 0.1,
            stepHeight: stair.spacing,
            stepCount: stair.stepCount,
            alignment: centerX < canvasCenter ? 'left' : 'right'
        };
    }
    
    /**
     * Handle "ready" command for stair climbing
     */
    handleStairReady() {
        if (!this.stairClimbingActive) return;
        
        this.stairStepCount++;
        const action = this.stairDirection === 'up' ? 'Step up now' : 'Step down now';
        
        speechManager.speak(`${action}. Step ${this.stairStepCount}.`, true);
    }
    
    // ===== UTILITY METHODS =====
    
    /**
     * Estimate distance using object size
     */
    estimateDistance(bbox, objectType, canvas) {
        const sizeRef = this.objectSizes[objectType] || { width: 0.5, height: 0.5 };
        
        // Use height for distance estimation
        const objectHeightInPixels = bbox.height;
        const imageHeight = canvas.height;
        
        // Assume typical camera FOV
        const fov = 60; // degrees
        const fovRadians = (fov * Math.PI) / 180;
        const focalLength = imageHeight / (2 * Math.tan(fovRadians / 2));
        
        // Calculate distance using pinhole camera model
        const distance = (sizeRef.height * focalLength) / objectHeightInPixels;
        
        return Math.max(0.3, Math.min(20, distance)); // Clamp to reasonable range
    }
    
    /**
     * Get direction from bounding box position
     */
    getDirection(bbox, canvas) {
        const centerX = bbox.x + bbox.width / 2;
        const normalizedX = centerX / canvas.width;
        
        if (normalizedX < 0.15) return this.directions.farLeft;
        if (normalizedX < 0.30) return this.directions.left;
        if (normalizedX < 0.45) return this.directions.slightLeft;
        if (normalizedX < 0.55) return this.directions.center;
        if (normalizedX < 0.70) return this.directions.slightRight;
        if (normalizedX < 0.85) return this.directions.right;
        return this.directions.farRight;
    }
    
    /**
     * Format distance for speech
     */
    formatDistance(meters) {
        if (meters < 1) {
            return `${Math.round(meters * 100)} centimeters`;
        } else if (meters < 2) {
            return `about ${meters.toFixed(1)} meters`;
        } else {
            return `about ${Math.round(meters)} meters`;
        }
    }
    
    /**
     * Merge nearby regions
     */
    mergeRegions(regions) {
        if (regions.length <= 1) return regions;
        
        const merged = [];
        const used = new Array(regions.length).fill(false);
        
        for (let i = 0; i < regions.length; i++) {
            if (used[i]) continue;
            
            let current = { ...regions[i] };
            
            for (let j = i + 1; j < regions.length; j++) {
                if (used[j]) continue;
                
                if (this.regionsNear(current, regions[j])) {
                    current = {
                        x: Math.min(current.x, regions[j].x),
                        y: Math.min(current.y, regions[j].y),
                        width: Math.max(current.x + current.width, regions[j].x + regions[j].width) - Math.min(current.x, regions[j].x),
                        height: Math.max(current.y + current.height, regions[j].y + regions[j].height) - Math.min(current.y, regions[j].y),
                        isEmergency: current.isEmergency || regions[j].isEmergency
                    };
                    used[j] = true;
                }
            }
            
            merged.push(current);
        }
        
        return merged;
    }
    
    /**
     * Check if regions are near each other
     */
    regionsNear(r1, r2) {
        const margin = 30;
        return !(r1.x + r1.width + margin < r2.x ||
                 r2.x + r2.width + margin < r1.x ||
                 r1.y + r1.height + margin < r2.y ||
                 r2.y + r2.height + margin < r1.y);
    }
    
    /**
     * Remove duplicate detections
     */
    removeDuplicates(detections) {
        const unique = [];
        
        for (const det of detections) {
            let isDuplicate = false;
            
            for (const u of unique) {
                if (this.bboxOverlap(det.bbox, u.bbox) > 0.5) {
                    isDuplicate = true;
                    // Keep the one with higher confidence
                    if (det.confidence > u.confidence) {
                        Object.assign(u, det);
                    }
                    break;
                }
            }
            
            if (!isDuplicate) {
                unique.push(det);
            }
        }
        
        return unique;
    }
    
    /**
     * Update stair guidance UI
     */
    updateStairGuidanceUI(analysis) {
        const modeContent = document.getElementById('mode-content');
        if (!modeContent) return;
        
        const alignmentClass = analysis.isAligned ? 'aligned' : 'misaligned';
        
        // Could update visual feedback here
    }
}

// Create global instance
const indoorNavigationHelpers = new IndoorNavigationHelpers();
