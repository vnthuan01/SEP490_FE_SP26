import { useMemo, useState, type SetStateAction } from 'react';
import { useQueryClient, useQueries } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { CheckedState } from '@radix-ui/react-checkbox';
import { useNavigate } from 'react-router-dom';
import { parseApiError, pickFieldError } from '@/lib/apiErrors';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { formatNumberInputVN, formatNumberVN } from '@/lib/utils';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { coordinatorNavGroups } from './components/sidebarConfig';
import { useMyReliefStation } from '@/hooks/useReliefStation';
import {
  CAMPAIGN_QUERY_KEYS,
  useExtractCampaignBudget,
  useCampaignInventoryBalance,
  useCampaigns,
  useCampaignTeams,
  useCampaignSummary,
} from '@/hooks/useCampaigns';
import { useProvinces } from '@/hooks/useLocations';
import {
  RELIEF_DISTRIBUTION_KEYS,
  useAssembleReliefPackage,
  useCompleteReliefDelivery,
  useCreateDistributionPoint,
  useCreateReliefPackage,
  useDeleteDistributionPoint,
  useDeleteReliefHousehold,
  useDeleteReliefPackage,
  usePatchDistributionPoint,
  usePatchReliefHousehold,
  usePatchReliefHouseholdStatus,
  usePatchReliefPackage,
  usePackageAssemblyAvailability,
  useReliefChecklist,
  useDistributionPoints,
  useReliefHouseholds,
  useReliefPackages,
  useReliefDeliveries,
  useShortageRequests,
} from '@/hooks/useReliefDistribution';
import { CampaignStatus, CampaignType, DeliveryMode } from '@/enums/beEnums';
import {
  reliefDistributionService,
  type CampaignHouseholdResponse,
  type DistributionPointResponse,
  type HouseholdChecklistItemResponse,
  type ReliefPackageDefinitionResponse,
} from '@/services/reliefDistributionService';
import { campaignService } from '@/services/campaignService';
import { CoordinatorReliefDistributionPageHeader } from './components/relief-distribution/CoordinatorReliefDistributionPageHeader';
import { CoordinatorReliefDistributionSetupSteps } from './components/relief-distribution/CoordinatorReliefDistributionSetupSteps';
import { CoordinatorReliefDistributionAssignmentStep } from './components/relief-distribution/CoordinatorReliefDistributionAssignmentStep';
import { CoordinatorDistributionPointsMap } from './components/relief-distribution/CoordinatorDistributionPointsMap';
import { StatCard, SupplyCategoryBadge } from '@/pages/manager/components/ManagerInventoryShared';
import type {
  CoordinatorAssignForm,
  CoordinatorDistributionPointForm,
  CoordinatorPackageForm,
  CoordinatorPackageItemForm,
} from './components/relief-distribution/types';
import type { ReliefAdvancedFiltersValue } from '@/components/shared/relief-distribution/types';
import { Separator } from '@/components/ui/separator';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Textarea } from '@/components/ui/textarea';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ReliefStickySectionHeader } from './components/relief-distribution/ReliefStickySectionHeader';
import { ReliefFilterBar } from './components/relief-distribution/ReliefFilterBar';
import { ReliefPaginationBar } from './components/relief-distribution/ReliefPaginationBar';
import { MobileShortageRequestReview } from './components/shortage-request/MobileShortageRequestReview';

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
  cashSupportAmount: '',
  isDefault: true,
  isActive: true,
  items: [{ supplyItemId: '', quantity: 1, unit: '' }],
});

const mapDistributionPointToForm = (
  point: DistributionPointResponse,
): CoordinatorDistributionPointForm => ({
  name: point.name || '',
  locationId: point.locationId || '',
  address: point.address || '',
  latitude: Number(point.latitude) || 16.0544,
  longitude: Number(point.longitude) || 108.2022,
  startsAt: point.startsAt || new Date().toISOString(),
  endsAt: point.endsAt || '',
  isActive: point.isActive,
});

const mapPackageToForm = (pkg: ReliefPackageDefinitionResponse): CoordinatorPackageForm => ({
  name: pkg.name || '',
  description: pkg.description || '',
  cashSupportAmount:
    pkg.cashSupportAmount && Number(pkg.cashSupportAmount) > 0
      ? formatNumberInputVN(pkg.cashSupportAmount)
      : '',
  isDefault: pkg.isDefault,
  isActive: pkg.isActive,
  items:
    pkg.items?.length > 0
      ? pkg.items.map((item: any) => ({
          supplyItemId: item.supplyItemId,
          quantity: item.quantity,
          unit: item.unit,
        }))
      : [{ supplyItemId: '', quantity: 1, unit: '' }],
});

type HouseholdEditForm = {
  headOfHouseholdName: string;
  contactPhone: string;
  address: string;
  householdSize: number;
  isIsolated: boolean;
  deliveryMode: number;
  notes: string;
  latitude: number;
  longitude: number;
};

type BudgetExtractForm = {
  sourceCampaignId: string;
  amount: string;
  note: string;
};

type CompleteDeliveryForm = {
  notes: string;
  proofNote: string;
  proofFileUrl: string;
  proofContentType: string;
  cashSupportAmount: string;
};

const mapHouseholdToEditForm = (household: CampaignHouseholdResponse): HouseholdEditForm => ({
  headOfHouseholdName: household.headOfHouseholdName || '',
  contactPhone: household.contactPhone || '',
  address: household.address || '',
  householdSize: household.householdSize || 1,
  isIsolated: !!household.isIsolated,
  deliveryMode: Number(household.deliveryMode),
  notes: household.notes || '',
  latitude: Number(household.latitude) || 0,
  longitude: Number(household.longitude) || 0,
});

const HOUSEHOLDS_PER_PAGE = 10;
const ACTIVITY_ITEMS_PER_PAGE = 5;
const PACKAGE_ITEMS_PER_PAGE = 5;
const CHECKLIST_ITEMS_PER_PAGE = 8;
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
  const [selectedHouseholdsMap, setSelectedHouseholdsMap] = useState<
    Map<string, CampaignHouseholdResponse>
  >(new Map());
  const [filtersValue, setFiltersValue] = useState<ReliefAdvancedFiltersValue>({
    search: '',
    assignment: 'all',
  });
  const [filtersExpanded, setFiltersExpanded] = useState(false);

  const [deliveriesPage, setDeliveriesPage] = useState(1);
  const [shortageRequestsPage, setShortageRequestsPage] = useState(1);
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
  const [teamActivityPage, setTeamActivityPage] = useState(1);
  const [packageListPage, setPackageListPage] = useState(1);
  const [checklistPage, setChecklistPage] = useState(1);
  const [teamSearch, setTeamSearch] = useState('');
  const [teamProgressFilter, setTeamProgressFilter] = useState<
    'all' | 'not-started' | 'active' | 'completed'
  >('all');
  const [packageSearch, setPackageSearch] = useState('');
  const [packageCategoryFilter, setPackageCategoryFilter] = useState('all');
  const [editingDistributionPoint, setEditingDistributionPoint] =
    useState<DistributionPointResponse | null>(null);
  const [editingPackage, setEditingPackage] = useState<ReliefPackageDefinitionResponse | null>(
    null,
  );
  const [editingHousehold, setEditingHousehold] = useState<CampaignHouseholdResponse | null>(null);
  const [householdEditForm, setHouseholdEditForm] = useState<HouseholdEditForm | null>(null);
  const [householdEditErrors, setHouseholdEditErrors] = useState<Record<string, string>>({});
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [budgetExtractOpen, setBudgetExtractOpen] = useState(false);
  const [budgetExtractForm, setBudgetExtractForm] = useState<BudgetExtractForm>({
    sourceCampaignId: '',
    amount: '',
    note: '',
  });
  const [budgetExtractErrors, setBudgetExtractErrors] = useState<Record<string, string>>({});
  const [completeDeliveryTarget, setCompleteDeliveryTarget] =
    useState<HouseholdChecklistItemResponse | null>(null);
  const [completeDeliveryForm, setCompleteDeliveryForm] = useState<CompleteDeliveryForm>({
    notes: '',
    proofNote: '',
    proofFileUrl: '',
    proofContentType: '',
    cashSupportAmount: '',
  });
  const [completeDeliveryErrors, setCompleteDeliveryErrors] = useState<Record<string, string>>({});
  const [updateStatusTarget, setUpdateStatusTarget] = useState<CampaignHouseholdResponse | null>(
    null,
  );
  const [updateStatusForm, setUpdateStatusForm] = useState<{ status: number; notes: string }>({
    status: 0,
    notes: '',
  });
  const [updateStatusErrors, setUpdateStatusErrors] = useState<Record<string, string>>({});
  const [deleteTarget, setDeleteTarget] = useState<
    | { type: 'household'; id: string; label: string }
    | { type: 'distribution-point'; id: string; label: string }
    | { type: 'package'; id: string; label: string }
    | null
  >(null);
  const [showMobileShortageReview, setShowMobileShortageReview] = useState(false);

  const handleFiltersChange = (next: ReliefAdvancedFiltersValue) => {
    setFiltersValue(next);
    resetAllPages();
  };

  const resetFilters = () => {
    setFiltersValue({
      search: '',
      assignment: 'all',
    });
    resetAllPages();
  };

  const resetAllPages = () => {
    setCurrentPage(1);
    setChecklistPage(1);
    setDeliveriesPage(1);
    setShortageRequestsPage(1);
    setTeamActivityPage(1);
  };

  const { station } = useMyReliefStation();
  const hasAssignedStation = !!station?.reliefStationId;
  const { campaigns } = useCampaigns(
    {
      pageIndex: 1,
      pageSize: 200,
      locationId: station?.locationId,
      type: CampaignType.Relief,
    },
    { enabled: !!station?.locationId },
  );
  const reliefCampaigns = useMemo(
    () =>
      campaigns.filter((campaign) =>
        [CampaignStatus.Draft, CampaignStatus.Active, CampaignStatus.Suspended].some(
          (status) => status === Number(campaign.status),
        ),
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
  const { campaigns: fundraisingCampaigns } = useCampaigns(
    {
      pageIndex: 1,
      pageSize: 200,
      type: CampaignType.Fundraising,
    },
    { enabled: true },
  );

  const fundraisingSummaryQueries = useQueries({
    queries: fundraisingCampaigns.map((campaign) => ({
      queryKey: CAMPAIGN_QUERY_KEYS.summary(campaign.campaignId),
      queryFn: async () => {
        const response = await campaignService.getSummary(campaign.campaignId);
        return response.data;
      },
      staleTime: 60000,
      enabled: !!campaign.campaignId,
    })),
  });

  const sourceSummaries = useMemo(() => {
    return fundraisingSummaryQueries.reduce(
      (acc, query, index) => {
        const campaignId = fundraisingCampaigns[index].campaignId;
        acc[campaignId] = query.data;
        return acc;
      },
      {} as Record<string, any>,
    );
  }, [fundraisingSummaryQueries, fundraisingCampaigns]);

  const { summary: sourceCampaignSummary, isLoading: isSourceCampaignSummaryLoading } =
    useCampaignSummary(budgetExtractForm.sourceCampaignId);

  const { teams } = useCampaignTeams(effectiveSelectedCampaignId);
  const { households, pagination: householdsPagination } = useReliefHouseholds(
    effectiveSelectedCampaignId,
    {
      pageIndex: currentPage,
      pageSize: HOUSEHOLDS_PER_PAGE,
      search: filtersValue.search || undefined,
      isAssigned:
        filtersValue.assignment === 'all' ? undefined : filtersValue.assignment === 'assigned',
      isIsolated: filtersValue.isIsolated,
      campaignTeamId: filtersValue.teamId,
      distributionPointId: filtersValue.distributionPointId,
      deliveryMode: filtersValue.deliveryMode,
      status: filtersValue.status,
    },
  );
  const { checklist, pagination: checklistPagination } = useReliefChecklist(
    effectiveSelectedCampaignId,
    {
      pageIndex: checklistPage,
      pageSize: CHECKLIST_ITEMS_PER_PAGE,
      search: filtersValue.search || undefined,
      campaignTeamId: filtersValue.teamId,
      distributionPointId: filtersValue.distributionPointId,
      deliveryMode: filtersValue.deliveryMode,
    },
  );

  // Fetch full checklist for statistics calculation (Theo dõi hoạt động đội)
  // We use a large pageSize to get all assigned items for the summary
  const { checklist: fullChecklist } = useReliefChecklist(effectiveSelectedCampaignId, {
    pageIndex: 1,
    pageSize: 3000,
  });

  const { distributionPoints } = useDistributionPoints(effectiveSelectedCampaignId, {
    campaignTeamId: filtersValue.teamId,
    deliveryMode: filtersValue.deliveryMode,
  });
  const { packages } = useReliefPackages(effectiveSelectedCampaignId);
  const {
    inventoryBalance,
    inventoryBalanceError,
    isLoading: isLoadingInventoryBalance,
  } = useCampaignInventoryBalance(effectiveSelectedCampaignId);
  const { data: provinces = [] } = useProvinces();
  const { deliveries, pagination: deliveriesPagination } = useReliefDeliveries(
    effectiveSelectedCampaignId,
    {
      pageIndex: deliveriesPage,
      pageSize: 10,
      campaignTeamId: filtersValue.teamId,
      distributionPointId: filtersValue.distributionPointId,
      deliveryMode: filtersValue.deliveryMode,
      status: filtersValue.status,
    },
  );
  const { shortageRequests, pagination: shortageRequestsPagination } = useShortageRequests(
    effectiveSelectedCampaignId,
    {
      pageIndex: shortageRequestsPage,
      pageSize: 10,
      status: 0, // Pending
      campaignTeamId: filtersValue.teamId,
      distributionPointId: filtersValue.distributionPointId,
    },
  );
  const createPointMutation = useCreateDistributionPoint();
  const createPackageMutation = useCreateReliefPackage();
  const patchPointMutation = usePatchDistributionPoint();
  const deletePointMutation = useDeleteDistributionPoint();
  const patchPackageMutation = usePatchReliefPackage();
  const deletePackageMutation = useDeleteReliefPackage();
  const patchHouseholdMutation = usePatchReliefHousehold();
  const patchHouseholdStatusMutation = usePatchReliefHouseholdStatus();
  const deleteHouseholdMutation = useDeleteReliefHousehold();
  const assemblePackageMutation = useAssembleReliefPackage();
  const extractBudgetMutation = useExtractCampaignBudget();
  const completeDeliveryMutation = useCompleteReliefDelivery();
  const {
    data: packageAssemblyAvailability,
    isLoading: isLoadingAssemblyAvailability,
    error: packageAssemblyAvailabilityError,
  } = usePackageAssemblyAvailability(
    effectiveSelectedCampaignId,
    assignForm.reliefPackageDefinitionId,
    station?.reliefStationId && inventoryBalance?.campaignInventoryId
      ? {
          reliefStationId: station.reliefStationId,
          campaignInventoryId: inventoryBalance.campaignInventoryId,
        }
      : undefined,
  );

  const supplyItems = useMemo(
    () =>
      (inventoryBalance?.items ?? []).map((item) => ({
        id: item.supplyItemId,
        name: item.supplyItemName,
        unit: item.supplyItemUnit,
        categoryName: '',
        category: '',
        availableQuantity: item.quantity,
      })),
    [inventoryBalance?.items],
  );

  const selectedPackageForAvailability = useMemo(
    () =>
      packages.find(
        (pkg) => pkg.reliefPackageDefinitionId === assignForm.reliefPackageDefinitionId,
      ) || null,
    [packages, assignForm.reliefPackageDefinitionId],
  );

  const headerStationName = station?.name || '';
  const headerLocationName = station?.locationName || '';
  const selectedPointLocationName =
    provinces.find((province) => province.id === distributionPointForm.locationId)?.fullName || '';

  const teamNameById = useMemo(
    () => Object.fromEntries(teams.map((team) => [team.campaignTeamId, team.teamName])),
    [teams],
  );

  const paginatedHouseholds = households;

  const selectedHouseholds = useMemo(
    () => Array.from(selectedHouseholdsMap.values()),
    [selectedHouseholdsMap],
  );

  const selectedHouseholdIds = useMemo(
    () => new Set(selectedHouseholdsMap.keys()),
    [selectedHouseholdsMap],
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

  const totalPages = Math.max(1, householdsPagination?.totalPages ?? 1);
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
    updater: SetStateAction<CoordinatorDistributionPointForm>,
  ) => {
    setDistributionPointForm((prev) => {
      const next: CoordinatorDistributionPointForm =
        typeof updater === 'function' ? (updater as any)(prev) : updater;
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

  const updatePackageForm = (updater: SetStateAction<CoordinatorPackageForm>) => {
    setPackageForm((prev) => {
      const next: CoordinatorPackageForm =
        typeof updater === 'function' ? (updater as any)(prev) : updater;
      setPackageErrors((current) => {
        const updated = { ...current };
        if (next.name.trim()) delete updated.name;
        if (next.description.trim()) delete updated.description;
        next.items.forEach((item: CoordinatorPackageItemForm, index: number) => {
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
    if (!effectiveSelectedCampaignId || !station?.reliefStationId) return;
    const clientErrors: Record<string, string> = {};

    if (!distributionPointForm.name.trim()) clientErrors.name = 'Vui lòng nhập tên điểm phát.';
    if (!distributionPointForm.address.trim())
      clientErrors.address = 'Vui lòng chọn địa chỉ điểm phát.';
    if (!distributionPointForm.locationId.trim())
      clientErrors.locationId =
        'Chưa xác định được mã khu vực. Hãy chọn lại địa chỉ hoặc dùng vị trí trạm hiện tại.';
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
    const cashSupportAmount =
      parseInt((packageForm.cashSupportAmount || '0').replace(/\D/g, ''), 10) || 0;

    if (!packageForm.name.trim()) clientErrors.name = 'Vui lòng nhập tên gói cứu trợ.';
    if (cashSupportAmount < 0) {
      clientErrors.cashSupportAmount = 'Số tiền hỗ trợ phải lớn hơn hoặc bằng 0.';
    }
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
          cashSupportAmount,
        },
      });
      setPackageForm(createDefaultPackageForm());
      setPackageErrors({});
    } catch (error) {
      const parsed = parseApiError(error, 'Không thể tạo gói cứu trợ');
      const nextErrors: Record<string, string> = {
        name: pickFieldError(parsed.fieldErrors, 'Name', 'name'),
        description: pickFieldError(parsed.fieldErrors, 'Description', 'description'),
        cashSupportAmount: pickFieldError(
          parsed.fieldErrors,
          'CashSupportAmount',
          'cashSupportAmount',
        ),
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

  const handleStartEditDistributionPoint = (point: DistributionPointResponse) => {
    setEditingDistributionPoint(point);
    setDistributionPointForm(mapDistributionPointToForm(point));
    setDistributionPointErrors({});
    scrollToSection(DISTRIBUTION_SECTION_ID);
  };

  const handleCancelEditDistributionPoint = () => {
    setEditingDistributionPoint(null);
    setDistributionPointForm(createDefaultDistributionPointForm(station));
    setDistributionPointErrors({});
  };

  const handleUpdatePoint = async () => {
    if (!effectiveSelectedCampaignId || !editingDistributionPoint) return;
    const clientErrors: Record<string, string> = {};

    if (!distributionPointForm.name.trim()) clientErrors.name = 'Vui lòng nhập tên điểm phát.';
    if (!distributionPointForm.address.trim())
      clientErrors.address = 'Vui lòng chọn địa chỉ điểm phát.';
    if (!distributionPointForm.locationId.trim())
      clientErrors.locationId =
        'Chưa xác định được mã khu vực. Hãy chọn lại địa chỉ hoặc dùng vị trí trạm hiện tại.';
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
      await patchPointMutation.mutateAsync({
        campaignId: effectiveSelectedCampaignId,
        distributionPointId: editingDistributionPoint.distributionPointId,
        data: {
          name: distributionPointForm.name,
          reliefStationId: station?.reliefStationId,
          locationId: distributionPointForm.locationId || undefined,
          address: distributionPointForm.address || undefined,
          latitude: distributionPointForm.latitude,
          longitude: distributionPointForm.longitude,
          deliveryMode: DeliveryMode.PickupAtPoint,
          startsAt: distributionPointForm.startsAt,
          endsAt: distributionPointForm.endsAt || undefined,
          isActive: distributionPointForm.isActive,
        },
      });
      handleCancelEditDistributionPoint();
    } catch (error) {
      const parsed = parseApiError(error, 'Không thể cập nhật điểm phát');
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

  const handleStartEditPackage = (pkg: ReliefPackageDefinitionResponse) => {
    setEditingPackage(pkg);
    setPackageForm(mapPackageToForm(pkg));
    setPackageErrors({});
    scrollToSection(PACKAGE_SECTION_ID);
  };

  const handleCancelEditPackage = () => {
    setEditingPackage(null);
    setPackageForm(createDefaultPackageForm());
    setPackageErrors({});
  };

  const handleUpdatePackage = async () => {
    if (!effectiveSelectedCampaignId || !editingPackage) return;
    const clientErrors: Record<string, string> = {};
    const cashSupportAmount =
      parseInt((packageForm.cashSupportAmount || '0').replace(/\D/g, ''), 10) || 0;

    if (!packageForm.name.trim()) clientErrors.name = 'Vui lòng nhập tên gói cứu trợ.';
    if (cashSupportAmount < 0) {
      clientErrors.cashSupportAmount = 'Số tiền hỗ trợ phải lớn hơn hoặc bằng 0.';
    }
    const seenSupplyItems = new Set<string>();
    if (
      !packageForm.items.length ||
      packageForm.items.some(
        (item) => !item.supplyItemId || item.quantity <= 0 || !item.unit.trim(),
      )
    ) {
      clientErrors.items = 'Vui lòng nhập đầy đủ vật phẩm thành phần, số lượng và đơn vị.';
    }
    packageForm.items.forEach((item, index) => {
      if (!item.supplyItemId)
        clientErrors[`items.${index}.supplyItemId`] = 'Vui lòng chọn vật phẩm.';
      if (item.quantity <= 0) clientErrors[`items.${index}.quantity`] = 'Số lượng phải lớn hơn 0.';
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

    if (Object.keys(clientErrors).length > 0) {
      setPackageErrors(clientErrors);
      toast.error(Object.values(clientErrors)[0]);
      return;
    }

    try {
      setPackageErrors({});
      await patchPackageMutation.mutateAsync({
        campaignId: effectiveSelectedCampaignId,
        reliefPackageDefinitionId: editingPackage.reliefPackageDefinitionId,
        data: {
          ...packageForm,
          cashSupportAmount,
        },
      });
      handleCancelEditPackage();
    } catch (error) {
      const parsed = parseApiError(error, 'Không thể cập nhật gói cứu trợ');
      setPackageErrors({
        name: pickFieldError(parsed.fieldErrors, 'Name', 'name'),
        description: pickFieldError(parsed.fieldErrors, 'Description', 'description'),
        cashSupportAmount: pickFieldError(
          parsed.fieldErrors,
          'CashSupportAmount',
          'cashSupportAmount',
        ),
        items: pickFieldError(parsed.fieldErrors, 'Items', 'items'),
      });
    }
  };

  const handleAssembleSelectedPackage = async () => {
    if (
      !effectiveSelectedCampaignId ||
      !assignForm.reliefPackageDefinitionId ||
      !station?.reliefStationId ||
      !inventoryBalance?.campaignInventoryId
    ) {
      toast.error('Chưa đủ thông tin tồn kho chiến dịch để đóng gói hỗ trợ.');
      return;
    }

    if (!packageAssemblyAvailability || packageAssemblyAvailability.maxAssemblableQuantity <= 0) {
      toast.error('Gói đang chọn chưa đủ thành phần trong tồn kho chiến dịch để đóng gói.');
      return;
    }

    try {
      await assemblePackageMutation.mutateAsync({
        campaignId: effectiveSelectedCampaignId,
        reliefPackageDefinitionId: assignForm.reliefPackageDefinitionId,
        data: {
          reliefStationId: station.reliefStationId,
          campaignInventoryId: inventoryBalance.campaignInventoryId,
          quantityToAssemble: 1,
          notes: 'Assemble nhanh từ trang phân phối cứu trợ',
        },
      });

      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: CAMPAIGN_QUERY_KEYS.inventoryBalance(effectiveSelectedCampaignId),
        }),
        queryClient.invalidateQueries({
          queryKey: RELIEF_DISTRIBUTION_KEYS.assemblyAvailability(
            effectiveSelectedCampaignId,
            assignForm.reliefPackageDefinitionId,
            {
              reliefStationId: station.reliefStationId,
              campaignInventoryId: inventoryBalance.campaignInventoryId,
            },
          ),
        }),
      ]);
      toast.success('Đã đóng nhanh 1 gói hỗ trợ');
    } catch (error) {
      const parsed = parseApiError(error, 'Không thể đóng gói hỗ trợ');
      toast.error(parsed.message);
    }
  };

  const requestDelete = (
    target:
      | { type: 'household'; id: string; label: string }
      | { type: 'distribution-point'; id: string; label: string }
      | { type: 'package'; id: string; label: string },
  ) => {
    setDeleteTarget(target);
    setConfirmDeleteOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!effectiveSelectedCampaignId || !deleteTarget) return;
    try {
      if (deleteTarget.type === 'household') {
        await deleteHouseholdMutation.mutateAsync({
          campaignId: effectiveSelectedCampaignId,
          campaignHouseholdId: deleteTarget.id,
        });
        setSelectedHouseholdsMap((prev) => {
          const next = new Map(prev);
          next.delete(deleteTarget.id);
          return next;
        });
      }
      if (deleteTarget.type === 'distribution-point') {
        await deletePointMutation.mutateAsync({
          campaignId: effectiveSelectedCampaignId,
          distributionPointId: deleteTarget.id,
        });
        if (editingDistributionPoint?.distributionPointId === deleteTarget.id) {
          handleCancelEditDistributionPoint();
        }
      }
      if (deleteTarget.type === 'package') {
        await deletePackageMutation.mutateAsync({
          campaignId: effectiveSelectedCampaignId,
          reliefPackageDefinitionId: deleteTarget.id,
        });
        if (editingPackage?.reliefPackageDefinitionId === deleteTarget.id) {
          handleCancelEditPackage();
        }
      }
    } finally {
      setDeleteTarget(null);
    }
  };

  const handleSubmitBudgetExtract = async () => {
    if (!effectiveSelectedCampaignId) return;
    const nextErrors: Record<string, string> = {};
    const amount = parseInt((budgetExtractForm.amount || '0').replace(/\D/g, ''), 10) || 0;

    if (!budgetExtractForm.sourceCampaignId) {
      nextErrors.sourceCampaignId = 'Vui lòng chọn chiến dịch gây quỹ nguồn.';
    }
    if (amount <= 0) {
      nextErrors.amount = 'Số tiền trích phải lớn hơn 0.';
    }

    if (Object.keys(nextErrors).length > 0) {
      setBudgetExtractErrors(nextErrors);
      toast.error(Object.values(nextErrors)[0]);
      return;
    }

    try {
      setBudgetExtractErrors({});
      await extractBudgetMutation.mutateAsync({
        id: budgetExtractForm.sourceCampaignId,
        data: {
          targetReliefCampaignId: effectiveSelectedCampaignId,
          amount,
          note: budgetExtractForm.note || undefined,
        },
      });
      setBudgetExtractOpen(false);
      setBudgetExtractForm({ sourceCampaignId: '', amount: '', note: '' });
      await queryClient.invalidateQueries({
        queryKey: CAMPAIGN_QUERY_KEYS.inventoryBalance(effectiveSelectedCampaignId),
      });
    } catch (error) {
      const parsed = parseApiError(error, 'Không thể trích ngân sách');
      setBudgetExtractErrors({
        sourceCampaignId: pickFieldError(
          parsed.fieldErrors,
          'SourceCampaignId',
          'sourceCampaignId',
          'TargetReliefCampaignId',
          'targetReliefCampaignId',
        ),
        amount: pickFieldError(parsed.fieldErrors, 'Amount', 'amount'),
        note: pickFieldError(parsed.fieldErrors, 'Note', 'note'),
        form: parsed.message,
      });
      toast.error(parsed.message);
    }
  };

  const handleOpenCompleteDelivery = (item: HouseholdChecklistItemResponse) => {
    setCompleteDeliveryTarget(item);
    setCompleteDeliveryErrors({});
    setCompleteDeliveryForm({
      notes: item.notes || '',
      proofNote: '',
      proofFileUrl: '',
      proofContentType: '',
      cashSupportAmount: '',
    });
  };

  const handleSubmitCompleteDelivery = async () => {
    if (!effectiveSelectedCampaignId || !completeDeliveryTarget) return;
    const nextErrors: Record<string, string> = {};
    const cashSupportAmount =
      parseInt((completeDeliveryForm.cashSupportAmount || '0').replace(/\D/g, ''), 10) || 0;

    if (!completeDeliveryForm.proofFileUrl.trim()) {
      nextErrors.proofFileUrl = 'Vui lòng nhập URL minh chứng.';
    }
    if (cashSupportAmount < 0) {
      nextErrors.cashSupportAmount = 'Số tiền hỗ trợ phải lớn hơn hoặc bằng 0.';
    }

    if (Object.keys(nextErrors).length > 0) {
      setCompleteDeliveryErrors(nextErrors);
      toast.error(Object.values(nextErrors)[0]);
      return;
    }

    try {
      setCompleteDeliveryErrors({});
      await completeDeliveryMutation.mutateAsync({
        campaignId: effectiveSelectedCampaignId,
        householdDeliveryId: completeDeliveryTarget.householdDeliveryId,
        data: {
          reliefPackageDefinitionId: completeDeliveryTarget.reliefPackageDefinitionId,
          campaignTeamId: completeDeliveryTarget.campaignTeamId || undefined,
          notes: completeDeliveryForm.notes || undefined,
          proofNote: completeDeliveryForm.proofNote || undefined,
          proofFileUrl: completeDeliveryForm.proofFileUrl,
          proofContentType: completeDeliveryForm.proofContentType || undefined,
          cashSupportAmount,
        },
      });
      setCompleteDeliveryTarget(null);
      setCompleteDeliveryErrors({});
    } catch (error) {
      const parsed = parseApiError(error, 'Không thể hoàn tất phát quà');
      setCompleteDeliveryErrors({
        proofFileUrl: pickFieldError(parsed.fieldErrors, 'ProofFileUrl', 'proofFileUrl'),
        proofContentType: pickFieldError(
          parsed.fieldErrors,
          'ProofContentType',
          'proofContentType',
        ),
        proofNote: pickFieldError(parsed.fieldErrors, 'ProofNote', 'proofNote'),
        notes: pickFieldError(parsed.fieldErrors, 'Notes', 'notes'),
        cashSupportAmount: pickFieldError(
          parsed.fieldErrors,
          'CashSupportAmount',
          'cashSupportAmount',
        ),
        form: parsed.message,
      });
      toast.error(parsed.message);
    }
  };

  const handleEditHousehold = (household: CampaignHouseholdResponse) => {
    setEditingHousehold(household);
    setHouseholdEditForm(mapHouseholdToEditForm(household));
    setHouseholdEditErrors({});
  };

  const handleOpenUpdateStatus = (household: CampaignHouseholdResponse) => {
    setUpdateStatusTarget(household);
    setUpdateStatusForm({
      status: Number(household.fulfillmentStatus ?? 0),
      notes: household.notes || '',
    });
    setUpdateStatusErrors({});
  };

  const handleSubmitUpdateStatus = async () => {
    if (!effectiveSelectedCampaignId || !updateStatusTarget) return;

    try {
      setUpdateStatusErrors({});
      await patchHouseholdStatusMutation.mutateAsync({
        campaignId: effectiveSelectedCampaignId,
        campaignHouseholdId: updateStatusTarget.campaignHouseholdId,
        data: {
          status: updateStatusForm.status,
          notes: updateStatusForm.notes || undefined,
        },
      });

      setUpdateStatusTarget(null);
    } catch (error) {
      const parsed = parseApiError(error, 'Không thể cập nhật trạng thái hộ dân');
      setUpdateStatusErrors({ form: parsed.message });
      toast.error(parsed.message);
    }
  };

  const handleSaveHousehold = async () => {
    if (!effectiveSelectedCampaignId || !editingHousehold || !householdEditForm) return;
    const nextErrors: Record<string, string> = {};
    if (!householdEditForm.headOfHouseholdName.trim())
      nextErrors.headOfHouseholdName = 'Vui lòng nhập tên chủ hộ.';
    if (householdEditForm.householdSize <= 0)
      nextErrors.householdSize = 'Số nhân khẩu phải lớn hơn 0.';
    if (householdEditForm.latitude < -90 || householdEditForm.latitude > 90)
      nextErrors.latitude = 'Vĩ độ phải nằm trong khoảng từ -90 đến 90.';
    if (householdEditForm.longitude < -180 || householdEditForm.longitude > 180)
      nextErrors.longitude = 'Kinh độ phải nằm trong khoảng từ -180 đến 180.';
    if (Object.keys(nextErrors).length > 0) {
      setHouseholdEditErrors(nextErrors);
      toast.error(Object.values(nextErrors)[0]);
      return;
    }

    try {
      setHouseholdEditErrors({});
      await patchHouseholdMutation.mutateAsync({
        campaignId: effectiveSelectedCampaignId,
        campaignHouseholdId: editingHousehold.campaignHouseholdId,
        data: {
          headOfHouseholdName: householdEditForm.headOfHouseholdName,
          contactPhone: householdEditForm.contactPhone || null,
          address: householdEditForm.address || null,
          householdSize: householdEditForm.householdSize,
          isIsolated: householdEditForm.isIsolated,
          deliveryMode: householdEditForm.deliveryMode,
          notes: householdEditForm.notes || null,
          latitude: householdEditForm.latitude,
          longitude: householdEditForm.longitude,
        },
      });
      setEditingHousehold(null);
      setHouseholdEditForm(null);
      setHouseholdEditErrors({});
    } catch (error) {
      const parsed = parseApiError(error, 'Không thể cập nhật hộ dân');
      setHouseholdEditErrors({
        headOfHouseholdName: pickFieldError(
          parsed.fieldErrors,
          'HeadOfHouseholdName',
          'headOfHouseholdName',
        ),
        contactPhone: pickFieldError(parsed.fieldErrors, 'ContactPhone', 'contactPhone'),
        address: pickFieldError(parsed.fieldErrors, 'Address', 'address'),
        householdSize: pickFieldError(parsed.fieldErrors, 'HouseholdSize', 'householdSize'),
        isIsolated: pickFieldError(parsed.fieldErrors, 'IsIsolated', 'isIsolated'),
        deliveryMode: pickFieldError(parsed.fieldErrors, 'DeliveryMode', 'deliveryMode'),
        notes: pickFieldError(parsed.fieldErrors, 'Notes', 'notes'),
        latitude: pickFieldError(parsed.fieldErrors, 'Latitude', 'latitude'),
        longitude: pickFieldError(parsed.fieldErrors, 'Longitude', 'longitude'),
      });
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

  const handleToggleHousehold = (household: CampaignHouseholdResponse) => {
    setSelectedHouseholdsMap((prev) => {
      const next = new Map(prev);
      if (next.has(household.campaignHouseholdId)) {
        next.delete(household.campaignHouseholdId);
      } else {
        next.set(household.campaignHouseholdId, household);
      }
      return next;
    });
  };

  const handleToggleSelectAll = (checked: CheckedState) => {
    if (checked === 'indeterminate') return;
    setSelectedHouseholdsMap((prev) => {
      const next = new Map(prev);
      if (checked) {
        paginatedHouseholds.forEach((household) =>
          next.set(household.campaignHouseholdId, household),
        );
      } else {
        paginatedHouseholds.forEach((household) => next.delete(household.campaignHouseholdId));
      }
      return next;
    });
  };

  const handleAssignSelectedHouseholds = async () => {
    const nextErrors: Record<string, string> = {};
    if (!effectiveSelectedCampaignId) nextErrors.form = 'Vui lòng chọn chiến dịch cứu trợ.';
    if (teams.length === 0) nextErrors.campaignTeamId = 'Chiến dịch chưa có đội để phân công.';
    if (!effectiveAssignForm.campaignTeamId)
      nextErrors.campaignTeamId = 'Vui lòng chọn đội phụ trách.';
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
        queryKey: RELIEF_DISTRIBUTION_KEYS.all,
      });

      setSelectedHouseholdsMap(new Map());
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
      toast.error(parsed.message);
    }
  };

  const canCreatePackage =
    !!effectiveSelectedCampaignId &&
    packageForm.items.every((item) => item.supplyItemId && item.quantity > 0 && item.unit.trim());

  const distributionPointSummaries = useMemo(
    () =>
      distributionPoints.map((point) => ({
        id: point.distributionPointId,
        name: point.name,
        address: point.address || '',
        latitude: point.latitude,
        longitude: point.longitude,
        startsAt: point.startsAt,
        endsAt: point.endsAt || undefined,
        teamNames: point.assignedTeams?.map((t) => t.campaignTeamName).filter(Boolean) ?? [],
        assignedHouseholdCount: point.assignedHouseholdCount ?? 0,
        deliveredCount: (point.totalDeliveryCount ?? 0) - (point.pendingDeliveryCount ?? 0),
      })),
    [distributionPoints],
  );

  const teamActivitySummary = useMemo(() => {
    return teams.map((team) => {
      const teamChecklist = fullChecklist.filter(
        (item) => item.campaignTeamId === team.campaignTeamId,
      );
      const assignedCount = teamChecklist.length;
      const deliveredCount = teamChecklist.filter((item) => Number(item.status) === 2).length;
      const completionRate =
        assignedCount === 0 ? 0 : Math.round((deliveredCount / assignedCount) * 100);
      const progressTone =
        completionRate === 100
          ? {
              key: 'completed' as const,
              label: 'Hoàn tất',
              variant: 'success' as const,
              icon: 'task_alt',
            }
          : completionRate >= 50
            ? {
                key: 'active' as const,
                label: 'Đang tăng tốc',
                variant: 'info' as const,
                icon: 'trending_up',
              }
            : completionRate > 0
              ? {
                  key: 'active' as const,
                  label: 'Đang xử lý',
                  variant: 'warning' as const,
                  icon: 'autorenew',
                }
              : {
                  key: 'not-started' as const,
                  label: 'Chưa bắt đầu',
                  variant: 'outline' as const,
                  icon: 'schedule',
                };

      return {
        teamName: team.teamName,
        assignedCount,
        deliveredCount,
        remainingCount: Math.max(0, assignedCount - deliveredCount),
        completionRate,
        progressTone,
      };
    });
  }, [teams, fullChecklist]);

  const filteredTeamActivitySummary = useMemo(() => {
    const normalizedSearch = teamSearch.trim().toLowerCase();
    return teamActivitySummary.filter((team) => {
      const matchesSearch =
        !normalizedSearch || team.teamName.toLowerCase().includes(normalizedSearch);
      const matchesProgress =
        teamProgressFilter === 'all' ||
        (teamProgressFilter === 'completed' && team.progressTone.key === 'completed') ||
        (teamProgressFilter === 'active' && team.progressTone.key === 'active') ||
        (teamProgressFilter === 'not-started' && team.progressTone.key === 'not-started');

      return matchesSearch && matchesProgress;
    });
  }, [teamActivitySummary, teamSearch, teamProgressFilter]);

  const totalTeamActivityPages = Math.max(
    1,
    Math.ceil(filteredTeamActivitySummary.length / ACTIVITY_ITEMS_PER_PAGE),
  );
  const paginatedTeamActivitySummary = useMemo(() => {
    const start =
      (Math.min(teamActivityPage, totalTeamActivityPages) - 1) * ACTIVITY_ITEMS_PER_PAGE;
    return filteredTeamActivitySummary.slice(start, start + ACTIVITY_ITEMS_PER_PAGE);
  }, [teamActivityPage, filteredTeamActivitySummary, totalTeamActivityPages]);

  const packageCategoryOptions = useMemo(() => {
    return Array.from(
      new Set(
        packages.flatMap((pkg) =>
          pkg.items
            .map(
              (item) =>
                supplyItems.find((supply) => supply.id === item.supplyItemId)?.category ||
                supplyItems.find((supply) => supply.id === item.supplyItemId)?.categoryName ||
                '',
            )
            .filter(Boolean),
        ),
      ),
    );
  }, [packages, supplyItems]);

  const filteredPackageList = useMemo(() => {
    const normalizedSearch = packageSearch.trim().toLowerCase();
    return packages.filter((pkg) => {
      const packageCategories = pkg.items.map(
        (item) =>
          supplyItems.find((supply) => supply.id === item.supplyItemId)?.category ||
          supplyItems.find((supply) => supply.id === item.supplyItemId)?.categoryName ||
          '',
      );
      const matchesSearch =
        !normalizedSearch ||
        pkg.name.toLowerCase().includes(normalizedSearch) ||
        (pkg.description || '').toLowerCase().includes(normalizedSearch) ||
        pkg.items.some((item) => item.supplyItemName.toLowerCase().includes(normalizedSearch));
      const matchesCategory =
        packageCategoryFilter === 'all' ||
        packageCategories.some((category) => category === packageCategoryFilter);

      return matchesSearch && matchesCategory;
    });
  }, [packageCategoryFilter, packageSearch, packages, supplyItems]);

  const totalPackageListPages = Math.max(
    1,
    Math.ceil(filteredPackageList.length / PACKAGE_ITEMS_PER_PAGE),
  );
  const paginatedPackageList = useMemo(() => {
    const start = (Math.min(packageListPage, totalPackageListPages) - 1) * PACKAGE_ITEMS_PER_PAGE;
    return filteredPackageList.slice(start, start + PACKAGE_ITEMS_PER_PAGE);
  }, [filteredPackageList, packageListPage, totalPackageListPages]);

  const totalChecklistPages = Math.max(1, checklistPagination?.totalPages ?? 1);
  const paginatedChecklist = checklist;

  const totalDeliveriesPages = Math.max(1, deliveriesPagination?.totalPages ?? 1);
  const paginatedDeliveries = deliveries;

  const totalShortageRequestsPages = Math.max(1, shortageRequestsPagination?.totalPages ?? 1);
  const paginatedShortageRequests = shortageRequests;

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
      {!hasAssignedStation ? (
        <div className="flex min-h-[60vh] items-center justify-center px-4">
          <div className="flex max-w-md flex-col items-center gap-3 rounded-2xl border border-dashed border-border bg-card px-6 py-10 text-center shadow-sm">
            <span className="material-symbols-outlined text-5xl text-muted-foreground">store</span>
            <h2 className="text-xl font-bold text-foreground">Bạn chưa được gán trạm</h2>
            <p className="text-sm text-muted-foreground">
              Vui lòng liên hệ quản lý để được gán trạm cứu trợ trước khi tạo điểm phát, gói hỗ trợ
              hoặc phân phối hàng cứu trợ.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-6 min-w-0">
          <CoordinatorReliefDistributionPageHeader
            selectedCampaignId={selectedCampaignId}
            onCampaignChange={(value) => {
              setSelectedCampaignId(value);
              resetAllPages();
              setSelectedHouseholdsMap(new Map());
            }}
            campaigns={reliefCampaigns}
            stationName={headerStationName}
            locationName={headerLocationName}
          />

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Hộ dân chờ gán"
              value={householdsPagination?.totalCount ?? households.length}
              note="Danh sách hộ dân cần sắp xếp phân phối"
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
              label="Điểm phát đã tạo"
              value={distributionPoints.length}
              note="Dùng cho các hộ nhận tại điểm phát"
              icon="location_on"
              iconClass="bg-amber-500/10 text-amber-600 dark:text-amber-300"
            />
            <StatCard
              label="Mặt hàng trong chiến dịch"
              value={inventoryBalance?.distinctSupplyItemCount ?? 0}
              note={
                inventoryBalance?.campaignInventoryId
                  ? 'Số loại hàng hiện có trong tồn kho chiến dịch'
                  : 'Chiến dịch chưa có tồn kho hoặc chưa được cấp phát hàng'
              }
              icon="inventory"
              iconClass="bg-violet-500/10 text-violet-600 dark:text-violet-300"
            />
            <StatCard
              label="Gói hỗ trợ đã tạo"
              value={packages.length}
              note="Dùng để gán cho hộ dân khi phân phối"
              icon="inventory_2"
              iconClass="bg-emerald-500/10 text-emerald-600 dark:text-emerald-300"
            />
          </div>

          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
            <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold text-foreground">Tồn kho chiến dịch</h3>
                  <p className="text-sm text-muted-foreground">
                    Đây là nguồn dữ liệu chính để đóng gói hỗ trợ và theo dõi lượng hàng thực tế của
                    chiến dịch.
                  </p>
                </div>
                <Badge
                  variant={inventoryBalance?.campaignInventoryId ? 'success' : 'warning'}
                  appearance="light"
                >
                  {inventoryBalance?.campaignInventoryId
                    ? 'Sẵn sàng để đóng gói'
                    : 'Chưa có tồn kho'}
                </Badge>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-3">
                <div className="rounded-xl border border-border bg-muted/20 p-4">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    Ngân sách tổng
                  </p>
                  <p className="mt-2 text-lg font-semibold text-foreground">
                    {formatNumberVN(inventoryBalance?.budgetTotal ?? 0)}
                  </p>
                </div>
                <div className="rounded-xl border border-border bg-muted/20 p-4">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Đã chi</p>
                  <p className="mt-2 text-lg font-semibold text-foreground">
                    {formatNumberVN(inventoryBalance?.budgetSpent ?? 0)}
                  </p>
                </div>
                <div className="rounded-xl border border-border bg-muted/20 p-4">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    Tổng số lượng
                  </p>
                  <p className="mt-2 text-lg font-semibold text-foreground">
                    {formatNumberVN(inventoryBalance?.totalQuantity ?? 0)}
                  </p>
                </div>
              </div>

              <div className="mt-4 rounded-xl border border-dashed border-border bg-muted/10 p-4 text-sm">
                <p className="text-xs text-muted-foreground">Mã tồn kho chiến dịch</p>
                <p className="mt-1 text-muted-foreground break-all">
                  {inventoryBalance?.campaignInventoryId || 'Chưa phát sinh'}
                </p>
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3">
                <div>
                  <p className="font-medium text-blue-900">Duyệt yêu cầu thiếu hàng (Mobile)</p>
                  <p className="text-sm text-blue-800/80">
                    Xem và duyệt nhanh các yêu cầu thiếu hàng từ đội phát trực tiếp trên mobile.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="gap-2 border-blue-300 bg-white text-blue-700 hover:bg-blue-100"
                  onClick={() => setShowMobileShortageReview(true)}
                  disabled={!effectiveSelectedCampaignId}
                >
                  <span className="material-symbols-outlined text-[18px]">mobile_friendly</span>
                  Duyệt thiếu hàng
                </Button>
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
                <div>
                  <p className="font-medium text-emerald-900">Bổ sung quỹ chi cứu trợ</p>
                  <p className="text-sm text-emerald-800/80">
                    Trích ngân sách từ chiến dịch gây quỹ để bổ sung số dư cho campaign cứu trợ này.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="gap-2 border-emerald-300 bg-white text-emerald-700 hover:bg-emerald-100"
                  onClick={() => setBudgetExtractOpen(true)}
                  disabled={!effectiveSelectedCampaignId}
                >
                  <span className="material-symbols-outlined text-[18px]">
                    account_balance_wallet
                  </span>
                  Trích ngân sách
                </Button>
              </div>

              {inventoryBalanceError ? (
                <p className="mt-4 text-sm text-destructive">{inventoryBalanceError.message}</p>
              ) : isLoadingInventoryBalance ? (
                <p className="mt-4 text-sm text-muted-foreground">Đang tải tồn kho chiến dịch...</p>
              ) : !inventoryBalance?.items?.length ? (
                <div className="mt-4 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  <p className="font-medium">Tồn kho chiến dịch đang trống</p>
                  <p className="mt-1">
                    Cần duyệt cấp phát trước khi có thể đóng gói hỗ trợ từ tồn kho chiến dịch.
                  </p>
                </div>
              ) : (
                <div className="mt-4 space-y-2">
                  {inventoryBalance.items.slice(0, 6).map((item) => (
                    <div
                      key={item.supplyItemId}
                      className="flex items-center justify-between gap-3 rounded-xl border border-border bg-muted/20 px-4 py-3"
                    >
                      <div>
                        <p className="font-medium text-foreground">{item.supplyItemName}</p>
                        <p className="text-xs text-muted-foreground break-all">
                          {item.supplyItemId}
                        </p>
                      </div>
                      <Badge variant="outline" appearance="light">
                        {formatNumberVN(item.quantity)} {item.supplyItemUnit}
                      </Badge>
                    </div>
                  ))}
                  {inventoryBalance.items.length > 6 && (
                    <p className="text-xs text-muted-foreground">
                      +{formatNumberVN(inventoryBalance.items.length - 6)} mặt hàng khác trong tồn
                      kho chiến dịch.
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold text-foreground">
                    Khả năng đóng gói hỗ trợ
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Chọn gói ở bước gán hộ để biết hiện tại có thể đóng được bao nhiêu gói hỗ trợ.
                  </p>
                </div>
                <Badge
                  variant={
                    packageAssemblyAvailability?.maxAssemblableQuantity
                      ? 'success'
                      : selectedPackageForAvailability
                        ? 'warning'
                        : 'info'
                  }
                  appearance="light"
                >
                  {selectedPackageForAvailability?.name || 'Chưa chọn gói'}
                </Badge>
              </div>

              {!assignForm.reliefPackageDefinitionId ? (
                <p className="mt-4 text-sm text-muted-foreground">
                  Chọn gói ở bước gán hộ để tải dữ liệu khả năng đóng gói từ hệ thống.
                </p>
              ) : isLoadingAssemblyAvailability ? (
                <p className="mt-4 text-sm text-muted-foreground">
                  Đang kiểm tra khả năng đóng gói...
                </p>
              ) : packageAssemblyAvailabilityError ? (
                <p className="mt-4 text-sm text-destructive">
                  {
                    parseApiError(
                      packageAssemblyAvailabilityError,
                      'Không tải được dữ liệu khả năng đóng gói',
                    ).message
                  }
                </p>
              ) : packageAssemblyAvailability ? (
                <div className="mt-4 space-y-4">
                  <div
                    className={`rounded-2xl border px-4 py-4 ${
                      packageAssemblyAvailability.maxAssemblableQuantity > 0
                        ? 'border-emerald-300 bg-emerald-50'
                        : 'border-amber-300 bg-amber-50'
                    }`}
                  >
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">
                      Kết quả đóng gói hiện tại
                    </p>
                    <div className="mt-2 flex items-end justify-between gap-3">
                      <div>
                        <p className="text-3xl font-black text-foreground">
                          {formatNumberVN(packageAssemblyAvailability.maxAssemblableQuantity)}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {packageAssemblyAvailability.outputUnit} có thể đóng ngay
                        </p>
                      </div>
                      <Badge
                        variant={
                          packageAssemblyAvailability.maxAssemblableQuantity > 0
                            ? 'success'
                            : 'warning'
                        }
                        appearance="light"
                      >
                        {packageAssemblyAvailability.maxAssemblableQuantity > 0
                          ? 'Có thể đóng gói'
                          : 'Đang thiếu hàng'}
                      </Badge>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-xl border border-border bg-muted/20 p-4">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">
                        Vật phẩm đầu ra
                      </p>
                      <p className="mt-2 font-semibold text-foreground">
                        {packageAssemblyAvailability.outputSupplyItemName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {packageAssemblyAvailability.outputUnit} · Mã tồn kho chiến dịch:{' '}
                        {packageAssemblyAvailability.campaignInventoryId || '—'}
                      </p>
                    </div>
                    <div className="rounded-xl border border-border bg-muted/20 p-4">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">
                        Số gói tối đa
                      </p>
                      <p className="mt-2 font-semibold text-foreground">
                        {formatNumberVN(packageAssemblyAvailability.maxAssemblableQuantity)}{' '}
                        {packageAssemblyAvailability.outputUnit}
                      </p>
                    </div>
                  </div>

                  {packageAssemblyAvailability.maxAssemblableQuantity <= 0 && (
                    <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                      <p className="font-medium">Chưa thể đóng gói này</p>
                      <p className="mt-1">
                        Hệ thống đang thiếu một hoặc nhiều thành phần trong tồn kho chiến dịch. Xem
                        các dòng bên dưới để biết vật phẩm đang giới hạn số lượng gói.
                      </p>
                    </div>
                  )}

                  <div className="space-y-2">
                    {packageAssemblyAvailability.components.map((component) => (
                      <div
                        key={component.supplyItemId}
                        className={`rounded-xl border px-4 py-3 ${
                          component.maxAssemblableByItem <=
                          packageAssemblyAvailability.maxAssemblableQuantity
                            ? 'border-amber-300 bg-amber-50'
                            : 'border-border bg-muted/20'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="font-medium text-foreground">
                                {component.supplyItemName}
                              </p>
                              {component.maxAssemblableByItem <=
                                packageAssemblyAvailability.maxAssemblableQuantity && (
                                <Badge variant="warning" appearance="light">
                                  Vật phẩm giới hạn
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground">
                              Cần {formatNumberVN(component.requiredPerPackage)} {component.unit} /
                              gói
                            </p>
                          </div>
                          <div className="text-right text-xs text-muted-foreground">
                            <p>
                              Tồn hiện có: {formatNumberVN(component.availableQuantity)}{' '}
                              {component.unit}
                            </p>
                            <p>
                              Tối đa theo vật phẩm: {formatNumberVN(component.maxAssemblableByItem)}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <Button
                    type="button"
                    className="gap-2"
                    disabled={
                      assemblePackageMutation.isPending ||
                      packageAssemblyAvailability.maxAssemblableQuantity <= 0
                    }
                    onClick={handleAssembleSelectedPackage}
                  >
                    <span className="material-symbols-outlined text-[18px]">inventory_2</span>
                    {packageAssemblyAvailability.maxAssemblableQuantity > 0
                      ? 'Đóng ngay 1 gói'
                      : 'Chưa thể đóng gói'}
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    Thao tác này sẽ tiêu hao ngay hàng trong tồn kho chiến dịch và cộng vật phẩm đầu
                    ra vào tồn kho chiến dịch.
                  </p>
                </div>
              ) : (
                <p className="mt-4 text-sm text-muted-foreground">
                  Chưa có dữ liệu khả năng đóng gói.
                </p>
              )}
            </div>
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
            distributionPointEditing={!!editingDistributionPoint}
            onCancelDistributionPointEdit={handleCancelEditDistributionPoint}
            onEditDistributionPoint={handleUpdatePoint}
            onDeleteDistributionPoint={() => {
              if (!editingDistributionPoint) return;
              requestDelete({
                type: 'distribution-point',
                id: editingDistributionPoint.distributionPointId,
                label: editingDistributionPoint.name,
              });
            }}
            packageEditing={!!editingPackage}
            onCancelPackageEdit={handleCancelEditPackage}
            onEditPackage={handleUpdatePackage}
            onDeletePackage={() => {
              if (!editingPackage) return;
              requestDelete({
                type: 'package',
                id: editingPackage.reliefPackageDefinitionId,
                label: editingPackage.name,
              });
            }}
          />

          <CoordinatorDistributionPointsMap
            points={distributionPointSummaries}
            center={{
              lat: Number(station?.latitude) || distributionPointForm.latitude,
              lng: Number(station?.longitude) || distributionPointForm.longitude,
            }}
          />

          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-foreground">Danh sách điểm phát</h3>
                <p className="text-sm text-muted-foreground">
                  Chỉnh sửa hoặc xoá điểm phát đã tạo.
                </p>
              </div>
              <Badge variant="outline" appearance="light">
                {formatNumberVN(distributionPoints.length)} điểm phát
              </Badge>
            </div>

            {distributionPoints.length === 0 ? (
              <p className="text-sm text-muted-foreground">Chưa có điểm phát nào.</p>
            ) : (
              <div className="space-y-3">
                {distributionPoints.map((point) => (
                  <div
                    key={point.distributionPointId}
                    className="flex flex-col gap-3 rounded-xl border border-border bg-muted/20 p-4 md:flex-row md:items-center md:justify-between"
                  >
                    <div>
                      <p className="font-medium text-foreground">{point.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {point.address || 'Chưa có địa chỉ'}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {formatDateTimeVN(point.startsAt)}
                        {point.endsAt ? ` - ${formatDateTimeVN(point.endsAt)}` : ''}
                      </p>
                    </div>
                    <div className="flex flex-wrap justify-end gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        className="gap-1"
                        onClick={() => handleStartEditDistributionPoint(point)}
                      >
                        <span className="material-symbols-outlined text-[16px]">edit</span>
                        Sửa
                      </Button>
                      <Button
                        type="button"
                        variant="destructive"
                        className="gap-1"
                        onClick={() =>
                          requestDelete({
                            type: 'distribution-point',
                            id: point.distributionPointId,
                            label: point.name,
                          })
                        }
                      >
                        <span className="material-symbols-outlined text-[16px]">delete</span>
                        Xoá
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              <div className="mb-4">
                <ReliefStickySectionHeader
                  title="Theo dõi hoạt động đội"
                  description="Tổng hợp nhanh số hộ đã được giao và đã hoàn tất theo từng đội."
                  badgeIcon="groups"
                  badgeLabel={`${formatNumberInputVN(filteredTeamActivitySummary.length)} đội`}
                />
              </div>
              <div className="max-h-[292px] space-y-3 overflow-y-auto pr-1">
                <ReliefFilterBar className="grid gap-3 md:grid-cols-[minmax(0,1fr)_180px]">
                  <Input
                    placeholder="Tìm theo tên đội"
                    value={teamSearch}
                    onChange={(e) => {
                      setTeamSearch(e.target.value);
                      setTeamActivityPage(1);
                    }}
                  />
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={teamProgressFilter}
                    onChange={(e) => {
                      setTeamProgressFilter(
                        e.target.value as 'all' | 'not-started' | 'active' | 'completed',
                      );
                      setTeamActivityPage(1);
                    }}
                  >
                    <option value="all">Tất cả tiến độ</option>
                    <option value="not-started">Chưa bắt đầu</option>
                    <option value="active">Đang thực hiện</option>
                    <option value="completed">Hoàn tất</option>
                  </select>
                </ReliefFilterBar>
                {filteredTeamActivitySummary.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-border bg-muted/20 px-4 py-8 text-center">
                    <span className="material-symbols-outlined text-3xl text-muted-foreground">
                      groups
                    </span>
                    <p className="mt-3 font-medium text-foreground">
                      {teamActivitySummary.length === 0
                        ? 'Chưa có hoạt động đội để hiển thị.'
                        : 'Không tìm thấy đội phù hợp với bộ lọc hiện tại.'}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {teamActivitySummary.length === 0
                        ? 'Danh sách đội sẽ xuất hiện khi chiến dịch đã có đội tham gia và bắt đầu gán hộ.'
                        : 'Hãy thử đổi từ khóa tìm kiếm hoặc chọn lại trạng thái tiến độ.'}
                    </p>
                    {teamActivitySummary.length > 0 && (
                      <div className="mt-4 flex justify-center">
                        <Button
                          type="button"
                          variant="outline"
                          className="gap-2"
                          onClick={() => {
                            setTeamSearch('');
                            setTeamProgressFilter('all');
                            setTeamActivityPage(1);
                          }}
                        >
                          <span className="material-symbols-outlined text-[18px]">restart_alt</span>
                          Xóa bộ lọc
                        </Button>
                      </div>
                    )}
                  </div>
                ) : (
                  paginatedTeamActivitySummary.map((team) => (
                    <div
                      key={team.teamName}
                      className="rounded-xl border border-border bg-muted/20 p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <div className="flex size-10 items-center justify-center rounded-2xl border border-primary/15 bg-primary/10 text-primary">
                            <span className="material-symbols-outlined text-[20px]">
                              diversity_3
                            </span>
                          </div>
                          <div>
                            <p className="font-medium text-foreground">{team.teamName}</p>
                            <p className="mt-1 text-sm text-muted-foreground">
                              Đã nhận {formatNumberVN(team.assignedCount)} hộ · Hoàn tất{' '}
                              {formatNumberVN(team.deliveredCount)} hộ
                            </p>
                          </div>
                        </div>
                        <Badge
                          variant={team.progressTone.variant}
                          appearance="light"
                          className="gap-1.5"
                        >
                          <span className="material-symbols-outlined text-[15px]">
                            {team.progressTone.icon}
                          </span>
                          {team.progressTone.label}
                        </Badge>
                      </div>

                      <div className="mt-4 space-y-2">
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>Tiến độ thực hiện</span>
                          <span>{formatNumberVN(team.completionRate)}%</span>
                        </div>
                        <Progress value={team.completionRate} className="h-2" />
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2 text-xs">
                        <div className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1 text-muted-foreground">
                          <span className="material-symbols-outlined text-[15px]">
                            assignment_ind
                          </span>
                          {formatNumberVN(team.assignedCount)} hộ đã nhận
                        </div>
                        <div className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1 text-muted-foreground">
                          <span className="material-symbols-outlined text-[15px]">task_alt</span>
                          {formatNumberVN(team.deliveredCount)} hộ hoàn tất
                        </div>
                        <div className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1 text-muted-foreground">
                          <span className="material-symbols-outlined text-[15px]">
                            pending_actions
                          </span>
                          {formatNumberVN(team.remainingCount)} hộ còn lại
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
              {filteredTeamActivitySummary.length > ACTIVITY_ITEMS_PER_PAGE && (
                <ReliefPaginationBar
                  currentPage={Math.min(teamActivityPage, totalTeamActivityPages)}
                  totalPages={totalTeamActivityPages}
                  onPrevious={() => setTeamActivityPage((prev) => Math.max(1, prev - 1))}
                  onNext={() =>
                    setTeamActivityPage((prev) => Math.min(totalTeamActivityPages, prev + 1))
                  }
                />
              )}
            </div>

            <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              <div className="mb-4">
                <ReliefStickySectionHeader
                  title="Bước 3. Danh sách gói hỗ trợ"
                  description="Kiểm tra lại các gói hỗ trợ đã tạo trước khi gán cho hộ dân."
                  badgeIcon="inventory_2"
                  badgeLabel={`${formatNumberInputVN(filteredPackageList.length)} gói`}
                />
              </div>
              <div className="max-h-[292px] space-y-3 overflow-y-auto pr-1">
                <ReliefFilterBar className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px]">
                  <Input
                    placeholder="Tìm theo tên gói hoặc vật phẩm"
                    value={packageSearch}
                    onChange={(e) => {
                      setPackageSearch(e.target.value);
                      setPackageListPage(1);
                    }}
                  />
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={packageCategoryFilter}
                    onChange={(e) => {
                      setPackageCategoryFilter(e.target.value);
                      setPackageListPage(1);
                    }}
                  >
                    <option value="all">Tất cả danh mục</option>
                    {packageCategoryOptions.map((category) => (
                      <option key={String(category)} value={String(category)}>
                        {String(category)}
                      </option>
                    ))}
                  </select>
                </ReliefFilterBar>
                {filteredPackageList.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-border bg-muted/20 px-4 py-8 text-center">
                    <span className="material-symbols-outlined text-3xl text-muted-foreground">
                      inventory_2
                    </span>
                    <p className="mt-3 font-medium text-foreground">
                      {packages.length === 0
                        ? 'Chưa có gói hỗ trợ nào được tạo.'
                        : 'Không có gói hỗ trợ nào khớp bộ lọc hiện tại.'}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {packages.length === 0
                        ? 'Hãy tạo gói hỗ trợ ở bước 2 để bắt đầu gán hộ dân.'
                        : 'Hãy thử đổi từ khóa tìm kiếm hoặc chọn lại danh mục vật phẩm.'}
                    </p>
                    <div className="mt-4 flex justify-center gap-2">
                      {packages.length > 0 && (
                        <Button
                          type="button"
                          variant="outline"
                          className="gap-2"
                          onClick={() => {
                            setPackageSearch('');
                            setPackageCategoryFilter('all');
                            setPackageListPage(1);
                          }}
                        >
                          <span className="material-symbols-outlined text-[18px]">restart_alt</span>
                          Xóa bộ lọc
                        </Button>
                      )}
                      {packages.length === 0 && (
                        <Button
                          type="button"
                          variant="outline"
                          className="gap-2"
                          onClick={() => scrollToSection(PACKAGE_SECTION_ID)}
                        >
                          <span className="material-symbols-outlined text-[18px]">inventory_2</span>
                          Đi tới bước tạo gói
                        </Button>
                      )}
                    </div>
                  </div>
                ) : (
                  paginatedPackageList.map((pkg) => (
                    <div
                      key={pkg.reliefPackageDefinitionId}
                      className="rounded-xl border border-border bg-muted/20 p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <span className="text-[14px] text-muted-foreground">Gói:</span>
                          <div>
                            <p className="font-medium text-foreground">{pkg.name}</p>
                            <div className="mt-2 flex flex-wrap gap-2 flex items-center">
                              <span className="text-[12px] text-muted-foreground">Bao gồm:</span>
                              {pkg.items.slice(0, 3).map((item) => (
                                <div
                                  key={item.reliefPackageDefinitionItemId}
                                  className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1 text-xs text-muted-foreground"
                                >
                                  <span>{item.supplyItemName}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <Badge variant="primary" appearance="light" className="gap-1.5">
                            <span className="material-symbols-outlined text-[15px]">
                              inventory_2
                            </span>
                            {formatNumberVN(pkg.items.length)} vật phẩm
                          </Badge>
                          {/* <Badge variant="outline" appearance="light">
                            Đầu ra: {pkg.outputSupplyItemName || 'Chưa rõ'}
                            {pkg.outputUnit ? ` · ${pkg.outputUnit}` : ''}
                          </Badge> */}
                          {pkg.isDefault && (
                            <Badge variant="success" appearance="light">
                              Mặc định
                            </Badge>
                          )}
                          <Badge variant="info" appearance="light">
                            Tiền mặt: {formatNumberVN(pkg.cashSupportAmount ?? 0) + ' VNĐ'}
                          </Badge>
                        </div>
                      </div>
                      <Separator className="my-3" />
                      <span className="text-[12px] text-muted-foreground">Mô tả:</span>
                      <p className="mt-3 text-sm text-muted-foreground">
                        {pkg.description || 'Chưa có mô tả cho gói hỗ trợ này.'}
                      </p>

                      <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                        {pkg.items.slice(0, 4).map((item) => (
                          <div
                            key={item.reliefPackageDefinitionItemId}
                            className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1"
                          >
                            <SupplyCategoryBadge
                              category={
                                supplyItems.find((supply) => supply.id === item.supplyItemId)
                                  ?.category ||
                                supplyItems.find((supply) => supply.id === item.supplyItemId)
                                  ?.categoryName ||
                                ''
                              }
                            />
                            <span>
                              {item.supplyItemName} · {formatNumberVN(item.quantity)} {item.unit}
                            </span>
                          </div>
                        ))}
                        {pkg.items.length > 4 && (
                          <span className="rounded-full border border-border bg-background px-3 py-1">
                            +{formatNumberVN(pkg.items.length - 4)} vật phẩm khác
                          </span>
                        )}
                      </div>

                      <div className="mt-4 flex justify-end gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          className="gap-1"
                          onClick={() => handleStartEditPackage(pkg)}
                        >
                          <span className="material-symbols-outlined text-[16px]">edit</span>
                          Sửa
                        </Button>
                        <Button
                          type="button"
                          variant="destructive"
                          className="gap-1"
                          onClick={() =>
                            requestDelete({
                              type: 'package',
                              id: pkg.reliefPackageDefinitionId,
                              label: pkg.name,
                            })
                          }
                        >
                          <span className="material-symbols-outlined text-[16px]">delete</span>
                          Xoá
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
              {filteredPackageList.length > PACKAGE_ITEMS_PER_PAGE && (
                <ReliefPaginationBar
                  currentPage={Math.min(packageListPage, totalPackageListPages)}
                  totalPages={totalPackageListPages}
                  onPrevious={() => setPackageListPage((prev) => Math.max(1, prev - 1))}
                  onNext={() =>
                    setPackageListPage((prev) => Math.min(totalPackageListPages, prev + 1))
                  }
                />
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
                household.campaignTeamName || (household.campaignTeamId ? 'Đã gán đội' : ''),
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
            filtersValue={filtersValue}
            onChangeFilters={handleFiltersChange}
            onResetFilters={resetFilters}
            filtersExpanded={filtersExpanded}
            onFiltersExpandedChange={setFiltersExpanded}
            distributionPoints={distributionPoints.map((point) => ({
              label: point.name,
              value: point.distributionPointId,
            }))}
            onJumpToCreateTeam={() => navigate('/portal/coordinator/teams')}
            onJumpToCreatePackage={() => scrollToSection(PACKAGE_SECTION_ID)}
            assignErrors={assignErrors}
            onEditHousehold={(household) =>
              handleEditHousehold(household as CampaignHouseholdResponse)
            }
            onDeleteHousehold={(household) =>
              requestDelete({
                type: 'household',
                id: household.campaignHouseholdId,
                label: household.householdCode,
              })
            }
            onUpdateStatusHousehold={(household) =>
              handleOpenUpdateStatus(household as CampaignHouseholdResponse)
            }
          />

          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm mt-6">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-foreground">Danh sách giao hàng</h3>
              <p className="text-sm text-muted-foreground">
                Theo dõi tiến độ giao hàng theo thứ tự thực tế
              </p>
            </div>
            {deliveries.length === 0 ? (
              <p className="text-sm text-muted-foreground">Chưa có giao hàng nào.</p>
            ) : (
              <div className="space-y-3">
                {paginatedDeliveries.map((delivery) => (
                  <div
                    key={delivery.householdDeliveryId}
                    className="rounded-xl border bg-muted/20 p-4"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium">{delivery.householdCode}</p>
                        <p className="text-sm text-muted-foreground">
                          {delivery.campaignTeamName || 'Chưa rõ đội'} ·{' '}
                          {delivery.distributionPointName || 'Không có điểm'}
                        </p>
                      </div>
                      <Badge variant={delivery.status === 2 ? 'success' : 'warning'}>
                        {delivery.status === 2 ? 'Đã phát' : 'Chưa phát'}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm mt-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-foreground">Yêu cầu thiếu hàng</h3>
                <p className="text-sm text-muted-foreground">
                  Các yêu cầu bổ sung hàng hóa từ đội phát
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant={shortageRequests.length > 0 ? 'warning' : 'success'}>
                  {shortageRequests.length} chờ duyệt
                </Badge>
                {shortageRequests.length > 0 && (
                  <Button size="sm" onClick={() => setShowMobileShortageReview(true)}>
                    Mở thiết lập duyệt
                  </Button>
                )}
              </div>
            </div>
            {shortageRequests.length === 0 ? (
              <p className="text-sm text-muted-foreground">Không có yêu cầu nào.</p>
            ) : (
              <div className="space-y-3">
                {paginatedShortageRequests.map((request) => (
                  <div
                    key={request.supplyShortageRequestId}
                    className="rounded-xl border bg-muted/20 p-4"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-medium">
                          {request.distributionPointName || 'Không có điểm'} ·{' '}
                          {request.campaignTeamName || 'Không có team'}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {request.requestedByUserName}
                        </p>
                      </div>
                      <Badge variant="warning">Chờ duyệt</Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Vật phẩm:{' '}
                      {request.items
                        .map((i) => `${i.supplyItemName} (${i.quantityRequested})`)
                        .join(', ')}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-foreground">
                Bước 5. Rà soát checklist phân phối
              </h3>
              <p className="text-sm text-muted-foreground">
                Kiểm tra danh sách hộ đã được gán, thờ gian hẹn phát và trạng thái thực hiện.
              </p>
            </div>
            <div className="space-y-3">
              {checklist.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Chưa có checklist phân phát cho chiến dịch này.
                </p>
              ) : (
                paginatedChecklist.map((item) => (
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
                          {item.campaignTeamName ||
                            teamNameById[item.campaignTeamId || ''] ||
                            'Chưa rõ đội'}
                          {item.distributionPointName
                            ? ` · Điểm: ${item.distributionPointName}`
                            : ''}
                          {item.reliefPackageDefinitionName
                            ? ` · Gói: ${item.reliefPackageDefinitionName}`
                            : ''}
                          {' · Hẹn phát '}
                          {formatDateTimeVN(item.scheduledAt)}
                        </p>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Minh chứng: {formatNumberVN(item.proofCount)} · Đã phát:{' '}
                        {item.deliveredAt ? formatDateTimeVN(item.deliveredAt) : 'Chưa phát'}
                      </div>
                    </div>
                    <div className="mt-3 flex justify-end">
                      <Button
                        type="button"
                        variant={item.deliveredAt ? 'outline' : 'primary'}
                        className="gap-2"
                        disabled={!!item.deliveredAt}
                        onClick={() => handleOpenCompleteDelivery(item)}
                      >
                        <span className="material-symbols-outlined text-[18px]">task_alt</span>
                        {item.deliveredAt ? 'Đã hoàn tất' : 'Hoàn tất phát quà'}
                      </Button>
                    </div>
                  </div>
                ))
              )}
              {totalShortageRequestsPages > 1 && (
                <div className="mt-4">
                  <ReliefPaginationBar
                    currentPage={Math.min(shortageRequestsPage, totalShortageRequestsPages)}
                    totalPages={totalShortageRequestsPages}
                    onPrevious={() => setShortageRequestsPage((prev) => Math.max(1, prev - 1))}
                    onNext={() =>
                      setShortageRequestsPage((prev) =>
                        Math.min(totalShortageRequestsPages, prev + 1),
                      )
                    }
                  />
                </div>
              )}
              {totalDeliveriesPages > 1 && (
                <div className="mt-4">
                  <ReliefPaginationBar
                    currentPage={Math.min(deliveriesPage, totalDeliveriesPages)}
                    totalPages={totalDeliveriesPages}
                    onPrevious={() => setDeliveriesPage((prev) => Math.max(1, prev - 1))}
                    onNext={() =>
                      setDeliveriesPage((prev) => Math.min(totalDeliveriesPages, prev + 1))
                    }
                  />
                </div>
              )}
            </div>
            {checklist.length > CHECKLIST_ITEMS_PER_PAGE && (
              <ReliefPaginationBar
                currentPage={Math.min(checklistPage, totalChecklistPages)}
                totalPages={totalChecklistPages}
                onPrevious={() => setChecklistPage((prev) => Math.max(1, prev - 1))}
                onNext={() => setChecklistPage((prev) => Math.min(totalChecklistPages, prev + 1))}
              />
            )}
          </div>

          <Dialog
            open={!!updateStatusTarget}
            onOpenChange={(open) => {
              if (!open) {
                setUpdateStatusTarget(null);
                setUpdateStatusErrors({});
              }
            }}
          >
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Cập nhật trạng thái hộ dân</DialogTitle>
                <DialogDescription>
                  Chuyển trạng thái xử lý của hộ dân theo tiến độ thực tế.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="space-y-2">
                  <p className="text-sm font-medium">Trạng thái</p>
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={updateStatusForm.status}
                    onChange={(e) =>
                      setUpdateStatusForm((prev) => ({ ...prev, status: Number(e.target.value) }))
                    }
                  >
                    <option value={0}>Chờ xử lý</option>
                    <option value={1}>Đang tiến hành</option>
                    <option value={2}>Hoàn thành</option>
                    <option value={3}>Bị kẹt</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-medium">Ghi chú</p>
                  <Textarea
                    value={updateStatusForm.notes}
                    onChange={(e) =>
                      setUpdateStatusForm((prev) => ({ ...prev, notes: e.target.value }))
                    }
                    placeholder="Nhập ghi chú tiến độ hoặc lý do bị kẹt"
                    rows={4}
                  />
                </div>

                {updateStatusErrors.form && (
                  <p className="text-sm text-destructive">{updateStatusErrors.form}</p>
                )}
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setUpdateStatusTarget(null)}>
                  Hủy
                </Button>
                <Button type="button" className="gap-2" onClick={handleSubmitUpdateStatus}>
                  <span className="material-symbols-outlined text-[18px]">sync_alt</span>
                  Cập nhật trạng thái
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Sheet
            open={!!editingHousehold}
            onOpenChange={(open) => {
              if (!open) {
                setEditingHousehold(null);
                setHouseholdEditForm(null);
                setHouseholdEditErrors({});
              }
            }}
          >
            <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto">
              <SheetHeader>
                <SheetTitle>Chỉnh sửa hộ dân</SheetTitle>
                <SheetDescription>
                  Cập nhật nhanh thông tin hộ dân trước khi gán phân phối.
                </SheetDescription>
              </SheetHeader>

              {householdEditForm && (
                <div className="mt-6 space-y-4">
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Tên chủ hộ</p>
                    <Input
                      value={householdEditForm.headOfHouseholdName}
                      onChange={(e) =>
                        setHouseholdEditForm((prev) =>
                          prev ? { ...prev, headOfHouseholdName: e.target.value } : prev,
                        )
                      }
                    />
                    {householdEditErrors.headOfHouseholdName && (
                      <p className="text-sm text-destructive">
                        {householdEditErrors.headOfHouseholdName}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm font-medium">Số điện thoại</p>
                    <Input
                      value={householdEditForm.contactPhone}
                      onChange={(e) =>
                        setHouseholdEditForm((prev) =>
                          prev ? { ...prev, contactPhone: e.target.value } : prev,
                        )
                      }
                    />
                    {householdEditErrors.contactPhone && (
                      <p className="text-sm text-destructive">{householdEditErrors.contactPhone}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm font-medium">Địa chỉ</p>
                    <Input
                      value={householdEditForm.address}
                      onChange={(e) =>
                        setHouseholdEditForm((prev) =>
                          prev ? { ...prev, address: e.target.value } : prev,
                        )
                      }
                    />
                    {householdEditErrors.address && (
                      <p className="text-sm text-destructive">{householdEditErrors.address}</p>
                    )}
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Số nhân khẩu</p>
                      <Input
                        type="number"
                        min={1}
                        value={householdEditForm.householdSize}
                        onChange={(e) =>
                          setHouseholdEditForm((prev) =>
                            prev ? { ...prev, householdSize: Number(e.target.value) || 0 } : prev,
                          )
                        }
                      />
                      {householdEditErrors.householdSize && (
                        <p className="text-sm text-destructive">
                          {householdEditErrors.householdSize}
                        </p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Hình thức nhận</p>
                      <select
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        value={householdEditForm.deliveryMode}
                        onChange={(e) =>
                          setHouseholdEditForm((prev) =>
                            prev ? { ...prev, deliveryMode: Number(e.target.value) } : prev,
                          )
                        }
                      >
                        <option value={DeliveryMode.DoorToDoor}>Phát tại nhà</option>
                        <option value={DeliveryMode.PickupAtPoint}>Nhận tại điểm phát</option>
                      </select>
                      {householdEditErrors.deliveryMode && (
                        <p className="text-sm text-destructive">
                          {householdEditErrors.deliveryMode}
                        </p>
                      )}
                    </div>
                  </div>

                  <label className="inline-flex items-center gap-2 text-sm text-foreground">
                    <input
                      type="checkbox"
                      checked={householdEditForm.isIsolated}
                      onChange={(e) =>
                        setHouseholdEditForm((prev) =>
                          prev ? { ...prev, isIsolated: e.target.checked } : prev,
                        )
                      }
                    />
                    Hộ dân ở khu vực cách ly
                  </label>
                  {householdEditErrors.isIsolated && (
                    <p className="text-sm text-destructive">{householdEditErrors.isIsolated}</p>
                  )}

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Vĩ độ</p>
                      <Input
                        type="number"
                        step="any"
                        value={householdEditForm.latitude}
                        onChange={(e) =>
                          setHouseholdEditForm((prev) =>
                            prev ? { ...prev, latitude: Number(e.target.value) || 0 } : prev,
                          )
                        }
                      />
                      {householdEditErrors.latitude && (
                        <p className="text-sm text-destructive">{householdEditErrors.latitude}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Kinh độ</p>
                      <Input
                        type="number"
                        step="any"
                        value={householdEditForm.longitude}
                        onChange={(e) =>
                          setHouseholdEditForm((prev) =>
                            prev ? { ...prev, longitude: Number(e.target.value) || 0 } : prev,
                          )
                        }
                      />
                      {householdEditErrors.longitude && (
                        <p className="text-sm text-destructive">{householdEditErrors.longitude}</p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm font-medium">Ghi chú</p>
                    <Textarea
                      value={householdEditForm.notes}
                      onChange={(e) =>
                        setHouseholdEditForm((prev) =>
                          prev ? { ...prev, notes: e.target.value } : prev,
                        )
                      }
                    />
                    {householdEditErrors.notes && (
                      <p className="text-sm text-destructive">{householdEditErrors.notes}</p>
                    )}
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setEditingHousehold(null);
                        setHouseholdEditForm(null);
                        setHouseholdEditErrors({});
                      }}
                    >
                      Huỷ
                    </Button>
                    <Button
                      type="button"
                      onClick={handleSaveHousehold}
                      disabled={patchHouseholdMutation.isPending}
                    >
                      Lưu thay đổi
                    </Button>
                  </div>
                </div>
              )}
            </SheetContent>
          </Sheet>

          <ConfirmDialog
            open={confirmDeleteOpen}
            onOpenChange={(open) => {
              setConfirmDeleteOpen(open);
              if (!open) setDeleteTarget(null);
            }}
            title="Xác nhận xoá"
            description={`Bạn có chắc muốn xoá ${deleteTarget?.label || 'mục này'} không? Hành động này không thể hoàn tác.`}
            confirmText="Xoá"
            cancelText="Huỷ"
            variant="destructive"
            onConfirm={handleConfirmDelete}
          />

          <Dialog open={budgetExtractOpen} onOpenChange={setBudgetExtractOpen}>
            <DialogContent className="sm:max-w-[560px]">
              <DialogHeader>
                <DialogTitle>Trích ngân sách sang chiến dịch cứu trợ</DialogTitle>
                <DialogDescription>
                  Chọn chiến dịch gây quỹ nguồn, số tiền và ghi chú để chuyển quỹ sang campaign này.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="space-y-2">
                  <p className="text-sm font-medium">Chiến dịch gây quỹ nguồn</p>
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={budgetExtractForm.sourceCampaignId}
                    onChange={(e) =>
                      setBudgetExtractForm((prev) => ({
                        ...prev,
                        sourceCampaignId: e.target.value,
                      }))
                    }
                  >
                    <option value="">Chọn chiến dịch gây quỹ</option>
                    {fundraisingCampaigns.map((campaign) => {
                      const summary = sourceSummaries[campaign.campaignId];
                      const isLoaded = !!summary;
                      const remaining = summary?.remainingBudget ?? 0;
                      const isAvailable = isLoaded && remaining > 0;
                      return (
                        <option
                          key={campaign.campaignId}
                          value={campaign.campaignId}
                          disabled={isLoaded && !isAvailable}
                        >
                          {campaign.name}{' '}
                          {isLoaded
                            ? isAvailable
                              ? `(Khả dụng: ${formatNumberVN(remaining)})`
                              : '(Không khả dụng)'
                            : '(Đang tải...)'}
                        </option>
                      );
                    })}
                  </select>
                  {isSourceCampaignSummaryLoading && (
                    <p className="text-sm text-muted-foreground mt-1">
                      Đang tải thông tin ngân sách...
                    </p>
                  )}
                  {sourceCampaignSummary && (
                    <div className="mt-2 rounded-lg bg-muted/50 p-3 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Tổng quỹ quyên góp:</span>
                        <span className="font-semibold text-primary">
                          {formatNumberVN(sourceCampaignSummary.totalMoneyReceived)}
                        </span>
                      </div>
                      <div className="flex justify-between mt-1">
                        <span className="text-muted-foreground">Ngân sách còn lại (khả dụng):</span>
                        <span className="font-semibold text-green-600 dark:text-green-400">
                          {formatNumberVN(sourceCampaignSummary.remainingBudget)}
                        </span>
                      </div>
                    </div>
                  )}
                  {budgetExtractErrors.sourceCampaignId && (
                    <p className="text-sm text-destructive">
                      {budgetExtractErrors.sourceCampaignId}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-medium">Số tiền trích</p>
                  <Input
                    placeholder="Ví dụ: 10000000"
                    value={budgetExtractForm.amount}
                    onChange={(e) =>
                      setBudgetExtractForm((prev) => ({
                        ...prev,
                        amount: formatNumberInputVN(e.target.value),
                      }))
                    }
                  />
                  {budgetExtractErrors.amount && (
                    <p className="text-sm text-destructive">{budgetExtractErrors.amount}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-medium">Ghi chú</p>
                  <Textarea
                    placeholder="Ví dụ: Bổ sung ngân sách hỗ trợ tiền mặt"
                    value={budgetExtractForm.note}
                    onChange={(e) =>
                      setBudgetExtractForm((prev) => ({ ...prev, note: e.target.value }))
                    }
                  />
                  {budgetExtractErrors.note && (
                    <p className="text-sm text-destructive">{budgetExtractErrors.note}</p>
                  )}
                </div>

                {budgetExtractErrors.form && (
                  <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                    {budgetExtractErrors.form}
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setBudgetExtractOpen(false)}>
                  Hủy
                </Button>
                <Button
                  onClick={handleSubmitBudgetExtract}
                  disabled={extractBudgetMutation.isPending}
                >
                  {extractBudgetMutation.isPending ? 'Đang trích...' : 'Xác nhận trích ngân sách'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog
            open={!!completeDeliveryTarget}
            onOpenChange={(open) => {
              if (!open) {
                setCompleteDeliveryTarget(null);
                setCompleteDeliveryErrors({});
              }
            }}
          >
            <DialogContent className="sm:max-w-[640px]">
              <DialogHeader>
                <DialogTitle>Hoàn tất phát quà</DialogTitle>
                <DialogDescription>
                  Bổ sung minh chứng và tiền mặt hỗ trợ thực tế cho lượt phát này.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                {completeDeliveryTarget && (
                  <div className="rounded-xl border border-border bg-muted/20 p-4 text-sm">
                    <p className="font-medium text-foreground">
                      {completeDeliveryTarget.householdCode} ·{' '}
                      {completeDeliveryTarget.headOfHouseholdName}
                    </p>
                    <p className="mt-1 text-muted-foreground">
                      Hẹn phát: {formatDateTimeVN(completeDeliveryTarget.scheduledAt)}
                    </p>
                  </div>
                )}

                <div className="space-y-2">
                  <p className="text-sm font-medium">URL minh chứng</p>
                  <Input
                    placeholder="https://..."
                    value={completeDeliveryForm.proofFileUrl}
                    onChange={(e) =>
                      setCompleteDeliveryForm((prev) => ({ ...prev, proofFileUrl: e.target.value }))
                    }
                  />
                  {completeDeliveryErrors.proofFileUrl && (
                    <p className="text-sm text-destructive">
                      {completeDeliveryErrors.proofFileUrl}
                    </p>
                  )}
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Loại file</p>
                    <Input
                      placeholder="image/jpeg"
                      value={completeDeliveryForm.proofContentType}
                      onChange={(e) =>
                        setCompleteDeliveryForm((prev) => ({
                          ...prev,
                          proofContentType: e.target.value,
                        }))
                      }
                    />
                    {completeDeliveryErrors.proofContentType && (
                      <p className="text-sm text-destructive">
                        {completeDeliveryErrors.proofContentType}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Tiền hỗ trợ thực tế</p>
                    <Input
                      placeholder="Ví dụ: 200000"
                      value={completeDeliveryForm.cashSupportAmount}
                      onChange={(e) =>
                        setCompleteDeliveryForm((prev) => ({
                          ...prev,
                          cashSupportAmount: formatNumberInputVN(e.target.value),
                        }))
                      }
                    />
                    <p className="text-xs text-muted-foreground">
                      Nếu không đủ quỹ, hãy trích thêm ngân sách từ chiến dịch gây quỹ.
                    </p>
                    {completeDeliveryErrors.cashSupportAmount && (
                      <p className="text-sm text-destructive">
                        {completeDeliveryErrors.cashSupportAmount}
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-medium">Ghi chú minh chứng</p>
                  <Textarea
                    value={completeDeliveryForm.proofNote}
                    onChange={(e) =>
                      setCompleteDeliveryForm((prev) => ({ ...prev, proofNote: e.target.value }))
                    }
                  />
                  {completeDeliveryErrors.proofNote && (
                    <p className="text-sm text-destructive">{completeDeliveryErrors.proofNote}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-medium">Ghi chú giao hàng</p>
                  <Textarea
                    value={completeDeliveryForm.notes}
                    onChange={(e) =>
                      setCompleteDeliveryForm((prev) => ({ ...prev, notes: e.target.value }))
                    }
                  />
                  {completeDeliveryErrors.notes && (
                    <p className="text-sm text-destructive">{completeDeliveryErrors.notes}</p>
                  )}
                </div>

                {completeDeliveryErrors.form && (
                  <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                    {completeDeliveryErrors.form}
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCompleteDeliveryTarget(null)}
                >
                  Hủy
                </Button>
                <Button
                  onClick={handleSubmitCompleteDelivery}
                  disabled={completeDeliveryMutation.isPending}
                >
                  {completeDeliveryMutation.isPending ? 'Đang hoàn tất...' : 'Xác nhận hoàn tất'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <MobileShortageRequestReview
            campaignId={effectiveSelectedCampaignId}
            isOpen={showMobileShortageReview}
            onClose={() => setShowMobileShortageReview(false)}
          />
        </div>
      )}
    </DashboardLayout>
  );
}
