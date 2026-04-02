import { useMemo, useState } from 'react';
import goongjs from '@goongmaps/goong-js';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useFundContributions, useFundSummary, useFundTransactions } from '@/hooks/useFunds';
import { useGoongMap } from '@/hooks/useGoongMap';
import { useInventories, useInventoryStocks } from '@/hooks/useInventory';
import { useProvincialStations } from '@/hooks/useReliefStations';
import { useVehicles } from '@/hooks/useVehicles';
import { managerNavItems, managerProjects } from './components/sidebarConfig';
import {
  EntityStatus,
  ReliefStationLevel,
  getEntityStatusClass,
  getEntityStatusLabel,
} from '@/enums/beEnums';
import { formatNumberVN } from '@/lib/utils';
import { StatCard } from './components/ManagerInventoryShared';

export default function ManagerDashboardPage() {
  const [vehicleSearch, setVehicleSearch] = useState('');
  const [selectedInventoryId, setSelectedInventoryId] = useState('ALL_INVENTORIES');
  const [selectedStationId, setSelectedStationId] = useState<string | null>(null);

  const { data: fundSummary, isLoading: isLoadingFundSummary } = useFundSummary();
  const { data: fundContributions = [] } = useFundContributions();
  const { data: fundTransactions = [] } = useFundTransactions();
  const { data: stationsData, isLoading: isLoadingStations } = useProvincialStations({
    pageIndex: 1,
    pageSize: 200,
  });
  const { data: inventoriesData, isLoading: isLoadingInventories } = useInventories({
    pageIndex: 1,
    pageSize: 200,
  });
  const { data: inventoryStocksData } = useInventoryStocks(
    selectedInventoryId === 'ALL_INVENTORIES' ? '' : selectedInventoryId,
    {
      pageIndex: 1,
      pageSize: 200,
    },
  );
  const { vehicles, vehiclesPagination, isLoadingVehicles } = useVehicles(undefined, undefined, {
    pageIndex: 1,
    pageSize: 10,
    search: vehicleSearch || undefined,
  });

  const stations = stationsData?.items || [];
  const inventories = inventoriesData?.items || [];
  const inventoryStocks = inventoryStocksData?.items || [];
  const selectedInventory = inventories.find(
    (inventory) => inventory.inventoryId === selectedInventoryId,
  );

  const allVisibleStocks = useMemo(() => {
    if (selectedInventoryId === 'ALL_INVENTORIES') {
      return inventories.map((inventory) => ({
        inventoryId: inventory.inventoryId,
        inventoryName: inventory.reliefStationName,
        totalStockSlots: inventory.totalStockSlots,
        status: inventory.status,
      }));
    }

    return inventoryStocks.map((stock) => ({
      kind: 'stock' as const,
      ...stock,
      inventoryId: selectedInventoryId,
      inventoryName: selectedInventory?.reliefStationName || 'Kho đã chọn',
      status: selectedInventory?.status,
    }));
  }, [selectedInventoryId, inventories, inventoryStocks, selectedInventory]);

  const mapStations = useMemo(
    () =>
      stations
        .filter(
          (station) =>
            typeof station.latitude === 'number' && typeof station.longitude === 'number',
        )
        .map((station) => ({
          id: station.reliefStationId ?? station.stationId ?? station.id,
          name: station.name,
          latitude: Number(station.latitude || 0),
          longitude: Number(station.longitude || 0),
          address: station.address,
          contactNumber: station.contactNumber,
          level: station.level,
          status: station.status,
        })),
    [stations],
  );

  const {
    mapRef,
    isLoading: isLoadingMap,
    error: mapError,
  } = useGoongMap({
    center: mapStations[0]
      ? { lat: mapStations[0].latitude, lng: mapStations[0].longitude }
      : { lat: 10.7769, lng: 106.7009 },
    zoom: mapStations[0] ? 11 : 6,
    apiKey: import.meta.env.VITE_GOONG_MAP_KEY || '',
    enabled: true,
    onMapLoad: (map) => {
      mapStations.forEach((station) => {
        const markerColor =
          station.level === ReliefStationLevel.Regional
            ? '#7c3aed'
            : station.level === ReliefStationLevel.Provincial
              ? '#2563eb'
              : '#16a34a';
        const marker = new goongjs.Marker({ color: markerColor })
          .setLngLat([station.longitude, station.latitude])
          .addTo(map);

        marker.getElement().style.cursor = 'pointer';
        marker.getElement().addEventListener('click', () => {
          setSelectedStationId(station.id);
          (map as any).flyTo({
            center: [station.longitude, station.latitude],
            zoom: 13,
            speed: 1.1,
          });
        });
      });
    },
  });

  const selectedStation = mapStations.find((station) => station.id === selectedStationId) || null;

  const inventoryOverview = useMemo(() => {
    const totalStockSlots = inventories.reduce(
      (sum, inventory) => sum + (inventory.totalStockSlots || 0),
      0,
    );
    const activeInventories = inventories.filter(
      (inventory) => inventory.status === EntityStatus.Active,
    ).length;
    return {
      totalInventories: inventories.length,
      totalStockSlots,
      activeInventories,
    };
  }, [inventories]);

  return (
    <DashboardLayout projects={managerProjects} navItems={managerNavItems}>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-primary">Báo cáo & Thống kê</h1>
            <p className="text-muted-foreground">
              Theo dõi tổng quan quỹ trung tâm, trạm cứu trợ, kho hàng và phương tiện điều phối.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          <StatCard
            label="Quỹ trung tâm"
            value={isLoadingFundSummary ? '...' : formatNumberVN(fundSummary?.totalBalance || 0)}
            icon="savings"
            iconClass="bg-primary/10 text-primary"
            note="Tổng số dư quỹ cứu trợ"
          />
          <StatCard
            label="Số trạm cứu trợ"
            value={isLoadingStations ? '...' : formatNumberVN(stations.length)}
            icon="home_work"
            iconClass="bg-emerald-500/10 text-emerald-600 dark:text-emerald-300"
            note="Tổng số trạm đang quản lý"
          />
          <StatCard
            label="Kho đang hoạt động"
            value={
              isLoadingInventories ? '...' : formatNumberVN(inventoryOverview.activeInventories)
            }
            icon="inventory_2"
            iconClass="bg-sky-500/10 text-sky-600 dark:text-sky-300"
            note="Số kho có thể nhập/xuất hàng"
          />
          <StatCard
            label="Phương tiện điều phối"
            value={
              isLoadingVehicles
                ? '...'
                : formatNumberVN(vehiclesPagination?.totalCount || vehicles.length)
            }
            icon="local_shipping"
            iconClass="bg-amber-500/10 text-amber-600 dark:text-amber-300"
            note="Tổng xe đang quản lý"
          />
        </div>

        <Card className="border-border bg-card overflow-hidden">
          <CardHeader>
            <CardTitle>Bản đồ các trạm cứu trợ</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
              <div className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-1.5 bg-muted/20">
                <span className="size-3 rounded-full bg-violet-600" /> Trụ sở khu vực
              </div>
              <div className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-1.5 bg-muted/20">
                <span className="size-3 rounded-full bg-blue-600" /> Trạm tỉnh / thành
              </div>
              <div className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-1.5 bg-muted/20">
                <span className="size-3 rounded-full bg-green-600" /> Trạm địa phương / xã
              </div>
            </div>

            <div className="h-[560px] rounded-2xl border border-border overflow-hidden bg-muted/20 relative">
              <div ref={mapRef} className="h-full w-full" />
              {isLoadingMap && (
                <div className="absolute inset-0 flex items-center justify-center bg-background/70 text-sm text-muted-foreground">
                  Đang tải bản đồ trạm cứu trợ...
                </div>
              )}
              {mapError && (
                <div className="absolute inset-0 flex items-center justify-center bg-background/85 text-sm text-destructive px-6 text-center">
                  {mapError}
                </div>
              )}

              {selectedStation && !mapError && (
                <div className="absolute top-4 right-4 z-10 w-[320px] max-w-[calc(100%-2rem)] rounded-2xl border border-border bg-background/95 backdrop-blur shadow-xl p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-foreground">{selectedStation.name}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {selectedStation.level === ReliefStationLevel.Regional
                          ? 'Trụ sở khu vực'
                          : selectedStation.level === ReliefStationLevel.Provincial
                            ? 'Trạm tỉnh / thành'
                            : 'Trạm địa phương'}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedStationId(null)}
                      className="rounded-lg p-1.5 hover:bg-muted text-muted-foreground hover:text-foreground transition"
                    >
                      <span className="material-symbols-outlined text-[18px]">close</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-2 text-xs">
                    <span
                      className={`inline-flex size-3 rounded-full ${
                        selectedStation.level === ReliefStationLevel.Regional
                          ? 'bg-violet-600'
                          : selectedStation.level === ReliefStationLevel.Provincial
                            ? 'bg-blue-600'
                            : 'bg-green-600'
                      }`}
                    />
                    <Badge
                      variant="outline"
                      appearance="outline"
                      size="sm"
                      className={`border ${getEntityStatusClass(selectedStation.status || EntityStatus.Active)}`}
                    >
                      {getEntityStatusLabel(selectedStation.status || EntityStatus.Active)}
                    </Badge>
                  </div>

                  <div className="space-y-2 text-sm text-muted-foreground">
                    <p>{selectedStation.address || 'Chưa có địa chỉ'}</p>
                    <p>Liên hệ: {selectedStation.contactNumber || 'Chưa có'}</p>
                    <p>
                      Tọa độ: {selectedStation.latitude.toFixed(6)},{' '}
                      {selectedStation.longitude.toFixed(6)}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 xl:grid-cols-[1.2fr_1fr] gap-6">
          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle>Tổng quan tài chính trung tâm</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="rounded-xl border border-border bg-muted/20 p-4">
                  <p className="text-sm text-muted-foreground">Số lượt đóng góp</p>
                  <p className="mt-2 text-2xl font-bold text-foreground">
                    {formatNumberVN(fundSummary?.totalContributionCount || 0)}
                  </p>
                </div>
                <div className="rounded-xl border border-border bg-muted/20 p-4">
                  <p className="text-sm text-muted-foreground">Số chiến dịch nguồn</p>
                  <p className="mt-2 text-2xl font-bold text-foreground">
                    {formatNumberVN(fundSummary?.totalSourceCampaigns || 0)}
                  </p>
                </div>
                <div className="rounded-xl border border-border bg-muted/20 p-4">
                  <p className="text-sm text-muted-foreground">Giao dịch quỹ</p>
                  <p className="mt-2 text-2xl font-bold text-foreground">
                    {formatNumberVN(fundTransactions.length)}
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <p className="font-semibold text-foreground">Nguồn quỹ theo chiến dịch</p>
                {fundSummary?.sources?.length ? (
                  fundSummary.sources.map((source, index) => (
                    <div
                      key={`${source.campaignId || index}`}
                      className="flex items-center justify-between rounded-xl border border-border bg-muted/10 px-4 py-3"
                    >
                      <div>
                        <p className="font-medium text-foreground">
                          {source.campaignName || source.campaignId || 'Chiến dịch nguồn'}
                        </p>
                      </div>
                      <p className="font-semibold text-foreground">
                        {formatNumberVN(source.amount || 0)}
                      </p>
                    </div>
                  ))
                ) : (
                  <div className="rounded-xl border border-dashed border-border bg-muted/10 p-4 text-sm text-muted-foreground">
                    Chưa có nguồn quỹ nào được ghi nhận.
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  <div className="rounded-xl border border-border bg-muted/10 p-4">
                    <p className="font-semibold text-foreground mb-2">Đóng góp gần đây</p>
                    {fundContributions.length ? (
                      fundContributions.slice(0, 4).map((item, index) => (
                        <div
                          key={`${item.contributionId || index}`}
                          className="py-2 text-sm border-b border-border/50 last:border-b-0"
                        >
                          <p className="font-medium text-foreground">
                            {item.donorName || 'Nhà tài trợ ẩn danh'}
                          </p>
                          <p className="text-muted-foreground">
                            {formatNumberVN(item.amount || 0)} •{' '}
                            {item.campaignName || 'Không có chiến dịch'}
                          </p>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">Chưa có đóng góp nào.</p>
                    )}
                  </div>

                  <div className="rounded-xl border border-border bg-muted/10 p-4">
                    <p className="font-semibold text-foreground mb-2">Giao dịch quỹ gần đây</p>
                    {fundTransactions.length ? (
                      fundTransactions.slice(0, 4).map((item, index) => (
                        <div
                          key={`${item.transactionId || index}`}
                          className="py-2 text-sm border-b border-border/50 last:border-b-0"
                        >
                          <p className="font-medium text-foreground">
                            {item.type || 'Giao dịch quỹ'}
                          </p>
                          <p className="text-muted-foreground">
                            {formatNumberVN(item.amount || 0)} • {item.note || 'Không có ghi chú'}
                          </p>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">Chưa có giao dịch quỹ nào.</p>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle>Thông số hàng hóa từng kho</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Select value={selectedInventoryId} onValueChange={setSelectedInventoryId}>
                <SelectTrigger>
                  <SelectValue placeholder="Tất cả kho hoặc chọn 1 kho cụ thể" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL_INVENTORIES">Tất cả kho</SelectItem>
                  {inventories.map((inventory) => (
                    <SelectItem key={inventory.inventoryId} value={inventory.inventoryId}>
                      {inventory.reliefStationName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="rounded-xl border border-border bg-muted/10 p-4">
                  <p className="text-sm text-muted-foreground">Tổng số kho</p>
                  <p className="mt-2 text-2xl font-bold text-foreground">
                    {formatNumberVN(inventoryOverview.totalInventories)}
                  </p>
                </div>
                <div className="rounded-xl border border-border bg-muted/10 p-4">
                  <p className="text-sm text-muted-foreground">Tổng ô lưu trữ</p>
                  <p className="mt-2 text-2xl font-bold text-foreground">
                    {formatNumberVN(inventoryOverview.totalStockSlots)}
                  </p>
                </div>
                <div className="rounded-xl border border-border bg-muted/10 p-4">
                  <p className="text-sm text-muted-foreground">Trạng thái kho</p>
                  <Badge
                    variant="outline"
                    appearance="outline"
                    size="sm"
                    className={`mt-3 border ${getEntityStatusClass(selectedInventory?.status || EntityStatus.Active)}`}
                  >
                    {getEntityStatusLabel(selectedInventory?.status || EntityStatus.Active)}
                  </Badge>
                </div>
              </div>

              {selectedInventoryId !== 'ALL_INVENTORIES' ? (
                inventoryStocks.length ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Vật phẩm</TableHead>
                        <TableHead>Số lượng</TableHead>
                        <TableHead>Tồn tối thiểu</TableHead>
                        <TableHead>Tồn tối đa</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {inventoryStocks.map((stock) => (
                        <TableRow key={stock.stockId}>
                          <TableCell className="font-mono text-xs text-muted-foreground">
                            {stock.supplyItemId}
                          </TableCell>
                          <TableCell>{formatNumberVN(stock.currentQuantity)}</TableCell>
                          <TableCell>{formatNumberVN(stock.minimumStockLevel)}</TableCell>
                          <TableCell>{formatNumberVN(stock.maximumStockLevel)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="rounded-xl border border-dashed border-border bg-muted/10 p-4 text-sm text-muted-foreground">
                    Kho này chưa có dữ liệu tồn kho chi tiết.
                  </div>
                )
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tên kho</TableHead>
                      <TableHead>Trạng thái</TableHead>
                      <TableHead>Tổng ô lưu trữ</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allVisibleStocks.map((inventory) => (
                      <TableRow key={`${inventory.inventoryId}-${inventory.inventoryName}`}>
                        <TableCell className="font-medium text-foreground">
                          {inventory.inventoryName}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            appearance="outline"
                            size="sm"
                            className={`border ${getEntityStatusClass(inventory.status || EntityStatus.Active)}`}
                          >
                            {getEntityStatusLabel(inventory.status || EntityStatus.Active)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {formatNumberVN(
                            'totalStockSlots' in inventory ? inventory.totalStockSlots || 0 : 0,
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle>Quản lý phương tiện điều phối</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div className="relative w-full lg:max-w-md">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-muted-foreground">
                  search
                </span>
                <Input
                  className="pl-10"
                  placeholder="Tìm kiếm biển số xe..."
                  value={vehicleSearch}
                  onChange={(e) => setVehicleSearch(e.target.value)}
                />
              </div>
              <div className="rounded-xl border border-border bg-muted/10 px-4 py-2 text-sm text-muted-foreground">
                Thêm / sửa / xóa phương tiện thực hiện tại trang{' '}
                <span className="font-semibold text-foreground">Quản lý phương tiện</span>.
              </div>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Biển số xe</TableHead>
                  <TableHead>Loại xe</TableHead>
                  <TableHead>Đội sử dụng</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead className="text-right">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoadingVehicles ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                      Đang tải phương tiện...
                    </TableCell>
                  </TableRow>
                ) : vehicles.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                      Chưa có phương tiện nào.
                    </TableCell>
                  </TableRow>
                ) : (
                  vehicles.map((vehicle) => (
                    <TableRow key={vehicle.vehicleId}>
                      <TableCell>
                        <div>
                          <p className="font-semibold text-foreground">{vehicle.licensePlate}</p>
                          <p className="text-xs text-muted-foreground uppercase">
                            ID: {vehicle.vehicleId.slice(0, 8)}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>{vehicle.vehicleTypeName || '—'}</TableCell>
                      <TableCell>{vehicle.teamUsed || '—'}</TableCell>
                      <TableCell>
                        {vehicle.status === 0 ? (
                          <Badge variant="success" size="xs">
                            Sẵn sàng
                          </Badge>
                        ) : vehicle.status === 1 ? (
                          <Badge variant="warning" size="xs">
                            Đang sử dụng
                          </Badge>
                        ) : (
                          <Badge variant="destructive" size="xs">
                            Bảo trì
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant="outline" appearance="outline" size="sm">
                          Quản lý tại trang riêng
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
