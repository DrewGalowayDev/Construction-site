# Deployment Guide for Coolify on Contabo

## 🚀 Quick Start

This guide will help you deploy the TopLine Marketplace application to Coolify on Contabo.

---

## 📋 Prerequisites

1. **Contabo Server** with Coolify installed
2. **Domain name** pointed to your server
3. **MySQL Database** (can be created in Coolify or external)
4. **Paystack Account** for payment processing
5. **Git repository** with your code

---

## 🔧 Step 1: Prepare Your Repository

### 1.1 Commit Docker Files
```bash
git add Dockerfile .dockerignore docker-compose.yml .coolify.yml
git commit -m "Add Docker configuration for Coolify deployment"
git push origin main
```

### 1.2 Files Included
- ✅ `Dockerfile` - Container build instructions
- ✅ `.dockerignore` - Files to exclude from Docker build
- ✅ `docker-compose.yml` - Multi-container setup (app + database)
- ✅ `.coolify.yml` - Coolify-specific configuration

---

## 🗄️ Step 2: Setup Database

### Option A: Using Coolify Database
1. In Coolify dashboard, go to **Databases**
2. Click **+ Add Database**
3. Select **MySQL 8.0**
4. Configure:
   - Name: `topline-db`
   - Root Password: (strong password)
   - Database Name: `construction`
   - User: `topline`
   - Password: (strong password)
5. Click **Deploy**
6. Note the connection details

### Option B: External Database
If using external MySQL (like PlanetScale, AWS RDS, etc.):
1. Create database named `construction`
2. Note the connection details:
   - Host
   - Port
   - Database name
   - Username
   - Password

---

## 🌐 Step 3: Deploy Application in Coolify

### 3.1 Create New Application
1. Login to Coolify dashboard
2. Go to **Applications**
3. Click **+ Add Application**
4. Select **Git Repository**

### 3.2 Configure Git Repository
- **Repository URL:** `https://github.com/yourusername/construction.git`
- **Branch:** `main`
- **Auto Deploy:** ✅ Enabled (optional)

### 3.3 Build Configuration
- **Build Pack:** Docker
- **Dockerfile:** `Dockerfile` (default)
- **Port:** `3000`

### 3.4 Environment Variables
Add the following environment variables in Coolify UI:

#### Application Settings
```env
NODE_ENV=production
PORT=3000
APP_URL=https://yourdomain.com
SESSION_SECRET=your-very-secure-random-string-here-min-32-chars
```

#### Database Configuration
```env
DB_HOST=topline-db  # or external host
DB_PORT=3306
DB_NAME=construction
DB_USER=topline
DB_PASS=your-database-password
```

#### Payment Gateway (Paystack)
```env
PAYSTACK_PUBLIC_KEY=your_paystack_public_key
PAYSTACK_SECRET_KEY=your_paystack_secret_key
PAYSTACK_CURRENCY=KES
```

**Note:** Get your keys from Paystack dashboard

### 3.5 Domain Configuration
1. Go to **Domains** tab
2. Add your domain: `yourdomain.com`
3. Enable **HTTPS** (Let's Encrypt SSL)
4. Coolify will automatically configure SSL certificate

### 3.6 Deploy
1. Click **Deploy** button
2. Monitor build logs
3. Wait for deployment to complete

---

## 🗃️ Step 4: Database Setup

### 4.1 Connect to Database
Using Coolify database terminal or external MySQL client:

```bash
# If using Coolify database
# Open database terminal in Coolify UI
```

### 4.2 Run Database Migrations
The application uses Sequelize ORM which will auto-create tables on first run.

To manually verify or seed data:
1. Access your app container terminal in Coolify
2. Run:
```bash
node config/seed.js
```

---

## 🔍 Step 5: Post-Deployment Checks

### 5.1 Health Check
Visit: `https://yourdomain.com`

Should see the homepage loading correctly.

### 5.2 Test Critical Features
- ✅ Homepage loads
- ✅ User registration works
- ✅ Login works
- ✅ Job posting saves to database
- ✅ Provider signup works
- ✅ Materials listing works
- ✅ Dashboard accessible

### 5.3 Check Logs
In Coolify:
1. Go to **Applications** > Your App
2. Click **Logs** tab
3. Monitor for errors

---

## 🔒 Step 6: Security Configuration

### 6.1 Session Secret
Generate strong session secret:
```bash
# On your local machine
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```
Update `SESSION_SECRET` in environment variables.

### 6.2 Database Security
- Use strong passwords
- Don't expose database port publicly
- Regular backups enabled

### 6.3 SSL/HTTPS
- ✅ Enabled via Coolify
- ✅ Auto-renewal configured
- Force HTTPS redirect (optional)

---

## 📊 Step 7: Monitoring & Maintenance

### 7.1 Application Monitoring
Coolify provides:
- CPU usage
- Memory usage
- Disk usage
- Network traffic

### 7.2 Database Backups
Set up automated backups:
1. Go to **Databases** > Your DB
2. Enable **Automatic Backups**
3. Configure schedule (daily recommended)

### 7.3 Log Monitoring
Check logs regularly for:
- Errors
- Slow queries
- Failed payments
- User issues

---

## 🔄 Step 8: Updates & Redeployment

### Manual Deployment
1. Push changes to Git repository
2. Go to Coolify dashboard
3. Click **Redeploy** button

### Auto Deployment
If auto-deploy enabled:
- Push to `main` branch
- Coolify automatically rebuilds and deploys

---

## 🐛 Troubleshooting

### Issue: Application Won't Start
**Check:**
- Environment variables are set correctly
- Database is running and accessible
- Port 3000 is not blocked
- Check logs for specific errors

### Issue: Database Connection Failed
**Solutions:**
- Verify `DB_HOST`, `DB_USER`, `DB_PASS` are correct
- Check database is running
- Verify network connectivity between containers
- Check firewall rules

### Issue: Sessions Not Persisting
**Solutions:**
- Verify `SESSION_SECRET` is set
- Check MySQL session store is working
- Verify `sessions` table exists

### Issue: Static Files Not Loading
**Check:**
- `/public` directory exists
- CSS/JS files are in `/public/css` and `/public/js`
- Express static middleware configured

### Issue: Payment Not Working
**Check:**
- Paystack keys are correct (test vs live)
- Paystack webhook URL configured
- Network can reach Paystack API

---

## 📱 Step 9: Mobile Testing

After deployment, test on actual devices:
- [ ] iPhone (Safari)
- [ ] Android (Chrome)
- [ ] Tablet
- [ ] Different screen sizes

Test features:
- [ ] Hamburger menu works
- [ ] Forms submit correctly
- [ ] Cards display properly
- [ ] Navigation smooth
- [ ] Buttons touchable

---

## 🌍 Step 10: Domain & DNS

### DNS Configuration
Point your domain to Contabo server:

```
A Record:
Name: @
Value: YOUR_SERVER_IP
TTL: 3600

A Record (www):
Name: www
Value: YOUR_SERVER_IP
TTL: 3600
```

### Verification
```bash
# Check DNS propagation
nslookup yourdomain.com
dig yourdomain.com
```

---

## 📈 Performance Optimization

### 1. Enable Caching
Add to your nginx/reverse proxy config (Coolify does this):
```nginx
location ~* \.(jpg|jpeg|png|gif|ico|css|js)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

### 2. Database Optimization
- Enable query caching
- Add indexes to frequently queried columns
- Regular maintenance

### 3. Application Optimization
- Enable Node.js production mode
- Use PM2 for process management (optional)
- Monitor memory usage

---

## 🔐 Environment Variables Reference

### Required Variables
| Variable | Description | Example |
|----------|-------------|---------|
| `NODE_ENV` | Environment | `production` |
| `PORT` | App port | `3000` |
| `DB_HOST` | Database host | `topline-db` |
| `DB_PORT` | Database port | `3306` |
| `DB_NAME` | Database name | `construction` |
| `DB_USER` | Database user | `topline` |
| `DB_PASS` | Database password | `SecurePass123!` |
| `SESSION_SECRET` | Session encryption key | `64-char-random-string` |
| `APP_URL` | Application URL | `https://yourdomain.com` |

### Optional Variables
| Variable | Description | Example |
|----------|-------------|---------|
| `PAYSTACK_PUBLIC_KEY` | Paystack public key | `pk_live_xxx` |
| `PAYSTACK_SECRET_KEY` | Paystack secret key | `sk_live_xxx` |
| `PAYSTACK_CURRENCY` | Currency code | `KES` |

---

## 📝 Deployment Checklist

### Pre-Deployment
- [ ] Code pushed to Git repository
- [ ] Docker files committed
- [ ] Environment variables documented
- [ ] Database schema ready
- [ ] Domain DNS configured

### During Deployment
- [ ] Coolify application created
- [ ] Git repository connected
- [ ] Environment variables set
- [ ] Database deployed/connected
- [ ] Domain configured
- [ ] SSL enabled

### Post-Deployment
- [ ] Application accessible via domain
- [ ] Database connection working
- [ ] User registration tested
- [ ] Job posting tested
- [ ] Mobile responsive verified
- [ ] SSL certificate active
- [ ] Backups configured
- [ ] Monitoring enabled

---

## 🆘 Support & Resources

### Coolify Documentation
- https://coolify.io/docs

### Contabo Support
- https://contabo.com/support

### Application Issues
- Check application logs in Coolify
- Review error messages
- Test in development environment first

---

## 🎉 Deployment Complete!

Your TopLine Marketplace is now live on Coolify!

**Next Steps:**
1. Test all features thoroughly
2. Monitor application performance
3. Set up automated backups
4. Configure monitoring alerts
5. Plan for scaling if needed

**Application URLs:**
- **Frontend:** https://yourdomain.com
- **Admin:** https://yourdomain.com/dashboard/admin
- **API Health:** https://yourdomain.com/ (check status 200)

---

## 📞 Emergency Contacts

Keep these handy:
- **Server Provider:** Contabo support
- **Domain Registrar:** Your DNS provider
- **Payment Gateway:** Paystack support
- **Backup Location:** Note where backups are stored

---

**Happy Deploying! 🚀**
