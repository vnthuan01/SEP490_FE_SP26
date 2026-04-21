import { useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';

function useReturnParams() {
  const [searchParams] = useSearchParams();

  return {
    code: searchParams.get('code') || '--',
    paymentId: searchParams.get('id') || '--',
    cancel: searchParams.get('cancel') || 'false',
    status: searchParams.get('status') || 'PENDING',
    orderCode: searchParams.get('orderCode') || '--',
    campaignId: searchParams.get('campaignId') || '',
  };
}

const STATUS_LABEL: Record<string, string> = {
  PAID: 'Thành công',
  SUCCESS: 'Thành công',
  PENDING: 'Đang xử lý',
  PROCESSING: 'Đang xử lý',
  CANCELLED: 'Đã huỷ',
};

export default function DonationReturnPage() {
  const { status, orderCode, campaignId } = useReturnParams();

  const normalizedStatus = useMemo(() => status.toUpperCase(), [status]);
  const isPaid = normalizedStatus === 'PAID' || normalizedStatus === 'SUCCESS';
  const statusText = STATUS_LABEL[normalizedStatus] || normalizedStatus;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-md text-center">
        {/* Icon */}
        <div
          className={`mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full ${
            isPaid ? 'bg-emerald-500 text-white' : 'bg-amber-500 text-white'
          }`}
        >
          <span className="material-symbols-outlined text-[44px]">
            {isPaid ? 'check' : 'schedule'}
          </span>
        </div>

        {/* Heading */}
        <h1 className="text-2xl font-bold text-foreground mb-2">
          {isPaid ? 'Thanh toán thành công!' : 'Giao dịch đang được xử lý'}
        </h1>
        <p className="text-muted-foreground text-sm mb-8 max-w-sm mx-auto">
          {isPaid
            ? 'Cảm ơn bạn đã quyên góp! Khoản đóng góp của bạn đã được hệ thống ghi nhận thành công.'
            : 'Chúng tôi đang chờ xác nhận từ ngân hàng. Vui lòng kiểm tra lại sau ít phút.'}
        </p>

        {/* Info table */}
        <div className="rounded-lg border border-border bg-card text-left mb-8">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
            <span className="text-sm text-muted-foreground">Trạng thái</span>
            <span
              className={`text-sm font-semibold ${isPaid ? 'text-emerald-600' : 'text-amber-600'}`}
            >
              {statusText}
            </span>
          </div>
          <div className="flex items-center justify-between px-5 py-3.5">
            <span className="text-sm text-muted-foreground">Mã đơn hàng</span>
            <span className="text-sm font-medium text-foreground">{orderCode}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3">
          {campaignId ? (
            <Button className="w-full h-11" asChild>
              <Link to={`/donate/${campaignId}`}>Quay lại chiến dịch</Link>
            </Button>
          ) : (
            <Button className="w-full h-11" asChild>
              <Link to="/fundraising">Xem các chiến dịch</Link>
            </Button>
          )}

          <Button variant="outline" className="w-full h-11" asChild>
            <Link to="/fundraising">Về trang chủ</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
