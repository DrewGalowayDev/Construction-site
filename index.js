require('dotenv').config();
const path = require('path');
const express = require('express');
const expressLayouts = require('express-ejs-layouts');
const session = require('express-session');
const flash = require('connect-flash');
const morgan = require('morgan');

const { testConnection, sequelize } = require('./config/database');
const { Category } = require('./models');

// Routes
const indexRoutes = require('./routes/index');
const catalogRoutes = require('./routes/catalog');
const fundisRoutes = require('./routes/fundis');
const jobRoutes = require('./routes/jobs');
const orderRoutes = require('./routes/orders');
const authRoutes = require('./routes/auth');
const dashboardRoutes = require('./routes/dashboard');
const walletRoutes = require('./routes/wallet');

const app = express();
const PORT = process.env.PORT || 3000;

// Connect to Database
testConnection();

// Middlewares
app.use(morgan('dev'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Static Files
app.use(express.static(path.join(__dirname, 'public')));

// Session Configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'toplinehub_construction_sec_key_2026_ke',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 1000 * 60 * 60 * 24 * 7 // 1 week
  }
}));

app.use(flash());

// View Engine (EJS & Layouts)
app.use(expressLayouts);
app.set('layout', 'layouts/main');
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

const { KENYA_COUNTIES } = require('./config/constants');

// Global Template Variables
app.use(async (req, res, next) => {
  res.locals.user = req.session.user || null;
  res.locals.messages = req.flash();
  res.locals.currentPath = req.path;
  res.locals.counties = KENYA_COUNTIES;
  res.locals.kenyaCounties = KENYA_COUNTIES;
  
  // Load user's wallet balance
  if (req.session.user) {
    try {
      const { Wallet } = require('./models');
      const wallet = await Wallet.findOne({ where: { user_id: req.session.user.id } });
      res.locals.userWallet = wallet;
    } catch (err) {
      res.locals.userWallet = null;
    }
  } else {
    res.locals.userWallet = null;
  }
  
  try {
    res.locals.categories = await Category.findAll();
  } catch (err) {
    res.locals.categories = [];
  }
  next();
});

// Mount Routes
app.use('/', indexRoutes);
app.use('/', catalogRoutes);
app.use('/', fundisRoutes);
app.use('/', jobRoutes);
app.use('/', orderRoutes);
app.use('/', dashboardRoutes);
app.use('/', walletRoutes);
app.use('/auth', authRoutes);

// 404 Handler
app.use((req, res) => {
  res.status(404).render('pages/404', {
    title: '404 - Page Not Found'
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled Application Error:', err);
  res.status(500).send('Something went wrong on the server.');
});

// Start Server
app.listen(PORT, () => {
  console.log(`🚀 TopLineHub Server running on http://localhost:${PORT}`);
});
