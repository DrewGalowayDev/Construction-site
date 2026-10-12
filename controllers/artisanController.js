const { ArtisanProfile, User } = require('../models');
const { Op } = require('sequelize');

exports.getArtisans = async (req, res) => {
  try {
    const { q, trade, county } = req.query;

    const whereClause = {
      is_available: true
    };

    if (trade && trade.trim()) {
      whereClause.trade = { [Op.like]: `%${trade.trim()}%` };
    }

    const userWhere = {};
    if (county && county.trim()) {
      userWhere.county = county.trim();
    }
    if (q && q.trim()) {
      userWhere[Op.or] = [
        { name: { [Op.like]: `%${q.trim()}%` } },
        { county: { [Op.like]: `%${q.trim()}%` } },
        { town: { [Op.like]: `%${q.trim()}%` } }
      ];
    }

    const artisans = await ArtisanProfile.findAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: 'user',
          where: Object.keys(userWhere).length ? userWhere : undefined
        }
      ],
      order: [['rating', 'DESC']]
    });

    res.render('pages/fundis', {
      title: 'Hire Verified Artisans & Fundis',
      artisans,
      query: req.query
    });
  } catch (err) {
    console.error('Artisans error:', err);
    res.status(500).send('Error loading artisans');
  }
};

exports.getArtisanDetail = async (req, res) => {
  try {
    const { id } = req.params;
    const artisan = await ArtisanProfile.findByPk(id, {
      include: [{ model: User, as: 'user' }]
    });

    if (!artisan) {
      req.flash('error', 'Artisan profile not found.');
      return res.redirect('/fundis');
    }

    const similarArtisans = await ArtisanProfile.findAll({
      where: {
        id: { [Op.ne]: artisan.id },
        is_available: true
      },
      include: [{ model: User, as: 'user' }],
      limit: 3
    });

    res.render('pages/fundi-detail', {
      title: `${artisan.user ? artisan.user.name : 'Artisan'} - ${artisan.trade} | TopLineHub Kenya`,
      artisan,
      similarArtisans
    });
  } catch (err) {
    console.error('Artisan detail error:', err);
    res.status(500).send('Error loading artisan details');
  }
};

exports.postArtisanInquiry = async (req, res) => {
  try {
    const { id } = req.params;
    const { client_name, client_phone, location, project_scope } = req.body;
    const artisan = await ArtisanProfile.findByPk(id, {
      include: [{ model: User, as: 'user' }]
    });

    if (!artisan) {
      req.flash('error', 'Artisan profile not found.');
      return res.redirect('/fundis');
    }

    const cleanPhone = (artisan.user && artisan.user.phone ? artisan.user.phone : '254711000000').replace(/[^0-9]/g, '');
    const waPhone = cleanPhone.startsWith('0') ? '254' + cleanPhone.slice(1) : cleanPhone;
    const msg = encodeURIComponent(`Hi ${artisan.user ? artisan.user.name : 'Fundi'}, my name is ${client_name || 'Site Client'} (${client_phone || ''}). I have a project in ${location || 'Kenya'}: "${project_scope || 'Construction work'}". I found your profile on TopLineHub and would like to hire you.`);

    res.redirect(`https://wa.me/${waPhone}?text=${msg}`);
  } catch (err) {
    console.error('Artisan inquiry error:', err);
    req.flash('error', 'Failed to connect with artisan.');
    res.redirect(`/fundis/${req.params.id}`);
  }
};

