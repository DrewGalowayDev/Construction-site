const express = require('express');
const router = express.Router();
const path = require('path');

// Import models
const modelsPath = path.join(__dirname, '..', 'models');
const { User, ArtisanProfile, Wallet, sequelize } = require(modelsPath);
const { Op } = require('sequelize');

/**
 * GET Login Page
 */
router.get('/login', (req, res) => {
    console.log(`[AUTH] GET /login (redirect=${req.query.redirect || 'none'})`);
    res.render('auth/login', {
        title: 'Sign In',
        page: 'login',
        redirect: req.query.redirect || ''
    });
});

/**
 * POST Login
 */
router.post('/login', async (req, res) => {
    const t0 = Date.now();
    console.log('[AUTH] POST /login started');
    try {
        const { email, password, redirect } = req.body;
        const input = (email || '').trim();
        console.log(`[AUTH] POST /login input: "${input}" (redirect=${redirect || 'none'})`);
        
        // Support email, username, and phone number login
        const cleanPhone = input.replace(/\D/g, '').slice(-9);
        const orConditions = [
            { email: input },
            { name: input }
        ];
        if (cleanPhone.length >= 7) {
            orConditions.push({ phone: input });
            orConditions.push(
                sequelize.where(
                    sequelize.fn('REPLACE', sequelize.col('phone'), ' ', ''),
                    { [Op.like]: `%${cleanPhone}` }
                )
            );
        }

        const user = await User.findOne({ where: { [Op.or]: orConditions } });
        console.log(`[AUTH] POST /login user lookup done (${Date.now() - t0}ms, found=${!!user})`);

        if (!user || !(await user.validPassword(password))) {
            console.log(`[AUTH] POST /login invalid credentials (${Date.now() - t0}ms)`);
            return res.render('auth/login', {
                title: 'Sign In',
                page: 'login',
                redirect: redirect || '',
                error: 'Invalid username, phone number, email, or password'
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
            town: user.town,
            is_verified: user.is_verified
        };

        // If redirect URL specified, follow it
        if (redirect && redirect.startsWith('/')) {
            console.log(`[AUTH] POST /login SUCCESS -> redirect to ${redirect} (${Date.now() - t0}ms)`);
            return res.redirect(redirect);
        }

        // Otherwise redirect based on role
        console.log(`[AUTH] POST /login SUCCESS -> role redirect for ${user.role} (${Date.now() - t0}ms)`);
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
        console.error(`[AUTH] POST /login ERROR after ${Date.now() - t0}ms:`, err.message);
        res.render('auth/login', {
            title: 'Sign In',
            page: 'login',
            redirect: req.body.redirect || '',
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
