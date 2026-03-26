import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
} from '@/hooks/useReliefStations';
import { AddStationModal, type CreateStationFormData } from './components/AddStationModal';

export default function ManagerStationPage() {
  const [pageIndex, setPageIndex] = useState(1);
  const [pageSize] = useState(10);
  const [search, setSearch] = useState('');
  const [openAddModal, setOpenAddModal] = useState(false);

  const { data: stationsResponse, isLoading } = useProvincialStations({
    pageIndex,
    pageSize,
    search: search || undefined,
  });

  const { mutateAsync: createStation } = useCreateProvincialStation();
  const { mutateAsync: disableStation } = useDisableProvincialStation();
  const { mutateAsync: activateStation } = useActivateProvincialStation();

  const handleCreateStation = async (data: CreateStationFormData) => {
    try {
      await createStation(data);
      setOpenAddModal(false);
    } catch (error) {
      console.error(error);
    }
  };

  const handleDisable = async (id: string) => {
    await disableStation(id);
  };

  const handleActivate = async (id: string) => {
    await activateStation(id);
  };

  const stations = stationsResponse?.items || [];
  const pagination = stationsResponse;

  return (
    <DashboardLayout
      projects={[
        { label: 'Chiến dịch', path: '/portal/manager/campaigns', icon: 'campaign' },
        { label: 'Kho Tổng', path: '/portal/manager/inventory', icon: 'inventory_2' },
        { label: 'Trạm Cứu Trợ', path: '/portal/manager/stations', icon: 'home_work' },
        { label: 'Phương Tiện', path: '/portal/manager/vehicles', icon: 'local_shipping' },
      ]}
      navItems={[]}
    >
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
                    {stations.map((station) => (
                      <TableRow
                        key={station.id}
                        className="group hover:bg-card/50 transition-colors"
                      >
                        <TableCell>
                          <p className="font-bold text-foreground text-sm">{station.name}</p>
                          <p className="text-xs text-muted-foreground font-mono">
                            ID: {station.id.slice(0, 8)}...
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
                          {station.status === 0 ? (
                            <Badge variant="success" size="sm" className="gap-1">
                              <span className="material-symbols-outlined text-xs">
                                check_circle
                              </span>
                              Hoạt động
                            </Badge>
                          ) : (
                            <Badge variant="destructive" size="sm" className="gap-1">
                              <span className="material-symbols-outlined text-xs">block</span>
                              Vô hiệu hóa
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
                                <span className="material-symbols-outlined text-lg">edit</span>
                                Chỉnh sửa
                              </DropdownMenuItem>
                              <DropdownMenuItem className="gap-2 text-primary">
                                <span className="material-symbols-outlined text-lg">group_add</span>
                                Gán quản lý / đội
                              </DropdownMenuItem>
                              {station.status === 0 ? (
                                <DropdownMenuItem
                                  className="gap-2 text-destructive"
                                  onClick={() => handleDisable(station.id)}
                                >
                                  <span className="material-symbols-outlined text-lg">block</span>
                                  Vô hiệu hóa trạm
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem
                                  className="gap-2 text-success"
                                  onClick={() => handleActivate(station.id)}
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
                    ))}
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
    </DashboardLayout>
  );
}
