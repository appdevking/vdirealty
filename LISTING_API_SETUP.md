# 🔗 Listing URL Auto-Extract Setup Guide

## Overview

Your broker portal can automatically extract property details from listing URLs! This guide shows you how to enable the feature.

---

## 🎯 How It Works

1. **Broker pastes a listing URL** (from Zillow, Realtor.com, Redfin, etc.)
2. **System extracts property data** via API
3. **Form auto-fills** with all the details
4. **Broker reviews and publishes** the listing

---

## 🚀 Setup Options

### **Option 1: RapidAPI (Recommended)**

Best for: Multiple data sources, reliable service

#### Step 1: Get API Access

1. Go to **[RapidAPI](https://rapidapi.com)**
2. Sign up for free account
3. Subscribe to one or more of these APIs:

**For Zillow:**
- API: [Zillow API](https://rapidapi.com/apimaker/api/zillow-com1)
- Pricing: Free tier (100 calls/month), then $9.99-$49.99/month

**For Realtor.com:**
- API: [Realtor API](https://rapidapi.com/apidojo/api/realtor)
- Pricing: Free tier (50 calls/month), then $10-$100/month

**For Multi-Source:**
- API: [Real Estate API](https://rapidapi.com/realty-in-us/api/realty-in-us)
- Pricing: $19.99-$99.99/month
- Covers: Zillow, Realtor.com, Redfin, Trulia

#### Step 2: Get Your API Key

1. Go to your RapidAPI dashboard
2. Find your **X-RapidAPI-Key**
3. Copy it (looks like: `abcd1234567890xyz...`)

#### Step 3: Update broker-portal.html

Open `broker-portal.html` and find this section (~line 400):

```javascript
// Fetch listing data (This requires API keys - see setup guide)
async function fetchListingData(url, source) {
    // OPTION 1: Using RapidAPI (Recommended)
    // Uncomment and configure when you have API keys
    
    const apiKey = 'YOUR_RAPIDAPI_KEY'; // <-- ADD YOUR KEY HERE
```

Replace `YOUR_RAPIDAPI_KEY` with your actual key.

#### Step 4: Uncomment the API Code

Find and uncomment this section (~line 410):

```javascript
/*
const apiKey = 'YOUR_RAPIDAPI_KEY';
let apiUrl = '';

if (source === 'zillow') {
    const zpid = extractZillowId(url);
    apiUrl = `https://zillow-com1.p.rapidapi.com/property?zpid=${zpid}`;
}

const response = await fetch(apiUrl, {
    headers: {
        'X-RapidAPI-Key': apiKey,
        'X-RapidAPI-Host': 'zillow-com1.p.rapidapi.com'
    }
});

const data = await response.json();
return parseApiData(data, source);
*/
```

Remove the `/*` and `*/` to activate it.

#### Step 5: Add Extraction Functions

Add these helper functions to `broker-portal.html`:

```javascript
// Extract Zillow ID from URL
function extractZillowId(url) {
    const match = url.match(/\/(\d+)_zpid/);
    return match ? match[1] : null;
}

// Parse API data
function parseApiData(data, source) {
    if (source === 'zillow') {
        return {
            address: data.address?.streetAddress || '',
            city: data.address?.city || '',
            state: data.address?.state || '',
            zipCode: data.address?.zipcode || '',
            price: data.price || 0,
            propertyType: data.homeType || '',
            bedrooms: data.bedrooms || 0,
            bathrooms: data.bathrooms || 0,
            sqft: data.livingArea || 0,
            lotSize: data.lotSize || 0,
            description: data.description || '',
            mainImage: data.imgSrc || '',
            additionalImages: (data.photos || []).slice(0, 5).join(', '),
            mlsNumber: data.attributionInfo?.mlsId || ''
        };
    }
    
    // Add parsers for other sources
    return null;
}
```

---

### **Option 2: Web Scraping (Alternative)**

Best for: Free option, no API costs (but less reliable)

This requires a backend server and is more complex. Skip unless you need the free option.

---

### **Option 3: Manual Import (Already Active)**

The demo mode is currently active. It shows how the extraction works with mock data.

To test:
1. Go to `broker-portal.html`
2. Paste any URL
3. Click "Extract"
4. See the form auto-fill

---

## 💰 Cost Breakdown

### RapidAPI Zillow Option

| Plan | Price | Calls/Month | Best For |
|------|-------|-------------|----------|
| Free | $0 | 100 | Testing |
| Basic | $9.99 | 1,000 | Small teams (1-5 listings/day) |
| Pro | $49.99 | 10,000 | Active brokers (10-30 listings/day) |

**Average usage:** If you add 2-3 listings per day = ~100 calls/month = **Free tier!**

---

## 🔧 Supported Listing Sources

Once configured, these sites will work:

✅ **Zillow** - Full support
✅ **Realtor.com** - Full support  
✅ **Redfin** - Full support
✅ **Trulia** - Full support
✅ **MLS Listings** - Depends on MLS API access

---

##  Testing the Integration

### Step 1: Test with Sample URL

Try this Zillow property:
```
https://www.zillow.com/homedetails/123-Main-St-Phoenix-AZ-85001/12345678_zpid
```

### Step 2: Check Console

Open browser console (F12) to see:
- API requests
- Response data
- Any errors

### Step 3: Verify Form

Check that these fields auto-fill:
- ✅ Address
- ✅ City, State, ZIP
- ✅ Price
- ✅ Beds, Baths, Sqft
- ✅ Description
- ✅ Images

---

## 🛠 Troubleshooting

### "Unsupported listing URL" error
**Fix:** Make sure URL is from Zillow, Realtor.com, Redfin, or Trulia

### "Could not extract listing data" error
**Fix:** 
- Verify API key is correct
- Check API subscription is active
- Ensure you haven't exceeded rate limits

### CORS errors
**Fix:** API calls must come from your domain. If testing locally, either:
- Upload to actual website, OR
- Use a CORS proxy temporarily

### Rate limit exceeded
**Fix:**
- Upgrade your RapidAPI plan
- Cache extracted data
- Limit extractions per day

---

## 🎯 Advanced Features

### Auto-Calculate Investment Metrics

Add this to calculate cap rate automatically:

```javascript
// After extracting data
if (listingData.price && listingData.monthlyRent) {
    const annualRent = listingData.monthlyRent * 12;
    listingData.capRate = ((annualRent / listingData.price) * 100).toFixed(2);
}
```

### Batch Import

Allow uploading CSV of URLs:

```javascript
function batchImport(urlList) {
    urlList.forEach(async (url, index) => {
        setTimeout(async () => {
            await extractListingData(url);
        }, index * 2000); // 2 second delay between calls
    });
}
```

### Image Optimization

Automatically resize/compress images:

```javascript
async function optimizeImage(imageUrl) {
    // Use service like Cloudinary or imgix
    return `https://res.cloudinary.com/your-cloud/image/fetch/w_800,q_auto/${imageUrl}`;
}
```

---

## 📊 Analytics & Monitoring

Track extraction success rate:

```javascript
let extractionStats = {
    total: 0,
    successful: 0,
    failed: 0
};

// After each extraction
extractionStats.total++;
if (success) {
    extractionStats.successful++;
} else {
    extractionStats.failed++;
}

// Success rate
const successRate = (extractionStats.successful / extractionStats.total) * 100;
```

---

## 🔐 Security Best Practices

1. **Never expose API keys in frontend code for production**
   - Move to backend/serverless function
   - Use environment variables

2. **Add authentication to broker portal**
   - Password protect the page
   - Use broker login system

3. **Validate extracted data**
   - Check for required fields
   - Sanitize inputs
   - Verify price ranges are reasonable

4. **Rate limiting**
   - Limit extractions per user
   - Add cooldown between requests

---

## 🚀 Production Deployment

### Recommended Architecture:

```
Frontend (broker-portal.html)
    ↓
Backend API (Node.js/Python/PHP)
    ↓
RapidAPI / MLS Data
    ↓
Your Database (store listings)
    ↓
Public Listings Page
```

### Backend API Example (Node.js):

```javascript
// server.js
app.post('/api/extract-listing', async (req, res) => {
    const { url } = req.body;
    const apiKey = process.env.RAPIDAPI_KEY; // Secure!
    
    try {
        const data = await fetchFromRapidAPI(url, apiKey);
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
```

---

## ✅ Quick Start Checklist

- [ ] Sign up for RapidAPI
- [ ] Subscribe to Zillow API (or preferred source)
- [ ] Copy API key
- [ ] Update `broker-portal.html` with key
- [ ] Uncomment API code
- [ ] Test with sample URL
- [ ] Verify form auto-fills
- [ ] Add authentication (optional)
- [ ] Deploy to production

---

## 📝 Sample Listing URLs for Testing

**Zillow:**
```
https://www.zillow.com/homedetails/[address]/[zpid]_zpid/
```

**Realtor.com:**
```
https://www.realtor.com/realestateandhomes-detail/[slug]
```

**Redfin:**
```
https://www.redfin.com/[state]/[city]/[address]/home/[id]
```

---

## 💡 Pro Tips

1. **Cache extractions** - Save API costs by storing extracted data
2. **Validate images** - Check if image URLs are accessible
3. **Add retry logic** - Handle temporary API failures
4. **Monitor usage** - Track API call count daily
5. **Backup plan** - Always allow manual entry if extraction fails

---

## 🆘 Need Help?

- **RapidAPI Support:** [https://rapidapi.com/support](https://rapidapi.com/support)
- **API Documentation:** Check each API's docs on RapidAPI
- **Common issues:** See troubleshooting section above

---

Your broker portal is ready! Once you add your API key, brokers can paste any listing URL and have it automatically populate in seconds! 🎉
