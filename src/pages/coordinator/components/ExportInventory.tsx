import * as React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { formatNumberInputVN, parseFormattedNumber } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { ExportInventoryDialogProps, ExportItem } from '@/types/exportInventory';
import { Textarea } from '@/components/ui/textarea';

export function ExportInventoryDialog({
  open,
  onOpenChange,
  items,
  teams,
  onSubmit,
}: ExportInventoryDialogProps) {
  /* TOÀN BỘ KHO */
  const [inventory] = React.useState<ExportItem[]>(items);

  /* ITEM ĐANG TRONG PHIẾU */
  const [selectedItems, setSelectedItems] = React.useState<ExportItem[]>([]);

  /* ITEM ĐANG EDIT SỐ LƯỢNG */
  const [editingId, setEditingId] = React.useState<string | null>(null);

  /* GHI CHÚ */
  const [note, setNote] = React.useState('');

  /* ĐỘI NHẬN */
  const [teamId, setTeamId] = React.useState('');

  /* RESET */
  React.useEffect(() => {
    if (!open) return;
    setSelectedItems([]);
    setNote('');
    setTeamId('');
    setEditingId(null);
  }, [open]);

  /* ================= STOCK BADGE ================= */
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

  /* ================= ACTIONS ================= */
  const addToExport = (item: ExportItem) => {
    setSelectedItems((prev) => {
      if (prev.some((i) => i.id === item.id)) return prev;
      return [...prev, { ...item, quantity: 1 }];
    });
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="
      !max-w-none
      w-[95vw]
      h-[90vh]
      p-0
      overflow-hidden
    "
      >
        {/* HEADER */}
        <DialogHeader className="px-6 py-4 border-b border-border">
          <DialogTitle className="text-2xl font-bold text-foreground">
            Xuất kho cho đội cứu trợ
          </DialogTitle>
        </DialogHeader>

        {/* BODY */}
        <div className="flex h-full min-h-0">
          {/* ================= LEFT – INVENTORY ================= */}
          <div className="flex-1 p-6 overflow-y-auto min-h-0 space-y-4">
            <h3 className="font-medium">Danh sách vật liệu có trong kho tổng:</h3>
            {inventory.map((item) => {
              const added = selectedItems.some((i) => i.id === item.id);

              return (
                <div
                  key={item.id}
                  className="flex items-center gap-4 border border-border rounded-xl p-4 bg-card"
                >
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
                      Tồn: {item.current}/{item.capacity} {item.unit}
                    </Badge>
                  </div>

                  <Button
                    size="sm"
                    variant={added ? 'success' : 'outline'}
                    disabled={added}
                    onClick={() => addToExport(item)}
                  >
                    <span className="material-symbols-outlined text-sm mr-1">add</span>
                    {added ? 'Đã thêm' : 'Thêm vào phiếu'}
                  </Button>
                </div>
              );
            })}
          </div>

          {/* ================= RIGHT – EXPORT SLIP ================= */}
          <div className="w-[420px] border-l border-border bg-muted/40 p-6 flex flex-col min-h-0">
            <h3 className="font-semibold text-lg mb-4 text-foreground">Phiếu xuất kho</h3>

            {/* TEAM */}
            <div className="mb-4">
              <p className="text-sm font-medium mb-2 text-foreground">Đội nhận hàng</p>
              <select
                value={teamId}
                onChange={(e) => setTeamId(e.target.value)}
                className="w-full h-10 rounded-md border border-border bg-background px-3 text-sm"
              >
                <option value="">-- Chọn đội --</option>
                {teams.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.name}
                  </option>
                ))}
              </select>
            </div>

            {/* ================= SCROLL AREA ================= */}
            <div className="flex-1 min-h-0 overflow-y-auto space-y-4 text-sm">
              {selectedItems.map((item) => (
                <div key={item.id} className="flex justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium truncate text-foreground">{item.name}</p>
                    <p className="text-xs text-muted-foreground">
                      Còn lại: {item.current - (item.quantity ?? 0)} {item.unit}
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
                                defaultValue={formatNumberInputVN(item.quantity ?? 1)}
                                className="
              absolute inset-0
              rounded-md border border-border bg-background
              text-center text-sm text-foreground
              focus:outline-none focus:ring-2 focus:ring-primary
            "
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
                              <span
                                className="
              font-semibold cursor-pointer
              hover:text-primary hover:underline
              transition-colors
            "
                              >
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
                <p className="text-sm text-muted-foreground italic">Chưa có sản phẩm nào</p>
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
                placeholder="Ví dụ: Xuất cho đội miền Trung"
                className="resize-none text-sm"
              />
            </div>

            {/* ACTION */}
            <div className="flex flex-row gap-2 pt-6 space-y-2">
              <Button
                variant="primary"
                disabled={totalLines === 0 || !teamId}
                onClick={() => onSubmit(selectedItems, note, teamId)}
              >
                <span className="material-symbols-outlined mr-2">outbound</span>
                Xác nhận xuất kho
              </Button>

              <Button variant="destructive" onClick={() => onOpenChange(false)}>
                <span className="material-symbols-outlined ">close</span>
                Hủy
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
