/**
 * POST /api/fonepay/init
 *
 * Inicia un pago en FonePay.
 * Recibe los datos de la orden, genera el DV hash (HMAC-SHA512)
 * y redirige al cliente al portal de pago de FonePay.
 *
 * Body esperado:
 * {
 *   orderId:     string  — ID único de la orden (se usa como PRN)
 *   amount:      number  — Monto en NPR
 *   description: string  — Descripción del pago (max 160 chars)
 *   email:       string  — Email del cliente (opcional)
 *   locationId:  string  — ID de la sub-cuenta GHL (opcional)
 * }
 */

const { buildFonepayURL } = require('../../src/fonepay');

module.exports = async function handler(req, res) {
  // Solo aceptar POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { orderId, amount, description, email, locationId } = req.body;

    // Validaciones básicas
    if (!orderId || !amount) {
      return res.status(400).json({ error: 'orderId and amount are required' });
    }

    if (isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      return res.status(400).json({ error: 'amount must be a positive number' });
    }

    // Return URL donde FonePay redirigirá después del pago
    const baseUrl = process.env.APP_BASE_URL || `https://${req.headers.host}`;
    const returnUrl = `${baseUrl}/api/fonepay/return`;

    // Construir URL de FonePay con HMAC-SHA512
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

    // Log para debugging (remover en producción)
    console.log(`[FonePay Init] orderId=${orderId} amount=${amount} mode=${process.env.FONEPAY_MODE}`);

    // Redirigir al portal de FonePay
    res.redirect(302, fonepayUrl);

  } catch (error) {
    console.error('[FonePay Init Error]', error.message);
    res.status(500).json({ error: 'Failed to initiate payment', detail: error.message });
  }
};
