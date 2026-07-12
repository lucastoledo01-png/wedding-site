const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

/**
 * Fetch all wishes for an invitation
 * @param {string} uid - Invitation UID
 * @param {object} options - Query options (limit, offset)
 * @returns {Promise<object>} Response with wishes data
 */
export async function fetchWishes(uid, options = {}) {
  const { limit = 50, offset = 0 } = options;
  const url = new URL(`${API_URL}/api/${uid}/wishes`);
  url.searchParams.set("limit", limit);
  url.searchParams.set("offset", offset);

  const response = await fetch(url);
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to fetch wishes");
  }
  return response.json();
}

/**
 * Create a new wish
 * @param {string} uid - Invitation UID
 * @param {object} wishData - Wish data (name, message, attendance)
 * @returns {Promise<object>} Response with created wish
 */
export async function createWish(uid, wishData) {
  const response = await fetch(`${API_URL}/api/${uid}/wishes`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(wishData),
  });

  const data = await response.json();

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
    `${API_URL}/api/${uid}/wishes/check/${encodeURIComponent(name)}`,
  );
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to check wish status");
  }
  return response.json();
}

/**
 * Delete a wish (admin function)
 * @param {string} uid - Invitation UID
 * @param {number} wishId - Wish ID to delete
 * @returns {Promise<object>} Response with deletion confirmation
 */
export async function deleteWish(uid, wishId) {
  const response = await fetch(`${API_URL}/api/${uid}/wishes/${wishId}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to delete wish");
  }
  return response.json();
}

/**
 * Get attendance statistics
 * @param {string} uid - Invitation UID
 * @returns {Promise<object>} Response with stats data
 */
export async function fetchAttendanceStats(uid) {
  const response = await fetch(`${API_URL}/api/${uid}/stats`);
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to fetch stats");
  }
  return response.json();
}

/**
 * Get invitation details
 * @param {string} uid - Invitation UID
 * @returns {Promise<object>} Response with invitation data
 */
export async function fetchInvitation(uid) {
  const response = await fetch(`${API_URL}/api/invitation/${uid}`);
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to fetch invitation");
  }
  return response.json();
}

export async function searchGuest(uid, name) {
  const url = new URL(`${API_URL}/api/${uid}/rsvp/search`);
  url.searchParams.set("name", name);
  const response = await fetch(url);
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Nao foi possivel buscar o convidado");
  return data;
}

export async function confirmPresence(uid, payload) {
  const response = await fetch(`${API_URL}/api/${uid}/rsvp/confirm`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await response.json();
  if (!response.ok) {
    const error = new Error(data.error || "Nao foi possivel confirmar presenca");
    error.suggestions = data.suggestions || [];
    throw error;
  }
  return data;
}

export async function fetchGiftProducts(uid) {
  const response = await fetch(`${API_URL}/api/${uid}/gifts`);
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Nao foi possivel carregar presentes");
  return data;
}

function adminHeaders(token, hasFormData = false) {
  return {
    ...(hasFormData ? {} : { "Content-Type": "application/json" }),
    "x-admin-session": token,
  };
}

export async function adminLogin(payload) {
  const response = await fetch(`${API_URL}/api/admin/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Nao foi possivel entrar no painel");
  return data;
}

export async function adminActivateTwoFactor(payload) {
  const response = await fetch(`${API_URL}/api/admin/auth/activate-2fa`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Nao foi possivel ativar o 2FA");
  return data;
}

export async function adminRequest(path, token, options = {}) {
  const hasFormData =
    typeof FormData !== "undefined" && options.body instanceof FormData;
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      ...adminHeaders(token, hasFormData),
      ...(options.headers || {}),
    },
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Erro administrativo");
  return data;
}
