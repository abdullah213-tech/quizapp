from django.contrib import admin
from django.utils.html import format_html
from django.urls import reverse
from .models import ProctorLog, ScreenRecording


@admin.register(ProctorLog)
class ProctorLogAdmin(admin.ModelAdmin):
    list_display = ('student_name', 'quiz_title', 'event_type_colored', 'timestamp', 'description_short', 'view_student')
    list_filter = ('event_type', 'timestamp', 'attempt__invitation__quiz')
    search_fields = ('attempt__student_name', 'attempt__student_email', 'description')
    readonly_fields = ('attempt', 'event_type', 'description', 'timestamp', 'metadata_display')
    date_hierarchy = 'timestamp'
    
    fieldsets = (
        ('Log Information', {
            'fields': ('attempt', 'event_type', 'timestamp')
        }),
        ('Details', {
            'fields': ('description', 'metadata_display')
        }),
    )
    
    def student_name(self, obj):
        return obj.attempt.student_name
    student_name.short_description = 'Student'
    student_name.admin_order_field = 'attempt__student_name'
    
    def quiz_title(self, obj):
        return obj.attempt.invitation.quiz.title
    quiz_title.short_description = 'Quiz'
    quiz_title.admin_order_field = 'attempt__invitation__quiz__title'
    
    def event_type_colored(self, obj):
        """Display event type with color coding"""
        colors = {
            'violation': '#dc3545',  # Red
            'warning': '#ffc107',  # Yellow
            'test_started': '#28a745',  # Green
            'test_completed': '#28a745',  # Green
            'camera_enabled': '#17a2b8',  # Blue
            'screen_share_enabled': '#17a2b8',  # Blue
            'tab_switched': '#dc3545',  # Red
            'window_blur': '#ffc107',  # Yellow
            'face_not_detected': '#fd7e14',  # Orange
            'multiple_faces': '#dc3545',  # Red
            'suspicious_activity': '#ffc107',  # Yellow
            'phone_detected': '#dc3545',  # Red
            'head_position_suspicious': '#ffc107',  # Yellow
            'repeated_downward_glances': '#fd7e14',  # Orange
            'hands_out_of_frame': '#ffc107',  # Yellow
            'lighting_pattern_change': '#ffc107',  # Yellow
            'phone_reflection_detected': '#fd7e14',  # Orange
        }
        
        color = colors.get(obj.event_type, '#6c757d')
        icon = '🚨' if obj.event_type == 'violation' else '⚠️' if obj.event_type == 'warning' else '📝'
        
        return format_html(
            '<span style="color: {}; font-weight: bold;">{} {}</span>',
            color, icon, obj.get_event_type_display()
        )
    event_type_colored.short_description = 'Event Type'
    event_type_colored.admin_order_field = 'event_type'
    
    def description_short(self, obj):
        return obj.description[:100] + '...' if len(obj.description) > 100 else obj.description
    description_short.short_description = 'Description'
    
    def view_student(self, obj):
        url = reverse('admin:quiz_testattempt_change', args=[obj.attempt.id])
        return format_html('<a href="{}">View Student Details</a>', url)
    view_student.short_description = 'Student Details'
    
    def metadata_display(self, obj):
        """Display metadata in a formatted way"""
        if not obj.metadata:
            return "No metadata"
        
        import json
        metadata_str = json.dumps(obj.metadata, indent=2)
        return format_html('<pre style="background: #f5f5f5; padding: 10px; border-radius: 5px;">{}</pre>', metadata_str)
    metadata_display.short_description = 'Metadata'
    
    def has_add_permission(self, request):
        return False
    
    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(ScreenRecording)
class ScreenRecordingAdmin(admin.ModelAdmin):
    list_display = ('student_name', 'quiz_title', 'status_display', 'duration_formatted', 'file_size_display', 'is_partial', 'uploaded_at', 'download_link', 'view_student')
    list_filter = ('is_partial', 'uploaded_at', 'attempt__invitation__quiz', 'attempt__status')
    search_fields = ('attempt__student_name', 'attempt__student_email')
    readonly_fields = ('attempt', 'recording_file', 'duration', 'file_size', 'is_partial', 'uploaded_at', 
                      'download_link_large', 'video_preview', 'recording_info')
    date_hierarchy = 'uploaded_at'
    
    fieldsets = (
        ('Recording Information', {
            'fields': ('attempt', 'duration', 'file_size', 'is_partial', 'uploaded_at')
        }),
        ('Recording Details', {
            'fields': ('recording_info', 'download_link_large', 'video_preview')
        }),
    )
    
    def student_name(self, obj):
        return obj.attempt.student_name
    student_name.short_description = 'Student'
    student_name.admin_order_field = 'attempt__student_name'
    
    def quiz_title(self, obj):
        return obj.attempt.invitation.quiz.title
    quiz_title.short_description = 'Quiz'
    quiz_title.admin_order_field = 'attempt__invitation__quiz__title'
    
    def status_display(self, obj):
        """Display student test status"""
        status_colors = {
            'completed': '#28a745',
            'disqualified': '#dc3545',
            'in_progress': '#ffc107',
            'failed': '#dc3545',
        }
        color = status_colors.get(obj.attempt.status, '#6c757d')
        return format_html(
            '<span style="color: {}; font-weight: bold;">{}</span>',
            color, obj.attempt.get_status_display()
        )
    status_display.short_description = 'Test Status'
    
    def duration_formatted(self, obj):
        return obj.get_duration_formatted()
    duration_formatted.short_description = 'Duration'
    
    def file_size_display(self, obj):
        size_mb = obj.get_file_size_mb()
        color = '#28a745' if size_mb < 50 else '#ffc107' if size_mb < 100 else '#dc3545'
        return format_html(
            '<span style="color: {};">{} MB</span>',
            color, size_mb
        )
    file_size_display.short_description = 'File Size'
    
    def download_link(self, obj):
        if obj.recording_file:
            return format_html('<a href="{}" target="_blank" download>⬇️ Download</a>', obj.recording_file.url)
        return format_html('<span style="color: #dc3545;">❌ No file</span>')
    download_link.short_description = 'Download'
    
    def download_link_large(self, obj):
        """Large download button for detail view"""
        if obj.recording_file:
            return format_html(
                '<a href="{}" target="_blank" download style="'
                'display: inline-block; padding: 10px 20px; '
                'background-color: #007bff; color: white; '
                'text-decoration: none; border-radius: 5px; '
                'font-weight: bold;">'
                '⬇️ Download Recording ({} MB)</a>',
                obj.recording_file.url,
                obj.get_file_size_mb()
            )
        return format_html('<span style="color: #dc3545;">❌ No file available</span>')
    download_link_large.short_description = 'Download Recording'
    
    def video_preview(self, obj):
        """Embed video player if file exists"""
        if obj.recording_file:
            return format_html(
                '<video width="640" height="480" controls>'
                '<source src="{}" type="video/webm">'
                'Your browser does not support the video tag.'
                '</video>',
                obj.recording_file.url
            )
        return "No video available"
    video_preview.short_description = 'Video Preview'
    
    def recording_info(self, obj):
        """Display comprehensive recording information"""
        html = '<div style="background: #f8f9fa; padding: 15px; border-radius: 5px;">'
        html += '<h3 style="margin-top: 0;">📹 Recording Details</h3>'
        html += '<table style="width: 100%;">'
        html += f'<tr><td><strong>Student:</strong></td><td>{obj.attempt.student_name}</td></tr>'
        html += f'<tr><td><strong>Email:</strong></td><td>{obj.attempt.student_email}</td></tr>'
        html += f'<tr><td><strong>Quiz:</strong></td><td>{obj.attempt.invitation.quiz.title}</td></tr>'
        html += f'<tr><td><strong>Test Status:</strong></td><td>{obj.attempt.get_status_display()}</td></tr>'
        html += f'<tr><td><strong>Duration:</strong></td><td>{obj.get_duration_formatted()}</td></tr>'
        html += f'<tr><td><strong>File Size:</strong></td><td>{obj.get_file_size_mb()} MB</td></tr>'
        html += f'<tr><td><strong>Recording Type:</strong></td><td>{"Partial Chunk" if obj.is_partial else "Final Recording"}</td></tr>'
        html += f'<tr><td><strong>Uploaded:</strong></td><td>{obj.uploaded_at.strftime("%Y-%m-%d %H:%M:%S")}</td></tr>'
        html += '</table></div>'
        return format_html(html)
    recording_info.short_description = 'Recording Information'
    
    def view_student(self, obj):
        url = reverse('admin:quiz_testattempt_change', args=[obj.attempt.id])
        return format_html('<a href="{}">View Student Details</a>', url)
    view_student.short_description = 'Student Details'
    
    def has_add_permission(self, request):
        return False
