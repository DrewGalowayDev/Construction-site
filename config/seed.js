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

    console.log('🌱 Seeding demo jobs...');
    await JobPost.bulkCreate([
      {
        client_id: clientUser.id,
        title: 'Looking for 2 Masons & 1 Handyman for Perimeter Wall Construction',
        description: 'We are raising a 150-meter perimeter stone wall in Syokimau. Foundation trench is already excavated. Needs dressing 9x9 quarry stones, mortar mix, and hoop iron reinforcement.',
        trade_required: 'Mason / Bricklayer',
        location_county: 'Machakos',
        location_town: 'Syokimau',
        budget_estimate: 65000.00,
        duration: '10 Days',
        status: 'open'
      },
      {
        client_id: clientUser.id,
        title: 'Complete First-Fix Electrical Piping & Conduit Fitting for 3-Bedroom Villa',
        description: 'Site is ready for conduit laying in concrete slab and wall channelling before plastering. Single phase 240V, distribution board, generator changeover switch wiring.',
        trade_required: 'Certified Electrician',
        location_county: 'Kiambu',
        location_town: 'Ruiru Mugutha',
        budget_estimate: 42000.00,
        duration: '1 Week',
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
