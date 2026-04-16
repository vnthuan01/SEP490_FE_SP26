import { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ArrowDownIcon, ArrowUpIcon, PlusIcon, TrashIcon } from 'lucide-react';
import type { PackageForm, PackageItemForm } from './types';

type SupplyOption = { id: string; name: string };

const isPackageItemComplete = (
  item: PackageItemForm | { supplyItemId: string; quantity: number; unit: string },
) => {
  return Boolean(item.supplyItemId && String(item.quantity).trim() && item.unit.trim());
};

export function ManagerReliefDistributionPackageStep({
  packageForm,
  supplyItems,
  selectedCampaignId,
  onChangePackageForm,
  onUpdatePackageItem,
  onAddPackageItem,
  onRemovePackageItem,
  onMovePackageItem,
  onCreatePackage,
}: {
  packageForm: PackageForm;
  supplyItems: SupplyOption[];
  selectedCampaignId: string;
  onChangePackageForm: (updater: (prev: PackageForm) => PackageForm) => void;
  onUpdatePackageItem: (index: number, patch: Partial<PackageItemForm>) => void;
  onAddPackageItem: () => void;
  onRemovePackageItem: (index: number) => void;
  onMovePackageItem: (index: number, direction: 'up' | 'down') => void;
  onCreatePackage: () => void;
}) {
  const hasEmptyItems = useMemo(
    () => packageForm.items.some((item) => !isPackageItemComplete(item)),
    [packageForm.items],
  );

  const createDisabled = !selectedCampaignId || !packageForm.outputSupplyItemId || hasEmptyItems;

  return (
    <Card className="shadow-sm">
      <CardHeader className="py-2 flex flex-col gap-2">
        <CardTitle>Bước 3 · Tạo gói cứu trợ</CardTitle>
        <p className="text-sm text-muted-foreground">
          Chọn vật phẩm đầu ra và cấu hình thành phần của gói cứu trợ.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <Input
          aria-label="Tên gói cứu trợ"
          placeholder="Tên gói cứu trợ"
          value={packageForm.name}
          onChange={(e) => onChangePackageForm((prev) => ({ ...prev, name: e.target.value }))}
        />
        <Textarea
          aria-label="Mô tả gói cứu trợ"
          placeholder="Mô tả gói cứu trợ"
          value={packageForm.description || ''}
          onChange={(e) =>
            onChangePackageForm((prev) => ({ ...prev, description: e.target.value }))
          }
        />
        <Select
          value={packageForm.outputSupplyItemId}
          onValueChange={(value) =>
            onChangePackageForm((prev) => ({ ...prev, outputSupplyItemId: value }))
          }
        >
          <SelectTrigger aria-label="Chọn vật phẩm đầu ra của gói">
            <SelectValue placeholder="Vật phẩm đầu ra của gói" />
          </SelectTrigger>
          <SelectContent>
            {supplyItems.map((item) => (
              <SelectItem key={item.id} value={item.id}>
                {item.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="space-y-3 rounded-xl border p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium">Danh sách thành phần</p>
              <p className="text-xs text-muted-foreground">
                Hiển thị tối đa 3 dòng, có thể cuộn khi thêm nhiều thành phần.
              </p>
            </div>
            <Badge variant={hasEmptyItems ? 'warning' : 'outline'} appearance="light">
              {packageForm.items.length} thành phần
            </Badge>
          </div>

          <div className="max-h-[252px] space-y-3 overflow-y-auto pr-1">
            {packageForm.items.map((item, index) => (
              <div
                key={`${index}-${item.supplyItemId}`}
                className="grid items-start gap-3 md:grid-cols-[minmax(0,1fr)_88px_96px_auto_auto_auto]"
              >
                <Select
                  value={item.supplyItemId}
                  onValueChange={(value) => onUpdatePackageItem(index, { supplyItemId: value })}
                >
                  <SelectTrigger
                    className="min-w-0"
                    aria-label={`Chọn vật phẩm thành phần ${index + 1}`}
                  >
                    <SelectValue placeholder="Vật phẩm thành phần" />
                  </SelectTrigger>
                  <SelectContent>
                    {supplyItems.map((supplyItem) => (
                      <SelectItem key={supplyItem.id} value={supplyItem.id}>
                        {supplyItem.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Input
                  aria-label={`Số lượng thành phần ${index + 1}`}
                  className="w-full"
                  type="number"
                  placeholder="SL"
                  value={item.quantity}
                  onChange={(e) => onUpdatePackageItem(index, { quantity: e.target.value })}
                />

                <Input
                  aria-label={`Đơn vị thành phần ${index + 1}`}
                  className="w-full"
                  placeholder="Đơn vị"
                  value={item.unit}
                  onChange={(e) => onUpdatePackageItem(index, { unit: e.target.value })}
                />

                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="shrink-0"
                  aria-label={`Đưa thành phần ${index + 1} lên trên`}
                  disabled={index === 0}
                  onClick={() => onMovePackageItem(index, 'up')}
                >
                  <ArrowUpIcon className="w-4 h-4" />
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="shrink-0"
                  aria-label={`Đưa thành phần ${index + 1} xuống dưới`}
                  disabled={index === packageForm.items.length - 1}
                  onClick={() => onMovePackageItem(index, 'down')}
                >
                  <ArrowDownIcon className="w-4 h-4" />
                </Button>

                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="shrink-0"
                  aria-label={`Xóa thành phần ${index + 1}`}
                  disabled={packageForm.items.length === 1}
                  onClick={() => onRemovePackageItem(index)}
                >
                  <TrashIcon className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>

          <Button type="button" variant="outline" onClick={onAddPackageItem}>
            <PlusIcon className="w-4 h-4" />
            Thêm thành phần
          </Button>

          {hasEmptyItems && (
            <p className="text-sm text-amber-600 dark:text-amber-400">
              Vui lòng điền đầy đủ vật phẩm, số lượng và đơn vị cho tất cả các thành phần trước khi
              tạo gói cứu trợ.
            </p>
          )}
        </div>

        <Button onClick={onCreatePackage} disabled={createDisabled}>
          Tạo gói cứu trợ
        </Button>
      </CardContent>
    </Card>
  );
}
