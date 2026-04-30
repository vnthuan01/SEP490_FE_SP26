import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CoordinatorListPagination } from './components/CoordinatorListPagination';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  rescueRequestService,
  type RescueRequestDetail,
  type RescueOperationDetail,
} from '@/services/rescueRequestService';
import { coordinatorNavGroups } from './components/sidebarConfig';
import { MissionTrackingMapSection } from './components/MissionTrackingMapSection';
import { usePrefetchedDirectionsRoute } from './components/usePrefetchedDirectionsRoute';
import { useMissionTrackingData } from './components/useMissionTrackingData';
import { getDisasterTypeLabel, getRescueRequestTypeLabel } from '@/enums/beEnums';

const GOONG_MAP_KEY = import.meta.env.VITE_GOONG_MAP_KEY || '';
const GOONG_API_KEY = import.meta.env.VITE_GOONG_API_KEY || '';

const OPERATION_STATUS_STEPS = [
  { key: 'Pending', label: 'Chờ xử lý', icon: 'schedule', color: '#9ca3af' },
  { key: 'Assigned', label: 'Đã gán team', icon: 'assignment_ind', color: '#60a5fa' },
  { key: 'EnRoute', label: 'Đang di chuyển', icon: 'directions_car', color: '#3b82f6' },
  { key: 'Rescuing', label: 'Đang cứu hộ', icon: 'local_fire_department', color: '#f97316' },
  { key: 'RescueCompleted', label: 'Hoàn thành', icon: 'check_circle', color: '#22c55e' },
] as const;

const STATUS_BADGE_MAP: Record<string, { label: string; cls: string; icon: string }> = {
  Pending: {
    label: 'Chờ xử lý',
    cls: 'border-yellow-200 bg-yellow-500/10 text-yellow-600',
    icon: 'schedule',
  },
  Assigned: {
    label: 'Đã gán team',
    cls: 'border-blue-200 bg-blue-500/10 text-blue-700',
    icon: 'assignment_ind',
  },
  EnRoute: {
    label: 'Di chuyển',
    cls: 'border-blue-300 bg-blue-500/15 text-blue-700 animate-pulse',
    icon: 'directions_car',
  },
  Rescuing: {
    label: 'Đang cứu hộ',
    cls: 'border-orange-200 bg-orange-500/10 text-orange-700',
    icon: 'local_fire_department',
  },
  RescueCompleted: {
    label: 'Hoàn thành',
    cls: 'border-emerald-200 bg-emerald-500/10 text-emerald-700',
    icon: 'check_circle',
  },
  Returning: {
    label: 'Đang về trạm',
    cls: 'border-violet-200 bg-violet-500/10 text-violet-700',
    icon: 'u_turn_right',
  },
  Closed: {
    label: 'Đã đóng ca',
    cls: 'border-slate-200 bg-slate-500/10 text-slate-500',
    icon: 'lock',
  },
  Cancelled: {
    label: 'Đã hủy',
    cls: 'border-rose-200 bg-rose-500/10 text-rose-700',
    icon: 'cancel',
  },
};

const getStatusBadge = (status?: string | null) => {
  const s = status ?? '';
  return (
    STATUS_BADGE_MAP[s] ?? {
      label: s || '--',
      cls: 'bg-gray-100 text-gray-500 border-gray-300',
      icon: 'help',
    }
  );
};

const DISASTER_TYPE_BADGE: Record<string, { cls: string; icon: string }> = {
  Flood: { cls: 'bg-blue-100 text-blue-800 border-blue-200', icon: 'water' },
  Earthquake: { cls: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: 'sensors' },
  Landslide: { cls: 'bg-orange-100 text-orange-800 border-orange-200', icon: 'landslide' },
  Fire: { cls: 'bg-red-100 text-red-800 border-red-200', icon: 'local_fire_department' },
  Storm: { cls: 'bg-indigo-100 text-indigo-800 border-indigo-200', icon: 'storm' },
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

const MISSION_PAGE_SIZE = 5;

function OperationTimeline({ status }: { status?: string | null }) {
  const stepIndex = OPERATION_STATUS_STEPS.findIndex((s) => s.key === status);
  const isCancelled = status === 'Cancelled';

  return (
    <div className="w-full overflow-x-auto pb-2">
      {isCancelled ? (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-600">
          <span className="material-symbols-outlined text-base">cancel</span>
          Ca cứu hộ đã bị hủy
        </div>
      ) : (
        <div className="flex min-w-max items-center gap-0">
          {OPERATION_STATUS_STEPS.map((step, idx) => {
            const isDone = idx < stepIndex;
            const isCurrent = idx === stepIndex;
            return (
              <div key={step.key} className="flex items-center">
                <div className="flex flex-col items-center gap-1">
                  <div
                    className={cn(
                      'flex h-8 w-8 items-center justify-center rounded-full border-2 transition-all',
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
                      'max-w-[64px] whitespace-normal text-center text-[10px] font-medium leading-tight',
                      isDone
                        ? 'text-green-600'
                        : isCurrent
                          ? 'font-bold text-blue-700'
                          : 'text-gray-400',
                    )}
                  >
                    {step.label}
                  </span>
                </div>
                {idx < OPERATION_STATUS_STEPS.length - 1 && (
                  <div
                    className={cn(
                      'mx-1 mt-[-12px] h-0.5 w-8',
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
    <div className="flex items-center gap-1.5 rounded-full bg-blue-600 px-3 py-1.5 text-sm font-bold text-white shadow">
      <span className="material-symbols-outlined text-base">timer</span>
      ETA: ~{minutes} phút
    </div>
  );
}

type MissionVehicleChip = {
  vehicleId: string;
  vehicleName: string;
  vehicleLicensePlate: string;
  isPrimary: boolean;
};

export default function MissionTrackingPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [requests, setRequests] = useState<RescueRequestDetail[]>([]);
  const [isListLoading, setIsListLoading] = useState(true);
  const [isListError, setIsListError] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<number | undefined>(undefined);
  const [listPage, setListPage] = useState(1);

  const [selectedId, setSelectedId] = useState(searchParams.get('requestId') || '');
  const [selectedListRequest, setSelectedListRequest] = useState<RescueRequestDetail | null>(null);
  const [isRecalculating, setIsRecalculating] = useState(false);

  const requestIdFromQuery = searchParams.get('requestId') || '';

  useEffect(() => {
    if (!requestIdFromQuery) return;
    if (requestIdFromQuery !== selectedId) {
      setSelectedId(requestIdFromQuery);
    }
  }, [requestIdFromQuery, selectedId]);

  useEffect(() => {
    if (!selectedId) {
      setSelectedListRequest(null);
      return;
    }

    const found = requests.find((req) => getRequestId(req) === selectedId);
    if (found) {
      setSelectedListRequest(found);
    }
  }, [requests, selectedId]);

  const { prefetchRoute } = usePrefetchedDirectionsRoute(GOONG_API_KEY);

  // ── Hook-based data flow ──────────────────────────────────────────────────
  const { detail, isDetailLoading, currentOperation, teamLocation, trackingPoints, refetchDetail } =
    useMissionTrackingData({
      selectedId,
      selectedListRequest,
      enabled: !!selectedId,
    });

  // ── Derived state ─────────────────────────────────────────────────────────
  const listOperation = useMemo<RescueOperationDetail | null>(() => {
    const ops = selectedListRequest?.rescueOperations as RescueOperationDetail[] | undefined;
    return ops?.[0] ?? null;
  }, [selectedListRequest]);

  const activeDetail = detail ?? selectedListRequest;
  const activeOperation = currentOperation ?? listOperation;

  const activeVehicles = useMemo<MissionVehicleChip[]>(() => {
    const collected: MissionVehicleChip[] = [];
    const seen = new Set<string>();

    const addVehicle = (
      vehicleId?: string | null,
      vehicleName?: string | null,
      vehicleLicensePlate?: string | null,
      isPrimary = false,
    ) => {
      const normalizedId = String(vehicleId ?? '').trim();
      if (!normalizedId || seen.has(normalizedId)) return;

      collected.push({
        vehicleId: normalizedId,
        vehicleName: String(vehicleName ?? 'Vehicle').trim() || 'Vehicle',
        vehicleLicensePlate: String(vehicleLicensePlate ?? '--').trim() || '--',
        isPrimary,
      });
      seen.add(normalizedId);
    };

    const operationVehicles = activeOperation?.vehicles;
    if (Array.isArray(operationVehicles) && operationVehicles.length > 0) {
      operationVehicles.forEach((vehicle) =>
        addVehicle(
          vehicle?.vehicleId,
          vehicle?.vehicleName,
          vehicle?.vehicleLicensePlate,
          Boolean(vehicle?.isPrimary),
        ),
      );
    }

    const teamVehicles = activeDetail?.assignedRescueTeam?.vehicles;
    if (Array.isArray(teamVehicles) && teamVehicles.length > 0) {
      teamVehicles.forEach((vehicle) =>
        addVehicle(
          vehicle?.vehicleId,
          vehicle?.vehicleName,
          vehicle?.vehicleLicensePlate,
          Boolean(vehicle?.isPrimary),
        ),
      );
    }

    if (collected.length === 0) {
      addVehicle(
        activeOperation?.vehicleId ?? activeDetail?.assignedRescueTeam?.vehicleId,
        activeOperation?.vehicleName ?? activeDetail?.assignedRescueTeam?.vehicleName,
        activeOperation?.vehicleLicensePlate ??
          activeDetail?.assignedRescueTeam?.vehicleLicensePlate,
        true,
      );
    }

    return collected;
  }, [
    activeDetail?.assignedRescueTeam?.vehicleId,
    activeDetail?.assignedRescueTeam?.vehicleLicensePlate,
    activeDetail?.assignedRescueTeam?.vehicleName,
    activeDetail?.assignedRescueTeam?.vehicles,
    activeOperation?.vehicleId,
    activeOperation?.vehicleLicensePlate,
    activeOperation?.vehicleName,
    activeOperation?.vehicles,
  ]);

  const opStatus = activeOperation?.status ?? null;
  const isEnRoute = opStatus === 'EnRoute';
  const isRescuing = opStatus === 'Rescuing';
  const isCompleted = opStatus === 'RescueCompleted';
  const showMap = isEnRoute || isRescuing;

  const completionAttachments = useMemo(
    () =>
      (activeDetail?.attachments ?? []).filter(
        (a) =>
          a.attachmentType === 1 ||
          a.attachmentType === '1' ||
          a.attachmentType === 'CompletionEvidence',
      ),
    [activeDetail?.attachments],
  );

  const requestEvidenceAttachments = useMemo(
    () =>
      (activeDetail?.attachments ?? []).filter(
        (a) =>
          a.attachmentType === 'RequestEvidence' ||
          a.attachmentType === 0 ||
          a.attachmentType === '0' ||
          a.attachmentType == null,
      ),
    [activeDetail?.attachments],
  );

  const filteredRequests = useMemo(() => {
    const term = search.trim().toLowerCase();
    return requests.filter(
      (r) =>
        !term ||
        (r.reporterFullName ?? '').toLowerCase().includes(term) ||
        (r.address ?? '').toLowerCase().includes(term) ||
        (r.reporterPhone ?? '').toLowerCase().includes(term) ||
        String(r.disasterType ?? '')
          .toLowerCase()
          .includes(term),
    );
  }, [requests, search]);

  const totalListPages = Math.max(1, Math.ceil(filteredRequests.length / MISSION_PAGE_SIZE));

  useEffect(() => {
    setListPage(1);
  }, [search, statusFilter]);

  useEffect(() => {
    if (listPage > totalListPages) setListPage(totalListPages);
  }, [listPage, totalListPages]);

  const paginatedRequests = useMemo(() => {
    const start = (listPage - 1) * MISSION_PAGE_SIZE;
    return filteredRequests.slice(start, start + MISSION_PAGE_SIZE);
  }, [filteredRequests, listPage]);

  const missionStats = useMemo(() => {
    const statuses = requests.map(
      (req) => (req.rescueOperations as RescueOperationDetail[] | undefined)?.[0]?.status,
    );
    return {
      total: requests.length,
      pending: statuses.filter((status) => !status || status === 'Pending').length,
      active: statuses.filter(
        (status) => status === 'Assigned' || status === 'EnRoute' || status === 'Rescuing',
      ).length,
      completed: statuses.filter((status) => status === 'RescueCompleted' || status === 'Closed')
        .length,
    };
  }, [requests]);

  // ── List fetching ─────────────────────────────────────────────────────────
  const loadList = useCallback(async () => {
    try {
      setIsListError(false);
      const result = await rescueRequestService.getMyStationRequests({
        statusFilter,
        pageNumber: 1,
        pageSize: 50,
      });
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

  // ── Prefetch: warm route cache on first visible item ──────────────────────
  useEffect(() => {
    const firstVisible = paginatedRequests[0];
    if (!firstVisible) return;

    const origin =
      Number.isFinite(Number(firstVisible.assignedRescueTeam?.currentLatitude)) &&
      Number.isFinite(Number(firstVisible.assignedRescueTeam?.currentLongitude))
        ? {
            lat: Number(firstVisible.assignedRescueTeam?.currentLatitude),
            lng: Number(firstVisible.assignedRescueTeam?.currentLongitude),
          }
        : null;
    const destination =
      Number.isFinite(Number(firstVisible.latitude)) &&
      Number.isFinite(Number(firstVisible.longitude))
        ? { lat: Number(firstVisible.latitude), lng: Number(firstVisible.longitude) }
        : null;

    prefetchRoute(origin, destination);
  }, [paginatedRequests, prefetchRoute]);

  // ── Secondary prefetch: warm cache when detail loads ─────────────────────
  useEffect(() => {
    if (!detail) return;
    const origin =
      Number.isFinite(Number(detail.assignedRescueTeam?.currentLatitude)) &&
      Number.isFinite(Number(detail.assignedRescueTeam?.currentLongitude))
        ? {
            lat: Number(detail.assignedRescueTeam?.currentLatitude),
            lng: Number(detail.assignedRescueTeam?.currentLongitude),
          }
        : null;
    const destination =
      Number.isFinite(Number(detail.latitude)) && Number.isFinite(Number(detail.longitude))
        ? { lat: Number(detail.latitude), lng: Number(detail.longitude) }
        : null;
    prefetchRoute(origin, destination);
  }, [detail, prefetchRoute]);

  // ── Mission selection ─────────────────────────────────────────────────────
  const handleSelectMission = useCallback(
    (rid: string, req: RescueRequestDetail) => {
      setSelectedId(rid);
      setSelectedListRequest(req);
      setSearchParams({ requestId: rid }, { replace: false });

      // Fire-and-forget prefetch on click
      const origin =
        Number.isFinite(Number(req.assignedRescueTeam?.currentLatitude)) &&
        Number.isFinite(Number(req.assignedRescueTeam?.currentLongitude))
          ? {
              lat: Number(req.assignedRescueTeam?.currentLatitude),
              lng: Number(req.assignedRescueTeam?.currentLongitude),
            }
          : null;
      const destination =
        Number.isFinite(Number(req.latitude)) && Number.isFinite(Number(req.longitude))
          ? { lat: Number(req.latitude), lng: Number(req.longitude) }
          : null;

      prefetchRoute(origin, destination);
    },
    [prefetchRoute, setSearchParams],
  );

  // ── ETA recalculate ───────────────────────────────────────────────────────
  const handleRecalculateEta = async () => {
    const teamId = detail?.assignedRescueTeam?.teamId;
    if (!teamId) return;
    setIsRecalculating(true);
    try {
      await rescueRequestService.recalculateEta(teamId);
      toast.success('Đã tính lại ETA thành công.');
      refetchDetail();
    } catch {
      toast.error('Không thể tính lại ETA.');
    } finally {
      setIsRecalculating(false);
    }
  };

  return (
    <DashboardLayout navGroups={coordinatorNavGroups}>
      <div className="space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="space-y-2">
            <h1 className="text-3xl font-black text-primary md:text-4xl">Theo dõi cứu hộ</h1>
            <p className="max-w-2xl text-sm text-muted-foreground md:text-base">
              Quan sát hành trình cứu hộ realtime, bản đồ di chuyển, timeline trạng thái và bằng
              chứng hoàn thành.
            </p>
          </div>
          <Button variant="outline" className="h-11 gap-2 px-5" onClick={loadList}>
            <span className="material-symbols-outlined">refresh</span>
            Tải lại
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Card className="border-border bg-card">
            <CardContent className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    Tổng yêu cầu
                  </p>
                  <p className="mt-3 text-3xl font-black text-foreground">{missionStats.total}</p>
                </div>
                <div className="flex size-11 items-center justify-center rounded-2xl border border-sky-200 bg-sky-500/10 text-sky-600">
                  <span className="material-symbols-outlined">radar</span>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border bg-card">
            <CardContent className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    Chờ xử lý
                  </p>
                  <p className="mt-3 text-3xl font-black text-amber-600">{missionStats.pending}</p>
                </div>
                <div className="flex size-11 items-center justify-center rounded-2xl border border-amber-200 bg-amber-500/10 text-amber-600">
                  <span className="material-symbols-outlined">schedule</span>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border bg-card">
            <CardContent className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    Đang thực hiện
                  </p>
                  <p className="mt-3 text-3xl font-black text-blue-600">{missionStats.active}</p>
                </div>
                <div className="flex size-11 items-center justify-center rounded-2xl border border-blue-200 bg-blue-500/10 text-blue-600">
                  <span className="material-symbols-outlined">route</span>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border bg-card">
            <CardContent className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    Hoàn thành
                  </p>
                  <p className="mt-3 text-3xl font-black text-emerald-600">
                    {missionStats.completed}
                  </p>
                </div>
                <div className="flex size-11 items-center justify-center rounded-2xl border border-emerald-200 bg-emerald-500/10 text-emerald-600">
                  <span className="material-symbols-outlined">check_circle</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid min-h-[calc(100vh-4rem)] grid-cols-1 gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
          <Card className="overflow-hidden rounded-2xl border-border bg-card xl:h-[calc(100vh-4rem)]">
            <CardContent className="flex h-full flex-col p-0">
              <div className="border-b border-border/70 px-5 pb-4 pt-5">
                <div className="space-y-4">
                  <div className="space-y-1">
                    <h2 className="text-xl font-black text-foreground">Danh sách yêu cầu</h2>
                    <p className="text-xs text-muted-foreground">
                      Chọn yêu cầu để xem hành trình cứu hộ, bản đồ realtime và bằng chứng hoàn
                      thành.
                    </p>
                  </div>
                  <div className="relative">
                    <span className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-base text-muted-foreground">
                      search
                    </span>
                    <Input
                      className="h-11 border-border bg-background pl-10"
                      placeholder="Tìm tên, SĐT, địa chỉ..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {(
                      [
                        { label: 'Tất cả', value: undefined, icon: 'apps', activeCls: '' },
                        {
                          label: 'Đang xử lý',
                          value: 3,
                          icon: 'progress_activity',
                          activeCls:
                            'border-blue-300 bg-blue-500/15 text-blue-700 hover:bg-blue-500/20',
                        },
                        {
                          label: 'Chờ duyệt',
                          value: 0,
                          icon: 'schedule',
                          activeCls:
                            'border-yellow-300 bg-yellow-500/15 text-yellow-700 hover:bg-yellow-500/20',
                        },
                        {
                          label: 'Hoàn thành',
                          value: 4,
                          icon: 'check_circle',
                          activeCls:
                            'border-emerald-300 bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/20',
                        },
                      ] as {
                        label: string;
                        value: number | undefined;
                        icon: string;
                        activeCls: string;
                      }[]
                    ).map(({ label, value, icon, activeCls }) => {
                      const isActive = statusFilter === value;
                      return (
                        <Button
                          key={label}
                          size="sm"
                          variant={isActive && !activeCls ? 'primary' : 'outline'}
                          className={cn('rounded-full', isActive && activeCls)}
                          onClick={() => setStatusFilter(value)}
                        >
                          <span className="material-symbols-outlined text-sm">{icon}</span>
                          {label}
                        </Button>
                      );
                    })}
                  </div>
                </div>
              </div>
              <div className="flex-1 overflow-auto px-4 py-4">
                {isListLoading ? (
                  <div className="space-y-2">
                    {[1, 2, 3, 4].map((k) => (
                      <Skeleton key={k} className="h-24 rounded-2xl" />
                    ))}
                  </div>
                ) : isListError ? (
                  <div className="rounded-2xl border border-rose-200 bg-rose-500/5 px-4 py-4 text-sm text-rose-600">
                    Không tải được danh sách yêu cầu.
                  </div>
                ) : filteredRequests.length === 0 ? (
                  <div className="flex min-h-[280px] flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border bg-muted/10 p-6 text-center">
                    <span className="material-symbols-outlined text-5xl text-muted-foreground">
                      search_off
                    </span>
                    <div>
                      <p className="text-base font-semibold text-foreground">
                        Không có yêu cầu phù hợp
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Hãy thử thay đổi từ khóa tìm kiếm hoặc trạng thái cần lọc.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {paginatedRequests.map((req) => {
                      const rid = getRequestId(req);
                      const isActive = rid === selectedId;
                      const ops = req.rescueOperations as RescueOperationDetail[] | undefined;
                      const latestOp = ops?.[0];
                      const badge = getStatusBadge(latestOp?.status);
                      const disasterKey = String(req.disasterType ?? '');
                      const disasterBadge = DISASTER_TYPE_BADGE[disasterKey];
                      return (
                        <button
                          key={rid}
                          onClick={() => handleSelectMission(rid, req)}
                          onMouseEnter={() => {
                            const origin =
                              Number.isFinite(Number(req.assignedRescueTeam?.currentLatitude)) &&
                              Number.isFinite(Number(req.assignedRescueTeam?.currentLongitude))
                                ? {
                                    lat: Number(req.assignedRescueTeam?.currentLatitude),
                                    lng: Number(req.assignedRescueTeam?.currentLongitude),
                                  }
                                : null;
                            const destination =
                              Number.isFinite(Number(req.latitude)) &&
                              Number.isFinite(Number(req.longitude))
                                ? { lat: Number(req.latitude), lng: Number(req.longitude) }
                                : null;
                            prefetchRoute(origin, destination);
                          }}
                          className={cn(
                            'w-full rounded-2xl border border-border p-4 text-left transition-all',
                            isActive
                              ? 'border-primary/40 bg-primary/10 shadow-sm'
                              : 'hover:border-primary/20 hover:bg-accent/40',
                          )}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-bold text-foreground">
                                {req.reporterFullName || '--'}
                              </p>
                              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                                {req.address || 'Chưa có địa chỉ'}
                              </p>
                            </div>
                            <span
                              className={cn(
                                'inline-flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold whitespace-nowrap',
                                badge.cls,
                              )}
                            >
                              <span className="material-symbols-outlined text-sm">
                                {badge.icon}
                              </span>
                              {badge.label}
                            </span>
                          </div>
                          <div className="mt-3 flex flex-wrap gap-2">
                            {disasterBadge ? (
                              <span
                                className={cn(
                                  'inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium',
                                  disasterBadge.cls,
                                )}
                              >
                                <span className="material-symbols-outlined text-sm">
                                  {disasterBadge.icon}
                                </span>
                                {getDisasterTypeLabel(req.disasterType)}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-2.5 py-1 text-[11px] text-muted-foreground">
                                <span className="material-symbols-outlined text-sm">warning</span>
                                {getDisasterTypeLabel(req.disasterType) || '--'}
                              </span>
                            )}
                            {latestOp?.teamName && (
                              <span className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-2.5 py-1 text-[11px] text-muted-foreground">
                                <span className="material-symbols-outlined text-sm">groups</span>
                                {latestOp.teamName}
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="border-t border-border/70 px-5 py-4">
                <CoordinatorListPagination
                  currentPage={listPage}
                  totalPages={totalListPages}
                  onPageChange={setListPage}
                  summary={
                    <>
                      Trang {listPage}/{totalListPages} — {paginatedRequests.length}/
                      {filteredRequests.length} nhiệm vụ
                    </>
                  }
                />
              </div>
            </CardContent>
          </Card>

          <div className="min-h-0 xl:max-h-[calc(100vh-4rem)] xl:overflow-y-auto xl:pr-1">
            <Card className="rounded-2xl border-border bg-card">
              <CardContent className="p-6">
                {!selectedId ? (
                  <div className="flex min-h-[520px] flex-col items-center justify-center text-center">
                    <span className="material-symbols-outlined mb-3 text-5xl text-muted-foreground/40">
                      radar
                    </span>
                    <p className="text-muted-foreground">Chọn một yêu cầu để xem chi tiết.</p>
                  </div>
                ) : isDetailLoading && !activeDetail ? (
                  <div className="space-y-4">
                    <Skeleton className="h-8 w-48" />
                    <Skeleton className="h-24" />
                    <Skeleton className="h-40" />
                  </div>
                ) : !activeDetail ? (
                  <p className="text-sm text-red-500">Không tải được chi tiết.</p>
                ) : (
                  <div className="space-y-6">
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-start gap-3 rounded-2xl border border-border bg-gradient-to-br from-primary/5 via-background to-background p-5">
                        <span
                          className={cn(
                            'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold',
                            REQUEST_TYPE_COLOR[String(activeDetail.rescueRequestType ?? '')] ??
                              'bg-gray-200 text-gray-700',
                          )}
                        >
                          {getRescueRequestTypeLabel(
                            activeDetail.rescueRequestType,
                          )?.toUpperCase() ?? 'THƯỜNG'}
                        </span>
                        {(() => {
                          const db = DISASTER_TYPE_BADGE[String(activeDetail.disasterType ?? '')];
                          return db ? (
                            <span
                              className={cn(
                                'inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold',
                                db.cls,
                              )}
                            >
                              <span className="material-symbols-outlined text-sm">{db.icon}</span>
                              {getDisasterTypeLabel(activeDetail.disasterType)}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-2.5 py-1 text-xs text-muted-foreground">
                              <span className="material-symbols-outlined text-sm">warning</span>
                              {getDisasterTypeLabel(activeDetail.disasterType) || '--'}
                            </span>
                          );
                        })()}
                        {activeOperation &&
                          (() => {
                            const sb = getStatusBadge(opStatus);
                            return (
                              <span
                                className={cn(
                                  'ml-auto inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium',
                                  sb.cls,
                                )}
                              >
                                <span className="material-symbols-outlined text-sm">{sb.icon}</span>
                                {sb.label}
                              </span>
                            );
                          })()}
                      </div>
                      <div className="rounded-2xl border border-border p-4">
                        <div className="grid grid-cols-1 gap-1 text-sm">
                          <div className="flex items-start gap-2">
                            <span className="material-symbols-outlined text-base text-muted-foreground mt-0.5">
                              location_on
                            </span>
                            <p>{activeDetail.address || 'Chưa có địa chỉ'}</p>
                          </div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="material-symbols-outlined text-base text-muted-foreground">
                              person
                            </span>
                            <p>{activeDetail.reporterFullName || '--'}</p>
                            {activeDetail.reporterPhone && (
                              <>
                                <span className="material-symbols-outlined text-base text-muted-foreground">
                                  phone
                                </span>
                                <a
                                  href={`tel:${activeDetail.reporterPhone}`}
                                  className="text-primary hover:underline"
                                >
                                  {activeDetail.reporterPhone}
                                </a>
                              </>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-base text-muted-foreground">
                              schedule
                            </span>
                            <p>{formatDate(activeDetail.createdAt)}</p>
                          </div>
                        </div>

                        {activeDetail.description && (
                          <>
                            <div className="mt-4 rounded-2xl bg-accent/30 border border-border p-3 text-sm italic text-muted-foreground">
                              "{activeDetail.description}"
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                    {activeOperation && (
                      <div className="space-y-3">
                        <p className="text-xs uppercase font-semibold text-muted-foreground tracking-wider">
                          Trạng thái operation
                        </p>
                        <OperationTimeline status={opStatus} />
                        <div className="flex flex-wrap items-center gap-3 text-sm">
                          {activeOperation.teamName && (
                            <div className="flex items-center gap-1.5 bg-blue-50 border border-blue-200 rounded-full px-3 py-1">
                              <span className="material-symbols-outlined text-blue-600 text-base">
                                groups
                              </span>
                              <span className="font-medium text-blue-700">
                                {activeOperation.teamName}
                              </span>
                            </div>
                          )}
                          {activeVehicles.length > 0 && (
                            <div className="flex flex-wrap items-center gap-2">
                              {activeVehicles.map((vehicle) => (
                                <div
                                  key={vehicle.vehicleId}
                                  className={cn(
                                    'flex items-center gap-1.5 rounded-full border px-3 py-1',
                                    vehicle.isPrimary
                                      ? 'border-emerald-200 bg-emerald-50'
                                      : 'border-emerald-100 bg-emerald-50/60',
                                  )}
                                >
                                  <span className="material-symbols-outlined text-emerald-600 text-base">
                                    local_shipping
                                  </span>
                                  <span className="font-medium text-emerald-700">
                                    {vehicle.vehicleName} - {vehicle.vehicleLicensePlate}
                                  </span>
                                  {vehicle.isPrimary && (
                                    <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-semibold text-white">
                                      Chính
                                    </span>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                          {activeOperation.stationName && (
                            <div className="flex items-center gap-1.5 text-muted-foreground">
                              <span className="material-symbols-outlined text-base">home_pin</span>
                              {activeOperation.stationName}
                            </div>
                          )}
                          {activeOperation.startedAt && (
                            <div className="flex items-center gap-1.5 text-muted-foreground">
                              <span className="material-symbols-outlined text-base">
                                play_arrow
                              </span>
                              {formatDate(activeOperation.startedAt)}
                            </div>
                          )}
                          {isEnRoute && (
                            <EtaBadge
                              minutes={
                                teamLocation?.estimatedMinutesToArrival ??
                                activeDetail.assignedRescueTeam?.estimatedMinutesToArrival
                              }
                            />
                          )}
                        </div>
                      </div>
                    )}
                    <MissionTrackingMapSection
                      detail={activeDetail}
                      currentOperation={activeOperation}
                      opStatus={opStatus}
                      showMap={showMap}
                      isEnRoute={isEnRoute}
                      isRescuing={isRescuing}
                      teamLocation={teamLocation}
                      trackingPoints={trackingPoints}
                      isRecalculating={isRecalculating}
                      onRecalculateEta={handleRecalculateEta}
                      goongMapKey={GOONG_MAP_KEY}
                      goongApiKey={GOONG_API_KEY}
                      formatDate={formatDate}
                    />
                    {isCompleted && (
                      <div className="rounded-xl border border-green-200 bg-green-50 p-5 space-y-4">
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-green-600">
                            check_circle
                          </span>
                          <h3 className="font-bold text-green-800 text-base">Cứu hộ hoàn thành</h3>
                          {currentOperation?.endedAt && (
                            <span className="text-xs text-green-600 ml-auto">
                              {formatDate(currentOperation.endedAt)}
                            </span>
                          )}
                        </div>
                        {currentOperation?.completionNote && (
                          <div className="bg-white rounded-lg border border-green-200 p-3 text-sm text-gray-700">
                            <p className="text-xs uppercase font-semibold text-green-700 mb-1">
                              Ghi chú team leader
                            </p>
                            <p>{currentOperation.completionNote}</p>
                          </div>
                        )}
                        <div>
                          <p className="text-xs uppercase font-semibold text-green-700 mb-2">
                            Bằng chứng hoàn thành — CompletionEvidence
                            {completionAttachments.length > 0 &&
                              ` (${completionAttachments.length})`}
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
                            <p className="text-sm text-green-600">
                              Chưa có ảnh bằng chứng hoàn thành.
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                    {requestEvidenceAttachments.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-xs uppercase font-semibold text-muted-foreground tracking-wider">
                          Ảnh yêu cầu ban đầu ({requestEvidenceAttachments.length})
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
        </div>
      </div>
    </DashboardLayout>
  );
}
