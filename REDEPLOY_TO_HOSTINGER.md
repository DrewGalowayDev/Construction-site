# Redeploy New Structure to Hostinger 🚀

## Issue
Hostinger is still showing the old construction site instead of the new TopLine Marketplace.

## Solution: Update Deployment

### Step 1: Push New Structure to GitHub ✅

```bash
# Open terminal in project root
cd "d:\Drew Files\construction"

# Check what files changed
git status

# Add all new files
git add .

# Commit changes
git commit -m "Move TopLine to root - Hostinger deployment structure"

# Push to GitHub
git push origin main
```

---

### Step 2: Update Files on Hostinger Server 🔄

**Option A: Via Hostinger File Manager (Easiest)**

1. Login to Hostinger hPanel
2. Go to **Files** > **File Manager**
3. Navigate to: `/domains/yourdomain.com/public_html`
4. **Delete old files** (backup first if needed):
   - Delete all `.html` files (index.html, about.html, etc.)
   - Delete old `css/`, `js/`, `img/` folders
   - Keep: `.env`, `node_modules/` (if exists)

5. **Upload new files**:
   - Upload `index.js`
   - Upload `package.json`
   - Upload all folders: `config/`, `controllers/`, `models/`, `routes/`, `views/`, `public/`, `middleware/`, `helpers/`

**Option B: Via SSH (Faster)**

```bash
# SSH into your Hostinger server
ssh u123456789@yourdomain.com

# Navigate to app directory
cd domains/yourdomain.com/public_html

# Pull latest changes from GitHub
git pull origin main

# Install/update dependencies
npm install --production

# Exit SSH
exit
```

---

### Step 3: Configure Environment Variables ⚙️

1. Go to hPanel > **Advanced** > **Node.js**
2. Click on your application
3. Click **"Edit Environment Variables"**
4. Update/Add these variables:

```env
NODE_ENV=production
PORT=3000
DB_HOST=your_mysql_host
DB_NAME=u123456789_construction
DB_USER=u123456789_user
DB_PASS=your_database_password
SESSION_SECRET=your_session_secret_here
PAYSTACK_PUBLIC_KEY=pk_live_...
PAYSTACK_SECRET_KEY=sk_live_...
PAYSTACK_CURRENCY=KES
APP_URL=https://yourdomain.com
```

---

### Step 4: Update Application Settings 🔧

1. Still in hPanel > **Node.js** > Your Application
2. Verify settings:
   - **Application Mode**: Production
   - **Application Root**: `/domains/yourdomain.com/public_html`
   - **Application Startup File**: `index.js`
   - **Node.js Version**: 18.x or 20.x

3. Click **"Save"**

---

### Step 5: Restart Application 🔄

1. In hPanel > **Node.js** > Your Application
2. Click **"Restart"** button
3. Wait 30-60 seconds for app to restart

---

### Step 6: Initialize Database 💾

**If database is empty or needs reset:**

```bash
# SSH into server
ssh u123456789@yourdomain.com

# Navigate to app directory
cd domains/yourdomain.com/public_html

# Initialize database (creates tables and seed data)
node config/reset-and-seed.js

# Or just create tables without seed:
node config/seed.js
```

---

### Step 7: Test Your Site! ✅

Visit: `https://yourdomain.com`

**Expected Results:**
- ✅ See TopLine Marketplace homepage (not old construction site)
- ✅ Can browse categories, products, jobs
- ✅ Can register/login
- ✅ Can access dashboards
- ✅ Training payment page works

**Test Login:**
- Register a new account OR
- Use seeded accounts (if you ran reset-and-seed.js):
  - Admin: `admin` / `admin2026`
  - Client: `client` / `client2026`

---

### Step 8: Clean Up Old Files (Optional) 🧹

Remove leftover folders that are no longer needed:

```bash
# SSH into server
ssh u123456789@yourdomain.com

# Navigate to app directory
cd domains/yourdomain.com/public_html

# Remove old structure (if exists)
rm -rf old/
rm -rf topline_website/

# Remove old HTML files (if any remain)
rm -f index.html about.html contact.html appointment.html feature.html 404.html
```

---

## Troubleshooting 🔍

### Issue: Site still shows old pages

**Cause:** Browser cache  
**Solution:**
- Hard refresh: `Ctrl + Shift + R` (Windows) or `Cmd + Shift + R` (Mac)
- Clear browser cache
- Try in incognito/private mode

---

### Issue: "Cannot GET /" or blank page

**Cause:** App not started or crashed  
**Solution:**
1. Check Node.js logs in hPanel
2. Verify `index.js` exists in root
3. Check environment variables are set
4. Restart application

---

### Issue: Database connection error

**Cause:** Wrong database credentials  
**Solution:**
1. Go to hPanel > **Databases** > **MySQL Databases**
2. Copy exact credentials
3. Update environment variables in Node.js panel
4. Restart application

---

### Issue: Static files not loading (CSS/JS/Images)

**Cause:** Static file paths  
**Solution:**
1. Check `public/` folder exists
2. Verify file permissions:
```bash
chmod -R 755 public/
```
3. Check app.js has:
```javascript
app.use(express.static(path.join(__dirname, 'public')));
```

---

## Quick Commands Reference 📝

### Push Updates (Local)
```bash
cd "d:\Drew Files\construction"
git add .
git commit -m "Update message"
git push origin main
```

### Pull & Restart (Server)
```bash
ssh u123456789@yourdomain.com
cd domains/yourdomain.com/public_html
git pull origin main
npm install --production
# Then restart via hPanel
```

### View Logs (Server)
```bash
# Via hPanel: Node.js > View Logs
# Or via SSH:
pm2 logs
# or
tail -f logs/app.log
```

---

## Expected File Structure on Server 📁

```
/domains/yourdomain.com/public_html/
├── index.js               ✅ Main entry point (Hostinger startup file)
├── package.json           ✅ Dependencies
├── .env                   ✅ Environment variables
├── config/                ✅ Database config
├── controllers/           ✅ Route handlers
├── models/                ✅ Database models
├── routes/                ✅ Express routes
├── views/                 ✅ EJS templates
├── public/                ✅ Static files
│   ├── css/
│   ├── js/
│   ├── img/
│   └── uploads/
├── middleware/            ✅ Auth middleware
├── helpers/               ✅ Helper functions
├── migrations/            ✅ Database migrations
└── node_modules/          ✅ Installed packages
```

---

## Success Checklist ✅

- [ ] Pushed new structure to GitHub
- [ ] Pulled changes on Hostinger server
- [ ] Updated environment variables
- [ ] Verified app.js is startup file
- [ ] Restarted Node.js application
- [ ] Initialized database
- [ ] Tested site in browser
- [ ] Can login and access features
- [ ] Training payment page works
- [ ] No 404 errors on main pages

---

## 🎉 Done!

Your TopLine Marketplace should now be live on Hostinger!

Visit: `https://yourdomain.com`

If you still see issues, check the logs in hPanel > Node.js > View Logs

---

**Need help?** Contact Hostinger support or review [DEPLOYMENT.md](DEPLOYMENT.md)
