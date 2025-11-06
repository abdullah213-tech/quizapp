// Code Editor and Execution functionality

document.addEventListener('DOMContentLoaded', function() {
    // Handle code editor auto-save
    const codeEditors = document.querySelectorAll('.code-editor');
    codeEditors.forEach(editor => {
        let debounceTimer;
        editor.addEventListener('input', function() {
            clearTimeout(debounceTimer);
            const questionId = this.getAttribute('data-question-id');
            const code = this.value;
            
            debounceTimer = setTimeout(() => {
                saveCodeAnswer(questionId, code);
            }, 2000); // Save after 2 seconds of no typing
        });
    });
    
    // Handle run code buttons
    const runButtons = document.querySelectorAll('.btn-run-code');
    runButtons.forEach(button => {
        button.addEventListener('click', function() {
            const questionId = this.getAttribute('data-question-id');
            const language = this.getAttribute('data-language');
            runCode(questionId, language, this);
        });
    });
});

async function saveCodeAnswer(questionId, code) {
    try {
        const response = await fetch('/quiz/api/submit-answer/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                attempt_id: ATTEMPT_ID,
                question_id: questionId,
                code_answer: code
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            console.log('Code saved for question:', questionId);
        }
    } catch (error) {
        console.error('Error saving code:', error);
    }
}

async function runCode(questionId, language, button) {
    // Get code from editor
    const editor = document.querySelector(`textarea[data-question-id="${questionId}"]`);
    const code = editor.value;
    
    if (!code.trim()) {
        alert('Please write some code first!');
        return;
    }
    
    // Disable button and show loading
    button.disabled = true;
    button.textContent = '⏳ Running...';
    
    // Get output elements
    const outputContent = document.getElementById(`output_content_${questionId}`);
    const execTime = document.getElementById(`exec_time_${questionId}`);
    
    // Clear previous output
    outputContent.textContent = 'Executing code...';
    outputContent.className = 'output-content';
    execTime.style.display = 'none';
    
    try {
        const response = await fetch('/quiz/api/execute-code/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                attempt_id: ATTEMPT_ID,
                question_id: questionId,
                code: code,
                language: language
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            // Show output
            if (data.error) {
                outputContent.textContent = data.output || data.error;
                outputContent.className = 'output-content error';
            } else {
                outputContent.textContent = data.output || '(No output)';
                outputContent.className = 'output-content success';
            }
            
            // Show execution time
            execTime.style.display = 'block';
            execTime.querySelector('span').textContent = `${(data.execution_time * 1000).toFixed(2)}ms`;
            
            // Log the execution
            if (testStarted) {
                logEvent('suspicious_activity', `Code executed: ${language}`, {
                    question_id: questionId,
                    execution_time: data.execution_time,
                    output_length: data.output ? data.output.length : 0
                });
            }
        } else {
            outputContent.textContent = `Error: ${data.error}`;
            outputContent.className = 'output-content error';
        }
    } catch (error) {
        outputContent.textContent = `Error: ${error.message}`;
        outputContent.className = 'output-content error';
    } finally {
        // Re-enable button
        button.disabled = false;
        button.textContent = '▶️ Run Code';
    }
}

// Enhanced copy detection for code editor
document.addEventListener('copy', function(e) {
    if (testStarted) {
        const target = e.target;
        if (target.classList.contains('code-editor')) {
            // Allow copying in code editor but log it
            const selection = window.getSelection().toString();
            if (selection.length > 20) {
                logEvent('suspicious_activity', 'Large code copy detected', {
                    length: selection.length,
                    snippet: selection.substring(0, 50) + '...'
                });
                showWarningBanner('⚠️ Code copying is being monitored!');
            }
        }
    }
});

// Detect external paste attempts into code editor
document.addEventListener('paste', function(e) {
    if (testStarted) {
        const target = e.target;
        if (target.classList.contains('code-editor')) {
            const pastedText = (e.clipboardData || window.clipboardData).getData('text');
            if (pastedText.length > 50) {
                logEvent('suspicious_activity', 'Large code paste detected', {
                    length: pastedText.length,
                    snippet: pastedText.substring(0, 50) + '...'
                });
                showWarningBanner('⚠️ Code pasting is being monitored!');
            }
        }
    }
});

// Track time spent on each coding question
const questionTimeTracking = {};

function trackQuestionTime() {
    if (!testStarted) return;
    
    const questions = document.querySelectorAll('.question-card');
    questions.forEach(q => {
        const rect = q.getBoundingClientRect();
        if (rect.top >= 0 && rect.bottom <= window.innerHeight) {
            const questionId = q.getAttribute('data-question-id');
            if (!questionTimeTracking[questionId]) {
                questionTimeTracking[questionId] = 0;
            }
            questionTimeTracking[questionId]++;
        }
    });
}

// Track every 5 seconds
setInterval(trackQuestionTime, 5000);

// Detect rapid code execution (potential cheating)
const codeExecutionTracker = {};

function trackCodeExecution(questionId) {
    const now = Date.now();
    if (!codeExecutionTracker[questionId]) {
        codeExecutionTracker[questionId] = [];
    }
    
    codeExecutionTracker[questionId].push(now);
    
    // Check for rapid executions (more than 10 in 1 minute)
    const oneMinuteAgo = now - 60000;
    const recentExecutions = codeExecutionTracker[questionId].filter(t => t > oneMinuteAgo);
    
    if (recentExecutions.length > 10) {
        logEvent('suspicious_activity', 'Excessive code execution attempts', {
            question_id: questionId,
            count: recentExecutions.length,
            period: '1 minute'
        });
    }
}

