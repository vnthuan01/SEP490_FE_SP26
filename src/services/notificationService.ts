import { apiClient } from '@/lib/apiClients';
import type {
  NotificationListResponse,
  RealtimeTokenResponse,
  RequestType,
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

const pickFirstDefined = (...values: unknown[]) => {
  for (const value of values) {
    if (value !== undefined && value !== null && value !== '') return value;
  }
  return undefined;
};

const extractNotificationArray = (payload: unknown, depth = 0): unknown[] => {
  if (depth > 4 || payload == null) return [];
  if (Array.isArray(payload)) return payload;
  if (typeof payload !== 'object') return [];

  const source = payload as Record<string, unknown>;

  const direct = pickFirstDefined(
    source.items,
    source.Items,
    source.notifications,
    source.Notifications,
    source.results,
    source.Results,
    source.data,
    source.Data,
  );

  if (Array.isArray(direct)) return direct;
  if (direct && typeof direct === 'object') {
    const nested = extractNotificationArray(direct, depth + 1);
    if (nested.length > 0) return nested;
  }

  for (const value of Object.values(source)) {
    if (Array.isArray(value)) return value;
  }

  return [];
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

const toRequestType = (value: unknown): RequestType | null => {
  const normalized = String(value ?? '')
    .trim()
    .toUpperCase();
  if (!normalized) return null;
  if (normalized === 'CUU_TRO' || normalized === 'RESCUE') return 'CUU_TRO';
  if (normalized === 'LUONG_THUC' || normalized === 'RELIEF') return 'LUONG_THUC';
  if (normalized === 'KHAC' || normalized === 'OTHER') return 'KHAC';
  return null;
};

const inferRequestType = (referenceType: unknown, notificationType: unknown): RequestType => {
  const ref = String(referenceType ?? '')
    .trim()
    .toLowerCase();
  const typ = String(notificationType ?? '')
    .trim()
    .toLowerCase();

  if (ref.includes('rescuerequest') || typ.includes('rescuerequest') || typ.includes('rescue')) {
    return 'CUU_TRO';
  }

  if (ref.includes('reliefrequest') || typ.includes('reliefrequest') || typ.includes('relief')) {
    return 'LUONG_THUC';
  }

  const typeNumber = Number(notificationType);
  if (Number.isFinite(typeNumber)) {
    if (typeNumber >= 1 && typeNumber <= 6) return 'CUU_TRO';
    if (typeNumber >= 11 && typeNumber <= 17) return 'LUONG_THUC';
  }

  return 'KHAC';
};

export const normalizeNotification = (payload: unknown): RequestNotification | null => {
  if (!payload || typeof payload !== 'object') return null;

  const unwrapped = unwrapData<Record<string, unknown>>(payload);
  const sourceCandidate =
    (unwrapped.notification as Record<string, unknown> | undefined) ??
    (unwrapped.payload as Record<string, unknown> | undefined) ??
    unwrapped;
  const source = unwrapData<Record<string, unknown>>(sourceCandidate);
  const metadata = parseMetadata(source);
  const thumbnailUrls = getThumbnailUrls(source, metadata);
  const id = toString(
    pickFirstDefined(
      source.notificationId,
      source.NotificationId,
      source.id,
      source.Id,
      source.referenceId,
      source.ReferenceId,
      source.reference_id,
      source.referenceID,
      source.ReferenceID,
      source.eventId,
      source.EventId,
      '',
    ),
  );

  if (!id) return null;

  const isReadValue = pickFirstDefined(source.isRead, source.IsRead);
  const unreadValue = pickFirstDefined(source.unread, source.Unread);
  const createdAt = toString(
    pickFirstDefined(
      source.createdAt,
      source.CreatedAt,
      source.created_at,
      new Date().toISOString(),
    ),
  );
  const typeValue = pickFirstDefined(
    source.type,
    source.Type,
    source.notificationType,
    source.NotificationType,
  );
  const referenceTypeValue = pickFirstDefined(
    source.referenceType,
    source.ReferenceType,
    source.reference_type,
    '',
  );
  const requestTypeValue =
    toRequestType(pickFirstDefined(source.requestType, source.RequestType)) ??
    inferRequestType(referenceTypeValue, typeValue);

  return {
    id,
    notificationId: id,
    recipientId: toString(
      pickFirstDefined(source.recipientId, source.RecipientId, source.recipient_id, ''),
    ),
    type: typeValue as number | string | undefined,
    title: toString(
      pickFirstDefined(source.title, source.Title, source.subject, source.Subject, ''),
    ),
    message: toString(
      pickFirstDefined(source.message, source.Message, source.content, source.Content, ''),
    ),
    referenceId: toString(
      pickFirstDefined(source.referenceId, source.ReferenceId, source.reference_id, ''),
    ),
    referenceType: toString(referenceTypeValue),
    metadataJson:
      (pickFirstDefined(source.metadataJson, source.MetadataJson) as string | null | undefined) ??
      null,
    metadata,
    attachmentCount: toNumber(
      pickFirstDefined(source.attachmentCount, source.AttachmentCount, source.attachment_count),
      0,
    ),
    thumbnailUrls,
    isRead:
      typeof isReadValue === 'boolean'
        ? isReadValue
        : typeof unreadValue === 'boolean'
          ? !unreadValue
          : false,
    readAt: (pickFirstDefined(source.readAt, source.ReadAt) as string | null | undefined) ?? null,
    requesterName: toString(
      pickFirstDefined(
        source.requesterName,
        source.RequesterName,
        source.senderName,
        source.SenderName,
        source.title,
        source.Title,
        source.message,
        source.Message,
        'Thông báo',
      ),
    ),
    requesterAvatar: toString(
      pickFirstDefined(
        source.requesterAvatar,
        source.RequesterAvatar,
        source.senderAvatar,
        source.SenderAvatar,
        '',
      ),
    ),
    requestType: requestTypeValue,
    description: toString(
      pickFirstDefined(source.description, source.Description, source.message, source.Message, ''),
    ),
    location: toString(
      pickFirstDefined(
        source.location,
        source.Location,
        source.referenceType,
        source.ReferenceType,
        '',
      ),
    ),
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
  const rawItems = extractNotificationArray(payload);

  if (rawItems.length > 0) {
    const items = rawItems
      .map((item) => normalizeNotification(item))
      .filter((item): item is RequestNotification => item !== null);

    const wrapper =
      typeof payload === 'object' && payload !== null
        ? (unwrapData<Record<string, unknown>>(payload) as Record<string, unknown>)
        : {};
    const unreadCount = toNumber(
      pickFirstDefined(
        (wrapper as any).unreadCount,
        (wrapper as any).UnreadCount,
        (wrapper as any).unread_count,
        (wrapper as any).totalUnreadCount,
        (wrapper as any).TotalUnreadCount,
      ),
      items.filter((item) => item.unread).length,
    );

    return { items, unreadCount };
  }

  const source = unwrapData<
    Partial<NotificationListResponse> & {
      items?: RequestNotification[];
      Items?: RequestNotification[];
      data?: RequestNotification[];
      Data?: RequestNotification[];
      notifications?: RequestNotification[];
      Notifications?: RequestNotification[];
      results?: RequestNotification[];
      Results?: RequestNotification[];
      unreadCount?: number;
      UnreadCount?: number;
      unread_count?: number;
      totalUnreadCount?: number;
      TotalUnreadCount?: number;
    }
  >(payload);

  const items = Array.isArray(source.items)
    ? source.items
        .map((item) => normalizeNotification(item))
        .filter((item): item is RequestNotification => item !== null)
    : Array.isArray(source.Items)
      ? source.Items.map((item) => normalizeNotification(item)).filter(
          (item): item is RequestNotification => item !== null,
        )
      : Array.isArray(source.data)
        ? source.data
            .map((item) => normalizeNotification(item))
            .filter((item): item is RequestNotification => item !== null)
        : Array.isArray(source.Data)
          ? source.Data.map((item) => normalizeNotification(item)).filter(
              (item): item is RequestNotification => item !== null,
            )
          : Array.isArray(source.notifications)
            ? source.notifications
                .map((item) => normalizeNotification(item))
                .filter((item): item is RequestNotification => item !== null)
            : Array.isArray(source.Notifications)
              ? source.Notifications.map((item) => normalizeNotification(item)).filter(
                  (item): item is RequestNotification => item !== null,
                )
              : Array.isArray(source.results)
                ? source.results
                    .map((item) => normalizeNotification(item))
                    .filter((item): item is RequestNotification => item !== null)
                : Array.isArray(source.Results)
                  ? source.Results.map((item) => normalizeNotification(item)).filter(
                      (item): item is RequestNotification => item !== null,
                    )
                  : [];

  return {
    items,
    unreadCount: toNumber(
      source.unreadCount ??
        source.UnreadCount ??
        source.unread_count ??
        source.totalUnreadCount ??
        source.TotalUnreadCount,
      0,
    ),
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

  getNotifications: async (pageNumber = 1, pageSize = 20): Promise<NotificationListResponse> => {
    const response = await apiClient.get('/notifications', {
      params: {
        pageNumber,
        pageSize,
      },
    });
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
