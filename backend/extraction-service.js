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
                console.log(`🔍 Trying selector: "${selector}"`);
                
                // Handle :contains pseudo-selectors for Home Facts targeting
                if (selector.includes(':contains')) {
                    const [baseSelector, containsPart] = selector.split(':contains');
                    const searchText = containsPart.replace(/[()'"]/g, '').trim();
                    const elements = document.querySelectorAll(baseSelector || 'dt');
                    
                    for (const el of elements) {
                        if (el.textContent && el.textContent.toLowerCase().includes(searchText.toLowerCase())) {
                            console.log(`✅ Found element containing "${searchText}": "${el.textContent.trim()}"`);
                            
                            // Look for the next sibling (dd element in definition lists)
                            let nextEl = el.nextElementSibling;
                            if (nextEl) {
                                console.log(`✅ Found next sibling: "${nextEl.textContent.trim()}"`);
                                return nextEl.textContent.trim();
                            }
                            
                            // If no next sibling, return the element's own text (extract numbers from it)
                            const numberMatch = el.textContent.match(/(\d+\.?\d*)/);
                            if (numberMatch) {
                                console.log(`✅ Extracted number from text: ${numberMatch[1]}`);
                                return numberMatch[1];
                            }
                            
                            return el.textContent.trim();
                        }
                    }
                    console.log(`❌ No element found containing "${searchText}"`);
                } else if (selector.includes(':has')) {
                    // Handle :has pseudo-selectors (not fully supported, so skip)
                    console.log(`⚠️ Skipping :has selector (not fully supported): "${selector}"`);
                } else {
                    // Regular CSS selector
                    const el = document.querySelector(selector);
                    if (el && el.textContent && el.textContent.trim()) {
                        console.log(`✅ Selector "${selector}" found: "${el.textContent.trim()}"`);
                        return el.textContent.trim();
                    }
                    console.log(`❌ Selector "${selector}" not found or empty`);
                }
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
                    // Target Home Facts section specifically for Bedrooms
                    'dt:contains("Bedrooms") + dd',
                    'dt:contains("Bedroom") + dd', 
                    '.c21__DetailAccordionItem dt:contains("Bedrooms") + dd',
                    '.c21__DetailAccordionItem dt:contains("Bedroom") + dd',
                    
                    // Alternative structured data patterns
                    'li:has(span:contains("Bedrooms")) span:last-child',
                    'li:has(span:contains("Bedroom")) span:last-child',
                    'div:has(.label:contains("Bedrooms")) .value',
                    'div:has(.label:contains("Bedroom")) .value',
                    
                    // Previous fallback selectors
                    'li[data-test="property-bedroom"] .Text--numbers',
                    'li[data-test="property-bedroom"] span',
                    '.c21__DetailFactsCallout li:first-child span'
                ],
                baths: [
                    // Target Home Facts section specifically for Bathrooms
                    'dt:contains("Total bathrooms") + dd',
                    'dt:contains("Total bathroom") + dd',
                    'dt:contains("Bathrooms") + dd', 
                    'dt:contains("Bathroom") + dd',
                    '.c21__DetailAccordionItem dt:contains("Total bathrooms") + dd',
                    '.c21__DetailAccordionItem dt:contains("Bathrooms") + dd',
                    
                    // Alternative structured data patterns
                    'li:has(span:contains("Total bathrooms")) span:last-child',
                    'li:has(span:contains("Bathrooms")) span:last-child',
                    'div:has(.label:contains("Bathrooms")) .value',
                    'div:has(.label:contains("Total bathrooms")) .value',
                    
                    // Previous fallback selectors
                    'li[data-test="property-bathroom"] .Text--numbers',
                    'li[data-test="property-bathroom"] span',
                    '.c21__DetailFactsCallout li:nth-child(2) span'
                ],
                sqft: [
                    // Target Home Facts section specifically for Living area
                    'dt:contains("Living area") + dd',
                    'dt:contains("Building area") + dd',
                    'dt:contains("Square") + dd',
                    '.c21__DetailAccordionItem dt:contains("Living area") + dd',
                    '.c21__DetailAccordionItem dt:contains("Building area") + dd',
                    
                    // Alternative structured data patterns
                    'li:has(span:contains("Living area")) span:last-child',
                    'li:has(span:contains("Building area")) span:last-child', 
                    'div:has(.label:contains("Living area")) .value',
                    'div:has(.label:contains("Building area")) .value',
                    
                    // Previous fallback selectors
                    'li[data-test="property-sqft"] .Text--numbers',
                    'li[data-test="property-sqft"] span',
                    '.c21__DetailFactsCallout li:last-child span'
                ],
                description: [
                    '.c21__DetailDescription p',
                    '.c21__DetailDescription',
                    '.property-description',
                    '.listing-description',
                    '.description',
                    'div[class*="description"]'
                ],
                mls: [
                    // Target MLS number in listing details section
                    'dt:contains("MLS") + dd',
                    'dt:contains("MLS#") + dd', 
                    'dt:contains("MLS Number") + dd',
                    '.c21__DetailAccordionItem dt:contains("MLS") + dd',
                    'li:has(span:contains("MLS")) span:last-child',
                    'div:has(.label:contains("MLS")) .value',
                    'span[class*="mls"]',
                    'div[class*="mls"]'
                ]
            },
            universal: {
                address: ['h1', 'h1.address', '.property-address', '.listing-address', '[itemprop="address"]', '.street-address'],
                price: ['.price', '.property-price', '.listing-price', '[itemprop="price"]', 'span[class*="price"]', 'div[class*="price"]'],
                beds: ['.beds', '.bedrooms', '[data-beds]', 'span[class*="bed"]', 'div[class*="bed"]'],
                baths: ['.baths', '.bathrooms', '[data-baths]', 'span[class*="bath"]', 'div[class*="bath"]'],
                sqft: ['.sqft', '.square-feet', '[data-sqft]', 'span[class*="sqft"]', 'span[class*="sq-ft"]'],
                description: ['.description', '.property-description', '.listing-description', '.remarks', 'div[class*="description"]'],
                mls: ['.mls', '.mls-number', '[data-mls]', 'span[class*="mls"]', 'div[class*="mls"]', '.listing-id', '.property-id']
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
            mls: getTextFromSelectors(siteSelectors.mls),
            images: images.slice(0, 15) // Get more images
        };

        // If primary selectors failed, try broad text scanning as fallback
        console.log('🔍 Checking if fallback scanning is needed...');
        
        if (!extractedData.beds || extractedData.beds === '') {
            console.log('🔍 Primary bed selectors failed, trying Home Facts text scanning...');
            
            // First, try to find Home Facts section by searching for elements containing "Home facts"
            let homeFactsSection = null;
            const allElements = document.querySelectorAll('*');
            for (const el of allElements) {
                if (el.textContent && el.textContent.toLowerCase().includes('home facts')) {
                    homeFactsSection = el;
                    break;
                }
            }
            
            // Also try common section selectors
            if (!homeFactsSection) {
                homeFactsSection = document.querySelector('.c21__DetailAccordionItem, .property-details, .home-facts, .property-facts');
            }
            
            const scanText = homeFactsSection ? homeFactsSection.textContent : document.body.textContent;
            console.log('📍 Scanning text source:', homeFactsSection ? 'Home Facts section found' : 'full page fallback');
            
            // Look for structured patterns like "Bedrooms: 1" or "Bedrooms 1"
            const bedPatterns = [
                /Bedrooms?\s*:?\s*(\d+)/gi,
                /(\d+)\s+Beds?\b/gi,
                /(\d+)\s+BR\b/gi,
                /(\d+)\s+Bedrooms?\b/gi
            ];
            
            let foundBeds = '';
            for (const pattern of bedPatterns) {
                const matches = [...scanText.matchAll(pattern)];
                for (const match of matches) {
                    const beds = parseInt(match[1]);
                    // Validate: reasonable range for bedrooms (0-10)
                    if (beds >= 0 && beds <= 10) {
                        foundBeds = beds.toString();
                        console.log(`✅ Found beds in structured data: "${match[0]}" -> ${beds}`);
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
            console.log('🔍 Primary bath selectors failed, trying Home Facts text scanning...');
            
            // Find Home Facts section
            let homeFactsSection = null;
            const allElements = document.querySelectorAll('*');
            for (const el of allElements) {
                if (el.textContent && el.textContent.toLowerCase().includes('home facts')) {
                    homeFactsSection = el;
                    break;
                }
            }
            
            if (!homeFactsSection) {
                homeFactsSection = document.querySelector('.c21__DetailAccordionItem, .property-details, .home-facts, .property-facts');
            }
            
            const scanText = homeFactsSection ? homeFactsSection.textContent : document.body.textContent;
            console.log('🚿 Scanning text source:', homeFactsSection ? 'Home Facts section found' : 'full page fallback');
            
            // Look for structured patterns like "Total bathrooms: 1" or "Bathrooms: 1"
            const bathPatterns = [
                /Total\s+bathrooms?\s*:?\s*(\d+(?:\.\d+)?)/gi,
                /Bathrooms?\s*:?\s*(\d+(?:\.\d+)?)/gi,
                /(\d+(?:\.\d+)?)\s+Baths?\b/gi,
                /(\d+(?:\.\d+)?)\s+BA\b/gi,
                /(\d+(?:\.\d+)?)\s+Bathrooms?\b/gi
            ];
            
            let foundBaths = '';
            for (const pattern of bathPatterns) {
                const matches = [...scanText.matchAll(pattern)];
                for (const match of matches) {
                    const baths = parseFloat(match[1]);
                    // Validate: reasonable range for bathrooms (0-20, allow decimals)
                    if (baths >= 0 && baths <= 20) {
                        foundBaths = baths.toString();
                        console.log(`✅ Found baths in structured data: "${match[0]}" -> ${baths}`);
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
            console.log('🔍 Primary sqft selectors failed, trying Home Facts text scanning...');
            
            // Find Home Facts section
            let homeFactsSection = null;
            const allElements = document.querySelectorAll('*');
            for (const el of allElements) {
                if (el.textContent && el.textContent.toLowerCase().includes('home facts')) {
                    homeFactsSection = el;
                    break;
                }
            }
            
            if (!homeFactsSection) {
                homeFactsSection = document.querySelector('.c21__DetailAccordionItem, .property-details, .home-facts, .property-facts');
            }
            
            const scanText = homeFactsSection ? homeFactsSection.textContent : document.body.textContent;
            console.log('📐 Scanning text source:', homeFactsSection ? 'Home Facts section found' : 'full page fallback');
            
            // Look for structured patterns like "Living area: 545 sq. ft."
            const sqftPatterns = [
                /Living\s+area\s*:?\s*(\d{2,6})(?:\s*sq\.?\s*ft\.?)?/gi,
                /Square\s+Foot(?:age)?\s*:?\s*(\d{2,6})/gi,
                /Total\s+square\s+feet?\s*:?\s*(\d{2,6})/gi,
                /(\d{2,6})[\s\-]*(?:sq\.?\s*ft\.?|square\s*feet?|sqft)\b/gi,
                /(\d{2,6})\s+(?:SF|sq)\b/gi,
                /(?:sq\.?\s*ft\.?|square\s*feet?|sqft)[\s:]+(\d{2,6})/gi
            ];
            
            let foundSqft = '';
            const potentialMatches = [];
            
            for (const pattern of sqftPatterns) {
                const matches = [...scanText.matchAll(pattern)];
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
                    console.log(`✅ Found sqft in structured data: "${match.text}" -> ${match.sqft}`);  
                    break;
                } else {
                    console.log(`❌ Rejected unrealistic sqft: ${match.sqft} from "${match.text}"`);
                }
            }
            
            extractedData.sqft = foundSqft;
        }
        
        // Extract MLS number if not found by selectors
        if (!extractedData.mls || extractedData.mls === '') {
            console.log('🔍 Primary MLS selectors failed, trying text scanning...');
            
            const scanText = document.body.textContent || '';
            
            // Look for patterns like "MLS#:2479516", "MLS: 2479516", "MLS Number: 2479516"
            const mlsPatterns = [
                /MLS\s*#?\s*:?\s*([A-Z0-9\-]+)/gi,
                /MLS\s+Number\s*:?\s*([A-Z0-9\-]+)/gi,
                /Listing\s+ID\s*:?\s*([A-Z0-9\-]+)/gi,
                /Property\s+ID\s*:?\s*([A-Z0-9\-]+)/gi
            ];
            
            let foundMls = '';
            for (const pattern of mlsPatterns) {
                const match = scanText.match(pattern);
                if (match && match[1]) {
                    // Validate: should be alphanumeric and reasonable length (4-15 chars)
                    const mls = match[1].trim();
                    if (mls.length >= 4 && mls.length <= 15 && /^[A-Z0-9\-]+$/i.test(mls)) {
                        foundMls = mls;
                        console.log(`✅ Found MLS via text scanning: "${match[0]}" -> ${mls}`);
                        break;
                    } else {
                        console.log(`❌ Rejected invalid MLS format: ${mls} from "${match[0]}"`);
                    }
                }
            }
            extractedData.mls = foundMls;
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
        mls: '',
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

    // Parse MLS with validation
    if (extractedData.mls) {
        console.log(`🏷️ Raw MLS text: "${extractedData.mls}"`);
        // Clean up MLS number - remove any extra characters
        let cleanMls = extractedData.mls.replace(/[^A-Z0-9\-]/gi, '').toUpperCase();
        
        // Validate: should be alphanumeric with optional hyphens, reasonable length (4-15 chars)
        if (cleanMls.length >= 4 && cleanMls.length <= 15 && /^[A-Z0-9\-]+$/.test(cleanMls)) {
            parsed.mls = cleanMls;
            console.log(`🏷️ Valid MLS: ${cleanMls}`);
        } else {
            console.log(`⚠️ Rejected invalid MLS format: ${cleanMls}`);
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
