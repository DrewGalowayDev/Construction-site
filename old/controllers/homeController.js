const { Category, Product, ArtisanProfile, User } = require('../models');

exports.getIndex = async (req, res) => {
  try {
    const categories = await Category.findAll();
    
    const featuredProducts = await Product.findAll({
      where: { is_rental: false, is_active: true },
      include: [{ model: Category, as: 'category' }],
      limit: 6
    });

    const rentalItems = await Product.findAll({
      where: { is_rental: true, is_active: true },
      limit: 4
    });

    const featuredArtisans = await ArtisanProfile.findAll({
      include: [{ model: User, as: 'user' }],
      limit: 3
    });

    res.render('pages/home', {
      title: 'TopLineHub | Construction Materials, Machinery & Verified Fundis',
      categories,
      featuredProducts,
      rentalItems,
      featuredArtisans
    });
  } catch (err) {
    console.error('Home page error:', err);
    res.status(500).send('Internal Server Error');
  }
};

exports.getAbout = (req, res) => {
  res.render('pages/about', { title: 'About TopLineHub' });
};

exports.getContact = (req, res) => {
  res.render('pages/contact', { title: 'Contact TopLineHub Support' });
};

exports.postContact = (req, res) => {
  const { name, email, phone, subject, message } = req.body;
  console.log(`📩 Contact Form Submission: from ${name} (${phone}, ${email}) - [${subject}]: ${message}`);
  req.flash('success', 'Thank you! Your inquiry has been received. Our site desk will call you shortly.');
  res.redirect('/contact');
};
