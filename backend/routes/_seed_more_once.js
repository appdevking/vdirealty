/* ============================================================================
 * TEMPORARY one-time endpoint — second demo seed (4 listings).
 * Fills the empty browse buckets: Partner Listings source, Land, Commercial.
 * Mounted at POST /api/fsbo/_seed_more_once with a one-time token.
 * DELETE THIS FILE (and its server.js mount) immediately after use.
 * ========================================================================== */
const express = require('express');
const router = express.Router();
const { db, statements } = require('../database');

const ONE_TIME_TOKEN = 'd067e96bfdc6fbb79b7246159bac832978c3a2b3fbc043ad';
const DEMO_EMAIL = 'demo-poster@vdirealty.example';
const DEMO_PHOTO_BASE = 'https://www.vdirealty.com/images/demo-fsbo';
const DAYS = 14;

const MORE_DEMOS = [
    {
        listingSource: 'partner', sellerType: 'broker',
        brokerageName: 'Harborline Realty', licenseNumber: 'WA-DEMO-24680',
        firstName: 'Demo', lastName: 'Agent',
        hideAddress: false, hideIdentity: true,
        address: '2468 Sample Terrace', city: 'Seattle', state: 'WA', zip: '98117',
        propertyType: 'Single Family', price: 875000, sqft: 2400,
        bedrooms: 4, bathrooms: 2.5, yearBuilt: 2007, lotSize: 0.16,
        features: 'Garage, Fireplace, Updated Kitchen, Deck',
        description: 'Classic Northwest 4-bed with vaulted ceilings, gas fireplace, and a big entertainer\u2019s deck. Listed by Demo Agent, Harborline Realty.',
        photo: 'demo-9.jpg'
    },
    {
        listingSource: 'partner', sellerType: 'broker',
        brokerageName: 'Desert Sage Realty', licenseNumber: 'AZ-DEMO-13579',
        firstName: 'Demo', lastName: 'Broker',
        hideAddress: true, hideIdentity: true,
        address: '1357 Illustration Court', city: 'Mesa', state: 'AZ', zip: '85201',
        propertyType: 'Condo', price: 425000, sqft: 1150,
        bedrooms: 2, bathrooms: 2, yearBuilt: 2015,
        features: 'Pool, Garage, Central AC',
        description: 'Top-floor 2-bed condo with mountain views, owned solar, and resort-style pool. Listed by Demo Broker, Desert Sage Realty.',
        photo: 'demo-10.jpg'
    },
    {
        listingSource: 'fsbo', sellerType: 'owner',
        hideAddress: true, hideIdentity: true,
        address: '9753 Example Ridge Road', city: 'Spokane', state: 'WA', zip: '99217',
        propertyType: 'Land', price: 185000, sqft: 0,
        bedrooms: null, bathrooms: null, yearBuilt: null, lotSize: 1.25,
        features: 'Water/Septic Feasible, Mountain Views',
        description: 'Build-ready 1.25-acre lot with territorial views. Power at street; perc test on file. Buyer to verify all utilities and zoning.',
        photo: 'demo-11.jpg'
    },
    {
        listingSource: 'partner', sellerType: 'broker',
        brokerageName: 'Empire State Commercial Group', licenseNumber: 'NY-DEMO-97531',
        firstName: 'Demo', lastName: 'Agent',
        hideAddress: false, hideIdentity: true,
        address: '8642 Sample Plaza', city: 'Brooklyn', state: 'NY', zip: '11201',
        propertyType: 'Commercial', price: 2400000, sqft: 6800,
        bedrooms: null, bathrooms: null, yearBuilt: 1962, lotSize: 0.11,
        features: 'Street Retail, 4 Units, 6 Parking Spaces',
        description: 'Mixed-use investment: street-level retail plus 3 residential units, 92% occupied. Value-add upside on expiring leases. Listed by Demo Agent, Empire State Commercial Group.',
        buildingClass: 'Class B', zoning: 'M1-2', occupancyRate: 92, capRate: 6.25,
        grossIncome: 210000, operatingExpenses: 68000, numberOfUnits: 4,
        parkingSpaces: 6, leaseType: 'Triple Net (NNN)',
        photo: 'demo-12.jpg'
    }
];

router.post('/_seed_more_once', (req, res) => {
    if (req.body.token !== ONE_TIME_TOKEN) {
        return res.status(403).json({ error: 'Forbidden' });
    }
    try {
        const now = new Date();
        const submissionDate = now.toISOString();
        const expirationDate = new Date(now.getTime() + DAYS * 24 * 60 * 60 * 1000).toISOString();
        const ids = [];
        const skipped = [];
        for (const f of MORE_DEMOS) {
            const exists = db.prepare(`SELECT COUNT(*) AS n FROM photos WHERE path LIKE ?`).get('%' + f.photo).n;
            if (exists > 0) { skipped.push(f.photo); continue; }
            const r = statements.insertListing.run(
                f.firstName || 'Demo', f.lastName || 'Poster', DEMO_EMAIL,
                f.phone || '555-010-0000', f.address, f.city, f.state, f.zip,
                f.propertyType, f.price, f.sqft, f.bedrooms ?? null, f.bathrooms ?? null,
                f.yearBuilt ?? null, f.lotSize ?? null, f.features || '',
                '[DEMO] ' + f.description, 1, submissionDate, expirationDate,
                f.buildingClass || null, f.zoning || null, f.occupancyRate ?? null,
                f.capRate ?? null, f.grossIncome ?? null, f.operatingExpenses ?? null,
                f.numberOfUnits ?? null, f.parkingSpaces ?? null, f.leaseType || null,
                f.mlsNumber || null, f.externalUrl || null,
                f.listingSource, f.hideAddress ? 1 : 0, f.hideIdentity ? 1 : 0,
                'approved', f.sellerType || 'owner', f.builderCompany || null,
                f.brokerageName || null, f.licenseNumber || null, f.newConstruction ? 1 : 0
            );
            const id = Number(r.lastInsertRowid);
            ids.push(id);
            const photoUrl = `${DEMO_PHOTO_BASE}/${f.photo}`;
            statements.insertPhoto.run(id, f.photo, f.photo, photoUrl, null, 'image/jpeg', 0);
        }
        res.json({ ok: true, seeded: ids.length, ids, skipped });
    } catch (e) {
        console.error('[seed-more] error:', e.message);
        res.status(500).json({ ok: false, error: e.message });
    }
});

module.exports = router;
