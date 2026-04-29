import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import type { CampaignAssignedVehicle } from '@/services/campaignService';
import { ReliefPaginationBar } from './ReliefPaginationBar';
import type {
  IsolatedHouseholdPlanItemResponse,
  ReliefCampaignPlanSummaryResponse,
  ReliefPlanAreaSummaryResponse,
} from '@/services/reliefDistributionService';

const normalizeAddressText = (value?: string | null) =>
  (value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9,\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const splitAddressSegments = (value?: string | null) =>
  normalizeAddressText(value)
    .split(',')
    .map((segment) => segment.trim())
    .filter(Boolean);

const getPriorityAddressSegments = (value?: string | null) => {
  const segments = splitAddressSegments(value);
  if (segments.length <= 2) return segments;
  return segments.slice(-3);
};

const getAddressClusterKey = (value?: string | null) => {
  const prioritySegments = getPriorityAddressSegments(value);
  if (prioritySegments.length === 0) return normalizeAddressText(value);
  return prioritySegments.join(', ');
};

const matchesClusterKey = (value?: string | null, clusterKey?: string | null) => {
  const normalizedValue = normalizeAddressText(value);
  if (!normalizedValue || !clusterKey) return false;

  return clusterKey
    .split(',')
    .map((segment) => segment.trim())
    .filter(Boolean)
    .every((segment) => normalizedValue.includes(segment));
};

type GroupedAreaSummary = {
  key: string;
  clusterLabel: string;
  area: ReliefPlanAreaSummaryResponse;
  sourceAreaCount: number;
  matchedHouseholdCount: number;
  matchedHouseholds: IsolatedHouseholdPlanItemResponse[];
};

export function CoordinatorReliefPlanSummaryCard({
  planSummary,
  campaignVehicles = [],
}: {
  planSummary?: ReliefCampaignPlanSummaryResponse | null;
  campaignVehicles?: CampaignAssignedVehicle[];
}) {
  const [expandedAreaKeys, setExpandedAreaKeys] = useState<Set<string>>(new Set());
  const [showIsolatedHouseholds, setShowIsolatedHouseholds] = useState(
    (planSummary?.isolatedHouseholds ?? 0) > 10,
  );
  const [isolatedHouseholdsPage, setIsolatedHouseholdsPage] = useState(1);
  const [groupedAreasPage, setGroupedAreasPage] = useState(1);

  if (!planSummary) return null;

  const toggleExpandedArea = (key: string) => {
    setExpandedAreaKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const groupedAreas = Array.from(
    planSummary.areas.reduce((acc, area) => {
      const clusterLabel = area.matchedLocationName || area.areaName;
      const clusterKey =
        getAddressClusterKey(clusterLabel) || `${area.areaName}-${area.locationId || 'na'}`;
      const matchedHouseholds = planSummary.isolatedHouseholdItems.filter((item) =>
        matchesClusterKey(item.address, clusterKey),
      );

      const existing = acc.get(clusterKey);
      if (!existing) {
        acc.set(clusterKey, {
          key: clusterKey,
          clusterLabel,
          area: { ...area },
          sourceAreaCount: 1,
          matchedHouseholdCount: matchedHouseholds.length,
          matchedHouseholds,
        } satisfies GroupedAreaSummary);
        return acc;
      }

      const mergedHouseholds = new Map(
        [...existing.matchedHouseholds, ...matchedHouseholds].map((item) => [
          item.campaignHouseholdId,
          item,
        ]),
      );

      existing.area = {
        ...existing.area,
        householdCount: existing.area.householdCount + area.householdCount,
        isolatedHouseholdCount: existing.area.isolatedHouseholdCount + area.isolatedHouseholdCount,
        population: existing.area.population + area.population,
        pendingHouseholds: existing.area.pendingHouseholds + area.pendingHouseholds,
        suggestedDistributionPointCount:
          existing.area.suggestedDistributionPointCount + area.suggestedDistributionPointCount,
        suggestedMobileTeamCount:
          existing.area.suggestedMobileTeamCount + area.suggestedMobileTeamCount,
        suggestedTeamCount: existing.area.suggestedTeamCount + area.suggestedTeamCount,
        estimatedPackages: existing.area.estimatedPackages + area.estimatedPackages,
        estimatedBoatCount: existing.area.estimatedBoatCount + area.estimatedBoatCount,
        estimatedLifeJacketCount:
          existing.area.estimatedLifeJacketCount + area.estimatedLifeJacketCount,
        suggestedPeoplePerTeam: Math.max(
          existing.area.suggestedPeoplePerTeam,
          area.suggestedPeoplePerTeam,
        ),
        suggestedPeoplePerDistributionPointLine: Math.max(
          existing.area.suggestedPeoplePerDistributionPointLine,
          area.suggestedPeoplePerDistributionPointLine,
        ),
        averageHouseholdSize: Math.max(
          existing.area.averageHouseholdSize,
          area.averageHouseholdSize,
        ),
        estimatedCoverageRadiusKm: Math.max(
          existing.area.estimatedCoverageRadiusKm,
          area.estimatedCoverageRadiusKm,
        ),
        populationDensity: Math.max(existing.area.populationDensity, area.populationDensity),
      };
      existing.sourceAreaCount += 1;
      existing.matchedHouseholds = Array.from(mergedHouseholds.values());
      existing.matchedHouseholdCount = existing.matchedHouseholds.length;
      return acc;
    }, new Map<string, GroupedAreaSummary>()),
  )
    .map(([, groupedArea]) => groupedArea)
    .sort((left, right) => right.matchedHouseholdCount - left.matchedHouseholdCount);

  const groupedAreasWithTeams = groupedAreas.map((groupedArea) => {
    const teamIds = Array.from(
      new Set(groupedArea.matchedHouseholds.map((item) => item.campaignTeamId).filter(Boolean)),
    ) as string[];
    const teams = Array.from(
      new Map(
        groupedArea.matchedHouseholds
          .filter((item) => item.campaignTeamId)
          .map((item) => [item.campaignTeamId as string, item.campaignTeamName || 'Chưa rõ đội']),
      ).entries(),
    ).map(([campaignTeamId, campaignTeamName]) => ({ campaignTeamId, campaignTeamName }));

    const vehicles = campaignVehicles.filter(
      (vehicle) => vehicle.campaignTeamId && teamIds.includes(vehicle.campaignTeamId),
    );

    return {
      ...groupedArea,
      teams,
      vehicles,
    };
  });

  const ISOLATED_HOUSEHOLDS_PAGE_SIZE = 4;
  const GROUPED_AREAS_PAGE_SIZE = 6;
  const totalGroupedAreasPages = Math.max(
    1,
    Math.ceil(groupedAreasWithTeams.length / GROUPED_AREAS_PAGE_SIZE),
  );
  const effectiveGroupedAreasPage = Math.min(groupedAreasPage, totalGroupedAreasPages);
  const paginatedGroupedAreas = groupedAreasWithTeams.slice(
    (effectiveGroupedAreasPage - 1) * GROUPED_AREAS_PAGE_SIZE,
    effectiveGroupedAreasPage * GROUPED_AREAS_PAGE_SIZE,
  );
  const totalIsolatedHouseholdsPages = Math.max(
    1,
    Math.ceil(planSummary.isolatedHouseholdItems.length / ISOLATED_HOUSEHOLDS_PAGE_SIZE),
  );
  const paginatedIsolatedHouseholds = planSummary.isolatedHouseholdItems.slice(
    (Math.min(isolatedHouseholdsPage, totalIsolatedHouseholdsPages) - 1) *
      ISOLATED_HOUSEHOLDS_PAGE_SIZE,
    (Math.min(isolatedHouseholdsPage, totalIsolatedHouseholdsPages) - 1) *
      ISOLATED_HOUSEHOLDS_PAGE_SIZE +
      ISOLATED_HOUSEHOLDS_PAGE_SIZE,
  );

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-foreground">
              Kế hoạch cứu trợ chung toàn chiến dịch
            </h3>
            <p className="text-sm text-muted-foreground">
              Đây là lớp kế hoạch tổng thể cho toàn bộ hộ dân trong phạm vi chiến dịch/tỉnh đang
              theo dõi, gồm cả hộ cô lập và không cô lập. Các khu vực bên dưới chỉ là phân rã để
              điều phối đội, phương tiện và vật tư.
            </p>
            <p className="text-sm text-muted-foreground">
              <i>
                Chỉ ở mức độ tham khảo và không phải là kế hoạch chính thức. Dựa trên dữ liệu đã có
                trong hệ thống để tính toán, gợi ý và đưa ra hướng giải quyết hiệu quả nhất.
              </i>
            </p>
          </div>
          <Badge variant="info" className="max-w-full whitespace-normal break-words text-right">
            {planSummary.suggestedTeamCount} đội gợi ý
          </Badge>
        </div>
        <div className="mb-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-xl border bg-muted/20 p-3 text-sm text-muted-foreground">
            <p className="text-xs uppercase tracking-wide">Mật độ TB</p>
            <p className="mt-1 text-lg font-semibold text-foreground">
              {Math.round(planSummary.averagePopulationDensity || 0)}
            </p>
          </div>
          <div className="rounded-xl border bg-muted/20 p-3 text-sm text-muted-foreground">
            <p className="text-xs uppercase tracking-wide">Người / đội</p>
            <p className="mt-1 text-lg font-semibold text-foreground">
              {planSummary.suggestedPeoplePerTeam || 0}
            </p>
          </div>
          <div className="rounded-xl border bg-muted/20 p-3 text-sm text-muted-foreground">
            <p className="text-xs uppercase tracking-wide">Người / line</p>
            <p className="mt-1 text-lg font-semibold text-foreground">
              {planSummary.suggestedPeoplePerDistributionPointLine || 0}
            </p>
          </div>
          <div className="rounded-xl border bg-muted/20 p-3 text-sm text-muted-foreground">
            <p className="text-xs uppercase tracking-wide">Khu vực cơ động</p>
            <p className="mt-1 text-lg font-semibold text-foreground">
              {planSummary.mobileTeamPriorityAreaCount}
            </p>
          </div>
        </div>
        <div className="mb-4 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">
          <p className="font-medium">Tổng quan điều phối cấp tỉnh / toàn chiến dịch</p>
          <p className="mt-1 text-sky-800/90">
            Tổng hộ: <strong>{planSummary.totalHouseholds}</strong> · Hộ cô lập:{' '}
            <strong>{planSummary.isolatedHouseholds}</strong> · Tổng dân số:{' '}
            <strong>{planSummary.totalPopulation}</strong> · Nhân lực dự kiến:{' '}
            <strong>{planSummary.estimatedReliefPersonnel}</strong> · Xuồng/ghe dự kiến:{' '}
            <strong>{planSummary.estimatedBoatCount}</strong> · Áo phao dự kiến:{' '}
            <strong>{planSummary.estimatedLifeJacketCount}</strong>
          </p>
        </div>
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <h4 className="text-base font-semibold text-foreground">
              Phân rã theo khu vực điều phối
            </h4>
            <p className="text-sm text-muted-foreground">
              Dùng để chia nhỏ kế hoạch tổng thành các cụm/khu vực phục vụ việc mở điểm phát hoặc tổ
              chức đội cơ động.
            </p>
          </div>
          <Badge variant="outline" className="max-w-full whitespace-normal break-words">
            {groupedAreasWithTeams.length} cụm địa chỉ
          </Badge>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {paginatedGroupedAreas.map(({ key, area, clusterLabel }) => {
            const areaKey = key;
            const isExpanded = expandedAreaKeys.has(areaKey);

            return (
              <div
                key={areaKey}
                role="button"
                tabIndex={0}
                className="rounded-xl border bg-muted/20 p-4 text-left transition-colors hover:bg-muted/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                onClick={() => toggleExpandedArea(areaKey)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    toggleExpandedArea(areaKey);
                  }
                }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-foreground">{clusterLabel}</p>
                    <p className="text-xs text-muted-foreground">
                      {area.householdCount} hộ · {area.population} người ·{' '}
                      {area.isolatedHouseholdCount} cô lập
                    </p>
                    <p className="text-xs text-muted-foreground">Cụm địa chỉ: {clusterLabel}</p>
                  </div>
                  <Badge
                    variant={
                      area.recommendedOperationalMode.includes('điểm phát')
                        ? 'warning'
                        : 'destructive'
                    }
                    className="max-w-full whitespace-normal break-words text-center"
                  >
                    {area.recommendedOperationalMode}
                  </Badge>
                </div>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                    <span>{Math.round(area.populationDensity || 0)} mật độ</span>
                    <span>·</span>
                    <span>{area.suggestedDistributionPointCount} điểm phát gợi ý</span>
                    <span>·</span>
                    <span>{area.suggestedMobileTeamCount} đội cơ động</span>
                  </div>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      toggleExpandedArea(areaKey);
                    }}
                    className="inline-flex items-center gap-1 text-sm font-medium text-primary transition-colors hover:text-primary/80"
                  >
                    {isExpanded ? 'Thu gọn chi tiết' : 'Xem chi tiết'}
                    <span className="material-symbols-outlined text-[18px]">
                      {isExpanded ? 'expand_less' : 'expand_more'}
                    </span>
                  </button>
                </div>
                {isExpanded && (
                  <>
                    <div className="mt-3 space-y-1 text-sm text-muted-foreground">
                      <p>Tổng hộ: {area.householdCount}</p>
                      <p>
                        Hộ không cô lập:{' '}
                        {Math.max(0, area.householdCount - area.isolatedHouseholdCount)}
                      </p>
                      <p>Hộ cô lập: {area.isolatedHouseholdCount}</p>
                      <p>Mật độ dân số: {Math.round(area.populationDensity || 0)}</p>
                      <p>BQ người/hộ: {area.averageHouseholdSize || 0}</p>
                      <p>Độ phân tán: {area.estimatedCoverageRadiusKm || 0} km</p>
                      <p>Độ phức tạp: {area.travelComplexityLabel}</p>
                      <p>Người / đội: {area.suggestedPeoplePerTeam || 0}</p>
                      <p>Người / line: {area.suggestedPeoplePerDistributionPointLine || 0}</p>
                      <p>Điểm phát gợi ý: {area.suggestedDistributionPointCount}</p>
                      <p>Đội cơ động gợi ý: {area.suggestedMobileTeamCount}</p>
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
        {totalGroupedAreasPages > 1 && (
          <ReliefPaginationBar
            currentPage={effectiveGroupedAreasPage}
            totalPages={totalGroupedAreasPages}
            onPrevious={() => setGroupedAreasPage((prev) => Math.max(1, prev - 1))}
            onNext={() => setGroupedAreasPage((prev) => Math.min(totalGroupedAreasPages, prev + 1))}
          />
        )}
      </div>

      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-foreground">
              Danh sách hộ cô lập cần tiếp cận trong toàn chiến dịch
            </h3>
            <p className="text-sm text-muted-foreground">
              Danh sách cần đội cơ động, xuồng hoặc người dẫn đường để tiếp cận trong suốt chiến
              dịch.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="max-w-full whitespace-normal break-words">
              {planSummary.isolatedHouseholdItems.length} hộ cô lập
            </Badge>
            <button
              type="button"
              onClick={() => setShowIsolatedHouseholds((prev) => !prev)}
              className="inline-flex items-center gap-1 text-sm font-medium text-primary transition-colors hover:text-primary/80"
            >
              {showIsolatedHouseholds ? 'Ẩn chi tiết' : 'Xem chi tiết'}
              <span className="material-symbols-outlined text-[18px]">
                {showIsolatedHouseholds ? 'expand_less' : 'expand_more'}
              </span>
            </button>
          </div>
        </div>
        {showIsolatedHouseholds && (
          <div className="mt-4 space-y-3">
            {paginatedIsolatedHouseholds.map((item) => (
              <div key={item.campaignHouseholdId} className="rounded-xl border bg-muted/20 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-foreground">
                      {item.householdCode} · {item.headOfHouseholdName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {item.address || 'Chưa có địa chỉ'}
                    </p>
                    {item.campaignTeamName && (
                      <p className="text-xs text-muted-foreground">
                        Đội phụ trách: {item.campaignTeamName}
                      </p>
                    )}
                  </div>
                  <Badge
                    variant="destructive"
                    className="max-w-full whitespace-normal break-words text-center"
                  >
                    {item.priorityLabel}
                  </Badge>
                </div>
                <div className="mt-3 flex flex-wrap gap-2 text-xs">
                  <Badge variant="outline" className="max-w-full whitespace-normal break-words">
                    {item.householdSize} người
                  </Badge>
                  <Badge variant="outline" className="max-w-full whitespace-normal break-words">
                    Mức ngập: {item.floodSeverityLevel ?? 0}
                  </Badge>
                  <Badge variant="outline" className="max-w-full whitespace-normal break-words">
                    Mức cô lập: {item.isolationSeverityLevel ?? 0}
                  </Badge>
                  {item.requiresBoat && (
                    <Badge variant="warning" className="max-w-full whitespace-normal break-words">
                      Cần xuồng
                    </Badge>
                  )}
                  {item.requiresLocalGuide && (
                    <Badge variant="info" className="max-w-full whitespace-normal break-words">
                      Cần dẫn đường
                    </Badge>
                  )}
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{item.suggestedSupportMode}</p>
              </div>
            ))}
            {planSummary.isolatedHouseholdItems.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Không có hộ cô lập trong campaign hiện tại.
              </p>
            )}
            {totalIsolatedHouseholdsPages > 1 && (
              <div className="flex items-center justify-between gap-3 pt-2 text-sm text-muted-foreground">
                <span>
                  Trang {Math.min(isolatedHouseholdsPage, totalIsolatedHouseholdsPages)}/
                  {totalIsolatedHouseholdsPages}
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="rounded-lg border px-3 py-2 transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={isolatedHouseholdsPage <= 1}
                    onClick={() => setIsolatedHouseholdsPage((prev) => Math.max(1, prev - 1))}
                  >
                    Trang trước
                  </button>
                  <button
                    type="button"
                    className="rounded-lg border px-3 py-2 transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={isolatedHouseholdsPage >= totalIsolatedHouseholdsPages}
                    onClick={() =>
                      setIsolatedHouseholdsPage((prev) =>
                        Math.min(totalIsolatedHouseholdsPages, prev + 1),
                      )
                    }
                  >
                    Trang sau
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
