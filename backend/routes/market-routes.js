// Market data routes — auto-updating mortgage rates from FRED (Federal Reserve
// Bank of St. Louis), which republishes Freddie Mac's weekly Primary Mortgage
// Market Survey. No API key required. Responses are cached in memory for 12h;
// on upstream failure the last good values are served with stale:true.
const express = require('express');
const https = require('https');

const router = express.Router();

const SERIES = {
    thirtyYear: 'MORTGAGE30US',
    fifteenYear: 'MORTGAGE15US',
};
const CACHE_TTL_MS = 12 * 60 * 60 * 1000;
let cache = { at: 0, data: null };
let lastError = null;

function fetchSeries(seriesId) {
    return new Promise((resolve, reject) => {
        const req = https.get(
            `https://fred.stlouisfed.org/graph/fredgraph.csv?id=${seriesId}`,
            { headers: { 'User-Agent': 'VDIRealty/1.0 (market-rates)' }, timeout: 10000 },
            (res) => {
                if (res.statusCode !== 200) {
                    res.resume();
                    return reject(new Error(`FRED responded ${res.statusCode}`));
                }
                let body = '';
                res.on('data', (c) => { body += c; });
                res.on('end', () => {
                    try {
                        const lines = body.trim().split('\n');
                        for (let i = lines.length - 1; i >= 1; i--) {
                            const idx = lines[i].lastIndexOf(',');
                            const date = lines[i].slice(0, idx).trim();
                            const val = parseFloat(lines[i].slice(idx + 1).trim());
                            if (date && !Number.isNaN(val)) return resolve({ date, value: val });
                        }
                        reject(new Error('no usable rows in FRED csv'));
                    } catch (e) {
                        reject(e);
                    }
                });
            }
        );
        req.on('timeout', () => { req.destroy(new Error('FRED request timed out')); });
        req.on('error', reject);
    });
}

// GET /api/market/rates — latest 30-yr and 15-yr fixed mortgage averages
router.get('/rates', async (req, res) => {
    try {
        if (cache.data && Date.now() - cache.at < CACHE_TTL_MS) {
            return res.json(cache.data);
        }
        const [r30, r15] = await Promise.all([
            fetchSeries(SERIES.thirtyYear),
            fetchSeries(SERIES.fifteenYear),
        ]);
        const data = {
            success: true,
            source: 'Freddie Mac PMMS via FRED',
            fetchedAt: new Date().toISOString(),
            rates: {
                thirtyYear: { value: r30.value, weekOf: r30.date },
                fifteenYear: { value: r15.value, weekOf: r15.date },
            },
        };
        cache = { at: Date.now(), data };
        res.json(data);
    } catch (err) {
        lastError = `${new Date().toISOString()} — ${err.message}`;
        console.error('[market] rate fetch failed:', err.message);
        if (cache.data) return res.json({ ...cache.data, stale: true });
        res.status(502).json({ success: false, error: 'rate feed unavailable' });
    }
});

// GET /api/market/status — quick health check for the feed
router.get('/status', (req, res) => {
    res.json({
        success: true,
        cached: !!cache.data,
        cachedAt: cache.at ? new Date(cache.at).toISOString() : null,
        stale: cache.data ? Date.now() - cache.at > CACHE_TTL_MS : null,
        lastError,
    });
});

module.exports = router;
