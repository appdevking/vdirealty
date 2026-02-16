// Run every week (Sunday at midnight) to archive and reset visit counts
const scheduleVisitCountsReset = () => {
    cron.schedule('0 0 * * 0', () => {
        const fs = require('fs');
        const path = require('path');
        const visitCountsPath = path.join(__dirname, 'visit-counts.json');
        const archiveDir = path.join(__dirname, 'visit-archive');
        try {
            if (!fs.existsSync(archiveDir)) {
                fs.mkdirSync(archiveDir);
            }
            const now = new Date();
            const weekStr = now.toISOString().slice(0,10);
            const archivePath = path.join(archiveDir, `visit-counts-${weekStr}.json`);
            if (fs.existsSync(visitCountsPath)) {
                fs.copyFileSync(visitCountsPath, archivePath);
                fs.writeFileSync(visitCountsPath, JSON.stringify({ pageVisits: {} }, null, 2));
                console.log(`📊 Archived and reset visit counts for week: ${weekStr}`);
            }
        } catch (e) {
            console.error('❌ Error archiving/resetting visit counts:', e);
        }
    });
    console.log('✅ Visit counts reset scheduled (weekly, Sunday at midnight)');
};
const cron = require('node-cron');
const { statements } = require('./database');
const { sendReminderEmail } = require('./email-service');
const config = require('./config');

// Run every day at midnight to expire old listings
const scheduleExpirationCheck = () => {
    cron.schedule('0 0 * * *', () => {
        console.log('🔍 Checking for expired listings...');
        
        try {
            const result = statements.expireOldListings.run();
            if (result.changes > 0) {
                console.log(`✅ Expired ${result.changes} listing(s)`);
            } else {
                console.log('✅ No listings to expire');
            }
        } catch (error) {
            console.error('❌ Error expiring listings:', error);
        }
    });
    
    console.log('✅ Expiration check scheduled (runs daily at midnight)');
};

// Run every day at 9 AM to send reminder emails
const scheduleReminderEmails = () => {
    cron.schedule('0 9 * * *', async () => {
        console.log('📧 Checking for listings needing reminders...');
        
        try {
            const listings = statements.getListingsNeedingReminder.all(config.reminderDaysBefore);
            
            if (listings.length === 0) {
                console.log('✅ No reminder emails to send');
                return;
            }
            
            console.log(`📬 Found ${listings.length} listing(s) needing reminders`);
            
            for (const listing of listings) {
                const sent = await sendReminderEmail(listing);
                if (sent) {
                    statements.markReminderSent.run(listing.id);
                }
            }
            
            console.log('✅ Reminder emails sent');
        } catch (error) {
            console.error('❌ Error sending reminder emails:', error);
        }
    });
    
    console.log('✅ Reminder email schedule set (runs daily at 9 AM)');
};

// For testing - check immediately on startup (optional)
const runImmediateChecks = async () => {
    console.log('🔄 Running immediate checks...');
    
    // Expire old listings
    try {
        const result = statements.expireOldListings.run();
        if (result.changes > 0) {
            console.log(`✅ Expired ${result.changes} listing(s) on startup`);
        }
    } catch (error) {
        console.error('❌ Error during startup expiration check:', error);
    }
    
    // Check for reminders (but don't send immediately to avoid spam)
    try {
        const listings = statements.getListingsNeedingReminder.all(config.reminderDaysBefore);
        if (listings.length > 0) {
            console.log(`📧 ${listings.length} listing(s) need reminders (will be sent at 9 AM)`);
        }
    } catch (error) {
        console.error('❌ Error during startup reminder check:', error);
    }
};

module.exports = {
    scheduleExpirationCheck,
    scheduleReminderEmails,
    runImmediateChecks,
    scheduleVisitCountsReset
};
