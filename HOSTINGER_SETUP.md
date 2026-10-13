# Quick Hostinger Setup Guide

## 🚀 Fast Track Deployment (30 minutes)

### Step 1: Push to GitHub (5 min)

```bash
cd "d:\Drew Files\construction"
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/toplinehub-construction.git
git push -u origin main
```

### Step 2: Create MySQL Database (5 min)

1. Login to Hostinger hPanel
2. Go to **Databases** > **MySQL Databases**
3. Click **"Create New Database"**
4. Note credentials:
   - Host: `mysql_host.hostinger.com`
   - Database: `u123456789_construction`
   - Username: `u123456789_user`
   - Password: `[generated]`

### Step 3: Set Up Node.js (10 min)

1. In hPanel, go to **Advanced** > **Node.js**
2. Click **"Create Application"**
3. Configure:
   - **Mode**: Production
   - **Node Version**: 18.x or 20.x
   - **App Root**: `/domains/yourdomain.com/public_html`
   - **Startup File**: `app.js`
   - **Port**: Auto-assigned

4. **Add Environment Variables**:
   ```
   NODE_ENV=production
   DB_HOST=your_mysql_host
   DB_NAME=u123456789_construction
   DB_USER=u123456789_user
   DB_PASS=your_password
   SESSION_SECRET=run_this_command_below_to_generate
   ```

   **Generate SESSION_SECRET**:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

### Step 4: Deploy Application (10 min)

```bash
# SSH into server
ssh u123456789@yourdomain.com

# Navigate to app directory
cd domains/yourdomain.com/public_html

# Clone repository
git clone https://github.com/YOUR_USERNAME/toplinehub-construction.git .

# Install dependencies
npm install --production

# Create uploads directories
mkdir -p public/uploads/products
mkdir -p public/uploads/avatars
chmod 755 public/uploads -R

# Initialize database
npm run reset

# Start app via hPanel Node.js panel (click Start/Restart)
```

### Step 5: Enable SSL (Auto)

1. Go to **Security** > **SSL/TLS**
2. Click **"Install SSL"** (Free)
3. Wait 10 minutes for activation

### Step 6: Test Your Site! ✅

Visit: `https://yourdomain.com`

Login with test accounts:
- **Admin**: `admin` / `admin2026`
- **Client**: `client` / `client2026`
- **Supplier**: `supplier` / `supplier2026`
- **Artisan**: `artisan` / `artisan2026`

---

## 🔄 Update Your Site (Future)

```bash
# On local machine
git add .
git commit -m "Update message"
git push origin main

# On server (SSH)
cd domains/yourdomain.com/public_html
git pull origin main
npm install --production
# Restart via hPanel Node.js panel
```

---

## 🆘 Common Issues

### App won't start?
- Check environment variables in hPanel
- View logs: hPanel > Node.js > View Logs
- Ensure database credentials are correct

### Database connection failed?
- Use remote MySQL host (not localhost)
- Check firewall allows MySQL connections
- Verify user has correct permissions

### Uploads not working?
```bash
chmod 755 public/uploads -R
chown u123456789:u123456789 public/uploads -R
```

---

## 📞 Need Help?

1. Check full guide: [DEPLOYMENT.md](DEPLOYMENT.md)
2. Hostinger Support: https://support.hostinger.com
3. Review logs via SSH or hPanel

---

**🎉 Your site is live! Happy building!**
