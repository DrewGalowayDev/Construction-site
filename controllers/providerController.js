const path = require('path');
const { ArtisanProfile, User } = require(path.join(__dirname, '..', 'models'));
const { Op } = require('sequelize');
const fs = require('fs');

// GET: Create/Edit Provider Profile Form
exports.getProfileForm = async (req, res) => {
  try {
    if (!req.session.user) {
      return res.redirect('/auth/login');
    }

    const userId = req.session.user.id;
    
    // Check if profile exists
    const profile = await ArtisanProfile.findOne({
      where: { user_id: userId },
      include: [{ model: User, as: 'user' }]
    });

    res.render('dashboard/provider-profile-form', {
      title: profile ? 'Edit Provider Profile' : 'Create Provider Profile',
      profile: profile,
      user: req.session.user
    });
  } catch (err) {
    console.error('Profile form error:', err);
    res.status(500).send('Error loading profile form');
  }
};

// POST: Create Provider Profile
exports.createProfile = async (req, res) => {
  try {
    if (!req.session.user) {
      return res.status(401).json({ error: 'Please login first' });
    }

    const userId = req.session.user.id;
    const {
      trade,
      experience_years,
      daily_rate,
      bio,
      skills,
      is_available
    } = req.body;

    // Check if profile already exists
    const existing = await ArtisanProfile.findOne({ where: { user_id: userId } });
    if (existing) {
      return res.status(400).json({ error: 'Profile already exists. Use update instead.' });
    }

    // Handle avatar upload
    let avatar_url = null;
    if (req.file) {
      avatar_url = `/uploads/avatars/${req.file.filename}`;
    }

    const profile = await ArtisanProfile.create({
      user_id: userId,
      trade: trade || 'General Construction',
      experience_years: parseInt(experience_years) || 1,
      daily_rate: parseFloat(daily_rate) || 1000,
      bio: bio || '',
      skills: skills || '',
      is_available: is_available === 'true' || is_available === '1',
      rating: 5.0,
      total_reviews: 0,
      avatar_url: avatar_url
    });

    res.json({
      success: true,
      message: 'Provider profile created successfully!',
      profile: profile
    });
  } catch (err) {
    console.error('Create profile error:', err);
    res.status(500).json({ error: 'Failed to create profile' });
  }
};

// PUT: Update Provider Profile
exports.updateProfile = async (req, res) => {
  try {
    if (!req.session.user) {
      return res.status(401).json({ error: 'Please login first' });
    }

    const userId = req.session.user.id;
    const {
      trade,
      experience_years,
      daily_rate,
      bio,
      skills,
      is_available
    } = req.body;

    const profile = await ArtisanProfile.findOne({ where: { user_id: userId } });
    
    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    // Handle avatar upload
    let avatar_url = profile.avatar_url;
    if (req.file) {
      // Delete old avatar if exists
      if (profile.avatar_url) {
        const oldPath = path.join(__dirname, '..', 'public', profile.avatar_url);
        if (fs.existsSync(oldPath)) {
          fs.unlinkSync(oldPath);
        }
      }
      avatar_url = `/uploads/avatars/${req.file.filename}`;
    }

    // Update profile
    await profile.update({
      trade: trade || profile.trade,
      experience_years: experience_years ? parseInt(experience_years) : profile.experience_years,
      daily_rate: daily_rate ? parseFloat(daily_rate) : profile.daily_rate,
      bio: bio !== undefined ? bio : profile.bio,
      skills: skills !== undefined ? skills : profile.skills,
      is_available: is_available !== undefined ? (is_available === 'true' || is_available === '1') : profile.is_available,
      avatar_url: avatar_url
    });

    res.json({
      success: true,
      message: 'Profile updated successfully!',
      profile: profile
    });
  } catch (err) {
    console.error('Update profile error:', err);
    res.status(500).json({ error: 'Failed to update profile' });
  }
};

// DELETE: Delete Provider Profile
exports.deleteProfile = async (req, res) => {
  try {
    if (!req.session.user) {
      return res.status(401).json({ error: 'Please login first' });
    }

    const userId = req.session.user.id;
    const profile = await ArtisanProfile.findOne({ where: { user_id: userId } });
    
    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    // Delete avatar file if exists
    if (profile.avatar_url) {
      const avatarPath = path.join(__dirname, '..', 'public', profile.avatar_url);
      if (fs.existsSync(avatarPath)) {
        fs.unlinkSync(avatarPath);
      }
    }

    await profile.destroy();

    res.json({
      success: true,
      message: 'Profile deleted successfully!'
    });
  } catch (err) {
    console.error('Delete profile error:', err);
    res.status(500).json({ error: 'Failed to delete profile' });
  }
};

// GET: View Provider Profile (Public)
exports.getProfile = async (req, res) => {
  try {
    const { id } = req.params;
    
    const profile = await ArtisanProfile.findByPk(id, {
      include: [{ model: User, as: 'user' }]
    });

    if (!profile) {
      return res.status(404).send('Profile not found');
    }

    res.render('provider-profile-view', {
      title: `${profile.user ? profile.user.name : 'Provider'} - ${profile.trade}`,
      profile: profile
    });
  } catch (err) {
    console.error('Get profile error:', err);
    res.status(500).send('Error loading profile');
  }
};

// GET: Toggle Availability
exports.toggleAvailability = async (req, res) => {
  try {
    if (!req.session.user) {
      return res.status(401).json({ error: 'Please login first' });
    }

    const userId = req.session.user.id;
    const profile = await ArtisanProfile.findOne({ where: { user_id: userId } });
    
    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    await profile.update({
      is_available: !profile.is_available
    });

    res.json({
      success: true,
      message: `Profile ${profile.is_available ? 'activated' : 'deactivated'}!`,
      is_available: profile.is_available
    });
  } catch (err) {
    console.error('Toggle availability error:', err);
    res.status(500).json({ error: 'Failed to toggle availability' });
  }
};

module.exports = exports;
