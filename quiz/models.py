from django.db import models
from django.conf import settings
from django.utils import timezone
import uuid


class Quiz(models.Model):
    """
    Quiz model representing a test/exam
    """
    title = models.CharField(max_length=255)
    description = models.TextField()
    duration_minutes = models.IntegerField(help_text="Duration in minutes")
    passing_score = models.IntegerField(default=60, help_text="Passing score percentage")
    is_active = models.BooleanField(default=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.CASCADE, 
        related_name='created_quizzes'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return self.title
    
    class Meta:
        verbose_name = 'Quiz'
        verbose_name_plural = 'Quizzes'
        ordering = ['-created_at']


class Question(models.Model):
    """
    Question model for quiz questions
    """
    QUESTION_TYPE_CHOICES = (
        ('multiple_choice', 'Multiple Choice'),
        ('true_false', 'True/False'),
        ('short_answer', 'Short Answer'),
        ('coding_js', 'Coding - JavaScript'),
        ('coding_python', 'Coding - Python'),
    )
    
    quiz = models.ForeignKey(Quiz, on_delete=models.CASCADE, related_name='questions')
    question_text = models.TextField()
    question_type = models.CharField(max_length=20, choices=QUESTION_TYPE_CHOICES, default='multiple_choice')
    points = models.IntegerField(default=1)
    order = models.IntegerField(default=0)
    
    # Coding question fields
    starter_code = models.TextField(blank=True, null=True, help_text="Starting code for students")
    expected_output = models.TextField(blank=True, null=True, help_text="Expected output for auto-grading")
    test_cases = models.JSONField(blank=True, null=True, help_text="Test cases for code validation")
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"{self.quiz.title} - Q{self.order}: {self.question_text[:50]}"
    
    class Meta:
        ordering = ['order', 'created_at']


class Choice(models.Model):
    """
    Choice model for multiple choice questions
    """
    question = models.ForeignKey(Question, on_delete=models.CASCADE, related_name='choices')
    choice_text = models.CharField(max_length=255)
    is_correct = models.BooleanField(default=False)
    
    def __str__(self):
        return f"{self.choice_text} ({'Correct' if self.is_correct else 'Incorrect'})"


class TestInvitation(models.Model):
    """
    Invitation model for sending test invites to students
    """
    quiz = models.ForeignKey(Quiz, on_delete=models.CASCADE, related_name='invitations')
    student_email = models.EmailField()
    student_name = models.CharField(max_length=255)
    invitation_token = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    is_used = models.BooleanField(default=False)
    expires_at = models.DateTimeField()
    sent_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"Invitation for {self.student_name} - {self.quiz.title}"
    
    def is_expired(self):
        return timezone.now() > self.expires_at
    
    class Meta:
        unique_together = ['quiz', 'student_email']


class TestAttempt(models.Model):
    """
    TestAttempt model to track student test attempts
    """
    STATUS_CHOICES = (
        ('in_progress', 'In Progress'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
        ('disqualified', 'Disqualified'),
    )
    
    invitation = models.ForeignKey(TestInvitation, on_delete=models.CASCADE, related_name='attempts')
    student_name = models.CharField(max_length=255)
    student_email = models.EmailField()
    start_time = models.DateTimeField(auto_now_add=True)
    end_time = models.DateTimeField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='in_progress')
    score = models.IntegerField(null=True, blank=True)
    total_points = models.IntegerField(default=0)
    is_passed = models.BooleanField(default=False)
    disqualification_reason = models.TextField(blank=True, null=True)
    
    def __str__(self):
        return f"{self.student_name} - {self.invitation.quiz.title}"
    
    def calculate_score(self):
        """Calculate the score percentage"""
        if self.total_points > 0:
            return int((self.score / self.total_points) * 100)
        return 0
    
    class Meta:
        ordering = ['-start_time']


class Answer(models.Model):
    """
    Answer model to store student answers
    """
    attempt = models.ForeignKey(TestAttempt, on_delete=models.CASCADE, related_name='answers')
    question = models.ForeignKey(Question, on_delete=models.CASCADE)
    selected_choice = models.ForeignKey(Choice, on_delete=models.CASCADE, null=True, blank=True)
    text_answer = models.TextField(blank=True, null=True)
    code_answer = models.TextField(blank=True, null=True, help_text="Student's code submission")
    code_output = models.TextField(blank=True, null=True, help_text="Code execution output")
    execution_time = models.FloatField(blank=True, null=True, help_text="Code execution time in seconds")
    is_correct = models.BooleanField(default=False)
    points_earned = models.IntegerField(default=0)
    answered_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"{self.attempt.student_name} - {self.question.question_text[:30]}"
    
    class Meta:
        unique_together = ['attempt', 'question']
