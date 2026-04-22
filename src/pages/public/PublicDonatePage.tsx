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
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

const QUICK_AMOUNTS = [50000, 100000, 200000, 500000, 1000000, 2000000];

export default function PublicDonatePage() {
  const { campaignId = '' } = useParams();
  const navigate = useNavigate();
  const { summary, isLoading, isError, refetch } = useCampaignSummary(campaignId);
  const { mutateAsync: createCheckout, status: createCheckoutStatus } = useCreateDonationCheckout();

  const [donorName, setDonorName] = useState('');
  const [amount, setAmount] = useState<number>(200000);
  const [message, setMessage] = useState('');
  const [isFocusedAmount, setIsFocusedAmount] = useState(false);

  const moneyGoal = useMemo(
    () => summary?.goals?.find((goal) => Number(goal.resourceType) === CampaignResourceType.Money),
    [summary],
  );

  const handleDonate = async () => {
    if (!campaignId) return;

    const encodedCampaignId = encodeURIComponent(campaignId);
    const baseUrl = window.location.origin;

    const response = await createCheckout({
      campaignId,
      amount,
      donorName: donorName.trim() || 'Nhà hảo tâm',
      message: message.trim() || undefined,
      returnUrl: `${baseUrl}/donate/return?campaignId=${encodedCampaignId}`,
      cancelUrl: `${baseUrl}/donate/cancel?campaignId=${encodedCampaignId}`,
    });

    if (response.checkoutUrl) {
      window.open(response.checkoutUrl, '_blank', 'noopener,noreferrer');
      navigate(`/donate/status/${response.donationId}?campaignId=${campaignId}`);
    }
  };

  const progressPercent = Math.max(0, Math.min(Number(moneyGoal?.progressPercent || 0), 100));

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-background text-foreground pb-20 pt-10 px-4">
      <div className="mx-auto max-w-5xl space-y-8">
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <Badge
            variant="info"
            appearance="default"
            size="sm"
            className="bg-primary/10 text-primary border-0 rounded-full px-4 py-1.5 inline-flex gap-1"
          >
            <span className="material-symbols-outlined text-[16px]">favorite</span>
            Cùng Nhau Lan Tỏa Yêu Thương
          </Badge>
          <h1 className="text-3xl md:text-5xl font-black text-slate-900 dark:text-white leading-tight">
            Chung tay đóng góp, tiếp thêm sức mạnh
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-lg">
            Sự hỗ trợ của bạn chính là nguồn động lực to lớn giúp chiến dịch sớm hoàn thành mục tiêu
            và đến được với những mảnh đời đang cần giúp đỡ.
          </p>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-8 mt-10">
            <Skeleton className="h-[460px] rounded-3xl" />
            <Skeleton className="h-[540px] rounded-3xl" />
          </div>
        ) : isError || !summary ? (
          <Card className="border-0 shadow-xl rounded-3xl overflow-hidden mt-10">
            <CardContent className="p-12 text-center space-y-6">
              <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/20">
                <span className="material-symbols-outlined text-5xl text-red-600 dark:text-red-400">
                  error
                </span>
              </div>
              <h2 className="text-2xl font-bold">Không tìm thấy chiến dịch</h2>
              <p className="text-slate-500 max-w-md mx-auto">
                Chiến dịch này có thể đã kết thúc hoặc đường dẫn không chính xác. Mong bạn thông cảm
                và thử lại.
              </p>
              <Button
                variant="outline"
                onClick={() => refetch()}
                className="rounded-full px-8 h-12"
              >
                Tải lại trang
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-8 mt-8 items-start">
            {/* Cột Trái: Thông tin chiến dịch */}
            <div className="space-y-6">
              <Card className="border-0 shadow-lg rounded-3xl overflow-hidden bg-white dark:bg-card">
                <div className="h-4 bg-gradient-to-r from-primary to-emerald-400"></div>
                <CardHeader className="pt-8 pb-4">
                  <Badge
                    variant="outline"
                    appearance="outline"
                    size="sm"
                    className="w-fit mb-3 rounded-full uppercase tracking-wider text-xs border-primary/20 text-primary"
                  >
                    Chiến dịch gây quỹ
                  </Badge>
                  <CardTitle className="text-2xl md:text-3xl font-black leading-tight">
                    {summary.name}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-8">
                  <p className="text-slate-600 dark:text-slate-300 leading-relaxed text-lg">
                    {summary.description ||
                      'Hãy chung tay quyên góp để đem đến một tương lai tươi sáng hơn. Mỗi tấm lòng là một sự cứu rỗi đối với những người đang cần giúp đỡ.'}
                  </p>

                  <div className="bg-slate-50 dark:bg-slate-900/50 rounded-2xl p-6 border border-slate-100 dark:border-slate-800 space-y-6">
                    <div className="flex items-end justify-between">
                      <div>
                        <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-2">
                          Đã huy động được
                        </p>
                        <p className="text-4xl font-black text-emerald-600 dark:text-emerald-500">
                          {formatNumberVN(moneyGoal?.receivedAmount || 0)}{' '}
                          <span className="text-2xl text-emerald-600/70">VNĐ</span>
                        </p>
                      </div>
                      <div className="text-right">
                        <Badge
                          variant="success"
                          size="lg"
                          className="rounded-full font-bold text-base px-4 py-1.5"
                        >
                          {progressPercent}%
                        </Badge>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <Progress
                        value={progressPercent}
                        className="h-3.5 bg-slate-200 dark:bg-slate-800"
                        indicatorClassName={
                          progressPercent >= 100
                            ? 'bg-emerald-500'
                            : 'bg-gradient-to-r from-primary to-emerald-400'
                        }
                      />
                      <div className="flex justify-between text-sm font-medium text-slate-500">
                        <span>0 VNĐ</span>
                        <span>Mục tiêu: {formatNumberVN(moneyGoal?.targetAmount || 0)} VNĐ</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center gap-3 p-4 rounded-2xl bg-sky-50 dark:bg-sky-950/20 text-sky-700 dark:text-sky-400">
                      <span className="material-symbols-outlined text-2xl">verified_user</span>
                      <p className="text-sm font-semibold leading-tight">
                        Minh bạch
                        <br />
                        tuyệt đối
                      </p>
                    </div>
                    <div className="flex items-center gap-3 p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400">
                      <span className="material-symbols-outlined text-2xl">shield_locked</span>
                      <p className="text-sm font-semibold leading-tight">
                        Thanh toán
                        <br />
                        an toàn
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Cột Phải: Form Quyên Góp */}
            <div className="lg:sticky lg:top-8">
              <Card className="border-0 shadow-2xl shadow-primary/10 rounded-3xl overflow-hidden bg-white dark:bg-card">
                <CardHeader className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800 pb-5">
                  <CardTitle className="text-xl font-bold flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary">
                      volunteer_activism
                    </span>
                    Biểu mẫu ủng hộ
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6 pt-6 px-6 sm:px-8 pb-8">
                  <div className="space-y-3">
                    <label className="text-sm font-bold text-slate-700 dark:text-slate-300">
                      Nhập số tiền muốn ủng hộ (VNĐ)
                    </label>
                    <div
                      className={cn(
                        'relative rounded-2xl border-2 transition-all duration-200 overflow-hidden',
                        isFocusedAmount
                          ? 'border-primary shadow-sm'
                          : 'border-slate-200 dark:border-slate-700',
                      )}
                    >
                      <Input
                        type="number"
                        min={1000}
                        max={1000000000}
                        value={amount || ''}
                        onChange={(event) => setAmount(Number(event.target.value) || 0)}
                        onFocus={() => setIsFocusedAmount(true)}
                        onBlur={() => setIsFocusedAmount(false)}
                        className="h-16 text-2xl md:text-3xl font-black text-center text-primary border-0 focus-visible:ring-0 rounded-none bg-transparent"
                        placeholder="VD: 500000"
                      />
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold select-none">
                        VNĐ
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 mt-4">
                      {QUICK_AMOUNTS.map((quickAmount) => (
                        <button
                          key={quickAmount}
                          type="button"
                          onClick={() => setAmount(quickAmount)}
                          className={cn(
                            'h-11 rounded-xl text-sm font-semibold transition-all duration-200',
                            amount === quickAmount
                              ? 'bg-primary text-white shadow-md'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700',
                          )}
                        >
                          {formatNumberVN(quickAmount)}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3 pt-2">
                    <label className="text-sm font-bold text-slate-700 dark:text-slate-300">
                      Tên người ủng hộ (Tùy chọn)
                    </label>
                    <Input
                      value={donorName}
                      onChange={(event) => setDonorName(event.target.value)}
                      placeholder="Nhà hảo tâm ẩn danh"
                      className="h-12 rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 focus-visible:ring-primary/20"
                    />
                  </div>

                  <div className="space-y-3">
                    <label className="text-sm font-bold text-slate-700 dark:text-slate-300">
                      Lời nhắn tới chiến dịch (Tùy chọn)
                    </label>
                    <Textarea
                      rows={3}
                      value={message}
                      onChange={(event) => setMessage(event.target.value)}
                      placeholder="Gửi gắm lời chúc tốt đẹp nhất của bạn..."
                      className="rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 focus-visible:ring-primary/20 resize-none"
                    />
                  </div>

                  <div className="pt-4">
                    <Button
                      size="lg"
                      className="w-full h-14 rounded-2xl text-lg font-bold shadow-lg shadow-primary/30 hover:shadow-primary/40 hover:-translate-y-0.5 transition-all"
                      onClick={() => void handleDonate()}
                      disabled={!campaignId || amount < 1000 || createCheckoutStatus === 'pending'}
                    >
                      {createCheckoutStatus === 'pending' ? (
                        <span className="flex items-center gap-2">
                          <span className="material-symbols-outlined animate-spin">
                            progress_activity
                          </span>
                          Đang kết nối...
                        </span>
                      ) : (
                        <span className="flex items-center gap-2">
                          <span className="material-symbols-outlined">payments</span>
                          QUYÊN GÓP {formatNumberVN(amount)} đ
                        </span>
                      )}
                    </Button>
                    <p className="text-xs text-center text-slate-500 mt-4 px-4 leading-relaxed">
                      Bằng việc tiếp tục, giao dịch của bạn sẽ được chuyển đến Cổng thanh toán quét
                      mã QR tự động bằng chuẩn chuyển tiền ngân hàng quốc gia (VietQR).
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
