#!/usr/bin/env node
/* ============================================================================
 * seed-demo-prod.js — ONE-TIME production demo seed for the FSBO tool.
 *
 * Inserts the same 8 clearly-marked [DEMO] listings as the local seed
 * (3 owner, 3 builder/developer, 2 broker — WA/AZ/NY), pre-approved and
 * active with 14-day expiry, plus one demo buyer inquiry and one demo
 * seller lead, so the live board doesn't look empty during review.
 *
 * Every row uses the invalid domain "vdirealty.example" and "[DEMO]"-prefixed
 * descriptions, so demo content can never be mistaken for real inventory.
 *
 * This script does NOTHING unless you pass --confirm-production explicitly.
 * (The local seed-demo.js refuses production entirely; this is the separate,
 *  deliberate, Veng-approved path for the one-time production seed.)
 *
 * Usage (on EC2):
 *   node backend/seed-demo-prod.js --confirm-production
 *   node backend/seed-demo-prod.js --confirm-production --clear
 * ========================================================================== */

const { db, statements } = require('./database');

const DEMO_EMAIL = 'demo-poster@vdirealty.example'; // invalid TLD: can never receive real mail
const DEMO_PHOTO_BASE = 'https://www.vdirealty.com/images/demo-fsbo'; // AI-generated sample illustrations
const DAYS = 14;

const now = new Date();
const submissionDate = now.toISOString();
const expirationDate = new Date(now.getTime() + DAYS * 24 * 60 * 60 * 1000).toISOString();

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
        f.yearBuilt ?? null,                    // 14
        f.lotSize ?? null,                      // 15
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
        address: '1234 Sample Lane', city: 'Bellevue', state: 'WA', zip: '98007',
        propertyType: 'Single Family', price: 1250000, sqft: 2850,
        bedrooms: 4, bathrooms: 3, yearBuilt: 2019, lotSize: 0.18,
        features: 'Garage, Central AC, Updated Kitchen, Smart Home',
        description: '4-bed, 3-bath home with updated kitchen, quartz counters, and a fenced backyard. Two-car garage with EV charger. Close to parks, shopping, and major employers.'
    },
    {
        sellerType: 'owner', hideAddress: false, hideIdentity: true,
        address: '5678 Example Blvd', city: 'Phoenix', state: 'AZ', zip: '85021',
        propertyType: 'Condo', price: 389000, sqft: 1180,
        bedrooms: 2, bathrooms: 2, yearBuilt: 2005,
        features: 'Pool, Garage, Central AC',
        description: 'Ground-floor 2-bed condo with covered patio overlooking the community pool. Newer HVAC and water heater. Gated community with fitness center.'
    },
    {
        sellerType: 'owner', hideAddress: true, hideIdentity: false,
        firstName: 'Demo', lastName: 'Seller',
        address: '9999 Demo Street', city: 'Flushing', state: 'NY', zip: '11355',
        propertyType: 'Multi-Family', price: 1680000, sqft: 3400,
        bedrooms: 6, bathrooms: 4, yearBuilt: 1938, lotSize: 0.09,
        features: 'Finished Basement, Hardwood Floors',
        description: 'Legal two-family brick home: 3 beds over 3 beds, plus finished basement. Separate utilities and entrances. Strong rental history; sold as investment or house-hack.'
    },
    // ---- Builders / Developers ----
    {
        sellerType: 'builder', builderCompany: 'Cedarline Homes', newConstruction: true,
        hideAddress: false, hideIdentity: true,
        address: '4321 Illustration Way', city: 'Redmond', state: 'WA', zip: '98052',
        propertyType: 'Single Family', price: 1450000, sqft: 3120,
        bedrooms: 5, bathrooms: 3.5, yearBuilt: 2026, lotSize: 0.14,
        features: 'Garage, Central AC, Smart Home, Fireplace, Hardwood Floors',
        description: 'Brand-new construction by Cedarline Homes. Open-concept main level, chef\u2019s kitchen, primary suite with spa bath, and rooftop deck. 10-year builder warranty included.'
    },
    {
        sellerType: 'builder', builderCompany: 'Sonoran Vista Builders', newConstruction: true,
        hideAddress: true, hideIdentity: true,
        address: '8765 Sample Court', city: 'Scottsdale', state: 'AZ', zip: '85254',
        propertyType: 'Townhouse', price: 725000, sqft: 1980,
        bedrooms: 3, bathrooms: 2.5, yearBuilt: 2026,
        features: 'Pool, Garage, Central AC, Smart Home',
        description: 'New-build townhome in a gated Sonoran Vista community. Owned solar, quartz throughout, and a low-maintenance desert landscape package.'
    },
    {
        sellerType: 'builder', builderCompany: 'Liberty Corner Builders', newConstruction: false,
        hideAddress: true, hideIdentity: true,
        address: '2468 Example Avenue', city: 'Brooklyn', state: 'NY', zip: '11232',
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
        address: '1357 Demo Place', city: 'Seattle', state: 'WA', zip: '98109',
        propertyType: 'Condo', price: 650000, sqft: 980,
        bedrooms: 2, bathrooms: 2, yearBuilt: 2018,
        features: 'Central AC, Garage, Smart Home',
        description: 'Light-filled corner condo with city views, floor-to-ceiling windows, and secure parking. Listed by Demo Agent, Demo Realty Group.'
    },
    {
        sellerType: 'broker', brokerageName: 'Demo Realty Group', licenseNumber: 'AZ-DEMO-67890',
        firstName: 'Demo', lastName: 'Broker',
        hideAddress: true, hideIdentity: true,
        address: '9753 Sample Drive', city: 'Tucson', state: 'AZ', zip: '85712',
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
    db.prepare(`DELETE FROM photos WHERE listingId NOT IN (SELECT id FROM listings)`).run();
    console.log(`   removed ${li.changes} listing(s), ${iq.changes} inquir(ies), ${ld.changes} lead(s).`);
}

function seedDemo() {
    const existing = db.prepare(`SELECT COUNT(*) AS n FROM listings WHERE email = ?`).get(DEMO_EMAIL).n;
    if (existing > 0) {
        console.log(`ℹ️  ${existing} demo listing(s) already present. Run with --clear first to reseed.`);
        return;
    }
    console.log('🌱 Seeding demo FSBO data (production, one-time, Veng-approved)...');
    const ids = [];
    for (let i = 0; i < DEMO_LISTINGS.length; i++) {
        const demo = DEMO_LISTINGS[i];
        const r = statements.insertListing.run(...listingParams(demo));
        const id = Number(r.lastInsertRowid);
        ids.push(id);
        // One AI-generated sample illustration per demo listing (never a real photo).
        const photoUrl = `${DEMO_PHOTO_BASE}/demo-${i + 1}.jpg`;
        statements.insertPhoto.run(id, `demo-${i + 1}.jpg`, `demo-${i + 1}.jpg`, photoUrl, null, 'image/jpeg', 0);
    }
    console.log(`   ✅ ${ids.length} demo listings inserted (3 owner, 3 builder, 2 broker) — all [DEMO]-marked, approved, active, each with 1 sample illustration.`);

    statements.insertInquiry.run(
        ids[0],
        'Demo Buyer',
        'demo-buyer@vdirealty.example',
        '555-010-0101',
        '[DEMO] Hi! Is this home still available? I would love to schedule a showing this weekend.'
    );
    console.log('   ✅ 1 demo buyer inquiry inserted.');

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
    console.log('\nDone. Verify via GET https://api.vdirealty.com/api/fsbo/listings');
    return { listings: ids.length, inquiries: 1, leads: 1 };
}

if (require.main === module) {
    if (!process.argv.includes('--confirm-production')) {
        console.error('⛔ Refusing to seed: pass --confirm-production to run this on the server.');
        process.exit(1);
    }
    if (process.argv.includes('--clear')) clearDemo();
    else seedDemo();
}

module.exports = { seedDemo, clearDemo };
