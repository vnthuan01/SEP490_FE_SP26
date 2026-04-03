import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  getSupplyCategoryClass,
  getSupplyCategoryIcon,
  getSupplyCategoryLabel,
} from '@/enums/beEnums';
import { cn } from '@/lib/utils';

export const RequiredMark = () => <span className="text-red-500">*</span>;

export const IconGuide = () => (
  <TooltipProvider>
    <Tooltip delayDuration={200}>
      <TooltipTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center text-muted-foreground hover:text-foreground transition-colors"
        >
          <span className="material-symbols-outlined text-[18px]">help</span>
        </button>
      </TooltipTrigger>
      <TooltipContent
        side="top"
        align="start"
        variant="light"
        className="max-w-[280px] rounded-lg border border-border bg-background text-foreground p-3 leading-relaxed"
      >
        <p className="font-semibold mb-1">Cách lấy icon từ Google Material</p>
        <p className="text-muted-foreground">
          Truy cập{' '}
          <a
            href="https://fonts.google.com/icons"
            target="_blank"
            rel="noreferrer"
            className="underline text-primary"
          >
            Google Material Symbols
          </a>{' '}
          rồi sao chép tên icon.
        </p>
        <p className="mt-2 text-muted-foreground">Ví dụ: inventory_2, water_drop, medication</p>
      </TooltipContent>
    </Tooltip>
  </TooltipProvider>
);

export function StatCard({
  label,
  value,
  icon,
  iconClass,
  note,
  className,
}: {
  label: string;
  value: string | number;
  icon?: string;
  iconClass?: string;
  note: string;
  className?: string;
}) {
  return (
    <Card className={cn('border-border bg-card', className)}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{label}</p>
            <p className="mt-2 text-3xl font-black text-foreground">{value}</p>
            <p className="mt-2 text-xs text-muted-foreground">{note}</p>
          </div>
          <div
            className={cn(
              `size-10 rounded-2xl border border-border flex items-center justify-center ${iconClass}`,
            )}
          >
            <span className="material-symbols-outlined text-[22px]">{icon}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function SupplyCategoryBadge({ category }: { category: unknown }) {
  return (
    <Badge
      variant="outline"
      appearance="outline"
      size="sm"
      className={`gap-1.5 border ${getSupplyCategoryClass(category)}`}
    >
      <span className="material-symbols-outlined text-[15px] shrink-0">
        {getSupplyCategoryIcon(category)}
      </span>
      <span className="truncate">{getSupplyCategoryLabel(category)}</span>
    </Badge>
  );
}
