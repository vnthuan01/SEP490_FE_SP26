export const BACKEND_LITERAL_MESSAGE_MAP: Array<[RegExp, string]> = [
  [/^Validation failed\.?$/i, 'Dữ liệu gửi lên không hợp lệ.'],
  [
    /^Too many requests\. Please try again later\.?$/i,
    'Bạn thao tác quá nhanh. Vui lòng thử lại sau ít phút.',
  ],
  [/^You are not authenticated\.?$/i, 'Bạn chưa đăng nhập hoặc phiên đăng nhập đã hết hạn.'],
  [
    /^You do not have permission to perform this action\.?$/i,
    'Bạn không có quyền thực hiện thao tác này.',
  ],
  [/^User is not authenticated\.?$/i, 'Bạn chưa đăng nhập hoặc phiên đăng nhập đã hết hạn.'],
  [/^User not authenticated\.?$/i, 'Bạn chưa đăng nhập hoặc phiên đăng nhập đã hết hạn.'],
  [/^Internal Server Error\.?$/i, 'Hệ thống đang gặp lỗi nội bộ. Vui lòng thử lại sau.'],
  [/^Google login failed\.?$/i, 'Đăng nhập Google thất bại.'],
  [/^Failed to create volunteer profile\.?$/i, 'Không thể tạo hồ sơ tình nguyện viên.'],
  [/^Email verified successfully\.?$/i, 'Xác thực email thành công.'],
  [
    /^An error occurred while processing your request\.?$/i,
    'Đã xảy ra lỗi khi xử lý yêu cầu của bạn.',
  ],
  [/^An error occurred\.?$/i, 'Đã xảy ra lỗi trong quá trình xử lý.'],
  [
    /^Active rescue batch not found for this team\.?$/i,
    'Không tìm thấy đợt cứu hộ đang hoạt động cho đội này.',
  ],
  [/^CompleteRescueOperation failed\.?$/i, 'Không thể hoàn tất hoạt động cứu hộ.'],
  [/^Inventory deleted successfully\.?$/i, 'Xóa kho thành công.'],
  [/^Stock item removed successfully\.?$/i, 'Xóa vật phẩm khỏi kho thành công.'],
  [/^Supply item deleted successfully\.?$/i, 'Xóa vật phẩm cứu trợ thành công.'],
  [/^Invalid Vietnamese phone number\.?$/i, 'Số điện thoại Việt Nam không hợp lệ.'],
  [/^Gender must be Male, Female or Other\.?$/i, 'Giới tính chỉ được phép là Nam, Nữ hoặc Khác.'],
  [/^Date of birth must be in the past\.?$/i, 'Ngày sinh phải là một thời điểm trong quá khứ.'],
  [
    /^CoverageRadiusKm must be between 0\.1 and 1000 km\.?$/i,
    'Bán kính khu vực phụ trách phải nằm trong khoảng từ 0.1 đến 1000 km.',
  ],
  [/^Name must not exceed 200 characters\.?$/i, 'Tên không được vượt quá 200 ký tự.'],
  [/^Description must not exceed 500 characters\.?$/i, 'Mô tả không được vượt quá 500 ký tự.'],
  [
    /^IconUrl must not exceed 500 characters\.?$/i,
    'Đường dẫn biểu tượng không được vượt quá 500 ký tự.',
  ],
  [/^Unit must not exceed 50 characters\.?$/i, 'Đơn vị không được vượt quá 50 ký tự.'],
  [/^Household does not belong to campaign\.?$/i, 'Hộ dân này không thuộc chiến dịch hiện tại.'],
  [
    /^Direct delivery is only allowed for isolated households\.?$/i,
    'Chỉ hộ dân thuộc diện cô lập mới được phát trực tiếp.',
  ],
  [
    /^DistributionPointId is required for pickup mode\.?$/i,
    'Vui lòng chọn điểm phát cho hình thức nhận tại điểm phát.',
  ],
  [
    /^Distribution point does not belong to campaign\.?$/i,
    'Điểm phát này không thuộc chiến dịch hiện tại.',
  ],
  [
    /^No default relief package found for campaign\.?$/i,
    'Chiến dịch hiện chưa có gói cứu trợ mặc định.',
  ],
  [
    /^Relief package does not belong to campaign\.?$/i,
    'Gói cứu trợ này không thuộc chiến dịch hiện tại.',
  ],
  [/^Household size must be greater than 0\.?$/i, 'Quy mô hộ dân phải lớn hơn 0.'],
  [
    /^Cannot delete household that already has delivery records\.?$/i,
    'Không thể xóa hộ dân đã có lịch sử phát quà.',
  ],
  [
    /^Relief station is not attached to this campaign\.?$/i,
    'Trạm cứu trợ này chưa được gán vào chiến dịch.',
  ],
  [
    /^Output supply item cannot be used as a package component\.?$/i,
    'Vật phẩm đầu ra không thể dùng làm thành phần của gói cứu trợ.',
  ],
  [/^Relief package definition is inactive\.?$/i, 'Gói cứu trợ này hiện đang ngừng hoạt động.'],
  [
    /^Relief package definition has no component items\.?$/i,
    'Gói cứu trợ này chưa có vật phẩm thành phần nào.',
  ],
  [/^Inventory is not active\.?$/i, 'Kho hiện không ở trạng thái hoạt động.'],
  [
    /^Inventory does not belong to the selected relief station\.?$/i,
    'Kho không thuộc trạm cứu trợ đã chọn.',
  ],
  [
    /^Proof file URL is required for delivered status\.?$/i,
    'Vui lòng cung cấp tệp minh chứng khi đánh dấu đã phát.',
  ],
  [
    /^At least one approved item with quantity > 0 is required\.?$/i,
    'Cần ít nhất một vật phẩm được duyệt với số lượng lớn hơn 0.',
  ],
  [
    /^Only pending shortage requests can be approved\.?$/i,
    'Chỉ có thể duyệt yêu cầu thiếu hụt đang chờ xử lý.',
  ],
  [
    /^Only pending shortage requests can be rejected\.?$/i,
    'Chỉ có thể từ chối yêu cầu thiếu hụt đang chờ xử lý.',
  ],
  [
    /^This operation is only available for relief campaigns\.?$/i,
    'Thao tác này chỉ áp dụng cho chiến dịch cứu trợ.',
  ],
  [
    /^At least one valid proof file URL is required for delivered status\.?$/i,
    'Cần ít nhất một file minh chứng hợp lệ khi đánh dấu đã phát.',
  ],
  [/^Delivery already completed\.?$/i, 'Lượt phát quà này đã được hoàn tất trước đó.'],
  [
    /^Insufficient remaining budget in source campaign\.?$/i,
    'Ngân sách còn lại của chiến dịch nguồn không đủ để thực hiện giao dịch này.',
  ],
  [
    /^Source campaign does not have enough remaining budget\.?$/i,
    'Chiến dịch nguồn không còn đủ ngân sách khả dụng.',
  ],
  [
    /^Target campaign must be a relief campaign\.?$/i,
    'Chiến dịch đích phải là chiến dịch cứu trợ.',
  ],
  [
    /^Source campaign must be a fundraising campaign\.?$/i,
    'Chiến dịch nguồn phải là chiến dịch gây quỹ.',
  ],
  [/^Cash support amount cannot be negative\.?$/i, 'Tiền hỗ trợ không được là số âm.'],
  [
    /^Cash support amount exceeds remaining budget\.?$/i,
    'Số tiền hỗ trợ vượt quá ngân sách còn lại của chiến dịch.',
  ],
  [/^Proof content type is invalid\.?$/i, 'Loại tệp minh chứng không hợp lệ.'],
  [/^Proof file URL is invalid\.?$/i, 'Đường dẫn minh chứng không hợp lệ.'],
  [
    /^ScheduledAt must be in the future\.?$/i,
    'Thời gian hẹn phát phải lớn hơn thời điểm hiện tại.',
  ],
  [
    /^Campaign team does not belong to campaign\.?$/i,
    'Đội phụ trách này không thuộc chiến dịch hiện tại.',
  ],
  [
    /^Source and target campaign cannot be the same\.?$/i,
    'Chiến dịch nguồn và chiến dịch đích không được trùng nhau.',
  ],
];
