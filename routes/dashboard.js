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

// Import admin controller
const adminController = require('../controllers/adminController');

/**
 * Admin Dashboard - Standalone Pages Navigation
 */
router.get('/admin', isAuthenticated, (req, res, next) => {
    const page = req.query.page;
    if (page === 'users') return adminController.getUsers(req, res, next);
    if (page === 'providers') return adminController.getProviders(req, res, next);
    if (page === 'training') return adminController.getTraining(req, res, next);
    if (page === 'products') return adminController.getProducts(req, res, next);
    if (page === 'jobs') return adminController.getJobs(req, res, next);
    return adminController.getOverview(req, res, next);
});
router.get('/admin/overview', isAuthenticated, adminController.getOverview);
router.get('/admin/users', isAuthenticated, adminController.getUsers);
router.get('/admin/providers', isAuthenticated, adminController.getProviders);
router.get('/admin/training', isAuthenticated, adminController.getTraining);
router.get('/admin/products', isAuthenticated, adminController.getProducts);
router.get('/admin/jobs', isAuthenticated, adminController.getJobs);

/**
 * Admin Training Payments CRUD Endpoints
 */
router.post('/admin/training/create', isAuthenticated, adminController.createTrainingPayment);
router.get('/admin/training/:id', isAuthenticated, adminController.getTrainingPayment);
router.post('/admin/training/:id/update', isAuthenticated, adminController.updateTrainingPayment);
router.put('/admin/training/:id', isAuthenticated, adminController.updateTrainingPayment);
router.post('/admin/training/:id/delete', isAuthenticated, adminController.deleteTrainingPayment);
router.delete('/admin/training/:id', isAuthenticated, adminController.deleteTrainingPayment);

/**
 * Admin Users CRUD Endpoints
 */
router.post('/admin/users/create', isAuthenticated, adminController.createUser);
router.get('/admin/users/:id', isAuthenticated, adminController.getUser);
router.post('/admin/users/:id/update', isAuthenticated, adminController.updateUser);
router.put('/admin/users/:id', isAuthenticated, adminController.updateUser);
router.post('/admin/users/:id/delete', isAuthenticated, adminController.deleteUser);
router.delete('/admin/users/:id', isAuthenticated, adminController.deleteUser);

/**
 * Admin Providers CRUD Endpoints
 */
router.post('/admin/providers/create', isAuthenticated, adminController.createProvider);
router.get('/admin/providers/:id', isAuthenticated, adminController.getProvider);
router.post('/admin/providers/:id/update', isAuthenticated, adminController.updateProvider);
router.put('/admin/providers/:id', isAuthenticated, adminController.updateProvider);
router.post('/admin/providers/:id/toggle', isAuthenticated, adminController.toggleProviderStatus);
router.post('/admin/providers/:id/delete', isAuthenticated, adminController.deleteProvider);
router.delete('/admin/providers/:id', isAuthenticated, adminController.deleteProvider);

/**
 * Admin Products CRUD Endpoints
 */
router.post('/admin/products/create', isAuthenticated, adminController.createProduct);
router.get('/admin/products/:id', isAuthenticated, adminController.getProduct);
router.post('/admin/products/:id/update', isAuthenticated, adminController.updateProduct);
router.put('/admin/products/:id', isAuthenticated, adminController.updateProduct);
router.post('/admin/products/:id/delete', isAuthenticated, adminController.deleteProduct);
router.delete('/admin/products/:id', isAuthenticated, adminController.deleteProduct);

/**
 * Admin Jobs CRUD Endpoints
 */
router.post('/admin/jobs/create', isAuthenticated, adminController.createJob);
router.get('/admin/jobs/:id', isAuthenticated, adminController.getJob);
router.post('/admin/jobs/:id/update', isAuthenticated, adminController.updateJob);
router.put('/admin/jobs/:id', isAuthenticated, adminController.updateJob);
router.post('/admin/jobs/:id/delete', isAuthenticated, adminController.deleteJob);
router.delete('/admin/jobs/:id', isAuthenticated, adminController.deleteJob);

module.exports = router;
