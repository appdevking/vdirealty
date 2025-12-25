# 🔄 Live Market Data - Setup Guide

Your website now automatically updates market data! Here's how to configure it:

## 🎯 Current Status

✅ **Installed & Ready** - The system is active with these features:
- Automatic data updates on page load
- Smart caching (60-minute cache)
- Fallback to static data
- Three data source options

---

## 📊 How It Works Now

**Current Mode:** Static Data (default)
- Shows pre-configured market stats
- No API calls required
- Fast loading, no dependencies

**To enable live data**, choose one of the options below:

---

## Option 1: Local JSON File (Easiest)

### Perfect for: Manual updates or integration with existing data sources

**Setup (2 minutes):**

1. Edit `market_data.json` with your current market data
2. Open `index.html` and find this line (~line 525):
   ```javascript
   dataSource: 'static', // Change to 'api' when you have API credentials
   ```

3. Change it to:
   ```javascript
   dataSource: 'json',
   ```

4. Save and refresh your website!

**Updating data:**
- Manually edit `market_data.json`, OR
- Use the Python script: `python update_market_data.py`

---

## Option 2: Realty Mole API (Recommended - Real-Time Data)

### Perfect for: Automatic real-time updates from actual MLS listings

**Setup (10 minutes):**

### Step 1: Get API Access
1. Go to [RapidAPI - Realty Mole](https://rapidapi.com/realtymole/api/realty-mole-property-api)
2. Sign up for RapidAPI account (free)
3. Subscribe to Realty Mole API
   - **Free Tier:** 100 calls/month (enough for most sites)
   - **Basic Tier:** $9.99/month - 1,000 calls/month
4. Copy your API key from the dashboard

### Step 2: Configure Your Website
Open `index.html` and find the configuration section (~line 520):

```javascript
const MARKET_DATA_CONFIG = {
    dataSource: 'api', // Changed from 'static'
    
    api: {
        provider: 'realtymole',
        key: 'YOUR_API_KEY_HERE', // Paste your RapidAPI key
        location: {
            city: 'Phoenix',      // Your city
            state: 'AZ',          // Your state
            zipCode: '85001'      // Your zip code
        }
    },
    
    cacheDuration: 60,        // Cache for 60 minutes
    autoRefresh: true,        // Auto-refresh enabled
    refreshInterval: 3600000  // Refresh every hour
};
```

### Step 3: Test It!
1. Save `index.html`
2. Open your website
3. Open browser console (F12)
4. Look for: "✅ Market data updated successfully"

**What You Get:**
- ✅ Real median home prices from actual listings
- ✅ Average days on market
- ✅ Active listing count
- ✅ Updates automatically every hour
- ✅ 60-minute cache to save API calls

---

## Option 3: Zillow API (Alternative)

### Perfect for: Access to Zillow's comprehensive data

**Setup:**

### Step 1: Get API Access
1. Go to [RapidAPI - Zillow](https://rapidapi.com/apimaker/api/zillow-com1)
2. Subscribe to API plan
3. Copy your API key

### Step 2: Configure
In `index.html` configuration (~line 520):

```javascript
const MARKET_DATA_CONFIG = {
    dataSource: 'api',
    
    api: {
        provider: 'zillow', // Changed from 'realtymole'
        key: 'YOUR_ZILLOW_API_KEY',
        location: {
            city: 'Phoenix',
            state: 'AZ',
            zipCode: '85001'
        }
    },
    
    cacheDuration: 60,
    autoRefresh: true,
    refreshInterval: 3600000
};
```

---

## ⚙️ Advanced Configuration

### Adjust Cache Duration
```javascript
cacheDuration: 120, // Cache for 2 hours (in minutes)
```

### Change Auto-Refresh Interval
```javascript
refreshInterval: 7200000 // Refresh every 2 hours (in milliseconds)
// 1 hour = 3600000 ms
// 2 hours = 7200000 ms
// 6 hours = 21600000 ms
```

### Disable Auto-Refresh
```javascript
autoRefresh: false, // Only loads on page refresh
```

---

## 🧪 Testing Your Setup

### 1. Check Browser Console
Press **F12** → **Console** tab, look for:
- ✅ `"🔄 Loading market data..."`
- ✅ `"✅ Market data updated successfully"`

### 2. Verify Data Updates
- The numbers should change based on real data
- Check the console for the actual data returned

### 3. Test Cache
- Refresh the page multiple times
- Should see `"Using cached market data"` within 60 minutes
- After 60 minutes, should fetch fresh data

---

## 🔍 Troubleshooting

### "Using static data" message
**Issue:** API not configured or API call failed
**Fix:** 
- Verify `dataSource` is set to `'api'`
- Check your API key is correct
- Verify API subscription is active

### No data updates
**Issue:** Cache might be preventing updates
**Fix:** 
- Clear browser localStorage
- Open Console → Application → Local Storage → Clear
- Refresh page

### API errors in console
**Issue:** API key or location incorrect
**Fix:**
- Verify API key in RapidAPI dashboard
- Check city/state spelling
- Ensure API subscription is active

### CORS errors
**Issue:** Testing locally with file:// protocol
**Fix:**
- Upload to actual web server, OR
- Use local server: `python -m http.server 8000`

---

## 💰 Cost Comparison

| Provider | Free Tier | Paid Tier | Best For |
|----------|-----------|-----------|----------|
| **Realty Mole** | 100/month | $9.99/1000 calls | Real MLS data |
| **Zillow** | Limited | $20-50/month | Brand recognition |
| **JSON File** | Free | Free | Manual updates |

**Recommendation:** Start with Realty Mole free tier (100 calls/month)
- With 60-min cache and auto-refresh, you'll use ~720 calls/month for 24/7 updates
- Upgrade to $9.99/month if you need more

---

## 📈 How the Cache Works

1. **First Visit:** Fetches fresh data from API → Saves to cache
2. **Within 60 min:** Loads from cache (instant, no API call)
3. **After 60 min:** Fetches fresh data → Updates cache
4. **Auto-refresh:** If enabled, updates every hour automatically

**Benefits:**
- ⚡ Faster page loads
- 💰 Saves API calls (and money)
- 🎯 Always reasonably fresh data

---

## 🚀 Quick Start (Choose One)

### For Manual Control:
```javascript
dataSource: 'json',
```
Then update `market_data.json` as needed.

### For Full Automation:
```javascript
dataSource: 'api',
api: {
    provider: 'realtymole',
    key: 'your-rapidapi-key-here',
    location: { city: 'YourCity', state: 'ST', zipCode: '12345' }
}
```

---

## 💡 Pro Tips

1. **Start with JSON mode** to test the system works
2. **Upgrade to API** when you're ready for automation
3. **Monitor API usage** in your RapidAPI dashboard
4. **Adjust cache duration** based on your needs:
   - Busy market: 30-60 minutes
   - Stable market: 2-4 hours
5. **Combine approaches**: Use API to update JSON file daily via Python script

---

## Need Help?

Check browser console (F12) for detailed error messages and status updates. The system logs all operations for easy debugging!

**System is working if you see:**
- ✅ Market data loading messages
- ✅ Numbers updating on the page
- ✅ Cache status in console
