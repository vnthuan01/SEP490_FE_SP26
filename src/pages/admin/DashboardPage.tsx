import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { StatsCard } from '@/pages/admin/components/StatsCard';
import { DonationChart } from '@/pages/admin/components/DonationChart';
import { VisitorChart } from '@/pages/admin/components/VisitorChart';
import { CampaignProgress } from '@/pages/admin/components/CampaignProgress';
import { TeamOverview } from '@/pages/admin/components/TeamOverview';
import { InventoryStats } from '@/pages/admin/components/InventoryStats';
import { SystemAlertsCard } from '@/pages/admin/components/SystemAlertsCard';
import { RequestHighlightsCard } from '@/pages/admin/components/RequestHighlightsCard';
import { RecentActivityCard } from '@/pages/admin/components/RecentActivityCard';
import { UpcomingCampaignsCard } from '@/pages/admin/components/UpcomingCampaignsCard';
import { LogisticsOverviewCard } from '@/pages/admin/components/LogisticsOverviewCard';
import { adminNavItems, adminProjects } from './components/sidebarConfig';
import { formatNumberVN } from '@/lib/utils';
import {
  useAdminDashboardOverview,
  type AdminDashboardTimeRange,
} from '@/hooks/useAdminDashboardOverview';

export default function AdminDashboardPage() {
  const navigate = useNavigate();
  const [timeRange, setTimeRange] = useState<AdminDashboardTimeRange>('30d');
  const {
    isLoading,
    formatCurrencyVN,
    formatDateTimeVN,
    metrics,
    campaignProgress,
    donationByRange,
    requestByTime,
    topTeams,
    inventoryStats,
    activityFeed,
    requestHighlights,
    upcomingCampaigns,
    systemAlerts,
    logisticsOverview,
    widgets,
  } = useAdminDashboardOverview(timeRange);

  const rangeLabel =
    timeRange === '7d'
      ? '7 ngày gần nhất'
      : timeRange === '30d'
        ? '30 ngày gần nhất'
        : '12 tháng gần nhất';

  return (
    <DashboardLayout projects={adminProjects} navItems={adminNavItems}>
      <div className="flex flex-col gap-6">
        <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="info" appearance="outline" size="sm" className="gap-1">
                  <span className="material-symbols-outlined text-[14px]">monitoring</span>
                  Toàn cảnh hệ thống cứu trợ
                </Badge>
                <Badge variant="success" appearance="outline" size="sm" className="gap-1">
                  <span className="material-symbols-outlined text-[14px]">schedule</span>
                  {rangeLabel}
                </Badge>
              </div>
              <h1 className="mt-3 text-3xl font-black text-primary">Tổng quan điều hành</h1>
              <p className="text-muted-foreground mt-2 max-w-3xl">
                Theo dõi chiến dịch, yêu cầu cứu hộ, dòng tiền, tồn kho, đội ứng cứu và hoạt động
                vận hành của toàn hệ thống. Khi có report API riêng, chỉ cần sửa trong hook tổng hợp
                là gần như xong toàn bộ dashboard.
              </p>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2 rounded-full border border-border bg-background px-2 py-1">
                {(
                  [
                    { key: '7d', label: '7 ngày' },
                    { key: '30d', label: '30 ngày' },
                    { key: '12m', label: '12 tháng' },
                  ] as const
                ).map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setTimeRange(item.key)}
                    className={`rounded-full px-3 py-1.5 text-sm font-semibold transition-all ${
                      timeRange === item.key
                        ? 'bg-primary text-white shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              <Button
                size="lg"
                className="bg-primary text-white gap-2 font-bold rounded-full"
                onClick={() => navigate('/portal/admin/donations')}
              >
                <span className="material-symbols-outlined text-lg">volunteer_activism</span>
                Quản lý quyên góp
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="rounded-full font-bold border-2 gap-2"
                onClick={() => window.open('/fundraising', '_blank', 'noopener,noreferrer')}
              >
                <span className="material-symbols-outlined text-lg">campaign</span>
                Mở Chiến dịch gây quỹ công khai
              </Button>
              <Button variant="outline" size="lg" className="rounded-full font-bold border-2 gap-2">
                <span className="material-symbols-outlined text-lg">download</span>
                Xuất báo cáo tạm thời
              </Button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-12 gap-4 items-stretch">
          {isLoading ? (
            <>
              <Skeleton className="h-[160px] rounded-2xl xl:col-span-3" />
              <Skeleton className="h-[160px] rounded-2xl xl:col-span-6" />
              <Skeleton className="h-[160px] rounded-2xl xl:col-span-3" />
              <Skeleton className="h-[148px] rounded-2xl xl:col-span-3" />
              <Skeleton className="h-[148px] rounded-2xl xl:col-span-3" />
              <Skeleton className="h-[148px] rounded-2xl xl:col-span-3" />
              <Skeleton className="h-[148px] rounded-2xl xl:col-span-3" />
            </>
          ) : (
            <>
              <StatsCard
                className="xl:col-span-3 h-[160px]"
                title="Tổng yêu cầu cứu hộ"
                value={formatNumberVN(metrics.requestCount)}
                icon="sos"
                trend={`${metrics.urgentRequestCount} yêu cầu ưu tiên cao / khẩn cấp`}
                variant="primary"
              />
              <StatsCard
                className="xl:col-span-6 h-[160px]"
                title="Quỹ hiện có"
                value={formatCurrencyVN(metrics.fundBalance)}
                icon="volunteer_activism"
                trend={`${formatNumberVN(metrics.contributionCount)} lượt đóng góp • ${formatNumberVN(metrics.fundSourceCampaigns)} chiến dịch tạo nguồn quỹ`}
                variant="success"
              />
              <StatsCard
                className="xl:col-span-3 h-[160px]"
                title="Chiến dịch đang hoạt động"
                value={formatNumberVN(metrics.activeCampaignCount)}
                icon="campaign"
                trend={`${metrics.completedCampaignCount} chiến dịch đã hoàn thành`}
                variant="info"
              />
              <StatsCard
                className="xl:col-span-3 h-[148px]"
                title="Người dùng hệ thống"
                value={formatNumberVN(metrics.usersCount)}
                icon="groups"
                trend={`${formatNumberVN(metrics.stationsCount)} trạm cứu trợ`}
                variant="warning"
              />
              <StatsCard
                className="xl:col-span-3 h-[148px]"
                title="Thông số kho hàng"
                value={formatNumberVN(metrics.criticalStockCount)}
                icon="inventory_2"
                trend={`${formatNumberVN(metrics.totalInventorySlots)} điểm chứa đang theo dõi`}
                variant="danger"
              />
              <StatsCard
                className="xl:col-span-3 h-[148px]"
                title="Đội cứu hộ"
                value={formatNumberVN(metrics.teamsCount)}
                icon="groups_3"
                trend={`${formatNumberVN(metrics.totalTeamMembers)} thành viên đã phân đội`}
                variant="purple"
              />
              <StatsCard
                className="xl:col-span-3 h-[148px]"
                title="Hoạt động logistics"
                value={formatNumberVN(metrics.transferCount + metrics.sessionCount)}
                icon="local_shipping"
                trend={`${formatNumberVN(metrics.pendingTransferCount)} phiếu chờ • ${formatNumberVN(metrics.inProgressSessionCount)} phiên đang chạy`}
                variant="teal"
              />
            </>
          )}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-stretch">
          <div className="xl:col-span-12 min-w-0">
            {widgets.donation.isLoading ? (
              <Skeleton className="h-[480px] rounded-2xl" />
            ) : widgets.donation.isError ? (
              <Card className="border-border h-[480px]">
                <CardContent className="h-full flex flex-col items-center justify-center text-center px-8">
                  <span className="material-symbols-outlined text-4xl text-destructive">error</span>
                  <p className="mt-3 font-semibold text-foreground">Không tải được dữ liệu quỹ</p>
                  <Button
                    variant="outline"
                    className="mt-4 gap-2"
                    onClick={() => void widgets.donation.retry()}
                  >
                    <span className="material-symbols-outlined text-sm">refresh</span>
                    Thử lại
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <DonationChart
                className="h-[480px] py-2"
                title="Dòng tiền quyên góp và quỹ hệ thống"
                subtitle="Tổng hợp từ API quỹ, nhóm theo thời gian bằng dữ liệu đóng góp hiện có"
                icon="payments"
                summaryLabel="Tổng quyên góp"
                trendLabel={`${formatNumberVN(metrics.fundSourceCampaigns)} chiến dịch tạo nguồn quỹ`}
                dataByRange={donationByRange}
              />
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-stretch">
          <RequestHighlightsCard
            className="xl:col-span-4 h-[340px]"
            requests={requestHighlights}
            isLoading={widgets.requestHighlights.isLoading}
            isError={widgets.requestHighlights.isError}
            onRetry={() => void widgets.requestHighlights.retry()}
          />

          <div className="xl:col-span-4 min-w-0">
            {widgets.requestsChart.isLoading ? (
              <Skeleton className="h-[340px] rounded-2xl" />
            ) : widgets.requestsChart.isError ? (
              <Card className="border-border h-[340px]">
                <CardContent className="h-full flex flex-col items-center justify-center text-center px-6">
                  <span className="material-symbols-outlined text-4xl text-destructive">error</span>
                  <p className="mt-3 font-semibold text-foreground">
                    Không tải được biểu đồ yêu cầu
                  </p>
                  <Button
                    variant="outline"
                    className="mt-4 gap-2"
                    onClick={() => void widgets.requestsChart.retry()}
                  >
                    <span className="material-symbols-outlined text-sm">refresh</span>
                    Thử lại
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <VisitorChart
                className="h-[340px]"
                data={requestByTime}
                title="Yêu cầu theo thời gian"
                subtitle="Dùng dữ liệu yêu cầu cứu hộ thay cho analytics/report riêng"
                icon="stacked_line_chart"
                trendLabel={requestHighlights.length ? 'Ưu tiên xử lý ngay' : undefined}
              />
            )}
          </div>

          <div className="xl:col-span-4 min-w-0">
            {isLoading ? (
              <Skeleton className="h-[340px] rounded-2xl" />
            ) : (
              <CampaignProgress
                className="h-[340px]"
                completed={campaignProgress.completed}
                inProgress={campaignProgress.inProgress}
                pending={campaignProgress.pending}
              />
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-stretch">
          <SystemAlertsCard
            className="xl:col-span-4 h-[360px]"
            alerts={systemAlerts}
            isLoading={widgets.alerts.isLoading}
            isError={widgets.alerts.isError}
            onRetry={() => void widgets.alerts.retry()}
          />
          <UpcomingCampaignsCard
            className="xl:col-span-5 h-[360px]"
            campaigns={upcomingCampaigns}
            isLoading={widgets.campaigns.isLoading}
            isError={widgets.campaigns.isError}
            onRetry={() => void widgets.campaigns.retry()}
          />
          <RecentActivityCard
            className="xl:col-span-3 h-[360px]"
            activities={activityFeed}
            isLoading={widgets.activity.isLoading}
            isError={widgets.activity.isError}
            onRetry={() => void widgets.activity.retry()}
            formatDateTime={formatDateTimeVN}
          />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-stretch">
          <div className="xl:col-span-4 min-w-0">
            {widgets.inventory.isLoading ? (
              <Skeleton className="h-[360px] rounded-2xl" />
            ) : widgets.inventory.isError ? (
              <Card className="border-border h-[360px]">
                <CardContent className="h-full flex flex-col items-center justify-center text-center px-6">
                  <span className="material-symbols-outlined text-4xl text-destructive">error</span>
                  <p className="mt-3 font-semibold text-foreground">Không tải được thống kê kho</p>
                  <Button
                    variant="outline"
                    className="mt-4 gap-2"
                    onClick={() => void widgets.inventory.retry()}
                  >
                    <span className="material-symbols-outlined text-sm">refresh</span>
                    Thử lại
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <Card className="bg-card border-border h-[360px] overflow-hidden">
                <CardContent className="pt-6 h-full flex flex-col gap-4 overflow-hidden">
                  <InventoryStats
                    title="Tồn kho và vật tư thiết yếu"
                    items={inventoryStats.map((item) => ({
                      ...item,
                      textColorClass:
                        item.label === 'Điểm chứa kho'
                          ? 'text-primary'
                          : item.label === 'Mức thiếu hụt'
                            ? 'text-red-500'
                            : item.label === 'Danh mục vật tư'
                              ? 'text-emerald-600'
                              : 'text-amber-600',
                    }))}
                    className="border-0 shadow-none bg-transparent flex-1 min-h-0"
                  />
                  <div className="flex flex-wrap gap-2">
                    <div className="flex justify-between gap-2 rounded-full border border-border bg-primary/5 px-3 py-2 text-sm">
                      <span className="text-muted-foreground inline-flex items-center gap-1">
                        {' '}
                        <span className="material-symbols-outlined text-base text-primary">
                          warehouse
                        </span>
                        Kho đang quản lý:
                        <span className="font-black text-foreground">
                          {formatNumberVN(metrics.stationsCount)}
                        </span>
                      </span>

                      <span className="text-muted-foreground inline-flex items-center gap-1">
                        <span className="material-symbols-outlined text-base text-emerald-500">
                          inventory_2
                        </span>{' '}
                        Danh mục vật tư:
                        <span className="font-black text-foreground">
                          {formatNumberVN(metrics.supplyItemsCount)}
                        </span>
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          <LogisticsOverviewCard
            className="xl:col-span-4 h-[320px]"
            cards={logisticsOverview.cards}
            isLoading={widgets.logistics.isLoading}
            isError={widgets.logistics.isError}
            onRetry={() => void widgets.logistics.retry()}
          />

          <div className="xl:col-span-4 min-w-0">
            {widgets.teamOverview.isLoading ? (
              <Skeleton className="h-[320px] rounded-2xl" />
            ) : widgets.teamOverview.isError ? (
              <Card className="border-border h-[320px]">
                <CardContent className="h-full flex flex-col items-center justify-center text-center px-6">
                  <span className="material-symbols-outlined text-4xl text-destructive">error</span>
                  <p className="mt-3 font-semibold text-foreground">Không tải được dữ liệu đội</p>
                  <Button
                    variant="outline"
                    className="mt-4 gap-2"
                    onClick={() => void widgets.teamOverview.retry()}
                  >
                    <span className="material-symbols-outlined text-sm">refresh</span>
                    Thử lại
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <TeamOverview
                className="h-[320px]"
                title="Đội phản ứng nổi bật"
                icon="shield_person"
                teams={topTeams}
              />
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-stretch">
          <Card className="xl:col-span-12 bg-card border-border h-[260px]">
            <CardContent className="h-full flex flex-col justify-between p-6">
              <div>
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary">apartment</span>
                  <p className="text-lg font-bold text-foreground">Hạ tầng hệ thống hiện có</p>
                </div>
                <div className="mt-4 grid grid-cols-2 lg:grid-cols-4 gap-3">
                  <div className="rounded-xl border border-border bg-muted/20 p-4">
                    <p className="text-xs uppercase font-semibold text-muted-foreground">
                      Trạm cứu trợ
                    </p>
                    <p className="mt-2 text-xl font-black text-foreground">
                      {formatNumberVN(metrics.stationsCount)}
                    </p>
                  </div>
                  <div className="rounded-xl border border-border bg-muted/20 p-4">
                    <p className="text-xs uppercase font-semibold text-muted-foreground">
                      Đội cứu hộ
                    </p>
                    <p className="mt-2 text-xl font-black text-foreground">
                      {formatNumberVN(metrics.teamsCount)}
                    </p>
                  </div>
                  <div className="rounded-xl border border-border bg-muted/20 p-4">
                    <p className="text-xs uppercase font-semibold text-muted-foreground">
                      Vật tư cấu hình
                    </p>
                    <p className="mt-2 text-xl font-black text-foreground">
                      {formatNumberVN(metrics.supplyItemsCount)}
                    </p>
                  </div>
                  <div className="rounded-xl border border-border bg-muted/20 p-4">
                    <p className="text-xs uppercase font-semibold text-muted-foreground">
                      Nguồn quỹ
                    </p>
                    <p className="mt-2 text-xl font-black text-foreground">
                      {formatNumberVN(metrics.fundSourceCampaigns)}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
