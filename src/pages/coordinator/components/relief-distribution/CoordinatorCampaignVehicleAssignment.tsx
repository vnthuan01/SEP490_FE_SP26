import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import type { CampaignAssignedVehicle } from '@/services/campaignService';
import type { Vehicle } from '@/services/vehicleService';

export function CoordinatorCampaignVehicleAssignment({
  selectedTeamId,
  teams,
  availableVehicles,
  assignedCampaignVehicles,
  selectedVehicleId,
  onSelectedVehicleIdChange,
  vehicleAssignmentNote,
  onVehicleAssignmentNoteChange,
  onAssignVehicle,
  onUpdateVehicle,
  onRemoveVehicle,
  isAssigningVehicle,
  isUpdatingVehicle,
  isRemovingVehicle,
  formatDateTimeVN,
}: {
  selectedTeamId?: string;
  teams: { campaignTeamId: string; teamName: string }[];
  availableVehicles: Vehicle[];
  assignedCampaignVehicles: CampaignAssignedVehicle[];
  selectedVehicleId: string;
  onSelectedVehicleIdChange: (value: string) => void;
  vehicleAssignmentNote: string;
  onVehicleAssignmentNoteChange: (value: string) => void;
  onAssignVehicle: () => void;
  onUpdateVehicle: (campaignVehicleId: string) => void;
  onRemoveVehicle: (campaignVehicleId: string) => void;
  isAssigningVehicle: boolean;
  isUpdatingVehicle: boolean;
  isRemovingVehicle: boolean;
  formatDateTimeVN: (value?: string | null) => string;
}) {
  const selectedTeamName = teams.find((team) => team.campaignTeamId === selectedTeamId)?.teamName;

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Điều phối phương tiện cho đội</h3>
          <p className="text-sm text-muted-foreground">
            Mỗi phương tiện chỉ được điều phối cho một đội tại một thời điểm. Chỉ hiển thị xe khả
            dụng để gán cho nhánh hộ cô lập / phát tận nơi.
          </p>
        </div>
        <Badge variant={selectedTeamId ? 'info' : 'outline'}>
          {selectedTeamId ? 'Đã chọn đội' : 'Chưa chọn đội'}
        </Badge>
      </div>

      {!selectedTeamId ? (
        <p className="text-sm text-muted-foreground">
          Hãy chọn đội phụ trách trong phần “Thiết lập phân công” trước khi điều phối phương tiện.
        </p>
      ) : (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
          <div className="space-y-3">
            <div className="rounded-xl border bg-muted/20 p-4">
              <p className="text-sm font-medium text-foreground">Đội đang điều phối</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {selectedTeamName || 'Không xác định đội'}
              </p>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">Phương tiện khả dụng</p>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={selectedVehicleId}
                onChange={(e) => onSelectedVehicleIdChange(e.target.value)}
              >
                <option value="">Chọn phương tiện</option>
                {availableVehicles.map((vehicle) => (
                  <option key={vehicle.vehicleId} value={vehicle.vehicleId}>
                    {(vehicle.vehicleTypeName || 'Phương tiện') + ' - ' + vehicle.licensePlate}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">Ghi chú điều phối</p>
              <Textarea
                placeholder="Ví dụ: Xuồng máy cho tổ cơ động khu vực phía Bắc"
                value={vehicleAssignmentNote}
                onChange={(e) => onVehicleAssignmentNoteChange(e.target.value)}
              />
            </div>
            <Button
              type="button"
              onClick={onAssignVehicle}
              disabled={!selectedVehicleId || isAssigningVehicle}
            >
              Điều phối phương tiện
            </Button>
          </div>

          <div className="space-y-3">
            <p className="text-sm font-medium">Phương tiện đã gán cho đội</p>
            {assignedCampaignVehicles.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Chưa có phương tiện nào được điều phối cho đội đang chọn.
              </p>
            ) : (
              assignedCampaignVehicles.map((vehicle) => (
                <div key={vehicle.campaignVehicleId} className="rounded-xl border bg-muted/20 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium text-foreground">
                        {vehicle.vehicleTypeName || 'Phương tiện'} · {vehicle.licensePlate}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Bắt đầu: {formatDateTimeVN(vehicle.startDate)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Tài xế: {vehicle.driverName || 'Chưa gán tài xế'}
                      </p>
                    </div>
                    <Badge variant="success">Đang gán</Badge>
                  </div>
                  {vehicle.note && (
                    <p className="mt-2 text-sm text-muted-foreground">{vehicle.note}</p>
                  )}
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => onUpdateVehicle(vehicle.campaignVehicleId)}
                      disabled={isUpdatingVehicle}
                    >
                      Cập nhật lại gán xe
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="destructive"
                      onClick={() => onRemoveVehicle(vehicle.campaignVehicleId)}
                      disabled={isRemovingVehicle}
                    >
                      Gỡ xe khỏi đội
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
