# ⚡ Quick Start - PythonAnywhere Deployment

**Deploy in 15 minutes!** This is the condensed version. For detailed guide, see `PYTHONANYWHERE_DEPLOYMENT.md`.

---

## 🎯 Before You Start

1. ✅ Push your code to GitHub
2. ✅ Sign up at [pythonanywhere.com](https://www.pythonanywhere.com) (free, no card)
3. ✅ Have your GitHub repository URL ready

---

## 📝 Steps

### 1️⃣ Clone Your Code (Bash Console)

```bash
git clone https://github.com/YOUR_USERNAME/YOUR_REPO.git
cd YOUR_REPO
```

### 2️⃣ Setup Virtual Environment

```bash
mkvirtualenv --python=/usr/bin/python3.10 quizapp-env
pip install -r requirements.txt
```

### 3️⃣ Setup Django

```bash
python manage.py migrate
python manage.py createsuperuser
python manage.py collectstatic --noinput
mkdir -p media/recordings
```

### 4️⃣ Generate SECRET_KEY

```bash
python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
```

**📋 Copy the output!**

### 5️⃣ Create Web App

- Web tab → **"Add a new web app"**
- **"Manual configuration"** → **Python 3.10**

### 6️⃣ Configure WSGI File

Click WSGI file link, **DELETE ALL**, paste from `pythonanywhere_wsgi.py`, and update:

```python
# Line 12: Your username and repo
path = '/home/YOUR_USERNAME/YOUR_REPO'

# Line 20: Paste SECRET_KEY from step 4
os.environ['SECRET_KEY'] = 'paste-here'

# Line 21: Your username
os.environ['ALLOWED_HOSTS'] = 'YOUR_USERNAME.pythonanywhere.com'
```

**Click Save!**

### 7️⃣ Configure Static Files

In Web tab, under "Static files", add:

| URL | Directory |
|-----|-----------|
| `/static/` | `/home/YOUR_USERNAME/YOUR_REPO/staticfiles/` |
| `/media/` | `/home/YOUR_USERNAME/YOUR_REPO/media/` |

### 8️⃣ Configure Virtual Environment

In Web tab, "Virtualenv" section:

```
/home/YOUR_USERNAME/.virtualenvs/quizapp-env
```

### 9️⃣ Launch! 🚀

Click the big green **"Reload"** button at top of Web tab.

---

## ✅ Done!

Visit: **`https://YOUR_USERNAME.pythonanywhere.com`**

Admin: **`https://YOUR_USERNAME.pythonanywhere.com/admin/`**

---

## 🔄 Update Your App

```bash
cd ~/YOUR_REPO
workon quizapp-env
git pull
python manage.py migrate
python manage.py collectstatic --noinput
```

Then click **Reload** in Web tab.

---

## 🐛 Something Wrong?

Check **Error log** in Web tab (under Log files section).

Common issues:
- ❌ Wrong paths (username/repo typo)
- ❌ SECRET_KEY not set
- ❌ Virtual environment path wrong
- ❌ Static files paths incorrect

**Full troubleshooting:** See `PYTHONANYWHERE_DEPLOYMENT.md`

---

## 📚 Files Included

- `PYTHONANYWHERE_DEPLOYMENT.md` - Complete detailed guide
- `pythonanywhere_wsgi.py` - Ready-to-use WSGI config
- `deploy_pythonanywhere.sh` - Automation script
- `.pythonanywhere-config` - Configuration reference
- `QUICK_START_PYTHONANYWHERE.md` - This file

---

**Need help?** Check the full deployment guide or [PythonAnywhere help](https://help.pythonanywhere.com).

