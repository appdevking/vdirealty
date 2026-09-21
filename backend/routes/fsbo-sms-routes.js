// FSBO SMS routes — the text-a-ZIP lead flow for VDI Realty.
//
// A consumer texts a 5-digit ZIP code to our number. We reply (TwiML) with up
// to 3 matching active FSBO listings, or a no-results message with an option
// to get alerts. Replying YES opts the number into future listing alerts;
// STOP unsubscribes. Texting a ZIP records the phone + ZIP as an inquiry lead
// but does NOT authorize future marketing — only an explicit YES does.
//
// Twilio-compatible: Twilio POSTs form-encoded { From, Body, ... } to
// POST /api/fsbo/sms/webhook. If TWILIO_AUTH_TOKEN is set, the request
// signature is validated (X-Twilio-Signature); otherwise validation is
// skipped and the endpoint is rate-limited per phone number.

const express = require('express');
const crypto = require('crypto');
const { statements } = require('../database');

const router = express.Router();

const BRAND = 'VDI Realty';
const BROKERAGE_DISCLOSURE = 'VDI Realty — brokered by Realty Connect';

// ---------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------

const escapeXml = (s) =>
    String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');

const twiml = (message) => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${escapeXml(message)}</Message></Response>`;
    return (res) => res.type('text/xml').send(xml);
};

const fmtMoney = (n) => (n == null ? '' : '$' + Number(n).toLocaleString('en-US'));

const listingLink = (id) => `https://www.vdirealty.com/fsbo-listings.html#listing-${id}`;

const summarizeListing = (l, idx) => {
    const beds = l.bedrooms ? `${l.bedrooms}bd` : null;
    const baths = l.bathrooms ? `${l.bathrooms}ba` : null;
    const sqft = l.sqft ? `${Number(l.sqft).toLocaleString('en-US')} sqft` : null;
    const specs = [beds, baths, sqft].filter(Boolean).join(' · ');
    const area = [l.city, l.state].filter(Boolean).join(', ');
    const header = `${idx}) ${fmtMoney(l.price)}${specs ? ' · ' + specs : ''} — ${area}`;
    return `${header}\n${listingLink(l.id)}`;
};

const extractZip = (body) => {
    const m = String(body || '').match(/\b\d{5}\b/);
    return m ? m[0] : null;
};

const activeListingsForZip = (zip) =>
    statements.getActiveListings
        .all()
        .filter((l) => String(l.zip || '').trim() === zip)
        .slice(0, 3);

// Simple per-phone rate limit: 30 inbound messages/hour
const smsBuckets = new Map();
const smsRateLimit = (req, res, next) => {
    const phone = String(req.body && req.body.From || '').trim();
    const now = Date.now();
    const key = `sms:${phone || req.ip}`;
    let bucket = smsBuckets.get(key);
    if (!bucket || now - bucket.start > 60 * 60 * 1000) bucket = { start: now, count: 0 };
    bucket.count += 1;
    smsBuckets.set(key, bucket);
    if (bucket.count > 30) {
        return twiml('Too many messages. Please try again in an hour.')(
            res.status(429)
        );
    }
    next();
};

/** Verify Twilio's X-Twilio-Signature when TWILIO_AUTH_TOKEN is set. */
function isValidTwilioSignature(req) {
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    if (!authToken) return { ok: true, skipped: true };
    const signature = req.get('X-Twilio-Signature');
    if (!signature) return { ok: false, error: 'Missing Twilio signature' };
    // Twilio signs: full URL (proto + host + original path/query) + sorted POST params
    const url = `${req.protocol}://${req.get('host')}${req.originalUrl}`;
    const params = Object.keys(req.body || {})
        .sort()
        .reduce((acc, k) => acc + k + req.body[k], url);
    const expected = crypto.createHmac('sha1', authToken).update(params, 'utf8').digest('base64');
    const a = Buffer.from(signature);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
        return { ok: false, error: 'Invalid Twilio signature' };
    }
    return { ok: true };
}

// ---------------------------------------------------------------------
// Message classification
// ---------------------------------------------------------------------

const STOP_WORDS = new Set(['STOP', 'STOPALL', 'QUIT', 'CANCEL', 'END', 'UNSUBSCRIBE']);
const START_WORDS = new Set(['START', 'UNSTOP', 'SUBSCRIBE']);
const YES_WORDS = new Set(['YES', 'Y']);

function classify(raw) {
    const body = String(raw || '').trim();
    const upper = body.toUpperCase();
    if (STOP_WORDS.has(upper)) return { type: 'stop' };
    if (upper === 'HELP') return { type: 'help' };
    if (START_WORDS.has(upper)) return { type: 'start' };
    if (YES_WORDS.has(upper)) return { type: 'yes' };
    const zip = extractZip(body);
    if (zip) return { type: 'zip', zip };
    return { type: 'unknown' };
}

// ---------------------------------------------------------------------
// Webhook
// ---------------------------------------------------------------------

router.post('/webhook', smsRateLimit, (req, res) => {
    try {
        const sig = isValidTwilioSignature(req);
        if (!sig.ok) {
            console.warn('[SMS] Rejected webhook:', sig.error);
            return res.status(403).type('text/xml').send('<Response/>');
        }

        const from = String(req.body.From || '').trim();
        const body = String(req.body.Body || '');
        if (!from) return res.status(400).type('text/xml').send('<Response/>');

        const msg = classify(body);
        const send = twiml;

        switch (msg.type) {
            case 'stop': {
                statements.unsubscribeSmsSubscriber.run(from);
                console.log(`[SMS] ${from} unsubscribed`);
                return send(
                    "You've been removed — no more texts from VDI Realty. Text START to rejoin anytime."
                )(res);
            }

            case 'help': {
                return send(
                    `Text a 5-digit ZIP for homes for sale in that area. Reply YES for new-listing alerts, STOP to quit. ${BROKERAGE_DISCLOSURE}.`
                )(res);
            }

            case 'start': {
                const sub = statements.getSmsSubscriber.get(from);
                if (!sub || !sub.lastZip) {
                    return send('Text a 5-digit ZIP code to get started, e.g. 98004.')(res);
                }
                statements.resubscribeSmsSubscriber.run(from);
                console.log(`[SMS] ${from} resubscribed for ZIP ${sub.lastZip}`);
                return send(
                    `Welcome back! We'll text you when new homes list in ${sub.lastZip}. STOP to quit anytime.`
                )(res);
            }

            case 'yes': {
                const sub = statements.getSmsSubscriber.get(from);
                if (!sub || !sub.lastZip) {
                    return send('Text us a ZIP code first, then reply YES to get new-listing alerts.')(res);
                }
                statements.setSmsAlertsConsent.run(from);
                console.log(`[SMS] ${from} opted in to alerts for ZIP ${sub.lastZip}`);
                return send(
                    `You're in! We'll text you when new homes list in ${sub.lastZip}. ${BROKERAGE_DISCLOSURE}. STOP to quit.`
                )(res);
            }

            case 'zip': {
                const { zip } = msg;
                statements.upsertSmsSubscriber.run(from, zip);
                console.log(`[SMS] ZIP inquiry ${zip} from ${from}`);
                const matches = activeListingsForZip(zip);
                if (matches.length === 0) {
                    return send(
                        `No active homes in ${zip} right now. Reply YES and we'll text you when one lists. STOP to quit. ${BROKERAGE_DISCLOSURE}.`
                    )(res);
                }
                const lines = matches.map((l, i) => summarizeListing(l, i + 1)).join('\n\n');
                const plural = matches.length === 1 ? 'home' : 'homes';
                return send(
                    `${matches.length} ${plural} for sale in ${zip}:\n${lines}\n\nReply YES for new-listing alerts. STOP to quit. VDI Realty, brokered by Realty Connect.`
                )(res);
            }

            default: {
                return send(
                    `Text a 5-digit ZIP code to see homes for sale (e.g. 98004), or HELP for options. ${BRAND}.`
                )(res);
            }
        }
    } catch (error) {
        console.error('[SMS] Webhook error:', error);
        return res.status(500).type('text/xml').send('<Response/>');
    }
});

// Liveness check for the SMS endpoint (GET only; the webhook is POST)
router.get('/status', (req, res) => {
    res.json({ success: true, service: 'fsbo-sms', webhook: '/api/fsbo/sms/webhook' });
});

module.exports = router;
