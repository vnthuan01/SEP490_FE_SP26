import { useEffect, useMemo, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useNavigate } from 'react-router-dom';
import { useTeams, useTeamsInStation } from '@/hooks/useTeams';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useMyReliefStation } from '@/hooks/useReliefStation';
import { coordinatorNavItems, coordinatorProjects } from './components/sidebarConfig';

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
  const {
    teams: inStationTeams,
    isLoading: isLoadingInStationTeams,
    refetch,
  } = useTeamsInStation(reliefStationId);
  const { createTeam } = useTeams();

  const [selectedTeamId, setSelectedTeamId] = useState<string>();
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [createError, setCreateError] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const navigate = useNavigate();

  const isLoading = isLoadingStation || isLoadingInStationTeams;

  const teams: TeamItem[] = useMemo(() => {
    if (!Array.isArray(inStationTeams)) return [];

    return inStationTeams.map((team: any) => ({
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
  }, [inStationTeams]);

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

  const getStatusBadge = (status: number | LegacyStatus) => {
    switch (Number(status)) {
      case 0:
        return 'bg-slate-500/20 text-slate-500';
      case 1:
        return 'bg-green-500/20 text-green-500';
      case 2:
        return 'bg-yellow-500/20 text-yellow-600';
      case 3:
        return 'bg-red-500/20 text-red-500';
      case 4:
        return 'bg-gray-500/20 text-gray-400';
      default:
        break;
    }

    switch (status) {
      case 'available':
        return 'bg-green-500/20 text-green-500';
      case 'moving':
        return 'bg-blue-500/20 text-blue-500';
      case 'rescuing':
        return 'bg-red-500/20 text-red-500';
      case 'lost-contact':
        return 'bg-gray-500/20 text-gray-400';
      default:
        return 'bg-gray-500/20 text-gray-400';
    }
  };

  const getStatusLabel = (status: number | LegacyStatus) => {
    switch (Number(status)) {
      case 0:
        return 'Nháp';
      case 1:
        return 'Đang hoạt động';
      case 2:
        return 'Tạm ngưng';
      case 3:
        return 'Đình chỉ';
      case 4:
        return 'Lưu trữ';
      default:
        break;
    }

    switch (status) {
      case 'available':
        return 'Sẵn sàng';
      case 'moving':
        return 'Đang di chuyển';
      case 'rescuing':
        return 'Đang cứu hộ';
      case 'lost-contact':
        return 'Mất liên lạc';
      default:
        return 'Không xác định';
    }
  };

  const resetCreateForm = () => {
    setName('');
    setDescription('');
    setContactPhone('');
    setCreateError('');
  };

  const handleCreateTeam = async () => {
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
      window.alert('Tạo đội ngũ mới thành công.');
    } catch (error: any) {
      setCreateError(error?.response?.data?.message || 'Không thể tạo đội ngũ. Vui lòng thử lại.');
    } finally {
      setIsCreating(false);
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
                <Button
                  variant="primary"
                  className="gap-2 text-base px-6 h-12"
                  onClick={() => setIsCreateOpen(true)}
                >
                  <span className="material-symbols-outlined">add</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-white dark:text-black">Tạo đội ngũ mới</p>
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
            <div className="rounded-lg border border-amber-300 bg-amber-50 text-amber-800 px-4 py-3 text-sm">
              Không tìm thấy ReliefStationId của moderator hiện tại, nên chưa thể tải danh sách đội
              trong trạm.
            </div>
          )}

          {/* Table */}
          <div className="flex-1 overflow-auto rounded-xl border border-border bg-card dark:bg-card custom-scrollbar">
            {isLoading ? (
              <div className="p-6 space-y-4">
                {[...Array(5)].map((_, idx) => (
                  <div
                    key={idx}
                    className="h-10 w-full rounded-lg bg-slate-100 dark:bg-slate-800 animate-pulse"
                  />
                ))}
              </div>
            ) : filteredTeams.length === 0 ? (
              <div className="h-full min-h-[320px] flex flex-col items-center justify-center gap-3 text-center p-6">
                <p className="text-lg font-semibold text-slate-900 dark:text-foreground">
                  Chưa có đội ngũ nào
                </p>
                <p className="text-sm text-muted-foreground max-w-md">
                  Hãy tạo đội ngũ đầu tiên để bắt đầu quản lý và phân công tình nguyện viên.
                </p>
                <Button className="gap-2" onClick={() => setIsCreateOpen(true)}>
                  <span className="material-symbols-outlined">add</span>
                  Tạo đội ngũ mới
                </Button>
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
                  <button className="text-primary text-sm font-bold hover:underline">
                    Quản lý
                  </button>
                </div>
                <div className="flex flex-col gap-2">
                  {selectedTeam.memberDetails && selectedTeam.memberDetails.length > 0 ? (
                    selectedTeam.memberDetails.map((member) => (
                      <div
                        key={member.id}
                        className="flex items-center p-3 rounded-lg bg-slate-50 dark:bg-background border border-transparent hover:border-slate-300 dark:hover:border-border transition-colors group/member"
                      >
                        {member.avatar ? (
                          <div
                            className="size-10 rounded-full bg-cover bg-center mr-3"
                            style={{ backgroundImage: `url('${member.avatar}')` }}
                          />
                        ) : (
                          <div className="size-10 rounded-full bg-slate-200 dark:bg-slate-700 mr-3" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-slate-900 dark:text-foreground truncate">
                            {member.name}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">{member.role}</p>
                        </div>
                        <button className="text-muted-foreground hover:text-red-500 opacity-0 group-hover/member:opacity-100 transition-opacity p-1">
                          <span className="material-symbols-outlined text-xl">
                            remove_circle_outline
                          </span>
                        </button>
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
    </DashboardLayout>
  );
}
