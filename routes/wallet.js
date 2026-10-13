const express = require('express');
const router = express.Router();
const walletController = require('../controllers/walletController');
const { requireAuth } = require('../middleware/auth');

// All wallet routes require authentication
router.use(requireAuth);

// Wallet & Credits
router.get('/wallet', walletController.getWallet);
router.post('/wallet/topup', walletController.topUpCredits);
router.post('/wallet/paystack/initialize', walletController.initializePaystackWalletTopup);
router.get('/wallet/paystack/callback', walletController.paystackWalletCallback);

// Contact Unlocking
router.post('/unlock/job/:jobId', walletController.unlockJobContact);
router.post('/unlock/material/:productId', walletController.unlockMaterialContact);
router.post('/unlock/artisan/:artisanId', walletController.unlockArtisanContact);
router.post('/unlock/order/:orderId', walletController.unlockOrderContact);

// API endpoint to check unlock status & perform ajax unlock
router.get('/api/unlock/check', walletController.checkContactUnlock);
router.post('/api/unlock', walletController.apiUnlockContact);

module.exports = router;
