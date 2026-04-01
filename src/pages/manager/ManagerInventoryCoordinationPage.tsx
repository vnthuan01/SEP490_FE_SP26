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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useCreateInventory, useInventories, useUpdateInventory } from '@/hooks/useInventory';
import { useCampaigns } from '@/hooks/useCampaigns';
import {
  useCreateSupplyAllocation,
  useCreateSupplyItem,
  useSupplyItems,
} from '@/hooks/useSupplies';
import { useProvincialStations } from '@/hooks/useReliefStations';
import { managerNavItems, managerProjects } from './components/sidebarConfig';
import {
  EntityStatus,
  InventoryLevel,
  SupplyCategory,
  getCampaignStatusClass,
  getCampaignStatusLabel,
  getEntityStatusClass,
  getEntityStatusLabel,
  getInventoryLevelLabel,
  getSupplyCategoryLabel,
} from '@/enums/beEnums';
import { toast } from 'sonner';

const RequiredMark = () => <span className="text-red-500">*</span>;

const IconGuide = () => (
  <TooltipProvider>
    <Tooltip delayDuration={200}>
      <TooltipTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center text-muted-foreground hover:text-foreground transition-colors"
        >
          <span className="material-symbols-outlined text-[18px]">help</span>
        </button>
      </TooltipTrigger>
      <TooltipContent
        side="top"
        align="start"
        variant="light"
        className="max-w-[280px] rounded-lg border border-border bg-background text-foreground p-3 leading-relaxed"
      >
        <p className="font-semibold mb-1">Cách lấy icon từ Google Material</p>
        <p className="text-muted-foreground">
          Truy cập{' '}
          <a
            href="https://fonts.google.com/icons"
            target="_blank"
            rel="noreferrer"
            className="underline text-primary"
          >
            Google Material Symbols
          </a>{' '}
          rồi sao chép tên icon.
        </p>
        <p className="mt-2 text-muted-foreground">Ví dụ: inventory_2, water_drop, medication</p>
      </TooltipContent>
    </Tooltip>
  </TooltipProvider>
);

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

const DANH_MUC_VAT_PHAM = [
  {
    value: SupplyCategory.LuongThuc,
    icon: 'restaurant',
    color: 'text-orange-600 bg-orange-500/10 border-orange-500/20 dark:text-orange-300',
  },
  {
    value: SupplyCategory.YTeVaThuoc,
    icon: 'medication',
    color: 'text-red-600 bg-red-500/10 border-red-500/20 dark:text-red-300',
  },
  {
    value: SupplyCategory.NuocUong,
    icon: 'water_drop',
    color: 'text-blue-600 bg-blue-500/10 border-blue-500/20 dark:text-blue-300',
  },
  {
    value: SupplyCategory.DungCuVaLeuTrai,
    icon: 'camping',
    color: 'text-green-600 bg-green-500/10 border-green-500/20 dark:text-green-300',
  },
  {
    value: SupplyCategory.Khac,
    icon: 'category',
    color: 'text-muted-foreground bg-muted border-border',
  },
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

const getInventoryLevelBadge = (level: number) => {
  switch (level) {
    case InventoryLevel.Regional:
      return {
        icon: 'warehouse',
        className: 'border-violet-500/20 bg-violet-500/10 text-violet-700 dark:text-violet-300',
      };
    case InventoryLevel.Provincial:
      return {
        icon: 'inventory_2',
        className: 'border-sky-500/20 bg-sky-500/10 text-sky-700 dark:text-sky-300',
      };
    default:
      return {
        icon: 'layers',
        className: 'border-border bg-muted/50 text-muted-foreground',
      };
  }
};

const getInventoryStatusBadge = (status: number) => {
  const className = getEntityStatusClass(status);

  switch (status) {
    case EntityStatus.Active:
      return { icon: 'verified', variant: 'success' as const, className };
    case EntityStatus.Inactive:
      return { icon: 'pause_circle', variant: 'warning' as const, className };
    default:
      return {
        icon: 'help',
        variant: 'outline' as const,
        className: 'border border-border bg-muted/50 text-muted-foreground',
      };
  }
};

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
  const [inventoryForm, setInventoryForm] = useState({
    reliefStationId: '',
    level: String(InventoryLevel.Provincial),
  });
  const [supplyDrafts, setSupplyDrafts] = useState<DongVatPham[]>([taoDongVatPham()]);
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

  const { mutateAsync: createInventory, status: createInventoryStatus } = useCreateInventory();
  const { mutateAsync: updateInventory, status: updateInventoryStatus } = useUpdateInventory();
  const { mutateAsync: createSupplyItem, status: createSupplyItemStatus } = useCreateSupplyItem();
  const { mutateAsync: createSupplyAllocation, status: createSupplyAllocationStatus } =
    useCreateSupplyAllocation();

  const inventories = inventoriesResponse?.items || [];
  const inventoryPagination = inventoriesResponse;
  const supplyItems = supplyItemsResponse?.items || [];
  const supplyPagination = supplyItemsResponse;
  const stations = stationsResponse?.items || [];

  const activeInventories = useMemo(
    () => inventories.filter((inv) => inv.status === EntityStatus.Active),
    [inventories],
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
        note: 'Danh mục vật phẩm hiện có',
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
            <Card key={item.id} className="border-border bg-card">
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">{item.label}</p>
                    <p className="mt-2 text-3xl font-black text-foreground">{item.value}</p>
                    <p className="mt-2 text-xs text-muted-foreground">{item.note}</p>
                  </div>
                  <div
                    className={`size-11 rounded-2xl border border-border flex items-center justify-center ${item.iconClass}`}
                  >
                    <span className="material-symbols-outlined text-[22px]">{item.icon}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
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
                            const levelBadge = getInventoryLevelBadge(inv.level);
                            const levelLabel = getInventoryLevelLabel(inv.level);
                            const statusBadge = getInventoryStatusBadge(inv.status);
                            const statusLabel = getEntityStatusLabel(inv.status);

                            return (
                              <tr
                                key={inv.inventoryId}
                                className="border-b border-border/70 hover:bg-muted/30"
                              >
                                <td className="px-5 py-4">
                                  <div>
                                    <p className="font-bold uppercase text-foreground">
                                      {inv.inventoryId}
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
                                    className={`gap-1 rounded-full py-1 sm:size-auto sm:gap-1.5 border ${responsiveBadgeClass} ${levelBadge.className}`}
                                  >
                                    <span className="material-symbols-outlined shrink-0 text-xs">
                                      {levelBadge.icon}
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
                                    variant={statusBadge.variant}
                                    appearance="outline"
                                    size="xs"
                                    className={`gap-1 rounded-full py-1 sm:size-auto sm:gap-1.5 border ${responsiveBadgeClass} ${statusBadge.className}`}
                                  >
                                    <span className="material-symbols-outlined shrink-0 text-xs">
                                      {statusBadge.icon}
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
                                      <DropdownMenuItem className="gap-2 text-primary">
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
                    <h2 className="text-xl font-bold text-foreground">Danh mục vật phẩm</h2>
                    <p className="text-sm text-muted-foreground">
                      Tạo vật phẩm trước, sau đó nhập hoặc cập nhật tồn kho theo vật phẩm đã có.
                    </p>
                  </div>

                  <div className="overflow-x-auto">
                    {isLoadingSupplies ? (
                      <div className="flex items-center justify-center py-16 text-muted-foreground">
                        <div className="flex flex-col items-center gap-3">
                          <span className="material-symbols-outlined text-4xl animate-spin text-primary">
                            progress_activity
                          </span>
                          <p>Đang tải danh mục vật phẩm...</p>
                        </div>
                      </div>
                    ) : supplyItems.length === 0 ? (
                      <div className="flex items-center justify-center py-16 text-muted-foreground">
                        <div className="flex flex-col items-center gap-3">
                          <span className="material-symbols-outlined text-4xl">inventory_2</span>
                          <p>Chưa có vật phẩm nào</p>
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
                                <Badge variant="outline" appearance="outline" size="sm">
                                  {getSupplyCategoryLabel(item.category)}
                                </Badge>
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
                                  {campaign.campaignId}
                                </p>
                              </div>
                            </td>
                            <td className="px-5 py-4 text-muted-foreground">
                              {new Date(campaign.startDate).toLocaleDateString('vi-VN')} -{' '}
                              {new Date(campaign.endDate).toLocaleDateString('vi-VN')}
                            </td>
                            <td className="px-5 py-4">
                              <Badge
                                variant="outline"
                                appearance="outline"
                                size="sm"
                                className={`border ${getCampaignStatusClass(campaign.status)}`}
                              >
                                {getCampaignStatusLabel(campaign.status)}
                              </Badge>
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
                        Điền đủ thông tin để thêm vào danh mục vật phẩm.
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
                            <SelectItem key={category.value} value={String(category.value)}>
                              <div className="flex items-center gap-2">
                                <span
                                  className={`material-symbols-outlined text-[18px] border rounded-full p-1 leading-none ${category.color}`}
                                >
                                  {category.icon}
                                </span>
                                <span className="font-medium">
                                  {getSupplyCategoryLabel(category.value)}
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
                        {inventory.inventoryId} - {inventory.reliefStationName}
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
    </DashboardLayout>
  );
}
