/** BCP 47 locale for Nigeria (English). */
export const LOCALE_NG = "en-NG" as const;

/** IANA timezone for West Africa Time (Lagos). */
export const TIMEZONE_WAT = "Africa/Lagos" as const;

/** Format a Date in West Africa Time. */
export function formatInWat(
  date: Date,
  options: Intl.DateTimeFormatOptions = {
    dateStyle: "medium",
    timeStyle: "short",
  },
): string {
  return new Intl.DateTimeFormat(LOCALE_NG, {
    ...options,
    timeZone: TIMEZONE_WAT,
  }).format(date);
}

/** Current instant as ISO string (UTC), useful for APIs. */
export function nowIso(): string {
  return new Date().toISOString();
}

/** Wall-clock parts in WAT for a given date. */
export function getWatParts(date: Date = new Date()): {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
} {
  const parts = new Intl.DateTimeFormat(LOCALE_NG, {
    timeZone: TIMEZONE_WAT,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const get = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((p) => p.type === type)?.value ?? 0);

  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    hour: get("hour"),
    minute: get("minute"),
    second: get("second"),
  };
}
