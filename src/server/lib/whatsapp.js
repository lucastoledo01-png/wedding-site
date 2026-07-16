import { getDbClient } from "./db-client.js";

/**
 * Triggers a WhatsApp notification via the configured n8n webhook URL.
 * Also logs the dispatch attempt and result in the whatsapp_logs table.
 *
 * @param {import("hono").Context} c - Hono context
 * @param {Object} payload - Notification payload
 * @param {string} payload.invitationUid - UID of the invitation
 * @param {string} payload.guestName - Name of the guest
 * @param {string} payload.phone - Phone number of the guest
 * @param {string} payload.attendance - Attendance status ('ATTENDING' or 'NOT_ATTENDING')
 */
export async function triggerWhatsAppNotification(c, { invitationUid, guestName, phone, attendance, existingLogId = null }) {
  const webhookUrl = c.env?.N8N_WHATSAPP_WEBHOOK_URL || process.env.N8N_WHATSAPP_WEBHOOK_URL;

  if (!webhookUrl) {
    console.warn("[WhatsApp] Webhook URL (N8N_WHATSAPP_WEBHOOK_URL) is not defined in environment variables. Skipping dispatch.");
    return;
  }

  const pool = await getDbClient(c);

  // 1. Insert or update initial log record as 'triggered'
  let logId = existingLogId;
  try {
    if (logId) {
      await pool.query(
        `UPDATE whatsapp_logs
            SET status = $1,
                response_body = $2,
                updated_at = CURRENT_TIMESTAMP
          WHERE id = $3`,
        ["triggered", "Webhook retry initiated", logId]
      );
    } else {
      const logResult = await pool.query(
        `INSERT INTO whatsapp_logs (invitation_uid, guest_name, phone, attendance, status, response_body)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id`,
        [invitationUid, guestName, phone, attendance, "triggered", "Webhook request initiated"]
      );
      logId = logResult.rows[0]?.id;
    }
  } catch (dbError) {
    console.error("[WhatsApp] Failed to write/update initial log entry:", dbError.message);
  }

  // 2. Perform the fetch request to the n8n Webhook URL
  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        invitationUid,
        guestName,
        phone,
        attendance,
        timestamp: new Date().toISOString(),
      }),
    });

    const responseText = await response.text();
    const status = response.ok ? "sent" : "failed";
    const responseDetails = `HTTP ${response.status}: ${responseText}`;

    // 3. Update the log record with the dispatch result
    if (logId) {
      await pool.query(
        `UPDATE whatsapp_logs
            SET status = $1,
                response_body = $2,
                updated_at = CURRENT_TIMESTAMP
          WHERE id = $3`,
        [status, responseDetails, logId]
      );
    }
  } catch (fetchError) {
    console.error("[WhatsApp] Webhook dispatch error:", fetchError.message);

    // 3b. Update log to failed state
    if (logId) {
      try {
        await pool.query(
          `UPDATE whatsapp_logs
              SET status = $1,
                  response_body = $2,
                  updated_at = CURRENT_TIMESTAMP
            WHERE id = $3`,
          ["failed", `Fetch Error: ${fetchError.message}`, logId]
        );
      } catch (dbError) {
        console.error("[WhatsApp] Failed to update failed log status:", dbError.message);
      }
    }
  }
}
