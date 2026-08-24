// Haversine great-circle distance — accurate enough at delivery-verification
// scale (tens of meters to a few km) without pulling in a maps SDK call.
export function distanceMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371000; // Earth radius, meters
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)}m`;
  return `${(meters / 1000).toFixed(1)}km`;
}

interface LatLng {
  lat: number;
  lng: number;
}

// Perpendicular distance from a point to one segment of the route, via a
// flat-plane projection (longitude scaled by cos(latitude) so a degree of
// lng and a degree of lat are comparable) — fine at the few-km scale a
// single delivery route spans, same trade-off distanceMeters already makes
// by using a spherical (not ellipsoidal) Earth model.
function distanceToSegmentMeters(p: LatLng, a: LatLng, b: LatLng): number {
  const cosLat = Math.cos((a.lat * Math.PI) / 180);
  const toXY = (pt: LatLng) => ({ x: pt.lng * cosLat, y: pt.lat });
  const A = toXY(a);
  const B = toXY(b);
  const P = toXY(p);

  const ABx = B.x - A.x;
  const ABy = B.y - A.y;
  const lenSq = ABx * ABx + ABy * ABy;
  let t = lenSq === 0 ? 0 : ((P.x - A.x) * ABx + (P.y - A.y) * ABy) / lenSq;
  t = Math.max(0, Math.min(1, t));

  const closest = { lat: a.lat + t * (b.lat - a.lat), lng: a.lng + t * (b.lng - a.lng) };
  return distanceMeters(p.lat, p.lng, closest.lat, closest.lng);
}

// How far a point sits from the *nearest point on any segment* of a route
// polyline — the real primitive "is this courier still on their planned
// road route" needs, as opposed to distance-to-destination (which stays
// small even for a courier who took a completely wrong road, right up
// until the last few hundred meters).
export function distanceToPolylineMeters(point: LatLng, path: LatLng[]): number {
  if (path.length === 0) return Infinity;
  if (path.length === 1) return distanceMeters(point.lat, point.lng, path[0].lat, path[0].lng);
  let min = Infinity;
  for (let i = 0; i < path.length - 1; i++) {
    const d = distanceToSegmentMeters(point, path[i], path[i + 1]);
    if (d < min) min = d;
  }
  return min;
}
