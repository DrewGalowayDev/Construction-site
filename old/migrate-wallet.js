require('dotenv').config();
const { sequelize } = require('./config/database');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  try {
    console.log('🔄 Running wallet system migration...');
    
    const sql = fs.readFileSync(
      path.join(__dirname, 'migrations', 'add-wallet-tables.sql'),
      'utf8'
    );
    
    // Strip single-line comments, then split by semicolons
    const cleaned = sql.replace(/--.*$/gm, '');
    const statements = cleaned
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.toUpperCase().startsWith('SELECT'));
    
    for (const statement of statements) {
      if (statement) {
        await sequelize.query(statement);
        console.log('✅ Executed:', statement.substring(0, 50) + '...');
      }
    }
    
    console.log('\n✅ Wallet system tables created successfully!');
    console.log('📋 Tables created:');
    console.log('   - wallets');
    console.log('   - transactions');
    console.log('   - contact_unlocks');
    console.log('\n🚀 You can now run: npm run dev');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
}

runMigration();
