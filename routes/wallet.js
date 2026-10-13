const express = require('express');
const router = express.Router();
const walletController = require('../controllers/walletController');
const { requireAuth } = require('../middleware/auth');

// All wallet routes require authentication
router.use(requireAuth);

// Wallet & Credits
router.get('/wallet', walletController.getWallet);
router.post('/wallet/topup', walletController.topUpCredits);

// Contact Unlocking
router.post('/unlock/job/:jobId', walletController.unlockJobContact);
router.post('/unlock/material/:productId', walletController.unlockMaterialContact);
router.post('/unlock/artisan/:artisanId', walletController.unlockArtisanContact);

// API endpoint to check unlock status
router.get('/api/unlock/check', walletController.checkContactUnlock);

module.exports = router;
