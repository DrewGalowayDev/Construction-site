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

// Unlock Job Client Contact
exports.unlockJobContact = async (req, res) => {
  try {
    const userId = req.session.user.id;
    const { jobId } = req.params;
    
    // Check if already unlocked
    const existingUnlock = await ContactUnlock.findOne({
      where: {
        user_id: userId,
        unlock_type: 'job_client',
        target_id: jobId
      }
    });
    
    if (existingUnlock) {
      req.flash('info', 'You have already unlocked this contact.');
      return res.redirect(`/jobs/${jobId}`);
    }
    
    // Get wallet
    let wallet = await Wallet.findOne({ where: { user_id: userId } });
    if (!wallet) {
      wallet = await Wallet.create({ user_id: userId, balance: 0 });
    }
    
    const cost = PRICING.UNLOCK_JOB_CLIENT_CONTACT;
    
    if (parseFloat(wallet.balance) < cost) {
      req.flash('error', `Insufficient balance. You need Ksh ${cost} to unlock this contact. Current balance: Ksh ${parseFloat(wallet.balance).toFixed(2)}`);
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
      include: [{ model: User, as: 'client', attributes: ['name'] }]
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
    
    req.flash('success', `Contact unlocked successfully! Ksh ${cost} deducted from your wallet.`);
    res.redirect(`/jobs`);
  } catch (err) {
    console.error('Unlock job contact error:', err);
    req.flash('error', 'Failed to unlock contact.');
    res.redirect('/jobs');
  }
};

// Unlock Material Supplier Contact
exports.unlockMaterialContact = async (req, res) => {
  try {
    const userId = req.session.user.id;
    const { productId } = req.params;
    
    const existingUnlock = await ContactUnlock.findOne({
      where: {
        user_id: userId,
        unlock_type: 'material_supplier',
        target_id: productId
      }
    });
    
    if (existingUnlock) {
      req.flash('info', 'You have already unlocked this contact.');
      return res.redirect(`/materials/${productId}`);
    }
    
    let wallet = await Wallet.findOne({ where: { user_id: userId } });
    if (!wallet) {
      wallet = await Wallet.create({ user_id: userId, balance: 0 });
    }
    
    const cost = PRICING.UNLOCK_MATERIAL_SUPPLIER_CONTACT;
    
    if (parseFloat(wallet.balance) < cost) {
      req.flash('error', `Insufficient balance. You need Ksh ${cost} to unlock this contact. Current balance: Ksh ${parseFloat(wallet.balance).toFixed(2)}`);
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
      description: `Unlocked supplier contact for: ${product ? product.title : 'Product #' + productId}`,
      reference_type: 'product',
      reference_id: productId,
      payment_method: 'wallet',
      status: 'completed'
    });
    
    req.flash('success', `Supplier contact unlocked! Ksh ${cost} deducted from your wallet.`);
    res.redirect(`/materials/${productId}`);
  } catch (err) {
    console.error('Unlock material contact error:', err);
    req.flash('error', 'Failed to unlock contact.');
    res.redirect('/materials');
  }
};

// Unlock Artisan Contact
exports.unlockArtisanContact = async (req, res) => {
  try {
    const userId = req.session.user.id;
    const { artisanId } = req.params;
    
    const existingUnlock = await ContactUnlock.findOne({
      where: {
        user_id: userId,
        unlock_type: 'artisan_fundi',
        target_id: artisanId
      }
    });
    
    if (existingUnlock) {
      req.flash('info', 'You have already unlocked this contact.');
      return res.redirect(`/fundis/${artisanId}`);
    }
    
    let wallet = await Wallet.findOne({ where: { user_id: userId } });
    if (!wallet) {
      wallet = await Wallet.create({ user_id: userId, balance: 0 });
    }
    
    const cost = PRICING.UNLOCK_ARTISAN_CONTACT;
    
    if (parseFloat(wallet.balance) < cost) {
      req.flash('error', `Insufficient balance. You need Ksh ${cost} to unlock this contact. Current balance: Ksh ${parseFloat(wallet.balance).toFixed(2)}`);
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
    
    req.flash('success', `Artisan contact unlocked! Ksh ${cost} deducted from your wallet.`);
    res.redirect(`/fundis/${artisanId}`);
  } catch (err) {
    console.error('Unlock artisan contact error:', err);
    req.flash('error', 'Failed to unlock contact.');
    res.redirect('/fundis');
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
