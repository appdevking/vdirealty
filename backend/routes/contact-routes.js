const express = require('express');
const { sendContactEmail } = require('../email-service');
const config = require('../config');

const router = express.Router();

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
        
        // Send email to admin only if email credentials are configured
        if (config.email.user && config.email.password) {
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

module.exports = router;
