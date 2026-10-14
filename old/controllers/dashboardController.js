const { User, Product, Category, ArtisanProfile, JobPost, JobApplication, OrderRequest, Wallet, Transaction, ContactUnlock } = require('../models');
const PRICING = require('../config/pricing');
const { maskPhoneNumber, formatWhatsAppUrl } = require('../helpers/contactHelpers');

exports.getDashboard = async (req, res) => {
  try {
    const userId = req.session.user.id;

    // Fetch user details with artisan profile if exists
    const currentUser = await User.findByPk(userId, {
      include: [{ model: ArtisanProfile, as: 'artisanProfile' }]
    });

    if (!currentUser) {
      req.flash('error', 'User account not found.');
      return res.redirect('/auth/logout');
    }

    // 0. Ensure user has a wallet & fetch wallet + transactions
    let userWallet = await Wallet.findOne({ where: { user_id: userId } });
    if (!userWallet) {
      userWallet = await Wallet.create({
        user_id: userId,
        balance: PRICING.NEW_USER_FREE_CREDITS || 100.00
      });
      await Transaction.create({
        user_id: userId,
        type: 'topup',
        amount: PRICING.NEW_USER_FREE_CREDITS || 100.00,
        balance_before: 0,
        balance_after: PRICING.NEW_USER_FREE_CREDITS || 100.00,
        description: 'Welcome Bonus - Free Platform Credits',
        reference_type: 'topup',
        payment_method: 'bonus',
        status: 'completed'
      });
    }

    const transactions = await Transaction.findAll({
      where: { user_id: userId },
      order: [['created_at', 'DESC']],
      limit: 25
    });

    // Fetch all unlocked contact records for this user
    const userUnlocks = await ContactUnlock.findAll({
      where: { user_id: userId }
    });
    const unlockedJobIds = new Set(userUnlocks.filter(u => u.unlock_type === 'job_client').map(u => u.target_id));
    const unlockedOrderIds = new Set(userUnlocks.filter(u => u.unlock_type === 'order_client').map(u => u.target_id));
    const unlockedProductIds = new Set(userUnlocks.filter(u => u.unlock_type === 'material_supplier').map(u => u.target_id));
    const unlockedArtisanIds = new Set(userUnlocks.filter(u => u.unlock_type === 'artisan_fundi').map(u => u.target_id));

    // 1. Client Data: Posted Jobs + Artisan Proposals
    const postedJobs = await JobPost.findAll({
      where: { client_id: userId },
      include: [
        {
          model: JobApplication,
          as: 'applications',
          include: [
            {
              model: User,
              as: 'artisan',
              attributes: ['id', 'name', 'phone', 'email', 'avatar', 'county', 'town'],
              include: [{ model: ArtisanProfile, as: 'artisanProfile' }]
            }
          ]
        }
      ],
      order: [['created_at', 'DESC']]
    });

    // 2. Artisan Data: Submitted Bids & Gigs with contact gating
    const myApplications = await JobApplication.findAll({
      where: { artisan_id: userId },
      include: [
        {
          model: JobPost,
          as: 'job',
          include: [
            { model: User, as: 'client', attributes: ['id', 'name', 'phone', 'county', 'town'] }
          ]
        }
      ],
      order: [['created_at', 'DESC']]
    });

    const myApplicationsWithUnlock = myApplications.map(app => {
      const plain = app.get({ plain: true });
      const isUnlocked = unlockedJobIds.has(plain.job_id);
      const rawPhone = plain.job && plain.job.client ? plain.job.client.phone : '';
      return {
        ...plain,
        contactUnlocked: isUnlocked,
        maskedClientPhone: maskPhoneNumber(rawPhone),
        clientPhone: isUnlocked ? rawPhone : null,
        waUrl: isUnlocked ? formatWhatsAppUrl(rawPhone, `Hi ${plain.job && plain.job.client ? plain.job.client.name : 'Client'}, regarding my bid of Ksh ${Number(plain.bid_amount).toLocaleString()} on "${plain.job ? plain.job.title : 'Job'}" on TopLineHub, I am available to discuss next steps.`) : null,
        unlockPrice: PRICING.UNLOCK_JOB_CLIENT_CONTACT
      };
    });

    // 3. Supplier Data: Listed Products / Heavy Machinery
    const myProducts = await Product.findAll({
      where: { seller_id: userId },
      include: [{ model: Category, as: 'category' }],
      order: [['created_at', 'DESC']]
    });

    // Incoming Material Orders & Equipment Hire Requests for Seller's Products with commission unlock gating
    const productIds = myProducts.map(p => p.id);
    let incomingInquiries = [];
    if (productIds.length > 0) {
      incomingInquiries = await OrderRequest.findAll({
        where: { product_id: productIds },
        include: [
          { model: Product, as: 'product' },
          { model: User, as: 'buyer', attributes: ['id', 'name', 'phone', 'email'] }
        ],
        order: [['created_at', 'DESC']]
      });
    }

    const incomingInquiriesWithUnlock = incomingInquiries.map(order => {
      const plain = order.get({ plain: true });
      const isUnlocked = unlockedOrderIds.has(plain.id);
      const rawBuyerPhone = plain.contact_phone || (plain.buyer ? plain.buyer.phone : '');
      return {
        ...plain,
        contactUnlocked: isUnlocked,
        maskedBuyerPhone: maskPhoneNumber(rawBuyerPhone),
        buyerPhone: isUnlocked ? rawBuyerPhone : null,
        waOrderUrl: isUnlocked ? formatWhatsAppUrl(rawBuyerPhone, `Hi ${plain.buyer ? plain.buyer.name : 'Client'}, regarding your order/hire request #${plain.id} for "${plain.product ? plain.product.title : 'items'}" on TopLineHub, confirming site delivery details.`) : null,
        unlockPrice: PRICING.UNLOCK_ORDER_CLIENT_CONTACT || 50.00
      };
    });

    // 4. Buyer Orders: Quote requests submitted by this user
    const myOrders = await OrderRequest.findAll({
      where: { buyer_id: userId },
      include: [
        {
          model: Product,
          as: 'product',
          include: [{ model: User, as: 'seller', attributes: ['name', 'phone'] }]
        }
      ],
      order: [['created_at', 'DESC']]
    });

    // 5. Admin Data & Platform Analytics (Only fetched for admin users)
    let adminData = {
      users: [],
      products: [],
      jobs: [],
      orders: [],
      stats: { totalUsers: 0, totalProducts: 0, totalJobs: 0, totalBids: 0, totalOrders: 0, totalVolume: 0 }
    };

    if (currentUser.role === 'admin') {
      const [allUsers, allProducts, allJobs, allOrders] = await Promise.all([
        User.findAll({
          include: [{ model: ArtisanProfile, as: 'artisanProfile' }],
          order: [['created_at', 'DESC']]
        }),
        Product.findAll({
          include: [
            { model: User, as: 'seller', attributes: ['name', 'phone'] },
            { model: Category, as: 'category' }
          ],
          order: [['created_at', 'DESC']]
        }),
        JobPost.findAll({
          include: [
            { model: User, as: 'client', attributes: ['name', 'phone'] },
            { model: JobApplication, as: 'applications' }
          ],
          order: [['created_at', 'DESC']]
        }),
        OrderRequest.findAll({
          include: [
            {
              model: Product,
              as: 'product',
              include: [{ model: User, as: 'seller', attributes: ['id', 'name', 'phone', 'email'] }]
            },
            { model: User, as: 'buyer', attributes: ['id', 'name', 'phone', 'email'] }
          ],
          order: [['created_at', 'DESC']]
        })
      ]);

      const totalBids = allJobs.reduce((acc, j) => acc + (j.applications ? j.applications.length : 0), 0);
      const totalVolume = allOrders.reduce((acc, o) => acc + parseFloat(o.total_price || 0), 0);
      const totalEscrowHeld = allOrders
        .filter(o => o.escrow_status === 'held')
        .reduce((acc, o) => acc + parseFloat(o.total_price || 0), 0);
      const totalEscrowReady = allOrders
        .filter(o => o.escrow_status === 'released')
        .reduce((acc, o) => acc + parseFloat(o.seller_payout_amount || 0), 0);
      const totalEscrowDisbursed = allOrders
        .filter(o => o.escrow_status === 'disbursed')
        .reduce((acc, o) => acc + parseFloat(o.seller_payout_amount || 0), 0);
      const totalCommission = allOrders
        .filter(o => o.payment_status === 'paid')
        .reduce((acc, o) => acc + parseFloat(o.platform_fee || 0), 0);

      adminData = {
        users: allUsers,
        products: allProducts,
        jobs: allJobs,
        orders: allOrders,
        stats: {
          totalUsers: allUsers.length,
          totalProducts: allProducts.length,
          totalJobs: allJobs.length,
          totalBids,
          totalOrders: allOrders.length,
          totalVolume,
          totalEscrowHeld,
          totalEscrowReady,
          totalEscrowDisbursed,
          totalCommission
        }
      };
    }

    // 6. Fetch Embedded Marketplace Data (For seamless internal hub browsing without leaving dashboard)
    const [rawMaterials, rawRentals, rawFundis, rawJobs, categories] = await Promise.all([
      Product.findAll({
        where: { is_rental: false, is_active: true },
        include: [{ model: Category, as: 'category' }, { model: User, as: 'seller', attributes: ['name', 'phone'] }],
        limit: 12,
        order: [['created_at', 'DESC']]
      }),
      Product.findAll({
        where: { is_rental: true, is_active: true },
        include: [{ model: Category, as: 'category' }, { model: User, as: 'seller', attributes: ['name', 'phone'] }],
        limit: 12,
        order: [['created_at', 'DESC']]
      }),
      ArtisanProfile.findAll({
        where: { is_available: true },
        include: [{ model: User, as: 'user' }],
        limit: 12,
        order: [['rating', 'DESC']]
      }),
      JobPost.findAll({
        where: { status: 'open' },
        include: [{ model: User, as: 'client', attributes: ['name', 'phone'] }],
        limit: 12,
        order: [['created_at', 'DESC']]
      }),
      Category.findAll({ order: [['name', 'ASC']] })
    ]);

    const marketplaceMaterials = rawMaterials.map(item => ({
      ...item.get({ plain: true }),
      contactUnlocked: unlockedProductIds.has(item.id),
      maskedPhone: item.seller ? maskPhoneNumber(item.seller.phone) : '🔒 Protected',
      unlockPrice: PRICING.UNLOCK_MATERIAL_SUPPLIER_CONTACT
    }));

    const marketplaceRentals = rawRentals.map(item => ({
      ...item.get({ plain: true }),
      contactUnlocked: unlockedProductIds.has(item.id),
      maskedPhone: item.seller ? maskPhoneNumber(item.seller.phone) : '🔒 Protected',
      unlockPrice: PRICING.UNLOCK_MATERIAL_SUPPLIER_CONTACT
    }));

    const marketplaceFundis = rawFundis.map(item => ({
      ...item.get({ plain: true }),
      contactUnlocked: unlockedArtisanIds.has(item.id),
      maskedPhone: item.user ? maskPhoneNumber(item.user.phone) : '🔒 Protected',
      unlockPrice: PRICING.UNLOCK_ARTISAN_CONTACT
    }));

    const marketplaceJobs = rawJobs.map(item => ({
      ...item.get({ plain: true }),
      contactUnlocked: unlockedJobIds.has(item.id),
      maskedPhone: item.client ? maskPhoneNumber(item.client.phone) : '🔒 Protected',
      unlockPrice: PRICING.UNLOCK_JOB_CLIENT_CONTACT
    }));

    // Determine Active Tab
    if ((req.query.tab === 'admin' || defaultTab === 'admin') && currentUser.role === 'admin' && req.query.tab === 'admin') {
      return res.redirect('/admin');
    }

    const defaultTab = currentUser.role === 'admin'
      ? 'overview'
      : currentUser.role === 'artisan'
      ? 'artisan'
      : currentUser.role === 'seller'
      ? 'supplier'
      : (postedJobs.length > 0 ? 'client' : (myOrders.length > 0 ? 'orders' : 'overview'));

    const activeTab = req.query.tab || defaultTab;

    res.render('pages/dashboard', {
      layout: 'layouts/dashboard',
      title: 'Workstation & Marketplace Hub',
      currentUser,
      userWallet,
      transactions,
      postedJobs,
      myApplications: myApplicationsWithUnlock,
      myProducts,
      incomingInquiries: incomingInquiriesWithUnlock,
      myOrders,
      adminData,
      marketplaceMaterials,
      marketplaceRentals,
      marketplaceFundis,
      marketplaceJobs,
      categories,
      pricing: PRICING,
      activeTab
    });
  } catch (err) {
    console.error('Dashboard error:', err);
    res.status(500).send('Error loading dashboard');
  }
};

// Phase 2: Update Bid Proposal Status (Client review workflow)
exports.updateBidStatus = async (req, res) => {
  try {
    const { jobId, bidId } = req.params;
    const { status } = req.body;
    const userId = req.session.user.id;

    const allowedStatuses = ['pending', 'shortlisted', 'accepted', 'rejected'];
    if (!allowedStatuses.includes(status)) {
      req.flash('error', 'Invalid bid status requested.');
      return res.redirect('/dashboard?tab=client');
    }

    const job = await JobPost.findByPk(jobId);
    if (!job) {
      req.flash('error', 'Project not found.');
      return res.redirect('/dashboard?tab=client');
    }

    if (job.client_id !== userId && req.session.user.role !== 'admin') {
      req.flash('error', 'Unauthorized to manage bids on this project.');
      return res.redirect('/dashboard?tab=client');
    }

    const bid = await JobApplication.findOne({
      where: { id: bidId, job_id: jobId },
      include: [{ model: User, as: 'artisan', attributes: ['name'] }]
    });

    if (!bid) {
      req.flash('error', 'Bid proposal not found.');
      return res.redirect('/dashboard?tab=client');
    }

    bid.status = status;
    await bid.save();

    // If accepted, optionally update job to in_progress
    if (status === 'accepted' && job.status === 'open') {
      job.status = 'in_progress';
      await job.save();
    }

    const artisanName = bid.artisan ? bid.artisan.name : 'Artisan';
    req.flash('success', `Proposal from ${artisanName} updated to "${status.toUpperCase()}".`);
    res.redirect('/dashboard?tab=client');
  } catch (err) {
    console.error('Update bid status error:', err);
    req.flash('error', 'Failed to update bid status.');
    res.redirect('/dashboard?tab=client');
  }
};

// Update Job Post Status (Client workflow)
exports.updateJobStatus = async (req, res) => {
  try {
    const { jobId } = req.params;
    const { status } = req.body;
    const userId = req.session.user.id;

    const job = await JobPost.findByPk(jobId);
    if (!job) {
      req.flash('error', 'Project not found.');
      return res.redirect('/dashboard?tab=client');
    }

    if (job.client_id !== userId && req.session.user.role !== 'admin') {
      req.flash('error', 'Unauthorized to manage this project.');
      return res.redirect('/dashboard?tab=client');
    }

    job.status = status;
    await job.save();

    req.flash('success', `Project "${job.title}" status updated to ${status}.`);
    res.redirect('/dashboard?tab=client');
  } catch (err) {
    console.error('Update job status error:', err);
    req.flash('error', 'Failed to update project status.');
    res.redirect('/dashboard?tab=client');
  }
};

// Update Order Request Status (Supplier workflow)
exports.updateOrderStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status } = req.body;
    const userId = req.session.user.id;

    const order = await OrderRequest.findByPk(orderId, {
      include: [{ model: Product, as: 'product' }]
    });

    if (!order) {
      req.flash('error', 'Quote inquiry not found.');
      return res.redirect('/dashboard?tab=supplier');
    }

    const isSeller = order.product && order.product.seller_id === userId;
    const isBuyer = order.buyer_id === userId;

    if (!isSeller && !isBuyer && req.session.user.role !== 'admin') {
      req.flash('error', 'Unauthorized to update this order request.');
      return res.redirect('/dashboard');
    }

    order.status = status;
    await order.save();

    req.flash('success', `Order request status updated to "${status}".`);
    res.redirect(isSeller ? '/dashboard?tab=supplier' : '/dashboard?tab=orders');
  } catch (err) {
    console.error('Update order status error:', err);
    req.flash('error', 'Failed to update order status.');
    res.redirect('/dashboard?tab=supplier');
  }
};

// Toggle Product / Equipment Active State
exports.toggleProductStatus = async (req, res) => {
  try {
    const { productId } = req.params;
    const userId = req.session.user.id;

    const product = await Product.findByPk(productId);
    if (!product) {
      req.flash('error', 'Listing not found.');
      return res.redirect('/dashboard?tab=supplier');
    }

    if (product.seller_id !== userId && req.session.user.role !== 'admin') {
      req.flash('error', 'Unauthorized to update this product listing.');
      return res.redirect('/dashboard?tab=supplier');
    }

    product.is_active = !product.is_active;
    await product.save();

    req.flash('success', `Listing "${product.title}" is now ${product.is_active ? 'ACTIVE' : 'PAUSED'}.`);
    res.redirect('/dashboard?tab=supplier');
  } catch (err) {
    console.error('Toggle product error:', err);
    req.flash('error', 'Failed to toggle listing state.');
    res.redirect('/dashboard?tab=supplier');
  }
};

// Profile Update
exports.updateProfile = async (req, res) => {
  try {
    const userId = req.session.user.id;
    const { name, phone, county, town, trade, daily_rate, experience_years, bio, nca_reg_number, is_available } = req.body;

    const user = await User.findByPk(userId);
    if (!user) {
      req.flash('error', 'User not found.');
      return res.redirect('/dashboard');
    }

    user.name = name || user.name;
    user.phone = phone || user.phone;
    user.county = county || user.county;
    user.town = town || user.town;

    // Handle avatar upload
    if (req.file) {
      user.avatar = `/uploads/avatars/${req.file.filename}`;
    }

    await user.save();

    // If artisan, update artisan profile
    if (user.role === 'artisan') {
      let artisanProfile = await ArtisanProfile.findOne({ where: { user_id: userId } });
      if (!artisanProfile) {
        artisanProfile = await ArtisanProfile.create({ user_id: userId, trade: trade || 'General Artisan' });
      }
      if (trade) artisanProfile.trade = trade;
      if (daily_rate) artisanProfile.daily_rate = parseFloat(daily_rate) || 2000;
      if (experience_years) artisanProfile.experience_years = parseInt(experience_years, 10) || 1;
      if (bio) artisanProfile.bio = bio;
      if (nca_reg_number !== undefined) artisanProfile.nca_reg_number = nca_reg_number;
      artisanProfile.is_available = is_available === 'on' || is_available === 'true' || is_available === true;
      await artisanProfile.save();
    }

    // Refresh session with updated data
    req.session.user.name = user.name;
    req.session.user.phone = user.phone;
    req.session.user.county = user.county;
    req.session.user.town = user.town;
    req.session.user.avatar = user.avatar;

    req.flash('success', 'Profile updated successfully!');
    res.redirect('/dashboard?tab=profile');
  } catch (err) {
    console.error('Update profile error:', err);
    req.flash('error', 'Failed to update profile.');
    res.redirect('/dashboard?tab=profile');
  }
};

// Admin Action Handlers
exports.adminToggleVerifyUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findByPk(userId);
    if (!user) {
      req.flash('error', 'User not found.');
      return res.redirect('/dashboard?tab=admin');
    }
    user.is_verified = !user.is_verified;
    await user.save();
    req.flash('success', `Verification status for ${user.name} set to ${user.is_verified ? 'VERIFIED' : 'UNVERIFIED'}.`);
    res.redirect('/dashboard?tab=admin');
  } catch (err) {
    console.error('Admin verify error:', err);
    req.flash('error', 'Failed to update user verification.');
    res.redirect('/dashboard?tab=admin');
  }
};

exports.adminUpdateUserRole = async (req, res) => {
  try {
    const { userId } = req.params;
    const { role } = req.body;
    const user = await User.findByPk(userId);
    if (!user) {
      req.flash('error', 'User not found.');
      return res.redirect('/dashboard?tab=admin');
    }
    user.role = role;
    await user.save();
    req.flash('success', `Role for ${user.name} changed to ${role.toUpperCase()}.`);
    res.redirect('/dashboard?tab=admin');
  } catch (err) {
    console.error('Admin role error:', err);
    req.flash('error', 'Failed to update user role.');
    res.redirect('/dashboard?tab=admin');
  }
};

exports.adminDeleteProduct = async (req, res) => {
  try {
    const { productId } = req.params;
    const product = await Product.findByPk(productId);
    if (product) {
      const title = product.title;
      await product.destroy();
      req.flash('success', `Listing "${title}" was permanently removed.`);
    }
    res.redirect('/dashboard?tab=admin');
  } catch (err) {
    console.error('Admin delete product error:', err);
    req.flash('error', 'Failed to remove listing.');
    res.redirect('/dashboard?tab=admin');
  }
};

exports.adminDeleteJob = async (req, res) => {
  try {
    const { jobId } = req.params;
    const job = await JobPost.findByPk(jobId);
    if (job) {
      const title = job.title;
      await job.destroy();
      req.flash('success', `Project "${title}" was removed.`);
    }
    res.redirect('/dashboard?tab=admin');
  } catch (err) {
    console.error('Admin delete job error:', err);
    req.flash('error', 'Failed to remove project.');
    res.redirect('/dashboard?tab=admin');
  }
};

// Admin Escrow Disbursement to Supplier
exports.adminDisburseEscrow = async (req, res) => {
  try {
    const { orderId } = req.params;
    const order = await OrderRequest.findByPk(orderId, {
      include: [
        { model: Product, as: 'product', include: [{ model: User, as: 'seller' }] },
        { model: User, as: 'buyer' }
      ]
    });

    if (!order) {
      req.flash('error', 'Order not found.');
      return res.redirect('/dashboard?tab=admin');
    }

    if (order.escrow_status !== 'released') {
      req.flash('error', `Cannot disburse Order #${order.id}. Current escrow status is "${order.escrow_status}". It must be "released" by the buyer first.`);
      return res.redirect('/dashboard?tab=admin');
    }

    const seller = order.product ? order.product.seller : null;
    if (!seller) {
      req.flash('error', 'Supplier associated with this product could not be identified.');
      return res.redirect('/dashboard?tab=admin');
    }

    // Get or initialize supplier wallet
    let sellerWallet = await Wallet.findOne({ where: { user_id: seller.id } });
    if (!sellerWallet) {
      sellerWallet = await Wallet.create({
        user_id: seller.id,
        balance: 0.00
      });
    }

    const payoutAmount = parseFloat(order.seller_payout_amount) || (parseFloat(order.total_price) * 0.90);
    const balanceBefore = parseFloat(sellerWallet.balance);
    const balanceAfter = balanceBefore + payoutAmount;

    sellerWallet.balance = balanceAfter;
    await sellerWallet.save();

    // Mark order as disbursed
    await order.update({
      escrow_status: 'disbursed',
      disbursement_date: new Date(),
      status: 'completed'
    });

    // Record Transaction for seller
    await Transaction.create({
      user_id: seller.id,
      type: 'seller_payout',
      amount: payoutAmount,
      balance_before: balanceBefore,
      balance_after: balanceAfter,
      description: `Escrow Payout Disbursed — Order #${order.id} for "${order.product.title}". Credited to supplier wallet balance.`,
      reference_type: 'product',
      reference_id: order.product_id,
      payment_method: 'paystack',
      mpesa_receipt: order.paystack_reference || `DISB_${order.id}_${Date.now()}`,
      status: 'completed'
    });

    req.flash('success', `Successfully disbursed KES ${payoutAmount.toLocaleString()} to supplier ${seller.name} (${seller.phone}) for Order #${order.id}! Funds are now in their wallet.`);
    res.redirect('/dashboard?tab=admin');
  } catch (err) {
    console.error('Admin disburse escrow error:', err);
    req.flash('error', 'Failed to disburse escrow payout.');
    res.redirect('/dashboard?tab=admin');
  }
};

// Client CRUD: Edit Job Details
exports.editJob = async (req, res) => {
  try {
    const { jobId } = req.params;
    const userId = req.session.user.id;
    const { title, description, trade_required, location_county, location_town, budget_estimate, duration } = req.body;

    const job = await JobPost.findByPk(jobId);
    if (!job) {
      req.flash('error', 'Project not found.');
      return res.redirect('/dashboard?tab=client');
    }

    if (job.client_id !== userId && req.session.user.role !== 'admin') {
      req.flash('error', 'Unauthorized to modify this project.');
      return res.redirect('/dashboard?tab=client');
    }

    if (title) job.title = title.trim();
    if (description) job.description = description.trim();
    if (trade_required) job.trade_required = trade_required.trim();
    if (location_county) job.location_county = location_county.trim();
    if (location_town) job.location_town = location_town.trim();
    if (budget_estimate) job.budget_estimate = parseFloat(budget_estimate) || job.budget_estimate;
    if (duration) job.duration = duration.trim();

    await job.save();
    req.flash('success', `Project "${job.title}" updated successfully.`);
    res.redirect('/dashboard?tab=client');
  } catch (err) {
    console.error('Edit job error:', err);
    req.flash('error', 'Failed to update project details.');
    res.redirect('/dashboard?tab=client');
  }
};

// Client CRUD: Delete Job (Owner)
exports.deleteJob = async (req, res) => {
  try {
    const { jobId } = req.params;
    const userId = req.session.user.id;

    const job = await JobPost.findByPk(jobId);
    if (!job) {
      req.flash('error', 'Project not found.');
      return res.redirect('/dashboard?tab=client');
    }

    if (job.client_id !== userId && req.session.user.role !== 'admin') {
      req.flash('error', 'Unauthorized to delete this project.');
      return res.redirect('/dashboard?tab=client');
    }

    const title = job.title;
    // Remove associated applications first
    await JobApplication.destroy({ where: { job_id: jobId } });
    await job.destroy();

    req.flash('success', `Project "${title}" has been deleted.`);
    res.redirect(req.session.user.role === 'admin' && req.query.from === 'admin' ? '/dashboard?tab=admin' : '/dashboard?tab=client');
  } catch (err) {
    console.error('Delete job error:', err);
    req.flash('error', 'Failed to delete project.');
    res.redirect('/dashboard?tab=client');
  }
};

// Supplier CRUD: Edit Product / Listing
exports.editProduct = async (req, res) => {
  try {
    const { productId } = req.params;
    const userId = req.session.user.id;
    const { title, price, unit, stock_quantity, location_county, description } = req.body;

    const product = await Product.findByPk(productId);
    if (!product) {
      req.flash('error', 'Listing not found.');
      return res.redirect('/dashboard?tab=supplier');
    }

    if (product.seller_id !== userId && req.session.user.role !== 'admin') {
      req.flash('error', 'Unauthorized to modify this listing.');
      return res.redirect('/dashboard?tab=supplier');
    }

    if (title) product.title = title.trim();
    if (price) product.price = parseFloat(price) || product.price;
    if (unit) product.unit = unit.trim();
    if (stock_quantity !== undefined) product.stock_quantity = parseInt(stock_quantity, 10) || product.stock_quantity;
    if (location_county) product.location_county = location_county.trim();
    if (description) product.description = description.trim();

    await product.save();
    req.flash('success', `Listing "${product.title}" updated successfully.`);
    res.redirect('/dashboard?tab=supplier');
  } catch (err) {
    console.error('Edit product error:', err);
    req.flash('error', 'Failed to update listing.');
    res.redirect('/dashboard?tab=supplier');
  }
};

// Supplier CRUD: Delete Product (Owner)
exports.deleteProduct = async (req, res) => {
  try {
    const { productId } = req.params;
    const userId = req.session.user.id;

    const product = await Product.findByPk(productId);
    if (!product) {
      req.flash('error', 'Listing not found.');
      return res.redirect('/dashboard?tab=supplier');
    }

    if (product.seller_id !== userId && req.session.user.role !== 'admin') {
      req.flash('error', 'Unauthorized to delete this listing.');
      return res.redirect('/dashboard?tab=supplier');
    }

    const title = product.title;
    await product.destroy();

    req.flash('success', `Listing "${title}" has been deleted.`);
    res.redirect(req.session.user.role === 'admin' && req.query.from === 'admin' ? '/dashboard?tab=admin' : '/dashboard?tab=supplier');
  } catch (err) {
    console.error('Delete product error:', err);
    req.flash('error', 'Failed to delete listing.');
    res.redirect('/dashboard?tab=supplier');
  }
};

// Artisan CRUD: Edit Pending Bid
exports.editBid = async (req, res) => {
  try {
    const { bidId } = req.params;
    const userId = req.session.user.id;
    const { bid_amount, pitch_message } = req.body;

    const bid = await JobApplication.findByPk(bidId);
    if (!bid) {
      req.flash('error', 'Bid proposal not found.');
      return res.redirect('/dashboard?tab=artisan');
    }

    if (bid.artisan_id !== userId && req.session.user.role !== 'admin') {
      req.flash('error', 'Unauthorized to modify this bid.');
      return res.redirect('/dashboard?tab=artisan');
    }

    if (bid.status !== 'pending') {
      req.flash('error', 'Cannot edit a proposal that has already been reviewed or accepted by the client.');
      return res.redirect('/dashboard?tab=artisan');
    }

    if (bid_amount) bid.bid_amount = parseFloat(bid_amount) || bid.bid_amount;
    if (pitch_message) bid.pitch_message = pitch_message.trim();

    await bid.save();
    req.flash('success', 'Your proposal was updated successfully.');
    res.redirect('/dashboard?tab=artisan');
  } catch (err) {
    console.error('Edit bid error:', err);
    req.flash('error', 'Failed to update proposal.');
    res.redirect('/dashboard?tab=artisan');
  }
};

// Artisan CRUD: Delete / Withdraw Pending Bid
exports.deleteBid = async (req, res) => {
  try {
    const { bidId } = req.params;
    const userId = req.session.user.id;

    const bid = await JobApplication.findByPk(bidId);
    if (!bid) {
      req.flash('error', 'Bid proposal not found.');
      return res.redirect('/dashboard?tab=artisan');
    }

    if (bid.artisan_id !== userId && req.session.user.role !== 'admin') {
      req.flash('error', 'Unauthorized to withdraw this bid.');
      return res.redirect('/dashboard?tab=artisan');
    }

    await bid.destroy();
    req.flash('success', 'Proposal successfully withdrawn.');
    res.redirect('/dashboard?tab=artisan');
  } catch (err) {
    console.error('Delete bid error:', err);
    req.flash('error', 'Failed to withdraw proposal.');
    res.redirect('/dashboard?tab=artisan');
  }
};

// Buyer CRUD: Cancel Order Request
exports.cancelOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const userId = req.session.user.id;

    const order = await OrderRequest.findByPk(orderId);
    if (!order) {
      req.flash('error', 'Order request not found.');
      return res.redirect('/dashboard?tab=orders');
    }

    if (order.buyer_id !== userId && req.session.user.role !== 'admin') {
      req.flash('error', 'Unauthorized to cancel this order.');
      return res.redirect('/dashboard?tab=orders');
    }

    order.status = 'cancelled';
    await order.save();

    req.flash('success', 'Order inquiry marked as cancelled.');
    res.redirect('/dashboard?tab=orders');
  } catch (err) {
    console.error('Cancel order error:', err);
    req.flash('error', 'Failed to cancel order.');
    res.redirect('/dashboard?tab=orders');
  }
};

