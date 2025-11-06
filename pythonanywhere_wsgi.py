"""
WSGI Configuration for PythonAnywhere Deployment

INSTRUCTIONS:
1. Copy this entire file content
2. Go to PythonAnywhere Web tab
3. Click on your WSGI configuration file
4. DELETE everything in that file
5. PASTE this content
6. UPDATE the following:
   - Line 12: YOUR_USERNAME (appears 2 times)
   - Line 13: YOUR_REPO (your repository folder name)
   - Line 20: SECRET_KEY (generate using the command in deployment guide)
   - Line 21: YOUR_USERNAME.pythonanywhere.com
7. Click Save

To generate SECRET_KEY, run in PythonAnywhere Bash console:
python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
"""

import os
import sys

# ====================================================================
# CHANGE THESE VALUES BEFORE SAVING
# ====================================================================

# Add your project directory to the sys.path
# CHANGE: YOUR_USERNAME and YOUR_REPO
path = '/home/YOUR_USERNAME/YOUR_REPO'
if path not in sys.path:
    sys.path.insert(0, path)

# Set environment variables for Django
os.environ['DJANGO_SETTINGS_MODULE'] = 'quizapp.settings'
os.environ['DEBUG'] = 'False'  # Keep as False for production
os.environ['SECRET_KEY'] = 'PASTE-YOUR-GENERATED-SECRET-KEY-HERE'  # CHANGE: Generate and paste secret key
os.environ['ALLOWED_HOSTS'] = 'YOUR_USERNAME.pythonanywhere.com'  # CHANGE: YOUR_USERNAME

# ====================================================================
# NO CHANGES NEEDED BELOW THIS LINE
# ====================================================================

# Setup Django WSGI application
from django.core.wsgi import get_wsgi_application
application = get_wsgi_application()

