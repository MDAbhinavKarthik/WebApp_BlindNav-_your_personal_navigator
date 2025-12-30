/**
 * BlindNav+ OCR Service
 * Advanced OCR with multiple engines, preprocessing, and document understanding
 * Supports Tesseract.js and browser-based text detection
 */

class OCRService {
    constructor() {
        // OCR Workers
        this.tesseractWorker = null;
        this.isInitialized = false;
        this.initPromise = null;
        
        // Configuration
        this.config = {
            tesseract: {
                language: 'eng',
                pageSegMode: '3', // Fully automatic page segmentation
                preserveInterwordSpaces: '1'
            },
            preprocessing: {
                enabled: true,
                contrast: 1.5,
                brightness: 10,
                sharpen: true,
                denoise: true,
                binarize: true,
                binarizeThreshold: 128
            },
            quality: {
                minContrast: 30,
                minBrightness: 40,
                maxBrightness: 220,
                blurThreshold: 100
            }
        };
        
        // Document analysis state
        this.lastDocument = null;
        this.headings = [];
        this.currentHeadingIndex = -1;
        this.paragraphs = [];
        
        console.log('[OCRService] Initialized');
    }
    
    /**
     * Initialize OCR engines
     */
    async initialize() {
        if (this.isInitialized) return true;
        if (this.initPromise) return this.initPromise;
        
        this.initPromise = this._initializeEngines();
        return this.initPromise;
    }
    
    async _initializeEngines() {
        try {
            console.log('[OCRService] Initializing Tesseract.js v4...');
            
            // Tesseract.js v4 API - create worker first, then load language
            this.tesseractWorker = await Tesseract.createWorker({
                logger: m => {
                    if (m.status === 'recognizing text') {
                        console.log(`[OCRService] Progress: ${Math.round(m.progress * 100)}%`);
                    }
                },
                errorHandler: err => {
                    console.error('[OCRService] Worker error:', err);
                }
            });
            
            // Load language data
            await this.tesseractWorker.loadLanguage('eng');
            await this.tesseractWorker.initialize('eng');
            
            // Set parameters for better recognition
            await this.tesseractWorker.setParameters({
                tessedit_pageseg_mode: '3', // PSM.AUTO - Fully automatic page segmentation
                preserve_interword_spaces: '1',
                tessedit_char_whitelist: ''
            });
            
            this.isInitialized = true;
            console.log('[OCRService] Tesseract initialized successfully');
            return true;
            
        } catch (error) {
            console.error('[OCRService] Initialization error:', error);
            // Fallback: Try alternative initialization for older Tesseract versions
            try {
                console.log('[OCRService] Trying fallback initialization...');
                this.tesseractWorker = await Tesseract.createWorker('eng');
                this.isInitialized = true;
                console.log('[OCRService] Fallback initialization successful');
                return true;
            } catch (fallbackError) {
                console.error('[OCRService] Fallback also failed:', fallbackError);
                throw error;
            }
        }
    }
    
    /**
     * Terminate OCR workers
     */
    async terminate() {
        if (this.tesseractWorker) {
            await this.tesseractWorker.terminate();
            this.tesseractWorker = null;
        }
        this.isInitialized = false;
        this.initPromise = null;
        console.log('[OCRService] Terminated');
    }
    
    // ===== IMAGE PREPROCESSING =====
    
    /**
     * Preprocess image for better OCR results
     * @param {HTMLCanvasElement|ImageData} input - Input image
     * @returns {HTMLCanvasElement} - Preprocessed canvas
     */
    preprocessImage(input) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // Get image data
        let sourceCanvas;
        if (input instanceof HTMLCanvasElement) {
            sourceCanvas = input;
        } else if (input.canvas) {
            sourceCanvas = input.canvas;
        } else {
            throw new Error('Invalid input type');
        }
        
        canvas.width = sourceCanvas.width;
        canvas.height = sourceCanvas.height;
        ctx.drawImage(sourceCanvas, 0, 0);
        
        if (!this.config.preprocessing.enabled) {
            return canvas;
        }
        
        let imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        
        // Apply preprocessing pipeline
        imageData = this.adjustContrastBrightness(imageData);
        
        if (this.config.preprocessing.denoise) {
            imageData = this.denoiseImage(imageData);
        }
        
        if (this.config.preprocessing.sharpen) {
            imageData = this.sharpenImage(imageData);
        }
        
        if (this.config.preprocessing.binarize) {
            imageData = this.binarizeImage(imageData);
        }
        
        ctx.putImageData(imageData, 0, 0);
        return canvas;
    }
    
    /**
     * Adjust contrast and brightness
     */
    adjustContrastBrightness(imageData) {
        const data = imageData.data;
        const contrast = this.config.preprocessing.contrast;
        const brightness = this.config.preprocessing.brightness;
        
        for (let i = 0; i < data.length; i += 4) {
            // Apply contrast and brightness
            data[i] = this.clamp(contrast * (data[i] - 128) + 128 + brightness);     // R
            data[i + 1] = this.clamp(contrast * (data[i + 1] - 128) + 128 + brightness); // G
            data[i + 2] = this.clamp(contrast * (data[i + 2] - 128) + 128 + brightness); // B
        }
        
        return imageData;
    }
    
    /**
     * Simple denoise using box blur
     */
    denoiseImage(imageData) {
        const width = imageData.width;
        const height = imageData.height;
        const data = imageData.data;
        const copy = new Uint8ClampedArray(data);
        
        const kernelSize = 1; // 3x3 box blur
        
        for (let y = kernelSize; y < height - kernelSize; y++) {
            for (let x = kernelSize; x < width - kernelSize; x++) {
                let r = 0, g = 0, b = 0, count = 0;
                
                for (let ky = -kernelSize; ky <= kernelSize; ky++) {
                    for (let kx = -kernelSize; kx <= kernelSize; kx++) {
                        const idx = ((y + ky) * width + (x + kx)) * 4;
                        r += copy[idx];
                        g += copy[idx + 1];
                        b += copy[idx + 2];
                        count++;
                    }
                }
                
                const idx = (y * width + x) * 4;
                data[idx] = r / count;
                data[idx + 1] = g / count;
                data[idx + 2] = b / count;
            }
        }
        
        return imageData;
    }
    
    /**
     * Sharpen image using unsharp mask
     */
    sharpenImage(imageData) {
        const width = imageData.width;
        const height = imageData.height;
        const data = imageData.data;
        const copy = new Uint8ClampedArray(data);
        
        // Sharpening kernel
        const kernel = [
            0, -1, 0,
            -1, 5, -1,
            0, -1, 0
        ];
        
        for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
                for (let c = 0; c < 3; c++) {
                    let sum = 0;
                    let ki = 0;
                    
                    for (let ky = -1; ky <= 1; ky++) {
                        for (let kx = -1; kx <= 1; kx++) {
                            const idx = ((y + ky) * width + (x + kx)) * 4 + c;
                            sum += copy[idx] * kernel[ki++];
                        }
                    }
                    
                    const idx = (y * width + x) * 4 + c;
                    data[idx] = this.clamp(sum);
                }
            }
        }
        
        return imageData;
    }
    
    /**
     * Binarize image (convert to black and white)
     */
    binarizeImage(imageData) {
        const data = imageData.data;
        const threshold = this.config.preprocessing.binarizeThreshold;
        
        // Use adaptive thresholding based on local mean
        for (let i = 0; i < data.length; i += 4) {
            const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
            const value = gray > threshold ? 255 : 0;
            data[i] = value;
            data[i + 1] = value;
            data[i + 2] = value;
        }
        
        return imageData;
    }
    
    /**
     * Apply adaptive thresholding (Otsu's method simplified)
     */
    adaptiveThreshold(imageData) {
        const data = imageData.data;
        const width = imageData.width;
        const height = imageData.height;
        
        // Calculate histogram
        const histogram = new Array(256).fill(0);
        for (let i = 0; i < data.length; i += 4) {
            const gray = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
            histogram[gray]++;
        }
        
        // Find optimal threshold using Otsu's method
        const total = width * height;
        let sum = 0;
        for (let i = 0; i < 256; i++) sum += i * histogram[i];
        
        let sumB = 0, wB = 0, wF = 0;
        let maxVariance = 0, threshold = 0;
        
        for (let t = 0; t < 256; t++) {
            wB += histogram[t];
            if (wB === 0) continue;
            wF = total - wB;
            if (wF === 0) break;
            
            sumB += t * histogram[t];
            const mB = sumB / wB;
            const mF = (sum - sumB) / wF;
            
            const variance = wB * wF * Math.pow(mB - mF, 2);
            if (variance > maxVariance) {
                maxVariance = variance;
                threshold = t;
            }
        }
        
        // Apply threshold
        for (let i = 0; i < data.length; i += 4) {
            const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
            const value = gray > threshold ? 255 : 0;
            data[i] = value;
            data[i + 1] = value;
            data[i + 2] = value;
        }
        
        return imageData;
    }
    
    clamp(value) {
        return Math.max(0, Math.min(255, Math.round(value)));
    }
    
    // ===== IMAGE QUALITY ASSESSMENT =====
    
    /**
     * Assess image quality for OCR
     * @param {HTMLCanvasElement} canvas - Input canvas
     * @returns {Object} - Quality assessment
     */
    assessImageQuality(canvas) {
        const ctx = canvas.getContext('2d');
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        
        // Calculate brightness
        let totalBrightness = 0;
        let minBrightness = 255;
        let maxBrightness = 0;
        
        for (let i = 0; i < data.length; i += 4) {
            const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3;
            totalBrightness += brightness;
            minBrightness = Math.min(minBrightness, brightness);
            maxBrightness = Math.max(maxBrightness, brightness);
        }
        
        const avgBrightness = totalBrightness / (data.length / 4);
        const contrast = maxBrightness - minBrightness;
        
        // Detect blur using Laplacian variance
        const blurScore = this.detectBlur(canvas);
        
        // Check for text regions
        const hasTextRegions = this.detectTextRegions(canvas).length > 0;
        
        // Build assessment
        const issues = [];
        let score = 100;
        
        if (avgBrightness < this.config.quality.minBrightness) {
            issues.push('Image is too dark. Try adding more light.');
            score -= 30;
        } else if (avgBrightness > this.config.quality.maxBrightness) {
            issues.push('Image is too bright. Reduce lighting or glare.');
            score -= 25;
        }
        
        if (contrast < this.config.quality.minContrast) {
            issues.push('Low contrast. Text may be hard to read.');
            score -= 25;
        }
        
        if (blurScore < this.config.quality.blurThreshold) {
            issues.push('Image appears blurry. Hold camera steady.');
            score -= 30;
        }
        
        if (!hasTextRegions) {
            issues.push('No clear text regions detected. Move closer or adjust angle.');
            score -= 20;
        }
        
        return {
            score: Math.max(0, score),
            isGood: score >= 60,
            brightness: avgBrightness,
            contrast: contrast,
            sharpness: blurScore,
            hasText: hasTextRegions,
            issues: issues,
            recommendation: this.getQualityRecommendation(score, issues)
        };
    }
    
    /**
     * Detect blur using Laplacian variance
     */
    detectBlur(canvas) {
        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;
        
        // Downsample for performance
        const scale = Math.min(1, 200 / Math.max(width, height));
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
        
        // Apply Laplacian kernel
        let variance = 0;
        const kernel = [0, 1, 0, 1, -4, 1, 0, 1, 0];
        
        for (let y = 1; y < sh - 1; y++) {
            for (let x = 1; x < sw - 1; x++) {
                let sum = 0;
                let ki = 0;
                
                for (let ky = -1; ky <= 1; ky++) {
                    for (let kx = -1; kx <= 1; kx++) {
                        sum += gray[(y + ky) * sw + (x + kx)] * kernel[ki++];
                    }
                }
                
                variance += sum * sum;
            }
        }
        
        return variance / ((sw - 2) * (sh - 2));
    }
    
    /**
     * Get quality recommendation
     */
    getQualityRecommendation(score, issues) {
        if (score >= 80) {
            return 'Image quality is good. Ready to read.';
        } else if (score >= 60) {
            return 'Image quality is acceptable. ' + (issues[0] || 'Try to improve lighting.');
        } else if (score >= 40) {
            return 'Image quality is poor. ' + issues.join(' ');
        } else {
            return 'Image quality is very poor. Please reposition camera: ' + issues.join(' ');
        }
    }
    
    // ===== TEXT REGION DETECTION =====
    
    /**
     * Detect text regions in image
     * @param {HTMLCanvasElement} canvas - Input canvas
     * @returns {Array} - Array of text region bounding boxes
     */
    detectTextRegions(canvas) {
        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;
        
        // Downsample for performance
        const scale = Math.min(1, 300 / Math.max(width, height));
        const sw = Math.floor(width * scale);
        const sh = Math.floor(height * scale);
        
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = sw;
        tempCanvas.height = sh;
        const tempCtx = tempCanvas.getContext('2d');
        tempCtx.drawImage(canvas, 0, 0, sw, sh);
        
        const imageData = tempCtx.getImageData(0, 0, sw, sh);
        const data = imageData.data;
        
        // Convert to grayscale and detect edges
        const edges = new Uint8Array(sw * sh);
        
        for (let y = 1; y < sh - 1; y++) {
            for (let x = 1; x < sw - 1; x++) {
                const idx = (y * sw + x) * 4;
                const idxL = (y * sw + x - 1) * 4;
                const idxR = (y * sw + x + 1) * 4;
                const idxU = ((y - 1) * sw + x) * 4;
                const idxD = ((y + 1) * sw + x) * 4;
                
                const gx = Math.abs(
                    (0.299 * data[idxR] + 0.587 * data[idxR + 1] + 0.114 * data[idxR + 2]) -
                    (0.299 * data[idxL] + 0.587 * data[idxL + 1] + 0.114 * data[idxL + 2])
                );
                const gy = Math.abs(
                    (0.299 * data[idxD] + 0.587 * data[idxD + 1] + 0.114 * data[idxD + 2]) -
                    (0.299 * data[idxU] + 0.587 * data[idxU + 1] + 0.114 * data[idxU + 2])
                );
                
                edges[y * sw + x] = (gx + gy) > 30 ? 255 : 0;
            }
        }
        
        // Find connected components (text regions)
        const regions = [];
        const visited = new Uint8Array(sw * sh);
        
        for (let y = 0; y < sh; y++) {
            for (let x = 0; x < sw; x++) {
                if (edges[y * sw + x] === 255 && !visited[y * sw + x]) {
                    const region = this.floodFill(edges, visited, x, y, sw, sh);
                    if (region.area > 50) { // Minimum area threshold
                        // Scale back to original size
                        regions.push({
                            x: Math.floor(region.minX / scale),
                            y: Math.floor(region.minY / scale),
                            width: Math.ceil((region.maxX - region.minX) / scale),
                            height: Math.ceil((region.maxY - region.minY) / scale),
                            area: region.area
                        });
                    }
                }
            }
        }
        
        // Merge overlapping regions
        return this.mergeRegions(regions);
    }
    
    /**
     * Flood fill to find connected component
     */
    floodFill(edges, visited, startX, startY, width, height) {
        const stack = [[startX, startY]];
        let minX = startX, maxX = startX;
        let minY = startY, maxY = startY;
        let area = 0;
        
        while (stack.length > 0) {
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
        
        return { minX, maxX, minY, maxY, area };
    }
    
    /**
     * Merge overlapping regions
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
                
                if (this.regionsOverlap(current, regions[j])) {
                    current = this.combineRegions(current, regions[j]);
                    used[j] = true;
                }
            }
            
            merged.push(current);
        }
        
        return merged;
    }
    
    regionsOverlap(r1, r2) {
        const margin = 20;
        return !(r1.x + r1.width + margin < r2.x ||
                 r2.x + r2.width + margin < r1.x ||
                 r1.y + r1.height + margin < r2.y ||
                 r2.y + r2.height + margin < r1.y);
    }
    
    combineRegions(r1, r2) {
        const x = Math.min(r1.x, r2.x);
        const y = Math.min(r1.y, r2.y);
        return {
            x,
            y,
            width: Math.max(r1.x + r1.width, r2.x + r2.width) - x,
            height: Math.max(r1.y + r1.height, r2.y + r2.height) - y,
            area: r1.area + r2.area
        };
    }
    
    // ===== MAIN OCR FUNCTIONS =====
    
    /**
     * Capture and read text from image
     * @param {HTMLCanvasElement} canvas - Input canvas
     * @param {Object} options - OCR options
     * @returns {Promise<Object>} - OCR result
     */
    async captureAndReadText(canvas, options = {}) {
        if (!this.isInitialized) {
            await this.initialize();
        }
        
        const startTime = Date.now();
        
        // Assess quality first
        const quality = this.assessImageQuality(canvas);
        
        // Preprocess image
        const processedCanvas = options.skipPreprocess ? canvas : this.preprocessImage(canvas);
        
        // Detect text regions
        const textRegions = this.detectTextRegions(canvas);
        
        // Perform OCR
        const result = await this.performOCR(processedCanvas, options);
        
        // Analyze document structure
        const structure = this.analyzeDocumentStructure(result);
        
        const processingTime = Date.now() - startTime;
        
        return {
            success: result.text.length > 0,
            text: result.text,
            confidence: result.confidence,
            words: result.words,
            lines: result.lines,
            paragraphs: result.paragraphs,
            structure: structure,
            quality: quality,
            textRegions: textRegions,
            processingTime: processingTime
        };
    }
    
    /**
     * Perform OCR using Tesseract
     */
    async performOCR(canvas, options = {}) {
        const imageData = canvas.toDataURL('image/png');
        
        try {
            const result = await this.tesseractWorker.recognize(imageData);
            
            // Extract detailed results
            const words = result.data.words || [];
            const lines = result.data.lines || [];
            const paragraphs = result.data.paragraphs || [];
            
            return {
                text: result.data.text.trim(),
                confidence: result.data.confidence,
                words: words.map(w => ({
                    text: w.text,
                    confidence: w.confidence,
                    bbox: w.bbox
                })),
                lines: lines.map(l => ({
                    text: l.text,
                    confidence: l.confidence,
                    bbox: l.bbox
                })),
                paragraphs: paragraphs.map(p => ({
                    text: p.text,
                    confidence: p.confidence,
                    bbox: p.bbox
                }))
            };
            
        } catch (error) {
            console.error('[OCRService] OCR error:', error);
            throw error;
        }
    }
    
    /**
     * Perform OCR with combined pipeline (multiple passes)
     */
    async performCombinedOCR(canvas) {
        const results = [];
        
        // Pass 1: Original image
        const result1 = await this.captureAndReadText(canvas, { skipPreprocess: true });
        results.push(result1);
        
        // Pass 2: Preprocessed image
        const result2 = await this.captureAndReadText(canvas, { skipPreprocess: false });
        results.push(result2);
        
        // Pass 3: High contrast preprocessing
        const originalConfig = { ...this.config.preprocessing };
        this.config.preprocessing.contrast = 2.0;
        this.config.preprocessing.binarizeThreshold = 100;
        const result3 = await this.captureAndReadText(canvas);
        results.push(result3);
        
        // Restore config
        this.config.preprocessing = originalConfig;
        
        // Select best result based on confidence
        results.sort((a, b) => b.confidence - a.confidence);
        
        return {
            best: results[0],
            allResults: results,
            combinedConfidence: results.reduce((sum, r) => sum + r.confidence, 0) / results.length
        };
    }
    
    // ===== DOCUMENT UNDERSTANDING =====
    
    /**
     * Analyze document structure
     * @param {Object} ocrResult - OCR result with words and lines
     * @returns {Object} - Document structure analysis
     */
    analyzeDocumentStructure(ocrResult) {
        const lines = ocrResult.lines || [];
        const structure = {
            type: 'unknown',
            headings: [],
            paragraphs: [],
            lists: [],
            tables: [],
            layout: 'unknown'
        };
        
        if (lines.length === 0) return structure;
        
        // Analyze line heights and positions
        const lineHeights = lines.map(l => l.bbox ? l.bbox.y1 - l.bbox.y0 : 0);
        const avgLineHeight = lineHeights.reduce((a, b) => a + b, 0) / lineHeights.length;
        
        // Detect headings (larger text)
        const headingThreshold = avgLineHeight * 1.3;
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const lineHeight = line.bbox ? line.bbox.y1 - line.bbox.y0 : 0;
            
            if (lineHeight > headingThreshold && line.text.trim().length > 0) {
                structure.headings.push({
                    text: line.text.trim(),
                    level: lineHeight > headingThreshold * 1.3 ? 1 : 2,
                    index: i,
                    bbox: line.bbox
                });
            }
        }
        
        // Store for navigation
        this.headings = structure.headings;
        this.currentHeadingIndex = -1;
        
        // Group lines into paragraphs
        let currentParagraph = [];
        let lastY = 0;
        
        for (const line of lines) {
            const y = line.bbox ? line.bbox.y0 : 0;
            const gap = y - lastY;
            
            if (gap > avgLineHeight * 1.5 && currentParagraph.length > 0) {
                structure.paragraphs.push({
                    text: currentParagraph.map(l => l.text).join(' '),
                    lines: currentParagraph
                });
                currentParagraph = [];
            }
            
            currentParagraph.push(line);
            lastY = line.bbox ? line.bbox.y1 : 0;
        }
        
        if (currentParagraph.length > 0) {
            structure.paragraphs.push({
                text: currentParagraph.map(l => l.text).join(' '),
                lines: currentParagraph
            });
        }
        
        this.paragraphs = structure.paragraphs;
        
        // Detect document type
        structure.type = this.detectDocumentType(ocrResult.text, structure);
        
        // Detect layout
        structure.layout = this.detectLayout(lines);
        
        return structure;
    }
    
    /**
     * Detect document type
     */
    detectDocumentType(text, structure) {
        const lowerText = text.toLowerCase();
        
        // Check for common document patterns
        if (lowerText.includes('menu') || lowerText.includes('price') || /\$\d+/.test(text)) {
            return 'menu';
        }
        if (lowerText.includes('invoice') || lowerText.includes('receipt') || lowerText.includes('total')) {
            return 'receipt';
        }
        if (lowerText.includes('warning') || lowerText.includes('caution') || lowerText.includes('danger')) {
            return 'warning_sign';
        }
        if (/exit|entrance|restroom|elevator|stairs/i.test(lowerText)) {
            return 'directional_sign';
        }
        if (structure.headings.length > 2 && structure.paragraphs.length > 3) {
            return 'document';
        }
        if (text.split('\n').length <= 3 && text.length < 100) {
            return 'label';
        }
        
        return 'general';
    }
    
    /**
     * Detect layout (single column, multi-column, etc.)
     */
    detectLayout(lines) {
        if (lines.length < 5) return 'simple';
        
        // Check x positions of lines
        const xPositions = lines.map(l => l.bbox ? l.bbox.x0 : 0);
        const uniqueX = [...new Set(xPositions.map(x => Math.floor(x / 50)))];
        
        if (uniqueX.length >= 3) {
            return 'multi-column';
        } else if (uniqueX.length === 2) {
            return 'two-column';
        }
        
        return 'single-column';
    }
    
    /**
     * Navigate to next heading
     * @returns {Object|null} - Next heading or null
     */
    navigateNextHeading() {
        if (this.headings.length === 0) {
            return null;
        }
        
        this.currentHeadingIndex = (this.currentHeadingIndex + 1) % this.headings.length;
        return this.headings[this.currentHeadingIndex];
    }
    
    /**
     * Navigate to previous heading
     * @returns {Object|null} - Previous heading or null
     */
    navigatePreviousHeading() {
        if (this.headings.length === 0) {
            return null;
        }
        
        this.currentHeadingIndex = this.currentHeadingIndex <= 0 
            ? this.headings.length - 1 
            : this.currentHeadingIndex - 1;
        return this.headings[this.currentHeadingIndex];
    }
    
    /**
     * Get all headings
     * @returns {Array} - Array of headings
     */
    getHeadings() {
        return this.headings;
    }
    
    /**
     * Describe document scene
     * @param {Object} ocrResult - Full OCR result
     * @returns {string} - Human-readable description
     */
    describeDocumentScene(ocrResult) {
        const parts = [];
        
        // Quality assessment
        if (ocrResult.quality) {
            if (ocrResult.quality.isGood) {
                parts.push('The image is clear and readable.');
            } else {
                parts.push(ocrResult.quality.recommendation);
            }
        }
        
        // Document type
        if (ocrResult.structure) {
            const typeDescriptions = {
                'menu': 'This appears to be a menu.',
                'receipt': 'This looks like a receipt or invoice.',
                'warning_sign': 'This is a warning or caution sign.',
                'directional_sign': 'This is a directional sign.',
                'document': 'This is a document with multiple sections.',
                'label': 'This is a label or short text.',
                'general': 'This contains general text.'
            };
            parts.push(typeDescriptions[ocrResult.structure.type] || 'Text detected.');
        }
        
        // Layout
        if (ocrResult.structure && ocrResult.structure.layout !== 'simple') {
            const layoutDesc = {
                'single-column': 'The text is in a single column.',
                'two-column': 'The text is arranged in two columns.',
                'multi-column': 'The text has multiple columns.'
            };
            parts.push(layoutDesc[ocrResult.structure.layout] || '');
        }
        
        // Headings
        if (ocrResult.structure && ocrResult.structure.headings.length > 0) {
            parts.push(`I found ${ocrResult.structure.headings.length} headings.`);
            parts.push(`The first heading says: "${ocrResult.structure.headings[0].text}".`);
        }
        
        // Text preview
        if (ocrResult.text && ocrResult.text.length > 0) {
            const preview = ocrResult.text.substring(0, 150);
            parts.push(`The text begins: "${preview}${ocrResult.text.length > 150 ? '...' : ''}"`);
        }
        
        // Confidence
        if (ocrResult.confidence) {
            const confLevel = ocrResult.confidence > 80 ? 'high' : 
                              ocrResult.confidence > 60 ? 'moderate' : 'low';
            parts.push(`Recognition confidence is ${confLevel}.`);
        }
        
        return parts.join(' ');
    }
    
    /**
     * Clean text for speech
     * @param {string} text - Raw text
     * @returns {string} - Cleaned text
     */
    cleanTextForSpeech(text) {
        let cleaned = text
            .replace(/\s+/g, ' ')
            .replace(/[^\w\s.,!?;:'"()\-$%@#&]/g, '')
            .trim();
        
        // Limit length
        if (cleaned.length > 1000) {
            cleaned = cleaned.substring(0, 1000) + '... Text continues.';
        }
        
        return cleaned;
    }
}

// Create global instance
const ocrService = new OCRService();
