const crypto = require('crypto');

const PAYSTACK_API_BASE = 'https://api.paystack.co';

/**
 * Check if Paystack secret key is configured with a real key
 */
function isPaystackConfigured() {
  const key = process.env.PAYSTACK_SECRET_KEY;
  if (!key || typeof key !== 'string') return false;
  const trimmed = key.trim();
  // Must start with sk_live_ or sk_test_ and be at least 20 chars
  return (trimmed.startsWith('sk_live_') || trimmed.startsWith('sk_test_')) && trimmed.length > 20;
}

/**
 * Check if using live keys (not test)
 */
function isLiveMode() {
  const key = process.env.PAYSTACK_SECRET_KEY;
  return key && key.trim().startsWith('sk_live_');
}

/**
 * Get public key for frontend Paystack inline popup
 */
function getPublicKey() {
  return process.env.PAYSTACK_PUBLIC_KEY || '';
}

/**
 * Get the configured currency
 */
function getCurrency() {
  return process.env.PAYSTACK_CURRENCY || 'KES';
}

/**
 * Initialize a Paystack transaction
 * @param {Object} params - { email, amount, reference, callbackUrl, metadata, channels }
 */
async function initializeTransaction(params) {
  const {
    email,
    amount,
    reference,
    callbackUrl,
    metadata = {},
    channels = ['card', 'mobile_money', 'bank']
  } = params;

  const currency = getCurrency();

  // Paystack expects amount in minor currency units (kobo/cents: amount * 100)
  const amountInMinor = Math.round(Number(amount) * 100);

  if (!isPaystackConfigured()) {
    // Fallback simulated mode when no real keys are present
    console.log(`⚠️ [Paystack SIMULATED] No valid API key. Simulating payment for ${email} - ${currency} ${amount} (Ref: ${reference})`);
    return {
      status: true,
      isSimulated: true,
      message: 'Authorization URL created (SIMULATED — configure PAYSTACK_SECRET_KEY in .env for real payments)',
      data: {
        authorization_url: `${callbackUrl || '/wallet/paystack/callback'}?reference=${encodeURIComponent(reference)}&simulated=true`,
        access_code: `SIM_ACC_${Date.now()}`,
        reference
      }
    };
  }

  const secretKey = process.env.PAYSTACK_SECRET_KEY.trim();
  const mode = isLiveMode() ? 'LIVE' : 'TEST';

  console.log(`💳 [Paystack ${mode}] Initializing transaction: ${email} - ${currency} ${amount} (${amountInMinor} minor units) Ref: ${reference}`);

  // Sanitize and validate customer email for Paystack API
  let validEmail = 'customer@toplinehub.co.ke';
  if (email && typeof email === 'string' && email.includes('@')) {
    validEmail = email.trim();
  } else if (email && typeof email === 'string') {
    const sanitized = email.trim().replace(/[^a-zA-Z0-9._-]/g, '');
    validEmail = sanitized ? `${sanitized}@toplinehub.co.ke` : 'customer@toplinehub.co.ke';
  }

  const payload = {
    email: validEmail,
    amount: amountInMinor,
    currency,
    reference,
    callback_url: callbackUrl,
    channels,
    metadata
  };

  try {
    const response = await fetch(`${PAYSTACK_API_BASE}/transaction/initialize`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${secretKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (!response.ok || !data.status) {
      console.error(`❌ [Paystack ${mode}] Initialize failed:`, data.message || 'Unknown error');
      throw new Error(data.message || `Paystack initialization failed (HTTP ${response.status})`);
    }

    console.log(`✅ [Paystack ${mode}] Transaction initialized. Auth URL: ${data.data.authorization_url}`);
    return data;
  } catch (err) {
    console.error(`❌ [Paystack ${mode}] Network/API error:`, err.message);
    throw err;
  }
}

/**
 * Verify a Paystack transaction by reference
 * @param {string} reference
 */
async function verifyTransaction(reference) {
  if (!reference) {
    throw new Error('Transaction reference is required');
  }

  // If simulated reference, return simulated success
  if (reference.startsWith('SIM_') || !isPaystackConfigured()) {
    console.log(`⚠️ [Paystack SIMULATED] Verifying reference ${reference} — returning simulated success`);
    return {
      status: true,
      isSimulated: true,
      data: {
        status: 'success',
        reference,
        amount: 0,
        currency: getCurrency(),
        channel: 'simulated',
        gateway_response: 'Successful (Simulated)',
        paid_at: new Date().toISOString(),
        metadata: {}
      }
    };
  }

  const secretKey = process.env.PAYSTACK_SECRET_KEY.trim();
  const mode = isLiveMode() ? 'LIVE' : 'TEST';

  console.log(`🔍 [Paystack ${mode}] Verifying transaction: ${reference}`);

  try {
    const response = await fetch(`${PAYSTACK_API_BASE}/transaction/verify/${encodeURIComponent(reference)}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${secretKey}`,
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();

    if (!response.ok || !data.status) {
      console.error(`❌ [Paystack ${mode}] Verify failed:`, data.message || 'Unknown error');
      throw new Error(data.message || `Paystack verification failed (HTTP ${response.status})`);
    }

    console.log(`✅ [Paystack ${mode}] Verification result: ${data.data.status} — ${data.data.gateway_response} — Amount: ${data.data.amount}`);
    return data;
  } catch (err) {
    console.error(`❌ [Paystack ${mode}] Verify network/API error:`, err.message);
    throw err;
  }
}

/**
 * Verify Paystack webhook event signature
 * @param {string|Buffer} rawBody
 * @param {string} signature
 */
function verifyWebhookSignature(rawBody, signature) {
  if (!isPaystackConfigured() || !signature) {
    return false;
  }

  const secret = process.env.PAYSTACK_SECRET_KEY.trim();
  const hash = crypto
    .createHmac('sha512', secret)
    .update(rawBody)
    .digest('hex');

  return hash === signature;
}

module.exports = {
  isPaystackConfigured,
  isLiveMode,
  getPublicKey,
  getCurrency,
  initializeTransaction,
  verifyTransaction,
  verifyWebhookSignature,
  PAYSTACK_CURRENCY: getCurrency()
};
