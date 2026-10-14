// Contact Reveal Helpers
const { ContactUnlock } = require('../models');
const PRICING = require('../config/pricing');

/**
 * Check if user has unlocked a specific contact
 */
async function hasUnlockedContact(userId, unlockType, targetId) {
  if (!userId) return false;
  
  const unlock = await ContactUnlock.findOne({
    where: {
      user_id: userId,
      unlock_type: unlockType,
      target_id: targetId
    }
  });
  
  return !!unlock;
}

/**
 * Get masked phone number (shows only last 3 digits, clearly indicating protected status)
 */
function maskPhoneNumber(phone) {
  if (!phone) return '🔒 Hidden (Unlock to View)';
  const cleaned = phone.replace(/[^0-9]/g, '');
  if (cleaned.length < 4) return '🔒 Hidden (Unlock to View)';
  
  const lastThree = cleaned.slice(-3);
  return `+254 7XX *** ${lastThree}`;
}

/**
 * Get pricing for unlock type
 */
function getUnlockPrice(unlockType) {
  switch(unlockType) {
    case 'job_client':
      return PRICING.UNLOCK_JOB_CLIENT_CONTACT;
    case 'material_supplier':
      return PRICING.UNLOCK_MATERIAL_SUPPLIER_CONTACT;
    case 'artisan_fundi':
      return PRICING.UNLOCK_ARTISAN_CONTACT;
    case 'order_client':
      return PRICING.UNLOCK_ORDER_CLIENT_CONTACT || 50.00;
    default:
      return 50.00;
  }
}

/**
 * Format clean WhatsApp URL for Kenyan numbers
 */
function formatWhatsAppUrl(phone, text = '') {
  if (!phone) return '#';
  let cleaned = phone.replace(/[^0-9]/g, '');
  if (cleaned.startsWith('0')) {
    cleaned = '254' + cleaned.slice(1);
  } else if (!cleaned.startsWith('254') && cleaned.length === 9) {
    cleaned = '254' + cleaned;
  }
  return `https://wa.me/${cleaned}${text ? '?text=' + encodeURIComponent(text) : ''}`;
}

/**
 * Format contact display based on unlock status
 */
function formatContactDisplay(phone, isUnlocked, maskIt = true) {
  if (isUnlocked || !maskIt) {
    return phone;
  }
  return maskPhoneNumber(phone);
}

module.exports = {
  hasUnlockedContact,
  maskPhoneNumber,
  getUnlockPrice,
  formatContactDisplay,
  formatWhatsAppUrl
};
