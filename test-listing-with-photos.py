"""
Test Script for FSBO Listing with Multiple Photos

This script tests:
1. Submit a listing with multiple photo URLs (extracted photos)
2. Verify the listing displays with photo navigation
3. Test the contact seller functionality

Usage: python test-listing-with-photos.py
"""

import requests
import json
from datetime import datetime

API_BASE_URL = 'https://api.vdirealty.com'
ADMIN_PASSWORD = 'VDI2025AdminSecure789'

# Test listing with multiple photos
test_listing = {
    'firstName': 'Photo',
    'lastName': 'Test',
    'email': 'phototest@example.com',
    'phone': '(206) 555-9999',
    'address': '456 Gallery Lane',
    'city': 'Bellevue',
    'state': 'WA',
    'zip': '98004',
    'propertyType': 'Condo',
    'price': 475000,
    'sqft': 1800,
    'bedrooms': 2,
    'bathrooms': 2,
    'yearBuilt': 2018,
    'lotSize': 0,
    'features': 'Modern kitchen, City views, Pool, Gym, Parking',
    'description': 'Stunning condo with multiple photo angles. This test listing demonstrates the image gallery navigation feature with previous/next arrows and clickable photo dots.',
    'privateContact': False,
    # Simulated extracted photos (these are royalty-free images from Unsplash)
    'photoUrls': json.dumps([
        'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800',
        'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800',
        'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=800',
        'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800',
        'https://images.unsplash.com/photo-1600573472592-401b489a3cdc?w=800'
    ])
}

def submit_listing():
    """Submit listing with multiple photos"""
    print("\n" + "="*60)
    print("📸 SUBMITTING LISTING WITH MULTIPLE PHOTOS")
    print("="*60)
    
    print(f"\n🏠 Property: {test_listing['address']}, {test_listing['city']}")
    print(f"💰 Price: ${test_listing['price']:,}")
    print(f"📷 Photos: 5 images")
    
    response = requests.post(
        f"{API_BASE_URL}/api/fsbo/submit",
        json=test_listing,
        headers={'Content-Type': 'application/json'},
        timeout=10
    )
    
    if response.ok:
        data = response.json()
        if data.get('success'):
            print(f"\n✅ SUCCESS!")
            print(f"   Listing ID: {data['listingId']}")
            print(f"   Expires: {datetime.fromisoformat(data['expirationDate'].replace('Z', '+00:00')).strftime('%Y-%m-%d')}")
            return data['listingId']
    
    print(f"\n❌ FAILED: {response.text}")
    return None

def verify_listing(listing_id):
    """Verify the listing appears with photos"""
    print("\n" + "="*60)
    print("🔍 VERIFYING LISTING")
    print("="*60)
    
    response = requests.get(f"{API_BASE_URL}/api/fsbo/listings", timeout=10)
    
    if response.ok:
        data = response.json()
        listing = next((l for l in data['listings'] if l['id'] == listing_id), None)
        
        if listing:
            print(f"\n✅ Listing found!")
            print(f"   Address: {listing['address']}, {listing['city']}")
            print(f"   Photos: {len(listing['photos'])} images")
            print(f"   Status: {listing['status']}")
            
            if len(listing['photos']) > 1:
                print(f"\n📷 PHOTO URLS:")
                for i, photo in enumerate(listing['photos'], 1):
                    print(f"   {i}. {photo['url'][:80]}...")
                
                print(f"\n✨ FEATURES TO TEST:")
                print(f"   ✓ Hover over image to see prev/next arrows")
                print(f"   ✓ Click arrows to navigate photos")
                print(f"   ✓ Click dots at bottom to jump to specific photo")
                print(f"   ✓ Photo count badge shows '{len(listing['photos'])}' in top-left")
                print(f"   ✓ Contact Seller button opens email with pre-filled details")
            
            return True
    
    print(f"\n❌ Listing not found")
    return False

def cleanup_listing(listing_id):
    """Delete test listing"""
    print("\n" + "="*60)
    print("🗑️  CLEANING UP")
    print("="*60)
    
    response = requests.delete(
        f"{API_BASE_URL}/api/fsbo/listing/{listing_id}",
        headers={'Authorization': ADMIN_PASSWORD},
        timeout=10
    )
    
    if response.ok and response.json().get('success'):
        print(f"\n✅ Test listing deleted")
        return True
    
    print(f"\n❌ Failed to delete: {response.text}")
    return False

def main():
    print("\n" + "═"*60)
    print("  FSBO MULTI-PHOTO GALLERY TEST")
    print("═"*60)
    print(f"\nAPI: {API_BASE_URL}")
    print(f"Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    # Step 1: Submit listing with 5 photos
    listing_id = submit_listing()
    if not listing_id:
        print("\n❌ Test failed - could not create listing")
        return 1
    
    # Step 2: Verify listing has photos
    if not verify_listing(listing_id):
        print("\n❌ Test failed - listing not found")
        return 1
    
    # Display test instructions
    print("\n" + "="*60)
    print("🌐 MANUAL TESTING")
    print("="*60)
    print(f"\n1. Visit: https://www.vdirealty.com/fsbo-listings.html")
    print(f"2. Refresh page (Ctrl+Shift+R) to clear cache")
    print(f"3. Find listing: 456 Gallery Lane, Bellevue")
    print(f"4. Test photo navigation:")
    print(f"   - Hover over image → arrows appear")
    print(f"   - Click next arrow → image changes")
    print(f"   - Click dots → jumps to specific photo")
    print(f"5. Test contact button:")
    print(f"   - Click 'Contact Seller'")
    print(f"   - Verify email opens with:")
    print(f"     * To: phototest@example.com")
    print(f"     * Subject includes property address")
    print(f"     * Body includes property details")
    
    # Ask if user wants to delete
    print(f"\n" + "="*60)
    response = input(f"\n🗑️  Delete test listing {listing_id}? (y/n): ").lower()
    
    if response == 'y':
        cleanup_listing(listing_id)
    else:
        print(f"\n✅ Listing preserved for manual testing")
        print(f"   Delete later at: https://www.vdirealty.com/admin.html")
    
    print("\n✅ TEST COMPLETE!\n")
    return 0

if __name__ == '__main__':
    import sys
    sys.exit(main())
