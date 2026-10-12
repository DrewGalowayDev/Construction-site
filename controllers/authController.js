const { User, ArtisanProfile } = require('../models');

exports.getLogin = (req, res) => {
  res.render('pages/login', { title: 'Sign In' });
};

exports.postLogin = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ where: { email } });

    if (!user || !(await user.validPassword(password))) {
      req.flash('error', 'Invalid email or password.');
      return res.redirect('/auth/login');
    }

    req.session.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      county: user.county,
      town: user.town
    };

    req.flash('success', `Welcome back, ${user.name}!`);
    const returnTo = req.session.returnTo || '/dashboard';
    delete req.session.returnTo;
    res.redirect(returnTo);
  } catch (err) {
    console.error('Login error:', err);
    req.flash('error', 'Login error occurred.');
    res.redirect('/auth/login');
  }
};

exports.getRegister = (req, res) => {
  res.render('pages/register', { title: 'Register Account' });
};

exports.postRegister = async (req, res) => {
  try {
    const { name, email, phone, password, role, county, town } = req.body;

    const existing = await User.findOne({ where: { email } });
    if (existing) {
      req.flash('error', 'An account with that email already exists.');
      return res.redirect('/auth/register');
    }

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

    if (role === 'artisan') {
      await ArtisanProfile.create({
        user_id: user.id,
        trade: 'General Construction Artisan',
        experience_years: 2,
        daily_rate: 2000.00,
        bio: `${name} is a certified trade specialist operating in ${county}.`,
        is_available: true
      });
    }

    req.session.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      county: user.county,
      town: user.town
    };

    req.flash('success', `Account created successfully! Welcome to TopLineHub, ${user.name}.`);
    res.redirect('/');
  } catch (err) {
    console.error('Register error:', err);
    req.flash('error', 'Registration failed. Please check your details.');
    res.redirect('/auth/register');
  }
};

exports.logout = (req, res) => {
  req.session.destroy(() => {
    res.redirect('/');
  });
};
