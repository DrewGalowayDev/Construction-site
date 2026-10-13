const { Product, Category, User } = require('../models');
const { Op } = require('sequelize');
const { hasUnlockedContact, maskPhoneNumber } = require('../helpers/contactHelpers');
const PRICING = require('../config/pricing');

exports.getMaterials = async (req, res) => {
  try {
    const { q, category, county } = req.query;
    const userId = req.session.user ? req.session.user.id : null;
    const categories = await Category.findAll();

    const whereClause = {
      is_rental: false,
      is_active: true
    };

    if (q && q.trim()) {
      whereClause[Op.or] = [
        { title: { [Op.like]: `%${q.trim()}%` } },
        { description: { [Op.like]: `%${q.trim()}%` } }
      ];
    }

    if (category) {
      whereClause.category_id = category;
    }

    if (county) {
      whereClause.location_county = county;
    }

    const products = await Product.findAll({
      where: whereClause,
      include: [
        { model: Category, as: 'category' },
        { model: User, as: 'seller', attributes: ['name', 'phone'] }
      ],
      order: [['created_at', 'DESC']]
    });
    
    // Check unlock status
    const productsWithUnlock = await Promise.all(
      products.map(async (product) => {
        const unlocked = userId ? await hasUnlockedContact(userId, 'material_supplier', product.id) : false;
        return {
          ...product.get({ plain: true }),
          contactUnlocked: unlocked,
          maskedPhone: product.seller ? maskPhoneNumber(product.seller.phone) : '***-***-***',
          unlockPrice: PRICING.UNLOCK_MATERIAL_SUPPLIER_CONTACT
        };
      })
    );

    res.render('pages/materials', {
      title: 'Building Materials Catalog',
      categories,
      products: productsWithUnlock,
      query: req.query
    });
  } catch (err) {
    console.error('Catalog error:', err);
    res.status(500).send('Error loading materials');
  }
};

exports.getRentals = async (req, res) => {
  try {
    const { q, county, category, max_rate } = req.query;

    const whereClause = {
      is_rental: true,
      is_active: true
    };

    if (q && q.trim()) {
      whereClause[Op.or] = [
        { title: { [Op.like]: `%${q.trim()}%` } },
        { description: { [Op.like]: `%${q.trim()}%` } }
      ];
    }

    if (county && county.trim()) {
      whereClause.location_county = county.trim();
    }

    if (category) {
      whereClause.category_id = category;
    }

    if (max_rate && !isNaN(max_rate)) {
      whereClause.price = { [Op.lte]: parseFloat(max_rate) };
    }

    const categories = await Category.findAll();

    const rentals = await Product.findAll({
      where: whereClause,
      include: [
        { model: User, as: 'seller', attributes: ['name', 'phone'] },
        { model: Category, as: 'category' }
      ],
      order: [['created_at', 'DESC']]
    });

    res.render('pages/rentals', {
      title: 'Plant & Equipment Hire',
      rentals,
      categories,
      query: req.query
    });
  } catch (err) {
    console.error('Rentals error:', err);
    res.status(500).send('Error loading rentals');
  }
};

exports.getPostMaterial = async (req, res) => {
  try {
    const categories = await Category.findAll({
      order: [['name', 'ASC']]
    });

    res.render('pages/post-material', {
      title: 'Post Materials & Equipment Listing',
      categories,
      preselectedType: req.query.type || 'material'
    });
  } catch (err) {
    console.error('Get post material error:', err);
    res.status(500).send('Error loading post listing page');
  }
};

exports.postMaterial = async (req, res) => {
  try {
    const {
      title,
      category_id,
      listing_type,
      price,
      unit,
      stock_quantity,
      location_county,
      location_town,
      image_url,
      description,
      contact_name,
      contact_phone
    } = req.body;

    if (!title || !price || !description) {
      req.flash('error', 'Please provide a title, price, and description for your listing.');
      return res.redirect('/materials/post');
    }

    let sellerId = req.session.user ? req.session.user.id : null;

    // If guest posting, find or create a seller account
    if (!sellerId) {
      const phone = contact_phone && contact_phone.trim() ? contact_phone.trim() : '0700000000';
      let seller = await User.findOne({ where: { phone } });
      if (!seller) {
        const vendorName = contact_name && contact_name.trim() 
          ? contact_name.trim() 
          : `Supplier (${location_town || location_county || 'Kenya'})`;
        seller = await User.create({
          name: vendorName,
          email: `supplier_${Date.now()}@toplinehub.co.ke`,
          phone,
          password: 'GuestSupplier123!',
          role: 'seller',
          county: location_county || 'Nairobi',
          town: location_town || 'Nairobi',
          is_verified: true
        });
      }
      sellerId = seller.id;
    }

    const isRental = listing_type === 'rental';

    // Generate unique slug
    const baseSlug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');
    const slug = `${baseSlug || 'item'}-${Date.now().toString().slice(-6)}`;

    // Handle uploaded images (multi-file via req.files)
    const defaultImage = isRental ? '/img/service-2.jpg' : '/img/service-1.jpg';
    let finalImageUrl = defaultImage;
    let galleryImages = [];

    if (req.files && req.files.length > 0) {
      // First uploaded image becomes the cover
      finalImageUrl = `/uploads/products/${req.files[0].filename}`;
      // All images go into the gallery array
      galleryImages = req.files.map(f => `/uploads/products/${f.filename}`);
    } else if (image_url && image_url.trim() && image_url.trim() !== '/img/service-1.jpg') {
      finalImageUrl = image_url.trim();
    }

    await Product.create({
      seller_id: sellerId,
      category_id: category_id ? parseInt(category_id, 10) : null,
      title: title.trim(),
      slug,
      description: description.trim(),
      price: parseFloat(price) || 0,
      unit: unit ? unit.trim() : (isRental ? 'Per Day' : 'Piece'),
      is_rental: isRental,
      stock_quantity: parseInt(stock_quantity, 10) || (isRental ? 1 : 100),
      image_url: finalImageUrl,
      images: galleryImages,
      location_county: location_county || 'Nairobi',
      is_active: true
    });

    if (isRental) {
      req.flash('success', 'Your plant & equipment listing is now live in the Equipment Hire catalog!');
      res.redirect('/rentals');
    } else {
      req.flash('success', 'Your building material listing is now live in the Materials catalog!');
      res.redirect('/materials');
    }
  } catch (err) {
    console.error('Post material error:', err);
    req.flash('error', 'Failed to publish listing. Please check the fields and try again.');
    res.redirect('/materials/post');
  }
};

exports.getProductDetail = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.session.user ? req.session.user.id : null;
    
    const product = await Product.findByPk(id, {
      include: [
        { model: Category, as: 'category' },
        { model: User, as: 'seller', attributes: ['id', 'name', 'phone', 'email', 'county', 'town', 'avatar', 'is_verified'] }
      ]
    });

    if (!product) {
      req.flash('error', 'The requested material or equipment could not be found.');
      return res.redirect('/materials');
    }
    
    // Check if contact is unlocked
    const contactUnlocked = userId ? await hasUnlockedContact(userId, 'material_supplier', product.id) : false;

    const relatedProducts = await Product.findAll({
      where: {
        category_id: product.category_id,
        id: { [Op.ne]: product.id },
        is_active: true
      },
      limit: 3
    });

    res.render('pages/product-detail', {
      title: `${product.title} - TopLineHub Kenya`,
      product: {
        ...product.get({ plain: true }),
        contactUnlocked,
        maskedPhone: product.seller ? maskPhoneNumber(product.seller.phone) : '***-***-***',
        unlockPrice: PRICING.UNLOCK_MATERIAL_SUPPLIER_CONTACT
      },
      relatedProducts
    });
  } catch (err) {
    console.error('Product detail error:', err);
    res.status(500).send('Error loading product details');
  }
};


