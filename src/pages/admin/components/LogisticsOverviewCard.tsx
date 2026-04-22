import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

export interface LogisticsMiniCard {
  label: string;
  value: string;
  note: string;
  icon: string;
  color: string;
}

export function LogisticsOverviewCard({
  cards,
  isLoading,
  isError,
  onRetry,
  className = '',
}: {
  cards: LogisticsMiniCard[];
  isLoading?: boolean;
  isError?: boolean;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <Card className={`bg-card border-border h-full ${className}`.trim()}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg font-bold">
          <span className="material-symbols-outlined text-violet-600">swap_horiz</span>
          Điều phối kho & phiên phân phát
        </CardTitle>
      </CardHeader>
      <CardContent className="min-h-[280px] h-full overflow-hidden">
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 2 }).map((_, index) => (
              <Skeleton key={index} className="h-[100px] rounded-xl" />
            ))}
          </div>
        ) : isError ? (
          <div className="h-full min-h-[220px] rounded-2xl border border-dashed border-border bg-muted/10 flex flex-col items-center justify-center text-center px-6">
            <span className="material-symbols-outlined text-4xl text-destructive">error</span>
            <p className="mt-3 font-semibold text-foreground">Không tải được dữ liệu điều phối</p>
            <Button variant="outline" className="mt-4 gap-2" onClick={onRetry}>
              <span className="material-symbols-outlined text-sm">refresh</span>
              Thử lại
            </Button>
          </div>
        ) : cards.length === 0 ? (
          <div className="h-full min-h-[220px] rounded-2xl border border-dashed border-border bg-muted/10 flex flex-col items-center justify-center text-center px-6">
            <span className="material-symbols-outlined text-4xl text-muted-foreground">
              local_shipping
            </span>
            <p className="mt-3 font-semibold text-foreground">Chưa có hoạt động điều phối</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Không có phiếu chuyển hàng hoặc phiên phân phát trong giai đoạn đang chọn.
            </p>
          </div>
        ) : (
          <div className="space-y-3 h-full max-h-[220px] overflow-y-auto pr-1 custom-scrollbar">
            {cards.map((card) => (
              <div key={card.label} className="rounded-xl border border-border bg-muted/20 p-4">
                <div className="flex items-start gap-3">
                  <div
                    className={`size-10 rounded-xl flex items-center justify-center shrink-0 ${card.color}`}
                  >
                    <span className="material-symbols-outlined text-lg">{card.icon}</span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm text-muted-foreground break-words">{card.label}</p>
                    <p className="mt-1 text-2xl font-black text-foreground">{card.value}</p>
                    <p className="mt-2 text-sm text-muted-foreground break-words">{card.note}</p>
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
