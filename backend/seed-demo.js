#!/usr/bin/env node
/* ============================================================================
 * seed-demo.js — Demo data for the VDI Realty FSBO tool (LOCAL PREVIEW ONLY)
 *
 * *** NEVER RUN THIS ON PRODUCTION (EC2) ***
 * This script inserts clearly-marked [DEMO] listings, one demo buyer inquiry,
 * and one demo seller lead so the listings page doesn't look empty during
 * local review. Demo rows use the invalid domain "vdirealty.example" and are
 * prefixed with [DEMO] in descriptions, so they can never be mistaken for
 * real inventory.
 *
 * Usage:
 *   node backend/seed-demo.js          # insert demo data (local dev only)
 *   node backend/seed-demo.js --clear  # remove all demo data again
 *
 * Safety guards:
 *   - Refuses to run when NODE_ENV=production.
 *   - Refuses to run against the production data dir (/app/data).
 *   - Every demo row is tagged and removable with --clear.
 * ========================================================================== */

const path = require('path');

if (process.env.NODE_ENV === 'production') {
    console.error('⛔ seed-demo.js refuses to run with NODE_ENV=production. Demo data is for local preview only.');
    process.exit(1);
}

const config = require('./config');

if (String(config.dbPath).startsWith('/app/data')) {
    console.error(`⛔ seed-demo.js refuses to touch the production data dir (${config.dbPath}).`);
    process.exit(1);
}

const { db, statements } = require('./database');

const DEMO_EMAIL = 'demo-poster@vdirealty.example'; // invalid TLD: can never receive real mail
const DAYS = 14;

const now = new Date();
const submissionDate = now.toISOString();
const expirationDate = new Date(now.getTime() + DAYS * 24 * 60 * 60 * 1000).toISOString();

/**
 * Build the 40 positional params for statements.insertListing, in schema order.
 */
function listingParams(f) {
    return [
        f.firstName || 'Demo',                 // 1
        f.lastName || 'Poster',                // 2
        DEMO_EMAIL,                            // 3
        f.phone || '555-010-0000',             // 4
        f.address,                             // 5
        f.city,                                // 6
        f.state,                               // 7
        f.zip,                                 // 8
        f.propertyType,                        // 9
        f.price,                               // 10
        f.sqft,                                // 11
        f.bedrooms ?? null,                    // 12
        f.bathrooms ?? null,                   // 13
        f.yearBuilt ?? null,                   // 14
        f.lotSize ?? null,                     // 15
        f.features || '',                      // 16
        '[DEMO] ' + f.description,             // 17 — clearly marked
        1,                                     // 18 privateContact
        submissionDate,                        // 19
        expirationDate,                        // 20
        f.buildingClass || null,               // 21
        f.zoning || null,                      // 22
        f.occupancyRate ?? null,               // 23
        f.capRate ?? null,                     // 24
        f.grossIncome ?? null,                 // 25
        f.operatingExpenses ?? null,           // 26
        f.numberOfUnits ?? null,               // 27
        f.parkingSpaces ?? null,               // 28
        f.leaseType || null,                   // 29
        f.mlsNumber || null,                   // 30
        f.externalUrl || null,                 // 31
        'fsbo',                                // 32 listingSource
        f.hideAddress ? 1 : 0,                 // 33
        f.hideIdentity ? 1 : 0,                // 34
        'approved',                            // 35 moderationStatus (demo = pre-approved)
        f.sellerType || 'owner',               // 36
        f.builderCompany || null,              // 37
        f.brokerageName || null,               // 38
        f.licenseNumber || null,               // 39
        f.newConstruction ? 1 : 0              // 40
    ];
}

const DEMO_LISTINGS = [
    // ---- Homeowners (For Sale By Owner) ----
    {
        sellerType: 'owner', hideAddress: true, hideIdentity: true,
        address: '1234 148th Ave SE', city: 'Bellevue', state: 'WA', zip: '98007',
        propertyType: 'Single Family', price: 1250000, sqft: 2850,
        bedrooms: 4, bathrooms: 3, yearBuilt: 2019, lotSize: 0.18,
        features: 'Garage, Central AC, Updated Kitchen, Smart Home',
        description: '4-bed, 3-bath home with updated kitchen, quartz counters, and a fenced backyard. Two-car garage with EV charger. Close to parks, shopping, and major employers.'
    },
    {
        sellerType: 'owner', hideAddress: false, hideIdentity: true,
        address: '8820 N 19th Ave', city: 'Phoenix', state: 'AZ', zip: '85021',
        propertyType: 'Condo', price: 389000, sqft: 1180,
        bedrooms: 2, bathrooms: 2, yearBuilt: 2005,
        features: 'Pool, Garage, Central AC',
        description: 'Ground-floor 2-bed condo with covered patio overlooking the community pool. Newer HVAC and water heater. Gated community with fitness center.'
    },
    {
        sellerType: 'owner', hideAddress: true, hideIdentity: false,
        firstName: 'Demo', lastName: 'Seller',
        address: '41-22 149th St', city: 'Flushing', state: 'NY', zip: '11355',
        propertyType: 'Multi-Family', price: 1680000, sqft: 3400,
        bedrooms: 6, bathrooms: 4, yearBuilt: 1938, lotSize: 0.09,
        features: 'Finished Basement, Hardwood Floors',
        description: 'Legal two-family brick home: 3 beds over 3 beds, plus finished basement. Separate utilities and entrances. Strong rental history; sold as investment or house-hack.'
    },
    // ---- Builders / Developers ----
    {
        sellerType: 'builder', builderCompany: 'Cedarline Homes', newConstruction: true,
        hideAddress: false, hideIdentity: true,
        address: '15990 NE 85th St', city: 'Redmond', state: 'WA', zip: '98052',
        propertyType: 'Single Family', price: 1450000, sqft: 3120,
        bedrooms: 5, bathrooms: 3.5, yearBuilt: 2026, lotSize: 0.14,
        features: 'Garage, Central AC, Smart Home, Fireplace, Hardwood Floors',
        description: 'Brand-new construction by Cedarline Homes. Open-concept main level, chef\u2019s kitchen, primary suite with spa bath, and rooftop deck. 10-year builder warranty included.'
    },
    {
        sellerType: 'builder', builderCompany: 'Sonoran Vista Builders', newConstruction: true,
        hideAddress: true, hideIdentity: true,
        address: '7000 E Shea Blvd', city: 'Scottsdale', state: 'AZ', zip: '85254',
        propertyType: 'Townhouse', price: 725000, sqft: 1980,
        bedrooms: 3, bathrooms: 2.5, yearBuilt: 2026,
        features: 'Pool, Garage, Central AC, Smart Home',
        description: 'New-build townhome in a gated Sonoran Vista community. Owned solar, quartz throughout, and a low-maintenance desert landscape package.'
    },
    {
        sellerType: 'builder', builderCompany: 'Liberty Corner Builders', newConstruction: false,
        hideAddress: true, hideIdentity: true,
        address: '220 36th St', city: 'Brooklyn', state: 'NY', zip: '11232',
        propertyType: 'Condo', price: 890000, sqft: 1240,
        bedrooms: 2, bathrooms: 2, yearBuilt: 2024,
        features: 'Central AC, Hardwood Floors, Updated Kitchen',
        description: 'Developer resale: sun-filled 2-bed condo with 9-ft ceilings, in-unit laundry, and virtual doorman. Low taxes via abatement program.'
    },
    // ---- Licensed brokers / agents (brokerage disclosure required) ----
    {
        sellerType: 'broker', brokerageName: 'Demo Realty Group', licenseNumber: 'WA-DEMO-12345',
        firstName: 'Demo', lastName: 'Agent',
        hideAddress: false, hideIdentity: true,
        address: '1200 Westlake Ave N', city: 'Seattle', state: 'WA', zip: '98109',
        propertyType: 'Condo', price: 650000, sqft: 980,
        bedrooms: 2, bathrooms: 2, yearBuilt: 2018,
        features: 'Central AC, Garage, Smart Home',
        description: 'Light-filled corner condo with city views, floor-to-ceiling windows, and secure parking. Listed by Demo Agent, Demo Realty Group.'
    },
    {
        sellerType: 'broker', brokerageName: 'Demo Realty Group', licenseNumber: 'AZ-DEMO-67890',
        firstName: 'Demo', lastName: 'Broker',
        hideAddress: true, hideIdentity: true,
        address: '4500 E Speedway Blvd', city: 'Tucson', state: 'AZ', zip: '85712',
        propertyType: 'Single Family', price: 540000, sqft: 2100,
        bedrooms: 3, bathrooms: 2, yearBuilt: 1998, lotSize: 0.22,
        features: 'Pool, Garage, Fireplace, Central AC',
        description: 'Classic ranch home with diving pool, mature citrus trees, and RV gate. Listed by Demo Broker, Demo Realty Group.'
    }
];

function clearDemo() {
    console.log('🧹 Removing demo data...');
    const li = db.prepare(`DELETE FROM listings WHERE email = ? OR description LIKE '[DEMO]%'`).run(DEMO_EMAIL);
    const iq = db.prepare(`DELETE FROM fsbo_inquiries WHERE email LIKE '%@vdirealty.example'`).run();
    const ld = db.prepare(`DELETE FROM fsbo_seller_leads WHERE email LIKE '%@vdirealty.example'`).run();
    // Clean up any orphaned photos of deleted listings
    db.prepare(`DELETE FROM photos WHERE listingId NOT IN (SELECT id FROM listings)`).run();
    console.log(`   removed ${li.changes} listing(s), ${iq.changes} inquir(ies), ${ld.changes} lead(s).`);
}

function seedDemo() {
    const existing = db.prepare(`SELECT COUNT(*) AS n FROM listings WHERE email = ?`).get(DEMO_EMAIL).n;
    if (existing > 0) {
        console.log(`ℹ️  ${existing} demo listing(s) already present. Run with --clear first to reseed.`);
        return;
    }

    console.log('🌱 Seeding demo FSBO data (LOCAL PREVIEW ONLY)...');
    const ids = [];
    for (const demo of DEMO_LISTINGS) {
        const r = statements.insertListing.run(...listingParams(demo));
        ids.push(Number(r.lastInsertRowid));
    }
    console.log(`   ✅ ${ids.length} demo listings inserted (3 owner, 3 builder, 2 broker) — all [DEMO]-marked, approved, active.`);

    // One demo buyer inquiry on the first listing
    statements.insertInquiry.run(
        ids[0],
        'Demo Buyer',
        'demo-buyer@vdirealty.example',
        '555-010-0101',
        '[DEMO] Hi! Is this home still available? I would love to schedule a showing this weekend.'
    );
    console.log('   ✅ 1 demo buyer inquiry inserted.');

    // One demo "sell with VDI" seller lead
    statements.insertSellerLead.run(
        'Demo Seller',
        'demo-seller@vdirealty.example',
        '555-010-0102',
        '999 Demo Lane',
        'Bellevue',
        'WA',
        '98004',
        '2-3 months',
        '$900,000 - $1,000,000',
        '[DEMO] I would like VDI Realty to help me sell my house.',
        'owner',
        null
    );
    console.log('   ✅ 1 demo seller lead inserted.');
    console.log('\nDone. Browse the listings via GET /api/fsbo/listings (all should appear).');
}

if (require.main === module) {
    if (process.argv.includes('--clear')) clearDemo();
    else seedDemo();
}

module.exports = { seedDemo, clearDemo };
