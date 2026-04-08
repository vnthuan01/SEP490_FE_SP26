import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LogOut, Settings } from 'lucide-react';
import { useAuthContext } from '@/components/provider/auth/AuthProvider';
import { useUserProfile } from '@/hooks/useUsers';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface NavItem {
  label: string;
  path: string;
  icon: string;
}

interface ProjectItem {
  label: string;
  path: string;
  icon: string;
}

interface DashboardSidebarProps {
  projects?: ProjectItem[];
  navItems?: NavItem[];
  isCollapsed?: boolean;
  isMobileOpen?: boolean;
  onMobileClose?: () => void;
}

export function DashboardSidebar({
  projects,
  navItems,
  isCollapsed = false,
  isMobileOpen = false,
  onMobileClose,
}: DashboardSidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuthContext();
  const { profile } = useUserProfile();
  const avatarUrl = profile?.pictureUrl || user?.avatarUrl || null;

  const isActive = (path: string) => location.pathname === path;

  // Default projects for Admin
  const defaultProjects: ProjectItem[] = projects || [
    { label: 'Tổng quan', path: '/', icon: 'dashboard' },
  ];

  // Default nav items for Admin
  const defaultNavItems: NavItem[] = navItems || [
    { label: 'Thống Kê', path: '/', icon: 'description' },
  ];

  const sidebarContent = (
    <>
      {/* Logo & Brand */}
      <div
        className={`flex items-center border-b border-border transition-all duration-300 ${
          isCollapsed ? 'justify-center px-2 py-4' : 'gap-3 px-6 py-5'
        }`}
      >
        <div className="size-6 flex items-center justify-center rounded-full bg-primary/10 text-primary flex-shrink-0">
          <span className="material-symbols-outlined text-2xl">health_and_safety</span>
        </div>
        {!isCollapsed && (
          <h2 className="text-foreground text-lg font-bold leading-tight tracking-tight whitespace-nowrap">
            Cứu Trợ VN
          </h2>
        )}
        {/* Mobile close button */}
        {isMobileOpen && onMobileClose && (
          <button
            onClick={onMobileClose}
            className="ml-auto lg:hidden p-1 text-muted-foreground hover:text-foreground transition-colors"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        )}
      </div>

      {/* Navigation Content */}
      <div
        className="flex flex-col flex-1 overflow-y-auto gap-1 transition-all duration-300"
        style={{ padding: isCollapsed ? '1rem 0.5rem' : '1rem' }}
      >
        <TooltipProvider delayDuration={300}>
          {/* Projects Section */}
          {defaultProjects.length > 0 && (
            <>
              {!isCollapsed && (
                <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider px-2 mb-2 mt-2">
                  Hệ thống
                </div>
              )}
              {defaultProjects.map((project) => {
                const linkContent = (
                  <Link
                    key={project.path}
                    to={project.path}
                    onClick={onMobileClose}
                    className={`flex items-center rounded-lg transition-colors ${
                      isCollapsed ? 'justify-center px-2 py-2.5' : 'gap-3 px-3 py-2.5'
                    } ${
                      isActive(project.path)
                        ? 'bg-primary/10 text-primary font-medium'
                        : 'text-muted-foreground hover:bg-muted'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[20px] flex-shrink-0">
                      {project.icon}
                    </span>
                    {!isCollapsed && (
                      <span className="text-sm whitespace-nowrap">{project.label}</span>
                    )}
                  </Link>
                );

                return isCollapsed ? (
                  <Tooltip key={project.path}>
                    <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
                    <TooltipContent side="right" className="ml-2">
                      <p>{project.label}</p>
                    </TooltipContent>
                  </Tooltip>
                ) : (
                  linkContent
                );
              })}
            </>
          )}

          {/* Divider */}
          {defaultNavItems.length > 0 && (
            <div className={`h-px bg-border my-2 ${isCollapsed ? 'mx-2' : ''}`}></div>
          )}

          {/* System Navigation */}
          {defaultNavItems.length > 0 && (
            <>
              {!isCollapsed && (
                <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider px-2 mb-2">
                  Báo cáo
                </div>
              )}
              {defaultNavItems.map((item) => {
                const linkContent = (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={onMobileClose}
                    className={`flex items-center rounded-lg transition-colors ${
                      isCollapsed ? 'justify-center px-2 py-2.5' : 'gap-3 px-3 py-2.5'
                    } ${
                      isActive(item.path)
                        ? 'bg-primary/10 text-primary font-medium'
                        : 'text-muted-foreground hover:bg-muted'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[20px] flex-shrink-0">
                      {item.icon}
                    </span>
                    {!isCollapsed && (
                      <span className="text-sm whitespace-nowrap">{item.label}</span>
                    )}
                  </Link>
                );

                return isCollapsed ? (
                  <Tooltip key={item.path}>
                    <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
                    <TooltipContent side="right" className="ml-2">
                      <p>{item.label}</p>
                    </TooltipContent>
                  </Tooltip>
                ) : (
                  linkContent
                );
              })}
            </>
          )}
        </TooltipProvider>
      </div>

      {/* User Profile Footer */}
      <div
        className={`border-t border-border transition-all duration-300 ${isCollapsed ? 'p-2' : 'p-4'}`}
      >
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <div
              className={`flex items-center rounded-lg hover:bg-muted cursor-pointer transition-colors ${
                isCollapsed ? 'justify-center p-2' : 'gap-3 p-2'
              }`}
            >
              <div
                className={`bg-center bg-no-repeat bg-cover rounded-full size-9 border border-border flex-shrink-0 ${
                  avatarUrl ? '' : 'bg-primary text-primary-foreground'
                }`}
                style={{
                  backgroundImage: avatarUrl ? `url("${avatarUrl}")` : 'none',
                }}
              >
                {!avatarUrl && (
                  <div className="w-full h-full flex items-center justify-center font-bold">
                    {profile?.displayName?.charAt(0) || user?.fullName?.charAt(0) || 'A'}
                  </div>
                )}
              </div>
              {!isCollapsed && (
                <div className="flex flex-col overflow-hidden min-w-0">
                  <span className="text-sm font-bold text-foreground truncate">
                    {profile?.displayName || user?.fullName || 'Admin User'}
                  </span>
                  <span className="text-xs text-muted-foreground truncate">
                    {user?.email || 'admin@cuutrovn.org'}
                  </span>
                </div>
              )}
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent side={isCollapsed ? 'right' : 'top'} align="start" className="w-56">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col gap-1">
                <p className="text-sm font-semibold leading-none text-popover-foreground">
                  {profile?.displayName || user?.fullName || 'Admin User'}
                </p>
                <p className="text-xs leading-none text-muted-foreground">
                  {user?.email || 'admin@cuutrovn.org'}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem onClick={() => navigate('/portal/settings')}>
                <Settings className="mr-2 size-4" />
                Cài đặt
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              onClick={async () => {
                await logout();
                navigate('/login', { replace: true });
              }}
            >
              <LogOut className="mr-2 size-4" />
              Đăng xuất
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className={`hidden lg:flex flex-col border-r border-border bg-background flex-shrink-0 h-screen transition-all duration-300 ${
          isCollapsed ? 'w-16' : 'w-64'
        }`}
      >
        {sidebarContent}
      </aside>

      {/* Mobile Sidebar Overlay */}
      {isMobileOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
            onClick={onMobileClose}
          />
          {/* Sidebar drawer */}
          <aside className="fixed inset-y-0 left-0 z-50 flex flex-col w-64 bg-background border-r border-border lg:hidden animate-in slide-in-from-left duration-300">
            {sidebarContent}
          </aside>
        </>
      )}
    </>
  );
}
