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
import {
  useProvincialStations,
  useCreateProvincialStation,
  useDisableProvincialStation,
  useActivateProvincialStation,
  useAssignModeratorToStation,
} from '@/hooks/useReliefStations';
import { useModerators } from '@/hooks/useUsers';
import { AddStationModal, type CreateStationFormData } from './components/AddStationModal';
import { toast } from 'sonner';
import {
  ReliefStationStatus,
  ReliefStationStatusLabel,
  getReliefStationStatusClass,
} from '@/enums/beEnums';
import { managerNavItems, managerProjects } from './components/sidebarConfig';

const getStationId = (station: {
  id?: string | null;
  stationId?: string | null;
  reliefStationId?: string | null;
}) => {
  const rawId = station.reliefStationId ?? station.stationId ?? station.id;
  return typeof rawId === 'string' && rawId.trim().length > 0 ? rawId : null;
};

const getStationRowKey = (
  station: { name?: string | null; address?: string | null },
  index: number,
  stationId: string | null,
) => stationId ?? `${station.name ?? 'station'}-${station.address ?? 'unknown'}-${index}`;

const getStationBadgeVariant = (status: number): 'success' | 'outline' | 'destructive' => {
  switch (status) {
    case ReliefStationStatus.Active:
      return 'success';
    case ReliefStationStatus.Closed:
      return 'destructive';
    default:
      return 'outline';
  }
};

export default function ManagerStationPage() {
  const [pageIndex, setPageIndex] = useState(1);
  const [pageSize] = useState(10);
  const [search, setSearch] = useState('');
  const [openAddModal, setOpenAddModal] = useState(false);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [selectedModeratorId, setSelectedModeratorId] = useState<string>('');
  const [selectedStation, setSelectedStation] = useState<{ id: string | null; name: string }>({
    id: null,
    name: '',
  });

  const { data: stationsResponse, isLoading } = useProvincialStations({
    pageIndex,
    pageSize,
    search: search || undefined,
  });
  const {
    moderators,
    isLoading: isLoadingModerators,
    pagination: moderatorsPagination,
  } = useModerators({
    pageIndex: 1,
    pageSize: 100,
    isBanned: false,
  });

  const { mutateAsync: createStation } = useCreateProvincialStation();
  const { mutateAsync: disableStation } = useDisableProvincialStation();
  const { mutateAsync: activateStation } = useActivateProvincialStation();
  const { mutateAsync: assignModerator, status: assignModeratorStatus } =
    useAssignModeratorToStation();

  const handleCreateStation = async (data: CreateStationFormData) => {
    try {
      await createStation(data);
      setOpenAddModal(false);
    } catch (error) {
      console.error(error);
    }
  };

  const handleDisable = async (id: string) => {
    if (!id) {
      toast.error('Không tìm thấy mã trạm để vô hiệu hoá.');
      return;
    }
    await disableStation(id);
  };

  const handleActivate = async (id: string) => {
    if (!id) {
      toast.error('Không tìm thấy mã trạm để kích hoạt.');
      return;
    }
    await activateStation(id);
  };

  const openAssignModeratorModal = (station: {
    id?: string;
    stationId?: string;
    reliefStationId?: string;
    name: string;
    level?: number;
  }) => {
    const stationId = getStationId(station);

    if (!stationId) {
      toast.error('Trạm này chưa có mã định danh hợp lệ để gán quản lý.');
      return;
    }

    if (station.level === 1) {
      toast.error('Trạm cấp 1 do manager quản lý rồi, không được gán điều phối viên.');
      return;
    }

    setSelectedStation({ id: stationId, name: station.name });
    setSelectedModeratorId('');
    setAssignModalOpen(true);
  };

  const handleAssignModerator = async () => {
    if (!selectedStation.id) {
      toast.error('Không tìm thấy mã trạm để gán quản lý.');
      return;
    }

    if (!selectedModeratorId) {
      toast.error('Vui lòng chọn một điều phối viên.');
      return;
    }

    try {
      await assignModerator({
        stationId: selectedStation.id,
        data: {
          moderatorUserId: selectedModeratorId,
          isStationHead: true,
          status: 1,
          reason: '',
        },
      });
      setAssignModalOpen(false);
    } catch {
      // handled by hook toast
    }
  };

  const stations = stationsResponse?.items || [];
  const pagination = stationsResponse;

  return (
    <DashboardLayout projects={managerProjects} navItems={managerNavItems}>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-primary">Quản lý trạm cứu trợ</h1>
            <p className="text-muted-foreground dark:text-muted-foreground">
              Phân bổ điều phối viên vào các trạm, quản lý hoạt động toàn cục.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              size="lg"
              className="bg-primary text-white gap-2 font-bold rounded-full"
              onClick={() => setOpenAddModal(true)}
            >
              <span className="material-symbols-outlined text-lg">add</span>
              Thêm trạm mới
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
                placeholder="Tìm kiếm trạm theo tên, địa chỉ..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPageIndex(1);
                }}
              />
            </div>
          </div>

          <CardHeader>
            <CardTitle>Danh sách các trạm cứu trợ</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              {isLoading ? (
                <div className="flex items-center justify-center py-16">
                  <div className="flex flex-col items-center gap-3">
                    <span className="material-symbols-outlined text-4xl text-primary animate-spin">
                      progress_activity
                    </span>
                    <p className="text-muted-foreground text-sm">Đang tải danh sách trạm...</p>
                  </div>
                </div>
              ) : stations.length === 0 ? (
                <div className="flex items-center justify-center py-16">
                  <div className="flex flex-col items-center gap-3">
                    <span className="material-symbols-outlined text-4xl text-muted-foreground">
                      storefront
                    </span>
                    <p className="text-muted-foreground text-sm">Không tìm thấy trạm nào</p>
                  </div>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tên trạm</TableHead>
                      <TableHead>Địa chỉ</TableHead>
                      <TableHead>Liên hệ</TableHead>
                      <TableHead>Trạng thái</TableHead>
                      <TableHead className="text-right">Thao tác</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stations.map((station, index) => {
                      const sid = getStationId(station);
                      const statusClass = getReliefStationStatusClass(station.status);
                      const statusLabel =
                        ReliefStationStatusLabel[station.status as ReliefStationStatus] ??
                        'Không rõ';
                      return (
                        <TableRow
                          key={getStationRowKey(station, index, sid)}
                          className="group hover:bg-card/50 transition-colors"
                        >
                          <TableCell>
                            <p className="font-bold text-foreground text-sm">{station.name}</p>
                            <p className="text-xs text-muted-foreground font-mono">
                              ID: {sid ? sid.slice(0, 8) + '...' : '—'}
                            </p>
                          </TableCell>
                          <TableCell>
                            <span
                              className="text-foreground text-sm max-w-[200px] truncate inline-block"
                              title={station.address}
                            >
                              {station.address}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className="text-foreground text-sm">{station.contactNumber}</span>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={getStationBadgeVariant(station.status)}
                              appearance="outline"
                              size="sm"
                              className={`gap-1 border ${statusClass}`}
                            >
                              <span className="material-symbols-outlined text-xs">
                                {station.status === ReliefStationStatus.Active
                                  ? 'check_circle'
                                  : station.status === ReliefStationStatus.Closed
                                    ? 'cancel'
                                    : 'pause_circle'}
                              </span>
                              {statusLabel}
                            </Badge>
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
                                  <span className="material-symbols-outlined text-lg">edit</span>
                                  Chỉnh sửa
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="gap-2 text-primary"
                                  onClick={() => {
                                    if (station.level === 1) {
                                      toast.error(
                                        'Trạm cấp 1 do manager quản lý rồi, không được gán điều phối viên.',
                                      );
                                      return;
                                    }
                                    openAssignModeratorModal(station);
                                  }}
                                  disabled={station.level === 1}
                                >
                                  <span className="material-symbols-outlined text-lg">
                                    group_add
                                  </span>
                                  Gán điều phối viên
                                </DropdownMenuItem>
                                {station.status === ReliefStationStatus.Active ? (
                                  <DropdownMenuItem
                                    className="gap-2 text-destructive"
                                    onClick={() =>
                                      sid
                                        ? handleDisable(sid)
                                        : toast.error('Không tìm thấy mã trạm để vô hiệu hoá.')
                                    }
                                  >
                                    <span className="material-symbols-outlined text-lg">block</span>
                                    Vô hiệu hóa trạm
                                  </DropdownMenuItem>
                                ) : (
                                  <DropdownMenuItem
                                    className="gap-2 text-green-500"
                                    onClick={() =>
                                      sid
                                        ? handleActivate(sid)
                                        : toast.error('Không tìm thấy mã trạm để kích hoạt.')
                                    }
                                  >
                                    <span className="material-symbols-outlined text-lg">
                                      check_circle
                                    </span>
                                    Kích hoạt trạm
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </div>

            {/* Pagination Controls */}
            {pagination && pagination.totalCount > 0 && pagination.totalCount > pageSize && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-border mt-auto">
                <p className="text-sm text-muted-foreground">
                  Trang {pagination.pageIndex} — Tổng {pagination.totalCount} trạm
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={pagination.pageIndex === 1}
                    onClick={() => setPageIndex((prev) => Math.max(1, prev - 1))}
                    className="gap-1"
                  >
                    <span className="material-symbols-outlined text-sm">chevron_left</span>
                    Trước
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={pagination.items.length < pageSize}
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
      </div>

      <AddStationModal
        open={openAddModal}
        onClose={() => setOpenAddModal(false)}
        onSubmit={handleCreateStation}
      />

      <Dialog open={assignModalOpen} onOpenChange={setAssignModalOpen}>
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle>Gán điều phối viên cho trạm</DialogTitle>
            <DialogDescription>
              Chọn điều phối viên từ danh sách moderator hiện có để gán cho trạm.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-xl border border-border bg-muted/30 p-4">
              <p className="text-xs uppercase font-semibold text-muted-foreground">
                Trạm được chọn
              </p>
              <p className="mt-1 text-sm font-semibold text-foreground">
                {selectedStation.name || '—'}
              </p>
              <p className="text-xs text-muted-foreground">
                Mã trạm: {selectedStation.id || 'Chưa có'}
              </p>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-semibold text-foreground">Chọn điều phối viên</p>
              {isLoadingModerators ? (
                <div className="rounded-xl border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
                  Đang tải danh sách điều phối viên...
                </div>
              ) : moderators.length === 0 ? (
                <div className="rounded-xl border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
                  Không có moderator phù hợp để gán.
                </div>
              ) : (
                <div className="grid gap-3">
                  {moderators.map((moderator) => {
                    const isActive = selectedModeratorId === moderator.id;
                    const isManagingStation = moderator.isManagingStation;

                    return (
                      <button
                        key={moderator.id}
                        type="button"
                        onClick={() => setSelectedModeratorId(moderator.id)}
                        disabled={isManagingStation}
                        className={`rounded-xl border p-4 text-left transition-colors ${
                          isActive
                            ? 'border-primary bg-primary/5 ring-1 ring-primary/30'
                            : isManagingStation
                              ? 'border-border bg-muted/40 opacity-60 cursor-not-allowed'
                              : 'border-border bg-background hover:border-primary/40'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-semibold text-foreground">
                              {moderator.displayName || 'Chưa có tên hiển thị'}
                            </p>
                            <p className="text-sm text-muted-foreground">{moderator.email}</p>
                            <p className="text-sm text-muted-foreground">
                              {moderator.phoneNumber || 'Chưa có số điện thoại'}
                            </p>
                            {isManagingStation && (
                              <p className="mt-1 text-xs font-medium text-amber-600">
                                Đang quản lý một trạm khác
                              </p>
                            )}
                          </div>
                          {isActive && (
                            <span className="material-symbols-outlined text-primary">
                              check_circle
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
              {!!moderatorsPagination && moderatorsPagination.totalCount > moderators.length && (
                <p className="text-xs text-muted-foreground">
                  Đang hiển thị {moderators.length}/{moderatorsPagination.totalCount} moderator đầu
                  tiên.
                </p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignModalOpen(false)}>
              Hủy
            </Button>
            <Button
              onClick={handleAssignModerator}
              disabled={assignModeratorStatus === 'pending' || !selectedStation.id}
            >
              {assignModeratorStatus === 'pending' ? 'Đang gán...' : 'Gán quản lý'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
