const { sequelize } = require('../config/database');

async function migrateMpesa() {
  try {
    const [cols] = await sequelize.query('SHOW COLUMNS FROM order_requests');
    const names = cols.map(c => c.Field);

    if (!names.includes('payment_status')) {
      await sequelize.query("ALTER TABLE order_requests ADD COLUMN payment_status VARCHAR(20) DEFAULT 'unpaid'");
      console.log('Added payment_status');
    }
    if (!names.includes('mpesa_receipt')) {
      await sequelize.query("ALTER TABLE order_requests ADD COLUMN mpesa_receipt VARCHAR(50) DEFAULT NULL");
      console.log('Added mpesa_receipt');
    }
    if (!names.includes('mpesa_phone')) {
      await sequelize.query("ALTER TABLE order_requests ADD COLUMN mpesa_phone VARCHAR(30) DEFAULT NULL");
      console.log('Added mpesa_phone');
    }
    if (!names.includes('paid_at')) {
      await sequelize.query("ALTER TABLE order_requests ADD COLUMN paid_at DATETIME DEFAULT NULL");
      console.log('Added paid_at');
    }
    console.log('M-Pesa migration completed successfully!');
  } catch (err) {
    console.error('Migration error:', err);
  } finally {
    process.exit(0);
  }
}

migrateMpesa();
