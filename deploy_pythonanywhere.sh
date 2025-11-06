#!/bin/bash

# =============================================================================
# PythonAnywhere Deployment Setup Script
# =============================================================================
# 
# This script automates the setup process for PythonAnywhere deployment
# Run this in your PythonAnywhere Bash console after cloning the repo
#
# USAGE:
#   1. Upload this script to PythonAnywhere or include it in your repo
#   2. Make it executable: chmod +x deploy_pythonanywhere.sh
#   3. Run it: ./deploy_pythonanywhere.sh
#
# PREREQUISITES:
#   - Virtual environment already created: mkvirtualenv --python=/usr/bin/python3.10 quizapp-env
#   - Currently in project directory: cd ~/YOUR_REPO
#   - Virtual environment activated: workon quizapp-env
#
# =============================================================================

set -e  # Exit on error

echo "=================================================="
echo "🚀 PythonAnywhere Deployment Setup Script"
echo "=================================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if we're in a virtual environment
if [ -z "$VIRTUAL_ENV" ]; then
    echo -e "${RED}❌ Error: Virtual environment not activated!${NC}"
    echo "Please run: workon quizapp-env"
    exit 1
fi

echo -e "${GREEN}✓ Virtual environment detected: $VIRTUAL_ENV${NC}"
echo ""

# Step 1: Install dependencies
echo "=================================================="
echo "📦 Step 1: Installing Python dependencies..."
echo "=================================================="
pip install --upgrade pip
pip install -r requirements.txt
echo -e "${GREEN}✓ Dependencies installed${NC}"
echo ""

# Step 2: Run migrations
echo "=================================================="
echo "🗄️  Step 2: Running database migrations..."
echo "=================================================="
python manage.py migrate --noinput
echo -e "${GREEN}✓ Migrations completed${NC}"
echo ""

# Step 3: Collect static files
echo "=================================================="
echo "📁 Step 3: Collecting static files..."
echo "=================================================="
python manage.py collectstatic --noinput
echo -e "${GREEN}✓ Static files collected${NC}"
echo ""

# Step 4: Create media directories
echo "=================================================="
echo "📂 Step 4: Creating media directories..."
echo "=================================================="
mkdir -p media/recordings
echo -e "${GREEN}✓ Media directories created${NC}"
echo ""

# Step 5: Generate SECRET_KEY
echo "=================================================="
echo "🔑 Step 5: Generating SECRET_KEY..."
echo "=================================================="
echo -e "${YELLOW}Copy this SECRET_KEY for your WSGI configuration:${NC}"
echo ""
python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
echo ""
echo -e "${YELLOW}Save this key! You'll need it for the WSGI file.${NC}"
echo ""

# Step 6: Create superuser prompt
echo "=================================================="
echo "👤 Step 6: Create superuser (admin account)"
echo "=================================================="
echo -e "${YELLOW}Do you want to create a superuser now? (y/n)${NC}"
read -p "Answer: " create_superuser

if [ "$create_superuser" = "y" ] || [ "$create_superuser" = "Y" ]; then
    python manage.py createsuperuser
    echo -e "${GREEN}✓ Superuser created${NC}"
else
    echo -e "${YELLOW}⚠ Skipped. You can create one later with: python manage.py createsuperuser${NC}"
fi
echo ""

# Step 7: Display summary
echo "=================================================="
echo "✅ Setup Complete!"
echo "=================================================="
echo ""
echo "Next steps:"
echo ""
echo "1. Go to PythonAnywhere Web tab"
echo "2. Configure WSGI file with the SECRET_KEY above"
echo "3. Set up static file mappings:"
echo "   - URL: /static/  Directory: $(pwd)/staticfiles/"
echo "   - URL: /media/   Directory: $(pwd)/media/"
echo "4. Set virtualenv path: $VIRTUAL_ENV"
echo "5. Click 'Reload' button"
echo ""
echo "📚 See PYTHONANYWHERE_DEPLOYMENT.md for detailed instructions"
echo ""
echo -e "${GREEN}🎉 Your app is ready to launch!${NC}"
echo "=================================================="

