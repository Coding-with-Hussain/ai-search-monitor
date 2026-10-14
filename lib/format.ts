const dateFmt = new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });
const shortDateFmt = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
const dateTimeFmt = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
  timeZone: "UTC",
});

type DateInput = Date | string | number | null | undefined;

function toDate(d: DateInput): Date | null {
  if (d === null || d === undefined) return null;
  const date = d instanceof Date ? d : new Date(d);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatDate(d: DateInput, fallback = "—") {
  const date = toDate(d);
  return date ? dateFmt.format(date) : fallback;
}

export function formatShortDate(d: DateInput, fallback = "—") {
  const date = toDate(d);
  return date ? shortDateFmt.format(date) : fallback;
}

export function formatDateTime(d: DateInput, fallback = "—") {
  const date = toDate(d);
  return date ? `${dateTimeFmt.format(date)} UTC` : fallback;
}

export function formatRelative(d: DateInput, now = Date.now()) {
  const date = toDate(d);
  if (!date) return "—";
  const diff = date.getTime() - now;
  const abs = Math.abs(diff);
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  if (abs < 60_000) return "just now";
  if (abs < 3_600_000) return rtf.format(Math.round(diff / 60_000), "minute");
  if (abs < 86_400_000) return rtf.format(Math.round(diff / 3_600_000), "hour");
  if (abs < 30 * 86_400_000) return rtf.format(Math.round(diff / 86_400_000), "day");
  return formatDate(date);
}

export function formatScore(n: number | null | undefined) {
  return n === null || n === undefined ? "—" : `${Math.round(n)}`;
}

export function formatPercent(n: number | null | undefined, digits = 0) {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  return `${n.toFixed(digits)}%`;
}

export function formatPosition(n: number | null | undefined) {
  return n === null || n === undefined ? "—" : n.toFixed(1);
}

export function formatDelta(n: number | null | undefined, suffix = "") {
  if (n === null || n === undefined || Number.isNaN(n)) return null;
  const rounded = Math.round(n * 10) / 10;
  return `${rounded > 0 ? "+" : rounded < 0 ? "−" : "±"}${Math.abs(rounded)}${suffix}`;
}

export function formatCurrency(n: number, digits = 0) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: digits, minimumFractionDigits: digits }).format(n);
}

export function formatNumber(n: number) {
  return new Intl.NumberFormat("en-US").format(n);
}

export function pluralize(n: number, singular: string, plural = `${singular}s`) {
  return `${formatNumber(n)} ${n === 1 ? singular : plural}`;
}

/** Whole days from now until `date` (never negative). */
export function daysUntil(date: Date | null | undefined, now = Date.now()) {
  if (!date) return null;
  return Math.max(0, Math.ceil((date.getTime() - now) / 86_400_000));
}
