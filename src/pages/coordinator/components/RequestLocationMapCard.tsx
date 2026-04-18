import { useCallback, useEffect, useRef, useState } from 'react';
import goongjs, { type Map as GoongMap, type Marker } from '@goongmaps/goong-js';
import { getDirectionsCached } from '@/services/goongService';
import type { RescueRequestItem } from '@/services/rescueRequestService';
import {
  buildCirclePolygon,
  createStationMarkerElement,
  createVictimMarkerElement,
  decodePolyline,
  safeRemoveLayer,
  safeRemoveSource,
} from './mapRouteUtils';

const ROUTE_SOURCE_ID = 'request-route-source';
const ROUTE_LAYER_ID = 'request-route-layer';
const COVERAGE_SOURCE_ID = 'station-coverage-source';
const COVERAGE_FILL_LAYER_ID = 'station-coverage-fill';
const COVERAGE_OUTLINE_LAYER_ID = 'station-coverage-outline';

export function RequestLocationMapCard({
  selected,
  station,
  stationCoordinates,
  selectedCoordinates,
  coverageRadiusKm,
  goongMapKey,
  goongApiKey,
}: {
  selected: RescueRequestItem;
  station: any;
  stationCoordinates: { lat: number; lng: number } | null;
  selectedCoordinates: { lat: number; lng: number } | null;
  coverageRadiusKm: number | null;
  goongMapKey: string;
  goongApiKey: string;
}) {
  const requestMapContainerRef = useRef<HTMLDivElement | null>(null);
  const requestMapRef = useRef<GoongMap | null>(null);
  const requestMarkerRef = useRef<Marker | null>(null);
  const stationMarkerRef = useRef<Marker | null>(null);
  const [mapReady, setMapReady] = useState(false);

  const requestMapCallbackRef = useCallback(
    (node: HTMLDivElement | null) => {
      requestMapContainerRef.current = node;
      if (!node) {
        requestMarkerRef.current?.remove();
        stationMarkerRef.current?.remove();
        setMapReady(false);
        requestMapRef.current?.remove();
        requestMapRef.current = null;
        return;
      }
      if (!goongMapKey || requestMapRef.current) return;
      goongjs.accessToken = goongMapKey;
      requestMapRef.current = new goongjs.Map({
        container: node,
        style: 'https://tiles.goong.io/assets/goong_map_web.json',
        center: [108.2022, 16.0544],
        zoom: 5,
      });

      const map = requestMapRef.current as any;
      const handleMissingImage = (e: any) => {
        if (!e?.id || map.hasImage?.(e.id)) return;
        const bytes = new Uint8Array([0, 0, 0, 0]);
        map.addImage(e.id, { width: 1, height: 1, data: bytes });
      };
      const handleStyleReady = () => {
        setMapReady(true);
      };
      map.on('styleimagemissing', handleMissingImage);
      map.on('load', handleStyleReady);
    },
    [goongMapKey],
  );

  const selectedKey =
    (selected as any)?.requestId ??
    (selected as any)?.rescueRequestId ??
    `${selected?.latitude}-${selected?.longitude}`;

  useEffect(() => {
    const map = requestMapRef.current;
    requestMarkerRef.current?.remove();
    requestMarkerRef.current = null;

    safeRemoveLayer(map, ROUTE_LAYER_ID);
    safeRemoveSource(map, ROUTE_SOURCE_ID);
  }, [selectedKey]);

  useEffect(() => {
    const map = requestMapRef.current;
    if (!map || !mapReady) return;

    if (stationMarkerRef.current) {
      stationMarkerRef.current.remove();
      stationMarkerRef.current = null;
    }

    if (!stationCoordinates) return;

    const stationMarkerElement = createStationMarkerElement('Trụ sở');

    const stationPopup = new goongjs.Popup({ offset: [0, -56], closeButton: false }).setHTML(
      `<div style="font-family:sans-serif;padding:2px 0;min-width:160px"><p style="font-weight:700;font-size:13px;margin:0 0 3px;color:#4c1d95">Trạm cứu hộ</p>${station?.name ? `<p style="font-size:12px;color:#374151;margin:0 0 2px">${station.name}</p>` : ''}${coverageRadiusKm ? `<p style="font-size:11px;color:#7c3aed;margin:4px 0 0">Bán kính phủ sóng: <strong>${coverageRadiusKm} km</strong></p>` : ''}</div>`,
    );

    stationMarkerRef.current = new goongjs.Marker({ element: stationMarkerElement })
      .setLngLat([stationCoordinates.lng, stationCoordinates.lat])
      .setPopup(stationPopup)
      .addTo(map);
  }, [stationCoordinates, station, coverageRadiusKm, mapReady]);

  useEffect(() => {
    const map = requestMapRef.current;
    if (!map) return;

    const drawCoverage = () => {
      safeRemoveLayer(map, COVERAGE_FILL_LAYER_ID);
      safeRemoveLayer(map, COVERAGE_OUTLINE_LAYER_ID);
      safeRemoveSource(map, COVERAGE_SOURCE_ID);

      if (!stationCoordinates || !coverageRadiusKm) return;

      const circleRing = buildCirclePolygon(
        stationCoordinates.lat,
        stationCoordinates.lng,
        coverageRadiusKm,
      );

      (map as any).addSource(COVERAGE_SOURCE_ID, {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: { radiusKm: coverageRadiusKm },
          geometry: { type: 'Polygon', coordinates: [circleRing] },
        },
      });

      (map as any).addLayer({
        id: COVERAGE_FILL_LAYER_ID,
        type: 'fill',
        source: COVERAGE_SOURCE_ID,
        paint: {
          'fill-color': '#a78bfa',
          'fill-opacity': 0.16,
        },
      });

      (map as any).addLayer({
        id: COVERAGE_OUTLINE_LAYER_ID,
        type: 'line',
        source: COVERAGE_SOURCE_ID,
        paint: {
          'line-color': '#7c3aed',
          'line-width': 2,
          'line-dasharray': [2, 1],
        },
      });
    };

    if ((map as any).isStyleLoaded()) {
      drawCoverage();
      return;
    }

    map.on('load', drawCoverage);
    return () => {
      map.off('load', drawCoverage);
    };
  }, [stationCoordinates, coverageRadiusKm, mapReady]);

  useEffect(() => {
    const map = requestMapRef.current;
    if (!map || !mapReady) return;

    if (requestMarkerRef.current) {
      requestMarkerRef.current.remove();
      requestMarkerRef.current = null;
    }

    if (!selectedCoordinates) return;

    const markerElement = createVictimMarkerElement('SOS');

    const popup = new goongjs.Popup({ offset: [0, -56], closeButton: false }).setHTML(
      `<div style="font-family:sans-serif;padding:2px 0;min-width:180px"><p style="font-weight:700;font-size:13px;margin:0 0 4px;color:#991b1b">Vị trí yêu cầu cứu hộ</p>${selected?.reporterFullName ? `<p style="font-size:12px;color:#374151;margin:0 0 2px"><strong>Người báo:</strong> ${selected.reporterFullName}</p>` : ''}${selected?.reporterPhone ? `<p style="font-size:12px;color:#374151;margin:0 0 2px"><strong>SĐT:</strong> ${selected.reporterPhone}</p>` : ''}${selected?.address ? `<p style="font-size:11px;color:#6b7280;margin:4px 0 0">${selected.address}</p>` : ''}${selected?.disasterType ? `<p style="font-size:11px;color:#ef4444;font-weight:600;margin:4px 0 0">Loại: ${selected.disasterType}</p>` : ''}</div>`,
    );

    requestMarkerRef.current = new goongjs.Marker({ element: markerElement })
      .setLngLat([selectedCoordinates.lng, selectedCoordinates.lat])
      .setPopup(popup)
      .addTo(map);

    requestMarkerRef.current.togglePopup();

    (map as any).flyTo({
      center: [selectedCoordinates.lng, selectedCoordinates.lat],
      zoom: 14,
      speed: 2.5,
      curve: 1,
    });
  }, [selectedCoordinates, selected, mapReady]);

  useEffect(() => {
    const map = requestMapRef.current;
    if (!map || !mapReady || !stationCoordinates || !selectedCoordinates) return;

    let cancelled = false;

    const drawLine = (coords: Array<[number, number]>, dashed: boolean) => {
      const routeData = {
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'LineString',
          coordinates: coords,
        },
      };

      const existingSource = (map as any).getSource(ROUTE_SOURCE_ID);
      if (existingSource) {
        existingSource.setData(routeData);
      } else {
        (map as any).addSource(ROUTE_SOURCE_ID, {
          type: 'geojson',
          data: routeData,
        });
      }

      if (!(map as any).getLayer(ROUTE_LAYER_ID)) {
        (map as any).addLayer({
          id: ROUTE_LAYER_ID,
          type: 'line',
          source: ROUTE_SOURCE_ID,
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: {
            'line-color': '#2563eb',
            'line-width': 4,
            'line-opacity': 0.85,
          },
        });
      }

      (map as any).setPaintProperty(ROUTE_LAYER_ID, 'line-dasharray', dashed ? [4, 3] : [1, 0]);
    };

    const fitBoundsFor = (coords: Array<[number, number]>) => {
      const bounds = new goongjs.LngLatBounds();
      bounds.extend([stationCoordinates.lng, stationCoordinates.lat]);
      bounds.extend([selectedCoordinates.lng, selectedCoordinates.lat]);
      coords.forEach((coord) => bounds.extend(coord));
      (map as any).fitBounds(bounds, { padding: 50, maxZoom: 14, duration: 700 });
    };

    const fallbackCoords: Array<[number, number]> = [
      [stationCoordinates.lng, stationCoordinates.lat],
      [selectedCoordinates.lng, selectedCoordinates.lat],
    ];

    const directionPromise = goongApiKey
      ? getDirectionsCached(stationCoordinates, selectedCoordinates, 'car', goongApiKey)
      : Promise.resolve(null);

    const drawRoute = async () => {
      const direction = await directionPromise;

      if (cancelled) return;

      const route = direction?.routes?.[0];
      const overviewPoints = route?.overview_polyline?.points;

      let coords: Array<[number, number]> = [];

      if (overviewPoints) {
        coords = decodePolyline(overviewPoints);
      } else {
        const stepPolylines = (route?.legs || [])
          .flatMap((leg: any) => leg?.steps || [])
          .map((step: any) => step?.polyline?.points)
          .filter((p: unknown): p is string => typeof p === 'string' && p.length > 0);

        for (const p of stepPolylines) {
          const partial = decodePolyline(p);
          if (!partial.length) continue;

          if (
            coords.length > 0 &&
            partial.length > 0 &&
            coords[coords.length - 1][0] === partial[0][0] &&
            coords[coords.length - 1][1] === partial[0][1]
          ) {
            coords.push(...partial.slice(1));
          } else {
            coords.push(...partial);
          }
        }
      }

      if (coords.length >= 2) {
        drawLine(coords, false);
        fitBoundsFor(coords);
        return;
      }

      drawLine(fallbackCoords, true);
      fitBoundsFor(fallbackCoords);
    };

    void drawRoute();

    return () => {
      cancelled = true;
    };
  }, [stationCoordinates, selectedCoordinates, goongApiKey, mapReady]);

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-accent/20">
      {!goongMapKey ? (
        <p className="p-3 text-sm text-muted-foreground">
          Thiếu VITE_GOONG_MAP_KEY để hiển thị bản đồ.
        </p>
      ) : (
        <>
          <div ref={requestMapCallbackRef} className="h-[320px] w-full" />
          {!selectedCoordinates ? (
            <p className="p-3 text-xs text-muted-foreground">
              Yêu cầu này chưa có tọa độ hợp lệ để ghim vị trí.
            </p>
          ) : null}
        </>
      )}
    </div>
  );
}
