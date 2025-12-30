/**
 * BlindNav+ Navigation Service
 * Comprehensive GPS navigation, routing, and location services
 * Supports outdoor/indoor navigation with auto-detection
 */

class NavigationService {
    constructor() {
        // Location state
        this.currentLocation = null;
        this.locationWatchId = null;
        this.isTracking = false;
        
        // Navigation state
        this.destination = null;
        this.route = null;
        this.currentStepIndex = 0;
        this.isNavigating = false;
        
        // Environment detection
        this.environment = 'unknown'; // outdoor, indoor, unknown
        this.lastEnvironmentCheck = 0;
        this.environmentCheckInterval = 30000; // 30 seconds
        
        // Nearby places cache
        this.nearbyBusStops = [];
        this.nearbyLandmarks = [];
        
        // API endpoints (free services)
        this.api = {
            osrm: 'https://router.project-osrm.org/route/v1',
            nominatim: 'https://nominatim.openstreetmap.org',
            overpass: 'https://overpass-api.de/api/interpreter'
        };
        
        // Navigation callbacks
        this.onLocationUpdate = null;
        this.onRouteUpdate = null;
        this.onNavigationStep = null;
        this.onError = null;
        
        console.log('[NavService] Initialized');
    }
    
    // ===== LOCATION SERVICES =====
    
    /**
     * Get current location with high accuracy
     * @returns {Promise<Object>} Location coordinates
     */
    async getCurrentLocation() {
        return new Promise((resolve, reject) => {
            if (!('geolocation' in navigator)) {
                reject(new Error('Geolocation not supported on this device'));
                return;
            }
            
            const options = {
                enableHighAccuracy: true,
                timeout: 15000,
                maximumAge: 0
            };
            
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const location = {
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude,
                        accuracy: position.coords.accuracy,
                        altitude: position.coords.altitude,
                        heading: position.coords.heading,
                        speed: position.coords.speed,
                        timestamp: position.timestamp
                    };
                    
                    this.currentLocation = location;
                    console.log('[NavService] Location:', location);
                    resolve(location);
                },
                (error) => {
                    console.error('[NavService] Location error:', error);
                    reject(this.formatGeolocationError(error));
                },
                options
            );
        });
    }
    
    /**
     * Format geolocation error for user
     */
    formatGeolocationError(error) {
        const errors = {
            1: 'Location permission denied. Please allow location access in your device settings.',
            2: 'Could not determine your location. Please ensure GPS is enabled.',
            3: 'Location request timed out. Please try again.'
        };
        return new Error(errors[error.code] || 'Unknown location error');
    }
    
    /**
     * Start continuous location tracking
     * @param {Function} callback - Called on each location update
     */
    startLocationTracking(callback) {
        if (this.isTracking) {
            console.log('[NavService] Already tracking location');
            return;
        }
        
        if (!('geolocation' in navigator)) {
            if (this.onError) this.onError('Geolocation not supported');
            return;
        }
        
        const options = {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 5000
        };
        
        this.locationWatchId = navigator.geolocation.watchPosition(
            (position) => {
                const location = {
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                    accuracy: position.coords.accuracy,
                    altitude: position.coords.altitude,
                    heading: position.coords.heading,
                    speed: position.coords.speed,
                    timestamp: position.timestamp
                };
                
                this.currentLocation = location;
                
                if (callback) callback(location);
                if (this.onLocationUpdate) this.onLocationUpdate(location);
                
                // Update navigation if active
                if (this.isNavigating) {
                    this.updateNavigation(location);
                }
            },
            (error) => {
                console.error('[NavService] Tracking error:', error);
                if (this.onError) this.onError(this.formatGeolocationError(error).message);
            },
            options
        );
        
        this.isTracking = true;
        console.log('[NavService] Location tracking started');
    }
    
    /**
     * Stop location tracking
     */
    stopLocationTracking() {
        if (this.locationWatchId !== null) {
            navigator.geolocation.clearWatch(this.locationWatchId);
            this.locationWatchId = null;
        }
        this.isTracking = false;
        console.log('[NavService] Location tracking stopped');
    }
    
    // ===== ADDRESS & GEOCODING =====
    
    /**
     * Get detailed address from coordinates using Nominatim
     * @param {number} lat - Latitude
     * @param {number} lon - Longitude
     * @returns {Promise<Object>} Address details
     */
    async getDetailedAddressFromCoords(lat, lon) {
        try {
            const url = `${this.api.nominatim}/reverse?format=json&lat=${lat}&lon=${lon}&addressdetails=1&zoom=18`;
            
            const response = await fetch(url, {
                headers: {
                    'User-Agent': 'BlindNav+ Navigation App'
                }
            });
            
            if (!response.ok) {
                throw new Error('Failed to fetch address');
            }
            
            const data = await response.json();
            
            const address = {
                displayName: data.display_name,
                street: data.address?.road || data.address?.pedestrian || '',
                houseNumber: data.address?.house_number || '',
                neighborhood: data.address?.neighbourhood || data.address?.suburb || '',
                city: data.address?.city || data.address?.town || data.address?.village || '',
                state: data.address?.state || '',
                country: data.address?.country || '',
                postcode: data.address?.postcode || '',
                type: data.type || 'unknown',
                raw: data
            };
            
            console.log('[NavService] Address:', address);
            return address;
            
        } catch (error) {
            console.error('[NavService] Address lookup error:', error);
            return null;
        }
    }
    
    /**
     * Search for a place by name
     * @param {string} query - Search query
     * @returns {Promise<Array>} Search results
     */
    async searchPlace(query) {
        try {
            const url = `${this.api.nominatim}/search?format=json&q=${encodeURIComponent(query)}&limit=5`;
            
            const response = await fetch(url, {
                headers: {
                    'User-Agent': 'BlindNav+ Navigation App'
                }
            });
            
            if (!response.ok) {
                throw new Error('Search failed');
            }
            
            const data = await response.json();
            
            return data.map(place => ({
                name: place.display_name,
                latitude: parseFloat(place.lat),
                longitude: parseFloat(place.lon),
                type: place.type,
                importance: place.importance
            }));
            
        } catch (error) {
            console.error('[NavService] Search error:', error);
            return [];
        }
    }
    
    // ===== DISTANCE CALCULATION =====
    
    /**
     * Calculate distance between two points using Haversine formula
     * @param {number} lat1 - Start latitude
     * @param {number} lon1 - Start longitude
     * @param {number} lat2 - End latitude
     * @param {number} lon2 - End longitude
     * @returns {number} Distance in meters
     */
    haversine(lat1, lon1, lat2, lon2) {
        const R = 6371000; // Earth's radius in meters
        const φ1 = lat1 * Math.PI / 180;
        const φ2 = lat2 * Math.PI / 180;
        const Δφ = (lat2 - lat1) * Math.PI / 180;
        const Δλ = (lon2 - lon1) * Math.PI / 180;
        
        const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
                  Math.cos(φ1) * Math.cos(φ2) *
                  Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
        
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        
        return R * c; // Distance in meters
    }
    
    /**
     * Calculate bearing between two points
     * @returns {number} Bearing in degrees
     */
    calculateBearing(lat1, lon1, lat2, lon2) {
        const φ1 = lat1 * Math.PI / 180;
        const φ2 = lat2 * Math.PI / 180;
        const Δλ = (lon2 - lon1) * Math.PI / 180;
        
        const y = Math.sin(Δλ) * Math.cos(φ2);
        const x = Math.cos(φ1) * Math.sin(φ2) -
                  Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
        
        const θ = Math.atan2(y, x);
        return (θ * 180 / Math.PI + 360) % 360;
    }
    
    /**
     * Convert bearing to direction
     * @param {number} bearing - Bearing in degrees
     * @returns {string} Direction text
     */
    bearingToDirection(bearing) {
        const directions = [
            { min: 337.5, max: 360, dir: 'north' },
            { min: 0, max: 22.5, dir: 'north' },
            { min: 22.5, max: 67.5, dir: 'northeast' },
            { min: 67.5, max: 112.5, dir: 'east' },
            { min: 112.5, max: 157.5, dir: 'southeast' },
            { min: 157.5, max: 202.5, dir: 'south' },
            { min: 202.5, max: 247.5, dir: 'southwest' },
            { min: 247.5, max: 292.5, dir: 'west' },
            { min: 292.5, max: 337.5, dir: 'northwest' }
        ];
        
        for (const d of directions) {
            if (bearing >= d.min && bearing < d.max) {
                return d.dir;
            }
        }
        return 'north';
    }
    
    /**
     * Format distance for speech
     * @param {number} meters - Distance in meters
     * @returns {string} Formatted distance
     */
    formatDistance(meters) {
        if (meters < 10) {
            return `${Math.round(meters)} meters`;
        } else if (meters < 100) {
            return `${Math.round(meters / 5) * 5} meters`;
        } else if (meters < 1000) {
            return `${Math.round(meters / 10) * 10} meters`;
        } else {
            const km = meters / 1000;
            return `${km.toFixed(1)} kilometers`;
        }
    }
    
    // ===== ROUTE CALCULATION =====
    
    /**
     * Calculate walking route using OSRM
     * @param {Object} start - Start coordinates {latitude, longitude}
     * @param {Object} end - End coordinates {latitude, longitude}
     * @returns {Promise<Object>} Route data
     */
    async calculateRoute(start, end) {
        try {
            const url = `${this.api.osrm}/walking/${start.longitude},${start.latitude};${end.longitude},${end.latitude}?overview=full&geometries=geojson&steps=true&annotations=true`;
            
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error('Route calculation failed');
            }
            
            const data = await response.json();
            
            if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
                throw new Error('No route found');
            }
            
            const osrmRoute = data.routes[0];
            
            // Parse route into navigation steps
            const steps = this.parseRouteSteps(osrmRoute);
            
            const route = {
                distance: osrmRoute.distance, // meters
                duration: osrmRoute.duration, // seconds
                geometry: osrmRoute.geometry,
                steps: steps,
                summary: osrmRoute.legs[0]?.summary || 'Walking route',
                waypoints: data.waypoints.map(wp => ({
                    name: wp.name,
                    location: { longitude: wp.location[0], latitude: wp.location[1] }
                }))
            };
            
            this.route = route;
            console.log('[NavService] Route calculated:', route);
            
            return route;
            
        } catch (error) {
            console.error('[NavService] Route error:', error);
            throw error;
        }
    }
    
    /**
     * Parse OSRM route steps into navigation instructions
     */
    parseRouteSteps(osrmRoute) {
        const steps = [];
        
        if (!osrmRoute.legs) return steps;
        
        for (const leg of osrmRoute.legs) {
            if (!leg.steps) continue;
            
            for (const step of leg.steps) {
                const instruction = this.generateInstruction(step);
                
                steps.push({
                    instruction: instruction,
                    distance: step.distance,
                    duration: step.duration,
                    mode: step.mode,
                    name: step.name || 'path',
                    maneuver: step.maneuver,
                    geometry: step.geometry,
                    location: {
                        longitude: step.maneuver.location[0],
                        latitude: step.maneuver.location[1]
                    }
                });
            }
        }
        
        return steps;
    }
    
    /**
     * Generate human-readable instruction from OSRM step
     */
    generateInstruction(step) {
        const maneuver = step.maneuver;
        const type = maneuver.type;
        const modifier = maneuver.modifier;
        const name = step.name || 'the path';
        const distance = this.formatDistance(step.distance);
        
        const turnMap = {
            'turn': {
                'left': 'Turn left',
                'right': 'Turn right',
                'slight left': 'Turn slightly left',
                'slight right': 'Turn slightly right',
                'sharp left': 'Turn sharp left',
                'sharp right': 'Turn sharp right',
                'uturn': 'Make a U-turn'
            },
            'new name': `Continue on ${name}`,
            'depart': `Start walking on ${name}`,
            'arrive': 'You have arrived at your destination',
            'merge': `Merge onto ${name}`,
            'continue': `Continue for ${distance}`,
            'roundabout': `Enter the roundabout and take exit ${maneuver.exit || 1}`,
            'fork': {
                'left': 'Keep left at the fork',
                'right': 'Keep right at the fork',
                'slight left': 'Keep left at the fork',
                'slight right': 'Keep right at the fork'
            }
        };
        
        if (type === 'turn' || type === 'fork') {
            const turnInstructions = turnMap[type];
            const turnInstruction = turnInstructions[modifier] || `Turn ${modifier}`;
            return `${turnInstruction} onto ${name}. Walk ${distance}.`;
        }
        
        if (type === 'arrive') {
            return 'You have arrived at your destination.';
        }
        
        if (type === 'depart') {
            return `Start walking. Head ${this.bearingToDirection(maneuver.bearing_after)} on ${name}. Walk ${distance}.`;
        }
        
        return `${turnMap[type] || `Continue ${modifier || ''}`} for ${distance}.`;
    }
    
    // ===== REAL-TIME NAVIGATION =====
    
    /**
     * Start real-time turn-by-turn navigation
     * @param {Object} destination - Destination coordinates
     * @param {Function} onStep - Callback for each navigation step
     */
    async startRealtimeNavigation(destination, onStep) {
        try {
            // Get current location
            if (!this.currentLocation) {
                await this.getCurrentLocation();
            }
            
            // Calculate route
            const route = await this.calculateRoute(this.currentLocation, destination);
            
            if (!route || route.steps.length === 0) {
                throw new Error('Could not calculate route');
            }
            
            this.destination = destination;
            this.currentStepIndex = 0;
            this.isNavigating = true;
            this.onNavigationStep = onStep;
            
            // Start location tracking
            this.startLocationTracking();
            
            // Announce first step
            if (onStep) {
                const firstStep = route.steps[0];
                onStep({
                    type: 'start',
                    step: firstStep,
                    totalDistance: route.distance,
                    totalDuration: route.duration,
                    stepsRemaining: route.steps.length
                });
            }
            
            console.log('[NavService] Navigation started');
            return route;
            
        } catch (error) {
            console.error('[NavService] Navigation start error:', error);
            throw error;
        }
    }
    
    /**
     * Update navigation based on current location
     */
    updateNavigation(location) {
        if (!this.isNavigating || !this.route) return;
        
        const currentStep = this.route.steps[this.currentStepIndex];
        if (!currentStep) {
            this.stopNavigation('arrived');
            return;
        }
        
        // Calculate distance to current step's target
        const distanceToStep = this.haversine(
            location.latitude,
            location.longitude,
            currentStep.location.latitude,
            currentStep.location.longitude
        );
        
        // Check if close enough to advance to next step (within 15 meters)
        if (distanceToStep < 15) {
            this.currentStepIndex++;
            
            if (this.currentStepIndex >= this.route.steps.length) {
                this.stopNavigation('arrived');
                return;
            }
            
            // Announce next step
            const nextStep = this.route.steps[this.currentStepIndex];
            if (this.onNavigationStep) {
                this.onNavigationStep({
                    type: 'step',
                    step: nextStep,
                    stepNumber: this.currentStepIndex + 1,
                    stepsRemaining: this.route.steps.length - this.currentStepIndex
                });
            }
        }
        
        // Periodic distance updates
        const distanceToDestination = this.haversine(
            location.latitude,
            location.longitude,
            this.destination.latitude,
            this.destination.longitude
        );
        
        if (this.onRouteUpdate) {
            this.onRouteUpdate({
                currentLocation: location,
                distanceToStep,
                distanceToDestination,
                currentStep,
                stepIndex: this.currentStepIndex
            });
        }
    }
    
    /**
     * Stop navigation
     * @param {string} reason - Reason for stopping
     */
    stopNavigation(reason = 'cancelled') {
        this.isNavigating = false;
        this.stopLocationTracking();
        
        if (this.onNavigationStep) {
            this.onNavigationStep({
                type: reason,
                message: reason === 'arrived' ? 'You have arrived at your destination!' : 'Navigation stopped.'
            });
        }
        
        this.route = null;
        this.destination = null;
        this.currentStepIndex = 0;
        
        console.log(`[NavService] Navigation stopped: ${reason}`);
    }
    
    // ===== NEARBY PLACES =====
    
    /**
     * Find nearby bus stops using Overpass API
     * @param {number} radius - Search radius in meters
     * @returns {Promise<Array>} Bus stops
     */
    async findNearbyBusStops(radius = 500) {
        if (!this.currentLocation) {
            await this.getCurrentLocation();
        }
        
        try {
            const query = `
                [out:json][timeout:10];
                (
                    node["highway"="bus_stop"](around:${radius},${this.currentLocation.latitude},${this.currentLocation.longitude});
                    node["public_transport"="platform"](around:${radius},${this.currentLocation.latitude},${this.currentLocation.longitude});
                    node["public_transport"="stop_position"](around:${radius},${this.currentLocation.latitude},${this.currentLocation.longitude});
                );
                out body;
            `;
            
            const response = await fetch(this.api.overpass, {
                method: 'POST',
                body: `data=${encodeURIComponent(query)}`
            });
            
            if (!response.ok) {
                throw new Error('Bus stop search failed');
            }
            
            const data = await response.json();
            
            const busStops = data.elements.map(stop => {
                const distance = this.haversine(
                    this.currentLocation.latitude,
                    this.currentLocation.longitude,
                    stop.lat,
                    stop.lon
                );
                
                const bearing = this.calculateBearing(
                    this.currentLocation.latitude,
                    this.currentLocation.longitude,
                    stop.lat,
                    stop.lon
                );
                
                return {
                    id: stop.id,
                    name: stop.tags?.name || 'Bus Stop',
                    routes: stop.tags?.route_ref || stop.tags?.ref || 'Unknown routes',
                    latitude: stop.lat,
                    longitude: stop.lon,
                    distance: Math.round(distance),
                    direction: this.bearingToDirection(bearing),
                    operator: stop.tags?.operator || ''
                };
            });
            
            // Sort by distance
            busStops.sort((a, b) => a.distance - b.distance);
            
            this.nearbyBusStops = busStops;
            console.log('[NavService] Found bus stops:', busStops);
            
            return busStops;
            
        } catch (error) {
            console.error('[NavService] Bus stop search error:', error);
            return [];
        }
    }
    
    /**
     * Find nearby landmarks and points of interest
     * @param {number} radius - Search radius in meters
     * @returns {Promise<Array>} Landmarks
     */
    async findNearbyLandmarks(radius = 200) {
        if (!this.currentLocation) {
            await this.getCurrentLocation();
        }
        
        try {
            const query = `
                [out:json][timeout:10];
                (
                    node["amenity"](around:${radius},${this.currentLocation.latitude},${this.currentLocation.longitude});
                    node["shop"](around:${radius},${this.currentLocation.latitude},${this.currentLocation.longitude});
                    node["tourism"](around:${radius},${this.currentLocation.latitude},${this.currentLocation.longitude});
                );
                out body;
            `;
            
            const response = await fetch(this.api.overpass, {
                method: 'POST',
                body: `data=${encodeURIComponent(query)}`
            });
            
            if (!response.ok) {
                throw new Error('Landmark search failed');
            }
            
            const data = await response.json();
            
            const landmarks = data.elements.map(place => {
                const distance = this.haversine(
                    this.currentLocation.latitude,
                    this.currentLocation.longitude,
                    place.lat,
                    place.lon
                );
                
                const bearing = this.calculateBearing(
                    this.currentLocation.latitude,
                    this.currentLocation.longitude,
                    place.lat,
                    place.lon
                );
                
                return {
                    id: place.id,
                    name: place.tags?.name || this.getPlaceTypeName(place.tags),
                    type: place.tags?.amenity || place.tags?.shop || place.tags?.tourism,
                    latitude: place.lat,
                    longitude: place.lon,
                    distance: Math.round(distance),
                    direction: this.bearingToDirection(bearing)
                };
            }).filter(l => l.name);
            
            landmarks.sort((a, b) => a.distance - b.distance);
            
            this.nearbyLandmarks = landmarks.slice(0, 10);
            return this.nearbyLandmarks;
            
        } catch (error) {
            console.error('[NavService] Landmark search error:', error);
            return [];
        }
    }
    
    /**
     * Get readable name for place type
     */
    getPlaceTypeName(tags) {
        if (!tags) return 'Unknown place';
        
        const type = tags.amenity || tags.shop || tags.tourism;
        const typeNames = {
            'restaurant': 'Restaurant',
            'cafe': 'Cafe',
            'bank': 'Bank',
            'atm': 'ATM',
            'pharmacy': 'Pharmacy',
            'hospital': 'Hospital',
            'clinic': 'Clinic',
            'police': 'Police Station',
            'post_office': 'Post Office',
            'fuel': 'Fuel Station',
            'parking': 'Parking',
            'toilets': 'Public Toilets',
            'supermarket': 'Supermarket',
            'convenience': 'Convenience Store'
        };
        
        return typeNames[type] || type || 'Unknown place';
    }
    
    // ===== ENVIRONMENT DETECTION =====
    
    /**
     * Detect if user is indoors or outdoors using various signals
     * @returns {Promise<Object>} Environment info
     */
    async detectEnvironment() {
        const signals = {
            gps: 'unknown',
            light: 'unknown',
            wifi: 'unknown',
            bluetooth: 'unknown'
        };
        
        // GPS accuracy check (poor GPS often indicates indoor)
        if (this.currentLocation) {
            if (this.currentLocation.accuracy > 50) {
                signals.gps = 'indoor';
            } else if (this.currentLocation.accuracy < 20) {
                signals.gps = 'outdoor';
            }
        }
        
        // Check ambient light sensor if available
        if ('AmbientLightSensor' in window) {
            try {
                const sensor = new AmbientLightSensor();
                sensor.addEventListener('reading', () => {
                    // Low light often indicates indoor
                    if (sensor.illuminance < 100) {
                        signals.light = 'indoor';
                    } else if (sensor.illuminance > 500) {
                        signals.light = 'outdoor';
                    }
                });
                sensor.start();
            } catch (e) {
                console.log('[NavService] Light sensor not available');
            }
        }
        
        // Determine environment based on signals
        const indoorCount = Object.values(signals).filter(s => s === 'indoor').length;
        const outdoorCount = Object.values(signals).filter(s => s === 'outdoor').length;
        
        if (indoorCount > outdoorCount) {
            this.environment = 'indoor';
        } else if (outdoorCount > indoorCount) {
            this.environment = 'outdoor';
        } else {
            this.environment = 'unknown';
        }
        
        this.lastEnvironmentCheck = Date.now();
        
        return {
            environment: this.environment,
            confidence: Math.abs(indoorCount - outdoorCount) / Object.keys(signals).length,
            signals
        };
    }
    
    /**
     * Check camera orientation for navigation
     * @returns {Object} Orientation info
     */
    checkCameraOrientation() {
        const orientation = {
            isLandscape: window.innerWidth > window.innerHeight,
            deviceOrientation: screen.orientation?.type || 'unknown',
            suggestedAction: null
        };
        
        // For walking navigation, portrait mode is usually better
        if (orientation.isLandscape) {
            orientation.suggestedAction = 'Consider rotating your phone to portrait mode for better navigation.';
        }
        
        return orientation;
    }
    
    /**
     * Get comprehensive location description for 360° awareness
     */
    async describe360() {
        const description = {
            currentLocation: null,
            address: null,
            nearbyBusStops: [],
            nearbyLandmarks: [],
            environment: null,
            timestamp: Date.now()
        };
        
        // Get current location
        try {
            description.currentLocation = await this.getCurrentLocation();
        } catch (e) {
            description.currentLocation = this.currentLocation;
        }
        
        // Get address
        if (description.currentLocation) {
            description.address = await this.getDetailedAddressFromCoords(
                description.currentLocation.latitude,
                description.currentLocation.longitude
            );
        }
        
        // Find nearby places
        description.nearbyBusStops = await this.findNearbyBusStops(300);
        description.nearbyLandmarks = await this.findNearbyLandmarks(150);
        
        // Detect environment
        description.environment = await this.detectEnvironment();
        
        return description;
    }
    
    /**
     * Generate spoken description of surroundings
     */
    async speakSurroundings() {
        const info = await this.describe360();
        
        let speech = '';
        
        // Address
        if (info.address) {
            speech += `You are near ${info.address.street || info.address.neighborhood || info.address.displayName}. `;
        }
        
        // Environment
        if (info.environment.environment !== 'unknown') {
            speech += `You appear to be ${info.environment.environment}. `;
        }
        
        // Nearby landmarks
        if (info.nearbyLandmarks.length > 0) {
            const closest = info.nearbyLandmarks.slice(0, 3);
            const landmarkList = closest.map(l => `${l.name} ${l.distance} meters to your ${l.direction}`).join(', ');
            speech += `Nearby: ${landmarkList}. `;
        }
        
        // Nearby bus stops
        if (info.nearbyBusStops.length > 0) {
            const closestStop = info.nearbyBusStops[0];
            speech += `Nearest bus stop is ${closestStop.name} at ${closestStop.distance} meters to your ${closestStop.direction}. `;
        }
        
        return speech || 'I could not determine your surroundings. Please ensure GPS is enabled.';
    }
}

// Create global instance
const navigationService = new NavigationService();
