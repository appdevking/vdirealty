// FSBO routes — free For-Sale-By-Owner / builder / broker listings for VDI Realty.
//
// Posting classes:
//   owner   — homeowner selling themselves ("For Sale By Owner")
//   builder — builder/developer posting (company name + new-construction flag)
//   broker  — licensed agent posting (brokerage name REQUIRED — WA advertising
//             rules require the brokerage to be disclosed on every ad)
//
// Lifecycle: submit -> moderationStatus 'pending' -> admin approve/reject ->
// public only when status='active' AND moderationStatus='approved' AND unexpired.
// Auto-expiry (14 days) runs via cron-jobs.js. Seller email/phone are NEVER
// exposed publicly; buyer inquiries are stored and relayed by email.

const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { statements } = require('../database');
const {
    sendConfirmationEmail,
    sendAdminNotification,
    sendInquiryToSeller,
    sendApprovalEmail,
    sendRejectionEmail,
    sendSellerLeadNotification,
    sendSellerLeadConfirmation
} = require('../email-service');
const config = require('../config');
// Extraction is optional: puppeteer isn't a declared dependency, so don't
// let a missing module crash the whole router/server at startup.
let extractListing = null;
try {
    ({ extractListing } = require('../extraction-service'));
} catch (e) {
    console.warn('[API] Listing extraction unavailable:', e.message);
}

const router = express.Router();

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const SELLER_TYPES = ['owner', 'builder', 'broker'];
const LEAD_TYPES = ['owner', 'builder'];
const MODERATION_STATES = ['pending', 'approved', 'rejected'];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const ZIP_RE = /^\d{5}(-\d{4})?$/;
const LICENSE_RE = /^[A-Za-z0-9\- ]{3,24}$/; // WA broker licenses are numeric; other states vary

const esc = (v) => String(v ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

const str = (v, max = 500) => {
    if (v === undefined || v === null) return '';
    return String(v).trim().slice(0, max);
};

const toInt = (v) => {
    if (v === undefined || v === null || v === '') return null;
    const n = parseInt(v, 10);
    return Number.isFinite(n) ? n : null;
};

const toFloat = (v) => {
    if (v === undefined || v === null || v === '') return null;
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : null;
};

const boolish = (v) => v === true || v === 1 || v === '1' || v === 'true' || v === 'on';

const normalizePhone = (v) => str(v, 30).replace(/[^\d+]/g, '').slice(0, 20);

/** A listing is publicly visible only when active, approved, and unexpired. */
const isPubliclyVisible = (row) => !!row
    && row.status === 'active'
    && row.moderationStatus === 'approved'
    && new Date(row.expirationDate) > new Date();

const photoPublicUrl = (photo) =>
    photo.path && photo.path.startsWith('http')
        ? photo.path
        : `/api/fsbo/photo/${photo.filename}`;

const absoluteUrl = (req, p) => `${req.protocol}://${req.get('host')}${p}`;

/** Strict public serializer — never leaks email, phone, license numbers, or hidden fields. */
function serializePublicListing(row, req) {
    const photos = statements.getPhotosByListingId.all(row.id).map((p) => ({
        id: p.id,
        url: photoPublicUrl(p)
    }));
    const sellerType = SELLER_TYPES.includes(row.sellerType) ? row.sellerType : 'owner';
    const out = {
        id: row.id,
        // Demo/sample listings use AI-generated illustrations, never real photos.
        isDemo: /^\[DEMO\]/i.test(row.description || ''),
        sellerType,
        sellerLabel: sellerType === 'builder'
            ? 'Builder / Developer'
            : sellerType === 'broker'
                ? 'Listed by Agent'
                : 'For Sale By Owner',
        propertyType: row.propertyType,
        price: row.price,
        sqft: row.sqft,
        bedrooms: row.bedrooms,
        bathrooms: row.bathrooms,
        yearBuilt: row.yearBuilt,
        lotSize: row.lotSize,
        features: row.features || '',
        description: row.description || '',
        city: row.city,
        state: row.state,
        zip: row.zip,
        photos,
        createdAt: row.createdAt,
        expirationDate: row.expirationDate,
        externalUrl: row.externalUrl || null,
        mlsNumber: row.mlsNumber || null,
        shareUrl: absoluteUrl(req, `/api/fsbo/l/${row.id}`)
    };

    // Address privacy: exact street address only when the poster opted in.
    if (row.hideAddress) {
        out.areaDisplay = `${row.city}, ${row.state} ${row.zip}`;
    } else {
        out.address = row.address;
        out.areaDisplay = `${row.address}, ${row.city}, ${row.state} ${row.zip}`;
    }

    // Identity privacy: show first name + last initial only when opted in.
    if (!row.hideIdentity && row.firstName) {
        out.displayName = row.lastName
            ? `${row.firstName} ${String(row.lastName).charAt(0)}.`
            : row.firstName;
    }

    if (sellerType === 'builder') {
        if (row.builderCompany) out.builderCompany = row.builderCompany;
        out.newConstruction = !!row.newConstruction;
    }

    // Broker listings ALWAYS show the brokerage name — WA advertising rules
    // require brokerage disclosure on every real-estate ad. License numbers
    // stay private (admin view only).
    if (sellerType === 'broker' && row.brokerageName) {
        out.brokerageName = row.brokerageName;
    }

    return out;
}

/** Admin serializer — full record for moderation. */
function serializeAdminListing(row) {
    const photos = statements.getPhotosByListingId.all(row.id).map((p) => ({
        id: p.id,
        filename: p.filename,
        url: photoPublicUrl(p)
    }));
    return { ...row, photos };
}

/* ------------------------------------------------------------------ */
/* Spam protection: rate limiting, honeypot, Turnstile-ready           */
/* ------------------------------------------------------------------ */

const rateBuckets = new Map();
setInterval(() => {
    const now = Date.now();
    for (const [k, b] of rateBuckets) {
        if (now - b.start > 10 * 60 * 1000) rateBuckets.delete(k);
    }
}, 5 * 60 * 1000).unref();

const rateLimit = (name, max, windowMs) => (req, res, next) => {
    const now = Date.now();
    const key = `${name}:${req.ip}`;
    let bucket = rateBuckets.get(key);
    if (!bucket || now - bucket.start > windowMs) bucket = { start: now, count: 0 };
    bucket.count += 1;
    rateBuckets.set(key, bucket);
    if (bucket.count > max) {
        return res.status(429).json({ error: 'Too many requests. Please try again later.' });
    }
    next();
};

/** Honeypot field "website" is hidden from humans; bots fill it. Silently
 *  pretend success so bots can't probe the filter. */
const HONEYPOT_FIELD = 'website';
const isBot = (body) => !!(body && str(body[HONEYPOT_FIELD], 200));

/** Cloudflare Turnstile verification. Active only when TURNSTILE_SECRET_KEY is
 *  set; otherwise submissions pass through (honeypot + rate limits still apply). */
async function verifyTurnstile(token, ip) {
    const secret = process.env.TURNSTILE_SECRET_KEY;
    if (!secret) return { ok: true, skipped: true };
    if (!token) return { ok: false, error: 'Security check token missing. Please try again.' };
    try {
        const resp = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({ secret, response: token, remoteip: ip || '' })
        });
        const data = await resp.json();
        return data.success
            ? { ok: true }
            : { ok: false, error: 'Security check failed. Please try again.' };
    } catch (e) {
        console.error('[API] Turnstile verification error:', e.message);
        return { ok: false, error: 'Security check unavailable. Please try again.' };
    }
}

// Public site config for the frontend (e.g. Turnstile site key).
router.get('/site-config', (req, res) => {
    res.json({
        success: true,
        turnstileSiteKey: process.env.TURNSTILE_SITE_KEY || null,
        listingDurationDays: config.listingDurationDays
    });
});

/* ------------------------------------------------------------------ */
/* Uploads                                                             */
/* ------------------------------------------------------------------ */

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, config.uploadDir),
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'listing-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage,
    limits: { fileSize: config.maxFileSize },
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif|webp/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        if (mimetype && extname) return cb(null, true);
        cb(new Error('Only image files are allowed!'));
    }
});

/** Best-effort removal of files multer already wrote when we reject a submission. */
const rollbackUploads = (files) => {
    (files || []).forEach((file) => {
        fs.unlink(file.path, (err) => {
            if (err) console.error('[API] Rollback unlink failed:', file.path, err.message);
        });
    });
};

/* ------------------------------------------------------------------ */
/* Extract listing data from URL (unchanged behavior)                   */
/* ------------------------------------------------------------------ */

router.post('/extract', async (req, res) => {
    try {
        if (!extractListing) {
            return res.status(501).json({ success: false, error: 'Listing extraction is not available on this server.' });
        }
        const { url } = req.body;
        if (!url) return res.status(400).json({ success: false, error: 'URL is required' });
        try { new URL(url); } catch (e) {
            return res.status(400).json({ success: false, error: 'Invalid URL format' });
        }
        console.log(`[API] Extraction request for: ${url}`);
        const result = await extractListing(url);
        if (result.success) {
            res.json({ success: true, source: result.source, data: result.data });
        } else {
            res.status(500).json({ success: false, error: result.error || 'Failed to extract listing data' });
        }
    } catch (error) {
        console.error('[API] Extraction error:', error);
        res.status(500).json({ success: false, error: 'Extraction failed. Please try again or enter details manually.' });
    }
});

/* ------------------------------------------------------------------ */
/* Submit new listing -> enters moderation queue as 'pending'          */
/* ------------------------------------------------------------------ */

function validateSubmission(d) {
    const errors = [];
    const sellerType = str(d.sellerType, 20).toLowerCase() || 'owner';
    if (!SELLER_TYPES.includes(sellerType)) errors.push('Invalid poster type.');

    if (!str(d.firstName, 80)) errors.push('First name is required.');
    if (!str(d.lastName, 80)) errors.push('Last name is required.');
    const email = str(d.email, 160);
    if (!EMAIL_RE.test(email)) errors.push('A valid email address is required.');
    if (normalizePhone(d.phone).replace(/\D/g, '').length < 7) errors.push('A valid phone number is required.');
    if (!str(d.address, 200)) errors.push('Property address is required.');
    if (!str(d.city, 100)) errors.push('City is required.');
    const state = str(d.state, 10).toUpperCase();
    if (!/^[A-Z]{2}$/.test(state)) errors.push('State must be a 2-letter code.');
    if (!ZIP_RE.test(str(d.zip, 12))) errors.push('ZIP code must be 5 digits.');
    if (!str(d.propertyType, 60)) errors.push('Property type is required.');

    const price = toInt(d.price);
    if (price === null || price <= 0) errors.push('Price must be a positive number.');
    const sqft = toInt(d.sqft);
    if (sqft === null || sqft <= 0) errors.push('Square footage must be a positive number.');
    if (!str(d.description, 5000)) errors.push('Description is required.');

    const isCommercial = str(d.propertyType, 60).toLowerCase() === 'commercial';
    if (!isCommercial) {
        if (toInt(d.bedrooms) === null) errors.push('Bedrooms are required for residential properties.');
        if (toFloat(d.bathrooms) === null) errors.push('Bathrooms are required for residential properties.');
    }

    if (sellerType === 'builder' && !str(d.builderCompany, 160)) {
        errors.push('Company name is required for builder/developer postings.');
    }
    if (sellerType === 'broker') {
        if (!str(d.brokerageName, 160)) {
            errors.push('Brokerage name is required for agent postings (WA advertising rules require brokerage disclosure).');
        }
        if (!LICENSE_RE.test(str(d.licenseNumber, 24))) {
            errors.push('A valid real-estate license number is required for agent postings.');
        }
    }

    return { errors, sellerType, email, state, price, sqft, isCommercial };
}

router.post(
    '/submit',
    rateLimit('fsbo-submit', 5, 60 * 60 * 1000), // 5 submissions / hour / IP
    upload.array('photos', config.maxFiles),
    async (req, res) => {
        try {
            const data = req.body || {};

            // Honeypot: bots get a fake success, nothing is stored.
            if (isBot(data)) {
                rollbackUploads(req.files);
                console.log('[API] Honeypot tripped on /submit from', req.ip);
                return res.json({ success: true, message: 'Listing submitted successfully' });
            }

            const captcha = await verifyTurnstile(data['cf-turnstile-response'], req.ip);
            if (!captcha.ok) {
                rollbackUploads(req.files);
                return res.status(400).json({ error: captcha.error });
            }

            const { errors, sellerType, email, state, price, sqft, isCommercial } = validateSubmission(data);
            if (errors.length > 0) {
                rollbackUploads(req.files);
                return res.status(400).json({ error: errors[0], errors });
            }

            const submissionDate = new Date();
            const expirationDate = new Date(submissionDate);
            expirationDate.setDate(expirationDate.getDate() + config.listingDurationDays);

            const result = statements.insertListing.run(
                str(data.firstName, 80),
                str(data.lastName, 80),
                email,
                normalizePhone(data.phone),
                str(data.address, 200),
                str(data.city, 100),
                state,
                str(data.zip, 12),
                str(data.propertyType, 60),
                price,
                sqft,
                toInt(data.bedrooms),
                toFloat(data.bathrooms),
                toInt(data.yearBuilt),
                toFloat(data.lotSize),
                str(data.features, 2000),
                str(data.description, 5000),
                boolish(data.privateContact) ? 1 : 0,
                submissionDate.toISOString(),
                expirationDate.toISOString(),
                str(data.buildingClass, 60) || null,
                str(data.zoning, 60) || null,
                toFloat(data.occupancyRate),
                toFloat(data.capRate),
                toInt(data.grossIncome),
                toInt(data.operatingExpenses),
                toInt(data.numberOfUnits),
                toInt(data.parkingSpaces),
                str(data.leaseType, 60) || null,
                str(data.mlsNumber, 60) || null,
                str(data.externalUrl, 500) || null,
                str(data.listingSource, 40) || 'fsbo',
                boolish(data.hideAddress ?? 'true') ? 1 : 0,
                boolish(data.hideIdentity ?? 'true') ? 1 : 0,
                'pending', // all new submissions enter moderation
                sellerType,
                sellerType === 'builder' ? str(data.builderCompany, 160) : null,
                sellerType === 'broker' ? str(data.brokerageName, 160) : null,
                sellerType === 'broker' ? str(data.licenseNumber, 24) : null,
                sellerType === 'builder' && boolish(data.newConstruction) ? 1 : 0
            );

            const listingId = Number(result.lastInsertRowid);
            const files = req.files || [];

            // Insert uploaded photos
            files.forEach((file, index) => {
                statements.insertPhoto.run(listingId, file.filename, file.originalname, file.path, file.size, file.mimetype, index);
            });

            // Insert extracted photo URLs (from listing extraction)
            if (data.photoUrls) {
                try {
                    const photoUrls = JSON.parse(data.photoUrls);
                    if (Array.isArray(photoUrls)) {
                        photoUrls.slice(0, config.maxFiles).forEach((url, index) => {
                            if (typeof url === 'string' && url.startsWith('http')) {
                                statements.insertPhoto.run(
                                    listingId,
                                    `extracted-${index}.jpg`,
                                    `Extracted Photo ${index + 1}`,
                                    url,
                                    0,
                                    'image/jpeg',
                                    files.length + index
                                );
                            }
                        });
                    }
                } catch (e) {
                    console.error('[API] Error parsing photoUrls:', e.message);
                }
            }

            const listing = statements.getListingById.get(listingId);

            // Notify (fire-and-forget; a mail failure must not fail the submission)
            sendConfirmationEmail(listing).catch((err) => console.error('[API] Confirmation email error:', err.message));
            sendAdminNotification(listing).catch((err) => console.error('[API] Admin notification error:', err.message));

            res.json({
                success: true,
                message: 'Listing submitted for review. It will appear publicly once approved (usually within 1 business day).',
                listingId,
                expirationDate: expirationDate.toISOString()
            });
        } catch (error) {
            console.error('[API] Error submitting listing:', error);
            rollbackUploads(req.files);
            res.status(500).json({ error: 'Failed to submit listing', details: error.message });
        }
    }
);

/* ------------------------------------------------------------------ */
/* Public listings                                                     */
/* ------------------------------------------------------------------ */

// Get active listings (approved + unexpired only), with optional filters
router.get('/listings', (req, res) => {
    try {
        const { source, q, city, state, minPrice, maxPrice, beds, baths, propertyType, sellerType, sort } = req.query;

        let listings = source
            ? statements.getActiveListingsBySource.all(source, source)
            : statements.getActiveListings.all();

        // Lightweight in-memory filters (result sets are small)
        const needle = str(q, 100).toLowerCase();
        if (needle) {
            listings = listings.filter((l) =>
                [l.address, l.city, l.zip, l.description, l.builderCompany, l.brokerageName]
                    .filter(Boolean).join(' ').toLowerCase().includes(needle));
        }
        if (city) listings = listings.filter((l) => str(l.city).toLowerCase() === str(city, 100).toLowerCase());
        if (state) listings = listings.filter((l) => str(l.state).toUpperCase() === str(state, 10).toUpperCase());
        const lo = toInt(minPrice), hi = toInt(maxPrice);
        if (lo !== null) listings = listings.filter((l) => l.price >= lo);
        if (hi !== null) listings = listings.filter((l) => l.price <= hi);
        const minBeds = toInt(beds);
        if (minBeds !== null) listings = listings.filter((l) => (l.bedrooms || 0) >= minBeds);
        const minBaths = toFloat(baths);
        if (minBaths !== null) listings = listings.filter((l) => (l.bathrooms || 0) >= minBaths);
        if (propertyType) listings = listings.filter((l) => str(l.propertyType).toLowerCase() === str(propertyType, 60).toLowerCase());
        if (sellerType && SELLER_TYPES.includes(sellerType)) listings = listings.filter((l) => (l.sellerType || 'owner') === sellerType);

        if (sort === 'price-asc') listings.sort((a, b) => a.price - b.price);
        else if (sort === 'price-desc') listings.sort((a, b) => b.price - a.price);
        else if (sort === 'sqft-desc') listings.sort((a, b) => (b.sqft || 0) - (a.sqft || 0));

        res.json({
            success: true,
            count: listings.length,
            listings: listings.map((l) => serializePublicListing(l, req))
        });
    } catch (error) {
        console.error('[API] Error fetching listings:', error);
        res.status(500).json({ error: 'Failed to fetch listings' });
    }
});

// Get single listing (public) — 404 unless active, approved, and unexpired
router.get('/listing/:id', (req, res) => {
    try {
        const listing = statements.getListingById.get(toInt(req.params.id) || 0);
        if (!isPubliclyVisible(listing)) {
            return res.status(404).json({ error: 'Listing not found' });
        }
        res.json({ success: true, listing: serializePublicListing(listing, req) });
    } catch (error) {
        console.error('[API] Error fetching listing:', error);
        res.status(500).json({ error: 'Failed to fetch listing' });
    }
});

/* ------------------------------------------------------------------ */
/* Shareable SEO detail page (server-rendered, crawler-friendly)       */
/* ------------------------------------------------------------------ */

router.get('/l/:id', (req, res) => {
    try {
        const listing = statements.getListingById.get(toInt(req.params.id) || 0);
        if (!isPubliclyVisible(listing)) {
            return res.status(404).send(
                '<!DOCTYPE html><html><head><title>Listing not found | VDI Realty</title><meta name="robots" content="noindex"></head>' +
                '<body style="font-family:sans-serif;text-align:center;padding:60px;"><h1>Listing not found</h1>' +
                '<p>This listing may have expired or been removed.</p>' +
                '<a href="https://www.vdirealty.com/fsbo-listings.html">Browse FSBO listings</a></body></html>'
            );
        }

        const pub = serializePublicListing(listing, req);
        const title = `${pub.propertyType} for sale — ${pub.areaDisplay} | VDI Realty FSBO`;
        const desc = `${pub.sellerLabel}: ${pub.bedrooms ?? '—'} bd / ${pub.bathrooms ?? '—'} ba, ` +
            `${Number(pub.sqft || 0).toLocaleString()} sq ft — $${Number(pub.price || 0).toLocaleString()} in ${pub.areaDisplay}.`;
        const image = pub.photos[0]
            ? (pub.photos[0].url.startsWith('http') ? pub.photos[0].url : absoluteUrl(req, pub.photos[0].url))
            : 'https://www.vdirealty.com/images/og-default.jpg';
        const canonical = pub.shareUrl;

        const postedBy = pub.sellerType === 'broker' && pub.brokerageName
            ? `Listed by ${esc(pub.brokerageName)}`
            : pub.sellerType === 'builder' && pub.builderCompany
                ? `Offered by ${esc(pub.builderCompany)}`
                : 'For Sale By Owner';

        const jsonLd = {
            '@context': 'https://schema.org',
            '@type': 'RealEstateListing',
            name: `${pub.propertyType} — ${pub.areaDisplay}`,
            description: pub.description.slice(0, 5000),
            url: canonical,
            datePosted: pub.createdAt,
            address: {
                '@type': 'PostalAddress',
                ...(pub.address ? { streetAddress: pub.address } : {}),
                addressLocality: pub.city,
                addressRegion: pub.state,
                postalCode: pub.zip,
                addressCountry: 'US'
            },
            offers: { '@type': 'Offer', price: pub.price, priceCurrency: 'USD', availability: 'https://schema.org/InStock' }
        };

        const photoHtml = pub.photos.slice(0, 6).map((p) =>
            `<img src="${esc(p.url.startsWith('http') ? p.url : absoluteUrl(req, p.url))}" alt="${esc(title)}" style="max-width:100%;border-radius:8px;margin-bottom:12px;" loading="lazy">`
        ).join('') + (pub.isDemo
            ? `<p style="font-size:0.85rem;color:#6b7a8d;font-style:italic;">Sample illustration — not a photograph of the actual property. Demo listing for preview purposes.</p>`
            : '');

        res.send(`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${esc(canonical)}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="VDI Realty">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${esc(canonical)}">
<meta property="og:image" content="${esc(image)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(desc)}">
<meta name="twitter:image" content="${esc(image)}">
<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>
<style>
body{font-family:Georgia,serif;background:#faf8f4;color:#1c1a17;margin:0;line-height:1.7}
.wrap{max-width:760px;margin:0 auto;padding:32px 20px}
.badge{display:inline-block;background:#0f2a43;color:#e9e3d3;font:700 12px/1 Arial;letter-spacing:1.5px;padding:8px 14px;border-radius:999px;text-transform:uppercase;margin-bottom:12px}
h1{font-size:30px;margin:0 0 4px}
.price{font-size:28px;color:#8a6d2f;font-weight:700;margin:8px 0}
.facts{display:flex;flex-wrap:wrap;gap:8px 24px;margin:16px 0;color:#4a463e}
.cta{display:inline-block;background:#0f2a43;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;margin:12px 8px 12px 0}
.disclosure{font-size:12px;color:#6b675e;border-top:1px solid #ddd;margin-top:32px;padding-top:16px}
</style>
</head>
<body>
<div class="wrap">
<div class="badge">${esc(pub.sellerLabel)}</div>
<h1>${esc(pub.areaDisplay)}</h1>
<div>${esc(postedBy)}${pub.newConstruction ? ' &middot; New construction' : ''}</div>
<div class="price">$${Number(pub.price || 0).toLocaleString()}</div>
<div class="facts">
<span>${pub.bedrooms ?? '—'} bd</span><span>${pub.bathrooms ?? '—'} ba</span>
<span>${Number(pub.sqft || 0).toLocaleString()} sq ft</span>
${pub.yearBuilt ? `<span>Built ${esc(String(pub.yearBuilt))}</span>` : ''}
${pub.lotSize ? `<span>${esc(String(pub.lotSize))} acre lot</span>` : ''}
</div>
${photoHtml}
<p>${esc(pub.description).replace(/\n/g, '<br>')}</p>
${pub.features ? `<p><strong>Features:</strong> ${esc(pub.features)}</p>` : ''}
<div>
<a class="cta" href="https://www.vdirealty.com/fsbo-listings.html#listing-${pub.id}">Contact the seller</a>
<a class="cta" href="https://www.vdirealty.com/fsbo.html" style="background:#8a6d2f">List your property free</a>
</div>
<!-- AD SLOT (reserved, inactive): future monetization — brokers / loan officers / escrow-title.
     Keep style="display:none" until the ad program launches. Must never push the CTAs above. -->
<div class="ad-slot" aria-hidden="true" style="display:none"></div>
<div class="disclosure">
<p>VDI Realty &middot; Brokered by Realty Connect &middot; (206) 880-0637 &middot; veng@vdirealty.com</p>
<p>Equal Housing Opportunity. All listings are offered without regard to race, color, religion, sex, disability, familial status, or national origin. Price and property details are provided by the poster; buyers should independently verify all information.</p>
</div>
</div>
</body>
</html>`);
    } catch (error) {
        console.error('[API] Error rendering listing page:', error);
        res.status(500).send('Failed to render listing page');
    }
});

// Serve photo files
router.get('/photo/:filename', (req, res) => {
    const filename = req.params.filename;
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
        return res.status(400).json({ error: 'Invalid filename' });
    }
    const filepath = path.join(config.uploadDir, filename);
    res.sendFile(path.resolve(filepath), (err) => {
        if (err) res.status(404).json({ error: 'Photo not found' });
    });
});

/* ------------------------------------------------------------------ */
/* Buyer inquiry: stored, then relayed to seller by email.             */
/* The seller's email address is never exposed in any API response.    */
/* ------------------------------------------------------------------ */

router.post(
    '/contact/:listingId',
    rateLimit('fsbo-contact', 10, 60 * 60 * 1000),
    async (req, res) => {
        try {
            const body = req.body || {};
            if (isBot(body)) {
                console.log('[API] Honeypot tripped on /contact from', req.ip);
                return res.json({ success: true, message: 'Your inquiry has been sent to the seller.' });
            }

            const captcha = await verifyTurnstile(body['cf-turnstile-response'], req.ip);
            if (!captcha.ok) return res.status(400).json({ error: captcha.error });

            const name = str(body.name, 120);
            const email = str(body.email, 160);
            const phone = normalizePhone(body.phone);
            const message = str(body.message, 3000);

            if (!name) return res.status(400).json({ error: 'Your name is required.' });
            if (!EMAIL_RE.test(email)) return res.status(400).json({ error: 'A valid email address is required.' });
            if (!message) return res.status(400).json({ error: 'Please include a message.' });

            const listing = statements.getListingById.get(toInt(req.params.listingId) || 0);
            if (!isPubliclyVisible(listing)) {
                return res.status(404).json({ error: 'Listing not found.' });
            }

            statements.insertInquiry.run(listing.id, name, email, phone || null, message);

            sendInquiryToSeller(listing, { name, email, phone, message })
                .catch((err) => console.error('[API] Inquiry relay error:', err.message));

            res.json({ success: true, message: 'Your inquiry has been sent to the seller.' });
        } catch (error) {
            console.error('[API] Error sending inquiry:', error);
            res.status(500).json({ error: 'Failed to send inquiry.' });
        }
    }
);

/* ------------------------------------------------------------------ */
/* "Sell with VDI" lead capture — homeowners AND builders/developers   */
/* ------------------------------------------------------------------ */

router.post(
    '/leads',
    rateLimit('fsbo-lead', 10, 60 * 60 * 1000),
    async (req, res) => {
        try {
            const body = req.body || {};
            if (isBot(body)) {
                console.log('[API] Honeypot tripped on /leads from', req.ip);
                return res.json({ success: true, message: 'Thanks! We received your request.' });
            }

            const captcha = await verifyTurnstile(body['cf-turnstile-response'], req.ip);
            if (!captcha.ok) return res.status(400).json({ error: captcha.error });

            const name = str(body.name, 120);
            const email = str(body.email, 160);
            const sellerType = str(body.sellerType, 20).toLowerCase() || 'owner';

            if (!name) return res.status(400).json({ error: 'Your name is required.' });
            if (!EMAIL_RE.test(email)) return res.status(400).json({ error: 'A valid email address is required.' });
            if (!LEAD_TYPES.includes(sellerType)) {
                return res.status(400).json({ error: 'Invalid request type.' });
            }

            const lead = {
                name,
                email,
                phone: normalizePhone(body.phone) || null,
                propertyAddress: str(body.propertyAddress, 200) || null,
                city: str(body.city, 100) || null,
                state: str(body.state, 10).toUpperCase() || null,
                zip: str(body.zip, 12) || null,
                timeline: str(body.timeline, 100) || null,
                priceExpectation: str(body.priceExpectation, 100) || null,
                message: str(body.message, 3000) || null,
                sellerType,
                sourceListingId: toInt(body.sourceListingId)
            };

            const result = statements.insertSellerLead.run(
                lead.name, lead.email, lead.phone, lead.propertyAddress, lead.city,
                lead.state, lead.zip, lead.timeline, lead.priceExpectation,
                lead.message, lead.sellerType, lead.sourceListingId
            );
            lead.id = Number(result.lastInsertRowid);
            lead.createdAt = new Date().toISOString();

            sendSellerLeadNotification(lead).catch((err) => console.error('[API] Lead notification error:', err.message));
            sendSellerLeadConfirmation(lead).catch((err) => console.error('[API] Lead confirmation error:', err.message));

            res.json({ success: true, message: 'Thanks! We received your request and will reach out shortly.' });
        } catch (error) {
            console.error('[API] Error capturing lead:', error);
            res.status(500).json({ error: 'Failed to submit your request.' });
        }
    }
);

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

// Admin: all listings (including pending / rejected / removed)
router.get('/admin/listings', adminAuth, (req, res) => {
    try {
        const listings = statements.getAllListings.all().map(serializeAdminListing);
        res.json({ success: true, listings });
    } catch (error) {
        console.error('[API] Error fetching admin listings:', error);
        res.status(500).json({ error: 'Failed to fetch listings' });
    }
});

// Admin: moderation queue (pending review)
router.get('/admin/pending', adminAuth, (req, res) => {
    try {
        const listings = statements.getPendingListings.all().map(serializeAdminListing);
        res.json({ success: true, count: listings.length, listings });
    } catch (error) {
        console.error('[API] Error fetching pending listings:', error);
        res.status(500).json({ error: 'Failed to fetch pending listings' });
    }
});

// Admin: approve a pending listing -> goes public
router.post('/admin/listing/:id/approve', adminAuth, async (req, res) => {
    try {
        const id = toInt(req.params.id) || 0;
        const listing = statements.getListingById.get(id);
        if (!listing) return res.status(404).json({ error: 'Listing not found' });

        statements.updateModerationStatus.run('approved', id);
        const updated = statements.getListingById.get(id);
        sendApprovalEmail(updated).catch((err) => console.error('[API] Approval email error:', err.message));

        res.json({ success: true, message: 'Listing approved and published.' });
    } catch (error) {
        console.error('[API] Error approving listing:', error);
        res.status(500).json({ error: 'Failed to approve listing' });
    }
});

// Admin: reject a pending listing (optional reason emailed to poster)
router.post('/admin/listing/:id/reject', adminAuth, async (req, res) => {
    try {
        const id = toInt(req.params.id) || 0;
        const listing = statements.getListingById.get(id);
        if (!listing) return res.status(404).json({ error: 'Listing not found' });

        const reason = str((req.body || {}).reason, 1000);
        statements.updateModerationStatus.run('rejected', id);
        sendRejectionEmail(listing, reason).catch((err) => console.error('[API] Rejection email error:', err.message));

        res.json({ success: true, message: 'Listing rejected.' });
    } catch (error) {
        console.error('[API] Error rejecting listing:', error);
        res.status(500).json({ error: 'Failed to reject listing' });
    }
});

// Admin: remove a listing (soft delete)
router.delete('/listing/:id', adminAuth, (req, res) => {
    try {
        const id = toInt(req.params.id) || 0;
        const listing = statements.getListingById.get(id);
        if (!listing) return res.status(404).json({ error: 'Listing not found' });

        statements.updateListingStatus.run('removed', id);
        res.json({ success: true, message: 'Listing removed successfully' });
    } catch (error) {
        console.error('[API] Error removing listing:', error);
        res.status(500).json({ error: 'Failed to remove listing' });
    }
});

// Admin: buyer inquiries (newest first, with listing context)
router.get('/admin/inquiries', adminAuth, (req, res) => {
    try {
        const inquiries = statements.getAllInquiries.all();
        res.json({ success: true, count: inquiries.length, inquiries });
    } catch (error) {
        console.error('[API] Error fetching inquiries:', error);
        res.status(500).json({ error: 'Failed to fetch inquiries' });
    }
});

// Admin: inquiries for one listing
router.get('/admin/listing/:id/inquiries', adminAuth, (req, res) => {
    try {
        const inquiries = statements.getInquiriesByListingId.all(toInt(req.params.id) || 0);
        res.json({ success: true, count: inquiries.length, inquiries });
    } catch (error) {
        console.error('[API] Error fetching listing inquiries:', error);
        res.status(500).json({ error: 'Failed to fetch inquiries' });
    }
});

// Admin: mark an inquiry read
router.post('/admin/inquiries/:id/read', adminAuth, (req, res) => {
    try {
        statements.markInquiryRead.run(toInt(req.params.id) || 0);
        res.json({ success: true, message: 'Inquiry marked as read.' });
    } catch (error) {
        console.error('[API] Error marking inquiry read:', error);
        res.status(500).json({ error: 'Failed to update inquiry' });
    }
});

// Admin: "Sell with VDI" leads (homeowners + builders)
router.get('/admin/leads', adminAuth, (req, res) => {
    try {
        const leads = statements.getAllSellerLeads.all();
        res.json({ success: true, count: leads.length, leads });
    } catch (error) {
        console.error('[API] Error fetching leads:', error);
        res.status(500).json({ error: 'Failed to fetch leads' });
    }
});

// Admin: mark a lead contacted
router.post('/admin/leads/:id/contacted', adminAuth, (req, res) => {
    try {
        statements.markLeadContacted.run(toInt(req.params.id) || 0);
        res.json({ success: true, message: 'Lead marked as contacted.' });
    } catch (error) {
        console.error('[API] Error marking lead contacted:', error);
        res.status(500).json({ error: 'Failed to update lead' });
    }
});

module.exports = router;
