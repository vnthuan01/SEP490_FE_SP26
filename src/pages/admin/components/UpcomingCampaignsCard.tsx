import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useMemo, useState } from 'react';

export interface UpcomingCampaignItem {
  id: string;
  name: string;
  endDate: string;
  progress: string;
  statusClass: string;
  statusLabel: string;
}

export function UpcomingCampaignsCard({
  campaigns,
  isLoading,
  isError,
  onRetry,
  className = '',
}: {
  campaigns: UpcomingCampaignItem[];
  isLoading?: boolean;
  isError?: boolean;
  onRetry?: () => void;
  className?: string;
}) {
  const [page, setPage] = useState(1);
  const pageSize = 4;
  const totalPages = Math.max(1, Math.ceil(campaigns.length / pageSize));

  const visibleCampaigns = useMemo(
    () => campaigns.slice((page - 1) * pageSize, page * pageSize),
    [campaigns, page],
  );

  return (
    <Card className={`bg-card border-border h-full overflow-hidden ${className}`.trim()}>
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <CardTitle className="flex items-center gap-2 text-lg font-bold">
          <span className="material-symbols-outlined text-sky-600">event_upcoming</span>
          Chiến dịch sắp đến hạn
        </CardTitle>
        {campaigns.length > pageSize && !isLoading && !isError ? (
          <div className="flex items-center gap-2">
            <Button
              size="icon"
              variant="outline"
              className="size-8"
              disabled={page === 1}
              onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
            >
              <span className="material-symbols-outlined text-sm">chevron_left</span>
            </Button>
            <span className="text-xs text-muted-foreground">
              {page}/{totalPages}
            </span>
            <Button
              size="icon"
              variant="outline"
              className="size-8"
              disabled={page === totalPages}
              onClick={() => setPage((prev) => Math.min(prev + 1, totalPages))}
            >
              <span className="material-symbols-outlined text-sm">chevron_right</span>
            </Button>
          </div>
        ) : null}
      </CardHeader>
      <CardContent className="flex-1 min-h-0 overflow-hidden">
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-[96px] rounded-xl" />
            ))}
          </div>
        ) : isError ? (
          <div className="h-full min-h-[240px] rounded-2xl border border-dashed border-border bg-muted/10 flex flex-col items-center justify-center text-center px-6">
            <span className="material-symbols-outlined text-4xl text-destructive">error</span>
            <p className="mt-3 font-semibold text-foreground">
              Không tải được danh sách chiến dịch
            </p>
            <Button variant="outline" className="mt-4 gap-2" onClick={onRetry}>
              <span className="material-symbols-outlined text-sm">refresh</span>
              Thử lại
            </Button>
          </div>
        ) : visibleCampaigns.length === 0 ? (
          <div className="h-full min-h-[240px] rounded-2xl border border-dashed border-border bg-muted/10 flex flex-col items-center justify-center text-center px-6">
            <span className="material-symbols-outlined text-4xl text-muted-foreground">
              campaign
            </span>
            <p className="mt-3 font-semibold text-foreground">
              Không có chiến dịch trong giai đoạn này
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Hãy đổi bộ lọc thời gian hoặc chờ dữ liệu mới đồng bộ.
            </p>
          </div>
        ) : (
          <div className="space-y-3 h-full max-h-[240px] overflow-y-auto pr-1 custom-scrollbar">
            {visibleCampaigns.map((campaign) => (
              <div key={campaign.id} className="rounded-xl border border-border bg-muted/20 p-4">
                <div className="flex items-start justify-between gap-3 min-w-0">
                  <div className="min-w-0">
                    <p className="font-semibold text-foreground break-words line-clamp-2">
                      {campaign.name}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Kết thúc {campaign.endDate}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-1 text-[11px] font-semibold shrink-0 ${campaign.statusClass}`}
                  >
                    {campaign.statusLabel}
                  </span>
                </div>
                <div className="mt-3 flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Tiến độ tổng quan</span>
                  <span className="font-semibold text-foreground">{campaign.progress}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
