// Market data routes — mortgage rates served from backend/data/rates.json,
// which is refreshed weekly (Fridays) from Freddie Mac's Primary Mortgage
// Market Survey by an automated job. No API key or third-party fetch needed.
const express = require('express');
const fs = require('fs');
const path = require('path');

const router = express.Router();
const RATES_FILE = path.join(__dirname, '..', 'data', 'rates.json');

function readRates() {
    const raw = fs.readFileSync(RATES_FILE, 'utf8');
    return JSON.parse(raw);
}

// GET /api/market/rates — latest 30-yr and 15-yr fixed mortgage averages
router.get('/rates', (req, res) => {
    try {
        const data = readRates();
        res.json({ success: true, ...data });
    } catch (err) {
        console.error('[market] failed to read rates.json:', err.message);
        res.status(502).json({ success: false, error: 'rate feed unavailable' });
    }
});

// GET /api/market/status — quick health check for the feed
router.get('/status', (req, res) => {
    try {
        const data = readRates();
        res.json({ success: true, weekOf: data.rates.thirtyYear.weekOf, source: data.source });
    } catch (err) {
        res.status(502).json({ success: false, error: 'rate feed unavailable' });
    }
});

module.exports = router;
