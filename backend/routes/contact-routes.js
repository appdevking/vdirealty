const express = require('express');
const { sendContactEmail } = require('../email-service');
const { statements } = require('../database');
const config = require('../config');

const router = express.Router();

// Admin auth (mirrors fsbo-routes): Authorization header must equal admin password
const adminAuth = (req, res, next) => {
    const password = req.headers.authorization;
    if (password && password === config.adminPassword) {
        next();
    } else {
        res.status(401).json({ error: 'Unauthorized' });
    }
};

// Submit contact form
router.post('/submit', async (req, res) => {
    try {
        const { name, email, phone, interest, message } = req.body;
        
        // Validate required fields
        if (!name || !email || !message) {
            return res.status(400).json({ 
                success: false,
                error: 'Missing required fields: name, email, and message are required' 
            });
        }
        
        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ 
                success: false,
                error: 'Invalid email address' 
            });
        }
        
        // Prepare contact data
        const contactData = {
            name,
            email,
            phone: phone || 'Not provided',
            interest: interest || 'General Inquiry',
            message,
            submittedAt: new Date().toISOString()
        };

        // Store in database so submissions are retrievable even when email is down
        try {
            statements.insertContactSubmission.run(
                name,
                email,
                phone || null,
                interest || 'General Inquiry',
                req.body.property || null,
                message
            );
        } catch (dbError) {
            console.error('Failed to store contact submission:', dbError.message);
        }
        
        // Send email to admin only if email credentials are configured
        const hasEmailConfig = (config.email.user && config.email.password) || config.email.sendgridApiKey;
        if (hasEmailConfig) {
            try {
                await sendContactEmail(contactData);
                console.log(`✅ Contact email sent to ${config.adminEmail}`);
            } catch (emailError) {
                console.error('Failed to send contact email:', emailError.message);
                // Continue anyway - don't fail the submission
            }
        } else {
            console.log('⚠️ Email not configured - contact form data logged only');
            console.log('Contact submission:', contactData);
        }
        
        res.json({
            success: true,
            message: 'Thank you for contacting us! We will get back to you soon.'
        });
        
    } catch (error) {
        console.error('Error processing contact form:', error);
        res.status(500).json({ 
            success: false,
            error: 'Failed to process contact form. Please try again later.' 
        });
    }
});

// Admin: all contact-form submissions, newest first
router.get('/admin/submissions', adminAuth, (req, res) => {
    try {
        const submissions = statements.getAllContactSubmissions.all();
        res.json({ success: true, count: submissions.length, submissions });
    } catch (error) {
        console.error('[API] Error fetching contact submissions:', error);
        res.status(500).json({ error: 'Failed to fetch submissions' });
    }
});

// Admin: mark a contact submission contacted
router.post('/admin/submissions/:id/contacted', adminAuth, (req, res) => {
    try {
        statements.markContactSubmissionContacted.run(parseInt(req.params.id, 10) || 0);
        res.json({ success: true, message: 'Submission marked as contacted.' });
    } catch (error) {
        console.error('[API] Error marking submission contacted:', error);
        res.status(500).json({ error: 'Failed to update submission' });
    }
});

module.exports = router;
