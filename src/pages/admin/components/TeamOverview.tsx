import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export interface TeamOverviewItem {
  id: string;
  name: string;
  role: string;
  statusLabel: string;
  memberCount: number;
  note?: string;
  tone?: 'busy' | 'ready' | 'warning';
}

const DEFAULT_TEAMS: TeamOverviewItem[] = [
  {
    id: 'team-1',
    name: 'Đội Cứu hộ 1',
    role: 'Tìm kiếm cứu nạn',
    statusLabel: 'Đang điều phối',
    memberCount: 12,
    note: 'Cập nhật từ đội hiện trường',
    tone: 'busy',
  },
  {
    id: 'team-2',
    name: 'Đội Y tế Hà Nội',
    role: 'Sơ cứu & Y tế',
    statusLabel: 'Sẵn sàng',
    memberCount: 8,
    note: 'Sẵn sàng tiếp nhận điều động',
    tone: 'ready',
  },
  {
    id: 'team-3',
    name: 'Đội Vận chuyển',
    role: 'Hậu cần',
    statusLabel: 'Cần theo dõi',
    memberCount: 15,
    note: 'Khối lượng điều phối cao',
    tone: 'warning',
  },
];

export function TeamOverview({
  className,
  title = 'Đội phản ứng nhanh',
  icon = 'groups_3',
  teams = DEFAULT_TEAMS,
}: {
  className?: string;
  title?: string;
  icon?: string;
  teams?: TeamOverviewItem[];
}) {
  return (
    <Card className={cn('bg-card border-border h-full overflow-hidden', className)}>
      <CardHeader className="flex flex-row items-center justify-between pb-2 gap-2">
        <CardTitle className="text-lg font-bold text-foreground flex items-center gap-2">
          <span className="material-symbols-outlined text-violet-600">{icon}</span>
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 min-h-0 overflow-hidden">
        <div className="flex flex-col gap-4 h-full overflow-y-auto pr-1 custom-scrollbar">
          {teams.map((team) => (
            <div
              key={team.id}
              className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-3 rounded-lg bg-muted/50 border border-border"
            >
              <div className="flex flex-col gap-1 min-w-0">
                <h4 className="text-sm font-bold text-foreground break-words">{team.name}</h4>
              </div>
              <div className="rounded-full bg-primary/10 text-primary px-2.5 py-1 text-[11px] font-semibold">
                {team.memberCount} thành viên
              </div>
              {/* <div className="flex flex-wrap items-center gap-3 shrink-0">
                <div className="rounded-full bg-primary/10 text-primary px-2.5 py-1 text-[11px] font-semibold">
                  {team.memberCount} thành viên
                </div>
                <span
                  className={cn(
                    'px-2 py-0.5 rounded text-[10px] font-bold uppercase',
                    team.tone ? toneStyles[team.tone] : toneStyles.ready,
                  )}
                >
                  {team.statusLabel}
                </span>
              </div> */}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
