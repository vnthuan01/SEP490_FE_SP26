import { useEffect, useMemo, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useNavigate } from 'react-router-dom';
import { useTeamMembers, useTeams, useTeamsInStation } from '@/hooks/useTeams';
import {
  useAssignTeamToCampaign,
  useCampaignSummary,
  useCampaignTeams,
  useCampaigns,
  useRemoveTeamFromCampaign,
  useUpdateCampaignTeamStatus,
} from '@/hooks/useCampaigns';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useMyReliefStation } from '@/hooks/useReliefStation';
import { useUnassignedVolunteers } from '@/hooks/useVolunteerProfiles';
import { coordinatorNavItems, coordinatorProjects } from './components/sidebarConfig';
import { toast } from 'sonner';
import type { TeamStatus } from '@/enums/beEnums';
import {
  CampaignTeamRole,
  CampaignTeamStatus,
  TeamStatusLabel,
  getCampaignStatusClass,
  getCampaignStatusLabel,
  getCampaignTypeLabel,
  getTeamStatusClass,
  parseEnumValue,
} from '@/enums/beEnums';

const CAMPAIGN_TEAM_ROLE_LABEL: Record<number, string> = {
  [CampaignTeamRole.Logistics]: 'Hậu cần',
  [CampaignTeamRole.Medical]: 'Y tế',
  [CampaignTeamRole.Relief]: 'Cứu trợ',
  [CampaignTeamRole.Communication]: 'Điều phối',
  [CampaignTeamRole.Support]: 'Hỗ trợ',
};

const CAMPAIGN_TEAM_STATUS_LABEL: Record<number, string> = {
  [CampaignTeamStatus.Invited]: 'Đã mời',
  [CampaignTeamStatus.Accepted]: 'Đã chấp nhận',
  [CampaignTeamStatus.Active]: 'Đang tham gia',
  [CampaignTeamStatus.Completed]: 'Hoàn thành',
  [CampaignTeamStatus.Withdrawn]: 'Rút lui',
  [CampaignTeamStatus.Cancelled]: 'Đã hủy',
};

type LegacyStatus = 'available' | 'moving' | 'rescuing' | 'lost-contact';

type TeamItem = {
  id: string;
  name: string;
  description?: string | null;
  status: number | LegacyStatus;
  leader: string | null;
  members: number;
  area?: string | null;
  contactPhone?: string | null;
  memberDetails?: Array<{ id: string; name: string; role: string; avatar?: string }>;
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

export default function CoordinatorTeamManagementPage() {
  const { station, isLoading: isLoadingStation } = useMyReliefStation();
  const reliefStationId = station?.reliefStationId;

  // ── If moderator has a station → load teams in that station
  // ── If no station → fallback to all teams (read-only, create disabled)
  const {
    teams: inStationTeams,
    isLoading: isLoadingInStationTeams,
    refetch: refetchInStation,
  } = useTeamsInStation(reliefStationId);

  const { teams: allTeamsRaw, isLoadingTeams, refetchTeams, createTeam } = useTeams();

  // Unified refetch
  const refetch = reliefStationId ? refetchInStation : refetchTeams;

  // Unified raw list depending on station presence
  const rawTeamList = reliefStationId ? inStationTeams : allTeamsRaw;
  const isLoadingTeamList = reliefStationId ? isLoadingInStationTeams : isLoadingTeams;

  const [selectedTeamId, setSelectedTeamId] = useState<string>();
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isManageMembersOpen, setIsManageMembersOpen] = useState(false);
  const [isCampaignAssignmentOpen, setIsCampaignAssignmentOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [createError, setCreateError] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [selectedVolunteerIds, setSelectedVolunteerIds] = useState<string[]>([]);
  const [selectedCampaignId, setSelectedCampaignId] = useState('');
  const [selectedCampaignRole, setSelectedCampaignRole] = useState<string>(
    String(CampaignTeamRole.Relief),
  );
  const [selectedCampaignInitialStatus, setSelectedCampaignInitialStatus] = useState<string>(
    String(CampaignTeamStatus.Invited),
  );
  const navigate = useNavigate();

  const isLoading = isLoadingStation || isLoadingTeamList;

  const teams: TeamItem[] = useMemo(() => {
    if (!Array.isArray(rawTeamList)) return [];

    return rawTeamList.map((team: any) => ({
      id: String(team.teamId ?? team.id ?? ''),
      name: toDisplayText(team.name, 'Chưa đặt tên'),
      description: team.description,
      status: (team.status ?? 0) as number | LegacyStatus,
      leader: toDisplayText(team.leaderName ?? team.leader, ''),
      members: Number(team.totalMembers ?? team.members ?? 0),
      area: toDisplayText(team.area ?? team.currentArea, ''),
      contactPhone: toDisplayText(team.contactPhone, ''),
      memberDetails: Array.isArray(team.memberDetails) ? team.memberDetails : [],
    }));
  }, [rawTeamList]);

  useEffect(() => {
    if (!teams.length) {
      setSelectedTeamId(undefined);
      return;
    }

    const exists = teams.some((team) => team.id === selectedTeamId);
    if (!selectedTeamId || !exists) {
      setSelectedTeamId(teams[0].id);
    }
  }, [teams, selectedTeamId]);

  const selectedTeam = useMemo(
    () => teams.find((t) => t.id === selectedTeamId),
    [selectedTeamId, teams],
  );

  const { members, addMembersBulk, addMembersBulkStatus, promoteToLeader, removeMember } =
    useTeamMembers(selectedTeamId || '');

  const { profiles } = useUnassignedVolunteers({
    pageIndex: 1,
    pageSize: 200,
    verificationStatus: VerificationStatus.Approved,
  });

  const { campaigns, isLoading: isLoadingCampaigns } = useCampaigns({
    pageIndex: 1,
    pageSize: 200,
  });
  const { summary: selectedCampaignSummary } = useCampaignSummary(selectedCampaignId || '');
  const { teams: assignedCampaignTeams, isLoading: isLoadingAssignedCampaignTeams } =
    useCampaignTeams(selectedCampaignId || '');
  const { mutateAsync: assignTeamToCampaign, status: assignTeamToCampaignStatus } =
    useAssignTeamToCampaign();
  const { mutateAsync: updateCampaignTeamStatus } = useUpdateCampaignTeamStatus();
  const { mutateAsync: removeTeamFromCampaign, status: removeTeamFromCampaignStatus } =
    useRemoveTeamFromCampaign();

  const filteredTeams = useMemo(() => {
    return teams.filter(
      (t) =>
        t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (t.leader || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (t.area || '').toLowerCase().includes(searchTerm.toLowerCase()),
    );
  }, [searchTerm, teams]);

  const stats = {
    total: teams.length,
    active: teams.filter((t) => Number(t.status) === 1).length,
    members: teams.reduce((acc, t) => acc + (t.members || 0), 0),
    areas: new Set(teams.map((t) => t.area).filter(Boolean)).size,
  };

  const getStatusBadge = (status: number | LegacyStatus) =>
    getTeamStatusClass(parseEnumValue(status));

  const getStatusLabel = (status: number | LegacyStatus) =>
    TeamStatusLabel[parseEnumValue(status) as TeamStatus] ?? 'Không xác định';

  const resetCreateForm = () => {
    setName('');
    setDescription('');
    setContactPhone('');
    setCreateError('');
  };

  const availableVolunteers = useMemo(() => {
    const memberIds = new Set(
      (members || []).map((member: any) => String(member.userId ?? member.id ?? '')),
    );
    return (profiles || []).filter((profile: any) => {
      const id = String(profile.userId ?? profile.volunteerProfileId ?? '');
      return id && !memberIds.has(id);
    });
  }, [members, profiles]);

  const assignedCampaignTeamIds = useMemo(
    () => new Set((assignedCampaignTeams || []).map((item) => String(item.teamId))),
    [assignedCampaignTeams],
  );

  const availableCampaigns = useMemo(
    () => campaigns.filter((campaign) => Number(campaign.type) !== 0),
    [campaigns],
  );

  const selectedCampaignLabel = useMemo(
    () => availableCampaigns.find((campaign) => campaign.campaignId === selectedCampaignId),
    [availableCampaigns, selectedCampaignId],
  );

  const handleCreateTeam = async () => {
    if (!reliefStationId) {
      toast.error('Bạn chưa được phân vào trạm cứu trợ nào. Không thể tạo đội ngũ.');
      return;
    }

    const trimmedName = name.trim();
    const trimmedDescription = description.trim();
    const trimmedContactPhone = contactPhone.trim();

    if (!trimmedName) {
      setCreateError('Tên đội ngũ là bắt buộc.');
      return;
    }

    try {
      setIsCreating(true);
      setCreateError('');

      await createTeam({
        name: trimmedName,
        description: trimmedDescription || undefined,
        contactPhone: trimmedContactPhone || undefined,
      });

      setIsCreateOpen(false);
      resetCreateForm();
      await refetch();
      toast.success('Tạo đội ngũ mới thành công!');
    } catch (error: any) {
      const msg = error?.response?.data?.message || 'Không thể tạo đội ngũ. Vui lòng thử lại.';
      setCreateError(msg);
      toast.error(msg);
    } finally {
      setIsCreating(false);
    }
  };

  const handleAddMembersBulk = async () => {
    if (!selectedTeamId || selectedVolunteerIds.length === 0) {
      toast.error('Vui lòng chọn ít nhất một tình nguyện viên.');
      return;
    }

    try {
      await addMembersBulk({
        volunteerIds: selectedVolunteerIds,
      });
      setSelectedVolunteerIds([]);
      toast.success('Thao tác hoàn tất');
      setIsManageMembersOpen(false);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Có lỗi xảy ra khi lưu vào hệ thống.');
    }
  };

  const handlePromoteLeader = async (userId: string) => {
    if (!selectedTeamId) return;
    await promoteToLeader(userId);
  };

  const handleRemoveMember = async (userId: string) => {
    if (!selectedTeamId) return;
    await removeMember(userId);
  };

  const handleAssignTeamToSelectedCampaign = async () => {
    if (!selectedTeamId) {
      toast.error('Vui lòng chọn đội ngũ trước khi gán vào chiến dịch.');
      return;
    }

    if (!selectedCampaignId) {
      toast.error('Vui lòng chọn chiến dịch.');
      return;
    }

    try {
      await assignTeamToCampaign({
        id: selectedCampaignId,
        data: {
          teamId: selectedTeamId,
          role: Number(selectedCampaignRole),
          initialStatus: Number(selectedCampaignInitialStatus),
        },
      });
    } catch {
      return;
    }

    await refetch();
  };

  const handleUpdateAssignedTeamStatus = async (
    campaignId: string,
    teamId: string,
    status: number,
  ) => {
    try {
      await updateCampaignTeamStatus({ id: campaignId, teamId, data: { status } });
    } catch {
      return;
    }
  };

  const handleRemoveAssignedTeam = async (campaignId: string, teamId: string) => {
    try {
      await removeTeamFromCampaign({ id: campaignId, teamId });
    } catch {
      return;
    }
  };

  return (
    <DashboardLayout projects={coordinatorProjects} navItems={coordinatorNavItems}>
      {/* PAGE HEADER */}
      <div className="flex flex-wrap justify-between items-end gap-4 mb-8">
        <div className="flex flex-col gap-2">
          <h1 className="text-4xl text-primary font-black">Quản lý nhóm cứu trợ</h1>
          <p className="text-muted-foreground text-lg">
            Theo dõi và điều phối các đội tình nguyện tại các khu vực bị ảnh hưởng.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => {
              navigate('/portal/coordinator/volunteer-allocation');
            }}
            variant="outline"
            className="gap-2 text-base px-6 h-12"
          >
            <span className="material-symbols-outlined">add</span>
            Phân công tình nguyện viên
          </Button>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span>
                  <Button
                    variant="primary"
                    className="gap-2 text-base px-6 h-12"
                    onClick={() => {
                      if (!reliefStationId) {
                        toast.error('Bạn chưa được phân vào trạm nào. Không thể tạo đội ngũ.');
                        return;
                      }
                      setIsCreateOpen(true);
                    }}
                    disabled={isLoadingStation}
                  >
                    <span className="material-symbols-outlined">add</span>
                  </Button>
                </span>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-white dark:text-black">
                  {reliefStationId ? 'Tạo đội ngũ mới' : 'Cần được phân vào trạm trước khi tạo đội'}
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {/* STATS OVERVIEW */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Card className="bg-card dark:bg-card border-border hover:border-primary/50 transition-colors group">
          <CardContent className="p-6 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <p className="text-muted-foreground dark:text-muted-foreground text-sm font-semibold uppercase tracking-wider">
                Tổng số nhóm
              </p>
              <div className="size-8 rounded-full bg-blue-500/20 dark:bg-blue-500/30 flex items-center justify-center text-blue-400 group-hover:bg-blue-500 group-hover:text-white transition-all">
                <span className="material-symbols-outlined text-lg">groups</span>
              </div>
            </div>
            <p className="text-foreground dark:text-foreground text-4xl font-black">
              {stats.total}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-card dark:bg-card border-border hover:border-primary/50 transition-colors group relative overflow-hidden">
          <div className="absolute right-10 top-6 p-4 opacity-10 ">
            <span className="material-symbols-outlined text-6xl text-green-300 group-hover:text-green-500 transition-all">
              check_circle
            </span>
          </div>
          <CardContent className="p-6 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <p className="text-muted-foreground dark:text-muted-foreground text-sm font-semibold uppercase tracking-wider">
                Đang hoạt động
              </p>
              <div className="size-8 rounded-full bg-green-500/20 dark:bg-green-500/30 flex items-center justify-center text-green-400 group-hover:bg-green-500 group-hover:text-white transition-all">
                <span className="material-symbols-outlined text-lg">bolt</span>
              </div>
            </div>
            <p className="text-foreground dark:text-foreground text-4xl font-black ">
              {stats.active}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-card dark:bg-card border-border hover:border-primary/50 transition-colors group">
          <CardContent className="p-6 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <p className="text-muted-foreground dark:text-muted-foreground text-sm font-semibold uppercase tracking-wider">
                Tình nguyện viên
              </p>
              <div className="size-8 rounded-full bg-red-500/20 dark:bg-red-500/30 flex items-center justify-center text-red-400 group-hover:bg-red-500 group-hover:text-white transition-all">
                <span className="material-symbols-outlined text-lg">volunteer_activism</span>
              </div>
            </div>
            <p className="text-foreground dark:text-foreground text-4xl font-black">
              {stats.members}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-card dark:bg-card border-border hover:border-primary/50 transition-colors group">
          <CardContent className="p-6 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <p className="text-muted-foreground dark:text-muted-foreground text-sm font-semibold uppercase tracking-wider">
                Khu vực
              </p>
              <div className="size-8 rounded-full bg-purple-500/20 dark:bg-purple-500/30 flex items-center justify-center text-purple-400 group-hover:bg-purple-500 group-hover:text-white transition-all">
                <span className="material-symbols-outlined text-lg">location_on</span>
              </div>
            </div>
            <p className="text-foreground dark:text-foreground text-4xl font-black">
              {stats.areas} Tỉnh/TP
            </p>
          </CardContent>
        </Card>
      </div>

      {/* MAIN CONTENT SPLIT */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-22rem)]">
        {/* LEFT: GROUP LIST (TABLE) */}
        <div className="lg:col-span-2 flex flex-col gap-4 h-full">
          {/* Search & Filter */}
          <div className="flex gap-3">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted-foreground">
                <span className="material-symbols-outlined">search</span>
              </div>
              <input
                className="block w-full pl-10 pr-3 py-3 border border-slate-200 dark:border-border rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-foreground placeholder-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary sm:text-sm"
                placeholder="Tìm nhóm theo tên, khu vực, trưởng nhóm..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Button variant="outline" className="gap-2 h-auto">
              <span className="material-symbols-outlined">filter_list</span>
              Bộ lọc
            </Button>
          </div>

          {!isLoading && !reliefStationId && (
            <div className="rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-700 text-amber-800 dark:text-amber-300 px-4 py-3 text-sm flex items-start gap-2">
              <span className="material-symbols-outlined text-amber-500 shrink-0 mt-0.5">
                warning
              </span>
              <div>
                <p className="font-semibold">Bạn chưa được phân vào trạm cứu trợ nào.</p>
                <p className="text-amber-700 dark:text-amber-400 mt-0.5">
                  Chức năng tạo đội ngũ bị vô hiệu. Đang hiển thị tất cả đội ngũ trong hệ thống (chỉ
                  đọc).
                </p>
              </div>
            </div>
          )}

          {/* Table */}
          <div className="flex-1 overflow-auto rounded-xl border border-border bg-card dark:bg-card custom-scrollbar">
            {isLoading ? (
              <div className="p-4 space-y-3">
                {[1, 2, 3, 4, 5].map((k) => (
                  <Skeleton key={k} className="h-10 w-full" />
                ))}
              </div>
            ) : filteredTeams.length === 0 ? (
              <div className="h-full min-h-[320px] flex flex-col items-center justify-center gap-3 text-center p-6">
                <span className="material-symbols-outlined text-5xl text-muted-foreground">
                  {searchTerm ? 'search_off' : 'groups'}
                </span>
                <p className="text-lg font-semibold text-slate-900 dark:text-foreground">
                  {searchTerm
                    ? 'Không tìm thấy đội ngũ phù hợp'
                    : teams.length === 0
                      ? 'Chưa có đội ngũ nào'
                      : 'Không có kết quả'}
                </p>
                <p className="text-sm text-muted-foreground max-w-md">
                  {searchTerm
                    ? 'Thử thay đổi từ khóa tìm kiếm.'
                    : reliefStationId
                      ? 'Hãy tạo đội ngũ đầu tiên để bắt đầu quản lý và phân công tình nguyện viên.'
                      : 'Liên hệ quản lý để được phân vào trạm, sau đó có thể tạo đội ngũ.'}
                </p>
                {!searchTerm && reliefStationId && (
                  <Button className="gap-2" onClick={() => setIsCreateOpen(true)}>
                    <span className="material-symbols-outlined">add</span>
                    Tạo đội ngũ mới
                  </Button>
                )}
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 bg-slate-50 dark:bg-slate-900 z-10">
                  <tr className="border-b border-slate-200 dark:border-border">
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Tên nhóm
                    </th>
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Khu vực
                    </th>
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Trưởng nhóm
                    </th>
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Thành viên
                    </th>
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Trạng thái
                    </th>
                    <th className="px-6 py-4"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-border-dark">
                  {filteredTeams.map((team) => (
                    <tr
                      key={team.id}
                      onClick={() => setSelectedTeamId(team.id)}
                      className={cn(
                        'cursor-pointer transition-colors hover:bg-slate-50 dark:hover:bg-muted',
                        selectedTeamId === team.id ? 'bg-primary/10' : '',
                      )}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div
                            className={cn(
                              'size-2 rounded-full mr-3',
                              selectedTeamId === team.id ? 'bg-primary' : 'bg-transparent',
                            )}
                          ></div>
                          <span
                            className={cn(
                              'text-sm font-bold',
                              selectedTeamId === team.id
                                ? 'text-primary'
                                : 'text-slate-900 dark:text-foreground',
                            )}
                          >
                            {team.name || 'Chưa đặt tên'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                        {team.area || 'Chưa cập nhật'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900 dark:text-foreground">
                        {team.leader || 'Chưa phân công'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                        {team.members || 0} người
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={cn(
                            'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                            getStatusBadge(team.status),
                          )}
                        >
                          {getStatusLabel(team.status)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button className="text-muted-foreground hover:text-primary transition-colors">
                          <span className="material-symbols-outlined">edit</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* RIGHT: DETAIL PANEL */}
        <div className="lg:col-span-1 flex flex-col h-full gap-4">
          {selectedTeam ? (
            <div className="rounded-xl border border-border bg-card dark:bg-card flex flex-col h-full overflow-hidden shadow-lg">
              {/* Header */}
              <div className="p-6 border-b border-slate-200 dark:border-border shrink-0">
                <div className="flex justify-between items-start mb-4">
                  <span
                    className={cn(
                      'inline-flex items-center px-3 py-1 rounded-full text-sm font-medium',
                      getStatusBadge(selectedTeam.status),
                    )}
                  >
                    {getStatusLabel(selectedTeam.status)}
                  </span>
                  <div className="flex gap-2">
                    <button
                      className="p-2 text-muted-foreground hover:text-primary hover:bg-slate-100 dark:hover:bg-white/10 rounded-lg transition-colors"
                      onClick={() => {
                        setSelectedCampaignId('');
                        setSelectedCampaignRole(String(CampaignTeamRole.Relief));
                        setSelectedCampaignInitialStatus(String(CampaignTeamStatus.Invited));
                        setIsCampaignAssignmentOpen(true);
                      }}
                      title="Gán đội vào chiến dịch"
                    >
                      <span className="material-symbols-outlined">campaign</span>
                    </button>
                    <button className="p-2 text-muted-foreground hover:text-slate-900 dark:hover:text-foreground hover:bg-slate-100 dark:hover:bg-white/10 rounded-lg transition-colors">
                      <span className="material-symbols-outlined">edit</span>
                    </button>
                    <button className="p-2 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors">
                      <span className="material-symbols-outlined">delete</span>
                    </button>
                  </div>
                </div>
                <h3 className="text-2xl font-bold text-slate-900 dark:text-foreground mb-2">
                  {selectedTeam.name}
                </h3>
                <div className="flex flex-col gap-2">
                  <div className="flex items-center text-muted-foreground text-sm">
                    <span className="material-symbols-outlined text-lg mr-2">location_on</span>
                    {selectedTeam.area || 'Chưa định vị'}
                  </div>
                  <div className="flex items-center text-muted-foreground text-sm">
                    <span className="material-symbols-outlined text-lg mr-2">person</span>
                    Trưởng nhóm:{' '}
                    <span className="text-slate-900 dark:text-foreground font-medium ml-1">
                      {selectedTeam.leader || 'Chưa phân công'}
                    </span>
                  </div>
                  <div className="flex items-center text-muted-foreground text-sm">
                    <span className="material-symbols-outlined text-lg mr-2">call</span>
                    Liên hệ: {selectedTeam.contactPhone || 'Chưa cập nhật'}
                  </div>
                </div>
                <p className="mt-4 text-sm text-muted-foreground">
                  {selectedTeam.description?.trim() || 'Chưa có mô tả cho đội ngũ này.'}
                </p>
                <div className="mt-4 rounded-xl border border-border bg-muted/20 p-4 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        Chiến dịch được phân công
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Moderator điều phối đội vào chiến dịch từ đây.
                      </p>
                    </div>
                    <Button
                      size="sm"
                      className="gap-2"
                      onClick={() => {
                        setSelectedCampaignId('');
                        setSelectedCampaignRole(String(CampaignTeamRole.Relief));
                        setSelectedCampaignInitialStatus(String(CampaignTeamStatus.Invited));
                        setIsCampaignAssignmentOpen(true);
                      }}
                    >
                      <span className="material-symbols-outlined text-sm">add</span>
                      Gán chiến dịch
                    </Button>
                  </div>

                  {selectedCampaignId ? (
                    isLoadingAssignedCampaignTeams ? (
                      <p className="text-sm text-muted-foreground">
                        Đang tải phân công chiến dịch...
                      </p>
                    ) : assignedCampaignTeams.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        Chiến dịch này chưa có đội nào được gán.
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {assignedCampaignTeams.map((assignment) => {
                          const isCurrentTeam =
                            String(assignment.teamId) === String(selectedTeam.id);
                          return (
                            <div
                              key={assignment.campaignTeamId}
                              className={cn(
                                'rounded-lg border p-3 space-y-3',
                                isCurrentTeam
                                  ? 'border-primary/40 bg-primary/5'
                                  : 'border-border bg-background',
                              )}
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <p className="font-medium text-foreground">
                                    {assignment.teamName}
                                  </p>
                                  <p className="text-xs text-muted-foreground mt-1">
                                    Vai trò:{' '}
                                    {CAMPAIGN_TEAM_ROLE_LABEL[assignment.role] || assignment.role}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    Thành viên: {assignment.memberCount}
                                  </p>
                                </div>
                                <span className="inline-flex items-center rounded-full border border-border px-2.5 py-1 text-xs font-medium text-foreground">
                                  {CAMPAIGN_TEAM_STATUS_LABEL[assignment.status] ||
                                    assignment.status}
                                </span>
                              </div>

                              {isCurrentTeam && selectedCampaignId && (
                                <div className="flex flex-wrap items-center gap-2">
                                  <Select
                                    onValueChange={(value) =>
                                      handleUpdateAssignedTeamStatus(
                                        selectedCampaignId,
                                        assignment.teamId,
                                        Number(value),
                                      )
                                    }
                                  >
                                    <SelectTrigger className="w-[220px]">
                                      <SelectValue placeholder="Cập nhật trạng thái" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {Object.entries(CAMPAIGN_TEAM_STATUS_LABEL).map(
                                        ([key, label]) => (
                                          <SelectItem key={key} value={key}>
                                            {label}
                                          </SelectItem>
                                        ),
                                      )}
                                    </SelectContent>
                                  </Select>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="text-destructive"
                                    onClick={() =>
                                      handleRemoveAssignedTeam(
                                        selectedCampaignId,
                                        assignment.teamId,
                                      )
                                    }
                                    disabled={removeTeamFromCampaignStatus === 'pending'}
                                  >
                                    Gỡ khỏi chiến dịch
                                  </Button>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Chọn một chiến dịch trong hộp thoại gán để xem chi tiết phân công đội.
                    </p>
                  )}
                </div>
                {/* Mini Map Preview Placeholder */}
                <div className="mt-4 w-full h-32 rounded-lg bg-slate-100 dark:bg-background relative flex items-center justify-center border border-slate-200 dark:border-border group cursor-pointer">
                  <div
                    className="absolute inset-0 bg-cover bg-center opacity-50 group-hover:opacity-75 transition-opacity"
                    style={{
                      backgroundImage: `url('https://lh3.googleusercontent.com/aida-public/AB6AXuAv-XpNn70KGwrXp8rU_PBWA19iotbS4EQ5r83F1IZQ4DorzR3dmzjCCNKqSwS-f2v0LnjSMd9L0uDn7n0krrHMSPez9pxN6Tr8mAxFhncmHLANE_ySHEEt27d2SdtBlUnjUPNMmv2v00yJpe5xbu7qgpz09HIniz9B_-BAvQD2MZlzDavZH-rj20v6Avlog8EycqbI97KXvENXy1oDnrbrFgwcFUc6EH9q63HXbsmdMnFoO8SD79z0aL4sAvobaodKWw455nLNzwQ')`,
                    }}
                  />
                  <div className="z-10 bg-white/80 dark:bg-card/80 px-3 py-1.5 rounded-full flex items-center gap-1 shadow-sm backdrop-blur-sm text-slate-900 dark:text-foreground">
                    <span className="material-symbols-outlined text-sm">map</span>
                    <span className="text-xs font-bold">Xem bản đồ</span>
                  </div>
                </div>
              </div>

              {/* Member List */}
              <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                <div className="flex justify-between items-center mb-4 px-2">
                  <h4 className="text-sm font-bold text-slate-900 dark:text-foreground uppercase tracking-wide">
                    Thành viên ({selectedTeam.members})
                  </h4>
                  <button
                    className="text-primary text-sm font-bold hover:underline"
                    onClick={() => setIsManageMembersOpen(true)}
                  >
                    Quản lý
                  </button>
                </div>
                <div className="flex flex-col gap-2">
                  {members && members.length > 0 ? (
                    members.map((member: any) => (
                      <div
                        key={member.userId ?? member.id}
                        className="flex items-center p-3 rounded-lg bg-slate-50 dark:bg-background border border-transparent hover:border-slate-300 dark:hover:border-border transition-colors group/member"
                      >
                        {member.avatarUrl ? (
                          <div
                            className="size-10 rounded-full bg-cover bg-center mr-3"
                            style={{ backgroundImage: `url('${member.avatarUrl}')` }}
                          />
                        ) : (
                          <div className="size-10 rounded-full bg-slate-200 dark:bg-slate-700 mr-3" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-slate-900 dark:text-foreground truncate">
                            {toDisplayText(
                              member.displayName ?? member.fullName ?? member.name,
                              'Không tên',
                            )}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {member.isLeader || member.role === 1 || String(member.role) === '1'
                              ? 'Trưởng nhóm'
                              : String(member.role) === '2'
                                ? 'Thành viên'
                                : member.roleName || member.role || 'Thành viên'}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover/member:opacity-100 transition-opacity">
                          {!member.isLeader && (
                            <button
                              className="text-muted-foreground hover:text-primary transition-colors p-1"
                              onClick={() =>
                                handlePromoteLeader(String(member.userId ?? member.id))
                              }
                            >
                              <span className="material-symbols-outlined text-xl">
                                military_tech
                              </span>
                            </button>
                          )}
                          <button
                            className="text-muted-foreground hover:text-red-500 transition-colors p-1"
                            onClick={() => handleRemoveMember(String(member.userId ?? member.id))}
                          >
                            <span className="material-symbols-outlined text-xl">
                              remove_circle_outline
                            </span>
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center p-8 text-muted-foreground text-sm">
                      Không có thông tin chi tiết thành viên.
                    </div>
                  )}
                </div>
              </div>

              {/* Footer Action */}
              <div className="p-4 border-t border-slate-200 dark:border-border bg-slate-50 dark:bg-background">
                <Button
                  variant="outline"
                  className="w-full gap-2 border-dashed bg-transparent hover:bg-slate-200 dark:hover:bg-white/5 text-slate-900 dark:text-foreground"
                  onClick={() => setIsManageMembersOpen(true)}
                >
                  <span className="material-symbols-outlined text-lg">person_add</span>
                  Thêm tình nguyện viên
                </Button>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-border bg-card dark:bg-card flex items-center justify-center h-full text-muted-foreground">
              Chọn một nhóm để xem chi tiết
            </div>
          )}
        </div>
      </div>

      <Dialog
        open={isCreateOpen}
        onOpenChange={(open) => {
          setIsCreateOpen(open);
          if (!open) {
            resetCreateForm();
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tạo đội ngũ mới</DialogTitle>
            <DialogDescription>
              Nhập thông tin cơ bản để tạo đội ngũ. Mô tả và số điện thoại là tùy chọn.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Tên đội ngũ *</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="VD: Đội hỗ trợ Quảng Bình"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Mô tả</label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Mô tả vai trò hoặc khu vực phụ trách"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Số điện thoại liên hệ</label>
              <Input
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                placeholder="VD: 0901234567"
              />
            </div>

            {createError ? <p className="text-sm text-red-500">{createError}</p> : null}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)} disabled={isCreating}>
              Hủy
            </Button>
            <Button onClick={handleCreateTeam} disabled={isCreating}>
              {isCreating ? 'Đang tạo...' : 'Tạo đội ngũ'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isManageMembersOpen} onOpenChange={setIsManageMembersOpen}>
        <DialogContent className="sm:max-w-[640px]">
          <DialogHeader>
            <DialogTitle>Quản lý thành viên đội</DialogTitle>
            <DialogDescription>
              Thêm nhiều tình nguyện viên, cập nhật leader hoặc xóa member khỏi đội.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Chọn tình nguyện viên để thêm</label>
              <Select
                onValueChange={(value) => {
                  setSelectedVolunteerIds((prev) =>
                    prev.includes(value) ? prev : [...prev, value],
                  );
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Chọn tình nguyện viên" />
                </SelectTrigger>
                <SelectContent>
                  {availableVolunteers.map((volunteer: any) => {
                    const id = String(volunteer.userId ?? volunteer.volunteerProfileId ?? '');
                    return (
                      <SelectItem key={id} value={id}>
                        {volunteer.fullName || volunteer.email || id}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            {selectedVolunteerIds.length > 0 && (
              <div className="rounded-lg border border-border p-3 bg-muted/30 flex flex-wrap gap-2">
                {selectedVolunteerIds.map((id) => {
                  const matched = availableVolunteers.find(
                    (volunteer: any) =>
                      String(volunteer.userId ?? volunteer.volunteerProfileId ?? '') === id,
                  );
                  return (
                    <button
                      key={id}
                      className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1 text-xs bg-background"
                      onClick={() =>
                        setSelectedVolunteerIds((prev) => prev.filter((item) => item !== id))
                      }
                    >
                      {matched?.fullName || matched?.email || id}
                      <span className="material-symbols-outlined text-[14px]">close</span>
                    </button>
                  );
                })}
              </div>
            )}

            <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-3">
              <p className="text-sm font-semibold text-foreground">Thành viên hiện tại</p>
              {members?.length ? (
                members.map((member: any) => (
                  <div
                    key={member.userId ?? member.id}
                    className="flex items-center justify-between gap-3 rounded-lg bg-background px-3 py-2 border border-border"
                  >
                    <div>
                      <p className="font-medium text-sm text-foreground">
                        {toDisplayText(
                          member.displayName ?? member.fullName ?? member.name,
                          'Không tên',
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {member.isLeader || member.role === 1 || String(member.role) === '1'
                          ? 'Trưởng nhóm'
                          : String(member.role) === '2'
                            ? 'Thành viên'
                            : member.roleName || member.role || 'Thành viên'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {!member.isLeader && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1"
                          onClick={() => handlePromoteLeader(String(member.userId ?? member.id))}
                        >
                          <span className="material-symbols-outlined text-sm">military_tech</span>
                          Promote Leader
                        </Button>
                      )}
                      <Button
                        variant="destructive"
                        size="sm"
                        className="gap-1"
                        onClick={() => handleRemoveMember(String(member.userId ?? member.id))}
                      >
                        <span className="material-symbols-outlined text-sm">delete</span>
                        Xóa
                      </Button>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">Chưa có thành viên nào trong đội.</p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsManageMembersOpen(false)}>
              Đóng
            </Button>
            <Button
              onClick={handleAddMembersBulk}
              disabled={selectedVolunteerIds.length === 0 || addMembersBulkStatus === 'pending'}
            >
              {addMembersBulkStatus === 'pending' ? 'Đang thêm...' : 'Thêm thành viên đã chọn'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isCampaignAssignmentOpen} onOpenChange={setIsCampaignAssignmentOpen}>
        <DialogContent className="sm:max-w-[760px]">
          <DialogHeader>
            <DialogTitle>Gán đội vào chiến dịch</DialogTitle>
            <DialogDescription>
              Chỉ dùng các API teams/campaigns dành cho moderator điều phối đội vào chiến dịch.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Chọn chiến dịch</label>
              <Select value={selectedCampaignId} onValueChange={setSelectedCampaignId}>
                <SelectTrigger>
                  <SelectValue
                    placeholder={isLoadingCampaigns ? 'Đang tải chiến dịch...' : 'Chọn chiến dịch'}
                  />
                </SelectTrigger>
                <SelectContent>
                  {availableCampaigns.map((campaign) => (
                    <SelectItem key={campaign.campaignId} value={campaign.campaignId}>
                      {campaign.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedCampaignLabel && (
              <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-foreground">{selectedCampaignLabel.name}</p>
                  <span
                    className={cn(
                      'inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium',
                      getCampaignStatusClass(selectedCampaignLabel.status),
                    )}
                  >
                    {getCampaignStatusLabel(selectedCampaignLabel.status)}
                  </span>
                  <span className="inline-flex items-center rounded-full border border-border px-2.5 py-1 text-xs font-medium">
                    {getCampaignTypeLabel(selectedCampaignLabel.type)}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Thời gian: {new Date(selectedCampaignLabel.startDate).toLocaleDateString('vi-VN')}{' '}
                  - {new Date(selectedCampaignLabel.endDate).toLocaleDateString('vi-VN')}
                </p>
                {selectedCampaignSummary && (
                  <p className="text-xs text-muted-foreground">
                    Ngân sách còn lại:{' '}
                    {selectedCampaignSummary.remainingBudget?.toLocaleString('vi-VN')} • Tiến độ
                    nhân lực: {selectedCampaignSummary.peopleReached}/
                    {selectedCampaignSummary.peopleTarget}
                  </p>
                )}
                {selectedTeam && assignedCampaignTeamIds.has(String(selectedTeam.id)) && (
                  <p className="text-xs text-amber-600 dark:text-amber-400">
                    Đội này đã được gán vào chiến dịch được chọn.
                  </p>
                )}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Vai trò trong chiến dịch</label>
                <Select value={selectedCampaignRole} onValueChange={setSelectedCampaignRole}>
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn vai trò" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(CAMPAIGN_TEAM_ROLE_LABEL).map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Trạng thái ban đầu</label>
                <Select
                  value={selectedCampaignInitialStatus}
                  onValueChange={setSelectedCampaignInitialStatus}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn trạng thái" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(CAMPAIGN_TEAM_STATUS_LABEL).map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {selectedCampaignId && (
              <div className="rounded-xl border border-border bg-background p-4 space-y-3">
                <p className="text-sm font-semibold text-foreground">Đội đã tham gia chiến dịch</p>
                {isLoadingAssignedCampaignTeams ? (
                  <p className="text-sm text-muted-foreground">Đang tải danh sách đội...</p>
                ) : assignedCampaignTeams.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Chưa có đội nào trong chiến dịch này.
                  </p>
                ) : (
                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1 custom-scrollbar">
                    {assignedCampaignTeams.map((assignment) => (
                      <div
                        key={assignment.campaignTeamId}
                        className={cn(
                          'rounded-lg border px-3 py-2',
                          String(assignment.teamId) === String(selectedTeamId)
                            ? 'border-primary/40 bg-primary/5'
                            : 'border-border',
                        )}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-medium text-foreground">
                              {assignment.teamName}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {CAMPAIGN_TEAM_ROLE_LABEL[assignment.role] || assignment.role} •{' '}
                              {CAMPAIGN_TEAM_STATUS_LABEL[assignment.status] || assignment.status}
                            </p>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {assignment.memberCount} thành viên
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCampaignAssignmentOpen(false)}>
              Đóng
            </Button>
            <Button
              onClick={handleAssignTeamToSelectedCampaign}
              disabled={
                !selectedTeamId ||
                !selectedCampaignId ||
                assignTeamToCampaignStatus === 'pending' ||
                assignedCampaignTeamIds.has(String(selectedTeamId))
              }
            >
              {assignTeamToCampaignStatus === 'pending' ? 'Đang gán...' : 'Gán đội vào chiến dịch'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
