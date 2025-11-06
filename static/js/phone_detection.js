// Mobile Phone Detection Module
// Detects various patterns of mobile phone usage during tests

class PhoneDetector {
    constructor() {
        // Detection counters
        this.downwardGlanceCount = 0;
        this.handsOutOfFrameCount = 0;
        this.suspiciousHeadPoseCount = 0;
        this.lightingChangeCount = 0;
        this.phoneReflectionCount = 0;
        
        // Thresholds for violations
        this.MAX_DOWNWARD_GLANCES = 5; // 15 seconds of looking down
        this.MAX_HANDS_OUT_OF_FRAME = 4; // 12 seconds with hands not visible
        this.MAX_SUSPICIOUS_HEAD_POSE = 4; // 12 seconds with head tilted down
        this.MAX_LIGHTING_CHANGES = 6; // Suspicious lighting pattern changes
        this.MAX_PHONE_REFLECTION = 3; // Phone screen reflection detected
        
        // Previous frame data for comparison
        this.previousFrameData = null;
        this.previousBrightness = 0;
        this.previousFacePosition = { x: 0, y: 0 };
        
        // Pattern tracking
        this.glancePattern = []; // Track timing of downward glances
        this.lightingPattern = []; // Track lighting changes over time
        
        // Detection state
        this.isActive = false;
    }
    
    start() {
        this.isActive = true;
        console.log('📱 Mobile phone detection started');
    }
    
    stop() {
        this.isActive = false;
        console.log('📱 Mobile phone detection stopped');
    }
    
    reset() {
        this.downwardGlanceCount = 0;
        this.handsOutOfFrameCount = 0;
        this.suspiciousHeadPoseCount = 0;
        this.lightingChangeCount = 0;
        this.phoneReflectionCount = 0;
        this.glancePattern = [];
        this.lightingPattern = [];
    }
    
    /**
     * Main analysis function - called for each video frame
     * @param {ImageData} imageData - Current frame from camera
     * @param {HTMLCanvasElement} canvas - Canvas element for drawing
     * @returns {Object} Detection results
     */
    analyzeFrame(imageData, canvas) {
        if (!this.isActive) return null;
        
        const results = {
            phoneDetected: false,
            violations: [],
            warnings: []
        };
        
        // Run all detection algorithms
        const headPose = this.detectHeadPose(imageData, canvas);
        const hands = this.detectHandsInFrame(imageData, canvas);
        const lighting = this.analyzeLightingPattern(imageData);
        const reflection = this.detectPhoneReflection(imageData, canvas);
        
        // Analyze head pose for downward looking (phone in lap)
        if (headPose.lookingDown) {
            this.downwardGlanceCount++;
            this.glancePattern.push(Date.now());
            
            // Check for repeated pattern
            if (this.isRepeatedGlancePattern()) {
                results.violations.push({
                    type: 'repeated_downward_glances',
                    description: 'Repeated downward glances detected - possible phone usage',
                    severity: 'high',
                    metadata: {
                        count: this.downwardGlanceCount,
                        pattern: 'repeated',
                        angle: headPose.angle
                    }
                });
            }
            
            if (this.downwardGlanceCount >= this.MAX_DOWNWARD_GLANCES) {
                results.phoneDetected = true;
                results.violations.push({
                    type: 'phone_detected',
                    description: 'SECURITY VIOLATION: Persistent downward looking - Mobile phone usage suspected',
                    severity: 'critical',
                    metadata: {
                        count: this.downwardGlanceCount,
                        duration: this.downwardGlanceCount * 3 + ' seconds'
                    }
                });
            } else if (this.downwardGlanceCount >= 3) {
                results.warnings.push({
                    type: 'head_position_suspicious',
                    message: `⚠️ WARNING: Looking down detected! Keep eyes on screen! (${this.downwardGlanceCount}/${this.MAX_DOWNWARD_GLANCES})`,
                    count: this.downwardGlanceCount
                });
            }
        } else {
            // Reset counter if looking at screen properly
            if (this.downwardGlanceCount > 0) {
                this.downwardGlanceCount = Math.max(0, this.downwardGlanceCount - 1);
            }
        }
        
        // Detect hands out of frame (holding phone)
        if (!hands.handsVisible) {
            this.handsOutOfFrameCount++;
            
            if (this.handsOutOfFrameCount >= this.MAX_HANDS_OUT_OF_FRAME) {
                results.violations.push({
                    type: 'hands_out_of_frame',
                    description: 'Hands consistently out of camera view - possible phone usage',
                    severity: 'medium',
                    metadata: {
                        count: this.handsOutOfFrameCount,
                        duration: this.handsOutOfFrameCount * 3 + ' seconds'
                    }
                });
            } else if (this.handsOutOfFrameCount >= 2) {
                results.warnings.push({
                    type: 'hands_out_of_frame',
                    message: `⚠️ WARNING: Hands not visible! Keep hands in view! (${this.handsOutOfFrameCount}/${this.MAX_HANDS_OUT_OF_FRAME})`,
                    count: this.handsOutOfFrameCount
                });
            }
        } else {
            // Gradually decrease counter
            if (this.handsOutOfFrameCount > 0) {
                this.handsOutOfFrameCount = Math.max(0, this.handsOutOfFrameCount - 1);
            }
        }
        
        // Analyze lighting patterns (phone screen creates distinctive lighting)
        if (lighting.suspiciousPattern) {
            this.lightingChangeCount++;
            this.lightingPattern.push({
                timestamp: Date.now(),
                brightness: lighting.brightness,
                change: lighting.change
            });
            
            if (this.lightingChangeCount >= this.MAX_LIGHTING_CHANGES) {
                results.violations.push({
                    type: 'lighting_pattern_change',
                    description: 'Suspicious lighting pattern detected - possible phone screen illumination',
                    severity: 'medium',
                    metadata: {
                        count: this.lightingChangeCount,
                        pattern: this.lightingPattern.slice(-5)
                    }
                });
            }
        } else {
            // Decay counter slowly
            if (this.lightingChangeCount > 0 && Math.random() > 0.7) {
                this.lightingChangeCount--;
            }
        }
        
        // Detect phone screen reflection (in glasses or eyes)
        if (reflection.detected) {
            this.phoneReflectionCount++;
            
            if (this.phoneReflectionCount >= this.MAX_PHONE_REFLECTION) {
                results.phoneDetected = true;
                results.violations.push({
                    type: 'phone_reflection_detected',
                    description: 'SECURITY VIOLATION: Phone screen reflection detected in face/glasses',
                    severity: 'critical',
                    metadata: {
                        count: this.phoneReflectionCount,
                        location: reflection.location,
                        confidence: reflection.confidence
                    }
                });
            } else if (this.phoneReflectionCount >= 2) {
                results.warnings.push({
                    type: 'phone_reflection_detected',
                    message: `🚨 URGENT: Screen reflection detected! (${this.phoneReflectionCount}/${this.MAX_PHONE_REFLECTION})`,
                    count: this.phoneReflectionCount
                });
            }
        } else {
            if (this.phoneReflectionCount > 0 && Math.random() > 0.8) {
                this.phoneReflectionCount--;
            }
        }
        
        // Store current frame for next comparison
        this.previousFrameData = imageData;
        this.previousBrightness = lighting.brightness;
        this.previousFacePosition = headPose.position;
        
        return results;
    }
    
    /**
     * Detect head pose and angle - looking down at phone in lap
     */
    detectHeadPose(imageData, canvas) {
        const data = imageData.data;
        const width = canvas.width;
        const height = canvas.height;
        
        // Find face region by detecting skin tones
        let topY = height;
        let bottomY = 0;
        let leftX = width;
        let rightX = 0;
        let facePixelCount = 0;
        
        // Scan for face boundaries
        for (let y = 0; y < height; y += 4) {
            for (let x = 0; x < width; x += 4) {
                const i = (y * width + x) * 4;
                const r = data[i];
                const g = data[i + 1];
                const b = data[i + 2];
                
                if (this.isSkinTone(r, g, b)) {
                    facePixelCount++;
                    topY = Math.min(topY, y);
                    bottomY = Math.max(bottomY, y);
                    leftX = Math.min(leftX, x);
                    rightX = Math.max(rightX, x);
                }
            }
        }
        
        // Calculate face position and dimensions
        const faceHeight = bottomY - topY;
        const faceWidth = rightX - leftX;
        const faceCenterY = (topY + bottomY) / 2;
        const faceCenterX = (leftX + rightX) / 2;
        
        // Detect if face is positioned too low (looking down)
        const screenCenterY = height / 2;
        const verticalOffset = faceCenterY - screenCenterY;
        const verticalOffsetRatio = verticalOffset / height;
        
        // Face positioned in lower part of frame = looking down
        const lookingDown = verticalOffsetRatio > 0.15 && faceHeight < height * 0.4;
        
        // Detect head tilt angle by checking face shape
        const aspectRatio = faceWidth / faceHeight;
        const headTiltedDown = aspectRatio > 1.4 || faceHeight < height * 0.25;
        
        return {
            lookingDown: lookingDown || headTiltedDown,
            position: { x: faceCenterX, y: faceCenterY },
            angle: verticalOffsetRatio * 90, // Approximate angle in degrees
            faceHeight: faceHeight,
            aspectRatio: aspectRatio
        };
    }
    
    /**
     * Detect if hands are visible in frame
     * Hands out of frame suggests holding phone below camera
     */
    detectHandsInFrame(imageData, canvas) {
        const data = imageData.data;
        const width = canvas.width;
        const height = canvas.height;
        
        // Check bottom 40% of frame for hand-like skin regions
        const bottomRegionStart = Math.floor(height * 0.6);
        let skinPixelsInBottomRegion = 0;
        let totalPixelsChecked = 0;
        
        // Also check for arm/hand movement patterns
        let movementDetected = false;
        
        for (let y = bottomRegionStart; y < height; y += 8) {
            for (let x = 0; x < width; x += 8) {
                totalPixelsChecked++;
                const i = (y * width + x) * 4;
                const r = data[i];
                const g = data[i + 1];
                const b = data[i + 2];
                
                if (this.isSkinTone(r, g, b)) {
                    skinPixelsInBottomRegion++;
                }
            }
        }
        
        const skinRatio = skinPixelsInBottomRegion / totalPixelsChecked;
        
        // Hands visible if there's significant skin tone in bottom region
        const handsVisible = skinRatio > 0.08; // At least 8% skin tone in bottom area
        
        return {
            handsVisible: handsVisible,
            skinRatio: skinRatio,
            confidence: skinRatio > 0.15 ? 'high' : skinRatio > 0.08 ? 'medium' : 'low'
        };
    }
    
    /**
     * Analyze lighting patterns for phone screen illumination
     * Phone screens create distinctive blue-white light on face
     */
    analyzeLightingPattern(imageData) {
        const data = imageData.data;
        const width = imageData.width;
        const height = imageData.height;
        
        let totalBrightness = 0;
        let blueishPixels = 0;
        let pixelCount = 0;
        
        // Focus on face region (center 60% of frame)
        const startX = Math.floor(width * 0.2);
        const endX = Math.floor(width * 0.8);
        const startY = Math.floor(height * 0.2);
        const endY = Math.floor(height * 0.8);
        
        for (let y = startY; y < endY; y += 8) {
            for (let x = startX; x < endX; x += 8) {
                const i = (y * width + x) * 4;
                const r = data[i];
                const g = data[i + 1];
                const b = data[i + 2];
                
                if (this.isSkinTone(r, g, b)) {
                    const brightness = (r + g + b) / 3;
                    totalBrightness += brightness;
                    pixelCount++;
                    
                    // Detect blue-white illumination (phone screen signature)
                    if (b > r && b > g && b > 100) {
                        blueishPixels++;
                    }
                }
            }
        }
        
        const avgBrightness = pixelCount > 0 ? totalBrightness / pixelCount : 0;
        const brightnessChange = Math.abs(avgBrightness - this.previousBrightness);
        const blueishRatio = pixelCount > 0 ? blueishPixels / pixelCount : 0;
        
        // Suspicious pattern: Sudden brightness changes or blue-white light
        const suspiciousPattern = 
            (brightnessChange > 25 && this.previousBrightness > 0) || // Sudden change
            (blueishRatio > 0.15); // Blue-white light on face
        
        return {
            brightness: avgBrightness,
            change: brightnessChange,
            blueishRatio: blueishRatio,
            suspiciousPattern: suspiciousPattern
        };
    }
    
    /**
     * Detect phone screen reflection in glasses or eyes
     * Look for rectangular bright regions
     */
    detectPhoneReflection(imageData, canvas) {
        const data = imageData.data;
        const width = canvas.width;
        const height = canvas.height;
        
        // Focus on upper face region (where glasses/eyes would be)
        const startY = Math.floor(height * 0.25);
        const endY = Math.floor(height * 0.5);
        const startX = Math.floor(width * 0.3);
        const endX = Math.floor(width * 0.7);
        
        let brightSpots = [];
        let currentSpot = null;
        
        // Scan for bright rectangular regions
        for (let y = startY; y < endY; y += 4) {
            for (let x = startX; x < endX; x += 4) {
                const i = (y * width + x) * 4;
                const r = data[i];
                const g = data[i + 1];
                const b = data[i + 2];
                
                const brightness = (r + g + b) / 3;
                
                // Very bright pixels (potential reflection)
                if (brightness > 200 && r > 150 && g > 150 && b > 150) {
                    if (currentSpot) {
                        currentSpot.pixels++;
                        currentSpot.maxX = Math.max(currentSpot.maxX, x);
                        currentSpot.maxY = Math.max(currentSpot.maxY, y);
                    } else {
                        currentSpot = {
                            minX: x,
                            minY: y,
                            maxX: x,
                            maxY: y,
                            pixels: 1
                        };
                    }
                } else if (currentSpot && currentSpot.pixels > 5) {
                    brightSpots.push(currentSpot);
                    currentSpot = null;
                } else {
                    currentSpot = null;
                }
            }
        }
        
        // Check if bright spots have rectangular shape (phone screen characteristic)
        let rectangularReflections = brightSpots.filter(spot => {
            const width = spot.maxX - spot.minX;
            const height = spot.maxY - spot.minY;
            const aspectRatio = width / (height || 1);
            
            // Phone screens typically have aspect ratio between 0.5 and 2.0
            return aspectRatio > 0.5 && aspectRatio < 2.0 && spot.pixels > 10;
        });
        
        const detected = rectangularReflections.length > 0;
        
        return {
            detected: detected,
            location: rectangularReflections.length > 0 ? 'upper_face' : null,
            confidence: rectangularReflections.length > 1 ? 'high' : rectangularReflections.length > 0 ? 'medium' : 'low',
            reflections: rectangularReflections.length
        };
    }
    
    /**
     * Check if downward glances follow a repeated pattern
     * Students often repeatedly check phone at regular intervals
     */
    isRepeatedGlancePattern() {
        if (this.glancePattern.length < 4) return false;
        
        // Check last 5 glances
        const recentGlances = this.glancePattern.slice(-5);
        
        // Calculate time intervals between glances
        const intervals = [];
        for (let i = 1; i < recentGlances.length; i++) {
            intervals.push(recentGlances[i] - recentGlances[i - 1]);
        }
        
        // Check if intervals are consistent (within 5 seconds)
        // This suggests regular checking pattern
        const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
        const consistent = intervals.every(interval => 
            Math.abs(interval - avgInterval) < 5000
        );
        
        return consistent && avgInterval < 30000; // Pattern within 30 seconds
    }
    
    /**
     * Improved skin tone detection
     */
    isSkinTone(r, g, b) {
        // RGB range for skin tones
        const rgbCheck = (
            r > 95 && g > 40 && b > 20 &&
            r > g && r > b &&
            Math.abs(r - g) > 15 &&
            r - Math.min(g, b) > 15
        );
        
        // HSV-based check for robustness
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        const diff = max - min;
        
        if (diff === 0) return false;
        
        let h = 0;
        if (max === r) {
            h = ((g - b) / diff) % 6;
        } else if (max === g) {
            h = (b - r) / diff + 2;
        } else {
            h = (r - g) / diff + 4;
        }
        h = h * 60;
        if (h < 0) h += 360;
        
        const s = max === 0 ? 0 : diff / max;
        const v = max / 255;
        
        const hsvCheck = (
            (h >= 0 && h <= 50) &&
            s >= 0.15 && s <= 0.85 &&
            v >= 0.25 && v <= 1.0
        );
        
        return rgbCheck || hsvCheck;
    }
    
    /**
     * Get current detection statistics
     */
    getStats() {
        return {
            downwardGlances: this.downwardGlanceCount,
            handsOutOfFrame: this.handsOutOfFrameCount,
            suspiciousHeadPose: this.suspiciousHeadPoseCount,
            lightingChanges: this.lightingChangeCount,
            phoneReflections: this.phoneReflectionCount,
            glancePatternLength: this.glancePattern.length,
            lightingPatternLength: this.lightingPattern.length
        };
    }
}

// Export for use in proctoring.js
window.PhoneDetector = PhoneDetector;

