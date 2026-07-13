export function normalizeEventDatePart(value) {
  if (!value) return "";
  return String(value).split("T")[0];
}

export function normalizeEventTimePart(value) {
  if (!value) return "00:00:00";
  const parts = String(value).split(":");
  const hours = parts[0] || "00";
  const minutes = parts[1] || "00";
  const seconds = parts[2] || "00";
  return `${hours.padStart(2, "0")}:${minutes.padStart(2, "0")}:${seconds.padStart(2, "0")}`;
}

export function getEventDateTime(date, time = "12:00") {
  const datePart = normalizeEventDatePart(date);
  if (!datePart) return null;

  const parsed = new Date(`${datePart}T${normalizeEventTimePart(time)}-03:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export const formatEventDate = (isoString, format = "full") => {
  if (!isoString) return "";

  const date = getEventDateTime(isoString, "12:00");
  if (!date) return "";

  const options = {
    full: {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      timeZone: "America/Sao_Paulo",
    },
    short: {
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone: "America/Sao_Paulo",
    },
    time: {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: "America/Sao_Paulo",
    },
  };

  if (format === "time") {
    return date.toLocaleTimeString("pt-BR", options.time);
  }

  const formatted = date.toLocaleDateString("pt-BR", options[format] || options.full);
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
};
