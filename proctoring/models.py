from django.db import models
from quiz.models import TestAttempt


class ProctorLog(models.Model):
    """
    Proctoring log to track student activities during test
    """
    EVENT_TYPE_CHOICES = (
        ('test_started', 'Test Started'),
        ('camera_enabled', 'Camera Enabled'),
        ('screen_share_enabled', 'Screen Share Enabled'),
        ('tab_switched', 'Tab Switched'),
        ('window_blur', 'Window Lost Focus'),
        ('permission_denied', 'Permission Denied'),
        ('test_completed', 'Test Completed'),
        ('test_failed', 'Test Failed'),
        ('violation', 'Violation'),
        ('face_detection_started', 'Face Detection Started'),
        ('face_not_detected', 'No Face Detected'),
        ('multiple_faces', 'Multiple Faces Detected'),
        ('looking_away', 'Looking Away from Screen'),
        ('warning', 'Warning Issued'),
        ('suspicious_activity', 'Suspicious Activity'),
        ('phone_detected', 'Mobile Phone Usage Detected'),
        ('head_position_suspicious', 'Suspicious Head Position'),
        ('repeated_downward_glances', 'Repeated Downward Glances'),
        ('hands_out_of_frame', 'Hands Out of Camera Frame'),
        ('lighting_pattern_change', 'Suspicious Lighting Pattern Change'),
        ('phone_reflection_detected', 'Phone Screen Reflection Detected'),
    )
    
    attempt = models.ForeignKey(TestAttempt, on_delete=models.CASCADE, related_name='proctor_logs')
    event_type = models.CharField(max_length=30, choices=EVENT_TYPE_CHOICES)
    description = models.TextField()
    timestamp = models.DateTimeField(auto_now_add=True)
    metadata = models.JSONField(blank=True, null=True)
    
    def __str__(self):
        return f"{self.attempt.student_name} - {self.get_event_type_display()} at {self.timestamp}"
    
    class Meta:
        ordering = ['-timestamp']
        verbose_name = 'Proctoring Log'
        verbose_name_plural = 'Proctoring Logs'


class ScreenRecording(models.Model):
    """
    Store screen recording files and metadata
    """
    attempt = models.ForeignKey(TestAttempt, on_delete=models.CASCADE, related_name='recordings')
    recording_file = models.FileField(upload_to='recordings/%Y/%m/%d/', blank=True, null=True)
    duration = models.FloatField(default=0, help_text="Duration in seconds")
    file_size = models.BigIntegerField(default=0, help_text="File size in bytes")
    is_partial = models.BooleanField(default=False, help_text="Is this a partial recording chunk")
    uploaded_at = models.DateTimeField(auto_now_add=True, blank=True, null=True)
    
    def __str__(self):
        return f"Recording for {self.attempt.student_name} - {'Partial' if self.is_partial else 'Final'}"
    
    def get_file_size_mb(self):
        """Get file size in MB"""
        return round(self.file_size / (1024 * 1024), 2)
    
    def get_duration_formatted(self):
        """Get duration in MM:SS format"""
        minutes = int(self.duration // 60)
        seconds = int(self.duration % 60)
        return f"{minutes:02d}:{seconds:02d}"
    
    class Meta:
        ordering = ['-uploaded_at']
        verbose_name = 'Screen Recording'
        verbose_name_plural = 'Screen Recordings'
