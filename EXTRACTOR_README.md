# VDI Realty - Listing Extractor

**Automated tool to extract property listings from real estate websites**

Extract property data from Century 21, Zillow, Realtor.com, Redfin, and more - no CORS issues, no backend needed!

---

## 🚀 Quick Start

### Step 1: Install Python

1. Download Python from: https://www.python.org/downloads/
2. Run installer and **CHECK "Add Python to PATH"**
3. Click "Install Now"
4. Verify installation:
   ```bash
   python --version
   ```
   Should show: `Python 3.x.x`

### Step 2: Install Dependencies

Open Command Prompt or PowerShell in this folder and run:

```bash
pip install -r requirements.txt
```

This installs:
- `requests` - For fetching web pages
- `beautifulsoup4` - For parsing HTML

### Step 3: Create URL List

Edit `urls.txt` and add your listing URLs (one per line):

```
https://www.century21northhomes.com/property/16454-108th-bothell-wa-98011/100363963/
https://www.zillow.com/homedetails/...
https://www.realtor.com/realestateandhomes-detail/...
```

### Step 4: Run the Extractor

```bash
python extract_listings.py urls.txt
```

### Step 5: Get Results

The script creates `extracted_listings.json` with all property data:

```json
[
  {
    "source": "Century 21",
    "sourceUrl": "https://...",
    "address": "16454 108th Avenue NE",
    "city": "Bothell",
    "state": "WA",
    "zip": "98011",
    "price": 2280000,
    "bedrooms": 5,
    "bathrooms": 4.5,
    "sqft": 4500,
    "description": "Beautiful home...",
    "images": ["https://..."],
    "status": "Active"
  }
]
```

---

## 📖 Usage Examples

### Extract from a file of URLs:
```bash
python extract_listings.py urls.txt
```

### Extract a single URL:
```bash
python extract_listings.py "https://www.century21northhomes.com/property/..."
```

### Extract multiple URLs at once:
```bash
python extract_listings.py "URL1" "URL2" "URL3"
```

---

## 🎯 Supported Sites

✅ **Century 21** (all franchises)  
✅ **Zillow**  
✅ **Realtor.com**  
✅ **Redfin**  
✅ **RE/MAX**  
✅ **Coldwell Banker**  
✅ **Compass**  
✅ **Any site with JSON-LD structured data**

---

## 📂 Workflow for Brokers

### Option A: Email List of URLs

1. Broker emails you a list of property URLs
2. Copy URLs to `urls.txt` (one per line)
3. Run: `python extract_listings.py urls.txt`
4. Import `extracted_listings.json` to your site

### Option B: Spreadsheet

1. Broker sends Excel/Google Sheet with URLs in column A
2. Copy column to `urls.txt`
3. Run extraction
4. Merge results with your database

### Option C: Automated Daily Sync

1. Broker maintains a shared Google Doc with URLs
2. Download as .txt daily
3. Run extraction script
4. Auto-import new listings

---

## 🛠️ Troubleshooting

### "Python is not recognized"
- Reinstall Python and check "Add Python to PATH"
- Restart Command Prompt after installation

### "No module named 'requests'"
```bash
pip install -r requirements.txt
```

### "SSL Certificate Error"
```bash
pip install --upgrade certifi
```

### "Access Denied" or "403 Forbidden"
- Some sites block automated access
- Try adding delays between requests
- The script uses a normal browser User-Agent to avoid blocking

### No data extracted
- Check if URL is correct and accessible
- Some sites load data dynamically (won't work with this script)
- Try the URL in your browser first to verify it works

---

## 💡 Advanced Usage

### Custom Output File
```python
# In extract_listings.py, change line:
output_file = 'extracted_listings.json'
# To:
output_file = f'listings_{datetime.now().strftime("%Y%m%d")}.json'
```

### Add More Sites
Edit `extract_listings.py` and add new extraction functions:

```python
def extract_newsite(url, soup):
    data = {
        'source': 'NewSite',
        'sourceUrl': url
    }
    # Add your selectors here
    return data
```

### Export to CSV
Add to end of `main()` function:

```python
import csv

with open('listings.csv', 'w', newline='') as f:
    writer = csv.DictWriter(f, fieldnames=listings[0].keys())
    writer.writeheader()
    writer.writerows(listings)
```

---

## 📊 What Data is Extracted

- ✅ Address, City, State, ZIP
- ✅ Price
- ✅ Bedrooms, Bathrooms
- ✅ Square Footage
- ✅ Year Built (when available)
- ✅ Property Type
- ✅ Description
- ✅ Photo URLs (up to 5)
- ✅ Source URL (for "View Details" link)

---

## ⚡ Performance

- ~1-2 seconds per listing
- 100 listings ≈ 2-3 minutes
- No rate limiting (be respectful!)

---

## 🔒 Privacy & Legal

- Script only extracts publicly available data
- No authentication or bypassing of paywalls
- Respects robots.txt (best practice)
- For internal business use only

---

## 🆘 Support

Issues? Check the console output:
- `✓` = Success
- `❌` = Error (with details)

Common fixes:
1. Verify URL works in browser
2. Check internet connection
3. Update dependencies: `pip install -r requirements.txt --upgrade`

---

## 📝 Example Output

```
============================================================
VDI Realty - Listing Extractor
============================================================

📄 Reading URLs from: urls.txt

📊 Processing 3 URL(s)

📥 Processing: https://www.century21northhomes.com/...
  🏢 Source: century21
  ✓ Found JSON-LD data
  ✅ Extracted: 16454 108th Avenue NE - $2,280,000

📥 Processing: https://www.zillow.com/...
  🏢 Source: zillow
  ✅ Extracted: 123 Main St - $850,000

📥 Processing: https://www.realtor.com/...
  🏢 Source: realtor
  ✅ Extracted: 456 Oak Ave - $1,200,000

============================================================
✅ SUCCESS! Extracted 3 listing(s)
📁 Saved to: extracted_listings.json
============================================================

📋 Summary:
  1. 16454 108th Avenue NE - $2,280,000
  2. 123 Main St - $850,000
  3. 456 Oak Ave - $1,200,000

💡 Next steps:
  1. Open extracted_listings.json
  2. Copy the data
  3. Import to your website or database
```

---

**Version:** 1.0  
**Last Updated:** February 2026  
**License:** MIT
