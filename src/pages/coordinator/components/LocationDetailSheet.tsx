import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetBody } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
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
import {
  getUrgencyColor,
  getStatusColor,
  getDangerColor,
  formatDistance,
  formatDuration,
} from './utils';
import { useState } from 'react';

interface LocationDetailSheetProps {
  location: ReliefLocation | null;
  isOpen: boolean;
  onClose: () => void;
  availableTeams: Team[];
  assignedTeam?: Team;
  onAssignTeam: (locationId: string, teamId: string) => void;
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
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="left" className="w-[450px] sm:w-[540px] p-0">
        <ScrollArea className="h-full">
          <div className="p-6 space-y-6">
            {/* Header */}
            <SheetHeader>
              <SheetTitle className="text-2xl font-bold">{location.locationName}</SheetTitle>
              <p className="text-sm text-muted-foreground">{location.province}</p>
            </SheetHeader>

            <SheetBody className="space-y-6">
              {/* Urgency Badge */}
              <div className="flex items-center gap-2">
                <Badge
                  style={{
                    backgroundColor: getUrgencyColor(location.urgency),
                    color: 'white',
                  }}
                  className="text-sm px-3 py-1.5 flex items-center gap-2"
                >
                  <span className="material-symbols-outlined text-lg">
                    {location.urgency === 'high'
                      ? 'error'
                      : location.urgency === 'medium'
                        ? 'warning'
                        : 'check_circle'}
                  </span>
                  {location.urgency === 'high'
                    ? 'KHẨN CẤP CAO'
                    : location.urgency === 'medium'
                      ? 'TRUNG BÌNH'
                      : 'THẤP'}
                </Badge>
                <Badge
                  style={{
                    backgroundColor: getStatusColor(location.status),
                    color: 'white',
                  }}
                  className="text-sm px-3 py-1.5 flex items-center gap-2"
                >
                  <span className="material-symbols-outlined text-base">
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
                  {location.status === 'unassigned'
                    ? 'Chưa xử lý'
                    : location.status === 'assigned'
                      ? 'Đã gán đội'
                      : location.status === 'on-the-way'
                        ? 'Đang đi'
                        : location.status === 'completed'
                          ? 'Hoàn thành'
                          : 'Thất bại'}
                </Badge>
              </div>

              {/* Basic Info */}
              <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-muted-foreground">group</span>
                  <div className="flex-1">
                    <p className="text-sm font-medium">Số người cần hỗ trợ</p>
                    <p className="text-lg font-bold text-primary">{location.peopleCount} người</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-muted-foreground">
                    location_on
                  </span>
                  <div className="flex-1">
                    <p className="text-sm font-medium">Địa chỉ</p>
                    <p className="text-sm text-muted-foreground">{location.address}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-muted-foreground">phone</span>
                  <div className="flex-1">
                    <p className="text-sm font-medium">Liên hệ</p>
                    <p className="text-sm text-muted-foreground">{location.contactPerson}</p>
                    <p className="text-sm font-mono text-primary">{location.contactPhone}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-muted-foreground">schedule</span>
                  <div className="flex-1">
                    <p className="text-sm font-medium">Cập nhật lần cuối</p>
                    <p className="text-sm text-muted-foreground">{location.lastUpdated}</p>
                  </div>
                </div>
              </div>

              {/* Needs */}
              <div>
                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <span className="material-symbols-outlined">inventory_2</span>
                  Nhu cầu cần thiết
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  {needsList.map((need, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2 bg-blue-50 dark:bg-blue-950/20 p-2 rounded"
                    >
                      <span className={`material-symbols-outlined text-lg ${need.color}`}>
                        {need.icon}
                      </span>
                      <span className="text-sm font-medium">{need.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Description */}
              {location.description && (
                <div>
                  <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                    <span className="material-symbols-outlined">description</span>
                    Mô tả tình hình
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed italic bg-amber-50 dark:bg-amber-950/20 p-3 rounded border-l-4 border-amber-500">
                    {location.description}
                  </p>
                </div>
              )}

              {/* Distance Info */}
              {location.distanceFromHQ && (
                <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-4 border-l-4 border-blue-500">
                  <h3 className="text-sm font-semibold mb-3 flex items-center gap-2 text-blue-900 dark:text-blue-100">
                    <span className="material-symbols-outlined">route</span>
                    Khoảng cách từ trụ sở
                  </h3>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2 text-muted-foreground">
                        <span className="material-symbols-outlined text-base">straighten</span>
                        Đường thẳng
                      </span>
                      <span className="font-semibold">
                        {location.distanceFromHQ.straightLine.toFixed(1)} km
                      </span>
                    </div>
                    {location.distanceFromHQ.byMotorcycle && (
                      <div className="flex items-center justify-between text-sm bg-white dark:bg-gray-800 p-2 rounded">
                        <span className="flex items-center gap-2 text-muted-foreground">
                          <span className="material-symbols-outlined text-base">two_wheeler</span>
                          Xe máy
                        </span>
                        <span className="font-semibold">
                          {formatDistance(location.distanceFromHQ.byMotorcycle.distance)} •{' '}
                          {formatDuration(location.distanceFromHQ.byMotorcycle.duration)}
                        </span>
                      </div>
                    )}
                    {location.distanceFromHQ.byTruck && (
                      <div className="flex items-center justify-between text-sm bg-white dark:bg-gray-800 p-2 rounded">
                        <span className="flex items-center gap-2 text-muted-foreground">
                          <span className="material-symbols-outlined text-base">
                            local_shipping
                          </span>
                          Xe tải
                        </span>
                        <span className="font-semibold">
                          {formatDistance(location.distanceFromHQ.byTruck.distance)} •{' '}
                          {formatDuration(location.distanceFromHQ.byTruck.duration)}
                        </span>
                      </div>
                    )}
                    {location.distanceFromHQ.byHelicopter && (
                      <div className="flex items-center justify-between text-sm bg-white dark:bg-gray-800 p-2 rounded">
                        <span className="flex items-center gap-2 text-muted-foreground">
                          <span className="material-symbols-outlined text-base">flight</span>
                          Trực thăng
                        </span>
                        <span className="font-semibold">
                          {formatDistance(location.distanceFromHQ.byHelicopter.distance)} •{' '}
                          {formatDuration(location.distanceFromHQ.byHelicopter.duration)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* AI Scores */}
              {location.dangerScore !== undefined && location.priorityScore !== undefined && (
                <div className="bg-amber-50 dark:bg-amber-950/20 rounded-lg p-4 border-l-4 border-amber-500">
                  <h3 className="text-sm font-semibold mb-3 flex items-center gap-2 text-amber-900 dark:text-amber-100">
                    <span className="material-symbols-outlined">psychology</span>
                    Đánh giá AI
                  </h3>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Mức độ nguy hiểm</span>
                      <Badge
                        style={{
                          backgroundColor: getDangerColor(location.dangerScore),
                          color: 'white',
                        }}
                        className="text-sm font-bold px-3 py-1"
                      >
                        {location.dangerScore}%
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Độ ưu tiên</span>
                      <Badge
                        style={{
                          backgroundColor: getDangerColor(location.priorityScore),
                          color: 'white',
                        }}
                        className="text-sm font-bold px-3 py-1"
                      >
                        {location.priorityScore}%
                      </Badge>
                    </div>
                    {location.priorityScore >= 90 && (
                      <div className="mt-2 p-2 bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 rounded text-center">
                        <p className="flex items-center justify-center gap-1 text-sm font-bold text-red-700 dark:text-red-300">
                          <span className="material-symbols-outlined text-base">warning</span>
                          <span> CẦN ƯU TIÊN CAO</span>
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Assigned Team */}
              {assignedTeam && (
                <div className="bg-green-50 dark:bg-green-950/20 rounded-lg p-4 border-l-4 border-green-500">
                  <h3 className="text-sm font-semibold mb-2 flex items-center gap-2 text-green-900 dark:text-green-100">
                    <span className="material-symbols-outlined">groups</span>
                    Đội được phân công
                  </h3>
                  <p className="text-sm font-medium">{assignedTeam.name}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Trưởng đội: {assignedTeam.leader} • {assignedTeam.contactPhone}
                  </p>
                </div>
              )}

              {/* Assignment Section */}
              {location.status === 'unassigned' && availableTeams.length > 0 && (
                <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-4 border-l-4 border-blue-500 space-y-3">
                  <h3 className="text-sm font-semibold flex items-center gap-2 text-blue-900 dark:text-blue-100">
                    <span className="material-symbols-outlined">assignment_ind</span>
                    Phân công đội cứu trợ
                  </h3>
                  <Select value={selectedTeamId} onValueChange={setSelectedTeamId}>
                    <SelectTrigger>
                      <SelectValue placeholder="-- Chọn đội cứu trợ --" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableTeams.map((team) => (
                        <SelectItem key={team.id} value={team.id}>
                          <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-sm">groups</span>
                            {team.name} ({team.members} người)
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    onClick={handleAssign}
                    disabled={!selectedTeamId}
                    className="w-full"
                    size="lg"
                  >
                    <span className="material-symbols-outlined mr-2">check_circle</span>
                    Xác nhận phân công
                  </Button>
                </div>
              )}
            </SheetBody>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
