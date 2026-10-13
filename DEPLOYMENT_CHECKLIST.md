# 📋 Hostinger Deployment Checklist

Use this checklist to ensure you don't miss any steps during deployment.

---

## ☐ Pre-Deployment (Local Setup)

### Git & GitHub
- [ ] Git is installed and working
- [ ] Created GitHub account
- [ ] Created new repository on GitHub: `toplinehub-construction`
- [ ] Initialized local Git repository
- [ ] Added all files to Git
- [ ] Made initial commit
- [ ] Pushed to GitHub

**Commands:**
```bash
cd "d:\Drew Files\construction"
git init
git add .
git commit -m "Initial commit - TopLineHub Construction Platform"
git remote add origin https://github.com/YOUR_USERNAME/toplinehub-construction.git
git push -u origin main
```

### Environment Files
- [ ] `.env` file exists locally (for development)
- [ ] `.env` file is in `.gitignore` (not uploaded to GitHub)
- [ ] `.env.production` template created (reference only)
- [ ] Sensitive data NOT committed to Git

---

## ☐ Hostinger Account Setup

### Basic Setup
- [ ] Active Hostinger hosting plan (Business or higher)
- [ ] Control panel (hPanel) access confirmed
- [ ] Domain name purchased/connected
- [ ] DNS pointed to Hostinger nameservers

### MySQL Database
- [ ] MySQL database created
- [ ] Database name noted: `________________`
- [ ] Database username noted: `________________`
- [ ] Database password saved securely
- [ ] MySQL host noted: `________________`
- [ ] Database port confirmed: `3306`

**Location:** hPanel > Databases > MySQL Databases

---

## ☐ Node.js Application Setup

### Create Application
- [ ] Node.js application created in hPanel
- [ ] Application mode set to **Production**
- [ ] Node.js version selected: **18.x or 20.x**
- [ ] Application root path set: `/domains/yourdomain.com/public_html`
- [ ] Startup file set to: `app.js`
- [ ] Port auto-assigned by system

**Location:** hPanel > Advanced > Node.js

### Environment Variables
- [ ] `NODE_ENV` = `production`
- [ ] `DB_HOST` = Your MySQL host
- [ ] `DB_NAME` = Your database name
- [ ] `DB_USER` = Your database user
- [ ] `DB_PASS` = Your database password
- [ ] `SESSION_SECRET` = Generated secure string
- [ ] `PORT` = `3000`

**Generate SESSION_SECRET:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## ☐ SSH & Deployment

### SSH Access
- [ ] SSH enabled in hPanel
- [ ] SSH credentials noted
- [ ] Successfully connected via SSH
- [ ] Navigated to application directory

**Commands:**
```bash
ssh u123456789@yourdomain.com
cd domains/yourdomain.com/public_html
```

### Clone & Setup
- [ ] Repository cloned to server
- [ ] Dependencies installed (`npm install --production`)
- [ ] Upload directories created
- [ ] Permissions set correctly
- [ ] Production `.env` file created on server
- [ ] Database initialized (`npm run reset`)

**Commands:**
```bash
git clone https://github.com/YOUR_USERNAME/toplinehub-construction.git .
npm install --production
mkdir -p public/uploads/products public/uploads/avatars
chmod 755 public/uploads -R
nano .env  # Create and edit production environment file
npm run reset
```

---

## ☐ SSL Certificate

- [ ] SSL certificate requested (Free Let's Encrypt)
- [ ] Certificate installed successfully
- [ ] HTTPS working correctly
- [ ] HTTP redirects to HTTPS
- [ ] Green padlock visible in browser

**Location:** hPanel > Security > SSL/TLS

---

## ☐ Application Start

- [ ] Application started via hPanel
- [ ] No error logs visible
- [ ] Application status shows **"Running"**
- [ ] Site accessible via domain

**Location:** hPanel > Node.js > Your App > Start/Restart

---

## ☐ Testing & Verification

### Core Functionality
- [ ] Homepage loads: `https://yourdomain.com`
- [ ] Static assets loading (CSS, JS, images)
- [ ] Login page accessible: `/auth/login`
- [ ] Registration page accessible: `/auth/register`

### Test Accounts Login
- [ ] Admin login works: `admin` / `admin2026`
- [ ] Client login works: `client` / `client2026`
- [ ] Supplier login works: `supplier` / `supplier2026`
- [ ] Artisan login works: `artisan` / `artisan2026`

### Feature Testing
- [ ] Browse materials catalog: `/materials`
- [ ] Browse equipment rentals: `/rentals`
- [ ] View artisan directory: `/fundis`
- [ ] View job board: `/jobs`
- [ ] Access calculator: `/calculator`
- [ ] Dashboard loads: `/dashboard`
- [ ] Post material listing works
- [ ] Post job works
- [ ] Submit bid works
- [ ] Request quote works
- [ ] WhatsApp links working
- [ ] File uploads working

### Performance
- [ ] Page load speed acceptable (<3 seconds)
- [ ] Images loading properly
- [ ] No console errors in browser
- [ ] Mobile responsive working

---

## ☐ Security & Optimization

### Security
- [ ] All test account passwords changed (or disabled)
- [ ] SESSION_SECRET is unique and strong
- [ ] Database user has minimal permissions
- [ ] `.env` file not accessible via browser
- [ ] Error messages don't reveal sensitive info
- [ ] File upload restrictions in place

### Optimization
- [ ] Gzip compression enabled
- [ ] Browser caching configured
- [ ] Static assets cached properly
- [ ] Database queries optimized
- [ ] Images optimized for web

---

## ☐ Production Configuration

### Update Constants
- [ ] WhatsApp number updated in code
- [ ] Company contact details updated
- [ ] Logo/branding updated
- [ ] Email addresses updated
- [ ] Social media links updated

**Files to update:**
- `config/constants.js`
- `views/partials/footer.ejs`
- `views/partials/topbar.ejs`

### Remove Demo Data (Optional)
- [ ] Decided whether to keep or remove test accounts
- [ ] Decided whether to keep or remove demo products
- [ ] Decided whether to keep or remove demo jobs

---

## ☐ Backup Strategy

- [ ] Database backup script configured
- [ ] File backup strategy in place
- [ ] Backup schedule determined
- [ ] Backup restoration tested
- [ ] Off-site backup location confirmed

---

## ☐ Monitoring & Maintenance

### Logging
- [ ] Application logs accessible
- [ ] Error tracking configured
- [ ] Log rotation set up

### Monitoring
- [ ] Uptime monitoring configured
- [ ] Performance monitoring set up
- [ ] Error alerts configured

### Documentation
- [ ] Internal documentation updated
- [ ] Admin credentials stored securely
- [ ] Server access details documented
- [ ] Deployment process documented

---

## ☐ Post-Launch

### Marketing & SEO
- [ ] Google Analytics added
- [ ] Google Search Console configured
- [ ] Sitemap submitted
- [ ] Social media profiles created
- [ ] Initial marketing campaign planned

### Support
- [ ] Support email configured
- [ ] Contact forms tested
- [ ] WhatsApp business number active
- [ ] Support documentation prepared

---

## 🎯 Success Criteria

Your deployment is successful when:

✅ Site is accessible via HTTPS  
✅ All test accounts can login  
✅ All core features working  
✅ No console errors  
✅ Database connected properly  
✅ Files uploading successfully  
✅ WhatsApp integration working  
✅ Mobile responsive  
✅ SSL certificate active  
✅ Backups configured  

---

## 📞 Emergency Contacts

| Service | Contact | Notes |
|---------|---------|-------|
| Hostinger Support | https://support.hostinger.com | 24/7 Live Chat |
| Database Admin | ________________ | Your team |
| Developer | ________________ | Your team |
| Domain Registrar | ________________ | Your registrar |

---

## 📝 Deployment Notes

**Date Deployed:** ________________

**Deployed By:** ________________

**Production URL:** ________________

**GitHub Repository:** ________________

**Database Name:** ________________

**Node.js Version:** ________________

**Additional Notes:**
```
_________________________________________________________________
_________________________________________________________________
_________________________________________________________________
```

---

## ✅ Final Sign-Off

- [ ] All checklist items completed
- [ ] Site fully tested and working
- [ ] Team trained on updates/maintenance
- [ ] Documentation complete
- [ ] Stakeholders notified
- [ ] Launch announcement prepared

**Signed:** ________________  
**Date:** ________________

---

🎉 **Congratulations! Your TopLineHub Construction Platform is LIVE!** 🚀
