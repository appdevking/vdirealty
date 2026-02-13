/**
 * Global Configuration for VDI Realty FSBO
 * 
 * CHANGE THIS URL when deploying the backend to a live server.
 * Local development: 'http://localhost:3000'
 * Production example: 'https://api.vdirealty.com' or 'https://vdi-realty-backend.render.com'
 */
const CONFIG = {
    // API_BASE_URL: 'http://localhost:3000' // Uncomment for local development
    API_BASE_URL: 'http://52.14.248.239' // AWS EC2 backend (migration from Railway completed Feb 13, 2026)
};

// Prevent modification
Object.freeze(CONFIG);
