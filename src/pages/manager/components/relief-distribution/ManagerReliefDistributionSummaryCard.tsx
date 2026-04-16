import { Card, CardContent } from '@/components/ui/card';

export function ManagerReliefDistributionSummaryCard({
  label,
  value,
  note,
}: {
  label: string;
  value: number;
  note: string;
}) {
  return (
    <Card className="min-w-0 border-0 shadow-sm ring-1 ring-border/60">
      <CardContent className="p-5">
        <div className="space-y-2 min-w-0">
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-3xl font-semibold tracking-tight">{value}</p>
          <p className="text-xs text-muted-foreground">{note}</p>
        </div>
      </CardContent>
    </Card>
  );
}
