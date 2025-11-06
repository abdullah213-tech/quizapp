#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   Quiz App Docker Setup Script            ║${NC}"
echo -e "${BLUE}╔════════════════════════════════════════════╗${NC}"
echo ""

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker is not installed!${NC}"
    echo "Please install Docker Desktop from: https://www.docker.com/products/docker-desktop"
    exit 1
fi

# Check if Docker is running
if ! docker info &> /dev/null; then
    echo -e "${RED}❌ Docker is not running!${NC}"
    echo "Please start Docker Desktop and try again."
    exit 1
fi

echo -e "${GREEN}✅ Docker is installed and running${NC}"
echo ""

# Create .env.docker file if it doesn't exist
if [ ! -f .env.docker ]; then
    echo -e "${YELLOW}Creating .env.docker from env.example...${NC}"
    cp env.example .env.docker
    echo -e "${GREEN}✅ .env.docker created${NC}"
    echo ""
    echo -e "${YELLOW}⚠️  Please edit .env.docker to configure:${NC}"
    echo "   - Email settings (for sending quiz results)"
    echo "   - Superuser credentials"
    echo "   - Secret key (for production)"
    echo ""
else
    echo -e "${GREEN}✅ .env.docker already exists${NC}"
    echo ""
fi

# Ask user which mode to run
echo -e "${BLUE}Choose your setup mode:${NC}"
echo "  1) Development (SQLite + auto-reload) - Recommended for testing"
echo "  2) Production (PostgreSQL + Gunicorn) - Full setup"
echo ""
read -p "Enter your choice (1 or 2): " choice

echo ""

if [ "$choice" == "1" ]; then
    echo -e "${BLUE}Starting in Development Mode...${NC}"
    echo ""
    docker-compose -f docker-compose.dev.yml up --build
elif [ "$choice" == "2" ]; then
    echo -e "${BLUE}Starting in Production Mode...${NC}"
    echo ""
    docker-compose up --build
else
    echo -e "${RED}Invalid choice. Please run the script again.${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}╔════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║   Setup Complete! 🎉                       ║${NC}"
echo -e "${GREEN}╔════════════════════════════════════════════╗${NC}"
echo ""
echo -e "${BLUE}Access your application at:${NC}"
echo "  🌐 Application: http://localhost:8000"
echo "  🔐 Admin Panel: http://localhost:8000/admin"
echo ""
echo -e "${BLUE}Default admin credentials:${NC}"
echo "  👤 Username: admin"
echo "  🔑 Password: admin123"
echo ""
echo -e "${YELLOW}Useful commands:${NC}"
echo "  make logs          - View application logs"
echo "  make shell         - Access Django shell"
echo "  make down          - Stop containers"
echo "  make help          - See all available commands"
echo ""

