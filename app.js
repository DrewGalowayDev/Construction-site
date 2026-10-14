const express = require('express');
const path = require('path');
const session = require('express-session');
require('dotenv').config({ path: path.join(__dirname, '.env') });

// Database and models - now in same directory level
const dbPath = path.join(__dirname, 'config', 'database.js');
const modelsPath = path.join(__dirname, 'models');

const { sequelize, testConnection } = require(dbPath);
const {
    User,
    Category,
    Product,
    ArtisanProfile,
    JobPost,
    JobApplication,
    OrderRequest,
    Wallet,
    Transaction,
    ContactUnlock
} = require(modelsPath);

// Initialize Express app
const app = express();

// Test database connection
testConnection();

// View engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// Session middleware
app.use(session({
    secret: process.env.SESSION_SECRET || 'topline-secret-key-2026',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));

// Make user available to all views
app.use((req, res, next) => {
    res.locals.user = req.session.user || null;
    res.locals.currentPath = req.path;
    next();
});

// Routes
const indexRouter = require('./routes/index');
const dashboardRouter = require('./routes/dashboard');
const authRouter = require('./routes/auth');
const providerRouter = require('./routes/provider');
const trainingRouter = require('./routes/training');

app.use('/', indexRouter);
app.use('/dashboard', dashboardRouter);
app.use('/auth', authRouter);
app.use('/provider', providerRouter);
app.use('/training', trainingRouter);

// 404 handler
app.use((req, res, next) => {
    res.status(404).render('404', {
        title: '404 Not Found',
        page: 'error'
    });
});

// Error handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(err.status || 500);
    res.render('error', {
        title: 'Error',
        page: 'error',
        message: err.message,
        error: process.env.NODE_ENV === 'development' ? err : {}
    });
});

// Server configuration
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`TopLine Marketplace server running on port ${PORT}`);
    console.log(`Visit: http://localhost:${PORT}`);
});

module.exports = app;
