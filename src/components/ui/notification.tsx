import React from 'react';
import type { Evidence, RequestNotification, RequestType } from '@/types/notifications';
import { NotificationTypeLabel } from '@/enums/beEnums';

interface Props {
  data: RequestNotification[];
  onClickItem?: (item: RequestNotification) => void;
  onMarkAllRead?: () => void;
}

const TYPE_COLOR: Record<RequestType, string> = {
  CUU_TRO: 'text-red-500',
  LUONG_THUC: 'text-emerald-500',
  KHAC: 'text-primary',
};

const TYPE_LABEL: Record<RequestType, string> = {
  CUU_TRO: 'Cứu trợ',
  LUONG_THUC: 'Lương thực',
  KHAC: 'Khác',
};

const getNotificationTypeLabel = (value?: number | string) => {
  const labelMap = NotificationTypeLabel as unknown as Record<string, string>;

  if (value == null || value === '') return '';
  if (typeof value === 'number' && value in labelMap) {
    return labelMap[String(value)];
  }

  const normalized = String(value).trim();
  const numeric = Number(normalized);
  if (Number.isFinite(numeric) && String(numeric) in labelMap) {
    return labelMap[String(numeric)];
  }

  return labelMap[normalized] || normalized;
};

const Notification: React.FC<Props> = ({ data, onClickItem, onMarkAllRead }) => {
  return (
    <div className="w-[420px] rounded-xl border bg-background shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <h3 className="font-semibold text-lg text-foreground">Thông báo</h3>

        <button
          onClick={onMarkAllRead}
          className="text-sm text-muted-foreground hover:text-primary transition"
        >
          Đánh dấu đã đọc
        </button>
      </div>

      {/* List */}
      <div className="divide-y max-h-[520px] overflow-y-auto">
        {data.length === 0 && (
          <p className="p-6 text-sm text-muted-foreground text-center">Không có thông báo</p>
        )}

        {data.map((item) => (
          <NotificationItem key={item.id} item={item} onClick={onClickItem} />
        ))}
      </div>
    </div>
  );
};

export default Notification;

interface ItemProps {
  item: RequestNotification;
  onClick?: (item: RequestNotification) => void;
}

const NotificationItem: React.FC<ItemProps> = ({ item, onClick }) => {
  const notificationId = item.notificationId || item.id;
  const isUnread = item.isRead !== undefined ? !item.isRead : item.unread;
  const typeLabel = getNotificationTypeLabel(item.type);
  const title = item.title || item.requesterName;
  const message = item.message || item.description;
  const thumbnailUrls = (item.thumbnailUrls || []).filter((url) => !!url).slice(0, 3);
  const metaText = [
    typeLabel,
    item.location,
    item.referenceId ? `#${item.referenceId.slice(0, 8)}` : '',
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <div
      onClick={() => onClick?.({ ...item, id: notificationId })}
      className={`
        flex gap-3 px-4 py-3 cursor-pointer transition
        hover:bg-muted/40
        ${isUnread ? 'bg-muted/30' : ''}
      `}
    >
      {/* Unread dot */}
      {isUnread && <span className="mt-2 w-2 h-2 rounded-full bg-primary shrink-0" />}

      {/* Avatar */}
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border bg-muted text-sm font-semibold text-primary">
        {(title || 'N').trim().charAt(0).toUpperCase()}
      </div>

      {/* Content */}
      <div className="flex-1 text-sm">
        <p className="text-foreground">
          <strong>{title}</strong>{' '}
          {item.requestType ? (
            <span className={TYPE_COLOR[item.requestType]}>{TYPE_LABEL[item.requestType]}</span>
          ) : null}
        </p>

        <p className="text-muted-foreground mt-0.5 line-clamp-2">{message}</p>

        <p className="text-xs text-muted-foreground mt-1">{metaText || item.createdAt}</p>

        {item.evidences && item.evidences.length > 0 && (
          <div className="flex gap-2 mt-2">
            {item.evidences.slice(0, 3).map((ev, idx) => (
              <EvidencePreview key={idx} evidence={ev} />
            ))}
          </div>
        )}

        {(!item.evidences || item.evidences.length === 0) && thumbnailUrls.length > 0 && (
          <div className="flex gap-2 mt-2">
            {thumbnailUrls.map((url, idx) => (
              <img
                key={`${notificationId}-${idx}`}
                src={url}
                alt="notification thumbnail"
                className="w-16 h-16 rounded-md object-cover border"
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

interface EvidenceProps {
  evidence: Evidence;
}

const EvidencePreview: React.FC<EvidenceProps> = ({ evidence }) => {
  if (evidence.type === 'VIDEO') {
    return (
      <div className="relative w-16 h-16 rounded-md overflow-hidden border bg-muted">
        <img src={evidence.thumbnail} alt="video evidence" className="w-full h-full object-cover" />
        <span className="absolute inset-0 flex items-center justify-center text-white text-xl">
          ▶
        </span>
      </div>
    );
  }

  return (
    <img
      src={evidence.url}
      alt="image evidence"
      className="w-16 h-16 rounded-md object-cover border"
    />
  );
};
