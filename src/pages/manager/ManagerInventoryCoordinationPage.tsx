import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

export default function ManagerInventoryCoordinationPage() {
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
            <h1 className="text-3xl font-black text-primary">Điều phối Kho Tổng</h1>
            <p className="text-muted-foreground dark:text-muted-foreground">
              Quản lý hàng hóa tại kho tổng và thực hiện luân chuyển xuống các trạm nhỏ.
            </p>
          </div>
        </div>

        <Card className="bg-surface-dark dark:bg-surface-light border-border">
          <CardHeader>
            <CardTitle>Tồn kho Hệ thống</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center py-16 text-muted-foreground">
              Tính năng điều phối hàng hóa cho Kho Tổng đang được phát triển...
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
