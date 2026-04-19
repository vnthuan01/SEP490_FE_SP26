import { parseApiError } from '@/lib/apiErrors';

export function resolveLoginErrorMessage(error: unknown) {
  const axiosLikeError = error as any;
  const status = axiosLikeError?.response?.status;
  const code = axiosLikeError?.response?.data?.code;
  const parsedMessage = parseApiError(error, 'Đăng nhập thất bại. Vui lòng thử lại.').message;

  if (status === 401 || code === 'AUTH_INVALID_CREDENTIALS') {
    return 'Sai tên đăng nhập hoặc mật khẩu. Vui lòng thử lại.';
  }

  if (code === 'AUTH_EMAIL_NOT_CONFIRMED') {
    return 'Email của bạn chưa được xác nhận. Vui lòng kiểm tra hộp thư trước khi đăng nhập.';
  }

  if (code === 'AUTH_USER_LOCKED') {
    return 'Tài khoản của bạn đang bị khóa.';
  }

  if (status === 400 && parsedMessage) {
    return parsedMessage;
  }

  return parsedMessage || 'Đăng nhập thất bại. Vui lòng thử lại.';
}

export function resolveChangePasswordErrorMessage(error: unknown) {
  const parsedMessage = parseApiError(error, 'Đổi mật khẩu thất bại. Vui lòng thử lại.').message;

  if (/mật khẩu hiện tại/i.test(parsedMessage) || /current password/i.test(parsedMessage)) {
    return 'Mật khẩu hiện tại không đúng.';
  }

  return parsedMessage || 'Đổi mật khẩu thất bại. Vui lòng thử lại.';
}
