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

const formatKm = (value?: number | null) => (value == null ? '-- km' : `${value.toFixed(2)} km`);
const formatMin = (value?: number | null) => (value == null ? '-- phút' : `${value} phút`);
const formatMeters = (value?: number | null) =>
  value == null ? '-- m' : `${value.toLocaleString('vi-VN')} m`;
const formatSeconds = (value?: number | null) =>
  value == null ? '-- giây' : `${value.toLocaleString('vi-VN')} giây`;

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
  const [verificationFilter, setVerificationFilter] = useState<
    'all' | 'pending' | 'approved' | 'rejected'
  >('all');
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

      return matchStatus && matchSearch;
    });
  }, [requests, search, verificationFilter]);

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
  const filterKey = `${search}|${verificationFilter}`;
  const listPage = listPageState.key === filterKey ? listPageState.page : 1;
  const effectiveListPage = Math.min(Math.max(1, listPage), totalListPages);
  const setListPage = (page: number) => setListPageState({ key: filterKey, page });

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

                  <div className="grid grid-cols-1 gap-3 ">
                    <div className="relative">
                      <span className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-base text-muted-foreground">
                        search
                      </span>
                      <Input
                        className="h-11 border-border bg-background pl-10"
                        placeholder="Tìm tên, SĐT, địa chỉ, mô tả..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant={verificationFilter === 'all' ? 'primary' : 'outline'}
                      className="rounded-full"
                      onClick={() => setVerificationFilter('all')}
                    >
                      <span className="material-symbols-outlined text-sm">apps</span>
                      Tất cả
                    </Button>
                    <Button
                      size="sm"
                      variant={verificationFilter === 'pending' ? 'primary' : 'outline'}
                      className={cn(
                        'rounded-full',
                        verificationFilter === 'pending' &&
                          'border-amber-300 bg-amber-500/15 text-amber-700 hover:bg-amber-500/20',
                      )}
                      onClick={() => setVerificationFilter('pending')}
                    >
                      <span className="material-symbols-outlined text-sm">schedule</span>
                      Chờ xác minh
                    </Button>
                    <Button
                      size="sm"
                      variant={verificationFilter === 'approved' ? 'success' : 'outline'}
                      className="rounded-full"
                      onClick={() => setVerificationFilter('approved')}
                    >
                      <span className="material-symbols-outlined text-sm">verified</span>
                      Đã xác minh
                    </Button>
                    <Button
                      size="sm"
                      variant={verificationFilter === 'rejected' ? 'destructive' : 'outline'}
                      className="rounded-full"
                      onClick={() => setVerificationFilter('rejected')}
                    >
                      <span className="material-symbols-outlined text-sm">cancel</span>
                      Từ chối
                    </Button>
                  </div>
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
                    </div>

                    <div className="overflow-hidden rounded-2xl border border-border p-4 space-y-3">
                      <p className="text-sm font-semibold">D. Tệp đính kèm</p>
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
                      <p className="text-sm font-semibold">E. Xác minh yêu cầu</p>

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
    </DashboardLayout>
  );
}
