import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export default function CoordinatorDashboardPage() {
  return (
    <DashboardLayout
      projects={[
        { label: 'Tổng quan', path: '/portal/coordinator/data-management', icon: 'dashboard' },
        { label: 'Điều phối & Bản đồ', path: '/portal/coordinator/maps', icon: 'map' },
        { label: 'Đội tình nguyện', path: '/portal/coordinator/teams', icon: 'groups' },
        {
          label: 'Yêu cầu tình nguyện',
          path: '/portal/coordinator/volunteer-request',
          icon: 'how_to_reg',
        },
        {
          label: 'Yêu cầu cứu trợ',
          path: '/portal/coordinator/requests',
          icon: 'person_raised_hand',
        },
        {
          label: 'Kho vận & Nhu yếu phẩm',
          path: '/portal/coordinator/inventory',
          icon: 'inventory_2',
        },
      ]}
      navItems={[
        { label: 'Báo cáo & Thống kê', path: '/portal/coordinator/dashboard', icon: 'description' },
      ]}
    >
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl lg:text-4xl font-black leading-tight tracking-tight text-primary ">
            Báo cáo & Thống kê
          </h1>
          <p className="text-muted-foreground dark:text-muted-foreground text-base md:text-lg max-w-2xl">
            Tổng quan tình hình cứu trợ và hiệu quả hoạt động hệ thống trong 24h qua.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center bg-card dark:bg-card rounded-lg px-3 py-2 border border-border">
            <span className="material-symbols-outlined text-muted-foreground dark:text-muted-foreground mr-2 text-sm">
              calendar_today
            </span>
            <span className="text-foreground dark:text-foreground text-sm font-medium">
              01/10/2023 - 07/10/2023
            </span>
          </div>
          <Button variant="outline" size="md" className="gap-2">
            <span className="material-symbols-outlined text-sm">download</span>
            <span>Xuất Excel</span>
          </Button>
          <Button variant="primary" size="md" className="gap-2 shadow-lg shadow-primary/20">
            <span className="material-symbols-outlined text-sm">picture_as_pdf</span>
            <span>Xuất Báo Cáo PDF</span>
          </Button>
        </div>
      </div>

      {/* Stats Cards - Similar to Admin */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 mb-6">
        <Card className="bg-card dark:bg-card border-border hover:border-primary/50 transition-colors group">
          <CardContent className="p-6 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <p className="text-muted-foreground dark:text-muted-foreground text-sm font-semibold uppercase tracking-wider">
                Tổng yêu cầu
              </p>
              <div className="size-8 rounded-full bg-blue-500/20 dark:bg-blue-500/30 flex items-center justify-center text-blue-400 group-hover:bg-blue-500 group-hover:text-white transition-all">
                <span className="material-symbols-outlined text-lg">sos</span>
              </div>
            </div>
            <p className="text-foreground dark:text-foreground text-4xl font-black">1,240</p>
            <div className="flex items-center gap-1 text-green-500 text-sm font-medium bg-green-500/10 w-fit px-2 py-1 rounded">
              <span className="material-symbols-outlined text-base">trending_up</span>
              <span>+12% hôm qua</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card dark:bg-card border-border hover:border-primary/50 transition-colors group">
          <CardContent className="p-6 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <p className="text-muted-foreground dark:text-muted-foreground text-sm font-semibold uppercase tracking-wider">
                Đã xử lý
              </p>
              <div className="size-8 rounded-full bg-green-500/20 dark:bg-green-500/30 flex items-center justify-center text-green-400 group-hover:bg-green-500 group-hover:text-white transition-all">
                <span className="material-symbols-outlined text-lg">check_circle</span>
              </div>
            </div>
            <p className="text-foreground dark:text-foreground text-4xl font-black">850</p>
            <div className="flex items-center gap-1 text-green-500 text-sm font-medium bg-green-500/10 w-fit px-2 py-1 rounded">
              <span className="material-symbols-outlined text-base">bolt</span>
              <span>98% đúng hạn</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card dark:bg-card border-border hover:border-red-500/50 transition-colors group">
          <CardContent className="p-6 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <p className="text-muted-foreground dark:text-muted-foreground text-sm font-semibold uppercase tracking-wider">
                Khu vực báo động
              </p>
              <div className="size-8 rounded-full bg-red-500/20 dark:bg-red-500/30 flex items-center justify-center text-red-400 group-hover:bg-red-500 group-hover:text-white transition-all">
                <span className="material-symbols-outlined text-lg">warning</span>
              </div>
            </div>
            <p className="text-foreground dark:text-foreground text-4xl font-black">3</p>
            <div className="flex items-center gap-1 text-yellow-500 text-sm font-medium bg-yellow-500/10 w-fit px-2 py-1 rounded">
              <span>Yên Bái, Lào Cai, Hà Giang</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card dark:bg-card border-border hover:border-primary/50 transition-colors group">
          <CardContent className="p-6 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <p className="text-muted-foreground dark:text-muted-foreground text-sm font-semibold uppercase tracking-wider">
                Tồn kho thiết yếu
              </p>
              <div className="size-8 rounded-full bg-purple-500/20 dark:bg-purple-500/30 flex items-center justify-center text-purple-400 group-hover:bg-purple-500 group-hover:text-white transition-all">
                <span className="material-symbols-outlined text-lg">inventory</span>
              </div>
            </div>
            <p className="text-foreground dark:text-foreground text-4xl font-black">Ổn định</p>
            <div className="flex items-center gap-1 text-muted-foreground dark:text-muted-foreground text-sm font-medium bg-text-sub-dark/10 dark:bg-text-sub-light/10 w-fit px-2 py-1 rounded">
              <span>Đủ cung ứng 7 ngày tới</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Additional content placeholder */}
      <Card className="bg-surface-dark dark:bg-surface-light border-border">
        <CardContent className="p-6">
          <p className="text-center text-muted-foreground dark:text-muted-foreground">
            Nội dung dashboard chi tiết sẽ được phát triển thêm...
          </p>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
