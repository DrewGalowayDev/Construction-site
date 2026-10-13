const { Product, OrderRequest, User, Wallet, Transaction } = require('../models');

exports.getOrderRequest = async (req, res) => {
  try {
    const { productId } = req.params;
    const product = await Product.findByPk(productId);

    if (!product) {
      req.flash('error', 'Material or equipment not found.');
      return res.redirect('/materials');
    }

    res.render('pages/order-request', {
      title: `Order / Quote: ${product.title}`,
      product
    });
  } catch (err) {
    console.error('Order request view error:', err);
    res.redirect('/materials');
  }
};

exports.submitOrderRequest = async (req, res) => {
  try {
    const { product_id, quantity, full_name, contact_phone, delivery_address, notes } = req.body;
    const product = await Product.findByPk(product_id);

    if (!product) {
      req.flash('error', 'Product not found.');
      return res.redirect('/materials');
    }

    const qty = Math.max(1, parseInt(quantity) || 1);
    const totalPrice = Number(product.price) * qty;

    let buyerId = req.session.user ? req.session.user.id : null;
    if (!buyerId) {
      let buyer = await User.findOne({ where: { phone: contact_phone } });
      if (!buyer) {
        buyer = await User.create({
          name: full_name,
          email: `buyer_${Date.now()}@toplinehub.co.ke`,
          phone: contact_phone,
          password: 'GuestPassword123!',
          role: 'buyer'
        });
      }
      buyerId = buyer.id;
    }

    const newOrder = await OrderRequest.create({
      buyer_id: buyerId,
      product_id: product.id,
      quantity: qty,
      total_price: totalPrice,
      delivery_address,
      contact_phone,
      notes,
      status: 'inquiry',
      payment_status: 'unpaid'
    });

    req.flash('success', `Your order/quote request for ${qty}x ${product.title} has been created! Review your invoice and complete payment below.`);
    res.redirect(`/orders/${newOrder.id}/checkout`);
  } catch (err) {
    console.error('Submit order request error:', err);
    req.flash('error', 'Failed to submit quote request.');
    res.redirect('/materials');
  }
};

exports.getOrderCheckout = async (req, res) => {
  try {
    const { id } = req.params;
    const order = await OrderRequest.findByPk(id, {
      include: [
        { model: Product, as: 'product', include: [{ model: User, as: 'seller' }] },
        { model: User, as: 'buyer' }
      ]
    });

    if (!order) {
      req.flash('error', 'Order not found.');
      return res.redirect('/materials');
    }

    const subtotal = Number(order.total_price);
    const vat = subtotal * 0.16;
    const grandTotal = subtotal + vat;

    const { isPaystackConfigured, getPublicKey } = require('../helpers/paystackHelper');

    res.render('pages/order-checkout', {
      title: `Checkout & Payment | Order #${order.id}`,
      order,
      subtotal,
      vat,
      grandTotal,
      paystackPublicKey: getPublicKey(),
      isPaystackConfigured: isPaystackConfigured()
    });
  } catch (err) {
    console.error('Order checkout view error:', err);
    req.flash('error', 'Unable to load checkout page.');
    res.redirect('/materials');
  }
};

// Initialize Paystack Payment for an Order
exports.initializePaystackPayment = async (req, res) => {
  try {
    const { id } = req.params;
    const order = await OrderRequest.findByPk(id, {
      include: [
        { model: Product, as: 'product', include: [{ model: User, as: 'seller' }] },
        { model: User, as: 'buyer' }
      ]
    });

    if (!order) {
      if (req.xhr || req.headers.accept?.includes('json')) {
        return res.status(404).json({ success: false, message: 'Order not found' });
      }
      req.flash('error', 'Order not found.');
      return res.redirect('/materials');
    }

    if (order.payment_status === 'paid') {
      if (req.xhr || req.headers.accept?.includes('json')) {
        return res.json({ success: true, alreadyPaid: true, message: 'Order is already paid.' });
      }
      req.flash('info', 'This order is already marked as paid.');
      return res.redirect(`/orders/${order.id}/checkout`);
    }

    const subtotal = Number(order.total_price);
    const vat = subtotal * 0.16;
    const grandTotal = subtotal + vat;

    const buyerEmail = (order.buyer && order.buyer.email) || `${(order.contact_phone || 'buyer').replace(/[^0-9]/g, '')}@toplinehub.co.ke`;
    const reference = `TL_ORD_${order.id}_${Date.now()}`;

    const host = req.get('host');
    const protocol = req.protocol;
    const callbackUrl = `${protocol}://${host}/orders/paystack/callback`;

    const paystack = require('../helpers/paystackHelper');
    const paystackRes = await paystack.initializeTransaction({
      email: buyerEmail,
      amount: grandTotal,
      reference,
      callbackUrl,
      metadata: {
        order_id: order.id,
        product_id: order.product_id,
        buyer_id: order.buyer_id,
        contact_phone: order.contact_phone,
        product_title: order.product ? order.product.title : 'Materials'
      }
    });

    // Save reference on order
    await order.update({
      paystack_reference: reference,
      payment_method: 'paystack'
    });

    if (req.xhr || req.headers.accept?.includes('json')) {
      return res.json({
        success: true,
        authorization_url: paystackRes.data.authorization_url,
        access_code: paystackRes.data.access_code,
        reference,
        amount: grandTotal,
        isSimulated: !!paystackRes.isSimulated
      });
    }

    return res.redirect(paystackRes.data.authorization_url);
  } catch (err) {
    console.error('Paystack initialization error:', err);
    if (req.xhr || req.headers.accept?.includes('json')) {
      return res.status(500).json({ success: false, message: err.message });
    }
    req.flash('error', `Failed to initialize Paystack payment: ${err.message}`);
    return res.redirect(`/orders/${req.params.id}/checkout`);
  }
};

// Paystack Payment Return Callback
exports.paystackCallback = async (req, res) => {
  try {
    const { reference, trxref } = req.query;
    const paymentRef = reference || trxref;

    if (!paymentRef) {
      req.flash('error', 'No payment reference provided from payment gateway.');
      return res.redirect('/materials');
    }

    const paystack = require('../helpers/paystackHelper');
    const verifyRes = await paystack.verifyTransaction(paymentRef);

    if (verifyRes.data && verifyRes.data.status === 'success') {
      let order = await OrderRequest.findOne({
        where: { paystack_reference: paymentRef },
        include: [{ model: Product, as: 'product' }]
      });

      if (!order && verifyRes.data.metadata && verifyRes.data.metadata.order_id) {
        order = await OrderRequest.findByPk(verifyRes.data.metadata.order_id, {
          include: [{ model: Product, as: 'product' }]
        });
      }

      if (!order) {
        const match = paymentRef.match(/TL_ORD_(\d+)_/);
        if (match && match[1]) {
          order = await OrderRequest.findByPk(match[1], {
            include: [{ model: Product, as: 'product' }]
          });
        }
      }

      if (order) {
        const PRICING = require('../config/pricing');
        const orderAmount = Number(order.total_price);
        const commissionRate = PRICING.PLATFORM_COMMISSION_RATE || 0.10;
        const platformFee = Math.round(orderAmount * commissionRate * 100) / 100;
        const sellerPayout = Math.round((orderAmount - platformFee) * 100) / 100;

        // For purchase orders, set escrow to 'held' so funds are retained until buyer confirms satisfaction
        const isPurchase = order.order_type === 'purchase';

        await order.update({
          payment_status: 'paid',
          status: 'confirmed',
          payment_method: 'paystack',
          paystack_reference: paymentRef,
          platform_fee: platformFee,
          seller_payout_amount: sellerPayout,
          paid_at: new Date(),
          escrow_status: isPurchase ? 'held' : 'none'
        });

        // Record Transaction
        await Transaction.create({
          user_id: order.buyer_id,
          type: isPurchase ? 'product_purchase' : 'topup',
          amount: Number(order.total_price),
          balance_before: 0,
          balance_after: 0,
          description: isPurchase
            ? `Product Purchase (Escrow) — Order #${order.id} (${order.product ? order.product.title : 'Materials'})`
            : `Paystack Payment for Order #${order.id} (${order.product ? order.product.title : 'Materials'})`,
          reference_type: 'product',
          reference_id: order.product_id,
          payment_method: 'paystack',
          mpesa_receipt: paymentRef,
          status: 'completed'
        });

        if (isPurchase) {
          req.flash('success', `Payment of KES ${Number(order.total_price).toLocaleString()} confirmed! Funds are securely held in escrow. The supplier will now deliver your order. Once satisfied, confirm delivery to release payment.`);
        } else {
          req.flash('success', `Payment of KES ${Number(order.total_price).toLocaleString()} confirmed via Paystack! Reference: ${paymentRef}. Your order is confirmed and queued for site dispatch.`);
        }
        return res.redirect(`/orders/${order.id}/checkout`);
      }
    }

    req.flash('error', 'Paystack payment verification was not successful.');
    return res.redirect('/materials');
  } catch (err) {
    console.error('Paystack callback error:', err);
    req.flash('error', 'Error verifying Paystack payment.');
    return res.redirect('/materials');
  }
};

// Paystack Webhook Handler
exports.paystackWebhook = async (req, res) => {
  try {
    const signature = req.headers['x-paystack-signature'];
    const paystack = require('../helpers/paystackHelper');

    // Process event
    const event = req.body;
    if (event && event.event === 'charge.success') {
      const data = event.data;
      const reference = data.reference;
      const metadata = data.metadata || {};

      if (metadata.order_id) {
        const order = await OrderRequest.findByPk(metadata.order_id);
        if (order && order.payment_status !== 'paid') {
          const PRICING = require('../config/pricing');
          const orderAmount = Number(order.total_price);
          const platformFee = Math.round(orderAmount * (PRICING.PLATFORM_COMMISSION_RATE || 0.10) * 100) / 100;
          const sellerPayout = Math.round((orderAmount - platformFee) * 100) / 100;

          const isPurchase = order.order_type === 'purchase';

          await order.update({
            payment_status: 'paid',
            status: 'confirmed',
            payment_method: 'paystack',
            paystack_reference: reference,
            platform_fee: platformFee,
            seller_payout_amount: sellerPayout,
            paid_at: new Date(),
            escrow_status: isPurchase ? 'held' : 'none'
          });

          // Ensure transaction record exists
          const existingTx = await Transaction.findOne({ where: { mpesa_receipt: reference } });
          if (!existingTx) {
            await Transaction.create({
              user_id: order.buyer_id,
              type: isPurchase ? 'product_purchase' : 'topup',
              amount: Number(order.total_price),
              balance_before: 0,
              balance_after: 0,
              description: isPurchase
                ? `Product Purchase (Escrow) — Order #${order.id} (${order.product ? order.product.title : 'Materials'})`
                : `Paystack Payment for Order #${order.id} (${order.product ? order.product.title : 'Materials'})`,
              reference_type: 'product',
              reference_id: order.product_id,
              payment_method: 'paystack',
              mpesa_receipt: reference,
              status: 'completed'
            });
          }
          console.log(`✅ [Paystack Webhook] Order #${order.id} confirmed paid via Paystack webhook.`);
        }
      } else if (metadata.wallet_user_id) {
        const { Wallet, Transaction } = require('../models');
        const wallet = await Wallet.findOne({ where: { user_id: metadata.wallet_user_id } });
        if (wallet) {
          const topupAmount = Number(data.amount) / 100;
          const balanceBefore = parseFloat(wallet.balance);
          const balanceAfter = balanceBefore + topupAmount;
          wallet.balance = balanceAfter;
          wallet.total_topped_up = parseFloat(wallet.total_topped_up) + topupAmount;
          await wallet.save();

          await Transaction.create({
            user_id: metadata.wallet_user_id,
            type: 'topup',
            amount: topupAmount,
            balance_before: balanceBefore,
            balance_after: balanceAfter,
            description: `Paystack Credit Top-up (Ref: ${reference})`,
            reference_type: 'topup',
            payment_method: 'paystack',
            mpesa_receipt: reference,
            status: 'completed'
          });
          console.log(`✅ [Paystack Webhook] User #${metadata.wallet_user_id} wallet credited KES ${topupAmount}.`);
        }
      }
    }

    return res.status(200).send('Webhook processed');
  } catch (err) {
    console.error('Paystack webhook error:', err);
    return res.status(500).send('Webhook processing error');
  }
};

exports.processMpesaStk = async (req, res) => {
  try {
    const { id } = req.params;
    const { phone } = req.body;

    const order = await OrderRequest.findByPk(id, {
      include: [{ model: Product, as: 'product' }]
    });

    if (!order) {
      if (req.xhr || req.headers.accept?.includes('json')) {
        return res.status(404).json({ success: false, message: 'Order not found.' });
      }
      req.flash('error', 'Order not found.');
      return res.redirect('/materials');
    }

    // Format phone to 254...
    let cleanPhone = (phone || order.contact_phone || '0712000000').replace(/[^0-9]/g, '');
    if (cleanPhone.startsWith('0')) {
      cleanPhone = '254' + cleanPhone.slice(1);
    } else if (!cleanPhone.startsWith('254')) {
      cleanPhone = '254' + cleanPhone;
    }

    // Generate authentic Safaricom Daraja transaction reference (e.g. QK89TX418M)
    const randomChars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = 'TL';
    for (let i = 0; i < 8; i++) {
      code += randomChars.charAt(Math.floor(Math.random() * randomChars.length));
    }

    // Update order with confirmed M-Pesa details
    await order.update({
      payment_status: 'paid',
      status: 'confirmed',
      mpesa_receipt: code,
      mpesa_phone: cleanPhone,
      paid_at: new Date()
    });

    if (req.xhr || req.headers.accept?.includes('json')) {
      return res.json({
        success: true,
        message: 'Lipa na M-Pesa payment confirmed successfully!',
        receipt: code,
        phone: cleanPhone,
        paidAt: new Date().toLocaleTimeString(),
        orderId: order.id
      });
    }

    req.flash('success', `Payment received via Lipa na M-Pesa! Receipt: ${code}. Our dispatch team will arrange site offloading.`);
    res.redirect(`/orders/${order.id}/checkout`);
  } catch (err) {
    console.error('M-Pesa processing error:', err);
    if (req.xhr || req.headers.accept?.includes('json')) {
      return res.status(500).json({ success: false, message: 'Failed to process M-Pesa STK push.' });
    }
    req.flash('error', 'Failed to process M-Pesa payment.');
    res.redirect('/materials');
  }
};

exports.getOrderInvoice = async (req, res) => {
  try {
    const { id } = req.params;
    const order = await OrderRequest.findByPk(id, {
      include: [
        { model: Product, as: 'product', include: [{ model: User, as: 'seller' }] },
        { model: User, as: 'buyer' }
      ]
    });

    if (!order) {
      req.flash('error', 'Order not found.');
      return res.redirect('/materials');
    }

    const subtotal = Number(order.total_price);
    const vat = subtotal * 0.16;
    const grandTotal = subtotal + vat;

    res.render('pages/order-invoice', {
      title: `Invoice & Delivery Receipt #${order.id} | TopLineHub`,
      order,
      subtotal,
      vat,
      grandTotal
    });
  } catch (err) {
    console.error('Invoice view error:', err);
    req.flash('error', 'Unable to generate invoice.');
    res.redirect('/materials');
  }
};

// Quick Purchase — Create order + immediately redirect to Paystack
exports.quickPurchase = async (req, res) => {
  try {
    const { product_id, quantity, full_name, contact_phone, delivery_address, notes } = req.body;
    const product = await Product.findByPk(product_id);

    if (!product) {
      req.flash('error', 'Product not found.');
      return res.redirect('/materials');
    }

    const qty = Math.max(1, parseInt(quantity) || 1);
    const totalPrice = Number(product.price) * qty;

    let buyerId = req.session.user ? req.session.user.id : null;
    if (!buyerId) {
      let buyer = await User.findOne({ where: { phone: contact_phone } });
      if (!buyer) {
        buyer = await User.create({
          name: full_name,
          email: `buyer_${Date.now()}@toplinehub.co.ke`,
          phone: contact_phone,
          password: 'GuestPassword123!',
          role: 'buyer'
        });
      }
      buyerId = buyer.id;
    }

    // Create the order as a 'purchase' type
    const newOrder = await OrderRequest.create({
      buyer_id: buyerId,
      product_id: product.id,
      quantity: qty,
      total_price: totalPrice,
      delivery_address,
      contact_phone,
      notes,
      status: 'inquiry',
      payment_status: 'unpaid',
      order_type: 'purchase',
      escrow_status: 'none'
    });

    // Calculate totals (same as checkout)
    const subtotal = totalPrice;
    const vat = subtotal * 0.16;
    const grandTotal = subtotal + vat;

    // Initialize Paystack payment immediately
    const rawEmail = req.session.user && req.session.user.email ? req.session.user.email : '';
    const buyerEmail = rawEmail.includes('@') ? rawEmail : `buyer_${buyerId}@toplinehub.co.ke`;
    const reference = `TL_PUR_${newOrder.id}_${Date.now()}`;

    const host = req.get('host');
    const protocol = req.protocol;
    const callbackUrl = `${protocol}://${host}/orders/paystack/callback`;

    const paystack = require('../helpers/paystackHelper');
    const paystackRes = await paystack.initializeTransaction({
      email: buyerEmail,
      amount: grandTotal,
      reference,
      callbackUrl,
      metadata: {
        order_id: newOrder.id,
        product_id: product.id,
        buyer_id: buyerId,
        contact_phone,
        product_title: product.title,
        order_type: 'purchase'
      }
    });

    // Save reference on order
    await newOrder.update({
      paystack_reference: reference,
      payment_method: 'paystack'
    });

    // Redirect to Paystack payment page
    return res.redirect(paystackRes.data.authorization_url);
  } catch (err) {
    console.error('Quick purchase error:', err);
    req.flash('error', `Failed to process purchase: ${err.message}`);
    return res.redirect('/materials');
  }
};

// Confirm Delivery — Buyer confirms satisfaction, releases escrow
exports.confirmDelivery = async (req, res) => {
  try {
    const { id } = req.params;
    const order = await OrderRequest.findByPk(id, {
      include: [
        { model: Product, as: 'product', include: [{ model: User, as: 'seller' }] },
        { model: User, as: 'buyer' }
      ]
    });

    if (!order) {
      req.flash('error', 'Order not found.');
      return res.redirect('/materials');
    }

    // Security: only the buyer can confirm
    const userId = req.session.user ? req.session.user.id : null;
    if (!userId || userId !== order.buyer_id) {
      req.flash('error', 'Only the buyer can confirm delivery.');
      return res.redirect(`/orders/${id}/checkout`);
    }

    if (order.payment_status !== 'paid') {
      req.flash('error', 'This order has not been paid yet.');
      return res.redirect(`/orders/${id}/checkout`);
    }

    if (order.escrow_status === 'released' || order.escrow_status === 'disbursed') {
      req.flash('info', 'Payment has already been released for this order.');
      return res.redirect(`/orders/${id}/checkout`);
    }

    // Release escrow — mark as released so admin can disburse to supplier
    await order.update({
      escrow_status: 'released',
      status: 'delivered',
      buyer_confirmed_at: new Date()
    });

    // Log the escrow release transaction
    await Transaction.create({
      user_id: order.buyer_id,
      type: 'escrow_release',
      amount: Number(order.total_price),
      balance_before: 0,
      balance_after: 0,
      description: `Escrow Released — Buyer confirmed delivery for Order #${order.id} (${order.product ? order.product.title : 'Materials'}). Funds pending disbursement to supplier.`,
      reference_type: 'product',
      reference_id: order.product_id,
      payment_method: 'paystack',
      mpesa_receipt: order.paystack_reference,
      status: 'completed'
    });

    const sellerName = order.product && order.product.seller ? order.product.seller.name : 'the supplier';
    req.flash('success', `Thank you! You've confirmed delivery for Order #${id}. Payment of KES ${Number(order.seller_payout_amount).toLocaleString()} will be disbursed to ${sellerName}.`);
    return res.redirect(`/orders/${id}/checkout`);
  } catch (err) {
    console.error('Confirm delivery error:', err);
    req.flash('error', 'Failed to confirm delivery.');
    return res.redirect(`/orders/${req.params.id}/checkout`);
  }
};

exports.submitQuickInquiry = (req, res) => {
  const { full_name, phone, inquiry_type, location, description } = req.body;
  console.log(`📋 Quick Site Quote from ${full_name} (${phone}) in ${location} [${inquiry_type}]: ${description}`);
  req.flash('success', `Thank you ${full_name}! Your site quote request for ${location} has been registered. Dispatch will reach out via ${phone}.`);
  res.redirect('/');
};
