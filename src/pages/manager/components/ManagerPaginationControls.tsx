import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatNumberVN, normalizeNumberInput, parseFormattedNumber } from '@/lib/utils';

type PaginationData = {
  currentPage: number;
  totalPages: number;
  totalCount: number;
  hasPrevious: boolean;
  hasNext: boolean;
};

export function ManagerPaginationControls({
  pagination,
  itemLabel,
  jumpValue,
  onJumpValueChange,
  onJump,
  onPrevious,
  onNext,
}: {
  pagination: PaginationData | null | undefined;
  itemLabel: string;
  jumpValue: string;
  onJumpValueChange: (value: string) => void;
  onJump: () => void;
  onPrevious: () => void;
  onNext: () => void;
}) {
  if (!pagination || pagination.totalCount <= 0) return null;

  return (
    <div className="flex flex-col gap-3 px-5 py-4 border-t border-border sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-muted-foreground">
        Trang {formatNumberVN(pagination.currentPage)}/{formatNumberVN(pagination.totalPages)} —
        Tổng {formatNumberVN(pagination.totalCount)} {itemLabel}
      </p>

      <div className="flex flex-wrap items-center gap-2">
        <Button variant="primary" size="sm" disabled={!pagination.hasPrevious} onClick={onPrevious}>
          Trước <span className="material-symbols-outlined text-sm">chevron_left</span>
        </Button>

        <div className="flex items-center gap-2">
          <Input
            value={jumpValue}
            onChange={(e) => onJumpValueChange(normalizeNumberInput(e.target.value))}
            inputMode="numeric"
            placeholder="Trang"
            className="h-6 w-10 text-center"
          />
          <Button
            variant="outline"
            size="sm"
            disabled={!jumpValue || parseFormattedNumber(jumpValue) < 1}
            onClick={onJump}
          >
            Đi tới <span className="material-symbols-outlined text-sm">arrow_forward</span>
          </Button>
        </div>

        <Button variant="primary" size="sm" disabled={!pagination.hasNext} onClick={onNext}>
          Sau <span className="material-symbols-outlined text-sm">chevron_right</span>
        </Button>
      </div>
    </div>
  );
}
