import * as React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { formatNumberInputVN, parseFormattedNumber } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { CampaignAllocationDialogProps, ExportItem } from '@/types/exportInventory';
import { Textarea } from '@/components/ui/textarea';
import { clearDialogDraft, readDialogDraft, writeDialogDraft } from '@/lib/dialogDraft';
import { formatNumberVN } from '@/lib/utils';

/**
 * CampaignAllocationDialog
 *
 * Giao diện xuất vật tư kho vào chiến dịch của trạm (cấp phát cho chiến dịch).
 * Cùng UX với ExportInventoryDialog nhưng nhãn / logic phản ánh cấp phát chiến dịch.
 */
export function CampaignAllocationDialog({
  open,
  onOpenChange,
  items,
  campaigns,
  selectedCampaignId,
  onSubmit,
}: CampaignAllocationDialogProps) {
  const CAMPAIGN_ALLOCATION_DRAFT_KEY = 'coordinator-campaign-allocation-draft';
  const [selectedItems, setSelectedItems] = React.useState<ExportItem[]>([]);
  const [checkedItemIds, setCheckedItemIds] = React.useState<string[]>([]);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [note, setNote] = React.useState('');
  const [campaignId, setCampaignId] = React.useState('');
  const [errors, setErrors] = React.useState<{ campaign?: string; items?: string }>({});
  const [submitError, setSubmitError] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    const draft = readDialogDraft<{
      selectedItems: ExportItem[];
      checkedItemIds: string[];
      note: string;
      campaignId: string;
    } | null>(CAMPAIGN_ALLOCATION_DRAFT_KEY, null);

    if (draft) {
      setSelectedItems(draft.selectedItems || []);
      setCheckedItemIds(draft.checkedItemIds || []);
      setNote(draft.note || '');
      setCampaignId(draft.campaignId || '');
      setEditingId(null);
      setErrors({});
      setSubmitError('');
      return;
    }

    setSelectedItems([]);
    setCheckedItemIds([]);
    setNote('');
    setCampaignId(selectedCampaignId || '');
    setEditingId(null);
    setErrors({});
    setSubmitError('');
  }, [open, selectedCampaignId]);

  React.useEffect(() => {
    if (!open || !selectedCampaignId) return;
    setCampaignId((prev) => prev || selectedCampaignId);
  }, [open, selectedCampaignId]);

  React.useEffect(() => {
    writeDialogDraft(CAMPAIGN_ALLOCATION_DRAFT_KEY, {
      selectedItems,
      checkedItemIds,
      note,
      campaignId,
    });
  }, [selectedItems, checkedItemIds, note, campaignId]);

  const getStockBadgeClass = (current: number, capacity: number) => {
    const percent = (current / capacity) * 100;
    if (percent >= 70)
      return 'border-green-500/40 text-green-600 dark:text-green-400 bg-green-500/10';
    if (percent >= 40)
      return 'border-yellow-500/40 text-yellow-600 dark:text-yellow-400 bg-yellow-500/10';
    if (percent >= 15)
      return 'border-orange-500/40 text-orange-600 dark:text-orange-400 bg-orange-500/10';
    return 'border-red-500/40 text-red-600 dark:text-red-400 bg-red-500/10';
  };

  const addToAllocation = (item: ExportItem) => {
    setSelectedItems((prev) => {
      if (prev.some((i) => i.id === item.id)) return prev;
      return [...prev, { ...item, quantity: 1 }];
    });
    setErrors((prev) => ({ ...prev, items: undefined }));
  };

  const toggleCheckedItem = (id: string, checked: boolean) => {
    setCheckedItemIds((prev) => {
      if (checked) {
        return prev.includes(id) ? prev : [...prev, id];
      }

      return prev.filter((itemId) => itemId !== id);
    });
  };

  const addCheckedItems = () => {
    if (checkedItemIds.length === 0) return;

    setSelectedItems((prev) => {
      const existingIds = new Set(prev.map((item) => item.id));
      const itemsToAdd = items
        .filter((item) => checkedItemIds.includes(item.id) && !existingIds.has(item.id))
        .map((item) => ({ ...item, quantity: 1 }));

      return [...prev, ...itemsToAdd];
    });

    setErrors((prev) => ({ ...prev, items: undefined }));
    setCheckedItemIds([]);
  };

  const addAllItems = () => {
    setSelectedItems((prev) => {
      const existingIds = new Set(prev.map((item) => item.id));
      const itemsToAdd = items
        .filter((item) => !existingIds.has(item.id))
        .map((item) => ({ ...item, quantity: 1 }));

      return [...prev, ...itemsToAdd];
    });

    setErrors((prev) => ({ ...prev, items: undefined }));
    setCheckedItemIds([]);
  };

  const updateQty = (id: string, delta: number) => {
    setSelectedItems((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              quantity: Math.max(1, Math.min(item.current, (item.quantity ?? 0) + delta)),
            }
          : item,
      ),
    );
  };

  const setQty = (id: string, value: number) => {
    setSelectedItems((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              quantity: Math.max(1, Math.min(item.current, value || 1)),
            }
          : item,
      ),
    );
  };

  const removeItem = (id: string) => {
    setSelectedItems((prev) => prev.filter((i) => i.id !== id));
  };

  const totalLines = selectedItems.length;
  const editingItem = selectedItems.find((item) => item.id === editingId) || null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!max-w-none w-[95vw] max-h-[90vh] p-0 overflow-hidden">
        {/* HEADER */}
        <DialogHeader className="px-6 py-4 border-b border-border">
          <DialogTitle className="text-2xl font-bold text-foreground">
            Cấp phát vật tư cho chiến dịch
          </DialogTitle>
        </DialogHeader>

        {/* BODY */}
        <div className="flex min-h-0 max-h-[calc(90vh-80px)] overflow-hidden">
          {/* LEFT – INVENTORY */}
          <div className="flex-1 p-6 overflow-y-auto min-h-0 space-y-4">
            <div className="space-y-3">
              <div>
                <h3 className="font-medium text-foreground">Vật tư hiện có trong kho trạm</h3>
                <p className="text-sm text-muted-foreground">
                  Chọn vật tư từ kho trạm để thêm vào phiếu cấp phát. Các vật tư đã thêm sẽ không bị
                  lặp lại.
                </p>
              </div>

              <div className="flex flex-col gap-2 rounded-xl border border-border bg-muted/30 p-3 md:flex-row md:items-center md:justify-between">
                <p className="text-sm text-muted-foreground">
                  Đã chọn{' '}
                  <span className="font-semibold text-foreground">{checkedItemIds.length}</span> vật
                  tư để thêm vào phiếu.
                </p>

                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={checkedItemIds.length === 0}
                    onClick={addCheckedItems}
                  >
                    <span className="material-symbols-outlined text-sm mr-1">playlist_add</span>
                    Thêm mục đã chọn
                  </Button>

                  <Button size="sm" variant="outline" onClick={addAllItems}>
                    <span className="material-symbols-outlined text-sm mr-1">select_all</span>
                    Thêm tất cả
                  </Button>
                </div>
              </div>
            </div>

            {items.map((item) => {
              const added = selectedItems.some((i) => i.id === item.id);
              const checked = checkedItemIds.includes(item.id);

              return (
                <div
                  key={item.id}
                  className={cn(
                    'flex items-center gap-4 border rounded-xl p-4 bg-card transition-colors',
                    checked ? 'border-primary/50 bg-primary/5' : 'border-border',
                  )}
                >
                  <label className="flex items-center justify-center">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                      checked={checked}
                      disabled={added}
                      onChange={(e) => toggleCheckedItem(item.id, e.target.checked)}
                      aria-label={`Chọn vật tư ${item.name}`}
                    />
                  </label>

                  {item.icon && (
                    <span className="material-symbols-outlined text-3xl text-primary">
                      {item.icon}
                    </span>
                  )}

                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground line-clamp-2" title={item.name}>
                      {item.name}
                    </p>
                    <p className="text-xs text-muted-foreground">{item.category}</p>

                    <Badge
                      variant="outline"
                      className={cn(
                        'mt-1 text-xs font-normal',
                        getStockBadgeClass(item.current, item.capacity),
                      )}
                    >
                      Tồn: {formatNumberVN(item.current)}/{formatNumberVN(item.capacity)}{' '}
                      {item.unit}
                    </Badge>
                  </div>

                  <Button
                    size="sm"
                    variant={added ? 'success' : 'outline'}
                    disabled={added}
                    onClick={() => {
                      addToAllocation(item);
                      toggleCheckedItem(item.id, false);
                    }}
                  >
                    <span className="material-symbols-outlined text-sm mr-1">add</span>
                    {added ? 'Đã thêm vào phiếu' : 'Thêm nhanh'}
                  </Button>
                </div>
              );
            })}
          </div>

          {/* RIGHT – ALLOCATION SLIP */}
          <div className="w-[420px] min-w-0 border-l border-border bg-muted/40 flex flex-col min-h-0 overflow-hidden">
            <div className="sticky top-0 z-10 border-b border-border bg-muted/40 px-6 pt-6 pb-4 backdrop-blur supports-[backdrop-filter]:bg-muted/75 shrink-0">
              <h3 className="font-semibold text-lg mb-4 text-foreground">
                Phiếu cấp phát chiến dịch
              </h3>

              <div className="mb-4 rounded-xl border border-primary/20 bg-primary/5 p-3 text-sm text-muted-foreground">
                Bạn có thể điều chỉnh số lượng từng dòng trước khi xác nhận cấp phát.
              </div>

              {/* CAMPAIGN */}
              <p className="text-sm font-medium mb-2 text-foreground">Chiến dịch nhận cấp phát</p>
              <select
                value={campaignId}
                onChange={(e) => {
                  setCampaignId(e.target.value);
                  setErrors((prev) => ({ ...prev, campaign: undefined }));
                  setSubmitError('');
                }}
                className={`w-full h-10 rounded-md border bg-background px-3 text-sm ${errors.campaign ? 'border-red-500' : 'border-border'}`}
                title={campaigns.find((campaign) => campaign.id === campaignId)?.name || ''}
              >
                <option value="">Chọn chiến dịch</option>
                {campaigns.map((campaign) => (
                  <option key={campaign.id} value={campaign.id} title={campaign.name}>
                    {campaign.name}
                  </option>
                ))}
              </select>

              {errors.campaign && (
                <p className="text-xs text-red-500 flex items-center gap-1 mt-1">
                  <span className="material-symbols-outlined text-[14px]">error</span>
                  {errors.campaign}
                </p>
              )}
              {submitError && (
                <div className="mt-3 rounded-xl border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {submitError}
                </div>
              )}
              {campaigns.length === 0 && (
                <p className="text-xs text-muted-foreground mt-1">
                  Chưa có chiến dịch nào thuộc trạm này.
                </p>
              )}
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto px-6 pb-6 pr-5">
              {/* SCROLL AREA */}
              <div className="space-y-4 text-sm">
                {errors.items && (
                  <p className="text-xs text-red-500 flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">error</span>
                    {errors.items}
                  </p>
                )}
                {selectedItems.map((item) => (
                  <div key={item.id} className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0 pr-2">
                      <p className="font-medium text-foreground line-clamp-2" title={item.name}>
                        {item.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Còn lại: {formatNumberVN(item.current - (item.quantity ?? 0))} {item.unit}
                      </p>
                    </div>

                    <div className="grid max-w-full shrink-0 grid-cols-[36px_minmax(72px,1fr)_auto_36px_36px] items-center gap-1 sm:w-[248px]">
                      <Button
                        size="icon"
                        variant="outline"
                        className="shrink-0"
                        onClick={() => updateQty(item.id, -1)}
                      >
                        −
                      </Button>

                      <TooltipProvider>
                        <Tooltip open={editingId === item.id ? false : undefined}>
                          <TooltipTrigger asChild>
                            <div
                              className="relative h-8 min-w-[72px] max-w-[104px] overflow-hidden rounded-md border border-transparent px-2 flex items-center justify-end justify-self-stretch"
                              onClick={() => setEditingId(item.id)}
                            >
                              {editingId === item.id ? (
                                <input
                                  autoFocus
                                  value={formatNumberInputVN(
                                    editingItem?.quantity ?? item.quantity ?? 1,
                                  )}
                                  className="absolute inset-0 w-full min-w-0 rounded-md border border-border bg-background px-2 text-right text-sm tabular-nums whitespace-nowrap text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                                  inputMode="numeric"
                                  onChange={(e) => {
                                    setQty(item.id, parseFormattedNumber(e.target.value));
                                  }}
                                  onBlur={(e) => {
                                    setQty(item.id, parseFormattedNumber(e.target.value));
                                    setEditingId(null);
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      setQty(
                                        item.id,
                                        parseFormattedNumber((e.target as HTMLInputElement).value),
                                      );
                                      setEditingId(null);
                                    }
                                    if (e.key === 'Escape') {
                                      setEditingId(null);
                                    }
                                  }}
                                />
                              ) : (
                                <span className="font-semibold tabular-nums whitespace-nowrap truncate cursor-pointer hover:text-primary hover:underline transition-colors">
                                  {formatNumberInputVN(item.quantity ?? 0)}
                                </span>
                              )}
                            </div>
                          </TooltipTrigger>

                          <TooltipContent>Nhấn để chỉnh số lượng</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>

                      <span className="min-w-[36px] shrink-0 text-xs text-muted-foreground text-left whitespace-nowrap">
                        /{item.unit}
                      </span>

                      <Button
                        size="icon"
                        variant="outline"
                        className="shrink-0"
                        onClick={() => updateQty(item.id, 1)}
                      >
                        +
                      </Button>

                      <Button
                        size="icon"
                        variant="ghost"
                        className="shrink-0 text-destructive hover:bg-destructive/10"
                        onClick={() => removeItem(item.id)}
                      >
                        <span className="material-symbols-outlined text-[20px]">close</span>
                      </Button>
                    </div>
                  </div>
                ))}

                {totalLines === 0 && (
                  <p className="text-sm text-muted-foreground italic">
                    Chưa có vật tư nào trong phiếu cấp phát
                  </p>
                )}

                <Separator />

                <div className="flex justify-between font-semibold">
                  <span>Tổng</span>
                  <span>{totalLines} mặt hàng</span>
                </div>
              </div>

              {/* NOTE */}
              <div className="mt-4">
                <p className="text-sm font-medium mb-2 text-foreground">Ghi chú</p>
                <Textarea
                  rows={3}
                  value={note}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNote(e.target.value)}
                  placeholder="Ví dụ: Cấp phát cho chiến dịch cứu trợ miền Trung"
                  className="text-sm"
                />
              </div>
            </div>

            {/* ACTION */}
            <div className="sticky bottom-0 z-10 flex flex-wrap gap-2 border-t border-border bg-muted/40 px-6 py-4 backdrop-blur supports-[backdrop-filter]:bg-muted/75 shrink-0">
              <Button
                variant="outline"
                disabled={submitting}
                onClick={() => {
                  clearDialogDraft(CAMPAIGN_ALLOCATION_DRAFT_KEY);
                  setSelectedItems([]);
                  setCheckedItemIds([]);
                  setNote('');
                  setCampaignId('');
                  setEditingId(null);
                  setErrors({});
                }}
              >
                <span className="material-symbols-outlined mr-1">remove_done</span>
                Xóa nháp
              </Button>

              <Button
                variant="destructive"
                disabled={submitting}
                onClick={() => onOpenChange(false)}
              >
                <span className="material-symbols-outlined">close</span>
                Hủy
              </Button>
              <Button
                variant="primary"
                disabled={submitting}
                onClick={async () => {
                  const errs: { campaign?: string; items?: string } = {};
                  if (!campaignId) errs.campaign = 'Vui lòng chọn chiến dịch nhận cấp phát.';
                  if (totalLines === 0)
                    errs.items = 'Vui lòng thêm ít nhất một vật tư vào phiếu cấp phát.';
                  if (Object.keys(errs).length > 0) {
                    setErrors(errs);
                    return;
                  }
                  setSubmitError('');
                  setSubmitting(true);
                  try {
                    const success = await onSubmit(selectedItems, note, campaignId);
                    if (success) {
                      clearDialogDraft(CAMPAIGN_ALLOCATION_DRAFT_KEY);
                    } else {
                      setSubmitError(
                        'Không thể cấp phát vật tư cho chiến dịch. Vui lòng kiểm tra lại thông tin và thử lại.',
                      );
                    }
                  } catch {
                    setSubmitError(
                      'Không thể cấp phát vật tư cho chiến dịch. Vui lòng kiểm tra lại thông tin và thử lại.',
                    );
                  } finally {
                    setSubmitting(false);
                  }
                }}
              >
                <span className="material-symbols-outlined mr-2">outbound</span>
                {submitting ? 'Đang cấp phát...' : 'Xác nhận cấp phát'}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
