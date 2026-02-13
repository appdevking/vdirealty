/**
 * Global Configuration for VDI Realty FSBO
 * 
 * CHANGE THIS URL when deploying the backend to a live server.
 * Local development: 'http://localhost:3000'
 * Production example: 'https://api.vdirealty.com' or 'https://vdi-realty-backend.render.com'
 */
const CONFIG = {
    // API_BASE_URL: 'http://localhost:3000' // Uncomment for local development
    API_BASE_URL: 'https://api.vdirealty.com' // AWS EC2 backend with SSL (migration from Railway completed Feb 13, 2026)
};

// Prevent modification
Object.freeze(CONFIG);

// Export for use in HTML files
const API_BASE_URL = CONFIG.API_BASE_URL;
