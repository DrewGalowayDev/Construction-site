const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const { requireAuth, requireRole } = require('../middleware/auth');
const { avatarUpload, handleUploadError } = require('../middleware/upload');

// Dashboard Overview
router.get('/dashboard', requireAuth, dashboardController.getDashboard);

// Phase 2: Client Project Bid Review & Workflow
router.post('/jobs/:jobId/bids/:bidId/status', requireAuth, dashboardController.updateBidStatus);
router.post('/jobs/:jobId/status', requireAuth, dashboardController.updateJobStatus);
router.post('/jobs/:jobId/edit', requireAuth, dashboardController.editJob);
router.post('/jobs/:jobId/delete', requireAuth, dashboardController.deleteJob);

// Supplier / Order workflow
router.post('/orders/:orderId/status', requireAuth, dashboardController.updateOrderStatus);
router.post('/orders/:orderId/cancel', requireAuth, dashboardController.cancelOrder);
router.post('/products/:productId/toggle-status', requireAuth, dashboardController.toggleProductStatus);
router.post('/products/:productId/edit', requireAuth, dashboardController.editProduct);
router.post('/products/:productId/delete', requireAuth, dashboardController.deleteProduct);

// Artisan Bid Workflow
router.post('/bids/:bidId/edit', requireAuth, dashboardController.editBid);
router.post('/bids/:bidId/delete', requireAuth, dashboardController.deleteBid);

// Profile update (with avatar upload)
router.post('/dashboard/profile', requireAuth, avatarUpload.single('avatar_file'), handleUploadError, dashboardController.updateProfile);

// Admin Moderation & Verification Actions
router.post('/admin/users/:userId/toggle-verify', requireRole('admin'), dashboardController.adminToggleVerifyUser);
router.post('/admin/users/:userId/role', requireRole('admin'), dashboardController.adminUpdateUserRole);
router.post('/admin/products/:productId/delete', requireRole('admin'), dashboardController.adminDeleteProduct);
router.post('/admin/jobs/:jobId/delete', requireRole('admin'), dashboardController.adminDeleteJob);

module.exports = router;
