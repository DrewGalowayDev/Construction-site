const path = require('path');
const { Op } = require('sequelize');
const bcrypt = require('bcryptjs');

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
    Transaction,
    sequelize
} = require(modelsPath);

// Helper to slugify text
function slugify(text) {
    return (text || '')
        .toString()
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-')
        .replace(/[^\w\-]+/g, '')
        .replace(/\-\-+/g, '-')
        .concat('-', Date.now().toString().slice(-4));
}

/**
 * ==========================================
 * PAGE RENDER HANDLERS (Standalone Pages)
 * ==========================================
 */

/**
 * 1. Admin Overview Page
 */
exports.getOverview = async (req, res) => {
    try {
        const [
            totalUsers,
            totalProviders,
            totalJobs,
            totalProducts,
            totalTrainingPayments,
            recentUsers,
            recentTransactions,
            recentJobs,
            categories
        ] = await Promise.all([
            User.count(),
            ArtisanProfile.count(),
            JobPost.count({ where: { status: 'open' } }),
            Product.count({ where: { is_active: true } }),
            Transaction.count({ where: { type: 'training_fee' } }),
            User.findAll({ order: [['created_at', 'DESC']], limit: 5 }),
            Transaction.findAll({
                include: [{ model: User, as: 'user', attributes: ['id', 'name', 'email', 'phone'] }],
                order: [['created_at', 'DESC']],
                limit: 6
            }),
            JobPost.findAll({
                include: [{ model: User, as: 'client', attributes: ['id', 'name'] }],
                order: [['created_at', 'DESC']],
                limit: 5
            }),
            Category.findAll({ order: [['name', 'ASC']] })
        ]);

        // Calculate training revenue
        const trainingRevenueResult = await Transaction.sum('amount', {
            where: { type: 'training_fee', status: 'completed' }
        });
        const trainingRevenue = trainingRevenueResult || 0;

        res.render('dashboard/admin', {
            title: 'Admin Overview - Topline Construction',
            activePage: 'overview',
            user: req.session.user || { name: 'Admin', role: 'admin' },
            counts: {
                users: totalUsers,
                providers: totalProviders,
                jobs: totalJobs,
                products: totalProducts,
                trainingPayments: totalTrainingPayments,
                trainingRevenue: trainingRevenue
            },
            recentUsers: recentUsers || [],
            recentTransactions: recentTransactions || [],
            recentJobs: recentJobs || [],
            categories: categories || []
        });
    } catch (error) {
        console.error('Error loading admin overview:', error);
        res.status(500).render('error', {
            title: 'Dashboard Error',
            message: 'Failed to load admin overview: ' + error.message,
            error: {}
        });
    }
};

/**
 * 2. Users Page
 */
exports.getUsers = async (req, res) => {
    try {
        const { search, role } = req.query;
        const whereClause = {};

        if (role && role !== 'all') {
            whereClause.role = role;
        }

        if (search && search.trim()) {
            const query = `%${search.trim()}%`;
            whereClause[Op.or] = [
                { name: { [Op.like]: query } },
                { email: { [Op.like]: query } },
                { phone: { [Op.like]: query } }
            ];
        }

        const [users, totalCount, adminCount, clientCount, providerCount, supplierCount] = await Promise.all([
            User.findAll({
                where: whereClause,
                order: [['created_at', 'DESC']],
                limit: 100
            }),
            User.count(),
            User.count({ where: { role: 'admin' } }),
            User.count({ where: { role: 'buyer' } }),
            User.count({ where: { role: 'artisan' } }),
            User.count({ where: { role: 'seller' } })
        ]);

        res.render('dashboard/admin', {
            title: 'User Management - Admin',
            activePage: 'users',
            user: req.session.user || { name: 'Admin', role: 'admin' },
            users: users || [],
            stats: {
                total: totalCount,
                admins: adminCount,
                buyers: clientCount,
                artisans: providerCount,
                sellers: supplierCount
            },
            filter: { search: search || '', role: role || 'all' }
        });
    } catch (error) {
        console.error('Error loading users page:', error);
        res.status(500).send('Error loading users page: ' + error.message);
    }
};

/**
 * 3. Providers Page
 */
exports.getProviders = async (req, res) => {
    try {
        const { search, availability } = req.query;
        const whereClause = {};

        if (availability === 'available') {
            whereClause.is_available = true;
        } else if (availability === 'unavailable') {
            whereClause.is_available = false;
        }

        if (search && search.trim()) {
            whereClause[Op.or] = [
                { trade: { [Op.like]: `%${search.trim()}%` } },
                { nca_reg_number: { [Op.like]: `%${search.trim()}%` } }
            ];
        }

        const [providers, totalCount, availableCount, unassignedUsers] = await Promise.all([
            ArtisanProfile.findAll({
                where: whereClause,
                include: [{ model: User, as: 'user' }],
                order: [['created_at', 'DESC']],
                limit: 100
            }),
            ArtisanProfile.count(),
            ArtisanProfile.count({ where: { is_available: true } }),
            // Find users who can be assigned an artisan profile
            User.findAll({
                where: { role: { [Op.in]: ['artisan', 'buyer'] } },
                attributes: ['id', 'name', 'email', 'phone'],
                limit: 50
            })
        ]);

        res.render('dashboard/admin', {
            title: 'Provider Verification & Management - Admin',
            activePage: 'providers',
            user: req.session.user || { name: 'Admin', role: 'admin' },
            providers: providers || [],
            stats: {
                total: totalCount,
                available: availableCount,
                unavailable: totalCount - availableCount
            },
            unassignedUsers: unassignedUsers || [],
            filter: { search: search || '', availability: availability || 'all' }
        });
    } catch (error) {
        console.error('Error loading providers page:', error);
        res.status(500).send('Error loading providers page: ' + error.message);
    }
};

/**
 * 4. Training Payments Page (With Full CRUD, especially Delete)
 */
exports.getTraining = async (req, res) => {
    try {
        const { search, status, type } = req.query;
        const whereClause = {};

        // Default or filter by transaction type
        if (!type || type === 'training_fee') {
            whereClause.type = 'training_fee';
        } else if (type !== 'all') {
            whereClause.type = type;
        }

        if (status && status !== 'all') {
            whereClause.status = status;
        }

        if (search && search.trim()) {
            const query = `%${search.trim()}%`;
            whereClause[Op.or] = [
                { mpesa_receipt: { [Op.like]: query } },
                { description: { [Op.like]: query } }
            ];
        }

        const [transactions, allUsers, totalTraining, completedCount, pendingCount, failedCount, totalRevenueResult] = await Promise.all([
            Transaction.findAll({
                where: whereClause,
                include: [{ model: User, as: 'user', attributes: ['id', 'name', 'email', 'phone'] }],
                order: [['created_at', 'DESC']],
                limit: 150
            }),
            User.findAll({ attributes: ['id', 'name', 'email', 'phone'], order: [['name', 'ASC']] }),
            Transaction.count({ where: { type: 'training_fee' } }),
            Transaction.count({ where: { type: 'training_fee', status: 'completed' } }),
            Transaction.count({ where: { type: 'training_fee', status: 'pending' } }),
            Transaction.count({ where: { type: 'training_fee', status: { [Op.in]: ['failed', 'refunded'] } } }),
            Transaction.sum('amount', { where: { type: 'training_fee', status: 'completed' } })
        ]);

        res.render('dashboard/admin', {
            title: 'Training Payments & Transactions - Admin',
            activePage: 'training',
            user: req.session.user || { name: 'Admin', role: 'admin' },
            transactions: transactions || [],
            allUsers: allUsers || [],
            stats: {
                total: totalTraining,
                completed: completedCount,
                pending: pendingCount,
                failed: failedCount,
                revenue: totalRevenueResult || 0
            },
            filter: {
                search: search || '',
                status: status || 'all',
                type: type || 'training_fee'
            }
        });
    } catch (error) {
        console.error('Error loading training payments page:', error);
        res.status(500).send('Error loading training payments page: ' + error.message);
    }
};

/**
 * 5. Products Page
 */
exports.getProducts = async (req, res) => {
    try {
        const { search, category, status } = req.query;
        const whereClause = {};

        if (status === 'active') {
            whereClause.is_active = true;
        } else if (status === 'inactive') {
            whereClause.is_active = false;
        }

        if (category && category !== 'all') {
            whereClause.category_id = category;
        }

        if (search && search.trim()) {
            whereClause[Op.or] = [
                { title: { [Op.like]: `%${search.trim()}%` } },
                { description: { [Op.like]: `%${search.trim()}%` } }
            ];
        }

        const [products, categories, totalCount, activeCount, inactiveCount, allSellers] = await Promise.all([
            Product.findAll({
                where: whereClause,
                include: [
                    { model: User, as: 'seller', attributes: ['id', 'name', 'email'] },
                    { model: Category, as: 'category' }
                ],
                order: [['created_at', 'DESC']],
                limit: 100
            }),
            Category.findAll({ order: [['name', 'ASC']] }),
            Product.count(),
            Product.count({ where: { is_active: true } }),
            Product.count({ where: { is_active: false } }),
            User.findAll({ where: { role: { [Op.in]: ['seller', 'admin'] } }, attributes: ['id', 'name'] })
        ]);

        res.render('dashboard/admin', {
            title: 'Product Management - Admin',
            activePage: 'products',
            user: req.session.user || { name: 'Admin', role: 'admin' },
            products: products || [],
            categories: categories || [],
            allSellers: allSellers || [],
            stats: {
                total: totalCount,
                active: activeCount,
                inactive: inactiveCount
            },
            filter: { search: search || '', category: category || 'all', status: status || 'all' }
        });
    } catch (error) {
        console.error('Error loading products page:', error);
        res.status(500).send('Error loading products page: ' + error.message);
    }
};

/**
 * 6. Jobs Page
 */
exports.getJobs = async (req, res) => {
    try {
        const { search, status } = req.query;
        const whereClause = {};

        if (status && status !== 'all') {
            whereClause.status = status;
        }

        if (search && search.trim()) {
            whereClause[Op.or] = [
                { title: { [Op.like]: `%${search.trim()}%` } },
                { trade_required: { [Op.like]: `%${search.trim()}%` } },
                { location_town: { [Op.like]: `%${search.trim()}%` } }
            ];
        }

        const [jobs, totalCount, openCount, inProgressCount, completedCount, allClients] = await Promise.all([
            JobPost.findAll({
                where: whereClause,
                include: [{ model: User, as: 'client', attributes: ['id', 'name', 'email', 'phone'] }],
                order: [['created_at', 'DESC']],
                limit: 100
            }),
            JobPost.count(),
            JobPost.count({ where: { status: 'open' } }),
            JobPost.count({ where: { status: 'in_progress' } }),
            JobPost.count({ where: { status: 'completed' } }),
            User.findAll({ attributes: ['id', 'name', 'email'], order: [['name', 'ASC']] })
        ]);

        res.render('dashboard/admin', {
            title: 'Jobs Management - Admin',
            activePage: 'jobs',
            user: req.session.user || { name: 'Admin', role: 'admin' },
            jobs: jobs || [],
            allClients: allClients || [],
            stats: {
                total: totalCount,
                open: openCount,
                inProgress: inProgressCount,
                completed: completedCount
            },
            filter: { search: search || '', status: status || 'all' }
        });
    } catch (error) {
        console.error('Error loading jobs page:', error);
        res.status(500).send('Error loading jobs page: ' + error.message);
    }
};

/**
 * ==========================================
 * TRAINING PAYMENTS CRUD OPERATIONS
 * ==========================================
 */

// CREATE Training Payment
exports.createTrainingPayment = async (req, res) => {
    try {
        const { user_id, amount, payment_method, mpesa_receipt, status, description, type } = req.body;

        const receipt = mpesa_receipt ? mpesa_receipt.trim() : `MANUAL_${Date.now()}`;
        const paymentAmount = parseFloat(amount) || 1500;
        const paymentStatus = status || 'completed';
        const parsedUserId = user_id && user_id !== '0' && user_id !== '' ? parseInt(user_id, 10) : null;

        const newTx = await Transaction.create({
            user_id: parsedUserId,
            type: type || 'training_fee',
            amount: paymentAmount,
            balance_before: 0,
            balance_after: 0,
            description: description ? description.trim() : `Manual Training Fee Payment - Ref: ${receipt}`,
            payment_method: payment_method || 'mpesa',
            mpesa_receipt: receipt,
            status: paymentStatus
        });

        if (req.xhr || req.headers.accept?.includes('application/json')) {
            return res.json({ success: true, message: 'Payment recorded successfully', transaction: newTx });
        }
        res.redirect('/dashboard/admin/training?success=Payment+recorded+successfully');
    } catch (error) {
        console.error('Error creating training payment:', error);
        if (req.xhr || req.headers.accept?.includes('application/json')) {
            return res.status(500).json({ success: false, message: error.message });
        }
        res.redirect('/dashboard/admin/training?error=' + encodeURIComponent(error.message));
    }
};

// GET Single Training Payment (JSON for Edit Modal)
exports.getTrainingPayment = async (req, res) => {
    try {
        const { id } = req.params;
        const tx = await Transaction.findByPk(id, {
            include: [{ model: User, as: 'user', attributes: ['id', 'name', 'email', 'phone'] }]
        });
        if (!tx) {
            return res.status(404).json({ success: false, message: 'Payment record not found' });
        }
        res.json({ success: true, transaction: tx });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// UPDATE Training Payment
exports.updateTrainingPayment = async (req, res) => {
    try {
        const { id } = req.params;
        const { amount, status, mpesa_receipt, description, payment_method, user_id } = req.body;

        const tx = await Transaction.findByPk(id);
        if (!tx) {
            if (req.xhr || req.headers.accept?.includes('application/json')) {
                return res.status(404).json({ success: false, message: 'Payment record not found' });
            }
            return res.redirect('/dashboard/admin/training?error=Record+not+found');
        }

        const updates = {};
        if (amount !== undefined) updates.amount = parseFloat(amount) || tx.amount;
        if (status) updates.status = status;
        if (mpesa_receipt !== undefined) updates.mpesa_receipt = mpesa_receipt.trim();
        if (description !== undefined) updates.description = description.trim();
        if (payment_method) updates.payment_method = payment_method;
        if (user_id !== undefined) {
            updates.user_id = user_id && user_id !== '0' && user_id !== '' ? parseInt(user_id, 10) : null;
        }

        await tx.update(updates);

        if (req.xhr || req.headers.accept?.includes('application/json')) {
            return res.json({ success: true, message: 'Payment updated successfully', transaction: tx });
        }
        res.redirect('/dashboard/admin/training?success=Payment+updated+successfully');
    } catch (error) {
        console.error('Error updating training payment:', error);
        if (req.xhr || req.headers.accept?.includes('application/json')) {
            return res.status(500).json({ success: false, message: error.message });
        }
        res.redirect('/dashboard/admin/training?error=' + encodeURIComponent(error.message));
    }
};

// DELETE Training Payment (Crucial User Requirement!)
exports.deleteTrainingPayment = async (req, res) => {
    try {
        const { id } = req.params;
        const tx = await Transaction.findByPk(id);

        if (!tx) {
            if (req.xhr || req.headers.accept?.includes('application/json')) {
                return res.status(404).json({ success: false, message: 'Payment record not found' });
            }
            return res.redirect('/dashboard/admin/training?error=Payment+not+found');
        }

        const receipt = tx.mpesa_receipt || tx.id;
        await tx.destroy();

        console.log(`✅ Admin deleted transaction #${id} (${receipt})`);

        if (req.xhr || req.headers.accept?.includes('application/json')) {
            return res.json({ success: true, message: `Payment #${id} deleted successfully` });
        }
        res.redirect('/dashboard/admin/training?success=' + encodeURIComponent(`Payment #${id} deleted successfully`));
    } catch (error) {
        console.error('Error deleting training payment:', error);
        if (req.xhr || req.headers.accept?.includes('application/json')) {
            return res.status(500).json({ success: false, message: error.message });
        }
        res.redirect('/dashboard/admin/training?error=' + encodeURIComponent(error.message));
    }
};

/**
 * ==========================================
 * USERS CRUD OPERATIONS
 * ==========================================
 */

// CREATE User
exports.createUser = async (req, res) => {
    try {
        const { name, email, phone, password, role, county, town, is_verified } = req.body;

        if (!name || !email || !phone) {
            return res.status(400).json({ success: false, message: 'Name, email, and phone are required' });
        }

        const existing = await User.findOne({ where: { email: email.trim().toLowerCase() } });
        if (existing) {
            return res.status(400).json({ success: false, message: 'A user with this email already exists' });
        }

        const user = await User.create({
            name: name.trim(),
            email: email.trim().toLowerCase(),
            phone: phone.trim(),
            password: password || 'Password123!',
            role: role || 'buyer',
            county: county || 'Nairobi',
            town: town || 'Nairobi',
            is_verified: is_verified === 'true' || is_verified === true
        });

        // Initialize wallet
        await Wallet.create({ user_id: user.id, balance: 0 }).catch(() => {});

        // If role is artisan, initialize artisan profile
        if (role === 'artisan') {
            await ArtisanProfile.create({
                user_id: user.id,
                trade: 'General Construction',
                experience_years: 2,
                daily_rate: 2000.00,
                is_available: true
            }).catch(() => {});
        }

        if (req.xhr || req.headers.accept?.includes('application/json')) {
            return res.json({ success: true, message: 'User created successfully', user });
        }
        res.redirect('/dashboard/admin/users?success=User+created+successfully');
    } catch (error) {
        console.error('Error creating user:', error);
        if (req.xhr || req.headers.accept?.includes('application/json')) {
            return res.status(500).json({ success: false, message: error.message });
        }
        res.redirect('/dashboard/admin/users?error=' + encodeURIComponent(error.message));
    }
};

// GET Single User
exports.getUser = async (req, res) => {
    try {
        const user = await User.findByPk(req.params.id, {
            attributes: { exclude: ['password'] }
        });
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });
        res.json({ success: true, user });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// UPDATE User
exports.updateUser = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, email, phone, role, county, town, is_verified, password } = req.body;

        const user = await User.findByPk(id);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        const updates = {};
        if (name) updates.name = name.trim();
        if (email) updates.email = email.trim().toLowerCase();
        if (phone) updates.phone = phone.trim();
        if (role) updates.role = role;
        if (county) updates.county = county.trim();
        if (town) updates.town = town.trim();
        if (is_verified !== undefined) {
            updates.is_verified = is_verified === 'true' || is_verified === true || is_verified === '1' || is_verified === 1;
        }
        if (password && password.trim().length >= 6) {
            updates.password = await bcrypt.hash(password.trim(), 10);
        }

        await user.update(updates);

        if (req.xhr || req.headers.accept?.includes('application/json')) {
            return res.json({ success: true, message: 'User updated successfully', user });
        }
        res.redirect('/dashboard/admin/users?success=User+updated+successfully');
    } catch (error) {
        console.error('Error updating user:', error);
        if (req.xhr || req.headers.accept?.includes('application/json')) {
            return res.status(500).json({ success: false, message: error.message });
        }
        res.redirect('/dashboard/admin/users?error=' + encodeURIComponent(error.message));
    }
};

// DELETE User
exports.deleteUser = async (req, res) => {
    try {
        const { id } = req.params;
        const user = await User.findByPk(id);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        // Clean up linked records safely before user deletion
        await ArtisanProfile.destroy({ where: { user_id: id } }).catch(() => {});
        await Wallet.destroy({ where: { user_id: id } }).catch(() => {});
        await Transaction.update({ user_id: null }, { where: { user_id: id } }).catch(() => {});
        await JobPost.destroy({ where: { client_id: id } }).catch(() => {});
        await Product.destroy({ where: { seller_id: id } }).catch(() => {});

        await user.destroy();

        if (req.xhr || req.headers.accept?.includes('application/json')) {
            return res.json({ success: true, message: 'User deleted successfully' });
        }
        res.redirect('/dashboard/admin/users?success=User+deleted+successfully');
    } catch (error) {
        console.error('Error deleting user:', error);
        if (req.xhr || req.headers.accept?.includes('application/json')) {
            return res.status(500).json({ success: false, message: error.message });
        }
        res.redirect('/dashboard/admin/users?error=' + encodeURIComponent(error.message));
    }
};

/**
 * ==========================================
 * PROVIDERS CRUD OPERATIONS
 * ==========================================
 */

// CREATE Provider Profile
exports.createProvider = async (req, res) => {
    try {
        const { user_id, trade, experience_years, daily_rate, bio, nca_reg_number, is_available } = req.body;

        if (!user_id || !trade) {
            return res.status(400).json({ success: false, message: 'User and trade are required' });
        }

        const existing = await ArtisanProfile.findOne({ where: { user_id } });
        if (existing) {
            return res.status(400).json({ success: false, message: 'This user already has a provider profile' });
        }

        const profile = await ArtisanProfile.create({
            user_id: parseInt(user_id, 10),
            trade: trade.trim(),
            experience_years: parseInt(experience_years, 10) || 1,
            daily_rate: parseFloat(daily_rate) || 2000.00,
            bio: bio ? bio.trim() : '',
            nca_reg_number: nca_reg_number ? nca_reg_number.trim() : null,
            is_available: is_available === 'true' || is_available === true || is_available === '1',
            rating: 5.0
        });

        // Update user's role to artisan
        await User.update({ role: 'artisan' }, { where: { id: user_id } }).catch(() => {});

        if (req.xhr || req.headers.accept?.includes('application/json')) {
            return res.json({ success: true, message: 'Provider profile created successfully', profile });
        }
        res.redirect('/dashboard/admin/providers?success=Provider+profile+created+successfully');
    } catch (error) {
        console.error('Error creating provider:', error);
        if (req.xhr || req.headers.accept?.includes('application/json')) {
            return res.status(500).json({ success: false, message: error.message });
        }
        res.redirect('/dashboard/admin/providers?error=' + encodeURIComponent(error.message));
    }
};

// GET Single Provider
exports.getProvider = async (req, res) => {
    try {
        const provider = await ArtisanProfile.findByPk(req.params.id, {
            include: [{ model: User, as: 'user' }]
        });
        if (!provider) return res.status(404).json({ success: false, message: 'Provider not found' });
        res.json({ success: true, provider });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// UPDATE Provider Profile
exports.updateProvider = async (req, res) => {
    try {
        const { id } = req.params;
        const { trade, experience_years, daily_rate, bio, nca_reg_number, is_available } = req.body;

        const provider = await ArtisanProfile.findByPk(id);
        if (!provider) return res.status(404).json({ success: false, message: 'Provider not found' });

        const updates = {};
        if (trade) updates.trade = trade.trim();
        if (experience_years !== undefined) updates.experience_years = parseInt(experience_years, 10) || 0;
        if (daily_rate !== undefined) updates.daily_rate = parseFloat(daily_rate) || 0;
        if (bio !== undefined) updates.bio = bio.trim();
        if (nca_reg_number !== undefined) updates.nca_reg_number = nca_reg_number.trim();
        if (is_available !== undefined) {
            updates.is_available = is_available === 'true' || is_available === true || is_available === '1' || is_available === 1;
        }

        await provider.update(updates);

        if (req.xhr || req.headers.accept?.includes('application/json')) {
            return res.json({ success: true, message: 'Provider updated successfully', provider });
        }
        res.redirect('/dashboard/admin/providers?success=Provider+updated+successfully');
    } catch (error) {
        console.error('Error updating provider:', error);
        if (req.xhr || req.headers.accept?.includes('application/json')) {
            return res.status(500).json({ success: false, message: error.message });
        }
        res.redirect('/dashboard/admin/providers?error=' + encodeURIComponent(error.message));
    }
};

// TOGGLE Provider Status / Verification
exports.toggleProviderStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const provider = await ArtisanProfile.findByPk(id);
        if (!provider) return res.status(404).json({ success: false, message: 'Provider not found' });

        await provider.update({ is_available: !provider.is_available });

        if (req.xhr || req.headers.accept?.includes('application/json')) {
            return res.json({
                success: true,
                message: `Provider status set to ${provider.is_available ? 'Available' : 'Unavailable'}`,
                is_available: provider.is_available
            });
        }
        res.redirect('/dashboard/admin/providers?success=Provider+status+updated');
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// DELETE Provider Profile
exports.deleteProvider = async (req, res) => {
    try {
        const { id } = req.params;
        const provider = await ArtisanProfile.findByPk(id);
        if (!provider) return res.status(404).json({ success: false, message: 'Provider not found' });

        await provider.destroy();

        if (req.xhr || req.headers.accept?.includes('application/json')) {
            return res.json({ success: true, message: 'Provider profile deleted successfully' });
        }
        res.redirect('/dashboard/admin/providers?success=Provider+profile+deleted+successfully');
    } catch (error) {
        console.error('Error deleting provider:', error);
        if (req.xhr || req.headers.accept?.includes('application/json')) {
            return res.status(500).json({ success: false, message: error.message });
        }
        res.redirect('/dashboard/admin/providers?error=' + encodeURIComponent(error.message));
    }
};

/**
 * ==========================================
 * PRODUCTS CRUD OPERATIONS
 * ==========================================
 */

// CREATE Product
exports.createProduct = async (req, res) => {
    try {
        const { title, description, price, stock_quantity, category_id, seller_id, unit, location_county, image_url, is_active } = req.body;

        if (!title || !description || !price) {
            return res.status(400).json({ success: false, message: 'Title, description, and price are required' });
        }

        const product = await Product.create({
            title: title.trim(),
            slug: slugify(title),
            description: description.trim(),
            price: parseFloat(price),
            stock_quantity: parseInt(stock_quantity, 10) || 50,
            category_id: category_id ? parseInt(category_id, 10) : 1,
            seller_id: seller_id && seller_id !== '' ? parseInt(seller_id, 10) : (req.session.user ? req.session.user.id : 1),
            unit: unit || 'item',
            location_county: location_county || 'Nairobi',
            image_url: image_url || '/img/service-1.jpg',
            is_active: is_active === undefined ? true : (is_active === 'true' || is_active === true || is_active === '1')
        });

        if (req.xhr || req.headers.accept?.includes('application/json')) {
            return res.json({ success: true, message: 'Product created successfully', product });
        }
        res.redirect('/dashboard/admin/products?success=Product+created+successfully');
    } catch (error) {
        console.error('Error creating product:', error);
        if (req.xhr || req.headers.accept?.includes('application/json')) {
            return res.status(500).json({ success: false, message: error.message });
        }
        res.redirect('/dashboard/admin/products?error=' + encodeURIComponent(error.message));
    }
};

// GET Single Product
exports.getProduct = async (req, res) => {
    try {
        const product = await Product.findByPk(req.params.id, {
            include: [
                { model: User, as: 'seller', attributes: ['id', 'name'] },
                { model: Category, as: 'category' }
            ]
        });
        if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
        res.json({ success: true, product });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// UPDATE Product
exports.updateProduct = async (req, res) => {
    try {
        const { id } = req.params;
        const { title, description, price, stock_quantity, category_id, unit, location_county, is_active } = req.body;

        const product = await Product.findByPk(id);
        if (!product) return res.status(404).json({ success: false, message: 'Product not found' });

        const updates = {};
        if (title) {
            updates.title = title.trim();
            updates.slug = slugify(title);
        }
        if (description !== undefined) updates.description = description.trim();
        if (price !== undefined) updates.price = parseFloat(price);
        if (stock_quantity !== undefined) updates.stock_quantity = parseInt(stock_quantity, 10);
        if (category_id !== undefined) updates.category_id = parseInt(category_id, 10);
        if (unit !== undefined) updates.unit = unit.trim();
        if (location_county !== undefined) updates.location_county = location_county.trim();
        if (is_active !== undefined) {
            updates.is_active = is_active === 'true' || is_active === true || is_active === '1' || is_active === 1;
        }

        await product.update(updates);

        if (req.xhr || req.headers.accept?.includes('application/json')) {
            return res.json({ success: true, message: 'Product updated successfully', product });
        }
        res.redirect('/dashboard/admin/products?success=Product+updated+successfully');
    } catch (error) {
        console.error('Error updating product:', error);
        if (req.xhr || req.headers.accept?.includes('application/json')) {
            return res.status(500).json({ success: false, message: error.message });
        }
        res.redirect('/dashboard/admin/products?error=' + encodeURIComponent(error.message));
    }
};

// DELETE Product
exports.deleteProduct = async (req, res) => {
    try {
        const { id } = req.params;
        const product = await Product.findByPk(id);
        if (!product) return res.status(404).json({ success: false, message: 'Product not found' });

        // Remove linked orders or uncouple
        await OrderRequest.destroy({ where: { product_id: id } }).catch(() => {});
        await product.destroy();

        if (req.xhr || req.headers.accept?.includes('application/json')) {
            return res.json({ success: true, message: 'Product deleted successfully' });
        }
        res.redirect('/dashboard/admin/products?success=Product+deleted+successfully');
    } catch (error) {
        console.error('Error deleting product:', error);
        if (req.xhr || req.headers.accept?.includes('application/json')) {
            return res.status(500).json({ success: false, message: error.message });
        }
        res.redirect('/dashboard/admin/products?error=' + encodeURIComponent(error.message));
    }
};

/**
 * ==========================================
 * JOBS CRUD OPERATIONS
 * ==========================================
 */

// CREATE Job
exports.createJob = async (req, res) => {
    try {
        const { title, description, trade_required, location_county, location_town, budget_estimate, duration, status, client_id } = req.body;

        if (!title || !description || !trade_required) {
            return res.status(400).json({ success: false, message: 'Title, description, and trade required are necessary' });
        }

        const job = await JobPost.create({
            title: title.trim(),
            description: description.trim(),
            trade_required: trade_required.trim(),
            location_county: location_county || 'Nairobi',
            location_town: location_town || 'Nairobi',
            budget_estimate: parseFloat(budget_estimate) || 10000.00,
            duration: duration || '2 weeks',
            status: status || 'open',
            client_id: client_id && client_id !== '' ? parseInt(client_id, 10) : (req.session.user ? req.session.user.id : 1)
        });

        if (req.xhr || req.headers.accept?.includes('application/json')) {
            return res.json({ success: true, message: 'Job posted successfully', job });
        }
        res.redirect('/dashboard/admin/jobs?success=Job+posted+successfully');
    } catch (error) {
        console.error('Error creating job:', error);
        if (req.xhr || req.headers.accept?.includes('application/json')) {
            return res.status(500).json({ success: false, message: error.message });
        }
        res.redirect('/dashboard/admin/jobs?error=' + encodeURIComponent(error.message));
    }
};

// GET Single Job
exports.getJob = async (req, res) => {
    try {
        const job = await JobPost.findByPk(req.params.id, {
            include: [{ model: User, as: 'client', attributes: ['id', 'name', 'email'] }]
        });
        if (!job) return res.status(404).json({ success: false, message: 'Job not found' });
        res.json({ success: true, job });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// UPDATE Job
exports.updateJob = async (req, res) => {
    try {
        const { id } = req.params;
        const { title, description, trade_required, location_county, location_town, budget_estimate, duration, status } = req.body;

        const job = await JobPost.findByPk(id);
        if (!job) return res.status(404).json({ success: false, message: 'Job not found' });

        const updates = {};
        if (title) updates.title = title.trim();
        if (description !== undefined) updates.description = description.trim();
        if (trade_required) updates.trade_required = trade_required.trim();
        if (location_county) updates.location_county = location_county.trim();
        if (location_town) updates.location_town = location_town.trim();
        if (budget_estimate !== undefined) updates.budget_estimate = parseFloat(budget_estimate);
        if (duration) updates.duration = duration.trim();
        if (status) updates.status = status;

        await job.update(updates);

        if (req.xhr || req.headers.accept?.includes('application/json')) {
            return res.json({ success: true, message: 'Job updated successfully', job });
        }
        res.redirect('/dashboard/admin/jobs?success=Job+updated+successfully');
    } catch (error) {
        console.error('Error updating job:', error);
        if (req.xhr || req.headers.accept?.includes('application/json')) {
            return res.status(500).json({ success: false, message: error.message });
        }
        res.redirect('/dashboard/admin/jobs?error=' + encodeURIComponent(error.message));
    }
};

// DELETE Job
exports.deleteJob = async (req, res) => {
    try {
        const { id } = req.params;
        const job = await JobPost.findByPk(id);
        if (!job) return res.status(404).json({ success: false, message: 'Job not found' });

        await JobApplication.destroy({ where: { job_id: id } }).catch(() => {});
        await job.destroy();

        if (req.xhr || req.headers.accept?.includes('application/json')) {
            return res.json({ success: true, message: 'Job deleted successfully' });
        }
        res.redirect('/dashboard/admin/jobs?success=Job+deleted+successfully');
    } catch (error) {
        console.error('Error deleting job:', error);
        if (req.xhr || req.headers.accept?.includes('application/json')) {
            return res.status(500).json({ success: false, message: error.message });
        }
        res.redirect('/dashboard/admin/jobs?error=' + encodeURIComponent(error.message));
    }
};
