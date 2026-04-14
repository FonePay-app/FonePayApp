/**
 * POST /api/fonepay/url
 *
 * Builds and returns the FonePay redirect URL as JSON.
 * Used by checkout.html to open FonePay in a popup window.
 *
 * Body: { orderId, amount, description, email, popup }
 * Response: { url: "https://fonepay.com/..." }
 */

const { buildFonepayURL } = require('../../src/fonepay');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { orderId, amount, description, email, popup } = req.body;

    if (!orderId || !amount) {
      return res.status(400).json({ error: 'orderId and amount are required' });
    }

    if (isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      return res.status(400).json({ error: 'amount must be a positive number' });
    }

    const baseUrl = (process.env.APP_BASE_URL || `https://${req.headers.host}`).trim();
    // Include popup flag in return URL so return.js knows to close the popup
    const returnUrl = popup
      ? `${baseUrl}/api/fonepay/return?popup=true`
      : `${baseUrl}/api/fonepay/return`;

    const fonepayUrl = buildFonepayURL(
      {
        id: orderId,
        amount: parseFloat(amount).toFixed(2),
        description: description || 'Payment',
        email: email || 'N/A',
      },
      returnUrl,
      {
        pid: process.env.FONEPAY_PID,
        secretKey: process.env.FONEPAY_SECRET,
        mode: process.env.FONEPAY_MODE || 'test',
      }
    );

    console.log(`[FonePay URL] orderId=${orderId} amount=${amount} popup=${!!popup}`);
    return res.status(200).json({ url: fonepayUrl });

  } catch (error) {
    console.error('[FonePay URL Error]', error.message);
    return res.status(500).json({ error: 'Failed to build payment URL' });
  }
};
