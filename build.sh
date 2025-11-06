#!/usr/bin/env bash
# exit on error
set -o errexit

# Install Python dependencies
pip install --upgrade pip
pip install -r requirements.txt

# Collect static files
python manage.py collectstatic --no-input

# Run migrations
python manage.py migrate

# Create superuser if it doesn't exist (optional)
# Uncomment the following lines and set your admin credentials in Render environment variables
# if [ "$CREATE_SUPERUSER" = "True" ]; then
#   python manage.py shell -c "
# from django.contrib.auth import get_user_model;
# User = get_user_model();
# if not User.objects.filter(username='$DJANGO_SUPERUSER_USERNAME').exists():
#     User.objects.create_superuser('$DJANGO_SUPERUSER_USERNAME', '$DJANGO_SUPERUSER_EMAIL', '$DJANGO_SUPERUSER_PASSWORD')
# "
# fi

