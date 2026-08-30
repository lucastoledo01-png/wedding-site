export function normalizeName(value = "") {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function nameTokens(value) {
  const normalized = normalizeName(value);
  return normalized ? normalized.split(" ") : [];
}

/**
 * Resolve a typed name to a single guest, tolerating case, accents and extra
 * whitespace (via normalizeName). Matching order:
 *
 *   1. Exact match on the normalized full name.
 *   2. Unambiguous partial match: the typed tokens are a subset of exactly one
 *      guest's tokens ("Vit\u00f3ria" -> "Vit\u00f3ria Casaloti"), or one guest's tokens
 *      are a subset of the typed name ("Vit\u00f3ria Casaloti Silva" -> "Vit\u00f3ria
 *      Casaloti"). If two or more guests qualify we return null so the caller
 *      shows "n\u00e3o encontrado" instead of ever confirming the wrong person.
 *
 * @param {string} name
 * @param {Array<{full_name: string}>} guests
 * @returns {object | null}
 */
export function matchGuestByName(name, guests = []) {
  const normalized = normalizeName(name);
  if (!normalized || !Array.isArray(guests) || guests.length === 0) return null;

  const exact = guests.find(
    (guest) => normalizeName(guest.full_name) === normalized,
  );
  if (exact) return exact;

  const typedTokens = normalized.split(" ");
  const typedSet = new Set(typedTokens);

  const partialMatches = guests.filter((guest) => {
    const guestTokens = nameTokens(guest.full_name);
    if (guestTokens.length === 0) return false;
    const guestSet = new Set(guestTokens);
    const typedInGuest = typedTokens.every((token) => guestSet.has(token));
    const guestInTyped = guestTokens.every((token) => typedSet.has(token));
    return typedInGuest || guestInTyped;
  });

  return partialMatches.length === 1 ? partialMatches[0] : null;
}

function levenshtein(a, b) {
  if (a === b) return 0;
  if (!a) return b.length;
  if (!b) return a.length;

  const previous = Array.from({ length: b.length + 1 }, (_, index) => index);
  const current = Array.from({ length: b.length + 1 }, () => 0);

  for (let i = 1; i <= a.length; i += 1) {
    current[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      current[j] = Math.min(
        current[j - 1] + 1,
        previous[j] + 1,
        previous[j - 1] + cost,
      );
    }
    previous.splice(0, previous.length, ...current);
  }

  return previous[b.length];
}

export function scoreNameMatch(input, candidate) {
  const typed = normalizeName(input);
  const official = normalizeName(candidate);
  if (!typed || !official) return 0;
  if (typed === official) return 1;
  if (official.includes(typed) || typed.includes(official)) return 0.9;

  const typedTokens = new Set(typed.split(" "));
  const officialTokens = official.split(" ");
  const tokenHits = officialTokens.filter((token) => typedTokens.has(token));
  const tokenScore = tokenHits.length / Math.max(officialTokens.length, 1);
  const distance = levenshtein(typed, official);
  const editScore = 1 - distance / Math.max(typed.length, official.length);

  return Math.max(editScore, tokenScore * 0.82);
}

export function findBestGuestMatch(input, guests, threshold = 0.72) {
  const ranked = guests
    .map((guest) => ({
      ...guest,
      matchScore: scoreNameMatch(input, guest.full_name),
    }))
    .sort((a, b) => b.matchScore - a.matchScore);

  const best = ranked[0];
  if (!best || best.matchScore < threshold) {
    return { best: null, suggestions: ranked.slice(0, 5) };
  }

  return { best, suggestions: ranked.slice(0, 5) };
}
