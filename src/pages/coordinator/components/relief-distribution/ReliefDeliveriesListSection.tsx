import { Badge } from '@/components/ui/badge';
import type { HouseholdDeliveryResponse } from '@/services/reliefDistributionService';

export function ReliefDeliveriesListSection({
  deliveries,
  onSelectDelivery,
  onOpenBatchComplete,
}: {
  deliveries: HouseholdDeliveryResponse[];
  onSelectDelivery: (deliveryId: string) => void;
  onOpenBatchComplete: () => void;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm mt-6">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Danh sách giao hàng</h3>
          <p className="text-sm text-muted-foreground">
            Theo dõi tiến độ giao hàng theo thứ tự thực tế
          </p>
        </div>
        <button
          type="button"
          className="rounded-lg border px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
          onClick={onOpenBatchComplete}
        >
          Hoàn tất theo lô
        </button>
      </div>
      {deliveries.length === 0 ? (
        <p className="text-sm text-muted-foreground">Chưa có giao hàng nào.</p>
      ) : (
        <div className="space-y-3">
          {deliveries.map((delivery) => (
            <button
              key={delivery.householdDeliveryId}
              type="button"
              onClick={() => onSelectDelivery(delivery.householdDeliveryId)}
              className="w-full rounded-xl border bg-muted/20 p-4 text-left transition-colors hover:bg-muted/35"
            >
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-medium">{delivery.householdCode}</p>
                  <p className="text-sm text-muted-foreground">
                    {delivery.campaignTeamName || 'Chưa rõ đội'} ·{' '}
                    {delivery.distributionPointName || 'Không có điểm'}
                  </p>
                </div>
                <Badge variant={delivery.status === 2 ? 'success' : 'warning'}>
                  {delivery.status === 2 ? 'Đã phát' : 'Chưa phát'}
                </Badge>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
