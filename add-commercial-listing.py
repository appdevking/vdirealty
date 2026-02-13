"""
Add Single Commercial Property Listing

This script submits a commercial property listing to the VDI Realty platform.
You can customize the listing details below and run: python add-commercial-listing.py
"""

import requests
import json
from datetime import datetime

API_BASE_URL = 'https://api.vdirealty.com'

# Customize your commercial listing here
commercial_listing = {
    # Property Owner/Contact Information
    'firstName': 'Michael',
    'lastName': 'Johnson',
    'email': 'mjohnson@commercialrealty.com',
    'phone': '(206) 555-8888',
    
    # Property Address
    'address': '500 Business Park Drive',
    'city': 'Bellevue',
    'state': 'WA',
    'zip': '98004',
    
    # Property Type (Must be 'Commercial' for commercial properties)
    'propertyType': 'Commercial',
    
    # Basic Property Details (Required)
    'price': 2500000,             # Sale price in dollars
    'sqft': 15000,                # Total square footage
    'description': '''Prime commercial office building in Bellevue's growing business district. This 
modern Class A office space features 15,000 square feet across two floors with excellent highway access 
and visibility. The property is 95% occupied with quality tenants on long-term leases, providing stable 
income. Recent upgrades include new HVAC system, updated elevators, and energy-efficient windows. Ample 
parking with 40 dedicated spaces. Perfect investment opportunity with strong cap rate and potential for 
value-add improvements.''',
    
    # Commercial-Specific Details (Optional but recommended)
    'buildingClass': 'Class A',   # Options: 'Class A', 'Class B', 'Class C'
    'zoning': 'Commercial Office',
    'occupancyRate': 95.0,        # Percentage (0-100)
    'capRate': 6.5,               # Capitalization rate percentage
    'grossIncome': 180000,        # Annual gross income in dollars
    'operatingExpenses': 54000,   # Annual operating expenses in dollars
    'numberOfUnits': 8,           # Number of units/suites
    'parkingSpaces': 40,          # Number of parking spaces
    'leaseType': 'Triple Net',    # Options: 'Triple Net', 'Gross', 'Modified Gross', 'Percentage'
    
    # Not applicable for commercial (leave null/zero or omit)
    'bedrooms': None,
    'bathrooms': None,
    'yearBuilt': 1995,
    'lotSize': 1.5,               # Lot size in acres
    
    # Features & Amenities
    'features': 'Class A office, Recently renovated, High-speed internet, Conference rooms, Break room, Elevator, Central A/C, Ample parking',
    
    # Privacy Settings
    'privateContact': False,      # Set to True to hide contact info from public view
    
    # Listing Source
    'listingSource': 'fsbo',      # 'fsbo' for FSBO listings, 'partner' for partner submissions
    
    # MLS/External Listing (Optional)
    'mlsNumber': '',              # MLS number if already listed
    'externalUrl': '',            # Link to listing on other platforms
    
    # Photos (Optional - URLs of hosted images)
    'photoUrls': json.dumps([
        'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800',
        'https://images.unsplash.com/photo-1497366216548-37526070297c?w=800',
        'https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=800',
        'https://images.unsplash.com/photo-1497215728101-856f4ea42174?w=800',
    ])
}

def submit_listing():
    """Submit the commercial listing to the API"""
    print("\n" + "="*70)
    print("  🏢 SUBMITTING COMMERCIAL PROPERTY LISTING")
    print("="*70)
    
    # Display listing summary
    print(f"\n📋 PROPERTY DETAILS:")
    print(f"   Address: {commercial_listing['address']}, {commercial_listing['city']}, {commercial_listing['state']} {commercial_listing['zip']}")
    print(f"   Type: {commercial_listing['propertyType']}")
    print(f"   Building Class: {commercial_listing.get('buildingClass', 'N/A')}")
    print(f"   Price: ${commercial_listing['price']:,}")
    print(f"   Size: {commercial_listing['sqft']:,} sqft")
    print(f"   Zoning: {commercial_listing.get('zoning', 'N/A')}")
    print(f"   Lot Size: {commercial_listing.get('lotSize', 'N/A')} acres")
    
    print(f"\n💰 FINANCIAL DETAILS:")
    print(f"   Occupancy Rate: {commercial_listing.get('occupancyRate', 'N/A')}%")
    print(f"   Cap Rate: {commercial_listing.get('capRate', 'N/A')}%")
    print(f"   Gross Income: ${commercial_listing.get('grossIncome', 0):,}/year")
    print(f"   Operating Expenses: ${commercial_listing.get('operatingExpenses', 0):,}/year")
    print(f"   NOI: ${commercial_listing.get('grossIncome', 0) - commercial_listing.get('operatingExpenses', 0):,}/year")
    
    print(f"\n🏗️  BUILDING DETAILS:")
    print(f"   Number of Units: {commercial_listing.get('numberOfUnits', 'N/A')}")
    print(f"   Parking Spaces: {commercial_listing.get('parkingSpaces', 'N/A')}")
    print(f"   Lease Type: {commercial_listing.get('leaseType', 'N/A')}")
    print(f"   Year Built: {commercial_listing.get('yearBuilt', 'N/A')}")
    
    print(f"\n👤 CONTACT INFO:")
    print(f"   Name: {commercial_listing['firstName']} {commercial_listing['lastName']}")
    print(f"   Email: {commercial_listing['email']}")
    print(f"   Phone: {commercial_listing['phone']}")
    print(f"   Privacy: {'Protected' if commercial_listing['privateContact'] else 'Public'}")
    
    photos = json.loads(commercial_listing.get('photoUrls', '[]'))
    print(f"\n📷 PHOTOS: {len(photos)} attached")
    
    # Confirm submission
    print("\n" + "-"*70)
    response = input("Submit this commercial listing? (y/n): ").lower()
    
    if response != 'y':
        print("\n❌ Submission cancelled.")
        return False
    
    # Submit to API
    print("\n⏳ Submitting to VDI Realty API...")
    
    try:
        api_response = requests.post(
            f"{API_BASE_URL}/api/fsbo/submit",
            json=commercial_listing,
            headers={'Content-Type': 'application/json'},
            timeout=15
        )
        
        if api_response.ok:
            data = api_response.json()
            if data.get('success'):
                print("\n" + "="*70)
                print("  ✅ SUCCESS! COMMERCIAL LISTING CREATED")
                print("="*70)
                print(f"\n🎉 Listing ID: {data['listingId']}")
                print(f"📅 Expires: {datetime.fromisoformat(data['expirationDate'].replace('Z', '+00:00')).strftime('%B %d, %Y')}")
                print(f"\n🌐 View your listing at:")
                print(f"   https://www.vdirealty.com/fsbo-listings.html")
                print(f"\n🔧 Manage in admin panel:")
                print(f"   https://www.vdirealty.com/admin.html")
                print(f"   Password: VDI2025AdminSecure789")
                
                # Show investment summary
                noi = commercial_listing.get('grossIncome', 0) - commercial_listing.get('operatingExpenses', 0)
                cap_rate = commercial_listing.get('capRate', 0)
                print(f"\n📊 INVESTMENT SUMMARY:")
                print(f"   Net Operating Income (NOI): ${noi:,}/year")
                print(f"   Cap Rate: {cap_rate}%")
                print(f"   Occupancy: {commercial_listing.get('occupancyRate', 0)}%")
                
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
    print("  VDI REALTY - ADD COMMERCIAL PROPERTY LISTING")
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
