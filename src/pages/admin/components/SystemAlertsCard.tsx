import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

export interface SystemAlertItem {
  icon: string;
  color: string;
  title: string;
  note: string;
}

export function SystemAlertsCard({
  title = 'Cảnh báo cần xử lý',
  alerts,
  isLoading,
  isError,
  onRetry,
  className = '',
}: {
  title?: string;
  alerts: SystemAlertItem[];
  isLoading?: boolean;
  isError?: boolean;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <Card className={`bg-card border-border h-full overflow-hidden ${className}`.trim()}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg font-bold">
          <span className="material-symbols-outlined text-red-500">warning</span>
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 min-h-0 overflow-hidden">
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-[88px] rounded-xl" />
            ))}
          </div>
        ) : isError ? (
          <div className="h-full min-h-[220px] rounded-2xl border border-dashed border-border bg-muted/10 flex flex-col items-center justify-center text-center px-6">
            <span className="material-symbols-outlined text-4xl text-destructive">error</span>
            <p className="mt-3 font-semibold text-foreground">Không tải được cảnh báo hệ thống</p>
            <Button variant="outline" className="mt-4 gap-2" onClick={onRetry}>
              <span className="material-symbols-outlined text-sm">refresh</span>
              Thử lại
            </Button>
          </div>
        ) : alerts.length === 0 ? (
          <div className="h-full min-h-[220px] rounded-2xl border border-dashed border-border bg-muted/10 flex flex-col items-center justify-center text-center px-6">
            <span className="material-symbols-outlined text-4xl text-muted-foreground">
              done_all
            </span>
            <p className="mt-3 font-semibold text-foreground">Không có cảnh báo nổi bật</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Hệ thống hiện chưa ghi nhận chỉ số bất thường trong giai đoạn đang chọn.
            </p>
          </div>
        ) : (
          <div className="h-full max-h-[228px] overflow-y-auto pr-1 space-y-3 custom-scrollbar">
            {alerts.map((alert) => (
              <div key={alert.title} className="rounded-xl border border-border bg-muted/20 p-4">
                <div className="flex items-start gap-3 min-w-0">
                  <div
                    className={`size-10 rounded-xl flex items-center justify-center shrink-0 ${alert.color}`}
                  >
                    <span className="material-symbols-outlined text-lg">{alert.icon}</span>
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-foreground break-words line-clamp-2">
                      {alert.title}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1 break-words line-clamp-3">
                      {alert.note}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
