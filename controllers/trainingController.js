const path = require('path');
const { User, Transaction } = require(path.join(__dirname, '..', 'models'));
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

    // Require login for training payments
    if (!req.session.user) {
      return res.status(401).json({
        success: false,
        message: 'Please login or register first to pay for training'
      });
    }

    let userId = req.session.user.id;
    let userEmail = req.session.user.email || email || `user_${userId}@toplinehub.co.ke`;

    // Check if already paid - use 'type' not 'transaction_type'
    const existingPayment = await Transaction.findOne({
      where: {
        user_id: userId,
        type: 'training_fee',
        status: 'completed'
      }
    });

    if (existingPayment) {
      return res.status(400).json({
        success: false,
        message: 'You have already paid for this training'
      });
    }

    // Generate unique reference
    const reference = `TL_TRAIN_${userId}_${Date.now()}`;

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
        user_id: userId,
        payment_type: 'training_fee',
        name: name,
        phone: phone,
        location: location || 'Not provided'
      },
      channels: ['card', 'mobile_money', 'bank']
    });

    // Create pending transaction record
    await Transaction.create({
      user_id: userId,
      type: 'training_fee',
      amount: TRAINING_FEE,
      balance_before: 0,
      balance_after: 0,
      status: 'pending',
      payment_method: 'paystack',
      mpesa_receipt: reference,  // Store reference in mpesa_receipt
      description: `Training Fee Payment - ${name}`
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
      const userId = metadata.user_id || null;
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
          transaction: existingTx
        });
      }

      // Create or update transaction (user_id is required - no guest payments)
      let transaction;
      
      if (!userId) {
        throw new Error('User ID is required for training payments');
      }

      // Update existing pending transaction
      transaction = await Transaction.findOne({
        where: { user_id: userId, mpesa_receipt: paymentRef }
      });

      if (transaction) {
        await transaction.update({
          status: 'completed',
          amount: amount,
          balance_before: 0,
          balance_after: 0,
          description: `Training Fee Payment - ${metadata.name || 'User'} (Verified)`
        });
      } else {
        // Create new transaction
        transaction = await Transaction.create({
          user_id: userId,
          type: 'training_fee',
          amount: amount,
          balance_before: 0,
          balance_after: 0,
          status: 'completed',
          payment_method: 'paystack',
          mpesa_receipt: paymentRef,
          description: `Training Fee Payment - ${metadata.name || 'User'}`
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
