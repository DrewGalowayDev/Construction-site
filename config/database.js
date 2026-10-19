require('dotenv').config();
const { Sequelize } = require('sequelize');

// ============================================================
// DEBUG: Log resolved database configuration at startup
// ============================================================
const dbConfig = {
  name: process.env.DB_NAME || 'construction',
  user: process.env.DB_USER || 'root',
  pass: process.env.DB_PASS ? '***SET***' : '***USING_DEFAULT***',
  host: process.env.DB_HOST || '127.0.0.1',
  port: process.env.DB_PORT || 3306
};
console.log('='.repeat(60));
console.log('[DB CONFIG] Resolved database settings:');
console.log(`  DB_NAME : ${dbConfig.name}`);
console.log(`  DB_USER : ${dbConfig.user}`);
console.log(`  DB_HOST : ${dbConfig.host}`);
console.log(`  DB_PORT : ${dbConfig.port}`);
console.log(`  DB_PASS : ${dbConfig.pass}`);
console.log(`  NODE_ENV: ${process.env.NODE_ENV || 'not set'}`);
console.log('='.repeat(60));

const sequelize = new Sequelize(
  process.env.DB_NAME || 'construction',
  process.env.DB_USER || 'root',
  process.env.DB_PASS || 'Hackifyoucan254',
  {
    host: process.env.DB_HOST || '127.0.0.1',
    port: process.env.DB_PORT || 3306,
    dialect: 'mysql',
    dialectOptions: {
      connectTimeout: 10000
    },
    // DEBUG: Always log SQL queries during deployment troubleshooting
    logging: (msg) => console.log(`[SQL] ${msg}`),
    pool: {
      max: 10,
      min: 0,
      acquire: 15000,
      idle: 10000
    },
    define: {
      timestamps: true,
      underscored: true
    }
  }
);

const testConnection = async () => {
  console.log('[DB] Attempting database connection...');
  const startTime = Date.now();
  try {
    await sequelize.authenticate();
    const elapsed = Date.now() - startTime;
    console.log(`[DB] MySQL connected successfully in ${elapsed}ms`);

    // Ensure transactions.user_id is nullable for guest training payments
    try {
      await sequelize.query('ALTER TABLE `transactions` MODIFY COLUMN `user_id` INT(11) NULL;');
      console.log('[DB] Schema check: transactions.user_id is nullable for guest checkouts.');
    } catch (schemaErr) {
      // Table might not exist yet or user might not have ALTER permission
      console.log('[DB] Transactions table schema notice:', schemaErr.message);
    }
  } catch (error) {
    const elapsed = Date.now() - startTime;
    console.error(`[DB] CONNECTION FAILED after ${elapsed}ms`);
    console.error(`[DB] Error code: ${error.original?.code || error.code || 'N/A'}`);
    console.error(`[DB] Error errno: ${error.original?.errno || 'N/A'}`);
    console.error(`[DB] Error message: ${error.message}`);
    console.error(`[DB] Full error:`, error.original || error);
  }
};

module.exports = { sequelize, testConnection };
