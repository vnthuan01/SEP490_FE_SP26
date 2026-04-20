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
  useCampaignTeams,
  useCampaigns,
  useUpdateCampaignStatus,
} from '@/hooks/useCampaigns';
import { campaignService } from '@/services/campaignService';
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
import { coordinatorNavGroups } from './components/sidebarConfig';
import { toast } from 'sonner';
import { handleHookError } from '@/hooks/hookErrorUtils';
import { parseApiError } from '@/lib/apiErrors';
import type { TeamStatus } from '@/enums/beEnums';
import {
  CampaignTeamRole,
  CampaignTeamStatus,
  CampaignType,
  TeamStatusLabel,
  VerificationStatus,
  getTeamStatusClass,
  parseEnumValue,
} from '@/enums/beEnums';

type LegacyStatus = 'available' | 'moving' | 'rescuing' | 'lost-contact';

type TeamItem = {
  id: string;
  name: string;
  description?: string | null;
  status: number | LegacyStatus;
  teamType?: number;
  teamTypeName?: string | null;
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

type TeamStatusFilter = 'all' | 'active' | 'idle' | 'other';

const TEAM_PAGE_SIZE = 6;
const TEAM_TYPE_OPTIONS = [
  { value: 1, label: 'Cứu trợ' },
  { value: 2, label: 'Cứu hộ' },
] as const;

const CAMPAIGN_TEAM_STATUS_LABEL: Record<number, string> = {
  0: 'Đã mời',
  1: 'Đã chấp nhận',
  2: 'Đang tham gia',
  3: 'Hoàn thành',
  4: 'Rút lui',
  5: 'Đã hủy',
};

const buildPageItems = (currentPage: number, totalPages: number): Array<number | 'ellipsis'> => {
  if (totalPages <= 1) return [1];
  const pages = new Set<number>([1, totalPages, currentPage]);
  if (currentPage > 1) pages.add(currentPage - 1);
  if (currentPage < totalPages) pages.add(currentPage + 1);
  const sorted = Array.from(pages).sort((a, b) => a - b);
  const items: Array<number | 'ellipsis'> = [];
  sorted.forEach((page, index) => {
    const prev = sorted[index - 1];
    if (prev && page - prev > 1) items.push('ellipsis');
    items.push(page);
  });
  return items;
};

export default function CoordinatorTeamManagementPage() {
  const { station, isLoading: isLoadingStation } = useMyReliefStation();
  const reliefStationId = station?.reliefStationId;
  const hasAssignedStation = !!reliefStationId;

  // ── If moderator has a station → load teams in that station
  // ── If no station → fallback to all teams (read-only, create disabled)
  const {
    teams: inStationTeams,
    isLoading: isLoadingInStationTeams,
    refetch: refetchInStation,
  } = useTeamsInStation(reliefStationId);

  const {
    teams: allTeamsRaw,
    isLoadingTeams,
    refetchTeams,
    createTeam,
    updateTeam,
  } = useTeams(undefined, undefined, { enabledList: false });

  // Unified refetch
  const refetch = reliefStationId ? refetchInStation : refetchTeams;

  // Unified raw list depending on station presence
  const rawTeamList = reliefStationId ? inStationTeams : allTeamsRaw;
  const isLoadingTeamList = reliefStationId ? isLoadingInStationTeams : isLoadingTeams;

  const [selectedTeamId, setSelectedTeamId] = useState<string>();
  const [searchTerm, setSearchTerm] = useState('');
  const [teamStatusFilter, setTeamStatusFilter] = useState<TeamStatusFilter>('all');
  const [listPage, setListPage] = useState(1);
  const [pageInput, setPageInput] = useState('1');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isManageMembersOpen, setIsManageMembersOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [teamType, setTeamType] = useState<string>('1');
  const [createError, setCreateError] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [selectedVolunteerIds, setSelectedVolunteerIds] = useState<string[]>([]);
  const [manageMembersError, setManageMembersError] = useState('');
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isReliefCampaignAssignOpen, setIsReliefCampaignAssignOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editContactPhone, setEditContactPhone] = useState('');
  const [editTeamType, setEditTeamType] = useState<string>('1');
  const [editStatus, setEditStatus] = useState(0);
  const [editError, setEditError] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [selectedReliefCampaignId, setSelectedReliefCampaignId] = useState('');
  const [reliefCampaignAssignError, setReliefCampaignAssignError] = useState('');
  const [assignedReliefCampaigns, setAssignedReliefCampaigns] = useState<
    Array<{
      campaignId: string;
      campaignName: string;
      status: number;
      campaignTeamId: string;
      memberCount: number;
    }>
  >([]);
  const [assignedReliefCampaignsVersion, setAssignedReliefCampaignsVersion] = useState(0);
  const navigate = useNavigate();

  const isLoading = isLoadingStation || isLoadingTeamList;

  const teams: TeamItem[] = useMemo(() => {
    if (!Array.isArray(rawTeamList)) return [];

    return rawTeamList.map((team: any) => ({
      id: String(team.teamId ?? team.id ?? ''),
      name: toDisplayText(team.name, 'Chưa đặt tên'),
      description: team.description,
      status: (team.status ?? 0) as number | LegacyStatus,
      teamType: Number(team.teamType ?? 1),
      teamTypeName: toDisplayText(team.teamTypeName, ''),
      leader: toDisplayText(team.leaderName ?? team.leader, ''),
      members: Number(team.totalMembers ?? team.members ?? 0),
      area: toDisplayText(team.area ?? team.currentArea, ''),
      contactPhone: toDisplayText(team.contactPhone, ''),
      memberDetails: Array.isArray(team.memberDetails) ? team.memberDetails : [],
    }));
  }, [rawTeamList]);

  // Không auto-select khi load — chờ user tự click vào nhóm
  useEffect(() => {
    if (!teams.length && selectedTeamId !== undefined) {
      setSelectedTeamId(undefined);
    }
  }, [selectedTeamId, teams.length]);

  const selectedTeam = useMemo(
    () => teams.find((t) => t.id === selectedTeamId),
    [selectedTeamId, teams],
  );

  const { members, addMembersBulk, addMembersBulkStatus, promoteToLeader, removeMember } =
    useTeamMembers(selectedTeamId || '');

  const { profiles } = useUnassignedVolunteers(
    {
      pageIndex: 1,
      pageSize: 200,
      verificationStatus: VerificationStatus.Approved,
    },
    { enabled: hasAssignedStation },
  );
  const { campaigns, refetch: refetchCampaigns } = useCampaigns(
    {
      pageIndex: 1,
      pageSize: 200,
      locationId: station?.locationId,
      type: CampaignType.Relief,
    },
    { enabled: !!station?.locationId },
  );
  const { teams: assignedReliefCampaignTeams = [] } = useCampaignTeams(
    selectedReliefCampaignId || '',
  );
  const { mutateAsync: assignTeamToCampaign, status: assignTeamToCampaignStatus } =
    useAssignTeamToCampaign();
  const { mutateAsync: updateCampaignStatus } = useUpdateCampaignStatus();

  const filteredTeams = useMemo(() => {
    return teams.filter((t) => {
      const matchesSearch =
        t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (t.leader || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (t.area || '').toLowerCase().includes(searchTerm.toLowerCase());
      const statusValue = Number(parseEnumValue(t.status));
      const matchesFilter =
        teamStatusFilter === 'all'
          ? true
          : teamStatusFilter === 'active'
            ? statusValue === 1
            : teamStatusFilter === 'idle'
              ? statusValue === 0
              : statusValue !== 0 && statusValue !== 1;
      return matchesSearch && matchesFilter;
    });
  }, [searchTerm, teamStatusFilter, teams]);

  const stats = {
    total: teams.length,
    active: teams.filter((t) => Number(t.status) === 1).length,
    members: teams.reduce((acc, t) => acc + (t.members || 0), 0),
    areas: new Set(teams.map((t) => t.area).filter(Boolean)).size,
  };

  const totalListPages = Math.max(1, Math.ceil(filteredTeams.length / TEAM_PAGE_SIZE));

  useEffect(() => {
    if (listPage !== 1) {
      setListPage(1);
    }
  }, [listPage, searchTerm, teamStatusFilter]);

  useEffect(() => {
    if (listPage > totalListPages) setListPage(totalListPages);
  }, [listPage, totalListPages]);

  useEffect(() => {
    const nextPageInput = String(listPage);
    if (pageInput !== nextPageInput) {
      setPageInput(nextPageInput);
    }
  }, [listPage, pageInput]);

  const paginatedTeams = useMemo(() => {
    const start = (listPage - 1) * TEAM_PAGE_SIZE;
    return filteredTeams.slice(start, start + TEAM_PAGE_SIZE);
  }, [filteredTeams, listPage]);

  const listPageItems = buildPageItems(listPage, totalListPages);

  const getStatusBadge = (status: number | LegacyStatus) =>
    getTeamStatusClass(parseEnumValue(status));

  const getStatusLabel = (status: number | LegacyStatus) =>
    TeamStatusLabel[parseEnumValue(status) as TeamStatus] ?? 'Không xác định';

  const handleJumpToPage = () => {
    const nextPage = Number(pageInput);
    if (!Number.isFinite(nextPage)) {
      setPageInput(String(listPage));
      return;
    }
    setListPage(Math.min(Math.max(1, Math.trunc(nextPage)), totalListPages));
  };

  const resetCreateForm = () => {
    setName('');
    setDescription('');
    setContactPhone('');
    setTeamType('1');
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

  const reliefCampaigns = useMemo(
    () => campaigns.filter((campaign) => Number(campaign.type) === CampaignType.Relief),
    [campaigns],
  );

  const selectedTeamIsRelief = Number(selectedTeam?.teamType ?? 1) === 1;
  const reliefCampaignAssignmentExists = useMemo(
    () =>
      assignedReliefCampaignTeams.some((item) => String(item.teamId) === String(selectedTeamId)),
    [assignedReliefCampaignTeams, selectedTeamId],
  );

  useEffect(() => {
    let active = true;

    const loadAssignedReliefCampaigns = async () => {
      if (
        !selectedTeamId ||
        Number(selectedTeam?.teamType ?? 1) !== 1 ||
        reliefCampaigns.length === 0
      ) {
        if (active) {
          setAssignedReliefCampaigns((prev) => (prev.length > 0 ? [] : prev));
        }
        return;
      }

      const results = await Promise.all(
        reliefCampaigns.map(async (campaign) => {
          try {
            const response = await campaignService.getTeams(campaign.campaignId);
            const matched = (response.data || []).find(
              (item) => String(item.teamId) === String(selectedTeamId),
            );
            if (!matched) return null;
            return {
              campaignId: campaign.campaignId,
              campaignName: campaign.name,
              status: matched.status,
              campaignTeamId: matched.campaignTeamId,
              memberCount: matched.memberCount,
            };
          } catch {
            return null;
          }
        }),
      );

      if (active) {
        const nextAssignments = results.filter(Boolean) as Array<{
          campaignId: string;
          campaignName: string;
          status: number;
          campaignTeamId: string;
          memberCount: number;
        }>;

        setAssignedReliefCampaigns((prev) => {
          const hasSameAssignments =
            prev.length === nextAssignments.length &&
            prev.every((item, index) => {
              const nextItem = nextAssignments[index];
              return (
                nextItem &&
                item.campaignId === nextItem.campaignId &&
                item.campaignTeamId === nextItem.campaignTeamId &&
                item.status === nextItem.status &&
                item.memberCount === nextItem.memberCount &&
                item.campaignName === nextItem.campaignName
              );
            });

          return hasSameAssignments ? prev : nextAssignments;
        });
      }
    };

    void loadAssignedReliefCampaigns();

    return () => {
      active = false;
    };
  }, [assignedReliefCampaignsVersion, reliefCampaigns, selectedTeam?.teamType, selectedTeamId]);

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
        teamType: Number(teamType),
      });

      setIsCreateOpen(false);
      resetCreateForm();
      await refetch();
      toast.success('Tạo đội ngũ mới thành công!');
    } catch (error: any) {
      const msg = parseApiError(error, 'Không thể tạo đội ngũ. Vui lòng thử lại.').message;
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
      setManageMembersError('');
      await addMembersBulk({
        volunteerIds: selectedVolunteerIds,
      });
      setSelectedVolunteerIds([]);
      toast.success('Thao tác hoàn tất');
      setIsManageMembersOpen(false);
    } catch (e: any) {
      setManageMembersError(parseApiError(e, 'Có lỗi xảy ra khi lưu vào hệ thống.').message);
      handleHookError(e, 'Có lỗi xảy ra khi lưu vào hệ thống.');
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

  const handleOpenEdit = (team: TeamItem) => {
    setEditName(team.name);
    setEditDescription(team.description || '');
    setEditContactPhone(team.contactPhone || '');
    setEditTeamType(String(team.teamType ?? 1));
    setEditStatus(Number(parseEnumValue(team.status)));
    setEditError('');
    setIsEditOpen(true);
  };

  const handleEditTeam = async () => {
    if (!selectedTeamId) return;
    const trimmedName = editName.trim();
    if (!trimmedName) {
      setEditError('Tên đội ngũ là bắt buộc.');
      return;
    }
    try {
      setIsEditing(true);
      setEditError('');
      await updateTeam({
        id: selectedTeamId,
        data: {
          name: trimmedName,
          description: editDescription.trim(),
          status: editStatus,
          contactPhone: editContactPhone.trim() || undefined,
          teamType: Number(editTeamType),
          leaderId: '',
        },
      });
      setIsEditOpen(false);
      await refetch();
      toast.success('Cập nhật đội ngũ thành công!');
    } catch (error: any) {
      const msg = parseApiError(error, 'Không thể cập nhật đội ngũ.').message;
      setEditError(msg);
      toast.error(msg);
    } finally {
      setIsEditing(false);
    }
  };

  const handleAssignReliefTeamToCampaign = async () => {
    if (!selectedTeamId || !selectedTeamIsRelief) {
      setReliefCampaignAssignError('Chỉ team cứu trợ mới được gán vào chiến dịch cứu trợ.');
      return;
    }
    if (!selectedReliefCampaignId) {
      setReliefCampaignAssignError('Vui lòng chọn chiến dịch cứu trợ của trạm.');
      return;
    }
    if (reliefCampaignAssignmentExists) {
      setReliefCampaignAssignError('Team này đã được gán vào chiến dịch cứu trợ đã chọn.');
      return;
    }

    try {
      setReliefCampaignAssignError('');
      await assignTeamToCampaign({
        id: selectedReliefCampaignId,
        data: {
          teamId: selectedTeamId,
          role: CampaignTeamRole.Relief,
          initialStatus: CampaignTeamStatus.Active,
        },
      });

      await updateCampaignStatus({
        id: selectedReliefCampaignId,
        data: {
          status: 1,
        },
      });

      await Promise.all([refetchCampaigns(), refetch()]);
      setAssignedReliefCampaignsVersion((prev) => prev + 1);
      setIsReliefCampaignAssignOpen(false);
      setSelectedReliefCampaignId('');
      toast.success('Đã gán team vào chiến dịch cứu trợ và kích hoạt chiến dịch.');
    } catch (error) {
      setReliefCampaignAssignError(
        parseApiError(error, 'Không thể gán team vào chiến dịch cứu trợ.').message,
      );
    }
  };

  return (
    <DashboardLayout navGroups={coordinatorNavGroups}>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="text-4xl text-primary font-black">Quản lý nhóm cứu trợ</h1>
          <p className="text-muted-foreground text-lg">
            Quản lý đội ngũ và thành viên tại trạm. Việc điều phối đội cứu hộ theo yêu cầu được thực
            hiện tại trang phân công cứu hộ.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() => {
              navigate('/portal/coordinator/team-allocation');
            }}
            variant="outline"
            className="gap-2 text-base px-6 h-12"
          >
            <span className="material-symbols-outlined">add</span>
            Điều phối / phân công
          </Button>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
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
                  <span className="material-symbols-outlined">group_add</span>
                </Button>
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

      <Card className="mb-6 border-primary/20 bg-primary/5 shadow-sm">
        <CardContent className="flex flex-col gap-3 p-5 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <p className="text-sm font-semibold text-foreground">
              Gán team cứu trợ vào chiến dịch cứu trợ
            </p>
            <p className="text-sm text-muted-foreground">
              Team cứu trợ có thể được gán vào chiến dịch cứu trợ của trạm ngay tại đây. Team cứu hộ
              vẫn được quản lý chung nhưng không gán vào chiến dịch cứu trợ từ luồng này.
            </p>
          </div>
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => setIsReliefCampaignAssignOpen(true)}
            disabled={!selectedTeam || !selectedTeamIsRelief}
          >
            <span className="material-symbols-outlined">campaign</span>
            Gán vào chiến dịch cứu trợ
          </Button>
        </CardContent>
      </Card>

      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="border-border bg-card">
          <CardContent className="p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Tổng số nhóm
                </p>
                <p className="mt-3 text-3xl font-black text-foreground">{stats.total}</p>
              </div>
              <div className="flex size-11 items-center justify-center rounded-2xl border border-sky-200 bg-sky-500/10 text-sky-600">
                <span className="material-symbols-outlined">groups</span>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border bg-card">
          <CardContent className="p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Đang hoạt động
                </p>
                <p className="mt-3 text-3xl font-black text-emerald-600">{stats.active}</p>
              </div>
              <div className="flex size-11 items-center justify-center rounded-2xl border border-emerald-200 bg-emerald-500/10 text-emerald-600">
                <span className="material-symbols-outlined">bolt</span>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border bg-card">
          <CardContent className="p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Tình nguyện viên
                </p>
                <p className="mt-3 text-3xl font-black text-rose-600">{stats.members}</p>
              </div>
              <div className="flex size-11 items-center justify-center rounded-2xl border border-rose-200 bg-rose-500/10 text-rose-600">
                <span className="material-symbols-outlined">volunteer_activism</span>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border bg-card">
          <CardContent className="p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Khu vực
                </p>
                <p className="mt-3 text-3xl font-black text-violet-600">{stats.areas}</p>
              </div>
              <div className="flex size-11 items-center justify-center rounded-2xl border border-violet-200 bg-violet-500/10 text-violet-600">
                <span className="material-symbols-outlined">location_on</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(340px,0.9fr)]">
        <div className="flex min-h-[560px] flex-col gap-4">
          <Card className="overflow-hidden rounded-2xl border-border bg-card">
            <CardContent className="flex h-full flex-col p-0">
              <div className="border-b border-border/70 px-5 pb-4 pt-5">
                <div className="space-y-4">
                  <div className="space-y-1">
                    <h2 className="text-xl font-black text-foreground">Danh sách nhóm</h2>
                    <p className="text-xs text-muted-foreground">
                      Hiển thị 6 dòng mỗi trang, có tìm kiếm và lọc trạng thái.
                    </p>
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_180px]">
                    <div className="relative">
                      <span className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-base text-muted-foreground">
                        search
                      </span>
                      <Input
                        className="h-11 border-border bg-background pl-10"
                        placeholder="Tìm tên nhóm, khu vực, trưởng nhóm..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </div>
                    <Select
                      value={teamStatusFilter}
                      onValueChange={(value: TeamStatusFilter) => setTeamStatusFilter(value)}
                    >
                      <SelectTrigger className="h-11 border-border bg-background">
                        <SelectValue placeholder="Lọc trạng thái" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tất cả trạng thái</SelectItem>
                        <SelectItem value="active">Đang hoạt động</SelectItem>
                        <SelectItem value="idle">Sẵn sàng</SelectItem>
                        <SelectItem value="other">Khác</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant={teamStatusFilter === 'all' ? 'primary' : 'outline'}
                      className="rounded-full"
                      onClick={() => setTeamStatusFilter('all')}
                    >
                      <span className="material-symbols-outlined text-sm">apps</span>
                      Tất cả
                    </Button>
                    <Button
                      size="sm"
                      variant={teamStatusFilter === 'active' ? 'primary' : 'outline'}
                      className={cn(
                        'rounded-full',
                        teamStatusFilter === 'active' &&
                          'border-emerald-300 bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/20',
                      )}
                      onClick={() => setTeamStatusFilter('active')}
                    >
                      <span className="material-symbols-outlined text-sm">bolt</span>
                      Đang hoạt động
                    </Button>
                    <Button
                      size="sm"
                      variant={teamStatusFilter === 'idle' ? 'primary' : 'outline'}
                      className="rounded-full"
                      onClick={() => setTeamStatusFilter('idle')}
                    >
                      <span className="material-symbols-outlined text-sm">
                        radio_button_checked
                      </span>
                      Sẵn sàng
                    </Button>
                    <Button
                      size="sm"
                      variant={teamStatusFilter === 'other' ? 'primary' : 'outline'}
                      className="rounded-full"
                      onClick={() => setTeamStatusFilter('other')}
                    >
                      <span className="material-symbols-outlined text-sm">tune</span>
                      Khác
                    </Button>
                  </div>
                </div>
              </div>

              {!isLoading && !reliefStationId && (
                <div className="mx-5 mt-5 flex items-start gap-2 rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-700 dark:bg-amber-950/30 dark:text-amber-300">
                  <span className="material-symbols-outlined text-amber-500 shrink-0 mt-0.5">
                    warning
                  </span>
                  <div>
                    <p className="font-semibold">Bạn chưa được phân vào trạm cứu trợ nào.</p>
                    <p className="text-amber-700 dark:text-amber-400 mt-0.5">
                      Chức năng tạo đội ngũ bị vô hiệu. Đang hiển thị tất cả đội ngũ trong hệ thống
                      (chỉ đọc).
                    </p>
                  </div>
                </div>
              )}

              <div className="flex-1 overflow-auto px-4 py-4 custom-scrollbar">
                {isLoading ? (
                  <div className="space-y-3 p-4">
                    {[1, 2, 3, 4, 5, 6].map((k) => (
                      <Skeleton key={k} className="h-12 w-full rounded-2xl" />
                    ))}
                  </div>
                ) : filteredTeams.length === 0 ? (
                  <div className="flex h-full min-h-[320px] flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border bg-muted/10 p-6 text-center">
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
                  <div className="overflow-x-auto rounded-2xl border border-border">
                    <table className="min-w-[760px] w-full border-collapse text-left">
                      <thead className="sticky top-0 z-10 bg-muted/40 backdrop-blur">
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
                        {paginatedTeams.map((team) => (
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
                              <button
                                className="text-muted-foreground hover:text-primary transition-colors"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedTeamId(team.id);
                                  handleOpenEdit(team);
                                }}
                              >
                                <span className="material-symbols-outlined">edit</span>
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div className="border-t border-border/70 px-5 py-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <p className="text-xs text-muted-foreground">
                    Trang {listPage}/{totalListPages} - Hiển thị {paginatedTeams.length} /{' '}
                    {filteredTeams.length} nhóm.
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1"
                      disabled={listPage <= 1}
                      onClick={() => setListPage((prev) => Math.max(1, prev - 1))}
                    >
                      <span className="material-symbols-outlined text-sm">chevron_left</span>
                      Trước
                    </Button>
                    {listPageItems.map((item, index) =>
                      item === 'ellipsis' ? (
                        <span
                          key={`ellipsis-${index}`}
                          className="px-1 text-sm text-muted-foreground"
                        >
                          ...
                        </span>
                      ) : (
                        <Button
                          key={item}
                          size="sm"
                          variant={item === listPage ? 'primary' : 'outline'}
                          className="min-w-9"
                          onClick={() => setListPage(item)}
                        >
                          {item}
                        </Button>
                      ),
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1"
                      disabled={listPage >= totalListPages}
                      onClick={() => setListPage((prev) => Math.min(totalListPages, prev + 1))}
                    >
                      Sau
                      <span className="material-symbols-outlined text-sm">chevron_right</span>
                    </Button>
                    <div className="flex items-center gap-2 rounded-full border border-border px-2 py-1">
                      <span className="text-xs text-muted-foreground">Tới trang</span>
                      <Input
                        value={pageInput}
                        onChange={(e) => setPageInput(e.target.value.replace(/[^0-9]/g, ''))}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleJumpToPage();
                        }}
                        className="h-8 w-14 border-0 px-2 text-center shadow-none focus-visible:ring-0"
                      />
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 px-2"
                        onClick={handleJumpToPage}
                      >
                        Đi
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex min-h-[560px] flex-col gap-4">
          {selectedTeam ? (
            <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
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
                      className="p-2 text-muted-foreground hover:text-slate-900 dark:hover:text-foreground hover:bg-slate-100 dark:hover:bg-white/10 rounded-lg transition-colors"
                      onClick={() => selectedTeam && handleOpenEdit(selectedTeam)}
                      title="Chỉnh sửa đội ngũ"
                    >
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
                <div className="mb-3 flex flex-wrap gap-2">
                  <span
                    className={cn(
                      'inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold',
                      Number(selectedTeam.teamType ?? 1) === 2
                        ? 'border-rose-200 bg-rose-500/10 text-rose-700'
                        : 'border-emerald-200 bg-emerald-500/10 text-emerald-700',
                    )}
                  >
                    {selectedTeam.teamTypeName ||
                      (Number(selectedTeam.teamType ?? 1) === 2 ? 'Cứu hộ' : 'Cứu trợ')}
                  </span>
                </div>
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
                <div className="mt-4 rounded-2xl border border-blue-200 bg-blue-50/70 p-4 dark:border-blue-900/50 dark:bg-blue-950/20">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-foreground">
                        Chiến dịch cứu trợ đã được gán
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Chỉ team loại Cứu trợ mới được gán vào chiến dịch loại Cứu trợ của trạm.
                      </p>
                    </div>
                    <Button
                      size="sm"
                      className="gap-2 sm:shrink-0"
                      onClick={() => setIsReliefCampaignAssignOpen(true)}
                      disabled={!selectedTeam || !selectedTeamIsRelief}
                    >
                      <span className="material-symbols-outlined text-sm">campaign</span>
                      Gán vào chiến dịch cứu trợ
                    </Button>
                  </div>
                  <div className="mt-3 space-y-2">
                    {!selectedTeamIsRelief ? (
                      <div className="rounded-xl border border-dashed border-border bg-background/70 p-3 text-xs text-muted-foreground">
                        Team cứu hộ không hiển thị danh sách chiến dịch cứu trợ và không được gán
                        vào campaign loại này.
                      </div>
                    ) : assignedReliefCampaigns.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-border bg-background/70 p-3 text-xs text-muted-foreground">
                        Team này chưa được gán vào chiến dịch cứu trợ nào.
                      </div>
                    ) : (
                      assignedReliefCampaigns.map((campaign) => (
                        <div
                          key={campaign.campaignTeamId}
                          className="rounded-xl border border-border bg-background/80 p-3"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-sm font-semibold text-foreground">
                                {campaign.campaignName}
                              </p>
                              <p className="mt-1 text-xs text-muted-foreground">
                                {campaign.memberCount} thành viên · Mã gán:{' '}
                                {campaign.campaignTeamId.slice(0, 8)}
                              </p>
                            </div>
                            <span className="inline-flex max-w-full shrink-0 items-center truncate whitespace-nowrap rounded-full border border-blue-200 bg-blue-500/10 px-2.5 py-1 text-[11px] font-medium text-blue-700 dark:border-blue-900/40 dark:text-blue-300">
                              {CAMPAIGN_TEAM_STATUS_LABEL[campaign.status] ||
                                `Trạng thái ${campaign.status}`}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
                {/* Mini Map Preview Placeholder */}
                <div className="relative mt-4 flex h-32 w-full items-center justify-center rounded-2xl border border-slate-200 bg-slate-100 dark:border-border dark:bg-background group cursor-pointer">
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
                              member.volunteerName ??
                                member.displayName ??
                                member.fullName ??
                                member.name,
                              member.email || 'Không rõ tên',
                            )}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {member.isLeader
                              ? '⭐ Trưởng nhóm'
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
              <div className="border-t border-slate-200 bg-slate-50 p-4 dark:border-border dark:bg-background">
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
            <div className="flex h-full items-center justify-center rounded-2xl border border-border bg-card text-muted-foreground">
              Chọn một nhóm để xem chi tiết
            </div>
          )}
        </div>
      </div>

      <Dialog
        open={isCreateOpen}
        onOpenChange={(open) => {
          if (isCreating) return;
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

            <div className="space-y-2">
              <label className="text-sm font-medium">Loại team</label>
              <Select value={teamType} onValueChange={setTeamType}>
                <SelectTrigger>
                  <SelectValue placeholder="Chọn loại team" />
                </SelectTrigger>
                <SelectContent>
                  {TEAM_TYPE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={String(option.value)}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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

      <Dialog
        open={isManageMembersOpen}
        onOpenChange={(open) => {
          if (addMembersBulkStatus === 'pending') return;
          setIsManageMembersOpen(open);
          if (!open) {
            setManageMembersError('');
          }
        }}
      >
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

            {manageMembersError ? (
              <div className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
                {manageMembersError}
              </div>
            ) : null}

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
                          member.volunteerName ??
                            member.displayName ??
                            member.fullName ??
                            member.name,
                          member.email || 'Không rõ tên',
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {member.isLeader
                          ? '⭐ Trưởng nhóm'
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
                          Đặt làm trưởng nhóm
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
            <Button
              variant="outline"
              onClick={() => setIsManageMembersOpen(false)}
              disabled={addMembersBulkStatus === 'pending'}
            >
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

      {/* ── Edit Team Dialog ── */}
      <Dialog
        open={isEditOpen}
        onOpenChange={(open) => {
          if (isEditing) return;
          setIsEditOpen(open);
          if (!open) setEditError('');
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Chỉnh sửa đội ngũ</DialogTitle>
            <DialogDescription>Cập nhật tên, mô tả và trạng thái của đội ngũ.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Tên đội ngũ *</label>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="VD: Đội hỗ trợ Quảng Bình"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Mô tả</label>
              <Textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                placeholder="Mô tả vai trò hoặc khu vực phụ trách"
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Số điện thoại liên hệ</label>
              <Input
                value={editContactPhone}
                onChange={(e) => setEditContactPhone(e.target.value)}
                placeholder="VD: 0901234567"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Loại team</label>
              <Select value={editTeamType} onValueChange={setEditTeamType}>
                <SelectTrigger>
                  <SelectValue placeholder="Chọn loại team" />
                </SelectTrigger>
                <SelectContent>
                  {TEAM_TYPE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={String(option.value)}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Trạng thái</label>
              <Select value={String(editStatus)} onValueChange={(v) => setEditStatus(Number(v))}>
                <SelectTrigger>
                  <SelectValue placeholder="Chọn trạng thái" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">Nháp</SelectItem>
                  <SelectItem value="1">Đang hoạt động</SelectItem>
                  <SelectItem value="2">Không hoạt động</SelectItem>
                  <SelectItem value="3">Đình chỉ</SelectItem>
                  <SelectItem value="4">Lưu trữ</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {editError ? <p className="text-sm text-red-500">{editError}</p> : null}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)} disabled={isEditing}>
              Hủy
            </Button>
            <Button onClick={handleEditTeam} disabled={isEditing}>
              {isEditing ? 'Đang lưu...' : 'Lưu thay đổi'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isReliefCampaignAssignOpen}
        onOpenChange={(open) => {
          if (assignTeamToCampaignStatus === 'pending') return;
          setIsReliefCampaignAssignOpen(open);
          if (!open) {
            setSelectedReliefCampaignId('');
            setReliefCampaignAssignError('');
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Gán team vào chiến dịch cứu trợ</DialogTitle>
            <DialogDescription>
              Chỉ team loại Cứu trợ mới được phép gán vào chiến dịch loại Cứu trợ của trạm.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-xl border border-border bg-muted/20 p-4 text-sm">
              <p className="font-semibold text-foreground">Team đang chọn</p>
              <p className="mt-1 text-muted-foreground">
                {selectedTeam?.name || 'Chưa chọn team'} ·{' '}
                {selectedTeam?.teamTypeName || (selectedTeamIsRelief ? 'Cứu trợ' : 'Cứu hộ')}
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Chọn chiến dịch cứu trợ</label>
              <Select value={selectedReliefCampaignId} onValueChange={setSelectedReliefCampaignId}>
                <SelectTrigger>
                  <SelectValue placeholder="Chọn chiến dịch cứu trợ của trạm" />
                </SelectTrigger>
                <SelectContent>
                  {reliefCampaigns.map((campaign) => (
                    <SelectItem key={campaign.campaignId} value={campaign.campaignId}>
                      {campaign.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {reliefCampaignAssignError ? (
              <p className="text-sm text-destructive">{reliefCampaignAssignError}</p>
            ) : null}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsReliefCampaignAssignOpen(false)}
              disabled={assignTeamToCampaignStatus === 'pending'}
            >
              Hủy
            </Button>
            <Button
              onClick={handleAssignReliefTeamToCampaign}
              disabled={
                assignTeamToCampaignStatus === 'pending' || !selectedTeam || !selectedTeamIsRelief
              }
            >
              {assignTeamToCampaignStatus === 'pending' ? 'Đang gán...' : 'Gán vào chiến dịch'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
