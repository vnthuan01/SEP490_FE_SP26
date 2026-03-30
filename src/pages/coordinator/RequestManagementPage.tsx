import { useMemo, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { useRescueRequestManagement } from '@/hooks/useRescueRequestManagement';
import type { RescueRequestItem } from '@/services/rescueRequestService';
import { coordinatorNavItems, coordinatorProjects } from './components/sidebarConfig';

const verificationStatusText = (status?: number | string | null) => {
  if (status === 0 || status === '0' || status === 'Pending') return 'Chờ xác minh';
  if (status === 1 || status === '1' || status === 'Approved') return 'Đã xác minh';
  if (status === 2 || status === '2' || status === 'Rejected') return 'Từ chối';
  return 'Không rõ';
};

const verificationStatusClass = (status?: number | string | null) => {
  if (status === 0 || status === '0' || status === 'Pending')
    return 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20';
  if (status === 1 || status === '1' || status === 'Approved')
    return 'bg-green-500/10 text-green-600 border-green-500/20';
  if (status === 2 || status === '2' || status === 'Rejected')
    return 'bg-red-500/10 text-red-600 border-red-500/20';
  return 'bg-slate-500/10 text-slate-600 border-slate-500/20';
};

const verificationMethodLabel = (method: number) => {
  switch (method) {
    case 0:
      return 'Không chọn (None)';
    case 1:
      return 'Duyệt thủ công (ManualReview)';
    case 2:
      return 'Gọi điện xác minh (PhoneCall)';
    case 3:
      return 'Đối chiếu hình ảnh (PhotoEvidence)';
    case 4:
      return 'Xác minh hiện trường (FieldVerification)';
    case 5:
      return 'Hệ thống tự kiểm tra (SystemAutoCheck)';
    default:
      return `Phương thức #${method}`;
  }
};

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

export default function CoordinatorRequestManagementPage() {
  const {
    requests,
    paging,
    isLoading,
    isError,
    refetch,
    verifyRequest,
    verifyStatus,
    rejectRequest,
    rejectStatus,
  } = useRescueRequestManagement(1, 10);

  const [search, setSearch] = useState('');
  const [verificationFilter, setVerificationFilter] = useState<
    'all' | 'pending' | 'approved' | 'rejected'
  >('all');
  const [selectedId, setSelectedId] = useState('');

  const [verifyMethod, setVerifyMethod] = useState(1);
  const [verifyNote, setVerifyNote] = useState('');

  const [isRejectOpen, setIsRejectOpen] = useState(false);
  const [rejectMethod, setRejectMethod] = useState(1);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectNote, setRejectNote] = useState('');

  const [actionError, setActionError] = useState('');

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

  const effectiveSelectedId = useMemo(() => {
    if (!filtered.length) return '';
    const found = filtered.some((r) => getRequestId(r) === selectedId);
    return found ? selectedId : getRequestId(filtered[0]);
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
      window.alert('Đã xác minh yêu cầu cứu hộ.');
    } catch (error: any) {
      setActionError(error?.response?.data?.message || 'Không thể xác minh yêu cầu.');
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
      window.alert('Đã từ chối yêu cầu cứu hộ.');
    } catch (error: any) {
      setActionError(error?.response?.data?.message || 'Không thể từ chối yêu cầu.');
    }
  };

  return (
    <DashboardLayout projects={coordinatorProjects} navItems={coordinatorNavItems}>
      <div className="mb-6 flex flex-wrap justify-between items-end gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-black text-primary">Quản lý yêu cầu cứu hộ</h1>
          <p className="text-muted-foreground mt-1">
            Liệt kê yêu cầu cứu hộ bình thường (Normal) và xác minh thủ công.
          </p>
        </div>
        <Button variant="outline" className="gap-2" onClick={() => refetch()}>
          <span className="material-symbols-outlined">refresh</span>
          Tải lại
        </Button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <Card className="xl:col-span-1">
          <CardContent className="p-4 space-y-4">
            <input
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              placeholder="Tìm tên/SĐT/địa chỉ/mô tả..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />

            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant={verificationFilter === 'all' ? 'primary' : 'outline'}
                onClick={() => setVerificationFilter('all')}
              >
                Tất cả
              </Button>
              <Button
                size="sm"
                variant={verificationFilter === 'pending' ? 'primary' : 'outline'}
                onClick={() => setVerificationFilter('pending')}
              >
                Chờ xác minh
              </Button>
              <Button
                size="sm"
                variant={verificationFilter === 'approved' ? 'primary' : 'outline'}
                onClick={() => setVerificationFilter('approved')}
              >
                Đã xác minh
              </Button>
              <Button
                size="sm"
                variant={verificationFilter === 'rejected' ? 'primary' : 'outline'}
                onClick={() => setVerificationFilter('rejected')}
              >
                Từ chối
              </Button>
            </div>

            {isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((k) => (
                  <div key={k} className="h-20 rounded-lg bg-accent animate-pulse" />
                ))}
              </div>
            ) : isError ? (
              <p className="text-sm text-red-500">Không tải được danh sách yêu cầu.</p>
            ) : filtered.length === 0 ? (
              <p className="text-sm text-muted-foreground">Không có yêu cầu phù hợp.</p>
            ) : (
              <div className="space-y-2 max-h-[620px] overflow-auto pr-1">
                {filtered.map((req) => {
                  const id = getRequestId(req);
                  const verificationItem = getVerification(req);
                  const isActive = id === selectedId;
                  return (
                    <button
                      key={id}
                      onClick={() => setSelectedId(id)}
                      className={cn(
                        'w-full text-left rounded-lg border p-3 transition-colors',
                        isActive
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:bg-accent/40',
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-semibold text-sm truncate">
                          {req.reporterFullName || '--'}
                        </p>
                        <span
                          className={cn(
                            'text-[11px] px-2 py-0.5 rounded-full border font-medium',
                            verificationStatusClass(verificationItem?.status),
                          )}
                        >
                          {verificationStatusText(verificationItem?.status)}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 truncate">
                        {req.disasterType || '--'}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1 truncate">
                        {req.address || 'Chưa cập nhật'}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatKm(req.stationToRequestDistanceKm)} •{' '}
                        {formatMin(req.stationToRequestDurationMinutes)}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDate(req.createdAt)}
                      </p>
                    </button>
                  );
                })}
              </div>
            )}

            <p className="text-xs text-muted-foreground">
              Tổng: {paging?.totalCount ?? filtered.length} request bình thường
            </p>
          </CardContent>
        </Card>

        <Card className="xl:col-span-2">
          <CardContent className="p-6">
            {!selected ? (
              <p className="text-muted-foreground">Chọn một yêu cầu để xem chi tiết.</p>
            ) : (
              <div className="space-y-6">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <h2 className="text-2xl font-black">{selected.reporterFullName || '--'}</h2>
                    <p className="text-sm text-muted-foreground mt-1">
                      Mã yêu cầu: {getRequestId(selected)}
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

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs uppercase text-muted-foreground">Loại thiên tai</p>
                    <p className="font-medium">
                      {selected.disasterType == 'Flood'
                        ? 'Lũ lụt'
                        : selected.disasterType == 'Earthquake'
                          ? 'Động đất'
                          : '--'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase text-muted-foreground">Loại yêu cầu cứu hộ</p>
                    <p className="font-medium">
                      {String(
                        selected.rescueRequestType == 'Normal'
                          ? 'Cứu hộ bình thường'
                          : selected.rescueRequestType == 'Emergency'
                            ? 'Cứu hộ khẩn cấp'
                            : '--',
                      )}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase text-muted-foreground">
                      Số điện thoại người báo tin
                    </p>
                    <p className="font-medium">{selected.reporterPhone || '--'}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase text-muted-foreground">Mức ưu tiên</p>
                    <p className="font-medium">{selected.priority ?? '--'}</p>
                  </div>
                  <div className="md:col-span-2">
                    <p className="text-xs uppercase text-muted-foreground">Địa chỉ</p>
                    <p className="font-medium">{selected.address || 'Chưa cập nhật'}</p>
                  </div>
                  <div className="md:col-span-2">
                    <p className="text-xs uppercase text-muted-foreground">Mô tả</p>
                    <p className="font-medium">{selected.description || 'Không có mô tả'}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase text-muted-foreground">Vĩ độ</p>
                    <p className="font-medium">{selected.latitude ?? '--'}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase text-muted-foreground">Kinh độ</p>
                    <p className="font-medium">{selected.longitude ?? '--'}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase text-muted-foreground">Thời gian tạo</p>
                    <p className="font-medium">{formatDate(selected.createdAt)}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase text-muted-foreground">Khoảng cách (km)</p>
                    <p className="font-medium">{formatKm(selected.stationToRequestDistanceKm)}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase text-muted-foreground">
                      Thời gian di chuyển (phút)
                    </p>
                    <p className="font-medium">
                      {formatMin(selected.stationToRequestDurationMinutes)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase text-muted-foreground">Khoảng cách (m)</p>
                    <p className="font-medium">
                      {formatMeters(selected.stationToRequestDistanceMeters)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase text-muted-foreground">
                      Thời gian di chuyển (giây)
                    </p>
                    <p className="font-medium">
                      {formatSeconds(selected.stationToRequestDurationSeconds)}
                    </p>
                  </div>
                </div>

                <div>
                  <p className="text-xs uppercase text-muted-foreground mb-2">Tệp đính kèm</p>
                  {selected.attachments?.length ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {selected.attachments.map((att) => (
                        <a
                          key={att.attachmentId}
                          href={att.fileUrl || '#'}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-lg overflow-hidden border border-border bg-accent/30"
                        >
                          <img
                            src={att.fileUrl || ''}
                            alt="attachment"
                            className="w-full h-28 object-cover"
                            onError={(e) => {
                              (e.currentTarget as HTMLImageElement).style.display = 'none';
                            }}
                          />
                        </a>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Không có ảnh đính kèm.</p>
                  )}
                </div>

                <div className="rounded-lg border border-border p-4 space-y-3">
                  <p className="text-sm font-semibold">Xác minh yêu cầu</p>

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

                  <div className="flex gap-3">
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
                </div>

                {verification?.status === 2 && (
                  <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-4">
                    <p className="text-xs uppercase font-semibold text-red-600">Lý do từ chối</p>
                    <p className="text-sm text-red-700 mt-1">
                      {verification.reason || 'Không có lý do'}
                    </p>
                  </div>
                )}

                {actionError ? <p className="text-sm text-red-500">{actionError}</p> : null}
              </div>
            )}
          </CardContent>
        </Card>
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
