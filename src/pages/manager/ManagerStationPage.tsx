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
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
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
  useUpdateProvincialStation,
  useDisableProvincialStation,
  useActivateProvincialStation,
  useAssignModeratorToStation,
} from '@/hooks/useReliefStations';
import { useModerators } from '@/hooks/useUsers';
import { useAllUsers } from '@/hooks/useUsers';
import { AddStationModal, type CreateStationFormData } from './components/AddStationModal';
import { EditStationModal, type EditStationFormData } from './components/EditStationModal';
import { toast } from 'sonner';
import {
  ReliefStationStatus,
  ReliefStationStatusLabel,
  getReliefStationStatusClass,
} from '@/enums/beEnums';
import { managerNavGroups } from './components/sidebarConfig';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import goongjs from '@goongmaps/goong-js';
import { useGoongMap } from '@/hooks/useGoongMap';

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

const hasValidCoordinates = (latitude?: number | null, longitude?: number | null) => {
  if (typeof latitude !== 'number' || typeof longitude !== 'number') return false;
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return false;
  return !(latitude === 0 && longitude === 0);
};

function StationMapPreview({
  latitude,
  longitude,
  stationName,
  heightClass = 'h-[320px]',
}: {
  latitude?: number | null;
  longitude?: number | null;
  stationName?: string | null;
  heightClass?: string;
}) {
  const canShowMap = hasValidCoordinates(latitude ?? null, longitude ?? null);

  const {
    mapRef,
    isLoading: isLoadingMap,
    error: mapError,
  } = useGoongMap({
    center: canShowMap
      ? { lat: Number(latitude), lng: Number(longitude) }
      : { lat: 10.7769, lng: 106.7009 },
    zoom: canShowMap ? 14 : 6,
    apiKey: import.meta.env.VITE_GOONG_MAP_KEY || '',
    enabled: canShowMap,
    onMapLoad: (map) => {
      if (!canShowMap) return;

      new goongjs.Marker({ color: '#ef4444' })
        .setLngLat([Number(longitude), Number(latitude)])
        .addTo(map);

      (map as any).flyTo({
        center: [Number(longitude), Number(latitude)],
        zoom: 14,
        speed: 1.05,
      });
    },
  });

  if (!canShowMap) {
    return (
      <div
        className={`${heightClass} rounded-2xl border border-dashed border-border bg-muted/20 flex flex-col items-center justify-center text-center px-6`}
      >
        <span className="material-symbols-outlined text-4xl text-muted-foreground">
          location_off
        </span>
        <p className="mt-3 font-semibold text-foreground">Chưa có tọa độ bản đồ</p>
        <p className="mt-1 text-sm text-muted-foreground max-w-sm">
          {stationName
            ? `${stationName} chưa có dữ liệu vị trí hợp lệ để hiển thị trên bản đồ.`
            : 'Trạm chưa có dữ liệu vị trí hợp lệ để hiển thị trên bản đồ.'}
        </p>
      </div>
    );
  }

  return (
    <div
      className={`${heightClass} rounded-2xl border border-border overflow-hidden bg-muted/20 relative`}
    >
      <div ref={mapRef} className="h-full w-full" />

      {isLoadingMap && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/75 backdrop-blur-[1px] text-sm text-muted-foreground">
          Đang tải bản đồ trạm...
        </div>
      )}

      {mapError && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/85 text-sm text-destructive px-6 text-center">
          {mapError}
        </div>
      )}
    </div>
  );
}

export default function ManagerStationPage() {
  const [pageIndex, setPageIndex] = useState(1);
  const [pageSize] = useState(10);
  const [search, setSearch] = useState('');
  const [openAddModal, setOpenAddModal] = useState(false);
  const [openEditModal, setOpenEditModal] = useState(false);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [selectedModeratorId, setSelectedModeratorId] = useState<string>('');
  const [moderatorPageIndex, setModeratorPageIndex] = useState(1);
  const [editingStation, setEditingStation] = useState<{
    id: string | null;
    name: string;
    address: string;
    contactNumber: string;
    longitude: number;
    latitude: number;
    coverageRadiusKm: number;
  } | null>(null);
  const [viewingStation, setViewingStation] = useState<{
    id: string | null;
    name: string;
    address: string;
    contactNumber: string;
    longitude: number;
    latitude: number;
    coverageRadiusKm: number;
    locationId?: string | null;
    locationName?: string | null;
    status?: number;
    moderatorName?: string | null;
    moderatorUserId?: string | null;
  } | null>(null);
  const [openViewModal, setOpenViewModal] = useState(false);
  const [openMapModal, setOpenMapModal] = useState(false);
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
    refetch: refetchModerators,
  } = useModerators({
    pageIndex: moderatorPageIndex,
    pageSize: 5,
    isBanned: false,
  });
  const { users } = useAllUsers({ pageIndex: 1, pageSize: 500 });

  const { mutateAsync: createStation } = useCreateProvincialStation();
  const { mutateAsync: updateStation } = useUpdateProvincialStation();
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

  const openEditStationModal = (station: any) => {
    const stationId = getStationId(station);

    if (!stationId) {
      toast.error('Không tìm thấy mã trạm để chỉnh sửa.');
      return;
    }

    setEditingStation({
      id: stationId,
      name: station.name || '',
      address: station.address || '',
      contactNumber: station.contactNumber || '',
      longitude: Number(station.longitude || 0),
      latitude: Number(station.latitude || 0),
      coverageRadiusKm: Number(station.coverageRadiusKm || 1),
    });
    setOpenEditModal(true);
  };

  const openStationMapModal = (station: any) => {
    const stationId = getStationId(station);

    setViewingStation({
      id: stationId,
      name: station.name || '',
      address: station.address || '',
      contactNumber: station.contactNumber || '',
      longitude: Number(station.longitude || 0),
      latitude: Number(station.latitude || 0),
      coverageRadiusKm: Number(station.coverageRadiusKm || 0),
      locationId: station.locationId || null,
      locationName: station.locationName || null,
      status: station.status,
      moderatorName: station.moderatorName || null,
      moderatorUserId: station.moderatorUserId || null,
    });
    setOpenMapModal(true);
  };

  const handleUpdateStation = async (data: EditStationFormData) => {
    if (!editingStation?.id) {
      toast.error('Không tìm thấy mã trạm để cập nhật.');
      return;
    }

    await updateStation({
      stationId: editingStation.id,
      data,
    });

    setOpenEditModal(false);
    setEditingStation(null);
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

    setSelectedStation({ id: stationId, name: station.name });
    setSelectedModeratorId('');
    setModeratorPageIndex(1);
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
      // Refresh moderator list to reflect the latest assignment status.
      await refetchModerators();
      setAssignModalOpen(false);
    } catch {
      // handled by hook toast
    }
  };

  const assignedModeratorProfile = viewingStation?.moderatorUserId
    ? users.find((user) => user.id === viewingStation.moderatorUserId)
    : null;

  const stations = stationsResponse?.items || [];
  const pagination = stationsResponse;

  return (
    <DashboardLayout navGroups={managerNavGroups}>
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
                      <TableHead>Bán kính</TableHead>
                      <TableHead>Điều phối viên</TableHead>
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
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span
                                  className="text-foreground text-sm max-w-[200px] truncate inline-block"
                                  title={station.address}
                                >
                                  {station.address}
                                </span>
                              </TooltipTrigger>
                              <TooltipContent>{station.address}</TooltipContent>
                            </Tooltip>
                          </TableCell>
                          <TableCell>
                            <span className="text-foreground text-sm">{station.contactNumber}</span>
                          </TableCell>
                          <TableCell>
                            <span className="text-foreground text-sm">
                              {station.coverageRadiusKm ? `${station.coverageRadiusKm} km` : '—'}
                            </span>
                          </TableCell>
                          <TableCell>
                            {station.moderatorName ? (
                              <Badge
                                variant="info"
                                appearance="outline"
                                size="sm"
                                className="gap-1"
                              >
                                <span className="material-symbols-outlined text-xs">person</span>
                                {station.moderatorName}
                              </Badge>
                            ) : (
                              <span className="text-xs text-muted-foreground">Chưa gán</span>
                            )}
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
                                <DropdownMenuItem
                                  className="gap-2 text-primary"
                                  onClick={() => openStationMapModal(station)}
                                >
                                  <span className="material-symbols-outlined text-lg">map</span>
                                  Xem thông tin trên bản đồ
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="gap-2 text-orange-500"
                                  onClick={() => openEditStationModal(station)}
                                >
                                  <span className="material-symbols-outlined text-lg">edit</span>
                                  Chỉnh sửa
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="gap-2 text-primary"
                                  onClick={() => {
                                    openAssignModeratorModal(station);
                                  }}
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

      <EditStationModal
        open={openEditModal}
        onClose={() => {
          setOpenEditModal(false);
          setEditingStation(null);
        }}
        onSubmit={handleUpdateStation}
        initialData={editingStation}
      />

      <Dialog
        open={openViewModal}
        onOpenChange={(open) => {
          setOpenViewModal(open);
          if (!open) setViewingStation(null);
        }}
      >
        <DialogContent className="w-[95vw] max-w-5xl max-h-[90vh] overflow-hidden p-0 flex flex-col">
          <DialogHeader className="px-6 pt-6 pb-4 border-b border-border bg-gradient-to-r from-primary/10 via-sky-500/5 to-emerald-500/10">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0">
                <div className="flex items-center gap-3">
                  <div className="size-12 rounded-2xl bg-primary/15 text-primary flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-[24px]">storefront</span>
                  </div>
                  <div className="min-w-0">
                    <DialogTitle className="text-xl truncate">
                      {viewingStation?.name || 'Thông tin trạm cứu trợ'}
                    </DialogTitle>
                    <DialogDescription className="mt-1">
                      Mã trạm: {viewingStation?.id || '—'}
                    </DialogDescription>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Badge
                  variant={getStationBadgeVariant(Number(viewingStation?.status || 0))}
                  appearance="outline"
                  size="sm"
                  className={`gap-1 border ${getReliefStationStatusClass(Number(viewingStation?.status || 0))}`}
                >
                  <span className="material-symbols-outlined text-xs">
                    {Number(viewingStation?.status || 0) === ReliefStationStatus.Active
                      ? 'check_circle'
                      : Number(viewingStation?.status || 0) === ReliefStationStatus.Closed
                        ? 'cancel'
                        : 'pause_circle'}
                  </span>
                  {ReliefStationStatusLabel[
                    Number(viewingStation?.status || 0) as ReliefStationStatus
                  ] || 'Không rõ'}
                </Badge>
                <Badge variant="info" appearance="outline" size="sm" className="gap-1">
                  <span className="material-symbols-outlined text-xs">location_city</span>
                  {viewingStation?.locationName || 'Chưa có khu vực'}
                </Badge>
                <Badge variant="success" appearance="outline" size="sm" className="gap-1">
                  <span className="material-symbols-outlined text-xs">radius</span>
                  {typeof viewingStation?.coverageRadiusKm === 'number'
                    ? `${viewingStation.coverageRadiusKm} km`
                    : '—'}
                </Badge>
              </div>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-6 py-5">
            <div className="grid grid-cols-1 lg:grid-cols-[1.05fr_0.95fr] gap-6">
              <div className="space-y-6">
                <Card className="border-border bg-card">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <span className="material-symbols-outlined text-primary">info</span>
                      Tổng quan trạm
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-2">
                      <p className="text-xs uppercase font-semibold text-muted-foreground">
                        Tên trạm
                      </p>
                      <p className="font-semibold text-foreground">{viewingStation?.name || '—'}</p>
                    </div>
                    <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-2">
                      <p className="text-xs uppercase font-semibold text-muted-foreground">
                        Mã trạm
                      </p>
                      <p className="font-mono text-sm text-foreground break-all">
                        {viewingStation?.id || '—'}
                      </p>
                    </div>
                    <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-2 md:col-span-2">
                      <p className="text-xs uppercase font-semibold text-muted-foreground">
                        Địa chỉ
                      </p>
                      <p className="text-foreground leading-6">{viewingStation?.address || '—'}</p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-border bg-card">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <span className="material-symbols-outlined text-sky-600">call</span>
                      Liên hệ & phạm vi hoạt động
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-2">
                      <p className="text-xs uppercase font-semibold text-muted-foreground">
                        Số điện thoại
                      </p>
                      <p className="text-foreground">{viewingStation?.contactNumber || '—'}</p>
                    </div>
                    <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-2">
                      <p className="text-xs uppercase font-semibold text-muted-foreground">
                        Khu vực
                      </p>
                      <p className="text-foreground">{viewingStation?.locationName || '—'}</p>
                    </div>
                    <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-2">
                      <p className="text-xs uppercase font-semibold text-muted-foreground">
                        Bán kính bao phủ
                      </p>
                      <p className="text-foreground">
                        {typeof viewingStation?.coverageRadiusKm === 'number'
                          ? `${viewingStation.coverageRadiusKm} km`
                          : '—'}
                      </p>
                    </div>
                    <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-2">
                      <p className="text-xs uppercase font-semibold text-muted-foreground">
                        Trạng thái
                      </p>
                      <Badge
                        variant={getStationBadgeVariant(Number(viewingStation?.status || 0))}
                        appearance="outline"
                        size="sm"
                        className={`gap-1 border ${getReliefStationStatusClass(Number(viewingStation?.status || 0))}`}
                      >
                        {ReliefStationStatusLabel[
                          Number(viewingStation?.status || 0) as ReliefStationStatus
                        ] || 'Không rõ'}
                      </Badge>
                    </div>
                    <div className="rounded-xl border border-primary/35 bg-primary/5 p-4 space-y-2">
                      <p className="text-xs uppercase font-semibold text-muted-foreground">
                        Điều phối viên phụ trách
                      </p>
                      {viewingStation?.moderatorName ? (
                        <Badge variant="info" size="sm" className="gap-1.5 font-semibold">
                          <span className="material-symbols-outlined text-xs">verified_user</span>
                          {viewingStation.moderatorName}
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          size="sm"
                          className="gap-1.5 text-amber-700 border-amber-300"
                        >
                          <span className="material-symbols-outlined text-xs">person_off</span>
                          Chưa gán điều phối viên
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-border bg-card">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <span className="material-symbols-outlined text-amber-600">pin_drop</span>
                      Tọa độ vị trí
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-2">
                      <p className="text-xs uppercase font-semibold text-muted-foreground">Vĩ độ</p>
                      <p className="font-mono text-sm text-foreground">
                        {hasValidCoordinates(viewingStation?.latitude, viewingStation?.longitude)
                          ? Number(viewingStation?.latitude).toFixed(6)
                          : 'Chưa cập nhật'}
                      </p>
                    </div>
                    <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-2">
                      <p className="text-xs uppercase font-semibold text-muted-foreground">
                        Kinh độ
                      </p>
                      <p className="font-mono text-sm text-foreground">
                        {hasValidCoordinates(viewingStation?.latitude, viewingStation?.longitude)
                          ? Number(viewingStation?.longitude).toFixed(6)
                          : 'Chưa cập nhật'}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-6">
                <Card className="border-border bg-card overflow-hidden">
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <span className="material-symbols-outlined text-emerald-600">map</span>
                      Vị trí trên bản đồ
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <StationMapPreview
                      latitude={viewingStation?.latitude}
                      longitude={viewingStation?.longitude}
                      stationName={viewingStation?.name}
                      heightClass="h-[340px]"
                    />

                    <div className="rounded-xl border border-border bg-muted/20 p-4">
                      <p className="text-sm font-medium text-foreground">Gợi ý sử dụng</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Dùng chế độ xem bản đồ lớn để kiểm tra chính xác vị trí trạm và đối chiếu
                        khu vực phụ trách.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>

          <DialogFooter className="px-6 py-4 border-t border-border bg-background shrink-0">
            <Button
              variant="primary"
              onClick={() => {
                setOpenViewModal(false);
                setOpenMapModal(true);
              }}
              disabled={!hasValidCoordinates(viewingStation?.latitude, viewingStation?.longitude)}
            >
              <span className="material-symbols-outlined text-lg">map</span>
              Xem trên bản đồ
            </Button>
            <Button variant="outline" onClick={() => setOpenViewModal(false)}>
              Đóng
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Sheet
        open={openMapModal}
        onOpenChange={(open) => {
          setOpenMapModal(open);
          if (!open) {
            setOpenViewModal(false);
            setViewingStation(null);
          }
        }}
      >
        <SheetContent side="right" className="w-full sm:max-w-[96vw] p-0 overflow-hidden">
          <div className="h-full min-h-0 grid grid-cols-1 lg:grid-cols-[minmax(0,1.65fr)_420px] xl:grid-cols-[minmax(0,1.8fr)_460px]">
            <div className="relative min-h-[45vh] lg:min-h-0 border-b lg:border-b-0 lg:border-r border-border bg-background p-4 lg:p-5">
              <div className="absolute left-8 top-8 z-10 max-w-[calc(100%-4rem)] rounded-2xl border border-border bg-background/92 backdrop-blur-md shadow-xl px-4 py-3">
                <div className="flex flex-wrap items-start gap-3 justify-between">
                  <div className="min-w-0">
                    <p className="text-lg font-bold text-foreground truncate">
                      {viewingStation?.name || 'Trạm cứu trợ'}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1 break-all">
                      Mã trạm: {viewingStation?.id || '—'}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge
                      variant={getStationBadgeVariant(Number(viewingStation?.status || 0))}
                      appearance="outline"
                      size="sm"
                      className={`gap-1 border ${getReliefStationStatusClass(Number(viewingStation?.status || 0))}`}
                    >
                      {ReliefStationStatusLabel[
                        Number(viewingStation?.status || 0) as ReliefStationStatus
                      ] || 'Không rõ'}
                    </Badge>
                    <Badge variant="info" appearance="outline" size="sm" className="gap-1">
                      <span className="material-symbols-outlined text-xs">location_city</span>
                      {viewingStation?.locationName || 'Chưa có khu vực'}
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="absolute right-8 bottom-8 z-10 rounded-2xl border border-border bg-background/92 backdrop-blur-md shadow-xl px-4 py-3 max-w-[320px]">
                <p className="text-xs uppercase font-semibold text-muted-foreground">
                  Tổng quan nhanh
                </p>
                <div className="mt-2 space-y-1.5 text-sm">
                  <p className="text-foreground">
                    <span className="text-muted-foreground">Liên hệ:</span>{' '}
                    {viewingStation?.contactNumber || '—'}
                  </p>
                  <p className="text-foreground">
                    <span className="text-muted-foreground">Bán kính:</span>{' '}
                    {typeof viewingStation?.coverageRadiusKm === 'number'
                      ? `${viewingStation.coverageRadiusKm} km`
                      : '—'}
                  </p>
                  <p className="text-foreground font-mono text-xs break-all">
                    {hasValidCoordinates(viewingStation?.latitude, viewingStation?.longitude)
                      ? `${Number(viewingStation?.latitude).toFixed(6)}, ${Number(viewingStation?.longitude).toFixed(6)}`
                      : 'Chưa có tọa độ'}
                  </p>
                </div>
              </div>

              <StationMapPreview
                latitude={viewingStation?.latitude}
                longitude={viewingStation?.longitude}
                stationName={viewingStation?.name}
                heightClass="h-full min-h-[420px] lg:min-h-0"
              />
            </div>

            <div className="min-h-0 flex flex-col bg-card">
              <SheetHeader className="px-6 py-5 border-b border-border">
                <SheetTitle>Thông tin đầy đủ của trạm</SheetTitle>
                <SheetDescription>
                  Xem tổng quát vị trí trên bản đồ và toàn bộ thông tin vận hành của trạm.
                </SheetDescription>
              </SheetHeader>

              <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
                <Card className="border-primary/45 bg-primary/5 shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <span className="material-symbols-outlined text-primary">verified_user</span>
                      Điều phối viên phụ trách
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {viewingStation?.moderatorName ? (
                      <div className="space-y-2">
                        <div className="text-sm text-foreground space-y-1">
                          <p>
                            <span className="text-muted-foreground">Họ và tên:</span>{' '}
                            {assignedModeratorProfile?.displayName || viewingStation.moderatorName}
                          </p>
                          <p>
                            <span className="text-muted-foreground">Email:</span>{' '}
                            {assignedModeratorProfile?.email || 'Chưa có'}
                          </p>
                          <p>
                            <span className="text-muted-foreground">Số điện thoại:</span>{' '}
                            {assignedModeratorProfile?.phoneNumber || 'Chưa có'}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <Badge
                        variant="outline"
                        size="sm"
                        className="gap-1.5 text-amber-700 border-amber-300 bg-amber-50"
                      >
                        <span className="material-symbols-outlined text-xs">person_off</span>
                        Chưa gán điều phối viên
                      </Badge>
                    )}
                  </CardContent>
                </Card>

                <Card className="border-border bg-card">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <span className="material-symbols-outlined text-primary">storefront</span>
                      Hồ sơ trạm
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-2">
                      <p className="text-xs uppercase font-semibold text-muted-foreground">
                        Tên trạm
                      </p>
                      <p className="font-semibold text-foreground">{viewingStation?.name || '—'}</p>
                    </div>
                    <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-2">
                      <p className="text-xs uppercase font-semibold text-muted-foreground">
                        Mã trạm
                      </p>
                      <p className="font-mono text-sm text-foreground break-all">
                        {viewingStation?.id || '—'}
                      </p>
                    </div>
                    <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-2">
                      <p className="text-xs uppercase font-semibold text-muted-foreground">
                        Khu vực
                      </p>
                      <p className="text-foreground">{viewingStation?.locationName || '—'}</p>
                    </div>
                    <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-2">
                      <p className="text-xs uppercase font-semibold text-muted-foreground">
                        Trạng thái
                      </p>
                      <Badge
                        variant={getStationBadgeVariant(Number(viewingStation?.status || 0))}
                        appearance="outline"
                        size="sm"
                        className={`gap-1 border ${getReliefStationStatusClass(Number(viewingStation?.status || 0))}`}
                      >
                        {ReliefStationStatusLabel[
                          Number(viewingStation?.status || 0) as ReliefStationStatus
                        ] || 'Không rõ'}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-border bg-card">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <span className="material-symbols-outlined text-sky-600">contact_phone</span>
                      Liên hệ và địa điểm
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-2">
                      <p className="text-xs uppercase font-semibold text-muted-foreground">
                        Số điện thoại
                      </p>
                      <p className="text-foreground">{viewingStation?.contactNumber || '—'}</p>
                    </div>
                    <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-2">
                      <p className="text-xs uppercase font-semibold text-muted-foreground">
                        Địa chỉ
                      </p>
                      <p className="text-foreground leading-6">{viewingStation?.address || '—'}</p>
                    </div>
                    <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-2">
                      <p className="text-xs uppercase font-semibold text-muted-foreground">
                        Bán kính bao phủ
                      </p>
                      <p className="text-foreground">
                        {typeof viewingStation?.coverageRadiusKm === 'number'
                          ? `${viewingStation.coverageRadiusKm} km`
                          : '—'}
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-border bg-card">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <span className="material-symbols-outlined text-amber-600">pin_drop</span>
                      Tọa độ trạm
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-2">
                      <p className="text-xs uppercase font-semibold text-muted-foreground">Vĩ độ</p>
                      <p className="font-mono text-sm text-foreground">
                        {hasValidCoordinates(viewingStation?.latitude, viewingStation?.longitude)
                          ? Number(viewingStation?.latitude).toFixed(6)
                          : 'Chưa cập nhật'}
                      </p>
                    </div>
                    <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-2">
                      <p className="text-xs uppercase font-semibold text-muted-foreground">
                        Kinh độ
                      </p>
                      <p className="font-mono text-sm text-foreground">
                        {hasValidCoordinates(viewingStation?.latitude, viewingStation?.longitude)
                          ? Number(viewingStation?.longitude).toFixed(6)
                          : 'Chưa cập nhật'}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <SheetFooter className="px-6 py-4 border-t border-border bg-background shrink-0">
                <Button variant="outline" onClick={() => setOpenMapModal(false)}>
                  Đóng
                </Button>
              </SheetFooter>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <Dialog open={assignModalOpen} onOpenChange={setAssignModalOpen}>
        <DialogContent className="sm:max-w-[1028px] max-h-[92vh] overflow-hidden p-0 flex flex-col">
          <DialogHeader className="px-6 py-4 border-b border-border">
            <DialogTitle>Gán điều phối viên cho trạm</DialogTitle>
            <DialogDescription>
              Chọn điều phối viên từ danh sách Điều phối viên hiện có để gán cho trạm.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 min-h-0 overflow-y-auto px-6 py-5 space-y-4">
            <div className="rounded-xl border border-border bg-muted/30 p-4">
              <p className="text-xs uppercase font-semibold text-muted-foreground flex items-center gap-1">
                <span className="material-symbols-outlined text-lg ">storefront</span>
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
                    const fallbackText = (moderator.displayName || moderator.email || '?')
                      .trim()
                      .slice(0, 1)
                      .toUpperCase();
                    const pictureUrl =
                      'pictureUrl' in moderator &&
                      typeof (moderator as { pictureUrl?: unknown }).pictureUrl === 'string'
                        ? (moderator as { pictureUrl: string }).pictureUrl || undefined
                        : undefined;

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
                          <div className="flex items-start gap-3 min-w-0">
                            <Avatar className="size-10 shrink-0">
                              <AvatarImage
                                src={pictureUrl}
                                alt={moderator.displayName || moderator.email || 'Moderator avatar'}
                              />
                              <AvatarFallback>{fallbackText}</AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <p className="font-semibold text-foreground">
                                {moderator.displayName || 'Chưa có tên hiển thị'}
                              </p>
                              <p className="text-sm text-muted-foreground truncate">
                                {moderator.email}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {moderator.phoneNumber || 'Chưa có số điện thoại'}
                              </p>
                              {isManagingStation && (
                                <p className="mt-1 text-xs font-medium text-amber-600">
                                  Đang quản lý một trạm khác
                                </p>
                              )}
                            </div>
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
              {!!moderatorsPagination && moderatorsPagination.totalCount > 0 && (
                <div className="flex items-center justify-between gap-3 pt-2">
                  <p className="text-xs text-muted-foreground">
                    Trang {moderatorsPagination.currentPage} / {moderatorsPagination.totalPages} •{' '}
                    Tổng {moderatorsPagination.totalCount} Điều phối viên
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={!moderatorsPagination.hasPrevious || isLoadingModerators}
                      onClick={() => setModeratorPageIndex((prev) => Math.max(1, prev - 1))}
                    >
                      Trước
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={!moderatorsPagination.hasNext || isLoadingModerators}
                      onClick={() =>
                        setModeratorPageIndex((prev) =>
                          Math.min(moderatorsPagination.totalPages, prev + 1),
                        )
                      }
                    >
                      Sau
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="px-6 py-4 border-t border-border bg-background">
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
