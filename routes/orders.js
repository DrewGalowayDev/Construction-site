const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');

router.get('/orders/request/:productId', orderController.getOrderRequest);
router.post('/orders/submit', orderController.submitOrderRequest);
router.post('/orders/quick-inquiry', orderController.submitQuickInquiry);

// Payment Gateway (Paystack & M-Pesa STK Push) & Printable Invoicing
router.get('/orders/:id/checkout', orderController.getOrderCheckout);
router.post('/orders/:id/mpesa-stk', orderController.processMpesaStk);
router.post('/orders/:id/paystack/initialize', orderController.initializePaystackPayment);
router.get('/orders/paystack/callback', orderController.paystackCallback);
router.post('/api/paystack/webhook', orderController.paystackWebhook);
router.get('/orders/:id/invoice', orderController.getOrderInvoice);

module.exports = router;
