/**
 * BlindNav+ Bus Routes Data
 * Sample bus routes data for bus detection mode
 * Customize this file with local bus route information
 */

const BusRoutes = {
    // Sample routes - customize for your local area
    routes: {
        "1": {
            name: "Route 1",
            destinations: ["Central Station", "University", "Shopping Mall"],
            frequency: "Every 10 minutes",
            schedule: {
                weekday: { start: "06:00", end: "23:00" },
                weekend: { start: "07:00", end: "22:00" }
            }
        },
        "2": {
            name: "Route 2",
            destinations: ["Hospital", "Town Center", "Residential Area"],
            frequency: "Every 15 minutes",
            schedule: {
                weekday: { start: "06:00", end: "22:00" },
                weekend: { start: "08:00", end: "21:00" }
            }
        },
        "5": {
            name: "Route 5",
            destinations: ["Airport", "Business District", "Central Station"],
            frequency: "Every 20 minutes",
            schedule: {
                weekday: { start: "05:00", end: "00:00" },
                weekend: { start: "06:00", end: "00:00" }
            }
        },
        "10": {
            name: "Route 10",
            destinations: ["Beach", "Tourist Area", "Old Town"],
            frequency: "Every 30 minutes",
            schedule: {
                weekday: { start: "07:00", end: "20:00" },
                weekend: { start: "08:00", end: "22:00" }
            }
        },
        "15": {
            name: "Route 15",
            destinations: ["Industrial Zone", "Suburb", "Train Station"],
            frequency: "Every 25 minutes",
            schedule: {
                weekday: { start: "06:30", end: "21:00" },
                weekend: { start: "08:00", end: "19:00" }
            }
        },
        "21": {
            name: "Route 21",
            destinations: ["Stadium", "Park", "Museum District"],
            frequency: "Every 20 minutes",
            schedule: {
                weekday: { start: "07:00", end: "23:00" },
                weekend: { start: "08:00", end: "00:00" }
            }
        },
        "42": {
            name: "Route 42",
            destinations: ["Tech Park", "University", "Downtown"],
            frequency: "Every 12 minutes",
            schedule: {
                weekday: { start: "06:00", end: "22:00" },
                weekend: { start: "08:00", end: "20:00" }
            }
        },
        "55": {
            name: "Route 55",
            destinations: ["Convention Center", "Hotel District", "Airport"],
            frequency: "Every 15 minutes",
            schedule: {
                weekday: { start: "05:30", end: "23:30" },
                weekend: { start: "06:30", end: "23:30" }
            }
        },
        "100": {
            name: "Express Route 100",
            destinations: ["North Terminal", "Central Hub", "South Terminal"],
            frequency: "Every 8 minutes",
            schedule: {
                weekday: { start: "05:00", end: "00:00" },
                weekend: { start: "06:00", end: "00:00" }
            }
        },
        "X1": {
            name: "Express X1",
            destinations: ["Airport", "City Center"],
            frequency: "Every 30 minutes",
            schedule: {
                weekday: { start: "04:00", end: "01:00" },
                weekend: { start: "04:00", end: "01:00" }
            }
        }
    },
    
    // User's saved bus numbers
    savedBuses: [],
    
    /**
     * Get information about a bus route
     * @param {string} busNumber - Bus number
     * @returns {Object|null} - Route info or null
     */
    getRouteInfo(busNumber) {
        const normalizedNumber = String(busNumber).toUpperCase().trim();
        return this.routes[normalizedNumber] || null;
    },
    
    /**
     * Generate speech description for a bus route
     * @param {string} busNumber - Bus number
     * @returns {string} - Description for speech
     */
    describeRoute(busNumber) {
        const route = this.getRouteInfo(busNumber);
        if (!route) {
            return `Bus ${busNumber} is not in my database. It might be a local route.`;
        }
        
        const destinations = route.destinations.join(', then ');
        return `Bus ${busNumber}, ${route.name}, goes to ${destinations}. It runs ${route.frequency.toLowerCase()}.`;
    },
    
    /**
     * Check if bus is currently running
     * @param {string} busNumber - Bus number
     * @returns {Object} - Running status
     */
    isRunning(busNumber) {
        const route = this.getRouteInfo(busNumber);
        if (!route) return { running: true, message: 'Schedule unknown' }; // Assume running if unknown
        
        const now = new Date();
        const isWeekend = now.getDay() === 0 || now.getDay() === 6;
        const schedule = isWeekend ? route.schedule.weekend : route.schedule.weekday;
        
        const currentTime = now.getHours() * 60 + now.getMinutes();
        const [startHour, startMin] = schedule.start.split(':').map(Number);
        const [endHour, endMin] = schedule.end.split(':').map(Number);
        const startTime = startHour * 60 + startMin;
        let endTime = endHour * 60 + endMin;
        
        // Handle overnight schedules
        if (endTime < startTime) endTime += 24 * 60;
        const adjustedCurrent = currentTime < startTime ? currentTime + 24 * 60 : currentTime;
        
        const isRunning = adjustedCurrent >= startTime && adjustedCurrent <= endTime;
        
        return {
            running: isRunning,
            message: isRunning 
                ? `Currently running until ${schedule.end}` 
                : `Not running. Starts at ${schedule.start}`
        };
    },
    
    /**
     * Save a bus number to favorites
     * @param {string} busNumber - Bus number to save
     */
    saveBus(busNumber) {
        const normalized = String(busNumber).toUpperCase().trim();
        if (!this.savedBuses.includes(normalized)) {
            this.savedBuses.push(normalized);
            this.persistSavedBuses();
        }
    },
    
    /**
     * Remove a bus from favorites
     * @param {string} busNumber - Bus number to remove
     */
    removeBus(busNumber) {
        const normalized = String(busNumber).toUpperCase().trim();
        this.savedBuses = this.savedBuses.filter(b => b !== normalized);
        this.persistSavedBuses();
    },
    
    /**
     * Get list of saved buses
     * @returns {Array} - Saved bus numbers
     */
    getSavedBuses() {
        return [...this.savedBuses];
    },
    
    /**
     * Persist saved buses to localStorage
     */
    persistSavedBuses() {
        try {
            localStorage.setItem('blindnav_saved_buses', JSON.stringify(this.savedBuses));
        } catch (e) {
            console.error('[BusRoutes] Failed to persist saved buses:', e);
        }
    },
    
    /**
     * Load saved buses from localStorage
     */
    loadSavedBuses() {
        try {
            const saved = localStorage.getItem('blindnav_saved_buses');
            if (saved) {
                this.savedBuses = JSON.parse(saved);
            }
        } catch (e) {
            console.error('[BusRoutes] Failed to load saved buses:', e);
            this.savedBuses = [];
        }
    },
    
    /**
     * Search routes by destination
     * @param {string} destination - Destination to search
     * @returns {Array} - Matching route numbers
     */
    searchByDestination(destination) {
        const searchTerm = destination.toLowerCase();
        const matches = [];
        
        for (const [number, route] of Object.entries(this.routes)) {
            const hasMatch = route.destinations.some(dest => 
                dest.toLowerCase().includes(searchTerm)
            );
            if (hasMatch) {
                matches.push({
                    number,
                    name: route.name,
                    destinations: route.destinations
                });
            }
        }
        
        return matches;
    },
    
    /**
     * Get all available route numbers
     * @returns {Array} - All route numbers
     */
    getAllRouteNumbers() {
        return Object.keys(this.routes);
    },
    
    /**
     * Normalize OCR text to extract bus number
     * @param {string} text - OCR text
     * @returns {string|null} - Extracted bus number or null
     */
    extractBusNumber(text) {
        if (!text) return null;
        
        // Clean the text
        const cleaned = text.toUpperCase().trim();
        
        // Common patterns for bus numbers
        const patterns = [
            /\b([0-9]{1,3}[A-Z]?)\b/,  // Numeric bus numbers like 42, 100, 5A
            /\b([A-Z][0-9]{1,2})\b/,    // Letter-first numbers like X1
            /BUS\s*([0-9A-Z]+)/i,        // "BUS" followed by number
            /ROUTE\s*([0-9A-Z]+)/i       // "ROUTE" followed by number
        ];
        
        for (const pattern of patterns) {
            const match = cleaned.match(pattern);
            if (match) {
                return match[1];
            }
        }
        
        return null;
    }
};

// Initialize on load
if (typeof window !== 'undefined') {
    BusRoutes.loadSavedBuses();
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = BusRoutes;
}
