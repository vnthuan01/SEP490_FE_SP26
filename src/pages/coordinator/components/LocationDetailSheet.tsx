import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetBody } from '@/components/ui/sheet';
// import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { ReliefLocation, Team } from './types';
import { getUrgencyColor, getStatusColor, formatDistance, formatDuration } from './utils';
import { useMemo, useState } from 'react';
import type { Vehicle } from '@/services/vehicleService';
import { VehicleDispatchModal } from '@/pages/coordinator/components/VehicleDispatchModal';

type TeamDispatchedVehicleInfo = {
  vehicleId: string;
  vehicleName?: string | null;
  vehicleLicensePlate?: string | null;
  vehicles?: Array<{
    vehicleId: string;
    vehicleName?: string | null;
    vehicleLicensePlate?: string | null;
    isPrimary?: boolean;
  }>;
};

const getTeamLockedVehicles = (
  teamId: string,
  availableVehicles: Vehicle[],
  teamDispatchedVehicleByTeamId: Record<string, TeamDispatchedVehicleInfo>,
): Vehicle[] => {
  if (!teamId) return [];

  const activeBatchVehicle = teamDispatchedVehicleByTeamId[teamId];
  const activeBatchVehicles = Array.isArray(activeBatchVehicle?.vehicles)
    ? activeBatchVehicle.vehicles
    : [];

  if (activeBatchVehicles.length > 0) {
    return activeBatchVehicles.map((vehicle) => {
      const matchedVehicle = availableVehicles.find(
        (candidate) => candidate.vehicleId === vehicle.vehicleId,
      );

      return (
        matchedVehicle ||
        ({
          vehicleId: vehicle.vehicleId,
          vehicleTypeName: vehicle.vehicleName || 'Vehicle',
          licensePlate: vehicle.vehicleLicensePlate || '--',
          currentUsingTeamId: teamId,
          currentUsingTeamName: teamId,
          status: 0,
        } as Vehicle)
      );
    });
  }

  if (activeBatchVehicle?.vehicleId) {
    return [
      availableVehicles.find((vehicle) => vehicle.vehicleId === activeBatchVehicle.vehicleId) ||
        ({
          vehicleId: activeBatchVehicle.vehicleId,
          vehicleTypeName: activeBatchVehicle.vehicleName || 'Vehicle',
          licensePlate: activeBatchVehicle.vehicleLicensePlate || '--',
          currentUsingTeamId: teamId,
          currentUsingTeamName: teamId,
          status: 0,
        } as Vehicle),
    ];
  }

  return availableVehicles.filter((vehicle) => vehicle.currentUsingTeamId === teamId);
};

interface LocationDetailSheetProps {
  location: ReliefLocation | null;
  isOpen: boolean;
  onClose: () => void;
  availableTeams: Team[];
  allTeams?: Team[];
  availableVehicles?: Vehicle[];
  isLoadingVehicles?: boolean;
  assignedTeam?: Team;
  teamDispatchedVehicleByTeamId?: Record<string, TeamDispatchedVehicleInfo>;
  onAssignTeam: (...args: [string, string, string[]?, string?]) => void;
}

export function LocationDetailSheet({
  location,
  isOpen,
  onClose,
  availableTeams,
  allTeams,
  availableVehicles = [],
  isLoadingVehicles = false,
  assignedTeam,
  teamDispatchedVehicleByTeamId = {},
  onAssignTeam,
}: LocationDetailSheetProps) {
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');
  const [selectedVehicleIds, setSelectedVehicleIds] = useState<string[]>([]);
  const [assignNote, setAssignNote] = useState<string>('');
  const [isVehicleModalOpen, setIsVehicleModalOpen] = useState(false);

  const selectedTeam = useMemo(
    () => (allTeams || availableTeams).find((team) => team.id === selectedTeamId) || null,
    [allTeams, availableTeams, selectedTeamId],
  );

  const lockedVehicles = useMemo(() => {
    return getTeamLockedVehicles(selectedTeamId, availableVehicles, teamDispatchedVehicleByTeamId);
  }, [availableVehicles, selectedTeamId, teamDispatchedVehicleByTeamId]);

  const vehicleOptions = useMemo(() => {
    const options: Vehicle[] = [];
    const seen = new Set<string>();

    lockedVehicles.forEach((vehicle) => {
      if (!vehicle.vehicleId || seen.has(vehicle.vehicleId)) return;
      options.push(vehicle);
      seen.add(vehicle.vehicleId);
    });

    availableVehicles.forEach((vehicle) => {
      if (!vehicle.vehicleId || seen.has(vehicle.vehicleId)) return;
      options.push(vehicle);
      seen.add(vehicle.vehicleId);
    });

    return options;
  }, [availableVehicles, lockedVehicles]);

  const handleTeamChange = (teamId: string) => {
    setSelectedTeamId(teamId);
    setSelectedVehicleIds(
      teamId
        ? getTeamLockedVehicles(teamId, availableVehicles, teamDispatchedVehicleByTeamId).map(
            (vehicle) => vehicle.vehicleId,
          )
        : [],
    );
  };

  const toggleVehicle = (vehicleId: string, checked: boolean) => {
    setSelectedVehicleIds((current) => {
      if (checked) {
        return current.includes(vehicleId) ? current : [...current, vehicleId];
      }

      return current.filter((id) => id !== vehicleId);
    });
  };

  const handleOpenVehicleModal = () => {
    setIsVehicleModalOpen(true);
  };

  const handleCloseVehicleModal = () => {
    setIsVehicleModalOpen(false);
  };

  const handleSheetOpenChange = (nextOpen: boolean) => {
    if (nextOpen) return;
    setIsVehicleModalOpen(false);
    setSelectedTeamId('');
    setSelectedVehicleIds([]);
    setAssignNote('');
    onClose();
  };

  if (!location) return null;

  const handleAssign = () => {
    if (selectedTeamId) {
      const effectiveVehicleIds = Array.from(
        new Set(selectedVehicleIds.map((id) => id.trim())),
      ).filter(Boolean);

      onAssignTeam(
        location.id,
        selectedTeamId,
        effectiveVehicleIds.length ? effectiveVehicleIds : undefined,
        assignNote.trim() || undefined,
      );
      setSelectedTeamId('');
      setSelectedVehicleIds([]);
      setAssignNote('');
      onClose();
    }
  };

  return (
    <>
      <Sheet open={isOpen} onOpenChange={handleSheetOpenChange} modal={false}>
        <SheetContent
          side="left"
          className="w-[500px] sm:w-[560px] max-w-[calc(100vw-1rem)] border-r-0 p-0 shadow-2xl"
          overlay={false}
          onPointerDownOutside={(event) => {
            if (isVehicleModalOpen) {
              event.preventDefault();
            }
          }}
          onInteractOutside={(event) => {
            if (isVehicleModalOpen) {
              event.preventDefault();
            }
          }}
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
                            <span className="material-symbols-outlined text-[1rem]">
                              two_wheeler
                            </span>
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
                {location.status === 'unassigned' &&
                  (allTeams?.length || availableTeams.length > 0) && (
                    <div className="bg-card text-card-foreground p-4 rounded-xl border border-border border-l-4 border-l-primary shadow-sm flex flex-col gap-3">
                      <div className="font-semibold text-[15px]">Phân công đội cứu trợ</div>
                      <div className="flex flex-col gap-3">
                        {lockedVehicles.length > 0 ? (
                          <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                            Team đã được điều phối xe:
                            <span className="ml-1 font-semibold">
                              {lockedVehicles
                                .map((vehicle) => vehicle.licensePlate || '--')
                                .join(', ')}
                            </span>
                            {selectedTeam?.name ? ` (${selectedTeam.name})` : ''}
                          </p>
                        ) : null}

                        <Select value={selectedTeamId} onValueChange={handleTeamChange}>
                          <SelectTrigger className="w-full bg-background relative h-10">
                            <SelectValue placeholder="-- Chọn đội cứu trợ --" />
                          </SelectTrigger>
                          <SelectContent>
                            {(allTeams || availableTeams).map((team) => (
                              <SelectItem
                                key={team.id}
                                value={team.id}
                                disabled={Boolean(team.disabledReason)}
                              >
                                <div
                                  className="flex w-full items-center justify-between gap-3 border-l-2 pl-2"
                                  style={{ borderLeftColor: 'currentColor' }}
                                >
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2">
                                      <span className="font-medium truncate">{team.name}</span>
                                      <span className="text-xs text-muted-foreground shrink-0">
                                        ({team.members} người)
                                      </span>
                                    </div>
                                    {team.disabledReason ? (
                                      <p className="text-[11px] text-amber-700 mt-0.5 truncate">
                                        {team.disabledReason}
                                      </p>
                                    ) : null}
                                  </div>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        <div className="space-y-2 rounded-xl border border-border bg-background p-3">
                          <div className="flex items-center justify-between gap-2">
                            <div>
                              <p className="text-sm font-medium">Phương tiện điều phối</p>
                              <p className="text-xs text-muted-foreground">
                                {selectedVehicleIds.length > 0
                                  ? `${selectedVehicleIds.length} xe đã chọn`
                                  : 'Có thể bỏ trống'}
                              </p>
                            </div>

                            <Button
                              type="button"
                              variant="outline"
                              className="h-9 rounded-lg px-3 text-sm"
                              onClick={handleOpenVehicleModal}
                              disabled={vehicleOptions.length === 0}
                            >
                              <span className="material-symbols-outlined text-[18px]">tune</span>
                              Chọn xe
                            </Button>
                          </div>

                          {selectedVehicleIds.length > 0 ? (
                            <div className="flex flex-wrap gap-2 pt-1">
                              {selectedVehicleIds.map((vehicleId) => {
                                const vehicle = vehicleOptions.find(
                                  (item) => item.vehicleId === vehicleId,
                                );
                                return (
                                  <span
                                    key={vehicleId}
                                    className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/40 px-2.5 py-1 text-xs"
                                  >
                                    <span className="material-symbols-outlined text-[14px] text-muted-foreground">
                                      local_shipping
                                    </span>
                                    <span className="truncate">
                                      {`${vehicle?.vehicleTypeName || 'Vehicle'} - ${vehicle?.licensePlate || vehicleId}`}
                                    </span>
                                  </span>
                                );
                              })}
                            </div>
                          ) : (
                            <p className="text-xs text-muted-foreground">
                              Mở modal để chọn nhiều xe và lọc theo loại phương tiện.
                            </p>
                          )}
                        </div>

                        {lockedVehicles.length > 0 ? (
                          <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                            Một số xe đã được điều phối trước đó sẽ được giữ sẵn trong danh sách
                            chọn.
                          </p>
                        ) : null}

                        {isLoadingVehicles ? (
                          <p className="text-xs text-muted-foreground">
                            Đang tải danh sách xe khả dụng...
                          </p>
                        ) : availableVehicles.length === 0 ? (
                          <p className="text-xs text-muted-foreground">
                            Không có xe khả dụng. Bạn vẫn có thể phân công team.
                          </p>
                        ) : null}

                        <Textarea
                          value={assignNote}
                          onChange={(event) => setAssignNote(event.target.value)}
                          placeholder="Ghi chú điều phối (optional)"
                          rows={3}
                        />

                        {availableTeams.length === 0 ? (
                          <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                            Hiện không có team khả dụng để phân công.
                          </p>
                        ) : null}

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

      <VehicleDispatchModal
        key={isVehicleModalOpen ? 'vehicle-modal-open' : 'vehicle-modal-closed'}
        open={isVehicleModalOpen}
        onClose={handleCloseVehicleModal}
        vehicleOptions={vehicleOptions}
        lockedVehicles={lockedVehicles}
        selectedVehicleIds={selectedVehicleIds}
        onToggleVehicle={toggleVehicle}
      />
    </>
  );
}
