# 🚀 Deploy FSBO Backend to Railway.app

This guide will help you deploy your VDI Realty FSBO backend to Railway.app, making it accessible to anyone on the internet.

## Why Railway.app?

- ✅ **Free Tier**: $5/month credit (enough for small sites)
- ✅ **Persistent Storage**: Supports SQLite database and file uploads
- ✅ **Easy Deployment**: Deploy directly from GitHub
- ✅ **Automatic HTTPS**: Free SSL certificates
- ✅ **No Credit Card Required**: Start for free

## 📋 Prerequisites

1. A GitHub account (you already have this)
2. A Railway account (we'll create this)
3. Your code pushed to GitHub (✅ already done)

---

## Step 1: Create Railway Account

1. Go to [Railway.app](https://railway.app)
2. Click **"Start a New Project"** or **"Login"**
3. Sign up with your **GitHub account** (recommended for easy deployment)
4. Verify your email if required

---

## Step 2: Deploy Your Backend

### Option A: Deploy from GitHub (Recommended)

1. **In Railway Dashboard:**
   - Click **"+ New Project"**
   - Select **"Deploy from GitHub repo"**
   - Authorize Railway to access your GitHub repositories
   - Select your repository: `appdevking/vdirealty`
   - Railway will detect it as a Node.js project

2. **Configure the deployment:**
   - Railway will auto-detect `package.json` and know it's a Node.js app
   - It will automatically run `npm install` and `npm start`
   - Click **"Deploy"**

3. **Wait for deployment:**
   - Railway will build and deploy your app (takes 1-2 minutes)
   - You'll see build logs in real-time

---

## Step 3: Add Persistent Storage (CRITICAL!)

Your app needs persistent storage for:
- SQLite database (`fsbo.db`)
- Uploaded property photos

1. **In your Railway project:**
   - Click on your service
   - Go to the **"Data"** tab or click **"+ New"** → **"Volume"**
   - Create a new **Volume**
   
2. **Mount the volume:**
   - **Mount Path**: `/app/data`
   - **Name**: `vdi-storage` (or any name you prefer)
   - Click **"Add Volume"**

3. **Update your backend code:**
   - We'll need to change the database path to use `/app/data`
   - I'll do this for you in the next step

---

## Step 4: Configure Environment Variables

1. **In Railway, go to your project:**
   - Click on your service
   - Go to the **"Variables"** tab
   - Click **"+ New Variable"** or **"Raw Editor"**

2. **Add these variables:**

```env
NODE_ENV=production
PORT=3000
WEBSITE_URL=https://appdevking.github.io/vdirealty
ADMIN_EMAIL=your-email@example.com
LISTING_DURATION_DAYS=14
REMINDER_DAYS_BEFORE=2
```

3. **Optional: Add Email Configuration** (if you want confirmation emails)

For Gmail:
```env
EMAIL_SERVICE=gmail
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-specific-password
```

> **Note**: Get Gmail app password at: https://myaccount.google.com/apppasswords
> (You need 2-factor authentication enabled)

4. **Click "Add"** or **"Save"**

---

## Step 5: Get Your Backend URL

1. After deployment completes:
   - Railway will assign you a URL like: `https://vdirealty-production.up.railway.app`
   - You can find it in the **"Settings"** tab under **"Domains"**

2. **Test your backend:**
   - Open: `https://your-railway-url.up.railway.app/api/health`
   - You should see: `{"status":"ok","message":"VDI Realty FSBO API is running"}`

3. **Copy this URL** - you'll need it for the next step

---

## Step 6: Update Your Website Configuration

1. **Open** `js/config.js` in your project

2. **Replace the localhost URL** with your Railway URL:

```javascript
const CONFIG = {
    // API_BASE_URL: 'http://localhost:3000' // Old local URL
    API_BASE_URL: 'https://your-railway-url.up.railway.app' // Your new Railway URL
};
```

3. **Commit and push** the change:
```bash
git add js/config.js
git commit -m "Update API URL to Railway backend"
git push
```

---

## Step 7: Test Your Live Site

1. **Visit your website**: https://appdevking.github.io/vdirealty/fsbo.html

2. **Try submitting a test listing:**
   - Fill out the form
   - Upload a photo
   - Submit

3. **Check if it appears on**: https://appdevking.github.io/vdirealty/fsbo-listings.html

4. **If it works**: 🎉 Congratulations! Your site is now live!

---

## 🔧 Troubleshooting

### "Failed to submit listing" Error

1. **Check Railway logs:**
   - Go to Railway dashboard → Your service → **"Deployments"** tab
   - Click on the latest deployment
   - Check the logs for errors

2. **Common issues:**
   - Missing environment variables
   - Volume not mounted correctly
   - Database file permissions

### Cannot connect to backend

1. **Verify the URL is correct** in `js/config.js`
2. **Check if backend is running:**
   - Visit: `https://your-railway-url.up.railway.app/api/health`
   - Should return JSON with `"status":"ok"`

### Photos not loading

1. **Check CORS settings** - already configured in your code
2. **Verify volume is mounted** at `/app/data`
3. **Check Railway logs** for file upload errors

### Database resets after deployment

❌ **You forgot to add a Volume!** Go back to Step 3.

---

## 💰 Railway Pricing

- **Free Tier**: $5 credit/month (no credit card required)
- **Usage**: ~$0.50-2/month for a small FSBO site
- **Upgrade**: Add credit card if you need more resources

**Your free credit should cover:**
- Small to medium traffic (hundreds of listings)
- A few hundred form submissions per month
- Basic file storage

---

## 🔒 Security Recommendations

1. **Never commit `.env` file** (already in `.gitignore` ✅)
2. **Use environment variables** for all secrets (already done ✅)
3. **Enable email notifications** so you know when listings are submitted
4. **Regular backups**: Download your database periodically

### How to backup your database:

Railway doesn't have automatic backups on free tier. To backup:

1. **Option 1: Use Railway CLI**
```bash
railway login
railway link
railway run node -e "require('better-sqlite3')('./data/fsbo.db').backup('./backup.db')"
```

2. **Option 2: Manual via code**
   - Add a backup endpoint (admin only)
   - Download database file through browser

---

## 🎯 Alternative: Render.com (Paid Option)

If Railway doesn't work for you, consider **Render.com**:

- Similar to Railway
- Requires paid plan for persistent disk ($7/month)
- More established company
- Better documentation

---

## ✅ Checklist

- [ ] Railway account created
- [ ] Backend deployed from GitHub
- [ ] Volume added and mounted to `/app/data`
- [ ] Environment variables configured
- [ ] Backend URL obtained
- [ ] `js/config.js` updated with Railway URL
- [ ] Changes committed and pushed
- [ ] Test listing submitted successfully
- [ ] Test listing appears in listings page
- [ ] Email notifications working (optional)

---

## 📞 Need Help?

If you encounter issues:

1. Check Railway documentation: https://docs.railway.app
2. Check Railway community: https://community.railway.app
3. Review your Railway deployment logs
4. Verify all environment variables are set correctly

---

## 🚀 You're Done!

Your FSBO listing feature is now live and accessible to anyone visiting your website!

**Your live backend**: `https://your-railway-url.up.railway.app`
**Your live website**: `https://appdevking.github.io/vdirealty`

Enjoy your fully functional FSBO listing platform! 🎉
