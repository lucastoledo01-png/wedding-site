import crypto from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const SESSION_DURATION_SECONDS = 7 * 24 * 60 * 60;
const SETUP_DURATION_SECONDS = 15 * 60;
const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
const USERS_FILE = path.join(process.cwd(), "data", "admin-users.json");

function base64UrlEncode(value) {
  return Buffer.from(value).toString("base64url");
}

function base64UrlDecode(value) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function getEnv(c, key) {
  return c.env?.[key] || process.env[key];
}

function getSessionSecret(c) {
  return (
    getEnv(c, "ADMIN_SESSION_SECRET") ||
    getEnv(c, "ADMIN_PASSWORD") ||
    getEnv(c, "ADMIN_TOKEN")
  );
}

function safeCompare(left, right) {
  const leftBuffer = Buffer.from(String(left || ""));
  const rightBuffer = Buffer.from(String(right || ""));
  if (leftBuffer.length !== rightBuffer.length) return false;
  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

function decodeBase32(secret) {
  const cleanSecret = String(secret || "")
    .replace(/=+$/g, "")
    .replace(/\s+/g, "")
    .toUpperCase();
  let bits = "";

  for (const char of cleanSecret) {
    const value = BASE32_ALPHABET.indexOf(char);
    if (value === -1) throw new Error("Invalid TOTP secret");
    bits += value.toString(2).padStart(5, "0");
  }

  const bytes = [];
  for (let index = 0; index + 8 <= bits.length; index += 8) {
    bytes.push(parseInt(bits.slice(index, index + 8), 2));
  }

  return Buffer.from(bytes);
}

function generateBase32Secret() {
  const bytes = crypto.randomBytes(20);
  let bits = "";
  let secret = "";

  for (const byte of bytes) bits += byte.toString(2).padStart(8, "0");
  for (let index = 0; index < bits.length; index += 5) {
    secret += BASE32_ALPHABET[parseInt(bits.slice(index, index + 5).padEnd(5, "0"), 2)];
  }

  return secret;
}

function generateTotp(secret, counter) {
  const key = decodeBase32(secret);
  const counterBuffer = Buffer.alloc(8);
  counterBuffer.writeBigUInt64BE(BigInt(counter));
  const hmac = crypto.createHmac("sha1", key).update(counterBuffer).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const binary =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);

  return String(binary % 1_000_000).padStart(6, "0");
}

function verifyTotp(secret, code) {
  const normalizedCode = String(code || "").replace(/\s+/g, "");
  if (!/^\d{6}$/.test(normalizedCode)) return false;

  const currentCounter = Math.floor(Date.now() / 1000 / 30);
  return [-1, 0, 1].some((offset) =>
    safeCompare(generateTotp(secret, currentCounter + offset), normalizedCode),
  );
}

function signPayload(payload, secret) {
  return crypto.createHmac("sha256", secret).update(payload).digest("base64url");
}

function createSignedToken(c, data, durationSeconds) {
  const sessionSecret = getSessionSecret(c);
  const now = Math.floor(Date.now() / 1000);
  const payload = base64UrlEncode(
    JSON.stringify({
      ...data,
      iat: now,
      exp: now + durationSeconds,
    }),
  );
  const signature = signPayload(payload, sessionSecret);

  return {
    token: `${payload}.${signature}`,
    expiresAt: new Date((now + durationSeconds) * 1000).toISOString(),
  };
}

function verifySignedToken(c, token, type) {
  const sessionSecret = getSessionSecret(c);
  if (!token || !sessionSecret || !token.includes(".")) return null;

  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;
  if (!safeCompare(signPayload(payload, sessionSecret), signature)) return null;

  try {
    const data = JSON.parse(base64UrlDecode(payload));
    if (type && data.type !== type) return null;
    if (Number(data.exp) <= Math.floor(Date.now() / 1000)) return null;
    return data;
  } catch {
    return null;
  }
}

async function readUsersFile() {
  const content = await readFile(USERS_FILE, "utf8");
  return JSON.parse(content);
}

async function writeUsersFile(data) {
  await mkdir(path.dirname(USERS_FILE), { recursive: true });
  await writeFile(USERS_FILE, `${JSON.stringify(data, null, 2)}\n`);
}

function verifyPassword(password, passwordHash) {
  const [salt, expectedHash] = String(passwordHash || "").split(":");
  if (!salt || !expectedHash) return false;
  const actualHash = crypto.scryptSync(String(password || ""), salt, 64).toString("hex");
  return safeCompare(actualHash, expectedHash);
}

function createOtpAuthUrl(username, secret) {
  const label = encodeURIComponent(`Lucas & Andressa:${username}`);
  const issuer = encodeURIComponent("Lucas & Andressa");
  return `otpauth://totp/${label}?secret=${secret}&issuer=${issuer}&digits=6&period=30`;
}

export function createAdminSession(c, username) {
  return createSignedToken(c, { type: "admin_session", sub: username }, SESSION_DURATION_SECONDS);
}

export function verifyAdminSession(c, token) {
  return Boolean(verifySignedToken(c, token, "admin_session"));
}

export async function authenticateAdmin(c, credentials) {
  const data = await readUsersFile();
  const user = data.users.find((item) => item.username === credentials.username);

  if (!user || !verifyPassword(credentials.password, user.passwordHash)) {
    return {
      success: false,
      status: 401,
      error: "Usuário ou senha inválidos.",
    };
  }

  if (!user.totpSecret) {
    const secret = generateBase32Secret();
    const setup = createSignedToken(
      c,
      { type: "admin_2fa_setup", sub: user.username, secret },
      SETUP_DURATION_SECONDS,
    );

    return {
      success: true,
      requires2faSetup: true,
      setupToken: setup.token,
      setupExpiresAt: setup.expiresAt,
      secret,
      otpauthUrl: createOtpAuthUrl(user.username, secret),
    };
  }

  if (!credentials.code) {
    return {
      success: true,
      requires2fa: true,
      username: user.username,
    };
  }

  if (!verifyTotp(user.totpSecret, credentials.code)) {
    return {
      success: false,
      status: 401,
      error: "Código 2FA inválido.",
    };
  }

  return { success: true, ...createAdminSession(c, user.username) };
}

export async function activateAdminTwoFactor(c, payload) {
  const setup = verifySignedToken(c, payload.setupToken, "admin_2fa_setup");

  if (!setup) {
    return {
      success: false,
      status: 401,
      error: "A configuracao do 2FA expirou. Entre novamente.",
    };
  }

  if (!verifyTotp(setup.secret, payload.code)) {
    return {
      success: false,
      status: 401,
      error: "Código 2FA inválido.",
    };
  }

  const data = await readUsersFile();
  const user = data.users.find((item) => item.username === setup.sub);

  if (!user) {
    return {
      success: false,
      status: 404,
      error: "Usuário não encontrado.",
    };
  }

  user.totpSecret = setup.secret;
  await writeUsersFile(data);

  return { success: true, ...createAdminSession(c, user.username) };
}
