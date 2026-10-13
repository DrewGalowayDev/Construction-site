# TopLineHub Test Accounts

## Quick Login Credentials

Use these simple credentials to test different user roles in the platform.

### 🔐 Login Instructions
- Go to: http://localhost:3000/auth/login
- Enter the **Username** OR **Email** in the login field (supports both!)
- Enter the **Password** in the password field
- The system will accept both `admin` and `admin@toplinehub.co.ke` formats

---

## Test Accounts

### 👨‍💼 ADMIN Account
- **Username:** `admin`
- **Password:** `admin2026`
- **Role:** Administrator
- **Access:** Full platform management, user verification, moderation
- **Alternative Login:** You can also use full email format if preferred

---

### 🛒 CLIENT Account (Buyer)
- **Username:** `client`
- **Password:** `client2026`
- **Role:** Buyer / Site Owner
- **Access:** Post construction jobs, hire artisans, request material quotes
- **Alternative Login:** You can also use full email format if preferred

---

### 🏪 SUPPLIER Account (Seller)
- **Username:** `supplier`
- **Password:** `supplier2026`
- **Role:** Material Supplier / Equipment Owner
- **Access:** List building materials, post equipment for hire, manage inventory
- **Alternative Login:** You can also use full email format if preferred

---

### 🔨 ARTISAN Account (Fundi)
- **Username:** `artisan`
- **Password:** `artisan2026`
- **Role:** Skilled Tradesperson
- **Access:** Browse job board, submit bids, manage artisan profile
- **Alternative Login:** You can also use full email format if preferred

---

## Setup Instructions

1. **Ensure database is running:**
   ```bash
   # MySQL should be running on localhost:3306
   ```

2. **Seed the database:**
   ```bash
   npm run seed
   ```

3. **Start the server:**
   ```bash
   npm start
   ```

4. **Access the platform:**
   - Homepage: http://localhost:3000
   - Login: http://localhost:3000/auth/login
   - Register: http://localhost:3000/auth/register

---

## Testing Workflows

### As a **CLIENT** (Buyer):
1. Login with `client` / `client2026`
2. Post a construction job at `/jobs/post`
3. Request material quotes at `/materials`
4. Hire artisans from `/fundis`
5. View your dashboard at `/dashboard`

### As a **SUPPLIER** (Seller):
1. Login with `supplier` / `supplier2026`
2. List materials at `/materials/post`
3. List equipment for hire at `/materials/post?type=rental`
4. View incoming orders at `/dashboard?tab=supplier`
5. Process quote requests

### As an **ARTISAN** (Fundi):
1. Login with `artisan` / `artisan2026`
2. Browse jobs at `/jobs`
3. Submit proposals/bids on projects
4. View your bids at `/dashboard?tab=artisan`
5. Update your profile and NCA details

### As an **ADMIN**:
1. Login with `admin` / `admin2026`
2. Access admin panel at `/dashboard?tab=admin`
3. Verify/unverify users
4. Moderate listings and jobs
5. View platform analytics

---

## Additional Demo Accounts

The seed also creates additional demo users:
- John Mwangi (Master Mason) - Pre-filled artisan with NCA cert
- Peter Omondi (Certified Electrician) - Pre-filled artisan with EPRA license
- Apex Plant & Equipment Hire - Additional equipment supplier

---

## Notes

- All test accounts are pre-verified (`is_verified: true`)
- Phone numbers are Kenyan format (254xxx)
- Passwords are hashed using bcryptjs
- Session persists for 1 week by default
- WhatsApp integration uses test number: +254711000000

---

**Last Updated:** January 2026  
**Platform:** TopLineHub Construction Marketplace
