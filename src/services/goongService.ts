/**
 * Goong Maps API Service
 * Documentation: https://docs.goong.io/
 */

export interface DirectionsRequest {
  origin: { lat: number; lng: number };
  destination: { lat: number; lng: number };
  vehicle?: 'car' | 'bike' | 'foot' | 'truck';
  alternatives?: boolean;
}

export interface RouteLeg {
  distance: {
    value: number; // meters
    text: string; // formatted string
  };
  duration: {
    value: number; // seconds
    text: string; // formatted string
  };
  steps: Array<{
    distance: { value: number; text: string };
    duration: { value: number; text: string };
    html_instructions?: string;
    instruction?: string;
    maneuver?: string;
    start_location?: { lat: number; lng: number };
    end_location?: { lat: number; lng: number };
    polyline?: { points: string };
    travel_mode?: string;
  }>;
  start_address?: string;
  end_address?: string;
  start_location?: { lat: number; lng: number };
  end_location?: { lat: number; lng: number };
}

export interface DirectionsResponse {
  routes: Array<{
    bounds?: unknown;
    legs: RouteLeg[];
    overview_polyline: {
      points: string;
    };
    distance?: { value: number; text: string };
    duration?: { value: number; text: string };
    summary?: string;
    warnings?: string[];
    waypoint_order?: number[];
  }>;
  geocoded_waypoints?: Array<{
    geocoder_status: string;
    place_id: string;
  }>;
}

export interface GeocodeResult {
  formatted_address: string;
  place_id: string;
  geometry: {
    location: { lat: number; lng: number };
    location_type: string;
  };
  address_components: Array<{
    long_name: string;
    short_name: string;
    types: string[];
  }>;
  compound?: {
    commune?: string;
    district?: string;
    province?: string;
  };
  deprecated_description?: string;
  deprecated_compound?: {
    commune?: string;
    district?: string;
    province?: string;
  };
  plus_code?: {
    compound_code?: string;
    global_code?: string;
  };
  name?: string;
  address?: string;
  reference?: string;
  types?: string[];
}

export interface GeocodeV2Response {
  results: GeocodeResult[];
  status: string;
}

export interface GoongAutocompletePrediction {
  description: string;
  place_id: string;
  reference: string;
  structured_formatting?: {
    main_text: string;
    secondary_text: string;
  };
  plus_code?: {
    compound_code?: string;
    global_code?: string;
  };
  compound?: {
    commune?: string;
    district?: string;
    province?: string;
  };
  deprecated_description?: string;
  deprecated_compound?: {
    commune?: string;
    district?: string;
    province?: string;
  };
  types?: string[];
  distance_meters?: number | null;
}

export interface GoongAutocompleteResponse {
  predictions: GoongAutocompletePrediction[];
  status: string;
}

export interface GoongGeocodeParams {
  address?: string;
  latlng?: string;
  placeId?: string;
  hasDeprecatedAdministrativeUnit?: boolean;
  hasVnid?: boolean;
  limit?: number;
}

export interface GoongAutocompleteParams {
  input: string;
  location?: string;
  origin?: string;
  limit?: number;
  radius?: number;
  moreCompound?: boolean;
  hasDeprecatedAdministrativeUnit?: boolean;
}

const GOONG_RSAPI_BASE_URL = 'https://rsapi.goong.io/v2';
const GOONG_API_KEY =
  import.meta.env.VITE_GOONG_API_KEY || import.meta.env.VITE_GOONG_MAP_KEY || '';

function buildQuery(params: Record<string, string | number | boolean | undefined>) {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    searchParams.set(key, String(value));
  });
  return searchParams.toString();
}

export interface PlaceDetailResponse {
  result: {
    place_id: string;
    name: string;
    formatted_address: string;
    geometry: {
      location: { lat: number; lng: number };
      boundary?: {
        type: string;
        coordinates: number[][][]; // GeoJSON polygon coordinates
      };
    };
    address_components: Array<{
      long_name: string;
      short_name: string;
      types: string[];
    }>;
  };
}

// ---------------------------------------------------------------------------
// Directions response cache
// ---------------------------------------------------------------------------

interface _DirectionsCacheEntry {
  data: DirectionsResponse;
  expiresAt: number;
}

const _directionsCache = new Map<string, _DirectionsCacheEntry>();
const _directionsInflight = new Map<string, Promise<DirectionsResponse | null>>();
const DIRECTIONS_CACHE_TTL = 60_000; // 60 seconds

function _directionsCacheKey(
  origin: { lat: number; lng: number },
  destination: { lat: number; lng: number },
  vehicle: string,
  alternatives: boolean,
): string {
  return `${origin.lat.toFixed(4)},${origin.lng.toFixed(4)}|${destination.lat.toFixed(4)},${destination.lng.toFixed(4)}|${vehicle}|${alternatives}`;
}

/**
 * Same as getDirections but caches responses for DIRECTIONS_CACHE_TTL ms.
 * Cache key is based on coordinates rounded to 4 decimal places (~11 m precision).
 * Returns null on failure without poisoning the cache.
 */
export async function getDirectionsCached(
  origin: { lat: number; lng: number },
  destination: { lat: number; lng: number },
  vehicle: 'car' | 'bike' | 'foot' | 'truck' = 'car',
  apiKey: string,
  alternatives = false,
): Promise<DirectionsResponse | null> {
  const key = _directionsCacheKey(origin, destination, vehicle, alternatives);
  const now = Date.now();
  const cached = _directionsCache.get(key);
  if (cached && cached.expiresAt > now) {
    return cached.data;
  }

  const inflight = _directionsInflight.get(key);
  if (inflight) {
    return inflight;
  }

  const requestPromise = getDirections(origin, destination, vehicle, apiKey, alternatives)
    .then((data) => {
      _directionsInflight.delete(key);
      if (data) {
        _directionsCache.set(key, { data, expiresAt: Date.now() + DIRECTIONS_CACHE_TTL });
      }
      return data;
    })
    .catch((error) => {
      _directionsInflight.delete(key);
      console.error('Error resolving cached directions:', error);
      return null;
    });

  _directionsInflight.set(key, requestPromise);

  const data = await requestPromise;
  if (data) {
    _directionsCache.set(key, { data, expiresAt: Date.now() + DIRECTIONS_CACHE_TTL });
  }
  return data;
}

// ---------------------------------------------------------------------------

/**
 * Calculate distance and duration from headquarters to a location
 * @param origin - Headquarters coordinates
 * @param destination - Destination coordinates
 * @param vehicle - Type of vehicle (car, bike, foot)
 * @param apiKey - Goong Maps API Key
 * @returns Route information with distance and duration
 */
export async function getDirections(
  origin: { lat: number; lng: number },
  destination: { lat: number; lng: number },
  vehicle: 'car' | 'bike' | 'foot' | 'truck' = 'car',
  apiKey: string,
  alternatives = false,
): Promise<DirectionsResponse | null> {
  try {
    const vehicleParam =
      vehicle === 'bike'
        ? 'bike'
        : vehicle === 'foot'
          ? 'foot'
          : vehicle === 'truck'
            ? 'truck'
            : 'car';

    const url = `https://rsapi.goong.io/v2/direction?origin=${origin.lat},${origin.lng}&destination=${destination.lat},${destination.lng}&vehicle=${vehicleParam}&alternatives=${alternatives}&api_key=${apiKey}`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Directions API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching directions:', error);
    return null;
  }
}

// Track if API key is invalid to avoid repeated failed requests
let isApiKeyInvalid = false;

/**
 * Reverse geocode coordinates to get address and place information
 * @param lat - Latitude
 * @param lng - Longitude
 * @param apiKey - Goong API Key
 * @returns Geocoding result with address and place_id
 */
export async function reverseGeocode(
  lat: number,
  lng: number,
  apiKey: string,
): Promise<GeocodeResult | null> {
  // Fail fast if we know the key is invalid
  if (isApiKeyInvalid) {
    console.warn('⚠️ API Key previously failed, skipping request');
    return null;
  }

  try {
    const url = `https://rsapi.goong.io/Geocode?latlng=${lat},${lng}&api_key=${apiKey}`;

    // Add timeout to fetch to prevent long delays
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout

    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Geocode API error:', response.status, errorText);

      // If unauthorized, mark key as invalid to prevent future requests
      if (response.status === 401 || response.status === 403) {
        isApiKeyInvalid = true;
      }

      return null;
    }

    const data = await response.json();
    if (data.results && data.results.length > 0) {
      return data.results[0];
    }
    return null;
  } catch (error) {
    console.error('Error fetching geocode:', error);
    return null;
  }
}

export async function geocodeV2(params: GoongGeocodeParams, apiKey = GOONG_API_KEY) {
  const query = buildQuery({
    address: params.address,
    latlng: params.latlng,
    place_id: params.placeId,
    has_deprecated_administrative_unit: params.hasDeprecatedAdministrativeUnit,
    has_vnid: params.hasVnid,
    limit: params.limit,
    api_key: apiKey,
  });

  const response = await fetch(`${GOONG_RSAPI_BASE_URL}/geocode?${query}`);
  if (!response.ok) {
    throw new Error(`Goong geocode V2 error: ${response.status}`);
  }

  return (await response.json()) as GeocodeV2Response;
}

export async function forwardGeocodeV2(
  address: string,
  options?: Omit<GoongGeocodeParams, 'address' | 'latlng' | 'placeId'>,
  apiKey = GOONG_API_KEY,
) {
  return geocodeV2(
    {
      address,
      ...options,
    },
    apiKey,
  );
}

export async function reverseGeocodeV2(
  lat: number,
  lng: number,
  options?: Omit<GoongGeocodeParams, 'address' | 'latlng' | 'placeId'>,
  apiKey = GOONG_API_KEY,
) {
  return geocodeV2(
    {
      latlng: `${lat},${lng}`,
      ...options,
    },
    apiKey,
  );
}

export async function geocodeByPlaceIdV2(
  placeId: string,
  options?: Omit<GoongGeocodeParams, 'address' | 'latlng' | 'placeId'>,
  apiKey = GOONG_API_KEY,
) {
  return geocodeV2(
    {
      placeId,
      ...options,
    },
    apiKey,
  );
}

export async function autocompleteV2(params: GoongAutocompleteParams, apiKey = GOONG_API_KEY) {
  const query = buildQuery({
    input: params.input,
    location: params.location,
    origin: params.origin,
    limit: params.limit,
    radius: params.radius,
    more_compound: params.moreCompound,
    has_deprecated_administrative_unit: params.hasDeprecatedAdministrativeUnit,
    api_key: apiKey,
  });

  const response = await fetch(`${GOONG_RSAPI_BASE_URL}/place/autocomplete?${query}`);
  if (!response.ok) {
    throw new Error(`Goong autocomplete V2 error: ${response.status}`);
  }

  return (await response.json()) as GoongAutocompleteResponse;
}

/**
 * Get place details including boundary polygon if available
 * @param placeId - Place ID from geocoding
 * @param apiKey - Goong API Key
 * @returns Place details with boundary coordinates (if available)
 */
export async function getPlaceDetail(
  placeId: string,
  apiKey: string,
): Promise<PlaceDetailResponse | null> {
  try {
    const url = `https://rsapi.goong.io/Place/Detail?place_id=${placeId}&api_key=${apiKey}`;

    const response = await fetch(url);
    if (!response.ok) {
      console.error('Place Detail API error:', response.status);
      return null;
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching place detail:', error);
    return null;
  }
}

/**
 * Get administrative boundary for a specific area
 * @param lat - Latitude
 * @param lng - Longitude
 * @param apiKey - Goong API Key
 * @returns GeoJSON polygon coordinates if available, null otherwise
 */
export async function getAdministrativeBoundary(
  lat: number,
  lng: number,
  apiKey: string,
): Promise<{ coordinates: number[][][]; areaName: string } | null> {
  try {
    // First, reverse geocode to get place_id and area name
    const geocodeResult = await reverseGeocode(lat, lng, apiKey);
    if (!geocodeResult) return null;

    // Extract area name (commune/ward first, then district)
    const addressComponents = Array.isArray(geocodeResult.address_components)
      ? geocodeResult.address_components
      : [];

    const commune = addressComponents.find(
      (comp) =>
        Array.isArray(comp?.types) &&
        (comp.types.includes('commune') || comp.types.includes('sublocality')),
    );
    const district = addressComponents.find(
      (comp) => Array.isArray(comp?.types) && comp.types.includes('administrative_area_level_2'),
    );
    const areaName = commune?.long_name || district?.long_name || 'Khu vực';

    // Try to get place details with boundary
    const placeDetail = await getPlaceDetail(geocodeResult.place_id, apiKey);
    if (placeDetail?.result?.geometry?.boundary) {
      return {
        coordinates: placeDetail.result.geometry.boundary.coordinates,
        areaName,
      };
    }

    // No boundary available from API
    return null;
  } catch (error) {
    console.error('Error fetching administrative boundary:', error);
    return null;
  }
}

/**
 * Calculate straight-line distance (Haversine formula) between two coordinates
 * @param coord1 - First coordinate
 * @param coord2 - Second coordinate
 * @returns Distance in kilometers
 */
export function calculateDistance(
  coord1: { lat: number; lng: number },
  coord2: { lat: number; lng: number },
): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((coord2.lat - coord1.lat) * Math.PI) / 180;
  const dLon = ((coord2.lng - coord1.lng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((coord1.lat * Math.PI) / 180) *
      Math.cos((coord2.lat * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  return distance;
}

/**
 * Format duration from seconds to human-readable string
 */
export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours > 0) {
    return `${hours} giờ ${minutes} phút`;
  }
  return `${minutes} phút`;
}

/**
 * Format distance from meters to human-readable string
 */
export function formatDistance(meters: number): string {
  if (meters >= 1000) {
    return `${(meters / 1000).toFixed(1)} km`;
  }
  return `${Math.round(meters)} m`;
}
