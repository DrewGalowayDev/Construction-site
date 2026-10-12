# TopLineHub — Kenyan Construction Platform & Marketplace

A modern, production-grade construction platform built specifically for the Kenyan building and civil engineering sector. TopLineHub connects developers, homeowners, hardware suppliers, plant hire operators, and NCA-verified fundis across all 47 Kenyan counties.

---

## 🌟 Core Features

- **Building Materials Catalog (`/materials`)**: Search, filter by category and county, inspect technical specifications, and connect with hardware suppliers via direct WhatsApp or order checkout.
- **Plant & Heavy Equipment Hire (`/rentals`)**: Browse excavators, concrete mixers, tippers, rollers, and scaffolding with daily/weekly hire rates.
- **Hire Verified Artisans & Fundis (`/fundis`)**: Skilled tradesmen directory covering masonry, plumbing, electrical, carpentry, steel fixing, and painting with NCA accreditation credentials.
- **Tenders & Construction Job Board (`/jobs`)**: Project owners post jobs; registered artisans submit detailed bids with pitch proposals and quotes.
- **Unified Role-Based Dashboard (`/dashboard`)**: Full CRUD operations for Clients, Artisans, Suppliers, Buyers, and Platform Administrators.
- **Live Kenyan Material Estimator (`/calculator`)**: Real-time BOQ quantity calculator for Concrete/Slabs, Stone Walling, Plaster/Screed, and Mabati Roofing Sheets with instant WhatsApp export.
- **Lipa na M-Pesa (STK Push) Engine (`/orders/:id/checkout`)**: Integrated Daraja STK Push workflow with live handset prompts, automatic verification, and receipt generation.
- **KRA eTIMS-Compliant Tax Invoices & BOQ Proforma (`/orders/:id/invoice`, `/calculator/invoice`)**: Professional printable and downloadable tax invoices with 16% VAT and county haulage logistics estimates.
- **47 Counties Coverage**: Full support for all Kenyan counties in location filters, project tenders, supplier catalogs, and transport calculations.

---

## 🛠️ Tech Stack

- **Backend**: Node.js, Express.js (v5)
- **View Engine**: EJS with `express-ejs-layouts`
- **Database & ORM**: MySQL, Sequelize v6
- **Styling**: Bootstrap 5, Custom CSS with cohesive soft border radius system, FontAwesome 5, Bootstrap Icons
- **Payment & Invoicing**: Simulated Safaricom Daraja Lipa na M-Pesa STK Push & eTIMS-ready printable templates

---

## 🚀 Getting Started

### 1. Clone the Repository
```bash
git clone https://github.com/DrewGalowayDev/Construction-site.git
cd Construction-site
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Configuration
Create a `.env` file from `.env.example`:
```env
PORT=3000
NODE_ENV=development
DB_HOST=127.0.0.1
DB_PORT=3306
DB_NAME=construction
DB_USER=root
DB_PASS=your_mysql_password
SESSION_SECRET=your_secret_key
```

### 4. Database Setup
Import the complete MySQL schema and Kenyan seed data:
```bash
mysql -u root -p construction < schema.sql
```
*(Or run `node config/seed.js` after database creation)*

### 5. Start the Server
```bash
node app.js
```
Open `http://localhost:3000` in your browser.

---

## 📄 License
ISC License © 2026 TopLineHub Kenya.
