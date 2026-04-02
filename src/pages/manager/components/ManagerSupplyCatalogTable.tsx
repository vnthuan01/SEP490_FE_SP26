import { useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import type { CheckedState } from '@radix-ui/react-checkbox';
import { SupplyCategoryBadge } from './ManagerInventoryShared';

export type SupplyItemRow = {
  id: string;
  name: string;
  description: string;
  iconUrl?: string;
  unit: string;
  category: number;
};

function SupplyRow({
  item,
  isSelected,
  onToggle,
  onEdit,
}: {
  item: SupplyItemRow;
  isSelected: boolean;
  onToggle: () => void;
  onEdit: () => void;
}) {
  const handleCheckboxChange = useCallback(
    (checked: CheckedState) => {
      if (checked === 'indeterminate') return;
      onToggle();
    },
    [onToggle],
  );

  return (
    <tr className="border-b border-border/70 hover:bg-muted/30">
      <td className="px-5 py-4 w-12">
        <Checkbox checked={isSelected} onCheckedChange={handleCheckboxChange} />
      </td>
      <td className="px-5 py-4">
        <div>
          <p className="font-semibold text-foreground flex items-center gap-2">
            {item.iconUrl && (
              <span className="material-symbols-outlined text-[18px]">{item.iconUrl}</span>
            )}
            {item.name}
          </p>
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
          <Button variant="outline" size="sm" className="gap-2" onClick={onEdit}>
            <span className="material-symbols-outlined text-sm">edit</span>
            Sửa
          </Button>
        </div>
      </td>
    </tr>
  );
}

export function ManagerSupplyCatalogTable({
  supplyItems,
  isLoading,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
  onEdit,
}: {
  supplyItems: SupplyItemRow[];
  isLoading: boolean;
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onToggleSelectAll: () => void;
  onEdit: (item: SupplyItemRow) => void;
}) {
  const allPageIds = supplyItems.map((item) => item.id);
  const isAllSelected = allPageIds.length > 0 && allPageIds.every((id) => selectedIds.has(id));

  const handleHeaderCheckboxChange = useCallback(
    (checked: CheckedState) => {
      if (checked === 'indeterminate') return;
      onToggleSelectAll();
    },
    [onToggleSelectAll],
  );

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
                <Checkbox checked={isAllSelected} onCheckedChange={handleHeaderCheckboxChange} />
              </th>
              <th className="px-5 py-3 font-semibold">Vật phẩm</th>
              <th className="px-5 py-3 font-semibold">Danh mục</th>
              <th className="px-5 py-3 font-semibold">Đơn vị</th>
              <th className="px-5 py-3 font-semibold text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {supplyItems.map((item) => (
              <SupplyRow
                key={item.id}
                item={item}
                isSelected={selectedIds.has(item.id)}
                onToggle={() => onToggleSelect(item.id)}
                onEdit={() => onEdit(item)}
              />
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
