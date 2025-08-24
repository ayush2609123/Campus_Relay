export const fmtDateTime = (iso: string) =>
  new Intl.DateTimeFormat(undefined, {
    weekday: "short", month: "short", day: "2-digit",
    hour: "2-digit", minute: "2-digit"
  }).format(new Date(iso));
