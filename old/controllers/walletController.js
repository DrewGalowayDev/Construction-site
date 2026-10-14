const { User, Wallet, Transaction, ContactUnlock, JobPost, Product, ArtisanProfile } = require('../models');
const { Op } = require('sequelize');
const PRICING = require('../config/pricing');

// Get Wallet & Transaction History
exports.getWallet = async (req, res) => {
  try {
    const userId = req.session.user.id;
    
    let wallet = await Wallet.findOne({ where: { user_id: userId } });
    
    // Create wallet if doesn't exist
    if (!wallet) {
      wallet = await Wallet.create({
        user_id: userId,
        balance: PRICING.NEW_USER_FREE_CREDITS
      });
      
      // Log free credits
      await Transaction.create({
        user_id: userId,
        type: 'topup',
        amount: PRICING.NEW_USER_FREE_CREDITS,
        balance_before: 0,
        balance_after: PRICING.NEW_USER_FREE_CREDITS,
        description: 'Welcome Bonus - Free Credits',
        reference_type: 'topup',
        payment_method: 'bonus',
        status: 'completed'
      });
    }
    
    const transactions = await Transaction.findAll({
      where: { user_id: userId },
      order: [['created_at', 'DESC']],
      limit: 50
    });
    
    const unlockedContacts = await ContactUnlock.findAll({
      where: { user_id: userId },
      order: [['unlocked_at', 'DESC']],
      limit: 20
    });
    
    res.render('pages/wallet', {
      title: 'My Wallet & Credits',
      wallet,
      transactions,
      unlockedContacts,
      pricing: PRICING
    });
  } catch (err) {
    console.error('Wallet error:', err);
    req.flash('error', 'Error loading wallet.');
    res.redirect('/dashboard');
  }
};

// Top-up Credits
exports.topUpCredits = async (req, res) => {
  try {
    const userId = req.session.user.id;
    const { amount, payment_method, mpesa_phone } = req.body;
    
    const topupAmount = parseFloat(amount);
    if (isNaN(topupAmount) || topupAmount <= 0) {
      req.flash('error', 'Invalid top-up amount.');
      return res.redirect('/wallet');
    }
    
    // Find bonus for this amount
    const topupOption = PRICING.TOPUP_OPTIONS.find(opt => opt.amount === topupAmount);
    const bonus = topupOption ? topupOption.bonus : 0;
    const totalCredit = topupAmount + bonus;
    
    let wallet = await Wallet.findOne({ where: { user_id: userId } });
    if (!wallet) {
      wallet = await Wallet.create({ user_id: userId, balance: 0 });
    }
    
    const balanceBefore = parseFloat(wallet.balance);
    const balanceAfter = balanceBefore + totalCredit;
    
    // Update wallet
    wallet.balance = balanceAfter;
    wallet.total_topped_up = parseFloat(wallet.total_topped_up) + topupAmount;
    await wallet.save();
    
    // Create transaction
    await Transaction.create({
      user_id: userId,
      type: 'topup',
      amount: totalCredit,
      balance_before: balanceBefore,
      balance_after: balanceAfter,
      description: `Top-up Ksh ${topupAmount.toLocaleString()}${bonus > 0 ? ' + Ksh ' + bonus + ' Bonus' : ''}`,
      reference_type: 'topup',
      payment_method: payment_method || 'mpesa',
      mpesa_receipt: 'SIM' + Date.now(),
      status: 'completed'
    });
    
    req.flash('success', `Successfully topped up Ksh ${totalCredit.toLocaleString()}! ${bonus > 0 ? 'Bonus Ksh ' + bonus + ' added!' : ''}`);
    res.redirect('/wallet');
  } catch (err) {
    console.error('Top-up error:', err);
    req.flash('error', 'Top-up failed. Please try again.');
    res.redirect('/wallet');
  }
};

// Initialize Paystack Wallet Top-up
exports.initializePaystackWalletTopup = async (req, res) => {
  try {
    const userId = req.session.user.id;
    const { amount } = req.body;
    const topupAmount = parseFloat(amount);

    if (isNaN(topupAmount) || topupAmount <= 0) {
      if (req.xhr || req.headers.accept?.includes('json')) {
        return res.status(400).json({ success: false, message: 'Invalid top-up amount' });
      }
      req.flash('error', 'Invalid top-up amount.');
      return res.redirect('/dashboard?tab=wallet');
    }

    const host = req.get('host');
    const protocol = req.protocol;
    const callbackUrl = `${protocol}://${host}/wallet/paystack/callback`;
    const reference = `TL_WAL_${userId}_${Date.now()}`;
    const rawEmail = (req.session.user && req.session.user.email) ? req.session.user.email : '';
    const userEmail = rawEmail.includes('@') ? rawEmail : `user_${userId}@toplinehub.co.ke`;

    const paystack = require('../helpers/paystackHelper');
    const paystackRes = await paystack.initializeTransaction({
      email: userEmail,
      amount: topupAmount,
      reference,
      callbackUrl,
      metadata: {
        wallet_user_id: userId,
        type: 'wallet_topup',
        amount: topupAmount
      }
    });

    if (req.xhr || req.headers.accept?.includes('json')) {
      return res.json({
        success: true,
        authorization_url: paystackRes.data.authorization_url,
        access_code: paystackRes.data.access_code,
        reference,
        amount: topupAmount,
        isSimulated: !!paystackRes.isSimulated
      });
    }

    return res.redirect(paystackRes.data.authorization_url);
  } catch (err) {
    console.error('Paystack wallet top-up init error:', err);
    if (req.xhr || req.headers.accept?.includes('json')) {
      return res.status(500).json({ success: false, message: err.message });
    }
    req.flash('error', `Failed to initialize Paystack payment: ${err.message}`);
    return res.redirect('/dashboard?tab=wallet');
  }
};

// Paystack Wallet Top-up Callback
exports.paystackWalletCallback = async (req, res) => {
  try {
    const { reference, trxref } = req.query;
    const paymentRef = reference || trxref;

    if (!paymentRef) {
      req.flash('error', 'No transaction reference found.');
      return res.redirect('/dashboard?tab=wallet');
    }

    const paystack = require('../helpers/paystackHelper');
    const verifyRes = await paystack.verifyTransaction(paymentRef);

    if (verifyRes.data && verifyRes.data.status === 'success') {
      const userId = req.session.user ? req.session.user.id : (verifyRes.data.metadata ? verifyRes.data.metadata.wallet_user_id : null);
      if (!userId) {
        req.flash('error', 'User identification failed.');
        return res.redirect('/dashboard');
      }

      // Check if this reference was already credited
      const existingTx = await Transaction.findOne({ where: { mpesa_receipt: paymentRef } });
      if (existingTx) {
        req.flash('info', 'This payment has already been credited to your wallet.');
        return res.redirect('/dashboard?tab=wallet');
      }

      const topupAmount = verifyRes.data.metadata && verifyRes.data.metadata.amount
        ? parseFloat(verifyRes.data.metadata.amount)
        : (verifyRes.data.amount ? Number(verifyRes.data.amount) / 100 : 100);

      const topupOption = PRICING.TOPUP_OPTIONS.find(opt => opt.amount === topupAmount);
      const bonus = topupOption ? topupOption.bonus : 0;
      const totalCredit = topupAmount + bonus;

      let wallet = await Wallet.findOne({ where: { user_id: userId } });
      if (!wallet) {
        wallet = await Wallet.create({ user_id: userId, balance: 0 });
      }

      const balanceBefore = parseFloat(wallet.balance);
      const balanceAfter = balanceBefore + totalCredit;

      wallet.balance = balanceAfter;
      wallet.total_topped_up = parseFloat(wallet.total_topped_up) + topupAmount;
      await wallet.save();

      await Transaction.create({
        user_id: userId,
        type: 'topup',
        amount: totalCredit,
        balance_before: balanceBefore,
        balance_after: balanceAfter,
        description: `Paystack Top-up Ksh ${topupAmount.toLocaleString()}${bonus > 0 ? ' + Ksh ' + bonus + ' Bonus' : ''}`,
        reference_type: 'topup',
        payment_method: 'paystack',
        mpesa_receipt: paymentRef,
        status: 'completed'
      });

      req.flash('success', `Payment confirmed via Paystack! KES ${totalCredit.toLocaleString()} credited to your site wallet.`);
      return res.redirect('/dashboard?tab=wallet');
    }

    req.flash('error', 'Paystack payment verification was not successful.');
    return res.redirect('/dashboard?tab=wallet');
  } catch (err) {
    console.error('Paystack wallet callback error:', err);
    req.flash('error', 'Failed to verify Paystack top-up.');
    return res.redirect('/dashboard?tab=wallet');
  }
};

// Unlock Job Client Contact
exports.unlockJobContact = async (req, res) => {
  try {
    const userId = req.session.user.id;
    const { jobId } = req.params;
    const referer = req.headers.referer || '/jobs';
    
    // Check if already unlocked
    const existingUnlock = await ContactUnlock.findOne({
      where: {
        user_id: userId,
        unlock_type: 'job_client',
        target_id: jobId
      }
    });
    
    if (existingUnlock) {
      req.flash('info', 'You have already unlocked this client contact.');
      return res.redirect(referer);
    }
    
    // Get wallet
    let wallet = await Wallet.findOne({ where: { user_id: userId } });
    if (!wallet) {
      wallet = await Wallet.create({ user_id: userId, balance: 0 });
    }
    
    const cost = PRICING.UNLOCK_JOB_CLIENT_CONTACT;
    
    if (parseFloat(wallet.balance) < cost) {
      req.flash('error', `Insufficient wallet balance. You need Ksh ${cost} to unlock this client's contact & WhatsApp. Current balance: Ksh ${parseFloat(wallet.balance).toFixed(2)}`);
      return res.redirect('/wallet');
    }
    
    // Deduct from wallet
    const balanceBefore = parseFloat(wallet.balance);
    const balanceAfter = balanceBefore - cost;
    
    wallet.balance = balanceAfter;
    wallet.total_spent = parseFloat(wallet.total_spent) + cost;
    await wallet.save();
    
    // Get job details
    const job = await JobPost.findByPk(jobId, {
      include: [{ model: User, as: 'client', attributes: ['name', 'phone'] }]
    });
    
    // Create unlock record
    await ContactUnlock.create({
      user_id: userId,
      unlock_type: 'job_client',
      target_id: jobId,
      amount_paid: cost
    });
    
    // Create transaction
    await Transaction.create({
      user_id: userId,
      type: 'unlock_job_contact',
      amount: cost,
      balance_before: balanceBefore,
      balance_after: balanceAfter,
      description: `Unlocked contact for job: ${job ? job.title : 'Job #' + jobId}`,
      reference_type: 'job',
      reference_id: jobId,
      payment_method: 'wallet',
      status: 'completed'
    });
    
    req.flash('success', `Client contact unlocked! Ksh ${cost} deducted. WhatsApp chat and phone number are now revealed.`);
    res.redirect(referer);
  } catch (err) {
    console.error('Unlock job contact error:', err);
    req.flash('error', 'Failed to unlock contact.');
    res.redirect(req.headers.referer || '/jobs');
  }
};

// Unlock Material Supplier Contact
exports.unlockMaterialContact = async (req, res) => {
  try {
    const userId = req.session.user.id;
    const { productId } = req.params;
    const referer = req.headers.referer || `/materials/${productId}`;
    
    const existingUnlock = await ContactUnlock.findOne({
      where: {
        user_id: userId,
        unlock_type: 'material_supplier',
        target_id: productId
      }
    });
    
    if (existingUnlock) {
      req.flash('info', 'You have already unlocked this contact.');
      return res.redirect(referer);
    }
    
    let wallet = await Wallet.findOne({ where: { user_id: userId } });
    if (!wallet) {
      wallet = await Wallet.create({ user_id: userId, balance: 0 });
    }
    
    const cost = PRICING.UNLOCK_MATERIAL_SUPPLIER_CONTACT;
    
    if (parseFloat(wallet.balance) < cost) {
      req.flash('error', `Insufficient wallet balance. You need Ksh ${cost} to unlock this vendor contact. Current balance: Ksh ${parseFloat(wallet.balance).toFixed(2)}`);
      return res.redirect('/wallet');
    }
    
    const balanceBefore = parseFloat(wallet.balance);
    const balanceAfter = balanceBefore - cost;
    
    wallet.balance = balanceAfter;
    wallet.total_spent = parseFloat(wallet.total_spent) + cost;
    await wallet.save();
    
    const product = await Product.findByPk(productId);
    
    await ContactUnlock.create({
      user_id: userId,
      unlock_type: 'material_supplier',
      target_id: productId,
      amount_paid: cost
    });
    
    await Transaction.create({
      user_id: userId,
      type: 'unlock_material_contact',
      amount: cost,
      balance_before: balanceBefore,
      balance_after: balanceAfter,
      description: `Unlocked contact for: ${product ? product.title : 'Listing #' + productId}`,
      reference_type: 'product',
      reference_id: productId,
      payment_method: 'wallet',
      status: 'completed'
    });
    
    req.flash('success', `Supplier contact unlocked! Ksh ${cost} deducted. WhatsApp chat and phone number are now revealed.`);
    res.redirect(referer);
  } catch (err) {
    console.error('Unlock material contact error:', err);
    req.flash('error', 'Failed to unlock contact.');
    res.redirect(req.headers.referer || '/materials');
  }
};

// Unlock Artisan Contact
exports.unlockArtisanContact = async (req, res) => {
  try {
    const userId = req.session.user.id;
    const { artisanId } = req.params;
    const referer = req.headers.referer || `/fundis/${artisanId}`;
    
    const existingUnlock = await ContactUnlock.findOne({
      where: {
        user_id: userId,
        unlock_type: 'artisan_fundi',
        target_id: artisanId
      }
    });
    
    if (existingUnlock) {
      req.flash('info', 'You have already unlocked this contact.');
      return res.redirect(referer);
    }
    
    let wallet = await Wallet.findOne({ where: { user_id: userId } });
    if (!wallet) {
      wallet = await Wallet.create({ user_id: userId, balance: 0 });
    }
    
    const cost = PRICING.UNLOCK_ARTISAN_CONTACT;
    
    if (parseFloat(wallet.balance) < cost) {
      req.flash('error', `Insufficient wallet balance. You need Ksh ${cost} to unlock this fundi contact. Current balance: Ksh ${parseFloat(wallet.balance).toFixed(2)}`);
      return res.redirect('/wallet');
    }
    
    const balanceBefore = parseFloat(wallet.balance);
    const balanceAfter = balanceBefore - cost;
    
    wallet.balance = balanceAfter;
    wallet.total_spent = parseFloat(wallet.total_spent) + cost;
    await wallet.save();
    
    const artisan = await ArtisanProfile.findByPk(artisanId, {
      include: [{ model: User, as: 'user', attributes: ['name'] }]
    });
    
    await ContactUnlock.create({
      user_id: userId,
      unlock_type: 'artisan_fundi',
      target_id: artisanId,
      amount_paid: cost
    });
    
    await Transaction.create({
      user_id: userId,
      type: 'unlock_artisan_contact',
      amount: cost,
      balance_before: balanceBefore,
      balance_after: balanceAfter,
      description: `Unlocked contact for artisan: ${artisan && artisan.user ? artisan.user.name : 'Artisan #' + artisanId}`,
      reference_type: 'artisan',
      reference_id: artisanId,
      payment_method: 'wallet',
      status: 'completed'
    });
    
    req.flash('success', `Artisan contact unlocked! Ksh ${cost} deducted. WhatsApp chat and phone number are now revealed.`);
    res.redirect(referer);
  } catch (err) {
    console.error('Unlock artisan contact error:', err);
    req.flash('error', 'Failed to unlock contact.');
    res.redirect(req.headers.referer || '/fundis');
  }
};

// Unlock Order / Equipment Hire Client Contact (for suppliers / machinery owners)
exports.unlockOrderContact = async (req, res) => {
  try {
    const userId = req.session.user.id;
    const { orderId } = req.params;
    const referer = req.headers.referer || '/dashboard?tab=orders';
    
    const existingUnlock = await ContactUnlock.findOne({
      where: {
        user_id: userId,
        unlock_type: 'order_client',
        target_id: orderId
      }
    });
    
    if (existingUnlock) {
      req.flash('info', 'You have already unlocked this client contact.');
      return res.redirect(referer);
    }
    
    let wallet = await Wallet.findOne({ where: { user_id: userId } });
    if (!wallet) {
      wallet = await Wallet.create({ user_id: userId, balance: 0 });
    }
    
    const cost = PRICING.UNLOCK_ORDER_CLIENT_CONTACT || 50.00;
    
    if (parseFloat(wallet.balance) < cost) {
      req.flash('error', `Insufficient wallet balance. You need Ksh ${cost} platform commission charge to reveal this client's phone & WhatsApp. Current balance: Ksh ${parseFloat(wallet.balance).toFixed(2)}`);
      return res.redirect('/wallet');
    }
    
    const balanceBefore = parseFloat(wallet.balance);
    const balanceAfter = balanceBefore - cost;
    
    wallet.balance = balanceAfter;
    wallet.total_spent = parseFloat(wallet.total_spent) + cost;
    await wallet.save();
    
    const order = await OrderRequest.findByPk(orderId, {
      include: [{ model: Product, as: 'product' }]
    });
    
    await ContactUnlock.create({
      user_id: userId,
      unlock_type: 'order_client',
      target_id: orderId,
      amount_paid: cost
    });
    
    await Transaction.create({
      user_id: userId,
      type: 'unlock_order_contact',
      amount: cost,
      balance_before: balanceBefore,
      balance_after: balanceAfter,
      description: `Platform Commission: Unlocked client contact for order/hire #${orderId} (${order && order.product ? order.product.title : 'Materials'})`,
      reference_type: 'order',
      reference_id: orderId,
      payment_method: 'wallet',
      status: 'completed'
    });
    
    req.flash('success', `Client contact unlocked! Ksh ${cost} platform commission deducted. You can now call and chat with the client on WhatsApp.`);
    res.redirect(referer);
  } catch (err) {
    console.error('Unlock order contact error:', err);
    req.flash('error', 'Failed to unlock client contact.');
    res.redirect(req.headers.referer || '/dashboard?tab=orders');
  }
};

// Check if contact is unlocked (API endpoint)
exports.checkContactUnlock = async (req, res) => {
  try {
    const userId = req.session.user ? req.session.user.id : null;
    if (!userId) {
      return res.json({ unlocked: false, reason: 'not_logged_in' });
    }
    
    const { type, targetId } = req.query;
    
    const unlock = await ContactUnlock.findOne({
      where: {
        user_id: userId,
        unlock_type: type,
        target_id: targetId
      }
    });
    
    res.json({ unlocked: !!unlock });
  } catch (err) {
    res.json({ unlocked: false, error: err.message });
  }
};

// AJAX API Endpoint to unlock any contact
exports.apiUnlockContact = async (req, res) => {
  try {
    if (!req.session.user) {
      return res.status(401).json({ success: false, message: 'Please log in to unlock contacts' });
    }
    const userId = req.session.user.id;
    const { unlockType, targetId } = req.body;
    
    if (!unlockType || !targetId) {
      return res.status(400).json({ success: false, message: 'Missing unlock parameters' });
    }
    
    const existing = await ContactUnlock.findOne({
      where: {
        user_id: userId,
        unlock_type: unlockType,
        target_id: targetId
      }
    });
    
    if (existing) {
      return res.json({ success: true, alreadyUnlocked: true, message: 'Contact already unlocked' });
    }
    
    let cost = PRICING.UNLOCK_JOB_CLIENT_CONTACT;
    if (unlockType === 'material_supplier') cost = PRICING.UNLOCK_MATERIAL_SUPPLIER_CONTACT;
    else if (unlockType === 'artisan_fundi') cost = PRICING.UNLOCK_ARTISAN_CONTACT;
    else if (unlockType === 'order_client') cost = PRICING.UNLOCK_ORDER_CLIENT_CONTACT || 50.00;
    
    let wallet = await Wallet.findOne({ where: { user_id: userId } });
    if (!wallet) {
      wallet = await Wallet.create({ user_id: userId, balance: 0 });
    }
    
    if (parseFloat(wallet.balance) < cost) {
      return res.status(402).json({
        success: false,
        insufficientFunds: true,
        cost,
        balance: parseFloat(wallet.balance),
        message: `Insufficient balance. Ksh ${cost} needed. Current balance: Ksh ${parseFloat(wallet.balance).toFixed(2)}`
      });
    }
    
    const balanceBefore = parseFloat(wallet.balance);
    const balanceAfter = balanceBefore - cost;
    wallet.balance = balanceAfter;
    wallet.total_spent = parseFloat(wallet.total_spent) + cost;
    await wallet.save();
    
    await ContactUnlock.create({
      user_id: userId,
      unlock_type: unlockType,
      target_id: targetId,
      amount_paid: cost
    });
    
    await Transaction.create({
      user_id: userId,
      type: `unlock_${unlockType}`,
      amount: cost,
      balance_before: balanceBefore,
      balance_after: balanceAfter,
      description: `Unlocked contact (${unlockType} #${targetId})`,
      reference_type: unlockType.split('_')[0],
      reference_id: targetId,
      payment_method: 'wallet',
      status: 'completed'
    });
    
    res.json({
      success: true,
      newBalance: balanceAfter,
      message: 'Contact unlocked successfully!'
    });
  } catch (err) {
    console.error('API unlock error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};
