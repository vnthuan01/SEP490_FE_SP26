import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function ManagerVehicleManagementPage() {
  return (
    <DashboardLayout
      projects={[
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
          <CardHeader>
            <CardTitle>Danh sách phương tiện điều phối</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center py-16 text-muted-foreground">
              Tính năng chuyển đổi và quản lý xe đang được phát triển...
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
