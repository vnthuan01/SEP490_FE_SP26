import { useMemo, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
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
import { coordinatorNavItems, coordinatorProjects } from './components/sidebarConfig';

type StatusFilter = 'all' | 'pending' | 'approved' | 'rejected';

const getVerificationStatusText = (status: number) => {
  switch (status) {
    case 1:
      return 'Chờ duyệt';
    case 2:
      return 'Đã duyệt';
    case 3:
      return 'Đã từ chối';
    default:
      return 'Không rõ';
  }
};

const getVerificationStatusStyle = (status: number) => {
  switch (status) {
    case 1:
      return 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20';
    case 2:
      return 'bg-green-500/10 text-green-600 border-green-500/20';
    case 3:
      return 'bg-red-500/10 text-red-600 border-red-500/20';
    default:
      return 'bg-slate-500/10 text-slate-600 border-slate-500/20';
  }
};

const getVolunteerStatusText = (status: number) => {
  switch (status) {
    case 1:
      return 'Đang hoạt động';
    case 2:
      return 'Không hoạt động';
    default:
      return 'Không rõ';
  }
};

const getPreferredTeamRoleText = (role: number) => {
  switch (role) {
    case 1:
      return 'Thành viên (Member)';
    case 2:
      return 'Đội trưởng (Leader)';
    case 3:
      return 'Tài xế (Driver)';
    default:
      return `Vai trò #${role}`;
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
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [actionError, setActionError] = useState('');

  const sortedApplications = useMemo(() => {
    const list = [...applications];
    // Pending lên đầu, sau đó mới tới Approved/Rejected
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
    return { pending, approved, rejected };
  }, [applications]);

  const isPendingSelected = selectedApplication?.verificationStatus === 1;

  const handleApprove = async () => {
    if (!selectedApplication || !isPendingSelected) return;
    setActionError('');
    try {
      await approveApplication(selectedApplication.volunteerProfileId);
      await refetch();
      toast.success('Đã chấp nhận hồ sơ tình nguyện viên!');
    } catch (error: any) {
      const msg = error?.response?.data?.message || 'Không thể chấp nhận request.';
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
      toast.success('Đã từ chối hồ sơ tình nguyện viên.');
    } catch (error: any) {
      const msg = error?.response?.data?.message || 'Không thể từ chối request.';
      setActionError(msg);
      toast.error(msg);
    }
  };

  return (
    <DashboardLayout projects={coordinatorProjects} navItems={coordinatorNavItems}>
      <div className="grid grid-cols-1 xl:grid-cols-[400px_minmax(0,1fr)] gap-6 min-h-[calc(100vh-11rem)]">
        <Card className="xl:h-full overflow-hidden">
          <CardContent className="p-0 h-full flex flex-col">
            <div className="px-5 pt-5 pb-4 border-b border-border/70 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h1 className="text-2xl md:text-3xl font-black tracking-tight text-primary">
                    Yêu cầu tình nguyện viên
                  </h1>
                  <p className="text-xs text-muted-foreground mt-1">
                    Ưu tiên hiển thị hồ sơ đang chờ duyệt
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-2">
                  <span className="material-symbols-outlined text-base">refresh</span>
                  Tải lại
                </Button>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-xl border border-yellow-500/20 bg-yellow-500/10 px-2 py-2">
                  <p className="text-[11px] uppercase font-semibold text-yellow-700">Chờ duyệt</p>
                  <p className="text-xl font-black mt-0.5">{stats.pending}</p>
                </div>
                <div className="rounded-xl border border-green-500/20 bg-green-500/10 px-2 py-2">
                  <p className="text-[11px] uppercase font-semibold text-green-700">Đã duyệt</p>
                  <p className="text-xl font-black mt-0.5">{stats.approved}</p>
                </div>
                <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-2 py-2">
                  <p className="text-[11px] uppercase font-semibold text-red-700">Từ chối</p>
                  <p className="text-xl font-black mt-0.5">{stats.rejected}</p>
                </div>
              </div>

              <div className="space-y-2">
                <input
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  placeholder="Tìm theo tên / email / SĐT"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />

                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant={statusFilter === 'all' ? 'primary' : 'outline'}
                    onClick={() => setStatusFilter('all')}
                    className="rounded-full"
                  >
                    Tất cả
                  </Button>
                  <Button
                    size="sm"
                    variant={statusFilter === 'pending' ? 'primary' : 'outline'}
                    onClick={() => setStatusFilter('pending')}
                    className="rounded-full"
                  >
                    Chờ duyệt
                  </Button>
                  <Button
                    size="sm"
                    variant={statusFilter === 'approved' ? 'primary' : 'outline'}
                    onClick={() => setStatusFilter('approved')}
                    className="rounded-full"
                  >
                    Đã duyệt
                  </Button>
                  <Button
                    size="sm"
                    variant={statusFilter === 'rejected' ? 'primary' : 'outline'}
                    onClick={() => setStatusFilter('rejected')}
                    className="rounded-full"
                  >
                    Từ chối
                  </Button>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-auto px-3 py-3">
              {isLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3, 4, 5].map((k) => (
                    <div key={k} className="h-24 rounded-xl bg-accent animate-pulse" />
                  ))}
                </div>
              ) : isError ? (
                <div className="text-sm text-red-500 px-2">Không tải được danh sách request.</div>
              ) : filteredApplications.length === 0 ? (
                <div className="text-sm text-muted-foreground px-2">
                  Không có request phù hợp bộ lọc.
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredApplications.map((app) => {
                    const active = selectedId === app.volunteerProfileId;

                    return (
                      <button
                        key={app.volunteerProfileId}
                        onClick={() => setSelectedId(app.volunteerProfileId)}
                        className={cn(
                          'w-full text-left rounded-xl border p-3 transition-all border-l-4',
                          active
                            ? 'border-primary bg-primary/10 shadow-sm border-l-primary'
                            : 'border-border hover:bg-accent/60 border-l-transparent',
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-semibold text-sm leading-5 line-clamp-2">
                            {app.fullName}
                          </p>
                          <span
                            className={cn(
                              'text-[11px] px-2 py-0.5 rounded-full border font-semibold whitespace-nowrap',
                              getVerificationStatusStyle(app.verificationStatus),
                            )}
                          >
                            {getVerificationStatusText(app.verificationStatus)}
                          </span>
                        </div>

                        <p className="text-xs text-muted-foreground mt-1 truncate">{app.email}</p>

                        <div className="mt-2 flex items-center gap-3 text-[11px] text-muted-foreground">
                          <span className="inline-flex items-center gap-1">
                            <span className="material-symbols-outlined text-sm">call</span>
                            {app.phoneNumber || '--'}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <span className="material-symbols-outlined text-sm">schedule</span>
                            {formatDateTimeVN(app.appliedAt)}
                          </span>
                        </div>

                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {(app.skills || []).slice(0, 3).map((skill) => (
                            <span
                              key={`${app.volunteerProfileId}-${skill.skillId}`}
                              className="text-[11px] px-2 py-0.5 rounded-full bg-accent border border-border"
                            >
                              {skill.name}
                            </span>
                          ))}
                          {(app.skills || []).length > 3 && (
                            <span className="text-[11px] px-2 py-0.5 rounded-full bg-accent border border-border text-muted-foreground">
                              +{app.skills.length - 3}
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="px-5 py-3 border-t border-border/70 text-xs text-muted-foreground">
              Trang: {paging?.currentPage ?? 0}/{paging?.totalPages ?? 0} • Tổng:{' '}
              {paging?.totalCount ?? 0}
            </div>
          </CardContent>
        </Card>

        <div className="h-full overflow-auto pr-1">
          {!selectedApplication ? (
            <Card className="h-full">
              <CardContent className="h-full flex items-center justify-center text-muted-foreground">
                Chọn một request ở cột trái để xem hồ sơ chi tiết.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4 pb-2">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <Card className="lg:col-span-2 border-primary/20 bg-gradient-to-br from-primary/5 via-background to-background">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div>
                        <p className="text-xs uppercase tracking-wider text-muted-foreground">
                          Hồ sơ ứng viên
                        </p>
                        <h2 className="text-2xl font-black mt-1">{selectedApplication.fullName}</h2>
                        <p className="text-xs text-muted-foreground mt-1">
                          ID hồ sơ: {selectedApplication.volunteerProfileId}
                        </p>
                      </div>
                      <span
                        className={cn(
                          'text-xs px-3 py-1 rounded-full border font-semibold',
                          getVerificationStatusStyle(selectedApplication.verificationStatus),
                        )}
                      >
                        {getVerificationStatusText(selectedApplication.verificationStatus)}
                      </span>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <span className="text-xs px-2.5 py-1 rounded-full border border-border bg-accent">
                        Tuổi: {getAgeTextFromDob(selectedApplication.dateOfBirth)}
                      </span>
                      <span className="text-xs px-2.5 py-1 rounded-full border border-border bg-accent">
                        Giới tính: {selectedApplication.gender || '--'}
                      </span>
                      <span className="text-xs px-2.5 py-1 rounded-full border border-border bg-accent">
                        Trạng thái TNV: {getVolunteerStatusText(selectedApplication.status)}
                      </span>
                      <span className="text-xs px-2.5 py-1 rounded-full border border-border bg-accent">
                        Vai trò mong muốn:{' '}
                        {getPreferredTeamRoleText(selectedApplication.preferredTeamRole)}
                      </span>
                    </div>

                    <div className="mt-4 rounded-xl border border-border bg-background/80 p-3">
                      <p className="text-xs uppercase text-muted-foreground mb-1">Địa chỉ</p>
                      <p className="text-sm font-medium">{selectedApplication.address || '--'}</p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-5 space-y-4">
                    <div>
                      <p className="text-xs uppercase text-muted-foreground">Email liên hệ</p>
                      <p className="font-medium break-all">{selectedApplication.email || '--'}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase text-muted-foreground">Số điện thoại</p>
                      <p className="font-medium">{selectedApplication.phoneNumber || '--'}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase text-muted-foreground">Ngày ứng tuyển</p>
                      <p className="font-medium">
                        {formatDateTimeVN(selectedApplication.appliedAt)}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Card>
                  <CardContent className="p-5">
                    <p className="text-xs uppercase text-muted-foreground mb-3">Kỹ năng</p>
                    <div className="flex flex-wrap gap-2">
                      {selectedApplication.skills?.length ? (
                        selectedApplication.skills.map((s) => (
                          <span
                            key={s.skillId}
                            className="text-xs px-2.5 py-1 rounded-full border border-border bg-accent"
                          >
                            {s.name}
                          </span>
                        ))
                      ) : (
                        <span className="text-sm text-muted-foreground">Chưa có kỹ năng</span>
                      )}
                    </div>

                    <div className="mt-5">
                      <p className="text-xs uppercase text-muted-foreground mb-1">Mô tả</p>
                      <p className="text-sm leading-relaxed text-foreground">
                        {selectedApplication.descriptions || 'Không có mô tả'}
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-5">
                    <p className="text-xs uppercase text-muted-foreground mb-3">Chứng chỉ</p>
                    {selectedApplication.certificates?.length ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {selectedApplication.certificates.map((cert, idx) => (
                          <div
                            key={`${cert.name}-${idx}`}
                            className="rounded-xl border border-border bg-background p-3"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <p className="font-semibold text-sm line-clamp-2">
                                {cert.name || 'Chứng chỉ'}
                              </p>
                              {cert.fileUrl ? (
                                <a
                                  href={cert.fileUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-[11px] font-semibold text-primary underline shrink-0"
                                >
                                  Mở file
                                </a>
                              ) : null}
                            </div>
                            <p className="text-[11px] text-muted-foreground mt-1">
                              Cấp bởi: {cert.issuedBy || 'Không rõ'}
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
                              <div className="mt-2 rounded-md overflow-hidden border border-border bg-accent/40">
                                <img
                                  src={cert.fileUrl}
                                  alt={cert.name || 'certificate'}
                                  className="w-full h-24 object-cover"
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

              <Card>
                <CardContent className="p-5">
                  <p className="text-xs uppercase text-muted-foreground mb-2">Ghi chú nội bộ</p>
                  <Textarea rows={4} placeholder="Nhập ghi chú nội bộ cho hồ sơ này..." />
                </CardContent>
              </Card>

              {selectedApplication.verificationStatus === 3 && (
                <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4">
                  <p className="text-xs uppercase text-red-600 font-semibold">Lý do từ chối</p>
                  <p className="text-sm text-red-700 mt-1">
                    {selectedApplication.reason || 'Không có lý do cụ thể'}
                  </p>
                </div>
              )}

              <Card>
                <CardContent className="p-5 space-y-3">
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
                      className="gap-2 border-red-500/30 text-red-600 hover:bg-red-500/10"
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
                      Chỉ request ở trạng thái Chờ duyệt mới có thể chấp nhận hoặc từ chối.
                    </p>
                  )}

                  {actionError ? <p className="text-sm text-red-500">{actionError}</p> : null}
                </CardContent>
              </Card>
            </div>
          )}
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

          {actionError ? <p className="text-sm text-red-500">{actionError}</p> : null}

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
