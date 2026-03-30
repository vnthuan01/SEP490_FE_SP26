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
import { useVehicles } from '@/hooks/useVehicles';

export default function ManagerVehicleManagementPage() {
  const [pageIndex, setPageIndex] = useState(1);
  const [pageSize] = useState(10);
  const [search, setSearch] = useState('');

  const { vehicles, vehiclesPagination, isLoadingVehicles } = useVehicles(undefined, undefined, {
    pageIndex,
    pageSize,
    search: search || undefined,
  });

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
            <h1 className="text-3xl font-black text-primary">Quản lý phương tiện</h1>
            <p className="text-muted-foreground dark:text-muted-foreground">
              Điều phối phương tiện giao thông giữa các trạm cứu trợ.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button size="lg" className="bg-primary text-white gap-2 font-bold rounded-full">
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
                              <DropdownMenuItem className="gap-2">
                                <span className="material-symbols-outlined text-lg">edit</span>
                                Chỉnh sửa thông tin
                              </DropdownMenuItem>
                              <DropdownMenuItem className="gap-2 text-destructive">
                                <span className="material-symbols-outlined text-lg">build</span>
                                Chuyển vào bảo trì
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
      </div>
    </DashboardLayout>
  );
}
