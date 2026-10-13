const express = require('express');
const router = express.Router();
const walletController = require('../controllers/walletController');
const { requireAuth } = require('../middleware/auth');

// Wallet & Credits (Protected)
router.get('/wallet', requireAuth, walletController.getWallet);
router.post('/wallet/topup', requireAuth, walletController.topUpCredits);
router.post('/wallet/paystack/initialize', requireAuth, walletController.initializePaystackWalletTopup);
router.get('/wallet/paystack/callback', walletController.paystackWalletCallback);

// Contact Unlocking (Protected)
router.post('/unlock/job/:jobId', requireAuth, walletController.unlockJobContact);
router.post('/unlock/material/:productId', requireAuth, walletController.unlockMaterialContact);
router.post('/unlock/artisan/:artisanId', requireAuth, walletController.unlockArtisanContact);
router.post('/unlock/order/:orderId', requireAuth, walletController.unlockOrderContact);

// API endpoints
router.get('/api/unlock/check', walletController.checkContactUnlock);
router.post('/api/unlock', requireAuth, walletController.apiUnlockContact);

module.exports = router;
