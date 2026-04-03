import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge, BadgeDot } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { ReliefMap } from './components/ReliefMap';
import { HEADQUARTERS, reliefLocationsData, teamsData } from './components/mockData';
import { coordinatorNavItems, coordinatorProjects } from './components/sidebarConfig';

const GOONG_MAP_KEY = import.meta.env.VITE_GOONG_MAP_KEY || 'YOUR_GOONG_MAP_KEY';
const GOONG_API_KEY = import.meta.env.VITE_GOONG_API_KEY || '';

interface GoodsItem {
  id: string;
  name: string;
  code: string;
  category: string;
  unit: string;
  priority: 'high' | 'medium' | 'low';
  status: 'available' | 'low-stock' | 'out-of-stock';
  image?: string;
}

const mockGoods: GoodsItem[] = [
  {
    id: '1',
    name: 'Gạo tẻ (Bao 10kg)',
    code: 'LT-001',
    category: 'Lương thực',
    unit: 'Bao',
    priority: 'high',
    status: 'available',
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuBURiKPe6RWHf7u4jEv1e019kIzOz6g7APQTZkHpyhcsVcuxhdQowOmtg_CZzxr7TFxCtD1hZ6zTwRG1xp_toCIkyPFaEmUNl4amywkmtt6VDmCvyNlxcKXfjQS-g3jrddgUGwxubaF0NcOUvSU-NdLtcxV-snkxazW6YXl2Glyj5ZJW2j38WJfNZ-zfiaIHdsIgf0T6e1fmzggraNU8-SdgTs6O6jvKB62AM9qDghNbP75oi0Qh75ykDdqBq-g2HCSpG2lSzSJHPA',
  },
  {
    id: '2',
    name: 'Mì tôm (Thùng 30 gói)',
    code: 'LT-002',
    category: 'Lương thực',
    unit: 'Thùng',
    priority: 'medium',
    status: 'low-stock',
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuCZPkDogEGndjTyrZMYrWroLvvG6YF4tugdQfh0SoyPluHbigKX-YYCQbzPtD9plVHHFuoduAkAgp7r8gHEgqjy7zTrAEB-7jcsl8Y20oo-c3SOfCf0YdWcMm5zjhgaeuXGZT4xb7IepqBsgIpRXEmDEpdX6wGyLfV0eoSWy-e-u0TyOIqBrwTdnIzLqTG5CYz92V9YlxHqm04UeqcymJG_3UVXeyDGh52JAskG0hxx_vb2fDZx3FbzI6X74FnODxdJti5HUPQ0xnc',
  },
  {
    id: '3',
    name: 'Áo phao cứu sinh (Người lớn)',
    code: 'VT-005',
    category: 'Vật tư',
    unit: 'Cái',
    priority: 'high',
    status: 'available',
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuDrHsd6hESDdwhyBSwpNdkgfVLUGGWRV26e_xk6IBrE0qLLVvnYLgTQnHvXQIrX1oHBiu7cfNygNFx6wtI18cDw1qvQPWz79hZ7jvpwwEQp_wIMsPnvNpaRG1qDPAddOGY5OWIXDRNLN_AGB-hWz6r06ZBioXuJFGISxgCLaM9XGfUOyJPRw3gWOTAHZhcHi6kHiBZx0Lf8jNkTrJvWXHupW23U8QKtmc180JiBGeWHUdK9AogAWwf2zYXL64iwlfu9aGUimOiP4zM',
  },
  {
    id: '4',
    name: 'Thuốc hạ sốt Panadol (Hộp)',
    code: 'YT-012',
    category: 'Y tế',
    unit: 'Hộp',
    priority: 'high',
    status: 'out-of-stock',
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuD6SvjDWfMrX4dScAHQ_lGR_NE-uWZi7YlLaza0_yHUTvX0lyQlQuMIvKoeDoGf1fEkzcLZut-UfVJKDbHd9_8tiBSCS1EeSSLEC10Jvfu_72XxbyXld1gXizwPbFrWspBVGf_qfWoKGlsXiTdSeaNJWC3dD7RaKYj_kHTIbPQT1aErK-JqqMpmluF1REs45BxRhQbh9DP_XYzjMog43Pr_T21niVPtPp34qpL8r15yI5nxZjLNiXIY-o3AdA1rmBCx2mdZBbn-Vjg',
  },
  {
    id: '5',
    name: 'Nước tinh khiết 500ml',
    code: 'LT-009',
    category: 'Lương thực',
    unit: 'Thùng 24',
    priority: 'high',
    status: 'available',
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuDL_MGKnhUKCkGeeBmqJVKhDAAYNOYEOKQ6LqztEtLHjAAn6y3ZLc7wWKh7m6mEw2vFDzSwiNNJSDjepcUzkK6BZK6DQeiqgu6JBVSzbz4icFj-At9PGjVICHJwcr-CmVPlhW8txgd9xyCWJJryyV1ntdIVtstdrwcMt3sNP20t8rFAp7jffieT42j-ukzxrGPzMT8JJf5oXgTooID2LPBivAFCZfK3Dnug4l8Nwqwv-mBP7C873wLoYZQ1c-Y_hYpoYsn0tekvcRk',
  },
];

const categoryBadgeConfig: Record<
  string,
  { variant: 'success' | 'info' | 'destructive'; appearance: 'light' }
> = {
  'Lương thực': { variant: 'success', appearance: 'light' },
  'Vật tư': { variant: 'info', appearance: 'light' },
  'Y tế': { variant: 'destructive', appearance: 'light' },
};

const statusBadgeConfig: Record<
  string,
  { label: string; variant: 'primary' | 'warning' | 'destructive'; appearance: 'outline' }
> = {
  available: { label: 'Sẵn sàng', variant: 'primary', appearance: 'outline' },
  'low-stock': { label: 'Sắp hết', variant: 'warning', appearance: 'outline' },
  'out-of-stock': { label: 'Hết hàng', variant: 'destructive', appearance: 'outline' },
};

const priorityConfig: Record<string, { label: string; color: string }> = {
  high: { label: 'Cao', color: 'bg-red-500' },
  medium: { label: 'Trung bình', color: 'bg-orange-500' },
  low: { label: 'Thấp', color: 'bg-green-500' },
};

export default function CoordinatorDataManagementPage() {
  const [selectedTab, setSelectedTab] = useState('goods');
  const [selectedItems, setSelectedItems] = useState<string[]>([]);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedItems(mockGoods.map((item) => item.id));
    } else {
      setSelectedItems([]);
    }
  };

  const handleSelectItem = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedItems([...selectedItems, id]);
    } else {
      setSelectedItems(selectedItems.filter((itemId) => itemId !== id));
    }
  };

  return (
    <DashboardLayout projects={coordinatorProjects} navItems={coordinatorNavItems}>
      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-5 mb-8">
        <div className="flex flex-col gap-2 max-w-2xl">
          <h1 className="text-slate-900 dark:text-white text-3xl md:text-4xl font-black leading-tight tracking-tight">
            Quản lý danh mục & dữ liệu nền
          </h1>
          <p className="text-muted-foreground text-base md:text-lg font-normal leading-relaxed">
            Thiết lập và quản lý danh sách hàng hóa cứu trợ và vùng thiên tai. Dữ liệu này là cơ sở
            cho toàn bộ hoạt động điều phối.
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" size="md">
            <span className="material-symbols-outlined text-[20px]">description</span>
            <span className="truncate">Hướng dẫn</span>
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="mb-6">
        <TabsList
          variant="line"
          className="border-b border-slate-200 dark:border-border bg-transparent p-0 h-auto mb-4"
        >
          <TabsTrigger value="goods" className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[20px]">inventory_2</span>
            <span>Hàng hóa cứu trợ</span>
          </TabsTrigger>
          <TabsTrigger value="disaster" className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[20px]">flood</span>
            <span>Vùng thiên tai</span>
          </TabsTrigger>
          {/* Removed Stations Tab */}
        </TabsList>
        <TabsContent value="goods" className="mt-0">
          {/* Actions Bar */}
          <Card className="mb-6">
            <CardContent className="flex flex-col sm:flex-row justify-between gap-4 p-4">
              <div className="flex items-center gap-2 overflow-x-auto">
                <Button variant="ghost" size="sm">
                  <span className="material-symbols-outlined text-[20px]">filter_list</span>
                  <span>Lọc dữ liệu</span>
                </Button>
                <Separator orientation="vertical" className="h-6" />
                <Button variant="ghost" size="sm">
                  <span className="material-symbols-outlined text-[20px]">download</span>
                  <span>Xuất Excel</span>
                </Button>
                <Button variant="ghost" size="sm">
                  <span className="material-symbols-outlined text-[20px]">upload</span>
                  <span>Nhập dữ liệu</span>
                </Button>
              </div>
              <Button variant="primary" size="md">
                <span className="material-symbols-outlined text-[20px]">add</span>
                <span>Thêm hàng hóa mới</span>
              </Button>
            </CardContent>
          </Card>

          {/* Table */}
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-14">
                      <Checkbox
                        checked={selectedItems.length === mockGoods.length && mockGoods.length > 0}
                        onCheckedChange={(checked) => handleSelectAll(checked === true)}
                      />
                    </TableHead>
                    <TableHead className="text-xs font-bold uppercase">Hình ảnh</TableHead>
                    <TableHead className="text-xs font-bold uppercase min-w-[180px]">
                      Tên hàng hóa
                    </TableHead>
                    <TableHead className="text-xs font-bold uppercase">Danh mục</TableHead>
                    <TableHead className="text-xs font-bold uppercase">Đơn vị</TableHead>
                    <TableHead className="text-xs font-bold uppercase">Ưu tiên</TableHead>
                    <TableHead className="text-xs font-bold uppercase">Trạng thái</TableHead>
                    <TableHead className="text-xs font-bold uppercase text-right">
                      Hành động
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mockGoods.map((item) => {
                    const categoryBadge =
                      categoryBadgeConfig[item.category] || categoryBadgeConfig['Lương thực'];
                    const statusBadge = statusBadgeConfig[item.status];
                    const priority = priorityConfig[item.priority];

                    return (
                      <TableRow key={item.id} className="group">
                        <TableCell>
                          <Checkbox
                            checked={selectedItems.includes(item.id)}
                            onCheckedChange={(checked) => {
                              if (typeof checked === 'boolean') {
                                handleSelectItem(item.id, checked);
                              }
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <div
                            className="size-10 rounded-lg bg-slate-200 dark:bg-[#233648] bg-cover bg-center"
                            style={{
                              backgroundImage: item.image ? `url('${item.image}')` : 'none',
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="text-sm font-bold">{item.name}</span>
                            <span className="text-xs text-muted-foreground">Mã: {item.code}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={categoryBadge.variant}
                            appearance={categoryBadge.appearance}
                            size="sm"
                            shape="default"
                          >
                            {item.category}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">{item.unit}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <span className={`size-2 rounded-full ${priority.color}`} />
                            <span className="text-sm">{priority.label}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={statusBadge.variant}
                            appearance={statusBadge.appearance}
                            size="sm"
                            shape="default"
                          >
                            <BadgeDot
                              className={
                                statusBadge.label === 'Hết hàng'
                                  ? 'animate-zoom-outline bg-red-500'
                                  : ''
                              }
                            />
                            {statusBadge.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button variant="ghost" size="icon" title="Chỉnh sửa">
                              <span className="material-symbols-outlined text-[18px]">edit</span>
                            </Button>
                            {/* Removed Delete Button */}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
            <CardFooter className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                Hiển thị <span className="font-bold text-foreground">1-5</span> trong số{' '}
                <span className="font-bold text-foreground">128</span> kết quả
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" size="icon" disabled>
                  <span className="material-symbols-outlined text-sm">chevron_left</span>
                </Button>
                <Button variant="primary" size="icon">
                  1
                </Button>
                <Button variant="ghost" size="icon">
                  2
                </Button>
                <Button variant="ghost" size="icon">
                  3
                </Button>
                <span className="flex items-center justify-center size-8 text-muted-foreground">
                  ...
                </span>
                <Button variant="ghost" size="icon">
                  12
                </Button>
                <Button variant="ghost" size="icon">
                  <span className="material-symbols-outlined text-sm">chevron_right</span>
                </Button>
              </div>
            </CardFooter>
          </Card>
        </TabsContent>
        <TabsContent value="disaster" className="mt-0">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card className="bg-card dark:bg-card border-border hover:border-primary/50 transition-colors group">
              <CardContent className="p-6 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <p className="text-muted-foreground dark:text-muted-foreground text-sm font-semibold uppercase tracking-wider">
                    Vùng thiên tai
                  </p>
                  <div className="size-8 rounded-full bg-red-500/20 dark:bg-red-500/30 flex items-center justify-center text-red-400 group-hover:bg-red-500 group-hover:text-white transition-all">
                    <span className="material-symbols-outlined text-lg">flood</span>
                  </div>
                </div>
                <p className="text-foreground dark:text-foreground text-4xl font-black">
                  {reliefLocationsData.length}
                </p>
                <div className="flex items-center gap-1 text-red-500 text-sm font-medium bg-red-500/10 w-fit px-2 py-1 rounded">
                  <span>
                    {reliefLocationsData.filter((l) => l.urgency === 'high').length} điểm khẩn cấp
                    cao
                  </span>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-card dark:bg-card border-border hover:border-primary/50 transition-colors group">
              <CardContent className="p-6 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <p className="text-muted-foreground dark:text-muted-foreground text-sm font-semibold uppercase tracking-wider">
                    Đội cứu trợ
                  </p>
                  <div className="size-8 rounded-full bg-blue-500/20 dark:bg-blue-500/30 flex items-center justify-center text-blue-400 group-hover:bg-blue-500 group-hover:text-white transition-all">
                    <span className="material-symbols-outlined text-lg">groups</span>
                  </div>
                </div>
                <p className="text-foreground dark:text-foreground text-4xl font-black">
                  {teamsData.length}
                </p>
                <div className="flex items-center gap-1 text-blue-500 text-sm font-medium bg-blue-500/10 w-fit px-2 py-1 rounded">
                  <span>
                    {teamsData.filter((t) => t.status !== 'available').length} đội đang hoạt động
                  </span>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-card dark:bg-card border-border hover:border-primary/50 transition-colors group">
              <CardContent className="p-6 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <p className="text-muted-foreground dark:text-muted-foreground text-sm font-semibold uppercase tracking-wider">
                    Đã tiếp cận
                  </p>
                  <div className="size-8 rounded-full bg-green-500/20 dark:bg-green-500/30 flex items-center justify-center text-green-400 group-hover:bg-green-500 group-hover:text-white transition-all">
                    <span className="material-symbols-outlined text-lg">check_circle</span>
                  </div>
                </div>
                <p className="text-foreground dark:text-foreground text-4xl font-black">
                  {teamsData.filter((t) => t.status === 'rescuing').length}
                </p>
                <div className="flex items-center gap-1 text-green-500 text-sm font-medium bg-green-500/10 w-fit px-2 py-1 rounded">
                  <span>Phương tiện đã cập bến</span>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-card dark:bg-card border-border hover:border-primary/50 transition-colors group">
              <CardContent className="p-6 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <p className="text-muted-foreground dark:text-muted-foreground text-sm font-semibold uppercase tracking-wider">
                    Thời gian TB
                  </p>
                  <div className="size-8 rounded-full bg-orange-500/20 dark:bg-orange-500/30 flex items-center justify-center text-orange-400 group-hover:bg-orange-500 group-hover:text-white transition-all">
                    <span className="material-symbols-outlined text-lg">schedule</span>
                  </div>
                </div>
                <p className="text-foreground dark:text-foreground text-4xl font-black">4.5h</p>
                <div className="flex items-center gap-1 text-orange-500 text-sm font-medium bg-orange-500/10 w-fit px-2 py-1 rounded">
                  <span>Thời gian phản ứng</span>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="h-[600px] overflow-hidden border-border bg-card dark:bg-card">
            <div className="w-full h-full relative">
              <ReliefMap
                locations={reliefLocationsData}
                headquarters={HEADQUARTERS}
                onLocationSelect={() => {}}
                mapApiKey={GOONG_MAP_KEY}
                goongApiKey={GOONG_API_KEY}
              />
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
}
