import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import goongjs, { type Map as GoongMap, type Marker } from '@goongmaps/goong-js';
import { Button } from '@/components/ui/button';
import { getDirections, getDirectionsCached } from '@/services/goongService';
import type {
  RescueOperationDetail,
  RescueRequestDetail,
  TeamLocationDto,
} from '@/services/rescueRequestService';
import type { TeamTrackingPoint } from '@/services/teamService';
import {
  createTeamMarkerElement,
  createVictimMarkerElement,
  decodePolyline,
  hasMeaningfulCoordinateShift,
  safeRemoveLayer,
  safeRemoveSource,
  trackingPointsToCoords,
} from './mapRouteUtils';

const OPERATION_STATUS_LABEL_MAP: Record<string, string> = {
  Pending: 'Chờ xử lý',
  Assigned: 'Đã phân công',
  EnRoute: 'Đang di chuyển',
  Rescuing: 'Đang cứu hộ',
  RescueCompleted: 'Hoàn thành',
  Returning: 'Đang về trạm',
  Closed: 'Đã đóng ca',
  Cancelled: 'Đã hủy',
};

export function MissionTrackingMapSection({
  detail,
  currentOperation,
  opStatus,
  showMap,
  isEnRoute,
  isRescuing,
  teamLocation,
  trackingPoints,
  isRecalculating,
  onRecalculateEta,
  goongMapKey,
  goongApiKey,
  formatDate,
}: {
  detail: RescueRequestDetail;
  currentOperation: RescueOperationDetail | null;
  opStatus?: string | null;
  showMap: boolean;
  isEnRoute: boolean;
  isRescuing: boolean;
  teamLocation: TeamLocationDto | null;
  trackingPoints: TeamTrackingPoint[];
  isRecalculating: boolean;
  onRecalculateEta: () => void;
  goongMapKey: string;
  goongApiKey: string;

  formatDate: (arg?: string | null) => string;
}) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<GoongMap | null>(null);
  const victimMarkerRef = useRef<Marker | null>(null);
  const teamMarkerRef = useRef<Marker | null>(null);
  const lastDrawnRouteRef = useRef<{ coords: Array<[number, number]>; dashed: boolean } | null>(
    null,
  );
  const pendingDrawRef = useRef<(() => void) | null>(null);
  const lastRouteFetchRef = useRef<{
    origin: { lat: number; lng: number };
    destination: { lat: number; lng: number };
  } | null>(null);
  const [routeSource, setRouteSource] = useState<string>('pending');

  // ── Stable coords — only recalculate when the actual numeric values change ─
  // Victim marker creation depends ONLY on victim coords, not the whole detail object
  const victimCoords = useMemo(() => {
    const lat = Number(detail?.latitude);
    const lng = Number(detail?.longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || (lat === 0 && lng === 0)) return null;
    return { lat, lng };
  }, [detail?.latitude, detail?.longitude]);

  const teamLat = teamLocation?.currentLatitude ?? detail?.assignedRescueTeam?.currentLatitude;
  const teamLng = teamLocation?.currentLongitude ?? detail?.assignedRescueTeam?.currentLongitude;

  const teamCoords = useMemo(() => {
    const lat = Number(teamLat);
    const lng = Number(teamLng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || (lat === 0 && lng === 0)) return null;
    return { lat, lng };
  }, [teamLat, teamLng]);

  // ── Stable popup HTML builders (metadata updates without recreating markers) ─
  const victimPopupHtml = useMemo(
    () =>
      `<div style="font-family:sans-serif;padding:2px 0;min-width:180px"><p style="font-weight:700;font-size:13px;margin:0 0 4px;color:#991b1b">Vị trí nạn nhân</p>${detail?.reporterFullName ? `<p style="font-size:12px;margin:0 0 2px;color:#374151"><strong>Người báo:</strong> ${detail.reporterFullName}</p>` : ''}${detail?.reporterPhone ? `<p style="font-size:12px;margin:0 0 2px;color:#374151"><strong>SĐT:</strong> ${detail.reporterPhone}</p>` : ''}${detail?.address ? `<p style="font-size:11px;color:#6b7280;margin:4px 0 0">${detail.address}</p>` : ''}</div>`,
    [detail?.reporterFullName, detail?.reporterPhone, detail?.address],
  );

  const teamPopupHtml = useMemo(
    () =>
      `<div style="font-family:sans-serif;padding:2px 0;min-width:160px"><p style="font-weight:700;font-size:13px;margin:0 0 4px;color:#1e40af">Đội cứu hộ</p>${currentOperation?.teamName ? `<p style="font-size:12px;color:#374151;margin:0 0 2px">${currentOperation.teamName}</p>` : ''}${currentOperation?.stationName ? `<p style="font-size:11px;color:#6b7280;margin:0 0 2px">Trạm: ${currentOperation.stationName}</p>` : ''}${opStatus ? `<p style="font-size:11px;color:#2563eb;font-weight:600;margin:4px 0 0">Trạng thái: ${OPERATION_STATUS_LABEL_MAP[opStatus] ?? opStatus}</p>` : ''}</div>`,
    [currentOperation?.teamName, currentOperation?.stationName, opStatus],
  );

  // ── routePolyline fallback from assignedRescueTeam ────────────────────────
  const assignedRoutePolyline = detail?.assignedRescueTeam?.routePolyline ?? null;
  const teamSource = teamLocation
    ? 'Thời gian thực'
    : detail?.assignedRescueTeam?.currentLatitude && detail?.assignedRescueTeam?.currentLongitude
      ? 'Từ dữ liệu đội'
      : 'Chưa có';

  // ── Reset map state when selected request changes ─────────────────────────
  const requestKey =
    (detail as any).requestId ??
    (detail as any).rescueRequestId ??
    `${detail.latitude}-${detail.longitude}`;

  useEffect(() => {
    const map = mapRef.current;

    // Remove victim marker
    victimMarkerRef.current?.remove();
    victimMarkerRef.current = null;

    // Remove team marker
    teamMarkerRef.current?.remove();
    teamMarkerRef.current = null;

    // Clear route data
    if (map) {
      const directionSource = (map as any).getSource('direction');
      if (directionSource) {
        directionSource.setData({
          type: 'Feature',
          properties: {},
          geometry: { type: 'LineString', coordinates: [] },
        });
      }

      // Clear tracking
      safeRemoveLayer(map, 'track-line');
      safeRemoveSource(map, 'track');
    }

    // Reset route refs
    lastDrawnRouteRef.current = null;
    lastRouteFetchRef.current = null;

    // Reset debug info
    setRouteSource('Đang tải');
  }, [requestKey]);

  const mapCallbackRef = useCallback(
    (node: HTMLDivElement | null) => {
      mapContainerRef.current = node;
      if (!node) {
        victimMarkerRef.current?.remove();
        teamMarkerRef.current?.remove();
        if (mapRef.current) {
          mapRef.current.remove();
          mapRef.current = null;
        }
        return;
      }
      if (!goongMapKey || mapRef.current) return;
      goongjs.accessToken = goongMapKey;
      mapRef.current = new goongjs.Map({
        container: node,
        style: 'https://tiles.goong.io/assets/goong_map_web.json',
        center: [108.2022, 16.0544],
        zoom: 5,
      });

      const map = mapRef.current as any;
      const handleStyleReady = () => {
        pendingDrawRef.current?.();
      };
      map.on('load', handleStyleReady);
    },
    [goongMapKey],
  );

  // ── Victim marker: only recreate when coords change ───────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (!victimCoords) {
      victimMarkerRef.current?.remove();
      victimMarkerRef.current = null;
      return;
    }

    if (!victimMarkerRef.current) {
      // Create marker for the first time (or after coord went null→valid)
      const el = createVictimMarkerElement('SOS');
      const victimPopup = new goongjs.Popup({ offset: [0, -56], closeButton: false }).setHTML(
        victimPopupHtml,
      );

      victimMarkerRef.current = new goongjs.Marker({ element: el })
        .setLngLat([victimCoords.lng, victimCoords.lat])
        .setPopup(victimPopup)
        .addTo(map);

      victimMarkerRef.current.togglePopup();
    } else {
      // Coords didn't change enough to recreate — just reposition (no-op if identical)
      victimMarkerRef.current.setLngLat([victimCoords.lng, victimCoords.lat]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [victimCoords]); // intentionally NOT including victimPopupHtml here

  // ── Victim popup content: update separately when metadata changes ─────────
  useEffect(() => {
    const marker = victimMarkerRef.current;
    if (!marker) return;
    const popup = marker.getPopup();
    if (popup) popup.setHTML(victimPopupHtml);
  }, [victimPopupHtml]);

  // ── Team marker: keep visible whenever teamCoords exist ───────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (!teamCoords) {
      // Do NOT remove the marker on transient null; only hide it if truly gone
      // This prevents the marker from flickering during detail refreshes
      return;
    }

    if (!teamMarkerRef.current) {
      const el = createTeamMarkerElement('Đội cứu hộ');
      const teamPopup = new goongjs.Popup({ offset: [0, -56], closeButton: false }).setHTML(
        teamPopupHtml,
      );

      teamMarkerRef.current = new goongjs.Marker({ element: el })
        .setLngLat([teamCoords.lng, teamCoords.lat])
        .setPopup(teamPopup)
        .addTo(map);
    } else {
      teamMarkerRef.current.setLngLat([teamCoords.lng, teamCoords.lat]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamCoords]); // intentionally NOT including teamPopupHtml here

  // ── Team popup content: update separately ────────────────────────────────
  useEffect(() => {
    const marker = teamMarkerRef.current;
    if (!marker) return;
    const popup = marker.getPopup();
    if (popup) popup.setHTML(teamPopupHtml);
  }, [teamPopupHtml]);

  // ── Tracking polyline ─────────────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const draw = () => {
      safeRemoveLayer(map, 'track-line');
      safeRemoveSource(map, 'track');
      if (trackingPoints.length < 2) return;

      const coords = trackingPointsToCoords(trackingPoints);
      (map as any).addSource('track', {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: {},
          geometry: { type: 'LineString', coordinates: coords },
        },
      });
      (map as any).addLayer({
        id: 'track-line',
        type: 'line',
        source: 'track',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: { 'line-color': '#22c55e', 'line-width': 4, 'line-opacity': 0.85 },
      });
    };

    if ((map as any).isStyleLoaded()) draw();
    else (map as any).once('load', draw);

    return () => {
      safeRemoveLayer(map, 'track-line');
      safeRemoveSource(map, 'track');
    };
  }, [trackingPoints]);

  // ── Direction route: API → routePolyline fallback → straight line ─────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !victimCoords) return;
    let cancelled = false;

    const drawLine = (coords: Array<[number, number]>, dashed: boolean) => {
      if (cancelled || !(map as any).isStyleLoaded()) return;

      const routeData = {
        type: 'Feature',
        properties: {},
        geometry: { type: 'LineString', coordinates: coords },
      };

      const existingSource = (map as any).getSource('direction');
      if (existingSource) {
        existingSource.setData(routeData);
      } else {
        (map as any).addSource('direction', {
          type: 'geojson',
          data: routeData,
        });
      }

      if (!(map as any).getLayer('direction-line')) {
        (map as any).addLayer({
          id: 'direction-line',
          type: 'line',
          source: 'direction',
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: {
            'line-color': '#2563eb',
            'line-width': 4,
            'line-opacity': 0.85,
          },
        });
      }

      (map as any).setPaintProperty('direction-line', 'line-dasharray', dashed ? [4, 3] : [1, 0]);
      lastDrawnRouteRef.current = { coords, dashed };
    };

    const last = lastRouteFetchRef.current;
    const canUseTeamCoords = Boolean(teamCoords);
    const destSame =
      canUseTeamCoords &&
      last &&
      Math.abs(last.destination.lat - victimCoords.lat) < 0.00001 &&
      Math.abs(last.destination.lng - victimCoords.lng) < 0.00001;
    const originNoise =
      canUseTeamCoords &&
      last &&
      !hasMeaningfulCoordinateShift(
        last.origin,
        teamCoords as { lat: number; lng: number },
        0.00036,
      );

    const straightLine: Array<[number, number]> = canUseTeamCoords
      ? [
          [
            (teamCoords as { lat: number; lng: number }).lng,
            (teamCoords as { lat: number; lng: number }).lat,
          ],
          [victimCoords.lng, victimCoords.lat],
        ]
      : [];

    const fitBoundsFor = (coords: Array<[number, number]>) => {
      const bounds = new goongjs.LngLatBounds();
      coords.forEach((coord) => bounds.extend(coord));
      (map as any).fitBounds(bounds, { padding: 80, maxZoom: 15, duration: 1200 });
    };

    if (destSame && originNoise) {
      if (lastDrawnRouteRef.current && (map as any).isStyleLoaded()) {
        drawLine(lastDrawnRouteRef.current.coords, lastDrawnRouteRef.current.dashed);
        fitBoundsFor(lastDrawnRouteRef.current.coords);
      }
      return;
    }

    const directionPromise =
      canUseTeamCoords && goongApiKey
        ? getDirectionsCached(
            teamCoords as { lat: number; lng: number },
            victimCoords,
            'car',
            goongApiKey,
          )
        : Promise.resolve(null);

    const drawRoute = async () => {
      setRouteSource('Đang tải');

      if (!(map as any).isStyleLoaded()) {
        pendingDrawRef.current = () => {
          void drawRoute();
        };
        return;
      }

      const direction = await directionPromise;
      if (cancelled) return;

      if ((!destSame || !originNoise) && canUseTeamCoords) {
        lastRouteFetchRef.current = {
          origin: teamCoords as { lat: number; lng: number },
          destination: victimCoords,
        };
      }

      let finalDirection = direction;
      if (!finalDirection && canUseTeamCoords && goongApiKey) {
        await new Promise((resolve) => setTimeout(resolve, 2500));
        if (cancelled) return;
        finalDirection = await getDirections(
          teamCoords as { lat: number; lng: number },
          victimCoords,
          'car',
          goongApiKey,
        );
      }

      const route = finalDirection?.routes?.[0];
      const overviewPoints = route?.overview_polyline?.points;
      const realCoords = overviewPoints ? decodePolyline(overviewPoints) : null;

      if (realCoords && realCoords.length >= 2) {
        drawLine(realCoords, false);
        fitBoundsFor(realCoords);
        setRouteSource('Goong API');
        return;
      }

      if (assignedRoutePolyline) {
        try {
          const fallbackCoords = decodePolyline(assignedRoutePolyline);
          if (fallbackCoords.length >= 2) {
            drawLine(fallbackCoords, false);
            fitBoundsFor(fallbackCoords);
            setRouteSource('Tuyến dự phòng');
            return;
          }
        } catch {
          void 0;
        }
      }

      if (straightLine.length >= 2) {
        drawLine(straightLine, true);
        fitBoundsFor(straightLine);
        setRouteSource('Đường thẳng');
        return;
      }

      const existingSource = (map as any).getSource('direction');
      if (existingSource) {
        existingSource.setData({
          type: 'Feature',
          properties: {},
          geometry: { type: 'LineString', coordinates: [] },
        });
      }
      setRouteSource('Thiếu tọa độ đội');
    };

    pendingDrawRef.current = () => {
      void drawRoute();
    };
    void drawRoute();

    return () => {
      cancelled = true;
    };
  }, [teamCoords, victimCoords, goongApiKey, assignedRoutePolyline]);

  // ── Ensure route source/layer exist when style loads ─────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const ensureRouteLayer = () => {
      if (!(map as any).isStyleLoaded()) return;

      const existingSource = (map as any).getSource('direction');
      if (!existingSource) {
        (map as any).addSource('direction', {
          type: 'geojson',
          data: {
            type: 'Feature',
            properties: {},
            geometry: { type: 'LineString', coordinates: [] },
          },
        });
      }

      if (!(map as any).getLayer('direction-line')) {
        (map as any).addLayer({
          id: 'direction-line',
          type: 'line',
          source: 'direction',
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: {
            'line-color': '#2563eb',
            'line-width': 4,
            'line-opacity': 0.85,
          },
        });
      }
    };

    if ((map as any).isStyleLoaded()) {
      ensureRouteLayer();
    } else {
      (map as any).once('load', ensureRouteLayer);
    }
  }, []);

  return (
    <div className="space-y-3">
      {!showMap && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 flex items-center gap-2">
          <span className="material-symbols-outlined text-amber-600">info</span>
          <span>
            Bản đồ đã sẵn sàng. Marker và route sẽ được cập nhật ngay khi có tọa độ hợp lệ.
          </span>
        </div>
      )}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-xs uppercase font-semibold text-muted-foreground tracking-wider flex items-center gap-1.5">
          <span className="material-symbols-outlined text-base text-blue-500">
            {isEnRoute ? 'directions_car' : 'local_fire_department'}
          </span>
          {isEnRoute ? 'Bản đồ realtime — Đội đang di chuyển' : 'Đội đang cứu hộ tại hiện trường'}
        </p>
        <div className="flex items-center gap-2">
          {isEnRoute && teamLocation && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              {formatDate(teamLocation.lastTrackedAt)}
            </div>
          )}
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5 text-xs"
            onClick={onRecalculateEta}
            disabled={isRecalculating}
          >
            <span className="material-symbols-outlined text-sm">calculate</span>
            {isRecalculating ? 'Đang tính...' : 'Tính lại ETA'}
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-[11px]">
        <span className="rounded-full border border-border bg-background px-2.5 py-1 text-muted-foreground">
          Nguồn tuyến: <span className="font-semibold text-foreground">{routeSource}</span>
        </span>
        <span className="rounded-full border border-border bg-background px-2.5 py-1 text-muted-foreground">
          Tọa độ đội: <span className="font-semibold text-foreground">{teamSource}</span>
        </span>
        <span className="rounded-full border border-border bg-background px-2.5 py-1 text-muted-foreground">
          Khóa API:{' '}
          <span className="font-semibold text-foreground">{goongApiKey ? 'Có' : 'Thiếu'}</span>
        </span>
      </div>

      {isEnRoute && teamLocation && (
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-lg bg-blue-50 border border-blue-200 p-2 text-center">
            <p className="text-[10px] text-blue-600 font-semibold uppercase">ETA</p>
            <p className="text-lg font-black text-blue-700">
              {teamLocation.estimatedMinutesToArrival ?? '--'}
              <span className="text-xs font-normal"> phút</span>
            </p>
          </div>
          <div className="rounded-lg bg-green-50 border border-green-200 p-2 text-center">
            <p className="text-[10px] text-green-600 font-semibold uppercase">Khoảng cách</p>
            <p className="text-lg font-black text-green-700">
              {teamLocation.distanceKmToVictim?.toFixed(1) ?? '--'}
              <span className="text-xs font-normal"> km</span>
            </p>
          </div>
          <div className="rounded-lg bg-purple-50 border border-purple-200 p-2 text-center">
            <p className="text-[10px] text-purple-600 font-semibold uppercase">Điểm GPS</p>
            <p className="text-lg font-black text-purple-700">{trackingPoints.length}</p>
          </div>
        </div>
      )}

      {isRescuing && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-orange-50 border border-orange-300">
          <span className="material-symbols-outlined text-orange-500 text-2xl">
            local_fire_department
          </span>
          <div>
            <p className="font-bold text-orange-800">Đội đang cứu hộ tại hiện trường</p>
            <p className="text-xs text-orange-600">Polling vị trí đã dừng.</p>
          </div>
        </div>
      )}

      {!goongMapKey ? (
        <div className="rounded-xl border border-border bg-accent/20 p-6 text-sm text-muted-foreground text-center">
          Thiếu <code className="font-mono bg-accent px-1 rounded">VITE_GOONG_MAP_KEY</code> để hiển
          thị bản đồ.
        </div>
      ) : (
        <div className="rounded-xl overflow-hidden border border-border shadow-sm">
          <div ref={mapCallbackRef} style={{ height: '380px', width: '100%' }} />
        </div>
      )}
    </div>
  );
}
