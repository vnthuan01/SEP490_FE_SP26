import { useTheme } from 'next-themes';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Notification from '../ui/notification';
import { useRealtimeNotifications } from '@/components/provider/realtime/RealtimeNotificationProvider';
import { useAuthContext } from '@/components/provider/auth/AuthProvider';
import { UserRole } from '@/enums/UserRole';

interface DashboardHeaderProps {
  onMenuClick?: () => void;
  onSidebarToggle?: () => void;
  isSidebarCollapsed?: boolean;
  searchPlaceholder?: string;
  // onSearchChange?: (_value: string) => void;
}

export function DashboardHeader({
  onMenuClick,
  onSidebarToggle,
  isSidebarCollapsed = false,
  // searchPlaceholder = 'Tìm kiếm hàng hóa, danh mục...',
  // onSearchChange,
}: DashboardHeaderProps) {
  // const [searchValue, setSearchValue] = useState('');
  const { theme, setTheme } = useTheme();
  const { user } = useAuthContext();
  const navigate = useNavigate();
  const [openNotification, setOpenNotification] = useState(false);
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useRealtimeNotifications();
  const normalizedRole = String(user?.role ?? '')
    .trim()
    .toLowerCase();
  const canSeeNotifications =
    normalizedRole === UserRole.Coordinator.toLowerCase() ||
    normalizedRole === 'coordinator' ||
    normalizedRole === 'moderator';
  // const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  //   const value = e.target.value;
  //   setSearchValue(value);
  //   // onSearchChange?.(value);
  // };

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  const handleClickItem = async (item: (typeof notifications)[number]) => {
    const notificationId = item.notificationId || item.id;
    if (notificationId) {
      await markAsRead(notificationId);
    }

    if (item.referenceId) {
      navigate(`/portal/coordinator/requests?requestId=${encodeURIComponent(item.referenceId)}`);
    }

    setOpenNotification(false);
  };

  const handleMarkAllRead = async () => {
    await markAllAsRead();
  };
  return (
    <header
      className="
    sticky top-0 z-50
    flex items-center justify-between whitespace-nowrap
    border-b border-slate-200 dark:border-[#233648]
    bg-surface-light/80 dark:bg-[#111a22]/70
    backdrop-blur-md
    px-6 py-3 h-16
  "
    >
      {' '}
      {/* Desktop Sidebar Toggle & Mobile Menu Button */}
      <div className="flex items-center gap-2">
        <button
          onClick={onSidebarToggle}
          className="hidden lg:flex items-center justify-center size-8 text-slate-500 hover:text-primary dark:text-[#92adc9] dark:hover:text-white transition-colors rounded-md hover:bg-slate-100 dark:hover:bg-[#1c2a38]"
          title={isSidebarCollapsed ? 'Mở rộng sidebar' : 'Thu gọn sidebar'}
        >
          <span className="material-symbols-outlined text-xl">
            {isSidebarCollapsed ? 'menu_open' : 'menu'}
          </span>
        </button>
        <button
          onClick={onMenuClick}
          className="lg:hidden text-slate-500 hover:text-primary transition-colors"
        >
          <span className="material-symbols-outlined">menu</span>
        </button>
      </div>
      {/* Search Bar */}
      {/* <label className="flex flex-col min-w-40 h-10 w-full max-w-md">
        <div className="flex h-full rounded-lg bg-slate-100 dark:bg-[#233648] focus-within:ring-2 ring-primary/50">
          <div className="flex items-center pl-4 text-slate-400 dark:text-[#92adc9]">
            <span className="material-symbols-outlined text-[20px]">search</span>
          </div>
          <input
            className="flex-1 bg-transparent px-3 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-[#92adc9] focus:ring-0"
            // placeholder={searchPlaceholder}
            value={searchValue}
            onChange={handleSearchChange}
          />
        </div>
      </label> */}
      {/* Right Actions */}
      <div className="flex flex-1 justify-end items-center gap-4">
        {/* Toggle Theme */}
        <button
          onClick={toggleTheme}
          className="cursor-pointer p-2 rounded-md text-slate-500 hover:text-primary dark:text-[#92adc9] dark:hover:text-white transition-colors"
          title="Toggle theme"
        >
          <span className="material-symbols-outlined">
            {theme === 'dark' ? 'light_mode' : 'dark_mode'}
          </span>
        </button>

        {/* Notifications */}
        {canSeeNotifications && (
          <div className="relative">
            <button
              onClick={() => setOpenNotification((v) => !v)}
              className="relative p-2 text-slate-500 hover:text-primary dark:text-[#92adc9] dark:hover:text-white"
            >
              <span className="material-symbols-outlined">notifications</span>

              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 size-2 bg-red-500 rounded-full border-2 border-surface-light dark:border-[#111a22]" />
              )}
            </button>

            {/* Dropdown */}
            {openNotification && (
              <div className="absolute right-0 mt-3 z-50">
                <Notification
                  data={notifications}
                  onClickItem={handleClickItem}
                  onMarkAllRead={handleMarkAllRead}
                />
              </div>
            )}
          </div>
        )}

        {/* Help */}
        <button className="cursor-pointer p-2 text-slate-500 hover:text-primary dark:text-[#92adc9] dark:hover:text-white transition-colors">
          <span className="material-symbols-outlined">help</span>
        </button>
      </div>
    </header>
  );
}
