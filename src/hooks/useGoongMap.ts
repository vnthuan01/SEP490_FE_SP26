import { useEffect, useRef, useState, type RefObject } from 'react';
import goongjs, { type Map, type MapOptions } from '@goongmaps/goong-js';
import { useQuery } from '@tanstack/react-query';
import {
  autocompleteV2,
  forwardGeocodeV2,
  geocodeByPlaceIdV2,
  reverseGeocodeV2,
  type GoongAutocompleteParams,
  type GoongGeocodeParams,
} from '@/services/goongService';

interface UseGoongMapOptions {
  center: { lat: number; lng: number };
  zoom?: number;
  apiKey: string;
  enabled?: boolean;
  onMapLoad?: (_map: Map) => void;
}

interface UseGoongMapReturn {
  map: Map | null;
  mapRef: RefObject<HTMLDivElement | null>;
  isLoading: boolean;
  error: string | null;
}

export const GOONG_QUERY_KEYS = {
  autocomplete: (params: GoongAutocompleteParams) => ['goong', 'autocomplete-v2', params] as const,
  geocode: (params: GoongGeocodeParams) => ['goong', 'geocode-v2', params] as const,
  reverseGeocode: (lat: number, lng: number, options?: Record<string, unknown>) =>
    ['goong', 'reverse-geocode-v2', lat, lng, options] as const,
  placeId: (placeId: string, options?: Record<string, unknown>) =>
    ['goong', 'place-id-v2', placeId, options] as const,
};

/**
 * Hook to initialize and manage Goong Maps instance using @goongmaps/goong-js
 *
 * @param options - Configuration options for the map
 * @returns Map instance, ref, loading state, and error state
 */
export function useGoongMap({
  center,
  zoom = 14,
  apiKey,
  enabled = true,
  onMapLoad,
}: UseGoongMapOptions): UseGoongMapReturn {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const [map, setMap] = useState<Map | null>(null);
  const [isLoading, setIsLoading] = useState(enabled);
  const [runtimeError, setRuntimeError] = useState<string | null>(null);
  const mapInstanceRef = useRef<Map | null>(null);
  const missingApiKeyError = enabled && !apiKey ? 'Thiếu Goong Map API key' : null;

  // Use ref to store onMapLoad callback to avoid recreating map
  const onMapLoadRef = useRef(onMapLoad);
  useEffect(() => {
    onMapLoadRef.current = onMapLoad;
  }, [onMapLoad]);

  useEffect(() => {
    if (!enabled) return;

    if (!apiKey) return;

    // Cleanup previous map instance if exists
    if (mapInstanceRef.current) {
      try {
        mapInstanceRef.current.remove();
      } catch {
        // Ignore cleanup errors
      }
      mapInstanceRef.current = null;
    }

    const initializeMap = () => {
      if (!mapRef.current) {
        return false;
      }

      try {
        // Set access token for Goong Maps
        goongjs.accessToken = apiKey;

        // Goong Maps uses [lng, lat] format, not [lat, lng]
        const mapOptions: MapOptions = {
          container: mapRef.current,
          style: 'https://tiles.goong.io/assets/goong_map_web.json',
          center: [center.lng, center.lat],
          zoom,
        };

        const mapInstance = new goongjs.Map(mapOptions);
        mapInstanceRef.current = mapInstance;

        // Wait for map to load
        mapInstance.on('load', () => {
          setMap(mapInstance);
          setIsLoading(false);
          setRuntimeError(null);

          // Use ref to call callback
          if (onMapLoadRef.current) {
            onMapLoadRef.current(mapInstance);
          }
        });

        // Handle map errors
        mapInstance.on('error', (e: unknown) => {
          const error = e as { error?: { message?: string } };
          setRuntimeError(error.error?.message || 'Failed to load map');
          setIsLoading(false);
        });
      } catch (err) {
        setRuntimeError(err instanceof Error ? err.message : 'Failed to create map instance');
        setIsLoading(false);
      }

      return true;
    };

    let attempts = 0;
    const timer = setInterval(() => {
      const initialized = initializeMap();
      attempts += 1;

      if (initialized || attempts >= 20) {
        clearInterval(timer);
        if (!initialized && attempts >= 20) {
          setRuntimeError('Map container not available');
          setIsLoading(false);
        }
      }
    }, 100);

    return () => {
      clearInterval(timer);
      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.remove();
        } catch {
          // Ignore cleanup errors
        }
        mapInstanceRef.current = null;
        setMap(null);
      }
    };
  }, [center.lat, center.lng, zoom, apiKey, enabled]); // Only depend on primitive values, not callbacks

  // Update map center when it changes
  useEffect(() => {
    if (map) {
      const currentCenter = map.getCenter();
      if (currentCenter.lng !== center.lng || currentCenter.lat !== center.lat) {
        map.setCenter([center.lng, center.lat]);
      }
    }
  }, [map, center]);

  // Update map zoom when it changes
  useEffect(() => {
    if (map && map.getZoom() !== zoom) {
      map.setZoom(zoom);
    }
  }, [map, zoom]);

  return {
    map,
    mapRef,
    isLoading: enabled ? isLoading : false,
    error: missingApiKeyError || runtimeError,
  };
}

export function useGoongAutocomplete(params: GoongAutocompleteParams, enabled = true) {
  return useQuery({
    queryKey: GOONG_QUERY_KEYS.autocomplete(params),
    queryFn: () => autocompleteV2(params),
    enabled: enabled && !!params.input?.trim(),
    staleTime: 30_000,
  });
}

export function useGoongForwardGeocode(
  address: string,
  options?: Omit<GoongGeocodeParams, 'address' | 'latlng' | 'placeId'>,
  enabled = true,
) {
  return useQuery({
    queryKey: GOONG_QUERY_KEYS.geocode({ address, ...options }),
    queryFn: () => forwardGeocodeV2(address, options),
    enabled: enabled && !!address.trim(),
    staleTime: 60_000,
  });
}

export function useGoongReverseGeocode(
  lat: number | null,
  lng: number | null,
  options?: Omit<GoongGeocodeParams, 'address' | 'latlng' | 'placeId'>,
  enabled = true,
) {
  return useQuery({
    queryKey: GOONG_QUERY_KEYS.reverseGeocode(lat || 0, lng || 0, options),
    queryFn: () => reverseGeocodeV2(lat as number, lng as number, options),
    enabled: enabled && lat !== null && lng !== null,
    staleTime: 60_000,
  });
}

export function useGoongGeocodeByPlaceId(
  placeId: string,
  options?: Omit<GoongGeocodeParams, 'address' | 'latlng' | 'placeId'>,
  enabled = true,
) {
  return useQuery({
    queryKey: GOONG_QUERY_KEYS.placeId(placeId, options),
    queryFn: () => geocodeByPlaceIdV2(placeId, options),
    enabled: enabled && !!placeId.trim(),
    staleTime: 60_000,
  });
}
