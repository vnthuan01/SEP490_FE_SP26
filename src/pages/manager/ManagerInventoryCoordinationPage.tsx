import { useMemo, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  useAddStock,
  useCreateInventory,
  useCreateTransaction,
  useInventories,
  useInventoryTransactions,
  useInventoryStocks,
  useUpdateInventory,
  useUpdateStock,
} from '@/hooks/useInventory';
import { useCampaigns } from '@/hooks/useCampaigns';
import {
  useCreateSupplyAllocation,
  useCreateSupplyItem,
  useSupplyItems,
  useUpdateSupplyItem,
} from '@/hooks/useSupplies';
import { useProvincialStations } from '@/hooks/useReliefStations';
import {
  useApproveSupplyTransfer,
  useCancelSupplyTransfer,
  useReceiveSupplyTransfer,
  useShipSupplyTransfer,
  useSupplyTransferDetails,
  useSupplyTransfersBySourceStation,
} from '@/hooks/useSupplyTransfers';
import { managerNavItems, managerProjects } from './components/sidebarConfig';
import {
  ManagerTransactionHistoryDialog,
  ManagerTransferHistoryDialog,
} from './components/ManagerTransferDialogs';
import { ManagerInventoryTable } from './components/ManagerInventoryTable';
import { ManagerPaginationControls } from './components/ManagerPaginationControls';
import { ManagerSupplyCatalogTable } from './components/ManagerSupplyCatalogTable';
import {
  ManagerBulkEditSupplyDialog,
  ManagerCreateSupplyDialog,
} from './components/ManagerSupplyDialogs';
import { RequiredMark, StatCard } from './components/ManagerInventoryShared';
import {
  EntityStatus,
  InventoryLevel,
  SupplyCategory,
  TransactionReason,
  TransactionType,
  getCampaignStatusClass,
  getCampaignStatusIcon,
  getCampaignStatusShortLabel,
  getInventoryLevelIcon,
  getInventoryLevelLabel,
  getInventoryStatusClass,
  getInventoryStatusLabel,
  getSupplyCategoryClass,
  getSupplyCategoryIcon,
  getSupplyCategoryLabel,
} from '@/enums/beEnums';
import {
  formatNumberInputVN,
  formatNumberVN,
  normalizeNumberInput,
  parseFormattedNumber,
} from '@/lib/utils';
import type { Stock } from '@/services/inventoryService';
import { toast } from 'sonner';
import CustomCalendar from '@/components/ui/customCalendar';

type QuanLyTab = 'hang-hoa' | 'chien-dich';

type DongVatPham = {
  id: string;
  name: string;
  description: string;
  iconUrl: string;
  category: string;
  unit: string;
};

type DongVatPhamCapNhat = {
  draftId: string;
  supplyItemId: string;
  name: string;
  description: string;
  iconUrl: string;
  category: string;
  unit: string;
};

type DongDieuPhoi = {
  id: string;
  supplyItemId: string;
  quantity: string;
};

type DongCapNhatTonKho = {
  id: string;
  supplyItemId: string;
  importQuantity: string;
  minimumStockLevel: string;
  maximumStockLevel: string;
  stockId?: string;
  isExisting?: boolean;
  expirationDate?: string | null;
};

const DANH_MUC_VAT_PHAM = [
  SupplyCategory.LuongThuc,
  SupplyCategory.YTeVaThuoc,
  SupplyCategory.NuocUong,
  SupplyCategory.DungCuVaLeuTrai,
  SupplyCategory.Khac,
] as const;

const NEW_STOCK_LOT_OPTION = '__new_stock_lot__';

const groupStocksBySupplyItemId = (stocks: Stock[]) => {
  const grouped = new Map<string, Stock[]>();

  for (const stock of stocks) {
    const currentLots = grouped.get(stock.supplyItemId) ?? [];
    grouped.set(stock.supplyItemId, [...currentLots, stock]);
  }

  return grouped;
};

const taoDongVatPham = (): DongVatPham => ({
  id: crypto.randomUUID(),
  name: '',
  description: '',
  iconUrl: '',
  category: String(SupplyCategory.LuongThuc),
  unit: '',
});

const taoDongVatPhamCapNhat = (item: {
  id: string;
  name: string;
  description?: string;
  iconUrl?: string;
  category: number;
  unit: string;
}): DongVatPhamCapNhat => ({
  draftId: crypto.randomUUID(),
  supplyItemId: item.id,
  name: item.name,
  description: item.description || '',
  iconUrl: item.iconUrl || '',
  category: String(item.category),
  unit: item.unit,
});

const taoDongDieuPhoi = (): DongDieuPhoi => ({
  id: crypto.randomUUID(),
  supplyItemId: '',
  quantity: '1',
});

const taoDongCapNhatTonKho = (): DongCapNhatTonKho => ({
  id: crypto.randomUUID(),
  supplyItemId: '',
  importQuantity: '0',
  minimumStockLevel: '0',
  maximumStockLevel: '0',
  expirationDate: null,
});

export const parseLocalDateFromYmd = (value?: string | null) => {
  if (!value) return undefined;

  if (value.includes('T')) {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? undefined : parsed;
  }

  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) return undefined;

  return new Date(year, month - 1, day, 12, 0, 0);
};

const toUtcIsoFromDate = (date: Date) => {
  const year = date.getFullYear();
  const month = date.getMonth();
  const day = date.getDate();

  return new Date(Date.UTC(year, month, day, 12, 0, 0)).toISOString();
};

export default function ManagerInventoryCoordinationPage() {
  const [selectedTab, setSelectedTab] = useState<QuanLyTab>('hang-hoa');
  const [pageIndex, setPageIndex] = useState(1);
  const [inventoryJumpPage, setInventoryJumpPage] = useState('1');
  const [supplyPageIndex, setSupplyPageIndex] = useState(1);
  const [supplyJumpPage, setSupplyJumpPage] = useState('1');
  const [openCreateInventory, setOpenCreateInventory] = useState(false);
  const [openCreateSupply, setOpenCreateSupply] = useState(false);
  const [openBulkEditSupply, setOpenBulkEditSupply] = useState(false);
  const [openCreateAllocation, setOpenCreateAllocation] = useState(false);
  const [openTransferHistory, setOpenTransferHistory] = useState(false);
  const [openTransactionHistory, setOpenTransactionHistory] = useState(false);
  /** Dialog tạo tồn kho mới – chỉ cho vật phẩm chưa có trong kho */
  const [openCreateStockDialog, setOpenCreateStockDialog] = useState(false);
  /** Dialog nhập bổ sung tồn kho – chỉ POST createTransaction import */
  const [openImportStockDialog, setOpenImportStockDialog] = useState(false);
  /** Dialog cập nhật min/max tồn kho – chỉ PUT updateStock */
  const [openUpdateStockDialog, setOpenUpdateStockDialog] = useState(false);
  /** Dialog xem chi tiết tồn kho – chỉ đọc */
  const [openViewStockDialog, setOpenViewStockDialog] = useState(false);
  const [openExpirationDateCalendarDialog, setOpenExpirationDateCalendarDialog] = useState(false);
  const [selectedExpirationDateId, setSelectedExpirationDateId] = useState('');
  const [selectedInventoryForStock, setSelectedInventoryForStock] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [selectedInventoryForHistory, setSelectedInventoryForHistory] = useState<{
    id: string;
    name: string;
    stationId: string;
  } | null>(null);
  const [inventoryForm, setInventoryForm] = useState({
    reliefStationId: '',
    level: String(InventoryLevel.Provincial),
  });
  const [supplyDrafts, setSupplyDrafts] = useState<DongVatPham[]>([taoDongVatPham()]);
  const [selectedSupplyIds, setSelectedSupplyIds] = useState<Set<string>>(new Set());
  const [inventoryKeywordFilter, setInventoryKeywordFilter] = useState('');
  const [supplyKeywordFilter, setSupplyKeywordFilter] = useState('');
  const [supplyCategoryFilter, setSupplyCategoryFilter] = useState('all');
  const [supplyInventoryFilter, setSupplyInventoryFilter] = useState('all');
  const [inventoryLevelFilter, setInventoryLevelFilter] = useState('all');
  const [inventoryStatusFilter, setInventoryStatusFilter] = useState('all');
  const [supplySort, setSupplySort] = useState<'default' | 'category-asc' | 'category-desc'>(
    'default',
  );
  const [bulkEditSupplyDrafts, setBulkEditSupplyDrafts] = useState<DongVatPhamCapNhat[]>([]);
  const [stockDrafts, setStockDrafts] = useState<DongCapNhatTonKho[]>([taoDongCapNhatTonKho()]);
  const [allocationForm, setAllocationForm] = useState({
    campaignId: '',
    sourceInventoryId: '',
    items: [taoDongDieuPhoi()],
  });
  const { data: inventoriesResponse, isLoading: isLoadingInventories } = useInventories({
    pageIndex,
    pageSize: 4,
  });
  const { data: supplyItemsResponse, isLoading: isLoadingSupplies } = useSupplyItems({
    pageIndex: supplyPageIndex,
    pageSize: 6,
    category: supplyCategoryFilter === 'all' ? undefined : Number(supplyCategoryFilter),
  });
  const { campaigns, isLoading: isLoadingCampaigns } = useCampaigns({
    pageIndex: 1,
    pageSize: 100,
  });
  const { data: stationsResponse } = useProvincialStations({
    pageIndex: 1,
    pageSize: 100,
  });
  const { data: inventoryStocksResponse, isLoading: isLoadingInventoryStocks } = useInventoryStocks(
    selectedInventoryForStock?.id || '',
    { pageIndex: 1, pageSize: 500 },
  );
  const { data: allocationInventoryStocksResponse, isLoading: isLoadingAllocationInventoryStocks } =
    useInventoryStocks(allocationForm.sourceInventoryId || '', {
      pageIndex: 1,
      pageSize: 500,
    });
  const { data: inventoryStocksFilterResponse } = useInventoryStocks(
    supplyInventoryFilter === 'all' ? '' : supplyInventoryFilter,
    { pageIndex: 1, pageSize: 500 },
  );
  const { data: transferHistoryResponse, isLoading: isLoadingTransferHistory } =
    useSupplyTransfersBySourceStation(selectedInventoryForHistory?.stationId || '');
  const { data: transactionHistoryResponse, isLoading: isLoadingTransactionHistory } =
    useInventoryTransactions(selectedInventoryForHistory?.id || '', {
      pageIndex: 1,
      pageSize: 200,
    });

  const { mutateAsync: createInventory, status: createInventoryStatus } = useCreateInventory();
  const { mutateAsync: updateInventory, status: updateInventoryStatus } = useUpdateInventory();
  const { mutateAsync: addStock, status: addStockStatus } = useAddStock();
  const { mutateAsync: updateStock, status: updateStockStatus } = useUpdateStock();
  const { mutateAsync: createTransaction, status: createTransactionStatus } =
    useCreateTransaction();
  const { mutateAsync: approveSupplyTransfer } = useApproveSupplyTransfer();
  const { mutateAsync: shipSupplyTransfer } = useShipSupplyTransfer();
  const { mutateAsync: receiveSupplyTransfer } = useReceiveSupplyTransfer();
  const { mutateAsync: cancelSupplyTransfer } = useCancelSupplyTransfer();
  const { mutateAsync: createSupplyItem, status: createSupplyItemStatus } = useCreateSupplyItem();
  const { mutateAsync: updateSupplyItem, status: updateSupplyItemStatus } = useUpdateSupplyItem();
  const { mutateAsync: createSupplyAllocation, status: createSupplyAllocationStatus } =
    useCreateSupplyAllocation();

  const inventories = useMemo(() => inventoriesResponse?.items || [], [inventoriesResponse]);
  const inventoryPagination = inventoriesResponse;
  const supplyItems = useMemo(() => supplyItemsResponse?.items || [], [supplyItemsResponse]);
  const supplyPagination = supplyItemsResponse;
  const stations = stationsResponse?.items || [];
  const inventoryStocks = useMemo(
    () => inventoryStocksResponse?.items || [],
    [inventoryStocksResponse],
  );
  const allocationInventoryStocks = useMemo(
    () => allocationInventoryStocksResponse?.items || [],
    [allocationInventoryStocksResponse],
  );
  const inventoryStockFilters = useMemo(
    () => inventoryStocksFilterResponse?.items || [],
    [inventoryStocksFilterResponse],
  );
  const transferHistory = Array.isArray(transferHistoryResponse)
    ? transferHistoryResponse
    : (transferHistoryResponse as any)?.items || [];
  const { transferMap: transferHistoryDetailMap, isLoading: isLoadingTransferHistoryDetails } =
    useSupplyTransferDetails(transferHistory.map((transfer: any) => transfer.id));
  const detailedTransferHistory = transferHistory.map(
    (transfer: any) => transferHistoryDetailMap.get(transfer.id) || transfer,
  );
  const transactionHistory = (transactionHistoryResponse as any)?.items || [];

  const activeInventories = useMemo(
    () => inventories.filter((inv) => inv.status === EntityStatus.Active),
    [inventories],
  );
  const stockLotsBySupplyItemId = useMemo(
    () => groupStocksBySupplyItemId(inventoryStocks),
    [inventoryStocks],
  );
  const allocationStockLotsBySupplyItemId = useMemo(
    () => groupStocksBySupplyItemId(allocationInventoryStocks),
    [allocationInventoryStocks],
  );
  const filteredInventories = useMemo(() => {
    return inventories.filter((inv) => {
      const matchesLevel =
        inventoryLevelFilter === 'all' || String(inv.level) === inventoryLevelFilter;
      const matchesStatus =
        inventoryStatusFilter === 'all' || String(inv.status) === inventoryStatusFilter;
      const normalizedKeyword = inventoryKeywordFilter.trim().toLowerCase();
      const matchesKeyword =
        !normalizedKeyword ||
        inv.inventoryId.toLowerCase().includes(normalizedKeyword) ||
        inv.reliefStationName.toLowerCase().includes(normalizedKeyword);
      return matchesLevel && matchesStatus && matchesKeyword;
    });
  }, [inventories, inventoryLevelFilter, inventoryStatusFilter, inventoryKeywordFilter]);

  const sortedSupplyItems = useMemo(() => {
    const inventorySupplyIds =
      supplyInventoryFilter === 'all'
        ? null
        : new Set(inventoryStockFilters.map((stock) => stock.supplyItemId));
    const normalizedKeyword = supplyKeywordFilter.trim().toLowerCase();
    const items = supplyItems.filter((item) => {
      const matchesInventory = !inventorySupplyIds || inventorySupplyIds.has(item.id);
      const matchesKeyword =
        !normalizedKeyword ||
        item.name.toLowerCase().includes(normalizedKeyword) ||
        item.description.toLowerCase().includes(normalizedKeyword) ||
        item.unit.toLowerCase().includes(normalizedKeyword);
      return matchesInventory && matchesKeyword;
    });
    if (supplySort === 'category-asc') {
      items.sort((a, b) => a.category - b.category || a.name.localeCompare(b.name, 'vi'));
    } else if (supplySort === 'category-desc') {
      items.sort((a, b) => b.category - a.category || a.name.localeCompare(b.name, 'vi'));
    }

    return Array.from(new Map(items.map((item) => [item.id, item])).values());
  }, [supplyItems, supplySort, supplyInventoryFilter, inventoryStockFilters, supplyKeywordFilter]);
  const selectedSupplyIdsOnPage = useMemo(() => {
    const currentIds = new Set(sortedSupplyItems.map((item) => item.id));
    return new Set(Array.from(selectedSupplyIds).filter((id) => currentIds.has(id)));
  }, [selectedSupplyIds, sortedSupplyItems]);

  const thongKe = useMemo(() => {
    const tongKho = inventories.length;
    const khoDangHoatDong = inventories.filter((inv) => inv.status === EntityStatus.Active).length;
    const tongVatPham = supplyItems.length;
    const tongChienDich = campaigns.length;

    return [
      {
        id: 'tong-kho',
        label: 'Tổng số kho',
        value: tongKho,
        icon: 'warehouse',
        iconClass: 'bg-primary/10 text-primary',
        note: 'Tất cả kho đang quản lý',
      },
      {
        id: 'kho-hoat-dong',
        label: 'Kho đang hoạt động',
        value: khoDangHoatDong,
        icon: 'verified',
        iconClass: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-300',
        note: 'Sẵn sàng nhập và điều phối',
      },
      {
        id: 'vat-pham',
        label: 'Vật phẩm cứu trợ',
        value: tongVatPham,
        icon: 'inventory_2',
        iconClass: 'bg-sky-500/10 text-sky-600 dark:text-sky-300',
        note: 'Danh mục vật phẩm/hàng hóa hiện có',
      },
      {
        id: 'chien-dich',
        label: 'Chiến dịch khả dụng',
        value: tongChienDich,
        icon: 'campaign',
        iconClass: 'bg-amber-500/10 text-amber-600 dark:text-amber-300',
        note: 'Có thể điều phối ngay',
      },
    ];
  }, [campaigns.length, inventories, supplyItems.length]);

  const handleInventoryStatusChange = async (
    inventoryId: string,
    level: number,
    status: EntityStatus,
  ) => {
    if (!inventoryId) {
      toast.error('Không tìm thấy mã kho để cập nhật trạng thái.');
      return;
    }

    await updateInventory({
      id: inventoryId,
      data: { level, status },
    });
  };

  const handleCreateInventory = async () => {
    if (!inventoryForm.reliefStationId) {
      toast.error('Vui lòng chọn trạm để tạo kho.');
      return;
    }

    await createInventory({
      reliefStationId: inventoryForm.reliefStationId,
      level: Number(inventoryForm.level),
      status: EntityStatus.Active,
    });

    setInventoryForm({
      reliefStationId: '',
      level: String(InventoryLevel.Provincial),
    });
    setOpenCreateInventory(false);
  };

  const updateSupplyDraft = (id: string, key: keyof DongVatPham, value: string) => {
    setSupplyDrafts((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [key]: value } : item)),
    );
  };

  const addSupplyDraft = () => setSupplyDrafts((prev) => [...prev, taoDongVatPham()]);

  const removeSupplyDraft = (id: string) => {
    setSupplyDrafts((prev) => (prev.length === 1 ? prev : prev.filter((item) => item.id !== id)));
  };

  const handleCreateSupplyItems = async () => {
    const validItems = supplyDrafts.filter((item) => item.name.trim() && item.unit.trim());

    if (validItems.length === 0) {
      toast.error('Vui lòng nhập ít nhất một vật phẩm hợp lệ.');
      return;
    }

    await Promise.all(
      validItems.map((item) =>
        createSupplyItem({
          name: item.name.trim(),
          description: item.description.trim(),
          iconUrl: item.iconUrl.trim(),
          category: Number(item.category),
          unit: item.unit.trim(),
        }),
      ),
    );

    setSupplyDrafts([taoDongVatPham()]);
    setOpenCreateSupply(false);
  };

  const handleToggleSupplySelect = (id: string) => {
    setSelectedSupplyIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleToggleSelectAllSupplies = () => {
    setSelectedSupplyIds((prev) => {
      const pageIds = sortedSupplyItems.map((item) => item.id);
      const allSelected = pageIds.every((id) => prev.has(id));
      const next = new Set(prev);
      if (allSelected) pageIds.forEach((id) => next.delete(id));
      else pageIds.forEach((id) => next.add(id));
      return next;
    });
  };

  const openEditSupplyDialog = (item: {
    id: string;
    name: string;
    description: string;
    iconUrl?: string;
    category: number;
    unit: string;
  }) => {
    setBulkEditSupplyDrafts([taoDongVatPhamCapNhat(item)]);
    setOpenBulkEditSupply(true);
  };

  const handleBulkEditSupply = () => {
    if (selectedSupplyIdsOnPage.size === 0) {
      toast.error('Vui lòng chọn ít nhất một vật phẩm để cập nhật.');
      return;
    }

    const seen = new Map<string, (typeof sortedSupplyItems)[number]>();
    for (const id of selectedSupplyIdsOnPage) {
      const item = sortedSupplyItems.find((s) => s.id === id);
      if (item && !seen.has(item.id)) {
        seen.set(item.id, item);
      }
    }

    const selectedItems = [...seen.values()];

    if (selectedItems.length === 0) {
      toast.error('Không tìm thấy vật phẩm đã chọn.');
      return;
    }

    setBulkEditSupplyDrafts(selectedItems.map((item) => taoDongVatPhamCapNhat(item)));
    setOpenBulkEditSupply(true);
  };

  const handleBulkEditDraftChange = (
    draftId: string,
    key: keyof Omit<DongVatPhamCapNhat, 'draftId' | 'supplyItemId'>,
    value: string,
  ) => {
    setBulkEditSupplyDrafts((prev) =>
      prev.map((item) => (item.draftId === draftId ? { ...item, [key]: value } : item)),
    );
  };

  const handleSaveBulkEditedSupply = async () => {
    const validItems = bulkEditSupplyDrafts.filter(
      (item) => item.supplyItemId && item.name.trim() && item.unit.trim(),
    );
    if (validItems.length === 0) {
      toast.error('Vui lòng nhập tên vật phẩm và đơn vị tính cho ít nhất một dòng hợp lệ.');
      return;
    }

    await Promise.all(
      validItems.map((item) =>
        updateSupplyItem({
          id: item.supplyItemId,
          data: {
            name: item.name.trim(),
            description: item.description.trim(),
            iconUrl: item.iconUrl.trim(),
            category: Number(item.category),
            unit: item.unit.trim(),
          },
        }),
      ),
    );

    setOpenBulkEditSupply(false);
    setSelectedSupplyIds(new Set());
    setBulkEditSupplyDrafts([]);
  };

  const updateAllocationItem = (id: string, key: keyof DongDieuPhoi, value: string) => {
    setAllocationForm((prev) => ({
      ...prev,
      items: prev.items.map((item) => (item.id === id ? { ...item, [key]: value } : item)),
    }));
  };

  const addAllocationItem = () => {
    setAllocationForm((prev) => ({
      ...prev,
      items: [...prev.items, taoDongDieuPhoi()],
    }));
  };

  const removeAllocationItem = (id: string) => {
    setAllocationForm((prev) => ({
      ...prev,
      items: prev.items.length === 1 ? prev.items : prev.items.filter((item) => item.id !== id),
    }));
  };

  const handleCreateAllocation = async () => {
    if (!allocationForm.campaignId || !allocationForm.sourceInventoryId) {
      toast.error('Vui lòng chọn chiến dịch và kho nguồn.');
      return;
    }

    const validItems = allocationForm.items
      .map((item) => {
        const matchedSupplyItem = supplyItems.find((supply) => supply.id === item.supplyItemId);

        return {
          supplyItemId: item.supplyItemId,
          supplyItemName: matchedSupplyItem?.name || item.supplyItemId,
          supplyItemUnit: matchedSupplyItem?.unit || '',
          quantity: parseFormattedNumber(item.quantity),
        };
      })
      .filter((item) => item.supplyItemId && Number.isFinite(item.quantity) && item.quantity > 0);

    if (validItems.length === 0) {
      toast.error('Vui lòng thêm ít nhất một vật phẩm điều phối hợp lệ.');
      return;
    }

    await createSupplyAllocation({
      campaignId: allocationForm.campaignId,
      sourceInventoryId: allocationForm.sourceInventoryId,
      items: validItems,
    });

    setAllocationForm({
      campaignId: '',
      sourceInventoryId: '',
      items: [taoDongDieuPhoi()],
    });
    setOpenCreateAllocation(false);
  };

  const openCreateStockManagement = (inventoryId: string, inventoryName: string) => {
    setSelectedInventoryForStock({ id: inventoryId, name: inventoryName });
    setStockDrafts([taoDongCapNhatTonKho()]);
    setOpenCreateStockDialog(true);
  };

  const openStockImportManagement = (inventoryId: string, inventoryName: string) => {
    setSelectedInventoryForStock({ id: inventoryId, name: inventoryName });
    setStockDrafts([taoDongCapNhatTonKho()]);
    setOpenImportStockDialog(true);
  };

  const openStockUpdateManagement = (inventoryId: string, inventoryName: string) => {
    setSelectedInventoryForStock({ id: inventoryId, name: inventoryName });
    setStockDrafts([taoDongCapNhatTonKho()]);
    setOpenUpdateStockDialog(true);
  };

  const openViewStockDetail = (inventoryId: string, inventoryName: string) => {
    setSelectedInventoryForStock({ id: inventoryId, name: inventoryName });
    setOpenViewStockDialog(true);
  };

  const addStockDraft = () => setStockDrafts((prev) => [...prev, taoDongCapNhatTonKho()]);

  const removeStockDraft = (id: string) => {
    setStockDrafts((prev) => (prev.length === 1 ? prev : prev.filter((item) => item.id !== id)));
  };

  const updateStockDraft = (id: string, key: keyof DongCapNhatTonKho, value: string) => {
    setStockDrafts((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;

        if (key === 'supplyItemId') {
          const existingLots = stockLotsBySupplyItemId.get(value) ?? [];
          const existingStock = existingLots[0];

          return {
            ...item,
            supplyItemId: value,
            stockId: existingLots.length === 1 ? existingStock?.stockId : undefined,
            isExisting: existingLots.length > 0,
            minimumStockLevel: existingStock ? String(existingStock.minimumStockLevel) : '0',
            maximumStockLevel: existingStock ? String(existingStock.maximumStockLevel) : '0',
            expirationDate: existingLots.length > 0 ? null : item.expirationDate,
          };
        }

        if (key === 'stockId') {
          if (value === NEW_STOCK_LOT_OPTION) {
            return {
              ...item,
              stockId: undefined,
              isExisting: false,
              minimumStockLevel: item.minimumStockLevel || '0',
              maximumStockLevel: item.maximumStockLevel || '0',
            };
          }

          const selectedLot = inventoryStocks.find((stock) => stock.stockId === value);

          return {
            ...item,
            stockId: value,
            isExisting: !!selectedLot,
            minimumStockLevel: selectedLot
              ? String(selectedLot.minimumStockLevel)
              : item.minimumStockLevel,
            maximumStockLevel: selectedLot
              ? String(selectedLot.maximumStockLevel)
              : item.maximumStockLevel,
          };
        }

        return { ...item, [key]: value };
      }),
    );
  };

  const handleCreateNewStock = async () => {
    if (!selectedInventoryForStock?.id) {
      toast.error('Không tìm thấy kho để tạo tồn kho.');
      return;
    }

    if (isLoadingInventoryStocks) {
      toast.error('Dữ liệu tồn kho đang được tải. Vui lòng thử lại sau ít giây.');
      return;
    }

    const validDrafts = stockDrafts.filter((item) => item.supplyItemId);
    if (validDrafts.length === 0) {
      toast.error('Vui lòng chọn ít nhất một vật phẩm.');
      return;
    }

    // Chặn vật phẩm đã có trong kho
    for (const item of validDrafts) {
      const existingLots = stockLotsBySupplyItemId.get(item.supplyItemId) ?? [];
      if (existingLots.length > 0) {
        const supplyName =
          supplyItems.find((s) => s.id === item.supplyItemId)?.name || item.supplyItemId;
        toast.error(
          `Vật phẩm "${supplyName}" đã có trong kho. Dùng chức năng "Cập nhật / nhập bổ sung tồn kho" để thao tác.`,
        );
        return;
      }
    }

    for (const item of validDrafts) {
      const minimumStockLevel = parseFormattedNumber(item.minimumStockLevel);
      const maximumStockLevel = parseFormattedNumber(item.maximumStockLevel);
      const currentQuantity = parseFormattedNumber(item.importQuantity);

      if (minimumStockLevel < 0 || maximumStockLevel < 0 || currentQuantity < 0) {
        toast.error('Số lượng tồn kho không được nhỏ hơn 0.');
        return;
      }

      if (maximumStockLevel > 0 && minimumStockLevel > maximumStockLevel) {
        toast.error('Mức tồn tối thiểu không được lớn hơn mức tồn tối đa.');
        return;
      }
    }

    for (const item of validDrafts) {
      const minimumStockLevel = parseFormattedNumber(item.minimumStockLevel);
      const maximumStockLevel = parseFormattedNumber(item.maximumStockLevel);
      const currentQuantity = parseFormattedNumber(item.importQuantity);

      await addStock({
        id: selectedInventoryForStock.id,
        data: {
          supplyItemId: item.supplyItemId,
          currentQuantity,
          minimumStockLevel,
          maximumStockLevel,
          ...(item.expirationDate ? { expirationDate: item.expirationDate } : {}),
        },
      });
    }

    setStockDrafts([taoDongCapNhatTonKho()]);
    setOpenCreateStockDialog(false);
  };

  /** Nhập bổ sung – chỉ POST createTransaction import, không updateStock */
  const handleImportStock = async () => {
    if (!selectedInventoryForStock?.id) {
      toast.error('Không tìm thấy kho để nhập bổ sung.');
      return;
    }

    if (isLoadingInventoryStocks) {
      toast.error('Dữ liệu tồn kho đang được tải. Vui lòng thử lại sau ít giây.');
      return;
    }

    const validDrafts = stockDrafts.filter((item) => item.supplyItemId);
    if (validDrafts.length === 0) {
      toast.error('Vui lòng chọn ít nhất một vật phẩm.');
      return;
    }

    // Chỉ cho phép nhập vào vật phẩm đã có trong kho
    for (const item of validDrafts) {
      const existingLots = stockLotsBySupplyItemId.get(item.supplyItemId) ?? [];
      if (existingLots.length === 0) {
        const supplyName =
          supplyItems.find((s) => s.id === item.supplyItemId)?.name || item.supplyItemId;
        toast.error(
          `Vật phẩm "${supplyName}" chưa có trong kho. Dùng "Tạo tồn kho mới" để thêm vào kho trước.`,
        );
        return;
      }
    }

    for (const item of validDrafts) {
      const importQuantity = parseFormattedNumber(item.importQuantity);
      if (importQuantity <= 0) {
        toast.error('Số lượng nhập phải lớn hơn 0.');
        return;
      }
    }

    for (const item of validDrafts) {
      const importQuantity = parseFormattedNumber(item.importQuantity);

      await createTransaction({
        inventoryId: selectedInventoryForStock.id,
        type: TransactionType.Import,
        reason: TransactionReason.Other,
        notes: `Nhập bổ sung vật phẩm cho kho ${selectedInventoryForStock.name}`,
        items: [
          {
            supplyItemId: item.supplyItemId,
            supplyItemName:
              supplyItems.find((supply) => supply.id === item.supplyItemId)?.name ||
              item.supplyItemId,
            supplyItemUnit:
              supplyItems.find((supply) => supply.id === item.supplyItemId)?.unit || '',
            quantity: importQuantity,
            notes: 'Nhập bổ sung tồn kho từ trang điều phối kho',
          },
        ],
      });
    }

    setStockDrafts([taoDongCapNhatTonKho()]);
    setOpenImportStockDialog(false);
  };

  /** Cập nhật tồn kho – chỉ PUT updateStock min/max, không createTransaction */
  const handleUpdateStock = async () => {
    if (!selectedInventoryForStock?.id) {
      toast.error('Không tìm thấy kho để cập nhật tồn kho.');
      return;
    }

    if (isLoadingInventoryStocks) {
      toast.error('Dữ liệu tồn kho đang được tải. Vui lòng thử lại sau ít giây.');
      return;
    }

    const validDrafts = stockDrafts.filter((item) => item.supplyItemId);
    if (validDrafts.length === 0) {
      toast.error('Vui lòng chọn ít nhất một vật phẩm.');
      return;
    }

    // Chỉ cho phép thao tác trên vật phẩm đã có trong kho
    for (const item of validDrafts) {
      const existingLots = stockLotsBySupplyItemId.get(item.supplyItemId) ?? [];
      if (existingLots.length === 0) {
        const supplyName =
          supplyItems.find((s) => s.id === item.supplyItemId)?.name || item.supplyItemId;
        toast.error(
          `Vật phẩm "${supplyName}" chưa có trong kho. Dùng "Tạo tồn kho mới" để thêm vào kho.`,
        );
        return;
      }
    }

    for (const item of validDrafts) {
      const minimumStockLevel = parseFormattedNumber(item.minimumStockLevel);
      const maximumStockLevel = parseFormattedNumber(item.maximumStockLevel);

      if (minimumStockLevel < 0 || maximumStockLevel < 0) {
        toast.error('Ngưỡng tồn kho không được nhỏ hơn 0.');
        return;
      }

      if (maximumStockLevel > 0 && minimumStockLevel > maximumStockLevel) {
        toast.error('Mức tồn tối thiểu không được lớn hơn mức tồn tối đa.');
        return;
      }
    }

    for (const item of validDrafts) {
      const minimumStockLevel = parseFormattedNumber(item.minimumStockLevel);
      const maximumStockLevel = parseFormattedNumber(item.maximumStockLevel);
      const resolvedStockId = item.stockId;

      if (!resolvedStockId) {
        toast.error('Vui lòng chọn lô hàng cần cập nhật.');
        return;
      }

      await updateStock({
        stockId: resolvedStockId,
        inventoryId: selectedInventoryForStock.id,
        data: {
          minimumStockLevel,
          maximumStockLevel,
        },
      });
    }

    setStockDrafts([taoDongCapNhatTonKho()]);
    setOpenUpdateStockDialog(false);
  };

  const openTransferHistoryDialog = (inventoryId: string, inventoryName: string) => {
    const matchedInventory = inventories.find((inventory) => inventory.inventoryId === inventoryId);
    setSelectedInventoryForHistory({
      id: inventoryId,
      name: inventoryName,
      stationId: matchedInventory?.reliefStationId || '',
    });
    setOpenTransferHistory(true);
  };

  const openTransactionHistoryDialog = (inventoryId: string, inventoryName: string) => {
    const matchedInventory = inventories.find((inventory) => inventory.inventoryId === inventoryId);
    setSelectedInventoryForHistory({
      id: inventoryId,
      name: inventoryName,
      stationId: matchedInventory?.reliefStationId || '',
    });
    setOpenTransactionHistory(true);
  };

  const openExpirationDateCalendarDialogAction = (id: string) => {
    setSelectedExpirationDateId(id);
    setOpenExpirationDateCalendarDialog(true);
  };

  const closeExpirationDateCalendarDialogAction = () => {
    setOpenExpirationDateCalendarDialog(false);
    setSelectedExpirationDateId('');
  };

  return (
    <DashboardLayout projects={managerProjects} navItems={managerNavItems}>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-4xl text-primary font-black">Điều phối kho tổng</h1>
            <p className="text-muted-foreground">
              Quản lý kho, vật phẩm cứu trợ và điều phối hàng hóa cho các chiến dịch.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button variant="outline" className="gap-2">
              <span className="material-symbols-outlined text-lg">download</span>
              Xuất báo cáo
            </Button>
            <Button
              variant="primary"
              className="gap-2"
              onClick={() => setOpenCreateInventory(true)}
            >
              <span className="material-symbols-outlined text-lg">add_business</span>
              Tạo kho mới
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {thongKe.map((item) => (
            <StatCard key={item.id} {...item} />
          ))}
        </div>

        <Tabs value={selectedTab} onValueChange={(value) => setSelectedTab(value as QuanLyTab)}>
          <TabsList
            variant="line"
            className="border-b border-border bg-transparent p-0 h-auto gap-6"
          >
            <TabsTrigger value="hang-hoa" className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[20px]">inventory_2</span>
              <span>Hàng hóa cứu trợ</span>
            </TabsTrigger>
            <TabsTrigger value="chien-dich" className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[20px]">campaign</span>
              <span>Điều phối chiến dịch</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="hang-hoa" className="mt-6 space-y-6">
            <Card className="border-border bg-card">
              <CardContent className="p-5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div className="flex flex-wrap gap-3">
                  <div className="flex items-center gap-2">
                    <label htmlFor="inventory-level" className="cursor-pointer mt-3 ">
                      <span className="material-symbols-outlined text-[18px] text-green-500">
                        warehouse
                      </span>
                    </label>
                    <div>
                      <Select value={inventoryLevelFilter} onValueChange={setInventoryLevelFilter}>
                        <SelectTrigger id="inventory-level" className="w-[180px]">
                          <SelectValue placeholder="Lọc cấp kho" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Tất cả cấp kho</SelectItem>
                          <SelectItem value={String(InventoryLevel.Regional)}>
                            Kho khu vực
                          </SelectItem>
                          <SelectItem value={String(InventoryLevel.Provincial)}>
                            Kho tỉnh/thành
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <label htmlFor="inventory-status" className="cursor-pointer mt-3 ">
                      <span className="material-symbols-outlined text-[18px] text-primary">
                        filter_list
                      </span>
                    </label>
                    <Select value={inventoryStatusFilter} onValueChange={setInventoryStatusFilter}>
                      <SelectTrigger id="inventory-status" className="w-[180px]">
                        <SelectValue placeholder="Lọc trạng thái kho" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tất cả trạng thái kho</SelectItem>
                        <SelectItem value={String(EntityStatus.Active)}>Đang hoạt động</SelectItem>
                        <SelectItem value={String(EntityStatus.Inactive)}>
                          Ngừng hoạt động
                        </SelectItem>
                        <SelectItem value={String(EntityStatus.Deleted)}>Đã xóa</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1  gap-6">
              <Card className="border-border bg-card">
                <CardContent className="p-0">
                  <div className="px-5 py-4 border-b border-border">
                    <h2 className="text-xl font-bold text-foreground">Danh sách kho</h2>
                    <p className="text-sm text-muted-foreground">
                      Quản lý trạng thái kho theo trải nghiệm tương tự trang kho của điều phối viên.
                    </p>
                    <div className="relative mt-4 w-full max-w-md">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-muted-foreground">
                        search
                      </span>
                      <Input
                        className="pl-10"
                        placeholder="Tìm kiếm kho..."
                        value={inventoryKeywordFilter}
                        onChange={(e) => setInventoryKeywordFilter(e.target.value)}
                      />
                    </div>
                  </div>

                  <ManagerInventoryTable
                    inventories={filteredInventories}
                    isLoading={isLoadingInventories}
                    isUpdating={updateInventoryStatus === 'pending'}
                    onCreateStock={openCreateStockManagement}
                    onImportStock={openStockImportManagement}
                    onUpdateStock={openStockUpdateManagement}
                    onViewStockDetail={openViewStockDetail}
                    onViewTransfers={openTransferHistoryDialog}
                    onViewTransactions={openTransactionHistoryDialog}
                    onToggleStatus={handleInventoryStatusChange}
                  />

                  <ManagerPaginationControls
                    pagination={inventoryPagination}
                    itemLabel="kho"
                    jumpValue={inventoryJumpPage}
                    onJumpValueChange={setInventoryJumpPage}
                    onJump={() => {
                      const nextPage = Math.min(
                        Math.max(parseFormattedNumber(inventoryJumpPage), 1),
                        inventoryPagination?.totalPages || 1,
                      );
                      setPageIndex(nextPage);
                    }}
                    onPrevious={() => setPageIndex((prev) => Math.max(1, prev - 1))}
                    onNext={() => setPageIndex((prev) => prev + 1)}
                  />
                </CardContent>
              </Card>

              <Card className="border-border bg-card">
                <CardContent className="p-0">
                  <div className="px-5 py-4 border-b border-border">
                    <div className="flex items-center justify-between">
                      <div>
                        <h2 className="text-xl font-bold text-foreground">
                          Danh mục Vật phẩm/Hàng hóa
                        </h2>
                        <p className="text-sm text-muted-foreground">
                          Tạo Vật phẩm/Hàng hóa trước, sau đó nhập hoặc cập nhật tồn kho theo Vật
                          phẩm/Hàng hóa đã có.
                        </p>
                        <div className="relative mt-4 w-full max-w-md">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-muted-foreground">
                            search
                          </span>
                          <Input
                            className="pl-10"
                            placeholder="Tìm kiếm vật phẩm..."
                            value={supplyKeywordFilter}
                            onChange={(e) => setSupplyKeywordFilter(e.target.value)}
                          />
                        </div>
                      </div>
                      <Button
                        variant="primary"
                        className="gap-2"
                        onClick={() => setOpenCreateSupply(true)}
                      >
                        <span className="material-symbols-outlined text-lg">playlist_add</span>
                        Tạo nhiều vật phẩm
                      </Button>
                    </div>
                    <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                      <div className="flex flex-wrap items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-2"
                          disabled={selectedSupplyIdsOnPage.size === 0}
                          onClick={handleBulkEditSupply}
                        >
                          <span className="material-symbols-outlined text-sm">edit</span>
                          Sửa đã chọn
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={sortedSupplyItems.length === 0}
                          onClick={() =>
                            setSelectedSupplyIds(new Set(sortedSupplyItems.map((item) => item.id)))
                          }
                        >
                          Chọn tất cả trang
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => setSelectedSupplyIds(new Set())}
                        >
                          Bỏ chọn
                        </Button>
                      </div>

                      <div className="flex items-center gap-1">
                        <Label className="text-sm text-muted-foreground">Danh mục</Label>
                        <Select
                          value={supplyCategoryFilter}
                          onValueChange={setSupplyCategoryFilter}
                        >
                          <SelectTrigger className="w-[220px]">
                            <SelectValue placeholder="Lọc danh mục vật phẩm" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Tất cả danh mục</SelectItem>
                            {DANH_MUC_VAT_PHAM.map((category) => (
                              <SelectItem key={category} value={String(category)}>
                                {getSupplyCategoryLabel(category)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Label className="text-sm text-muted-foreground">Kho</Label>
                        <Select
                          value={supplyInventoryFilter}
                          onValueChange={setSupplyInventoryFilter}
                        >
                          <SelectTrigger className="w-[220px]">
                            <SelectValue placeholder="Lọc theo kho" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Tất cả kho</SelectItem>
                            {inventories.map((inventory) => (
                              <SelectItem key={inventory.inventoryId} value={inventory.inventoryId}>
                                {inventory.reliefStationName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Label className="text-sm text-muted-foreground">Sắp xếp</Label>
                        <Select
                          value={supplySort}
                          onValueChange={(value) => setSupplySort(value as typeof supplySort)}
                        >
                          <SelectTrigger className="w-[220px]">
                            <SelectValue placeholder="Chọn kiểu sắp xếp" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="default">Mặc định</SelectItem>
                            <SelectItem value="category-asc">Danh mục tăng dần</SelectItem>
                            <SelectItem value="category-desc">Danh mục giảm dần</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  <ManagerSupplyCatalogTable
                    supplyItems={sortedSupplyItems}
                    isLoading={isLoadingSupplies}
                    selectedIds={selectedSupplyIds}
                    onToggleSelect={handleToggleSupplySelect}
                    onToggleSelectAll={handleToggleSelectAllSupplies}
                    onEdit={openEditSupplyDialog}
                  />

                  <ManagerPaginationControls
                    pagination={supplyPagination}
                    itemLabel="vật phẩm"
                    jumpValue={supplyJumpPage}
                    onJumpValueChange={setSupplyJumpPage}
                    onJump={() => {
                      const nextPage = Math.min(
                        Math.max(parseFormattedNumber(supplyJumpPage), 1),
                        supplyPagination?.totalPages || 1,
                      );
                      setSupplyPageIndex(nextPage);
                    }}
                    onPrevious={() => setSupplyPageIndex((prev) => Math.max(1, prev - 1))}
                    onNext={() => setSupplyPageIndex((prev) => prev + 1)}
                  />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="chien-dich" className="mt-6 space-y-6">
            <Card className="border-border bg-card">
              <CardContent className="p-5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-foreground">
                    Điều phối hàng hóa cho chiến dịch
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Chọn nhiều vật phẩm trong một lần điều phối để thao tác nhanh và ít nhầm hơn.
                  </p>
                </div>

                <Button
                  variant="primary"
                  className="gap-2 shadow-sm"
                  onClick={() => setOpenCreateAllocation(true)}
                >
                  <span className="material-symbols-outlined text-lg">local_shipping</span>
                  Tạo phiếu điều phối
                </Button>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="border-border bg-card">
                <CardContent className="p-5 flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm text-muted-foreground">Chiến dịch khả dụng</p>
                    <p className="mt-2 text-3xl font-black text-foreground">{campaigns.length}</p>
                  </div>
                  <div className="size-11 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                    <span className="material-symbols-outlined text-[22px]">campaign</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border bg-card">
                <CardContent className="p-5 flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm text-muted-foreground">Kho sẵn sàng điều phối</p>
                    <p className="mt-2 text-3xl font-black text-foreground">
                      {activeInventories.length}
                    </p>
                  </div>
                  <div className="size-11 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 flex items-center justify-center">
                    <span className="material-symbols-outlined text-[22px]">outbound</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border bg-card">
                <CardContent className="p-5 flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm text-muted-foreground">Vật phẩm có thể chọn</p>
                    <p className="mt-2 text-3xl font-black text-foreground">{supplyItems.length}</p>
                  </div>
                  <div className="size-11 rounded-2xl bg-sky-500/10 text-sky-600 dark:text-sky-300 flex items-center justify-center">
                    <span className="material-symbols-outlined text-[22px]">inventory_2</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className="border-border bg-card">
              <CardContent className="p-0">
                <div className="px-5 py-4 border-b border-border">
                  <h2 className="text-xl font-bold text-foreground">Danh sách chiến dịch</h2>
                  <p className="text-sm text-muted-foreground">
                    Chọn chiến dịch và mở nhanh phiếu điều phối từ từng dòng dữ liệu.
                  </p>
                </div>

                <div className="overflow-x-auto">
                  {isLoadingCampaigns ? (
                    <div className="flex items-center justify-center py-16 text-muted-foreground">
                      <div className="flex flex-col items-center gap-3">
                        <span className="material-symbols-outlined text-4xl animate-spin text-primary">
                          progress_activity
                        </span>
                        <p>Đang tải danh sách chiến dịch...</p>
                      </div>
                    </div>
                  ) : campaigns.length === 0 ? (
                    <div className="flex items-center justify-center py-16 text-muted-foreground">
                      <div className="flex flex-col items-center gap-3">
                        <span className="material-symbols-outlined text-4xl">campaign</span>
                        <p>Chưa có chiến dịch nào</p>
                      </div>
                    </div>
                  ) : (
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border text-left">
                          <th className="px-5 py-3 font-semibold">Chiến dịch</th>
                          <th className="px-5 py-3 font-semibold">Thời gian</th>
                          <th className="px-5 py-3 font-semibold">Trạng thái</th>
                          <th className="px-5 py-3 font-semibold text-right">Thao tác</th>
                        </tr>
                      </thead>
                      <tbody>
                        {campaigns.map((campaign) => (
                          <tr
                            key={campaign.campaignId}
                            className="border-b border-border/70 hover:bg-muted/30"
                          >
                            <td className="px-5 py-4">
                              <div>
                                <p className="font-semibold text-foreground">{campaign.name}</p>
                                <p className="text-xs text-muted-foreground font-mono">
                                  {campaign.campaignId.slice(0, 6)}...
                                </p>
                              </div>
                            </td>
                            <td className="px-5 py-4 text-muted-foreground">
                              Từ: {new Date(campaign.startDate).toLocaleDateString('vi-VN')} - Đến:{' '}
                              {new Date(campaign.endDate).toLocaleDateString('vi-VN')}
                            </td>
                            <td className="px-5 py-4">
                              {(() => {
                                const statusIcon = getCampaignStatusIcon(campaign.status);
                                const statusLabel = getCampaignStatusShortLabel(campaign.status);
                                const statusClass = getCampaignStatusClass(campaign.status);

                                return (
                                  <Badge
                                    variant="outline"
                                    appearance="outline"
                                    size="sm"
                                    className={`gap-1.5 border ${statusClass}`}
                                  >
                                    <span className="material-symbols-outlined text-[15px] shrink-0">
                                      {statusIcon}
                                    </span>
                                    <span className="truncate">{statusLabel}</span>
                                  </Badge>
                                );
                              })()}
                            </td>
                            <td className="px-5 py-4 text-right">
                              <Button
                                variant="primary"
                                size="sm"
                                className="gap-2"
                                onClick={() => {
                                  setAllocationForm((prev) => ({
                                    ...prev,
                                    campaignId: campaign.campaignId,
                                  }));
                                  setOpenCreateAllocation(true);
                                }}
                              >
                                <span className="material-symbols-outlined text-lg">send</span>
                                Điều phối ngay
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={openCreateInventory} onOpenChange={setOpenCreateInventory}>
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle>Tạo kho mới</DialogTitle>
            <DialogDescription>Chọn trạm và cấp kho để khởi tạo kho mới.</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="inventory-station">
                Trạm trực thuộc <RequiredMark />
              </Label>
              <Select
                value={inventoryForm.reliefStationId}
                onValueChange={(value) =>
                  setInventoryForm((prev) => ({ ...prev, reliefStationId: value }))
                }
              >
                <SelectTrigger id="inventory-station">
                  <SelectValue placeholder="Chọn trạm" />
                </SelectTrigger>
                <SelectContent>
                  {stations.map((station) => {
                    const stationId = station.reliefStationId ?? station.stationId ?? station.id;
                    return (
                      <SelectItem key={stationId} value={stationId}>
                        <span className="material-symbols-outlined text-[18px] text-green-500">
                          warehouse
                        </span>{' '}
                        {station.name}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="inventory-level">
                Cấp kho <RequiredMark />
              </Label>
              <Select
                value={inventoryForm.level}
                onValueChange={(value) => setInventoryForm((prev) => ({ ...prev, level: value }))}
              >
                <SelectTrigger id="inventory-level">
                  <SelectValue placeholder="Chọn cấp kho" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={String(InventoryLevel.Regional)}>
                    <span className="material-symbols-outlined text-[18px] text-green-500">
                      {getInventoryLevelIcon(InventoryLevel.Regional)}
                    </span>
                    {getInventoryLevelLabel(InventoryLevel.Regional)}
                  </SelectItem>
                  <SelectItem value={String(InventoryLevel.Provincial)}>
                    <span className="material-symbols-outlined text-[18px] text-primary">
                      {getInventoryLevelIcon(InventoryLevel.Provincial)}
                    </span>{' '}
                    {getInventoryLevelLabel(InventoryLevel.Provincial)}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="destructive" onClick={() => setOpenCreateInventory(false)}>
              <span className="material-symbols-outlined text-lg">close</span>
              Hủy
            </Button>
            <Button
              variant="primary"
              onClick={handleCreateInventory}
              disabled={createInventoryStatus === 'pending'}
            >
              <span className="material-symbols-outlined text-lg">add</span>
              {createInventoryStatus === 'pending' ? 'Đang tạo...' : 'Tạo kho'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ManagerCreateSupplyDialog
        open={openCreateSupply}
        onOpenChange={setOpenCreateSupply}
        drafts={supplyDrafts}
        onDraftChange={updateSupplyDraft}
        onAddDraft={addSupplyDraft}
        onRemoveDraft={removeSupplyDraft}
        onSubmit={handleCreateSupplyItems}
        isPending={createSupplyItemStatus === 'pending'}
      />

      <ManagerBulkEditSupplyDialog
        open={openBulkEditSupply}
        onOpenChange={setOpenBulkEditSupply}
        drafts={bulkEditSupplyDrafts}
        onDraftChange={handleBulkEditDraftChange}
        onSubmit={handleSaveBulkEditedSupply}
        isPending={updateSupplyItemStatus === 'pending'}
      />

      <Dialog open={openCreateAllocation} onOpenChange={setOpenCreateAllocation}>
        <DialogContent className="!max-w-none w-[94vw] max-w-5xl h-[88vh] overflow-hidden p-0 flex flex-col">
          <DialogHeader className="px-6 py-4 border-b border-border">
            <DialogTitle>Tạo phiếu điều phối hàng hóa</DialogTitle>
            <DialogDescription>
              Chọn một chiến dịch, một kho nguồn và nhiều vật phẩm cần điều phối trong cùng một
              phiếu.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 min-h-0 overflow-y-auto p-6 space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>
                  Chiến dịch <RequiredMark />
                </Label>
                <Select
                  value={allocationForm.campaignId}
                  onValueChange={(value) =>
                    setAllocationForm((prev) => ({ ...prev, campaignId: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn chiến dịch" />
                  </SelectTrigger>
                  <SelectContent>
                    {campaigns.map((campaign) => (
                      <SelectItem key={campaign.campaignId} value={campaign.campaignId}>
                        <span className="material-symbols-outlined text-[18px] text-blue-500">
                          campaign
                        </span>
                        {campaign.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label>
                  Kho nguồn <RequiredMark />
                </Label>
                <Select
                  value={allocationForm.sourceInventoryId}
                  onValueChange={(value) =>
                    setAllocationForm((prev) => ({ ...prev, sourceInventoryId: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn kho nguồn" />
                  </SelectTrigger>
                  <SelectContent>
                    {activeInventories.map((inventory) => (
                      <SelectItem key={inventory.inventoryId} value={inventory.inventoryId}>
                        <span className="material-symbols-outlined text-[18px] text-green-500">
                          warehouse
                        </span>
                        {inventory.reliefStationName}{' '}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {allocationForm.items.map((item, index) => (
              <Card key={item.id} className="border-border bg-card">
                <CardContent className="p-5 space-y-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-foreground">Dòng điều phối #{index + 1}</p>
                      <p className="text-xs text-muted-foreground">
                        Chọn vật phẩm và số lượng cần cấp phát.
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive"
                      disabled={allocationForm.items.length === 1}
                      onClick={() => removeAllocationItem(item.id)}
                    >
                      <span className="material-symbols-outlined text-lg">delete</span>
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-[1fr_180px] gap-4">
                    <div className="grid gap-2">
                      <Label>
                        Vật phẩm <RequiredMark />
                      </Label>
                      <Select
                        key={item.id}
                        value={item.supplyItemId}
                        onValueChange={(value) =>
                          updateAllocationItem(item.id, 'supplyItemId', value)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Chọn vật phẩm" />
                        </SelectTrigger>
                        <SelectContent>
                          {supplyItems.map((supplyItem) => (
                            <SelectItem key={supplyItem.id} value={supplyItem.id}>
                              <div className="flex items-center justify-between gap-3 min-w-0 flex-wrap">
                                <div className="flex items-center gap-2">
                                  {supplyItem.iconUrl && (
                                    <span className="material-symbols-outlined text-[18px] text-green-500">
                                      {supplyItem.iconUrl}
                                    </span>
                                  )}
                                  <span className="truncate">
                                    {supplyItem.name} -{' '}
                                    {getSupplyCategoryLabel(supplyItem.category)}
                                  </span>
                                </div>
                                <div className="text-xs text-muted-foreground shrink-0">
                                  Tồn:{' '}
                                  {formatNumberVN(
                                    (
                                      allocationStockLotsBySupplyItemId.get(supplyItem.id) || []
                                    ).reduce((sum, stock) => sum + stock.currentQuantity, 0),
                                  )}
                                </div>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid gap-2">
                      <Label>
                        Số lượng <RequiredMark />
                      </Label>
                      <Input
                        inputMode="numeric"
                        value={formatNumberInputVN(item.quantity)}
                        onChange={(e) =>
                          updateAllocationItem(
                            item.id,
                            'quantity',
                            normalizeNumberInput(e.target.value),
                          )
                        }
                      />
                    </div>
                  </div>

                  {item.supplyItemId && (
                    <div className="rounded-xl border border-border bg-muted/20 p-3 text-sm text-muted-foreground">
                      <p>
                        Tồn kho trung tâm hiện có:{' '}
                        <span className="font-semibold text-foreground">
                          {formatNumberVN(
                            (allocationStockLotsBySupplyItemId.get(item.supplyItemId) || []).reduce(
                              (sum, stock) => sum + stock.currentQuantity,
                              0,
                            ),
                          )}
                        </span>
                        /
                        {supplyItems.find((supply) => supply.id === item.supplyItemId)?.unit && (
                          <span className="text-[12px] text-muted-foreground font-normal">
                            {supplyItems.find((supply) => supply.id === item.supplyItemId)?.unit}
                          </span>
                        )}
                      </p>
                      <p>
                        {isLoadingAllocationInventoryStocks
                          ? 'Đang tải tồn kho theo kho nguồn đã chọn...'
                          : 'Hãy nhập số lượng điều phối không vượt quá lượng tồn khả dụng.'}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}

            <Button variant="outline" className="gap-2" onClick={addAllocationItem}>
              <span className="material-symbols-outlined text-lg">add</span>
              Thêm dòng vật phẩm
            </Button>
          </div>

          <DialogFooter className="px-6 py-4 border-t border-border bg-background shrink-0">
            <Button variant="destructive" onClick={() => setOpenCreateAllocation(false)}>
              <span className="material-symbols-outlined text-lg">close</span>
              Hủy
            </Button>
            <Button
              variant="primary"
              className="gap-2"
              onClick={handleCreateAllocation}
              disabled={createSupplyAllocationStatus === 'pending'}
            >
              <span className="material-symbols-outlined text-lg">local_shipping</span>
              {createSupplyAllocationStatus === 'pending' ? 'Đang tạo...' : 'Xác nhận điều phối'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== Dialog Tạo tồn kho mới ===== */}
      <Dialog open={openCreateStockDialog} onOpenChange={setOpenCreateStockDialog}>
        <DialogContent className="!max-w-none w-[94vw] max-w-5xl h-[88vh] overflow-hidden p-0 flex flex-col">
          <DialogHeader className="px-6 py-4 border-b border-border">
            <DialogTitle>Tạo tồn kho mới</DialogTitle>
            <DialogDescription>
              {selectedInventoryForStock
                ? `Kho: ${selectedInventoryForStock.name} — Chỉ dùng để thêm vật phẩm chưa có trong kho. Nếu vật phẩm đã tồn tại, hệ thống sẽ báo lỗi.`
                : 'Chọn vật phẩm chưa có trong kho để tạo tồn kho mới.'}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4">
            <div className="rounded-xl border border-border bg-emerald-500/10 p-4 text-sm text-emerald-700 font-medium">
              {isLoadingInventoryStocks
                ? 'Đang tải tồn kho hiện tại của kho...'
                : `Kho hiện có ${inventoryStocks.length} vật phẩm. Chỉ có thể thêm vật phẩm chưa có trong danh sách này.`}
            </div>

            {stockDrafts.map((item, index) => {
              const selectedSupply = supplyItems.find((supply) => supply.id === item.supplyItemId);
              const existingLots = item.supplyItemId
                ? stockLotsBySupplyItemId.get(item.supplyItemId) || []
                : [];
              const alreadyExists = existingLots.length > 0;

              return (
                <Card key={item.id} className="border-border bg-card">
                  <CardContent className="p-5 space-y-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold text-foreground">Vật phẩm mới #{index + 1}</p>
                        {alreadyExists ? (
                          <p className="text-xs text-destructive font-medium">
                            ⚠ Vật phẩm này đã có trong kho – không thể tạo mới. Hãy chọn vật phẩm
                            khác.
                          </p>
                        ) : (
                          <p className="text-xs text-destructive">
                            Vật phẩm chưa có trong kho – có thể tạo tồn kho mới.
                          </p>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive"
                        disabled={stockDrafts.length === 1}
                        onClick={() => removeStockDraft(item.id)}
                      >
                        <span className="material-symbols-outlined text-lg">delete</span>
                      </Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label>
                          Vật phẩm <RequiredMark />
                        </Label>
                        <Select
                          value={item.supplyItemId}
                          onValueChange={(value) =>
                            updateStockDraft(item.id, 'supplyItemId', value)
                          }
                        >
                          <SelectTrigger className={alreadyExists ? 'border-destructive' : ''}>
                            <SelectValue placeholder="Chọn vật phẩm" />
                          </SelectTrigger>
                          <SelectContent>
                            {supplyItems.map((supplyItem) => (
                              <SelectItem key={supplyItem.id} value={supplyItem.id}>
                                {supplyItem.iconUrl && (
                                  <span className="material-symbols-outlined text-[18px] text-green-500">
                                    {supplyItem.iconUrl}
                                  </span>
                                )}
                                {supplyItem.name} - {getSupplyCategoryLabel(supplyItem.category)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="grid gap-2">
                        <Label>
                          Số lượng ban đầu <RequiredMark />
                        </Label>
                        <Input
                          inputMode="numeric"
                          value={formatNumberInputVN(item.importQuantity)}
                          onChange={(e) =>
                            updateStockDraft(
                              item.id,
                              'importQuantity',
                              normalizeNumberInput(e.target.value),
                            )
                          }
                          placeholder="0"
                        />
                      </div>

                      <div className="grid gap-2">
                        <Label>Mức tồn tối thiểu</Label>
                        <Input
                          inputMode="numeric"
                          value={formatNumberInputVN(item.minimumStockLevel)}
                          onChange={(e) =>
                            updateStockDraft(
                              item.id,
                              'minimumStockLevel',
                              normalizeNumberInput(e.target.value),
                            )
                          }
                          placeholder="0"
                        />
                      </div>

                      <div className="grid gap-2">
                        <Label>Mức tồn tối đa</Label>
                        <Input
                          inputMode="numeric"
                          value={formatNumberInputVN(item.maximumStockLevel)}
                          onChange={(e) =>
                            updateStockDraft(
                              item.id,
                              'maximumStockLevel',
                              normalizeNumberInput(e.target.value),
                            )
                          }
                          placeholder="0"
                        />
                      </div>

                      <div className="grid gap-2 md:col-span-2">
                        <Label>Ngày hết hạn (tùy chọn)</Label>
                        <div className="space-y-3">
                          <Button
                            variant="outline"
                            className="gap-2"
                            onClick={() => {
                              if (
                                openExpirationDateCalendarDialog &&
                                selectedExpirationDateId === item.id
                              ) {
                                closeExpirationDateCalendarDialogAction();
                                return;
                              }
                              openExpirationDateCalendarDialogAction(item.id);
                            }}
                          >
                            <span className="material-symbols-outlined text-[16px]">calendar</span>
                            {item.expirationDate ? (
                              parseLocalDateFromYmd(item.expirationDate)?.toLocaleDateString(
                                'vi-VN',
                              )
                            ) : (
                              <span className="text-muted-foreground text-xs">
                                Chọn ngày hết hạn
                              </span>
                            )}
                          </Button>

                          {openExpirationDateCalendarDialog &&
                            selectedExpirationDateId === item.id && (
                              <div className="rounded-xl border border-border bg-muted/20 p-3 w-fit">
                                <CustomCalendar
                                  disabledDays={{ before: new Date() }}
                                  value={parseLocalDateFromYmd(item.expirationDate)}
                                  onChange={(date) => {
                                    if (date) {
                                      updateStockDraft(
                                        item.id,
                                        'expirationDate',
                                        toUtcIsoFromDate(date),
                                      );
                                    } else {
                                      updateStockDraft(item.id, 'expirationDate', '');
                                    }
                                    closeExpirationDateCalendarDialogAction();
                                  }}
                                />
                                <div className="mt-3 flex justify-end gap-2">
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      updateStockDraft(item.id, 'expirationDate', '');
                                      closeExpirationDateCalendarDialogAction();
                                    }}
                                  >
                                    Xóa ngày
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={closeExpirationDateCalendarDialogAction}
                                  >
                                    Đóng
                                  </Button>
                                </div>
                              </div>
                            )}
                        </div>
                      </div>
                    </div>

                    {selectedSupply && (
                      <div className="rounded-xl border border-border bg-muted/20 p-3 text-sm text-muted-foreground">
                        <p className="font-medium text-foreground">{selectedSupply.name}</p>
                        <p>Đơn vị: {selectedSupply.unit}</p>
                        <p>Danh mục: {getSupplyCategoryLabel(selectedSupply.category)}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}

            <Button variant="outline" className="gap-2" onClick={addStockDraft}>
              <span className="material-symbols-outlined text-lg">add</span>
              Thêm dòng vật phẩm
            </Button>
          </div>

          <DialogFooter className="px-6 py-4 border-t border-border bg-background shrink-0">
            <Button variant="destructive" onClick={() => setOpenCreateStockDialog(false)}>
              <span className="material-symbols-outlined text-lg">close</span>
              Hủy
            </Button>
            <Button
              variant="primary"
              className="gap-2"
              onClick={handleCreateNewStock}
              disabled={addStockStatus === 'pending'}
            >
              <span className="material-symbols-outlined text-lg">add_box</span>
              {addStockStatus === 'pending' ? 'Đang tạo...' : 'Tạo tồn kho'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== Dialog Xem chi tiết tồn kho (chỉ đọc) ===== */}
      <Dialog open={openViewStockDialog} onOpenChange={setOpenViewStockDialog}>
        <DialogContent className="!max-w-none w-[94vw] max-w-5xl h-[88vh] overflow-hidden p-0 flex flex-col">
          <DialogHeader className="px-6 py-4 border-b border-border">
            <DialogTitle>Chi tiết tồn kho</DialogTitle>
            <DialogDescription>
              {selectedInventoryForStock
                ? `Kho: ${selectedInventoryForStock.name}`
                : 'Thông tin tồn kho theo từng vật phẩm.'}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 min-h-0 overflow-y-auto p-5 space-y-5">
            {/* Summary */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div className="rounded-xl border border-border bg-sky-500/10 p-4 text-center">
                <p className="text-2xl font-black text-sky-600 dark:text-sky-300">
                  {isLoadingInventoryStocks ? '...' : inventoryStocks.length}
                </p>
                <p className="text-xs text-muted-foreground mt-1">Số dòng tồn kho</p>
              </div>
              <div className="rounded-xl border border-border bg-emerald-500/10 p-4 text-center">
                <p className="text-2xl font-black text-emerald-600 dark:text-emerald-300">
                  {isLoadingInventoryStocks
                    ? '...'
                    : new Set(inventoryStocks.map((s) => s.supplyItemId)).size}
                </p>
                <p className="text-xs text-muted-foreground mt-1">Loại vật phẩm</p>
              </div>
              <div className="rounded-xl border border-border bg-amber-500/10 p-4 text-center">
                <p className="text-2xl font-black text-amber-600 dark:text-amber-300">
                  {isLoadingInventoryStocks
                    ? '...'
                    : formatNumberVN(
                        inventoryStocks.reduce((sum, s) => sum + s.currentQuantity, 0),
                      )}
                </p>
                <p className="text-xs text-muted-foreground mt-1">Tổng số lượng tồn</p>
              </div>
            </div>

            {/* Stock table */}
            {isLoadingInventoryStocks ? (
              <div className="flex items-center justify-center py-12 text-muted-foreground">
                <span className="material-symbols-outlined text-4xl animate-spin text-primary">
                  progress_activity
                </span>
              </div>
            ) : inventoryStocks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-3">
                <span className="material-symbols-outlined text-4xl">inventory_2</span>
                <p>Kho này hiện chưa có vật phẩm nào trong tồn kho.</p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/40 text-left">
                      <th className="px-4 py-3 font-semibold">Vật phẩm</th>
                      <th className="px-4 py-3 font-semibold">Danh mục</th>
                      <th className="px-4 py-3 font-semibold text-right">Số lượng hiện có</th>
                      <th className="px-4 py-3 font-semibold text-right">Min / Max</th>
                      <th className="px-4 py-3 font-semibold text-right">Dung tích</th>
                      <th className="px-4 py-3 font-semibold">Trạng thái</th>
                      <th className="px-4 py-3 font-semibold">Hạn dùng</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inventoryStocks.map((stock, idx) => (
                      <tr
                        key={stock.stockId}
                        className={`border-b border-border/60 hover:bg-muted/30 ${idx % 2 === 0 ? '' : 'bg-muted/10'}`}
                      >
                        <td className="px-4 py-3">
                          <p className="font-medium text-foreground">{stock.supplyItemName}</p>
                        </td>
                        <td className="px-4 py-3">
                          <Badge
                            variant="outline"
                            appearance="outline"
                            size="xs"
                            className={`gap-1.5 text-xs border ${getSupplyCategoryClass(stock.supplyItemCategory)}`}
                          >
                            <span className="material-symbols-outlined text-[14px] shrink-0">
                              {getSupplyCategoryIcon(stock.supplyItemCategory)}
                            </span>
                            {getSupplyCategoryLabel(stock.supplyItemCategory)}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-right font-semibold">
                          {formatNumberVN(stock.currentQuantity)}/
                          <span className="text-xs text-muted-foreground font-normal">
                            {stock.supplyItemUnit}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right text-muted-foreground text-xs">
                          {formatNumberVN(stock.minimumStockLevel)} /{' '}
                          {formatNumberVN(stock.maximumStockLevel)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span
                            className={`font-semibold ${
                              stock.fillPercentage >= 80
                                ? 'text-emerald-600'
                                : stock.fillPercentage >= 40
                                  ? 'text-amber-600'
                                  : 'text-destructive'
                            }`}
                          >
                            {stock.fillPercentage.toFixed(1)}%
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <Badge
                            variant="outline"
                            appearance="outline"
                            size="xs"
                            className={`text-xs border ${getInventoryStatusClass(stock.stockStatus)}`}
                          >
                            {getInventoryStatusLabel(stock.stockStatus)}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          {stock.expirationDate
                            ? (parseLocalDateFromYmd(stock.expirationDate)?.toLocaleDateString(
                                'vi-VN',
                              ) ?? '—')
                            : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <DialogFooter className="px-6 py-4 border-t border-border bg-background shrink-0">
            <Button variant="outline" onClick={() => setOpenViewStockDialog(false)}>
              <span className="material-symbols-outlined text-lg">close</span>
              Đóng
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={openImportStockDialog} onOpenChange={setOpenImportStockDialog}>
        <DialogContent className="!max-w-none w-[94vw] max-w-5xl h-[88vh] overflow-hidden p-0 flex flex-col">
          <DialogHeader className="px-6 py-4 border-b border-border">
            <DialogTitle>Nhập bổ sung tồn kho</DialogTitle>
            <DialogDescription>
              {selectedInventoryForStock
                ? `Kho: ${selectedInventoryForStock.name} — Chỉ nhập bổ sung số lượng cho vật phẩm đã có trong kho. Không thể thêm vật phẩm mới ở đây.`
                : 'Chọn vật phẩm đã có trong kho và nhập số lượng bổ sung.'}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4">
            <div className="rounded-xl border border-border bg-blue-500/10 p-4 text-sm text-blue-700 font-bold">
              {isLoadingInventoryStocks
                ? 'Đang tải tồn kho hiện tại của kho...'
                : `Kho này hiện có ${inventoryStocks.length} Hàng Hóa/Vật Phẩm trong tồn kho.`}
            </div>

            {stockDrafts.map((item, index) => {
              const selectedSupply = supplyItems.find((supply) => supply.id === item.supplyItemId);
              const existingLots = item.supplyItemId
                ? stockLotsBySupplyItemId.get(item.supplyItemId) || []
                : [];
              const notInStock = item.supplyItemId && existingLots.length === 0;

              return (
                <Card key={item.id} className="border-border bg-card">
                  <CardContent className="p-5 space-y-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold text-foreground">Dòng nhập #{index + 1}</p>
                        {notInStock ? (
                          <p className="text-xs text-destructive font-medium">
                            ⚠ Vật phẩm này chưa có trong kho – không thể nhập bổ sung. Dùng "Tạo tồn
                            kho mới" thay thế.
                          </p>
                        ) : existingLots.length > 0 ? (
                          <p className="text-xs text-green-700">
                            Vật phẩm đã có trong kho – có thể nhập bổ sung số lượng.
                          </p>
                        ) : (
                          <p className="text-xs text-muted-foreground">Chọn vật phẩm để nhập.</p>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive"
                        disabled={stockDrafts.length === 1}
                        onClick={() => removeStockDraft(item.id)}
                      >
                        <span className="material-symbols-outlined text-lg">delete</span>
                      </Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label>
                          Vật phẩm <RequiredMark />
                        </Label>
                        <Select
                          value={item.supplyItemId}
                          onValueChange={(value) =>
                            updateStockDraft(item.id, 'supplyItemId', value)
                          }
                        >
                          <SelectTrigger className={notInStock ? 'border-destructive' : ''}>
                            <SelectValue placeholder="Chọn vật phẩm" />
                          </SelectTrigger>
                          <SelectContent>
                            {supplyItems.map((supplyItem) => (
                              <SelectItem key={supplyItem.id} value={supplyItem.id}>
                                {supplyItem.iconUrl && (
                                  <span className="material-symbols-outlined text-[18px] text-green-500">
                                    {supplyItem.iconUrl}
                                  </span>
                                )}
                                {supplyItem.name} - {getSupplyCategoryLabel(supplyItem.category)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="grid gap-2">
                        <Label>
                          Số lượng nhập bổ sung <RequiredMark />
                        </Label>
                        <Input
                          inputMode="numeric"
                          value={formatNumberInputVN(item.importQuantity)}
                          onChange={(e) =>
                            updateStockDraft(
                              item.id,
                              'importQuantity',
                              normalizeNumberInput(e.target.value),
                            )
                          }
                          placeholder="0"
                        />
                      </div>
                    </div>

                    {selectedSupply && (
                      <div className="rounded-xl border border-border bg-muted/20 p-3 text-sm text-muted-foreground">
                        <p className="font-medium text-foreground">{selectedSupply.name}</p>
                        <p>Đơn vị: {selectedSupply.unit}</p>
                        {existingLots[0] && (
                          <p>
                            Tồn kho hiện có:{' '}
                            {formatNumberVN(
                              existingLots.reduce((sum, lot) => sum + lot.currentQuantity, 0),
                            )}{' '}
                            {selectedSupply.unit}
                          </p>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}

            <Button variant="outline" className="gap-2" onClick={addStockDraft}>
              <span className="material-symbols-outlined text-lg">add</span>
              Thêm dòng nhập
            </Button>
          </div>

          <DialogFooter className="px-6 py-4 border-t border-border bg-background shrink-0">
            <Button variant="destructive" onClick={() => setOpenImportStockDialog(false)}>
              <span className="material-symbols-outlined text-lg">close</span>
              Hủy
            </Button>
            <Button
              variant="primary"
              className="gap-2"
              onClick={handleImportStock}
              disabled={createTransactionStatus === 'pending'}
            >
              <span className="material-symbols-outlined text-lg">move_to_inbox</span>
              {createTransactionStatus === 'pending' ? 'Đang nhập...' : 'Xác nhận nhập bổ sung'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== Dialog Cập nhật tồn kho (chỉ PUT updateStock min/max) ===== */}
      <Dialog open={openUpdateStockDialog} onOpenChange={setOpenUpdateStockDialog}>
        <DialogContent className="!max-w-none w-[94vw] max-w-5xl h-[88vh] overflow-hidden p-0 flex flex-col">
          <DialogHeader className="px-6 py-4 border-b border-border">
            <DialogTitle>Cập nhật thông tin tồn kho hiện có</DialogTitle>
            <DialogDescription>
              {selectedInventoryForStock
                ? `Kho: ${selectedInventoryForStock.name} — Chỉ cập nhật ngưỡng tồn tối thiểu/tối đa cho vật phẩm đã có trong kho.`
                : 'Chọn vật phẩm đã có trong kho để cập nhật ngưỡng tồn (min/max).'}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4">
            <div className="rounded-xl border border-border bg-yellow-500/10 p-4 text-sm text-yellow-700 font-bold">
              {isLoadingInventoryStocks
                ? 'Đang tải tồn kho hiện tại của kho...'
                : `Kho này hiện có ${inventoryStocks.length} Hàng Hóa/Vật Phẩm trong tồn kho.`}
            </div>

            {stockDrafts.map((item, index) => {
              const selectedSupply = supplyItems.find((supply) => supply.id === item.supplyItemId);
              const existingLots = item.supplyItemId
                ? stockLotsBySupplyItemId.get(item.supplyItemId) || []
                : [];
              const existingStock = existingLots.find((stock) => stock.stockId === item.stockId);
              const displayStock = existingStock || existingLots[0];
              const notInStock = item.supplyItemId && existingLots.length === 0;

              return (
                <Card key={item.id} className="border-border bg-card">
                  <CardContent className="p-5 space-y-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold text-foreground">Dòng cập nhật #{index + 1}</p>
                        {notInStock ? (
                          <p className="text-xs text-destructive font-medium">
                            ⚠ Vật phẩm này chưa có trong kho – không thể cập nhật ở đây. Dùng "Tạo
                            tồn kho mới" thay thế.
                          </p>
                        ) : existingLots.length > 0 ? (
                          <p className="text-xs text-green-700">
                            Vật phẩm đã có trong kho – có thể cập nhật ngưỡng tồn.
                          </p>
                        ) : (
                          <p className="text-xs text-muted-foreground">Chọn vật phẩm.</p>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive"
                        disabled={stockDrafts.length === 1}
                        onClick={() => removeStockDraft(item.id)}
                      >
                        <span className="material-symbols-outlined text-lg">delete</span>
                      </Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label>
                          Vật phẩm <RequiredMark />
                        </Label>
                        <Select
                          value={item.supplyItemId}
                          onValueChange={(value) =>
                            updateStockDraft(item.id, 'supplyItemId', value)
                          }
                        >
                          <SelectTrigger className={notInStock ? 'border-destructive' : ''}>
                            <SelectValue placeholder="Chọn vật phẩm" />
                          </SelectTrigger>
                          <SelectContent>
                            {supplyItems.map((supplyItem) => (
                              <SelectItem key={supplyItem.id} value={supplyItem.id}>
                                {supplyItem.iconUrl && (
                                  <span className="material-symbols-outlined text-[18px] text-green-500">
                                    {supplyItem.iconUrl}
                                  </span>
                                )}
                                {supplyItem.name} - {getSupplyCategoryLabel(supplyItem.category)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {item.supplyItemId && existingLots.length > 1 && (
                        <div className="grid gap-2">
                          <Label>
                            Chọn lô hàng cần cập nhật <RequiredMark />
                          </Label>
                          <Select
                            value={item.stockId || ''}
                            onValueChange={(value) => updateStockDraft(item.id, 'stockId', value)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Chọn lô hàng" />
                            </SelectTrigger>
                            <SelectContent>
                              {existingLots.map((lot, lotIndex) => (
                                <SelectItem key={lot.stockId} value={lot.stockId}>
                                  {`Lô #${lotIndex + 1} • Tồn ${formatNumberVN(lot.currentQuantity)}${selectedSupply?.unit ? ` ${selectedSupply.unit}` : ''}${lot.expirationDate ? ` • HSD ${parseLocalDateFromYmd(lot.expirationDate)?.toLocaleDateString('vi-VN') || ''}` : ''}`}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}

                      <div className="grid gap-2">
                        <Label>Mức tồn tối thiểu</Label>
                        <Input
                          inputMode="numeric"
                          value={formatNumberInputVN(item.minimumStockLevel)}
                          onChange={(e) =>
                            updateStockDraft(
                              item.id,
                              'minimumStockLevel',
                              normalizeNumberInput(e.target.value),
                            )
                          }
                          placeholder="0"
                        />
                      </div>

                      <div className="grid gap-2">
                        <Label>Mức tồn tối đa</Label>
                        <Input
                          inputMode="numeric"
                          value={formatNumberInputVN(item.maximumStockLevel)}
                          onChange={(e) =>
                            updateStockDraft(
                              item.id,
                              'maximumStockLevel',
                              normalizeNumberInput(e.target.value),
                            )
                          }
                          placeholder="0"
                        />
                      </div>
                    </div>

                    {selectedSupply && (
                      <div className="rounded-xl border border-border bg-muted/20 p-3 text-sm text-muted-foreground">
                        <p className="font-medium text-foreground">{selectedSupply.name}</p>
                        <p>Đơn vị: {selectedSupply.unit}</p>
                        {displayStock && (
                          <p>
                            Hiện có trong kho: {formatNumberVN(displayStock.currentQuantity)} •
                            Ngưỡng hiện tại: {formatNumberVN(displayStock.minimumStockLevel)} -{' '}
                            {formatNumberVN(displayStock.maximumStockLevel)}
                          </p>
                        )}
                        {existingLots.length > 1 && (
                          <p>
                            Vật phẩm này đang có {existingLots.length} lô trong kho. Hãy chọn đúng
                            lô cần cập nhật ngưỡng tồn.
                          </p>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}

            <Button variant="warning" className="gap-2" onClick={addStockDraft}>
              <span className="material-symbols-outlined text-lg">add</span>
              Thêm dòng cập nhật
            </Button>
          </div>

          <DialogFooter className="px-6 py-4 border-t border-border bg-background shrink-0">
            <Button variant="destructive" onClick={() => setOpenUpdateStockDialog(false)}>
              <span className="material-symbols-outlined text-lg">close</span>
              Hủy
            </Button>
            <Button
              variant="primary"
              className="gap-2"
              onClick={handleUpdateStock}
              disabled={updateStockStatus === 'pending'}
            >
              <span className="material-symbols-outlined text-lg">inventory</span>
              {updateStockStatus === 'pending' ? 'Đang cập nhật...' : 'Lưu cập nhật'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ManagerTransferHistoryDialog
        open={openTransferHistory}
        onOpenChange={setOpenTransferHistory}
        transfers={detailedTransferHistory}
        isLoading={isLoadingTransferHistory || isLoadingTransferHistoryDetails}
        onApprove={(id) => approveSupplyTransfer({ id, data: {} })}
        onShip={(id) => shipSupplyTransfer({ id, data: {} })}
        onReceive={(id) =>
          receiveSupplyTransfer({
            id,
            data: {
              items:
                transferHistory
                  .find((transfer: any) => transfer.id === id)
                  ?.items?.map((item: any) => ({
                    supplyItemId: item.supplyItemId,
                    actualQuantity: item.requestedQuantity ?? item.quantity ?? 0,
                    notes: item.notes,
                  })) || [],
            },
          })
        }
        onCancel={(id) => cancelSupplyTransfer({ id, data: {} })}
      />

      <ManagerTransactionHistoryDialog
        open={openTransactionHistory}
        onOpenChange={setOpenTransactionHistory}
        inventoryName={selectedInventoryForHistory?.name || ''}
        transactions={transactionHistory}
        isLoading={isLoadingTransactionHistory}
      />
    </DashboardLayout>
  );
}
