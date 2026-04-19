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
  onFormChange: (key: 'sourceStationId' | 'reason' | 'notes', value: string) => void;
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
          <DialogTitle>Tạo yêu cầu điều phối kho</DialogTitle>
          <DialogDescription>
            Tạo yêu cầu cấp hàng cho {sourceInventoryName || 'kho đang chọn'}. Mặc định sẽ yêu cầu
            từ kho trung tâm; bạn cũng có thể chọn kho nguồn khác cùng cấp nếu cần.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto p-6 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>
                Kho / trạm nguồn <RequiredMark />
              </Label>
              <Select
                value={transferForm.destinationStationId}
                onValueChange={(value) => onFormChange('sourceStationId', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Chọn kho / trạm cấp hàng" />
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
                          Tồn kho tại nơi cấp hiện có:{' '}
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
            {isPending ? 'Đang tạo...' : 'Tạo yêu cầu điều phối'}
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
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transfers: Array<{
    id: string;
    transferCode?: string;
    sourceStationId: string;
    sourceStationName?: string;
    destinationStationId: string;
    destinationStationName?: string;
    totalRequestedItems?: number;
    totalRequestedQuantity?: number;
    requestedByName?: string;
    reason?: string;
    status: number;
    notes?: string;
    createdAt?: string;
    requestedAt?: string;
    approvedAt?: string | null;
    shippedAt?: string | null;
    receivedAt?: string | null;
    approvedByName?: string | null;
    vehicleId?: string | null;
    driverUserId?: string | null;
    currentRequestPdfUrl?: string | null;
    currentConfirmedPdfUrl?: string | null;
    inventoryTransactionIds?: string[];
    documents?: Array<{
      supplyTransferDocumentId: string;
      documentType: number;
      version: number;
      fileUrl: string;
      fileName?: string | null;
      isCurrent: boolean;
      createdAt: string;
      notes?: string | null;
    }>;
    items?: Array<{
      supplyItemId: string;
      supplyItemName?: string;
      quantity?: number;
      requestedQuantity?: number;
      actualQuantity?: number | null;
      notes?: string;
    }>;
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
                              Mã phiếu: {transfer.transferCode || `${transfer.id.slice(0, 8)}...`}
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
                            Kho/trạm nguồn: {transfer.sourceStationName || transfer.sourceStationId}{' '}
                            → đích:{' '}
                            {transfer.destinationStationName || transfer.destinationStationId}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Thời gian tạo:{' '}
                            {transfer.createdAt
                              ? new Date(transfer.createdAt).toLocaleString('vi-VN')
                              : 'Chưa có dữ liệu'}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Duyệt:{' '}
                            {transfer.approvedAt
                              ? new Date(transfer.approvedAt).toLocaleString('vi-VN')
                              : 'Chưa duyệt'}
                            {' • '}Giao:{' '}
                            {transfer.shippedAt
                              ? new Date(transfer.shippedAt).toLocaleString('vi-VN')
                              : 'Chưa giao'}
                            {' • '}Nhận:{' '}
                            {transfer.receivedAt
                              ? new Date(transfer.receivedAt).toLocaleString('vi-VN')
                              : 'Chưa nhận'}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Người yêu cầu: {transfer.requestedByName || 'Chưa rõ'} • Tổng dòng:{' '}
                            {formatNumberVN(
                              transfer.totalRequestedItems || transfer.items?.length || 0,
                            )}{' '}
                            • Tổng số lượng: {formatNumberVN(transfer.totalRequestedQuantity || 0)}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Người duyệt: {transfer.approvedByName || 'Chưa cập nhật'} • Phương tiện:{' '}
                            {transfer.vehicleId || 'Chưa cập nhật'} • Người giao:{' '}
                            {transfer.driverUserId || 'Chưa cập nhật'}
                          </p>
                          {transfer.reason && (
                            <p className="text-sm text-muted-foreground">
                              Lý do: {transfer.reason}
                            </p>
                          )}
                          <p className="text-sm text-muted-foreground">
                            Ghi chú: {transfer.notes || 'Không có ghi chú'}
                          </p>
                        </div>

                        {/* <div className="flex flex-wrap gap-2">
                          {transfer.status === SupplyTransferStatus.Pending && (
                            <Button
                              size="sm"
                              variant="success"
                              onClick={() => onApprove(transfer.id)}
                            >
                              <span className="material-symbols-outlined">check</span>
                              Duyệt
                            </Button>
                          )}
                          {transfer.status === SupplyTransferStatus.Approved && (
                            <Button size="sm" variant="outline" onClick={() => onShip(transfer.id)}>
                              <span className="material-symbols-outlined text-lg">ship</span>
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
                        </div> */}
                      </div>

                      <div className="rounded-xl border border-border bg-muted/20 p-4">
                        <p className="mb-2 text-sm font-medium text-foreground">
                          Danh sách vật phẩm
                        </p>
                        <div className="space-y-2 text-sm text-muted-foreground">
                          {(transfer.items || []).map((item, index) => (
                            <p key={`${transfer.id}-${item.supplyItemId}-${index}`}>
                              Vật phẩm: {item.supplyItemName || item.supplyItemId} • SL yêu cầu:{' '}
                              {formatNumberVN(item.requestedQuantity ?? item.quantity ?? 0)}
                              {typeof item.actualQuantity === 'number'
                                ? ` • SL thực tế: ${formatNumberVN(item.actualQuantity)}`
                                : ''}
                              {item.notes ? ` • Ghi chú: ${item.notes}` : ''}
                            </p>
                          ))}
                        </div>
                      </div>

                      {(transfer.currentRequestPdfUrl || transfer.currentConfirmedPdfUrl) && (
                        <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-2 text-sm">
                          <p className="font-medium text-foreground">Tài liệu chính</p>
                          {transfer.currentRequestPdfUrl && (
                            <p>
                              PDF yêu cầu:{' '}
                              <a
                                href={transfer.currentRequestPdfUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="text-primary hover:underline break-all"
                              >
                                Mở file
                              </a>
                            </p>
                          )}
                          {transfer.currentConfirmedPdfUrl && (
                            <p>
                              PDF xác nhận:{' '}
                              <a
                                href={transfer.currentConfirmedPdfUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="text-primary hover:underline break-all"
                              >
                                Mở file
                              </a>
                            </p>
                          )}
                        </div>
                      )}

                      {!!transfer.documents?.length && (
                        <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-2 text-sm">
                          <p className="font-medium text-foreground">Danh sách tài liệu</p>
                          {transfer.documents.map((document) => (
                            <div key={document.supplyTransferDocumentId}>
                              <span>
                                {document.documentType === 1
                                  ? 'Request PDF'
                                  : document.documentType === 2
                                    ? 'Confirmed PDF'
                                    : `Document ${document.documentType}`}
                                {document.isCurrent ? ' • hiện hành' : ` • v${document.version}`}
                                {' — '}
                              </span>
                              <a
                                href={document.fileUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="text-primary hover:underline break-all"
                              >
                                {document.fileName || document.fileUrl}
                              </a>
                            </div>
                          ))}
                        </div>
                      )}

                      {!!transfer.inventoryTransactionIds?.length && (
                        <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-2 text-sm">
                          <p className="font-medium text-foreground">Giao dịch kho liên kết</p>
                          <div className="flex flex-wrap gap-2">
                            {transfer.inventoryTransactionIds.map((id) => (
                              <Badge key={id} variant="outline" appearance="outline" size="sm">
                                {id}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
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
    transactionCode?: string;
    type: number;
    typeName?: string;
    reason: number;
    reasonName?: string;
    totalItems?: number;
    notes: string;
    createdAt: string;
    reliefStationName?: string;
    createdByName?: string;
    importBatchCode?: string;
    sourceReference?: string;
    items: Array<{
      supplyItemId: string;
      supplyItemName?: string;
      supplyItemUnit?: string;
      quantity: number;
      notes?: string;
      unitCost?: number;
      expiryDate?: string | null;
    }>;
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
                            Mã giao dịch:{' '}
                            {transaction.transactionCode ||
                              `${transaction.transactionId.slice(0, 8)}...`}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {transaction.createdAt
                              ? new Date(transaction.createdAt).toLocaleString('vi-VN')
                              : 'Chưa có dữ liệu thời gian'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Người tạo: {transaction.createdByName || 'Chưa rõ'} • Lý do:{' '}
                            {transaction.reasonName || 'Chưa rõ'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Trạm: {transaction.reliefStationName || inventoryName || 'Chưa rõ'} •
                            Batch: {transaction.importBatchCode || '—'} • Nguồn tham chiếu:{' '}
                            {transaction.sourceReference || '—'}
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
                          Ghi chú: {transaction.notes || 'Không có ghi chú'} • Tổng dòng vật phẩm:{' '}
                          {formatNumberVN(transaction.totalItems || transaction.items?.length || 0)}
                        </p>
                        <div className="mt-3 space-y-2 text-sm text-muted-foreground">
                          {transaction.items?.map((item, index) => (
                            <p key={`${transaction.transactionId}-${item.supplyItemId}-${index}`}>
                              Vật phẩm: {item.supplyItemName || item.supplyItemId} • Số lượng:{' '}
                              {formatNumberVN(item.quantity)} {item.supplyItemUnit || ''} • Unit
                              cost: {item.unitCost != null ? formatNumberVN(item.unitCost) : '—'} •
                              HSD:{' '}
                              {item.expiryDate
                                ? new Date(item.expiryDate).toLocaleDateString('vi-VN')
                                : '—'}{' '}
                              • Ghi chú: {item.notes || 'Không có'}
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
