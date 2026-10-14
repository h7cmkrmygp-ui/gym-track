export type Place = { name: string; address: string | null; lat: number; lng: number };

/** The parts of a reverse-geocoded address that make a short, readable line. */
export type AddressParts = {
  name: string | null;
  streetNumber: string | null;
  street: string | null;
  city: string | null;
};

/** One result of the OpenStreetMap Nominatim search API (format=jsonv2, addressdetails=1). */
export type NominatimItem = {
  lat: string;
  lon: string;
  name?: string;
  display_name: string;
  address?: Record<string, string | undefined>;
};

const EARTH_RADIUS_M = 6_371_000;
const toRad = (deg: number) => (deg * Math.PI) / 180;

/** Great-circle distance (haversine). */
export function distanceM(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h));
}

function joinAddress(number: string | null | undefined, street: string | null | undefined, city: string | null | undefined) {
  const line = number && street ? `${number} ${street}` : street;
  const parts = [line, city].filter(Boolean);
  return parts.length ? parts.join(', ') : null;
}

/** "1234 Bd Le Corbusier, Laval". */
export function formatAddress(parts: AddressParts | undefined): string | null {
  if (!parts) return null;
  return joinAddress(parts.streetNumber, parts.street ?? parts.name, parts.city);
}

export function placeFromNominatim(item: NominatimItem): Place {
  const segments = item.display_name.split(',').map((s) => s.trim());
  const a = item.address ?? {};
  const city = a.city ?? a.town ?? a.village ?? a.municipality;
  return {
    name: item.name?.trim() || segments[0],
    address: joinAddress(a.house_number, a.road, city) ?? (segments.slice(1, 3).join(', ') || null),
    lat: Number(item.lat),
    lng: Number(item.lon),
  };
}

/** Same place found by two services: keep the first one seen. */
const DUPLICATE_WITHIN_M = 75;

export function mergePlaces(...lists: Place[][]): Place[] {
  const kept: Place[] = [];
  for (const place of lists.flat()) {
    if (!kept.some((k) => distanceM(k, place) < DUPLICATE_WITHIN_M)) kept.push(place);
  }
  return kept;
}
