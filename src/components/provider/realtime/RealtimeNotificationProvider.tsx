import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { ReactNode } from 'react';
import { Centrifuge, type Subscription } from 'centrifuge';
import { toast } from 'sonner';
import { useAuthContext } from '../auth/AuthProvider';
import { notificationService, normalizeNotification } from '@/services/notificationService';
import type { RequestNotification, RealtimeTokenResponse } from '@/types/notifications';

export type RealtimeConnectionStatus =
  | 'idle'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'disconnected'
  | 'error';

interface RealtimeNotificationContextValue {
  notifications: RequestNotification[];
  unreadCount: number;
  latestNotification: RequestNotification | null;
  connectionStatus: RealtimeConnectionStatus;
  lastError: string | null;
  refreshNotifications: () => Promise<void>;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
}

const RealtimeNotificationContext = createContext<RealtimeNotificationContextValue | null>(null);

interface RealtimeNotificationProviderProps {
  children: ReactNode;
}

const sortNotifications = (items: RequestNotification[]) =>
  [...items].sort((left, right) => {
    const leftTime = new Date(left.createdAt).getTime();
    const rightTime = new Date(right.createdAt).getTime();
    return rightTime - leftTime;
  });

const dedupeNotifications = (items: RequestNotification[]) => {
  const map = new Map<string, RequestNotification>();
  for (const item of items) {
    map.set(item.notificationId ?? item.id, item);
  }
  return sortNotifications(Array.from(map.values()));
};

const getNotificationId = (item: RequestNotification) => item.notificationId ?? item.id;

export function RealtimeNotificationProvider({ children }: RealtimeNotificationProviderProps) {
  const auth = useAuthContext();
  const [notifications, setNotifications] = useState<RequestNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [connectionStatus, setConnectionStatus] = useState<RealtimeConnectionStatus>('idle');
  const [lastError, setLastError] = useState<string | null>(null);

  const centrifugeRef = useRef<Centrifuge | null>(null);
  const subscriptionRef = useRef<Subscription | null>(null);
  const channelRef = useRef<string | null>(null);
  const notificationsRef = useRef<RequestNotification[]>([]);
  const unreadCountRef = useRef(0);
  const mountedRef = useRef(true);

  const applySnapshot = useCallback((items: RequestNotification[], nextUnreadCount?: number) => {
    const normalizedItems = dedupeNotifications(items);
    notificationsRef.current = normalizedItems;
    setNotifications(normalizedItems);
    const resolvedUnreadCount =
      typeof nextUnreadCount === 'number'
        ? nextUnreadCount
        : normalizedItems.filter((item) => item.unread).length;
    unreadCountRef.current = resolvedUnreadCount;
    setUnreadCount(resolvedUnreadCount);
  }, []);

  const refreshNotifications = useCallback(async () => {
    try {
      const [notificationsResult, unreadResult] = await Promise.allSettled([
        notificationService.getNotifications(),
        notificationService.getUnreadCount(),
      ]);

      if (!mountedRef.current) return;

      let nextItems: RequestNotification[] = notificationsRef.current;
      let nextUnreadCount: number | undefined;

      if (notificationsResult.status === 'fulfilled') {
        nextItems = notificationsResult.value.items;
        nextUnreadCount = notificationsResult.value.unreadCount;
      }

      if (unreadResult.status === 'fulfilled') {
        nextUnreadCount = unreadResult.value;
      }

      applySnapshot(nextItems, nextUnreadCount);
    } catch (error) {
      console.error('Failed to refresh notifications', error);
      if (mountedRef.current) {
        setLastError(error instanceof Error ? error.message : 'Failed to refresh notifications');
      }
    }
  }, [applySnapshot]);

  const ensureConnection = useCallback(
    async (tokenResponse: RealtimeTokenResponse) => {
      if (!mountedRef.current) return;

      if (centrifugeRef.current) {
        centrifugeRef.current.disconnect();
        centrifugeRef.current = null;
      }
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
        subscriptionRef.current = null;
      }

      channelRef.current = tokenResponse.channel;

      const client = new Centrifuge(tokenResponse.endpoint, {
        token: tokenResponse.token,
        getToken: async () => {
          const nextTokenResponse = await notificationService.getRealtimeToken();
          channelRef.current = nextTokenResponse.channel;
          return nextTokenResponse.token;
        },
        debug: import.meta.env.DEV,
      });

      client.on('connecting', () => {
        if (!mountedRef.current) return;
        setConnectionStatus('connecting');
      });

      client.on('connected', () => {
        if (!mountedRef.current) return;
        setConnectionStatus('connected');
        setLastError(null);
        void refreshNotifications();
      });

      client.on('disconnected', () => {
        if (!mountedRef.current) return;
        setConnectionStatus('disconnected');
      });

      client.on('error', (ctx) => {
        if (!mountedRef.current) return;
        setConnectionStatus('error');
        setLastError(ctx.error?.message || 'Realtime connection error');
      });

      const subscription = client.newSubscription(tokenResponse.channel);

      subscription.on('subscribing', () => {
        if (!mountedRef.current) return;
        setConnectionStatus('reconnecting');
      });

      subscription.on('publication', (ctx) => {
        if (!mountedRef.current) return;

        const nextNotification = normalizeNotification(ctx.data);
        if (!nextNotification) return;

        setNotifications((prev) => {
          const nextId = getNotificationId(nextNotification);
          const existingIndex = prev.findIndex((item) => getNotificationId(item) === nextId);
          let next: RequestNotification[];

          if (existingIndex >= 0) {
            next = [...prev];
            next[existingIndex] = {
              ...next[existingIndex],
              ...nextNotification,
              unread: nextNotification.unread ?? next[existingIndex].unread,
            };
            next = dedupeNotifications(next);
          } else {
            next = dedupeNotifications([nextNotification, ...prev]);
          }

          notificationsRef.current = next;
          return next;
        });

        if (nextNotification.unread) {
          unreadCountRef.current += 1;
          setUnreadCount(unreadCountRef.current);
        }

        const title = nextNotification.title || 'Có thông báo mới';
        const message = nextNotification.message || nextNotification.description;
        toast(title, {
          description: message,
        });
      });

      subscription.subscribe();
      client.connect();

      centrifugeRef.current = client;
      subscriptionRef.current = subscription;
    },
    [refreshNotifications],
  );

  useEffect(() => {
    mountedRef.current = true;

    if (!auth.isAuthenticated || !auth.user) {
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
        subscriptionRef.current = null;
      }
      if (centrifugeRef.current) {
        centrifugeRef.current.disconnect();
        centrifugeRef.current = null;
      }
      channelRef.current = null;
      notificationsRef.current = [];
      unreadCountRef.current = 0;
      return () => {
        mountedRef.current = false;
      };
    }

    let cancelled = false;

    const bootstrap = async () => {
      try {
        setConnectionStatus('connecting');
        const tokenResponse = await notificationService.getRealtimeToken();
        if (cancelled || !mountedRef.current) return;

        await refreshNotifications();
        if (cancelled || !mountedRef.current) return;

        await ensureConnection(tokenResponse);
      } catch (error) {
        if (!mountedRef.current || cancelled) return;
        console.error('Failed to initialize realtime notifications', error);
        setConnectionStatus('error');
        setLastError(error instanceof Error ? error.message : 'Failed to initialize realtime');
      }
    };

    void bootstrap();

    return () => {
      cancelled = true;
      mountedRef.current = false;
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
        subscriptionRef.current = null;
      }
      if (centrifugeRef.current) {
        centrifugeRef.current.disconnect();
        centrifugeRef.current = null;
      }
      channelRef.current = null;
    };
  }, [auth.isAuthenticated, auth.user, ensureConnection, refreshNotifications]);

  const markAsRead = useCallback(
    async (notificationId: string) => {
      setNotifications((prev) => {
        const next = prev.map((item) =>
          getNotificationId(item) === notificationId
            ? { ...item, unread: false, isRead: true }
            : item,
        );
        notificationsRef.current = next;
        return next;
      });
      unreadCountRef.current = Math.max(unreadCountRef.current - 1, 0);
      setUnreadCount(unreadCountRef.current);

      try {
        await notificationService.markAsRead(notificationId);
      } catch (error) {
        console.error('Failed to mark notification as read', error);
        await refreshNotifications();
      }
    },
    [refreshNotifications],
  );

  const markAllAsRead = useCallback(async () => {
    setNotifications((prev) => {
      const next = prev.map((item) => ({ ...item, unread: false, isRead: true }));
      notificationsRef.current = next;
      return next;
    });
    unreadCountRef.current = 0;
    setUnreadCount(0);

    try {
      await notificationService.markAllAsRead();
    } catch (error) {
      console.error('Failed to mark all notifications as read', error);
      await refreshNotifications();
    }
  }, [refreshNotifications]);

  const value = useMemo<RealtimeNotificationContextValue>(
    () => ({
      notifications: auth.isAuthenticated && auth.user ? notifications : [],
      unreadCount: auth.isAuthenticated && auth.user ? unreadCount : 0,
      latestNotification: auth.isAuthenticated && auth.user ? (notifications[0] ?? null) : null,
      connectionStatus: auth.isAuthenticated && auth.user ? connectionStatus : 'idle',
      lastError: auth.isAuthenticated && auth.user ? lastError : null,
      refreshNotifications,
      markAsRead,
      markAllAsRead,
    }),
    [
      auth.isAuthenticated,
      auth.user,
      notifications,
      unreadCount,
      connectionStatus,
      lastError,
      refreshNotifications,
      markAsRead,
      markAllAsRead,
    ],
  );

  return (
    <RealtimeNotificationContext.Provider value={value}>
      {children}
    </RealtimeNotificationContext.Provider>
  );
}

export function useRealtimeNotifications() {
  const context = useContext(RealtimeNotificationContext);
  if (!context) {
    throw new Error('useRealtimeNotifications must be used within RealtimeNotificationProvider');
  }
  return context;
}
