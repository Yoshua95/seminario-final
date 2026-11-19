export type Place = { name: string; lat: number; lon: number };
// Approximate city centres, not geocoding or device/GPS positions.
const cities: Array<Place & { aliases: string[] }> = [
  { name: "Shenzhen", lat: 22.5, lon: 114.1, aliases: ["shenzhen"] },
  {
    name: "Guangzhou",
    lat: 23.1,
    lon: 113.3,
    aliases: ["guangzhou", "canton"],
  },
  { name: "Shanghai", lat: 31.2, lon: 121.5, aliases: ["shanghai", "shangai"] },
  { name: "Hong Kong", lat: 22.3, lon: 114.2, aliases: ["hong kong"] },
  {
    name: "Buenos Aires",
    lat: -34.6,
    lon: -58.4,
    aliases: ["buenos aires", "caba"],
  },
  { name: "Córdoba", lat: -31.4, lon: -64.2, aliases: ["cordoba"] },
  { name: "Miami", lat: 25.8, lon: -80.2, aliases: ["miami"] },
];
export function resolvePlace(text: string): Place | null {
  const value = text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  return cities.find((c) => c.aliases.some((a) => value.includes(a))) ?? null;
}
export function resolveRoute(route?: string) {
  const parts = route?.split("→") ?? [];
  if (parts.length !== 2) return null;
  const origin = resolvePlace(parts[0]),
    destination = resolvePlace(parts[1]);
  return origin && destination ? { origin, destination } : null;
}
export function homeAction(
  operation: { id: string; awardedAt?: string } | null,
  cargo: { id: string; createdAt?: string } | null,
) {
  if (
    cargo &&
    (!operation ||
      Date.parse(cargo.createdAt ?? "") > Date.parse(operation.awardedAt ?? ""))
  )
    return { label: "Comparar ofertas", kind: "offers" as const, id: cargo.id };
  if (operation)
    return {
      label: "Ver seguimiento",
      kind: "tracking" as const,
      id: operation.id,
    };
  if (cargo)
    return { label: "Comparar ofertas", kind: "offers" as const, id: cargo.id };
  return { label: "Publicar carga", kind: "publish" as const, id: null };
}
export const categories = [
  "Indumentaria y textiles",
  "Marroquinería",
  "Electrónica",
  "Hogar",
  "Repuestos",
  "Otro",
];
