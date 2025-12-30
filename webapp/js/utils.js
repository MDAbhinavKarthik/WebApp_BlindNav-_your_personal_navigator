/**
 * BlindNav+ Utility Helpers
 * Common utility functions used throughout the application
 */

const Utils = {
    /**
     * Debounce function execution
     * @param {Function} func - Function to debounce
     * @param {number} wait - Wait time in ms
     * @returns {Function} - Debounced function
     */
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },
    
    /**
     * Throttle function execution
     * @param {Function} func - Function to throttle
     * @param {number} limit - Time limit in ms
     * @returns {Function} - Throttled function
     */
    throttle(func, limit) {
        let inThrottle;
        return function executedFunction(...args) {
            if (!inThrottle) {
                func(...args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    },
    
    /**
     * Format distance for speech
     * @param {string} distance - Distance category
     * @returns {string} - Formatted distance
     */
    formatDistance(distance) {
        const distances = {
            'very close': 'very close, about 1 meter',
            'close': 'close, about 2 to 3 meters',
            'moderate': 'at moderate distance, about 4 to 5 meters',
            'far': 'far away, more than 5 meters'
        };
        return distances[distance] || distance;
    },
    
    /**
     * Format position for speech
     * @param {string} position - Position (left/center/right)
     * @returns {string} - Formatted position
     */
    formatPosition(position) {
        const positions = {
            'left': 'to your left',
            'center': 'directly ahead',
            'right': 'to your right'
        };
        return positions[position] || position;
    },
    
    /**
     * Get time of day greeting
     * @returns {string} - Greeting based on time
     */
    getTimeGreeting() {
        const hour = new Date().getHours();
        if (hour < 12) return 'Good morning';
        if (hour < 17) return 'Good afternoon';
        if (hour < 21) return 'Good evening';
        return 'Good night';
    },
    
    /**
     * Format timestamp for display
     * @param {Date} date - Date object
     * @returns {string} - Formatted time
     */
    formatTime(date = new Date()) {
        return date.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        });
    },
    
    /**
     * Generate unique ID
     * @returns {string} - Unique identifier
     */
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    },
    
    /**
     * Check if device is mobile
     * @returns {boolean} - True if mobile device
     */
    isMobile() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    },
    
    /**
     * Check if device supports vibration
     * @returns {boolean} - True if vibration supported
     */
    supportsVibration() {
        return 'vibrate' in navigator;
    },
    
    /**
     * Trigger haptic feedback
     * @param {string} type - Feedback type (light/medium/heavy/error)
     */
    hapticFeedback(type = 'medium') {
        if (!this.supportsVibration()) return;
        
        const patterns = {
            light: [10],
            medium: [30],
            heavy: [50],
            error: [50, 50, 50],
            success: [30, 30],
            warning: [100, 50, 100]
        };
        
        navigator.vibrate(patterns[type] || patterns.medium);
    },
    
    /**
     * Get current location
     * @returns {Promise<Object>} - Location coordinates
     */
    async getCurrentLocation() {
        return new Promise((resolve, reject) => {
            if (!('geolocation' in navigator)) {
                reject(new Error('Geolocation not supported'));
                return;
            }
            
            navigator.geolocation.getCurrentPosition(
                position => {
                    resolve({
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude,
                        accuracy: position.coords.accuracy
                    });
                },
                error => {
                    reject(error);
                },
                {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 0
                }
            );
        });
    },
    
    /**
     * Format location for display/speech
     * @param {Object} location - Location object
     * @returns {string} - Formatted location string
     */
    formatLocation(location) {
        if (!location) return 'Location unavailable';
        return `Latitude ${location.latitude.toFixed(6)}, Longitude ${location.longitude.toFixed(6)}`;
    },
    
    /**
     * Local storage helpers
     */
    storage: {
        get(key, defaultValue = null) {
            try {
                const item = localStorage.getItem(key);
                return item ? JSON.parse(item) : defaultValue;
            } catch (e) {
                console.error('[Utils] Storage get error:', e);
                return defaultValue;
            }
        },
        
        set(key, value) {
            try {
                localStorage.setItem(key, JSON.stringify(value));
                return true;
            } catch (e) {
                console.error('[Utils] Storage set error:', e);
                return false;
            }
        },
        
        remove(key) {
            try {
                localStorage.removeItem(key);
                return true;
            } catch (e) {
                console.error('[Utils] Storage remove error:', e);
                return false;
            }
        },
        
        clear() {
            try {
                localStorage.clear();
                return true;
            } catch (e) {
                console.error('[Utils] Storage clear error:', e);
                return false;
            }
        }
    },
    
    /**
     * Audio helpers
     */
    audio: {
        // Pre-defined alert sounds using Web Audio API
        playTone(frequency = 440, duration = 200, type = 'sine') {
            try {
                const audioContext = new (window.AudioContext || window.webkitAudioContext)();
                const oscillator = audioContext.createOscillator();
                const gainNode = audioContext.createGain();
                
                oscillator.connect(gainNode);
                gainNode.connect(audioContext.destination);
                
                oscillator.frequency.value = frequency;
                oscillator.type = type;
                
                gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration / 1000);
                
                oscillator.start(audioContext.currentTime);
                oscillator.stop(audioContext.currentTime + duration / 1000);
            } catch (e) {
                console.warn('[Utils] Audio playTone error:', e);
            }
        },
        
        playAlert() {
            this.playTone(880, 150);
            setTimeout(() => this.playTone(880, 150), 200);
        },
        
        playWarning() {
            this.playTone(660, 300);
        },
        
        playSuccess() {
            this.playTone(523, 100);
            setTimeout(() => this.playTone(659, 100), 100);
            setTimeout(() => this.playTone(784, 150), 200);
        },
        
        playError() {
            this.playTone(200, 300, 'square');
        }
    },
    
    /**
     * Text processing helpers
     */
    text: {
        /**
         * Pluralize a word based on count
         * @param {string} word - Word to pluralize
         * @param {number} count - Count
         * @returns {string} - Pluralized word
         */
        pluralize(word, count) {
            if (count === 1) return word;
            
            // Simple pluralization rules
            const irregulars = {
                'person': 'people',
                'child': 'children',
                'mouse': 'mice'
            };
            
            if (irregulars[word]) return irregulars[word];
            
            if (word.endsWith('s') || word.endsWith('x') || word.endsWith('ch') || word.endsWith('sh')) {
                return word + 'es';
            }
            if (word.endsWith('y') && !['a', 'e', 'i', 'o', 'u'].includes(word[word.length - 2])) {
                return word.slice(0, -1) + 'ies';
            }
            return word + 's';
        },
        
        /**
         * Capitalize first letter
         * @param {string} text - Text to capitalize
         * @returns {string} - Capitalized text
         */
        capitalize(text) {
            if (!text) return '';
            return text.charAt(0).toUpperCase() + text.slice(1);
        },
        
        /**
         * Join array with proper grammar
         * @param {Array} items - Items to join
         * @returns {string} - Grammatically correct string
         */
        joinWithAnd(items) {
            if (!items || items.length === 0) return '';
            if (items.length === 1) return items[0];
            if (items.length === 2) return `${items[0]} and ${items[1]}`;
            return `${items.slice(0, -1).join(', ')}, and ${items[items.length - 1]}`;
        }
    },
    
    /**
     * Performance monitoring
     */
    performance: {
        marks: {},
        
        start(name) {
            this.marks[name] = performance.now();
        },
        
        end(name) {
            if (!this.marks[name]) return 0;
            const duration = performance.now() - this.marks[name];
            delete this.marks[name];
            return duration;
        },
        
        measure(name, fn) {
            this.start(name);
            const result = fn();
            const duration = this.end(name);
            console.log(`[Perf] ${name}: ${duration.toFixed(2)}ms`);
            return result;
        },
        
        async measureAsync(name, fn) {
            this.start(name);
            const result = await fn();
            const duration = this.end(name);
            console.log(`[Perf] ${name}: ${duration.toFixed(2)}ms`);
            return result;
        }
    },
    
    /**
     * Network helpers
     */
    network: {
        /**
         * Check if online
         * @returns {boolean} - Online status
         */
        isOnline() {
            return navigator.onLine;
        },
        
        /**
         * Check connection type
         * @returns {Object} - Connection info
         */
        getConnectionInfo() {
            const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
            if (!connection) return { type: 'unknown', effectiveType: 'unknown' };
            
            return {
                type: connection.type || 'unknown',
                effectiveType: connection.effectiveType || 'unknown',
                downlink: connection.downlink,
                rtt: connection.rtt
            };
        }
    }
};

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Utils;
}
