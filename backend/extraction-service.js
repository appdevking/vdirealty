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
    return await page.evaluate((src) => {
        // Helper function to try multiple selectors
        const getTextFromSelectors = (selectors) => {
            for (const selector of selectors) {
                const el = document.querySelector(selector);
                if (el && el.textContent.trim()) {
                    console.log(`✅ Selector "${selector}" found: "${el.textContent.trim()}"`);
                    return el.textContent.trim();
                }
                console.log(`❌ Selector "${selector}" not found or empty`);
            }
            return '';
        };

        // Source-specific selectors (more targeted)
        const selectors = {
            zillow: {
                address: ['h1[data-test="home-details-summary-headline"]', 'h1.ds-address-container', 'h1[class*="summary-address"]'],
                price: ['span[data-test="property-floorplan-price"]', 'span.ds-price', 'div[data-testid="price"]', 'span[class*="price"]'],
                beds: ['span[data-testid="bed-count"]', 'span.Text-c11n-8-84-3__sc-aiai24-0[class*="bed"]'],
                baths: ['span[data-testid="bath-count"]', 'span.Text-c11n-8-84-3__sc-aiai24-0[class*="bath"]'],
                sqft: ['span[data-testid="sqft-value"]', 'span.Text-c11n-8-84-3__sc-aiai24-0[class*="sqft"]'],
                description: ['div[data-testid="description"]', 'div.ds-home-facts-and-features']
            },
            realtor: {
                address: ['h1[data-testid="property-street"]', 'h1.address', 'h1[class*="address"]'],
                price: ['div[data-testid="price"]', 'span[data-label="pc-price"]', 'div[class*="price"]'],
               beds: ['li[data-testid="property-meta-beds"]', 'span[data-label="pc-meta-beds"]'],
                baths: ['li[data-testid="property-meta-baths"]', 'span[data-label="pc-meta-baths"]'],
                sqft: ['li[data-testid="property-meta-sqft"]', 'span[data-label="pc-meta-sqft"]'],
                description: ['section[data-testid="description"]', 'div[id="ldp-detail-romance"]']
            },
            redfin: {
                address: ['h1[data-rf-test-id="abp-streetLine"]', 'div.street-address', 'h1[class*="address"]'],
                price: ['div[data-rf-test-id="abp-price"]', 'span.price', 'div.statsValue'],
                beds: ['div[data-rf-test-id="abp-beds"]', 'div[data-rf-test-name="Beds"]'],
                baths: ['div[data-rf-test-id="abp-baths"]', 'div[data-rf-test-name="Baths"]'],
                sqft: ['div[data-rf-test-id="abp-sqFt"]', 'div[data-rf-test-name="Sq. Ft."]', 'span.sqft-value'],
                description: ['div[data-rf-test-id="abp-description"]', 'div.remarks']
            },
            century21: {
                address: [
                    'h1.c21__DetailMasthead-address', 
                    'h1[class*="DetailMasthead-address"]',
                    'h1[class*="address"]', 
                    '.property-address',
                    'address',
                    'h1'
                ],
                price: [
                    // Look for detailed/exact price first
                    '.c21__DetailMasthead-price .Text--decorativePrice', 
                    '.c21__DetailMasthead-price span[class*="price"]:not([class*="sub"])',
                    'div[class*="DetailMasthead-price"] span[class*="decorativePrice"]',
                    'div[class*="DetailMasthead-price"] span[class*="Text--decorativePrice"]',
                    'h2[class*="price"]:not([class*="sub"]):not([class*="summary"])',
                    // Fallback to any price display
                    'div[class*="DetailMasthead-price"] span',
                    'div[class*="price"] span[class*="decorative"]',
                    '.price-display .price-value',
                    'span[class*="Price"]:not([class*="sub"])',
                    '.price',
                    'h2[class*="price"]'
                ],
                beds: [
                    // Primary selectors - look for specific bedroom data
                    'li[data-test="property-bedroom"] .Text--numbers',
                    'li[data-test="property-bedroom"] span', 
                    '.c21__DetailFactsCallout span.Text--numbers:first-of-type',
                    // Fallback selectors
                    '.c21__DetailFactsCallout li:first-child .Text--numbers',
                    '.c21__DetailFactsCallout li:first-child span',
                    '.property-facts .bedroom-count',
                    '.bed-count .number',
                    'span[class*="bedroom"]',
                    // Generic patterns that might work
                    '[class*="bedroom"] span',
                    '[class*="bed"] span[class*="number"]'
                ],
                baths: [
                    // Primary selectors - look for specific bathroom data  
                    'li[data-test="property-bathroom"] .Text--numbers',
                    'li[data-test="property-bathroom"] span',
                    '.c21__DetailFactsCallout span.Text--numbers:nth-of-type(2)',
                    // Fallback selectors
                    '.c21__DetailFactsCallout li:nth-child(2) .Text--numbers', 
                    '.c21__DetailFactsCallout li:nth-child(2) span',
                    '.property-facts .bathroom-count', 
                    '.bath-count .number',
                    'span[class*="bathroom"]',
                    // Generic patterns that might work
                    '[class*="bathroom"] span',
                    '[class*="bath"] span[class*="number"]'
                ],
                sqft: [
                    // Primary selectors - look for specific sqft data
                    'li[data-test="property-sqft"] .Text--numbers',
                    'li[data-test="property-sqft"] span',
                    '.c21__DetailFactsCallout span.Text--numbers:last-of-type',
                    // Fallback selectors
                    '.c21__DetailFactsCallout li:last-child .Text--numbers',
                    '.c21__DetailFactsCallout li:last-child span',
                    '.property-facts .sqft-count',
                    '.sqft-count .number', 
                    'span[class*="sqft"]',
                    'span[class*="square"]',
                    // Generic patterns that might work
                    '[class*="sqft"] span',
                    '[class*="square"] span[class*="number"]'
                ],
                description: [
                    '.c21__DetailDescription p',
                    '.c21__DetailDescription',
                    '.property-description',
                    '.listing-description',
                    '.description',
                    'div[class*="description"]'
                ]
            },
            universal: {
                address: ['h1', 'h1.address', '.property-address', '.listing-address', '[itemprop="address"]', '.street-address'],
                price: ['.price', '.property-price', '.listing-price', '[itemprop="price"]', 'span[class*="price"]', 'div[class*="price"]'],
                beds: ['.beds', '.bedrooms', '[data-beds]', 'span[class*="bed"]', 'div[class*="bed"]'],
                baths: ['.baths', '.bathrooms', '[data-baths]', 'span[class*="bath"]', 'div[class*="bath"]'],
                sqft: ['.sqft', '.square-feet', '[data-sqft]', 'span[class*="sqft"]', 'span[class*="sq-ft"]'],
                description: ['.description', '.property-description', '.listing-description', '.remarks', 'div[class*="description"]']
            }
        };

        // Choose selectors based on source
        const siteSelectors = selectors[src] || selectors.universal;

        // Extract images
        const images = [];
        const seenUrls = new Set();
        
        // Look for images in multiple ways
        const imageSelectors = [
            'img[src*="photos"]',
            'img[src*="images"]',
            'img[src*="listing"]',
            'img[src*="property"]',
            'picture img',
            'div[class*="photo"] img',
            'div[class*="image"] img',
            'div[class*="gallery"] img',
            'img[alt*="photo"]',
            'img'
        ];

        imageSelectors.forEach(selector => {
            document.querySelectorAll(selector).forEach(img => {
                let src = img.src || img.getAttribute('data-src') || img.getAttribute('data-lazy') || 
                         img.getAttribute('data-original') || img.getAttribute('data-srcset');
                
                if (!src && img.srcset) {
                    const sources = img.srcset.split(',').map(s => s.trim().split(' ')[0]);
                    src = sources[sources.length - 1];
                }
                
                if (src && !seenUrls.has(src)) {
                    const isLogo = src.toLowerCase().includes('logo') || 
                                  src.toLowerCase().includes('icon') ||
                                  src.toLowerCase().includes('avatar') ||
                                  img.alt?.toLowerCase().includes('logo') || 
                                  img.alt?.toLowerCase().includes('icon');
                    
                    const width = parseInt(img.getAttribute('width')) || img.width || 0;
                    const height = parseInt(img.getAttribute('height')) || img.height || 0;
                    
                    // Only include larger images that look like property photos
                    if (src.match(/^https?:\/\//i) && !isLogo && (width === 0 || width > 300) && (height === 0 || height > 200)) {
                        images.push(src);
                        seenUrls.add(src);
                    }
                }
            });
        });

        // Return extracted data
        return {
            address: getTextFromSelectors(siteSelectors.address),
            price: getTextFromSelectors(siteSelectors.price),
            beds: getTextFromSelectors(siteSelectors.beds),
            baths: getTextFromSelectors(siteSelectors.baths),
            sqft: getTextFromSelectors(siteSelectors.sqft),
            description: getTextFromSelectors(siteSelectors.description),
            images: images.slice(0, 15) // Get more images
        };
    }, source);
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
        console.log(`🏷️ Raw price text: "${extractedData.price}"`);
        
        let priceValue = '';
        
        // Handle abbreviated formats like "180K", "1.5M", "1,500K"
        const abbreviatedMatch = extractedData.price.match(/\$?([\d,]+\.?\d*)\s*([KMB])/i);
        if (abbreviatedMatch) {
            const number = parseFloat(abbreviatedMatch[1].replace(/,/g, ''));
            const multiplier = abbreviatedMatch[2].toUpperCase();
            
            let fullPrice = number;
            if (multiplier === 'K') {
                fullPrice = number * 1000;
            } else if (multiplier === 'M') {
                fullPrice = number * 1000000;
            } else if (multiplier === 'B') {
                fullPrice = number * 1000000000;
            }
            
            priceValue = Math.round(fullPrice).toString();
            console.log(`🏷️ Converted abbreviated price "${extractedData.price}" to: ${priceValue}`);
        } else {
            // Handle full numeric prices like "$179,900" or "179900"
            const fullPriceMatch = extractedData.price.match(/\$?([\d,]+\.?\d*)/);
            if (fullPriceMatch) {
                priceValue = fullPriceMatch[1].replace(/,/g, '').replace(/\..*/, ''); // Remove commas and decimals
                console.log(`🏷️ Extracted full price "${extractedData.price}" as: ${priceValue}`);
            }
        }
        
        // Final validation - ensure it's a valid number
        if (priceValue && !isNaN(priceValue) && parseInt(priceValue) > 0) {
            parsed.price = priceValue;
        } else {
            console.log(`⚠️ Could not parse price from: "${extractedData.price}"`);
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
        
        // Navigate to page with longer timeout and different wait strategy
        try {
            await page.goto(url, {
                waitUntil: 'domcontentloaded', // Less strict than networkidle2
                timeout: 60000 // 60 seconds
            });
        } catch (navError) {
            console.log(`[Extraction] Navigation warning: ${navError.message}, continuing anyway...`);
            // Some sites have resources that timeout but page still loads
        }
        
        console.log(`[Extraction] Page loaded, waiting for content...`);
        
        // Wait for page to settle
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Scroll to trigger lazy loading
        try {
            await page.evaluate(async () => {
                await new Promise((resolve) => {
                    let totalHeight = 0;
                    const distance = 300;
                    const timer = setInterval(() => {
                        const scrollHeight = document.body.scrollHeight;
                        window.scrollBy(0, distance);
                        totalHeight += distance;

                        if (totalHeight >= scrollHeight){
                            clearInterval(timer);
                            window.scrollTo(0, 0); // Scroll back to top
                            setTimeout(resolve, 1000);
                        }
                    }, 100);
                });
            });
        } catch (scrollError) {
            console.log(`[Extraction] Scroll failed, continuing...`);
        }
        
        console.log(`[Extraction] Content loaded, waiting additional time...`);
        await new Promise(resolve => setTimeout(resolve, 2000));
        
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
            return {
                success: false,
                error: 'Could not extract listing data from this page. The page structure may not be supported yet. Please enter details manually.'
            };
        }
        
        return {
            success: true,
            source: source,
            data: parsedData
        };
        
    } catch (error) {
        console.error(`[Extraction] Error:`, error.message);
        
        // Provide more specific error messages
        let errorMessage = 'Failed to extract listing data.';
        
        if (error.message.includes('timeout')) {
            errorMessage = 'The website took too long to load. Please try a different listing or enter details manually.';
        } else if (error.message.includes('net::ERR_')) {
            errorMessage = 'Could not connect to the website. Please check the URL and try again.';
        } else if (error.message.includes('blocking')) {
            errorMessage = 'This website is blocking automated access. Please try a different listing or enter details manually.';
        }
        
        return {
            success: false,
            error: errorMessage
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
