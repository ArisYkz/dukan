/** Delivery carriers stored in stores.delivery_carriers (jsonb). */
export interface CarrierEntry {
  name: string;
  custom?: boolean;
}

/** Known BD carriers — informational only, extensible later. */
export const KNOWN_CARRIERS: string[] = [
  "Pathao",
  "Steadfast",
  "RedX",
  "Sundarban",
  "SA Paribahan",
];

export function normalizeCarriers(raw: unknown): CarrierEntry[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const out: CarrierEntry[] = [];
  for (const c of raw) {
    if (!c || typeof c !== "object") continue;
    const name = typeof (c as any).name === "string" ? (c as any).name.trim() : "";
    if (!name || seen.has(name)) continue;
    seen.add(name);
    out.push((c as any).custom ? { name, custom: true } : { name });
  }
  return out;
}
