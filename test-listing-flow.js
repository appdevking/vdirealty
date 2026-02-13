/**
 * Test Script for VDI Realty FSBO Listing Flow
 * 
 * This script tests the complete listing lifecycle:
 * 1. Submit a new FSBO listing
 * 2. Verify it appears in public listings (fsbo-listings.html, listings.html)
 * 3. Verify it appears in admin panel
 * 4. Delete the listing via admin
 * 5. Verify it's removed from public view but still in admin with 'removed' status
 * 
 * Usage: node test-listing-flow.js
 */

const API_BASE_URL = 'https://api.vdirealty.com';
const ADMIN_PASSWORD = 'VDI2025AdminSecure789'; // From .env

// ANSI color codes for terminal output
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
    bold: '\x1b[1m'
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

function logStep(step, description) {
    log(`\n${'='.repeat(60)}`, 'cyan');
    log(`STEP ${step}: ${description}`, 'bold');
    log('='.repeat(60), 'cyan');
}

function logSuccess(message) {
    log(`✓ ${message}`, 'green');
}

function logError(message) {
    log(`✗ ${message}`, 'red');
}

function logInfo(message) {
    log(`ℹ ${message}`, 'blue');
}

// Test data for a residential listing
const testListing = {
    // Contact Info
    firstName: 'Test',
    lastName: 'Seller',
    email: 'test.seller@example.com',
    phone: '(206) 555-0123',
    
    // Property Address
    address: '123 Test Street',
    city: 'Seattle',
    state: 'WA',
    zip: '98101',
    
    // Property Type
    propertyType: 'Single Family',
    
    // Property Details
    price: 650000,
    sqft: 2400,
    bedrooms: 3,
    bathrooms: 2.5,
    yearBuilt: 2015,
    lotSize: 0.25,
    
    // Features & Description
    features: 'Hardwood floors, Updated kitchen, Master suite, Garage, Fenced yard',
    description: 'Beautiful test property in the heart of Seattle. This is a test listing created by the automated test script. Features modern finishes, open floor plan, and great location. Perfect for testing the VDI Realty FSBO listing system.',
    
    // Privacy
    privateContact: false,
    
    // MLS/External (optional)
    mlsNumber: '',
    externalUrl: ''
};

// Sleep helper function
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// API helper functions
async function apiRequest(method, endpoint, data = null, headers = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    const options = {
        method,
        headers: {
            'Content-Type': 'application/json',
            ...headers
        }
    };
    
    if (data && method !== 'GET') {
        options.body = JSON.stringify(data);
    }
    
    try {
        const response = await fetch(url, options);
        const responseData = await response.json();
        
        return {
            ok: response.ok,
            status: response.status,
            data: responseData
        };
    } catch (error) {
        return {
            ok: false,
            status: 0,
            error: error.message
        };
    }
}

// Test functions
async function testSubmitListing() {
    logStep(1, 'Submit New FSBO Listing');
    
    logInfo(`Submitting test listing for: ${testListing.address}, ${testListing.city}`);
    logInfo(`Property Type: ${testListing.propertyType}`);
    logInfo(`Price: $${testListing.price.toLocaleString()}`);
    logInfo(`Details: ${testListing.bedrooms} bed, ${testListing.bathrooms} bath, ${testListing.sqft} sqft`);
    
    const result = await apiRequest('POST', '/api/fsbo/submit', testListing);
    
    if (result.ok && result.data.success) {
        logSuccess(`Listing created successfully!`);
        logInfo(`Listing ID: ${result.data.listingId}`);
        logInfo(`Expiration Date: ${new Date(result.data.expirationDate).toLocaleDateString()}`);
        return result.data.listingId;
    } else {
        logError(`Failed to create listing: ${result.data.error || result.error || 'Unknown error'}`);
        throw new Error('Failed to create listing');
    }
}

async function testPublicListings(expectedListingId) {
    logStep(2, 'Verify Listing Appears in Public View');
    
    logInfo('Fetching public listings (GET /api/fsbo/listings)...');
    
    const result = await apiRequest('GET', '/api/fsbo/listings');
    
    if (result.ok && result.data.success) {
        logSuccess(`Retrieved ${result.data.count} public listing(s)`);
        
        // Find our test listing
        const ourListing = result.data.listings.find(l => l.id === expectedListingId);
        
        if (ourListing) {
            logSuccess(`Test listing found in public listings!`);
            logInfo(`Address: ${ourListing.address}, ${ourListing.city}, ${ourListing.state} ${ourListing.zip}`);
            logInfo(`Price: $${ourListing.price.toLocaleString()}`);
            logInfo(`Status: ${ourListing.status}`);
            logInfo(`Photos: ${ourListing.photos.length} attached`);
            
            // Check contact visibility
            if (ourListing.privateContact) {
                logInfo(`Contact: Hidden (private listing)`);
            } else {
                logInfo(`Contact: ${ourListing.email}, ${ourListing.phone}`);
            }
            
            return true;
        } else {
            logError(`Test listing NOT found in public listings!`);
            logInfo(`Available listing IDs: ${result.data.listings.map(l => l.id).join(', ')}`);
            return false;
        }
    } else {
        logError(`Failed to fetch public listings: ${result.data.error || result.error}`);
        return false;
    }
}

async function testAdminListings(expectedListingId, expectedStatus = 'active') {
    logStep(3, 'Verify Listing Appears in Admin Panel');
    
    logInfo('Fetching admin listings (requires authentication)...');
    
    const result = await apiRequest('GET', '/api/fsbo/admin/listings', null, {
        'Authorization': ADMIN_PASSWORD
    });
    
    if (result.ok && result.data.success) {
        logSuccess(`Retrieved ${result.data.listings.length} total listing(s) from admin panel`);
        
        // Find our test listing
        const ourListing = result.data.listings.find(l => l.id === expectedListingId);
        
        if (ourListing) {
            logSuccess(`Test listing found in admin panel!`);
            logInfo(`ID: ${ourListing.id}`);
            logInfo(`Address: ${ourListing.address}, ${ourListing.city}`);
            logInfo(`Status: ${ourListing.status}`);
            logInfo(`Contact: ${ourListing.firstName} ${ourListing.lastName}`);
            logInfo(`Email: ${ourListing.email}`);
            logInfo(`Phone: ${ourListing.phone}`);
            logInfo(`Submitted: ${new Date(ourListing.submissionDate).toLocaleString()}`);
            logInfo(`Expires: ${new Date(ourListing.expirationDate).toLocaleString()}`);
            
            if (ourListing.status === expectedStatus) {
                logSuccess(`Status matches expected: "${expectedStatus}"`);
                return true;
            } else {
                logError(`Status mismatch! Expected "${expectedStatus}", got "${ourListing.status}"`);
                return false;
            }
        } else {
            logError(`Test listing NOT found in admin panel!`);
            logInfo(`Available listing IDs: ${result.data.listings.map(l => l.id).join(', ')}`);
            return false;
        }
    } else if (result.status === 401) {
        logError(`Authentication failed! Admin password is incorrect.`);
        return false;
    } else {
        logError(`Failed to fetch admin listings: ${result.data.error || result.error}`);
        return false;
    }
}

async function testDeleteListing(listingId) {
    logStep(4, 'Delete Listing via Admin Panel');
    
    logInfo(`Deleting listing ID: ${listingId}...`);
    
    const result = await apiRequest('DELETE', `/api/fsbo/listing/${listingId}`, null, {
        'Authorization': ADMIN_PASSWORD
    });
    
    if (result.ok && result.data.success) {
        logSuccess(`Listing deleted successfully!`);
        logInfo(result.data.message);
        return true;
    } else if (result.status === 401) {
        logError(`Authentication failed! Cannot delete without admin password.`);
        return false;
    } else {
        logError(`Failed to delete listing: ${result.data.error || result.error}`);
        return false;
    }
}

async function testVerifyDeletion(listingId) {
    logStep(5, 'Verify Listing Removed from Public View');
    
    logInfo('Checking public listings...');
    
    const publicResult = await apiRequest('GET', '/api/fsbo/listings');
    
    if (publicResult.ok && publicResult.data.success) {
        const foundInPublic = publicResult.data.listings.find(l => l.id === listingId);
        
        if (!foundInPublic) {
            logSuccess(`Listing correctly removed from public view!`);
        } else {
            logError(`Listing still appears in public listings!`);
            return false;
        }
    } else {
        logError(`Failed to fetch public listings for verification`);
        return false;
    }
    
    logInfo('Checking admin panel...');
    
    const adminResult = await apiRequest('GET', '/api/fsbo/admin/listings', null, {
        'Authorization': ADMIN_PASSWORD
    });
    
    if (adminResult.ok && adminResult.data.success) {
        const adminListing = adminResult.data.listings.find(l => l.id === listingId);
        
        if (adminListing) {
            if (adminListing.status === 'removed') {
                logSuccess(`Listing still visible in admin panel with status "removed"!`);
                logInfo(`This is correct - soft delete preserves the record.`);
                return true;
            } else {
                logError(`Listing found in admin but status is "${adminListing.status}" instead of "removed"`);
                return false;
            }
        } else {
            logError(`Listing not found in admin panel! It should be there with status "removed".`);
            return false;
        }
    } else {
        logError(`Failed to fetch admin listings for verification`);
        return false;
    }
}

// Main test runner
async function runTests() {
    log('\n' + '═'.repeat(60), 'bold');
    log('  VDI REALTY FSBO LISTING SYSTEM - INTEGRATION TEST  ', 'bold');
    log('═'.repeat(60) + '\n', 'bold');
    
    log(`API Endpoint: ${API_BASE_URL}`, 'cyan');
    log(`Test Time: ${new Date().toLocaleString()}`, 'cyan');
    log(`Admin Auth: ${ADMIN_PASSWORD ? 'Configured ✓' : 'Missing ✗'}`, 'cyan');
    
    let testsPassed = 0;
    let testsFailed = 0;
    let listingId = null;
    
    try {
        // Test 1: Submit listing
        listingId = await testSubmitListing();
        testsPassed++;
        
        // Wait a moment for database to settle
        await sleep(1000);
        
        // Test 2: Verify in public listings
        if (await testPublicListings(listingId)) {
            testsPassed++;
        } else {
            testsFailed++;
        }
        
        // Test 3: Verify in admin panel
        if (await testAdminListings(listingId, 'active')) {
            testsPassed++;
        } else {
            testsFailed++;
        }
        
        // Test 4: Delete listing
        if (await testDeleteListing(listingId)) {
            testsPassed++;
        } else {
            testsFailed++;
            throw new Error('Cannot continue without successful deletion');
        }
        
        // Wait a moment for deletion to process
        await sleep(1000);
        
        // Test 5: Verify deletion
        if (await testVerifyDeletion(listingId)) {
            testsPassed++;
        } else {
            testsFailed++;
        }
        
    } catch (error) {
        logError(`\nTest suite failed: ${error.message}`);
        testsFailed++;
    }
    
    // Final summary
    log('\n' + '═'.repeat(60), 'bold');
    log('  TEST SUMMARY  ', 'bold');
    log('═'.repeat(60), 'bold');
    log(`Total Tests: ${testsPassed + testsFailed}`, 'cyan');
    log(`Passed: ${testsPassed}`, 'green');
    log(`Failed: ${testsFailed}`, 'red');
    
    if (listingId) {
        log(`\nTest Listing ID: ${listingId}`, 'cyan');
        log(`View in Admin Panel: https://www.vdirealty.com/admin.html`, 'cyan');
        log(`Password: ${ADMIN_PASSWORD}`, 'cyan');
    }
    
    if (testsFailed === 0) {
        log('\n🎉 ALL TESTS PASSED! ✓', 'green');
        log('The FSBO listing system is working correctly.\n', 'green');
        process.exit(0);
    } else {
        log('\n❌ SOME TESTS FAILED', 'red');
        log('Please review the errors above and check the system.\n', 'red');
        process.exit(1);
    }
}

// Run the tests
runTests().catch(error => {
    logError(`\nFatal error: ${error.message}`);
    console.error(error);
    process.exit(1);
});
