# Email Contact Form Setup Guide

Your contact form is now ready to send emails to **info@vdirealty.com**. Choose one of the options below to complete the setup.

## 🎯 Recommended: Web3Forms (Easiest & Free)

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
