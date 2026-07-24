import { Hono } from "hono";
import { getDbClient } from "../../lib/db-client.js";
import { NotFoundError } from "../../lib/errors.js";
import { createPreference, getPayment, verifyWebhookSignature } from "../../lib/mercadopago.js";

const giftRoutes = new Hono();
const PIX_GIFT_URL = "pix://lucas-andressa";

function cleanText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function isPixGift(gift) {
  return gift?.url === PIX_GIFT_URL;
}

async function ensurePixGift(pool, uid) {
  const existing = await pool.query(
    `SELECT id
       FROM gift_products
      WHERE invitation_uid = $1 AND url = $2
      LIMIT 1`,
    [uid, PIX_GIFT_URL],
  );

  if (existing.rows[0]) return;

  const orderResult = await pool.query(
    `SELECT COALESCE(MAX(sort_order), -1) + 1 AS next_sort_order
       FROM gift_products
      WHERE invitation_uid = $1`,
    [uid],
  );

  await pool.query(
    `INSERT INTO gift_products
      (invitation_uid, url, name, image_url, price, category, is_active, is_received, sort_order)
     VALUES ($1, $2, $3, $4, $5, $6, true, false, $7)`,
    [
      uid,
      PIX_GIFT_URL,
      "Um carinho para nós",
      "/images/pix-icon.jpg",
      "Chave Pix",
      "Pix",
      Number(orderResult.rows[0]?.next_sort_order || 0),
    ],
  );
}

function mapGiftRow(row) {
  if (!isPixGift(row)) return { ...row, category: row.category || "Presentes" };
  return { ...row, category: "Pix", gift_type: "pix" };
}

function findMeta(html, property) {
  const patterns = [
    new RegExp(`<meta[^>]+property=["']${property}["'][^>]+content=["']([^"']+)["']`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${property}["']`, "i"),
    new RegExp(`<meta[^>]+name=["']${property}["'][^>]+content=["']([^"']+)["']`, "i"),
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) return cleanText(match[1]);
  }

  return "";
}

async function extractProductFromUrl(url) {
  const response = await fetch(url, {
    headers: {
      "user-agent": "Mozilla/5.0 wedding-registry-bot",
      accept: "text/html,application/xhtml+xml",
    },
  });
  const html = await response.text();
  const title = findMeta(html, "og:title") || html.match(/<title[^>]*>(.*?)<\/title>/i)?.[1];
  const image = findMeta(html, "og:image");
  const price =
    findMeta(html, "product:price:amount") ||
    findMeta(html, "twitter:data1") ||
    html.match(/R\$\s?[\d.,]+/)?.[0];

  return {
    name: cleanText(title),
    imageUrl: image,
    price: cleanText(price),
  };
}

giftRoutes.get("/", async (c) => {
  const uid = c.req.param("uid");
  const pool = await getDbClient(c);
  await ensurePixGift(pool, uid);
  const result = await pool.query(
    `SELECT id, url, name, image_url, price, price_cents, category, is_received, sort_order
       FROM gift_products
      WHERE invitation_uid = $1 AND is_active = true
      ORDER BY is_received ASC, sort_order ASC, created_at DESC`,
    [uid],
  );

  return c.json({ success: true, data: result.rows.map(mapGiftRow) });
});

export async function listAdminGifts(pool, uid) {
  await ensurePixGift(pool, uid);
  const result = await pool.query(
    `SELECT id, url, name, image_url, price, price_cents, category, is_active, is_received, sort_order, created_at
       FROM gift_products
      WHERE invitation_uid = $1
      ORDER BY sort_order ASC, created_at DESC`,
    [uid],
  );
  return result.rows.map(mapGiftRow);
}

export async function upsertGift(pool, uid, body) {
  let existingGift = null;
  if (body.id) {
    const existing = await pool.query(
      "SELECT url FROM gift_products WHERE id = $1 AND invitation_uid = $2",
      [body.id, uid],
    );
    existingGift = existing.rows[0] || null;
  }

  const url =
    existingGift?.url === PIX_GIFT_URL ? PIX_GIFT_URL : cleanText(body.url);
  let extracted = {};
  const hasSortOrder = body.sortOrder !== undefined || body.sort_order !== undefined;

  if (/^https?:\/\//i.test(url) && body.extract !== false) {
    try {
      extracted = await extractProductFromUrl(url);
    } catch (error) {
      console.warn(`Could not extract product metadata from ${url}:`, error.message);
    }
  }

  const payload = {
    name: cleanText(body.name) || extracted.name || "Presente",
    imageUrl: cleanText(body.imageUrl || body.image_url) || extracted.imageUrl || "",
    price: cleanText(body.price) || extracted.price || "",
    priceCents:
      body.priceCents ?? body.price_cents ?? null,
    category: url === PIX_GIFT_URL
      ? "Pix"
      : cleanText(body.category) || "Presentes",
    isActive: body.isActive ?? body.is_active ?? true,
    isReceived: body.isReceived ?? body.is_received ?? false,
    sortOrder: Number(body.sortOrder ?? body.sort_order ?? 0),
  };

  if (body.id) {
    const result = await pool.query(
      `UPDATE gift_products
          SET url = $1, name = $2, image_url = $3, price = $4, price_cents = $5,
              category = $6, is_active = $7, is_received = $8, sort_order = $9,
              updated_at = CURRENT_TIMESTAMP
        WHERE id = $10 AND invitation_uid = $11
        RETURNING id, url, name, image_url, price, price_cents, category, is_active, is_received, sort_order`,
      [
        url,
        payload.name,
        payload.imageUrl,
        payload.price,
        payload.priceCents,
        payload.category,
        payload.isActive,
        payload.isReceived,
        payload.sortOrder,
        body.id,
        uid,
      ],
    );
    if (!result.rows[0]) throw new NotFoundError("Gift not found");
    return result.rows[0];
  }

  if (!hasSortOrder) {
    const orderResult = await pool.query(
      `SELECT COALESCE(MAX(sort_order), -1) + 1 AS next_sort_order
         FROM gift_products
        WHERE invitation_uid = $1`,
      [uid],
    );
    payload.sortOrder = Number(orderResult.rows[0]?.next_sort_order || 0);
  }

  const result = await pool.query(
    `INSERT INTO gift_products
      (invitation_uid, url, name, image_url, price, price_cents, category, is_active, is_received, sort_order)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     RETURNING id, url, name, image_url, price, price_cents, category, is_active, is_received, sort_order`,
    [
      uid,
      url,
      payload.name,
      payload.imageUrl,
      payload.price,
      payload.priceCents,
      payload.category,
      payload.isActive,
      payload.isReceived,
      payload.sortOrder,
    ],
  );

  return result.rows[0];
}

export async function reorderGifts(pool, uid, giftIds) {
  const ids = [...new Set((Array.isArray(giftIds) ? giftIds : []).map(Number))]
    .filter(Number.isInteger)
    .filter((id) => id > 0);

  if (!ids.length) return listAdminGifts(pool, uid);

  const caseLines = ids.map((_, index) => `WHEN $${index + 2} THEN ${index}`);
  await pool.query(
    `UPDATE gift_products
        SET sort_order = CASE id ${caseLines.join(" ")} ELSE sort_order END,
            updated_at = CURRENT_TIMESTAMP
      WHERE invitation_uid = $1 AND id IN (${ids.map((_, index) => `$${index + 2}`).join(", ")})`,
    [uid, ...ids],
  );

  return listAdminGifts(pool, uid);
}

giftRoutes.post("/:id/checkout", async (c) => {
  const uid = c.req.param("uid");
  const giftId = Number(c.req.param("id"));
  const pool = await getDbClient(c);

  const giftResult = await pool.query(
    `SELECT id, name, price_cents, is_received
       FROM gift_products
      WHERE id = $1 AND invitation_uid = $2 AND is_active = true`,
    [giftId, uid],
  );
  const gift = giftResult.rows[0];

  if (!gift) return c.json({ success: false, error: "Presente não encontrado." }, 404);
  if (!gift.price_cents) {
    return c.json({ success: false, error: "Este presente não aceita pagamento direto." }, 400);
  }
  if (gift.is_received) {
    return c.json({ success: false, error: "Este presente já foi conquistado por outra pessoa." }, 400);
  }

  const externalReference = `gift-${giftId}-${Date.now()}`;
  const baseUrl = c.env?.PUBLIC_API_URL || process.env.PUBLIC_API_URL || new URL(c.req.url).origin;

  const paymentRecord = await pool.query(
    `INSERT INTO gift_payments
      (invitation_uid, gift_product_id, external_reference, status, amount_cents)
     VALUES ($1, $2, $3, 'pending', $4)
     RETURNING id`,
    [uid, giftId, externalReference, gift.price_cents],
  );

  try {
    const preference = await createPreference(c, {
      title: `Presente: ${gift.name}`,
      unitPrice: gift.price_cents / 100,
      externalReference,
      notificationUrl: `${baseUrl}/api/${uid}/gifts/webhook/mercadopago`,
      backUrls: {
        success: `${baseUrl}/?gift_payment=success#gifts`,
        pending: `${baseUrl}/?gift_payment=pending#gifts`,
        failure: `${baseUrl}/?gift_payment=failure#gifts`,
      },
    });

    return c.json({
      success: true,
      data: {
        checkoutUrl: preference.sandbox_init_point || preference.init_point,
      },
    }, 201);
  } catch (error) {
    await pool.query(
      `UPDATE gift_payments
          SET status = 'rejected', raw_response = $1, updated_at = CURRENT_TIMESTAMP
        WHERE id = $2`,
      [JSON.stringify(error.mpResponse || { message: error.message }), paymentRecord.rows[0].id],
    );
    return c.json(
      { success: false, error: error.mpResponse?.message || "Não foi possível iniciar o pagamento." },
      error.status || 500,
    );
  }
});

giftRoutes.post("/webhook/mercadopago", async (c) => {
  const uid = c.req.param("uid");
  const body = await c.req.json().catch(() => ({}));
  const dataId = c.req.query("data.id") || body.data?.id;
  const topic = c.req.query("type") || body.type;

  if (topic !== "payment" || !dataId) {
    return c.json({ success: true });
  }

  const secret = c.env?.MP_WEBHOOK_SECRET || process.env.MP_WEBHOOK_SECRET;
  if (secret) {
    const isValid = verifyWebhookSignature({
      xSignature: c.req.header("x-signature"),
      xRequestId: c.req.header("x-request-id"),
      dataId,
      secret,
    });
    if (!isValid) {
      console.warn("[MercadoPago] Webhook com assinatura inválida, ignorado.");
      return c.json({ success: false, error: "Assinatura inválida." }, 401);
    }
  } else {
    console.warn("[MercadoPago] MP_WEBHOOK_SECRET não configurado — assinatura do webhook não validada.");
  }

  // Never trust the webhook body for the actual status — re-fetch from Mercado Pago.
  const payment = await getPayment(c, dataId);
  const pool = await getDbClient(c);

  const paymentRow = await pool.query(
    `UPDATE gift_payments
        SET status = $1, mp_payment_id = $2, raw_response = $3, updated_at = CURRENT_TIMESTAMP
      WHERE external_reference = $4 AND invitation_uid = $5
      RETURNING gift_product_id`,
    [payment.status, String(payment.id), JSON.stringify(payment), payment.external_reference, uid],
  );

  if (paymentRow.rows[0] && payment.status === "approved") {
    await pool.query(
      "UPDATE gift_products SET is_received = true, updated_at = CURRENT_TIMESTAMP WHERE id = $1",
      [paymentRow.rows[0].gift_product_id],
    );
  }

  return c.json({ success: true });
});

export { PIX_GIFT_URL };

export default giftRoutes;
