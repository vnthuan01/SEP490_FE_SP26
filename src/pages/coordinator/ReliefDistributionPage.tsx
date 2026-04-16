import { useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { CheckedState } from '@radix-ui/react-checkbox';
import { useNavigate } from 'react-router-dom';
import { parseApiError, pickFieldError } from '@/lib/apiErrors';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { coordinatorNavGroups } from './components/sidebarConfig';
import { useMyReliefStation } from '@/hooks/useReliefStation';
import { useCampaigns, useCampaignTeams } from '@/hooks/useCampaigns';
import { useProvinces } from '@/hooks/useLocations';
import { useInventories, useInventoryStocks } from '@/hooks/useInventory';
import { handleHookError } from '@/hooks/hookErrorUtils';
import {
  RELIEF_DISTRIBUTION_KEYS,
  useCreateDistributionPoint,
  useCreateReliefPackage,
  usePackageAssemblyHistoryByStation,
  useReliefChecklist,
  useDistributionPoints,
  useReliefHouseholds,
  useReliefPackages,
} from '@/hooks/useReliefDistribution';
import { CampaignStatus, CampaignType, DeliveryMode } from '@/enums/beEnums';
import { reliefDistributionService } from '@/services/reliefDistributionService';
import { CoordinatorReliefDistributionPageHeader } from './components/relief-distribution/CoordinatorReliefDistributionPageHeader';
import { CoordinatorReliefDistributionSetupSteps } from './components/relief-distribution/CoordinatorReliefDistributionSetupSteps';
import { CoordinatorReliefDistributionAssignmentStep } from './components/relief-distribution/CoordinatorReliefDistributionAssignmentStep';
import { CoordinatorDistributionPointsMap } from './components/relief-distribution/CoordinatorDistributionPointsMap';
import { StatCard } from '@/pages/manager/components/ManagerInventoryShared';
import type {
  CoordinatorAssignForm,
  CoordinatorDistributionPointForm,
  CoordinatorPackageForm,
  CoordinatorPackageItemForm,
} from './components/relief-distribution/types';

const createDefaultDistributionPointForm = (station?: {
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  locationId?: string | null;
}) => ({
  name: '',
  locationId: station?.locationId || '',
  address: station?.address || '',
  latitude: Number(station?.latitude) || 16.0544,
  longitude: Number(station?.longitude) || 108.2022,
  startsAt: new Date().toISOString(),
  endsAt: '',
  isActive: true,
});

const createDefaultPackageForm = (): CoordinatorPackageForm => ({
  name: '',
  description: '',
  isDefault: true,
  isActive: true,
  items: [{ supplyItemId: '', quantity: 1, unit: '' }],
});

const HOUSEHOLDS_PER_PAGE = 10;
const DISTRIBUTION_SECTION_ID = 'coordinator-relief-step-1';
const PACKAGE_SECTION_ID = 'coordinator-relief-step-2';
const ASSIGNMENT_SECTION_ID = 'coordinator-relief-step-3';

const scrollToSection = (sectionId: string) => {
  if (typeof document === 'undefined') return;
  document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

const formatDateTimeVN = (value?: string | null) => {
  if (!value) return 'Chưa cập nhật';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'Chưa cập nhật';
  return parsed.toLocaleString('vi-VN');
};

export default function ReliefDistributionPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [selectedCampaignId, setSelectedCampaignId] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedHouseholdIds, setSelectedHouseholdIds] = useState<Set<string>>(new Set());
  const [householdSearch, setHouseholdSearch] = useState('');
  const [assignmentFilter, setAssignmentFilter] = useState<'all' | 'assigned' | 'unassigned'>(
    'all',
  );
  const [distributionPointForm, setDistributionPointForm] =
    useState<CoordinatorDistributionPointForm>(createDefaultDistributionPointForm());
  const [packageForm, setPackageForm] = useState<CoordinatorPackageForm>(
    createDefaultPackageForm(),
  );
  const [assignForm, setAssignForm] = useState<CoordinatorAssignForm>({
    campaignTeamId: '',
    reliefPackageDefinitionId: '',
    scheduledAt: new Date().toISOString(),
    notes: '',
  });
  const [distributionPointErrors, setDistributionPointErrors] = useState<Record<string, string>>(
    {},
  );
  const [packageErrors, setPackageErrors] = useState<Record<string, string>>({});
  const [assignErrors, setAssignErrors] = useState<Record<string, string>>({});

  const { station } = useMyReliefStation();
  const { campaigns } = useCampaigns({
    pageIndex: 1,
    pageSize: 200,
    locationId: station?.locationId,
    type: CampaignType.Relief,
  });
  const reliefCampaigns = useMemo(
    () =>
      campaigns.filter((campaign) =>
        [
          CampaignStatus.Draft,
          CampaignStatus.Active,
          CampaignStatus.ReadyToExecute,
          CampaignStatus.InProgress,
        ].some((status) => status === Number(campaign.status)),
      ),
    [campaigns],
  );
  const effectiveSelectedCampaignId = useMemo(() => {
    if (
      selectedCampaignId &&
      reliefCampaigns.some((campaign) => campaign.campaignId === selectedCampaignId)
    ) {
      return selectedCampaignId;
    }

    if (!selectedCampaignId && reliefCampaigns.length === 1) {
      return reliefCampaigns[0].campaignId;
    }

    return '';
  }, [reliefCampaigns, selectedCampaignId]);

  const { teams } = useCampaignTeams(effectiveSelectedCampaignId);
  const { data: households = [] } = useReliefHouseholds(effectiveSelectedCampaignId);
  const { data: checklist = [] } = useReliefChecklist(effectiveSelectedCampaignId);
  const { data: distributionPoints = [] } = useDistributionPoints(effectiveSelectedCampaignId);
  const { data: packages = [] } = useReliefPackages(effectiveSelectedCampaignId);
  const { data: provinces = [] } = useProvinces();
  const { data: inventoriesData } = useInventories({
    reliefStationId: station?.reliefStationId,
    pageIndex: 1,
    pageSize: 20,
  });
  const selectedInventoryId = inventoriesData?.items?.[0]?.inventoryId || '';
  const { data: inventoryStocksData } = useInventoryStocks(selectedInventoryId, {
    pageIndex: 1,
    pageSize: 200,
  });
  const { data: packageAssemblyHistory = [] } = usePackageAssemblyHistoryByStation(
    effectiveSelectedCampaignId,
    station?.reliefStationId || '',
  );

  const createPointMutation = useCreateDistributionPoint();
  const createPackageMutation = useCreateReliefPackage();

  const supplyItems = useMemo(
    () =>
      (inventoryStocksData?.items ?? []).map((stock) => ({
        id: stock.supplyItemId,
        name: stock.supplyItemName,
        unit: stock.supplyItemUnit,
        categoryName: stock.supplyItemCategoryName,
        category: stock.supplyItemCategoryName,
        availableQuantity: stock.currentQuantity,
      })),
    [inventoryStocksData?.items],
  );

  const headerStationName = station?.name || '';
  const headerLocationName = station?.locationName || '';
  const selectedPointLocationName =
    provinces.find((province) => province.id === distributionPointForm.locationId)?.fullName || '';

  const teamNameById = useMemo(
    () => Object.fromEntries(teams.map((team) => [team.campaignTeamId, team.teamName])),
    [teams],
  );

  const filteredHouseholds = useMemo(() => {
    const normalizedSearch = householdSearch.trim().toLowerCase();

    return households.filter((household) => {
      const matchesSearch =
        !normalizedSearch ||
        household.householdCode.toLowerCase().includes(normalizedSearch) ||
        household.headOfHouseholdName.toLowerCase().includes(normalizedSearch);

      const isAssigned = Boolean(household.campaignTeamId);
      const matchesAssignment =
        assignmentFilter === 'all' ||
        (assignmentFilter === 'assigned' && isAssigned) ||
        (assignmentFilter === 'unassigned' && !isAssigned);

      return matchesSearch && matchesAssignment;
    });
  }, [assignmentFilter, householdSearch, households]);

  const totalPages = Math.max(1, Math.ceil(filteredHouseholds.length / HOUSEHOLDS_PER_PAGE));
  const paginatedHouseholds = useMemo(() => {
    const start = (currentPage - 1) * HOUSEHOLDS_PER_PAGE;
    return filteredHouseholds.slice(start, start + HOUSEHOLDS_PER_PAGE);
  }, [currentPage, filteredHouseholds]);

  const selectedHouseholds = useMemo(
    () => households.filter((household) => selectedHouseholdIds.has(household.campaignHouseholdId)),
    [households, selectedHouseholdIds],
  );

  const hasPickupHouseholds = selectedHouseholds.some(
    (household) => Number(household.deliveryMode) === DeliveryMode.PickupAtPoint,
  );
  const defaultDistributionPointId = distributionPoints[0]?.distributionPointId;
  const allPageSelected =
    paginatedHouseholds.length > 0 &&
    paginatedHouseholds.every((household) =>
      selectedHouseholdIds.has(household.campaignHouseholdId),
    );

  const safeCurrentPage = Math.min(currentPage, totalPages);
  const effectiveAssignForm = useMemo(
    () => ({
      ...assignForm,
      campaignTeamId: teams.some((team) => team.campaignTeamId === assignForm.campaignTeamId)
        ? assignForm.campaignTeamId
        : '',
    }),
    [assignForm, teams],
  );

  const updateDistributionPointForm = (
    updater: (prev: CoordinatorDistributionPointForm) => CoordinatorDistributionPointForm,
  ) => {
    setDistributionPointForm((prev) => {
      const next = updater(prev);
      setDistributionPointErrors((current) => {
        const updated = { ...current };
        if (next.name.trim()) delete updated.name;
        if (next.address.trim()) delete updated.address;
        if (next.locationId.trim()) delete updated.locationId;
        if (next.startsAt) delete updated.startsAt;
        if (!next.endsAt || next.endsAt >= next.startsAt) delete updated.endsAt;
        return updated;
      });
      return next;
    });
  };

  const updatePackageForm = (updater: (prev: CoordinatorPackageForm) => CoordinatorPackageForm) => {
    setPackageForm((prev) => {
      const next = updater(prev);
      setPackageErrors((current) => {
        const updated = { ...current };
        if (next.name.trim()) delete updated.name;
        if (next.description.trim()) delete updated.description;
        next.items.forEach((item, index) => {
          if (item.supplyItemId) delete updated[`items.${index}.supplyItemId`];
          if (item.quantity > 0) delete updated[`items.${index}.quantity`];
          if (item.unit.trim()) delete updated[`items.${index}.unit`];
        });
        if (!Object.keys(updated).some((key) => key.startsWith('items.'))) delete updated.items;
        return updated;
      });
      return next;
    });
  };

  const updatePackageItem = (index: number, patch: Partial<CoordinatorPackageItemForm>) => {
    updatePackageForm((prev) => ({
      ...prev,
      items: prev.items.map((item, itemIndex) =>
        itemIndex === index
          ? { ...item, ...patch, quantity: patch.quantity ?? item.quantity }
          : item,
      ),
    }));
  };

  const removePackageItem = (index: number) => {
    updatePackageForm((prev) => ({
      ...prev,
      items:
        prev.items.length === 1
          ? prev.items
          : prev.items.filter((_, itemIndex) => itemIndex !== index),
    }));
  };

  const handleCreatePoint = async () => {
    if (!selectedCampaignId || !station?.reliefStationId) return;
    const clientErrors: Record<string, string> = {};

    if (!distributionPointForm.name.trim()) clientErrors.name = 'Vui lòng nhập tên điểm phát.';
    if (!distributionPointForm.address.trim())
      clientErrors.address = 'Vui lòng chọn địa chỉ điểm phát.';
    if (!distributionPointForm.locationId.trim())
      clientErrors.locationId =
        'Chưa map được locationId. Hãy chọn lại địa chỉ hoặc dùng vị trí trạm hiện tại.';
    if (!distributionPointForm.startsAt) clientErrors.startsAt = 'Vui lòng chọn thời gian bắt đầu.';
    if (distributionPointForm.latitude < -90 || distributionPointForm.latitude > 90) {
      clientErrors.latitude = 'Vĩ độ phải nằm trong khoảng từ -90 đến 90.';
    }
    if (distributionPointForm.longitude < -180 || distributionPointForm.longitude > 180) {
      clientErrors.longitude = 'Kinh độ phải nằm trong khoảng từ -180 đến 180.';
    }
    if (
      distributionPointForm.endsAt &&
      distributionPointForm.endsAt < distributionPointForm.startsAt
    ) {
      clientErrors.endsAt = 'Thời gian kết thúc phải sau thời gian bắt đầu.';
    }

    if (Object.keys(clientErrors).length > 0) {
      setDistributionPointErrors(clientErrors);
      toast.error(Object.values(clientErrors)[0]);
      return;
    }

    try {
      setDistributionPointErrors({});
      await createPointMutation.mutateAsync({
        campaignId: effectiveSelectedCampaignId,
        data: {
          name: distributionPointForm.name,
          reliefStationId: station.reliefStationId,
          campaignTeamId: undefined,
          locationId: distributionPointForm.locationId || undefined,
          address: distributionPointForm.address || undefined,
          latitude: distributionPointForm.latitude,
          longitude: distributionPointForm.longitude,
          deliveryMode: DeliveryMode.PickupAtPoint,
          startsAt: distributionPointForm.startsAt,
          endsAt: distributionPointForm.endsAt || undefined,
          isActive: true,
        },
      });
      setDistributionPointForm(createDefaultDistributionPointForm(station));
      setDistributionPointErrors({});
    } catch (error) {
      const parsed = parseApiError(error, 'Không thể tạo điểm phát');
      setDistributionPointErrors({
        name: pickFieldError(parsed.fieldErrors, 'Name', 'name'),
        locationId: pickFieldError(parsed.fieldErrors, 'LocationId', 'locationId'),
        address: pickFieldError(parsed.fieldErrors, 'Address', 'address'),
        startsAt: pickFieldError(parsed.fieldErrors, 'StartsAt', 'startsAt'),
        endsAt: pickFieldError(parsed.fieldErrors, 'EndsAt', 'endsAt'),
        latitude: pickFieldError(parsed.fieldErrors, 'Latitude', 'latitude'),
        longitude: pickFieldError(parsed.fieldErrors, 'Longitude', 'longitude'),
      });
    }
  };

  const handleCreatePackage = async () => {
    const clientErrors: Record<string, string> = {};

    if (!packageForm.name.trim()) clientErrors.name = 'Vui lòng nhập tên gói cứu trợ.';
    const seenSupplyItems = new Set<string>();
    if (
      !packageForm.items.length ||
      packageForm.items.some(
        (item) => !item.supplyItemId || item.quantity <= 0 || !item.unit.trim(),
      )
    ) {
      clientErrors.items = 'Vui lòng nhập đầy đủ vật phẩm thành phần, số lượng và đơn vị.';
      packageForm.items.forEach((item, index) => {
        if (!item.supplyItemId)
          clientErrors[`items.${index}.supplyItemId`] = 'Vui lòng chọn vật phẩm.';
        if (item.quantity <= 0)
          clientErrors[`items.${index}.quantity`] = 'Số lượng phải lớn hơn 0.';
        if (!item.unit.trim()) clientErrors[`items.${index}.unit`] = 'Vui lòng nhập đơn vị.';
        if (item.supplyItemId) {
          if (seenSupplyItems.has(item.supplyItemId)) {
            clientErrors[`items.${index}.supplyItemId`] =
              'Vật phẩm này đã xuất hiện ở dòng khác. Không được chọn trùng.';
          } else {
            seenSupplyItems.add(item.supplyItemId);
          }
        }
      });
    }

    if (Object.keys(clientErrors).length > 0) {
      setPackageErrors(clientErrors);
      toast.error(Object.values(clientErrors)[0]);
      return;
    }

    try {
      setPackageErrors({});
      await createPackageMutation.mutateAsync({
        campaignId: effectiveSelectedCampaignId,
        data: {
          ...packageForm,
          outputSupplyItemId: packageForm.items[0]?.supplyItemId || '',
        },
      });
      setPackageForm(createDefaultPackageForm());
      setPackageErrors({});
    } catch (error) {
      const parsed = parseApiError(error, 'Không thể tạo gói cứu trợ');
      const nextErrors: Record<string, string> = {
        name: pickFieldError(parsed.fieldErrors, 'Name', 'name'),
        description: pickFieldError(parsed.fieldErrors, 'Description', 'description'),
        items: pickFieldError(parsed.fieldErrors, 'Items', 'items'),
      };

      if (
        parsed.message.toLowerCase().includes('lặp lại') ||
        parsed.message.toLowerCase().includes('trùng')
      ) {
        packageForm.items.forEach((item, index) => {
          if (
            item.supplyItemId &&
            packageForm.items.findIndex(
              (candidate) => candidate.supplyItemId === item.supplyItemId,
            ) !== index
          ) {
            nextErrors[`items.${index}.supplyItemId`] =
              'Vật phẩm này đang bị chọn trùng trong gói cứu trợ.';
          }
        });
      }

      packageForm.items.forEach((_, index) => {
        nextErrors[`items.${index}.supplyItemId`] = pickFieldError(
          parsed.fieldErrors,
          `Items[${index}].SupplyItemId`,
          `items[${index}].supplyItemId`,
        );
        nextErrors[`items.${index}.quantity`] = pickFieldError(
          parsed.fieldErrors,
          `Items[${index}].Quantity`,
          `items[${index}].quantity`,
        );
        nextErrors[`items.${index}.unit`] = pickFieldError(
          parsed.fieldErrors,
          `Items[${index}].Unit`,
          `items[${index}].unit`,
        );
      });
      setPackageErrors(nextErrors);
    }
  };

  const handleUseCurrentStation = () => {
    if (!station) {
      toast.error('Không tìm thấy thông tin trạm hiện tại.');
      return;
    }

    updateDistributionPointForm((prev) => ({
      ...prev,
      address: station.address || prev.address,
      latitude: Number(station.latitude) || prev.latitude,
      longitude: Number(station.longitude) || prev.longitude,
      locationId: station.locationId || prev.locationId,
    }));
  };

  const handleToggleHousehold = (id: string) => {
    setSelectedHouseholdIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleToggleSelectAll = (checked: CheckedState) => {
    if (checked === 'indeterminate') return;
    setSelectedHouseholdIds((prev) => {
      const next = new Set(prev);
      if (checked) {
        paginatedHouseholds.forEach((household) => next.add(household.campaignHouseholdId));
      } else {
        paginatedHouseholds.forEach((household) => next.delete(household.campaignHouseholdId));
      }
      return next;
    });
  };

  const handleAssignSelectedHouseholds = async () => {
    const nextErrors: Record<string, string> = {};
    if (!effectiveSelectedCampaignId) nextErrors.form = 'Vui lòng chọn chiến dịch cứu trợ.';
    if (teams.length === 0) nextErrors.campaignTeamId = 'Chiến dịch chưa có team để phân công.';
    if (!effectiveAssignForm.campaignTeamId)
      nextErrors.campaignTeamId = 'Vui lòng chọn team phụ trách.';
    if (!effectiveAssignForm.reliefPackageDefinitionId)
      nextErrors.reliefPackageDefinitionId = 'Vui lòng chọn gói cứu trợ.';
    if (!effectiveAssignForm.scheduledAt)
      nextErrors.scheduledAt = 'Vui lòng chọn thời gian bắt đầu.';
    if (selectedHouseholds.length === 0)
      nextErrors.selectedHouseholds = 'Vui lòng chọn ít nhất 1 hộ dân.';
    if (hasPickupHouseholds && !defaultDistributionPointId) {
      nextErrors.selectedHouseholds =
        'Có hộ nhận tại điểm phát nhưng chiến dịch chưa có điểm phát phù hợp.';
    }

    if (Object.keys(nextErrors).length > 0) {
      setAssignErrors(nextErrors);
      toast.error(Object.values(nextErrors)[0]);
      return;
    }

    try {
      setAssignErrors({});
      await Promise.all(
        selectedHouseholds.map((household) =>
          reliefDistributionService.assignHousehold(
            effectiveSelectedCampaignId,
            household.campaignHouseholdId,
            {
              deliveryMode: Number(household.deliveryMode),
              distributionPointId:
                Number(household.deliveryMode) === DeliveryMode.PickupAtPoint
                  ? defaultDistributionPointId
                  : undefined,
              campaignTeamId: effectiveAssignForm.campaignTeamId,
              reliefPackageDefinitionId: effectiveAssignForm.reliefPackageDefinitionId,
              scheduledAt: effectiveAssignForm.scheduledAt,
              notes: effectiveAssignForm.notes || undefined,
            },
          ),
        ),
      );

      await queryClient.invalidateQueries({
        queryKey: RELIEF_DISTRIBUTION_KEYS.households(effectiveSelectedCampaignId),
      });

      setSelectedHouseholdIds(new Set());
      setAssignForm((prev) => ({ ...prev, notes: '' }));
      toast.success('Đã phân công hộ dân cho đội phụ trách');
    } catch (error) {
      const parsed = parseApiError(error, 'Không thể phân công hộ dân');
      setAssignErrors({
        campaignTeamId: pickFieldError(parsed.fieldErrors, 'CampaignTeamId', 'campaignTeamId'),
        reliefPackageDefinitionId: pickFieldError(
          parsed.fieldErrors,
          'ReliefPackageDefinitionId',
          'reliefPackageDefinitionId',
        ),
        scheduledAt: pickFieldError(parsed.fieldErrors, 'ScheduledAt', 'scheduledAt'),
        notes: pickFieldError(parsed.fieldErrors, 'Notes', 'notes'),
        form: parsed.message,
      });
      handleHookError(error, 'Không thể phân công hộ dân');
    }
  };

  const canCreatePackage =
    !!effectiveSelectedCampaignId &&
    packageForm.items.every((item) => item.supplyItemId && item.quantity > 0 && item.unit.trim());

  const distributionPointSummaries = useMemo(
    () =>
      distributionPoints.map((point) => {
        const pointHouseholds = households.filter(
          (household) => household.distributionPointId === point.distributionPointId,
        );
        const pointChecklist = checklist.filter(
          (item) => item.distributionPointId === point.distributionPointId,
        );
        const pointTeamIds = Array.from(
          new Set(pointChecklist.map((item) => item.campaignTeamId).filter(Boolean)),
        );

        return {
          id: point.distributionPointId,
          name: point.name,
          address: point.address || '',
          latitude: point.latitude,
          longitude: point.longitude,
          startsAt: point.startsAt,
          endsAt: point.endsAt || undefined,
          teamNames: pointTeamIds.map((teamId) => teamNameById[teamId as string]).filter(Boolean),
          assignedHouseholdCount: pointHouseholds.length,
          deliveredCount: pointChecklist.filter((item) => Number(item.status) === 2).length,
        };
      }),
    [distributionPoints, households, checklist, teamNameById],
  );

  const teamActivitySummary = useMemo(() => {
    return teams.map((team) => {
      const teamChecklist = checklist.filter((item) => item.campaignTeamId === team.campaignTeamId);
      return {
        teamName: team.teamName,
        assignedCount: teamChecklist.length,
        deliveredCount: teamChecklist.filter((item) => Number(item.status) === 2).length,
      };
    });
  }, [teams, checklist]);

  const canAssign =
    !!effectiveSelectedCampaignId &&
    teams.length > 0 &&
    !!effectiveAssignForm.campaignTeamId &&
    !!effectiveAssignForm.reliefPackageDefinitionId &&
    !!effectiveAssignForm.scheduledAt &&
    selectedHouseholds.length > 0 &&
    (!hasPickupHouseholds || !!defaultDistributionPointId);

  return (
    <DashboardLayout navGroups={coordinatorNavGroups}>
      <div className="space-y-6 min-w-0">
        <CoordinatorReliefDistributionPageHeader
          selectedCampaignId={selectedCampaignId}
          onCampaignChange={(value) => {
            setSelectedCampaignId(value);
            setCurrentPage(1);
            setSelectedHouseholdIds(new Set());
          }}
          campaigns={reliefCampaigns}
          stationName={headerStationName}
          locationName={headerLocationName}
        />

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Hộ dân cần phân công"
            value={households.length}
            note="Danh sách hộ dân từ dataseed"
            icon="groups"
            iconClass="bg-primary/10 text-primary"
          />
          <StatCard
            label="Đội trong chiến dịch"
            value={teams.length}
            note="Đội có thể được giao thực hiện"
            icon="diversity_3"
            iconClass="bg-sky-500/10 text-sky-600 dark:text-sky-300"
          />
          <StatCard
            label="Điểm phát hiện có"
            value={distributionPoints.length}
            note="Tự dùng điểm phát đầu tiên cho hộ pickup"
            icon="location_on"
            iconClass="bg-amber-500/10 text-amber-600 dark:text-amber-300"
          />
          <StatCard
            label="Gói cứu trợ hiện có"
            value={packages.length}
            note="Dùng để gán cho các hộ dân đã chọn"
            icon="inventory_2"
            iconClass="bg-emerald-500/10 text-emerald-600 dark:text-emerald-300"
          />
        </div>

        <CoordinatorReliefDistributionSetupSteps
          distributionSectionId={DISTRIBUTION_SECTION_ID}
          packageSectionId={PACKAGE_SECTION_ID}
          distributionPointForm={distributionPointForm}
          onChangeDistributionPointForm={updateDistributionPointForm}
          onCreatePoint={handleCreatePoint}
          createPointDisabled={!effectiveSelectedCampaignId || !station?.reliefStationId}
          packageForm={packageForm}
          supplyItems={supplyItems}
          onChangePackageForm={updatePackageForm}
          onUpdatePackageItem={updatePackageItem}
          onAddPackageItem={() =>
            updatePackageForm((prev) => ({
              ...prev,
              items: [...prev.items, { supplyItemId: '', quantity: 1, unit: '' }],
            }))
          }
          onRemovePackageItem={removePackageItem}
          onCreatePackage={handleCreatePackage}
          createPackageDisabled={!canCreatePackage}
          provinces={provinces}
          selectedLocationName={selectedPointLocationName}
          distributionPointErrors={distributionPointErrors}
          packageErrors={packageErrors}
          onUseCurrentStation={handleUseCurrentStation}
        />

        <CoordinatorDistributionPointsMap
          points={distributionPointSummaries}
          center={{
            lat: Number(station?.latitude) || distributionPointForm.latitude,
            lng: Number(station?.longitude) || distributionPointForm.longitude,
          }}
        />

        <div className="grid gap-6 xl:grid-cols-2">
          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-foreground">Theo dõi hoạt động team</h3>
              <p className="text-sm text-muted-foreground">
                Tổng hợp nhanh số hộ đã được giao và đã hoàn tất theo từng team.
              </p>
            </div>
            <div className="space-y-3">
              {teamActivitySummary.length === 0 ? (
                <p className="text-sm text-muted-foreground">Chưa có hoạt động team để hiển thị.</p>
              ) : (
                teamActivitySummary.map((team) => (
                  <div
                    key={team.teamName}
                    className="rounded-xl border border-border bg-muted/20 p-4"
                  >
                    <p className="font-medium text-foreground">{team.teamName}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Đã nhận {team.assignedCount} hộ · Hoàn tất {team.deliveredCount} hộ
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-foreground">Lịch sử đóng gói cứu trợ</h3>
              <p className="text-sm text-muted-foreground">
                Theo dõi gói đã được tạo từ kho, số lượng đã đóng và thời gian thao tác.
              </p>
            </div>
            <div className="space-y-3">
              {packageAssemblyHistory.length === 0 ? (
                <p className="text-sm text-muted-foreground">Chưa có lịch sử đóng gói cứu trợ.</p>
              ) : (
                packageAssemblyHistory.slice(0, 5).map((history) => (
                  <div
                    key={history.reliefPackageAssemblyId}
                    className="rounded-xl border border-border bg-muted/20 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-foreground">
                          {history.outputSupplyItemName}
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          Tạo {history.quantityCreated} {history.outputUnit} ·{' '}
                          {formatDateTimeVN(history.createdAt)}
                        </p>
                      </div>
                      <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                        {history.details.length} vật phẩm nguồn
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-foreground">Checklist phân phát</h3>
            <p className="text-sm text-muted-foreground">
              Theo dõi lịch sử phân phát, trạng thái hoàn tất và minh chứng đã phát.
            </p>
          </div>
          <div className="space-y-3">
            {checklist.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Chưa có checklist phân phát cho chiến dịch này.
              </p>
            ) : (
              checklist.slice(0, 8).map((item) => (
                <div
                  key={item.householdDeliveryId}
                  className="rounded-xl border border-border bg-muted/20 p-4"
                >
                  <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="font-medium text-foreground">
                        {item.householdCode} · {item.headOfHouseholdName}
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {teamNameById[item.campaignTeamId || ''] || 'Chưa rõ team'} · Hẹn phát{' '}
                        {formatDateTimeVN(item.scheduledAt)}
                      </p>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Proof: {item.proofCount} · Hoàn tất:{' '}
                      {item.deliveredAt ? formatDateTimeVN(item.deliveredAt) : 'Chưa phát'}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <CoordinatorReliefDistributionAssignmentStep
          sectionId={ASSIGNMENT_SECTION_ID}
          assignForm={effectiveAssignForm}
          onChangeAssignForm={setAssignForm}
          teams={teams.map((team) => ({
            campaignTeamId: team.campaignTeamId,
            teamName: team.teamName,
          }))}
          packages={packages.map((pkg) => ({
            reliefPackageDefinitionId: pkg.reliefPackageDefinitionId,
            name: pkg.name,
          }))}
          households={paginatedHouseholds}
          selectedHouseholdIds={selectedHouseholdIds}
          assignedTeamNameByHouseholdId={Object.fromEntries(
            households.map((household) => [
              household.campaignHouseholdId,
              household.campaignTeamId
                ? teamNameById[household.campaignTeamId] || 'Đã gán team'
                : '',
            ]),
          )}
          onToggleHousehold={handleToggleHousehold}
          allPageSelected={allPageSelected}
          onToggleSelectAll={handleToggleSelectAll}
          currentPage={safeCurrentPage}
          totalPages={totalPages}
          onPreviousPage={() =>
            setCurrentPage((prev) => Math.max(1, Math.min(prev, totalPages) - 1))
          }
          onNextPage={() =>
            setCurrentPage((prev) => Math.min(totalPages, Math.min(prev, totalPages) + 1))
          }
          selectionCount={selectedHouseholdIds.size}
          canAssign={canAssign}
          onAssign={handleAssignSelectedHouseholds}
          hasPickupHouseholds={hasPickupHouseholds}
          hasDistributionPoint={!!defaultDistributionPointId}
          householdSearch={householdSearch}
          onChangeHouseholdSearch={setHouseholdSearch}
          assignmentFilter={assignmentFilter}
          onChangeAssignmentFilter={setAssignmentFilter}
          onJumpToCreateTeam={() => navigate('/portal/coordinator/teams')}
          onJumpToCreatePackage={() => scrollToSection(PACKAGE_SECTION_ID)}
          assignErrors={assignErrors}
        />
      </div>
    </DashboardLayout>
  );
}
