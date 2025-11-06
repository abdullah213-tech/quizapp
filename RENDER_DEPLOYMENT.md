# 🚀 Deploy to Render - Complete Guide

This guide will help you deploy your Quiz App to Render for **FREE**.

## Prerequisites

1. A GitHub account
2. A Render account (sign up at [render.com](https://render.com))
3. Your code pushed to a GitHub repository

---

## Step 1: Push Your Code to GitHub

If you haven't already, push your code to GitHub:

```bash
# Initialize git (if not already done)
git init

# Add all files
git add .

# Commit
git commit -m "Prepare for Render deployment"

# Create a new repository on GitHub, then:
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git branch -M main
git push -u origin main
```

---

## Step 2: Sign Up for Render

1. Go to [render.com](https://render.com)
2. Click "Get Started for Free"
3. Sign up with your GitHub account (recommended for easier integration)

---

## Step 3: Create a PostgreSQL Database

1. From your Render dashboard, click **"New +"** → **"PostgreSQL"**
2. Configure the database:
   - **Name**: `quizapp-db` (or your preferred name)
   - **Database**: `quizapp`
   - **User**: `quizapp_user` (auto-generated is fine)
   - **Region**: Choose the closest to your users
   - **PostgreSQL Version**: 16 (or latest)
   - **Plan**: **Free** (select the Free tier)
3. Click **"Create Database"**
4. Wait for the database to provision (~2-3 minutes)
5. **Important**: Copy the **Internal Database URL** - you'll need this later

---

## Step 4: Create a Web Service

1. Click **"New +"** → **"Web Service"**
2. Connect your GitHub repository:
   - If first time: Click "Connect GitHub" and authorize Render
   - Select your repository from the list
3. Configure the web service:

### Basic Settings
- **Name**: `quizapp` (or your preferred name)
- **Region**: Same as your database
- **Branch**: `main` (or your default branch)
- **Root Directory**: Leave empty
- **Runtime**: **Python 3**

### Build & Deploy Settings
- **Build Command**: 
  ```bash
  ./build.sh
  ```
- **Start Command**: 
  ```bash
  gunicorn --bind 0.0.0.0:$PORT --workers 3 --timeout 120 quizapp.wsgi:application
  ```

### Instance Type
- Select **Free** tier

---

## Step 5: Configure Environment Variables

Scroll down to the **Environment Variables** section and add these:

| Key | Value | Notes |
|-----|-------|-------|
| `PYTHON_VERSION` | `3.11.0` | Python version |
| `DEBUG` | `False` | **IMPORTANT**: Set to False for production |
| `SECRET_KEY` | `[Generate Random]` | Click "Generate" button |
| `ALLOWED_HOSTS` | `your-app-name.onrender.com` | Replace with your actual Render URL |
| `DATABASE_URL` | `[From Step 3]` | Paste the Internal Database URL from your database |

**To get your DATABASE_URL:**
1. Go to your PostgreSQL database in Render dashboard
2. Scroll down to "Connections"
3. Copy the **Internal Database URL**

### Optional: Create Admin User Automatically

Add these if you want to auto-create a superuser on first deploy:

| Key | Value |
|-----|-------|
| `CREATE_SUPERUSER` | `True` |
| `DJANGO_SUPERUSER_USERNAME` | `admin` |
| `DJANGO_SUPERUSER_EMAIL` | `admin@example.com` |
| `DJANGO_SUPERUSER_PASSWORD` | `your-secure-password` |

Then uncomment the superuser creation code in `build.sh`.

---

## Step 6: Deploy!

1. Click **"Create Web Service"**
2. Render will start building and deploying your app
3. This will take 5-10 minutes on the first deploy
4. Watch the build logs for any errors

---

## Step 7: Access Your App

Once deployed:

1. Your app will be available at: `https://your-app-name.onrender.com`
2. Admin panel: `https://your-app-name.onrender.com/admin/`

---

## Step 8: Update ALLOWED_HOSTS

After deployment, update your environment variable:

1. Go to your web service in Render
2. Navigate to "Environment" tab
3. Update `ALLOWED_HOSTS` to your actual Render URL:
   ```
   your-actual-app-name.onrender.com
   ```
4. Click "Save Changes"
5. Your app will automatically redeploy

---

## 🎉 You're Live!

Your quiz app is now deployed and accessible to anyone!

---

## Important Notes

### Free Tier Limitations

- **Web Service**: 750 hours/month (enough for one app running 24/7)
- **Database**: 1GB storage, 90 days retention
- **Apps sleep after 15 minutes** of inactivity
- **Cold start**: ~30 seconds to wake up
- **Build time**: Limited to 10 minutes

### Media Files Warning

⚠️ **Important**: Render's free tier has **ephemeral storage**, meaning uploaded files (like screen recordings) will be deleted when your app restarts or redeploys.

**Solutions:**
1. **AWS S3** (recommended): Use Amazon S3 for media storage
2. **Cloudinary**: Free tier for image/video hosting
3. **Disable file uploads**: For testing, you can disable the screen recording feature

To configure S3 storage, add these packages:
```bash
pip install boto3 django-storages
```

---

## Troubleshooting

### Build Fails

Check the build logs for errors. Common issues:
- Missing dependencies in `requirements.txt`
- Python version mismatch
- Permission issues with `build.sh` (should be executable)

### App Crashes

1. Check the logs in Render dashboard
2. Common issues:
   - `ALLOWED_HOSTS` not configured correctly
   - `DATABASE_URL` not set
   - `SECRET_KEY` missing

### Static Files Not Loading

- Ensure WhiteNoise is installed (already in requirements.txt)
- Check that `collectstatic` ran successfully in build logs
- Verify `STATICFILES_STORAGE` is set in settings.py

### Database Connection Issues

- Verify `DATABASE_URL` is set correctly
- Use **Internal Database URL** (not External)
- Check database is in the same region as web service

---

## Updating Your App

To deploy updates:

1. Make changes to your code locally
2. Commit and push to GitHub:
   ```bash
   git add .
   git commit -m "Your update message"
   git push
   ```
3. Render will **automatically** redeploy (if auto-deploy is enabled)
4. Or manually click "Manual Deploy" → "Deploy latest commit"

---

## Monitoring

- **Logs**: View real-time logs in Render dashboard
- **Metrics**: Check CPU, memory usage
- **Health checks**: Render automatically monitors your app

---

## Scaling (Paid Plans)

When you're ready to upgrade:
- **Starter**: $7/month (no sleep, 512MB RAM)
- **Standard**: $25/month (1GB RAM)
- **Persistent storage** for media files
- **Better performance** and reliability

---

## Alternative: Deploy Using render.yaml

You can also use the included `render.yaml` for Infrastructure as Code:

1. In Render dashboard, click "New +" → "Blueprint"
2. Connect your repository
3. Render will automatically detect `render.yaml`
4. Click "Apply"

This will create both the web service and database in one step!

---

## Support

- **Render Docs**: https://render.com/docs
- **Django Deployment**: https://docs.djangoproject.com/en/stable/howto/deployment/
- **Community**: Render Community Forum

---

## Security Checklist

Before going to production:

- [ ] `DEBUG = False` in production
- [ ] Strong `SECRET_KEY` (use Render's generator)
- [ ] `ALLOWED_HOSTS` properly configured
- [ ] Database credentials secured
- [ ] HTTPS enabled (automatic on Render)
- [ ] Regular backups (consider paid plan)
- [ ] Update dependencies regularly

---

Good luck with your deployment! 🚀

