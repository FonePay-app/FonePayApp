/**
 * GET /api/oauth/callback
 *
 * Endpoint OAuth2 de GoHighLevel.
 * GHL redirige aquí con ?code=xxx después de que el admin instala la app.
 *
 * Flujo:
 * 1. Admin instala la app desde GHL Marketplace
 * 2. GHL redirige a este endpoint con un código de autorización
 * 3. Intercambiamos el código por access_token + refresh_token
 * 4. Guardamos los tokens (en env vars por ahora — app privada)
 * 5. Redirigimos al admin a la página de configuración
 */

const { exchangeCodeForToken } = require('../../src/ghl');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { code, error: oauthError } = req.query;
  const baseUrl = process.env.APP_BASE_URL || `https://${req.headers.host}`;

  // Error durante el OAuth2 (usuario rechazó, etc.)
  if (oauthError) {
    console.error('[GHL Install] OAuth error:', oauthError);
    return res.redirect(302, `${baseUrl}/failed.html?reason=ghl_auth_denied`);
  }

  if (!code) {
    return res.status(400).json({ error: 'Missing authorization code' });
  }

  try {
    const tokenData = await exchangeCodeForToken(code);

    console.log('[GHL Install] Token received for locationId:', tokenData.locationId);
    console.log('[GHL Install] Token type:', tokenData.token_type);

    // Para la app privada, loguear los tokens para configurarlos en env vars
    // En producción esto se guardaría en base de datos
    console.log('--- GUARDAR ESTOS VALORES EN VERCEL ENV VARS ---');
    console.log('GHL_ACCESS_TOKEN:', tokenData.access_token);
    console.log('GHL_REFRESH_TOKEN:', tokenData.refresh_token);
    console.log('GHL_LOCATION_ID:', tokenData.locationId);
    console.log('------------------------------------------------');

    // Redirigir a página de éxito de instalación
    return res.redirect(302, `${baseUrl}/success.html?installed=true&locationId=${encodeURIComponent(tokenData.locationId || '')}`);

  } catch (error) {
    console.error('[GHL Install Error]', error?.response?.data || error.message);
    return res.redirect(302, `${baseUrl}/failed.html?reason=token_exchange_failed`);
  }
};
