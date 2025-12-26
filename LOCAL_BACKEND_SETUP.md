# VDI Realty FSBO - Complete Local Implementation

✅ **Complete local backend has been created!**

## 📦 What Was Built

### Backend Server (Node.js/Express)
- **server.js** - Main Express server
- **database.js** - SQLite database with auto-initialization
- **email-service.js** - Email notifications (confirmation + reminders)
- **cron-jobs.js** - Automated expiration and reminder tasks
- **routes/fsbo-routes.js** - API endpoints for FSBO operations
- **config.js** - Centralized configuration

### Frontend Integration
- **fsbo.html** - Updated to submit to local API
- **fsbo-listings.html** - Updated to load listings from local database

### Features Implemented
✅ Form submission with multi-file upload
✅ SQLite database (no external DB needed)
✅ 14-day automatic expiration
✅ Email confirmations to sellers
✅ Email reminders 2 days before expiration
✅ Privacy protection support
✅ Admin notifications
✅ Photo storage and serving
✅ RESTful API
✅ Unlimited free relisting

## 🚀 Installation & Setup (5 Minutes)

### Step 1: Install Node.js
If you don't have Node.js installed:
1. Download from https://nodejs.org/
2. Install LTS version (recommended)
3. Verify installation:
```powershell
node --version
npm --version
```

### Step 2: Install Dependencies
```powershell
cd backend
npm install
```

This will install:
- express (web server)
- cors (cross-origin requests)
- multer (file uploads)
- better-sqlite3 (database)
- nodemailer (emails)
- node-cron (scheduled tasks)
- dotenv (configuration)

### Step 3: Configure Email
```powershell
# Copy example config
copy .env.example .env

# Edit .env file
notepad .env
```

**For Gmail (Easiest):**
1. Go to https://myaccount.google.com/apppasswords
2. Create new app password
3. Add to .env:
```
EMAIL_SERVICE=gmail
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=xxxx-xxxx-xxxx-xxxx
ADMIN_EMAIL=your-email@gmail.com
```

### Step 4: Start the Server
```powershell
npm start
```

You should see:
```
🚀 VDI Realty FSBO Backend Server Started!
📡 Server running on: http://localhost:3000
```

### Step 5: Test the Form
1. Open `fsbo.html` in your browser
2. Fill out the form with test data
3. Upload a test image
4. Submit!

The listing will:
- ✅ Save to database
- ✅ Send confirmation email
- ✅ Appear on fsbo-listings.html
- ✅ Auto-expire in 14 days

## 📋 API Endpoints

All endpoints are at `http://localhost:3000/api/fsbo/`

### POST /submit
Submit new FSBO listing
- **Form fields**: All property details
- **Files**: Up to 10 photos (5MB each)
- **Returns**: `{ success, listingId, expirationDate }`

### GET /listings
Get all active listings
- **Returns**: Array of active listings with photos
- **Privacy**: Hides contact info if privateContact=true

### GET /listing/:id
Get single listing by ID
- **Returns**: Full listing details with photos

### GET /photo/:filename
Serve listing photo
- **Returns**: Image file

### POST /contact/:listingId
Contact seller (for private listings)
- **Body**: `{ name, email, phone, message }`
- **Action**: Forwards message to seller

## ⏰ Automated Tasks

### Daily at Midnight
- ✅ Check for expired listings
- ✅ Update status to 'expired'
- ✅ Remove from public display

### Daily at 9 AM
- ✅ Find listings expiring in 2 days
- ✅ Send reminder emails
- ✅ Mark reminders as sent

### On Server Start
- ✅ Initialize database
- ✅ Expire old listings
- ✅ Check for pending reminders

## 📧 Email Templates

### Confirmation Email
Sent immediately after submission:
- Property details summary
- Expiration date
- Link to view listing
- Instructions for relisting

### Reminder Email
Sent 2 days before expiration:
- Days remaining notice
- Property summary
- "Relist Now" button
- Free unlimited relisting message

### Admin Notification
Sent to admin email:
- New listing alert
- Seller contact info
- Property summary

## 🗄️ Database

**Location**: `backend/fsbo.db` (created automatically)

**Tables**:
- `listings` - Property listings
- `photos` - Uploaded photos

**Backup**:
```powershell
copy backend\fsbo.db backend\fsbo-backup.db
```

## 📁 File Storage

**Location**: `backend/uploads/`

**Format**: `listing-{timestamp}-{random}.jpg`

**Access**: `http://localhost:3000/uploads/{filename}`

## 🔧 Configuration Options

Edit `.env` to customize:

```env
# Server
PORT=3000                      # API server port
NODE_ENV=development           # development or production

# Listing Duration
LISTING_DURATION_DAYS=14       # How long listings stay active
REMINDER_DAYS_BEFORE=2         # When to send reminder

# Website
WEBSITE_URL=http://localhost:5500    # Your website URL
ADMIN_EMAIL=admin@vdirealty.com      # Admin notifications
```

## 🚀 Production Deployment

### Option 1: Windows Server
```powershell
# Install as Windows Service using PM2
npm install -g pm2-windows-service
npm install -g pm2
pm2 start server.js --name vdi-fsbo
pm2 save
pm2-service-install
```

### Option 2: Linux Server
```bash
# Install PM2
npm install -g pm2
pm2 start server.js --name vdi-fsbo
pm2 startup
pm2 save
```

### Option 3: Cloud Hosting
- **Heroku**: Deploy with Heroku CLI
- **AWS EC2**: Run on Ubuntu instance
- **DigitalOcean**: Deploy on droplet
- **Azure**: Use App Service

### Update Frontend URLs
When deploying, update API URLs in:
- `fsbo.html` line ~773: Change `http://localhost:3000` to your domain
- `fsbo-listings.html` line ~1010: Change `http://localhost:3000` to your domain

## 🧪 Testing

### Test Form Submission
1. Open http://localhost:5500/fsbo.html
2. Fill out form
3. Upload image
4. Submit
5. Check console for success
6. Check email for confirmation

### Test Listings Display
1. Open http://localhost:5500/fsbo-listings.html
2. Should show submitted listings
3. Check privacy protection works
4. Test filters and sorting

### Test API Directly
```powershell
# Check server health
curl http://localhost:3000/api/health

# Get all listings
curl http://localhost:3000/api/fsbo/listings
```

## 📊 Monitoring

### Check Server Logs
Watch the console where server is running for:
- New submissions
- Email deliveries
- Expiration checks
- Reminder emails

### Check Database
```powershell
# Install SQLite browser
# Open backend\fsbo.db
# View tables: listings, photos
```

## 🆘 Troubleshooting

### "Cannot find module..."
```powershell
cd backend
npm install
```

### "Email not sending"
- Check .env EMAIL configuration
- Verify app password is correct
- Check console for email errors
- Test with different email service

### "Photos not displaying"
- Check uploads directory exists
- Verify file uploaded successfully
- Check CORS settings
- Check photo URL in database

### "CORS error"
- Backend must be running
- Check frontend URL matches
- Verify CORS enabled in server.js

### "Port 3000 already in use"
- Change PORT in .env to 3001
- Update API URLs in frontend
- Or stop process using port 3000

## 📚 Next Steps

1. ✅ **Test locally** - Submit test listings
2. ✅ **Configure email** - Set up production email service
3. ✅ **Customize emails** - Edit templates in email-service.js
4. ⬜ **Add admin dashboard** - View/manage listings
5. ⬜ **Deploy to production** - Choose hosting platform
6. ⬜ **Set up domain** - Point domain to backend
7. ⬜ **Enable HTTPS** - SSL certificate for production
8. ⬜ **Set up backups** - Automated database backups

## 🎉 You're Done!

Your complete local FSBO system is ready:
- ✅ 14-day auto-expiration
- ✅ Email notifications
- ✅ Privacy protection
- ✅ Unlimited relisting
- ✅ Photo uploads
- ✅ Full database

**Start the server and submit your first listing!**

```powershell
cd backend
npm start
```

Then open: http://localhost:5500/fsbo.html

---

**Need help?** Check:
- backend/README.md - Detailed backend documentation
- Server console - Real-time logs
- Email inbox - Confirmation emails
