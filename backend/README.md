# VDI Realty FSBO Local Backend

Complete local implementation for handling FSBO property listings with automatic expiration, email notifications, and privacy protection.

## 🚀 Quick Start

### 1. Install Dependencies
```bash
cd backend
npm install
```

### 2. Configure Environment
```bash
# Copy the example environment file
copy .env.example .env

# Edit .env and add your email settings
```

### 3. Start the Server
```bash
npm start
```

The server will start on `http://localhost:3000`

## 📋 Features

✅ **Complete FSBO Management**
- Submit new property listings with multiple photos
- SQLite database (no external database required)
- 14-day automatic expiration
- Unlimited free relisting
- Privacy protection for seller contact info

✅ **Automated Email System**
- Confirmation emails to sellers
- Expiration reminder emails (2 days before)
- Admin notifications for new listings
- Supports Gmail, SendGrid, or custom SMTP

✅ **Scheduled Tasks**
- Daily expiration check (midnight)
- Daily reminder email check (9 AM)
- Automatic listing removal after 14 days

✅ **API Endpoints**
- `POST /api/fsbo/submit` - Submit listing
- `GET /api/fsbo/listings` - Get all active listings
- `GET /api/fsbo/listing/:id` - Get single listing
- `GET /api/fsbo/photo/:filename` - Serve photos
- `POST /api/fsbo/contact/:id` - Contact seller (for private listings)

## ⚙️ Configuration

### Email Setup (Choose One Option)

#### Option 1: Gmail (Easiest for Testing)
1. Go to [Google App Passwords](https://myaccount.google.com/apppasswords)
2. Create a new app password
3. Add to `.env`:
```env
EMAIL_SERVICE=gmail
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-16-char-app-password
```

#### Option 2: SendGrid
```env
EMAIL_SERVICE=sendgrid
SENDGRID_API_KEY=your-sendgrid-api-key
```

#### Option 3: Custom SMTP
```env
EMAIL_SERVICE=custom
EMAIL_HOST=smtp.yourdomain.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=noreply@yourdomain.com
EMAIL_PASSWORD=your-password
```

### Website Configuration
```env
WEBSITE_URL=http://localhost:5500  # Or your actual domain
ADMIN_EMAIL=admin@vdirealty.com
```

## 📁 Project Structure

```
backend/
├── server.js              # Main Express server
├── config.js              # Configuration management
├── database.js            # SQLite database setup
├── email-service.js       # Email sending functionality
├── cron-jobs.js           # Scheduled tasks
├── routes/
│   └── fsbo-routes.js     # API route handlers
├── uploads/               # Photo storage directory
├── fsbo.db                # SQLite database (created automatically)
├── package.json           # Dependencies
├── .env.example           # Environment template
└── .env                   # Your configuration (create this)
```

## 🗄️ Database Schema

### Listings Table
- id, firstName, lastName, email, phone
- address, city, state, zip
- propertyType, price, sqft, bedrooms, bathrooms
- yearBuilt, lotSize, features, description
- privateContact, submissionDate, expirationDate
- status, reminderSent, createdAt, updatedAt

### Photos Table
- id, listingId, filename, originalName
- path, size, mimeType, displayOrder
- createdAt

## 🔄 Automated Processes

### Daily Expiration Check (Midnight)
- Finds listings where `expirationDate < now`
- Updates status to 'expired'
- Removes from public display

### Daily Reminder Check (9 AM)
- Finds listings expiring in 2 days
- Sends reminder email to seller
- Marks reminder as sent

### Immediate Startup Checks
- Expires old listings on server start
- Logs listings needing reminders

## 📧 Email Templates

### Confirmation Email
- Sent immediately after listing submission
- Includes property details
- Shows expiration date
- Link to view listing

### Reminder Email
- Sent 2 days before expiration
- Highlights urgency
- "Relist Now" button
- Free unlimited relisting message

### Admin Notification
- New listing alert
- Seller contact info
- Property summary
- Link to view all listings

## 🔒 Security Features

- File upload validation (images only, 5MB max)
- Privacy protection (hide seller contact if requested)
- SQL injection prevention (prepared statements)
- Directory traversal protection
- CORS enabled for frontend access

## 🧪 Testing

### Test the API
```bash
# Health check
curl http://localhost:3000/api/health

# Get all listings
curl http://localhost:3000/api/fsbo/listings

# Test with frontend
# Open fsbo.html in browser and submit a test listing
```

### Development Mode (Auto-restart)
```bash
npm run dev
```

## 🚀 Production Deployment

### 1. Use Process Manager
```bash
npm install -g pm2
pm2 start server.js --name "vdi-fsbo-backend"
pm2 save
pm2 startup
```

### 2. Set Production Environment
```env
NODE_ENV=production
WEBSITE_URL=https://yourdomain.com
```

### 3. Use Production Database
- Consider PostgreSQL or MySQL for production
- Backup SQLite database regularly
- Monitor disk space for photo uploads

### 4. Reverse Proxy (Nginx)
```nginx
location /api/fsbo {
    proxy_pass http://localhost:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_cache_bypass $http_upgrade;
}
```

## 📊 Monitoring

### Logs
- Server logs: console output
- Email delivery: check email service logs
- Database: monitor fsbo.db file size

### Common Issues

**Email not sending:**
- Check `.env` configuration
- Verify email credentials
- Check console for error messages
- Test with a simple test script

**Photos not displaying:**
- Check uploads directory permissions
- Verify file paths in database
- Check CORS settings

**Listings not expiring:**
- Check server is running continuously
- Verify cron jobs are scheduled
- Check system time is correct

## 🔧 Maintenance

### Backup Database
```bash
# SQLite database backup
copy fsbo.db fsbo-backup-2025-12-26.db
```

### Clean Old Photos
```javascript
// Add to cron-jobs.js to clean expired listing photos
// Delete photos older than 30 days
```

### Monitor Disk Space
- Each listing: ~50MB (10 photos × 5MB)
- 100 listings: ~5GB
- Set up disk space monitoring

## 🆘 Support

For issues or questions:
1. Check server console logs
2. Verify `.env` configuration
3. Test email service separately
4. Check database file exists and is writable

## 📄 License

Proprietary - VDI Realty
