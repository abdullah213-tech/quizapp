.PHONY: help build up down restart logs shell migrate makemigrations createsuperuser test clean dev prod

# Default target
help:
	@echo "Available commands:"
	@echo "  make build          - Build Docker images"
	@echo "  make up            - Start containers (production with PostgreSQL)"
	@echo "  make dev           - Start development server (SQLite, auto-reload)"
	@echo "  make down          - Stop and remove containers"
	@echo "  make restart       - Restart containers"
	@echo "  make logs          - View container logs"
	@echo "  make shell         - Access Django shell"
	@echo "  make bash          - Access container bash"
	@echo "  make migrate       - Run migrations"
	@echo "  make makemigrations - Create new migrations"
	@echo "  make createsuperuser - Create Django superuser"
	@echo "  make collectstatic - Collect static files"
	@echo "  make test          - Run tests"
	@echo "  make clean         - Remove containers and volumes (⚠️  deletes data!)"
	@echo "  make db-backup     - Backup PostgreSQL database"
	@echo "  make db-restore    - Restore PostgreSQL database"

# Build Docker images
build:
	docker-compose build

# Start production containers (PostgreSQL)
up:
	docker-compose up -d
	@echo "Application running at http://localhost:8000"

# Start production containers with logs
up-logs:
	docker-compose up
	
# Start development server (SQLite, auto-reload)
dev:
	docker-compose -f docker-compose.dev.yml up
	@echo "Development server running at http://localhost:8000"

# Start production environment
prod:
	docker-compose up -d
	@echo "Production environment running at http://localhost:8000"

# Stop containers
down:
	docker-compose down

# Restart containers
restart:
	docker-compose restart

# View logs
logs:
	docker-compose logs -f

# Access Django shell
shell:
	docker-compose exec web python manage.py shell

# Access container bash
bash:
	docker-compose exec web bash

# Run migrations
migrate:
	docker-compose exec web python manage.py migrate

# Create migrations
makemigrations:
	docker-compose exec web python manage.py makemigrations

# Create superuser
createsuperuser:
	docker-compose exec web python manage.py createsuperuser

# Collect static files
collectstatic:
	docker-compose exec web python manage.py collectstatic --noinput

# Run tests
test:
	docker-compose exec web python manage.py test

# Create sample quiz
create-sample-quiz:
	docker-compose exec web python manage.py create_sample_quiz

# Backup database (PostgreSQL)
db-backup:
	docker-compose exec db pg_dump -U quizapp_user quizapp > backup_$(shell date +%Y%m%d_%H%M%S).sql
	@echo "Database backed up to backup_$(shell date +%Y%m%d_%H%M%S).sql"

# Restore database (PostgreSQL) - Usage: make db-restore FILE=backup.sql
db-restore:
	@if [ -z "$(FILE)" ]; then \
		echo "Error: Please specify FILE=your_backup.sql"; \
		exit 1; \
	fi
	cat $(FILE) | docker-compose exec -T db psql -U quizapp_user quizapp
	@echo "Database restored from $(FILE)"

# Clean everything (⚠️ Warning: This deletes all data!)
clean:
	docker-compose down -v
	@echo "All containers and volumes removed!"

# Rebuild and start fresh
rebuild:
	docker-compose down
	docker-compose up --build -d
	@echo "Application rebuilt and running at http://localhost:8000"

# Setup env file (copy example)
setup-env:
	@if [ ! -f .env.docker ]; then \
		cp env.example .env.docker; \
		echo ".env.docker created from env.example"; \
		echo "Please edit .env.docker with your configuration"; \
	else \
		echo ".env.docker already exists"; \
	fi

# Full setup (first time setup)
setup: setup-env build up
	@echo ""
	@echo "✅ Setup complete!"
	@echo "Application is running at http://localhost:8000"
	@echo "Admin panel: http://localhost:8000/admin"
	@echo ""
	@echo "Default credentials:"
	@echo "  Username: admin"
	@echo "  Password: admin123"

