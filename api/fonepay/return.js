/**
 * GET /api/fonepay/return
 *
 * Return URL — FonePay redirige aquí después del pago.
 * 1. Recibe los parámetros de FonePay via query string
 * 2. Verifica el DV hash para confirmar autenticidad
 * 3. Actualiza GHL con el estado del pago
 * 4. Redirige al cliente a la página de éxito o fallo
 *
 * Parámetros recibidos de FonePay:
 * PRN, PID, PS, RC, DV, UID, BC, INI, P_AMT, R_AMT
 */

const { verifyResponseDV } = require('../../src/fonepay');
const { updateGHLTransaction } = require('../../src/ghl');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const baseUrl = process.env.APP_BASE_URL || `https://${req.headers.host}`;
  const params = req.query;

  console.log('[FonePay Return] Received:', JSON.stringify(params));

  try {
    // Verificar que llegaron los parámetros mínimos
    const required = ['PRN', 'PID', 'PS', 'RC', 'DV'];
    for (const field of required) {
      if (!params[field]) {
        console.error(`[FonePay Return] Missing param: ${field}`);
        return res.redirect(302, `${baseUrl}/failed.html?reason=missing_params`);
      }
    }

    // Verificar el DV hash — confirma que la respuesta es auténtica de FonePay
    const verification = verifyResponseDV(params, process.env.FONEPAY_SECRET);

    if (!verification.valid) {
      console.error('[FonePay Return] DV hash mismatch — possible tampering');
      return res.redirect(302, `${baseUrl}/failed.html?reason=invalid_signature`);
    }

    const { success, status } = verification;
    const orderId = params.PRN;

    console.log(`[FonePay Return] orderId=${orderId} success=${success} status=${status} P_AMT=${params.P_AMT}`);

    // Actualizar GHL si hay token disponible
    // Los tokens GHL se guardan durante la instalación OAuth2
    // Por ahora: log del resultado (se conecta con GHL en Fase 2)
    const ghlAccessToken = process.env.GHL_ACCESS_TOKEN;
    const ghlLocationId = process.env.GHL_LOCATION_ID;

    if (ghlAccessToken && ghlLocationId) {
      try {
        await updateGHLTransaction(ghlAccessToken, ghlLocationId, orderId, {
          success,
          status,
          P_AMT: params.P_AMT,
          UID: params.UID,
        });
        console.log(`[FonePay Return] GHL updated for order ${orderId}`);
      } catch (ghlError) {
        // No bloquear al usuario si GHL falla
        console.error('[FonePay Return] GHL update failed:', ghlError.message);
      }
    }

    // Redirigir según resultado del pago
    if (success && status === 'successful') {
      return res.redirect(
        302,
        `${baseUrl}/success.html?orderId=${encodeURIComponent(orderId)}&amount=${encodeURIComponent(params.P_AMT)}&traceId=${encodeURIComponent(params.UID || '')}`
      );
    } else {
      return res.redirect(
        302,
        `${baseUrl}/failed.html?orderId=${encodeURIComponent(orderId)}&reason=${encodeURIComponent(status)}`
      );
    }

  } catch (error) {
    console.error('[FonePay Return Error]', error.message);
    return res.redirect(302, `${baseUrl}/failed.html?reason=server_error`);
  }
};
