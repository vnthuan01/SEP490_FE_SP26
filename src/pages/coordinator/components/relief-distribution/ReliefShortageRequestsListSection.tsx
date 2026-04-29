import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { SupplyShortageRequestResponse } from '@/services/reliefDistributionService';

export function ReliefShortageRequestsListSection({
  shortageRequests,
  onOpenReview,
}: {
  shortageRequests: SupplyShortageRequestResponse[];
  onOpenReview: () => void;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm mt-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Yêu cầu thiếu hàng</h3>
          <p className="text-sm text-muted-foreground">Các yêu cầu bổ sung hàng hóa từ đội phát</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant={shortageRequests.length > 0 ? 'warning' : 'success'}>
            {shortageRequests.length} chờ duyệt
          </Badge>
          {shortageRequests.length > 0 && (
            <Button size="sm" onClick={onOpenReview}>
              Mở thiết lập duyệt
            </Button>
          )}
        </div>
      </div>
      {shortageRequests.length === 0 ? (
        <p className="text-sm text-muted-foreground">Không có yêu cầu nào.</p>
      ) : (
        <div className="space-y-3">
          {shortageRequests.map((request) => (
            <div
              key={request.supplyShortageRequestId}
              className="rounded-xl border bg-muted/20 p-4"
            >
              <div className="flex justify-between items-start mb-2">
                <div>
                  <p className="font-medium">
                    {request.distributionPointName || 'Không có điểm'} ·{' '}
                    {request.campaignTeamName || 'Không có team'}
                  </p>
                  <p className="text-sm text-muted-foreground">{request.requestedByUserName}</p>
                </div>
                <Badge variant="warning">Chờ duyệt</Badge>
              </div>
              <div className="text-sm text-muted-foreground">
                Vật phẩm:{' '}
                {request.items
                  .map((i) => `${i.supplyItemName} (${i.quantityRequested})`)
                  .join(', ')}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
