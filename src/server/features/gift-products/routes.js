import { Hono } from "hono";
import { getDbClient } from "../../lib/db-client.js";
import { NotFoundError } from "../../lib/errors.js";

const giftRoutes = new Hono();
const PIX_GIFT_URL = "pix://lucas-andressa";

function cleanText(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim();
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
  return { ...row, category: row.category || "Presentes" };
}

function findMeta(html, property) {
  const patterns = [
    new RegExp(
      `<meta[^>]+property=["']${property}["'][^>]+content=["']([^"']+)["']`,
      "i",
    ),
    new RegExp(
      `<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${property}["']`,
      "i",
    ),
    new RegExp(
      `<meta[^>]+name=["']${property}["'][^>]+content=["']([^"']+)["']`,
      "i",
    ),
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
  const title =
    findMeta(html, "og:title") ||
    html.match(/<title[^>]*>(.*?)<\/title>/i)?.[1];
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
    `SELECT id, url, name, image_url, pix_qr_image_url, pix_payload, price, price_cents, category, is_received, sort_order
       FROM gift_products
      WHERE invitation_uid = $1 AND is_active = true
      ORDER BY (url = $2) DESC, is_received ASC, price_cents ASC NULLS LAST,
               sort_order ASC, created_at DESC`,
    [uid, PIX_GIFT_URL],
  );

  return c.json({ success: true, data: result.rows.map(mapGiftRow) });
});

export async function listAdminGifts(pool, uid) {
  await ensurePixGift(pool, uid);
  const result = await pool.query(
    `SELECT id, url, name, image_url, pix_qr_image_url, pix_payload, price, price_cents, category, is_active, is_received, sort_order, created_at
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
  const hasSortOrder =
    body.sortOrder !== undefined || body.sort_order !== undefined;

  if (/^https?:\/\//i.test(url) && body.extract !== false) {
    try {
      extracted = await extractProductFromUrl(url);
    } catch (error) {
      console.warn(
        `Could not extract product metadata from ${url}:`,
        error.message,
      );
    }
  }

  const payload = {
    name: cleanText(body.name) || extracted.name || "Presente",
    imageUrl:
      cleanText(body.imageUrl || body.image_url) || extracted.imageUrl || "",
    pixQrImageUrl: cleanText(body.pixQrImageUrl || body.pix_qr_image_url) || "",
    pixPayload: cleanText(body.pixPayload || body.pix_payload) || "",
    price: cleanText(body.price) || extracted.price || "",
    priceCents: body.priceCents ?? body.price_cents ?? null,
    category:
      url === PIX_GIFT_URL ? "Pix" : cleanText(body.category) || "Presentes",
    isActive: body.isActive ?? body.is_active ?? true,
    isReceived: body.isReceived ?? body.is_received ?? false,
    sortOrder: Number(body.sortOrder ?? body.sort_order ?? 0),
  };

  if (body.id) {
    const result = await pool.query(
      `UPDATE gift_products
          SET url = $1, name = $2, image_url = $3, pix_qr_image_url = $4, pix_payload = $5,
              price = $6, price_cents = $7,
              category = $8, is_active = $9, is_received = $10, sort_order = $11,
              updated_at = CURRENT_TIMESTAMP
        WHERE id = $12 AND invitation_uid = $13
        RETURNING id, url, name, image_url, pix_qr_image_url, pix_payload, price, price_cents, category, is_active, is_received, sort_order`,
      [
        url,
        payload.name,
        payload.imageUrl,
        payload.pixQrImageUrl,
        payload.pixPayload,
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
      (invitation_uid, url, name, image_url, pix_qr_image_url, pix_payload, price, price_cents, category, is_active, is_received, sort_order)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
     RETURNING id, url, name, image_url, pix_qr_image_url, pix_payload, price, price_cents, category, is_active, is_received, sort_order`,
    [
      uid,
      url,
      payload.name,
      payload.imageUrl,
      payload.pixQrImageUrl,
      payload.pixPayload,
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

export { PIX_GIFT_URL };

export default giftRoutes;
