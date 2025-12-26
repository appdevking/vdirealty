require('dotenv').config();

module.exports = {
    // Server
    port: process.env.PORT || 3000,
    nodeEnv: process.env.NODE_ENV || 'development',
    
    // Email
    email: {
        service: process.env.EMAIL_SERVICE || 'gmail',
        host: process.env.EMAIL_HOST,
        port: process.env.EMAIL_PORT,
        secure: process.env.EMAIL_SECURE === 'true',
        user: process.env.EMAIL_USER,
        password: process.env.EMAIL_PASSWORD,
        sendgridApiKey: process.env.SENDGRID_API_KEY
    },
    
    // Website
    websiteUrl: process.env.WEBSITE_URL || 'http://localhost:5500',
    adminEmail: process.env.ADMIN_EMAIL || 'admin@vdirealty.com',
    
    // Listing settings
    listingDurationDays: parseInt(process.env.LISTING_DURATION_DAYS) || 14,
    reminderDaysBefore: parseInt(process.env.REMINDER_DAYS_BEFORE) || 2,
    
    // File upload
    maxFileSize: 5 * 1024 * 1024, // 5MB
    maxFiles: 10,
    uploadDir: './uploads'
};
