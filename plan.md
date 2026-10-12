# TopLineHub Construction Platform — Master Project Plan

> **Project Goal**: Convert a static construction website template into a dynamic, production-ready Kenyan construction platform where users can:
> 1. **Hire or buy construction materials** & heavy plant/equipment
> 2. **Post materials & equipment** for sale or rental (Vendor/Supplier portal)
> 3. **Post construction jobs & tenders** (Client/Site Owner portal)
> 4. **Look for jobs & submit proposals/bids** (Artisan/Contractor portal)
> 5. **Hire verified artisans & fundis** (Directory with NCA credentials, ratings, and direct contact)

---

## 1. Architecture & Tech Stack

| Component | Technology / Library |
| :--- | :--- |
| **Backend Engine** | Node.js (CommonJS), Express.js (v5.x) |
| **View Engine** | EJS + `express-ejs-layouts` (reusable layouts, partials, cards) |
| **Database & ORM** | MySQL + Sequelize ORM v6 (`models/index.js`) |
| **Sessions & Flash** | `express-session`, `connect-flash`, `bcryptjs` for password hashing |
| **Frontend Styling** | Custom Bootstrap 5 Construction Theme, FontAwesome icons, WOW.js animations |
| **Local Communication** | Direct WhatsApp click-to-chat integration for Kenyan market trades |

---

## 2. Current Implementation Audit

### ✅ What Has Been Completed So Far
- **Database Architecture (`models/index.js`)**:
  - `User`: Roles (`buyer`, `seller`, `artisan`, `admin`), hashed passwords, county/town locations.
  - `Category`: Material & rental categories (Masonry, Aggregates, Plumbing, Electrical, Equipment, etc.).
  - `Product`: For materials & plant hire (`is_rental: true/false`, price, unit, stock, location).
  - `ArtisanProfile`: Trade specializations, NCA registration, experience, daily rate, rating.
  - `JobPost`: Project title, scope, budget estimate, county/town, trade required, status.
  - `JobApplication`: Bids submitted by artisans with proposed amounts and pitch notes.
  - `OrderRequest`: Material quote and supply requests with delivery address and contact phone.
- **Seeding Engine (`config/seed.js`)**:
  - Comprehensive seed data for Kenyan construction context (cement, quarry stones, excavators, vetted fundis, active site jobs).
- **Core Views & Routes**:
  - **Home (`/`)**: Landing page showcasing featured materials, equipment hire, and top fundis.
  - **Building Materials Catalog (`/materials`)**: Search & county/category filters, WhatsApp links, and quote action.
  - **Plant & Equipment Hire (`/rentals`)**: Heavy machinery display, daily rate calculation, booking modals.
  - **Order / Quote Request (`/orders/request/:productId`)**: Multi-step quote form saving into `OrderRequest`.
  - **Hire Fundi Directory (`/fundis`)**: Skilled tradesmen directory with NCA badges and WhatsApp instant connect.
  - **Job Board (`/jobs`)**: Active construction gigs with modal to submit artisan bids.
  - **Post Job Page (`/jobs/post`)**: Working client form to publish new building projects.
  - **Authentication (`/auth/login`, `/auth/register`)**: Registering buyers, suppliers, and fundis.

---

### ⏳ Missing & In-Progress Modules (Next Priorities)

```
[x] Phase 1: Post Materials & Equipment Listing Module
    ├── Route & View: GET /materials/post & views/pages/post-material.ejs
    ├── Controller: catalogController.postMaterial (create Product with is_rental toggle)
    └── Navigation: Add "Post Material / Equipment" link to navbar and catalog page

[x] Phase 2: Client Project Bid Review
    ├── View received bids/proposals on posted jobs
    └── Status workflow: pending -> shortlisted -> accepted -> declined

[x] Phase 3: Unified User Dashboard (/dashboard)
    ├── Client tab: "My Posted Projects" + Received artisan bids
    ├── Artisan tab: "My Submitted Bids" + Profile details
    ├── Supplier/Seller tab: "My Listed Materials/Equipment" + Incoming quote inquiries
    └── General: Profile settings and status badges

[x] Phase 4: Enhanced Search & Filtering
    ├── Filter jobs by county, trade category, and budget range
    ├── Filter equipment rentals by type, daily rate range, and county
    └── Empty state optimizations across all catalog and gig listings

[x] Phase 5: Comprehensive Role-Based CRUD on Dashboards (/dashboard)
    ├── Client CRUD: Edit Job Modal, Delete Job, Update Status, Review & Status Workflow on Artisan Bids
    ├── Artisan CRUD: Edit Pending Bid Modal, Withdraw/Delete Bid, WhatsApp & Call Client Connect
    ├── Supplier CRUD: Edit Product Modal, Delete Listing, Toggle Active/Pause, Process Incoming Orders
    ├── Buyer CRUD: Review Quotes & Orders, Cancel Pending Quote Request
    ├── Admin CRUD: Verify/Revoke Users, Change Roles, Delete Any Listing/Job, Real-Time Trade KPIs
    └── Profile CRUD: Update Avatar Upload, Contact, Location, and NCA Accreditation
```

---

## 3. Step-by-Step Execution Plan

### Step 1: Implement "Post Materials & Equipment" (Vendor / Supplier Portal) ✅
* **Objective**: Allow suppliers and machinery owners to list cement, quarry ballast, steel, excavators, tippers, scaffolding, etc.
* **Tasks**:
  1. [x] Add route in `routes/catalog.js`: `router.get('/materials/post', ...)` and `router.post('/materials/post', ...)`.
  2. [x] Implement `catalogController.getPostMaterial` and `catalogController.postMaterial`.
  3. [x] Create view `views/pages/post-material.ejs` matching the site's industrial theme.
  4. [x] Include options for: Sale Material vs. Plant Hire, Category, Pricing Unit (per bag, per tonne, per day, per trip), Location County, and Image URL.
  5. [x] Add link in `views/partials/navbar.ejs` and on `/materials` banner.

### Step 2: Implement User Dashboard (`/dashboard`) ✅
* **Objective**: A central hub where logged-in users see everything related to their activities.
* **Tasks**:
  1. [x] Add `routes/dashboard.js` & `controllers/dashboardController.js`.
  2. [x] For **Clients**: List their jobs posted via `JobPost.findAll({ where: { client_id } })` with bids count and proposal details.
  3. [x] For **Artisans**: List applications via `JobApplication.findAll({ where: { artisan_id } })`.
  4. [x] For **Suppliers**: List products posted and quote orders received via `OrderRequest`.

### Step 3: Job Proposals Review by Clients ✅
* **Objective**: Allow clients who posted a job to view artisan bids and approve or contact the fundi directly via WhatsApp/Phone.
* **Tasks**:
  1. [x] Add status workflow route `/jobs/:jobId/bids/:bidId/status` and show bids directly in the Client Dashboard tab.
  2. [x] Add one-click "Contact via WhatsApp" for each applicant bid with contextual project message.

### Step 4: Polish Navigation, Modals & Mobile Responsiveness ✅
* **Objective**: Make the entire platform cohesive and intuitive for mobile and desktop site managers.
* **Tasks**:
  1. [x] Ensure Topbar and Navbar links dynamically highlight active routes.
  2. [x] Add Quick Action buttons on Navbar:
     - **Post Project** (Client)
     - **List Materials** (Seller)
     - **My Dashboard** (Logged in user)
  3. [x] Search, county, and category filters implemented across jobs, materials, and equipment hire.

---

## 4. Work Tracking Checklist

- [x] Database Schema & Relations defined in Sequelize
- [x] Template partials (Topbar, Navbar, Footer, Flash messages)
- [x] Material Catalog (`/materials`) & Equipment Hire (`/rentals`)
- [x] Material Order / Quote Checkout (`/orders/request/:id`)
- [x] Artisan / Fundi directory (`/fundis`) with WhatsApp callouts
- [x] Client Job Post Form (`/jobs/post`)
- [x] Artisan Job Board & Bidding modal (`/jobs`)
- [x] User Login & Registration with roles (`buyer`, `seller`, `artisan`)
- [x] Post Material / Plant Equipment form (`/materials/post`)
- [x] Client review of bids on their posted jobs (`/dashboard`)
- [x] User Dashboard (`/dashboard`) for jobs, bids, material orders, and profile
- [x] Category, Trade, and County filters refinement across all listings
- [x] Dedicated Product & Machinery Detail Page (`/materials/:id`) with related items
- [x] Dedicated Artisan Profile & Portfolio Page (`/fundis/:id`) with direct booking brief
- [x] Administrator Operations Console (`/dashboard?tab=admin`) with user verification & moderation
- [x] Modular Model Architecture (`models/*.js`) & Standalone MySQL Schema Script (`schema.sql`)
- [x] Phase 6: Live Kenyan Construction Material Calculator (`/calculator`) for concrete, stones, plaster & mabati with instant BOQ & WhatsApp quote export
- [x] Phase 7: Cohesive Modern Border Radius & Soft Corners System across all cards, containers, buttons, inputs, dropdowns, and modals
- [x] Phase 8: Lipa na M-Pesa (STK Push) Daraja Simulation & Kenyan Printable eTIMS Tax Invoice & BOQ Proforma Engine (`/orders/:id/checkout`, `/orders/:id/invoice`, `/calculator/invoice`)

