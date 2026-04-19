import { useMemo, useState, type SetStateAction } from 'react';
import { useQueryClient } from '@tanstack/react-query';
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
import { useCampaigns, useCampaignTeams } from '@/hooks/useCampaigns';
import { useProvinces } from '@/hooks/useLocations';
import { useInventories, useInventoryStocks } from '@/hooks/useInventory';
import {
  RELIEF_DISTRIBUTION_KEYS,
  useCreateDistributionPoint,
  useCreateReliefPackage,
  useDeleteDistributionPoint,
  useDeleteReliefHousehold,
  useDeleteReliefPackage,
  usePatchDistributionPoint,
  usePatchReliefHousehold,
  usePatchReliefPackage,
  useReliefChecklist,
  useDistributionPoints,
  useReliefHouseholds,
  useReliefPackages,
} from '@/hooks/useReliefDistribution';
import { CampaignStatus, CampaignType, DeliveryMode } from '@/enums/beEnums';
import {
  reliefDistributionService,
  type CampaignHouseholdResponse,
  type DistributionPointResponse,
  type ReliefPackageDefinitionResponse,
} from '@/services/reliefDistributionService';
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
import { ReliefStickySectionHeader } from './components/relief-distribution/ReliefStickySectionHeader';
import { ReliefFilterBar } from './components/relief-distribution/ReliefFilterBar';
import { ReliefPaginationBar } from './components/relief-distribution/ReliefPaginationBar';

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
  isDefault: pkg.isDefault,
  isActive: pkg.isActive,
  items:
    pkg.items?.length > 0
      ? pkg.items.map((item) => ({
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
  const [deleteTarget, setDeleteTarget] = useState<
    | { type: 'household'; id: string; label: string }
    | { type: 'distribution-point'; id: string; label: string }
    | { type: 'package'; id: string; label: string }
    | null
  >(null);

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
  const { households } = useReliefHouseholds(effectiveSelectedCampaignId);
  const { checklist } = useReliefChecklist(effectiveSelectedCampaignId);
  const { distributionPoints } = useDistributionPoints(effectiveSelectedCampaignId);
  const { packages } = useReliefPackages(effectiveSelectedCampaignId);
  const { data: provinces = [] } = useProvinces();
  const { data: inventoriesData } = useInventories(
    {
      reliefStationId: station?.reliefStationId,
      pageIndex: 1,
      pageSize: 20,
    },
    { enabled: hasAssignedStation },
  );
  const selectedInventoryId = inventoriesData?.items?.[0]?.inventoryId || '';
  const { data: inventoryStocksData } = useInventoryStocks(selectedInventoryId, {
    pageIndex: 1,
    pageSize: 200,
  });

  const createPointMutation = useCreateDistributionPoint();
  const createPackageMutation = useCreateReliefPackage();
  const patchPointMutation = usePatchDistributionPoint();
  const deletePointMutation = useDeleteDistributionPoint();
  const patchPackageMutation = usePatchReliefPackage();
  const deletePackageMutation = useDeleteReliefPackage();
  const patchHouseholdMutation = usePatchReliefHousehold();
  const deleteHouseholdMutation = useDeleteReliefHousehold();

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

    if (!packageForm.name.trim()) clientErrors.name = 'Vui lòng nhập tên gói cứu trợ.';
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
          outputSupplyItemId:
            packageForm.items[0]?.supplyItemId || editingPackage.outputSupplyItemId,
        },
      });
      handleCancelEditPackage();
    } catch (error) {
      const parsed = parseApiError(error, 'Không thể cập nhật gói cứu trợ');
      setPackageErrors({
        name: pickFieldError(parsed.fieldErrors, 'Name', 'name'),
        description: pickFieldError(parsed.fieldErrors, 'Description', 'description'),
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
        setSelectedHouseholdIds((prev) => {
          const next = new Set(prev);
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

  const handleEditHousehold = (household: CampaignHouseholdResponse) => {
    setEditingHousehold(household);
    setHouseholdEditForm(mapHouseholdToEditForm(household));
    setHouseholdEditErrors({});
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
      toast.error(parsed.message);
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
  }, [teams, checklist]);

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

  const totalChecklistPages = Math.max(1, Math.ceil(checklist.length / CHECKLIST_ITEMS_PER_PAGE));
  const paginatedChecklist = useMemo(() => {
    const start = (Math.min(checklistPage, totalChecklistPages) - 1) * CHECKLIST_ITEMS_PER_PAGE;
    return checklist.slice(start, start + CHECKLIST_ITEMS_PER_PAGE);
  }, [checklist, checklistPage, totalChecklistPages]);

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
              setCurrentPage(1);
              setSelectedHouseholdIds(new Set());
            }}
            campaigns={reliefCampaigns}
            stationName={headerStationName}
            locationName={headerLocationName}
          />

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Hộ dân chờ gán"
              value={households.length}
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
              label="Gói hỗ trợ đã tạo"
              value={packages.length}
              note="Dùng để gán cho hộ dân khi phân phối"
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
                  title="Theo dõi hoạt động team"
                  description="Tổng hợp nhanh số hộ đã được giao và đã hoàn tất theo từng team."
                  badgeIcon="groups"
                  badgeLabel={`${formatNumberInputVN(filteredTeamActivitySummary.length)} team`}
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
                        ? 'Chưa có hoạt động team để hiển thị.'
                        : 'Không tìm thấy team phù hợp với bộ lọc hiện tại.'}
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
                          {pkg.isDefault && (
                            <Badge variant="success" appearance="light">
                              Mặc định
                            </Badge>
                          )}
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
          />

          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-foreground">
                Bước 5. Rà soát checklist phân phối
              </h3>
              <p className="text-sm text-muted-foreground">
                Kiểm tra danh sách hộ đã được gán, thời gian hẹn phát và trạng thái thực hiện.
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
                          {teamNameById[item.campaignTeamId || ''] || 'Chưa rõ team'} · Hẹn phát{' '}
                          {formatDateTimeVN(item.scheduledAt)}
                        </p>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Minh chứng: {formatNumberVN(item.proofCount)} · Đã phát:{' '}
                        {item.deliveredAt ? formatDateTimeVN(item.deliveredAt) : 'Chưa phát'}
                      </div>
                    </div>
                  </div>
                ))
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
        </div>
      )}
    </DashboardLayout>
  );
}
