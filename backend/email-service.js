const nodemailer = require('nodemailer');
const config = require('./config');

// Create transporter based on configuration
let transporter;

const initializeTransporter = () => {
    if (config.email.service === 'gmail') {
        transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: config.email.user,
                pass: config.email.password
            }
        });
    } else if (config.email.service === 'sendgrid') {
        transporter = nodemailer.createTransport({
            host: 'smtp.sendgrid.net',
            port: 587,
            auth: {
                user: 'apikey',
                pass: config.email.sendgridApiKey
            }
        });
    } else {
        // Custom SMTP
        transporter = nodemailer.createTransport({
            host: config.email.host,
            port: config.email.port,
            secure: config.email.secure,
            auth: {
                user: config.email.user,
                pass: config.email.password
            }
        });
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
        await transporter.sendMail(mailOptions);
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
        await transporter.sendMail(mailOptions);
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
        await transporter.sendMail(mailOptions);
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
        await transporter.sendMail(mailOptions);
        console.log(`✅ Contact form email sent to ${config.adminEmail}`);
        return true;
    } catch (error) {
        console.error('❌ Error sending contact form email:', error);
        return false;
    }
};

module.exports = {
    initializeTransporter,
    sendConfirmationEmail,
    sendReminderEmail,
    sendAdminNotification,
    sendContactEmail
};
