const puppeteer = require('puppeteer');

/**
 * Extract listing data from real estate URLs using Puppeteer
 */

// Detect listing source from URL
function detectSource(url) {
    const urlLower = url.toLowerCase();
    
    if (urlLower.includes('zillow.com')) return 'zillow';
    if (urlLower.includes('realtor.com')) return 'realtor';
    if (urlLower.includes('redfin.com')) return 'redfin';
    if (urlLower.includes('trulia.com')) return 'trulia';
    if (urlLower.includes('century21.com')) return 'century21';
    if (urlLower.includes('remax.com')) return 'remax';
    if (urlLower.includes('coldwellbanker.com')) return 'coldwellbanker';
    if (urlLower.includes('compass.com')) return 'compass';
    if (urlLower.includes('kw.com') || urlLower.includes('keller')) return 'kellerwilliams';
    
    return 'universal';
}

// Extract property data from page
async function extractPropertyData(page, source) {
    return await page.evaluate(() => {
        // Helper function to get text from selector
        const getText = (selector) => {
            const el = document.querySelector(selector);
            return el ? el.textContent.trim() : '';
        };

        // Extract images
        const images = [];
        const seenUrls = new Set();
        
        document.querySelectorAll('img').forEach(img => {
            let src = img.src || img.getAttribute('data-src') || img.getAttribute('data-lazy') || img.getAttribute('data-original');
            
            if (!src && img.srcset) {
                const sources = img.srcset.split(',').map(s => s.trim().split(' ')[0]);
                src = sources[sources.length - 1];
            }
            
            if (src && !seenUrls.has(src)) {
                const isLogo = src.toLowerCase().includes('logo') || src.toLowerCase().includes('icon') || 
                              img.alt?.toLowerCase().includes('logo') || img.alt?.toLowerCase().includes('icon');
                const width = parseInt(img.getAttribute('width')) || 0;
                
                if (src.match(/^https?:\/\//i) && !isLogo && (width === 0 || width > 200)) {
                    images.push(src);
                    seenUrls.add(src);
                }
            }
        });

        // Universal selectors for property data
        return {
            address: getText('h1.address, .property-address, .listing-address, [itemprop="address"], .street-address, h1.listing-title, h1[data-testid="property-street"], h1.property-address, .pdp-address h1, [data-rf-test-id="abp-streetLine"]'),
            price: getText('.price, .property-price, .listing-price, [itemprop="price"], .list-price, span.price, [data-testid="price"], .price-display, [data-rf-test-id="abp-price"], span[class*="price"], .sales-price'),
            beds: getText('.beds, .bedrooms, [data-beds], .beds-count, .bedroom-count, [data-testid="bed-count"], [data-rf-test-id="abp-beds"], .property-beds, li[data-testid="property-meta-beds"]'),
            baths: getText('.baths, .bathrooms, [data-baths], .baths-count, .bathroom-count, [data-testid="bath-count"], [data-rf-test-id="abp-baths"], .property-baths, li[data-testid="property-meta-baths"]'),
            sqft: getText('.sqft, .square-feet, [data-sqft], .sqft-value, .living-area, [data-testid="sqft-value"], [data-rf-test-id="abp-sqFt"], .property-sqft, li[data-testid="property-meta-sqft"]'),
            description: getText('.description, .property-description, .listing-description, .remarks, .property-details, [data-testid="description"], .property-remarks, #listing-description'),
            images: images.slice(0, 10)
        };
    });
}

// Parse extracted data into standardized format
function parseData(extractedData) {
    const parsed = {
        address: '',
        city: '',
        state: '',
        zip: '',
        price: '',
        bedrooms: '',
        bathrooms: '',
        sqft: '',
        description: '',
        images: extractedData.images || []
    };

    // Parse address
    if (extractedData.address) {
        parsed.address = extractedData.address;
        
        // Try to extract city, state, zip from address
        const addressMatch = extractedData.address.match(/,\s*([^,]+),\s*([A-Z]{2})\s*(\d{5})/);
        if (addressMatch) {
            parsed.city = addressMatch[1].trim();
            parsed.state = addressMatch[2];
            parsed.zip = addressMatch[3];
        }
    }

    // Parse price
    if (extractedData.price) {
        const priceMatch = extractedData.price.match(/\$?([\d,]+)/);
        if (priceMatch) {
            parsed.price = priceMatch[1].replace(/,/g, '');
        }
    }

    // Parse bedrooms
    if (extractedData.beds) {
        const bedsMatch = extractedData.beds.match(/(\d+\.?\d*)/);
        if (bedsMatch) {
            parsed.bedrooms = bedsMatch[1];
        }
    }

    // Parse bathrooms
    if (extractedData.baths) {
        const bathsMatch = extractedData.baths.match(/(\d+\.?\d*)/);
        if (bathsMatch) {
            parsed.bathrooms = bathsMatch[1];
        }
    }

    // Parse sqft
    if (extractedData.sqft) {
        const sqftMatch = extractedData.sqft.match(/([\d,]+)/);
        if (sqftMatch) {
            parsed.sqft = sqftMatch[1].replace(/,/g, '');
        }
    }

    // Description
    if (extractedData.description) {
        parsed.description = extractedData.description.substring(0, 1000);
    }

    return parsed;
}

/**
 * Main extraction function
 * @param {string} url - The listing URL to extract data from
 * @returns {Promise<Object>} - Extracted and parsed listing data
 */
async function extractListing(url) {
    let browser = null;
    
    try {
        console.log(`[Extraction] Starting extraction for: ${url}`);
        
        const source = detectSource(url);
        console.log(`[Extraction] Detected source: ${source}`);
        
        // Launch browser with appropriate options for EC2
        browser = await puppeteer.launch({
            headless: 'new',
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--disable-gpu',
                '--window-size=1920x1080'
            ],
            executablePath: '/snap/bin/chromium' // Use snap-installed Chromium
        });

        const page = await browser.newPage();
        
        // Set viewport
        await page.setViewport({ width: 1920, height: 1080 });
        
        // Set user agent to avoid detection
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        
        console.log(`[Extraction] Navigating to URL...`);
        
        // Navigate to page with timeout
        await page.goto(url, {
            waitUntil: 'networkidle2',
            timeout: 30000
        });
        
        console.log(`[Extraction] Page loaded, waiting for content...`);
        
        // Wait a bit for dynamic content
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Check for blocking/CAPTCHA
        const pageContent = await page.content();
        const bodyText = await page.evaluate(() => document.body.textContent.toLowerCase());
        
        if (bodyText.includes('verify you are a human') || 
            bodyText.includes('security check') ||
            bodyText.includes('access denied')) {
            throw new Error('Site is blocking automated access. Please try a different listing or enter details manually.');
        }
        
        console.log(`[Extraction] Extracting data...`);
        
        // Extract data
        const extractedData = await extractPropertyData(page, source);
        
        console.log(`[Extraction] Raw data extracted:`, {
            address: extractedData.address ? extractedData.address.substring(0, 50) : 'none',
            price: extractedData.price,
            images: extractedData.images.length
        });
        
        // Parse and normalize data
        const parsedData = parseData(extractedData);
        
        console.log(`[Extraction] Parsed data:`, {
            address: parsedData.address,
            city: parsedData.city,
            price: parsedData.price,
            images: parsedData.images.length
        });
        
        // Validate we got meaningful data
        if (!parsedData.address && !parsedData.price) {
            throw new Error('Could not extract listing data. The page structure may not be supported.');
        }
        
        return {
            success: true,
            source: source,
            data: parsedData
        };
        
    } catch (error) {
        console.error(`[Extraction] Error:`, error.message);
        return {
            success: false,
            error: error.message
        };
    } finally {
        if (browser) {
            await browser.close();
            console.log(`[Extraction] Browser closed`);
        }
    }
}

module.exports = {
    extractListing
};
