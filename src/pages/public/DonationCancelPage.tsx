import { Link, useSearchParams } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function DonationCancelPage() {
  const [searchParams] = useSearchParams();
  const code = searchParams.get('code') || '--';
  const paymentId = searchParams.get('id') || '--';
  const status = searchParams.get('status') || 'CANCELLED';
  const orderCode = searchParams.get('orderCode') || '--';
  const campaignId = searchParams.get('campaignId') || '';

  return (
    <div className="min-h-screen bg-background px-4 py-10 text-foreground">
      <div className="mx-auto max-w-2xl">
        <Card className="border-border">
          <CardHeader className="space-y-3">
            <Badge variant="destructive" appearance="outline" size="sm" className="w-fit gap-2">
              <span className="material-symbols-outlined text-sm">cancel</span>
              Thanh toán đã bị hủy
            </Badge>
            <CardTitle className="text-2xl font-black text-primary">
              Bạn đã hủy thanh toán quyên góp
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Giao dịch chưa được hoàn tất. Bạn có thể quay lại chiến dịch để tạo thanh toán mới bất
              cứ lúc nào.
            </p>
          </CardHeader>

          <CardContent className="space-y-5">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-border bg-muted/20 p-4">
                <p className="text-xs font-semibold uppercase text-muted-foreground">
                  Trạng thái PayOS
                </p>
                <p className="mt-2 font-semibold text-foreground">{status.toUpperCase()}</p>
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
            </div>

            <div className="flex flex-wrap gap-3">
              {campaignId ? (
                <Button asChild>
                  <Link to={`/donate/${campaignId}`}>Tạo lại thanh toán</Link>
                </Button>
              ) : (
                <Button asChild>
                  <Link to="/fundraising">Chọn lại chiến dịch</Link>
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
