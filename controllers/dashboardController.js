const { User, Product, Category, ArtisanProfile, JobPost, JobApplication, OrderRequest } = require('../models');

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

    // 2. Artisan Data: Submitted Bids & Gigs
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

    // 3. Supplier Data: Listed Products / Heavy Machinery
    const myProducts = await Product.findAll({
      where: { seller_id: userId },
      include: [{ model: Category, as: 'category' }],
      order: [['created_at', 'DESC']]
    });

    // Incoming Material Orders for Seller's Products
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
            { model: Product, as: 'product' },
            { model: User, as: 'buyer', attributes: ['name', 'phone'] }
          ],
          order: [['created_at', 'DESC']]
        })
      ]);

      const totalBids = allJobs.reduce((acc, j) => acc + (j.applications ? j.applications.length : 0), 0);
      const totalVolume = allOrders.reduce((acc, o) => acc + parseFloat(o.total_price || 0), 0);

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
          totalVolume
        }
      };
    }

    // Determine Active Tab
    const defaultTab = currentUser.role === 'admin'
      ? 'admin'
      : currentUser.role === 'artisan'
      ? 'artisan'
      : currentUser.role === 'seller'
      ? 'supplier'
      : (postedJobs.length > 0 ? 'client' : (myOrders.length > 0 ? 'orders' : 'client'));

    const activeTab = req.query.tab || defaultTab;

    res.render('pages/dashboard', {
      title: 'Unified User Dashboard',
      currentUser,
      postedJobs,
      myApplications,
      myProducts,
      incomingInquiries,
      myOrders,
      adminData,
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

