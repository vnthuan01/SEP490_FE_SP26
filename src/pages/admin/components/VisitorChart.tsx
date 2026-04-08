import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
// import { Analytics } from '@vercel/analytics/react';

type VisitorChartPoint = {
  name: string;
  visits: number;
};

const data = [
  { name: 'Mon', visits: 4000 },
  { name: 'Tue', visits: 3000 },
  { name: 'Wed', visits: 5500 },
  { name: 'Thu', visits: 4500 },
  { name: 'Fri', visits: 3500 },
  { name: 'Sat', visits: 2500 },
  { name: 'Sun', visits: 3000 },
];

export function VisitorChart({
  className,
  data: providedData,
  title = 'Lượng truy cập',
  subtitle = 'Dữ liệu truy cập hệ thống',
  icon = 'groups',
  trendLabel = '+14.5%',
}: {
  className?: string;
  data?: VisitorChartPoint[];
  title?: string;
  subtitle?: string;
  icon?: string;
  trendLabel?: string;
}) {
  const chartData = providedData?.length ? providedData : data;

  return (
    <Card className={cn('bg-card border-border h-full overflow-hidden', className)}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle className="text-lg font-bold text-foreground flex items-center gap-2">
            <span className="material-symbols-outlined text-green-500">{icon}</span>
            {title}
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
        </div>
        {trendLabel ? (
          <div className="flex items-center gap-2 text-xs font-medium bg-primary/10 text-primary px-2 py-1 rounded-full">
            <span className="material-symbols-outlined text-sm">trending_up</span>
            <span>{trendLabel}</span>
          </div>
        ) : null}
      </CardHeader>
      <CardContent className="flex flex-col min-h-0 h-full">
        <div className="flex-1 min-h-0 h-[200px] w-full min-w-0">
          <ResponsiveContainer width="100%" height="100%" minWidth={0}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#8cf4c3ff" vertical={false} />
              <XAxis
                dataKey="name"
                stroke="#64748b"
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                cursor={{ fill: 'transparent' }}
                wrapperStyle={{
                  zIndex: 1000,
                  pointerEvents: 'none',
                }}
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
                labelStyle={{
                  color: 'hsl(var(--foreground))', // dark = trắng, light = đen
                  fontWeight: 500,
                }}
                itemStyle={{
                  color: 'hsl(var(--foreground))', // 🔥 auto theo theme
                }}
              />

              <Bar
                dataKey="visits"
                fill="#06d474ff"
                activeBar={{ fill: '#5df5aeff' }}
                radius={[4, 4, 0, 0]}
                barSize={30}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
