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
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  useAddStock,
  useCreateInventory,
  useCreateTransaction,
  useInventories,
  useInventoryStocks,
  useUpdateInventory,
  useUpdateStock,
} from '@/hooks/useInventory';
import { useCampaigns } from '@/hooks/useCampaigns';
import {
  useCreateSupplyAllocation,
  useCreateSupplyItem,
  useSupplyItems,
} from '@/hooks/useSupplies';
import { useProvincialStations } from '@/hooks/useReliefStations';
import { managerNavItems, managerProjects } from './components/sidebarConfig';
import {
  IconGuide,
  RequiredMark,
  StatCard,
  SupplyCategoryBadge,
} from './components/ManagerInventoryShared';
import {
  EntityStatus,
  InventoryLevel,
  SupplyCategory,
  TransactionReason,
  TransactionType,
  getCampaignStatusClass,
  getCampaignStatusIcon,
  getCampaignStatusShortLabel,
  getEntityStatusClass,
  getEntityStatusIcon,
  getEntityStatusLabel,
  getInventoryLevelClass,
  getInventoryLevelIcon,
  getInventoryLevelLabel,
  getSupplyCategoryClass,
  getSupplyCategoryIcon,
  getSupplyCategoryLabel,
} from '@/enums/beEnums';
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

const responsiveBadgeTextClass =
  'min-w-0 overflow-hidden text-ellipsis whitespace-nowrap max-w-[84px] sm:max-w-[140px]';

const responsiveBadgeClass =
  'max-w-[46px] px-1.5 sm:max-w-[180px] sm:px-2.5 justify-start overflow-hidden';

export default function ManagerInventoryCoordinationPage() {
  const [selectedTab, setSelectedTab] = useState<QuanLyTab>('hang-hoa');
  const [pageIndex, setPageIndex] = useState(1);
  const [supplyPageIndex, setSupplyPageIndex] = useState(1);
  const [openCreateInventory, setOpenCreateInventory] = useState(false);
  const [openCreateSupply, setOpenCreateSupply] = useState(false);
  const [openCreateAllocation, setOpenCreateAllocation] = useState(false);
  const [openStockDialog, setOpenStockDialog] = useState(false);
  const [selectedInventoryForStock, setSelectedInventoryForStock] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [inventoryForm, setInventoryForm] = useState({
    reliefStationId: '',
    level: String(InventoryLevel.Provincial),
  });
  const [supplyDrafts, setSupplyDrafts] = useState<DongVatPham[]>([taoDongVatPham()]);
  const [stockDrafts, setStockDrafts] = useState<DongCapNhatTonKho[]>([taoDongCapNhatTonKho()]);
  const [allocationForm, setAllocationForm] = useState({
    campaignId: '',
    sourceInventoryId: '',
    items: [taoDongDieuPhoi()],
  });

  const { data: inventoriesResponse, isLoading: isLoadingInventories } = useInventories({
    pageIndex,
    pageSize: 10,
  });
  const { data: supplyItemsResponse, isLoading: isLoadingSupplies } = useSupplyItems({
    pageIndex: supplyPageIndex,
    pageSize: 10,
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

  const { mutateAsync: createInventory, status: createInventoryStatus } = useCreateInventory();
  const { mutateAsync: updateInventory, status: updateInventoryStatus } = useUpdateInventory();
  const { mutateAsync: addStock, status: addStockStatus } = useAddStock();
  const { mutateAsync: updateStock, status: updateStockStatus } = useUpdateStock();
  const { mutateAsync: createTransaction, status: createTransactionStatus } =
    useCreateTransaction();
  const { mutateAsync: createSupplyItem, status: createSupplyItemStatus } = useCreateSupplyItem();
  const { mutateAsync: createSupplyAllocation, status: createSupplyAllocationStatus } =
    useCreateSupplyAllocation();

  const inventories = inventoriesResponse?.items || [];
  const inventoryPagination = inventoriesResponse;
  const supplyItems = supplyItemsResponse?.items || [];
  const supplyPagination = supplyItemsResponse;
  const stations = stationsResponse?.items || [];
  const inventoryStocks = inventoryStocksResponse?.items || [];

  const activeInventories = useMemo(
    () => inventories.filter((inv) => inv.status === EntityStatus.Active),
    [inventories],
  );
  const stockMapBySupplyItemId = useMemo(
    () => new Map(inventoryStocks.map((stock) => [stock.supplyItemId, stock])),
    [inventoryStocks],
  );

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
      .map((item) => ({
        supplyItemId: item.supplyItemId,
        quantity: Number(item.quantity),
      }))
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
      const minimumStockLevel = Number(item.minimumStockLevel || 0);
      const maximumStockLevel = Number(item.maximumStockLevel || 0);
      const importQuantity = Number(item.importQuantity || 0);

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
      const minimumStockLevel = Number(item.minimumStockLevel || 0);
      const maximumStockLevel = Number(item.maximumStockLevel || 0);
      const importQuantity = Number(item.importQuantity || 0);

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
                <div className="relative w-full lg:max-w-md">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-muted-foreground">
                    search
                  </span>
                  <Input className="pl-10" placeholder="Tìm kiếm kho hoặc vật phẩm..." disabled />
                </div>

                <div className="flex flex-wrap gap-3">
                  <Button variant="outline" className="gap-2">
                    <span className="material-symbols-outlined text-lg">tune</span>
                    Lọc dữ liệu
                  </Button>
                  <Button
                    variant="primary"
                    className="gap-2"
                    onClick={() => setOpenCreateSupply(true)}
                  >
                    <span className="material-symbols-outlined text-lg">playlist_add</span>
                    Tạo nhiều vật phẩm
                  </Button>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 xl:grid-cols-[1.2fr_1fr] gap-6">
              <Card className="border-border bg-card">
                <CardContent className="p-0">
                  <div className="px-5 py-4 border-b border-border">
                    <h2 className="text-xl font-bold text-foreground">Danh sách kho</h2>
                    <p className="text-sm text-muted-foreground">
                      Quản lý trạng thái kho theo trải nghiệm tương tự trang kho của điều phối viên.
                    </p>
                  </div>

                  <div className="overflow-x-auto">
                    {isLoadingInventories ? (
                      <div className="flex items-center justify-center py-16 text-muted-foreground">
                        <div className="flex flex-col items-center gap-3">
                          <span className="material-symbols-outlined text-4xl animate-spin text-primary">
                            progress_activity
                          </span>
                          <p>Đang tải danh sách kho...</p>
                        </div>
                      </div>
                    ) : inventories.length === 0 ? (
                      <div className="flex items-center justify-center py-16 text-muted-foreground">
                        <div className="flex flex-col items-center gap-3">
                          <span className="material-symbols-outlined text-4xl">warehouse</span>
                          <p>Chưa có kho nào được tạo</p>
                        </div>
                      </div>
                    ) : (
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border text-left">
                            <th className="px-5 py-3 font-semibold">Kho</th>
                            <th className="px-5 py-3 font-semibold">Trạm</th>
                            <th className="px-5 py-3 font-semibold">Cấp kho</th>
                            <th className="px-5 py-3 font-semibold">Trạng thái</th>
                            <th className="px-5 py-3 font-semibold text-right">Thao tác</th>
                          </tr>
                        </thead>
                        <tbody>
                          {inventories.map((inv) => {
                            const isUpdating = updateInventoryStatus === 'pending';
                            const levelLabel = getInventoryLevelLabel(inv.level);
                            const levelIcon = getInventoryLevelIcon(inv.level);
                            const levelClass = getInventoryLevelClass(inv.level);
                            const statusLabel = getEntityStatusLabel(inv.status);
                            const statusIcon = getEntityStatusIcon(inv.status);
                            const statusClass = getEntityStatusClass(inv.status);

                            return (
                              <tr
                                key={inv.inventoryId}
                                className="border-b border-border/70 hover:bg-muted/30"
                              >
                                <td className="px-5 py-4">
                                  <div>
                                    <p className="font-bold uppercase text-foreground">
                                      {inv.inventoryId.slice(0, 6)}...
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                      {inv.totalStockSlots} ô lưu trữ
                                    </p>
                                  </div>
                                </td>
                                <td className="px-5 py-4 text-muted-foreground">
                                  {inv.reliefStationName}
                                </td>
                                <td className="px-5 py-4">
                                  <Badge
                                    variant="outline"
                                    appearance="outline"
                                    size="xs"
                                    className={`gap-1 rounded-full py-1 sm:size-auto sm:gap-1.5 border ${responsiveBadgeClass} ${levelClass}`}
                                  >
                                    <span className="material-symbols-outlined shrink-0 text-xs">
                                      {levelIcon}
                                    </span>
                                    <span
                                      className={`hidden sm:inline ${responsiveBadgeTextClass}`}
                                    >
                                      {levelLabel}
                                    </span>
                                    <span className={`sm:hidden ${responsiveBadgeTextClass}`}>
                                      ...
                                    </span>
                                  </Badge>
                                </td>
                                <td className="px-5 py-4">
                                  <Badge
                                    variant={
                                      inv.status === EntityStatus.Active
                                        ? 'success'
                                        : inv.status === EntityStatus.Inactive
                                          ? 'warning'
                                          : 'outline'
                                    }
                                    appearance="outline"
                                    size="xs"
                                    className={`gap-1 rounded-full py-1 sm:size-auto sm:gap-1.5 border ${responsiveBadgeClass} ${statusClass}`}
                                  >
                                    <span className="material-symbols-outlined shrink-0 text-xs">
                                      {statusIcon}
                                    </span>
                                    <span
                                      className={`hidden sm:inline ${responsiveBadgeTextClass}`}
                                    >
                                      {statusLabel}
                                    </span>
                                    <span className={`sm:hidden ${responsiveBadgeTextClass}`}>
                                      ...
                                    </span>
                                  </Badge>
                                </td>
                                <td className="px-5 py-4 text-right">
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" size="sm">
                                        <span className="material-symbols-outlined">more_vert</span>
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      <DropdownMenuItem
                                        className="gap-2 text-primary"
                                        onClick={() =>
                                          openStockManagement(
                                            inv.inventoryId,
                                            inv.reliefStationName,
                                          )
                                        }
                                      >
                                        <span className="material-symbols-outlined text-lg">
                                          inventory
                                        </span>
                                        Nhập hoặc cập nhật tồn kho
                                      </DropdownMenuItem>
                                      {inv.status === EntityStatus.Active ? (
                                        <DropdownMenuItem
                                          className="gap-2 text-amber-600 dark:text-amber-300"
                                          disabled={isUpdating}
                                          onClick={() =>
                                            handleInventoryStatusChange(
                                              inv.inventoryId,
                                              inv.level,
                                              EntityStatus.Inactive,
                                            )
                                          }
                                        >
                                          <span className="material-symbols-outlined text-lg">
                                            block
                                          </span>
                                          Ngừng hoạt động
                                        </DropdownMenuItem>
                                      ) : (
                                        <DropdownMenuItem
                                          className="gap-2 text-emerald-600 dark:text-emerald-300"
                                          disabled={isUpdating}
                                          onClick={() =>
                                            handleInventoryStatusChange(
                                              inv.inventoryId,
                                              inv.level,
                                              EntityStatus.Active,
                                            )
                                          }
                                        >
                                          <span className="material-symbols-outlined text-lg">
                                            check_circle
                                          </span>
                                          Kích hoạt kho
                                        </DropdownMenuItem>
                                      )}
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    )}
                  </div>

                  {inventoryPagination && inventoryPagination.totalCount > 10 && (
                    <div className="flex items-center justify-between px-5 py-4 border-t border-border">
                      <p className="text-sm text-muted-foreground">
                        Trang {inventoryPagination.currentPage} — Tổng{' '}
                        {inventoryPagination.totalCount} kho
                      </p>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={!inventoryPagination.hasPrevious}
                          onClick={() => setPageIndex((prev) => Math.max(1, prev - 1))}
                        >
                          Trước
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={!inventoryPagination.hasNext}
                          onClick={() => setPageIndex((prev) => prev + 1)}
                        >
                          Sau
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="border-border bg-card">
                <CardContent className="p-0">
                  <div className="px-5 py-4 border-b border-border">
                    <h2 className="text-xl font-bold text-foreground">
                      Danh mục Vật phẩm/Hàng hóa
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      Tạo Vật phẩm/Hàng hóa trước, sau đó nhập hoặc cập nhật tồn kho theo Vật
                      phẩm/Hàng hóa đã có.
                    </p>
                  </div>

                  <div className="overflow-x-auto">
                    {isLoadingSupplies ? (
                      <div className="flex items-center justify-center py-16 text-muted-foreground">
                        <div className="flex flex-col items-center gap-3">
                          <span className="material-symbols-outlined text-4xl animate-spin text-primary">
                            progress_activity
                          </span>
                          <p>Đang tải danh mục Vật phẩm/Hàng hóa...</p>
                        </div>
                      </div>
                    ) : supplyItems.length === 0 ? (
                      <div className="flex items-center justify-center py-16 text-muted-foreground">
                        <div className="flex flex-col items-center gap-3">
                          <span className="material-symbols-outlined text-4xl">inventory_2</span>
                          <p>Chưa có Vật phẩm/Hàng hóa nào</p>
                        </div>
                      </div>
                    ) : (
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border text-left">
                            <th className="px-5 py-3 font-semibold">Vật phẩm</th>
                            <th className="px-5 py-3 font-semibold">Danh mục</th>
                            <th className="px-5 py-3 font-semibold">Đơn vị</th>
                          </tr>
                        </thead>
                        <tbody>
                          {supplyItems.map((item) => (
                            <tr
                              key={item.id}
                              className="border-b border-border/70 hover:bg-muted/30"
                            >
                              <td className="px-5 py-4">
                                <div>
                                  <p className="font-semibold text-foreground">{item.name}</p>
                                  <p className="text-xs text-muted-foreground line-clamp-1">
                                    {item.description || 'Chưa có mô tả'}
                                  </p>
                                </div>
                              </td>
                              <td className="px-5 py-4">
                                <SupplyCategoryBadge category={item.category} />
                              </td>
                              <td className="px-5 py-4 text-muted-foreground">{item.unit}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>

                  {supplyPagination && supplyPagination.totalCount > 10 && (
                    <div className="flex items-center justify-between px-5 py-4 border-t border-border">
                      <p className="text-sm text-muted-foreground">
                        Trang {supplyPagination.currentPage} — Tổng {supplyPagination.totalCount}{' '}
                        vật phẩm
                      </p>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={!supplyPagination.hasPrevious}
                          onClick={() => setSupplyPageIndex((prev) => Math.max(1, prev - 1))}
                        >
                          Trước
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={!supplyPagination.hasNext}
                          onClick={() => setSupplyPageIndex((prev) => prev + 1)}
                        >
                          Sau
                        </Button>
                      </div>
                    </div>
                  )}
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
                    {getInventoryLevelLabel(InventoryLevel.Regional)}
                  </SelectItem>
                  <SelectItem value={String(InventoryLevel.Provincial)}>
                    {getInventoryLevelLabel(InventoryLevel.Provincial)}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenCreateInventory(false)}>
              Hủy
            </Button>
            <Button onClick={handleCreateInventory} disabled={createInventoryStatus === 'pending'}>
              {createInventoryStatus === 'pending' ? 'Đang tạo...' : 'Tạo kho'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={openCreateSupply} onOpenChange={setOpenCreateSupply}>
        <DialogContent className="!max-w-none w-[94vw] max-w-5xl h-[88vh] overflow-hidden p-0 flex flex-col">
          <DialogHeader className="px-6 py-4 border-b border-border">
            <DialogTitle>Tạo nhiều vật phẩm cứu trợ</DialogTitle>
            <DialogDescription>
              Có thể nhập nhiều vật phẩm trong một lần lưu. Hệ thống sẽ gửi nhiều yêu cầu tạo tương
              ứng.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 min-h-0 overflow-y-auto p-6 space-y-4">
            {supplyDrafts.map((item, index) => (
              <Card key={item.id} className="border-border bg-card">
                <CardContent className="p-5 space-y-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-foreground">Vật phẩm #{index + 1}</p>
                      <p className="text-xs text-muted-foreground">
                        Điền đủ thông tin để thêm vào danh mục Vật phẩm/Hàng hóa.
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive"
                      disabled={supplyDrafts.length === 1}
                      onClick={() => removeSupplyDraft(item.id)}
                    >
                      <span className="material-symbols-outlined text-lg">delete</span>
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label>
                        Tên vật phẩm <RequiredMark />
                      </Label>
                      <Input
                        value={item.name}
                        onChange={(e) => updateSupplyDraft(item.id, 'name', e.target.value)}
                        placeholder="Ví dụ: Gạo 10kg"
                      />
                    </div>

                    <div className="grid gap-2">
                      <Label>
                        Danh mục <RequiredMark />
                      </Label>
                      <Select
                        value={item.category}
                        onValueChange={(value) => updateSupplyDraft(item.id, 'category', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Chọn danh mục" />
                        </SelectTrigger>
                        <SelectContent>
                          {DANH_MUC_VAT_PHAM.map((category) => (
                            <SelectItem key={category} value={String(category)}>
                              <div className="flex items-center gap-2">
                                <span
                                  className={`material-symbols-outlined text-[18px] border rounded-full p-1 leading-none ${getSupplyCategoryClass(category)}`}
                                >
                                  {getSupplyCategoryIcon(category)}
                                </span>
                                <span className="font-medium">
                                  {getSupplyCategoryLabel(category)}
                                </span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid gap-2">
                      <Label>
                        Đơn vị tính <RequiredMark />
                      </Label>
                      <Input
                        value={item.unit}
                        onChange={(e) => updateSupplyDraft(item.id, 'unit', e.target.value)}
                        placeholder="Bao, thùng, chai..."
                      />
                    </div>

                    <div className="grid gap-2">
                      <Label className="flex items-center gap-2">
                        Đường dẫn biểu tượng
                        <IconGuide />
                      </Label>
                      <Input
                        value={item.iconUrl}
                        onChange={(e) => updateSupplyDraft(item.id, 'iconUrl', e.target.value)}
                        placeholder="https://..."
                      />
                    </div>
                  </div>

                  <div className="grid gap-2">
                    <Label>Mô tả</Label>
                    <Textarea
                      value={item.description}
                      onChange={(e) => updateSupplyDraft(item.id, 'description', e.target.value)}
                      placeholder="Mô tả ngắn về vật phẩm"
                    />
                  </div>
                </CardContent>
              </Card>
            ))}

            <Button variant="outline" className="gap-2" onClick={addSupplyDraft}>
              <span className="material-symbols-outlined text-lg">add</span>
              Thêm một vật phẩm nữa
            </Button>
          </div>

          <DialogFooter className="px-6 py-4 border-t border-border bg-background shrink-0">
            <Button variant="outline" onClick={() => setOpenCreateSupply(false)}>
              Hủy
            </Button>
            <Button
              onClick={handleCreateSupplyItems}
              disabled={createSupplyItemStatus === 'pending'}
            >
              {createSupplyItemStatus === 'pending' ? 'Đang tạo...' : 'Tạo danh mục vật phẩm'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={openCreateAllocation} onOpenChange={setOpenCreateAllocation}>
        <DialogContent className="!max-w-none w-[94vw] max-w-5xl max-h-[88vh] overflow-hidden p-0">
          <DialogHeader className="px-6 py-4 border-b border-border">
            <DialogTitle>Tạo phiếu điều phối hàng hóa</DialogTitle>
            <DialogDescription>
              Chọn một chiến dịch, một kho nguồn và nhiều vật phẩm cần điều phối trong cùng một
              phiếu.
            </DialogDescription>
          </DialogHeader>

          <div className="p-6 space-y-5 overflow-y-auto max-h-[70vh]">
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
                              {supplyItem.name} - {getSupplyCategoryLabel(supplyItem.category)}
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
                        type="number"
                        min={1}
                        value={item.quantity}
                        onChange={(e) => updateAllocationItem(item.id, 'quantity', e.target.value)}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            <Button variant="outline" className="gap-2" onClick={addAllocationItem}>
              <span className="material-symbols-outlined text-lg">add</span>
              Thêm dòng vật phẩm
            </Button>
          </div>

          <DialogFooter className="px-6 py-4 border-t border-border">
            <Button variant="outline" onClick={() => setOpenCreateAllocation(false)}>
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
                                {supplyItem.name} - {getSupplyCategoryLabel(supplyItem.category)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="grid gap-2">
                        <Label>Số lượng nhập thêm</Label>
                        <Input
                          type="number"
                          min={0}
                          value={item.importQuantity}
                          onChange={(e) =>
                            updateStockDraft(item.id, 'importQuantity', e.target.value)
                          }
                          placeholder="0"
                        />
                      </div>

                      <div className="grid gap-2">
                        <Label>Mức tồn tối thiểu</Label>
                        <Input
                          type="number"
                          min={0}
                          value={item.minimumStockLevel}
                          onChange={(e) =>
                            updateStockDraft(item.id, 'minimumStockLevel', e.target.value)
                          }
                          placeholder="0"
                        />
                      </div>

                      <div className="grid gap-2">
                        <Label>Mức tồn tối đa</Label>
                        <Input
                          type="number"
                          min={0}
                          value={item.maximumStockLevel}
                          onChange={(e) =>
                            updateStockDraft(item.id, 'maximumStockLevel', e.target.value)
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
                            Hiện có trong kho: {existingStock.currentQuantity} • Ngưỡng hiện tại:{' '}
                            {existingStock.minimumStockLevel} - {existingStock.maximumStockLevel}
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
            <Button variant="outline" onClick={() => setOpenStockDialog(false)}>
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
    </DashboardLayout>
  );
}
