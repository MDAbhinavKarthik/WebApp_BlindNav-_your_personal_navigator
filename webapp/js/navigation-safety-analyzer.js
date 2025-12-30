/**
 * BlindNav+ Navigation Safety Analyzer
 * Advanced scene analysis for safe independent navigation
 * Detects: walls, sky, clear pathways, steps, holes, obstacles
 * 
 * Uses computer vision techniques:
 * - Region-based scene analysis
 * - Color/texture analysis for surface detection
 * - Edge detection for steps and boundaries
 * - Depth estimation for holes and drop-offs
 */

class NavigationSafetyAnalyzer {
    constructor() {
        this.isInitialized = false;
        
        // Scene regions (divide frame into analysis zones)
        this.regions = {
            sky: { yStart: 0, yEnd: 0.25 },      // Top 25%
            horizon: { yStart: 0.25, yEnd: 0.4 }, // 25-40%
            midground: { yStart: 0.4, yEnd: 0.65 }, // 40-65%
            foreground: { yStart: 0.65, yEnd: 0.85 }, // 65-85% - Walking path
            immediate: { yStart: 0.85, yEnd: 1.0 }  // Bottom 15% - Immediate ground
        };
        
        // Color profiles for surface detection
        this.colorProfiles = {
            sky: {
                blue: { h: [180, 240], s: [20, 100], l: [40, 90] },
                cloudy: { h: [0, 360], s: [0, 20], l: [60, 95] },
                sunset: { h: [0, 50], s: [30, 100], l: [40, 80] }
            },
            ground: {
                concrete: { h: [0, 30], s: [0, 15], l: [30, 70] },
                asphalt: { h: [0, 360], s: [0, 10], l: [10, 40] },
                grass: { h: [60, 150], s: [20, 80], l: [20, 60] },
                dirt: { h: [20, 50], s: [20, 60], l: [20, 50] },
                tiles: { h: [0, 360], s: [0, 30], l: [40, 80] }
            },
            wall: {
                brick: { h: [0, 30], s: [30, 70], l: [20, 50] },
                painted: { h: [0, 360], s: [10, 50], l: [50, 90] },
                concrete: { h: [0, 30], s: [0, 20], l: [40, 70] }
            },
            hazard: {
                water: { h: [180, 220], s: [20, 60], l: [30, 60] },
                hole: { h: [0, 360], s: [0, 20], l: [0, 25] }  // Very dark
            }
        };
        
        // Step detection parameters
        this.stepDetection = {
            minEdgeStrength: 30,
            horizontalLineThreshold: 0.7,  // 70% horizontal
            minStepHeight: 10,  // pixels
            maxStepHeight: 80,  // pixels
            stepPatternCount: 2  // Minimum edges to detect stairs
        };
        
        // Pathway analysis
        this.pathwayAnalysis = {
            clearPathMinWidth: 0.3,  // 30% of frame width
            obstacleThreshold: 0.15,  // 15% obstacle density = blocked
            edgeDensityThreshold: 0.3  // High edges = potential obstacles
        };
        
        // Safety thresholds
        this.safetyThresholds = {
            immediateHazardDistance: 1.0,  // meters
            warningDistance: 3.0,  // meters
            stepWarningDistance: 2.0  // meters
        };
        
        // Analysis results cache
        this.lastAnalysis = null;
        this.analysisInterval = 200;  // ms between analyses
        this.lastAnalysisTime = 0;
        
        // Callbacks
        this.onHazardDetected = null;
        this.onPathwayClear = null;
        this.onStepsDetected = null;
        this.onWallDetected = null;
    }
    
    /**
     * Initialize the analyzer
     */
    initialize() {
        this.isInitialized = true;
        console.log('[SafetyAnalyzer] Navigation Safety Analyzer initialized');
        console.log('[SafetyAnalyzer] Capabilities: Wall detection, Sky detection, Pathway analysis, Step detection, Hole detection');
        return true;
    }
    
    /**
     * Main analysis function - analyzes frame for navigation safety
     * @param {Object} frame - Camera frame with canvas
     * @param {Array} detections - Object detections from COCO-SSD
     * @returns {Object} - Comprehensive safety analysis
     */
    async analyzeFrame(frame, detections = []) {
        if (!this.isInitialized) {
            this.initialize();
        }
        
        const now = Date.now();
        if (now - this.lastAnalysisTime < this.analysisInterval && this.lastAnalysis) {
            return this.lastAnalysis;
        }
        
        const ctx = frame.canvas.getContext('2d');
        const imageData = ctx.getImageData(0, 0, frame.width, frame.height);
        
        // Perform comprehensive analysis
        const analysis = {
            timestamp: now,
            frameSize: { width: frame.width, height: frame.height },
            
            // Scene understanding
            scene: this.analyzeSceneRegions(imageData, frame.width, frame.height),
            
            // Pathway analysis
            pathway: this.analyzePathway(imageData, frame.width, frame.height, detections),
            
            // Step/stair detection
            steps: this.detectSteps(imageData, frame.width, frame.height),
            
            // Wall detection
            walls: this.detectWalls(imageData, frame.width, frame.height, detections),
            
            // Hole/drop-off detection
            hazards: this.detectHazards(imageData, frame.width, frame.height),
            
            // Combined safety assessment
            safety: null  // Will be computed below
        };
        
        // Compute overall safety assessment
        analysis.safety = this.computeSafetyAssessment(analysis, detections);
        
        // Generate voice guidance
        analysis.voiceGuidance = this.generateVoiceGuidance(analysis);
        
        this.lastAnalysis = analysis;
        this.lastAnalysisTime = now;
        
        // Trigger callbacks
        this.triggerCallbacks(analysis);
        
        return analysis;
    }
    
    /**
     * Analyze scene regions (sky, ground, walls)
     */
    analyzeSceneRegions(imageData, width, height) {
        const data = imageData.data;
        const regions = {};
        
        for (const [regionName, bounds] of Object.entries(this.regions)) {
            const yStart = Math.floor(bounds.yStart * height);
            const yEnd = Math.floor(bounds.yEnd * height);
            
            let totalR = 0, totalG = 0, totalB = 0;
            let pixelCount = 0;
            let brightPixels = 0;
            let darkPixels = 0;
            let bluePixels = 0;
            let greenPixels = 0;
            
            for (let y = yStart; y < yEnd; y++) {
                for (let x = 0; x < width; x++) {
                    const idx = (y * width + x) * 4;
                    const r = data[idx];
                    const g = data[idx + 1];
                    const b = data[idx + 2];
                    
                    totalR += r;
                    totalG += g;
                    totalB += b;
                    pixelCount++;
                    
                    const brightness = (r + g + b) / 3;
                    if (brightness > 200) brightPixels++;
                    if (brightness < 50) darkPixels++;
                    if (b > r && b > g && b > 100) bluePixels++;
                    if (g > r && g > b && g > 80) greenPixels++;
                }
            }
            
            const avgR = totalR / pixelCount;
            const avgG = totalG / pixelCount;
            const avgB = totalB / pixelCount;
            const avgBrightness = (avgR + avgG + avgB) / 3;
            
            regions[regionName] = {
                avgColor: { r: avgR, g: avgG, b: avgB },
                brightness: avgBrightness,
                brightRatio: brightPixels / pixelCount,
                darkRatio: darkPixels / pixelCount,
                blueRatio: bluePixels / pixelCount,
                greenRatio: greenPixels / pixelCount,
                classification: this.classifyRegion(regionName, {
                    avgR, avgG, avgB, avgBrightness,
                    brightRatio: brightPixels / pixelCount,
                    darkRatio: darkPixels / pixelCount,
                    blueRatio: bluePixels / pixelCount,
                    greenRatio: greenPixels / pixelCount
                })
            };
        }
        
        return regions;
    }
    
    /**
     * Classify a region based on color analysis
     */
    classifyRegion(regionName, stats) {
        const { avgR, avgG, avgB, avgBrightness, brightRatio, darkRatio, blueRatio, greenRatio } = stats;
        
        // Sky detection (top regions)
        if (regionName === 'sky' || regionName === 'horizon') {
            if (blueRatio > 0.3 && avgBrightness > 120) {
                return { type: 'sky', subtype: 'clear', confidence: 0.8 + blueRatio * 0.2 };
            }
            if (brightRatio > 0.5 && avgBrightness > 180) {
                return { type: 'sky', subtype: 'cloudy', confidence: 0.7 };
            }
            if (avgBrightness > 100 && avgB > avgR * 0.8) {
                return { type: 'sky', subtype: 'overcast', confidence: 0.6 };
            }
        }
        
        // Ground detection (bottom regions)
        if (regionName === 'foreground' || regionName === 'immediate') {
            // Grass
            if (greenRatio > 0.25) {
                return { type: 'ground', subtype: 'grass', confidence: 0.7 + greenRatio * 0.3 };
            }
            // Dark surface (asphalt, dark tiles)
            if (darkRatio > 0.4 || avgBrightness < 80) {
                return { type: 'ground', subtype: 'asphalt', confidence: 0.7 };
            }
            // Light surface (concrete, light tiles)
            if (avgBrightness > 120 && avgBrightness < 200) {
                const colorVariance = Math.abs(avgR - avgG) + Math.abs(avgG - avgB);
                if (colorVariance < 30) {
                    return { type: 'ground', subtype: 'concrete', confidence: 0.7 };
                }
            }
            // Indoor floor
            if (avgBrightness > 80 && avgBrightness < 180) {
                return { type: 'ground', subtype: 'floor', confidence: 0.6 };
            }
        }
        
        // Wall detection (mid regions, uniform color)
        if (regionName === 'midground') {
            const colorVariance = Math.abs(avgR - avgG) + Math.abs(avgG - avgB);
            if (colorVariance < 40 && !blueRatio > 0.2) {
                return { type: 'wall', subtype: 'indoor', confidence: 0.5 };
            }
        }
        
        return { type: 'unknown', subtype: 'unknown', confidence: 0.3 };
    }
    
    /**
     * Analyze pathway for clear walking path
     */
    analyzePathway(imageData, width, height, detections) {
        const data = imageData.data;
        
        // Focus on walking region (bottom 40% of frame)
        const walkingRegionStart = Math.floor(height * 0.6);
        const walkingRegionEnd = height;
        
        // Divide into 5 columns for path analysis
        const columns = 5;
        const columnWidth = Math.floor(width / columns);
        const columnAnalysis = [];
        
        for (let col = 0; col < columns; col++) {
            const xStart = col * columnWidth;
            const xEnd = xStart + columnWidth;
            
            let obstaclePixels = 0;
            let totalPixels = 0;
            let edgeCount = 0;
            let avgBrightness = 0;
            
            for (let y = walkingRegionStart; y < walkingRegionEnd; y++) {
                for (let x = xStart; x < xEnd; x++) {
                    const idx = (y * width + x) * 4;
                    const brightness = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
                    avgBrightness += brightness;
                    totalPixels++;
                    
                    // Check for sudden brightness changes (edges/obstacles)
                    if (x > xStart) {
                        const prevIdx = (y * width + x - 1) * 4;
                        const prevBrightness = (data[prevIdx] + data[prevIdx + 1] + data[prevIdx + 2]) / 3;
                        if (Math.abs(brightness - prevBrightness) > 30) {
                            edgeCount++;
                        }
                    }
                    
                    // Very dark areas might be holes or obstacles
                    if (brightness < 40) {
                        obstaclePixels++;
                    }
                }
            }
            
            avgBrightness /= totalPixels;
            const edgeDensity = edgeCount / totalPixels;
            const obstacleDensity = obstaclePixels / totalPixels;
            
            // Check if any detected objects are in this column
            const objectsInColumn = detections.filter(det => {
                const objCenterX = det.bbox ? det.bbox.x + det.bbox.width / 2 : det.center?.x;
                return objCenterX >= xStart && objCenterX < xEnd;
            });
            
            const isClear = edgeDensity < this.pathwayAnalysis.edgeDensityThreshold &&
                           obstacleDensity < this.pathwayAnalysis.obstacleThreshold &&
                           objectsInColumn.length === 0;
            
            columnAnalysis.push({
                column: col,
                position: col === 0 ? 'far-left' : col === 1 ? 'left' : col === 2 ? 'center' : col === 3 ? 'right' : 'far-right',
                isClear,
                edgeDensity,
                obstacleDensity,
                avgBrightness,
                objects: objectsInColumn.map(o => o.class)
            });
        }
        
        // Determine best path
        const clearColumns = columnAnalysis.filter(c => c.isClear);
        let recommendedPath = 'blocked';
        let pathDescription = '';
        
        if (clearColumns.length === 0) {
            recommendedPath = 'blocked';
            pathDescription = 'Path appears blocked. Stop and reassess.';
        } else if (columnAnalysis[2].isClear) {
            recommendedPath = 'center';
            pathDescription = 'Center path is clear. Continue straight.';
        } else if (columnAnalysis[1].isClear || columnAnalysis[3].isClear) {
            recommendedPath = columnAnalysis[1].isClear ? 'left' : 'right';
            pathDescription = `Move slightly to your ${recommendedPath} for clear path.`;
        } else {
            const clearColumn = clearColumns[0];
            recommendedPath = clearColumn.position;
            pathDescription = `Path clear on your ${recommendedPath}.`;
        }
        
        return {
            columns: columnAnalysis,
            clearPathExists: clearColumns.length > 0,
            recommendedPath,
            pathDescription,
            clearPathWidth: clearColumns.length / columns,
            centerBlocked: !columnAnalysis[2].isClear
        };
    }
    
    /**
     * Detect steps/stairs using edge detection
     */
    detectSteps(imageData, width, height) {
        const data = imageData.data;
        
        // Focus on lower-middle region where steps would appear
        const regionYStart = Math.floor(height * 0.4);
        const regionYEnd = Math.floor(height * 0.9);
        
        // Detect horizontal edges (potential step edges)
        const horizontalEdges = [];
        const edgeThreshold = this.stepDetection.minEdgeStrength;
        
        for (let y = regionYStart; y < regionYEnd - 1; y++) {
            let edgeStrength = 0;
            let edgePixels = 0;
            
            for (let x = Math.floor(width * 0.2); x < Math.floor(width * 0.8); x++) {
                const idx = (y * width + x) * 4;
                const idxBelow = ((y + 1) * width + x) * 4;
                
                const brightness = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
                const brightnessBelow = (data[idxBelow] + data[idxBelow + 1] + data[idxBelow + 2]) / 3;
                
                const diff = Math.abs(brightness - brightnessBelow);
                if (diff > edgeThreshold) {
                    edgeStrength += diff;
                    edgePixels++;
                }
            }
            
            const edgeRatio = edgePixels / (width * 0.6);
            if (edgeRatio > this.stepDetection.horizontalLineThreshold) {
                horizontalEdges.push({
                    y,
                    strength: edgeStrength / edgePixels,
                    ratio: edgeRatio
                });
            }
        }
        
        // Analyze edge pattern for stairs
        const stepPattern = this.analyzeStepPattern(horizontalEdges, height);
        
        return {
            detected: stepPattern.isStairs,
            direction: stepPattern.direction,
            count: stepPattern.stepCount,
            distance: stepPattern.distance,
            edges: horizontalEdges.slice(0, 10),  // Keep top 10 edges
            confidence: stepPattern.confidence,
            warning: stepPattern.warning
        };
    }
    
    /**
     * Analyze horizontal edges for stair pattern
     */
    analyzeStepPattern(edges, frameHeight) {
        if (edges.length < this.stepDetection.stepPatternCount) {
            return {
                isStairs: false,
                direction: 'none',
                stepCount: 0,
                distance: 'none',
                confidence: 0,
                warning: null
            };
        }
        
        // Sort edges by Y position
        const sortedEdges = [...edges].sort((a, b) => a.y - b.y);
        
        // Check for regular spacing (stairs have consistent step height)
        const spacings = [];
        for (let i = 1; i < sortedEdges.length; i++) {
            spacings.push(sortedEdges[i].y - sortedEdges[i - 1].y);
        }
        
        // Calculate spacing consistency
        const avgSpacing = spacings.reduce((a, b) => a + b, 0) / spacings.length;
        const spacingVariance = spacings.reduce((a, b) => a + Math.abs(b - avgSpacing), 0) / spacings.length;
        const isRegular = spacingVariance < avgSpacing * 0.4;  // Within 40% variance
        
        // Determine if steps go up or down based on brightness pattern
        const topEdgeY = sortedEdges[0].y;
        const bottomEdgeY = sortedEdges[sortedEdges.length - 1].y;
        
        // Steps in lower part of frame = going down, upper part = going up
        const avgEdgeY = (topEdgeY + bottomEdgeY) / 2;
        const relativePosition = avgEdgeY / frameHeight;
        
        let direction = 'unknown';
        if (relativePosition > 0.6) {
            direction = 'down';  // Steps at bottom = stepping down
        } else if (relativePosition < 0.5) {
            direction = 'up';  // Steps at top = going up
        }
        
        // Estimate distance
        let distance = 'far';
        if (bottomEdgeY > frameHeight * 0.8) {
            distance = 'immediate';
        } else if (bottomEdgeY > frameHeight * 0.65) {
            distance = 'close';
        } else if (bottomEdgeY > frameHeight * 0.5) {
            distance = 'moderate';
        }
        
        const isStairs = isRegular && 
                        avgSpacing >= this.stepDetection.minStepHeight && 
                        avgSpacing <= this.stepDetection.maxStepHeight &&
                        edges.length >= this.stepDetection.stepPatternCount;
        
        return {
            isStairs,
            direction,
            stepCount: isStairs ? Math.min(edges.length, 10) : 0,
            distance,
            confidence: isStairs ? (isRegular ? 0.8 : 0.6) : 0.2,
            warning: isStairs ? this.generateStepWarning(direction, distance, edges.length) : null
        };
    }
    
    /**
     * Generate step warning message
     */
    generateStepWarning(direction, distance, count) {
        if (direction === 'down') {
            if (distance === 'immediate') {
                return `Caution! Steps going DOWN directly ahead. About ${count} steps detected.`;
            } else if (distance === 'close') {
                return `Steps going DOWN ahead, ${count} steps. Approach carefully.`;
            }
            return `Steps going DOWN in the distance.`;
        } else if (direction === 'up') {
            if (distance === 'immediate') {
                return `Steps going UP directly ahead. About ${count} steps.`;
            } else if (distance === 'close') {
                return `Stairs going UP ahead, approximately ${count} steps.`;
            }
            return `Stairs going UP ahead.`;
        }
        return `Steps detected ahead. Proceed with caution.`;
    }
    
    /**
     * Detect walls and vertical obstacles
     */
    detectWalls(imageData, width, height, detections) {
        const data = imageData.data;
        const walls = { left: null, right: null, ahead: null };
        
        // Analyze vertical regions for walls
        const regions = [
            { name: 'left', xStart: 0, xEnd: 0.25 },
            { name: 'center', xStart: 0.35, xEnd: 0.65 },
            { name: 'right', xStart: 0.75, xEnd: 1.0 }
        ];
        
        for (const region of regions) {
            const xStart = Math.floor(region.xStart * width);
            const xEnd = Math.floor(region.xEnd * width);
            const yStart = Math.floor(height * 0.2);
            const yEnd = Math.floor(height * 0.8);
            
            let uniformityScore = 0;
            let totalSamples = 0;
            let avgBrightness = 0;
            let avgR = 0, avgG = 0, avgB = 0;
            
            // Sample pixels for uniformity (walls are relatively uniform)
            for (let y = yStart; y < yEnd; y += 5) {
                for (let x = xStart; x < xEnd; x += 5) {
                    const idx = (y * width + x) * 4;
                    avgR += data[idx];
                    avgG += data[idx + 1];
                    avgB += data[idx + 2];
                    totalSamples++;
                }
            }
            
            avgR /= totalSamples;
            avgG /= totalSamples;
            avgB /= totalSamples;
            avgBrightness = (avgR + avgG + avgB) / 3;
            
            // Check color variance (low variance = likely wall)
            let colorVariance = 0;
            for (let y = yStart; y < yEnd; y += 5) {
                for (let x = xStart; x < xEnd; x += 5) {
                    const idx = (y * width + x) * 4;
                    colorVariance += Math.abs(data[idx] - avgR);
                    colorVariance += Math.abs(data[idx + 1] - avgG);
                    colorVariance += Math.abs(data[idx + 2] - avgB);
                }
            }
            colorVariance /= (totalSamples * 3);
            
            // Low variance and not sky-like = potential wall
            const isWall = colorVariance < 40 && 
                          avgBrightness > 30 && 
                          avgBrightness < 220 &&
                          !(avgB > avgR * 1.3 && avgBrightness > 150);  // Not sky
            
            if (isWall) {
                const wallPosition = region.name === 'left' ? 'left' : 
                                    region.name === 'right' ? 'right' : 'ahead';
                walls[wallPosition] = {
                    detected: true,
                    colorVariance,
                    avgBrightness,
                    confidence: Math.max(0.3, 1 - colorVariance / 80)
                };
            }
        }
        
        return {
            leftWall: walls.left,
            rightWall: walls.right,
            wallAhead: walls.ahead,
            hasWallObstacle: walls.ahead !== null,
            description: this.generateWallDescription(walls)
        };
    }
    
    /**
     * Generate wall description
     */
    generateWallDescription(walls) {
        const parts = [];
        
        if (walls.ahead) {
            parts.push('Wall or obstacle directly ahead');
        }
        if (walls.left) {
            parts.push('Wall on your left');
        }
        if (walls.right) {
            parts.push('Wall on your right');
        }
        
        if (parts.length === 0) {
            return 'No walls detected nearby';
        }
        
        return parts.join('. ') + '.';
    }
    
    /**
     * Detect hazards like holes, drop-offs, water
     */
    detectHazards(imageData, width, height) {
        const data = imageData.data;
        const hazards = [];
        
        // Focus on ground region
        const yStart = Math.floor(height * 0.6);
        const yEnd = height;
        
        // Look for very dark patches (potential holes)
        const gridSize = 20;
        const darkPatches = [];
        
        for (let gy = yStart; gy < yEnd; gy += gridSize) {
            for (let gx = 0; gx < width; gx += gridSize) {
                let darkPixels = 0;
                let totalPixels = 0;
                let avgBrightness = 0;
                
                for (let y = gy; y < Math.min(gy + gridSize, yEnd); y++) {
                    for (let x = gx; x < Math.min(gx + gridSize, width); x++) {
                        const idx = (y * width + x) * 4;
                        const brightness = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
                        avgBrightness += brightness;
                        totalPixels++;
                        if (brightness < 30) darkPixels++;
                    }
                }
                
                avgBrightness /= totalPixels;
                const darkRatio = darkPixels / totalPixels;
                
                if (darkRatio > 0.6 || avgBrightness < 25) {
                    darkPatches.push({
                        x: gx,
                        y: gy,
                        width: gridSize,
                        height: gridSize,
                        avgBrightness,
                        darkRatio
                    });
                }
            }
        }
        
        // Cluster nearby dark patches
        if (darkPatches.length > 0) {
            const clusters = this.clusterPatches(darkPatches, gridSize * 2);
            
            for (const cluster of clusters) {
                if (cluster.length >= 2) {  // At least 2 patches = significant
                    const avgX = cluster.reduce((a, p) => a + p.x, 0) / cluster.length;
                    const avgY = cluster.reduce((a, p) => a + p.y, 0) / cluster.length;
                    
                    // Determine position
                    const relX = avgX / width;
                    let position = 'center';
                    if (relX < 0.35) position = 'left';
                    else if (relX > 0.65) position = 'right';
                    
                    // Determine distance
                    const relY = avgY / height;
                    let distance = 'moderate';
                    if (relY > 0.85) distance = 'immediate';
                    else if (relY > 0.75) distance = 'close';
                    
                    hazards.push({
                        type: 'potential_hole',
                        position,
                        distance,
                        size: cluster.length * gridSize * gridSize,
                        confidence: Math.min(0.9, 0.5 + cluster.length * 0.1),
                        warning: `Caution! Dark area ${distance} ${position === 'center' ? 'ahead' : 'on your ' + position}. May be a hole or drop-off.`
                    });
                }
            }
        }
        
        // Check for sudden brightness drops (edges/drop-offs)
        const edgeHazards = this.detectDropOffEdges(imageData, width, height);
        hazards.push(...edgeHazards);
        
        return {
            detected: hazards.length > 0,
            hazards,
            mostUrgent: hazards.length > 0 ? 
                hazards.sort((a, b) => {
                    const distOrder = { immediate: 0, close: 1, moderate: 2 };
                    return distOrder[a.distance] - distOrder[b.distance];
                })[0] : null
        };
    }
    
    /**
     * Cluster nearby patches together
     */
    clusterPatches(patches, maxDistance) {
        const clusters = [];
        const assigned = new Set();
        
        for (let i = 0; i < patches.length; i++) {
            if (assigned.has(i)) continue;
            
            const cluster = [patches[i]];
            assigned.add(i);
            
            for (let j = i + 1; j < patches.length; j++) {
                if (assigned.has(j)) continue;
                
                // Check if close to any patch in cluster
                for (const p of cluster) {
                    const dist = Math.sqrt(
                        Math.pow(patches[j].x - p.x, 2) + 
                        Math.pow(patches[j].y - p.y, 2)
                    );
                    if (dist < maxDistance) {
                        cluster.push(patches[j]);
                        assigned.add(j);
                        break;
                    }
                }
            }
            
            clusters.push(cluster);
        }
        
        return clusters;
    }
    
    /**
     * Detect drop-off edges (stairs edge, curbs, ledges)
     */
    detectDropOffEdges(imageData, width, height) {
        const data = imageData.data;
        const hazards = [];
        
        // Look for strong horizontal brightness changes in the walking region
        const yStart = Math.floor(height * 0.7);
        const yEnd = Math.floor(height * 0.95);
        
        for (let y = yStart; y < yEnd; y++) {
            let significantDrops = 0;
            let dropPositions = [];
            
            for (let x = Math.floor(width * 0.1); x < Math.floor(width * 0.9); x++) {
                const idx = (y * width + x) * 4;
                const idxAbove = ((y - 3) * width + x) * 4;
                
                const brightness = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
                const brightnessAbove = (data[idxAbove] + data[idxAbove + 1] + data[idxAbove + 2]) / 3;
                
                // Significant brightness drop = potential edge
                if (brightnessAbove - brightness > 50) {
                    significantDrops++;
                    dropPositions.push(x);
                }
            }
            
            // If there's a consistent edge across the frame
            if (significantDrops > width * 0.3) {
                const avgX = dropPositions.reduce((a, b) => a + b, 0) / dropPositions.length;
                const relY = y / height;
                
                hazards.push({
                    type: 'edge_dropoff',
                    position: 'ahead',
                    distance: relY > 0.85 ? 'immediate' : relY > 0.8 ? 'close' : 'moderate',
                    y: y,
                    confidence: Math.min(0.8, significantDrops / (width * 0.5)),
                    warning: 'Edge or drop-off detected ahead. May be a curb, step, or ledge.'
                });
                break;  // Only report first edge
            }
        }
        
        return hazards;
    }
    
    /**
     * Compute overall safety assessment
     */
    computeSafetyAssessment(analysis, detections) {
        let safetyLevel = 'safe';  // safe, caution, warning, danger
        const concerns = [];
        const recommendations = [];
        
        // Check pathway
        if (!analysis.pathway.clearPathExists) {
            safetyLevel = 'warning';
            concerns.push('No clear path detected');
            recommendations.push('Stop and reassess surroundings');
        } else if (analysis.pathway.centerBlocked) {
            safetyLevel = 'caution';
            concerns.push('Center path blocked');
            recommendations.push(analysis.pathway.pathDescription);
        }
        
        // Check steps
        if (analysis.steps.detected) {
            if (analysis.steps.distance === 'immediate') {
                safetyLevel = 'warning';
                concerns.push(analysis.steps.warning);
                recommendations.push(analysis.steps.direction === 'down' ? 
                    'Prepare to step down carefully' : 'Prepare to climb stairs');
            } else if (analysis.steps.distance === 'close') {
                safetyLevel = safetyLevel === 'safe' ? 'caution' : safetyLevel;
                concerns.push(analysis.steps.warning);
            }
        }
        
        // Check walls
        if (analysis.walls.wallAhead) {
            safetyLevel = 'warning';
            concerns.push('Wall or large obstacle ahead');
            recommendations.push('Change direction');
        }
        
        // Check hazards
        if (analysis.hazards.detected) {
            const urgent = analysis.hazards.mostUrgent;
            if (urgent.distance === 'immediate') {
                safetyLevel = 'danger';
                concerns.push(urgent.warning);
                recommendations.push('Stop immediately!');
            } else if (urgent.distance === 'close') {
                safetyLevel = safetyLevel === 'safe' ? 'warning' : safetyLevel;
                concerns.push(urgent.warning);
            }
        }
        
        // Check detected objects
        const closeObjects = detections.filter(d => 
            d.distance?.estimate === 'very-close' || d.distance?.estimate === 'immediate' ||
            d.distance === 'very close'
        );
        
        if (closeObjects.length > 0) {
            safetyLevel = safetyLevel === 'safe' ? 'caution' : safetyLevel;
            closeObjects.forEach(obj => {
                concerns.push(`${obj.class} very close ${obj.position?.description || obj.position}`);
            });
        }
        
        return {
            level: safetyLevel,
            concerns,
            recommendations,
            canProceed: safetyLevel === 'safe' || safetyLevel === 'caution',
            requiresStop: safetyLevel === 'danger'
        };
    }
    
    /**
     * Generate voice guidance based on analysis
     */
    generateVoiceGuidance(analysis) {
        const messages = [];
        const priority = [];
        
        // Highest priority: Danger
        if (analysis.safety.level === 'danger') {
            priority.push('Stop! ' + analysis.safety.concerns[0]);
        }
        
        // Steps warning
        if (analysis.steps.detected && analysis.steps.distance !== 'far') {
            priority.push(analysis.steps.warning);
        }
        
        // Hazards
        if (analysis.hazards.mostUrgent && analysis.hazards.mostUrgent.distance !== 'moderate') {
            messages.push(analysis.hazards.mostUrgent.warning);
        }
        
        // Wall warning
        if (analysis.walls.wallAhead) {
            messages.push('Wall ahead. Change direction.');
        }
        
        // Pathway guidance
        if (!analysis.pathway.clearPathExists) {
            messages.push('Path blocked. ' + analysis.pathway.pathDescription);
        } else if (analysis.pathway.centerBlocked) {
            messages.push(analysis.pathway.pathDescription);
        }
        
        // Scene context
        const scene = analysis.scene;
        if (scene.sky?.classification?.type === 'sky') {
            messages.push('Outdoor environment detected.');
        } else if (scene.foreground?.classification?.type === 'ground') {
            const groundType = scene.foreground.classification.subtype;
            if (groundType !== 'unknown') {
                messages.push(`Walking on ${groundType}.`);
            }
        }
        
        // Combine messages
        return {
            immediate: priority.length > 0 ? priority[0] : null,
            warnings: priority,
            guidance: messages,
            fullMessage: [...priority, ...messages].join(' ')
        };
    }
    
    /**
     * Trigger callbacks based on analysis
     */
    triggerCallbacks(analysis) {
        if (analysis.hazards.detected && this.onHazardDetected) {
            this.onHazardDetected(analysis.hazards);
        }
        
        if (analysis.pathway.clearPathExists && this.onPathwayClear) {
            this.onPathwayClear(analysis.pathway);
        }
        
        if (analysis.steps.detected && this.onStepsDetected) {
            this.onStepsDetected(analysis.steps);
        }
        
        if (analysis.walls.hasWallObstacle && this.onWallDetected) {
            this.onWallDetected(analysis.walls);
        }
    }
    
    /**
     * Quick safety check - faster version for real-time navigation
     */
    quickSafetyCheck(frame, detections) {
        // Simplified check focusing on immediate dangers
        const ctx = frame.canvas.getContext('2d');
        const imageData = ctx.getImageData(
            0, 
            Math.floor(frame.height * 0.7),  // Only bottom 30%
            frame.width, 
            Math.floor(frame.height * 0.3)
        );
        
        const data = imageData.data;
        const width = frame.width;
        const height = Math.floor(frame.height * 0.3);
        
        // Quick checks
        let darkPixelRatio = 0;
        let edgeCount = 0;
        let totalPixels = width * height;
        
        for (let i = 0; i < data.length; i += 16) {  // Sample every 4th pixel
            const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3;
            if (brightness < 30) darkPixelRatio++;
        }
        
        darkPixelRatio = (darkPixelRatio * 4) / totalPixels;
        
        // Check for immediate obstacles from detections
        const immediateObstacles = detections.filter(d => 
            (d.distance?.estimate === 'immediate' || d.distance?.estimate === 'very-close') &&
            (d.position?.horizontal === 'center' || d.position?.horizontal?.includes('slight'))
        );
        
        return {
            safe: darkPixelRatio < 0.2 && immediateObstacles.length === 0,
            darkAreaDetected: darkPixelRatio > 0.2,
            immediateObstacles: immediateObstacles.map(o => o.class),
            recommendation: immediateObstacles.length > 0 ? 
                `Caution: ${immediateObstacles[0].class} directly ahead` :
                darkPixelRatio > 0.2 ? 'Caution: Dark area ahead, possible hazard' : 'Path appears clear'
        };
    }
}

// Create global instance
const navigationSafetyAnalyzer = new NavigationSafetyAnalyzer();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = NavigationSafetyAnalyzer;
}
