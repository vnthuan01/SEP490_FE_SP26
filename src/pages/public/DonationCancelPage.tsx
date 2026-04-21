import { Link, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export default function DonationCancelPage() {
  const [searchParams] = useSearchParams();
  const orderCode = searchParams.get('orderCode') || '--';
  const campaignId = searchParams.get('campaignId') || '';

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-md text-center">
        {/* Icon */}
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <span className="material-symbols-outlined text-[44px]">close</span>
        </div>

        {/* Heading */}
        <h1 className="text-2xl font-bold text-foreground mb-2">Giao dịch đã bị huỷ</h1>
        <p className="text-muted-foreground text-sm mb-8 max-w-sm mx-auto">
          Bạn đã thoát khỏi cổng thanh toán. Không có khoản tiền nào bị trừ. Bạn có thể thử lại bất
          cứ lúc nào.
        </p>

        {/* Info table */}
        <div className="rounded-lg border border-border bg-card text-left mb-8">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
            <span className="text-sm text-muted-foreground">Trạng thái</span>
            <span className="text-sm font-semibold text-muted-foreground">Đã huỷ</span>
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
              <Link to={`/donate/${campaignId}`}>Thử quyên góp lại</Link>
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
