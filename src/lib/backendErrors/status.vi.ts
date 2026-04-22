export const BACKEND_STATUS_FALLBACK_MAP: Record<number, string> = {
  400: 'Yêu cầu không hợp lệ. Vui lòng kiểm tra lại dữ liệu đã nhập.',
  401: 'Bạn chưa đăng nhập hoặc phiên đăng nhập đã hết hạn.',
  403: 'Bạn không có quyền thực hiện thao tác này.',
  404: 'Không tìm thấy dữ liệu yêu cầu.',
  409: 'Dữ liệu đang xung đột hoặc đã thay đổi. Vui lòng tải lại và thử lại.',
  429: 'Bạn thao tác quá nhanh. Vui lòng thử lại sau ít phút.',
  500: 'Hệ thống đang gặp lỗi nội bộ. Vui lòng thử lại sau.',
  502: 'Dịch vụ bên ngoài đang tạm thời không phản hồi. Vui lòng thử lại sau.',
};

export const GENERIC_BACKEND_MESSAGES = new Set([
  'Internal Server Error',
  'An error occurred',
  'An error occurred while processing your request',
  'CompleteRescueOperation failed',
]);
