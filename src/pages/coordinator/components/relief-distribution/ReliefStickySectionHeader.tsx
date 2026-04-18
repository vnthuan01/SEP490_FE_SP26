import { Badge } from '@/components/ui/badge';

export function ReliefStickySectionHeader({
  title,
  description,
  badgeLabel,
  badgeIcon,
}: {
  title: string;
  description: string;
  badgeLabel?: string;
  badgeIcon?: string;
}) {
  return (
    <div className="sticky top-0 z-20 -mx-5 border-b border-border bg-card px-5 pb-4 pt-0">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-foreground">{title}</h3>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        {badgeLabel && (
          <Badge variant="outline" appearance="light" className="gap-1.5">
            {badgeIcon && (
              <span className="material-symbols-outlined text-[15px]">{badgeIcon}</span>
            )}
            {badgeLabel}
          </Badge>
        )}
      </div>
    </div>
  );
}
