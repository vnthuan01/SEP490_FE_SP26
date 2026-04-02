import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { SupplyCategoryBadge } from './ManagerInventoryShared';

type SupplyItem = {
  id: string;
  name: string;
  description: string;
  iconUrl?: string;
  unit: string;
  category: number;
};

export function ManagerSupplyCatalogTable({
  supplyItems,
  isLoading,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
  onEdit,
}: {
  supplyItems: SupplyItem[];
  isLoading: boolean;
  selectedIds: string[];
  onToggleSelect: (id: string, checked: boolean) => void;
  onToggleSelectAll: (checked: boolean) => void;
  onEdit: (item: SupplyItem) => void;
}) {
  const isAllSelected =
    supplyItems.length > 0 && supplyItems.every((item) => selectedIds.includes(item.id));

  return (
    <div className="overflow-x-auto">
      {isLoading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <div className="flex flex-col items-center gap-3">
            <span className="material-symbols-outlined text-4xl animate-spin text-primary">
              progress_activity
            </span>
            <p>Đang tải danh mục Vật phẩm/Hàng hóa...</p>
          </div>
        </div>
      ) : supplyItems.length === 0 ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <div className="flex flex-col items-center gap-3">
            <span className="material-symbols-outlined text-4xl">inventory_2</span>
            <p>Chưa có Vật phẩm/Hàng hóa nào</p>
          </div>
        </div>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left">
              <th className="px-5 py-3 font-semibold w-12">
                <Checkbox
                  checked={isAllSelected}
                  onCheckedChange={(checked) => onToggleSelectAll(checked === true)}
                />
              </th>
              <th className="px-5 py-3 font-semibold">Vật phẩm</th>
              <th className="px-5 py-3 font-semibold">Danh mục</th>
              <th className="px-5 py-3 font-semibold">Đơn vị</th>
              <th className="px-5 py-3 font-semibold text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {supplyItems.map((item) => (
              <tr key={item.id} className="border-b border-border/70 hover:bg-muted/30">
                <td className="px-5 py-4">
                  <Checkbox
                    checked={selectedIds.includes(item.id)}
                    onCheckedChange={(checked) => onToggleSelect(item.id, checked === true)}
                  />
                </td>
                <td className="px-5 py-4">
                  <div>
                    <p className="font-semibold text-foreground">{item.name}</p>
                    <p className="text-xs text-muted-foreground line-clamp-1">
                      {item.description || 'Chưa có mô tả'}
                    </p>
                  </div>
                </td>
                <td className="px-5 py-4">
                  <SupplyCategoryBadge category={item.category} />
                </td>
                <td className="px-5 py-4 text-muted-foreground">{item.unit}</td>
                <td className="px-5 py-4">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2"
                      onClick={() => onEdit(item)}
                    >
                      <span className="material-symbols-outlined text-sm">edit</span>
                      Sửa
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
