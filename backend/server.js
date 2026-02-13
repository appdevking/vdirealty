require('dotenv').config();

const express = require('express');
const fs = require('fs');
const cors = require('cors');
const path = require('path');
const config = require('./config');
const { initDatabase } = require('./database');
const { initializeTransporter } = require('./email-service');
const { scheduleExpirationCheck, scheduleReminderEmails, runImmediateChecks } = require('./cron-jobs');
const fsboRoutes = require('./routes/fsbo-routes');
const contactRoutes = require('./routes/contact-routes');

// Initialize Express app
const app = express();

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
    console.log('📁 Created uploads directory');
}

// Middleware - CORS configuration
const corsOptions = {
    origin: [
        'https://appdevking.github.io',
        'https://www.vdirealty.com',
        'http://localhost:5500',
        'http://127.0.0.1:5500'
    ],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
};
app.use(cors(corsOptions));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// API Routes
app.use('/api/fsbo', fsboRoutes);
app.use('/api/contact', contactRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'ok',
        autoDeployed: true, // GitHub Actions auto-deployment active 
        message: 'VDI Realty FSBO API is running',
        timestamp: new Date().toISOString()
    });
});

// Initialize database
console.log('🗄️  Initializing database...');
initDatabase();

// Initialize email service
console.log('📧 Initializing email service...');
try {
    initializeTransporter();
    console.log('✅ Email service ready');
} catch (error) {
    console.error('⚠️  Email service initialization failed:', error.message);
    console.log('ℹ️  Server will continue without email functionality');
}

// Schedule cron jobs
console.log('⏰ Scheduling automated tasks...');
scheduleExpirationCheck();
scheduleReminderEmails();

// Run immediate checks on startup
runImmediateChecks();

// Start server
const PORT = config.port;
app.listen(PORT, () => {
    console.log('');
    console.log('═══════════════════════════════════════════════════');
    console.log('🚀 VDI Realty Backend Server Started!');
    console.log('═══════════════════════════════════════════════════');
    console.log(`📡 Server running on: http://localhost:${PORT}`);
    console.log(`🌐 API Base URL: http://localhost:${PORT}/api`);
    console.log(`📂 Upload Directory: ${config.uploadDir}`);
    console.log(`⏱️  Listing Duration: ${config.listingDurationDays} days`);
    console.log(`📧 Reminder: ${config.reminderDaysBefore} days before expiration`);
    console.log('');
    console.log('Available Endpoints:');
    console.log(`  POST   /api/fsbo/submit          - Submit new listing`);
    console.log(`  GET    /api/fsbo/listings        - Get all active listings`);
    console.log(`  GET    /api/fsbo/listing/:id     - Get single listing`);
    console.log(`  GET    /api/fsbo/photo/:filename - Get listing photo`);
    console.log(`  POST   /api/fsbo/contact/:id     - Contact seller`);
    console.log(`  POST   /api/contact/submit       - Submit contact form`);
    console.log(`  GET    /api/health               - Health check`);
    console.log('═══════════════════════════════════════════════════');
    console.log('');
});

// Error handling
process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('🛑 SIGTERM received, shutting down gracefully...');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('🛑 SIGINT received, shutting down gracefully...');
    process.exit(0);
});
