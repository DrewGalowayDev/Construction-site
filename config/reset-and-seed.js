require('dotenv').config();
const { sequelize, User, Category, Product, ArtisanProfile, JobPost, JobApplication, OrderRequest } = require('../models');

const resetAndSeed = async () => {
  try {
    console.log('🔄 Dropping all tables...');
    await sequelize.drop();
    console.log('✅ All tables dropped successfully.');

    console.log('🔄 Creating tables...');
    await sequelize.sync({ force: true });
    console.log('✅ Tables created successfully.');

    console.log('🌱 Running seed script...');
    const seedDatabase = require('./seed');
    await seedDatabase();

    console.log('🎉 Reset and seed completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during reset and seed:', error);
    process.exit(1);
  }
};

resetAndSeed();
