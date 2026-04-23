/**
 * BlindNav+ User Preferences Manager
 * Handles persistent storage for user onboarding and personalization
 * Data persists across page refreshes, server restarts, and application restarts
 * Data is ONLY cleared when the physical Reset button is pressed
 */

class UserPreferencesManager {
    constructor() {
        // Storage keys
        this.STORAGE_KEY = 'blindnav_user_preferences';
        this.VERSION_KEY = 'blindnav_preferences_version';
        this.CURRENT_VERSION = '1.0.0';
        
        // Default preferences structure
        this.defaultPreferences = {
            // Core onboarding fields
            isFirstTimeUser: true,
            instructionPreference: null, // 'render' | 'skip' | null (not yet decided)
            usageCount: 0,
            lastUsedTimestamp: null,
            
            // User personalization
            userName: null,
            userLanguage: 'en-US',
            
            // Optional future expansion
            personalizationData: {
                favoriteDestinations: [],
                frequentBusRoutes: [],
                preferredModes: [],
                accessibilitySettings: {
                    speechRate: 1.0,
                    speechVolume: 1.0,
                    highContrast: false,
                    vibrationFeedback: true
                }
            },
            
            // System tracking
            totalSessionTime: 0,
            lastModeUsed: null,
            onboardingCompletedAt: null,
            
            // Version for migration
            version: this.CURRENT_VERSION
        };
        
        // Current preferences (loaded from storage)
        this.preferences = null;
        
        // Callbacks
        this.onPreferencesLoaded = null;
        this.onPreferencesUpdated = null;
        this.onReset = null;
        
        // Initialize
        this.init();
    }
    
    /**
     * Initialize preferences manager - load from storage
     */
    init() {
        console.log('[UserPrefs] Initializing user preferences manager...');
        this.loadPreferences();
        console.log('[UserPrefs] Preferences loaded:', this.isFirstTimeUser() ? 'First-time user' : 'Returning user');
    }
    
    /**
     * Load preferences from localStorage
     */
    loadPreferences() {
        try {
            const stored = localStorage.getItem(this.STORAGE_KEY);
            
            if (stored) {
                const parsed = JSON.parse(stored);
                
                // Check version and migrate if needed
                if (parsed.version !== this.CURRENT_VERSION) {
                    console.log('[UserPrefs] Migrating preferences from version', parsed.version);
                    this.preferences = this.migratePreferences(parsed);
                } else {
                    this.preferences = parsed;
                }
                
                console.log('[UserPrefs] Loaded existing preferences');
            } else {
                // No stored preferences - use defaults (first-time user)
                this.preferences = { ...this.defaultPreferences };
                console.log('[UserPrefs] No existing preferences - first-time user');
            }
            
            if (this.onPreferencesLoaded) {
                this.onPreferencesLoaded(this.preferences);
            }
            
        } catch (error) {
            console.error('[UserPrefs] Error loading preferences:', error);
            // Reset to defaults on error
            this.preferences = { ...this.defaultPreferences };
        }
    }
    
    /**
     * Save current preferences to localStorage
     */
    savePreferences() {
        try {
            this.preferences.version = this.CURRENT_VERSION;
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.preferences));
            console.log('[UserPrefs] Preferences saved');
            
            if (this.onPreferencesUpdated) {
                this.onPreferencesUpdated(this.preferences);
            }
            
            return true;
        } catch (error) {
            console.error('[UserPrefs] Error saving preferences:', error);
            return false;
        }
    }
    
    /**
     * Migrate preferences from older versions
     */
    migratePreferences(oldPrefs) {
        const newPrefs = { ...this.defaultPreferences };
        
        // Copy over existing valid fields
        if (oldPrefs.isFirstTimeUser !== undefined) newPrefs.isFirstTimeUser = oldPrefs.isFirstTimeUser;
        if (oldPrefs.instructionPreference) newPrefs.instructionPreference = oldPrefs.instructionPreference;
        if (oldPrefs.usageCount !== undefined) newPrefs.usageCount = oldPrefs.usageCount;
        if (oldPrefs.lastUsedTimestamp) newPrefs.lastUsedTimestamp = oldPrefs.lastUsedTimestamp;
        if (oldPrefs.userName) newPrefs.userName = oldPrefs.userName;
        if (oldPrefs.userLanguage) newPrefs.userLanguage = oldPrefs.userLanguage;
        if (oldPrefs.personalizationData) {
            newPrefs.personalizationData = { ...this.defaultPreferences.personalizationData, ...oldPrefs.personalizationData };
        }
        
        newPrefs.version = this.CURRENT_VERSION;
        
        // Save migrated preferences
        this.preferences = newPrefs;
        this.savePreferences();
        
        return newPrefs;
    }
    
    // ==================== CORE STATE QUERIES ====================
    
    /**
     * Check if this is a first-time user
     * @returns {boolean}
     */
    isFirstTimeUser() {
        return this.preferences?.isFirstTimeUser === true;
    }
    
    /**
     * Check if user wants instructions rendered
     * @returns {boolean}
     */
    shouldRenderInstructions() {
        return this.preferences?.instructionPreference === 'render';
    }
    
    /**
     * Check if user has completed onboarding
     * @returns {boolean}
     */
    hasCompletedOnboarding() {
        return this.preferences?.isFirstTimeUser === false;
    }
    
    /**
     * Get the instruction preference
     * @returns {'render'|'skip'|null}
     */
    getInstructionPreference() {
        return this.preferences?.instructionPreference || null;
    }
    
    /**
     * Get usage count
     * @returns {number}
     */
    getUsageCount() {
        return this.preferences?.usageCount || 0;
    }
    
    /**
     * Get user name
     * @returns {string|null}
     */
    getUserName() {
        return this.preferences?.userName || null;
    }
    
    /**
     * Get user language
     * @returns {string}
     */
    getUserLanguage() {
        return this.preferences?.userLanguage || 'en-US';
    }
    
    // ==================== STATE UPDATES ====================
    
    /**
     * Complete onboarding with user's choice about instructions
     * @param {boolean} wantsInstructions - Whether user wants to hear instructions
     * @param {string} userName - User's name (optional)
     */
    completeOnboarding(wantsInstructions, userName = null) {
        console.log('[UserPrefs] Completing onboarding:', { wantsInstructions, userName });
        
        this.preferences.isFirstTimeUser = false;
        this.preferences.instructionPreference = wantsInstructions ? 'render' : 'skip';
        this.preferences.onboardingCompletedAt = new Date().toISOString();
        
        if (userName) {
            this.preferences.userName = userName;
        }
        
        this.incrementUsageCount();
        this.updateLastUsed();
        this.savePreferences();
    }
    
    /**
     * Mark user as returning (increment usage, update timestamp)
     */
    recordReturningUserSession() {
        console.log('[UserPrefs] Recording returning user session');
        this.incrementUsageCount();
        this.updateLastUsed();
        this.savePreferences();
    }
    
    /**
     * Increment usage count
     */
    incrementUsageCount() {
        this.preferences.usageCount = (this.preferences.usageCount || 0) + 1;
    }
    
    /**
     * Update last used timestamp
     */
    updateLastUsed() {
        this.preferences.lastUsedTimestamp = new Date().toISOString();
    }
    
    /**
     * Set user name
     * @param {string} name
     */
    setUserName(name) {
        this.preferences.userName = name;
        this.savePreferences();
    }
    
    /**
     * Set user language
     * @param {string} language
     */
    setUserLanguage(language) {
        this.preferences.userLanguage = language;
        this.savePreferences();
    }
    
    /**
     * Update personalization data
     * @param {object} data - Partial personalization data to merge
     */
    updatePersonalization(data) {
        this.preferences.personalizationData = {
            ...this.preferences.personalizationData,
            ...data
        };
        this.savePreferences();
    }
    
    /**
     * Set last mode used
     * @param {string} modeName
     */
    setLastModeUsed(modeName) {
        this.preferences.lastModeUsed = modeName;
        this.savePreferences();
    }
    
    /**
     * Add session time
     * @param {number} seconds
     */
    addSessionTime(seconds) {
        this.preferences.totalSessionTime = (this.preferences.totalSessionTime || 0) + seconds;
        this.savePreferences();
    }
    
    /**
     * Add favorite destination
     * @param {string} destination
     */
    addFavoriteDestination(destination) {
        if (!this.preferences.personalizationData.favoriteDestinations.includes(destination)) {
            this.preferences.personalizationData.favoriteDestinations.push(destination);
            this.savePreferences();
        }
    }
    
    /**
     * Add frequent bus route
     * @param {string} route
     */
    addFrequentBusRoute(route) {
        if (!this.preferences.personalizationData.frequentBusRoutes.includes(route)) {
            this.preferences.personalizationData.frequentBusRoutes.push(route);
            this.savePreferences();
        }
    }
    
    // ==================== RESET FUNCTIONALITY ====================
    
    /**
     * RESET ALL USER DATA - Only called by physical Reset button
     * Clears ALL persisted data and returns to first-time user state
     * This is the ONLY way to reset preferences
     */
    resetAllData() {
        console.log('[UserPrefs] ⚠️ RESETTING ALL USER DATA');
        
        // Clear from localStorage
        localStorage.removeItem(this.STORAGE_KEY);
        localStorage.removeItem(this.VERSION_KEY);
        
        // Also clear any other BlindNav+ related storage
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('blindnav_')) {
                keysToRemove.push(key);
            }
        }
        keysToRemove.forEach(key => localStorage.removeItem(key));
        
        // Reset to defaults
        this.preferences = { ...this.defaultPreferences };
        
        // Save the fresh defaults
        this.savePreferences();
        
        console.log('[UserPrefs] ✓ All data reset. System is now in first-time user state.');
        
        if (this.onReset) {
            this.onReset();
        }
        
        return true;
    }
    
    // ==================== DEBUG & UTILITY ====================
    
    /**
     * Get all preferences (for debugging)
     * @returns {object}
     */
    getAllPreferences() {
        return { ...this.preferences };
    }
    
    /**
     * Get a summary string of current state
     * @returns {string}
     */
    getStatusSummary() {
        const p = this.preferences;
        return `User: ${p.userName || 'Unknown'} | First-time: ${p.isFirstTimeUser} | Instructions: ${p.instructionPreference || 'not set'} | Sessions: ${p.usageCount}`;
    }
    
    /**
     * Export preferences as JSON string
     * @returns {string}
     */
    exportPreferences() {
        return JSON.stringify(this.preferences, null, 2);
    }
    
    /**
     * Import preferences from JSON string (for restore/backup)
     * @param {string} jsonString
     * @returns {boolean}
     */
    importPreferences(jsonString) {
        try {
            const imported = JSON.parse(jsonString);
            this.preferences = { ...this.defaultPreferences, ...imported };
            this.savePreferences();
            return true;
        } catch (error) {
            console.error('[UserPrefs] Import failed:', error);
            return false;
        }
    }
}

// Create global instance
const userPreferencesManager = new UserPreferencesManager();

// Make available globally
window.userPreferencesManager = userPreferencesManager;

console.log('[UserPrefs] User Preferences Manager loaded');
