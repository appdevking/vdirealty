# 🚀 AWS EC2 Migration Guide for VDI Realty Backend

## Overview
Migrating from Railway to AWS EC2 to host your FSBO backend.

**Estimated Time:** 45-60 minutes  
**Monthly Cost:** ~$8.50/month (after 12-month free tier)  
**Free Tier:** First 12 months FREE with new AWS account

---

## 📋 What We're Migrating

**Current Setup:**
- Backend: Railway (`vdi-storage-production.up.railway.app`)
- Frontend: GitHub Pages (`www.vdirealty.com`)
- Database: SQLite on Railway
- Photos: Railway file storage

**New Setup:**
- Backend: AWS EC2 (Ubuntu server)
- Frontend: GitHub Pages (no change)
- Database: SQLite on EC2
- Photos: EC2 file storage (or optional: S3)

---

## Step 1: Create AWS Account (15 minutes)

### 1.1 Sign Up for AWS
1. Go to [aws.amazon.com](https://aws.amazon.com)
2. Click **"Create an AWS Account"**
3. Fill in:
   - Email address
   - Password
   - AWS account name (e.g., "VDI Realty")

### 1.2 Contact Information
1. Choose **"Personal"** account type
2. Fill in your details:
   - Full name
   - Phone number
   - Address

### 1.3 Payment Information
1. Add credit/debit card
   - **Note:** You won't be charged during free tier
   - AWS requires card for verification
   - They'll charge $1 temporarily (refunded)

### 1.4 Identity Verification
1. Choose phone verification
2. Enter verification code sent via SMS

### 1.5 Select Support Plan
1. Choose **"Basic Support - Free"**
2. Click **"Complete sign up"**

### 1.6 Wait for Activation
- AWS will send confirmation email (usually within minutes)
- Check your email and verify

✅ **Once you have AWS account access, let me know and we'll proceed to Step 2**

---

## Step 2: Launch EC2 Instance (10 minutes)

### 2.1 Access EC2 Console
1. Sign in to [AWS Console](https://console.aws.amazon.com)
2. In search bar, type "EC2"
3. Click **"EC2"** service

### 2.2 Launch Instance
1. Click orange **"Launch Instance"** button
2. Name: `vdi-realty-backend`

### 2.3 Choose AMI (Operating System)
1. Select **"Ubuntu Server 22.04 LTS"**
2. Architecture: **64-bit (x86)**
3. Make sure it says **"Free tier eligible"**

### 2.4 Choose Instance Type
1. Select **"t2.micro"**
2. Should show: 1 vCPU, 1GB RAM
3. Verify: **"Free tier eligible"**

### 2.5 Create Key Pair (Important!)
1. Click **"Create new key pair"**
2. Key pair name: `vdi-realty-key`
3. Key pair type: **RSA**
4. Format: **`.pem`** (for SSH)
5. Click **"Create key pair"**
6. **Save the downloaded `.pem` file** - you'll need it!

### 2.6 Network Settings
1. Click **"Edit"** under Network settings
2. Auto-assign public IP: **Enable**
3. Firewall (security groups):
   - ✅ **SSH** (port 22) - Your IP
   - ✅ **HTTP** (port 80) - Anywhere
   - ✅ **HTTPS** (port 443) - Anywhere
   - Click **"Add security group rule"**:
     - Type: **Custom TCP**
     - Port: **3000**
     - Source: **Anywhere (0.0.0.0/0)**

### 2.7 Storage
1. Keep default: **8 GB gp3**
2. Free tier includes 30GB, so this is well within limits

### 2.8 Launch
1. Review summary on right side
2. Click **"Launch instance"**
3. Wait for "Successfully initiated launch" message
4. Click **"View all instances"**

### 2.9 Get Your Server IP
1. Select your instance (checkbox)
2. Copy the **"Public IPv4 address"** (e.g., 54.123.45.67)
3. Save this IP - you'll need it!

✅ **Got your EC2 instance running? Save the IP and we'll continue!**

---

## Step 3: Connect to Your Server (10 minutes)

### 3.1 Prepare SSH Key (Windows)
1. Open PowerShell as Administrator
2. Navigate to where you saved the `.pem` file:
   ```powershell
   cd C:\Users\YourName\Downloads
   ```

3. Move key to secure location:
   ```powershell
   mkdir C:\Users\YourName\.ssh
   move vdi-realty-key.pem C:\Users\YourName\.ssh\
   ```

### 3.2 Connect via SSH
Replace `YOUR_IP` with your EC2 public IP address:

```powershell
ssh -i C:\Users\YourName\.ssh\vdi-realty-key.pem ubuntu@YOUR_IP
```

**If you get "permissions error":**
- Right-click `.pem` file → Properties → Security
- Remove all users except yourself
- Give yourself Full Control

**Type "yes"** when asked about fingerprint

✅ **You should now see: `ubuntu@ip-xxx:~$`**

---

## Step 4: Install Software on Server (10 minutes)

Run these commands one by one on your EC2 server:

### 4.1 Update System
```bash
sudo apt update
sudo apt upgrade -y
```

### 4.2 Install Node.js
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs
```

Verify:
```bash
node --version  # Should show v18.x.x
npm --version   # Should show 9.x.x
```

### 4.3 Install Git
```bash
sudo apt install -y git
```

### 4.4 Install PM2 (Process Manager)
```bash
sudo npm install -g pm2
```

---

## Step 5: Deploy Your Backend Code (10 minutes)

### 5.1 Clone Your Repository
```bash
cd ~
git clone https://github.com/appdevking/vdirealty.git
cd vdirealty/backend
```

### 5.2 Install Dependencies
```bash
npm install
```

### 5.3 Create Upload Directory
```bash
mkdir -p uploads
```

### 5.4 Set Environment Variables
```bash
nano .env
```

Add this content (press Ctrl+X, then Y, then Enter to save):
```
PORT=3000
NODE_ENV=production
```

### 5.5 Initialize Database
```bash
node -e "require('./database.js')"
```

### 5.6 Start Server with PM2
```bash
pm2 start server.js --name vdi-backend
pm2 save
pm2 startup
```

Run the command that PM2 outputs (it will look like):
```bash
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u ubuntu --hp /home/ubuntu
```

### 5.7 Test Server
```bash
curl http://localhost:3000/api/fsbo/listings
```

Should return: `{"success":true,"count":0,"listings":[]}`

✅ **Server is running!**

---

## Step 6: Configure Nginx (Reverse Proxy) (5 minutes)

### 6.1 Install Nginx
```bash
sudo apt install -y nginx
```

### 6.2 Configure Nginx
```bash
sudo nano /etc/nginx/sites-available/vdi-realty
```

Paste this configuration:
```nginx
server {
    listen 80;
    server_name YOUR_EC2_IP;

    client_max_body_size 10M;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 6.3 Enable Site
```bash
sudo ln -s /etc/nginx/sites-available/vdi-realty /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 6.4 Test from Internet
Open browser and visit: `http://YOUR_EC2_IP/api/fsbo/listings`

Should see JSON response!

✅ **Backend is publicly accessible!**

---

## Step 7: Update Frontend Configuration (5 minutes)

Exit SSH (type `exit`) and return to your local PowerShell.

### 7.1 Update API URL
Navigate to your project:
```powershell
cd C:\Users\vengw\OneDrive\P\VDI\Git\vdirealty\vdirealty
```

I'll update the config file for you with your new EC2 IP address.

---

## Step 8: Optional - Set Up Custom Domain (Later)

If you want `api.vdirealty.com` instead of IP address:

1. **Get Elastic IP** (free while instance is running)
2. **Configure DNS** in your domain registrar
3. **Install SSL certificate** with Let's Encrypt

We can do this later once basic migration is working.

---

## 📊 Cost Breakdown

| Item | Free Tier (12 months) | After Free Tier |
|------|----------------------|-----------------|
| EC2 t2.micro | FREE | $8.50/month |
| Storage (30GB) | FREE | $3/month |
| Data Transfer (15GB) | FREE | Free tier continues |
| **Total** | **$0** | **~$11.50/month** |

---

## 🔧 Useful Commands

### Check server status:
```bash
pm2 status
pm2 logs vdi-backend
```

### Restart server:
```bash
pm2 restart vdi-backend
```

### Update code from GitHub:
```bash
cd ~/vdirealty/backend
git pull
npm install
pm2 restart vdi-backend
```

### Check Nginx:
```bash
sudo systemctl status nginx
sudo nginx -t
```

---

## 🆘 Troubleshooting

### Server not responding?
```bash
pm2 logs vdi-backend --lines 50
```

### Database issues?
```bash
ls -la listings.db
chmod 666 listings.db
```

### Nginx issues?
```bash
sudo nginx -t
sudo systemctl status nginx
sudo journalctl -u nginx -n 50
```

---

## ✅ Migration Checklist

- [ ] AWS account created
- [ ] EC2 instance launched
- [ ] SSH key downloaded and saved
- [ ] Connected to server via SSH
- [ ] Node.js, Git, PM2 installed
- [ ] Code cloned and dependencies installed
- [ ] Database initialized
- [ ] Server running with PM2
- [ ] Nginx configured
- [ ] Backend accessible from internet
- [ ] Frontend config updated
- [ ] Test listing submission
- [ ] Old Railway deployment stopped

---

**Ready to start? Let me know when you've completed Step 1 (AWS account creation) and we'll proceed together!**
