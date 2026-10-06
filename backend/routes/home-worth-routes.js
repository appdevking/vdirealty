// Home Worth routes — "What's my home worth?" free value-report requests.
//
// Homeowners submit property + contact details; the request is stored and
// Veng gets a notification email, and the requester gets a confirmation.
// There is no instant automated valuation (no MLS/Zillow API access) — the
// report is prepared by a human, which is the tool's stated promise.
const express = require('express');
const { statements } = require('../database');
const {
    sendHomeWorthNotification,
    sendHomeWorthConfirmation,
    isEmailConfigured
} = require('../email-service');
const config = require('../config');

const router = express.Router();

/* Rate limit: 20 submissions / minute / IP — same guard as the Listing Writer. */
const rateBuckets = new Map();
setInterval(() => {
    const now = Date.now();
    for (const [k, b] of rateBuckets) {
        if (now - b.start > 2 * 60 * 1000) rateBuckets.delete(k);
    }
}, 60 * 1000).unref();

function overLimit(ip) {
    const now = Date.now();
    const key = 'home-worth:' + ip;
    let b = rateBuckets.get(key);
    if (!b || now - b.start > 60 * 1000) b = { start: now, count: 0 };
    b.count += 1;
    rateBuckets.set(key, b);
    return b.count > 20;
}

/* Treat every user-supplied field as plain data: coerce to string, cap
 * length, strip control characters. */
function cleanStr(v, max) {
    if (v === null || v === undefined) return '';
    let s = String(v).replace(/[\u0000-\u001f\u007f]/g, ' ').trim();
    if (s.length > max) s = s.slice(0, max);
    return s;
}
function cleanNum(v) {
    const n = Number(v);
    return Number.isFinite(n) && n >= 0 ? n : null;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const ZIP_RE = /^\d{5}(-\d{4})?$/;
const CONDITIONS = ['Excellent', 'Good', 'Fair', 'Needs work'];
const TIMELINES = ['ASAP', '3-6 months', 'Just curious'];

// POST /api/home-worth/request
router.post('/request', async (req, res) => {
    try {
        const ip = req.ip || 'unknown';
        if (overLimit(ip)) {
            return res.status(429).json({ error: 'Too many requests. Please try again shortly.' });
        }

        const body = req.body || {};

        // Honeypot: bots fill it; humans never see it. Swallow silently.
        if (cleanStr(body.website, 200)) {
            return res.json({ success: true, message: 'Request received.' });
        }

        const name = cleanStr(body.name, 100);
        const email = cleanStr(body.email, 120);
        const phone = cleanStr(body.phone, 30);
        const address = cleanStr(body.address, 150);
        const city = cleanStr(body.city, 80);
        const zip = cleanStr(body.zip, 10);
        const beds = cleanNum(body.beds);
        const baths = cleanNum(body.baths);
        const sqft = cleanNum(body.sqft);
        const condition = CONDITIONS.includes(body.condition) ? body.condition : '';
        const timeline = TIMELINES.includes(body.timeline) ? body.timeline : '';

        if (!name || !email || !address || !city || !zip) {
            return res.status(400).json({
                error: 'Missing required fields: name, email, street address, city, and ZIP are required.'
            });
        }
        if (!EMAIL_RE.test(email)) {
            return res.status(400).json({ error: 'Invalid email address.' });
        }
        if (!ZIP_RE.test(zip)) {
            return res.status(400).json({ error: 'Invalid ZIP code.' });
        }

        const info = statements.insertHomeWorthRequest.run(
            name, email, phone, address, city, zip, beds, baths, sqft, condition, timeline
        );
        const request = {
            id: info.lastInsertRowid,
            name, email, phone, address, city, zip,
            beds, baths, sqft, condition, timeline,
            createdAt: new Date().toISOString()
        };

        if (isEmailConfigured()) {
            try {
                await sendHomeWorthNotification(request);
                console.log(`[home-worth] notification sent to ${config.adminEmail}`);
            } catch (emailError) {
                console.error('[home-worth] notification email failed:', emailError.message);
            }
            try {
                await sendHomeWorthConfirmation(request);
            } catch (emailError) {
                console.error('[home-worth] confirmation email failed:', emailError.message);
            }
        } else {
            console.log('⚠️ [home-worth] Email not configured - request logged only:', request.id);
        }

        return res.json({
            success: true,
            message: 'Your report is being prepared — expect it within one business day.'
        });
    } catch (err) {
        console.error('[home-worth] request failed:', err.message);
        return res.status(500).json({ error: 'Failed to submit request. Please try again later.' });
    }
});

/* ------------------------------------------------------------------ */
/* Admin                                                               */
/* ------------------------------------------------------------------ */

// Admin authentication middleware (pre-existing scheme: shared password header)
const adminAuth = (req, res, next) => {
    const password = req.headers.authorization;
    if (password && password === config.adminPassword) {
        next();
    } else {
        res.status(401).json({ error: 'Unauthorized' });
    }
};

// Admin: all home-worth requests, newest first
router.get('/admin/requests', adminAuth, (req, res) => {
    try {
        const requests = statements.getAllHomeWorthRequests.all();
        const open = requests.filter((r) => (r.status || 'new') === 'new').length;
        res.json({ success: true, count: requests.length, open, requests });
    } catch (error) {
        console.error('[home-worth] Error fetching requests:', error);
        res.status(500).json({ error: 'Failed to fetch home-worth requests' });
    }
});

// Admin: mark a request closed (report delivered)
router.post('/admin/requests/:id/closed', adminAuth, (req, res) => {
    try {
        const id = Number(req.params.id) || 0;
        statements.markHomeWorthRequestClosed.run(id);
        res.json({ success: true, message: 'Request marked closed.' });
    } catch (error) {
        console.error('[home-worth] Error closing request:', error);
        res.status(500).json({ error: 'Failed to update request' });
    }
});

// Admin: delete a request (test-row cleanup)
router.delete('/admin/requests/:id', adminAuth, (req, res) => {
    try {
        const id = Number(req.params.id) || 0;
        statements.deleteHomeWorthRequest.run(id);
        res.json({ success: true, message: 'Request deleted.' });
    } catch (error) {
        console.error('[home-worth] Error deleting request:', error);
        res.status(500).json({ error: 'Failed to delete request' });
    }
});

module.exports = router;
