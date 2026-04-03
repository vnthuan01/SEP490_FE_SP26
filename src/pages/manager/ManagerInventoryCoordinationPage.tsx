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
  useCreateSupplyTransfer,
  useReceiveSupplyTransfer,
  useShipSupplyTransfer,
  useSupplyTransfersBySourceStation,
} from '@/hooks/useSupplyTransfers';
import { managerNavItems, managerProjects } from './components/sidebarConfig';
import {
  ManagerCreateTransferDialog,
  ManagerTransactionHistoryDialog,
  ManagerTransferHistoryDialog,
  type TransferItemDraft,
} from './components/ManagerTransferDialogs';
import { TransferPdfWorkflowDialog } from '@/components/pdf/TransferPdfWorkflowDialog';
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
  getSupplyCategoryLabel,
} from '@/enums/beEnums';
import {
  formatNumberInputVN,
  formatNumberVN,
  normalizeNumberInput,
  parseFormattedNumber,
} from '@/lib/utils';
import { toast } from 'sonner';

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
};

type TransferDialogState = {
  sourceInventoryId: string;
  sourceStationId: string;
  sourceInventoryName: string;
  destinationStationId: string;
  reason: string;
  notes: string;
  items: TransferItemDraft[];
};

const DANH_MUC_VAT_PHAM = [
  SupplyCategory.LuongThuc,
  SupplyCategory.YTeVaThuoc,
  SupplyCategory.NuocUong,
  SupplyCategory.DungCuVaLeuTrai,
  SupplyCategory.Khac,
] as const;

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
});

const taoDongTransfer = (): TransferItemDraft => ({
  id: crypto.randomUUID(),
  supplyItemId: '',
  quantity: '1',
  notes: '',
  iconUrl: '',
});

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
  const [openCreateTransfer, setOpenCreateTransfer] = useState(false);
  const [openTransferHistory, setOpenTransferHistory] = useState(false);
  const [openTransactionHistory, setOpenTransactionHistory] = useState(false);
  const [openTransferPdfWorkflow, setOpenTransferPdfWorkflow] = useState(false);
  const [openStockDialog, setOpenStockDialog] = useState(false);
  const [selectedInventoryForStock, setSelectedInventoryForStock] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [selectedInventoryForHistory, setSelectedInventoryForHistory] = useState<{
    id: string;
    name: string;
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
  const [transferForm, setTransferForm] = useState<TransferDialogState>({
    sourceInventoryId: '',
    sourceStationId: '',
    sourceInventoryName: '',
    destinationStationId: '',
    reason: '',
    notes: '',
    items: [taoDongTransfer()],
  });
  const [lastCreatedTransferId, setLastCreatedTransferId] = useState('');

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
    { pageIndex: 1, pageSize: 200 },
  );
  const { data: transferInventoryStocksResponse } = useInventoryStocks(
    transferForm.sourceInventoryId || '',
    {
      pageIndex: 1,
      pageSize: 500,
    },
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
    useSupplyTransfersBySourceStation(selectedInventoryForHistory?.id || '');
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
  const { mutateAsync: createSupplyTransfer, status: createSupplyTransferStatus } =
    useCreateSupplyTransfer();
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
  const transferInventoryStocks = transferInventoryStocksResponse?.items || [];
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
  const transactionHistory = (transactionHistoryResponse as any)?.items || [];

  const activeInventories = useMemo(
    () => inventories.filter((inv) => inv.status === EntityStatus.Active),
    [inventories],
  );
  const stockMapBySupplyItemId = useMemo(
    () => new Map(inventoryStocks.map((stock) => [stock.supplyItemId, stock])),
    [inventoryStocks],
  );
  const allocationStockMapBySupplyItemId = useMemo(
    () => new Map(allocationInventoryStocks.map((stock) => [stock.supplyItemId, stock])),
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

  const openStockManagement = (inventoryId: string, inventoryName: string) => {
    setSelectedInventoryForStock({ id: inventoryId, name: inventoryName });
    setStockDrafts([taoDongCapNhatTonKho()]);
    setOpenStockDialog(true);
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
          const existingStock = stockMapBySupplyItemId.get(value);
          return {
            ...item,
            supplyItemId: value,
            stockId: existingStock?.stockId,
            isExisting: !!existingStock,
            minimumStockLevel: existingStock
              ? String(existingStock.minimumStockLevel)
              : item.minimumStockLevel,
            maximumStockLevel: existingStock
              ? String(existingStock.maximumStockLevel)
              : item.maximumStockLevel,
          };
        }

        return { ...item, [key]: value };
      }),
    );
  };

  const handleSaveStocks = async () => {
    if (!selectedInventoryForStock?.id) {
      toast.error('Không tìm thấy kho để cập nhật tồn kho.');
      return;
    }

    const validDrafts = stockDrafts.filter((item) => item.supplyItemId);
    if (validDrafts.length === 0) {
      toast.error('Vui lòng chọn ít nhất một vật phẩm.');
      return;
    }

    for (const item of validDrafts) {
      const minimumStockLevel = parseFormattedNumber(item.minimumStockLevel);
      const maximumStockLevel = parseFormattedNumber(item.maximumStockLevel);
      const importQuantity = parseFormattedNumber(item.importQuantity);

      if (minimumStockLevel < 0 || maximumStockLevel < 0 || importQuantity < 0) {
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
      const importQuantity = parseFormattedNumber(item.importQuantity);

      if (item.isExisting && item.stockId) {
        await updateStock({
          stockId: item.stockId,
          inventoryId: selectedInventoryForStock.id,
          data: {
            minimumStockLevel,
            maximumStockLevel,
          },
        });

        if (importQuantity > 0) {
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
                notes: 'Nhập hoặc cập nhật tồn kho từ trang điều phối kho',
              },
            ],
          });
        }
      } else {
        await addStock({
          id: selectedInventoryForStock.id,
          data: {
            supplyItemId: item.supplyItemId,
            currentQuantity: importQuantity,
            minimumStockLevel,
            maximumStockLevel,
          },
        });
      }
    }

    setStockDrafts([taoDongCapNhatTonKho()]);
    setOpenStockDialog(false);
  };

  const openTransferDialog = (
    inventoryId: string,
    reliefStationId: string,
    inventoryName: string,
  ) => {
    setTransferForm({
      sourceInventoryId: inventoryId,
      sourceStationId: reliefStationId,
      sourceInventoryName: inventoryName,
      destinationStationId: '',
      reason: '',
      notes: '',
      items: [taoDongTransfer()],
    });
    setOpenCreateTransfer(true);
  };

  const updateTransferForm = (key: 'destinationStationId' | 'reason' | 'notes', value: string) => {
    setTransferForm((prev) => ({ ...prev, [key]: value }));
  };

  const updateTransferItem = (
    id: string,
    key: 'supplyItemId' | 'quantity' | 'notes',
    value: string,
  ) => {
    setTransferForm((prev) => ({
      ...prev,
      items: prev.items.map((item) => (item.id === id ? { ...item, [key]: value } : item)),
    }));
  };

  const addTransferItem = () => {
    setTransferForm((prev) => ({
      ...prev,
      items: [...prev.items, taoDongTransfer()],
    }));
  };

  const removeTransferItem = (id: string) => {
    setTransferForm((prev) => ({
      ...prev,
      items: prev.items.length === 1 ? prev.items : prev.items.filter((item) => item.id !== id),
    }));
  };

  const handleCreateTransfer = async () => {
    if (!transferForm.sourceStationId || !transferForm.destinationStationId) {
      toast.error('Vui lòng chọn đầy đủ kho nguồn và trạm đích.');
      return;
    }

    if (!transferForm.reason.trim()) {
      toast.error('Vui lòng nhập lý do chuyển kho.');
      return;
    }

    const validItems = transferForm.items
      .map((item) => ({
        supplyItemId: item.supplyItemId,
        quantity: parseFormattedNumber(item.quantity),
        notes: item.notes?.trim() || undefined,
      }))
      .filter((item) => item.supplyItemId && item.quantity > 0);

    if (validItems.length === 0) {
      toast.error('Vui lòng thêm ít nhất một vật phẩm chuyển kho hợp lệ.');
      return;
    }

    const createdTransfer = await createSupplyTransfer({
      sourceStationId: transferForm.sourceStationId,
      destinationStationId: transferForm.destinationStationId,
      reason: transferForm.reason.trim(),
      notes: transferForm.notes,
      items: validItems,
    });

    const createdTransferId =
      (createdTransfer as any)?.data?.id ||
      (createdTransfer as any)?.data?.transferId ||
      transferForm.sourceInventoryId ||
      'TRANSFER_MOI';
    setLastCreatedTransferId(createdTransferId);
    setOpenCreateTransfer(false);
    setOpenTransferPdfWorkflow(true);
  };

  const openTransferHistoryDialog = (inventoryId: string, inventoryName: string) => {
    setSelectedInventoryForHistory({ id: inventoryId, name: inventoryName });
    setOpenTransferHistory(true);
  };

  const openTransactionHistoryDialog = (inventoryId: string, inventoryName: string) => {
    setSelectedInventoryForHistory({ id: inventoryId, name: inventoryName });
    setOpenTransactionHistory(true);
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
                    onManageStock={openStockManagement}
                    onCreateTransfer={openTransferDialog}
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
                                    allocationStockMapBySupplyItemId.get(supplyItem.id)
                                      ?.currentQuantity || 0,
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
                            allocationStockMapBySupplyItemId.get(item.supplyItemId)
                              ?.currentQuantity || 0,
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

      <Dialog open={openStockDialog} onOpenChange={setOpenStockDialog}>
        <DialogContent className="!max-w-none w-[94vw] max-w-5xl h-[88vh] overflow-hidden p-0 flex flex-col">
          <DialogHeader className="px-6 py-4 border-b border-border">
            <DialogTitle>Nhập hoặc cập nhật tồn kho</DialogTitle>
            <DialogDescription>
              {selectedInventoryForStock
                ? `Kho đang chọn: ${selectedInventoryForStock.name}`
                : 'Chọn vật phẩm để thêm mới hoặc cập nhật mức tồn kho hiện có.'}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4">
            <div className="rounded-xl border border-border bg-yellow-500/10 p-4 text-sm text-yellow-600 font-bold">
              {isLoadingInventoryStocks
                ? 'Đang tải tồn kho hiện tại của kho...'
                : `Kho này hiện có ${inventoryStocks.length} Hàng Hóa/Vật Phẩm trong tồn kho.`}
            </div>

            {stockDrafts.map((item, index) => {
              const selectedSupply = supplyItems.find((supply) => supply.id === item.supplyItemId);
              const existingStock = item.supplyItemId
                ? stockMapBySupplyItemId.get(item.supplyItemId)
                : undefined;

              return (
                <Card key={item.id} className="border-border bg-card">
                  <CardContent className="p-5 space-y-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold text-foreground">Dòng tồn kho #{index + 1}</p>
                        <p className="text-xs text-muted-foreground">
                          {existingStock
                            ? 'Vật phẩm này đã có trong kho. Có thể cập nhật ngưỡng tồn và nhập bổ sung.'
                            : 'Vật phẩm này chưa có trong kho. Hệ thống sẽ tạo mới tồn kho cho vật phẩm.'}
                        </p>
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
                          <SelectTrigger>
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
                        <Label>Số lượng nhập thêm</Label>
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
                    </div>

                    {selectedSupply && (
                      <div className="rounded-xl border border-border bg-muted/20 p-3 text-sm text-muted-foreground">
                        <p className="font-medium text-foreground">{selectedSupply.name}</p>
                        <p>Đơn vị: {selectedSupply.unit}</p>
                        {existingStock && (
                          <p>
                            Hiện có trong kho: {formatNumberVN(existingStock.currentQuantity)} •
                            Ngưỡng hiện tại: {formatNumberVN(existingStock.minimumStockLevel)} -{' '}
                            {formatNumberVN(existingStock.maximumStockLevel)}
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
              Thêm dòng tồn kho
            </Button>
          </div>

          <DialogFooter className="px-6 py-4 border-t border-border bg-background shrink-0">
            <Button variant="destructive" onClick={() => setOpenStockDialog(false)}>
              <span className="material-symbols-outlined text-lg">close</span>
              Hủy
            </Button>
            <Button
              variant="primary"
              className="gap-2"
              onClick={handleSaveStocks}
              disabled={
                addStockStatus === 'pending' ||
                updateStockStatus === 'pending' ||
                createTransactionStatus === 'pending'
              }
            >
              <span className="material-symbols-outlined text-lg">inventory</span>
              Lưu tồn kho
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ManagerCreateTransferDialog
        open={openCreateTransfer}
        onOpenChange={setOpenCreateTransfer}
        sourceInventoryName={transferForm.sourceInventoryName}
        destinationStations={stations.map((station) => ({
          id: station.reliefStationId ?? station.stationId ?? station.id,
          name: station.name,
        }))}
        supplyItems={supplyItems}
        sourceStocks={transferInventoryStocks}
        transferForm={{
          destinationStationId: transferForm.destinationStationId,
          reason: transferForm.reason,
          notes: transferForm.notes,
          items: transferForm.items,
        }}
        onFormChange={updateTransferForm}
        onItemChange={updateTransferItem}
        onAddItem={addTransferItem}
        onRemoveItem={removeTransferItem}
        onSubmit={handleCreateTransfer}
        isPending={createSupplyTransferStatus === 'pending'}
      />

      <ManagerTransferHistoryDialog
        open={openTransferHistory}
        onOpenChange={setOpenTransferHistory}
        transfers={transferHistory}
        isLoading={isLoadingTransferHistory}
        onApprove={(id) => approveSupplyTransfer(id)}
        onShip={(id) => shipSupplyTransfer(id)}
        onReceive={(id) => receiveSupplyTransfer(id)}
        onCancel={(id) => cancelSupplyTransfer(id)}
      />

      <ManagerTransactionHistoryDialog
        open={openTransactionHistory}
        onOpenChange={setOpenTransactionHistory}
        inventoryName={selectedInventoryForHistory?.name || ''}
        transactions={transactionHistory}
        isLoading={isLoadingTransactionHistory}
      />

      <TransferPdfWorkflowDialog
        open={openTransferPdfWorkflow}
        onOpenChange={setOpenTransferPdfWorkflow}
        data={{
          transferCode: lastCreatedTransferId || 'TRANSFER_MOI',
          sourceName: transferForm.sourceInventoryName || 'Kho nguồn',
          destinationName:
            stations.find(
              (station) =>
                (station.reliefStationId ?? station.stationId ?? station.id) ===
                transferForm.destinationStationId,
            )?.name || 'Trạm nhận hàng',
          createdAt: new Date().toLocaleString('vi-VN'),
          decidedBy: 'Quản lý kho tổng',
          notes: transferForm.notes,
          items: transferForm.items
            .map((item) => {
              const matchedSupply = supplyItems.find((supply) => supply.id === item.supplyItemId);
              return {
                name: matchedSupply?.name || item.supplyItemId,
                quantity: parseFormattedNumber(item.quantity),
                unit: matchedSupply?.unit,
              };
            })
            .filter((item) => item.name && item.quantity > 0),
        }}
      />
    </DashboardLayout>
  );
}
