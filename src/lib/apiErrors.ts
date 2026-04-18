export type ApiFieldErrors = Record<string, string[]>;

export type ParsedApiError = {
  message: string;
  fieldErrors: ApiFieldErrors;
};

const FIELD_LABELS: Record<string, string> = {
  name: 'tên',
  description: 'mô tả',
  locationid: 'khu vực điểm phát',
  address: 'địa chỉ',
  startsat: 'thời gian bắt đầu',
  endsat: 'thời gian kết thúc',
  outputsupplyitemid: 'vật phẩm đầu ra',
  items: 'danh sách thành phần',
  supplyitemid: 'vật phẩm',
  quantity: 'số lượng',
  unit: 'đơn vị',
};

const localizeFieldName = (fieldName: string) => {
  return FIELD_LABELS[fieldName.toLowerCase()] || fieldName;
};

const localizeMessage = (message: string) => {
  let normalized = message.trim();

  const requiredMatch = normalized.match(/^The (.+) field is required\.?$/i);
  if (requiredMatch) {
    return `Vui lòng nhập ${localizeFieldName(requiredMatch[1])}.`;
  }

  normalized = normalized.replace(
    /^One or more validation errors occurred\.?$/i,
    'Có lỗi dữ liệu cần được kiểm tra lại.',
  );
  normalized = normalized.replace(
    /^Duplicate supply items in package:\s*.+$/i,
    'Một vật phẩm đang bị lặp lại nhiều lần trong gói cứu trợ. Mỗi vật phẩm chỉ nên xuất hiện một lần.',
  );
  normalized = normalized.replace(/The /g, '');
  normalized = normalized.replace(/ field is required\.?/gi, ' là thông tin bắt buộc.');
  normalized = normalized.replace(/must not be empty\.?/gi, 'không được để trống.');
  normalized = normalized.replace(/invalid/gi, 'không hợp lệ');

  return normalized;
};

export function parseApiError(error: unknown, fallbackMessage: string): ParsedApiError {
  const responseData = (error as any)?.response?.data;
  const fieldErrors =
    responseData &&
    typeof responseData === 'object' &&
    responseData.errors &&
    typeof responseData.errors === 'object'
      ? (responseData.errors as ApiFieldErrors)
      : {};

  const firstFieldMessage = Object.values(fieldErrors).flat().find(Boolean);

  const message =
    localizeMessage(firstFieldMessage || '') ||
    localizeMessage(responseData?.message || '') ||
    localizeMessage(responseData?.detail || '') ||
    localizeMessage(responseData?.title || '') ||
    fallbackMessage;

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
