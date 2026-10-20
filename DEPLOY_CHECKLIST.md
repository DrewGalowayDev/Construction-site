# 🚀 Coolify Deployment Checklist

Quick reference for deploying to Coolify on Contabo.

---

## ✅ Pre-Deployment (Do These First)

### 1. Code Preparation
- [ ] All code committed to Git
- [ ] `.env` added to `.gitignore`
- [ ] Docker files committed:
  - [ ] `Dockerfile`
  - [ ] `.dockerignore`
  - [ ] `docker-compose.yml`
  - [ ] `.coolify.yml`
- [ ] Code pushed to GitHub/GitLab

### 2. Credentials Ready
- [ ] Database credentials
- [ ] Session secret generated
- [ ] Paystack API keys (test or live)
- [ ] Domain name ready

### 3. Server Setup
- [ ] Coolify installed on Contabo
- [ ] Server accessible via SSH
- [ ] Domain DNS configured

---

## 🗄️ Database Setup in Coolify

- [ ] Create MySQL database
- [ ] Note database name: `construction`
- [ ] Note database user
- [ ] Note database password
- [ ] Note database host

---

## 🌐 Application Deployment

### 1. Create Application
- [ ] New Application in Coolify
- [ ] Git repository connected
- [ ] Branch selected: `main`
- [ ] Build Pack: Docker

### 2. Environment Variables

Copy these to Coolify UI:

```env
NODE_ENV=production
PORT=3000
APP_URL=https://yourdomain.com

# Database (update with your values)
DB_HOST=topline-db
DB_PORT=3306
DB_NAME=construction
DB_USER=topline
DB_PASS=YOUR_PASSWORD_HERE

# Session (generate new secret)
SESSION_SECRET=YOUR_64_CHAR_SECRET_HERE

# Paystack (get from dashboard)
PAYSTACK_PUBLIC_KEY=pk_live_xxx_OR_pk_test_xxx
PAYSTACK_SECRET_KEY=sk_live_xxx_OR_sk_test_xxx
PAYSTACK_CURRENCY=KES
```

### 3. Domain Configuration
- [ ] Domain added: `yourdomain.com`
- [ ] HTTPS enabled
- [ ] SSL certificate active

### 4. Deploy
- [ ] Click Deploy button
- [ ] Monitor build logs
- [ ] Wait for "Deployed" status

---

## 🧪 Post-Deployment Testing

### Basic Tests
- [ ] Homepage loads: `https://yourdomain.com`
- [ ] No console errors
- [ ] CSS/JS loading correctly
- [ ] Images loading

### Feature Tests
- [ ] User registration works
- [ ] Login works
- [ ] Job posting saves to database
- [ ] Provider signup works
- [ ] Materials page loads
- [ ] Dashboard accessible
- [ ] Admin panel accessible

### Mobile Tests
- [ ] Hamburger menu works
- [ ] Cards display properly
- [ ] Forms submit correctly
- [ ] Buttons are touchable
- [ ] Navigation smooth

### Payment Test (if configured)
- [ ] Paystack initializes
- [ ] Payment modal opens
- [ ] Test transaction works

---

## 📊 Monitoring Setup

- [ ] Check CPU usage
- [ ] Check memory usage
- [ ] Check disk space
- [ ] Enable health checks
- [ ] Configure alerts (optional)

---

## 💾 Backup Configuration

- [ ] Database backups enabled
- [ ] Backup schedule set (daily)
- [ ] Backup location confirmed
- [ ] Test restore process

---

## 🔐 Security Checklist

- [ ] Strong database password
- [ ] Session secret is random and secure
- [ ] HTTPS enforced
- [ ] Database not exposed publicly
- [ ] Environment variables not in code
- [ ] `.env` in `.gitignore`

---

## 🐛 If Something Goes Wrong

### Application won't start?
```bash
# Check Coolify logs
# Look for these common issues:
1. Missing environment variables
2. Database connection failed
3. Port conflict
4. Build failed
```

### Can't connect to database?
```bash
# Verify in Coolify:
1. Database is running
2. DB_HOST matches database service name
3. DB credentials are correct
4. Network connectivity
```

### 502 Bad Gateway?
```bash
# Usually means:
1. App crashed on startup
2. Wrong port configuration
3. Health check failing
```

---

## 📝 Environment Variables Quick Reference

| Variable | Required | Example | Where to Get |
|----------|----------|---------|--------------|
| `NODE_ENV` | ✅ | `production` | Set manually |
| `PORT` | ✅ | `3000` | Set manually |
| `APP_URL` | ✅ | `https://domain.com` | Your domain |
| `DB_HOST` | ✅ | `topline-db` | Coolify DB service |
| `DB_PORT` | ✅ | `3306` | Default MySQL |
| `DB_NAME` | ✅ | `construction` | Set in Coolify |
| `DB_USER` | ✅ | `topline` | Set in Coolify |
| `DB_PASS` | ✅ | `SecurePass123!` | Generate strong |
| `SESSION_SECRET` | ✅ | `64-char-string` | Generate random |
| `PAYSTACK_PUBLIC_KEY` | ⚠️ | `pk_live_xxx` | Paystack dashboard |
| `PAYSTACK_SECRET_KEY` | ⚠️ | `sk_live_xxx` | Paystack dashboard |
| `PAYSTACK_CURRENCY` | ⚠️ | `KES` | Set manually |

⚠️ = Required for payment features

---

## 🎯 Success Criteria

Your deployment is successful when:

✅ Application loads at your domain
✅ HTTPS is working (padlock icon)
✅ Users can register and login
✅ Jobs can be posted and saved
✅ Dashboards are accessible
✅ Mobile responsive works
✅ No errors in logs
✅ Database is connected
✅ All pages load correctly

---

## 🚨 Emergency Rollback

If deployment fails:

1. **Quick Rollback:**
   - Go to Coolify
   - Click "Rollback to Previous"
   - Wait for rollback complete

2. **Manual Fix:**
   - Fix issue in code
   - Commit and push
   - Redeploy from Coolify

3. **Database Restore:**
   - Go to Databases
   - Find latest backup
   - Click "Restore"

---

## 📞 Support Resources

- **Coolify Docs:** https://coolify.io/docs
- **Contabo Support:** https://contabo.com/support
- **Application Logs:** Check in Coolify UI
- **Database Logs:** Check in Coolify UI

---

## 🎉 Deployment Complete!

Once all checkboxes are ticked:

1. Announce to team
2. Update documentation
3. Monitor for first 24 hours
4. Celebrate! 🎊

---

**Last Updated:** $(date)
**Deployed By:** [Your Name]
**Environment:** Production
