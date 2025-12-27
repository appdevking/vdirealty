# VDI Realty Backend Deployment Guide

Complete guide to deploy your FSBO and Contact Form backend to Render.com.

---

## 🎯 What You're Deploying

Your Node.js backend handles:
- ✅ FSBO listing submissions with photos
- ✅ Contact form submissions
- ✅ Email notifications to info@vdirealty.com
- ✅ Database for storing listings
- ✅ File uploads (property photos)

---

## 📋 Prerequisites

Before you start:
- [ ] GitHub account
- [ ] Email account for notifications (info@vdirealty.com)
- [ ] If using Gmail: App password ready ([see guide](EMAIL_SETUP_GUIDE.md))

**Cost:** Free tier (sleeps after inactivity) OR $7/month (always-on)

---

## 🚀 Step 1: Prepare Your Backend

### 1.1: Verify Backend Files

Your backend folder should have:
```
backend/
├── server.js
├── package.json
├── config.js
├── database.js
├── email-service.js
├── cron-jobs.js
├── .env.example
├── routes/
│   ├── fsbo-routes.js
│   └── contact-routes.js
└── uploads/
```

✅ **You already have all these files!**

### 1.2: Create Render.yaml (Optional - Makes deployment easier)

Create `backend/render.yaml`:

```yaml
services:
  - type: web
    name: vdi-realty-backend
    env: node
    buildCommand: npm install
    startCommand: npm start
    envVars:
      - key: NODE_ENV
        value: production
      - key: PORT
        generateValue: true
      - key: EMAIL_SERVICE
        sync: false
      - key: EMAIL_USER
        sync: false
      - key: EMAIL_PASSWORD
        sync: false
      - key: ADMIN_EMAIL
        sync: false
```

**I can create this file for you!**

---

## 🌐 Step 2: Create Render.com Account

1. Go to **https://render.com**
2. Click "Get Started for Free"
3. Sign up with GitHub (recommended) or email
4. Verify your email address
5. Complete account setup

---

## 📦 Step 3: Deploy Backend to Render

### 3.1: Connect GitHub Repository

1. In Render dashboard, click **"New +"** → **"Web Service"**
2. Click **"Connect account"** under GitHub
3. Authorize Render to access your repositories
4. Select your repository: **appdevking/vdirealty**
5. Click **"Connect"**

### 3.2: Configure Deployment Settings

**Basic Settings:**
- **Name:** `vdi-realty-backend` (or your choice)
- **Region:** Choose closest to your location (US East recommended)
- **Branch:** `main`
- **Root Directory:** `backend`
- **Runtime:** `Node`
- **Build Command:** `npm install`
- **Start Command:** `npm start`

**Instance Type:**
- **Free** (sleeps after 15 min inactivity - first load takes 30-60 seconds)
- **Starter ($7/month)** (always-on, instant response)

Click **"Advanced"** to continue...

### 3.3: Set Environment Variables

Click **"Add Environment Variable"** for each:

| Key | Value | Example |
|-----|-------|---------|
| `NODE_ENV` | `production` | production |
| `PORT` | `10000` | 10000 |
| `EMAIL_SERVICE` | Your email provider | `gmail` or `custom` |
| `EMAIL_USER` | Your email address | `noreply@vdirealty.com` |
| `EMAIL_PASSWORD` | Your app password | `abcd efgh ijkl mnop` |
| `ADMIN_EMAIL` | Contact recipient | `info@vdirealty.com` |

**For Gmail:**
- EMAIL_SERVICE = `gmail`
- EMAIL_USER = Your Gmail address
- EMAIL_PASSWORD = [App password](https://myaccount.google.com/apppasswords) (not regular password!)

**For Custom SMTP:**
- EMAIL_SERVICE = `custom`
- EMAIL_HOST = `smtp.yourdomain.com`
- EMAIL_PORT = `587`
- EMAIL_USER = `noreply@vdirealty.com`
- EMAIL_PASSWORD = Your SMTP password

### 3.4: Deploy!

1. Review all settings
2. Click **"Create Web Service"**
3. Wait 2-5 minutes for deployment
4. Watch the logs for errors

**You'll see:**
```
==> Build successful!
==> Deploying...
==> Your service is live 🎉
```

---

## 🔗 Step 4: Get Your Backend URL

After deployment:

1. Render will show your service URL:
   ```
   https://vdi-realty-backend.onrender.com
   ```
   **Copy this URL!**

2. Test it in browser:
   ```
   https://vdi-realty-backend.onrender.com
   ```
   You should see: `VDI Realty Backend API is running`

---

## 📝 Step 5: Update Your Website URLs

### 5.1: Update Contact Form (index.html)

**Find line ~1284** in `index.html`:

**Before:**
```javascript
fetch('http://localhost:3000/api/contact/submit', {
```

**After:**
```javascript
fetch('https://vdi-realty-backend.onrender.com/api/contact/submit', {
```

### 5.2: Update FSBO Form (fsbo.html)

**Find line ~787** in `fsbo.html`:

**Before:**
```javascript
const API_URL = 'http://localhost:3000/api/fsbo/submit';
```

**After:**
```javascript
const API_URL = 'https://vdi-realty-backend.onrender.com/api/fsbo/submit';
```

**Replace `vdi-realty-backend.onrender.com` with YOUR actual Render URL!**

---

## 🧪 Step 6: Test Everything

### 6.1: Test Contact Form

1. Open your website (local or on GitHub Pages)
2. Fill out contact form
3. Click "Send Message"
4. Check **info@vdirealty.com** inbox
5. Should receive email within seconds

### 6.2: Test FSBO Listing

1. Go to FSBO page
2. Fill out listing form
3. Upload 1-2 test photos
4. Submit
5. Check email for listing notification

### 6.3: Check Backend Logs

In Render dashboard:
1. Click your service
2. Click **"Logs"** tab
3. Look for successful requests:
   ```
   POST /api/contact/submit - 200 OK
   POST /api/fsbo/submit - 200 OK
   ```

---

## 🎉 Step 7: Deploy to GitHub

```powershell
git add index.html fsbo.html
git commit -m "Update API URLs to production Render backend"
git push
```

Your website is now fully functional with cloud backend!

---

## 💰 Cost Breakdown

| Plan | Cost | Features |
|------|------|----------|
| **Free** | $0/month | Sleeps after 15min inactivity, 750 hours/month |
| **Starter** | $7/month | Always-on, instant response, 100GB bandwidth |

**Recommendation:**
- Start with **Free** to test
- Upgrade to **Starter ($7/mo)** when you get traffic
- Free tier is fine for low-traffic websites

---

## 🔧 Advanced Configuration

### Enable CORS (Already Configured)

Your backend already has CORS enabled in `server.js`:
```javascript
app.use(cors());
```

### File Upload Limits

Default: 10MB per file, 10 images max

To change, edit `backend/routes/fsbo-routes.js`:
```javascript
const upload = multer({
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB
});
```

### Database Backups

Render doesn't backup your SQLite database automatically.

**Option 1:** Add database export endpoint
**Option 2:** Upgrade to PostgreSQL (Render has managed databases)

---

## 🆘 Troubleshooting

### Deploy Failed - Build Error

**Check Logs:**
1. Go to Render dashboard
2. Click your service → Logs
3. Look for error messages

**Common Issues:**
- ❌ Missing `package.json` → Verify Root Directory is `backend`
- ❌ npm install failed → Check dependencies in package.json
- ❌ Port binding error → Render sets PORT automatically, don't hardcode

### Backend Running, But Forms Don't Work

**Check Environment Variables:**
1. Render dashboard → Your service → Environment
2. Verify all variables are set correctly
3. No extra spaces in values
4. EMAIL_PASSWORD is app password (not regular password)

**Check CORS:**
- Open browser console (F12)
- Look for CORS errors
- Your backend already has CORS enabled

### No Emails Received

**Gmail Users:**
1. Verify App Password (not regular password)
2. Check spam folder
3. Test email settings locally first

**Custom SMTP:**
1. Verify SMTP server allows connections
2. Check port (587 for TLS, 465 for SSL)
3. Verify credentials

### Free Tier Sleep Issues

**Symptoms:**
- First request takes 30-60 seconds
- Fast after that

**Solutions:**
- Upgrade to Starter ($7/mo) for always-on
- Use cron job to ping service every 10 min ([see guide](https://render.com/docs/cronjobs))
- Accept the delay (most users won't notice)

### Database Lost After Redeploy

**Issue:** Render rebuilds containers on deploy, SQLite file is lost

**Solutions:**
1. **Use Render Disk:** Add persistent disk in Render settings
2. **Upgrade to PostgreSQL:** Managed database (recommended for production)
3. **Regular exports:** Create backup endpoint to export listings

---

## 📊 Monitoring Your Backend

### View Logs
1. Render dashboard → Your service
2. Click **"Logs"** tab
3. See real-time requests and errors

### Check Metrics
1. Click **"Metrics"** tab
2. View CPU, memory, request counts

### Set Up Alerts
1. Click **"Settings"**
2. **"Notifications"**
3. Add email for deploy failures

---

## 🔄 Updating Your Backend

### Make Changes Locally
```powershell
cd backend
# Make your changes
git add .
git commit -m "Update backend"
git push
```

### Auto-Deploy
Render automatically redeploys when you push to GitHub!

**Or manually:**
1. Render dashboard → Your service
2. Click **"Manual Deploy"** → **"Deploy latest commit"**

---

## 🔐 Security Best Practices

✅ **Environment variables stored securely** (Render encrypts them)
✅ **HTTPS enabled automatically** (Render provides SSL)
✅ **CORS configured properly**
⚠️ **Add rate limiting** to prevent spam (future improvement)
⚠️ **Add input validation** (already partially implemented)

---

## 📚 Additional Resources

- [Render Documentation](https://render.com/docs)
- [Node.js Deployment Guide](https://render.com/docs/deploy-node-express-app)
- [Environment Variables](https://render.com/docs/environment-variables)
- [Free vs Paid Plans](https://render.com/pricing)

---

## ✅ Deployment Checklist

- [ ] Backend code pushed to GitHub
- [ ] Render.com account created
- [ ] Service deployed successfully
- [ ] Environment variables configured
- [ ] Backend URL copied
- [ ] index.html updated with production URL
- [ ] fsbo.html updated with production URL
- [ ] Contact form tested
- [ ] FSBO listing tested
- [ ] Email notifications working
- [ ] Changes pushed to GitHub

---

## 🎓 What You've Learned

✅ Cloud deployment with Render.com
✅ Environment variable management
✅ Production vs development configuration
✅ API endpoint integration
✅ Full-stack application deployment

**Congratulations! Your website is now fully functional with a production backend! 🎉**

---

## 💡 Next Steps

1. **Monitor usage** - Watch Render logs for traffic patterns
2. **Consider upgrade** - If you get regular traffic, upgrade to Starter ($7/mo)
3. **Database backups** - Set up regular exports or upgrade to PostgreSQL
4. **Add features** - Rate limiting, admin dashboard, analytics
5. **Custom domain** - Point your domain to Render (free on Starter plan)

Need help? Check the troubleshooting section or Render's support docs!
