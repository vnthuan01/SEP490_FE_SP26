'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { DayPicker } from 'react-day-picker';
import { cn } from '@/lib/utils';

export default function CustomCalendar({
  disabledDays,
  value,
  onChange,
}: {
  disabledDays?: { before: Date };
  value?: Date;
  onChange?: (date: Date | undefined) => void;
}) {
  const [month, setMonth] = React.useState<Date>(value || new Date());

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 200 }, (_, i) => currentYear - 160 + i);
  const months = Array.from({ length: 12 }, (_, i) => ({
    label: new Date(0, i).toLocaleString('default', { month: 'long' }),
    value: i,
  }));

  const handleSelect = (date?: Date) => {
    onChange?.(date);
    if (date) {
      // khi chọn xong ngày thì đóng luôn bằng cách unmount (nếu parent điều khiển)
      // hoặc có thể tự ẩn bằng setState (nếu muốn)
      console.log('selected:', date);
    }
  };

  return (
    <div className="w-full max-w-[290px]">
      <div className="border border-border rounded-md p-3 shadow-sm w-full bg-popover text-popover-foreground">
        {/* --- Header Custom --- */}
        <div className="flex items-center justify-between mb-2">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <div className="flex items-center gap-2">
            <select
              className="border border-input bg-transparent rounded-md px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-primary"
              value={month.getMonth()}
              onChange={(e) => setMonth(new Date(month.getFullYear(), Number(e.target.value)))}
            >
              {months.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>

            <select
              className="border border-input bg-transparent rounded-md px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-primary"
              value={month.getFullYear()}
              onChange={(e) => setMonth(new Date(Number(e.target.value), month.getMonth()))}
            >
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* --- Calendar Body --- */}
        <div className="w-full overflow-hidden">
          <DayPicker
            mode="single"
            month={month}
            onMonthChange={setMonth}
            selected={value}
            onSelect={handleSelect}
            disabled={disabledDays}
            showOutsideDays
            classNames={{
              months: 'relative flex w-full',
              month: 'w-full',
              nav: 'hidden',
              table: 'w-full border-collapse space-y-1',
              head_row: 'flex mb-1',
              weekday: 'w-9 font-medium text-[0.8rem] text-muted-foreground/80 ',
              row: 'flex w-full mt-2',
              cell: 'h-9 w-9 text-center text-sm p-0 m-0',
              day: 'group size-9 px-0 py-px text-sm m-0',
              day_button: cn(
                'cursor-pointer relative flex size-9 items-center justify-center whitespace-nowrap rounded-md p-0 text-foreground transition-200',
                'hover:not-in-data-selected:bg-accent hover:not-in-data-selected:text-foreground',
                'group-data-selected:bg-primary group-data-selected:text-primary-foreground',
                'group-data-disabled:pointer-events-none group-data-disabled:text-foreground/30 group-data-disabled:line-through',
                'group-data-outside:text-foreground/30',
                'outline-none focus-visible:ring-ring/50 focus-visible:ring-[3px]',
              ),
              today:
                '*:after:pointer-events-none *:after:absolute *:after:bottom-1 *:after:start-1/2 *:after:z-10 *:after:size-[3px] *:after:-translate-x-1/2 rtl:*:after:translate-x-1/2 *:after:rounded-full *:after:bg-primary [&[data-selected]:not(.range-middle)>*]:after:bg-background *:after:transition-colors',
              outside:
                'text-muted-foreground data-selected:bg-accent/50 data-selected:text-muted-foreground',
              hidden: 'invisible',
            }}
          />
        </div>
      </div>
    </div>
  );
}
