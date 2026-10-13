require('dotenv').config();
const { sequelize } = require('../config/database');
const fs = require('fs');
const path = require('path');

async function run() {
  try {
    console.log('🔄 Applying escrow migration...');
    const sql = fs.readFileSync(path.join(__dirname, '..', 'migrations', 'add_escrow_columns.sql'), 'utf8');
    const cleaned = sql.replace(/--.*$/gm, '').trim();
    await sequelize.query(cleaned);
    console.log('✅ Escrow columns successfully added to order_requests table.');
    process.exit(0);
  } catch (err) {
    if (err.message.includes('Duplicate column name')) {
      console.log('ℹ️ Escrow columns already exist.');
      process.exit(0);
    }
    console.error('❌ Migration failed:', err.message);
    process.exit(1);
  }
}

run();
