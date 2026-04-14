const crypto = require('crypto');

const FONEPAY_URLS = {
  test: 'https://dev-clientapi.fonepay.com/api/merchantRequest',
  live: 'https://clientapi.fonepay.com/api/merchantRequest',
};

/**
 * Generates the HMAC-SHA512 (DV) for the payment request.
 * Exact field order per FonePay v2.0 spec:
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
 * Verifies the HMAC-SHA512 (DV) from the FonePay callback.
 * Exact field order per FonePay v2.0 spec:
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
 * Builds the full redirect URL to FonePay.
 * NOTE: values must NOT be URL-encoded when calculating DV,
 * but they ARE encoded in the GET URL (URLSearchParams handles this automatically).
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

  // Generate DV using raw (non-URL-encoded) values
  params.DV = generateRequestDV(params, secretKey);

  const baseUrl = FONEPAY_URLS[mode] || FONEPAY_URLS.test;
  return `${baseUrl}?${new URLSearchParams(params).toString()}`;
}

module.exports = { buildFonepayURL, verifyResponseDV, generateRequestDV };
