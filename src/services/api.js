const API_URL =
  import.meta.env.VITE_API_URL ||
  (import.meta.env.DEV ? "http://localhost:3000" : "");

function apiUrl(path) {
  if (API_URL) return `${API_URL}${path}`;
  return path;
}

function apiUrlObject(path) {
  const url = apiUrl(path);
  return new URL(
    url,
    typeof window !== "undefined" ? window.location.origin : "http://localhost",
  );
}

async function readJsonResponse(response) {
  try {
    return await response.json();
  } catch {
    return {};
  }
}

/**
 * Fetch all wishes for an invitation
 * @param {string} uid - Invitation UID
 * @param {object} options - Query options (limit, offset)
 * @returns {Promise<object>} Response with wishes data
 */
export async function fetchWishes(uid, options = {}) {
  const { limit = 50, offset = 0 } = options;
  const url = apiUrlObject(`/api/${uid}/wishes`);
  url.searchParams.set("limit", limit);
  url.searchParams.set("offset", offset);

  const response = await fetch(url);
  if (!response.ok) {
    const error = await readJsonResponse(response);
    throw new Error(error.error || "Failed to fetch wishes");
  }
  return readJsonResponse(response);
}

/**
 * Create a new wish
 * @param {string} uid - Invitation UID
 * @param {object} wishData - Wish data (name, message, attendance)
 * @returns {Promise<object>} Response with created wish
 */
export async function createWish(uid, wishData) {
  const response = await fetch(apiUrl(`/api/${uid}/wishes`), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(wishData),
  });

  const data = await readJsonResponse(response);

  if (!response.ok) {
    // Preserve error code for duplicate wish detection
    const error = new Error(data.error || "Failed to create wish");
    error.code = data.code;
    throw error;
  }
  return data;
}

/**
 * Check if guest has already submitted a wish
 * @param {string} uid - Invitation UID
 * @param {string} name - Guest name
 * @returns {Promise<object>} Response with hasSubmitted boolean
 */
export async function checkWishSubmitted(uid, name) {
  const response = await fetch(
    apiUrl(`/api/${uid}/wishes/check/${encodeURIComponent(name)}`),
  );
  if (!response.ok) {
    const error = await readJsonResponse(response);
    throw new Error(error.error || "Failed to check wish status");
  }
  return readJsonResponse(response);
}

/**
 * Delete a wish (admin function)
 * @param {string} uid - Invitation UID
 * @param {number} wishId - Wish ID to delete
 * @returns {Promise<object>} Response with deletion confirmation
 */
export async function deleteWish(uid, wishId) {
  const response = await fetch(apiUrl(`/api/${uid}/wishes/${wishId}`), {
    method: "DELETE",
  });

  if (!response.ok) {
    const error = await readJsonResponse(response);
    throw new Error(error.error || "Failed to delete wish");
  }
  return readJsonResponse(response);
}

/**
 * Get attendance statistics
 * @param {string} uid - Invitation UID
 * @returns {Promise<object>} Response with stats data
 */
export async function fetchAttendanceStats(uid) {
  const response = await fetch(apiUrl(`/api/${uid}/stats`));
  if (!response.ok) {
    const error = await readJsonResponse(response);
    throw new Error(error.error || "Failed to fetch stats");
  }
  return readJsonResponse(response);
}

/**
 * Get invitation details
 * @param {string} uid - Invitation UID
 * @returns {Promise<object>} Response with invitation data
 */
export async function fetchInvitation(uid) {
  const response = await fetch(apiUrl(`/api/invitation/${uid}`));
  if (!response.ok) {
    const error = await readJsonResponse(response);
    throw new Error(error.error || "Failed to fetch invitation");
  }
  return readJsonResponse(response);
}

export async function searchGuest(uid, name) {
  const url = apiUrlObject(`/api/${uid}/rsvp/search`);
  url.searchParams.set("name", name);
  const response = await fetch(url);
  const data = await readJsonResponse(response);
  if (!response.ok) throw new Error(data.error || "Não foi possível buscar o convidado");
  return data;
}

export async function confirmPresence(uid, payload) {
  const response = await fetch(apiUrl(`/api/${uid}/rsvp/confirm`), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await readJsonResponse(response);
  if (!response.ok) {
    const error = new Error(data.error || "Não foi possível confirmar presença");
    error.suggestions = data.suggestions || [];
    throw error;
  }
  return data;
}

export async function fetchGiftProducts(uid) {
  const response = await fetch(apiUrl(`/api/${uid}/gifts`));
  const data = await readJsonResponse(response);
  if (!response.ok) throw new Error(data.error || "Não foi possível carregar presentes");
  return data;
}

function adminHeaders(token, hasFormData = false) {
  return {
    ...(hasFormData ? {} : { "Content-Type": "application/json" }),
    "x-admin-session": token,
  };
}

export async function adminLogin(payload) {
  const response = await fetch(apiUrl("/api/admin/auth/login"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await readJsonResponse(response);
  if (!response.ok) throw new Error(data.error || "Não foi possível entrar no painel");
  return data;
}

export async function adminActivateTwoFactor(payload) {
  const response = await fetch(apiUrl("/api/admin/auth/activate-2fa"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await readJsonResponse(response);
  if (!response.ok) throw new Error(data.error || "Não foi possível ativar o 2FA");
  return data;
}

export async function adminRequest(path, token, options = {}) {
  const hasFormData =
    typeof FormData !== "undefined" && options.body instanceof FormData;
  const response = await fetch(apiUrl(path), {
    ...options,
    headers: {
      ...adminHeaders(token, hasFormData),
      ...(options.headers || {}),
    },
  });
  const data = await readJsonResponse(response);
  if (!response.ok) throw new Error(data.error || "Erro administrativo");
  return data;
}
