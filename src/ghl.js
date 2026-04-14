const axios = require('axios');

const GHL_API_BASE = 'https://services.leadconnectorhq.com';

/**
 * Intercambia el authorization code por access_token + refresh_token
 * durante el proceso de instalación OAuth2.
 */
async function exchangeCodeForToken(code) {
  const response = await axios.post(`${GHL_API_BASE}/oauth/token`, {
    client_id: process.env.GHL_CLIENT_ID,
    client_secret: process.env.GHL_CLIENT_SECRET,
    grant_type: 'authorization_code',
    code,
    redirect_uri: process.env.GHL_REDIRECT_URI,
  });
  return response.data;
}

/**
 * Actualiza el estado de una transacción/orden en GHL.
 * Se llama después de verificar el pago en FonePay.
 *
 * @param {string} accessToken  - Token OAuth2 de la cuenta GHL
 * @param {string} locationId   - ID de la sub-cuenta GHL
 * @param {string} orderId      - ID de la orden (PRN que enviamos a FonePay)
 * @param {object} paymentData  - Datos del pago retornados por FonePay
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
 * Genera la URL de autorización OAuth2 para instalar la app en GHL.
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
