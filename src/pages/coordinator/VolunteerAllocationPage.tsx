import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { coordinatorNavGroups } from './components/sidebarConfig';
import { useMyReliefStation } from '@/hooks/useReliefStation';
import { useTeams, useTeamsInStation, useTeamMembers } from '@/hooks/useTeams';
import {
  useUnassignedVolunteers,
  VOLUNTEER_PROFILE_QUERY_KEYS,
} from '@/hooks/useVolunteerProfiles';
import {
  TeamRolePreference,
  TeamRolePreferenceLabel,
  TeamStatus,
  TeamStatusLabel,
  VerificationStatus,
  VolunteerType,
  VolunteerTypeLabel,
  getTeamStatusClass,
  parseEnumValue,
} from '@/enums/beEnums';
import { useQueryClient } from '@tanstack/react-query';
import { TEAM_QUERY_KEYS } from '@/hooks/useTeams';

type AllocationFilter = 'all' | 'health' | 'rescue' | 'logistics';

type VolunteerCategory = Exclude<AllocationFilter, 'all'> | 'other';

type VolunteerItem = {
  id: string;
  name: string;
  location: string;
  skills: string[];
  volunteerType?: number;
  preferredTeamRole?: number;
  verificationStatus?: number;
};

type TeamItem = {
  id: string;
  name: string;
  description?: string | null;
  status: number;
  leader?: string | null;
  members: number;
  area?: string | null;
};

const toDisplayText = (value: unknown, fallback = ''): string => {
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  if (value && typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    const candidate = obj.displayName ?? obj.name ?? obj.email ?? obj.userId;
    if (typeof candidate === 'string' || typeof candidate === 'number') {
      return String(candidate);
    }
  }
  return fallback;
};

const normalizeKeyword = (value: string) => value.trim().toLowerCase();

const HEALTH_KEYWORDS = ['y tế', 'sơ cứu', 'điều dưỡng', 'bác sĩ', 'y tá', 'medical', 'medic'];
const RESCUE_KEYWORDS = ['cứu hộ', 'cứu nạn', 'ứng cứu', 'bơi', 'leo dây', 'rescue'];
const LOGISTICS_KEYWORDS = [
  'hậu cần',
  'vận chuyển',
  'logistics',
  'lái xe',
  'lai xe',
  'driver',
  'tài xế',
];

const includesAnyKeyword = (source: string[], keywords: string[]) => {
  return source.some((item) => keywords.some((keyword) => item.includes(keyword)));
};

const detectVolunteerCategory = (
  skills: string[],
  preferredTeamRole?: number,
): VolunteerCategory => {
  const normalizedSkills = skills.map(normalizeKeyword);

  if (includesAnyKeyword(normalizedSkills, HEALTH_KEYWORDS)) return 'health';
  if (
    preferredTeamRole === TeamRolePreference.Driver ||
    includesAnyKeyword(normalizedSkills, LOGISTICS_KEYWORDS)
  ) {
    return 'logistics';
  }
  if (includesAnyKeyword(normalizedSkills, RESCUE_KEYWORDS)) return 'rescue';
  return 'other';
};

const categoryMeta: Record<
  VolunteerCategory | 'all',
  { label: string; badgeClass: string; chipClass: string; icon: string }
> = {
  all: {
    label: 'Tất cả',
    badgeClass: 'border-primary/20 bg-primary/10 text-primary',
    chipClass: 'border-primary/25 bg-primary/10 text-primary hover:bg-primary/15',
    icon: 'apps',
  },
  health: {
    label: 'Y tế',
    badgeClass: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
    chipClass:
      'border-emerald-500/25 bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/15 dark:text-emerald-300',
    icon: 'medical_services',
  },
  rescue: {
    label: 'Cứu hộ',
    badgeClass: 'border-rose-500/20 bg-rose-500/10 text-rose-700 dark:text-rose-300',
    chipClass:
      'border-rose-500/25 bg-rose-500/10 text-rose-700 hover:bg-rose-500/15 dark:text-rose-300',
    icon: 'emergency',
  },
  logistics: {
    label: 'Hậu cần',
    badgeClass: 'border-sky-500/20 bg-sky-500/10 text-sky-700 dark:text-sky-300',
    chipClass: 'border-sky-500/25 bg-sky-500/10 text-sky-700 hover:bg-sky-500/15 dark:text-sky-300',
    icon: 'local_shipping',
  },
  other: {
    label: 'Khác',
    badgeClass: 'border-slate-500/20 bg-slate-500/10 text-slate-700 dark:text-slate-300',
    chipClass:
      'border-slate-500/25 bg-slate-500/10 text-slate-700 hover:bg-slate-500/15 dark:text-slate-300',
    icon: 'category',
  },
};

export default function VolunteerAllocationPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { station } = useMyReliefStation();
  const reliefStationId = station?.reliefStationId;
  const hasAssignedStation = !!reliefStationId;

  const {
    teams: inStationTeams,
    isLoading: isLoadingInStationTeams,
    refetch: refetchInStationTeams,
  } = useTeamsInStation(reliefStationId);
  const {
    teams: allTeams,
    isLoadingTeams,
    refetchTeams,
  } = useTeams(undefined, undefined, {
    enabledList: false,
  });
  const { profiles, isLoadingProfiles, refetchProfiles } = useUnassignedVolunteers(
    {
      pageIndex: 1,
      pageSize: 200,
      verificationStatus: VerificationStatus.Approved,
    },
    { enabled: hasAssignedStation },
  );

  const rawTeams = hasAssignedStation ? inStationTeams : allTeams;
  const isLoadingTeamList = hasAssignedStation ? isLoadingInStationTeams : isLoadingTeams;
  const refetchTeamList = hasAssignedStation ? refetchInStationTeams : refetchTeams;

  const [selectedVolunteerIds, setSelectedVolunteerIds] = useState<Set<string>>(new Set());
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<AllocationFilter>('all');

  const volunteers = useMemo<VolunteerItem[]>(() => {
    return (profiles || []).map((profile: any) => ({
      id: String(profile.userId ?? profile.volunteerProfileId ?? ''),
      name: toDisplayText(profile.fullName, 'Tình nguyện viên'),
      location: toDisplayText(profile.address, 'Chưa cập nhật khu vực'),
      skills: Array.isArray(profile.skills)
        ? profile.skills
            .map((skill: any) => toDisplayText(skill?.name ?? skill?.code, ''))
            .filter(Boolean)
        : [],
      volunteerType: typeof profile.volunteerType === 'number' ? profile.volunteerType : undefined,
      preferredTeamRole:
        typeof profile.preferredTeamRole === 'number' ? profile.preferredTeamRole : undefined,
      verificationStatus:
        typeof profile.verificationStatus === 'number' ? profile.verificationStatus : undefined,
    }));
  }, [profiles]);

  const teams = useMemo<TeamItem[]>(() => {
    if (!Array.isArray(rawTeams)) return [];
    return rawTeams.map((team: any) => ({
      id: String(team.teamId ?? team.id ?? ''),
      name: toDisplayText(team.name, 'Chưa đặt tên'),
      description: team.description,
      status: Number(parseEnumValue(team.status)),
      leader: toDisplayText(team.leaderName ?? team.leader, ''),
      members: Number(team.totalMembers ?? team.members ?? 0),
      area: toDisplayText(team.area ?? team.currentArea, ''),
    }));
  }, [rawTeams]);

  const selectedTeam = useMemo(
    () => teams.find((team) => team.id === selectedTeamId),
    [selectedTeamId, teams],
  );

  const { addMembersBulk, addMembersBulkStatus } = useTeamMembers(selectedTeamId || '');

  const filteredVolunteers = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    return volunteers.filter((volunteer) => {
      const detectedCategory = detectVolunteerCategory(
        volunteer.skills,
        volunteer.preferredTeamRole,
      );
      const matchesSearch =
        !normalizedSearch ||
        volunteer.name.toLowerCase().includes(normalizedSearch) ||
        volunteer.location.toLowerCase().includes(normalizedSearch) ||
        volunteer.skills.some((skill) => skill.toLowerCase().includes(normalizedSearch));
      const matchesFilter = filter === 'all' ? true : detectedCategory === filter;

      return matchesSearch && matchesFilter;
    });
  }, [filter, searchTerm, volunteers]);

  const allVisibleSelected =
    filteredVolunteers.length > 0 &&
    filteredVolunteers.every((volunteer) => selectedVolunteerIds.has(volunteer.id));

  const stats = useMemo(
    () => ({
      waiting: volunteers.length,
      activeTeams: teams.filter((team) => team.status === TeamStatus.Active).length,
      totalMembers: teams.reduce((sum, team) => sum + team.members, 0),
    }),
    [teams, volunteers],
  );

  const handleToggleVolunteer = (volunteerId: string) => {
    setSelectedVolunteerIds((prev) => {
      const next = new Set(prev);
      if (next.has(volunteerId)) next.delete(volunteerId);
      else next.add(volunteerId);
      return next;
    });
  };

  const handleToggleAllVisible = () => {
    setSelectedVolunteerIds((prev) => {
      const next = new Set(prev);
      if (allVisibleSelected) {
        filteredVolunteers.forEach((volunteer) => next.delete(volunteer.id));
      } else {
        filteredVolunteers.forEach((volunteer) => next.add(volunteer.id));
      }
      return next;
    });
  };

  const handleAssignSelected = async () => {
    if (!selectedTeamId) {
      toast.error('Vui lòng chọn team để thêm tình nguyện viên.');
      return;
    }
    if (selectedVolunteerIds.size === 0) {
      toast.error('Vui lòng chọn ít nhất 1 tình nguyện viên.');
      return;
    }

    try {
      await addMembersBulk({ volunteerIds: Array.from(selectedVolunteerIds) });
      setSelectedVolunteerIds(new Set());
      await Promise.all([
        refetchProfiles(),
        refetchTeamList(),
        queryClient.invalidateQueries({ queryKey: VOLUNTEER_PROFILE_QUERY_KEYS.unassigned() }),
        queryClient.invalidateQueries({ queryKey: TEAM_QUERY_KEYS.all }),
        ...(selectedTeamId
          ? [queryClient.invalidateQueries({ queryKey: TEAM_QUERY_KEYS.detail(selectedTeamId) })]
          : []),
      ]);
    } catch {
      // Error toast handled by hook
    }
  };

  const isSaving = addMembersBulkStatus === 'pending';

  return (
    <DashboardLayout navGroups={coordinatorNavGroups}>
      <div className="space-y-8 px-2">
        {!hasAssignedStation ? (
          <div className="flex min-h-[60vh] items-center justify-center px-4">
            <div className="flex max-w-md flex-col items-center gap-3 rounded-2xl border border-dashed border-border bg-card px-6 py-10 text-center shadow-sm">
              <span className="material-symbols-outlined text-5xl text-muted-foreground">
                groups
              </span>
              <h2 className="text-xl font-bold text-foreground">Bạn chưa được gán trạm</h2>
              <p className="text-sm text-muted-foreground">
                Chỉ điều phối viên đã được gán trạm mới có thể xem đội tại trạm và phân công tình
                nguyện viên.
              </p>
            </div>
          </div>
        ) : (
          <>
            <div className="flex flex-col justify-between gap-6 md:flex-row">
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => navigate('/portal/coordinator/teams')}
                  className="mb-1 flex w-fit items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-primary"
                >
                  <span className="material-symbols-outlined text-lg">arrow_back</span>
                  Quay lại Đội tình nguyện
                </button>
                <h1 className="text-3xl font-black leading-tight tracking-[-0.033em] text-primary md:text-4xl">
                  Phân công tình nguyện viên
                </h1>
                <p className="max-w-2xl text-base font-normal text-muted-foreground">
                  Lấy danh sách tình nguyện viên chưa vào đội từ hệ thống, chọn nhiều người cùng lúc
                  và thêm vào team phụ trách phù hợp.
                </p>
              </div>
              <div className="flex items-end">
                <Button
                  onClick={handleAssignSelected}
                  disabled={!selectedTeamId || selectedVolunteerIds.size === 0 || isSaving}
                  className="flex items-center gap-2 rounded-lg px-6 py-3 font-bold text-white shadow-lg shadow-primary/20"
                >
                  <span className="material-symbols-outlined">group_add</span>
                  <span>
                    {isSaving
                      ? 'Đang thêm...'
                      : `Thêm ${selectedVolunteerIds.size} TNV${selectedTeam ? ` vào ${selectedTeam.name}` : ''}`}
                  </span>
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="group flex flex-col gap-3 rounded-xl border border-border bg-card p-6 shadow-sm transition-colors hover:border-primary/50">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                    Tình nguyện viên chờ
                  </p>
                  <div className="flex size-8 items-center justify-center rounded-full bg-blue-500/20 text-blue-400 transition-all group-hover:bg-blue-500 group-hover:text-white">
                    <span className="material-symbols-outlined text-lg">person_search</span>
                  </div>
                </div>
                <div className="flex items-end gap-3">
                  <p className="text-4xl font-black leading-none text-foreground">
                    {stats.waiting}
                  </p>
                  <span className="rounded bg-blue-500/10 px-1.5 py-0.5 text-sm font-medium text-blue-600">
                    Chưa vào đội
                  </span>
                </div>
              </div>

              <div className="group flex flex-col gap-3 rounded-xl border border-border bg-card p-6 shadow-sm transition-colors hover:border-primary/50">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                    Nhóm đang hoạt động
                  </p>
                  <div className="flex size-8 items-center justify-center rounded-full bg-green-500/20 text-green-400 transition-all group-hover:bg-green-500 group-hover:text-white">
                    <span className="material-symbols-outlined text-lg">groups</span>
                  </div>
                </div>
                <div className="flex items-end gap-3">
                  <p className="text-4xl font-black leading-none text-foreground">
                    {stats.activeTeams}
                  </p>
                  <span className="rounded bg-green-500/10 px-1.5 py-0.5 text-sm font-medium text-green-600">
                    Trạng thái Active
                  </span>
                </div>
              </div>

              <div className="group flex flex-col gap-3 rounded-xl border border-border bg-card p-6 shadow-sm transition-colors hover:border-primary/50">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                    Tổng nhân sự hiện có
                  </p>
                  <div className="flex size-8 items-center justify-center rounded-full bg-orange-500/20 text-orange-400 transition-all group-hover:bg-orange-500 group-hover:text-white">
                    <span className="material-symbols-outlined text-lg">badge</span>
                  </div>
                </div>
                <div className="flex items-end gap-3">
                  <p className="text-4xl font-black leading-none text-foreground">
                    {stats.totalMembers}
                  </p>
                  <span className="rounded bg-orange-500/10 px-1.5 py-0.5 text-sm font-medium text-orange-600">
                    Từ danh sách đội
                  </span>
                </div>
              </div>
            </div>

            <div className="flex min-h-[600px] flex-col gap-6 lg:h-[calc(100vh-24rem)] lg:flex-row">
              <div className="flex flex-1 flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm">
                <div className="border-b border-slate-200 bg-slate-50 p-4 dark:border-border dark:bg-card">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-bold text-foreground">Danh sách chờ</h3>
                      <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-bold text-slate-900 dark:bg-sky-600 dark:text-white">
                        {filteredVolunteers.length}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1 text-xs text-muted-foreground">
                      <Checkbox
                        checked={allVisibleSelected}
                        onCheckedChange={handleToggleAllVisible}
                      />
                      Chọn tất cả đang hiển thị
                    </div>
                  </div>

                  <div className="relative mb-3 w-full">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">
                      <span className="material-symbols-outlined text-[20px]">search</span>
                    </div>
                    <input
                      className="block w-full rounded-lg border border-slate-200 bg-white p-2.5 pl-10 text-sm text-slate-900 placeholder-muted-foreground focus:border-primary focus:ring-primary dark:border-border dark:bg-card dark:text-foreground"
                      placeholder="Tìm theo tên, địa chỉ, kỹ năng..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {(['all', 'health', 'rescue', 'logistics'] as AllocationFilter[]).map(
                      (item) => {
                        const meta = categoryMeta[item];
                        const active = filter === item;
                        return (
                          <Button
                            key={item}
                            type="button"
                            variant="outline"
                            onClick={() => setFilter(item)}
                            className={cn(
                              'h-auto rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                              active
                                ? meta.chipClass
                                : 'border-border bg-background text-muted-foreground hover:bg-muted',
                            )}
                          >
                            <span className="material-symbols-outlined mr-1 text-[14px]">
                              {meta.icon}
                            </span>
                            {meta.label}
                          </Button>
                        );
                      },
                    )}
                  </div>
                </div>

                <div className="custom-scrollbar flex-1 space-y-2 overflow-y-auto p-2">
                  {isLoadingProfiles ? (
                    <div className="p-8 text-center text-muted-foreground">
                      <span className="material-symbols-outlined mb-2 text-4xl opacity-50">
                        hourglass_top
                      </span>
                      <p>Đang tải danh sách tình nguyện viên...</p>
                    </div>
                  ) : filteredVolunteers.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground">
                      <span className="material-symbols-outlined mb-2 text-4xl opacity-50">
                        search_off
                      </span>
                      <p>Không tìm thấy tình nguyện viên phù hợp</p>
                    </div>
                  ) : (
                    filteredVolunteers.map((volunteer) => {
                      const isSelected = selectedVolunteerIds.has(volunteer.id);
                      const detectedCategory = detectVolunteerCategory(
                        volunteer.skills,
                        volunteer.preferredTeamRole,
                      );
                      const meta = categoryMeta[detectedCategory];

                      return (
                        <div
                          key={volunteer.id}
                          onClick={() => handleToggleVolunteer(volunteer.id)}
                          className={cn(
                            'group flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-all',
                            isSelected
                              ? 'border-primary bg-primary/10 shadow-[0_0_0_1px_rgba(59,130,246,0.5)]'
                              : 'border-transparent bg-white hover:border-slate-200 hover:bg-slate-50 dark:bg-transparent dark:hover:border-border dark:hover:bg-muted',
                          )}
                        >
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => handleToggleVolunteer(volunteer.id)}
                            onClick={(e) => e.stopPropagation()}
                          />
                          <div className="flex size-10 items-center justify-center rounded-full border border-slate-200 bg-primary/10 text-primary dark:border-slate-700">
                            <span className="material-symbols-outlined text-[20px]">person</span>
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-bold text-foreground">
                              {volunteer.name}
                            </p>
                            <p className="flex items-center gap-1 truncate text-xs text-muted-foreground">
                              <span className="material-symbols-outlined text-[12px]">
                                location_on
                              </span>
                              {volunteer.location}
                            </p>
                            <div className="mt-2 flex flex-wrap items-center gap-2">
                              <span
                                className={cn(
                                  'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium',
                                  meta.badgeClass,
                                )}
                              >
                                <span className="material-symbols-outlined text-[14px]">
                                  {meta.icon}
                                </span>
                                {meta.label}
                              </span>
                              {typeof volunteer.volunteerType === 'number' &&
                                volunteer.volunteerType in VolunteerTypeLabel && (
                                  <span className="inline-flex items-center rounded-full border border-violet-500/20 bg-violet-500/10 px-2 py-0.5 text-xs font-medium text-violet-700 dark:text-violet-300">
                                    {VolunteerTypeLabel[volunteer.volunteerType as VolunteerType]}
                                  </span>
                                )}
                              {typeof volunteer.preferredTeamRole === 'number' &&
                                volunteer.preferredTeamRole in TeamRolePreferenceLabel && (
                                  <span className="inline-flex items-center rounded-full border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-300">
                                    {
                                      TeamRolePreferenceLabel[
                                        volunteer.preferredTeamRole as TeamRolePreference
                                      ]
                                    }
                                  </span>
                                )}
                            </div>
                            {volunteer.skills.length > 0 && (
                              <p className="mt-2 truncate text-xs text-muted-foreground">
                                Kỹ năng: {volunteer.skills.slice(0, 3).join(' • ')}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="flex flex-[2] flex-col gap-4">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-xl font-bold text-foreground">Các nhóm cứu trợ</h3>
                    <p className="text-sm text-muted-foreground">
                      Chọn 1 team để thêm cùng lúc {selectedVolunteerIds.size} tình nguyện viên đã
                      chọn.
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    className="gap-2"
                    onClick={() => navigate('/portal/coordinator/teams')}
                  >
                    <span className="material-symbols-outlined text-[18px]">settings</span>
                    Quản lý nhóm
                  </Button>
                </div>

                <div className="custom-scrollbar grid grid-cols-1 gap-4 overflow-y-auto pb-2 pr-2 xl:grid-cols-2">
                  {isLoadingTeamList ? (
                    <div className="col-span-full rounded-xl border border-border bg-card p-8 text-center text-muted-foreground">
                      <span className="material-symbols-outlined mb-2 text-4xl opacity-50">
                        hourglass_top
                      </span>
                      <p>Đang tải danh sách nhóm...</p>
                    </div>
                  ) : teams.length === 0 ? (
                    <div className="col-span-full rounded-xl border border-border bg-card p-8 text-center text-muted-foreground">
                      <span className="material-symbols-outlined mb-2 text-4xl opacity-50">
                        groups
                      </span>
                      <p>Chưa có nhóm nào để phân công.</p>
                    </div>
                  ) : (
                    teams.map((team) => {
                      const isSelectedTeam = selectedTeamId === team.id;
                      const statusClass = getTeamStatusClass(team.status);
                      const statusLabel =
                        TeamStatusLabel[team.status as TeamStatus] ?? 'Không xác định';

                      return (
                        <div
                          key={team.id}
                          className={cn(
                            'relative overflow-hidden rounded-xl border bg-card p-5 shadow-sm transition-all',
                            isSelectedTeam
                              ? 'border-primary shadow-[0_0_0_1px_rgba(59,130,246,0.45)]'
                              : 'border-border hover:border-primary/40',
                          )}
                        >
                          <div className="absolute right-0 top-0 p-3">
                            <span
                              className={cn(
                                'inline-flex items-center rounded-full border px-2 py-1 text-xs font-medium',
                                statusClass,
                              )}
                            >
                              {statusLabel}
                            </span>
                          </div>

                          <div className="mb-4">
                            <h4 className="text-lg font-bold text-foreground">{team.name}</h4>
                            <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                              <span className="material-symbols-outlined text-[16px]">
                                location_on
                              </span>
                              {team.area || station?.locationName || 'Chưa định vị khu vực'}
                            </p>
                            {team.leader && (
                              <p className="mt-1 text-xs text-muted-foreground">
                                Trưởng nhóm: {team.leader}
                              </p>
                            )}
                            {team.description && (
                              <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                                {team.description}
                              </p>
                            )}
                          </div>

                          <div className="mb-6 space-y-3">
                            <div className="mb-1 flex justify-between text-sm">
                              <span className="text-muted-foreground">Nhân sự hiện tại</span>
                              <span className="font-medium text-foreground">
                                {team.members} / 20
                              </span>
                            </div>
                            <div className="h-2 w-full rounded-full bg-slate-200 dark:bg-background">
                              <div
                                className={cn(
                                  'h-2 rounded-full',
                                  team.status === TeamStatus.Active
                                    ? 'bg-green-500'
                                    : team.status === TeamStatus.Suspended
                                      ? 'bg-red-500'
                                      : team.status === TeamStatus.Archived
                                        ? 'bg-yellow-500'
                                        : 'bg-primary',
                                )}
                                style={{ width: `${Math.min((team.members / 20) * 100, 100)}%` }}
                              />
                            </div>
                            <div className="mt-2 flex gap-2 text-xs">
                              {team.members < 20 ? (
                                <>
                                  <span className="text-muted-foreground">Đang cần:</span>
                                  <span className="font-bold text-foreground">
                                    {20 - team.members} tình nguyện viên
                                  </span>
                                </>
                              ) : (
                                <span className="font-bold text-green-600 dark:text-green-400">
                                  Đội đã đủ nhân sự
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="grid gap-2 sm:grid-cols-2">
                            <Button
                              type="button"
                              variant={isSelectedTeam ? 'primary' : 'outline'}
                              className="gap-2"
                              onClick={() => setSelectedTeamId(team.id)}
                            >
                              <span className="material-symbols-outlined text-[18px]">
                                {isSelectedTeam ? 'check_circle' : 'radio_button_checked'}
                              </span>
                              {isSelectedTeam ? 'Đã chọn team' : 'Chọn team này'}
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              className="gap-2"
                              disabled={
                                selectedVolunteerIds.size === 0 || !isSelectedTeam || isSaving
                              }
                              onClick={handleAssignSelected}
                            >
                              <span className="material-symbols-outlined text-[18px]">
                                group_add
                              </span>
                              Thêm {selectedVolunteerIds.size} TNV
                            </Button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
