const express = require('express');
const path = require('path');
const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);
require('dotenv').config({ path: path.join(__dirname, '.env') });

console.log('='.repeat(60));
console.log('[BOOT] TopLine Marketplace starting...');
console.log(`[BOOT] Time: ${new Date().toISOString()}`);
console.log(`[BOOT] Node: ${process.version}`);
console.log(`[BOOT] PID: ${process.pid}`);
console.log(`[BOOT] CWD: ${process.cwd()}`);
console.log(`[BOOT] ENV: ${process.env.NODE_ENV || 'not set'}`);
console.log(`[BOOT] PORT: ${process.env.PORT || 3000}`);
console.log(`[BOOT] .env path: ${path.join(__dirname, '.env')}`);
console.log('='.repeat(60));

// Database and models - now in same directory level
const dbPath = path.join(__dirname, 'config', 'database.js');
const modelsPath = path.join(__dirname, 'models');

console.log('[BOOT] Loading database module...');
const { sequelize, testConnection } = require(dbPath);
console.log('[BOOT] Database module loaded.');

console.log('[BOOT] Loading models...');
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
console.log('[BOOT] Models loaded successfully.');

// Initialize Express app
const app = express();
app.set('trust proxy', 1);

// Test database connection
console.log('[BOOT] Testing database connection...');
testConnection();

// View engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// Session store configuration
console.log('[BOOT] Initializing MySQL session store...');
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
    console.error('[SESSION STORE ERROR]:', error.message || error);
});

sessionStore.on('connect', function() {
    console.log('[SESSION STORE] Connected to MySQL for sessions.');
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
console.log('[BOOT] Session middleware configured.');

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));

// ============================================================
// DEBUG: Request-level runtime logging middleware
// Logs every incoming request with method, path, and response time
// ============================================================
app.use((req, res, next) => {
    const start = Date.now();
    const reqId = Math.random().toString(36).substring(2, 8);
    
    console.log(`[REQ ${reqId}] --> ${req.method} ${req.originalUrl} (IP: ${req.ip})`);

    // Log when response finishes
    res.on('finish', () => {
        const elapsed = Date.now() - start;
        const warn = elapsed > 3000 ? ' ** SLOW **' : '';
        console.log(`[REQ ${reqId}] <-- ${res.statusCode} ${req.method} ${req.originalUrl} (${elapsed}ms)${warn}`);
    });

    // Log if response is destroyed/closed before finishing (timeout indicator)
    res.on('close', () => {
        if (!res.writableEnded) {
            const elapsed = Date.now() - start;
            console.error(`[REQ ${reqId}] !! CONNECTION CLOSED BEFORE RESPONSE (${elapsed}ms) ${req.method} ${req.originalUrl}`);
        }
    });

    next();
});

// Make user available to all views
app.use((req, res, next) => {
    res.locals.user = req.session.user || null;
    res.locals.currentPath = req.path;
    next();
});

// Routes
console.log('[BOOT] Loading route modules...');
const indexRouter = require('./routes/index');
const dashboardRouter = require('./routes/dashboard');
const authRouter = require('./routes/auth');
const providerRouter = require('./routes/provider');
const trainingRouter = require('./routes/training');
console.log('[BOOT] All route modules loaded.');

app.use('/', indexRouter);
app.use('/dashboard', dashboardRouter);
app.use('/auth', authRouter);
app.use('/provider', providerRouter);
app.use('/training', trainingRouter);

// 404 handler
app.use((req, res, next) => {
    console.log(`[404] ${req.method} ${req.originalUrl}`);
    res.status(404).render('404', {
        title: '404 Not Found',
        page: 'error'
    });
});

// Error handler
app.use((err, req, res, next) => {
    console.error(`[ERROR] ${req.method} ${req.originalUrl}`);
    console.error(`[ERROR] Message: ${err.message}`);
    console.error(`[ERROR] Stack: ${err.stack}`);
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
    console.log('='.repeat(60));
    console.log(`[READY] TopLine Marketplace server running on ${HOST}:${PORT}`);
    console.log(`[READY] Visit: http://localhost:${PORT}`);
    console.log(`[READY] Time: ${new Date().toISOString()}`);
    console.log('='.repeat(60));
});

// Log unhandled errors that could crash the process
process.on('uncaughtException', (err) => {
    console.error('[FATAL] Uncaught Exception:', err.message);
    console.error(err.stack);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('[FATAL] Unhandled Promise Rejection:', reason);
});

module.exports = app;
