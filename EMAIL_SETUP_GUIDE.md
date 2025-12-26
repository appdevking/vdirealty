# Email Contact Form Setup Guide

Your contact form now uses your **local backend server** - no third-party services required!

## ✅ Current Setup: Local Backend (Recommended)

Your contact form is already configured to use your Node.js backend server, the same one powering your FSBO listings.

### How It Works:
1. User fills out contact form on your website
2. Form sends data to `http://localhost:3000/api/contact/submit`
3. Backend sends professional email to **info@vdirealty.com**
4. User sees success confirmation

### Already Implemented:
✅ Contact form endpoint (`/api/contact/submit`)  
✅ Professional HTML email template  
✅ Email validation and error handling  
✅ Same Nodemailer service as FSBO  
✅ Unlimited submissions (no rate limits!)  
✅ Full control over data and emails  

### No Setup Required!
If your backend server is already running for FSBO, your contact form works automatically.

**Just make sure:**
1. Backend server is running: `cd backend && npm start`
2. Email is configured in `backend/.env` file
3. That's it!

---

## 🚀 Testing Your Contact Form

### Step 1: Start Backend Server
```powershell
cd backend
npm start
```

You should see:
```
🚀 VDI Realty Backend Server Started!
📡 Server running on: http://localhost:3000
  POST   /api/contact/submit       - Submit contact form
```

### Step 2: Test the Form
1. Open `index.html` in your browser
2. Scroll to "Get In Touch" section
3. Fill out the form:
   - Name: Test User
   - Email: your-email@example.com
   - Phone: 555-1234
   - Interest: Choose any option
   - Message: Test message
4. Click "Send Message"
5. Check **info@vdirealty.com** inbox

### What You'll Receive:
Professional HTML email with:
- 📧 Contact information
- 📱 Phone number
- 💼 Interest category
- 💬 Full message
- 🕒 Submission timestamp
- ↩️ Reply-to address set to sender's email

---

## 📧 Email Configuration

Your contact form uses the same email service configured in `backend/.env`:

```env
# Option 1: Gmail (Easiest)
EMAIL_SERVICE=gmail
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
ADMIN_EMAIL=info@vdirealty.com

# Option 2: Custom SMTP
EMAIL_SERVICE=custom
EMAIL_HOST=smtp.yourdomain.com
EMAIL_PORT=587
EMAIL_USER=noreply@yourdomain.com
EMAIL_PASSWORD=your-password
```

See [backend/README.md](backend/README.md) for detailed email setup instructions.

---

## 🎨 Email Template

The contact form sends a professional HTML email featuring:
- VDI Realty branding colors (#0F2027, #203A43, #C5A059)
- Clean, modern design
- All contact details organized
- Message highlighted in gold box
- Mobile-responsive layout

**Template location:** `backend/email-service.js` (sendContactEmail function)

You can customize the template to match your preferences!

---

## 🔧 Advanced Configuration

### Change Recipient Email
Edit `backend/.env`:
```env
ADMIN_EMAIL=different-email@vdirealty.com
```

### Add Auto-Reply
Edit `backend/routes/contact-routes.js` to send confirmation email back to the sender.

### Store Submissions in Database
Add a new table in `backend/database.js` to log all contact form submissions.

### Rate Limiting
Add express-rate-limit middleware to prevent spam.

---

## 🚀 Production Deployment

When deploying to production:

### Step 1: Update API URL
In `index.html`, change:
```javascript
fetch('http://localhost:3000/api/contact/submit', {
```

To your production domain:
```javascript
fetch('https://yourdomain.com/api/contact/submit', {
```

### Step 2: Set Production Email
In `backend/.env`:
```env
NODE_ENV=production
EMAIL_SERVICE=gmail  # or your email service
EMAIL_USER=noreply@vdirealty.com
ADMIN_EMAIL=info@vdirealty.com
```

### Step 3: Enable HTTPS
Use SSL certificate for secure form submissions.

---

## 🆚 Why Local Backend vs Third-Party?

| Feature | Local Backend | Web3Forms | EmailJS | Formspree |
|---------|---------------|-----------|---------|-----------|
| **Monthly Limit** | Unlimited | Unlimited | 300 | 50 |
| **Setup Time** | ✅ Done! | 2 min | 10 min | 5 min |
| **Dependencies** | None | External | External | External |
| **Data Privacy** | 100% yours | Third-party | Third-party | Third-party |
| **Customization** | Full control | Limited | Medium | Limited |
| **Cost** | Free | Free | Free tier | Free tier |
| **Reliability** | Your server | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |

---

## 🆘 Troubleshooting

### "Failed to fetch" Error
**Cause:** Backend server not running  
**Solution:**
```powershell
cd backend
npm start
```

### No Email Received
**Cause:** Email not configured in .env  
**Solution:** Check `backend/.env` file has correct EMAIL settings

### CORS Error
**Cause:** Frontend and backend on different domains  
**Solution:** CORS is already enabled in `backend/server.js`

### Port 3000 Already in Use
**Solution:** Change PORT in `backend/.env` to 3001, update URL in index.html

---

## 📚 Alternative Options (If You Prefer Third-Party)

If you prefer not to run a local backend, you can still use third-party services:

### Option 1: Web3Forms (Easiest)

### Step 1: Get Your Access Key
1. Go to [https://web3forms.com](https://web3forms.com)
2. Enter your email: **info@vdirealty.com**
3. Click "Get Access Key"
4. Copy the access key from your email

### Step 2: Update Your Website
Open `index.html` and find this line (around line 542):
```javascript
access_key: 'YOUR_WEB3FORMS_ACCESS_KEY', // Get free key at https://web3forms.com
```

Replace `YOUR_WEB3FORMS_ACCESS_KEY` with your actual key:
```javascript
access_key: 'abcd1234-5678-90ef-ghij-klmnopqrstuv',
```

### That's it! ✅
Your form will now send emails to info@vdirealty.com when users click "Send Message".

**Features:**
- ✅ 100% Free
- ✅ No registration required
- ✅ Unlimited emails
- ✅ No rate limits
- ✅ Spam protection included
- ✅ Works instantly

---

## Alternative Option 1: EmailJS (More Features)

### Step 1: Create Account
1. Go to [https://www.emailjs.com](https://www.emailjs.com)
2. Sign up for a free account (300 emails/month free)

### Step 2: Setup Email Service
1. Click "Add New Service"
2. Choose your email provider (Gmail recommended)
3. Connect your **info@vdirealty.com** account
4. Note your **Service ID**

### Step 3: Create Email Template
1. Go to "Email Templates"
2. Click "Create New Template"
3. Use this template:

**Subject:**
```
New Contact from {{name}} - VDI Realty Website
```

**Body:**
```html
<h2>New Contact Form Submission</h2>

<p><strong>Name:</strong> {{name}}</p>
<p><strong>Email:</strong> {{email}}</p>
<p><strong>Phone:</strong> {{phone}}</p>
<p><strong>Interest:</strong> {{interest}}</p>

<h3>Message:</h3>
<p>{{message}}</p>

<hr>
<p><em>Sent from VDI Realty website contact form</em></p>
```

4. Set "Send To" email to: **info@vdirealty.com**
5. Note your **Template ID**

### Step 4: Update Your Website
In `index.html`, find these lines (around line 525):

1. **Uncomment the initialization** (line ~522):
```javascript
(function() {
    emailjs.init("YOUR_PUBLIC_KEY"); // Add your public key here
})();
```
Replace `YOUR_PUBLIC_KEY` with your actual Public Key from EmailJS Account page.

2. **Uncomment the EmailJS send code** (line ~545):
```javascript
emailjs.send('YOUR_SERVICE_ID', 'YOUR_TEMPLATE_ID', formData)
    .then(function(response) {
        showMessage('✓ Thank you! Your message has been sent successfully...', 'success');
        form.reset();
    }, function(error) {
        showMessage('✗ Sorry, there was an error...', 'error');
    })
    .finally(function() {
        submitBtn.innerHTML = '<span>Send Message</span>';
        submitBtn.disabled = false;
    });
```

3. **Comment out or remove the Web3Forms code** (lines ~560-590)

---

## Alternative Option 2: Formspree (Simple)

### Step 1: Setup Formspree
1. Go to [https://formspree.io](https://formspree.io)
2. Sign up for free account
3. Create a new form
4. Set email to: **info@vdirealty.com**
5. Copy your Form ID (looks like: `xvoepqrs`)

### Step 2: Update Your Website
In `index.html`, find the fetch code (around line 560) and replace with:

```javascript
fetch('https://formspree.io/f/YOUR_FORM_ID', {
    method: 'POST',
    body: new FormData(form),
    headers: {
        'Accept': 'application/json'
    }
})
.then(response => response.json())
.then(data => {
    showMessage('✓ Thank you! Your message has been sent successfully.', 'success');
    form.reset();
})
.catch(error => {
    showMessage('✗ Sorry, there was an error.', 'error');
})
.finally(() => {
    submitBtn.innerHTML = '<span>Send Message</span>';
    submitBtn.disabled = false;
});
```

Replace `YOUR_FORM_ID` with your actual Formspree form ID.

---

## Testing Your Form

1. Open your website in a browser
2. Fill out the contact form
3. Click "Send Message"
4. You should see a success message
5. Check **info@vdirealty.com** inbox for the email

### Troubleshooting

**Form doesn't submit:**
- Check browser console (F12) for errors
- Verify your access key/IDs are correct
- Make sure you removed the placeholder text

**No email received:**
- Check spam folder
- Verify the email address is correct
- For EmailJS: Confirm the service is connected
- For Web3Forms: Verify you confirmed the access key email

**"CORS" or network errors:**
- This is normal for local testing
- Upload to your actual website to test properly
- Or use a local server: `python -m http.server 8000`

---

## Comparison Table

| Feature | Web3Forms | EmailJS | Formspree |
|---------|-----------|---------|-----------|
| **Free Tier** | Unlimited | 300/month | 50/month |
| **Setup Time** | 2 minutes | 10 minutes | 5 minutes |
| **Registration** | No | Yes | Yes |
| **Custom Templates** | No | Yes | Limited |
| **Reliability** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **Best For** | Quick setup | Advanced needs | Simple forms |

---

## Need Help?

If you run into issues:
1. Check the browser console (F12) for errors
2. Verify all IDs/keys are correct
3. Test with a simple message first
4. Make sure your website is deployed (not just local file)

## Pro Tips

🎯 **Enable Email Notifications:**
Make sure info@vdirealty.com has notifications enabled so you don't miss leads!

🎯 **Auto-Reply:**
With EmailJS, you can set up auto-reply emails to confirm receipt.

🎯 **Spam Protection:**
All three services include spam protection automatically.

🎯 **Mobile Friendly:**
The form already works perfectly on mobile devices.
