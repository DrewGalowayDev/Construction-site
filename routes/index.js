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
    ArtisanProfile
} = require(modelsPath);
const { Op } = require('sequelize');

/**
 * Home page route - with featured products and jobs
 */
router.get('/', async (req, res) => {
    try {
        // Get featured products (latest 6)
        const featuredProducts = await Product.findAll({
            limit: 6,
            order: [['created_at', 'DESC']],
            include: [
                { model: User, as: 'seller', attributes: ['id', 'name'] },
                { model: Category, as: 'category', attributes: ['id', 'name'] }
            ]
        });

        // Get recent job posts (latest 6)
        const recentJobs = await JobPost.findAll({
            where: { status: 'open' },
            limit: 6,
            order: [['created_at', 'DESC']],
            include: [
                { model: User, as: 'client', attributes: ['id', 'name'] }
            ]
        });

        res.render('index', {
            title: 'Home',
            page: 'home',
            featuredProducts: featuredProducts || [],
            recentJobs: recentJobs || []
        });
    } catch (error) {
        console.error('Error loading home page:', error);
        res.render('index', {
            title: 'Home',
            page: 'home',
            featuredProducts: [],
            recentJobs: []
        });
    }
});

/**
 * Providers page route - with artisan listings
 */
router.get('/providers', async (req, res) => {
    try {
        // Get all providers/artisans (filter by is_available instead of verification_status)
        const providers = await ArtisanProfile.findAll({
            where: { is_available: true },
            limit: 12,
            order: [['created_at', 'DESC']],
            include: [
                { model: User, as: 'user', attributes: ['id', 'name', 'email'] }
            ]
        });

        res.render('providers', {
            title: 'Providers',
            page: 'providers',
            providers: providers || []
        });
    } catch (error) {
        console.error('Error loading providers:', error);
        res.render('providers', {
            title: 'Providers',
            page: 'providers',
            providers: []
        });
    }
});

/**
 * Jobs page route - with job listings
 */
router.get('/jobs', async (req, res) => {
    try {
        // Get all open jobs
        const jobs = await JobPost.findAll({
            where: { status: 'open' },
            limit: 20,
            order: [['created_at', 'DESC']],
            include: [
                { model: User, as: 'client', attributes: ['id', 'name'] }
            ]
        });

        res.render('jobs', {
            title: 'Post a Job',
            page: 'jobs',
            jobs: jobs || []
        });
    } catch (error) {
        console.error('Error loading jobs:', error);
        res.render('jobs', {
            title: 'Post a Job',
            page: 'jobs',
            jobs: []
        });
    }
});

/**
 * Materials page route - with product listings
 */
router.get('/materials', async (req, res) => {
    try {
        // Get all products
        const products = await Product.findAll({
            limit: 20,
            order: [['created_at', 'DESC']],
            include: [
                { model: User, as: 'seller', attributes: ['id', 'name'] },
                { model: Category, as: 'category', attributes: ['id', 'name'] }
            ]
        });

        // Get categories for filter
        const categories = await Category.findAll({
            attributes: ['id', 'name']
        });

        res.render('materials', {
            title: 'Materials',
            page: 'materials',
            products: products || [],
            categories: categories || []
        });
    } catch (error) {
        console.error('Error loading materials:', error);
        res.render('materials', {
            title: 'Materials',
            page: 'materials',
            products: [],
            categories: []
        });
    }
});

/**
 * Training page route - now handled by training routes
 */
// Removed - handled by /training router

/**
 * POST route to create a new job post
 */
router.post('/jobs/create', async (req, res) => {
    try {
        const { title, description, trade_required, location_county, location_town, budget_estimate, duration } = req.body;

        // Get user ID from session (client who's posting the job)
        const clientId = req.session.user ? req.session.user.id : null;

        if (!clientId) {
            return res.status(401).json({ 
                success: false, 
                message: 'Please log in to post a job',
                redirect: '/auth/login?redirect=/jobs'
            });
        }

        // Validate required fields
        if (!title || !description || !trade_required || !location_county || !location_town || !budget_estimate) {
            return res.status(400).json({ 
                success: false, 
                message: 'Please fill in all required fields' 
            });
        }

        // Create the job post
        const newJob = await JobPost.create({
            client_id: clientId,
            title,
            description,
            trade_required,
            location_county,
            location_town,
            budget_estimate: parseFloat(budget_estimate) || 0,
            duration: duration || '2 weeks',
            status: 'open'
        });

        res.json({ 
            success: true, 
            message: 'Job posted successfully! Providers will see it and send you quotes.',
            jobId: newJob.id 
        });

    } catch (error) {
        console.error('Error creating job post:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error posting job. Please try again.' 
        });
    }
});

/**
 * POST route to create a job application (provider applying to a job)
 */
router.post('/jobs/:jobId/apply', async (req, res) => {
    try {
        const { jobId } = req.params;
        const { bid_amount, pitch_message } = req.body;

        // Get user ID from session (artisan/provider applying)
        const artisanId = req.session.user ? req.session.user.id : null;

        if (!artisanId) {
            return res.status(401).json({ 
                success: false, 
                message: 'Please log in to apply to jobs',
                redirect: '/auth/login'
            });
        }

        // Check if job exists
        const job = await JobPost.findByPk(jobId);
        if (!job) {
            return res.status(404).json({ 
                success: false, 
                message: 'Job not found' 
            });
        }

        // Check if already applied
        const existingApplication = await JobApplication.findOne({
            where: { job_id: jobId, artisan_id: artisanId }
        });

        if (existingApplication) {
            return res.status(400).json({ 
                success: false, 
                message: 'You have already applied to this job' 
            });
        }

        // Create the application
        const newApplication = await JobApplication.create({
            job_id: jobId,
            artisan_id: artisanId,
            bid_amount: parseFloat(bid_amount) || 0,
            pitch_message,
            status: 'pending'
        });

        res.json({ 
            success: true, 
            message: 'Application submitted successfully!',
            applicationId: newApplication.id 
        });

    } catch (error) {
        console.error('Error creating job application:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error submitting application. Please try again.' 
        });
    }
});

/**
 * GET route to view job details with contact information
 */
router.get('/jobs/:jobId', async (req, res) => {
    try {
        const { jobId } = req.params;
        const userId = req.session.user ? req.session.user.id : null;

        const job = await JobPost.findByPk(jobId, {
            include: [
                { 
                    model: User, 
                    as: 'client', 
                    attributes: ['id', 'name', 'email', 'phone', 'county', 'town'] 
                },
                {
                    model: JobApplication,
                    as: 'applications',
                    include: [
                        { 
                            model: User, 
                            as: 'artisan', 
                            attributes: ['id', 'name', 'email', 'phone', 'county', 'town'] 
                        }
                    ]
                }
            ]
        });

        if (!job) {
            return res.render('job-details', {
                title: 'Job Not Found',
                page: 'jobs',
                job: null,
                canSeeClientContact: false,
                canSeeApplications: false
            });
        }

        // Determine what the user can see
        const canSeeClientContact = userId && (userId !== job.client_id); // Providers can see client contact
        const canSeeApplications = userId && (userId === job.client_id); // Only job poster can see applications

        res.render('job-details', {
            title: job.title,
            page: 'jobs',
            job: job,
            canSeeClientContact: canSeeClientContact,
            canSeeApplications: canSeeApplications
        });

    } catch (error) {
        console.error('Error fetching job details:', error);
        res.render('job-details', {
            title: 'Error',
            page: 'jobs',
            job: null,
            canSeeClientContact: false,
            canSeeApplications: false
        });
    }
});

/**
 * POST route for provider service request (customer requesting a provider)
 */
router.post('/providers/request', async (req, res) => {
    try {
        const { service_type, description, location_county, location_town, contact_name, contact_phone } = req.body;

        // Get user ID from session if logged in
        const userId = req.session.user ? req.session.user.id : null;

        // Validate required fields
        if (!service_type || !description || !contact_name || !contact_phone) {
            return res.status(400).json({ 
                success: false, 
                message: 'Please fill in all required fields' 
            });
        }

        // For now, we'll create this as a JobPost with a special flag or description
        // In production, you might want a separate ProviderRequest model
        const providerRequest = await JobPost.create({
            client_id: userId || null,
            title: `${service_type} Service Request`,
            description: `Provider Request - ${service_type}\n\nContact: ${contact_name}\nPhone: ${contact_phone}\nLocation: ${location_town || 'Not specified'}, ${location_county || 'Not specified'}\n\nDetails:\n${description}`,
            trade_required: service_type,
            location_county: location_county || 'Not specified',
            location_town: location_town || 'Not specified',
            budget_estimate: 0,
            status: 'open'
        });

        res.json({ 
            success: true, 
            message: 'Request sent successfully! We will match you with a qualified provider and contact you shortly.',
            requestId: providerRequest.id 
        });

    } catch (error) {
        console.error('Error creating provider request:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error submitting request. Please try again.' 
        });
    }
});

/**
 * POST route for provider signup (artisan/professional joining as provider)
 */
router.post('/providers/signup', async (req, res) => {
    try {
        const { name, email, phone, location_county, location_town, trade, experience_years, bio } = req.body;

        // Validate required fields
        if (!name || !phone || !trade) {
            return res.status(400).json({ 
                success: false, 
                message: 'Please fill in all required fields' 
            });
        }

        // Check if user is already registered with this phone/email
        let user = null;
        if (email) {
            user = await User.findOne({ where: { email } });
        }
        if (!user && phone) {
            user = await User.findOne({ where: { phone } });
        }

        // If user doesn't exist, create a new user account
        if (!user) {
            const tempPassword = Math.random().toString(36).slice(-8); // Generate temp password
            user = await User.create({
                name,
                email: email || `${phone}@temp.topline.com`,
                phone,
                password: tempPassword,
                role: 'artisan',
                county: location_county || 'Not specified',
                town: location_town || 'Not specified',
                is_verified: false
            });
        }

        // Check if artisan profile already exists
        let profile = await ArtisanProfile.findOne({ where: { user_id: user.id } });

        if (profile) {
            return res.status(400).json({ 
                success: false, 
                message: 'You are already registered as a provider. Please log in to manage your profile.' 
            });
        }

        // Create artisan profile
        profile = await ArtisanProfile.create({
            user_id: user.id,
            trade: trade,
            experience_years: parseInt(experience_years) || 0,
            bio: bio || '',
            daily_rate: 0,
            is_available: false, // Set to false until admin verifies
            county: location_county || user.county,
            town: location_town || user.town
        });

        res.json({ 
            success: true, 
            message: 'Application submitted successfully! We will verify your information and contact you to activate your provider account.',
            userId: user.id,
            profileId: profile.id
        });

    } catch (error) {
        console.error('Error creating provider signup:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error submitting application. Please try again.' 
        });
    }
});

/**
 * POST route for materials supplier signup
 */
router.post('/materials/supplier-signup', async (req, res) => {
    try {
        const { business_name, contact_name, phone, email, location, products_supplied, delivery_available } = req.body;

        // Validate required fields
        if (!business_name || !phone || !products_supplied) {
            return res.status(400).json({ 
                success: false, 
                message: 'Please fill in all required fields' 
            });
        }

        // Check if user exists
        let user = null;
        if (email) {
            user = await User.findOne({ where: { email } });
        }
        if (!user && phone) {
            user = await User.findOne({ where: { phone } });
        }

        // If user doesn't exist, create a new user account
        if (!user) {
            const tempPassword = Math.random().toString(36).slice(-8);
            user = await User.create({
                name: contact_name || business_name,
                email: email || `${phone}@temp.topline.com`,
                phone,
                password: tempPassword,
                role: 'seller',
                town: location || 'Not specified',
                is_verified: false
            });
        }

        // Create a product entry to track supplier interest
        // In production, you might want a separate SupplerApplication model
        const supplierProduct = await Product.create({
            seller_id: user.id,
            category_id: 1, // Default category, update as needed
            title: `${business_name} - Supplier Application`,
            description: `Supplier Application\n\nBusiness: ${business_name}\nContact: ${contact_name || business_name}\nPhone: ${phone}\nLocation: ${location || 'Not specified'}\n\nProducts Supplied:\n${products_supplied}\n\nDelivery Available: ${delivery_available || 'Not specified'}`,
            price: 0,
            unit: 'inquiry',
            stock_quantity: 0,
            is_available: false // Set to false until admin approves
        });

        res.json({ 
            success: true, 
            message: 'Signup successful! We will contact you to help list your products on our marketplace.',
            userId: user.id,
            applicationId: supplierProduct.id
        });

    } catch (error) {
        console.error('Error creating supplier signup:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error submitting signup. Please try again.' 
        });
    }
});

module.exports = router;
