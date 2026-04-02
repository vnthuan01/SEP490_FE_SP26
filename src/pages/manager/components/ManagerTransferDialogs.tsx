import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { RequiredMark } from './ManagerInventoryShared';
import {
  SupplyTransferStatus,
  TransactionReason,
  TransactionType,
  getSupplyCategoryLabel,
} from '@/enums/beEnums';
import { formatNumberInputVN, formatNumberVN, normalizeNumberInput } from '@/lib/utils';

export type TransferItemDraft = {
  id: string;
  supplyItemId: string;
  quantity: string;
  notes: string;
  iconUrl: string;
};

const getSupplyTransferStatusMeta = (status: number) => {
  switch (status) {
    case SupplyTransferStatus.Pending:
      return {
        label: 'Chờ duyệt',
        icon: 'schedule',
        className: 'border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-300',
      };
    case SupplyTransferStatus.Approved:
      return {
        label: 'Đã duyệt',
        icon: 'task_alt',
        className: 'border-sky-500/20 bg-sky-500/10 text-sky-600 dark:text-sky-300',
      };
    case SupplyTransferStatus.Shipping:
      return {
        label: 'Đang giao',
        icon: 'local_shipping',
        className: 'border-indigo-500/20 bg-indigo-500/10 text-indigo-600 dark:text-indigo-300',
      };
    case SupplyTransferStatus.Received:
      return {
        label: 'Đã nhận',
        icon: 'inventory',
        className: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300',
      };
    case SupplyTransferStatus.Cancelled:
      return {
        label: 'Đã hủy',
        icon: 'cancel',
        className: 'border-red-500/20 bg-red-500/10 text-red-600 dark:text-red-300',
      };
    default:
      return {
        label: 'Không rõ',
        icon: 'help',
        className: 'border-border bg-muted text-muted-foreground',
      };
  }
};

const getTransactionMeta = (type: number, reason: number) => {
  if (type === TransactionType.Import && reason === TransactionReason.SupplyTransferIn) {
    return {
      label: 'Nhập từ chuyển kho',
      icon: 'south',
      className: 'text-emerald-600 dark:text-emerald-300',
    };
  }
  if (type === TransactionType.Export && reason === TransactionReason.SupplyTransferOut) {
    return {
      label: 'Xuất để chuyển kho',
      icon: 'north',
      className: 'text-amber-600 dark:text-amber-300',
    };
  }
  if (type === TransactionType.Export && reason === TransactionReason.CampaignAllocation) {
    return { label: 'Xuất cho chiến dịch', icon: 'outbound', className: 'text-primary' };
  }
  if (type === TransactionType.Import) {
    return {
      label: 'Nhập kho',
      icon: 'download',
      className: 'text-emerald-600 dark:text-emerald-300',
    };
  }
  return { label: 'Xuất kho', icon: 'upload', className: 'text-amber-600 dark:text-amber-300' };
};

export function ManagerCreateTransferDialog({
  open,
  onOpenChange,
  sourceInventoryName,
  destinationStations,
  supplyItems,
  sourceStocks,
  transferForm,
  onFormChange,
  onItemChange,
  onAddItem,
  onRemoveItem,
  onSubmit,
  isPending,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sourceInventoryName: string;
  destinationStations: Array<{ id: string; name: string }>;
  supplyItems: Array<{ id: string; name: string; category: number; unit: string; iconUrl: string }>;
  sourceStocks: Array<{ supplyItemId: string; currentQuantity: number }>;
  transferForm: {
    destinationStationId: string;
    reason: string;
    notes: string;
    items: TransferItemDraft[];
  };
  onFormChange: (key: 'destinationStationId' | 'reason' | 'notes', value: string) => void;
  onItemChange: (id: string, key: 'supplyItemId' | 'quantity' | 'notes', value: string) => void;
  onAddItem: () => void;
  onRemoveItem: (id: string) => void;
  onSubmit: () => void;
  isPending: boolean;
}) {
  const stockMap = new Map(
    sourceStocks.map((stock) => [stock.supplyItemId, stock.currentQuantity]),
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!max-w-none w-[94vw] max-w-5xl h-[88vh] overflow-hidden p-0 flex flex-col">
        <DialogHeader className="px-6 py-4 border-b border-border">
          <DialogTitle>Tạo phiếu chuyển kho</DialogTitle>
          <DialogDescription>
            Lập phiếu chuyển hàng từ {sourceInventoryName || 'kho nguồn'} sang trạm/kho đích. Sau
            khi tạo thành công sẽ chuyển sang bước tạo PDF và ký xác nhận.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto p-6 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>
                Trạm đích <RequiredMark />
              </Label>
              <Select
                value={transferForm.destinationStationId}
                onValueChange={(value) => onFormChange('destinationStationId', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Chọn trạm nhận hàng" />
                </SelectTrigger>
                <SelectContent>
                  {destinationStations.map((station) => (
                    <SelectItem key={station.id} value={station.id}>
                      {station.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label>
                Lý do chuyển kho <RequiredMark />
              </Label>
              <Input
                value={transferForm.reason}
                onChange={(e) => onFormChange('reason', e.target.value)}
                placeholder="Ví dụ: Điều phối hỗ trợ trạm tiếp nhận"
              />
            </div>

            <div className="grid gap-2">
              <Label>Ghi chú</Label>
              <Textarea
                value={transferForm.notes}
                onChange={(e) => onFormChange('notes', e.target.value)}
                placeholder="Thông tin bàn giao, người phụ trách, biên bản..."
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-foreground">Danh sách vật phẩm chuyển kho</h3>
                <p className="text-sm text-muted-foreground">
                  Mỗi dòng là một vật phẩm riêng với số lượng độc lập.
                </p>
              </div>
              <Button variant="warning" className="gap-2" onClick={onAddItem}>
                <span className="material-symbols-outlined text-lg">add</span>
                Thêm vật phẩm
              </Button>
            </div>

            {transferForm.items.map((item, index) => {
              const selectedSupply = supplyItems.find((supply) => supply.id === item.supplyItemId);
              const currentStock = stockMap.get(item.supplyItemId) || 0;

              return (
                <Card key={item.id} className="border-border bg-card">
                  <CardContent className="p-5 space-y-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold text-foreground">Dòng chuyển #{index + 1}</p>
                        <p className="text-xs text-muted-foreground">
                          Chọn vật phẩm và số lượng cần chuyển.
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive"
                        disabled={transferForm.items.length === 1}
                        onClick={() => onRemoveItem(item.id)}
                      >
                        <span className="material-symbols-outlined text-lg">delete</span>
                      </Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-[1fr_180px] gap-4">
                      <div className="grid gap-2">
                        <Label>
                          Vật phẩm <RequiredMark />
                        </Label>
                        <Select
                          value={item.supplyItemId}
                          onValueChange={(value) => onItemChange(item.id, 'supplyItemId', value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Chọn vật phẩm" />
                          </SelectTrigger>
                          <SelectContent>
                            {supplyItems.map((supplyItem) => (
                              <SelectItem key={supplyItem.id} value={supplyItem.id}>
                                <div className="flex items-center justify-between gap-3 min-w-0">
                                  {supplyItem.iconUrl && (
                                    <span className="material-symbols-outlined text-[18px] text-green-500">
                                      {supplyItem.iconUrl}
                                    </span>
                                  )}
                                  <span className="truncate">
                                    {supplyItem.name} -{' '}
                                    {getSupplyCategoryLabel(supplyItem.category)}
                                  </span>
                                  <span className="text-xs text-muted-foreground shrink-0">
                                    Tồn: {formatNumberVN(stockMap.get(supplyItem.id) || 0)}
                                  </span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="grid gap-2">
                        <Label>
                          Số lượng <RequiredMark />
                        </Label>
                        <Input
                          inputMode="numeric"
                          value={formatNumberInputVN(item.quantity)}
                          onChange={(e) =>
                            onItemChange(item.id, 'quantity', normalizeNumberInput(e.target.value))
                          }
                        />
                      </div>
                    </div>

                    <div className="grid gap-2">
                      <Label>Ghi chú vật phẩm</Label>
                      <Textarea
                        value={item.notes}
                        onChange={(e) => onItemChange(item.id, 'notes', e.target.value)}
                        placeholder="Ghi chú riêng cho dòng vật phẩm này"
                      />
                    </div>

                    {selectedSupply && (
                      <div className="rounded-xl border border-border bg-muted/20 p-3 text-sm text-muted-foreground">
                        <p className="font-medium text-foreground">{selectedSupply.name}</p>
                        <p>Đơn vị: {selectedSupply.unit}</p>
                        <p>
                          Tồn kho nguồn hiện có:{' '}
                          <span className="font-semibold text-foreground">
                            {formatNumberVN(currentStock)}
                          </span>
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        <DialogFooter className="px-6 py-4 border-t border-border bg-background shrink-0">
          <Button variant="destructive" onClick={() => onOpenChange(false)}>
            <span className="material-symbols-outlined text-lg">close</span>
            Hủy
          </Button>
          <Button variant="primary" onClick={onSubmit} disabled={isPending}>
            <span className="material-symbols-outlined text-lg">add</span>
            {isPending ? 'Đang tạo...' : 'Tạo phiếu chuyển kho'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function ManagerTransferHistoryDialog({
  open,
  onOpenChange,
  transfers,
  isLoading,
  onApprove,
  onShip,
  onReceive,
  onCancel,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transfers: Array<{
    id: string;
    sourceStationId: string;
    destinationStationId: string;
    status: number;
    notes?: string;
    createdAt?: string;
    items?: Array<{ supplyItemId: string; quantity: number }>;
  }>;
  isLoading: boolean;
  onApprove: (id: string) => void;
  onShip: (id: string) => void;
  onReceive: (id: string) => void;
  onCancel: (id: string) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!max-w-none w-[94vw] max-w-6xl h-[88vh] overflow-hidden p-0 flex flex-col">
        <DialogHeader className="px-6 py-4 border-b border-border">
          <DialogTitle>Lịch sử chuyển kho</DialogTitle>
          <DialogDescription>
            Theo dõi trạng thái duyệt, giao, nhận và hồ sơ liên quan đến từng phiếu chuyển kho.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto p-6">
          {isLoading ? (
            <div className="py-16 text-center text-muted-foreground">
              Đang tải lịch sử chuyển kho...
            </div>
          ) : transfers.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground">
              Chưa có phiếu chuyển kho nào.
            </div>
          ) : (
            <div className="space-y-4">
              {transfers.map((transfer) => {
                const meta = getSupplyTransferStatusMeta(transfer.status);
                return (
                  <Card key={transfer.id} className="border-border bg-card">
                    <CardContent className="p-5 space-y-4">
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-foreground">
                              Mã phiếu: {transfer.id.slice(0, 8)}...
                            </p>
                            <Badge
                              variant="outline"
                              appearance="outline"
                              size="sm"
                              className={`gap-1.5 border ${meta.className}`}
                            >
                              <span className="material-symbols-outlined text-[15px]">
                                {meta.icon}
                              </span>
                              {meta.label}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Kho/trạm nguồn: {transfer.sourceStationId} → đích:{' '}
                            {transfer.destinationStationId}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Thời gian tạo:{' '}
                            {transfer.createdAt
                              ? new Date(transfer.createdAt).toLocaleString('vi-VN')
                              : 'Chưa có dữ liệu'}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Ghi chú: {transfer.notes || 'Không có ghi chú'}
                          </p>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          {transfer.status === SupplyTransferStatus.Pending && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => onApprove(transfer.id)}
                            >
                              Duyệt
                            </Button>
                          )}
                          {transfer.status === SupplyTransferStatus.Approved && (
                            <Button size="sm" variant="outline" onClick={() => onShip(transfer.id)}>
                              Đánh dấu đang giao
                            </Button>
                          )}
                          {transfer.status === SupplyTransferStatus.Shipping && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => onReceive(transfer.id)}
                            >
                              Xác nhận đã nhận
                            </Button>
                          )}
                          {transfer.status !== SupplyTransferStatus.Received &&
                            transfer.status !== SupplyTransferStatus.Cancelled && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-destructive"
                                onClick={() => onCancel(transfer.id)}
                              >
                                <span className="material-symbols-outlined text-lg">close</span>
                                Hủy phiếu
                              </Button>
                            )}
                        </div>
                      </div>

                      <div className="rounded-xl border border-border bg-muted/20 p-4">
                        <p className="mb-2 text-sm font-medium text-foreground">
                          Danh sách vật phẩm
                        </p>
                        <div className="space-y-2 text-sm text-muted-foreground">
                          {(transfer.items || []).map((item, index) => (
                            <p key={`${transfer.id}-${item.supplyItemId}-${index}`}>
                              Vật phẩm: {item.supplyItemId} • Số lượng:{' '}
                              {formatNumberVN(item.quantity)}
                            </p>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function ManagerTransactionHistoryDialog({
  open,
  onOpenChange,
  inventoryName,
  transactions,
  isLoading,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  inventoryName: string;
  transactions: Array<{
    transactionId: string;
    type: number;
    reason: number;
    notes: string;
    createdAt: string;
    items: Array<{ supplyItemId: string; quantity: number; notes?: string }>;
  }>;
  isLoading: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!max-w-none w-[94vw] max-w-5xl h-[88vh] overflow-hidden p-0 flex flex-col">
        <DialogHeader className="px-6 py-4 border-b border-border">
          <DialogTitle>Lịch sử giao dịch kho</DialogTitle>
          <DialogDescription>Kho đang xem: {inventoryName || 'Chưa chọn kho'}.</DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto p-6">
          {isLoading ? (
            <div className="py-16 text-center text-muted-foreground">
              Đang tải lịch sử giao dịch...
            </div>
          ) : transactions.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground">Chưa có giao dịch nào.</div>
          ) : (
            <div className="space-y-4">
              {transactions.map((transaction) => {
                const meta = getTransactionMeta(transaction.type, transaction.reason);
                return (
                  <Card key={transaction.transactionId} className="border-border bg-card">
                    <CardContent className="p-5 space-y-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="font-semibold text-foreground">
                            Mã giao dịch: {transaction.transactionId.slice(0, 8)}...
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {transaction.createdAt
                              ? new Date(transaction.createdAt).toLocaleString('vi-VN')
                              : 'Chưa có dữ liệu thời gian'}
                          </p>
                        </div>
                        <div
                          className={`inline-flex items-center gap-2 rounded-full border border-border px-3 py-1 text-sm ${meta.className}`}
                        >
                          <span className="material-symbols-outlined text-[18px]">{meta.icon}</span>
                          <span>{meta.label}</span>
                        </div>
                      </div>

                      <div className="rounded-xl border border-border bg-muted/20 p-4">
                        <p className="text-sm text-muted-foreground">
                          Ghi chú: {transaction.notes || 'Không có ghi chú'}
                        </p>
                        <div className="mt-3 space-y-2 text-sm text-muted-foreground">
                          {transaction.items?.map((item, index) => (
                            <p key={`${transaction.transactionId}-${item.supplyItemId}-${index}`}>
                              Vật phẩm: {item.supplyItemId} • Số lượng:{' '}
                              {formatNumberVN(item.quantity)} • Ghi chú: {item.notes || 'Không có'}
                            </p>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
