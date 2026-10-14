const express = require('express');
const router = express.Router();
const path = require('path');

// Import models
const modelsPath = path.join(__dirname, '..', 'models');
const { User, ArtisanProfile, Wallet } = require(modelsPath);

/**
 * GET Login Page
 */
router.get('/login', (req, res) => {
    res.render('auth/login', {
        title: 'Sign In',
        page: 'login'
    });
});

/**
 * POST Login
 */
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        // Support both email and username login
        // Try to find user by email first, then by name (username)
        let user = await User.findOne({ where: { email } });
        
        // If not found by email, try finding by name (username)
        if (!user) {
            user = await User.findOne({ where: { name: email } });
        }

        if (!user || !(await user.validPassword(password))) {
            return res.render('auth/login', {
                title: 'Sign In',
                page: 'login',
                error: 'Invalid username/email or password'
            });
        }

        // Set session
        req.session.user = {
            id: user.id,
            name: user.name,
            email: user.email,
            phone: user.phone,
            role: user.role,
            county: user.county,
            town: user.town
        };

        // Redirect based on role
        if (user.role === 'admin') {
            res.redirect('/dashboard/admin');
        } else if (user.role === 'artisan') {
            res.redirect('/dashboard/provider');
        } else if (user.role === 'seller') {
            res.redirect('/dashboard/supplier');
        } else {
            res.redirect('/dashboard/client');
        }
    } catch (err) {
        console.error('Login error:', err);
        res.render('auth/login', {
            title: 'Sign In',
            page: 'login',
            error: 'Login error occurred'
        });
    }
});

/**
 * GET Register Page
 */
router.get('/register', (req, res) => {
    const counties = ['Nairobi', 'Mombasa', 'Kisumu', 'Nakuru', 'Eldoret', 'Kiambu', 'Machakos', 'Kajiado'];
    res.render('auth/register', {
        title: 'Register',
        page: 'register',
        counties
    });
});

/**
 * POST Register
 */
router.post('/register', async (req, res) => {
    try {
        const { name, email, phone, password, role, county, town } = req.body;

        // Check if user exists
        const existing = await User.findOne({ where: { email } });
        if (existing) {
            const counties = ['Nairobi', 'Mombasa', 'Kisumu', 'Nakuru', 'Eldoret', 'Kiambu', 'Machakos', 'Kajiado'];
            return res.render('auth/register', {
                title: 'Register',
                page: 'register',
                counties,
                error: 'Email already registered'
            });
        }

        // Create user
        const user = await User.create({
            name,
            email,
            phone,
            password,
            role: role || 'buyer',
            county: county || 'Nairobi',
            town: town || 'Nairobi',
            is_verified: true
        });

        // Create artisan profile if role is artisan
        if (role === 'artisan') {
            await ArtisanProfile.create({
                user_id: user.id,
                trade: 'General Construction',
                experience_years: 2,
                daily_rate: 2000.00,
                is_available: true
            });
        }

        // Create wallet
        await Wallet.create({
            user_id: user.id,
            balance: 0
        });

        // Set session
        req.session.user = {
            id: user.id,
            name: user.name,
            email: user.email,
            phone: user.phone,
            role: user.role,
            county: user.county,
            town: user.town
        };

        res.redirect('/dashboard/client');
    } catch (err) {
        console.error('Register error:', err);
        const counties = ['Nairobi', 'Mombasa', 'Kisumu', 'Nakuru', 'Eldoret', 'Kiambu', 'Machakos', 'Kajiado'];
        res.render('auth/register', {
            title: 'Register',
            page: 'register',
            counties,
            error: 'Registration failed'
        });
    }
});

/**
 * GET Logout
 */
router.get('/logout', (req, res) => {
    req.session.destroy(() => {
        res.redirect('/');
    });
});

module.exports = router;
