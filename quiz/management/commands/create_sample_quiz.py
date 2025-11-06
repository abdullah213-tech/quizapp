from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
from accounts.models import CustomUser
from quiz.models import Quiz, Question, Choice, TestInvitation


class Command(BaseCommand):
    help = 'Creates sample quiz data for testing'

    def handle(self, *args, **options):
        self.stdout.write('Creating sample quiz data...')
        
        # Get or create admin user
        admin_user, created = CustomUser.objects.get_or_create(
            username='admin',
            defaults={
                'email': 'admin@example.com',
                'user_type': 'admin',
                'is_staff': True,
                'is_superuser': True,
            }
        )
        if created:
            admin_user.set_password('admin123')
            admin_user.save()
            self.stdout.write(self.style.SUCCESS('✓ Created admin user (username: admin, password: admin123)'))
        else:
            self.stdout.write(self.style.WARNING('! Admin user already exists'))
        
        # Create a sample quiz
        quiz, created = Quiz.objects.get_or_create(
            title='Python Programming Fundamentals',
            defaults={
                'description': 'Test your knowledge of Python programming basics',
                'duration_minutes': 30,
                'passing_score': 70,
                'is_active': True,
                'created_by': admin_user,
            }
        )
        
        if created:
            self.stdout.write(self.style.SUCCESS('✓ Created sample quiz'))
            
            # Create sample questions
            q1 = Question.objects.create(
                quiz=quiz,
                question_text='What is the output of print(2 ** 3)?',
                question_type='multiple_choice',
                points=10,
                order=1
            )
            Choice.objects.create(question=q1, choice_text='6', is_correct=False)
            Choice.objects.create(question=q1, choice_text='8', is_correct=True)
            Choice.objects.create(question=q1, choice_text='9', is_correct=False)
            Choice.objects.create(question=q1, choice_text='23', is_correct=False)
            
            q2 = Question.objects.create(
                quiz=quiz,
                question_text='Which of the following is a mutable data type in Python?',
                question_type='multiple_choice',
                points=10,
                order=2
            )
            Choice.objects.create(question=q2, choice_text='Tuple', is_correct=False)
            Choice.objects.create(question=q2, choice_text='String', is_correct=False)
            Choice.objects.create(question=q2, choice_text='List', is_correct=True)
            Choice.objects.create(question=q2, choice_text='Integer', is_correct=False)
            
            q3 = Question.objects.create(
                quiz=quiz,
                question_text='Python is an interpreted language.',
                question_type='true_false',
                points=5,
                order=3
            )
            Choice.objects.create(question=q3, choice_text='True', is_correct=True)
            Choice.objects.create(question=q3, choice_text='False', is_correct=False)
            
            q4 = Question.objects.create(
                quiz=quiz,
                question_text='What keyword is used to define a function in Python?',
                question_type='multiple_choice',
                points=10,
                order=4
            )
            Choice.objects.create(question=q4, choice_text='function', is_correct=False)
            Choice.objects.create(question=q4, choice_text='def', is_correct=True)
            Choice.objects.create(question=q4, choice_text='func', is_correct=False)
            Choice.objects.create(question=q4, choice_text='define', is_correct=False)
            
            q5 = Question.objects.create(
                quiz=quiz,
                question_text='Explain the difference between a list and a tuple in Python.',
                question_type='short_answer',
                points=15,
                order=5
            )
            
            self.stdout.write(self.style.SUCCESS('✓ Created 5 sample questions'))
            
            # Create a sample test invitation
            invitation, created = TestInvitation.objects.get_or_create(
                quiz=quiz,
                student_email='student@example.com',
                defaults={
                    'student_name': 'John Doe',
                    'expires_at': timezone.now() + timedelta(days=7),
                }
            )
            
            if created:
                self.stdout.write(self.style.SUCCESS('✓ Created sample invitation'))
                self.stdout.write(
                    self.style.SUCCESS(
                        f'  Test link: http://localhost:8000/quiz/take/{invitation.invitation_token}/'
                    )
                )
            else:
                self.stdout.write(self.style.WARNING('! Sample invitation already exists'))
                self.stdout.write(
                    self.style.WARNING(
                        f'  Test link: http://localhost:8000/quiz/take/{invitation.invitation_token}/'
                    )
                )
        else:
            self.stdout.write(self.style.WARNING('! Sample quiz already exists'))
        
        self.stdout.write(self.style.SUCCESS('\n✅ Sample data creation complete!'))
        self.stdout.write('\nQuick Start:')
        self.stdout.write('1. Run: python manage.py runserver')
        self.stdout.write('2. Admin panel: http://localhost:8000/admin/')
        self.stdout.write('   Username: admin')
        self.stdout.write('   Password: admin123')
        self.stdout.write('3. Test the quiz with the sample invitation link above')

