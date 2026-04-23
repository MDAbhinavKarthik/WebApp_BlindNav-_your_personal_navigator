/**
 * BlindNav+ Configuration
 * Central configuration for the web application
 */

const CONFIG = {
    // Application info
    app: {
        name: 'BlindNav+',
        version: '1.0.0',
        description: 'Your Personal Navigator for the Visually Impaired'
    },
    
    // Camera settings
    camera: {
        defaultPort: 81,
        streamPath: '/stream',
        infoPath: '/',
        connectionTimeout: 5000,
        reconnectAttempts: 3,
        reconnectDelay: 2000,
        frameRate: 10 // Target FPS for processing
    },
    
    // Detection settings
    detection: {
        model: 'mobilenet_v2', // COCO-SSD base model
        minScore: 0.5,
        maxDetections: 20,
        
        // Distance thresholds based on object height ratio
        distanceThresholds: {
            veryClose: 0.6,
            close: 0.4,
            moderate: 0.2
        },
        
        // Obstacle detection settings
        obstacles: {
            alertClasses: ['person', 'car', 'bicycle', 'motorcycle', 'bus', 'truck', 'chair', 'dog', 'cat'],
            dangerZoneRatio: 0.5, // Height ratio for "very close"
            warningZoneRatio: 0.3 // Height ratio for "close"
        }
    },
    
    // Speech settings
    speech: {
        defaultRate: 1.0,
        defaultPitch: 1.0,
        defaultVolume: 1.0,
        language: 'en-US',
        
        // Alert intervals (ms)
        alertCooldown: 2000, // Minimum time between repeated alerts
        navigationInterval: 3000, // Time between navigation updates
        
        // Recognition settings
        recognition: {
            continuous: false,
            interimResults: true,
            maxAlternatives: 1
        }
    },
    
    // Mode-specific settings
    modes: {
        navigation: {
            updateInterval: 1000, // How often to process frames
            alertInterval: 2000, // How often to speak alerts
            priorityClasses: ['person', 'car', 'bicycle', 'motorcycle', 'dog']
        },
        
        objectDetection: {
            scanTimeout: 30000, // Max time to search for object
            rotationPromptInterval: 5000 // Time between "turn" prompts
        },
        
        busDetection: {
            ocrConfidenceThreshold: 0.6,
            alertCooldown: 5000, // Don't repeat same bus alert within this time
            busDetectionClasses: ['bus', 'truck'] // Classes to check for bus numbers
        },
        
        sceneDescribe: {
            autoDescribeInterval: 10000, // Auto-description interval in auto mode
            maxObjectsToDescribe: 10
        },
        
        emergency: {
            alertRepeatInterval: 5000, // How often to repeat emergency alert
            locationTimeout: 10000 // Max time to wait for GPS
        },
        
        navigation: {
            defaultType: 'smart', // 'outdoor', 'indoor', 'smart'
            guidanceInterval: 2000, // ms between guidance updates
            turnAnnouncementDistance: 20, // meters before turn
            arrivalThreshold: 10, // meters to consider arrived
            clearPathAnnounceInterval: 5000, // ms between "path clear" announcements
            distanceUpdateInterval: 30000 // ms between distance announcements
        },
        
        walking: {
            guidanceInterval: 1500, // Faster updates for walking
            dangerZone: 1.5, // meters for immediate danger
            warningZone: 3.0, // meters for caution
            safeZone: 5.0, // meters for awareness
            environmentCheckInterval: 10000 // ms between environment analysis
        },
        
        reading: {
            autoQualityCheck: true,
            preprocessEnabled: true,
            speakConfidence: true,
            combinedOCRDefault: false,
            continuousReadingInterval: 3000, // ms between auto-reads
            maxTextLength: 1000, // Max characters to read at once
            minConfidenceThreshold: 40 // Min confidence to accept result
        },
        
        indoorNavigation: {
            guidanceInterval: 2000, // ms between guidance updates
            precisionModeInterval: 1000, // ms for handle/precise guidance
            emergencyInterval: 1500, // ms for emergency exit guidance
            stairStepDelay: 500, // ms delay between step announcements
            distanceCloseThreshold: 1.0, // meters for "very close"
            distanceMidThreshold: 3.0 // meters for "close"
        }
    },
    
    // Navigation API settings
    navigationAPIs: {
        osrm: {
            url: 'https://router.project-osrm.org/route/v1',
            profile: 'walking'
        },
        nominatim: {
            url: 'https://nominatim.openstreetmap.org',
            userAgent: 'BlindNav+ Navigation App'
        },
        overpass: {
            url: 'https://overpass-api.de/api/interpreter',
            timeout: 10
        }
    },
    
    // Depth estimation settings
    depthEstimation: {
        enabled: true,
        focalLengthFactor: 0.8, // Multiplied by frame dimension
        objectSizes: {
            'person': { height: 1.7, width: 0.5 },
            'car': { height: 1.5, width: 1.8 },
            'bicycle': { height: 1.0, width: 0.6 },
            'motorcycle': { height: 1.1, width: 0.8 },
            'dog': { height: 0.5, width: 0.6 },
            'cat': { height: 0.3, width: 0.4 },
            'chair': { height: 0.8, width: 0.5 },
            'bus': { height: 3.0, width: 2.5 },
            'truck': { height: 2.5, width: 2.0 },
            'traffic light': { height: 0.8, width: 0.3 },
            'stop sign': { height: 0.75, width: 0.75 },
            'fire hydrant': { height: 0.6, width: 0.3 },
            'bench': { height: 0.8, width: 1.5 },
            'parking meter': { height: 1.2, width: 0.3 },
            'bird': { height: 0.2, width: 0.15 },
            'horse': { height: 1.6, width: 2.0 },
            'sheep': { height: 0.8, width: 0.7 },
            'cow': { height: 1.4, width: 2.0 },
            'elephant': { height: 3.0, width: 4.0 },
            'bear': { height: 1.5, width: 1.0 },
            'umbrella': { height: 0.8, width: 0.9 },
            'handbag': { height: 0.3, width: 0.25 },
            'backpack': { height: 0.5, width: 0.4 },
            'suitcase': { height: 0.6, width: 0.4 },
            'frisbee': { height: 0.02, width: 0.25 },
            'skis': { height: 0.05, width: 1.7 },
            'snowboard': { height: 0.03, width: 1.5 },
            'sports ball': { height: 0.22, width: 0.22 },
            'kite': { height: 1.0, width: 1.5 },
            'baseball bat': { height: 1.0, width: 0.07 },
            'skateboard': { height: 0.1, width: 0.8 },
            'tennis racket': { height: 0.7, width: 0.25 },
            'bottle': { height: 0.25, width: 0.08 },
            'wine glass': { height: 0.2, width: 0.08 },
            'cup': { height: 0.1, width: 0.08 },
            'fork': { height: 0.18, width: 0.03 },
            'knife': { height: 0.2, width: 0.02 },
            'spoon': { height: 0.15, width: 0.04 },
            'bowl': { height: 0.08, width: 0.15 },
            'banana': { height: 0.18, width: 0.04 },
            'apple': { height: 0.08, width: 0.08 },
            'sandwich': { height: 0.06, width: 0.12 },
            'orange': { height: 0.08, width: 0.08 },
            'broccoli': { height: 0.15, width: 0.1 },
            'carrot': { height: 0.18, width: 0.03 },
            'hot dog': { height: 0.04, width: 0.15 },
            'pizza': { height: 0.03, width: 0.35 },
            'donut': { height: 0.03, width: 0.1 },
            'cake': { height: 0.15, width: 0.2 },
            'couch': { height: 0.9, width: 2.0 },
            'potted plant': { height: 0.5, width: 0.4 },
            'bed': { height: 0.6, width: 2.0 },
            'dining table': { height: 0.75, width: 1.5 },
            'toilet': { height: 0.7, width: 0.4 },
            'tv': { height: 0.5, width: 0.9 },
            'laptop': { height: 0.25, width: 0.35 },
            'mouse': { height: 0.03, width: 0.06 },
            'remote': { height: 0.15, width: 0.05 },
            'keyboard': { height: 0.03, width: 0.45 },
            'cell phone': { height: 0.15, width: 0.07 },
            'microwave': { height: 0.3, width: 0.5 },
            'oven': { height: 0.9, width: 0.6 },
            'sink': { height: 0.2, width: 0.6 },
            'refrigerator': { height: 1.8, width: 0.8 },
            'book': { height: 0.25, width: 0.17 },
            'clock': { height: 0.3, width: 0.3 },
            'vase': { height: 0.35, width: 0.15 },
            'scissors': { height: 0.2, width: 0.08 },
            'teddy bear': { height: 0.4, width: 0.25 },
            'hair drier': { height: 0.25, width: 0.2 },
            'toothbrush': { height: 0.18, width: 0.02 },
            'door': { height: 2.1, width: 0.9 },
            'stairs': { height: 2.5, width: 1.0 },
            'wall': { height: 2.5, width: 3.0 }
        }
    },
    
    // Vision Detection settings
    visionDetection: {
        enabled: true,
        processInterval: 100, // ms between frame processing
        
        // Multi-model support
        models: {
            primary: 'coco-ssd', // Primary model
            fallback: 'mobilenet-v2' // Fallback model
        },
        
        // Object categories for specialized detection
        categories: {
            vehicles: ['car', 'bus', 'truck', 'motorcycle', 'bicycle', 'airplane', 'boat', 'train'],
            animals: ['dog', 'cat', 'bird', 'horse', 'sheep', 'cow', 'elephant', 'bear'],
            furniture: ['chair', 'couch', 'bed', 'dining table', 'toilet', 'bench'],
            electronics: ['tv', 'laptop', 'cell phone', 'keyboard', 'mouse', 'remote'],
            kitchen: ['bottle', 'cup', 'bowl', 'knife', 'spoon', 'fork', 'microwave', 'oven', 'refrigerator', 'sink'],
            outdoor: ['traffic light', 'stop sign', 'parking meter', 'fire hydrant', 'bench'],
            people: ['person'],
            sports: ['sports ball', 'baseball bat', 'tennis racket', 'skateboard', 'surfboard', 'skis', 'snowboard']
        },
        
        // Structure detection thresholds
        structureDetection: {
            doorConfidence: 0.3,
            wallConfidence: 0.3,
            doorAspectRatioMin: 1.5,
            doorAspectRatioMax: 3.0,
            minDoorWidth: 50,
            minDoorHeight: 100
        },
        
        // Movement tracking
        movementTracking: {
            enabled: true,
            historyLength: 10,
            approachThreshold: 0.1, // Size increase percentage
            recedeThreshold: -0.08 // Size decrease percentage
        }
    },
    
    // Traffic Analysis settings
    trafficAnalysis: {
        enabled: true,
        signalDetection: {
            enabled: true,
            redThreshold: { r: 150, g: 100, b: 100 },
            yellowThreshold: { r: 150, g: 150, b: 100 },
            greenThreshold: { r: 100, g: 150, b: 100 },
            minBrightnessDiff: 30
        },
        
        // Crossing safety thresholds
        crossingSafety: {
            safeThreshold: 0.7,
            cautionThreshold: 0.4,
            maxVehiclesForSafe: 2,
            minDistanceForSafe: 5.0 // meters
        },
        
        // Road condition detection
        roadConditions: {
            enabled: true,
            analysisInterval: 2000 // ms
        },
        
        // Vehicle tracking
        vehicleTracking: {
            enabled: true,
            alertDistance: 3.0, // meters
            warningDistance: 6.0 // meters
        }
    },
    
    // Environment Analysis settings
    environmentAnalysis: {
        enabled: true,
        analysisInterval: 5000, // ms between analyses
        
        // Sky region for cloud analysis
        skyRegion: {
            yStart: 0,
            yEnd: 0.4, // Top 40% of frame
            xStart: 0,
            xEnd: 1.0
        },
        
        // Cloud detection thresholds
        cloudDetection: {
            whiteThreshold: 200,
            grayThreshold: 150,
            minCloudPixelRatio: 0.1
        },
        
        // Rain prediction thresholds
        rainPrediction: {
            highCloudThreshold: 0.7,
            darkCloudThreshold: 0.5,
            lowLightThreshold: 0.4
        },
        
        // Lighting analysis
        lightingAnalysis: {
            brightThreshold: 180,
            dimThreshold: 80,
            darkThreshold: 40
        },
        
        // Weather history for trend analysis
        historyLength: 20
    },
    
    // OCR Service settings
    ocrService: {
        // Tesseract settings
        tesseract: {
            language: 'eng',
            pageSegMode: '3', // Fully automatic page segmentation
            preserveInterwordSpaces: true
        },
        
        // Image preprocessing
        preprocessing: {
            enabled: true,
            contrast: 1.5,
            brightness: 10,
            sharpen: true,
            denoise: true,
            binarize: true,
            binarizeThreshold: 128
        },
        
        // Quality assessment thresholds
        quality: {
            minContrast: 30,
            minBrightness: 40,
            maxBrightness: 220,
            blurThreshold: 100,
            minTextRegionArea: 50
        },
        
        // Document analysis
        documentAnalysis: {
            headingThresholdMultiplier: 1.3,
            paragraphGapMultiplier: 1.5
        }
    },
    
    // Indoor Navigation settings
    indoorNavigation: {
        // Object sizes for distance estimation (in meters)
        objectSizes: {
            door: { width: 0.9, height: 2.1 },
            doorHandle: { width: 0.15, height: 0.1 },
            exitSign: { width: 0.4, height: 0.2 },
            chair: { width: 0.5, height: 0.9 },
            bench: { width: 1.5, height: 0.5 },
            couch: { width: 2.0, height: 0.9 },
            stairStep: { width: 1.0, height: 0.18 },
            elevator: { width: 1.2, height: 2.2 }
        },
        
        // Stair detection
        stairDetection: {
            minSteps: 3,
            spacingTolerance: 0.2, // 20% variance allowed
            edgeThreshold: 30
        },
        
        // Exit detection
        exitDetection: {
            colorThreshold: 0.3, // Min ratio for exit sign color
            edgePositionThreshold: 0.2 // Distance from edge to consider exit
        },
        
        // Door detection
        doorDetection: {
            aspectRatioMin: 1.5,
            aspectRatioMax: 3.0,
            minWidthRatio: 0.1, // Min door width as ratio of frame
            minHeightRatio: 0.3 // Min door height as ratio of frame
        }
    },
    
    // UI settings
    ui: {
        loadingTimeout: 30000, // Max time for loading screen
        feedbackDisplayTime: 3000, // How long to show audio feedback
        hapticEnabled: true,
        
        // Colors
        colors: {
            danger: '#d63031',
            warning: '#fdcb6e',
            safe: '#00b894',
            primary: '#667eea',
            secondary: '#764ba2'
        }
    },
    
    // Storage keys
    storage: {
        settings: 'blindnav_settings',
        emergencyContacts: 'blindnav_emergency_contacts',
        lastIP: 'blindnav_last_ip',
        busRoutes: 'blindnav_bus_routes'
    },
    
    // OCR settings (Tesseract.js)
    ocr: {
        language: 'eng',
        workerPath: 'https://cdn.jsdelivr.net/npm/tesseract.js@4/dist/worker.min.js',
        langPath: 'https://tessdata.projectnaptha.com/4.0.0',
        corePath: 'https://cdn.jsdelivr.net/npm/tesseract.js-core@4/tesseract-core.wasm.js'
    },
    
    // Debug settings
    debug: {
        enabled: false,
        logLevel: 'info', // 'error', 'warn', 'info', 'debug'
        showDetectionBoxes: true,
        showPerformanceStats: false
    }
};

// Environment-specific overrides
if (typeof window !== 'undefined') {
    // Browser environment
    const urlParams = new URLSearchParams(window.location.search);
    
    if (urlParams.get('debug') === 'true') {
        CONFIG.debug.enabled = true;
        CONFIG.debug.showPerformanceStats = true;
        console.log('[Config] Debug mode enabled');
    }
}

// Helper to get nested config values
CONFIG.get = function(path, defaultValue = null) {
    const keys = path.split('.');
    let value = this;
    
    for (const key of keys) {
        if (value && typeof value === 'object' && key in value) {
            value = value[key];
        } else {
            return defaultValue;
        }
    }
    
    return value;
};

// Helper to update config values
CONFIG.set = function(path, value) {
    const keys = path.split('.');
    let obj = this;
    
    for (let i = 0; i < keys.length - 1; i++) {
        const key = keys[i];
        if (!(key in obj)) {
            obj[key] = {};
        }
        obj = obj[key];
    }
    
    obj[keys[keys.length - 1]] = value;
};

// Freeze config to prevent accidental modifications
// Object.freeze(CONFIG);

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CONFIG;
}
