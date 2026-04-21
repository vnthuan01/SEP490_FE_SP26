import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useCampaigns } from '@/hooks/useCampaigns';
import { CampaignStatus, CampaignType, getCampaignTypeLabel } from '@/enums/beEnums';
import { Progress } from '@/components/ui/progress';

export default function FundraisingCampaignListPage() {
  const { campaigns, isLoading, isError, refetch } = useCampaigns({
    pageIndex: 1,
    pageSize: 20,
    type: CampaignType.Fundraising,
    status: CampaignStatus.Active,
  });

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-background text-foreground">
      {/* Premium Hero Section */}
      <div className="relative overflow-hidden bg-primary/5 py-16 sm:py-24">
        <div className="absolute inset-0 bg-grid-slate-100 dark:bg-grid-slate-900/[0.04] bg-[bottom_1px_center] [mask-image:linear-gradient(to_bottom,transparent,black)]"></div>
        <div className="relative mx-auto max-w-7xl px-4 text-center">
          <Badge
            variant="info"
            appearance="outline"
            size="sm"
            className="mb-4 inline-flex gap-1 border-primary/20 bg-primary/10 text-primary"
          >
            <span className="material-symbols-outlined text-[14px]">volunteer_activism</span>
            Chung Tay Vì Cộng Đồng
          </Badge>
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-5xl lg:text-6xl">
            Sẻ chia yêu thương, <span className="text-primary">lan toả hy vọng</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-slate-600 dark:text-slate-300">
            Mỗi đóng góp của bạn, dù nhỏ nhất, cũng là ngọn lửa ấm áp sưởi ấm những hoàn cảnh khó
            khăn. Hãy cùng chúng tôi dang rộng vòng tay nhân ái để không ai bị bỏ lại phía sau.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-12">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Chiến dịch đang kêu gọi
          </h2>
          {!isLoading && !isError && campaigns.length > 0 && (
            <p className="text-sm font-medium text-muted-foreground">
              Đang có {campaigns.length} chiến dịch
            </p>
          )}
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, index) => (
              <Skeleton key={index} className="h-[360px] rounded-3xl" />
            ))}
          </div>
        ) : isError ? (
          <Card className="border-0 shadow-lg rounded-3xl overflow-hidden bg-white/50 backdrop-blur-md dark:bg-slate-900/50">
            <CardContent className="p-12 text-center space-y-4">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/20">
                <span className="material-symbols-outlined text-4xl text-red-600 dark:text-red-400">
                  error
                </span>
              </div>
              <h2 className="text-xl font-bold">Lỗi kết nối máy chủ</h2>
              <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                Rất tiếc, chúng tôi không thể lấy được danh sách chiến dịch lúc này. Vui lòng thử
                lại sau.
              </p>
              <Button
                variant="outline"
                onClick={() => refetch()}
                className="mt-4 rounded-full px-8"
              >
                Tải lại trang
              </Button>
            </CardContent>
          </Card>
        ) : campaigns.length === 0 ? (
          <Card className="border-0 shadow-lg rounded-3xl overflow-hidden bg-white/50 backdrop-blur-md dark:bg-slate-900/50">
            <CardContent className="p-12 text-center space-y-4">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
                <span className="material-symbols-outlined text-4xl text-slate-500">
                  volunteer_activism
                </span>
              </div>
              <h2 className="text-xl font-bold">Chưa có chiến dịch nào</h2>
              <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                Hiện tại không có chiến dịch gây quỹ nào đang mở. Nền tảng sẽ sớm cập nhật các hoạt
                động mới nhất, rất mong bạn quay lại ủng hộ!
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
            {campaigns.map((campaign) => (
              <Card
                key={campaign.campaignId}
                className="group relative flex flex-col justify-between border-0 shadow-sm hover:shadow-xl rounded-3xl overflow-hidden bg-white dark:bg-card transition-all duration-300 hover:-translate-y-1"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

                <CardHeader className="pb-4 relative z-10">
                  <div className="flex flex-wrap gap-2 mb-3">
                    <Badge
                      variant="info"
                      appearance="default"
                      size="xs"
                      className="rounded-full px-3 bg-sky-500/10 text-sky-600 hover:bg-sky-500/20 border-0"
                    >
                      {getCampaignTypeLabel(campaign.type)}
                    </Badge>
                    <Badge
                      variant="success"
                      appearance="default"
                      size="xs"
                      className="rounded-full px-3 bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 border-0"
                    >
                      Đang nhận quyên góp
                    </Badge>
                  </div>
                  <CardTitle className="text-xl font-bold leading-tight group-hover:text-primary transition-colors duration-200">
                    <Link to={`/donate/${campaign.campaignId}`} className="focus:outline-none">
                      <span className="absolute inset-0" aria-hidden="true" />
                      {campaign.name}
                    </Link>
                  </CardTitle>
                </CardHeader>

                <CardContent className="space-y-6 relative z-10">
                  <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2">
                    {(campaign as any).description ||
                      'Chiến dịch đang cần sự chung tay giúp đỡ từ cộng đồng nhà hảo tâm để mang lại cuộc sống tốt đẹp hơn cho những hoàn cảnh khó khăn.'}
                  </p>

                  <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex justify-between items-end mb-2">
                      <div>
                        <p className="text-xs font-medium text-slate-500 uppercase tracking-widest mb-1">
                          Tiến độ quỹ
                        </p>
                        <p className="font-bold text-lg text-primary">
                          {typeof campaign.overallProgressPercent === 'number'
                            ? `${Math.round(campaign.overallProgressPercent)}%`
                            : '0%'}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-400">
                          <span className="material-symbols-outlined text-[14px]">schedule</span>
                          Đến {new Date(campaign.endDate).toLocaleDateString('vi-VN')}
                        </span>
                      </div>
                    </div>

                    <Progress
                      value={campaign.overallProgressPercent || 0}
                      className="h-2 bg-slate-100 dark:bg-slate-800"
                      indicatorClassName={
                        campaign.overallProgressPercent >= 100 ? 'bg-emerald-500' : 'bg-primary'
                      }
                    />
                  </div>

                  <Button
                    className="w-full rounded-full h-12 shadow-md shadow-primary/20 group-hover:shadow-lg transition-all text-white bg-primary hover:bg-primary/90"
                    asChild
                  >
                    <Link to={`/donate/${campaign.campaignId}`}>
                      <span className="material-symbols-outlined mr-2 text-lg">
                        volunteer_activism
                      </span>
                      Ủng hộ ngay
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
