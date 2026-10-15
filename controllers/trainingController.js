const path = require('path');
const { Op } = require('sequelize');
const { User, Transaction, sequelize } = require(path.join(__dirname, '..', 'models'));
const paystackHelper = require('../helpers/paystackHelper');

// Training Fee Constant
const TRAINING_FEE = 1500.00; // KES 1,500

/**
 * GET: Training page
 */
exports.getTrainingPage = async (req, res) => {
  try {
    let hasPaid = false;
    let userPayment = null;

    if (req.session.user) {
      // Check if user already paid - use 'type' not 'transaction_type'
      userPayment = await Transaction.findOne({
        where: {
          user_id: req.session.user.id,
          type: 'training_fee',
          status: 'completed'
        }
      });
      hasPaid = !!userPayment;
    }

    res.render('training', {
      title: 'Construction Materials Dropshipping Training',
      page: 'training',
      trainingFee: TRAINING_FEE,
      hasPaid: hasPaid,
      userPayment: userPayment,
      user: req.session.user || null,
      paystackPublicKey: paystackHelper.getPublicKey()
    });
  } catch (err) {
    console.error('Training page error:', err);
    res.status(500).send('Error loading training page');
  }
};

/**
 * POST: Initialize Training Payment via Paystack
 */
exports.initializeTrainingPayment = async (req, res) => {
  try {
    const { name, phone, location, email } = req.body;

    if (!name || !name.trim() || !phone || !phone.trim() || !email || !email.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Full name, phone number, and email address are all required.'
      });
    }

    const trimmedName = name.trim();
    const trimmedPhone = phone.trim();
    const userEmail = email.trim().toLowerCase();

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(userEmail)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address.'
      });
    }

    let userId = req.session.user ? req.session.user.id : null;

    // If user is not logged in, check if user exists or create account to fully capture the client
    if (!userId) {
      try {
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
        let matchedUser = await User.findOne({ where: { [Op.or]: orConditions } });

        if (!matchedUser) {
          // Auto-create user account so client is captured permanently
          matchedUser = await User.create({
            name: trimmedName,
            email: userEmail,
            phone: trimmedPhone,
            password: 'Password123!',
            role: 'buyer',
            county: location || 'Nairobi',
            town: location || 'Nairobi',
            is_verified: true
          });
          // Also initialize wallet
          await Wallet.create({ user_id: matchedUser.id, balance: 0 }).catch(() => {});
        } else {
          // Update phone or name if missing
          if (!matchedUser.phone && trimmedPhone) {
            await matchedUser.update({ phone: trimmedPhone }).catch(() => {});
          }
        }

        if (matchedUser) {
          userId = matchedUser.id;
        }
      } catch (userErr) {
        console.warn('User matching/creation notice:', userErr.message);
      }
    }

    // Check if already paid
    let existingPayment = null;
    if (userId) {
      existingPayment = await Transaction.findOne({
        where: {
          user_id: userId,
          type: 'training_fee',
          status: 'completed'
        }
      });
    }

    if (!existingPayment) {
      const cleanPhone = trimmedPhone.replace(/\D/g, '').slice(-9);
      const orCheck = [{ description: { [Op.like]: `%${userEmail}%` } }];
      if (cleanPhone.length >= 7) {
        orCheck.push({ description: { [Op.like]: `%${cleanPhone}%` } });
      }
      existingPayment = await Transaction.findOne({
        where: {
          type: 'training_fee',
          status: 'completed',
          [Op.or]: orCheck
        }
      });
    }

    if (existingPayment) {
      return res.status(400).json({
        success: false,
        message: 'You have already paid for this training.'
      });
    }

    // Generate unique reference
    const reference = `TL_TRAIN_${userId || 'CLIENT'}_${Date.now()}`;

    // Get callback URL
    const host = req.get('host');
    const protocol = req.protocol;
    const callbackUrl = `${protocol}://${host}/training/payment/callback`;

    // Initialize Paystack transaction
    const paystackRes = await paystackHelper.initializeTransaction({
      email: userEmail,
      amount: TRAINING_FEE,
      reference: reference,
      callbackUrl: callbackUrl,
      metadata: {
        user_id: userId || null,
        payment_type: 'training_fee',
        name: trimmedName,
        phone: trimmedPhone,
        email: userEmail,
        location: location || 'Not provided'
      },
      channels: ['card', 'mobile_money', 'bank']
    });

    // Create pending transaction record with full client details captured in description
    await Transaction.create({
      user_id: userId || null,
      type: 'training_fee',
      amount: TRAINING_FEE,
      balance_before: 0,
      balance_after: 0,
      status: 'pending',
      payment_method: 'paystack',
      mpesa_receipt: reference,
      description: `Training Fee Payment - ${trimmedName} | Phone: ${trimmedPhone} | Email: ${userEmail}`
    });

    res.json({
      success: true,
      authorization_url: paystackRes.data.authorization_url,
      access_code: paystackRes.data.access_code,
      reference: reference,
      isSimulated: !!paystackRes.isSimulated
    });

  } catch (err) {
    console.error('Training payment init error:', err);
    res.status(500).json({
      success: false,
      message: err.message || 'Failed to initialize payment'
    });
  }
};

/**
 * GET: Paystack Callback Handler
 */
exports.paystackCallback = async (req, res) => {
  try {
    const { reference, trxref } = req.query;
    const paymentRef = reference || trxref;

    if (!paymentRef) {
      return res.render('training-payment-result', {
        title: 'Payment Failed',
        page: 'training',
        success: false,
        message: 'No transaction reference found'
      });
    }

    // Verify transaction with Paystack
    const verifyRes = await paystackHelper.verifyTransaction(paymentRef);

    if (verifyRes.data && verifyRes.data.status === 'success') {
      const metadata = verifyRes.data.metadata || {};
      let userId = metadata.user_id && metadata.user_id !== '0' && metadata.user_id !== 0 ? metadata.user_id : null;
      const amount = verifyRes.data.amount ? Number(verifyRes.data.amount) / 100 : TRAINING_FEE;

      // Check if already processed (use mpesa_receipt not payment_reference)
      const existingTx = await Transaction.findOne({
        where: { mpesa_receipt: paymentRef, status: 'completed' }
      });

      if (existingTx) {
        return res.render('training-payment-result', {
          title: 'Payment Already Processed',
          page: 'training',
          success: true,
          message: 'This payment has already been processed',
          transaction: existingTx,
          metadata: metadata
        });
      }

      // Ensure client is linked to a user account
      const customerName = metadata.name || 'Client';
      const customerPhone = metadata.phone || '';
      const customerEmail = (metadata.email || '').trim().toLowerCase();

      if (!userId && (customerEmail || customerPhone)) {
        try {
          const cleanPhone = customerPhone.replace(/\D/g, '').slice(-9);
          const orConditions = [];
          if (customerEmail && !customerEmail.startsWith('guest_')) {
            orConditions.push({ email: customerEmail });
          }
          if (cleanPhone.length >= 7) {
            orConditions.push(
              sequelize.where(
                sequelize.fn('REPLACE', sequelize.col('phone'), ' ', ''),
                { [Op.like]: `%${cleanPhone}` }
              )
            );
          }
          if (orConditions.length > 0) {
            let matchedUser = await User.findOne({ where: { [Op.or]: orConditions } });
            if (!matchedUser && customerEmail) {
              matchedUser = await User.create({
                name: customerName,
                email: customerEmail,
                phone: customerPhone || 'N/A',
                password: 'Password123!',
                role: 'buyer',
                county: metadata.location || 'Nairobi',
                town: metadata.location || 'Nairobi',
                is_verified: true
              }).catch(() => null);
            }
            if (matchedUser) userId = matchedUser.id;
          }
        } catch (matchErr) {
          console.warn('Callback user match error:', matchErr.message);
        }
      }

      // Update existing pending transaction by reference
      let transaction = await Transaction.findOne({
        where: { mpesa_receipt: paymentRef }
      });

      const fullDescription = `Training Fee Payment - ${customerName} | Phone: ${customerPhone} | Email: ${customerEmail}`;

      if (transaction) {
        await transaction.update({
          user_id: userId || transaction.user_id || null,
          status: 'completed',
          amount: amount,
          balance_before: 0,
          balance_after: 0,
          description: fullDescription + ' (Verified)'
        });
      } else {
        // Create new transaction
        transaction = await Transaction.create({
          user_id: userId || null,
          type: 'training_fee',
          amount: amount,
          balance_before: 0,
          balance_after: 0,
          status: 'completed',
          payment_method: 'paystack',
          mpesa_receipt: paymentRef,
          description: fullDescription
        });
      }

      console.log(`✅ Training payment successful: ${paymentRef} - KES ${amount} - ${metadata.name}`);

      return res.render('training-payment-result', {
        title: 'Payment Successful',
        page: 'training',
        success: true,
        message: 'Payment successful! Your training registration is confirmed.',
        transaction: transaction,
        metadata: metadata
      });
    }

    // Payment failed
    return res.render('training-payment-result', {
      title: 'Payment Failed',
      page: 'training',
      success: false,
      message: verifyRes.data?.gateway_response || 'Payment verification failed'
    });

  } catch (err) {
    console.error('Training payment callback error:', err);
    return res.render('training-payment-result', {
      title: 'Payment Error',
      page: 'training',
      success: false,
      message: 'An error occurred while verifying your payment. Please contact support.'
    });
  }
};

/**
 * GET: Check if user has paid
 */
exports.checkPaymentStatus = async (req, res) => {
  try {
    if (!req.session.user) {
      return res.json({ hasPaid: false });
    }

    const payment = await Transaction.findOne({
      where: {
        user_id: req.session.user.id,
        type: 'training_fee',
        status: 'completed'
      }
    });

    res.json({
      hasPaid: !!payment,
      payment: payment
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = exports;
