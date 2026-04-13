import { useEffect, useMemo, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
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
import {
  useCreateSupplyTransfer,
  useSupplyTransferDetails,
  useSupplyTransfersByDestinationStation,
  useSupplyTransfersBySourceStation,
  useApproveSupplyTransfer,
  useShipSupplyTransfer,
  useReceiveSupplyTransfer,
  useCancelSupplyTransfer,
} from '@/hooks/useSupplyTransfers';
import { useCampaigns } from '@/hooks/useCampaigns';
import { formatNumberVN } from '@/lib/utils';
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

function parseTransferNotes(note?: string | null): {
  reason?: string;
  note?: string;
  raw?: string;
} {
  if (!note) return {};

  const match = note.match(/^Reason:\s*(.*?)\s*(?:\|\s*Notes:\s*(.*))?$/i);
  if (!match) {
    return { raw: note };
  }

  return {
    reason: match[1]?.trim() || undefined,
    note: match[2]?.trim() || undefined,
  };
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
  const [selectedTransferId, setSelectedTransferId] = useState<string | null>(null);
  const [openOutgoingTransferSection, setOpenOutgoingTransferSection] = useState(true);
  const [openActionableTransferSection, setOpenActionableTransferSection] = useState(true);
  const [outgoingTransferPage, setOutgoingTransferPage] = useState(1);
  const [actionableTransferPage, setActionableTransferPage] = useState(1);

  const [selectedQuickImportSupplyItemId, setSelectedQuickImportSupplyItemId] = useState('');
  const [transferNewItemSupplyId, setTransferNewItemSupplyId] = useState('');
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

  const { data: inventoriesResponse, isLoading: isLoadingInventories } = useInventories({
    reliefStationId: station?.reliefStationId,
    pageIndex: 1,
    pageSize: 20,
  });

  const { data: upstreamStationsResponse } = useProvincialStations({
    level: InventoryLevel.Regional,
    pageIndex: 1,
    pageSize: 100,
  });

  const { data: allInventoriesResponse } = useInventories({
    pageIndex: 1,
    pageSize: 200,
  });

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
  const { campaigns: allCampaigns } = useCampaigns({
    pageIndex: 1,
    pageSize: 200,
    locationId: station?.locationId || undefined,
  });

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

  /** For quick-import: map supplyItemId → first stock row */
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

  const isLoading =
    isLoadingStation || isLoadingInventories || isLoadingStocks || isLoadingSupplyItems;

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
    setOpenCreate(true);
  };

  const handleOpenTransferRequest = () => {
    setTransferErrors({});
    setTransferForm((prev) => ({
      ...prev,
      sourceStationId: prev.sourceStationId || upstreamSourceStations[0]?.stationId || '',
    }));
    setTransferNewItemSupplyId('');
    setOpenTransferRequest(true);
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

    await createSupplyTransfer({
      sourceStationId: transferForm.sourceStationId,
      destinationStationId: station.reliefStationId,
      reason: transferForm.reason.trim(),
      notes: transferForm.notes.trim(),
      evidenceUrls: [],
      items: validItems,
    });

    await Promise.all([refetchStocks(), refetchTransactions()]);
    clearDialogDraft(TRANSFER_REQUEST_DRAFT_KEY);
    setTransferForm({ sourceStationId: '', reason: '', notes: '', items: [] });
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
      await approveTransfer({ id: selectedTransfer.id, data: { evidenceUrls: [] } });

      await Promise.all([
        refetchStocks(),
        refetchTransactions(),
        refetchSourceTransfers(),
        refetchDestinationTransfers(),
      ]);
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
    await shipTransfer({ id: selectedTransfer.id, data: { evidenceUrls: [] } });
    await Promise.all([refetchSourceTransfers(), refetchDestinationTransfers()]);
    setOpenShipTransfer(false);
    setSelectedTransferId(null);
  };

  const handleReceiveTransfer = async () => {
    if (!selectedTransfer) return;

    await receiveTransfer({
      id: selectedTransfer.id,
      data: {
        evidenceUrls: [],
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
    await cancelTransfer({ id: selectedTransfer.id, data: { evidenceUrls: [] } });
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
          <Button variant="primary" className="gap-2" onClick={() => setOpenCreate(true)}>
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
        onOpenChange={setOpenCreate}
        supplyItems={supplyItems.map((item) => ({
          id: item.id,
          name: item.name,
          category: getSupplyCategoryLabel(item.category),
          icon: getSupplyCategoryIcon(item.category),
          iconUrl: item.iconUrl || getSupplyCategoryIcon(item.category),
          unit: item.unit,
        }))}
        initialSupplyItemId={selectedQuickImportSupplyItemId}
        existingStock={
          selectedQuickImportSupplyItemId
            ? stockMapBySupplyItemId.get(selectedQuickImportSupplyItemId) || null
            : null
        }
        onSubmit={async (item) => {
          const success = await handleImportItem(item);
          if (!success) return;
          setSelectedQuickImportSupplyItemId('');
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
                                  type="number"
                                  min={1}
                                  value={item.quantity}
                                  onChange={(e) =>
                                    updateTransferItem(
                                      item.supplyItemId,
                                      'quantity',
                                      Number(e.target.value || 1),
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
              disabled={createSupplyTransferStatus === 'pending'}
              onClick={() => void handleSubmitTransferRequest()}
            >
              <span className="material-symbols-outlined text-lg">send</span>
              {createSupplyTransferStatus === 'pending' ? 'Đang gửi...' : 'Gửi phiếu điều phối'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={openApproveTransfer}
        onOpenChange={(open) => {
          setOpenApproveTransfer(open);
          if (!open) setSelectedTransferId(null);
        }}
        title="Phê duyệt phiếu điều phối"
        description={`${selectedTransferSummary.join(' • ')}. Phiếu sẽ chuyển sang trạng thái đã duyệt và sẵn sàng giao hàng.`}
        confirmText={approveTransferStatus === 'pending' ? 'Đang phê duyệt...' : 'Phê duyệt phiếu'}
        cancelText="Đóng"
        variant="success"
        onConfirm={() => {
          void handleApproveTransfer();
        }}
      />

      <ConfirmDialog
        open={openShipTransfer}
        onOpenChange={(open) => {
          setOpenShipTransfer(open);
          if (!open) setSelectedTransferId(null);
        }}
        title="Đánh dấu đang giao"
        description={`${selectedTransferSummary.join(' • ')}. Phiếu sẽ chuyển sang trạng thái đang vận chuyển.`}
        confirmText={
          shipTransferStatus === 'pending' ? 'Đang cập nhật...' : 'Chuyển sang đang giao'
        }
        cancelText="Đóng"
        variant="info"
        onConfirm={() => {
          void handleShipTransfer();
        }}
      />

      <ConfirmDialog
        open={openReceiveTransfer}
        onOpenChange={(open) => {
          setOpenReceiveTransfer(open);
          if (!open) setSelectedTransferId(null);
        }}
        title="Xác nhận nhận hàng"
        description={`${selectedTransferSummary.join(' • ')}. Hệ thống sẽ tạo giao dịch nhập kho theo số lượng thực nhận.`}
        confirmText={receiveTransferStatus === 'pending' ? 'Đang xác nhận...' : 'Xác nhận đã nhận'}
        cancelText="Đóng"
        variant="success"
        onConfirm={() => {
          void handleReceiveTransfer();
        }}
      />

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
        <DialogContent className="!max-w-none w-[95vw] h-[90vh] p-0 overflow-hidden flex flex-col">
          <DialogHeader className="px-6 py-4 border-b border-border shrink-0">
            <DialogTitle>Chi tiết phiếu điều phối</DialogTitle>
            <DialogDescription>
              {isLoadingTransferDetails
                ? 'Đang tải chi tiết phiếu điều phối...'
                : 'Thông tin đầy đủ của phiếu điều phối đang chọn.'}
            </DialogDescription>
          </DialogHeader>

          {selectedTransfer ? (
            <div className="flex-1 min-h-0 overflow-y-auto p-6 space-y-5">
              <div className="rounded-2xl border border-sky-500/20 bg-sky-500/5 p-5 space-y-3 text-sm shadow-sm">
                <p>
                  <span className="text-muted-foreground font-medium">Mã phiếu:</span>{' '}
                  <span className="font-semibold text-foreground text-base">
                    {selectedTransfer.transferCode || selectedTransfer.id}
                  </span>
                </p>
                <p>
                  <span className="text-muted-foreground font-medium">Kho/trạm nguồn:</span>{' '}
                  <span className="font-medium text-foreground">
                    {selectedTransfer.sourceStationName || selectedTransfer.sourceStationId}
                  </span>
                </p>
                <p>
                  <span className="text-muted-foreground font-medium">→ Kho đích:</span>{' '}
                  <span className="font-medium text-foreground">
                    {selectedTransfer.destinationStationName ||
                      selectedTransfer.destinationStationId}
                  </span>
                </p>
                <p>
                  <span className="text-muted-foreground font-medium">Người yêu cầu:</span>{' '}
                  <span className="font-medium text-foreground">
                    {selectedTransfer.requestedByName || 'Chưa rõ'}
                  </span>
                </p>
                <p>
                  <span className="text-muted-foreground font-medium">Tổng dòng:</span>{' '}
                  {formatNumberVN(
                    selectedTransfer.totalRequestedItems || selectedTransfer.items?.length || 0,
                  )}
                  {' • '}
                  <span className="text-muted-foreground font-medium">Tổng số lượng:</span>{' '}
                  {formatNumberVN(selectedTransfer.totalRequestedQuantity || 0)}
                </p>
                {(() => {
                  const parsedNotes = parseTransferNotes(selectedTransfer.notes);
                  return (
                    <>
                      {(selectedTransfer.reason || parsedNotes.reason) && (
                        <p>
                          <span className="text-muted-foreground font-medium">Lý do:</span>{' '}
                          {selectedTransfer.reason || parsedNotes.reason}
                        </p>
                      )}
                      <p>
                        <span className="text-muted-foreground font-medium">Ghi chú:</span>{' '}
                        {parsedNotes.note || parsedNotes.raw || 'Không có ghi chú'}
                      </p>
                    </>
                  );
                })()}
              </div>

              <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5">
                <p className="mb-3 text-sm font-semibold text-foreground">Danh sách vật phẩm</p>
                <div className="space-y-2 text-sm text-muted-foreground">
                  {(selectedTransfer.items || []).length === 0 ? (
                    <p>Phiếu này chưa có dữ liệu vật phẩm chi tiết.</p>
                  ) : (
                    selectedTransfer.items.map((item, index) => {
                      const matchedSupply = supplyMap.get(item.supplyItemId);
                      return (
                        <div
                          key={`${selectedTransfer.id}-${item.supplyItemId}-${index}`}
                          className="rounded-xl border border-border bg-background p-4 shadow-sm"
                        >
                          <div className="flex items-start gap-3">
                            <div className="size-11 rounded-xl border border-border bg-muted/40 flex items-center justify-center shrink-0">
                              <span className="material-symbols-outlined text-primary">
                                {matchedSupply
                                  ? getSupplyCategoryIcon(matchedSupply.category)
                                  : 'inventory_2'}
                              </span>
                            </div>
                            <div className="min-w-0 flex-1 space-y-2">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="font-semibold text-foreground text-base">
                                  {item.supplyItemName || matchedSupply?.name || item.supplyItemId}
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
                              <p className="text-xs text-muted-foreground">
                                Mã vật phẩm: {item.supplyItemId.slice(0, 8)}...
                              </p>
                              <div className="rounded-lg border border-border bg-muted/20 p-3 space-y-1">
                                <p className="text-sm font-semibold text-foreground">
                                  SL yêu cầu:{' '}
                                  {formatNumberVN(item.requestedQuantity ?? item.quantity ?? 0)}
                                  {matchedSupply?.unit ? ` ${matchedSupply.unit}` : ''}
                                </p>
                                {typeof item.actualQuantity === 'number' && (
                                  <p className="text-xs text-muted-foreground">
                                    SL thực tế: {formatNumberVN(item.actualQuantity)}
                                    {matchedSupply?.unit ? ` ${matchedSupply.unit}` : ''}
                                  </p>
                                )}
                              </div>
                              {item.notes && (
                                <p className="text-xs text-muted-foreground">
                                  Ghi chú: {item.notes}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
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
                type="number"
                min={0}
                value={editStockDialog.minValue}
                className={editStockErrors['minValue'] ? 'border-red-500 focus:ring-red-500' : ''}
                onChange={(e) => {
                  setEditStockDialog((prev) => ({ ...prev, minValue: e.target.value }));
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
                type="number"
                min={0}
                value={editStockDialog.maxValue}
                className={editStockErrors['maxValue'] ? 'border-red-500 focus:ring-red-500' : ''}
                onChange={(e) => {
                  setEditStockDialog((prev) => ({ ...prev, maxValue: e.target.value }));
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
