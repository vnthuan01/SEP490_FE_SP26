import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { StatsCard } from '@/pages/admin/components/StatsCard';
import { DonationChart } from '@/pages/admin/components/DonationChart';
import { VisitorChart } from '@/pages/admin/components/VisitorChart';
import { TeamOverview } from '@/pages/admin/components/TeamOverview';
import { TimeTracker } from '@/pages/admin/components/TimeTracker';
import { CampaignProgress } from '@/pages/admin/components/CampaignProgress';
import { InventoryStats } from '@/pages/admin/components/InventoryStats';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

export default function AdminDashboardPage() {
  return (
    <DashboardLayout>
      <div className="flex flex-col gap-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-primary">Dashboard</h1>
            <p className="text-muted-foreground dark:text-muted-foreground">
              Quản lý, ưu tiên và hoàn thành nhiệm vụ dễ dàng.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button size="lg" className="bg-primary text-white gap-2 font-bold rounded-full">
              <span className="material-symbols-outlined text-lg">add</span>
              Tạo chiến dịch
            </Button>
            <Button variant="outline" size="lg" className="rounded-full font-bold border-2">
              <span className="material-symbols-outlined text-lg">download</span>
              Xuất dữ liệu
            </Button>
          </div>
        </div>

        {/* Top Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard
            title="Tổng yêu cầu"
            value="1,240"
            icon="sos"
            trend="Tăng 12% so với tháng trước"
            variant="primary"
          />

          <StatsCard
            title="Chiến dịch đã kết thúc"
            value="10"
            icon="event_busy"
            trend="Tăng 6% so với tháng trước"
            variant="success"
          />

          <StatsCard
            title="Chiến dịch đang chạy"
            value="12"
            icon="campaign"
            trend="Tăng 2% so với tháng trước"
            variant="info"
          />

          <StatsCard
            title="Dự án chờ duyệt"
            value="2"
            icon="pending_actions"
            trend="Đang thảo luận"
            variant="warning"
          />
        </div>

        {/* Middle Section: Analytics & Lists */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* Left Column: Analytics (2 cols) */}
          <div className="lg:col-span-2 flex flex-col gap-4">
            <VisitorChart className="py-2" />
          </div>

          {/* Middle Column: Logs/Reminders (1 col) */}
          <div className="flex flex-col gap-4 ">
            <CampaignProgress completed={41} inProgress={24} pending={35} />
          </div>

          {/* Right Column: Project/Request List (1 col) */}
          <div className="flex flex-col gap-4">
            <Card className="bg-surface-dark dark:bg-surface-light border-border h-full">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-lg font-bold">Yêu cầu mới</CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs rounded-full outline outline-1 outline-primary"
                  disabled
                >
                  <span className="material-symbols-outlined">other_admission</span>
                  New
                </Button>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <div className="flex items-center gap-3">
                  <div className="size-8 rounded bg-blue-500/10 flex items-center justify-center text-blue-500">
                    <span className="material-symbols-outlined text-lg">api</span>
                  </div>
                  <div className="flex flex-col">
                    <p className="text-sm font-bold text-foreground dark:text-foreground">
                      Cứu trợ Xã B
                    </p>
                    <p className="text-[10px] text-muted-foreground dark:text-muted-foreground">
                      Hạn: 26 Nov, 2024
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="size-8 rounded bg-orange-500/10 flex items-center justify-center text-orange-500">
                    <span className="material-symbols-outlined text-lg">inventory_2</span>
                  </div>
                  <div className="flex flex-col">
                    <p className="text-sm font-bold text-foreground dark:text-foreground">
                      Điều phối Kho A
                    </p>
                    <p className="text-[10px] text-muted-foreground dark:text-muted-foreground">
                      Hạn: 28 Nov, 2024
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="size-8 rounded bg-purple-500/10 flex items-center justify-center text-purple-500">
                    <span className="material-symbols-outlined text-lg">group</span>
                  </div>
                  <div className="flex flex-col">
                    <p className="text-sm font-bold text-foreground dark:text-foreground">
                      Tình nguyện viên
                    </p>
                    <p className="text-[10px] text-muted-foreground dark:text-muted-foreground">
                      Hạn: 30 Nov, 2024
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-4">
            <DonationChart className="h-[550px] py-2" />
          </div>
        </div>

        {/* Bottom Section */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* Team Collab */}
          <div className="lg:col-span-1 min-w-0">
            <TeamOverview className="h-full" />
          </div>

          {/* Progress (Radial) */}
          <div className="lg:col-span-1 min-w-0">
            <TimeTracker className="h-full" />
          </div>

          {/* Inventory */}
          <div className="lg:col-span-1 min-w-0">
            <InventoryStats />
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
