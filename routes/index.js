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
    Transaction,
    Wallet,
    JobApplication,
    OrderRequest,
    sequelize
} = require(modelsPath);
const { Op } = require('sequelize');
const paystackHelper = require('../helpers/paystackHelper');
const bcrypt = require('bcryptjs');

/**
 * Home page route - with featured products and jobs
 */
router.get('/', async (req, res) => {
    const t0 = Date.now();
    console.log('[ROUTE] GET / started');
    try {
        // Get featured products (latest 6)
        console.log('[ROUTE] GET / querying products...');
        const featuredProducts = await Product.findAll({
            limit: 6,
            order: [['created_at', 'DESC']],
            include: [
                { model: User, as: 'seller', attributes: ['id', 'name'] },
                { model: Category, as: 'category', attributes: ['id', 'name'] }
            ]
        });
        console.log(`[ROUTE] GET / products done (${Date.now() - t0}ms, ${featuredProducts.length} results)`);

        // Get recent job posts (latest 6)
        console.log('[ROUTE] GET / querying jobs...');
        const recentJobs = await JobPost.findAll({
            where: { status: 'open' },
            limit: 6,
            order: [['created_at', 'DESC']],
            include: [
                { model: User, as: 'client', attributes: ['id', 'name'] }
            ]
        });
        console.log(`[ROUTE] GET / jobs done (${Date.now() - t0}ms, ${recentJobs.length} results)`);

        console.log(`[ROUTE] GET / rendering template (${Date.now() - t0}ms)`);
        res.render('index', {
            title: 'Home',
            page: 'home',
            featuredProducts: featuredProducts || [],
            recentJobs: recentJobs || []
        });
        console.log(`[ROUTE] GET / COMPLETE (${Date.now() - t0}ms)`);
    } catch (error) {
        console.error(`[ROUTE] GET / ERROR after ${Date.now() - t0}ms:`, error.message);
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
    const t0 = Date.now();
    console.log('[ROUTE] GET /providers started');
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
        console.log(`[ROUTE] GET /providers query done (${Date.now() - t0}ms, ${providers.length} results)`);

        res.render('providers', {
            title: 'Providers',
            page: 'providers',
            providers: providers || []
        });
        console.log(`[ROUTE] GET /providers COMPLETE (${Date.now() - t0}ms)`);
    } catch (error) {
        console.error(`[ROUTE] GET /providers ERROR after ${Date.now() - t0}ms:`, error.message);
        res.render('providers', {
            title: 'Providers',
            page: 'providers',
            providers: []
        });
    }
});

/**
 * Jobs page route - with job listings & verified portal
 */
router.get('/jobs', async (req, res) => {
    const t0 = Date.now();
    console.log('[ROUTE] GET /jobs started');
    try {
        // Get all open jobs from backend
        console.log('[ROUTE] GET /jobs querying job_posts...');
        const jobs = await JobPost.findAll({
            where: { status: 'open' },
            order: [['created_at', 'DESC']],
            include: [
                { model: User, as: 'client', attributes: ['id', 'name'] }
            ]
        });
        console.log(`[ROUTE] GET /jobs job_posts done (${Date.now() - t0}ms, ${jobs.length} results)`);

        let hasPaid = false;
        let userPayment = null;
        if (req.session.user) {
            console.log(`[ROUTE] GET /jobs checking payment for user ${req.session.user.id}...`);
            userPayment = await Transaction.findOne({
                where: {
                    user_id: req.session.user.id,
                    type: { [Op.in]: ['worker_activation', 'training_fee'] },
                    status: 'completed'
                }
            });
            console.log(`[ROUTE] GET /jobs payment check done (${Date.now() - t0}ms)`);
            if (userPayment || req.session.user.role === 'admin' || req.session.user.is_verified) {
                hasPaid = true;
            }
        }

        console.log(`[ROUTE] GET /jobs rendering template (${Date.now() - t0}ms)`);
        res.render('jobs', {
            title: 'TopLine – Verified Gulf Construction Jobs',
            page: 'jobs',
            jobs: jobs || [],
            hasPaid,
            userPayment,
            user: req.session.user || null,
            paystackPublicKey: paystackHelper.getPublicKey()
        });
        console.log(`[ROUTE] GET /jobs COMPLETE (${Date.now() - t0}ms)`);
    } catch (error) {
        console.error(`[ROUTE] GET /jobs ERROR after ${Date.now() - t0}ms:`, error.message);
        res.render('jobs', {
            title: 'TopLine – Verified Gulf Construction Jobs',
            page: 'jobs',
            jobs: [],
            hasPaid: false,
            userPayment: null,
            user: req.session.user || null,
            paystackPublicKey: paystackHelper.getPublicKey()
        });
    }
});

/**
 * Materials page route - with full catalog, category filters, and user session
 */
router.get('/materials', async (req, res) => {
    const t0 = Date.now();
    try {
        console.log('[ROUTE] GET /materials started');
        // Get all active products with price > 0
        const products = await Product.findAll({
            where: {
                is_active: true,
                price: { [Op.gt]: 0 }
            },
            order: [['created_at', 'DESC']],
            include: [
                { model: User, as: 'seller', attributes: ['id', 'name', 'phone', 'role'] },
                { model: Category, as: 'category', attributes: ['id', 'name', 'slug', 'icon'] }
            ]
        });

        // Get all categories
        const categories = await Category.findAll({
            order: [['name', 'ASC']]
        });

        // If user is logged in, fetch their recent orders
        let myOrders = [];
        if (req.session.user) {
            myOrders = await OrderRequest.findAll({
                where: { buyer_id: req.session.user.id },
                include: [
                    { model: Product, as: 'product', attributes: ['id', 'title', 'image_url', 'unit', 'price'] }
                ],
                order: [['created_at', 'DESC']],
                limit: 15
            }).catch(() => []);
        }

        console.log(`[ROUTE] GET /materials completed in ${Date.now() - t0}ms (${products.length} products)`);
        res.render('materials', {
            title: 'TopLine – Construction Materials & Supplies Marketplace | Kenya',
            page: 'materials',
            products: products || [],
            categories: categories || [],
            myOrders: myOrders || [],
            user: req.session.user || null,
            paystackPublicKey: paystackHelper.getPublicKey()
        });
    } catch (error) {
        console.error('Error loading materials page:', error);
        res.render('materials', {
            title: 'TopLine – Construction Materials & Supplies Marketplace | Kenya',
            page: 'materials',
            products: [],
            categories: [],
            myOrders: [],
            user: req.session.user || null,
            paystackPublicKey: paystackHelper.getPublicKey()
        });
    }
});

/**
 * GET API: Realtime Materials with search, category, location, and price filtering
 */
router.get('/api/materials', async (req, res) => {
    try {
        const { category, search, location, price_max, sort, in_stock } = req.query;
        const whereClause = {
            is_active: true,
            price: { [Op.gt]: 0 }
        };
        const conditions = [];

        // Category filter
        if (category && category !== 'all' && category !== 'All' && category !== 'All Categories') {
            if (!isNaN(category)) {
                conditions.push({ category_id: parseInt(category, 10) });
            } else {
                // If slug or name passed
                const catObj = await Category.findOne({
                    where: {
                        [Op.or]: [
                            { name: { [Op.like]: `%${category}%` } },
                            { slug: category.toLowerCase() }
                        ]
                    }
                });
                if (catObj) {
                    conditions.push({ category_id: catObj.id });
                }
            }
        }

        // Location / County filter
        if (location && location.trim() && location !== 'all' && location !== 'All Counties') {
            conditions.push({ location_county: { [Op.like]: `%${location.trim()}%` } });
        }

        // Search text (title, description, unit, location_county)
        if (search && search.trim()) {
            const q = search.trim();
            conditions.push({
                [Op.or]: [
                    { title: { [Op.like]: `%${q}%` } },
                    { description: { [Op.like]: `%${q}%` } },
                    { unit: { [Op.like]: `%${q}%` } },
                    { location_county: { [Op.like]: `%${q}%` } }
                ]
            });
        }

        // Price max filter
        if (price_max && !isNaN(price_max) && Number(price_max) > 0) {
            conditions.push({ price: { [Op.lte]: parseFloat(price_max) } });
        }

        // In-stock only filter
        if (in_stock === 'true' || in_stock === true || in_stock === '1') {
            conditions.push({ stock_quantity: { [Op.gt]: 0 } });
        }

        if (conditions.length > 0) {
            whereClause[Op.and] = conditions;
        }

        // Sort order
        let orderClause = [['created_at', 'DESC']];
        if (sort === 'price_asc') {
            orderClause = [['price', 'ASC']];
        } else if (sort === 'price_desc') {
            orderClause = [['price', 'DESC']];
        } else if (sort === 'title') {
            orderClause = [['title', 'ASC']];
        }

        const products = await Product.findAll({
            where: whereClause,
            order: orderClause,
            include: [
                { model: User, as: 'seller', attributes: ['id', 'name', 'phone', 'role'] },
                { model: Category, as: 'category', attributes: ['id', 'name', 'slug', 'icon'] }
            ]
        });

        res.json({
            success: true,
            count: products.length,
            products
        });
    } catch (error) {
        console.error('API materials fetch error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch materials' });
    }
});

/**
 * POST API: Create Material Order & Initialize Paystack Checkout
 */
router.post('/api/materials/checkout', async (req, res) => {
    try {
        const {
            product_id,
            quantity,
            customer_name,
            customer_phone,
            customer_email,
            delivery_county,
            delivery_address,
            delivery_notes
        } = req.body;

        // Validation
        if (!product_id) {
            return res.status(400).json({ success: false, message: 'Product ID is required.' });
        }
        if (!customer_name || !customer_phone) {
            return res.status(400).json({ success: false, message: 'Name and phone number are required.' });
        }
        if (!delivery_address) {
            return res.status(400).json({ success: false, message: 'Delivery address is required.' });
        }

        const orderQty = parseInt(quantity, 10) || 1;
        if (orderQty < 1) {
            return res.status(400).json({ success: false, message: 'Quantity must be at least 1.' });
        }

        const product = await Product.findByPk(product_id, {
            include: [{ model: Category, as: 'category' }]
        });
        if (!product || !product.is_active) {
            return res.status(404).json({ success: false, message: 'Product is not available or out of stock.' });
        }

        if (product.stock_quantity !== null && product.stock_quantity < orderQty) {
            return res.status(400).json({
                success: false,
                message: `Only ${product.stock_quantity} units available in stock. Please adjust your quantity.`
            });
        }

        const unitPrice = parseFloat(product.price);
        const totalPrice = Math.round(unitPrice * orderQty * 100) / 100;

        const trimmedName = customer_name.trim();
        const trimmedPhone = customer_phone.trim();
        const userEmail = (customer_email && customer_email.trim())
            ? customer_email.trim().toLowerCase()
            : `buyer_${trimmedPhone.replace(/\D/g, '')}@toplinehub.co.ke`;

        // Associate with buyer account
        let buyerId = req.session.user ? req.session.user.id : null;
        let buyerObj = null;

        if (buyerId) {
            buyerObj = await User.findByPk(buyerId);
        } else {
            const cleanPhone = trimmedPhone.replace(/\D/g, '').slice(-9);
            const orConditions = [{ email: userEmail }];
            if (cleanPhone.length >= 7) {
                orConditions.push(
                    sequelize.where(
                        sequelize.fn('REPLACE', sequelize.col('phone'), ' ', ''),
                        { [Op.like]: `%${cleanPhone}` }
                    )
                );
            }
            buyerObj = await User.findOne({ where: { [Op.or]: orConditions } });

            if (!buyerObj) {
                buyerObj = await User.create({
                    name: trimmedName,
                    email: userEmail,
                    phone: trimmedPhone,
                    password: 'BuyerPass2026!',
                    role: 'buyer',
                    county: delivery_county || 'Nairobi',
                    town: delivery_address.slice(0, 50),
                    is_verified: false
                }).catch(() => null);
            }
            if (buyerObj) {
                buyerId = buyerObj.id;
                req.session.user = {
                    id: buyerObj.id,
                    name: buyerObj.name,
                    email: buyerObj.email,
                    phone: buyerObj.phone,
                    role: buyerObj.role,
                    county: buyerObj.county,
                    town: buyerObj.town,
                    is_verified: buyerObj.is_verified
                };
            }
        }

        const fullAddress = `${delivery_address.trim()}${delivery_county ? ', ' + delivery_county.trim() : ''}`;
        const reference = `TL_MAT_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;

        const orderNotes = [
            `Customer: ${trimmedName}`,
            delivery_notes && delivery_notes.trim() ? `Notes: ${delivery_notes.trim()}` : null
        ].filter(Boolean).join(' | ');

        // Create OrderRequest record
        const order = await OrderRequest.create({
            product_id: product.id,
            buyer_id: buyerId,
            quantity: orderQty,
            total_price: totalPrice,
            delivery_address: fullAddress,
            contact_phone: trimmedPhone,
            notes: orderNotes,
            status: 'confirmed',
            payment_status: 'pending',
            payment_method: 'paystack',
            paystack_reference: reference,
            order_type: 'purchase'
        });

        // Create Transaction record for admin financial tracking
        await Transaction.create({
            user_id: buyerId,
            type: 'material_purchase',
            amount: totalPrice,
            balance_before: 0,
            balance_after: 0,
            status: 'pending',
            payment_method: 'paystack',
            mpesa_receipt: reference,
            reference_type: 'OrderRequest',
            reference_id: order.id,
            description: `Material Order #${order.id}: ${product.title} (Qty: ${orderQty} ${product.unit}) | Buyer: ${trimmedName} (${trimmedPhone})`
        }).catch(err => console.error('Error creating order transaction:', err.message));

        const host = req.get('host');
        const protocol = req.protocol;
        const callbackUrl = `${protocol}://${host}/materials?reference=${reference}&payment_status=check&order_id=${order.id}`;

        // Initialize Paystack checkout
        const paystackRes = await paystackHelper.initializeTransaction({
            email: userEmail,
            amount: totalPrice,
            reference: reference,
            callbackUrl: callbackUrl,
            metadata: {
                order_id: order.id,
                product_id: product.id,
                product_title: product.title,
                quantity: orderQty,
                unit: product.unit,
                customer_name: trimmedName,
                customer_phone: trimmedPhone,
                delivery_address: fullAddress
            },
            channels: ['mobile_money', 'card', 'bank']
        });

        res.json({
            success: true,
            order_id: order.id,
            reference: reference,
            total_price: totalPrice,
            authorization_url: paystackRes.data.authorization_url,
            access_code: paystackRes.data.access_code,
            isSimulated: !!paystackRes.isSimulated,
            product: {
                title: product.title,
                price: product.price,
                unit: product.unit,
                image_url: product.image_url
            }
        });
    } catch (err) {
        console.error('Materials checkout error:', err);
        res.status(500).json({ success: false, message: err.message || 'Payment initialization failed' });
    }
});

/**
 * GET API: Verify Paystack Material Order Payment
 */
router.get('/api/materials/payment/verify', async (req, res) => {
    try {
        const { reference } = req.query;
        if (!reference) {
            return res.status(400).json({ success: false, message: 'Missing transaction reference' });
        }

        const existingOrder = await OrderRequest.findOne({
            where: { paystack_reference: reference },
            include: [{ model: Product, as: 'product' }]
        });

        if (!existingOrder) {
            return res.status(404).json({ success: false, message: 'Order with this reference not found' });
        }

        // If already confirmed as paid
        if (existingOrder.payment_status === 'paid') {
            return res.json({
                success: true,
                completed: true,
                order: existingOrder,
                message: 'Payment already verified! Order is confirmed and queued for delivery.'
            });
        }

        // Verify with Paystack
        const verifyRes = await paystackHelper.verifyTransaction(reference);

        if ((verifyRes.data && verifyRes.data.status === 'success') || verifyRes.isSimulated) {
            // Update order status to paid
            await existingOrder.update({
                payment_status: 'paid',
                status: 'confirmed',
                paid_at: new Date(),
                mpesa_receipt: verifyRes.data?.reference || reference
            });

            // Decrement product stock
            if (existingOrder.product && existingOrder.product.stock_quantity) {
                const newStock = Math.max(0, existingOrder.product.stock_quantity - existingOrder.quantity);
                await existingOrder.product.update({ stock_quantity: newStock });
            }

            // Update transaction record
            await Transaction.update(
                { status: 'completed', balance_after: existingOrder.total_price },
                { where: { mpesa_receipt: reference } }
            ).catch(() => {});

            return res.json({
                success: true,
                completed: true,
                order: existingOrder,
                message: 'Payment confirmed successfully! Your material order has been placed with TopLine.'
            });
        } else {
            return res.json({
                success: false,
                completed: false,
                status: verifyRes.data?.status || 'pending',
                message: 'Payment is still being processed or was not completed.'
            });
        }
    } catch (err) {
        console.error('Materials payment verification error:', err);
        res.status(500).json({ success: false, message: err.message || 'Verification failed' });
    }
});

/**
 * GET API: User Material Orders History
 */
router.get('/api/materials/my-orders', async (req, res) => {
    try {
        const { phone, email } = req.query;
        const whereClause = {};
        const conditions = [];

        if (req.session.user) {
            conditions.push({ buyer_id: req.session.user.id });
        }

        if (phone && phone.trim()) {
            const cleanPhone = phone.trim().replace(/\D/g, '').slice(-9);
            conditions.push({ contact_phone: { [Op.like]: `%${cleanPhone}%` } });
        }

        if (conditions.length > 0) {
            whereClause[Op.or] = conditions;
        } else {
            return res.json({ success: true, count: 0, orders: [] });
        }

        const orders = await OrderRequest.findAll({
            where: whereClause,
            include: [
                {
                    model: Product,
                    as: 'product',
                    include: [{ model: Category, as: 'category' }]
                }
            ],
            order: [['created_at', 'DESC']],
            limit: 20
        });

        res.json({
            success: true,
            count: orders.length,
            orders
        });
    } catch (error) {
        console.error('Fetch my-orders error:', error);
        res.status(500).json({ success: false, message: 'Failed to load order history' });
    }
});

/**
 * Training page route - now handled by training routes
 */
// Removed - handled by /training router

/**
 * GET API: Realtime Jobs with trade & location filtering
 */
router.get('/api/jobs', async (req, res) => {
    try {
        const { trade, location, search } = req.query;
        const whereClause = { status: 'open' };
        const conditions = [];

        if (trade && trade !== 'all' && trade !== 'All' && trade !== 'All trades') {
            conditions.push({ trade_required: { [Op.like]: `%${trade}%` } });
        }

        if (location && location.trim() && location !== 'all' && location !== 'All Locations') {
            const loc = location.trim();
            conditions.push({
                [Op.or]: [
                    { location_county: { [Op.like]: `%${loc}%` } },
                    { location_town: { [Op.like]: `%${loc}%` } }
                ]
            });
        }

        if (search && search.trim()) {
            const q = search.trim();
            conditions.push({
                [Op.or]: [
                    { title: { [Op.like]: `%${q}%` } },
                    { description: { [Op.like]: `%${q}%` } },
                    { trade_required: { [Op.like]: `%${q}%` } },
                    { location_county: { [Op.like]: `%${q}%` } },
                    { location_town: { [Op.like]: `%${q}%` } }
                ]
            });
        }

        if (conditions.length > 0) {
            whereClause[Op.and] = conditions;
        }

        const jobs = await JobPost.findAll({
            where: whereClause,
            order: [['created_at', 'DESC']],
            include: [
                { model: User, as: 'client', attributes: ['id', 'name'] }
            ]
        });

        res.json({
            success: true,
            count: jobs.length,
            jobs
        });
    } catch (error) {
        console.error('API jobs error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch jobs' });
    }
});

/**
 * POST API: Worker / Client Quick Sign In
 */
router.post('/api/jobs/auth/signin', async (req, res) => {
    try {
        const { phoneOrEmail, password } = req.body;
        if (!phoneOrEmail || !password) {
            return res.status(400).json({ success: false, message: 'Phone/Email and password required' });
        }

        const cleanPhone = phoneOrEmail.replace(/\D/g, '').slice(-9);
        const orConditions = [
            { email: phoneOrEmail.trim().toLowerCase() },
            { phone: phoneOrEmail.trim() }
        ];
        if (cleanPhone.length >= 7) {
            orConditions.push(
                sequelize.where(
                    sequelize.fn('REPLACE', sequelize.col('phone'), ' ', ''),
                    { [Op.like]: `%${cleanPhone}` }
                )
            );
        }

        const user = await User.findOne({ where: { [Op.or]: orConditions } });
        if (!user || !(await user.validPassword(password))) {
            return res.status(401).json({ success: false, message: 'Invalid phone/email or password' });
        }

        req.session.user = {
            id: user.id,
            name: user.name,
            email: user.email,
            phone: user.phone,
            role: user.role,
            county: user.county,
            town: user.town,
            is_verified: user.is_verified
        };

        res.json({
            success: true,
            message: `Welcome back, ${user.name}!`,
            user: req.session.user
        });
    } catch (err) {
        console.error('API signin error:', err);
        res.status(500).json({ success: false, message: 'Server error during sign in' });
    }
});

/**
 * POST API: Initialize Worker Platform Activation Payment (KSh 519.34)
 */
router.post('/api/jobs/payment/initialize', async (req, res) => {
    try {
        const { name, phone, email, password, trade, preferred_country } = req.body;
        if (!name || !phone) {
            return res.status(400).json({ success: false, message: 'Name and phone number are required.' });
        }

        const trimmedName = name.trim();
        const trimmedPhone = phone.trim();
        const userEmail = (email && email.trim()) ? email.trim().toLowerCase() : `worker_${trimmedPhone.replace(/\D/g, '')}@toplinehub.co.ke`;

        let userId = req.session.user ? req.session.user.id : null;
        let userObj = null;

        if (userId) {
            userObj = await User.findByPk(userId);
        } else {
            const cleanPhone = trimmedPhone.replace(/\D/g, '').slice(-9);
            const orConditions = [{ email: userEmail }];
            if (cleanPhone.length >= 7) {
                orConditions.push(
                    sequelize.where(
                        sequelize.fn('REPLACE', sequelize.col('phone'), ' ', ''),
                        { [Op.like]: `%${cleanPhone}` }
                    )
                );
            }
            userObj = await User.findOne({ where: { [Op.or]: orConditions } });

            if (!userObj) {
                userObj = await User.create({
                    name: trimmedName,
                    email: userEmail,
                    phone: trimmedPhone,
                    password: password || 'WorkerPass2026!',
                    role: 'artisan',
                    county: preferred_country || 'Saudi Arabia',
                    town: trade || 'Construction Artisan',
                    is_verified: false
                });
                await ArtisanProfile.create({
                    user_id: userObj.id,
                    trade: trade || 'General Construction',
                    experience_years: 2,
                    daily_rate: 2500,
                    is_available: true,
                    county: preferred_country || 'Saudi Arabia',
                    town: trade || 'General Construction'
                }).catch(() => {});
            }
            userId = userObj.id;
        }

        // Set session
        req.session.user = {
            id: userObj.id,
            name: userObj.name,
            email: userObj.email,
            phone: userObj.phone,
            role: userObj.role,
            county: userObj.county,
            town: userObj.town,
            is_verified: userObj.is_verified
        };

        const ACTIVATION_FEE = 519.34;
        const reference = `TL_JOB_ACT_${userId}_${Date.now()}`;
        const host = req.get('host');
        const protocol = req.protocol;
        const callbackUrl = `${protocol}://${host}/jobs?reference=${reference}&payment_status=check`;

        const paystackRes = await paystackHelper.initializeTransaction({
            email: userEmail,
            amount: ACTIVATION_FEE,
            reference: reference,
            callbackUrl: callbackUrl,
            metadata: {
                user_id: userId,
                payment_type: 'worker_activation',
                name: trimmedName,
                phone: trimmedPhone,
                trade: trade || 'Artisan',
                country: preferred_country || 'Gulf'
            },
            channels: ['mobile_money', 'card']
        });

        await Transaction.create({
            user_id: userId,
            type: 'worker_activation',
            amount: ACTIVATION_FEE,
            balance_before: 0,
            balance_after: 0,
            status: 'pending',
            payment_method: 'paystack',
            mpesa_receipt: reference,
            description: `Worker Platform Activation (KSh 519.34) - ${trimmedName} | Trade: ${trade} | Phone: ${trimmedPhone}`
        });

        res.json({
            success: true,
            authorization_url: paystackRes.data.authorization_url,
            access_code: paystackRes.data.access_code,
            reference: reference,
            isSimulated: !!paystackRes.isSimulated
        });
    } catch (err) {
        console.error('Jobs payment init error:', err);
        res.status(500).json({ success: false, message: err.message || 'Payment initialization failed' });
    }
});

/**
 * GET API: Verify Worker Platform Activation Payment
 */
router.get('/api/jobs/payment/verify', async (req, res) => {
    try {
        const { reference } = req.query;
        if (!reference) {
            return res.status(400).json({ success: false, message: 'Missing reference' });
        }

        const existingTx = await Transaction.findOne({ where: { mpesa_receipt: reference } });
        if (existingTx && existingTx.status === 'completed') {
            if (existingTx.user_id && req.session.user) {
                req.session.user.is_verified = true;
            }
            return res.json({
                success: true,
                completed: true,
                message: 'Payment verified! Account unlocked.'
            });
        }

        const verifyRes = await paystackHelper.verifyTransaction(reference);
        if (verifyRes.data && verifyRes.data.status === 'success') {
            if (existingTx) {
                await existingTx.update({ status: 'completed' });
                if (existingTx.user_id) {
                    await User.update({ is_verified: true }, { where: { id: existingTx.user_id } });
                }
            }
            if (req.session.user) {
                req.session.user.is_verified = true;
            }
            return res.json({
                success: true,
                completed: true,
                message: 'Payment verified successfully! Welcome to TopLine Verified Jobs.'
            });
        } else if (verifyRes.isSimulated) {
            if (existingTx) {
                await existingTx.update({ status: 'completed' });
                if (existingTx.user_id) {
                    await User.update({ is_verified: true }, { where: { id: existingTx.user_id } });
                }
            }
            if (req.session.user) {
                req.session.user.is_verified = true;
            }
            return res.json({
                success: true,
                completed: true,
                message: 'Payment verified successfully (Simulated mode).'
            });
        }

        return res.json({
            success: true,
            completed: false,
            status: verifyRes.data ? verifyRes.data.status : 'pending',
            message: 'Waiting for payment confirmation...'
        });
    } catch (err) {
        console.error('Verify error:', err);
        res.status(500).json({ success: false, message: err.message });
    }
});

/**
 * POST route to create a new job post (Employer / Client)
 */
router.post('/jobs/create', async (req, res) => {
    try {
        const { title, description, trade_required, location_county, location_town, budget_estimate, duration, client_name, client_phone, client_email } = req.body;

        let clientId = req.session.user ? req.session.user.id : null;

        // If not logged in, auto-link or create client user so job posting is frictionless
        if (!clientId) {
            if (client_phone || client_email) {
                const cleanPhone = (client_phone || '').replace(/\D/g, '').slice(-9);
                const orConditions = [];
                if (client_email) orConditions.push({ email: client_email.trim().toLowerCase() });
                if (cleanPhone.length >= 7) {
                    orConditions.push(
                        sequelize.where(
                            sequelize.fn('REPLACE', sequelize.col('phone'), ' ', ''),
                            { [Op.like]: `%${cleanPhone}` }
                        )
                    );
                }
                let clientUser = null;
                if (orConditions.length > 0) {
                    clientUser = await User.findOne({ where: { [Op.or]: orConditions } });
                }
                if (!clientUser) {
                    clientUser = await User.create({
                        name: client_name || 'Project Employer',
                        email: client_email || `employer_${Date.now()}@toplinehub.co.ke`,
                        phone: client_phone || '+254700000000',
                        password: 'ClientPass2026!',
                        role: 'buyer',
                        county: location_county || 'Nairobi',
                        town: location_town || 'Westlands',
                        is_verified: true
                    });
                }
                clientId = clientUser.id;
                req.session.user = {
                    id: clientUser.id,
                    name: clientUser.name,
                    email: clientUser.email,
                    phone: clientUser.phone,
                    role: clientUser.role,
                    county: clientUser.county,
                    town: clientUser.town
                };
            } else {
                clientId = 2; // Default platform verified client
            }
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
            message: 'Job posted successfully! It is now live on TopLine for verified providers.',
            jobId: newJob.id,
            job: newJob
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
            slug: `supplier-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            description: `Supplier Application\n\nBusiness: ${business_name}\nContact: ${contact_name || business_name}\nPhone: ${phone}\nLocation: ${location || 'Not specified'}\n\nProducts Supplied:\n${products_supplied}\n\nDelivery Available: ${delivery_available || 'Not specified'}`,
            price: 0,
            unit: 'inquiry',
            stock_quantity: 0,
            is_active: false
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
