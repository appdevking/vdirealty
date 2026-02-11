/**
 * Global Configuration for VDI Realty FSBO
 * 
 * CHANGE THIS URL when deploying the backend to a live server.
 * Local development: 'http://localhost:3000'
 * Production example: 'https://api.vdirealty.com' or 'https://vdi-realty-backend.render.com'
 */
const CONFIG = {
    // API_BASE_URL: 'http://localhost:3000' // Uncomment for local development
    API_BASE_URL: 'https://vdi-storage-production.up.railway.app' // Change this to your production backend URL when deploying
};

// Prevent modification
Object.freeze(CONFIG);
