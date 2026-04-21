import type { TeamTrackingPoint } from '@/services/teamService';

export type RouteCoordinate = [number, number];
export type SimpleCoordinate = { lat: number; lng: number };

export function decodePolyline(encoded: string): RouteCoordinate[] {
  const coordinates: RouteCoordinate[] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let b: number;
    let shift = 0;
    let result = 0;

    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);

    lat += (result & 1) !== 0 ? ~(result >> 1) : result >> 1;

    shift = 0;
    result = 0;

    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);

    lng += (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
    coordinates.push([lng / 1e5, lat / 1e5]);
  }

  return coordinates;
}

export function safeRemoveLayer(map: any, id: string) {
  try {
    if (map.getLayer(id)) map.removeLayer(id);
  } catch (_error) {
    void _error;
  }
}

export function safeRemoveSource(map: any, id: string) {
  try {
    if (map.getSource(id)) map.removeSource(id);
  } catch (_error) {
    void _error;
  }
}

export function hasMeaningfulCoordinateShift(
  previous: SimpleCoordinate | null | undefined,
  next: SimpleCoordinate | null | undefined,
  thresholdDegrees = 0.00036,
) {
  if (!previous || !next) return true;

  return (
    Math.abs(previous.lat - next.lat) >= thresholdDegrees ||
    Math.abs(previous.lng - next.lng) >= thresholdDegrees
  );
}

export function buildCirclePolygon(lat: number, lng: number, radiusKm: number, points = 72) {
  const ring: number[][] = [];
  const latRadius = radiusKm / 111;
  const lngRadius = radiusKm / (111 * Math.cos((lat * Math.PI) / 180));

  for (let i = 0; i <= points; i += 1) {
    const angle = (2 * Math.PI * i) / points;
    ring.push([lng + lngRadius * Math.cos(angle), lat + latRadius * Math.sin(angle)]);
  }

  return ring;
}

export function trackingPointsToCoords(points: TeamTrackingPoint[]): RouteCoordinate[] {
  return points.map((point) => [point.longitude, point.latitude]);
}

export function normalizeRouteCoords(coords: RouteCoordinate[]): RouteCoordinate[] {
  return coords
    .map(([a, b]) => {
      const x = Number(a);
      const y = Number(b);
      if (!Number.isFinite(x) || !Number.isFinite(y)) return null;

      // Normal case: [lng, lat]
      if (Math.abs(x) <= 180 && Math.abs(y) <= 90) return [x, y] as RouteCoordinate;

      // Swapped input: [lat, lng]
      if (Math.abs(x) <= 90 && Math.abs(y) <= 180) return [y, x] as RouteCoordinate;

      return null;
    })
    .filter(Boolean) as RouteCoordinate[];
}

export function createVictimMarkerElement(label = 'SOS') {
  const el = document.createElement('div');
  el.style.cssText = 'cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:3px';
  el.innerHTML = `
    <div style="position:relative;width:46px;height:46px;display:flex;align-items:center;justify-content:center">
      <div style="position:absolute;inset:0;border-radius:50%;background:rgba(239,68,68,0.18);animation:victim-ring 1.8s ease-out infinite"></div>
      <style>@keyframes victim-ring{0%{transform:scale(1);opacity:0.6}100%{transform:scale(2.2);opacity:0}}</style>
      <div style="position:relative;z-index:1;background:linear-gradient(135deg,#dc2626,#ef4444);width:40px;height:40px;border-radius:50%;border:3px solid white;box-shadow:0 3px 10px rgba(239,68,68,0.5);display:flex;align-items:center;justify-content:center">
        <span class="material-symbols-outlined" style="color:white;font-size:22px;font-variation-settings:'FILL' 1;">person_alert</span>
      </div>
    </div>
    <div style="background:#dc2626;color:white;font-size:10px;font-weight:800;padding:2px 9px;border-radius:9999px;white-space:nowrap;box-shadow:0 1px 4px rgba(220,38,38,0.4);letter-spacing:0.04em;">${label}</div>
  `;
  return el;
}

export function createTeamMarkerElement(label = 'Đội cứu hộ') {
  const el = document.createElement('div');
  el.style.cssText = 'cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:3px';
  el.innerHTML = `
    <div style="position:relative;width:46px;height:46px;display:flex;align-items:center;justify-content:center">
      <div style="position:absolute;inset:0;border-radius:50%;background:rgba(37,99,235,0.2);animation:team-ring 1.6s ease-out infinite"></div>
      <style>@keyframes team-ring{0%{transform:scale(1);opacity:0.6}100%{transform:scale(2.2);opacity:0}}@keyframes team-pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.1)}}</style>
      <div style="position:relative;z-index:1;background:linear-gradient(135deg,#1d4ed8,#2563eb);width:40px;height:40px;border-radius:50%;border:3px solid white;box-shadow:0 3px 10px rgba(37,99,235,0.55);display:flex;align-items:center;justify-content:center;animation:team-pulse 2s ease-in-out infinite">
        <span class="material-symbols-outlined" style="color:white;font-size:20px;font-variation-settings:'FILL' 1;">local_shipping</span>
      </div>
    </div>
    <div style="background:#1e3a8a;color:white;font-size:10px;font-weight:700;padding:2px 8px;border-radius:9999px;white-space:nowrap;box-shadow:0 1px 4px rgba(30,58,138,0.35);">${label}</div>
  `;
  return el;
}

export function createStationMarkerElement(label = 'Trụ sở') {
  const el = document.createElement('div');
  el.style.cssText = 'cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:3px';
  el.innerHTML = `
    <div style="position:relative;width:46px;height:46px;display:flex;align-items:center;justify-content:center">
      <div style="position:absolute;inset:0;border-radius:50%;background:rgba(109,40,217,0.12)"></div>
      <div style="position:relative;z-index:1;background:linear-gradient(135deg,#6d28d9,#7c3aed);width:40px;height:40px;border-radius:50%;border:3px solid white;box-shadow:0 3px 10px rgba(109,40,217,0.5);display:flex;align-items:center;justify-content:center">
        <span class="material-symbols-outlined" style="color:white;font-size:22px;font-variation-settings:'FILL' 1;">apartment</span>
      </div>
    </div>
    <div style="background:#6d28d9;color:white;font-size:10px;font-weight:700;padding:2px 8px;border-radius:9999px;white-space:nowrap;box-shadow:0 1px 4px rgba(109,40,217,0.35);">${label}</div>
  `;
  return el;
}
