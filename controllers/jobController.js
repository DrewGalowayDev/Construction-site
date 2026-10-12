const { JobPost, JobApplication, User } = require('../models');
const { Op } = require('sequelize');

exports.getJobs = async (req, res) => {
  try {
    const { q, trade, county, min_budget, max_budget } = req.query;

    const whereClause = {
      status: 'open'
    };

    if (q && q.trim()) {
      whereClause[Op.or] = [
        { title: { [Op.like]: `%${q.trim()}%` } },
        { description: { [Op.like]: `%${q.trim()}%` } }
      ];
    }

    if (trade && trade.trim()) {
      whereClause.trade_required = trade.trim();
    }

    if (county && county.trim()) {
      whereClause.location_county = county.trim();
    }

    if (min_budget && !isNaN(min_budget)) {
      whereClause.budget_estimate = { ...(whereClause.budget_estimate || {}), [Op.gte]: parseFloat(min_budget) };
    }

    if (max_budget && !isNaN(max_budget)) {
      whereClause.budget_estimate = { ...(whereClause.budget_estimate || {}), [Op.lte]: parseFloat(max_budget) };
    }

    const jobs = await JobPost.findAll({
      where: whereClause,
      include: [{ model: User, as: 'client', attributes: ['name', 'phone', 'county'] }],
      order: [['created_at', 'DESC']]
    });

    const tradeList = [
      'Mason / Bricklayer',
      'Certified Electrician',
      'Plumber',
      'Painter & Finisher',
      'Carpenter / Roofer',
      'Welder & Fabricator',
      'Tiler',
      'General Contractor'
    ];

    const { KENYA_COUNTIES } = require('../config/constants');
    const countyList = KENYA_COUNTIES;

    res.render('pages/jobs', {
      title: 'Construction Projects & Job Board',
      jobs,
      trades: tradeList,
      counties: countyList,
      query: req.query
    });
  } catch (err) {
    console.error('Jobs error:', err);
    res.status(500).send('Error loading jobs');
  }
};

exports.getPostJob = (req, res) => {
  res.render('pages/post-job', {
    title: 'Post a Construction Project'
  });
};

exports.postJob = async (req, res) => {
  try {
    const {
      title,
      description,
      trade_required,
      location_county,
      location_town,
      budget_estimate,
      duration,
      contact_phone
    } = req.body;

    let clientId = req.session.user ? req.session.user.id : null;

    // If guest posting, create a guest client user or attach to demo client
    if (!clientId) {
      let client = await User.findOne({ where: { phone: contact_phone || '0700000000' } });
      if (!client) {
        client = await User.create({
          name: 'Site Client (' + location_town + ')',
          email: `client_${Date.now()}@toplinehub.co.ke`,
          phone: contact_phone || '0700000000',
          password: 'GuestPassword123!',
          role: 'buyer',
          county: location_county,
          town: location_town
        });
      }
      clientId = client.id;
    }

    await JobPost.create({
      client_id: clientId,
      title,
      description,
      trade_required,
      location_county,
      location_town,
      budget_estimate,
      duration: duration || '2 weeks',
      status: 'open'
    });

    req.flash('success', 'Your project has been posted successfully! Qualified artisans will submit proposals.');
    res.redirect('/jobs');
  } catch (err) {
    console.error('Post job error:', err);
    req.flash('error', 'Failed to publish project. Please check the form fields.');
    res.redirect('/jobs/post');
  }
};

exports.applyJob = async (req, res) => {
  try {
    const { jobId } = req.params;
    const { bid_amount, pitch_message } = req.body;

    let artisanId = req.session.user ? req.session.user.id : 4; // default demo artisan if not logged in

    await JobApplication.create({
      job_id: jobId,
      artisan_id: artisanId,
      bid_amount,
      pitch_message,
      status: 'pending'
    });

    req.flash('success', 'Your bid proposal has been submitted to the client!');
    res.redirect('/jobs');
  } catch (err) {
    console.error('Apply job error:', err);
    req.flash('error', 'Error submitting proposal.');
    res.redirect('/jobs');
  }
};
