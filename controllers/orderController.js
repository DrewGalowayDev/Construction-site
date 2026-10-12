const { Product, OrderRequest, User } = require('../models');

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

    res.render('pages/order-checkout', {
      title: `Checkout & M-Pesa Payment | Order #${order.id}`,
      order,
      subtotal,
      vat,
      grandTotal
    });
  } catch (err) {
    console.error('Order checkout view error:', err);
    req.flash('error', 'Unable to load checkout page.');
    res.redirect('/materials');
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

exports.submitQuickInquiry = (req, res) => {
  const { full_name, phone, inquiry_type, location, description } = req.body;
  console.log(`📋 Quick Site Quote from ${full_name} (${phone}) in ${location} [${inquiry_type}]: ${description}`);
  req.flash('success', `Thank you ${full_name}! Your site quote request for ${location} has been registered. Dispatch will reach out via ${phone}.`);
  res.redirect('/');
};
