const express = require('express');
const router = express.Router();
const trainingController = require('../controllers/trainingController');

// GET: Training page
router.get('/', trainingController.getTrainingPage);

// POST: Initialize payment
router.post('/payment/initialize', trainingController.initializeTrainingPayment);

// GET: Paystack callback
router.get('/payment/callback', trainingController.paystackCallback);

// GET: Check payment status (API)
router.get('/payment/status', trainingController.checkPaymentStatus);

module.exports = router;
