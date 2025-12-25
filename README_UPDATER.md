# VDI Realty - Market Data Updater

## Overview
This Python script automatically updates the Market Pulse section of your website with current real estate data.

## Quick Start

### Option 1: Manual Update (Recommended for Getting Started)
1. Open `update_market_data.py`
2. Edit the `get_manual_data()` function with your current market data
3. Run: `python update_market_data.py`

### Option 2: JSON File Updates
1. Update `market_data.json` with current values
2. In `update_market_data.py`, uncomment line:
   ```python
   market_data = get_data_from_json('market_data.json')
   ```
3. Run: `python update_market_data.py`

### Option 3: API Integration (Real-time Data)

#### Using Realty Mole API
1. Sign up at [RapidAPI - Realty Mole](https://rapidapi.com/realtymole/api/realty-mole-property-api)
2. Get your API key
3. In `update_market_data.py`, uncomment and configure:
   ```python
   API_KEY = "your_api_key_here"
   market_data = get_realty_mole_data(API_KEY, "YourCity", "YourState")
   ```
4. Install requests: `pip install requests`
5. Run: `python update_market_data.py`

#### Using Zillow API
1. Sign up at [RapidAPI - Zillow](https://rapidapi.com/apimaker/api/zillow-com1)
2. Follow similar steps as above

## Automation Options

### Windows Task Scheduler
1. Open Task Scheduler
2. Create Basic Task
3. Set trigger (e.g., Weekly on Monday at 9 AM)
4. Action: Start a program
   - Program: `python`
   - Arguments: `update_market_data.py`
   - Start in: `C:\Users\vengw\OneDrive\P\VDI\Git\vdirealty\vdirealty`

### GitHub Actions (Recommended for Auto-Deploy)
Create `.github/workflows/update-market-data.yml`:
```yaml
name: Update Market Data

on:
  schedule:
    - cron: '0 9 * * 1'  # Every Monday at 9 AM
  workflow_dispatch:  # Manual trigger

jobs:
  update:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Set up Python
        uses: actions/setup-python@v2
        with:
          python-version: '3.x'
      - name: Install dependencies
        run: pip install requests
      - name: Update market data
        env:
          API_KEY: ${{ secrets.REALTY_API_KEY }}
        run: python update_market_data.py
      - name: Commit changes
        run: |
          git config --local user.email "action@github.com"
          git config --local user.name "GitHub Action"
          git add index.html
          git commit -m "Update market data" || echo "No changes"
          git push
```

## Data Sources

### Free Options
- Manual updates (current method)
- Local JSON file updates
- Web scraping (requires additional code)

### Paid API Options
- **Realty Mole** (~$10-50/month) - Real estate listings and market data
- **Zillow API** (via RapidAPI) - Comprehensive property data
- **Realtor.com API** - Market statistics
- **Attom Data Solutions** - Property and market analytics

### MLS Integration
For the most accurate local data, consider:
- Connect to your local MLS (Multiple Listing Service)
- Use MLS data feeds if you have access
- Partner with data providers who have MLS agreements

## Example Usage

```python
# In update_market_data.py, just edit these values:
def get_manual_data():
    return {
        'median_price': '$565k',      # Update this
        'days_on_market': 28,          # Update this
        'list_to_sale': 97,            # Update this
        'active_listings': 165,        # Update this
        'update_date': datetime.now().strftime('%b %Y')
    }
```

Then run:
```bash
python update_market_data.py
```

Output:
```
============================================================
VDI Realty - Market Data Updater
============================================================
✅ Successfully updated index.html
   Median Price: $565k
   Days on Market: 28
   List-to-Sale: 97%
   Active Listings: 165
   Updated: Dec 2025
```

## Troubleshooting

**Script doesn't find index.html:**
- Make sure you're running the script from the same directory as index.html
- Or update the path in `update_html_file()` function

**API errors:**
- Check your API key is correct
- Verify you have credits/subscription active
- Check the API documentation for rate limits

**Dependencies missing:**
```bash
pip install requests
```

## Extending the Script

### Add More Data Points
You can easily add new statistics by:
1. Adding the field to your data dictionary
2. Adding a regex pattern in `update_html_file()`
3. Adding the HTML element in index.html

### Custom Data Sources
Create your own function following this pattern:
```python
def get_custom_data():
    # Your data fetching logic here
    return {
        'median_price': '...',
        'days_on_market': ...,
        'list_to_sale': ...,
        'active_listings': ...,
        'update_date': datetime.now().strftime('%b %Y')
    }
```

## Best Practices

1. **Update Frequency**: Weekly or bi-weekly is typical for market data
2. **Backup**: Keep backups of your index.html before running updates
3. **Version Control**: Use git to track changes
4. **Monitoring**: Set up alerts if automated updates fail
5. **Data Validation**: Add checks to ensure data looks reasonable

## Support

For issues or questions about:
- The script: Check the code comments
- APIs: Refer to the respective API documentation
- Automation: See the automation section above
