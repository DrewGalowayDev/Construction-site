const express = require('express');
const router = express.Router();
const providerController = require('../controllers/providerController');
const { avatarUpload, handleUploadError } = require('../middleware/upload');

// Middleware to check if user is logged in
const requireAuth = (req, res, next) => {
  if (!req.session.user) {
    return res.redirect('/auth/login');
  }
  next();
};

// GET: Profile form (create/edit)
router.get('/profile/form', requireAuth, providerController.getProfileForm);

// POST: Create profile
router.post('/profile/create', requireAuth, avatarUpload.single('avatar'), handleUploadError, providerController.createProfile);

// PUT: Update profile
router.post('/profile/update', requireAuth, avatarUpload.single('avatar'), handleUploadError, providerController.updateProfile);

// DELETE: Delete profile
router.post('/profile/delete', requireAuth, providerController.deleteProfile);

// GET: Toggle availability
router.post('/profile/toggle-availability', requireAuth, providerController.toggleAvailability);

// GET: View profile (public)
router.get('/profile/:id', providerController.getProfile);

module.exports = router;
