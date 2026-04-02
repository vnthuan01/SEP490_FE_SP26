import { Card, CardContent } from '@/components/ui/card';
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
import { IconGuide, RequiredMark, SupplyCategoryBadge } from './ManagerInventoryShared';
import {
  SupplyCategory,
  getSupplyCategoryClass,
  getSupplyCategoryIcon,
  getSupplyCategoryLabel,
} from '@/enums/beEnums';

const DANH_MUC_VAT_PHAM = [
  SupplyCategory.LuongThuc,
  SupplyCategory.YTeVaThuoc,
  SupplyCategory.NuocUong,
  SupplyCategory.DungCuVaLeuTrai,
  SupplyCategory.Khac,
] as const;

export type SupplyEditableDraft = {
  name: string;
  description: string;
  iconUrl: string;
  category: string;
  unit: string;
};

export type SupplyEditableDraftKey = keyof SupplyEditableDraft;

export type SupplyDisplayDraft = SupplyEditableDraft & {
  supplyItemId?: string;
};

export function ManagerSupplyItemFormCard({
  item,
  index,
  title,
  description,
  onChange,
  showItemBadge = false,
}: {
  item: SupplyDisplayDraft;
  index: number;
  title: string;
  description: string;
  onChange: (key: SupplyEditableDraftKey, value: string) => void;
  showItemBadge?: boolean;
}) {
  return (
    <Card className="border-border bg-card">
      <CardContent className="p-5 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="font-semibold text-foreground">
              {title} #{index + 1}
            </p>
            <p className="text-xs text-muted-foreground">{description}</p>
            {item.supplyItemId && (
              <p className="text-xs text-muted-foreground font-mono mt-1">
                Mã vật phẩm: {item.supplyItemId.slice(0, 8)}...
              </p>
            )}
          </div>

          {showItemBadge && <SupplyCategoryBadge category={item.category} />}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label>
              Tên vật phẩm <RequiredMark />
            </Label>
            <Input value={item.name} onChange={(e) => onChange('name', e.target.value)} />
          </div>

          <div className="grid gap-2">
            <Label>
              Danh mục <RequiredMark />
            </Label>
            <Select value={item.category} onValueChange={(value) => onChange('category', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Chọn danh mục" />
              </SelectTrigger>
              <SelectContent>
                {DANH_MUC_VAT_PHAM.map((category) => (
                  <SelectItem key={category} value={String(category)}>
                    <div className="flex items-center gap-2">
                      <span
                        className={`material-symbols-outlined text-[18px] border rounded-full p-1 leading-none ${getSupplyCategoryClass(category)}`}
                      >
                        {getSupplyCategoryIcon(category)}
                      </span>
                      <span className="font-medium">{getSupplyCategoryLabel(category)}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label>
              Đơn vị tính <RequiredMark />
            </Label>
            <Input value={item.unit} onChange={(e) => onChange('unit', e.target.value)} />
          </div>

          <div className="grid gap-2">
            <Label className="flex items-center gap-2">
              Đường dẫn biểu tượng
              <IconGuide />
            </Label>
            <Input value={item.iconUrl} onChange={(e) => onChange('iconUrl', e.target.value)} />
          </div>
        </div>

        <div className="grid gap-2">
          <Label>Mô tả</Label>
          <Textarea
            value={item.description}
            onChange={(e) => onChange('description', e.target.value)}
          />
        </div>
      </CardContent>
    </Card>
  );
}
