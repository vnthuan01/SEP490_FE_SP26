import { type MutableRefObject, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import goongjs, { type Map as GoongMap, type Marker } from '@goongmaps/goong-js';
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  ListOrdered,
  MapPinned,
  Maximize2,
  Minimize2,
  RefreshCcw,
  Route,
  Search,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { coordinatorNavGroups } from './components/sidebarConfig';
import { useMyReliefStation } from '@/hooks/useReliefStation';
import { useTeamLatestTracking, useTeamsInStation } from '@/hooks/useTeams';
import {
  type DispatchCandidateItem,
  type DispatchPreviewResponseDto,
  rescueRequestService,
  type RescueBatchQueueItem,
  type RescueBatchQueueResponseDto,
  type RescueRequestPaging,
} from '@/services/rescueRequestService';
import { cn } from '@/lib/utils';
import {
  getPriorityLevelLabel,
  getRescueRequestTypeLabel,
  RescueRequestStatus,
  RescueRequestStatusLabel,
} from '@/enums/beEnums';
import { toast } from 'sonner';

const GOONG_MAP_KEY = import.meta.env.VITE_GOONG_MAP_KEY || '';
const NORMAL_THRESHOLD_KM = 2;
const EMERGENCY_THRESHOLD_KM = 3;
const AUTO_REFRESH_MS = 10_000;
const CANDIDATE_PAGE_SIZE = 8;
const NOT_FOUND_TOAST_COOLDOWN_MS = 30_000;
const ROUTE_SOURCE_ID = 'dispatch-route-source';
const ROUTE_LAYER_ID = 'dispatch-route-layer';
const BUFFER_SOURCE_ID = 'dispatch-buffer-source';
const BUFFER_FILL_LAYER_ID = 'dispatch-buffer-fill';
const BUFFER_OUTLINE_LAYER_ID = 'dispatch-buffer-outline';

type Coordinate = { lat: number; lng: number };
type LoadOptions = { silentNotFound?: boolean };
type MapRenderOptions = { fitPadding?: number };

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
  if (key === 'emergency' || key === '1') return 'border-red-300 bg-red-100 text-red-700';
  return 'border-slate-300 bg-slate-100 text-slate-700';
}

function priorityLevelClass(value?: string | number | null) {
  const label = getPriorityLevelLabel(value).toLowerCase();
  if (label === 'khẩn cấp') return 'border-red-200 bg-red-100 text-red-700';
  if (label === 'cao') return 'border-orange-200 bg-orange-100 text-orange-700';
  if (label === 'trung bình') return 'border-yellow-200 bg-yellow-100 text-yellow-700';
  return 'border-green-200 bg-green-100 text-green-700';
}

function queueStatusClass(status?: string | null) {
  const n = String(status ?? '')
    .trim()
    .toLowerCase();
  if (n === 'inprogress') return 'border-blue-200 bg-blue-100 text-blue-700';
  if (n === 'preview') return 'border-violet-200 bg-violet-100 text-violet-700';
  if (n === 'pending') return 'border-amber-200 bg-amber-100 text-amber-700';
  return 'border-slate-200 bg-slate-100 text-slate-600';
}

function queueStatusLabel(status?: string | null) {
  const n = String(status ?? '')
    .trim()
    .toLowerCase();
  if (n === 'inprogress') return 'Đang xử lý';
  if (n === 'preview') return 'Xem trước';
  if (n === 'pending') return 'Chờ thực hiện';
  if (n === 'completed') return 'Hoàn thành';
  if (n === 'cancelled') return 'Đã hủy';
  return status || '--';
}

function queueRowLeftBorder(status?: string | null, variant: 'active' | 'preview' = 'active') {
  const n = String(status ?? '')
    .trim()
    .toLowerCase();
  if (n === 'inprogress') return 'border-l-blue-500';
  if (n === 'preview') return 'border-l-violet-500';
  return variant === 'preview' ? 'border-l-violet-300' : 'border-l-border';
}

function getApiErrorMessage(error: any, fallback: string, notFoundMessage?: string) {
  if (error?.response?.status === 404 && notFoundMessage) return notFoundMessage;
  return error?.response?.data?.message || fallback;
}

function actionLabel(action?: string | null) {
  switch (action) {
    case 'AssignAsInProgress':
      return 'Chèn ngang nhiệm vụ hiện tại';
    case 'AssignAndInsertQueue':
      return 'Chèn vào hàng đợi';
    case 'AssignQueueTail':
      return 'Thêm vào cuối hàng đợi';
    case 'Reject':
      return 'Không nên điều phối';
    default:
      return action || '--';
  }
}

function fmtKm(v?: number | null) {
  if (v == null || !Number.isFinite(v)) return '--';
  return `${v.toLocaleString('vi-VN', {
    minimumFractionDigits: v < 10 ? 1 : 0,
    maximumFractionDigits: v < 10 ? 1 : 0,
  })} km`;
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
  if (req.canDispatch === false) {
    return req.dispatchBlockReason || 'Yêu cầu này hiện không thể điều phối.';
  }

  const status = normalizeStatus(req.rescueRequestStatus);

  if (
    status === 'pending' ||
    status === '0' ||
    status === RescueRequestStatusLabel[RescueRequestStatus.Pending].toLowerCase()
  ) {
    return 'Yêu cầu đang chờ xác minh, chưa thể điều phối.';
  }

  if (status === 'inprogress' || status === '3') {
    return 'Yêu cầu đang được thực hiện, không thể điều phối lại.';
  }

  if (status === 'assigned' || status === '2') return 'Yêu cầu đã được gán cho đội khác.';
  if (status === 'completed' || status === '4') return 'Yêu cầu đã hoàn thành.';
  if (status === 'cancelled' || status === '5') return 'Yêu cầu đã bị hủy.';
  if (req.isInOtherActiveBatch) return 'Yêu cầu đang nằm trong hàng đợi của đội khác.';
  if (req.alreadyAssignedTeamId) return 'Yêu cầu đã được gán, không thể điều phối thêm.';

  return null;
}

function StatCard({
  label,
  value,
  icon: Icon,
  toneClass,
}: {
  label: string;
  value: string | number;
  icon: LucideIcon;
  toneClass: string;
}) {
  return (
    <Card className="overflow-hidden rounded-3xl border-border/70 bg-card/95 shadow-sm backdrop-blur-sm">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              {label}
            </p>
            <p className="mt-3 truncate text-3xl font-black text-foreground">{value}</p>
          </div>
          <div
            className={cn('flex size-12 items-center justify-center rounded-2xl border', toneClass)}
          >
            <Icon className="size-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

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
        'flex items-center gap-3 rounded-2xl border border-l-4 bg-card px-3 py-3 transition-colors',
        queueRowLeftBorder(statusText, variant),
        isInProgress && 'bg-blue-50/60',
      )}
    >
      <span
        className={cn(
          'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold',
          variant === 'preview' ? 'bg-violet-600 text-white' : 'bg-slate-800 text-white',
        )}
      >
        {index + 1}
      </span>

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

      <span
        className={cn(
          'shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-semibold',
          queueStatusClass(statusText),
        )}
      >
        {queueStatusLabel(statusText)}
      </span>
    </div>
  );
}

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
  const [candidatePaging, setCandidatePaging] = useState<RescueRequestPaging | null>(null);
  const [candidatePage, setCandidatePage] = useState(1);
  const [isBatchLoading, setIsBatchLoading] = useState(false);
  const [isCandidatesLoading, setIsCandidatesLoading] = useState(false);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);
  const [isMapExpanded, setIsMapExpanded] = useState(false);
  const [queueTab, setQueueTab] = useState<'current' | 'preview'>('current');

  const { trackingPoints } = useTeamLatestTracking(selectedTeamId, 1);

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<GoongMap | null>(null);
  const markersRef = useRef<Marker[]>([]);
  const expandedMapContainerRef = useRef<HTMLDivElement | null>(null);
  const expandedMapRef = useRef<GoongMap | null>(null);
  const expandedMarkersRef = useRef<Marker[]>([]);
  const toastCooldownRef = useRef<Record<string, number>>({});

  const trimmedSearch = search.trim();

  const selectedRequest = useMemo(
    () => candidates.find((r) => r.requestId === selectedRequestId) || null,
    [candidates, selectedRequestId],
  );

  const selectedTeamName = useMemo(
    () => teams.find((team) => team.teamId === selectedTeamId)?.name || '--',
    [teams, selectedTeamId],
  );

  const selectedTeamCoordinate = useMemo(() => {
    const latestPoint = trackingPoints?.[0];
    return toCoordinate(latestPoint?.latitude, latestPoint?.longitude);
  }, [trackingPoints]);

  const previewPayload = useMemo(
    () => ({
      teamId: selectedTeamId,
      allowPreempt,
      normalNearRouteThresholdKm: NORMAL_THRESHOLD_KM,
      emergencyNearRouteThresholdKm: EMERGENCY_THRESHOLD_KM,
    }),
    [selectedTeamId, allowPreempt],
  );

  const candidateCurrentPage = candidatePaging?.currentPage ?? candidatePage;
  const candidateTotalPages = Math.max(candidatePaging?.totalPages ?? 1, 1);
  const selectedRequestBlockReason = selectedRequest ? getBlockReason(selectedRequest) : null;

  const showErrorToast = useCallback(
    (key: string, error: any, fallback: string, notFoundMessage?: string) => {
      const is404 = error?.response?.status === 404;

      if (is404) {
        const now = Date.now();
        const lastAt = toastCooldownRef.current[key] ?? 0;
        if (now - lastAt < NOT_FOUND_TOAST_COOLDOWN_MS) return;
        toastCooldownRef.current[key] = now;
      }

      toast.error(getApiErrorMessage(error, fallback, notFoundMessage));
    },
    [],
  );

  const loadActiveBatch = useCallback(
    async (teamId: string, options?: LoadOptions): Promise<RescueBatchQueueResponseDto | null> => {
      if (!teamId) {
        setActiveBatch(null);
        return null;
      }

      setIsBatchLoading(true);

      try {
        const data = await rescueRequestService.getActiveBatch(teamId);
        setActiveBatch(data);
        return data;
      } catch (error: any) {
        const is404 = error?.response?.status === 404;
        if (!(is404 && options?.silentNotFound)) {
          showErrorToast(
            'dispatch-active-batch',
            error,
            'Không tải được hàng đợi hiện tại.',
            'Đội cứu hộ này hiện chưa có hàng đợi hoạt động.',
          );
        }

        setActiveBatch(null);
        return null;
      } finally {
        setIsBatchLoading(false);
      }
    },
    [showErrorToast],
  );

  const loadCandidates = useCallback(
    async (teamId: string, pageNumber: number, keyword?: string, options?: LoadOptions) => {
      if (!teamId) {
        setCandidates([]);
        setCandidatePaging(null);
        return;
      }

      setIsCandidatesLoading(true);

      try {
        const data = await rescueRequestService.getDispatchCandidates(
          teamId,
          pageNumber,
          CANDIDATE_PAGE_SIZE,
          keyword,
        );

        setCandidates(data.items || []);
        setCandidatePaging(data.paging);

        if (data.paging?.currentPage && data.paging.currentPage !== pageNumber) {
          setCandidatePage(data.paging.currentPage);
        }
      } catch (error: any) {
        const is404 = error?.response?.status === 404;
        if (!(is404 && options?.silentNotFound)) {
          showErrorToast(
            'dispatch-candidates',
            error,
            'Không tải được danh sách gợi ý điều phối.',
            'Không tìm thấy yêu cầu phù hợp để điều phối.',
          );
        }

        setCandidates([]);
        setCandidatePaging(null);
      } finally {
        setIsCandidatesLoading(false);
      }
    },
    [showErrorToast],
  );

  const handleRefresh = useCallback(async () => {
    if (!selectedTeamId) return;

    const batch = await loadActiveBatch(selectedTeamId);

    if (!batch?.items?.length) {
      setCandidates([]);
      setCandidatePaging(null);
      setSelectedRequestId('');
      setPreview(null);
      setQueueTab('current');
      return;
    }

    await loadCandidates(selectedTeamId, candidatePage, trimmedSearch, { silentNotFound: true });
  }, [candidatePage, loadActiveBatch, loadCandidates, selectedTeamId, trimmedSearch]);

  useEffect(() => {
    if (!selectedTeamId && teams.length > 0) setSelectedTeamId(teams[0].teamId);
  }, [teams, selectedTeamId]);

  useEffect(() => {
    setCandidatePage(1);
  }, [trimmedSearch, selectedTeamId]);

  useEffect(() => {
    if (candidates.length === 0) {
      if (selectedRequestId) setSelectedRequestId('');
      return;
    }

    if (!candidates.some((candidate) => candidate.requestId === selectedRequestId)) {
      const next = candidates.find((candidate) => !getBlockReason(candidate)) || candidates[0];
      setSelectedRequestId(next.requestId);
    }
  }, [candidates, selectedRequestId]);

  useEffect(() => {
    if (!mapContainerRef.current || !GOONG_MAP_KEY || mapRef.current) return;

    goongjs.accessToken = GOONG_MAP_KEY;
    mapRef.current = new goongjs.Map({
      container: mapContainerRef.current,
      style: 'https://tiles.goong.io/assets/goong_map_web.json',
      center: [108.2022, 16.0544],
      zoom: 8,
    });

    const map = mapRef.current as any;

    const handleMissingImage = (event: any) => {
      if (!event?.id || map.hasImage?.(event.id)) return;
      const bytes = new Uint8Array([0, 0, 0, 0]);
      map.addImage(event.id, { width: 1, height: 1, data: bytes });
    };

    map.on('styleimagemissing', handleMissingImage);

    return () => {
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (
      !isMapExpanded ||
      !expandedMapContainerRef.current ||
      !GOONG_MAP_KEY ||
      expandedMapRef.current
    ) {
      return;
    }

    goongjs.accessToken = GOONG_MAP_KEY;
    expandedMapRef.current = new goongjs.Map({
      container: expandedMapContainerRef.current,
      style: 'https://tiles.goong.io/assets/goong_map_web.json',
      center: [108.2022, 16.0544],
      zoom: 8,
    });

    const map = expandedMapRef.current as any;

    const handleMissingImage = (event: any) => {
      if (!event?.id || map.hasImage?.(event.id)) return;
      const bytes = new Uint8Array([0, 0, 0, 0]);
      map.addImage(event.id, { width: 1, height: 1, data: bytes });
    };

    map.on('styleimagemissing', handleMissingImage);

    return () => {
      expandedMarkersRef.current.forEach((marker) => marker.remove());
      expandedMarkersRef.current = [];
      expandedMapRef.current?.remove();
      expandedMapRef.current = null;
    };
  }, [isMapExpanded]);

  useEffect(() => {
    setSelectedRequestId('');
    setPreview(null);
    setQueueTab('current');
    setCandidates([]);
    setCandidatePaging(null);

    if (!selectedTeamId) {
      setActiveBatch(null);
      return;
    }

    void loadActiveBatch(selectedTeamId, { silentNotFound: true });
  }, [loadActiveBatch, selectedTeamId]);

  useEffect(() => {
    if (!selectedTeamId || !activeBatch?.items?.length) {
      setCandidates([]);
      setCandidatePaging(null);
      return;
    }

    const timeoutId = setTimeout(() => {
      void loadCandidates(selectedTeamId, candidatePage, trimmedSearch, { silentNotFound: true });
    }, 250);

    return () => clearTimeout(timeoutId);
  }, [activeBatch?.items?.length, candidatePage, loadCandidates, selectedTeamId, trimmedSearch]);

  useEffect(() => {
    if (!selectedTeamId) return;

    const intervalId = setInterval(async () => {
      const batch = await loadActiveBatch(selectedTeamId, { silentNotFound: true });

      if (!batch?.items?.length) {
        setCandidates([]);
        setCandidatePaging(null);
        setSelectedRequestId('');
        setPreview(null);
        setQueueTab('current');
        return;
      }

      await loadCandidates(selectedTeamId, candidatePage, trimmedSearch, { silentNotFound: true });
    }, AUTO_REFRESH_MS);

    return () => clearInterval(intervalId);
  }, [candidatePage, loadActiveBatch, loadCandidates, selectedTeamId, trimmedSearch]);

  useEffect(() => {
    setPreview(null);
    setQueueTab('current');
  }, [allowPreempt, selectedRequestId]);

  const handlePreview = async () => {
    if (!selectedTeamId || !selectedRequestId) return;

    setIsPreviewLoading(true);

    try {
      setPreview(await rescueRequestService.dispatchPreview(selectedRequestId, previewPayload));
      setQueueTab('preview');
    } catch (error: any) {
      showErrorToast(
        'dispatch-preview',
        error,
        'Không thể xem trước điều phối.',
        'Không tìm thấy dữ liệu xem trước điều phối.',
      );
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
      await loadCandidates(selectedTeamId, candidatePage, trimmedSearch, { silentNotFound: true });
      toast.success('Đã điều phối thành công.');
      await handlePreview();
    } catch (error: any) {
      showErrorToast(
        'dispatch-assign',
        error,
        'Điều phối thông minh thất bại.',
        'Không tìm thấy dữ liệu điều phối để thực hiện.',
      );
    } finally {
      setIsAssigning(false);
    }
  };

  const renderMapData = useCallback(
    (map: GoongMap | null, markerStore: MutableRefObject<Marker[]>, options?: MapRenderOptions) => {
      if (!map) return;

      markerStore.current.forEach((marker) => marker.remove());
      markerStore.current = [];

      const bounds = new goongjs.LngLatBounds();
      let hasBounds = false;

      const addMarker = (
        label: string,
        bg: string,
        textColor: string,
        coord: Coordinate,
        iconName: string,
      ) => {
        const el = document.createElement('div');
        el.style.cssText = 'display:flex;align-items:center;gap:6px;';
        el.innerHTML = `
          <span style="display:flex;align-items:center;justify-content:center;width:26px;height:26px;border-radius:999px;background:${bg};color:${textColor};box-shadow:0 0 0 3px ${bg}22,0 4px 10px rgba(15,23,42,.18);flex-shrink:0;">
            <span class="material-symbols-outlined" style="font-size:16px;line-height:1;">${iconName}</span>
          </span>
          <span style="font-size:11px;font-weight:700;background:${bg};color:${textColor};padding:3px 8px;border-radius:999px;white-space:nowrap;box-shadow:0 1px 4px rgba(0,0,0,.2);">${label}</span>
        `;

        const marker = new goongjs.Marker({ element: el })
          .setLngLat([coord.lng, coord.lat])
          .addTo(map);
        markerStore.current.push(marker);
        bounds.extend([coord.lng, coord.lat]);
        hasBounds = true;
      };

      if (selectedTeamCoordinate) {
        addMarker('Đội cứu hộ', '#0f766e', '#ffffff', selectedTeamCoordinate, 'emergency');
      }

      (activeBatch?.items || []).forEach((item, index) => {
        const coord = toCoordinate(item.latitude, item.longitude);
        if (!coord) return;

        const isInProgress = item.status === 'InProgress';
        addMarker(
          isInProgress ? 'Đang xử lý' : `Queue ${index + 1}`,
          isInProgress ? '#2563eb' : '#475569',
          '#fff',
          coord,
          isInProgress ? 'local_shipping' : 'location_on',
        );
      });

      const newCoord = toCoordinate(selectedRequest?.latitude, selectedRequest?.longitude);
      if (newCoord) addMarker('Yêu cầu mới', '#f97316', '#fff', newCoord, 'notifications_active');

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
          routeCoords.forEach((coord) => {
            bounds.extend(coord);
            hasBounds = true;
          });

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

      if (hasBounds) map.fitBounds(bounds, { padding: options?.fitPadding ?? 80, maxZoom: 14 });
    },
    [activeBatch, preview, selectedRequest, selectedTeamCoordinate],
  );

  const handleFitMap = useCallback(
    (target: 'main' | 'expanded') => {
      if (target === 'expanded') {
        renderMapData(expandedMapRef.current, expandedMarkersRef, { fitPadding: 96 });
        return;
      }

      renderMapData(mapRef.current, markersRef, { fitPadding: 80 });
    },
    [renderMapData],
  );

  useEffect(() => {
    renderMapData(mapRef.current, markersRef, { fitPadding: 80 });
    if (isMapExpanded) {
      renderMapData(expandedMapRef.current, expandedMarkersRef, { fitPadding: 96 });
    }
  }, [isMapExpanded, renderMapData]);

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
    Boolean(selectedRequestBlockReason);

  const queueItemsForActiveTab =
    queueTab === 'current' ? activeBatch?.items || [] : orderedPreviewItems;

  return (
    <DashboardLayout navGroups={coordinatorNavGroups}>
      <div className="space-y-6">
        <div className="overflow-hidden ">
          <div className="space-y-2">
            <h1 className="text-3xl font-black tracking-tight text-primary md:text-4xl">
              Điều phối thông minh
            </h1>
            <p className="max-w-3xl text-sm text-muted-foreground md:text-base">
              Theo dõi hàng đợi của đội, xem trước vị trí chèn tối ưu và xác nhận điều phối trên
              cùng một màn hình 2:1 rõ ràng hơn.
            </p>
          </div>

          <Button
            variant="outline"
            className="h-11 gap-2 rounded-xl px-5"
            onClick={() => void handleRefresh()}
            disabled={!selectedTeamId || isBatchLoading}
          >
            <RefreshCcw className={cn('size-4', isBatchLoading && 'animate-spin')} />
            Tải lại
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <StatCard
            label="Đội đang chọn"
            value={selectedTeamName}
            icon={Users}
            toneClass="border-emerald-200 bg-emerald-500/10 text-emerald-600"
          />
          <StatCard
            label="Hàng đợi hiện tại"
            value={(activeBatch?.items || []).length}
            icon={ListOrdered}
            toneClass="border-blue-200 bg-blue-500/10 text-blue-600"
          />
          <StatCard
            label="Yêu cầu gần tuyến"
            value={candidatePaging?.totalCount ?? candidates.length}
            icon={Route}
            toneClass="border-amber-200 bg-amber-500/10 text-amber-600"
          />
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(360px,1fr)]">
          <Card className="overflow-hidden rounded-3xl border-border/70 bg-card/95 shadow-sm">
            <CardContent className="p-0">
              <div className="border-b border-border/70 bg-gradient-to-r from-slate-50 via-background to-background p-5 dark:from-slate-950/30">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-base font-semibold text-foreground">
                      Yêu cầu gần tuyến hiện tại
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Chọn đội cứu hộ, tìm nhanh theo địa chỉ và chọn yêu cầu để xem trước điều
                      phối.
                    </p>
                  </div>

                  <div className="inline-flex items-center gap-2 rounded-full border border-border bg-background/80 px-3 py-1.5 text-xs font-medium text-muted-foreground">
                    <Search className="size-3.5" />
                    {candidatePaging?.totalCount ?? candidates.length} kết quả
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                      Đội cứu hộ
                    </label>
                    {isTeamsLoading ? (
                      <Skeleton className="h-10 rounded-xl" />
                    ) : (
                      <Select value={selectedTeamId} onValueChange={setSelectedTeamId}>
                        <SelectTrigger className="h-11 rounded-xl border-border bg-background text-sm">
                          <SelectValue placeholder="Chọn đội cứu hộ" />
                        </SelectTrigger>
                        <SelectContent>
                          {teams.map((team) => (
                            <SelectItem key={team.teamId} value={team.teamId}>
                              {team.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                      Tìm yêu cầu
                    </label>
                    <div className="relative">
                      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        className="h-11 rounded-xl border-border bg-background pl-10"
                        placeholder="Tìm theo địa chỉ hoặc người báo tin..."
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-4">
                {isBatchLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((key) => (
                      <Skeleton key={key} className="h-24 rounded-2xl" />
                    ))}
                  </div>
                ) : !activeBatch?.items?.length ? (
                  <div className="rounded-2xl border border-dashed border-amber-300 bg-amber-50 px-4 py-8 text-center">
                    <p className="font-semibold text-amber-700">Đội chưa có hàng đợi hoạt động.</p>
                    <p className="mt-1 text-sm text-amber-600">
                      Hãy chọn đội đang có nhiệm vụ trong queue để dùng điều phối thông minh.
                    </p>
                  </div>
                ) : isCandidatesLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3, 4].map((key) => (
                      <Skeleton key={key} className="h-24 rounded-2xl" />
                    ))}
                  </div>
                ) : candidates.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-border bg-accent/20 px-4 py-8 text-center">
                    <p className="font-medium text-foreground">Không có yêu cầu phù hợp.</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Thử đổi từ khóa tìm kiếm hoặc chọn đội cứu hộ khác.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {candidates.map((req) => {
                      const isActive = req.requestId === selectedRequestId;
                      const blockReason = getBlockReason(req);
                      const isBlocked = Boolean(blockReason);

                      return (
                        <button
                          key={req.requestId}
                          type="button"
                          onClick={() => {
                            if (!isBlocked) setSelectedRequestId(req.requestId);
                          }}
                          disabled={isBlocked}
                          title={blockReason || ''}
                          className={cn(
                            'w-full rounded-2xl border px-4 py-3 text-left transition-all',
                            isBlocked
                              ? 'cursor-not-allowed border-slate-200 bg-slate-50 opacity-60'
                              : isActive
                                ? 'border-primary bg-primary/5 shadow-sm ring-1 ring-primary/10'
                                : 'border-border bg-background hover:border-primary/30 hover:bg-accent/20',
                          )}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="truncate text-sm font-semibold text-foreground">
                                  {req.reporterFullName || 'Không có tên'}
                                </p>
                                <span
                                  className={cn(
                                    'rounded-full border px-2 py-0.5 text-[11px] font-semibold',
                                    requestBadgeClass(req.rescueRequestType),
                                  )}
                                >
                                  {getRescueRequestTypeLabel(req.rescueRequestType)}
                                </span>
                              </div>

                              <p className="mt-1 truncate text-sm text-muted-foreground">
                                {req.address || '--'}
                              </p>

                              <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px]">
                                <span
                                  className={cn(
                                    'rounded-full border px-2 py-0.5 font-semibold',
                                    priorityLevelClass(req.priorityLevel),
                                  )}
                                >
                                  {getPriorityLevelLabel(req.priorityLevel)}
                                </span>
                                <span className="rounded-full border border-border bg-background px-2 py-0.5 text-muted-foreground">
                                  điểm ưu tiên {req.priorityPoint ?? '--'}
                                </span>
                              </div>
                            </div>

                            {isActive && !isBlocked ? (
                              <span className="rounded-full bg-primary px-2.5 py-1 text-[11px] font-semibold text-primary-foreground">
                                Đang chọn
                              </span>
                            ) : null}
                          </div>

                          {blockReason ? (
                            <div className="mt-3 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                              <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
                              <span>{blockReason}</span>
                            </div>
                          ) : null}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {(candidatePaging?.totalCount ?? 0) > 0 ? (
                <div className="flex flex-col gap-3 border-t border-border/70 bg-muted/20 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm text-muted-foreground">
                    Trang {candidateCurrentPage}/{candidateTotalPages} — Tổng{' '}
                    {candidatePaging?.totalCount ?? candidates.length} yêu cầu
                  </p>

                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={!candidatePaging?.hasPrevious || isCandidatesLoading}
                      onClick={() => setCandidatePage((page) => Math.max(1, page - 1))}
                    >
                      <ChevronLeft className="size-4" />
                      Trước
                    </Button>

                    <span className="inline-flex min-w-20 items-center justify-center rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground">
                      {candidateCurrentPage}/{candidateTotalPages}
                    </span>

                    <Button
                      variant="outline"
                      size="sm"
                      disabled={!candidatePaging?.hasNext || isCandidatesLoading}
                      onClick={() =>
                        setCandidatePage((page) =>
                          candidatePaging?.hasNext ? Math.min(candidateTotalPages, page + 1) : page,
                        )
                      }
                    >
                      Sau
                      <ChevronRight className="size-4" />
                    </Button>
                  </div>
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card className="overflow-hidden rounded-3xl border-border/70 bg-card/95 shadow-sm">
            <CardContent className="p-0">
              <div className="border-b border-border/70 bg-gradient-to-r from-blue-50/60 via-background to-background p-5 dark:from-blue-950/20">
                <p className="text-base font-semibold text-foreground">
                  Xem trước thông minh và điều phối
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Hệ thống sẽ mô phỏng vị trí chèn tối ưu trước khi xác nhận điều phối thật.
                </p>
              </div>

              <div className="space-y-4 p-5">
                <div className="rounded-2xl border border-border bg-primary/20 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-primary">Cho phép chèn ngang</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Dùng khi yêu cầu khẩn cấp nằm gần tuyến đường đang thực hiện.
                      </p>
                    </div>

                    <button
                      type="button"
                      aria-pressed={allowPreempt}
                      onClick={() => setAllowPreempt((value) => !value)}
                      className={cn(
                        'relative h-7 w-14 rounded-full border transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-2',
                        allowPreempt
                          ? 'border-primary/30 bg-primary/80 shadow-sm'
                          : 'border-border bg-muted',
                      )}
                    >
                      <span
                        className={cn(
                          'absolute -left-1 top-[1px] h-6 w-6 rounded-full bg-white shadow-md transition-transform duration-200',
                          allowPreempt ? 'translate-x-5' : 'translate-x-0',
                        )}
                      />
                    </button>
                  </div>
                </div>

                {selectedRequestBlockReason ? (
                  <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                    <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                    <span>{selectedRequestBlockReason}</span>
                  </div>
                ) : null}

                {!preview ? (
                  <div className="rounded-2xl border border-dashed border-border bg-accent/20 px-4 py-10 text-center text-sm text-amber-700">
                    Chọn đội và yêu cầu, sau đó bấm <strong>Xem trước điều phối</strong>.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {preview.willPreemptCurrentInProgress ? (
                      <div className="rounded-2xl border border-red-300 bg-red-50 px-4 py-3">
                        <p className="text-sm font-bold text-red-700">
                          Đề xuất chèn ngang nhiệm vụ hiện tại
                        </p>
                      </div>
                    ) : null}

                    <div className="rounded-2xl border border-border bg-accent/20 px-4 py-3">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                        Hành động đề xuất
                      </p>
                      <p className="mt-1 text-sm font-semibold text-foreground">
                        {actionLabel(preview.recommendedAction)}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {[
                        {
                          label: 'Gần tuyến',
                          value: preview.isNearCurrentRoute ? 'Có ✓' : 'Không',
                        },
                        { label: 'Quay đầu', value: preview.requiresBacktrack ? 'Có' : 'Không ✓' },
                        {
                          label: 'Đường vòng',
                          value:
                            preview.detourMeters != null
                              ? `${preview.detourMeters.toLocaleString('vi-VN')} m`
                              : '--',
                        },
                        {
                          label: 'Thời gian đường vòng',
                          value:
                            preview.detourSeconds != null
                              ? `${Math.round(preview.detourSeconds / 60)} phút`
                              : '--',
                        },
                        {
                          label: 'Cách tuyến',
                          value:
                            preview.minDistanceToCurrentRouteMeters != null
                              ? `${preview.minDistanceToCurrentRouteMeters.toLocaleString('vi-VN')} m`
                              : '--',
                        },
                        {
                          label: 'Điều kiện điều phối',
                          value: preview.eligible ? '✓ Đủ điều kiện' : '✗ Không đủ',
                        },
                      ].map(({ label, value }) => (
                        <div
                          key={label}
                          className="rounded-2xl border border-border bg-background px-3 py-2.5"
                        >
                          <p className="text-muted-foreground">{label}</p>
                          <p className="mt-0.5 font-semibold text-foreground">{value}</p>
                        </div>
                      ))}
                    </div>

                    {preview.reasons?.length ? (
                      <div className="rounded-2xl border border-border bg-background px-4 py-3">
                        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                          Lý do từ hệ thống
                        </p>
                        <ul className="list-disc space-y-1 pl-4 text-xs text-muted-foreground">
                          {preview.reasons.map((reason, index) => (
                            <li key={index}>{reason}</li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    Ghi chú khi điều phối
                  </label>
                  <Textarea
                    value={assignNote}
                    onChange={(event) => setAssignNote(event.target.value)}
                    placeholder="Nhập ghi chú điều phối (tùy chọn)..."
                    className="min-h-[92px] rounded-2xl text-sm"
                    rows={3}
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <Button
                    size="lg"
                    variant="outline"
                    onClick={handlePreview}
                    disabled={
                      !selectedTeamId ||
                      !selectedRequestId ||
                      isPreviewLoading ||
                      Boolean(selectedRequestBlockReason)
                    }
                    className="rounded-xl"
                  >
                    {isPreviewLoading ? 'Đang xử lý...' : 'Xem trước điều phối'}
                  </Button>

                  <Button
                    size="lg"
                    disabled={isAssignBlocked}
                    onClick={handleSmartAssign}
                    className={cn(
                      'rounded-xl font-bold',
                      preview?.willPreemptCurrentInProgress
                        ? 'bg-red-600 text-white hover:bg-red-500'
                        : 'bg-primary text-primary-foreground hover:bg-primary/90',
                    )}
                  >
                    {isAssigning
                      ? 'Đang điều phối...'
                      : preview?.willPreemptCurrentInProgress
                        ? 'Xác nhận chèn ngang'
                        : 'Xác nhận điều phối'}
                  </Button>

                  {!preview?.eligible && preview ? (
                    <p className="text-center text-xs text-destructive">
                      Yêu cầu không đủ điều kiện để điều phối.
                    </p>
                  ) : null}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(360px,1fr)]">
          <Card className="overflow-hidden rounded-3xl border-border/70 bg-card/95 shadow-sm">
            <CardContent className="p-0">
              <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border/70 bg-gradient-to-r from-sky-50/60 via-background to-background p-5 dark:from-sky-950/20">
                <div>
                  <p className="flex items-center gap-2 text-base font-semibold text-foreground">
                    <MapPinned className="size-4.5 text-sky-600" />
                    Bản đồ tuyến đường và vùng đệm
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Tuyến hiện tại, yêu cầu mới và vùng buffer {NORMAL_THRESHOLD_KM}–
                    {EMERGENCY_THRESHOLD_KM} km được hiển thị trực tiếp trên bản đồ.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <div className="rounded-full border border-border bg-background/80 px-3 py-1.5 text-xs font-medium text-muted-foreground">
                    Tự động làm mới mỗi {AUTO_REFRESH_MS / 1000}s
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2 rounded-xl"
                    onClick={() => setIsMapExpanded(true)}
                  >
                    <Maximize2 className="size-4" />
                    Mở rộng bản đồ
                  </Button>
                </div>
              </div>

              <div className="p-4">
                {!GOONG_MAP_KEY ? (
                  <div className="rounded-3xl border border-dashed border-border bg-accent/20 p-8 text-center text-sm text-muted-foreground">
                    Thiếu VITE_GOONG_MAP_KEY để hiển thị bản đồ.
                  </div>
                ) : (
                  <div className="overflow-hidden rounded-3xl border border-border shadow-sm">
                    <div ref={mapContainerRef} className="h-[520px] w-full bg-slate-100" />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="overflow-hidden rounded-3xl border-border/70 bg-card/95 shadow-sm">
            <CardContent className="flex h-full flex-col p-0">
              <div className="border-b border-border/70 bg-gradient-to-r from-violet-50/70 via-background to-background p-5 dark:from-violet-950/20">
                <p className="text-base font-semibold text-foreground">
                  Queue hiện tại và queue đề xuất
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  So sánh thứ tự hiện tại với đề xuất sau khi xem trước ngay bên cạnh bản đồ.
                </p>
              </div>

              <div className="px-4 pt-4">
                <div className="inline-flex w-full rounded-2xl bg-muted p-1">
                  <button
                    type="button"
                    onClick={() => setQueueTab('current')}
                    className={cn(
                      'flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition-colors',
                      queueTab === 'current'
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground',
                    )}
                  >
                    Hàng đợi hiện tại
                    <span
                      className={cn(
                        'rounded-full px-2 py-0.5 text-[11px] font-bold',
                        queueTab === 'current'
                          ? 'bg-primary/10 text-primary'
                          : 'bg-background text-muted-foreground',
                      )}
                    >
                      {(activeBatch?.items || []).length}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (preview) setQueueTab('preview');
                    }}
                    disabled={!preview}
                    className={cn(
                      'flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition-colors',
                      !preview && 'cursor-not-allowed opacity-50',
                      queueTab === 'preview'
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground',
                    )}
                  >
                    Đề xuất sau xem trước
                    <span
                      className={cn(
                        'rounded-full px-2 py-0.5 text-[11px] font-bold',
                        queueTab === 'preview'
                          ? 'bg-violet-100 text-violet-700'
                          : 'bg-background text-muted-foreground',
                      )}
                    >
                      {orderedPreviewItems.length}
                    </span>
                  </button>
                </div>
              </div>

              <div className="min-h-0 flex-1 p-4">
                <div className="h-[456px] space-y-2 overflow-auto pr-1">
                  {queueTab === 'current' ? (
                    isBatchLoading ? (
                      <div className="space-y-2">
                        {[1, 2, 3].map((key) => (
                          <Skeleton key={key} className="h-16 rounded-2xl" />
                        ))}
                      </div>
                    ) : activeBatch?.items?.length ? (
                      activeBatch.items.map((item, index) => (
                        <QueueRow
                          key={item.rescueRequestId}
                          item={item}
                          index={index}
                          variant="active"
                        />
                      ))
                    ) : (
                      <p className="py-10 text-center text-sm text-muted-foreground">
                        Đội chưa có hàng đợi hoạt động.
                      </p>
                    )
                  ) : orderedPreviewItems.length ? (
                    orderedPreviewItems.map((item, index) => (
                      <QueueRow
                        key={item.rescueRequestId}
                        item={item}
                        index={index}
                        variant="preview"
                      />
                    ))
                  ) : (
                    <p className="py-10 text-center text-sm text-muted-foreground">
                      Chưa có dữ liệu xem trước.
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-border/70 bg-muted/20 px-4 py-3">
                <span className="text-xs text-muted-foreground">Hàng đợi nằm bên phải bản đồ</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => void handleRefresh()}
                  disabled={!selectedTeamId || isBatchLoading}
                  className="h-auto px-0 text-xs font-semibold text-primary hover:bg-transparent"
                >
                  Tải lại ngay
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {isMapExpanded ? (
          <div className="fixed inset-0 z-50 flex flex-col bg-background">
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border/70 bg-gradient-to-r from-sky-50/60 via-background to-background px-6 py-5 dark:from-sky-950/20">
              <div>
                <p className="flex items-center gap-2 text-xl font-bold text-foreground">
                  <MapPinned className="size-5 text-sky-600" />
                  Bản đồ queue điều phối
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Xem chi tiết toàn bộ queue, tuyến hiện tại, yêu cầu mới và vùng đệm trên toàn màn
                  hình.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="rounded-full border border-border bg-background/90 px-3 py-1.5 text-xs font-medium text-muted-foreground">
                  Đội: {selectedTeamName}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-xl"
                  onClick={() => handleFitMap('expanded')}
                  disabled={!GOONG_MAP_KEY}
                >
                  Vừa khung toàn tuyến
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2 rounded-xl"
                  onClick={() => void handleRefresh()}
                  disabled={!selectedTeamId || isBatchLoading}
                >
                  <RefreshCcw className={cn('size-4', isBatchLoading && 'animate-spin')} />
                  Làm mới
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2 rounded-xl"
                  onClick={() => setIsMapExpanded(false)}
                >
                  <Minimize2 className="size-4" />
                  Thu nhỏ
                </Button>
              </div>
            </div>

            <div className="grid min-h-0 flex-1 grid-cols-1 xl:grid-cols-[minmax(0,1fr)_420px]">
              <div className="flex min-h-0 flex-col border-b border-border/70 xl:border-r xl:border-b-0">
                <div className="flex flex-wrap items-center gap-2 border-b border-border/70 bg-muted/20 px-5 py-3 text-xs font-medium">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-teal-200 bg-teal-100 px-3 py-1 text-teal-700">
                    <span className="material-symbols-outlined text-sm!">emergency</span>
                    Đội cứu hộ
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-100 px-3 py-1 text-blue-700">
                    <span className="material-symbols-outlined text-sm!">local_shipping</span>
                    Đang xử lý / tuyến hiện tại
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-slate-700">
                    <span className="material-symbols-outlined text-sm!">location_on</span>
                    Các điểm trong queue
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-orange-200 bg-orange-100 px-3 py-1 text-orange-700">
                    <span className="material-symbols-outlined text-sm!">notifications_active</span>
                    Yêu cầu mới
                  </span>
                </div>

                <div className="min-h-0 flex-1 p-4">
                  {!GOONG_MAP_KEY ? (
                    <div className="flex h-full items-center justify-center rounded-3xl border border-dashed border-border bg-accent/20 p-8 text-center text-sm text-muted-foreground">
                      Thiếu VITE_GOONG_MAP_KEY để hiển thị bản đồ.
                    </div>
                  ) : (
                    <div className="h-full overflow-hidden rounded-3xl border border-border shadow-sm">
                      <div
                        ref={expandedMapContainerRef}
                        className="h-full min-h-[420px] w-full bg-slate-100"
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="flex min-h-0 flex-col bg-card/95">
                <div className="border-b border-border/70 px-4 pt-4">
                  <div className="inline-flex w-full rounded-2xl bg-muted p-1">
                    <button
                      type="button"
                      onClick={() => setQueueTab('current')}
                      className={cn(
                        'flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition-colors',
                        queueTab === 'current'
                          ? 'bg-background text-foreground shadow-sm'
                          : 'text-muted-foreground hover:text-foreground',
                      )}
                    >
                      Hàng đợi hiện tại
                      <span
                        className={cn(
                          'rounded-full px-2 py-0.5 text-[11px] font-bold',
                          queueTab === 'current'
                            ? 'bg-primary/10 text-primary'
                            : 'bg-background text-muted-foreground',
                        )}
                      >
                        {(activeBatch?.items || []).length}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        if (preview) setQueueTab('preview');
                      }}
                      disabled={!preview}
                      className={cn(
                        'flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition-colors',
                        !preview && 'cursor-not-allowed opacity-50',
                        queueTab === 'preview'
                          ? 'bg-background text-foreground shadow-sm'
                          : 'text-muted-foreground hover:text-foreground',
                      )}
                    >
                      Đề xuất sau xem trước
                      <span
                        className={cn(
                          'rounded-full px-2 py-0.5 text-[11px] font-bold',
                          queueTab === 'preview'
                            ? 'bg-violet-100 text-violet-700'
                            : 'bg-background text-muted-foreground',
                        )}
                      >
                        {orderedPreviewItems.length}
                      </span>
                    </button>
                  </div>

                  <div className="mt-4 grid grid-cols-1 gap-2 pb-4 text-xs sm:grid-cols-2">
                    <div className="rounded-2xl border border-border bg-background px-3 py-2.5">
                      <p className="text-muted-foreground">Đội cứu hộ</p>
                      <p className="mt-1 font-semibold text-foreground">{selectedTeamName}</p>
                    </div>
                    <div className="rounded-2xl border border-border bg-background px-3 py-2.5">
                      <p className="text-muted-foreground">Số điểm trong queue</p>
                      <p className="mt-1 font-semibold text-foreground">
                        {queueItemsForActiveTab.length}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="min-h-0 flex-1 p-4">
                  <div className="h-full space-y-2 overflow-auto pr-1">
                    {queueTab === 'current' ? (
                      isBatchLoading ? (
                        <div className="space-y-2">
                          {[1, 2, 3, 4].map((key) => (
                            <Skeleton key={key} className="h-16 rounded-2xl" />
                          ))}
                        </div>
                      ) : activeBatch?.items?.length ? (
                        activeBatch.items.map((item, index) => (
                          <QueueRow
                            key={`expanded-current-${item.rescueRequestId}`}
                            item={item}
                            index={index}
                            variant="active"
                          />
                        ))
                      ) : (
                        <p className="py-10 text-center text-sm text-muted-foreground">
                          Đội chưa có hàng đợi hoạt động.
                        </p>
                      )
                    ) : orderedPreviewItems.length ? (
                      orderedPreviewItems.map((item, index) => (
                        <QueueRow
                          key={`expanded-preview-${item.rescueRequestId}`}
                          item={item}
                          index={index}
                          variant="preview"
                        />
                      ))
                    ) : (
                      <p className="py-10 text-center text-sm text-muted-foreground">
                        Chưa có dữ liệu xem trước.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </DashboardLayout>
  );
}
