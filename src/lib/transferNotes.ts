import { formatNumberVN } from '@/lib/utils';

export type ParsedTransferNotes = {
  reason?: string;
  note?: string;
  approvalAmount?: string;
  approvalAmountInWords?: string;
  approver?: string;
  itemMetas?: Array<{
    key: string;
    supplyItemId: string;
    sourceReference?: string;
    totalAmount?: number;
    expiryDate?: string | null;
  }>;
  raw?: string;
};

export type TransferApprovalItemMeta = {
  key: string;
  supplyItemId: string;
  sourceReference?: string;
  totalAmount?: number;
  expiryDate?: string | null;
};

/**
 * Parse transfer notes supporting both legacy English keys and Vietnamese keys.
 */
export function parseTransferNotes(note?: string | null): ParsedTransferNotes {
  if (!note) return {};

  const parts = note
    .split('|')
    .map((part) => part.trim())
    .filter(Boolean);

  const parsed: ParsedTransferNotes = {};

  parts.forEach((part) => {
    if (/^Reason:/i.test(part) || /^Lý do:/i.test(part)) {
      parsed.reason = part
        .replace(/^Reason:/i, '')
        .replace(/^Lý do:/i, '')
        .trim();
      return;
    }
    if (/^Notes:/i.test(part) || /^Ghi chú:/i.test(part)) {
      parsed.note = part
        .replace(/^Notes:/i, '')
        .replace(/^Ghi chú:/i, '')
        .trim();
      return;
    }
    if (/^Approved$/i.test(part) || /^Đã phê duyệt$/i.test(part)) {
      return;
    }
    if (/^Amount:/i.test(part) || /^Số tiền:/i.test(part)) {
      parsed.approvalAmount = part
        .replace(/^Amount:/i, '')
        .replace(/^Số tiền:/i, '')
        .trim();
      return;
    }
    if (/^AmountInWords:/i.test(part) || /^Bằng chữ:/i.test(part)) {
      parsed.approvalAmountInWords = part
        .replace(/^AmountInWords:/i, '')
        .replace(/^Bằng chữ:/i, '')
        .trim();
      return;
    }
    if (/^Approver:/i.test(part) || /^Người phê duyệt:/i.test(part)) {
      parsed.approver = part
        .replace(/^Approver:/i, '')
        .replace(/^Người phê duyệt:/i, '')
        .trim();
      return;
    }
    if (/^ItemMeta:/i.test(part)) {
      const rawValue = part.replace(/^ItemMeta:/i, '').trim();
      if (!rawValue) return;
      try {
        const decoded = decodeURIComponent(rawValue);
        const parsedItems = JSON.parse(decoded);
        if (Array.isArray(parsedItems)) {
          parsed.itemMetas = parsedItems
            .filter((item) => item && typeof item === 'object')
            .map((item) => ({
              key: String(item.key || ''),
              supplyItemId: String(item.supplyItemId || ''),
              sourceReference:
                typeof item.sourceReference === 'string' ? item.sourceReference.trim() : undefined,
              totalAmount:
                item.totalAmount != null && Number.isFinite(Number(item.totalAmount))
                  ? Number(item.totalAmount)
                  : undefined,
              expiryDate:
                typeof item.expiryDate === 'string' || item.expiryDate == null
                  ? (item.expiryDate ?? null)
                  : null,
            }))
            .filter((item) => item.key && item.supplyItemId);
        }
      } catch {
        // Ignore malformed metadata to preserve backward compatibility
      }
      return;
    }
  });

  if (!parsed.reason && !parsed.note && !parsed.approvalAmount && !parsed.approver) {
    parsed.raw = note;
  }

  return parsed;
}

export function convertNumberToVietnameseWords(value: number): string {
  if (!Number.isFinite(value) || value < 0) return '';
  if (value === 0) return 'Không đồng';

  const digits = ['không', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'];
  const units = ['', ' nghìn', ' triệu', ' tỷ', ' nghìn tỷ', ' triệu tỷ'];

  const readTriple = (num: number, full: boolean) => {
    const hundred = Math.floor(num / 100);
    const ten = Math.floor((num % 100) / 10);
    const unit = num % 10;
    let result = '';

    if (full || hundred > 0) {
      result += `${digits[hundred]} trăm`;
      if (ten === 0 && unit > 0) result += ' lẻ';
    }

    if (ten > 1) {
      result += `${result ? ' ' : ''}${digits[ten]} mươi`;
      if (unit === 1) result += ' mốt';
      else if (unit === 5) result += ' lăm';
      else if (unit > 0) result += ` ${digits[unit]}`;
    } else if (ten === 1) {
      result += `${result ? ' ' : ''}mười`;
      if (unit === 5) result += ' lăm';
      else if (unit > 0) result += ` ${digits[unit]}`;
    } else if (unit > 0) {
      if (unit === 5 && result) result += ' lăm';
      else result += `${result ? ' ' : ''}${digits[unit]}`;
    }

    return result.trim();
  };

  const groups: number[] = [];
  let remaining = Math.floor(value);
  while (remaining > 0) {
    groups.push(remaining % 1000);
    remaining = Math.floor(remaining / 1000);
  }

  const parts: string[] = [];
  for (let i = groups.length - 1; i >= 0; i -= 1) {
    const group = groups[i];
    if (group === 0) continue;
    const full = i !== groups.length - 1;
    const text = readTriple(group, full);
    if (text) parts.push(`${text}${units[i]}`);
  }

  const sentence = parts.join(' ').replace(/\s+/g, ' ').trim();
  return sentence ? `${sentence.charAt(0).toUpperCase()}${sentence.slice(1)} đồng` : '';
}

export function formatTransferApprovalNotes(
  referenceAmount: number,
  approverName: string,
  itemMetas: TransferApprovalItemMeta[] = [],
): string {
  const parts = [
    'Đã phê duyệt',
    `Số tiền: ${formatNumberVN(referenceAmount)}`,
    `Bằng chữ: ${convertNumberToVietnameseWords(referenceAmount)}`,
    `Người phê duyệt: ${approverName.trim()}`,
  ];

  if (itemMetas.length > 0) {
    parts.push(`ItemMeta: ${encodeURIComponent(JSON.stringify(itemMetas))}`);
  }

  return parts.join(' | ');
}
