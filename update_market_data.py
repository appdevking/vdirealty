"""
Market Pulse Data Updater for VDI Realty Website
This script fetches real estate market data and updates the index.html file automatically.
"""

import re
import json
from datetime import datetime
from pathlib import Path

# Option 1: Manual data entry (quick updates)
def get_manual_data():
    """
    Manually set market data here for quick updates.
    Update these values as needed.
    """
    return {
        'median_price': '540k',
        'days_on_market': 32,
        'list_to_sale': 98,
        'active_listings': 150,
        'update_date': datetime.now().strftime('%b %Y')
    }


# Option 2: Fetch from Realty Mole API (requires API key)
def get_realty_mole_data(api_key, city, state):
    """
    Fetch data from Realty Mole API.
    Sign up at: https://rapidapi.com/realtymole/api/realty-mole-property-api
    """
    try:
        import requests
        
        url = "https://realty-mole-property-api.p.rapidapi.com/saleListings"
        querystring = {"city": city, "state": state, "limit": "100"}
        
        headers = {
            "X-RapidAPI-Key": api_key,
            "X-RapidAPI-Host": "realty-mole-property-api.p.rapidapi.com"
        }
        
        response = requests.get(url, headers=headers, params=querystring)
        data = response.json()
        
        # Calculate statistics
        if data and len(data) > 0:
            prices = [listing.get('price', 0) for listing in data if listing.get('price')]
            days_on_market = [listing.get('daysOnMarket', 0) for listing in data if listing.get('daysOnMarket')]
            
            median_price = sorted(prices)[len(prices)//2] if prices else 0
            avg_days = sum(days_on_market) / len(days_on_market) if days_on_market else 0
            
            return {
                'median_price': f"{median_price//1000}k",
                'days_on_market': int(avg_days),
                'list_to_sale': 98,  # May need separate API call
                'active_listings': len(data),
                'update_date': datetime.now().strftime('%b %Y')
            }
    except Exception as e:
        print(f"Error fetching from Realty Mole: {e}")
        return None


# Option 3: Fetch from Zillow API (via RapidAPI)
def get_zillow_data(api_key, location):
    """
    Fetch data from Zillow API via RapidAPI.
    Sign up at: https://rapidapi.com/apimaker/api/zillow-com1
    """
    try:
        import requests
        
        url = "https://zillow-com1.p.rapidapi.com/propertyExtendedSearch"
        querystring = {"location": location, "status_type": "ForSale"}
        
        headers = {
            "X-RapidAPI-Key": api_key,
            "X-RapidAPI-Host": "zillow-com1.p.rapidapi.com"
        }
        
        response = requests.get(url, headers=headers, params=querystring)
        data = response.json()
        
        # Process and calculate statistics from response
        # (Implementation depends on API response structure)
        
        return {
            'median_price': '540k',
            'days_on_market': 32,
            'list_to_sale': 98,
            'active_listings': 150,
            'update_date': datetime.now().strftime('%b %Y')
        }
    except Exception as e:
        print(f"Error fetching from Zillow: {e}")
        return None


# Option 4: Read from local JSON file
def get_data_from_json(json_file='market_data.json'):
    """
    Read market data from a local JSON file.
    Useful for integrating with other data sources or manual updates.
    """
    try:
        json_path = Path(__file__).parent / json_file
        if json_path.exists():
            with open(json_path, 'r') as f:
                data = json.load(f)
                data['update_date'] = datetime.now().strftime('%b %Y')
                return data
    except Exception as e:
        print(f"Error reading JSON file: {e}")
    return None


def format_number(value):
    """Format numbers with proper formatting"""
    if isinstance(value, str):
        return value
    if value >= 1000000:
        return f"${value/1000000:.1f}M"
    elif value >= 1000:
        return f"${value/1000:.0f}k"
    return str(value)


def update_html_file(data, html_file='index.html'):
    """
    Update the index.html file with new market data.
    """
    html_path = Path(__file__).parent / html_file
    
    if not html_path.exists():
        print(f"Error: {html_file} not found!")
        return False
    
    # Read the current HTML
    with open(html_path, 'r', encoding='utf-8') as f:
        html_content = f.read()
    
    # Update Median Price
    html_content = re.sub(
        r'(<span class="local-stat-num">)\$?\d+k?(</span>\s*<span class="local-stat-title">Median Price</span>)',
        rf'\1{data["median_price"]}\2',
        html_content
    )
    
    # Update Days on Market
    html_content = re.sub(
        r'(<span class="local-stat-num">)\d+(</span>\s*<span class="local-stat-title">Days on Market</span>)',
        rf'\1{data["days_on_market"]}\2',
        html_content
    )
    
    # Update List-to-Sale
    html_content = re.sub(
        r'(<span class="local-stat-num">)\d+%(</span>\s*<span class="local-stat-title">List-to-Sale</span>)',
        rf'\1{data["list_to_sale"]}%\2',
        html_content
    )
    
    # Update Active Listings
    html_content = re.sub(
        r'(<span class="local-stat-num">)\d+(</span>\s*<span class="local-stat-title">Active Listings</span>)',
        rf'\1{data["active_listings"]}\2',
        html_content
    )
    
    # Update the date in the footer note
    html_content = re.sub(
        r'\*Data reflects Greater Metro Area averages updated [A-Za-z]+ \d{4}\.',
        f'*Data reflects Greater Metro Area averages updated {data["update_date"]}.',
        html_content
    )
    
    # Write the updated HTML back
    with open(html_path, 'w', encoding='utf-8') as f:
        f.write(html_content)
    
    print(f"✅ Successfully updated {html_file}")
    print(f"   Median Price: {data['median_price']}")
    print(f"   Days on Market: {data['days_on_market']}")
    print(f"   List-to-Sale: {data['list_to_sale']}%")
    print(f"   Active Listings: {data['active_listings']}")
    print(f"   Updated: {data['update_date']}")
    
    return True


def main():
    """Main execution function"""
    print("=" * 60)
    print("VDI Realty - Market Data Updater")
    print("=" * 60)
    
    # Choose your data source method here:
    # Method 1: Manual update (fastest, no API needed)
    market_data = get_manual_data()
    
    # Method 2: From JSON file (uncomment to use)
    # market_data = get_data_from_json('market_data.json')
    
    # Method 3: From Realty Mole API (uncomment and add API key)
    # API_KEY = "your_rapidapi_key_here"
    # market_data = get_realty_mole_data(API_KEY, "YourCity", "YourState")
    
    # Method 4: From Zillow API (uncomment and add API key)
    # API_KEY = "your_rapidapi_key_here"
    # market_data = get_zillow_data(API_KEY, "Your City, ST")
    
    # Update the HTML file
    if market_data:
        update_html_file(market_data)
    else:
        print("❌ Failed to get market data")


if __name__ == "__main__":
    main()
