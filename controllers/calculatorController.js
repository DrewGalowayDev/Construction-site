const { Product, Category, OrderRequest, User } = require('../models');

// Kenyan Standard Construction Unit Benchmark Rates
const DEFAULT_RATES = {
  cementBag: 800.00,       // KES per 50kg bag (Bamburi / Savannah 32.5R)
  sandTonne: 2400.00,      // KES per tonne clean river sand
  sandLorry10T: 24000.00,  // KES per 10-tonne tipper lorry
  ballastTonne: 2500.00,   // KES per tonne machine-crushed ballast (3/4")
  stone9Inch: 50.00,       // KES per piece (9x9x18 machine-cut quarry stone)
  stone6Inch: 40.00,       // KES per piece (6x9x18 partition stone)
  block9Inch: 85.00,       // KES per piece (9" hollow concrete block)
  mabatiMeter: 890.00,     // KES per meter (30-gauge box profile)
  steelD12: 1540.00,       // KES per 12m length (D12 High Yield Rebar)
  dpcRoll: 1800.00         // KES per roll (Damp Proof Course)
};

exports.getCalculator = async (req, res) => {
  try {
    // Attempt to pull real prices from active catalog products if available
    const liveProducts = await Product.findAll({
      where: { is_active: true },
      limit: 30
    });

    const rates = { ...DEFAULT_RATES };

    liveProducts.forEach(p => {
      const titleLower = p.title.toLowerCase();
      if (titleLower.includes('cement') && p.price > 500 && p.price < 1500) {
        rates.cementBag = parseFloat(p.price);
      } else if (titleLower.includes('sand') && titleLower.includes('10-tonne')) {
        rates.sandLorry10T = parseFloat(p.price);
      } else if (titleLower.includes('mabati') && p.price > 400 && p.price < 2000) {
        rates.mabatiMeter = parseFloat(p.price);
      } else if (titleLower.includes('d12') && p.price > 1000 && p.price < 3000) {
        rates.steelD12 = parseFloat(p.price);
      }
    });

    res.render('pages/calculator', {
      title: 'Kenyan Construction Material & Cost Estimator',
      rates,
      preselectedCounty: req.query.county || 'Nairobi'
    });
  } catch (err) {
    console.error('Calculator error:', err);
    res.status(500).send('Error loading construction estimator');
  }
};

exports.postCalculatorQuote = async (req, res) => {
  try {
    const { client_name, client_phone, location_county, project_type, boq_summary, estimated_total } = req.body;

    if (!client_phone || !client_name) {
      req.flash('error', 'Please provide your name and phone number to receive a formal supplier quote.');
      return res.redirect('/calculator');
    }

    const cleanPhone = client_phone.replace(/[^0-9]/g, '');
    const waSellerPhone = '254711000000'; // Platform central procurement desk
    const waMsg = encodeURIComponent(
      `*New Construction BOQ Quote Request - TopLineHub Kenya*\n` +
      `Client: ${client_name} (${client_phone})\n` +
      `Site County: ${location_county || 'Nairobi'}\n` +
      `Project Category: ${project_type || 'General Build'}\n` +
      `Estimated Material Total: Ksh ${Number(estimated_total || 0).toLocaleString()}\n\n` +
      `*Item Breakdown:*\n${boq_summary || 'Custom Bill of Quantities'}\n\n` +
      `Please provide verified quarry and hardware supplier quotations.`
    );

    req.flash('success', `Estimator quote submitted successfully! Connecting with verified suppliers in ${location_county || 'your county'}.`);
    res.redirect(`https://wa.me/${waSellerPhone}?text=${waMsg}`);
  } catch (err) {
    console.error('Post calculator quote error:', err);
    req.flash('error', 'Failed to submit quote inquiry.');
    res.redirect('/calculator');
  }
};

exports.getCalculatorInvoice = async (req, res) => {
  try {
    const county = req.query.county || 'Nairobi';
    const cementBags = parseInt(req.query.cement) || 123;
    const sandTonnes = parseFloat(req.query.sand) || 13.6;
    const ballastTonnes = parseFloat(req.query.ballast) || 15.1;
    const stonePcs = parseInt(req.query.stones) || 780;
    const mabatiMeters = parseInt(req.query.mabati) || 155;
    const nailsPackets = parseInt(req.query.nails) || 8;
    const ridgeCaps = parseInt(req.query.ridges) || 12;

    const rates = { ...DEFAULT_RATES };

    // Line items with Kenyan building standards
    const lineItems = [
      {
        no: 1,
        description: 'Bamburi Tembo Portland Cement (50kg bags) - Standard 32.5R Mix',
        category: 'Masonry & Concrete Structural Works',
        qty: `${cementBags} Bags`,
        unitRate: rates.cementBag,
        total: cementBags * rates.cementBag
      },
      {
        no: 2,
        description: 'Clean River Sand (Aggregates) - Sieved Quarry River Sand',
        category: 'Sub-structure & Mortar Mixes',
        qty: `${sandTonnes.toFixed(1)} Tonnes`,
        unitRate: rates.sandTonne,
        total: sandTonnes * rates.sandTonne
      },
      {
        no: 3,
        description: 'Machine-Crushed Ballast (3/4" Blue Stone Hardcore)',
        category: 'Slab Foundation & Beams',
        qty: `${ballastTonnes.toFixed(1)} Tonnes`,
        unitRate: rates.ballastTonne,
        total: ballastTonnes * rates.ballastTonne
      },
      {
        no: 4,
        description: '9" x 9" x 18" Machine-Cut Quarry Building Stones (Ndunyu Sabuk/Juja Grade A)',
        category: 'Perimeter & Partition Walling',
        qty: `${stonePcs} Pieces`,
        unitRate: rates.stone9Inch,
        total: stonePcs * rates.stone9Inch
      },
      {
        no: 5,
        description: 'Box Profile Roofing Sheets (30-Gauge Charcoal Grey / Brick Red)',
        category: 'Roof Truss & Covering',
        qty: `${mabatiMeters} Meters`,
        unitRate: rates.mabatiMeter,
        total: mabatiMeters * rates.mabatiMeter
      },
      {
        no: 6,
        description: 'Roofing Accessories (Ridge Caps & Galvanized Nails with Rubber Washers)',
        category: 'Roof Flashings & Fasteners',
        qty: `${ridgeCaps} Ridges + ${nailsPackets} Pkts`,
        unitRate: 1550.00,
        total: (ridgeCaps * 750) + (nailsPackets * 800)
      }
    ];

    const subtotal = lineItems.reduce((acc, item) => acc + item.total, 0);
    const vat = subtotal * 0.16;
    const transportEstimate = county.toLowerCase().includes('nairobi') ? 12000 : 25000;
    const grandTotal = subtotal + vat + transportEstimate;

    res.render('pages/calculator-invoice', {
      title: `Official BOQ Proforma Invoice - ${county} County | TopLineHub`,
      county,
      lineItems,
      subtotal,
      vat,
      transportEstimate,
      grandTotal,
      invoiceNo: `TLH-BOQ-${Math.floor(100000 + Math.random() * 900000)}`
    });
  } catch (err) {
    console.error('Calculator invoice error:', err);
    res.redirect('/calculator');
  }
};

