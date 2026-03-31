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
import { useInventories } from '@/hooks/useInventory';
import { managerNavItems, managerProjects } from './components/sidebarConfig';

export default function ManagerInventoryCoordinationPage() {
  const [pageIndex, setPageIndex] = useState(1);
  const [pageSize] = useState(10);

  const { data: inventoriesResponse, isLoading } = useInventories({
    pageIndex,
    pageSize,
  });

  const inventories = inventoriesResponse?.items || [];
  const pagination = inventoriesResponse;

  return (
    <DashboardLayout projects={managerProjects} navItems={managerNavItems}>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-primary">Điều phối Kho Tổng</h1>
            <p className="text-muted-foreground dark:text-muted-foreground">
              Quản lý hàng hóa tại kho tổng và thực hiện luân chuyển xuống các trạm nhỏ.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button size="lg" className="bg-primary text-white gap-2 font-bold rounded-full">
              <span className="material-symbols-outlined text-lg">add</span>
              Tạo Kho Mới
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
                placeholder="Tìm kiếm kho (hiện chỉ theo ID)..."
                disabled
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                <span className="material-symbols-outlined mr-2 text-sm">filter_list</span>
                Lọc Kho
              </Button>
            </div>
          </div>

          <CardHeader>
            <CardTitle>Tồn kho Hệ thống</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              {isLoading ? (
                <div className="flex items-center justify-center py-16">
                  <div className="flex flex-col items-center gap-3">
                    <span className="material-symbols-outlined text-4xl text-primary animate-spin">
                      progress_activity
                    </span>
                    <p className="text-muted-foreground text-sm">Đang tải danh sách kho...</p>
                  </div>
                </div>
              ) : inventories.length === 0 ? (
                <div className="flex items-center justify-center py-16">
                  <div className="flex flex-col items-center gap-3">
                    <span className="material-symbols-outlined text-4xl text-muted-foreground">
                      inventory_2
                    </span>
                    <p className="text-muted-foreground text-sm">Chưa có kho nào được tạo</p>
                  </div>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Mã Kho</TableHead>
                      <TableHead>Trạm trực thuộc</TableHead>
                      <TableHead>Cấp kho</TableHead>
                      <TableHead>Trạng thái</TableHead>
                      <TableHead className="text-right">Thao tác</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {inventories.map((inv) => (
                      <TableRow
                        key={inv.inventoryId}
                        className="group hover:bg-card/50 transition-colors"
                      >
                        <TableCell>
                          <p className="font-bold text-foreground text-sm uppercase">
                            {inv.inventoryId}
                          </p>
                        </TableCell>
                        <TableCell>
                          <span className="text-foreground text-sm text-muted-foreground font-mono">
                            {inv.reliefStationName}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" size="xs">
                            {inv.levelName}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {inv.status === 0 ? (
                            <Badge variant="success" size="xs">
                              Hoạt động
                            </Badge>
                          ) : (
                            <Badge variant="destructive" size="xs">
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
                              <DropdownMenuItem className="gap-2 text-primary">
                                <span className="material-symbols-outlined text-lg">
                                  visibility
                                </span>
                                Xem tồn kho chi tiết
                              </DropdownMenuItem>
                              <DropdownMenuItem className="gap-2 text-orange-500">
                                <span className="material-symbols-outlined text-lg">
                                  local_shipping
                                </span>
                                Tạo lệnh điều phối hàng
                              </DropdownMenuItem>
                              <DropdownMenuItem className="gap-2 text-destructive">
                                <span className="material-symbols-outlined text-lg">block</span>
                                Ngừng hoạt động
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

            {/* Pagination Controls */}
            {pagination && pagination.totalCount > 0 && pagination.totalCount > pageSize && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-border mt-auto">
                <p className="text-sm text-muted-foreground">
                  Trang {pagination.currentPage} — Tổng {pagination.totalCount} kho
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!pagination.hasPrevious}
                    onClick={() => setPageIndex((prev) => Math.max(1, prev - 1))}
                    className="gap-1"
                  >
                    <span className="material-symbols-outlined text-sm">chevron_left</span>
                    Trước
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!pagination.hasNext}
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
