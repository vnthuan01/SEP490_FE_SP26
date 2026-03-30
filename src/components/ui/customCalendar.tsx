'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { DayPicker } from 'react-day-picker';

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

  const years = Array.from({ length: 80 }, (_, i) => new Date().getFullYear() - i);
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
      <div className="border rounded-md p-3 shadow-sm w-full bg-background">
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
              className="border rounded-md px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-primary"
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
              className="border rounded-md px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-primary"
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
              months: 'flex flex-col w-full',
              month: 'w-full',
              nav: 'hidden',
              table: 'w-full text-center border-collapse',
              head_row: 'text-xs text-muted-foreground',
              cell: 'p-0 text-sm w-[36px] h-[36px]',
            }}
          />
        </div>
      </div>
    </div>
  );
}
