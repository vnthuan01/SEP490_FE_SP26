export const coordinatorNavGroups = [
  {
    title: 'Tổng quan',
    items: [
      { label: 'Báo cáo & Thống kê', path: '/portal/coordinator/dashboard', icon: 'dashboard' },
    ],
  },
  {
    title: 'Điều phối & Vận hành',
    items: [
      { label: 'Điều phối thông minh', path: '/portal/coordinator/dispatch', icon: 'alt_route' },
      { label: 'Theo dõi nhiệm vụ', path: '/portal/coordinator/mission-tracking', icon: 'radar' },
      { label: 'Điều phối & Bản đồ', path: '/portal/coordinator/maps', icon: 'map' },
    ],
  },
  {
    title: 'Yêu cầu',
    items: [
      { label: 'Yêu cầu cứu hộ', path: '/portal/coordinator/requests', icon: 'person_raised_hand' },
      {
        label: 'Yêu cầu tình nguyện',
        path: '/portal/coordinator/volunteer-requests',
        icon: 'how_to_reg',
      },
    ],
  },
  {
    title: 'Nhân sự & Phân công',
    items: [
      { label: 'Đội tình nguyện', path: '/portal/coordinator/teams', icon: 'groups' },
      { label: 'Phân công đội', path: '/portal/coordinator/maps', icon: 'group_work' },
      {
        label: 'Phân công tình nguyện viên',
        path: '/portal/coordinator/volunteer-allocation',
        icon: 'transfer_within_a_station',
      },
    ],
  },
  {
    title: 'Cơ sở vật chất',
    items: [
      { label: 'Trạm cứu trợ', path: '/portal/coordinator/relief-station', icon: 'home_pin' },
      { label: 'Kho & Nhu yếu phẩm', path: '/portal/coordinator/inventory', icon: 'inventory_2' },
      { label: 'Quản lý dữ liệu', path: '/portal/coordinator/data-management', icon: 'database' },
    ],
  },
];

export const coordinatorProjects: Array<{ label: string; path: string; icon: string }> = [];
export const coordinatorNavItems: Array<{ label: string; path: string; icon: string }> = [];
