#!/bin/bash

# Exit immediately if a command exits with a non-zero status
set -e

echo "Starting Django application..."

# Wait for database to be ready (if using PostgreSQL)
if [ -n "$DB_HOST" ]; then
    echo "Waiting for database to be ready..."
    while ! nc -z $DB_HOST ${DB_PORT:-5432}; do
        sleep 0.1
    done
    echo "Database is ready!"
fi

# Run database migrations automatically
echo "Running database migrations..."
python manage.py makemigrations --noinput
python manage.py migrate --noinput

# Collect static files
echo "Collecting static files..."
python manage.py collectstatic --noinput --clear || true

# Create superuser (either from env vars or default root/root)
if [ -n "$DJANGO_SUPERUSER_USERNAME" ] && [ -n "$DJANGO_SUPERUSER_PASSWORD" ] && [ -n "$DJANGO_SUPERUSER_EMAIL" ]; then
    echo "Creating superuser from environment variables..."
    python manage.py shell << END
from django.contrib.auth import get_user_model
User = get_user_model()
if not User.objects.filter(username='$DJANGO_SUPERUSER_USERNAME').exists():
    User.objects.create_superuser('$DJANGO_SUPERUSER_USERNAME', '$DJANGO_SUPERUSER_EMAIL', '$DJANGO_SUPERUSER_PASSWORD')
    print('Superuser created successfully: $DJANGO_SUPERUSER_USERNAME')
else:
    print('Superuser already exists: $DJANGO_SUPERUSER_USERNAME')
END
else
    echo "Creating default superuser (root/root)..."
    python manage.py shell << END
from django.contrib.auth import get_user_model
User = get_user_model()
if not User.objects.filter(username='root').exists():
    User.objects.create_superuser('root', 'root@example.com', 'root')
    print('Default superuser created successfully: root/root')
else:
    print('Default superuser already exists: root')
END
fi

echo "Starting server..."

# If no command is passed, start gunicorn with PORT from environment
if [ $# -eq 0 ]; then
    exec gunicorn --bind 0.0.0.0:${PORT:-8000} --workers 3 --timeout 120 quizapp.wsgi:application
else
    # Otherwise, execute the passed command
    exec "$@"
fi

