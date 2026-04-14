/**
 * GET /api/ghl/setup
 *
 * One-time endpoint to register FonePay as a custom payment provider in GHL.
 * Call this once after deploying — it only needs to run a single time per location.
 *
 * Requires GHL_ACCESS_TOKEN, GHL_LOCATION_ID, and APP_BASE_URL to be set.
 */

const { registerProvider } = require('../../src/ghl');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const accessToken = process.env.GHL_ACCESS_TOKEN;
  const locationId = process.env.GHL_LOCATION_ID;
  const appBaseUrl = (process.env.APP_BASE_URL || `https://${req.headers.host}`).trim();

  if (!accessToken || !locationId) {
    return res.status(500).json({ error: 'GHL_ACCESS_TOKEN and GHL_LOCATION_ID must be set' });
  }

  try {
    const result = await registerProvider(accessToken, locationId, appBaseUrl);
    console.log('[GHL Setup] Provider registered:', JSON.stringify(result));
    return res.status(200).json({ success: true, result });
  } catch (error) {
    const detail = error?.response?.data || error.message;
    console.error('[GHL Setup Error]', detail);
    return res.status(500).json({ error: 'Registration failed', detail });
  }
};
