require('dotenv').config();
const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(
  process.env.DB_NAME || 'construction',
  process.env.DB_USER || 'root',
  process.env.DB_PASS || 'Hackifyoucan254',
  {
    host: process.env.DB_HOST || '127.0.0.1',
    port: process.env.DB_PORT || 3306,
    dialect: 'mysql',
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    pool: {
      max: 10,
      min: 0,
      acquire: 30000,
      idle: 10000
    },
    define: {
      timestamps: true,
      underscored: true
    }
  }
);

const testConnection = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ MySQL Database connected successfully via Sequelize.');

    // Ensure transactions.user_id is nullable for guest training payments
    try {
      await sequelize.query('ALTER TABLE `transactions` MODIFY COLUMN `user_id` INT(11) NULL;');
      console.log('✅ Schema check: transactions.user_id is nullable for guest checkouts.');
    } catch (schemaErr) {
      // Table might not exist yet or user might not have ALTER permission
      console.log('ℹ️ Transactions table schema notice:', schemaErr.message);
    }
  } catch (error) {
    console.error('❌ Unable to connect to the MySQL database:', error.message);
  }
};

module.exports = { sequelize, testConnection };
