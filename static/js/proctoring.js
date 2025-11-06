// Proctoring functionality for quiz application

let cameraStream = null;
let screenStream = null;
let cameraEnabled = false;
let screenShareEnabled = false;
let testStarted = false;
let isDisqualified = false; // Prevent multiple disqualification triggers
let isTestEnding = false; // Flag to prevent false positives during test submission

// Initialize window variables immediately
window.isTestEnding = false;
window.testStarted = false;
window.isDisqualified = false;

// Screen recording variables
let mediaRecorder = null;
let recordedChunks = [];
let recordingStartTime = null;

// Face detection variables
let faceDetectionInterval = null;
let noFaceCount = 0;
let multipleFaceCount = 0;
let lookingAwayCount = 0;
let faceCheckFrequency = 3000; // Check every 3 seconds
const maxNoFaceWarnings = 4; // Increased from 3 (12 seconds before fail)
const maxMultipleFaceWarnings = 4; // Increased from 2 (12 seconds before fail)
const maxLookingAwayWarnings = 6; // Increased from 5 (18 seconds before fail)

// Mobile phone detection
let phoneDetector = null;

// Get DOM elements
const setupModal = document.getElementById('setupModal');
const setupBtn = document.getElementById('setupBtn');
const startTestBtn = document.getElementById('startTestBtn');
const cameraVideo = document.getElementById('cameraVideo');
const testInterface = document.getElementById('testInterface');
const disqualifyModal = document.getElementById('disqualifyModal');

// Initialize proctoring setup
document.addEventListener('DOMContentLoaded', function() {
    // Show setup modal
    setupModal.style.display = 'flex';
    
    // Setup button click handler
    setupBtn.addEventListener('click', startSetup);
    
    // Start test button click handler
    startTestBtn.addEventListener('click', startTest);
    
    // Prevent context menu
    document.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        if (testStarted) {
            logEvent('violation', 'Right-click detected');
        }
    });
    
    // Detect tab/window switch
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);
    window.addEventListener('focus', handleWindowFocus);
    
    // Prevent keyboard shortcuts
    document.addEventListener('keydown', preventShortcuts);
    
    // Prevent going back
    window.history.pushState(null, null, window.location.href);
    window.addEventListener('popstate', function() {
        if (testStarted) {
            disqualifyStudent('SECURITY VIOLATION: Navigation attempted');
            logEvent('violation', 'Student attempted to navigate back');
        }
        window.history.pushState(null, null, window.location.href);
    });
    
    // Prevent page reload
    window.addEventListener('beforeunload', function(e) {
        if (testStarted && timerInterval) {
            e.preventDefault();
            e.returnValue = 'Test in progress! Leaving will disqualify you.';
            return e.returnValue;
        }
    });
    
    // Detect window resize (attempting to exit fullscreen)
    window.addEventListener('resize', function() {
        if (testStarted) {
            const isFullscreen = document.fullscreenElement || 
                               document.webkitFullscreenElement || 
                               document.mozFullScreenElement || 
                               document.msFullscreenElement;
            
            if (!isFullscreen) {
                logEvent('violation', 'Window resized - possible fullscreen exit attempt');
            }
        }
    });
});

async function startSetup() {
    setupBtn.disabled = true;
    setupBtn.textContent = '⏳ Setting up camera...';
    
    try {
        // Request camera permission first
        await enableCamera();
        updateStatus('cameraStatus', '✅ Enabled', 'success');
        
        // Show instruction alert before screen share
        setupBtn.textContent = '⏳ Preparing screen share...';
        
        // Small delay to show the message
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Show clear instruction alert
        alert(
            '🖥️ DESKTOP SCREEN SHARING REQUIRED\n\n' +
            'In the next dialog:\n\n' +
            '✅ Click "Entire screen" tab at the TOP\n' +
            '✅ Select your DESKTOP/MONITOR (full screen)\n' +
            '✅ Click the "Share" button\n\n' +
            '❌ DO NOT select "Chrome tab" or "Browser tab"\n' +
            '❌ DO NOT select "Window" or any application\n\n' +
            '🔍 System automatically validates:\n' +
            '   • Screen type must be desktop/monitor\n' +
            '   • Resolution verified\n' +
            '   • Continuous monitoring during test\n\n' +
            'Click OK to open screen sharing dialog...'
        );
        
        setupBtn.textContent = '⏳ Requesting screen share...';
        
        // Request screen share permission
        await enableScreenShare();
        
        if (cameraEnabled && screenShareEnabled) {
            startTestBtn.style.display = 'block';
            setupBtn.style.display = 'none';
            updateStatus('screenStatus', '✅ Desktop/Monitor Validated', 'success');
            
            // Success message
            alert('✅ Setup Complete!\n\n' +
                  '✓ Camera enabled\n' +
                  '✓ Entire desktop/monitor sharing validated\n' +
                  '✓ System verification passed\n\n' +
                  'Click "Start Test" to begin.');
        }
    } catch (error) {
        console.error('Setup error:', error);
        
        if (error.message.includes('Must share entire screen') || error.message.includes('resolution too small')) {
            updateStatus('cameraStatus', '✅ Enabled', 'success');
            updateStatus('screenStatus', '❌ Invalid - Not Desktop', 'error');
            alert(
                '❌ DESKTOP SHARING REQUIRED!\n\n' +
                'You did not share your entire desktop/monitor.\n\n' +
                '🖥️ REQUIRED STEPS:\n' +
                '1. Click "Entire screen" tab at the top\n' +
                '2. Select your desktop/monitor (NOT window/tab)\n' +
                '3. Click the "Share" button\n\n' +
                '⚠️ System validates screen type automatically.\n' +
                'Window/tab sharing will be rejected.\n\n' +
                'Click OK to retry...'
            );
        } else {
            updateStatus('cameraStatus', cameraEnabled ? '✅ Enabled' : '❌ Failed', cameraEnabled ? 'success' : 'error');
            updateStatus('screenStatus', '❌ Failed', 'error');
        }
        
        setupBtn.disabled = false;
        setupBtn.textContent = '🔄 Retry Setup';
        
        logEvent('permission_denied', `Setup failed: ${error.message}`);
    }
}

async function enableCamera() {
    try {
        cameraStream = await navigator.mediaDevices.getUserMedia({ 
            video: true, 
            audio: false 
        });
        
        cameraVideo.srcObject = cameraStream;
        cameraEnabled = true;
        
        // Update window variables
        updateWindowVariables();
        
        logEvent('camera_enabled', 'Camera successfully enabled');
        return true;
    } catch (error) {
        console.error('Camera error:', error);
        throw new Error('Camera access denied');
    }
}

async function enableScreenShare() {
    try {
        screenStream = await navigator.mediaDevices.getDisplayMedia({ 
            video: {
                displaySurface: "monitor", // Force entire screen sharing, not just window/tab
                cursor: "always",
                width: { ideal: 1920 },
                height: { ideal: 1080 }
            },
            audio: false,
            preferCurrentTab: false,
            surfaceSwitching: "exclude" // Prevent switching between screens during test
        });
        
        // Check if user shared entire screen (not just a window or tab)
        const videoTrack = screenStream.getVideoTracks()[0];
        const settings = videoTrack.getSettings();
        
        // Log what was shared for debugging
        console.log('Screen share settings:', settings);
        console.log('Display surface:', settings.displaySurface);
        console.log('Resolution:', settings.width, 'x', settings.height);
        
        // STRICT VALIDATION: Only allow monitor (entire screen/desktop)
        if (settings.displaySurface && settings.displaySurface !== 'monitor') {
            const selectionType = settings.displaySurface === 'window' ? 'a Window' : 
                                 settings.displaySurface === 'browser' ? 'a Chrome Tab' : 
                                 settings.displaySurface === 'application' ? 'an Application Window' :
                                 settings.displaySurface;
            
            // Stop the stream immediately
            screenStream.getTracks().forEach(track => track.stop());
            
            // Log the violation
            logEvent('screen_share_violation', `Invalid screen share type: ${settings.displaySurface}`);
            
            throw new Error(
                `Must share entire screen - You selected: ${selectionType}\n\n` +
                `✅ REQUIRED: Entire Desktop/Monitor\n` +
                `❌ NOT ALLOWED: Windows, tabs, or applications\n\n` +
                `This is a security requirement to prevent cheating.`
            );
        }
        
        // Additional validation: Check if it's actually a desktop screen by resolution
        // Desktop screens are typically larger than windows/tabs
        if (settings.width && settings.height) {
            const isLikelyDesktop = settings.width >= 1024 && settings.height >= 768;
            if (!isLikelyDesktop) {
                screenStream.getTracks().forEach(track => track.stop());
                logEvent('screen_share_violation', `Screen share resolution too small: ${settings.width}x${settings.height}`);
                
                throw new Error(
                    `Screen resolution too small (${settings.width}x${settings.height}).\n\n` +
                    `You may have shared a window instead of entire desktop.\n` +
                    `Please share your ENTIRE DESKTOP/MONITOR.`
                );
            }
        }
        
        // Detect when user stops screen sharing during test
        videoTrack.addEventListener('ended', () => {
            handleScreenShareStop();
        });
        
        // Monitor screen share continuously during test
        startScreenShareMonitoring(videoTrack);
        
        screenShareEnabled = true;
        
        // Update window variables
        updateWindowVariables();
        
        logEvent('screen_share_enabled', 
            `✅ Desktop screen sharing enabled - Type: ${settings.displaySurface}, Resolution: ${settings.width}x${settings.height}`);
        
        return true;
    } catch (error) {
        console.error('Screen share error:', error);
        
        // Pass through validation errors
        if (error.message.includes('Must share entire screen') || 
            error.message.includes('resolution too small')) {
            throw error;
        }
        
        // Handle user cancellation or permission denial
        if (error.name === 'NotAllowedError') {
            throw new Error('Screen sharing was denied or cancelled.\n\nYou must share your entire desktop to take this test.');
        }
        
        throw new Error('Screen sharing failed. Please try again.');
    }
}

// Monitor screen sharing status during the test
function startScreenShareMonitoring(videoTrack) {
    // Check screen share status every 5 seconds
    const monitorInterval = setInterval(() => {
        if (!testStarted) {
            clearInterval(monitorInterval);
            return;
        }
        
        // Check if track is still active
        if (videoTrack.readyState === 'ended') {
            clearInterval(monitorInterval);
            handleScreenShareStop();
            return;
        }
        
        // Get current settings
        const currentSettings = videoTrack.getSettings();
        
        // Verify it's still a monitor (desktop)
        if (currentSettings.displaySurface && currentSettings.displaySurface !== 'monitor') {
            clearInterval(monitorInterval);
            disqualifyStudent('SECURITY VIOLATION: Screen share type changed - must be entire desktop');
            logEvent('violation', `Screen share changed to: ${currentSettings.displaySurface}`);
        }
    }, 5000);
}

function startTest() {
    if (!cameraEnabled || !screenShareEnabled) {
        alert('Please enable camera and screen sharing first');
        return;
    }
    
    // Hide modal and show test interface
    setupModal.style.display = 'none';
    testInterface.style.display = 'block';
    
    // Show camera preview
    const videoPreview = document.getElementById('videoPreview');
    videoPreview.style.display = 'block';
    
    // IMPORTANT: Set testStarted AFTER a delay to prevent false triggers during setup
    setTimeout(() => {
        testStarted = true;
        updateWindowVariables(); // Sync to window
        logEvent('test_started', 'Student started the test with face detection enabled');
    }, 2000); // 2 second grace period
    
    // Start timer
    startTimer();
    
    // Start screen recording
    startScreenRecording();
    
    // Enter fullscreen
    requestFullscreen();
    
    // Monitor fullscreen changes
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('msfullscreenchange', handleFullscreenChange);
    
    // Start face detection after grace period (allow time for fullscreen transition)
    setTimeout(() => {
        if (testStarted) {
            startFaceDetection();
        }
    }, 3000); // 3 second delay for face detection
    
    // Start mouse movement tracking
    startMouseTracking();
    
    // Additional security: Disable text selection
    document.body.style.userSelect = 'none';
    document.body.style.webkitUserSelect = 'none';
    
    // Disable developer tools more aggressively
    disableDeveloperTools();
}

function handleVisibilityChange() {
    // Only check if test is active AND not ending legitimately
    if (testStarted && !isTestEnding && !isDisqualified && document.hidden) {
        // Tab switched or window minimized - STRICT MODE
        disqualifyStudent('SECURITY VIOLATION: Tab switching or window change detected');
        logEvent('tab_switched', 'Student switched tabs or minimized window - TEST TERMINATED');
    }
}

// Additional tab switch detection (more aggressive)
let tabSwitchDetected = false;
document.addEventListener('visibilitychange', function() {
    // Only check if test is active AND not ending legitimately
    if (testStarted && !isTestEnding && !isDisqualified && document.visibilityState === 'hidden' && !tabSwitchDetected) {
        tabSwitchDetected = true;
        disqualifyStudent('SECURITY VIOLATION: You left the test page');
        logEvent('violation', 'Page visibility changed - test tab lost focus');
    }
});

function handleWindowBlur() {
    // Only check if test is active AND not ending legitimately
    if (testStarted && !isTestEnding && !isDisqualified) {
        // Strict mode: Fail on window blur (clicking outside browser, minimizing, etc.)
        disqualifyStudent('Window lost focus - Test terminated for security violation');
        logEvent('window_blur', 'Window lost focus - Test failed');
    }
}

function handleWindowFocus() {
    if (testStarted) {
        logEvent('window_blur', 'Window regained focus');
    }
}

function handleFullscreenChange() {
    // Only check if test is active AND not ending legitimately
    if (testStarted && !isTestEnding && !isDisqualified) {
        const isFullscreen = document.fullscreenElement || 
                           document.webkitFullscreenElement || 
                           document.mozFullScreenElement || 
                           document.msFullscreenElement;
        
        if (!isFullscreen) {
            // User exited fullscreen - fail the test
            disqualifyStudent('Exited fullscreen mode - Test terminated');
            logEvent('violation', 'Student exited fullscreen mode');
        }
    }
}

function handleScreenShareStop() {
    // Only disqualify if test is active AND not in the process of ending legitimately
    if (testStarted && !isTestEnding && !isDisqualified) {
        disqualifyStudent('Screen sharing was stopped');
        logEvent('violation', 'Screen sharing stopped by student');
    }
}

function preventShortcuts(e) {
    if (!testStarted) return; // Only block when test is active
    
    // Prevent common shortcuts that could be used to cheat
    const forbidden = [
        { ctrl: true, key: 'c' }, // Copy
        { ctrl: true, key: 'v' }, // Paste
        { ctrl: true, key: 'x' }, // Cut
        { ctrl: true, key: 'a' }, // Select all
        { ctrl: true, key: 'f' }, // Find
        { ctrl: true, key: 'p' }, // Print
        { ctrl: true, key: 's' }, // Save
        { ctrl: true, key: 'u' }, // View source
        { key: 'F12' }, // Developer tools
        { ctrl: true, shift: true, key: 'I' }, // Developer tools (Inspect)
        { ctrl: true, shift: true, key: 'i' }, // Developer tools (lowercase)
        { ctrl: true, shift: true, key: 'J' }, // Console
        { ctrl: true, shift: true, key: 'j' }, // Console (lowercase)
        { ctrl: true, shift: true, key: 'C' }, // Inspector
        { ctrl: true, shift: true, key: 'c' }, // Inspector (lowercase)
        { ctrl: true, shift: true, key: 'K' }, // Firefox console
        { ctrl: true, shift: true, key: 'k' }, // Firefox console (lowercase)
        { ctrl: true, key: 'U' }, // View source (uppercase)
        { alt: true, key: 'Tab' }, // Alt+Tab
        { cmd: true, key: 'Option' }, // Mac inspect
    ];
    
    // Check for Command key on Mac (metaKey)
    const isCommand = e.metaKey || e.ctrlKey;
    
    for (let combo of forbidden) {
        if (combo.ctrl && isCommand && e.key.toLowerCase() === combo.key.toLowerCase()) {
            e.preventDefault();
            e.stopPropagation();
            if (testStarted) {
                logEvent('violation', `BLOCKED: Ctrl/Cmd+${combo.key}`);
                showWarningBanner('⚠️ That action is blocked during the test!');
            }
            return false;
        }
        if (combo.shift && e.shiftKey && combo.ctrl && isCommand && 
            e.key.toLowerCase() === combo.key.toLowerCase()) {
            e.preventDefault();
            e.stopPropagation();
            if (testStarted) {
                logEvent('violation', `BLOCKED: Ctrl/Cmd+Shift+${combo.key}`);
                disqualifyStudent('SECURITY VIOLATION: Developer tools access attempted');
            }
            return false;
        }
        if (combo.alt && e.altKey && e.key === combo.key) {
            e.preventDefault();
            e.stopPropagation();
            if (testStarted) {
                logEvent('violation', `BLOCKED: Alt+${combo.key}`);
            }
            return false;
        }
        if (!combo.ctrl && !combo.shift && !combo.alt && e.key === combo.key) {
            e.preventDefault();
            e.stopPropagation();
            if (testStarted) {
                logEvent('violation', `BLOCKED: ${combo.key}`);
                if (combo.key === 'F12') {
                    disqualifyStudent('SECURITY VIOLATION: Developer tools access attempted');
                }
            }
            return false;
        }
    }
}

// Additional developer tools detection
function disableDeveloperTools() {
    // Detect when developer tools are opened
    let devtoolsOpen = false;
    const threshold = 160;
    
    // Check if devtools is open by checking window dimensions
    const checkDevTools = () => {
        // Only check if test is active AND not ending legitimately
        if (!testStarted || isTestEnding || isDisqualified) return;
        
        const widthThreshold = window.outerWidth - window.innerWidth > threshold;
        const heightThreshold = window.outerHeight - window.innerHeight > threshold;
        
        if (widthThreshold || heightThreshold) {
            if (!devtoolsOpen) {
                devtoolsOpen = true;
                disqualifyStudent('SECURITY VIOLATION: Developer tools detected - Test terminated');
                logEvent('violation', 'Developer tools opened during test');
            }
        }
    };
    
    // Check every second
    setInterval(checkDevTools, 1000);
    
    // Detect right-click
    document.addEventListener('contextmenu', function(e) {
        if (testStarted) {
            e.preventDefault();
            e.stopPropagation();
            logEvent('violation', 'Right-click attempted');
            showWarningBanner('⚠️ Right-click is disabled during the test!');
            return false;
        }
    }, true);
    
    // Detect F12 and other devtools keys
    document.addEventListener('keydown', function(e) {
        // F12 or Ctrl+Shift+I/J/C
        if (e.key === 'F12' || 
            (e.ctrlKey && e.shiftKey && ['I', 'i', 'J', 'j', 'C', 'c', 'K', 'k'].includes(e.key)) ||
            (e.metaKey && e.altKey && ['I', 'i', 'C', 'c'].includes(e.key))) {
            e.preventDefault();
            e.stopPropagation();
            if (testStarted) {
                disqualifyStudent('SECURITY VIOLATION: Developer tools shortcut detected');
                logEvent('violation', 'Developer tools shortcut attempted: ' + e.key);
            }
            return false;
        }
    }, true);
    
    // Disable drag and drop (could be used to open files)
    document.addEventListener('dragover', function(e) {
        if (testStarted) {
            e.preventDefault();
            return false;
        }
    });
    
    document.addEventListener('drop', function(e) {
        if (testStarted) {
            e.preventDefault();
            return false;
        }
    });
}

function disqualifyStudent(reason) {
    // Prevent multiple disqualifications
    if (isDisqualified) {
        console.log('Already disqualified, ignoring duplicate trigger');
        return;
    }
    
    isDisqualified = true;
    isTestEnding = true; // Prevent false positives when stopping streams
    testStarted = false;
    
    // Update window variables immediately
    updateWindowVariables();
    
    console.log('Disqualifying student:', reason);
    
    // Stop face detection
    if (faceDetectionInterval) {
        clearInterval(faceDetectionInterval);
        faceDetectionInterval = null;
    }
    
    // Stop phone detection
    if (phoneDetector) {
        phoneDetector.stop();
    }
    
    // Stop screen recording and upload
    stopScreenRecording();
    
    // Show disqualification modal
    document.getElementById('disqualifyReason').textContent = reason;
    disqualifyModal.style.display = 'flex';
    
    // Stop streams (now safe - won't trigger false screen share stop detection)
    if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
    }
    if (screenStream) {
        screenStream.getTracks().forEach(track => track.stop());
    }
    
    // Hide test interface
    testInterface.style.display = 'none';
    
    // Log the disqualification with the exact reason
    // Using 'violation' event type to ensure it gets handled properly
    logEvent('violation', reason);
    
    // Redirect to result page after 5 seconds
    setTimeout(() => {
        window.location.href = `/quiz/result/${ATTEMPT_ID}/`;
    }, 5000);
}

function requestFullscreen() {
    const elem = document.documentElement;
    if (elem.requestFullscreen) {
        elem.requestFullscreen();
    } else if (elem.webkitRequestFullscreen) {
        elem.webkitRequestFullscreen();
    } else if (elem.msRequestFullscreen) {
        elem.msRequestFullscreen();
    }
}

function updateStatus(elementId, text, statusClass) {
    const element = document.getElementById(elementId);
    const statusSpan = element.querySelector('span');
    statusSpan.textContent = text;
    statusSpan.className = `status-${statusClass}`;
}

async function logEvent(eventType, description, metadata = {}) {
    try {
        const response = await fetch('/quiz/api/log-event/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                attempt_id: ATTEMPT_ID,
                event_type: eventType,
                description: description,
                metadata: metadata
            })
        });
        
        const data = await response.json();
        
        if (data.disqualified) {
            disqualifyStudent(data.message);
        }
        
        return data.success;
    } catch (error) {
        console.error('Error logging event:', error);
        return false;
    }
}

// Face Detection System
function startFaceDetection() {
    // Create canvas for face detection
    const canvas = document.createElement('canvas');
    canvas.id = 'faceCanvas';
    canvas.style.display = 'none';
    document.body.appendChild(canvas);
    
    const context = canvas.getContext('2d');
    const video = document.getElementById('cameraVideo');
    
    // Set canvas size
    canvas.width = 640;
    canvas.height = 480;
    
    // Initialize mobile phone detector
    if (typeof PhoneDetector !== 'undefined') {
        phoneDetector = new PhoneDetector();
        phoneDetector.start();
        logEvent('face_detection_started', 'Face detection and mobile phone monitoring initiated');
    } else {
        console.warn('PhoneDetector not loaded - mobile phone detection disabled');
        logEvent('face_detection_started', 'Face detection monitoring initiated');
    }
    
    // Check face every 3 seconds
    faceDetectionInterval = setInterval(() => {
        if (!testStarted || !video.videoWidth) return;
        
        // Draw current frame to canvas
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // Get image data for analysis
        const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
        
        // Perform face detection
        detectFace(imageData, canvas);
        
        // Perform mobile phone detection
        if (phoneDetector) {
            performPhoneDetection(imageData, canvas);
        }
    }, faceCheckFrequency);
}

function detectFace(imageData, canvas) {
    // Improved face detection with better accuracy
    
    const data = imageData.data;
    const width = canvas.width;
    const height = canvas.height;
    
    // Focus on center region of video (where face should be)
    const centerX = width / 2;
    const centerY = height / 2;
    const faceRegionWidth = width * 0.6; // 60% of width
    const faceRegionHeight = height * 0.7; // 70% of height
    
    let skinPixels = 0;
    let totalBrightness = 0;
    let faceAreaPixels = 0;
    
    // Sample pixels in grid pattern (focusing on center)
    for (let y = 0; y < height; y += 8) {
        for (let x = 0; x < width; x += 8) {
            const i = (y * width + x) * 4;
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            
            // Check if pixel is in face region (center area)
            const inFaceRegion = 
                Math.abs(x - centerX) < faceRegionWidth / 2 &&
                Math.abs(y - centerY) < faceRegionHeight / 2;
            
            // Improved skin tone detection
            if (isSkinTone(r, g, b)) {
                skinPixels++;
                totalBrightness += (r + g + b) / 3;
                if (inFaceRegion) {
                    faceAreaPixels++;
                }
            }
        }
    }
    
    const avgBrightness = skinPixels > 0 ? totalBrightness / skinPixels : 0;
    
    // More accurate thresholds
    const minSkinPixels = 40; // Minimum for face presence
    const maxSkinPixels = 800; // Much higher threshold (was 500)
    const minFaceAreaPixels = 25; // Minimum in center region
    
    // Check conditions
    if (skinPixels < minSkinPixels || faceAreaPixels < minFaceAreaPixels) {
        // No face detected in center region
        handleNoFaceDetected();
    } else if (skinPixels > maxSkinPixels) {
        // Too many skin pixels - might be multiple faces or very close to camera
        // But be more forgiving - check if it's just too close
        const ratio = faceAreaPixels / skinPixels;
        if (ratio > 0.4) {
            // Most pixels are in center - just too close, not multiple faces
            // Reset counters, don't flag as multiple
            noFaceCount = 0;
            multipleFaceCount = 0;
            if (lookingAwayCount > 0) lookingAwayCount--;
        } else {
            // Pixels spread out - likely multiple faces
            handleMultipleFaces();
        }
    } else if (avgBrightness < 50) {
        // Face too dark - possibly looking away or covered
        handleLookingAway();
    } else {
        // Face detected properly - reset all counters
        noFaceCount = 0;
        multipleFaceCount = 0;
        if (lookingAwayCount > 0) lookingAwayCount--;
    }
}

function isSkinTone(r, g, b) {
    // Improved skin tone detection algorithm
    // Works better for various skin tones and lighting conditions
    
    // Method 1: RGB range (works for most skin tones)
    const rgbCheck = (
        r > 95 && g > 40 && b > 20 &&
        r > g && r > b &&
        Math.abs(r - g) > 15 &&
        r - Math.min(g, b) > 15
    );
    
    // Method 2: HSV-based check (more robust)
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const diff = max - min;
    
    if (diff === 0) return false; // Gray scale, not skin
    
    // Hue calculation (simplified)
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
    
    // Saturation
    const s = max === 0 ? 0 : diff / max;
    
    // Value (brightness)
    const v = max / 255;
    
    // Skin tone typically has hue between 0-50 (reddish)
    // Saturation 0.2-0.8, Value 0.3-1.0
    const hsvCheck = (
        (h >= 0 && h <= 50) &&
        s >= 0.15 && s <= 0.85 &&
        v >= 0.25 && v <= 1.0
    );
    
    // Return true if either method detects skin
    return rgbCheck || hsvCheck;
}

function handleNoFaceDetected() {
    noFaceCount++;
    
    if (noFaceCount === 1) {
        logEvent('face_not_detected', 'No face detected in camera view');
    }
    
    if (noFaceCount >= maxNoFaceWarnings) {
        disqualifyStudent('No face detected - Student left camera view or camera blocked');
        logEvent('violation', `No face detected for ${noFaceCount} consecutive checks (${noFaceCount * 3} seconds)`);
    } else if (noFaceCount === 2) {
        // First warning at 6 seconds
        showWarningBanner('⚠️ WARNING: No face detected! Position yourself in camera view! (' + noFaceCount + '/' + maxNoFaceWarnings + ')');
        logEvent('warning', 'No face warning issued - count: ' + noFaceCount);
    } else if (noFaceCount >= 3) {
        // Urgent warning
        showWarningBanner('🚨 URGENT: Still no face! ' + (maxNoFaceWarnings - noFaceCount) + ' warnings left before FAIL!');
        logEvent('warning', 'No face urgent warning - count: ' + noFaceCount);
    }
}

function handleMultipleFaces() {
    multipleFaceCount++;
    
    if (multipleFaceCount === 1) {
        logEvent('multiple_faces', 'Multiple faces or unusual activity detected');
    }
    
    if (multipleFaceCount >= maxMultipleFaceWarnings) {
        disqualifyStudent('Multiple faces detected - Unauthorized assistance suspected');
        logEvent('violation', `Multiple faces detected for ${multipleFaceCount} consecutive checks (${multipleFaceCount * 3} seconds)`);
    } else if (multipleFaceCount === 2) {
        // First warning at 6 seconds
        showWarningBanner('⚠️ WARNING: Multiple faces detected! Ensure you are alone! (' + multipleFaceCount + '/' + maxMultipleFaceWarnings + ')');
        logEvent('warning', 'Multiple faces warning issued - count: ' + multipleFaceCount);
    } else if (multipleFaceCount >= 3) {
        // Urgent warning
        showWarningBanner('🚨 URGENT: Multiple faces! ' + (maxMultipleFaceWarnings - multipleFaceCount) + ' warnings left before FAIL!');
        logEvent('warning', 'Multiple faces urgent warning - count: ' + multipleFaceCount);
    }
}

function handleLookingAway() {
    lookingAwayCount++;
    
    if (lookingAwayCount === 1) {
        logEvent('looking_away', 'Student may be looking away from screen');
    }
    
    if (lookingAwayCount >= maxLookingAwayWarnings) {
        disqualifyStudent('Looking away from screen - Possible use of external resources');
        logEvent('violation', `Looking away detected for ${lookingAwayCount} checks (${lookingAwayCount * 3} seconds)`);
    } else if (lookingAwayCount === 3) {
        // First warning at 9 seconds
        showWarningBanner('⚠️ WARNING: Keep your eyes on the screen! (' + lookingAwayCount + '/' + maxLookingAwayWarnings + ')');
        logEvent('warning', 'Looking away warning issued - count: ' + lookingAwayCount);
    } else if (lookingAwayCount >= 4) {
        // Urgent warning
        showWarningBanner('🚨 URGENT: Stop looking away! ' + (maxLookingAwayWarnings - lookingAwayCount) + ' warnings left before FAIL!');
        logEvent('warning', 'Looking away urgent warning - count: ' + lookingAwayCount);
    }
}

function showWarningBanner(message) {
    // Create or update warning banner
    let banner = document.getElementById('warningBanner');
    if (!banner) {
        banner = document.createElement('div');
        banner.id = 'warningBanner';
        banner.style.cssText = `
            position: fixed;
            top: 70px;
            left: 50%;
            transform: translateX(-50%);
            background: #e53e3e;
            color: white;
            padding: 15px 30px;
            border-radius: 8px;
            font-weight: bold;
            font-size: 16px;
            z-index: 9999;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            animation: shake 0.5s;
        `;
        document.body.appendChild(banner);
    }
    
    banner.textContent = message;
    banner.style.display = 'block';
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
        if (banner) banner.style.display = 'none';
    }, 5000);
}

// Mobile Phone Detection Handler
function performPhoneDetection(imageData, canvas) {
    if (!phoneDetector || !testStarted) return;
    
    try {
        const results = phoneDetector.analyzeFrame(imageData, canvas);
        
        if (!results) return;
        
        // Handle critical violations (phone detected)
        if (results.phoneDetected) {
            const criticalViolations = results.violations.filter(v => v.severity === 'critical');
            if (criticalViolations.length > 0) {
                const violation = criticalViolations[0];
                disqualifyStudent(violation.description);
                logEvent(violation.type, violation.description, violation.metadata);
                return; // Stop processing after disqualification
            }
        }
        
        // Log all violations
        for (const violation of results.violations) {
            if (violation.severity !== 'critical') {
                logEvent(violation.type, violation.description, violation.metadata);
            }
        }
        
        // Show warnings to student
        for (const warning of results.warnings) {
            showWarningBanner(warning.message);
            if (warning.count >= 2) { // Log after second warning
                logEvent(warning.type, warning.message, { count: warning.count });
            }
        }
        
        // Periodic stats logging (every 10 checks = 30 seconds)
        if (Math.random() < 0.1) {
            const stats = phoneDetector.getStats();
            if (stats.downwardGlances > 0 || stats.handsOutOfFrame > 0 || 
                stats.lightingChanges > 0 || stats.phoneReflections > 0) {
                logEvent('suspicious_activity', 'Phone detection statistics', stats);
            }
        }
        
    } catch (error) {
        console.error('Phone detection error:', error);
    }
}

// Mouse Movement Tracking
let lastMouseMove = Date.now();
let mouseMoveCount = 0;
let suspiciousInactivity = 0;

function startMouseTracking() {
    document.addEventListener('mousemove', function() {
        lastMouseMove = Date.now();
        mouseMoveCount++;
    });
    
    // Check for suspicious patterns
    setInterval(() => {
        if (!testStarted) return;
        
        const timeSinceLastMove = Date.now() - lastMouseMove;
        
        // No mouse movement for 2 minutes - suspicious
        if (timeSinceLastMove > 120000) {
            suspiciousInactivity++;
            if (suspiciousInactivity >= 2) {
                logEvent('suspicious_activity', 'Extended period of no mouse movement detected');
            }
        } else {
            suspiciousInactivity = 0;
        }
        
        // Too much mouse movement (copy/paste attempts)
        if (mouseMoveCount > 1000) {
            logEvent('suspicious_activity', 'Excessive mouse movement detected');
        }
        
        mouseMoveCount = 0;
    }, 60000); // Check every minute
}

// Additional Security: Clipboard monitoring
document.addEventListener('copy', function(e) {
    if (testStarted) {
        e.preventDefault();
        logEvent('violation', 'Copy attempt detected and blocked');
        showWarningBanner('⚠️ Copying is disabled during the test!');
    }
});

document.addEventListener('paste', function(e) {
    if (testStarted) {
        e.preventDefault();
        logEvent('violation', 'Paste attempt detected and blocked');
        showWarningBanner('⚠️ Pasting is disabled during the test!');
    }
});

document.addEventListener('cut', function(e) {
    if (testStarted) {
        e.preventDefault();
        logEvent('violation', 'Cut attempt detected and blocked');
    }
});

// Print detection
window.addEventListener('beforeprint', function(e) {
    if (testStarted) {
        e.preventDefault();
        disqualifyStudent('Print attempt detected - Test terminated');
        logEvent('violation', 'Student attempted to print test');
    }
});

// Screenshot detection (limited browser support)
document.addEventListener('keyup', function(e) {
    if (testStarted) {
        // PrintScreen key
        if (e.key === 'PrintScreen') {
            logEvent('violation', 'Screenshot key pressed');
            showWarningBanner('⚠️ Screenshot detected and logged!');
        }
    }
});

// ==================== Screen Recording Functions ====================

function startScreenRecording() {
    if (!screenStream) {
        console.error('No screen stream available for recording');
        return;
    }
    
    try {
        // Combine screen and audio (if available)
        const options = {
            mimeType: 'video/webm;codecs=vp9',
            videoBitsPerSecond: 2500000 // 2.5 Mbps
        };
        
        // Try different codecs if vp9 not supported
        if (!MediaRecorder.isTypeSupported(options.mimeType)) {
            options.mimeType = 'video/webm;codecs=vp8';
            if (!MediaRecorder.isTypeSupported(options.mimeType)) {
                options.mimeType = 'video/webm';
            }
        }
        
        mediaRecorder = new MediaRecorder(screenStream, options);
        recordedChunks = [];
        recordingStartTime = Date.now();
        
        // Handle data available event
        mediaRecorder.ondataavailable = function(event) {
            if (event.data && event.data.size > 0) {
                recordedChunks.push(event.data);
                console.log('Recording chunk captured:', event.data.size, 'bytes');
            }
        };
        
        // Handle recording stop
        mediaRecorder.onstop = function() {
            console.log('Recording stopped, uploading...');
            uploadRecording();
        };
        
        // Handle errors
        mediaRecorder.onerror = function(event) {
            console.error('MediaRecorder error:', event.error);
            logEvent('suspicious_activity', 'Screen recording error: ' + event.error);
        };
        
        // Start recording (request data every 10 seconds for incremental upload)
        mediaRecorder.start(10000); // Timeslice of 10 seconds
        
        console.log('Screen recording started');
        logEvent('test_started', 'Screen recording initiated', {
            mimeType: options.mimeType,
            videoBitsPerSecond: options.videoBitsPerSecond
        });
        
        // Upload recording every 30 seconds (incremental uploads)
        setInterval(() => {
            if (mediaRecorder && mediaRecorder.state === 'recording' && recordedChunks.length > 0) {
                // Request data to trigger ondataavailable
                mediaRecorder.requestData();
                uploadRecordingChunks();
            }
        }, 30000); // Every 30 seconds
        
    } catch (error) {
        console.error('Failed to start screen recording:', error);
        logEvent('suspicious_activity', 'Screen recording failed to start: ' + error.message);
    }
}

function stopScreenRecording() {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        try {
            mediaRecorder.stop();
            console.log('Screen recording stopped');
        } catch (error) {
            console.error('Error stopping recording:', error);
        }
    }
}

function uploadRecordingChunks() {
    if (recordedChunks.length === 0) {
        console.log('No chunks to upload');
        return;
    }
    
    // Create a copy of chunks and clear the array for new chunks
    const chunksToUpload = [...recordedChunks];
    recordedChunks = [];
    
    const blob = new Blob(chunksToUpload, { type: 'video/webm' });
    const duration = (Date.now() - recordingStartTime) / 1000; // seconds
    
    console.log('Uploading recording chunk:', blob.size, 'bytes');
    
    const formData = new FormData();
    formData.append('attempt_id', ATTEMPT_ID);
    formData.append('recording', blob, `recording_${ATTEMPT_ID}_${Date.now()}.webm`);
    formData.append('duration', duration);
    formData.append('is_partial', 'true');
    
    fetch('/quiz/api/upload-recording/', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            console.log('Recording chunk uploaded successfully');
        } else {
            console.error('Failed to upload recording chunk:', data.error);
        }
    })
    .catch(error => {
        console.error('Error uploading recording chunk:', error);
    });
}

function uploadRecording() {
    if (recordedChunks.length === 0) {
        console.log('No recording to upload');
        return;
    }
    
    const blob = new Blob(recordedChunks, { type: 'video/webm' });
    const duration = (Date.now() - recordingStartTime) / 1000; // seconds
    
    console.log('Uploading final recording:', blob.size, 'bytes,', duration, 'seconds');
    
    const formData = new FormData();
    formData.append('attempt_id', ATTEMPT_ID);
    formData.append('recording', blob, `recording_${ATTEMPT_ID}_final.webm`);
    formData.append('duration', duration);
    formData.append('is_partial', 'false');
    
    fetch('/quiz/api/upload-recording/', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            console.log('Recording uploaded successfully');
            logEvent('test_completed', 'Screen recording uploaded');
        } else {
            console.error('Failed to upload recording:', data.error);
        }
    })
    .catch(error => {
        console.error('Error uploading recording:', error);
    });
}

// ==================== End Screen Recording Functions ====================

// Expose variables to window for access from quiz.js
window.cameraStream = cameraStream;
window.screenStream = screenStream;
window.isTestEnding = isTestEnding;
window.testStarted = testStarted;

// Update window variables when they change
function updateWindowVariables() {
    window.cameraStream = cameraStream;
    window.screenStream = screenStream;
    window.isTestEnding = isTestEnding;
    window.testStarted = testStarted;
    window.isDisqualified = isDisqualified;
}

// Also expose stopScreenRecording function
window.stopScreenRecording = stopScreenRecording;

// Cleanup on page unload
window.addEventListener('beforeunload', function() {
    isTestEnding = true; // Prevent false positives during page unload
    window.isTestEnding = true; // Also set on window object
    testStarted = false; // Stop all monitoring
    window.testStarted = false;
    updateWindowVariables();
    
    if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
    }
    if (screenStream) {
        screenStream.getTracks().forEach(track => track.stop());
    }
    if (faceDetectionInterval) {
        clearInterval(faceDetectionInterval);
    }
});


