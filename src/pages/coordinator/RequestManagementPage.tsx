import { useEffect, useMemo, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { cn, formatVietnamesePhoneNumber } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { CoordinatorListPagination } from './components/CoordinatorListPagination';
import { usePrefetchedDirectionsRoute } from './components/usePrefetchedDirectionsRoute';
import { useRescueRequestManagement } from '@/hooks/useRescueRequestManagement';
import { useMyReliefStation } from '@/hooks/useReliefStation';
import type { RescueRequestItem } from '@/services/rescueRequestService';
import { coordinatorNavGroups } from './components/sidebarConfig';
import { RequestLocationMapCard } from './components/RequestLocationMapCard';
import { toast } from 'sonner';
import {
  getDisasterTypeLabel,
  getRescueRequestTypeLabel,
  getVerificationStatusLabel,
  getVerificationStatusClass,
  VerificationMethod,
  VerificationMethodLabel,
  getPriorityLevelLabel,
} from '@/enums/beEnums';
import * as React from 'react';
const verificationStatusText = (status?: number | string | null) =>
  getVerificationStatusLabel(status);

const verificationStatusClass = (status?: number | string | null) =>
  getVerificationStatusClass(status);

const verificationMethodLabel = (method: number) =>
  VerificationMethodLabel[method as VerificationMethod] ?? `Phương thức #${method}`;

const formatDate = (value?: string | null) => {
  if (!value) return '--';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '--';
  return d.toLocaleString('vi-VN');
};

const getRequestId = (req: RescueRequestItem) =>
  String(req.requestId ?? req.rescueRequestId ?? req.id ?? '');

const getVerification = (req?: RescueRequestItem) => req?.verifications?.[0];

type FilterChipProps = {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
  icon?: string;
};

const FilterChip = ({ active, children, onClick, icon }: FilterChipProps) => (
  <button
    type="button"
    onClick={onClick}
    className={cn(
      'inline-flex h-10 shrink-0 items-center gap-2 rounded-full border px-4 text-sm font-medium whitespace-nowrap transition-colors',
      active
        ? 'border-blue-200 bg-blue-50 text-blue-600'
        : 'border-gray-300 bg-white text-gray-700 hover:border-blue-200 hover:bg-blue-50/60 hover:text-blue-600',
    )}
  >
    {icon ? <span className="material-symbols-outlined text-[18px]">{icon}</span> : null}
    {children}
  </button>
);

const isEmergencyRescueRequest = (type?: string | number | null) => {
  if (type == null) return false;
  if (typeof type === 'number') return type === 1;
  const normalized = type.trim().toLowerCase();
  return normalized === '1' || normalized === 'emergency';
};

const isNormalRescueRequest = (type?: string | number | null) => {
  if (type == null) return false;
  if (typeof type === 'number') return type === 0;
  const normalized = type.trim().toLowerCase();
  return normalized === '0' || normalized === 'normal';
};

const formatKm = (value?: number | null) => (value == null ? '-- km' : `${value.toFixed(2)} km`);
const formatMin = (value?: number | null) => (value == null ? '-- phút' : `${value} phút`);
const formatMeters = (value?: number | null) =>
  value == null ? '-- m' : `${value.toLocaleString('vi-VN')} m`;
const formatSeconds = (value?: number | null) =>
  value == null ? '-- giây' : `${value.toLocaleString('vi-VN')} giây`;

const getWeatherConditionLabel = (value?: string | null) => {
  const normalized = String(value ?? '')
    .trim()
    .toLowerCase();

  const map: Record<string, string> = {
    sunny: 'Nắng',
    clear: 'Trời quang',
    partlycloudy: 'Ít mây',
    partly_cloudy: 'Ít mây',
    cloudy: 'Nhiều mây',
    overcast: 'U ám',
    mist: 'Sương mù nhẹ',
    fog: 'Sương mù',
    rain: 'Mưa',
    lightrain: 'Mưa nhẹ',
    light_rain: 'Mưa nhẹ',
    moderaterain: 'Mưa vừa',
    moderate_rain: 'Mưa vừa',
    heavyrain: 'Mưa to',
    heavy_rain: 'Mưa to',
    thunderstorm: 'Dông',
    snow: 'Tuyết',
    windy: 'Nhiều gió',
  };

  return map[normalized] || value || 'Không rõ';
};

const getWeatherRiskLevelLabel = (value?: string | null) => {
  const normalized = String(value ?? '')
    .trim()
    .toLowerCase();

  const map: Record<string, string> = {
    low: 'Thấp',
    medium: 'Trung bình',
    high: 'Cao',
    veryhigh: 'Rất cao',
    very_high: 'Rất cao',
    critical: 'Nguy kịch',
    extreme: 'Cực cao',
  };

  return map[normalized] || value || 'Không rõ';
};

const getPriorityBucket = (value?: string | number | null): 'critical' | 'high' | 'other' => {
  const label = getPriorityLevelLabel(value).toLowerCase();
  if (label === 'khẩn cấp') return 'critical';
  if (label === 'cao') return 'high';
  return 'other';
};

const isWithinCreatedDateFilter = (
  createdAt?: string | null,
  filter?: 'all' | 'today' | '7d' | '30d',
) => {
  if (!filter || filter === 'all') return true;
  if (!createdAt) return false;

  const createdDate = new Date(createdAt);
  if (Number.isNaN(createdDate.getTime())) return false;

  const now = new Date();
  if (filter === 'today') {
    return createdDate.toDateString() === now.toDateString();
  }

  const diffMs = now.getTime() - createdDate.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);

  if (filter === '7d') return diffDays <= 7;
  if (filter === '30d') return diffDays <= 30;
  return true;
};

const getDisasterTypeBadge = (type?: string | number | null): { cls: string; icon: string } => {
  const t = String(type ?? '');
  const map: Record<string, { cls: string; icon: string }> = {
    Flood: { cls: 'border-blue-200 bg-blue-500/10 text-blue-700', icon: 'water' },
    Earthquake: { cls: 'border-yellow-200 bg-yellow-500/10 text-yellow-700', icon: 'sensors' },
    Fire: { cls: 'border-red-200 bg-red-500/10 text-red-700', icon: 'local_fire_department' },
    Storm: { cls: 'border-indigo-200 bg-indigo-500/10 text-indigo-700', icon: 'storm' },
    Landslide: { cls: 'border-orange-200 bg-orange-500/10 text-orange-700', icon: 'landslide' },
  };
  return map[t] ?? { cls: 'border-slate-200 bg-slate-500/10 text-slate-600', icon: 'warning' };
};

const getRescueRequestTypeBadge = (
  type?: string | number | null,
): { cls: string; icon: string } => {
  const t = String(type ?? '');
  const map: Record<string, { cls: string; icon: string }> = {
    Emergency: { cls: 'border-red-300 bg-red-500/15 text-red-700', icon: 'emergency' },
    Urgent: { cls: 'border-orange-300 bg-orange-500/15 text-orange-700', icon: 'priority_high' },
    Normal: { cls: 'border-emerald-300 bg-emerald-500/15 text-emerald-700', icon: 'check_circle' },
    '2': { cls: 'border-red-300 bg-red-500/15 text-red-700', icon: 'emergency' },
    '1': { cls: 'border-orange-300 bg-orange-500/15 text-orange-700', icon: 'priority_high' },
    '0': { cls: 'border-emerald-300 bg-emerald-500/15 text-emerald-700', icon: 'check_circle' },
  };
  return map[t] ?? { cls: 'border-slate-200 bg-slate-500/10 text-slate-600', icon: 'help' };
};

const getPriorityLevelBadge = (value?: string | number | null): { cls: string; icon: string } => {
  const label = getPriorityLevelLabel(value).toLowerCase();
  if (label === 'khẩn cấp') {
    return { cls: 'border-red-300 bg-red-500/15 text-red-700', icon: 'emergency' };
  }
  if (label === 'cao') {
    return { cls: 'border-orange-300 bg-orange-500/15 text-orange-700', icon: 'priority_high' };
  }
  if (label === 'trung bình') {
    return { cls: 'border-yellow-300 bg-yellow-500/15 text-yellow-700', icon: 'flag' };
  }
  return { cls: 'border-emerald-300 bg-emerald-500/15 text-emerald-700', icon: 'check_circle' };
};

const attachmentTypeLabel = (type?: number | string | null) => {
  if (type === 0 || type === '0' || type === 'RequestEvidence') return 'Bằng chứng yêu cầu';
  if (type === 1 || type === '1' || type === 'CompletionEvidence') return 'Bằng chứng hoàn thành';
  return 'Khác';
};

const REQUEST_LIST_PAGE_SIZE = 5;

const GOONG_MAP_KEY = import.meta.env.VITE_GOONG_MAP_KEY || '';
const GOONG_API_KEY = import.meta.env.VITE_GOONG_API_KEY || '';

export default function CoordinatorRequestManagementPage() {
  const {
    requests,
    isLoading,
    isError,
    refetch,
    verifyRequest,
    verifyStatus,
    rejectRequest,
    rejectStatus,
  } = useRescueRequestManagement(1, 10);
  const { station } = useMyReliefStation();

  const [search, setSearch] = useState('');
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);
  const [verificationFilter, setVerificationFilter] = useState<
    'all' | 'pending' | 'approved' | 'rejected'
  >('all');
  const [rescueTypeFilter, setRescueTypeFilter] = useState<'all' | 'normal' | 'emergency'>('all');
  const [createdDateFilter, setCreatedDateFilter] = useState<'all' | 'today' | '7d' | '30d'>('all');
  const [priorityFilter, setPriorityFilter] = useState<'all' | 'critical' | 'high'>('all');
  const [selectedId, setSelectedId] = useState('');
  // listPageState tracks { key: filterKey, page } — changing filters resets page to 1
  const [listPageState, setListPageState] = useState<{ key: string; page: number }>({
    key: '',
    page: 1,
  });

  const [verifyMethod, setVerifyMethod] = useState(1);
  const [verifyNote, setVerifyNote] = useState('');

  const [isRejectOpen, setIsRejectOpen] = useState(false);
  const [rejectMethod, setRejectMethod] = useState(1);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectNote, setRejectNote] = useState('');

  const [actionError, setActionError] = useState('');
  const { prefetchRoute } = usePrefetchedDirectionsRoute(GOONG_API_KEY);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return requests.filter((r) => {
      const status = getVerification(r)?.status;
      const matchStatus =
        verificationFilter === 'all'
          ? true
          : verificationFilter === 'pending'
            ? status === 0 || status === '0' || status === 'Pending' || status == null
            : verificationFilter === 'approved'
              ? status === 1 || status === '1' || status === 'Approved'
              : status === 2 || status === '2' || status === 'Rejected';

      const matchSearch =
        !term ||
        (r.reporterFullName || '').toLowerCase().includes(term) ||
        (r.reporterPhone || '').toLowerCase().includes(term) ||
        (r.address || '').toLowerCase().includes(term) ||
        (r.description || '').toLowerCase().includes(term) ||
        (r.disasterType || '').toLowerCase().includes(term);

      const matchRescueType =
        rescueTypeFilter === 'all'
          ? true
          : rescueTypeFilter === 'emergency'
            ? isEmergencyRescueRequest(r.rescueRequestType)
            : isNormalRescueRequest(r.rescueRequestType);

      const matchCreatedDate = isWithinCreatedDateFilter(r.createdAt, createdDateFilter);

      const priorityBucket = getPriorityBucket(r.priorityLevel);
      const matchPriority =
        priorityFilter === 'all'
          ? true
          : priorityFilter === 'critical'
            ? priorityBucket === 'critical'
            : priorityBucket === 'high';

      return matchStatus && matchSearch && matchRescueType && matchCreatedDate && matchPriority;
    });
  }, [requests, search, verificationFilter, rescueTypeFilter, createdDateFilter, priorityFilter]);

  const requestStats = useMemo(
    () => ({
      total: requests.length,
      pending: requests.filter((r) => {
        const status = getVerification(r)?.status;
        return status === 0 || status === '0' || status === 'Pending' || status == null;
      }).length,
      approved: requests.filter((r) => {
        const status = getVerification(r)?.status;
        return status === 1 || status === '1' || status === 'Approved';
      }).length,
      rejected: requests.filter((r) => {
        const status = getVerification(r)?.status;
        return status === 2 || status === '2' || status === 'Rejected';
      }).length,
    }),
    [requests],
  );

  const totalListPages = Math.max(1, Math.ceil(filtered.length / REQUEST_LIST_PAGE_SIZE));

  // Derive filterKey and effective page — when filter changes, page resets to 1
  const filterKey = `${search}|${verificationFilter}|${rescueTypeFilter}|${createdDateFilter}|${priorityFilter}`;
  const listPage = listPageState.key === filterKey ? listPageState.page : 1;
  const effectiveListPage = Math.min(Math.max(1, listPage), totalListPages);
  const setListPage = (page: number) => setListPageState({ key: filterKey, page });
  const activeFilterCount =
    Number(verificationFilter !== 'all') +
    Number(rescueTypeFilter !== 'all') +
    Number(createdDateFilter !== 'all') +
    Number(priorityFilter !== 'all');

  const paginatedRequests = useMemo(() => {
    const start = (effectiveListPage - 1) * REQUEST_LIST_PAGE_SIZE;
    return filtered.slice(start, start + REQUEST_LIST_PAGE_SIZE);
  }, [filtered, effectiveListPage]);

  // No auto-fallback: effectiveSelectedId is exactly what the user clicked.
  // The old fallback to filtered[0] caused map to try to plot coordinates
  // before the user ever selected anything, breaking the callback-ref map init.
  const effectiveSelectedId = useMemo(() => {
    if (!selectedId) return '';
    const found = filtered.some((r) => getRequestId(r) === selectedId);
    return found ? selectedId : '';
  }, [filtered, selectedId]);

  const selected = useMemo(
    () => filtered.find((r) => getRequestId(r) === effectiveSelectedId),
    [filtered, effectiveSelectedId],
  );
  const verification = getVerification(selected);
  const isEmergencySelected = isEmergencyRescueRequest(selected?.rescueRequestType);
  const currentStatus = verification?.status;
  const isPending =
    currentStatus === 0 ||
    currentStatus === '0' ||
    currentStatus === 'Pending' ||
    currentStatus == null;

  const selectedCoordinates = useMemo(() => {
    const lat = Number(selected?.latitude);
    const lng = Number(selected?.longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    return { lat, lng };
  }, [selected?.latitude, selected?.longitude]);

  const stationCoordinates = useMemo(() => {
    const lat = Number(station?.latitude);
    const lng = Number(station?.longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    return { lat, lng };
  }, [station?.latitude, station?.longitude]);

  const coverageRadiusKm = useMemo(() => {
    const radius = Number((station as any)?.coverageRadiusKm);
    if (Number.isFinite(radius) && radius > 0) return radius;
    return null;
  }, [station]);

  useEffect(() => {
    const firstVisible = paginatedRequests[0];
    if (!firstVisible) return;

    const destination =
      Number.isFinite(Number(firstVisible.latitude)) &&
      Number.isFinite(Number(firstVisible.longitude))
        ? { lat: Number(firstVisible.latitude), lng: Number(firstVisible.longitude) }
        : null;

    prefetchRoute(stationCoordinates, destination);
  }, [paginatedRequests, prefetchRoute, stationCoordinates]);

  // Warm Directions API cache when selection + station coords are available
  useEffect(() => {
    prefetchRoute(stationCoordinates, selectedCoordinates);
  }, [selectedCoordinates, stationCoordinates, prefetchRoute]);

  const requestEvidenceAttachments = useMemo(
    () =>
      (selected?.attachments || []).filter(
        (att: any) =>
          att?.attachmentType === 0 ||
          att?.attachmentType === '0' ||
          att?.attachmentType === 'RequestEvidence' ||
          att?.attachmentType == null,
      ),
    [selected?.attachments],
  );

  const completionEvidenceAttachments = useMemo(
    () =>
      (selected?.attachments || []).filter(
        (att: any) =>
          att?.attachmentType === 1 ||
          att?.attachmentType === '1' ||
          att?.attachmentType === 'CompletionEvidence',
      ),
    [selected?.attachments],
  );

  const handleVerify = async () => {
    if (!selected) return;
    setActionError('');
    try {
      await verifyRequest({
        requestId: getRequestId(selected),
        payload: {
          status: 1,
          method: verifyMethod,
          note: verifyNote.trim() || undefined,
          reason: undefined,
        },
      });
      setVerifyNote('');
      await refetch();
      toast.success('Đã xác minh yêu cầu cứu hộ thành công!');
    } catch (error: any) {
      const msg = error?.response?.data?.message || 'Không thể xác minh yêu cầu.';
      setActionError(msg);
      toast.error(msg);
    }
  };

  const handleReject = async () => {
    if (!selected) return;
    const reason = rejectReason.trim();
    if (!reason) {
      setActionError('Vui lòng nhập lý do từ chối.');
      return;
    }
    setActionError('');
    try {
      await rejectRequest({
        requestId: getRequestId(selected),
        payload: { method: rejectMethod, reason, note: rejectNote.trim() || undefined },
      });
      setRejectReason('');
      setRejectNote('');
      setIsRejectOpen(false);
      await refetch();
      toast.success('Đã từ chối yêu cầu cứu hộ.');
    } catch (error: any) {
      const msg = error?.response?.data?.message || 'Không thể từ chối yêu cầu.';
      setActionError(msg);
      toast.error(msg);
    }
  };

  const clearAllFilters = () => {
    setVerificationFilter('all');
    setRescueTypeFilter('all');
    setCreatedDateFilter('all');
    setPriorityFilter('all');
  };

  return (
    <DashboardLayout navGroups={coordinatorNavGroups}>
      <div className="space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="space-y-2">
            <h1 className="text-3xl font-black text-primary md:text-4xl">Quản lý yêu cầu cứu hộ</h1>
            <p className="max-w-2xl text-sm text-muted-foreground md:text-base">
              Đồng bộ danh sách yêu cầu cần xử lý, theo dõi vị trí và xác minh theo đúng luồng điều
              phối của coordinator.
            </p>
          </div>
          <Button variant="outline" className="h-11 gap-2 px-5" onClick={() => refetch()}>
            <span className="material-symbols-outlined">refresh</span>
            Tải lại
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3 xl:grid-cols-4">
          <Card className="border-border bg-card">
            <CardContent className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    Tổng yêu cầu
                  </p>
                  <p className="mt-3 text-3xl font-black text-foreground">{requestStats.total}</p>
                </div>
                <div className="flex size-11 items-center justify-center rounded-2xl border border-sky-200 bg-sky-500/10 text-sky-600">
                  <span className="material-symbols-outlined">inbox</span>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border bg-card">
            <CardContent className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    Chờ xác minh
                  </p>
                  <p className="mt-3 text-3xl font-black text-amber-600">{requestStats.pending}</p>
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
                    Đã xác minh
                  </p>
                  <p className="mt-3 text-3xl font-black text-emerald-600">
                    {requestStats.approved}
                  </p>
                </div>
                <div className="flex size-11 items-center justify-center rounded-2xl border border-emerald-200 bg-emerald-500/10 text-emerald-600">
                  <span className="material-symbols-outlined">verified</span>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border bg-card">
            <CardContent className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    Từ chối
                  </p>
                  <p className="mt-3 text-3xl font-black text-rose-600">{requestStats.rejected}</p>
                </div>
                <div className="flex size-11 items-center justify-center rounded-2xl border border-rose-200 bg-rose-500/10 text-rose-600">
                  <span className="material-symbols-outlined">cancel</span>
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
                      Hiển thị 5 yêu cầu mỗi trang, có tìm kiếm, lọc và chuyển trang nhanh.
                    </p>
                  </div>

                  <div className="flex items-center gap-3 px-0 pt-1">
                    <div className="relative min-w-0 flex-1">
                      <span className="material-symbols-outlined pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[18px] text-muted-foreground">
                        search
                      </span>
                      <Input
                        className="h-12 rounded-2xl border-border/70 bg-background pl-11 pr-11 shadow-[0_2px_8px_rgba(15,23,42,0.08)]"
                        placeholder="Tìm tên, SĐT, địa chỉ, mô tả..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                      />
                      {search ? (
                        <button
                          type="button"
                          onClick={() => setSearch('')}
                          className="absolute right-3 top-1/2 inline-flex size-7 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground"
                          aria-label="Xóa tìm kiếm"
                        >
                          <span className="material-symbols-outlined text-[18px]">close</span>
                        </button>
                      ) : null}
                    </div>
                    <Button
                      variant="outline"
                      className="h-12 shrink-0 rounded-2xl border-border/70 px-4 shadow-[0_2px_8px_rgba(15,23,42,0.06)]"
                      onClick={() => setIsFilterSheetOpen(true)}
                    >
                      <span className="material-symbols-outlined text-[18px]">filter_alt</span>
                      Bộ lọc
                      {activeFilterCount > 0 ? (
                        <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-blue-50 px-1.5 text-xs font-semibold text-blue-600">
                          {activeFilterCount}
                        </span>
                      ) : null}
                    </Button>
                  </div>

                  {activeFilterCount > 0 ? (
                    <div className="mt-3 flex items-center gap-2 overflow-x-auto px-0 pb-1 whitespace-nowrap [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                      {rescueTypeFilter !== 'all' ? (
                        <FilterChip
                          active
                          icon="emergency_home"
                          onClick={() => setRescueTypeFilter('all')}
                        >
                          {rescueTypeFilter === 'emergency'
                            ? 'Khẩn cấp'
                            : rescueTypeFilter === 'normal'
                              ? 'Bình thường'
                              : 'Mọi loại'}
                        </FilterChip>
                      ) : null}
                      {verificationFilter !== 'all' ? (
                        <FilterChip
                          active
                          icon="fact_check"
                          onClick={() => setVerificationFilter('all')}
                        >
                          {verificationFilter === 'pending'
                            ? 'Chờ xác minh'
                            : verificationFilter === 'approved'
                              ? 'Đã xác minh'
                              : 'Từ chối'}
                        </FilterChip>
                      ) : null}
                      {createdDateFilter !== 'all' ? (
                        <FilterChip
                          active
                          icon="calendar_month"
                          onClick={() => setCreatedDateFilter('all')}
                        >
                          {createdDateFilter === 'today'
                            ? 'Hôm nay'
                            : createdDateFilter === '7d'
                              ? '7 ngày gần đây'
                              : '30 ngày gần đây'}
                        </FilterChip>
                      ) : null}
                      {priorityFilter !== 'all' ? (
                        <FilterChip active icon="flag" onClick={() => setPriorityFilter('all')}>
                          {priorityFilter === 'critical' ? 'Ưu tiên khẩn cấp' : 'Ưu tiên cao'}
                        </FilterChip>
                      ) : null}
                      <button
                        type="button"
                        onClick={clearAllFilters}
                        className="inline-flex h-10 shrink-0 items-center rounded-full border border-gray-300 bg-white px-4 text-sm font-medium text-gray-700"
                      >
                        Xóa bộ lọc
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="flex-1 overflow-auto px-4 py-4">
                {isLoading ? (
                  <div className="space-y-2">
                    {[1, 2, 3, 4, 5].map((k) => (
                      <Skeleton key={k} className="h-24 rounded-2xl" />
                    ))}
                  </div>
                ) : isError ? (
                  <div className="rounded-2xl border border-rose-200 bg-rose-500/5 px-4 py-4 text-sm text-rose-600">
                    Không tải được danh sách yêu cầu.
                  </div>
                ) : filtered.length === 0 ? (
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
                      const id = getRequestId(req);
                      const verificationItem = getVerification(req);
                      const isActive = id === effectiveSelectedId;

                      return (
                        <button
                          key={id}
                          onClick={() => {
                            setSelectedId(id);
                            const destination =
                              Number.isFinite(Number(req.latitude)) &&
                              Number.isFinite(Number(req.longitude))
                                ? { lat: Number(req.latitude), lng: Number(req.longitude) }
                                : null;
                            prefetchRoute(stationCoordinates, destination);
                          }}
                          onMouseEnter={() => {
                            const destination =
                              Number.isFinite(Number(req.latitude)) &&
                              Number.isFinite(Number(req.longitude))
                                ? { lat: Number(req.latitude), lng: Number(req.longitude) }
                                : null;
                            prefetchRoute(stationCoordinates, destination);
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
                              <p className="mt-1 truncate text-xs text-muted-foreground">
                                {req.address || 'Chua cap nhat dia chi'}
                              </p>
                            </div>
                            <span
                              className={cn(
                                'shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-semibold',
                                verificationStatusClass(verificationItem?.status),
                              )}
                            >
                              {verificationStatusText(verificationItem?.status)}
                            </span>
                          </div>
                          <div className="mt-3 flex flex-wrap gap-2">
                            {req.disasterType != null ? (
                              (() => {
                                const badge = getDisasterTypeBadge(req.disasterType);
                                return (
                                  <span
                                    className={cn(
                                      'inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium',
                                      badge.cls,
                                    )}
                                  >
                                    <span className="material-symbols-outlined text-sm">
                                      {badge.icon}
                                    </span>
                                    {getDisasterTypeLabel(req.disasterType)}
                                  </span>
                                );
                              })()
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-2.5 py-1 text-[11px] text-muted-foreground">
                                <span className="material-symbols-outlined text-sm">cyclone</span>
                                --
                              </span>
                            )}
                            {req.rescueRequestType != null
                              ? (() => {
                                  const badge = getRescueRequestTypeBadge(req.rescueRequestType);
                                  return (
                                    <span
                                      className={cn(
                                        'inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium',
                                        badge.cls,
                                      )}
                                    >
                                      <span className="material-symbols-outlined text-sm">
                                        {badge.icon}
                                      </span>
                                      {getRescueRequestTypeLabel(req.rescueRequestType)}
                                    </span>
                                  );
                                })()
                              : null}
                            <span className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-2.5 py-1 text-[11px] text-muted-foreground">
                              <span className="material-symbols-outlined text-sm">route</span>
                              {formatKm(req.stationToRequestDistanceKm)}
                            </span>
                            <span className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-2.5 py-1 text-[11px] text-muted-foreground">
                              <span className="material-symbols-outlined text-sm">schedule</span>
                              {formatMin(req.stationToRequestDurationMinutes)}
                            </span>
                          </div>
                          <p className="mt-3 text-xs text-muted-foreground">
                            {formatDate(req.createdAt)}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="border-t border-border/70 px-5 py-4">
                <CoordinatorListPagination
                  currentPage={effectiveListPage}
                  totalPages={totalListPages}
                  onPageChange={setListPage}
                  labels={{ previous: 'Prev', next: 'Next', jumpTo: 'Tới trang', go: 'Đi' }}
                  summary={
                    <>
                      Trang {effectiveListPage}/{totalListPages} - Hiển thị{' '}
                      {paginatedRequests.length} / {filtered.length} yêu cầu lọc được.
                    </>
                  }
                />
              </div>
            </CardContent>
          </Card>

          <div className="min-h-0 xl:max-h-[calc(100vh-4rem)] xl:overflow-y-auto xl:pr-1">
            <Card className="rounded-2xl border-border bg-card">
              <CardContent className="p-4 md:p-6">
                {!selected ? (
                  <div className="flex min-h-[520px] items-center justify-center rounded-2xl border border-dashed border-border bg-muted/10 p-6 text-center text-muted-foreground">
                    Chọn một yêu cầu để xem chi tiết.
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="flex flex-wrap items-start justify-between gap-3 rounded-2xl border border-border bg-gradient-to-br from-primary/5 via-background to-background p-5">
                      <div>
                        <h2 className="text-2xl font-black">{selected.reporterFullName || '--'}</h2>
                        <p className="text-sm text-muted-foreground mt-1">
                          Mã yêu cầu: {getRequestId(selected) || '--'}
                        </p>
                      </div>
                      <span
                        className={cn(
                          'text-xs px-3 py-1 rounded-full border font-semibold',
                          verificationStatusClass(verification?.status),
                        )}
                      >
                        {verificationStatusText(verification?.status)}
                      </span>
                    </div>

                    <div className="space-y-4">
                      <div className="overflow-hidden rounded-2xl border border-border p-4 space-y-3">
                        <p className="text-sm font-semibold">A. Thông tin yêu cầu</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <p className="text-xs uppercase text-muted-foreground font-semibold">
                              Loại thiên tai
                            </p>
                            {selected.disasterType != null ? (
                              (() => {
                                const badge = getDisasterTypeBadge(selected.disasterType);
                                return (
                                  <span
                                    className={cn(
                                      'mt-1 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold',
                                      badge.cls,
                                    )}
                                  >
                                    <span className="material-symbols-outlined text-sm">
                                      {badge.icon}
                                    </span>
                                    {getDisasterTypeLabel(selected.disasterType)}
                                  </span>
                                );
                              })()
                            ) : (
                              <p className="text-sm">--</p>
                            )}
                          </div>
                          <div>
                            <p className="text-xs uppercase text-muted-foreground font-semibold">
                              Loại yêu cầu cứu hộ
                            </p>
                            {selected.rescueRequestType != null ? (
                              (() => {
                                const badge = getRescueRequestTypeBadge(selected.rescueRequestType);
                                return (
                                  <span
                                    className={cn(
                                      'mt-1 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold',
                                      badge.cls,
                                    )}
                                  >
                                    <span className="material-symbols-outlined text-sm">
                                      {badge.icon}
                                    </span>
                                    {getRescueRequestTypeLabel(selected.rescueRequestType)}
                                  </span>
                                );
                              })()
                            ) : (
                              <p className="text-sm">--</p>
                            )}
                          </div>
                          <div>
                            <p className="text-xs uppercase text-muted-foreground font-semibold">
                              Mức ưu tiên
                            </p>
                            {(() => {
                              const badge = getPriorityLevelBadge(selected.priorityLevel);
                              return (
                                <span
                                  className={cn(
                                    'mt-1 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold',
                                    badge.cls,
                                  )}
                                >
                                  <span className="material-symbols-outlined text-sm">
                                    {badge.icon}
                                  </span>
                                  {getPriorityLevelLabel(selected.priorityLevel)}
                                </span>
                              );
                            })()}
                          </div>
                          <div>
                            <p className="text-xs uppercase text-muted-foreground font-semibold">
                              Mức độ đánh giá
                            </p>
                            <p>{selected.priority ?? 'Không rõ'}/100</p>
                          </div>
                          <div>
                            <p className="text-xs uppercase text-muted-foreground font-semibold">
                              Số điện thoại người báo tin
                            </p>
                            <p className="text-sm">
                              {formatVietnamesePhoneNumber(selected.reporterPhone) || '--'}
                            </p>
                          </div>
                          <div className="md:col-span-2">
                            <p className="text-xs uppercase text-muted-foreground font-semibold">
                              Mô tả
                            </p>
                            <p className="text-sm">{selected.description || 'Không có mô tả'}</p>
                          </div>
                        </div>
                      </div>

                      <div className="rounded-2xl border border-border p-4 space-y-3">
                        <p className="text-sm font-semibold">B. Vị trí</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="md:col-span-2">
                            <p className="text-xs uppercase text-muted-foreground font-semibold">
                              Địa chỉ
                            </p>
                            <p className="text-sm">{selected.address || 'Chưa cập nhật'}</p>
                          </div>
                          <div>
                            <p className="text-xs uppercase text-muted-foreground font-semibold">
                              Vĩ độ
                            </p>
                            <p className="text-sm">{selected.latitude ?? '--'}</p>
                          </div>
                          <div>
                            <p className="text-xs uppercase text-muted-foreground font-semibold">
                              Kinh độ
                            </p>
                            <p className="text-sm">{selected.longitude ?? '--'}</p>
                          </div>
                          <div className="md:col-span-2">
                            <p className="text-xs uppercase text-muted-foreground font-semibold mb-2">
                              Bản đồ vị trí yêu cầu
                            </p>
                            <RequestLocationMapCard
                              selected={selected}
                              station={station}
                              stationCoordinates={stationCoordinates}
                              selectedCoordinates={selectedCoordinates}
                              coverageRadiusKm={coverageRadiusKm}
                              goongMapKey={GOONG_MAP_KEY}
                              goongApiKey={import.meta.env.VITE_GOONG_API_KEY || ''}
                            />
                          </div>
                        </div>
                      </div>

                      <div className="rounded-2xl border border-border p-4 space-y-3">
                        <p className="text-sm font-semibold">
                          C. Khoảng cách & thời gian di chuyển
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <p className="text-xs uppercase text-muted-foreground font-semibold">
                              Thời gian tạo
                            </p>
                            <p className="text-sm">{formatDate(selected.createdAt)}</p>
                          </div>
                          <div>
                            <p className="text-xs uppercase text-muted-foreground font-semibold">
                              Khoảng cách (km)
                            </p>
                            <p className="text-sm">
                              {formatKm(selected.stationToRequestDistanceKm)}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs uppercase text-muted-foreground font-semibold">
                              Thời gian di chuyển (phút)
                            </p>
                            <p className="text-sm">
                              {formatMin(selected.stationToRequestDurationMinutes)}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs uppercase text-muted-foreground font-semibold">
                              Khoảng cách (m)
                            </p>
                            <p className="text-sm">
                              {formatMeters(selected.stationToRequestDistanceMeters)}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs uppercase text-muted-foreground font-semibold">
                              Thời gian di chuyển (giây)
                            </p>
                            <p className="text-sm">
                              {formatSeconds(selected.stationToRequestDurationSeconds)}
                            </p>
                          </div>
                        </div>
                      </div>

                      {isEmergencySelected && (
                        <div className="rounded-2xl border border-red-200 bg-red-500/5 p-4 space-y-3">
                          <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-red-600">
                              partly_cloudy_day
                            </span>
                            <p className="text-sm font-semibold text-red-700">
                              D. Thông tin thời tiết
                            </p>
                          </div>
                          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <div>
                              <p className="text-xs uppercase text-muted-foreground font-semibold">
                                Tình trạng thời tiết
                              </p>
                              <p className="text-sm">
                                {getWeatherConditionLabel(selected.weatherCondition)}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs uppercase text-muted-foreground font-semibold">
                                Thời điểm quan sát
                              </p>
                              <p className="text-sm">{formatDate(selected.weatherObservedAt)}</p>
                            </div>
                            <div>
                              <p className="text-xs uppercase text-muted-foreground font-semibold">
                                Nhiệt độ
                              </p>
                              <p className="text-sm">
                                {selected.weatherTempC == null
                                  ? '-- °C'
                                  : `${selected.weatherTempC} °C`}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs uppercase text-muted-foreground font-semibold">
                                Tốc độ gió
                              </p>
                              <p className="text-sm">
                                {selected.weatherWindKph == null
                                  ? '-- km/h'
                                  : `${selected.weatherWindKph} km/h`}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs uppercase text-muted-foreground font-semibold">
                                Lượng mưa
                              </p>
                              <p className="text-sm">
                                {selected.weatherPrecipMm == null
                                  ? '-- mm'
                                  : `${selected.weatherPrecipMm} mm`}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs uppercase text-muted-foreground font-semibold">
                                Tầm nhìn
                              </p>
                              <p className="text-sm">
                                {selected.weatherVisibilityKm == null
                                  ? '-- km'
                                  : `${selected.weatherVisibilityKm} km`}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs uppercase text-muted-foreground font-semibold">
                                Điểm rủi ro thời tiết
                              </p>
                              <p className="text-sm">{selected.weatherRiskScore ?? '--'}</p>
                            </div>
                            <div className="md:col-span-2">
                              <p className="text-xs uppercase text-muted-foreground font-semibold">
                                Mức rủi ro thời tiết
                              </p>
                              <p className="text-sm">
                                {getWeatherRiskLevelLabel(selected.weatherRiskLevel)}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="overflow-hidden rounded-2xl border border-border p-4 space-y-3">
                      <p className="text-sm font-semibold">E. Tệp đính kèm</p>
                      {selected.attachments?.length ? (
                        <div className="space-y-4">
                          <div>
                            <p className="text-xs uppercase text-muted-foreground font-semibold mb-2">
                              RequestEvidence (0) · Bằng chứng yêu cầu
                            </p>
                            {requestEvidenceAttachments.length ? (
                              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
                                {requestEvidenceAttachments.map((att) => (
                                  <a
                                    key={att.attachmentId}
                                    href={att.fileUrl || '#'}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="overflow-hidden rounded-2xl border border-border bg-accent/30"
                                    title={attachmentTypeLabel(att.attachmentType)}
                                  >
                                    <img
                                      src={att.fileUrl || ''}
                                      alt="attachment"
                                      className="w-full h-28 object-cover"
                                      onError={(e) => {
                                        (e.currentTarget as HTMLImageElement).style.display =
                                          'none';
                                      }}
                                    />
                                  </a>
                                ))}
                              </div>
                            ) : (
                              <p className="text-sm text-muted-foreground">
                                Không có bằng chứng yêu cầu.
                              </p>
                            )}
                          </div>

                          <div>
                            <p className="text-xs uppercase text-muted-foreground font-semibold mb-2">
                              CompletionEvidence (1) · Bằng chứng hoàn thành
                            </p>
                            {completionEvidenceAttachments.length ? (
                              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
                                {completionEvidenceAttachments.map((att) => (
                                  <a
                                    key={att.attachmentId}
                                    href={att.fileUrl || '#'}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="overflow-hidden rounded-2xl border border-border bg-accent/30"
                                    title={attachmentTypeLabel(att.attachmentType)}
                                  >
                                    <img
                                      src={att.fileUrl || ''}
                                      alt="attachment"
                                      className="w-full h-28 object-cover"
                                      onError={(e) => {
                                        (e.currentTarget as HTMLImageElement).style.display =
                                          'none';
                                      }}
                                    />
                                  </a>
                                ))}
                              </div>
                            ) : (
                              <p className="text-sm text-muted-foreground">
                                Không có bằng chứng hoàn thành.
                              </p>
                            )}
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">Không có ảnh đính kèm.</p>
                      )}
                    </div>

                    <div className="rounded-2xl border border-border p-4 space-y-3">
                      <p className="text-sm font-semibold">F. Xác minh yêu cầu</p>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <p className="text-xs uppercase text-muted-foreground mb-1">
                            Phương thức xác minh
                          </p>
                          <select
                            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                            value={verifyMethod}
                            onChange={(e) => setVerifyMethod(Number(e.target.value))}
                          >
                            {[0, 1, 2, 3, 4, 5].map((m) => (
                              <option key={m} value={m}>
                                {verificationMethodLabel(m)}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <p className="text-xs uppercase text-muted-foreground mb-1">
                            Ghi chú xác minh
                          </p>
                          <Textarea
                            value={verifyNote}
                            onChange={(e) => setVerifyNote(e.target.value)}
                            placeholder="Ghi chú xác minh (không bắt buộc)"
                            rows={2}
                          />
                        </div>
                      </div>

                      {/* <div className="flex flex-wrap gap-3">
                      <Button
                        variant="primary"
                        onClick={handleVerify}
                        disabled={!isPending || verifyStatus === 'pending'}
                      >
                        {verifyStatus === 'pending' ? 'Đang xác minh...' : 'Xác minh'}
                      </Button>
                      <Button
                        variant="outline"
                        className="text-red-600 border-red-500/30 hover:bg-red-500/10"
                        onClick={() => {
                          setActionError('');
                          setIsRejectOpen(true);
                        }}
                        disabled={!isPending || rejectStatus === 'pending'}
                      >
                        Từ chối
                      </Button>
                    </div> */}
                    </div>

                    {verification?.status === 2 && (
                      <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-4">
                        <p className="text-xs uppercase font-semibold text-red-600">
                          Lý do từ chối
                        </p>
                        <p className="text-sm text-red-700 mt-1">
                          {verification.reason || 'Không có lý do'}
                        </p>
                      </div>
                    )}

                    <Card className="sticky bottom-0 z-10 rounded-2xl border-border bg-card/95 shadow-lg backdrop-blur supports-[backdrop-filter]:bg-card/85">
                      <CardContent className="space-y-3 p-5">
                        <div className="flex flex-wrap gap-3">
                          <Button
                            variant="primary"
                            onClick={handleVerify}
                            disabled={!isPending || verifyStatus === 'pending'}
                          >
                            {verifyStatus === 'pending' ? 'Đang xác minh...' : 'Xác minh'}
                          </Button>
                          <Button
                            variant="outline"
                            className="text-red-600 border-red-500/30 hover:bg-red-500/10"
                            onClick={() => {
                              setActionError('');
                              setIsRejectOpen(true);
                            }}
                            disabled={!isPending || rejectStatus === 'pending'}
                          >
                            Từ chối
                          </Button>
                        </div>
                        {!isPending && (
                          <p className="text-xs text-muted-foreground">
                            Chỉ yêu cầu ở trạng thái Chờ xác minh mới có thể xác minh hoặc từ chối.
                          </p>
                        )}
                        {actionError ? <p className="text-sm text-red-500">{actionError}</p> : null}
                      </CardContent>
                    </Card>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <Dialog open={isRejectOpen} onOpenChange={setIsRejectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Từ chối yêu cầu cứu hộ</DialogTitle>
            <DialogDescription>
              Chọn method và nhập lý do từ chối. Lý do là bắt buộc.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium">Phương thức xác minh</label>
              <select
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                value={rejectMethod}
                onChange={(e) => setRejectMethod(Number(e.target.value))}
              >
                {[0, 1, 2, 3, 4, 5].map((m) => (
                  <option key={m} value={m}>
                    {verificationMethodLabel(m)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium">Lý do từ chối *</label>
              <Textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Nhập lý do từ chối"
                rows={3}
              />
            </div>

            <div>
              <label className="text-sm font-medium">Ghi chú</label>
              <Textarea
                value={rejectNote}
                onChange={(e) => setRejectNote(e.target.value)}
                placeholder="Ghi chú thêm (không bắt buộc)"
                rows={2}
              />
            </div>
          </div>

          {actionError ? <p className="text-sm text-red-500">{actionError}</p> : null}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsRejectOpen(false);
                setRejectReason('');
                setRejectNote('');
                setActionError('');
              }}
              disabled={rejectStatus === 'pending'}
            >
              Hủy
            </Button>
            <Button variant="primary" onClick={handleReject} disabled={rejectStatus === 'pending'}>
              {rejectStatus === 'pending' ? 'Đang xử lý...' : 'Xác nhận từ chối'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Sheet open={isFilterSheetOpen} onOpenChange={setIsFilterSheetOpen}>
        <SheetContent side="bottom" className="max-h-[88vh] rounded-t-[28px] px-0">
          <SheetHeader className="px-4 sm:px-6">
            <SheetTitle>Bộ lọc yêu cầu cứu hộ</SheetTitle>
            <SheetDescription>
              Lọc theo loại cứu hộ, trạng thái xác minh, ngày tạo và mức ưu tiên.
            </SheetDescription>
          </SheetHeader>

          <SheetBody className="space-y-5 px-4 sm:px-6">
            <div className="space-y-2">
              <p className="text-sm font-semibold text-foreground">Loại cứu hộ</p>
              <div className="flex gap-2 overflow-x-auto pb-1 whitespace-nowrap [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                <FilterChip
                  active={rescueTypeFilter === 'all'}
                  icon="apps"
                  onClick={() => setRescueTypeFilter('all')}
                >
                  Mọi loại cứu hộ
                </FilterChip>
                <FilterChip
                  active={rescueTypeFilter === 'normal'}
                  icon="health_and_safety"
                  onClick={() => setRescueTypeFilter('normal')}
                >
                  Cứu hộ bình thường
                </FilterChip>
                <FilterChip
                  active={rescueTypeFilter === 'emergency'}
                  icon="emergency"
                  onClick={() => setRescueTypeFilter('emergency')}
                >
                  Cứu hộ khẩn cấp
                </FilterChip>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-semibold text-foreground">Trạng thái</p>
              <div className="flex gap-2 overflow-x-auto pb-1 whitespace-nowrap [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                <FilterChip
                  active={verificationFilter === 'all'}
                  icon="apps"
                  onClick={() => setVerificationFilter('all')}
                >
                  Tất cả
                </FilterChip>
                <FilterChip
                  active={verificationFilter === 'pending'}
                  icon="schedule"
                  onClick={() => setVerificationFilter('pending')}
                >
                  Chờ xác minh
                </FilterChip>
                <FilterChip
                  active={verificationFilter === 'approved'}
                  icon="verified"
                  onClick={() => setVerificationFilter('approved')}
                >
                  Đã xác minh
                </FilterChip>
                <FilterChip
                  active={verificationFilter === 'rejected'}
                  icon="cancel"
                  onClick={() => setVerificationFilter('rejected')}
                >
                  Từ chối
                </FilterChip>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-semibold text-foreground">Ngày tạo</p>
              <div className="flex gap-2 overflow-x-auto pb-1 whitespace-nowrap [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                <FilterChip
                  active={createdDateFilter === 'all'}
                  icon="event"
                  onClick={() => setCreatedDateFilter('all')}
                >
                  Tất cả
                </FilterChip>
                <FilterChip
                  active={createdDateFilter === 'today'}
                  icon="today"
                  onClick={() => setCreatedDateFilter('today')}
                >
                  Hôm nay
                </FilterChip>
                <FilterChip
                  active={createdDateFilter === '7d'}
                  icon="date_range"
                  onClick={() => setCreatedDateFilter('7d')}
                >
                  7 ngày gần đây
                </FilterChip>
                <FilterChip
                  active={createdDateFilter === '30d'}
                  icon="calendar_month"
                  onClick={() => setCreatedDateFilter('30d')}
                >
                  30 ngày gần đây
                </FilterChip>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-semibold text-foreground">Mức ưu tiên</p>
              <div className="flex gap-2 overflow-x-auto pb-1 whitespace-nowrap [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                <FilterChip
                  active={priorityFilter === 'all'}
                  icon="flag"
                  onClick={() => setPriorityFilter('all')}
                >
                  Tất cả
                </FilterChip>
                <FilterChip
                  active={priorityFilter === 'critical'}
                  icon="warning"
                  onClick={() => setPriorityFilter('critical')}
                >
                  Khẩn cấp
                </FilterChip>
                <FilterChip
                  active={priorityFilter === 'high'}
                  icon="priority_high"
                  onClick={() => setPriorityFilter('high')}
                >
                  Cao
                </FilterChip>
              </div>
            </div>
          </SheetBody>

          <SheetFooter className="border-t border-border px-4 py-4 sm:px-6">
            <div className="flex w-full gap-3">
              <Button variant="outline" className="flex-1 rounded-2xl" onClick={clearAllFilters}>
                Xóa bộ lọc
              </Button>
              <Button
                variant="primary"
                className="flex-1 rounded-2xl"
                onClick={() => setIsFilterSheetOpen(false)}
              >
                Áp dụng
              </Button>
            </div>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </DashboardLayout>
  );
}
