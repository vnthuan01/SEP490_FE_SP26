import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  ManagerSupplyItemFormCard,
  type SupplyEditableDraft,
  type SupplyEditableDraftKey,
} from './ManagerSupplyItemFormCard';

type CreateDraft = SupplyEditableDraft & { id: string };
type BulkDraft = SupplyEditableDraft & { draftId: string; supplyItemId: string };

export function ManagerCreateSupplyDialog({
  open,
  onOpenChange,
  drafts,
  onDraftChange,
  onAddDraft,
  onRemoveDraft,
  onSubmit,
  isPending,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  drafts: CreateDraft[];
  onDraftChange: (id: string, key: SupplyEditableDraftKey, value: string) => void;
  onAddDraft: () => void;
  onRemoveDraft: (id: string) => void;
  onSubmit: () => void;
  isPending: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!max-w-none w-[94vw] max-w-5xl h-[88vh] overflow-hidden p-0 flex flex-col">
        <DialogHeader className="px-6 py-4 border-b border-border">
          <DialogTitle>Tạo nhiều vật phẩm cứu trợ</DialogTitle>
          <DialogDescription>
            Có thể nhập nhiều vật phẩm trong một lần lưu. Hệ thống sẽ gửi nhiều yêu cầu tạo tương
            ứng.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto p-6 space-y-4">
          {drafts.map((item, index) => (
            <div key={item.id} className="space-y-3">
              <ManagerSupplyItemFormCard
                item={item}
                index={index}
                title="Vật phẩm"
                description="Điền đủ thông tin để thêm vào danh mục Vật phẩm/Hàng hóa."
                onChange={(key, value) => onDraftChange(item.id, key, value)}
              />
              {drafts.length > 1 && (
                <div className="flex justify-end">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive"
                    onClick={() => onRemoveDraft(item.id)}
                  >
                    <span className="material-symbols-outlined text-lg">delete</span>
                    Xóa dòng
                  </Button>
                </div>
              )}
            </div>
          ))}

          <Button variant="outline" className="gap-2" onClick={onAddDraft}>
            <span className="material-symbols-outlined text-lg">add</span>
            Thêm một vật phẩm nữa
          </Button>
        </div>

        <DialogFooter className="px-6 py-4 border-t border-border bg-background shrink-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Hủy
          </Button>
          <Button onClick={onSubmit} disabled={isPending}>
            {isPending ? 'Đang tạo...' : 'Tạo danh mục vật phẩm'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function ManagerBulkEditSupplyDialog({
  open,
  onOpenChange,
  drafts,
  onDraftChange,
  onSubmit,
  isPending,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  drafts: BulkDraft[];
  onDraftChange: (draftId: string, key: SupplyEditableDraftKey, value: string) => void;
  onSubmit: () => void;
  isPending: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!max-w-none w-[94vw] max-w-5xl h-[88vh] overflow-hidden p-0 flex flex-col">
        <DialogHeader className="px-6 py-4 border-b border-border">
          <DialogTitle>Cập nhật nhiều vật phẩm</DialogTitle>
          <DialogDescription>
            Đang cập nhật {drafts.length} vật phẩm đã chọn trong cùng một lần lưu.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto p-6 space-y-4">
          {drafts.length === 0 ? (
            <div className="rounded-xl border border-border bg-muted/20 p-6 text-sm text-muted-foreground">
              Không có vật phẩm hợp lệ để cập nhật. Hãy chọn lại danh sách vật phẩm rồi thử lại.
            </div>
          ) : (
            drafts.map((item, index) => (
              <ManagerSupplyItemFormCard
                key={item.draftId}
                item={item}
                index={index}
                title="Vật phẩm"
                description="Mỗi vật phẩm có input và id riêng, có thể chỉnh độc lập rồi lưu cùng lúc."
                onChange={(key, value) => onDraftChange(item.draftId, key, value)}
                showItemBadge
              />
            ))
          )}
        </div>

        <DialogFooter className="px-6 py-4 border-t border-border bg-background shrink-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Hủy
          </Button>
          <Button onClick={onSubmit} disabled={isPending}>
            {isPending ? 'Đang lưu...' : 'Lưu cập nhật đã chọn'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
