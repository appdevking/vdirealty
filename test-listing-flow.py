"""
Test Script for VDI Realty FSBO Listing Flow (Python Version)

This script tests the complete listing lifecycle:
1. Submit a new FSBO listing  
2. Verify it appears in public listings (fsbo-listings.html, listings.html)
3. Verify it appears in admin panel
4. Delete the listing via admin
5. Verify it's removed from public view but still in admin with 'removed' status

Usage: python test-listing-flow.py

Requirements: Python 3.6+, requests library (pip install requests)
"""

import requests
import json
import time
from datetime import datetime
import sys

API_BASE_URL = 'https://api.vdirealty.com'
ADMIN_PASSWORD = 'VDI2025AdminSecure789'  # From .env

# ANSI color codes for terminal output
class Colors:
    RESET = '\033[0m'
    GREEN = '\033[32m'
    RED = '\033[31m'
    YELLOW = '\033[33m'
    BLUE = '\033[34m'
    CYAN = '\033[36m'
    BOLD = '\033[1m'

def log(message, color='RESET'):
    color_code = getattr(Colors, color, Colors.RESET)
    print(f"{color_code}{message}{Colors.RESET}")

def log_step(step, description):
    log(f"\n{'=' * 60}", 'CYAN')
    log(f"STEP {step}: {description}", 'BOLD')
    log('=' * 60, 'CYAN')

def log_success(message):
    log(f"✓ {message}", 'GREEN')

def log_error(message):
    log(f"✗ {message}", 'RED')

def log_info(message):
    log(f"ℹ {message}", 'BLUE')

# Test data for a residential listing
test_listing = {
    # Contact Info
    'firstName': 'Test',
    'lastName': 'Seller',
    'email': 'test.seller@example.com',
    'phone': '(206) 555-0123',
    
    # Property Address
    'address': '123 Test Street',
    'city': 'Seattle',
    'state': 'WA',
    'zip': '98101',
    
    # Property Type
    'propertyType': 'Single Family',
    
    # Property Details
    'price': 650000,
    'sqft': 2400,
    'bedrooms': 3,
    'bathrooms': 2.5,
    'yearBuilt': 2015,
    'lotSize': 0.25,
    
    # Features & Description
    'features': 'Hardwood floors, Updated kitchen, Master suite, Garage, Fenced yard',
    'description': 'Beautiful test property in the heart of Seattle. This is a test listing created by the automated test script. Features modern finishes, open floor plan, and great location. Perfect for testing the VDI Realty FSBO listing system.',
    
    # Privacy
    'privateContact': False,
    
    # MLS/External (optional)
    'mlsNumber': '',
    'externalUrl': ''
}

def api_request(method, endpoint, data=None, headers=None):
    """Make an API request and return the response"""
    url = f"{API_BASE_URL}{endpoint}"
    headers = headers or {}
    headers['Content-Type'] = 'application/json'
    
    try:
        if method == 'GET':
            response = requests.get(url, headers=headers, timeout=10)
        elif method == 'POST':
            response = requests.post(url, json=data, headers=headers, timeout=10)
        elif method == 'DELETE':
            response = requests.delete(url, headers=headers, timeout=10)
        else:
            raise ValueError(f"Unsupported method: {method}")
        
        return {
            'ok': response.ok,
            'status': response.status_code,
            'data': response.json() if response.text else {}
        }
    except requests.exceptions.RequestException as e:
        return {
            'ok': False,
            'status': 0,
            'error': str(e)
        }

def test_submit_listing():
    """Test Step 1: Submit a new FSBO listing"""
    log_step(1, 'Submit New FSBO Listing')
    
    log_info(f"Submitting test listing for: {test_listing['address']}, {test_listing['city']}")
    log_info(f"Property Type: {test_listing['propertyType']}")
    log_info(f"Price: ${test_listing['price']:,}")
    log_info(f"Details: {test_listing['bedrooms']} bed, {test_listing['bathrooms']} bath, {test_listing['sqft']} sqft")
    
    result = api_request('POST', '/api/fsbo/submit', test_listing)
    
    if result['ok'] and result['data'].get('success'):
        log_success("Listing created successfully!")
        listing_id = result['data']['listingId']
        expiration = result['data']['expirationDate']
        log_info(f"Listing ID: {listing_id}")
        log_info(f"Expiration Date: {datetime.fromisoformat(expiration.replace('Z', '+00:00')).strftime('%Y-%m-%d')}")
        return listing_id
    else:
        error_msg = result['data'].get('error') or result.get('error') or 'Unknown error'
        log_error(f"Failed to create listing: {error_msg}")
        raise Exception('Failed to create listing')

def test_public_listings(expected_listing_id):
    """Test Step 2: Verify listing appears in public view"""
    log_step(2, 'Verify Listing Appears in Public View')
    
    log_info('Fetching public listings (GET /api/fsbo/listings)...')
    
    result = api_request('GET', '/api/fsbo/listings')
    
    if result['ok'] and result['data'].get('success'):
        count = result['data']['count']
        log_success(f"Retrieved {count} public listing(s)")
        
        # Find our test listing
        listings = result['data']['listings']
        our_listing = next((l for l in listings if l['id'] == expected_listing_id), None)
        
        if our_listing:
            log_success("Test listing found in public listings!")
            log_info(f"Address: {our_listing['address']}, {our_listing['city']}, {our_listing['state']} {our_listing['zip']}")
            log_info(f"Price: ${our_listing['price']:,}")
            log_info(f"Status: {our_listing['status']}")
            log_info(f"Photos: {len(our_listing['photos'])} attached")
            
            # Check contact visibility
            if our_listing.get('privateContact'):
                log_info("Contact: Hidden (private listing)")
            else:
                log_info(f"Contact: {our_listing.get('email')}, {our_listing.get('phone')}")
            
            return True
        else:
            log_error("Test listing NOT found in public listings!")
            log_info(f"Available listing IDs: {', '.join(str(l['id']) for l in listings)}")
            return False
    else:
        error_msg = result['data'].get('error') or result.get('error')
        log_error(f"Failed to fetch public listings: {error_msg}")
        return False

def test_admin_listings(expected_listing_id, expected_status='active'):
    """Test Step 3: Verify listing appears in admin panel"""
    log_step(3, 'Verify Listing Appears in Admin Panel')
    
    log_info('Fetching admin listings (requires authentication)...')
    
    result = api_request('GET', '/api/fsbo/admin/listings', headers={
        'Authorization': ADMIN_PASSWORD
    })
    
    if result['ok'] and result['data'].get('success'):
        listings = result['data']['listings']
        log_success(f"Retrieved {len(listings)} total listing(s) from admin panel")
        
        # Find our test listing
        our_listing = next((l for l in listings if l['id'] == expected_listing_id), None)
        
        if our_listing:
            log_success("Test listing found in admin panel!")
            log_info(f"ID: {our_listing['id']}")
            log_info(f"Address: {our_listing['address']}, {our_listing['city']}")
            log_info(f"Status: {our_listing['status']}")
            log_info(f"Contact: {our_listing['firstName']} {our_listing['lastName']}")
            log_info(f"Email: {our_listing['email']}")
            log_info(f"Phone: {our_listing['phone']}")
            log_info(f"Submitted: {datetime.fromisoformat(our_listing['submissionDate'].replace('Z', '+00:00')).strftime('%Y-%m-%d %H:%M')}")
            log_info(f"Expires: {datetime.fromisoformat(our_listing['expirationDate'].replace('Z', '+00:00')).strftime('%Y-%m-%d %H:%M')}")
            
            if our_listing['status'] == expected_status:
                log_success(f'Status matches expected: "{expected_status}"')
                return True
            else:
                log_error(f'Status mismatch! Expected "{expected_status}", got "{our_listing["status"]}"')
                return False
        else:
            log_error("Test listing NOT found in admin panel!")
            log_info(f"Available listing IDs: {', '.join(str(l['id']) for l in listings)}")
            return False
    elif result['status'] == 401:
        log_error("Authentication failed! Admin password is incorrect.")
        return False
    else:
        error_msg = result['data'].get('error') or result.get('error')
        log_error(f"Failed to fetch admin listings: {error_msg}")
        return False

def test_delete_listing(listing_id):
    """Test Step 4: Delete listing via admin panel"""
    log_step(4, 'Delete Listing via Admin Panel')
    
    log_info(f"Deleting listing ID: {listing_id}...")
    
    result = api_request('DELETE', f'/api/fsbo/listing/{listing_id}', headers={
        'Authorization': ADMIN_PASSWORD
    })
    
    if result['ok'] and result['data'].get('success'):
        log_success("Listing deleted successfully!")
        log_info(result['data']['message'])
        return True
    elif result['status'] == 401:
        log_error("Authentication failed! Cannot delete without admin password.")
        return False
    else:
        error_msg = result['data'].get('error') or result.get('error')
        log_error(f"Failed to delete listing: {error_msg}")
        return False

def test_verify_deletion(listing_id):
    """Test Step 5: Verify listing removed from public view"""
    log_step(5, 'Verify Listing Removed from Public View')
    
    log_info('Checking public listings...')
    
    public_result = api_request('GET', '/api/fsbo/listings')
    
    if public_result['ok'] and public_result['data'].get('success'):
        listings = public_result['data']['listings']
        found_in_public = next((l for l in listings if l['id'] == listing_id), None)
        
        if not found_in_public:
            log_success("Listing correctly removed from public view!")
        else:
            log_error("Listing still appears in public listings!")
            return False
    else:
        log_error("Failed to fetch public listings for verification")
        return False
    
    log_info('Checking admin panel...')
    
    admin_result = api_request('GET', '/api/fsbo/admin/listings', headers={
        'Authorization': ADMIN_PASSWORD
    })
    
    if admin_result['ok'] and admin_result['data'].get('success'):
        listings = admin_result['data']['listings']
        admin_listing = next((l for l in listings if l['id'] == listing_id), None)
        
        if admin_listing:
            if admin_listing['status'] == 'removed':
                log_success('Listing still visible in admin panel with status "removed"!')
                log_info("This is correct - soft delete preserves the record.")
                return True
            else:
                log_error(f'Listing found in admin but status is "{admin_listing["status"]}" instead of "removed"')
                return False
        else:
            log_error('Listing not found in admin panel! It should be there with status "removed".')
            return False
    else:
        log_error("Failed to fetch admin listings for verification")
        return False

def run_tests():
    """Main test runner"""
    log('\n' + '═' * 60, 'BOLD')
    log('  VDI REALTY FSBO LISTING SYSTEM - INTEGRATION TEST  ', 'BOLD')
    log('═' * 60 + '\n', 'BOLD')
    
    log(f"API Endpoint: {API_BASE_URL}", 'CYAN')
    log(f"Test Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}", 'CYAN')
    log(f"Admin Auth: {'Configured ✓' if ADMIN_PASSWORD else 'Missing ✗'}", 'CYAN')
    
    tests_passed = 0
    tests_failed = 0
    listing_id = None
    
    try:
        # Test 1: Submit listing
        listing_id = test_submit_listing()
        tests_passed += 1
        
        # Wait a moment for database to settle
        time.sleep(1)
        
        # Test 2: Verify in public listings
        if test_public_listings(listing_id):
            tests_passed += 1
        else:
            tests_failed += 1
        
        # Test 3: Verify in admin panel
        if test_admin_listings(listing_id, 'active'):
            tests_passed += 1
        else:
            tests_failed += 1
        
        # Test 4: Delete listing
        if test_delete_listing(listing_id):
            tests_passed += 1
        else:
            tests_failed += 1
            raise Exception('Cannot continue without successful deletion')
        
        # Wait a moment for deletion to process
        time.sleep(1)
        
        # Test 5: Verify deletion
        if test_verify_deletion(listing_id):
            tests_passed += 1
        else:
            tests_failed += 1
        
    except Exception as e:
        log_error(f"\nTest suite failed: {str(e)}")
        tests_failed += 1
    
    # Final summary
    log('\n' + '═' * 60, 'BOLD')
    log('  TEST SUMMARY  ', 'BOLD')
    log('═' * 60, 'BOLD')
    log(f"Total Tests: {tests_passed + tests_failed}", 'CYAN')
    log(f"Passed: {tests_passed}", 'GREEN')
    log(f"Failed: {tests_failed}", 'RED')
    
    if listing_id:
        log(f"\nTest Listing ID: {listing_id}", 'CYAN')
        log(f"View in Admin Panel: https://www.vdirealty.com/admin.html", 'CYAN')
        log(f"Password: {ADMIN_PASSWORD}", 'CYAN')
    
    if tests_failed == 0:
        log('\n🎉 ALL TESTS PASSED! ✓', 'GREEN')
        log('The FSBO listing system is working correctly.\n', 'GREEN')
        return 0
    else:
        log('\n❌ SOME TESTS FAILED', 'RED')
        log('Please review the errors above and check the system.\n', 'RED')
        return 1

if __name__ == '__main__':
    # Check if requests library is available
    try:
        import requests
    except ImportError:
        print("Error: 'requests' library not found.")
        print("Please install it with: pip install requests")
        sys.exit(1)
    
    exit_code = run_tests()
    sys.exit(exit_code)
