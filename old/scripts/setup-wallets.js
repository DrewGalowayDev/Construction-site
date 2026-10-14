/**
 * Initialize wallets for all existing users who don't have one,
 * and test the Paystack API connection.
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { User, Wallet, Transaction } = require('../models');
const paystack = require('../helpers/paystackHelper');

async function run() {
  try {
    console.log('\n========================================');
    console.log('  TopLineHub — Wallet & Paystack Setup');
    console.log('========================================\n');

    // 1. Check Paystack configuration
    console.log('--- Paystack Configuration ---');
    const pubKey = process.env.PAYSTACK_PUBLIC_KEY || '(not set)';
    const secKey = process.env.PAYSTACK_SECRET_KEY || '(not set)';
    console.log(`  Public Key: ${pubKey.substring(0, 15)}...${pubKey.slice(-6)}`);
    console.log(`  Secret Key: ${secKey.substring(0, 15)}...${secKey.slice(-6)}`);
    console.log(`  Currency: ${process.env.PAYSTACK_CURRENCY || 'KES'}`);
    console.log(`  Configured: ${paystack.isPaystackConfigured() ? '✅ YES' : '❌ NO'}`);
    console.log(`  Mode: ${paystack.isLiveMode() ? '🔴 LIVE (real money!)' : '🟡 TEST (sandbox)'}`);
    console.log('');

    // 2. Test Paystack API connectivity
    if (paystack.isPaystackConfigured()) {
      console.log('--- Testing Paystack API Connection ---');
      try {
        const testRef = `TEST_CONN_${Date.now()}`;
        const result = await paystack.initializeTransaction({
          email: 'test@toplinehub.co.ke',
          amount: 10, // KES 10 minimum
          reference: testRef,
          callbackUrl: 'http://localhost:3000/wallet/paystack/callback',
          metadata: { test: true }
        });
        
        if (result && result.data && result.data.authorization_url) {
          console.log(`  ✅ Paystack API is WORKING!`);
          console.log(`  Authorization URL: ${result.data.authorization_url}`);
          console.log(`  Access Code: ${result.data.access_code}`);
          console.log('');
        }
      } catch (err) {
        console.error(`  ❌ Paystack API error: ${err.message}`);
        console.log(`  → Check your keys at https://dashboard.paystack.com/#/settings/api`);
        console.log('');
      }
    }

    // 3. Create wallets for all users who don't have one
    console.log('--- Initializing User Wallets ---');
    const users = await User.findAll({ attributes: ['id', 'name', 'email', 'role'] });
    console.log(`  Found ${users.length} users in database\n`);

    let created = 0;
    let existed = 0;

    for (const user of users) {
      let wallet = await Wallet.findOne({ where: { user_id: user.id } });
      
      if (wallet) {
        console.log(`  ✔ ${user.name} (${user.email}) — wallet exists, balance: KES ${Number(wallet.balance).toLocaleString()}`);
        existed++;
      } else {
        // Create wallet with welcome bonus
        const welcomeBonus = 100.00; // KES 100 free credits
        wallet = await Wallet.create({
          user_id: user.id,
          balance: welcomeBonus,
          total_topped_up: 0,
          total_spent: 0
        });

        await Transaction.create({
          user_id: user.id,
          type: 'topup',
          amount: welcomeBonus,
          balance_before: 0,
          balance_after: welcomeBonus,
          description: 'Welcome Bonus — Free Platform Credits',
          reference_type: 'topup',
          payment_method: 'bonus',
          status: 'completed'
        });

        console.log(`  ✅ ${user.name} (${user.email}) — NEW wallet created with KES ${welcomeBonus} welcome bonus`);
        created++;
      }
    }

    console.log(`\n  Summary: ${created} wallets created, ${existed} already existed`);

    // 4. Show final wallet balances
    console.log('\n--- Current Wallet Balances ---');
    const wallets = await Wallet.findAll();
    for (const w of wallets) {
      const usr = users.find(u => u.id === w.user_id);
      console.log(`  ${usr ? usr.name : `User #${w.user_id}`}: KES ${Number(w.balance).toLocaleString()} (spent: ${Number(w.total_spent).toLocaleString()}, topped-up: ${Number(w.total_topped_up).toLocaleString()})`);
    }

    console.log('\n========================================');
    console.log('  ✅ Setup complete!');
    console.log('========================================\n');

    process.exit(0);
  } catch (err) {
    console.error('❌ Setup error:', err);
    process.exit(1);
  }
}

run();
