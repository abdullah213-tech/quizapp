# Quiz Application with Proctoring

A Django-based quiz application with advanced proctoring features including screen sharing, camera monitoring, and tab change detection.

## Features

### Admin Features
- Add, edit, and delete quiz questions
- Invite students via email
- View test results and proctoring logs
- Monitor student activities during tests

### Student Features
- Take quizzes via unique invitation links
- Automatic camera and screen sharing activation
- Real-time monitoring
- Auto-fail on tab switching

### Proctoring Features
- Camera monitoring (WebRTC)
- Screen sharing requirement
- Tab change detection
- Activity logging
- Automatic test termination on violations

## Installation

### 🐳 Quick Start with Docker (Recommended)

The easiest way to run the application with automatic database migrations:

```bash
# Option 1: Using the setup script
./setup-docker.sh

# Option 2: Using Makefile
make dev

# Option 3: Using Docker Compose directly
cp env.example .env.docker
docker-compose up --build
```

**That's it!** 🎉 The application will automatically:
- ✅ Run all database migrations
- ✅ Collect static files
- ✅ Create a superuser (admin/admin123)
- ✅ Start the server at http://localhost:8000

**Key Feature**: New migrations are automatically detected and applied on every container restart!

📚 See [`DOCKER_QUICKSTART.md`](DOCKER_QUICKSTART.md) for details or [`DOCKER_GUIDE.md`](DOCKER_GUIDE.md) for comprehensive documentation.

---

### 💻 Manual Installation (Without Docker)

1. Create a virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Create a `.env` file in the project root:
```
DEBUG=True
SECRET_KEY=your-secret-key-here
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=your-email@gmail.com
EMAIL_HOST_PASSWORD=your-email-password
DEFAULT_FROM_EMAIL=your-email@gmail.com
```

4. Run migrations:
```bash
python manage.py makemigrations
python manage.py migrate
```

5. Create a superuser:
```bash
python manage.py createsuperuser
```

6. Run the development server:
```bash
python manage.py runserver
```

7. Access the application:
- Admin panel: http://localhost:8000/admin/
- Student test: Access via invitation link sent by email

## Usage

### For Admins
1. Log in to the admin panel
2. Create quizzes and add questions
3. Invite students by entering their email addresses
4. Monitor test attempts and view proctoring logs

### For Students
1. Receive invitation email with unique test link
2. Click the link to start the test
3. Allow camera and screen sharing permissions
4. Complete the test without switching tabs

## Security Notes

- Each invitation link is unique and can only be used once
- Screen sharing and camera are mandatory
- Tab switching automatically fails the test
- All activities are logged for review

## Technology Stack

- Backend: Django 4.2
- Frontend: HTML, CSS, JavaScript
- Real-time monitoring: WebRTC API
- Email: Django Email Backend
- Containerization: Docker & Docker Compose
- Production Server: Gunicorn
- Database: SQLite (dev) / PostgreSQL (production)

## 🐳 Docker Features

- **Automatic Migrations**: New migrations are detected and applied automatically on container start
- **Environment Flexibility**: Supports both SQLite (development) and PostgreSQL (production)
- **Easy Setup**: One command to get started
- **Production Ready**: Includes Gunicorn, PostgreSQL, persistent volumes
- **Development Mode**: Auto-reload on code changes
- **Comprehensive Documentation**: See DOCKER_QUICKSTART.md and DOCKER_GUIDE.md

## 📝 Documentation

- [`DOCKER_QUICKSTART.md`](DOCKER_QUICKSTART.md) - Get started with Docker in 3 steps
- [`DOCKER_GUIDE.md`](DOCKER_GUIDE.md) - Comprehensive Docker documentation
- [`DOCKER_IMPLEMENTATION.md`](DOCKER_IMPLEMENTATION.md) - Implementation details
- [`ADMIN_GUIDE.md`](ADMIN_GUIDE.md) - Admin panel guide
- [`ADMIN_VISUAL_GUIDE.md`](ADMIN_VISUAL_GUIDE.md) - Visual admin guide
- [`SECURITY_FEATURES.md`](SECURITY_FEATURES.md) - Security features documentation

