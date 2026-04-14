const crypto = require('crypto');

const FONEPAY_URLS = {
  test: 'https://dev-clientapi.fonepay.com/api/merchantRequest',
  live: 'https://clientapi.fonepay.com/api/merchantRequest',
};

/**
 * Genera el HMAC-SHA512 (DV) para el request de pago.
 * Orden exacto del documento FonePay v2.0:
 * PID,MD,PRN,AMT,CRN,DT,R1,R2,RU
 */
function generateRequestDV(params, secretKey) {
  const message = [
    params.PID,
    params.MD,
    params.PRN,
    params.AMT,
    params.CRN,
    params.DT,
    params.R1,
    params.R2,
    params.RU,
  ].join(',');

  return crypto
    .createHmac('sha512', Buffer.from(secretKey, 'utf-8'))
    .update(message)
    .digest('hex');
}

/**
 * Verifica el HMAC-SHA512 (DV) del callback de FonePay.
 * Orden exacto del documento FonePay v2.0:
 * PRN,PID,PS,RC,UID,BC,INI,P_AMT,R_AMT
 */
function verifyResponseDV(callbackParams, secretKey) {
  const { PRN, PID, PS, RC, UID, BC, INI, P_AMT, R_AMT, DV } = callbackParams;

  const message = [PRN, PID, PS, RC, UID, BC, INI, P_AMT, R_AMT].join(',');

  const expectedDV = crypto
    .createHmac('sha512', Buffer.from(secretKey, 'utf-8'))
    .update(message)
    .digest('hex');

  return {
    valid: expectedDV === DV,
    success: PS === 'true',
    status: RC, // successful | failed | cancel
  };
}

/**
 * Construye la URL completa de redirect a FonePay.
 * IMPORTANTE: valores NO deben ser URL-encoded al calcular DV,
 * pero SÍ al construir la URL GET (URLSearchParams lo hace automático).
 */
function buildFonepayURL(order, returnUrl, config) {
  const mode = config.mode || process.env.FONEPAY_MODE || 'test';
  const pid = config.pid || process.env.FONEPAY_PID;
  const secretKey = config.secretKey || process.env.FONEPAY_SECRET;

  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const year = now.getFullYear();

  const params = {
    PID: pid,
    MD: 'P',
    PRN: String(order.id),
    AMT: String(order.amount),
    CRN: 'NPR',
    DT: `${month}/${day}/${year}`,
    R1: (order.description || 'Payment').substring(0, 160),
    R2: order.email || 'N/A',
    RU: returnUrl,
  };

  // Generar DV con valores sin URL-encode
  params.DV = generateRequestDV(params, secretKey);

  const baseUrl = FONEPAY_URLS[mode] || FONEPAY_URLS.test;
  return `${baseUrl}?${new URLSearchParams(params).toString()}`;
}

module.exports = { buildFonepayURL, verifyResponseDV, generateRequestDV };
