import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetBody } from '@/components/ui/sheet';
// import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { ReliefLocation, Team } from './types';
import { getUrgencyColor, getStatusColor, formatDistance, formatDuration } from './utils';
import { useState } from 'react';

interface LocationDetailSheetProps {
  location: ReliefLocation | null;
  isOpen: boolean;
  onClose: () => void;
  availableTeams: Team[];
  assignedTeam?: Team;
  onAssignTeam: (_locationId: string, _teamId: string) => void;
}

const getPriorityColor = (value: number) => {
  if (value >= 80) return 'bg-gradient-to-t from-green-400 to-green-600';
  if (value >= 60) return 'bg-gradient-to-t from-lime-400 to-lime-600';
  if (value >= 40) return 'bg-gradient-to-t from-yellow-300 to-yellow-500';
  if (value >= 20) return 'bg-gradient-to-t from-orange-400 to-orange-600';
  return 'bg-gradient-to-t from-red-400 to-red-600';
};

const getDangerBarColor = (value: number) => {
  if (value >= 80) return 'bg-gradient-to-t from-red-500 to-red-700';
  if (value >= 60) return 'bg-gradient-to-t from-orange-400 to-orange-600';
  if (value >= 40) return 'bg-gradient-to-t from-yellow-300 to-yellow-500';
  return 'bg-gradient-to-t from-green-400 to-green-600';
};

function VerticalProgress({
  value,
  color,
  size,
}: {
  value: number;
  color: string;
  size?: 'sm' | 'md' | 'lg';
}) {
  return (
    <div className="flex flex-col items-center gap-2 w-16" title={`${value}%`}>
      <div
        className={`relative bg-muted rounded-full overflow-hidden ${size === 'lg' ? 'h-40 w-4' : size === 'md' ? 'h-32 w-3' : 'h-24 w-2'}`}
      >
        <div
          className={`absolute bottom-0 w-full ${color} animate-pulse`}
          style={{ height: `${value - 10}%` }}
        />
      </div>
      <span className="text-sm font-semibold">{value}%</span>
    </div>
  );
}

export function LocationDetailSheet({
  location,
  isOpen,
  onClose,
  availableTeams,
  assignedTeam,
  onAssignTeam,
}: LocationDetailSheetProps) {
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');

  if (!location) return null;

  const handleAssign = () => {
    if (selectedTeamId) {
      onAssignTeam(location.id, selectedTeamId);
      setSelectedTeamId('');
      onClose();
    }
  };

  const needsList = [];
  if (location.needs.food)
    needsList.push({ icon: 'restaurant', label: 'Lương thực', color: 'text-orange-600' });
  if (location.needs.water)
    needsList.push({ icon: 'water_drop', label: 'Nước', color: 'text-blue-600' });
  if (location.needs.medicine)
    needsList.push({ icon: 'medication', label: 'Thuốc', color: 'text-red-600' });
  if (location.needs.emergencyRescue)
    needsList.push({ icon: 'emergency', label: 'Cứu hộ khẩn cấp', color: 'text-red-700' });

  return (
    <Sheet open={isOpen} onOpenChange={onClose} modal={false}>
      <SheetContent
        side="left"
        className="w-[450px] sm:w-[540px] p-0 shadow-2xl border-r-0"
        overlay={false}
      >
        <ScrollArea className="h-full">
          <div className="p-6 space-y-4 bg-gray-50/50 dark:bg-zinc-950/50 min-h-screen">
            {/* Header */}
            <SheetHeader className="mb-4">
              <SheetTitle className="text-2xl font-bold">{location.locationName}</SheetTitle>
              <p className="text-sm text-muted-foreground flex items-center gap-1.5 mt-1">
                <span className="material-symbols-outlined text-[1rem]">place</span>
                {location.province}
              </p>
            </SheetHeader>

            <SheetBody className="space-y-4">
              {/* STATUS CARDS */}
              <div className="grid grid-cols-2 gap-3">
                <div
                  className="bg-card text-card-foreground p-3 rounded-xl border border-border flex flex-col gap-1.5 shadow-sm"
                  style={{
                    borderLeftColor: getUrgencyColor(location.urgency),
                    borderLeftWidth: '4px',
                  }}
                >
                  <div className="font-semibold text-sm">Mức độ khẩn cấp</div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span
                      className="material-symbols-outlined text-[1rem]"
                      style={{ color: getUrgencyColor(location.urgency) }}
                    >
                      {location.urgency === 'high'
                        ? 'error'
                        : location.urgency === 'medium'
                          ? 'warning'
                          : 'check_circle'}
                    </span>
                    <span
                      className="font-medium"
                      style={{ color: getUrgencyColor(location.urgency) }}
                    >
                      {location.urgency === 'high'
                        ? 'KHẨN CẤP CAO'
                        : location.urgency === 'medium'
                          ? 'TRUNG BÌNH'
                          : 'THẤP'}
                    </span>
                  </div>
                </div>

                <div
                  className="bg-card text-card-foreground p-3 rounded-xl border border-border flex flex-col gap-1.5 shadow-sm"
                  style={{
                    borderLeftColor: getStatusColor(location.status),
                    borderLeftWidth: '4px',
                  }}
                >
                  <div className="font-semibold text-sm">Trạng thái xử lý</div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span
                      className="material-symbols-outlined text-[1rem]"
                      style={{ color: getStatusColor(location.status) }}
                    >
                      {location.status === 'unassigned'
                        ? 'radio_button_unchecked'
                        : location.status === 'assigned'
                          ? 'group_add'
                          : location.status === 'on-the-way'
                            ? 'directions_run'
                            : location.status === 'completed'
                              ? 'check_circle'
                              : 'cancel'}
                    </span>
                    <span
                      className="font-medium"
                      style={{ color: getStatusColor(location.status) }}
                    >
                      {location.status === 'unassigned'
                        ? 'Chưa xử lý'
                        : location.status === 'assigned'
                          ? 'Đã gán đội'
                          : location.status === 'on-the-way'
                            ? 'Đang đi'
                            : location.status === 'completed'
                              ? 'Hoàn thành'
                              : 'Thất bại'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Basic Info Card */}
              <div className="bg-card text-card-foreground p-4 rounded-xl border border-border border-l-4 border-l-blue-500 shadow-sm flex flex-col gap-3">
                <div className="font-semibold text-[15px] flex items-center justify-between">
                  Thông tin cơ bản
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center flex-shrink-0">
                      <span className="material-symbols-outlined text-blue-600 dark:text-blue-400 text-sm">
                        group
                      </span>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">Số người cần hỗ trợ</p>
                      <p className="text-xs text-muted-foreground font-semibold">
                        {location.peopleCount} người
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center flex-shrink-0">
                      <span className="material-symbols-outlined text-muted-foreground text-sm">
                        map
                      </span>
                    </div>
                    <div className="flex-1 line-clamp-2">
                      <p className="text-sm font-medium">Địa chỉ</p>
                      <p className="text-xs text-muted-foreground">{location.address}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center flex-shrink-0">
                      <span className="material-symbols-outlined text-muted-foreground text-sm">
                        phone_in_talk
                      </span>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">Liên hệ: {location.contactPerson}</p>
                      <p className="text-xs text-muted-foreground">{location.contactPhone}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Needs Card */}
              <div className="bg-card text-card-foreground p-4 rounded-xl border border-border border-l-4 border-l-orange-500 shadow-sm flex flex-col gap-3">
                <div className="font-semibold text-[15px]">Nhu cầu tiếp tế</div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                  {needsList.map((need, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-1.5 bg-muted/50 px-2.5 py-1 rounded-full border border-border"
                    >
                      <span className={`material-symbols-outlined text-[1.1rem] ${need.color}`}>
                        {need.icon}
                      </span>
                      <span className="text-xs font-medium text-foreground">{need.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Description Card */}
              {location.description && (
                <div className="bg-card text-card-foreground p-4 rounded-xl border border-border border-l-4 border-l-amber-500 shadow-sm flex flex-col gap-2">
                  <div className="font-semibold text-[15px]">Mô tả tình hình</div>
                  <div className="flex items-start gap-2 text-sm text-muted-foreground pt-1">
                    <p className="text-sm leading-relaxed italic text-foreground/80 bg-amber-50/50 dark:bg-amber-950/20 p-3 rounded-lg border border-amber-100 dark:border-amber-900/50 w-full">
                      "{location.description}"
                    </p>
                  </div>
                </div>
              )}

              {/* Distance Info Card */}
              {location.distanceFromHQ && (
                <div className="bg-card text-card-foreground p-4 rounded-xl border border-border border-l-4 border-l-indigo-500 shadow-sm flex flex-col gap-3">
                  <div className="font-semibold text-[15px]">Khoảng cách từ trụ sở</div>
                  <div className="flex flex-col gap-2.5">
                    <div className="flex items-center justify-between text-sm pb-2 border-b border-border/50">
                      <span className="flex items-center gap-2 text-muted-foreground">
                        <span className="material-symbols-outlined text-[1rem]">straighten</span>
                        Đường thẳng
                      </span>
                      <span className="font-semibold">
                        {location.distanceFromHQ.straightLine.toFixed(1)} km
                      </span>
                    </div>

                    {location.distanceFromHQ.byMotorcycle && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-2 text-muted-foreground">
                          <span className="material-symbols-outlined text-[1rem]">two_wheeler</span>
                          Xe máy
                        </span>
                        <span className="font-semibold opacity-90">
                          {formatDistance(location.distanceFromHQ.byMotorcycle.distance)} •{' '}
                          {formatDuration(location.distanceFromHQ.byMotorcycle.duration)}
                        </span>
                      </div>
                    )}

                    {location.distanceFromHQ.byTruck && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-2 text-muted-foreground">
                          <span className="material-symbols-outlined text-[1rem]">
                            local_shipping
                          </span>
                          Xe tải
                        </span>
                        <span className="font-semibold opacity-90">
                          {formatDistance(location.distanceFromHQ.byTruck.distance)} •{' '}
                          {formatDuration(location.distanceFromHQ.byTruck.duration)}
                        </span>
                      </div>
                    )}

                    {location.distanceFromHQ.byHelicopter && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-2 text-muted-foreground">
                          <span className="material-symbols-outlined text-[1rem]">flight</span>
                          Trực thăng
                        </span>
                        <span className="font-semibold opacity-90">
                          {formatDistance(location.distanceFromHQ.byHelicopter.distance)} •{' '}
                          {formatDuration(location.distanceFromHQ.byHelicopter.duration)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* AI Scores Card */}
              {location.dangerScore !== undefined && location.priorityScore !== undefined && (
                <div className="bg-card text-card-foreground p-4 rounded-xl border border-border border-l-4 border-l-rose-500 shadow-sm flex flex-col gap-4">
                  <div className="font-semibold text-[15px]">Đánh giá AI</div>
                  <div className="flex items-center gap-2">
                    <div className="text-sm">Mức độ: </div>
                  </div>

                  <div className="flex items-end justify-around">
                    {/* Danger */}
                    <div className="flex flex-col items-center gap-2">
                      <VerticalProgress
                        value={location.dangerScore}
                        color={getDangerBarColor(location.dangerScore)}
                        size="lg"
                      />
                      <span className="text-xs text-muted-foreground text-center">Nguy hiểm</span>
                    </div>

                    {/* Priority */}
                    <div className="flex flex-col items-center gap-2">
                      <VerticalProgress
                        value={location.priorityScore}
                        color={getPriorityColor(location.priorityScore)}
                        size="lg"
                      />
                      <span className="text-xs text-muted-foreground text-center">Ưu tiên</span>
                    </div>
                  </div>

                  {/* Highlight */}
                  {location.priorityScore >= 90 && (
                    <div className="mt-2 p-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg flex items-center justify-center gap-2">
                      <span className="material-symbols-outlined text-[1rem] text-green-600 dark:text-green-400">
                        verified
                      </span>
                      <span className="text-sm font-bold text-green-600 dark:text-green-400">
                        ƯU TIÊN RẤT CAO
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Assigned Team Card */}
              {assignedTeam && (
                <div className="bg-card text-card-foreground p-4 rounded-xl border border-border border-l-4 border-l-green-500 shadow-sm flex flex-col gap-2">
                  <div className="font-semibold text-[15px]">Đội cứu trợ phụ trách</div>
                  <div className="flex items-center gap-3 pt-1">
                    <div className="w-9 h-9 rounded-full bg-green-100 dark:bg-green-900/40 flex items-center justify-center flex-shrink-0">
                      <span className="material-symbols-outlined text-green-600 dark:text-green-400 text-sm">
                        groups
                      </span>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{assignedTeam.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {assignedTeam.leader} • {assignedTeam.contactPhone}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Assignment Form Card */}
              {location.status === 'unassigned' && availableTeams.length > 0 && (
                <div className="bg-card text-card-foreground p-4 rounded-xl border border-border border-l-4 border-l-primary shadow-sm flex flex-col gap-3">
                  <div className="font-semibold text-[15px]">Phân công đội cứu trợ</div>
                  <div className="flex flex-col gap-3">
                    <Select value={selectedTeamId} onValueChange={setSelectedTeamId}>
                      <SelectTrigger className="w-full bg-background relative h-10">
                        <SelectValue placeholder="-- Chọn đội cứu trợ --" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableTeams.map((team) => (
                          <SelectItem key={team.id} value={team.id}>
                            <div
                              className="flex items-center gap-2 border-l-2 pl-2"
                              style={{ borderLeftColor: 'currentColor' }}
                            >
                              <span className="font-medium">{team.name}</span>
                              <span className="text-xs text-muted-foreground">
                                ({team.members} người)
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Button
                      onClick={handleAssign}
                      disabled={!selectedTeamId}
                      className="w-full h-10 shadow-sm transition-all"
                    >
                      <span className="material-symbols-outlined text-[1rem] mr-2">
                        check_circle
                      </span>
                      Xác nhận phân công
                    </Button>
                  </div>
                </div>
              )}
            </SheetBody>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
