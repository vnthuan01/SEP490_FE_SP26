import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

export interface RecentActivityItem {
  type: string;
  icon: string;
  color: string;
  title: string;
  subtitle: string;
  time?: string;
}

interface RecentActivityCardProps {
  title?: string;
  activities: RecentActivityItem[];
  isLoading?: boolean;
  isError?: boolean;
  onRetry?: () => void;
  formatDateTime: Function;
  className?: string;
}

export function RecentActivityCard({
  title = 'Hoạt động hệ thống gần đây',
  activities,
  isLoading,
  isError,
  onRetry,
  formatDateTime,
  className = '',
}: RecentActivityCardProps) {
  return (
    <Card className={`bg-card border-border h-full overflow-hidden ${className}`.trim()}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg font-bold">
          <span className="material-symbols-outlined text-emerald-600">history</span>
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 min-h-0 overflow-hidden">
        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, index) => (
              <Skeleton key={index} className="h-[68px] rounded-xl" />
            ))}
          </div>
        ) : isError ? (
          <div className="h-full min-h-[240px] rounded-2xl border border-dashed border-border bg-muted/10 flex flex-col items-center justify-center text-center px-6">
            <span className="material-symbols-outlined text-4xl text-destructive">error</span>
            <p className="mt-3 font-semibold text-foreground">Không tải được hoạt động hệ thống</p>
            <Button variant="outline" className="mt-4 gap-2" onClick={onRetry}>
              <span className="material-symbols-outlined text-sm">refresh</span>
              Thử lại
            </Button>
          </div>
        ) : activities.length === 0 ? (
          <div className="h-full min-h-[240px] rounded-2xl border border-dashed border-border bg-muted/10 flex flex-col items-center justify-center text-center px-6">
            <span className="material-symbols-outlined text-4xl text-muted-foreground">
              history_toggle_off
            </span>
            <p className="mt-3 font-semibold text-foreground">Chưa có hoạt động nào để tổng hợp</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Không có giao dịch, điều phối hay quyên góp trong giai đoạn đang chọn.
            </p>
          </div>
        ) : (
          <div className="h-full max-h-[278px] overflow-y-auto pr-1 space-y-4 custom-scrollbar">
            {activities.map((item, index) => (
              <div key={`${item.type}-${index}`} className="flex gap-3 min-w-0">
                <div
                  className={`size-10 rounded-xl flex items-center justify-center shrink-0 ${item.color}`}
                >
                  <span className="material-symbols-outlined text-lg">{item.icon}</span>
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-foreground break-words line-clamp-2">
                    {item.title}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1 break-words line-clamp-2">
                    {item.subtitle}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">{formatDateTime(item.time)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
