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
import { managerNavGroups } from './components/sidebarConfig';
import { toast } from 'sonner';
import { formatNumberVN } from '@/lib/utils';

type VehicleFormState = {
  vehicleId?: string;
  vehicleTypeId: string;
  licensePlate: string;
  teamUsed: string;
  status: number;
};

const defaultVehicleForm: VehicleFormState = {
  vehicleTypeId: '',
  licensePlate: '',
  teamUsed: '',
  status: 0,
};

type VehicleTypeFormState = {
  id?: string;
  typeName: string;
  defaultCapacity: number;
  description: string;
};

const defaultVehicleTypeForm: VehicleTypeFormState = {
  typeName: '',
  defaultCapacity: 0,
  description: '',
};

export default function ManagerVehicleManagementPage() {
  const [pageIndex, setPageIndex] = useState(1);
  const [pageSize] = useState(10);
  const [search, setSearch] = useState('');
  const [openVehicleModal, setOpenVehicleModal] = useState(false);
  const [openVehicleTypeModal, setOpenVehicleTypeModal] = useState(false);
  const [vehicleForm, setVehicleForm] = useState<VehicleFormState>(defaultVehicleForm);
  const [vehicleTypeForm, setVehicleTypeForm] =
    useState<VehicleTypeFormState>(defaultVehicleTypeForm);

  const {
    vehicles,
    vehiclesPagination,
    isLoadingVehicles,
    createVehicle,
    createStatus,
    updateVehicle,
    updateStatus,
    deleteVehicle,
  } = useVehicles(undefined, undefined, {
    pageIndex,
    pageSize,
    search: search || undefined,
  });
  const {
    vehicleTypes,
    createVehicleType,
    createTypeStatus,
    updateVehicleType,
    updateTypeStatus,
    deleteVehicleType,
  } = useVehicleTypes(undefined, { pageIndex: 1, pageSize: 100 });

  const handleOpenCreateVehicle = () => {
    setVehicleForm(defaultVehicleForm);
    setOpenVehicleModal(true);
  };

  const handleOpenEditVehicle = (vehicle: any) => {
    setVehicleForm({
      vehicleId: vehicle.vehicleId,
      vehicleTypeId: vehicle.vehicleTypeId,
      licensePlate: vehicle.licensePlate,
      teamUsed: vehicle.teamUsed || '',
      status: vehicle.status,
    });
    setOpenVehicleModal(true);
  };

  const handleOpenCreateVehicleType = () => {
    setVehicleTypeForm(defaultVehicleTypeForm);
    setOpenVehicleTypeModal(true);
  };

  const handleOpenEditVehicleType = (type: any) => {
    setVehicleTypeForm({
      id: type.id,
      typeName: type.typeName,
      defaultCapacity: type.defaultCapacity || 0,
      description: type.description || '',
    });
    setOpenVehicleTypeModal(true);
  };

  const handleSaveVehicle = async () => {
    if (!vehicleForm.vehicleTypeId || !vehicleForm.licensePlate.trim()) {
      toast.error('Vui lòng nhập loại xe và biển số xe.');
      return;
    }

    if (vehicleForm.vehicleId) {
      await updateVehicle({
        id: vehicleForm.vehicleId,
        data: {
          vehicleTypeId: vehicleForm.vehicleTypeId,
          licensePlate: vehicleForm.licensePlate.trim(),
          teamUsed: vehicleForm.teamUsed.trim(),
          status: vehicleForm.status,
        },
      });
    } else {
      await createVehicle({
        vehicleTypeId: vehicleForm.vehicleTypeId,
        licensePlate: vehicleForm.licensePlate.trim(),
        teamUsed: vehicleForm.teamUsed.trim(),
      });
    }

    setOpenVehicleModal(false);
  };

  const handleSaveVehicleType = async () => {
    if (!vehicleTypeForm.typeName.trim()) {
      toast.error('Vui lòng nhập tên loại phương tiện.');
      return;
    }

    if (vehicleTypeForm.id) {
      await updateVehicleType({
        id: vehicleTypeForm.id,
        data: {
          typeName: vehicleTypeForm.typeName.trim(),
          defaultCapacity: Number(vehicleTypeForm.defaultCapacity),
          description: vehicleTypeForm.description.trim(),
        },
      });
    } else {
      await createVehicleType({
        typeName: vehicleTypeForm.typeName.trim(),
        defaultCapacity: Number(vehicleTypeForm.defaultCapacity),
        description: vehicleTypeForm.description.trim(),
      });
    }

    setOpenVehicleTypeModal(false);
  };

  return (
    <DashboardLayout navGroups={managerNavGroups}>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-primary">Quản lý phương tiện</h1>
            <p className="text-muted-foreground dark:text-muted-foreground">
              Điều phối phương tiện giao thông giữa các trạm cứu trợ.
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
            <CardTitle>Danh sách phương tiện điều phối</CardTitle>
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
                      <TableHead>Đội sử dụng</TableHead>
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
                        <TableCell>
                          <span className="text-foreground text-sm">
                            {v.vehicleTypeName || '—'}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span
                            className="text-foreground text-sm truncate max-w-[150px] inline-block"
                            title={v.teamUsed}
                          >
                            {v.teamUsed || '—'}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="text-muted-foreground text-xs">
                            {v.createdAt ? new Date(v.createdAt).toLocaleDateString() : '—'}
                          </span>
                        </TableCell>
                        <TableCell>
                          {v.status === 0 ? (
                            <Badge variant="success" size="xs">
                              Sẵn sàng
                            </Badge>
                          ) : v.status === 1 ? (
                            <Badge variant="warning" size="xs">
                              Đang sử dụng
                            </Badge>
                          ) : (
                            <Badge variant="destructive" size="xs">
                              Đang bảo trì
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
                              <DropdownMenuItem className="gap-2">
                                <span className="material-symbols-outlined text-lg">sync_alt</span>
                                Điều phối phương tiện
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
                                <span className="material-symbols-outlined text-lg">build</span>
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

            {/* Pagination */}
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

        <Card className="bg-surface-dark dark:bg-surface-light border-border">
          <CardHeader className="p-4 relative">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <CardTitle>Danh mục loại phương tiện</CardTitle>
              <Button
                variant="primary"
                className="gap-2 absolute right-4 top-1/2 -translate-y-1/2"
                onClick={handleOpenCreateVehicleType}
              >
                <span className="material-symbols-outlined text-lg">add</span>
                Thêm loại phương tiện mới
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {vehicleTypes.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border bg-muted/10 p-4 text-sm text-muted-foreground">
                Chưa có loại phương tiện nào.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tên loại xe</TableHead>
                    <TableHead>Sức chứa mặc định</TableHead>
                    <TableHead>Mô tả</TableHead>
                    <TableHead className="text-right">Thao tác</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vehicleTypes.map((type) => (
                    <TableRow key={type.id}>
                      <TableCell className="font-medium text-foreground">{type.typeName}</TableCell>
                      <TableCell>
                        <span className="text-foreground text-sm">
                          {formatNumberVN(type.defaultCapacity)}{' '}
                          <span className="text-[10px] text-muted-foreground uppercase">kg</span>
                        </span>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {type.description || '—'}
                      </TableCell>
                      <TableCell className="text-right space-x-2 flex items-center justify-end">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <span className="material-symbols-outlined">more_vert</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              className="gap-2 text-primary"
                              onClick={() => handleOpenEditVehicleType(type)}
                            >
                              <span className="material-symbols-outlined text-primary text-lg">
                                edit
                              </span>
                              Chỉnh sửa thông tin
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="gap-2 text-destructive"
                              onClick={() => deleteVehicleType(type.id)}
                            >
                              <span className="material-symbols-outlined text-lg">delete</span>
                              Xóa loại phương tiện
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
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
                Cập nhật thông tin phương tiện điều phối theo chuẩn quản lý của manager.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="grid gap-2">
                <label className="text-sm font-medium text-foreground">Biển số xe</label>
                <Input
                  placeholder="Ví dụ: 51A-12345"
                  value={vehicleForm.licensePlate}
                  onChange={(e) =>
                    setVehicleForm((prev) => ({ ...prev, licensePlate: e.target.value }))
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
                <label className="text-sm font-medium text-foreground">Đội sử dụng</label>
                <Input
                  placeholder="Ví dụ: Đội vận chuyển miền Trung"
                  value={vehicleForm.teamUsed}
                  onChange={(e) =>
                    setVehicleForm((prev) => ({ ...prev, teamUsed: e.target.value }))
                  }
                />
              </div>

              {!vehicleForm.vehicleId && (
                <div className="rounded-xl border border-border bg-muted/10 p-4 text-sm text-muted-foreground">
                  Sau khi tạo xong, bạn có thể cập nhật trạng thái phương tiện tại cùng form chỉnh
                  sửa này.
                </div>
              )}

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
                      <SelectItem value="0">Sẵn sàng</SelectItem>
                      <SelectItem value="1">Đang sử dụng</SelectItem>
                      <SelectItem value="2">Bảo trì</SelectItem>
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

        <Dialog open={openVehicleTypeModal} onOpenChange={setOpenVehicleTypeModal}>
          <DialogContent className="sm:max-w-[560px]">
            <DialogHeader>
              <DialogTitle>
                {vehicleTypeForm.id ? 'Chỉnh sửa loại phương tiện' : 'Thêm loại phương tiện mới'}
              </DialogTitle>
              <DialogDescription>
                Quản lý danh mục loại xe để tạo phương tiện chuẩn xác hơn.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="grid gap-2">
                <label className="text-sm font-medium text-foreground">Tên loại xe</label>
                <Input
                  placeholder="Ví dụ: Xe tải 2 tấn"
                  value={vehicleTypeForm.typeName}
                  onChange={(e) =>
                    setVehicleTypeForm((prev) => ({ ...prev, typeName: e.target.value }))
                  }
                />
              </div>

              <div className="grid gap-2">
                <label className="text-sm font-medium text-foreground">Sức chứa mặc định</label>
                <Input
                  type="number"
                  min={0}
                  value={vehicleTypeForm.defaultCapacity}
                  onChange={(e) =>
                    setVehicleTypeForm((prev) => ({
                      ...prev,
                      defaultCapacity: Number(e.target.value),
                    }))
                  }
                />
              </div>

              <div className="grid gap-2">
                <label className="text-sm font-medium text-foreground">Mô tả</label>
                <Input
                  placeholder="Ví dụ: Phù hợp chở lương thực, nước uống"
                  value={vehicleTypeForm.description}
                  onChange={(e) =>
                    setVehicleTypeForm((prev) => ({ ...prev, description: e.target.value }))
                  }
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setOpenVehicleTypeModal(false)}>
                Hủy
              </Button>
              <Button
                onClick={handleSaveVehicleType}
                disabled={createTypeStatus === 'pending' || updateTypeStatus === 'pending'}
              >
                <span className="material-symbols-outlined text-sm mr-1">save</span>
                {createTypeStatus === 'pending' || updateTypeStatus === 'pending'
                  ? 'Đang lưu...'
                  : 'Lưu loại xe'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
