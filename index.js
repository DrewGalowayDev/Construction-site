const express = require('express');
const path = require('path');
const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);
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
app.set('trust proxy', 1);

// Test database connection
testConnection();

// View engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// Session store configuration
const sessionStore = new MySQLStore({
    host: process.env.DB_HOST || '127.0.0.1',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || 'Hackifyoucan254',
    database: process.env.DB_NAME || 'construction',
    createDatabaseTable: true,
    schema: {
        tableName: 'sessions',
        columnNames: {
            session_id: 'session_id',
            expires: 'expires',
            data: 'data'
        }
    }
});

// Catch session store errors so requests do not hang
sessionStore.on('error', function(error) {
    console.error('❌ [Session Store Error]:', error.message || error);
});

// Session middleware
app.use(session({
    key: 'topline_session',
    secret: process.env.SESSION_SECRET || 'topline-secret-key-2026',
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false, // Set to false for HTTP (localhost), true only for HTTPS in production
        httpOnly: true,
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
const HOST = process.env.HOST || '0.0.0.0';

app.listen(PORT, HOST, () => {
    console.log(`TopLine Marketplace server running on ${HOST}:${PORT}`);
    console.log(`Visit: http://localhost:${PORT}`);
});

module.exports = app;
