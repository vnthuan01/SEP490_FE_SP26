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
import { useQueryClient } from '@tanstack/react-query';
import { NotificationType } from '@/enums/beEnums';
import { UserRole } from '@/enums/UserRole';
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
  markAsRead: typeof notificationService.markAsRead;
  markAllAsRead: typeof notificationService.markAllAsRead;
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

const resolveUnread = (item: RequestNotification) =>
  typeof item.unread === 'boolean'
    ? item.unread
    : typeof item.isRead === 'boolean'
      ? !item.isRead
      : false;

type NotificationTypeKey = keyof typeof NotificationType;

const RESCUE_NOTIFICATION_TYPES: NotificationTypeKey[] = [
  'RescueRequestCreated',
  'RescueRequestVerified',
  'RescueRequestAssigned',
  'RescueRequestInProgress',
  'RescueRequestCompleted',
  'RescueRequestCancelled',
];

const resolveNotificationTypeKey = (
  value: RequestNotification['type'],
): NotificationTypeKey | null => {
  if (value == null || value === '') return null;

  const entries = Object.entries(NotificationType) as [NotificationTypeKey, number][];
  if (typeof value === 'number') {
    return entries.find(([, numericValue]) => numericValue === value)?.[0] ?? null;
  }

  const normalized = String(value).trim();
  if (!normalized) return null;

  if (normalized in NotificationType) {
    return normalized as NotificationTypeKey;
  }

  const asNumber = Number(normalized);
  if (Number.isFinite(asNumber)) {
    return entries.find(([, numericValue]) => numericValue === asNumber)?.[0] ?? null;
  }

  return null;
};

const canUseRealtimeNotifications = (role: string | undefined) => {
  if (!role) return false;
  const normalizedRole = role.trim().toLowerCase();
  return (
    normalizedRole === UserRole.Coordinator.toLowerCase() ||
    normalizedRole === 'coordinator' ||
    normalizedRole === 'moderator'
  );
};

const normalizeRealtimeEndpoint = (rawEndpoint: string) => {
  const endpoint = rawEndpoint.trim();
  if (!endpoint) {
    throw new Error('Realtime endpoint is empty');
  }

  // Backend may return http(s) URL for Centrifugo. Convert it to ws(s) for browser client.
  if (endpoint.startsWith('http://') || endpoint.startsWith('https://')) {
    const url = new URL(endpoint);
    url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
    return url.toString();
  }

  if (endpoint.startsWith('ws://') || endpoint.startsWith('wss://')) {
    return endpoint;
  }

  // Support relative endpoint responses such as "/connection/websocket".
  if (endpoint.startsWith('/')) {
    const url = new URL(endpoint, window.location.origin);
    url.protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return url.toString();
  }

  throw new Error(
    `Invalid realtime endpoint scheme: "${endpoint}". Expected ws://, wss://, http://, https://, or relative path.`,
  );
};

const shouldStopRealtimeAfterRepeatedErrors = () =>
  import.meta.env.DEV && window.location.hostname === 'localhost';

export function RealtimeNotificationProvider({ children }: RealtimeNotificationProviderProps) {
  const auth = useAuthContext();
  const queryClient = useQueryClient();
  const isRealtimeEnabled = canUseRealtimeNotifications(auth.user?.role);
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
  const connectionErrorCountRef = useRef(0);
  const realtimeDisabledRef = useRef(false);

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

  const applyRealtimeSideEffects = useCallback(
    (notification: RequestNotification) => {
      const typeKey = resolveNotificationTypeKey(notification.type);
      if (!typeKey) return;

      if (RESCUE_NOTIFICATION_TYPES.includes(typeKey)) {
        void queryClient.invalidateQueries({
          predicate: (query) => {
            const [root, second] = query.queryKey;
            return (
              root === 'rescue-requests' ||
              root === 'rescue-request-management' ||
              (root === 'admin-dashboard' && second === 'rescue-requests')
            );
          },
        });
      }
    },
    [queryClient],
  );

  const disableRealtimeClient = useCallback((reason: string) => {
    if (subscriptionRef.current) {
      subscriptionRef.current.unsubscribe();
      subscriptionRef.current = null;
    }
    if (centrifugeRef.current) {
      centrifugeRef.current.disconnect();
      centrifugeRef.current = null;
    }

    realtimeDisabledRef.current = true;
    setConnectionStatus('error');
    setLastError(reason);
  }, []);

  const ensureConnection = useCallback(
    async (tokenResponse: RealtimeTokenResponse) => {
      if (!mountedRef.current) return;
      if (realtimeDisabledRef.current) return;

      if (centrifugeRef.current) {
        centrifugeRef.current.disconnect();
        centrifugeRef.current = null;
      }
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
        subscriptionRef.current = null;
      }

      channelRef.current = tokenResponse.channel;
      const websocketEndpoint = normalizeRealtimeEndpoint(tokenResponse.endpoint);

      const client = new Centrifuge(websocketEndpoint, {
        token: tokenResponse.token,
        getToken: async () => {
          const nextTokenResponse = await notificationService.getRealtimeToken();
          channelRef.current = nextTokenResponse.channel;
          return nextTokenResponse.token;
        },
        debug: false,
      });

      client.on('connecting', () => {
        if (!mountedRef.current) return;
        setConnectionStatus('connecting');
      });

      client.on('connected', () => {
        if (!mountedRef.current) return;
        connectionErrorCountRef.current = 0;
        setConnectionStatus('connected');
        setLastError(null);
        void refreshNotifications();
      });

      client.on('disconnected', () => {
        if (!mountedRef.current) return;
        setConnectionStatus('disconnected');
      });

      client.on('error', (ctx: { error?: { message?: string } }) => {
        if (!mountedRef.current) return;

        connectionErrorCountRef.current += 1;
        const errorMessage = ctx.error?.message || 'Realtime connection error';

        if (
          shouldStopRealtimeAfterRepeatedErrors() &&
          connectionErrorCountRef.current >= 3 &&
          !realtimeDisabledRef.current
        ) {
          disableRealtimeClient(
            `Realtime is temporarily disabled in local dev after repeated connection failures: ${errorMessage}`,
          );
          return;
        }

        setConnectionStatus('error');
        setLastError(errorMessage);
      });

      const subscription = client.newSubscription(tokenResponse.channel);

      subscription.on('subscribing', () => {
        if (!mountedRef.current) return;
        setConnectionStatus('reconnecting');
      });

      subscription.on('publication', (ctx: { data: unknown }) => {
        if (!mountedRef.current) return;

        const nextNotification = normalizeNotification(ctx.data);
        if (!nextNotification) return;

        const nextUnread = resolveUnread(nextNotification);
        let shouldIncreaseUnreadCount = false;

        setNotifications((prev) => {
          const nextId = getNotificationId(nextNotification);
          const existingIndex = prev.findIndex((item) => getNotificationId(item) === nextId);
          let next: RequestNotification[];

          if (existingIndex >= 0) {
            const existingUnread = resolveUnread(prev[existingIndex]);
            next = [...prev];
            next[existingIndex] = {
              ...next[existingIndex],
              ...nextNotification,
              unread: nextNotification.unread ?? next[existingIndex].unread,
            };
            const mergedUnread = resolveUnread(next[existingIndex]);
            shouldIncreaseUnreadCount = !existingUnread && mergedUnread;
            next = dedupeNotifications(next);
          } else {
            shouldIncreaseUnreadCount = nextUnread;
            next = dedupeNotifications([nextNotification, ...prev]);
          }

          notificationsRef.current = next;
          return next;
        });

        if (shouldIncreaseUnreadCount) {
          unreadCountRef.current += 1;
          setUnreadCount(unreadCountRef.current);
        }

        applyRealtimeSideEffects(nextNotification);

        const title = nextNotification.title || 'Có thông báo mới';
        const message = nextNotification.message || nextNotification.description;
        const typeKey = resolveNotificationTypeKey(nextNotification.type);

        if (typeKey === 'RescueRequestInProgress') {
          toast.warning(title, {
            description: message,
            duration: 6000,
          });
          return;
        }

        toast(title, {
          description: message,
        });
      });

      subscription.subscribe();
      client.connect();

      centrifugeRef.current = client;
      subscriptionRef.current = subscription;
    },
    [applyRealtimeSideEffects, disableRealtimeClient, refreshNotifications],
  );

  useEffect(() => {
    mountedRef.current = true;

    if (!auth.isAuthenticated || !auth.user || !isRealtimeEnabled) {
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
      connectionErrorCountRef.current = 0;
      realtimeDisabledRef.current = false;
      return () => {
        mountedRef.current = false;
      };
    }

    let cancelled = false;

    const bootstrap = async () => {
      try {
        connectionErrorCountRef.current = 0;
        realtimeDisabledRef.current = false;
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
  }, [auth.isAuthenticated, auth.user, isRealtimeEnabled, ensureConnection, refreshNotifications]);

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
      notifications: auth.isAuthenticated && auth.user && isRealtimeEnabled ? notifications : [],
      unreadCount: auth.isAuthenticated && auth.user && isRealtimeEnabled ? unreadCount : 0,
      latestNotification:
        auth.isAuthenticated && auth.user && isRealtimeEnabled ? (notifications[0] ?? null) : null,
      connectionStatus:
        auth.isAuthenticated && auth.user && isRealtimeEnabled ? connectionStatus : 'idle',
      lastError: auth.isAuthenticated && auth.user && isRealtimeEnabled ? lastError : null,
      refreshNotifications,
      markAsRead,
      markAllAsRead,
    }),
    [
      auth.isAuthenticated,
      auth.user,
      isRealtimeEnabled,
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
