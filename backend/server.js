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
const adminConfigRoutes = require('./routes/admin-config-routes');

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

// --- Tool-use stats: calculators on tools.html beacon first result per page view ---
const toolUsePath = path.join(__dirname, 'tool-use.json');
const TOOL_SLUGS = ['rent-vs-buy', 'seller-net-sheet', 'free-and-clear', 'sell-or-hold-tax', 'sell-or-rent', 'exchange-1031', 'adu-payback', 'mortgage-payment', 'affordability', 'closing-costs', 'lot-check'];
function readToolUseLog() {
    let log = [];
    try {
        log = JSON.parse(fs.readFileSync(toolUsePath, 'utf8'));
        if (!Array.isArray(log)) log = [];
    } catch (e) { log = []; }
    return log;
}

// Tool-use beacon: counts only, no personal data. Unknown tool -> 400.
app.post('/api/stats/tool-use', (req, res) => {
    const tool = (req.body || {}).tool;
    if (!TOOL_SLUGS.includes(tool)) {
        return res.status(400).json({ error: 'unknown tool' });
    }
    const log = readToolUseLog();
    log.push({ ts: new Date().toISOString(), tool });
    const trimmed = log.length > 10000 ? log.slice(log.length - 10000) : log;
    try { fs.writeFileSync(toolUsePath, JSON.stringify(trimmed)); } catch (e) {}
    res.json({ ok: true });
});

// Public aggregate tool-use stats (counts only, no personal data)
app.get('/api/stats/tool-use', (req, res) => {
    const log = readToolUseLog();
    const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const byTool = {};
    const byTool30d = {};
    for (const s of TOOL_SLUGS) { byTool[s] = 0; byTool30d[s] = 0; }
    let total30d = 0;
    for (const e of log) {
        if (!TOOL_SLUGS.includes(e.tool)) continue;
        byTool[e.tool] += 1;
        if (new Date(e.ts).getTime() >= cutoff) {
            byTool30d[e.tool] += 1;
            total30d++;
        }
    }
    res.json({ total: log.length, total30d, byTool, byTool30d });
});

// --- Site traffic stats: every page beacons its view (page + referrer source only) ---
const pageViewsPath = path.join(__dirname, 'page-views.json');
function readPageViewsLog() {
    let log = [];
    try {
        log = JSON.parse(fs.readFileSync(pageViewsPath, 'utf8'));
        if (!Array.isArray(log)) log = [];
    } catch (e) { log = []; }
    return log;
}
function sourceFromRef(ref) {
    if (!ref || typeof ref !== 'string') return 'direct';
    let host = '';
    try { host = new URL(ref).hostname.toLowerCase(); } catch (e) { return 'direct'; }
    if (!host || host === 'vdirealty.com' || host === 'www.vdirealty.com') return 'direct';
    if (host === 'youtu.be' || host === 'youtube.com' || host.endsWith('.youtube.com')) return 'youtube';
    if (host === 'fb.com' || host === 'facebook.com' || host.endsWith('.facebook.com')) return 'facebook';
    if (host === 'instagram.com' || host.endsWith('.instagram.com')) return 'instagram';
    if (host.includes('google.')) return 'google';
    if (host === 'chatgpt.com' || host.endsWith('.chatgpt.com')) return 'chatgpt';
    if (host === 'bing.com' || host.endsWith('.bing.com')) return 'bing';
    return ('other:' + host).slice(0, 60);
}

// Pageview beacon: page path + derived source + time only. No IP, no user agent, no cookies.
app.post('/api/stats/pageview', (req, res) => {
    const b = req.body || {};
    const page = b.page;
    const valid = typeof page === 'string' && page.length > 0 && page.length <= 200 &&
        (page.startsWith('/') || !page.includes('/')) && !page.includes('..');
    if (!valid) {
        return res.status(400).json({ error: 'invalid page' });
    }
    const log = readPageViewsLog();
    log.push({ ts: new Date().toISOString(), page, source: sourceFromRef(b.ref) });
    const trimmed = log.length > 10000 ? log.slice(log.length - 10000) : log;
    try { fs.writeFileSync(pageViewsPath, JSON.stringify(trimmed)); } catch (e) {}
    res.json({ ok: true });
});

// Public aggregate traffic stats (counts only, no personal data)
app.get('/api/stats/traffic', (req, res) => {
    const log = readPageViewsLog();
    const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const byPage = {};
    const bySource = {};
    const byPage30d = {};
    const bySource30d = {};
    let total30d = 0;
    for (const e of log) {
        byPage[e.page] = (byPage[e.page] || 0) + 1;
        bySource[e.source] = (bySource[e.source] || 0) + 1;
        if (new Date(e.ts).getTime() >= cutoff) {
            byPage30d[e.page] = (byPage30d[e.page] || 0) + 1;
            bySource30d[e.source] = (bySource30d[e.source] || 0) + 1;
            total30d++;
        }
    }
    res.json({ total: log.length, total30d, byPage, bySource, byPage30d, bySource30d });
});

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// API Routes
app.use('/api/fsbo', fsboRoutes);
app.use('/api/fsbo/sms', fsboSmsRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/market', marketRoutes);
app.use('/api/admin', adminConfigRoutes);

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
