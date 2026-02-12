# 🌐 Universal Listing Extraction Guide

## Extract from ANY Listing Website!

This guide shows you how to extract property data from **any real estate listing site**, including Century 21, RE/MAX, Coldwell Banker, Compass, Keller Williams, and more.

---

## 🎯 The Challenge

Different listing sites have different formats:
- **Zillow, Realtor.com** → Have specific APIs
- **Century 21, RE/MAX, etc.** → No public APIs
- **Local MLS sites** → Varied structures

**Solution:** Universal web scraping that works with ANY site!

---

## 🚀 Recommended Solution: ScrapingBee

### Why ScrapingBee?

✅ **Works with ANY website** (Century 21, RE/MAX, etc.)  
✅ **AI-powered extraction** - Automatically finds property data  
✅ **No CORS issues** - Server-side scraping  
✅ **Handles JavaScript** - Works with modern sites  
✅ **Free tier available** - 1,000 API calls/month  

### Pricing

| Plan | Price | API Calls | Best For |
|------|-------|-----------|----------|
| Free | $0 | 1,000/month | Testing & small teams |
| Freelance | $49/month | 150,000/month | Active brokers |
| Startup | $149/month | 500,000/month | Busy agencies |

**Average usage:** 2-3 listings/day = ~100 calls/month = **FREE!**

---

## 📋 Setup Instructions

### Step 1: Create ScrapingBee Account

1. Go to **[ScrapingBee.com](https://www.scrapingbee.com/)**
2. Click "Start Free Trial"
3. Sign up (no credit card required for free tier)
4. Get your API key from dashboard

### Step 2: Update broker-portal.html

Open `broker-portal.html` and find line ~420. Uncomment this section:

```javascript
// Using ScrapingBee (Universal extraction)
const scrapingBeeKey = 'YOUR_SCRAPINGBEE_API_KEY'; // <-- ADD YOUR KEY

const apiUrl = `https://app.scrapingbee.com/api/v1/?api_key=${scrapingBeeKey}&url=${encodeURIComponent(url)}&extract_rules=${encodeURIComponent(JSON.stringify({
    address: {selector: 'h1.address, .property-address, [itemprop="address"]'},
    price: {selector: '.price, .property-price, [itemprop="price"]'},
    beds: {selector: '.beds, .bedrooms, [data-beds]'},
    baths: {selector: '.baths, .bathrooms, [data-baths]'},
    sqft: {selector: '.sqft, .square-feet, [data-sqft]'},
    description: {selector: '.description, .property-description'},
    image: {selector: 'img.main-photo, .primary-photo', type: 'attribute', attribute: 'src'}
}))}`;

const response = await fetch(apiUrl);
const data = await response.json();
return parseUniversalData(data);
```

### Step 3: Replace the Mock Data Call

Find this line (~line 445):
```javascript
return mockExtractData();
```

Comment it out:
```javascript
// return mockExtractData(); // Only for demo
```

### Step 4: Test with Century 21

Try your actual listing:
```
https://www.century21.com/homes/detail/wa/sammamish/1136-205th-ave-ne/lid-P00800000Gwm8SzrGWl5z1oL9s2uxX7KAbLCQPkH
```

---

## 🔧 How It Works

### Universal Extraction Process:

```
1. User pastes listing URL (ANY site)
2. ScrapingBee fetches the page
3. AI extraction finds property data
4. Data auto-fills your form
5. Broker reviews and publishes
```

### What Gets Extracted:

✅ **Address** - Street, city, state, ZIP  
✅ **Price** - Listing price  
✅ **Bedrooms** - Number of beds  
✅ **Bathrooms** - Number of baths  
✅ **Square Feet** - Living area  
✅ **Description** - Property details  
✅ **Images** - Main property photo  
✅ **Additional Details** - Lot size, year built, etc.

---

## 🎨 Alternative Solutions

### Option 2: Apify

**Best for:** More complex extraction needs

1. Go to [Apify.com](https://apify.com/)
2. Use "Web Scraper" actor
3. Configure selectors for property data
4. Similar pricing to ScrapingBee

**Setup:**
```javascript
const apifyToken = 'YOUR_APIFY_TOKEN';
const apiUrl = `https://api.apify.com/v2/acts/apify~web-scraper/run-sync-get-dataset-items?token=${apifyToken}`;

const response = await fetch(apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        startUrls: [{ url: listingUrl }],
        pageFunction: extractPropertyData // Custom function
    })
});
```

### Option 3: BrightData

**Best for:** Enterprise-level extraction

- Most expensive but most reliable
- 99.9% uptime guarantee
- Premium proxy network
- Starts at $500/month

### Option 4: Custom Backend Scraper

**Best for:** Full control, no recurring costs

**Pros:**
- No monthly fees
- Complete customization
- Your own infrastructure

**Cons:**
- Requires backend server
- More maintenance
- Need to handle anti-scraping

**Stack:**
```
Node.js + Puppeteer
Python + BeautifulSoup
PHP + Goutte
```

---

## 💻 Custom Backend Example

### Node.js with Puppeteer:

```javascript
// server.js
const express = require('express');
const puppeteer = require('puppeteer');
const app = express();

app.post('/api/extract-listing', async (req, res) => {
    const { url } = req.body;
    
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.goto(url);
    
    const data = await page.evaluate(() => {
        return {
            address: document.querySelector('h1.address')?.textContent,
            price: document.querySelector('.price')?.textContent,
            beds: document.querySelector('.beds')?.textContent,
            baths: document.querySelector('.baths')?.textContent,
            sqft: document.querySelector('.sqft')?.textContent,
            description: document.querySelector('.description')?.textContent,
            image: document.querySelector('img.main-photo')?.src
        };
    });
    
    await browser.close();
    res.json(data);
});

app.listen(3000);
```

Then update your frontend:
```javascript
async function fetchListingData(url, source) {
    const response = await fetch('http://your-server.com/api/extract-listing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
    });
    return await response.json();
}
```

---

## 🔍 Site-Specific Selectors

Each site has different HTML structure. Here are selectors for major sites:

### Century 21:
```javascript
{
    address: '.listing-address, .property-address',
    price: '.listing-price, .price-wrapper',
    beds: '.beds-count, [data-testid="beds"]',
    baths: '.baths-count, [data-testid="baths"]',
    sqft: '.sqft-value, .square-footage',
    description: '.listing-description, .property-remarks'
}
```

### RE/MAX:
```javascript
{
    address: '.listing-address',
    price: '.listing-price',
    beds: '.beds',
    baths: '.baths',
    sqft: '.sqft',
    description: '.listing-description'
}
```

### Coldwell Banker:
```javascript
{
    address: '.property-address',
    price: '.property-price',
    beds: '.property-beds',
    baths: '.property-baths',
    sqft: '.property-sqft',
    description: '.property-description'
}
```

---

## 🛠 Advanced Configuration

### Custom Extraction Rules

For sites with unique structures, customize the selectors:

```javascript
const extractionRules = {
    // Try multiple selectors (first match wins)
    address: {
        selectors: [
            'h1.listing-address',
            '.property-street-address',
            '[itemprop="streetAddress"]',
            '.address-line-1'
        ]
    },
    
    // Extract attribute instead of text
    image: {
        selector: 'img.hero-image',
        type: 'attribute',
        attribute: 'src'
    },
    
    // Extract from meta tags
    price: {
        selector: 'meta[property="og:price:amount"]',
        type: 'attribute',
        attribute: 'content'
    }
};
```

### Handle Dynamic Content

Some sites load data with JavaScript:

```javascript
const apiUrl = `https://app.scrapingbee.com/api/v1/?api_key=${apiKey}&url=${url}&render_js=true&wait=2000`;
// render_js=true → Executes JavaScript
// wait=2000 → Waits 2 seconds for content to load
```

### Extract Multiple Images

```javascript
const extractionRules = {
    images: {
        selector: '.property-photo',
        type: 'list',  // Get all matches, not just first
        output: '@src'  // Get src attribute
    }
};
```

---

## 🧪 Testing Your Extraction

### Step 1: Test with Console

Open browser console (F12) and test selectors:

```javascript
// Test address extraction
document.querySelector('h1.address')?.textContent

// Test price extraction
document.querySelector('.price')?.textContent

// Test image extraction
document.querySelector('img.main-photo')?.src
```

### Step 2: ScrapingBee Playground

Use their testing tool:
1. Go to ScrapingBee dashboard
2. Click "Playground"
3. Enter your listing URL
4. Test extraction rules
5. See results in real-time

### Step 3: Debug Mode

Add debug mode to see what's being extracted:

```javascript
async function fetchListingData(url, source) {
    const data = await extractData(url);
    
    // Debug: Log extracted data
    console.log('Extracted data:', data);
    
    // Debug: Show what fields are missing
    const missingFields = [];
    if (!data.address) missingFields.push('address');
    if (!data.price) missingFields.push('price');
    console.log('Missing fields:', missingFields);
    
    return data;
}
```

---

## ✅ Validation & Fallbacks

Always validate extracted data:

```javascript
function validateExtractedData(data) {
    const validated = { ...data };
    
    // Clean price (remove $, commas)
    if (validated.price) {
        validated.price = parseInt(validated.price.replace(/[^0-9]/g, ''));
    }
    
    // Clean beds/baths (extract numbers only)
    if (validated.bedrooms) {
        validated.bedrooms = parseFloat(validated.bedrooms.replace(/[^0-9.]/g, ''));
    }
    
    // Validate required fields
    if (!validated.address || !validated.price) {
        throw new Error('Missing required fields');
    }
    
    return validated;
}
```

Add fallback for failed extraction:

```javascript
async function extractListingData() {
    try {
        const data = await fetchListingData(url, source);
        const validated = validateExtractedData(data);
        populateForm(validated);
        showSuccess('✅ Listing data extracted successfully!');
    } catch (error) {
        console.error('Extraction failed:', error);
        showError('⚠️ Could not extract all data. Please fill in missing fields manually.');
        // Form stays empty, broker fills manually
    }
}
```

---

## 📊 Monitoring & Analytics

Track extraction success rate:

```javascript
const extractionStats = {
    total: 0,
    successful: 0,
    failed: 0,
    bySite: {}
};

function trackExtraction(source, success) {
    extractionStats.total++;
    
    if (success) {
        extractionStats.successful++;
    } else {
        extractionStats.failed++;
    }
    
    // Track by site
    if (!extractionStats.bySite[source]) {
        extractionStats.bySite[source] = { success: 0, failed: 0 };
    }
    
    extractionStats.bySite[source][success ? 'success' : 'failed']++;
    
    // Log stats
    console.log(`Success rate: ${(extractionStats.successful / extractionStats.total * 100).toFixed(1)}%`);
}
```

---

## 🔒 Security & Best Practices

### 1. Never Expose API Keys in Frontend

For production, move extraction to backend:

```javascript
// Frontend (broker-portal.html)
async function fetchListingData(url) {
    const response = await fetch('https://your-server.com/api/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
    });
    return await response.json();
}

// Backend (server.js)
app.post('/api/extract', async (req, res) => {
    const apiKey = process.env.SCRAPINGBEE_KEY; // Secure!
    // ... extraction logic
});
```

### 2. Rate Limiting

Prevent abuse:

```javascript
let lastExtraction = 0;
const COOLDOWN = 2000; // 2 seconds between extractions

async function extractListingData() {
    const now = Date.now();
    if (now - lastExtraction < COOLDOWN) {
        alert('Please wait before extracting another listing');
        return;
    }
    lastExtraction = now;
    // ... proceed with extraction
}
```

### 3. Validate URLs

Only allow real estate sites:

```javascript
function isValidListingUrl(url) {
    const allowedDomains = [
        'zillow.com', 'realtor.com', 'redfin.com',
        'century21.com', 'remax.com', 'coldwellbanker.com',
        'compass.com', 'kw.com'
    ];
    
    return allowedDomains.some(domain => url.includes(domain));
}
```

---

## 🚀 Quick Start Checklist

- [ ] Sign up for ScrapingBee (free tier)
- [ ] Copy API key
- [ ] Update `broker-portal.html` with key
- [ ] Uncomment ScrapingBee code
- [ ] Test with Century 21 URL
- [ ] Verify form auto-fills
- [ ] Test with other sites (RE/MAX, etc.)
- [ ] Add validation & error handling
- [ ] Deploy to production

---

## 📝 Example: Complete Flow

```javascript
// 1. User pastes URL
const url = 'https://www.century21.com/homes/detail/...';

// 2. Detect source
const source = detectSource(url); // 'century21'

// 3. Extract data via ScrapingBee
const data = await fetchListingData(url, source);
// Returns: { address: '1136 205th Ave NE', price: 1250000, ... }

// 4. Validate data
const validated = validateExtractedData(data);

// 5. Auto-fill form
populateForm(validated);

// 6. Broker reviews & publishes
saveListingToStorage();
```

---

## 🆘 Troubleshooting

### "No data extracted"
**Fix:** Check selectors for that specific site. Use browser DevTools to inspect HTML structure.

### "CORS error"
**Fix:** Use server-side extraction (backend API) or ScrapingBee which handles CORS.

### "Rate limit exceeded"
**Fix:** 
- Upgrade ScrapingBee plan
- Add caching (don't re-extract same URL)
- Implement cooldown between requests

### "Some fields missing"
**Fix:**
- Add more selector variations
- Allow manual editing of extracted data
- Save partial data and flag for review

---

## 💡 Pro Tips

1. **Cache extractions** - Don't re-extract the same URL
2. **Allow manual overrides** - Broker can fix any incorrect data
3. **Save source URL** - Link back to original listing
4. **Image validation** - Check if image URLs are accessible
5. **Auto-complete city/state** - Use geocoding API if missing

---

**You can now extract from ANY listing site!** 🎉

Test it with your Century 21 link and any other broker website you use!
