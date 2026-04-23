/**
 * BlindNav+ Camera Module
 * Handles ESP32-CAM stream connection and local webcam fallback
 */

class CameraManager {
    constructor() {
        this.streamUrl = null;
        this.isConnected = false;
        this.imgElement = null;
        this.videoElement = null; // For local webcam
        this.canvas = null;
        this.ctx = null;
        this.frameCallback = null;
        this.frameInterval = null;
        this.frameRate = 10; // Target FPS for processing
        this.lastFrameTime = 0;
        
        // Camera source type
        this.sourceType = null; // 'esp32' or 'local'
        this.localStream = null;
        
        // Connection settings
        this.connectionTimeout = 5000;
        this.reconnectAttempts = 3;
        this.currentAttempt = 0;
        
        // Callbacks
        this.onConnect = null;
        this.onDisconnect = null;
        this.onError = null;
        this.onFrame = null;
    }
    
    /**
     * Initialize camera elements
     */
    init() {
        this.imgElement = document.getElementById('esp32-stream');
        this.videoElement = document.getElementById('local-camera');
        this.canvas = document.getElementById('detection-canvas');
        
        if (this.canvas) {
            this.ctx = this.canvas.getContext('2d');
        }
        
        if (this.imgElement) {
            this.imgElement.onload = () => this.handleImageLoad();
            this.imgElement.onerror = () => this.handleImageError();
        }
        
        // Create video element if it doesn't exist
        if (!this.videoElement) {
            this.videoElement = document.createElement('video');
            this.videoElement.id = 'local-camera';
            this.videoElement.autoplay = true;
            this.videoElement.playsInline = true;
            this.videoElement.muted = true;
            this.videoElement.style.display = 'none';
            
            const container = document.querySelector('.video-container');
            if (container) {
                container.appendChild(this.videoElement);
            }
        }
        
        console.log('[Camera] Initialized with local fallback support');
    }
    
    /**
     * Connect to ESP32-CAM stream with local fallback
     * @param {string} ip - IP address of ESP32-CAM (optional)
     * @returns {Promise<boolean>} - Connection success
     */
    async connect(ip) {
        // If no IP provided or empty, go directly to local camera
        if (!ip || ip.trim() === '') {
            console.log('[Camera] No IP provided, trying local camera');
            return await this.connectLocalCamera();
        }
        
        // Clean IP address
        ip = ip.trim().replace(/^https?:\/\//, '');
        
        // Build stream URL
        this.streamUrl = `http://${ip}:81/stream`;
        
        console.log('[Camera] Attempting ESP32 connection:', this.streamUrl);
        
        // Try ESP32 connection up to 3 times before falling back
        const maxAttempts = 3;
        
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                console.log(`[Camera] ESP32 connection attempt ${attempt} of ${maxAttempts}`);
                
                if (attempt > 1) {
                    speechManager.speak(`Connection attempt ${attempt} of ${maxAttempts}...`, true);
                }
                
                const connected = await this.tryESP32Connection(ip);
                
                if (connected) {
                    console.log(`[Camera] ESP32 connected on attempt ${attempt}`);
                    return true;
                }
                
                // Wait a bit before next attempt
                if (attempt < maxAttempts) {
                    await new Promise(resolve => setTimeout(resolve, 1500));
                }
                
            } catch (error) {
                console.error(`[Camera] ESP32 attempt ${attempt} error:`, error);
            }
        }
        
        // All 3 attempts failed, automatically switch to local camera
        console.log('[Camera] All ESP32 attempts failed, switching to local camera');
        speechManager.speak('ESP32 camera not found after 3 attempts. Automatically switching to device camera.', true);
        return await this.connectLocalCamera();
    }
    
    /**
     * Try to connect to ESP32-CAM
     * @param {string} ip - IP address
     * @returns {Promise<boolean>}
     */
    async tryESP32Connection(ip) {
        return new Promise((resolve) => {
            const timeout = setTimeout(() => {
                console.log('[Camera] ESP32 connection timed out');
                resolve(false);
            }, this.connectionTimeout);
            
            // Set up one-time handlers for this connection attempt
            const onLoadHandler = () => {
                clearTimeout(timeout);
                this.imgElement.removeEventListener('error', onErrorHandler);
                this.sourceType = 'esp32';
                resolve(true);
            };
            
            const onErrorHandler = () => {
                clearTimeout(timeout);
                this.imgElement.removeEventListener('load', onLoadHandler);
                resolve(false);
            };
            
            this.imgElement.addEventListener('load', onLoadHandler, { once: true });
            this.imgElement.addEventListener('error', onErrorHandler, { once: true });
            
            // Set the stream source
            this.imgElement.src = this.streamUrl;
        });
    }
    
    /**
     * Connect to local device camera (webcam)
     * @returns {Promise<boolean>}
     */
    async connectLocalCamera() {
        try {
            // Check if getUserMedia is supported
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                this.handleError('Camera access not supported on this device');
                return false;
            }
            
            console.log('[Camera] Requesting local camera access...');
            
            // Request camera access
            const constraints = {
                video: {
                    facingMode: 'environment', // Prefer back camera on mobile
                    width: { ideal: 640 },
                    height: { ideal: 480 }
                },
                audio: false
            };
            
            this.localStream = await navigator.mediaDevices.getUserMedia(constraints);
            
            // Set up video element
            this.videoElement.srcObject = this.localStream;
            this.videoElement.style.display = 'block';
            
            // Hide ESP32 image element
            if (this.imgElement) {
                this.imgElement.style.display = 'none';
            }
            
            // Wait for video to be ready
            await new Promise((resolve) => {
                this.videoElement.onloadedmetadata = () => {
                    this.videoElement.play();
                    resolve();
                };
            });
            
            // Update canvas size
            if (this.canvas) {
                this.canvas.width = this.videoElement.videoWidth || 640;
                this.canvas.height = this.videoElement.videoHeight || 480;
            }
            
            this.isConnected = true;
            this.sourceType = 'local';
            
            // Show video container
            const container = document.querySelector('.video-container');
            if (container) container.classList.add('active');
            
            // Update status
            this.updateStatus(true);
            
            console.log('[Camera] Local camera connected successfully');
            
            if (this.onConnect) this.onConnect();
            
            return true;
            
        } catch (error) {
            console.error('[Camera] Local camera error:', error);
            
            let errorMessage = 'Could not access camera.';
            if (error.name === 'NotAllowedError') {
                errorMessage = 'Camera permission denied. Please allow camera access in your browser settings.';
            } else if (error.name === 'NotFoundError') {
                errorMessage = 'No camera found on this device.';
            } else if (error.name === 'NotReadableError') {
                errorMessage = 'Camera is in use by another application.';
            }
            
            this.handleError(errorMessage);
            return false;
        }
    }
    
    /**
     * Connect directly to local camera without trying ESP32
     * @returns {Promise<boolean>}
     */
    async connectLocal() {
        return await this.connectLocalCamera();
    }
    
    /**
     * Handle image load success
     */
    handleImageLoad() {
        if (!this.isConnected) {
            this.isConnected = true;
            this.currentAttempt = 0;
            
            console.log('[Camera] Connected successfully');
            
            // Update canvas size to match stream
            if (this.canvas && this.imgElement) {
                this.canvas.width = this.imgElement.naturalWidth || 640;
                this.canvas.height = this.imgElement.naturalHeight || 480;
            }
            
            // Show video container
            const container = document.querySelector('.video-container');
            if (container) container.classList.add('active');
            
            // Update status indicator
            this.updateStatus(true);
            
            if (this.onConnect) this.onConnect();
        }
    }
    
    /**
     * Handle image load error
     */
    handleImageError() {
        console.error('[Camera] Stream error');
        
        if (this.isConnected) {
            this.isConnected = false;
            this.updateStatus(false);
            if (this.onDisconnect) this.onDisconnect();
        }
        
        // Try to reconnect
        if (this.currentAttempt < this.reconnectAttempts) {
            this.currentAttempt++;
            console.log(`[Camera] Reconnect attempt ${this.currentAttempt}/${this.reconnectAttempts}`);
            
            setTimeout(() => {
                if (this.streamUrl) {
                    this.imgElement.src = '';
                    this.imgElement.src = this.streamUrl;
                }
            }, 2000);
        } else {
            this.handleError('Failed to connect after multiple attempts');
        }
    }
    
    /**
     * Start connection monitoring
     */
    startConnectionMonitor() {
        // Monitor for stream disconnection
        setInterval(() => {
            if (this.isConnected && this.imgElement) {
                // Check if image is still receiving data
                const now = Date.now();
                if (now - this.lastFrameTime > 10000) {
                    console.warn('[Camera] Stream may be stale');
                    // Could trigger reconnection here
                }
            }
        }, 5000);
    }
    
    /**
     * Capture current frame from stream (ESP32 or local)
     * @returns {ImageData|null} - Captured frame data
     */
    captureFrame() {
        if (!this.isConnected || !this.ctx) {
            return null;
        }
        
        try {
            let sourceElement;
            let width, height;
            
            if (this.sourceType === 'local' && this.videoElement) {
                sourceElement = this.videoElement;
                width = this.videoElement.videoWidth || 640;
                height = this.videoElement.videoHeight || 480;
            } else if (this.sourceType === 'esp32' && this.imgElement) {
                sourceElement = this.imgElement;
                width = this.imgElement.naturalWidth || this.imgElement.width || 640;
                height = this.imgElement.naturalHeight || this.imgElement.height || 480;
            } else {
                return null;
            }
            
            // Update canvas size if needed
            if (this.canvas.width !== width || this.canvas.height !== height) {
                this.canvas.width = width;
                this.canvas.height = height;
            }
            
            // Draw frame to canvas
            this.ctx.drawImage(sourceElement, 0, 0, width, height);
            
            // Get image data
            const imageData = this.ctx.getImageData(0, 0, width, height);
            
            this.lastFrameTime = Date.now();
            
            return {
                imageData,
                width,
                height,
                canvas: this.canvas,
                ctx: this.ctx,
                sourceType: this.sourceType
            };
            
        } catch (error) {
            console.error('[Camera] Frame capture error:', error);
            return null;
        }
    }
    
    /**
     * Start continuous frame processing
     * @param {Function} callback - Function to call with each frame
     */
    startFrameProcessing(callback) {
        if (this.frameInterval) {
            this.stopFrameProcessing();
        }
        
        this.frameCallback = callback;
        const interval = 1000 / this.frameRate;
        
        this.frameInterval = setInterval(() => {
            if (this.isConnected && this.frameCallback) {
                const frame = this.captureFrame();
                if (frame) {
                    this.frameCallback(frame);
                }
            }
        }, interval);
        
        console.log(`[Camera] Frame processing started at ${this.frameRate} FPS`);
    }
    
    /**
     * Stop continuous frame processing
     */
    stopFrameProcessing() {
        if (this.frameInterval) {
            clearInterval(this.frameInterval);
            this.frameInterval = null;
            this.frameCallback = null;
            console.log('[Camera] Frame processing stopped');
        }
    }
    
    /**
     * Disconnect from stream (ESP32 or local)
     */
    disconnect() {
        this.stopFrameProcessing();
        
        // Stop local camera stream if active
        if (this.localStream) {
            this.localStream.getTracks().forEach(track => track.stop());
            this.localStream = null;
        }
        
        if (this.videoElement) {
            this.videoElement.srcObject = null;
            this.videoElement.style.display = 'none';
        }
        
        if (this.imgElement) {
            this.imgElement.src = '';
            this.imgElement.style.display = 'block';
        }
        
        this.isConnected = false;
        this.streamUrl = null;
        this.sourceType = null;
        this.currentAttempt = 0;
        
        // Hide video container
        const container = document.querySelector('.video-container');
        if (container) container.classList.remove('active');
        
        this.updateStatus(false);
        
        console.log('[Camera] Disconnected');
        
        if (this.onDisconnect) this.onDisconnect();
    }
    
    /**
     * Update status indicator
     * @param {boolean} connected - Connection status
     */
    updateStatus(connected) {
        const statusEl = document.getElementById('camera-status');
        if (statusEl) {
            statusEl.classList.toggle('active', connected);
        }
    }
    
    /**
     * Handle and report errors
     * @param {string} message - Error message
     */
    handleError(message) {
        console.error('[Camera] Error:', message);
        
        if (this.onError) {
            this.onError(message);
        }
        
        // Update feedback UI
        const feedback = document.getElementById('connection-feedback');
        if (feedback) {
            feedback.textContent = message;
            feedback.className = 'feedback error';
            feedback.classList.remove('hidden');
        }
    }
    
    /**
     * Get current connection status
     * @returns {Object} - Status information
     */
    getStatus() {
        return {
            connected: this.isConnected,
            sourceType: this.sourceType, // 'esp32' or 'local'
            url: this.streamUrl,
            frameRate: this.frameRate,
            lastFrameTime: this.lastFrameTime,
            isLocalCamera: this.sourceType === 'local'
        };
    }
    
    /**
     * Set frame processing rate
     * @param {number} fps - Frames per second
     */
    setFrameRate(fps) {
        this.frameRate = Math.max(1, Math.min(30, fps));
        
        // Restart processing if active
        if (this.frameInterval && this.frameCallback) {
            this.startFrameProcessing(this.frameCallback);
        }
    }
}

// Export singleton instance
const cameraManager = new CameraManager();
