import { Button } from '@/components/ui/button';

export function ReliefPaginationBar({
  currentPage,
  totalPages,
  onPrevious,
  onNext,
}: {
  currentPage: number;
  totalPages: number;
  onPrevious: () => void;
  onNext: () => void;
}) {
  return (
    <div className="mt-4 flex items-center justify-between gap-3">
      <p className="text-sm text-muted-foreground">
        Trang {currentPage}/{totalPages}
      </p>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          disabled={currentPage === 1}
          onClick={onPrevious}
        >
          <span className="material-symbols-outlined text-[18px]">chevron_left</span>
          Trang trước
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          disabled={currentPage >= totalPages}
          onClick={onNext}
        >
          <span className="material-symbols-outlined text-[18px]">chevron_right</span>
          Trang sau
        </Button>
      </div>
    </div>
  );
}
