"""
Add Single FSBO Residential Listing

This script submits a residential For Sale By Owner (FSBO) listing to the VDI Realty platform.
You can customize the listing details below and run: python add-fsbo-listing.py
"""

import requests
import json
from datetime import datetime

API_BASE_URL = 'https://api.vdirealty.com'

# Customize your FSBO residential listing here
fsbo_listing = {
    # Seller Contact Information
    'firstName': 'John',
    'lastName': 'Smith',
    'email': 'john.smith@example.com',
    'phone': '(206) 555-1234',
    
    # Property Address
    'address': '123 Maple Street',
    'city': 'Seattle',
    'state': 'WA',
    'zip': '98101',
    
    # Property Type (Options: 'Single Family', 'Condo', 'Townhouse', 'Multi-Family')
    'propertyType': 'Single Family',
    
    # Property Details (Required)
    'price': 750000,              # Sale price in dollars
    'sqft': 2800,                 # Square footage
    'bedrooms': 4,                # Number of bedrooms (required for residential)
    'bathrooms': 2.5,             # Number of bathrooms (required for residential)
    
    # Property Details (Optional)
    'yearBuilt': 2010,            # Year built
    'lotSize': 0.25,              # Lot size in acres
    
    # Features & Description
    'features': 'Hardwood floors, Updated kitchen, Master suite, 2-car garage, Fenced backyard, Close to schools',
    'description': '''Beautiful 4-bedroom, 2.5-bath home in the heart of Seattle. This stunning property 
features hardwood floors throughout, a fully updated kitchen with stainless steel appliances, and a spacious 
master suite. The 2-car garage provides ample parking and storage. Enjoy the large fenced backyard perfect 
for entertaining. Located near top-rated schools and shopping. Move-in ready!''',
    
    # Privacy Settings
    'privateContact': False,      # Set to True to hide contact info from public view
    
    # Listing Source
    'listingSource': 'fsbo',      # 'fsbo' for FSBO listings, 'partner' for partner submissions
    
    # MLS/External Listing (Optional)
    'mlsNumber': '',              # MLS number if already listed
    'externalUrl': '',            # Link to listing on other platforms
    
    # Photos (Optional - URLs of hosted images)
    'photoUrls': json.dumps([
        'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800',
        'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800',
        'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=800',
    ])
}

def submit_listing():
    """Submit the FSBO listing to the API"""
    print("\n" + "="*70)
    print("  🏠 SUBMITTING FSBO RESIDENTIAL LISTING")
    print("="*70)
    
    # Display listing summary
    print(f"\n📋 LISTING DETAILS:")
    print(f"   Property: {fsbo_listing['address']}, {fsbo_listing['city']}, {fsbo_listing['state']} {fsbo_listing['zip']}")
    print(f"   Type: {fsbo_listing['propertyType']}")
    print(f"   Price: ${fsbo_listing['price']:,}")
    print(f"   Size: {fsbo_listing['sqft']:,} sqft")
    print(f"   Beds/Baths: {fsbo_listing['bedrooms']} bed, {fsbo_listing['bathrooms']} bath")
    print(f"   Year Built: {fsbo_listing.get('yearBuilt', 'N/A')}")
    print(f"   Lot Size: {fsbo_listing.get('lotSize', 'N/A')} acres")
    
    print(f"\n👤 SELLER INFO:")
    print(f"   Name: {fsbo_listing['firstName']} {fsbo_listing['lastName']}")
    print(f"   Email: {fsbo_listing['email']}")
    print(f"   Phone: {fsbo_listing['phone']}")
    print(f"   Privacy: {'Protected' if fsbo_listing['privateContact'] else 'Public'}")
    
    photos = json.loads(fsbo_listing.get('photoUrls', '[]'))
    print(f"\n📷 PHOTOS: {len(photos)} attached")
    
    # Confirm submission
    print("\n" + "-"*70)
    response = input("Submit this listing? (y/n): ").lower()
    
    if response != 'y':
        print("\n❌ Submission cancelled.")
        return False
    
    # Submit to API
    print("\n⏳ Submitting to VDI Realty API...")
    
    try:
        api_response = requests.post(
            f"{API_BASE_URL}/api/fsbo/submit",
            json=fsbo_listing,
            headers={'Content-Type': 'application/json'},
            timeout=15
        )
        
        if api_response.ok:
            data = api_response.json()
            if data.get('success'):
                print("\n" + "="*70)
                print("  ✅ SUCCESS! LISTING CREATED")
                print("="*70)
                print(f"\n🎉 Listing ID: {data['listingId']}")
                print(f"📅 Expires: {datetime.fromisoformat(data['expirationDate'].replace('Z', '+00:00')).strftime('%B %d, %Y')}")
                print(f"\n🌐 View your listing at:")
                print(f"   https://www.vdirealty.com/fsbo-listings.html")
                print(f"\n🔧 Manage in admin panel:")
                print(f"   https://www.vdirealty.com/admin.html")
                print(f"   Password: VDI2025AdminSecure789")
                print("\n" + "="*70 + "\n")
                return True
        
        # Handle errors
        error_data = api_response.json() if api_response.text else {}
        error_msg = error_data.get('error', 'Unknown error')
        print(f"\n❌ SUBMISSION FAILED")
        print(f"   Status: {api_response.status_code}")
        print(f"   Error: {error_msg}")
        
        if 'details' in error_data:
            print(f"   Details: {error_data['details']}")
        
        return False
        
    except requests.exceptions.RequestException as e:
        print(f"\n❌ CONNECTION ERROR: {str(e)}")
        print(f"   Could not reach API at {API_BASE_URL}")
        return False
    except Exception as e:
        print(f"\n❌ UNEXPECTED ERROR: {str(e)}")
        return False

def main():
    print("\n" + "═"*70)
    print("  VDI REALTY - ADD FSBO RESIDENTIAL LISTING")
    print("═"*70)
    print(f"\nAPI Endpoint: {API_BASE_URL}")
    print(f"Timestamp: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    success = submit_listing()
    
    return 0 if success else 1

if __name__ == '__main__':
    import sys
    
    # Check if requests library is available
    try:
        import requests
    except ImportError:
        print("\n❌ Error: 'requests' library not found.")
        print("   Install it with: pip install requests\n")
        sys.exit(1)
    
    sys.exit(main())
