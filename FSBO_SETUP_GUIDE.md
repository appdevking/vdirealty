# FSBO Page Setup Guide

## What Was Added

A complete "For Sale By Owner" (FSBO) page has been created at `fsbo.html` that allows users to list their properties without creating an account.

### Features Included:
- ✅ Contact information form (name, email, phone)
- ✅ Comprehensive property details (address, type, price, size, bed/bath, year built, lot size)
- ✅ Property features checkboxes (pool, garage, fireplace, etc.)
- ✅ Rich text description field
- ✅ Multi-image upload with preview (up to 10 photos, 5MB max each)
- ✅ Image removal capability
- ✅ Form validation
- ✅ Responsive design
- ✅ Success confirmation message

### Navigation Updated:
The FSBO link has been added to:
- Main navigation on `index.html`
- Header navigation on `about.html`, `opportunities.html`, and `tools.html`

## Setting Up Form Submissions (Formspree - RECOMMENDED)

### Step 1: Create a Formspree Account
1. Go to **https://formspree.io/**
2. Click "Sign Up" and create a free account
3. Verify your email address

### Step 2: Create a New Form
1. Once logged in, click "New Form"
2. Give it a name like "VDI Realty FSBO Listings"
3. Formspree will generate a unique Form ID (e.g., `xpzgabcd`)

### Step 3: Update fsbo.html
1. Open `fsbo.html`
2. Find line ~657 where it says:
   ```javascript
   const response = await fetch('https://formspree.io/f/YOUR_FORM_ID', {
   ```
3. Replace `YOUR_FORM_ID` with your actual form ID:
   ```javascript
   const response = await fetch('https://formspore.io/f/xpzgabcd', {
   ```

### Step 4: Configure Formspree Settings (Optional)
In your Formspree dashboard, you can:
- Set up email notifications when submissions come in
- Add custom reply-to addresses
- Configure spam protection
- Set up webhooks for advanced integrations
- Download submission data as CSV

### Step 5: Test Your Form
1. Open `fsbo.html` in a browser
2. Fill out the form with test data
3. Upload a test image
4. Submit the form
5. Check your Formspree dashboard to see the submission
6. Check your email for the notification

## Alternative Options

### Option 2: Netlify Forms
If you're hosting on Netlify:
1. Add `netlify` attribute to the form tag in `fsbo.html`:
   ```html
   <form class="fsbo-form" id="fsboForm" netlify>
   ```
2. Netlify automatically captures form submissions
3. View submissions in your Netlify dashboard

### Option 3: Custom Backend
If you have your own backend:
1. Create an API endpoint to receive form data
2. Update the fetch URL in `fsbo.html` to point to your endpoint
3. Handle file uploads on your server
4. Store submissions in your database

## File Upload Handling

### Current Implementation:
- Images are sent as base64 encoded data with Formspree
- Maximum 10 photos per listing
- Maximum 5MB per photo
- Accepted formats: JPEG, PNG

### For Production:
Consider using a dedicated file storage service:
- **Cloudinary** - Image hosting and CDN
- **AWS S3** - Cloud storage
- **Firebase Storage** - Google's cloud storage

## Email Notifications

When using Formspree, you'll receive emails containing:
- All form field data
- Contact information
- Property details
- Features selected
- Description

Image files will be available to download from the Formspree dashboard.

## Managing Listings

### With Formspree Free Plan:
- View all submissions in the dashboard
- Export as CSV
- Email notifications
- 50 submissions per month (upgrade for more)

### For Advanced Management:
Consider building or integrating:
- Admin dashboard to review/approve listings
- Automatic listing page generation
- Email integration to property owner
- Listing expiration/renewal system

## Security Considerations

1. **Spam Protection**: 
   - Formspree includes reCAPTCHA
   - Consider adding honeypot fields
   
2. **File Upload Validation**:
   - Already limited to image types
   - Size limited to 5MB per file
   - Consider server-side validation too

3. **Data Privacy**:
   - Add privacy policy link
   - GDPR compliance if needed
   - Secure data storage

## Next Steps

1. ✅ Set up Formspree account
2. ✅ Update `YOUR_FORM_ID` in fsbo.html
3. ✅ Test form submission
4. ⬜ Add FSBO link to other pages as needed
5. ⬜ Create a page to display FSBO listings
6. ⬜ Set up automated email responses to sellers

## Questions?

If you need help with any of these steps or want to customize the form further, just ask!
