import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

function buildPageItems(currentPage: number, totalPages: number): Array<number | 'ellipsis'> {
  if (totalPages <= 1) return [1];

  const pages = new Set<number>([1, totalPages, currentPage]);
  if (currentPage > 1) pages.add(currentPage - 1);
  if (currentPage < totalPages) pages.add(currentPage + 1);

  const sorted = Array.from(pages).sort((a, b) => a - b);
  const items: Array<number | 'ellipsis'> = [];

  sorted.forEach((page, index) => {
    const prev = sorted[index - 1];
    if (prev && page - prev > 1) items.push('ellipsis');
    items.push(page);
  });

  return items;
}

export function CoordinatorListPagination({
  currentPage,
  totalPages,
  onPageChange,
  summary,
  labels,
}: {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  summary: ReactNode;
  labels?: {
    previous?: string;
    next?: string;
    jumpTo?: string;
    go?: string;
  };
}) {
  const [pageInput, setPageInput] = useState(String(currentPage));

  useEffect(() => {
    setPageInput(String(currentPage));
  }, [currentPage]);

  const items = useMemo(() => buildPageItems(currentPage, totalPages), [currentPage, totalPages]);

  const handleJump = () => {
    const nextPage = Number(pageInput);
    if (!Number.isFinite(nextPage)) {
      setPageInput(String(currentPage));
      return;
    }

    onPageChange(Math.min(Math.max(1, Math.trunc(nextPage)), totalPages));
  };

  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <div className="text-xs text-muted-foreground">{summary}</div>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          className="gap-1"
          disabled={currentPage <= 1}
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
        >
          <span className="material-symbols-outlined text-sm">chevron_left</span>
          {labels?.previous ?? 'Trước'}
        </Button>

        {items.map((item, index) =>
          item === 'ellipsis' ? (
            <span key={`ellipsis-${index}`} className="px-1 text-sm text-muted-foreground">
              ...
            </span>
          ) : (
            <Button
              key={item}
              size="sm"
              variant={item === currentPage ? 'primary' : 'outline'}
              className="min-w-9"
              onClick={() => onPageChange(item)}
            >
              {item}
            </Button>
          ),
        )}

        <Button
          size="sm"
          variant="outline"
          className="gap-1"
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
        >
          {labels?.next ?? 'Sau'}
          <span className="material-symbols-outlined text-sm">chevron_right</span>
        </Button>

        <div className="flex items-center gap-2 rounded-full border border-border px-2 py-1">
          <span className="text-xs text-muted-foreground">{labels?.jumpTo ?? 'Tới trang'}</span>
          <Input
            value={pageInput}
            onChange={(e) => setPageInput(e.target.value.replace(/[^0-9]/g, ''))}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleJump();
            }}
            className="h-8 w-14 border-0 px-2 text-center shadow-none focus-visible:ring-0"
          />
          <Button size="sm" variant="ghost" className="h-8 px-2" onClick={handleJump}>
            {labels?.go ?? 'Đi'}
          </Button>
        </div>
      </div>
    </div>
  );
}
