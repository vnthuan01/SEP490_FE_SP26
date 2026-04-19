import { useState, useEffect, useRef } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useForm, useWatch, useFieldArray } from 'react-hook-form';
import { useQueries, useQueryClient } from '@tanstack/react-query';
import {
  useAssignStationToCampaign,
  useCampaign,
  useCampaignInventoryBalance,
  useCampaignTeams,
  useCampaigns,
  useCreateCampaign,
  useRemoveStationFromCampaign,
  useUpdateCampaign,
  useUpdateCampaignStatus,
  useUpdateCampaignTeamStatus,
} from '@/hooks/useCampaigns';
import {
  useSupplyAllocationsByCampaign,
  useUpdateSupplyAllocationStatus,
} from '@/hooks/useSupplies';
import { useProvinces } from '@/hooks/useLocations';
import {
  useProvincialStations,
  useCreateProvincialStation,
  RELIEF_STATION_KEYS,
} from '@/hooks/useReliefStations';
import { AddStationModal, type CreateStationFormData } from './components/AddStationModal';
import { StationAddressLookup } from './components/StationAddressLookup';
import CustomCalendar from '@/components/ui/customCalendar';
import type {
  Campaign,
  CampaignSummary,
  CreateCampaignPayload,
  UpdateCampaignPayload,
} from '@/services/campaignService';
import { campaignService } from '@/services/campaignService';
import { toast } from 'sonner';
import { managerNavGroups } from './components/sidebarConfig';
import { formatNumberInputVN, formatNumberVN, normalizeNumberInput } from '@/lib/utils';
import {
  CampaignCompletionRule,
  CampaignCompletionRuleLabel,
  CampaignStatus,
  CampaignStatusLabel,
  CampaignType,
  CampaignTypeLabel,
  CampaignResourceType,
  CampaignResourceTypeLabel,
  CampaignTeamStatus,
  SupplyAllocationStatus,
  getCampaignStatusClass,
  getCampaignStatusLabel,
  getSupplyAllocationStatusClass,
  getSupplyAllocationStatusLabel,
  getCampaignTypeLabel,
} from '@/enums/beEnums';

// ─── Date helpers (same pattern as ManagerInventoryCoordinationPage) ────────────

const parseIsoToDate = (value?: string | null): Date | undefined => {
  if (!value) return undefined;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
};

const formatDateVN = (isoString?: string): string => {
  if (!isoString) return '';
  const d = parseIsoToDate(isoString);
  if (!d) return '';
  return d.toLocaleDateString('vi-VN');
};

const formatTimeValue = (isoString?: string): string => {
  const d = parseIsoToDate(isoString);
  if (!d) return '08:00';
  return d.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
};

const mergeDateAndTimeToIso = (baseIso: string | undefined, timeValue: string): string => {
  const baseDate = parseIsoToDate(baseIso) ?? new Date();
  const [hours, minutes] = timeValue.split(':').map(Number);
  baseDate.setHours(hours || 0, minutes || 0, 0, 0);
  return baseDate.toISOString();
};

const normalizeLocationText = (value?: string | null) => {
  if (!value) return '';
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim();
};

// ─── Badge helpers ────────────────────────────────────────────────────────────

const CAMPAIGN_STATUS_BADGE_ICON: Record<number, string> = {
  [CampaignStatus.Draft]: 'draft',
  [CampaignStatus.Active]: 'rocket_launch',
  [CampaignStatus.Suspended]: 'pause_circle',
  [CampaignStatus.Completed]: 'task_alt',
  [CampaignStatus.Cancelled]: 'cancel',
  [CampaignStatus.GoalsMet]: 'verified',
  [CampaignStatus.ReadyToExecute]: 'check_circle',
  [CampaignStatus.InProgress]: 'autorenew',
  [CampaignStatus.Closing]: 'hourglass_top',
};

const CAMPAIGN_TYPE_BADGE_ICON: Record<number, string> = {
  [CampaignType.Fundraising]: 'volunteer_activism',
  [CampaignType.Relief]: 'inventory_2',
  [CampaignType.Rescue]: 'emergency',
};

const getCampaignStatusBadgeVariant = (
  status: number,
): 'success' | 'outline' | 'destructive' | 'warning' | 'info' => {
  switch (status) {
    case CampaignStatus.Active:
    case CampaignStatus.ReadyToExecute:
      return 'success';
    case CampaignStatus.Suspended:
    case CampaignStatus.Closing:
      return 'warning';
    case CampaignStatus.InProgress:
      return 'info';
    case CampaignStatus.Cancelled:
      return 'destructive';
    default:
      return 'outline';
  }
};

const getCampaignTypeBadgeClass = (type: number) => {
  switch (type) {
    case CampaignType.Fundraising:
      return 'border border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300';
    case CampaignType.Relief:
      return 'border border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300';
    case CampaignType.Rescue:
      return 'border border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300';
    default:
      return 'border border-border bg-muted/50 text-muted-foreground';
  }
};

const getCampaignTeamRoleLabel = (role: number) => {
  switch (role) {
    case 0:
      return 'Hậu cần';
    case 1:
      return 'Y tế';
    case 2:
      return 'Cứu trợ';
    case 3:
      return 'Tìm kiếm & cứu nạn';
    case 4:
      return 'Liên lạc';
    case 5:
      return 'Chỉ huy';
    default:
      return `Vai trò ${role}`;
  }
};

// ─── Form types ───────────────────────────────────────────────────────────────

interface CreateCampaignFormValues {
  name: string;
  description: string;
  locationId: string;
  startDate: string;
  endDate: string;
  latitude: number;
  longitude: number;
  areaRadiusKm: number;
  addressDetail: string;
  type: number;
  completionRule: number;
  allowOverTarget: boolean;
  availablePeopleCount: number;
  reliefStationId: string;
  goals: Array<{ resourceType: number; targetAmount: number; isRequired: boolean }>;
}

interface UpdateCampaignFormValues {
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  latitude: number;
  longitude: number;
  areaRadiusKm: number;
  addressDetail: string;
  allowOverTarget: boolean;
  completionRule: number;
}

// ─── Page Component ───────────────────────────────────────────────────────────

const CAMPAIGN_DRAFT_KEY = 'campaign_create_draft';

const getCampaignIdentity = (
  campaign?: Partial<CampaignSummary> & Partial<Campaign> & { id?: string | null },
) => {
  const rawId = campaign?.campaignId ?? campaign?.id;
  return typeof rawId === 'string' && rawId.trim().length > 0 ? rawId : null;
};

const buildUpdateFormDefaults = (campaign?: Campaign | null): UpdateCampaignFormValues => ({
  name: campaign?.name ?? '',
  description: campaign?.description ?? '',
  startDate: campaign?.startDate ?? '',
  endDate: campaign?.endDate ?? '',
  latitude: Number(campaign?.latitude ?? 10.762622),
  longitude: Number(campaign?.longitude ?? 106.660172),
  areaRadiusKm: Number(campaign?.areaRadiusKm ?? 10),
  addressDetail: campaign?.addressDetail ?? '',
  allowOverTarget: Boolean(campaign?.allowOverTarget),
  completionRule: Number(campaign?.completionRule ?? CampaignCompletionRule.AllGoalsMet),
});

export default function ManagerCampaignPage() {
  const [pageIndex, setPageIndex] = useState(1);
  const [pageSize] = useState(10);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<number | undefined>(undefined);
  const [openCreateModal, setOpenCreateModal] = useState(false);
  const [openAllocationModal, setOpenAllocationModal] = useState(false);
  const [openDetailModal, setOpenDetailModal] = useState(false);
  const [selectedCampaignForAllocations, setSelectedCampaignForAllocations] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [allocationUpdateState, setAllocationUpdateState] = useState<{
    allocationId: string;
    nextStatus: number;
  } | null>(null);
  const [selectedCampaignId, setSelectedCampaignId] = useState('');
  const [stationToAttach, setStationToAttach] = useState<{
    campaignId: string;
    reliefStationId: string;
    stationName: string;
  } | null>(null);
  const [stationToDetach, setStationToDetach] = useState<{
    campaignId: string;
    reliefStationId: string;
    stationName: string;
  } | null>(null);
  const [openAddStationModal, setOpenAddStationModal] = useState(false);
  const [teamToUpdateStatus, setTeamToUpdateStatus] = useState<{
    campaignId: string;
    teamId: string;
    teamName: string;
    newStatus: number;
  } | null>(null);

  // Calendar open state for start/end date pickers
  const [openStartCalendar, setOpenStartCalendar] = useState(false);
  const [openEndCalendar, setOpenEndCalendar] = useState(false);
  const [openEditStartCalendar, setOpenEditStartCalendar] = useState(false);
  const [openEditEndCalendar, setOpenEditEndCalendar] = useState(false);

  const queryClient = useQueryClient();

  const { campaigns, pagination, isLoading } = useCampaigns({
    pageIndex,
    pageSize,
    search: search || undefined,
    status: statusFilter,
  });

  const { mutateAsync: createCampaign, status: createStatus } = useCreateCampaign();
  const { mutateAsync: updateCampaign, status: updateCampaignStatus } = useUpdateCampaign();
  const { mutateAsync: updateStatus } = useUpdateCampaignStatus();
  const { mutateAsync: assignStation, status: assignStationStatus } = useAssignStationToCampaign();
  const { mutateAsync: removeStation, status: removeStationStatus } =
    useRemoveStationFromCampaign();
  const { mutateAsync: updateTeamStatus } = useUpdateCampaignTeamStatus();
  const { mutateAsync: updateAllocationStatus } = useUpdateSupplyAllocationStatus();
  const { data: allocationsByCampaign = [], isLoading: isLoadingAllocations } =
    useSupplyAllocationsByCampaign(selectedCampaignForAllocations?.id || '');
  const {
    campaign: selectedCampaign,
    isLoading: isLoadingCampaignDetail,
    refetch: refetchCampaignDetail,
  } = useCampaign(selectedCampaignId);
  const { teams: selectedCampaignTeams = [], isLoading: isLoadingCampaignTeams } =
    useCampaignTeams(selectedCampaignId);
  const {
    inventoryBalance: selectedCampaignInventoryBalance,
    inventoryBalanceError: selectedCampaignInventoryBalanceError,
    isLoading: isLoadingCampaignInventoryBalance,
  } = useCampaignInventoryBalance(selectedCampaignId);
  const campaignDetailQueries = useQueries({
    queries: campaigns.map((campaign) => ({
      queryKey: ['campaigns', 'detail', campaign.campaignId, 'manager-list-area'],
      queryFn: async () => {
        const response = await campaignService.getById(campaign.campaignId);
        return response.data;
      },
      enabled: !!campaign.campaignId,
      staleTime: 5 * 60 * 1000,
    })),
  });

  const { data: provinces } = useProvinces();
  const { data: stationsData, isLoading: isLoadingStations } = useProvincialStations({
    pageSize: 100,
  });
  const { mutateAsync: createStation } = useCreateProvincialStation();

  const getStationId = (station: {
    id?: string | null;
    stationId?: string | null;
    reliefStationId?: string | null;
  }) => {
    const rawId = station.reliefStationId ?? station.stationId ?? station.id;
    return typeof rawId === 'string' && rawId.trim().length > 0 ? rawId : null;
  };
  const stations = (stationsData?.items || []).filter((station) => getStationId(station));

  const getCampaignId = (campaign: Partial<CampaignSummary> & { id?: string | null }) => {
    const rawId = campaign.campaignId ?? campaign.id;
    return typeof rawId === 'string' && rawId.trim().length > 0 ? rawId : null;
  };

  const getCampaignDateText = (value?: string | null) => {
    if (!value) return '—';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString('vi-VN');
  };

  const getNextAllocationStatusActions = (status: number) => {
    switch (status) {
      case SupplyAllocationStatus.Pending:
        return [
          { label: 'Duyệt allocation', value: SupplyAllocationStatus.Approved },
          { label: 'Hủy allocation', value: SupplyAllocationStatus.Cancelled },
        ];
      case SupplyAllocationStatus.Approved:
        return [{ label: 'Đánh dấu đã giao', value: SupplyAllocationStatus.Delivered }];
      default:
        return [];
    }
  };

  const form = useForm<CreateCampaignFormValues>({
    defaultValues: {
      name: '',
      description: '',
      locationId: '',
      startDate: '',
      endDate: '',
      latitude: 10.762622,
      longitude: 106.660172,
      areaRadiusKm: 10,
      addressDetail: '',
      type: CampaignType.Fundraising,
      completionRule: 0,
      allowOverTarget: false,
      availablePeopleCount: 0,
      reliefStationId: '',
      goals: [],
    },
  });

  const updateForm = useForm<UpdateCampaignFormValues>({
    defaultValues: buildUpdateFormDefaults(null),
  });

  const {
    fields: goalFields,
    append: appendGoal,
    remove: removeGoal,
  } = useFieldArray({
    control: form.control,
    name: 'goals',
  });

  // ── Draft persistence ──────────────────────────────────────────────────────
  const draftTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Restore draft when modal opens
  useEffect(() => {
    if (!openCreateModal) return;
    try {
      const raw = localStorage.getItem(CAMPAIGN_DRAFT_KEY);
      if (!raw) return;
      const draft = JSON.parse(raw) as CreateCampaignFormValues;
      form.reset(draft);
    } catch {
      localStorage.removeItem(CAMPAIGN_DRAFT_KEY);
    }
  }, [openCreateModal, form]);

  // Auto-save draft 400ms after any field change
  useEffect(() => {
    // eslint-disable-next-line react-hooks/incompatible-library
    const subscription = form.watch((values) => {
      if (draftTimerRef.current) clearTimeout(draftTimerRef.current);
      draftTimerRef.current = setTimeout(() => {
        try {
          localStorage.setItem(CAMPAIGN_DRAFT_KEY, JSON.stringify(values));
        } catch {
          // quota exceeded — silently ignore
        }
      }, 400);
    });
    return () => {
      subscription.unsubscribe();
      if (draftTimerRef.current) clearTimeout(draftTimerRef.current);
    };
  }, [form]);

  useEffect(() => {
    if (!selectedCampaign) return;
    updateForm.reset(buildUpdateFormDefaults(selectedCampaign));
  }, [selectedCampaign, updateForm]);

  // Watch form values needed for derived UI
  const watchedStationId = useWatch({ control: form.control, name: 'reliefStationId' });
  const watchedAddressDetail = useWatch({ control: form.control, name: 'addressDetail' });
  const watchedLatitude = useWatch({ control: form.control, name: 'latitude' });
  const watchedLongitude = useWatch({ control: form.control, name: 'longitude' });
  const watchedType = useWatch({ control: form.control, name: 'type' });
  const watchedEditAddressDetail = useWatch({ control: updateForm.control, name: 'addressDetail' });
  const watchedEditLatitude = useWatch({ control: updateForm.control, name: 'latitude' });
  const watchedEditLongitude = useWatch({ control: updateForm.control, name: 'longitude' });

  // For Fundraising: only Money(1) and People(3) are allowed; Supplies(2) blocked
  const isFundraising = Number(watchedType) === CampaignType.Fundraising;
  const allowedResourceTypes = Object.entries(CampaignResourceTypeLabel).filter(
    ([key]) => !isFundraising || Number(key) !== CampaignResourceType.Supplies,
  );

  // Derive the province from the selected station
  const selectedStation = stations.find((s) => getStationId(s) === watchedStationId);
  const derivedLocationId = selectedStation?.locationId ?? '';
  const derivedProvinceName = provinces?.find((p) => p.id === derivedLocationId)?.fullName;

  // Keep locationId in sync whenever selected station changes
  // (we use setValue directly in the station onChange handler below)

  /** Close modal WITHOUT deleting draft (user may reopen) */
  const closeModalKeepDraft = () => {
    setOpenCreateModal(false);
    setOpenStartCalendar(false);
    setOpenEndCalendar(false);
  };

  /** Close modal AND delete draft + reset form */
  const closeAndDiscardDraft = () => {
    localStorage.removeItem(CAMPAIGN_DRAFT_KEY);
    setOpenCreateModal(false);
    setOpenStartCalendar(false);
    setOpenEndCalendar(false);
    form.reset();
  };

  const handleCreateCampaign = async (values: CreateCampaignFormValues) => {
    try {
      const payload: CreateCampaignPayload = {
        ...values,
        locationId: derivedLocationId || values.locationId,
        latitude: Number(values.latitude),
        longitude: Number(values.longitude),
        areaRadiusKm: Number(values.areaRadiusKm),
        availablePeopleCount: Number(values.availablePeopleCount),
        goals: values.goals.map((g) => ({
          resourceType: Number(g.resourceType),
          targetAmount: Number(g.targetAmount),
          isRequired: Boolean(g.isRequired),
        })),
      };
      await createCampaign(payload);
      localStorage.removeItem(CAMPAIGN_DRAFT_KEY);
      setOpenCreateModal(false);
      setOpenStartCalendar(false);
      setOpenEndCalendar(false);
      form.reset();
    } catch {
      // error is handled by the hook
    }
  };

  const handleCreateStation = async (data: CreateStationFormData) => {
    try {
      const newStation = await createStation(data);
      await queryClient.refetchQueries({ queryKey: RELIEF_STATION_KEYS.all });
      const newId = getStationId(newStation?.data ?? {});
      if (newId) {
        form.setValue('reliefStationId', newId);
        // Province will auto-derive from the station once stations list refreshes
      } else {
        toast.warning('Trạm đã tạo nhưng chưa lấy được mã trạm. Hãy chọn lại trong danh sách.');
      }
      setOpenAddStationModal(false);
    } catch (error) {
      console.error(error);
    }
  };

  const handleUpdateStatus = async (campaignId: string, newStatus: number) => {
    try {
      await updateStatus({ id: campaignId, data: { status: newStatus } });
    } catch {
      toast.error('Không thể cập nhật trạng thái chiến dịch');
    }
  };

  const openCampaignDetails = (campaignId: string) => {
    setSelectedCampaignId(campaignId);
    setOpenDetailModal(true);
  };

  const handleUpdateCampaign = async (values: UpdateCampaignFormValues) => {
    if (!selectedCampaignId) {
      toast.error('Không tìm thấy mã chiến dịch để cập nhật');
      return;
    }

    try {
      const payload: UpdateCampaignPayload = {
        ...values,
        latitude: Number(values.latitude),
        longitude: Number(values.longitude),
        areaRadiusKm: Number(values.areaRadiusKm),
        allowOverTarget: Boolean(values.allowOverTarget),
        completionRule: Number(values.completionRule),
      };

      await updateCampaign({ id: selectedCampaignId, data: payload });
      await refetchCampaignDetail();
    } catch {
      // handled by hook
    }
  };

  const handleAssignSelectedStation = async (reliefStationId: string) => {
    if (!selectedCampaignId) {
      toast.error('Không tìm thấy mã chiến dịch để gán trạm');
      return;
    }

    const station = stations.find((item) => getStationId(item) === reliefStationId);
    if (!station) {
      toast.error('Không tìm thấy trạm đã chọn');
      return;
    }

    setStationToAttach({
      campaignId: selectedCampaignId,
      reliefStationId,
      stationName: station.name,
    });
  };

  const handleConfirmAttachStation = async () => {
    if (!stationToAttach) return;

    try {
      await assignStation({
        id: stationToAttach.campaignId,
        data: { reliefStationId: stationToAttach.reliefStationId },
      });
      setStationToAttach(null);
      await refetchCampaignDetail();
    } catch {
      // handled by hook
    }
  };

  const handleConfirmDetachStation = async () => {
    if (!stationToDetach) return;

    try {
      await removeStation({
        id: stationToDetach.campaignId,
        reliefStationId: stationToDetach.reliefStationId,
      });
      setStationToDetach(null);
      await refetchCampaignDetail();
    } catch {
      // handled by hook
    }
  };

  const handleUpdateTeamStatus = (
    campaignId: string,
    teamId: string,
    teamName: string,
    currentStatus: number,
  ) => {
    let newStatus: number;

    switch (currentStatus) {
      case 0:
        newStatus = CampaignTeamStatus.Accepted;
        break;
      case 1:
        newStatus = CampaignTeamStatus.Active;
        break;
      default:
        return;
    }

    setTeamToUpdateStatus({
      campaignId,
      teamId,
      teamName,
      newStatus,
    });
  };

  const handleConfirmUpdateTeamStatus = async () => {
    if (!teamToUpdateStatus) return;

    try {
      await updateTeamStatus({
        id: teamToUpdateStatus.campaignId,
        teamId: teamToUpdateStatus.teamId,
        data: { status: teamToUpdateStatus.newStatus },
      });
      setTeamToUpdateStatus(null);
      await refetchCampaignDetail();
    } catch {
      // handled by hook
    }
  };

  const getTeamStatusBadgeVariant = (
    status: number,
  ): 'success' | 'outline' | 'destructive' | 'warning' | 'info' => {
    switch (status) {
      case CampaignTeamStatus.Active:
        return 'success';
      case CampaignTeamStatus.Accepted:
        return 'outline';
      case CampaignTeamStatus.Completed:
        return 'success';
      case CampaignTeamStatus.Cancelled:
      case CampaignTeamStatus.Withdrawn:
        return 'destructive';
      case CampaignTeamStatus.Invited:
      default:
        return 'warning';
    }
  };

  const isCampaignReadyForActivation = () => {
    const hasAcceptedOrActiveTeams = selectedCampaignTeams.some(
      (team) =>
        team.status === CampaignTeamStatus.Accepted || team.status === CampaignTeamStatus.Active,
    );
    return hasAcceptedOrActiveTeams;
  };

  const getNextTeamStatusAction = (status: number) => {
    switch (status) {
      case CampaignTeamStatus.Invited:
        return {
          label: 'Chấp nhận',
          nextStatus: CampaignTeamStatus.Accepted,
          variant: 'success' as const,
        };
      case CampaignTeamStatus.Accepted:
        return {
          label: 'Kích hoạt',
          nextStatus: CampaignTeamStatus.Active,
          variant: 'primary' as const,
        };
      default:
        return null;
    }
  };

  const openCampaignAllocations = (campaignId: string, campaignName: string) => {
    setSelectedCampaignForAllocations({ id: campaignId, name: campaignName });
    setOpenAllocationModal(true);
  };

  const activeStationIds = new Set(
    (selectedCampaign?.stations || [])
      .filter((station) => station.isActive)
      .map((station) => station.reliefStationId),
  );

  const assignedStationIds = new Set(
    (selectedCampaign?.stations || []).map((station) => station.reliefStationId),
  );

  const selectedCampaignLocationId = selectedCampaign?.locationId || '';
  const selectedCampaignLocationName =
    provinces?.find((province) => province.id === selectedCampaignLocationId)?.fullName || '';

  const availableStationsForAssignment = stations.filter((station) => {
    const stationId = getStationId(station);
    if (!stationId) return false;
    if (assignedStationIds.has(stationId)) return false;

    const stationLocationName =
      provinces?.find((province) => province.id === station.locationId)?.fullName || '';

    if (selectedCampaignLocationName && stationLocationName) {
      if (
        normalizeLocationText(stationLocationName) !==
        normalizeLocationText(selectedCampaignLocationName)
      ) {
        return false;
      }
    } else if (selectedCampaignLocationId && station.locationId !== selectedCampaignLocationId) {
      return false;
    }

    return !activeStationIds.has(stationId);
  });

  const activeStations = (selectedCampaign?.stations || []).filter((station) => station.isActive);
  const inactiveStations = (selectedCampaign?.stations || []).filter(
    (station) => !station.isActive,
  );

  const campaignDetailMap = campaigns.reduce<Record<string, Campaign | undefined>>(
    (acc, campaign, index) => {
      acc[campaign.campaignId] = campaignDetailQueries[index]?.data as Campaign | undefined;
      return acc;
    },
    {},
  );

  const getCampaignAreaLabel = (campaign: CampaignSummary) => {
    const detail = campaignDetailMap[campaign.campaignId];
    const activeStation = detail?.stations?.find((station) => station.isActive);
    if (activeStation?.reliefStationName) return activeStation.reliefStationName;

    const matchedProvince = provinces?.find((province) => province.id === detail?.locationId);
    if (matchedProvince?.fullName) return matchedProvince.fullName;

    if (detail?.addressDetail) return detail.addressDetail;

    return typeof campaign.overallProgressPercent === 'number'
      ? `${Math.round(campaign.overallProgressPercent)}% tiến độ`
      : '—';
  };

  const allocationSummary = allocationsByCampaign.reduce(
    (acc, allocation) => {
      acc.totalAllocations += 1;
      acc.totalItems += allocation.items?.length || 0;
      acc.totalQuantity += (allocation.items || []).reduce(
        (sum, item) => sum + (item.quantity || 0),
        0,
      );
      return acc;
    },
    { totalAllocations: 0, totalItems: 0, totalQuantity: 0 },
  );

  const handleUpdateAllocationStatus = async () => {
    if (!allocationUpdateState) return;

    try {
      await updateAllocationStatus({
        id: allocationUpdateState.allocationId,
        data: { status: allocationUpdateState.nextStatus },
      });
      setAllocationUpdateState(null);
    } catch {
      // handled by hook
    }
  };

  return (
    <DashboardLayout navGroups={managerNavGroups}>
      <div className="flex flex-col gap-6 w-full max-w-full relative">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-primary">Quản lý Chiến dịch</h1>
            <p className="text-muted-foreground dark:text-muted-foreground">
              Tạo và quản lý các chiến dịch cứu trợ, phân bổ nguồn lực cho từng chiến dịch.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              size="lg"
              className="bg-primary text-white gap-2 font-bold rounded-full"
              onClick={() => setOpenCreateModal(true)}
            >
              <span className="material-symbols-outlined text-lg">add</span>
              Tạo chiến dịch
            </Button>
          </div>
        </div>

        <Card className="bg-surface-dark dark:bg-surface-light border-border">
          <div className="flex flex-col sm:flex-row items-center justify-between p-4 gap-4 border-b border-border">
            <div className="relative w-full sm:w-96">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-muted-foreground">
                search
              </span>
              <Input
                className="pl-10 w-full"
                placeholder="Tìm kiếm chiến dịch..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPageIndex(1);
                }}
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button
                variant={statusFilter === undefined ? 'primary' : 'outline'}
                size="sm"
                onClick={() => {
                  setStatusFilter(undefined);
                  setPageIndex(1);
                }}
              >
                Tất cả
              </Button>
              {Object.entries(CampaignStatusLabel).map(([key, label]) => (
                <Button
                  key={key}
                  variant={statusFilter === Number(key) ? 'primary' : 'outline'}
                  size="sm"
                  onClick={() => {
                    setStatusFilter(Number(key));
                    setPageIndex(1);
                  }}
                >
                  {label}
                </Button>
              ))}
            </div>
          </div>

          <CardHeader>
            <CardTitle>Danh sách chiến dịch</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              {isLoading ? (
                <div className="flex items-center justify-center py-16">
                  <div className="flex flex-col items-center gap-3">
                    <span className="material-symbols-outlined text-4xl text-primary animate-spin">
                      progress_activity
                    </span>
                    <p className="text-muted-foreground text-sm">
                      Đang tải danh sách chiến dịch...
                    </p>
                  </div>
                </div>
              ) : campaigns.length === 0 ? (
                <div className="flex items-center justify-center py-16">
                  <div className="flex flex-col items-center gap-3">
                    <span className="material-symbols-outlined text-4xl text-muted-foreground">
                      campaign
                    </span>
                    <p className="text-muted-foreground text-sm">Chưa có chiến dịch nào</p>
                  </div>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tên chiến dịch</TableHead>
                      <TableHead>Loại</TableHead>
                      <TableHead>Thời gian</TableHead>
                      <TableHead>Khu vực</TableHead>
                      <TableHead>Trạng thái</TableHead>
                      <TableHead className="text-right">Thao tác</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {campaigns.map((c) => {
                      const campaignId = getCampaignId(c);
                      const statusLabel = getCampaignStatusLabel(c.status);
                      const statusClass = getCampaignStatusClass(c.status);
                      const statusVariant = getCampaignStatusBadgeVariant(c.status);
                      const typeClass = getCampaignTypeBadgeClass(c.type);
                      const typeIcon = CAMPAIGN_TYPE_BADGE_ICON[c.type] ?? 'category';
                      const statusIcon = CAMPAIGN_STATUS_BADGE_ICON[c.status] ?? 'help';
                      return (
                        <TableRow
                          key={campaignId ?? `${c.name}-${c.startDate ?? 'unknown'}`}
                          className="group hover:bg-card/50 transition-colors"
                        >
                          <TableCell>
                            <p className="font-bold text-foreground text-sm">{c.name}</p>
                            <p className="text-[10px] text-muted-foreground uppercase">
                              ID: {campaignId ? campaignId.slice(0, 8) : '—'}
                            </p>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              appearance="outline"
                              size="sm"
                              className={`gap-1.5 rounded-full px-2.5 py-1 ${typeClass}`}
                            >
                              <span className="material-symbols-outlined text-xs">{typeIcon}</span>
                              {getCampaignTypeLabel(c.type)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="text-xs text-muted-foreground space-y-0.5">
                              <p>Từ: {getCampaignDateText(c.startDate)}</p>
                              <p>Đến: {getCampaignDateText(c.endDate)}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="text-foreground text-sm truncate max-w-[150px] inline-block">
                              {getCampaignAreaLabel(c)}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={statusVariant}
                              appearance="outline"
                              size="sm"
                              className={`gap-1.5 rounded-full px-2.5 py-1 border ${statusClass}`}
                            >
                              <span className="material-symbols-outlined text-xs">
                                {statusIcon}
                              </span>
                              {statusLabel}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <span className="material-symbols-outlined">more_vert</span>
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                {c.status === 0 && (
                                  <DropdownMenuItem
                                    className="gap-2 text-green-700"
                                    onClick={() =>
                                      campaignId
                                        ? handleUpdateStatus(campaignId, 1)
                                        : toast.error('Không tìm thấy mã chiến dịch để kích hoạt')
                                    }
                                  >
                                    <span className="material-symbols-outlined text-lg">
                                      play_arrow
                                    </span>
                                    Kích hoạt chiến dịch
                                  </DropdownMenuItem>
                                )}
                                {c.status === 1 && (
                                  <DropdownMenuItem
                                    className="gap-2 text-orange-600"
                                    onClick={() =>
                                      campaignId
                                        ? handleUpdateStatus(campaignId, 2)
                                        : toast.error('Không tìm thấy mã chiến dịch để tạm dừng')
                                    }
                                  >
                                    <span className="material-symbols-outlined text-lg">pause</span>
                                    Tạm dừng
                                  </DropdownMenuItem>
                                )}
                                {c.status === 2 && (
                                  <DropdownMenuItem
                                    className="gap-2 text-primary"
                                    onClick={() =>
                                      campaignId
                                        ? handleUpdateStatus(campaignId, 1)
                                        : toast.error('Không tìm thấy mã chiến dịch để tiếp tục')
                                    }
                                  >
                                    <span className="material-symbols-outlined text-lg">
                                      play_arrow
                                    </span>
                                    Tiếp tục
                                  </DropdownMenuItem>
                                )}
                                {(c.status === 1 || c.status === 2) && (
                                  <DropdownMenuItem
                                    className="gap-2 text-destructive"
                                    onClick={() =>
                                      campaignId
                                        ? handleUpdateStatus(campaignId, 3)
                                        : toast.error('Không tìm thấy mã chiến dịch để kết thúc')
                                    }
                                  >
                                    <span className="material-symbols-outlined text-lg">stop</span>
                                    Kết thúc chiến dịch
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem
                                  className="gap-2 text-primary/80"
                                  onClick={() =>
                                    campaignId
                                      ? openCampaignDetails(campaignId)
                                      : toast.error('Không tìm thấy mã chiến dịch để xem chi tiết')
                                  }
                                >
                                  <span className="material-symbols-outlined text-lg">
                                    edit_square
                                  </span>
                                  Xem / chỉnh sửa
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="gap-2 text-primary"
                                  onClick={() =>
                                    campaignId
                                      ? openCampaignAllocations(campaignId, c.name)
                                      : toast.error('Không tìm thấy mã chiến dịch để xem điều phối')
                                  }
                                >
                                  <span className="material-symbols-outlined text-lg">
                                    inventory_2
                                  </span>
                                  Xem hàng đã điều phối
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </div>

            {/* Pagination */}
            {pagination && pagination.totalCount > 0 && pagination.totalCount > pageSize && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-border mt-auto">
                <p className="text-sm text-muted-foreground">
                  Trang {pagination.currentPage} — Tổng {pagination.totalCount} chiến dịch
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!pagination.hasPrevious}
                    onClick={() => setPageIndex((prev) => Math.max(1, prev - 1))}
                    className="gap-1"
                  >
                    <span className="material-symbols-outlined text-sm">chevron_left</span>
                    Trước
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!pagination.hasNext}
                    onClick={() => setPageIndex((prev) => prev + 1)}
                    className="gap-1"
                  >
                    Sau
                    <span className="material-symbols-outlined text-sm">chevron_right</span>
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* === Create Campaign Modal === */}
      <Dialog
        open={openCreateModal}
        onOpenChange={(val) => {
          if (!val) closeModalKeepDraft();
        }}
      >
        <DialogContent className="w-[98vw] max-w-[1200px] sm:max-w-[1200px] max-h-[92vh] overflow-hidden p-0 flex flex-col">
          <DialogHeader className="px-6 pt-6 pb-0">
            <div className="flex items-start justify-between gap-3">
              <div>
                <DialogTitle>Tạo chiến dịch cứu trợ mới</DialogTitle>
                <DialogDescription>
                  Điền các thông tin cần thiết để khởi tạo chiến dịch mới.
                </DialogDescription>
              </div>
              {typeof window !== 'undefined' && localStorage.getItem(CAMPAIGN_DRAFT_KEY) && (
                <div className="flex items-center gap-2 shrink-0 mt-0.5">
                  <span className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                    <span className="material-symbols-outlined text-[13px]">save</span>
                    Bản nháp đã lưu
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive"
                    onClick={closeAndDiscardDraft}
                  >
                    <span className="material-symbols-outlined text-sm">delete</span>
                    Xóa nháp
                  </Button>
                </div>
              )}
            </div>
          </DialogHeader>

          <Form {...form}>
            <form
              id="create-campaign-form"
              onSubmit={form.handleSubmit(handleCreateCampaign)}
              className="overflow-y-auto flex-1 px-6 pb-6"
            >
              {/* Two-column layout: left = form fields, right = map */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-4">
                {/* ── LEFT COLUMN ── */}
                <div className="space-y-4">
                  {/* Tên chiến dịch */}
                  <FormField
                    control={form.control}
                    name="name"
                    rules={{ required: 'Vui lòng nhập tên chiến dịch' }}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          Tên chiến dịch <span className="text-destructive">*</span>
                        </FormLabel>
                        <FormControl>
                          <Input placeholder="Vd: Cứu trợ lũ lụt miền Trung 2025..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Mô tả */}
                  <FormField
                    control={form.control}
                    name="description"
                    rules={{
                      required: 'Vui lòng nhập mô tả',
                      minLength: { value: 10, message: 'Mô tả ít nhất 10 ký tự' },
                    }}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          Mô tả <span className="text-destructive">*</span>
                        </FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Mô tả chi tiết về chiến dịch..."
                            className="resize-none"
                            rows={3}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Loại chiến dịch */}
                  <FormField
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Loại chiến dịch</FormLabel>
                        <Select
                          onValueChange={(val) => field.onChange(Number(val))}
                          value={String(field.value)}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Chọn loại" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {Object.entries(CampaignTypeLabel).map(([key, label]) => (
                              <SelectItem key={key} value={key}>
                                {label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Trạm cứu trợ + province derived */}
                  <FormField
                    control={form.control}
                    name="reliefStationId"
                    rules={{ required: 'Vui lòng chọn Trạm cứu trợ' }}
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>
                          Trạm cứu trợ phụ trách <span className="text-destructive">*</span>
                        </FormLabel>
                        {isLoadingStations ? (
                          <div className="h-10 border rounded px-3 py-2 text-sm text-muted-foreground bg-muted/50">
                            Đang tải danh sách trạm...
                          </div>
                        ) : stations.length === 0 ? (
                          <div className="flex flex-col gap-2">
                            <div className="h-10 border rounded px-3 py-2 text-sm text-muted-foreground bg-muted/50">
                              Chưa có trạm cứu trợ nào
                            </div>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="w-fit"
                              onClick={() => setOpenAddStationModal(true)}
                            >
                              <span className="material-symbols-outlined text-sm mr-1">add</span>
                              Tạo trạm cứu trợ mới
                            </Button>
                          </div>
                        ) : (
                          <div className="flex gap-2">
                            <div className="flex-1">
                              <Select
                                onValueChange={(val) => {
                                  field.onChange(val);
                                  // Sync locationId from the chosen station
                                  const chosen = stations.find((s) => getStationId(s) === val);
                                  if (chosen?.locationId) {
                                    form.setValue('locationId', chosen.locationId);
                                  } else {
                                    form.setValue('locationId', '');
                                  }
                                }}
                                value={field.value}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Chọn trạm cứu trợ" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {stations.map((s) => {
                                    const sid = getStationId(s);
                                    if (!sid) return null;
                                    return (
                                      <SelectItem key={sid} value={sid}>
                                        {s.name}
                                      </SelectItem>
                                    );
                                  })}
                                </SelectContent>
                              </Select>
                            </div>
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              title="Tạo trạm cứu trợ mới"
                              onClick={() => setOpenAddStationModal(true)}
                            >
                              <span className="material-symbols-outlined text-sm">add</span>
                            </Button>
                          </div>
                        )}
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Tỉnh/Thành phố — derived from station, read-only */}
                  <div className="flex flex-col gap-1.5">
                    <FormLabel>Tỉnh / Thành phố</FormLabel>
                    <div className="h-10 border rounded px-3 py-2 text-sm bg-muted/40 text-muted-foreground flex items-center">
                      {watchedStationId ? (
                        derivedProvinceName ? (
                          <span className="text-foreground font-medium">{derivedProvinceName}</span>
                        ) : (
                          <span className="italic">Trạm chưa có thông tin tỉnh/thành</span>
                        )
                      ) : (
                        <span className="italic">Chọn trạm để tự động điền tỉnh/thành</span>
                      )}
                    </div>
                  </div>

                  {/* Ngày bắt đầu & kết thúc */}
                  <div className="grid grid-cols-2 gap-4">
                    {/* Start Date */}
                    <FormField
                      control={form.control}
                      name="startDate"
                      rules={{ required: 'Vui lòng chọn ngày bắt đầu' }}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            Ngày bắt đầu <span className="text-destructive">*</span>
                          </FormLabel>

                          <div className="relative">
                            {/* Button */}
                            <Button
                              type="button"
                              variant="outline"
                              className="w-full justify-start gap-2 font-normal"
                              onClick={() => {
                                setOpenStartCalendar((prev) => !prev);
                                setOpenEndCalendar(false);
                              }}
                            >
                              <span className="material-symbols-outlined text-[16px]">
                                calendar_month
                              </span>
                              {field.value ? (
                                formatDateVN(field.value)
                              ) : (
                                <span className="text-muted-foreground text-xs">Chọn ngày</span>
                              )}
                            </Button>

                            {/* Calendar (absolute → không đẩy layout) */}
                            {openStartCalendar && (
                              <div className="absolute z-50 mt-2 rounded-xl border border-border bg-white shadow-lg p-3 w-fit">
                                <CustomCalendar
                                  disabledDays={{ before: new Date() }}
                                  value={parseIsoToDate(field.value)}
                                  onChange={(date) => {
                                    if (!date) {
                                      field.onChange('');
                                      setOpenStartCalendar(false);
                                      return;
                                    }

                                    const current = parseIsoToDate(field.value) ?? new Date();
                                    date.setHours(current.getHours(), current.getMinutes(), 0, 0);
                                    field.onChange(date.toISOString());
                                    setOpenStartCalendar(false);
                                  }}
                                />

                                <div className="mt-2 flex justify-end gap-2">
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      field.onChange('');
                                      setOpenStartCalendar(false);
                                    }}
                                  >
                                    Xóa
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setOpenStartCalendar(false)}
                                  >
                                    Đóng
                                  </Button>
                                </div>
                              </div>
                            )}

                            <Input
                              className="mt-3"
                              type="time"
                              value={formatTimeValue(field.value)}
                              onChange={(event) =>
                                field.onChange(
                                  mergeDateAndTimeToIso(field.value, event.target.value),
                                )
                              }
                            />
                          </div>

                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* End Date */}
                    <FormField
                      control={form.control}
                      name="endDate"
                      rules={{ required: 'Vui lòng chọn ngày kết thúc' }}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            Ngày kết thúc <span className="text-destructive">*</span>
                          </FormLabel>

                          <div className="relative">
                            {/* Button */}
                            <Button
                              type="button"
                              variant="outline"
                              className="w-full justify-start gap-2 font-normal"
                              onClick={() => {
                                setOpenEndCalendar((prev) => !prev);
                                setOpenStartCalendar(false);
                              }}
                            >
                              <span className="material-symbols-outlined text-[16px]">
                                calendar_month
                              </span>
                              {field.value ? (
                                formatDateVN(field.value)
                              ) : (
                                <span className="text-muted-foreground text-xs">Chọn ngày</span>
                              )}
                            </Button>

                            {/* Calendar */}
                            {openEndCalendar && (
                              <div className="absolute z-50 mt-2 rounded-xl border border-border bg-white shadow-lg p-3 w-fit">
                                <CustomCalendar
                                  value={parseIsoToDate(field.value)}
                                  onChange={(date) => {
                                    if (!date) {
                                      field.onChange('');
                                      setOpenEndCalendar(false);
                                      return;
                                    }

                                    const current = parseIsoToDate(field.value) ?? new Date();
                                    date.setHours(current.getHours(), current.getMinutes(), 0, 0);
                                    field.onChange(date.toISOString());
                                    setOpenEndCalendar(false);
                                  }}
                                />

                                <div className="mt-2 flex justify-end gap-2">
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      field.onChange('');
                                      setOpenEndCalendar(false);
                                    }}
                                  >
                                    Xóa
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setOpenEndCalendar(false)}
                                  >
                                    Đóng
                                  </Button>
                                </div>
                              </div>
                            )}

                            <Input
                              className="mt-3"
                              type="time"
                              value={formatTimeValue(field.value)}
                              onChange={(event) =>
                                field.onChange(
                                  mergeDateAndTimeToIso(field.value, event.target.value),
                                )
                              }
                            />
                          </div>

                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Số người cần hỗ trợ */}
                  <FormField
                    control={form.control}
                    name="availablePeopleCount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Số người cần hỗ trợ (dự kiến)</FormLabel>
                        <FormControl>
                          <Input type="number" min={0} placeholder="Vd: 500" {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  {/* ── Mục tiêu chiến dịch ── */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <FormLabel>
                        Mục tiêu chiến dịch{' '}
                        {isFundraising && <span className="text-destructive">*</span>}
                      </FormLabel>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="gap-1"
                        onClick={() =>
                          appendGoal({
                            resourceType: isFundraising
                              ? CampaignResourceType.Money
                              : CampaignResourceType.Supplies,
                            targetAmount: 0,
                            isRequired: true,
                          })
                        }
                      >
                        <span className="material-symbols-outlined text-sm">add</span>
                        Thêm mục tiêu
                      </Button>
                    </div>

                    {isFundraising && goalFields.length === 0 && (
                      <p className="text-xs text-destructive">
                        Chiến dịch Gây quỹ phải có ít nhất 1 mục tiêu Tiền hoặc Người tình nguyện.
                      </p>
                    )}

                    {goalFields.length > 0 && (
                      <div className="space-y-3">
                        {goalFields.map((goalField, index) => (
                          <div
                            key={goalField.id}
                            className="rounded-xl border border-border bg-muted/20 p-3 space-y-3"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-sm font-medium text-foreground">
                                Mục tiêu #{index + 1}
                              </span>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-destructive hover:text-destructive"
                                onClick={() => removeGoal(index)}
                              >
                                <span className="material-symbols-outlined text-sm">close</span>
                              </Button>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                              {/* Loại nguồn lực */}
                              <FormField
                                control={form.control}
                                name={`goals.${index}.resourceType`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel className="text-xs">Loại</FormLabel>
                                    <Select
                                      onValueChange={(val) => field.onChange(Number(val))}
                                      value={String(field.value)}
                                    >
                                      <FormControl>
                                        <SelectTrigger className="h-9">
                                          <SelectValue placeholder="Chọn loại" />
                                        </SelectTrigger>
                                      </FormControl>
                                      <SelectContent>
                                        {allowedResourceTypes.map(([key, label]) => (
                                          <SelectItem key={key} value={key}>
                                            {label}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />

                              {/* Mục tiêu số lượng */}
                              <FormField
                                control={form.control}
                                name={`goals.${index}.targetAmount`}
                                rules={{ required: true, min: 1 }}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel className="text-xs">Mục tiêu</FormLabel>
                                    <FormControl>
                                      <Input
                                        type="text"
                                        inputMode="numeric"
                                        placeholder="Vd: 10.000.000"
                                        className="h-9"
                                        value={formatNumberInputVN(field.value)}
                                        onChange={(e) =>
                                          field.onChange(normalizeNumberInput(e.target.value))
                                        }
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </div>

                            {/* Bắt buộc */}
                            <FormField
                              control={form.control}
                              name={`goals.${index}.isRequired`}
                              render={({ field }) => (
                                <FormItem className="flex items-center gap-2">
                                  <FormControl>
                                    <input
                                      type="checkbox"
                                      checked={field.value}
                                      onChange={field.onChange}
                                      className="h-4 w-4 rounded border-border"
                                    />
                                  </FormControl>
                                  <FormLabel className="text-xs cursor-pointer font-normal">
                                    Bắt buộc đạt mục tiêu này
                                  </FormLabel>
                                </FormItem>
                              )}
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* ── RIGHT COLUMN: Map + location ── */}
                <div className="space-y-4">
                  {/* Map-based location picker reusing StationAddressLookup */}
                  <StationAddressLookup
                    label="Địa điểm chiến dịch"
                    required
                    address={watchedAddressDetail || ''}
                    latitude={Number(watchedLatitude || 0)}
                    longitude={Number(watchedLongitude || 0)}
                    onPickAddress={({ address, latitude, longitude }) => {
                      form.setValue('addressDetail', address);
                      form.setValue('latitude', latitude);
                      form.setValue('longitude', longitude);
                    }}
                  />

                  {/* Coordinates summary (read-only) */}
                  {watchedLatitude || watchedLongitude ? (
                    <div className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground space-y-0.5">
                      <p>
                        <span className="font-medium text-foreground">Vĩ độ:</span>{' '}
                        {Number(watchedLatitude).toFixed(6)}
                      </p>
                      <p>
                        <span className="font-medium text-foreground">Kinh độ:</span>{' '}
                        {Number(watchedLongitude).toFixed(6)}
                      </p>
                    </div>
                  ) : null}

                  {/* Bán kính */}
                  <FormField
                    control={form.control}
                    name="areaRadiusKm"
                    rules={{ required: true, min: 1 }}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          Bán kính khu vực (km) <span className="text-destructive">*</span>
                        </FormLabel>
                        <FormControl>
                          <Input type="number" min={1} placeholder="Vd: 10" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Hidden field: addressDetail kept in form state via map, but show validation */}
                  <FormField
                    control={form.control}
                    name="addressDetail"
                    rules={{ required: 'Vui lòng chọn địa điểm trên bản đồ' }}
                    render={() => (
                      <FormItem>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            </form>
          </Form>

          <DialogFooter className="px-6 py-4 border-t border-border shrink-0">
            <Button
              type="button"
              variant="ghost"
              className="text-muted-foreground hover:text-destructive mr-auto"
              onClick={closeAndDiscardDraft}
            >
              <span className="material-symbols-outlined text-sm">delete</span>
              Hủy & xóa nháp
            </Button>
            <Button variant="outline" onClick={closeModalKeepDraft}>
              Đóng (giữ nháp)
            </Button>
            <Button type="submit" form="create-campaign-form" disabled={createStatus === 'pending'}>
              {createStatus === 'pending' ? 'Đang tạo...' : 'Tạo chiến dịch'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Sub-modal: Add Station */}
      <AddStationModal
        open={openAddStationModal}
        onClose={() => setOpenAddStationModal(false)}
        onSubmit={handleCreateStation}
        defaultLocationId={derivedLocationId || form.getValues('locationId')}
      />

      <Sheet open={openAllocationModal} onOpenChange={setOpenAllocationModal}>
        <SheetContent side="right" className="w-full sm:max-w-[1100px] p-0">
          <SheetHeader className="px-6 pt-6 pb-4 border-b border-border">
            <SheetTitle>Hàng hóa đã điều phối cho chiến dịch</SheetTitle>
            <SheetDescription>
              {selectedCampaignForAllocations
                ? `Chiến dịch: ${selectedCampaignForAllocations.name}`
                : 'Xem lịch sử điều phối hàng hóa theo chiến dịch'}
            </SheetDescription>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="border-border bg-card">
                <CardContent className="p-5 bg-sky-500/10 rounded-xl">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm text-muted-foreground">Số đợt điều phối</p>
                      <p className="mt-2 text-3xl font-black text-foreground">
                        {formatNumberVN(allocationSummary.totalAllocations)}
                      </p>
                    </div>
                    <div className="size-11 rounded-2xl bg-sky-500/15 text-sky-600 dark:text-sky-300 flex items-center justify-center">
                      <span className="material-symbols-outlined text-[22px]">local_shipping</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-border bg-card">
                <CardContent className="p-5 bg-emerald-500/10 rounded-xl">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm text-muted-foreground">Tổng dòng vật phẩm</p>
                      <p className="mt-2 text-3xl font-black text-foreground">
                        {formatNumberVN(allocationSummary.totalItems)}
                      </p>
                    </div>
                    <div className="size-11 rounded-2xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 flex items-center justify-center">
                      <span className="material-symbols-outlined text-[22px]">inventory_2</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-border bg-card">
                <CardContent className="p-5 bg-amber-500/10 rounded-xl">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm text-muted-foreground">Tổng số lượng đã cấp</p>
                      <p className="mt-2 text-3xl font-black text-foreground">
                        {formatNumberVN(allocationSummary.totalQuantity)}
                      </p>
                    </div>
                    <div className="size-11 rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-300 flex items-center justify-center">
                      <span className="material-symbols-outlined text-[22px]">deployed_code</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {isLoadingAllocations ? (
              <div className="flex items-center justify-center py-16">
                <div className="flex flex-col items-center gap-3">
                  <span className="material-symbols-outlined text-4xl text-primary animate-spin">
                    progress_activity
                  </span>
                  <p className="text-muted-foreground text-sm">Đang tải lịch sử điều phối...</p>
                </div>
              </div>
            ) : allocationsByCampaign.length === 0 ? (
              <div className="flex items-center justify-center py-16">
                <div className="flex flex-col items-center gap-3">
                  <span className="material-symbols-outlined text-4xl text-muted-foreground">
                    inventory_2
                  </span>
                  <p className="text-muted-foreground text-sm">
                    Chiến dịch này chưa có đợt điều phối nào
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {allocationsByCampaign.map((allocation, index) => (
                  <Card
                    className="relative cursor-pointer"
                    key={allocation.allocationId || `${allocation.campaignId}-${index}`}
                  >
                    <CardHeader className="pb-3">
                      <div>
                        <div className="absolute top-4 right-10 flex items-center gap-2">
                          <Badge
                            variant="outline"
                            appearance="outline"
                            size="sm"
                            className={`border ${getSupplyAllocationStatusClass(allocation.status)}`}
                          >
                            {getSupplyAllocationStatusLabel(allocation.status)}
                          </Badge>
                          {getNextAllocationStatusActions(Number(allocation.status)).length > 0 && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button size="sm" variant="outline" className="gap-1">
                                  <span className="material-symbols-outlined text-[16px]">
                                    edit
                                  </span>
                                  Đổi trạng thái
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                {getNextAllocationStatusActions(Number(allocation.status)).map(
                                  (action) => (
                                    <DropdownMenuItem
                                      key={`${allocation.allocationId}-${action.value}`}
                                      onClick={() =>
                                        setAllocationUpdateState({
                                          allocationId: allocation.allocationId,
                                          nextStatus: action.value,
                                        })
                                      }
                                    >
                                      {action.label}
                                    </DropdownMenuItem>
                                  ),
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </div>
                        <div>
                          <CardTitle className="text-base py-2">
                            Phiếu điều phối #{index + 1}
                          </CardTitle>
                          <p className="text-xs text-muted-foreground mt-1">
                            Mã phiếu: {allocation.allocationId || '—'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Kho nguồn:{' '}
                            {(allocation.sourceInventoryId && allocation?.sourceInventoryName && (
                              <span className="text-xs text-muted-foreground font-normal">
                                {allocation.sourceInventoryName}
                              </span>
                            )) ||
                              '—'}
                          </p>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Vật phẩm</TableHead>
                            <TableHead>Số lượng</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {(allocation.items || []).map((item, itemIndex) => (
                            <TableRow
                              key={`${allocation.allocationId || index}-${item.supplyItemId}-${itemIndex}`}
                            >
                              <TableCell className="font-mono text-xs text-muted-foreground">
                                {item.supplyItemName}
                              </TableCell>
                              <TableCell>
                                {formatNumberVN(item.quantity)}/
                                <span className="text-xs text-muted-foreground font-normal">
                                  {item.supplyItemUnit || ''}
                                </span>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                      <div className="mt-4 rounded-xl border border-dashed border-border bg-muted/20 p-3 text-xs text-muted-foreground">
                        {Number(allocation.status) === SupplyAllocationStatus.Pending &&
                          'Allocation đang chờ manager duyệt để chuyển hàng vào campaign inventory.'}
                        {Number(allocation.status) === SupplyAllocationStatus.Approved &&
                          'Allocation đã duyệt. Hãy kiểm tra campaign inventory balance và có thể đánh dấu đã giao khi hoàn tất.'}
                        {Number(allocation.status) === SupplyAllocationStatus.Delivered &&
                          'Allocation đã hoàn tất giao cho chiến dịch.'}
                        {Number(allocation.status) === SupplyAllocationStatus.Cancelled &&
                          'Allocation đã bị hủy và sẽ không tiếp tục cấp phát cho chiến dịch.'}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          <SheetFooter className="px-6 py-4 border-t border-border bg-background shrink-0">
            <Button variant="destructive" onClick={() => setOpenAllocationModal(false)}>
              <span className="material-symbols-outlined text-lg">close</span>
              Đóng
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <ConfirmDialog
        open={!!allocationUpdateState}
        onOpenChange={(open) => {
          if (!open) setAllocationUpdateState(null);
        }}
        title="Cập nhật trạng thái allocation"
        description="Thay đổi trạng thái allocation sẽ ảnh hưởng trực tiếp đến campaign inventory và flow package assembly."
        confirmText={
          allocationUpdateState
            ? getSupplyAllocationStatusLabel(allocationUpdateState.nextStatus)
            : 'Xác nhận'
        }
        cancelText="Huỷ"
        onConfirm={handleUpdateAllocationStatus}
      />

      <Dialog
        open={openDetailModal}
        onOpenChange={(open) => {
          setOpenDetailModal(open);
          if (!open) {
            setSelectedCampaignId('');
            updateForm.reset(buildUpdateFormDefaults(null));
          }
        }}
      >
        <DialogContent className="w-[98vw] !max-w-[1024px] max-h-[92vh] overflow-hidden p-0 flex flex-col">
          <DialogHeader className="px-6 pt-6 pb-4 border-b border-border">
            <DialogTitle>Chi tiết chiến dịch</DialogTitle>
            <DialogDescription>
              Manager có thể xem thông tin, chỉnh sửa chiến dịch và gán chiến dịch vào trạm.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
            {isLoadingCampaignDetail ? (
              <div className="flex items-center justify-center py-16">
                <div className="flex flex-col items-center gap-3">
                  <span className="material-symbols-outlined text-4xl text-primary animate-spin">
                    progress_activity
                  </span>
                  <p className="text-muted-foreground text-sm">Đang tải chi tiết chiến dịch...</p>
                </div>
              </div>
            ) : !selectedCampaign ? (
              <div className="flex items-center justify-center py-16">
                <div className="flex flex-col items-center gap-3 text-center">
                  <span className="material-symbols-outlined text-4xl text-muted-foreground">
                    campaign
                  </span>
                  <p className="text-muted-foreground text-sm">
                    Không tải được dữ liệu chiến dịch.
                  </p>
                </div>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <Card className="border-border bg-card md:col-span-2">
                    <CardContent className="p-5">
                      <p className="text-sm text-muted-foreground">Tên chiến dịch</p>
                      <p className="mt-2 text-lg font-bold text-foreground">
                        {selectedCampaign.name}
                      </p>
                      <p className="mt-2 text-xs text-muted-foreground">
                        Mã chiến dịch: {getCampaignIdentity(selectedCampaign) || '—'}
                      </p>
                    </CardContent>
                  </Card>
                  <Card className="border-border bg-card">
                    <CardContent className="p-5">
                      <p className="text-sm text-muted-foreground">Loại</p>
                      <p className="mt-2 font-semibold text-foreground">
                        {getCampaignTypeLabel(selectedCampaign.type)}
                      </p>
                    </CardContent>
                  </Card>
                  <Card className="border-border bg-card">
                    <CardContent className="p-5">
                      <p className="text-sm text-muted-foreground">Trạng thái</p>
                      <Badge
                        className={`mt-2 border ${getCampaignStatusClass(selectedCampaign.status)}`}
                      >
                        {getCampaignStatusLabel(selectedCampaign.status)}
                      </Badge>
                    </CardContent>
                  </Card>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-[1.35fr_1fr] gap-6">
                  <Card className="border-border bg-card">
                    <CardHeader>
                      <CardTitle>Cập nhật thông tin chiến dịch</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Form {...updateForm}>
                        <form
                          className="space-y-4"
                          onSubmit={updateForm.handleSubmit(handleUpdateCampaign)}
                        >
                          <FormField
                            control={updateForm.control}
                            name="name"
                            rules={{ required: 'Vui lòng nhập tên chiến dịch' }}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Tên chiến dịch</FormLabel>
                                <FormControl>
                                  <Input {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={updateForm.control}
                            name="description"
                            rules={{ required: 'Vui lòng nhập mô tả' }}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Mô tả</FormLabel>
                                <FormControl>
                                  <Textarea rows={3} className="resize-none" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField
                              control={updateForm.control}
                              name="startDate"
                              rules={{ required: 'Vui lòng chọn ngày bắt đầu' }}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Ngày bắt đầu</FormLabel>
                                  <div className="relative space-y-3">
                                    <Button
                                      type="button"
                                      variant="outline"
                                      className="w-full justify-start gap-2 font-normal"
                                      onClick={() => {
                                        setOpenEditStartCalendar((prev) => !prev);
                                        setOpenEditEndCalendar(false);
                                      }}
                                    >
                                      <span className="material-symbols-outlined text-[16px]">
                                        calendar_month
                                      </span>
                                      {field.value ? formatDateVN(field.value) : 'Chọn ngày'}
                                    </Button>
                                    {openEditStartCalendar && (
                                      <div className="absolute left-0 z-50 mt-2 rounded-xl border border-border bg-background p-3 shadow-lg">
                                        <CustomCalendar
                                          value={parseIsoToDate(field.value)}
                                          onChange={(date) => {
                                            if (!date) {
                                              field.onChange('');
                                              setOpenEditStartCalendar(false);
                                              return;
                                            }
                                            const current =
                                              parseIsoToDate(field.value) ?? new Date();
                                            date.setHours(
                                              current.getHours(),
                                              current.getMinutes(),
                                              0,
                                              0,
                                            );
                                            field.onChange(date.toISOString());
                                            setOpenEditStartCalendar(false);
                                          }}
                                        />
                                        <div className="mt-2 flex justify-end">
                                          <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => setOpenEditStartCalendar(false)}
                                          >
                                            Thu gọn
                                          </Button>
                                        </div>
                                      </div>
                                    )}
                                    <FormControl>
                                      <Input
                                        type="time"
                                        value={formatTimeValue(field.value)}
                                        onChange={(event) =>
                                          field.onChange(
                                            mergeDateAndTimeToIso(field.value, event.target.value),
                                          )
                                        }
                                      />
                                    </FormControl>
                                  </div>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={updateForm.control}
                              name="endDate"
                              rules={{ required: 'Vui lòng chọn ngày kết thúc' }}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Ngày kết thúc</FormLabel>
                                  <div className="relative space-y-3">
                                    <Button
                                      type="button"
                                      variant="outline"
                                      className="w-full justify-start gap-2 font-normal"
                                      onClick={() => {
                                        setOpenEditEndCalendar((prev) => !prev);
                                        setOpenEditStartCalendar(false);
                                      }}
                                    >
                                      <span className="material-symbols-outlined text-[16px]">
                                        calendar_month
                                      </span>
                                      {field.value ? formatDateVN(field.value) : 'Chọn ngày'}
                                    </Button>
                                    {openEditEndCalendar && (
                                      <div className="absolute left-0 z-50 mt-2 rounded-xl border border-border bg-background p-3 shadow-lg">
                                        <CustomCalendar
                                          value={parseIsoToDate(field.value)}
                                          onChange={(date) => {
                                            if (!date) {
                                              field.onChange('');
                                              setOpenEditEndCalendar(false);
                                              return;
                                            }
                                            const current =
                                              parseIsoToDate(field.value) ?? new Date();
                                            date.setHours(
                                              current.getHours(),
                                              current.getMinutes(),
                                              0,
                                              0,
                                            );
                                            field.onChange(date.toISOString());
                                            setOpenEditEndCalendar(false);
                                          }}
                                        />
                                        <div className="mt-2 flex justify-end">
                                          <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => setOpenEditEndCalendar(false)}
                                          >
                                            Thu gọn
                                          </Button>
                                        </div>
                                      </div>
                                    )}
                                    <FormControl>
                                      <Input
                                        type="time"
                                        value={formatTimeValue(field.value)}
                                        onChange={(event) =>
                                          field.onChange(
                                            mergeDateAndTimeToIso(field.value, event.target.value),
                                          )
                                        }
                                      />
                                    </FormControl>
                                  </div>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField
                              control={updateForm.control}
                              name="completionRule"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Quy tắc hoàn thành</FormLabel>
                                  <Select
                                    value={String(field.value)}
                                    onValueChange={(value) => field.onChange(Number(value))}
                                  >
                                    <FormControl>
                                      <SelectTrigger>
                                        <SelectValue placeholder="Chọn quy tắc" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      {Object.entries(CampaignCompletionRuleLabel).map(
                                        ([key, label]) => (
                                          <SelectItem key={key} value={key}>
                                            {label}
                                          </SelectItem>
                                        ),
                                      )}
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={updateForm.control}
                              name="areaRadiusKm"
                              rules={{ required: 'Vui lòng nhập bán kính', min: 1 }}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Bán kính khu vực (km)</FormLabel>
                                  <FormControl>
                                    <Input type="number" min={1} {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField
                              control={updateForm.control}
                              name="latitude"
                              rules={{ required: 'Vui lòng nhập vĩ độ' }}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Vĩ độ</FormLabel>
                                  <FormControl>
                                    <Input type="number" step="0.000001" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={updateForm.control}
                              name="longitude"
                              rules={{ required: 'Vui lòng nhập kinh độ' }}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Kinh độ</FormLabel>
                                  <FormControl>
                                    <Input type="number" step="0.000001" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>

                          <FormField
                            control={updateForm.control}
                            name="addressDetail"
                            rules={{ required: 'Vui lòng chọn địa điểm chiến dịch' }}
                            render={() => (
                              <FormItem>
                                <StationAddressLookup
                                  label="Địa điểm chiến dịch"
                                  address={watchedEditAddressDetail || ''}
                                  latitude={Number(watchedEditLatitude || 0)}
                                  longitude={Number(watchedEditLongitude || 0)}
                                  onPickAddress={({ address, latitude, longitude }) => {
                                    updateForm.setValue('addressDetail', address);
                                    updateForm.setValue('latitude', latitude);
                                    updateForm.setValue('longitude', longitude);
                                  }}
                                />
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={updateForm.control}
                            name="allowOverTarget"
                            render={({ field }) => (
                              <FormItem className="flex items-center gap-2 rounded-lg border border-border px-3 py-3">
                                <FormControl>
                                  <input
                                    type="checkbox"
                                    checked={field.value}
                                    onChange={(event) => field.onChange(event.target.checked)}
                                    className="h-4 w-4 rounded border-border"
                                  />
                                </FormControl>
                                <FormLabel className="cursor-pointer font-normal m-0">
                                  Cho phép vượt mục tiêu chiến dịch
                                </FormLabel>
                              </FormItem>
                            )}
                          />

                          <div className="flex justify-end">
                            <Button type="submit" disabled={updateCampaignStatus === 'pending'}>
                              {updateCampaignStatus === 'pending'
                                ? 'Đang cập nhật...'
                                : 'Lưu thay đổi'}
                            </Button>
                          </div>
                        </form>
                      </Form>
                    </CardContent>
                  </Card>

                  <div className="space-y-6">
                    <Card className="border-border bg-card">
                      <CardHeader>
                        <CardTitle>Trạm được gán</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {(selectedCampaign.stations || []).length === 0 ? (
                          <div className="rounded-lg border border-dashed border-border px-4 py-5 text-sm text-muted-foreground text-center">
                            Chiến dịch chưa được gán vào trạm nào.
                          </div>
                        ) : (
                          <div className="space-y-5">
                            <div className="space-y-3">
                              <div className="flex items-center gap-2">
                                <span className="material-symbols-outlined text-emerald-600 text-base">
                                  check_circle
                                </span>
                                <p className="text-sm font-semibold text-foreground">
                                  Trạm đang hoạt động ({activeStations.length})
                                </p>
                              </div>

                              {activeStations.length === 0 ? (
                                <div className="rounded-lg border border-dashed border-border px-4 py-4 text-sm text-muted-foreground">
                                  Chưa có trạm nào đang hoạt động.
                                </div>
                              ) : (
                                activeStations.map((station) => (
                                  <div
                                    key={station.reliefStationId}
                                    className="rounded-xl border border-emerald-200/70 bg-emerald-50/40 dark:bg-emerald-950/10 dark:border-emerald-900/60 p-4 flex items-start justify-between gap-3"
                                  >
                                    <div>
                                      <p className="font-semibold text-foreground">
                                        {station.reliefStationName}
                                      </p>
                                      <p className="text-xs text-muted-foreground mt-1">
                                        Gán lúc: {getCampaignDateText(station.assignedAt)}
                                      </p>
                                      <Badge variant="success" size="sm" className="mt-2">
                                        Đang hoạt động
                                      </Badge>
                                    </div>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="text-destructive"
                                      onClick={() =>
                                        setStationToDetach({
                                          campaignId: selectedCampaign.campaignId,
                                          reliefStationId: station.reliefStationId,
                                          stationName: station.reliefStationName,
                                        })
                                      }
                                      disabled={removeStationStatus === 'pending'}
                                    >
                                      Gỡ trạm
                                    </Button>
                                  </div>
                                ))
                              )}
                            </div>

                            <div className="space-y-3">
                              <div className="flex items-center gap-2">
                                <span className="material-symbols-outlined text-amber-600 text-base">
                                  pause_circle
                                </span>
                                <p className="text-sm font-semibold text-foreground">
                                  Trạm đã ngưng ({inactiveStations.length})
                                </p>
                              </div>

                              {inactiveStations.length === 0 ? (
                                <div className="rounded-lg border border-dashed border-border px-4 py-4 text-sm text-muted-foreground">
                                  Không có trạm nào đã ngưng.
                                </div>
                              ) : (
                                inactiveStations.map((station) => (
                                  <div
                                    key={station.reliefStationId}
                                    className="rounded-xl border border-amber-200/70 bg-amber-50/40 dark:bg-amber-950/10 dark:border-amber-900/60 p-4 flex items-start justify-between gap-3"
                                  >
                                    <div>
                                      <p className="font-semibold text-foreground">
                                        {station.reliefStationName}
                                      </p>
                                      <p className="text-xs text-muted-foreground mt-1">
                                        Gán lúc: {getCampaignDateText(station.assignedAt)}
                                      </p>
                                      <Badge variant="destructive" size="sm" className="mt-2">
                                        Ngưng hoạt động
                                      </Badge>
                                    </div>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="text-destructive"
                                      onClick={() =>
                                        setStationToDetach({
                                          campaignId: selectedCampaign.campaignId,
                                          reliefStationId: station.reliefStationId,
                                          stationName: station.reliefStationName,
                                        })
                                      }
                                      disabled={removeStationStatus === 'pending'}
                                    >
                                      Gỡ trạm
                                    </Button>
                                  </div>
                                ))
                              )}
                            </div>
                          </div>
                        )}

                        <div className="space-y-2">
                          <p className="text-sm font-medium text-foreground">
                            Gán thêm trạm vào chiến dịch
                          </p>
                          {selectedCampaignLocationId ? (
                            <p className="text-xs text-muted-foreground">
                              {selectedCampaignLocationName
                                ? `Chỉ hiển thị trạm cùng khu vực ${selectedCampaignLocationName}.`
                                : 'Chỉ hiển thị trạm có cùng tỉnh/thành với chiến dịch.'}
                            </p>
                          ) : null}
                          {availableStationsForAssignment.length === 0 ? (
                            <p className="text-sm text-muted-foreground">
                              Không còn trạm nào khả dụng để gán thêm.
                            </p>
                          ) : (
                            <Select onValueChange={handleAssignSelectedStation}>
                              <SelectTrigger>
                                <SelectValue placeholder="Chọn trạm cứu trợ" />
                              </SelectTrigger>
                              <SelectContent>
                                {availableStationsForAssignment.map((station) => {
                                  const stationId = getStationId(station);
                                  if (!stationId) return null;
                                  return (
                                    <SelectItem key={stationId} value={stationId}>
                                      {station.name}
                                    </SelectItem>
                                  );
                                })}
                              </SelectContent>
                            </Select>
                          )}
                          {assignStationStatus === 'pending' && (
                            <p className="text-xs text-muted-foreground">Đang gán trạm...</p>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
                <Card className="border-border bg-card w-full">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-primary">flag</span>
                      Mục tiêu chiến dịch
                    </CardTitle>
                  </CardHeader>

                  <CardContent className="space-y-3">
                    {(selectedCampaign.goals || []).length === 0 ? (
                      <p className="text-sm text-muted-foreground">Chưa có mục tiêu nào.</p>
                    ) : (
                      selectedCampaign.goals.map((goal, index) => {
                        const percent = Math.round(Number(goal.progressPercent || 0));

                        // chọn icon theo trạng thái
                        let icon = 'radio_button_unchecked';
                        let iconColor = 'text-gray-400';

                        if (percent === 100 || goal.isMet) {
                          icon = 'check_circle';
                          iconColor = 'text-green-600';
                        } else if (percent > 0) {
                          icon = 'hourglass_top';
                          iconColor = 'text-amber-500';
                        }

                        return (
                          <div
                            key={goal.campaignResourceGoalId || `${goal.resourceType}-${index}`}
                            className="rounded-xl border border-border p-4"
                          >
                            <div className="flex items-center justify-between gap-3">
                              {/* LEFT */}
                              <div>
                                <p className="font-semibold text-foreground flex items-center gap-2">
                                  {/* ICON */}
                                  <span
                                    className={`material-symbols-outlined text-base ${iconColor}`}
                                  >
                                    {icon}
                                  </span>

                                  {CampaignResourceTypeLabel[goal.resourceType] || 'Nguồn lực'}
                                </p>

                                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                                  <span className="material-symbols-outlined text-[14px]">
                                    inventory_2
                                  </span>
                                  Đã nhận {formatNumberVN(goal.receivedAmount || 0)} / mục tiêu{' '}
                                  {formatNumberVN(goal.targetAmount || 0)}
                                </p>
                              </div>

                              {/* RIGHT */}
                              <Badge variant={goal.isMet ? 'success' : 'destructive'} size="sm">
                                <span className="flex items-center gap-1">
                                  <span className="material-symbols-outlined text-[14px]">
                                    {goal.isRequired ? 'priority_high' : 'low_priority'}
                                  </span>
                                  {goal.isRequired ? 'Bắt buộc' : 'Không bắt buộc'}
                                </span>
                              </Badge>
                            </div>

                            {/* PROGRESS BAR */}
                            <div className="mt-3 h-2 rounded-full bg-muted overflow-hidden">
                              <div
                                className="h-full bg-primary rounded-full"
                                style={{
                                  width: `${Math.max(
                                    0,
                                    Math.min(Number(goal.progressPercent || 0), 100),
                                  )}%`,
                                }}
                              />
                            </div>

                            {/* FOOTER */}
                            <p className="mt-2 text-xs text-muted-foreground flex items-center gap-1">
                              <span className="material-symbols-outlined text-[14px]">
                                monitoring
                              </span>
                              Tiến độ: {percent}%
                            </p>
                          </div>
                        );
                      })
                    )}
                  </CardContent>
                </Card>

                <Card className="border-border bg-card w-full">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-primary">warehouse</span>
                      Cân đối tồn kho chiến dịch
                    </CardTitle>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    {isLoadingCampaignInventoryBalance ? (
                      <p className="text-sm text-muted-foreground">
                        Đang tải dữ liệu cân đối tồn kho chiến dịch...
                      </p>
                    ) : selectedCampaignInventoryBalanceError ? (
                      <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 space-y-2">
                        <div className="flex items-start gap-2">
                          <span className="material-symbols-outlined text-destructive mt-0.5">
                            error
                          </span>
                          <div>
                            <p className="text-sm font-semibold text-foreground">
                              Không tải được dữ liệu cân đối tồn kho chiến dịch
                            </p>
                            <p className="mt-1 text-sm text-muted-foreground">
                              {selectedCampaignInventoryBalanceError.message}
                            </p>
                            <p className="mt-2 text-xs text-muted-foreground">
                              Hệ thống hiện chưa thể tổng hợp số liệu tồn kho cho chiến dịch này. Có
                              thể backend đang thiếu dữ liệu liên kết kho/trạm/chiến dịch hoặc đang
                              phát sinh lỗi xử lý nội bộ.
                            </p>
                          </div>
                        </div>
                      </div>
                    ) : !selectedCampaignInventoryBalance ? (
                      <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-1">
                        <p className="text-sm font-semibold text-foreground">
                          Chưa có dữ liệu cân đối tồn kho
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Chiến dịch này hiện chưa có số liệu tồn kho để tổng hợp. Có thể chưa được
                          gán trạm, chưa có inventory hoạt động hoặc chưa phát sinh dữ liệu vật tư.
                        </p>
                      </div>
                    ) : (
                      <>
                        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                          <div className="rounded-xl border border-border p-4">
                            <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">
                              Ngân sách tổng
                            </p>
                            <p className="mt-2 text-lg font-semibold text-foreground">
                              {formatNumberVN(selectedCampaignInventoryBalance.budgetTotal)}
                            </p>
                          </div>
                          <div className="rounded-xl border border-border p-4">
                            <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">
                              Đã chi
                            </p>
                            <p className="mt-2 text-lg font-semibold text-foreground">
                              {formatNumberVN(selectedCampaignInventoryBalance.budgetSpent)}
                            </p>
                          </div>
                          <div className="rounded-xl border border-border p-4">
                            <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">
                              Còn lại
                            </p>
                            <p className="mt-2 text-lg font-semibold text-foreground">
                              {formatNumberVN(selectedCampaignInventoryBalance.remainingBudget)}
                            </p>
                          </div>
                        </div>

                        {(selectedCampaignInventoryBalance?.stations || []).length === 0 ? (
                          !(selectedCampaignInventoryBalance?.items || []).length ? (
                            <p className="text-sm text-muted-foreground">
                              Chưa có stock trong campaign inventory của chiến dịch này.
                            </p>
                          ) : (
                            <div className="space-y-3">
                              <div className="rounded-xl border border-border p-4">
                                <div className="flex flex-wrap items-center justify-between gap-3">
                                  <div>
                                    <p className="font-semibold text-foreground">
                                      Campaign inventory
                                    </p>
                                    <p className="text-xs text-muted-foreground break-all mt-1">
                                      Inventory ID:{' '}
                                      {selectedCampaignInventoryBalance?.campaignInventoryId || '—'}
                                    </p>
                                  </div>
                                  <Badge
                                    variant={
                                      selectedCampaignInventoryBalance?.campaignInventoryId
                                        ? 'success'
                                        : 'outline'
                                    }
                                    size="sm"
                                  >
                                    {selectedCampaignInventoryBalance?.campaignInventoryId
                                      ? 'Campaign inventory đã khởi tạo'
                                      : 'Chưa có campaign inventory'}
                                  </Badge>
                                </div>

                                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-sm text-muted-foreground">
                                  <span>
                                    Danh mục có hàng:{' '}
                                    <b className="text-foreground">
                                      {formatNumberVN(
                                        selectedCampaignInventoryBalance?.distinctSupplyItemCount ??
                                          0,
                                      )}
                                    </b>
                                  </span>
                                  <span>
                                    Tổng số lượng:{' '}
                                    <b className="text-foreground">
                                      {formatNumberVN(
                                        selectedCampaignInventoryBalance?.totalQuantity ?? 0,
                                      )}
                                    </b>
                                  </span>
                                </div>
                              </div>

                              {(selectedCampaignInventoryBalance?.items || []).map((item) => (
                                <div
                                  key={item.supplyItemId}
                                  className="rounded-xl border border-border p-4"
                                >
                                  <div className="flex flex-wrap items-center justify-between gap-3">
                                    <div>
                                      <p className="font-semibold text-foreground">
                                        {item.supplyItemName}
                                      </p>
                                      <p className="text-xs text-muted-foreground break-all mt-1">
                                        {item.supplyItemId}
                                      </p>
                                    </div>
                                    <Badge variant="outline" size="sm">
                                      {formatNumberVN(item.quantity)} {item.supplyItemUnit}
                                    </Badge>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )
                        ) : (
                          <div className="space-y-3">
                            {(selectedCampaignInventoryBalance?.stations || []).map(
                              (stationBalance) => (
                                <div
                                  key={`${stationBalance.reliefStationId}-${stationBalance.inventoryId}`}
                                  className="rounded-xl border border-border p-4"
                                >
                                  <div className="flex flex-wrap items-center justify-between gap-3">
                                    <div>
                                      <p className="font-semibold text-foreground">
                                        {stationBalance.reliefStationName}
                                      </p>
                                      <p className="text-xs text-muted-foreground break-all mt-1">
                                        Inventory ID: {stationBalance.inventoryId || '—'}
                                      </p>
                                    </div>
                                    <Badge
                                      variant={
                                        stationBalance.hasActiveInventory ? 'success' : 'outline'
                                      }
                                      size="sm"
                                    >
                                      {stationBalance.hasActiveInventory
                                        ? 'Kho đang hoạt động'
                                        : 'Chưa có kho hoạt động'}
                                    </Badge>
                                  </div>

                                  <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-sm text-muted-foreground">
                                    <span>
                                      Danh mục có hàng:{' '}
                                      <b className="text-foreground">
                                        {formatNumberVN(stationBalance.distinctSupplyItemCount)}
                                      </b>
                                    </span>
                                    <span>
                                      Tổng số lượng:{' '}
                                      <b className="text-foreground">
                                        {formatNumberVN(stationBalance.totalQuantity)}
                                      </b>
                                    </span>
                                  </div>
                                </div>
                              ),
                            )}
                          </div>
                        )}
                      </>
                    )}
                  </CardContent>
                </Card>

                <Card className="border-border bg-card w-full">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-primary">groups</span>
                      Đội ngũ trong chiến dịch
                    </CardTitle>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-muted/20 p-4">
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          Điều kiện cập nhật trạng thái chiến dịch
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Relief campaign cần ít nhất 1 team ở trạng thái Đã chấp nhận hoặc Đang
                          hoạt động trước khi chuyển sang sẵn sàng triển khai / hoạt động.
                        </p>
                      </div>
                      <Badge
                        variant={isCampaignReadyForActivation() ? 'success' : 'warning'}
                        size="sm"
                      >
                        {isCampaignReadyForActivation()
                          ? 'Sẵn sàng kích hoạt'
                          : 'Chưa đủ điều kiện'}
                      </Badge>
                    </div>

                    {isLoadingCampaignTeams ? (
                      <p className="text-sm text-muted-foreground">Đang tải danh sách đội...</p>
                    ) : selectedCampaignTeams.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        Chưa có đội nào được gán vào chiến dịch này.
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {selectedCampaignTeams.map((team) => {
                          const nextAction = getNextTeamStatusAction(Number(team.status));
                          return (
                            <div
                              key={team.campaignTeamId || `${team.teamId}-${team.campaignId}`}
                              className="rounded-xl border border-border p-4"
                            >
                              <div className="flex flex-wrap items-start justify-between gap-3">
                                <div>
                                  <p className="font-semibold text-foreground">{team.teamName}</p>
                                  <p className="mt-1 text-xs text-muted-foreground">
                                    {team.memberCount || 0} thành viên • Vai trò:{' '}
                                    {getCampaignTeamRoleLabel(Number(team.role))}
                                  </p>
                                </div>

                                <div className="flex flex-wrap items-center gap-2">
                                  <Badge
                                    variant={getTeamStatusBadgeVariant(Number(team.status))}
                                    size="sm"
                                  >
                                    {team.status === CampaignTeamStatus.Invited
                                      ? 'Đã mời'
                                      : team.status === CampaignTeamStatus.Accepted
                                        ? 'Đã chấp nhận'
                                        : team.status === CampaignTeamStatus.Active
                                          ? 'Đang hoạt động'
                                          : team.status === CampaignTeamStatus.Completed
                                            ? 'Hoàn thành'
                                            : team.status === CampaignTeamStatus.Withdrawn
                                              ? 'Đã rút lui'
                                              : team.status === CampaignTeamStatus.Cancelled
                                                ? 'Đã hủy'
                                                : `Trạng thái ${team.status}`}
                                  </Badge>

                                  {nextAction && (
                                    <Button
                                      size="sm"
                                      variant={nextAction.variant}
                                      onClick={() =>
                                        handleUpdateTeamStatus(
                                          selectedCampaign.campaignId,
                                          team.teamId,
                                          team.teamName,
                                          Number(team.status),
                                        )
                                      }
                                    >
                                      {nextAction.label}
                                    </Button>
                                  )}

                                  {Number(team.status) === CampaignTeamStatus.Invited && (
                                    <Button
                                      size="sm"
                                      variant="destructive"
                                      onClick={() =>
                                        setTeamToUpdateStatus({
                                          campaignId: selectedCampaign.campaignId,
                                          teamId: team.teamId,
                                          teamName: team.teamName,
                                          newStatus: CampaignTeamStatus.Cancelled,
                                        })
                                      }
                                    >
                                      Từ chối
                                    </Button>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </>
            )}
          </div>

          <DialogFooter className="px-6 py-4 border-t border-border shrink-0">
            <Button variant="outline" onClick={() => setOpenDetailModal(false)}>
              Đóng
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!stationToAttach}
        onOpenChange={(open) => {
          if (!open) setStationToAttach(null);
        }}
        title="Gán chiến dịch vào trạm"
        description={
          stationToAttach
            ? `Xác nhận gán chiến dịch này vào ${stationToAttach.stationName}.`
            : 'Xác nhận gán chiến dịch vào trạm đã chọn.'
        }
        confirmText={assignStationStatus === 'pending' ? 'Đang gán...' : 'Xác nhận gán'}
        cancelText="Hủy"
        variant="success"
        onConfirm={handleConfirmAttachStation}
      />

      <ConfirmDialog
        open={!!stationToDetach}
        onOpenChange={(open) => {
          if (!open) setStationToDetach(null);
        }}
        title="Gỡ trạm khỏi chiến dịch"
        description={
          stationToDetach
            ? `Bạn có chắc muốn gỡ trạm ${stationToDetach.stationName} khỏi chiến dịch này?`
            : 'Bạn có chắc muốn gỡ trạm khỏi chiến dịch này?'
        }
        confirmText={removeStationStatus === 'pending' ? 'Đang gỡ...' : 'Xác nhận gỡ'}
        cancelText="Hủy"
        variant="destructive"
        onConfirm={handleConfirmDetachStation}
      />

      <ConfirmDialog
        open={!!teamToUpdateStatus}
        onOpenChange={(open) => {
          if (!open) setTeamToUpdateStatus(null);
        }}
        title="Cập nhật trạng thái đội trong chiến dịch"
        description={
          teamToUpdateStatus
            ? teamToUpdateStatus.newStatus === CampaignTeamStatus.Accepted
              ? `Xác nhận chấp nhận đội "${teamToUpdateStatus.teamName}" tham gia chiến dịch?`
              : teamToUpdateStatus.newStatus === CampaignTeamStatus.Active
                ? `Xác nhận kích hoạt đội "${teamToUpdateStatus.teamName}" trong chiến dịch?`
                : `Xác nhận từ chối đội "${teamToUpdateStatus.teamName}" khỏi chiến dịch?`
            : 'Xác nhận cập nhật trạng thái đội trong chiến dịch.'
        }
        confirmText="Xác nhận"
        cancelText="Hủy"
        variant={
          teamToUpdateStatus?.newStatus === CampaignTeamStatus.Cancelled ? 'destructive' : 'success'
        }
        onConfirm={handleConfirmUpdateTeamStatus}
      />
    </DashboardLayout>
  );
}
