import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { teamsData, volunteerRequestsData } from './components/mockData';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { coordinatorNavItems, coordinatorProjects } from './components/sidebarConfig';
// import { Team, VolunteerRequest } from './components/types';

// Mock data extension for the allocation page
// In a real app, we would filter teams that need members and volunteers that are approved but not assigned.
const initialVolunteers = volunteerRequestsData
  .filter((v) => v.status === 'approved' || v.status === 'new')
  .map((v) => ({ ...v, assigned: false }));

export default function VolunteerAllocationPage() {
  const navigate = useNavigate();
  const [volunteers, setVolunteers] = useState(initialVolunteers);
  const [teams, setTeams] = useState(teamsData);
  const [selectedVolunteerId, setSelectedVolunteerId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'all' | 'health' | 'rescue' | 'logistics'>('all');

  // Stats
  const stats = {
    waiting: volunteers.filter((v) => !v.assigned).length,
    assignedToday: 15, // Mock
    activeTeams: teams.filter((t) => t.status !== 'available').length,
  };

  const filteredVolunteers = useMemo(() => {
    return volunteers.filter((v) => {
      const matchSearch =
        v.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.location.toLowerCase().includes(searchTerm.toLowerCase());
      const matchFilter =
        filter === 'all'
          ? true
          : filter === 'health'
            ? v.skills.some((s) => s.includes('Y tế') || s.includes('Sơ cứu') || s.includes('Y tá'))
            : filter === 'rescue'
              ? v.skills.some((s) => s.includes('Cứu hộ') || s.includes('Bơi'))
              : v.skills.some((s) => s.includes('Hậu cần') || s.includes('Vận chuyển'));

      return !v.assigned && matchSearch && matchFilter;
    });
  }, [volunteers, searchTerm, filter]);

  const handleAssign = (teamId: string) => {
    if (!selectedVolunteerId) return;

    // Update local state to simulate assignment
    setVolunteers((prev) =>
      prev.map((v) => (v.id === selectedVolunteerId ? { ...v, assigned: true } : v)),
    );

    // Update team member count (mock)
    setTeams((prev) => prev.map((t) => (t.id === teamId ? { ...t, members: t.members + 1 } : t)));

    setSelectedVolunteerId(null);
  };

  return (
    <DashboardLayout projects={coordinatorProjects} navItems={coordinatorNavItems}>
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between gap-6 mb-8 px-2">
        <div className="flex flex-col gap-2">
          <button
            onClick={() => navigate('/portal/coordinator/teams')}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-primary transition-colors w-fit mb-1"
          >
            <span className="material-symbols-outlined text-lg">arrow_back</span>
            Quay lại Đội tình nguyện
          </button>
          <h1 className="text-primary text-3xl md:text-4xl font-black leading-tight tracking-[-0.033em]">
            Phân công tình nguyện viên
          </h1>
          <p className="text-muted-foreground text-base font-normal max-w-2xl">
            Chọn tình nguyện viên từ danh sách chờ để gán vào các nhóm cứu trợ tại các khu vực chịu
            ảnh hưởng bão lũ.
          </p>
        </div>
        <div className="flex items-end">
          <Button className="bg-primary hover:bg-blue-600 text-white font-bold py-3 px-6 rounded-lg flex items-center gap-2 transition-colors shadow-lg shadow-primary/20">
            <span className="material-symbols-outlined">save</span>
            <span>Lưu thay đổi</span>
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="flex flex-col gap-3 rounded-xl p-6 bg-card dark:bg-card border border-border hover:border-primary/50 transition-colors group shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-muted-foreground dark:text-muted-foreground text-sm font-semibold uppercase tracking-wider">
              Tình nguyện viên chờ
            </p>
            <div className="size-8 rounded-full bg-blue-500/20 dark:bg-blue-500/30 flex items-center justify-center text-blue-400 group-hover:bg-blue-500 group-hover:text-white transition-all">
              <span className="material-symbols-outlined text-lg">person_search</span>
            </div>
          </div>
          <div className="flex items-end gap-3">
            <p className="text-foreground dark:text-foreground text-4xl font-black leading-none">
              {stats.waiting}
            </p>
            <span className="text-green-500 text-sm font-medium flex items-center bg-green-500/10 px-1.5 py-0.5 rounded">
              <span className="material-symbols-outlined text-[14px] mr-0.5">trending_up</span>+5
            </span>
          </div>
        </div>
        <div className="flex flex-col gap-3 rounded-xl p-6 bg-card dark:bg-card border border-border hover:border-primary/50 transition-colors group shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-muted-foreground dark:text-muted-foreground text-sm font-semibold uppercase tracking-wider">
              Đã phân công hôm nay
            </p>
            <div className="size-8 rounded-full bg-green-500/20 dark:bg-green-500/30 flex items-center justify-center text-green-400 group-hover:bg-green-500 group-hover:text-white transition-all">
              <span className="material-symbols-outlined text-lg">assignment_turned_in</span>
            </div>
          </div>
          <div className="flex items-end gap-3">
            <p className="text-foreground dark:text-foreground text-4xl font-black leading-none">
              {stats.assignedToday}
            </p>
            <span className="text-green-500 text-sm font-medium flex items-center bg-green-500/10 px-1.5 py-0.5 rounded">
              <span className="material-symbols-outlined text-[14px] mr-0.5">trending_up</span>+12%
            </span>
          </div>
        </div>
        <div className="flex flex-col gap-3 rounded-xl p-6 bg-card dark:bg-card border border-border hover:border-primary/50 transition-colors group shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-muted-foreground dark:text-muted-foreground text-sm font-semibold uppercase tracking-wider">
              Nhóm đang hoạt động
            </p>
            <div className="size-8 rounded-full bg-orange-500/20 dark:bg-orange-500/30 flex items-center justify-center text-orange-400 group-hover:bg-orange-500 group-hover:text-white transition-all">
              <span className="material-symbols-outlined text-lg">groups</span>
            </div>
          </div>
          <div className="flex items-end gap-3">
            <p className="text-foreground dark:text-foreground text-4xl font-black leading-none">
              {stats.activeTeams}
            </p>
            <span className="text-muted-foreground dark:text-muted-foreground text-sm font-medium bg-slate-100 dark:bg-white/10 px-1.5 py-0.5 rounded">
              0 thay đổi
            </span>
          </div>
        </div>
      </div>

      {/* Main Area */}
      <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-24rem)] min-h-[600px]">
        {/* LEFT COLUMN: VOLUNTEER LIST */}
        <div className="flex-1 flex flex-col bg-card dark:bg-card rounded-xl border border-border overflow-hidden shadow-sm">
          <div className="p-4 border-b border-slate-200 dark:border-border bg-slate-50 dark:bg-card">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <h3 className="text-foreground dark:text-foreground text-lg font-bold">
                  Danh sách chờ
                </h3>
                <span className="bg-slate-200 text-slate-900 dark:text-white dark:bg-[#0284c7] text-xs font-bold px-2 py-0.5 rounded-full">
                  {filteredVolunteers.length}
                </span>
              </div>
              <Button className="text-white text-sm font-medium hover:underline flex items-center gap-1">
                <span className="material-symbols-outlined text-[16px]">filter_list</span>
              </Button>
            </div>

            <div className="relative w-full mb-3">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted-foreground">
                <span className="material-symbols-outlined text-[20px]">search</span>
              </div>
              <input
                className="w-full bg-white dark:bg-card border border-slate-200 dark:border-border text-slate-900 dark:text-foreground text-sm rounded-lg focus:ring-primary focus:border-primary block pl-10 p-2.5 placeholder-muted-foreground"
                placeholder="Tìm theo tên, kỹ năng..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                onClick={() => setFilter('all')}
                className={cn(
                  'px-3 py-1 rounded-full text-xs font-medium transition-colors border',
                  filter === 'all' && 'bg-primary/20 text-primary border-primary/30',
                )}
              >
                Tất cả
              </Button>
              <Button
                onClick={() => setFilter('health')}
                className={cn(
                  'px-3 py-1 rounded-full text-xs font-medium transition-colors border',
                  filter === 'health' && 'bg-primary/20 text-primary border-primary/30',
                )}
              >
                Y tế
              </Button>
              <Button
                onClick={() => setFilter('rescue')}
                className={cn(
                  'px-3 py-1 rounded-full text-xs font-medium transition-colors border',
                  filter === 'rescue' && 'bg-primary/20 text-primary border-primary/30',
                )}
              >
                Cứu hộ
              </Button>
              <Button
                onClick={() => setFilter('logistics')}
                className={cn(
                  'px-3 py-1 rounded-full text-xs font-medium transition-colors border',
                  filter === 'logistics' && 'bg-primary/20 text-primary border-primary/30',
                )}
              >
                Hậu cần
              </Button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-2 custom-scrollbar">
            {filteredVolunteers.map((vol) => (
              <div
                key={vol.id}
                onClick={() =>
                  setSelectedVolunteerId(vol.id === selectedVolunteerId ? null : vol.id)
                }
                className={cn(
                  'group flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all',
                  selectedVolunteerId === vol.id
                    ? 'bg-primary/10 border-primary shadow-[0_0_0_1px_rgba(59,130,246,0.5)]'
                    : 'bg-white dark:bg-transparent border-transparent hover:bg-slate-50 dark:hover:bg-muted hover:border-slate-200 dark:hover:border-border',
                )}
              >
                <span
                  className={cn(
                    'material-symbols-outlined text-muted-foreground',
                    selectedVolunteerId === vol.id && 'text-primary',
                  )}
                >
                  {selectedVolunteerId === vol.id ? 'check_circle' : 'drag_indicator'}
                </span>
                <div className="relative">
                  <div
                    className="size-10 rounded-full bg-cover bg-center border border-slate-200 dark:border-slate-700"
                    style={{ backgroundImage: `url("${vol.avatar}")` }}
                  ></div>
                  <span
                    className={cn(
                      'absolute bottom-0 right-0 size-3 border-2 border-white dark:border-slate-800 rounded-full',
                      vol.readiness.health ? 'bg-green-500' : 'bg-yellow-500',
                    )}
                  ></span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-foreground dark:text-foreground text-sm font-bold truncate">
                    {vol.name}
                  </p>
                  <p className="text-muted-foreground text-xs truncate flex items-center gap-1">
                    <span className="material-symbols-outlined text-[12px]">location_on</span>{' '}
                    {vol.location}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 text-xs font-medium border border-blue-200 dark:border-blue-800/50">
                    {typeof vol.skills?.[0] === 'string'
                      ? vol.skills[0]
                      : (vol.skills?.[0] as any)?.displayName ||
                        (vol.skills?.[0] as any)?.name ||
                        (vol.skills?.[0] as any)?.email ||
                        'TNV'}
                  </span>
                </div>
              </div>
            ))}
            {filteredVolunteers.length === 0 && (
              <div className="p-8 text-center text-muted-foreground">
                <span className="material-symbols-outlined text-4xl mb-2 opacity-50">
                  search_off
                </span>
                <p>Không tìm thấy tình nguyện viên phù hợp</p>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: TEAM GRID */}
        <div className="flex-[2] flex flex-col gap-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-foreground dark:text-foreground text-xl font-bold">
              Các nhóm cứu trợ
            </h3>
            <div className="flex gap-2">
              <select className="border dark:bg-card text-foreground dark:text-foreground text-sm rounded-lg border-slate-200 dark:border-border focus:ring-0 px-3 py-2 cursor-pointer hover:bg-slate-50 dark:hover:bg-muted">
                <option>Tất cả khu vực</option>
                <option>Lào Cai</option>
                <option>Yên Bái</option>
                <option>Thái Nguyên</option>
              </select>
              <Button variant="outline" className="gap-2 h-auto text-sm font-bold py-2 px-4">
                <span className="material-symbols-outlined text-[18px]">add</span>
                Tạo nhóm mới
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 overflow-y-auto custom-scrollbar pr-2 pb-2">
            {teams.map((team) => (
              <div
                key={team.id}
                className={cn(
                  'bg-card dark:bg-card rounded-xl border p-5 relative overflow-hidden transition-all shadow-sm',
                  selectedVolunteerId
                    ? 'border-primary/50 border-dashed hover:border-primary hover:bg-primary/5 dark:hover:bg-background-dark cursor-pointer'
                    : 'border-border hover:border-primary/50',
                )}
                onClick={() => handleAssign(team.id)}
              >
                <div className="absolute top-0 right-0 p-3">
                  {team.status === 'rescuing' && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-red-100 dark:bg-red-500/10 px-2 py-1 text-xs font-medium text-red-600 dark:text-red-500 border border-red-200 dark:border-red-500/20">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                      </span>
                      Khẩn cấp
                    </span>
                  )}
                  {team.status === 'moving' && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 dark:bg-green-500/10 px-2 py-1 text-xs font-medium text-blue-600 dark:text-green-500 border border-blue-200 dark:border-green-500/20">
                      Đang di chuyển
                    </span>
                  )}
                  {team.status === 'available' && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-green-100 dark:bg-green-500/10 px-2 py-1 text-xs font-medium text-green-600 dark:text-green-500 border border-green-200 dark:border-green-500/20">
                      Sẵn sàng
                    </span>
                  )}
                </div>

                <div className="mb-4">
                  <h4 className="text-foreground dark:text-foreground text-lg font-bold">
                    {team.name}
                  </h4>
                  <p className="text-muted-foreground text-sm flex items-center gap-1 mt-1">
                    <span className="material-symbols-outlined text-[16px]">location_on</span>{' '}
                    {team.area || 'Chưa định vị'}
                  </p>
                </div>

                <div className="space-y-3 mb-6">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-muted-foreground">Nhân sự hiện tại</span>
                    <span className="text-slate-900 dark:text-foreground font-medium">
                      {team.members} / 20
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-background rounded-full h-2">
                    <div
                      className={cn(
                        'h-2 rounded-full',
                        team.status === 'rescuing' ? 'bg-red-500' : 'bg-primary',
                      )}
                      style={{ width: `${Math.min((team.members / 20) * 100, 100)}%` }}
                    ></div>
                  </div>
                  <div className="flex gap-2 mt-2">
                    {team.members < 20 ? (
                      <>
                        <span className="text-xs text-muted-foreground">Đang cần:</span>
                        <span className="text-xs font-bold text-slate-700 dark:text-white flex items-center gap-1">
                          {20 - team.members} Tình nguyện viên
                        </span>
                      </>
                    ) : (
                      <span className="text-xs text-green-600 dark:text-green-400 font-bold">
                        Đội đã đủ nhân sự
                      </span>
                    )}
                  </div>
                </div>

                {selectedVolunteerId && (
                  <div className="bg-primary/10 rounded-lg p-3 border border-primary/20 flex items-center justify-center text-primary text-sm font-bold gap-2">
                    <span className="material-symbols-outlined">add_circle</span>
                    Thêm vào nhóm này
                  </div>
                )}

                {!selectedVolunteerId && (
                  <Button className="w-full py-2 bg-slate-100 dark:bg-background hover:bg-slate-200 dark:hover:bg-border-dark text-slate-900 dark:text-foreground text-sm font-medium rounded-lg transition-colors border border-transparent dark:border-transparent">
                    Quản lý nhóm
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
