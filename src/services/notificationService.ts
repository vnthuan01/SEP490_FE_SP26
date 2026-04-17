import { apiClient } from '@/lib/apiClients';
import type {
  NotificationListResponse,
  RealtimeTokenResponse,
  RequestNotification,
} from '@/types/notifications';

const REALTIME_WS_ENDPOINT =
  typeof import.meta.env.VITE_REALTIME_WS_ENDPOINT === 'string'
    ? import.meta.env.VITE_REALTIME_WS_ENDPOINT.trim()
    : '';

const unwrapData = <T>(payload: unknown): T => {
  if (payload && typeof payload === 'object' && 'data' in payload) {
    return ((payload as { data?: T }).data ?? payload) as T;
  }
  return payload as T;
};

const toNumber = (value: unknown, fallback = 0) => {
  const next = Number(value);
  return Number.isFinite(next) ? next : fallback;
};

const toString = (value: unknown) => {
  if (typeof value === 'string') return value;
  if (value == null) return '';
  return String(value);
};

const parseMetadata = (source: Record<string, unknown>) => {
  if (source.metadata && typeof source.metadata === 'object') {
    return source.metadata as Record<string, unknown>;
  }

  if (typeof source.metadataJson === 'string') {
    try {
      const parsed = JSON.parse(source.metadataJson);
      if (parsed && typeof parsed === 'object') {
        return parsed as Record<string, unknown>;
      }
    } catch {
      // Ignore malformed metadataJson and continue with null metadata.
    }
  }

  return null;
};

const getThumbnailUrls = (
  source: Record<string, unknown>,
  metadata: Record<string, unknown> | null,
) => {
  const fromTopLevel = Array.isArray(source.thumbnailUrls)
    ? source.thumbnailUrls
    : Array.isArray(source.thumbnail_urls)
      ? source.thumbnail_urls
      : null;

  const fromMetadata =
    metadata && Array.isArray(metadata.thumbnailUrls) ? metadata.thumbnailUrls : null;
  const fromMetadataSnakeCase =
    metadata && Array.isArray(metadata.thumbnail_urls) ? metadata.thumbnail_urls : null;

  const candidate = fromTopLevel ?? fromMetadata ?? fromMetadataSnakeCase ?? [];

  return candidate.filter((item): item is string => typeof item === 'string' && item.length > 0);
};

export const normalizeNotification = (payload: unknown): RequestNotification | null => {
  if (!payload || typeof payload !== 'object') return null;

  const source = unwrapData<Record<string, unknown>>(payload);
  const metadata = parseMetadata(source);
  const thumbnailUrls = getThumbnailUrls(source, metadata);
  const id = toString(
    source.notificationId ?? source.id ?? source.referenceId ?? source.reference_id ?? '',
  );

  if (!id) return null;

  const isReadValue = source.isRead;
  const unreadValue = source.unread;
  const createdAt = toString(source.createdAt ?? source.created_at ?? new Date().toISOString());
  const typeValue = source.type ?? source.notificationType;

  return {
    id,
    notificationId: id,
    recipientId: toString(source.recipientId ?? source.recipient_id ?? ''),
    type: typeValue as number | string | undefined,
    title: toString(source.title ?? source.subject ?? ''),
    message: toString(source.message ?? source.content ?? ''),
    referenceId: toString(source.referenceId ?? source.reference_id ?? ''),
    referenceType: toString(source.referenceType ?? source.reference_type ?? ''),
    metadataJson: (source.metadataJson as string | null | undefined) ?? null,
    metadata,
    attachmentCount: toNumber(source.attachmentCount ?? source.attachment_count, 0),
    thumbnailUrls,
    isRead:
      typeof isReadValue === 'boolean'
        ? isReadValue
        : typeof unreadValue === 'boolean'
          ? !unreadValue
          : false,
    readAt: (source.readAt as string | null | undefined) ?? null,
    requesterName: toString(
      source.requesterName ?? source.senderName ?? source.title ?? source.message ?? 'Thông báo',
    ),
    requesterAvatar: toString(source.requesterAvatar ?? source.senderAvatar ?? ''),
    requestType: (source.requestType as any) ?? 'KHAC',
    description: toString(source.description ?? source.message ?? ''),
    location: toString(source.location ?? source.referenceType ?? ''),
    evidences: Array.isArray(source.evidences)
      ? (source.evidences as RequestNotification['evidences'])
      : undefined,
    createdAt,
    unread:
      typeof unreadValue === 'boolean'
        ? unreadValue
        : typeof isReadValue === 'boolean'
          ? !isReadValue
          : false,
  };
};

const normalizeNotificationList = (payload: unknown): NotificationListResponse => {
  const source = unwrapData<
    Partial<NotificationListResponse> & {
      items?: RequestNotification[];
      unreadCount?: number;
      unread_count?: number;
      totalUnreadCount?: number;
    }
  >(payload);

  const items = Array.isArray(source.items)
    ? source.items
        .map((item) => normalizeNotification(item))
        .filter((item): item is RequestNotification => item !== null)
    : [];

  return {
    items,
    unreadCount: toNumber(source.unreadCount ?? source.unread_count ?? source.totalUnreadCount, 0),
  };
};

export const notificationService = {
  getRealtimeToken: async (): Promise<RealtimeTokenResponse> => {
    const response = await apiClient.get('/realtime/token');
    const tokenPayload = unwrapData<RealtimeTokenResponse>(response.data);

    if (REALTIME_WS_ENDPOINT) {
      return {
        ...tokenPayload,
        endpoint: REALTIME_WS_ENDPOINT,
      };
    }

    return tokenPayload;
  },

  getNotifications: async (): Promise<NotificationListResponse> => {
    const response = await apiClient.get('/notifications');
    return normalizeNotificationList(response.data);
  },

  getUnreadCount: async (): Promise<number> => {
    const response = await apiClient.get('/notifications/unread-count');
    const payload = unwrapData<{ unreadCount?: number; unread_count?: number; count?: number }>(
      response.data,
    );
    return toNumber(payload.unreadCount ?? payload.unread_count ?? payload.count, 0);
  },

  markAsRead: async (notificationId: string): Promise<void> => {
    await apiClient.patch(`/notifications/${notificationId}/read`);
  },

  markAllAsRead: async (): Promise<void> => {
    await apiClient.patch('/notifications/read-all');
  },
};
