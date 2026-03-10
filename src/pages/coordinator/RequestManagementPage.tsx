import { useMemo, useState, useRef, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
// import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

type RequestStatus = 'urgent' | 'high' | 'normal';
type ProcessStatus = 'submitted' | 'approved' | 'in_progress' | 'completed' | 'rejected';
type SupportType = 'food' | 'medicine' | 'evacuation' | 'rescue' | 'other';

interface RequestMedia {
  type: 'image' | 'video';
  url: string;
}

interface Request {
  id: string;
  name: string;
  phone: string;
  address: string;
  location: string;
  supportType: SupportType[];
  status: RequestStatus;
  processStatus: ProcessStatus;
  time: string;
  aiScore?: number;
  description: string;
  media?: RequestMedia[];
  submittedAt: string;
}

const statusConfig: Record<RequestStatus, { label: string; className: string }> = {
  urgent: {
    label: 'NGUY CẤP',
    className: 'bg-red-500/10 text-red-500 border border-red-500/20',
  },
  high: {
    label: 'CAO',
    className: 'bg-orange-500/10 text-orange-500 border border-orange-500/20',
  },
  normal: {
    label: 'BÌNH THƯỜNG',
    className: 'bg-primary/10 text-primary border border-primary/20',
  },
};

const getAiBadgeClass = (score: number) => {
  if (score >= 85) {
    return 'bg-red-500/15 text-red-600 border border-red-500/30';
  }
  if (score >= 70) {
    return 'bg-amber-500/20 text-amber-700 border border-amber-500/30';
  }
  if (score >= 50) {
    return 'bg-blue-500/15 text-blue-600 border border-blue-500/30';
  }
  return 'bg-surface-dark-highlight text-muted-foreground border border-border';
};

const getAiColor = (score: number) => {
  if (score >= 85) return { text: 'text-red-500', bar: 'bg-red-500' };
  if (score >= 70) return { text: 'text-orange-500', bar: 'bg-orange-500' };
  if (score >= 50) return { text: 'text-blue-500', bar: 'bg-blue-500' };
  return { text: 'text-muted-foreground', bar: 'bg-text-sub-dark' };
};

const processConfig: Record<ProcessStatus, { label: string; icon: string; className: string }> = {
  submitted: { label: 'Đã gửi', icon: 'upload', className: 'text-muted-foreground' },
  approved: { label: 'Đã chấp thuận', icon: 'check_circle', className: 'text-blue-500' },
  in_progress: {
    label: 'Đang xử lý',
    icon: 'sync',
    className: 'text-orange-500',
  },
  completed: { label: 'Hoàn thành', icon: 'verified', className: 'text-green-500' },
  rejected: { label: 'Bị hủy', icon: 'cancel', className: 'text-red-500' },
};

const supportTypeConfig: Record<SupportType, { label: string; icon: string }> = {
  food: { label: 'Lương thực', icon: 'restaurant' },
  medicine: { label: 'Thuốc men', icon: 'medical_services' },
  evacuation: { label: 'Sơ tán', icon: 'directions_run' },
  rescue: { label: 'Cứu hộ', icon: 'emergency' },
  other: { label: 'Khác', icon: 'more_horiz' },
};

const actionConfig: Record<
  ProcessStatus,
  { primary?: string; icon?: string; className?: string; secondary?: string }
> = {
  submitted: {
    primary: 'Chấp thuận',
    icon: 'check_circle',
    className: 'bg-emerald-600 hover:bg-emerald-700 text-white border-transparent',
    secondary: 'Từ chối',
  },
  approved: {
    primary: 'Bắt đầu xử lý',
    icon: 'play_circle',
    className: 'bg-blue-600 hover:bg-blue-700 text-white border-transparent',
  },
  in_progress: {
    primary: 'Hoàn thành',
    icon: 'verified',
    className: 'bg-green-600 hover:bg-green-700 text-white border-transparent',
  },
  completed: {
    primary: 'Đã hoàn thành',
    icon: 'verified',
    className:
      'bg-green-500/10 text-green-500 cursor-default hover:bg-green-500/10 border-green-500/20',
  },
  rejected: {
    primary: 'Đã hủy',
    icon: 'cancel',
    className: 'bg-red-500/10 text-red-500 cursor-default hover:bg-red-500/10 border-red-500/20',
  },
};

const mockRequests: Request[] = [
  {
    id: '8291',
    name: 'Nguyễn Văn An',
    phone: '0987 123 456',
    address: 'Thôn Đông, Xã Cẩm Duệ, Huyện Cẩm Xuyên',
    location: 'Hà Tĩnh',
    supportType: ['food', 'medicine', 'evacuation'],
    status: 'urgent',
    processStatus: 'in_progress',
    time: '15 phút trước',
    aiScore: 98,
    description:
      'Do ảnh hưởng của mưa lớn kéo dài nhiều ngày, khu vực sinh sống của gia đình đã bị ngập sâu gần tới mái nhà. Trong nhà hiện có một cụ ông 80 tuổi bị liệt không thể di chuyển và hai trẻ nhỏ. Nguồn điện đã bị cắt hoàn toàn, nước sinh hoạt không còn sử dụng được, lương thực dự trữ đã cạn kiệt. Đường vào khu vực bị ngập sâu và chia cắt, các phương tiện không thể tiếp cận. Gia đình cần được hỗ trợ khẩn cấp về sơ tán, lương thực và thuốc men.',
    media: [
      {
        type: 'image',
        url: 'https://tse2.mm.bing.net/th/id/OIP.bZvrW9XD1hLYdmNz7kS1PAHaE-?rs=1&pid=ImgDetMain&o=7&rm=3',
      },
      {
        type: 'image',
        url: 'https://tse2.mm.bing.net/th/id/OIP.bZvrW9XD1hLYdmNz7kS1PAHaE-?rs=1&pid=ImgDetMain&o=7&rm=3',
      },
      {
        type: 'image',
        url: 'https://tse2.mm.bing.net/th/id/OIP.bZvrW9XD1hLYdmNz7kS1PAHaE-?rs=1&pid=ImgDetMain&o=7&rm=3',
      },
      {
        type: 'image',
        url: 'https://tse2.mm.bing.net/th/id/OIP.bZvrW9XD1hLYdmNz7kS1PAHaE-?rs=1&pid=ImgDetMain&o=7&rm=3',
      },
      {
        type: 'video',
        url: 'https://www.w3schools.com/html/mov_bbb.mp4',
      },
    ],
    submittedAt: '2023-10-25T08:15:00', // 15 phút trước giả định
  },
  {
    id: '8292',
    name: 'Trần Thị Bích',
    phone: '0912 456 789',
    address: 'Phường Thạch Đài, TP Hà Tĩnh',
    location: 'Hà Tĩnh',
    supportType: ['medicine'],
    status: 'high',
    processStatus: 'approved',
    time: '42 phút trước',
    aiScore: 75,
    description:
      'Khu vực phường Thạch Đài đang bị ngập cục bộ sau mưa lớn, việc di chuyển gặp nhiều khó khăn. Gia đình có trẻ nhỏ đang bị sốt cao và ho kéo dài nhưng không thể ra ngoài mua thuốc do đường ngập và thiếu phương tiện. Hiện trong nhà chỉ còn một ít thuốc hạ sốt thông thường, không đủ dùng trong trường hợp bệnh nặng hơn. Gia đình đề nghị được hỗ trợ thuốc men thiết yếu cho trẻ em trong thời gian sớm nhất.',
    media: [
      {
        type: 'image',
        url: 'https://tse2.mm.bing.net/th/id/OIP.bZvrW9XD1hLYdmNz7kS1PAHaE-?rs=1&pid=ImgDetMain&o=7&rm=3',
      },
      {
        type: 'image',
        url: 'https://tse2.mm.bing.net/th/id/OIP.bZvrW9XD1hLYdmNz7kS1PAHaE-?rs=1&pid=ImgDetMain&o=7&rm=3',
      },
      {
        type: 'image',
        url: 'https://tse2.mm.bing.net/th/id/OIP.bZvrW9XD1hLYdmNz7kS1PAHaE-?rs=1&pid=ImgDetMain&o=7&rm=3',
      },
      {
        type: 'image',
        url: 'https://tse2.mm.bing.net/th/id/OIP.bZvrW9XD1hLYdmNz7kS1PAHaE-?rs=1&pid=ImgDetMain&o=7&rm=3',
      },
      {
        type: 'image',
        url: 'https://tse2.mm.bing.net/th/id/OIP.bZvrW9XD1hLYdmNz7kS1PAHaE-?rs=1&pid=ImgDetMain&o=7&rm=3',
      },
    ],
    submittedAt: '2023-10-25T07:48:00', // 42 phút trước giả định
  },
  {
    id: '8293',
    name: 'Lê Văn Cường',
    phone: '0905 333 111',
    address: 'Xã Kỳ Anh',
    location: 'Hà Tĩnh',
    supportType: ['other'],
    status: 'normal',
    processStatus: 'submitted',
    time: '1 giờ trước',
    description:
      'Sau đợt mưa lớn, mực nước tại khu vực xã Kỳ Anh đang rút chậm nhưng chưa gây thiệt hại nghiêm trọng đến nhà cửa hay con người. Người dân vẫn có thể sinh hoạt tạm thời, tuy nhiên cần được theo dõi tình hình vì nước rút không đều và có nguy cơ mưa tiếp diễn. Yêu cầu này chủ yếu mang tính thông báo để chính quyền và lực lượng chức năng nắm tình hình và sẵn sàng hỗ trợ nếu cần.',
    media: [
      {
        type: 'image',
        url: 'https://tse2.mm.bing.net/th/id/OIP.bZvrW9XD1hLYdmNz7kS1PAHaE-?rs=1&pid=ImgDetMain&o=7&rm=3',
      },
      {
        type: 'image',
        url: 'https://tse2.mm.bing.net/th/id/OIP.bZvrW9XD1hLYdmNz7kS1PAHaE-?rs=1&pid=ImgDetMain&o=7&rm=3',
      },
      {
        type: 'image',
        url: 'https://tse2.mm.bing.net/th/id/OIP.bZvrW9XD1hLYdmNz7kS1PAHaE-?rs=1&pid=ImgDetMain&o=7&rm=3',
      },
      {
        type: 'image',
        url: 'https://tse2.mm.bing.net/th/id/OIP.bZvrW9XD1hLYdmNz7kS1PAHaE-?rs=1&pid=ImgDetMain&o=7&rm=3',
      },
      {
        type: 'image',
        url: 'https://tse2.mm.bing.net/th/id/OIP.bZvrW9XD1hLYdmNz7kS1PAHaE-?rs=1&pid=ImgDetMain&o=7&rm=3',
      },
    ],
    submittedAt: '2023-10-25T07:30:00', // 1 giờ trước giả định
  },

  {
    id: '8294',
    name: 'Hoàng Thị Mai',
    phone: '0977 888 999',
    address: 'Quảng Bình',
    location: 'Quảng Bình',
    supportType: ['rescue'],
    status: 'high',
    processStatus: 'completed',
    time: '2 giờ trước',
    description: 'Sạt lở đất, đã được cứu hộ an toàn.',
    submittedAt: '2023-10-25T06:30:00', // 2 giờ trước giả định
  },
];

const statusCount = {
  all: mockRequests.length,
  urgent: mockRequests.filter((r) => r.status === 'urgent').length,
  high: mockRequests.filter((r) => r.status === 'high').length,
  normal: mockRequests.filter((r) => r.status === 'normal').length,
};

const badgeClass =
  'ml-1.5 flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-medium';

export default function CoordinatorRequestManagementPage() {
  const [selectedRequest, setSelectedRequest] = useState<Request>(mockRequests[0]);
  const [filterStatus, setFilterStatus] = useState<RequestStatus | 'all'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const scrollRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [selectedRequest.id]);

  const filteredRequests = useMemo(() => {
    let res = mockRequests;
    if (filterStatus !== 'all') {
      res = res.filter((r) => r.status === filterStatus);
    }
    if (searchTerm) {
      res = res.filter(
        (r) =>
          r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          r.phone.includes(searchTerm) ||
          r.address.toLowerCase().includes(searchTerm.toLowerCase()),
      );
    }
    return res;
  }, [filterStatus, searchTerm]);

  const actions = actionConfig[selectedRequest.processStatus];

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
        {/* ================= LEFT ================= */}
        <aside className="w-[420px] flex flex-col border-r border-surface-dark-highlight bg-card overflow-hidden shrink-0">
          {/* HEADER */}
          <div className="p-4 border-b border-surface-dark-highlight flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <h1 className="text-2xl font-bold leading-tight text-primary">Yêu cầu cứu trợ</h1>
              <p className="text-sm text-muted-foreground">
                Tổng {filteredRequests.length} yêu cầu cần xử lý
              </p>
            </div>

            {/* SEARCH */}
            <div className="flex w-full items-center rounded-lg border border-border bg-background-dark px-3 py-2">
              <span className="material-symbols-outlined text-muted-foreground mr-2">search</span>
              <input
                className="w-full bg-transparent text-foreground placeholder:text-muted-foreground outline-none text-sm"
                placeholder="Tìm tên, SĐT, địa chỉ..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {/* FILTER */}
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
              <Button
                size="sm"
                variant={filterStatus === 'all' ? 'primary' : 'outline'}
                onClick={() => setFilterStatus('all')}
                className="rounded-full h-8 text-xs dark:text-white"
              >
                Tất cả
                <span
                  className={`${badgeClass} ${
                    filterStatus === 'all' ? 'bg-white/20 text-white' : 'bg-muted text-foreground'
                  }`}
                >
                  {statusCount.all}
                </span>
              </Button>

              <Button
                size="sm"
                variant={filterStatus === 'urgent' ? 'destructive' : 'outline'}
                onClick={() => setFilterStatus('urgent')}
                className="rounded-full h-8 text-xs dark:text-white"
              >
                Nguy cấp
                <span
                  className={`${badgeClass} ${
                    filterStatus === 'urgent'
                      ? 'bg-white/20 text-white'
                      : 'bg-muted text-foreground'
                  }`}
                >
                  {statusCount.urgent}
                </span>
              </Button>

              <Button
                size="sm"
                variant={filterStatus === 'high' ? 'warning' : 'outline'}
                onClick={() => setFilterStatus('high')}
                className="rounded-full h-8 text-xs dark:text-white"
              >
                Cao
                <span
                  className={`${badgeClass} ${
                    filterStatus === 'high' ? 'bg-white/20 text-white' : 'bg-muted text-foreground'
                  }`}
                >
                  {statusCount.high}
                </span>
              </Button>

              <Button
                size="sm"
                variant={filterStatus === 'normal' ? 'primary' : 'outline'}
                onClick={() => setFilterStatus('normal')}
                className="rounded-full h-8 text-xs dark:text-white"
              >
                Bình thường
                <span
                  className={`${badgeClass} ${
                    filterStatus === 'normal'
                      ? 'bg-white/20 text-white'
                      : 'bg-muted text-foreground'
                  }`}
                >
                  {statusCount.normal}
                </span>
              </Button>
            </div>
          </div>

          {/* LIST */}
          <div className="flex-1 overflow-y-auto p-2 space-y-2">
            {filteredRequests.map((r) => (
              <div
                key={r.id}
                onClick={() => {
                  setSelectedRequest(r);
                  setCurrentMediaIndex(0);
                }}
                className={cn(
                  'group flex cursor-pointer flex-col gap-2 rounded-lg p-3 transition-all',
                  'border border-transparent bg-background-dark',
                  selectedRequest.id === r.id
                    ? 'bg-surface-dark-highlight border-primary/50 shadow-md'
                    : 'hover:bg-surface-dark-highlight hover:border-border hover:shadow-sm',
                )}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3
                      className={cn(
                        'text-base font-bold truncate',
                        selectedRequest.id === r.id
                          ? 'text-foreground'
                          : 'text-muted-foreground group-hover:text-foreground',
                      )}
                    >
                      {r.name}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">{r.location}</p>
                  </div>
                  <span
                    className={cn(
                      'px-2 py-0.5 text-[10px] uppercase font-bold tracking-wider rounded border',
                      statusConfig[r.status].className,
                    )}
                  >
                    {statusConfig[r.status].label}
                  </span>
                </div>

                <p className="text-sm text-muted-foreground line-clamp-2">{r.description}</p>

                <div className="flex justify-between items-center mt-1 border-t border-border/50 pt-2">
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">schedule</span>
                    {r.time}
                  </span>

                  {typeof r.aiScore === 'number' && (
                    <span
                      className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${getAiBadgeClass(
                        r.aiScore,
                      )}`}
                    >
                      <span className="material-symbols-outlined text-[14px]">auto_awesome</span>
                      AI Score: {r.aiScore}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </aside>

        {/* ================= RIGHT ================= */}
        <section
          ref={scrollRef}
          className="flex-1 flex flex-col h-full bg-card relative overflow-y-auto custom-scrollbar"
        >
          {selectedRequest ? (
            <>
              {/* Header */}
              <div className="p-8 pb-6 border-b border-surface-dark-highlight">
                <div className="flex items-start justify-between gap-6">
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-3">
                      <h1 className="text-3xl font-black tracking-tight text-foreground">
                        Yêu cầu #{selectedRequest.id}
                      </h1>
                      <span
                        className={cn(
                          'px-3 py-1 rounded-full text-sm font-bold border flex items-center gap-2 uppercase tracking-wider',
                          statusConfig[selectedRequest.status].className,
                        )}
                      >
                        <span className="w-2 h-2 rounded-full bg-current animate-pulse"></span>
                        {statusConfig[selectedRequest.status].label}
                      </span>
                    </div>
                    <div className="flex items-center gap-6 text-muted-foreground text-base mt-1">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-[20px]">person</span>
                        <span className="font-semibold text-foreground">
                          {selectedRequest.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-[20px]">call</span>
                        <span className="font-mono">{selectedRequest.phone}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-[20px]">location_on</span>
                        <span>{selectedRequest.address}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-start gap-2 text-muted-foreground">
                    <span className="text-sm">
                      Gửi lúc: {new Date(selectedRequest.submittedAt).toLocaleString('vi-VN')}
                    </span>
                    <span className="text-sm">ID: #{selectedRequest.id}</span>
                  </div>
                </div>
              </div>

              {/* Content Grid */}
              <div className="p-8 grid grid-cols-12 gap-8 max-w-[1200px]">
                {/* Left Column */}
                <div className="col-span-8 space-y-8">
                  {/* Description */}
                  <div className="space-y-4">
                    <h3 className="text-xl font-bold flex items-center gap-2 text-foreground">
                      <span className="material-symbols-outlined text-primary">description</span>
                      Nội dung yêu cầu
                    </h3>
                    <div className="p-6 rounded-xl bg-background-dark border border-border">
                      <p className="text-foreground leading-relaxed text-base">
                        {selectedRequest.description}
                      </p>

                      <div className="mt-6">
                        <p className="text-muted-foreground text-sm mb-3 uppercase font-semibold tracking-wider">
                          Cần hỗ trợ về:
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {selectedRequest.supportType.map((t) => (
                            <span
                              key={t}
                              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-dark-highlight text-foreground border border-border text-sm font-medium"
                            >
                              <span className="material-symbols-outlined text-[18px]">
                                {supportTypeConfig[t].icon}
                              </span>
                              {supportTypeConfig[t].label}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Media */}
                  {selectedRequest.media && selectedRequest.media.length > 0 && (
                    <div className="space-y-4">
                      <h3 className="text-xl font-bold flex items-center gap-2 text-foreground">
                        <span className="material-symbols-outlined text-primary">perm_media</span>
                        Hình ảnh/Video đính kèm ({selectedRequest.media.length})
                      </h3>

                      {/* Main Main View */}
                      <div className="relative w-full aspect-video bg-black/20 rounded-xl overflow-hidden border border-border group">
                        {selectedRequest.media[currentMediaIndex].type === 'image' ? (
                          <div
                            className="w-full h-full bg-contain bg-center bg-no-repeat cursor-zoom-in"
                            style={{
                              backgroundImage: `url("${selectedRequest.media[currentMediaIndex].url}")`,
                            }}
                            onClick={() => setIsFullscreen(true)}
                          />
                        ) : (
                          <video
                            src={selectedRequest.media[currentMediaIndex].url}
                            controls
                            className="w-full h-full"
                          />
                        )}

                        {isFullscreen && (
                          <div
                            onClick={() => setIsFullscreen(false)}
                            className="fixed inset-0 z-[9999] bg-black/90 flex items-center justify-center animate-in fade-in duration-200"
                          >
                            <div className="relative w-full h-full max-w-[90vw] max-h-[90vh] flex items-center justify-center">
                              {selectedRequest.media[currentMediaIndex].type === 'image' ? (
                                <img
                                  src={selectedRequest.media[currentMediaIndex].url}
                                  className="max-h-full max-w-full rounded-lg object-contain"
                                  onClick={(e) => e.stopPropagation()}
                                />
                              ) : (
                                <video
                                  src={selectedRequest.media[currentMediaIndex].url}
                                  controls
                                  className="max-h-full max-w-full rounded-lg"
                                  onClick={(e) => e.stopPropagation()}
                                />
                              )}

                              {/* Navigation Buttons in Fullscreen */}
                              {selectedRequest.media.length > 1 && (
                                <>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setCurrentMediaIndex((prev) =>
                                        prev === 0 ? selectedRequest.media!.length - 1 : prev - 1,
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
                                        prev === selectedRequest.media!.length - 1 ? 0 : prev + 1,
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
                                {currentMediaIndex + 1} / {selectedRequest.media.length}
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

                        {/* Navigation Buttons */}
                        {selectedRequest.media.length > 1 && (
                          <>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setCurrentMediaIndex((prev) =>
                                  prev === 0 ? selectedRequest.media!.length - 1 : prev - 1,
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
                                  prev === selectedRequest.media!.length - 1 ? 0 : prev + 1,
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
                          {currentMediaIndex + 1} / {selectedRequest.media.length}
                        </div>
                      </div>

                      {/* Thumbnails */}
                      {selectedRequest.media.length > 1 && (
                        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-border-dark scrollbar-track-transparent">
                          {selectedRequest.media.map((m, i) => (
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
                              {m.type === 'image' ? (
                                <div
                                  className="w-full h-full bg-cover bg-center"
                                  style={{ backgroundImage: `url("${m.url}")` }}
                                />
                              ) : (
                                <div className="w-full h-full bg-black/80 flex items-center justify-center">
                                  <span className="material-symbols-outlined text-white/80 text-[20px]">
                                    play_circle
                                  </span>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Right Column */}
                <div className="col-span-4 space-y-6">
                  {/* Process Status */}
                  <div className="p-5 rounded-xl bg-background-dark border border-border">
                    <h3 className="text-lg font-bold mb-4 text-foreground">Tiến trình xử lý</h3>
                    <div className="space-y-4 relative">
                      {/* Timeline line */}
                      <div className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-border-dark z-0"></div>

                      {Object.entries(processConfig).map(([key, cfg]) => {
                        const active = key === selectedRequest.processStatus;
                        // const past = ... logic if needed, simplify for now
                        return (
                          <div
                            key={key}
                            className={cn('flex gap-3 relative z-10', active ? '' : 'opacity-40')}
                          >
                            <div
                              className={cn(
                                'w-6 h-6 rounded-full bg-background-dark border-2 flex items-center justify-center shrink-0',
                                active ? 'border-primary' : 'border-border',
                              )}
                            >
                              <span
                                className={cn(
                                  'material-symbols-outlined text-[14px]',
                                  active ? 'text-primary' : 'text-muted-foreground',
                                )}
                              >
                                {cfg.icon}
                              </span>
                            </div>
                            <div>
                              <p
                                className={cn(
                                  'text-sm font-bold',
                                  active ? 'text-foreground' : 'text-muted-foreground',
                                )}
                              >
                                {cfg.label}
                              </p>
                              {active && (
                                <p className="text-xs text-primary font-medium mt-0.5">
                                  Trạng thái hiện tại
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* AI Analysis */}
                  {typeof selectedRequest.aiScore === 'number' && (
                    <div className="p-5 rounded-xl bg-surface-dark-highlight/30 border border-border">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                          AI Đánh giá
                        </h3>
                        <span
                          className={cn(
                            'material-symbols-outlined',
                            getAiColor(selectedRequest.aiScore).text,
                          )}
                        >
                          auto_awesome
                        </span>
                      </div>
                      <div className="flex items-end gap-2 mb-2">
                        <span
                          className={cn(
                            'text-4xl font-black',
                            getAiColor(selectedRequest.aiScore).text,
                          )}
                        >
                          {selectedRequest.aiScore}
                        </span>
                        <span className="text-sm text-muted-foreground mb-1.5">/ 100 điểm</span>
                      </div>
                      <div className="w-full bg-background-dark h-2 rounded-full overflow-hidden">
                        <div
                          className={cn(
                            'h-full transition-all duration-500',
                            getAiColor(selectedRequest.aiScore).bar,
                          )}
                          style={{ width: `${selectedRequest.aiScore}%` }}
                        ></div>
                      </div>
                      <p className="text-xs text-muted-foreground mt-3 leading-relaxed">
                        Hệ thống đánh giá mức độ khẩn cấp dựa trên từ khóa và hình ảnh được cung
                        cấp.
                      </p>
                    </div>
                  )}
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
                  {actions?.secondary && (
                    <Button
                      variant="outline"
                      className="gap-2 text-red-500 border-red-500/30 hover:bg-red-500/10 dark:text-red-500 dark:border-red-500/30 dark:hover:bg-red-500/10"
                    >
                      <span className="material-symbols-outlined">close</span>
                      {actions.secondary}
                    </Button>
                  )}
                  {actions?.primary && (
                    <Button
                      variant="primary"
                      className={cn(
                        'dark:text-white flex items-center gap-2 text-lg px-8',
                        actions.className,
                      )}
                    >
                      {actions.icon && (
                        <span className="material-symbols-outlined text-[20px]">
                          {actions.icon}
                        </span>
                      )}
                      {actions.primary}
                    </Button>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              Chọn một yêu cầu để xem chi tiết
            </div>
          )}
        </section>
      </div>
    </DashboardLayout>
  );
}
