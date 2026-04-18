export type RequestType = 'CUU_TRO' | 'LUONG_THUC' | 'KHAC';
export type EvidenceType = 'IMAGE' | 'VIDEO';

export interface Evidence {
  type: EvidenceType;
  url: string;
  thumbnail?: string;
}

export interface RequestNotification {
  id: string;
  requesterName: string;
  requesterAvatar?: string;
  requestType: RequestType;
  description: string;
  location: string;
  evidences?: Evidence[];
  createdAt: string;
  unread: boolean;
  notificationId?: string;
  recipientId?: string;
  type?: number | string;
  title?: string;
  message?: string;
  referenceId?: string;
  referenceType?: string;
  metadataJson?: string | null;
  metadata?: Record<string, unknown> | null;
  attachmentCount?: number;
  thumbnailUrls?: string[];
  isRead?: boolean;
  readAt?: string | null;
  targetRequestId?: string;
}

export interface RealtimeTokenResponse {
  token: string;
  endpoint: string;
  channel: string;
  expiresAt?: string;
  userId?: string;
}

export interface NotificationListResponse {
  items: RequestNotification[];
  unreadCount: number;
}
