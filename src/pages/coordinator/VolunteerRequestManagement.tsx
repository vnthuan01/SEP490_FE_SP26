import { useEffect, useMemo, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { useVolunteerReviewApplications } from '@/hooks/useVolunteerReviewApplications';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { coordinatorNavGroups } from './components/sidebarConfig';
import {
  VerificationStatus,
  VerificationStatusLabel,
  VolunteerStatus,
  VolunteerStatusLabel,
  TeamRolePreference,
  TeamRolePreferenceLabel,
} from '@/enums/beEnums';
import { parseApiError } from '@/lib/apiErrors';

type StatusFilter = 'all' | 'pending' | 'approved' | 'rejected';

const VOL_PAGE_SIZE = 5;

const buildPageItems = (currentPage: number, totalPages: number): Array<number | 'ellipsis'> => {
  if (totalPages <= 1) return [1];

  const pages = new Set<number>([1, totalPages, currentPage]);
  if (currentPage > 1) pages.add(currentPage - 1);
  if (currentPage < totalPages) pages.add(currentPage + 1);

  const sorted = Array.from(pages).sort((a, b) => a - b);
  const items: Array<number | 'ellipsis'> = [];

  sorted.forEach((page, index) => {
    const prev = sorted[index - 1];
    if (prev && page - prev > 1) items.push('ellipsis');
    items.push(page);
  });

  return items;
};

const getVerificationStatusText = (status: number) =>
  VerificationStatusLabel[status as VerificationStatus] ?? 'Không rõ';

const getVerificationStatusStyle = (status: number) => {
  switch (status) {
    case 1:
      return 'border-amber-200 bg-amber-500/10 text-amber-700';
    case 2:
      return 'border-emerald-200 bg-emerald-500/10 text-emerald-700';
    case 3:
      return 'border-rose-200 bg-rose-500/10 text-rose-700';
    default:
      return 'border-slate-200 bg-slate-500/10 text-slate-600';
  }
};

const getVolunteerStatusText = (status: number) =>
  VolunteerStatusLabel[status as VolunteerStatus] ?? 'Không rõ';

const getPreferredTeamRoleText = (role: number) =>
  TeamRolePreferenceLabel[role as TeamRolePreference] ?? `Vai trò #${role}`;

/** Icon theo vai trò mong muốn (Material Symbols). */
const getPreferredTeamRoleIconName = (role: number): string => {
  switch (role) {
    case TeamRolePreference.Leader:
      return 'military_tech';
    case TeamRolePreference.Driver:
      return 'steering_wheel';
    case TeamRolePreference.Member:
    default:
      return 'diversity_3';
  }
};

const formatDateTimeVN = (value?: string | null) => {
  if (!value) return '--';
  return new Date(value).toLocaleString('vi-VN');
};

const formatDateVN = (value?: string | null) => {
  if (!value) return '--';
  return new Date(value).toLocaleDateString('vi-VN');
};

const getAgeTextFromDob = (value?: string | null) => {
  if (!value) return '--';
  const dob = new Date(value);
  if (Number.isNaN(dob.getTime())) return '--';
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const m = now.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) age -= 1;
  return `${age}`;
};

export default function CoordinatorVolunteerRequestPage() {
  const {
    applications,
    paging,
    isLoading,
    isError,
    refetch,
    approveApplication,
    approveStatus,
    rejectApplication,
    rejectStatus,
  } = useVolunteerReviewApplications();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [selectedId, setSelectedId] = useState<string>('');
  const [listPage, setListPage] = useState(1);
  const [pageInput, setPageInput] = useState('1');
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [actionError, setActionError] = useState('');

  const sortedApplications = useMemo(() => {
    const list = [...applications];
    return list.sort((a, b) => {
      const score = (v: number) => (v === 1 ? 0 : v === 2 ? 1 : v === 3 ? 2 : 3);
      return score(a.verificationStatus) - score(b.verificationStatus);
    });
  }, [applications]);

  const filteredApplications = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return sortedApplications.filter((app) => {
      const matchesSearch =
        !term ||
        app.fullName.toLowerCase().includes(term) ||
        app.email.toLowerCase().includes(term) ||
        app.phoneNumber.toLowerCase().includes(term);

      const matchesStatus =
        statusFilter === 'all'
          ? true
          : statusFilter === 'pending'
            ? app.verificationStatus === 1
            : statusFilter === 'approved'
              ? app.verificationStatus === 2
              : app.verificationStatus === 3;

      return matchesSearch && matchesStatus;
    });
  }, [sortedApplications, searchTerm, statusFilter]);

  const totalListPages = Math.max(1, Math.ceil(filteredApplications.length / VOL_PAGE_SIZE));

  useEffect(() => {
    setListPage(1);
  }, [searchTerm, statusFilter]);

  useEffect(() => {
    if (listPage > totalListPages) setListPage(totalListPages);
  }, [listPage, totalListPages]);

  useEffect(() => {
    setPageInput(String(listPage));
  }, [listPage]);

  const paginatedApplications = useMemo(() => {
    const start = (listPage - 1) * VOL_PAGE_SIZE;
    return filteredApplications.slice(start, start + VOL_PAGE_SIZE);
  }, [filteredApplications, listPage]);

  const listPageItems = buildPageItems(listPage, totalListPages);

  const effectiveSelectedId = useMemo(() => {
    if (!filteredApplications.length) return '';
    const found = filteredApplications.some((x) => x.volunteerProfileId === selectedId);
    return found ? selectedId : filteredApplications[0].volunteerProfileId;
  }, [filteredApplications, selectedId]);

  const selectedApplication = useMemo(
    () => filteredApplications.find((x) => x.volunteerProfileId === effectiveSelectedId),
    [filteredApplications, effectiveSelectedId],
  );

  const stats = useMemo(() => {
    const pending = applications.filter((x) => x.verificationStatus === 1).length;
    const approved = applications.filter((x) => x.verificationStatus === 2).length;
    const rejected = applications.filter((x) => x.verificationStatus === 3).length;
    return { total: applications.length, pending, approved, rejected };
  }, [applications]);

  const isPendingSelected = selectedApplication?.verificationStatus === 1;

  const handleJumpToPage = () => {
    const nextPage = Number(pageInput);
    if (!Number.isFinite(nextPage)) {
      setPageInput(String(listPage));
      return;
    }
    setListPage(Math.min(Math.max(1, Math.trunc(nextPage)), totalListPages));
  };

  const handleApprove = async () => {
    if (!selectedApplication || !isPendingSelected) return;
    setActionError('');
    try {
      await approveApplication(selectedApplication.volunteerProfileId);
      await refetch();
      toast.success('Đã chấp nhận hồ sơ tình nguyện viên!');
    } catch (error: any) {
      const msg = parseApiError(error, 'Không thể chấp nhận request.').message;
      setActionError(msg);
      toast.error(msg);
    }
  };

  const handleReject = async () => {
    if (!selectedApplication || !isPendingSelected) return;
    const reason = rejectReason.trim();
    if (!reason) {
      setActionError('Vui lòng nhập lý do từ chối.');
      return;
    }
    setActionError('');
    try {
      await rejectApplication({ id: selectedApplication.volunteerProfileId, reason });
      setIsRejectDialogOpen(false);
      setRejectReason('');
      await refetch();
      toast.success('Đã từ chối hồ sơ tình nguyện viên!');
    } catch (error: any) {
      const msg = parseApiError(error, 'Không thể từ chối hồ sơ tình nguyện viên!').message;
      setActionError(msg);
      toast.error(msg);
    }
  };

  return (
    <DashboardLayout navGroups={coordinatorNavGroups}>
      <div className="space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="space-y-2">
            <h1 className="text-3xl font-black text-primary md:text-4xl">
              Quản lý yêu cầu tình nguyện viên
            </h1>
            <p className="max-w-2xl text-sm text-muted-foreground md:text-base">
              Duyệt hồ sơ tình nguyện viên đang chờ xử lý, theo dõi trạng thái và lịch sử ứng tuyển.
            </p>
          </div>
          <Button variant="outline" className="h-11 gap-2 px-5" onClick={() => refetch()}>
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
                    Tổng hồ sơ
                  </p>
                  <p className="mt-3 text-3xl font-black text-foreground">{stats.total}</p>
                </div>
                <div className="flex size-11 items-center justify-center rounded-2xl border border-sky-200 bg-sky-500/10 text-sky-600">
                  <span className="material-symbols-outlined">badge</span>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border bg-card">
            <CardContent className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    Chờ duyệt
                  </p>
                  <p className="mt-3 text-3xl font-black text-amber-600">{stats.pending}</p>
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
                    Đã duyệt
                  </p>
                  <p className="mt-3 text-3xl font-black text-emerald-600">{stats.approved}</p>
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
                  <p className="mt-3 text-3xl font-black text-rose-600">{stats.rejected}</p>
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
                    <h2 className="text-xl font-black text-foreground">Danh sách hồ sơ</h2>
                    <p className="text-xs text-muted-foreground">
                      Hiển thị 5 hồ sơ mỗi trang. Ưu tiên hồ sơ chờ duyệt.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 gap-3 ">
                    <div className="relative">
                      <span className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-base text-muted-foreground">
                        search
                      </span>
                      <Input
                        className="h-11 border-border bg-background pl-10"
                        placeholder="Tìm tên, email, số điện thoại..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant={statusFilter === 'all' ? 'primary' : 'outline'}
                      className="rounded-full"
                      onClick={() => setStatusFilter('all')}
                    >
                      <span className="material-symbols-outlined text-sm">apps</span>
                      Tất cả
                    </Button>
                    <Button
                      size="sm"
                      variant={statusFilter === 'pending' ? 'primary' : 'outline'}
                      className={cn(
                        'rounded-full',
                        statusFilter === 'pending' &&
                          'border-amber-300 bg-amber-500/15 text-amber-700 hover:bg-amber-500/20',
                      )}
                      onClick={() => setStatusFilter('pending')}
                    >
                      <span className="material-symbols-outlined text-sm">schedule</span>
                      Chờ duyệt
                    </Button>
                    <Button
                      size="sm"
                      variant={statusFilter === 'approved' ? 'success' : 'outline'}
                      className="rounded-full"
                      onClick={() => setStatusFilter('approved')}
                    >
                      <span className="material-symbols-outlined text-sm">verified</span>
                      Đã duyệt
                    </Button>
                    <Button
                      size="sm"
                      variant={statusFilter === 'rejected' ? 'destructive' : 'outline'}
                      className="rounded-full"
                      onClick={() => setStatusFilter('rejected')}
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
                    Không tải được danh sách request volunteer.
                  </div>
                ) : filteredApplications.length === 0 ? (
                  <div className="flex min-h-[280px] flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border bg-muted/10 p-6 text-center">
                    <span className="material-symbols-outlined text-5xl text-muted-foreground">
                      search_off
                    </span>
                    <div>
                      <p className="text-base font-semibold text-foreground">
                        Không có hồ sơ phù hợp
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Thử thay đổi từ khóa hoặc trạng thái cần lọc.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {paginatedApplications.map((app) => {
                      const active = effectiveSelectedId === app.volunteerProfileId;
                      return (
                        <button
                          key={app.volunteerProfileId}
                          onClick={() => setSelectedId(app.volunteerProfileId)}
                          className={cn(
                            'w-full rounded-2xl border border-border p-4 text-left transition-all',
                            active
                              ? 'border-primary/40 bg-primary/10 shadow-sm'
                              : 'hover:border-primary/20 hover:bg-accent/40',
                          )}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-bold text-foreground">
                                {app.fullName}
                              </p>
                              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                                {app.email}
                              </p>
                            </div>
                            <span
                              className={cn(
                                'shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-semibold whitespace-nowrap',
                                getVerificationStatusStyle(app.verificationStatus),
                              )}
                            >
                              {getVerificationStatusText(app.verificationStatus)}
                            </span>
                          </div>

                          <div className="mt-3 flex flex-wrap gap-2">
                            <span className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-2.5 py-1 text-[11px] text-muted-foreground">
                              <span className="material-symbols-outlined text-sm">call</span>
                              {app.phoneNumber || '--'}
                            </span>
                            <span className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-2.5 py-1 text-[11px] text-muted-foreground">
                              <span className="material-symbols-outlined text-sm">
                                {getPreferredTeamRoleIconName(app.preferredTeamRole)}
                              </span>
                              {getPreferredTeamRoleText(app.preferredTeamRole)}
                            </span>
                            <span className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-2.5 py-1 text-[11px] text-muted-foreground">
                              <span className="material-symbols-outlined text-sm">schedule</span>
                              {formatDateTimeVN(app.appliedAt)}
                            </span>
                          </div>

                          {(app.skills || []).length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              {(app.skills || []).slice(0, 3).map((skill) => (
                                <span
                                  key={`${app.volunteerProfileId}-${skill.skillId}`}
                                  className="rounded-full border border-border bg-background px-2 py-0.5 text-[11px] text-muted-foreground"
                                >
                                  {skill.name}
                                </span>
                              ))}
                              {(app.skills || []).length > 3 && (
                                <span className="rounded-full border border-border bg-background px-2 py-0.5 text-[11px] text-muted-foreground">
                                  +{app.skills.length - 3}
                                </span>
                              )}
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="border-t border-border/70 px-5 py-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <p className="text-xs text-muted-foreground">
                    Trang {listPage}/{totalListPages} - {paginatedApplications.length}/
                    {filteredApplications.length} hồ sơ.
                    {paging?.totalCount != null && ` Tổng hồ sơ: ${paging.totalCount}`}
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1"
                      disabled={listPage <= 1}
                      onClick={() => setListPage((prev) => Math.max(1, prev - 1))}
                    >
                      <span className="material-symbols-outlined text-sm">chevron_left</span>
                      Trước
                    </Button>
                    {listPageItems.map((item, index) =>
                      item === 'ellipsis' ? (
                        <span key={`ell-${index}`} className="px-1 text-sm text-muted-foreground">
                          ...
                        </span>
                      ) : (
                        <Button
                          key={item}
                          size="sm"
                          variant={item === listPage ? 'primary' : 'outline'}
                          className="min-w-9"
                          onClick={() => setListPage(item as number)}
                        >
                          {item}
                        </Button>
                      ),
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1"
                      disabled={listPage >= totalListPages}
                      onClick={() => setListPage((prev) => Math.min(totalListPages, prev + 1))}
                    >
                      Sau
                      <span className="material-symbols-outlined text-sm">chevron_right</span>
                    </Button>
                    <div className="flex items-center gap-2 rounded-full border border-border px-2 py-1">
                      <span className="text-xs text-muted-foreground">Tới trang:</span>
                      <Input
                        value={pageInput}
                        onChange={(e) => setPageInput(e.target.value.replace(/[^0-9]/g, ''))}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleJumpToPage();
                        }}
                        className="h-8 w-14 border-0 px-2 text-center shadow-none focus-visible:ring-0"
                      />
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 px-2"
                        onClick={handleJumpToPage}
                      >
                        Đi
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="min-h-0 xl:max-h-[calc(100vh-4rem)] xl:overflow-y-auto xl:pr-1">
            {!selectedApplication ? (
              <Card className="h-full rounded-2xl border-border bg-card">
                <CardContent className="flex min-h-[520px] items-center justify-center text-muted-foreground">
                  Chọn một request ở cột trái để xem hồ sơ chi tiết.
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4 pb-2">
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                  <Card className="rounded-2xl border-border bg-card lg:col-span-2">
                    <CardContent className="p-5">
                      <div className="flex flex-wrap items-start justify-between gap-3 rounded-2xl border border-border bg-gradient-to-br from-primary/5 via-background to-background p-5">
                        <div>
                          <p className="text-xs uppercase tracking-wider text-muted-foreground">
                            Hồ sơ ứng viên
                          </p>
                          <h2 className="mt-1 text-2xl font-black">
                            {selectedApplication.fullName}
                          </h2>
                          <p className="mt-1 text-xs text-muted-foreground">
                            ID: {selectedApplication.volunteerProfileId}
                          </p>
                        </div>
                        <span
                          className={cn(
                            'rounded-full border px-3 py-1 text-xs font-semibold',
                            getVerificationStatusStyle(selectedApplication.verificationStatus),
                          )}
                        >
                          {getVerificationStatusText(selectedApplication.verificationStatus)}
                        </span>
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2">
                        <span className="rounded-full border border-primary/10 bg-primary/5 px-2.5 py-1 text-xs text-muted-foreground">
                          Tuổi:{' '}
                          <span className="font-medium text-foreground">
                            {getAgeTextFromDob(selectedApplication.dateOfBirth)}
                          </span>
                        </span>
                        <span className="rounded-full border border-primary/10 bg-primary/5 px-2.5 py-1 text-xs text-muted-foreground">
                          Giới tính:{' '}
                          <span className="font-medium text-foreground">
                            {selectedApplication.gender || '--'}
                          </span>
                        </span>
                        <span className="rounded-full border border-primary/10 bg-primary/5 px-2.5 py-1 text-xs text-muted-foreground">
                          TNV:{' '}
                          <span className="font-medium text-foreground">
                            {getVolunteerStatusText(selectedApplication.status)}
                          </span>
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-full border border-primary/10 bg-primary/5 px-2.5 py-1 text-xs text-muted-foreground">
                          <span className="material-symbols-outlined text-sm text-foreground">
                            {getPreferredTeamRoleIconName(selectedApplication.preferredTeamRole)}
                          </span>
                          Vai trò:{' '}
                          <span className="font-medium text-foreground">
                            {getPreferredTeamRoleText(selectedApplication.preferredTeamRole)}
                          </span>
                        </span>
                      </div>

                      <div className="mt-4 rounded-2xl border border-border bg-background/80 p-3">
                        <p className="mb-1 text-xs uppercase text-muted-foreground">Địa chỉ</p>
                        <p className="text-sm font-medium">{selectedApplication.address || '--'}</p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="rounded-2xl border-border bg-card">
                    <CardContent className="space-y-4 p-5">
                      <div>
                        <p className="text-xs uppercase text-muted-foreground">Email</p>
                        <p className="break-all font-medium">{selectedApplication.email || '--'}</p>
                      </div>
                      <div>
                        <p className="text-xs uppercase text-muted-foreground">Số điện thoại</p>
                        <p className="font-medium">{selectedApplication.phoneNumber || '--'}</p>
                      </div>
                    </CardContent>
                    <CardContent className="p-5 border-t border-border">
                      <div>
                        <p className="text-xs uppercase text-muted-foreground">Ngày ứng tuyển</p>
                        <p className="font-medium">
                          {formatDateTimeVN(selectedApplication.appliedAt)}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                  <Card className="rounded-2xl border-border bg-card">
                    <CardContent className="p-5">
                      <p className="mb-3 text-xs uppercase text-muted-foreground">Kỹ năng</p>
                      <div className="flex flex-wrap gap-2">
                        {selectedApplication.skills?.length ? (
                          selectedApplication.skills.map((s) => (
                            <span
                              key={s.skillId}
                              className="rounded-full border border-primary/10 bg-primary/5 px-2.5 py-1 text-xs text-foreground"
                            >
                              {s.name}
                            </span>
                          ))
                        ) : (
                          <span className="text-sm text-muted-foreground">Chưa có kỹ năng</span>
                        )}
                      </div>
                      <div className="mt-5">
                        <p className="mb-1 text-xs uppercase text-muted-foreground">Mô tả</p>
                        <p className="text-sm leading-relaxed text-foreground">
                          {selectedApplication.descriptions || 'Không có mô tả'}
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="rounded-2xl border-border bg-card">
                    <CardContent className="p-5">
                      <p className="mb-3 text-xs uppercase text-muted-foreground">Chứng chỉ</p>
                      {selectedApplication.certificates?.length ? (
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                          {selectedApplication.certificates.map((cert, idx) => (
                            <div
                              key={`${cert.name}-${idx}`}
                              className="rounded-2xl border border-border bg-background p-3"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <p className="line-clamp-2 text-sm font-semibold">
                                  {cert.name || 'Chứng chỉ'}
                                </p>
                                {cert.fileUrl ? (
                                  <a
                                    href={cert.fileUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="shrink-0 text-[11px] font-semibold text-primary underline"
                                  >
                                    Mở file
                                  </a>
                                ) : null}
                              </div>
                              <p className="mt-1 text-[11px] text-muted-foreground">
                                Cấp bởi: {cert.issuedBy || 'Khong ro'}
                              </p>
                              <div className="mt-2 space-y-1 text-[11px]">
                                <p className="text-muted-foreground">
                                  Ngày cấp:{' '}
                                  <span className="text-foreground">
                                    {formatDateVN(cert.issuedDate)}
                                  </span>
                                </p>
                                <p className="text-muted-foreground">
                                  Hết hạn:{' '}
                                  <span className="text-foreground">
                                    {formatDateVN(cert.expiryDate)}
                                  </span>
                                </p>
                              </div>
                              {cert.fileUrl ? (
                                <div className="mt-2 overflow-hidden rounded-xl border border-border bg-accent/40">
                                  <img
                                    src={cert.fileUrl}
                                    alt={cert.name || 'certificate'}
                                    className="h-24 w-full object-cover"
                                    onError={(e) => {
                                      (e.currentTarget as HTMLImageElement).style.display = 'none';
                                    }}
                                  />
                                </div>
                              ) : null}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">Chưa có chứng chỉ</p>
                      )}
                    </CardContent>
                  </Card>
                </div>

                <Card className="rounded-2xl border-border bg-card">
                  <CardContent className="p-5">
                    <p className="mb-2 text-xs uppercase text-muted-foreground">Ghi chú nội bộ</p>
                    <Textarea rows={4} placeholder="Nhập ghi chú nội bộ cho hồ sơ này..." />
                  </CardContent>
                </Card>

                {selectedApplication.verificationStatus === 3 && (
                  <div className="rounded-2xl border border-rose-200 bg-rose-500/5 p-4">
                    <p className="text-xs font-semibold uppercase text-rose-600">Lý do từ chối</p>
                    <p className="mt-1 text-sm text-rose-700">
                      {selectedApplication.reason || 'Không có lý do cụ thể'}
                    </p>
                  </div>
                )}

                <Card className="sticky bottom-0 z-10 rounded-2xl border-border bg-card/95 shadow-lg backdrop-blur supports-[backdrop-filter]:bg-card/85">
                  <CardContent className="space-y-3 p-5">
                    <div className="flex flex-wrap gap-3">
                      <Button
                        variant="primary"
                        className="gap-2"
                        disabled={!isPendingSelected || approveStatus === 'pending'}
                        onClick={handleApprove}
                      >
                        <span className="material-symbols-outlined">check_circle</span>
                        {approveStatus === 'pending' ? 'Đang xử lý...' : 'Chấp nhận'}
                      </Button>
                      <Button variant="outline" className="gap-2" disabled>
                        <span className="material-symbols-outlined">contact_support</span>
                        Yêu cầu bổ sung (sắp có)
                      </Button>
                      <Button
                        variant="outline"
                        className="gap-2 border-rose-200 text-rose-600 hover:bg-rose-500/10"
                        disabled={!isPendingSelected || rejectStatus === 'pending'}
                        onClick={() => {
                          setActionError('');
                          setIsRejectDialogOpen(true);
                        }}
                      >
                        <span className="material-symbols-outlined">close</span>
                        Từ chối
                      </Button>
                    </div>
                    {!isPendingSelected && (
                      <p className="text-xs text-muted-foreground">
                        Chỉ Yêu cầu tình nguyện viên ở trạng thái Chờ duyệt mới có thể chấp nhận
                        hoặc từ chối.
                      </p>
                    )}
                    {actionError ? <p className="text-sm text-rose-500">{actionError}</p> : null}
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </div>
      </div>

      <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Từ chối request volunteer</DialogTitle>
            <DialogDescription>
              Vui lòng nhập lý do từ chối. Lý do này sẽ được lưu vào trường reason.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <label className="text-sm font-medium">Lý do từ chối *</label>
            <Textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Nhập lý do từ chối..."
              rows={4}
            />
          </div>

          {actionError ? <p className="text-sm text-rose-500">{actionError}</p> : null}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsRejectDialogOpen(false);
                setRejectReason('');
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
