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
import CustomCalendar from '@/components/ui/customCalendar';
import { clearDialogDraft, readDialogDraft, writeDialogDraft } from '@/lib/dialogDraft';
import { formatNumberInputVN, parseFormattedNumber } from '@/lib/utils';

const parseLocalDateFromYmd = (value?: string | null) => {
  if (!value) return undefined;

  if (value.includes('T')) {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? undefined : parsed;
  }

  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) return undefined;

  return new Date(year, month - 1, day, 12, 0, 0);
};

const toUtcIsoFromDate = (date: Date) => {
  const year = date.getFullYear();
  const month = date.getMonth();
  const day = date.getDate();

  return new Date(Date.UTC(year, month, day, 12, 0, 0)).toISOString();
};

export function CreateInventoryItemDialog({
  open,
  onOpenChange,
  onSubmit,
  supplyItems = [],
  initialSupplyItemId,
  existingStock,
}: ItemInventoryProps) {
  const CREATE_ITEM_DRAFT_KEY = 'coordinator-create-item-draft';
  const buildInitialForm = React.useCallback(
    (draft?: NewInventoryItem | null): NewInventoryItem => {
      const selected = supplyItems.find((item) => item.id === initialSupplyItemId);
      const isQuickImportExistingItem = Boolean(existingStock && selected);

      if (isQuickImportExistingItem) {
        return {
          supplyItemId: selected?.id || '',
          name: selected?.name || '',
          category: selected?.category || '',
          icon: selected?.icon || '',
          iconUrl: selected?.iconUrl || selected?.icon || '',
          unit: selected?.unit || '',
          quantity: draft?.quantity && draft.quantity > 0 ? draft.quantity : 1,
          capacity: existingStock?.maximumStockLevel,
          expirationDate: null,
          note: draft?.note || '',
          unitCost: draft?.unitCost,
          sourceReference: draft?.sourceReference || '',
        };
      }

      if (draft) {
        return draft;
      }

      return {
        supplyItemId: selected?.id || '',
        name: selected?.name || '',
        category: selected?.category || '',
        icon: selected?.icon || '',
        iconUrl: selected?.iconUrl || selected?.icon || '',
        unit: selected?.unit || '',
        quantity: 1,
        capacity: existingStock?.maximumStockLevel,
        expirationDate: null,
        note: '',
        unitCost: undefined,
        sourceReference: '',
      };
    },
    [existingStock, initialSupplyItemId, supplyItems],
  );

  const [form, setForm] = React.useState<NewInventoryItem>({
    supplyItemId: '',
    name: '',
    category: '',
    icon: '',
    unit: '',
    quantity: 1,
    capacity: undefined,
    expirationDate: null,
  });
  const [openExpirationDateCalendarDialog, setOpenExpirationDateCalendarDialog] =
    React.useState(false);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [submitting, setSubmitting] = React.useState(false);
  const [submitError, setSubmitError] = React.useState('');

  React.useEffect(() => {
    if (!open) return;
    const draft = readDialogDraft<NewInventoryItem | null>(CREATE_ITEM_DRAFT_KEY, null);
    setErrors({});
    setSubmitting(false);
    setSubmitError('');
    setForm(buildInitialForm(draft));
    setOpenExpirationDateCalendarDialog(false);
  }, [open, buildInitialForm]);

  React.useEffect(() => {
    writeDialogDraft(CREATE_ITEM_DRAFT_KEY, form);
  }, [form]);

  const update = <K extends keyof NewInventoryItem>(key: K, value: NewInventoryItem[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[key as string];
      return next;
    });
    setSubmitError('');
  };

  const handleSelectSupplyItem = (supplyItemId: string) => {
    const selected = supplyItems.find((item) => item.id === supplyItemId);
    if (!selected) return;

    setForm((prev) => ({
      ...prev,
      supplyItemId,
      name: selected.name,
      category: selected.category,
      icon: selected.icon,
      iconUrl: selected.iconUrl || selected.icon,
      unit: selected.unit,
    }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next['supplyItemId'];
      delete next['unit'];
      return next;
    });
  };

  const validate = (): Record<string, string> => {
    const errs: Record<string, string> = {};
    if (!form.supplyItemId) errs['supplyItemId'] = 'Vui lòng chọn vật tư từ danh mục.';
    if (!form.unit.trim()) errs['unit'] = 'Không tìm thấy đơn vị của vật tư đã chọn.';
    if (!form.quantity || form.quantity <= 0) errs['quantity'] = 'Số lượng phải lớn hơn 0.';
    if (existingStock && !form.note?.trim()) errs['note'] = 'Vui lòng nhập lý do nhập kho.';
    return errs;
  };

  const closeExpirationDateCalendarDialogAction = () => {
    setOpenExpirationDateCalendarDialog(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!max-w-none w-[95vw] h-[90vh] p-0 overflow-hidden flex flex-col">
        <DialogHeader className="px-6 py-4 border-b border-border shrink-0">
          <DialogTitle className="text-xl font-bold text-foreground">
            Nhập kho – Vật tư mới
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto p-6 space-y-5">
          {/* SUPPLY ITEM */}
          <div className="space-y-2">
            <Label>
              Chọn vật tư có sẵn <span className="text-red-500">*</span>
            </Label>
            <Select
              value={form.supplyItemId}
              onValueChange={handleSelectSupplyItem}
              disabled={!!existingStock}
            >
              <SelectTrigger
                className={errors['supplyItemId'] ? 'border-red-500 focus:ring-red-500' : ''}
              >
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
            {errors['supplyItemId'] && (
              <p className="text-xs text-red-500 flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">error</span>
                {errors['supplyItemId']}
              </p>
            )}
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

          <Separator />

          {existingStock ? (
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
              <p>
                Vật phẩm đã có trong kho nên lần nhập này sẽ tạo giao dịch nhập kho. Vui lòng nhập
                lý do nhập kho.
              </p>
            </div>
          ) : (
            <div className="rounded-xl border border-border bg-muted/20 p-4 text-sm text-muted-foreground space-y-1">
              <p>Vật phẩm chưa có trong kho nên hệ thống sẽ tạo mới một lô/stock trực tiếp.</p>
              <p>Trường hợp này không yêu cầu ghi chú vì API tạo stock không có trường ghi chú.</p>
            </div>
          )}

          {/* QUANTITY */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>
                Số lượng nhập <span className="text-red-500">*</span>
              </Label>
              <Input
                value={formatNumberInputVN(form.quantity)}
                className={errors['quantity'] ? 'border-red-500 focus:ring-red-500' : ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  update('quantity', parseFormattedNumber(e.target.value))
                }
              />
              {errors['quantity'] && (
                <p className="text-xs text-red-500 flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">error</span>
                  {errors['quantity']}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Đơn vị</Label>
              <Input
                value={form.unit}
                readOnly
                placeholder="Đơn vị sẽ tự động lấy theo vật tư đã chọn"
                className={errors['unit'] ? 'border-red-500 focus:ring-red-500' : ''}
              />
              {errors['unit'] && (
                <p className="text-xs text-red-500 flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">error</span>
                  {errors['unit']}
                </p>
              )}
            </div>
          </div>

          {/* CAPACITY */}
          <div className="space-y-2">
            <Label>
              {existingStock ? 'Sức chứa tối đa hiện tại' : 'Sức chứa tối đa (optional)'}
            </Label>
            <Input
              placeholder="Ví dụ: 1.000"
              value={formatNumberInputVN(form.capacity ?? '')}
              disabled={!!existingStock}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                update(
                  'capacity',
                  e.target.value ? parseFormattedNumber(e.target.value) : undefined,
                )
              }
            />
          </div>

          {existingStock && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Đơn giá nhập (tùy chọn)</Label>
                <Input
                  inputMode="numeric"
                  placeholder="Ví dụ: 15.000"
                  value={formatNumberInputVN(form.unitCost ?? '')}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    update(
                      'unitCost',
                      e.target.value ? parseFormattedNumber(e.target.value) : undefined,
                    )
                  }
                />
              </div>

              <div className="space-y-2">
                <Label>Nguồn tham chiếu</Label>
                <Input
                  placeholder="Ví dụ: Nhà cung cấp A / Biên bản số 12"
                  value={form.sourceReference || ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    update('sourceReference', e.target.value)
                  }
                />
              </div>
            </div>
          )}

          {existingStock && (
            <div className="space-y-2">
              <Label>Ngày hết hạn lô nhập (tùy chọn)</Label>
              <div className="space-y-3">
                <Button
                  type="button"
                  variant="outline"
                  className="gap-2"
                  onClick={() => {
                    if (openExpirationDateCalendarDialog) {
                      closeExpirationDateCalendarDialogAction();
                      return;
                    }

                    setOpenExpirationDateCalendarDialog(true);
                  }}
                >
                  <span className="material-symbols-outlined text-[16px]">calendar</span>
                  {form.expirationDate ? (
                    parseLocalDateFromYmd(form.expirationDate)?.toLocaleDateString('vi-VN')
                  ) : (
                    <span className="text-muted-foreground text-xs">Chọn ngày hết hạn</span>
                  )}
                </Button>

                {openExpirationDateCalendarDialog && (
                  <div className="rounded-xl border border-border bg-muted/20 p-3 w-fit">
                    <CustomCalendar
                      disabledDays={{ before: new Date() }}
                      value={parseLocalDateFromYmd(form.expirationDate)}
                      onChange={(date) => {
                        if (date) {
                          update('expirationDate', toUtcIsoFromDate(date));
                        } else {
                          update('expirationDate', '');
                        }

                        closeExpirationDateCalendarDialogAction();
                      }}
                    />

                    <div className="mt-3 flex justify-end gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          update('expirationDate', '');
                          closeExpirationDateCalendarDialogAction();
                        }}
                      >
                        Xóa ngày
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={closeExpirationDateCalendarDialogAction}
                      >
                        Đóng
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* EXPIRATION DATE – chỉ hiện khi tạo mới (chưa có stock) */}
          {!existingStock && (
            <div className="space-y-2">
              <Label>Ngày hết hạn lô hàng (tùy chọn)</Label>
              <div className="space-y-3">
                <Button
                  type="button"
                  variant="outline"
                  className="gap-2"
                  onClick={() => {
                    if (openExpirationDateCalendarDialog) {
                      closeExpirationDateCalendarDialogAction();
                      return;
                    }

                    setOpenExpirationDateCalendarDialog(true);
                  }}
                >
                  <span className="material-symbols-outlined text-[16px]">calendar</span>
                  {form.expirationDate ? (
                    parseLocalDateFromYmd(form.expirationDate)?.toLocaleDateString('vi-VN')
                  ) : (
                    <span className="text-muted-foreground text-xs">Chọn ngày hết hạn</span>
                  )}
                </Button>

                {openExpirationDateCalendarDialog && (
                  <div className="rounded-xl border border-border bg-muted/20 p-3 w-fit">
                    <CustomCalendar
                      disabledDays={{ before: new Date() }}
                      value={parseLocalDateFromYmd(form.expirationDate)}
                      onChange={(date) => {
                        if (date) {
                          update('expirationDate', toUtcIsoFromDate(date));
                        } else {
                          update('expirationDate', '');
                        }

                        closeExpirationDateCalendarDialogAction();
                      }}
                    />

                    <div className="mt-3 flex justify-end gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          update('expirationDate', '');
                          closeExpirationDateCalendarDialogAction();
                        }}
                      >
                        Xóa ngày
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={closeExpirationDateCalendarDialogAction}
                      >
                        Đóng
                      </Button>
                    </div>
                  </div>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Để trống nếu lô hàng không có hạn sử dụng cụ thể.
              </p>
            </div>
          )}

          {existingStock && (
            <div className="space-y-2">
              <Label>
                Lý do nhập kho <span className="text-red-500">*</span>
              </Label>
              <Textarea
                rows={3}
                placeholder="Ví dụ: Bổ sung vật tư do nhu cầu sử dụng tăng cao"
                value={form.note || ''}
                className={`resize-none ${errors['note'] ? 'border-red-500 focus:ring-red-500' : ''}`}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                  update('note', e.target.value)
                }
              />
              {errors['note'] && (
                <p className="text-xs text-red-500 flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">error</span>
                  {errors['note']}
                </p>
              )}
            </div>
          )}

          {submitError && (
            <div className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
              {submitError}
            </div>
          )}
        </div>

        {/* ACTIONS */}
        <div className="border-t border-border px-6 py-4 flex justify-end gap-2 bg-muted/40 shrink-0">
          <Button
            variant="outline"
            onClick={() => {
              clearDialogDraft(CREATE_ITEM_DRAFT_KEY);
              setErrors({});
              setForm(buildInitialForm(null));
            }}
          >
            <span className="material-symbols-outlined mr-1">remove_done</span>
            Xóa nháp
          </Button>
          <Button variant="destructive" onClick={() => onOpenChange(false)}>
            <span className="material-symbols-outlined mr-1">close</span>
            Hủy
          </Button>
          <Button
            variant="primary"
            disabled={submitting}
            onClick={async () => {
              const errs = validate();
              if (Object.keys(errs).length > 0) {
                setErrors(errs);
                return;
              }
              setSubmitError('');
              setSubmitting(true);
              try {
                const success = await onSubmit(form);
                if (success) {
                  clearDialogDraft(CREATE_ITEM_DRAFT_KEY);
                } else {
                  setSubmitError('Không thể nhập kho. Vui lòng kiểm tra thông tin và thử lại.');
                }
              } catch {
                setSubmitError('Không thể nhập kho. Vui lòng kiểm tra thông tin và thử lại.');
              } finally {
                setSubmitting(false);
              }
            }}
          >
            <span className="material-symbols-outlined mr-2">add</span>
            {submitting ? 'Đang nhập...' : 'Nhập kho'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
