"""
VDI Realty - Listing Extractor
Extracts property data from real estate listing URLs and saves to JSON

Usage:
    python extract_listings.py urls.txt              # Process URLs from file
    python extract_listings.py [URL]                 # Process single URL
    python extract_listings.py [URL1] [URL2] [URL3]  # Process multiple URLs
"""

import sys
import json
import re
from pathlib import Path
import requests
from bs4 import BeautifulSoup


def detect_source(url):
    """Detect the listing source from URL"""
    url_lower = url.lower()
    
    if 'zillow.com' in url_lower:
        return 'zillow'
    if 'realtor.com' in url_lower:
        return 'realtor'
    if 'redfin.com' in url_lower:
        return 'redfin'
    if 'century21' in url_lower:
        return 'century21'
    if 'remax.com' in url_lower:
        return 'remax'
    if 'coldwellbanker.com' in url_lower:
        return 'coldwellbanker'
    if 'compass.com' in url_lower:
        return 'compass'
    
    return 'unknown'


def extract_json_ld(soup):
    """Extract JSON-LD structured data from page"""
    scripts = soup.find_all('script', type='application/ld+json')
    
    for script in scripts:
        try:
            data = json.loads(script.string)
            # Handle both single objects and arrays
            if isinstance(data, list):
                for item in data:
                    if item.get('@type') in ['Product', 'Apartment', 'SingleFamilyResidence', 'House']:
                        return item
            elif data.get('@type') in ['Product', 'Apartment', 'SingleFamilyResidence', 'House']:
                return data
        except:
            continue
    
    return None


def clean_number(text):
    """Extract number from text"""
    if not text:
        return None
    # Remove everything except digits, decimal point, and commas
    cleaned = re.sub(r'[^\d.,]', '', str(text))
    cleaned = cleaned.replace(',', '')
    try:
        if '.' in cleaned:
            return float(cleaned)
        return int(cleaned)
    except:
        return None


def extract_century21(url, soup):
    """Extract data from Century 21 listings"""
    data = {
        'source': 'Century 21',
        'sourceUrl': url
    }
    
    # Try JSON-LD first
    json_ld = extract_json_ld(soup)
    if json_ld:
        print("  ✓ Found JSON-LD data")
        
        # Address from "name" field (e.g., "16454 108th Avenue NE Bothell WA 98011")
        if 'name' in json_ld:
            name = json_ld['name']
            # Parse address components
            parts = name.split()
            if len(parts) >= 4:
                # Try to find state (2 letters) and zip (5 digits)
                state_idx = None
                for i, part in enumerate(parts):
                    if len(part) == 2 and part.isupper():
                        state_idx = i
                        break
                
                if state_idx and state_idx + 1 < len(parts):
                    data['state'] = parts[state_idx]
                    data['zip'] = parts[state_idx + 1]
                    data['city'] = parts[state_idx - 1] if state_idx > 0 else ''
                    data['address'] = ' '.join(parts[:state_idx - 1]) if state_idx > 1 else parts[0]
        
        # Price
        if 'offers' in json_ld and 'price' in json_ld['offers']:
            data['price'] = clean_number(json_ld['offers']['price'])
        elif 'price' in json_ld:
            data['price'] = clean_number(json_ld['price'])
        
        # Description
        if 'description' in json_ld:
            desc = json_ld['description']
            data['description'] = desc
            
            # Try to extract beds/baths/sqft from description
            beds_match = re.search(r'(\d+)\s+(?:bedroom|bed|br)s?\b', desc, re.I)
            if beds_match:
                data['bedrooms'] = int(beds_match.group(1))
            
            baths_match = re.search(r'(\d+(?:\.\d+)?)\s+(?:bathroom|bath|ba)s?\b', desc, re.I)
            if baths_match:
                data['bathrooms'] = float(baths_match.group(1))
            
            sqft_match = re.search(r'([\d,]+)\s+(?:square\s+feet|sq\.?\s*ft|sqft)\b', desc, re.I)
            if sqft_match:
                data['sqft'] = clean_number(sqft_match.group(1))
        
        # Images
        if 'image' in json_ld:
            images = json_ld['image']
            if isinstance(images, list):
                data['images'] = images[:5]  # First 5 images
            elif isinstance(images, str):
                data['images'] = [images]
    
    # Fallback to HTML parsing
    if 'address' not in data:
        # Try to find address in HTML
        address_elem = soup.select_one('h1, [class*="address"]')
        if address_elem:
            data['address'] = address_elem.get_text(strip=True)
    
    return data


def extract_zillow(url, soup):
    """Extract data from Zillow listings"""
    data = {
        'source': 'Zillow',
        'sourceUrl': url
    }
    
    # Try JSON-LD
    json_ld = extract_json_ld(soup)
    if json_ld:
        if 'name' in json_ld:
            data['address'] = json_ld['name']
        if 'offers' in json_ld and 'price' in json_ld['offers']:
            data['price'] = clean_number(json_ld['offers']['price'])
        if 'description' in json_ld:
            data['description'] = json_ld['description']
    
    # HTML selectors
    selectors = {
        'address': ['h1[data-test="home-details-summary-headline"]', 'h1.ds-address-container'],
        'price': ['span[data-test="property-floorplan-price"]', 'span.ds-price'],
        'beds': ['span[data-testid="bed-count"]'],
        'baths': ['span[data-testid="bath-count"]'],
        'sqft': ['span[data-testid="sqft-value"]']
    }
    
    for key, sels in selectors.items():
        if key not in data:
            for sel in sels:
                elem = soup.select_one(sel)
                if elem:
                    text = elem.get_text(strip=True)
                    if key in ['beds', 'baths', 'sqft', 'price']:
                        data[key if key != 'beds' else 'bedrooms'] = clean_number(text)
                    else:
                        data[key] = text
                    break
    
    return data


def extract_realtor(url, soup):
    """Extract data from Realtor.com listings"""
    data = {
        'source': 'Realtor.com',
        'sourceUrl': url
    }
    
    json_ld = extract_json_ld(soup)
    if json_ld:
        if 'name' in json_ld:
            data['address'] = json_ld['name']
        if 'offers' in json_ld and 'price' in json_ld['offers']:
            data['price'] = clean_number(json_ld['offers']['price'])
    
    selectors = {
        'address': ['h1[data-testid="property-street"]', 'h1.address'],
        'price': ['div[data-testid="price"]', 'span[data-label="pc-price"]'],
        'beds': ['li[data-testid="property-meta-beds"]'],
        'baths': ['li[data-testid="property-meta-baths"]'],
        'sqft': ['li[data-testid="property-meta-sqft"]']
    }
    
    for key, sels in selectors.items():
        if key not in data:
            for sel in sels:
                elem = soup.select_one(sel)
                if elem:
                    text = elem.get_text(strip=True)
                    if key in ['beds', 'baths', 'sqft', 'price']:
                        data[key if key != 'beds' else 'bedrooms'] = clean_number(text)
                    else:
                        data[key] = text
                    break
    
    return data


def extract_listing(url):
    """Extract listing data from URL"""
    print(f"\n📥 Processing: {url}")
    
    try:
        # Fetch the page
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
        response = requests.get(url, headers=headers, timeout=10)
        response.raise_for_status()
        
        soup = BeautifulSoup(response.text, 'html.parser')
        
        # Detect source and extract
        source = detect_source(url)
        print(f"  🏢 Source: {source}")
        
        if source == 'century21':
            data = extract_century21(url, soup)
        elif source == 'zillow':
            data = extract_zillow(url, soup)
        elif source == 'realtor':
            data = extract_realtor(url, soup)
        else:
            # Generic extraction
            data = {
                'source': 'Unknown',
                'sourceUrl': url
            }
            json_ld = extract_json_ld(soup)
            if json_ld:
                if 'name' in json_ld:
                    data['address'] = json_ld['name']
                if 'offers' in json_ld and 'price' in json_ld['offers']:
                    data['price'] = clean_number(json_ld['offers']['price'])
                if 'description' in json_ld:
                    data['description'] = json_ld['description']
        
        # Add timestamp
        from datetime import datetime
        data['extractedAt'] = datetime.now().isoformat()
        data['status'] = 'Active'
        
        print(f"  ✅ Extracted: {data.get('address', 'No address')} - ${data.get('price', 'No price'):,}" if data.get('price') else "  ✅ Extracted")
        
        return data
        
    except requests.exceptions.RequestException as e:
        print(f"  ❌ Error fetching URL: {e}")
        return None
    except Exception as e:
        print(f"  ❌ Error parsing data: {e}")
        return None


def main():
    """Main function"""
    print("=" * 60)
    print("VDI Realty - Listing Extractor")
    print("=" * 60)
    
    # Get URLs from command line or file
    urls = []
    
    if len(sys.argv) < 2:
        print("\n❌ Error: No URLs provided")
        print("\nUsage:")
        print("  python extract_listings.py urls.txt              # From file")
        print("  python extract_listings.py [URL]                 # Single URL")
        print("  python extract_listings.py [URL1] [URL2] [URL3]  # Multiple URLs")
        sys.exit(1)
    
    # Check if first argument is a file
    if Path(sys.argv[1]).exists():
        print(f"\n📄 Reading URLs from: {sys.argv[1]}")
        with open(sys.argv[1], 'r') as f:
            urls = [line.strip() for line in f if line.strip() and not line.startswith('#')]
    else:
        # URLs from command line
        urls = sys.argv[1:]
    
    print(f"\n📊 Processing {len(urls)} URL(s)")
    
    # Extract all listings
    listings = []
    for url in urls:
        data = extract_listing(url)
        if data:
            listings.append(data)
    
    # Save results
    if listings:
        output_file = 'extracted_listings.json'
        with open(output_file, 'w') as f:
            json.dump(listings, f, indent=2)
        
        print("\n" + "=" * 60)
        print(f"✅ SUCCESS! Extracted {len(listings)} listing(s)")
        print(f"📁 Saved to: {output_file}")
        print("=" * 60)
        
        # Show summary
        print("\n📋 Summary:")
        for i, listing in enumerate(listings, 1):
            addr = listing.get('address', 'Unknown Address')
            price = f"${listing.get('price', 0):,}" if listing.get('price') else 'No price'
            print(f"  {i}. {addr} - {price}")
        
        print(f"\n💡 Next steps:")
        print(f"  1. Open extracted_listings.json")
        print(f"  2. Copy the data")
        print(f"  3. Import to your website or database")
    else:
        print("\n❌ No listings extracted")


if __name__ == '__main__':
    main()
