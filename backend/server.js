require('dotenv').config();

const express = require('express');
const fs = require('fs');
const cors = require('cors');
const path = require('path');
const config = require('./config');
const { initDatabase } = require('./database');
const { initializeTransporter } = require('./email-service');
const { scheduleExpirationCheck, scheduleReminderEmails, runImmediateChecks, scheduleVisitCountsReset } = require('./cron-jobs');
const fsboRoutes = require('./routes/fsbo-routes');
const fsboSmsRoutes = require('./routes/fsbo-sms-routes');
const contactRoutes = require('./routes/contact-routes');
const marketRoutes = require('./routes/market-routes');

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

// --- Visit Logging Middleware ---
const visitCountsPath = path.join(__dirname, 'visit-counts.json');
const attribPath = path.join(__dirname, 'visit-attribution.json');
function recordAttribution({ page, utm_source, utm_medium, utm_campaign, utm_content, referrer }) {
    if (!utm_source && !utm_medium && !utm_campaign) return;
    let log = [];
    try {
        log = JSON.parse(fs.readFileSync(attribPath, 'utf8'));
        if (!Array.isArray(log)) log = [];
    } catch (e) { log = []; }
    log.push({
        ts: new Date().toISOString(),
        page: (page || '/').slice(0, 100),
        utm_source: (utm_source || '').slice(0, 40),
        utm_medium: (utm_medium || '').slice(0, 40),
        utm_campaign: (utm_campaign || '').slice(0, 60),
        utm_content: (utm_content || '').slice(0, 80),
        referrer: (referrer || '').slice(0, 200)
    });
    if (log.length > 5000) log = log.slice(log.length - 5000);
    try { fs.writeFileSync(attribPath, JSON.stringify(log)); } catch (e) {}
}
function logVisit(req, res, next) {
    // Only log GET requests to HTML pages (not API or static)
    if (req.method === 'GET' && !req.path.startsWith('/api') && !req.path.startsWith('/uploads')) {
        let counts;
        try {
            counts = JSON.parse(fs.readFileSync(visitCountsPath, 'utf8'));
        } catch (e) {
            counts = { pageVisits: {} };
        }
        const page = req.path === '/' ? '/index.html' : req.path;
        if (!counts.pageVisits[page]) {
            counts.pageVisits[page] = 0;
        }
        counts.pageVisits[page] += 1;
        fs.writeFileSync(visitCountsPath, JSON.stringify(counts, null, 2));

        // Attribution: log visits carrying UTM params (video description links)
        const q = req.query || {};
        recordAttribution({
            page,
            utm_source: q.utm_source, utm_medium: q.utm_medium,
            utm_campaign: q.utm_campaign, utm_content: q.utm_content,
            referrer: req.get('referer')
        });
    }
    next();
}
app.use(logVisit);

// Attribution pixel: static pages beacon UTM visits here (CORS-open to the site).
app.post('/api/stats/attribution/pixel', (req, res) => {
    const b = req.body || {};
    recordAttribution({
        page: b.page, utm_source: b.utm_source, utm_medium: b.utm_medium,
        utm_campaign: b.utm_campaign, utm_content: b.utm_content,
        referrer: b.referrer
    });
    res.json({ ok: true });
});

// Public aggregate attribution stats (counts only, no personal data)
app.get('/api/stats/attribution', (req, res) => {
    let log = [];
    try {
        log = JSON.parse(fs.readFileSync(attribPath, 'utf8'));
        if (!Array.isArray(log)) log = [];
    } catch (e) { log = []; }
    const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const byContent = {};
    const bySource = {};
    let total = 0;
    for (const e of log) {
        if (new Date(e.ts).getTime() < cutoff) continue;
        total++;
        const ckey = `${e.utm_source || '?'} / ${e.utm_content || '?'}`;
        byContent[ckey] = (byContent[ckey] || 0) + 1;
        bySource[e.utm_source || '?'] = (bySource[e.utm_source || '?'] || 0) + 1;
    }
    res.json({ total30d: total, bySource, byContent });
});

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// API Routes
app.use('/api/fsbo', fsboRoutes);
app.use('/api/fsbo/sms', fsboSmsRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/market', marketRoutes);

// Health check endpoint

app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'ok',
        autoDeployed: true, // GitHub Actions auto-deployment active 
        message: 'VDI Realty FSBO API is running',
        timestamp: new Date().toISOString()
    });
});

// --- Visit Stats API ---
app.get('/api/visit-stats', (req, res) => {
    try {
        const counts = JSON.parse(fs.readFileSync(path.join(__dirname, 'visit-counts.json'), 'utf8'));
        res.json(counts);
    } catch (e) {
        res.status(500).json({ error: 'Could not read visit stats' });
    }
});

// Serve the visit dashboard
app.get('/dashboard/visits', (req, res) => {
    res.sendFile(path.join(__dirname, 'visit-dashboard.html'));
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
scheduleVisitCountsReset();

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
