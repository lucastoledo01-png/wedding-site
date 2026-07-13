function normalizeDatePart(date) {
  if (!date) return "2026-11-14";
  return String(date).split("T")[0];
}

function normalizeTimePart(time) {
  if (!time) return "20:00:00";
  const parts = String(time).split(":");
  const hours = parts[0] || "20";
  const minutes = parts[1] || "00";
  const seconds = parts[2] || "00";
  return `${hours.padStart(2, "0")}:${minutes.padStart(2, "0")}:${seconds.padStart(2, "0")}`;
}

export function getCountdownTimeLeft(date, time = "20:00") {
  const target = new Date(`${normalizeDatePart(date)}T${normalizeTimePart(time)}-03:00`).getTime();
  const difference = Number.isFinite(target) ? Math.max(target - Date.now(), 0) : 0;

  return {
    dias: Math.floor(difference / (1000 * 60 * 60 * 24)),
    horas: Math.floor((difference / (1000 * 60 * 60)) % 24),
    minutos: Math.floor((difference / (1000 * 60)) % 60),
    segundos: Math.floor((difference / 1000) % 60),
  };
}
