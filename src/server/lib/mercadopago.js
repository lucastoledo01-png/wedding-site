import crypto from "crypto";

const MP_API_URL = "https://api.mercadopago.com";

function getAccessToken(c) {
  return c.env?.MP_ACCESS_TOKEN || process.env.MP_ACCESS_TOKEN;
}

async function mpRequest(c, path, options = {}) {
  const accessToken = getAccessToken(c);
  if (!accessToken) throw new Error("MP_ACCESS_TOKEN não configurado.");

  const response = await fetch(`${MP_API_URL}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...(options.idempotencyKey ? { "X-Idempotency-Key": options.idempotencyKey } : {}),
      ...options.headers,
    },
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.message || "Falha ao comunicar com o Mercado Pago");
    error.mpResponse = data;
    error.status = response.status;
    throw error;
  }

  return data;
}

/**
 * Creates a Checkout Pro preference. The guest is redirected to the returned
 * init_point (or sandbox_init_point, when using test credentials) to complete
 * the payment on Mercado Pago's own hosted page.
 */
export async function createPreference(c, {
  title,
  unitPrice,
  externalReference,
  notificationUrl,
  backUrls,
}) {
  const preference = await mpRequest(c, "/checkout/preferences", {
    method: "POST",
    idempotencyKey: externalReference,
    body: JSON.stringify({
      items: [
        {
          title,
          quantity: 1,
          unit_price: unitPrice,
          currency_id: "BRL",
        },
      ],
      external_reference: externalReference,
      notification_url: notificationUrl,
      back_urls: backUrls,
      auto_return: "approved",
    }),
  });

  return preference;
}

/**
 * Re-fetches a payment by ID directly from Mercado Pago. This is the source
 * of truth for payment status — never trust the webhook body alone.
 */
export async function getPayment(c, paymentId) {
  return mpRequest(c, `/v1/payments/${paymentId}`, { method: "GET" });
}

/**
 * Validates the `x-signature` header sent with Mercado Pago webhook calls.
 *
 * IMPORTANT: the manifest format below follows Mercado Pago's published
 * webhook security docs at the time this was written. Mercado Pago has
 * changed this format before — double-check it against the current
 * "Notificações webhooks" / signature docs in your MP Developers panel
 * before relying on this in production.
 */
export function verifyWebhookSignature({ xSignature, xRequestId, dataId, secret }) {
  if (!xSignature || !secret) return false;

  const parts = Object.fromEntries(
    xSignature.split(",").map((part) => part.trim().split("=")),
  );
  const ts = parts.ts;
  const v1 = parts.v1;
  if (!ts || !v1) return false;

  const manifest = `id:${String(dataId).toLowerCase()};request-id:${xRequestId};ts:${ts};`;
  const expected = crypto.createHmac("sha256", secret).update(manifest).digest("hex");

  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(v1));
  } catch {
    return false;
  }
}
