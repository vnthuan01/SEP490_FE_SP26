import { useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

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

export default function DonationReturnPage() {
  const { code, paymentId, cancel, status, orderCode, campaignId } = useReturnParams();

  const normalizedStatus = useMemo(() => status.toUpperCase(), [status]);
  const isPaid = normalizedStatus === 'PAID' || normalizedStatus === 'SUCCESS';

  return (
    <div className="min-h-screen bg-background px-4 py-10 text-foreground">
      <div className="mx-auto max-w-2xl">
        <Card className="border-border">
          <CardHeader className="space-y-3">
            <Badge
              variant={isPaid ? 'success' : 'info'}
              appearance="outline"
              size="sm"
              className="w-fit gap-2"
            >
              <span className="material-symbols-outlined text-sm">
                {isPaid ? 'check_circle' : 'hourglass_top'}
              </span>
              {isPaid ? 'Thanh toán thành công' : 'Đã quay lại từ cổng thanh toán'}
            </Badge>
            <CardTitle className="text-2xl font-black text-primary">
              Kết quả thanh toán quyên góp
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Hệ thống đã nhận được thông tin trả về từ cổng thanh toán. Nếu giao dịch vừa hoàn tất,
              backend vẫn có thể cần thêm vài giây để cập nhật trạng thái cuối cùng qua webhook.
            </p>
          </CardHeader>

          <CardContent className="space-y-5">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-border bg-muted/20 p-4">
                <p className="text-xs font-semibold uppercase text-muted-foreground">
                  Trạng thái PayOS
                </p>
                <p className="mt-2 font-semibold text-foreground">{normalizedStatus}</p>
              </div>
              <div className="rounded-xl border border-border bg-muted/20 p-4">
                <p className="text-xs font-semibold uppercase text-muted-foreground">Mã đơn hàng</p>
                <p className="mt-2 font-mono text-sm text-foreground">{orderCode}</p>
              </div>
              <div className="rounded-xl border border-border bg-muted/20 p-4">
                <p className="text-xs font-semibold uppercase text-muted-foreground">Mã phản hồi</p>
                <p className="mt-2 text-sm text-foreground">{code}</p>
              </div>
              <div className="rounded-xl border border-border bg-muted/20 p-4">
                <p className="text-xs font-semibold uppercase text-muted-foreground">
                  Mã giao dịch PayOS
                </p>
                <p className="mt-2 break-all text-sm text-foreground">{paymentId}</p>
              </div>
              <div className="rounded-xl border border-border bg-muted/20 p-4 sm:col-span-2">
                <p className="text-xs font-semibold uppercase text-muted-foreground">Cờ hủy</p>
                <p className="mt-2 text-sm text-foreground">{cancel}</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              {campaignId ? (
                <Button asChild>
                  <Link to={`/donate/${campaignId}`}>Quay lại chiến dịch</Link>
                </Button>
              ) : (
                <Button asChild>
                  <Link to="/fundraising">Xem các chiến dịch gây quỹ</Link>
                </Button>
              )}
              <Button variant="outline" asChild>
                <Link to="/fundraising">Về danh sách gây quỹ</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
