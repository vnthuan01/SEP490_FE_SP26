import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useVehicles, useVehicleTypes } from '@/hooks/useVehicles';
import { useMyStation } from '@/hooks/useReliefStations';
import { useTeamsInStation } from '@/hooks/useTeams';
import { TeamStatus } from '@/enums/beEnums';
import { coordinatorNavGroups } from './components/sidebarConfig';
import { toast } from 'sonner';

type VehicleFormState = {
  vehicleId?: string;
  vehicleTypeId: string;
  licensePlate: string;
  teamId: string;
  status: number;
};

const defaultVehicleForm: VehicleFormState = {
  vehicleTypeId: '',
  licensePlate: '',
  teamId: '',
  status: 1,
};

export default function CoordinatorVehicleManagementPage() {
  const [pageIndex, setPageIndex] = useState(1);
  const [pageSize] = useState(10);
  const [search, setSearch] = useState('');

  const [openVehicleModal, setOpenVehicleModal] = useState(false);
  const [openAssignTeamModal, setOpenAssignTeamModal] = useState(false);

  const [assignVehicleId, setAssignVehicleId] = useState('');
  const [assignTeamId, setAssignTeamId] = useState('');

  const [vehicleForm, setVehicleForm] = useState<VehicleFormState>(defaultVehicleForm);

  const {
    vehicles,
    vehiclesPagination,
    isLoadingVehicles,
    createVehicle,
    createStatus,
    updateVehicle,
    updateStatus,
    deleteVehicle,
    assignVehicleTeam,
    assignVehicleTeamStatus,
  } = useVehicles(undefined, undefined, {
    pageIndex,
    pageSize,
    search: search || undefined,
  });

  const { vehicleTypes } = useVehicleTypes(undefined, { pageIndex: 1, pageSize: 100 });
  const { data: myStation } = useMyStation();
  const stationId = myStation?.reliefStationId;
  const { teams: stationTeams, isLoading: isLoadingStationTeams } = useTeamsInStation(stationId);
  const approvedTeams = stationTeams.filter((team) => team.status === TeamStatus.Active);

  const handleOpenCreateVehicle = () => {
    setVehicleForm(defaultVehicleForm);
    setOpenVehicleModal(true);
  };

  const handleOpenEditVehicle = (vehicle: any) => {
    setVehicleForm({
      vehicleId: vehicle.vehicleId,
      vehicleTypeId: vehicle.vehicleTypeId,
      licensePlate: vehicle.licensePlate,
      teamId: vehicle.teamId || '',
      status: vehicle.status,
    });
    setOpenVehicleModal(true);
  };

  const handleOpenAssignTeam = (vehicleId: string, currentTeamId?: string) => {
    setAssignVehicleId(vehicleId);
    setAssignTeamId(currentTeamId || '');
    setOpenAssignTeamModal(true);
  };

  const handleSaveVehicle = async () => {
    if (!vehicleForm.vehicleTypeId || !vehicleForm.licensePlate.trim()) {
      toast.error('Vui lòng nhập loại xe và biển số xe.');
      return;
    }

    const normalizedLicensePlate = vehicleForm.licensePlate.trim().toUpperCase();

    if (vehicleForm.vehicleId) {
      await updateVehicle({
        id: vehicleForm.vehicleId,
        data: {
          vehicleTypeId: vehicleForm.vehicleTypeId,
          licensePlate: normalizedLicensePlate,
          teamId: vehicleForm.teamId || undefined,
          status: vehicleForm.status,
        },
      });
    } else {
      await createVehicle({
        vehicleTypeId: vehicleForm.vehicleTypeId,
        licensePlate: normalizedLicensePlate,
        teamId: vehicleForm.teamId || undefined,
      });
    }

    setOpenVehicleModal(false);
  };

  const handleAssignTeam = async () => {
    if (!assignVehicleId || !assignTeamId) {
      toast.error('Vui lòng chọn đội để gán.');
      return;
    }

    await assignVehicleTeam({ id: assignVehicleId, teamId: assignTeamId });
    setOpenAssignTeamModal(false);
  };

  return (
    <DashboardLayout navGroups={coordinatorNavGroups}>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-primary">Phương tiện trạm</h1>
            <p className="text-muted-foreground dark:text-muted-foreground">
              Quản lý phương tiện trong trạm cứu trợ của bạn.
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Trạm hiện tại: {myStation?.name || 'Đang tải thông tin trạm...'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              size="lg"
              className="bg-primary text-white gap-2 font-bold rounded-full"
              onClick={handleOpenCreateVehicle}
            >
              <span className="material-symbols-outlined text-lg">add</span>
              Thêm phương tiện
            </Button>
          </div>
        </div>

        <Card className="bg-surface-dark dark:bg-surface-light border-border">
          <div className="flex flex-col sm:flex-row items-center justify-between p-4 gap-4 border-b border-border">
            <div className="relative w-full sm:w-96">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-muted-foreground">
                search
              </span>
              <Input
                className="pl-10 w-full"
                placeholder="Tìm kiếm biển số xe..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPageIndex(1);
                }}
              />
            </div>
          </div>

          <CardHeader>
            <CardTitle>Danh sách phương tiện trong trạm</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              {isLoadingVehicles ? (
                <div className="flex items-center justify-center py-16">
                  <div className="flex flex-col items-center gap-3">
                    <span className="material-symbols-outlined text-4xl text-primary animate-spin">
                      progress_activity
                    </span>
                    <p className="text-muted-foreground text-sm">
                      Đang tải danh sách phương tiện...
                    </p>
                  </div>
                </div>
              ) : vehicles.length === 0 ? (
                <div className="flex items-center justify-center py-16">
                  <div className="flex flex-col items-center gap-3">
                    <span className="material-symbols-outlined text-4xl text-muted-foreground">
                      local_shipping
                    </span>
                    <p className="text-muted-foreground text-sm">Không tìm thấy phương tiện nào</p>
                  </div>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Biển số xe</TableHead>
                      <TableHead>Loại phương tiện</TableHead>
                      <TableHead>Đội đang sử dụng</TableHead>
                      <TableHead>Ngày thêm</TableHead>
                      <TableHead>Trạng thái</TableHead>
                      <TableHead className="text-right">Thao tác</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {vehicles.map((v) => (
                      <TableRow
                        key={v.vehicleId}
                        className="group hover:bg-card/50 transition-colors"
                      >
                        <TableCell>
                          <p className="font-bold text-foreground text-sm">{v.licensePlate}</p>
                          <p className="text-[10px] text-muted-foreground uppercase">
                            ID: {v.vehicleId.slice(0, 8)}
                          </p>
                        </TableCell>
                        <TableCell>{v.vehicleTypeName || '—'}</TableCell>
                        <TableCell>
                          {v.currentUsingTeamName || v.teamName || v.teamUsed || '—'}
                        </TableCell>
                        <TableCell>
                          {v.createdAt ? new Date(v.createdAt).toLocaleDateString() : '—'}
                        </TableCell>
                        <TableCell>
                          {v.status === 1 ? (
                            <Badge variant="success" size="xs">
                              Sẵn sàng
                            </Badge>
                          ) : v.status === 2 ? (
                            <Badge variant="warning" size="xs">
                              Đang bận
                            </Badge>
                          ) : (
                            <Badge variant="destructive" size="xs">
                              Không xác định
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <span className="material-symbols-outlined">more_vert</span>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                className="gap-2"
                                onClick={() => handleOpenAssignTeam(v.vehicleId, v.teamId)}
                              >
                                <span className="material-symbols-outlined text-lg">groups</span>
                                Gán đội phụ trách
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="gap-2"
                                onClick={() => handleOpenEditVehicle(v)}
                              >
                                <span className="material-symbols-outlined text-lg">edit</span>
                                Chỉnh sửa thông tin
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="gap-2 text-destructive"
                                onClick={() => deleteVehicle(v.vehicleId)}
                              >
                                <span className="material-symbols-outlined text-lg">delete</span>
                                Xóa phương tiện
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>

            {vehiclesPagination &&
              vehiclesPagination.totalCount > 0 &&
              vehiclesPagination.totalCount > pageSize && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-border mt-auto">
                  <p className="text-sm text-muted-foreground">
                    Trang {vehiclesPagination.currentPage} — Tổng {vehiclesPagination.totalCount}{' '}
                    phương tiện
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={!vehiclesPagination.hasPrevious}
                      onClick={() => setPageIndex((prev) => Math.max(1, prev - 1))}
                      className="gap-1"
                    >
                      <span className="material-symbols-outlined text-sm">chevron_left</span>
                      Trước
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={!vehiclesPagination.hasNext}
                      onClick={() => setPageIndex((prev) => prev + 1)}
                      className="gap-1"
                    >
                      Sau
                      <span className="material-symbols-outlined text-sm">chevron_right</span>
                    </Button>
                  </div>
                </div>
              )}
          </CardContent>
        </Card>

        <Dialog open={openVehicleModal} onOpenChange={setOpenVehicleModal}>
          <DialogContent className="sm:max-w-[560px]">
            <DialogHeader>
              <DialogTitle>
                {vehicleForm.vehicleId ? 'Chỉnh sửa phương tiện' : 'Thêm phương tiện mới'}
              </DialogTitle>
              <DialogDescription>
                Moderator chỉ được quản lý phương tiện trong trạm của mình.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="grid gap-2">
                <label className="text-sm font-medium text-foreground">Biển số xe</label>
                <Input
                  placeholder="Ví dụ: 51A-12345"
                  value={vehicleForm.licensePlate}
                  onChange={(e) =>
                    setVehicleForm((prev) => ({
                      ...prev,
                      licensePlate: e.target.value.toUpperCase(),
                    }))
                  }
                />
              </div>

              <div className="grid gap-2">
                <label className="text-sm font-medium text-foreground">Loại phương tiện</label>
                <Select
                  value={vehicleForm.vehicleTypeId}
                  onValueChange={(value) =>
                    setVehicleForm((prev) => ({ ...prev, vehicleTypeId: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn loại phương tiện" />
                  </SelectTrigger>
                  <SelectContent>
                    {vehicleTypes.map((type) => (
                      <SelectItem key={type.id} value={type.id}>
                        {type.typeName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <label className="text-sm font-medium text-foreground">
                  Đội phụ trách (tùy chọn)
                </label>
                <Select
                  value={vehicleForm.teamId || 'unassigned-team'}
                  onValueChange={(value) =>
                    setVehicleForm((prev) => ({
                      ...prev,
                      teamId: value === 'unassigned-team' ? '' : value,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn đội đã duyệt" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned-team">Chưa gán đội</SelectItem>
                    {approvedTeams.map((team) => (
                      <SelectItem key={team.teamId} value={team.teamId}>
                        {team.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {isLoadingStationTeams && (
                  <p className="text-xs text-muted-foreground">
                    Đang tải danh sách đội trong trạm...
                  </p>
                )}
              </div>

              {vehicleForm.vehicleId && (
                <div className="grid gap-2">
                  <label className="text-sm font-medium text-foreground">Trạng thái</label>
                  <Select
                    value={String(vehicleForm.status)}
                    onValueChange={(value) =>
                      setVehicleForm((prev) => ({ ...prev, status: Number(value) }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Chọn trạng thái" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Sẵn sàng</SelectItem>
                      <SelectItem value="2">Đang bận</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setOpenVehicleModal(false)}>
                Hủy
              </Button>
              <Button
                onClick={handleSaveVehicle}
                disabled={createStatus === 'pending' || updateStatus === 'pending'}
              >
                {createStatus === 'pending' || updateStatus === 'pending'
                  ? 'Đang lưu...'
                  : 'Lưu phương tiện'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={openAssignTeamModal} onOpenChange={setOpenAssignTeamModal}>
          <DialogContent className="sm:max-w-[520px]">
            <DialogHeader>
              <DialogTitle>Gán đội cho phương tiện</DialogTitle>
              <DialogDescription>Chỉ hiển thị đội đã duyệt trong trạm của bạn.</DialogDescription>
            </DialogHeader>

            <div className="grid gap-2">
              <label className="text-sm font-medium text-foreground">Đội phụ trách</label>
              <Select value={assignTeamId} onValueChange={setAssignTeamId}>
                <SelectTrigger>
                  <SelectValue placeholder="Chọn đội" />
                </SelectTrigger>
                <SelectContent>
                  {approvedTeams.map((team) => (
                    <SelectItem key={team.teamId} value={team.teamId}>
                      {team.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setOpenAssignTeamModal(false)}>
                Hủy
              </Button>
              <Button onClick={handleAssignTeam} disabled={assignVehicleTeamStatus === 'pending'}>
                {assignVehicleTeamStatus === 'pending' ? 'Đang gán...' : 'Xác nhận gán đội'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
