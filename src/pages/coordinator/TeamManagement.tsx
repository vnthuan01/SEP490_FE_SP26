import { useState, useMemo } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { teamsData } from './components/mockData';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { Team } from './components/types';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useNavigate } from 'react-router-dom';

export default function CoordinatorTeamManagementPage() {
  const [selectedTeamId, setSelectedTeamId] = useState<string>(teamsData[0]?.id);
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();
  const selectedTeam = useMemo(
    () => teamsData.find((t) => t.id === selectedTeamId) || teamsData[0],
    [selectedTeamId],
  );

  const filteredTeams = useMemo(() => {
    return teamsData.filter(
      (t) =>
        t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.leader.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (t.area || '').toLowerCase().includes(searchTerm.toLowerCase()),
    );
  }, [searchTerm]);

  const stats = {
    total: teamsData.length,
    active: teamsData.filter((t) => t.status !== 'available' && t.status !== 'lost-contact').length, // moving or rescuing
    members: teamsData.reduce((acc, t) => acc + t.members, 0),
    areas: new Set(teamsData.map((t) => t.area).filter(Boolean)).size,
  };

  const getStatusBadge = (status: Team['status']) => {
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

  const getStatusLabel = (status: Team['status']) => {
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
        return status;
    }
  };

  return (
    <DashboardLayout
      projects={[
        { label: 'Tổng quan', path: '/portal/coordinator/data-management', icon: 'dashboard' },
        { label: 'Điều phối & Bản đồ', path: '/portal/coordinator/maps', icon: 'map' },
        { label: 'Đội tình nguyện', path: '/portal/coordinator/teams', icon: 'groups' },
        {
          label: 'Yêu cầu tình nguyện',
          path: '/portal/coordinator/volunteer-requests',
          icon: 'how_to_reg',
        },
        {
          label: 'Yêu cầu cứu trợ',
          path: '/portal/coordinator/requests',
          icon: 'person_raised_hand',
        },
        {
          label: 'Kho vận & Nhu yếu phẩm',
          path: '/portal/coordinator/inventory',
          icon: 'inventory_2',
        },
      ]}
      navItems={[
        { label: 'Báo cáo & Thống kê', path: '/portal/coordinator/dashboard', icon: 'description' },
      ]}
    >
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
                <Button variant="primary" className="gap-2 text-base px-6 h-12">
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

          {/* Table */}
          <div className="flex-1 overflow-auto rounded-xl border border-border bg-card dark:bg-card custom-scrollbar">
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
                          {team.name}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                      {team.area || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900 dark:text-foreground">
                      {team.leader}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                      {team.members} người
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
                      {selectedTeam.leader}
                    </span>
                  </div>
                  <div className="flex items-center text-muted-foreground text-sm">
                    <span className="material-symbols-outlined text-lg mr-2">call</span>
                    Liên hệ: {selectedTeam.contactPhone}
                  </div>
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
                        <div
                          className="size-10 rounded-full bg-cover bg-center mr-3"
                          style={{ backgroundImage: `url('${member.avatar}')` }}
                        />
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
    </DashboardLayout>
  );
}
