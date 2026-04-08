import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

export interface InventoryStatsItem {
  label: string;
  value: number;
  color: string;
  description?: string;
  textColorClass?: string;
}

const DEFAULT_ITEMS: InventoryStatsItem[] = [
  { label: 'Nước sạch', value: 85, color: 'bg-primary' },
  { label: 'Lương thực', value: 30, color: 'bg-yellow-500' },
  { label: 'Y tế', value: 15, color: 'bg-red-500' },
  { label: 'Khác', value: 50, color: 'bg-green-500' },
];

export function InventoryStats({
  className,
  title = 'Tồn kho thiết yếu',
  items = DEFAULT_ITEMS,
}: {
  className?: string;
  title?: string;
  items?: InventoryStatsItem[];
}) {
  return (
    <Card className={cn('bg-card border-border h-full', className)}>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-bold text-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3">
        {items.map((item) => (
          <Tooltip key={item.label}>
            <TooltipTrigger asChild>
              <div className="space-y-1 cursor-help">
                <div className="flex justify-between gap-3 text-xs font-medium">
                  <span className="text-muted-foreground">{item.label}</span>
                  <span
                    className={cn(
                      item.textColorClass ||
                        (item.label === 'Nước sạch'
                          ? 'text-primary'
                          : item.label === 'Lương thực'
                            ? 'text-yellow-500'
                            : item.label === 'Y tế'
                              ? 'text-red-500'
                              : 'text-blue-500'),
                    )}
                  >
                    {item.value}%
                  </span>
                </div>
                <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                  <div
                    className={cn('h-full rounded-full transition-all duration-500', item.color)}
                    style={{ width: `${item.value}%` }}
                  />
                </div>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>{item.description || `${item.label}: ${item.value}% còn lại trong kho`}</p>
            </TooltipContent>
          </Tooltip>
        ))}
      </CardContent>
    </Card>
  );
}
