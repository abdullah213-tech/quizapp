// Session Manager - Prevents multiple browser/profile instances
// This detects if a student opens the test in one browser profile for screen sharing
// but actually takes the test in another profile/browser

let sessionId = null;
let browserFingerprint = null;
let heartbeatInterval = null;
let localStorageCheckInterval = null;
let isMainTestInstance = false;

// Generate a unique session ID
function generateSessionId() {
    return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// Generate browser fingerprint to identify unique browser/profile
function generateBrowserFingerprint() {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    ctx.textBaseline = 'top';
    ctx.font = '14px Arial';
    ctx.fillText('Browser Fingerprint', 0, 0);
    const canvasData = canvas.toDataURL();
    
    const fingerprint = {
        userAgent: navigator.userAgent,
        language: navigator.language,
        platform: navigator.platform,
        hardwareConcurrency: navigator.hardwareConcurrency,
        deviceMemory: navigator.deviceMemory || 'unknown',
        screenResolution: `${screen.width}x${screen.height}x${screen.colorDepth}`,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        canvasFingerprint: hashCode(canvasData),
        webglVendor: getWebGLVendor(),
        timestamp: Date.now()
    };
    
    return hashCode(JSON.stringify(fingerprint));
}

// Get WebGL vendor for fingerprinting
function getWebGLVendor() {
    try {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        if (gl) {
            const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
            if (debugInfo) {
                return gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL);
            }
        }
        return 'unknown';
    } catch (e) {
        return 'unknown';
    }
}

// Simple hash function for fingerprinting
function hashCode(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
}

// Check if multiple instances are open using localStorage
function checkForMultipleInstances() {
    const storageKey = `test_instance_${ATTEMPT_ID}`;
    
    // Only check for multiple instances after test has started and not ending
    // This prevents false positives during initial page load and test submission
    if (!testStarted || window.isTestEnding) {
        return true;
    }
    
    try {
        // Try to claim this test instance
        const existingInstance = localStorage.getItem(storageKey);
        
        if (existingInstance) {
            try {
                const instanceData = JSON.parse(existingInstance);
                
                // Check if it's a different session (not our own)
                if (instanceData.sessionId !== sessionId) {
                    const timeDiff = Date.now() - instanceData.timestamp;
                    
                    // If another instance is active (updated within last 10 seconds)
                    if (timeDiff < 10000) {
                        // Another instance is active!
                        disqualifyStudent('SECURITY VIOLATION: Multiple browser windows/profiles detected - Another instance is actively running this test');
                        logEvent('violation', 
                            'Multiple instances detected via localStorage. ' +
                            `Current session: ${sessionId}, Other session: ${instanceData.sessionId}`);
                        return false;
                    }
                }
            } catch (parseError) {
                console.error('Failed to parse localStorage data:', parseError);
                // Clear corrupted data
                localStorage.removeItem(storageKey);
            }
        }
        
        // Claim or update this instance
        localStorage.setItem(storageKey, JSON.stringify({
            sessionId: sessionId,
            timestamp: Date.now(),
            fingerprint: browserFingerprint
        }));
        
        isMainTestInstance = true;
        return true;
        
    } catch (e) {
        console.error('localStorage check failed:', e);
        // If localStorage is disabled, log it but don't fail the test
        logEvent('suspicious_activity', 'localStorage not available - privacy mode?');
        return true; // Continue but log suspicious activity
    }
}

// Initialize session tracking
function initializeSessionTracking() {
    sessionId = generateSessionId();
    browserFingerprint = generateBrowserFingerprint();
    
    console.log('Session ID:', sessionId);
    console.log('Browser Fingerprint:', browserFingerprint);
    
    // Clear any old localStorage entries from previous attempts
    const storageKey = `test_instance_${ATTEMPT_ID}`;
    try {
        const existingInstance = localStorage.getItem(storageKey);
        if (existingInstance) {
            const instanceData = JSON.parse(existingInstance);
            const timeDiff = Date.now() - instanceData.timestamp;
            
            // If entry is older than 30 seconds, it's from a previous attempt - clear it
            if (timeDiff > 30000) {
                console.log('Clearing old localStorage entry from previous attempt');
                localStorage.removeItem(storageKey);
            }
        }
    } catch (e) {
        console.error('Error clearing old localStorage:', e);
    }
    
    // Set initial localStorage entry (before test starts)
    localStorage.setItem(storageKey, JSON.stringify({
        sessionId: sessionId,
        timestamp: Date.now(),
        fingerprint: browserFingerprint
    }));
    
    // Start heartbeat (every 5 seconds)
    heartbeatInterval = setInterval(sendHeartbeat, 5000);
    
    // Check for multiple instances every 3 seconds (only after test starts)
    localStorageCheckInterval = setInterval(checkForMultipleInstances, 3000);
    
    // Send initial heartbeat
    sendHeartbeat();
    
    // Monitor storage events (detect if another tab opens)
    window.addEventListener('storage', handleStorageChange);
    
    // Track window visibility and focus
    document.addEventListener('visibilitychange', handleVisibilityForHeartbeat);
    window.addEventListener('focus', handleWindowFocusForHeartbeat);
    window.addEventListener('blur', handleWindowBlurForHeartbeat);
    
    return true;
}

// Handle storage change events (another tab trying to access test)
function handleStorageChange(e) {
    // Only check storage changes after test has started and not ending
    if (!testStarted || window.isTestEnding) {
        return;
    }
    
    if (e.key === `test_instance_${ATTEMPT_ID}`) {
        try {
            const newData = JSON.parse(e.newValue);
            
            // If another session is trying to claim this test
            if (newData.sessionId !== sessionId) {
                disqualifyStudent(
                    'SECURITY VIOLATION: Test opened in another browser window/profile. ' +
                    'You must use only ONE browser instance.'
                );
                logEvent('violation', 
                    'Storage event detected - another browser instance attempting access');
            }
        } catch (err) {
            console.error('Storage change error:', err);
        }
    }
}

// Send heartbeat to server
async function sendHeartbeat() {
    // Don't send heartbeat if test hasn't started or is ending
    if (!testStarted || (window.isTestEnding)) return;
    
    try {
        const response = await fetch('/quiz/api/session-heartbeat/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                attempt_id: ATTEMPT_ID,
                session_id: sessionId,
                browser_fingerprint: browserFingerprint,
                window_active: !document.hidden && document.hasFocus()
            })
        });
        
        const data = await response.json();
        
        if (data.terminate || !data.valid_session) {
            // Only disqualify if test is not ending legitimately
            if (!window.isTestEnding) {
            // Server detected violation
            clearInterval(heartbeatInterval);
            clearInterval(localStorageCheckInterval);
            
            disqualifyStudent(
                data.message || 
                'SECURITY VIOLATION: Multiple browser instances detected'
            );
            }
        }
        
        if (!data.success) {
            console.error('Heartbeat failed:', data);
        }
        
    } catch (error) {
        console.error('Heartbeat error:', error);
        // Only log if test is still active
        if (!window.isTestEnding) {
        logEvent('suspicious_activity', 'Heartbeat failed: ' + error.message);
        }
    }
}

// Window visibility tracking for heartbeat
function handleVisibilityForHeartbeat() {
    if (testStarted && !window.isTestEnding && document.hidden) {
        logEvent('suspicious_activity', 'Test window hidden');
    }
}

function handleWindowFocusForHeartbeat() {
    if (testStarted && !window.isTestEnding) {
        logEvent('test_started', 'Window regained focus');
    }
}

function handleWindowBlurForHeartbeat() {
    if (testStarted && !window.isTestEnding) {
        logEvent('suspicious_activity', 'Window lost focus');
    }
}

// Stop session tracking
function stopSessionTracking() {
    if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
    }
    if (localStorageCheckInterval) {
        clearInterval(localStorageCheckInterval);
    }
    
    // Clear localStorage
    try {
        localStorage.removeItem(`test_instance_${ATTEMPT_ID}`);
    } catch (e) {
        console.error('Failed to clear localStorage:', e);
    }
    
    // Remove event listeners
    window.removeEventListener('storage', handleStorageChange);
    document.removeEventListener('visibilitychange', handleVisibilityForHeartbeat);
    window.removeEventListener('focus', handleWindowFocusForHeartbeat);
    window.removeEventListener('blur', handleWindowBlurForHeartbeat);
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    // Initialize session tracking before test starts
    initializeSessionTracking();
    
    console.log('Session tracking initialized');
    
    // Log browser fingerprint
    logEvent('test_started', 'Browser fingerprint generated', {
        fingerprint: browserFingerprint,
        session_id: sessionId
    });
});

// Cleanup on page unload
window.addEventListener('beforeunload', function() {
    stopSessionTracking();
});

// Detect if user tries to open in another window using BroadcastChannel API
if ('BroadcastChannel' in window) {
    const testChannel = new BroadcastChannel(`test_channel_${ATTEMPT_ID}`);
    
    // Listen for other instances
    testChannel.addEventListener('message', (event) => {
        // Only check for multiple instances after test has started and not ending
        if (!testStarted || window.isTestEnding) {
            return;
        }
        
        if (event.data.sessionId && event.data.sessionId !== sessionId) {
            // Another instance detected!
            disqualifyStudent(
                'SECURITY VIOLATION: Test opened in multiple browser windows. ' +
                'Only ONE window is allowed.'
            );
            logEvent('violation', 
                'BroadcastChannel detected another browser instance');
        }
    });
    
    // Send periodic "I'm here" messages after test starts
    setInterval(() => {
        if (testStarted && !window.isTestEnding) {
            testChannel.postMessage({
                type: 'instance_check',
                sessionId: sessionId,
                timestamp: Date.now()
            });
        }
    }, 5000); // Every 5 seconds
}

// Export for use in proctoring.js and quiz.js
window.sessionManager = {
    getSessionId: () => sessionId,
    getBrowserFingerprint: () => browserFingerprint,
    isMainInstance: () => isMainTestInstance
};

// Expose stopSessionTracking globally for test submission
window.stopSessionTracking = stopSessionTracking;

