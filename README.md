# TopLineHub - Kenyan Construction Materials & Artisan Marketplace

![TopLineHub Logo](public/img/favicon.svg)

A comprehensive construction marketplace platform connecting buyers, suppliers, artisans, and project clients in the Kenyan construction industry.

## 🚀 Features

### For Buyers/Clients
- Browse and request quotes for building materials
- Post construction jobs and projects
- Hire verified artisans (fundis) with NCA credentials
- Construction material cost calculator with BOQ generation
- Track orders and job applications

### For Suppliers/Sellers
- List building materials and equipment for sale or rent
- Manage inventory and pricing
- Process incoming quote requests
- Multi-image product galleries

### For Artisans/Fundis
- Create professional profiles with NCA registration
- Browse available construction jobs
- Submit competitive bids and proposals
- Showcase trade skills and experience

### For Administrators
- User verification and moderation
- Platform analytics dashboard
- Listing management
- Role-based access control

## 🛠️ Tech Stack

- **Backend**: Node.js, Express.js v5
- **Frontend**: EJS Templates, Bootstrap 5
- **Database**: MySQL + Sequelize ORM
- **Authentication**: bcryptjs + express-session
- **File Uploads**: Multer
- **Styling**: Custom Bootstrap theme

## 📋 Prerequisites

- Node.js >= 18.0.0
- npm >= 9.0.0
- MySQL >= 5.7 or 8.0

## ⚙️ Installation

### 1. Clone the repository

```bash
git clone https://github.com/YOUR_USERNAME/toplinehub-construction.git
cd toplinehub-construction
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

```bash
cp .env.example .env
```

Edit `.env` with your database credentials:

```env
PORT=3000
NODE_ENV=development
DB_HOST=127.0.0.1
DB_PORT=3306
DB_NAME=construction
DB_USER=root
DB_PASS=your_password_here
SESSION_SECRET=your_session_secret_here
```

### 4. Create database

```bash
mysql -u root -p
CREATE DATABASE construction;
EXIT;
```

### 5. Seed the database

```bash
npm run reset
```

This will:
- Create all tables
- Populate with demo data
- Create test accounts

### 6. Start the server

```bash
npm start
```

Visit: http://localhost:3000

## 🔐 Test Accounts

| Role | Username | Password |
|------|----------|----------|
| Admin | `admin` | `admin2026` |
| Client | `client` | `client2026` |
| Supplier | `supplier` | `supplier2026` |
| Artisan | `artisan` | `artisan2026` |

## 📁 Project Structure

```
construction/
├── config/              # Database & seed configuration
├── controllers/         # Route controllers
├── middleware/          # Auth & upload middleware
├── models/             # Sequelize models
├── public/             # Static assets (CSS, JS, images)
├── routes/             # Express routes
├── views/              # EJS templates
│   ├── layouts/        # Layout templates
│   ├── pages/          # Page views
│   └── partials/       # Reusable components
├── app.js              # Express app entry point
├── .env.example        # Environment template
└── package.json        # Dependencies
```

## 🌍 Deployment

See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed instructions on deploying to:
- Hostinger (Node.js hosting)
- Heroku
- DigitalOcean
- AWS

## 📚 API Routes

### Public Routes
- `GET /` - Homepage
- `GET /materials` - Materials catalog
- `GET /rentals` - Equipment hire
- `GET /fundis` - Artisan directory
- `GET /jobs` - Job board
- `GET /calculator` - Material cost calculator

### Authentication
- `GET /auth/login` - Login page
- `POST /auth/login` - Login handler
- `GET /auth/register` - Registration page
- `POST /auth/register` - Registration handler
- `GET /auth/logout` - Logout

### Protected Routes (Require Login)
- `GET /dashboard` - User dashboard
- `POST /materials/post` - Post material listing
- `POST /jobs/post` - Post job
- `POST /jobs/:id/apply` - Submit bid
- `POST /orders/request/:id` - Request quote

## 🔧 Development

### Run in development mode

```bash
npm run dev
```

Uses nodemon for auto-restart on file changes.

### Reset database

```bash
npm run reset
```

Drops all tables and re-seeds with fresh data.

## 🎨 Customization

### Update WhatsApp Number

Edit `config/constants.js`:

```javascript
module.exports = {
  WHATSAPP_NUMBER: '254711000000', // Update here
  KENYA_COUNTIES: [...]
};
```

### Customize Branding

- Logo: `public/img/favicon.svg`
- Colors: `public/css/style.css`
- Footer: `views/partials/footer.ejs`

### Add Material Categories

Edit `config/seed.js` categories array or add via admin dashboard.

## 🔒 Security

- Passwords hashed with bcryptjs (10 salt rounds)
- Session-based authentication
- SQL injection protection via Sequelize
- XSS protection via EJS auto-escaping
- CSRF protection via flash messages
- Role-based access control

## 📱 Features by Module

### Materials Catalog
- Multi-category filtering
- County-based search
- Quote request system
- WhatsApp instant contact
- Multi-image galleries

### Job Board
- Trade-specific filtering
- Budget range search
- Artisan bidding system
- Proposal management

### Calculator
- Concrete estimation
- Walling calculations
- Roofing material estimates
- BOQ generation
- WhatsApp export

### Dashboard
- Role-specific tabs
- Full CRUD operations
- Order management
- Bid tracking
- Profile updates

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/new-feature`
3. Commit changes: `git commit -m "Add new feature"`
4. Push to branch: `git push origin feature/new-feature`
5. Open a Pull Request

## 📄 License

This project is licensed under the ISC License - see the [LICENSE.txt](LICENSE.txt) file for details.

## 📞 Support

For support, email support@toplinehub.co.ke or open an issue on GitHub.

## 🙏 Acknowledgments

- Bootstrap Team for the UI framework
- Sequelize Team for the ORM
- All contributors and testers

---

**Built with ❤️ for the Kenyan Construction Industry**

🏗️ TopLineHub - Building Kenya Together