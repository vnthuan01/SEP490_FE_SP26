// ... keep imports
import { useState, useMemo, useRef, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { volunteerRequestsData } from './components/mockData';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
// import type { VolunteerRequest } from './components/types';

export default function CoordinatorVolunteerRequestPage() {
  const [selectedId, setSelectedId] = useState<string>(volunteerRequestsData[0]?.id);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'all' | 'health' | 'rescue' | 'transport'>('all');
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const scrollRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [selectedId]);

  const selectedRequest = useMemo(
    () => volunteerRequestsData.find((r) => r.id === selectedId) || volunteerRequestsData[0],
    [selectedId],
  );

  const filteredRequests = useMemo(() => {
    return volunteerRequestsData.filter((req) => {
      const matchesSearch =
        req.name.toLowerCase().includes(searchTerm.toLowerCase()) || req.phone.includes(searchTerm);

      // Simple mock filter logic based on skills/role
      let matchesFilter = true;
      if (filter === 'health')
        matchesFilter = req.skills.some(
          (s) =>
            s.toLowerCase().includes('y tế') ||
            s.toLowerCase().includes('sơ cứu') ||
            s.toLowerCase().includes('thuốc'),
        );
      if (filter === 'rescue')
        matchesFilter = req.skills.some(
          (s) => s.toLowerCase().includes('cứu hộ') || s.toLowerCase().includes('bơi'),
        );
      if (filter === 'transport')
        matchesFilter = req.skills.some(
          (s) => s.toLowerCase().includes('lái xe') || s.toLowerCase().includes('vận chuyển'),
        );

      return matchesSearch && matchesFilter;
    });
  }, [searchTerm, filter]);

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
      <div className="flex h-[calc(100vh-6rem)] overflow-hidden -m-4">
        {/* LEFT SIDEBAR: LIST */}
        <aside className="w-[420px] flex flex-col border-r border-surface-dark-highlight bg-card overflow-hidden shrink-0">
          {/* Header & Search */}
          <div className="p-4 border-b border-surface-dark-highlight flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <h1 className="text-2xl font-bold leading-tight text-primary">Duyệt đơn đăng ký</h1>
              <p className="text-muted-foreground text-sm">
                {filteredRequests.length} đơn mới đang chờ xử lý
              </p>
            </div>
            {/* Search */}
            <div className="flex w-full items-center rounded-lg border border-border bg-background-dark px-3 py-2">
              <span className="material-symbols-outlined text-muted-foreground mr-2">search</span>
              <input
                className="w-full bg-transparent text-foreground placeholder:text-muted-foreground outline-none text-sm"
                placeholder="Tìm tên hoặc số điện thoại..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            {/* Filters */}
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
              <Button
                size="sm"
                variant={filter === 'all' ? 'primary' : 'outline'}
                onClick={() => setFilter('all')}
                className="rounded-full h-8 text-xs"
              >
                Tất cả
              </Button>
              <Button
                size="sm"
                variant={filter === 'health' ? 'primary' : 'outline'}
                onClick={() => setFilter('health')}
                className="rounded-full h-8 text-xs"
              >
                Y tế
              </Button>
              <Button
                size="sm"
                variant={filter === 'rescue' ? 'primary' : 'outline'}
                onClick={() => setFilter('rescue')}
                className="rounded-full h-8 text-xs"
              >
                Cứu hộ
              </Button>
              <Button
                size="sm"
                variant={filter === 'transport' ? 'primary' : 'outline'}
                onClick={() => setFilter('transport')}
                className="rounded-full h-8 text-xs"
              >
                Vận chuyển
              </Button>
            </div>
          </div>

          {/* List Content */}
          <div className="flex-1 overflow-y-auto p-2 space-y-2">
            {filteredRequests.map((req) => (
              <div
                key={req.id}
                onClick={() => {
                  setSelectedId(req.id);
                  setCurrentMediaIndex(0);
                }}
                className={cn(
                  'group flex cursor-pointer items-start gap-3 rounded-lg p-3 transition-all border',
                  selectedId === req.id
                    ? 'bg-surface-dark-highlight border-primary/50'
                    : 'hover:bg-surface-dark-highlight border-transparent hover:border-border',
                )}
              >
                <div
                  className="bg-center bg-no-repeat bg-cover rounded-full h-12 w-12 shrink-0 border border-border"
                  style={{ backgroundImage: `url("${req.avatar}")` }}
                />
                <div className="flex flex-col flex-1 min-w-0">
                  <div className="flex justify-between items-start mb-1">
                    <h3
                      className={cn(
                        'text-base font-bold truncate',
                        selectedId === req.id
                          ? 'text-foreground'
                          : 'text-muted-foreground group-hover:text-foreground',
                      )}
                    >
                      {req.name}
                    </h3>
                    {req.status === 'new' && (
                      <span className="text-primary text-xs font-medium bg-primary/10 px-2 py-0.5 rounded">
                        Mới
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="material-symbols-outlined text-yellow-500 text-[16px]">
                      {req.skills[0]?.includes('Y tế')
                        ? 'medical_services'
                        : req.skills[0]?.includes('Vận chuyển')
                          ? 'local_shipping'
                          : 'engineering'}
                    </span>
                    <span
                      className={cn(
                        'text-sm truncate',
                        selectedId === req.id
                          ? 'text-foreground'
                          : 'text-muted-foreground group-hover:text-foreground',
                      )}
                    >
                      {req.skills.join(', ')}
                    </span>
                  </div>
                  <div className="flex justify-between items-end">
                    <span className="text-muted-foreground text-xs">
                      {req.location} • 15 phút trước
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </aside>

        {/* RIGHT CONTENT: DETAIL VIEW */}
        <section
          ref={scrollRef}
          className="flex-1 flex flex-col h-full bg-card relative overflow-y-auto custom-scrollbar"
        >
          {selectedRequest ? (
            <>
              {/* Header */}
              <div className="p-8 pb-6 border-b border-surface-dark-highlight">
                <div className="flex items-start justify-between gap-6">
                  <div className="flex gap-6">
                    <div
                      className="bg-center bg-no-repeat bg-cover rounded-xl h-24 w-24 shrink-0 border-2 border-border shadow-lg"
                      style={{ backgroundImage: `url("${selectedRequest.avatar}")` }}
                    />
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-3">
                        <h1 className="text-3xl font-black tracking-tight text-foreground">
                          {selectedRequest.name}
                        </h1>
                        <span className="bg-yellow-500/20 text-yellow-500 px-3 py-1 rounded-full text-sm font-bold border border-yellow-500/30 flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse"></span>
                          Chờ duyệt
                        </span>
                      </div>
                      <div className="flex items-center gap-6 text-muted-foreground text-base mt-1">
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-[20px]">cake</span>
                          <span>
                            {selectedRequest.age} tuổi ({selectedRequest.gender})
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-[20px]">location_on</span>
                          <span>{selectedRequest.address}</span>
                        </div>
                      </div>
                      <div className="flex gap-3 mt-2">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded border border-border bg-surface-dark-highlight text-xs font-medium text-foreground">
                          <span className="material-symbols-outlined text-[14px] text-green-500">
                            verified
                          </span>
                          SĐT đã xác thực
                        </span>
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded border border-border bg-surface-dark-highlight text-xs font-medium text-foreground">
                          <span className="material-symbols-outlined text-[14px] text-green-500">
                            verified
                          </span>
                          CCCD đã xác thực
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2 text-muted-foreground">
                    <span className="text-sm">
                      Gửi đơn lúc: {new Date(selectedRequest.submittedAt).toLocaleDateString()}
                    </span>
                    <span className="text-sm">ID Đơn: #{selectedRequest.id}</span>
                  </div>
                </div>
              </div>

              {/* Detail Grid */}
              <div className="p-8 grid grid-cols-12 gap-8 max-w-[1200px]">
                {/* Left Col */}
                <div className="col-span-8 space-y-8">
                  {/* Contact Info */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-xl bg-background-dark border border-border flex items-center gap-4">
                      <div className="size-10 rounded-full bg-surface-dark-highlight flex items-center justify-center text-primary">
                        <span className="material-symbols-outlined">call</span>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs uppercase font-semibold tracking-wider">
                          Số điện thoại
                        </p>
                        <p className="text-foreground text-lg font-medium font-mono">
                          {selectedRequest.phone}
                        </p>
                      </div>
                    </div>
                    <div className="p-4 rounded-xl bg-background-dark border border-border flex items-center gap-4">
                      <div className="size-10 rounded-full bg-surface-dark-highlight flex items-center justify-center text-primary shrink-0">
                        <span className="material-symbols-outlined">mail</span>
                      </div>

                      {/* QUAN TRỌNG */}
                      <div className="min-w-0 flex-1">
                        <p className="text-muted-foreground text-xs uppercase font-semibold tracking-wider">
                          Email/Zalo
                        </p>

                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <p
                                className="
                                                              text-foreground text-lg font-medium dark:text-foreground
                                                              truncate cursor-help
                                                            "
                              >
                                {selectedRequest.email}
                              </p>
                            </TooltipTrigger>

                            <TooltipContent className="max-w-xs break-words">
                              {selectedRequest.email}
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </div>
                  </div>

                  {/* Experience */}
                  <div className="space-y-4">
                    <h3 className="text-xl font-bold flex items-center gap-2 text-foreground">
                      <span className="material-symbols-outlined text-primary">handyman</span>
                      Kỹ năng & Kinh nghiệm
                    </h3>
                    <div className="p-6 rounded-xl bg-background-dark border border-border space-y-6">
                      <div>
                        <p className="text-muted-foreground text-sm mb-3">Nhóm kỹ năng chính:</p>
                        <div className="flex flex-wrap gap-2">
                          {selectedRequest.skills.map((skill, idx) => (
                            <span
                              key={idx}
                              className="px-3 py-1.5 rounded-lg bg-surface-dark-highlight text-foreground border border-border text-sm font-medium"
                            >
                              {skill}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-sm mb-3">Mô tả kinh nghiệm:</p>
                        <p className="text-foreground leading-relaxed text-base">
                          {selectedRequest.experience}
                        </p>
                      </div>
                      {selectedRequest.images.length > 0 && (
                        <div>
                          <p className="text-muted-foreground text-sm mb-3">
                            Ảnh/Chứng chỉ đính kèm ({selectedRequest.images.length}):
                          </p>

                          {/* Main View */}
                          <div className="relative w-full aspect-video bg-black/20 rounded-xl overflow-hidden border border-border group">
                            <div
                              className="w-full h-full bg-contain bg-center bg-no-repeat cursor-zoom-in"
                              style={{
                                backgroundImage: `url("${selectedRequest.images[currentMediaIndex].url}")`,
                              }}
                              onClick={() => setIsFullscreen(true)}
                            />

                            {/* Fullscreen Modal */}
                            {isFullscreen && (
                              <div
                                onClick={() => setIsFullscreen(false)}
                                className="fixed inset-0 z-[9999] bg-black/90 flex items-center justify-center animate-in fade-in duration-200"
                              >
                                <div className="relative w-full h-full max-w-[90vw] max-h-[90vh] flex items-center justify-center">
                                  <img
                                    src={selectedRequest.images[currentMediaIndex].url}
                                    className="max-h-full max-w-full rounded-lg object-contain"
                                    onClick={(e) => e.stopPropagation()}
                                  />

                                  {/* Navigation Buttons in Fullscreen */}
                                  {selectedRequest.images.length > 1 && (
                                    <>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setCurrentMediaIndex((prev) =>
                                            prev === 0
                                              ? selectedRequest.images.length - 1
                                              : prev - 1,
                                          );
                                        }}
                                        className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 flex items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-all backdrop-blur-sm"
                                      >
                                        <span className="material-symbols-outlined text-3xl">
                                          chevron_left
                                        </span>
                                      </button>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setCurrentMediaIndex((prev) =>
                                            prev === selectedRequest.images.length - 1
                                              ? 0
                                              : prev + 1,
                                          );
                                        }}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 flex items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-all backdrop-blur-sm"
                                      >
                                        <span className="material-symbols-outlined text-3xl">
                                          chevron_right
                                        </span>
                                      </button>
                                    </>
                                  )}

                                  <div className="absolute top-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full bg-black/50 text-white text-sm font-medium backdrop-blur-sm">
                                    {currentMediaIndex + 1} / {selectedRequest.images.length}
                                  </div>
                                </div>

                                <button
                                  onClick={() => setIsFullscreen(false)}
                                  className="absolute top-6 right-6 text-white/50 hover:text-white transition-colors"
                                >
                                  <span className="material-symbols-outlined text-4xl">close</span>
                                </button>
                              </div>
                            )}

                            {/* Navigation Buttons (Main View) */}
                            {selectedRequest.images.length > 1 && (
                              <>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setCurrentMediaIndex((prev) =>
                                      prev === 0 ? selectedRequest.images.length - 1 : prev - 1,
                                    );
                                  }}
                                  className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-full bg-black/50 text-white hover:bg-primary transition-all opacity-0 group-hover:opacity-100 backdrop-blur-sm"
                                >
                                  <span className="material-symbols-outlined text-[20px]">
                                    chevron_left
                                  </span>
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setCurrentMediaIndex((prev) =>
                                      prev === selectedRequest.images.length - 1 ? 0 : prev + 1,
                                    );
                                  }}
                                  className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-full bg-black/50 text-white hover:bg-primary transition-all opacity-0 group-hover:opacity-100 backdrop-blur-sm"
                                >
                                  <span className="material-symbols-outlined text-[20px]">
                                    chevron_right
                                  </span>
                                </button>
                              </>
                            )}

                            {/* Counter Badge */}
                            <div className="absolute top-3 right-3 px-2 py-1 rounded-md bg-black/60 text-white text-xs font-medium backdrop-blur-sm">
                              {currentMediaIndex + 1} / {selectedRequest.images.length}
                            </div>
                          </div>

                          {/* Thumbnails */}
                          {selectedRequest.images.length > 1 && (
                            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-border-dark scrollbar-track-transparent mt-3">
                              {selectedRequest.images.map((img, i) => (
                                <div
                                  key={i}
                                  onClick={() => setCurrentMediaIndex(i)}
                                  className={cn(
                                    'relative w-20 h-14 shrink-0 rounded-lg overflow-hidden cursor-pointer border-2 transition-all',
                                    i === currentMediaIndex
                                      ? 'border-primary opacity-100 ring-2 ring-primary/20'
                                      : 'border-transparent opacity-60 hover:opacity-100 hover:border-border',
                                  )}
                                >
                                  <div
                                    className="w-full h-full bg-cover bg-center"
                                    style={{ backgroundImage: `url("${img.url}")` }}
                                  />
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right Col */}
                <div className="col-span-4 space-y-6">
                  {/* Readiness */}
                  <div className="p-5 rounded-xl bg-background-dark border border-border">
                    <h3 className="text-lg font-bold mb-4 text-foreground">Khả năng đáp ứng</h3>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-2 rounded hover:bg-surface-dark-highlight transition-colors">
                        <span className="text-muted-foreground">Sức khỏe tốt</span>
                        <span
                          className={cn(
                            'material-symbols-outlined',
                            selectedRequest.readiness.health ? 'text-green-500' : 'text-red-500',
                          )}
                        >
                          {selectedRequest.readiness.health ? 'check_circle' : 'cancel'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between p-2 rounded hover:bg-surface-dark-highlight transition-colors">
                        <span className="text-muted-foreground">Có phương tiện cá nhân</span>
                        <span
                          className={cn(
                            'material-symbols-outlined',
                            selectedRequest.readiness.vehicle
                              ? 'text-green-500'
                              : 'text-muted-foreground',
                          )}
                        >
                          {selectedRequest.readiness.vehicle ? 'check_circle' : 'remove_circle'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between p-2 rounded hover:bg-surface-dark-highlight transition-colors">
                        <span className="text-muted-foreground">Sẵn sàng đi tỉnh xa</span>
                        <span
                          className={cn(
                            'material-symbols-outlined',
                            selectedRequest.readiness.travel
                              ? 'text-green-500'
                              : 'text-muted-foreground',
                          )}
                        >
                          {selectedRequest.readiness.travel ? 'check_circle' : 'remove_circle'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between p-2 rounded hover:bg-surface-dark-highlight transition-colors">
                        <span className="text-muted-foreground">Cam kết tối thiểu 3 ngày</span>
                        <span
                          className={cn(
                            'material-symbols-outlined',
                            selectedRequest.readiness.commitment
                              ? 'text-green-500'
                              : 'text-muted-foreground',
                          )}
                        >
                          {selectedRequest.readiness.commitment ? 'check_circle' : 'remove_circle'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Admin Notes */}
                  <div className="p-5 rounded-xl bg-surface-dark-highlight/50 border border-border">
                    <h3 className="text-sm font-bold mb-3 uppercase tracking-wider text-muted-foreground">
                      Ghi chú nội bộ
                    </h3>
                    <textarea
                      className="w-full bg-background-dark border border-border rounded-lg p-3 text-foreground text-sm focus:ring-1 focus:ring-primary outline-none resize-none h-32"
                      placeholder="Nhập ghi chú cho điều phối viên khác..."
                    ></textarea>
                  </div>
                </div>
              </div>

              {/* Sticky Footer */}
              <div
                className="sticky bottom-0 left-0 right-0 p-6 bg-card/90
  backdrop-blur-md border-t border-border flex justify-between items-center z-20 shadow-2xl mt-auto"
              >
                <Button variant="outline" className="gap-2">
                  <span className="material-symbols-outlined">history</span>
                  Xem lịch sử
                </Button>
                <div className="flex gap-4">
                  <Button variant="outline" className="gap-2">
                    <span className="material-symbols-outlined">help</span>
                    Yêu cầu thêm thông tin
                  </Button>
                  <Button
                    variant="outline"
                    className="gap-2 text-red-500 border-red-500/30 hover:bg-red-500/10 dark:text-red-500 dark:border-red-500/30 dark:hover:bg-red-500/10"
                  >
                    <span className="material-symbols-outlined">close</span>
                    Từ chối
                  </Button>
                  <Button variant="primary" className="gap-2 text-lg px-8 dark:text-white">
                    <span className="material-symbols-outlined">check</span>
                    Chấp nhận & Điều phối
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              Chọn một đơn đăng ký để xem chi tiết
            </div>
          )}
        </section>
      </div>
    </DashboardLayout>
  );
}
