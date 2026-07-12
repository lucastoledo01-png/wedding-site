export function normalizeName(value = "") {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
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
