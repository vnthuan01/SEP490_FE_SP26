import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type CampaignOption = { campaignId: string; name: string };

export function ManagerReliefDistributionPageHeader({
  selectedCampaignId,
  onCampaignChange,
  campaignsLoading,
  campaigns,
  stationName,
  locationName,
  campaignAddress,
}: {
  selectedCampaignId: string;
  onCampaignChange: (value: string) => void;
  campaignsLoading: boolean;
  campaigns: CampaignOption[];
  stationName?: string;
  locationName?: string;
  campaignAddress?: string;
}) {
  return (
    <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
      <div className="min-w-0 space-y-2">
        <p className="text-sm font-medium uppercase tracking-[0.24em] text-primary/70">
          Điều phối cứu trợ
        </p>
        <h1 className="text-3xl font-black tracking-tight text-primary md:text-4xl">
          Điều phối cứu trợ theo chiến dịch
        </h1>
        <p className="max-w-3xl text-sm text-muted-foreground md:text-base">
          Thiết lập điểm phát, gói cứu trợ, danh sách hộ dân mẫu và phương án phân phối.
        </p>
        {(locationName || stationName || campaignAddress) && (
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
            {campaignAddress && (
              <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-foreground">
                <span className="material-symbols-outlined text-base text-primary">pin_drop</span>
                <span className="max-w-[420px] truncate">{campaignAddress}</span>
              </div>
            )}
          </div>
        )}
      </div>

      <Card className="w-full max-w-xl min-w-0 shadow-sm">
        <CardContent className="p-4">
          <div className="space-y-2 min-w-0">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Chiến dịch đang thao tác
            </p>
            <Select value={selectedCampaignId} onValueChange={onCampaignChange}>
              <SelectTrigger className="min-w-0">
                <SelectValue
                  placeholder={
                    campaignsLoading ? 'Đang tải chiến dịch...' : 'Chọn chiến dịch cứu trợ'
                  }
                />
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
