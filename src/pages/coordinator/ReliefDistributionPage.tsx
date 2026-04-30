import { useMemo, useState, type SetStateAction } from 'react';
import { useEffect } from 'react';
import * as XLSX from 'xlsx';
import { useQueryClient, useQueries, useQuery } from '@tanstack/react-query';
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
  useExtractBudgetHistory,
  useCampaignInventoryBalance,
  useCampaignVehicles,
  useCampaigns,
  useCampaign,
  useCampaignTeams,
  useCampaignSummary,
  useReverseExtractCampaignBudgetTransfer,
  useAssignCampaignVehicle,
  useUpdateCampaignVehicleAssignment,
  useRemoveCampaignVehicleAssignment,
} from '@/hooks/useCampaigns';
import { useProvinces } from '@/hooks/useLocations';
import {
  RELIEF_DISTRIBUTION_KEYS,
  useAssignIsolatedReliefHousehold,
  useBulkAssignIsolatedReliefHouseholds,
  useCompleteReliefDeliveryBatch,
  useCompleteReliefDelivery,
  useCreateDistributionPoint,
  useCreateReliefPackage,
  useDeleteDistributionPoint,
  useDeleteReliefHousehold,
  useDeleteReliefPackage,
  usePatchDistributionPoint,
  usePatchReliefDeliveryAssignment,
  usePatchReliefHousehold,
  usePatchReliefHouseholdStatus,
  usePatchReliefPackage,
  useDeleteReliefDeliveryAssignment,
  useReliefPlanSummary,
  useReliefChecklist,
  useReliefDeliveryDetail,
  useDistributionPoints,
  useImportReliefHouseholds,
  useReliefHouseholds,
  useReliefPackages,
  useReliefDeliveries,
  useShortageRequests,
} from '@/hooks/useReliefDistribution';
import { CampaignStatus, CampaignType, DeliveryMode } from '@/enums/beEnums';
import {
  reliefDistributionService,
  type CampaignHouseholdResponse,
  type CompleteDeliveriesBatchItemRequest,
  type DistributionPointResponse,
  type HouseholdDeliveryResponse,
  type HouseholdChecklistItemResponse,
  type ReliefPackageDefinitionResponse,
  type UpdateHouseholdDeliveryAssignmentRequest,
} from '@/services/reliefDistributionService';
import { campaignService } from '@/services/campaignService';
import { vehicleService } from '@/services/vehicleService';
import { CoordinatorReliefDistributionPageHeader } from './components/relief-distribution/CoordinatorReliefDistributionPageHeader';
import { CoordinatorReliefDistributionSetupSteps } from './components/relief-distribution/CoordinatorReliefDistributionSetupSteps';
import { CoordinatorReliefDistributionAssignmentStep } from './components/relief-distribution/CoordinatorReliefDistributionAssignmentStep';
import { CoordinatorReliefPlanSummaryCard } from './components/relief-distribution/CoordinatorReliefPlanSummaryCard';
import { CoordinatorCampaignVehicleAssignment } from './components/relief-distribution/CoordinatorCampaignVehicleAssignment';
import { CoordinatorIsolatedHouseholdsMap } from './components/relief-distribution/CoordinatorIsolatedHouseholdsMap';
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
import { FileUploadCard } from '@/components/ui/file-upload-card';
import { useCloudinaryUpload } from '@/hooks/useCloudinaryUpload';
import { ReliefHouseholdImportCard } from '@/pages/shared/relief-distribution/ReliefHouseholdImportCard';
import type { HouseholdSampleForm } from '@/pages/manager/components/relief-distribution/types';

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
  proofFileName: string;
};

type BatchCompleteDeliveryForm = {
  deliveries: Array<{
    householdDeliveryId: string;
    selected: boolean;
    proofFiles: File[];
    uploadedProofs: Array<{ fileUrl: string; contentType: string }>;
    proofNote: string;
    notes: string;
    cashSupportAmount: string;
  }>;
};

const createDefaultHouseholdSample = (): HouseholdSampleForm => ({
  householdCode: `HH-${Math.floor(100 + Math.random() * 900)}`,
  headOfHouseholdName: '',
  contactPhone: '',
  address: '',
  latitude: 16.0544,
  longitude: 108.2022,
  householdSize: 1,
  isIsolated: false,
  deliveryMode: DeliveryMode.PickupAtPoint,
});

const buildDistinctCloneCode = (baseCode: string, existingCodes: Set<string>) => {
  const normalizedBase = baseCode.trim() || 'HH';
  let clonedCode = `${normalizedBase}-CLONE`;
  let copyCounter = 2;

  while (existingCodes.has(clonedCode.toUpperCase())) {
    clonedCode = `${normalizedBase}-CLONE-${copyCounter}`;
    copyCounter += 1;
  }

  return clonedCode;
};

const buildDistinctCloneName = (baseName: string, existingNames: Set<string>) => {
  const normalizedBase = baseName.trim() || 'Hộ dân thử nghiệm';
  let clonedName = `${normalizedBase} (Clone)`;
  let copyCounter = 2;

  while (existingNames.has(clonedName.toUpperCase())) {
    clonedName = `${normalizedBase} (Clone ${copyCounter})`;
    copyCounter += 1;
  }

  return clonedName;
};

const IMPORT_TEMPLATE_HEADERS = [
  'Mã hộ',
  'Chủ hộ',
  'Số điện thoại',
  'Địa chỉ',
  'Vĩ độ',
  'Kinh độ',
  'Số người',
  'Bị cô lập',
  'Mức ngập',
  'Mức cô lập',
  'Cần xuồng',
  'Cần dẫn đường',
];

const DEFAULT_IMPORT_COLUMN_MAPPING: Record<string, string> = {
  householdCode: 'Mã hộ',
  headOfHouseholdName: 'Chủ hộ',
  contactPhone: 'Số điện thoại',
  address: 'Địa chỉ',
  latitude: 'Vĩ độ',
  longitude: 'Kinh độ',
  householdSize: 'Số người',
  isIsolated: 'Bị cô lập',
  floodSeverityLevel: 'Mức ngập',
  isolationSeverityLevel: 'Mức cô lập',
  requiresBoat: 'Cần xuồng',
  requiresLocalGuide: 'Cần dẫn đường',
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
const MIN_DISTRIBUTION_DURATION_MS = 24 * 60 * 60 * 1000;

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

const parseIsoToValidDate = (value?: string | null) => {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const toDateTimeLocalValue = (value?: string | null) => {
  const parsed = parseIsoToValidDate(value);
  if (!parsed) return '';
  const timezoneOffsetMs = parsed.getTimezoneOffset() * 60 * 1000;
  return new Date(parsed.getTime() - timezoneOffsetMs).toISOString().slice(0, 16);
};

const parseDateTimeLocalToIso = (value?: string) => {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
};

const isOutOfCampaignRange = (
  targetDate: Date,
  campaignStartDate: Date | null,
  campaignEndDate: Date | null,
) => {
  if (!campaignStartDate || !campaignEndDate) return false;
  return targetDate < campaignStartDate || targetDate > campaignEndDate;
};

const isBeforeNow = (targetDate: Date) => targetDate.getTime() < Date.now();

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
  const [checklistSearch, setChecklistSearch] = useState('');
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
    proofFileName: '',
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
  const [selectedVehicleId, setSelectedVehicleId] = useState('');
  const [vehicleAssignmentNote, setVehicleAssignmentNote] = useState('');
  const [selectedDistributionPointId, setSelectedDistributionPointId] = useState('');
  const [householdSamples, setHouseholdSamples] = useState<HouseholdSampleForm[]>([
    createDefaultHouseholdSample(),
  ]);
  const [sampleErrors, setSampleErrors] = useState<Record<string, string>>({});
  const [importFiles, setImportFiles] = useState<File[]>([]);
  const [importHeaders, setImportHeaders] = useState<string[]>([]);
  const [importColumnMapping, setImportColumnMapping] = useState<Record<string, string>>(
    DEFAULT_IMPORT_COLUMN_MAPPING,
  );
  const [selectedDeliveryId, setSelectedDeliveryId] = useState('');
  const [batchCompleteOpen, setBatchCompleteOpen] = useState(false);
  const [batchCompleteErrors, setBatchCompleteErrors] = useState<Record<string, string>>({});
  const [batchCompleteForm, setBatchCompleteForm] = useState<BatchCompleteDeliveryForm>({
    deliveries: [],
  });
  const [editingDeliveryAssignment, setEditingDeliveryAssignment] =
    useState<HouseholdChecklistItemResponse | null>(null);
  const [deliveryAssignmentForm, setDeliveryAssignmentForm] =
    useState<UpdateHouseholdDeliveryAssignmentRequest | null>(null);
  const [deliveryAssignmentErrors, setDeliveryAssignmentErrors] = useState<Record<string, string>>(
    {},
  );
  const [duplicatingFromPackageId, setDuplicatingFromPackageId] = useState<string | null>(null);
  const [duplicatingSuggestedPackageId, setDuplicatingSuggestedPackageId] = useState<string | null>(
    null,
  );
  const [selectedChecklistHouseholdCode, setSelectedChecklistHouseholdCode] = useState('');
  const checklistDistributionPointFilter =
    Number(filtersValue.deliveryMode) === DeliveryMode.DoorToDoor
      ? undefined
      : filtersValue.distributionPointId;
  const deliveriesDistributionPointFilter =
    Number(filtersValue.deliveryMode) === DeliveryMode.DoorToDoor
      ? undefined
      : filtersValue.distributionPointId;

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
  const { campaign: selectedCampaignDetail } = useCampaign(effectiveSelectedCampaignId);

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
  const { transfers: budgetTransferHistory = [], isLoading: isLoadingBudgetTransferHistory } =
    useExtractBudgetHistory(effectiveSelectedCampaignId, true);

  const { teams } = useCampaignTeams(effectiveSelectedCampaignId);

  const effectiveAssignForm = useMemo(
    () => ({
      ...assignForm,
      campaignTeamId: teams.some((team) => team.campaignTeamId === assignForm.campaignTeamId)
        ? assignForm.campaignTeamId
        : '',
    }),
    [assignForm, teams],
  );

  const { vehicles: assignedCampaignVehicles } = useCampaignVehicles(
    effectiveSelectedCampaignId,
    effectiveAssignForm.campaignTeamId || undefined,
  );
  const { vehicles: allCampaignVehicles } = useCampaignVehicles(effectiveSelectedCampaignId);
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
      requiresBoat: filtersValue.requiresBoat,
      requiresLocalGuide: filtersValue.requiresLocalGuide,
      minFloodSeverityLevel: filtersValue.minFloodSeverityLevel,
      minIsolationSeverityLevel: filtersValue.minIsolationSeverityLevel,
      hasCoordinates: filtersValue.hasCoordinates,
    },
  );
  const { data: planSummary } = useReliefPlanSummary(effectiveSelectedCampaignId);
  const { checklist } = useReliefChecklist(effectiveSelectedCampaignId, {
    pageIndex: 1,
    pageSize: 3000,
    search: checklistSearch.trim() || undefined,
    campaignTeamId: filtersValue.teamId,
    distributionPointId: checklistDistributionPointFilter,
    reliefPackageDefinitionId: filtersValue.reliefPackageDefinitionId,
    deliveryMode: filtersValue.deliveryMode,
  });

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
  const { deliveries } = useReliefDeliveries(effectiveSelectedCampaignId, {
    pageIndex: deliveriesPage,
    pageSize: 10,
    campaignTeamId: filtersValue.teamId,
    distributionPointId: deliveriesDistributionPointFilter,
    deliveryMode: filtersValue.deliveryMode,
    status: filtersValue.status,
  });
  useShortageRequests(effectiveSelectedCampaignId, {
    pageIndex: shortageRequestsPage,
    pageSize: 10,
    status: 0, // Pending
    campaignTeamId: filtersValue.teamId,
    distributionPointId: filtersValue.distributionPointId,
  });
  const createPointMutation = useCreateDistributionPoint();
  const createPackageMutation = useCreateReliefPackage();
  const importHouseholdsMutation = useImportReliefHouseholds();
  const assignCampaignVehicleMutation = useAssignCampaignVehicle();
  const updateCampaignVehicleAssignmentMutation = useUpdateCampaignVehicleAssignment();
  const removeCampaignVehicleAssignmentMutation = useRemoveCampaignVehicleAssignment();
  const assignIsolatedHouseholdMutation = useAssignIsolatedReliefHousehold();
  const bulkAssignIsolatedHouseholdsMutation = useBulkAssignIsolatedReliefHouseholds();
  const patchPointMutation = usePatchDistributionPoint();
  const deletePointMutation = useDeleteDistributionPoint();
  const patchPackageMutation = usePatchReliefPackage();
  const deletePackageMutation = useDeleteReliefPackage();
  const patchHouseholdMutation = usePatchReliefHousehold();
  const patchHouseholdStatusMutation = usePatchReliefHouseholdStatus();
  const deleteHouseholdMutation = useDeleteReliefHousehold();
  const extractBudgetMutation = useExtractCampaignBudget();
  const reverseBudgetTransferMutation = useReverseExtractCampaignBudgetTransfer();
  const completeDeliveryMutation = useCompleteReliefDelivery();
  const patchDeliveryAssignmentMutation = usePatchReliefDeliveryAssignment();
  const deleteDeliveryAssignmentMutation = useDeleteReliefDeliveryAssignment();
  const completeDeliveryBatchMutation = useCompleteReliefDeliveryBatch();
  const { uploadFile, isUploading: isUploadingProofFile } = useCloudinaryUpload();
  const { data: availableVehicles = [] } = useQuery({
    queryKey: ['vehicles', 'available-for-dispatch', station?.reliefStationId],
    queryFn: async () => vehicleService.getAvailableForDispatch(),
    enabled: !!station?.reliefStationId,
  });
  const { data: selectedDeliveryDetail } = useReliefDeliveryDetail(
    effectiveSelectedCampaignId,
    selectedDeliveryId,
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

  const headerStationName = station?.name || '';
  const headerLocationName = station?.locationName || '';
  const selectedPointLocationName =
    provinces.find((province) => province.id === distributionPointForm.locationId)?.fullName || '';

  const teamNameById = useMemo(
    () => Object.fromEntries(teams.map((team) => [team.campaignTeamId, team.teamName])),
    [teams],
  );
  const campaignNameById = useMemo(
    () =>
      Object.fromEntries(
        [...fundraisingCampaigns, ...reliefCampaigns].map((campaign) => [
          campaign.campaignId,
          campaign.name,
        ]),
      ),
    [fundraisingCampaigns, reliefCampaigns],
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
  const allPageSelected =
    paginatedHouseholds.length > 0 &&
    paginatedHouseholds.every((household) =>
      selectedHouseholdIds.has(household.campaignHouseholdId),
    );

  const totalPages = Math.max(1, householdsPagination?.totalPages ?? 1);
  const safeCurrentPage = Math.min(currentPage, totalPages);

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
    const startsAtDate = parseIsoToValidDate(distributionPointForm.startsAt);
    const endsAtDate = parseIsoToValidDate(distributionPointForm.endsAt);
    const campaignStartDate = parseIsoToValidDate(selectedCampaignDetail?.startDate);
    const campaignEndDate = parseIsoToValidDate(selectedCampaignDetail?.endDate);

    if (!distributionPointForm.name.trim()) clientErrors.name = 'Vui lòng nhập tên điểm phát.';
    if (!distributionPointForm.address.trim())
      clientErrors.address = 'Vui lòng chọn địa chỉ điểm phát.';
    if (!distributionPointForm.locationId.trim())
      clientErrors.locationId =
        'Chưa xác định được mã khu vực. Hãy chọn lại địa chỉ hoặc dùng vị trí trạm hiện tại.';
    if (!distributionPointForm.startsAt) clientErrors.startsAt = 'Vui lòng chọn thời gian bắt đầu.';
    if (distributionPointForm.startsAt && !startsAtDate) {
      clientErrors.startsAt = 'Thời gian bắt đầu không hợp lệ.';
    }
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
    if (startsAtDate && isOutOfCampaignRange(startsAtDate, campaignStartDate, campaignEndDate)) {
      clientErrors.startsAt = 'Thời gian bắt đầu phải nằm trong thời gian chiến dịch.';
    }
    if (startsAtDate && isBeforeNow(startsAtDate)) {
      clientErrors.startsAt = 'Không được chọn thời gian bắt đầu trong quá khứ.';
    }
    if (distributionPointForm.endsAt && !endsAtDate) {
      clientErrors.endsAt = 'Thời gian kết thúc không hợp lệ.';
    } else if (endsAtDate && isOutOfCampaignRange(endsAtDate, campaignStartDate, campaignEndDate)) {
      clientErrors.endsAt = 'Thời gian kết thúc phải nằm trong thời gian chiến dịch.';
    }
    if (endsAtDate && isBeforeNow(endsAtDate)) {
      clientErrors.endsAt = 'Không được chọn thời gian kết thúc trong quá khứ.';
    }
    if (
      startsAtDate &&
      endsAtDate &&
      endsAtDate.getTime() - startsAtDate.getTime() < MIN_DISTRIBUTION_DURATION_MS
    ) {
      clientErrors.endsAt = 'Khoảng thời gian phát phải tối thiểu 1 ngày.';
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
    const startsAtDate = parseIsoToValidDate(distributionPointForm.startsAt);
    const endsAtDate = parseIsoToValidDate(distributionPointForm.endsAt);
    const campaignStartDate = parseIsoToValidDate(selectedCampaignDetail?.startDate);
    const campaignEndDate = parseIsoToValidDate(selectedCampaignDetail?.endDate);

    if (!distributionPointForm.name.trim()) clientErrors.name = 'Vui lòng nhập tên điểm phát.';
    if (!distributionPointForm.address.trim())
      clientErrors.address = 'Vui lòng chọn địa chỉ điểm phát.';
    if (!distributionPointForm.locationId.trim())
      clientErrors.locationId =
        'Chưa xác định được mã khu vực. Hãy chọn lại địa chỉ hoặc dùng vị trí trạm hiện tại.';
    if (!distributionPointForm.startsAt) clientErrors.startsAt = 'Vui lòng chọn thời gian bắt đầu.';
    if (distributionPointForm.startsAt && !startsAtDate) {
      clientErrors.startsAt = 'Thời gian bắt đầu không hợp lệ.';
    }
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
    if (startsAtDate && isOutOfCampaignRange(startsAtDate, campaignStartDate, campaignEndDate)) {
      clientErrors.startsAt = 'Thời gian bắt đầu phải nằm trong thời gian chiến dịch.';
    }
    if (distributionPointForm.endsAt && !endsAtDate) {
      clientErrors.endsAt = 'Thời gian kết thúc không hợp lệ.';
    } else if (endsAtDate && isOutOfCampaignRange(endsAtDate, campaignStartDate, campaignEndDate)) {
      clientErrors.endsAt = 'Thời gian kết thúc phải nằm trong thời gian chiến dịch.';
    }
    if (
      startsAtDate &&
      endsAtDate &&
      endsAtDate.getTime() - startsAtDate.getTime() < MIN_DISTRIBUTION_DURATION_MS
    ) {
      clientErrors.endsAt = 'Khoảng thời gian phát phải tối thiểu 1 ngày.';
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
      await queryClient.invalidateQueries({
        queryKey: CAMPAIGN_QUERY_KEYS.extractBudgetHistory(effectiveSelectedCampaignId, true),
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

  const handleReverseBudgetTransfer = async (
    transferId: string,
    ownerCampaignId: string,
    amount: number,
  ) => {
    const confirmed = window.confirm(
      `Bạn có chắc muốn huỷ giao dịch trích ${formatNumberVN(amount)} không?`,
    );
    if (!confirmed) return;

    try {
      await reverseBudgetTransferMutation.mutateAsync({
        id: ownerCampaignId,
        campaignBudgetTransferId: transferId,
      });
      await queryClient.invalidateQueries({
        queryKey: CAMPAIGN_QUERY_KEYS.inventoryBalance(effectiveSelectedCampaignId),
      });
      await queryClient.invalidateQueries({
        queryKey: CAMPAIGN_QUERY_KEYS.extractBudgetHistory(effectiveSelectedCampaignId, true),
      });
    } catch (error) {
      const parsed = parseApiError(error, 'Không thể huỷ giao dịch trích ngân sách');
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
      proofFileName: '',
    });
  };

  const handleOpenEditDeliveryAssignment = (
    item: HouseholdChecklistItemResponse,
    options?: { keepDuplicateContext?: boolean },
  ) => {
    setEditingDeliveryAssignment(item);
    setDeliveryAssignmentErrors({});
    if (!options?.keepDuplicateContext) {
      setDuplicatingFromPackageId(null);
      setDuplicatingSuggestedPackageId(null);
    }
    setDeliveryAssignmentForm({
      deliveryMode: Number(item.deliveryMode),
      campaignTeamId: item.campaignTeamId || null,
      distributionPointId: item.distributionPointId || null,
      reliefPackageDefinitionId: item.reliefPackageDefinitionId || null,
      scheduledAt: item.scheduledAt,
      notes: item.notes || '',
    });
  };

  const getPackageCategoryKey = (packageId?: string | null) => {
    const targetPackage = packages.find((pkg) => pkg.reliefPackageDefinitionId === packageId);
    if (!targetPackage) return '';

    return targetPackage.items
      .map(
        (detail) =>
          supplyItems.find((supply) => supply.id === detail.supplyItemId)?.category ||
          supplyItems.find((supply) => supply.id === detail.supplyItemId)?.categoryName ||
          '',
      )
      .filter(Boolean)
      .sort()
      .join('|');
  };

  const getUnusedPackageOptionsForHousehold = (item: HouseholdChecklistItemResponse) => {
    const usedPackageIds = new Set(
      checklist
        .filter((checklistItem) => checklistItem.householdCode === item.householdCode)
        .map((checklistItem) => checklistItem.reliefPackageDefinitionId),
    );

    const currentCategoryKey = getPackageCategoryKey(item.reliefPackageDefinitionId);
    const unusedPackages = packages.filter(
      (pkg) => pkg.isActive !== false && !usedPackageIds.has(pkg.reliefPackageDefinitionId),
    );
    const preferred =
      unusedPackages.find(
        (pkg) => getPackageCategoryKey(pkg.reliefPackageDefinitionId) !== currentCategoryKey,
      ) ||
      unusedPackages[0] ||
      null;

    return {
      preferred,
      count: unusedPackages.length,
    };
  };

  const handleCreateAdditionalDelivery = async (item: HouseholdChecklistItemResponse) => {
    if (!effectiveSelectedCampaignId) return;

    try {
      let createdDelivery: HouseholdDeliveryResponse | null = null;
      if (Number(item.deliveryMode) === DeliveryMode.PickupAtPoint) {
        const response = await reliefDistributionService.assignHousehold(
          effectiveSelectedCampaignId,
          item.campaignHouseholdId,
          {
            deliveryMode: DeliveryMode.PickupAtPoint,
            distributionPointId: item.distributionPointId || undefined,
            campaignTeamId: item.campaignTeamId || undefined,
            reliefPackageDefinitionId: item.reliefPackageDefinitionId,
            scheduledAt: item.scheduledAt,
            notes: item.notes || undefined,
            forceCreateNewDelivery: true,
          },
        );
        createdDelivery = response.data;
      } else {
        const response = await assignIsolatedHouseholdMutation.mutateAsync({
          campaignId: effectiveSelectedCampaignId,
          campaignHouseholdId: item.campaignHouseholdId,
          data: {
            campaignTeamId: item.campaignTeamId || '',
            reliefPackageDefinitionId: item.reliefPackageDefinitionId,
            scheduledAt: item.scheduledAt,
            keepDoorToDoor: true,
            notes: item.notes || undefined,
            forceCreateNewDelivery: true,
          },
        });
        createdDelivery = response.data.delivery;
      }

      await queryClient.invalidateQueries({ queryKey: RELIEF_DISTRIBUTION_KEYS.all });
      toast.success('Đã nhân bản lượt giao. Hãy chỉnh lại gói cứu trợ nếu cần.');

      if (createdDelivery) {
        const nextPackage = getUnusedPackageOptionsForHousehold(item).preferred;
        if (!nextPackage) {
          toast.warning('Không còn gói cứu trợ khác để nhân bản cho hộ này.');
          return;
        }

        setDuplicatingFromPackageId(item.reliefPackageDefinitionId);
        setDuplicatingSuggestedPackageId(nextPackage.reliefPackageDefinitionId);
        handleOpenEditDeliveryAssignment(
          {
            householdDeliveryId: createdDelivery.householdDeliveryId,
            campaignId: createdDelivery.campaignId,
            campaignHouseholdId: createdDelivery.campaignHouseholdId,
            householdCode: createdDelivery.householdCode || item.householdCode,
            headOfHouseholdName: item.headOfHouseholdName,
            campaignTeamId: createdDelivery.campaignTeamId || item.campaignTeamId,
            distributionPointId: createdDelivery.distributionPointId || item.distributionPointId,
            reliefPackageDefinitionId: createdDelivery.reliefPackageDefinitionId,
            deliveryMode: createdDelivery.deliveryMode,
            status: createdDelivery.status,
            scheduledAt: createdDelivery.scheduledAt,
            deliveredAt: createdDelivery.deliveredAt,
            notes: createdDelivery.notes || item.notes,
            proofCount: createdDelivery.proofs.length,
            campaignTeamName: createdDelivery.campaignTeamName || item.campaignTeamName,
            distributionPointName:
              createdDelivery.distributionPointName || item.distributionPointName,
            reliefPackageDefinitionName:
              createdDelivery.reliefPackageDefinitionName || item.reliefPackageDefinitionName,
          },
          { keepDuplicateContext: true },
        );
        setDeliveryAssignmentForm((prev) =>
          prev
            ? {
                ...prev,
                reliefPackageDefinitionId: nextPackage.reliefPackageDefinitionId,
              }
            : prev,
        );
      }
    } catch (error) {
      const parsed = parseApiError(error, 'Không thể tạo thêm lượt giao cho cùng hộ');
      toast.error(parsed.message);
    }
  };

  const handleSubmitDeliveryAssignmentUpdate = async () => {
    if (!effectiveSelectedCampaignId || !editingDeliveryAssignment || !deliveryAssignmentForm)
      return;

    const scheduledAtDate = parseIsoToValidDate(deliveryAssignmentForm.scheduledAt);
    const campaignStartDate = parseIsoToValidDate(selectedCampaignDetail?.startDate);
    const campaignEndDate = parseIsoToValidDate(selectedCampaignDetail?.endDate);

    if (
      Number(deliveryAssignmentForm.deliveryMode) === DeliveryMode.PickupAtPoint &&
      !deliveryAssignmentForm.distributionPointId
    ) {
      setDeliveryAssignmentErrors({
        distributionPointId: 'Hình thức nhận tại điểm phát bắt buộc phải chọn điểm phát.',
      });
      return;
    }

    if (deliveryAssignmentForm.scheduledAt && !scheduledAtDate) {
      setDeliveryAssignmentErrors({
        scheduledAt: 'Thời gian hẹn phát không hợp lệ.',
      });
      return;
    }

    if (
      scheduledAtDate &&
      isOutOfCampaignRange(scheduledAtDate, campaignStartDate, campaignEndDate)
    ) {
      setDeliveryAssignmentErrors({
        scheduledAt: 'Thời gian hẹn phát phải nằm trong khoảng thời gian của chiến dịch.',
      });
      return;
    }

    try {
      setDeliveryAssignmentErrors({});
      await patchDeliveryAssignmentMutation.mutateAsync({
        campaignId: effectiveSelectedCampaignId,
        householdDeliveryId: editingDeliveryAssignment.householdDeliveryId,
        data: deliveryAssignmentForm,
      });
      setEditingDeliveryAssignment(null);
      setDeliveryAssignmentForm(null);
      setDuplicatingFromPackageId(null);
      setDuplicatingSuggestedPackageId(null);
    } catch (error) {
      const parsed = parseApiError(error, 'Không thể cập nhật lượt giao hàng');
      setDeliveryAssignmentErrors({ form: parsed.message });
    }
  };

  const handleDeleteDeliveryAssignment = async (item: HouseholdChecklistItemResponse) => {
    if (!effectiveSelectedCampaignId) return;
    try {
      await deleteDeliveryAssignmentMutation.mutateAsync({
        campaignId: effectiveSelectedCampaignId,
        householdDeliveryId: item.householdDeliveryId,
      });
    } catch (error) {
      const parsed = parseApiError(error, 'Không thể gỡ lượt giao hàng đã gán');
      toast.error(parsed.message);
    }
  };

  const handleSubmitCompleteDelivery = async () => {
    if (!effectiveSelectedCampaignId || !completeDeliveryTarget) return;
    const nextErrors: Record<string, string> = {};
    const cashSupportAmount =
      parseInt((completeDeliveryForm.cashSupportAmount || '0').replace(/\D/g, ''), 10) || 0;

    if (!completeDeliveryForm.proofFileUrl.trim()) {
      nextErrors.proofFileUrl = 'Vui lòng tải tệp minh chứng.';
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

  const handleImportHouseholds = async () => {
    const nextErrors: Record<string, string> = {};
    const seenCodes = new Set<string>();

    householdSamples.forEach((sample, index) => {
      const normalizedCode = sample.householdCode.trim().toUpperCase();
      if (!normalizedCode) nextErrors[`items.${index}.householdCode`] = 'Vui lòng nhập mã hộ.';
      else if (seenCodes.has(normalizedCode))
        nextErrors[`items.${index}.householdCode`] = 'Mã hộ đang bị trùng trong danh sách.';
      else seenCodes.add(normalizedCode);

      if (!sample.headOfHouseholdName.trim())
        nextErrors[`items.${index}.headOfHouseholdName`] = 'Vui lòng nhập tên chủ hộ.';
      if (!sample.address?.trim())
        nextErrors[`items.${index}.address`] = 'Vui lòng nhập địa chỉ hộ dân.';
      if (sample.contactPhone && !/^0\d{9,10}$/.test(sample.contactPhone.trim())) {
        nextErrors[`items.${index}.contactPhone`] =
          'Số điện thoại phải có 10-11 chữ số và bắt đầu bằng số 0.';
      }
      if (!sample.householdSize || sample.householdSize <= 0)
        nextErrors[`items.${index}.householdSize`] = 'Số người phải lớn hơn 0.';
    });

    if (!effectiveSelectedCampaignId) nextErrors.form = 'Vui lòng chọn chiến dịch cứu trợ.';
    if (householdSamples.length === 0) nextErrors.form = 'Cần ít nhất 1 hộ dân để nhập.';

    if (Object.keys(nextErrors).length > 0) {
      setSampleErrors(nextErrors);
      toast.error(Object.values(nextErrors)[0]);
      return;
    }

    try {
      setSampleErrors({});
      await importHouseholdsMutation.mutateAsync({
        campaignId: effectiveSelectedCampaignId,
        data: { households: householdSamples },
      });
      setHouseholdSamples([createDefaultHouseholdSample()]);
      setImportFiles([]);
    } catch (error) {
      const parsed = parseApiError(error, 'Không thể lưu danh sách hộ dân');
      setSampleErrors({ form: parsed.message });
    }
  };

  const updateHouseholdSample = (index: number, patch: Partial<HouseholdSampleForm>) => {
    setHouseholdSamples((prev) =>
      prev.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)),
    );
    setSampleErrors((prev) => {
      const next = { ...prev };
      Object.keys(next)
        .filter((key) => key.startsWith(`items.${index}.`))
        .forEach((key) => delete next[key]);
      delete next.form;
      return next;
    });
  };

  const addHouseholdSample = () => {
    setHouseholdSamples((prev) => [...prev, createDefaultHouseholdSample()]);
  };

  const removeHouseholdSample = (index: number) => {
    setHouseholdSamples((prev) => prev.filter((_, itemIndex) => itemIndex !== index));
  };

  const cloneHouseholdSample = (index: number) => {
    setHouseholdSamples((prev) => {
      const sampleToClone = prev[index];
      if (!sampleToClone) return prev;

      const existingCodes = new Set(
        prev.map((sample) => sample.householdCode.trim().toUpperCase()),
      );
      const existingNames = new Set(
        prev.map((sample) => sample.headOfHouseholdName.trim().toUpperCase()).filter(Boolean),
      );

      const clonedSample: HouseholdSampleForm = {
        ...sampleToClone,
        householdCode: buildDistinctCloneCode(sampleToClone.householdCode, existingCodes),
        headOfHouseholdName: buildDistinctCloneName(
          sampleToClone.headOfHouseholdName,
          existingNames,
        ),
        address: sampleToClone.address?.trim()
          ? `${sampleToClone.address.trim()} - bản sao`
          : 'Địa chỉ hộ dân bản sao',
      };

      const next = [...prev];
      next.splice(index + 1, 0, clonedSample);
      return next;
    });
  };

  const parseImportedHouseholdFiles = async (files: FileList | null) => {
    if (!files?.length) {
      setImportFiles([]);
      return;
    }

    const selectedFiles = Array.from(files);
    setImportFiles(selectedFiles);

    const parsedRows: HouseholdSampleForm[] = [];

    for (const file of selectedFiles) {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<Record<string, any>>(firstSheet, { defval: '' });
      const headers =
        XLSX.utils.sheet_to_json<string[]>(firstSheet, { header: 1, range: 0 })[0] || [];
      setImportHeaders(headers.filter(Boolean));

      rows.forEach((row, index) => {
        const getMapped = (field: string) => row[importColumnMapping[field] || ''];
        const isIsolatedValue = String(getMapped('isIsolated') || '')
          .trim()
          .toLowerCase();
        const isIsolated = ['true', '1', 'yes', 'co', 'có', 'bi co lap', 'bị cô lập'].includes(
          isIsolatedValue,
        );

        parsedRows.push({
          householdCode:
            String(getMapped('householdCode') || '').trim() ||
            `HH-IMPORT-${Date.now()}-${index + 1}`,
          headOfHouseholdName: String(getMapped('headOfHouseholdName') || '').trim(),
          contactPhone: String(getMapped('contactPhone') || '').trim(),
          address: String(getMapped('address') || '').trim(),
          latitude: Number(getMapped('latitude') || 16.0544),
          longitude: Number(getMapped('longitude') || 108.2022),
          householdSize: Number(getMapped('householdSize') || 1),
          isIsolated,
          deliveryMode: isIsolated ? DeliveryMode.DoorToDoor : DeliveryMode.PickupAtPoint,
          floodSeverityLevel: getMapped('floodSeverityLevel')
            ? Number(getMapped('floodSeverityLevel'))
            : undefined,
          isolationSeverityLevel: getMapped('isolationSeverityLevel')
            ? Number(getMapped('isolationSeverityLevel'))
            : undefined,
          requiresBoat: Boolean(getMapped('requiresBoat')),
          requiresLocalGuide: Boolean(getMapped('requiresLocalGuide')),
        });
      });
    }

    if (parsedRows.length > 0) {
      setHouseholdSamples(parsedRows);
      toast.success(`Đã nạp ${parsedRows.length} hộ dân từ file vào bảng nhập liệu.`);
    }
  };

  const downloadImportTemplate = (format: 'csv' | 'xlsx') => {
    const sampleRows = [
      {
        'Mã hộ': 'HH-001',
        'Chủ hộ': 'Nguyễn Văn A',
        'Số điện thoại': '0900000000',
        'Địa chỉ': 'Hòa Vang, Đà Nẵng, Miền Trung',
        'Vĩ độ': 16.0544,
        'Kinh độ': 108.2022,
        'Số người': 4,
        'Bị cô lập': 'false',
        'Mức ngập': 2,
        'Mức cô lập': 0,
        'Cần xuồng': 'false',
        'Cần dẫn đường': 'false',
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(sampleRows, { header: IMPORT_TEMPLATE_HEADERS });
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Households');

    if (format === 'csv') {
      XLSX.writeFile(workbook, 'mau-ho-dan-cuu-tro.csv', { bookType: 'csv' });
      return;
    }

    XLSX.writeFile(workbook, 'mau-ho-dan-cuu-tro.xlsx');
  };

  const handleAssignSelectedHouseholds = async () => {
    const nextErrors: Record<string, string> = {};
    const scheduledAtDate = parseIsoToValidDate(effectiveAssignForm.scheduledAt);
    const campaignStartDate = parseIsoToValidDate(selectedCampaignDetail?.startDate);
    const campaignEndDate = parseIsoToValidDate(selectedCampaignDetail?.endDate);
    if (!effectiveSelectedCampaignId) nextErrors.form = 'Vui lòng chọn chiến dịch cứu trợ.';
    if (teams.length === 0) nextErrors.campaignTeamId = 'Chiến dịch chưa có đội để phân công.';
    if (!effectiveAssignForm.campaignTeamId)
      nextErrors.campaignTeamId = 'Vui lòng chọn đội phụ trách.';
    if (!effectiveAssignForm.reliefPackageDefinitionId)
      nextErrors.reliefPackageDefinitionId = 'Vui lòng chọn gói cứu trợ.';
    if (!effectiveAssignForm.scheduledAt)
      nextErrors.scheduledAt = 'Vui lòng chọn thời gian bắt đầu.';
    if (effectiveAssignForm.scheduledAt && !scheduledAtDate) {
      nextErrors.scheduledAt = 'Thời gian gán không hợp lệ.';
    }
    if (scheduledAtDate && isBeforeNow(scheduledAtDate)) {
      nextErrors.scheduledAt = 'Không được chọn thời gian gán trong quá khứ.';
    }
    if (
      scheduledAtDate &&
      isOutOfCampaignRange(scheduledAtDate, campaignStartDate, campaignEndDate)
    ) {
      nextErrors.scheduledAt =
        'Thời gian gán phải nằm trong khoảng thời gian hoạt động của chiến dịch.';
    }
    if (selectedHouseholds.length === 0)
      nextErrors.selectedHouseholds = 'Vui lòng chọn ít nhất 1 hộ dân.';
    if (hasPickupHouseholds && !selectedDistributionPointId) {
      nextErrors.distributionPointId = 'Vui lòng chọn điểm phát cho các hộ nhận tại điểm.';
    }

    if (Object.keys(nextErrors).length > 0) {
      setAssignErrors(nextErrors);
      toast.error(Object.values(nextErrors)[0]);
      return;
    }

    try {
      setAssignErrors({});
      const pickupHouseholds = selectedHouseholds.filter(
        (household) =>
          Number(household.deliveryMode) === DeliveryMode.PickupAtPoint && !household.isIsolated,
      );
      const isolatedHouseholds = selectedHouseholds.filter(
        (household) =>
          household.isIsolated || Number(household.deliveryMode) === DeliveryMode.DoorToDoor,
      );

      if (pickupHouseholds.length > 0) {
        await Promise.all(
          pickupHouseholds.map((household) =>
            reliefDistributionService.assignHousehold(
              effectiveSelectedCampaignId,
              household.campaignHouseholdId,
              {
                deliveryMode: DeliveryMode.PickupAtPoint,
                distributionPointId: selectedDistributionPointId,
                campaignTeamId: effectiveAssignForm.campaignTeamId,
                reliefPackageDefinitionId: effectiveAssignForm.reliefPackageDefinitionId,
                scheduledAt: effectiveAssignForm.scheduledAt,
                notes: effectiveAssignForm.notes || undefined,
              },
            ),
          ),
        );
      }

      if (isolatedHouseholds.length === 1) {
        await assignIsolatedHouseholdMutation.mutateAsync({
          campaignId: effectiveSelectedCampaignId,
          campaignHouseholdId: isolatedHouseholds[0].campaignHouseholdId,
          data: {
            campaignTeamId: effectiveAssignForm.campaignTeamId,
            reliefPackageDefinitionId: effectiveAssignForm.reliefPackageDefinitionId,
            scheduledAt: effectiveAssignForm.scheduledAt,
            keepDoorToDoor: true,
            notes: effectiveAssignForm.notes || undefined,
          },
        });
      }

      if (isolatedHouseholds.length > 1) {
        await bulkAssignIsolatedHouseholdsMutation.mutateAsync({
          campaignId: effectiveSelectedCampaignId,
          data: {
            campaignHouseholdIds: isolatedHouseholds.map(
              (household) => household.campaignHouseholdId,
            ),
            campaignTeamId: effectiveAssignForm.campaignTeamId,
            reliefPackageDefinitionId: effectiveAssignForm.reliefPackageDefinitionId,
            scheduledAt: effectiveAssignForm.scheduledAt,
            keepDoorToDoor: true,
            notes: effectiveAssignForm.notes || undefined,
          },
        });
      }

      await queryClient.invalidateQueries({
        queryKey: RELIEF_DISTRIBUTION_KEYS.all,
      });

      setSelectedHouseholdsMap(new Map());
      setAssignForm((prev) => ({ ...prev, notes: '' }));
      toast.success('Đã điều phối hộ dân cho đội phụ trách');
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

  const handleAssignVehicleToTeam = async () => {
    if (!effectiveSelectedCampaignId || !effectiveAssignForm.campaignTeamId || !selectedVehicleId) {
      toast.error('Vui lòng chọn đội phụ trách và phương tiện cần điều phối.');
      return;
    }

    try {
      await assignCampaignVehicleMutation.mutateAsync({
        id: effectiveSelectedCampaignId,
        campaignTeamId: effectiveAssignForm.campaignTeamId,
        data: {
          vehicleId: selectedVehicleId,
          campaignTeamId: effectiveAssignForm.campaignTeamId,
          note: vehicleAssignmentNote || undefined,
          startDate: effectiveAssignForm.scheduledAt || new Date().toISOString(),
          status: 1,
        },
      });
      setSelectedVehicleId('');
      setVehicleAssignmentNote('');
    } catch (error) {
      const parsed = parseApiError(error, 'Không thể điều phối phương tiện cho đội');
      toast.error(parsed.message);
    }
  };

  const handleUpdateVehicleAssignment = async (campaignVehicleId: string) => {
    if (!effectiveSelectedCampaignId || !effectiveAssignForm.campaignTeamId) {
      toast.error('Vui lòng chọn đội phụ trách trước khi cập nhật gán xe.');
      return;
    }

    try {
      await updateCampaignVehicleAssignmentMutation.mutateAsync({
        id: effectiveSelectedCampaignId,
        campaignVehicleId,
        data: {
          campaignTeamId: effectiveAssignForm.campaignTeamId,
          status: 1,
          note: vehicleAssignmentNote || undefined,
        },
      });
    } catch (error) {
      const parsed = parseApiError(error, 'Không thể cập nhật điều phối phương tiện');
      toast.error(parsed.message);
    }
  };

  const handleRemoveVehicleAssignment = async (campaignVehicleId: string) => {
    if (!effectiveSelectedCampaignId) return;

    try {
      await removeCampaignVehicleAssignmentMutation.mutateAsync({
        id: effectiveSelectedCampaignId,
        campaignVehicleId,
      });
    } catch (error) {
      const parsed = parseApiError(error, 'Không thể gỡ điều phối phương tiện');
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

  const isolatedHouseholdsForMap = useMemo(() => {
    if (!planSummary) return [];

    return planSummary.isolatedHouseholdItems
      .filter((item) => Number.isFinite(item.latitude) && Number.isFinite(item.longitude))
      .map((item) => ({
        ...item,
        vehicles: allCampaignVehicles.filter(
          (vehicle) =>
            vehicle.campaignTeamId &&
            item.campaignTeamId &&
            vehicle.campaignTeamId === item.campaignTeamId,
        ),
      }));
  }, [allCampaignVehicles, planSummary]);

  const isolatedMapCenter = useMemo(() => {
    if (isolatedHouseholdsForMap.length === 0) {
      return {
        lat: Number(station?.latitude) || 16.0544,
        lng: Number(station?.longitude) || 108.2022,
      };
    }

    const avgLat =
      isolatedHouseholdsForMap.reduce((sum, item) => sum + Number(item.latitude || 0), 0) /
      isolatedHouseholdsForMap.length;
    const avgLng =
      isolatedHouseholdsForMap.reduce((sum, item) => sum + Number(item.longitude || 0), 0) /
      isolatedHouseholdsForMap.length;

    return {
      lat: avgLat,
      lng: avgLng,
    };
  }, [isolatedHouseholdsForMap, station?.latitude, station?.longitude]);

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

  const visibleChecklistDeliverySequenceById = useMemo(() => {
    const grouped = new Map<string, HouseholdChecklistItemResponse[]>();
    checklist.forEach((item) => {
      const items = grouped.get(item.householdCode) || [];
      items.push(item);
      grouped.set(item.householdCode, items);
    });

    const result: Record<string, number> = {};
    grouped.forEach((items) => {
      items
        .sort(
          (left, right) =>
            new Date(left.scheduledAt).getTime() - new Date(right.scheduledAt).getTime(),
        )
        .forEach((item, index) => {
          result[item.householdDeliveryId] = index + 1;
        });
    });
    return result;
  }, [checklist]);

  const visibleChecklistDeliveryCountByCode = useMemo(() => {
    const result: Record<string, number> = {};
    checklist.forEach((item) => {
      result[item.householdCode] = (result[item.householdCode] || 0) + 1;
    });
    return result;
  }, [checklist]);

  const getDeliverySequenceClassName = (sequence: number) => {
    if (sequence === 1) return 'border-sky-200 bg-sky-50/70';
    if (sequence === 2) return 'border-amber-200 bg-amber-50/70';
    if (sequence === 3) return 'border-rose-200 bg-rose-50/70';
    return 'border-slate-200 bg-slate-50/70';
  };

  const filteredChecklistItems = useMemo(() => {
    const base = checklist.filter((item) => {
      if (filtersValue.hasMultiplePackages === undefined) return true;
      const count = visibleChecklistDeliveryCountByCode[item.householdCode] || 0;
      return filtersValue.hasMultiplePackages ? count > 1 : count <= 1;
    });

    return [...base].sort((left, right) => {
      const countDiff =
        (visibleChecklistDeliveryCountByCode[right.householdCode] || 0) -
        (visibleChecklistDeliveryCountByCode[left.householdCode] || 0);
      if (countDiff !== 0) return countDiff;
      return new Date(left.scheduledAt).getTime() - new Date(right.scheduledAt).getTime();
    });
  }, [checklist, visibleChecklistDeliveryCountByCode, filtersValue.hasMultiplePackages]);

  const groupedChecklistItems = useMemo(() => {
    const grouped = new Map<
      string,
      {
        householdCode: string;
        headOfHouseholdName: string;
        items: HouseholdChecklistItemResponse[];
      }
    >();

    filteredChecklistItems.forEach((item) => {
      const current = grouped.get(item.householdCode);
      if (current) {
        current.items.push(item);
        return;
      }

      grouped.set(item.householdCode, {
        householdCode: item.householdCode,
        headOfHouseholdName: item.headOfHouseholdName,
        items: [item],
      });
    });

    return Array.from(grouped.values()).sort((left, right) => {
      const leftHasIsolated = left.items.some(
        (item) => Number(item.deliveryMode) === DeliveryMode.DoorToDoor,
      );
      const rightHasIsolated = right.items.some(
        (item) => Number(item.deliveryMode) === DeliveryMode.DoorToDoor,
      );
      if (leftHasIsolated !== rightHasIsolated) return rightHasIsolated ? 1 : -1;

      const countDiff = right.items.length - left.items.length;
      if (countDiff !== 0) return countDiff;
      return left.householdCode.localeCompare(right.householdCode);
    });
  }, [filteredChecklistItems]);

  useEffect(() => {
    setSelectedChecklistHouseholdCode('');
  }, [checklistPage, filtersValue, checklistSearch]);

  useEffect(() => {
    setChecklistPage(1);
  }, [filtersValue, checklistSearch]);

  const totalChecklistPages = Math.max(
    1,
    Math.ceil(groupedChecklistItems.length / CHECKLIST_ITEMS_PER_PAGE),
  );
  const paginatedChecklist = useMemo(() => {
    const start = (Math.min(checklistPage, totalChecklistPages) - 1) * CHECKLIST_ITEMS_PER_PAGE;
    return groupedChecklistItems.slice(start, start + CHECKLIST_ITEMS_PER_PAGE);
  }, [checklistPage, groupedChecklistItems, totalChecklistPages]);

  const paginatedDeliveries = deliveries;

  const canAssign =
    !!effectiveSelectedCampaignId &&
    teams.length > 0 &&
    !!effectiveAssignForm.campaignTeamId &&
    !!effectiveAssignForm.reliefPackageDefinitionId &&
    !!effectiveAssignForm.scheduledAt &&
    selectedHouseholds.length > 0 &&
    (!hasPickupHouseholds || !!selectedDistributionPointId);

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
              collapsibleNote
            />
            <StatCard
              label="Đội trong chiến dịch"
              value={teams.length}
              note="Đội có thể được giao thực hiện"
              icon="diversity_3"
              iconClass="bg-sky-500/10 text-sky-600 dark:text-sky-300"
              collapsibleNote
            />
            <StatCard
              label="Điểm phát đã tạo"
              value={distributionPoints.length}
              note="Dùng cho các hộ nhận tại điểm phát"
              icon="location_on"
              iconClass="bg-amber-500/10 text-amber-600 dark:text-amber-300"
              collapsibleNote
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
              collapsibleNote
            />
            <StatCard
              label="Gói hỗ trợ đã tạo"
              value={packages.length}
              note="Dùng để gán cho hộ dân khi phân phối"
              icon="inventory_2"
              iconClass="bg-emerald-500/10 text-emerald-600 dark:text-emerald-300"
              collapsibleNote
            />
            <StatCard
              label="Hộ cô lập"
              value={planSummary?.isolatedHouseholds ?? 0}
              note="Danh sách hộ cô lập cần tiếp cận trong toàn chiến dịch"
              icon="warning"
              iconClass="bg-rose-500/10 text-rose-600 dark:text-rose-300"
              // className="md:col-span-2 xl:col-span-4"
              collapsibleNote
            />
          </div>

          <CoordinatorReliefPlanSummaryCard
            planSummary={planSummary}
            campaignVehicles={allCampaignVehicles}
          />

          <CoordinatorIsolatedHouseholdsMap
            households={isolatedHouseholdsForMap}
            center={isolatedMapCenter}
          />

          <div className="grid gap-4">
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
                  {inventoryBalance?.campaignInventoryId?.slice(0, 6) || 'Chưa phát sinh'}
                </p>
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
                          {item.supplyItemId?.slice(0, 6)}
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
            campaignStartDate={selectedCampaignDetail?.startDate}
            campaignEndDate={selectedCampaignDetail?.endDate}
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
            <div className="flex h-[480px] min-h-0 flex-col rounded-2xl border border-border bg-card p-5 shadow-sm">
              <div className="mb-4">
                <ReliefStickySectionHeader
                  title="Theo dõi hoạt động đội"
                  description="Tổng hợp nhanh số hộ đã được giao và đã hoàn tất theo từng đội."
                  badgeIcon="groups"
                  badgeLabel={`${formatNumberInputVN(filteredTeamActivitySummary.length)} đội`}
                />
              </div>
              <div className="flex min-h-0 flex-1 flex-col">
                <div className="space-y-3 overflow-y-auto pr-1 flex-1 min-h-0">
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
                            <span className="material-symbols-outlined text-[18px]">
                              restart_alt
                            </span>
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
                  <div className="pt-3">
                    <ReliefPaginationBar
                      currentPage={Math.min(teamActivityPage, totalTeamActivityPages)}
                      totalPages={totalTeamActivityPages}
                      onPrevious={() => setTeamActivityPage((prev) => Math.max(1, prev - 1))}
                      onNext={() =>
                        setTeamActivityPage((prev) => Math.min(totalTeamActivityPages, prev + 1))
                      }
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="flex h-[480px] min-h-0 flex-col rounded-2xl border border-border bg-card p-5 shadow-sm">
              <div className="mb-4">
                <ReliefStickySectionHeader
                  title="Bước 3. Danh sách gói hỗ trợ"
                  description="Kiểm tra lại các gói hỗ trợ đã tạo trước khi gán cho hộ dân."
                  badgeIcon="inventory_2"
                  badgeLabel={`${formatNumberInputVN(filteredPackageList.length)} gói`}
                />
              </div>
              <div className="flex min-h-0 flex-1 flex-col">
                <div className="space-y-3 overflow-y-auto pr-1 flex-1 min-h-0">
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
                            <span className="material-symbols-outlined text-[18px]">
                              restart_alt
                            </span>
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
                            <span className="material-symbols-outlined text-[18px]">
                              inventory_2
                            </span>
                            Đi tới bước tạo gói
                          </Button>
                        )}
                      </div>
                    </div>
                  ) : (
                    paginatedPackageList.map((pkg) => (
                      <div
                        key={pkg.reliefPackageDefinitionId}
                        className="rounded-xl border border-border bg-muted/20 p-4 "
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
                  <div className="pt-3">
                    <ReliefPaginationBar
                      currentPage={Math.min(packageListPage, totalPackageListPages)}
                      totalPages={totalPackageListPages}
                      onPrevious={() => setPackageListPage((prev) => Math.max(1, prev - 1))}
                      onNext={() =>
                        setPackageListPage((prev) => Math.min(totalPackageListPages, prev + 1))
                      }
                    />
                  </div>
                )}
              </div>
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
            hasDistributionPoint={distributionPoints.length > 0}
            filtersValue={filtersValue}
            onChangeFilters={handleFiltersChange}
            onResetFilters={resetFilters}
            filtersExpanded={filtersExpanded}
            onFiltersExpandedChange={setFiltersExpanded}
            distributionPoints={distributionPoints.map((point) => ({
              label: point.name,
              value: point.distributionPointId,
            }))}
            campaignStartDate={selectedCampaignDetail?.startDate}
            campaignEndDate={selectedCampaignDetail?.endDate}
            onJumpToCreateTeam={() => navigate('/portal/coordinator/teams')}
            onJumpToCreatePackage={() => scrollToSection(PACKAGE_SECTION_ID)}
            assignErrors={assignErrors}
            selectedDistributionPointId={selectedDistributionPointId}
            onSelectedDistributionPointIdChange={setSelectedDistributionPointId}
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

          <CoordinatorCampaignVehicleAssignment
            selectedTeamId={effectiveAssignForm.campaignTeamId}
            teams={teams.map((team) => ({
              campaignTeamId: team.campaignTeamId,
              teamName: team.teamName,
            }))}
            availableVehicles={availableVehicles}
            assignedCampaignVehicles={assignedCampaignVehicles}
            selectedVehicleId={selectedVehicleId}
            onSelectedVehicleIdChange={setSelectedVehicleId}
            vehicleAssignmentNote={vehicleAssignmentNote}
            onVehicleAssignmentNoteChange={setVehicleAssignmentNote}
            onAssignVehicle={handleAssignVehicleToTeam}
            onUpdateVehicle={handleUpdateVehicleAssignment}
            onRemoveVehicle={handleRemoveVehicleAssignment}
            isAssigningVehicle={assignCampaignVehicleMutation.isPending}
            isUpdatingVehicle={updateCampaignVehicleAssignmentMutation.isPending}
            isRemovingVehicle={removeCampaignVehicleAssignmentMutation.isPending}
            formatDateTimeVN={formatDateTimeVN}
          />

          {effectiveSelectedCampaignId ? (
            <div id="inline-shortage-review">
              <MobileShortageRequestReview campaignId={effectiveSelectedCampaignId} mode="inline" />
            </div>
          ) : null}

          <ReliefHouseholdImportCard
            title="Bổ sung hộ dân mẫu khi cần"
            description="Dữ liệu hộ dân thường đã được địa phương gửi sẵn. Coordinator chỉ dùng khối này khi cần thêm nhanh hộ dân thủ công để xử lý ngoại lệ hoặc bổ sung phát sinh."
            householdSamples={householdSamples}
            updateHouseholdSample={updateHouseholdSample}
            removeHouseholdSample={removeHouseholdSample}
            cloneHouseholdSample={cloneHouseholdSample}
            addHouseholdSample={addHouseholdSample}
            applyLatitude={(latitude) =>
              setHouseholdSamples((prev) => prev.map((item) => ({ ...item, latitude })))
            }
            applyLongitude={(longitude) =>
              setHouseholdSamples((prev) => prev.map((item) => ({ ...item, longitude })))
            }
            handleImport={handleImportHouseholds}
            submitDisabled={!effectiveSelectedCampaignId || householdSamples.length === 0}
            sampleErrors={sampleErrors}
            globalError={sampleErrors.form}
            importFiles={importFiles}
            onImportFilesSelected={(files) => {
              void parseImportedHouseholdFiles(files);
            }}
            onRemoveImportFile={(index) =>
              setImportFiles((prev) => prev.filter((_, fileIndex) => fileIndex !== index))
            }
            importHeaders={importHeaders}
            importColumnMapping={importColumnMapping}
            onImportColumnMappingChange={(field, header) =>
              setImportColumnMapping((prev) => ({ ...prev, [field]: header }))
            }
            onDownloadCsvTemplate={() => downloadImportTemplate('csv')}
            onDownloadXlsxTemplate={() => downloadImportTemplate('xlsx')}
            collapsible
            defaultOpen={false}
            badgeLabel="Chỉ dùng khi phát sinh"
          />

          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-foreground">
                Bước 5. Rà soát checklist phân phối
              </h3>
              <p className="text-sm text-muted-foreground">
                Kiểm tra danh sách hộ đã được gán, thờ gian hẹn phát và trạng thái thực hiện.
              </p>
            </div>
            <ReliefFilterBar className="mb-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
              <Input
                value={checklistSearch}
                onChange={(e) => setChecklistSearch(e.target.value)}
                placeholder="Tìm theo mã hộ, chủ hộ, SĐT, địa chỉ..."
              />
              {checklistSearch.trim() && (
                <Button type="button" variant="outline" onClick={() => setChecklistSearch('')}>
                  Xóa tìm kiếm
                </Button>
              )}
            </ReliefFilterBar>
            <div className="space-y-3">
              {checklist.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {checklistSearch.trim()
                    ? 'Không tìm thấy checklist phù hợp với từ khóa đang nhập.'
                    : 'Chưa có checklist phân phát cho chiến dịch này.'}
                </p>
              ) : (
                paginatedChecklist.map((group) => {
                  const latestItem = [...group.items].sort(
                    (left, right) =>
                      new Date(right.scheduledAt).getTime() - new Date(left.scheduledAt).getTime(),
                  )[0];
                  const deliveredCount = group.items.filter((item) => !!item.deliveredAt).length;

                  return (
                    <button
                      key={group.householdCode}
                      type="button"
                      className="w-full rounded-xl border border-border bg-muted/20 p-4 text-left transition-colors hover:bg-muted/35"
                      onClick={() => setSelectedChecklistHouseholdCode(group.householdCode)}
                    >
                      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                        <div>
                          <p className="font-medium text-foreground">
                            Hộ {group.householdCode} · {group.headOfHouseholdName}
                          </p>
                          <div className="mt-1 flex flex-wrap gap-2">
                            <Badge variant="outline">{group.items.length} gói cần phát</Badge>
                            <Badge variant="outline">
                              Đã phát {deliveredCount}/{group.items.length}
                            </Badge>
                            {group.items.length > 1 && (
                              <Badge variant="outline">Hộ có nhiều gói</Badge>
                            )}
                          </div>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {latestItem.campaignTeamName ||
                              teamNameById[latestItem.campaignTeamId || ''] ||
                              'Chưa rõ đội'}
                            {Number(latestItem.deliveryMode) === DeliveryMode.DoorToDoor
                              ? ' · Phát tận nơi'
                              : latestItem.distributionPointName
                                ? ` · Điểm: ${latestItem.distributionPointName}`
                                : ' · Chưa chọn điểm phát'}
                            {latestItem.reliefPackageDefinitionName
                              ? ` · Gói gần nhất: ${latestItem.reliefPackageDefinitionName}`
                              : ''}
                          </p>
                        </div>
                        <Badge variant="outline">Xem chi tiết</Badge>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
            {totalChecklistPages > 1 && (
              <ReliefPaginationBar
                currentPage={Math.min(checklistPage, totalChecklistPages)}
                totalPages={totalChecklistPages}
                onPrevious={() => setChecklistPage((prev) => Math.max(1, prev - 1))}
                onNext={() => setChecklistPage((prev) => Math.min(totalChecklistPages, prev + 1))}
              />
            )}
          </div>

          <Dialog
            open={!!selectedChecklistHouseholdCode}
            onOpenChange={(open) => !open && setSelectedChecklistHouseholdCode('')}
          >
            <DialogContent className="sm:max-w-[880px] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Chi tiết checklist theo hộ dân</DialogTitle>
                <DialogDescription>
                  Theo dõi đầy đủ các lượt giao đã được gán cho cùng một hộ dân và thao tác trên
                  từng gói cứu trợ.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-3">
                {filteredChecklistItems
                  .filter((item) => item.householdCode === selectedChecklistHouseholdCode)
                  .map((item) => {
                    const sequence =
                      visibleChecklistDeliverySequenceById[item.householdDeliveryId] || 1;
                    const unusedPackageOptions = getUnusedPackageOptionsForHousehold(item);
                    const hasAlternativePackage = !!unusedPackageOptions.preferred;

                    return (
                      <div
                        key={item.householdDeliveryId}
                        role="button"
                        tabIndex={0}
                        className={`rounded-xl border p-4 transition-colors hover:bg-muted/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${getDeliverySequenceClassName(sequence)}`}
                        onClick={() => setSelectedDeliveryId(item.householdDeliveryId)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            setSelectedDeliveryId(item.householdDeliveryId);
                          }
                        }}
                      >
                        <div className="flex flex-col gap-4">
                          <div>
                            <p className="font-medium text-foreground">
                              {item.householdCode} · {item.headOfHouseholdName}
                            </p>
                            <div className="mt-2 flex flex-wrap gap-2">
                              <Badge variant="outline">Lượt giao #{sequence}</Badge>
                              {(visibleChecklistDeliveryCountByCode[item.householdCode] || 0) >
                                1 && (
                                <Badge variant="outline">
                                  {visibleChecklistDeliveryCountByCode[item.householdCode]} gói / hộ
                                </Badge>
                              )}
                            </div>
                          </div>

                          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                            <div className="rounded-lg border border-border bg-background px-3 py-3">
                              <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                <span className="material-symbols-outlined text-[16px]">
                                  groups
                                </span>
                                Đội phụ trách
                              </div>
                              <p className="mt-2 text-sm font-medium text-foreground">
                                {item.campaignTeamName ||
                                  teamNameById[item.campaignTeamId || ''] ||
                                  'Chưa rõ đội'}
                              </p>
                            </div>
                            <div className="rounded-lg border border-border bg-background px-3 py-3">
                              <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                <span className="material-symbols-outlined text-[16px]">
                                  local_shipping
                                </span>
                                Hình thức phát
                              </div>
                              <p className="mt-2 text-sm font-medium text-foreground">
                                {Number(item.deliveryMode) === DeliveryMode.DoorToDoor
                                  ? 'Phát tận nơi'
                                  : item.distributionPointName
                                    ? item.distributionPointName
                                    : 'Chưa chọn điểm phát'}
                              </p>
                            </div>
                            <div className="rounded-lg border border-border bg-background px-3 py-3">
                              <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                <span className="material-symbols-outlined text-[16px]">
                                  inventory_2
                                </span>
                                Gói cứu trợ
                              </div>
                              <p className="mt-2 text-sm font-medium text-foreground">
                                {item.reliefPackageDefinitionName || 'Chưa có gói cứu trợ'}
                              </p>
                            </div>
                            <div className="rounded-lg border border-border bg-background px-3 py-3">
                              <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                <span className="material-symbols-outlined text-[16px]">
                                  schedule
                                </span>
                                Thời gian hẹn
                              </div>
                              <p className="mt-2 text-sm font-medium text-foreground">
                                {formatDateTimeVN(item.scheduledAt)}
                              </p>
                            </div>
                          </div>

                          <div className="grid gap-3 text-sm md:grid-cols-2">
                            <button
                              type="button"
                              className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-3 text-left text-muted-foreground transition-colors hover:bg-muted/40"
                              onClick={(event) => {
                                event.stopPropagation();
                                setSelectedDeliveryId(item.householdDeliveryId);
                              }}
                            >
                              <span className="material-symbols-outlined text-[18px]">
                                attach_file
                              </span>
                              <span>Minh chứng: {formatNumberVN(item.proofCount)}</span>
                            </button>
                            <div className="flex items-center justify-between gap-2 rounded-lg border border-border bg-background px-3 py-3 text-muted-foreground">
                              <div className="flex items-center gap-2">
                                <span className="material-symbols-outlined text-[18px]">
                                  task_alt
                                </span>
                                <span>
                                  {item.deliveredAt
                                    ? `Đã phát lúc ${formatDateTimeVN(item.deliveredAt)}`
                                    : 'Chưa phát'}
                                </span>
                              </div>
                              <Badge variant={item.deliveredAt ? 'success' : 'warning'}>
                                {item.deliveredAt ? 'Đã phát' : 'Chưa phát'}
                              </Badge>
                            </div>
                          </div>
                        </div>
                        <div className="mt-3 flex justify-end">
                          <div className="flex flex-wrap gap-2">
                            <Button
                              type="button"
                              variant="secondary"
                              className="gap-2"
                              disabled={!!item.deliveredAt || !hasAlternativePackage}
                              onClick={(event) => {
                                event.stopPropagation();
                                handleCreateAdditionalDelivery(item);
                              }}
                              title={
                                hasAlternativePackage
                                  ? 'Nhân bản lượt giao này với một gói cứu trợ khác'
                                  : 'Không còn gói cứu trợ khác để nhân bản'
                              }
                            >
                              <span className="material-symbols-outlined text-[18px]">add_box</span>
                              Nhân bản lượt giao với gói khác
                              {unusedPackageOptions.count > 0 && (
                                <Badge
                                  variant="outline"
                                  className="ml-1 border-current/30 bg-background/80"
                                >
                                  Còn {unusedPackageOptions.count} gói chưa dùng
                                </Badge>
                              )}
                            </Button>
                            {!hasAlternativePackage && !item.deliveredAt && (
                              <Badge variant="warning" className="self-center">
                                Đã dùng hết gói hiện có
                              </Badge>
                            )}
                            <Button
                              type="button"
                              variant="outline"
                              className="gap-2"
                              disabled={!!item.deliveredAt}
                              onClick={(event) => {
                                event.stopPropagation();
                                handleOpenEditDeliveryAssignment(item);
                              }}
                            >
                              <span className="material-symbols-outlined text-[18px]">
                                edit_square
                              </span>
                              Sửa gán
                            </Button>
                            <Button
                              type="button"
                              variant="destructive"
                              className="gap-2"
                              disabled={!!item.deliveredAt}
                              onClick={(event) => {
                                event.stopPropagation();
                                handleDeleteDeliveryAssignment(item);
                              }}
                            >
                              <span className="material-symbols-outlined text-[18px]">delete</span>
                              Gỡ gán
                            </Button>
                            <Button
                              type="button"
                              variant={item.deliveredAt ? 'outline' : 'primary'}
                              className="gap-2"
                              disabled={!!item.deliveredAt}
                              onClick={(event) => {
                                event.stopPropagation();
                                handleOpenCompleteDelivery(item);
                              }}
                            >
                              <span className="material-symbols-outlined text-[18px]">
                                task_alt
                              </span>
                              {item.deliveredAt ? 'Đã hoàn tất' : 'Hoàn tất phát quà'}
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </DialogContent>
          </Dialog>

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
                        <option value={DeliveryMode.DoorToDoor}>Phát tận nơi</option>
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

          <Dialog
            open={!!editingDeliveryAssignment}
            onOpenChange={(open) => {
              if (!open) {
                setEditingDeliveryAssignment(null);
                setDeliveryAssignmentForm(null);
                setDeliveryAssignmentErrors({});
              }
            }}
          >
            <DialogContent className="sm:max-w-[640px]">
              <DialogHeader>
                <DialogTitle>Sửa lượt giao hàng đã gán</DialogTitle>
                <DialogDescription>
                  Đổi đội, gói cứu trợ, lịch hẹn hoặc điểm phát khi gán nhầm trước lúc hoàn tất.
                </DialogDescription>
              </DialogHeader>

              {deliveryAssignmentForm && (
                <div className="space-y-4">
                  {duplicatingFromPackageId && (
                    <div className="rounded-2xl border border-primary/20 bg-gradient-to-r from-primary/10 via-sky-50 to-emerald-50 px-4 py-4 text-sm shadow-sm">
                      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div className="space-y-2">
                          <p className="font-medium text-foreground">
                            Xem trước nhân bản gói cứu trợ
                          </p>
                          <div className="flex flex-wrap items-center gap-2 text-sm text-foreground">
                            <Badge variant="outline" className="bg-background/80">
                              {packages.find(
                                (pkg) => pkg.reliefPackageDefinitionId === duplicatingFromPackageId,
                              )?.name || 'Không xác định'}
                            </Badge>
                            <span className="material-symbols-outlined text-[18px] text-primary">
                              east
                            </span>
                            <Badge variant="outline" className="bg-background/80">
                              {packages.find(
                                (pkg) =>
                                  pkg.reliefPackageDefinitionId ===
                                  deliveryAssignmentForm.reliefPackageDefinitionId,
                              )?.name || 'Chưa có gợi ý'}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Ưu tiên gói khác nhóm vật phẩm để tránh trùng nội dung hỗ trợ.
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            type="button"
                            variant="primary"
                            onClick={() =>
                              setDeliveryAssignmentForm((prev) =>
                                prev
                                  ? {
                                      ...prev,
                                      reliefPackageDefinitionId: duplicatingSuggestedPackageId,
                                    }
                                  : prev,
                              )
                            }
                            disabled={!duplicatingSuggestedPackageId}
                          >
                            Dùng gợi ý
                          </Button>
                          <Button type="button" variant="outline">
                            Chọn lại thủ công
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <p className="text-sm font-medium">Đội phụ trách</p>
                    <select
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={deliveryAssignmentForm.campaignTeamId || ''}
                      onChange={(e) =>
                        setDeliveryAssignmentForm((prev) =>
                          prev ? { ...prev, campaignTeamId: e.target.value || null } : prev,
                        )
                      }
                    >
                      <option value="">Không chọn</option>
                      {teams.map((team) => (
                        <option key={team.campaignTeamId} value={team.campaignTeamId}>
                          {team.teamName}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm font-medium">Gói cứu trợ</p>
                    <select
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={deliveryAssignmentForm.reliefPackageDefinitionId || ''}
                      onChange={(e) =>
                        setDeliveryAssignmentForm((prev) =>
                          prev
                            ? { ...prev, reliefPackageDefinitionId: e.target.value || null }
                            : prev,
                        )
                      }
                    >
                      <option value="">Không chọn</option>
                      {packages.map((pkg) => (
                        <option
                          key={pkg.reliefPackageDefinitionId}
                          value={pkg.reliefPackageDefinitionId}
                          disabled={duplicatingFromPackageId === pkg.reliefPackageDefinitionId}
                        >
                          {pkg.name}
                        </option>
                      ))}
                    </select>
                    {duplicatingFromPackageId && (
                      <p className="text-xs text-muted-foreground">
                        Gói đã gán ở lượt trước đang bị khóa để tránh thao tác nhân bản trở thành
                        sửa cùng một gói.
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm font-medium">Hình thức nhận</p>
                    <select
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={deliveryAssignmentForm.deliveryMode}
                      onChange={(e) =>
                        setDeliveryAssignmentForm((prev) =>
                          prev ? { ...prev, deliveryMode: Number(e.target.value) } : prev,
                        )
                      }
                    >
                      <option value={DeliveryMode.PickupAtPoint}>Nhận tại điểm phát</option>
                      <option value={DeliveryMode.DoorToDoor}>Phát tận nơi</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm font-medium">Điểm phát</p>
                    <select
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={deliveryAssignmentForm.distributionPointId || ''}
                      onChange={(e) =>
                        setDeliveryAssignmentForm((prev) =>
                          prev ? { ...prev, distributionPointId: e.target.value || null } : prev,
                        )
                      }
                    >
                      <option value="">Không chọn</option>
                      {distributionPoints.map((point) => (
                        <option key={point.distributionPointId} value={point.distributionPointId}>
                          {point.name}
                        </option>
                      ))}
                    </select>
                    {deliveryAssignmentErrors.distributionPointId && (
                      <p className="text-sm text-destructive">
                        {deliveryAssignmentErrors.distributionPointId}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm font-medium">Thời gian hẹn phát</p>
                    {(selectedCampaignDetail?.startDate || selectedCampaignDetail?.endDate) && (
                      <p className="text-xs text-muted-foreground">
                        Chỉ được chọn trong thời gian chiến dịch:
                        {selectedCampaignDetail?.startDate
                          ? ` từ ${new Date(selectedCampaignDetail.startDate).toLocaleString('vi-VN')}`
                          : ''}
                        {selectedCampaignDetail?.endDate
                          ? ` đến ${new Date(selectedCampaignDetail.endDate).toLocaleString('vi-VN')}`
                          : ''}
                      </p>
                    )}
                    <Input
                      type="datetime-local"
                      min={
                        selectedCampaignDetail?.startDate
                          ? toDateTimeLocalValue(selectedCampaignDetail.startDate)
                          : undefined
                      }
                      max={
                        selectedCampaignDetail?.endDate
                          ? toDateTimeLocalValue(selectedCampaignDetail.endDate)
                          : undefined
                      }
                      value={toDateTimeLocalValue(deliveryAssignmentForm.scheduledAt) || ''}
                      onChange={(e) => {
                        const nextScheduledAt = parseDateTimeLocalToIso(e.target.value);
                        setDeliveryAssignmentErrors((prev) => {
                          if (!prev.scheduledAt) return prev;
                          const nextErrors = { ...prev };
                          delete nextErrors.scheduledAt;
                          return nextErrors;
                        });
                        setDeliveryAssignmentForm((prev) =>
                          prev
                            ? {
                                ...prev,
                                scheduledAt: nextScheduledAt,
                              }
                            : prev,
                        );
                      }}
                    />
                    {deliveryAssignmentErrors.scheduledAt && (
                      <p className="text-sm text-destructive">
                        {deliveryAssignmentErrors.scheduledAt}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm font-medium">Ghi chú</p>
                    <Textarea
                      value={deliveryAssignmentForm.notes || ''}
                      onChange={(e) =>
                        setDeliveryAssignmentForm((prev) =>
                          prev ? { ...prev, notes: e.target.value } : prev,
                        )
                      }
                    />
                  </div>

                  {deliveryAssignmentErrors.form && (
                    <p className="text-sm text-destructive">{deliveryAssignmentErrors.form}</p>
                  )}
                </div>
              )}

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditingDeliveryAssignment(null)}
                >
                  Hủy
                </Button>
                <Button type="button" onClick={handleSubmitDeliveryAssignmentUpdate}>
                  Lưu thay đổi gán
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

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
            <DialogContent className="flex max-h-[90vh] flex-col overflow-hidden sm:max-w-[860px]">
              <DialogHeader>
                <DialogTitle>Trích ngân sách sang chiến dịch cứu trợ</DialogTitle>
                <DialogDescription>
                  Chọn chiến dịch gây quỹ nguồn, số tiền và ghi chú để chuyển quỹ sang campaign này.
                </DialogDescription>
              </DialogHeader>

              <div className="flex-1 space-y-5 overflow-y-auto pr-1">
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

                <div className="space-y-3 rounded-xl border border-border/80 bg-muted/20 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-foreground">
                      Lịch sử trích ngân sách (kể cả giao dịch đã huỷ)
                    </p>
                    <Badge variant="outline" className="max-w-full whitespace-normal break-words">
                      {budgetTransferHistory.length} giao dịch
                    </Badge>
                  </div>
                  {isLoadingBudgetTransferHistory ? (
                    <p className="text-sm text-muted-foreground">Đang tải lịch sử giao dịch...</p>
                  ) : budgetTransferHistory.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      Chưa có giao dịch trích ngân sách cho chiến dịch này.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {budgetTransferHistory
                        .slice()
                        .sort(
                          (left, right) =>
                            new Date(right.transferredAt).getTime() -
                            new Date(left.transferredAt).getTime(),
                        )
                        .map((transfer) => {
                          const isDeleted = !!transfer.isDeleted;
                          const sourceName =
                            campaignNameById[transfer.sourceCampaignId] ||
                            transfer.sourceCampaignId;
                          const targetName =
                            campaignNameById[transfer.targetCampaignId] ||
                            transfer.targetCampaignId;
                          const canReverse = !isDeleted && !reverseBudgetTransferMutation.isPending;

                          return (
                            <div
                              key={transfer.campaignBudgetTransferId}
                              className="rounded-lg border border-border bg-background p-3 text-sm"
                            >
                              <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                                <div className="space-y-1">
                                  <p className="font-medium text-foreground">
                                    {sourceName} {'->'} {targetName}
                                  </p>
                                  <p className="text-muted-foreground">
                                    Số tiền: {formatNumberVN(transfer.amount)}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    Tạo bởi {transfer.transferredByUserName || 'Không xác định'} ·{' '}
                                    {formatDateTimeVN(transfer.transferredAt)}
                                  </p>
                                  {transfer.note && (
                                    <p className="text-xs text-muted-foreground">
                                      Ghi chú: {transfer.note}
                                    </p>
                                  )}
                                  {isDeleted && (
                                    <p className="text-xs text-destructive">
                                      Đã huỷ bởi {transfer.cancelledByUserName || 'Không xác định'}{' '}
                                      · {formatDateTimeVN(transfer.cancelledAt)}
                                    </p>
                                  )}
                                </div>
                                <div className="flex items-center gap-2">
                                  <Badge variant={isDeleted ? 'secondary' : 'success'}>
                                    {isDeleted ? 'Đã huỷ' : 'Hiệu lực'}
                                  </Badge>
                                  <Button
                                    type="button"
                                    variant="destructive"
                                    size="sm"
                                    disabled={!canReverse}
                                    onClick={() =>
                                      handleReverseBudgetTransfer(
                                        transfer.campaignBudgetTransferId,
                                        effectiveSelectedCampaignId,
                                        transfer.amount,
                                      )
                                    }
                                  >
                                    Huỷ giao dịch
                                  </Button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  )}
                </div>
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
            <DialogContent className="flex max-h-[90vh] flex-col overflow-hidden sm:max-w-[640px]">
              <DialogHeader>
                <DialogTitle>Hoàn tất phát quà</DialogTitle>
                <DialogDescription>
                  Bổ sung minh chứng và tiền mặt hỗ trợ thực tế cho lượt phát này.
                </DialogDescription>
              </DialogHeader>

              <div className="flex-1 space-y-4 overflow-y-auto pr-1">
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
                  <p className="text-sm font-medium">Tệp minh chứng</p>
                  <FileUploadCard
                    title="Tải ảnh/PDF minh chứng"
                    description="Chọn file và hệ thống sẽ tải lên trước khi hoàn tất giao hàng."
                    accept="image/*,.pdf"
                    selectedFiles={
                      completeDeliveryForm.proofFileName
                        ? [{ name: completeDeliveryForm.proofFileName }]
                        : []
                    }
                    onFilesSelected={async (files) => {
                      const file = files?.[0];
                      if (!file) return;
                      try {
                        const uploaded = await uploadFile({
                          file,
                          folder: 'reliefhub/delivery-proofs',
                          resourceType: file.type.startsWith('image/') ? 'image' : 'raw',
                        });
                        setCompleteDeliveryForm((prev) => ({
                          ...prev,
                          proofFileUrl: uploaded.secureUrl,
                          proofContentType: file.type || prev.proofContentType,
                          proofFileName: file.name,
                        }));
                      } catch {
                        // handled by hook
                      }
                    }}
                  />
                  {completeDeliveryErrors.proofFileUrl && (
                    <p className="text-sm text-destructive">
                      {completeDeliveryErrors.proofFileUrl}
                    </p>
                  )}
                  {completeDeliveryForm.proofFileUrl && (
                    <div className="rounded-xl border border-border bg-muted/20 p-3">
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <p className="text-sm font-medium text-foreground">Xem trước minh chứng</p>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="gap-2"
                          onClick={() =>
                            setCompleteDeliveryForm((prev) => ({
                              ...prev,
                              proofFileUrl: '',
                              proofContentType: '',
                              proofFileName: '',
                            }))
                          }
                        >
                          <span className="material-symbols-outlined text-[16px]">delete</span>
                          Xóa tệp
                        </Button>
                      </div>
                      {completeDeliveryForm.proofContentType.startsWith('image/') ? (
                        <img
                          src={completeDeliveryForm.proofFileUrl}
                          alt={completeDeliveryForm.proofFileName || 'Minh chứng giao hàng'}
                          className="max-h-72 w-full rounded-lg bg-background object-contain"
                        />
                      ) : (
                        <iframe
                          src={completeDeliveryForm.proofFileUrl}
                          title={completeDeliveryForm.proofFileName || 'Minh chứng PDF'}
                          className="h-80 w-full rounded-lg border bg-background"
                        />
                      )}
                    </div>
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

              <DialogFooter className="shrink-0 border-t border-border bg-background pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCompleteDeliveryTarget(null)}
                >
                  Hủy
                </Button>
                <Button
                  onClick={handleSubmitCompleteDelivery}
                  disabled={completeDeliveryMutation.isPending || isUploadingProofFile}
                >
                  {completeDeliveryMutation.isPending ? 'Đang hoàn tất...' : 'Xác nhận hoàn tất'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog
            open={!!selectedDeliveryId}
            onOpenChange={(open) => !open && setSelectedDeliveryId('')}
          >
            <DialogContent className="sm:max-w-[720px]">
              <DialogHeader>
                <DialogTitle>Chi tiết giao hàng</DialogTitle>
                <DialogDescription>
                  Xem đầy đủ trạng thái, minh chứng và thông tin phát quà.
                </DialogDescription>
              </DialogHeader>
              {!selectedDeliveryDetail ? (
                <p className="text-sm text-muted-foreground">Đang tải chi tiết giao hàng...</p>
              ) : (
                <div className="space-y-4 text-sm">
                  <div className="rounded-xl border bg-muted/20 p-4">
                    <p className="font-medium text-foreground">
                      {selectedDeliveryDetail.householdCode || 'Chưa có mã hộ'}
                    </p>
                    <p className="mt-1 text-muted-foreground">
                      {selectedDeliveryDetail.campaignTeamName || 'Chưa rõ đội'} ·{' '}
                      {selectedDeliveryDetail.distributionPointName || 'Không có điểm'}
                    </p>
                    <p className="mt-1 text-muted-foreground">
                      Hẹn phát: {formatDateTimeVN(selectedDeliveryDetail.scheduledAt)} · Đã phát:{' '}
                      {formatDateTimeVN(selectedDeliveryDetail.deliveredAt)}
                    </p>
                  </div>
                  <div className="rounded-xl border bg-muted/20 p-4">
                    <p className="font-medium text-foreground">Minh chứng</p>
                    {selectedDeliveryDetail.proofs.length === 0 ? (
                      <p className="mt-1 text-muted-foreground">Chưa có minh chứng nào.</p>
                    ) : (
                      <div className="mt-2 space-y-3">
                        {selectedDeliveryDetail.proofs.map((proof, index) => {
                          const isImage = (proof.fileType || '').startsWith('image/');
                          return (
                            <div
                              key={proof.householdDeliveryProofId}
                              className="rounded-lg border bg-background p-3"
                            >
                              <div className="mb-2 flex items-center justify-between gap-2 text-sm">
                                <p className="font-medium text-foreground">
                                  Minh chứng #{index + 1}
                                </p>
                                <a
                                  href={proof.fileUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-primary underline-offset-4 hover:underline"
                                >
                                  Mở tệp mới
                                </a>
                              </div>
                              {proof.note && (
                                <p className="mb-2 text-sm text-muted-foreground">{proof.note}</p>
                              )}
                              {isImage ? (
                                <img
                                  src={proof.fileUrl}
                                  alt={proof.note || `Minh chứng ${index + 1}`}
                                  className="max-h-80 w-full rounded-lg object-contain"
                                />
                              ) : (
                                <iframe
                                  src={proof.fileUrl}
                                  title={proof.note || `Minh chứng ${index + 1}`}
                                  className="h-80 w-full rounded-lg border bg-background"
                                />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>

          <Dialog open={batchCompleteOpen} onOpenChange={setBatchCompleteOpen}>
            <DialogContent className="sm:max-w-[840px] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Hoàn tất phát quà theo lô</DialogTitle>
                <DialogDescription>
                  Chọn nhiều lượt giao hàng, tải minh chứng và hoàn tất theo lô ngay trên web
                  coordinator.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                {batchCompleteForm.deliveries.map((delivery, index) => {
                  const deliveryMeta = paginatedDeliveries.find(
                    (item) => item.householdDeliveryId === delivery.householdDeliveryId,
                  );

                  return (
                    <div
                      key={delivery.householdDeliveryId}
                      className="rounded-xl border bg-muted/20 p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-medium text-foreground">
                            {deliveryMeta?.householdCode || delivery.householdDeliveryId}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {deliveryMeta?.campaignTeamName || 'Chưa rõ đội'} ·{' '}
                            {deliveryMeta?.distributionPointName || 'Không có điểm'}
                          </p>
                        </div>
                        <input
                          type="checkbox"
                          checked={delivery.selected}
                          onChange={(e) =>
                            setBatchCompleteForm((prev) => ({
                              deliveries: prev.deliveries.map((item, itemIndex) =>
                                itemIndex === index
                                  ? { ...item, selected: e.target.checked }
                                  : item,
                              ),
                            }))
                          }
                        />
                      </div>
                      {delivery.selected && (
                        <div className="mt-4 space-y-3">
                          <FileUploadCard
                            title="Minh chứng giao hàng"
                            description="Tải nhiều ảnh/PDF minh chứng cho lượt giao này. Hệ thống sẽ tải toàn bộ lên trước khi hoàn tất theo lô."
                            accept="image/*,.pdf"
                            multiple
                            selectedFiles={delivery.proofFiles}
                            onFilesSelected={(files) =>
                              setBatchCompleteForm((prev) => ({
                                deliveries: prev.deliveries.map((item, itemIndex) =>
                                  itemIndex === index
                                    ? {
                                        ...item,
                                        proofFiles: files
                                          ? [...item.proofFiles, ...Array.from(files)]
                                          : item.proofFiles,
                                      }
                                    : item,
                                ),
                              }))
                            }
                            onRemoveFile={(fileIndex) =>
                              setBatchCompleteForm((prev) => ({
                                deliveries: prev.deliveries.map((item, itemIndex) =>
                                  itemIndex === index
                                    ? {
                                        ...item,
                                        proofFiles: item.proofFiles.filter(
                                          (_, current) => current !== fileIndex,
                                        ),
                                      }
                                    : item,
                                ),
                              }))
                            }
                          />
                          <Input
                            placeholder="Tiền hỗ trợ thực tế"
                            value={delivery.cashSupportAmount}
                            onChange={(e) =>
                              setBatchCompleteForm((prev) => ({
                                deliveries: prev.deliveries.map((item, itemIndex) =>
                                  itemIndex === index
                                    ? {
                                        ...item,
                                        cashSupportAmount: formatNumberInputVN(e.target.value),
                                      }
                                    : item,
                                ),
                              }))
                            }
                          />
                          <Textarea
                            placeholder="Ghi chú minh chứng"
                            value={delivery.proofNote}
                            onChange={(e) =>
                              setBatchCompleteForm((prev) => ({
                                deliveries: prev.deliveries.map((item, itemIndex) =>
                                  itemIndex === index
                                    ? { ...item, proofNote: e.target.value }
                                    : item,
                                ),
                              }))
                            }
                          />
                          <Textarea
                            placeholder="Ghi chú giao hàng"
                            value={delivery.notes}
                            onChange={(e) =>
                              setBatchCompleteForm((prev) => ({
                                deliveries: prev.deliveries.map((item, itemIndex) =>
                                  itemIndex === index ? { ...item, notes: e.target.value } : item,
                                ),
                              }))
                            }
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
                {batchCompleteErrors.form && (
                  <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                    {batchCompleteErrors.form}
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setBatchCompleteOpen(false)}>
                  Hủy
                </Button>
                <Button
                  type="button"
                  disabled={completeDeliveryBatchMutation.isPending || isUploadingProofFile}
                  onClick={async () => {
                    if (!effectiveSelectedCampaignId) return;
                    try {
                      setBatchCompleteErrors({});
                      const selectedBatch = batchCompleteForm.deliveries.filter(
                        (item) => item.selected,
                      );
                      if (selectedBatch.length === 0) {
                        setBatchCompleteErrors({ form: 'Vui lòng chọn ít nhất 1 lượt giao hàng.' });
                        return;
                      }

                      const deliveriesPayload: CompleteDeliveriesBatchItemRequest[] = [];

                      for (const item of selectedBatch) {
                        if (item.proofFiles.length === 0) {
                          setBatchCompleteErrors({
                            form: 'Mỗi lượt giao được chọn cần có ít nhất 1 file minh chứng.',
                          });
                          return;
                        }
                        const uploadedProofs = [] as Array<{
                          fileUrl: string;
                          contentType: string;
                        }>;
                        for (const proofFile of item.proofFiles) {
                          const uploaded = await uploadFile({
                            file: proofFile,
                            folder: 'reliefhub/delivery-proofs',
                            resourceType: 'raw',
                          });
                          uploadedProofs.push({
                            fileUrl: uploaded.secureUrl,
                            contentType: proofFile.type || 'application/octet-stream',
                          });
                        }

                        deliveriesPayload.push({
                          householdDeliveryId: item.householdDeliveryId,
                          notes: item.notes || undefined,
                          cashSupportAmount:
                            parseInt((item.cashSupportAmount || '0').replace(/\D/g, ''), 10) || 0,
                          proofs: uploadedProofs.map((proof, proofIndex) => ({
                            fileUrl: proof.fileUrl,
                            contentType: proof.contentType || undefined,
                            note:
                              proofIndex === 0
                                ? item.proofNote || undefined
                                : `${item.proofNote || 'Minh chứng bổ sung'} (${proofIndex + 1})`,
                          })),
                        });
                      }

                      await completeDeliveryBatchMutation.mutateAsync({
                        campaignId: effectiveSelectedCampaignId,
                        data: { deliveries: deliveriesPayload },
                      });
                      setBatchCompleteOpen(false);
                    } catch (error) {
                      const parsed = parseApiError(error, 'Không thể hoàn tất phát quà theo lô');
                      setBatchCompleteErrors({ form: parsed.message });
                    }
                  }}
                >
                  {completeDeliveryBatchMutation.isPending
                    ? 'Đang hoàn tất...'
                    : 'Xác nhận hoàn tất theo lô'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      )}
    </DashboardLayout>
  );
}
