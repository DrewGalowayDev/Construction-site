require('dotenv').config();
const { sequelize, User, Category, Product, ArtisanProfile, JobPost } = require('../models');

const seedDatabase = async () => {
  try {
    console.log('🔄 Syncing database tables...');
    await sequelize.sync({ alter: true });
    console.log('✅ Tables synced successfully.');

    console.log('🌱 Seeding categories...');
    const categories = await Category.bulkCreate([
      { name: 'Cement & Binding', slug: 'cement-binding', type: 'material', icon: 'fa-cubes', description: 'Portland cement, lime, tile adhesive & grouts' },
      { name: 'Steel & Metal Works', slug: 'steel-metals', type: 'material', icon: 'fa-grip-lines-vertical', description: 'BRC mesh, deformed bars D8/D10/D12/D16, binding wire' },
      { name: 'Sand, Stones & Ballast', slug: 'sand-stones-ballast', type: 'material', icon: 'fa-mountain', description: 'River sand, machine cut stones, 3/4 ballast tippers' },
      { name: 'Timber & Formwork', slug: 'timber-formwork', type: 'material', icon: 'fa-tree', description: 'Bluegum posts, cypress timber, marine plywood' },
      { name: 'Roofing & Gutters', slug: 'roofing-materials', type: 'material', icon: 'fa-home', description: 'Box profile mabati, stone coated tiles, ridging & valley' },
      { name: 'Plumbing & Drainage', slug: 'plumbing-drainage', type: 'material', icon: 'fa-faucet', description: 'PPR pipes, HDPE coils, septic tanks, water storage' },
      { name: 'Electrical & Solar', slug: 'electrical-solar', type: 'material', icon: 'fa-bolt', description: 'Single & twin core cables, consumer units, conduits' },
      { name: 'Equipment & Tool Hire', slug: 'equipment-hire', type: 'rental', icon: 'fa-tools', description: 'Concrete mixers, poker vibrators, scaffolding, compactors' }
    ]);

    console.log('🌱 Seeding demo users...');
    
    // Simple Test Accounts for Easy Access
    const adminUser = await User.create({
      name: 'Admin User',
      email: 'admin',
      phone: '+254711000000',
      password: 'admin2026',
      role: 'admin',
      county: 'Nairobi',
      town: 'CBD',
      is_verified: true
    });

    const clientUser = await User.create({
      name: 'Client User',
      email: 'client',
      phone: '+254720998877',
      password: 'client2026',
      role: 'buyer',
      county: 'Machakos',
      town: 'Syokimau',
      is_verified: true
    });

    const supplierUser = await User.create({
      name: 'Supplier User',
      email: 'supplier',
      phone: '+254722112233',
      password: 'supplier2026',
      role: 'seller',
      county: 'Nairobi',
      town: 'Industrial Area',
      is_verified: true
    });

    const artisanUser = await User.create({
      name: 'Artisan User',
      email: 'artisan',
      phone: '+254799887766',
      password: 'artisan2026',
      role: 'artisan',
      county: 'Kiambu',
      town: 'Thika / Ruiru',
      avatar: '/img/team-1.jpg',
      is_verified: true
    });

    // Additional demo vendor for variety
    const vendor2 = await User.create({
      name: 'Apex Plant & Equipment Hire',
      email: 'rentals@apexplant.co.ke',
      phone: '+254733445566',
      password: 'VendorPassword123!',
      role: 'seller',
      county: 'Kiambu',
      town: 'Ruiru',
      is_verified: true
    });

    const artisanUser1 = await User.create({
      name: 'John Mwangi',
      email: 'john.mason@toplinehub.co.ke',
      phone: '+254799887755',
      password: 'ArtisanPassword123!',
      role: 'artisan',
      county: 'Kiambu',
      town: 'Thika / Ruiru',
      avatar: '/img/team-1.jpg',
      is_verified: true
    });

    // Artisan Profile for test artisan account
    await ArtisanProfile.create({
      user_id: artisanUser.id,
      trade: 'General Contractor',
      experience_years: 5,
      daily_rate: 2500.00,
      bio: 'Skilled artisan with experience in various construction trades including masonry, carpentry, and general site work.',
      nca_reg_number: 'NCA-ART-12345',
      rating: 4.8,
      is_available: true
    });

    await ArtisanProfile.create({
      user_id: artisanUser1.id,
      trade: 'Master Mason / Bricklayer',
      experience_years: 12,
      daily_rate: 2500.00,
      bio: 'NCA certified lead mason with 12+ years experience in multi-storey residential projects, foundation stone dressing, and boundary wall masonry.',
      nca_reg_number: 'NCA-ART-88421',
      rating: 4.9,
      is_available: true
    });

    const artisanUser2 = await User.create({
      name: 'Peter Omondi',
      email: 'peter.electric@toplinehub.co.ke',
      phone: '+254788112244',
      password: 'ArtisanPassword123!',
      role: 'artisan',
      county: 'Nairobi',
      town: 'Westlands / Langata',
      avatar: '/img/team-2.jpg',
      is_verified: true
    });

    await ArtisanProfile.create({
      user_id: artisanUser2.id,
      trade: 'Certified Electrician',
      experience_years: 8,
      daily_rate: 3000.00,
      bio: 'EPRA class B licensed electrician. Conduit piping, distribution board wiring, 3-phase commercial installations, and solar inverter hookups.',
      nca_reg_number: 'EPRA-ELEC-4412',
      rating: 5.0,
      is_available: true
    });

    console.log('🌱 Seeding materials & hire equipment...');
    await Product.bulkCreate([
      {
        seller_id: supplierUser.id,
        category_id: categories[0].id,
        title: 'Bamburi Tembo Cement (32.5R)',
        slug: 'bamburi-tembo-cement-50kg',
        description: 'High performance general purpose cement ideal for bricklaying, plastering, structural mortars, and non-structural concretes.',
        price: 780.00,
        unit: '50kg Bag',
        is_rental: false,
        stock_quantity: 500,
        image_url: '/img/service-1.jpg',
        images: ['/img/service-1.jpg', '/img/service-2.jpg', '/img/service-3.jpg'],
        location_county: 'Nairobi'
      },
      {
        seller_id: supplierUser.id,
        category_id: categories[1].id,
        title: 'D12 Deformed Steel Rebar (High Yield BS4449)',
        slug: 'd12-deformed-steel-rebar',
        description: 'Standard 12mm high yield ribbed steel reinforcement bar for columns, beams, ring beams, and foundation footings.',
        price: 1540.00,
        unit: '12m Length',
        is_rental: false,
        stock_quantity: 200,
        image_url: '/img/service-4.jpg',
        images: ['/img/service-4.jpg', '/img/service-1.jpg', '/img/service-5.jpg'],
        location_county: 'Nairobi'
      },
      {
        seller_id: supplierUser.id,
        category_id: categories[4].id,
        title: 'Box Profile Mabati 30-Gauge (Charcoal Grey)',
        slug: 'box-profile-mabati-30g-charcoal',
        description: 'Gloss finish corrosion-resistant corrugated roofing sheets with UV-resistant acrylic coat, 2.5m, 3.0m, and custom lengths.',
        price: 890.00,
        unit: 'Meter',
        is_rental: false,
        stock_quantity: 350,
        image_url: '/img/service-3.jpg',
        images: ['/img/service-3.jpg', '/img/service-4.jpg', '/img/service-6.jpg'],
        location_county: 'Kiambu'
      },
      {
        seller_id: vendor2.id,
        category_id: categories[7].id,
        title: 'Diesel Concrete Mixer 400L (With Hopper)',
        slug: 'diesel-concrete-mixer-400l',
        description: 'Heavy duty Yanmar diesel engine powered reversible drum mixer. High throughput batching for site slabs and footings. Includes operator.',
        price: 4500.00,
        unit: 'Per Day',
        is_rental: true,
        stock_quantity: 4,
        image_url: '/img/service-2.jpg',
        images: ['/img/service-2.jpg', '/img/service-5.jpg', '/img/service-1.jpg'],
        location_county: 'Kiambu'
      },
      {
        seller_id: vendor2.id,
        category_id: categories[7].id,
        title: 'Steel Tubular Scaffolding Frame Set (6-Meter Tower)',
        slug: 'steel-scaffolding-frame-tower',
        description: 'Certified heavy steel scaffold kit including 4 H-frames, cross braces, base jacks, and safety walk boards.',
        price: 1200.00,
        unit: 'Per Day',
        is_rental: true,
        stock_quantity: 25,
        image_url: '/img/service-5.jpg',
        images: ['/img/service-5.jpg', '/img/service-2.jpg', '/img/service-3.jpg'],
        location_county: 'Nairobi'
      },
      {
        seller_id: supplierUser.id,
        category_id: categories[2].id,
        title: 'Clean River Sand (10-Tonne Tipper Lorry)',
        slug: 'clean-river-sand-10-tonne',
        description: 'Sieved coarse river sand free of silt and clay contaminants. Ideal for concrete casting and wall plastering.',
        price: 24000.00,
        unit: '10-Tonne Tipper',
        is_rental: false,
        stock_quantity: 50,
        image_url: '/img/service-6.jpg',
        images: ['/img/service-6.jpg', '/img/service-1.jpg', '/img/service-4.jpg'],
        location_county: 'Machakos'
      }
    ]);

    console.log('🌱 Seeding verified Saudi Arabia & Qatar jobs...');
    await JobPost.bulkCreate([
      {
        client_id: clientUser.id,
        title: 'Finish Mason & Marble Tile Installer – Luxury Villa Compound',
        description: 'Seeking experienced finish masons and marble fixers for luxury villa compounds in Riyadh. Requires block work, precision marble floor installation, wall cladding, and exterior stone finishing. Food, accommodation, visa and medical provided.',
        trade_required: 'Mason',
        location_county: 'Saudi Arabia',
        location_town: 'Riyadh',
        budget_estimate: 110000.00,
        duration: '2 Years Contract',
        status: 'open'
      },
      {
        client_id: clientUser.id,
        title: 'High-Rise Steel Fixer & Rebar Fabricator – Metro & Commercial Tower',
        description: 'Certified steel fixers needed for major metro infrastructure and commercial tower projects in Riyadh. Reading structural rebar BBS drawings, tying heavy foundation cages, raft foundations, and shear walls. Overtime available.',
        trade_required: 'Steel fixer',
        location_county: 'Saudi Arabia',
        location_town: 'Riyadh',
        budget_estimate: 105000.00,
        duration: '2 Years Contract',
        status: 'open'
      },
      {
        client_id: clientUser.id,
        title: 'Industrial MEP Electrician & Cable Jointer – Coastal Commercial Hub',
        description: 'Licensed commercial & industrial electricians for coastal commercial development in Jeddah. Cable pulling (HV/LV), conduit installation, distribution board termination, switchgear, and safety grounding.',
        trade_required: 'Electrician',
        location_county: 'Saudi Arabia',
        location_town: 'Jeddah',
        budget_estimate: 140000.00,
        duration: '2 Years Contract',
        status: 'open'
      },
      {
        client_id: clientUser.id,
        title: 'Certified 6G TIG & ARC Structural Pipe Welder – Industrial Network',
        description: 'Seeking AWS/ASME certified 6G TIG/ARC pipe and structural welders for petrochemical and industrial piping networks in Eastern Province. Must pass radiographic inspection test. Free food, shared accommodation & medical provided.',
        trade_required: 'Welder',
        location_county: 'Saudi Arabia',
        location_town: 'Dammam',
        budget_estimate: 165000.00,
        duration: '2 Years Contract',
        status: 'open'
      },
      {
        client_id: clientUser.id,
        title: 'Shuttering Carpenter & Formwork Specialist – Bridge & Decking Works',
        description: 'Formwork carpenters experienced in PERI, DOKA, and conventional timber formwork for civil road structures and commercial developments in Riyadh. Setting out shuttering, props, and decking.',
        trade_required: 'Carpenter',
        location_county: 'Saudi Arabia',
        location_town: 'Riyadh',
        budget_estimate: 105000.00,
        duration: '2 Years Contract',
        status: 'open'
      },
      {
        client_id: clientUser.id,
        title: 'Certified Heavy Duty Scaffolder – Mega Infrastructure Project',
        description: 'CISRS/TUV certified scaffolders needed for the NEOM mega-development project. Erecting and dismantling heavy-duty cuplock, ringlock, and tubular access scaffolding up to 40 meters. Strict safety and harness protocols.',
        trade_required: 'Scaffolder',
        location_county: 'Saudi Arabia',
        location_town: 'NEOM',
        budget_estimate: 115000.00,
        duration: '2 Years Contract',
        status: 'open'
      },
      {
        client_id: clientUser.id,
        title: 'Heavy Excavator & Tower Crane Operator – Major Earthmoving Operations',
        description: 'Licensed heavy equipment operators for 30T-50T crawler excavators and tower cranes on major earthmoving and foundation operations in NEOM. Valid GCC/Saudi heavy driving license required.',
        trade_required: 'Equipment operator',
        location_county: 'Saudi Arabia',
        location_town: 'NEOM',
        budget_estimate: 155000.00,
        duration: '2 Years Contract',
        status: 'open'
      },
      {
        client_id: clientUser.id,
        title: 'Civil Construction General Foreman – Commercial & Residential Towers',
        description: 'Experienced site foreman to supervise multi-national crews of masons, carpenters, and steel fixers. Managing daily site progress, material requisitions, QA/QC inspections, and HSE standards on high-rise commercial structures.',
        trade_required: 'Foreman',
        location_county: 'Saudi Arabia',
        location_town: 'Jeddah',
        budget_estimate: 220000.00,
        duration: '2 Years Contract',
        status: 'open'
      },
      {
        client_id: clientUser.id,
        title: 'Commercial MEP Plumber & Pipefitter – Hotel & Marina Towers',
        description: 'Experienced commercial plumbers for luxury hotel development in Lusail Marina. Installation of PPR, PEX, and HDPE supply lines, drainage stacks, booster pumps, and sanitary fixtures. Verified agency placement with food and lodging.',
        trade_required: 'Plumber',
        location_county: 'Qatar',
        location_town: 'Lusail',
        budget_estimate: 125000.00,
        duration: '2 Years Contract',
        status: 'open'
      },
      {
        client_id: clientUser.id,
        title: 'Building Automation & Low Voltage (ELV) Technician – West Bay Hub',
        description: 'Technicians needed for installation and commissioning of building management systems (BMS), fire alarm, CCTV, and structured cabling in West Bay towers, Doha. Free visa, return ticket, and medical insurance provided.',
        trade_required: 'Electrician',
        location_county: 'Qatar',
        location_town: 'Doha',
        budget_estimate: 145000.00,
        duration: '2 Years Contract',
        status: 'open'
      },
      {
        client_id: clientUser.id,
        title: 'Commercial Bricklayer & Stone Cladding Mason – Airport Expansion',
        description: 'Skilled masons for Hamad International Airport commercial expansion. Architectural concrete blockwork, dry-mix screeding, granite floor paving, and wall stone cladding. Attractive tax-free compensation package.',
        trade_required: 'Mason',
        location_county: 'Qatar',
        location_town: 'Doha',
        budget_estimate: 110000.00,
        duration: '2 Years Contract',
        status: 'open'
      },
      {
        client_id: clientUser.id,
        title: 'Mobile Crane & Heavy Forklift Operator – Port & Logistics Terminal',
        description: 'Experienced operators for 50T-100T all-terrain mobile cranes and container forklifts at Hamad Port & Al Wakrah industrial hub. GCC heavy license required. Air ticket, accommodation, and overtime included.',
        trade_required: 'Equipment operator',
        location_county: 'Qatar',
        location_town: 'Al Wakrah',
        budget_estimate: 150000.00,
        duration: '2 Years Contract',
        status: 'open'
      },
      {
        client_id: clientUser.id,
        title: 'Airless Spray Painter & Epoxy Floor Specialist – Commercial Warehouses',
        description: 'Industrial painters experienced with airless spray equipment, sandblasting, drywall taping/skimming, and two-part epoxy floor coatings for logistics and stadium auxiliary facilities in Al Rayyan.',
        trade_required: 'Painter',
        location_county: 'Qatar',
        location_town: 'Al Rayyan',
        budget_estimate: 100000.00,
        duration: '2 Years Contract',
        status: 'open'
      },
      {
        client_id: clientUser.id,
        title: 'MEP Site Supervisor / Foreman – High-Rise Residential Tower',
        description: 'Supervision of electrical, plumbing, and HVAC subcontractor teams on 35-storey residential tower in The Pearl / West Bay, Doha. Coordinates site drawings, inspections, testing, and commissioning.',
        trade_required: 'Foreman',
        location_county: 'Qatar',
        location_town: 'Doha',
        budget_estimate: 230000.00,
        duration: '2 Years Contract',
        status: 'open'
      },
      {
        client_id: clientUser.id,
        title: 'Bridge & Pre-Cast Concrete Steel Fixer – Express Highway Extension',
        description: 'Steel fixers for pre-cast concrete beam fabrication and highway flyover construction in Al Wakrah. Rebar bending, beam assembly, and post-tensioning duct installation.',
        trade_required: 'Steel fixer',
        location_county: 'Qatar',
        location_town: 'Al Wakrah',
        budget_estimate: 108000.00,
        duration: '2 Years Contract',
        status: 'open'
      },
      {
        client_id: clientUser.id,
        title: 'Structural Steel Welder & Canopy Erector – Commercial Pavilion Project',
        description: 'Structural steel welders and fitters for architectural canopy and stadium roof maintenance in Lusail. Flux-cored and stick welding, bolt tightening to torque specs, overhead welding.',
        trade_required: 'Welder',
        location_county: 'Qatar',
        location_town: 'Lusail',
        budget_estimate: 155000.00,
        duration: '2 Years Contract',
        status: 'open'
      }
    ]);

    console.log('🎉 Initial seeding completed successfully!');
    console.log('\n✅ ========== TEST ACCOUNTS CREATED ==========');
    console.log('📋 Login Credentials (Use "email" field for username):');
    console.log('');
    console.log('👨‍💼 ADMIN Account:');
    console.log('   Username: admin');
    console.log('   Password: admin2026');
    console.log('');
    console.log('🛒 CLIENT Account (Buyer):');
    console.log('   Username: client');
    console.log('   Password: client2026');
    console.log('');
    console.log('🏪 SUPPLIER Account (Seller):');
    console.log('   Username: supplier');
    console.log('   Password: supplier2026');
    console.log('');
    console.log('🔨 ARTISAN Account (Fundi):');
    console.log('   Username: artisan');
    console.log('   Password: artisan2026');
    console.log('');
    console.log('🌐 Access the platform at: http://localhost:3000');
    console.log('=============================================\n');
  } catch (error) {
    console.error('❌ Error during seeding:', error);
  }
};

module.exports = seedDatabase;

if (require.main === module) {
  seedDatabase().then(() => {
    process.exit(0);
  });
}
