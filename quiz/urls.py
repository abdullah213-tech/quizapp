from django.urls import path
from . import views

urlpatterns = [
    path('', views.home, name='home'),
    path('take/<uuid:token>/', views.take_test, name='take_test'),
    path('api/submit-answer/', views.submit_answer, name='submit_answer'),
    path('api/execute-code/', views.execute_code, name='execute_code'),
    path('api/submit-test/', views.submit_test, name='submit_test'),
    path('api/log-event/', views.log_proctor_event, name='log_proctor_event'),
    path('api/session-heartbeat/', views.session_heartbeat, name='session_heartbeat'),
    path('api/upload-recording/', views.upload_recording, name='upload_recording'),
    path('result/<int:attempt_id>/', views.test_result, name='test_result'),
]

