# 🤖 Chatbase AI Chatbot Setup Guide

Your website is now ready for Chatbase! Just follow these simple steps to activate your 24/7 AI assistant.

---

## 🚀 Quick Setup (5 Minutes)

### Step 1: Create Your Chatbase Account

1. Go to **[https://www.chatbase.co](https://www.chatbase.co)**
2. Click **"Get Started for Free"**
3. Sign up with your email or Google account

### Step 2: Train Your AI Chatbot

1. **Click "Create Chatbot"** on the dashboard
2. **Choose your training method:**

   **Option A: Train from Website (Recommended)**
   - Select "Website"
   - Enter your website URL: `https://yourdomain.com`
   - Chatbase will automatically crawl and learn your content
   - Click "Create Chatbot"

   **Option B: Upload Documents**
   - Upload PDFs, docs about your services
   - Add pricing sheets, FAQs, etc.
   - Click "Create Chatbot"

   **Option C: Manual Text**
   - Paste information about VDI Realty services
   - Include FAQs, service descriptions
   - Click "Create Chatbot"

3. **Wait 1-2 minutes** for training to complete

### Step 3: Customize Your Chatbot

1. Go to **Settings** → **Customize**
2. **Set up the appearance:**
   - **Chatbot Name:** VDI Realty Assistant
   - **Welcome Message:** "👋 Hi! I'm here to help you with real estate questions 24/7. How can I assist you today?"
   - **Theme Color:** `#C5A059` (your brand accent color)
   - **Position:** Bottom Right
   - **Initial State:** Bubble (not expanded)

3. **Configure behavior:**
   - **Model:** GPT-4 (for best results) or GPT-3.5 (faster, cheaper)
   - **Temperature:** 0.7 (balanced creativity)
   - **Max Tokens:** 500
   - **Visibility:** Show on all pages

4. **Set instructions** (optional but recommended):
   ```
   You are a helpful real estate assistant for VDI Realty. 
   You help with:
   - Investment property questions
   - Builder/developer services
   - Corporate relocation information
   - Market data and trends
   - Scheduling consultations
   
   Always be professional, friendly, and direct users to contact 
   info@vdirealty.com or schedule a call for detailed assistance.
   ```

### Step 4: Get Your Chatbot ID

1. Go to **Settings** → **Embed on Website**
2. Copy your **Chatbot ID** (looks like: `abc123-xyz789-def456`)
3. You'll see code like this:
   ```html
   <script>
       chatbotId: "abc123-xyz789-def456"
   </script>
   ```

### Step 5: Add to Your Website

1. Open `index.html` in your editor
2. Find this line (near the bottom, around line 610):
   ```javascript
   chatbotId: "YOUR_CHATBOT_ID", // Replace with your Chatbase chatbot ID
   ```
3. Replace `YOUR_CHATBOT_ID` with your actual ID
4. Also update the script tag below:
   ```html
   chatbotId="YOUR_CHATBOT_ID"
   ```
5. Save the file

### Step 6: Test It!

1. Open your website in a browser
2. Look for the chat bubble in the bottom right corner
3. Click it and ask a test question like:
   - "What services do you offer?"
   - "How can you help with relocation?"
   - "Tell me about investment opportunities"

---

## ✅ You're Done!

Your AI chatbot is now live and ready to answer questions 24/7!

---

## 📊 Pricing Plans

### **Free Plan**
- 30 messages/month
- 1 chatbot
- GPT-3.5
- Perfect for testing

### **Hobby Plan - $19/month**
- 2,000 messages/month
- 2 chatbots
- GPT-4 access
- Lead capture
- Remove "Powered by Chatbase"

### **Standard Plan - $99/month**
- 10,000 messages/month
- 5 chatbots
- Priority support
- Advanced analytics

💡 **Recommendation:** Start with the **Free plan** to test, upgrade to **Hobby ($19)** when you get regular traffic.

---

## 🎯 Training Tips for Best Results

### Add This Information to Your Chatbot:

1. **Your Services:**
   - Home & Investment properties
   - Builder/Developer services
   - Corporate relocation
   - AirBnB investment consulting

2. **Contact Information:**
   - Email: info@vdirealty.com
   - Phone: (555) 123-4567
   - Office: Greater Metro Area

3. **Common Questions:**
   ```
   Q: What areas do you serve?
   A: We serve the Greater Metro Area including [your cities].
   
   Q: Do you help with investment properties?
   A: Yes! We specialize in identifying cash-flowing properties 
   for investors and AirBnB hosts.
   
   Q: Can you help me relocate from out of state?
   A: Absolutely! Our concierge relocation service includes 
   virtual tours, school reports, and neighborhood analysis.
   
   Q: What builder services do you offer?
   A: We provide land acquisition, pre-sale marketing, zoning 
   guidance, and model home management for developers.
   ```

4. **Lead Capture:**
   Enable "Collect Leads" in settings to automatically gather:
   - Name
   - Email
   - Phone
   - Question/Interest

---

## 🔧 Advanced Customization

### Match Your Brand Colors

In Chatbase Settings → Customize:
- **Primary Color:** `#0F2027` (your dark blue)
- **Accent Color:** `#C5A059` (your gold)
- **Text Color:** `#333333`

### Set Up Notifications

1. Go to **Settings** → **Notifications**
2. Add your email: **info@vdirealty.com**
3. Get notified when:
   - Someone requests contact
   - AI can't answer a question
   - Daily conversation summary

### Create Custom Actions

Add buttons for common actions:
- 📅 Schedule Consultation → Link to contact form
- 📧 Email Us → mailto:info@vdirealty.com
- 📱 Call Now → tel:+15551234567
- 🏠 View Properties → Link to opportunities.html

---

## 📈 Monitoring & Analytics

### Track Performance

Chatbase provides analytics on:
- ✅ Number of conversations
- ✅ Most asked questions
- ✅ Lead capture rate
- ✅ User satisfaction
- ✅ Response accuracy

**Pro Tip:** Review conversations weekly to:
1. Find gaps in knowledge
2. Add FAQs to your training data
3. Improve responses
4. Identify common pain points

---

## 🆘 Troubleshooting

### Chat bubble doesn't appear
**Fix:** 
- Check that you replaced BOTH instances of `YOUR_CHATBOT_ID`
- Clear browser cache
- Wait 30 seconds after saving the file

### Chatbot gives wrong answers
**Fix:**
- Review your training data
- Add more specific FAQs
- Adjust the AI instructions in settings

### Too many questions going unanswered
**Fix:**
- Add more training documents
- Enable "Fallback to human" with your email
- Review analytics to see what's being asked

### Chat loads slowly
**Fix:**
- This is normal on first load (loading AI model)
- Consider upgrading plan for faster response
- Enable "Eager Loading" in settings

---

## 💡 Pro Tips for Success

1. **Update Training Monthly**
   - Add new properties
   - Update market data
   - Add seasonal FAQs

2. **Review Conversations Weekly**
   - See what people ask
   - Improve responses
   - Find content gaps

3. **Set Expectations**
   - Let users know it's AI
   - Offer to connect with human for complex questions
   - Provide your email/phone for urgent matters

4. **Test Regularly**
   - Ask questions yourself
   - Check response quality
   - Update training as needed

5. **Use Lead Capture**
   - Collect emails automatically
   - Follow up on hot leads
   - Build your mailing list

---

## 🔄 Alternative: If You Want to Switch Back to Tidio

If you ever want to switch back to Tidio, just replace the Chatbase code with:
```html
<script src="//code.tidio.co/k4bjnmca0qmwzlyrwirpnn71ksajdiqj.js" async></script>
```

---

## 📞 Need Help?

- **Chatbase Support:** [https://www.chatbase.co/help](https://www.chatbase.co/help)
- **Video Tutorials:** Available on Chatbase dashboard
- **Community:** Active Discord and Slack channels

---

## ✨ What Your Visitors Will Experience

When someone visits your website:

1. **Chat bubble appears** in bottom right corner
2. **Welcome message** greets them
3. They can **ask questions** about:
   - Your services
   - Pricing
   - Properties
   - Relocation help
   - Builder services
4. **Instant AI responses** 24/7
5. **Lead capture** for follow-up
6. **Seamless handoff** to email if needed

---

## 🎉 You're All Set!

Once you add your Chatbot ID to the code, your AI assistant will be live and ready to help visitors anytime, day or night!

**Questions?** Feel free to ask!
