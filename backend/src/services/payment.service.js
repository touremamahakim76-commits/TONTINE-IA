/**
 * Service paiement — Stripe sandbox (mock).
 * En production, remplacer par l'intégration réelle de Stripe / Flutterwave / Wave.
 */
const { v4: uuid } = require('uuid');

/**
 * Simule un PaymentIntent. En sandbox, le paiement réussit dans 95% des cas
 * (sauf si le montant est exactement 99 centimes → simulation d'échec).
 */
async function createPaymentIntent({ amount, currency, userId, metadata = {} }) {
  const reference = 'pi_sandbox_' + uuid().slice(0, 12);
  const willSucceed = amount !== 99 && Math.random() > 0.05;
  return {
    provider: 'stripe_sandbox',
    reference,
    amount,
    currency,
    status: willSucceed ? 'succeeded' : 'failed',
    failureReason: willSucceed ? null : 'card_declined',
    metadata,
  };
}

/**
 * Simule un payout vers un bénéficiaire.
 */
async function createPayout({ amount, currency, userId, metadata = {} }) {
  const reference = 'po_sandbox_' + uuid().slice(0, 12);
  return {
    provider: 'stripe_sandbox',
    reference,
    amount,
    currency,
    status: 'paid',
    metadata,
  };
}

module.exports = { createPaymentIntent, createPayout };
