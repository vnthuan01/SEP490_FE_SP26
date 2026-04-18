import React from 'react';
import type { Evidence, RequestNotification, RequestType } from '@/types/notifications';
import { NotificationTypeLabel } from '@/enums/beEnums';
import { cn } from '@/lib/utils';

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

const getNotificationDisplayCopy = (item: RequestNotification) => {
  const typeLabel = getNotificationTypeLabel(item.type);
  const genericTitle = 'Yêu cầu cứu hộ mới';
  const genericMessage = 'Bạn vừa có một yêu cầu cứu hộ mới cần xử lý.';

  return {
    title: item.referenceId ? genericTitle : item.title || item.requesterName || genericTitle,
    message: item.referenceId ? genericMessage : item.message || item.description || genericMessage,
    typeLabel,
  };
};

const Notification: React.FC<Props> = ({ data, onClickItem, onMarkAllRead }) => {
  return (
    <div className="w-[440px] overflow-hidden rounded-3xl border border-white/20 bg-white/90 shadow-[0_24px_80px_rgba(15,23,42,0.22)] backdrop-blur-2xl dark:border-white/10 dark:bg-slate-950/85">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border/60 bg-gradient-to-r from-sky-500/10 via-background/60 to-indigo-500/10 px-5 py-4">
        <div>
          <h3 className="text-lg font-bold text-foreground">Thông báo</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Cập nhật yêu cầu mới cần bạn xử lý ngay.
          </p>
        </div>

        <button
          onClick={onMarkAllRead}
          className="inline-flex h-9 items-center rounded-full border border-border/70 bg-background/80 px-3 text-sm font-medium text-muted-foreground transition hover:border-primary/30 hover:bg-primary/5 hover:text-primary"
        >
          Đánh dấu đã đọc
        </button>
      </div>

      {/* List */}
      <div className="max-h-[560px] space-y-2 overflow-y-auto bg-gradient-to-b from-transparent to-slate-500/5 p-3">
        {data.length === 0 && (
          <p className="rounded-2xl border border-dashed border-border bg-background/70 p-6 text-center text-sm text-muted-foreground">
            Không có thông báo
          </p>
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
  const { title, message, typeLabel } = getNotificationDisplayCopy(item);
  const thumbnailUrls = (item.thumbnailUrls || []).filter((url) => !!url).slice(0, 3);
  const metaText = [typeLabel, item.location].filter(Boolean).join(' · ');

  return (
    <div
      onClick={() => onClick?.({ ...item, id: notificationId })}
      className={cn(
        'group relative flex cursor-pointer items-start gap-3 overflow-hidden rounded-2xl border px-4 py-4 transition-all',
        isUnread
          ? 'border-sky-200/70 bg-gradient-to-r from-sky-500/10 via-background to-indigo-500/5 shadow-[0_10px_30px_rgba(14,165,233,0.12)]'
          : 'border-border/70 bg-background/75 hover:border-primary/20 hover:bg-accent/50',
      )}
    >
      {isUnread && (
        <span className="absolute inset-y-3 left-0 w-1 rounded-full bg-gradient-to-b from-sky-500 to-indigo-500" />
      )}

      {/* Unread dot */}
      {isUnread && (
        <span className="mt-2 h-2.5 w-2.5 shrink-0 rounded-full bg-sky-500 shadow-[0_0_0_4px_rgba(14,165,233,0.15)]" />
      )}

      {/* Avatar */}
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-sky-200/70 bg-gradient-to-br from-sky-500/15 to-indigo-500/10 text-sm font-semibold text-sky-700 dark:border-sky-400/20 dark:text-sky-300">
        {(title || 'N').trim().charAt(0).toUpperCase()}
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1 text-sm">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <p className="truncate font-semibold text-foreground">{title}</p>
          {item.requestType ? (
            <span
              className={cn(
                'inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset',
                TYPE_COLOR[item.requestType],
                item.requestType === 'CUU_TRO' && 'bg-red-500/10 ring-red-500/20',
                item.requestType === 'LUONG_THUC' && 'bg-emerald-500/10 ring-emerald-500/20',
                item.requestType === 'KHAC' && 'bg-primary/10 ring-primary/20',
              )}
            >
              {TYPE_LABEL[item.requestType]}
            </span>
          ) : null}
        </div>

        <p className="mt-1 line-clamp-2 break-words text-muted-foreground">{message}</p>

        <p className="mt-2 truncate text-xs text-muted-foreground">{metaText || item.createdAt}</p>

        {item.evidences && item.evidences.length > 0 && (
          <div className="mt-3 flex gap-2 overflow-hidden">
            {item.evidences.slice(0, 3).map((ev, idx) => (
              <EvidencePreview key={idx} evidence={ev} />
            ))}
          </div>
        )}

        {(!item.evidences || item.evidences.length === 0) && thumbnailUrls.length > 0 && (
          <div className="mt-3 flex gap-2 overflow-hidden">
            {thumbnailUrls.map((url, idx) => (
              <img
                key={`${notificationId}-${idx}`}
                src={url}
                alt="notification thumbnail"
                className="h-14 w-14 rounded-xl border object-cover"
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
      <div className="relative h-14 w-14 overflow-hidden rounded-xl border bg-muted">
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
      className="h-14 w-14 rounded-xl border object-cover"
    />
  );
};
