import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import goongjs, { type Map as GoongMap, type Marker } from '@goongmaps/goong-js';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { coordinatorNavItems, coordinatorProjects } from './components/sidebarConfig';
import { useMyReliefStation } from '@/hooks/useReliefStation';
import { useTeamsInStation } from '@/hooks/useTeams';
import {
  type DispatchCandidateItem,
  rescueRequestService,
  type DispatchPreviewResponseDto,
  type RescueBatchQueueItem,
  type RescueBatchQueueResponseDto,
} from '@/services/rescueRequestService';
import { cn } from '@/lib/utils';
import {
  getRescueRequestTypeLabel,
  getPriorityLevelLabel,
  RescueRequestStatus,
  RescueRequestStatusLabel,
} from '@/enums/beEnums';
import { toast } from 'sonner';

// ─── Constants ────────────────────────────────────────────────────────────────
const GOONG_MAP_KEY = import.meta.env.VITE_GOONG_MAP_KEY || '';
const NORMAL_THRESHOLD_KM = 2;
const EMERGENCY_THRESHOLD_KM = 3;
const AUTO_REFRESH_MS = 10_000;
const ROUTE_SOURCE_ID = 'dispatch-route-source';
const ROUTE_LAYER_ID = 'dispatch-route-layer';
const BUFFER_SOURCE_ID = 'dispatch-buffer-source';
const BUFFER_FILL_LAYER_ID = 'dispatch-buffer-fill';
const BUFFER_OUTLINE_LAYER_ID = 'dispatch-buffer-outline';

type Coordinate = { lat: number; lng: number };

// ─── Pure helpers ─────────────────────────────────────────────────────────────
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

function toCoordinate(lat?: number | null, lng?: number | null): Coordinate | null {
  const validLat = Number(lat);
  const validLng = Number(lng);
  if (!Number.isFinite(validLat) || !Number.isFinite(validLng)) return null;
  return { lat: validLat, lng: validLng };
}

function buildRouteBufferPolygon(coords: Array<[number, number]>, radiusKm: number) {
  if (coords.length < 2) return [];
  const radiusDeg = radiusKm / 111;
  const polygon: number[][] = [];
  for (const [lng, lat] of coords) polygon.push([lng - radiusDeg, lat + radiusDeg]);
  for (let i = coords.length - 1; i >= 0; i--) {
    const [lng, lat] = coords[i];
    polygon.push([lng + radiusDeg, lat - radiusDeg]);
  }
  polygon.push(polygon[0]);
  return polygon;
}

function requestBadgeClass(type?: string | number | null) {
  const key = String(type ?? '').toLowerCase();
  if (key === 'emergency' || key === '1') return 'bg-red-100 text-red-700 border-red-300';
  return 'bg-slate-100 text-slate-700 border-slate-300';
}

function priorityLevelClass(value?: string | number | null) {
  const label = getPriorityLevelLabel(value).toLowerCase();
  if (label === 'khẩn cấp') return 'bg-red-100 text-red-700 border-red-200';
  if (label === 'cao') return 'bg-orange-100 text-orange-700 border-orange-200';
  if (label === 'trung bình') return 'bg-yellow-100 text-yellow-700 border-yellow-200';
  return 'bg-green-100 text-green-700 border-green-200';
}

function queueStatusClass(status?: string | null) {
  const n = String(status ?? '')
    .trim()
    .toLowerCase();
  if (n === 'inprogress') return 'bg-blue-100 text-blue-700 border-blue-200';
  if (n === 'preview') return 'bg-violet-100 text-violet-700 border-violet-200';
  if (n === 'pending') return 'bg-amber-100 text-amber-700 border-amber-200';
  return 'bg-slate-100 text-slate-600 border-slate-200';
}

function queueRowLeftBorder(status?: string | null, variant: 'active' | 'preview' = 'active') {
  const n = String(status ?? '')
    .trim()
    .toLowerCase();
  if (n === 'inprogress') return 'border-l-blue-500';
  if (n === 'preview') return 'border-l-violet-500';
  return variant === 'preview' ? 'border-l-violet-300' : 'border-l-border';
}

function actionLabel(action?: string | null) {
  switch (action) {
    case 'AssignAsInProgress':
      return 'Chen ngang nhiệm vụ hiện tại';
    case 'AssignAndInsertQueue':
      return 'Chèn vào hàng đợi';
    case 'AssignQueueTail':
      return 'Thêm cuối hàng đợi';
    case 'Reject':
      return 'Không nên điều phối';
    default:
      return action || '--';
  }
}

function fmtKm(v?: number | null) {
  if (v == null || !Number.isFinite(v)) return '--';
  return `${v.toLocaleString('vi-VN', { minimumFractionDigits: v < 10 ? 1 : 0, maximumFractionDigits: v < 10 ? 1 : 0 })} km`;
}
function fmtMin(v?: number | null) {
  if (v == null || !Number.isFinite(v)) return '--';
  return `${Math.round(v)} phút`;
}

function normalizeStatus(value?: string | number | null): string {
  if (value == null) return '';
  if (typeof value === 'number') {
    const map: Record<number, string> = {
      [RescueRequestStatus.Pending]: 'pending',
      [RescueRequestStatus.Verified]: 'verified',
      [RescueRequestStatus.Assigned]: 'assigned',
      [RescueRequestStatus.InProgress]: 'inprogress',
      [RescueRequestStatus.Completed]: 'completed',
      [RescueRequestStatus.Cancelled]: 'cancelled',
    };
    return map[value] ?? String(value).toLowerCase();
  }
  return value.trim().toLowerCase();
}

function getBlockReason(req: DispatchCandidateItem): string | null {
  // backend đã đánh dấu không thể dispatch
  if (req.canDispatch === false)
    return req.dispatchBlockReason || 'Request này hiện không thể điều phối.';

  const status = normalizeStatus(req.rescueRequestStatus);

  if (
    status === 'pending' ||
    status === '0' ||
    status === RescueRequestStatusLabel[RescueRequestStatus.Pending].toLowerCase()
  )
    return 'Request đang chờ xác minh, chưa thể điều phối.';

  if (status === 'inprogress' || status === '3')
    return 'Request đang được thực hiện, không thể điều phối lại.';

  if (status === 'assigned' || status === '2') return 'Request đã được gán cho đội khác.';

  if (status === 'completed' || status === '4') return 'Request đã hoàn thành.';

  if (status === 'cancelled' || status === '5') return 'Request đã bị huỷ.';

  // đang trong queue active của team khác
  if (req.isInOtherActiveBatch) return 'Request đang nằm trong queue của đội khác.';

  // đã assign cho team cụ thể (nhưng status chưa cập nhật kịp)
  if (req.alreadyAssignedTeamId) return 'Request đã được gán, không thể điều phối thêm.';

  return null;
}

// ─── Queue row component ──────────────────────────────────────────────────────
function QueueRow({
  item,
  index,
  variant = 'active',
}: {
  item: RescueBatchQueueItem;
  index: number;
  variant?: 'active' | 'preview';
}) {
  const statusText = item.status || (variant === 'preview' ? 'Pending' : '--');
  const isInProgress = String(statusText).toLowerCase() === 'inprogress';

  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-lg border border-l-4 bg-card px-3 py-2.5 transition-colors',
        queueRowLeftBorder(statusText, variant),
        isInProgress && 'bg-blue-50/50',
      )}
    >
      {/* index */}
      <span
        className={cn(
          'flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold',
          variant === 'preview' ? 'bg-violet-600 text-white' : 'bg-slate-800 text-white',
        )}
      >
        {index + 1}
      </span>

      {/* main info */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">
          {item.address || item.rescueRequestId}
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px]">
          <span
            className={cn(
              'rounded border px-1.5 py-0.5 font-semibold',
              requestBadgeClass(item.rescueRequestType),
            )}
          >
            {getRescueRequestTypeLabel(item.rescueRequestType)}
          </span>
          <span
            className={cn(
              'rounded border px-1.5 py-0.5 font-semibold',
              priorityLevelClass(item.priorityLevel),
            )}
          >
            {getPriorityLevelLabel(item.priorityLevel)}
          </span>
          <span className="text-muted-foreground">·</span>
          <span className="text-muted-foreground">{fmtKm(item.distanceKm)}</span>
          <span className="text-muted-foreground">·</span>
          <span className="text-muted-foreground">{fmtMin(item.estimatedMinutes)}</span>
        </div>
      </div>

      {/* status badge */}
      <span
        className={cn(
          'shrink-0 rounded border px-2 py-0.5 text-[11px] font-semibold',
          queueStatusClass(statusText),
        )}
      >
        {statusText}
      </span>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function DispatchPage() {
  const { station } = useMyReliefStation();
  const { teams, isLoading: isTeamsLoading } = useTeamsInStation(station?.reliefStationId);

  const [selectedTeamId, setSelectedTeamId] = useState('');
  const [selectedRequestId, setSelectedRequestId] = useState('');
  const [allowPreempt, setAllowPreempt] = useState(true);
  const [assignNote, setAssignNote] = useState('Điều phối theo route gần nhất');
  const [search, setSearch] = useState('');
  const [activeBatch, setActiveBatch] = useState<RescueBatchQueueResponseDto | null>(null);
  const [preview, setPreview] = useState<DispatchPreviewResponseDto | null>(null);
  const [candidates, setCandidates] = useState<DispatchCandidateItem[]>([]);
  const [isBatchLoading, setIsBatchLoading] = useState(false);
  const [isCandidatesLoading, setIsCandidatesLoading] = useState(false);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);
  const [queueTab, setQueueTab] = useState<'current' | 'preview'>('current');

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<GoongMap | null>(null);
  const markersRef = useRef<Marker[]>([]);

  const selectedRequest = useMemo(
    () => candidates.find((r) => r.requestId === selectedRequestId) || null,
    [candidates, selectedRequestId],
  );

  const previewPayload = useMemo(
    () => ({
      teamId: selectedTeamId,
      allowPreempt,
      normalNearRouteThresholdKm: NORMAL_THRESHOLD_KM,
      emergencyNearRouteThresholdKm: EMERGENCY_THRESHOLD_KM,
    }),
    [selectedTeamId, allowPreempt],
  );

  // ── auto-select first valid candidate ──────────────────────────────────────
  useEffect(() => {
    if (!selectedRequestId && candidates.length > 0) {
      const next = candidates.find((c) => !getBlockReason(c)) || candidates[0];
      setSelectedRequestId(next.requestId);
    }
  }, [candidates, selectedRequestId]);

  // ── team defaults ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!selectedTeamId && teams.length > 0) setSelectedTeamId(teams[0].teamId);
  }, [teams, selectedTeamId]);

  // ── map init ───────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapContainerRef.current || !GOONG_MAP_KEY || mapRef.current) return;
    goongjs.accessToken = GOONG_MAP_KEY;
    mapRef.current = new goongjs.Map({
      container: mapContainerRef.current,
      style: 'https://tiles.goong.io/assets/goong_map_web.json',
      center: [108.2022, 16.0544],
      zoom: 8,
    });
    return () => {
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  // ── data loaders ───────────────────────────────────────────────────────────
  const loadActiveBatch = useCallback(
    async (teamId: string): Promise<RescueBatchQueueResponseDto | null> => {
      if (!teamId) return null;
      setIsBatchLoading(true);
      try {
        const data = await rescueRequestService.getActiveBatch(teamId);
        setActiveBatch(data);
        return data;
      } catch (e: any) {
        toast.error(e?.response?.data?.message || 'Không tải được queue hiện tại.');
        setActiveBatch(null);
        return null;
      } finally {
        setIsBatchLoading(false);
      }
    },
    [],
  );

  const loadCandidates = useCallback(async (teamId: string, keyword?: string) => {
    if (!teamId) {
      setCandidates([]);
      return;
    }
    setIsCandidatesLoading(true);
    try {
      const data = await rescueRequestService.getDispatchCandidates(teamId, 1, 50, keyword);
      setCandidates(data.items || []);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Không tải được dispatch candidates.');
      setCandidates([]);
    } finally {
      setIsCandidatesLoading(false);
    }
  }, []);

  // team change → load batch trước, chỉ load candidates nếu team có active batch
  useEffect(() => {
    setSelectedRequestId('');
    setPreview(null);
    setCandidates([]);
    void (async () => {
      const batch = await loadActiveBatch(selectedTeamId);
      const hasBatch = (batch?.items?.length ?? 0) > 0;
      if (hasBatch) {
        void loadCandidates(selectedTeamId, search);
      }
    })();
  }, [selectedTeamId]); // eslint-disable-line react-hooks/exhaustive-deps

  // search debounce – chỉ chạy nếu team có active batch
  useEffect(() => {
    if (!activeBatch?.items?.length) return;
    const t = setTimeout(() => void loadCandidates(selectedTeamId, search), 250);
    return () => clearTimeout(t);
  }, [selectedTeamId, search, loadCandidates, activeBatch]);

  // ── auto-refresh batch every 10s ───────────────────────────────────────────
  useEffect(() => {
    if (!selectedTeamId) return;
    const id = setInterval(async () => {
      const batch = await loadActiveBatch(selectedTeamId);
      if (!batch?.items?.length) {
        setCandidates([]);
        setSelectedRequestId('');
        setPreview(null);
      }
    }, AUTO_REFRESH_MS);
    return () => clearInterval(id);
  }, [selectedTeamId, loadActiveBatch]);

  // ── handlers ───────────────────────────────────────────────────────────────
  const handlePreview = async () => {
    if (!selectedTeamId || !selectedRequestId) return;
    setIsPreviewLoading(true);
    try {
      setPreview(await rescueRequestService.dispatchPreview(selectedRequestId, previewPayload));
      setQueueTab('preview');
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Không thể preview điều phối.');
      setPreview(null);
    } finally {
      setIsPreviewLoading(false);
    }
  };

  const handleSmartAssign = async () => {
    if (!selectedTeamId || !selectedRequestId) return;
    setIsAssigning(true);
    try {
      const updated = await rescueRequestService.smartAssign(selectedRequestId, {
        ...previewPayload,
        note: assignNote.trim() || undefined,
      });
      setActiveBatch(updated);
      await rescueRequestService.recalculateEta(selectedTeamId);
      await loadCandidates(selectedTeamId, search);
      toast.success('Đã điều phối thành công.');
      await handlePreview();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Smart assign thất bại.');
    } finally {
      setIsAssigning(false);
    }
  };

  // ── map effect: markers + route + buffer + insert point ───────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    const bounds = new goongjs.LngLatBounds();
    let hasBounds = false;

    const addMarker = (label: string, bg: string, textColor: string, coord: Coordinate) => {
      const el = document.createElement('div');
      el.style.cssText = 'display:flex;align-items:center;gap:4px;';
      el.innerHTML = `
        <span style="width:12px;height:12px;background:${bg};border-radius:50%;box-shadow:0 0 0 3px ${bg}33;flex-shrink:0;"></span>
        <span style="font-size:11px;font-weight:700;background:${bg};color:${textColor};padding:2px 7px;border-radius:999px;white-space:nowrap;box-shadow:0 1px 4px rgba(0,0,0,.2);">${label}</span>
      `;
      const marker = new goongjs.Marker({ element: el })
        .setLngLat([coord.lng, coord.lat])
        .addTo(map);
      markersRef.current.push(marker);
      bounds.extend([coord.lng, coord.lat]);
      hasBounds = true;
    };

    // queue items
    (activeBatch?.items || []).forEach((item, index) => {
      const coord = toCoordinate(item.latitude, item.longitude);
      if (!coord) return;
      const isIP = item.status === 'InProgress';
      addMarker(
        isIP ? '▶ Đang xử lý' : `Q${index + 1}`,
        isIP ? '#2563eb' : '#475569',
        '#fff',
        coord,
      );
    });

    // new request – orange, larger
    const newCoord = toCoordinate(selectedRequest?.latitude, selectedRequest?.longitude);
    if (newCoord) {
      addMarker('🆕 Request mới', '#f97316', '#fff', newCoord);
    }

    // clear route layers helper
    const clearLayer = (id: string) => {
      if ((map as any).getLayer(id)) (map as any).removeLayer(id);
    };
    const clearSource = (id: string) => {
      if ((map as any).getSource(id)) (map as any).removeSource(id);
    };
    clearLayer(ROUTE_LAYER_ID);
    clearSource(ROUTE_SOURCE_ID);
    clearLayer(BUFFER_FILL_LAYER_ID);
    clearLayer(BUFFER_OUTLINE_LAYER_ID);
    clearSource(BUFFER_SOURCE_ID);

    const polyline = preview?.currentRoutePolyline;
    if (polyline) {
      const routeCoords = decodePolyline(polyline);
      if (routeCoords.length >= 2) {
        routeCoords.forEach((c) => {
          bounds.extend(c);
          hasBounds = true;
        });

        // route line
        (map as any).addSource(ROUTE_SOURCE_ID, {
          type: 'geojson',
          data: {
            type: 'Feature',
            properties: {},
            geometry: { type: 'LineString', coordinates: routeCoords },
          },
        });
        (map as any).addLayer({
          id: ROUTE_LAYER_ID,
          type: 'line',
          source: ROUTE_SOURCE_ID,
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: { 'line-color': '#2563eb', 'line-width': 4, 'line-opacity': 0.85 },
        });

        // buffer zone
        const thresholdKm =
          String(selectedRequest?.rescueRequestType ?? '').toLowerCase() === 'emergency'
            ? EMERGENCY_THRESHOLD_KM
            : NORMAL_THRESHOLD_KM;
        const bufferPolygon = buildRouteBufferPolygon(routeCoords, thresholdKm);
        if (bufferPolygon.length >= 4) {
          (map as any).addSource(BUFFER_SOURCE_ID, {
            type: 'geojson',
            data: {
              type: 'Feature',
              properties: {},
              geometry: { type: 'Polygon', coordinates: [bufferPolygon] },
            },
          });
          (map as any).addLayer({
            id: BUFFER_FILL_LAYER_ID,
            type: 'fill',
            source: BUFFER_SOURCE_ID,
            paint: { 'fill-color': '#38bdf8', 'fill-opacity': 0.1 },
          });
          (map as any).addLayer({
            id: BUFFER_OUTLINE_LAYER_ID,
            type: 'line',
            source: BUFFER_SOURCE_ID,
            paint: { 'line-color': '#0ea5e9', 'line-width': 1.5, 'line-dasharray': [3, 2] },
          });
        }
      }
    }

    if (hasBounds) map.fitBounds(bounds, { padding: 80, maxZoom: 14 });
  }, [activeBatch, preview, selectedRequest]);

  // ── ordered preview items ─────────────────────────────────────────────────
  const orderedPreviewItems = useMemo(() => {
    const batchItems = activeBatch?.items || [];
    const orderMap = new Map(batchItems.map((item) => [item.rescueRequestId, item]));
    if (selectedRequest) {
      orderMap.set(selectedRequest.requestId, {
        rescueRequestId: selectedRequest.requestId,
        rescueRequestType: selectedRequest.rescueRequestType,
        priorityPoint: selectedRequest.priorityPoint,
        priorityLevel: selectedRequest.priorityLevel,
        status: 'Preview',
        address: selectedRequest.address,
        latitude: selectedRequest.latitude,
        longitude: selectedRequest.longitude,
        distanceKm: preview?.distanceFromTeamKm ?? null,
        estimatedMinutes:
          preview?.detourSeconds != null ? Math.round(preview.detourSeconds / 60) : null,
      });
    }
    return (preview?.proposedRequestIdsInOrder || [])
      .map((id) => orderMap.get(id))
      .filter(Boolean) as RescueBatchQueueItem[];
  }, [activeBatch, preview, selectedRequest]);

  const isAssignBlocked =
    !preview?.eligible ||
    !selectedTeamId ||
    !selectedRequestId ||
    isAssigning ||
    Boolean(selectedRequest && getBlockReason(selectedRequest));

  // ── render ────────────────────────────────────────────────────────────────
  return (
    <DashboardLayout projects={coordinatorProjects} navItems={coordinatorNavItems}>
      <div className="space-y-6">
        {/* page header */}
        <div>
          <h1 className="text-3xl font-black text-primary">Smart Dispatch</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Xem queue của team, preview vị trí chèn request mới và điều phối thông minh.
          </p>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[300px_minmax(0,1fr)_340px] gap-5">
          {/* ── COT TRAI: team + candidates ─────────────────────────────── */}
          <Card className="h-fit">
            <CardContent className="p-4 space-y-5">
              {/* team select */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Đội cứu hộ
                </label>
                {isTeamsLoading ? (
                  <Skeleton className="h-9" />
                ) : (
                  <select
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                    value={selectedTeamId}
                    onChange={(e) => setSelectedTeamId(e.target.value)}
                  >
                    <option value="">Chọn đội cứu hộ</option>
                    {teams.map((team) => (
                      <option key={team.teamId} value={team.teamId}>
                        {team.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* candidate list */}
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Request gần route
                </label>
                <input
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                  placeholder="Tìm theo địa chỉ..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />

                {isBatchLoading ? (
                  <div className="space-y-2 pt-1">
                    {[1, 2].map((k) => (
                      <Skeleton key={k} className="h-14 rounded-lg" />
                    ))}
                  </div>
                ) : !activeBatch?.items?.length && !isBatchLoading ? (
                  <div className="rounded-lg border border-dashed border-amber-300 bg-amber-50 px-4 py-6 text-center text-sm text-amber-700">
                    <p className="font-semibold">Team chưa có queue active.</p>
                    <p className="mt-1 text-xs text-amber-600">
                      Chỉ có thể điều phối khi team đang có nhiệm vụ trong queue.
                    </p>
                  </div>
                ) : isCandidatesLoading ? (
                  <div className="space-y-2 pt-1">
                    {[1, 2, 3].map((k) => (
                      <Skeleton key={k} className="h-14 rounded-lg" />
                    ))}
                  </div>
                ) : candidates.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-border bg-accent/20 py-6 text-center text-sm text-muted-foreground">
                    Không có request phù hợp.
                  </p>
                ) : (
                  <div className="space-y-1.5 max-h-[560px] overflow-auto pr-0.5">
                    {candidates.map((req) => {
                      const isActive = req.requestId === selectedRequestId;
                      const blockReason = getBlockReason(req);
                      const isBlocked = Boolean(blockReason);
                      const pLevel = getPriorityLevelLabel(req.priorityLevel);
                      return (
                        <button
                          key={req.requestId}
                          onClick={() => {
                            if (!isBlocked) setSelectedRequestId(req.requestId);
                          }}
                          disabled={isBlocked}
                          title={blockReason || ''}
                          className={cn(
                            'w-full text-left rounded-lg border px-3 py-2.5 transition-all text-sm',
                            isBlocked
                              ? 'cursor-not-allowed opacity-50 bg-slate-50'
                              : isActive
                                ? 'border-primary bg-primary/5 shadow-sm'
                                : 'border-border hover:border-primary/40 hover:bg-accent/30',
                          )}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <p className="font-semibold leading-5 truncate flex-1">
                              {req.reporterFullName || 'Không có tên'}
                            </p>
                            <span
                              className={cn(
                                'shrink-0 rounded border px-1.5 py-0.5 text-[11px] font-semibold',
                                requestBadgeClass(req.rescueRequestType),
                              )}
                            >
                              {getRescueRequestTypeLabel(req.rescueRequestType)}
                            </span>
                          </div>
                          <p className="mt-1 text-xs text-muted-foreground truncate">
                            {req.address || '--'}
                          </p>
                          <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
                            <span
                              className={cn(
                                'rounded border px-1.5 py-0.5 text-[11px] font-semibold',
                                priorityLevelClass(req.priorityLevel),
                              )}
                            >
                              {pLevel}
                            </span>
                            <span className="text-[11px] text-muted-foreground">
                              điểm {req.priorityPoint ?? '--'}
                            </span>
                          </div>
                          {blockReason && (
                            <p className="mt-1.5 text-[11px] text-amber-700 bg-amber-50 rounded px-2 py-1">
                              ⚠ {blockReason}
                            </p>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* ── COT GIUA: map + queue ────────────────────────────────────── */}
          <Card>
            <CardContent className="p-4 space-y-4">
              {/* map header */}
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <p className="text-sm font-semibold">Bản đồ route &amp; buffer zone</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    🔵 Route hiện tại &nbsp;·&nbsp; 🟠 Request mới &nbsp;·&nbsp;
                    <span className="text-sky-500">
                      Vùng buffer {NORMAL_THRESHOLD_KM}–{EMERGENCY_THRESHOLD_KM} km
                    </span>
                  </p>
                </div>
                <Button
                  onClick={handlePreview}
                  disabled={
                    !selectedTeamId ||
                    !selectedRequestId ||
                    isPreviewLoading ||
                    Boolean(selectedRequest && getBlockReason(selectedRequest))
                  }
                >
                  {isPreviewLoading ? 'Đang xử lý...' : 'Preview điều phối'}
                </Button>
              </div>

              {/* map */}
              {!GOONG_MAP_KEY ? (
                <div className="rounded-lg border border-dashed border-border bg-accent/20 p-6 text-sm text-muted-foreground text-center">
                  Thiếu VITE_GOONG_MAP_KEY để hiển thị bản đồ.
                </div>
              ) : (
                <div className="rounded-lg overflow-hidden border border-border">
                  <div ref={mapContainerRef} className="h-[460px] w-full" />
                </div>
              )}

              {/* queue tabs */}
              <div className="rounded-lg border border-border overflow-hidden">
                {/* tab bar */}
                <div className="flex border-b border-border">
                  <button
                    onClick={() => setQueueTab('current')}
                    className={cn(
                      'flex-1 px-4 py-2.5 text-sm font-semibold transition-colors',
                      queueTab === 'current'
                        ? 'bg-background text-foreground border-b-2 border-primary'
                        : 'bg-accent/30 text-muted-foreground hover:text-foreground',
                    )}
                  >
                    Queue hiện tại
                    <span
                      className={cn(
                        'ml-2 rounded-full px-2 py-0.5 text-[11px] font-bold',
                        queueTab === 'current'
                          ? 'bg-primary/10 text-primary'
                          : 'bg-muted text-muted-foreground',
                      )}
                    >
                      {(activeBatch?.items || []).length}
                    </span>
                  </button>
                  <button
                    onClick={() => {
                      if (preview) setQueueTab('preview');
                    }}
                    disabled={!preview}
                    className={cn(
                      'flex-1 px-4 py-2.5 text-sm font-semibold transition-colors',
                      !preview && 'cursor-not-allowed opacity-40',
                      queueTab === 'preview'
                        ? 'bg-background text-foreground border-b-2 border-violet-500'
                        : 'bg-accent/30 text-muted-foreground hover:text-foreground',
                    )}
                  >
                    Đề xuất sau preview
                    <span
                      className={cn(
                        'ml-2 rounded-full px-2 py-0.5 text-[11px] font-bold',
                        queueTab === 'preview'
                          ? 'bg-violet-100 text-violet-700'
                          : 'bg-muted text-muted-foreground',
                      )}
                    >
                      {orderedPreviewItems.length}
                    </span>
                  </button>
                </div>

                {/* tab content */}
                <div className="p-3 space-y-1.5 max-h-[340px] overflow-auto">
                  {queueTab === 'current' ? (
                    isBatchLoading ? (
                      <div className="space-y-2">
                        {[1, 2, 3].map((k) => (
                          <Skeleton key={k} className="h-14 rounded-lg" />
                        ))}
                      </div>
                    ) : activeBatch?.items?.length ? (
                      activeBatch.items.map((item, i) => (
                        <QueueRow
                          key={item.rescueRequestId}
                          item={item}
                          index={i}
                          variant="active"
                        />
                      ))
                    ) : (
                      <p className="py-6 text-center text-sm text-muted-foreground">
                        Team chưa có queue active.
                      </p>
                    )
                  ) : orderedPreviewItems.length ? (
                    orderedPreviewItems.map((item, i) => (
                      <QueueRow
                        key={item.rescueRequestId}
                        item={item}
                        index={i}
                        variant="preview"
                      />
                    ))
                  ) : (
                    <p className="py-6 text-center text-sm text-muted-foreground">
                      Chưa có dữ liệu preview.
                    </p>
                  )}
                </div>

                {/* footer refresh */}
                <div className="flex items-center justify-between border-t border-border bg-accent/20 px-3 py-2">
                  <span className="text-[11px] text-muted-foreground">
                    Tự động làm mới mỗi {AUTO_REFRESH_MS / 1000}s
                  </span>
                  <button
                    onClick={() => void loadActiveBatch(selectedTeamId)}
                    disabled={!selectedTeamId || isBatchLoading}
                    className="text-[11px] font-semibold text-primary hover:underline disabled:opacity-40"
                  >
                    Tải lại ngay
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ── COT PHAI: smart preview + assign ────────────────────────── */}
          <Card className="h-fit">
            <CardContent className="p-4 space-y-4">
              {/* header */}
              <div>
                <p className="text-sm font-semibold">Smart Preview &amp; Assign</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Bấm <strong>Preview</strong> để hệ thống mô phỏng vị trí chèn tối ưu, sau đó xác
                  nhận assign.
                </p>
              </div>

              {/* preempt toggle */}
              <div className="flex items-center justify-between rounded-lg border border-border bg-accent/20 px-3 py-2.5">
                <div>
                  <p className="text-sm font-medium">Cho phép chen ngang</p>
                  <p className="text-xs text-muted-foreground">Request khẩn cấp gần route.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setAllowPreempt((v) => !v)}
                  className={cn(
                    'relative h-6 w-11 rounded-full transition-colors',
                    allowPreempt ? 'bg-blue-600' : 'bg-slate-300',
                  )}
                >
                  <span
                    className={cn(
                      'absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform',
                      allowPreempt ? 'translate-x-5' : 'translate-x-0.5',
                    )}
                  />
                </button>
              </div>

              {/* preview results */}
              {!preview ? (
                <div className="rounded-lg border border-dashed border-border bg-accent/20 px-4 py-8 text-center text-sm text-muted-foreground">
                  Chọn team + request, bấm <strong>Preview điều phối</strong>.
                </div>
              ) : (
                <div className="space-y-3">
                  {preview.willPreemptCurrentInProgress && (
                    <div className="rounded-lg border border-red-300 bg-red-50 px-3 py-2.5">
                      <p className="text-sm font-bold text-red-700">
                        ⚠ Đề xuất chen ngang nhiệm vụ hiện tại
                      </p>
                    </div>
                  )}

                  {/* action highlight */}
                  <div className="rounded-lg border border-border bg-accent/20 px-3 py-2.5">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Action đề xuất
                    </p>
                    <p className="mt-1 text-sm font-semibold text-foreground">
                      {actionLabel(preview.recommendedAction)}
                    </p>
                  </div>

                  {/* stats grid */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {[
                      { label: 'Gần route', value: preview.isNearCurrentRoute ? 'Có ✓' : 'Không' },
                      { label: 'Backtrack', value: preview.requiresBacktrack ? 'Có' : 'Không ✓' },
                      {
                        label: 'Detour',
                        value:
                          preview.detourMeters != null
                            ? `${preview.detourMeters.toLocaleString('vi-VN')} m`
                            : '--',
                      },
                      {
                        label: 'Detour thời gian',
                        value:
                          preview.detourSeconds != null
                            ? `${Math.round(preview.detourSeconds / 60)} phút`
                            : '--',
                      },
                      {
                        label: 'Cách route',
                        value:
                          preview.minDistanceToCurrentRouteMeters != null
                            ? `${preview.minDistanceToCurrentRouteMeters.toLocaleString('vi-VN')} m`
                            : '--',
                      },
                      {
                        label: 'Eligibility',
                        value: preview.eligible ? '✓ Đủ điều kiện' : '✗ Không đủ',
                      },
                    ].map(({ label, value }) => (
                      <div
                        key={label}
                        className="rounded-lg border border-border bg-background px-2.5 py-2"
                      >
                        <p className="text-muted-foreground">{label}</p>
                        <p className="mt-0.5 font-semibold text-foreground">{value}</p>
                      </div>
                    ))}
                  </div>

                  {/* reasons */}
                  {preview.reasons?.length ? (
                    <div className="rounded-lg border border-border bg-background px-3 py-2.5">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">
                        Lý do từ hệ thống
                      </p>
                      <ul className="space-y-1 text-xs text-muted-foreground list-disc pl-4">
                        {preview.reasons.map((r, i) => (
                          <li key={i}>{r}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </div>
              )}

              {/* note */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Ghi chú khi assign
                </label>
                <Textarea
                  value={assignNote}
                  onChange={(e) => setAssignNote(e.target.value)}
                  placeholder="Nhập ghi chú điều phối (tuỳ chọn)..."
                  className="text-sm"
                  rows={2}
                />
              </div>

              {/* CTAs */}
              <div className="flex flex-col gap-2">
                <Button
                  size="lg"
                  disabled={isAssignBlocked}
                  onClick={handleSmartAssign}
                  className={cn(
                    'font-bold',
                    preview?.willPreemptCurrentInProgress
                      ? 'bg-red-600 hover:bg-red-500 text-white'
                      : 'bg-primary hover:bg-primary/90 text-primary-foreground',
                  )}
                >
                  {isAssigning
                    ? 'Đang điều phối...'
                    : preview?.willPreemptCurrentInProgress
                      ? '⚡ Xác nhận chen ngang'
                      : '✓ Xác nhận Assign'}
                </Button>
                {!preview?.eligible && preview && (
                  <p className="text-center text-xs text-destructive">
                    Request không đủ điều kiện để assign.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
