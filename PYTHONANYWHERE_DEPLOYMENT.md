# 🚀 Deploy to PythonAnywhere - Complete Guide

Deploy your Quiz App to PythonAnywhere for **FREE** - No credit card required!

## ✨ Why PythonAnywhere?

- ✅ **100% FREE** forever (with limitations)
- ✅ **No credit card required**
- ✅ **Perfect for Django** apps
- ✅ **Persistent storage** for your screen recordings
- ✅ **SQLite database** included
- ✅ **Always-on** - no sleeping
- ✅ **Easy setup** - 30 minutes max

---

## 📋 Prerequisites

1. A GitHub account (to push your code)
2. Your code in a GitHub repository
3. A PythonAnywhere account (free)

---

## Step 1: Push Your Code to GitHub

If you haven't already:

```bash
# Make sure you're in your project directory
cd /Users/mac/Documents/projects/test\ project/quizapp

# Initialize git (if not already done)
git init

# Add all files
git add .

# Commit
git commit -m "Prepare for PythonAnywhere deployment"

# Create a new repository on GitHub, then:
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git branch -M main
git push -u origin main
```

---

## Step 2: Sign Up for PythonAnywhere

1. Go to [pythonanywhere.com](https://www.pythonanywhere.com)
2. Click **"Start running Python online in less than a minute"**
3. Choose **"Create a Beginner account"** - 100% FREE!
4. Complete signup with your email
5. Verify your email address

**Free Tier Includes:**
- 512MB disk space
- 100 CPU seconds/day
- One web app at your-username.pythonanywhere.com
- Always-on (no sleeping!)

---

## Step 3: Clone Your Repository

1. In PythonAnywhere dashboard, open a **"Bash" console**
2. Run these commands:

```bash
# Clone your repository
git clone https://github.com/YOUR_USERNAME/YOUR_REPO.git

# Navigate into it
cd YOUR_REPO

# Verify files are there
ls -la
```

**Replace:**
- `YOUR_USERNAME` with your GitHub username
- `YOUR_REPO` with your repository name

---

## Step 4: Create Virtual Environment

In the same Bash console:

```bash
# Create virtual environment with Python 3.10
mkvirtualenv --python=/usr/bin/python3.10 quizapp-env

# It should auto-activate. If not:
workon quizapp-env

# Navigate to your project
cd ~/YOUR_REPO

# Install dependencies
pip install -r requirements.txt

# This will take 2-3 minutes
```

**Note:** PythonAnywhere free tier supports Python 3.10 (your app is compatible!)

---

## Step 5: Set Up Database and Static Files

Still in the Bash console:

```bash
# Make sure you're in project directory and venv is active
cd ~/YOUR_REPO
workon quizapp-env

# Run migrations
python manage.py migrate

# Create a superuser for admin access
python manage.py createsuperuser
# Follow prompts to create username, email, password

# Collect static files
python manage.py collectstatic --noinput

# Create media directories
mkdir -p media/recordings

# Verify everything
ls -la
```

---

## Step 6: Generate SECRET_KEY

In the Bash console:

```bash
python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
```

**Copy the output** - you'll need it in Step 8!

---

## Step 7: Create Web App

1. Go to the **"Web"** tab in PythonAnywhere dashboard
2. Click **"Add a new web app"**
3. Click **"Next"** (ignore the domain name for now)
4. Select **"Manual configuration"** (NOT "Django"!)
5. Select **"Python 3.10"**
6. Click **"Next"** through to finish

---

## Step 8: Configure WSGI File

1. In the **Web** tab, find the **"Code"** section
2. Click on the **WSGI configuration file** link (looks like `/var/www/username_pythonanywhere_com_wsgi.py`)
3. **DELETE ALL CONTENT** in the file
4. **Copy the content from `pythonanywhere_wsgi.py`** (included in this repo)
5. **Update the following values:**

```python
# LINE 5: Change YOUR_USERNAME to your PythonAnywhere username
path = '/home/YOUR_USERNAME/YOUR_REPO'

# LINE 12: Paste the SECRET_KEY you generated in Step 6
os.environ['SECRET_KEY'] = 'paste-your-generated-secret-key-here'

# LINE 13: Change YOUR_USERNAME to your PythonAnywhere username
os.environ['ALLOWED_HOSTS'] = 'YOUR_USERNAME.pythonanywhere.com'
```

6. Click **"Save"** (top right corner)

**Full WSGI Template:**

```python
import os
import sys

# Add your project directory to the sys.path
path = '/home/YOUR_USERNAME/YOUR_REPO'
if path not in sys.path:
    sys.path.insert(0, path)

# Set environment variables
os.environ['DJANGO_SETTINGS_MODULE'] = 'quizapp.settings'
os.environ['DEBUG'] = 'False'
os.environ['SECRET_KEY'] = 'your-generated-secret-key-from-step-6'
os.environ['ALLOWED_HOSTS'] = 'YOUR_USERNAME.pythonanywhere.com'

# Setup Django
from django.core.wsgi import get_wsgi_application
application = get_wsgi_application()
```

---

## Step 9: Configure Static Files

In the **Web** tab, scroll to **"Static files"** section:

Click **"Enter URL"** and add these mappings:

| URL | Directory |
|-----|-----------|
| `/static/` | `/home/YOUR_USERNAME/YOUR_REPO/staticfiles/` |
| `/media/` | `/home/YOUR_USERNAME/YOUR_REPO/media/` |

**For each entry:**
1. Type the URL in the left box (e.g., `/static/`)
2. Type the full path in the right box
3. Click the **checkmark** to save
4. Repeat for `/media/`

**Remember to replace:**
- `YOUR_USERNAME` with your PythonAnywhere username
- `YOUR_REPO` with your repository folder name

---

## Step 10: Configure Virtual Environment

In the **Web** tab, find **"Virtualenv"** section:

1. Click **"Enter path to a virtualenv"**
2. Enter: `/home/YOUR_USERNAME/.virtualenvs/quizapp-env`
3. Click the **checkmark**

Replace `YOUR_USERNAME` with your PythonAnywhere username.

---

## Step 11: Reload and Launch! 🚀

1. Scroll to the top of the **Web** tab
2. Click the big green **"Reload YOUR_USERNAME.pythonanywhere.com"** button
3. Wait 5-10 seconds for reload to complete
4. Click on your site link: **YOUR_USERNAME.pythonanywhere.com**

**Your quiz app is now LIVE!** 🎉

---

## 🔐 Access Admin Panel

Visit: `https://YOUR_USERNAME.pythonanywhere.com/admin/`

Login with the superuser credentials you created in Step 5.

---

## 📊 Quick Reference

**Your App Details:**

| Item | Value |
|------|-------|
| Site URL | `YOUR_USERNAME.pythonanywhere.com` |
| Admin Panel | `YOUR_USERNAME.pythonanywhere.com/admin/` |
| Project Path | `/home/YOUR_USERNAME/YOUR_REPO` |
| Virtual Env | `/home/YOUR_USERNAME/.virtualenvs/quizapp-env` |
| Static Files | `/home/YOUR_USERNAME/YOUR_REPO/staticfiles/` |
| Media Files | `/home/YOUR_USERNAME/YOUR_REPO/media/` |
| Database | SQLite at `/home/YOUR_USERNAME/YOUR_REPO/db.sqlite3` |

---

## 🔄 Updating Your App

When you make changes to your code:

### 1. Push changes to GitHub:
```bash
git add .
git commit -m "Update description"
git push
```

### 2. Update on PythonAnywhere:

Open a Bash console and run:

```bash
# Navigate to project
cd ~/YOUR_REPO

# Activate virtual environment
workon quizapp-env

# Pull latest changes
git pull

# Run migrations (if models changed)
python manage.py migrate

# Collect static files (if CSS/JS changed)
python manage.py collectstatic --noinput
```

### 3. Reload web app:
- Go to **Web** tab
- Click **"Reload"** button

---

## 🐛 Troubleshooting

### **Error: "Something went wrong"**

**Check error logs:**
1. Go to **Web** tab
2. Click on **"Error log"** (under Log files section)
3. Look at the most recent errors

**Common fixes:**
- Wrong path in WSGI file (check username and repo name)
- SECRET_KEY not set correctly
- ALLOWED_HOSTS doesn't match your URL
- Virtual environment not configured

### **Static files not loading (no CSS)**

1. Verify static files mapping in **Web** tab
2. Check paths are correct (no typos)
3. Run `collectstatic` again:
   ```bash
   cd ~/YOUR_REPO
   workon quizapp-env
   python manage.py collectstatic --noinput
   ```
4. Click **Reload**

### **Database errors**

1. Check migrations ran successfully:
   ```bash
   cd ~/YOUR_REPO
   workon quizapp-env
   python manage.py migrate
   ```
2. Verify `db.sqlite3` exists in project directory

### **"No module named 'django'"**

Virtual environment not activated. In WSGI config, verify the path is correct:
```python
path = '/home/YOUR_USERNAME/YOUR_REPO'
```

### **Site is slow or "CPU limit exceeded"**

Free tier has 100 CPU seconds/day. This resets at midnight UTC.

**Solutions:**
- Optimize queries in your code
- Upgrade to paid plan ($5/month for more CPU)
- Reduce traffic temporarily

---

## ⚠️ Free Tier Limitations

| Limitation | Details |
|------------|---------|
| **Storage** | 512MB total (code + database + media files) |
| **CPU Time** | 100 seconds/day (resets daily) |
| **Web Apps** | 1 app only |
| **Custom Domain** | Not available (upgrade to $5/month) |
| **HTTPS** | ✅ Included (automatic) |
| **Always On** | ✅ Yes (no sleeping!) |
| **Database** | SQLite only (no PostgreSQL) |

---

## 📹 Managing Screen Recordings

Your quiz app records student screens. With 512MB storage:

**Monitor storage usage:**

```bash
# In Bash console
cd ~/YOUR_REPO/media/recordings
du -sh .
```

**Clean old recordings:**

```bash
# Delete recordings older than 7 days
find ~/YOUR_REPO/media/recordings -name "*.webm" -mtime +7 -delete
```

**Automate cleanup (optional):**

Create a scheduled task in PythonAnywhere:
1. Go to **Tasks** tab
2. Add daily task at midnight:
   ```bash
   find /home/YOUR_USERNAME/YOUR_REPO/media/recordings -name "*.webm" -mtime +7 -delete
   ```

---

## 💡 Performance Tips

1. **Optimize images** - Use compressed images for better load times
2. **Database cleanup** - Regularly remove old quiz attempts
3. **Monitor CPU usage** - Check your daily quota in dashboard
4. **Cache static files** - WhiteNoise already does this for you!

---

## 🔒 Security Checklist

- [x] `DEBUG = False` (set in WSGI file)
- [x] Strong `SECRET_KEY` (generated randomly)
- [x] `ALLOWED_HOSTS` configured correctly
- [x] HTTPS enabled (automatic on PythonAnywhere)
- [x] Admin panel password is strong
- [ ] Change default admin username from 'admin'
- [ ] Set up regular backups (manual for free tier)
- [ ] Update dependencies regularly

---

## 📦 Backup Your Data

**Download database:**

1. In **Files** tab, navigate to your project
2. Right-click `db.sqlite3`
3. Download to your computer

**Backup media files:**

In Bash console:
```bash
cd ~/YOUR_REPO
tar -czf backup-$(date +%Y%m%d).tar.gz media/ db.sqlite3
```

Download the `.tar.gz` file from Files tab.

---

## ⬆️ Upgrade Options

When you need more:

**Hacker Plan - $5/month:**
- 2GB storage
- 2 web apps
- Custom domains
- More CPU time
- MySQL/PostgreSQL databases

**Compare plans:** [pythonanywhere.com/pricing](https://www.pythonanywhere.com/pricing/)

---

## 📚 Additional Resources

- **PythonAnywhere Help:** [help.pythonanywhere.com](https://help.pythonanywhere.com)
- **Django on PythonAnywhere:** [help.pythonanywhere.com/pages/Django](https://help.pythonanywhere.com/pages/Django/)
- **Django Deployment:** [docs.djangoproject.com/en/stable/howto/deployment/](https://docs.djangoproject.com/en/stable/howto/deployment/)

---

## 🆘 Need Help?

1. Check the **error log** in Web tab
2. Search [PythonAnywhere forums](https://www.pythonanywhere.com/forums/)
3. Review this guide's troubleshooting section
4. Contact PythonAnywhere support (very responsive!)

---

## 🎉 Success!

Your Django Quiz App is now deployed and accessible at:

**🌐 https://YOUR_USERNAME.pythonanywhere.com**

You did it! Now you can:
- Create quizzes via admin panel
- Share the link with students
- Monitor quiz attempts with proctoring
- View screen recordings

**Congratulations on your deployment!** 🚀

---

*Last updated: November 2025*

