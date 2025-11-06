#!/bin/bash
# Build script for compiling frontend assets locally

set -e

echo "🔨 Building frontend assets..."

# Install Node.js dependencies
if [ -f "package.json" ]; then
    echo "📦 Installing npm packages..."
    npm install
    
    # Run build command (customize based on your needs)
    echo "⚙️  Compiling assets..."
    npm run build
    
    echo "✅ Build complete!"
else
    echo "⚠️  No package.json found. Skipping npm build."
fi

# Collect Django static files
echo "📁 Collecting Django static files..."
python manage.py collectstatic --noinput

echo "🎉 All assets built successfully!"
echo ""
echo "Now commit and push:"
echo "  git add ."
echo "  git commit -m 'Build assets'"
echo "  git push origin main"

