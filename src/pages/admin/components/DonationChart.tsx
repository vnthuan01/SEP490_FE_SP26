import { useState, useMemo } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

import { cn } from '@/lib/utils';

type TimeRange = 'day' | 'week' | 'month' | 'year';

const DATA_GENERATORS = {
  day: () =>
    Array.from({ length: 24 }, (_, i) => ({
      name: `${i}:00`,
      value: Math.floor(Math.random() * 5000000) + 1000000,
    })),
  week: () =>
    ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => ({
      name: day,
      value: Math.floor(Math.random() * 50000000) + 10000000,
    })),
  month: () =>
    Array.from({ length: 30 }, (_, i) => ({
      name: `${i + 1}`,
      value: Math.floor(Math.random() * 20000000) + 5000000,
    })),
  year: () =>
    ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map(
      (month) => ({
        name: month,
        value: Math.floor(Math.random() * 500000000) + 100000000,
      }),
    ),
};

interface DonationChartProps {
  className?: string;
}

export function DonationChart({ className }: DonationChartProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>('week');

  const data = useMemo(() => DATA_GENERATORS[timeRange](), [timeRange]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <Card
      className={cn('bg-surface-dark dark:bg-surface-light border-border shadow-md', className)}
    >
      <CardHeader className="flex flex-col sm:flex-row items-center justify-between pb-4 border-b border-border/50">
        <div className="flex flex-col gap-1">
          <CardTitle className="text-foreground dark:text-foreground text-lg font-bold flex items-center gap-2">
            <span className="material-symbols-outlined text-green-500">show_chart</span>
            Xu hướng ủng hộ
          </CardTitle>
          <p className="text-sm text-muted-foreground dark:text-muted-foreground">
            Thống kê dòng tiền tài trợ theo thời gian
          </p>
        </div>
        <div className="flex bg-background-dark/50 dark:bg-background-light/50 p-1 rounded-lg mt-4 sm:mt-0">
          {(['day', 'week', 'month', 'year'] as TimeRange[]).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={cn(
                'px-3 py-1.5 rounded-md text-xs font-bold transition-all capitalize',
                timeRange === range
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-muted-foreground dark:text-muted-foreground hover:text-foreground dark:hover:text-foreground hover:bg-white/5',
              )}
            >
              {range === 'day'
                ? 'Ngày'
                : range === 'week'
                  ? 'Tuần'
                  : range === 'month'
                    ? 'Tháng'
                    : 'Năm'}
            </button>
          ))}
        </div>
      </CardHeader>
      <CardContent className="p-0 sm:p-6 pt-6">
        <div className="h-[350px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorDonation" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00ff88" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#00ff88" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#283239" vertical={false} />
              <XAxis
                dataKey="name"
                stroke="#64748b"
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="#64748b"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `${(value / 1000000).toFixed(0)}M`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(28, 33, 39, 0.95)',
                  border: '1px solid #283239',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                }}
                itemStyle={{ color: '#fff' }}
                formatter={(value: number | undefined) => [formatCurrency(value || 0), 'Ủng hộ']}
                labelStyle={{ color: '#9dadb9', marginBottom: '0.25rem' }}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke="#00ff88"
                strokeWidth={3}
                fillOpacity={1}
                fill="url(#colorDonation)"
                animationDuration={1500}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="flex flex-end items-center justify-end px-6 mt-2">
          <div className="flex flex-col">
            <span className="text-primary dark:text-primary text-[10px] uppercase tracking-widest font-bold flex items-center gap-1">
              Tổng tài trợ (
              {timeRange === 'day'
                ? 'Hôm nay'
                : timeRange === 'week'
                  ? 'Tuần này'
                  : timeRange === 'month'
                    ? 'Tháng này'
                    : 'Năm nay'}
              )
            </span>
            <span className="text-2xl font-black text-primary dark:text-primary mt-1">
              {formatCurrency(data.reduce((acc, curr) => acc + curr.value, 0))}
            </span>
            <span className="text-green-400 dark:text-green-500 text-xs font-bold flex items-center gap-1 mt-1">
              <span className="material-symbols-outlined text-xs">trending_up</span> +12.5%
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
