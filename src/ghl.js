const axios = require('axios');

const GHL_API_BASE = 'https://services.leadconnectorhq.com';

/**
 * Exchanges the authorization code for access_token + refresh_token
 * during the OAuth2 installation flow.
 */
async function exchangeCodeForToken(code) {
  const params = new URLSearchParams({
    client_id: (process.env.GHL_CLIENT_ID || '').trim(),
    client_secret: (process.env.GHL_CLIENT_SECRET || '').trim(),
    grant_type: 'authorization_code',
    code,
    redirect_uri: (process.env.GHL_REDIRECT_URI || '').trim(),
  });

  const response = await axios.post(`${GHL_API_BASE}/oauth/token`, params.toString(), {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });
  return response.data;
}

/**
 * Updates a transaction/order status in GHL.
 * Called after verifying the payment result from FonePay.
 *
 * @param {string} accessToken  - GHL OAuth2 access token
 * @param {string} locationId   - GHL sub-account ID
 * @param {string} orderId      - Order ID (PRN sent to FonePay)
 * @param {object} paymentData  - Payment data returned by FonePay
 */
async function updateGHLTransaction(accessToken, locationId, orderId, paymentData) {
  const { success, status, P_AMT, UID } = paymentData;

  try {
    const response = await axios.post(
      `${GHL_API_BASE}/payments/custom-provider/provider/connect`,
      {
        locationId,
        orderId,
        paymentStatus: success ? 'paid' : 'failed',
        transactionId: UID || orderId,
        amount: parseFloat(P_AMT || 0),
        currency: 'NPR',
        provider: 'fonepay',
        providerStatus: status,
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          Version: '2021-07-28',
        },
      }
    );
    return response.data;
  } catch (error) {
    console.error('GHL update error:', error?.response?.data || error.message);
    throw error;
  }
}

/**
 * Generates the OAuth2 authorization URL to install the app in GHL.
 */
function getGHLInstallURL() {
  const params = new URLSearchParams({
    response_type: 'code',
    redirect_uri: process.env.GHL_REDIRECT_URI,
    client_id: process.env.GHL_CLIENT_ID,
    scope: 'payments.orders.readonly payments.transactions.write contacts.readonly locations.readonly',
  });
  return `https://marketplace.gohighlevel.com/oauth/chooselocation?${params.toString()}`;
}

module.exports = { exchangeCodeForToken, updateGHLTransaction, getGHLInstallURL };
