# TopLine Marketplace

A comprehensive construction and service providers marketplace platform for Kenya, connecting clients with verified artisans, suppliers, and service providers.

## 🌟 Features

### For Clients
- **Post Jobs** - Describe your project and get competitive quotes
- **Browse Providers** - Find verified service providers in your area
- **Order Materials** - Purchase construction materials online
- **Secure Payments** - Pay safely via M-PESA integration
- **Track Applications** - View and manage provider applications

### For Providers/Artisans
- **Create Profile** - Showcase your skills and experience
- **Browse Jobs** - Find jobs matching your expertise
- **Submit Bids** - Send competitive quotes to clients
- **Build Reputation** - Earn ratings and reviews
- **Training Portal** - Access professional development resources

### For Suppliers
- **List Products** - Showcase construction materials
- **Manage Inventory** - Track stock and pricing
- **Receive Orders** - Get notified of new orders
- **Delivery Management** - Coordinate deliveries

### Admin Features
- **User Management** - Manage all platform users
- **Provider Verification** - Verify and approve providers
- **Job Monitoring** - Oversee all job postings
- **Payment Tracking** - Monitor transactions
- **Analytics Dashboard** - View platform statistics

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- MySQL 8.0+
- npm or yarn

### Local Development

1. **Clone the repository**
```bash
git clone https://github.com/yourusername/construction.git
cd construction
```

2. **Install dependencies**
```bash
npm install
```

3. **Setup environment variables**
```bash
cp .env.example .env
# Edit .env with your database credentials
```

4. **Start the application**
```bash
npm run dev
```

5. **Access the application**
- Frontend: http://localhost:3000
- Admin: http://localhost:3000/dashboard/admin

## 🐳 Docker Deployment

### Local Docker Setup

#### Windows
```bash
docker-start.bat
```

#### Linux/Mac
```bash
chmod +x docker-start.sh
./docker-start.sh
```

### Manual Docker Commands
```bash
# Build and start
docker-compose up -d

# View logs
docker-compose logs -f

# Stop containers
docker-compose down

# Restart
docker-compose restart
```

## ☁️ Deploy to Coolify (Contabo)

Complete deployment guide: See [DEPLOYMENT_COOLIFY.md](./DEPLOYMENT_COOLIFY.md)

### Quick Deploy Steps:
1. Push code to Git repository
2. Create application in Coolify
3. Set environment variables
4. Deploy!

### Environment Variables Required:
```env
NODE_ENV=production
PORT=3000
DB_HOST=your-db-host
DB_NAME=construction
DB_USER=your-db-user
DB_PASS=your-db-password
SESSION_SECRET=your-secure-secret
PAYSTACK_PUBLIC_KEY=your-key
PAYSTACK_SECRET_KEY=your-key
APP_URL=https://yourdomain.com
```

## 📱 Mobile Responsive

The application is fully responsive with:
- ✅ Edge-to-edge cards on mobile
- ✅ Hamburger menu for dashboards
- ✅ Touch-friendly buttons (48px minimum)
- ✅ Optimized layouts for all screen sizes
- ✅ Tested on iOS and Android

## 🔒 Security Features

- Bcrypt password hashing
- Session-based authentication
- SQL injection protection (Sequelize ORM)
- CSRF protection
- Environment variable security
- Secure payment processing (Paystack)

## 🗄️ Database Schema

Main tables:
- `users` - All platform users
- `job_posts` - Client job postings
- `job_applications` - Provider applications
- `artisan_profiles` - Provider profiles
- `products` - Material listings
- `order_requests` - Material orders
- `transactions` - Payment records
- `wallets` - User wallets

## 🛠️ Tech Stack

**Backend:**
- Node.js
- Express.js
- MySQL
- Sequelize ORM
- Express Session

**Frontend:**
- EJS Templates
- Vanilla JavaScript
- Font Awesome Icons
- Responsive CSS

**Payment:**
- Paystack API (M-PESA)

**Deployment:**
- Docker
- Docker Compose
- Coolify

## 📂 Project Structure

```
construction/
├── config/           # Database and app configuration
├── controllers/      # Route controllers
├── models/          # Database models (Sequelize)
├── routes/          # Express routes
├── views/           # EJS templates
│   ├── dashboard/   # Dashboard pages
│   ├── partials/    # Reusable components
│   └── *.ejs        # Public pages
├── public/          # Static assets
│   ├── css/         # Stylesheets
│   ├── js/          # Client-side JavaScript
│   └── img/         # Images
├── middleware/      # Express middleware
├── helpers/         # Utility functions
├── uploads/         # User uploads
├── Dockerfile       # Docker configuration
├── docker-compose.yml
└── index.js         # Application entry point
```

## 🧪 Testing

### Test User Accounts
```
# Client
Email: client@test.com
Password: password123

# Provider
Email: provider@test.com
Password: password123

# Admin
Email: admin@test.com
Password: admin123
```

### API Testing
```bash
# Health check
curl http://localhost:3000

# Test database connection
curl http://localhost:3000/dashboard/client
```

## 📊 API Endpoints

### Jobs
- `GET /jobs` - View jobs page
- `POST /jobs/create` - Create job post
- `POST /jobs/:id/apply` - Apply to job
- `GET /jobs/:id` - View job details

### Providers
- `GET /providers` - Providers page
- `POST /providers/request` - Request a provider
- `POST /providers/signup` - Provider signup

### Materials
- `GET /materials` - Materials page
- `POST /materials/supplier-signup` - Supplier signup

### Dashboard
- `GET /dashboard/client` - Client dashboard
- `GET /dashboard/provider` - Provider dashboard
- `GET /dashboard/admin` - Admin dashboard

## 🔧 Configuration

### Database Configuration
Edit `config/database.js` for database settings.

### Session Configuration
Edit `index.js` for session settings.

### Payment Configuration
Set Paystack keys in `.env` file.

## 🐛 Troubleshooting

### Database Connection Issues
```bash
# Check MySQL is running
mysql -u root -p

# Verify credentials in .env
DB_HOST=127.0.0.1
DB_USER=root
DB_PASS=your_password
```

### Port Already in Use
```bash
# Change port in .env
PORT=3001

# Or kill process on port 3000
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Linux/Mac
lsof -ti:3000 | xargs kill -9
```

### Docker Issues
```bash
# Reset Docker environment
docker-compose down -v
docker-compose up --build

# View logs
docker-compose logs -f app
```

## 📝 Development

### Adding New Features
1. Create model in `models/`
2. Create routes in `routes/`
3. Create controller in `controllers/`
4. Create views in `views/`
5. Update navigation in partials

### Code Style
- Use ES6+ features
- Follow existing naming conventions
- Comment complex logic
- Keep functions small and focused

## 🚢 Production Deployment

See [DEPLOYMENT_COOLIFY.md](./DEPLOYMENT_COOLIFY.md) for complete guide.

### Pre-deployment Checklist
- [ ] Environment variables set
- [ ] Database migrated
- [ ] SSL certificate configured
- [ ] Domain DNS configured
- [ ] Backups enabled
- [ ] Monitoring configured

## 📄 License

ISC

## 👥 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open Pull Request

## 📞 Support

For issues and questions:
- Create an issue on GitHub
- Email: support@toplinemarketplace.co.ke

## 🙏 Acknowledgments

- Font Awesome for icons
- Paystack for payment processing
- Coolify for deployment platform
- Node.js community

---

**Built with ❤️ for the Kenyan construction industry**
