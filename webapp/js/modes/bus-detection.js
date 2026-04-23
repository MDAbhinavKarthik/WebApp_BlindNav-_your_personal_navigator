/**
 * BlindNav+ Enhanced Bus Detection Mode
 * Detects buses, reads bus numbers using OCR, provides route info
 * Includes transport safety features
 */

class BusDetectionMode {
    constructor() {
        this.isActive = false;
        this.targetBusNumber = null;
        this.tesseractWorker = null;
        this.isOCRReady = false;
        this.lastAnnouncedBus = null;
        this.lastAnnouncementTime = 0;
        this.announcementCooldown = 4000;
        this.frameProcessingActive = false;
        this.detectedBuses = [];
        this.busHistory = [];
        
        // Enhanced bus route database
        this.busRoutes = {};
        this.busStopInfo = null;
        this.nearbyStops = [];
        
        // Detection confidence
        this.ocrConfidenceThreshold = 0.6;
        this.busDetectionConfidence = 0.5;
        
        // Safety features
        this.safetyMode = true;
        this.approachingBusAlert = true;
        this.busSpeedTracking = new Map();
        
        // Bus characteristics for better detection
        this.busCharacteristics = {
            minAspectRatio: 1.5,  // Buses are wider than tall
            maxAspectRatio: 4.0,
            minSize: 0.05,       // Min portion of frame
            maxSize: 0.8         // Max portion of frame
        };
        
        // Common bus number patterns by region
        this.busNumberPatterns = [
            /^\d{1,4}[A-Z]?$/,           // 123, 45A
            /^[A-Z]\d{1,3}$/,            // A12, B456
            /^[A-Z]{1,2}\d{1,3}$/,       // AC12, BUS456
            /^\d{1,3}[A-Z]{1,2}$/,       // 12AB
            /^[A-Z]\d{1,2}[A-Z]$/        // A1B
        ];
        
        // Load routes if available
        this.loadBusRoutes();
    }
    
    /**
     * Load bus routes from configuration
     */
    async loadBusRoutes() {
        try {
            // Try to load from bus_routes.json
            const response = await fetch('bus_routes.json');
            if (response.ok) {
                const data = await response.json();
                this.busRoutes = data.routes || {};
                this.busStopInfo = data.bus_stops || {};
                console.log('[BusDetection] Loaded bus routes:', Object.keys(this.busRoutes).length);
                console.log('[BusDetection] Loaded bus stops:', Object.keys(this.busStopInfo).length);
            }
        } catch (error) {
            console.log('[BusDetection] No bus routes file found, using defaults');
            this.busRoutes = {};
            this.busStopInfo = {};
        }
    }
    
    /**
     * Search for buses that go to a destination
     * @param {string} destination - Destination name like "Banashankari", "Electronic City"
     * @returns {Array} - List of buses that go to that destination
     */
    searchByDestination(destination) {
        const searchTerm = destination.toLowerCase().trim();
        const matches = [];
        
        for (const [busNumber, routeInfo] of Object.entries(this.busRoutes)) {
            // Check in destinations array
            const destinations = routeInfo.destinations || routeInfo.stops || [];
            const routeName = routeInfo.name || routeInfo.route || '';
            
            const hasMatch = destinations.some(dest => 
                dest.toLowerCase().includes(searchTerm) || 
                searchTerm.includes(dest.toLowerCase())
            ) || routeName.toLowerCase().includes(searchTerm);
            
            if (hasMatch) {
                matches.push({
                    number: busNumber,
                    name: routeInfo.name || `Bus ${busNumber}`,
                    route: routeInfo.route,
                    stops: routeInfo.stops || [],
                    frequency: routeInfo.frequency,
                    hours: routeInfo.operating_hours
                });
            }
        }
        
        return matches;
    }
    
    /**
     * Find buses from current location to destination
     * @param {string} destination - Destination name
     */
    async findBusToDestination(destination) {
        const cleanDest = destination.replace(/^(to|from|go to|going to|need to go to|want to go to)\s*/i, '').trim();
        
        speechManager.speak(`Looking for buses to ${cleanDest}...`, true);
        
        const matches = this.searchByDestination(cleanDest);
        
        if (matches.length === 0) {
            speechManager.speak(
                `Sorry, I couldn't find any buses to ${cleanDest} in my database. ` +
                `You can try asking for a specific bus number or check at the nearest bus stop.`,
                true
            );
            return;
        }
        
        let message = `Found ${matches.length} bus${matches.length > 1 ? 'es' : ''} to ${cleanDest}. `;
        
        // Announce first 3 buses with details
        matches.slice(0, 3).forEach((bus, index) => {
            message += `Bus ${bus.number}: ${bus.name}. `;
            if (bus.frequency) {
                message += `Runs ${bus.frequency.toLowerCase()}. `;
            }
            if (bus.hours) {
                message += `Operating ${bus.hours}. `;
            }
        });
        
        if (matches.length > 3) {
            message += `And ${matches.length - 3} more options. `;
        }
        
        message += `Say a bus number to watch for it, or say 'find bus stop' to locate nearest stop.`;
        
        speechManager.speak(message, true);
        
        // Store found buses for follow-up
        this.foundBusesForDestination = matches;
        this.searchedDestination = cleanDest;
    }
    
    /**
     * Find nearest bus stop using geolocation
     */
    async findNearestBusStop() {
        speechManager.speak('Finding your nearest bus stop. Please wait.', true);
        
        try {
            // Get current location
            const position = await this.getCurrentPosition();
            const { latitude, longitude } = position.coords;
            
            // Find closest bus stop from our database
            let nearestStop = null;
            let minDistance = Infinity;
            
            for (const [stopId, stopInfo] of Object.entries(this.busStopInfo)) {
                const distance = this.calculateDistance(
                    latitude, longitude,
                    stopInfo.latitude, stopInfo.longitude
                );
                
                if (distance < minDistance) {
                    minDistance = distance;
                    nearestStop = { ...stopInfo, id: stopId, distance };
                }
            }
            
            if (nearestStop && minDistance < 5000) { // Within 5km
                let message = `Your nearest bus stop is ${nearestStop.name}, `;
                message += `approximately ${Math.round(minDistance)} meters away. `;
                
                if (nearestStop.buses && nearestStop.buses.length > 0) {
                    message += `Buses available here: ${nearestStop.buses.slice(0, 5).join(', ')}. `;
                }
                
                // Provide direction
                const direction = this.getDirection(
                    latitude, longitude,
                    nearestStop.latitude, nearestStop.longitude
                );
                message += `The stop is to your ${direction}.`;
                
                speechManager.speak(message, true);
                
                // Store for navigation
                this.nearestStop = nearestStop;
            } else {
                speechManager.speak(
                    'Could not find a bus stop nearby in my database. ' +
                    'Please check with local transit information.',
                    true
                );
            }
        } catch (error) {
            console.error('[BusDetection] Location error:', error);
            speechManager.speak(
                'Could not get your location. Please enable location services and try again.',
                true
            );
        }
    }
    
    /**
     * Get current GPS position
     */
    getCurrentPosition() {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                reject(new Error('Geolocation not supported'));
                return;
            }
            navigator.geolocation.getCurrentPosition(resolve, reject, {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 60000
            });
        });
    }
    
    /**
     * Calculate distance between two coordinates (Haversine formula)
     */
    calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 6371000; // Earth radius in meters
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                  Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                  Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
    }
    
    /**
     * Get cardinal direction from one point to another
     */
    getDirection(lat1, lon1, lat2, lon2) {
        const dLon = lon2 - lon1;
        const dLat = lat2 - lat1;
        const angle = Math.atan2(dLon, dLat) * 180 / Math.PI;
        
        if (angle >= -22.5 && angle < 22.5) return 'north';
        if (angle >= 22.5 && angle < 67.5) return 'northeast';
        if (angle >= 67.5 && angle < 112.5) return 'east';
        if (angle >= 112.5 && angle < 157.5) return 'southeast';
        if (angle >= 157.5 || angle < -157.5) return 'south';
        if (angle >= -157.5 && angle < -112.5) return 'southwest';
        if (angle >= -112.5 && angle < -67.5) return 'west';
        return 'northwest';
    }
    
    /**
     * Get bus timing information
     */
    getBusTimings(busNumber) {
        const normalizedNumber = busNumber.toUpperCase().replace(/[^A-Z0-9-]/g, '');
        const routeInfo = this.busRoutes[normalizedNumber];
        
        if (!routeInfo) {
            return null;
        }
        
        return {
            number: normalizedNumber,
            name: routeInfo.name || `Bus ${normalizedNumber}`,
            frequency: routeInfo.frequency,
            operatingHours: routeInfo.operating_hours,
            route: routeInfo.route,
            stops: routeInfo.stops
        };
    }
    
    /**
     * Start bus detection mode
     */
    async start() {
        if (this.isActive) {
            console.log('[BusDetection] Already active');
            return;
        }
        
        this.isActive = true;
        console.log('[BusDetection] Mode started');
        
        // Initialize OCR
        await this.initOCR();
        
        // Initialize vision service if available
        if (typeof visionService !== 'undefined' && !visionService.isInitialized) {
            await visionService.initialize();
        }
        
        speechManager.speak(
            'Bus Detection Mode activated. ' +
            'Point your camera towards the road to detect approaching buses. ' +
            'I will read bus numbers and tell you the routes. ' +
            'Say a bus number to watch for your specific bus. ' +
            'Say "nearby stops" to find bus stops near you.',
            true
        );
        
        this.updateUI(true);
        
        // Start frame processing
        this.startFrameProcessing();
    }
    
    /**
     * Stop bus detection mode
     */
    stop() {
        if (!this.isActive) return;
        
        this.isActive = false;
        this.frameProcessingActive = false;
        cameraManager.stopFrameProcessing();
        
        // Terminate OCR worker
        if (this.tesseractWorker) {
            this.tesseractWorker.terminate();
            this.tesseractWorker = null;
            this.isOCRReady = false;
        }
        
        speechManager.speak('Exiting Bus Detection Mode.');
        
        this.updateUI(false);
        
        console.log('[BusDetection] Mode stopped');
    }
    
    /**
     * Initialize Tesseract OCR
     */
    async initOCR() {
        if (this.isOCRReady) return;
        
        try {
            speechManager.speak('Loading text recognition for bus numbers...');
            
            // Tesseract.js v4 API - create worker, then load language
            this.tesseractWorker = await Tesseract.createWorker({
                logger: m => {
                    if (m.status === 'recognizing text') {
                        console.log(`[BusDetection] OCR Progress: ${Math.round(m.progress * 100)}%`);
                    }
                }
            });
            
            await this.tesseractWorker.loadLanguage('eng');
            await this.tesseractWorker.initialize('eng');
            
            await this.tesseractWorker.setParameters({
                tessedit_char_whitelist: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ-',
                tessedit_pageseg_mode: '7', // Single line
            });
            
            this.isOCRReady = true;
            console.log('[BusDetection] OCR initialized successfully');
            
        } catch (error) {
            console.error('[BusDetection] OCR init error:', error);
            // Try fallback initialization
            try {
                this.tesseractWorker = await Tesseract.createWorker('eng');
                this.isOCRReady = true;
                console.log('[BusDetection] OCR fallback initialization successful');
            } catch (fallbackError) {
                speechManager.speak(
                    'Text recognition could not be loaded. ' +
                    'I can still detect buses but may not read numbers accurately.'
                );
            }
        }
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
            
            // Process every 3rd frame for OCR efficiency
            if (frameCount % 3 !== 0) return;
            
            // Detect all objects
            let detections = [];
            
            if (typeof visionService !== 'undefined') {
                detections = await visionService.detectObjects(frame);
            } else {
                detections = await detectionManager.detect(frame);
            }
            
            // Draw detections
            if (frame.ctx && detections.length > 0) {
                frame.ctx.clearRect(0, 0, frame.width, frame.height);
                frame.ctx.drawImage(cameraManager.imgElement, 0, 0);
                this.drawBusDetections(frame.ctx, detections);
            }
            
            // STRICTLY filter for ONLY buses - ignore cars, autos, trucks, motorcycles
            // This ensures we don't misidentify other vehicles as buses
            const buses = detections.filter(d => {
                const className = d.class.toLowerCase();
                // Only accept 'bus' class - reject everything else
                if (className !== 'bus') return false;
                // Additional validation: buses have specific aspect ratio and size
                return this.validateBusDetection(d);
            });
            
            if (buses.length > 0) {
                await this.processBusDetections(buses, frame);
            }
            
            // Analyze traffic safety
            if (this.safetyMode) {
                this.analyzeTrafficSafety(detections);
            }
            
            // Update display
            this.updateResultsDisplay(detections);
        });
    }
    
    /**
     * Validate that a detection is actually a bus (strict validation)
     * This prevents misidentifying cars, autos, trucks as buses
     */
    validateBusDetection(detection) {
        const aspectRatio = detection.bbox.width / detection.bbox.height;
        const sizeRatio = detection.size?.areaRatio || 
            (detection.bbox.width * detection.bbox.height) / (640 * 480);
        const confidence = detection.score || detection.confidence || 0;
        
        // Buses must have:
        // 1. High confidence (>50%)
        // 2. Appropriate aspect ratio (buses are wider than tall)
        // 3. Reasonable size in frame
        return (
            confidence >= this.busDetectionConfidence &&
            aspectRatio >= 1.2 &&  // Buses are wider
            aspectRatio <= 5.0 &&
            sizeRatio >= 0.02 &&   // Not too small
            sizeRatio <= 0.9       // Not filling entire frame
        );
    }
    
    /**
     * Check if a detection looks like a bus based on characteristics (legacy)
     */
    looksLikeBus(detection) {
        return this.validateBusDetection(detection);
    }
    
    /**
     * Process detected buses
     */
    async processBusDetections(buses, frame) {
        const now = Date.now();
        
        for (const bus of buses) {
            // Calculate bus approach info
            const approachInfo = this.calculateApproachInfo(bus);
            
            // Extract bus number using OCR
            const busNumber = await this.extractBusNumber(bus, frame);
            
            // Track bus speed/approach
            this.trackBusMovement(bus, busNumber);
            
            if (busNumber) {
                // Check announcement cooldown
                const shouldAnnounce = 
                    this.lastAnnouncedBus !== busNumber ||
                    now - this.lastAnnouncementTime > this.announcementCooldown;
                
                if (shouldAnnounce) {
                    this.announceBus(busNumber, bus, approachInfo);
                    this.lastAnnouncedBus = busNumber;
                    this.lastAnnouncementTime = now;
                }
                
                // Record detection
                this.recordBusDetection(busNumber, bus);
                
            } else if (now - this.lastAnnouncementTime > this.announcementCooldown * 2) {
                // Bus detected but number not readable
                this.announceUnreadableBus(bus, approachInfo);
                this.lastAnnouncementTime = now;
            }
        }
    }
    
    /**
     * Calculate approach information
     */
    calculateApproachInfo(bus) {
        const distance = bus.depth?.meters || bus.distance?.meters || 
            this.estimateBusDistance(bus);
        
        const isApproaching = bus.movement?.approaching || 
            (bus.movement?.sizeChange > 0.005);
        
        let approachSpeed = 'unknown';
        if (bus.movement?.sizeChange > 0.02) {
            approachSpeed = 'fast';
        } else if (bus.movement?.sizeChange > 0.01) {
            approachSpeed = 'moderate';
        } else if (bus.movement?.sizeChange > 0) {
            approachSpeed = 'slow';
        }
        
        let timeToArrive = null;
        if (isApproaching && distance > 0) {
            // Rough estimate based on typical bus speed
            const avgBusSpeed = 20; // km/h in urban area
            timeToArrive = (distance / 1000) / avgBusSpeed * 3600; // seconds
        }
        
        return {
            distance,
            isApproaching,
            approachSpeed,
            timeToArrive,
            position: bus.position?.horizontal || 'ahead'
        };
    }
    
    /**
     * Estimate bus distance from size
     */
    estimateBusDistance(bus) {
        // Average bus height is about 3 meters
        const busRealHeight = 3.0;
        const focalLength = 640 * 0.8; // Approximate
        
        return (busRealHeight * focalLength) / bus.bbox.height;
    }
    
    /**
     * Track bus movement over time
     */
    trackBusMovement(bus, busNumber) {
        const key = busNumber || `unknown_${bus.bbox.x}_${bus.bbox.y}`;
        const now = Date.now();
        
        const previous = this.busSpeedTracking.get(key);
        
        if (previous) {
            const timeDiff = (now - previous.timestamp) / 1000;
            const sizeDiff = bus.size?.areaRatio - previous.size;
            
            bus.speedInfo = {
                sizeChangeRate: sizeDiff / timeDiff,
                isApproachingFast: sizeDiff / timeDiff > 0.05
            };
        }
        
        this.busSpeedTracking.set(key, {
            size: bus.size?.areaRatio || 0,
            timestamp: now
        });
        
        // Cleanup old entries
        if (this.busSpeedTracking.size > 20) {
            const oldestKey = this.busSpeedTracking.keys().next().value;
            this.busSpeedTracking.delete(oldestKey);
        }
    }
    
    /**
     * Extract bus number using OCR
     */
    async extractBusNumber(bus, frame) {
        if (!this.isOCRReady || !this.tesseractWorker) {
            return null;
        }
        
        try {
            const { bbox } = bus;
            
            // Define regions to check for bus number
            const regions = this.getBusNumberRegions(bbox, frame);
            
            for (const region of regions) {
                // Get image data from region
                const imageData = frame.ctx.getImageData(
                    region.x, region.y, region.width, region.height
                );
                
                // Create temporary canvas for OCR
                const tempCanvas = document.createElement('canvas');
                tempCanvas.width = region.width;
                tempCanvas.height = region.height;
                const tempCtx = tempCanvas.getContext('2d');
                tempCtx.putImageData(imageData, 0, 0);
                
                // Preprocess for better OCR
                this.preprocessForOCR(tempCtx, region.width, region.height);
                
                // Run OCR
                const { data: { text, confidence } } = await this.tesseractWorker.recognize(tempCanvas);
                
                // Extract bus number from text
                const busNumber = this.extractNumber(text);
                
                if (busNumber && confidence > this.ocrConfidenceThreshold * 100) {
                    return busNumber;
                }
            }
            
            return null;
            
        } catch (error) {
            console.error('[BusDetection] OCR error:', error);
            return null;
        }
    }
    
    /**
     * Get regions where bus number might be displayed
     */
    getBusNumberRegions(bbox, frame) {
        const regions = [];
        
        // Front display (upper portion)
        regions.push({
            x: Math.max(0, bbox.x),
            y: Math.max(0, bbox.y),
            width: Math.min(bbox.width, frame.width - bbox.x),
            height: Math.min(Math.floor(bbox.height * 0.35), frame.height - bbox.y)
        });
        
        // Side display (middle-top portion)
        regions.push({
            x: Math.max(0, bbox.x + bbox.width * 0.1),
            y: Math.max(0, bbox.y + bbox.height * 0.1),
            width: Math.min(bbox.width * 0.8, frame.width - bbox.x - bbox.width * 0.1),
            height: Math.min(bbox.height * 0.3, frame.height - bbox.y - bbox.height * 0.1)
        });
        
        return regions.filter(r => r.width > 20 && r.height > 10);
    }
    
    /**
     * Preprocess image for better OCR
     */
    preprocessForOCR(ctx, width, height) {
        const imageData = ctx.getImageData(0, 0, width, height);
        const data = imageData.data;
        
        // Convert to grayscale and apply threshold
        for (let i = 0; i < data.length; i += 4) {
            const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
            
            // Adaptive threshold
            const value = gray > 120 ? 255 : 0;
            
            data[i] = value;
            data[i + 1] = value;
            data[i + 2] = value;
        }
        
        ctx.putImageData(imageData, 0, 0);
    }
    
    /**
     * Extract bus number from OCR text
     */
    extractNumber(text) {
        if (!text) return null;
        
        // Clean text
        const cleaned = text.toUpperCase().replace(/[^A-Z0-9]/g, '');
        
        // Check against known patterns
        for (const pattern of this.busNumberPatterns) {
            const match = cleaned.match(pattern);
            if (match) {
                return match[0];
            }
        }
        
        // Fallback: look for any sequence with digits
        const digitMatch = cleaned.match(/[A-Z]?\d{1,4}[A-Z]?/);
        if (digitMatch && digitMatch[0].length >= 2 && digitMatch[0].length <= 5) {
            return digitMatch[0];
        }
        
        return null;
    }
    
    /**
     * Announce detected bus
     */
    announceBus(busNumber, bus, approachInfo) {
        let message = '';
        
        // Check if this is the target bus
        const isTargetBus = this.targetBusNumber && 
            (busNumber.includes(this.targetBusNumber) || 
             this.targetBusNumber.includes(busNumber));
        
        if (isTargetBus) {
            message = `Your bus! Number ${busNumber} is `;
        } else {
            message = `Bus ${busNumber} `;
        }
        
        // Add approach info
        if (approachInfo.isApproaching) {
            message += `approaching from your ${approachInfo.position}, `;
            message += `about ${Math.round(approachInfo.distance)} meters away`;
            
            if (approachInfo.timeToArrive && approachInfo.timeToArrive < 60) {
                message += `, arriving in about ${Math.round(approachInfo.timeToArrive)} seconds`;
            }
        } else {
            message += `detected ${approachInfo.position}, `;
            message += `${Math.round(approachInfo.distance)} meters away`;
        }
        
        // Add route info
        if (this.busRoutes[busNumber]) {
            message += `. Route: ${this.busRoutes[busNumber]}`;
        }
        
        // Priority announcement for target bus
        speechManager.speak(message, isTargetBus);
        
        // Visual alert for target bus
        if (isTargetBus) {
            this.showTargetBusAlert(busNumber);
        }
    }
    
    /**
     * Announce bus when number is not readable
     */
    announceUnreadableBus(bus, approachInfo) {
        let message = 'Bus detected ';
        message += `${approachInfo.position}, `;
        message += `${Math.round(approachInfo.distance)} meters away. `;
        message += 'Could not read the bus number clearly.';
        
        if (approachInfo.isApproaching) {
            message += ' It appears to be approaching.';
        }
        
        speechManager.speak(message);
    }
    
    /**
     * Record bus detection for history
     */
    recordBusDetection(busNumber, bus) {
        const detection = {
            number: busNumber,
            time: Date.now(),
            position: bus.position?.horizontal || 'unknown',
            distance: bus.depth?.meters || bus.distance?.meters || 0,
            route: this.busRoutes[busNumber] || null
        };
        
        this.detectedBuses.push(detection);
        this.busHistory.push(detection);
        
        // Keep only recent detections
        if (this.detectedBuses.length > 20) {
            this.detectedBuses = this.detectedBuses.slice(-20);
        }
        if (this.busHistory.length > 100) {
            this.busHistory = this.busHistory.slice(-100);
        }
    }
    
    /**
     * Show visual alert for target bus
     */
    showTargetBusAlert(busNumber) {
        const alertEl = document.getElementById('target-bus-alert');
        if (alertEl) {
            alertEl.classList.add('active');
            alertEl.innerHTML = `
                <div class="target-bus-found">
                    <span class="alert-icon">🚌</span>
                    <span class="alert-text">YOUR BUS ${busNumber} IS HERE!</span>
                </div>
            `;
            
            // Haptic feedback if available
            if (navigator.vibrate) {
                navigator.vibrate([200, 100, 200, 100, 200]);
            }
            
            setTimeout(() => {
                alertEl.classList.remove('active');
            }, 5000);
        }
    }
    
    /**
     * Analyze traffic safety around bus stop
     */
    analyzeTrafficSafety(detections) {
        // Check for approaching vehicles
        const vehicles = detections.filter(d => 
            ['car', 'motorcycle', 'bicycle', 'truck'].includes(d.class.toLowerCase())
        );
        
        const dangerousVehicles = vehicles.filter(v => 
            (v.depth?.meters < 5 || v.distance?.meters < 5) &&
            (v.position?.horizontal === 'center' || v.position?.horizontal.includes('slight')) &&
            v.movement?.approaching
        );
        
        if (dangerousVehicles.length > 0 && 
            Date.now() - this.lastAnnouncementTime > this.announcementCooldown) {
            
            const nearest = dangerousVehicles[0];
            const dist = nearest.depth?.meters || nearest.distance?.meters || 'close';
            
            speechManager.speak(
                `Caution! ${nearest.class} approaching from ${nearest.position?.horizontal || 'ahead'}, ` +
                `${typeof dist === 'number' ? Math.round(dist) + ' meters' : dist}!`,
                true
            );
        }
    }
    
    /**
     * Draw bus detections on canvas
     */
    drawBusDetections(ctx, detections) {
        ctx.save();
        
        detections.forEach(det => {
            const { bbox, class: className } = det;
            const isBus = className.toLowerCase() === 'bus';
            const isTargetBus = det.busNumber && this.targetBusNumber && 
                det.busNumber.includes(this.targetBusNumber);
            
            // Choose color
            let color;
            if (isTargetBus) {
                color = '#00ff00'; // Green for target bus
            } else if (isBus) {
                color = '#3498db'; // Blue for buses
            } else if (['car', 'motorcycle', 'truck'].includes(className.toLowerCase())) {
                color = '#f39c12'; // Orange for other vehicles
            } else {
                color = '#95a5a6'; // Gray for other objects
            }
            
            // Draw bounding box
            ctx.strokeStyle = color;
            ctx.lineWidth = isBus ? 4 : 2;
            ctx.strokeRect(bbox.x, bbox.y, bbox.width, bbox.height);
            
            // Draw label
            const distance = det.depth?.meters || det.distance?.meters;
            const distText = distance ? `${Math.round(distance)}m` : '';
            const label = det.busNumber ? 
                `Bus ${det.busNumber} ${distText}` : 
                `${className} ${distText}`;
            
            ctx.font = isBus ? 'bold 16px Inter' : '14px Inter';
            const textWidth = ctx.measureText(label).width;
            
            ctx.fillStyle = color;
            ctx.fillRect(bbox.x, bbox.y - (isBus ? 30 : 25), textWidth + 10, isBus ? 28 : 22);
            
            ctx.fillStyle = '#ffffff';
            ctx.fillText(label, bbox.x + 5, bbox.y - (isBus ? 10 : 8));
            
            // Mark target bus
            if (isTargetBus) {
                ctx.fillStyle = '#00ff00';
                ctx.font = 'bold 20px Inter';
                ctx.fillText('★ YOUR BUS', bbox.x, bbox.y - 35);
            }
        });
        
        ctx.restore();
    }
    
    /**
     * Set target bus number to watch for
     */
    setTargetBus(busNumber) {
        this.targetBusNumber = busNumber.toUpperCase().replace(/[^A-Z0-9]/g, '');
        
        let message = `Watching for bus number ${this.targetBusNumber}. `;
        message += 'I will alert you immediately when it arrives.';
        
        if (this.busRoutes[this.targetBusNumber]) {
            message += ` This bus goes to ${this.busRoutes[this.targetBusNumber]}.`;
        }
        
        speechManager.speak(message);
        this.updateUI(true);
    }
    
    /**
     * Find nearby bus stops using navigation service
     */
    async findNearbyBusStops() {
        speechManager.speak('Looking for nearby bus stops...');
        
        if (typeof navigationService !== 'undefined') {
            try {
                const position = await navigationService.getCurrentLocation();
                const stops = await navigationService.findNearbyBusStops(
                    position.latitude, 
                    position.longitude,
                    500 // 500 meter radius
                );
                
                if (stops.length > 0) {
                    this.nearbyStops = stops;
                    
                    let message = `Found ${stops.length} bus stop${stops.length > 1 ? 's' : ''} nearby. `;
                    
                    stops.slice(0, 3).forEach((stop, i) => {
                        message += `${i + 1}: ${stop.name || 'Bus stop'} `;
                        message += `${Math.round(stop.distance)} meters ${stop.direction || 'away'}. `;
                    });
                    
                    speechManager.speak(message);
                } else {
                    speechManager.speak('No bus stops found within 500 meters.');
                }
            } catch (error) {
                speechManager.speak('Could not find bus stops. Location may not be available.');
            }
        } else {
            speechManager.speak('Navigation service not available for finding bus stops.');
        }
    }
    
    /**
     * Get route information for a bus
     */
    getRouteInfo(busNumber) {
        const normalizedNumber = busNumber.toUpperCase().replace(/[^A-Z0-9]/g, '');
        
        if (this.busRoutes[normalizedNumber]) {
            return {
                number: normalizedNumber,
                route: this.busRoutes[normalizedNumber],
                found: true
            };
        }
        
        return {
            number: normalizedNumber,
            route: null,
            found: false
        };
    }
    
    /**
     * List recent bus detections
     */
    listRecentBuses() {
        if (this.detectedBuses.length === 0) {
            speechManager.speak('No buses have been detected yet.');
            return;
        }
        
        const uniqueBuses = [...new Map(
            this.detectedBuses
                .slice(-10)
                .map(b => [b.number, b])
        ).values()];
        
        let message = `Recently detected buses: `;
        uniqueBuses.forEach((bus, i) => {
            message += `${bus.number}`;
            if (bus.route) message += ` to ${bus.route.split(' - ')[0]}`;
            if (i < uniqueBuses.length - 1) message += ', ';
        });
        
        speechManager.speak(message);
    }
    
    /**
     * Update UI
     */
    updateUI(active) {
        const modeContent = document.getElementById('mode-content');
        if (!modeContent) return;
        
        if (active) {
            modeContent.innerHTML = `
                <div class="bus-detection-display">
                    <div class="bus-header">
                        <span class="bus-icon">🚌</span>
                        <span class="bus-title">Bus Detection</span>
                    </div>
                    
                    <div class="target-bus-section">
                        <div id="target-bus-display">
                            ${this.targetBusNumber ? 
                                `<div class="watching-for">
                                    <span class="watch-icon">👁️</span>
                                    Watching for: <strong>${this.targetBusNumber}</strong>
                                    ${this.busRoutes[this.targetBusNumber] ? 
                                        `<br><small>${this.busRoutes[this.targetBusNumber]}</small>` : ''}
                                </div>` :
                                '<p class="hint">Say a bus number to watch for it</p>'
                            }
                        </div>
                        <div id="target-bus-alert"></div>
                    </div>
                    
                    <div class="bus-actions">
                        <button class="bus-action-btn" onclick="busDetectionMode.findNearbyBusStops()">
                            📍 Nearby Stops
                        </button>
                        <button class="bus-action-btn" onclick="busDetectionMode.listRecentBuses()">
                            📋 Recent Buses
                        </button>
                    </div>
                    
                    <div class="detected-buses">
                        <h4>Live Detection:</h4>
                        <div id="bus-list" class="bus-list">
                            <div class="scanning">Scanning for buses...</div>
                        </div>
                    </div>
                    
                    <div class="bus-stats">
                        <span>Buses detected: <span id="bus-count">0</span></span>
                        <span>OCR: <span id="ocr-status">${this.isOCRReady ? '✓' : '...'}</span></span>
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
    updateResultsDisplay(detections) {
        const busList = document.getElementById('bus-list');
        const busCount = document.getElementById('bus-count');
        const ocrStatus = document.getElementById('ocr-status');
        
        // Update OCR status
        if (ocrStatus) {
            ocrStatus.textContent = this.isOCRReady ? '✓ Ready' : 'Loading...';
        }
        
        // Update bus count
        if (busCount) {
            busCount.textContent = this.detectedBuses.length;
        }
        
        // Update bus list
        if (!busList) return;
        
        const buses = detections.filter(d => d.class.toLowerCase() === 'bus');
        
        if (buses.length > 0 || this.detectedBuses.length > 0) {
            // Show recent unique buses
            const recentBuses = [...new Map(
                this.detectedBuses
                    .slice(-10)
                    .map(b => [b.number, b])
            ).values()].reverse();
            
            const currentBuses = buses.map(b => ({
                number: b.busNumber || '???',
                position: b.position?.horizontal || 'unknown',
                distance: b.depth?.meters || b.distance?.meters || 0,
                isTarget: b.busNumber && this.targetBusNumber && 
                    b.busNumber.includes(this.targetBusNumber),
                current: true
            }));
            
            const allBuses = [...currentBuses, ...recentBuses.filter(rb => 
                !currentBuses.some(cb => cb.number === rb.number)
            )].slice(0, 8);
            
            busList.innerHTML = allBuses.map(b => `
                <div class="bus-item ${b.isTarget ? 'target' : ''} ${b.current ? 'current' : 'recent'}">
                    <span class="bus-num">${b.number}</span>
                    <span class="bus-pos">${b.position}</span>
                    <span class="bus-dist">${b.distance ? Math.round(b.distance) + 'm' : ''}</span>
                    ${b.isTarget ? '<span class="target-badge">★</span>' : ''}
                    ${this.busRoutes[b.number] ? 
                        `<div class="bus-route">${this.busRoutes[b.number].split(' - ').slice(0, 2).join(' → ')}</div>` : ''}
                </div>
            `).join('');
        } else {
            busList.innerHTML = '<div class="scanning">Scanning for buses...</div>';
        }
    }
    
    /**
     * Handle voice command
     */
    handleCommand(command) {
        const cmd = command.toLowerCase();
        
        // Exit commands
        if (cmd.includes('stop') || cmd.includes('exit') || cmd.includes('cancel')) {
            this.stop();
            return true;
        }
        
        // DESTINATION-BASED SEARCH - "I need to go to Banashankari" / "bus to Electronic City"
        // Common Bangalore destinations
        const destinations = [
            'banashankari', 'majestic', 'electronic city', 'whitefield', 'koramangala',
            'jayanagar', 'hebbal', 'marathahalli', 'airport', 'kengeri', 'btm', 'hsr',
            'indiranagar', 'mg road', 'silk board', 'kr puram', 'sarjapur', 'nagawara',
            'yelahanka', 'jp nagar', 'basavanagudi', 'shivajinagar', 'itpl'
        ];
        
        // Check for destination queries
        const destinationPatterns = [
            /(?:go|going|want|need|take me|get)\s*(?:to|towards?)\s+(.+)/i,
            /(?:bus|buses)\s*(?:to|for|towards?)\s+(.+)/i,
            /(?:how|which bus)\s*(?:to|can i|do i)\s*(?:reach|go to|get to)\s+(.+)/i,
            /(.+)\s*(?:bus|route)/i
        ];
        
        for (const pattern of destinationPatterns) {
            const match = cmd.match(pattern);
            if (match) {
                const destination = match[1].trim();
                // Check if it matches known destination
                const matchedDest = destinations.find(d => 
                    destination.includes(d) || d.includes(destination)
                );
                if (matchedDest || destination.length > 3) {
                    this.findBusToDestination(matchedDest || destination);
                    return true;
                }
            }
        }
        
        // Direct destination mention
        for (const dest of destinations) {
            if (cmd.includes(dest) && !cmd.includes('bus number')) {
                this.findBusToDestination(dest);
                return true;
            }
        }
        
        // Bus timings query
        if (cmd.includes('timing') || cmd.includes('schedule') || cmd.includes('when does') ||
            cmd.includes('what time') || cmd.includes('frequency')) {
            const numberMatch = cmd.match(/\d+[a-z]?/i);
            if (numberMatch) {
                const timings = this.getBusTimings(numberMatch[0]);
                if (timings) {
                    let message = `Bus ${timings.number}, ${timings.name}. `;
                    if (timings.frequency) message += `Frequency: ${timings.frequency}. `;
                    if (timings.operatingHours) message += `Operating hours: ${timings.operatingHours}. `;
                    if (timings.stops) message += `Stops at: ${timings.stops.slice(0, 4).join(', ')}.`;
                    speechManager.speak(message, true);
                } else {
                    speechManager.speak(`I don't have timing information for bus ${numberMatch[0]}.`, true);
                }
                return true;
            }
        }
        
        // Find nearest bus stop
        if (cmd.includes('nearest stop') || cmd.includes('closest stop') || 
            cmd.includes('find stop') || cmd.includes('where is the stop') ||
            cmd.includes('bus stop near')) {
            this.findNearestBusStop();
            return true;
        }
        
        // Set target bus
        if (cmd.includes('watch for') || cmd.includes('looking for') || 
            cmd.includes('waiting for') || cmd.includes('my bus is') ||
            cmd.includes('find bus') || cmd.includes('bus number')) {
            const numberMatch = cmd.match(/\d+[a-z]?/i);
            if (numberMatch) {
                this.setTargetBus(numberMatch[0]);
                return true;
            }
        }
        
        // Just a number might be the bus they're looking for
        const pureNumber = cmd.replace(/[^0-9a-z-]/gi, '');
        if (pureNumber.length >= 1 && pureNumber.length <= 6 && /\d/.test(pureNumber)) {
            // Check if it's a known bus number
            const normalizedNum = pureNumber.toUpperCase();
            if (this.busRoutes[normalizedNum] || this.busRoutes[normalizedNum.replace('-', '')]) {
                this.setTargetBus(pureNumber);
                return true;
            }
        }
        
        // Nearby stops (legacy)
        if (cmd.includes('nearby') || cmd.includes('bus stop') || cmd.includes('where')) {
            this.findNearestBusStop();
            return true;
        }
        
        // List detected buses
        if (cmd.includes('what buses') || cmd.includes('list') || cmd.includes('recent')) {
            this.listRecentBuses();
            return true;
        }
        
        // Route info
        if (cmd.includes('route') || cmd.includes('where does')) {
            const numberMatch = cmd.match(/\d+[a-z]?/i);
            if (numberMatch) {
                const timings = this.getBusTimings(numberMatch[0]);
                if (timings) {
                    speechManager.speak(`Bus ${timings.number} goes from ${timings.route}. Stops: ${timings.stops.join(', ')}.`, true);
                } else {
                    speechManager.speak(`I don't have route information for bus ${numberMatch[0]}.`);
                }
                return true;
            }
        }
        
        // Clear target
        if (cmd.includes('clear') || cmd.includes('reset') || cmd.includes('any bus')) {
            this.targetBusNumber = null;
            speechManager.speak('Target bus cleared. Now watching for all buses.');
            this.updateUI(true);
            return true;
        }
        
        // Safety toggle
        if (cmd.includes('safety')) {
            this.safetyMode = !this.safetyMode;
            speechManager.speak(`Traffic safety alerts ${this.safetyMode ? 'enabled' : 'disabled'}.`);
            return true;
        }
        
        return false;
    }
}

// Export singleton instance
const busDetectionMode = new BusDetectionMode();
