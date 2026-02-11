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
   - Click **"+ New Project"** (big button at top right or center)
   - Select **"Deploy from GitHub repo"**
   - Railway will ask you to authorize GitHub access (click "Authorize")
   - You'll see a list of your repositories
   - Search for and select: `appdevking/vdirealty`
   - Railway will detect it as a Node.js project

2. **Configure the deployment:**
   - Railway will auto-detect `package.json` in the `/backend` folder
   - **IMPORTANT**: Set the **Root Directory** to `backend`
     - Click on your service card after it starts deploying
     - Go to **"Settings"** tab
     - Find **"Root Directory"** or **"Source"**
     - Set it to: `backend`
     - Click **"Save"** or it may auto-save
   - Railway will automatically run `npm install` and `npm start`

3. **Wait for deployment:**
   - Railway will build and deploy your app (takes 1-2 minutes)
   - You'll see build logs in real-time
   - Look for ✅ **"SUCCESS"** message when done
   - The service status should change to **"Active"** or show a green indicator

---

## Step 3: Add Persistent Storage (CRITICAL!)

Your app needs persistent storage for:
- SQLite database (`fsbo.db`)
- Uploaded property photos

### Detailed Instructions:

1. **Navigate to your deployed service:**
   - After deployment (from Step 2), you'll see your Railway dashboard
   - You should see a card/tile with your project name (it might say "vdi-realty-fsbo-backend" or similar)
   - **Click on that card** - this is "your service"
   - You'll now see tabs at the top like: **Settings**, **Variables**, **Metrics**, **Deployments**, etc.

2. **Go BACK to the Project Dashboard:**
   - **IMPORTANT**: The "+ New" button is NOT in the service tabs!
   - You need to go back to the project view
   - Look for a **back arrow** or click on your **project name** at the top (usually says "vdirealty")
   - OR click the **Railway logo** in the top left to go to the main dashboard
   - You should now see your project canvas with service cards/boxes

3. **Add a Volume (Persistent Storage):**
   - Now you should see a **"+ New"** button or **"Create"** button on the project canvas
   - **Click "+ New"** → Select **"Volume"** or **"Add Volume"**
   
   **If you still don't see it:**
   - Right-click on the canvas (empty space in your project)
   - Look for "Add Service" or "New Volume"
   - OR look in the top-right corner for a **"+"** icon

4. **Configure the volume:**
   - **Mount Path**: Type exactly `/app/data` (this is critical!)
   - **Name**: `vdi-storage` (or any name you prefer - doesn't matter)
   - Click **"Add"** or **"Create Volume"**

5. **Link the volume to your service:**
   - After creating the volume, you'll see it as a new card/box in your project
   - Railway will ask you to **connect it to a service**
   - **Drag and drop** the volume card to your service card, OR
   - Click on the volume → **Connect to Service** → Select your backend service
   - Railway will automatically restart your service to mount the volume

6. **Verify the volume is mounted:**
   - Click on your service card again
   - Go to the **"Settings"** tab
   - Scroll down to find **"Volumes"** section
   - You should see: `vdi-storage` mounted at `/app/data`

> **✅ Your backend code is already updated!** The code automatically uses `/app/data` in production mode.

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

**⚠️ IMPORTANT: You must complete Step 5 first to get your actual Railway URL!**

1. **Get your Railway URL from Step 5:**
   - It will look something like: `https://vdirealty-production-abc123.up.railway.app`
   - The exact URL will be different - Railway assigns it automatically
   - You can find it in Railway → Your Service → **Settings** tab → **Domains** section

2. **Open** `js/config.js` in your project (in VS Code or your text editor)

3. **Replace the localhost URL** with YOUR ACTUAL Railway URL:

**BEFORE (current code):**
```javascript
const CONFIG = {
    API_BASE_URL: 'http://localhost:3000' // This only works on your computer
};
```

**AFTER (what you need to change it to):**
```javascript
const CONFIG = {
    API_BASE_URL: 'https://vdirealty-production-abc123.up.railway.app' // Replace with YOUR actual Railway URL
};
```

**Example:** If Railway gave you `https://vdi-backend-xyz789.up.railway.app`, then you would use:
```javascript
const CONFIG = {
    API_BASE_URL: 'https://vdi-backend-xyz789.up.railway.app'
};
```

> **⚠️ DO NOT copy "your-railway-url" literally!** Replace it with your actual URL from Railway.

4. **Save the file**

5. **Commit and push** the change:
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
