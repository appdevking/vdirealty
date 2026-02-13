const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { statements } = require('../database');
const { sendConfirmationEmail, sendAdminNotification } = require('../email-service');
const config = require('../config');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, config.uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'listing-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: config.maxFileSize },
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif|webp/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        
        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('Only image files are allowed!'));
        }
    }
});

// Submit new FSBO listing
router.post('/submit', upload.array('photos', config.maxFiles), async (req, res) => {
    try {
        const data = req.body;
        const files = req.files || [];
        
        // Validate required fields
        const isCommercial = data.propertyType === 'Commercial';
        
        if (!data.firstName || !data.lastName || !data.email || !data.phone || 
            !data.address || !data.city || !data.zip || !data.propertyType ||
            !data.price || !data.sqft || !data.description) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        
        // For non-commercial properties, bedrooms and bathrooms are required
        if (!isCommercial && (!data.bedrooms || !data.bathrooms)) {
            return res.status(400).json({ error: 'Bedrooms and bathrooms are required for residential properties' });
        }
        
        // Calculate dates
        const submissionDate = new Date();
        const expirationDate = new Date(submissionDate);
        expirationDate.setDate(expirationDate.getDate() + config.listingDurationDays);
        
        // Insert listing
        const result = statements.insertListing.run(
            data.firstName,
            data.lastName,
            data.email,
            data.phone,
            data.address,
            data.city,
            data.state || 'WA',
            data.zip,
            data.propertyType,
            parseInt(data.price),
            parseInt(data.sqft),
            data.bedrooms ? parseInt(data.bedrooms) : null,
            data.bathrooms ? parseFloat(data.bathrooms) : null,
            data.yearBuilt ? parseInt(data.yearBuilt) : null,
            data.lotSize ? parseFloat(data.lotSize) : null,
            data.features || '',
            data.description,
            data.privateContact === 'true' || data.privateContact === 'on' ? 1 : 0,
            submissionDate.toISOString(),
            expirationDate.toISOString(),
            data.buildingClass || null,
            data.zoning || null,
            data.occupancyRate ? parseFloat(data.occupancyRate) : null,
            data.capRate ? parseFloat(data.capRate) : null,
            data.grossIncome ? parseInt(data.grossIncome) : null,
            data.operatingExpenses ? parseInt(data.operatingExpenses) : null,
            data.numberOfUnits ? parseInt(data.numberOfUnits) : null,
            data.parkingSpaces ? parseInt(data.parkingSpaces) : null,
            data.leaseType || null,
            data.mlsNumber || null,
            data.externalUrl || null
        );
        
        const listingId = result.lastInsertRowid;
        
        // Insert uploaded photos
        if (files.length > 0) {
            files.forEach((file, index) => {
                statements.insertPhoto.run(
                    listingId,
                    file.filename,
                    file.originalname,
                    file.path,
                    file.size,
                    file.mimetype,
                    index
                );
            });
        }
        
        // Insert extracted photo URLs (from listing extraction)
        if (data.photoUrls) {
            try {
                const photoUrls = JSON.parse(data.photoUrls);
                photoUrls.forEach((url, index) => {
                    // For URL-based photos, store URL as the path
                    statements.insertPhoto.run(
                        listingId,
                        `extracted-${index}.jpg`, // Placeholder filename
                        `Extracted Photo ${index + 1}`, // Original name
                        url, // Store URL as path
                        0, // Size unknown
                        'image/jpeg', // Default mime type
                        files.length + index // Order after uploaded files
                    );
                });
            } catch (e) {
                console.error('Error parsing photoUrls:', e);
            }
        }
        
        // Get complete listing data
        const listing = statements.getListingById.get(listingId);
        
        // Send emails (don't wait for them)
        sendConfirmationEmail(listing).catch(err => console.error('Email error:', err));
        sendAdminNotification(listing).catch(err => console.error('Admin email error:', err));
        
        res.json({
            success: true,
            message: 'Listing submitted successfully',
            listingId: listingId,
            expirationDate: expirationDate.toISOString()
        });
        
    } catch (error) {
        console.error('Error submitting listing:', error);
        
        // Clean up uploaded files on error
        if (req.files) {
            req.files.forEach(file => {
                fs.unlink(file.path, err => {
                    if (err) console.error('Error deleting file:', err);
                });
            });
        }
        
        res.status(500).json({ error: 'Failed to submit listing', details: error.message });
    }
});

// Get all active listings
router.get('/listings', (req, res) => {
    try {
        const listings = statements.getActiveListings.all();
        
        // Attach photos to each listing
        const listingsWithPhotos = listings.map(listing => {
            const photos = statements.getPhotosByListingId.all(listing.id);
            return {
                ...listing,
                photos: photos.map(photo => ({
                    id: photo.id,
                    filename: photo.filename,
                    // If path is a URL (extracted photo), use it directly; otherwise use local endpoint
                    url: photo.path.startsWith('http') ? photo.path : `/api/fsbo/photo/${photo.filename}`
                })),
                // Hide contact info if private
                email: listing.privateContact ? null : listing.email,
                phone: listing.privateContact ? null : listing.phone
            };
        });
        
        res.json({
            success: true,
            count: listingsWithPhotos.length,
            listings: listingsWithPhotos
        });
    } catch (error) {
        console.error('Error fetching listings:', error);
        res.status(500).json({ error: 'Failed to fetch listings' });
    }
});

// Get single listing by ID
router.get('/listing/:id', (req, res) => {
    try {
        const listing = statements.getListingById.get(req.params.id);
        
        if (!listing) {
            return res.status(404).json({ error: 'Listing not found' });
        }
        
        if (listing.status !== 'active') {
            return res.status(404).json({ error: 'Listing is no longer active' });
        }
        
        const photos = statements.getPhotosByListingId.all(listing.id);
        
        res.json({
            success: true,
            listing: {
                ...listing,
                photos: photos.map(photo => ({
                    id: photo.id,
                    filename: photo.filename,
                    // If path is a URL (extracted photo), use it directly; otherwise use local endpoint
                    url: photo.path.startsWith('http') ? photo.path : `/api/fsbo/photo/${photo.filename}`
                })),
                // Hide contact info if private
                email: listing.privateContact ? null : listing.email,
                phone: listing.privateContact ? null : listing.phone
            }
        });
    } catch (error) {
        console.error('Error fetching listing:', error);
        res.status(500).json({ error: 'Failed to fetch listing' });
    }
});

// Serve photo files
router.get('/photo/:filename', (req, res) => {
    const filename = req.params.filename;
    const filepath = path.join(config.uploadDir, filename);
    
    // Security: prevent directory traversal
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
        return res.status(400).json({ error: 'Invalid filename' });
    }
    
    res.sendFile(path.resolve(filepath), (err) => {
        if (err) {
            res.status(404).json({ error: 'Photo not found' });
        }
    });
});

// Contact seller (for private listings)
router.post('/contact/:listingId', async (req, res) => {
    try {
        const { name, email, phone, message } = req.body;
        const listing = statements.getListingById.get(req.params.listingId);
        
        if (!listing) {
            return res.status(404).json({ error: 'Listing not found' });
        }
        
        // Forward inquiry to seller
        const { sendInquiryToSeller } = require('../email-service');
        await sendInquiryToSeller(listing, { name, email, phone, message });
        
        res.json({ success: true, message: 'Your inquiry has been sent to the seller' });
    } catch (error) {
        console.error('Error sending inquiry:', error);
        res.status(500).json({ error: 'Failed to send inquiry' });
    }
});

module.exports = router;
