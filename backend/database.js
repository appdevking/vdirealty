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
        { name: 'listingSource', type: 'TEXT DEFAULT \'fsbo\'' }
    ];
    
    // Add missing columns
    let migrationsRun = 0;
    let listingSourceAdded = false;
    newColumns.forEach(column => {
        if (!existingColumns.includes(column.name)) {
            console.log(`  ➕ Adding column: ${column.name} (${column.type})`);
            db.exec(`ALTER TABLE listings ADD COLUMN ${column.name} ${column.type}`);
            if (column.name === 'listingSource') {
                listingSourceAdded = true;
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
            mlsNumber, externalUrl, listingSource
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `),

    // Insert photo
    insertPhoto: db.prepare(`
        INSERT INTO photos (listingId, filename, originalName, path, size, mimeType, displayOrder)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `),

    // Get all active listings
    getActiveListings: db.prepare(`
        SELECT * FROM listings 
        WHERE status = 'active' AND expirationDate > datetime('now')
        ORDER BY createdAt DESC
    `),

    // Get active listings by source
    getActiveListingsBySource: db.prepare(`
        SELECT * FROM listings 
        WHERE status = 'active' AND expirationDate > datetime('now') 
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
    `)
};

module.exports = {
    db,
    initDatabase,
    statements
};
