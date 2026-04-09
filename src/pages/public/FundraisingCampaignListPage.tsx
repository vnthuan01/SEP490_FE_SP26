import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useCampaigns } from '@/hooks/useCampaigns';
import {
  CampaignStatus,
  CampaignType,
  getCampaignStatusLabel,
  getCampaignTypeLabel,
} from '@/enums/beEnums';

export default function FundraisingCampaignListPage() {
  const { campaigns, isLoading, isError, refetch } = useCampaigns({
    pageIndex: 1,
    pageSize: 20,
    type: CampaignType.Fundraising,
    status: CampaignStatus.Active,
  });

  return (
    <div className="min-h-screen bg-background py-10 px-4 text-foreground">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="space-y-2">
          <Badge variant="info" appearance="outline" size="sm" className="gap-1">
            <span className="material-symbols-outlined text-[14px]">campaign</span>
            Danh sách chiến dịch gây quỹ công khai
          </Badge>
          <h1 className="text-3xl font-black text-primary">Các chiến dịch đang mở quyên góp</h1>
          <p className="text-muted-foreground">
            Chọn chiến dịch fundraising đang active để xem public summary và tạo checkout PayOS.
          </p>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {Array.from({ length: 6 }).map((_, index) => (
              <Skeleton key={index} className="h-[260px] rounded-2xl" />
            ))}
          </div>
        ) : isError ? (
          <Card className="border-border">
            <CardContent className="p-8 text-center space-y-4">
              <span className="material-symbols-outlined text-5xl text-destructive">error</span>
              <h2 className="text-xl font-bold">Không tải được danh sách gây quỹ</h2>
              <Button variant="outline" onClick={() => refetch()}>
                Thử lại
              </Button>
            </CardContent>
          </Card>
        ) : campaigns.length === 0 ? (
          <Card className="border-border">
            <CardContent className="p-8 text-center space-y-4">
              <span className="material-symbols-outlined text-5xl text-muted-foreground">
                volunteer_activism
              </span>
              <h2 className="text-xl font-bold">Chưa có chiến dịch gây quỹ nào đang mở</h2>
              <p className="text-muted-foreground">
                Khi manager/admin kích hoạt campaign fundraising, chiến dịch sẽ xuất hiện tại đây.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {campaigns.map((campaign) => (
              <Card key={campaign.campaignId} className="border-border h-full overflow-hidden">
                <CardHeader className="pb-3">
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="info" appearance="outline" size="xs">
                      {getCampaignTypeLabel(campaign.type)}
                    </Badge>
                    <Badge variant="success" appearance="outline" size="xs">
                      {getCampaignStatusLabel(campaign.status)}
                    </Badge>
                  </div>
                  <CardTitle className="text-xl font-bold leading-7">{campaign.name}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground line-clamp-3">
                    {
                      'Chiến dịch gây quỹ cứu trợ đang mở nhận đóng góp từ cộng đồng và cho phép donor tạo checkout trực tuyến qua PayOS.'
                    }
                  </p>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="rounded-xl border border-border bg-muted/20 p-3">
                      <p className="text-xs uppercase font-semibold text-muted-foreground">
                        Thời gian
                      </p>
                      <p className="mt-1 font-medium text-foreground">
                        {new Date(campaign.startDate).toLocaleDateString('vi-VN')} -{' '}
                        {new Date(campaign.endDate).toLocaleDateString('vi-VN')}
                      </p>
                    </div>
                    <div className="rounded-xl border border-border bg-muted/20 p-3">
                      <p className="text-xs uppercase font-semibold text-muted-foreground">
                        Tiến độ
                      </p>
                      <p className="mt-1 font-medium text-foreground">
                        {typeof campaign.overallProgressPercent === 'number'
                          ? `${Math.round(campaign.overallProgressPercent)}%`
                          : 'Chưa cập nhật'}
                      </p>
                    </div>
                  </div>
                  <Button className="w-full" asChild>
                    <Link to={`/donate/${campaign.campaignId}`}>Ủng hộ chiến dịch</Link>
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
