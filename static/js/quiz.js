// Quiz functionality

let timeRemaining = DURATION_MINUTES * 60; // in seconds
let timerInterval = null;

function startTimer() {
    updateTimerDisplay();
    
    timerInterval = setInterval(() => {
        timeRemaining--;
        updateTimerDisplay();
        
        if (timeRemaining <= 0) {
            clearInterval(timerInterval);
            autoSubmitTest();
        }
    }, 1000);
}

function updateTimerDisplay() {
    const minutes = Math.floor(timeRemaining / 60);
    const seconds = timeRemaining % 60;
    const display = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    document.getElementById('timeRemaining').textContent = display;
    
    // Warning when time is running out
    if (timeRemaining <= 60) {
        document.getElementById('timer').style.color = '#dc3545';
    } else if (timeRemaining <= 300) {
        document.getElementById('timer').style.color = '#ffc107';
    }
}

// Auto-save answers
document.addEventListener('DOMContentLoaded', function() {
    // Handle radio button changes
    const radioInputs = document.querySelectorAll('input[type="radio"]');
    radioInputs.forEach(input => {
        input.addEventListener('change', function() {
            const questionId = this.getAttribute('data-question-id');
            const choiceId = this.getAttribute('data-choice-id');
            saveAnswer(questionId, choiceId, null);
        });
    });
    
    // Handle text area changes (with debounce)
    const textAreas = document.querySelectorAll('textarea.short-answer');
    textAreas.forEach(textarea => {
        let debounceTimer;
        textarea.addEventListener('input', function() {
            clearTimeout(debounceTimer);
            const questionId = this.getAttribute('data-question-id');
            const textAnswer = this.value;
            
            debounceTimer = setTimeout(() => {
                saveAnswer(questionId, null, textAnswer);
            }, 1000); // Save after 1 second of no typing
        });
    });
    
    // Handle test submission
    const submitBtn = document.getElementById('submitTestBtn');
    if (submitBtn) {
        submitBtn.addEventListener('click', function(e) {
            e.preventDefault();
            submitTest(); // Submit directly without confirmation
        });
    }
});

async function saveAnswer(questionId, choiceId, textAnswer) {
    try {
        const response = await fetch('/quiz/api/submit-answer/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                attempt_id: ATTEMPT_ID,
                question_id: questionId,
                choice_id: choiceId,
                text_answer: textAnswer
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            console.log('Answer saved:', questionId);
        } else {
            console.error('Failed to save answer:', data.error);
        }
    } catch (error) {
        console.error('Error saving answer:', error);
    }
}

async function submitTest() {
    try {
        // Disable submit button
        const submitBtn = document.getElementById('submitTestBtn');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Submitting...';
        
        // CRITICAL: Set flags BEFORE submitting to prevent false positives
        window.isTestEnding = true;
        window.testStarted = false;
        testStarted = false; // Stop all monitoring
        
        console.log('Stopping all security checks before test submission...');
        
        // Stop all security monitoring intervals and checks
        if (typeof window.sessionManager !== 'undefined' && typeof stopSessionTracking === 'function') {
            stopSessionTracking();
        }
        
        // Clear timer
        if (timerInterval) {
            clearInterval(timerInterval);
        }
        
        const response = await fetch('/quiz/api/submit-test/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                attempt_id: ATTEMPT_ID
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            console.log('Test submitted successfully, cleaning up...');
            
            // Stop screen recording if it exists
            if (typeof stopScreenRecording === 'function') {
                stopScreenRecording();
            }
            
            // Stop all streams gracefully (now safe - won't trigger false detection)
            if (window.cameraStream) {
                window.cameraStream.getTracks().forEach(track => track.stop());
            }
            if (window.screenStream) {
                window.screenStream.getTracks().forEach(track => track.stop());
            }
            
            // Small delay before redirect to ensure cleanup completes
            setTimeout(() => {
                window.location.href = `/quiz/result/${ATTEMPT_ID}/`;
            }, 100);
        } else {
            // Only show alert on error
            alert('Failed to submit test: ' + data.error);
            submitBtn.disabled = false;
            submitBtn.textContent = 'Submit Test';
            
            // Re-enable monitoring if submission failed
            window.isTestEnding = false;
            window.testStarted = true;
            testStarted = true;
        }
    } catch (error) {
        console.error('Error submitting test:', error);
        alert('An error occurred while submitting the test. Please try again.');
        const submitBtn = document.getElementById('submitTestBtn');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Submit Test';
        
        // Re-enable monitoring if submission failed
        window.isTestEnding = false;
        window.testStarted = true;
        testStarted = true;
    }
}

function autoSubmitTest() {
    // Auto-submit without alert
    submitTest();
}

// Warn before leaving page
window.addEventListener('beforeunload', function(e) {
    if (testStarted && timerInterval) {
        e.preventDefault();
        e.returnValue = 'Are you sure you want to leave? Your test progress may be lost.';
        return e.returnValue;
    }
});

