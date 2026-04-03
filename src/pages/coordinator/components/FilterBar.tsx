import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BadgeIcon } from '@/components/ui/badgeIcon';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface FilterBarProps {
  search: string;
  onSearchChange: (_value: string) => void;
  urgencyFilter: string;
  onUrgencyFilterChange: (_value: string) => void;
  statusFilter: string;
  onStatusFilterChange: (_value: string) => void;
  needsFilter: string;
  onNeedsFilterChange: (_value: string) => void;
  onFitBounds: () => void;
  onToggleFullscreen: () => void;
  isFullscreen: boolean;
  stats: {
    total: number;
    highUrgency: number;
    unassigned: number;
    completed: number;
  };
}

export function FilterBar({
  search,
  onSearchChange,
  urgencyFilter,
  onUrgencyFilterChange,
  statusFilter,
  onStatusFilterChange,
  needsFilter,
  onNeedsFilterChange,
  onFitBounds,
  onToggleFullscreen,
  isFullscreen,
  stats,
}: FilterBarProps) {
  return (
    <div className={`border-b space-y-3 ${isFullscreen ? 'p-2' : ''}`}>
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold text-primary leading-tight">
          Điều phối cứu trợ những yêu cầu gần trạm quản lý của bạn
        </h1>
        <p className="text-sm text-muted-foreground">
          {stats.total} điểm cần cứu trợ • {stats.highUrgency} khẩn cấp cao
        </p>
      </div>
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <div className="flex flex-col gap-1">
            {/* Label */}
            <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
              Tìm kiếm
            </label>

            {/* Input */}
            <div className="relative w-64">
              <span className="material-symbols-outlined absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 text-sm pointer-events-none">
                search
              </span>

              <Input
                placeholder="Tìm địa điểm..."
                value={search}
                onChange={(e) => onSearchChange(e.target.value)}
                className="pl-8 pr-8"
              />

              {/* Clear button */}

              {search && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        onClick={() => onSearchChange('')}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        aria-label="Xóa tìm kiếm"
                      >
                        <span className="cursor-pointer material-symbols-outlined text-sm align-center text-red-400">
                          close
                        </span>
                      </button>
                    </TooltipTrigger>

                    <TooltipContent side="top">
                      <p className="text-red-500">Xóa tìm kiếm</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
          </div>

          {/* Filter mức độ khẩn cấp */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
              <span className="material-symbols-outlined text-sm text-red-500">error</span>
              Mức độ
            </label>
            <Select value={urgencyFilter} onValueChange={onUrgencyFilterChange}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Mức độ" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  <div className="flex items-center gap-2">
                    <BadgeIcon icon="layers" bg="#6b7280" />
                    Tất cả mức độ
                  </div>
                </SelectItem>
                <SelectItem value="high">
                  <div className="flex items-center gap-2">
                    <BadgeIcon icon="error" bg="#dc2626" />
                    Cao
                  </div>
                </SelectItem>

                <SelectItem value="medium">
                  <div className="flex items-center gap-2">
                    <BadgeIcon icon="warning" bg="#f59e0b" />
                    Trung bình
                  </div>
                </SelectItem>

                <SelectItem value="low">
                  <div className="flex items-center gap-2">
                    <BadgeIcon icon="check_circle" bg="#16a34a" />
                    Thấp
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          {/* Filter trạng thái */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
              <span className="material-symbols-outlined text-sm text-blue-500">sync</span>
              Trạng thái
            </label>
            <Select value={statusFilter} onValueChange={onStatusFilterChange}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Trạng thái" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[16px]">sync_alt</span>
                    Tất cả trạng thái
                  </div>
                </SelectItem>

                <SelectItem value="unassigned">
                  <div className="flex items-center gap-2">
                    <BadgeIcon icon="radio_button_unchecked" bg="#6b7280" />
                    Chưa xử lý
                  </div>
                </SelectItem>

                <SelectItem value="assigned">
                  <div className="flex items-center gap-2">
                    <BadgeIcon icon="group_add" bg="#2563eb" />
                    Đã gán đội
                  </div>
                </SelectItem>

                <SelectItem value="on-the-way">
                  <div className="flex items-center gap-2">
                    <BadgeIcon icon="directions_run" bg="#0ea5e9" />
                    Đang đi
                  </div>
                </SelectItem>

                <SelectItem value="completed">
                  <div className="flex items-center gap-2">
                    <BadgeIcon icon="check_circle" bg="#16a34a" />
                    Hoàn thành
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          {/* Filter theo nhu cầu cần thiết */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
              <span className="material-symbols-outlined text-sm text-indigo-500">inventory_2</span>
              Nhu cầu
            </label>

            <Select value={needsFilter} onValueChange={onNeedsFilterChange}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Chọn nhu cầu" />
              </SelectTrigger>

              <SelectContent>
                <SelectItem value="all">
                  <div className="flex items-center gap-2">
                    <BadgeIcon icon="layers" bg="#6b7280" />
                    Tất cả nhu cầu
                  </div>
                </SelectItem>

                <SelectItem value="food">
                  <div className="flex items-center gap-2">
                    <BadgeIcon icon="restaurant" bg="#ea580c" />
                    Lương thực
                  </div>
                </SelectItem>

                <SelectItem value="water">
                  <div className="flex items-center gap-2">
                    <BadgeIcon icon="water_drop" bg="#0284c7" />
                    Nước
                  </div>
                </SelectItem>

                <SelectItem value="medicine">
                  <div className="flex items-center gap-2">
                    <BadgeIcon icon="medication" bg="#9333ea" />
                    Thuốc
                  </div>
                </SelectItem>

                <SelectItem value="emergencyRescue">
                  <div className="flex items-center gap-2">
                    <BadgeIcon icon="emergency" bg="#dc2626" />
                    Cứu hộ
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Action buttons */}
          <div className="flex flex-col gap-1">
            {/* Group title */}
            <div className="text-xs font-medium text-muted-foreground flex items-center gap-1">
              <span className="material-symbols-outlined text-sm text-green-500">map</span>
              Bản đồ
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={onFitBounds}
                      aria-label="Xem tất cả khu vực"
                    >
                      <span className="material-symbols-outlined text-sm">zoom_out_map</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-xs">
                    Xem tất cả khu vực
                  </TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={onToggleFullscreen}
                      aria-label="Toàn màn hình"
                    >
                      <span className="material-symbols-outlined text-sm">
                        {isFullscreen ? 'fullscreen_exit' : 'fullscreen'}
                      </span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-xs">
                    {isFullscreen ? 'Thoát toàn màn hình' : 'Toàn màn hình'}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        <Badge variant="secondary">Tổng: {stats.total}</Badge>
        <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300">
          Khẩn cấp: {stats.highUrgency}
        </Badge>
        <Badge className="bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300">
          Chưa xử lý: {stats.unassigned}
        </Badge>
        <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300">
          Hoàn thành: {stats.completed}
        </Badge>
      </div>
    </div>
  );
}
