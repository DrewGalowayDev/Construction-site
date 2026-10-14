const express = require('express');
const router = express.Router();
const path = require('path');

// Import models
const modelsPath = path.join(__dirname, '..', 'models');
const {
    Product,
    JobPost,
    Category,
    User,
    ArtisanProfile,
    OrderRequest,
    JobApplication,
    Wallet,
    Transaction
} = require(modelsPath);

// Middleware to check if user is logged in (placeholder - implement proper auth later)
const isAuthenticated = (req, res, next) => {
    // TODO: Implement proper session/JWT auth
    // For now, allow access
    next();
};

/**
 * Client Dashboard - View jobs posted, orders made
 */
router.get('/client', isAuthenticated, async (req, res) => {
    try {
        // Get user ID from session
        const userId = req.session.user ? req.session.user.id : null;

        if (!userId) {
            return res.redirect('/auth/login?redirect=/dashboard/client');
        }

        let myJobs = [];
        let myOrders = [];

        try {
            myJobs = await JobPost.findAll({
                where: { client_id: userId },
                limit: 10,
                order: [['created_at', 'DESC']],
                include: [
                    { model: JobApplication, as: 'applications', required: false }
                ]
            });
        } catch (err) {
            console.error('Error loading jobs:', err.message);
        }

        try {
            myOrders = await OrderRequest.findAll({
                where: { buyer_id: userId },
                limit: 10,
                order: [['created_at', 'DESC']],
                include: [
                    { model: Product, as: 'product', required: false }
                ]
            });
        } catch (err) {
            console.error('Error loading orders:', err.message);
        }

        res.render('dashboard/client', {
            title: 'Client Dashboard',
            page: 'dashboard',
            user: req.session.user,
            myJobs: myJobs || [],
            myOrders: myOrders || []
        });
    } catch (error) {
        console.error('Error loading client dashboard:', error);
        res.render('dashboard/client', {
            title: 'Client Dashboard',
            page: 'dashboard',
            user: req.session.user || null,
            myJobs: [],
            myOrders: []
        });
    }
});

/**
 * Provider/Artisan Dashboard - View jobs applied to, manage profile
 */
router.get('/provider', isAuthenticated, async (req, res) => {
    try {
        // TODO: Get actual user ID from session
        const userId = req.session.user ? req.session.user.id : (req.query.userId || 1);

        const myApplications = await JobApplication.findAll({
            where: { artisan_id: userId },
            limit: 10,
            order: [['created_at', 'DESC']],
            include: [
                { model: JobPost, as: 'job' }
            ]
        });

        const myProfile = await ArtisanProfile.findOne({
            where: { user_id: userId },
            include: [
                { model: User, as: 'user' }
            ]
        });

        res.render('dashboard/provider', {
            title: 'Provider Dashboard',
            page: 'dashboard',
            myApplications: myApplications || [],
            myProfile: myProfile,
            user: req.session.user
        });
    } catch (error) {
        console.error('Error loading provider dashboard:', error);
        res.render('dashboard/provider', {
            title: 'Provider Dashboard',
            page: 'dashboard',
            myApplications: [],
            myProfile: null,
            user: req.session.user
        });
    }
});

/**
 * Provider Jobs Page - Browse available jobs
 */
router.get('/provider/jobs', isAuthenticated, async (req, res) => {
    try {
        const jobs = await JobPost.findAll({
            where: { status: 'open' },
            order: [['created_at', 'DESC']],
            limit: 20,
            include: [
                { model: User, as: 'client', attributes: ['id', 'name'] }
            ]
        });

        res.render('dashboard/provider-jobs', {
            title: 'Browse Jobs',
            page: 'dashboard',
            jobs: jobs || [],
            user: req.session.user
        });
    } catch (error) {
        console.error('Error loading provider jobs:', error);
        res.render('dashboard/provider-jobs', {
            title: 'Browse Jobs',
            page: 'dashboard',
            jobs: [],
            user: req.session.user
        });
    }
});

/**
 * Provider Wallet Page
 */
router.get('/provider/wallet', isAuthenticated, async (req, res) => {
    try {
        res.render('dashboard/provider-wallet', {
            title: 'My Wallet',
            page: 'dashboard',
            user: req.session.user
        });
    } catch (error) {
        console.error('Error loading provider wallet:', error);
        res.render('dashboard/provider-wallet', {
            title: 'My Wallet',
            page: 'dashboard',
            user: req.session.user
        });
    }
});

/**
 * Provider Training Page
 */
router.get('/provider/training', isAuthenticated, async (req, res) => {
    try {
        const userId = req.session.user ? req.session.user.id : null;
        let hasPaid = false;
        let userPayment = null;

        if (userId) {
            userPayment = await Transaction.findOne({
                where: {
                    user_id: userId,
                    type: 'training_fee',
                    status: 'completed'
                }
            });
            hasPaid = !!userPayment;
        }

        res.render('dashboard/provider-training', {
            title: 'Training',
            page: 'dashboard',
            trainingFee: 1500,
            hasPaid: hasPaid,
            userPayment: userPayment,
            user: req.session.user
        });
    } catch (error) {
        console.error('Error loading provider training:', error);
        res.render('dashboard/provider-training', {
            title: 'Training',
            page: 'dashboard',
            trainingFee: 1500,
            hasPaid: false,
            userPayment: null,
            user: req.session.user
        });
    }
});

/**
 * Supplier Dashboard - Manage products
 */
router.get('/supplier', isAuthenticated, async (req, res) => {
    try {
        // TODO: Get actual user ID from session
        const userId = req.query.userId || 1;

        const myProducts = await Product.findAll({
            where: { seller_id: userId },
            order: [['created_at', 'DESC']],
            include: [
                { model: Category, as: 'category' }
            ]
        });

        const productOrders = await OrderRequest.findAll({
            include: [{
                model: Product,
                as: 'product',
                where: { seller_id: userId }
            }],
            order: [['created_at', 'DESC']],
            limit: 20
        });

        res.render('dashboard/supplier', {
            title: 'Supplier Dashboard',
            page: 'dashboard',
            myProducts: myProducts || [],
            productOrders: productOrders || []
        });
    } catch (error) {
        console.error('Error loading supplier dashboard:', error);
        res.render('dashboard/supplier', {
            title: 'Supplier Dashboard',
            page: 'dashboard',
            myProducts: [],
            productOrders: []
        });
    }
});

/**
 * Admin Dashboard - Manage users, training payments, etc.
 */
router.get('/admin', isAuthenticated, async (req, res) => {
    try {
        const users = await User.findAll({
            order: [['created_at', 'DESC']],
            limit: 50
        });

        const providers = await ArtisanProfile.findAll({
            include: [
                { model: User, as: 'user' }
            ],
            order: [['created_at', 'DESC']],
            limit: 50
        });

        const allJobs = await JobPost.findAll({
            include: [
                { model: User, as: 'client' }
            ],
            order: [['created_at', 'DESC']],
            limit: 50
        });

        const allProducts = await Product.findAll({
            include: [
                { model: User, as: 'seller' },
                { model: Category, as: 'category' }
            ],
            order: [['created_at', 'DESC']],
            limit: 50
        });

        const transactions = await Transaction.findAll({
            include: [
                { model: User, as: 'user' }
            ],
            order: [['created_at', 'DESC']],
            limit: 50
        });

        res.render('dashboard/admin', {
            title: 'Admin Dashboard',
            page: 'dashboard',
            users: users || [],
            providers: providers || [],
            allJobs: allJobs || [],
            allProducts: allProducts || [],
            transactions: transactions || []
        });
    } catch (error) {
        console.error('Error loading admin dashboard:', error);
        res.render('dashboard/admin', {
            title: 'Admin Dashboard',
            page: 'dashboard',
            users: [],
            providers: [],
            allJobs: [],
            allProducts: [],
            transactions: []
        });
    }
});

module.exports = router;
