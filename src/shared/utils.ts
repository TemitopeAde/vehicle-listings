import type { Vehicle } from "./schemas";
export function slugify(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
export const vehicleDetailsPath = "/vehicles-detail";
export function vehicleDetailsUrl(slug: string, page = vehicleDetailsPath) {
  return `${page}?slug=${encodeURIComponent(slug)}`;
}
export function money(value: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}
export const available = (v: Vehicle) =>
  ["published", "reserved", "sold"].includes(v.status) &&
  !v.demo &&
  (!v.expiresAt || Date.parse(v.expiresAt) > Date.now());
export function payment(
  price: number,
  deposit: number,
  annualRate: number,
  months: number,
) {
  const principal = Math.max(0, price - deposit),
    rate = annualRate / 1200;
  return months > 0
    ? rate
      ? (principal * rate) / (1 - (1 + rate) ** -months)
      : principal / months
    : 0;
}
export const transitions: Record<Vehicle["status"], Vehicle["status"][]> = {
  draft: ["published", "archived", "deleted"],
  published: ["draft", "reserved", "sold", "archived"],
  reserved: ["published", "sold", "archived"],
  sold: ["published", "archived"],
  archived: ["draft", "deleted"],
  deleted: ["draft"],
};
export function csvCell(value: unknown) {
  const raw = String(value ?? "");
  const safe = /^[=+@\-\t\r]/.test(raw) ? `'${raw}` : raw;
  return `"${safe.replace(/"/g, '""')}"`;
}
/** Page numbers to show around the current page; `null` marks a collapsed gap. */
export function pageWindow(current: number, total: number, around = 1) {
  const pages: (number | null)[] = [];
  for (let page = 1; page <= total; page++) {
    if (page === 1 || page === total || Math.abs(page - current) <= around)
      pages.push(page);
    else if (pages.at(-1) !== null) pages.push(null);
  }
  return pages;
}
