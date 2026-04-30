import { useQueries } from '@tanstack/react-query';
import { campaignService, type CampaignSummary } from '@/services/campaignService';
import { fundService } from '@/services/fundService';
import { rescueRequestService, type RescueRequestItem } from '@/services/rescueRequestService';
import { teamService, type Team } from '@/services/teamService';
import { inventoryService } from '@/services/inventoryService';
import { supplyTransferService } from '@/services/supplyTransferService';
import { reliefStationService } from '@/services/reliefStationService';
import { userService } from '@/services/userService';
import { supplyItemService } from '@/services/supplyService';
import {
  CampaignStatus,
  DistributionSessionStatus,
  RescuePriorityLevel,
  RescueRequestStatus,
  SupplyTransferStatus,
  TeamStatus,
  getCampaignStatusClass,
  getCampaignStatusLabel,
  getRescueRequestTypeLabel,
  parseEnumValue,
} from '@/enums/beEnums';
import { formatNumberVN } from '@/lib/utils';

export type AdminDashboardTimeRange = '7d' | '30d' | '12m';
export type ChartPoint = { name: string; value: number };
export type VisitorPoint = { name: string; visits: number };

const ensureArray = <T>(value: unknown): T[] => {
  if (Array.isArray(value)) return value as T[];
  if (value && typeof value === 'object' && Array.isArray((value as { items?: unknown[] }).items)) {
    return (value as { items: T[] }).items;
  }
  return [];
};

const DEFAULT_QUERY_OPTIONS = {
  staleTime: 5 * 60 * 1000,
  retry: 1,
} as const;

const DAY_NAMES = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

const formatCurrencyVN = (value: number) =>
  new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(value);

const formatDateVN = (value?: string | null) => {
  if (!value) return 'Chưa cập nhật';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Chưa cập nhật';
  return date.toLocaleDateString('vi-VN');
};

const formatDateTimeVN = (value?: string | null) => {
  if (!value) return 'Chưa cập nhật';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Chưa cập nhật';
  return date.toLocaleString('vi-VN');
};

const getRequestId = (request: RescueRequestItem) =>
  request.requestId || request.rescueRequestId || request.id || '';

const getRequestStatusNumber = (request: RescueRequestItem) => {
  const raw = request.rescueRequestStatus;
  if (typeof raw === 'number') return raw;
  if (typeof raw === 'string') {
    const normalized = raw.trim().toLowerCase();
    if (normalized.includes('pending') || normalized.includes('chờ'))
      return RescueRequestStatus.Pending;
    if (normalized.includes('verified') || normalized.includes('xác'))
      return RescueRequestStatus.Verified;
    if (normalized.includes('assigned') || normalized.includes('gán'))
      return RescueRequestStatus.Assigned;
    if (normalized.includes('progress') || normalized.includes('cứu hộ'))
      return RescueRequestStatus.InProgress;
    if (normalized.includes('complete') || normalized.includes('hoàn'))
      return RescueRequestStatus.Completed;
    if (normalized.includes('cancel') || normalized.includes('hủy'))
      return RescueRequestStatus.Cancelled;
  }
  return RescueRequestStatus.Pending;
};

const getRequestStatusLabel = (request: RescueRequestItem) => {
  const status = getRequestStatusNumber(request);
  switch (status) {
    case RescueRequestStatus.Pending:
      return 'Chờ xử lý';
    case RescueRequestStatus.Verified:
      return 'Đã xác minh';
    case RescueRequestStatus.Assigned:
      return 'Đã gán đội';
    case RescueRequestStatus.InProgress:
      return 'Đang cứu hộ';
    case RescueRequestStatus.Completed:
      return 'Hoàn thành';
    case RescueRequestStatus.Cancelled:
      return 'Đã hủy';
    default:
      return 'Không rõ';
  }
};

const getRequestStatusClass = (request: RescueRequestItem) => {
  switch (getRequestStatusNumber(request)) {
    case RescueRequestStatus.Pending:
      return 'border-amber-500/20 bg-amber-500/10 text-amber-600';
    case RescueRequestStatus.Verified:
      return 'border-sky-500/20 bg-sky-500/10 text-sky-600';
    case RescueRequestStatus.Assigned:
      return 'border-blue-500/20 bg-blue-500/10 text-blue-600';
    case RescueRequestStatus.InProgress:
      return 'border-violet-500/20 bg-violet-500/10 text-violet-600';
    case RescueRequestStatus.Completed:
      return 'border-emerald-500/20 bg-emerald-500/10 text-emerald-600';
    case RescueRequestStatus.Cancelled:
      return 'border-red-500/20 bg-red-500/10 text-red-600';
    default:
      return 'border-border bg-muted text-muted-foreground';
  }
};

const getPriorityLabel = (priority?: number | null) => {
  switch (priority) {
    case RescuePriorityLevel.Critical:
      return 'Khẩn cấp';
    case RescuePriorityLevel.High:
      return 'Cao';
    case RescuePriorityLevel.Medium:
      return 'Trung bình';
    case RescuePriorityLevel.Low:
      return 'Thấp';
    default:
      return 'Chưa rõ';
  }
};

const getPriorityClass = (priority?: number | null) => {
  switch (priority) {
    case RescuePriorityLevel.Critical:
      return 'border-red-500/20 bg-red-500/10 text-red-600';
    case RescuePriorityLevel.High:
      return 'border-orange-500/20 bg-orange-500/10 text-orange-600';
    case RescuePriorityLevel.Medium:
      return 'border-amber-500/20 bg-amber-500/10 text-amber-600';
    case RescuePriorityLevel.Low:
      return 'border-sky-500/20 bg-sky-500/10 text-sky-600';
    default:
      return 'border-border bg-muted text-muted-foreground';
  }
};

const isWithinSelectedRange = (
  value: string | undefined | null,
  range: AdminDashboardTimeRange,
) => {
  if (!value) return false;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);

  if (range === '7d') return diffDays <= 7;
  if (range === '30d') return diffDays <= 30;
  return diffDays <= 365;
};

function groupCurrencyByWeekday(
  values: Array<{ createdAt?: string; amount?: number }>,
  range: AdminDashboardTimeRange,
): ChartPoint[] {
  const buckets = Array.from({ length: 7 }, (_, index) => ({ name: DAY_NAMES[index], value: 0 }));

  values.forEach((item) => {
    if (!isWithinSelectedRange(item.createdAt, range)) return;
    const date = new Date(item.createdAt as string);
    if (Number.isNaN(date.getTime())) return;
    buckets[date.getDay()].value += Number(item.amount || 0);
  });

  return buckets;
}

function groupCurrencyByMonth(
  values: Array<{ createdAt?: string; amount?: number }>,
  range: AdminDashboardTimeRange,
): ChartPoint[] {
  if (range === '12m') {
    const now = new Date();
    const buckets = Array.from({ length: 12 }, (_, index) => {
      const date = new Date(now.getFullYear(), now.getMonth() - (11 - index), 1);
      return {
        name: `T${date.getMonth() + 1}`,
        value: 0,
        month: date.getMonth(),
        year: date.getFullYear(),
      };
    });

    values.forEach((item) => {
      if (!isWithinSelectedRange(item.createdAt, range)) return;
      const date = new Date(item.createdAt as string);
      if (Number.isNaN(date.getTime())) return;
      const matched = buckets.find(
        (bucket) => bucket.month === date.getMonth() && bucket.year === date.getFullYear(),
      );
      if (matched) matched.value += Number(item.amount || 0);
    });

    return buckets.map(({ name, value }) => ({ name, value }));
  }

  const bucketCount = range === '30d' ? 30 : 7;
  const now = new Date();
  const buckets = Array.from({ length: bucketCount }, (_, index) => {
    const date = new Date(now);
    date.setDate(now.getDate() - (bucketCount - 1 - index));
    return {
      name: range === '30d' ? `${date.getDate()}/${date.getMonth() + 1}` : DAY_NAMES[date.getDay()],
      day: date.getDate(),
      month: date.getMonth(),
      year: date.getFullYear(),
      value: 0,
    };
  });

  values.forEach((item) => {
    if (!isWithinSelectedRange(item.createdAt, range)) return;
    const date = new Date(item.createdAt as string);
    if (Number.isNaN(date.getTime())) return;
    const matched = buckets.find(
      (bucket) =>
        bucket.day === date.getDate() &&
        bucket.month === date.getMonth() &&
        bucket.year === date.getFullYear(),
    );
    if (matched) matched.value += Number(item.amount || 0);
  });

  return buckets.map(({ name, value }) => ({ name, value }));
}

function groupRequestsByTime(
  values: RescueRequestItem[],
  range: AdminDashboardTimeRange,
): VisitorPoint[] {
  if (range === '12m') {
    const now = new Date();
    const buckets = Array.from({ length: 12 }, (_, index) => {
      const date = new Date(now.getFullYear(), now.getMonth() - (11 - index), 1);
      return {
        name: `T${date.getMonth() + 1}`,
        visits: 0,
        month: date.getMonth(),
        year: date.getFullYear(),
      };
    });

    values.forEach((item) => {
      if (!isWithinSelectedRange(item.createdAt, range)) return;
      const date = new Date(item.createdAt as string);
      if (Number.isNaN(date.getTime())) return;
      const matched = buckets.find(
        (bucket) => bucket.month === date.getMonth() && bucket.year === date.getFullYear(),
      );
      if (matched) matched.visits += 1;
    });

    return buckets.map(({ name, visits }) => ({ name, visits }));
  }

  const bucketCount = range === '30d' ? 30 : 7;
  const now = new Date();
  const buckets = Array.from({ length: bucketCount }, (_, index) => {
    const date = new Date(now);
    date.setDate(now.getDate() - (bucketCount - 1 - index));
    return {
      name: range === '30d' ? `${date.getDate()}/${date.getMonth() + 1}` : DAY_NAMES[date.getDay()],
      day: date.getDate(),
      month: date.getMonth(),
      year: date.getFullYear(),
      visits: 0,
    };
  });

  values.forEach((item) => {
    if (!isWithinSelectedRange(item.createdAt, range)) return;
    const date = new Date(item.createdAt as string);
    if (Number.isNaN(date.getTime())) return;
    const matched = buckets.find(
      (bucket) =>
        bucket.day === date.getDate() &&
        bucket.month === date.getMonth() &&
        bucket.year === date.getFullYear(),
    );
    if (matched) matched.visits += 1;
  });

  return buckets.map(({ name, visits }) => ({ name, visits }));
}

export function useAdminDashboardOverview(range: AdminDashboardTimeRange) {
  const overviewQueries = useQueries({
    queries: [
      {
        queryKey: ['admin-dashboard', 'campaigns'],
        queryFn: async () => (await campaignService.getAll({ pageIndex: 1, pageSize: 200 })).data,
        ...DEFAULT_QUERY_OPTIONS,
      },
      {
        queryKey: ['admin-dashboard', 'fund-summary'],
        queryFn: async () => (await fundService.getSummary()).data,
        ...DEFAULT_QUERY_OPTIONS,
      },
      {
        queryKey: ['admin-dashboard', 'fund-contributions'],
        queryFn: async () => (await fundService.getContributions()).data,
        ...DEFAULT_QUERY_OPTIONS,
      },
      {
        queryKey: ['admin-dashboard', 'fund-transactions'],
        queryFn: async () => (await fundService.getTransactions()).data,
        ...DEFAULT_QUERY_OPTIONS,
      },
      {
        queryKey: ['admin-dashboard', 'rescue-requests'],
        queryFn: async () => rescueRequestService.getRequests(undefined, 1, 80),
        ...DEFAULT_QUERY_OPTIONS,
      },
      {
        queryKey: ['admin-dashboard', 'teams'],
        queryFn: async () => (await teamService.getAll()).data,
        ...DEFAULT_QUERY_OPTIONS,
      },
      {
        queryKey: ['admin-dashboard', 'inventories'],
        queryFn: async () => (await inventoryService.getAll({ pageIndex: 1, pageSize: 200 })).data,
        ...DEFAULT_QUERY_OPTIONS,
      },
      {
        queryKey: ['admin-dashboard', 'supply-transfers'],
        queryFn: async () => {
          const statuses = [1, 2, 3, 4, 5]; // Pending, Approved, Shipping, Received, Cancelled
          const responses = await Promise.all(
            statuses.map((status) =>
              supplyTransferService.getByStatus({ status, pageIndex: 1, pageSize: 20 }),
            ),
          );
          const mergedItems = responses.flatMap((response) =>
            Array.isArray(response.data) ? response.data : response.data?.items || [],
          );
          const deduped = Array.from(
            new Map(mergedItems.map((item: any) => [item.id, item])).values(),
          ).sort(
            (a: any, b: any) =>
              new Date(b.requestedAt || b.createdAt || 0).getTime() -
              new Date(a.requestedAt || a.createdAt || 0).getTime(),
          );
          return {
            items: deduped,
            totalCount: deduped.length,
          };
        },
        ...DEFAULT_QUERY_OPTIONS,
      },
      {
        queryKey: ['admin-dashboard', 'stations'],
        queryFn: async () =>
          (await reliefStationService.getProvincialStations({ pageIndex: 1, pageSize: 200 })).data,
        ...DEFAULT_QUERY_OPTIONS,
      },
      {
        queryKey: ['admin-dashboard', 'users'],
        queryFn: async () => (await userService.getAll({ pageIndex: 1, pageSize: 200 })).data,
        ...DEFAULT_QUERY_OPTIONS,
      },
      {
        queryKey: ['admin-dashboard', 'supply-items'],
        queryFn: async () => (await supplyItemService.getAll({ pageIndex: 1, pageSize: 200 })).data,
        ...DEFAULT_QUERY_OPTIONS,
      },
    ],
  });

  const [
    campaignsQuery,
    fundSummaryQuery,
    fundContributionsQuery,
    fundTransactionsQuery,
    rescueRequestsQuery,
    teamsQuery,
    inventoriesQuery,
    transfersQuery,
    stationsQuery,
    usersQuery,
    supplyItemsQuery,
  ] = overviewQueries;

  const activeCampaignTeamQueries = useQueries({
    queries: ((campaignsQuery.data?.items || []) as CampaignSummary[])
      .filter((campaign) =>
        (
          [
            CampaignStatus.Active,
            CampaignStatus.ReadyToExecute,
            CampaignStatus.InProgress,
            CampaignStatus.Closing,
          ] as number[]
        ).includes(parseEnumValue(campaign.status)),
      )
      .slice(0, 20)
      .map((campaign) => ({
        queryKey: ['admin-dashboard', 'campaign-teams', campaign.campaignId],
        queryFn: async () => {
          try {
            return (await campaignService.getTeams(campaign.campaignId)).data;
          } catch {
            // Some active campaigns do not expose team list yet; keep widget stable.
            return [];
          }
        },
        ...DEFAULT_QUERY_OPTIONS,
        enabled: !!campaign.campaignId,
      })),
  });

  const isLoading = overviewQueries.some((query) => query.isLoading);
  const hasError = overviewQueries.some((query) => query.isError);

  const retryAll = () => {
    overviewQueries.forEach((query) => {
      void query.refetch();
    });
  };

  const campaigns = ((campaignsQuery.data?.items || []) as CampaignSummary[]) || [];
  const fundSummary = fundSummaryQuery.data;
  const contributions = (fundContributionsQuery.data || []) as Array<{
    amount?: number;
    createdAt?: string;
    donorName?: string;
    campaignName?: string;
    note?: string;
  }>;
  const filteredContributions = contributions.filter((item) =>
    isWithinSelectedRange(item.createdAt, range),
  );

  const fundTransactions = (fundTransactionsQuery.data || []) as Array<{
    amount?: number;
    createdAt?: string;
    createdBy?: string;
    note?: string;
    type?: string;
  }>;
  const filteredFundTransactions = fundTransactions.filter((item) =>
    isWithinSelectedRange(item.createdAt, range),
  );

  const rescueRequests = (
    ((rescueRequestsQuery.data?.items || []) as RescueRequestItem[]) || []
  ).filter((item) => isWithinSelectedRange(item.createdAt, range));
  const rescuePaging = rescueRequestsQuery.data?.paging;

  const teams = ensureArray<Team>(teamsQuery.data);
  const inventories = (inventoriesQuery.data?.items || []) as any[];
  const sessionItems: any[] = [];
  const transferItems = ensureArray<any>(transfersQuery.data).filter((item: any) =>
    isWithinSelectedRange(item.requestedAt || item.createdAt, range),
  );
  const stations = (stationsQuery.data?.items || []) as any[];
  const users = (usersQuery.data?.items || []) as any[];
  const supplyItems = (supplyItemsQuery.data?.items || []) as any[];

  const completedCampaignCount = campaigns.filter(
    (campaign) =>
      parseEnumValue(campaign.status) === CampaignStatus.Completed ||
      parseEnumValue(campaign.status) === CampaignStatus.GoalsMet,
  ).length;

  const activeCampaignStatuses: number[] = [
    CampaignStatus.Active,
    CampaignStatus.ReadyToExecute,
    CampaignStatus.InProgress,
    CampaignStatus.Closing,
  ];
  const activeCampaignCount = campaigns.filter((campaign) =>
    activeCampaignStatuses.some((status) => status === parseEnumValue(campaign.status)),
  ).length;
  const pendingCampaignCount = Math.max(
    campaigns.length - completedCampaignCount - activeCampaignCount,
    0,
  );

  const campaignProgress = {
    completed: campaigns.length ? Math.round((completedCampaignCount / campaigns.length) * 100) : 0,
    inProgress: campaigns.length ? Math.round((activeCampaignCount / campaigns.length) * 100) : 0,
    pending: campaigns.length
      ? Math.max(
          100 -
            Math.round((completedCampaignCount / campaigns.length) * 100) -
            Math.round((activeCampaignCount / campaigns.length) * 100),
          0,
        )
      : 0,
  };

  const requestCount = rescueRequests.length || rescuePaging?.totalCount || 0;
  const urgentRequestCount = rescueRequests.filter(
    (request) => Number(request.priority ?? 0) >= RescuePriorityLevel.High,
  ).length;

  const totalInventorySlots = inventories.reduce(
    (sum: number, inventory: any) => sum + Number(inventory.totalStockSlots || 0),
    0,
  );
  const criticalStockCount = inventories.reduce(
    (sum: number, inventory: any) => sum + Number(inventory.criticalCount || 0),
    0,
  );
  const totalTeamMembers = teams.reduce((sum, team) => sum + Number(team.totalMembers || 0), 0);

  const contributionPoints = filteredContributions.map((item) => ({
    createdAt: item.createdAt,
    amount: Number(item.amount || 0),
  }));
  const transactionPoints = filteredFundTransactions.map((item) => ({
    createdAt: item.createdAt,
    amount: Number(item.amount || 0),
  }));
  const allFundPoints = [...contributionPoints, ...transactionPoints];

  const donationByRange = {
    week: groupCurrencyByWeekday(allFundPoints, range),
    month: groupCurrencyByMonth(allFundPoints, range),
    year: groupCurrencyByMonth(allFundPoints, range),
    day: (() => {
      const buckets = Array.from({ length: 24 }, (_, hour) => ({ name: `${hour}:00`, value: 0 }));
      allFundPoints.forEach((item) => {
        if (!isWithinSelectedRange(item.createdAt, '7d')) return;
        const date = new Date(item.createdAt || '');
        if (Number.isNaN(date.getTime())) return;
        buckets[date.getHours()].value += Number(item.amount || 0);
      });
      return buckets;
    })(),
  };

  const requestByTime = groupRequestsByTime(rescueRequests, range);

  const activeCampaignTeams = activeCampaignTeamQueries.flatMap((query) =>
    ensureArray<any>(query.data),
  );
  const activeCampaignTeamMap = new Map<
    string,
    { campaignCount: number; teamName: string; memberCount: number }
  >();
  activeCampaignTeams.forEach((team: any) => {
    const current = activeCampaignTeamMap.get(team.teamId);
    if (current) {
      current.campaignCount += 1;
      current.memberCount = Math.max(current.memberCount, Number(team.memberCount || 0));
      return;
    }
    activeCampaignTeamMap.set(team.teamId, {
      campaignCount: 1,
      teamName: team.teamName || 'Đội phản ứng',
      memberCount: Number(team.memberCount || 0),
    });
  });

  const topTeams = Array.from(activeCampaignTeamMap.entries())
    .map(([teamId, summary]) => {
      const matchedTeam = teams.find((team) => team.teamId === teamId);
      return {
        id: teamId,
        name: summary.teamName,
        role:
          matchedTeam?.teamTypeName ||
          matchedTeam?.leaderName ||
          matchedTeam?.moderatorName ||
          'Đội đang hoạt động trong chiến dịch',
        statusLabel: `${summary.campaignCount} chiến dịch đang hoạt động`,
        memberCount: summary.memberCount || Number(matchedTeam?.totalMembers || 0),
        note: matchedTeam
          ? `Cập nhật ${formatDateVN(matchedTeam.updatedAt || matchedTeam.createdAt)}`
          : 'Đang tham gia chiến dịch cứu trợ',
        tone: 'ready' as const,
      };
    })
    .sort((a, b) => b.memberCount - a.memberCount)
    .slice(0, 4);

  const inventoryStats = [
    {
      label: 'Điểm chứa kho',
      value:
        totalInventorySlots > 0
          ? Math.min(
              Math.round((totalInventorySlots / Math.max(inventories.length * 100, 1)) * 100),
              100,
            )
          : 0,
      color: 'bg-primary',
      description: `${formatNumberVN(totalInventorySlots)} điểm chứa đang được sử dụng`,
    },
    {
      label: 'Mức thiếu hụt',
      value:
        totalInventorySlots > 0
          ? Math.min(Math.round((criticalStockCount / Math.max(totalInventorySlots, 1)) * 100), 100)
          : 0,
      color: 'bg-red-500',
      description: `${formatNumberVN(criticalStockCount)} điểm chứa đang ở ngưỡng cảnh báo`,
    },
    {
      label: 'Danh mục vật tư',
      value: Math.min(Math.round((supplyItems.length / 120) * 100), 100),
      color: 'bg-emerald-500',
      description: `${formatNumberVN(supplyItems.length)} loại vật tư đã cấu hình`,
    },
    {
      label: 'Kho đang hoạt động',
      value: inventories.length
        ? Math.min(Math.round((inventories.length / Math.max(stations.length, 1)) * 100), 100)
        : 0,
      color: 'bg-amber-500',
      description: `${formatNumberVN(inventories.length)} kho trên ${formatNumberVN(stations.length)} trạm`,
    },
  ];

  const activityFeed = [
    ...filteredContributions.slice(0, 3).map((item) => ({
      type: 'fund',
      icon: 'volunteer_activism',
      color: 'text-emerald-600 bg-emerald-500/10',
      title: `Ghi nhận ủng hộ ${formatCurrencyVN(Number(item.amount || 0))}`,
      subtitle: item.donorName?.trim() || item.campaignName || item.note || 'Nhà hảo tâm ẩn danh',
      time: item.createdAt,
    })),
    ...filteredFundTransactions.slice(0, 2).map((item) => ({
      type: 'transaction',
      icon: 'account_balance_wallet',
      color: 'text-sky-600 bg-sky-500/10',
      title: item.note || `Giao dịch quỹ ${formatCurrencyVN(Number(item.amount || 0))}`,
      subtitle:
        item.note?.trim() ||
        (item.createdBy && item.createdBy !== '1' ? item.createdBy : '') ||
        item.type ||
        'Hệ thống quỹ',
      time: item.createdAt,
    })),
    ...transferItems.slice(0, 2).map((item: any) => ({
      type: 'transfer',
      icon: 'swap_horiz',
      color: 'text-violet-600 bg-violet-500/10',
      title: `Phiếu chuyển hàng ${item.transferCode || item.id}`,
      subtitle: item.destinationStationName || item.sourceStationName || 'Điều phối kho',
      time: item.createdAt,
    })),
  ]
    .sort((a, b) => new Date(b.time || 0).getTime() - new Date(a.time || 0).getTime())
    .slice(0, 6);

  const requestHighlights = [...rescueRequests]
    .sort((a, b) => Number(b.priority || 0) - Number(a.priority || 0))
    .slice(0, 5)
    .map((request) => ({
      id: getRequestId(request),
      title: request.address || request.description || 'Yêu cầu cứu hộ mới',
      subtitle: `${getRescueRequestTypeLabel(request.rescueRequestType)} • ${formatDateTimeVN(request.createdAt)}`,
      priorityLabel: getPriorityLabel(request.priority),
      priorityClass: getPriorityClass(request.priority),
      statusLabel: getRequestStatusLabel(request),
      statusClass: getRequestStatusClass(request),
      reporter: request.reporterFullName || undefined,
    }));

  const upcomingCampaigns = [...campaigns]
    .sort((a, b) => new Date(a.endDate || 0).getTime() - new Date(b.endDate || 0).getTime())
    .slice(0, 5)
    .map((campaign) => ({
      id: campaign.campaignId,
      name: campaign.name,
      endDate: formatDateVN(campaign.endDate),
      progress:
        typeof campaign.overallProgressPercent === 'number'
          ? `${Math.round(campaign.overallProgressPercent)}%`
          : 'Chưa có',
      statusClass: getCampaignStatusClass(parseEnumValue(campaign.status)),
      statusLabel: getCampaignStatusLabel(campaign.status),
    }));

  const logisticsOverview = {
    transferCount: transferItems.length,
    sessionCount: 0,
    pendingTransferCount: transferItems.filter(
      (item: any) => parseEnumValue(item.status) === SupplyTransferStatus.Pending,
    ).length,
    inProgressSessionCount: sessionItems.filter(
      (item: any) => parseEnumValue(item.status) === DistributionSessionStatus.InProgress,
    ).length,
    cards: [
      {
        label: 'Phiếu chuyển hàng',
        value: formatNumberVN(transferItems.length),
        note: `${formatNumberVN(
          transferItems.filter(
            (item: any) => parseEnumValue(item.status) === SupplyTransferStatus.Pending,
          ).length,
        )} phiếu chờ duyệt / xác nhận`,
        icon: 'swap_horiz',
        color: 'text-violet-600 bg-violet-500/10',
      },
      {
        label: 'Vận chuyển hoàn thành',
        value: formatNumberVN(
          transferItems.filter(
            (item: any) => parseEnumValue(item.status) === 4, // Received
          ).length,
        ),
        note: 'Các chuyến hàng đã cập bến thành công',
        icon: 'inventory_2',
        color: 'text-emerald-600 bg-emerald-500/10',
      },
    ],
  };

  const widgets = {
    donation: {
      isLoading: fundContributionsQuery.isLoading || fundSummaryQuery.isLoading,
      isError: fundContributionsQuery.isError || fundSummaryQuery.isError,
      retry: async () =>
        Promise.all([fundContributionsQuery.refetch(), fundSummaryQuery.refetch()]),
    },
    requestsChart: {
      isLoading: rescueRequestsQuery.isLoading,
      isError: rescueRequestsQuery.isError,
      retry: () => rescueRequestsQuery.refetch(),
    },
    alerts: {
      isLoading:
        campaignsQuery.isLoading ||
        inventoriesQuery.isLoading ||
        teamsQuery.isLoading ||
        usersQuery.isLoading,
      isError:
        campaignsQuery.isError ||
        inventoriesQuery.isError ||
        teamsQuery.isError ||
        usersQuery.isError,
      retry: async () =>
        Promise.all([
          campaignsQuery.refetch(),
          inventoriesQuery.refetch(),
          teamsQuery.refetch(),
          usersQuery.refetch(),
        ]),
    },
    requestHighlights: {
      isLoading: rescueRequestsQuery.isLoading,
      isError: rescueRequestsQuery.isError,
      retry: () => rescueRequestsQuery.refetch(),
    },
    teamOverview: {
      isLoading: teamsQuery.isLoading || activeCampaignTeamQueries.some((query) => query.isLoading),
      isError: teamsQuery.isError || activeCampaignTeamQueries.some((query) => query.isError),
      retry: async () => {
        await teamsQuery.refetch();
        await Promise.all(activeCampaignTeamQueries.map((query) => query.refetch()));
      },
    },
    inventory: {
      isLoading:
        inventoriesQuery.isLoading || supplyItemsQuery.isLoading || stationsQuery.isLoading,
      isError: inventoriesQuery.isError || supplyItemsQuery.isError || stationsQuery.isError,
      retry: async () =>
        Promise.all([
          inventoriesQuery.refetch(),
          supplyItemsQuery.refetch(),
          stationsQuery.refetch(),
        ]),
    },
    campaigns: {
      isLoading: campaignsQuery.isLoading,
      isError: campaignsQuery.isError,
      retry: () => campaignsQuery.refetch(),
    },
    activity: {
      isLoading:
        fundContributionsQuery.isLoading ||
        fundTransactionsQuery.isLoading ||
        transfersQuery.isLoading,
      isError:
        fundContributionsQuery.isError || fundTransactionsQuery.isError || transfersQuery.isError,
      retry: async () =>
        Promise.all([
          fundContributionsQuery.refetch(),
          fundTransactionsQuery.refetch(),
          transfersQuery.refetch(),
        ]),
    },
    logistics: {
      isLoading: transfersQuery.isLoading || false,
      isError: transfersQuery.isError || false,
      retry: async () => Promise.all([transfersQuery.refetch(), Promise.resolve()]),
    },
    infrastructure: {
      isLoading:
        stationsQuery.isLoading ||
        usersQuery.isLoading ||
        supplyItemsQuery.isLoading ||
        teamsQuery.isLoading,
      isError:
        stationsQuery.isError ||
        usersQuery.isError ||
        supplyItemsQuery.isError ||
        teamsQuery.isError,
      retry: async () =>
        Promise.all([
          stationsQuery.refetch(),
          usersQuery.refetch(),
          supplyItemsQuery.refetch(),
          teamsQuery.refetch(),
        ]),
    },
  };

  const systemAlerts = [
    {
      icon: 'campaign',
      color: 'text-sky-600 bg-sky-500/10',
      title: `${activeCampaignCount} chiến dịch đang hoạt động`,
      note: `${completedCampaignCount} chiến dịch đã hoàn thành • ${pendingCampaignCount} chiến dịch chờ xử lý`,
    },
    {
      icon: 'inventory_2',
      color: 'text-red-600 bg-red-500/10',
      title: `${criticalStockCount} điểm tồn kho ở mức cảnh báo`,
      note: `${totalInventorySlots} điểm chứa đang được giám sát trên toàn hệ thống`,
    },
    {
      icon: 'groups',
      color: 'text-violet-600 bg-violet-500/10',
      title: `${teams.length} đội đang vận hành`,
      note: `${teams.filter((team) => parseEnumValue(team.status) === TeamStatus.Active).length} đội đang sẵn sàng • ${formatNumberVN(totalTeamMembers)} thành viên`,
    },
    {
      icon: 'fact_check',
      color: 'text-amber-600 bg-amber-500/10',
      title: `${users.length} người dùng trong hệ thống`,
      note: `${stations.length} trạm cứu trợ • ${supplyItems.length} danh mục vật tư đã cấu hình`,
    },
  ];

  return {
    isLoading,
    hasError,
    formatCurrencyVN,
    formatDateVN,
    formatDateTimeVN,
    metrics: {
      requestCount,
      urgentRequestCount,
      activeCampaignCount,
      completedCampaignCount,
      pendingCampaignCount,
      fundBalance: Number(fundSummary?.totalBalance || 0),
      contributionCount: Number(fundSummary?.totalContributionCount || 0),
      criticalStockCount,
      totalInventorySlots,
      usersCount: users.length,
      stationsCount: stations.length,
      teamsCount: teams.length,
      totalTeamMembers,
      supplyItemsCount: supplyItems.length,
      transferCount: transferItems.length,
      sessionCount: 0,
      pendingTransferCount: logisticsOverview.pendingTransferCount,
      inProgressSessionCount: logisticsOverview.inProgressSessionCount,
      fundSourceCampaigns: Number(fundSummary?.totalSourceCampaigns || 0),
    },
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
    retryAll,
  };
}
