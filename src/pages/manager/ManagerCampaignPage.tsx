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
import { useQueryClient } from '@tanstack/react-query';
import { useCampaigns, useCreateCampaign, useUpdateCampaignStatus } from '@/hooks/useCampaigns';
import { useSupplyAllocationsByCampaign } from '@/hooks/useSupplies';
import { useProvinces } from '@/hooks/useLocations';
import {
  useProvincialStations,
  useCreateProvincialStation,
  RELIEF_STATION_KEYS,
} from '@/hooks/useReliefStations';
import { AddStationModal, type CreateStationFormData } from './components/AddStationModal';
import { StationAddressLookup } from './components/StationAddressLookup';
import CustomCalendar from '@/components/ui/customCalendar';
import type { CampaignSummary, CreateCampaignPayload } from '@/services/campaignService';
import { toast } from 'sonner';
import { managerNavItems, managerProjects } from './components/sidebarConfig';
import { formatNumberVN } from '@/lib/utils';
import {
  CampaignStatus,
  CampaignStatusLabel,
  CampaignType,
  CampaignTypeLabel,
  CampaignResourceType,
  CampaignResourceTypeLabel,
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

const toUtcNoonIso = (date: Date): string => {
  return new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0),
  ).toISOString();
};

const formatDateVN = (isoString?: string): string => {
  if (!isoString) return '';
  const d = parseIsoToDate(isoString);
  if (!d) return '';
  return d.toLocaleDateString('vi-VN');
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

// ─── Page Component ───────────────────────────────────────────────────────────

const CAMPAIGN_DRAFT_KEY = 'campaign_create_draft';

export default function ManagerCampaignPage() {
  const [pageIndex, setPageIndex] = useState(1);
  const [pageSize] = useState(10);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<number | undefined>(undefined);
  const [openCreateModal, setOpenCreateModal] = useState(false);
  const [openAllocationModal, setOpenAllocationModal] = useState(false);
  const [selectedCampaignForAllocations, setSelectedCampaignForAllocations] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [openAddStationModal, setOpenAddStationModal] = useState(false);

  // Calendar open state for start/end date pickers
  const [openStartCalendar, setOpenStartCalendar] = useState(false);
  const [openEndCalendar, setOpenEndCalendar] = useState(false);

  const queryClient = useQueryClient();

  const { campaigns, pagination, isLoading } = useCampaigns({
    pageIndex,
    pageSize,
    search: search || undefined,
    status: statusFilter,
  });

  const { mutateAsync: createCampaign, status: createStatus } = useCreateCampaign();
  const { mutateAsync: updateStatus } = useUpdateCampaignStatus();
  const { data: allocationsByCampaign = [], isLoading: isLoadingAllocations } =
    useSupplyAllocationsByCampaign(selectedCampaignForAllocations?.id || '');

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

  // Watch form values needed for derived UI
  const watchedStationId = useWatch({ control: form.control, name: 'reliefStationId' });
  const watchedAddressDetail = useWatch({ control: form.control, name: 'addressDetail' });
  const watchedLatitude = useWatch({ control: form.control, name: 'latitude' });
  const watchedLongitude = useWatch({ control: form.control, name: 'longitude' });
  const watchedType = useWatch({ control: form.control, name: 'type' });

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

  const openCampaignAllocations = (campaignId: string, campaignName: string) => {
    setSelectedCampaignForAllocations({ id: campaignId, name: campaignName });
    setOpenAllocationModal(true);
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

  return (
    <DashboardLayout projects={managerProjects} navItems={managerNavItems}>
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
                              {typeof c.overallProgressPercent === 'number'
                                ? `${Math.round(c.overallProgressPercent)}% tiến độ`
                                : '—'}
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
                                    className="gap-2 text-success"
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
                                    className="gap-2 text-warning"
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
                                    className="gap-2 text-success"
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
                                  value={parseIsoToDate(field.value)}
                                  onChange={(date) => {
                                    field.onChange(date ? toUtcNoonIso(date) : '');
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
                                    field.onChange(date ? toUtcNoonIso(date) : '');
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
                                        type="number"
                                        min={1}
                                        placeholder="Vd: 10000000"
                                        className="h-9"
                                        {...field}
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
                        <Badge
                          variant="outline"
                          appearance="outline"
                          size="sm"
                          className={`absolute top-4 right-10 border ${getSupplyAllocationStatusClass(allocation.status)}`}
                        >
                          {getSupplyAllocationStatusLabel(allocation.status)}
                        </Badge>
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
    </DashboardLayout>
  );
}
