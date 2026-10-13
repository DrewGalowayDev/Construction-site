# 🚀 Push to GitHub - Quick Guide

Follow these steps to upload your code to GitHub.

---

## Step 1: Create GitHub Repository

1. Go to https://github.com/new
2. **Repository name**: `toplinehub-construction` (or your choice)
3. **Description**: "Kenyan Construction Materials & Artisan Marketplace"
4. **Visibility**: Choose Public or Private
5. **DO NOT** check "Add a README file" (we already have one)
6. Click **"Create repository"**

---

## Step 2: Verify Git Status

Open PowerShell or Command Prompt and run:

```powershell
cd "d:\Drew Files\construction"
git status
```

You should see new files ready to commit:
- DEPLOYMENT.md
- README.md
- HOSTINGER_SETUP.md
- .htaccess
- .gitignore
- .env.production
- DEPLOYMENT_CHECKLIST.md
- GITHUB_PUSH.md

---

## Step 3: Commit Changes

```powershell
git add .
git commit -m "Prepare for Hostinger deployment - Add deployment guides and configs"
```

---

## Step 4: Add GitHub Remote

Replace `YOUR_USERNAME` with your actual GitHub username:

```powershell
git remote add origin https://github.com/YOUR_USERNAME/toplinehub-construction.git
```

---

## Step 5: Push to GitHub

```powershell
git push -u origin main
```

**Note:** If prompted for authentication:
- Use your GitHub username
- Use a **Personal Access Token** (not password)
- Generate token at: https://github.com/settings/tokens

---

## Step 6: Verify Upload

1. Go to your repository on GitHub
2. Refresh the page
3. You should see all your files uploaded

---

## ✅ Success!

Your code is now on GitHub and ready for Hostinger deployment!

**Next Steps:**
1. Follow [HOSTINGER_SETUP.md](HOSTINGER_SETUP.md) for quick deployment
2. Or see [DEPLOYMENT.md](DEPLOYMENT.md) for detailed instructions
3. Use [DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md) to track progress

---

## 🔄 Future Updates

When you make changes:

```powershell
# Check what changed
git status

# Stage changes
git add .

# Commit with message
git commit -m "Description of changes"

# Push to GitHub
git push origin main
```

---

## 🆘 Common Issues

### "remote origin already exists"
```powershell
git remote remove origin
git remote add origin https://github.com/YOUR_USERNAME/toplinehub-construction.git
```

### Authentication failed
- Generate a Personal Access Token at: https://github.com/settings/tokens
- Select scopes: `repo` (full control of private repositories)
- Use the token instead of your password

### Need to change remote URL
```powershell
git remote set-url origin https://github.com/YOUR_USERNAME/toplinehub-construction.git
```

---

**Ready to deploy! 🎉**
