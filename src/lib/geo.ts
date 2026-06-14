// Distanze geografiche (haversine) per stimare il costo di viaggio dai tornei.

export interface Coord {
  lat: number;
  lon: number;
}

/** Coordinate di riferimento delle citta FVG piu comuni. */
export const CITY_COORDS: Record<string, Coord> = {
  Udine: { lat: 46.0711, lon: 13.2346 },
  "Cividale del Friuli": { lat: 46.0938, lon: 13.4329 },
  Pordenone: { lat: 45.9564, lon: 12.6605 },
  Gorizia: { lat: 45.9417, lon: 13.6217 },
  Trieste: { lat: 45.6495, lon: 13.7768 },
  Tavagnacco: { lat: 46.1306, lon: 13.2 },
  Codroipo: { lat: 45.9636, lon: 12.9789 },
  Tolmezzo: { lat: 46.4019, lon: 13.0186 },
  Lignano: { lat: 45.6856, lon: 13.1247 },
  "Lignano Sabbiadoro": { lat: 45.6856, lon: 13.1247 },
  Monfalcone: { lat: 45.8056, lon: 13.5333 },
  "San Daniele del Friuli": { lat: 46.1581, lon: 13.0103 },
  Latisana: { lat: 45.7783, lon: 13.0036 },
  Manzano: { lat: 45.9939, lon: 13.3736 },
  Palmanova: { lat: 45.9056, lon: 13.3092 },
  Gemona: { lat: 46.2772, lon: 13.1389 },
  "Gemona del Friuli": { lat: 46.2772, lon: 13.1389 },
  Sacile: { lat: 45.9542, lon: 12.5028 },
  Cervignano: { lat: 45.8217, lon: 13.3306 },
  Pradamano: { lat: 46.0306, lon: 13.2939 },
};

export function haversineKm(a: Coord, b: Coord): number {
  const R = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/** Distanza in km da una citta di casa al torneo (per coordinate o per nome citta). */
export function distanceFromHome(
  homeCity: string,
  target: { lat?: number; lon?: number; city: string },
): number {
  const home = CITY_COORDS[homeCity];
  if (!home) return 0;
  const dest =
    target.lat != null && target.lon != null
      ? { lat: target.lat, lon: target.lon }
      : CITY_COORDS[target.city];
  if (!dest) return 0;
  return Math.round(haversineKm(home, dest));
}
