from django.shortcuts import render, get_object_or_404, redirect
from django.http import JsonResponse, HttpResponseForbidden
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from django.utils import timezone
from django.db import transaction
from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.conf import settings
import json
import time
import sys
from io import StringIO
import subprocess
import tempfile
import os

from .models import TestInvitation, TestAttempt, Quiz, Question, Answer, Choice
from proctoring.models import ProctorLog


def home(request):
    """
    Home page view
    """
    return render(request, 'quiz/home.html')


def take_test(request, token):
    """
    Main view for students to take the test
    """
    invitation = get_object_or_404(TestInvitation, invitation_token=token)
    
    # Check if invitation is valid
    if invitation.is_used:
        return render(request, 'quiz/error.html', {
            'error': 'This invitation has already been used.',
            'message': 'Please contact the administrator if you believe this is an error.'
        })
    
    if invitation.is_expired():
        return render(request, 'quiz/error.html', {
            'error': 'This invitation has expired.',
            'message': 'Please contact the administrator for a new invitation.'
        })
    
    # Check if there's an existing attempt
    existing_attempt = TestAttempt.objects.filter(
        invitation=invitation,
        status='in_progress'
    ).first()
    
    if existing_attempt:
        attempt = existing_attempt
    else:
        # Create new attempt
        attempt = TestAttempt.objects.create(
            invitation=invitation,
            student_name=invitation.student_name,
            student_email=invitation.student_email,
            status='in_progress'
        )
        
        # Mark invitation as used
        invitation.is_used = True
        invitation.save()
        
        # Log test start
        ProctorLog.objects.create(
            attempt=attempt,
            event_type='test_started',
            description=f'Test started by {invitation.student_name}'
        )
    
    quiz = invitation.quiz
    questions = quiz.questions.all().prefetch_related('choices')
    
    context = {
        'attempt': attempt,
        'quiz': quiz,
        'questions': questions,
        'duration_minutes': quiz.duration_minutes,
        'student_name': invitation.student_name,
    }
    
    return render(request, 'quiz/take_test.html', context)


@csrf_exempt
@require_http_methods(["POST"])
def submit_answer(request):
    """
    API endpoint to submit an answer
    """
    try:
        data = json.loads(request.body)
        attempt_id = data.get('attempt_id')
        question_id = data.get('question_id')
        choice_id = data.get('choice_id')
        text_answer = data.get('text_answer', '')
        code_answer = data.get('code_answer', '')
        
        attempt = get_object_or_404(TestAttempt, id=attempt_id)
        
        if attempt.status != 'in_progress':
            return JsonResponse({
                'success': False,
                'error': 'Test is not in progress'
            }, status=400)
        
        question = get_object_or_404(Question, id=question_id)
        
        # Check if answer already exists
        answer, created = Answer.objects.get_or_create(
            attempt=attempt,
            question=question,
            defaults={
                'text_answer': text_answer,
                'code_answer': code_answer
            }
        )
        
        if not created:
            # Update existing answer
            answer.text_answer = text_answer
            answer.code_answer = code_answer
        
        # Handle choice-based questions
        if choice_id:
            choice = get_object_or_404(Choice, id=choice_id)
            answer.selected_choice = choice
            answer.is_correct = choice.is_correct
            answer.points_earned = question.points if choice.is_correct else 0
        
        answer.save()
        
        return JsonResponse({
            'success': True,
            'message': 'Answer saved successfully'
        })
        
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': str(e)
        }, status=500)


@csrf_exempt
@require_http_methods(["POST"])
def execute_code(request):
    """
    API endpoint to execute code and return output
    """
    try:
        data = json.loads(request.body)
        code = data.get('code', '')
        language = data.get('language', 'python')
        question_id = data.get('question_id')
        attempt_id = data.get('attempt_id')
        
        attempt = get_object_or_404(TestAttempt, id=attempt_id)
        
        if attempt.status != 'in_progress':
            return JsonResponse({
                'success': False,
                'error': 'Test is not in progress'
            }, status=400)
        
        # Execute code based on language
        if language == 'python':
            result = execute_python_code(code)
        elif language == 'javascript':
            result = execute_javascript_code(code)
        else:
            return JsonResponse({
                'success': False,
                'error': 'Unsupported language'
            }, status=400)
        
        # Save code execution attempt
        question = get_object_or_404(Question, id=question_id)
        answer, created = Answer.objects.get_or_create(
            attempt=attempt,
            question=question
        )
        answer.code_answer = code
        answer.code_output = result['output']
        answer.execution_time = result['execution_time']
        answer.save()
        
        # Log code execution
        ProctorLog.objects.create(
            attempt=attempt,
            event_type='suspicious_activity',
            description=f'Code executed: {language}',
            metadata={
                'language': language,
                'execution_time': result['execution_time'],
                'output_length': len(result['output'])
            }
        )
        
        return JsonResponse({
            'success': True,
            'output': result['output'],
            'execution_time': result['execution_time'],
            'error': result.get('error')
        })
        
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': str(e)
        }, status=500)


def execute_python_code(code):
    """
    Execute Python code in a restricted environment
    """
    start_time = time.time()
    output = StringIO()
    error = None
    old_stdout = sys.stdout
    
    try:
        # Try RestrictedPython first for safer execution
        try:
            from RestrictedPython import compile_restricted
            
            # Compile the code
            byte_code = compile_restricted(code, '<string>', 'exec')
            
            if byte_code.errors:
                error = "Syntax Error: " + "; ".join(byte_code.errors)
                output.write(error)
            else:
                # Create safe globals with limited built-ins
                safe_globs = {
                    '__builtins__': {
                        'print': print,
                        'len': len,
                        'range': range,
                        'str': str,
                        'int': int,
                        'float': float,
                        'bool': bool,
                        'list': list,
                        'dict': dict,
                        'set': set,
                        'tuple': tuple,
                        'sum': sum,
                        'max': max,
                        'min': min,
                        'abs': abs,
                        'round': round,
                        'sorted': sorted,
                        'reversed': reversed,
                        'enumerate': enumerate,
                        'zip': zip,
                        'map': map,
                        'filter': filter,
                        'any': any,
                        'all': all,
                        'isinstance': isinstance,
                        'type': type,
                    }
                }
                
                # Redirect stdout
                sys.stdout = output
                
                # Execute
                exec(byte_code.code, safe_globs)
                
        except ImportError:
            # RestrictedPython not available, use standard exec with caution
            sys.stdout = output
            exec(code, {'__builtins__': __builtins__})
        
    except SyntaxError as e:
        error = f"Syntax Error: {str(e)}"
        output.write(error)
    except Exception as e:
        error = f"Runtime Error: {str(e)}"
        output.write(error)
    finally:
        sys.stdout = old_stdout
    
    execution_time = time.time() - start_time
    output_str = output.getvalue()
    
    return {
        'output': output_str if output_str else '(No output)',
        'execution_time': execution_time,
        'error': error
    }


def execute_javascript_code(code):
    """
    Execute JavaScript code using Node.js or js2py fallback
    """
    start_time = time.time()
    output = ""
    error = None
    temp_file = None
    
    try:
        # Create temporary file for code
        with tempfile.NamedTemporaryFile(mode='w', suffix='.js', delete=False) as f:
            f.write(code)
            temp_file = f.name
        
        # Try executing with Node.js first
        try:
            result = subprocess.run(
                ['node', temp_file],
                capture_output=True,
                text=True,
                timeout=5  # 5 second timeout
            )
            output = result.stdout if result.stdout else ""
            if result.returncode != 0 and result.stderr:
                error = result.stderr
        except FileNotFoundError:
            # Node.js not installed, use js2py as fallback
            try:
                import js2py
                
                # Simpler approach: Collect outputs in a Python list
                output_lines = []
                
                # Create a Python function to capture logs
                def capture_log(*args):
                    line = ' '.join(str(arg) for arg in args)
                    output_lines.append(line)
                
                # Create context and inject console.log
                context = js2py.EvalJs()
                
                # Inject the logging function
                js_logger = js2py.eval_js('''
                    (function(pythonLogger) {
                        return {
                            log: function() {
                                var args = [];
                                for (var i = 0; i < arguments.length; i++) {
                                    var arg = arguments[i];
                                    if (typeof arg === 'object') {
                                        try {
                                            args.push(JSON.stringify(arg));
                                        } catch(e) {
                                            args.push(String(arg));
                                        }
                                    } else {
                                        args.push(String(arg));
                                    }
                                }
                                pythonLogger(args.join(' '));
                            }
                        };
                    })
                ''')
                
                context.console = js_logger(capture_log)
                
                # Execute the user's code
                context.execute(code)
                
                # Get the captured output
                output = '\n'.join(output_lines) if output_lines else ""
                error = None
                
            except Exception as e:
                error = f"JavaScript execution error: {str(e)}"
                output = ""
        except subprocess.TimeoutExpired:
            output = ""
            error = "Execution timeout (5 seconds)"
        
    except Exception as e:
        output = ""
        error = f"Error: {str(e)}"
    finally:
        # Clean up temp file
        if temp_file and os.path.exists(temp_file):
            try:
                os.remove(temp_file)
            except:
                pass
    
    execution_time = time.time() - start_time
    
    return {
        'output': output if output else "(No output)",
        'execution_time': execution_time,
        'error': error
    }


@csrf_exempt
@require_http_methods(["POST"])
def submit_test(request):
    """
    API endpoint to submit the entire test
    """
    try:
        data = json.loads(request.body)
        attempt_id = data.get('attempt_id')
        
        attempt = get_object_or_404(TestAttempt, id=attempt_id)
        
        if attempt.status != 'in_progress':
            return JsonResponse({
                'success': False,
                'error': 'Test is not in progress'
            }, status=400)
        
        with transaction.atomic():
            # Calculate total score
            answers = attempt.answers.all()
            total_score = sum(answer.points_earned for answer in answers)
            total_points = sum(q.points for q in attempt.invitation.quiz.questions.all())
            
            # Update attempt
            attempt.end_time = timezone.now()
            attempt.status = 'completed'
            attempt.score = total_score
            attempt.total_points = total_points
            
            # Check if passed
            score_percentage = attempt.calculate_score()
            attempt.is_passed = score_percentage >= attempt.invitation.quiz.passing_score
            attempt.save()
            
            # Log completion
            ProctorLog.objects.create(
                attempt=attempt,
                event_type='test_completed',
                description=f'Test completed with score: {score_percentage}%'
            )
        
        return JsonResponse({
            'success': True,
            'message': 'Test submitted successfully',
            'score': total_score,
            'total_points': total_points,
            'percentage': score_percentage,
            'passed': attempt.is_passed
        })
        
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': str(e)
        }, status=500)


@csrf_exempt
@require_http_methods(["POST"])
def log_proctor_event(request):
    """
    API endpoint to log proctoring events
    """
    try:
        data = json.loads(request.body)
        attempt_id = data.get('attempt_id')
        event_type = data.get('event_type')
        description = data.get('description', '')
        metadata = data.get('metadata', {})
        
        attempt = get_object_or_404(TestAttempt, id=attempt_id)
        
        # Create log entry
        ProctorLog.objects.create(
            attempt=attempt,
            event_type=event_type,
            description=description,
            metadata=metadata
        )
        
        # Handle violations (tab switch, window blur, face detection, etc.)
        if event_type in ['tab_switched', 'window_blur', 'violation', 'permission_denied']:
            # Auto-fail the test with detailed reason
            attempt.status = 'disqualified'
            attempt.end_time = timezone.now()
            
            # Use the description passed from JavaScript as the disqualification reason
            # This ensures the exact violation details are shown to the student
            attempt.disqualification_reason = description or f'{event_type.replace("_", " ").title()} - Test automatically failed'
            attempt.is_passed = False
            attempt.save()
            
            return JsonResponse({
                'success': True,
                'disqualified': True,
                'message': description or 'Test terminated due to violation'
            })
        
        return JsonResponse({
            'success': True,
            'message': 'Event logged successfully'
        })
        
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': str(e)
        }, status=500)


@csrf_exempt
@require_http_methods(["POST"])
def session_heartbeat(request):
    """
    API endpoint for session heartbeat to detect multiple instances
    """
    try:
        data = json.loads(request.body)
        attempt_id = data.get('attempt_id')
        session_id = data.get('session_id')
        browser_fingerprint = data.get('browser_fingerprint')
        window_active = data.get('window_active', True)
        
        attempt = get_object_or_404(TestAttempt, id=attempt_id)
        
        if attempt.status != 'in_progress':
            return JsonResponse({
                'success': False,
                'error': 'Test is not in progress',
                'terminate': True
            }, status=400)
        
        # Get or set session info from metadata
        current_session_data = request.session.get(f'test_session_{attempt_id}', {})
        
        # Check if this is the first heartbeat
        if not current_session_data:
            # Register this session
            request.session[f'test_session_{attempt_id}'] = {
                'session_id': session_id,
                'browser_fingerprint': browser_fingerprint,
                'start_time': timezone.now().isoformat()
            }
            
            ProctorLog.objects.create(
                attempt=attempt,
                event_type='test_started',
                description='Test session initialized',
                metadata={
                    'session_id': session_id,
                    'browser_fingerprint': browser_fingerprint
                }
            )
            
            return JsonResponse({
                'success': True,
                'message': 'Session registered',
                'valid_session': True
            })
        
        # Verify session matches
        stored_session_id = current_session_data.get('session_id')
        stored_fingerprint = current_session_data.get('browser_fingerprint')
        
        # Check for session mismatch (different browser/profile)
        if stored_session_id != session_id or stored_fingerprint != browser_fingerprint:
            # SECURITY VIOLATION: Multiple instances detected
            attempt.status = 'disqualified'
            attempt.end_time = timezone.now()
            attempt.disqualification_reason = 'SECURITY VIOLATION: Multiple browser instances or profile switching detected'
            attempt.is_passed = False
            attempt.save()
            
            ProctorLog.objects.create(
                attempt=attempt,
                event_type='violation',
                description='Multiple instances detected - Session mismatch',
                metadata={
                    'expected_session_id': stored_session_id,
                    'received_session_id': session_id,
                    'expected_fingerprint': stored_fingerprint,
                    'received_fingerprint': browser_fingerprint
                }
            )
            
            return JsonResponse({
                'success': False,
                'valid_session': False,
                'terminate': True,
                'message': 'Multiple browser instances detected - Test terminated'
            })
        
        # Check window activity
        if not window_active:
            ProctorLog.objects.create(
                attempt=attempt,
                event_type='suspicious_activity',
                description='Test window not active',
                metadata={'window_active': False}
            )
        
        return JsonResponse({
            'success': True,
            'valid_session': True,
            'message': 'Heartbeat received'
        })
        
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': str(e)
        }, status=500)


@csrf_exempt
@require_http_methods(["POST"])
def upload_recording(request):
    """
    API endpoint to upload screen recordings
    """
    try:
        attempt_id = request.POST.get('attempt_id')
        duration = request.POST.get('duration', 0)
        is_partial = request.POST.get('is_partial', 'false') == 'true'
        recording_file = request.FILES.get('recording')
        
        if not recording_file:
            return JsonResponse({
                'success': False,
                'error': 'No recording file provided'
            }, status=400)
        
        attempt = get_object_or_404(TestAttempt, id=attempt_id)
        
        # Import ScreenRecording model
        from proctoring.models import ScreenRecording
        
        # Create or update screen recording
        recording = ScreenRecording.objects.create(
            attempt=attempt,
            recording_file=recording_file,
            duration=float(duration),
            file_size=recording_file.size,
            is_partial=is_partial
        )
        
        # Log the upload
        ProctorLog.objects.create(
            attempt=attempt,
            event_type='test_completed',
            description=f'Screen recording uploaded: {"partial" if is_partial else "final"}',
            metadata={
                'file_size': recording_file.size,
                'duration': duration,
                'recording_id': recording.id
            }
        )
        
        return JsonResponse({
            'success': True,
            'message': 'Recording uploaded successfully',
            'recording_id': recording.id
        })
        
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': str(e)
        }, status=500)


def test_result(request, attempt_id):
    """
    View to display test results
    """
    attempt = get_object_or_404(TestAttempt, id=attempt_id)
    
    if attempt.status == 'in_progress':
        return HttpResponseForbidden('Test is still in progress')
    
    answers = attempt.answers.all().select_related('question', 'selected_choice')
    score_percentage = attempt.calculate_score()
    
    context = {
        'attempt': attempt,
        'answers': answers,
        'score_percentage': score_percentage,
        'quiz': attempt.invitation.quiz,
    }
    
    return render(request, 'quiz/test_result.html', context)


def send_result_email(attempt_id):
    """
    Send test results via email to student
    """
    try:
        attempt = TestAttempt.objects.get(id=attempt_id)
        score_percentage = attempt.calculate_score()
        
        # Prepare email context
        context = {
            'student_name': attempt.student_name,
            'quiz_title': attempt.invitation.quiz.title,
            'score': attempt.score,
            'total_points': attempt.total_points,
            'score_percentage': score_percentage,
            'is_passed': attempt.is_passed,
            'passing_score': attempt.invitation.quiz.passing_score,
            'status': attempt.status,
            'disqualification_reason': attempt.disqualification_reason,
            'test_date': attempt.end_time,
            'attempt_id': attempt.id,
        }
        
        # Render email template
        if attempt.status == 'disqualified':
            subject = f'Test Disqualified - {attempt.invitation.quiz.title}'
            message = f"""
Dear {attempt.student_name},

Your test for "{attempt.invitation.quiz.title}" has been reviewed.

STATUS: DISQUALIFIED

Reason: {attempt.disqualification_reason or 'Security violation detected'}

Test ID: #{attempt.id}
Date: {attempt.end_time.strftime('%B %d, %Y at %I:%M %p')}

All proctoring activities have been logged. If you believe this is an error, please contact your instructor immediately.

Best regards,
Quiz Proctoring System
            """
        else:
            subject = f'Test Results - {attempt.invitation.quiz.title}'
            status_text = "PASSED ✅" if attempt.is_passed else "NOT PASSED ❌"
            message = f"""
Dear {attempt.student_name},

Your test for "{attempt.invitation.quiz.title}" has been reviewed and graded.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
RESULTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Score: {attempt.score} / {attempt.total_points} points
Percentage: {score_percentage}%
Status: {status_text}
Passing Score Required: {attempt.invitation.quiz.passing_score}%

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Test ID: #{attempt.id}
Submitted: {attempt.end_time.strftime('%B %d, %Y at %I:%M %p')}

{'Congratulations! You have passed this test.' if attempt.is_passed else 'Unfortunately, you did not meet the passing criteria.'}

If you have any questions about your results, please contact your instructor.

Best regards,
Quiz Proctoring System
            """
        
        # Send email
        send_mail(
            subject=subject,
            message=message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[attempt.student_email],
            fail_silently=False,
        )
        
        # Log the email sent
        ProctorLog.objects.create(
            attempt=attempt,
            event_type='test_completed',
            description=f'Results email sent to {attempt.student_email}',
            metadata={
                'email': attempt.student_email,
                'score': attempt.score,
                'percentage': score_percentage
            }
        )
        
        return True
        
    except Exception as e:
        print(f'Error sending email: {e}')
        return False
