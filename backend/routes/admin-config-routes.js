const express = require('express');
const https = require('https');
const config = require('../config');
const { statements } = require('../database');
const emailService = require('../email-service');

const router = express.Router();

// Admin authentication middleware.
// Same shared-password-header scheme as the other admin routes: the raw
// ADMIN_PASSWORD value in the HTTP Authorization header (not Bearer).
const adminAuth = (req, res, next) => {
    const password = req.headers.authorization;
    if (password && password === config.adminPassword) {
        next();
    } else {
        res.status(401).json({ error: 'Unauthorized' });
    }
};

// Validate a SendGrid API key with a read-only scopes call.
// Resolves true only when SendGrid accepts the key.
const validateSendgridKey = (key) => new Promise((resolve) => {
    const req = https.request(
        {
            hostname: 'api.sendgrid.com',
            path: '/v3/scopes',
            method: 'GET',
            headers: { Authorization: `Bearer ${key}` },
            timeout: 10000
        },
        (res) => {
            res.resume();
            resolve(res.statusCode === 200);
        }
    );
    req.on('error', () => resolve(false));
    req.on('timeout', () => {
        req.destroy();
        resolve(false);
    });
    req.end();
});

// GET /api/admin/email-config — email status (never exposes the key)
router.get('/email-config', adminAuth, (req, res) => {
    res.json({ success: true, email: emailService.getEmailStatus() });
});

// POST /api/admin/email-config — store the SendGrid API key.
// Body: { "sendgridApiKey": "SG...." }
// The key is validated against SendGrid before it is stored, and the mailer
// is re-initialized so it takes effect without a server restart.
router.post('/email-config', adminAuth, async (req, res) => {
    try {
        const rawKey = req.body && req.body.sendgridApiKey;
        const sendgridApiKey = typeof rawKey === 'string' ? rawKey.trim() : '';
        if (!sendgridApiKey || !sendgridApiKey.startsWith('SG.')) {
            return res.status(400).json({
                success: false,
                error: 'A SendGrid API key starting with "SG." is required'
            });
        }

        const valid = await validateSendgridKey(sendgridApiKey);
        if (!valid) {
            return res.status(400).json({
                success: false,
                error: 'SendGrid rejected this API key — check it and try again'
            });
        }

        statements.setSetting.run('sendgrid_api_key', sendgridApiKey);
        emailService.initializeTransporter();
        console.log('✅ SendGrid API key updated via admin API');

        res.json({
            success: true,
            message: 'SendGrid API key saved and mailer re-initialized',
            email: emailService.getEmailStatus()
        });
    } catch (error) {
        console.error('Error saving email config:', error.message);
        res.status(500).json({ success: false, error: 'Failed to save email config' });
    }
});

module.exports = router;
