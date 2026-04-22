import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { formatNumberVN } from '@/lib/utils';
import { TransactionReason } from '@/enums/beEnums';
import type { InventoryTransaction } from '@/services/inventoryService';
import type { SupplyTransfer } from '@/services/supplyTransferService';

type SelectedSupplyItem = {
  supplyItemId: string;
  supplyItemName: string;
  unit?: string;
} | null;

interface ImportHistoryBySupplyItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedSupplyItem: SelectedSupplyItem;
  transactions: InventoryTransaction[];
  relatedTransferByTransactionId?: Record<string, SupplyTransfer | undefined>;
  isLoading?: boolean;
}

export function ImportHistoryBySupplyItemDialog({
  open,
  onOpenChange,
  selectedSupplyItem,
  transactions,
  relatedTransferByTransactionId = {},
  isLoading = false,
}: ImportHistoryBySupplyItemDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-6xl max-h-[88vh] overflow-hidden p-0 flex flex-col">
        <DialogHeader className="px-6 py-4 border-b border-border">
          <DialogTitle>Lịch sử nhập kho theo vật phẩm</DialogTitle>
          <DialogDescription>
            {selectedSupplyItem
              ? `Theo dõi các lần nhập trực tiếp của ${selectedSupplyItem.supplyItemName}.`
              : 'Chọn một vật phẩm để xem lịch sử nhập kho.'}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Đang tải lịch sử nhập kho...</p>
          ) : transactions.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Chưa có bản ghi nhập kho nào cho vật phẩm này.
            </p>
          ) : (
            transactions.map((transaction) => {
              const relatedTransfer = relatedTransferByTransactionId[transaction.transactionId];
              const lyDoTiengViet =
                transaction.reason === TransactionReason.SupplyTransferIn
                  ? 'Nhập điều phối nội bộ'
                  : transaction.reasonName === 'Other'
                    ? 'Nhập kho trực tiếp'
                    : transaction.reasonName || 'Chưa xác định';
              const nguonThamChieu = transaction.sourceReference?.trim()
                ? transaction.sourceReference.trim()
                : transaction.reason === TransactionReason.SupplyTransferIn
                  ? relatedTransfer?.sourceStationName ||
                    relatedTransfer?.items?.find(
                      (transferItem) =>
                        transferItem.supplyItemId === selectedSupplyItem?.supplyItemId &&
                        transferItem.sourceReference,
                    )?.sourceReference ||
                    'Điều phối nội bộ từ kho nguồn'
                  : 'Nhập từ bên ngoài';

              return (
                <div
                  key={transaction.transactionId}
                  className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm"
                >
                  <div className="border-b border-border bg-muted/40 px-5 py-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-lg font-semibold text-foreground">
                          {transaction.transactionCode || transaction.transactionId}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {transaction.createdAt
                            ? new Date(transaction.createdAt).toLocaleString('vi-VN')
                            : 'Chưa có thời gian'}
                        </p>
                      </div>
                      <Badge variant="outline" appearance="outline">
                        {transaction.importBatchCode || 'Chưa có mã lô nhập'}
                      </Badge>
                    </div>
                  </div>

                  <div className="space-y-4 px-5 py-5">
                    <div className="grid gap-3 md:grid-cols-[3fr_1fr_1fr] text-sm">
                      <div className="rounded-xl border border-border bg-background p-3">
                        <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">
                          Người tạo
                        </p>
                        <p className="mt-1 font-medium text-foreground">
                          {transaction.createdByName || 'Chưa rõ'}
                        </p>
                      </div>
                      <div className="rounded-xl border border-border bg-background p-3 md:col-span-2">
                        <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">
                          Nguồn tham chiếu
                        </p>
                        <p className="mt-1 font-medium text-foreground break-words">
                          {nguonThamChieu}
                        </p>
                      </div>
                    </div>

                    <div className="grid gap-3 md:grid-cols-[3fr_1fr_1fr] text-sm">
                      <div className="rounded-xl border border-border bg-background p-3">
                        <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">
                          Trạm nhận hàng
                        </p>
                        <p className="mt-1 font-medium text-foreground break-words">
                          {transaction.reliefStationName || 'Chưa rõ trạm'}
                        </p>
                      </div>
                      <div className="rounded-xl border border-border bg-background p-3 md:col-span-2">
                        <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">
                          Lý do nhập
                        </p>
                        <p className="mt-1 font-medium text-foreground">{lyDoTiengViet}</p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      {(transaction.items || []).map((item, index) => {
                        const relatedTransferItem = relatedTransfer?.items?.find(
                          (transferItem) => transferItem.supplyItemId === item.supplyItemId,
                        );
                        const displayUnitCost = item.unitCost ?? relatedTransferItem?.unitCost;
                        const displayExpiryDate =
                          item.expiryDate ?? relatedTransferItem?.expiryDate;
                        const isInternalTransfer =
                          transaction.reason === TransactionReason.SupplyTransferIn;

                        return (
                          <div
                            key={`${transaction.transactionId}-${item.supplyItemId}-${index}`}
                            className="rounded-xl border border-border bg-muted/10 p-4"
                          >
                            <div className="flex flex-wrap items-start justify-between gap-2">
                              <p className="font-medium text-foreground">
                                {item.supplyItemName || item.supplyItemId}
                              </p>
                              <p className="text-sm font-medium text-foreground">
                                {formatNumberVN(item.quantity)}{' '}
                                {item.supplyItemUnit || selectedSupplyItem?.unit || ''}
                              </p>
                            </div>

                            <div
                              className={`mt-3 grid gap-3 text-sm text-muted-foreground ${
                                isInternalTransfer ? 'md:grid-cols-1' : 'md:grid-cols-3'
                              }`}
                            >
                              {!isInternalTransfer && (
                                <>
                                  <p>
                                    Đơn giá:{' '}
                                    <span className="font-medium text-foreground">
                                      {displayUnitCost != null
                                        ? `${formatNumberVN(displayUnitCost)} VNĐ`
                                        : 'Chưa có'}
                                    </span>
                                  </p>
                                  <p>
                                    Hạn sử dụng:{' '}
                                    <span className="font-medium text-foreground">
                                      {displayExpiryDate
                                        ? new Date(displayExpiryDate).toLocaleDateString('vi-VN')
                                        : 'Chưa có'}
                                    </span>
                                  </p>
                                </>
                              )}
                              <p>
                                Ghi chú:{' '}
                                <span className="font-medium text-foreground">
                                  {item.notes || transaction.notes || 'Không có'}
                                </span>
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
