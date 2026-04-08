import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  EntityStatus,
  getEntityStatusClass,
  getEntityStatusIcon,
  getEntityStatusLabel,
  getInventoryLevelClass,
  getInventoryLevelIcon,
  getInventoryLevelLabel,
} from '@/enums/beEnums';
import { formatNumberVN } from '@/lib/utils';

const responsiveBadgeTextClass =
  'min-w-0 overflow-hidden text-ellipsis whitespace-nowrap max-w-[84px] sm:max-w-[140px]';

const responsiveBadgeClass =
  'max-w-[46px] px-1.5 sm:max-w-[180px] sm:px-2.5 justify-start overflow-hidden';

type InventoryItem = {
  inventoryId: string;
  reliefStationId: string;
  reliefStationName: string;
  level: number;
  status: number;
  totalStockSlots: number;
};

export function ManagerInventoryTable({
  inventories,
  isLoading,
  isUpdating,
  onCreateStock,
  onImportStock,
  onUpdateStock,
  onViewStockDetail,
  onCreateTransfer,
  onViewTransfers,
  onViewTransactions,
  onToggleStatus,
}: {
  inventories: InventoryItem[];
  isLoading: boolean;
  isUpdating: boolean;
  /** Mở dialog tạo tồn kho mới (chỉ addStock cho vật phẩm chưa có trong kho) */
  onCreateStock: (inventoryId: string, inventoryName: string) => void;
  /** Mở dialog nhập bổ sung tồn kho (chỉ POST createTransaction import) */
  onImportStock: (inventoryId: string, inventoryName: string) => void;
  /** Mở dialog cập nhật min/max tồn kho (chỉ PUT updateStock) */
  onUpdateStock: (inventoryId: string, inventoryName: string) => void;
  /** Mở dialog xem chi tiết tồn kho (chỉ đọc) */
  onViewStockDetail: (inventoryId: string, inventoryName: string) => void;
  onCreateTransfer: (inventoryId: string, reliefStationId: string, inventoryName: string) => void;
  onViewTransfers: (inventoryId: string, reliefStationId: string, inventoryName: string) => void;
  onViewTransactions: (inventoryId: string, inventoryName: string) => void;
  onToggleStatus: (inventoryId: string, level: number, status: EntityStatus) => void;
}) {
  return (
    <div className="overflow-x-auto">
      {isLoading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <div className="flex flex-col items-center gap-3">
            <span className="material-symbols-outlined text-4xl animate-spin text-primary">
              progress_activity
            </span>
            <p>Đang tải danh sách kho...</p>
          </div>
        </div>
      ) : inventories.length === 0 ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <div className="flex flex-col items-center gap-3">
            <span className="material-symbols-outlined text-4xl">warehouse</span>
            <p>Chưa có kho nào được tạo</p>
          </div>
        </div>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left">
              <th className="px-5 py-3 font-semibold">Kho</th>
              <th className="px-5 py-3 font-semibold">Trạm</th>
              <th className="px-5 py-3 font-semibold">Cấp kho</th>
              <th className="px-5 py-3 font-semibold">Trạng thái</th>
              <th className="px-5 py-3 font-semibold text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {inventories.map((inv) => {
              const levelLabel = getInventoryLevelLabel(inv.level);
              const levelIcon = getInventoryLevelIcon(inv.level);
              const levelClass = getInventoryLevelClass(inv.level);
              const statusLabel = getEntityStatusLabel(inv.status);
              const statusIcon = getEntityStatusIcon(inv.status);
              const statusClass = getEntityStatusClass(inv.status);

              return (
                <tr key={inv.inventoryId} className="border-b border-border/70 hover:bg-muted/30">
                  <td className="px-5 py-4">
                    <div>
                      <p className="font-bold uppercase text-foreground">
                        {inv.inventoryId.slice(0, 6)}...
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatNumberVN(inv.totalStockSlots)} ô lưu trữ
                      </p>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-muted-foreground">{inv.reliefStationName}</td>
                  <td className="px-5 py-4">
                    <Badge
                      variant="outline"
                      appearance="outline"
                      size="xs"
                      className={`gap-1 rounded-full py-1 sm:size-auto sm:gap-1.5 border ${responsiveBadgeClass} ${levelClass}`}
                    >
                      <span className="material-symbols-outlined shrink-0 text-xs">
                        {levelIcon}
                      </span>
                      <span className={`hidden sm:inline ${responsiveBadgeTextClass}`}>
                        {levelLabel}
                      </span>
                      <span className={`sm:hidden ${responsiveBadgeTextClass}`}>...</span>
                    </Badge>
                  </td>
                  <td className="px-5 py-4">
                    <Badge
                      variant={
                        inv.status === EntityStatus.Active
                          ? 'success'
                          : inv.status === EntityStatus.Inactive
                            ? 'warning'
                            : 'outline'
                      }
                      appearance="outline"
                      size="xs"
                      className={`gap-1 rounded-full py-1 sm:size-auto sm:gap-1.5 border ${responsiveBadgeClass} ${statusClass}`}
                    >
                      <span className="material-symbols-outlined shrink-0 text-xs">
                        {statusIcon}
                      </span>
                      <span className={`hidden sm:inline ${responsiveBadgeTextClass}`}>
                        {statusLabel}
                      </span>
                      <span className={`sm:hidden ${responsiveBadgeTextClass}`}>...</span>
                    </Badge>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <span className="material-symbols-outlined">more_vert</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          className="gap-2 text-sky-600"
                          onClick={() => onViewStockDetail(inv.inventoryId, inv.reliefStationName)}
                        >
                          <span className="material-symbols-outlined text-lg">visibility</span>
                          Xem chi tiết tồn kho
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="gap-2 text-emerald-600"
                          onClick={() => onCreateStock(inv.inventoryId, inv.reliefStationName)}
                        >
                          <span className="material-symbols-outlined text-lg">add_box</span>
                          Tạo tồn kho mới
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="gap-2 text-blue-600"
                          onClick={() => onImportStock(inv.inventoryId, inv.reliefStationName)}
                        >
                          <span className="material-symbols-outlined text-lg">move_to_inbox</span>
                          Nhập bổ sung tồn kho
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="gap-2 text-primary"
                          onClick={() => onUpdateStock(inv.inventoryId, inv.reliefStationName)}
                        >
                          <span className="material-symbols-outlined text-lg">inventory</span>
                          Cập nhật tồn kho
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="gap-2 text-primary"
                          onClick={() =>
                            onCreateTransfer(
                              inv.inventoryId,
                              inv.reliefStationId,
                              inv.reliefStationName,
                            )
                          }
                        >
                          <span className="material-symbols-outlined text-lg">swap_horiz</span>
                          Tạo phiếu chuyển kho
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="gap-2 text-primary"
                          onClick={() =>
                            onViewTransfers(
                              inv.inventoryId,
                              inv.reliefStationId,
                              inv.reliefStationName,
                            )
                          }
                        >
                          <span className="material-symbols-outlined text-lg">history</span>
                          Xem lịch sử chuyển kho
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="gap-2 text-primary"
                          onClick={() => onViewTransactions(inv.inventoryId, inv.reliefStationName)}
                        >
                          <span className="material-symbols-outlined text-lg">receipt_long</span>
                          Xem lịch sử giao dịch
                        </DropdownMenuItem>
                        {inv.status === EntityStatus.Active ? (
                          <DropdownMenuItem
                            className="gap-2 text-destructive"
                            disabled={isUpdating}
                            onClick={() =>
                              onToggleStatus(inv.inventoryId, inv.level, EntityStatus.Inactive)
                            }
                          >
                            <span className="material-symbols-outlined text-lg ">block</span>
                            Ngừng hoạt động
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem
                            className="gap-2 text-green-500"
                            disabled={isUpdating}
                            onClick={() =>
                              onToggleStatus(inv.inventoryId, inv.level, EntityStatus.Active)
                            }
                          >
                            <span className="material-symbols-outlined text-lg">check_circle</span>
                            Kích hoạt kho
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
