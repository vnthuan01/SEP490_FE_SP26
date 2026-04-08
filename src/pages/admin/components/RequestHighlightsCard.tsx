import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

export interface RequestHighlightItem {
  id: string;
  title: string;
  subtitle: string;
  priorityLabel: string;
  priorityClass: string;
  statusLabel: string;
  statusClass: string;
  reporter?: string;
}

export function RequestHighlightsCard({
  title = 'Yêu cầu cần chú ý',
  requests,
  isLoading,
  isError,
  onRetry,
  className = '',
}: {
  title?: string;
  requests: RequestHighlightItem[];
  isLoading?: boolean;
  isError?: boolean;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <Card className={`bg-card border-border h-full overflow-hidden ${className}`.trim()}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg font-bold">
          <span className="material-symbols-outlined text-amber-500">notifications_active</span>
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 min-h-0 overflow-hidden">
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-[110px] rounded-xl" />
            ))}
          </div>
        ) : isError ? (
          <div className="h-full min-h-[260px] rounded-2xl border border-dashed border-border bg-muted/10 flex flex-col items-center justify-center text-center px-6">
            <span className="material-symbols-outlined text-4xl text-destructive">error</span>
            <p className="mt-3 font-semibold text-foreground">Không tải được yêu cầu cần chú ý</p>
            <Button variant="outline" className="mt-4 gap-2" onClick={onRetry}>
              <span className="material-symbols-outlined text-sm">refresh</span>
              Thử lại
            </Button>
          </div>
        ) : requests.length === 0 ? (
          <div className="h-full min-h-[260px] rounded-2xl border border-dashed border-border bg-muted/10 flex flex-col items-center justify-center text-center px-6">
            <span className="material-symbols-outlined text-4xl text-muted-foreground">
              campaign
            </span>
            <p className="mt-3 font-semibold text-foreground">
              Không có yêu cầu ưu tiên trong giai đoạn này
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Hãy đổi bộ lọc thời gian hoặc chờ thêm dữ liệu mới.
            </p>
          </div>
        ) : (
          <div className="h-full max-h-[328px] overflow-y-auto pr-1 space-y-3 custom-scrollbar">
            {requests.map((request) => (
              <div key={request.id} className="rounded-xl border border-border bg-muted/20 p-4">
                <div className="flex items-start justify-between gap-3 min-w-0">
                  <div className="min-w-0">
                    <p className="font-semibold text-foreground break-words line-clamp-2">
                      {request.title}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1 break-words line-clamp-2">
                      {request.subtitle}
                    </p>
                  </div>
                  <span
                    className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold shrink-0 ${request.priorityClass}`}
                  >
                    {request.priorityLabel}
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <span
                    className={`rounded-full border px-2.5 py-1 text-[11px] font-medium ${request.statusClass}`}
                  >
                    {request.statusLabel}
                  </span>
                  {request.reporter ? (
                    <span className="rounded-full border border-border px-2.5 py-1 text-[11px] font-medium text-muted-foreground truncate max-w-[180px]">
                      {request.reporter}
                    </span>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
