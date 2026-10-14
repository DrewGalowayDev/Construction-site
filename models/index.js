const { sequelize } = require('../config/database');

const User = require('./User');
const Category = require('./Category');
const Product = require('./Product');
const ArtisanProfile = require('./ArtisanProfile');
const JobPost = require('./JobPost');
const JobApplication = require('./JobApplication');
const OrderRequest = require('./OrderRequest');
const Wallet = require('./Wallet');
const Transaction = require('./Transaction');
const ContactUnlock = require('./ContactUnlock');

// Define associations only once
if (!User.associations.artisanProfile) {
  // 1. User <-> ArtisanProfile (1:1)
  User.hasOne(ArtisanProfile, { foreignKey: 'user_id', as: 'artisanProfile' });
  ArtisanProfile.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

  // 2. User (Seller) <-> Product (1:N)
  User.hasMany(Product, { foreignKey: 'seller_id', as: 'products' });
  Product.belongsTo(User, { foreignKey: 'seller_id', as: 'seller' });

  // 3. Category <-> Product (1:N)
  Category.hasMany(Product, { foreignKey: 'category_id', as: 'products' });
  Product.belongsTo(Category, { foreignKey: 'category_id', as: 'category' });

  // 4. User (Client) <-> JobPost (1:N)
  User.hasMany(JobPost, { foreignKey: 'client_id', as: 'postedJobs' });
  JobPost.belongsTo(User, { foreignKey: 'client_id', as: 'client' });

  // 5. JobPost <-> JobApplication (1:N)
  JobPost.hasMany(JobApplication, { foreignKey: 'job_id', as: 'applications' });
  JobApplication.belongsTo(JobPost, { foreignKey: 'job_id', as: 'job' });

  // 6. User (Artisan) <-> JobApplication (1:N)
  User.hasMany(JobApplication, { foreignKey: 'artisan_id', as: 'myApplications' });
  JobApplication.belongsTo(User, { foreignKey: 'artisan_id', as: 'artisan' });

  // 7. User (Buyer) <-> OrderRequest (1:N)
  User.hasMany(OrderRequest, { foreignKey: 'buyer_id', as: 'orders' });
  OrderRequest.belongsTo(User, { foreignKey: 'buyer_id', as: 'buyer' });

  // 8. Product <-> OrderRequest (1:N)
  Product.hasMany(OrderRequest, { foreignKey: 'product_id', as: 'orders' });
  OrderRequest.belongsTo(Product, { foreignKey: 'product_id', as: 'product' });

  // 9. User <-> Wallet (1:1)
  User.hasOne(Wallet, { foreignKey: 'user_id', as: 'wallet' });
  Wallet.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

  // 10. User <-> Transaction (1:N)
  User.hasMany(Transaction, { foreignKey: { name: 'user_id', allowNull: true }, as: 'transactions' });
  Transaction.belongsTo(User, { foreignKey: { name: 'user_id', allowNull: true }, as: 'user' });

  // 11. User <-> ContactUnlock (1:N)
  User.hasMany(ContactUnlock, { foreignKey: 'user_id', as: 'unlockedContacts' });
  ContactUnlock.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
}

module.exports = {
  sequelize,
  User,
  Category,
  Product,
  ArtisanProfile,
  JobPost,
  JobApplication,
  OrderRequest,
  Wallet,
  Transaction,
  ContactUnlock
};
