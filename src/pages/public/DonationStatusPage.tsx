import { useMemo } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useDonationStatus } from '@/hooks/useDonations';
import { DonationStatus } from '@/services/donationService';
import { formatNumberVN } from '@/lib/utils';

const STATUS_UI: Record<number, { label: string; icon: string; className: string }> = {
  [DonationStatus.Pending]: {
    label: 'Đang chờ thanh toán',
    icon: 'hourglass_top',
    className: 'text-amber-600 bg-amber-500/10 border-amber-500/20',
  },
  [DonationStatus.Completed]: {
    label: 'Thanh toán thành công',
    icon: 'check_circle',
    className: 'text-emerald-600 bg-emerald-500/10 border-emerald-500/20',
  },
  [DonationStatus.Failed]: {
    label: 'Thanh toán thất bại',
    icon: 'error',
    className: 'text-red-600 bg-red-500/10 border-red-500/20',
  },
  [DonationStatus.Cancelled]: {
    label: 'Đã hủy',
    icon: 'cancel',
    className: 'text-red-600 bg-red-500/10 border-red-500/20',
  },
  [DonationStatus.Expired]: {
    label: 'Đã hết hạn',
    icon: 'schedule',
    className: 'text-slate-600 bg-slate-500/10 border-slate-500/20',
  },
  [DonationStatus.Refunded]: {
    label: 'Đã hoàn tiền',
    icon: 'replay',
    className: 'text-violet-600 bg-violet-500/10 border-violet-500/20',
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

  return (
    <div className="min-h-screen bg-background py-10 px-4">
      <div className="mx-auto max-w-2xl">
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-2xl font-black text-primary">
              Theo dõi trạng thái quyên góp
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {isLoading ? (
              <p className="text-muted-foreground">Đang kiểm tra trạng thái donation...</p>
            ) : donation ? (
              <>
                <Badge
                  variant="outline"
                  appearance="outline"
                  size="sm"
                  className={`gap-2 border ${statusUi.className}`}
                >
                  <span className="material-symbols-outlined text-sm">{statusUi.icon}</span>
                  {statusUi.label}
                </Badge>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="rounded-xl border border-border bg-muted/20 p-4">
                    <p className="text-xs uppercase font-semibold text-muted-foreground">
                      Người ủng hộ
                    </p>
                    <p className="mt-2 font-semibold text-foreground">{donation.donorName}</p>
                  </div>
                  <div className="rounded-xl border border-border bg-muted/20 p-4">
                    <p className="text-xs uppercase font-semibold text-muted-foreground">Số tiền</p>
                    <p className="mt-2 font-semibold text-foreground">
                      {formatNumberVN(donation.amount)}đ
                    </p>
                  </div>
                  <div className="rounded-xl border border-border bg-muted/20 p-4">
                    <p className="text-xs uppercase font-semibold text-muted-foreground">
                      Mã đơn hàng
                    </p>
                    <p className="mt-2 font-mono text-sm text-foreground">{donation.orderCode}</p>
                  </div>
                  <div className="rounded-xl border border-border bg-muted/20 p-4">
                    <p className="text-xs uppercase font-semibold text-muted-foreground">
                      Hết hạn lúc
                    </p>
                    <p className="mt-2 text-sm text-foreground">
                      {new Date(donation.expiresAt).toLocaleString('vi-VN')}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3">
                  <Button variant="outline" onClick={() => void refetch()}>
                    Kiểm tra lại trạng thái
                  </Button>
                  {donation.checkoutUrl && Number(donation.status) === DonationStatus.Pending && (
                    <Button asChild>
                      <a href={donation.checkoutUrl} target="_blank" rel="noreferrer">
                        Mở lại trang thanh toán
                      </a>
                    </Button>
                  )}
                  {campaignId && (
                    <Button variant="secondary" asChild>
                      <Link to={`/donate/${campaignId}`}>Quay lại chiến dịch</Link>
                    </Button>
                  )}
                </div>
              </>
            ) : (
              <p className="text-muted-foreground">Không tìm thấy trạng thái donation.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
