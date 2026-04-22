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
  note: 'ghi chú',
  notes: 'ghi chú',
  locationid: 'khu vực điểm phát',
  managerid: 'người quản lý',
  moderatoruserid: 'điều phối viên phụ trách',
  teamid: 'đội',
  campaignteamid: 'đội phụ trách',
  status: 'trạng thái',
  rejectionreason: 'lý do từ chối',
  address: 'địa chỉ',
  startsat: 'thời gian bắt đầu',
  endsat: 'thời gian kết thúc',
  scheduledat: 'thời gian hẹn phát',
  coverageradiuskm: 'bán kính khu vực phụ trách',
  outputsupplyitemid: 'vật phẩm đầu ra',
  items: 'danh sách thành phần',
  supplyitemid: 'vật phẩm',
  reliefpackagedefinitionid: 'gói cứu trợ',
  distributionpointid: 'điểm phát',
  quantity: 'số lượng',
  unit: 'đơn vị',
  amount: 'số tiền',
  cashsupportamount: 'tiền hỗ trợ',
  gender: 'giới tính',
  dateofbirth: 'ngày sinh',
  latitude: 'vĩ độ',
  longitude: 'kinh độ',
  prooffileurl: 'đường dẫn minh chứng',
  proofcontenttype: 'loại tệp minh chứng',
  proofnote: 'ghi chú minh chứng',
  contactphone: 'số điện thoại',
  householdsize: 'số nhân khẩu',
  isisolated: 'trạng thái cô lập',
  deliverymode: 'hình thức nhận',
  headofhouseholdname: 'tên chủ hộ',
  sourcecampaignid: 'chiến dịch gây quỹ nguồn',
  targetreliefcampaignid: 'chiến dịch cứu trợ đích',
};

const localizeFieldName = (fieldName: string) => FIELD_LABELS[fieldName.toLowerCase()] || fieldName;

const looksLikeUntranslatedEnglish = (message: string) => {
  const normalized = message.trim();
  if (!normalized) return false;

  return /\b(required|invalid|failed|forbidden|unauthorized|must|cannot|already exists|not found|campaign|delivery|package|station|inventory|proof|budget|team|household|duplicate|quantity|request)\b/i.test(
    normalized,
  );
};

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

  const greaterThanMatch = message.match(/^(.+?) must be greater than (.+)\.?$/i);
  if (greaterThanMatch) {
    return `${localizeFieldName(greaterThanMatch[1])} phải lớn hơn ${greaterThanMatch[2]}.`;
  }

  const greaterThanOrEqualMatch = message.match(
    /^(.+?) must be greater than or equal to (.+)\.?$/i,
  );
  if (greaterThanOrEqualMatch) {
    return `${localizeFieldName(greaterThanOrEqualMatch[1])} phải lớn hơn hoặc bằng ${greaterThanOrEqualMatch[2]}.`;
  }

  const lessThanOrEqualMatch = message.match(/^(.+?) must be less than or equal to (.+)\.?$/i);
  if (lessThanOrEqualMatch) {
    return `${localizeFieldName(lessThanOrEqualMatch[1])} phải nhỏ hơn hoặc bằng ${lessThanOrEqualMatch[2]}.`;
  }

  const betweenMatch = message.match(/^(.+?) must be between (.+?) and (.+?)\.?$/i);
  if (betweenMatch) {
    return `${localizeFieldName(betweenMatch[1])} phải nằm trong khoảng từ ${betweenMatch[2]} đến ${betweenMatch[3]}.`;
  }

  const maxLengthMatch = message.match(
    /^The field (.+?) must be a string with a maximum length of (\d+)\.?$/i,
  );
  if (maxLengthMatch) {
    return `${localizeFieldName(maxLengthMatch[1])} không được vượt quá ${maxLengthMatch[2]} ký tự.`;
  }

  const minLengthMatch = message.match(
    /^The field (.+?) must be a string with a minimum length of (\d+)\.?$/i,
  );
  if (minLengthMatch) {
    return `${localizeFieldName(minLengthMatch[1])} phải có ít nhất ${minLengthMatch[2]} ký tự.`;
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

  const resolvedMessage =
    localizeMessage(firstFieldMessage) ||
    localizeMessage(fromCode) ||
    localizeMessage(plainBody) ||
    localizeMessage(shouldPreferDetail ? rawDetail : rawMessage) ||
    localizeMessage(shouldPreferDetail ? rawMessage : rawDetail) ||
    localizeMessage(responseData?.title || '') ||
    getStatusFallback(statusCode, fallbackMessage);

  const message = looksLikeUntranslatedEnglish(resolvedMessage)
    ? localizeMessage(fallbackMessage) || fallbackMessage
    : resolvedMessage;

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
