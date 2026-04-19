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
import { useCampaignInventoryBalance } from '@/hooks/useCampaigns';
import { formatNumberVN } from '@/lib/utils';
import { getCampaignStatusClass } from '@/enums/beEnums';

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
  const effectiveCampaignId = campaignId || selectedCampaignId || '';
  const { inventoryBalance, isLoading: isLoadingInventoryBalance } =
    useCampaignInventoryBalance(effectiveCampaignId);

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
      <DialogContent className="!max-w-none w-[95vw] h-[90vh] p-0 overflow-hidden">
        {/* HEADER */}
        <DialogHeader className="px-6 py-4 border-b border-border">
          <DialogTitle className="text-2xl font-bold text-foreground">
            Cấp phát vật tư cho chiến dịch
          </DialogTitle>
        </DialogHeader>

        {/* BODY */}
        <div className="flex h-full min-h-0">
          {/* LEFT – INVENTORY */}
          <div className="flex-1 p-6 overflow-y-auto min-h-0 space-y-4">
            <div className="space-y-3">
              <div>
                <h3 className="font-medium text-foreground">Vật tư hiện có trong kho trạm</h3>
                <p className="text-sm text-muted-foreground">
                  Chọn một hoặc nhiều vật tư từ kho trạm để thêm vào phiếu cấp phát cho chiến dịch.
                  Những vật tư đã có trong phiếu sẽ không bị thêm trùng.
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
                    <p className="font-semibold truncate text-foreground">{item.name}</p>
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
                    {added ? 'Đã có trong phiếu' : 'Thêm nhanh'}
                  </Button>
                </div>
              );
            })}
          </div>

          {/* RIGHT – ALLOCATION SLIP */}
          <div className="w-[420px] border-l border-border bg-muted/40 p-6 flex flex-col min-h-0">
            <h3 className="font-semibold text-lg mb-4 text-foreground">
              Phiếu cấp phát chiến dịch
            </h3>

            <div className="mb-4 rounded-xl border border-primary/20 bg-primary/5 p-3 text-sm text-muted-foreground">
              Sau khi thêm vật tư vào phiếu, bạn vẫn có thể điều chỉnh số lượng từng dòng trước khi
              xác nhận.
            </div>

            {/* CAMPAIGN */}
            <div className="mb-4">
              <p className="text-sm font-medium mb-2 text-foreground">Chiến dịch nhận cấp phát</p>
              <select
                value={campaignId}
                onChange={(e) => {
                  setCampaignId(e.target.value);
                  setErrors((prev) => ({ ...prev, campaign: undefined }));
                  setSubmitError('');
                }}
                className={`w-full h-10 rounded-md border bg-background px-3 text-sm ${errors.campaign ? 'border-red-500' : 'border-border'}`}
              >
                <option value="">-- Chọn chiến dịch --</option>
                {campaigns.map((campaign) => (
                  <option key={campaign.id} value={campaign.id}>
                    {campaign.name} - {campaign.statusLabel || 'Đủ điều kiện cấp phát'}
                  </option>
                ))}
              </select>

              {campaignId && (
                <div className="mt-2">
                  {(() => {
                    const selectedCampaign = campaigns.find(
                      (campaign) => campaign.id === campaignId,
                    );
                    if (!selectedCampaign || selectedCampaign.status == null) return null;

                    return (
                      <Badge
                        variant="outline"
                        appearance="outline"
                        size="sm"
                        className={`gap-1.5 border ${getCampaignStatusClass(Number(selectedCampaign.status))}`}
                      >
                        <span className="material-symbols-outlined text-[15px] shrink-0">
                          campaign
                        </span>
                        <span>{selectedCampaign.statusLabel || 'Đủ điều kiện cấp phát'}</span>
                      </Badge>
                    );
                  })()}
                </div>
              )}
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

            {effectiveCampaignId && (
              <div className="mb-4 rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-foreground">Ngân sách chiến dịch</p>
                  {isLoadingInventoryBalance && (
                    <span className="text-xs text-muted-foreground">Đang tải...</span>
                  )}
                </div>

                {!isLoadingInventoryBalance && inventoryBalance ? (
                  <>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                      <div className="rounded-lg border border-border bg-background/80 p-3">
                        <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">
                          Ngân sách tổng
                        </p>
                        <p className="mt-1 text-sm font-semibold text-foreground">
                          {formatNumberVN(inventoryBalance.budgetTotal)}
                        </p>
                      </div>
                      <div className="rounded-lg border border-border bg-background/80 p-3">
                        <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">
                          Đã chi
                        </p>
                        <p className="mt-1 text-sm font-semibold text-foreground">
                          {formatNumberVN(inventoryBalance.budgetSpent)}
                        </p>
                      </div>
                      <div className="rounded-lg border border-border bg-background/80 p-3">
                        <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">
                          Còn lại
                        </p>
                        <p className="mt-1 text-sm font-semibold text-foreground">
                          {formatNumberVN(inventoryBalance.remainingBudget)}
                        </p>
                      </div>
                    </div>
                  </>
                ) : null}
              </div>
            )}

            {/* SCROLL AREA */}
            <div className="flex-1 min-h-0 overflow-y-auto space-y-4 text-sm">
              {errors.items && (
                <p className="text-xs text-red-500 flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">error</span>
                  {errors.items}
                </p>
              )}
              {selectedItems.map((item) => (
                <div key={item.id} className="flex justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium truncate text-foreground">{item.name}</p>
                    <p className="text-xs text-muted-foreground">
                      Còn lại: {formatNumberVN(item.current - (item.quantity ?? 0))} {item.unit}
                    </p>
                  </div>

                  <div className="flex items-center gap-1 w-[220px] justify-end">
                    <Button size="icon" variant="outline" onClick={() => updateQty(item.id, -1)}>
                      −
                    </Button>

                    <TooltipProvider>
                      <Tooltip open={editingId === item.id ? false : undefined}>
                        <TooltipTrigger asChild>
                          <div
                            className="relative w-10 h-8 flex items-center justify-center"
                            onClick={() => setEditingId(item.id)}
                          >
                            {editingId === item.id ? (
                              <input
                                autoFocus
                                value={formatNumberInputVN(
                                  editingItem?.quantity ?? item.quantity ?? 1,
                                )}
                                className="absolute inset-0 rounded-md border border-border bg-background text-center text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
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
                              <span className="font-semibold cursor-pointer hover:text-primary hover:underline transition-colors">
                                {formatNumberInputVN(item.quantity ?? 0)}
                              </span>
                            )}
                          </div>
                        </TooltipTrigger>

                        <TooltipContent>Nhấn để chỉnh số lượng</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>

                    <span className="w-12 text-xs text-muted-foreground text-center">
                      /{item.unit}
                    </span>

                    <Button size="icon" variant="outline" onClick={() => updateQty(item.id, 1)}>
                      +
                    </Button>

                    <Button
                      size="icon"
                      variant="ghost"
                      className="text-destructive hover:bg-destructive/10"
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
                rows={2}
                value={note}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNote(e.target.value)}
                placeholder="Ví dụ: Cấp phát cho chiến dịch cứu trợ miền Trung"
                className="resize-none text-sm"
              />
            </div>

            {/* ACTION */}
            <div className="flex flex-row gap-2 pt-6 space-y-2">
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
