const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { requireRole } = require('../middleware/auth');

// Protect all admin routes with requireRole('admin')
router.use(requireRole('admin'));

// Admin Dashboard Hub
router.get('/', adminController.getAdminDashboard);

// Escrow & Disbursements
router.post('/orders/:orderId/disburse-escrow', adminController.disburseEscrow);

// User Moderation & Roles
router.post('/users/:userId/toggle-verify', adminController.toggleVerifyUser);
router.post('/users/:userId/role', adminController.updateUserRole);

// Catalog & Job Moderation
router.post('/products/:productId/delete', adminController.deleteProduct);
router.post('/jobs/:jobId/delete', adminController.deleteJob);

module.exports = router;
