/**
 * POST /api/fonepay/init
 *
 * Initiates a FonePay payment.
 * Receives order data, generates the DV hash (HMAC-SHA512),
 * and redirects the client to the FonePay payment portal.
 *
 * Expected body:
 * {
 *   orderId:     string  — Unique order ID (used as PRN)
 *   amount:      number  — Amount in NPR
 *   description: string  — Payment description (max 160 chars)
 *   email:       string  — Customer email (optional)
 *   locationId:  string  — GHL sub-account ID (optional)
 * }
 */

const { buildFonepayURL } = require('../../src/fonepay');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { orderId, amount, description, email, locationId } = req.body;

    // Basic validation
    if (!orderId || !amount) {
      return res.status(400).json({ error: 'orderId and amount are required' });
    }

    if (isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      return res.status(400).json({ error: 'amount must be a positive number' });
    }

    // Return URL where FonePay will redirect after payment
    const baseUrl = process.env.APP_BASE_URL || `https://${req.headers.host}`;
    const returnUrl = `${baseUrl}/api/fonepay/return`;

    // Build FonePay URL with HMAC-SHA512
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

    console.log(`[FonePay Init] orderId=${orderId} amount=${amount} mode=${process.env.FONEPAY_MODE}`);

    // Redirect to FonePay portal
    res.redirect(302, fonepayUrl);

  } catch (error) {
    console.error('[FonePay Init Error]', error.message);
    res.status(500).json({ error: 'Failed to initiate payment', detail: error.message });
  }
};
