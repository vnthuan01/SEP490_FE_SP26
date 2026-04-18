import { useEffect, useMemo, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { TransferPdfWorkflowDialog } from '@/components/pdf/TransferPdfWorkflowDialog';
import { PdfSignaturePad } from '@/components/pdf/PdfSignaturePad';
import { PdfPreviewCard } from '@/components/pdf/PdfPreviewCard';
import { CampaignAllocationDialog } from './components/CampaignAllocationDialog';
import type { ExportItem } from '@/types/exportInventory';
import { CreateInventoryItemDialog } from './components/CreateItem';
import { coordinatorNavGroups } from './components/sidebarConfig';
import { useMyReliefStation } from '@/hooks/useReliefStation';
import {
  useAddStock,
  useCreateTransaction,
  useInventories,
  useInventoryStocks,
  useInventoryTransactions,
  useUpdateStock,
} from '@/hooks/useInventory';
import { useProvincialStations } from '@/hooks/useReliefStations';
import { useSupplyItems } from '@/hooks/useSupplies';
import { useCreateSupplyAllocation } from '@/hooks/useSupplies';
import { useCloudinaryUpload } from '@/hooks/useCloudinaryUpload';
import {
  useAppendSupplyTransferEvidences,
  useCreateSupplyTransfer,
  useReplaceSupplyTransferEvidenceUrls,
  useSupplyTransferDetails,
  useSupplyTransfersByDestinationStation,
  useSupplyTransfersBySourceStation,
  useApproveSupplyTransfer,
  useShipSupplyTransfer,
  useReceiveSupplyTransfer,
  useCancelSupplyTransfer,
} from '@/hooks/useSupplyTransfers';
import { useCampaigns } from '@/hooks/useCampaigns';
import { useUserProfile } from '@/hooks/useUsers';
import { formatNumberInputVN, formatNumberVN, parseFormattedNumber } from '@/lib/utils';
import { clearDialogDraft, readDialogDraft, writeDialogDraft } from '@/lib/dialogDraft';
import {
  getSupplyCategoryClass,
  getSupplyCategoryIcon,
  getSupplyCategoryLabel,
  InventoryLevel,
  TransactionReason,
  TransactionType,
  SupplyTransferStatus,
  parseEnumValue,
} from '@/enums/beEnums';
import { toast } from 'sonner';
import type { Stock } from '@/services/inventoryService';
import { useAuthContext } from '@/components/provider/auth/AuthProvider';
import {
  attachSignatureToPdf,
  buildTransferPdf,
  updateTransferPdfApprovalData,
  type TransferPdfFillData,
} from '@/lib/pdfTransferUtils';
import {
  convertNumberToVietnameseWords,
  formatTransferApprovalNotes,
  parseTransferNotes,
} from '@/lib/transferNotes';

// ─── Local helpers ──────────────────────────────────────────────────────────

type InventoryStat = {
  id: string;
  label: string;
  value: string | number;
  icon: string;
  iconClass: string;
  note?: string;
  progress?: number;
};

type InventoryStatus = 'critical' | 'warning' | 'safe' | 'full';

/** One summary card per unique supplyItemId, aggregating all matching stock rows */
type InventoryItemCard = {
  /** Primary stock id (first stock row for this supply item) */
  id: string;
  supplyItemId: string;
  name: string;
  category: string;
  icon: string;
  /** Sum of all stock rows for this supply item */
  current: number;
  /** Max of maximumStockLevel across all stock rows */
  capacity: number;
  /** Min of minimumStockLevel across all stock rows */
  minimum: number;
  unit: string;
  status: InventoryStatus;
  /** All individual stock rows for this supply item (lot-level detail) */
  lots: Stock[];
};

const statusMap: Record<
  InventoryStatus,
  {
    label: string;
    badge: string;
    bar: string;
    hover: string;
  }
> = {
  critical: {
    label: 'NGUY CẤP',
    badge: 'bg-red-500/10 text-red-500 border-red-500/20',
    bar: 'bg-red-500',
    hover: 'hover:border-red-500/50',
  },
  warning: {
    label: 'CẦN BỔ SUNG',
    badge: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
    bar: 'bg-yellow-500',
    hover: 'hover:border-yellow-500/50',
  },
  safe: {
    label: 'AN TOÀN',
    badge: 'bg-green-500/10 text-green-500 border-green-500/20',
    bar: 'bg-green-500',
    hover: 'hover:border-green-500/40',
  },
  full: {
    label: 'ĐẦY KHO',
    badge: 'bg-green-600/10 text-green-600 border-green-600/20',
    bar: 'bg-green-600',
    hover: 'hover:border-green-600/40',
  },
};

const TRANSFER_STATUS_LABEL: Record<number, string> = {
  [SupplyTransferStatus.Pending]: 'Chờ duyệt',
  [SupplyTransferStatus.Approved]: 'Đã duyệt',
  [SupplyTransferStatus.Shipping]: 'Đang vận chuyển',
  [SupplyTransferStatus.Received]: 'Đã nhận',
  [SupplyTransferStatus.Cancelled]: 'Đã hủy',
};

const TRANSFER_STATUS_CLASS: Record<number, string> = {
  [SupplyTransferStatus.Pending]: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
  [SupplyTransferStatus.Approved]: 'bg-sky-500/10 text-sky-600 border-sky-500/20',
  [SupplyTransferStatus.Shipping]: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  [SupplyTransferStatus.Received]: 'bg-green-500/10 text-green-600 border-green-500/20',
  [SupplyTransferStatus.Cancelled]: 'bg-red-500/10 text-red-600 border-red-500/20',
};

const TRANSACTION_TYPE_UI: Record<
  number,
  {
    label: string;
    icon: string;
    badge: string;
    iconWrap: string;
  }
> = {
  [TransactionType.Import]: {
    label: 'Nhập kho',
    icon: 'south',
    badge: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-600',
    iconWrap: 'bg-emerald-500/10 text-emerald-500',
  },
  [TransactionType.Export]: {
    label: 'Xuất kho',
    icon: 'north',
    badge: 'border-amber-500/20 bg-amber-500/10 text-amber-600',
    iconWrap: 'bg-amber-500/10 text-amber-500',
  },
};

function getInventoryCardStatus(
  current: number,
  maximum: number,
  minimum: number,
): InventoryStatus {
  if (maximum > 0 && current >= maximum) return 'full';
  if (current <= minimum) return 'critical';

  const percent = maximum > 0 ? (current / maximum) * 100 : 0;
  if (percent <= 35) return 'warning';
  return 'safe';
}

/** Format an ISO date string for display, falling back to the given fallback text */
function formatExpirationDate(date: string | null | undefined): string {
  if (!date) return 'Chưa có hạn sử dụng';
  const d = new Date(date);
  if (isNaN(d.getTime())) return 'Chưa có hạn sử dụng';
  return d.toLocaleDateString('vi-VN');
}

/** Sort lots: those with expiration first (earliest first), then those without */
function sortLotsByExpiration(lots: Stock[]): Stock[] {
  return [...lots].sort((a, b) => {
    const aHas = !!a.expirationDate;
    const bHas = !!b.expirationDate;
    if (aHas && bHas)
      return new Date(a.expirationDate!).getTime() - new Date(b.expirationDate!).getTime();
    if (aHas) return -1;
    if (bHas) return 1;
    return 0;
  });
}

// ─── Page Component ──────────────────────────────────────────────────────────

export default function CoordinatorInventoryPage() {
  const TRANSFER_REQUEST_DRAFT_KEY = 'coordinator-transfer-request-draft';
  const EDIT_STOCK_DRAFT_KEY = 'coordinator-edit-stock-draft';
  const TRANSFER_PAGE_SIZE = 5;
  const [filter, setFilter] = useState<'all' | InventoryStatus>('all');
  const [search, setSearch] = useState('');
  const [openTransactionHistory, setOpenTransactionHistory] = useState(false);
  const [showAllTransactions, setShowAllTransactions] = useState(false);
  const [openCreate, setOpenCreate] = useState(false);
  const [openCampaignAllocation, setOpenCampaignAllocation] = useState(false);
  const [openTransferRequest, setOpenTransferRequest] = useState(false);
  const [transferErrors, setTransferErrors] = useState<Record<string, string>>({});
  const [editStockErrors, setEditStockErrors] = useState<Record<string, string>>({});
  const [openApproveTransfer, setOpenApproveTransfer] = useState(false);
  const [openShipTransfer, setOpenShipTransfer] = useState(false);
  const [openReceiveTransfer, setOpenReceiveTransfer] = useState(false);
  const [openCancelTransfer, setOpenCancelTransfer] = useState(false);
  const [openTransferDetail, setOpenTransferDetail] = useState(false);
  const [openTransferPdfWorkflow, setOpenTransferPdfWorkflow] = useState(false);
  const [selectedTransferId, setSelectedTransferId] = useState<string | null>(null);
  const [approveTransferForm, setApproveTransferForm] = useState<{
    actualQuantities: Record<string, number>;
    referenceAmount: string;
    approverName: string;
    approverSignatureDataUrl: string;
    pdfBytes: Uint8Array | null;
  }>({
    actualQuantities: {},
    referenceAmount: '',
    approverName: '',
    approverSignatureDataUrl: '',
    pdfBytes: null,
  });
  const [openOutgoingTransferSection, setOpenOutgoingTransferSection] = useState(true);
  const [openActionableTransferSection, setOpenActionableTransferSection] = useState(true);
  const [outgoingTransferPage, setOutgoingTransferPage] = useState(1);
  const [actionableTransferPage, setActionableTransferPage] = useState(1);

  const [selectedQuickImportSupplyItemId, setSelectedQuickImportSupplyItemId] = useState('');
  const [selectedQuickImportStock, setSelectedQuickImportStock] = useState<{
    currentQuantity: number;
    minimumStockLevel: number;
    maximumStockLevel: number;
  } | null>(null);
  const [transferPdfDraftCode, setTransferPdfDraftCode] = useState('');
  const [transferNewItemSupplyId, setTransferNewItemSupplyId] = useState('');
  const [transferEvidenceFiles, setTransferEvidenceFiles] = useState<
    Array<{
      id: string;
      file: File;
      source: 'manual' | 'generated';
    }>
  >([]);
  const [transferForm, setTransferForm] = useState(() =>
    readDialogDraft(TRANSFER_REQUEST_DRAFT_KEY, {
      sourceStationId: '',
      reason: '',
      notes: '',
      items: [] as Array<{ supplyItemId: string; quantity: number; notes: string }>,
    }),
  );

  // ── Lot detail panel state ──────────────────────────────────────────────────
  const [expandedSupplyItemId, setExpandedSupplyItemId] = useState<string | null>(null);

  // ── Edit min/max dialog state ───────────────────────────────────────────────
  const [editStockDialog, setEditStockDialog] = useState<{
    open: boolean;
    stockId: string;
    supplyName: string;
    minValue: string;
    maxValue: string;
  }>(() =>
    readDialogDraft(EDIT_STOCK_DRAFT_KEY, {
      open: false,
      stockId: '',
      supplyName: '',
      minValue: '',
      maxValue: '',
    }),
  );

  // ── Data hooks ──────────────────────────────────────────────────────────────

  const { station, isLoading: isLoadingStation } = useMyReliefStation();
  const { user } = useAuthContext();
  const { profile } = useUserProfile();

  const { data: inventoriesResponse, isLoading: isLoadingInventories } = useInventories(
    {
      reliefStationId: station?.reliefStationId,
      pageIndex: 1,
      pageSize: 20,
    },
    { enabled: !!station?.reliefStationId },
  );

  const { data: upstreamStationsResponse } = useProvincialStations({
    level: InventoryLevel.Regional,
    pageIndex: 1,
    pageSize: 100,
  });

  const { data: allInventoriesResponse } = useInventories(
    {
      pageIndex: 1,
      pageSize: 200,
    },
    { enabled: !!station?.reliefStationId },
  );

  const managedInventory = inventoriesResponse?.items?.[0];

  const {
    data: stocksResponse,
    isLoading: isLoadingStocks,
    refetch: refetchStocks,
  } = useInventoryStocks(managedInventory?.inventoryId || '', { pageIndex: 1, pageSize: 200 });

  const { data: transactionsResponse, refetch: refetchTransactions } = useInventoryTransactions(
    managedInventory?.inventoryId || '',
    { pageIndex: 1, pageSize: 50 },
  );

  const { data: supplyItemsResponse, isLoading: isLoadingSupplyItems } = useSupplyItems({
    pageIndex: 1,
    pageSize: 300,
  });

  // Campaigns for this station's province/location
  const { campaigns: allCampaigns } = useCampaigns(
    {
      pageIndex: 1,
      pageSize: 200,
      locationId: station?.locationId || undefined,
    },
    { enabled: !!station?.locationId },
  );

  // Supply transfers where this station is the SOURCE (requests FROM upstream come to us as source)
  const { data: sourceTransfers = [], refetch: refetchSourceTransfers } =
    useSupplyTransfersBySourceStation(station?.reliefStationId || '');
  const { data: destinationTransfers = [], refetch: refetchDestinationTransfers } =
    useSupplyTransfersByDestinationStation(station?.reliefStationId || '');

  // ── Mutations ──────────────────────────────────────────────────────────────

  const { mutateAsync: addStock } = useAddStock();
  const { mutateAsync: createTransaction } = useCreateTransaction();
  const { mutateAsync: createSupplyTransfer, status: createSupplyTransferStatus } =
    useCreateSupplyTransfer();
  const { mutateAsync: replaceTransferEvidenceUrls } = useReplaceSupplyTransferEvidenceUrls();
  const { mutateAsync: appendTransferEvidences } = useAppendSupplyTransferEvidences();
  const { uploadFile, isUploading: isUploadingTransferEvidence } = useCloudinaryUpload();
  const { mutateAsync: createSupplyAllocation } = useCreateSupplyAllocation();
  const { mutateAsync: approveTransfer, status: approveTransferStatus } =
    useApproveSupplyTransfer();
  const { mutateAsync: shipTransfer, status: shipTransferStatus } = useShipSupplyTransfer();
  const { mutateAsync: receiveTransfer, status: receiveTransferStatus } =
    useReceiveSupplyTransfer();
  const { mutateAsync: cancelTransfer, status: cancelTransferStatus } = useCancelSupplyTransfer();
  const { mutateAsync: updateStock, status: updateStockStatus } = useUpdateStock();

  // ── Derived data ──────────────────────────────────────────────────────────

  const stocks = useMemo(() => stocksResponse?.items || [], [stocksResponse]);
  const supplyItems = useMemo(() => supplyItemsResponse?.items || [], [supplyItemsResponse]);
  const upstreamStations = useMemo(
    () => upstreamStationsResponse?.items || [],
    [upstreamStationsResponse],
  );
  const allInventories = useMemo(
    () => allInventoriesResponse?.items || [],
    [allInventoriesResponse],
  );
  const transactions = useMemo(() => transactionsResponse?.items || [], [transactionsResponse]);

  const supplyMap = useMemo(
    () => new Map(supplyItems.map((item) => [item.id, item])),
    [supplyItems],
  );

  /**
   * Group all stock rows by supplyItemId.
   * Multiple rows for the same supply item represent separate lots.
   */
  const inventoryItems: InventoryItemCard[] = useMemo(() => {
    const grouped = new Map<string, Stock[]>();
    for (const stock of stocks) {
      const existing = grouped.get(stock.supplyItemId) ?? [];
      grouped.set(stock.supplyItemId, [...existing, stock]);
    }

    return Array.from(grouped.entries()).map(([supplyItemId, lots]) => {
      const supply = supplyMap.get(supplyItemId);
      const totalCurrent = lots.reduce((sum, s) => sum + s.currentQuantity, 0);
      const maxCapacity = Math.max(...lots.map((s) => s.maximumStockLevel), 0);
      const minLevel = Math.min(...lots.map((s) => s.minimumStockLevel));
      const status = getInventoryCardStatus(totalCurrent, maxCapacity, minLevel);

      return {
        id: lots[0].stockId,
        supplyItemId,
        name: supply?.name || supplyItemId,
        category: supply ? getSupplyCategoryLabel(supply.category) : 'Chưa rõ danh mục',
        icon: supply ? getSupplyCategoryIcon(supply.category) : 'inventory_2',
        current: totalCurrent,
        capacity: maxCapacity || totalCurrent,
        minimum: minLevel,
        unit: supply?.unit || 'Đơn vị',
        status,
        lots: sortLotsByExpiration(lots),
      };
    });
  }, [stocks, supplyMap]);

  const outgoingRequestTransfers = useMemo(
    () =>
      [...destinationTransfers].sort(
        (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime(),
      ),
    [destinationTransfers],
  );

  const actionableSourceTransfers = useMemo(
    () =>
      [...sourceTransfers].sort(
        (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime(),
      ),
    [sourceTransfers],
  );

  const relatedTransfers = useMemo(() => {
    const merged = [...destinationTransfers, ...sourceTransfers];
    const map = new Map(merged.map((transfer) => [transfer.id, transfer]));
    return Array.from(map.values()).sort(
      (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime(),
    );
  }, [destinationTransfers, sourceTransfers]);

  const { transferMap: detailedTransferMap, isLoading: isLoadingTransferDetails } =
    useSupplyTransferDetails(relatedTransfers.map((transfer) => transfer.id));

  const outgoingTransfersDetailed = useMemo(
    () =>
      outgoingRequestTransfers.map((transfer) => detailedTransferMap.get(transfer.id) || transfer),
    [outgoingRequestTransfers, detailedTransferMap],
  );

  const actionableTransfersDetailed = useMemo(
    () =>
      actionableSourceTransfers.map((transfer) => detailedTransferMap.get(transfer.id) || transfer),
    [actionableSourceTransfers, detailedTransferMap],
  );

  const relatedTransfersDetailed = useMemo(
    () => relatedTransfers.map((transfer) => detailedTransferMap.get(transfer.id) || transfer),
    [relatedTransfers, detailedTransferMap],
  );

  const outgoingTransferTotalPages = Math.max(
    1,
    Math.ceil(outgoingRequestTransfers.length / TRANSFER_PAGE_SIZE),
  );
  const actionableTransferTotalPages = Math.max(
    1,
    Math.ceil(actionableSourceTransfers.length / TRANSFER_PAGE_SIZE),
  );
  const pagedOutgoingTransfers = useMemo(
    () =>
      outgoingTransfersDetailed.slice(
        (outgoingTransferPage - 1) * TRANSFER_PAGE_SIZE,
        outgoingTransferPage * TRANSFER_PAGE_SIZE,
      ),
    [outgoingTransfersDetailed, outgoingTransferPage],
  );
  const pagedActionableTransfers = useMemo(
    () =>
      actionableTransfersDetailed.slice(
        (actionableTransferPage - 1) * TRANSFER_PAGE_SIZE,
        actionableTransferPage * TRANSFER_PAGE_SIZE,
      ),
    [actionableTransfersDetailed, actionableTransferPage],
  );

  const inventoryStats: InventoryStat[] = useMemo(() => {
    const totalCategories = inventoryItems.length;
    const lowStock = inventoryItems.filter((item) => item.status === 'critical').length;
    const capacityPercent =
      inventoryItems.length === 0
        ? 0
        : Math.round(
            (inventoryItems.reduce((sum, item) => sum + item.current, 0) /
              Math.max(
                inventoryItems.reduce((sum, item) => sum + item.capacity, 0),
                1,
              )) *
              100,
          );

    return [
      {
        id: 'categories',
        label: 'Tổng danh mục',
        value: formatNumberVN(totalCategories),
        icon: 'category',
        iconClass: 'bg-primary/10 text-primary',
        note: 'Tổng số vật phẩm trong kho đang quản lý',
      },
      {
        id: 'low-stock',
        label: 'Sắp hết hàng',
        value: formatNumberVN(lowStock),
        icon: 'production_quantity_limits',
        iconClass: 'bg-red-500/10 text-red-500',
        note: 'Các vật phẩm dưới ngưỡng tồn tối thiểu',
      },
      {
        id: 'pending-transfers',
        label: 'Phiếu chờ duyệt',
        value: formatNumberVN(
          relatedTransfers.filter((t) => t.status === SupplyTransferStatus.Pending).length,
        ),
        icon: 'swap_horiz',
        iconClass: 'bg-amber-500/10 text-amber-500',
        note: 'Phiếu điều phối đến trạm chờ phê duyệt',
      },
      {
        id: 'capacity',
        label: 'Sức chứa kho',
        value: `${formatNumberVN(capacityPercent)}%`,
        icon: 'warehouse',
        iconClass: 'bg-emerald-500/10 text-emerald-500',
        note: managedInventory?.reliefStationName || 'Kho Điều phối viên đang quản lý',
        progress: capacityPercent,
      },
    ];
  }, [inventoryItems, managedInventory, relatedTransfers]);

  const filteredItems = inventoryItems.filter((item) => {
    const matchesFilter = filter === 'all' ? true : item.status === filter;
    const normalizedSearch = search.trim().toLowerCase();
    const matchesSearch =
      !normalizedSearch ||
      item.name.toLowerCase().includes(normalizedSearch) ||
      item.category.toLowerCase().includes(normalizedSearch) ||
      item.unit.toLowerCase().includes(normalizedSearch);

    return matchesFilter && matchesSearch;
  });

  const exportItems: ExportItem[] = useMemo(
    () =>
      inventoryItems.map((item) => ({
        id: item.id,
        name: item.name,
        category: item.category,
        icon: item.icon,
        current: item.current,
        capacity: item.capacity,
        unit: item.unit,
        quantity: 1,
      })),
    [inventoryItems],
  );

  const stockMapBySupplyItemId = useMemo(
    () => new Map(stocks.map((stock) => [stock.supplyItemId, stock])),
    [stocks],
  );

  const upstreamSourceStations = useMemo(() => {
    const inventorySourceMap = new Map(
      allInventories
        .filter((inventory) => inventory.level === InventoryLevel.Regional)
        .map((inventory) => [inventory.reliefStationId, inventory]),
    );

    return upstreamStations
      .filter(
        (stationItem) =>
          stationItem.reliefStationId && stationItem.reliefStationId !== station?.reliefStationId,
      )
      .map((stationItem) => ({
        stationId: stationItem.reliefStationId as string,
        stationName: stationItem.name,
        inventoryId: inventorySourceMap.get(stationItem.reliefStationId as string)?.inventoryId,
        inventoryLevel:
          inventorySourceMap.get(stationItem.reliefStationId as string)?.level ||
          InventoryLevel.Regional,
      }));
  }, [allInventories, upstreamStations, station?.reliefStationId]);

  const selectedSourceInventoryId = useMemo(() => {
    const matchedSource = upstreamSourceStations.find(
      (source) => source.stationId === transferForm.sourceStationId,
    );
    return matchedSource?.inventoryId || '';
  }, [transferForm.sourceStationId, upstreamSourceStations]);

  const selectedSourceStation = useMemo(
    () =>
      upstreamSourceStations.find((source) => source.stationId === transferForm.sourceStationId) ||
      null,
    [transferForm.sourceStationId, upstreamSourceStations],
  );

  const { data: selectedSourceStocksResponse, isLoading: isLoadingSelectedSourceStocks } =
    useInventoryStocks(selectedSourceInventoryId, { pageIndex: 1, pageSize: 500 });

  const selectedSourceStocks = useMemo(
    () => selectedSourceStocksResponse?.items || [],
    [selectedSourceStocksResponse],
  );
  const selectedSourceStockMapBySupplyItemId = useMemo(
    () => new Map(selectedSourceStocks.map((stock) => [stock.supplyItemId, stock])),
    [selectedSourceStocks],
  );
  const selectedSourceSupplyIds = useMemo(
    () => new Set(selectedSourceStocks.map((stock) => stock.supplyItemId)),
    [selectedSourceStocks],
  );

  /** Campaigns filtered by current station locationId.
   * If backend returns nearby campaigns in the same location/province, show them here. */
  const stationCampaigns = useMemo(() => {
    return allCampaigns.map((c) => ({ id: c.campaignId, name: c.name }));
  }, [allCampaigns]);

  const selectedTransfer = useMemo(
    () => relatedTransfersDetailed.find((t) => t.id === selectedTransferId) ?? null,
    [relatedTransfersDetailed, selectedTransferId],
  );

  const selectedTransferSummary = useMemo(() => {
    if (!selectedTransfer) return [] as string[];

    return [
      `Mã phiếu: ${selectedTransfer.transferCode || selectedTransfer.id.slice(0, 8)}`,
      `Nguồn: ${selectedTransfer.sourceStationName || selectedTransfer.sourceStationId || '—'}`,
      `Đích: ${selectedTransfer.destinationStationName || selectedTransfer.destinationStationId || '—'}`,
      `Số dòng: ${formatNumberVN(selectedTransfer.totalRequestedItems || selectedTransfer.items?.length || 0)}`,
      `Tổng SL: ${formatNumberVN(selectedTransfer.totalRequestedQuantity || 0)}`,
    ];
  }, [selectedTransfer]);

  const selectedTransferSummaryCompact = useMemo(() => {
    if (!selectedTransfer) return [] as Array<{ label: string; value: string }>;

    return [
      {
        label: 'Mã phiếu',
        value: selectedTransfer.transferCode || selectedTransfer.id.slice(0, 8),
      },
      {
        label: 'Kho nguồn',
        value: selectedTransfer.sourceStationName || selectedTransfer.sourceStationId || '—',
      },
      {
        label: 'Kho đích',
        value:
          selectedTransfer.destinationStationName || selectedTransfer.destinationStationId || '—',
      },
      {
        label: 'Số dòng vật phẩm',
        value: formatNumberVN(
          selectedTransfer.totalRequestedItems || selectedTransfer.items?.length || 0,
        ),
      },
      {
        label: 'Tổng số lượng',
        value: formatNumberVN(selectedTransfer.totalRequestedQuantity || 0),
      },
    ];
  }, [selectedTransfer]);

  const selectedTransferMetaRows = useMemo(() => {
    if (!selectedTransfer) {
      return [] as Array<{ icon: string; label: string; value: string; tone: string }>;
    }

    return [
      {
        icon: 'barcode',
        label: 'Mã phiếu',
        value: selectedTransfer.transferCode || selectedTransfer.id,
        tone: 'bg-sky-500/10 text-sky-600',
      },
      {
        icon: 'warehouse',
        label: 'Kho / trạm nguồn',
        value: selectedTransfer.sourceStationName || selectedTransfer.sourceStationId || '—',
        tone: 'bg-indigo-500/10 text-indigo-600',
      },
      {
        icon: 'south_east',
        label: 'Kho đích',
        value:
          selectedTransfer.destinationStationName || selectedTransfer.destinationStationId || '—',
        tone: 'bg-emerald-500/10 text-emerald-600',
      },
      {
        icon: 'person',
        label: 'Người yêu cầu',
        value: selectedTransfer.requestedByName || 'Chưa rõ',
        tone: 'bg-amber-500/10 text-amber-600',
      },
      {
        icon: 'deployed_code_history',
        label: 'Tổng dòng vật phẩm',
        value: formatNumberVN(
          selectedTransfer.totalRequestedItems || selectedTransfer.items?.length || 0,
        ),
        tone: 'bg-violet-500/10 text-violet-600',
      },
      {
        icon: 'inventory_2',
        label: 'Tổng số lượng',
        value: formatNumberVN(selectedTransfer.totalRequestedQuantity || 0),
        tone: 'bg-rose-500/10 text-rose-600',
      },
    ];
  }, [selectedTransfer]);

  const isLoading =
    isLoadingStation || isLoadingInventories || isLoadingStocks || isLoadingSupplyItems;

  const transferPdfData = useMemo(() => {
    const creatorName = profile?.displayName || user?.fullName || user?.email || 'Người lập phiếu';
    const creatorEmail = profile?.email || user?.email || '';

    return {
      transferCode: transferPdfDraftCode || 'TEMP-DRAFT',
      creatorName,
      creatorEmail,
      sourceName: selectedSourceStation?.stationName || 'Chưa chọn kho nguồn',
      sourceInventoryName: selectedSourceStation?.stationName || 'Chưa có thông tin kho nguồn',
      destinationName: station?.name || 'Chưa chọn trạm đích',
      createdAt: new Date().toLocaleString('vi-VN'),
      decidedBy: creatorName,
      reason: transferForm.reason,
      notes: transferForm.notes,
      signedDateLabel: new Date().toLocaleDateString('vi-VN'),
      clauses: [
        'Tôi xác nhận thông tin trên phiếu điều phối là đúng và đầy đủ.',
        'Tôi đã kiểm tra khả năng đáp ứng của kho nguồn trước khi gửi phiếu.',
        'Tôi chịu trách nhiệm về chữ ký, ngày ký và các tệp PDF đính kèm trong phiếu này.',
      ],
      items: transferForm.items.map((item) => {
        const matchedSupply = supplyMap.get(item.supplyItemId);
        return {
          name: matchedSupply?.name || item.supplyItemId,
          quantity: item.quantity || 0,
          unit: matchedSupply?.unit || 'Đơn vị',
          actualQuantity: item.quantity || 0,
          sourceAvailableQuantity:
            selectedSourceStockMapBySupplyItemId.get(item.supplyItemId)?.currentQuantity || 0,
          notes: item.notes,
        };
      }),
    };
  }, [
    profile,
    transferPdfDraftCode,
    user,
    selectedSourceStation,
    station?.name,
    transferForm,
    supplyMap,
    selectedSourceStockMapBySupplyItemId,
  ]);

  const selectedTransferPdfData = useMemo<TransferPdfFillData | null>(() => {
    if (!selectedTransfer) return null;

    const parsedNotes = parseTransferNotes(selectedTransfer.notes);
    const referenceAmount = parseFormattedNumber(approveTransferForm.referenceAmount || '0');
    const approverName = approveTransferForm.approverName.trim();

    return {
      transferCode: selectedTransfer.transferCode || selectedTransfer.id,
      creatorName: selectedTransfer.requestedByName || 'Người lập phiếu',
      creatorEmail: undefined,
      sourceName: selectedTransfer.sourceStationName || selectedTransfer.sourceStationId || '—',
      sourceInventoryName:
        selectedTransfer.sourceStationName || selectedTransfer.sourceStationId || '—',
      destinationName:
        selectedTransfer.destinationStationName || selectedTransfer.destinationStationId || '—',
      createdAt: selectedTransfer.createdAt
        ? new Date(selectedTransfer.createdAt).toLocaleString('vi-VN')
        : new Date().toLocaleString('vi-VN'),
      decidedBy:
        approverName || profile?.displayName || user?.fullName || user?.email || 'Người duyệt',
      approverName,
      reason: selectedTransfer.reason || parsedNotes.reason,
      notes: parsedNotes.note || parsedNotes.raw || selectedTransfer.notes || '',
      signedDateLabel: new Date().toLocaleDateString('vi-VN'),
      signedDateTimeLabel: new Date().toLocaleString('vi-VN'),
      referenceAmount,
      referenceAmountText: convertNumberToVietnameseWords(referenceAmount),
      items: (selectedTransfer.items || []).map((item, index) => {
        const matchedSupply = supplyMap.get(item.supplyItemId);
        const key = `${item.supplyItemId}-${index}`;
        const actualQuantity =
          approveTransferForm.actualQuantities[key] ??
          item.actualQuantity ??
          item.requestedQuantity ??
          item.quantity ??
          0;
        return {
          name: item.supplyItemName || matchedSupply?.name || item.supplyItemId,
          quantity: item.requestedQuantity ?? item.quantity ?? 0,
          unit: matchedSupply?.unit || 'Đơn vị',
          actualQuantity,
          notes: item.notes,
        };
      }),
    };
  }, [
    approveTransferForm.actualQuantities,
    approveTransferForm.approverName,
    approveTransferForm.referenceAmount,
    profile?.displayName,
    selectedTransfer,
    supplyMap,
    user?.email,
    user?.fullName,
  ]);

  const todayTransactionSummary = useMemo(() => {
    const todayKey = new Date().toDateString();
    let importToday = 0;
    let exportToday = 0;

    transactions.forEach((transaction) => {
      if (!transaction.createdAt) return;
      if (new Date(transaction.createdAt).toDateString() !== todayKey) return;

      const totalQuantityFromItems = (transaction.items || []).reduce(
        (sum: number, item: any) => sum + Number(item.quantity || 0),
        0,
      );
      const totalQuantity = Number(transaction.totalItems || 0) || totalQuantityFromItems;

      if (transaction.type === TransactionType.Import) importToday += totalQuantity;
      if (transaction.type === TransactionType.Export) exportToday += totalQuantity;
    });

    return { importToday, exportToday };
  }, [transactions]);

  const visibleTransactions = useMemo(
    () => (showAllTransactions ? transactions : transactions.slice(0, 3)),
    [showAllTransactions, transactions],
  );

  useEffect(() => {
    writeDialogDraft(TRANSFER_REQUEST_DRAFT_KEY, transferForm);
  }, [transferForm]);

  useEffect(() => {
    writeDialogDraft(EDIT_STOCK_DRAFT_KEY, {
      ...editStockDialog,
      open: false,
    });
  }, [editStockDialog]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleImportItem = async (item: {
    supplyItemId: string;
    name: string;
    category: string;
    icon?: string;
    unit: string;
    quantity: number;
    capacity?: number;
    note?: string;
    expirationDate?: string | null;
  }): Promise<boolean> => {
    if (!managedInventory?.inventoryId) {
      toast.error('Không tìm thấy kho đang quản lý để nhập hàng.');
      return false;
    }

    const matchedSupplyItem = supplyItems.find((supply) => supply.id === item.supplyItemId);

    if (!matchedSupplyItem) {
      toast.error('Chưa tìm thấy vật phẩm tương ứng trong danh mục hàng hóa cứu trợ.');
      return false;
    }

    const existingStock = stockMapBySupplyItemId.get(matchedSupplyItem.id);

    if (existingStock) {
      if (!item.note?.trim()) {
        toast.error('Vui lòng nhập lý do nhập kho cho vật phẩm đã có sẵn trong kho.');
        return false;
      }

      // Existing stock → use inventory transaction import
      try {
        await createTransaction({
          inventoryId: managedInventory.inventoryId,
          type: TransactionType.Import,
          reason: TransactionReason.Other,
          notes: item.note || 'Nhập kho từ trang quản lý kho moderator',
          items: [
            {
              supplyItemId: matchedSupplyItem.id,
              supplyItemName: matchedSupplyItem.name,
              supplyItemUnit: matchedSupplyItem.unit,
              quantity: item.quantity,
              notes: item.note || 'Nhập thêm vật tư vào kho',
            },
          ],
        });
      } catch {
        return false;
      }
    } else {
      // New stock row → use addStock with optional expiration date
      try {
        await addStock({
          id: managedInventory.inventoryId,
          data: {
            supplyItemId: matchedSupplyItem.id,
            currentQuantity: item.quantity,
            minimumStockLevel: 0,
            maximumStockLevel: item.capacity || item.quantity,
            expirationDate: item.expirationDate ?? null,
          },
        });
      } catch {
        return false;
      }
    }

    await Promise.all([refetchStocks(), refetchTransactions()]);
    toast.success('Đã nhập hàng vào kho Điều phối viên đang quản lý.');
    return true;
  };

  const handleOpenQuickImport = (item: InventoryItemCard) => {
    setSelectedQuickImportSupplyItemId(item.supplyItemId);
    setSelectedQuickImportStock({
      currentQuantity: item.current,
      minimumStockLevel: item.minimum,
      maximumStockLevel: item.capacity,
    });
    setOpenCreate(true);
  };

  const handleOpenCreateDialog = () => {
    setSelectedQuickImportSupplyItemId('');
    setSelectedQuickImportStock(null);
    setOpenCreate(true);
  };

  const handleCreateDialogOpenChange = (nextOpen: boolean) => {
    setOpenCreate(nextOpen);
    if (!nextOpen) {
      setSelectedQuickImportSupplyItemId('');
      setSelectedQuickImportStock(null);
    }
  };

  const handleOpenTransferRequest = () => {
    setTransferErrors({});
    setTransferForm((prev) => ({
      ...prev,
      sourceStationId: prev.sourceStationId || upstreamSourceStations[0]?.stationId || '',
    }));
    setTransferPdfDraftCode(`TEMP-${new Date().getTime()}`);
    setTransferNewItemSupplyId('');
    setOpenTransferRequest(true);
  };

  const handleAddTransferEvidenceFiles = (
    files: FileList | File[] | null,
    source: 'manual' | 'generated',
  ) => {
    if (!files || files.length === 0) return;

    const nextFiles = Array.from(files).filter((file) => file.type === 'application/pdf');

    if (nextFiles.length === 0) {
      toast.error('Chỉ chấp nhận tệp PDF để đính kèm vào phiếu điều phối.');
      return;
    }

    setTransferEvidenceFiles((prev) => {
      const existingKeys = new Set(
        prev.map((item) => `${item.file.name}-${item.file.size}-${item.file.lastModified}`),
      );

      const appended = nextFiles
        .filter((file) => !existingKeys.has(`${file.name}-${file.size}-${file.lastModified}`))
        .map((file) => ({
          id: crypto.randomUUID(),
          file,
          source,
        }));

      return [...prev, ...appended];
    });
  };

  const handleRemoveTransferEvidenceFile = (id: string) => {
    setTransferEvidenceFiles((prev) => prev.filter((file) => file.id !== id));
  };

  const handleAddTransferItem = () => {
    if (!transferNewItemSupplyId) return;

    setTransferForm((prev) => {
      if (prev.items.some((item) => item.supplyItemId === transferNewItemSupplyId)) {
        return prev;
      }

      const matched = supplyMap.get(transferNewItemSupplyId);
      return {
        ...prev,
        items: [
          ...prev.items,
          {
            supplyItemId: transferNewItemSupplyId,
            quantity: 1,
            notes: `Yêu cầu tiếp tế cho ${matched?.name || transferNewItemSupplyId}`,
          },
        ],
      };
    });

    setTransferErrors((prev) => {
      const next = { ...prev };
      delete next['items'];
      return next;
    });
    setTransferNewItemSupplyId('');
  };

  const handleChangeTransferSource = (sourceStationId: string) => {
    const matchedSource = upstreamSourceStations.find(
      (source) => source.stationId === sourceStationId,
    );
    const nextInventoryId = matchedSource?.inventoryId || '';
    const nextStockMap = new Map(
      allInventories.length >= 0
        ? (selectedSourceInventoryId === nextInventoryId ? selectedSourceStocks : []).map(
            (stock) => [stock.supplyItemId, stock],
          )
        : [],
    );

    setTransferForm((prev) => ({
      ...prev,
      sourceStationId,
      items: prev.items.filter((item) => nextStockMap.has(item.supplyItemId)),
    }));
    setTransferNewItemSupplyId('');
  };

  const handleRemoveTransferItem = (supplyItemId: string) => {
    setTransferForm((prev) => ({
      ...prev,
      items: prev.items.filter((item) => item.supplyItemId !== supplyItemId),
    }));
  };

  const updateTransferItem = (
    supplyItemId: string,
    key: 'quantity' | 'notes',
    value: string | number,
  ) => {
    setTransferForm((prev) => ({
      ...prev,
      items: prev.items.map((item) =>
        item.supplyItemId === supplyItemId ? { ...item, [key]: value } : item,
      ),
    }));
  };

  const handleSubmitTransferRequest = async () => {
    if (!station?.reliefStationId) {
      toast.error('Không tìm thấy trạm đích đang quản lý.');
      return;
    }

    const errs: Record<string, string> = {};

    if (!transferForm.sourceStationId) {
      errs['sourceStationId'] = 'Vui lòng chọn trạm nguồn / kho tổng.';
    }

    if (!transferForm.reason.trim()) {
      errs['reason'] = 'Vui lòng nhập lý do yêu cầu điều phối.';
    }

    const validItems = transferForm.items.filter((item) => item.supplyItemId && item.quantity > 0);
    if (validItems.length === 0) {
      errs['items'] = 'Vui lòng chọn ít nhất một vật phẩm cần điều phối.';
    }

    if (Object.keys(errs).length > 0) {
      setTransferErrors(errs);
      return;
    }

    setTransferErrors({});

    const uploadedEvidenceUrls = await Promise.all(
      transferEvidenceFiles.map(async (evidence) => {
        const uploaded = await uploadFile({
          file: evidence.file,
          folder: 'reliefhub/supply-transfer-evidence',
          resourceType: 'raw',
        });
        return uploaded.secureUrl;
      }),
    );

    const createdTransferResponse = await createSupplyTransfer({
      sourceStationId: transferForm.sourceStationId,
      destinationStationId: station.reliefStationId,
      reason: transferForm.reason.trim(),
      notes: transferForm.notes.trim(),
      items: validItems,
    });

    const createdTransferId = createdTransferResponse?.data?.id;
    if (createdTransferId && uploadedEvidenceUrls.length > 0) {
      await replaceTransferEvidenceUrls({
        id: createdTransferId,
        data: { evidenceUrls: uploadedEvidenceUrls },
      });
    }

    await Promise.all([refetchStocks(), refetchTransactions()]);
    clearDialogDraft(TRANSFER_REQUEST_DRAFT_KEY);
    setTransferForm({ sourceStationId: '', reason: '', notes: '', items: [] });
    setTransferPdfDraftCode('');
    setTransferEvidenceFiles([]);
    setOpenTransferRequest(false);
  };

  /**
   * Handles campaign allocation export.
   * Uses `useCreateSupplyAllocation` (supply allocation service) instead of
   * generic inventory transaction so the backend can track per-campaign allocations.
   * Also creates an inventory Export transaction for stock tracking.
   */
  const handleCampaignAllocation = async (
    items: ExportItem[],
    note: string,
    campaignId: string,
  ) => {
    if (!managedInventory?.inventoryId) {
      toast.error('Không tìm thấy kho đang quản lý để cấp phát.');
      return;
    }

    if (!campaignId) {
      toast.error('Vui lòng chọn chiến dịch nhận vật tư.');
      return;
    }

    const validItems = items
      .filter((item) => item.quantity && item.quantity > 0)
      .map((item) => {
        const matchedStock = stocks.find((stock) => stock.stockId === item.id);
        const matchedSupply = matchedStock
          ? supplyItems.find((supply) => supply.id === matchedStock.supplyItemId)
          : null;
        return {
          supplyItemId: matchedStock?.supplyItemId || '',
          supplyItemName: matchedSupply?.name || item.name,
          supplyItemUnit: matchedSupply?.unit || item.unit,
          quantity: item.quantity || 0,
        };
      })
      .filter((item) => item.supplyItemId && item.quantity > 0);

    if (validItems.length === 0) {
      toast.error('Không có vật phẩm hợp lệ để cấp phát.');
      return;
    }

    // 1) Create supply allocation record (links inventory → campaign)
    await createSupplyAllocation({
      campaignId,
      sourceInventoryId: managedInventory.inventoryId,
      items: validItems,
    });

    // 2) Create inventory export transaction to track stock reduction
    await createTransaction({
      inventoryId: managedInventory.inventoryId,
      type: TransactionType.Export,
      reason: TransactionReason.CampaignAllocation,
      notes: note || `Cấp phát vật tư cho chiến dịch`,
      items: validItems.map((item) => ({
        supplyItemId: item.supplyItemId,
        supplyItemName: item.supplyItemName,
        supplyItemUnit: item.supplyItemUnit,
        quantity: item.quantity,
        notes: note || 'Cấp phát chiến dịch',
      })),
    });

    await Promise.all([refetchStocks(), refetchTransactions()]);
    toast.success('Đã cấp phát vật tư cho chiến dịch.');
    setOpenCampaignAllocation(false);
  };

  /**
   * Approve a pending transfer where this station is the SOURCE.
   * Không trừ kho ở bước approve; backend chỉ trừ kho khi ship.
   */
  const handleApproveTransfer = async () => {
    if (!selectedTransfer) {
      toast.error('Không tìm thấy phiếu hoặc kho để xử lý.');
      return;
    }

    try {
      const referenceAmount = parseFormattedNumber(approveTransferForm.referenceAmount || '0');
      if (!approveTransferForm.approverName.trim()) {
        toast.error('Vui lòng nhập người phê duyệt.');
        return;
      }
      if (!approveTransferForm.approverSignatureDataUrl) {
        toast.error('Vui lòng ký vào ô người phê duyệt.');
        return;
      }

      let evidenceUrls = [...(selectedTransfer.evidenceUrls || [])];
      if (selectedTransferPdfData) {
        const existingPdfUrl = (selectedTransfer.evidenceUrls || []).find((url) =>
          url.toLowerCase().includes('.pdf'),
        );

        const basePdfBytes = existingPdfUrl
          ? new Uint8Array(await (await fetch(existingPdfUrl)).arrayBuffer())
          : await buildTransferPdf(selectedTransferPdfData);

        const signedPdf = await attachSignatureToPdf(
          basePdfBytes,
          approveTransferForm.approverSignatureDataUrl,
          {
            signerName: approveTransferForm.approverName.trim(),
            box: 'approver',
          },
        );

        const pdfFile = new File(
          [new Uint8Array(signedPdf)],
          `phieu-phe-duyet-${selectedTransfer.transferCode || selectedTransfer.id}.pdf`,
          { type: 'application/pdf' },
        );
        const uploaded = await uploadFile({
          file: pdfFile,
          folder: 'reliefhub/supply-transfer-evidence',
          resourceType: 'raw',
        });
        evidenceUrls = [...evidenceUrls, uploaded.secureUrl];
      }

      if (evidenceUrls.length > 0) {
        await appendTransferEvidences({
          id: selectedTransfer.id,
          data: { evidenceUrls },
        });
      }

      await approveTransfer({
        id: selectedTransfer.id,
        data: {
          notes: formatTransferApprovalNotes(referenceAmount, approveTransferForm.approverName),
          evidenceUrls,
        },
      });

      await Promise.all([
        refetchStocks(),
        refetchTransactions(),
        refetchSourceTransfers(),
        refetchDestinationTransfers(),
      ]);
      setApproveTransferForm({
        actualQuantities: {},
        referenceAmount: '',
        approverName: '',
        approverSignatureDataUrl: '',
        pdfBytes: null,
      });
      setOpenApproveTransfer(false);
      setSelectedTransferId(null);
      toast.success(
        'Đã phê duyệt phiếu điều phối. Kho sẽ chỉ bị trừ khi chuyển sang bước giao hàng.',
      );
    } catch {
      // errors handled by hooks
    }
  };

  const handleShipTransfer = async () => {
    if (!selectedTransfer) return;
    if (selectedTransfer.evidenceUrls?.length) {
      await appendTransferEvidences({
        id: selectedTransfer.id,
        data: { evidenceUrls: selectedTransfer.evidenceUrls },
      });
    }

    await shipTransfer({ id: selectedTransfer.id, data: {} });
    await Promise.all([refetchSourceTransfers(), refetchDestinationTransfers()]);
    setOpenShipTransfer(false);
    setSelectedTransferId(null);
  };

  const handleReceiveTransfer = async () => {
    if (!selectedTransfer) return;

    await receiveTransfer({
      id: selectedTransfer.id,
      data: {
        items: (selectedTransfer.items || []).map((item) => ({
          supplyItemId: item.supplyItemId,
          actualQuantity: item.requestedQuantity ?? item.quantity ?? 0,
          notes: item.notes,
        })),
      },
    });

    await Promise.all([
      refetchStocks(),
      refetchTransactions(),
      refetchSourceTransfers(),
      refetchDestinationTransfers(),
    ]);
    setOpenReceiveTransfer(false);
    setSelectedTransferId(null);
  };

  const handleCancelTransfer = async () => {
    if (!selectedTransfer) return;
    if (selectedTransfer.evidenceUrls?.length) {
      await appendTransferEvidences({
        id: selectedTransfer.id,
        data: { evidenceUrls: selectedTransfer.evidenceUrls },
      });
    }

    await cancelTransfer({ id: selectedTransfer.id, data: {} });
    await Promise.all([refetchSourceTransfers(), refetchDestinationTransfers()]);
    setOpenCancelTransfer(false);
    setSelectedTransferId(null);
  };

  const openTransferDetailDialog = (transferId: string) => {
    setSelectedTransferId(transferId);
    setOpenTransferDetail(true);
  };

  const openApproveTransferDialog = (transferId: string) => {
    setSelectedTransferId(transferId);
    const transfer = relatedTransfersDetailed.find((item) => item.id === transferId) ?? null;
    setApproveTransferForm({
      actualQuantities: Object.fromEntries(
        (transfer?.items || []).map((item, index) => [
          `${item.supplyItemId}-${index}`,
          item.actualQuantity ?? item.requestedQuantity ?? item.quantity ?? 0,
        ]),
      ),
      referenceAmount: '',
      approverName: profile?.displayName || user?.fullName || '',
      approverSignatureDataUrl: '',
      pdfBytes: null,
    });
    setOpenApproveTransfer(true);
  };

  const openShipTransferDialog = (transferId: string) => {
    setSelectedTransferId(transferId);
    setOpenShipTransfer(true);
  };

  const openReceiveTransferDialog = (transferId: string) => {
    setSelectedTransferId(transferId);
    setOpenReceiveTransfer(true);
  };

  const openCancelTransferDialog = (transferId: string) => {
    setSelectedTransferId(transferId);
    setOpenCancelTransfer(true);
  };

  /** Open the edit min/max dialog for a specific stock lot */
  const handleOpenEditStock = (stock: Stock, supplyName: string) => {
    setEditStockErrors({});
    setEditStockDialog({
      open: true,
      stockId: stock.stockId || '',
      supplyName,
      minValue: String(stock.minimumStockLevel),
      maxValue: String(stock.maximumStockLevel),
    });
  };

  /** Validate and submit min/max update */
  const handleSaveEditStock = async () => {
    const { stockId, minValue, maxValue } = editStockDialog;
    if (!stockId || !managedInventory?.inventoryId) {
      toast.error('Không tìm thấy dữ liệu lô hàng để cập nhật. Vui lòng đóng và mở lại.');
      return;
    }

    const min = Number(minValue);
    const max = Number(maxValue);
    const errs: Record<string, string> = {};

    if (isNaN(min) || min < 0) {
      errs['minValue'] = 'Ngưỡng tối thiểu phải là số không âm.';
    }
    if (isNaN(max) || max < 0) {
      errs['maxValue'] = 'Ngưỡng tối đa phải là số không âm.';
    }
    if (!errs['minValue'] && !errs['maxValue'] && max > 0 && min > max) {
      errs['minValue'] = 'Ngưỡng tối thiểu không được lớn hơn ngưỡng tối đa.';
    }

    if (Object.keys(errs).length > 0) {
      setEditStockErrors(errs);
      return;
    }

    setEditStockErrors({});

    try {
      await updateStock({
        stockId,
        inventoryId: managedInventory.inventoryId,
        data: { minimumStockLevel: min, maximumStockLevel: max },
      });
      await refetchStocks();
      clearDialogDraft(EDIT_STOCK_DRAFT_KEY);
      setEditStockDialog({
        open: false,
        stockId: '',
        supplyName: '',
        minValue: '',
        maxValue: '',
      });
    } catch {
      // errors handled by hook
    }
  };

  const handleClearTransferDraft = () => {
    clearDialogDraft(TRANSFER_REQUEST_DRAFT_KEY);
    setTransferErrors({});
    setTransferForm({
      sourceStationId: upstreamSourceStations[0]?.stationId || '',
      reason: '',
      notes: '',
      items: [],
    });
    setTransferPdfDraftCode('');
    setTransferEvidenceFiles([]);
    setTransferNewItemSupplyId('');
  };

  const handleClearEditStockDraft = () => {
    clearDialogDraft(EDIT_STOCK_DRAFT_KEY);
    setEditStockDialog((prev) => ({
      ...prev,
      minValue: '',
      maxValue: '',
    }));
    setEditStockErrors({});
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <DashboardLayout navGroups={coordinatorNavGroups}>
      <div>
        <div className="flex flex-col gap-1 mb-2">
          <h1 className="text-4xl text-primary font-black">Quản lý Kho Vật tư</h1>
          <p className="text-muted-foreground dark:text-muted-foreground">
            Theo dõi tồn kho của trạm <b>Điều phối viên</b> đang quản lý và điều phối cứu trợ.
          </p>
          {station?.name && (
            <p className="mt-2 text-sm text-muted-foreground">
              Trạm đang quản lý:{' '}
              <span className="font-semibold text-foreground">{station.name}</span>
            </p>
          )}
        </div>
      </div>
      <div className="flex justify-between mb-6 wrap">
        <div className="flex gap-3">
          <div className="relative w-72">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-muted-foreground text-lg">
              search
            </span>
            <Input
              className="pl-10"
              placeholder="Tìm kiếm vật phẩm trong kho..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Button variant="outline" className="gap-2">
            <span className="material-symbols-outlined text-lg">download</span>
            Xuất báo cáo
          </Button>
          <Button variant="outline" className="gap-2" onClick={handleOpenTransferRequest}>
            <span className="material-symbols-outlined text-lg">swap_horiz</span>
            Yêu cầu điều phối
          </Button>
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => setOpenCampaignAllocation(true)}
          >
            <span className="material-symbols-outlined text-lg">outbound</span>
            Cấp phát chiến dịch
          </Button>
          <Button variant="primary" className="gap-2" onClick={handleOpenCreateDialog}>
            <span className="material-symbols-outlined text-lg">inventory_2</span>
            Nhập kho
            <span className="material-symbols-outlined text-lg">add</span>
          </Button>
        </div>
      </div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {inventoryStats.map((s) => (
          <Card key={s.id}>
            <CardContent className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex gap-2 text-sm text-muted-foreground">
                    <span className="material-symbols-outlined">{s.icon}</span>
                    {s.label}
                  </div>
                  <p className="text-3xl font-bold text-foreground mt-2">{s.value}</p>
                  {s.note && <p className="text-xs text-muted-foreground mt-1">{s.note}</p>}
                </div>
                <div
                  className={`size-10 rounded-xl border border-border flex items-center justify-center ${s.iconClass}`}
                >
                  <span className="material-symbols-outlined">{s.icon}</span>
                </div>
              </div>
              {typeof s.progress === 'number' && (
                <div className="mt-3 h-1.5 bg-border rounded-full overflow-hidden">
                  <div
                    className="h-1.5 bg-yellow-500 rounded-full"
                    style={{ width: `${s.progress}%` }}
                  />
                </div>
              )}
            </CardContent>
          </Card>
        ))}
        <Card>
          <CardContent className="p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex gap-2 text-sm text-muted-foreground">
                  <span className="material-symbols-outlined">south</span>
                  Nhập hôm nay
                </div>
                <p className="text-3xl font-bold text-foreground mt-2">
                  {formatNumberVN(todayTransactionSummary.importToday)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Tổng số lượng vật tư nhập trong ngày
                </p>
              </div>
              <div className="size-10 rounded-xl border border-border flex items-center justify-center bg-emerald-500/10 text-emerald-500">
                <span className="material-symbols-outlined">download</span>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex gap-2 text-sm text-muted-foreground">
                  <span className="material-symbols-outlined">north</span>
                  Xuất hôm nay
                </div>
                <p className="text-3xl font-bold text-foreground mt-2">
                  {formatNumberVN(todayTransactionSummary.exportToday)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Tổng số lượng vật tư xuất trong ngày
                </p>
              </div>
              <div className="size-10 rounded-xl border border-border flex items-center justify-center bg-amber-500/10 text-amber-500">
                <span className="material-symbols-outlined">upload</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Filters ── */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {(['all', 'critical', 'warning', 'safe', 'full'] as const).map((s) => (
          <Button
            key={s}
            size="sm"
            variant={filter === s ? 'primary' : 'outline'}
            onClick={() => setFilter(s)}
          >
            {s === 'all' ? 'Tất cả' : statusMap[s].label}
          </Button>
        ))}
      </div>

      {/* ── Inventory grid ── */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="flex flex-col items-center gap-3">
            <span className="material-symbols-outlined text-4xl text-primary animate-spin">
              progress_activity
            </span>
            <p className="text-muted-foreground text-sm">Đang tải tồn kho trạm đang quản lý...</p>
          </div>
        </div>
      ) : !station?.reliefStationId ? (
        <div className="flex items-center justify-center py-16">
          <div className="flex flex-col items-center gap-3">
            <span className="material-symbols-outlined text-4xl text-muted-foreground">
              warehouse
            </span>
            <p className="text-muted-foreground text-sm">Bạn chưa được gán trạm quản lý.</p>
          </div>
        </div>
      ) : !managedInventory?.inventoryId ? (
        <div className="flex items-center justify-center py-16">
          <div className="flex flex-col items-center gap-3">
            <span className="material-symbols-outlined text-4xl text-muted-foreground">
              inventory_2
            </span>
            <p className="text-muted-foreground text-sm">Trạm này chưa có kho được tạo.</p>
          </div>
        </div>
      ) : inventoryItems.length === 0 ? (
        <div className="flex items-center justify-center py-16">
          <div className="flex flex-col items-center gap-3 text-center max-w-md">
            <span className="material-symbols-outlined text-5xl text-amber-500">inventory_2</span>
            <p className="text-lg font-semibold text-foreground">Kho bạn đang trống</p>
            <p className="text-sm text-muted-foreground">
              Hiện tại kho chưa có vật phẩm nào. Bạn có thể nhập kho hoặc tạo yêu cầu điều phối để
              bổ sung hàng hóa.
            </p>
          </div>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="flex items-center justify-center py-16">
          <div className="flex flex-col items-center gap-3 text-center max-w-md">
            <span className="material-symbols-outlined text-4xl text-muted-foreground">
              search_off
            </span>
            <p className="text-lg font-semibold text-foreground">Không có vật phẩm phù hợp</p>
            <p className="text-sm text-muted-foreground">
              Hãy thử thay đổi từ khóa tìm kiếm hoặc bộ lọc tồn kho.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
          {filteredItems.map((item) => {
            const percent = Math.round((item.current / Math.max(item.capacity, 1)) * 100);
            const status = statusMap[item.status];
            const isExpanded = expandedSupplyItemId === item.supplyItemId;

            return (
              <Card
                key={item.supplyItemId}
                className={`group flex flex-col bg-card border-border transition ${status.hover}`}
              >
                <CardContent className="p-5 flex flex-col flex-1">
                  <div className="flex justify-between mb-4 gap-3">
                    <div className="flex gap-4 min-w-0">
                      <div className="size-12 font-bold border rounded-xl bg-border-dark flex items-center justify-center shrink-0">
                        <span className="material-symbols-outlined">{item.icon}</span>
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-bold text-lg group-hover:text-primary truncate">
                          {item.name}
                        </h3>
                        <p className="text-sm text-muted-foreground truncate">{item.category}</p>
                      </div>
                    </div>

                    <span
                      className={`px-2.5 py-1 rounded-md h-6 text-xs font-bold border ${status.badge}`}
                    >
                      {status.label}
                    </span>
                  </div>

                  <div className="flex-1 mb-3">
                    <div className="flex justify-between mb-2 gap-3">
                      <span className="text-3xl font-black">{formatNumberVN(item.current)}</span>
                      <span className="text-sm text-muted-foreground text-right">
                        / {formatNumberVN(item.capacity)} {item.unit}
                      </span>
                    </div>

                    <div className="h-2.5 bg-border-dark rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${status.bar}`}
                        style={{ width: `${Math.min(percent, 100)}%` }}
                      />
                    </div>

                    <p className="mt-2 text-xs text-muted-foreground">
                      {formatNumberVN(percent)}% sức chứa
                    </p>
                  </div>

                  {/* ── Lot detail toggle ── */}
                  <button
                    type="button"
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-3 transition-colors"
                    onClick={() => setExpandedSupplyItemId(isExpanded ? null : item.supplyItemId)}
                  >
                    <span className="material-symbols-outlined text-sm">
                      {isExpanded ? 'expand_less' : 'expand_more'}
                    </span>
                    {item.lots.length > 1 ? `${item.lots.length} lô hàng` : '1 lô hàng'}
                    {' – Xem chi tiết'}
                  </button>

                  {isExpanded && (
                    <div className="mb-3 rounded-xl border border-border bg-muted/10 divide-y divide-border text-xs">
                      {item.lots.map((lot, idx) => (
                        <div
                          key={lot.stockId}
                          className="px-3 py-2 flex items-start justify-between gap-2"
                        >
                          <div className="space-y-0.5 min-w-0">
                            <p className="font-medium text-foreground">
                              Lô #{idx + 1} · {formatNumberVN(lot.currentQuantity)} {item.unit}
                            </p>
                            <p className="text-muted-foreground">
                              Hạn sử dụng: {formatExpirationDate(lot.expirationDate)}
                            </p>
                            <p className="text-muted-foreground">
                              Tồn min: {formatNumberVN(lot.minimumStockLevel)} · max:{' '}
                              {formatNumberVN(lot.maximumStockLevel)}
                            </p>
                          </div>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="shrink-0 h-7 w-7"
                            title="Chỉnh ngưỡng tồn kho"
                            onClick={() => handleOpenEditStock(lot, item.name)}
                          >
                            <span className="material-symbols-outlined text-sm">edit</span>
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex gap-3">
                    <Button
                      className="flex-1"
                      variant="primary"
                      onClick={() => setOpenCampaignAllocation(true)}
                    >
                      <span className="material-symbols-outlined text-lg">outbound</span>
                      Cấp phát
                    </Button>
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={() => handleOpenQuickImport(item)}
                    >
                      <span className="material-symbols-outlined">add</span>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* ── Transfer sections ── */}
      <div className="mt-6 grid grid-cols-1 gap-6">
        <Card>
          <CardContent className="p-5 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                className="flex items-center gap-2 text-left"
                onClick={() => setOpenOutgoingTransferSection((prev) => !prev)}
              >
                <span className="material-symbols-outlined text-sky-500">outbox</span>
                <h3 className="font-semibold text-foreground">Phiếu tôi gửi yêu cầu</h3>
                <span className="material-symbols-outlined text-muted-foreground text-[18px]">
                  {openOutgoingTransferSection ? 'expand_less' : 'expand_more'}
                </span>
              </button>
              <span className="ml-auto text-xs text-muted-foreground">
                Trạm của bạn là bên nhận hàng / bên tạo yêu cầu
              </span>
            </div>

            {!openOutgoingTransferSection ? (
              <p className="text-sm text-muted-foreground">Khối đang được thu gọn.</p>
            ) : outgoingRequestTransfers.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border bg-muted/10 p-4 text-sm text-muted-foreground">
                Chưa có phiếu yêu cầu điều phối nào được gửi từ trạm này.
              </div>
            ) : (
              <div className="space-y-3">
                {pagedOutgoingTransfers.map((transfer) => {
                  const statusLabel =
                    transfer.statusName || TRANSFER_STATUS_LABEL[transfer.status] || 'Không rõ';
                  const statusClass =
                    TRANSFER_STATUS_CLASS[transfer.status] ||
                    'bg-gray-500/10 text-gray-600 border-gray-500/20';
                  const canReceive = transfer.status === SupplyTransferStatus.Shipping;
                  const canCancel =
                    transfer.status !== SupplyTransferStatus.Received &&
                    transfer.status !== SupplyTransferStatus.Cancelled;

                  return (
                    <div
                      key={transfer.id}
                      className="rounded-xl border border-border bg-card px-4 py-3 flex items-center justify-between gap-4 hover:bg-muted/20 hover:shadow-sm transition-all"
                    >
                      <button
                        type="button"
                        className="space-y-1 text-left flex-1 min-w-0 group/detail"
                        onClick={() => openTransferDetailDialog(transfer.id)}
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded text-xs font-semibold border ${statusClass}`}
                          >
                            {statusLabel}
                          </span>
                          <p className="text-xs text-muted-foreground">
                            Mã: {transfer.transferCode || transfer.id.slice(0, 8)}
                          </p>
                        </div>
                        <p className="text-sm text-foreground">
                          Nguồn cấp:{' '}
                          <span className="font-medium">
                            {transfer.sourceStationName || transfer.sourceStationId}
                          </span>
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Người yêu cầu: {transfer.requestedByName || 'Chưa rõ'}
                        </p>
                        {transfer.reason && (
                          <p className="text-xs text-muted-foreground">Lý do: {transfer.reason}</p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          {formatNumberVN(
                            transfer.totalRequestedItems || transfer.items?.length || 0,
                          )}{' '}
                          dòng • Tổng SL {formatNumberVN(transfer.totalRequestedQuantity || 0)} •{' '}
                          {transfer.createdAt
                            ? new Date(transfer.createdAt).toLocaleDateString('vi-VN')
                            : 'N/A'}
                        </p>
                        <div className="pt-1 flex items-center gap-1 text-xs text-primary font-medium group-hover/detail:underline">
                          <span className="material-symbols-outlined text-sm">visibility</span>
                          Xem chi tiết phiếu
                        </div>
                      </button>
                      <div className="flex flex-wrap gap-2 shrink-0">
                        {canReceive && (
                          <Button
                            size="sm"
                            variant="success"
                            className="gap-1 shadow-sm"
                            onClick={(event) => {
                              event.stopPropagation();
                              openReceiveTransferDialog(transfer.id);
                            }}
                          >
                            <span className="material-symbols-outlined text-sm">inventory</span>
                            Xác nhận nhận hàng
                          </Button>
                        )}
                        {canCancel && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1 border-red-200 text-destructive hover:bg-red-50 dark:hover:bg-red-950/20"
                            onClick={(event) => {
                              event.stopPropagation();
                              openCancelTransferDialog(transfer.id);
                            }}
                          >
                            <span className="material-symbols-outlined text-sm">close</span>
                            Hủy
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
                {outgoingTransferTotalPages > 1 && (
                  <div className="flex items-center justify-between pt-2">
                    <p className="text-xs text-muted-foreground">
                      Trang {outgoingTransferPage}/{outgoingTransferTotalPages}
                    </p>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={outgoingTransferPage <= 1}
                        onClick={() => setOutgoingTransferPage((prev) => Math.max(1, prev - 1))}
                      >
                        Trước
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={outgoingTransferPage >= outgoingTransferTotalPages}
                        onClick={() =>
                          setOutgoingTransferPage((prev) =>
                            Math.min(outgoingTransferTotalPages, prev + 1),
                          )
                        }
                      >
                        Sau
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                className="flex items-center gap-2 text-left"
                onClick={() => setOpenActionableTransferSection((prev) => !prev)}
              >
                <span className="material-symbols-outlined text-amber-500">inbox</span>
                <h3 className="font-semibold text-foreground">Phiếu kho tôi cần xử lý</h3>
                <span className="material-symbols-outlined text-muted-foreground text-[18px]">
                  {openActionableTransferSection ? 'expand_less' : 'expand_more'}
                </span>
              </button>
              <span className="ml-auto text-xs text-muted-foreground">
                Trạm của bạn là kho nguồn cấp hàng
              </span>
            </div>

            {!openActionableTransferSection ? (
              <p className="text-sm text-muted-foreground">Khối đang được thu gọn.</p>
            ) : actionableSourceTransfers.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border bg-muted/10 p-4 text-sm text-muted-foreground">
                Hiện chưa có phiếu điều phối nào cần kho này xử lý.
              </div>
            ) : (
              <div className="space-y-3">
                {pagedActionableTransfers.map((transfer) => {
                  const statusLabel =
                    transfer.statusName || TRANSFER_STATUS_LABEL[transfer.status] || 'Không rõ';
                  const statusClass =
                    TRANSFER_STATUS_CLASS[transfer.status] ||
                    'bg-gray-500/10 text-gray-600 border-gray-500/20';
                  const isPending = transfer.status === SupplyTransferStatus.Pending;
                  const isApproved = transfer.status === SupplyTransferStatus.Approved;
                  const canCancel =
                    transfer.status !== SupplyTransferStatus.Received &&
                    transfer.status !== SupplyTransferStatus.Cancelled;

                  return (
                    <div
                      key={transfer.id}
                      className="rounded-xl border border-border bg-card px-4 py-3 flex items-center justify-between gap-4 hover:bg-muted/20 hover:shadow-sm transition-all"
                    >
                      <button
                        type="button"
                        className="space-y-1 text-left flex-1 min-w-0 group/detail"
                        onClick={() => openTransferDetailDialog(transfer.id)}
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded text-xs font-semibold border ${statusClass}`}
                          >
                            {statusLabel}
                          </span>
                          <p className="text-xs text-muted-foreground">
                            Mã: {transfer.transferCode || `${transfer.id.slice(0, 8)}...`}
                          </p>
                        </div>
                        <p className="text-sm text-foreground">
                          Trạm yêu cầu:{' '}
                          <span className="font-medium">
                            {transfer.destinationStationName || transfer.destinationStationId}
                          </span>
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Người yêu cầu: {transfer.requestedByName || 'Chưa rõ'}
                        </p>
                        {transfer.reason && (
                          <p className="text-xs text-muted-foreground">Lý do: {transfer.reason}</p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          {formatNumberVN(
                            transfer.totalRequestedItems || transfer.items?.length || 0,
                          )}{' '}
                          dòng • Tổng SL {formatNumberVN(transfer.totalRequestedQuantity || 0)} •{' '}
                          {transfer.createdAt
                            ? new Date(transfer.createdAt).toLocaleDateString('vi-VN')
                            : 'N/A'}
                        </p>
                        <div className="pt-1 flex items-center gap-1 text-xs text-primary font-medium group-hover/detail:underline">
                          <span className="material-symbols-outlined text-sm">visibility</span>
                          Xem chi tiết phiếu
                        </div>
                      </button>
                      <div className="flex flex-wrap gap-2 shrink-0">
                        {isPending && (
                          <Button
                            size="sm"
                            variant="success"
                            className="gap-1 shadow-sm"
                            onClick={(event) => {
                              event.stopPropagation();
                              openApproveTransferDialog(transfer.id);
                            }}
                          >
                            <span className="material-symbols-outlined text-sm">check_circle</span>
                            Phê duyệt
                          </Button>
                        )}
                        {isApproved && (
                          <Button
                            size="sm"
                            variant="primary"
                            className="gap-1 shadow-sm"
                            onClick={(event) => {
                              event.stopPropagation();
                              openShipTransferDialog(transfer.id);
                            }}
                          >
                            <span className="material-symbols-outlined text-sm">
                              local_shipping
                            </span>
                            Đánh dấu đang giao
                          </Button>
                        )}
                        {canCancel && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1 border-red-200 text-destructive hover:bg-red-50 dark:hover:bg-red-950/20"
                            onClick={(event) => {
                              event.stopPropagation();
                              openCancelTransferDialog(transfer.id);
                            }}
                          >
                            <span className="material-symbols-outlined text-sm">close</span>
                            Hủy
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
                {actionableTransferTotalPages > 1 && (
                  <div className="flex items-center justify-between pt-2">
                    <p className="text-xs text-muted-foreground">
                      Trang {actionableTransferPage}/{actionableTransferTotalPages}
                    </p>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={actionableTransferPage <= 1}
                        onClick={() => setActionableTransferPage((prev) => Math.max(1, prev - 1))}
                      >
                        Trước
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={actionableTransferPage >= actionableTransferTotalPages}
                        onClick={() =>
                          setActionableTransferPage((prev) =>
                            Math.min(actionableTransferTotalPages, prev + 1),
                          )
                        }
                      >
                        Sau
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Transaction history ── */}
      <Card className="mt-6">
        <CardContent className="p-5 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              className="flex items-center gap-2 text-left"
              onClick={() => setOpenTransactionHistory((prev) => !prev)}
            >
              <span className="material-symbols-outlined text-primary">history</span>
              <h3 className="font-semibold text-foreground">Lịch sử giao dịch gần đây</h3>
              <span className="material-symbols-outlined text-muted-foreground text-[18px]">
                {openTransactionHistory ? 'expand_less' : 'expand_more'}
              </span>
            </button>

            {openTransactionHistory && transactions.length > 3 && (
              <button
                type="button"
                onClick={() => setShowAllTransactions((prev) => !prev)}
                className="text-sm text-primary hover:underline"
              >
                {showAllTransactions ? 'Thu gọn danh sách' : 'Xem thêm'}
              </button>
            )}
          </div>

          {!openTransactionHistory ? (
            <p className="text-sm text-muted-foreground">
              Thẻ lịch sử đang được thu gọn. Nhấn để xem chi tiết giao dịch.
            </p>
          ) : transactions.length === 0 ? (
            <p className="text-sm text-muted-foreground">Chưa có giao dịch nào được ghi nhận.</p>
          ) : (
            <div className="space-y-3">
              {visibleTransactions.map((transaction, index) => (
                <div
                  key={transaction.transactionId || `${transaction.createdAt || 'tx'}-${index}`}
                  className="rounded-xl border border-border bg-card px-4 py-3 flex items-center justify-between gap-4"
                >
                  <div>
                    {(() => {
                      const transactionTypeUi =
                        TRANSACTION_TYPE_UI[parseEnumValue(transaction.type)] ||
                        TRANSACTION_TYPE_UI[TransactionType.Import];

                      return (
                        <div className="flex items-center gap-2 mb-1">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold ${transactionTypeUi.badge}`}
                          >
                            <span className="material-symbols-outlined text-[14px]">
                              {transactionTypeUi.icon}
                            </span>
                            {transactionTypeUi.label}
                          </span>
                        </div>
                      );
                    })()}
                    <p className="text-xs text-muted-foreground">
                      {transaction.createdAt
                        ? new Date(transaction.createdAt).toLocaleString('vi-VN')
                        : 'Chưa có thời gian'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Mã GD: {transaction.transactionCode || '—'} • Người tạo:{' '}
                      {transaction.createdByName || 'Chưa rõ'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Lý do:{' '}
                      {parseEnumValue(transaction.reason) === TransactionReason.CampaignAllocation
                        ? 'Cấp phát cho chiến dịch'
                        : parseEnumValue(transaction.reason) === TransactionReason.Procurement
                          ? 'Mua hàng'
                          : parseEnumValue(transaction.reason) ===
                              TransactionReason.SupplyTransferIn
                            ? 'Nhập từ kho khác'
                            : parseEnumValue(transaction.reason) ===
                                TransactionReason.SupplyTransferOut
                              ? 'Xuất để chuyển hàng đi kho khác'
                              : parseEnumValue(transaction.reason) === TransactionReason.Donation
                                ? 'Nhận quà tặng'
                                : parseEnumValue(transaction.reason) === TransactionReason.Other
                                  ? 'Khác'
                                  : transaction.reasonName || 'Chưa rõ'}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {transaction.notes || 'Không có ghi chú'}
                    </p>
                  </div>
                  <div className="text-right">
                    {(() => {
                      const firstItem = transaction.items?.[0];
                      const totalQuantity = formatNumberVN(
                        Number(transaction.totalItems || 0) ||
                          (transaction.items || []).reduce(
                            (sum: number, item: any) => sum + Number(item.quantity || 0),
                            0,
                          ),
                      );

                      return (
                        <p className="text-sm font-semibold text-foreground">
                          {firstItem?.supplyItemName || 'Nhiều vật phẩm'} - {totalQuantity}{' '}
                          {firstItem?.supplyItemUnit || 'đơn vị'}
                        </p>
                      );
                    })()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Dialogs ── */}

      {/* Campaign Allocation Dialog */}
      <CampaignAllocationDialog
        open={openCampaignAllocation}
        onOpenChange={setOpenCampaignAllocation}
        items={exportItems}
        campaigns={stationCampaigns}
        onSubmit={(items, note, campaignId) => {
          void handleCampaignAllocation(items, note, campaignId);
        }}
      />

      {/* Create / Import Dialog */}
      <CreateInventoryItemDialog
        open={openCreate}
        onOpenChange={handleCreateDialogOpenChange}
        supplyItems={supplyItems.map((item) => ({
          id: item.id,
          name: item.name,
          category: getSupplyCategoryLabel(item.category),
          icon: getSupplyCategoryIcon(item.category),
          iconUrl: item.iconUrl || getSupplyCategoryIcon(item.category),
          unit: item.unit,
        }))}
        initialSupplyItemId={selectedQuickImportSupplyItemId}
        existingStock={selectedQuickImportSupplyItemId ? selectedQuickImportStock : null}
        onSubmit={async (item) => {
          const success = await handleImportItem(item);
          if (!success) return;
          setSelectedQuickImportSupplyItemId('');
          setSelectedQuickImportStock(null);
          setOpenCreate(false);
        }}
      />

      {/* Transfer Request Dialog */}
      <Dialog open={openTransferRequest} onOpenChange={setOpenTransferRequest}>
        <DialogContent className="!max-w-none w-[95vw] h-[90vh] p-0 overflow-hidden flex flex-col">
          <DialogHeader className="px-6 py-4 border-b border-border shrink-0">
            <DialogTitle className="text-xl font-bold text-foreground">
              Tạo phiếu yêu cầu điều phối lên Manager
            </DialogTitle>
            <DialogDescription>
              Trạm đích mặc định là trạm <b>Điều phối viên</b> đang quản lý. Nguồn hàng lấy từ kho
              tổng / trạm nguồn cấp trên.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 min-h-0 overflow-y-auto p-6">
            <div className="space-y-6">
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    Trạm nguồn / kho tổng
                  </label>
                  <Select
                    value={transferForm.sourceStationId}
                    onValueChange={(v) => {
                      handleChangeTransferSource(v);
                      setTransferErrors((prev) => {
                        const next = { ...prev };
                        delete next['sourceStationId'];
                        return next;
                      });
                    }}
                  >
                    <SelectTrigger
                      className={
                        transferErrors['sourceStationId'] ? 'border-red-500 focus:ring-red-500' : ''
                      }
                    >
                      <SelectValue placeholder="Chọn trạm nguồn" />
                    </SelectTrigger>
                    <SelectContent>
                      {upstreamSourceStations
                        .filter((item) => !!item.stationId)
                        .map((item) => (
                          <SelectItem key={item.stationId} value={item.stationId}>
                            {item.stationName}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  {transferErrors['sourceStationId'] && (
                    <p className="text-xs text-red-500 flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">error</span>
                      {transferErrors['sourceStationId']}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Chỉ hiển thị vật phẩm mà kho nguồn đang có. Nếu đổi kho nguồn, các vật phẩm
                    không còn tồn tại ở kho mới sẽ bị loại khỏi phiếu.
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Trạm đích</label>
                  <Input value={station?.name || ''} readOnly />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:items-start">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    Lý do điều phối <span className="text-red-500">*</span>
                  </label>
                  <Textarea
                    rows={3}
                    placeholder="Ví dụ: Kho đang thiếu nước uống và thuốc y tế"
                    value={transferForm.reason}
                    className={transferErrors['reason'] ? 'border-red-500 focus:ring-red-500' : ''}
                    onChange={(e) => {
                      setTransferForm((prev) => ({ ...prev, reason: e.target.value }));
                      setTransferErrors((prev) => {
                        const next = { ...prev };
                        delete next['reason'];
                        return next;
                      });
                    }}
                  />
                  {transferErrors['reason'] && (
                    <p className="text-xs text-red-500 flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">error</span>
                      {transferErrors['reason']}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Ghi chú</label>
                  <Textarea
                    rows={3}
                    placeholder="Ghi chú thêm cho quản lý khi duyệt phiếu điều phối"
                    value={transferForm.notes}
                    onChange={(e) =>
                      setTransferForm((prev) => ({ ...prev, notes: e.target.value }))
                    }
                  />
                </div>
              </div>

              <div className="space-y-3 rounded-2xl border border-border bg-muted/10 p-4">
                <p className="font-semibold text-foreground">Danh sách vật phẩm cần điều phối</p>
                {transferErrors['items'] && (
                  <p className="text-xs text-red-500 flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">error</span>
                    {transferErrors['items']}
                  </p>
                )}
                <div className="rounded-xl border border-border bg-yellow-500 p-3 text-sm text-white/80">
                  {isLoadingSelectedSourceStocks
                    ? 'Đang tải tồn kho kho nguồn...'
                    : selectedSourceInventoryId
                      ? selectedSourceStocks.length > 0
                        ? `Kho nguồn hiện có ${selectedSourceStocks.length} dòng tồn kho khả dụng để chọn.`
                        : 'Kho nguồn hiện không có vật phẩm nào.'
                      : 'Vui lòng chọn kho nguồn để xem vật phẩm khả dụng.'}
                </div>
                <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">
                      Thêm vật phẩm vào phiếu
                    </label>
                    <Select
                      value={transferNewItemSupplyId}
                      onValueChange={(v) => {
                        setTransferNewItemSupplyId(v);
                        setTransferErrors((prev) => {
                          const next = { ...prev };
                          delete next['items'];
                          return next;
                        });
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Chọn thêm vật phẩm cần điều phối" />
                      </SelectTrigger>
                      <SelectContent>
                        {supplyItems
                          .filter((item) => selectedSourceSupplyIds.has(item.id))
                          .map((item) => (
                            <SelectItem key={item.id} value={item.id}>
                              {item.name} • {getSupplyCategoryLabel(item.category)} •{' '}
                              {formatNumberVN(
                                selectedSourceStockMapBySupplyItemId.get(item.id)
                                  ?.currentQuantity || 0,
                              )}{' '}
                              {item.unit}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <Button
                    variant="outline"
                    className="gap-2 w-full lg:w-auto"
                    disabled={!transferNewItemSupplyId || selectedSourceStocks.length === 0}
                    onClick={handleAddTransferItem}
                  >
                    <span className="material-symbols-outlined text-lg">add</span>
                    Thêm vật phẩm
                  </Button>
                </div>

                {transferForm.items.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-border bg-muted/10 p-4 text-sm text-muted-foreground">
                    Chưa có vật phẩm cần yêu cầu. Hãy bổ sung ngưỡng tồn hoặc chọn các vật phẩm
                    thiếu hàng.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {transferForm.items.map((item) => {
                      const matchedSupply = supplyMap.get(item.supplyItemId);
                      return (
                        <div
                          key={item.supplyItemId}
                          className="rounded-xl border border-border bg-card p-4"
                        >
                          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_220px] lg:items-start">
                            <div className="space-y-3 min-w-0">
                              <div className="flex items-center gap-2 min-w-0">
                                <Badge
                                  variant="outline"
                                  appearance="outline"
                                  size="xs"
                                  className={`gap-1 border ${matchedSupply ? getSupplyCategoryClass(matchedSupply.category) : ''}`}
                                >
                                  <span className="material-symbols-outlined shrink-0 text-[14px]">
                                    {matchedSupply
                                      ? getSupplyCategoryIcon(matchedSupply.category)
                                      : 'inventory_2'}
                                  </span>
                                  {matchedSupply
                                    ? getSupplyCategoryLabel(matchedSupply.category)
                                    : 'Chưa rõ'}
                                </Badge>
                                <div className="min-w-0">
                                  <p className="font-semibold text-foreground break-words">
                                    {matchedSupply?.name || item.supplyItemId}
                                  </p>
                                  <p className="text-sm text-muted-foreground">
                                    Mã vật phẩm: {item.supplyItemId}
                                  </p>
                                </div>
                              </div>
                              <div className="space-y-2">
                                <label className="text-sm font-medium text-foreground">
                                  Ghi chú cho vật phẩm
                                </label>
                                <Textarea
                                  rows={2}
                                  placeholder="Ghi chú riêng cho vật phẩm này"
                                  value={item.notes}
                                  onChange={(e) =>
                                    updateTransferItem(item.supplyItemId, 'notes', e.target.value)
                                  }
                                />
                              </div>
                            </div>

                            <div className="space-y-3 lg:border-l lg:border-border lg:pl-4">
                              <div className="space-y-2">
                                <label className="text-sm font-medium text-foreground">
                                  Số lượng yêu cầu
                                </label>
                                <Input
                                  value={formatNumberInputVN(item.quantity)}
                                  onChange={(e) =>
                                    updateTransferItem(
                                      item.supplyItemId,
                                      'quantity',
                                      parseFormattedNumber(e.target.value) || 1,
                                    )
                                  }
                                />
                              </div>

                              <div className="rounded-lg bg-muted/40 p-3 text-xs text-muted-foreground">
                                <p>
                                  Đơn vị:{' '}
                                  <span className="font-medium text-foreground">
                                    {matchedSupply?.unit || 'Đơn vị'}
                                  </span>
                                </p>
                                <p className="mt-1">
                                  Hiện có trong kho nguồn:{' '}
                                  <span className="font-medium text-foreground">
                                    {formatNumberVN(
                                      selectedSourceStockMapBySupplyItemId.get(item.supplyItemId)
                                        ?.currentQuantity || 0,
                                    )}
                                  </span>
                                </p>
                              </div>

                              <Button
                                variant="ghost"
                                className="text-destructive px-0 h-auto justify-start"
                                onClick={() => handleRemoveTransferItem(item.supplyItemId)}
                              >
                                <span className="material-symbols-outlined text-lg mr-1">
                                  delete
                                </span>
                                Bỏ vật phẩm này
                              </Button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="space-y-4 rounded-2xl border border-border bg-muted/10 p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <p className="font-semibold text-foreground">Hồ sơ PDF đính kèm</p>
                    <p className="text-sm text-muted-foreground">
                      Có thể tải nhiều file PDF hoặc tạo PDF mẫu từ thông tin phiếu rồi ký tay trước
                      khi gửi.
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="gap-2"
                      onClick={() => setOpenTransferPdfWorkflow(true)}
                    >
                      <span className="material-symbols-outlined text-lg">picture_as_pdf</span>
                      Tạo PDF mẫu
                    </Button>

                    <label className="inline-flex">
                      <input
                        type="file"
                        accept="application/pdf"
                        multiple
                        className="hidden"
                        onChange={(e) => {
                          handleAddTransferEvidenceFiles(e.target.files, 'manual');
                          e.target.value = '';
                        }}
                      />
                      <span className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground">
                        <span className="material-symbols-outlined text-lg">upload_file</span>
                        Tải PDF lên
                      </span>
                    </label>
                  </div>
                </div>

                {transferEvidenceFiles.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-border bg-background/60 p-4 text-sm text-muted-foreground">
                    Chưa có PDF nào được đính kèm. Bạn có thể tạo PDF mẫu hoặc tải nhiều file PDF có
                    sẵn.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {transferEvidenceFiles.map((evidence) => (
                      <div
                        key={evidence.id}
                        className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 lg:flex-row lg:items-center lg:justify-between"
                      >
                        <div className="min-w-0">
                          <p className="font-medium text-foreground break-all">
                            {evidence.file.name}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {evidence.source === 'generated'
                              ? 'PDF tạo từ biểu mẫu'
                              : 'PDF tải lên thủ công'}{' '}
                            • {formatNumberVN(Math.round(evidence.file.size / 1024))} KB
                          </p>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <Button variant="outline" size="sm" asChild>
                            <a
                              href={URL.createObjectURL(evidence.file)}
                              target="_blank"
                              rel="noreferrer"
                            >
                              Xem PDF
                            </a>
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive"
                            onClick={() => handleRemoveTransferEvidenceFile(evidence.id)}
                          >
                            Xóa
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <DialogFooter className="border-t border-border px-6 py-4 bg-muted/40 flex justify-end gap-2 shrink-0">
            <Button variant="outline" onClick={handleClearTransferDraft}>
              <span className="material-symbols-outlined mr-1">remove_done</span>
              Xóa nháp
            </Button>
            <Button variant="destructive" onClick={() => setOpenTransferRequest(false)}>
              <span className="material-symbols-outlined mr-1">close</span>
              Hủy
            </Button>
            <Button
              variant="primary"
              className="gap-2"
              disabled={createSupplyTransferStatus === 'pending' || isUploadingTransferEvidence}
              onClick={() => void handleSubmitTransferRequest()}
            >
              <span className="material-symbols-outlined text-lg">send</span>
              {createSupplyTransferStatus === 'pending' || isUploadingTransferEvidence
                ? 'Đang gửi...'
                : 'Gửi phiếu điều phối'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <TransferPdfWorkflowDialog
        open={openTransferPdfWorkflow}
        onOpenChange={setOpenTransferPdfWorkflow}
        data={transferPdfData}
        onAttachPdf={(file) => handleAddTransferEvidenceFiles([file], 'generated')}
      />

      <Dialog
        open={openApproveTransfer}
        onOpenChange={(open) => {
          setOpenApproveTransfer(open);
          if (!open) setSelectedTransferId(null);
        }}
      >
        <DialogContent className="!max-w-none w-[96vw] max-w-5xl h-[92vh] overflow-hidden p-0 flex flex-col">
          <DialogHeader className="px-6 py-4 border-b border-border shrink-0">
            <DialogTitle>Phê duyệt phiếu điều phối</DialogTitle>
            <DialogDescription>
              Điền số lượng thực tế, số tiền, số tiền bằng chữ, ký vào ô người phê duyệt và lưu PDF
              vào hồ sơ phiếu.
            </DialogDescription>
          </DialogHeader>

          {selectedTransfer ? (
            <div className="flex-1 min-h-0 overflow-y-auto p-6">
              <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
                <section className="rounded-3xl border border-sky-500/20 bg-gradient-to-br from-sky-500/10 via-background to-background p-5 shadow-sm">
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge
                          variant="outline"
                          appearance="outline"
                          className={`border ${TRANSFER_STATUS_CLASS[selectedTransfer.status] || 'bg-gray-500/10 text-gray-600 border-gray-500/20'}`}
                        >
                          {selectedTransfer.statusName ||
                            TRANSFER_STATUS_LABEL[selectedTransfer.status] ||
                            'Không rõ'}
                        </Badge>
                        <span className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                          Hồ sơ phê duyệt
                        </span>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-foreground break-all">
                          {selectedTransfer.transferCode || selectedTransfer.id}
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          Kiểm tra số lượng thực tế, thông tin phê duyệt và PDF trước khi xác nhận.
                        </p>
                      </div>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2 md:min-w-[320px]">
                      {selectedTransferMetaRows.slice(4).map((meta) => (
                        <div
                          key={meta.label}
                          className="rounded-2xl border border-border bg-background/80 p-3"
                        >
                          <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                            {meta.label}
                          </p>
                          <p className="mt-1 text-lg font-semibold text-foreground">{meta.value}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    {selectedTransferMetaRows.slice(0, 4).map((meta) => (
                      <div
                        key={meta.label}
                        className="rounded-2xl border border-border bg-background/80 p-4"
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${meta.tone}`}
                          >
                            <span className="material-symbols-outlined text-[20px]">
                              {meta.icon}
                            </span>
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                              {meta.label}
                            </p>
                            <p className="mt-1 text-sm font-semibold text-foreground break-words">
                              {meta.value}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="rounded-3xl border border-border bg-card p-5 shadow-sm">
                  <div className="mb-4">
                    <p className="text-base font-semibold text-foreground">
                      Danh sách vật phẩm cần xử lý
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Điền số lượng thực tế để nội dung phê duyệt và PDF phản ánh đúng lô hàng sẽ
                      được duyệt.
                    </p>
                  </div>

                  <div className="space-y-3">
                    {(selectedTransfer.items || []).map((item, index) => {
                      const matchedSupply = supplyMap.get(item.supplyItemId);
                      const fieldKey = `${item.supplyItemId}-${index}`;
                      return (
                        <div
                          key={fieldKey}
                          className="rounded-2xl border border-border bg-muted/10 p-4"
                        >
                          <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_220px] md:items-start">
                            <div className="min-w-0 space-y-3">
                              <div className="flex items-start gap-3">
                                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-border bg-background text-primary">
                                  <span className="material-symbols-outlined text-[20px]">
                                    {matchedSupply
                                      ? getSupplyCategoryIcon(matchedSupply.category)
                                      : 'inventory_2'}
                                  </span>
                                </div>
                                <div className="min-w-0 flex-1 space-y-2">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <p className="text-base font-semibold text-foreground break-words">
                                      {item.supplyItemName ||
                                        matchedSupply?.name ||
                                        item.supplyItemId}
                                    </p>
                                    {matchedSupply && (
                                      <Badge
                                        variant="outline"
                                        appearance="outline"
                                        size="xs"
                                        className={`gap-1 border ${getSupplyCategoryClass(matchedSupply.category)}`}
                                      >
                                        <span className="material-symbols-outlined text-[14px]">
                                          {getSupplyCategoryIcon(matchedSupply.category)}
                                        </span>
                                        {getSupplyCategoryLabel(matchedSupply.category)}
                                      </Badge>
                                    )}
                                  </div>
                                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                                    <span>
                                      Yêu cầu:{' '}
                                      <span className="font-semibold text-foreground">
                                        {formatNumberVN(
                                          item.requestedQuantity ?? item.quantity ?? 0,
                                        )}{' '}
                                        {matchedSupply?.unit || ''}
                                      </span>
                                    </span>
                                    <span>Mã: {item.supplyItemId}</span>
                                  </div>
                                  {item.notes && (
                                    <p className="text-sm leading-6 text-muted-foreground">
                                      <span className="font-medium text-foreground">Ghi chú:</span>{' '}
                                      {item.notes}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="space-y-2 rounded-2xl border border-border bg-background/80 p-3">
                              <label className="text-sm font-medium text-foreground">
                                SL thực tế
                              </label>
                              <Input
                                value={formatNumberInputVN(
                                  approveTransferForm.actualQuantities[fieldKey] ??
                                    item.actualQuantity ??
                                    item.requestedQuantity ??
                                    item.quantity ??
                                    0,
                                )}
                                onChange={(e) =>
                                  setApproveTransferForm((prev) => ({
                                    ...prev,
                                    actualQuantities: {
                                      ...prev.actualQuantities,
                                      [fieldKey]: parseFormattedNumber(e.target.value),
                                    },
                                  }))
                                }
                              />
                              <p className="text-xs text-muted-foreground">
                                Đơn vị: {matchedSupply?.unit || 'Đơn vị'}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>

                <section className="rounded-3xl border border-border bg-card p-5 shadow-sm">
                  <div className="mb-4">
                    <p className="text-base font-semibold text-foreground">Thông tin phê duyệt</p>
                    <p className="text-sm text-muted-foreground">
                      Dữ liệu bên dưới sẽ được dùng để tạo nội dung PDF lưu cùng hồ sơ phiếu.
                    </p>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">Người phê duyệt</label>
                      <Input
                        value={approveTransferForm.approverName}
                        onChange={(e) =>
                          setApproveTransferForm((prev) => ({
                            ...prev,
                            approverName: e.target.value,
                          }))
                        }
                        placeholder="Nhập tên người phê duyệt"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">
                        Số tiền tham chiếu
                      </label>
                      <Input
                        value={approveTransferForm.referenceAmount}
                        onChange={(e) =>
                          setApproveTransferForm((prev) => ({
                            ...prev,
                            referenceAmount: formatNumberInputVN(
                              parseFormattedNumber(e.target.value),
                            ),
                          }))
                        }
                        placeholder="Ví dụ: 12.500.000"
                      />
                    </div>
                  </div>

                  <div className="mt-4 rounded-2xl border border-border bg-muted/10 p-4 text-sm text-muted-foreground">
                    <p className="font-medium text-foreground">Số tiền bằng chữ</p>
                    <p className="mt-1 leading-6">
                      {convertNumberToVietnameseWords(
                        parseFormattedNumber(approveTransferForm.referenceAmount || '0'),
                      ) || 'Chưa có dữ liệu'}
                    </p>
                  </div>

                  <div className="mt-4 space-y-3">
                    <p className="text-sm font-medium text-foreground">Chữ ký người phê duyệt</p>
                    <PdfSignaturePad
                      height={240}
                      helperText="Ký trong khung lớn để nét chữ rõ hơn khi nhúng vào PDF. Sau khi ký, bấm “Lưu chữ ký”."
                      onSave={(dataUrl) =>
                        setApproveTransferForm((prev) => ({
                          ...prev,
                          approverSignatureDataUrl: dataUrl,
                        }))
                      }
                    />
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2 rounded-2xl border border-border bg-muted/10 p-4">
                    <Button
                      variant="primary"
                      className="gap-2"
                      onClick={async () => {
                        if (!selectedTransferPdfData) return;
                        const builtPdf = await buildTransferPdf(selectedTransferPdfData);
                        setApproveTransferForm((prev) => ({ ...prev, pdfBytes: builtPdf }));
                      }}
                    >
                      <span className="material-symbols-outlined text-lg">picture_as_pdf</span>
                      Tạo / làm mới PDF phê duyệt
                    </Button>
                    <Button
                      variant="outline"
                      className="gap-2"
                      onClick={async () => {
                        if (
                          !selectedTransferPdfData ||
                          !approveTransferForm.approverSignatureDataUrl
                        ) {
                          toast.error('Hãy tạo PDF và lưu chữ ký người phê duyệt trước.');
                          return;
                        }

                        const existingPdfUrl = (selectedTransfer.evidenceUrls || []).find((url) =>
                          url.toLowerCase().includes('.pdf'),
                        );

                        const basePdfBytes = existingPdfUrl
                          ? await updateTransferPdfApprovalData(
                              new Uint8Array(await (await fetch(existingPdfUrl)).arrayBuffer()),
                              selectedTransferPdfData,
                            )
                          : await buildTransferPdf(selectedTransferPdfData);

                        const signedPdf = await attachSignatureToPdf(
                          basePdfBytes,
                          approveTransferForm.approverSignatureDataUrl,
                          {
                            signerName:
                              approveTransferForm.approverName.trim() || 'Người phê duyệt',
                            box: 'approver',
                          },
                        );

                        setApproveTransferForm((prev) => ({ ...prev, pdfBytes: signedPdf }));
                        toast.success(
                          'Đã cập nhật thông tin mới và nhúng chữ ký vào PDF để xem trước.',
                        );
                      }}
                    >
                      <span className="material-symbols-outlined text-lg">draw</span>
                      Cập nhật thông tin & nhúng chữ ký vào PDF
                    </Button>
                    <p className="basis-full text-xs text-muted-foreground">
                      Hệ thống luôn dựng lại PDF từ dữ liệu phiếu mới nhất, nên số tiền tham chiếu,
                      bằng chữ và số lượng thực tế sẽ được cập nhật đúng trước khi nhúng chữ ký.
                    </p>
                  </div>
                </section>

                <section className="rounded-3xl border border-border bg-card p-5 shadow-sm">
                  <PdfPreviewCard
                    pdfBytes={approveTransferForm.pdfBytes}
                    title="Xem trước PDF phê duyệt"
                    className="min-h-[760px] w-full overflow-hidden"
                  />
                </section>

                <section className="rounded-3xl border border-border bg-card p-5 shadow-sm">
                  <div className="mb-4">
                    <p className="text-base font-semibold text-foreground">
                      Bằng chứng PDF hiện có
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Kiểm tra nhanh các file PDF đã lưu trong hồ sơ phiếu.
                    </p>
                  </div>

                  {(selectedTransfer.evidenceUrls || []).length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-border bg-muted/10 p-4 text-sm text-muted-foreground">
                      Chưa có PDF/bằng chứng nào được lưu.
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {(selectedTransfer.evidenceUrls || []).map((url, index) => (
                        <div
                          key={`${url}-${index}`}
                          className="overflow-hidden rounded-2xl border border-border bg-muted/10"
                        >
                          <div className="flex flex-col gap-3 border-b border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-foreground">
                                PDF #{index + 1}
                              </p>
                              <p className="text-xs text-muted-foreground break-all">{url}</p>
                            </div>
                            <Button variant="outline" size="sm" asChild>
                              <a href={url} target="_blank" rel="noreferrer">
                                Mở link
                              </a>
                            </Button>
                          </div>
                          <div className="p-4">
                            <iframe
                              title={`pdf-evidence-${index}`}
                              src={url}
                              className="h-[420px] w-full rounded-xl border border-border bg-background"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              </div>
            </div>
          ) : (
            <div className="p-6 text-sm text-muted-foreground">Chưa chọn phiếu điều phối.</div>
          )}

          <DialogFooter className="border-t border-border px-6 py-4 bg-muted/40 flex justify-end gap-2 shrink-0">
            <Button
              variant="outline"
              onClick={async () => {
                if (!selectedTransferPdfData) return;
                const builtPdf = await buildTransferPdf(selectedTransferPdfData);
                setApproveTransferForm((prev) => ({ ...prev, pdfBytes: builtPdf }));
              }}
            >
              Xem trước PDF
            </Button>
            <Button variant="outline" onClick={() => setOpenApproveTransfer(false)}>
              Đóng
            </Button>
            <Button
              variant="primary"
              className="gap-2"
              disabled={approveTransferStatus === 'pending' || isUploadingTransferEvidence}
              onClick={() => {
                void handleApproveTransfer();
              }}
            >
              {approveTransferStatus === 'pending' || isUploadingTransferEvidence
                ? 'Đang phê duyệt...'
                : 'Phê duyệt và lưu PDF'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={openShipTransfer}
        onOpenChange={(open) => {
          setOpenShipTransfer(open);
          if (!open) setSelectedTransferId(null);
        }}
      >
        <DialogContent className="max-w-2xl overflow-hidden p-0">
          <DialogHeader className="border-b border-border bg-gradient-to-r from-sky-500/10 via-background to-background px-6 py-5">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-sky-500/15 text-sky-600">
                <span className="material-symbols-outlined text-[24px]">local_shipping</span>
              </div>
              <div className="space-y-1">
                <DialogTitle>Chuyển phiếu sang “Đang vận chuyển”</DialogTitle>
                <DialogDescription>
                  Xác nhận khi hàng đã rời kho nguồn hoặc đơn vị vận chuyển đã tiếp nhận lô hàng.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-5 px-6 py-5">
            <div className="grid gap-3 rounded-2xl border border-border bg-muted/10 p-4 sm:grid-cols-2">
              {selectedTransferSummaryCompact.map((item) => (
                <div key={item.label} className="space-y-1 rounded-xl bg-background/80 p-3">
                  <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
                    {item.label}
                  </p>
                  <p className="text-sm font-semibold text-foreground break-words">{item.value}</p>
                </div>
              ))}
            </div>

            <div className="rounded-2xl border border-sky-500/20 bg-sky-500/5 p-4 text-sm text-muted-foreground">
              Sau bước này, phiếu sẽ được đánh dấu là{' '}
              <span className="font-semibold text-sky-700">Đang vận chuyển</span> để đội nhận hàng
              theo dõi tiến độ. Chưa phát sinh nhập kho đích ở bước này.
            </div>
          </div>

          <DialogFooter className="border-t border-border bg-muted/30 px-6 py-4">
            <DialogClose asChild>
              <Button variant="outline">Đóng</Button>
            </DialogClose>
            <Button
              variant="primary"
              className="gap-2"
              disabled={shipTransferStatus === 'pending'}
              onClick={() => {
                void handleShipTransfer();
              }}
            >
              <span className="material-symbols-outlined text-lg">local_shipping</span>
              {shipTransferStatus === 'pending' ? 'Đang cập nhật...' : 'Xác nhận đang vận chuyển'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={openReceiveTransfer}
        onOpenChange={(open) => {
          setOpenReceiveTransfer(open);
          if (!open) setSelectedTransferId(null);
        }}
      >
        <DialogContent className="max-w-2xl overflow-hidden p-0">
          <DialogHeader className="border-b border-border bg-gradient-to-r from-emerald-500/10 via-background to-background px-6 py-5">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-600">
                <span className="material-symbols-outlined text-[24px]">inventory_2</span>
              </div>
              <div className="space-y-1">
                <DialogTitle>Xác nhận “Đã nhận hàng”</DialogTitle>
                <DialogDescription>
                  Dùng khi kho đích đã tiếp nhận hàng và sẵn sàng ghi nhận nhập kho theo số lượng
                  thực nhận.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-5 px-6 py-5">
            <div className="grid gap-3 rounded-2xl border border-border bg-muted/10 p-4 sm:grid-cols-2">
              {selectedTransferSummaryCompact.map((item) => (
                <div key={item.label} className="space-y-1 rounded-xl bg-background/80 p-3">
                  <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
                    {item.label}
                  </p>
                  <p className="text-sm font-semibold text-foreground break-words">{item.value}</p>
                </div>
              ))}
            </div>

            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-sm text-muted-foreground">
              Khi xác nhận, hệ thống sẽ tạo giao dịch{' '}
              <span className="font-semibold text-emerald-700">nhập kho đích</span> theo số lượng
              thực nhận của từng vật phẩm trong phiếu.
            </div>
          </div>

          <DialogFooter className="border-t border-border bg-muted/30 px-6 py-4">
            <DialogClose asChild>
              <Button variant="outline">Đóng</Button>
            </DialogClose>
            <Button
              variant="primary"
              className="gap-2"
              disabled={receiveTransferStatus === 'pending'}
              onClick={() => {
                void handleReceiveTransfer();
              }}
            >
              <span className="material-symbols-outlined text-lg">check_circle</span>
              {receiveTransferStatus === 'pending' ? 'Đang xác nhận...' : 'Xác nhận đã nhận hàng'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={openCancelTransfer}
        onOpenChange={(open) => {
          setOpenCancelTransfer(open);
          if (!open) setSelectedTransferId(null);
        }}
        title="Hủy phiếu điều phối"
        description={`${selectedTransferSummary.join(' • ')}. Thao tác này sẽ chuyển phiếu sang trạng thái đã hủy.`}
        confirmText={cancelTransferStatus === 'pending' ? 'Đang hủy...' : 'Hủy phiếu'}
        cancelText="Đóng"
        variant="destructive"
        onConfirm={() => {
          void handleCancelTransfer();
        }}
      />

      <Dialog open={openTransferDetail} onOpenChange={setOpenTransferDetail}>
        <DialogContent className="!max-w-none w-[95vw] max-w-5xl h-[90vh] p-0 overflow-hidden flex flex-col">
          <DialogHeader className="px-6 py-4 border-b border-border shrink-0">
            <DialogTitle>Chi tiết phiếu điều phối</DialogTitle>
            <DialogDescription>
              {isLoadingTransferDetails
                ? 'Đang tải chi tiết phiếu điều phối...'
                : 'Thông tin đầy đủ của phiếu điều phối đang chọn.'}
            </DialogDescription>
          </DialogHeader>

          {selectedTransfer ? (
            <div className="flex-1 min-h-0 overflow-y-auto p-6">
              <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
                <section className="rounded-3xl border border-sky-500/20 bg-gradient-to-br from-sky-500/10 via-background to-background p-5 shadow-sm">
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge
                          variant="outline"
                          appearance="outline"
                          className={`border ${TRANSFER_STATUS_CLASS[selectedTransfer.status] || 'bg-gray-500/10 text-gray-600 border-gray-500/20'}`}
                        >
                          {selectedTransfer.statusName ||
                            TRANSFER_STATUS_LABEL[selectedTransfer.status] ||
                            'Không rõ'}
                        </Badge>
                        <span className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                          Transfer detail
                        </span>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-foreground break-all">
                          {selectedTransfer.transferCode || selectedTransfer.id}
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          Thông tin tổng quan của phiếu được gom theo từng nhóm để dễ đọc và rà soát
                          nhanh.
                        </p>
                      </div>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2 md:min-w-[320px]">
                      <div className="rounded-2xl border border-border bg-background/80 p-3">
                        <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                          Tổng dòng vật phẩm
                        </p>
                        <p className="mt-1 text-lg font-semibold text-foreground">
                          {formatNumberVN(
                            selectedTransfer.totalRequestedItems ||
                              selectedTransfer.items?.length ||
                              0,
                          )}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-border bg-background/80 p-3">
                        <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                          Tổng số lượng
                        </p>
                        <p className="mt-1 text-lg font-semibold text-foreground">
                          {formatNumberVN(selectedTransfer.totalRequestedQuantity || 0)}
                        </p>
                      </div>
                    </div>
                  </div>
                </section>

                {(() => {
                  const parsedNotes = parseTransferNotes(selectedTransfer.notes);
                  return (
                    <section className="grid gap-4 md:grid-cols-2">
                      <div className="rounded-3xl border border-border bg-card p-5 shadow-sm">
                        <p className="mb-4 text-base font-semibold text-foreground">
                          Thông tin điều phối
                        </p>
                        <div className="space-y-4">
                          {[
                            {
                              icon: 'warehouse',
                              tone: 'bg-sky-500/10 text-sky-600',
                              label: 'Kho / trạm nguồn',
                              value:
                                selectedTransfer.sourceStationName ||
                                selectedTransfer.sourceStationId ||
                                '—',
                            },
                            {
                              icon: 'south_east',
                              tone: 'bg-emerald-500/10 text-emerald-600',
                              label: 'Kho đích',
                              value:
                                selectedTransfer.destinationStationName ||
                                selectedTransfer.destinationStationId ||
                                '—',
                            },
                            {
                              icon: 'person',
                              tone: 'bg-amber-500/10 text-amber-600',
                              label: 'Người yêu cầu',
                              value: selectedTransfer.requestedByName || 'Chưa rõ',
                            },
                            {
                              icon: 'schedule',
                              tone: 'bg-violet-500/10 text-violet-600',
                              label: 'Ngày tạo',
                              value: selectedTransfer.createdAt
                                ? new Date(selectedTransfer.createdAt).toLocaleString('vi-VN')
                                : 'Chưa có dữ liệu',
                            },
                          ].map((meta) => (
                            <div key={meta.label} className="flex items-start gap-3">
                              <div
                                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${meta.tone}`}
                              >
                                <span className="material-symbols-outlined text-[20px]">
                                  {meta.icon}
                                </span>
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                                  {meta.label}
                                </p>
                                <p className="mt-1 text-sm font-medium text-foreground break-words">
                                  {meta.value}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="rounded-3xl border border-border bg-card p-5 shadow-sm">
                        <p className="mb-4 text-base font-semibold text-foreground">
                          Lý do & ghi chú
                        </p>
                        <div className="space-y-4 text-sm">
                          <div className="rounded-2xl border border-border bg-muted/10 p-4">
                            <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                              Lý do điều phối
                            </p>
                            <p className="mt-2 leading-6 text-foreground">
                              {selectedTransfer.reason || parsedNotes.reason || 'Không có lý do'}
                            </p>
                          </div>
                          <div className="rounded-2xl border border-border bg-muted/10 p-4">
                            <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                              Ghi chú chung
                            </p>
                            <p className="mt-2 leading-6 text-foreground">
                              {parsedNotes.note || parsedNotes.raw || 'Không có ghi chú'}
                            </p>
                          </div>
                          {(parsedNotes.approvalAmount ||
                            parsedNotes.approvalAmountInWords ||
                            parsedNotes.approver) && (
                            <div className="rounded-2xl border border-border bg-muted/10 p-4">
                              <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                                Thông tin phê duyệt
                              </p>
                              <div className="mt-2 space-y-2 text-foreground">
                                {parsedNotes.approvalAmount && (
                                  <p>
                                    <span className="font-medium">Số tiền:</span>{' '}
                                    {parsedNotes.approvalAmount}
                                  </p>
                                )}
                                {parsedNotes.approvalAmountInWords && (
                                  <p>
                                    <span className="font-medium">Bằng chữ:</span>{' '}
                                    {parsedNotes.approvalAmountInWords}
                                  </p>
                                )}
                                {parsedNotes.approver && (
                                  <p>
                                    <span className="font-medium">Người phê duyệt:</span>{' '}
                                    {parsedNotes.approver}
                                  </p>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </section>
                  );
                })()}

                <section className="rounded-3xl border border-border bg-card p-5 shadow-sm">
                  <div className="mb-4">
                    <p className="text-base font-semibold text-foreground">Danh sách vật phẩm</p>
                    <p className="text-sm text-muted-foreground">
                      Mỗi dòng hiển thị rõ vật phẩm, danh mục, số lượng yêu cầu và số lượng thực tế
                      nếu đã có.
                    </p>
                  </div>

                  <div className="space-y-3">
                    {(selectedTransfer.items || []).length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-border bg-muted/10 p-4 text-sm text-muted-foreground">
                        Phiếu này chưa có dữ liệu vật phẩm chi tiết.
                      </div>
                    ) : (
                      selectedTransfer.items.map((item, index) => {
                        const matchedSupply = supplyMap.get(item.supplyItemId);
                        return (
                          <div
                            key={`${selectedTransfer.id}-${item.supplyItemId}-${index}`}
                            className="rounded-2xl border border-border bg-muted/10 p-4"
                          >
                            <div className="flex items-start gap-3">
                              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-border bg-background text-primary">
                                <span className="material-symbols-outlined text-[20px]">
                                  {matchedSupply
                                    ? getSupplyCategoryIcon(matchedSupply.category)
                                    : 'inventory_2'}
                                </span>
                              </div>
                              <div className="min-w-0 flex-1 space-y-2">
                                <div className="flex flex-wrap items-center gap-2">
                                  <p className="text-base font-semibold text-foreground break-words">
                                    {item.supplyItemName ||
                                      matchedSupply?.name ||
                                      item.supplyItemId}
                                  </p>
                                  {matchedSupply && (
                                    <Badge
                                      variant="outline"
                                      appearance="outline"
                                      size="xs"
                                      className={`gap-1 border ${getSupplyCategoryClass(matchedSupply.category)}`}
                                    >
                                      <span className="material-symbols-outlined text-[14px]">
                                        {getSupplyCategoryIcon(matchedSupply.category)}
                                      </span>
                                      {getSupplyCategoryLabel(matchedSupply.category)}
                                    </Badge>
                                  )}
                                </div>
                                <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                                  <span>
                                    Yêu cầu:{' '}
                                    <span className="font-semibold text-foreground">
                                      {formatNumberVN(item.requestedQuantity ?? item.quantity ?? 0)}
                                      {matchedSupply?.unit ? ` ${matchedSupply.unit}` : ''}
                                    </span>
                                  </span>
                                  {typeof item.actualQuantity === 'number' && (
                                    <span>
                                      Thực tế:{' '}
                                      <span className="font-semibold text-foreground">
                                        {formatNumberVN(item.actualQuantity)}
                                        {matchedSupply?.unit ? ` ${matchedSupply.unit}` : ''}
                                      </span>
                                    </span>
                                  )}
                                  <span>Mã: {item.supplyItemId}</span>
                                </div>
                                {item.notes && (
                                  <p className="text-sm leading-6 text-muted-foreground">
                                    <span className="font-medium text-foreground">Ghi chú:</span>{' '}
                                    {item.notes}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </section>

                <section className="rounded-3xl border border-border bg-card p-5 shadow-sm">
                  <div className="mb-4">
                    <p className="text-base font-semibold text-foreground">PDF / evidence đã lưu</p>
                    <p className="text-sm text-muted-foreground">
                      Khu vực xem file được đặt bên dưới để tránh chật ngang và hạn chế tràn khung
                      preview.
                    </p>
                  </div>

                  {(selectedTransfer.evidenceUrls || []).length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-border bg-muted/10 p-4 text-sm text-muted-foreground">
                      Chưa có evidence URL nào.
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {(selectedTransfer.evidenceUrls || []).map((url, index) => (
                        <div
                          key={`${url}-${index}`}
                          className="overflow-hidden rounded-2xl border border-border bg-muted/10"
                        >
                          <div className="flex flex-col gap-3 border-b border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                            <div className="min-w-0">
                              <p className="font-medium text-foreground">PDF #{index + 1}</p>
                              <p className="text-xs text-muted-foreground break-all">{url}</p>
                            </div>
                            <Button variant="outline" size="sm" asChild>
                              <a href={url} target="_blank" rel="noreferrer">
                                Mở file
                              </a>
                            </Button>
                          </div>
                          <div className="p-4">
                            <iframe
                              title={`transfer-detail-pdf-${index}`}
                              src={url}
                              className="h-[420px] w-full rounded-xl border border-border bg-background"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              </div>
            </div>
          ) : (
            <div className="p-6 text-sm text-muted-foreground">Chưa chọn phiếu điều phối.</div>
          )}

          <DialogFooter className="border-t border-border px-6 py-4 bg-muted/40 flex justify-end gap-2 shrink-0">
            <Button variant="outline" onClick={() => setOpenTransferDetail(false)}>
              Đóng
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Edit Min/Max Stock Dialog ── */}
      <Dialog
        open={editStockDialog.open}
        onOpenChange={(open) => {
          if (!open)
            setEditStockDialog({
              open: false,
              stockId: '',
              supplyName: '',
              minValue: '',
              maxValue: '',
            });
        }}
      >
        <DialogContent className="max-w-none w-[95vw] h-[50vh] p-0 overflow-hidden flex flex-col">
          <DialogHeader className="px-6 py-4 border-b border-border shrink-0">
            <DialogTitle className="text-lg font-bold text-foreground">
              Chỉnh ngưỡng tồn kho
            </DialogTitle>
            <DialogDescription>
              Cập nhật mức tồn tối thiểu và tối đa cho{' '}
              <span className="font-medium text-foreground">{editStockDialog.supplyName}</span>.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 min-h-0 overflow-y-auto p-2 space-y-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Ngưỡng tối thiểu (Min)</label>
              <Input
                value={formatNumberInputVN(editStockDialog.minValue)}
                className={editStockErrors['minValue'] ? 'border-red-500 focus:ring-red-500' : ''}
                onChange={(e) => {
                  setEditStockDialog((prev) => ({
                    ...prev,
                    minValue: String(parseFormattedNumber(e.target.value)),
                  }));
                  setEditStockErrors((prev) => {
                    const next = { ...prev };
                    delete next['minValue'];
                    return next;
                  });
                }}
              />
              {editStockErrors['minValue'] && (
                <p className="text-xs text-red-500 flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">error</span>
                  {editStockErrors['minValue']}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Ngưỡng tối đa (Max)</label>
              <Input
                value={formatNumberInputVN(editStockDialog.maxValue)}
                className={editStockErrors['maxValue'] ? 'border-red-500 focus:ring-red-500' : ''}
                onChange={(e) => {
                  setEditStockDialog((prev) => ({
                    ...prev,
                    maxValue: String(parseFormattedNumber(e.target.value)),
                  }));
                  setEditStockErrors((prev) => {
                    const next = { ...prev };
                    delete next['maxValue'];
                    return next;
                  });
                }}
              />
              {editStockErrors['maxValue'] && (
                <p className="text-xs text-red-500 flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">error</span>
                  {editStockErrors['maxValue']}
                </p>
              )}
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">info</span>
                <span className="text-xs text-muted-foreground">
                  Đặt ít nhất là 1 nếu không giới quá nhiều sức chứa tối đa.
                </span>
              </p>
            </div>
          </div>

          <DialogFooter className="border-t border-border px-6 py-4 bg-muted/40 flex justify-end gap-2 shrink-0">
            <Button variant="outline" onClick={handleClearEditStockDraft}>
              Xóa nháp
            </Button>
            <Button
              variant="outline"
              onClick={() =>
                setEditStockDialog({
                  open: false,
                  stockId: '',
                  supplyName: '',
                  minValue: '',
                  maxValue: '',
                })
              }
            >
              Hủy
            </Button>
            <Button
              variant="primary"
              className="gap-2"
              disabled={updateStockStatus === 'pending'}
              onClick={() => void handleSaveEditStock()}
            >
              <span className="material-symbols-outlined text-lg">save</span>
              {updateStockStatus === 'pending' ? 'Đang lưu...' : 'Lưu thay đổi'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
