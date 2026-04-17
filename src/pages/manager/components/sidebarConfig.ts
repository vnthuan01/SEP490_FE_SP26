export const managerNavGroups = [
  {
    title: 'Tổng quan',
    items: [{ label: 'Báo cáo & Thống kê', path: '/portal/manager/dashboard', icon: 'dashboard' }],
  },
  {
    title: 'Chiến dịch & Trạm',
    items: [
      { label: 'Chiến dịch', path: '/portal/manager/campaigns', icon: 'campaign' },
      {
        label: 'Phân phối cứu trợ',
        path: '/portal/manager/relief-distribution',
        icon: 'volunteer_activism',
      },
      { label: 'Trạm cứu trợ', path: '/portal/manager/stations', icon: 'home_work' },
    ],
  },
  {
    title: 'Vận hành nguồn lực',
    items: [
      { label: 'Kho tổng', path: '/portal/manager/inventory', icon: 'inventory_2' },
      { label: 'Phương tiện', path: '/portal/manager/vehicles', icon: 'local_shipping' },
    ],
  },
];

export const managerProjects: Array<{ label: string; path: string; icon: string }> = [];
export const managerNavItems: Array<{ label: string; path: string; icon: string }> = [];
