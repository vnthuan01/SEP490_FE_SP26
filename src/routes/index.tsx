import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { routes } from './config';
import NotFoundPage from '@/pages/notfound/NotFoundPage';
import RoleBasedRoute from './protectedRoute';
import { AuthProvider } from '@/components/provider/auth/AuthContext';
import { RealtimeNotificationProvider } from '@/components/provider/realtime/RealtimeNotificationProvider';
import { useEffect, useState, useRef } from 'react';
import LoadingEffect from '@/components/layout/loading/LoadingEffect';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
  }, [pathname]);
  return null;
}

function TitleUpdater() {
  const { pathname } = useLocation();

  useEffect(() => {
    const segments = pathname.split('/').filter(Boolean);

    if (segments.length === 0) {
      document.title = 'ReliefCoord VN';
      return;
    }

    let lastSegment = segments[segments.length - 1];
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    if (!isNaN(Number(lastSegment)) || uuidRegex.test(lastSegment)) {
      segments.pop();
    }

    // Lấy segment cuối sau khi pop
    lastSegment = segments[segments.length - 1] ?? 'ReliefCoord VN';

    // Split theo dấu "-" và viết hoa chữ cái đầu mỗi từ
    const formatted = lastSegment
      .split('-')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');

    document.title = `ReliefCoord VN - ${formatted}`;
  }, [pathname]);

  return null;
}

function NavigationLoader({ minDuration = 600 }: { minDuration?: number }) {
  const { pathname } = useLocation();

  const [isLoading, setIsLoading] = useState(false);
  const [isFadingOut, setIsFadingOut] = useState(false);

  const isFirstRender = useRef(true);
  const visitedPaths = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      visitedPaths.current.add(pathname);
      return;
    }

    if (visitedPaths.current.has(pathname)) return;

    visitedPaths.current.add(pathname);

    const start = Date.now();

    const startTimer = setTimeout(() => {
      setIsLoading(true);
      setIsFadingOut(false);

      const elapsed = Date.now() - start;

      const remaining = Math.max(minDuration - elapsed, 0);

      setTimeout(() => {
        setIsFadingOut(true);

        setTimeout(() => {
          setIsLoading(false);
          setIsFadingOut(false);
        }, 300);
      }, remaining);
    }, 0);

    return () => clearTimeout(startTimer);
  }, [pathname, minDuration]);

  if (!isLoading) return null;

  return (
    <div className={isFadingOut ? 'loader-fade-out' : ''}>
      <LoadingEffect timeout={500} />
    </div>
  );
}

export default function AppRoutes() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <TitleUpdater />
      <NavigationLoader minDuration={2000} />
      <AuthProvider>
        <RealtimeNotificationProvider>
          <Routes>
            {routes.map((r, idx) =>
              r.isProtected ? (
                <Route
                  key={idx}
                  path={r.path}
                  element={<RoleBasedRoute element={r.element} roles={r.roles} />}
                />
              ) : (
                <Route key={idx} path={r.path} element={r.element} />
              ),
            )}
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </RealtimeNotificationProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
