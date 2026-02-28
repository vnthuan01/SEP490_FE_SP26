import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ExportInventoryDialog } from './components/ExportInventory';
import { mockTeams } from '@/types/mock';
import type { ExportItem } from '@/types/exportInventory';
import { CreateInventoryItemDialog } from './components/CreateItem';

type InventoryStat = {
  id: string;
  label: string;
  value: string | number;
  icon: string;
  highlight?: 'danger';
  trend?: string;
  note?: string;
  progress?: number;
};

type InventoryStatus = 'critical' | 'warning' | 'safe' | 'full';

type InventoryItem = {
  id: string;
  name: string;
  category: string;
  icon: string;
  current: number;
  capacity: number;
  unit: string;
  status: InventoryStatus;
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

export default function CoordinatorInventoryPage() {
  const [filter, setFilter] = useState<'all' | InventoryStatus>('all');
  const [openCreate, setOpenCreate] = useState(false);

  const inventoryStats: InventoryStat[] = [
    {
      id: 'categories',
      label: 'Tổng danh mục',
      value: 148,
      icon: 'category',
      trend: '+12 mới hôm nay',
    },
    {
      id: 'low-stock',
      label: 'Sắp hết hàng',
      value: 5,
      icon: 'production_quantity_limits',
      highlight: 'danger',
      note: 'Cần bổ sung gấp',
    },
    { id: 'exported', label: 'Đã xuất hôm nay', value: '2,450', icon: 'outbound' },
    { id: 'capacity', label: 'Sức chứa kho', value: '82%', icon: 'warehouse', progress: 82 },
  ];

  const inventoryItems: InventoryItem[] = [
    {
      id: 'noodle',
      name: 'Mì tôm',
      category: 'Lương thực',
      icon: 'ramen_dining',
      current: 120,
      capacity: 1000,
      unit: 'Thùng',
      status: 'critical',
    },
    {
      id: 'water',
      name: 'Nước đóng chai',
      category: 'Nhu yếu phẩm',
      icon: 'water_drop',
      current: 450,
      capacity: 2000,
      unit: 'Thùng',
      status: 'warning',
    },
    {
      id: 'medicine',
      name: 'Thuốc hạ sốt',
      category: 'Y tế',
      icon: 'medication',
      current: 2500,
      capacity: 3000,
      unit: 'Hộp',
      status: 'safe',
    },
    {
      id: 'lifejacket',
      name: 'Áo phao',
      category: 'Cứu hộ',
      icon: 'safety_check',
      current: 800,
      capacity: 1000,
      unit: 'Cái',
      status: 'safe',
    },
    {
      id: 'flashlight',
      name: 'Đèn pin sạc',
      category: 'Dụng cụ',
      icon: 'flashlight_on',
      current: 500,
      capacity: 500,
      unit: 'Cái',
      status: 'full',
    },
  ];

  const filteredItems =
    filter === 'all' ? inventoryItems : inventoryItems.filter((i) => i.status === filter);
  const [open, setOpen] = useState(false);

  return (
    <DashboardLayout
      projects={[
        { label: 'Tổng quan', path: '/portal/coordinator/data-management', icon: 'dashboard' },
        { label: 'Điều phối & Bản đồ', path: '/portal/coordinator/maps', icon: 'map' },
        { label: 'Đội tình nguyện', path: '/portal/coordinator/teams', icon: 'groups' },
        {
          label: 'Yêu cầu tình nguyện',
          path: '/portal/coordinator/volunteer-requests',
          icon: 'how_to_reg',
        },
        {
          label: 'Yêu cầu cứu trợ',
          path: '/portal/coordinator/requests',
          icon: 'person_raised_hand',
        },
        {
          label: 'Kho vận & Nhu yếu phẩm',
          path: '/portal/coordinator/inventory',
          icon: 'inventory_2',
        },
      ]}
      navItems={[
        { label: 'Báo cáo & Thống kê', path: '/portal/coordinator/dashboard', icon: 'description' },
      ]}
    >
      {/* HEADER */}
      <div className="flex justify-between mb-6">
        <div>
          <h1 className="text-4xl text-primary font-black">Quản lý Kho Vật tư</h1>
          <p className="text-muted-foreground dark:text-muted-foreground">
            Theo dõi tồn kho & điều phối cứu trợ
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="gap-2">
            <span className="material-symbols-outlined text-lg">download</span>
            Xuất báo cáo
          </Button>{' '}
          <Button variant="primary" className="gap-2" onClick={() => setOpenCreate(true)}>
            <span className="material-symbols-outlined text-lg">inventory_2</span>
            Nhập kho
            <span className="material-symbols-outlined text-lg">add</span>
          </Button>{' '}
        </div>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {inventoryStats.map((s) => (
          <Card key={s.id}>
            <CardContent className="p-5">
              <div className="flex gap-2 text-sm">
                <span className="material-symbols-outlined">{s.icon}</span>
                {s.label}
              </div>
              <p className={`text-3xl font-bold ${s.highlight === 'danger' ? 'text-red-500' : ''}`}>
                {s.value}
              </p>
              {s.trend && <p className="text-xs text-green-500">{s.trend}</p>}
              {s.progress && (
                <div className="mt-2 h-1.5 bg-border rounded-full">
                  <div
                    className="h-1.5 bg-yellow-500 rounded-full"
                    style={{ width: `${s.progress}%` }}
                  />
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* FILTER */}
      <div className="flex gap-2 mb-4">
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

      {/* INVENTORY GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
        {filteredItems.map((item) => {
          const percent = Math.round((item.current / item.capacity) * 100);
          const status = statusMap[item.status];

          return (
            <Card
              key={item.id}
              className={`group flex flex-col bg-card border-border transition ${status.hover}`}
            >
              <CardContent className="p-5 flex flex-col flex-1">
                {/* HEADER */}
                <div className="flex justify-between mb-4">
                  <div className="flex gap-4">
                    <div className="size-12 font-bold border rounded-xl bg-border-dark flex items-center justify-center">
                      <span className="material-symbols-outlined">{item.icon}</span>
                    </div>
                    <div>
                      <h3 className="font-bold text-lg group-hover:text-primary">{item.name}</h3>
                      <p className="text-sm text-muted-foreground">{item.category}</p>
                    </div>
                  </div>

                  <span
                    className={`px-2.5 py-1 rounded-md h-6 text-xs font-bold border ${status.badge}`}
                  >
                    {status.label}
                  </span>
                </div>

                {/* BODY */}
                <div className="flex-1 mb-5">
                  <div className="flex justify-between mb-2">
                    <span className="text-3xl font-black">{item.current}</span>
                    <span className="text-sm text-muted-foreground">
                      / {item.capacity} {item.unit}
                    </span>
                  </div>

                  <div className="h-2.5 bg-border-dark rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${status.bar}`}
                      style={{ width: `${percent}%` }}
                    />
                  </div>

                  <p className="mt-2 text-xs text-muted-foreground">{percent}% sức chứa</p>
                </div>

                {/* ACTION */}
                <div className="flex gap-3">
                  <Button className="flex-1" variant="primary" onClick={() => setOpen(true)}>
                    <span className="material-symbols-outlined text-lg">outbound</span>
                    Xuất kho
                  </Button>
                  <Button size="icon" variant="outline">
                    <span className="material-symbols-outlined">add</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
      <ExportInventoryDialog
        open={open}
        onOpenChange={setOpen}
        items={inventoryItems as ExportItem[]}
        teams={mockTeams}
        onSubmit={(items, note, teamId) => {
          console.log('EXPORT', items, note, teamId);
          setOpen(false);
        }}
      />
      <CreateInventoryItemDialog
        open={openCreate}
        onOpenChange={setOpenCreate}
        onSubmit={(item) => {
          console.log('NEW ITEM', item);

          // TODO:
          // 1. call API create inventory
          // 2. update state inventoryItems
          // 3. toast success

          setOpenCreate(false);
        }}
      />
    </DashboardLayout>
  );
}
