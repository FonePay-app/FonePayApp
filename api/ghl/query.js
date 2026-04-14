/**
 * POST /api/ghl/query
 *
 * GHL queryUrl endpoint — called by GHL after receiving a chargeId
 * from the checkout iframe to verify the payment.
 *
 * Since FonePay already validated the HMAC-SHA512 signature in the
 * return handler, we simply acknowledge with { success: true }.
 */

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  console.log('[GHL Query] Received:', JSON.stringify(req.body));
  return res.status(200).json({ success: true });
};
