export const formatEventDate = (isoString, format = "full") => {
  const date = new Date(`${isoString}T12:00:00`);
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

  if (!isoString) return "";

  if (format === "time") {
    return date.toLocaleTimeString("pt-BR", options.time);
  }

  return date.toLocaleDateString("pt-BR", options[format] || options.full);
};
