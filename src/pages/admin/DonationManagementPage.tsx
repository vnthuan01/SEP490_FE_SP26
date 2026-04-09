import { useMemo, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  useAdminDonationDetail,
  useAdminDonations,
  useAdminDonationStats,
  useCancelDonation,
  useDonationAdminExport,
  useReconcileDonation,
} from '@/hooks/useDonations';
import { useCampaigns } from '@/hooks/useCampaigns';
import { DonationStatus } from '@/services/donationService';
import { formatNumberVN } from '@/lib/utils';
import { toast } from 'sonner';
import { adminNavItems, adminProjects } from './components/sidebarConfig';
import { CampaignStatus, CampaignType } from '@/enums/beEnums';

const DONATION_STATUS_UI: Record<number, { label: string; className: string }> = {
  [DonationStatus.Pending]: {
    label: 'Chờ thanh toán',
    className: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  },
  [DonationStatus.Completed]: {
    label: 'Hoàn tất',
    className: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  },
  [DonationStatus.Failed]: {
    label: 'Thất bại',
    className: 'bg-red-500/10 text-red-600 border-red-500/20',
  },
  [DonationStatus.Cancelled]: {
    label: 'Đã hủy',
    className: 'bg-red-500/10 text-red-600 border-red-500/20',
  },
  [DonationStatus.Expired]: {
    label: 'Hết hạn',
    className: 'bg-slate-500/10 text-slate-600 border-slate-500/20',
  },
  [DonationStatus.Refunded]: {
    label: 'Hoàn tiền',
    className: 'bg-violet-500/10 text-violet-600 border-violet-500/20',
  },
};

export default function DonationManagementPage() {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [keyword, setKeyword] = useState('');
  const [campaignFilter, setCampaignFilter] = useState<string>('all');
  const [periodFilter, setPeriodFilter] = useState<string>('all');
  const [pageIndex, setPageIndex] = useState(1);
  const [selectedDonationId, setSelectedDonationId] = useState<string>('');
  const [donationToCancel, setDonationToCancel] = useState<{
    id: string;
    donorName: string;
  } | null>(null);

  const params = useMemo(
    () => ({
      pageIndex,
      pageSize: 20,
      keyword: keyword.trim() || undefined,
      status: statusFilter === 'all' ? undefined : Number(statusFilter),
      campaignId: campaignFilter === 'all' ? undefined : campaignFilter,
      period: periodFilter === 'all' ? undefined : periodFilter,
    }),
    [campaignFilter, keyword, pageIndex, periodFilter, statusFilter],
  );

  const { donations, paging, isLoading } = useAdminDonations(params);
  const { stats } = useAdminDonationStats(params);
  const { campaigns } = useCampaigns({
    pageIndex: 1,
    pageSize: 200,
    type: CampaignType.Fundraising,
    status: CampaignStatus.Active,
  });
  const { donationDetail, isLoading: isLoadingDetail } = useAdminDonationDetail(selectedDonationId);
  const { mutateAsync: reconcileDonation, status: reconcileStatus } = useReconcileDonation();
  const { mutateAsync: cancelDonation, status: cancelStatus } = useCancelDonation();
  const { mutateAsync: exportCsv, status: exportStatus } = useDonationAdminExport(params);

  const handleExport = async () => {
    const blob = await exportCsv();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `donations-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  const totalPages = Math.max(paging?.totalPages || 0, 1);

  const resetFilters = () => {
    setKeyword('');
    setStatusFilter('all');
    setCampaignFilter('all');
    setPeriodFilter('all');
    setPageIndex(1);
  };

  const hasFilterApplied =
    keyword.trim().length > 0 ||
    statusFilter !== 'all' ||
    campaignFilter !== 'all' ||
    periodFilter !== 'all';

  const handleReconcile = async (donationId: string) => {
    await reconcileDonation(donationId);
    toast.success('Đã gửi yêu cầu đối soát giao dịch thành công');
  };

  const handleConfirmCancel = async () => {
    if (!donationToCancel) return;
    await cancelDonation({ id: donationToCancel.id, reason: 'Hủy từ admin' });
    setDonationToCancel(null);
  };

  const statCards = [
    {
      label: 'Tổng tiền',
      value: `${formatNumberVN(stats?.totalAmount || 0)}đ`,
      tone: 'text-primary',
      icon: 'payments',
    },
    {
      label: 'Tổng giao dịch',
      value: formatNumberVN(stats?.totalCount || 0),
      tone: 'text-foreground',
      icon: 'receipt_long',
    },
    {
      label: 'Chờ thanh toán',
      value: formatNumberVN(stats?.pendingCount || 0),
      tone: 'text-amber-600',
      icon: 'hourglass_top',
      badge: 'Cần theo dõi',
    },
    {
      label: 'Thành công',
      value: formatNumberVN(stats?.completedCount || 0),
      tone: 'text-emerald-600',
      icon: 'check_circle',
      badge: 'Đã vào quỹ',
    },
    {
      label: 'Thất bại',
      value: formatNumberVN(stats?.failedCount || 0),
      tone: 'text-red-600',
      icon: 'error',
      badge: 'Thanh toán lỗi',
    },
    {
      label: 'Đã hủy / Hết hạn',
      value: formatNumberVN((stats?.cancelledCount || 0) + (stats?.expiredCount || 0)),
      tone: 'text-slate-600',
      icon: 'event_busy',
      badge: 'Không còn hiệu lực',
    },
  ];

  return (
    <DashboardLayout projects={adminProjects} navItems={adminNavItems}>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-primary">Quản lý quyên góp</h1>
            <p className="text-muted-foreground mt-2">
              Quản trị viên dùng các API quyên góp để theo dõi giao dịch, đối soát thanh toán, hủy
              liên kết chờ xử lý và xuất báo cáo CSV.
            </p>
          </div>
          <Button
            variant="primary"
            className="gap-2"
            onClick={() => void handleExport()}
            disabled={exportStatus === 'pending'}
          >
            <span className="material-symbols-outlined text-sm">download</span>
            {exportStatus === 'pending' ? 'Đang xuất...' : 'Xuất CSV'}
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-6 gap-4 items-stretch">
          {statCards.map((stat) => (
            <Card key={stat.label} className="h-full">
              <CardContent className="p-5 h-full">
                <div className="flex h-full items-start justify-between gap-3">
                  <div className="flex min-h-full flex-col justify-between">
                    <p className="text-xs uppercase text-muted-foreground font-semibold">
                      {stat.label}
                    </p>
                    <p className={`mt-2 text-2xl font-black ${stat.tone}`}>{stat.value}</p>
                    <div className="mt-3 min-h-[24px]">
                      {stat.badge ? (
                        <Badge
                          variant="outline"
                          appearance="outline"
                          size="xs"
                          className="inline-flex"
                        >
                          {stat.badge}
                        </Badge>
                      ) : null}
                    </div>
                  </div>
                  <div className="size-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined">{stat.icon}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="border-border">
          <CardHeader className="pb-4">
            <div className="space-y-4 p-2 w-full">
              <CardTitle>Danh sách quyên góp</CardTitle>
              <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-3 w-full">
                <div className="flex flex-col xl:flex-row gap-3 xl:items-center xl:justify-between">
                  <Input
                    value={keyword}
                    onChange={(event) => {
                      setKeyword(event.target.value);
                      setPageIndex(1);
                    }}
                    placeholder="Tìm theo người ủng hộ / chiến dịch"
                    className="w-full xl:max-w-sm"
                  />
                  <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
                    <div className="overflow-x-auto">
                      <Tabs
                        value={statusFilter}
                        onValueChange={(value) => {
                          setStatusFilter(value);
                          setPageIndex(1);
                        }}
                      >
                        <TabsList
                          variant="button"
                          size="sm"
                          className="w-max min-w-full sm:min-w-0"
                        >
                          <TabsTrigger value="all">Tất cả</TabsTrigger>
                          <TabsTrigger value={String(DonationStatus.Pending)}>
                            Chờ thanh toán
                          </TabsTrigger>
                          <TabsTrigger value={String(DonationStatus.Completed)}>
                            Thành công
                          </TabsTrigger>
                          <TabsTrigger value={String(DonationStatus.Failed)}>Thất bại</TabsTrigger>
                        </TabsList>
                      </Tabs>
                    </div>
                    <Button
                      variant="destructive"
                      onClick={resetFilters}
                      disabled={!hasFilterApplied}
                    >
                      Đặt lại bộ lọc
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-2 gap-3">
                  <Select
                    value={campaignFilter}
                    onValueChange={(value) => {
                      setCampaignFilter(value);
                      setPageIndex(1);
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Lọc theo chiến dịch" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tất cả chiến dịch</SelectItem>
                      {campaigns.map((campaign) => (
                        <SelectItem key={campaign.campaignId} value={campaign.campaignId}>
                          {campaign.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select
                    value={periodFilter}
                    onValueChange={(value) => {
                      setPeriodFilter(value);
                      setPageIndex(1);
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Khoảng thời gian" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tất cả khoảng thời gian</SelectItem>
                      <SelectItem value="day">Theo ngày</SelectItem>
                      <SelectItem value="week">Theo tuần</SelectItem>
                      <SelectItem value="month">Theo tháng</SelectItem>
                      <SelectItem value="year">Theo năm</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto rounded-lg border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[20%]">Giao dịch quyên góp</TableHead>
                    <TableHead className="w-[16%]">Chiến dịch</TableHead>
                    <TableHead className="w-[10%] whitespace-nowrap">Số tiền</TableHead>
                    <TableHead className="w-[12%]">Trạng thái</TableHead>
                    <TableHead className="w-[14%]">Thông điệp</TableHead>
                    <TableHead className="w-[12%] whitespace-nowrap">Hết hạn lúc</TableHead>
                    <TableHead className="w-[10%] whitespace-nowrap">Thời điểm</TableHead>
                    <TableHead className="w-[16%] text-right">Hành động</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={8}>Đang tải danh sách quyên góp...</TableCell>
                    </TableRow>
                  ) : donations.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8}>Không có giao dịch quyên góp phù hợp.</TableCell>
                    </TableRow>
                  ) : (
                    donations.map((item) => {
                      const statusUi =
                        DONATION_STATUS_UI[Number(item.status)] ||
                        DONATION_STATUS_UI[DonationStatus.Pending];
                      return (
                        <TableRow key={item.donationId} className="hover:bg-muted/40">
                          <TableCell>
                            <div className="min-w-0">
                              <p className="font-semibold text-foreground">{item.donorName}</p>
                              <p className="text-xs text-muted-foreground">#{item.orderCode}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <p
                              className="max-w-[220px] truncate"
                              title={item.campaignName || 'Chưa rõ chiến dịch'}
                            >
                              {item.campaignName || 'Chưa rõ chiến dịch'}
                            </p>
                          </TableCell>
                          <TableCell className="whitespace-nowrap font-semibold">
                            {formatNumberVN(item.amount)}đ
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              appearance="outline"
                              className={`border min-w-[110px] justify-center inline-flex ${statusUi.className}`}
                            >
                              {statusUi.label}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <p
                              className="max-w-[220px] truncate text-sm text-muted-foreground"
                              title={item.message || ''}
                            >
                              {item.message || 'Không có lời nhắn'}
                            </p>
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                            {item.expiresAt
                              ? new Date(item.expiresAt).toLocaleString('vi-VN')
                              : 'Không có'}
                          </TableCell>
                          <TableCell className="whitespace-nowrap">
                            <div>
                              <p>{new Date(item.donatedAt).toLocaleDateString('vi-VN')}</p>
                              <p className="text-xs text-muted-foreground">
                                {new Date(item.donatedAt).toLocaleTimeString('vi-VN')}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setSelectedDonationId(item.donationId)}
                              >
                                <span className="material-symbols-outlined text-sm">
                                  visibility
                                </span>
                                Chi tiết
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => void handleReconcile(item.donationId)}
                                disabled={reconcileStatus === 'pending'}
                              >
                                <span className="material-symbols-outlined text-sm">sync</span>
                                Đối soát
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() =>
                                  setDonationToCancel({
                                    id: item.donationId,
                                    donorName: item.donorName,
                                  })
                                }
                                disabled={
                                  cancelStatus === 'pending' ||
                                  Number(item.status) !== DonationStatus.Pending
                                }
                              >
                                <span className="material-symbols-outlined text-sm">cancel</span>
                                Hủy
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
            {paging && (
              <div className="mt-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <p className="text-sm text-muted-foreground">
                  Trang {paging.currentPage}/{totalPages} • Tổng {paging.totalCount} giao dịch quyên
                  góp
                </p>
                <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/20 px-3 py-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPageIndex((prev) => Math.max(prev - 1, 1))}
                    disabled={pageIndex <= 1}
                  >
                    <span className="material-symbols-outlined text-sm">chevron_left</span>
                    Trước
                  </Button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: totalPages })
                      .slice(0, 5)
                      .map((_, index) => {
                        const page = index + 1;
                        return (
                          <Button
                            key={page}
                            variant={pageIndex === page ? 'primary' : 'outline'}
                            size="sm"
                            onClick={() => setPageIndex(page)}
                          >
                            {page}
                          </Button>
                        );
                      })}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPageIndex((prev) => Math.min(prev + 1, totalPages))}
                    disabled={pageIndex >= totalPages}
                  >
                    Sau
                    <span className="material-symbols-outlined text-sm">chevron_right</span>
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Dialog
          open={!!selectedDonationId}
          onOpenChange={(open) => !open && setSelectedDonationId('')}
        >
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Chi tiết giao dịch quyên góp</DialogTitle>
              <DialogDescription>
                Kiểm tra liên kết thanh toán, phản hồi cổng thanh toán và lịch sử giao dịch để đối
                soát hoặc rà lỗi thanh toán.
              </DialogDescription>
            </DialogHeader>
            {isLoadingDetail || !donationDetail ? (
              <p className="text-sm text-muted-foreground">
                Đang tải chi tiết giao dịch quyên góp...
              </p>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="rounded-xl border border-border bg-muted/20 p-4">
                    <p className="text-xs uppercase text-muted-foreground">Người ủng hộ</p>
                    <p className="mt-2 font-semibold">{donationDetail.donorName}</p>
                  </div>
                  <div className="rounded-xl border border-border bg-muted/20 p-4">
                    <p className="text-xs uppercase text-muted-foreground">Chiến dịch</p>
                    <p className="mt-2 font-semibold">{donationDetail.campaignName || 'Chưa rõ'}</p>
                  </div>
                  <div className="rounded-xl border border-border bg-muted/20 p-4">
                    <p className="text-xs uppercase text-muted-foreground">Số tiền</p>
                    <p className="mt-2 font-semibold">{formatNumberVN(donationDetail.amount)}đ</p>
                  </div>
                  <div className="rounded-xl border border-border bg-muted/20 p-4">
                    <p className="text-xs uppercase text-muted-foreground">Liên kết thanh toán</p>
                    <a
                      href={donationDetail.checkoutUrl || '#'}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2 inline-block text-primary underline break-all"
                    >
                      {donationDetail.checkoutUrl || 'Không có'}
                    </a>
                  </div>
                </div>
                <div className="rounded-xl border border-border bg-muted/20 p-4">
                  <p className="text-xs uppercase text-muted-foreground">
                    Phản hồi cổng thanh toán
                  </p>
                  <pre className="mt-2 whitespace-pre-wrap break-words text-xs text-muted-foreground">
                    {donationDetail.gatewayResponse ||
                      'Không có dữ liệu phản hồi từ cổng thanh toán'}
                  </pre>
                </div>
                <div className="rounded-xl border border-border bg-muted/20 p-4">
                  <p className="text-xs uppercase text-muted-foreground">
                    Lịch sử giao dịch thanh toán
                  </p>
                  <div className="mt-3 space-y-3 max-h-[260px] overflow-y-auto pr-1 custom-scrollbar">
                    {donationDetail.transactions.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        Chưa có bản ghi giao dịch thanh toán nào.
                      </p>
                    ) : (
                      donationDetail.transactions.map((transaction) => (
                        <div
                          key={transaction.paymentTransactionId}
                          className="rounded-lg border border-border bg-background p-3"
                        >
                          <p className="font-medium text-foreground">
                            {transaction.provider} •{' '}
                            {transaction.eventDescription ||
                              transaction.eventCode ||
                              'Sự kiện thanh toán'}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Mã tham chiếu: {transaction.reference || 'Không có'} • Chữ ký:{' '}
                            {transaction.isSignatureValid ? 'Hợp lệ' : 'Không hợp lệ'}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {new Date(transaction.createdAt).toLocaleString('vi-VN')} •{' '}
                            {formatNumberVN(transaction.amount)} {transaction.currency}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setSelectedDonationId('')}>
                Đóng
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <ConfirmDialog
          open={!!donationToCancel}
          onOpenChange={(open) => {
            if (!open) setDonationToCancel(null);
          }}
          title="Hủy liên kết thanh toán đang chờ"
          description={
            donationToCancel
              ? `Bạn có chắc muốn hủy giao dịch đang chờ của ${donationToCancel.donorName}? Thao tác này sẽ gọi endpoint hủy payment link ở PayOS.`
              : 'Bạn có chắc muốn hủy liên kết thanh toán đang chờ?'
          }
          confirmText={cancelStatus === 'pending' ? 'Đang hủy...' : 'Xác nhận hủy'}
          cancelText="Đóng"
          variant="destructive"
          onConfirm={() => {
            void handleConfirmCancel();
          }}
        />
      </div>
    </DashboardLayout>
  );
}
