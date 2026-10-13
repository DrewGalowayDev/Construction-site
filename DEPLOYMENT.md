# Hostinger Deployment Guide - TopLineHub Construction Platform

This guide will walk you through deploying your Node.js construction marketplace to Hostinger using GitHub for version control and deployment.

---

## Prerequisites

Before you begin, ensure you have:
- ✅ A Hostinger hosting plan (Business or higher with Node.js support)
- ✅ A GitHub account
- ✅ Git installed on your local machine
- ✅ Your domain name pointed to Hostinger

---

## Step 1: Prepare Your Project for Production

### 1.1 Install Production Dependencies

Ensure you have a production-ready package.json (already configured):

```json
{
  "name": "construction",
  "version": "1.0.0",
  "scripts": {
    "start": "node app.js",
    "seed": "node config/seed.js",
    "reset": "node config/reset-and-seed.js"
  },
  "engines": {
    "node": ">=18.0.0",
    "npm": ">=9.0.0"
  }
}
```

### 1.2 Update Production Configuration

Create your production `.env` file on the server (not in GitHub):

```bash
PORT=3000
NODE_ENV=production
DB_HOST=your_mysql_host.hostinger.com
DB_PORT=3306
DB_NAME=your_database_name
DB_USER=your_database_user
DB_PASS=your_secure_password
SESSION_SECRET=your_generated_secure_session_secret
```

---

## Step 2: Set Up GitHub Repository

### 2.1 Initialize Git (if not already done)

```bash
cd "d:\Drew Files\construction"
git init
git add .
git commit -m "Initial commit - TopLineHub Construction Platform"
```

### 2.2 Create GitHub Repository

1. Go to https://github.com/new
2. Create a new repository named: `toplinehub-construction`
3. **DO NOT** initialize with README (we already have files)
4. Click "Create repository"

### 2.3 Push to GitHub

```bash
git remote add origin https://github.com/YOUR_USERNAME/toplinehub-construction.git
git branch -M main
git push -u origin main
```

---

## Step 3: Set Up MySQL Database on Hostinger

### 3.1 Create Database

1. Login to your Hostinger control panel (hPanel)
2. Navigate to **Databases** > **MySQL Databases**
3. Click **"Create New Database"**
   - Database Name: `u123456789_construction` (or your preferred name)
   - Username: Create a new user or use existing
   - Password: Generate a strong password
   - Click **"Create"**

### 3.2 Note Your Database Credentials

Save these details (you'll need them):
```
DB_HOST: mysql123.hostinger.com (check your hPanel)
DB_NAME: u123456789_construction
DB_USER: u123456789_dbuser
DB_PASS: [your secure password]
DB_PORT: 3306
```

### 3.3 Access Database via phpMyAdmin (Optional)

- Go to **Databases** > **phpMyAdmin**
- Select your database
- You can import schema or let the app auto-create tables

---

## Step 4: Configure Node.js on Hostinger

### 4.1 Enable Node.js Application

1. In hPanel, go to **Advanced** > **Node.js**
2. Click **"Create Application"**
3. Configure:
   - **Application Mode**: Production
   - **Node.js Version**: Select latest stable (18.x or 20.x)
   - **Application Root**: `/public_html` or `/domains/yourdomain.com/public_html`
   - **Application URL**: Your domain (e.g., `https://yourdomain.com`)
   - **Application Startup File**: `app.js`
   - **Port**: (Auto-assigned by Hostinger, usually proxied)

### 4.2 Set Environment Variables

In the Node.js application settings, add these environment variables:

```
NODE_ENV=production
DB_HOST=mysql123.hostinger.com
DB_NAME=u123456789_construction
DB_USER=u123456789_dbuser
DB_PASS=your_database_password
SESSION_SECRET=your_generated_secret_key
PORT=3000
```

**Generate Session Secret:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## Step 5: Deploy via GitHub

### 5.1 SSH into Hostinger

1. In hPanel, go to **Advanced** > **SSH Access**
2. Enable SSH if not already enabled
3. Note your SSH credentials
4. Connect via terminal:

```bash
ssh u123456789@yourdomain.com
```

Or use PuTTY on Windows with the provided credentials.

### 5.2 Clone Your Repository

```bash
cd domains/yourdomain.com/public_html
# or cd public_html if single domain

# Clone your repository
git clone https://github.com/YOUR_USERNAME/toplinehub-construction.git .

# If directory not empty, create a subdirectory:
# mkdir app
# cd app
# git clone https://github.com/YOUR_USERNAME/toplinehub-construction.git .
```

### 5.3 Install Dependencies

```bash
npm install --production
```

### 5.4 Create Production .env File

```bash
nano .env
```

Paste your production environment variables (from Step 3.2 and 4.2), then:
- Press `Ctrl + X`
- Press `Y` to confirm
- Press `Enter` to save

### 5.5 Initialize Database

```bash
# Run the seed script to create tables and test data
npm run reset

# Or if you want to sync tables without seed data:
# node -e "require('./models').sequelize.sync({alter: true})"
```

---

## Step 6: Configure File Permissions

```bash
# Ensure proper permissions for uploads directory
mkdir -p public/uploads/products
mkdir -p public/uploads/avatars
chmod 755 public/uploads
chmod 755 public/uploads/products
chmod 755 public/uploads/avatars

# Set ownership to web server user
chown -R u123456789:u123456789 public/uploads
```

---

## Step 7: Start the Application

### 7.1 Via Hostinger Node.js Panel

1. Go back to **hPanel** > **Node.js**
2. Find your application
3. Click **"Start Application"** or **"Restart Application"**

### 7.2 Via PM2 (Alternative - If Available)

```bash
npm install -g pm2
pm2 start app.js --name toplinehub
pm2 save
pm2 startup
```

---

## Step 8: Configure Domain & SSL

### 8.1 Point Domain to Hostinger

If you haven't already:
1. Update your domain's nameservers to Hostinger's:
   - `ns1.dns-parking.com`
   - `ns2.dns-parking.com`

2. Or add an A record pointing to Hostinger's IP

### 8.2 Enable SSL Certificate

1. In hPanel, go to **Security** > **SSL/TLS**
2. Select your domain
3. Click **"Install SSL"** (Free Let's Encrypt)
4. Wait 10-15 minutes for activation

### 8.3 Force HTTPS (Recommended)

Create/edit `.htaccess` in your public_html:

```apache
# Force HTTPS
RewriteEngine On
RewriteCond %{HTTPS} off
RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]

# Node.js Application Proxy
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^(.*)$ http://localhost:3000/$1 [P,L]
```

---

## Step 9: Test Your Deployment

### 9.1 Access Your Site

Visit: `https://yourdomain.com`

### 9.2 Test Core Features

- ✅ Homepage loads correctly
- ✅ Login with test accounts:
  - Username: `admin` / Password: `admin2026`
  - Username: `client` / Password: `client2026`
  - Username: `supplier` / Password: `supplier2026`
  - Username: `artisan` / Password: `artisan2026`
- ✅ Browse materials catalog
- ✅ Post a job (as client)
- ✅ Submit a bid (as artisan)
- ✅ Dashboard access

### 9.3 Check Application Logs

```bash
# SSH into server
ssh u123456789@yourdomain.com

# View Node.js logs
cd domains/yourdomain.com/public_html
tail -f logs/app.log

# Or via Hostinger panel
# hPanel > Node.js > Your App > View Logs
```

---

## Step 10: Future Updates & Deployment Workflow

### 10.1 Update Your Code

```bash
# On your local machine
cd "d:\Drew Files\construction"

# Make changes to your code
# Test locally

# Commit and push
git add .
git commit -m "Description of changes"
git push origin main
```

### 10.2 Deploy Updates to Hostinger

```bash
# SSH into server
ssh u123456789@yourdomain.com
cd domains/yourdomain.com/public_html

# Pull latest changes
git pull origin main

# Install any new dependencies
npm install --production

# Restart application
# Via hPanel > Node.js > Restart
# Or via PM2:
pm2 restart toplinehub
```

---

## Step 11: Production Optimizations

### 11.1 Database Connection Pooling

Already configured in `config/database.js`:
```javascript
pool: {
  max: 10,
  min: 0,
  acquire: 30000,
  idle: 10000
}
```

### 11.2 Enable Compression

Add to `app.js` (already recommended):
```javascript
const compression = require('compression');
app.use(compression());
```

### 11.3 Security Headers

Install helmet:
```bash
npm install helmet
```

Add to `app.js`:
```javascript
const helmet = require('helmet');
app.use(helmet());
```

### 11.4 Rate Limiting

Install express-rate-limit:
```bash
npm install express-rate-limit
```

Add to `app.js`:
```javascript
const rateLimit = require('express-rate-limit');
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use('/api/', limiter);
```

---

## Step 12: Backup Strategy

### 12.1 Database Backups

```bash
# SSH into server
mysqldump -u your_db_user -p your_database_name > backup_$(date +%Y%m%d).sql

# Download backup via FTP/SFTP
```

Set up a cron job for automated backups:
```bash
0 2 * * * mysqldump -u your_db_user -pyour_password your_database_name > /home/u123456789/backups/backup_$(date +\%Y\%m\%d).sql
```

### 12.2 File Backups

- Use Hostinger's built-in backup feature
- Or set up automated FTP backups of `/public/uploads`

---

## Troubleshooting

### Issue: Application Won't Start

**Check:**
1. Node.js version compatibility (package.json engines)
2. `.env` file exists and has correct values
3. Database connection credentials are correct
4. Port conflicts (check if port 3000 is available)

**Solution:**
```bash
# View detailed logs
cd /domains/yourdomain.com/public_html
cat logs/error.log

# Test database connection
node -e "require('./config/database').testConnection()"
```

### Issue: Database Connection Failed

**Check:**
1. Database host is correct (not `127.0.0.1` or `localhost`)
2. Database user has correct permissions
3. Firewall allows MySQL connection

**Solution:**
```bash
# Test MySQL connection directly
mysql -h mysql_host -u db_user -p db_name
```

### Issue: File Upload Not Working

**Check:**
1. Upload directories exist and have correct permissions
2. Directory paths are correct for production

**Solution:**
```bash
chmod 755 public/uploads
chown -R u123456789:u123456789 public/uploads
```

### Issue: Session Not Persisting

**Check:**
1. SESSION_SECRET is set in .env
2. Session store configuration

**Solution:**
- Ensure `express-session` is properly configured
- Consider using MySQL session store for persistence

---

## Security Checklist

Before going live:

- [ ] All `.env` files contain production credentials (not test/dev)
- [ ] SESSION_SECRET is a strong random string
- [ ] Database user has minimal required permissions
- [ ] SSL certificate is active and enforced
- [ ] Default test accounts passwords changed or disabled
- [ ] Error messages don't reveal sensitive info
- [ ] File upload restrictions in place (size, type)
- [ ] Rate limiting enabled for API endpoints
- [ ] CORS configured if needed
- [ ] SQL injection protection via Sequelize (already implemented)
- [ ] XSS protection via proper template escaping (EJS)

---

## Support & Resources

- **Hostinger Documentation**: https://support.hostinger.com
- **Node.js Tutorials**: https://support.hostinger.com/en/collections/3667403-node-js
- **GitHub Help**: https://docs.github.com
- **This Project's README**: See `README.md` in repository

---

## Quick Reference Commands

```bash
# SSH Connection
ssh u123456789@yourdomain.com

# Update Application
cd domains/yourdomain.com/public_html
git pull origin main
npm install --production
# Restart via hPanel or PM2

# View Logs
tail -f logs/app.log

# Database Backup
mysqldump -u user -p database > backup.sql

# Check Application Status
pm2 status
# or via hPanel > Node.js

# Environment Variables
cat .env
nano .env
```

---

## Congratulations! 🎉

Your TopLineHub Construction Platform is now live on Hostinger!

**Next Steps:**
1. Update WhatsApp number in constants
2. Configure real payment gateway (M-Pesa)
3. Set up automated backups
4. Monitor application performance
5. Add Google Analytics
6. Configure email notifications

**Access Your Site:**
- Frontend: https://yourdomain.com
- Login: https://yourdomain.com/auth/login
- Admin Dashboard: https://yourdomain.com/dashboard

Happy Building! 🏗️
