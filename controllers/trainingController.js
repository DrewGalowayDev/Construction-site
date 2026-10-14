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

    if (!name || !phone) {
      return res.status(400).json({
        success: false,
        message: 'Name and phone number are required'
      });
    }

    // Allow guest payments - use session user if available, otherwise check if account exists by phone/email
    let userId = req.session.user ? req.session.user.id : null;
    let userEmail = (req.session.user && req.session.user.email) || (email ? email.trim().toLowerCase() : null);

    // If user is not logged in, try to see if an account already exists with this phone or email
    if (!userId) {
      try {
        const cleanPhone = phone.replace(/\D/g, '').slice(-9);
        const orConditions = [];
        if (userEmail) {
          orConditions.push({ email: userEmail });
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
          const matchedUser = await User.findOne({ where: { [Op.or]: orConditions } });
          if (matchedUser) {
            userId = matchedUser.id;
            if (!userEmail) userEmail = matchedUser.email;
          }
        }
      } catch (matchErr) {
        console.warn('User matching notice:', matchErr.message);
      }
    }

    if (!userEmail) {
      userEmail = `guest_${phone.replace(/\D/g, '')}@toplinehub.co.ke`;
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
    } else {
      // For guests, check by phone number in description
      const cleanPhone = phone.replace(/\D/g, '').slice(-9);
      if (cleanPhone.length >= 7) {
        existingPayment = await Transaction.findOne({
          where: {
            type: 'training_fee',
            status: 'completed',
            description: {
              [Op.like]: `%${cleanPhone}%`
            }
          }
        });
      }
    }

    if (existingPayment) {
      return res.status(400).json({
        success: false,
        message: 'You have already paid for this training'
      });
    }

    // Generate unique reference (never use 0)
    const reference = `TL_TRAIN_${userId || 'GUEST'}_${Date.now()}`;

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
        name: name,
        phone: phone,
        location: location || 'Not provided'
      },
      channels: ['card', 'mobile_money', 'bank']
    });

    // Create pending transaction record (user_id is null for guests, NEVER 0)
    await Transaction.create({
      user_id: userId || null,
      type: 'training_fee',
      amount: TRAINING_FEE,
      balance_before: 0,
      balance_after: 0,
      status: 'pending',
      payment_method: 'paystack',
      mpesa_receipt: reference,
      description: `Training Fee Payment - ${name} (${phone})`
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

      // If user_id wasn't in metadata, try matching by phone or email
      if (!userId && (metadata.email || metadata.phone)) {
        try {
          const cleanPhone = (metadata.phone || '').replace(/\D/g, '').slice(-9);
          const orConditions = [];
          if (metadata.email && !metadata.email.startsWith('guest_')) {
            orConditions.push({ email: metadata.email.trim().toLowerCase() });
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
            const matchedUser = await User.findOne({ where: { [Op.or]: orConditions } });
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

      const customerName = metadata.name || 'User';
      const customerPhone = metadata.phone ? ` (${metadata.phone})` : '';

      if (transaction) {
        await transaction.update({
          user_id: userId || transaction.user_id || null,
          status: 'completed',
          amount: amount,
          balance_before: 0,
          balance_after: 0,
          description: `Training Fee Payment - ${customerName}${customerPhone} (Verified)`
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
          description: `Training Fee Payment - ${customerName}${customerPhone}`
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
