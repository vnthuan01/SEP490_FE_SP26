import { BACKEND_ERROR_CODE_MAP } from './backendErrors/codes.vi';
import { BACKEND_STATUS_FALLBACK_MAP, GENERIC_BACKEND_MESSAGES } from './backendErrors/status.vi';
import { BACKEND_LITERAL_MESSAGE_MAP } from './backendErrors/literals.vi';

export type ApiFieldErrors = Record<string, string[]>;

export type ParsedApiError = {
  message: string;
  fieldErrors: ApiFieldErrors;
};

const FIELD_LABELS: Record<string, string> = {
  name: 'tên',
  description: 'mô tả',
  locationid: 'khu vực điểm phát',
  managerid: 'người quản lý',
  moderatoruserid: 'điều phối viên phụ trách',
  teamid: 'đội',
  status: 'trạng thái',
  rejectionreason: 'lý do từ chối',
  address: 'địa chỉ',
  startsat: 'thời gian bắt đầu',
  endsat: 'thời gian kết thúc',
  coverageradiuskm: 'bán kính khu vực phụ trách',
  outputsupplyitemid: 'vật phẩm đầu ra',
  items: 'danh sách thành phần',
  supplyitemid: 'vật phẩm',
  quantity: 'số lượng',
  unit: 'đơn vị',
  gender: 'giới tính',
  dateofbirth: 'ngày sinh',
};

const localizeFieldName = (fieldName: string) => FIELD_LABELS[fieldName.toLowerCase()] || fieldName;

const translateRegexPatterns = (message: string) => {
  for (const [pattern, replacement] of BACKEND_LITERAL_MESSAGE_MAP) {
    if (pattern.test(message)) return message.replace(pattern, replacement);
  }

  const requiredMatch = message.match(/^The (.+) field is required\.?$/i);
  if (requiredMatch) {
    return `Vui lòng nhập ${localizeFieldName(requiredMatch[1])}.`;
  }

  const notFoundQuotedMatch = message.match(/^(.+?)\s+'([^']+)'\s+was not found\.?$/i);
  if (notFoundQuotedMatch) {
    const entity = notFoundQuotedMatch[1].toLowerCase();
    const entityMap: Record<string, string> = {
      campaign: 'chiến dịch',
      inventory: 'kho',
      'relief station': 'trạm cứu trợ',
      'distribution point': 'điểm phát',
      'relief package definition': 'gói cứu trợ',
      'household delivery': 'lượt phát quà',
      'campaign household': 'hộ dân trong chiến dịch',
      'campaign team': 'đội trong chiến dịch',
      'supply shortage request': 'yêu cầu thiếu hụt',
      'supply transfer': 'phiếu điều chuyển',
      'supply item': 'vật phẩm',
      transaction: 'giao dịch kho',
      'stock entry': 'bản ghi tồn kho',
      team: 'đội',
      notification: 'thông báo',
      donation: 'khoản quyên góp',
    };
    const entityLabel = entityMap[entity] || entity;
    return `Không tìm thấy ${entityLabel} với mã: ${notFoundQuotedMatch[2]}.`;
  }

  if (/^Household code '(.+)' already exists in campaign\.?$/i.test(message)) {
    return message.replace(
      /^Household code '(.+)' already exists in campaign\.?$/i,
      'Mã hộ dân $1 đã tồn tại trong chiến dịch.',
    );
  }

  if (/^Duplicate supply items in request:\s*.+$/i.test(message)) {
    return 'Một vật phẩm đang bị lặp lại nhiều lần trong danh sách gửi lên. Mỗi vật phẩm chỉ nên xuất hiện một lần.';
  }

  if (/^Duplicate supply items in package:\s*.+$/i.test(message)) {
    return 'Một vật phẩm đang bị lặp lại nhiều lần trong gói cứu trợ. Mỗi vật phẩm chỉ nên xuất hiện một lần.';
  }

  return message
    .replace(
      /^One or more validation errors occurred\.?$/i,
      'Có lỗi dữ liệu cần được kiểm tra lại.',
    )
    .replace(/The /g, '')
    .replace(/ field is required\.?/gi, ' là thông tin bắt buộc.')
    .replace(/must not be empty\.?/gi, 'không được để trống.')
    .replace(/invalid/gi, 'không hợp lệ');
};

const localizeMessage = (message: string) => {
  const normalized = message.trim();
  if (!normalized) return '';
  return translateRegexPatterns(normalized).trim();
};

const getStatusFallback = (status?: number, fallbackMessage?: string) => {
  if (typeof status === 'number' && BACKEND_STATUS_FALLBACK_MAP[status]) {
    return BACKEND_STATUS_FALLBACK_MAP[status];
  }
  return fallbackMessage || 'Đã xảy ra lỗi trong quá trình xử lý.';
};

export function parseApiError(error: unknown, fallbackMessage: string): ParsedApiError {
  const axiosLikeError = error as any;
  const responseData = axiosLikeError?.response?.data;
  const statusCode = axiosLikeError?.response?.status ?? responseData?.statusCode;
  const plainBody = typeof responseData === 'string' ? responseData : '';
  const code = responseData?.code ? String(responseData.code) : '';

  const fieldErrors =
    responseData &&
    typeof responseData === 'object' &&
    responseData.errors &&
    typeof responseData.errors === 'object'
      ? (responseData.errors as ApiFieldErrors)
      : {};

  const firstFieldMessage = Object.values(fieldErrors).flat().find(Boolean) || '';
  const fromCode = code ? BACKEND_ERROR_CODE_MAP[code] || '' : '';

  const rawMessage = responseData?.message || '';
  const rawDetail = responseData?.detail || '';
  const shouldPreferDetail = GENERIC_BACKEND_MESSAGES.has(String(rawMessage).trim()) && !!rawDetail;

  const message =
    localizeMessage(firstFieldMessage) ||
    localizeMessage(fromCode) ||
    localizeMessage(plainBody) ||
    localizeMessage(shouldPreferDetail ? rawDetail : rawMessage) ||
    localizeMessage(shouldPreferDetail ? rawMessage : rawDetail) ||
    localizeMessage(responseData?.title || '') ||
    getStatusFallback(statusCode, fallbackMessage);

  const localizedFieldErrors = Object.fromEntries(
    Object.entries(fieldErrors).map(([key, values]) => [
      key,
      values.map((value) => localizeMessage(value)),
    ]),
  );

  return {
    message,
    fieldErrors: localizedFieldErrors,
  };
}

export function pickFieldError(fieldErrors: ApiFieldErrors, ...keys: string[]) {
  for (const key of keys) {
    const direct = fieldErrors[key];
    if (direct?.length) return direct[0];

    const insensitiveKey = Object.keys(fieldErrors).find(
      (existingKey) => existingKey.toLowerCase() === key.toLowerCase(),
    );
    if (insensitiveKey && fieldErrors[insensitiveKey]?.length) {
      return fieldErrors[insensitiveKey][0];
    }
  }

  return '';
}
