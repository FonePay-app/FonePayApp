/**
 * GET /api/oauth/callback
 *
 * GoHighLevel OAuth2 callback endpoint.
 * GHL redirects here with ?code=xxx after the admin installs the app.
 *
 * Flow:
 * 1. Admin installs the app from GHL Marketplace
 * 2. GHL redirects to this endpoint with an authorization code
 * 3. Exchange the code for access_token + refresh_token
 * 4. Store the tokens (in env vars for now — private app)
 * 5. Redirect the admin to the success page
 */

const { exchangeCodeForToken } = require('../../src/ghl');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { code, error: oauthError } = req.query;
  const baseUrl = process.env.APP_BASE_URL || `https://${req.headers.host}`;

  // OAuth2 error (user denied access, etc.)
  if (oauthError) {
    console.error('[OAuth Callback] OAuth error:', oauthError);
    return res.redirect(302, `${baseUrl}/failed.html?reason=ghl_auth_denied`);
  }

  if (!code) {
    return res.status(400).json({ error: 'Missing authorization code' });
  }

  try {
    const tokenData = await exchangeCodeForToken(code);

    console.log('[OAuth Callback] Token received for locationId:', tokenData.locationId);

    // For a private app, log tokens so they can be added to Vercel env vars
    console.log('--- ADD THESE VALUES TO VERCEL ENV VARS ---');
    console.log('GHL_ACCESS_TOKEN:', tokenData.access_token);
    console.log('GHL_REFRESH_TOKEN:', tokenData.refresh_token);
    console.log('GHL_LOCATION_ID:', tokenData.locationId);
    console.log('-------------------------------------------');

    return res.redirect(302, `${baseUrl}/success.html?installed=true&locationId=${encodeURIComponent(tokenData.locationId || '')}`);

  } catch (error) {
    const errDetail = error?.response?.data || error.message;
    console.error('[OAuth Callback Error]', JSON.stringify(errDetail));
    // Return error detail in URL for debugging
    const reason = encodeURIComponent(JSON.stringify(errDetail).substring(0, 100));
    return res.redirect(302, `${baseUrl}/failed.html?reason=token_exchange_failed&detail=${reason}`);
  }
};
