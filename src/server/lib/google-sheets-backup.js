import crypto from "node:crypto";
import { readFile } from "node:fs/promises";

const TOKEN_SCOPE = "https://www.googleapis.com/auth/spreadsheets";
const TOKEN_AUDIENCE = "https://oauth2.googleapis.com/token";

function getEnv(c, key) {
  return c.env?.[key] || process.env[key];
}

function base64Url(value) {
  return Buffer.from(value).toString("base64url");
}

function normalizePrivateKey(key) {
  return String(key || "").replace(/\\n/g, "\n");
}

async function loadServiceAccount(c) {
  const inlineJson = getEnv(c, "GOOGLE_SERVICE_ACCOUNT_JSON");
  const base64Json = getEnv(c, "GOOGLE_SERVICE_ACCOUNT_JSON_BASE64");
  const credentialsPath = getEnv(c, "GOOGLE_APPLICATION_CREDENTIALS");

  if (inlineJson) return JSON.parse(inlineJson);
  if (base64Json) {
    return JSON.parse(Buffer.from(base64Json, "base64").toString("utf8"));
  }
  if (credentialsPath) {
    return JSON.parse(await readFile(credentialsPath, "utf8"));
  }

  return null;
}

function createJwt(serviceAccount) {
  const now = Math.floor(Date.now() / 1000);
  const header = {
    alg: "RS256",
    typ: "JWT",
  };
  const payload = {
    iss: serviceAccount.client_email,
    scope: TOKEN_SCOPE,
    aud: TOKEN_AUDIENCE,
    iat: now,
    exp: now + 3600,
  };
  const unsignedToken = `${base64Url(JSON.stringify(header))}.${base64Url(
    JSON.stringify(payload),
  )}`;
  const signature = crypto
    .createSign("RSA-SHA256")
    .update(unsignedToken)
    .sign(normalizePrivateKey(serviceAccount.private_key), "base64url");

  return `${unsignedToken}.${signature}`;
}

async function getAccessToken(serviceAccount) {
  const response = await fetch(TOKEN_AUDIENCE, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: createJwt(serviceAccount),
    }),
  });
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error_description || data.error || "Google auth failed");
  }

  return data.access_token;
}

function getClientIp(c) {
  const forwardedFor = c.req.header("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0].trim();

  return (
    c.req.header("cf-connecting-ip") ||
    c.req.header("x-real-ip") ||
    c.req.header("x-client-ip") ||
    ""
  );
}

function getDevice(c) {
  return c.req.header("user-agent") || "";
}

function attendanceLabel(attendance) {
  return attendance === "NOT_ATTENDING" ? "Ausência confirmada" : "Presença confirmada";
}

export async function appendRsvpBackup(c, { name, attendance }) {
  const spreadsheetId = getEnv(c, "GOOGLE_SHEETS_SPREADSHEET_ID");
  if (!spreadsheetId) return { skipped: true, reason: "missing_spreadsheet_id" };

  const serviceAccount = await loadServiceAccount(c);
  if (!serviceAccount?.client_email || !serviceAccount?.private_key) {
    return { skipped: true, reason: "missing_service_account" };
  }

  const range = getEnv(c, "GOOGLE_SHEETS_RANGE") || "A:E";
  const accessToken = await getAccessToken(serviceAccount);
  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(
      range,
    )}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        values: [
          [
            new Date().toLocaleString("pt-BR", {
              timeZone: "America/Sao_Paulo",
            }),
            name,
            attendanceLabel(attendance),
            getDevice(c),
            getClientIp(c),
          ],
        ],
      }),
    },
  );
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error?.message || "Google Sheets append failed");
  }

  return { success: true, data };
}
