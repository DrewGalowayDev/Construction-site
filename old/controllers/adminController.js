const { User, Product, Category, ArtisanProfile, JobPost, JobApplication, OrderRequest, Wallet, Transaction, ContactUnlock } = require('../models');
const PRICING = require('../config/pricing');

exports.getAdminDashboard = async (req, res) => {
  try {
    const adminUser = req.session.user;

    // Fetch core platform datasets in parallel
    const [allUsers, allProducts, allJobs, allOrders, allWallets, recentTransactions] = await Promise.all([
      User.findAll({
        include: [{ model: ArtisanProfile, as: 'artisanProfile' }],
        order: [['created_at', 'DESC']]
      }),
      Product.findAll({
        include: [
          { model: User, as: 'seller', attributes: ['id', 'name', 'phone', 'email'] },
          { model: Category, as: 'category' }
        ],
        order: [['created_at', 'DESC']]
      }),
      JobPost.findAll({
        include: [
          { model: User, as: 'client', attributes: ['id', 'name', 'phone', 'email'] },
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
      }),
      Wallet.findAll(),
      Transaction.findAll({
        include: [{ model: User, as: 'user', attributes: ['id', 'name', 'phone'] }],
        order: [['created_at', 'DESC']],
        limit: 30
      })
    ]);

    // Financial & Escrow Metrics
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
    const totalWalletFloat = allWallets.reduce((acc, w) => acc + parseFloat(w.balance || 0), 0);
    const totalBids = allJobs.reduce((acc, j) => acc + (j.applications ? j.applications.length : 0), 0);

    const pendingPayoutCount = allOrders.filter(o => o.escrow_status === 'released').length;
    const activeTab = req.query.tab || 'overview';

    res.render('pages/admin', {
      layout: 'layouts/admin',
      title: 'Admin Command Center | TopLineHub',
      adminUser,
      allUsers,
      allProducts,
      allJobs,
      allOrders,
      recentTransactions,
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
        totalCommission,
        totalWalletFloat,
        pendingPayoutCount
      },
      activeTab,
      pricing: PRICING
    });
  } catch (err) {
    console.error('Admin dashboard error:', err);
    req.flash('error', 'Error loading admin portal.');
    res.redirect('/dashboard');
  }
};

// Admin Disburse Escrow Payout to Supplier
exports.disburseEscrow = async (req, res) => {
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
      return res.redirect('/admin?tab=escrow');
    }

    if (order.escrow_status !== 'released') {
      req.flash('error', `Cannot disburse Order #${order.id}. Current status is "${order.escrow_status}". Funds can only be disbursed once released by the buyer.`);
      return res.redirect('/admin?tab=escrow');
    }

    const seller = order.product ? order.product.seller : null;
    if (!seller) {
      req.flash('error', 'Associated supplier could not be identified for payout.');
      return res.redirect('/admin?tab=escrow');
    }

    // Ensure seller has wallet
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

    await order.update({
      escrow_status: 'disbursed',
      disbursement_date: new Date(),
      status: 'completed'
    });

    await Transaction.create({
      user_id: seller.id,
      type: 'seller_payout',
      amount: payoutAmount,
      balance_before: balanceBefore,
      balance_after: balanceAfter,
      description: `Escrow Disbursement — Order #${order.id} for "${order.product.title}". Net seller payout credited to wallet.`,
      reference_type: 'product',
      reference_id: order.product_id,
      payment_method: 'paystack',
      mpesa_receipt: order.paystack_reference || `DISB_${order.id}_${Date.now()}`,
      status: 'completed'
    });

    req.flash('success', `Disbursed KES ${payoutAmount.toLocaleString()} to supplier ${seller.name} (${seller.phone}) for Order #${order.id}. Funds credited to their wallet!`);
    res.redirect('/admin?tab=escrow');
  } catch (err) {
    console.error('Admin disburse error:', err);
    req.flash('error', 'Failed to disburse escrow funds.');
    res.redirect('/admin?tab=escrow');
  }
};

// Admin Toggle User Verification
exports.toggleVerifyUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findByPk(userId);
    if (!user) {
      req.flash('error', 'User not found.');
      return res.redirect('/admin?tab=users');
    }
    user.is_verified = !user.is_verified;
    await user.save();
    req.flash('success', `${user.name} is now ${user.is_verified ? 'VERIFIED' : 'UNVERIFIED'}.`);
    res.redirect('/admin?tab=users');
  } catch (err) {
    console.error('Toggle verify error:', err);
    req.flash('error', 'Failed to update verification status.');
    res.redirect('/admin?tab=users');
  }
};

// Admin Update User Role
exports.updateUserRole = async (req, res) => {
  try {
    const { userId } = req.params;
    const { role } = req.body;
    const user = await User.findByPk(userId);
    if (!user) {
      req.flash('error', 'User not found.');
      return res.redirect('/admin?tab=users');
    }
    user.role = role;
    await user.save();
    req.flash('success', `Role for ${user.name} updated to ${role.toUpperCase()}.`);
    res.redirect('/admin?tab=users');
  } catch (err) {
    console.error('Update role error:', err);
    req.flash('error', 'Failed to update user role.');
    res.redirect('/admin?tab=users');
  }
};

// Admin Delete Product Listing
exports.deleteProduct = async (req, res) => {
  try {
    const { productId } = req.params;
    const product = await Product.findByPk(productId);
    if (product) {
      const title = product.title;
      await product.destroy();
      req.flash('success', `Listing "${title}" permanently removed.`);
    }
    res.redirect('/admin?tab=listings');
  } catch (err) {
    console.error('Admin delete product error:', err);
    req.flash('error', 'Failed to delete listing.');
    res.redirect('/admin?tab=listings');
  }
};

// Admin Delete Job Posting
exports.deleteJob = async (req, res) => {
  try {
    const { jobId } = req.params;
    const job = await JobPost.findByPk(jobId);
    if (job) {
      const title = job.title;
      await job.destroy();
      req.flash('success', `Project "${title}" deleted.`);
    }
    res.redirect('/admin?tab=jobs');
  } catch (err) {
    console.error('Admin delete job error:', err);
    req.flash('error', 'Failed to delete project.');
    res.redirect('/admin?tab=jobs');
  }
};
