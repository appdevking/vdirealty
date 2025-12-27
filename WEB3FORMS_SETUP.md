# Web3Forms Setup Guide

Quick setup guide to activate your contact form with Web3Forms.

## Step 1: Get Your Access Key

1. Go to **https://web3forms.com**
2. Enter your email: **info@vdirealty.com**
3. Click "Create Access Key"
4. Check your inbox for the access key email
5. Copy the access key (looks like: `a1b2c3d4-5678-90ef-ghij-klmnopqrstuv`)

## Step 2: Add Key to Website

1. Open `index.html`
2. Find line **1275** (or search for `YOUR_WEB3FORMS_ACCESS_KEY`)
3. Replace the placeholder:

**Before:**
```javascript
access_key: 'YOUR_WEB3FORMS_ACCESS_KEY',
```

**After:**
```javascript
access_key: 'a1b2c3d4-5678-90ef-ghij-klmnopqrstuv', // Your actual key
```

## Step 3: Test the Form

1. Open `index.html` in your browser
2. Fill out the contact form
3. Click "Send Message"
4. Check **info@vdirealty.com** inbox

You should receive the contact form submission email!

## Step 4: Deploy

```powershell
git add index.html
git commit -m "Add Web3Forms access key"
git push
```

Your contact form is now live on your website!

---

## Features

✅ **Unlimited submissions** - No monthly limits  
✅ **100% Free** - No credit card required  
✅ **Spam protection** - Built-in  
✅ **Fast** - Emails delivered in seconds  
✅ **Reliable** - 99.9% uptime  

## Email Format

Visitors will see a confirmation message on your website, and you'll receive an email with:
- Name
- Email (set as reply-to)
- Phone
- Interest category
- Message

## Troubleshooting

**No email received?**
- Check spam folder
- Verify you confirmed the access key email from Web3Forms
- Make sure the key is correctly pasted (no extra spaces)

**Form not submitting?**
- Open browser console (F12) and check for errors
- Verify the access key is replaced in index.html

**Need help?**
Web3Forms documentation: https://docs.web3forms.com
