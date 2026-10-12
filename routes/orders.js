const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');

router.get('/orders/request/:productId', orderController.getOrderRequest);
router.post('/orders/submit', orderController.submitOrderRequest);
router.post('/orders/quick-inquiry', orderController.submitQuickInquiry);

// M-Pesa STK Push Checkout & Printable Invoicing
router.get('/orders/:id/checkout', orderController.getOrderCheckout);
router.post('/orders/:id/mpesa-stk', orderController.processMpesaStk);
router.get('/orders/:id/invoice', orderController.getOrderInvoice);

module.exports = router;
