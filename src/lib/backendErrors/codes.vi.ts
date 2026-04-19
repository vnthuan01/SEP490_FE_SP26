export const BACKEND_ERROR_CODE_MAP: Record<string, string> = {
  AUTH_UNAUTHORIZED: 'Bạn chưa đăng nhập hoặc phiên đăng nhập đã hết hạn.',
  AUTH_FORBIDDEN: 'Bạn không có quyền thực hiện thao tác này.',
  AUTH_INVALID_CREDENTIALS: 'Email hoặc mật khẩu không chính xác.',
  AUTH_EMAIL_NOT_CONFIRMED:
    'Email của bạn chưa được xác nhận. Vui lòng kiểm tra hộp thư và xác nhận email trước khi đăng nhập.',
  AUTH_USER_LOCKED: 'Tài khoản của bạn đang bị khóa.',
  VALIDATION_ERROR: 'Dữ liệu gửi lên không hợp lệ.',
  RATE_LIMIT_EXCEEDED: 'Bạn thao tác quá nhanh. Vui lòng thử lại sau ít phút.',
  DONATION_INVALID_STATE: 'Trạng thái khoản quyên góp hiện không cho phép thực hiện thao tác này.',
  DONATION_NOT_FOUND: 'Không tìm thấy khoản quyên góp.',
  PAYOS_INVALID_SIGNATURE: 'Chữ ký webhook từ PayOS không hợp lệ.',
  PAYOS_INTEGRATION_ERROR: 'Đã xảy ra lỗi khi kết nối PayOS.',
  STATION_JOIN_REQUEST_ALREADY_PENDING: 'Đã tồn tại yêu cầu chờ duyệt cho team và trạm này.',
  RELIEF_STATION_REQUEST_NOT_PENDING: 'Yêu cầu hiện không ở trạng thái chờ duyệt.',
  RELIEF_STATION_INACTIVE: 'Trạm cứu trợ hiện không hoạt động.',
  RELIEF_STATION_ASSIGNMENT_FORBIDDEN: 'Chỉ trưởng trạm mới có quyền duyệt hoặc gán team vào trạm.',
  RELIEF_STATION_REJECTION_REASON_REQUIRED: 'Lý do từ chối là bắt buộc.',
};
