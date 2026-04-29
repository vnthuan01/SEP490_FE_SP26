import { Badge } from '@/components/ui/badge';
import type { TeamDeliveryWorklistItemResponse } from '@/services/reliefDistributionService';

export function CoordinatorTeamWorklistSection({
  items,
  badgeLabel,
  deliverySequenceById = {},
  householdDeliveryCountByCode = {},
}: {
  items: TeamDeliveryWorklistItemResponse[];
  badgeLabel?: string;
  deliverySequenceById?: Record<string, number>;
  householdDeliveryCountByCode?: Record<string, number>;
}) {
  const getSequenceClassName = (sequence: number) => {
    if (sequence === 1) return 'border-sky-200 bg-sky-50/70';
    if (sequence === 2) return 'border-amber-200 bg-amber-50/70';
    if (sequence === 3) return 'border-rose-200 bg-rose-50/70';
    return 'border-slate-200 bg-slate-50/70';
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-foreground">
            Danh sách hộ đang nằm trong worklist của các đội
          </h3>
          <p className="text-sm text-muted-foreground">
            Theo dõi toàn bộ hộ đã vào worklist để coordinator kiểm soát tiến độ điều phối ngoài
            hiện trường.
          </p>
        </div>
        {badgeLabel ? <Badge variant="outline">{badgeLabel}</Badge> : null}
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Chưa có worklist nào được trả về cho chiến dịch này.
        </p>
      ) : (
        <div className="space-y-3">
          {items.map((item, index) => {
            const previousCode = index > 0 ? items[index - 1].householdCode : null;
            const isNewGroup = previousCode !== item.householdCode;

            return (
              <div key={item.householdDeliveryId} className="space-y-2">
                {isNewGroup && (
                  <div className="rounded-xl border border-dashed border-primary/30 bg-primary/5 px-4 py-2 text-sm font-medium text-foreground">
                    Hộ {item.householdCode}
                  </div>
                )}
                <div
                  className={`rounded-xl border p-4 ${getSequenceClassName(deliverySequenceById[item.householdDeliveryId] || 1)}`}
                >
                  <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                    <div>
                      <p className="font-medium text-foreground">
                        {item.householdCode} · {item.headOfHouseholdName}
                      </p>
                      <div className="mt-1 flex flex-wrap gap-2">
                        <Badge variant="outline">
                          Lượt giao #{deliverySequenceById[item.householdDeliveryId] || 1}
                        </Badge>
                        {(householdDeliveryCountByCode[item.householdCode] || 0) > 1 && (
                          <Badge variant="outline">
                            {householdDeliveryCountByCode[item.householdCode]} gói / hộ
                          </Badge>
                        )}
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {item.campaignTeamName || 'Chưa rõ đội'}
                        {item.distributionPointName ? ` · Điểm: ${item.distributionPointName}` : ''}
                        {item.address ? ` · ${item.address}` : ''}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {item.requiresBoat ? 'Cần xuồng' : 'Không cần xuồng'}
                        {item.requiresLocalGuide ? ' · Cần dẫn đường' : ''}
                        {item.suggestedSupportMode ? ` · ${item.suggestedSupportMode}` : ''}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant={Number(item.status) === 2 ? 'success' : 'warning'}>
                        {Number(item.status) === 2 ? 'Đã hoàn tất' : 'Đang xử lý'}
                      </Badge>
                      <Badge variant="outline">{item.householdSize} người</Badge>
                      <Badge variant="outline">Minh chứng: {item.proofCount}</Badge>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
