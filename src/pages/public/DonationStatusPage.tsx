import { useMemo } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useDonationStatus } from '@/hooks/useDonations';
import { DonationStatus } from '@/services/donationService';
import { formatNumberVN } from '@/lib/utils';
import { cn } from '@/lib/utils';

const STATUS_UI: Record<
  number,
  { label: string; icon: string; wrapperClass: string; iconClass: string; desc: string }
> = {
  [DonationStatus.Pending]: {
    label: 'Đang chờ thanh toán',
    icon: 'hourglass_top',
    wrapperClass: 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900',
    iconClass: 'text-amber-500 bg-amber-100 dark:bg-amber-900/50',
    desc: 'Hệ thống đang chờ bạn hoàn tất thanh toán. Vui lòng quét mã QR trên ứng dụng ngân hàng của bạn.',
  },
  [DonationStatus.Completed]: {
    label: 'Thanh toán thành công',
    icon: 'check_circle',
    wrapperClass: 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900',
    iconClass: 'text-emerald-500 bg-emerald-100 dark:bg-emerald-900/50',
    desc: 'Cảm ơn tấm lòng vàng của bạn! Chúng tôi đã nhận được khoản đóng góp và sẽ cập nhật vào chiến dịch.',
  },
  [DonationStatus.Failed]: {
    label: 'Thanh toán thất bại',
    icon: 'error',
    wrapperClass: 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900',
    iconClass: 'text-red-500 bg-red-100 dark:bg-red-900/50',
    desc: 'Rất tiếc, giao dịch của bạn không thành công. Bạn có thể thử lại ở một giao dịch mới.',
  },
  [DonationStatus.Cancelled]: {
    label: 'Đã hủy giao dịch',
    icon: 'cancel',
    wrapperClass: 'bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800',
    iconClass: 'text-slate-500 bg-slate-200 dark:bg-slate-800',
    desc: 'Giao dịch quyên góp đã bị huỷ bởi người dùng. Chúng tôi luôn trân trọng ý định của bạn và mong bạn sẽ quay lại sau.',
  },
  [DonationStatus.Expired]: {
    label: 'Giao dịch hết hạn',
    icon: 'schedule',
    wrapperClass: 'bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800',
    iconClass: 'text-slate-500 bg-slate-200 dark:bg-slate-800',
    desc: 'Giao dịch đã quá thời gian thanh toán cho phép. Vui lòng tạo một giao dịch quyên góp mới.',
  },
  [DonationStatus.Refunded]: {
    label: 'Đã hoàn tiền',
    icon: 'replay',
    wrapperClass: 'bg-violet-50 dark:bg-violet-950/30 border-violet-200 dark:border-violet-900',
    iconClass: 'text-violet-500 bg-violet-100 dark:bg-violet-900/50',
    desc: 'Khoản tiền đã được hoàn lại về tài khoản gốc của bạn.',
  },
};

export default function DonationStatusPage() {
  const { donationId = '' } = useParams();
  const [searchParams] = useSearchParams();
  const campaignId = searchParams.get('campaignId') || '';
  const { donation, isLoading, refetch } = useDonationStatus(donationId, true);

  const statusUi = useMemo(
    () => STATUS_UI[Number(donation?.status ?? DonationStatus.Pending)],
    [donation?.status],
  );

  const isPending = Number(donation?.status) === DonationStatus.Pending;

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-background py-16 px-4 flex items-center justify-center">
      <div className="w-full max-w-2xl">
        <Card className="border-0 shadow-2xl shadow-primary/5 rounded-3xl overflow-hidden bg-white dark:bg-card">
          <CardHeader className="text-center pt-10 pb-6 border-b border-slate-100 dark:border-slate-800">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 mb-4">
              <span className="material-symbols-outlined text-3xl text-primary">
                volunteer_activism
              </span>
            </div>
            <CardTitle className="text-2xl font-black text-slate-900 dark:text-white">
              Theo dõi giao dịch quyên góp
            </CardTitle>
          </CardHeader>

          <CardContent className="p-8 md:p-10">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-10 space-y-4">
                <div className="h-12 w-12 rounded-full border-4 border-primary/30 border-t-primary animate-spin"></div>
                <p className="text-slate-500 font-medium">Đang tải thông tin giao dịch...</p>
              </div>
            ) : donation && statusUi ? (
              <div className="space-y-8">
                {/* Status Focus Box */}
                <div
                  className={cn(
                    'rounded-3xl border-2 p-6 md:p-8 text-center transition-all duration-300',
                    statusUi.wrapperClass,
                    isPending &&
                      'animate-pulse-slow shadow-[0_0_40px_-10px_rgba(245,158,11,0.3)] shadow-amber-500/20',
                  )}
                >
                  <div
                    className={cn(
                      'mx-auto flex h-20 w-20 items-center justify-center rounded-full mb-5',
                      statusUi.iconClass,
                    )}
                  >
                    <span className="material-symbols-outlined text-4xl">{statusUi.icon}</span>
                  </div>
                  <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-3">
                    {statusUi.label}
                  </h2>
                  <p className="text-slate-600 dark:text-slate-300">{statusUi.desc}</p>

                  {isPending && (
                    <div className="mt-6 flex items-center justify-center gap-2 text-sm text-amber-700 dark:text-amber-500 font-medium bg-amber-100/50 dark:bg-amber-900/30 w-fit mx-auto px-4 py-2 rounded-full">
                      <span className="material-symbols-outlined text-base animate-spin">
                        progress_activity
                      </span>
                      Hệ thống đang tự động kiểm tra...
                    </div>
                  )}
                </div>

                {/* Donation Details */}
                <div className="bg-slate-50 dark:bg-slate-900/50 rounded-2xl p-6 border border-slate-100 dark:border-slate-800">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary text-lg">
                      receipt_long
                    </span>
                    Thông tin GD
                  </h3>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center pb-4 border-b border-slate-100 dark:border-slate-800">
                      <span className="text-slate-500 text-sm">Nhà hảo tâm</span>
                      <span className="font-semibold text-slate-900 dark:text-white">
                        {donation.donorName}
                      </span>
                    </div>
                    <div className="flex justify-between items-center pb-4 border-b border-slate-100 dark:border-slate-800">
                      <span className="text-slate-500 text-sm">Mã đơn hàng</span>
                      <span className="font-mono text-sm font-medium bg-slate-200 dark:bg-slate-800 px-2 py-0.5 rounded">
                        {donation.orderCode}
                      </span>
                    </div>
                    <div className="flex justify-between items-center pb-4 border-b border-slate-100 dark:border-slate-800">
                      <span className="text-slate-500 text-sm">Số tiền ủng hộ</span>
                      <span className="font-black text-emerald-600 text-lg">
                        {formatNumberVN(donation.amount)} VNĐ
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500 text-sm">Hết hạn thanh toán lúc</span>
                      <span className="text-slate-700 dark:text-slate-300 text-sm font-medium">
                        {new Date(donation.expiresAt).toLocaleString('vi-VN')}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col sm:flex-row justify-center gap-4 pt-2">
                  <Button
                    variant="outline"
                    className="h-12 rounded-full px-8 bg-white dark:bg-card"
                    onClick={() => void refetch()}
                  >
                    <span className="material-symbols-outlined mr-2">refresh</span>
                    Làm mới
                  </Button>

                  {isPending && donation.checkoutUrl && (
                    <Button
                      variant="primary"
                      className="h-12 rounded-full px-8 shadow-lg shadow-primary/20"
                      asChild
                    >
                      <a href={donation.checkoutUrl} target="_blank" rel="noreferrer">
                        <span className="material-symbols-outlined mr-2">open_in_new</span>
                        Mở lại cổng thanh toán
                      </a>
                    </Button>
                  )}

                  {campaignId && !isPending && (
                    <Button
                      variant="primary"
                      className="h-12 rounded-full px-8 shadow-lg shadow-primary/20"
                      asChild
                    >
                      <Link to={`/donate/${campaignId}`}>Về trang chiến dịch</Link>
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-10">
                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 mb-4">
                  <span className="material-symbols-outlined text-4xl text-slate-400">
                    search_off
                  </span>
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                  Không tìm thấy thông tin
                </h3>
                <p className="text-slate-500 mb-6">
                  Mã giao dịch có thể không đúng hoặc đã bị xóa khỏi hệ thống.
                </p>
                <Button variant="outline" asChild>
                  <Link to="/fundraising">Về trang chủ gây quỹ</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
