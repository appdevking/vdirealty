const nodemailer = require('nodemailer');
const config = require('./config');

// Create transporter based on configuration
let transporter;
let sendgridClient;

const initializeTransporter = () => {
    if (config.email.service === 'sendgrid' && config.email.sendgridApiKey) {
        // Use SendGrid Web API for reliable email delivery
        try {
            const sgMail = require('@sendgrid/mail');
            sgMail.setApiKey(config.email.sendgridApiKey);
            sendgridClient = sgMail;
            console.log('✅ SendGrid Web API initialized');
        } catch (error) {
            console.error('⚠️ Failed to initialize SendGrid Web API:', error.message);
            console.log('Install @sendgrid/mail: npm install @sendgrid/mail');
        }
    } else if (config.email.service === 'gmail') {
        transporter = nodemailer.createTransport({
            service: 'gmail',
            // Fail fast instead of hanging the event loop when the mail
            // provider is unreachable (observed: spinning CPU + stalled requests)
            connectionTimeout: 15000,
            greetingTimeout: 10000,
            socketTimeout: 15000,
            auth: {
                user: config.email.user,
                pass: config.email.password
            }
        });
    } else {
        // Custom SMTP
        transporter = nodemailer.createTransport({
            host: config.email.host,
            port: config.email.port,
            secure: config.email.secure,
            connectionTimeout: 15000,
            greetingTimeout: 10000,
            socketTimeout: 15000,
            auth: {
                user: config.email.user,
                pass: config.email.password
            }
        });
    }
};

// Helper function to send email using SendGrid Web API or nodemailer
const sendEmail = async (mailOptions) => {
    if (sendgridClient) {
        // Use SendGrid Web API
        const msg = {
            to: mailOptions.to,
            from: config.adminEmail, // SendGrid requires verified sender
            subject: mailOptions.subject,
            html: mailOptions.html
        };
        await sendgridClient.send(msg);
    } else if (transporter) {
        // Use nodemailer
        await transporter.sendMail(mailOptions);
    } else {
        throw new Error('No email service configured');
    }
};

// Send confirmation email to seller
const sendConfirmationEmail = async (listing) => {
    const mailOptions = {
        from: `VDI Realty <${config.email.user}>`,
        to: listing.email,
        subject: 'FSBO Listing Submitted Successfully - VDI Realty',
        html: `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background: linear-gradient(135deg, #0F2027, #203A43); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
                    .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px; }
                    .info-box { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 4px; }
                    .property-details { background: white; padding: 20px; margin: 20px 0; border-radius: 8px; box-shadow: 0 2px 5px rgba(0,0,0,0.1); }
                    .detail-row { padding: 8px 0; border-bottom: 1px solid #eee; }
                    .detail-label { font-weight: bold; color: #0F2027; }
                    .button { display: inline-block; background: #C5A059; color: white; padding: 12px 30px; text-decoration: none; border-radius: 25px; margin: 20px 0; }
                    .footer { text-align: center; margin-top: 30px; color: #666; font-size: 0.9em; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>✅ Listing Submitted Successfully!</h1>
                    </div>
                    <div class="content">
                        <p>Hello ${listing.firstName},</p>
                        
                        <p>Thank you for listing your property with VDI Realty FSBO! Your listing has been submitted and will be reviewed shortly.</p>
                        
                        <div class="property-details">
                            <h3 style="margin-top: 0; color: #0F2027;">Property Details:</h3>
                            <div class="detail-row">
                                <span class="detail-label">Address:</span> ${listing.address}, ${listing.city}, ${listing.state} ${listing.zip}
                            </div>
                            <div class="detail-row">
                                <span class="detail-label">Type:</span> ${listing.propertyType}
                            </div>
                            <div class="detail-row">
                                <span class="detail-label">Price:</span> $${listing.price.toLocaleString()}
                            </div>
                            <div class="detail-row">
                                <span class="detail-label">Beds/Baths:</span> ${listing.bedrooms} bed, ${listing.bathrooms} bath
                            </div>
                            <div class="detail-row">
                                <span class="detail-label">Square Feet:</span> ${listing.sqft.toLocaleString()} sq ft
                            </div>
                        </div>
                        
                        <div class="info-box">
                            <strong>⏰ Important Information:</strong>
                            <ul style="margin: 10px 0; padding-left: 20px;">
                                <li>Your listing will be <strong>active for 14 days</strong></li>
                                <li>Expiration Date: <strong>${new Date(listing.expirationDate).toLocaleDateString()}</strong></li>
                                <li>We'll send you a reminder <strong>2 days before expiration</strong></li>
                                <li>You can <strong>relist unlimited times</strong> for free!</li>
                            </ul>
                        </div>
                        
                        <p style="margin-top: 20px;">
                            <a href="${config.websiteUrl}/fsbo-listings.html" class="button">View Your Listing</a>
                        </p>
                        
                        <p>If you have any questions, please don't hesitate to contact us.</p>
                        
                        <p>Best regards,<br><strong>VDI Realty Team</strong></p>
                    </div>
                    <div class="footer">
                        <p>&copy; ${new Date().getFullYear()} VDI Realty. All rights reserved.</p>
                        <p>Residential, Commercial & Investment Property Solutions</p>
                    </div>
                </div>
            </body>
            </html>
        `
    };

    try {
        await sendEmail(mailOptions);
        console.log(`✅ Confirmation email sent to ${listing.email}`);
        return true;
    } catch (error) {
        console.error('❌ Error sending confirmation email:', error);
        return false;
    }
};

// Send expiration reminder email
const sendReminderEmail = async (listing) => {
    const daysRemaining = Math.ceil((new Date(listing.expirationDate) - new Date()) / (1000 * 60 * 60 * 24));
    
    const mailOptions = {
        from: `VDI Realty <${config.email.user}>`,
        to: listing.email,
        subject: `⏰ Your FSBO Listing Expires in ${daysRemaining} Days - Relist Now (Free!)`,
        html: `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background: linear-gradient(135deg, #0F2027, #203A43); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
                    .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px; }
                    .warning-box { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 4px; }
                    .property-info { background: white; padding: 20px; margin: 20px 0; border-radius: 8px; box-shadow: 0 2px 5px rgba(0,0,0,0.1); }
                    .button { display: inline-block; background: #C5A059; color: white; padding: 15px 40px; text-decoration: none; border-radius: 25px; margin: 20px 0; font-size: 16px; font-weight: bold; }
                    .footer { text-align: center; margin-top: 30px; color: #666; font-size: 0.9em; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>⏰ Listing Expiration Reminder</h1>
                    </div>
                    <div class="content">
                        <p>Hello ${listing.firstName},</p>
                        
                        <div class="warning-box">
                            <strong>⚠️ Your property listing will expire in ${daysRemaining} days!</strong>
                            <p style="margin: 10px 0 0 0;">Expiration Date: <strong>${new Date(listing.expirationDate).toLocaleDateString()}</strong></p>
                        </div>
                        
                        <div class="property-info">
                            <h3 style="margin-top: 0; color: #0F2027;">Your Property:</h3>
                            <p><strong>${listing.address}</strong><br>
                            ${listing.city}, ${listing.state} ${listing.zip}<br>
                            ${listing.bedrooms} bed, ${listing.bathrooms} bath | ${listing.sqft.toLocaleString()} sq ft<br>
                            <strong style="color: #C5A059; font-size: 1.2em;">$${listing.price.toLocaleString()}</strong></p>
                        </div>
                        
                        <p><strong>Want to keep your property visible to potential buyers?</strong></p>
                        
                        <p>Simply relist your property to extend it for another 14 days - completely FREE! There are no limits on how many times you can relist.</p>
                        
                        <p style="text-align: center;">
                            <a href="${config.websiteUrl}/fsbo.html" class="button">🔄 Relist Now (FREE)</a>
                        </p>
                        
                        <p><strong>Why relist?</strong></p>
                        <ul>
                            <li>Keep your property visible to buyers</li>
                            <li>Completely free - no fees or charges</li>
                            <li>Unlimited relisting allowed</li>
                            <li>Fresh listings get more attention</li>
                        </ul>
                        
                        <p>If your property has sold or you no longer wish to list it, no action is needed - it will automatically be removed after expiration.</p>
                        
                        <p>Best regards,<br><strong>VDI Realty Team</strong></p>
                    </div>
                    <div class="footer">
                        <p>&copy; ${new Date().getFullYear()} VDI Realty. All rights reserved.</p>
                    </div>
                </div>
            </body>
            </html>
        `
    };

    try {
        await sendEmail(mailOptions);
        console.log(`✅ Reminder email sent to ${listing.email}`);
        return true;
    } catch (error) {
        console.error('❌ Error sending reminder email:', error);
        return false;
    }
};

// Send notification to admin
const sendAdminNotification = async (listing) => {
    const mailOptions = {
        from: `VDI Realty <${config.email.user}>`,
        to: config.adminEmail,
        subject: 'New FSBO Listing Submitted',
        html: `
            <h2>New FSBO Listing Submitted</h2>
            <p><strong>Property:</strong> ${listing.address}, ${listing.city}, ${listing.state}</p>
            <p><strong>Seller:</strong> ${listing.firstName} ${listing.lastName}</p>
            <p><strong>Email:</strong> ${listing.email}</p>
            <p><strong>Phone:</strong> ${listing.phone}</p>
            <p><strong>Price:</strong> $${listing.price.toLocaleString()}</p>
            <p><strong>Type:</strong> ${listing.propertyType}</p>
            <p><strong>Beds/Baths:</strong> ${listing.bedrooms}/${listing.bathrooms}</p>
            <p><strong>Privacy:</strong> ${listing.privateContact ? 'Contact info is PRIVATE' : 'Contact info is PUBLIC'}</p>
            <hr>
            <p><a href="${config.websiteUrl}/fsbo-listings.html">View All Listings</a></p>
        `
    };

    try {
        await sendEmail(mailOptions);
        console.log(`✅ Admin notification sent`);
    } catch (error) {
        console.error('❌ Error sending admin notification:', error);
    }
};

// Send contact form email
const sendContactEmail = async (contactData) => {
    const mailOptions = {
        from: `VDI Realty Website <${config.email.user}>`,
        to: config.adminEmail,
        replyTo: contactData.email,
        subject: `New Contact from ${contactData.name} - VDI Realty`,
        html: `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background: linear-gradient(135deg, #0F2027, #203A43); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
                    .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px; }
                    .info-box { background: white; padding: 20px; margin: 20px 0; border-radius: 8px; box-shadow: 0 2px 5px rgba(0,0,0,0.1); }
                    .detail-row { padding: 10px 0; border-bottom: 1px solid #eee; }
                    .detail-label { font-weight: bold; color: #0F2027; display: inline-block; width: 120px; }
                    .message-box { background: #fff3cd; border-left: 4px solid #C5A059; padding: 15px; margin: 20px 0; border-radius: 4px; }
                    .footer { text-align: center; margin-top: 30px; color: #666; font-size: 0.9em; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>📧 New Contact Form Submission</h1>
                    </div>
                    <div class="content">
                        <div class="info-box">
                            <h3 style="margin-top: 0; color: #0F2027;">Contact Information:</h3>
                            <div class="detail-row">
                                <span class="detail-label">Name:</span> ${contactData.name}
                            </div>
                            <div class="detail-row">
                                <span class="detail-label">Email:</span> <a href="mailto:${contactData.email}">${contactData.email}</a>
                            </div>
                            <div class="detail-row">
                                <span class="detail-label">Phone:</span> ${contactData.phone}
                            </div>
                            <div class="detail-row" style="border-bottom: none;">
                                <span class="detail-label">Interest:</span> ${contactData.interest}
                            </div>
                        </div>
                        
                        <div class="message-box">
                            <h3 style="margin-top: 0; color: #0F2027;">Message:</h3>
                            <p style="white-space: pre-line;">${contactData.message}</p>
                        </div>
                        
                        <p style="font-size: 0.9em; color: #666;">
                            <strong>Submitted:</strong> ${new Date(contactData.submittedAt).toLocaleString()}
                        </p>
                    </div>
                    <div class="footer">
                        <p>&copy; ${new Date().getFullYear()} VDI Realty. All rights reserved.</p>
                        <p>This message was sent from your website contact form</p>
                    </div>
                </div>
            </body>
            </html>
        `
    };

    try {
        await sendEmail(mailOptions);
        console.log(`✅ Contact form email sent to ${config.adminEmail}`);
        return true;
    } catch (error) {
        console.error('❌ Error sending contact form email:', error);
        return false;
    }
};

// Escape user-supplied text before embedding in HTML emails
const escapeHtml = (value) => {
    if (value === null || value === undefined) return '';
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
};

// Relay a buyer's inquiry to the seller (seller's real email never shown to buyer)
const sendInquiryToSeller = async (listing, inquiry) => {
    const displayAddress = listing.hideAddress
        ? `${listing.city}, ${listing.state} ${listing.zip}`
        : `${listing.address}, ${listing.city}, ${listing.state} ${listing.zip}`;
    const mailOptions = {
        from: `VDI Realty <${config.email.user}>`,
        to: listing.email,
        replyTo: inquiry.email,
        subject: `New buyer inquiry: ${displayAddress} - VDI Realty FSBO`,
        html: `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background: linear-gradient(135deg, #0F2027, #203A43); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
                    .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px; }
                    .info-box { background: white; padding: 20px; margin: 20px 0; border-radius: 8px; box-shadow: 0 2px 5px rgba(0,0,0,0.1); }
                    .detail-row { padding: 8px 0; border-bottom: 1px solid #eee; }
                    .detail-label { font-weight: bold; color: #0F2027; }
                    .message-box { background: white; padding: 20px; margin: 20px 0; border-radius: 8px; border-left: 4px solid #C5A059; }
                    .footer { text-align: center; margin-top: 30px; color: #666; font-size: 0.9em; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>📩 New Buyer Inquiry</h1>
                    </div>
                    <div class="content">
                        <p>Hello ${escapeHtml(listing.firstName)},</p>
                        <p>Someone is interested in your FSBO listing:</p>
                        <div class="info-box">
                            <div class="detail-row"><span class="detail-label">Property:</span> ${escapeHtml(displayAddress)}</div>
                            <div class="detail-row"><span class="detail-label">List Price:</span> $${Number(listing.price).toLocaleString()}</div>
                        </div>
                        <h3 style="color: #0F2027;">Buyer Details:</h3>
                        <div class="info-box">
                            <div class="detail-row"><span class="detail-label">Name:</span> ${escapeHtml(inquiry.name)}</div>
                            <div class="detail-row"><span class="detail-label">Email:</span> ${escapeHtml(inquiry.email)}</div>
                            <div class="detail-row"><span class="detail-label">Phone:</span> ${escapeHtml(inquiry.phone || 'Not provided')}</div>
                        </div>
                        <div class="message-box">
                            <strong>Their message:</strong>
                            <p>${escapeHtml(inquiry.message).replace(/\n/g, '<br>')}</p>
                        </div>
                        <p><strong>Tip:</strong> you can reply directly to this email — it will go straight to the buyer. Your email address stays private until you choose to share it.</p>
                        <p>Best regards,<br><strong>VDI Realty Team</strong></p>
                    </div>
                    <div class="footer">
                        <p>&copy; ${new Date().getFullYear()} VDI Realty. All rights reserved.</p>
                    </div>
                </div>
            </body>
            </html>
        `
    };

    try {
        await sendEmail(mailOptions);
        console.log(`✅ Inquiry relay sent to seller for listing ${listing.id}`);
        return true;
    } catch (error) {
        console.error('❌ Error relaying inquiry to seller:', error);
        return false;
    }
};

// Notify seller their listing was approved and is live
const sendApprovalEmail = async (listing) => {
    const mailOptions = {
        from: `VDI Realty <${config.email.user}>`,
        to: listing.email,
        subject: 'Your FSBO listing is now live! - VDI Realty',
        html: `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background: linear-gradient(135deg, #0F2027, #203A43); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
                    .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px; }
                    .button { display: inline-block; background: #C5A059; color: white; padding: 12px 30px; text-decoration: none; border-radius: 25px; margin: 20px 0; }
                    .footer { text-align: center; margin-top: 30px; color: #666; font-size: 0.9em; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>🎉 Your Listing is Live!</h1>
                    </div>
                    <div class="content">
                        <p>Hello ${escapeHtml(listing.firstName)},</p>
                        <p>Great news — your FSBO listing for <strong>${escapeHtml(listing.address)}, ${escapeHtml(listing.city)}, ${escapeHtml(listing.state)} ${escapeHtml(listing.zip)}</strong> has been reviewed and is now live on VDI Realty.</p>
                        <p><strong>Share it everywhere!</strong> Every view is a potential buyer. Post your listing link on social media, neighborhood groups, and anywhere buyers look.</p>
                        <p style="margin-top: 20px;">
                            <a href="${config.websiteUrl}/fsbo-listings.html" class="button">View Your Listing</a>
                        </p>
                        <p>Your listing stays active for <strong>14 days</strong> (until ${new Date(listing.expirationDate).toLocaleDateString()}). We'll remind you before it expires so you can relist for free.</p>
                        <p>Changed your mind about selling on your own? <a href="${config.websiteUrl}/contact.html">Let VDI Realty sell it for you</a> — we'd be glad to help.</p>
                        <p>Best regards,<br><strong>VDI Realty Team</strong></p>
                    </div>
                    <div class="footer">
                        <p>&copy; ${new Date().getFullYear()} VDI Realty. All rights reserved.</p>
                    </div>
                </div>
            </body>
            </html>
        `
    };

    try {
        await sendEmail(mailOptions);
        console.log(`✅ Approval email sent to ${listing.email}`);
        return true;
    } catch (error) {
        console.error('❌ Error sending approval email:', error);
        return false;
    }
};

// Notify seller their listing was not approved
const sendRejectionEmail = async (listing, reason) => {
    const mailOptions = {
        from: `VDI Realty <${config.email.user}>`,
        to: listing.email,
        subject: 'Update on your FSBO listing - VDI Realty',
        html: `
            <!DOCTYPE html>
            <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h2 style="color: #0F2027;">Update on your FSBO listing</h2>
                    <p>Hello ${escapeHtml(listing.firstName)},</p>
                    <p>Thanks for submitting your FSBO listing for <strong>${escapeHtml(listing.address)}, ${escapeHtml(listing.city)}, ${escapeHtml(listing.state)} ${escapeHtml(listing.zip)}</strong>. After review, we weren't able to publish it this time${reason ? ` — ${escapeHtml(reason)}` : ''}.</p>
                    <p>You're welcome to fix this and submit again — it's always free. Or if you'd rather have a professional handle it, <a href="${config.websiteUrl}/contact.html">VDI Realty would be glad to sell your home for you</a>.</p>
                    <p>Best regards,<br><strong>VDI Realty Team</strong></p>
                </div>
            </body>
            </html>
        `
    };

    try {
        await sendEmail(mailOptions);
        console.log(`✅ Rejection email sent to ${listing.email}`);
        return true;
    } catch (error) {
        console.error('❌ Error sending rejection email:', error);
        return false;
    }
};

// Alert Veng about a new "Sell with VDI" lead
const sendSellerLeadNotification = async (lead) => {
    const isBuilder = lead.sellerType === 'builder';
    const mailOptions = {
        from: `VDI Realty <${config.email.user}>`,
        to: config.adminEmail,
        subject: `${isBuilder ? '🏗️ NEW BUILDER LEAD' : '🏠 NEW SELLER LEAD'}: ${lead.name} - VDI Realty`,
        html: `
            <!DOCTYPE html>
            <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h2 style="color: #0F2027;">${isBuilder ? '🏗️ New Builder Lead' : '🏠 New Seller Lead'}</h2>
                    <p><strong>Someone wants VDI Realty to help sell their ${isBuilder ? 'properties' : 'home'}!</strong></p>
                    <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                        <tr><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Name</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${escapeHtml(lead.name)}</td></tr>
                        <tr><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Email</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${escapeHtml(lead.email)}</td></tr>
                        <tr><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Phone</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${escapeHtml(lead.phone || 'Not provided')}</td></tr>
                        <tr><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Property</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${escapeHtml([lead.propertyAddress, lead.city, lead.state, lead.zip].filter(Boolean).join(', ') || 'Not provided')}</td></tr>
                        <tr><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Timeline</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${escapeHtml(lead.timeline || 'Not provided')}</td></tr>
                        <tr><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Price expectation</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${escapeHtml(lead.priceExpectation || 'Not provided')}</td></tr>
                        <tr><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Type</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${isBuilder ? 'Builder / Developer' : 'Homeowner'}</td></tr>
                    </table>
                    ${lead.message ? `<p><strong>Their message:</strong><br>${escapeHtml(lead.message).replace(/\n/g, '<br>')}</p>` : ''}
                    <p style="color: #666; font-size: 0.9em;">Submitted ${new Date(lead.createdAt || Date.now()).toLocaleString()}. Reply to ${escapeHtml(lead.email)} to follow up.</p>
                </div>
            </body>
            </html>
        `,
        replyTo: lead.email
    };

    try {
        await sendEmail(mailOptions);
        console.log(`✅ Seller lead notification sent to ${config.adminEmail}`);
        return true;
    } catch (error) {
        console.error('❌ Error sending seller lead notification:', error);
        return false;
    }
};

// Confirm to the lead that VDI received their request
const sendSellerLeadConfirmation = async (lead) => {
    const mailOptions = {
        from: `VDI Realty <${config.email.user}>`,
        to: lead.email,
        subject: 'We received your request - VDI Realty',
        html: `
            <!DOCTYPE html>
            <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h2 style="color: #0F2027;">Thanks, ${escapeHtml(lead.name)}!</h2>
                    <p>We've received your request to have <strong>VDI Realty</strong> help sell your ${lead.sellerType === 'builder' ? 'properties' : 'home'}. A member of our team will reach out shortly to talk next steps.</p>
                    <p>In the meantime, if you have questions, call us at <strong>(206) 880-0637</strong> or reply to this email.</p>
                    <p>Best regards,<br><strong>VDI Realty Team</strong><br><span style="color:#666; font-size: 0.9em;">Brokered by Realty Connect</span></p>
                </div>
            </body>
            </html>
        `
    };

    try {
        await sendEmail(mailOptions);
        console.log(`✅ Seller lead confirmation sent to ${lead.email}`);
        return true;
    } catch (error) {
        console.error('❌ Error sending seller lead confirmation:', error);
        return false;
    }
};

// Alert Veng/Jae about a new technical help request from the FSBO posting flow
const sendHelpRequestNotification = async (req_) => {
    const mailOptions = {
        from: `VDI Realty <${config.email.user}>`,
        to: config.adminEmail,
        subject: `🛠️ TECH HELP REQUEST: ${req_.name} - FSBO posting`,
        html: `
            <!DOCTYPE html>
            <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h2 style="color: #0F2027;">🛠️ New Technical Help Request</h2>
                    <p><strong>Someone needs help with the FSBO listing form.</strong> Jae handles these directly.</p>
                    <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                        <tr><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Name</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${escapeHtml(req_.name)}</td></tr>
                        <tr><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Email</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${escapeHtml(req_.email)}</td></tr>
                        <tr><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Phone</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${escapeHtml(req_.phone || 'Not provided')}</td></tr>
                        <tr><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Issue</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${escapeHtml(req_.issue || 'Not specified')}</td></tr>
                    </table>
                    ${req_.message ? `<p><strong>Their description:</strong><br>${escapeHtml(req_.message).replace(/\n/g, '<br>')}</p>` : ''}
                    <p style="color: #666; font-size: 0.9em;">Submitted ${new Date(req_.createdAt || Date.now()).toLocaleString()}. Reply to ${escapeHtml(req_.email)} to help them out.</p>
                </div>
            </body>
            </html>
        `,
        replyTo: req_.email
    };

    try {
        await sendEmail(mailOptions);
        console.log(`✅ Help request notification sent to ${config.adminEmail}`);
        return true;
    } catch (error) {
        console.error('❌ Error sending help request notification:', error);
        return false;
    }
};

// Confirm to the user that their help request was received
const sendHelpRequestConfirmation = async (req_) => {
    const mailOptions = {
        from: `VDI Realty <${config.email.user}>`,
        to: req_.email,
        subject: 'We got your help request - VDI Realty',
        html: `
            <!DOCTYPE html>
            <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h2 style="color: #0F2027;">Thanks, ${escapeHtml(req_.name)}!</h2>
                    <p>We've received your help request about the <strong>free listing form</strong>. A member of our team will reach out shortly to get you unstuck.</p>
                    <p>If it's urgent, call us at <strong>(206) 880-0637</strong> or just reply to this email.</p>
                    <p>Best regards,<br><strong>VDI Realty Team</strong><br><span style="color:#666; font-size: 0.9em;">Brokered by Realty Connect</span></p>
                </div>
            </body>
            </html>
        `
    };

    try {
        await sendEmail(mailOptions);
        console.log(`✅ Help request confirmation sent to ${req_.email}`);
        return true;
    } catch (error) {
        console.error('❌ Error sending help request confirmation:', error);
        return false;
    }
};

// Notify the admin inbox about a new concierge listing request.
// Jae (or the team) opens the link, builds the listing, and publishes it
// after the normal moderation review.
const sendConciergeRequestNotification = async (req_) => {
    const typeLabels = { owner: 'Homeowner', builder: 'Builder / Developer', broker: 'Real estate agent' };
    const mailOptions = {
        from: `VDI Realty <${config.email.user}>`,
        to: config.adminEmail,
        subject: `🏡 CONCIERGE LISTING: ${req_.name} (${typeLabels[req_.posterType] || req_.posterType})`,
        html: `
            <!DOCTYPE html>
            <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h2 style="color: #0F2027;">🏡 New Concierge Listing Request</h2>
                    <p><strong>Someone pasted a listing link and wants us to do the rest.</strong> Open the link, build the listing from it, and run it through the normal moderation review before publishing.</p>
                    <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                        <tr><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Name</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${escapeHtml(req_.name)}</td></tr>
                        <tr><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Email</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${escapeHtml(req_.email)}</td></tr>
                        <tr><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Phone</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${escapeHtml(req_.phone || 'Not provided')}</td></tr>
                        <tr><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">They are a</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${escapeHtml(typeLabels[req_.posterType] || req_.posterType)}</td></tr>
                        <tr><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Company / Brokerage</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${escapeHtml(req_.company || 'Not provided')}</td></tr>
                        <tr><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Listing link</td><td style="padding: 8px; border-bottom: 1px solid #eee;"><a href="${escapeHtml(req_.listingUrl)}">${escapeHtml(req_.listingUrl)}</a></td></tr>
                        <tr><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Authority confirmed</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${req_.consent ? 'Yes' : 'No'}</td></tr>
                    </table>
                    ${req_.notes ? `<p><strong>Their notes:</strong><br>${escapeHtml(req_.notes).replace(/\n/g, '<br>')}</p>` : ''}
                    <p style="color: #666; font-size: 0.9em;">Submitted ${new Date(req_.createdAt || Date.now()).toLocaleString()}. Note: Zillow/Redfin links usually block automated access — you may need to ask the requester for details or photos.</p>
                </div>
            </body>
            </html>
        `,
        replyTo: req_.email
    };

    try {
        await sendEmail(mailOptions);
        console.log(`✅ Concierge request notification sent to ${config.adminEmail}`);
        return true;
    } catch (error) {
        console.error('❌ Error sending concierge request notification:', error);
        return false;
    }
};

// Confirm to the requester that their concierge request was received
const sendConciergeRequestConfirmation = async (req_) => {
    const mailOptions = {
        from: `VDI Realty <${config.email.user}>`,
        to: req_.email,
        subject: 'We got your listing link - VDI Realty',
        html: `
            <!DOCTYPE html>
            <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h2 style="color: #0F2027;">Thanks, ${escapeHtml(req_.name)}!</h2>
                    <p>We've received your listing link. Our team will review it and build your listing for you — <strong>you don't need to do anything else</strong>.</p>
                    <p>We'll reach out at <strong>${escapeHtml(req_.email)}</strong> once your listing is ready for review, usually within 1 business day.</p>
                    <p>Best regards,<br><strong>VDI Realty Team</strong><br><span style="color:#666; font-size: 0.9em;">Brokered by Realty Connect</span></p>
                </div>
            </body>
            </html>
        `
    };

    try {
        await sendEmail(mailOptions);
        console.log(`✅ Concierge request confirmation sent to ${req_.email}`);
        return true;
    } catch (error) {
        console.error('❌ Error sending concierge request confirmation:', error);
        return false;
    }
};

module.exports = {
    initializeTransporter,
    sendConfirmationEmail,
    sendReminderEmail,
    sendAdminNotification,
    sendContactEmail,
    sendInquiryToSeller,
    sendApprovalEmail,
    sendRejectionEmail,
    sendSellerLeadNotification,
    sendSellerLeadConfirmation,
    sendHelpRequestNotification,
    sendHelpRequestConfirmation,
    sendConciergeRequestNotification,
    sendConciergeRequestConfirmation
};
