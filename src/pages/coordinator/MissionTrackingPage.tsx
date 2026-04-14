import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import goongjs, { type Map as GoongMap, type Marker } from '@goongmaps/goong-js';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  rescueRequestService,
  type RescueRequestDetail,
  type RescueOperationDetail,
  type TeamLocationDto,
} from '@/services/rescueRequestService';
import { teamService, type TeamTrackingPoint } from '@/services/teamService';
import { coordinatorNavItems, coordinatorProjects } from './components/sidebarConfig';
import { getDisasterTypeLabel, getRescueRequestTypeLabel } from '@/enums/beEnums';
import { getDirections } from '@/services/goongService';

// ─── Constants ────────────────────────────────────────────────────────────────

const GOONG_MAP_KEY = import.meta.env.VITE_GOONG_MAP_KEY || '';
const GOONG_API_KEY = import.meta.env.VITE_GOONG_API_KEY || '';

// ─── Polyline decoder (identical to ReliefMap.tsx) ─────────────────────────
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

// ─── Enum helpers ─────────────────────────────────────────────────────────────

const OPERATION_STATUS_STEPS = [
  { key: 'Pending', label: 'Chờ xử lý', icon: 'schedule', color: '#9ca3af' },
  { key: 'Assigned', label: 'Đã gán team', icon: 'assignment_ind', color: '#60a5fa' },
  { key: 'EnRoute', label: 'Đang di chuyển', icon: 'directions_car', color: '#3b82f6' },
  { key: 'Rescuing', label: 'Đang cứu hộ', icon: 'local_fire_department', color: '#f97316' },
  { key: 'RescueCompleted', label: 'Hoàn thành', icon: 'check_circle', color: '#22c55e' },
] as const;

const STATUS_BADGE_MAP: Record<string, { label: string; cls: string }> = {
  Pending: { label: 'Chờ xử lý', cls: 'bg-gray-100 text-gray-600 border-gray-300' },
  Assigned: { label: 'Đã gán team', cls: 'bg-blue-50 text-blue-600 border-blue-300' },
  EnRoute: {
    label: '🚗 Di chuyển',
    cls: 'bg-blue-100 text-blue-700 border-blue-400 animate-pulse',
  },
  Rescuing: { label: '🧑‍🚒 Đang cứu hộ', cls: 'bg-orange-100 text-orange-700 border-orange-400' },
  RescueCompleted: { label: '✅ Hoàn thành', cls: 'bg-green-100 text-green-700 border-green-400' },
  Returning: { label: '↩️ Đang về trạm', cls: 'bg-purple-100 text-purple-700 border-purple-400' },
  Closed: { label: 'Đã đóng ca', cls: 'bg-gray-200 text-gray-700 border-gray-400' },
  Cancelled: { label: '❌ Đã hủy', cls: 'bg-red-100 text-red-600 border-red-400' },
};

const getStatusBadge = (status?: string | null) => {
  const s = status ?? '';
  return (
    STATUS_BADGE_MAP[s] ?? { label: s || '--', cls: 'bg-gray-100 text-gray-500 border-gray-300' }
  );
};

const DISASTER_TYPE_BADGE: Record<string, string> = {
  Flood: 'bg-blue-100 text-blue-800',
  Earthquake: 'bg-yellow-100 text-yellow-800',
  Landslide: 'bg-orange-100 text-orange-800',
  Fire: 'bg-red-100 text-red-800',
  Storm: 'bg-indigo-100 text-indigo-800',
};

const REQUEST_TYPE_COLOR: Record<string | number, string> = {
  Emergency: 'bg-red-500 text-white',
  Urgent: 'bg-orange-500 text-white',
  Normal: 'bg-green-500 text-white',
  0: 'bg-green-500 text-white',
  1: 'bg-orange-500 text-white',
  2: 'bg-red-500 text-white',
};

const formatDate = (v?: string | null) => {
  if (!v) return '--';
  const d = new Date(v);
  return isNaN(d.getTime()) ? '--' : d.toLocaleString('vi-VN');
};

const getRequestId = (r: { requestId?: string; rescueRequestId?: string; id?: string }) =>
  String(r.requestId ?? r.rescueRequestId ?? r.id ?? '');

// ─── Helper: remove Goong map sources/layers safely ─────────────────────────

function safeRemoveLayer(map: any, id: string) {
  try {
    if (map.getLayer(id)) map.removeLayer(id);
  } catch (_error) {
    void _error;
  }
}
function safeRemoveSource(map: any, id: string) {
  try {
    if (map.getSource(id)) map.removeSource(id);
  } catch (_error) {
    void _error;
  }
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function OperationTimeline({ status }: { status?: string | null }) {
  const stepIndex = OPERATION_STATUS_STEPS.findIndex((s) => s.key === status);
  const isCancelled = status === 'Cancelled';

  return (
    <div className="w-full overflow-x-auto pb-2">
      {isCancelled ? (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm font-medium">
          <span className="material-symbols-outlined text-base">cancel</span>
          Ca cứu hộ đã bị hủy
        </div>
      ) : (
        <div className="flex items-center gap-0 min-w-max">
          {OPERATION_STATUS_STEPS.map((step, idx) => {
            const isDone = idx < stepIndex;
            const isCurrent = idx === stepIndex;
            return (
              <div key={step.key} className="flex items-center">
                <div className="flex flex-col items-center gap-1">
                  <div
                    className={cn(
                      'w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all',
                      isDone
                        ? 'border-green-500 bg-green-500 text-white'
                        : isCurrent
                          ? 'border-blue-500 bg-blue-50 text-blue-600 shadow-md shadow-blue-200'
                          : 'border-gray-200 bg-gray-50 text-gray-400',
                    )}
                    style={isCurrent ? { borderColor: step.color, color: step.color } : undefined}
                  >
                    <span className="material-symbols-outlined text-sm">
                      {isDone ? 'check' : step.icon}
                    </span>
                  </div>
                  <span
                    className={cn(
                      'text-[10px] font-medium text-center leading-tight max-w-[64px] whitespace-normal',
                      isDone
                        ? 'text-green-600'
                        : isCurrent
                          ? 'text-blue-700 font-bold'
                          : 'text-gray-400',
                    )}
                  >
                    {step.label}
                  </span>
                </div>
                {idx < OPERATION_STATUS_STEPS.length - 1 && (
                  <div
                    className={cn(
                      'h-0.5 w-8 mx-1 mt-[-12px]',
                      idx < stepIndex ? 'bg-green-400' : 'bg-gray-200',
                    )}
                  />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function EtaBadge({ minutes }: { minutes?: number | null }) {
  if (minutes == null) return null;
  return (
    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-600 text-white text-sm font-bold shadow">
      <span className="material-symbols-outlined text-base">timer</span>
      ETA: ~{minutes} phút
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function MissionTrackingPage() {
  // ── List state ──────────────────────────────────────────────────────────
  const [requests, setRequests] = useState<RescueRequestDetail[]>([]);
  const [isListLoading, setIsListLoading] = useState(true);
  const [isListError, setIsListError] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<number | undefined>(undefined);

  // ── Detail state ─────────────────────────────────────────────────────────
  const [selectedId, setSelectedId] = useState('');
  const [detail, setDetail] = useState<RescueRequestDetail | null>(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);

  // ── Tracking state ───────────────────────────────────────────────────────
  const [teamLocation, setTeamLocation] = useState<TeamLocationDto | null>(null);
  const [trackingPoints, setTrackingPoints] = useState<TeamTrackingPoint[]>([]);
  const [isRecalculating, setIsRecalculating] = useState(false);

  // ── Map refs ─────────────────────────────────────────────────────────────
  // KEY FIX: always keep a stable ref, initialize map with callback ref
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<GoongMap | null>(null);
  const victimMarkerRef = useRef<Marker | null>(null);
  const teamMarkerRef = useRef<Marker | null>(null);
  const mapReadyRef = useRef(false); // fires when map 'load' event triggers

  // ── Polling refs ─────────────────────────────────────────────────────────
  const locationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const detailIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Derived ──────────────────────────────────────────────────────────────
  const currentOperation = useMemo<RescueOperationDetail | null>(() => {
    if (!detail?.rescueOperations?.length) return null;
    const ops = [...(detail.rescueOperations ?? [])] as RescueOperationDetail[];
    ops.sort((a, b) => new Date(b.startedAt ?? 0).getTime() - new Date(a.startedAt ?? 0).getTime());
    return ops[0];
  }, [detail]);

  const opStatus = currentOperation?.status ?? null;

  const isEnRoute = opStatus === 'EnRoute';
  const isRescuing = opStatus === 'Rescuing';
  const isCompleted = opStatus === 'RescueCompleted';
  const isPostMission = isRescuing || isCompleted;

  const showMap = isEnRoute || isRescuing;

  const victimCoords = useMemo(() => {
    const lat = Number(detail?.latitude);
    const lng = Number(detail?.longitude);
    if (!isFinite(lat) || !isFinite(lng) || (lat === 0 && lng === 0)) return null;
    return { lat, lng };
  }, [detail?.latitude, detail?.longitude]);

  const teamCoords = useMemo(() => {
    const lat = teamLocation?.currentLatitude ?? detail?.assignedRescueTeam?.currentLatitude;
    const lng = teamLocation?.currentLongitude ?? detail?.assignedRescueTeam?.currentLongitude;
    if (!lat || !lng) return null;
    return { lat, lng };
  }, [teamLocation, detail?.assignedRescueTeam]);

  const completionAttachments = useMemo(
    () =>
      (detail?.attachments ?? []).filter(
        (a) =>
          a.attachmentType === 1 ||
          a.attachmentType === '1' ||
          a.attachmentType === 'CompletionEvidence',
      ),
    [detail?.attachments],
  );

  const requestEvidenceAttachments = useMemo(
    () =>
      (detail?.attachments ?? []).filter(
        (a) =>
          a.attachmentType === 'RequestEvidence' ||
          a.attachmentType === 0 ||
          a.attachmentType === '0' ||
          a.attachmentType == null,
      ),
    [detail?.attachments],
  );

  const filteredRequests = useMemo(() => {
    const term = search.trim().toLowerCase();
    return requests.filter(
      (r) =>
        !term ||
        (r.reporterFullName ?? '').toLowerCase().includes(term) ||
        (r.address ?? '').toLowerCase().includes(term) ||
        (r.reporterPhone ?? '').toLowerCase().includes(term) ||
        (r.disasterType ?? '').toLowerCase().includes(term),
    );
  }, [requests, search]);

  // ── Load list ────────────────────────────────────────────────────────────
  const loadList = useCallback(async () => {
    try {
      setIsListError(false);
      const result = await rescueRequestService.getMyStationRequests(statusFilter, 1, 50);
      setRequests(result.items as RescueRequestDetail[]);
    } catch {
      setIsListError(true);
    } finally {
      setIsListLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    setIsListLoading(true);
    loadList();
  }, [loadList]);

  // ── Load detail (+ 30s refresh) ──────────────────────────────────────────
  const loadDetail = useCallback(async (id: string) => {
    if (!id) return;
    setIsDetailLoading(true);
    try {
      const data = await rescueRequestService.getById(id);
      setDetail(data);
    } catch {
      toast.error('Không tải được chi tiết yêu cầu.');
    } finally {
      setIsDetailLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      return;
    }
    loadDetail(selectedId);
    if (detailIntervalRef.current) clearInterval(detailIntervalRef.current);
    detailIntervalRef.current = setInterval(() => loadDetail(selectedId), 30_000);
    return () => {
      if (detailIntervalRef.current) clearInterval(detailIntervalRef.current);
    };
  }, [selectedId, loadDetail]);

  // ── Location polling (8s, EnRoute only) ─────────────────────────────────
  const stopLocationPolling = useCallback(() => {
    if (locationIntervalRef.current) {
      clearInterval(locationIntervalRef.current);
      locationIntervalRef.current = null;
    }
  }, []);

  const startLocationPolling = useCallback(
    (requestId: string) => {
      stopLocationPolling();
      const poll = async () => {
        try {
          const loc = await rescueRequestService.getTeamLocation(requestId);
          setTeamLocation(loc);
          if (loc.operationStatus !== 'EnRoute') {
            stopLocationPolling();
            loadDetail(requestId);
          }
        } catch {
          /* 404 = no team yet */
        }
      };
      poll();
      locationIntervalRef.current = setInterval(poll, 8_000);
    },
    [stopLocationPolling, loadDetail],
  );

  useEffect(() => {
    setTeamLocation(null);
    if (isEnRoute && selectedId) {
      startLocationPolling(selectedId);
    } else {
      stopLocationPolling();
    }
    return stopLocationPolling;
  }, [isEnRoute, selectedId, startLocationPolling, stopLocationPolling]);

  // ── Load tracking points for polyline ───────────────────────────────────
  useEffect(() => {
    const teamId = detail?.assignedRescueTeam?.teamId;
    if (!teamId || (!isEnRoute && !isPostMission)) {
      setTrackingPoints([]);
      return;
    }
    teamService
      .getTrackingPoints(teamId, 200)
      .then((res) => {
        const pts: TeamTrackingPoint[] = Array.isArray(res.data) ? res.data : [];
        const opId = currentOperation?.rescueOperationId;
        setTrackingPoints(opId ? pts.filter((p) => p.rescueOperationId === opId) : pts);
      })
      .catch(() => {});
  }, [
    detail?.assignedRescueTeam?.teamId,
    isEnRoute,
    isPostMission,
    currentOperation?.rescueOperationId,
  ]);

  // ── Map initialization via callback ref ──────────────────────────────────
  // Using a callback ref guarantees that we receive the DOM element the moment
  // it first appears in the DOM (regardless of conditional rendering).
  const mapCallbackRef = useCallback(
    (node: HTMLDivElement | null) => {
      mapContainerRef.current = node;

      // Node removed → destroy map
      if (!node) {
        victimMarkerRef.current?.remove();
        teamMarkerRef.current?.remove();
        if (mapRef.current) {
          mapRef.current.remove();
          mapRef.current = null;
        }
        mapReadyRef.current = false;
        return;
      }

      // Node added → init map
      if (!GOONG_MAP_KEY || mapRef.current) return;

      goongjs.accessToken = GOONG_MAP_KEY;
      const map = new goongjs.Map({
        container: node,
        style: 'https://tiles.goong.io/assets/goong_map_web.json',
        center: [108.2022, 16.0544],
        zoom: 5,
      });

      map.on('load', () => {
        mapReadyRef.current = true;
      });
      mapRef.current = map;
    },
    [], // stable
  );

  // ── Update victim marker + fly to when detail changes ───────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    victimMarkerRef.current?.remove();
    victimMarkerRef.current = null;

    if (!victimCoords) return;

    const el = document.createElement('div');
    el.innerHTML = `
      <div style="display:flex;align-items:center;gap:4px;cursor:pointer">
        <span style="width:16px;height:16px;background:#ef4444;border-radius:9999px;
          border:2px solid white;box-shadow:0 0 0 5px rgba(239,68,68,.3);
          display:inline-block;flex-shrink:0;"></span>
        <span style="font-size:11px;font-weight:700;background:#111827;color:#fff;
          padding:2px 7px;border-radius:9999px;white-space:nowrap;">📍 Nạn nhân</span>
      </div>`;

    victimMarkerRef.current = new goongjs.Marker({ element: el })
      .setLngLat([victimCoords.lng, victimCoords.lat])
      .addTo(map);

    (map as any).flyTo({ center: [victimCoords.lng, victimCoords.lat], zoom: 13, speed: 1 });
  }, [victimCoords]);

  // ── Update team marker ───────────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (!showMap) {
      teamMarkerRef.current?.remove();
      teamMarkerRef.current = null;
      return;
    }

    if (!teamCoords) return;

    if (!teamMarkerRef.current) {
      const el = document.createElement('div');
      el.style.cssText =
        'display:flex;flex-direction:column;align-items:center;gap:4px;cursor:pointer;';
      el.innerHTML = `
        <style>
          @keyframes team-pulse {
            0%   { transform: scale(1);   opacity: 1; }
            50%  { transform: scale(1.15); opacity: 0.85; }
            100% { transform: scale(1);   opacity: 1; }
          }
          @keyframes team-ring {
            0%   { transform: scale(1);   opacity: 0.6; }
            100% { transform: scale(2.2); opacity: 0; }
          }
        </style>
        <div style="position:relative;width:44px;height:44px;display:flex;align-items:center;justify-content:center;">
          <!-- Pulsing ring -->
          <div style="
            position:absolute;inset:0;border-radius:50%;
            background:rgba(37,99,235,0.35);
            animation:team-ring 1.6s ease-out infinite;
          "></div>
          <!-- Vehicle icon circle -->
          <div style="
            position:relative;z-index:1;
            width:40px;height:40px;border-radius:50%;
            background:linear-gradient(135deg,#1d4ed8,#2563eb);
            border:3px solid white;
            box-shadow:0 4px 12px rgba(37,99,235,0.55);
            display:flex;align-items:center;justify-content:center;
            animation:team-pulse 2s ease-in-out infinite;
          ">
            <!-- Rescue vehicle SVG -->
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="white">
              <path d="M20 8h-3V4H3c-1.1 0-2 .9-2 2v11h2c0 1.66 1.34 3 3 3s3-1.34 3-3h6c0 1.66 1.34 3 3 3s3-1.34 3-3h2v-5l-3-4zM6 18.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm13.5-9l1.96 2.5H17V9.5h2.5zm-1.5 9c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/>
            </svg>
          </div>
        </div>
        <!-- Label below -->
        <div style="
          background:#1e3a8a;color:white;
          font-size:10px;font-weight:700;
          padding:2px 8px;border-radius:9999px;
          white-space:nowrap;
          box-shadow:0 2px 6px rgba(0,0,0,0.3);
          letter-spacing:0.3px;
        ">🚑 Đội cứu hộ</div>
      `;
      teamMarkerRef.current = new goongjs.Marker({ element: el, anchor: 'bottom' })
        .setLngLat([teamCoords.lng, teamCoords.lat])
        .addTo(map);
    } else {
      teamMarkerRef.current.setLngLat([teamCoords.lng, teamCoords.lat]);
    }
  }, [showMap, teamCoords]);

  // ── Draw GPS track polyline (đường đã đi) ─────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const draw = () => {
      safeRemoveLayer(map, 'track-line');
      safeRemoveSource(map, 'track');
      if (trackingPoints.length < 2) return;
      const coords = trackingPoints.map((p) => [p.longitude, p.latitude]);
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

  // ── Draw Goong Directions route (team → victim) ─────────────────────────
  // Pattern identical to ReliefMap.tsx: call getDirections API → decode
  // overview_polyline → render as solid blue line on map
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !teamCoords || !victimCoords) return;

    let cancelled = false;

    const drawRoute = async () => {
      // Always clear previous route first
      safeRemoveLayer(map, 'direction-line');
      safeRemoveSource(map, 'direction');

      let coords: Array<[number, number]> = [];

      if (GOONG_API_KEY) {
        // Use Goong Directions API (same as ReliefMap.tsx)
        const direction = await getDirections(
          { lat: teamCoords.lat, lng: teamCoords.lng },
          { lat: victimCoords.lat, lng: victimCoords.lng },
          'car',
          GOONG_API_KEY,
        );

        if (cancelled) return;

        const route = direction?.routes?.[0];
        const overviewPoints = route?.overview_polyline?.points;

        if (overviewPoints) {
          coords = decodePolyline(overviewPoints);
        } else {
          // Fallback: stitch step polylines (same fallback as ReliefMap.tsx)
          const stepPolylines = (route?.legs || [])
            .flatMap((leg: any) => leg?.steps || [])
            .map((step: any) => step?.polyline?.points)
            .filter((p: unknown): p is string => typeof p === 'string' && p.length > 0);

          for (const p of stepPolylines) {
            const partial = decodePolyline(p);
            if (!partial.length) continue;
            if (
              coords.length > 0 &&
              coords[coords.length - 1][0] === partial[0][0] &&
              coords[coords.length - 1][1] === partial[0][1]
            ) {
              coords.push(...partial.slice(1));
            } else {
              coords.push(...partial);
            }
          }
        }
      }

      // If no API key or API failed → draw straight dashed fallback
      if (coords.length < 2) {
        coords = [
          [teamCoords.lng, teamCoords.lat],
          [victimCoords.lng, victimCoords.lat],
        ];
      }

      if (cancelled || !(map as any).isStyleLoaded()) return;

      safeRemoveLayer(map, 'direction-line');
      safeRemoveSource(map, 'direction');

      (map as any).addSource('direction', {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: {},
          geometry: { type: 'LineString', coordinates: coords },
        },
      });
      (map as any).addLayer({
        id: 'direction-line',
        type: 'line',
        source: 'direction',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: {
          'line-color': '#2563eb',
          'line-width': 4,
          'line-opacity': 0.85,
          // dashed only when using straight-line fallback (no API key)
          ...(GOONG_API_KEY ? {} : { 'line-dasharray': [4, 3] }),
        },
      });
    };

    if ((map as any).isStyleLoaded()) {
      void drawRoute();
    } else {
      (map as any).once('load', () => {
        void drawRoute();
      });
    }

    return () => {
      cancelled = true;
      safeRemoveLayer(map, 'direction-line');
      safeRemoveSource(map, 'direction');
    };
  }, [teamCoords, victimCoords]);

  // ── Fit map bounds to show both markers ─────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !teamCoords || !victimCoords) return;
    const lngs = [teamCoords.lng, victimCoords.lng];
    const lats = [teamCoords.lat, victimCoords.lat];
    (map as any).fitBounds(
      [
        [Math.min(...lngs), Math.min(...lats)],
        [Math.max(...lngs), Math.max(...lats)],
      ],
      { padding: 80, maxZoom: 15, duration: 1200 },
    );
  }, [teamCoords, victimCoords]);

  // ── Recalculate ETA ──────────────────────────────────────────────────────
  const handleRecalculateEta = async () => {
    const teamId = detail?.assignedRescueTeam?.teamId;
    if (!teamId) return;
    setIsRecalculating(true);
    try {
      await rescueRequestService.recalculateEta(teamId);
      toast.success('Đã tính lại ETA thành công.');
      if (selectedId) loadDetail(selectedId);
    } catch {
      toast.error('Không thể tính lại ETA.');
    } finally {
      setIsRecalculating(false);
    }
  };

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <DashboardLayout projects={coordinatorProjects} navItems={coordinatorNavItems}>
      {/* Header */}
      <div className="mb-6 flex flex-wrap justify-between items-end gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-black text-primary">Theo Dõi Mission</h1>
          <p className="text-muted-foreground mt-1">
            Quan sát hành trình cứu hộ realtime · Bản đồ · Timeline · Ảnh bằng chứng
          </p>
        </div>
        <Button variant="outline" className="gap-2" onClick={loadList}>
          <span className="material-symbols-outlined">refresh</span>
          Tải lại
        </Button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* ── Cột trái: Danh sách ─────────────────────────────────────────── */}
        <Card className="xl:col-span-1">
          <CardContent className="p-4 space-y-3">
            <input
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              placeholder="Tìm tên / SĐT / địa chỉ..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />

            <div className="flex flex-wrap gap-1.5">
              {[
                { label: 'Tất cả', value: undefined },
                { label: 'Đang xử lý', value: 3 },
                { label: 'Chờ duyệt', value: 0 },
                { label: 'Hoàn thành', value: 4 },
              ].map(({ label, value }) => (
                <button
                  key={label}
                  onClick={() => setStatusFilter(value)}
                  className={cn(
                    'px-2.5 py-1 rounded-full text-xs font-medium border transition-colors',
                    statusFilter === value
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'border-border hover:bg-accent/50 text-muted-foreground',
                  )}
                >
                  {label}
                </button>
              ))}
            </div>

            {isListLoading ? (
              <div className="space-y-2">
                {[1, 2, 3, 4].map((k) => (
                  <Skeleton key={k} className="h-16" />
                ))}
              </div>
            ) : isListError ? (
              <p className="text-sm text-red-500">Không tải được danh sách.</p>
            ) : filteredRequests.length === 0 ? (
              <p className="text-sm text-muted-foreground">Không có yêu cầu phù hợp.</p>
            ) : (
              <div className="space-y-1.5 max-h-[640px] overflow-auto pr-1">
                {filteredRequests.map((req) => {
                  const rid = getRequestId(req);
                  const isActive = rid === selectedId;
                  const ops = req.rescueOperations as RescueOperationDetail[] | undefined;
                  const latestOp = ops?.[0];
                  const badge = getStatusBadge(latestOp?.status);
                  const disasterCls =
                    DISASTER_TYPE_BADGE[String(req.disasterType ?? '')] ??
                    'bg-gray-100 text-gray-700';
                  return (
                    <button
                      key={rid}
                      onClick={() => setSelectedId(rid)}
                      className={cn(
                        'w-full text-left rounded-xl border p-3 transition-all',
                        isActive
                          ? 'border-primary bg-primary/5 shadow-sm'
                          : 'border-border hover:bg-accent/40',
                      )}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <p className="font-semibold text-sm truncate flex-1">
                          {req.reporterFullName || '--'}
                        </p>
                        <span
                          className={cn(
                            'text-[10px] px-2 py-0.5 rounded-full border font-medium flex-shrink-0',
                            badge.cls,
                          )}
                        >
                          {badge.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                        <span
                          className={cn(
                            'text-[10px] px-1.5 py-0.5 rounded font-medium',
                            disasterCls,
                          )}
                        >
                          {getDisasterTypeLabel(req.disasterType)}
                        </span>
                        {latestOp?.teamName && (
                          <span className="text-[10px] text-muted-foreground">
                            · {latestOp.teamName}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 truncate">
                        {req.address || 'Chưa có địa chỉ'}
                      </p>
                    </button>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Cột phải: Chi tiết ───────────────────────────────────────────── */}
        <Card className="xl:col-span-2">
          <CardContent className="p-6">
            {!selectedId ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <span className="material-symbols-outlined text-5xl text-muted-foreground/40 mb-3">
                  radar
                </span>
                <p className="text-muted-foreground">Chọn một yêu cầu để xem chi tiết mission.</p>
              </div>
            ) : isDetailLoading && !detail ? (
              <div className="space-y-4">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-24" />
                <Skeleton className="h-40" />
              </div>
            ) : !detail ? (
              <p className="text-sm text-red-500">Không tải được chi tiết.</p>
            ) : (
              <div className="space-y-6">
                {/* ── Header ─────────────────────────────────────────────── */}
                <div className="space-y-3">
                  <div className="flex items-start gap-3 flex-wrap">
                    <span
                      className={cn(
                        'text-xs font-bold px-2.5 py-1 rounded-full',
                        REQUEST_TYPE_COLOR[String(detail.rescueRequestType ?? '')] ??
                          'bg-gray-200 text-gray-700',
                      )}
                    >
                      {getRescueRequestTypeLabel(detail.rescueRequestType)?.toUpperCase() ??
                        'THƯỜNG'}
                    </span>
                    <span
                      className={cn(
                        'text-xs font-semibold px-2.5 py-1 rounded-full',
                        DISASTER_TYPE_BADGE[String(detail.disasterType ?? '')] ??
                          'bg-gray-100 text-gray-700',
                      )}
                    >
                      {getDisasterTypeLabel(detail.disasterType)}
                    </span>
                    {currentOperation && (
                      <span
                        className={cn(
                          'text-xs px-2.5 py-1 rounded-full border font-medium ml-auto',
                          getStatusBadge(opStatus).cls,
                        )}
                      >
                        {getStatusBadge(opStatus).label}
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                    <div className="flex items-start gap-2">
                      <span className="material-symbols-outlined text-muted-foreground text-base mt-0.5">
                        location_on
                      </span>
                      <p>{detail.address || 'Chưa có địa chỉ'}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-muted-foreground text-base">
                        person
                      </span>
                      <p>{detail.reporterFullName || '--'}</p>
                      {detail.reporterPhone && (
                        <>
                          <span className="material-symbols-outlined text-muted-foreground text-base">
                            phone
                          </span>
                          <a
                            href={`tel:${detail.reporterPhone}`}
                            className="text-primary hover:underline"
                          >
                            {detail.reporterPhone}
                          </a>
                        </>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-muted-foreground text-base">
                        schedule
                      </span>
                      <p>{formatDate(detail.createdAt)}</p>
                    </div>
                  </div>

                  {detail.description && (
                    <div className="rounded-lg bg-accent/30 border border-border p-3 text-sm italic text-muted-foreground">
                      "{detail.description}"
                    </div>
                  )}
                </div>

                {/* ── Operation Timeline ────────────────────────────────── */}
                {currentOperation && (
                  <div className="space-y-3">
                    <p className="text-xs uppercase font-semibold text-muted-foreground tracking-wider">
                      Trạng thái operation
                    </p>
                    <OperationTimeline status={opStatus} />

                    <div className="flex flex-wrap items-center gap-3 text-sm">
                      {currentOperation.teamName && (
                        <div className="flex items-center gap-1.5 bg-blue-50 border border-blue-200 rounded-full px-3 py-1">
                          <span className="material-symbols-outlined text-blue-600 text-base">
                            groups
                          </span>
                          <span className="font-medium text-blue-700">
                            {currentOperation.teamName}
                          </span>
                        </div>
                      )}
                      {currentOperation.stationName && (
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <span className="material-symbols-outlined text-base">home_pin</span>
                          {currentOperation.stationName}
                        </div>
                      )}
                      {currentOperation.startedAt && (
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <span className="material-symbols-outlined text-base">play_arrow</span>
                          {formatDate(currentOperation.startedAt)}
                        </div>
                      )}
                      {isEnRoute && (
                        <EtaBadge
                          minutes={
                            teamLocation?.estimatedMinutesToArrival ??
                            detail.assignedRescueTeam?.estimatedMinutesToArrival
                          }
                        />
                      )}
                    </div>
                  </div>
                )}

                {/* ── Map section ──────────────────────────────────────────
                    IMPORTANT: The map container is ALWAYS rendered in the DOM
                    (not conditionally), but hidden via CSS when not needed.
                    This ensures mapCallbackRef fires on initial mount and
                    goongjs.Map() can be initialized properly.            ── */}
                <div className={showMap ? 'space-y-3' : 'hidden'}>
                  {/* Toolbar */}
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <p className="text-xs uppercase font-semibold text-muted-foreground tracking-wider flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-base text-blue-500">
                        {isEnRoute ? 'directions_car' : 'local_fire_department'}
                      </span>
                      {isEnRoute
                        ? 'Bản đồ realtime — Team đang di chuyển'
                        : 'Team đang cứu hộ tại hiện trường'}
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
                        onClick={handleRecalculateEta}
                        disabled={isRecalculating}
                      >
                        <span className="material-symbols-outlined text-sm">calculate</span>
                        {isRecalculating ? 'Đang tính...' : 'Recalculate ETA'}
                      </Button>
                    </div>
                  </div>

                  {/* Stats row */}
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
                        <p className="text-[10px] text-green-600 font-semibold uppercase">
                          Khoảng cách
                        </p>
                        <p className="text-lg font-black text-green-700">
                          {teamLocation.distanceKmToVictim?.toFixed(1) ?? '--'}
                          <span className="text-xs font-normal"> km</span>
                        </p>
                      </div>
                      <div className="rounded-lg bg-purple-50 border border-purple-200 p-2 text-center">
                        <p className="text-[10px] text-purple-600 font-semibold uppercase">
                          Điểm GPS
                        </p>
                        <p className="text-lg font-black text-purple-700">
                          {trackingPoints.length}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Rescuing banner */}
                  {isRescuing && (
                    <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-orange-50 border border-orange-300">
                      <span className="material-symbols-outlined text-orange-500 text-2xl">
                        local_fire_department
                      </span>
                      <div>
                        <p className="font-bold text-orange-800">
                          Team đang cứu hộ tại hiện trường
                        </p>
                        <p className="text-xs text-orange-600">Polling vị trí đã dừng.</p>
                      </div>
                    </div>
                  )}

                  {/* Map container — always mounted ─────────────────────── */}
                  {!GOONG_API_KEY ? (
                    <div className="rounded-xl border border-border bg-accent/20 p-6 text-sm text-muted-foreground text-center">
                      Thiếu{' '}
                      <code className="font-mono bg-accent px-1 rounded">VITE_GOONG_MAP_KEY</code>{' '}
                      để hiển thị bản đồ.
                    </div>
                  ) : (
                    <div className="rounded-xl overflow-hidden border border-border shadow-sm">
                      <div ref={mapCallbackRef} style={{ height: '380px', width: '100%' }} />
                    </div>
                  )}

                  {/* Legend */}
                  {GOONG_API_KEY && isEnRoute && (
                    <div className="flex items-center gap-5 text-xs text-muted-foreground flex-wrap">
                      <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 rounded-full bg-red-500" /> Nạn nhân
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 rounded-full bg-blue-500" /> Team
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="w-4 h-1 rounded bg-green-500" /> Đường đã đi
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div
                          className="w-4 h-0"
                          style={{
                            borderTop: '2px dashed #3b82f6',
                            display: 'inline-block',
                          }}
                        />
                        &nbsp;Hướng di chuyển
                      </div>
                    </div>
                  )}
                </div>

                {/* ── RescueCompleted: Evidence Gallery ────────────────── */}
                {isCompleted && (
                  <div className="rounded-xl border border-green-200 bg-green-50 p-5 space-y-4">
                    {/* Header */}
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-green-600">check_circle</span>
                      <h3 className="font-bold text-green-800 text-base">Cứu hộ hoàn thành</h3>
                      {currentOperation?.endedAt && (
                        <span className="text-xs text-green-600 ml-auto">
                          {formatDate(currentOperation.endedAt)}
                        </span>
                      )}
                    </div>

                    {/* Completion note */}
                    {currentOperation?.completionNote && (
                      <div className="bg-white rounded-lg border border-green-200 p-3 text-sm text-gray-700">
                        <p className="text-xs uppercase font-semibold text-green-700 mb-1">
                          📝 Ghi chú team leader
                        </p>
                        <p>{currentOperation.completionNote}</p>
                      </div>
                    )}

                    {/* CompletionEvidence (type=1) photos — same pattern as RequestManagementPage */}
                    <div>
                      <p className="text-xs uppercase font-semibold text-green-700 mb-2">
                        📷 Bằng chứng hoàn thành — CompletionEvidence
                        {completionAttachments.length > 0 && ` (${completionAttachments.length})`}
                      </p>
                      {completionAttachments.length > 0 ? (
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                          {completionAttachments.map((att, i) => (
                            <a
                              key={att.attachmentId ?? i}
                              href={att.fileUrl ?? '#'}
                              target="_blank"
                              rel="noreferrer"
                              className="rounded-lg overflow-hidden border border-green-200 hover:border-green-500 transition-all hover:shadow-md bg-white"
                            >
                              <img
                                src={att.fileUrl || ''}
                                alt={`completion-${i}`}
                                className="w-full h-28 object-cover"
                                onError={(e) => {
                                  const el = e.currentTarget as HTMLImageElement;
                                  el.style.display = 'none';
                                  (el.parentElement as HTMLElement).innerHTML =
                                    '<div class="h-28 flex items-center justify-center bg-gray-50"><span class="material-symbols-outlined text-gray-400 text-3xl">broken_image</span></div>';
                                }}
                              />
                            </a>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-green-600">Chưa có ảnh bằng chứng hoàn thành.</p>
                      )}
                    </div>
                  </div>
                )}

                {/* ── Request Evidence Attachments ─────────────────────── */}
                {requestEvidenceAttachments.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs uppercase font-semibold text-muted-foreground tracking-wider">
                      📎 Ảnh yêu cầu ban đầu ({requestEvidenceAttachments.length})
                    </p>
                    <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
                      {requestEvidenceAttachments.map((att, i) => (
                        <a
                          key={att.attachmentId ?? i}
                          href={att.fileUrl ?? '#'}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-lg overflow-hidden border border-border hover:border-primary transition-all hover:shadow-md aspect-square bg-accent/20"
                        >
                          <img
                            src={att.fileUrl ?? ''}
                            alt={`req-att-${i}`}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.currentTarget as HTMLImageElement).style.display = 'none';
                            }}
                          />
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
