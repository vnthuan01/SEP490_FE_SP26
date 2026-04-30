import { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueries } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { LargeDisasterMapSheet } from '@/components/shared/disaster/LargeDisasterMapSheet';
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
import { useProvincialStations } from '@/hooks/useReliefStations';
import { useAnalyzeDisasterRisks } from '@/hooks/useDisasterAnalysis';
import { reverseGeocodeV2 } from '@/services/goongService';
import type { AnalyzeDisasterRiskResponse } from '@/services/disasterAnalysisService';
import { DisasterForecastMapPanel } from '@/pages/manager/components/DisasterForecastMapPanel';
import { DisasterType, EntityStatus, getDisasterTypeLabel } from '@/enums/beEnums';

const GOONG_API_KEY =
  import.meta.env.VITE_GOONG_API_KEY || import.meta.env.VITE_GOONG_MAP_KEY || '';

const DISASTER_TYPE_LOOKUP: Record<string, number> = {
  flood: DisasterType.Flood,
  landslide: DisasterType.Landslide,
  earthquake: DisasterType.Earthquake,
  fire: DisasterType.Fire,
  storm: DisasterType.Storm,
  other: DisasterType.Other,
};

const resolveDisasterTypeValue = (value?: string | null) => {
  const key = String(value || '')
    .trim()
    .toLowerCase();
  return key in DISASTER_TYPE_LOOKUP ? DISASTER_TYPE_LOOKUP[key] : DisasterType.Other;
};

const getEffectiveDisasterType = (analysis: AnalyzeDisasterRiskResponse) =>
  analysis.primaryDisasterType ||
  analysis.ai?.primaryRiskType ||
  analysis.ai?.requestedRiskType ||
  analysis.requestedDisasterType ||
  analysis.riskRanking?.[0]?.disasterType ||
  String(DisasterType.Other);

const getDisasterTheme = (value?: string | null) => {
  const numericValue = resolveDisasterTypeValue(value);
  if (numericValue === DisasterType.Flood) {
    return {
      color: '#2563eb',
      light: 'rgba(37,99,235,0.18)',
      cardClass: 'border-blue-500/30 bg-blue-500/5 text-blue-700 dark:text-blue-300',
      icon: 'water',
    };
  }
  if (numericValue === DisasterType.Storm) {
    return {
      color: '#7c3aed',
      light: 'rgba(124,58,237,0.18)',
      cardClass: 'border-violet-500/30 bg-violet-500/5 text-violet-700 dark:text-violet-300',
      icon: 'thunderstorm',
    };
  }
  return {
    color: '#475569',
    light: 'rgba(71,85,105,0.18)',
    cardClass: 'border-slate-500/30 bg-slate-500/5 text-slate-700 dark:text-slate-300',
    icon: 'warning',
  };
};

const parseRiskLevelVN = (level?: string | null) => {
  const normalized = String(level || '')
    .trim()
    .toLowerCase();
  if (normalized.includes('critical') || normalized.includes('very high')) {
    return { label: 'Cực kỳ nguy hiểm', class: 'text-red-600' };
  }
  if (normalized.includes('high') || normalized.includes('cao')) {
    return { label: 'Nguy hiểm cao', class: 'text-orange-600' };
  }
  if (normalized.includes('medium') || normalized.includes('trung')) {
    return { label: 'Nguy hiểm trung bình', class: 'text-amber-600' };
  }
  return { label: 'Nguy hiểm thấp', class: 'text-emerald-600' };
};

const parseWeatherConditionVN = (condition?: string | null) => {
  const normalized = String(condition || '')
    .trim()
    .toLowerCase();
  if (normalized.includes('clear') || normalized.includes('sunny')) return 'Trời quang';
  if (normalized.includes('cloudy') || normalized.includes('overcast')) return 'Nhiều mây';
  if (normalized.includes('rain') || normalized.includes('drizzle')) return 'Có mưa';
  if (normalized.includes('storm') || normalized.includes('thunder')) return 'Dông bão';
  return condition || 'Không rõ';
};

const getDisplayDisasterLabel = (analysis: AnalyzeDisasterRiskResponse) => {
  const numericValue = resolveDisasterTypeValue(getEffectiveDisasterType(analysis));
  if (numericValue === DisasterType.Other) {
    return analysis.weather?.baseWeatherRiskLevel?.toLowerCase() === 'low'
      ? 'Thời tiết ổn định'
      : 'Thời tiết cần theo dõi';
  }
  return getDisasterTypeLabel(numericValue);
};

const getAnalysisPriorityScore = (analysis: AnalyzeDisasterRiskResponse) => {
  const heuristicScore = Number(analysis.heuristic?.overallRiskScore || 0);
  const severeRisk = Math.max(
    0,
    ...(analysis.forecast?.days?.map((day) => Number(day.severeRisk || 0)) || [0]),
  );
  const maxDailyPrecip = Number(analysis.forecast?.maxDailyPrecipMm || 0);
  return heuristicScore + severeRisk * 0.8 + maxDailyPrecip * 2;
};

const kmToLatitudeDelta = (km: number) => km / 111;
const kmToLongitudeDelta = (km: number, latitude: number) => {
  const cosLat = Math.cos((latitude * Math.PI) / 180);
  return km / (111 * Math.max(Math.abs(cosLat), 0.2));
};
const getPointInRadius = (
  center: { latitude: number; longitude: number },
  distanceKm: number,
  angleDeg: number,
) => {
  const angleRad = (angleDeg * Math.PI) / 180;
  return {
    latitude: center.latitude + kmToLatitudeDelta(distanceKm * Math.sin(angleRad)),
    longitude:
      center.longitude + kmToLongitudeDelta(distanceKm * Math.cos(angleRad), center.latitude),
  };
};
const buildStationAnalysisPoints = (
  stationPoint: { latitude: number; longitude: number },
  coverageRadiusKm?: number | null,
) => {
  const radiusKm = Math.max(coverageRadiusKm || 12, 3);
  return [
    {
      ...getPointInRadius(stationPoint, radiusKm * 0.28, 32),
      label: 'Điểm giám sát gần trạm',
      context: 'khu vực lân cận trạm',
    },
    {
      ...getPointInRadius(stationPoint, radiusKm * 0.58, 154),
      label: 'Điểm giám sát vành đai',
      context: 'vành đai hoạt động của trạm',
    },
    {
      ...getPointInRadius(stationPoint, radiusKm * 0.82, 286),
      label: 'Điểm giám sát ngoại vi',
      context: 'khu vực rìa phạm vi phủ của trạm',
    },
  ];
};

export default function AdminDashboardPage() {
  const navigate = useNavigate();
  const [timeRange, setTimeRange] = useState<AdminDashboardTimeRange>('30d');
  const [selectedAnalysis, setSelectedAnalysis] = useState<AnalyzeDisasterRiskResponse | null>(
    null,
  );
  const [highlightedAnalysisId, setHighlightedAnalysisId] = useState<string | null>(null);
  const highlightTimerRef = useRef<number | null>(null);
  const [disasterFilter, setDisasterFilter] = useState<string>('all');
  const [openMapSheet, setOpenMapSheet] = useState(false);
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

  const { data: stationsData } = useProvincialStations({ pageIndex: 1, pageSize: 200 });
  const stations = useMemo(() => stationsData?.items || [], [stationsData]);
  const mapStations = useMemo(
    () =>
      stations
        .filter(
          (station) =>
            typeof station.latitude === 'number' &&
            typeof station.longitude === 'number' &&
            Number(station.status) === EntityStatus.Active,
        )
        .map((station) => ({
          id: station.reliefStationId ?? station.stationId ?? station.id,
          name: station.name,
          latitude: Number(station.latitude || 0),
          longitude: Number(station.longitude || 0),
          coverageRadiusKm: station.coverageRadiusKm ?? null,
          address: station.address,
          contactNumber: station.contactNumber,
          level: station.level,
        })),
    [stations],
  );

  const areaLookupQueries = useQueries({
    queries: mapStations.map((station) => ({
      queryKey: [
        'admin-station-analysis-area',
        station.id ?? station.name,
        station.latitude,
        station.longitude,
      ],
      enabled: Boolean(GOONG_API_KEY),
      staleTime: 30 * 60 * 1000,
      retry: 1,
      queryFn: async () => {
        const response = await reverseGeocodeV2(station.latitude, station.longitude, { limit: 1 });
        const result = response.results?.[0];
        return {
          stationId: station.id ?? null,
          areaName:
            result?.compound?.district ||
            result?.compound?.province ||
            result?.formatted_address ||
            station.name,
        };
      },
    })),
  });
  const areaNameByStationId = useMemo(() => {
    const map = new Map<string | null, string>();
    areaLookupQueries.forEach((query) => {
      if (query.data?.stationId) map.set(query.data.stationId, query.data.areaName);
    });
    return map;
  }, [areaLookupQueries]);

  const disasterPayloadsWithMeta = useMemo(
    () =>
      mapStations.flatMap((station) => {
        const stationId = station.id ?? null;
        const analysisPoints = buildStationAnalysisPoints(
          { latitude: station.latitude, longitude: station.longitude },
          station.coverageRadiusKm,
        );
        const areaName = areaNameByStationId.get(stationId) || station.name;
        return analysisPoints.map((point, index) => ({
          stationId,
          payload: {
            latitude: point.latitude,
            longitude: point.longitude,
            locationName: `${station.name} - ${point.label}`,
            additionalContext: `Phân tích nguy cơ thiên tai cho vị trí đại diện số ${index + 1} quanh trạm ${station.name}. Khu vực tham chiếu: ${areaName}. Ngữ cảnh địa bàn: ${point.context}.`,
          },
        }));
      }),
    [mapStations, areaNameByStationId],
  );
  const disasterPayloads = useMemo(
    () => disasterPayloadsWithMeta.map(({ payload }) => payload),
    [disasterPayloadsWithMeta],
  );
  const { analyses: disasterAnalyses, isLoading: isLoadingDisaster } =
    useAnalyzeDisasterRisks(disasterPayloads);
  const filteredAnalyses = useMemo(() => {
    if (disasterFilter === 'all') return disasterAnalyses;
    return disasterAnalyses.filter(
      (analysis) =>
        String(resolveDisasterTypeValue(getEffectiveDisasterType(analysis))) === disasterFilter,
    );
  }, [disasterAnalyses, disasterFilter]);
  const topRisk = useMemo(() => {
    if (!disasterAnalyses.length) return null;
    return [...disasterAnalyses].sort(
      (a, b) => getAnalysisPriorityScore(b) - getAnalysisPriorityScore(a),
    )[0];
  }, [disasterAnalyses]);
  const shouldShowTopRiskBanner = useMemo(() => {
    if (!topRisk) return false;
    const typeValue = resolveDisasterTypeValue(getEffectiveDisasterType(topRisk));
    return !(
      typeValue === DisasterType.Other &&
      topRisk.weather?.baseWeatherRiskLevel?.toLowerCase() === 'low'
    );
  }, [topRisk]);
  const stationTopAnalysisMap = useMemo(() => {
    const byStation = new Map<string | null, AnalyzeDisasterRiskResponse>();
    disasterPayloadsWithMeta.forEach((meta) => {
      const analysis = disasterAnalyses.find(
        (item) =>
          Number(item.latitude).toFixed(6) === Number(meta.payload.latitude).toFixed(6) &&
          Number(item.longitude).toFixed(6) === Number(meta.payload.longitude).toFixed(6),
      );
      if (!analysis) return;
      const current = byStation.get(meta.stationId);
      if (
        !current ||
        Number(analysis.heuristic?.overallRiskScore || 0) >
          Number(current.heuristic?.overallRiskScore || 0)
      ) {
        byStation.set(meta.stationId, analysis);
      }
    });
    return byStation;
  }, [disasterPayloadsWithMeta, disasterAnalyses]);

  const openMapSheetWithSelection = () => {
    if (!selectedAnalysis && filteredAnalyses.length > 0) {
      const preferred = topRisk
        ? filteredAnalyses.find((item) => item.analysisLogId === topRisk.analysisLogId)
        : null;
      setSelectedAnalysis(preferred || filteredAnalyses[0]);
    }
    setOpenMapSheet(true);
  };

  const selectAnalysisWithPulse = (analysis: AnalyzeDisasterRiskResponse | null) => {
    setSelectedAnalysis(analysis);
    if (!analysis?.analysisLogId) return;
    setHighlightedAnalysisId(analysis.analysisLogId);
    if (highlightTimerRef.current) window.clearTimeout(highlightTimerRef.current);
    highlightTimerRef.current = window.setTimeout(() => {
      setHighlightedAnalysisId((current) => (current === analysis.analysisLogId ? null : current));
    }, 2000);
  };

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
          {topRisk && !isLoadingDisaster && shouldShowTopRiskBanner && (
            <div
              className={`xl:col-span-12 rounded-2xl border p-5 ${getDisasterTheme(getEffectiveDisasterType(topRisk)).cardClass} cursor-pointer hover:shadow-sm transition-all`}
              onClick={() => {
                selectAnalysisWithPulse(topRisk);
                openMapSheetWithSelection();
              }}
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-black">Nguy cơ {getDisplayDisasterLabel(topRisk)} cao nhất</p>
                  <p className="text-sm mt-1">{topRisk.locationName}</p>
                </div>
                <Badge variant="outline" appearance="outline" size="sm" className="border gap-1">
                  {parseRiskLevelVN(topRisk.heuristic?.riskLevel).label}
                </Badge>
              </div>
            </div>
          )}

          <div className="xl:col-span-12">
            <DisasterForecastMapPanel
              mapStations={mapStations}
              analyses={disasterAnalyses}
              filteredAnalyses={filteredAnalyses}
              selectedAnalysis={selectedAnalysis}
              highlightedAnalysisId={highlightedAnalysisId}
              disasterFilter={disasterFilter}
              isLoadingDisaster={isLoadingDisaster}
              setDisasterFilter={setDisasterFilter}
              setSelectedAnalysis={selectAnalysisWithPulse}
              onOpenMap={openMapSheetWithSelection}
              onSelectStation={(stationId) => {
                if (!stationId) return;
                const topAnalysis = stationTopAnalysisMap.get(stationId);
                if (topAnalysis) selectAnalysisWithPulse(topAnalysis);
              }}
              parseRiskLevelVN={parseRiskLevelVN}
              parseWeatherConditionVN={parseWeatherConditionVN}
              getEffectiveDisasterType={getEffectiveDisasterType}
              getDisasterTheme={getDisasterTheme}
            />
          </div>

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

      <LargeDisasterMapSheet
        open={openMapSheet}
        onOpenChange={setOpenMapSheet}
        mapContent={
          <DisasterForecastMapPanel
            mapStations={mapStations}
            analyses={disasterAnalyses}
            filteredAnalyses={filteredAnalyses}
            selectedAnalysis={selectedAnalysis}
            highlightedAnalysisId={highlightedAnalysisId}
            disasterFilter={disasterFilter}
            isLoadingDisaster={isLoadingDisaster}
            setDisasterFilter={setDisasterFilter}
            setSelectedAnalysis={selectAnalysisWithPulse}
            onOpenMap={() => setOpenMapSheet(false)}
            onSelectStation={(stationId) => {
              if (!stationId) return;
              const topAnalysis = stationTopAnalysisMap.get(stationId);
              if (topAnalysis) selectAnalysisWithPulse(topAnalysis);
            }}
            parseRiskLevelVN={parseRiskLevelVN}
            parseWeatherConditionVN={parseWeatherConditionVN}
            getEffectiveDisasterType={getEffectiveDisasterType}
            getDisasterTheme={getDisasterTheme}
            renderMode="mapOnly"
          />
        }
        selectedAnalysis={selectedAnalysis}
        filteredAnalyses={filteredAnalyses}
        isLoadingDisaster={isLoadingDisaster}
        onSelectAnalysis={selectAnalysisWithPulse}
        parseRiskLevelVN={parseRiskLevelVN}
        parseWeatherConditionVN={parseWeatherConditionVN}
        getEffectiveDisasterType={getEffectiveDisasterType}
        getDisasterTheme={getDisasterTheme}
        getDisplayDisasterLabel={getDisplayDisasterLabel}
      />
    </DashboardLayout>
  );
}
