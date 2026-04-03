import { useEffect, useCallback, useRef } from 'react';
import goongjs, { type Map as GoongMap, type Marker } from '@goongmaps/goong-js';
import { useGoongMap } from '@/hooks/useGoongMap';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import type { ReliefLocation, Headquarters } from './types';
import { getUrgencyColor, getStatusColor } from './utils';
import { getAdministrativeBoundary, getDirections } from '@/services/goongService';

const ROUTE_SOURCE_ID = 'relief-route-source';
const ROUTE_LAYER_ID = 'relief-route-layer';

function decodePolyline(encoded: string): Array<[number, number]> {
  const coordinates: Array<[number, number]> = [];
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

    const dlat = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
    lat += dlat;

    shift = 0;
    result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);

    const dlng = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
    lng += dlng;

    coordinates.push([lng / 1e5, lat / 1e5]);
  }

  return coordinates;
}

interface ReliefMapProps {
  locations: ReliefLocation[];
  headquarters: Headquarters;
  onLocationSelect: (_location: ReliefLocation) => void;
  selectedLocationId?: string;
  mapApiKey: string;
  goongApiKey?: string;
}

export function ReliefMap({
  locations,
  headquarters,
  onLocationSelect,
  selectedLocationId,
  mapApiKey,
  goongApiKey,
}: ReliefMapProps) {
  const markersRef = useRef<Map<string, Marker>>(new Map());
  const headquartersMarkerRef = useRef<Marker | null>(null);
  // const [highlightedArea, setHighlightedArea] = useState<{
  //   name: string;
  //   coordinates: number[][][];
  // } | null>(null);

  const { map, mapRef, isLoading, error } = useGoongMap({
    center: headquarters.coordinates,
    zoom: 8,
    apiKey: mapApiKey,
  });

  // Create relief location markers
  const createReliefMarkers = useCallback(
    (mapInstance: GoongMap) => {
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current.clear();

      locations.forEach((location) => {
        const color =
          location.status === 'unassigned'
            ? getUrgencyColor(location.urgency)
            : getStatusColor(location.status);

        const scale = location.urgency === 'high' ? 1.4 : location.urgency === 'medium' ? 1.2 : 1.0;

        const marker = new goongjs.Marker({ color, scale })
          .setLngLat([location.coordinates.lng, location.coordinates.lat])
          .addTo(mapInstance);

        markersRef.current.set(location.id, marker);

        // Handle click event
        marker.getElement().addEventListener('click', () => {
          // Center map
          (mapInstance as any).flyTo({
            center: [location.coordinates.lng, location.coordinates.lat],
            zoom: 14,
            speed: 1.2,
          });
          // Trigger selection
          onLocationSelect(location);
        });

        // Add cursor pointer
        marker.getElement().style.cursor = 'pointer';
      });
    },
    [locations, onLocationSelect],
  );

  // Create headquarters marker
  const createHeadquartersMarker = useCallback(
    (mapInstance: GoongMap) => {
      if (headquartersMarkerRef.current) {
        headquartersMarkerRef.current.remove();
      }

      const hqMarker = new goongjs.Marker({
        color: '#8b5cf6',
        scale: 1.6,
      })
        .setLngLat([headquarters.coordinates.lng, headquarters.coordinates.lat])
        .addTo(mapInstance);

      const hqPopup = new goongjs.Popup({ offset: 25, maxWidth: '300px', closeButton: true })
        .setHTML(`
          <div style="min-width: 200px; font-family: 'Public Sans', sans-serif; padding: 12px;">
            <h3 style="margin: 0 0 8px 0; font-size: 16px; font-weight: 700; color: #8b5cf6; display: flex; align-items: center; gap: 6px;">
              <span class="material-symbols-outlined">home_work</span>
              ${headquarters.name}
            </h3>
            <p style="margin: 0; font-size: 13px; color: #6b7280;">
              ${headquarters.address}
            </p>
            <div style="margin-top: 8px; padding: 8px; background: #f3e8ff; border-radius: 4px;">
              <p style="margin: 0; font-size: 12px; color: #6b21a8; font-weight: 600;">
                Trụ sở điều phối chính
              </p>
            </div>
          </div>
        `);

      hqMarker.setPopup(hqPopup);
      headquartersMarkerRef.current = hqMarker;
    },
    [headquarters],
  );

  // Draw area boundary polygon
  const drawAreaBoundary = useCallback(
    (mapInstance: GoongMap, coordinates: number[][][], areaName: string) => {
      const sourceId = 'area-boundary';
      const fillLayerId = 'area-boundary-fill';
      const outlineLayerId = 'area-boundary-outline';

      const geoJsonData = {
        type: 'Feature',
        properties: { name: areaName },
        geometry: {
          type: 'Polygon',
          coordinates: coordinates,
        },
      };

      // Check if source already exists
      const source = (mapInstance as any).getSource(sourceId);

      if (source) {
        // Update existing source data
        source.setData(geoJsonData);
      } else {
        // Add new source
        (mapInstance as any).addSource(sourceId, {
          type: 'geojson',
          data: geoJsonData,
        });
      }

      // Ensure layers exist
      if (!(mapInstance as any).getLayer(fillLayerId)) {
        (mapInstance as any).addLayer({
          id: fillLayerId,
          type: 'fill',
          source: sourceId,
          paint: {
            'fill-color': '#3b82f6',
            'fill-opacity': 0.2,
          },
        });
      }

      if (!(mapInstance as any).getLayer(outlineLayerId)) {
        (mapInstance as any).addLayer({
          id: outlineLayerId,
          type: 'line',
          source: sourceId,
          paint: {
            'line-color': '#2563eb',
            'line-width': 2,
            'line-dasharray': [2, 1],
          },
        });
      }

      // setHighlightedArea({ name: areaName, coordinates });
    },
    [],
  );

  // Clear area boundary
  const clearAreaBoundary = useCallback((mapInstance: GoongMap) => {
    const sourceId = 'area-boundary';
    const source = (mapInstance as any).getSource(sourceId);

    if (source) {
      // Clear data but keep source/layers to avoid thrashing
      source.setData({
        type: 'FeatureCollection',
        features: [],
      });
    }
    // setHighlightedArea(null);
  }, []);

  const clearRoute = useCallback((mapInstance: GoongMap) => {
    if ((mapInstance as any).getLayer(ROUTE_LAYER_ID)) {
      try {
        (mapInstance as any).removeLayer(ROUTE_LAYER_ID);
      } catch (_error) {
        // Ignore cleanup errors
      }
    }
    if ((mapInstance as any).getSource(ROUTE_SOURCE_ID)) {
      try {
        (mapInstance as any).removeSource(ROUTE_SOURCE_ID);
      } catch (_error) {
        // Ignore cleanup errors
      }
    }
  }, []);

  // Highlight area function
  const highlightLocationArea = useCallback(
    async (lat: number, lng: number, fallbackName?: string) => {
      // If map is not ready or API key is missing, skip
      if (!map) return;

      try {
        const toastId = toast.loading('Đang tải boundary khu vực...');

        if (!goongApiKey) {
          const areaName = fallbackName || `Khu vực (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
          const radius = 0.01;
          const points = 32;
          const coordinates = [
            Array.from({ length: points + 1 }, (_, i) => {
              const angle = (i / points) * 2 * Math.PI;
              return [lng + radius * Math.cos(angle), lat + radius * Math.sin(angle)];
            }),
          ];

          drawAreaBoundary(map, coordinates, areaName);
          toast.info('Thiếu VITE_GOONG_API_KEY, đang hiển thị vùng xấp xỉ', { id: toastId });
          return;
        }

        // Try to get real administrative boundary from Goong API
        const boundaryData = await getAdministrativeBoundary(lat, lng, goongApiKey);

        if (boundaryData) {
          // Use real boundary from API
          console.log('Got real boundary:', boundaryData.areaName);
          drawAreaBoundary(map, boundaryData.coordinates, boundaryData.areaName);
          toast.success(`Đã khoanh vùng: ${boundaryData.areaName}`, { id: toastId });
        } else {
          // Fallback: create approximate circular boundary
          console.log('No boundary from API, using fallback circle');
          const areaName = fallbackName || `Khu vực (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
          const radius = 0.01; // ~1km
          const points = 32;
          const coordinates = [
            Array.from({ length: points + 1 }, (_, i) => {
              const angle = (i / points) * 2 * Math.PI;
              return [lng + radius * Math.cos(angle), lat + radius * Math.sin(angle)];
            }),
          ];

          drawAreaBoundary(map, coordinates, areaName);
          toast.info(`Khoanh vùng xấp xỉ: ${areaName}`, { id: toastId });
        }
      } catch (error) {
        console.error('Error highlighting area:', error);
        toast.error('Có lỗi khi khoanh vùng', { id: 'boundary-loading' });
      }
    },
    [goongApiKey, map, drawAreaBoundary],
  );

  // Handle map click to highlight administrative area
  // const handleMapClick = useCallback(
  //   (mapInstance: GoongMap, e: any) => {
  //     const { lng, lat } = e.lngLat;
  //     highlightLocationArea(lat, lng);
  //   },
  //   [highlightLocationArea],
  // );

  // Handle selectedLocationId changes - Center map AND highlight area
  useEffect(() => {
    if (map && selectedLocationId) {
      const location = locations.find((l) => l.id === selectedLocationId);

      if (location) {
        console.log('📍 Selected location changed:', location.locationName);

        // Center map on location
        (map as any).flyTo({
          center: [location.coordinates.lng, location.coordinates.lat],
          zoom: 14,
          speed: 1.2,
        });

        // Highlight area for the selected location
        // Use a small timeout to ensure flyTo start and map state is stable
        setTimeout(() => {
          highlightLocationArea(
            location.coordinates.lat,
            location.coordinates.lng,
            location.locationName,
          );
        }, 100);
      }
    }
  }, [map, selectedLocationId, locations, highlightLocationArea]);

  useEffect(() => {
    if (!map) return;

    const drawRoute = async () => {
      clearRoute(map);

      if (!selectedLocationId || !goongApiKey) return;

      const location = locations.find((l) => l.id === selectedLocationId);
      if (!location) return;

      const direction = await getDirections(
        headquarters.coordinates,
        location.coordinates,
        'car',
        goongApiKey,
      );

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

      if (coords.length < 2) return;

      (map as any).addSource(ROUTE_SOURCE_ID, {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: {},
          geometry: { type: 'LineString', coordinates: coords },
        },
      });

      (map as any).addLayer({
        id: ROUTE_LAYER_ID,
        type: 'line',
        source: ROUTE_SOURCE_ID,
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: { 'line-color': '#2563eb', 'line-width': 4, 'line-opacity': 0.85 },
      });
    };

    if ((map as any).isStyleLoaded()) {
      void drawRoute();
      return;
    }

    const onLoad = () => {
      void drawRoute();
    };
    map.on('load', onLoad);
    return () => {
      map.off('load', onLoad);
      clearRoute(map);
    };
  }, [map, selectedLocationId, locations, headquarters.coordinates, goongApiKey, clearRoute]);

  // Create all markers when map loads
  useEffect(() => {
    if (map) {
      createHeadquartersMarker(map);
      createReliefMarkers(map);

      // Add map click handler for area highlighting
      // map.on('click', (e: any) => {
      //   // const features = (map as any).queryRenderedFeatures(e.point);
      //   // const clickedOnMarker = features.some((f: any) => f.layer.type === 'symbol');

      //   // if (!clickedOnMarker) {
      //   //   handleMapClick(map, e);
      //   // }
      // });

      // Right-click to clear boundary
      map.on('contextmenu', (e: any) => {
        e.preventDefault();
        clearAreaBoundary(map);
        toast.info('Đã xóa khoanh vùng');
      });

      if (locations.length > 0) {
        const bounds = new goongjs.LngLatBounds();
        bounds.extend([headquarters.coordinates.lng, headquarters.coordinates.lat]);
        locations.forEach((loc) => {
          bounds.extend([loc.coordinates.lng, loc.coordinates.lat]);
        });
        map.fitBounds(bounds, { padding: 80 });
      }
    }
  }, [
    map,
    createHeadquartersMarker,
    createReliefMarkers,
    locations,
    headquarters,
    clearAreaBoundary,
  ]);

  // Expose fitBounds method
  useEffect(() => {
    if (map) {
      (window as any).reliefMapFitBounds = () => {
        const bounds = new goongjs.LngLatBounds();
        bounds.extend([headquarters.coordinates.lng, headquarters.coordinates.lat]);
        locations.forEach((loc) => {
          bounds.extend([loc.coordinates.lng, loc.coordinates.lat]);
        });
        map.fitBounds(bounds, { padding: 80 });
      };
    }
  }, [map, locations, headquarters]);

  return (
    <>
      <div ref={mapRef} className="w-full h-full" />

      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted/50 z-10">
          <div className="text-center space-y-2">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="text-sm text-muted-foreground">Đang tải bản đồ...</p>
          </div>
        </div>
      )}

      {/* Error overlay */}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted/50 z-10">
          <Card className="p-6">
            <CardContent className="text-center space-y-4">
              <span className="material-symbols-outlined text-5xl text-destructive">error</span>
              <h2 className="text-xl font-bold">Lỗi tải bản đồ</h2>
              <p className="text-muted-foreground">{error}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Legend */}
      <div className="absolute bottom-4 left-4 bg-white dark:bg-gray-800 p-3 rounded-lg shadow-lg text-xs space-y-2 z-10">
        <div className="font-bold mb-2 flex items-center gap-2">
          <span className="material-symbols-outlined text-sm">info</span>
          Chú thích
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-500"></div>
          <span>Khẩn cấp cao</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-orange-500"></div>
          <span>Trung bình / Đã gán</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-green-500"></div>
          <span>Thấp / Hoàn thành</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-blue-500"></div>
          <span>Đang đi</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-purple-500"></div>
          <span>Trụ sở chính</span>
        </div>
      </div>
    </>
  );
}
