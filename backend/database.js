const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const config = require('./config');

// Ensure data directory exists (for production)
const dataDir = path.dirname(config.dbPath);
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
    console.log(`📁 Created data directory: ${dataDir}`);
}

// Ensure uploads directory exists
if (!fs.existsSync(config.uploadDir)) {
    fs.mkdirSync(config.uploadDir, { recursive: true });
    console.log(`📁 Created uploads directory: ${config.uploadDir}`);
}

// Initialize SQLite database
const db = new Database(config.dbPath);
console.log(`🗄️  Database location: ${config.dbPath}`);

// Enable WAL mode for better concurrency
db.pragma('journal_mode = WAL');

// Enforce foreign keys explicitly — required for ON DELETE CASCADE on
// photos/inquiries. (Some better-sqlite3 versions enable this by default,
// others follow SQLite's default of OFF; be deterministic.)
db.pragma('foreign_keys = ON');

// Create tables
const initDatabase = () => {
    // Listings table
    db.exec(`
        CREATE TABLE IF NOT EXISTS listings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            firstName TEXT NOT NULL,
            lastName TEXT NOT NULL,
            email TEXT NOT NULL,
            phone TEXT NOT NULL,
            address TEXT NOT NULL,
            city TEXT NOT NULL,
            state TEXT NOT NULL DEFAULT 'WA',
            zip TEXT NOT NULL,
            propertyType TEXT NOT NULL,
            price INTEGER NOT NULL,
            sqft INTEGER NOT NULL,
            bedrooms INTEGER,
            bathrooms REAL,
            yearBuilt INTEGER,
            lotSize REAL,
            features TEXT,
            description TEXT NOT NULL,
            privateContact INTEGER DEFAULT 1,
            submissionDate TEXT NOT NULL,
            expirationDate TEXT NOT NULL,
            status TEXT DEFAULT 'active',
            reminderSent INTEGER DEFAULT 0,
            buildingClass TEXT,
            zoning TEXT,
            occupancyRate REAL,
            capRate REAL,
            grossIncome INTEGER,
            operatingExpenses INTEGER,
            numberOfUnits INTEGER,
            parkingSpaces INTEGER,
            leaseType TEXT,
            mlsNumber TEXT,
            externalUrl TEXT,
            hideAddress INTEGER DEFAULT 1,
            hideIdentity INTEGER DEFAULT 1,
            moderationStatus TEXT DEFAULT 'pending',
            sellerType TEXT DEFAULT 'owner' CHECK(sellerType IN ('owner', 'builder', 'broker')),
            builderCompany TEXT,
            brokerageName TEXT,
            licenseNumber TEXT,
            newConstruction INTEGER DEFAULT 0,
            createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
            updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Photos table
    db.exec(`
        CREATE TABLE IF NOT EXISTS photos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            listingId INTEGER NOT NULL,
            filename TEXT NOT NULL,
            originalName TEXT,
            path TEXT NOT NULL,
            size INTEGER,
            mimeType TEXT,
            displayOrder INTEGER DEFAULT 0,
            createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (listingId) REFERENCES listings(id) ON DELETE CASCADE
        )
    `);

    // Buyer inquiries on FSBO listings (relayed to seller without exposing seller email)
    db.exec(`
        CREATE TABLE IF NOT EXISTS fsbo_inquiries (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            listingId INTEGER NOT NULL,
            name TEXT NOT NULL,
            email TEXT NOT NULL,
            phone TEXT,
            message TEXT NOT NULL,
            isRead INTEGER DEFAULT 0,
            createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (listingId) REFERENCES listings(id) ON DELETE CASCADE
        )
    `);

    // "Sell with VDI" seller-lead capture (homeowners + builders)
    db.exec(`
        CREATE TABLE IF NOT EXISTS fsbo_seller_leads (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT NOT NULL,
            phone TEXT,
            propertyAddress TEXT,
            city TEXT,
            state TEXT,
            zip TEXT,
            timeline TEXT,
            priceExpectation TEXT,
            message TEXT,
            sellerType TEXT DEFAULT 'owner',
            sourceListingId INTEGER,
            contacted INTEGER DEFAULT 0,
            createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Technical help requests for the FSBO posting flow (answered by Jae)
    db.exec(`
        CREATE TABLE IF NOT EXISTS fsbo_help_requests (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT NOT NULL,
            phone TEXT,
            issue TEXT,
            message TEXT,
            status TEXT DEFAULT 'open',
            createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Concierge listing requests — "paste a link, we do the rest" intake for
    // builders/developers/agents/homeowners. Jae (or the team) creates the
    // actual listing from the link; nothing here auto-publishes.
    db.exec(`
        CREATE TABLE IF NOT EXISTS fsbo_concierge_requests (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT NOT NULL,
            phone TEXT,
            posterType TEXT NOT NULL DEFAULT 'owner',
            company TEXT,
            listingUrl TEXT NOT NULL,
            notes TEXT,
            consent INTEGER DEFAULT 0,
            status TEXT DEFAULT 'open',
            createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // SMS subscribers for the text-a-ZIP lead flow.
    // status: 'inquiry' (texted a ZIP, no marketing consent), 'alerts' (opted in
    // via YES), 'unsubscribed' (STOP).
    db.exec(`
        CREATE TABLE IF NOT EXISTS fsbo_sms_subscribers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            phone TEXT NOT NULL UNIQUE,
            status TEXT NOT NULL DEFAULT 'inquiry',
            lastZip TEXT,
            zipQueryCount INTEGER DEFAULT 0,
            alertConsentAt DATETIME,
            unsubscribedAt DATETIME,
            createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
            updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Create indexes for better performance
    db.exec(`
        CREATE INDEX IF NOT EXISTS idx_listings_status ON listings(status);
        CREATE INDEX IF NOT EXISTS idx_listings_expiration ON listings(expirationDate);
        CREATE INDEX IF NOT EXISTS idx_photos_listing ON photos(listingId);
    `);

    console.log('✅ Database initialized successfully');
};

// Run migrations to add new columns to existing tables
const runMigrations = () => {
    console.log('🔄 Running database migrations...');
    
    // Get existing columns in listings table
    const tableInfo = db.pragma('table_info(listings)');
    const existingColumns = tableInfo.map(col => col.name);
    
    // Define new columns to add
    const newColumns = [
        { name: 'buildingClass', type: 'TEXT' },
        { name: 'zoning', type: 'TEXT' },
        { name: 'occupancyRate', type: 'REAL' },
        { name: 'capRate', type: 'REAL' },
        { name: 'grossIncome', type: 'INTEGER' },
        { name: 'operatingExpenses', type: 'INTEGER' },
        { name: 'numberOfUnits', type: 'INTEGER' },
        { name: 'parkingSpaces', type: 'INTEGER' },
        { name: 'leaseType', type: 'TEXT' },
        { name: 'mlsNumber', type: 'TEXT' },
        { name: 'externalUrl', type: 'TEXT' },
        { name: 'listingSource', type: 'TEXT DEFAULT \'fsbo\'' },
        { name: 'hideAddress', type: 'INTEGER DEFAULT 1' },
        { name: 'hideIdentity', type: 'INTEGER DEFAULT 1' },
        { name: 'moderationStatus', type: 'TEXT DEFAULT \'pending\'' },
        { name: 'sellerType', type: 'TEXT DEFAULT \'owner\'' },
        { name: 'builderCompany', type: 'TEXT' },
        { name: 'brokerageName', type: 'TEXT' },
        { name: 'licenseNumber', type: 'TEXT' },
        { name: 'newConstruction', type: 'INTEGER DEFAULT 0' }
    ];
    
    // Add missing columns
    let migrationsRun = 0;
    let listingSourceAdded = false;
    let moderationAdded = false;
    newColumns.forEach(column => {
        if (!existingColumns.includes(column.name)) {
            console.log(`  ➕ Adding column: ${column.name} (${column.type})`);
            db.exec(`ALTER TABLE listings ADD COLUMN ${column.name} ${column.type}`);
            if (column.name === 'listingSource') {
                listingSourceAdded = true;
            }
            if (column.name === 'moderationStatus') {
                moderationAdded = true;
            }
            migrationsRun++;
        }
    });
    
    // Update existing records with NULL listingSource to 'fsbo'
    // This handles both: newly created column and existing column with NULL values
    if (listingSourceAdded || existingColumns.includes('listingSource')) {
        db.exec(`UPDATE listings SET listingSource = 'fsbo' WHERE listingSource IS NULL`);
        console.log('  🔄 Updated NULL listingSource values to \'fsbo\'');
    }

    // Listings that already existed (and were already public) stay approved;
    // only brand-new submissions go through the pending review queue.
    if (moderationAdded) {
        db.exec(`UPDATE listings SET moderationStatus = 'approved' WHERE moderationStatus = 'pending' OR moderationStatus IS NULL`);
        console.log('  🔄 Existing listings marked approved (new submissions start as pending)');
    }
    
    // Make bedrooms and bathrooms nullable if they're NOT NULL (for older databases)
    // SQLite doesn't support ALTER COLUMN, so we'll skip this for now
    // Existing data will have these fields, new commercial properties can be NULL
    
    if (migrationsRun > 0) {
        console.log(`✅ Applied ${migrationsRun} database migration(s)`);
    } else {
        console.log('✅ Database schema is up to date');
    }
};

// Initialize database tables before preparing statements
// This ensures tables exist when db.prepare is called
initDatabase();
runMigrations();

// Prepared statements for better performance
const statements = {
    // Insert new listing
    insertListing: db.prepare(`
        INSERT INTO listings (
            firstName, lastName, email, phone, address, city, state, zip,
            propertyType, price, sqft, bedrooms, bathrooms, yearBuilt, lotSize,
            features, description, privateContact, submissionDate, expirationDate,
            buildingClass, zoning, occupancyRate, capRate, grossIncome,
            operatingExpenses, numberOfUnits, parkingSpaces, leaseType,
            mlsNumber, externalUrl, listingSource,
            hideAddress, hideIdentity, moderationStatus, sellerType, builderCompany,
            brokerageName, licenseNumber, newConstruction
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `),

    // Insert photo
    insertPhoto: db.prepare(`
        INSERT INTO photos (listingId, filename, originalName, path, size, mimeType, displayOrder)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `),

    // Get all active listings (only approved, unexpired)
    getActiveListings: db.prepare(`
        SELECT * FROM listings 
        WHERE status = 'active' AND moderationStatus = 'approved' AND expirationDate > datetime('now')
        ORDER BY createdAt DESC
    `),

    // Get active listings by source (only approved, unexpired)
    getActiveListingsBySource: db.prepare(`
        SELECT * FROM listings 
        WHERE status = 'active' AND moderationStatus = 'approved' AND expirationDate > datetime('now') 
        AND (listingSource = ? OR (listingSource IS NULL AND ? = 'fsbo'))
        ORDER BY createdAt DESC
    `),

    // Get listing by ID
    getListingById: db.prepare(`
        SELECT * FROM listings WHERE id = ?
    `),

    // Get photos for listing
    getPhotosByListingId: db.prepare(`
        SELECT * FROM photos WHERE listingId = ? ORDER BY displayOrder
    `),

    // Update listing status
    updateListingStatus: db.prepare(`
        UPDATE listings SET status = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?
    `),

    // Expire old listings
    expireOldListings: db.prepare(`
        UPDATE listings 
        SET status = 'expired', updatedAt = CURRENT_TIMESTAMP
        WHERE status = 'active' AND expirationDate < datetime('now')
    `),

    // Get listings needing reminders
    getListingsNeedingReminder: db.prepare(`
        SELECT * FROM listings 
        WHERE status = 'active' 
        AND reminderSent = 0
        AND date(expirationDate, '-' || ? || ' days') <= date('now')
        AND expirationDate > datetime('now')
    `),

    // Mark reminder sent
    markReminderSent: db.prepare(`
        UPDATE listings SET reminderSent = 1, updatedAt = CURRENT_TIMESTAMP WHERE id = ?
    `),

    // Admin: Get all listings (including removed)
    getAllListings: db.prepare(`
        SELECT * FROM listings ORDER BY createdAt DESC
    `),

    // Moderation: update approval state
    updateModerationStatus: db.prepare(`
        UPDATE listings SET moderationStatus = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?
    `),

    // Moderation: pending queue
    getPendingListings: db.prepare(`
        SELECT * FROM listings WHERE moderationStatus = 'pending' AND status = 'active' ORDER BY createdAt DESC
    `),

    // Buyer inquiry: insert
    insertInquiry: db.prepare(`
        INSERT INTO fsbo_inquiries (listingId, name, email, phone, message)
        VALUES (?, ?, ?, ?, ?)
    `),

    // Buyer inquiry: by listing (for seller dashboard / admin)
    getInquiriesByListingId: db.prepare(`
        SELECT * FROM fsbo_inquiries WHERE listingId = ? ORDER BY createdAt DESC
    `),

    // Buyer inquiry: all, newest first (admin)
    getAllInquiries: db.prepare(`
        SELECT i.*, l.address, l.city, l.state, l.zip, l.propertyType, l.price
        FROM fsbo_inquiries i
        LEFT JOIN listings l ON l.id = i.listingId
        ORDER BY i.createdAt DESC
    `),

    // Buyer inquiry: mark read
    markInquiryRead: db.prepare(`
        UPDATE fsbo_inquiries SET isRead = 1 WHERE id = ?
    `),

    // Seller lead: insert
    insertSellerLead: db.prepare(`
        INSERT INTO fsbo_seller_leads (
            name, email, phone, propertyAddress, city, state, zip,
            timeline, priceExpectation, message, sellerType, sourceListingId
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `),

    // Seller lead: all, newest first (admin)
    getAllSellerLeads: db.prepare(`
        SELECT * FROM fsbo_seller_leads ORDER BY createdAt DESC
    `),

    // Seller lead: mark contacted
    markLeadContacted: db.prepare(`
        UPDATE fsbo_seller_leads SET contacted = 1 WHERE id = ?
    `),

    // Technical help request: insert
    insertHelpRequest: db.prepare(`
        INSERT INTO fsbo_help_requests (
            name, email, phone, issue, message, status
        ) VALUES (?, ?, ?, ?, ?, 'open')
    `),

    // Technical help request: all, newest first (admin)
    getAllHelpRequests: db.prepare(`
        SELECT * FROM fsbo_help_requests ORDER BY createdAt DESC
    `),

    // Technical help request: mark resolved
    markHelpRequestResolved: db.prepare(`
        UPDATE fsbo_help_requests SET status = 'resolved' WHERE id = ?
    `),

    // Concierge request: insert
    insertConciergeRequest: db.prepare(`
        INSERT INTO fsbo_concierge_requests (
            name, email, phone, posterType, company, listingUrl, notes, consent, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'open')
    `),

    // Concierge request: all, newest first (admin)
    getAllConciergeRequests: db.prepare(`
        SELECT * FROM fsbo_concierge_requests ORDER BY createdAt DESC
    `),

    // Concierge request: mark done
    markConciergeRequestDone: db.prepare(`
        UPDATE fsbo_concierge_requests SET status = 'done' WHERE id = ?
    `),

    // SMS subscriber: upsert by phone (E.164 from Twilio).
    // Status is never changed here — a STOP'd user texting a ZIP still gets the
    // one-time reply but stays unsubscribed until they send START.
    upsertSmsSubscriber: db.prepare(`
        INSERT INTO fsbo_sms_subscribers (phone, status, lastZip, zipQueryCount, updatedAt)
        VALUES (?, 'inquiry', ?, 1, CURRENT_TIMESTAMP)
        ON CONFLICT(phone) DO UPDATE SET
            lastZip = excluded.lastZip,
            zipQueryCount = fsbo_sms_subscribers.zipQueryCount + 1,
            updatedAt = CURRENT_TIMESTAMP
    `),

    // SMS subscriber: fetch by phone
    getSmsSubscriber: db.prepare(`
        SELECT * FROM fsbo_sms_subscribers WHERE phone = ?
    `),

    // SMS subscriber: set alerts consent (opt in via YES)
    setSmsAlertsConsent: db.prepare(`
        UPDATE fsbo_sms_subscribers
        SET status = 'alerts', alertConsentAt = CURRENT_TIMESTAMP,
            unsubscribedAt = NULL, updatedAt = CURRENT_TIMESTAMP
        WHERE phone = ?
    `),

    // SMS subscriber: unsubscribe (STOP)
    unsubscribeSmsSubscriber: db.prepare(`
        UPDATE fsbo_sms_subscribers
        SET status = 'unsubscribed', unsubscribedAt = CURRENT_TIMESTAMP,
            updatedAt = CURRENT_TIMESTAMP
        WHERE phone = ?
    `),

    // SMS subscriber: resubscribe via START (only if a ZIP was ever given)
    resubscribeSmsSubscriber: db.prepare(`
        UPDATE fsbo_sms_subscribers
        SET status = 'alerts', alertConsentAt = CURRENT_TIMESTAMP,
            unsubscribedAt = NULL, updatedAt = CURRENT_TIMESTAMP
        WHERE phone = ? AND lastZip IS NOT NULL
    `)
};

module.exports = {
    db,
    initDatabase,
    statements
};
