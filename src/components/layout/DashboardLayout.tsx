import React, { type ReactNode, useEffect, useRef, useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { DashboardSidebar } from './sidebar/DashboardSidebar';
import { DashboardHeader } from './DashboardHeader';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';

const HEADER_HEIGHT = 64;

interface DashboardLayoutProps {
  children: ReactNode;
  projects?: Array<{ label: string; path: string; icon: string }>;
  navItems?: Array<{ label: string; path: string; icon: string }>;
  navGroups?: Array<{ title: string; items: { label: string; path: string; icon: string }[] }>;
}

export function DashboardLayout({ children, projects, navItems, navGroups }: DashboardLayoutProps) {
  const location = useLocation();
  const mainRef = useRef<HTMLDivElement>(null);

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [hideHeader, setHideHeader] = useState(false);

  const lastScrollTop = useRef(0);

  /** ---------------------------
   * SCROLL HANDLER (SMOOTH)
   * --------------------------- */
  useEffect(() => {
    const el = mainRef.current;
    if (!el) return;

    const onScroll = () => {
      const current = el.scrollTop;
      const diff = current - lastScrollTop.current;

      // chống rung
      if (Math.abs(diff) < 8) return;

      if (diff > 0) {
        setHideHeader(true);
      } else {
        setHideHeader(false);
      }

      lastScrollTop.current = current;
    };

    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, []);

  /** ---------------------------
   * BREADCRUMB
   * --------------------------- */
  const pathnames = location.pathname.split('/').filter(Boolean);

  return (
    <div className="flex h-screen w-full overflow-hidden">
      {/* Sidebar */}
      <DashboardSidebar
        projects={projects}
        navItems={navItems}
        navGroups={navGroups}
        isCollapsed={isSidebarCollapsed}
        isMobileOpen={isMobileSidebarOpen}
        onMobileClose={() => setIsMobileSidebarOpen(false)}
      />

      {/* Main Area */}
      <div className="flex flex-1 flex-col relative min-w-0">
        {/* Header (FIXED) */}
        <div
          className={`
            fixed top-0 right-0 z-30
            transition-transform duration-300 ease-out
            ${hideHeader ? '-translate-y-full' : 'translate-y-0'}
            left-0 lg:${isSidebarCollapsed ? 'left-16' : 'left-64'}
          `}
          style={{ height: HEADER_HEIGHT }}
        >
          <DashboardHeader
            isSidebarCollapsed={isSidebarCollapsed}
            onSidebarToggle={() => setIsSidebarCollapsed((v) => !v)}
            onMenuClick={() => setIsMobileSidebarOpen((v) => !v)}
          />
        </div>

        {/* Scrollable Content */}
        <main
          ref={mainRef}
          className="flex-1 overflow-y-auto bg-[#f6f7f8] dark:bg-[#101922] px-4 md:px-8"
          style={{ paddingTop: HEADER_HEIGHT }}
        >
          <div className="mx-auto max-w-[1200px] py-6">
            {/* Breadcrumb */}
            {pathnames.length > 0 && (
              <Breadcrumb className="mb-4">
                <BreadcrumbList>
                  <BreadcrumbItem>
                    <BreadcrumbLink asChild>
                      <Link to="/">Hệ thống</Link>
                    </BreadcrumbLink>
                  </BreadcrumbItem>

                  {pathnames.map((segment, index) => {
                    const url = '/' + pathnames.slice(0, index + 1).join('/');
                    const isLast = index === pathnames.length - 1;
                    const label = segment
                      .split('-')
                      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                      .join(' ');
                    return (
                      <React.Fragment key={url}>
                        <BreadcrumbSeparator />
                        <BreadcrumbItem>
                          {isLast ? (
                            <BreadcrumbPage>{label}</BreadcrumbPage>
                          ) : (
                            <BreadcrumbLink asChild>
                              <Link to={url}>{label}</Link>
                            </BreadcrumbLink>
                          )}
                        </BreadcrumbItem>
                      </React.Fragment>
                    );
                  })}
                </BreadcrumbList>
              </Breadcrumb>
            )}

            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
