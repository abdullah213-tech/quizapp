from django.contrib import admin
from django.urls import reverse
from django.utils.html import format_html
from django.shortcuts import redirect
from django.contrib import messages
from django.core.mail import send_mail
from django.conf import settings
from django.utils import timezone
from datetime import timedelta
from .models import Quiz, Question, Choice, TestInvitation, TestAttempt, Answer


class ChoiceInline(admin.TabularInline):
    model = Choice
    extra = 4
    max_num = 10


@admin.register(Question)
class QuestionAdmin(admin.ModelAdmin):
    list_display = ('question_text_short', 'quiz', 'question_type', 'points', 'order')
    list_filter = ('quiz', 'question_type')
    search_fields = ('question_text',)
    inlines = [ChoiceInline]
    
    def question_text_short(self, obj):
        return obj.question_text[:50] + '...' if len(obj.question_text) > 50 else obj.question_text
    question_text_short.short_description = 'Question'


@admin.register(Quiz)
class QuizAdmin(admin.ModelAdmin):
    list_display = ('title', 'duration_minutes', 'passing_score', 'is_active', 'created_at', 'question_count')
    list_filter = ('is_active', 'created_at')
    search_fields = ('title', 'description')
    readonly_fields = ('created_by', 'created_at', 'updated_at')
    
    def question_count(self, obj):
        return obj.questions.count()
    question_count.short_description = 'Questions'
    
    def save_model(self, request, obj, form, change):
        if not change:  # If creating a new object
            obj.created_by = request.user
        super().save_model(request, obj, form, change)


@admin.register(TestInvitation)
class TestInvitationAdmin(admin.ModelAdmin):
    list_display = ('student_name', 'student_email', 'quiz', 'is_used', 'expires_at', 'sent_at', 'invitation_link')
    list_filter = ('is_used', 'quiz', 'expires_at')
    search_fields = ('student_name', 'student_email')
    readonly_fields = ('invitation_token', 'sent_at')
    actions = ['send_invitation_emails', 'extend_expiry']
    
    def invitation_link(self, obj):
        url = f"http://localhost:8000/quiz/take/{obj.invitation_token}/"
        return format_html('<a href="{}" target="_blank">Test Link</a>', url)
    invitation_link.short_description = 'Link'
    
    def send_invitation_emails(self, request, queryset):
        sent_count = 0
        for invitation in queryset:
            if not invitation.is_used and not invitation.is_expired():
                try:
                    test_url = request.build_absolute_uri(
                        reverse('take_test', kwargs={'token': invitation.invitation_token})
                    )
                    
                    subject = f'Invitation to take {invitation.quiz.title}'
                    message = f"""
Dear {invitation.student_name},

You have been invited to take the quiz: {invitation.quiz.title}

Quiz Details:
- Duration: {invitation.quiz.duration_minutes} minutes
- Passing Score: {invitation.quiz.passing_score}%

Important Instructions:
1. You will need to enable your camera and share your screen
2. Do not switch tabs or windows during the test
3. Any violation will result in automatic disqualification

Click the link below to start your test:
{test_url}

This invitation expires on: {invitation.expires_at.strftime('%Y-%m-%d %H:%M:%S')}

Good luck!

Best regards,
Quiz Administration Team
                    """
                    
                    send_mail(
                        subject,
                        message,
                        settings.DEFAULT_FROM_EMAIL,
                        [invitation.student_email],
                        fail_silently=False,
                    )
                    sent_count += 1
                except Exception as e:
                    messages.error(request, f"Failed to send email to {invitation.student_email}: {str(e)}")
        
        if sent_count > 0:
            messages.success(request, f"Successfully sent {sent_count} invitation email(s)")
    
    send_invitation_emails.short_description = "Send invitation emails to selected students"
    
    def extend_expiry(self, request, queryset):
        updated = queryset.update(expires_at=timezone.now() + timedelta(days=7))
        messages.success(request, f"Extended expiry for {updated} invitation(s) by 7 days")
    
    extend_expiry.short_description = "Extend expiry by 7 days"


class AnswerInline(admin.TabularInline):
    model = Answer
    extra = 0
    readonly_fields = ('question', 'selected_choice', 'text_answer', 'is_correct', 'points_earned', 'answered_at')
    can_delete = False


@admin.register(TestAttempt)
class TestAttemptAdmin(admin.ModelAdmin):
    list_display = ('student_name', 'quiz_title', 'status', 'score_display', 'is_passed', 'start_time', 'end_time', 'view_details', 'view_logs', 'view_recordings', 'email_status')
    list_filter = ('status', 'is_passed', 'start_time')
    search_fields = ('student_name', 'student_email')
    readonly_fields = ('invitation', 'student_name', 'student_email', 'start_time', 'end_time', 
                      'score', 'total_points',
                      'logs_summary', 'recordings_summary', 'violations_summary')
    inlines = [AnswerInline]
    actions = ['send_results_email']
    list_editable = ('status', 'is_passed')  # Allow quick editing from list view
    
    fieldsets = (
        ('Student Information', {
            'fields': ('student_name', 'student_email', 'invitation')
        }),
        ('Test Status - Editable', {
            'fields': ('status', 'is_passed', 'disqualification_reason'),
            'description': 'You can change the status and pass/fail status here if needed.'
        }),
        ('Score Information - Read Only', {
            'fields': ('score', 'total_points')
        }),
        ('Timing', {
            'fields': ('start_time', 'end_time')
        }),
        ('Proctoring Summary', {
            'fields': ('violations_summary', 'logs_summary', 'recordings_summary'),
            'classes': ('collapse',)
        }),
    )
    
    def quiz_title(self, obj):
        return obj.invitation.quiz.title
    quiz_title.short_description = 'Quiz'
    
    def score_display(self, obj):
        if obj.score is not None and obj.total_points > 0:
            percentage = (obj.score / obj.total_points) * 100
            percentage_str = f'{percentage:.1f}'
            color = 'green' if obj.is_passed else 'red'
            return format_html(
                '<span style="color: {}; font-weight: bold;">{}/{} ({}%)</span>',
                color, obj.score, obj.total_points, percentage_str
            )
        return "Not graded"
    score_display.short_description = 'Score'
    
    def view_details(self, obj):
        url = reverse('admin:quiz_testattempt_change', args=[obj.id])
        return format_html('<a href="{}">📋 Full Details</a>', url)
    view_details.short_description = 'Details'
    
    def view_logs(self, obj):
        url = reverse('admin:proctoring_proctorlog_changelist') + f'?attempt__id__exact={obj.id}'
        log_count = obj.proctor_logs.count()
        return format_html('<a href="{}">📜 View Logs ({})</a>', url, log_count)
    view_logs.short_description = 'Proctoring Logs'
    
    def view_recordings(self, obj):
        from proctoring.models import ScreenRecording
        url = reverse('admin:proctoring_screenrecording_changelist') + f'?attempt__id__exact={obj.id}'
        recording_count = ScreenRecording.objects.filter(attempt=obj).count()
        return format_html('<a href="{}">🎥 Recordings ({})</a>', url, recording_count)
    view_recordings.short_description = 'Screen Recordings'
    
    def email_status(self, obj):
        from proctoring.models import ProctorLog
        email_sent = ProctorLog.objects.filter(
            attempt=obj,
            description__icontains='Results email sent'
        ).exists()
        
        if email_sent:
            return format_html('<span style="color: green;">✅ Sent</span>')
        else:
            return format_html('<span style="color: orange;">⏳ Not Sent</span>')
    email_status.short_description = 'Email Status'
    
    def violations_summary(self, obj):
        """Display a summary of all violations"""
        violations = obj.proctor_logs.filter(event_type='violation')
        
        if not violations.exists():
            return format_html('<span style="color: green;">✅ No violations detected</span>')
        
        html = '<div style="background: #fff3cd; padding: 10px; border-radius: 5px;">'
        html += f'<strong style="color: #856404;">⚠️ {violations.count()} Violation(s) Detected:</strong><ul>'
        
        for log in violations[:10]:  # Show first 10
            html += f'<li><strong>{log.timestamp.strftime("%Y-%m-%d %H:%M:%S")}</strong>: {log.description}</li>'
        
        if violations.count() > 10:
            html += f'<li><em>...and {violations.count() - 10} more</em></li>'
        
        html += '</ul></div>'
        return format_html(html)
    violations_summary.short_description = '⚠️ Violations Summary'
    
    def logs_summary(self, obj):
        """Display comprehensive log summary"""
        logs = obj.proctor_logs.all()
        
        if not logs.exists():
            return "No logs available"
        
        # Count by event type
        event_counts = {}
        for log in logs:
            event_type = log.get_event_type_display()
            event_counts[event_type] = event_counts.get(event_type, 0) + 1
        
        html = '<div style="background: #f8f9fa; padding: 10px; border-radius: 5px;">'
        html += f'<strong>Total Events: {logs.count()}</strong><br><br>'
        html += '<table style="width: 100%; border-collapse: collapse;">'
        html += '<tr style="background: #e9ecef;"><th style="padding: 5px; text-align: left;">Event Type</th><th style="padding: 5px; text-align: right;">Count</th></tr>'
        
        for event_type, count in sorted(event_counts.items()):
            html += f'<tr><td style="padding: 5px;">{event_type}</td><td style="padding: 5px; text-align: right;"><strong>{count}</strong></td></tr>'
        
        html += '</table></div>'
        return format_html(html)
    logs_summary.short_description = '📊 Logs Summary'
    
    def recordings_summary(self, obj):
        """Display screen recording summary"""
        from proctoring.models import ScreenRecording
        recordings = ScreenRecording.objects.filter(attempt=obj)
        
        if not recordings.exists():
            return format_html('<span style="color: orange;">⚠️ No recordings available</span>')
        
        total_duration = sum(r.duration for r in recordings)
        total_size = sum(r.file_size for r in recordings)
        total_size_mb = round(total_size / (1024 * 1024), 2)
        
        html = '<div style="background: #d1ecf1; padding: 10px; border-radius: 5px;">'
        html += f'<strong>📹 Screen Recording Summary</strong><br><br>'
        html += f'<strong>Total Recordings:</strong> {recordings.count()}<br>'
        html += f'<strong>Total Duration:</strong> {int(total_duration // 60)} min {int(total_duration % 60)} sec<br>'
        html += f'<strong>Total Size:</strong> {total_size_mb} MB<br><br>'
        
        html += '<strong>Recordings:</strong><ul>'
        for rec in recordings:
            html += f'<li>'
            html += f'{rec.get_duration_formatted()} - {rec.get_file_size_mb()} MB'
            if rec.recording_file:
                html += f' - <a href="{rec.recording_file.url}" target="_blank">Download</a>'
            html += '</li>'
        
        html += '</ul></div>'
        return format_html(html)
    recordings_summary.short_description = '🎥 Recordings Summary'
    
    def send_results_email(self, request, queryset):
        from .views import send_result_email
        
        success_count = 0
        fail_count = 0
        in_progress_count = 0
        
        for attempt in queryset:
            if attempt.status == 'in_progress':
                in_progress_count += 1
                continue
            
            try:
                if send_result_email(attempt.id):
                    success_count += 1
                else:
                        fail_count += 1
            except Exception as e:
                fail_count += 1
                messages.error(request, f'Error sending email to {attempt.student_name}: {str(e)}')
        
        # Show summary messages
        if in_progress_count > 0:
            messages.warning(
                request, 
                f'Skipped {in_progress_count} student(s) - test still in progress'
            )
        
        if success_count > 0:
            messages.success(
                request, 
                f'✅ Successfully sent results to {success_count} student(s)'
            )
        
        if fail_count > 0:
            messages.error(
                request, 
                f'❌ Failed to send results to {fail_count} student(s)'
            )
        
        if success_count == 0 and fail_count == 0 and in_progress_count == 0:
            messages.info(request, 'No students selected or no emails to send')
    
    send_results_email.short_description = '📧 Send Results Email to Selected Students'
    
    def has_add_permission(self, request):
        return False


@admin.register(Answer)
class AnswerAdmin(admin.ModelAdmin):
    list_display = ('student_name', 'question_text', 'is_correct', 'points_earned', 'answered_at')
    list_filter = ('is_correct', 'answered_at')
    search_fields = ('attempt__student_name', 'question__question_text')
    readonly_fields = ('attempt', 'question', 'selected_choice', 'text_answer', 
                      'is_correct', 'points_earned', 'answered_at')
    
    def student_name(self, obj):
        return obj.attempt.student_name
    student_name.short_description = 'Student'
    
    def question_text(self, obj):
        return obj.question.question_text[:50] + '...' if len(obj.question.question_text) > 50 else obj.question.question_text
    question_text.short_description = 'Question'
    
    def has_add_permission(self, request):
        return False
    
    def has_delete_permission(self, request, obj=None):
        return False
