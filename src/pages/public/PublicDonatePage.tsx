import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useCampaignSummary } from '@/hooks/useCampaigns';
import { useCreateDonationCheckout } from '@/hooks/useDonations';
import { CampaignResourceType } from '@/enums/beEnums';
import { formatNumberVN } from '@/lib/utils';

const QUICK_AMOUNTS = [100000, 200000, 500000, 1000000, 2000000, 5000000];

export default function PublicDonatePage() {
  const { campaignId = '' } = useParams();
  const navigate = useNavigate();
  const { summary, isLoading, isError, refetch } = useCampaignSummary(campaignId);
  const { mutateAsync: createCheckout, status: createCheckoutStatus } = useCreateDonationCheckout();

  const [donorName, setDonorName] = useState('');
  const [amount, setAmount] = useState(500000);
  const [message, setMessage] = useState('');

  const moneyGoal = useMemo(
    () => summary?.goals?.find((goal) => Number(goal.resourceType) === CampaignResourceType.Money),
    [summary],
  );

  const handleDonate = async () => {
    if (!campaignId) return;
    const response = await createCheckout({
      campaignId,
      amount,
      donorName: donorName.trim(),
      message: message.trim() || undefined,
    });

    if (response.checkoutUrl) {
      window.open(response.checkoutUrl, '_blank', 'noopener,noreferrer');
      navigate(`/donate/status/${response.donationId}?campaignId=${campaignId}`);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground py-10 px-4">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="space-y-2">
          <Badge variant="info" appearance="outline" size="sm" className="gap-1">
            <span className="material-symbols-outlined text-[14px]">volunteer_activism</span>
            Quyên góp trực tuyến
          </Badge>
          <h1 className="text-3xl font-black text-primary">Ủng hộ chiến dịch gây quỹ</h1>
          <p className="text-muted-foreground">
            Thực hiện theo flow fundraising: xem summary chiến dịch → tạo checkout PayOS → polling
            trạng thái donation.
          </p>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 lg:grid-cols-[1.15fr_0.85fr] gap-6">
            <Skeleton className="h-[420px] rounded-2xl" />
            <Skeleton className="h-[420px] rounded-2xl" />
          </div>
        ) : isError || !summary ? (
          <Card className="border-border">
            <CardContent className="p-8 text-center space-y-4">
              <span className="material-symbols-outlined text-5xl text-destructive">error</span>
              <h2 className="text-xl font-bold">Không tải được thông tin chiến dịch gây quỹ</h2>
              <Button variant="outline" onClick={() => refetch()}>
                Thử lại
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-[1.15fr_0.85fr] gap-6">
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="text-2xl font-black">{summary.name}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <p className="text-muted-foreground leading-7">
                  {summary.description || 'Chiến dịch gây quỹ đang mở quyên góp.'}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="rounded-xl border border-border bg-muted/20 p-4">
                    <p className="text-xs uppercase font-semibold text-muted-foreground">Đã nhận</p>
                    <p className="mt-2 text-2xl font-black text-emerald-600">
                      {formatNumberVN(summary.totalMoneyReceived || 0)}đ
                    </p>
                  </div>
                  <div className="rounded-xl border border-border bg-muted/20 p-4">
                    <p className="text-xs uppercase font-semibold text-muted-foreground">
                      Còn lại trong quỹ
                    </p>
                    <p className="mt-2 text-2xl font-black text-primary">
                      {formatNumberVN(summary.remainingBudget || 0)}đ
                    </p>
                  </div>
                </div>
                <div className="rounded-xl border border-border bg-muted/20 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-semibold text-foreground">Mục tiêu gây quỹ</p>
                    <Badge variant="success" appearance="outline" size="sm">
                      {moneyGoal?.progressPercent
                        ? `${Math.round(Number(moneyGoal.progressPercent))}%`
                        : '0%'}
                    </Badge>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Đã đạt {formatNumberVN(moneyGoal?.receivedAmount || 0)} /{' '}
                    {formatNumberVN(moneyGoal?.targetAmount || 0)} đ
                  </p>
                  <div className="mt-3 h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full"
                      style={{
                        width: `${Math.max(0, Math.min(Number(moneyGoal?.progressPercent || 0), 100))}%`,
                      }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border">
              <CardHeader>
                <CardTitle className="text-xl font-bold">Tạo thanh toán quyên góp</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Họ tên người ủng hộ</label>
                  <Input
                    value={donorName}
                    onChange={(event) => setDonorName(event.target.value)}
                    placeholder="Nguyễn Văn A"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Số tiền ủng hộ (VND)</label>
                  <Input
                    type="number"
                    min={1000}
                    max={1000000000}
                    value={amount}
                    onChange={(event) => setAmount(Number(event.target.value || 0))}
                  />
                  <div className="flex flex-wrap gap-2">
                    {QUICK_AMOUNTS.map((quickAmount) => (
                      <Button
                        key={quickAmount}
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setAmount(quickAmount)}
                      >
                        {formatNumberVN(quickAmount)}đ
                      </Button>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Lời nhắn</label>
                  <Textarea
                    rows={4}
                    value={message}
                    onChange={(event) => setMessage(event.target.value)}
                    placeholder="Gửi lời động viên tới chiến dịch"
                  />
                </div>
                <Button
                  className="w-full gap-2"
                  onClick={() => void handleDonate()}
                  disabled={
                    !campaignId ||
                    !donorName.trim() ||
                    amount < 1000 ||
                    createCheckoutStatus === 'pending'
                  }
                >
                  <span className="material-symbols-outlined text-lg">payments</span>
                  {createCheckoutStatus === 'pending'
                    ? 'Đang tạo thanh toán...'
                    : `Ủng hộ ${formatNumberVN(amount)}đ`}
                </Button>
                <p className="text-xs text-muted-foreground">
                  Frontend tạo checkout bằng `POST /api/donations/checkout`, sau đó mở `checkoutUrl`
                  và chuyển sang màn hình polling trạng thái.
                </p>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
