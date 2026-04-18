import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export function CoordinatorReliefDistributionPageHeader({
  selectedCampaignId,
  onCampaignChange,
  campaigns,
  stationName,
  locationName,
}: {
  selectedCampaignId: string;
  onCampaignChange: (value: string) => void;
  campaigns: Array<{ campaignId: string; name: string }>;
  stationName?: string;
  locationName?: string;
}) {
  return (
    <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
      <div className="min-w-0 space-y-2">
        <p className="text-sm font-medium uppercase tracking-[0.24em] text-primary/70">
          Điều phối cứu trợ
        </p>
        <h1 className="text-3xl font-black tracking-tight text-primary md:text-4xl">
          Thiết lập phân phối cứu trợ
        </h1>
        <p className="max-w-3xl text-sm text-muted-foreground md:text-base">
          Tạo điểm phát, tạo gói hỗ trợ từ vật phẩm trong kho, rà soát danh sách gói, gán hộ dân và
          kiểm tra checklist trước khi triển khai.
        </p>
        {(locationName || stationName) && (
          <div className="flex flex-wrap gap-2 pt-1 text-sm">
            {locationName && (
              <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-foreground">
                <span className="material-symbols-outlined text-base text-primary">
                  location_on
                </span>
                <span>{locationName}</span>
              </div>
            )}
            {stationName && (
              <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-foreground">
                <span className="material-symbols-outlined text-base text-primary">warehouse</span>
                <span>{stationName}</span>
              </div>
            )}
          </div>
        )}
      </div>

      <Card className="w-full max-w-xl min-w-0 shadow-sm">
        <CardContent className="p-4">
          <div className="space-y-2 min-w-0">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Chiến dịch cứu trợ
            </p>
            <Select value={selectedCampaignId} onValueChange={onCampaignChange}>
              <SelectTrigger className="min-w-0">
                <SelectValue placeholder="Chọn chiến dịch" />
              </SelectTrigger>
              <SelectContent>
                {campaigns.map((campaign) => (
                  <SelectItem key={campaign.campaignId} value={campaign.campaignId}>
                    {campaign.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
