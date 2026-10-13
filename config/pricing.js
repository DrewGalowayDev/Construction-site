// Platform Pricing Configuration (KES - Kenyan Shillings)

module.exports = {
  // Contact Unlock Fees
  UNLOCK_JOB_CLIENT_CONTACT: 50.00,        // Ksh 50 to see job poster's contact
  UNLOCK_MATERIAL_SUPPLIER_CONTACT: 30.00, // Ksh 30 to see material supplier's contact
  UNLOCK_ARTISAN_CONTACT: 20.00,           // Ksh 20 to see artisan/fundi contact
  UNLOCK_ORDER_CLIENT_CONTACT: 50.00,      // Ksh 50 platform commission to reveal client phone & WhatsApp on hire/order requests
  
  // Top-up Options (Denominations)
  TOPUP_OPTIONS: [
    { amount: 100, bonus: 0, label: 'Ksh 100' },
    { amount: 200, bonus: 10, label: 'Ksh 200 + Ksh 10 Bonus' },
    { amount: 500, bonus: 50, label: 'Ksh 500 + Ksh 50 Bonus' },
    { amount: 1000, bonus: 150, label: 'Ksh 1,000 + Ksh 150 Bonus' },
    { amount: 2000, bonus: 400, label: 'Ksh 2,000 + Ksh 400 Bonus' },
    { amount: 5000, bonus: 1250, label: 'Ksh 5,000 + Ksh 1,250 Bonus' }
  ],
  
  // Platform Commission Rates
  PLATFORM_COMMISSION_RATE: 0.10, // 10% platform fee
  
  // Free Trial
  NEW_USER_FREE_CREDITS: 100.00, // Ksh 100 free credits for new users
  
  // Minimum Balance
  MINIMUM_BALANCE_REQUIRED: 0.00
};
