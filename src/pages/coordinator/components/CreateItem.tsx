import * as React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import type { NewInventoryItem, ItemInventoryProps } from '@/types/createItemInventory';

const UNIT_OPTIONS = ['Thùng', 'Hộp', 'Bao', 'Chai', 'Cái', 'Gói'];

export function CreateInventoryItemDialog({
  open,
  onOpenChange,
  onSubmit,
  supplyItems = [],
  initialSupplyItemId,
  existingStock,
}: ItemInventoryProps) {
  const [form, setForm] = React.useState<NewInventoryItem>({
    supplyItemId: '',
    name: '',
    category: '',
    icon: '',
    unit: '',
    quantity: 1,
    capacity: undefined,
    note: '',
    expirationDate: null,
  });

  React.useEffect(() => {
    if (!open) return;
    const selected = supplyItems.find((item) => item.id === initialSupplyItemId);
    setForm({
      supplyItemId: selected?.id || '',
      name: selected?.name || '',
      category: selected?.category || '',
      icon: selected?.icon || '',
      unit: selected?.unit || '',
      quantity: 1,
      capacity: existingStock?.maximumStockLevel,
      note: '',
      expirationDate: null,
    });
  }, [open, initialSupplyItemId, supplyItems, existingStock]);

  const update = <K extends keyof NewInventoryItem>(key: K, value: NewInventoryItem[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const canSubmit =
    form.supplyItemId && form.unit.trim() && form.quantity > 0 && !!form.note?.trim();

  const handleSelectSupplyItem = (supplyItemId: string) => {
    const selected = supplyItems.find((item) => item.id === supplyItemId);
    if (!selected) return;

    setForm((prev) => ({
      ...prev,
      supplyItemId,
      name: selected.name,
      category: selected.category,
      icon: selected.icon,
      unit: selected.unit,
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg p-0 overflow-hidden">
        <DialogHeader className="px-6 py-4 border-b border-border">
          <DialogTitle className="text-xl font-bold text-foreground">
            Nhập kho – Vật tư mới
          </DialogTitle>
        </DialogHeader>

        <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
          {/* SUPPLY ITEM */}
          <div className="space-y-2">
            <Label>
              Chọn vật tư có sẵn <span className="text-red-500">*</span>
            </Label>
            <Select value={form.supplyItemId} onValueChange={handleSelectSupplyItem}>
              <SelectTrigger>
                <SelectValue placeholder="Chọn vật tư từ danh mục" />
              </SelectTrigger>
              <SelectContent>
                {supplyItems.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    <div className="flex items-center gap-2 min-w-0">
                      {item.icon && (
                        <span className="material-symbols-outlined text-[18px]">{item.icon}</span>
                      )}
                      <span className="font-medium truncate">{item.name}</span>
                      <span className="text-xs text-muted-foreground truncate">
                        • {item.category}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* NAME */}
          <div className="space-y-2">
            <Label>Tên vật tư</Label>
            <Input placeholder="Tên vật tư tự động điền theo lựa chọn" value={form.name} readOnly />
          </div>

          {/* CATEGORY */}
          <div className="space-y-2">
            <Label>Danh mục</Label>
            <Input placeholder="Danh mục tự động điền theo vật tư" value={form.category} readOnly />
          </div>

          {/* ICON */}
          <div className="space-y-2">
            <Label>Icon</Label>
            <Input placeholder="Icon tự động điền theo vật tư" value={form.icon} readOnly />
          </div>

          <Separator />

          {existingStock && (
            <div className="rounded-xl border border-border bg-muted/20 p-4 text-sm text-muted-foreground space-y-1">
              <p>
                Tồn hiện tại:{' '}
                <span className="font-semibold text-foreground">
                  {existingStock.currentQuantity}
                </span>
              </p>
              <p>
                Ngưỡng tồn hiện có: {existingStock.minimumStockLevel} -{' '}
                {existingStock.maximumStockLevel}
              </p>
              <p>Vật phẩm đã có trong kho, bạn chỉ cần nhập thêm số lượng và nêu rõ lý do nhập.</p>
            </div>
          )}

          {/* QUANTITY */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>
                Số lượng nhập <span className="text-red-500">*</span>
              </Label>
              <Input
                type="number"
                min={1}
                value={form.quantity}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  update('quantity', Number(e.target.value))
                }
              />
            </div>

            <div className="space-y-2">
              <Label>
                Đơn vị <span className="text-red-500">*</span>
              </Label>

              <select
                value={form.unit}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                  update('unit', e.target.value)
                }
                className="
                  w-full h-10 rounded-md border border-border
                  bg-background px-3 text-sm text-foreground
                  focus:outline-none focus:ring-2 focus:ring-primary
                "
              >
                <option value="">-- Chọn đơn vị --</option>

                {UNIT_OPTIONS.map((unit) => (
                  <option key={unit} value={unit}>
                    {unit}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* CAPACITY */}
          <div className="space-y-2">
            <Label>
              {existingStock ? 'Sức chứa tối đa hiện tại' : 'Sức chứa tối đa (optional)'}
            </Label>
            <Input
              type="number"
              min={form.quantity}
              placeholder="Ví dụ: 1000"
              value={form.capacity ?? ''}
              disabled={!!existingStock}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                update('capacity', e.target.value ? Number(e.target.value) : undefined)
              }
            />
          </div>

          {/* EXPIRATION DATE – chỉ hiện khi tạo mới (chưa có stock) */}
          {!existingStock && (
            <div className="space-y-2">
              <Label>Ngày hết hạn lô hàng (tùy chọn)</Label>
              <Input
                type="date"
                value={form.expirationDate ?? ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  update('expirationDate', e.target.value || null)
                }
              />
              <p className="text-xs text-muted-foreground">
                Để trống nếu lô hàng không có hạn sử dụng cụ thể.
              </p>
            </div>
          )}

          {/* NOTE */}
          <div className="space-y-2">
            <Label>
              Lý do nhập kho <span className="text-red-500">*</span>
            </Label>
            <Textarea
              rows={3}
              placeholder="Ví dụ: Bổ sung vật tư do nhu cầu sử dụng tăng cao"
              value={form.note}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                update('note', e.target.value)
              }
              className="resize-none"
            />
          </div>
        </div>

        {/* ACTIONS */}
        <div className="border-t border-border px-6 py-4 flex justify-end gap-2 bg-muted/40">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Hủy
          </Button>
          <Button
            variant="primary"
            disabled={!canSubmit}
            onClick={() => {
              onSubmit(form);
              onOpenChange(false);
            }}
          >
            <span className="material-symbols-outlined mr-2">add</span>
            Nhập kho
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
