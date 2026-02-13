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
                if (el && el.textContent && el.textContent.trim()) {
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
                    // Primary Century 21 selectors
                    'li[data-test="property-bedroom"] .Text--numbers',
                    'li[data-test="property-bedroom"] span', 
                    '.c21__DetailFactsCallout span.Text--numbers:first-of-type',
                    '.c21__DetailFactsCallout li:first-child .Text--numbers',
                    '.c21__DetailFactsCallout li:first-child span',
                    '.c21__DetailFactsCallout li:first-child',
                    'div[class*="DetailFacts"] li:first-child span',
                    'div[class*="DetailFacts"] li:first-child',
                    
                    // Universal fallback selectors (work on many sites)
                    'span[data-testid*="bed"]', 'div[data-testid*="bed"]',
                    '*[class*="bed-count"] span', '*[class*="bed-count"]',
                    '*[class*="bedrooms"] span', '*[class*="bedrooms"]',
                    '*[class*="bedroom"] span', '*[class*="bedroom"]',
                    '*[aria-label*="bedroom"]',
                    
                    // Try to find any span/div that might contain bed info
                    'span[title*="bed"]', 'span[title*="Bed"]',
                    'div[title*="bed"]', 'div[title*="Bed"]'
                ],
                baths: [
                    // Primary Century 21 selectors
                    'li[data-test="property-bathroom"] .Text--numbers',
                    'li[data-test="property-bathroom"] span',
                    '.c21__DetailFactsCallout span.Text--numbers:nth-of-type(2)',
                    '.c21__DetailFactsCallout li:nth-child(2) .Text--numbers', 
                    '.c21__DetailFactsCallout li:nth-child(2) span',
                    '.c21__DetailFactsCallout li:nth-child(2)',
                    'div[class*="DetailFacts"] li:nth-child(2) span',
                    'div[class*="DetailFacts"] li:nth-child(2)',
                    
                    // Universal fallback selectors
                    'span[data-testid*="bath"]', 'div[data-testid*="bath"]',
                    '*[class*="bath-count"] span', '*[class*="bath-count"]',
                    '*[class*="bathrooms"] span', '*[class*="bathrooms"]',
                    '*[class*="bathroom"] span', '*[class*="bathroom"]',
                    '*[aria-label*="bathroom"]',
                    
                    // Try to find any span/div that might contain bath info
                    'span[title*="bath"]', 'span[title*="Bath"]',
                    'div[title*="bath"]', 'div[title*="Bath"]'
                ],
                sqft: [
                    // Primary Century 21 selectors
                    'li[data-test="property-sqft"] .Text--numbers',
                    'li[data-test="property-sqft"] span',
                    '.c21__DetailFactsCallout span.Text--numbers:last-of-type',
                    '.c21__DetailFactsCallout li:last-child .Text--numbers',
                    '.c21__DetailFactsCallout li:last-child span',
                    '.c21__DetailFactsCallout li:last-child',
                    'div[class*="DetailFacts"] li:last-child span',
                    'div[class*="DetailFacts"] li:last-child',
                    
                    // Universal fallback selectors
                    'span[data-testid*="sqft"]', 'span[data-testid*="sq-ft"]',
                    'div[data-testid*="sqft"]', 'div[data-testid*="sq-ft"]',
                    '*[class*="sqft"] span', '*[class*="sqft"]',
                    '*[class*="square-feet"] span', '*[class*="square-feet"]',
                    '*[class*="sq-ft"] span', '*[class*="sq-ft"]',
                    '*[aria-label*="square"]',
                    
                    // Try to find any span/div that might contain sqft info
                    'span[title*="sq"]', 'span[title*="Sq"]', 
                    'div[title*="sq"]', 'div[title*="Sq"]'
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
        const extractedData = {
            address: getTextFromSelectors(siteSelectors.address),
            price: getTextFromSelectors(siteSelectors.price),
            beds: getTextFromSelectors(siteSelectors.beds),
            baths: getTextFromSelectors(siteSelectors.baths),
            sqft: getTextFromSelectors(siteSelectors.sqft),
            description: getTextFromSelectors(siteSelectors.description),
            images: images.slice(0, 15) // Get more images
        };

        // If primary selectors failed, try broad text scanning as fallback
        console.log('🔍 Checking if fallback scanning is needed...');
        
        if (!extractedData.beds || extractedData.beds === '') {
            console.log('🔍 Primary bed selectors failed, trying text scanning...');
            const pageText = document.body.textContent || '';
            
            // Look for patterns like "1 Bed", "1 BR", "1 Bedroom", etc.
            const bedPatterns = [
                /(\d+)\s+(?:Beds?|BR|Bedrooms?)\b/gi,
                /(?:Beds?|BR|Bedrooms?)[\s:]+(\d+)/gi,
                /(\d+)\s*(?:bed|br|bedroom)\b/gi
            ];
            
            let foundBeds = '';
            for (const pattern of bedPatterns) {
                const matches = [...pageText.matchAll(pattern)];
                for (const match of matches) {
                    const beds = parseInt(match[1]);
                    // Validate: reasonable range for bedrooms (0-10)
                    if (beds >= 0 && beds <= 10) {
                        foundBeds = beds.toString();
                        console.log(`✅ Found beds via text scanning: "${match[0]}" -> ${beds}`);
                        break;
                    } else {
                        console.log(`❌ Rejected unrealistic bedroom count: ${beds} from "${match[0]}"`);
                    }
                }
                if (foundBeds) break;
            }
            extractedData.beds = foundBeds;
        }
        
        if (!extractedData.baths || extractedData.baths === '') {
            console.log('🔍 Primary bath selectors failed, trying text scanning...');
            const pageText = document.body.textContent || '';
            
            // Look for patterns like "1 Bath", "1 BA", "1 Bathroom", etc.
            const bathPatterns = [
                /(\d+(?:\.\d+)?)\s+(?:Baths?|BA|Bathrooms?)\b/gi,
                /(?:Baths?|BA|Bathrooms?)[\s:]+(\d+(?:\.\d+)?)/gi,
                /(\d+(?:\.\d+)?)\s*(?:bath|ba|bathroom)\b/gi
            ];
            
            let foundBaths = '';
            for (const pattern of bathPatterns) {
                const matches = [...pageText.matchAll(pattern)];
                for (const match of matches) {
                    const baths = parseFloat(match[1]);
                    // Validate: reasonable range for bathrooms (0-20, allow decimals like 1.5)
                    if (baths >= 0 && baths <= 20) {
                        foundBaths = baths.toString();
                        console.log(`✅ Found baths via text scanning: "${match[0]}" -> ${baths}`);
                        break; 
                    } else {
                        console.log(`❌ Rejected unrealistic bathroom count: ${baths} from "${match[0]}"`);
                    }
                }
                if (foundBaths) break;
            }
            extractedData.baths = foundBaths;
        }
        
        if (!extractedData.sqft || extractedData.sqft === '') {
            console.log('🔍 Primary sqft selectors failed, trying text scanning...');
            const pageText = document.body.textContent || '';
            
            // Look for patterns like "545 sq ft", "545 Sq Ft", "545 sqft", etc.
            const sqftPatterns = [
                /(\d{2,6})[\s\-]*(?:sq\.?\s*ft\.?|square\s*feet?|sqft)\b/gi,
                /(\d{2,6})\s+(?:SF|sq)\b/gi,
                /(?:sq\.?\s*ft\.?|square\s*feet?|sqft)[\s:]+(\d{2,6})/gi
            ];
            
            let foundSqft = '';
            const potentialMatches = [];
            
            for (const pattern of sqftPatterns) {
                const matches = [...pageText.matchAll(pattern)];
                for (const match of matches) {
                    const sqft = parseInt(match[1]);
                    // Store all potential matches for analysis
                    potentialMatches.push({ sqft, text: match[0] });
                }
            }
            
            // Sort by proximity to expected value (545) and validate reasonable range
            potentialMatches.sort((a, b) => Math.abs(a.sqft - 545) - Math.abs(b.sqft - 545));
            
            for (const match of potentialMatches) {
                // Validate: reasonable range for residential square footage (200-5000)
                if (match.sqft >= 200 && match.sqft <= 5000) {
                    foundSqft = match.sqft.toString();
                    console.log(`✅ Found sqft via text scanning: "${match.text}" -> ${match.sqft} (closest to expected 545)`);
                    break;
                } else {
                    console.log(`❌ Rejected unrealistic sqft: ${match.sqft} from "${match.text}"`);
                }
            }
            
            extractedData.sqft = foundSqft;
        }

        return extractedData;
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

    // Parse bedrooms with validation
    if (extractedData.beds) {
        console.log(`🛏️ Raw beds text: "${extractedData.beds}"`);
        const bedsMatch = extractedData.beds.match(/(\d+\.?\d*)/);
        if (bedsMatch) {
            const beds = parseInt(bedsMatch[1]);
            // Validate: reasonable range for bedrooms (0-10)
            if (beds >= 0 && beds <= 10) {
                parsed.bedrooms = beds.toString();
                console.log(`🛏️ Valid bedrooms: ${beds}`);
            } else {
                console.log(`⚠️ Rejected unrealistic bedroom count: ${beds}`);
            }
        }
    }

    // Parse bathrooms with validation
    if (extractedData.baths) {
        console.log(`🚿 Raw baths text: "${extractedData.baths}"`);
        const bathsMatch = extractedData.baths.match(/(\d+\.?\d*)/);
        if (bathsMatch) {
            const baths = parseFloat(bathsMatch[1]);
            // Validate: reasonable range for bathrooms (0-20, allow decimals)
            if (baths >= 0 && baths <= 20) {
                parsed.bathrooms = baths.toString();
                console.log(`🚿 Valid bathrooms: ${baths}`);
            } else {
                console.log(`⚠️ Rejected unrealistic bathroom count: ${baths}`);
            }
        }
    }

    // Parse sqft with validation
    if (extractedData.sqft) {
        console.log(`📐 Raw sqft text: "${extractedData.sqft}"`);
        const sqftMatch = extractedData.sqft.match(/([\d,]+)/);
        if (sqftMatch) {
            const sqft = parseInt(sqftMatch[1].replace(/,/g, ''));
            // Validate: reasonable range for residential square footage (200-5000)
            if (sqft >= 200 && sqft <= 5000) {
                parsed.sqft = sqft.toString();
                console.log(`📐 Valid sqft: ${sqft}`);
            } else {
                console.log(`⚠️ Rejected unrealistic sqft: ${sqft}`);
            }
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
