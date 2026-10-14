import * as Location from 'expo-location';

import { formatAddress, mergePlaces, placeFromNominatim, type NominatimItem, type Place } from '@/logic/places';

/** Name and short address of a point, from Apple's reverse geocoder. */
export async function describePoint(lat: number, lng: number): Promise<{ name: string | null; address: string | null }> {
  try {
    const [a] = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
    if (!a) return { name: null, address: null };
    return {
      name: a.name,
      address: formatAddress({ name: a.name, streetNumber: a.streetNumber, street: a.street, city: a.city }),
    };
  } catch {
    return { name: null, address: null };
  }
}

/** Apple: best for street addresses. */
async function searchApple(query: string): Promise<Place[]> {
  try {
    const results = await Location.geocodeAsync(query);
    const places: Place[] = [];
    for (const r of results.slice(0, 3)) {
      const { name, address } = await describePoint(r.latitude, r.longitude);
      places.push({ name: name ?? query, address, lat: r.latitude, lng: r.longitude });
    }
    return places;
  } catch {
    return [];
  }
}

/** OpenStreetMap: knows gyms and other businesses by name. */
async function searchOpenStreetMap(query: string, near?: { lat: number; lng: number }): Promise<Place[]> {
  const params: Record<string, string> = {
    q: query,
    format: 'jsonv2',
    addressdetails: '1',
    limit: '6',
    'accept-language': 'fr',
  };
  if (near) {
    // Prefer results around the map, without excluding the rest.
    const d = 0.5;
    params.viewbox = [near.lng - d, near.lat + d, near.lng + d, near.lat - d].join(',');
  }
  const qs = Object.entries(params)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('&');
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/search?${qs}`, {
      // Nominatim's usage policy asks every app to identify itself.
      headers: { 'User-Agent': 'GymTrack/1.0 (application personnelle)' },
    });
    if (!res.ok) return [];
    return ((await res.json()) as NominatimItem[]).map(placeFromNominatim);
  } catch {
    return [];
  }
}

export async function searchPlaces(query: string, near?: { lat: number; lng: number }): Promise<Place[]> {
  const [osm, apple] = await Promise.all([searchOpenStreetMap(query, near), searchApple(query)]);
  return mergePlaces(osm, apple).slice(0, 6);
}
